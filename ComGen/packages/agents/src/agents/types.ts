/**
 * Contrat d'agent unique (spécification §8).
 *
 * Tous les agents — réels ou simulés — passent par cette interface. C'est
 * ce qui permet à la démonstration de tourner sans clé de modèle sans
 * qu'aucune couche au-dessus ne sache lequel des deux a répondu : seule la
 * trace le dit, et elle le dit toujours (`simule`).
 *
 * Un agent ne renvoie jamais du texte libre : sa sortie est validée par un
 * schéma Zod, sinon il échoue (§19). Et il ne décide jamais d'un repli :
 * une source inexploitable est une erreur explicite, pas une sortie
 * générique.
 */

import type { RoleAgent } from '@comgen/core'
import type { ZodType } from 'zod'

import type { FournisseurModele, MetadonneesRequete } from '../fournisseurs/types.ts'

/**
 * Ce qu'un agent reçoit en plus de son entrée.
 *
 * `attendre` est injecté plutôt qu'appelé en dur : la simulation échelonne
 * ses étapes pour qu'on voie le travail se faire, les tests n'attendent
 * rien, et personne ne découvre trois secondes de `setTimeout` enfouies.
 */
export interface ContexteAgent {
  /** Absent en démonstration : un agent réel échoue alors au lieu de deviner. */
  fournisseur?: FournisseurModele | undefined
  signal?: AbortSignal | undefined
  attendre?: ((ms: number) => Promise<void>) | undefined
  metadonnees?: MetadonneesRequete | undefined
}

/**
 * Ce qu'une exécution laisse derrière elle : de quoi écrire la ligne
 * `Execution` (§5.6) et de quoi étiqueter honnêtement une démonstration.
 */
export interface TraceAgent {
  role: RoleAgent
  /** Identifiant versionné du prompt, jamais son texte. */
  prompt: string
  /** Identifiant exact du modèle, ou `null` quand l'agent est simulé. */
  modele: string | null
  jetonsEntree: number
  jetonsSortie: number
  dureeMs: number
  /** Vrai quand aucune intelligence n'a été appelée. Jamais masqué. */
  simule: boolean
}

export interface ResultatAgent<S> {
  sortie: S
  trace: TraceAgent
}

export interface Agent<E, S> {
  readonly role: RoleAgent
  /** Version du prompt (§8) : elle voyage dans la trace, pas dans le code appelant. */
  readonly version: string
  readonly schemaSortie: ZodType<S>
  executer(entree: E, contexte: ContexteAgent): Promise<ResultatAgent<S>>
}

export type CodeErreurAgent =
  /** La sortie ne satisfait pas le schéma : on échoue, on ne répare pas. */
  | 'SORTIE_INVALIDE'
  /** Aucun fournisseur fourni à un agent qui en exige un. */
  | 'FOURNISSEUR_ABSENT'
  /** Rien d'exploitable dans la source : pas de sortie générique (§19). */
  | 'SOURCE_INEXPLOITABLE'
  | 'ANNULE'

export class ErreurAgent extends Error {
  readonly code: CodeErreurAgent
  readonly role: RoleAgent

  constructor(code: CodeErreurAgent, role: RoleAgent, message: string) {
    super(message)
    this.name = 'ErreurAgent'
    this.code = code
    this.role = role
  }
}

export function estErreurAgent(valeur: unknown): valeur is ErreurAgent {
  return valeur instanceof ErreurAgent
}

/** Lève `ANNULE` si le signal est déjà déclenché. Appelé avant chaque palier. */
export function verifierAnnulation(role: RoleAgent, signal?: AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw new ErreurAgent('ANNULE', role, `L’agent ${role} a été annulé`)
  }
}

/**
 * Valide une sortie contre son schéma. Toute sortie d'agent passe par ici :
 * c'est le seul endroit où une structure devient de la donnée de confiance.
 */
export function validerSortie<S>(agent: Agent<unknown, S>, valeur: unknown): S {
  const resultat = agent.schemaSortie.safeParse(valeur)
  if (!resultat.success) {
    throw new ErreurAgent(
      'SORTIE_INVALIDE',
      agent.role,
      `Sortie non conforme au schéma de ${agent.role} : ${resultat.error.issues
        .map((probleme) => `${probleme.path.join('.') || '(racine)'} ${probleme.message}`)
        .join(' ; ')}`,
    )
  }
  return resultat.data
}
