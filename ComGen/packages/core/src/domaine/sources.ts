/**
 * Texte des sources et citations (spécification §2, §6).
 *
 * La normalisation est volontairement minimale : elle rend l'empreinte
 * stable face aux artefacts d'extraction (fins de ligne, blancs de fin,
 * forme Unicode) sans jamais réécrire le contenu. Les espaces insécables,
 * les séparateurs de nombres, la casse restent ceux de la source : une
 * citation est un extrait mot pour mot, la comparaison est stricte.
 */

export function normaliserTexteSource(texte: string): string {
  return texte
    .normalize('NFC')
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((ligne) => ligne.replace(/[ \t\f\v]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '')
}

export interface LocalisationCitation {
  offsetDebut: number
  offsetFin: number
  ligne?: number
  page?: number
}

export type ResultatCitation =
  | { valide: true }
  | { valide: false; motif: 'CITATION_VIDE' | 'CITATION_ABSENTE' | 'LOCALISATION_INCOHERENTE' }

/**
 * Une citation est valide si elle apparaît telle quelle dans le texte
 * normalisé de la source et, quand des offsets sont fournis, si elle s'y
 * trouve exactement à ces offsets.
 */
export function verifierCitation(
  contenuTexte: string,
  citation: string,
  localisation?: Pick<LocalisationCitation, 'offsetDebut' | 'offsetFin'>,
): ResultatCitation {
  if (citation.trim().length === 0) return { valide: false, motif: 'CITATION_VIDE' }
  if (!contenuTexte.includes(citation)) return { valide: false, motif: 'CITATION_ABSENTE' }
  if (localisation) {
    const { offsetDebut, offsetFin } = localisation
    if (
      !Number.isInteger(offsetDebut) ||
      !Number.isInteger(offsetFin) ||
      offsetFin - offsetDebut !== citation.length ||
      contenuTexte.slice(offsetDebut, offsetFin) !== citation
    ) {
      return { valide: false, motif: 'LOCALISATION_INCOHERENTE' }
    }
  }
  return { valide: true }
}

/** Première occurrence de la citation ; ligne numérotée à partir de 1. */
export function localiserCitation(
  contenuTexte: string,
  citation: string,
): Required<Pick<LocalisationCitation, 'offsetDebut' | 'offsetFin' | 'ligne'>> | null {
  if (citation.length === 0) return null
  const offsetDebut = contenuTexte.indexOf(citation)
  if (offsetDebut < 0) return null
  let ligne = 1
  for (let i = 0; i < offsetDebut; i += 1) {
    if (contenuTexte.charCodeAt(i) === 10) ligne += 1
  }
  return { offsetDebut, offsetFin: offsetDebut + citation.length, ligne }
}
