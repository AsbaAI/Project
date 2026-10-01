import { ETATS_COMMUNICATION, type EtatCommunication } from '@comgen/core'

import type { BadgeTone } from '@/components/ui/badge'

/*
 * Correspondance état de communication → tonalité de badge (§7 × §14).
 * La liste des états vient de `@comgen/core` : un état ajouté sans tonalité
 * est une erreur de compilation.
 */
export const COMMUNICATION_STATES = ETATS_COMMUNICATION

export type CommunicationState = EtatCommunication

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
