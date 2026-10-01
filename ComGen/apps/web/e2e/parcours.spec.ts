import { type Page, expect, test } from '@playwright/test'

import { COMPTES } from './environnement'
import { attendreRendu } from './outils'

/*
 * Parcours de bout en bout du lot 1 : cadrage, entrée, revue de la fiche.
 * Ils écrivent en base : ils tournent avec le compte Kestrel, si bien que
 * les écrans Helvea capturés ne changent pas. Chaque test crée sa propre
 * communication.
 */
test.use({ storageState: COMPTES.parcours.etat })

const TEXTE_SOURCE = [
  'La version 3.9.2 de la plateforme Track & Trace sera déployée le 12 novembre 2026.',
  'Pendant la mise à jour, le service sera interrompu pendant 45 minutes pour tous les clients.',
  'Les clients doivent renouveler leur clé avant la fin de la fenêtre de maintenance.',
].join('\n')

async function cadrer(page: Page, titre: string, mode: string) {
  await page.goto('/communications/nouvelle')
  await attendreRendu(page)
  await page.getByRole('textbox', { name: 'Titre obligatoire' }).fill(titre)
  await page
    .getByRole('combobox', { name: 'Nature obligatoire' })
    .selectOption({ label: 'Livraison' })
  await page.getByRole('radio', { name: /^Importante/ }).check()
  await page
    .getByRole('combobox', { name: 'Portée obligatoire' })
    .selectOption({ label: 'Externe' })
  await page.getByRole('radio', { name: new RegExp(`^${mode}`) }).check()
  await page.getByRole('button', { name: /^Créer et passer à l/ }).click()
  await expect(page).toHaveURL(/\/communications\/(?!nouvelle)[^/]+\/entree$/)
}

test('un cadrage incomplet est refusé champ par champ, sans rien perdre de la saisie', async ({
  page,
}) => {
  await page.goto('/communications/nouvelle')
  await attendreRendu(page)
  await page.getByRole('textbox', { name: 'Titre obligatoire' }).fill('Annonce incomplète')
  await page.getByRole('button', { name: /^Créer et passer à l/ }).click()

  await expect(page.getByRole('alert').first()).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Nature obligatoire' })).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await expect(page.getByRole('textbox', { name: 'Titre obligatoire' })).toHaveValue(
    'Annonce incomplète',
  )
  await expect(page).toHaveURL(/\/communications\/nouvelle$/)
})

test('texte saisi : la source est figée, ses faits sont à revoir avant de poursuivre', async ({
  page,
}) => {
  await cadrer(page, 'Track & Trace 3.9.2 — maintenance planifiée', 'Rédaction directe')

  await page
    .getByRole('textbox', { name: 'Intitulé de la source obligatoire' })
    .fill('Annonce de maintenance')
  await page.getByRole('textbox', { name: 'Texte obligatoire' }).fill(TEXTE_SOURCE)
  await page.getByRole('button', { name: 'Enregistrer la source' }).click()
  await expect(page).toHaveURL(/\/faits$/)
  await attendreRendu(page)

  // Les faits relevés sont proposés, pas acquis : chacun reste à revoir.
  const aRevoir = page.getByText('À revoir', { exact: true })
  await expect(aRevoir.first()).toBeVisible()
  const avant = await aRevoir.count()
  expect(avant).toBeGreaterThan(0)

  // La source est affichée telle que saisie, au mot près.
  await expect(page.getByText('3.9.2', { exact: false }).first()).toBeVisible()

  // Confirmer un fait le sort de la liste à revoir.
  await page.getByRole('button', { name: 'Confirmer' }).first().click()
  await expect(aRevoir).toHaveCount(avant - 1)
})

test('dépôt de fichier : le résultat est rendu fichier par fichier', async ({ page }) => {
  await cadrer(page, 'Track & Trace 3.9.2 — note de version', 'Dépôt de fichiers')

  await page.getByLabel('Fichiers', { exact: true }).setInputFiles([
    { name: 'note-de-version.txt', mimeType: 'text/plain', buffer: Buffer.from(TEXTE_SOURCE) },
    { name: 'capture.png', mimeType: 'image/png', buffer: Buffer.from('pas une image') },
  ])
  await page.getByRole('button', { name: 'Déposer et analyser' }).click()

  const resultat = page.getByRole('region', { name: 'Résultat du dépôt' })
  await expect(resultat).toBeVisible()
  await expect(resultat.getByText('note-de-version.txt')).toBeVisible()
  await expect(resultat.getByText('Déposé', { exact: false })).toBeVisible()
  await expect(resultat.getByText('Refusé', { exact: false })).toBeVisible()
  // L'absence d'antivirus est dite, pas tue.
  await expect(resultat.getByText('Aucune analyse antivirale')).toBeVisible()

  await resultat.getByRole('link', { name: 'Revoir la fiche de faits' }).click()
  await expect(page).toHaveURL(/\/faits$/)
})
