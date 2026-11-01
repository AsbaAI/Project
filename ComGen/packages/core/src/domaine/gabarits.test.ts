import { describe, expect, it } from 'vitest'

import { MODELES_GABARIT, appelsDuCorps, modeleGabarit, verifierGabarit } from './gabarits.ts'

const EMPLACEMENTS = [
  { cle: 'objet', description: 'Objet', obligatoire: true, longueurMax: 120 },
  { cle: 'corps', description: 'Corps', obligatoire: true, longueurMax: 4000 },
  { cle: 'note', description: 'Note', obligatoire: false, longueurMax: 200 },
]

describe('appelsDuCorps', () => {
  it('relève les clés appelées, sans doublon, espaces admis', () => {
    expect(appelsDuCorps('<h1>{{objet}}</h1>{{ corps }}{{objet}}')).toEqual(['objet', 'corps'])
    expect(appelsDuCorps('aucun trou')).toEqual([])
  })
})

describe('verifierGabarit', () => {
  it('accepte un corps qui appelle ses emplacements obligatoires', () => {
    expect(verifierGabarit('<h1>{{objet}}</h1><p>{{corps}}</p>', EMPLACEMENTS)).toEqual([])
  })

  it('refuse un corps qui oublie un emplacement obligatoire', () => {
    expect(verifierGabarit('<h1>{{objet}}</h1>', EMPLACEMENTS)).toEqual([
      { code: 'EMPLACEMENT_ABSENT', cle: 'corps' },
    ])
  })

  it('refuse un trou que personne ne déclare : il partirait tel quel', () => {
    expect(
      verifierGabarit('{{objet}}{{corps}}{{signature}}', EMPLACEMENTS).map((c) => c.cle),
    ).toEqual(['signature'])
  })

  it('refuse une clé mal formée et un corps vide', () => {
    expect(verifierGabarit('   ', EMPLACEMENTS).map((c) => c.code)).toContain('CORPS_VIDE')
    expect(
      verifierGabarit('{{a-b}}', [
        { cle: 'a-b', description: '', obligatoire: true, longueurMax: 10 },
      ]).map((c) => c.code),
    ).toContain('CLE_INVALIDE')
  })
})

describe('catalogue', () => {
  it('chaque modèle est cohérent avec lui-même', () => {
    for (const modele of MODELES_GABARIT) {
      expect(verifierGabarit(modele.corps, modele.emplacements), modele.cle).toEqual([])
    }
  })

  it('les clés sont uniques, et se retrouvent', () => {
    const cles = MODELES_GABARIT.map((m) => m.cle)
    expect(new Set(cles).size).toBe(cles.length)
    expect(modeleGabarit('newsletter-fr')?.format).toBe('NEWSLETTER')
    expect(modeleGabarit('inexistant')).toBeNull()
  })

  it('aucun modèle ne porte une marque : ils se modifient après installation', () => {
    for (const modele of MODELES_GABARIT) {
      expect(modele.corps, modele.cle).not.toMatch(/Helvéa|Kestrel|ComGen/u)
    }
  })
})
