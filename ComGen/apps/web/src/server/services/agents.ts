import {
  CONSIGNE_LONGUEUR_MAX,
  CONSIGNE_LONGUEUR_MIN,
  type ConstatConsigne,
  ROLES_AGENT,
  type RoleAgent,
  verifierConsigne,
} from '@comgen/core'

import { exigerDroit } from '@/server/auth/droits'

import { type Acteur, ErreurMetier } from './erreurs'

/**
 * Les agents de l'organisation : où ils interviennent, qui répond
 * aujourd'hui, et la consigne qu'ils recevront.
 *
 * Deux vérités sont tenues séparées, parce que les confondre ferait croire
 * à un effet qui n'existe pas :
 *
 *  - ce que l'agent FAIT dans le parcours (`etape`), et s'il est livré
 *    (`etat`) — un rôle déclaré dans le domaine n'est pas un rôle branché ;
 *  - la CONSIGNE enregistrée, qui est bien réelle, versionnée et refusée
 *    si elle demande ce que la contrainte cardinale interdit. Elle ne part
 *    vers aucun modèle tant qu'aucun agent réel n'existe : les agents
 *    simulés ne lisent pas de consigne, et leur trace dit `simulation/…`,
 *    jamais la version de l'organisation.
 */

/** Où un agent intervient dans le parcours. */
export type EtapeAgent = 'entree' | 'generation' | 'controle'

/**
 * Ce qui répond aujourd'hui pour ce rôle :
 *  - `simule` : un agent simulé existe et tourne réellement dans le parcours ;
 *  - `code` : ce n'est pas un modèle mais du code déterministe (GARDIEN) ;
 *  - `absent` : le rôle est déclaré par la spécification, rien ne le joue.
 */
export type EtatAgent = 'simule' | 'code' | 'absent'

export interface AgentDecrit {
  role: RoleAgent
  etape: EtapeAgent
  etat: EtatAgent
  /** Rang dans le parcours, pour l'ordre d'affichage du graphe. */
  rang: number
  consigne: string
  /** `null` quand aucune consigne n'a été enregistrée pour ce rôle. */
  version: number | null
  modifieLe: Date | null
  modifieParNom: string | null
}

/*
 * L'état de chaque rôle est écrit ici, à la main, et non déduit : seule
 * une lecture du code dit ce qui tourne vraiment. Changer un agent de
 * simulé à réel se fait en changeant cette table ET la fabrique — le jour
 * où l'un bougera sans l'autre, le test de cohérence le dira.
 */
const PARCOURS: readonly { role: RoleAgent; etape: EtapeAgent; etat: EtatAgent }[] = [
  { role: 'EXTRACTEUR', etape: 'entree', etat: 'simule' },
  { role: 'ANALYSTE_IMPACT', etape: 'entree', etat: 'simule' },
  { role: 'SUGGESTEUR', etape: 'entree', etat: 'simule' },
  { role: 'REDACTEUR', etape: 'generation', etat: 'simule' },
  { role: 'VERIFICATEUR', etape: 'generation', etat: 'simule' },
  { role: 'GARDIEN', etape: 'controle', etat: 'code' },
  { role: 'CORRECTEUR', etape: 'controle', etat: 'absent' },
  { role: 'ARBITRE', etape: 'controle', etat: 'absent' },
]

/** Tous les rôles du domaine sont placés : aucun n'est oublié en silence. */
export const PARCOURS_AGENTS = PARCOURS
export const ROLES_PLACES: readonly RoleAgent[] = PARCOURS.map((e) => e.role)

export async function chargerAgents(acteur: Acteur): Promise<AgentDecrit[]> {
  exigerDroit(acteur.utilisateur, 'PARAMETRER')
  const lignes = await acteur.contexte.consigneAgent.findMany({
    select: {
      role: true,
      consigne: true,
      version: true,
      modifieLe: true,
      modifiePar: { select: { nom: true } },
    },
  })
  const parRole = new Map(lignes.map((l) => [l.role, l]))

  return PARCOURS.map((place, rang) => {
    const ligne = parRole.get(place.role)
    return {
      role: place.role,
      etape: place.etape,
      etat: place.etat,
      rang: rang + 1,
      consigne: ligne?.consigne ?? '',
      version: ligne?.version ?? null,
      modifieLe: ligne?.modifieLe ?? null,
      modifieParNom: ligne?.modifiePar?.nom ?? null,
    }
  })
}

export interface ResultatConsigne {
  version: number
}

/**
 * Enregistre la consigne d'un rôle. Refus si elle demande ce que la
 * contrainte cardinale interdit : les constats partent en `motifs`,
 * l'écran les traduit. Rien n'est « corrigé » en douce.
 */
export async function enregistrerConsigne(
  acteur: Acteur,
  roleBrut: string,
  consigneBrute: string,
): Promise<ResultatConsigne> {
  exigerDroit(acteur.utilisateur, 'PARAMETRER')
  const role = ROLES_AGENT.find((r) => r === roleBrut)
  if (role === undefined || !ROLES_PLACES.includes(role)) {
    throw new ErreurMetier('DONNEES_INVALIDES', `Rôle inconnu : ${roleBrut}`, {
      champs: { role: 'invalide' },
    })
  }
  const consigne = consigneBrute.trim()
  if (consigne.length < CONSIGNE_LONGUEUR_MIN || consigne.length > CONSIGNE_LONGUEUR_MAX) {
    throw new ErreurMetier('DONNEES_INVALIDES', 'Consigne trop courte ou trop longue', {
      champs: { consigne: consigne.length < CONSIGNE_LONGUEUR_MIN ? 'trop_court' : 'trop_long' },
    })
  }
  const constats: ConstatConsigne[] = verifierConsigne(consigne)
  if (constats.length > 0) {
    throw new ErreurMetier('CONSIGNE_REFUSEE', 'Consigne refusée', {
      champs: { consigne: 'refusee' },
      motifs: constats.map((c) => c.code),
    })
  }

  const ligne = await acteur.contexte.consigneAgent.upsert({
    where: { organisationId_role: { organisationId: acteur.utilisateur.organisationId, role } },
    create: {
      organisationId: acteur.utilisateur.organisationId,
      role,
      consigne,
      modifieParId: acteur.utilisateur.id,
    },
    // La version est incrémentée par le déclencheur SQL quand le texte
    // change : deux chemins d'écriture ne peuvent pas diverger.
    update: { consigne, modifieParId: acteur.utilisateur.id },
    select: { version: true },
  })
  return { version: ligne.version }
}
