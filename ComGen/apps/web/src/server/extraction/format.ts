/**
 * Détection du format d'un fichier déposé : l'extension annonce, le contenu
 * confirme. Tout désaccord bloque (`FORMAT_INCOHERENT`) ; on ne devine pas.
 */

import { fileTypeFromBuffer } from 'file-type'

import type { FormatSource } from './types'
import { ErreurExtraction } from './types'

/** Extension (minuscule, sans point) → format annoncé. */
const FORMAT_PAR_EXTENSION: Readonly<Record<string, FormatSource>> = {
  docx: 'docx',
  pdf: 'pdf',
  xlsx: 'xlsx',
  csv: 'csv',
  md: 'md',
  markdown: 'md',
  txt: 'txt',
  text: 'txt',
  pptx: 'pptx',
  eml: 'eml',
  msg: 'msg',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  tif: 'image',
  tiff: 'image',
  webp: 'image',
}

/** Formats sans signature : le contenu doit seulement être du texte. */
const FORMATS_TEXTE: ReadonlySet<FormatSource> = new Set<FormatSource>(['csv', 'md', 'txt', 'eml'])

/**
 * Ce que dit le contenu : un format identifié par signature, `texte` (pas de
 * signature, pas d'octet NUL), `ole` (conteneur Microsoft : msg, mais aussi
 * doc/xls), `zip` (archive sans partie Office) ou `binaire` (non identifié).
 */
type Contenu = FormatSource | 'texte' | 'ole' | 'zip' | 'binaire'

export async function detecterFormat(
  nomFichier: string,
  octets: Uint8Array,
): Promise<FormatSource> {
  const extension = extensionDe(nomFichier)
  const attendu = extension === null ? null : FORMAT_PAR_EXTENSION[extension]
  const contenu = await identifierContenu(octets)

  if (attendu !== undefined && attendu !== null) {
    if (estCompatible(attendu, contenu)) return attendu
    throw new ErreurExtraction(
      'FORMAT_INCOHERENT',
      `Le fichier « ${nomFichier} » annonce ${attendu} mais son contenu est ${decrire(contenu)}`,
      attendu,
    )
  }

  // Extension absente ou inconnue : seule une signature de format tranche.
  const sansFormat =
    contenu === 'texte' || contenu === 'ole' || contenu === 'zip' || contenu === 'binaire'
  if (sansFormat) {
    throw new ErreurExtraction(
      'FORMAT_INCONNU',
      extension === null
        ? `Le fichier « ${nomFichier} » n'a pas d'extension et son contenu (${decrire(contenu)}) ne suffit pas à l'identifier`
        : `L'extension « .${extension} » n'est pas prise en charge`,
    )
  }
  if (extension !== null) {
    throw new ErreurExtraction(
      'FORMAT_INCOHERENT',
      `L'extension « .${extension} » n'est pas prise en charge et le contenu est ${decrire(contenu)}`,
      contenu,
    )
  }
  return contenu
}

function extensionDe(nomFichier: string): string | null {
  const point = nomFichier.lastIndexOf('.')
  if (point <= 0 || point === nomFichier.length - 1) return null
  return nomFichier.slice(point + 1).toLowerCase()
}

function estCompatible(attendu: FormatSource, contenu: Contenu): boolean {
  if (FORMATS_TEXTE.has(attendu)) return contenu === 'texte'
  if (attendu === 'msg') return contenu === 'ole'
  return contenu === attendu
}

function decrire(contenu: Contenu): string {
  switch (contenu) {
    case 'texte':
      return 'du texte brut'
    case 'ole':
      return 'un conteneur OLE'
    case 'zip':
      return 'une archive zip sans partie Office'
    case 'binaire':
      return 'binaire non identifié'
    default:
      return `un ${contenu}`
  }
}

async function identifierContenu(octets: Uint8Array): Promise<Contenu> {
  const type = await fileTypeFromBuffer(octets)
  switch (type?.ext) {
    case 'docx':
    case 'xlsx':
    case 'pptx':
    case 'pdf':
      return type.ext
    case 'zip':
      return formatOffice(octets) ?? 'zip'
    case 'png':
    case 'jpg':
    case 'tif':
    case 'webp':
      return 'image'
    case 'cfb':
      return 'ole'
    default:
      // Pas de signature utile : texte si aucun octet NUL, sinon binaire.
      return octets.includes(0) ? 'binaire' : 'texte'
  }
}

const PARTIE_OFFICE: readonly [string, FormatSource][] = [
  ['word/document.xml', 'docx'],
  ['xl/workbook.xml', 'xlsx'],
  ['ppt/presentation.xml', 'pptx'],
]

/**
 * Zip que file-type n'a pas reconnu comme Office (par exemple sans
 * `[Content_Types].xml`) : on lit les noms d'entrées du répertoire central
 * et on cherche la partie principale de chaque format.
 */
function formatOffice(octets: Uint8Array): FormatSource | null {
  const noms = nomsEntreesZip(octets)
  if (noms === null) return null
  const partie = PARTIE_OFFICE.find(([nom]) => noms.has(nom))
  return partie ? partie[1] : null
}

const SIGNATURE_FIN_REPERTOIRE = 0x06054b50
const SIGNATURE_ENTREE_REPERTOIRE = 0x02014b50
const TAILLE_FIN_REPERTOIRE = 22
const TAILLE_ENTREE_REPERTOIRE = 46
const COMMENTAIRE_MAX = 0xffff

/** Noms des entrées listées par le répertoire central ; `null` si la structure est invalide. */
function nomsEntreesZip(octets: Uint8Array): Set<string> | null {
  if (octets.length < TAILLE_FIN_REPERTOIRE) return null
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength)
  const limite = Math.max(0, octets.length - TAILLE_FIN_REPERTOIRE - COMMENTAIRE_MAX)
  let fin = -1
  for (let i = octets.length - TAILLE_FIN_REPERTOIRE; i >= limite; i--) {
    if (vue.getUint32(i, true) === SIGNATURE_FIN_REPERTOIRE) {
      fin = i
      break
    }
  }
  if (fin === -1) return null

  const nombre = vue.getUint16(fin + 10, true)
  let position = vue.getUint32(fin + 16, true)
  const decodeur = new TextDecoder('utf-8')
  const noms = new Set<string>()
  for (let k = 0; k < nombre; k++) {
    if (position + TAILLE_ENTREE_REPERTOIRE > octets.length) return null
    if (vue.getUint32(position, true) !== SIGNATURE_ENTREE_REPERTOIRE) return null
    const longueurNom = vue.getUint16(position + 28, true)
    const longueurExtra = vue.getUint16(position + 30, true)
    const longueurCommentaire = vue.getUint16(position + 32, true)
    const debutNom = position + TAILLE_ENTREE_REPERTOIRE
    if (debutNom + longueurNom > octets.length) return null
    noms.add(decodeur.decode(octets.subarray(debutNom, debutNom + longueurNom)))
    position = debutNom + longueurNom + longueurExtra + longueurCommentaire
  }
  return noms
}
