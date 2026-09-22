import { type Page, expect, test } from '@playwright/test'

/** Pages capturées et auditées dans les quatre configurations. */
export const PAGES = [
  { nom: 'tableau-de-bord', chemin: '/' },
  { nom: 'design', chemin: '/design' },
] as const

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
