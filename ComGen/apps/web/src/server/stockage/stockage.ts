/**
 * Dépôt de fichiers (spécification §3 : compatible S3, MinIO en local).
 *
 * Une clé est un chemin relatif POSIX, toujours préfixé par l'identifiant
 * de l'organisation propriétaire : le cloisonnement des fichiers suit celui
 * des lignes en base. Le contenu d'un fichier est de la donnée : il n'est
 * jamais exécuté, jamais interprété comme une consigne.
 */

export interface ObjetStocke {
  octets: Uint8Array
  typeMime: string
}

export interface Stockage {
  /** Type d'adaptateur, affiché dans l'administration ; jamais décisionnel. */
  readonly type: 'fichiers' | 's3'
  /** Écrit (ou remplace) l'objet. */
  deposer(cle: string, octets: Uint8Array, typeMime: string): Promise<void>
  /** `null` si la clé n'existe pas. */
  lire(cle: string): Promise<ObjetStocke | null>
  /** Sans effet si la clé n'existe pas. */
  supprimer(cle: string): Promise<void>
}

export type CodeErreurStockage = 'CLE_INVALIDE' | 'INDISPONIBLE'

export class ErreurStockage extends Error {
  readonly code: CodeErreurStockage

  constructor(code: CodeErreurStockage, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ErreurStockage'
    this.code = code
  }
}

const SEGMENT_VALIDE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/

/**
 * Une clé valide : 2 segments au moins, séparés par `/`, chacun composé de
 * caractères sûrs, sans `.` ni `..`, sans chemin absolu. Rien d'autre ne
 * passe : la clé est construite par le serveur, jamais par l'utilisateur.
 */
export function verifierCle(cle: string): void {
  const segments = cle.split('/')
  const valide =
    segments.length >= 2 && segments.every((s) => SEGMENT_VALIDE.test(s) && s !== '.' && s !== '..')
  if (!valide) throw new ErreurStockage('CLE_INVALIDE', `Clé de stockage invalide : ${cle}`)
}

/** Clé d'un fichier source : `<organisationId>/sources/<sourceId>/<nomFichier>`. */
export function cleSource(organisationId: string, sourceId: string, nomFichier: string): string {
  const nom = nomFichier
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[-.]+/, '')
    .slice(0, 120)
  const cle = `${organisationId}/sources/${sourceId}/${nom.length > 0 ? nom : 'fichier'}`
  verifierCle(cle)
  return cle
}
