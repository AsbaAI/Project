import { describe, expect, it } from 'vitest'
import { localiserCitation, normaliserTexteSource, verifierCitation } from './sources.ts'

/*
 * Le texte d'une source est normalisé une fois, à la mise au coffre
 * (empreinte SHA-256 « du contenu normalisé », §6). Toute citation d'un
 * fait doit être un extrait mot pour mot de ce texte normalisé : c'est la
 * garantie de fond de la contrainte cardinale, vérifiée par comparaison de
 * chaînes, hors de tout modèle.
 */
describe('normaliserTexteSource', () => {
  it('unifie les fins de ligne et retire les blancs de fin de ligne', () => {
    expect(normaliserTexteSource('a  \r\nb\t\r\nc')).toBe('a\nb\nc')
  })

  it('retire la marque d’ordre des octets et les blancs terminaux', () => {
    expect(normaliserTexteSource('﻿texte\n\n\n')).toBe('texte')
  })

  it('compose en NFC pour que deux écritures du même caractère aient la même empreinte', () => {
    const decompose = 'été' // « été » en NFD
    expect(normaliserTexteSource(decompose)).toBe('été')
  })

  it('ne touche ni aux espaces insécables ni aux espaces internes : ils font partie de la source', () => {
    expect(normaliserTexteSource('1 234,56  unités')).toBe('1 234,56  unités')
  })

  it('réduit trois lignes vides consécutives ou plus à deux', () => {
    expect(normaliserTexteSource('a\n\n\n\nb')).toBe('a\n\nb')
  })

  it('est idempotente', () => {
    const texte = 'Version 4.2\r\n\r\nLivraison le 14 mars 2026.  \r\n'
    const une = normaliserTexteSource(texte)
    expect(normaliserTexteSource(une)).toBe(une)
  })
})

describe('verifierCitation', () => {
  const contenu = normaliserTexteSource(
    'Fiche de changement CHG-2026-0187\nLa version 4.2 sera déployée le 14 mars 2026 à 22 h.\nDurée prévue : 2 h.',
  )

  it('accepte une citation présente mot pour mot aux offsets annoncés', () => {
    const citation = 'La version 4.2 sera déployée le 14 mars 2026 à 22 h.'
    const debut = contenu.indexOf(citation)
    expect(
      verifierCitation(contenu, citation, {
        offsetDebut: debut,
        offsetFin: debut + citation.length,
      }),
    ).toEqual({ valide: true })
  })

  it('refuse une citation absente, même à un caractère près', () => {
    expect(verifierCitation(contenu, 'La version 4.2.0 sera déployée')).toEqual({
      valide: false,
      motif: 'CITATION_ABSENTE',
    })
  })

  it('refuse une citation vide', () => {
    expect(verifierCitation(contenu, '')).toEqual({ valide: false, motif: 'CITATION_VIDE' })
    expect(verifierCitation(contenu, '   ')).toEqual({ valide: false, motif: 'CITATION_VIDE' })
  })

  it('refuse des offsets qui ne pointent pas exactement sur la citation', () => {
    const citation = 'Durée prévue : 2 h.'
    const debut = contenu.indexOf(citation)
    expect(
      verifierCitation(contenu, citation, {
        offsetDebut: debut - 1,
        offsetFin: debut + citation.length,
      }),
    ).toEqual({ valide: false, motif: 'LOCALISATION_INCOHERENTE' })
  })

  it('ne normalise pas la citation à la place de l’appelant : la casse et les espaces comptent', () => {
    expect(verifierCitation(contenu, 'la version 4.2 sera déployée')).toEqual({
      valide: false,
      motif: 'CITATION_ABSENTE',
    })
    expect(verifierCitation(contenu, 'La version  4.2 sera déployée')).toEqual({
      valide: false,
      motif: 'CITATION_ABSENTE',
    })
  })

  it('localise une citation présente : offsets, ligne (1-based)', () => {
    expect(localiserCitation(contenu, 'Durée prévue : 2 h.')).toEqual({
      offsetDebut: contenu.indexOf('Durée'),
      offsetFin: contenu.length,
      ligne: 3,
    })
    expect(localiserCitation(contenu, 'absente')).toBeNull()
  })
})
