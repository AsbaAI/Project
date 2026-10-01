/**
 * Rôles d'agent (spécification §8). Les noms sont contractuels : ils
 * apparaissent tels quels dans `Execution.agent`.
 */
export const ROLES_AGENT = [
  'EXTRACTEUR',
  'ANALYSTE_IMPACT',
  'REDACTEUR',
  'VERIFICATEUR',
  'GARDIEN',
  'CORRECTEUR',
  'ARBITRE',
  'SUGGESTEUR',
] as const

export type RoleAgent = (typeof ROLES_AGENT)[number]

export function estRoleAgent(valeur: unknown): valeur is RoleAgent {
  return typeof valeur === 'string' && (ROLES_AGENT as readonly string[]).includes(valeur)
}
