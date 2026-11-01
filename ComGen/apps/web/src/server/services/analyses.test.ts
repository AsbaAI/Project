import { type Connexion, ouvrirConnexion } from '@comgen/db'
import { URL_BASE_DE_TEST, clientDeTest } from '@comgen/db/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { chargerAnalyses } from './analyses'
import { creerCommunication } from './communications'
import { type Organisation, organisation } from './test/outils'

let connexion: Connexion
let org: Organisation
let autre: Organisation

beforeAll(async () => {
  connexion = ouvrirConnexion({ url: URL_BASE_DE_TEST, connexionsMax: 4 })
  org = await organisation(connexion)
  autre = await organisation(connexion)
})

afterAll(async () => {
  await connexion.fermer()
})

const CADRAGE = {
  titre: 'Maintenance planifiée',
  nature: 'CHANGE',
  criticite: 'COURANTE',
  portee: 'INTER_ORG',
  langue: 'fr',
  dateEffet: '2026-10-14T22:00',
  modeEntree: 'TEXTE_SAISI',
} as const

describe('chargerAnalyses', () => {
  it('une organisation sans activité n’a aucune mesure, pas des zéros qui passent pour une mesure', async () => {
    const analyses = await chargerAnalyses(autre.redacteur)
    expect(analyses).toMatchObject({
      total: 0,
      tauxApprobation: null,
      delaiMedianHeures: null,
      envois: { total: 0 },
    })
  })

  it('compte par état et par origine, dans son organisation seulement', async () => {
    await creerCommunication(org.redacteur, CADRAGE)
    await creerCommunication(org.redacteur, { ...CADRAGE, modeEntree: 'FICHIER' })
    const analyses = await chargerAnalyses(org.redacteur)
    expect(analyses.total).toBe(2)
    expect(analyses.parEtat).toEqual({ BROUILLON: 2 })
    expect(analyses.parOrigine).toEqual({ TEXTE_SAISI: 1, FICHIER: 1 })
    expect((await chargerAnalyses(autre.redacteur)).total).toBe(0)
  })

  it('mesure le taux d’approbation et distingue les envois simulés des remis', async () => {
    const { id } = await creerCommunication(org.redacteur, CADRAGE)
    const db = clientDeTest(connexion)
    const modele = {
      organisationId: org.organisationId,
      communicationId: id,
      utilisateurId: org.approbateurId,
      regime: 'APPROBATION' as const,
      decideLe: new Date(),
    }
    await db.approbation.createMany({
      data: [
        { ...modele, decision: 'APPROUVEE' },
        { ...modele, decision: 'APPROUVEE' },
        { ...modele, decision: 'REJETEE' },
      ],
    })
    const analyses = await chargerAnalyses(org.redacteur)
    expect(analyses.decisions).toEqual({ approuvees: 2, rejetees: 1 })
    expect(analyses.tauxApprobation).toBeCloseTo(2 / 3)
  })
})
