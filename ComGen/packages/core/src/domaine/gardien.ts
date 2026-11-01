import { NIVEAUX, type Niveau } from './enumerations.ts'

/**
 * GARDIEN : les garde-fous d'un persona, appliqués par du CODE.
 *
 * Aucun modèle ne juge ici : ce que le persona interdit est une liste, et
 * une liste se vérifie par comparaison de chaînes. Trois contrôles, tous
 * bloquants — en cas de doute l'application bloque et explique :
 *
 *  - un terme du lexique interdit, présent dans le texte (mot entier, sans
 *    tenir compte de la casse ni des accents) ;
 *  - un sujet interdit, présent LITTÉRALEMENT dans le texte. Limite assumée :
 *    on ne détecte pas une paraphrase, seulement la formule listée ;
 *  - un fait cité dont le niveau de confidentialité dépasse le maximum du
 *    persona : il ne doit pas figurer dans ce texte, quelle que soit sa
 *    formulation.
 *
 * Une configuration illisible n'est pas ignorée : `lireGardeFous` renvoie
 * `null`, et l'appelant bloque.
 */

export interface GardeFousPersona {
  interdits: readonly string[]
  sujetsInterdits: readonly string[]
  confidentialiteMax: Niveau
}

export interface FaitCite {
  reference: string
  confidentialite: Niveau
}

export interface ConstatGardien {
  type: 'TON' | 'CONFIDENTIALITE_PERSONA'
  message: string
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
}

function listeDeChaines(valeur: unknown): string[] | null {
  if (!Array.isArray(valeur)) return null
  return valeur.every((v) => typeof v === 'string') ? (valeur as string[]) : null
}

/**
 * Lit la configuration d'un persona : `lexique.<langue>.interdits` et
 * `gardeFous.{sujetsInterdits, confidentialiteMax}`. Mal formée : `null`.
 * Une règle absente n'interdit rien (pas de plafond de confidentialité si
 * `confidentialiteMax` manque) — c'est une absence de règle, pas une règle
 * illisible.
 */
export function lireGardeFous(
  lexique: unknown,
  gardeFous: unknown,
  langue: 'fr' | 'en',
): GardeFousPersona | null {
  if (!estObjet(lexique) || !estObjet(gardeFous)) return null
  // Une clé ABSENTE est une absence de règle ; une clé présente et mal
  // formée est une configuration illisible, qui bloque.
  const sujets =
    gardeFous['sujetsInterdits'] === undefined ? [] : listeDeChaines(gardeFous['sujetsInterdits'])
  const brutMax = gardeFous['confidentialiteMax']
  const max = brutMax === undefined ? 'SECRET' : NIVEAUX.find((n) => n === brutMax)
  if (sujets === null || max === undefined) return null

  const entree = lexique[langue]
  let interdits: string[] = []
  if (entree !== undefined) {
    if (!estObjet(entree)) return null
    const lus = listeDeChaines(entree['interdits'])
    if (lus === null) return null
    interdits = lus
  }
  return { interdits, sujetsInterdits: sujets, confidentialiteMax: max }
}

/** Minuscules, sans accents, espaces unifiés : la forme sous laquelle on compare. */
function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replaceAll(/\p{M}/gu, '')
    .toLocaleLowerCase()
    .replaceAll(/\s+/gu, ' ')
    .trim()
}

function echapper(texte: string): string {
  return texte.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`)
}

/** Mot entier : ni précédé ni suivi d'une lettre ou d'un chiffre. */
function contientMotEntier(texteNormalise: string, terme: string): boolean {
  const motif = new RegExp(String.raw`(?<![\p{L}\p{N}])${echapper(terme)}(?![\p{L}\p{N}])`, 'u')
  return motif.test(texteNormalise)
}

export function gardien(
  texte: string,
  gardeFous: GardeFousPersona,
  faitsCites: readonly FaitCite[],
): ConstatGardien[] {
  const constats: ConstatGardien[] = []
  const comparable = normaliser(texte)

  for (const brut of gardeFous.interdits) {
    const terme = normaliser(brut)
    if (terme === '') continue
    if (contientMotEntier(comparable, terme)) {
      constats.push({ type: 'TON', message: `Terme interdit pour ce persona : « ${brut} ».` })
    }
  }
  for (const brut of gardeFous.sujetsInterdits) {
    const sujet = normaliser(brut)
    if (sujet === '') continue
    if (comparable.includes(sujet)) {
      constats.push({
        type: 'CONFIDENTIALITE_PERSONA',
        message: `Sujet interdit pour ce persona : « ${brut} ».`,
      })
    }
  }
  const plafond = NIVEAUX.indexOf(gardeFous.confidentialiteMax)
  const trop = [
    ...new Set(
      faitsCites
        .filter((fait) => NIVEAUX.indexOf(fait.confidentialite) > plafond)
        .map((fait) => fait.reference),
    ),
  ]
  if (trop.length > 0) {
    constats.push({
      type: 'CONFIDENTIALITE_PERSONA',
      message: `Faits plus confidentiels que ${gardeFous.confidentialiteMax} cités dans ce texte : ${trop.join(', ')}.`,
    })
  }
  return constats
}
