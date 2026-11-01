/**
 * Les pannes d'un connecteur, nommées. L'interface traduit le code ; le
 * message n'est destiné qu'au journal du serveur.
 *
 * Un message d'erreur ne contient JAMAIS de secret, d'en-tête
 * d'autorisation ni de morceau de réponse : une réponse d'ITSM peut porter
 * des données de ticket, et un message d'erreur finit dans les journaux.
 */
export type CodeErreurItsm =
  /** Configuration inutilisable : adresse, méthode, secret absent. */
  | 'CONFIG'
  /** Les identifiants sont refusés, ou le droit de lire manque. */
  | 'AUTH_REFUSEE'
  /** Le jeton a expiré et n'a pas pu être renouvelé. */
  | 'AUTH_EXPIREE'
  | 'DELAI_DEPASSE'
  /** Trop de requêtes ; `retryApresSecondes` dit quand réessayer, si l'outil le sait. */
  | 'QUOTA'
  /** L'outil ne répond pas, ou répond par une erreur de son côté. */
  | 'INDISPONIBLE'
  | 'INTROUVABLE'
  /** Réponse vide, illisible ou d'une forme inattendue. */
  | 'REPONSE_INVALIDE'

export class ErreurItsm extends Error {
  readonly code: CodeErreurItsm
  readonly retryApresSecondes?: number
  readonly statutHttp?: number

  constructor(
    code: CodeErreurItsm,
    message: string,
    options: { retryApresSecondes?: number; statutHttp?: number; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'ErreurItsm'
    this.code = code
    if (options.retryApresSecondes !== undefined)
      this.retryApresSecondes = options.retryApresSecondes
    if (options.statutHttp !== undefined) this.statutHttp = options.statutHttp
  }
}

export function estErreurItsm(valeur: unknown): valeur is ErreurItsm {
  return valeur instanceof ErreurItsm
}
