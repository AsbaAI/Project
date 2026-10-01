/* oxlint-disable eslint/no-await-in-loop -- redimensionner une fenêtre puis
 * la mesurer est séquentiel par nature : paralléliser mesurerait la même
 * fenêtre à plusieurs largeurs à la fois. */
import { expect, test } from '@playwright/test'

import { attendreRendu, estTelephone, ouvrirPreferences } from './outils'

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
  await ouvrirPreferences(page)
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
  // Le rechargement a refermé le tiroir sur téléphone : on le rouvre.
  await ouvrirPreferences(page)
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
  await ouvrirPreferences(page)

  await page
    .getByRole('navigation', { name: 'Langue' })
    .getByRole('link', { name: 'English' })
    .click()
  await expect(page).toHaveURL(/\/en\/design$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Design system')

  // Sur téléphone, la navigation a refermé le tiroir : on le rouvre.
  await ouvrirPreferences(page)
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

test('l’état du moteur est dit à toute largeur d’écran', async ({ page }) => {
  await page.goto('/generateur')
  await attendreRendu(page)
  // Sur téléphone la pastille vit dans le tiroir, pas sur la barre : l'état
  // du moteur n'a le droit de disparaître d'aucune largeur.
  await ouvrirPreferences(page)
  // Aucune clé de fournisseur n’est configurée en test : la pastille le dit.
  // Exactement une est visible — la barre et le tiroir portent chacun la
  // leur, mais jamais les deux en même temps, et jamais aucune.
  await expect(page.getByText('Mode démonstration').filter({ visible: true })).toHaveCount(1)
})

test('la barre ne se chevauche jamais, à toute largeur de bureau', async ({ page }) => {
  test.skip(estTelephone(), 'la barre d’onglets n’existe pas sur téléphone')
  await page.goto('/generateur')
  await attendreRendu(page)

  /*
   * Six onglets, la marque, l'état du moteur, la langue, le thème et le
   * compte se disputent une barre d'une seule ligne. Quand ça ne tient
   * pas, rien ne proteste : les boîtes se superposent et le dernier
   * onglet passe sous la pastille — invisible aux tests de rôle, visible
   * à l'œil. Ce test mesure, à chaque largeur de la plage bureau, que
   * l'ensemble des éléments de la barre reste dans l'ordre et disjoint.
   */
  for (const largeur of [1024, 1152, 1280, 1366, 1440, 1600, 1920]) {
    await page.setViewportSize({ width: largeur, height: 760 })
    await attendreRendu(page)

    const boites = await page.evaluate(() =>
      // Les boîtes de la barre : chaque onglet, puis chaque groupe de droite.
      [
        ...document.querySelectorAll(
          '[data-barre="onglets"] li, [data-barre="moteur"], [data-barre="langue"], [data-barre="theme"], [data-barre="compte"]',
        ),
      ]
        .map((e) => {
          const r = e.getBoundingClientRect()
          return { nom: (e.textContent ?? '').trim().slice(0, 24), x: r.left, droite: r.right }
        })
        .filter((b) => b.droite > b.x)
        .toSorted((a, b) => a.x - b.x),
    )

    expect(boites.length, `largeur ${largeur} : la barre est vide`).toBeGreaterThan(6)
    const chevauchements = boites
      .map((boite, i) => ({ boite, avant: boites[i - 1] }))
      .filter(({ boite, avant }) => avant !== undefined && boite.x < avant.droite)
      .map(({ boite, avant }) => `« ${avant?.nom} » chevauche « ${boite.nom} »`)
    expect(chevauchements, `largeur ${largeur}`).toEqual([])
  }
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
