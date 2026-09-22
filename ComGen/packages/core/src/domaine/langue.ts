/**
 * Détection de la langue d'une source (spécification §13.1 : la langue
 * détectée est stockée sur `Source`, la fiche de faits n'est jamais
 * traduite).
 *
 * Méthode volontairement simple et déterministe : fréquence de mots-outils
 * très courants, propres à chaque langue. Elle ne tranche que lorsque le
 * signal est net ; sinon elle rend `null` et l'utilisateur choisit — on ne
 * devine pas (§2).
 */

export const LANGUES_DETECTABLES = ['fr', 'en'] as const
export type LangueDetectable = (typeof LANGUES_DETECTABLES)[number]

const MOTS_OUTILS: Readonly<Record<LangueDetectable, ReadonlySet<string>>> = {
  fr: new Set([
    'le',
    'la',
    'les',
    'des',
    'du',
    'de',
    'un',
    'une',
    'et',
    'est',
    'à',
    'au',
    'aux',
    'pour',
    'dans',
    'sur',
    'avec',
    'que',
    'qui',
    'ne',
    'pas',
    'ce',
    'cette',
    'ces',
    'nous',
    'vous',
    'sera',
    'sont',
    'ou',
    'par',
    'en',
    'se',
    'il',
    'elle',
    'leur',
    'leurs',
  ]),
  en: new Set([
    'the',
    'and',
    'is',
    'are',
    'to',
    'of',
    'in',
    'for',
    'on',
    'with',
    'that',
    'this',
    'will',
    'be',
    'from',
    'by',
    'at',
    'as',
    'it',
    'we',
    'you',
    'or',
    'not',
    'an',
    'has',
    'have',
    'was',
    'were',
    'their',
    'its',
  ]),
}

/** Score minimal et écart minimal pour trancher. */
const SCORE_MINIMAL = 3
const RAPPORT_MINIMAL = 2

export function detecterLangue(texte: string): LangueDetectable | null {
  const mots = texte
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((mot) => mot.length > 0)

  const scores = LANGUES_DETECTABLES.map((langue) => {
    const outils = MOTS_OUTILS[langue]
    return { langue, score: mots.filter((mot) => outils.has(mot)).length }
  }).toSorted((a, b) => b.score - a.score)

  const [premier, second] = scores
  if (premier === undefined || second === undefined) return null
  if (premier.score < SCORE_MINIMAL) return null
  if (premier.score < second.score * RAPPORT_MINIMAL) return null
  return premier.langue
}
