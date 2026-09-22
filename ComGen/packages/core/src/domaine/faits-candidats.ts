import type { TypeValeur } from './enumerations.ts'
import type { LocalisationCitation } from './sources.ts'

/**
 * Candidats de faits déterministes (spécification §2, §10).
 *
 * Avant tout agent, le texte d'une source est balayé pour en relever les
 * valeurs qu'un modèle n'a jamais le droit d'écrire : identifiants,
 * versions, dates et heures, nombres avec unité. Chaque candidat cite la
 * phrase entière qui le contient, mot pour mot ; l'énoncé EST la citation —
 * on ne paraphrase pas, le relecteur reformule s'il le souhaite.
 *
 * Fonction pure, sans modèle. L'EXTRACTEUR (lot 3) complète cette liste
 * avec des faits sémantiques ; il ne la remplace pas.
 */

export interface FaitCandidat {
  enonce: string
  valeur: string
  typeValeur: Exclude<TypeValeur, 'TEXTE' | 'NOM'>
  citation: string
  localisation: Required<Pick<LocalisationCitation, 'offsetDebut' | 'offsetFin' | 'ligne'>>
  confiance: number
}

interface Motif {
  type: FaitCandidat['typeValeur']
  expression: RegExp
  /** Plus petit = prioritaire quand deux motifs se chevauchent. */
  priorite: number
  confiance: number
}

const MOIS_FR =
  '(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)'
const MOIS_EN =
  '(?:January|February|March|April|May|June|July|August|September|October|November|December)'
const JOUR_FR = '(?:(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) )?'
const UNITES =
  '(?:%|minutes?|min|heures?|h|jours?|semaines?|mois|secondes?|ms|Mio|Gio|Tio|Mo|Go|To|€|EUR|USD|£|GBP|CAD|utilisateurs?|clients?|sites?|requêtes?|requests?|users?|customers?|hours?|minutes?|days?|weeks?|seconds?)'

const MOTIFS: readonly Motif[] = [
  {
    type: 'DATE',
    priorite: 0,
    confiance: 0.7,
    expression: new RegExp(
      [
        String.raw`\b\d{4}-\d{2}-\d{2}\b`,
        String.raw`\b\d{1,2}[/.]\d{1,2}[/.]\d{4}\b`,
        String.raw`\b${JOUR_FR}\d{1,2}(?:er)? ${MOIS_FR} \d{4}\b`,
        String.raw`\b${MOIS_EN} \d{1,2}, \d{4}\b`,
        String.raw`\b\d{1,2} ${MOIS_EN} \d{4}\b`,
        String.raw`\b\d{1,2}h\d{2}\b`,
        String.raw`\b\d{1,2}:\d{2}(?::\d{2})?\b`,
      ].join('|'),
      'giu',
    ),
  },
  {
    type: 'IDENTIFIANT',
    priorite: 1,
    confiance: 0.7,
    expression: /\b[A-Z][A-Z0-9]{1,7}-\d{2,}(?:-\d+)*\b/gu,
  },
  {
    type: 'VERSION',
    priorite: 2,
    confiance: 0.7,
    expression: /\bv?\d+\.\d+(?:\.\d+)*\b/gu,
  },
  {
    type: 'NOMBRE',
    priorite: 3,
    confiance: 0.5,
    expression: new RegExp(
      String.raw`\b\d+(?:[   ]\d{3})*(?:[.,]\d+)?[   ]?${UNITES}(?![\p{L}])`,
      'gu',
    ),
  },
]

interface Occurrence {
  motif: Motif
  valeur: string
  debut: number
  fin: number
}

interface Phrase {
  texte: string
  debut: number
}

/** Découpe en phrases : fin de ligne, ou ponctuation finale suivie d'une majuscule, d'un chiffre ou d'un guillemet. */
function decouperEnPhrases(texte: string): Phrase[] {
  const phrases: Phrase[] = []
  const separateur = /\n+|(?<=[.!?])\s+(?=[\p{Lu}\d«"(])/gu
  let debut = 0
  for (const coupure of texte.matchAll(separateur)) {
    ajouterPhrase(phrases, texte, debut, coupure.index)
    debut = coupure.index + coupure[0].length
  }
  ajouterPhrase(phrases, texte, debut, texte.length)
  return phrases
}

function ajouterPhrase(phrases: Phrase[], texte: string, debut: number, fin: number): void {
  const brut = texte.slice(debut, fin)
  const decalage = brut.length - brut.trimStart().length
  const propre = brut.trim()
  if (propre.length > 0) phrases.push({ texte: propre, debut: debut + decalage })
}

function occurrencesDe(phrase: Phrase): Occurrence[] {
  const occurrences: Occurrence[] = []
  for (const motif of MOTIFS) {
    for (const correspondance of phrase.texte.matchAll(motif.expression)) {
      occurrences.push({
        motif,
        valeur: correspondance[0],
        debut: phrase.debut + correspondance.index,
        fin: phrase.debut + correspondance.index + correspondance[0].length,
      })
    }
  }
  return occurrences
}

/** Deux occurrences qui se chevauchent : la plus prioritaire gagne, puis la plus longue. */
function sansChevauchement(occurrences: Occurrence[]): Occurrence[] {
  const triees = occurrences.toSorted(
    (a, b) => a.motif.priorite - b.motif.priorite || b.fin - b.debut - (a.fin - a.debut),
  )
  const retenues: Occurrence[] = []
  for (const occurrence of triees) {
    const chevauche = retenues.some((r) => occurrence.debut < r.fin && r.debut < occurrence.fin)
    if (!chevauche) retenues.push(occurrence)
  }
  return retenues.toSorted((a, b) => a.debut - b.debut)
}

function numeroDeLigne(texte: string, offset: number): number {
  let ligne = 1
  for (let i = 0; i < offset; i += 1) {
    if (texte.charCodeAt(i) === 10) ligne += 1
  }
  return ligne
}

export function proposerFaitsCandidats(contenuTexte: string): FaitCandidat[] {
  const candidats: FaitCandidat[] = []
  for (const phrase of decouperEnPhrases(contenuTexte)) {
    const localisation = {
      offsetDebut: phrase.debut,
      offsetFin: phrase.debut + phrase.texte.length,
      ligne: numeroDeLigne(contenuTexte, phrase.debut),
    }
    for (const occurrence of sansChevauchement(occurrencesDe(phrase))) {
      candidats.push({
        enonce: phrase.texte,
        valeur: occurrence.valeur,
        typeValeur: occurrence.motif.type,
        citation: phrase.texte,
        localisation,
        confiance: occurrence.motif.confiance,
      })
    }
  }
  return candidats
}
