import { expect, test } from '@playwright/test'

import { COMPTES } from './environnement'
import { attendreRendu } from './outils'

/*
 * Source ITSM, de bout en bout, sur l'adaptateur de démonstration
 * (`ITSM_MODE=mock`) : aucune instance n'est jointe, aucun identifiant
 * n'est en jeu. Le test écrit en base, il tourne donc avec le compte
 * Kestrel, à l'écart des écrans capturés.
 *
 * Ce qu'il garde : ce que l'écran montre est ce qui est enregistré, et le
 * masquage s'applique avant l'enregistrement, pas à l'affichage.
 */
test.use({ storageState: COMPTES.parcours.etat })

test('un ticket devient une source masquée, et la fiche de faits s’ouvre', async ({ page }) => {
  await page.goto('/communications/nouvelle')
  await attendreRendu(page)
  await page
    .getByRole('textbox', { name: 'Titre obligatoire' })
    .fill('Incident Atlas — ticket ITSM')
  await page
    .getByRole('combobox', { name: 'Nature obligatoire' })
    .selectOption({ label: 'Incident' })
  await page.getByRole('radio', { name: /^Importante/ }).check()
  await page
    .getByRole('combobox', { name: 'Portée obligatoire' })
    .selectOption({ label: 'Interne' })
  await page.getByRole('radio', { name: /^Source ITSM/ }).check()
  await page.getByRole('button', { name: /^Créer et passer à l/ }).click()
  await expect(page).toHaveURL(/\/entree$/)

  await page.getByRole('link', { name: 'Parcourir les tickets' }).click()
  await expect(page).toHaveURL(/\/entree\/itsm$/)
  await attendreRendu(page)

  // La liste est filtrable, et le filtre vit dans l'adresse.
  await page.getByRole('checkbox', { name: 'En cours' }).check()
  await page.getByRole('button', { name: 'Filtrer' }).click()
  await expect(page).toHaveURL(/statuts=EN_COURS/)
  await attendreRendu(page)
  await expect(page.getByRole('cell', { name: 'EN COURS' }).first()).toBeVisible()

  const numero =
    (await page
      .getByRole('link', { name: /^INC\d{7}$/ })
      .first()
      .textContent()) ?? ''
  expect(numero).toMatch(/^INC\d{7}$/)
  await page.getByRole('link', { name: numero, exact: true }).click()
  await attendreRendu(page)

  // L'aperçu montre le texte masqué : ni courriel, ni téléphone.
  const apercu = page.getByText(`Ticket ${numero} —`, { exact: false }).first()
  await expect(apercu).toBeVisible()
  const texte = (await page.locator('pre').first().textContent()) ?? ''
  // Les libellés du texte suivent la langue de la communication, pas celle
  // de l'interface : la région de ce compte ne rédige qu'en anglais.
  expect(texte).toMatch(/\[(?:COURRIEL|EMAIL)\]/u)
  expect(texte).not.toMatch(/@exemple\.test/u)
  expect(texte).not.toMatch(/Notes de travail|Work notes/u)

  // Les notes de travail n'entrent que sur demande.
  await page.getByRole('link', { name: 'Inclure les notes de travail' }).click()
  await attendreRendu(page)
  const avecNotes = (await page.locator('pre').first().textContent()) ?? ''
  expect(avecNotes).toMatch(/Notes de travail|Work notes/u)

  await page.getByRole('button', { name: 'Utiliser comme source' }).click()
  await expect(page).toHaveURL(/\/faits$/)
  await attendreRendu(page)

  // La source porte le numéro du ticket, et son texte est celui qui était affiché.
  await expect(page.getByText(`Ticket ${numero}`).first()).toBeVisible()
  await expect(page.getByText("Ticket d'origine").first()).toBeVisible()
  await expect(page.getByText('À revoir', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('@exemple.test')).toHaveCount(0)
})

test('le même ticket n’entre pas deux fois dans la même communication', async ({ page }) => {
  await page.goto('/communications/nouvelle')
  await attendreRendu(page)
  await page.getByRole('textbox', { name: 'Titre obligatoire' }).fill('Incident Atlas — doublon')
  await page
    .getByRole('combobox', { name: 'Nature obligatoire' })
    .selectOption({ label: 'Incident' })
  await page.getByRole('radio', { name: /^Importante/ }).check()
  await page
    .getByRole('combobox', { name: 'Portée obligatoire' })
    .selectOption({ label: 'Interne' })
  await page.getByRole('radio', { name: /^Source ITSM/ }).check()
  await page.getByRole('button', { name: /^Créer et passer à l/ }).click()
  await expect(page).toHaveURL(/\/entree$/)
  const adresse = page.url()

  const importerPremier = async () => {
    await page.goto(`${adresse}/itsm`)
    await attendreRendu(page)
    const numero =
      (await page
        .getByRole('link', { name: /^INC\d{7}$/ })
        .first()
        .textContent()) ?? ''
    await page.getByRole('link', { name: numero, exact: true }).click()
    await attendreRendu(page)
    await page.getByRole('button', { name: 'Utiliser comme source' }).click()
  }

  await importerPremier()
  await expect(page).toHaveURL(/\/faits$/)

  await importerPremier()
  await expect(page.getByRole('alert').first()).toContainText('déjà une source')
  await expect(page).not.toHaveURL(/\/faits$/)
})
