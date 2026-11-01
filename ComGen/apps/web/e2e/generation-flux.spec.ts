import { type APIResponse, expect, test } from '@playwright/test'

import { COMPTES, URL_E2E } from './environnement'
import { SANS_SESSION } from './outils'

/*
 * La route de génération, vue de l'extérieur : ce qu'elle refuse, et ce
 * qu'elle ne dit pas. Ce sont des appels d'API, pas des écrans : un seul
 * projet suffit, les quatre configurations n'y changent rien.
 *
 * La variante `var_2026_0031_01` est celle de la rédactrice Helvea, déjà
 * en contrôle : générer y est refusé par l'état, ce qui sert ici de cas où
 * l'on arrive jusqu'au service sans rien écrire.
 */
const VARIANTE_HELVEA = 'var_2026_0031_01'
const route = (id: string) => `/api/variantes/${id}/generation`

async function messages(reponse: APIResponse): Promise<Record<string, unknown>[]> {
  const corps = await reponse.text()
  return corps
    .split('\n')
    .filter((ligne) => ligne.trim().length > 0)
    .map((ligne) => JSON.parse(ligne) as Record<string, unknown>)
}

test('sans session : refusé, rien n’est lancé', async ({ playwright }) => {
  const anonyme = await playwright.request.newContext({
    baseURL: URL_E2E,
    storageState: SANS_SESSION,
  })
  const reponse = await anonyme.post(route(VARIANTE_HELVEA), { headers: { Origin: URL_E2E } })
  expect(reponse.status()).toBe(401)
  expect(await reponse.json()).toEqual({ code: 'NON_AUTHENTIFIE' })
  await anonyme.dispose()
})

test('origine étrangère : refusé, même avec une session valide', async ({ request }) => {
  const reponse = await request.post(route(VARIANTE_HELVEA), {
    headers: { Origin: 'https://pirate.example' },
  })
  expect(reponse.status()).toBe(403)
  expect(await reponse.json()).toEqual({ code: 'ORIGINE_REFUSEE' })
})

test('une requête que le navigateur dit venir d’un autre site est refusée', async ({ request }) => {
  const reponse = await request.post(route(VARIANTE_HELVEA), {
    headers: { 'Sec-Fetch-Site': 'cross-site' },
  })
  expect(reponse.status()).toBe(403)
})

test('seul POST est admis : lire cette route ne lance rien', async ({ request }) => {
  const reponse = await request.get(route(VARIANTE_HELVEA))
  expect(reponse.status()).toBe(405)
})

test('un état qui ne permet pas de générer : refusé par son code, rien n’est écrit', async ({
  request,
}) => {
  const reponse = await request.post(route(VARIANTE_HELVEA), { headers: { Origin: URL_E2E } })
  expect(reponse.status()).toBe(200)
  expect(reponse.headers()['content-type']).toContain('application/x-ndjson')
  const lus = await messages(reponse)
  expect(lus.at(-1)).toEqual({ type: 'erreur', code: 'ETAT_INCOMPATIBLE' })
  // Aucun agent n'a travaillé : le service refuse avant d'en lancer un.
  expect(lus.some((m) => m['type'] === 'etat')).toBe(false)
  expect(lus.some((m) => m['type'] === 'fin')).toBe(false)
})

test.describe('depuis une autre organisation', () => {
  test.use({ storageState: COMPTES.parcours.etat })

  test('la variante d’une autre organisation est introuvable, comme si elle n’existait pas', async ({
    request,
  }) => {
    // INTROUVABLE et non ETAT_INCOMPATIBLE : refuser pour l'état dirait à
    // l'utilisateur de Kestrel que cette variante existe chez Helvea.
    const reponse = await request.post(route(VARIANTE_HELVEA), { headers: { Origin: URL_E2E } })
    expect(reponse.status()).toBe(200)
    const lus = await messages(reponse)
    expect(lus.at(-1)).toEqual({ type: 'erreur', code: 'INTROUVABLE' })
    expect(lus.some((m) => m['type'] === 'etat')).toBe(false)
  })

  test('une variante qui n’existe nulle part répond exactement de même', async ({ request }) => {
    const reponse = await request.post(route('var_nulle_part'), { headers: { Origin: URL_E2E } })
    const lus = await messages(reponse)
    expect(lus.at(-1)).toEqual({ type: 'erreur', code: 'INTROUVABLE' })
  })
})
