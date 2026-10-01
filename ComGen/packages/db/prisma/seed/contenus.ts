/**
 * Contenu d'une source de démonstration : une description unique dont
 * dérivent à la fois le fichier déposé et `Source.contenuTexte`, selon les
 * conventions de rendu de `fabriques.ts`.
 */

import {
  construireCsv,
  construireDocx,
  construirePdf,
  construireXlsx,
  rendreTexteCsv,
  rendreTexteDocx,
  rendreTextePdf,
  rendreTexteXlsx,
  type FeuilleXlsx,
} from './fabriques.ts'

export type ContenuSource =
  | { format: 'docx'; paragraphes: readonly string[] }
  | { format: 'xlsx'; feuilles: readonly FeuilleXlsx[] }
  | { format: 'pdf'; lignes: readonly string[] }
  | { format: 'csv'; lignes: readonly string[][]; separateur: ',' | ';' }
  | { format: 'txt' | 'md'; texte: string }
  /** Texte saisi dans l'éditeur : pas de fichier déposé. */
  | { format: 'texte'; texte: string }

export type FormatFichier = Exclude<ContenuSource['format'], 'texte'>

export const TYPES_MIME: Record<FormatFichier, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  csv: 'text/csv; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
}

/** Texte brut tel que l'extraction le rendra (avant `normaliserTexteSource`). */
export function texteBrut(contenu: ContenuSource): string {
  switch (contenu.format) {
    case 'docx':
      return rendreTexteDocx([...contenu.paragraphes])
    case 'xlsx':
      return rendreTexteXlsx([...contenu.feuilles])
    case 'pdf':
      return rendreTextePdf([...contenu.lignes])
    case 'csv':
      return rendreTexteCsv([...contenu.lignes], contenu.separateur)
    case 'txt':
    case 'md':
    case 'texte':
      return contenu.texte
  }
}

/** Octets du fichier à déposer ; `null` pour un texte saisi. */
export async function octetsFichier(contenu: ContenuSource): Promise<Uint8Array | null> {
  switch (contenu.format) {
    case 'docx':
      return construireDocx([...contenu.paragraphes])
    case 'xlsx':
      return construireXlsx([...contenu.feuilles])
    case 'pdf':
      return construirePdf([...contenu.lignes])
    case 'csv':
      return new TextEncoder().encode(construireCsv([...contenu.lignes], contenu.separateur))
    case 'txt':
    case 'md':
      return new TextEncoder().encode(contenu.texte)
    case 'texte':
      return null
  }
}
