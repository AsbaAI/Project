import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

import { PAGES, attendreRendu, verifierAucunDebordement } from './outils'

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
for (const { nom, chemin } of PAGES) {
  test(`capture — ${nom}`, async ({ page }, testInfo) => {
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
  })
}
