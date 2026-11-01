import { expect, test } from '@playwright/test'

import { SANS_SESSION } from './outils'

/*
 * Sondes d'hébergement, appelées sans session : un orchestrateur de
 * conteneurs n'en a pas. Elles ne disent rien de plus que leur verdict.
 */
test.use({ storageState: SANS_SESSION })

test('vivacité : 200 sans session, jamais mise en cache', async ({ request }) => {
  const reponse = await request.get('/api/sante')
  expect(reponse.status()).toBe(200)
  expect(reponse.headers()['cache-control']).toContain('no-store')
  expect(await reponse.json()).toEqual({ statut: 'ok' })
})

test('disponibilité : base et stockage répondent', async ({ request }) => {
  const reponse = await request.get('/api/pret')
  expect(reponse.status()).toBe(200)
  expect(await reponse.json()).toEqual({
    pret: true,
    dependances: { base: 'ok', stockage: 'ok' },
  })
})
