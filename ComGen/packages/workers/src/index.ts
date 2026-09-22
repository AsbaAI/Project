/**
 * Consommateurs BullMQ — un worker par rôle d'agent.
 *
 * Squelette du lot 0 : le paquet existe pour fixer la règle de dépendance
 * (`workers` → `core`, `agents`) et l'outillage. Les workers eux-mêmes
 * arrivent avec la chaîne d'agents (lot 3).
 */
export const NOM_PAQUET = '@comgen/workers' as const
