/**
 * Fabrique des agents : qui répond, et pourquoi.
 *
 * C'est le seul endroit qui décide entre agents réels et agents simulés, et
 * il le dit toujours — `motif` nomme la raison, l'interface l'affiche.
 * Personne au-dessus n'a à deviner, et surtout personne ne peut croire
 * qu'un modèle a parlé quand c'est la simulation qui a répondu.
 *
 * Le mode n'est jamais déduit d'un environnement (« si ce n'est pas la
 * production, simule ») : il ne dépend que de ce qui est réellement
 * disponible.
 */

import type { FournisseurModele } from '../fournisseurs/types.ts'
import { agentsSimules } from '../simulation/index.ts'

export type MotifSimulation =
  /** Aucune clé de modèle n'est configurée : c'est le cas de la démonstration publique. */
  | 'AUCUN_FOURNISSEUR'
  /** Un fournisseur existe, mais le rôle n'a pas encore d'agent réel. */
  | 'AGENT_REEL_ABSENT'

export interface JeuAgents {
  mode: 'simulation' | 'reel'
  /** Renseigné seulement en simulation. */
  motif?: MotifSimulation
  agents: ReturnType<typeof agentsSimules>
}

export interface OptionsFabrique {
  fournisseur?: FournisseurModele | undefined
}

/**
 * Aucun agent réel n'existe encore : l'extraction, l'analyse d'impact et la
 * suggestion sont simulées dans tous les cas. La fabrique le dit par
 * `AGENT_REEL_ABSENT` au lieu de laisser croire qu'une clé configurée
 * change quelque chose — elle ne changera rien tant que ces agents ne
 * seront pas écrits.
 */
export function fabriqueAgents(options: OptionsFabrique = {}): JeuAgents {
  return {
    mode: 'simulation',
    motif: options.fournisseur === undefined ? 'AUCUN_FOURNISSEUR' : 'AGENT_REEL_ABSENT',
    agents: agentsSimules(),
  }
}
