/* oxlint-disable eslint/no-await-in-loop -- une seule page visite les routes une à une : la navigation est séquentielle par nature. */
import { expect, test } from '@playwright/test'

import { COMPTES } from './environnement'
import { attendreRendu } from './outils'

/*
 * Balayage de bout en bout.
 *
 * Chaque écran, pour chaque rôle : la réponse est servie, la page porte un
 * titre et un seul, et rien n'échoue dans la console. Un refus de droit ou
 * une communication d'une autre organisation sont des réponses, pas des
 * pannes — on les vérifie donc ici au même titre que les écrans ouverts.
 *
 * Les identifiants diffèrent par compte : une communication d'une autre
 * organisation vaut 404, ce qui n'apprendrait rien sur l'écran visé.
 */
interface Cas {
  readonly etat: string
  /** Communications de l'organisation du compte : revue, revue, génération. */
  readonly coms: readonly [string, string, string]
}

const CAS: Record<string, Cas> = {
  redactrice: {
    etat: COMPTES.redactrice.etat,
    coms: ['com_2026_0001', 'com_2026_0002', 'com_2026_0031'],
  },
  administratrice: {
    etat: COMPTES.administratrice.etat,
    coms: ['com_2026_0001', 'com_2026_0002', 'com_2026_0031'],
  },
  parcours: {
    etat: COMPTES.parcours.etat,
    coms: ['com_2026_0006', 'com_2026_0015', 'com_2026_0009'],
  },
}

function routes({ coms }: Cas): readonly string[] {
  const [revue, autre, generee] = coms
  return [
    '/',
    '/generateur',
    '/communications',
    '/communications/nouvelle',
    `/communications/${revue}`,
    `/communications/${revue}/entree`,
    `/communications/${revue}/entree/itsm`,
    `/communications/${revue}/faits`,
    `/communications/${revue}/destinataires`,
    `/communications/${autre}`,
    `/communications/${autre}/faits`,
    `/communications/${generee}/generation`,
    '/approbations',
    '/tableau-de-bord',
    '/gabarits',
    '/gabarits/constructeur',
    '/analyses',
    '/parametres',
    '/parametres/agents',
    '/parametres/modeles',
    '/parametres/personas',
    '/parametres/listes',
    '/parametres/itsm',
    '/design',
  ]
}

for (const [nom, cas] of Object.entries(CAS)) {
  test.describe(nom, () => {
    test.use({ storageState: cas.etat })

    test(`balayage — ${nom}`, async ({ page }, info) => {
      test.setTimeout(240_000)
      const problemes: string[] = []
      let courante = ''

      page.on('response', (reponse) => {
        if (reponse.status() >= 400) {
          problemes.push(`${courante} → ressource ${String(reponse.status())} : ${reponse.url()}`)
        }
      })
      page.on('console', (message) => {
        if (message.type() === 'error') problemes.push(`${courante} → console : ${message.text()}`)
      })
      page.on('pageerror', (erreur) => problemes.push(`${courante} → script : ${erreur.message}`))

      for (const route of routes(cas)) {
        courante = route
        const reponse = await page.goto(route)
        const statut = reponse?.status() ?? 0
        if (statut !== 200) problemes.push(`${route} → HTTP ${String(statut)}`)
        await attendreRendu(page)
        const titres = await page.getByRole('heading', { level: 1 }).count()
        if (titres !== 1) problemes.push(`${route} → ${String(titres)} <h1>`)
      }

      expect(problemes, `compte ${nom} (${info.project.name})`).toEqual([])
    })
  })
}
