/**
 * Fixtures de test uniquement : documents minimaux construits en mémoire
 * (jszip est une dépendance de développement). Aucun code livré n'importe
 * ce module.
 */

import JSZip from 'jszip'

const ENTETE_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
const NS_TYPES = 'http://schemas.openxmlformats.org/package/2006/content-types'
const NS_RELS = 'http://schemas.openxmlformats.org/package/2006/relationships'
const NS_OFFICE_DOC = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

function relsRacine(cible: string): string {
  return `${ENTETE_XML}<Relationships xmlns="${NS_RELS}"><Relationship Id="rId1" Type="${NS_OFFICE_DOC}/officeDocument" Target="${cible}"/></Relationships>`
}

function echapperXml(texte: string): string {
  return texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Docx minimal : un paragraphe par entrée de `paragraphes`. */
export async function docxMinimal(paragraphes: readonly string[]): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `${ENTETE_XML}<Types xmlns="${NS_TYPES}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  )
  zip.file('_rels/.rels', relsRacine('word/document.xml'))
  zip.file('word/document.xml', documentWord(paragraphes))
  return zip.generateAsync({ type: 'uint8array' })
}

function documentWord(paragraphes: readonly string[]): string {
  const corps = paragraphes
    .map((p) => `<w:p><w:r><w:t xml:space="preserve">${echapperXml(p)}</w:t></w:r></w:p>`)
    .join('')
  return `${ENTETE_XML}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${corps}</w:body></w:document>`
}

/** Zip contenant `word/document.xml` mais sans `[Content_Types].xml` : file-type le voit comme un simple zip. */
export async function zipWordSansContentTypes(): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file('word/document.xml', documentWord(['A']))
  return zip.generateAsync({ type: 'uint8array' })
}

export interface FeuilleFixture {
  nom: string
  /** Lignes de cellules ; une cellule `null` est absente du fichier. */
  lignes: readonly (readonly (string | number | null)[])[]
}

/** Xlsx minimal en chaînes en ligne (`inlineStr`), une feuille par entrée. */
export async function xlsxMinimal(feuilles: readonly FeuilleFixture[]): Promise<Uint8Array> {
  const zip = new JSZip()
  const overrides = feuilles
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join('')
  zip.file(
    '[Content_Types].xml',
    `${ENTETE_XML}<Types xmlns="${NS_TYPES}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${overrides}</Types>`,
  )
  zip.file('_rels/.rels', relsRacine('xl/workbook.xml'))
  const sheets = feuilles
    .map((f, i) => `<sheet name="${echapperXml(f.nom)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('')
  zip.file(
    'xl/workbook.xml',
    `${ENTETE_XML}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${NS_OFFICE_DOC}"><sheets>${sheets}</sheets></workbook>`,
  )
  const rels = feuilles
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="${NS_OFFICE_DOC}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join('')
  zip.file(
    'xl/_rels/workbook.xml.rels',
    `${ENTETE_XML}<Relationships xmlns="${NS_RELS}">${rels}</Relationships>`,
  )
  feuilles.forEach((f, i) => {
    zip.file(`xl/worksheets/sheet${i + 1}.xml`, feuilleXml(f.lignes))
  })
  return zip.generateAsync({ type: 'uint8array' })
}

function feuilleXml(lignes: FeuilleFixture['lignes']): string {
  const rows = lignes
    .map((cellules, r) => {
      const cells = cellules
        .map((valeur, c) => {
          if (valeur === null) return ''
          const ref = `${String.fromCharCode(65 + c)}${r + 1}`
          return typeof valeur === 'number'
            ? `<c r="${ref}"><v>${valeur}</v></c>`
            : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${echapperXml(valeur)}</t></is></c>`
        })
        .join('')
      return `<row r="${r + 1}">${cells}</row>`
    })
    .join('')
  return `${ENTETE_XML}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`
}

/** Pptx minimal : `[Content_Types].xml` et `ppt/presentation.xml`. */
export async function pptxMinimal(): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `${ENTETE_XML}<Types xmlns="${NS_TYPES}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>`,
  )
  zip.file('_rels/.rels', relsRacine('ppt/presentation.xml'))
  zip.file(
    'ppt/presentation.xml',
    `${ENTETE_XML}<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst/></p:presentation>`,
  )
  return zip.generateAsync({ type: 'uint8array' })
}

/**
 * PDF 1.4 minimal écrit à la main : une page, police Helvetica, flux de
 * contenu donné, table xref correcte. `contenu` vide → page blanche.
 */
export function pdfMinimal(contenu: string): Uint8Array {
  const objets = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${contenu.length} >>\nstream\n${contenu}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let corps = '%PDF-1.4\n'
  const positions: number[] = []
  objets.forEach((objet, i) => {
    positions.push(corps.length)
    corps += `${i + 1} 0 obj\n${objet}\nendobj\n`
  })
  const xref = corps.length
  corps += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`
  for (const position of positions) corps += `${String(position).padStart(10, '0')} 00000 n \n`
  corps += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(corps)
}

export function pdfAvecTexte(texte: string): Uint8Array {
  return pdfMinimal(`BT /F1 12 Tf 72 720 Td (${texte}) Tj ET`)
}

/** Signature PNG suivie d'un en-tête IHDR 1×1 : suffisant pour file-type. */
export function pngMinimal(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1,
    0, 0, 0, 1, 8, 6, 0, 0, 0,
  ])
}

/** En-tête OLE (Compound File Binary) suivi de zéros : signature d'un `.msg`. */
export function oleMinimal(): Uint8Array {
  const octets = new Uint8Array(512)
  octets.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
  return octets
}

export function utf8AvecBom(texte: string): Uint8Array {
  const corps = new TextEncoder().encode(texte)
  const octets = new Uint8Array(3 + corps.length)
  octets.set([0xef, 0xbb, 0xbf])
  octets.set(corps, 3)
  return octets
}

/** Encode en windows-1252 les caractères ASCII et Latin-1 ; `€` → 0x80. */
export function windows1252(texte: string): Uint8Array {
  return Uint8Array.from(texte, (caractere) => {
    if (caractere === '€') return 0x80
    const code = caractere.codePointAt(0) ?? 0
    if (code > 0xff) throw new Error(`Caractère hors windows-1252 : ${caractere}`)
    return code
  })
}
