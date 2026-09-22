import { describe, expect, it } from 'vitest'
import {
  analyserReferenceCommunication,
  formaterReferenceCommunication,
  formaterReferenceFait,
} from './references.ts'

describe('références (§6 : COM-2026-0001, F-01)', () => {
  it('formate la référence de communication sur quatre chiffres minimum', () => {
    expect(formaterReferenceCommunication(2026, 1)).toBe('COM-2026-0001')
    expect(formaterReferenceCommunication(2026, 42)).toBe('COM-2026-0042')
    expect(formaterReferenceCommunication(2026, 12345)).toBe('COM-2026-12345')
  })

  it('refuse un numéro non entier ou négatif', () => {
    expect(() => formaterReferenceCommunication(2026, 0)).toThrow()
    expect(() => formaterReferenceCommunication(2026, -1)).toThrow()
    expect(() => formaterReferenceCommunication(2026, 1.5)).toThrow()
  })

  it('analyse une référence de communication', () => {
    expect(analyserReferenceCommunication('COM-2026-0042')).toEqual({ annee: 2026, numero: 42 })
    expect(analyserReferenceCommunication('COM-26-42')).toBeNull()
    expect(analyserReferenceCommunication('com-2026-0042')).toBeNull()
  })

  it('formate la référence de fait sur deux chiffres minimum', () => {
    expect(formaterReferenceFait(1)).toBe('F-01')
    expect(formaterReferenceFait(27)).toBe('F-27')
    expect(formaterReferenceFait(140)).toBe('F-140')
  })
})
