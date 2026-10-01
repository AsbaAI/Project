/**
 * Injection des valeurs (spécification §2, §10 — contrainte cardinale).
 *
 * « Nombres, dates, versions, identifiants, noms propres ne sont jamais
 * écrits par un modèle : le rédacteur émet des références de faits, la
 * valeur est injectée par du code, puis revérifiée par comparaison de
 * chaînes hors de tout appel de modèle. »
 *
 * Ce fichier est ce code-là. Il tient deux gardes, et les deux sont des
 * fonctions pures, sans modèle :
 *
 *  1. **Un segment de texte libre ne doit contenir aucune valeur.** Si le
 *     rédacteur a écrit « 4.2 » au lieu d'émettre `F-02`, l'injection
 *     échoue. C'est l'interdit central : une valeur écrite par un modèle
 *     n'a pas été vérifiée et ne le sera jamais, puisque rien ne la relie
 *     plus à une citation. La détection réemploie `proposerFaitsCandidats`,
 *     le même balayage que l'extraction — ce qu'un côté sait relever,
 *     l'autre sait le refuser.
 *  2. **Une référence ne s'invente pas.** Référence inconnue, fait sans
 *     valeur, valeur intransposable : échec explicite, jamais de repli.
 *
 * `verifierValeursInjectees` est la seconde lecture, faite sur le texte
 * final : elle ne corrige rien, elle dit ce qui manque.
 */

import type { TypeValeur } from './enumerations.ts'
import { proposerFaitsCandidats } from './faits-candidats.ts'
import type { LangueDetectable } from './langue.ts'

/** Ce que l'injection a besoin de savoir d'un fait. */
export interface FaitInjectable {
  /** `F-01`, telle qu'affichée dans la fiche de faits. */
  reference: string
  /** Recopiée mot pour mot de la source ; `null` pour un fait sans valeur. */
  valeur: string | null
  typeValeur: TypeValeur | null
  citation: string
  langueSource: LangueDetectable
}

/**
 * Ce qu'un rédacteur a le droit d'émettre : du texte sans valeur, et des
 * références. Il n'y a pas de troisième forme — c'est la structure
 * elle-même qui rend l'erreur factuelle impossible.
 */
export type SegmentRedige =
  { type: 'texte'; texte: string } | { type: 'reference'; reference: string }

export type MotifRefusInjection =
  'VALEUR_DANS_TEXTE_LIBRE' | 'REFERENCE_INCONNUE' | 'FAIT_SANS_VALEUR' | 'VALEUR_NON_TRANSPOSABLE'

export type ResultatInjection =
  | { ok: true; texte: string; referencesUtilisees: readonly string[] }
  | { ok: false; motif: MotifRefusInjection; detail: string }

const MOIS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const

const MOIS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/** Variantes acceptées à la lecture : accents et abréviations courantes. */
const LECTURE_MOIS: Readonly<Record<string, number>> = Object.fromEntries([
  ...MOIS_FR.flatMap((nom, index) => [
    [nom, index],
    [nom.normalize('NFD').replace(/\p{Diacritic}/gu, ''), index],
  ]),
  ...MOIS_EN.map((nom, index) => [nom.toLowerCase(), index]),
])

interface DateLue {
  jour: number
  mois: number
  annee: number
}

/** Relit une date écrite ; `null` dès que la forme n'est pas reconnue. */
function lireDate(valeur: string): DateLue | null {
  const nettoyee = valeur.trim()

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(nettoyee)
  if (iso?.[1] !== undefined && iso[2] !== undefined && iso[3] !== undefined) {
    return { annee: Number(iso[1]), mois: Number(iso[2]) - 1, jour: Number(iso[3]) }
  }

  // « 12 mars 2026 », « 1er mars 2026 », « 12 March 2026 »
  const longue = /^(\d{1,2})(?:er)?\s+(\p{L}+)\s+(\d{4})$/u.exec(nettoyee)
  if (longue?.[1] !== undefined && longue[2] !== undefined && longue[3] !== undefined) {
    const mois = LECTURE_MOIS[longue[2].toLowerCase()]
    if (mois !== undefined) {
      return { jour: Number(longue[1]), mois, annee: Number(longue[3]) }
    }
  }

  // « March 12, 2026 »
  const anglaise = /^(\p{L}+)\s+(\d{1,2}),\s*(\d{4})$/u.exec(nettoyee)
  if (anglaise?.[1] !== undefined && anglaise[2] !== undefined && anglaise[3] !== undefined) {
    const mois = LECTURE_MOIS[anglaise[1].toLowerCase()]
    if (mois !== undefined) {
      return { jour: Number(anglaise[2]), mois, annee: Number(anglaise[3]) }
    }
  }

  return null
}

/** Écriture canonique d'une date dans la langue cible : une seule admise. */
function ecrireDate(date: DateLue, langue: LangueDetectable): string | null {
  if (date.mois < 0 || date.mois > 11) return null
  if (langue === 'fr') {
    const jour = date.jour === 1 ? '1er' : String(date.jour)
    return `${jour} ${MOIS_FR[date.mois] ?? ''} ${date.annee}`
  }
  return `${date.jour} ${MOIS_EN[date.mois] ?? ''} ${date.annee}`
}

/**
 * Relit un nombre écrit à la française ou à l'anglaise. On ne tolère que ce
 * qu'on sait relire sans ambiguïté : « 1,500 » vaut mille cinq cents en
 * anglais et un virgule cinq en français, donc une valeur qui mélange les
 * deux conventions est refusée plutôt que devinée.
 */
function lireNombre(valeur: string, langue: LangueDetectable): number | null {
  const nettoyee = valeur.trim()
  if (!/^[\d\s  .,]+$/u.test(nettoyee)) return null
  const sansEspaces = nettoyee.replace(/[\s  ]/gu, '')
  const normalisee =
    langue === 'fr' ? sansEspaces.replace(/,/gu, '.') : sansEspaces.replace(/,/gu, '')
  if (!/^\d+(?:\.\d+)?$/u.test(normalisee)) return null
  const nombre = Number(normalisee)
  return Number.isFinite(nombre) ? nombre : null
}

function ecrireNombre(nombre: number, langue: LangueDetectable): string {
  // Espace insécable étroit en français, virgule en anglais : une seule
  // écriture par langue, celle que la locale impose.
  return nombre.toLocaleString(langue === 'fr' ? 'fr-FR' : 'en-GB').replace(/ /gu, ' ')
}

/**
 * Valeur à écrire dans la langue cible.
 *
 * Même langue : la chaîne de la source, toujours. Langue différente :
 * `VERSION`, `IDENTIFIANT` et `NOM` restent identiques — une version
 * traduite n'est plus la version ; `DATE` et `NOMBRE` passent à l'écriture
 * canonique de la cible, et à elle seule. Ce qu'on ne sait pas relire
 * bloque.
 */
function valeurPour(fait: FaitInjectable, langueCible: LangueDetectable): string | null {
  const valeur = fait.valeur
  if (valeur === null) return null
  if (langueCible === fait.langueSource) return valeur

  switch (fait.typeValeur) {
    case 'DATE': {
      const lue = lireDate(valeur)
      return lue === null ? null : ecrireDate(lue, langueCible)
    }
    case 'NOMBRE': {
      const lu = lireNombre(valeur, fait.langueSource)
      return lu === null ? null : ecrireNombre(lu, langueCible)
    }
    default:
      return valeur
  }
}

export function injecter(
  segments: readonly SegmentRedige[],
  faits: readonly FaitInjectable[],
  langueCible: LangueDetectable,
): ResultatInjection {
  const parReference = new Map(faits.map((fait) => [fait.reference, fait]))
  const morceaux: string[] = []
  const utilisees: string[] = []

  for (const segment of segments) {
    if (segment.type === 'texte') {
      const candidats = proposerFaitsCandidats(segment.texte)
      const premier = candidats[0]
      if (premier !== undefined) {
        return {
          ok: false,
          motif: 'VALEUR_DANS_TEXTE_LIBRE',
          detail:
            `Le texte libre contient « ${premier.valeur} » (${premier.typeValeur}) : ` +
            'une valeur ne s’écrit pas, elle se référence.',
        }
      }
      morceaux.push(segment.texte)
      continue
    }

    const fait = parReference.get(segment.reference)
    if (fait === undefined) {
      return {
        ok: false,
        motif: 'REFERENCE_INCONNUE',
        detail: `La référence ${segment.reference} ne figure pas dans la fiche de faits.`,
      }
    }
    if (fait.valeur === null) {
      return {
        ok: false,
        motif: 'FAIT_SANS_VALEUR',
        detail: `Le fait ${segment.reference} ne porte aucune valeur : il n’y a rien à injecter.`,
      }
    }
    const valeur = valeurPour(fait, langueCible)
    if (valeur === null) {
      return {
        ok: false,
        motif: 'VALEUR_NON_TRANSPOSABLE',
        detail:
          `La valeur « ${fait.valeur} » du fait ${segment.reference} ne peut pas être réécrite ` +
          `en « ${langueCible} » sans risque d’erreur.`,
      }
    }
    morceaux.push(valeur)
    if (!utilisees.includes(segment.reference)) utilisees.push(segment.reference)
  }

  return { ok: true, texte: morceaux.join(''), referencesUtilisees: utilisees }
}

export interface ValeurAttendue {
  reference: string
  attendue: string
}

export interface RapportValeurs {
  conforme: boolean
  manquantes: readonly ValeurAttendue[]
}

/**
 * Seconde lecture, sur le texte final : chaque valeur attendue y figure-t-elle
 * mot pour mot ? Comparaison de chaînes, hors de tout appel de modèle. Elle
 * ne corrige rien — elle dit ce qui manque, et c'est le blocage qui décide.
 */
export function verifierValeursInjectees(
  texteFinal: string,
  attendues: readonly ValeurAttendue[],
): RapportValeurs {
  const manquantes = attendues.filter((valeur) => !texteFinal.includes(valeur.attendue))
  return { conforme: manquantes.length === 0, manquantes }
}
