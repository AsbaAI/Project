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
