import { fileURLToPath } from 'node:url'

import { type Page, type TestInfo, expect, test } from '@playwright/test'

import {
  PAGES,
  SANS_SESSION,
  attendreRendu,
  estTelephone,
  ouvrirPreferences,
  verifierAucunDebordement,
} from './outils'

/** `e2e/captures/<projet>/<page>.png` — hors de `test-results`, pour survivre au nettoyage entre deux exécutions. */
function cheminCapture(projet: string, nom: string) {
  return fileURLToPath(new URL(`./captures/${projet}/${nom}.png`, import.meta.url))
}

/*
 * Captures de revue visuelle (§21.1). Elles sont écrites dans
 * `e2e/captures/<projet>/<page>.png` (hors dépôt) et RELUES avant de
 * déclarer un écran terminé. Le test vérifie en plus ce qu'une capture ne
 * montre pas : l'absence de défilement horizontal et le thème effectif.
 */
async function capturer(page: Page, testInfo: TestInfo, nom: string, chemin: string) {
  await page.goto(chemin)
  await attendreRendu(page)

  const sombre = testInfo.project.use.colorScheme === 'dark'
  const schema = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)
  expect(schema).toBe(sombre ? 'dark' : 'light')

  await verifierAucunDebordement(page)

  await page.screenshot({
    path: cheminCapture(testInfo.project.name, nom),
    fullPage: true,
    animations: 'disabled',
  })
}

for (const { nom, chemin } of PAGES) {
  test(`capture — ${nom}`, async ({ page }, testInfo) => {
    await capturer(page, testInfo, nom, chemin)
  })
}

/*
 * Le tiroir du téléphone est un écran à part entière : il porte les six
 * onglets, l'état du moteur, la langue et le thème. Il se relit donc comme
 * les autres, au lieu de n'exister que dans un test de rôle.
 */
test('capture — tiroir de navigation', async ({ page }, testInfo) => {
  test.skip(!estTelephone(), 'le tiroir n’existe que sur téléphone')
  await page.goto('/generateur')
  await attendreRendu(page)
  await ouvrirPreferences(page)
  await page.screenshot({
    path: cheminCapture(testInfo.project.name, 'tiroir'),
    animations: 'disabled',
  })
})

test.describe('sans session', () => {
  test.use({ storageState: SANS_SESSION })

  test('capture — connexion', async ({ page }, testInfo) => {
    await capturer(page, testInfo, 'connexion', '/connexion')
  })
})
