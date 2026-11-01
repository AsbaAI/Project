import { type Connexion, ouvrirConnexion } from '@comgen/db'
import { URL_BASE_DE_TEST, clientDeTest } from '@comgen/db/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ErreurAutorisation } from '@/server/auth/droits'

import { creerCommunication } from './communications'
import { annulerEnvoi, confirmerEnvoi, planifierEnvoi } from './envoi'
import { ErreurMetier } from './erreurs'
import { choisirDestinataires } from './generation'
import { type Organisation, organisation } from './test/outils'

let connexion: Connexion
let org: Organisation

beforeAll(async () => {
  connexion = ouvrirConnexion({ url: URL_BASE_DE_TEST, connexionsMax: 4 })
  org = await organisation(connexion)
})

afterAll(async () => {
  await connexion.fermer()
})

async function erreurMetier(promesse: Promise<unknown>): Promise<ErreurMetier> {
  try {
    await promesse
  } catch (erreur) {
    if (erreur instanceof ErreurMetier) return erreur
    throw erreur
  }
  throw new Error('La promesse aurait dû échouer')
}

/** Une communication approuvée ; `destinataires` : les adresses de la liste du persona. */
async function approuvee(destinataires: string[] | null) {
  const db = clientDeTest(connexion)
  const { id } = await creerCommunication(org.redacteur, {
    titre: 'Maintenance planifiée',
    nature: 'CHANGE',
    criticite: 'COURANTE',
    portee: 'INTER_ORG',
    langue: 'fr',
    dateEffet: '2026-10-14T22:00',
    modeEntree: 'TEXTE_SAISI',
  })
  await choisirDestinataires(org.redacteur, { communicationId: id, personaIds: [org.personaId] })
  await db.listeDiffusion.deleteMany({ where: { personaId: org.personaId } })
  if (destinataires !== null) {
    await db.listeDiffusion.create({
      data: {
        organisationId: org.organisationId,
        regionId: org.regionId,
        nom: 'Liste de test',
        type: 'STATIQUE',
        definition: {
          destinataires: destinataires.map((courriel) => ({ nom: courriel, courriel })),
        },
        exclusions: [],
        personaId: org.personaId,
      },
    })
  }
  const variante = await db.variante.findFirstOrThrow({ where: { communicationId: id } })
  await db.variante.update({ where: { id: variante.id }, data: { etat: 'APPROUVEE' } })
  await db.communication.update({ where: { id }, data: { etat: 'APPROUVEE' } })
  await db.approbation.create({
    data: {
      organisationId: org.organisationId,
      communicationId: id,
      varianteId: variante.id,
      utilisateurId: org.approbateurId,
      regime: 'APPROBATION',
      decision: 'APPROUVEE',
      decideLe: new Date(),
    },
  })
  return { id }
}

describe('envoi', () => {
  it('est réservé à qui peut envoyer', async () => {
    const { id } = await approuvee(['a@exemple.test'])
    await expect(planifierEnvoi(org.redacteur, id)).rejects.toBeInstanceOf(ErreurAutorisation)
  })

  it('planifie, puis confirme : l’envoi est une SIMULATION, jamais « remis »', async () => {
    const { id } = await approuvee(['a@exemple.test', 'B@exemple.test', 'b@exemple.test'])
    expect(await planifierEnvoi(org.approbateur, id)).toEqual({ envois: 1 })

    const db = clientDeTest(connexion)
    expect((await db.communication.findUniqueOrThrow({ where: { id } })).etat).toBe(
      'ENVOI_PLANIFIE',
    )
    let envoi = await db.envoi.findFirstOrThrow({ where: { variante: { communicationId: id } } })
    // Effectif dédoublonné (casse comprise) ; les adresses ne sont pas gardées.
    expect(envoi.destinataires).toEqual({ effectif: 2, listes: ['Liste de test'] })
    expect(JSON.stringify(envoi.destinataires)).not.toContain('@')
    expect(envoi).toMatchObject({ annulable: true, envoyeLe: null })

    await confirmerEnvoi(org.approbateur, id)
    expect((await db.communication.findUniqueOrThrow({ where: { id } })).etat).toBe('ENVOYEE')
    envoi = await db.envoi.findFirstOrThrow({ where: { variante: { communicationId: id } } })
    expect(envoi.etatRemise).toMatchObject({ mode: 'SIMULATION', remis: false })
    expect(envoi).toMatchObject({ annulable: false })
    expect(envoi.envoyeLe).not.toBeNull()
  })

  it('refuse sans liste de diffusion résolue, ou avec une liste vide', async () => {
    const sans = await approuvee(null)
    expect((await erreurMetier(planifierEnvoi(org.approbateur, sans.id))).details.motifs).toContain(
      'LISTE_DIFFUSION_NON_RESOLUE',
    )
    const vide = await approuvee([])
    expect((await erreurMetier(planifierEnvoi(org.approbateur, vide.id))).details.motifs).toContain(
      'LISTE_DIFFUSION_VIDE',
    )
    expect(
      await clientDeTest(connexion).envoi.count({
        where: { variante: { communicationId: vide.id } },
      }),
    ).toBe(0)
  })

  it('annule dans la fenêtre : les envois disparaissent, la communication reste approuvée', async () => {
    const { id } = await approuvee(['a@exemple.test'])
    await planifierEnvoi(org.approbateur, id)
    await annulerEnvoi(org.approbateur, id)
    const db = clientDeTest(connexion)
    expect((await db.communication.findUniqueOrThrow({ where: { id } })).etat).toBe('APPROUVEE')
    expect(await db.envoi.count({ where: { variante: { communicationId: id } } })).toBe(0)
  })

  it('n’envoie qu’une communication approuvée, et ne confirme qu’un envoi planifié', async () => {
    const { id } = await approuvee(['a@exemple.test'])
    expect((await erreurMetier(confirmerEnvoi(org.approbateur, id))).code).toBe('ETAT_INCOMPATIBLE')
    await clientDeTest(connexion).communication.update({
      where: { id },
      data: { etat: 'EN_CONTROLE' },
    })
    expect((await erreurMetier(planifierEnvoi(org.approbateur, id))).code).toBe('ETAT_INCOMPATIBLE')
  })
})
