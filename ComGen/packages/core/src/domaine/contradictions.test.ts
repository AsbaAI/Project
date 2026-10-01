import { describe, expect, it } from 'vitest'

import { type FaitComparable, detecterContradictions, normaliserEnonce } from './contradictions.ts'

function fait(partiel: Partial<FaitComparable> & { id: string }): FaitComparable {
  return {
    enonce: 'Heure de rétablissement du service',
    typeValeur: 'DATE',
    valeur: '15h10',
    statut: 'CONFIRME',
    sourceId: `source-${partiel.id}`,
    citation: `citation de ${partiel.id}`,
    ...partiel,
  }
}

describe('detecterContradictions', () => {
  it('signale deux faits vivants de même énoncé et de valeurs différentes', () => {
    const resultat = detecterContradictions([
      fait({ id: 'a', valeur: '15h10' }),
      fait({ id: 'b', valeur: '14h52', statut: 'PROPOSE' }),
    ])
    expect(resultat).toHaveLength(1)
    expect(resultat[0]?.faits.map((f) => f.id)).toEqual(['a', 'b'])
    expect(resultat[0]?.valeurs).toEqual(['15h10', '14h52'])
  })

  it('ignore les faits retirés et périmés : retirer un fait tranche la contradiction', () => {
    expect(
      detecterContradictions([
        fait({ id: 'a', valeur: '15h10' }),
        fait({ id: 'b', valeur: '14h52', statut: 'RETIRE' }),
      ]),
    ).toEqual([])
    expect(
      detecterContradictions([
        fait({ id: 'a', valeur: '15h10' }),
        fait({ id: 'b', valeur: '14h52', statut: 'PERIME' }),
      ]),
    ).toEqual([])
  })

  it('ne signale rien quand les valeurs sont identiques (amendement qui rejoint l’autre fait)', () => {
    expect(
      detecterContradictions([fait({ id: 'a' }), fait({ id: 'b', statut: 'DECLARE' })]),
    ).toEqual([])
  })

  it('compare les énoncés à la casse, aux blancs et à la ponctuation finale près', () => {
    const resultat = detecterContradictions([
      fait({ id: 'a', enonce: 'Heure de rétablissement du service.' }),
      fait({ id: 'b', enonce: '  heure  de rétablissement du SERVICE', valeur: '14h52' }),
    ])
    expect(resultat).toHaveLength(1)
    expect(resultat[0]?.enonce).toBe('heure de rétablissement du service')
  })

  it('distingue deux types de valeur, même à énoncé identique', () => {
    expect(
      detecterContradictions([
        fait({ id: 'a', enonce: 'Référence', typeValeur: 'IDENTIFIANT', valeur: 'INC-2026-0187' }),
        fait({ id: 'b', enonce: 'Référence', typeValeur: 'NOMBRE', valeur: '187' }),
      ]),
    ).toEqual([])
  })

  it('ignore les faits sans valeur et ne rapproche pas des énoncés différents', () => {
    expect(
      detecterContradictions([
        fait({ id: 'a', valeur: null }),
        fait({ id: 'b', valeur: null }),
        fait({ id: 'c', enonce: 'Début de l’incident', valeur: '13h42' }),
      ]),
    ).toEqual([])
  })

  it('regroupe trois faits en désaccord dans une seule contradiction', () => {
    const resultat = detecterContradictions([
      fait({ id: 'a', valeur: '15h10' }),
      fait({ id: 'b', valeur: '14h52' }),
      fait({ id: 'c', valeur: '15h10' }),
      fait({ id: 'd', valeur: '16h00' }),
    ])
    expect(resultat).toHaveLength(1)
    expect(resultat[0]?.faits).toHaveLength(4)
    expect(resultat[0]?.valeurs).toEqual(['15h10', '14h52', '16h00'])
  })
})

describe('detecterContradictions — valeurs d’une même citation', () => {
  it('deux valeurs tirées de la même phrase ne se contredisent pas', () => {
    const phrase = 'Fenêtre : mercredi 14 octobre 2026 de 22h00 à 02h00.'
    expect(
      detecterContradictions([
        fait({ id: 'a', enonce: phrase, valeur: '22h00', sourceId: 's', citation: phrase }),
        fait({ id: 'b', enonce: phrase, valeur: '02h00', sourceId: 's', citation: phrase }),
      ]),
    ).toEqual([])
  })

  it('la même citation dans deux sources différentes peut se contredire', () => {
    const resultat = detecterContradictions([
      fait({ id: 'a', valeur: '15h10', sourceId: 's1', citation: 'rétabli à 15h10' }),
      fait({ id: 'b', valeur: '14h52', sourceId: 's2', citation: 'rétabli à 15h10' }),
    ])
    expect(resultat).toHaveLength(1)
  })

  it('un troisième fait d’une autre citation suffit à révéler le désaccord', () => {
    const resultat = detecterContradictions([
      fait({ id: 'a', valeur: '22h00', sourceId: 's', citation: 'phrase' }),
      fait({ id: 'b', valeur: '02h00', sourceId: 's', citation: 'phrase' }),
      fait({ id: 'c', valeur: '22h00', sourceId: 't', citation: 'autre phrase' }),
    ])
    expect(resultat).toHaveLength(1)
    expect(resultat[0]?.faits.map((f) => f.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('normaliserEnonce', () => {
  it('réduit les blancs, abaisse la casse et retire la ponctuation finale', () => {
    expect(normaliserEnonce('  Version   cible : ')).toBe('version cible')
  })
})
