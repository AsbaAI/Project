/* oxlint-disable no-console -- outil d'administration : le résumé va sur la sortie standard */
/**
 * Jeu de données de démonstration (spécification §20).
 *
 *   DATABASE_URL=postgresql://… pnpm --filter @comgen/db seed
 *
 * Idempotent et déterministe : vide toutes les tables, puis recrée le
 * référentiel, les communications, leurs sources et leurs faits avec des
 * identifiants fixes. Les fichiers sources sont déposés dans le dépôt local
 * (`STOCKAGE_RACINE`, sinon `<dépôt>/.local/stockage`).
 *
 * Contrainte cardinale (§2) appliquée aux données elles-mêmes : le seed
 * refuse de s'exécuter si une citation n'est pas un extrait mot pour mot du
 * texte de sa source, ou si un fichier versionné ne correspond plus au
 * texte dont il est censé dériver.
 */

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  formaterReferenceCommunication,
  formaterReferenceFait,
  localiserCitation,
  normaliserTexteSource,
  verifierCitation,
} from '@comgen/core'

import { CLIENT_BRUT, ouvrirConnexion } from '../src/connexion.ts'
import type { Prisma, PrismaClient } from '../src/generated/client.ts'
import { viderBase } from '../src/test/base-de-test.ts'
import {
  ANNEE_REFERENCES,
  COMMUNICATIONS,
  type DescriptionCommunication,
} from './seed/communications.ts'
import { texteBrut } from './seed/contenus.ts'
import {
  CANEVAS,
  ENTITES,
  LISTES_DIFFUSION,
  ORG_HELVEA,
  ORG_KESTREL,
  ORGANISATIONS,
  PERSONAS,
  REGIONS,
  SITES,
  TEMPLATES,
  UTILISATEURS,
} from './seed/donnees.ts'
import { DOSSIER_FICHIERS, fichiersDeDemonstration } from './seed/fichiers.ts'
import {
  cleSource,
  deposerFichierSource,
  racineStockage,
  viderStockageOrganisation,
} from './seed/stockage.ts'

class ErreurSeed extends Error {
  override readonly name = 'ErreurSeed'
}

interface LignesCommunication {
  communication: Prisma.CommunicationCreateManyInput
  sources: Prisma.SourceCreateManyInput[]
  faits: Prisma.FaitCreateManyInput[]
}

function empreinteSha256(texte: string): string {
  return createHash('sha256').update(texte, 'utf8').digest('hex')
}

/**
 * Construit les lignes d'une communication et vérifie chaque citation
 * contre le texte normalisé de sa source. Pure : aucune écriture.
 */
function preparerCommunication(
  description: DescriptionCommunication,
  cheminsStockage: ReadonlyMap<string, string>,
): LignesCommunication {
  const reference = formaterReferenceCommunication(ANNEE_REFERENCES, description.numero)
  const textes = new Map<string, string>()

  const sources = description.sources.map((source): Prisma.SourceCreateManyInput => {
    const contenuTexte = normaliserTexteSource(texteBrut(source.contenu))
    if (contenuTexte.length === 0) {
      throw new ErreurSeed(`${reference} : la source ${source.id} est vide`)
    }
    textes.set(source.id, contenuTexte)
    return {
      id: source.id,
      organisationId: description.organisationId,
      communicationId: description.id,
      type: source.type,
      nom: source.nom,
      empreinte: empreinteSha256(contenuTexte),
      cheminStockage: cheminsStockage.get(source.id) ?? null,
      contenuTexte,
      langue: source.langue,
      confidentialite: source.confidentialite,
      figeeLe: description.figeeLe,
    }
  })

  const faits = description.faits.map((fait, indice): Prisma.FaitCreateManyInput => {
    const referenceFait = formaterReferenceFait(indice + 1)
    const contenuTexte = textes.get(fait.sourceId)
    if (contenuTexte === undefined) {
      throw new ErreurSeed(
        `${reference} ${referenceFait} : la source ${fait.sourceId} n'appartient pas à cette communication`,
      )
    }
    const resultat = verifierCitation(contenuTexte, fait.citation)
    if (!resultat.valide) {
      throw new ErreurSeed(
        `${reference} ${referenceFait} : citation ${resultat.motif} dans ${fait.sourceId} — « ${fait.citation} »`,
      )
    }
    const localisation = localiserCitation(contenuTexte, fait.citation)
    if (localisation === null) {
      throw new ErreurSeed(`${reference} ${referenceFait} : citation introuvable`)
    }
    if (fait.confiance < 0 || fait.confiance > 1) {
      throw new ErreurSeed(`${reference} ${referenceFait} : confiance hors de [0, 1]`)
    }
    return {
      id: `fait_${description.id.replace(/^com_/, '')}_${String(indice + 1).padStart(2, '0')}`,
      organisationId: description.organisationId,
      communicationId: description.id,
      reference: referenceFait,
      enonce: fait.enonce,
      valeur: fait.valeur ?? null,
      typeValeur: fait.typeValeur,
      citation: fait.citation,
      sourceId: fait.sourceId,
      localisation,
      confiance: fait.confiance,
      confidentialite: fait.confidentialite,
      statut: fait.statut,
    }
  })

  return {
    communication: {
      id: description.id,
      organisationId: description.organisationId,
      regionId: description.regionId,
      reference,
      titre: description.titre,
      nature: description.nature,
      criticite: description.criticite,
      portee: description.portee,
      langue: description.langue,
      dateEffet: description.dateEffet ?? null,
      echeance: description.echeance ?? null,
      etat: description.etat,
      modeEntree: description.modeEntree,
      auteurId: description.auteurId,
      parentId: description.parentId ?? null,
      intentionReprise: description.intentionReprise ?? null,
      creeLe: description.creeLe,
      modifieLe: description.creeLe,
    },
    sources,
    faits,
  }
}

/** Les fichiers versionnés doivent être exactement ceux que les textes produisent. */
async function verifierFichiersVersionnes(
  fichiers: Awaited<ReturnType<typeof fichiersDeDemonstration>>,
): Promise<void> {
  await Promise.all(
    fichiers.map(async (fichier) => {
      const chemin = path.join(DOSSIER_FICHIERS, fichier.nomSurDisque)
      let surDisque: Buffer
      try {
        surDisque = await readFile(chemin)
      } catch {
        throw new ErreurSeed(
          `Fichier de démonstration absent : ${chemin}. Lancer « node --experimental-strip-types prisma/seed/generer-fichiers.ts ».`,
        )
      }
      if (!surDisque.equals(fichier.octets)) {
        throw new ErreurSeed(
          `Fichier de démonstration périmé : ${chemin} ne correspond plus à son texte source. Relancer generer-fichiers.ts.`,
        )
      }
    }),
  )
}

async function inserer(client: PrismaClient, lignes: LignesCommunication[]): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.organisation.createMany({ data: ORGANISATIONS })
    await tx.region.createMany({ data: REGIONS })
    await tx.site.createMany({ data: SITES })
    await tx.utilisateur.createMany({ data: UTILISATEURS })
    await tx.persona.createMany({ data: PERSONAS })
    await tx.template.createMany({ data: TEMPLATES })
    await tx.canevas.createMany({ data: CANEVAS })
    await tx.listeDiffusion.createMany({ data: LISTES_DIFFUSION })
    await tx.entite.createMany({ data: ENTITES })
    // Les parents précèdent leurs reprises : l'ordre de COMMUNICATIONS le garantit.
    await tx.communication.createMany({ data: lignes.map((l) => l.communication) })
    await tx.source.createMany({ data: lignes.flatMap((l) => l.sources) })
    await tx.fait.createMany({ data: lignes.flatMap((l) => l.faits) })
    await tx.compteurReference.create({
      data: {
        annee: ANNEE_REFERENCES,
        dernier: Math.max(...COMMUNICATIONS.map((c) => c.numero)),
      },
    })
  })
}

async function principal(): Promise<void> {
  const url = process.env['DATABASE_URL']
  if (url === undefined || url.length === 0) {
    throw new ErreurSeed('DATABASE_URL manquante : le seed ne devine jamais sa base.')
  }

  // 1. Tout ce qui peut échouer sans toucher à la base est vérifié d'abord.
  const fichiers = await fichiersDeDemonstration(COMMUNICATIONS)
  await verifierFichiersVersionnes(fichiers)
  const cheminsStockage = new Map<string, string>()
  const organisationDeSource = new Map<string, string>()
  for (const fichier of fichiers) {
    cheminsStockage.set(
      fichier.source.id,
      cleSource(organisationDe(fichier.communicationId), fichier.source.id, fichier.nomSurDisque),
    )
    organisationDeSource.set(fichier.source.id, organisationDe(fichier.communicationId))
  }
  const lignes = COMMUNICATIONS.map((description) =>
    preparerCommunication(description, cheminsStockage),
  )

  // 2. Dépôt de fichiers : vidé pour les organisations concernées, puis réécrit.
  await Promise.all([ORG_HELVEA, ORG_KESTREL].map((id) => viderStockageOrganisation(id)))
  await Promise.all(
    fichiers.map((fichier) =>
      deposerFichierSource(
        organisationDeSource.get(fichier.source.id) ?? '',
        fichier.source.id,
        fichier.nomSurDisque,
        fichier.octets,
        fichier.typeMime,
      ),
    ),
  )

  // 3. Base : vidée puis remplie dans une transaction.
  const connexion = ouvrirConnexion({ url, connexionsMax: 4 })
  try {
    await viderBase(connexion)
    await inserer(connexion[CLIENT_BRUT], lignes)
  } finally {
    await connexion.fermer()
  }

  const nbSources = lignes.reduce((total, l) => total + l.sources.length, 0)
  const nbFaits = lignes.reduce((total, l) => total + l.faits.length, 0)
  console.log('Jeu de démonstration chargé.')
  console.log(`  base          ${url.replace(/\/\/[^@]*@/, '//…@')}`)
  console.log(`  stockage      ${racineStockage()}`)
  console.log(`  organisations ${ORGANISATIONS.length}`)
  console.log(`  régions       ${REGIONS.length}`)
  console.log(`  sites         ${SITES.length}`)
  console.log(`  utilisateurs  ${UTILISATEURS.length}`)
  console.log(`  personas      ${PERSONAS.length}`)
  console.log(`  templates     ${TEMPLATES.length}`)
  console.log(`  canevas       ${CANEVAS.length}`)
  console.log(`  listes        ${LISTES_DIFFUSION.length}`)
  console.log(`  entités       ${ENTITES.length}`)
  console.log(`  communications ${lignes.length}`)
  console.log(`  sources       ${nbSources} (dont ${fichiers.length} fichiers déposés)`)
  console.log(`  faits         ${nbFaits}`)
}

function organisationDe(communicationId: string): string {
  const description = COMMUNICATIONS.find((c) => c.id === communicationId)
  if (description === undefined) {
    throw new ErreurSeed(`Communication inconnue : ${communicationId}`)
  }
  return description.organisationId
}

principal().catch((erreur: unknown) => {
  if (erreur instanceof ErreurSeed) {
    console.error(`Seed refusé : ${erreur.message}`)
  } else {
    console.error(erreur)
  }
  process.exitCode = 1
})
