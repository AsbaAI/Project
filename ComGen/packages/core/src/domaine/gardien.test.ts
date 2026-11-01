import { describe, expect, it } from 'vitest'

import { type GardeFousPersona, gardien, lireGardeFous } from './gardien.ts'

const REGLES: GardeFousPersona = {
  interdits: ['bug', 'rollback', 'Échéance'],
  sujetsInterdits: ['rémunérations'],
  confidentialiteMax: 'RESTREINT',
}

describe('gardien', () => {
  it('ne trouve rien dans un texte conforme', () => {
    expect(gardien('La migration est planifiée le 14 octobre.', REGLES, [])).toEqual([])
  })

  it('bloque un terme interdit, sans tenir compte de la casse ni des accents', () => {
    const constats = gardien('Un BUG et une echeance dépassée.', REGLES, [])
    expect(constats.map((c) => c.message)).toEqual([
      expect.stringContaining('« bug »'),
      expect.stringContaining('« Échéance »'),
    ])
    expect(constats.every((c) => c.type === 'TON')).toBe(true)
  })

  it('ne confond pas un terme avec un mot qui le contient', () => {
    expect(gardien('Le debugging est terminé, pas de rollbacks.', REGLES, [])).toEqual([])
  })

  it('bloque un sujet interdit littéral', () => {
    const [constat] = gardien('Les Rémunérations sont gelées.', REGLES, [])
    expect(constat).toMatchObject({ type: 'CONFIDENTIALITE_PERSONA' })
  })

  it('bloque un fait plus confidentiel que le maximum du persona, sans doublon', () => {
    const constats = gardien('Texte neutre.', REGLES, [
      { reference: 'F-01', confidentialite: 'INTERNE' },
      { reference: 'F-02', confidentialite: 'SECRET' },
      { reference: 'F-02', confidentialite: 'SECRET' },
    ])
    expect(constats).toHaveLength(1)
    expect(constats[0]?.message).toContain('F-02')
    expect(constats[0]?.message).not.toContain('F-01')
  })

  it('ignore une entrée vide de la liste plutôt que de tout bloquer', () => {
    expect(
      gardien('Texte.', { ...REGLES, interdits: ['', '  '], sujetsInterdits: [''] }, []),
    ).toEqual([])
  })
})

describe('lireGardeFous', () => {
  const lexique = { fr: { interdits: ['bug'] }, en: { interdits: ['crash'] } }
  const gardeFous = { confidentialiteMax: 'RESTREINT', sujetsInterdits: ['x'] }

  it('lit la langue demandée', () => {
    expect(lireGardeFous(lexique, gardeFous, 'en')).toEqual({
      interdits: ['crash'],
      sujetsInterdits: ['x'],
      confidentialiteMax: 'RESTREINT',
    })
  })

  it('une langue sans lexique n’interdit rien', () => {
    expect(lireGardeFous({}, gardeFous, 'fr')?.interdits).toEqual([])
  })

  it('une règle absente n’interdit rien, un persona vide est lisible', () => {
    expect(lireGardeFous({}, {}, 'fr')).toEqual({
      interdits: [],
      sujetsInterdits: [],
      confidentialiteMax: 'SECRET',
    })
  })

  it('une configuration mal formée est refusée, pas ignorée', () => {
    expect(lireGardeFous(lexique, { ...gardeFous, confidentialiteMax: 'TOP' }, 'fr')).toBeNull()
    expect(lireGardeFous(lexique, { sujetsInterdits: 'x' }, 'fr')).toBeNull()
    expect(lireGardeFous({ fr: { interdits: 'bug' } }, gardeFous, 'fr')).toBeNull()
    expect(lireGardeFous(null, gardeFous, 'fr')).toBeNull()
  })
})
