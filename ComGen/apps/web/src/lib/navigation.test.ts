import { describe, expect, it } from 'vitest'

import { NAV_ACTION, NAV_ENTRIES, entreeCourante } from './navigation'

const TOUTES = [NAV_ACTION, ...NAV_ENTRIES]

describe('entreeCourante', () => {
  it('marque la création, pas l’historique, sur /communications/nouvelle', () => {
    expect(entreeCourante('/communications/nouvelle', TOUTES)).toBe('/communications/nouvelle')
  })

  it('rattache une communication ouverte à l’historique', () => {
    expect(entreeCourante('/communications/com_2026_0002/faits', TOUTES)).toBe('/communications')
  })

  it('ne confond pas un préfixe de mot avec un segment', () => {
    expect(entreeCourante('/communications-archive', TOUTES)).toBeNull()
  })

  it('ne marque rien sur l’accueil', () => {
    expect(entreeCourante('/', TOUTES)).toBeNull()
  })

  it('marque les sections de premier niveau', () => {
    expect(entreeCourante('/tableau-de-bord', TOUTES)).toBe('/tableau-de-bord')
    expect(entreeCourante('/parametres', TOUTES)).toBe('/parametres')
  })
})
