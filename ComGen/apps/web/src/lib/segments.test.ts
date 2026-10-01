import { describe, expect, it } from 'vitest'

import { decouperEnSegments } from './segments'

describe('decouperEnSegments', () => {
  it('rend le texte intact, segment par segment', () => {
    const texte = 'Le service a été rétabli à 15h10. Aucune perte.'
    const segments = decouperEnSegments(texte, [
      { cle: 'F-01', debut: 0, fin: 33 },
      { cle: 'F-02', debut: 27, fin: 32 },
    ])
    expect(segments.map((s) => s.texte).join('')).toBe(texte)
    expect(segments.map((s) => [s.texte, s.couvrant, s.commencant])).toEqual([
      ['Le service a été rétabli à ', ['F-01'], ['F-01']],
      ['15h10', ['F-01', 'F-02'], ['F-02']],
      ['.', ['F-01'], []],
      [' Aucune perte.', [], []],
    ])
  })

  it('deux faits sur la même phrase partagent le segment et ont chacun leur ancre', () => {
    const segments = decouperEnSegments('abc', [
      { cle: 'F-01', debut: 0, fin: 3 },
      { cle: 'F-02', debut: 0, fin: 3 },
    ])
    expect(segments).toEqual([
      { texte: 'abc', debut: 0, couvrant: ['F-01', 'F-02'], commencant: ['F-01', 'F-02'] },
    ])
  })

  it('ignore une plage incohérente plutôt que de déformer le texte', () => {
    expect(decouperEnSegments('abc', [{ cle: 'x', debut: 2, fin: 10 }])).toEqual([
      { texte: 'abc', debut: 0, couvrant: [], commencant: [] },
    ])
  })
})
