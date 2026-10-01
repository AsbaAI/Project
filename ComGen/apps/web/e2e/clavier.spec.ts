import { expect, test } from '@playwright/test'

import { attendreRendu, estTelephone } from './outils'

/*
 * Parcours au clavier (§14.2 : « tout est atteignable et actionnable au
 * clavier »). On ne teste pas que les éléments existent : on presse les
 * touches et on regarde où est le focus.
 */

test('le lien d’évitement est le premier élément focalisable et mène au contenu', async ({
  page,
}) => {
  await page.goto('/')
  await attendreRendu(page)

  await page.keyboard.press('Tab')
  const lien = page.getByRole('link', { name: 'Aller au contenu principal' })
  await expect(lien).toBeFocused()
  await expect(lien).toBeInViewport()

  await page.keyboard.press('Enter')
  await expect(page.locator('main#contenu')).toBeFocused()
})

test('les onglets se parcourent aux flèches et n’activent qu’un panneau', async ({ page }) => {
  await page.goto('/design')
  await attendreRendu(page)

  const faits = page.getByRole('tab', { name: 'Faits' })
  await faits.focus()
  await expect(faits).toHaveAttribute('aria-selected', 'true')

  await page.keyboard.press('ArrowRight')
  const variantes = page.getByRole('tab', { name: 'Variantes' })
  await expect(variantes).toBeFocused()
  await expect(variantes).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toContainText('3 variantes générées')

  await page.keyboard.press('End')
  await expect(page.getByRole('tab', { name: 'Historique' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

test('la bascule de thème est un groupe radio, persiste et se remet à « système »', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await attendreRendu(page)
  const html = page.locator('html')
  const systemeSombre = testInfo.project.use.colorScheme === 'dark'

  // Par défaut : aucun attribut, le système décide.
  await expect(html).not.toHaveAttribute('data-theme')

  const groupe = page.getByRole('radiogroup', { name: 'Thème' })
  const contraire = systemeSombre ? 'Clair' : 'Sombre'
  await groupe.getByRole('radio', { name: contraire }).click()
  await expect(html).toHaveAttribute('data-theme', systemeSombre ? 'light' : 'dark')
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme))
    .toBe(systemeSombre ? 'light' : 'dark')

  // Persistance : la préférence survit au rechargement, sans éclair de
  // thème (le script de pré-amorçage pose l'attribut avant le premier rendu).
  await page.reload()
  await attendreRendu(page)
  await expect(html).toHaveAttribute('data-theme', systemeSombre ? 'light' : 'dark')
  await expect(groupe.getByRole('radio', { name: contraire })).toBeChecked()

  // Navigation aux flèches dans le groupe : la flèche déplace le focus ET
  // la sélection, comme un groupe radio natif.
  await groupe.getByRole('radio', { name: contraire }).click()
  await expect(groupe.getByRole('radio', { name: contraire })).toBeFocused()
  // Radix ne coche l'élément atteint que si la flèche est encore enfoncée au
  // moment où le focus arrive (déplacement différé) : on tient la touche
  // comme un humain, au lieu de `press` qui la relâche instantanément.
  const precedent = systemeSombre ? 'Système' : 'Clair'
  await page.keyboard.down('ArrowLeft')
  await expect(groupe.getByRole('radio', { name: precedent })).toBeFocused()
  await page.keyboard.up('ArrowLeft')
  await expect(groupe.getByRole('radio', { name: precedent })).toBeChecked()

  // Retour au système : l'attribut disparaît, le stockage est vidé.
  await groupe.getByRole('radio', { name: 'Système' }).click()
  await expect(html).not.toHaveAttribute('data-theme')
  expect(await page.evaluate(() => localStorage.getItem('comgen:theme'))).toBeNull()
})

test('le sélecteur de langue conserve la page courante', async ({ page }) => {
  await page.goto('/design')
  await attendreRendu(page)

  await page
    .getByRole('navigation', { name: 'Langue' })
    .getByRole('link', { name: 'English' })
    .click()
  await expect(page).toHaveURL(/\/en\/design$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Design system')

  await page
    .getByRole('navigation', { name: 'Language' })
    .getByRole('link', { name: 'Français' })
    .click()
  await expect(page).toHaveURL(/\/design$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
})

test('l’onglet courant est marqué dans la barre', async ({ page }) => {
  test.skip(estTelephone(), 'les onglets sont masqués sur téléphone')
  await page.goto('/analyses')
  await attendreRendu(page)
  const nav = page.getByRole('navigation', { name: 'Navigation principale' })
  await expect(nav.getByRole('link', { name: 'Analyses' })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Générateur' })).not.toHaveAttribute('aria-current')
})

test('le constructeur se marque lui-même, pas la bibliothèque', async ({ page }) => {
  test.skip(estTelephone(), 'les onglets sont masqués sur téléphone')
  await page.goto('/gabarits/constructeur')
  await attendreRendu(page)
  const nav = page.getByRole('navigation', { name: 'Navigation principale' })
  await expect(nav.getByRole('link', { name: 'Constructeur' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(nav.getByRole('link', { name: 'Gabarits', exact: true })).not.toHaveAttribute(
    'aria-current',
  )
})

test('une communication ouverte garde le générateur allumé', async ({ page }) => {
  test.skip(estTelephone(), 'les onglets sont masqués sur téléphone')
  await page.goto('/communications/com_2026_0002/faits')
  await attendreRendu(page)
  const nav = page.getByRole('navigation', { name: 'Navigation principale' })
  await expect(nav.getByRole('link', { name: 'Générateur' })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('la racine mène au générateur, qui ouvre les deux parcours', async ({ page }) => {
  await page.goto('/')
  await attendreRendu(page)
  await expect(page).toHaveURL(/\/generateur$/)

  const principal = page.getByRole('main')
  await principal.getByRole('link', { name: /^Communication existante/ }).click()
  await expect(page).toHaveURL(/\/communications$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Historique')

  await page.goto('/generateur')
  await principal.getByRole('link', { name: /^Nouvelle communication/ }).click()
  await expect(page).toHaveURL(/\/communications\/nouvelle$/)
})

test('la barre dit l’état du moteur', async ({ page }) => {
  test.skip(estTelephone(), 'la pastille est masquée sous sm')
  await page.goto('/generateur')
  await attendreRendu(page)
  // Aucune clé de fournisseur n’est configurée en test : la pastille le dit.
  await expect(page.getByText('Mode démonstration')).toBeVisible()
})

test('le tiroir de navigation piège le focus et se ferme à Échap', async ({ page }) => {
  test.skip(!estTelephone(), 'le tiroir n’existe que sur téléphone')
  await page.goto('/')
  await attendreRendu(page)

  await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
  const tiroir = page.getByRole('dialog', { name: 'Navigation principale' })
  await expect(tiroir).toBeVisible()

  // Le focus est dans le tiroir et y reste, même après plus de tabulations
  // qu'il n'y a d'éléments focalisables (les frappes sont séquentielles par nature).
  await page.keyboard.press('Tab+Tab+Tab+Tab+Tab+Tab')
  const dansTiroir = await page.evaluate(
    () => document.activeElement?.closest('[role="dialog"]') !== null,
  )
  expect(dansTiroir).toBe(true)

  await page.keyboard.press('Escape')
  await expect(tiroir).toBeHidden()
  await expect(page.getByRole('button', { name: 'Ouvrir le menu' })).toBeFocused()

  // Naviguer ferme le tiroir.
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
  await tiroir.getByRole('link', { name: 'Système de design' }).click()
  await expect(page).toHaveURL(/\/design$/)
  await expect(tiroir).toBeHidden()
})
