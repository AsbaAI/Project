/* oxlint-disable eslint/no-await-in-loop -- confirmer un fait puis attendre
 * que la liste rétrécisse est séquentiel par nature : c'est le geste humain
 * qu'on reproduit, un fait après l'autre. */
import { fileURLToPath } from 'node:url'

import { AxeBuilder } from '@axe-core/playwright'
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

/** `e2e/captures/<projet>/<nom>.png`, relu avant de déclarer l'écran fini. */
async function capturer(page: Page, nom: string, pleinePage = false) {
  await page.screenshot({
    path: fileURLToPath(
      new URL(`./captures/${test.info().project.name}/${nom}.png`, import.meta.url),
    ),
    animations: 'disabled',
    fullPage: pleinePage,
  })
}

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
  await page.getByRole('button', { name: 'Confirmer', exact: true }).first().click()
  await expect(aRevoir).toHaveCount(avant - 1)
})

test('les faits restants se confirment d’un seul geste, sans toucher aux contradictions', async ({
  page,
}) => {
  await cadrer(page, 'Track & Trace 3.9.2 — revue en lot', 'Rédaction directe')
  await page
    .getByRole('textbox', { name: 'Intitulé de la source obligatoire' })
    .fill('Annonce de maintenance')
  await page.getByRole('textbox', { name: 'Texte obligatoire' }).fill(TEXTE_SOURCE)
  await page.getByRole('button', { name: 'Enregistrer la source' }).click()
  await expect(page).toHaveURL(/\/faits$/)
  await attendreRendu(page)

  const aRevoir = page.getByText('À revoir', { exact: true })
  const avant = await aRevoir.count()
  expect(avant).toBeGreaterThan(1)

  // Le bouton annonce le nombre exact de faits qu'il confirmera.
  const bouton = page.getByRole('button', { name: new RegExp(`Confirmer les ${String(avant)} `) })
  await expect(bouton).toBeVisible()
  await bouton.click()

  await expect(page.getByText(`${String(avant)} faits confirmés`)).toBeVisible()
  await expect(aRevoir).toHaveCount(0)
  // Le bouton disparaît : il n'y a plus rien à confirmer.
  await expect(page.getByRole('button', { name: /^Confirmer les? /u })).toHaveCount(0)
})

test('dépôt de fichier : le résultat est rendu fichier par fichier', async ({ page }) => {
  await cadrer(page, 'Track & Trace 3.9.2 — note de version', 'Dépôt de fichiers')

  await page.getByLabel(/^Fichiers/).setInputFiles([
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

test('de la source au texte généré : chaque valeur vient de la source, mot pour mot', async ({
  page,
}) => {
  await cadrer(page, 'Track & Trace 3.9.2 — génération complète', 'Rédaction directe')

  // 2. La source, saisie telle quelle.
  await page
    .getByRole('textbox', { name: 'Intitulé de la source obligatoire' })
    .fill('Annonce de déploiement')
  await page.getByRole('textbox', { name: 'Texte obligatoire' }).fill(TEXTE_SOURCE)
  // Le persona de ce parcours est plafonné à PUBLIC : le GARDIEN bloquerait
  // des faits INTERNE. C'est son rôle (testé à part) ; ici on vérifie
  // l'ancrage, donc la source est publique.
  await page
    .locator('form', { has: page.getByRole('textbox', { name: 'Texte obligatoire' }) })
    .getByRole('combobox', { name: /Confidentialité des sources/ })
    .selectOption('PUBLIC')
  await page.getByRole('button', { name: 'Enregistrer la source' }).click()
  await expect(page).toHaveURL(/\/faits$/)
  await attendreRendu(page)

  // Trois agents ont lu la source, et la fiche le dit — simulés, et c'est écrit.
  await expect(page.getByText('Lue par')).toBeVisible()
  await expect(page.getByText('Extracteur').first()).toBeVisible()
  await expect(page.getByText("Analyste d'impact").first()).toBeVisible()
  await expect(page.getByText('Suggesteur').first()).toBeVisible()
  await expect(page.getByText('simulé').first()).toBeVisible()

  // Le suggesteur lit « fenêtre de maintenance » : un changement. Le cadrage
  // dit « Livraison ». L'écart est signalé, avec la phrase qui le motive — et
  // le cadrage, lui, n'a pas bougé.
  await expect(
    page.getByText('Le cadrage et la lecture de la source ne se rejoignent pas'),
  ).toBeVisible()
  await expect(
    page.getByText(/Nature\s*: cadrage «\s*Livraison\s*», lecture «\s*Changement/),
  ).toBeVisible()
  await expect(page.getByText('Livraison').first()).toBeVisible()
  await capturer(page, 'fiche-lecture-agents', true)

  // 3. La revue de la fiche de faits n'est pas sautable : tant qu'un fait
  // reste à revoir, l'étape suivante n'est pas atteignable.
  const assistant = page.getByRole('navigation', { name: 'Étapes de la génération' })
  await expect(assistant.getByRole('link', { name: /Destinataires/ })).toHaveCount(0)

  const confirmer = page.getByRole('button', { name: 'Confirmer', exact: true })
  let restants = await confirmer.count()
  while (restants > 0) {
    await confirmer.first().click()
    await expect(confirmer).toHaveCount(restants - 1)
    restants -= 1
  }

  // 4. Les destinataires : une audience retenue, une version à produire.
  await assistant.getByRole('link', { name: /Destinataires/ }).click()
  await expect(page).toHaveURL(/\/destinataires$/)
  await attendreRendu(page)

  // La source nomme « les clients » ; aucun persona de cette organisation ne
  // porte ce nom. L'écran le dit au lieu de le taire, et ne coche rien.
  await expect(
    page.getByText('La source nomme des audiences sans destinataire correspondant'),
  ).toBeVisible()
  // La phrase citée est la première qui nomme l'audience.
  await expect(page.getByText(/Clients — «\s*Pendant la mise à jour/)).toBeVisible()
  await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(0)
  await capturer(page, 'destinataires-audiences', true)

  await page.getByRole('checkbox').first().check()
  await page.getByRole('button', { name: 'Enregistrer les destinataires' }).click()
  await attendreRendu(page)

  // 5. La génération. La fiche doit d'abord être déclarée validée : c'est
  // la revue obligatoire de §10, et elle se déclare depuis l'aperçu.
  await assistant.getByRole('link', { name: /Cadrage/ }).click()
  await attendreRendu(page)
  await page.getByRole('button', { name: 'Déclarer la fiche validée' }).click()
  await attendreRendu(page)

  await assistant.getByRole('link', { name: /Génération/ }).click()
  await expect(page).toHaveURL(/\/generation$/)
  await page.getByRole('button', { name: 'Générer cette version' }).click()

  // 6. Les agents travaillent, et on les voit travailler. Le serveur dit
  // d'abord qui répond, puis l'état de chacun au fil de l'eau.
  const chronologie = page.getByRole('region', { name: 'Agents au travail' })
  await expect(chronologie).toBeVisible()
  await expect(chronologie.getByText(/Mode démonstration\s*:\s*aucun modèle/)).toBeVisible()
  await expect(chronologie.getByText('Rédacteur', { exact: true })).toBeVisible()
  await expect(chronologie.getByText('Vérificateur', { exact: true })).toBeVisible()
  await expect(chronologie.getByText('En cours', { exact: true })).toBeVisible()
  // Un agent qui n'a pas commencé n'est pas présenté comme terminé.
  await expect(chronologie.getByText('En attente', { exact: true })).toBeVisible()

  // La chronologie est un écran à part entière : elle se relit comme les
  // autres, et elle passe l'audit tant qu'elle est à l'écran.
  await capturer(page, 'chronologie')
  const audit = await new AxeBuilder({ page })
    .include('[data-agents="chronologie"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze()
  expect(
    audit.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id} : ${v.help}`),
    'violations graves ou critiques sur la chronologie',
  ).toEqual([])

  // Un agent terminé dit combien de temps il a pris, et le suivant prend le
  // relais : le filet de marque a avancé d'un cran.
  await expect(chronologie.getByText(/Terminé · \d+(?:[.,]\d)? s/)).toBeVisible()
  await capturer(page, 'chronologie-avancee')

  // 7. Le texte produit porte les valeurs de la source, telles qu'elles y
  // sont écrites. C'est la contrainte cardinale, vue depuis l'écran. Le
  // délai est celui de deux agents échelonnés, pas celui d'un clic.
  //
  // On lit le rapport phrase par phrase, et pas `main` : le titre de la
  // communication porte lui aussi « 3.9.2 », et une assertion qui tombe
  // dessus passerait même sans texte généré.
  const principal = page.getByRole('main')
  const rapport = principal.getByRole('list').filter({ hasText: 'Appuyée' }).first()
  const ATTENTE = { timeout: 20_000 }
  await expect(rapport.getByText('3.9.2', { exact: false }).first()).toBeVisible(ATTENTE)
  await expect(rapport.getByText('12 novembre 2026', { exact: false }).first()).toBeVisible()
  await expect(rapport.getByText('45 minutes', { exact: false }).first()).toBeVisible()

  // La chronologie s'efface une fois le texte relu depuis le serveur.
  await expect(chronologie).toBeHidden(ATTENTE)

  // Chaque phrase factuelle est appuyée, et le dit.
  await expect(principal.getByText('Toutes les phrases sont appuyées')).toBeVisible()
  await expect(principal.getByText('Appuyée').first()).toBeVisible()
  await expect(principal.getByText('Rédacteur').first()).toBeVisible()
  await expect(principal.getByText('Vérificateur').first()).toBeVisible()
})
