import { describe, expect, it, vi } from 'vitest'

/*
 * Une application peut embarquer ce module en plusieurs copies : un bundler
 * serveur qui sépare ses entrées (routes API, pages) en donne une à chacune.
 * La connexion, elle, est partagée d'une copie à l'autre. Si la clé qui
 * ouvre son client n'était propre qu'à une copie, une connexion ouverte par
 * l'une serait illisible pour l'autre : `connexion[CLIENT_BRUT]` vaudrait
 * `undefined`, et la première route API venue répondrait 500.
 */
describe('CLIENT_BRUT', () => {
  it('est la même clé dans deux copies du module', async () => {
    const premiere = await import('./connexion.ts')
    vi.resetModules()
    const seconde = await import('./connexion.ts')

    expect(seconde).not.toBe(premiere)
    expect(seconde.CLIENT_BRUT).toBe(premiere.CLIENT_BRUT)
  })
})

/*
 * La sonde de disponibilité (`/api/pret`) demande à la base de répondre,
 * sans lire ni écrire aucune donnée métier : `SELECT 1`, rien d'autre.
 */
describe('Connexion.verifier', () => {
  it('se résout quand la base répond', async () => {
    const { ouvrirConnexionDeTest } = await import('./test/base-de-test.ts')
    const connexion = ouvrirConnexionDeTest()
    try {
      await expect(connexion.verifier()).resolves.toBeUndefined()
    } finally {
      await connexion.fermer()
    }
  })

  it('échoue quand la base est injoignable', async () => {
    const { ouvrirConnexion } = await import('./connexion.ts')
    // Port 1 : refusé tout de suite, sans attendre un délai réseau.
    const connexion = ouvrirConnexion({ url: 'postgresql://personne:rien@127.0.0.1:1/aucune' })
    try {
      await expect(connexion.verifier()).rejects.toThrow()
    } finally {
      await connexion.fermer()
    }
  })
})
