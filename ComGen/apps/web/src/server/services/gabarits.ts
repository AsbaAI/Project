import {
  type Canal,
  CANAUX,
  type ConstatGabarit,
  type EmplacementGabarit,
  type FormatTemplate,
  MODELES_GABARIT,
  type ModeleGabarit,
  choisirGabarit,
  formatsPourCanal,
  modeleGabarit,
  verifierGabarit,
} from '@comgen/core'
import type { Prisma } from '@comgen/db'

import { exigerDroit } from '@/server/auth/droits'

import { type Acteur, ErreurMetier, introuvable } from './erreurs'

/**
 * Bibliothèque de gabarits : ce que l'organisation possède, et des
 * exemples prêts à installer.
 *
 * Un gabarit n'est pas décoratif : c'est lui qui décide si un persona peut
 * recevoir une communication. Un canal sans gabarit actif refuse la
 * génération (`PERSONA_SANS_TEMPLATE`) — l'écran montre donc d'abord quels
 * canaux sont servis, et par quoi.
 *
 * Installer un exemple COPIE son corps et ses emplacements dans
 * l'organisation : à partir de là, c'est un gabarit comme un autre, qui se
 * modifie et se désactive. Le catalogue n'est pas une dépendance vivante.
 */

export interface GabaritLu {
  id: string
  nom: string
  format: FormatTemplate
  version: number
  actif: boolean
  corps: string
  emplacements: EmplacementGabarit[]
  regionNom: string
  /** Variantes qui s'en servent : un gabarit utilisé ne se supprime pas à la légère. */
  variantes: number
  /** Ce que le domaine constate : clés manquantes, trous non déclarés. */
  constats: ConstatGabarit[]
}

export interface CanalServi {
  canal: Canal
  /** Gabarit retenu pour ce canal, ou `null` : la génération refuse alors. */
  gabaritNom: string | null
}

export interface ModelePropose {
  cle: string
  format: FormatTemplate
  langue: 'fr' | 'en'
  corps: string
  emplacements: readonly EmplacementGabarit[]
  /** Canaux que ce format sert, pour dire à quoi l'exemple servira. */
  canaux: Canal[]
  /** Déjà installé dans l'organisation (même clé de modèle). */
  installe: boolean
}

export interface EcranGabarits {
  gabarits: GabaritLu[]
  canaux: CanalServi[]
  modeles: ModelePropose[]
  regions: { id: string; nom: string }[]
  /** Région de la personne connectée : le choix proposé par défaut. */
  regionParDefaut: string
}

/** Le nom donné à un exemple installé ; c'est aussi ce qui dit qu'il l'est. */
export function nomDuModele(modele: ModeleGabarit, intitule: string): string {
  return `${intitule} (${modele.langue})`
}

function lireEmplacements(brut: Prisma.JsonValue): EmplacementGabarit[] {
  if (!Array.isArray(brut)) return []
  return brut.flatMap((entree) => {
    if (typeof entree !== 'object' || entree === null || Array.isArray(entree)) return []
    const o = entree as Record<string, unknown>
    if (typeof o['cle'] !== 'string') return []
    return [
      {
        cle: o['cle'],
        description: typeof o['description'] === 'string' ? o['description'] : '',
        obligatoire: o['obligatoire'] === true,
        longueurMax: typeof o['longueurMax'] === 'number' ? o['longueurMax'] : 0,
      },
    ]
  })
}

export async function chargerGabarits(acteur: Acteur): Promise<EcranGabarits> {
  exigerDroit(acteur.utilisateur, 'CONSULTER')
  const [lignes, regions] = await Promise.all([
    acteur.contexte.template.findMany({
      include: { region: { select: { nom: true } }, _count: { select: { variantes: true } } },
      orderBy: [{ nom: 'asc' }],
    }),
    acteur.contexte.region.findMany({ select: { id: true, nom: true }, orderBy: { nom: 'asc' } }),
  ])

  const gabarits: GabaritLu[] = lignes.map((ligne) => {
    const emplacements = lireEmplacements(ligne.emplacements)
    return {
      id: ligne.id,
      nom: ligne.nom,
      format: ligne.format,
      version: ligne.version,
      actif: ligne.actif,
      corps: ligne.corps,
      emplacements,
      regionNom: ligne.region.nom,
      variantes: ligne._count.variantes,
      constats: verifierGabarit(ligne.corps, emplacements),
    }
  })

  const actifs = gabarits.filter((g) => g.actif)
  const canaux: CanalServi[] = CANAUX.map((canal) => ({
    canal,
    gabaritNom: choisirGabarit(canal, actifs)?.nom ?? null,
  }))

  const nomsInstalles = new Set(gabarits.map((g) => g.nom))
  const modeles: ModelePropose[] = MODELES_GABARIT.map((modele) => ({
    cle: modele.cle,
    format: modele.format,
    langue: modele.langue,
    corps: modele.corps,
    emplacements: modele.emplacements,
    canaux: CANAUX.filter((canal) => formatsPourCanal(canal).includes(modele.format)),
    installe: [...nomsInstalles].some((nom) => nom.endsWith(`(${modele.cle})`)),
  }))

  return { gabarits, canaux, modeles, regions, regionParDefaut: acteur.utilisateur.regionId }
}

/**
 * Installe un exemple dans une région. Le nom porte la clé du modèle entre
 * parenthèses : c'est ce qui permet de dire « déjà installé » sans tenir
 * une seconde table, et ce que l'administrateur peut renommer ensuite.
 */
export async function installerModele(
  acteur: Acteur,
  cleModele: string,
  regionId: string,
  intitule: string,
): Promise<{ id: string }> {
  exigerDroit(acteur.utilisateur, 'PARAMETRER')
  const modele = modeleGabarit(cleModele)
  if (modele === null) {
    throw new ErreurMetier('DONNEES_INVALIDES', `Modèle inconnu : ${cleModele}`, {
      champs: { modele: 'invalide' },
    })
  }
  const nom = `${intitule.trim() === '' ? cleModele : intitule.trim()} (${cleModele})`
  if (nom.length > 150) {
    throw new ErreurMetier('DONNEES_INVALIDES', 'Nom trop long', {
      champs: { intitule: 'trop_long' },
    })
  }

  // Un exemple qui ne se vérifierait pas lui-même n'a rien à faire en base.
  const constats = verifierGabarit(modele.corps, modele.emplacements)
  if (constats.length > 0) {
    throw new ErreurMetier('DONNEES_INVALIDES', 'Modèle incohérent', {
      champs: { modele: 'invalide' },
    })
  }

  const region = await acteur.contexte.region.findUnique({
    where: { id: regionId },
    select: { id: true },
  })
  if (!region) throw introuvable('Région', regionId)

  const existant = await acteur.contexte.template.findFirst({ where: { nom } })
  if (existant) {
    throw new ErreurMetier('SOURCE_EN_DOUBLE', 'Ce modèle est déjà installé', {
      champs: { modele: 'en_double' },
    })
  }

  const cree = await acteur.contexte.template.create({
    data: {
      organisationId: acteur.utilisateur.organisationId,
      regionId: region.id,
      nom,
      format: modele.format,
      corps: modele.corps,
      emplacements: modele.emplacements as unknown as Prisma.InputJsonValue,
      actif: true,
    },
    select: { id: true },
  })
  return { id: cree.id }
}

/** Active ou désactive un gabarit. Un gabarit inactif ne sert plus aucun canal. */
export async function changerActivationGabarit(
  acteur: Acteur,
  gabaritId: string,
  actif: boolean,
): Promise<void> {
  exigerDroit(acteur.utilisateur, 'PARAMETRER')
  const { count } = await acteur.contexte.template.updateMany({
    where: { id: gabaritId },
    data: { actif },
  })
  if (count !== 1) throw introuvable('Gabarit', gabaritId)
}
