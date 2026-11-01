// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { requeteDeMemeOrigine } from './origine'

function entetes(valeurs: Record<string, string>): Headers {
  return new Headers(valeurs)
}

describe('requeteDeMemeOrigine', () => {
  it('accepte un POST dont l’Origin est l’hôte de la requête', () => {
    expect(
      requeteDeMemeOrigine(entetes({ origin: 'https://comgen.example', host: 'comgen.example' })),
    ).toBe(true)
  })

  it('refuse un Origin d’un autre site', () => {
    expect(
      requeteDeMemeOrigine(entetes({ origin: 'https://pirate.example', host: 'comgen.example' })),
    ).toBe(false)
  })

  it('refuse un Origin qui ne diffère que par le port', () => {
    expect(
      requeteDeMemeOrigine(entetes({ origin: 'http://localhost:3001', host: 'localhost:3000' })),
    ).toBe(false)
  })

  it('refuse l’Origin « null » (page isolée, iframe sandboxée)', () => {
    expect(requeteDeMemeOrigine(entetes({ origin: 'null', host: 'comgen.example' }))).toBe(false)
  })

  it('refuse un Origin illisible', () => {
    expect(requeteDeMemeOrigine(entetes({ origin: 'pas une url', host: 'comgen.example' }))).toBe(
      false,
    )
  })

  it('préfère l’hôte transmis par le mandataire à l’hôte interne', () => {
    expect(
      requeteDeMemeOrigine(
        entetes({
          origin: 'https://comgen.example',
          host: '10.0.0.7:3000',
          'x-forwarded-host': 'comgen.example',
        }),
      ),
    ).toBe(true)
  })

  it('sans Origin, accepte un client hors navigateur', () => {
    // Un navigateur envoie toujours Origin sur un POST ; son absence vient
    // d'un client sans cookie de navigateur à détourner.
    expect(requeteDeMemeOrigine(entetes({ host: 'comgen.example' }))).toBe(true)
  })

  it('sans Origin, refuse ce que le navigateur dit venir d’un autre site', () => {
    expect(
      requeteDeMemeOrigine(entetes({ host: 'comgen.example', 'sec-fetch-site': 'cross-site' })),
    ).toBe(false)
    expect(
      requeteDeMemeOrigine(entetes({ host: 'comgen.example', 'sec-fetch-site': 'same-site' })),
    ).toBe(false)
  })

  it('sans Origin, accepte ce que le navigateur dit venir du même site', () => {
    expect(
      requeteDeMemeOrigine(entetes({ host: 'comgen.example', 'sec-fetch-site': 'same-origin' })),
    ).toBe(true)
  })

  it('refuse quand la requête ne dit pas sur quel hôte elle arrive', () => {
    expect(requeteDeMemeOrigine(entetes({ origin: 'https://comgen.example' }))).toBe(false)
  })
})
