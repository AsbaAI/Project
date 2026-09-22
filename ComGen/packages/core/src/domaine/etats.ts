import { approbationsRequises } from './approbations.ts'
import type { Criticite } from './enumerations.ts'

/**
 * Machine à états des communications (spécification §7).
 *
 * La table est explicite : une transition absente est refusée, point. Chaque
 * transition porte une garde ; `evaluerTransition` renvoie la liste complète
 * des motifs de refus pour que l'interface puisse dire tout ce qui manque.
 */

export const ETATS_COMMUNICATION = [
  'BROUILLON',
  'FAITS_A_VALIDER',
  'PRETE_A_GENERER',
  'EN_GENERATION',
  'EN_CONTROLE',
  'A_CORRIGER',
  'EN_RELECTURE',
  'EN_APPROBATION',
  'APPROUVEE',
  'ENVOI_PLANIFIE',
  'ENVOYEE',
  'REJETEE',
  'ARCHIVEE',
] as const
export type EtatCommunication = (typeof ETATS_COMMUNICATION)[number]

export const ETATS_VARIANTE = [
  'EN_GENERATION',
  'A_REVOIR',
  'BLOQUEE',
  'CONFORME',
  'APPROUVEE',
  'ENVOYEE',
  'ECHEC',
] as const
export type EtatVariante = (typeof ETATS_VARIANTE)[number]

/** Ce que la garde d'une variante a besoin de savoir. */
export interface VarianteContexte {
  id: string
  controlesBloquantsNonResolus: number
  approbationsAccordees: number
  /** Effectif de la liste résolue ; `null` si la liste n'a pas été résolue. */
  destinatairesResolus: number | null
}

/** Faits agrégés par l'appelant (la couche données) : la garde reste pure. */
export interface ContexteTransition {
  criticite: Criticite
  sourcesFigees: number
  faitsConfirmes: number
  faitsDeclares: number
  contradictionsNonTranchees: number
  personas: number
  personasSansTemplate: number
  variantes: readonly VarianteContexte[]
}

export type MotifRefus =
  | 'TRANSITION_INCONNUE'
  | 'AUCUNE_SOURCE_FIGEE'
  | 'AUCUN_FAIT_CONFIRME'
  | 'CONTRADICTION_NON_TRANCHEE'
  | 'AUCUN_PERSONA'
  | 'PERSONA_SANS_TEMPLATE'
  | 'AUCUNE_VARIANTE'
  | 'CONTROLE_BLOQUANT_NON_RESOLU'
  | 'APPROBATIONS_INSUFFISANTES'
  | 'LISTE_DIFFUSION_NON_RESOLUE'
  | 'LISTE_DIFFUSION_VIDE'

export type ResultatTransition =
  { autorisee: true } | { autorisee: false; motifs: readonly [MotifRefus, ...MotifRefus[]] }

type Garde = (contexte: ContexteTransition) => MotifRefus[]

export interface Transition {
  de: EtatCommunication
  vers: EtatCommunication
  garde: Garde
}

const libre: Garde = () => []

/** §7 : PRETE_A_GENERER exige source figée, fait CONFIRME, persona, un template par persona. */
const gardePreteAGenerer: Garde = (c) => {
  const motifs: MotifRefus[] = []
  if (c.sourcesFigees < 1) motifs.push('AUCUNE_SOURCE_FIGEE')
  if (c.faitsConfirmes < 1) motifs.push('AUCUN_FAIT_CONFIRME')
  if (c.contradictionsNonTranchees > 0) motifs.push('CONTRADICTION_NON_TRANCHEE')
  if (c.personas < 1) motifs.push('AUCUN_PERSONA')
  if (c.personasSansTemplate > 0) motifs.push('PERSONA_SANS_TEMPLATE')
  return motifs
}

/** §7 : zéro contrôle bloquant non résolu sur toutes les variantes, approbations par criticité. */
const gardeApprouvee: Garde = (c) => {
  if (c.variantes.length === 0) return ['AUCUNE_VARIANTE']
  const motifs: MotifRefus[] = []
  const requises = approbationsRequises(c.criticite, { faitsDeclares: c.faitsDeclares })
  if (c.variantes.some((v) => v.controlesBloquantsNonResolus > 0)) {
    motifs.push('CONTROLE_BLOQUANT_NON_RESOLU')
  }
  if (c.variantes.some((v) => v.approbationsAccordees < requises)) {
    motifs.push('APPROBATIONS_INSUFFISANTES')
  }
  return motifs
}

/** §7 : une liste de diffusion résolue non vide pour chaque variante. */
const gardeEnvoiPlanifie: Garde = (c) => {
  if (c.variantes.length === 0) return ['AUCUNE_VARIANTE']
  const motifs: MotifRefus[] = []
  if (c.variantes.some((v) => v.destinatairesResolus === null)) {
    motifs.push('LISTE_DIFFUSION_NON_RESOLUE')
  }
  if (c.variantes.some((v) => v.destinatairesResolus !== null && v.destinatairesResolus < 1)) {
    motifs.push('LISTE_DIFFUSION_VIDE')
  }
  return motifs
}

/**
 * La table. Lecture : « de → vers, sous garde ». Les retours en arrière
 * (correction, annulation de planification, reprise après rejet) sont
 * explicites eux aussi ; il n'y a pas de transition implicite.
 */
export const TRANSITIONS_COMMUNICATION: readonly Transition[] = [
  // Cadrage et fiche de faits
  { de: 'BROUILLON', vers: 'FAITS_A_VALIDER', garde: libre },
  { de: 'FAITS_A_VALIDER', vers: 'BROUILLON', garde: libre },
  { de: 'FAITS_A_VALIDER', vers: 'PRETE_A_GENERER', garde: gardePreteAGenerer },
  { de: 'PRETE_A_GENERER', vers: 'FAITS_A_VALIDER', garde: libre },
  // Génération et contrôles
  { de: 'PRETE_A_GENERER', vers: 'EN_GENERATION', garde: gardePreteAGenerer },
  { de: 'EN_GENERATION', vers: 'EN_CONTROLE', garde: libre },
  { de: 'EN_GENERATION', vers: 'PRETE_A_GENERER', garde: libre }, // échec de génération
  { de: 'EN_CONTROLE', vers: 'A_CORRIGER', garde: libre },
  { de: 'EN_CONTROLE', vers: 'EN_RELECTURE', garde: libre },
  { de: 'A_CORRIGER', vers: 'EN_CONTROLE', garde: libre },
  // Relecture et approbation
  { de: 'EN_RELECTURE', vers: 'EN_APPROBATION', garde: libre },
  { de: 'EN_RELECTURE', vers: 'A_CORRIGER', garde: libre },
  { de: 'EN_RELECTURE', vers: 'EN_CONTROLE', garde: libre }, // édition pendant la relecture
  { de: 'EN_APPROBATION', vers: 'APPROUVEE', garde: gardeApprouvee },
  { de: 'EN_APPROBATION', vers: 'REJETEE', garde: libre },
  { de: 'EN_APPROBATION', vers: 'A_CORRIGER', garde: libre },
  { de: 'EN_APPROBATION', vers: 'EN_CONTROLE', garde: libre }, // édition pendant l'approbation
  { de: 'APPROUVEE', vers: 'EN_CONTROLE', garde: libre }, // toute écriture de contenu (§7)
  // Envoi
  { de: 'APPROUVEE', vers: 'ENVOI_PLANIFIE', garde: gardeEnvoiPlanifie },
  { de: 'ENVOI_PLANIFIE', vers: 'APPROUVEE', garde: libre }, // annulation dans la fenêtre
  { de: 'ENVOI_PLANIFIE', vers: 'ENVOYEE', garde: libre },
  // Fin de vie
  { de: 'REJETEE', vers: 'A_CORRIGER', garde: libre },
  { de: 'BROUILLON', vers: 'ARCHIVEE', garde: libre },
  { de: 'FAITS_A_VALIDER', vers: 'ARCHIVEE', garde: libre },
  { de: 'PRETE_A_GENERER', vers: 'ARCHIVEE', garde: libre },
  { de: 'A_CORRIGER', vers: 'ARCHIVEE', garde: libre },
  { de: 'REJETEE', vers: 'ARCHIVEE', garde: libre },
  { de: 'ENVOYEE', vers: 'ARCHIVEE', garde: libre },
]

export function evaluerTransition(
  de: EtatCommunication,
  vers: EtatCommunication,
  contexte: ContexteTransition,
): ResultatTransition {
  const transition = TRANSITIONS_COMMUNICATION.find((t) => t.de === de && t.vers === vers)
  if (!transition) return { autorisee: false, motifs: ['TRANSITION_INCONNUE'] }
  const motifs = transition.garde(contexte)
  const [premier, ...reste] = motifs
  if (premier === undefined) return { autorisee: true }
  return { autorisee: false, motifs: [premier, ...reste] }
}

/** Cibles possibles depuis un état, gardes non évaluées. */
export function transitionsDepuis(de: EtatCommunication): EtatCommunication[] {
  return TRANSITIONS_COMMUNICATION.filter((t) => t.de === de).map((t) => t.vers)
}
