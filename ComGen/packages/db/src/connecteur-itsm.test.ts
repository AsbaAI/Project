import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Connexion } from './connexion.ts'
import { type ContexteDonnees, creerContexte } from './contexte.ts'
import {
  type JeuMinimal,
  clientDeTest,
  creerOrganisation,
  ouvrirConnexionDeTest,
  viderBase,
} from './test/base-de-test.ts'

/*
 * La configuration du connecteur ITSM ne porte aucun secret : seulement le
 * NOM de la variable qui le contient. La base le garantit, pas seulement le
 * code qui écrit : un chemin de code qui l'oublierait ne passerait pas.
 */

let connexion: Connexion
let alpha: JeuMinimal
let beta: JeuMinimal
let contexteAlpha: ContexteDonnees
let contexteBeta: ContexteDonnees

const CONFIG = {
  systeme: 'servicenow',
  urlInstance: 'https://acme.service-now.com',
  methodeAuth: 'oauth2',
  identifiantPublic: 'comgen',
  refSecret: 'ITSM_SERVICENOW_CLIENT_SECRET',
  masquage: {
    courriel: true,
    telephone: true,
    identifiants: [],
    termes: [],
    champs: ['demandeur'],
  },
} as const

beforeAll(async () => {
  connexion = ouvrirConnexionDeTest()
  await viderBase(connexion)
  alpha = await creerOrganisation(connexion, 'alpha')
  beta = await creerOrganisation(connexion, 'beta')
  contexteAlpha = creerContexte(connexion, { organisationId: alpha.organisationId })
  contexteBeta = creerContexte(connexion, { organisationId: beta.organisationId })
})

beforeEach(async () => {
  await clientDeTest(connexion).connecteurItsm.deleteMany({})
})

afterAll(async () => {
  await connexion.fermer()
})

function creer(surcharge: Record<string, unknown> = {}, jeu: JeuMinimal = alpha) {
  return clientDeTest(connexion).connecteurItsm.create({
    data: { ...CONFIG, organisationId: jeu.organisationId, ...surcharge },
  })
}

describe('ConnecteurItsm — ce que la base accepte', () => {
  it('enregistre une configuration valide', async () => {
    const ligne = await creer()
    expect(ligne).toMatchObject({ systeme: 'servicenow', methodeAuth: 'oauth2', actif: true })
    expect(ligne.testeLe).toBeNull()
  })

  it('accepte la méthode Basic', async () => {
    await expect(creer({ methodeAuth: 'basic' })).resolves.toBeDefined()
  })

  it('n’admet qu’une configuration par organisation', async () => {
    await creer()
    await expect(creer()).rejects.toThrow()
    // Une autre organisation a la sienne.
    await expect(creer({}, beta)).resolves.toBeDefined()
  })
})

describe('ConnecteurItsm — ce que la base refuse', () => {
  it.each([
    'AUTH_SECRET',
    'DATABASE_URL',
    'ANTHROPIC_API_KEY',
    'itsm_minuscules',
    'ITSM_',
    'ITSM_AVEC ESPACE',
    'ITSM_ACCENTÉ',
    '',
    `ITSM_${'A'.repeat(61)}`,
  ])(
    'une référence de secret « %s » qui n’est pas une variable ITSM_ dédiée',
    async (reference) => {
      // Sans cette contrainte, la configuration pourrait désigner `AUTH_SECRET` ou
      // `DATABASE_URL` : le connecteur les enverrait à l'instance configurée.
      await expect(creer({ refSecret: reference })).rejects.toThrow()
    },
  )

  it('accepte la plus longue référence admise', async () => {
    await expect(creer({ refSecret: `ITSM_${'A'.repeat(60)}` })).resolves.toBeDefined()
  })

  it('un système qui n’est pas connu', async () => {
    await expect(creer({ systeme: 'jira' })).rejects.toThrow()
  })

  it('une méthode d’authentification qui n’est pas connue', async () => {
    await expect(creer({ methodeAuth: 'kerberos' })).rejects.toThrow()
  })
})

describe('ConnecteurItsm — cloisonnement par organisation', () => {
  it('une configuration est invisible depuis une autre organisation', async () => {
    await creer()
    await expect(contexteBeta.connecteurItsm.findFirst({})).resolves.toBeNull()
    await expect(contexteAlpha.connecteurItsm.findFirst({})).resolves.toMatchObject({
      organisationId: alpha.organisationId,
    })
  })

  it('une configuration créée par un contexte appartient à son organisation', async () => {
    const creee = await contexteBeta.connecteurItsm.create({
      data: { ...CONFIG, organisationId: alpha.organisationId },
    })
    // L'organisation de l'appelant est ignorée : c'est celle du contexte qui compte.
    expect(creee.organisationId).toBe(beta.organisationId)
  })

  it('une configuration ne se modifie pas depuis une autre organisation', async () => {
    const ligne = await creer()
    const modifiees = await contexteBeta.connecteurItsm.updateMany({
      where: { id: ligne.id },
      data: { actif: false },
    })
    expect(modifiees.count).toBe(0)
    expect(
      (await clientDeTest(connexion).connecteurItsm.findUniqueOrThrow({ where: { id: ligne.id } }))
        .actif,
    ).toBe(true)
  })
})
