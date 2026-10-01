/**
 * Orchestrateur : enchaîne des agents sur un même dossier et dit, à chaque
 * instant, où en est chacun d'eux.
 *
 * Trois règles le gouvernent, toutes issues de la contrainte cardinale :
 *
 *  - Une étape qui échoue arrête la chaîne. Les suivantes sont marquées
 *    `ANNULEE`, pas « en attente » : on ne laisse pas croire qu'elles vont
 *    reprendre toutes seules.
 *  - Un résultat partiel n'est jamais rendu comme un résultat. L'échec
 *    lève `ErreurOrchestration`, qui PORTE l'état partiel pour l'afficher —
 *    il faut l'ouvrir pour y accéder, on ne tombe pas dessus par mégarde.
 *  - Chaque événement porte l'état de TOUTES les étapes. L'interface
 *    dessine la chronologie entière dès le premier événement et n'a aucun
 *    delta à recoller.
 */

import type { RoleAgent } from '@comgen/core'

import type { Agent, ContexteAgent, TraceAgent } from './types.ts'
import { ErreurAgent, estErreurAgent, validerSortie, verifierAnnulation } from './types.ts'

export type EtatEtape = 'EN_ATTENTE' | 'EN_COURS' | 'TERMINEE' | 'ECHOUEE' | 'ANNULEE'

export interface EtapeOrchestration {
  role: RoleAgent
  version: string
  etat: EtatEtape
  /** Renseignée dès que l'étape est terminée ou en échec. */
  dureeMs?: number
  codeErreur?: ErreurAgent['code']
  message?: string
}

export interface EvenementOrchestration {
  etapes: readonly EtapeOrchestration[]
  /** Vrai seulement quand TOUTES les étapes sont terminées. */
  termine: boolean
}

/**
 * Une étape : l'agent, ce qu'il lit du dossier, ce qu'il y écrit. Les deux
 * fonctions gardent le typage bout à bout sans qu'aucun `any` ne traverse
 * la chaîne — c'est `etape()` qui les relie.
 */
export interface EtapePlan<D> {
  readonly role: RoleAgent
  readonly version: string
  executer(dossier: D, contexte: ContexteAgent): Promise<{ dossier: D; trace: TraceAgent }>
}

export function etape<D, E, S>(
  agent: Agent<E, S>,
  lire: (dossier: D) => E,
  fusionner: (dossier: D, sortie: S) => D,
): EtapePlan<D> {
  return {
    role: agent.role,
    version: agent.version,
    async executer(dossier, contexte) {
      const resultat = await agent.executer(lire(dossier), contexte)
      // La sortie est revalidée ici, quoi qu'en dise l'agent : c'est la
      // frontière entre une structure proposée et une donnée de confiance.
      const sortie = validerSortie(agent as Agent<unknown, S>, resultat.sortie)
      return { dossier: fusionner(dossier, sortie), trace: resultat.trace }
    },
  }
}

export interface OptionsOrchestration<D> {
  etapes: readonly EtapePlan<D>[]
  dossier: D
  contexte: ContexteAgent
  surEvenement?: ((evenement: EvenementOrchestration) => void) | undefined
  /** Horloge injectable : les tests mesurent sans dépendre du temps réel. */
  horloge?: (() => number) | undefined
}

export interface ResultatOrchestration<D> {
  dossier: D
  etapes: readonly EtapeOrchestration[]
  traces: readonly TraceAgent[]
}

export class ErreurOrchestration extends Error {
  readonly role: RoleAgent
  readonly code: ErreurAgent['code']
  /** État de toutes les étapes au moment de l'échec, pour l'afficher tel quel. */
  readonly etapes: readonly EtapeOrchestration[]
  readonly traces: readonly TraceAgent[]

  constructor(
    cause: ErreurAgent,
    etapes: readonly EtapeOrchestration[],
    traces: readonly TraceAgent[],
  ) {
    super(cause.message)
    this.name = 'ErreurOrchestration'
    this.role = cause.role
    this.code = cause.code
    this.etapes = etapes
    this.traces = traces
  }
}

export function estErreurOrchestration(valeur: unknown): valeur is ErreurOrchestration {
  return valeur instanceof ErreurOrchestration
}

/** Toute erreur devient une `ErreurAgent` : l'inattendu ne se perd pas en route. */
function enErreurAgent(erreur: unknown, role: RoleAgent): ErreurAgent {
  if (estErreurAgent(erreur)) return erreur
  const message = erreur instanceof Error ? erreur.message : String(erreur)
  return new ErreurAgent('SORTIE_INVALIDE', role, message)
}

export async function orchestrer<D>(
  options: OptionsOrchestration<D>,
): Promise<ResultatOrchestration<D>> {
  const { etapes: plan, contexte, surEvenement, horloge = () => Date.now() } = options
  const etats: EtapeOrchestration[] = plan.map((e) => ({
    role: e.role,
    version: e.version,
    etat: 'EN_ATTENTE',
  }))
  const traces: TraceAgent[] = []
  let dossier = options.dossier

  /** Copie : l'appelant garde l'instantané qu'on lui a donné, pas une vue vivante. */
  const instantane = (): readonly EtapeOrchestration[] => structuredClone(etats)

  const annoncer = () => {
    surEvenement?.({
      etapes: instantane(),
      termine: etats.every((etat) => etat.etat === 'TERMINEE'),
    })
  }

  annoncer()

  for (const [index, etapePlan] of plan.entries()) {
    const etat = etats[index]
    if (etat === undefined) continue
    const debut = horloge()
    try {
      verifierAnnulation(etapePlan.role, contexte.signal)
      etat.etat = 'EN_COURS'
      annoncer()

      // eslint-disable-next-line no-await-in-loop -- la chaîne est séquentielle par définition : chaque étape lit ce que la précédente a écrit.
      const resultat = await etapePlan.executer(dossier, contexte)
      dossier = resultat.dossier
      traces.push(resultat.trace)
      etat.etat = 'TERMINEE'
      etat.dureeMs = horloge() - debut
      annoncer()
    } catch (erreur) {
      const faute = enErreurAgent(erreur, etapePlan.role)
      etat.etat = faute.code === 'ANNULE' ? 'ANNULEE' : 'ECHOUEE'
      etat.dureeMs = horloge() - debut
      etat.codeErreur = faute.code
      etat.message = faute.message
      for (const suivant of etats.slice(index + 1)) suivant.etat = 'ANNULEE'
      annoncer()
      throw new ErreurOrchestration(faute, instantane(), traces)
    }
  }

  return { dossier, etapes: instantane(), traces }
}
