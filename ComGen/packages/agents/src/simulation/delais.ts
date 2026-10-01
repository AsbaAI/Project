/**
 * Échelonnement de la démonstration.
 *
 * Un agent simulé qui répond instantanément ne se voit pas travailler : la
 * chronologie clignote et l'on ne comprend pas qu'il s'est passé quelque
 * chose. Chaque agent marque donc deux paliers, l'un après avoir « lu » sa
 * source, l'autre avant de rendre sa sortie.
 *
 * Les durées sont déterministes, pas tirées au hasard : une démonstration
 * doit se dérouler deux fois de la même façon. Elles varient d'un rôle à
 * l'autre parce qu'un rôle ne coûte pas le même travail qu'un autre.
 *
 * Rien n'attend vraiment ici : c'est l'appelant qui fournit `attendre`.
 */

import type { RoleAgent } from '@comgen/core'

/** Plage annoncée pour la durée totale d'un agent simulé, en millisecondes. */
export const DELAIS_SIMULATION = { min: 1000, max: 3000 } as const

/** Les deux paliers d'un rôle : lecture, puis rédaction de la sortie. */
const PALIERS: Readonly<Partial<Record<RoleAgent, readonly [number, number]>>> = {
  EXTRACTEUR: [700, 600],
  ANALYSTE_IMPACT: [500, 700],
  SUGGESTEUR: [600, 500],
  REDACTEUR: [900, 1400],
  VERIFICATEUR: [800, 900],
  GARDIEN: [400, 400],
}

const DEFAUT: readonly [number, number] = [600, 600]

export function paliers(role: RoleAgent): readonly [number, number] {
  return PALIERS[role] ?? DEFAUT
}
