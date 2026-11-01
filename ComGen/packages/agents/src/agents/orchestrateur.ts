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

import { ErreurFournisseur } from '../fournisseurs/types.ts'

import type { Agent, ContexteAgent, TraceAgent } from './types.ts'
import { ErreurAgent, estErreurAgent, validerSortie, verifierAnnulation } from './types.ts'

export type EtatEtape = 'EN_ATTENTE' | 'EN_COURS' | 'TERMINEE' | 'ECHOUEE' | 'ANNULEE'

export interface EtapeOrchestration {
  role: RoleAgent
  version: string
  etat: EtatEtape
  /** Renseignée dès que l'étape est terminée ou en échec. */
  dureeMs?: number
  /** Nombre d'appels de l'agent, nouvelles tentatives comprises (1 sans reprise). */
  tentatives?: number
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
  reprises?: OptionsReprises | undefined
}

/**
 * Nouvelles tentatives d'une étape. Elles vivent ici et non dans
 * l'adaptateur (`maxRetries: 0`) : retenter est une décision
 * d'orchestration, visible dans l'état de l'étape, pas un comportement
 * caché. L'attente passe par `contexte.attendre`, injecté au bord du
 * serveur : sans lui (tests), on retente sans attendre.
 */
export interface OptionsReprises {
  /** Appels au plus, le premier compris. */
  tentativesMax?: number
  /** Délai avant la première nouvelle tentative ; il double ensuite. */
  delaiBaseMs?: number
  /** Gigue dans [0, 1) : jusqu'à +25 % du délai, pour ne pas retenter tous en même temps. */
  alea?: () => number
}

export const TENTATIVES_MAX = 3
export const DELAI_BASE_REPRISE_MS = 500

/**
 * Seule une panne passagère du fournisseur se retente : délai, réseau,
 * quota, erreur serveur (5xx). Une clé refusée, une configuration absente,
 * une requête refusée (4xx) ou une sortie non structurée échoueraient pareil
 * au coup suivant ; une sortie hors schéma ne se répare pas (§19).
 */
export function estPassagere(erreur: unknown): boolean {
  if (!(erreur instanceof ErreurFournisseur)) return false
  if (erreur.code === 'DELAI' || erreur.code === 'RESEAU' || erreur.code === 'QUOTA') return true
  const statut = erreur.cause?.statut
  return erreur.code === 'FOURNISSEUR' && statut !== undefined && statut >= 500
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
    // La cause d'origine (exception étrangère comprise) suit : elle sert au
    // journal du serveur, jamais à ce qu'on affiche.
    super(cause.message, { cause: cause.cause ?? cause })
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

/**
 * Toute erreur devient une `ErreurAgent` : l'inattendu ne se perd pas en
 * route.
 *
 * Mais le message d'une exception qui n'est pas la nôtre n'a pas été écrit
 * pour être lu : il peut citer une adresse, un hôte, un fragment de requête.
 * Il n'entre ni dans la chronologie, ni dans la trace, ni dans la réponse —
 * il reste en `cause`, pour le journal du serveur.
 */
function enErreurAgent(erreur: unknown, role: RoleAgent, tentatives = 1): ErreurAgent {
  if (estErreurAgent(erreur)) return erreur
  if (erreur instanceof ErreurFournisseur) {
    // Notre code seulement : le message du SDK reste en `cause`.
    const essais = tentatives > 1 ? ` après ${tentatives} tentatives` : ''
    return new ErreurAgent(
      'FOURNISSEUR_EN_ECHEC',
      role,
      `Le fournisseur de modèle a échoué (${erreur.code})${essais}`,
      { cause: erreur },
    )
  }
  return new ErreurAgent('SORTIE_INVALIDE', role, `L’agent ${role} a échoué de façon inattendue`, {
    cause: erreur,
  })
}

export async function orchestrer<D>(
  options: OptionsOrchestration<D>,
): Promise<ResultatOrchestration<D>> {
  const { etapes: plan, contexte, surEvenement, horloge = () => Date.now() } = options
  const tentativesMax = Math.max(1, options.reprises?.tentativesMax ?? TENTATIVES_MAX)
  const delaiBase = options.reprises?.delaiBaseMs ?? DELAI_BASE_REPRISE_MS
  const alea = options.reprises?.alea ?? Math.random
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

  const executerAvecReprises = async (etapePlan: EtapePlan<D>, etat: EtapeOrchestration) => {
    for (let tentative = 1; ; tentative += 1) {
      etat.tentatives = tentative
      try {
        // eslint-disable-next-line no-await-in-loop -- une tentative attend l'échec de la précédente.
        return await etapePlan.executer(dossier, contexte)
      } catch (erreur) {
        if (tentative >= tentativesMax || !estPassagere(erreur)) throw erreur
        const delai = Math.round(delaiBase * 2 ** (tentative - 1) * (1 + alea() * 0.25))
        // eslint-disable-next-line no-await-in-loop -- le délai sépare deux tentatives successives.
        await contexte.attendre?.(delai)
        verifierAnnulation(etapePlan.role, contexte.signal)
      }
    }
  }

  for (const [index, etapePlan] of plan.entries()) {
    const etat = etats[index]
    if (etat === undefined) continue
    const debut = horloge()
    try {
      verifierAnnulation(etapePlan.role, contexte.signal)
      etat.etat = 'EN_COURS'
      annoncer()

      // eslint-disable-next-line no-await-in-loop -- la chaîne est séquentielle par définition : chaque étape lit ce que la précédente a écrit.
      const resultat = await executerAvecReprises(etapePlan, etat)
      dossier = resultat.dossier
      etat.etat = 'TERMINEE'
      etat.dureeMs = horloge() - debut
      // La trace garde la durée MESURÉE : celle qu'un agent simulé annonce est
      // celle qu'il joue, fictive s'il n'a rien attendu. L'orchestrateur est
      // l'autorité sur le temps écoulé, pour un agent réel comme simulé.
      traces.push({ ...resultat.trace, dureeMs: etat.dureeMs })
      annoncer()
    } catch (erreur) {
      const faute = enErreurAgent(erreur, etapePlan.role, etat.tentatives)
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
