/**
 * Fabriques de fichiers de démonstration : .docx, .xlsx et .pdf minimaux,
 * écrits à la main, sans dépendance bureautique. Chaque fabrique est
 * déterministe (mêmes paragraphes → mêmes octets) pour que les fichiers
 * versionnés dans `fichiers/` restent comparables à ceux rebâtis au vol.
 *
 * ---------------------------------------------------------------------------
 * CONVENTION DE RENDU TEXTE — contractuelle, partagée avec l'extraction de
 * `apps/web` (spécification §10, mode FICHIER). Le texte rendu, passé par
 * `normaliserTexteSource`, EST `Source.contenuTexte` ; les citations des
 * faits sont vérifiées mot pour mot contre lui. Vérifiée à l'identique avec
 * mammoth 1.12, SheetJS 0.20 et pdf-parse 2.4 (pdf.js) sur les fichiers de
 * `fichiers/`.
 *
 * .docx  — mammoth `extractRawText` : chaque paragraphe `<w:p>` suivi de
 *          `\n\n`. Rendu = paragraphes joints par `\n\n` (le `\n\n` final est
 *          retiré par la normalisation). Aucune mise en forme, ni tableau, ni
 *          en-tête : les fichiers de démonstration n'en contiennent pas.
 *
 * .xlsx  — SheetJS `XLSX.read(octets)` puis, pour chaque feuille dans l'ordre
 *          du classeur, `sheet_to_json(feuille, { header: 1, raw: false })`.
 *          Rendu par feuille : une ligne d'en-tête `## <nom>`, puis une
 *          ligne par ligne non vide, cellules rendues par leur texte formaté
 *          (`w`, sinon `v`, sinon chaîne vide) et jointes par ` ; `. Les
 *          feuilles sont séparées par une ligne vide. Les cellules vides en
 *          fin de ligne sont omises par SheetJS : le rendu s'aligne dessus.
 *
 * .pdf   — pdf-parse `new PDFParse({ data }).getText({ pageJoiner: '' })`
 *          puis `resultat.text` (sans `pageJoiner: ''`, pdf-parse insère
 *          « -- 1 of 1 -- » après chaque page). pdf.js émet une fin de ligne
 *          (`hasEOL`) par ligne du flux texte ; pdf-parse joint les pages par
 *          `\n\n`. Une ligne vide du texte source (déplacement `T*` sans
 *          glyphe) ne produit AUCUN texte : le rendu est donc « lignes non
 *          vides jointes par `\n` », sans séparation de paragraphes. Les
 *          fichiers sont en Helvetica WinAnsi : seuls les caractères
 *          U+0020–U+007E et U+00A0–U+00FF sont admis (accents latins compris ;
 *          ni « œ », ni « € », ni apostrophe typographique, ni tirets longs —
 *          la fabrique refuse le reste).
 *
 * .csv   — contenu du fichier tel quel : un CSV est déjà du texte et
 *          l'extraction ne le réinterprète pas. Champs sans guillemets dans
 *          les fichiers de démonstration (la fabrique refuse le reste).
 *
 * .txt / .md — contenu du fichier tel quel (UTF-8).
 * ---------------------------------------------------------------------------
 */

import JSZip from 'jszip'

/** Date figée des entrées de zip : sans elle, chaque construction différerait. */
const DATE_ZIP = new Date('2026-09-01T00:00:00Z')

function echapperXml(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function fermerZip(entrees: Record<string, string>): Promise<Uint8Array> {
  const zip = new JSZip()
  for (const [chemin, contenu] of Object.entries(entrees)) {
    zip.file(chemin, contenu, { date: DATE_ZIP, createFolders: false })
  }
  return zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    platform: 'UNIX',
  })
}

const ENTETE_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

/** Un document Word minimal : un `<w:p>` par paragraphe, aucun style. */
export async function construireDocx(paragraphes: string[]): Promise<Uint8Array> {
  const corps = paragraphes
    .map((p) => `<w:p><w:r><w:t xml:space="preserve">${echapperXml(p)}</w:t></w:r></w:p>`)
    .join('')
  return fermerZip({
    '[Content_Types].xml':
      `${ENTETE_XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>',
    '_rels/.rels':
      `${ENTETE_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>',
    'word/document.xml':
      `${ENTETE_XML}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
      `<w:body>${corps}</w:body></w:document>`,
  })
}

/** Rendu texte d'un .docx selon la convention d'en-tête. */
export function rendreTexteDocx(paragraphes: string[]): string {
  return paragraphes.join('\n\n')
}

export interface FeuilleXlsx {
  nom: string
  lignes: string[][]
}

function lettresColonne(indice: number): string {
  let n = indice + 1
  let lettres = ''
  while (n > 0) {
    const reste = (n - 1) % 26
    lettres = String.fromCharCode(65 + reste) + lettres
    n = Math.floor((n - 1) / 26)
  }
  return lettres
}

/** Un classeur minimal : cellules `inlineStr` uniquement, une feuille par entrée. */
export async function construireXlsx(feuilles: FeuilleXlsx[]): Promise<Uint8Array> {
  const entrees: Record<string, string> = {}
  const overrides: string[] = []
  const declarations: string[] = []
  const relations: string[] = []

  feuilles.forEach((feuille, indice) => {
    const numero = indice + 1
    const rangees = feuille.lignes
      .map((cellules, r) => {
        const contenu = cellules
          .map(
            (cellule, c) =>
              `<c r="${lettresColonne(c)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${echapperXml(cellule)}</t></is></c>`,
          )
          .join('')
        return `<row r="${r + 1}">${contenu}</row>`
      })
      .join('')
    entrees[`xl/worksheets/sheet${numero}.xml`] =
      `${ENTETE_XML}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      `<sheetData>${rangees}</sheetData></worksheet>`
    overrides.push(
      `<Override PartName="/xl/worksheets/sheet${numero}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    declarations.push(
      `<sheet name="${echapperXml(feuille.nom)}" sheetId="${numero}" r:id="rId${numero}"/>`,
    )
    relations.push(
      `<Relationship Id="rId${numero}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${numero}.xml"/>`,
    )
  })

  entrees['[Content_Types].xml'] =
    `${ENTETE_XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    `${overrides.join('')}</Types>`
  entrees['_rels/.rels'] =
    `${ENTETE_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>'
  entrees['xl/workbook.xml'] =
    `${ENTETE_XML}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>${declarations.join('')}</sheets></workbook>`
  entrees['xl/_rels/workbook.xml.rels'] =
    `${ENTETE_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `${relations.join('')}</Relationships>`

  return fermerZip(entrees)
}

/** Rendu texte d'un .xlsx selon la convention d'en-tête. */
export function rendreTexteXlsx(feuilles: FeuilleXlsx[]): string {
  return feuilles
    .map((feuille) =>
      [`## ${feuille.nom}`, ...feuille.lignes.map((cellules) => cellules.join(' ; '))].join('\n'),
    )
    .join('\n\n')
}

/**
 * Rendu texte d'un .csv : l'extraction serveur garde le fichier tel quel
 * (un CSV est déjà du texte), donc le rendu est le contenu du fichier.
 */
export function rendreTexteCsv(lignes: string[][], separateur: ',' | ';' = ','): string {
  return construireCsv(lignes, separateur)
}

/** Contenu d'un fichier .csv : champs joints par le séparateur donné. */
export function construireCsv(lignes: string[][], separateur: ',' | ';' = ','): string {
  for (const cellules of lignes) {
    for (const cellule of cellules) {
      if (cellule.includes(separateur) || cellule.includes('"') || cellule.includes('\n')) {
        throw new Error(`Cellule CSV non admise sans guillemets : ${JSON.stringify(cellule)}`)
      }
    }
  }
  return `${lignes.map((cellules) => cellules.join(separateur)).join('\n')}\n`
}

const LIGNES_PAR_PAGE = 48
const CORPS_TAILLE = 11
const INTERLIGNE = 15
const MARGE_GAUCHE = 56
const ORDONNEE_DEPART = 780

function verifierWinAnsi(ligne: string): void {
  for (const caractere of ligne) {
    const code = caractere.codePointAt(0) ?? 0
    const admis = (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)
    if (!admis) {
      throw new Error(
        `Caractère non représentable en Helvetica WinAnsi : ${JSON.stringify(caractere)} (U+${code.toString(16).toUpperCase().padStart(4, '0')}) dans « ${ligne} »`,
      )
    }
  }
}

/** Objets : 1 catalogue, 2 arbre des pages, 3 police, puis (page, contenu) par page. */
function numeroPage(indice: number): number {
  return 4 + indice * 2
}

function numeroContenu(indice: number): number {
  return 5 + indice * 2
}

function echapperChainePdf(ligne: string): string {
  return ligne.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

/**
 * Un PDF 1.4 texte, Helvetica 11 pt, une ligne de texte par entrée. Les
 * lignes vides sont conservées (déplacement sans glyphe). Table xref exacte.
 */
export function construirePdf(lignes: string[]): Uint8Array {
  lignes.forEach(verifierWinAnsi)
  const pages: string[][] = []
  for (let i = 0; i < lignes.length; i += LIGNES_PAR_PAGE) {
    pages.push(lignes.slice(i, i + LIGNES_PAR_PAGE))
  }
  if (pages.length === 0) pages.push([])

  // Objets : 1 catalogue, 2 arbre des pages, 3 police, puis (page, contenu) × n.
  const objets: string[] = []
  objets.push('<< /Type /Catalog /Pages 2 0 R >>')
  objets.push(
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${numeroPage(i)} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  )
  objets.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  pages.forEach((lignesPage, indice) => {
    const operations = lignesPage
      .map((ligne) => (ligne.length === 0 ? 'T*' : `(${echapperChainePdf(ligne)}) Tj T*`))
      .join('\n')
    const flux = `BT\n/F1 ${CORPS_TAILLE} Tf\n${INTERLIGNE} TL\n${MARGE_GAUCHE} ${ORDONNEE_DEPART} Td\n${operations}\nET`
    objets.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${numeroContenu(indice)} 0 R >>`,
    )
    objets.push(`<< /Length ${Buffer.byteLength(flux, 'latin1')} >>\nstream\n${flux}\nendstream`)
  })

  let sortie = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
  const offsets: number[] = []
  objets.forEach((objet, i) => {
    offsets.push(Buffer.byteLength(sortie, 'latin1'))
    sortie += `${i + 1} 0 obj\n${objet}\nendobj\n`
  })
  const debutXref = Buffer.byteLength(sortie, 'latin1')
  sortie += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) {
    sortie += `${String(offset).padStart(10, '0')} 00000 n \n`
  }
  sortie += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${debutXref}\n%%EOF\n`
  return new Uint8Array(Buffer.from(sortie, 'latin1'))
}

/** Rendu texte d'un .pdf selon la convention d'en-tête : les lignes vides disparaissent. */
export function rendreTextePdf(lignes: string[]): string {
  return lignes.filter((ligne) => ligne.length > 0).join('\n')
}
