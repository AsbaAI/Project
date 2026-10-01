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
 *
 * `--si-vide` (démonstration déployée) : ne fait rien si la base contient
 * déjà une organisation ; un redéploiement ne remet pas la démo à zéro.
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
import { communicationsHistoriques } from './seed/historique.ts'
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
  variantes: Prisma.VarianteCreateManyInput[]
  affirmations: Prisma.AffirmationCreateManyInput[]
  approbations: Prisma.ApprobationCreateManyInput[]
  envois: Prisma.EnvoiCreateManyInput[]
}

/**
 * Les six communications écrites à la main, puis six mois d'historique
 * engendré. L'ordre compte : les parents précèdent leurs reprises, et
 * l'historique ne reprend rien.
 */
const TOUTES_COMMUNICATIONS: DescriptionCommunication[] = [
  ...COMMUNICATIONS,
  ...communicationsHistoriques(),
]

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

  /*
   * Une affirmation désigne ses appuis par citation ; c'est ici qu'elles
   * deviennent des identifiants de faits. Une citation qui n'appuie rien
   * est une erreur de description, pas une affirmation sans appui : une
   * affirmation réellement sans appui ne cite rien.
   */
  const faitsParCitation = new Map<string, string[]>()
  for (const ligne of faits) {
    const existantes = faitsParCitation.get(ligne.citation) ?? []
    existantes.push(ligne.id as string)
    faitsParCitation.set(ligne.citation, existantes)
  }

  const variantes: Prisma.VarianteCreateManyInput[] = []
  const affirmations: Prisma.AffirmationCreateManyInput[] = []
  const approbations: Prisma.ApprobationCreateManyInput[] = []
  const envois: Prisma.EnvoiCreateManyInput[] = []

  for (const [rang, variante] of (description.variantes ?? []).entries()) {
    const varianteId = `var_${description.id.replace(/^com_/, '')}_${String(rang + 1).padStart(2, '0')}`
    variantes.push({
      id: varianteId,
      organisationId: description.organisationId,
      communicationId: description.id,
      personaId: variante.personaId,
      templateId: variante.templateId,
      templateVersion: variante.templateVersion,
      contenu: variante.contenu as Prisma.InputJsonValue,
      etat: variante.etat,
      score: variante.score,
      longueurMots: variante.longueurMots,
      creeLe: description.creeLe,
      modifieLe: description.creeLe,
    })

    for (const [indice, affirmation] of variante.affirmations.entries()) {
      const faitIds = affirmation.citationsAppui.flatMap((citation) => {
        const trouves = faitsParCitation.get(citation)
        if (trouves === undefined) {
          throw new ErreurSeed(
            `${reference} ${varianteId} : l'affirmation cite « ${citation} », qui n'appuie aucun fait`,
          )
        }
        return trouves
      })
      if (affirmation.verdict === 'SOUTENUE' && faitIds.length === 0) {
        throw new ErreurSeed(
          `${reference} ${varianteId} : affirmation SOUTENUE sans fait d'appui — « ${affirmation.texte} »`,
        )
      }
      affirmations.push({
        id: `aff_${varianteId.replace(/^var_/, '')}_${String(indice + 1).padStart(2, '0')}`,
        organisationId: description.organisationId,
        varianteId,
        texte: affirmation.texte,
        position: affirmation.position as unknown as Prisma.InputJsonValue,
        verdict: affirmation.verdict,
        faitIds,
      })
    }

    approbations.push({
      id: `apr_${varianteId.replace(/^var_/, '')}`,
      organisationId: description.organisationId,
      communicationId: description.id,
      varianteId,
      utilisateurId: variante.approbation.utilisateurId,
      regime: variante.approbation.regime,
      decision: variante.approbation.decision,
      decideLe: variante.approbation.decideLe ?? null,
      creeLe: description.creeLe,
    })

    if (variante.envoi !== undefined) {
      if (variante.approbation.decision !== 'APPROUVEE') {
        throw new ErreurSeed(
          `${reference} ${varianteId} : un envoi sans approbation accordée — aucun chemin n'envoie sans approbation humaine`,
        )
      }
      envois.push({
        id: `env_${varianteId.replace(/^var_/, '')}`,
        organisationId: description.organisationId,
        varianteId,
        canal: variante.envoi.canal,
        destinataires: variante.envoi.destinataires as Prisma.InputJsonValue,
        envoyeLe: variante.envoi.envoyeLe,
        etatRemise: variante.envoi.etatRemise as Prisma.InputJsonValue,
        annulable: false,
        creeLe: variante.envoi.envoyeLe,
      })
    }
  }

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
    variantes,
    affirmations,
    approbations,
    envois,
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
    await tx.variante.createMany({ data: lignes.flatMap((l) => l.variantes) })
    await tx.affirmation.createMany({ data: lignes.flatMap((l) => l.affirmations) })
    await tx.approbation.createMany({ data: lignes.flatMap((l) => l.approbations) })
    await tx.envoi.createMany({ data: lignes.flatMap((l) => l.envois) })
    await tx.compteurReference.create({
      data: {
        annee: ANNEE_REFERENCES,
        dernier: Math.max(...TOUTES_COMMUNICATIONS.map((c) => c.numero)),
      },
    })
  })
}

async function principal(): Promise<void> {
  const url = process.env['DATABASE_URL']
  if (url === undefined || url.length === 0) {
    throw new ErreurSeed('DATABASE_URL manquante : le seed ne devine jamais sa base.')
  }

  if (process.argv.includes('--si-vide') && !(await baseVide(url))) {
    console.log('Base déjà peuplée : jeu de démonstration non rechargé (--si-vide).')
    return
  }

  // 1. Tout ce qui peut échouer sans toucher à la base est vérifié d'abord.
  const fichiers = await fichiersDeDemonstration(TOUTES_COMMUNICATIONS)
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
  const lignes = TOUTES_COMMUNICATIONS.map((description) =>
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
  console.log(`  variantes     ${lignes.reduce((t, l) => t + l.variantes.length, 0)}`)
  console.log(`  affirmations  ${lignes.reduce((t, l) => t + l.affirmations.length, 0)}`)
  console.log(`  approbations  ${lignes.reduce((t, l) => t + l.approbations.length, 0)}`)
  console.log(`  envois        ${lignes.reduce((t, l) => t + l.envois.length, 0)}`)
}

async function baseVide(url: string): Promise<boolean> {
  const connexion = ouvrirConnexion({ url, connexionsMax: 1 })
  try {
    return (await connexion[CLIENT_BRUT].organisation.count()) === 0
  } finally {
    await connexion.fermer()
  }
}

function organisationDe(communicationId: string): string {
  const description = TOUTES_COMMUNICATIONS.find((c) => c.id === communicationId)
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
