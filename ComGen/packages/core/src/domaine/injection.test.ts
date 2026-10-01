import { describe, expect, it } from 'vitest'

import type { FaitInjectable, SegmentRedige } from './injection.ts'
import { injecter, verifierValeursInjectees } from './injection.ts'

const FAITS: FaitInjectable[] = [
  {
    reference: 'F-01',
    valeur: '12 mars 2026',
    typeValeur: 'DATE',
    citation: 'La migration aura lieu le 12 mars 2026.',
    langueSource: 'fr',
  },
  {
    reference: 'F-02',
    valeur: '4.2',
    typeValeur: 'VERSION',
    citation: 'Le portail passe en version 4.2.',
    langueSource: 'fr',
  },
  {
    reference: 'F-03',
    valeur: '4 500',
    typeValeur: 'NOMBRE',
    citation: 'Le service concerne 4 500 utilisateurs.',
    langueSource: 'fr',
  },
  {
    reference: 'F-04',
    valeur: 'INC-2026-0187',
    typeValeur: 'IDENTIFIANT',
    citation: 'Le ticket INC-2026-0187 suit l’incident.',
    langueSource: 'fr',
  },
]

function texte(valeur: string): SegmentRedige {
  return { type: 'texte', texte: valeur }
}
function ref(reference: string): SegmentRedige {
  return { type: 'reference', reference }
}

describe('injecter', () => {
  it('écrit la valeur de la source, mot pour mot, à la place de la référence', () => {
    const resultat = injecter(
      [texte('La migration est prévue le '), ref('F-01'), texte('.')],
      FAITS,
      'fr',
    )

    expect(resultat.ok).toBe(true)
    if (!resultat.ok) return
    expect(resultat.texte).toBe('La migration est prévue le 12 mars 2026.')
    expect(resultat.referencesUtilisees).toEqual(['F-01'])
  })

  it('refuse un segment libre qui contient lui-même une valeur', () => {
    // C'est l'interdit central : si le rédacteur a écrit « 4.2 » au lieu
    // d'émettre F-02, la valeur n'a pas été vérifiée et ne le sera jamais.
    const resultat = injecter([texte('Le portail passe en version 4.2.')], FAITS, 'fr')

    expect(resultat.ok).toBe(false)
    if (resultat.ok) return
    expect(resultat.motif).toBe('VALEUR_DANS_TEXTE_LIBRE')
    expect(resultat.detail).toContain('4.2')
  })

  it.each([
    ['une date', 'Le 12 mars 2026, tout change.'],
    ['un nombre avec unité', 'Environ 4 500 utilisateurs sont concernés.'],
    ['un identifiant', 'Voir le ticket INC-2026-0187.'],
    ['une version', 'La version 4.2 arrive.'],
  ])('refuse %s écrite à la main dans un segment libre', (_, phrase) => {
    const resultat = injecter([texte(phrase)], FAITS, 'fr')
    expect(resultat.ok).toBe(false)
  })

  it('refuse une référence que la fiche de faits ne contient pas', () => {
    const resultat = injecter([texte('Prévu le '), ref('F-99')], FAITS, 'fr')

    expect(resultat.ok).toBe(false)
    if (resultat.ok) return
    expect(resultat.motif).toBe('REFERENCE_INCONNUE')
    expect(resultat.detail).toContain('F-99')
  })

  it('refuse une référence vers un fait sans valeur : il n’y a rien à injecter', () => {
    const sansValeur: FaitInjectable = {
      reference: 'F-05',
      valeur: null,
      typeValeur: null,
      citation: 'Le service sera rétabli dès que possible.',
      langueSource: 'fr',
    }
    const resultat = injecter([ref('F-05')], [...FAITS, sansValeur], 'fr')

    expect(resultat.ok).toBe(false)
    if (resultat.ok) return
    expect(resultat.motif).toBe('FAIT_SANS_VALEUR')
  })

  it('laisse passer un texte libre qui ne contient aucune valeur', () => {
    const resultat = injecter(
      [texte('Bonjour à toutes et à tous, voici le point de la semaine.')],
      FAITS,
      'fr',
    )
    expect(resultat.ok).toBe(true)
  })
})

describe('injecter — vers une autre langue', () => {
  it('recopie identiquement une version, un identifiant ou un nom', () => {
    const resultat = injecter([texte('Version '), ref('F-02')], FAITS, 'en')

    expect(resultat.ok).toBe(true)
    if (!resultat.ok) return
    expect(resultat.texte).toBe('Version 4.2')
  })

  it('réécrit une date dans la seule écriture admise de la langue cible', () => {
    const resultat = injecter([ref('F-01')], FAITS, 'en')

    expect(resultat.ok).toBe(true)
    if (!resultat.ok) return
    expect(resultat.texte).toBe('12 March 2026')
  })

  it('réécrit un nombre dans la seule écriture admise de la langue cible', () => {
    const resultat = injecter([ref('F-03')], FAITS, 'en')

    expect(resultat.ok).toBe(true)
    if (!resultat.ok) return
    expect(resultat.texte).toBe('4,500')
  })

  it('bloque plutôt que de deviner une date qu’elle ne sait pas relire', () => {
    const obscur: FaitInjectable = {
      reference: 'F-06',
      valeur: 'la Saint-Jean',
      typeValeur: 'DATE',
      citation: 'La bascule aura lieu à la Saint-Jean.',
      langueSource: 'fr',
    }
    const resultat = injecter([ref('F-06')], [obscur], 'en')

    expect(resultat.ok).toBe(false)
    if (resultat.ok) return
    expect(resultat.motif).toBe('VALEUR_NON_TRANSPOSABLE')
  })
})

describe('verifierValeursInjectees', () => {
  it('confirme que chaque valeur attendue figure mot pour mot dans le texte final', () => {
    const rapport = verifierValeursInjectees(
      'La migration est prévue le 12 mars 2026, en version 4.2.',
      [
        { reference: 'F-01', attendue: '12 mars 2026' },
        { reference: 'F-02', attendue: '4.2' },
      ],
    )

    expect(rapport.conforme).toBe(true)
    expect(rapport.manquantes).toEqual([])
  })

  it('dénonce une valeur absente du texte final, sans rien corriger', () => {
    const rapport = verifierValeursInjectees('La migration est prévue le 13 mars 2026.', [
      { reference: 'F-01', attendue: '12 mars 2026' },
    ])

    expect(rapport.conforme).toBe(false)
    expect(rapport.manquantes).toEqual([{ reference: 'F-01', attendue: '12 mars 2026' }])
  })
})
