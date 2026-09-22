import { describe, expect, it } from 'vitest'
import { APPROBATIONS_REQUISES_PAR_CRITICITE, approbationsRequises } from './approbations.ts'

/*
 * Nombre d'approbations humaines exigé avant APPROUVEE (§7). La
 * spécification ne fixe pas les valeurs : elles sont dans DECISIONS.md.
 * Ce qui n'est pas négociable : jamais zéro (§2, aucun envoi sans
 * approbation humaine).
 */
describe('approbationsRequises', () => {
  it('n’admet jamais zéro approbation, quelle que soit la criticité', () => {
    for (const valeur of Object.values(APPROBATIONS_REQUISES_PAR_CRITICITE)) {
      expect(valeur).toBeGreaterThanOrEqual(1)
    }
  })

  it('exige davantage d’approbations quand la criticité monte', () => {
    expect(approbationsRequises('COURANTE')).toBe(1)
    expect(approbationsRequises('IMPORTANTE')).toBe(2)
    expect(approbationsRequises('CRITIQUE')).toBe(2)
  })

  it('exige au moins une approbation quand un fait est déclaré sous responsabilité (§11)', () => {
    expect(approbationsRequises('COURANTE', { faitsDeclares: 1 })).toBeGreaterThanOrEqual(1)
    expect(approbationsRequises('CRITIQUE', { faitsDeclares: 3 })).toBe(2)
  })
})
