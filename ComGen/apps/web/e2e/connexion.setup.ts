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
    // La connexion aboutit à la racine, qui redirige vers le générateur,
    // premier pas du parcours : c'est là qu'on attend la session ouverte.
    await expect(page).toHaveURL(/\/generateur$/)
    await page.context().storageState({ path: compte.etat })
  })
}
