import { describe, expect, it } from 'vitest'

import {
  ECART_LONGUEUR_TOLERE,
  VOIX_PAR_DEFAUT,
  ecartDeLongueur,
  lireJargon,
  lireVoix,
} from './voix.ts'

describe('lireVoix', () => {
  it('lit une voix complète', () => {
    expect(
      lireVoix({
        registre: 'soutenu',
        ton: 'synthétique, orienté décision',
        personne: 'nous',
        structure: ['enjeu', 'décision ou changement', 'impact'],
        longueurCible: 150,
      }),
    ).toEqual({
      registre: 'soutenu',
      ton: 'synthétique, orienté décision',
      personne: 'nous',
      structure: ['enjeu', 'décision ou changement', 'impact'],
      longueurCible: 150,
    })
  })

  it('une clé absente vaut absence de règle', () => {
    expect(lireVoix({})).toEqual(VOIX_PAR_DEFAUT)
    expect(lireVoix(undefined)).toEqual(VOIX_PAR_DEFAUT)
    expect(lireVoix({ ton: 'direct' })?.longueurCible).toBeNull()
  })

  it('refuse une clé présente et mal formée', () => {
    expect(lireVoix({ registre: 'poétique' })).toBeNull()
    expect(lireVoix({ personne: 'il' })).toBeNull()
    expect(lireVoix({ structure: ['enjeu', '  '] })).toBeNull()
    expect(lireVoix({ structure: ['enjeu', 42] })).toBeNull()
    expect(lireVoix({ structure: Array.from({ length: 11 }, () => 'enjeu') })).toBeNull()
    expect(lireVoix({ structure: 'enjeu' })).toBeNull()
    expect(lireVoix({ longueurCible: 12 })).toBeNull()
    expect(lireVoix({ longueurCible: 150.5 })).toBeNull()
    expect(lireVoix({ ton: 12 })).toBeNull()
    expect(lireVoix('soutenu')).toBeNull()
  })
})

describe('lireJargon', () => {
  it('lit les mots de la langue demandée', () => {
    const lexique = {
      fr: { preferes: ['enjeu'], interdits: ['bug'] },
      en: { preferes: ['impact'] },
    }
    expect(lireJargon(lexique, 'fr')).toEqual(['enjeu'])
    expect(lireJargon(lexique, 'en')).toEqual(['impact'])
    expect(lireJargon({}, 'fr')).toEqual([])
  })

  it('refuse un lexique mal formé', () => {
    expect(lireJargon({ fr: { preferes: 'enjeu' } }, 'fr')).toBeNull()
    expect(lireJargon('enjeu', 'fr')).toBeNull()
  })
})

describe('ecartDeLongueur', () => {
  it('sans cible, il n’y a pas d’écart — surtout pas zéro', () => {
    expect(ecartDeLongueur(120, null)).toBeNull()
  })

  it('mesure l’écart dans les deux sens', () => {
    expect(ecartDeLongueur(150, 150)).toBe(0)
    expect(ecartDeLongueur(75, 150)).toBeCloseTo(0.5)
    expect(ecartDeLongueur(225, 150)).toBeCloseTo(0.5)
    expect(ecartDeLongueur(180, 150)).toBeLessThan(ECART_LONGUEUR_TOLERE)
  })
})
