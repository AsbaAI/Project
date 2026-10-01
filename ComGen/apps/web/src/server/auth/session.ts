import { type Action, type ContexteDroit, type ResultatDroit, autoriser } from '@comgen/core'
import {
  type ContexteDonnees,
  type UtilisateurConnecte,
  creerContexte,
  rechercherUtilisateurPourConnexion,
} from '@comgen/db'
import { getLocale } from 'next-intl/server'
import { cache } from 'react'

import { redirect } from '@/i18n/navigation'
import { CHEMIN_CONNEXION, auth } from '@/server/auth/config'
import { connexion } from '@/server/donnees/connexion'

/**
 * Identité et droits côté serveur. Chaque page, action et route API passe
 * par ici : l'interface peut masquer un bouton, mais c'est ce module qui
 * décide (§16, §19 : « aucune décision de droit côté client »).
 */

/**
 * L'utilisateur de la requête, RELU EN BASE (rôles, organisation, région),
 * ou `null` s'il n'y a pas de session valable. Mémorisé pour la durée du
 * rendu : plusieurs composants d'une même page ne coûtent qu'une lecture.
 */
export const utilisateurCourant = cache(async (): Promise<UtilisateurConnecte | null> => {
  const session = await auth()
  const id = session?.user?.id
  if (id === undefined || id.length === 0) return null
  return rechercherUtilisateurPourConnexion(connexion(), { id })
})

/** Comme `utilisateurCourant`, mais redirige vers l'écran de connexion s'il n'y a personne. */
export async function exigerUtilisateur(): Promise<UtilisateurConnecte> {
  const utilisateur = await utilisateurCourant()
  if (utilisateur) return utilisateur
  const locale = await getLocale()
  redirect({ href: CHEMIN_CONNEXION, locale })
  // `redirect` lance une exception ; TypeScript ne le sait pas.
  throw new Error('Redirection vers la connexion')
}

export class ErreurAutorisation extends Error {
  constructor(
    readonly action: Action,
    readonly motif: Extract<ResultatDroit, { autorise: false }>['motif'],
  ) {
    super(`Action ${action} refusée : ${motif}`)
    this.name = 'ErreurAutorisation'
  }
}

export class ErreurAuthentification extends Error {
  constructor() {
    super('Aucune session')
    this.name = 'ErreurAuthentification'
  }
}

/** Le droit d'un utilisateur à une action, tel que `core` le calcule. */
export function verifierDroit(
  utilisateur: UtilisateurConnecte,
  action: Action,
  contexte: Omit<ContexteDroit, 'utilisateurId'> = {},
): ResultatDroit {
  return autoriser(utilisateur.roles, action, { ...contexte, utilisateurId: utilisateur.id })
}

/** Lance `ErreurAutorisation` si l'action est refusée. À appeler en tête de chaque écriture. */
export function exigerDroit(
  utilisateur: UtilisateurConnecte,
  action: Action,
  contexte: Omit<ContexteDroit, 'utilisateurId'> = {},
): void {
  const resultat = verifierDroit(utilisateur, action, contexte)
  if (!resultat.autorise) throw new ErreurAutorisation(action, resultat.motif)
}

/** Contexte de données cloisonné sur l'organisation de l'utilisateur. */
export function contextePour(utilisateur: UtilisateurConnecte): ContexteDonnees {
  return creerContexte(connexion(), {
    organisationId: utilisateur.organisationId,
    utilisateurId: utilisateur.id,
  })
}

/**
 * Pour les actions serveur et routes API : l'utilisateur et son contexte,
 * ou une erreur (pas de redirection : l'appelant répond 401/403).
 */
export async function exigerSession(): Promise<{
  utilisateur: UtilisateurConnecte
  contexte: ContexteDonnees
}> {
  const utilisateur = await utilisateurCourant()
  if (!utilisateur) throw new ErreurAuthentification()
  return { utilisateur, contexte: contextePour(utilisateur) }
}
