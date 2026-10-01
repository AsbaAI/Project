import { AxeBuilder } from '@axe-core/playwright'
import { type Page, expect, test } from '@playwright/test'

import { PAGES, SANS_SESSION, attendreRendu, estTelephone } from './outils'

/*
 * Audit axe-core (WCAG 2.2 AA). Le critère d'acceptation est « zéro
 * violation grave ou critique » ; les violations mineures sont listées
 * dans le rapport pour être traitées, sans bloquer.
 */
async function auditer(page: Page) {
  const resultats = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze()

  const graves = resultats.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  const resume = graves.map(
    (v) =>
      `${v.id} (${v.impact}) : ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`,
  )
  expect(resume, 'violations graves ou critiques').toEqual([])
  return resultats
}

for (const { nom, chemin } of PAGES) {
  test(`axe — ${nom} (fr)`, async ({ page }) => {
    await page.goto(chemin)
    await attendreRendu(page)
    await auditer(page)
  })
}

test.describe('sans session', () => {
  test.use({ storageState: SANS_SESSION })

  test('axe — connexion', async ({ page }) => {
    await page.goto('/connexion')
    await attendreRendu(page)
    await auditer(page)
  })

  test('une page protégée renvoie vers la connexion', async ({ page }) => {
    await page.goto('/communications/com_2026_0002/faits')
    await expect(page).toHaveURL(/\/connexion/)
  })
})

test('axe — fiche de faits, volet d’amendement ouvert', async ({ page }) => {
  await page.goto('/communications/com_2026_0002/faits')
  await attendreRendu(page)
  await page.getByText('Amender la valeur').first().click()
  await auditer(page)
})

test('axe — cadrage soumis vide, erreurs affichées', async ({ page }) => {
  await page.goto('/communications/nouvelle')
  await attendreRendu(page)
  await page.getByRole('button', { name: /^Créer et passer à l/ }).click()
  await expect(page.getByRole('alert').first()).toBeVisible()
  await auditer(page)
})

test('axe — tableau de bord (en)', async ({ page }) => {
  await page.goto('/en')
  await attendreRendu(page)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await auditer(page)
})

test('axe — page introuvable', async ({ page }) => {
  const reponse = await page.goto('/fr/cette-page-n-existe-pas')
  expect(reponse?.status()).toBe(404)
  await attendreRendu(page)
  await expect(page.getByRole('heading', { level: 2, name: 'Page introuvable' })).toBeVisible()
  await auditer(page)
})

test('axe — tiroir de navigation ouvert', async ({ page }) => {
  test.skip(!estTelephone(), 'le tiroir n’existe que sur téléphone')
  await page.goto('/')
  await attendreRendu(page)
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
  await expect(page.getByRole('dialog', { name: 'Navigation principale' })).toBeVisible()
  await auditer(page)
})
