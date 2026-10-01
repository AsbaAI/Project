/**
 * Extraction du texte des fichiers déposés (spécification §10, mode FICHIER).
 *
 * L'extraction est déterministe et s'exécute côté serveur, sans modèle.
 * Elle produit le texte brut qui devient `Source.contenuTexte` ; les
 * citations des faits sont vérifiées mot pour mot contre ce texte, il
 * doit donc être stable d'une exécution à l'autre pour un même fichier.
 *
 * Ce qui n'est pas pris en charge échoue explicitement : jamais de texte
 * partiel présenté comme complet.
 */

export const FORMATS_SOURCE = [
  'docx',
  'pdf',
  'xlsx',
  'csv',
  'md',
  'txt',
  'pptx',
  'eml',
  'msg',
  'image',
] as const
export type FormatSource = (typeof FORMATS_SOURCE)[number]

/** Formats dont l'extraction est livrée au lot 1. Les autres arrivent au lot 8. */
export const FORMATS_EXTRAITS = [
  'docx',
  'pdf',
  'xlsx',
  'csv',
  'md',
  'txt',
] as const satisfies readonly FormatSource[]

export interface TexteExtrait {
  /** Texte brut, non normalisé (la normalisation est faite par l'appelant via `core`). */
  texte: string
  format: FormatSource
  /** Nombre de pages ou de feuilles, quand le format en a. */
  pages?: number
}

export type CodeErreurExtraction =
  /** Extension inconnue ou contenu non identifiable. */
  | 'FORMAT_INCONNU'
  /** L'extension et le contenu réel ne correspondent pas. */
  | 'FORMAT_INCOHERENT'
  /** Format reconnu mais non extrait à ce lot (pptx, eml, msg, image → OCR). */
  | 'FORMAT_NON_PRIS_EN_CHARGE'
  /** Fichier lisible mais sans texte (PDF scanné : OCR requis). */
  | 'TEXTE_ABSENT'
  /** Fichier corrompu ou chiffré. */
  | 'FICHIER_ILLISIBLE'
  | 'FICHIER_TROP_VOLUMINEUX'

export class ErreurExtraction extends Error {
  readonly code: CodeErreurExtraction
  readonly format: FormatSource | null

  constructor(
    code: CodeErreurExtraction,
    message: string,
    format: FormatSource | null = null,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'ErreurExtraction'
    this.code = code
    this.format = format
  }
}

/** Taille maximale d'un fichier déposé : 25 Mio. */
export const TAILLE_MAX_OCTETS = 25 * 1024 * 1024
