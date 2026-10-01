import { describe, expect, it } from 'vitest'

import { heureLocaleVersUtc, instantVersHeureLocale } from './temps.ts'

describe('heureLocaleVersUtc', () => {
  it('convertit une heure de Paris en été (UTC+2)', () => {
    expect(heureLocaleVersUtc('2026-10-14T22:00', 'Europe/Paris')).toEqual({
      statut: 'OK',
      instant: new Date('2026-10-14T20:00:00.000Z'),
    })
  })

  it('convertit une heure de Paris en hiver (UTC+1)', () => {
    expect(heureLocaleVersUtc('2026-11-07T22:00', 'Europe/Paris')).toEqual({
      statut: 'OK',
      instant: new Date('2026-11-07T21:00:00.000Z'),
    })
  })

  it('convertit une heure de Toronto (UTC-4 en été)', () => {
    expect(heureLocaleVersUtc('2026-09-15T08:30', 'America/Toronto')).toEqual({
      statut: 'OK',
      instant: new Date('2026-09-15T12:30:00.000Z'),
    })
  })

  it("refuse une heure qui n'existe pas (passage à l'heure d'été)", () => {
    expect(heureLocaleVersUtc('2026-03-29T02:30', 'Europe/Paris')).toEqual({
      statut: 'INEXISTANTE',
    })
  })

  it("refuse une heure ambiguë (retour à l'heure d'hiver) plutôt que de choisir", () => {
    expect(heureLocaleVersUtc('2026-10-25T02:30', 'Europe/Paris')).toEqual({ statut: 'AMBIGUE' })
  })

  it('refuse un format ou un fuseau invalide', () => {
    expect(heureLocaleVersUtc('14/10/2026 22:00', 'Europe/Paris')).toEqual({ statut: 'INVALIDE' })
    expect(heureLocaleVersUtc('2026-02-30T10:00', 'Europe/Paris')).toEqual({ statut: 'INVALIDE' })
    expect(heureLocaleVersUtc('2026-10-14T22:00', 'Mars/Olympus')).toEqual({ statut: 'INVALIDE' })
  })
})

describe('instantVersHeureLocale', () => {
  it('rend la valeur attendue par un champ datetime-local', () => {
    expect(instantVersHeureLocale(new Date('2026-10-14T20:00:00.000Z'), 'Europe/Paris')).toBe(
      '2026-10-14T22:00',
    )
    expect(instantVersHeureLocale(new Date('2026-01-01T00:00:00.000Z'), 'Europe/London')).toBe(
      '2026-01-01T00:00',
    )
  })

  it('fait l’aller-retour avec heureLocaleVersUtc', () => {
    const resultat = heureLocaleVersUtc('2026-12-15T17:00', 'Europe/Paris')
    expect(resultat.statut).toBe('OK')
    if (resultat.statut === 'OK') {
      expect(instantVersHeureLocale(resultat.instant, 'Europe/Paris')).toBe('2026-12-15T17:00')
    }
  })
})
