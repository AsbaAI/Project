import type { BadgeTone } from '@/components/ui/badge'

/*
 * Correspondance état de communication → tonalité de badge (§7 × §14).
 *
 * La liste des états est celle de la spécification ; au lot 1 elle sera
 * dérivée du type de `@comgen/core` pour qu'un état ajouté sans tonalité
 * soit une erreur de compilation.
 */
export const COMMUNICATION_STATES = [
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

export type CommunicationState = (typeof COMMUNICATION_STATES)[number]

export const STATE_TONE: Record<CommunicationState, BadgeTone> = {
  BROUILLON: 'draft',
  FAITS_A_VALIDER: 'pending',
  PRETE_A_GENERER: 'neutral',
  EN_GENERATION: 'accent',
  EN_CONTROLE: 'accent',
  A_CORRIGER: 'warning',
  EN_RELECTURE: 'pending',
  EN_APPROBATION: 'pending',
  APPROUVEE: 'success',
  ENVOI_PLANIFIE: 'accent',
  ENVOYEE: 'success',
  REJETEE: 'danger',
  ARCHIVEE: 'archived',
}
