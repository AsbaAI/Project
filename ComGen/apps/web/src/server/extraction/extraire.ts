/**
 * Extraction déterministe du texte d'un fichier déposé, par format.
 * Voir `types.ts` pour le contrat ; `format.ts` pour la détection.
 */

import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import * as XLSX from 'xlsx'

import { detecterFormat } from './format'
import type { FormatSource, TexteExtrait } from './types'
import { ErreurExtraction, TAILLE_MAX_OCTETS } from './types'

export async function extraireTexte(nomFichier: string, octets: Uint8Array): Promise<TexteExtrait> {
  if (octets.byteLength > TAILLE_MAX_OCTETS) {
    throw new ErreurExtraction(
      'FICHIER_TROP_VOLUMINEUX',
      `Le fichier « ${nomFichier} » dépasse ${TAILLE_MAX_OCTETS} octets (${octets.byteLength})`,
    )
  }
  const format = await detecterFormat(nomFichier, octets)
  switch (format) {
    case 'docx':
      return sansTexteAbsent(await extraireDocx(octets))
    case 'pdf':
      return sansTexteAbsent(
        await extrairePdf(octets),
        'Le PDF ne contient aucun texte extractible (document numérisé ?) : OCR requis, prévu au lot 8',
      )
    case 'xlsx':
      return sansTexteAbsent(extraireXlsx(octets))
    case 'csv':
    case 'md':
    case 'txt':
      return sansTexteAbsent({ texte: decoderTexte(octets), format })
    case 'pptx':
    case 'eml':
    case 'msg':
    case 'image':
      throw new ErreurExtraction(
        'FORMAT_NON_PRIS_EN_CHARGE',
        `Le format ${format} n'est pas encore extrait : prévu au lot 8 (OCR / messagerie)`,
        format,
      )
  }
}

/** Un fichier lisible mais sans texte est refusé : rien n'est présenté comme complet à tort. */
function sansTexteAbsent(resultat: TexteExtrait, message?: string): TexteExtrait {
  if (resultat.texte.trim().length === 0) {
    throw new ErreurExtraction(
      'TEXTE_ABSENT',
      message ?? `Le fichier ${resultat.format} ne contient aucun texte`,
      resultat.format,
    )
  }
  return resultat
}

/** mammoth joint les paragraphes par `\n\n` et en ajoute un après le dernier : on retire ce dernier. */
async function extraireDocx(octets: Uint8Array): Promise<TexteExtrait> {
  let valeur: string
  try {
    valeur = (await mammoth.extractRawText({ buffer: Buffer.from(octets) })).value
  } catch (erreur) {
    throw illisible('docx', 'Le document Word est corrompu ou incomplet', erreur)
  }
  return { texte: valeur.endsWith('\n\n') ? valeur.slice(0, -2) : valeur, format: 'docx' }
}

async function extrairePdf(octets: Uint8Array): Promise<TexteExtrait> {
  // Copie : pdf.js peut transférer le tampon à son worker, ce qui le détacherait.
  const analyseur = new PDFParse({ data: new Uint8Array(octets) })
  try {
    // `pageJoiner: ''` supprime le séparateur « -- n of N -- » ajouté par défaut.
    const resultat = await analyseur.getText({ pageJoiner: '' })
    const texte = resultat.pages.map((page) => page.text).join('\n\n')
    return { texte, format: 'pdf', pages: resultat.total }
  } catch (erreur) {
    const chiffre = erreur instanceof Error && erreur.name === 'PasswordException'
    throw illisible(
      'pdf',
      chiffre ? 'Le PDF est protégé par mot de passe' : 'Le PDF est corrompu ou illisible',
      erreur,
    )
  } finally {
    await analyseur.destroy()
  }
}

/**
 * Convention de rendu d'un classeur (partagée avec le seed) :
 * - une ligne `## <nom de feuille>` par feuille, dans l'ordre du classeur ;
 * - puis chaque ligne de la feuille, cellules formatées (`raw: false`)
 *   jointes par ` ; `, les cellules vides de fin de ligne retirées ;
 * - une ligne vide entre deux feuilles ; `pages` = nombre de feuilles.
 */
function extraireXlsx(octets: Uint8Array): TexteExtrait {
  let classeur: XLSX.WorkBook
  try {
    classeur = XLSX.read(octets, { type: 'array' })
  } catch (erreur) {
    throw illisible('xlsx', 'Le classeur est corrompu ou illisible', erreur)
  }
  let cellulesVues = false
  const feuilles = classeur.SheetNames.map((nom) => {
    const feuille = classeur.Sheets[nom]
    const lignes =
      feuille === undefined
        ? []
        : XLSX.utils.sheet_to_json<unknown[]>(feuille, { header: 1, raw: false, defval: '' })
    const rendu = lignes.map((cellules) => {
      const textes = cellules.map((cellule) =>
        typeof cellule === 'string' ? cellule : String(cellule ?? ''),
      )
      while (textes.length > 0 && textes[textes.length - 1] === '') textes.pop()
      if (textes.length > 0) cellulesVues = true
      return textes.join(' ; ')
    })
    return [`## ${nom}`, ...rendu].join('\n')
  })
  return {
    texte: cellulesVues ? feuilles.join('\n\n') : '',
    format: 'xlsx',
    pages: classeur.SheetNames.length,
  }
}

/**
 * UTF-8 strict d'abord (le BOM, s'il existe, est consommé et n'apparaît pas
 * dans le texte) ; à défaut windows-1252, l'encodage hérité le plus courant
 * des exports CSV bureautiques francophones. Le texte est rendu tel quel.
 */
function decoderTexte(octets: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(octets)
  } catch {
    return new TextDecoder('windows-1252').decode(octets)
  }
}

function illisible(format: FormatSource, message: string, cause: unknown): ErreurExtraction {
  return new ErreurExtraction('FICHIER_ILLISIBLE', message, format, { cause })
}
