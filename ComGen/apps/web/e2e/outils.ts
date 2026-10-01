import { type Page, expect, test } from '@playwright/test'

/**
 * Pages capturées et auditées dans les quatre configurations, vues par la
 * rédactrice Helvea sur le jeu de démonstration. COM-2026-0002 porte une
 * contradiction non résolue ; COM-2026-0001 est en cours de revue.
 */
export const PAGES = [
  { nom: 'accueil', chemin: '/' },
  { nom: 'tableau-de-bord', chemin: '/tableau-de-bord' },
  { nom: 'communications', chemin: '/communications' },
  { nom: 'cadrage', chemin: '/communications/nouvelle' },
  { nom: 'communication', chemin: '/communications/com_2026_0002' },
  { nom: 'entree', chemin: '/communications/com_2026_0001/entree' },
  { nom: 'fiche-de-faits', chemin: '/communications/com_2026_0002/faits' },
  { nom: 'fiche-de-faits-revue', chemin: '/communications/com_2026_0001/faits' },
  { nom: 'analyses', chemin: '/analyses' },
  { nom: 'parametres', chemin: '/parametres' },
  { nom: 'design', chemin: '/design' },
] as const

/** Session vide : pages vues sans être connecté. */
export const SANS_SESSION = { cookies: [], origins: [] }

/** Attend que les polices auto-hébergées soient chargées : sans cela, la capture montre la police de repli. */
export async function attendreRendu(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

/** Aucune page ne doit provoquer de défilement horizontal, sur aucun gabarit. */
export async function verifierAucunDebordement(page: Page) {
  const debordement = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(debordement, 'débordement horizontal (px)').toBeLessThanOrEqual(0)
}

export function estTelephone(): boolean {
  return test.info().project.name.startsWith('telephone')
}
