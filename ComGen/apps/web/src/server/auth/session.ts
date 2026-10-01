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

export { ErreurAutorisation, exigerDroit, verifierDroit } from './droits'

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

export class ErreurAuthentification extends Error {
  constructor() {
    super('Aucune session')
    this.name = 'ErreurAuthentification'
  }
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
