import type { RoleUtilisateur } from '@comgen/core'

import { CLIENT_BRUT, type Connexion } from './connexion.ts'

/**
 * Lecture d'un utilisateur au moment de la connexion : c'est la seule
 * requête du paquet sans filtre d'organisation, parce que l'organisation
 * n'est pas encore connue. Elle ne retourne que ce qu'il faut pour ouvrir
 * une session, et rien d'autre n'est lisible par ce chemin.
 */
export type CritereConnexion = { courriel: string } | { sujetOidc: string }

export interface UtilisateurConnecte {
  id: string
  organisationId: string
  regionId: string
  siteId: string | null
  courriel: string
  nom: string
  roles: RoleUtilisateur[]
}

export async function rechercherUtilisateurPourConnexion(
  connexion: Connexion,
  critere: CritereConnexion,
): Promise<UtilisateurConnecte | null> {
  const utilisateur = await connexion[CLIENT_BRUT].utilisateur.findFirst({
    where: { ...critere, actif: true },
    select: {
      id: true,
      organisationId: true,
      regionId: true,
      siteId: true,
      courriel: true,
      nom: true,
      roles: true,
    },
  })
  return utilisateur
}
