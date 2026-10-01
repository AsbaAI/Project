import { type Action, type ContexteDroit, type ResultatDroit, autoriser } from '@comgen/core'
import type { UtilisateurConnecte } from '@comgen/db'

/**
 * Droits côté serveur (§16) : la table vit dans `core`, ce module la relie à
 * l'utilisateur relu en base. Sans dépendance au framework, pour que les
 * services métier l'appellent et soient testés tels quels.
 */

export class ErreurAutorisation extends Error {
  constructor(
    readonly action: Action,
    readonly motif: Extract<ResultatDroit, { autorise: false }>['motif'],
  ) {
    super(`Action ${action} refusée : ${motif}`)
    this.name = 'ErreurAutorisation'
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
