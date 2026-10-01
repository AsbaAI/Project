import type { Criticite } from './enumerations.ts'

/**
 * Nombre d'approbations humaines exigé par criticité avant APPROUVEE (§7).
 *
 * La spécification ne fixe pas les valeurs (voir DECISIONS.md). Ce qu'elle
 * fixe : aucun envoi sans approbation humaine (§2), donc jamais zéro — même
 * en COURANTE. Un fait déclaré sous responsabilité (§11) impose lui aussi
 * une approbation ; le plancher de un la couvre déjà, la règle est gardée
 * explicite pour qu'un futur abaissement du barème ne la fasse pas sauter.
 */
export const APPROBATIONS_REQUISES_PAR_CRITICITE: Readonly<Record<Criticite, number>> = {
  COURANTE: 1,
  IMPORTANTE: 2,
  CRITIQUE: 2,
}

export interface OptionsApprobation {
  /** Nombre de faits au statut DECLARE (déclarés sous responsabilité). */
  faitsDeclares?: number
}

/** §2 : aucun envoi sans approbation humaine. */
const PLANCHER = 1

export function approbationsRequises(
  criticite: Criticite,
  options: OptionsApprobation = {},
): number {
  const base = APPROBATIONS_REQUISES_PAR_CRITICITE[criticite]
  // §11 : un fait déclaré sous responsabilité impose une approbation, même en COURANTE.
  const exigeParFaitDeclare = (options.faitsDeclares ?? 0) > 0 ? 1 : 0
  return Math.max(base, PLANCHER, exigeParFaitDeclare)
}
