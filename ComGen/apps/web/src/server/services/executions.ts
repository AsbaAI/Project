import type { EtapeOrchestration, TraceAgent } from '@comgen/agents'
import type { RoleAgent } from '@comgen/core'

/**
 * Les lignes `Execution` que laisse le travail des agents (§5.6).
 *
 * Une exécution réussie vient de la trace que l'agent a rendue ; une
 * exécution en échec n'en a pas (l'agent a levé), elle se reconstruit de
 * l'état de l'étape. Les deux disent si l'agent était simulé, et à quelle
 * série d'appels elles appartiennent : c'est ce qui permet à l'écran de ne
 * montrer que les agents du résultat qu'il affiche.
 */

export type ModeAgents = 'simulation' | 'reel'

export interface LigneExecution {
  agent: RoleAgent
  modele: string
  promptVersion: string
  parametres: { simule: boolean; serie: string; sourceId?: string }
  jetonsEntree: number
  jetonsSortie: number
  dureeMs: number
  coutCentimes: number
  succes: boolean
  erreur?: string
}

/** Un paramètre d'exécution, relu sans présumer de la forme du JSON. */
export function lireParametre(parametres: unknown, nom: string): unknown {
  return typeof parametres === 'object' && parametres !== null && nom in parametres
    ? (parametres as Record<string, unknown>)[nom]
    : undefined
}

/** `sourceId` rattache une exécution à la source qu'elle a lue. */
export function ligneReussie(trace: TraceAgent, serie: string, sourceId?: string): LigneExecution {
  return {
    agent: trace.role,
    modele: trace.modele ?? 'simulation',
    promptVersion: trace.prompt,
    parametres: {
      simule: trace.simule,
      serie,
      ...(sourceId === undefined ? {} : { sourceId }),
    },
    jetonsEntree: trace.jetonsEntree,
    jetonsSortie: trace.jetonsSortie,
    dureeMs: trace.dureeMs,
    coutCentimes: 0,
    succes: true,
  }
}

export function ligneEchouee(
  etape: Pick<EtapeOrchestration, 'role' | 'version' | 'dureeMs'>,
  mode: ModeAgents,
  serie: string,
  raison: string,
  sourceId?: string,
): LigneExecution {
  return {
    agent: etape.role,
    modele: mode === 'simulation' ? 'simulation' : 'inconnu',
    promptVersion: etape.version,
    parametres: {
      simule: mode === 'simulation',
      serie,
      ...(sourceId === undefined ? {} : { sourceId }),
    },
    jetonsEntree: 0,
    jetonsSortie: 0,
    dureeMs: etape.dureeMs ?? 0,
    coutCentimes: 0,
    succes: false,
    erreur: raison,
  }
}
