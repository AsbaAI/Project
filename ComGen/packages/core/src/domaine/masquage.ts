/**
 * Masquage des données personnelles d'un texte, avant qu'il ne devienne une
 * source — donc avant qu'un agent ne le lise.
 *
 * Fonction pure, sans dépendance. Ce qui est masqué est ce que la
 * configuration désigne : courriels, téléphones, identifiants d'un motif
 * donné, termes précis. Ce qui ne l'est JAMAIS : les valeurs qu'une
 * communication doit citer — versions, dates, durées, effectifs, numéros de
 * ticket. Les masquer ferait dire à la communication autre chose que la
 * source ; c'est la contrainte cardinale vue du côté de la confidentialité.
 *
 * Limites assumées, à dire plutôt qu'à taire :
 * - un nom propre qui n'est pas listé dans les termes n'est PAS détecté : le
 *   masquage ne reconnaît pas les personnes dans un texte libre ;
 * - un numéro de téléphone d'un format inhabituel peut échapper aux motifs.
 * Le masquage réduit l'exposition, il ne l'annule pas : l'aperçu montre ce
 * que les agents liront, pour qu'un humain puisse le constater.
 *
 * Le texte vient de l'extérieur. Aucun motif ne comporte de quantificateur
 * imbriqué ou ambigu, et la reconnaissance d'un terme ou d'un préfixe se
 * fait sur du texte échappé : une configuration ne peut pas introduire un
 * motif qui ralentirait le serveur.
 */

export type ChampMasquable = 'demandeur'

export interface RegleIdentifiant {
  /** Lettres qui commencent l'identifiant (`E` pour `E123456`). */
  prefixe: string
  chiffresMin: number
  chiffresMax: number
}

export interface ConfigMasquage {
  courriel: boolean
  telephone: boolean
  identifiants: readonly RegleIdentifiant[]
  /** Termes précis à masquer (un nom, un projet), sans tenir compte de la casse. */
  termes: readonly string[]
  /** Champs retirés du texte avant même le masquage : le demandeur n'y figure pas. */
  champs: readonly ChampMasquable[]
}

/** Par défaut : courriels et téléphones, et le demandeur retiré. */
export const CONFIG_MASQUAGE_PAR_DEFAUT: ConfigMasquage = {
  courriel: true,
  telephone: true,
  identifiants: [],
  termes: [],
  champs: ['demandeur'],
}

/**
 * Préfixes des numéros de ticket : ils ne se masquent jamais. Un numéro de
 * ticket est une valeur que la communication cite.
 */
export const PREFIXES_DE_TICKET: readonly string[] = [
  'INC',
  'CHG',
  'RITM',
  'PRB',
  'TASK',
  'REQ',
  'SCTASK',
  'CTASK',
]

export interface ResultatMasquage {
  texte: string
  remplacements: Record<Categorie, number>
}

type Categorie = 'courriel' | 'telephone' | 'identifiant' | 'terme'

const JETONS = {
  fr: {
    courriel: '[COURRIEL]',
    telephone: '[TÉLÉPHONE]',
    identifiant: '[IDENTIFIANT]',
    terme: '[MASQUÉ]',
  },
  en: { courriel: '[EMAIL]', telephone: '[PHONE]', identifiant: '[ID]', terme: '[MASKED]' },
} as const satisfies Record<'fr' | 'en', Record<Categorie, string>>

interface Occurrence {
  debut: number
  fin: number
  categorie: Categorie
}

// Parties locales et libellés bornés (64 et 63, comme les adresses réelles) ; le
// lookbehind empêche de recommencer au milieu d'une suite déjà examinée.
const COURRIEL =
  /(?<![\p{L}\p{N}._%+-])[\p{L}\p{N}._%+-]{1,64}@[\p{L}\p{N}-]{1,63}(?:\.[\p{L}\p{N}-]{1,63}){1,8}/gu
// Les groupes de chiffres sont de longueur fixe : un seul découpage possible.
const TELEPHONE_FRANCAIS = /(?<![\p{L}\p{N}.])0[1-9](?:[ .-]?\d{2}){4}(?!\d)/gu
const TELEPHONE_NORD_AMERICAIN = /(?<![\p{L}\p{N}])\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}(?!\d)/gu

const CHIFFRES_MIN_INTERNATIONAL = 8
const CHIFFRES_MAX_INTERNATIONAL = 15
const CARACTERE_DE_NUMERO = /[\d ().-]/u
const CHIFFRE = /\d/u
const LETTRE_CHIFFRE_PLUS = /[\p{L}\p{N}+]/u

function echapper(texte: string): string {
  return texte.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`)
}

function occurrencesDe(texte: string, motif: RegExp, categorie: Categorie): Occurrence[] {
  return [...texte.matchAll(motif)].map((m) => ({
    debut: m.index,
    fin: m.index + m[0].length,
    categorie,
  }))
}

/**
 * Numéros internationaux (`+33 6 12 34 56 78`) : un balayage plutôt qu'un
 * motif, parce que les groupes de chiffres s'y découpent de plusieurs façons
 * et qu'un motif général serait ambigu — donc exploitable pour ralentir.
 * Un `+` suivi d'une suite de chiffres et de séparateurs est un numéro quand
 * il compte entre 8 et 15 chiffres (la borne de la norme E.164).
 */
function telephonesInternationaux(texte: string): Occurrence[] {
  const trouves: Occurrence[] = []
  for (let i = 0; i < texte.length; i++) {
    if (texte[i] !== '+') continue
    const avant = texte[i - 1]
    if (avant !== undefined && LETTRE_CHIFFRE_PLUS.test(avant)) continue
    if (!CHIFFRE.test(texte[i + 1] ?? '')) continue

    let fin = i + 1
    let chiffres = 0
    while (fin < texte.length && CARACTERE_DE_NUMERO.test(texte[fin] ?? '')) {
      if (CHIFFRE.test(texte[fin] ?? '')) {
        if (chiffres === CHIFFRES_MAX_INTERNATIONAL) break
        chiffres += 1
      }
      fin += 1
    }
    // Le numéro finit sur son dernier chiffre : les séparateurs de fin n'en font pas partie.
    while (fin > i + 1 && !CHIFFRE.test(texte[fin - 1] ?? '')) fin -= 1

    if (chiffres >= CHIFFRES_MIN_INTERNATIONAL) {
      trouves.push({ debut: i, fin, categorie: 'telephone' })
      i = fin - 1
    }
  }
  return trouves
}

function occurrencesIdentifiants(texte: string, regles: readonly RegleIdentifiant[]): Occurrence[] {
  return regles.flatMap((regle) => {
    const prefixe = regle.prefixe.trim()
    const valide =
      prefixe.length > 0 &&
      prefixe.length <= 20 &&
      !PREFIXES_DE_TICKET.includes(prefixe) &&
      Number.isInteger(regle.chiffresMin) &&
      Number.isInteger(regle.chiffresMax) &&
      regle.chiffresMin >= 1 &&
      regle.chiffresMax >= regle.chiffresMin &&
      regle.chiffresMax <= 20
    if (!valide) return []
    const motif = new RegExp(
      String.raw`(?<![\p{L}\p{N}])${echapper(prefixe)}\d{${String(regle.chiffresMin)},${String(regle.chiffresMax)}}(?![\p{L}\p{N}])`,
      'gu',
    )
    return occurrencesDe(texte, motif, 'identifiant')
  })
}

function occurrencesTermes(texte: string, termes: readonly string[]): Occurrence[] {
  return termes.flatMap((brut) => {
    const terme = brut.trim()
    if (terme.length < 2) return []
    // Les espaces d'un terme valent n'importe quelle suite d'espaces : « Marie  Dupont ».
    const corps = terme
      .split(/\s+/u)
      .map(echapper)
      .join(String.raw`\s+`)
    const motif = new RegExp(String.raw`(?<![\p{L}\p{N}])${corps}(?![\p{L}\p{N}])`, 'giu')
    return occurrencesDe(texte, motif, 'terme')
  })
}

export function masquer(
  texte: string,
  config: ConfigMasquage,
  langue: 'fr' | 'en',
): ResultatMasquage {
  const toutes: Occurrence[] = [
    ...(config.courriel ? occurrencesDe(texte, COURRIEL, 'courriel') : []),
    ...(config.telephone
      ? [
          ...occurrencesDe(texte, TELEPHONE_FRANCAIS, 'telephone'),
          ...occurrencesDe(texte, TELEPHONE_NORD_AMERICAIN, 'telephone'),
          ...telephonesInternationaux(texte),
        ]
      : []),
    ...occurrencesIdentifiants(texte, config.identifiants),
    ...occurrencesTermes(texte, config.termes),
  ]

  // Le motif qui commence le premier l'emporte, et le plus long à égalité. Le
  // texte est lu une seule fois : ce qu'on vient de poser n'est jamais remasqué.
  toutes.sort((a, b) => a.debut - b.debut || b.fin - b.debut - (a.fin - a.debut))

  const jetons = JETONS[langue]
  const remplacements: Record<Categorie, number> = {
    courriel: 0,
    telephone: 0,
    identifiant: 0,
    terme: 0,
  }
  let resultat = ''
  let curseur = 0
  for (const occurrence of toutes) {
    if (occurrence.debut < curseur) continue
    resultat += texte.slice(curseur, occurrence.debut) + jetons[occurrence.categorie]
    remplacements[occurrence.categorie] += 1
    curseur = occurrence.fin
  }
  return { texte: resultat + texte.slice(curseur), remplacements }
}
