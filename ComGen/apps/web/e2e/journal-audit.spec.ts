import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

import { COMPTES } from './environnement'

/*
 * Journal d'audit, de bout en bout (plan L3).
 *
 * On ne vérifie pas qu'une page s'affiche : on fait un vrai geste avec un
 * compte, puis on relit la trace avec un autre. Les deux écrits sont chez
 * Kestrel, l'organisation où les tests ont le droit d'écrire — les écrans
 * capturés (Helvea) ne bougent pas.
 */

test.describe('journal d’audit', () => {
  test.use({ storageState: COMPTES.auditeur.etat })

  test('l’auditeur lit le journal et le filtre', async ({ page }) => {
    await page.goto('/parametres/journal')

    await expect(page.getByRole('heading', { level: 1, name: 'Journal d’audit' })).toBeVisible()
    const filtres = page.getByRole('navigation', { name: 'Filtrer par type d’objet' })
    await expect(filtres.getByRole('link', { name: 'Tout' })).toHaveAttribute(
      'aria-current',
      'true',
    )

    await filtres.getByRole('link', { name: 'Approbation', exact: true }).click()
    await expect(page).toHaveURL(/objet=APPROBATION/)
    await expect(
      page.getByRole('navigation', { name: 'Filtrer par type d’objet' }).getByRole('link', {
        name: 'Approbation',
        exact: true,
      }),
    ).toHaveAttribute('aria-current', 'true')
  })

  test('la page ne propose aucune action d’écriture', async ({ page }) => {
    await page.goto('/parametres/journal')

    // Un journal en ajout seul n'a ni bouton de suppression ni formulaire :
    // si l'un apparaissait, il mentirait sur ce que la base autorise.
    // L'ossature de page (thème, langue) en porte un : on ne regarde que
    // le contenu de l'écran.
    const contenu = page.getByRole('main')
    await expect(contenu.locator('form')).toHaveCount(0)
    await expect(contenu.getByRole('button')).toHaveCount(0)
  })
})

test.describe('trace d’un geste réel', () => {
  // Ce test écrit, et il tourne dans les quatre configurations : chacune
  // crée **sa** communication, donc les passes ne se marchent pas dessus.
  // C'est aussi lui qui capture l'écran, une fois le tableau rempli — une
  // capture de l'état vide ne montrerait pas ce qu'il y a à relire.
  test('un changement d’état apparaît dans le journal', async ({ browser }) => {
    const redaction = await browser.newContext({ storageState: COMPTES.parcours.etat })
    const page = await redaction.newPage()

    // La rédactrice crée sa propre communication, puis l'archive : une
    // transition manuelle, donc un geste que le journal doit retenir. Le
    // test ne dépend d'aucune ligne du jeu de démonstration.
    await page.goto('/communications/nouvelle')
    await page
      .getByRole('textbox', { name: 'Titre obligatoire' })
      .fill(`Trace d’audit — ${test.info().project.name}`)
    await page
      .getByRole('combobox', { name: 'Nature obligatoire' })
      .selectOption({ label: 'Livraison' })
    await page.getByRole('radio', { name: /^Importante/ }).check()
    await page
      .getByRole('combobox', { name: 'Portée obligatoire' })
      .selectOption({ label: 'Externe' })
    await page.getByRole('radio', { name: /^Rédaction directe/ }).check()
    await page.getByRole('button', { name: /^Créer et passer à l/ }).click()
    await expect(page).toHaveURL(/\/communications\/(?!nouvelle)[^/]+\/entree$/)

    const identifiant = new URL(page.url()).pathname.split('/').at(-2) ?? ''
    await page.goto(`/communications/${identifiant}`)
    const reference = (
      (await page
        .getByText(/COM-\d{4}-\d{4}/)
        .first()
        .textContent()) ?? ''
    ).trim()
    expect(reference).toMatch(/COM-\d{4}-\d{4}/)

    await page.getByRole('button', { name: 'Archiver' }).click()
    await expect(page.getByText('Archivée').first()).toBeVisible()
    await redaction.close()

    const audit = await browser.newContext({ storageState: COMPTES.auditeur.etat })
    const lecture = await audit.newPage()
    await lecture.goto('/parametres/journal?objet=COMMUNICATION')

    const ligne = lecture.getByRole('row').filter({ hasText: reference }).first()
    await expect(ligne).toBeVisible()
    await expect(ligne).toContainText('Changement d’état')
    await expect(ligne).toContainText('ARCHIVEE')
    await expect(ligne).toContainText(COMPTES.parcours.courriel)

    await lecture.goto('/parametres/journal')
    await expect(lecture.getByRole('row').nth(1)).toBeVisible()
    await lecture.screenshot({
      path: fileURLToPath(
        new URL(`./captures/${test.info().project.name}/journal-audit.png`, import.meta.url),
      ),
      animations: 'disabled',
      fullPage: true,
    })
    await audit.close()
  })
})
