import type { RoleUtilisateur } from '@comgen/core'

import { CLIENT_BRUT, type Connexion } from './connexion.ts'

/**
 * Lecture d'un utilisateur au moment de la connexion, puis à chaque
 * requête pour relire ses rôles en base : c'est la seule requête du paquet
 * sans filtre d'organisation, parce que l'organisation n'est pas encore
 * connue. Elle ne retourne que ce qu'il faut pour ouvrir une session, et
 * rien d'autre n'est lisible par ce chemin.
 */
export type CritereConnexion = { id: string } | { courriel: string } | { sujetOidc: string }

export interface UtilisateurConnecte {
  id: string
  organisationId: string
  regionId: string
  siteId: string | null
  courriel: string
  nom: string
  roles: RoleUtilisateur[]
}

const SELECTION_CONNEXION = {
  id: true,
  organisationId: true,
  regionId: true,
  siteId: true,
  courriel: true,
  nom: true,
  roles: true,
} as const

export async function rechercherUtilisateurPourConnexion(
  connexion: Connexion,
  critere: CritereConnexion,
): Promise<UtilisateurConnecte | null> {
  const utilisateur = await connexion[CLIENT_BRUT].utilisateur.findFirst({
    where: { ...critere, actif: true },
    select: SELECTION_CONNEXION,
  })
  return utilisateur
}

export interface CompteSimulable extends UtilisateurConnecte {
  organisationNom: string
}

/**
 * Comptes proposés par le SIMULATEUR de connexion (§3 : « fournisseur
 * simulé en développement »). Hors production uniquement — la couche web
 * n'appelle cette fonction que si `AUTH_SIMULATEUR` est actif. Elle liste
 * les comptes actifs de toutes les organisations, ce qu'aucune autre
 * requête du paquet ne fait.
 */
export async function listerComptesSimulables(connexion: Connexion): Promise<CompteSimulable[]> {
  const comptes = await connexion[CLIENT_BRUT].utilisateur.findMany({
    where: { actif: true },
    select: { ...SELECTION_CONNEXION, organisation: { select: { nom: true } } },
    orderBy: [{ organisation: { nom: 'asc' } }, { nom: 'asc' }],
  })
  return comptes.map((compte) => {
    // `reste` est un objet neuf issu de la déstructuration : l'enrichir en place est sans risque.
    const { organisation, ...reste } = compte
    return Object.assign(reste, { organisationNom: organisation.nom })
  })
}
