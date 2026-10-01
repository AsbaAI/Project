import {
  type Contradiction,
  type ContexteTransition,
  type Criticite,
  ETATS_COMMUNICATION,
  type EtatCommunication,
  type FaitComparable,
  type ResultatTransition,
  detecterContradictions,
  evaluerTransition,
} from '@comgen/core'
import type { ContexteTransaction } from '@comgen/db'

/**
 * Pont entre la base et la machine à états de `core` : on agrège ce que la
 * garde doit savoir, la garde décide. Toujours appelé dans la transaction
 * qui écrit le nouvel état, pour que la décision porte sur ce qui est écrit.
 */

type Lecteur = Pick<ContexteTransaction, 'fait' | 'source' | 'variante'>

/**
 * Transitions qu'un humain déclenche depuis la fiche de la communication.
 * Les autres (génération, contrôles, approbation, envoi) appartiennent à
 * leur propre parcours et sont refusées ici : aucun bouton, aucune route ne
 * mène à APPROUVEE ou ENVOYEE par ce chemin.
 */
export type EtatCibleManuel = 'BROUILLON' | 'FAITS_A_VALIDER' | 'PRETE_A_GENERER' | 'ARCHIVEE'

const CIBLES_MANUELLES: ReadonlySet<string> = new Set<EtatCibleManuel>([
  'BROUILLON',
  'FAITS_A_VALIDER',
  'PRETE_A_GENERER',
  'ARCHIVEE',
])

function estCibleManuelle(etat: EtatCommunication): etat is EtatCibleManuel {
  return CIBLES_MANUELLES.has(etat)
}

const TRANSITIONS_MANUELLES: ReadonlySet<string> = new Set([
  'BROUILLON>FAITS_A_VALIDER',
  'FAITS_A_VALIDER>BROUILLON',
  'FAITS_A_VALIDER>PRETE_A_GENERER',
  'PRETE_A_GENERER>FAITS_A_VALIDER',
  'BROUILLON>ARCHIVEE',
  'FAITS_A_VALIDER>ARCHIVEE',
  'PRETE_A_GENERER>ARCHIVEE',
])

export function estTransitionManuelle(de: EtatCommunication, vers: EtatCommunication): boolean {
  return TRANSITIONS_MANUELLES.has(`${de}>${vers}`)
}

export function transitionsManuellesDepuis(de: EtatCommunication): EtatCibleManuel[] {
  return ETATS_COMMUNICATION.filter(
    (cible): cible is EtatCibleManuel =>
      estCibleManuelle(cible) && TRANSITIONS_MANUELLES.has(`${de}>${cible}`),
  )
}

/** États dans lesquels la fiche de faits se modifie librement. */
export const ETATS_FICHE_OUVERTE: ReadonlySet<EtatCommunication> = new Set<EtatCommunication>([
  'BROUILLON',
  'FAITS_A_VALIDER',
  'PRETE_A_GENERER',
])

/** États dans lesquels on peut encore ajouter une source. */
export const ETATS_ENTREE_OUVERTE: ReadonlySet<EtatCommunication> = new Set<EtatCommunication>([
  'BROUILLON',
  'FAITS_A_VALIDER',
])

export async function chargerFaitsComparables(
  lecteur: Lecteur,
  communicationId: string,
): Promise<FaitComparable[]> {
  return lecteur.fait.findMany({
    where: { communicationId },
    select: {
      id: true,
      enonce: true,
      typeValeur: true,
      valeur: true,
      statut: true,
      sourceId: true,
      citation: true,
    },
    orderBy: { reference: 'asc' },
  })
}

export async function construireContexteTransition(
  lecteur: Lecteur,
  communicationId: string,
  criticite: Criticite,
): Promise<{ contexte: ContexteTransition; contradictions: Contradiction[] }> {
  const [sourcesFigees, faits, variantes] = await Promise.all([
    lecteur.source.count({ where: { communicationId } }),
    chargerFaitsComparables(lecteur, communicationId),
    lecteur.variante.findMany({
      where: { communicationId },
      select: {
        id: true,
        personaId: true,
        _count: {
          select: {
            controles: { where: { bloquant: true, resoluLe: null } },
            approbations: { where: { decision: 'APPROUVEE', annuleeLe: null } },
          },
        },
      },
    }),
  ])
  const contradictions = detecterContradictions(faits)
  const compter = (statut: FaitComparable['statut']) =>
    faits.filter((fait) => fait.statut === statut).length

  return {
    contradictions,
    contexte: {
      criticite,
      sourcesFigees,
      faitsConfirmes: compter('CONFIRME'),
      faitsProposes: compter('PROPOSE'),
      faitsDeclares: compter('DECLARE'),
      contradictionsNonTranchees: contradictions.length,
      // Le choix des personas arrive avec l'écran de génération (lot 3) ;
      // d'ici là, aucune communication n'a de persona et la garde le dit.
      personas: new Set(variantes.map((v) => v.personaId)).size,
      personasSansTemplate: 0,
      variantes: variantes.map((v) => ({
        id: v.id,
        controlesBloquantsNonResolus: v._count.controles,
        approbationsAccordees: v._count.approbations,
        // Les listes de diffusion sont résolues au lot 6.
        destinatairesResolus: null,
      })),
    },
  }
}

export interface TransitionEvaluee {
  vers: EtatCibleManuel
  resultat: ResultatTransition
}

export async function evaluerTransitionsManuelles(
  lecteur: Lecteur,
  communication: { id: string; etat: EtatCommunication; criticite: Criticite },
): Promise<{ transitions: TransitionEvaluee[]; contradictions: Contradiction[] }> {
  const { contexte, contradictions } = await construireContexteTransition(
    lecteur,
    communication.id,
    communication.criticite,
  )
  return {
    contradictions,
    transitions: transitionsManuellesDepuis(communication.etat).map((vers) => ({
      vers,
      resultat: evaluerTransition(communication.etat, vers, contexte),
    })),
  }
}
