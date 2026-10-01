import { expect, test as preparation } from '@playwright/test'

import { COMPTES } from './environnement'

/*
 * Connexion des comptes de démonstration par l'écran réel (simulateur) ;
 * la session est enregistrée et réutilisée par les autres projets.
 */
for (const compte of Object.values(COMPTES)) {
  preparation(`connexion — ${compte.courriel}`, async ({ page }) => {
    await page.goto('/connexion')
    await page.getByLabel('Compte', { exact: true }).selectOption(compte.courriel)
    await page.getByRole('button', { name: 'Ouvrir la session' }).click()
    await expect(page).toHaveURL(/\/$/)
    await page.context().storageState({ path: compte.etat })
  })
}
