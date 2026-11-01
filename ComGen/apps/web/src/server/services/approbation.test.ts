import { type Connexion, ouvrirConnexion } from '@comgen/db'
import { URL_BASE_DE_TEST, clientDeTest } from '@comgen/db/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ErreurAutorisation } from '@/server/auth/droits'

import { chargerApprobations, decider, soumettreALApprobation } from './approbation'
import { creerCommunication } from './communications'
import { ErreurMetier } from './erreurs'
import { choisirDestinataires } from './generation'
import { type Organisation, organisation, utilisateurAvecRoles } from './test/outils'

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

/** Une communication contrôlée : une variante conforme, prête à soumettre. */
async function controlee(criticite: 'COURANTE' | 'IMPORTANTE' = 'COURANTE') {
  const { id } = await creerCommunication(org.redacteur, {
    titre: 'Maintenance planifiée',
    nature: 'CHANGE',
    criticite,
    portee: 'INTER_ORG',
    langue: 'fr',
    dateEffet: '2026-10-14T22:00',
    modeEntree: 'TEXTE_SAISI',
  })
  await choisirDestinataires(org.redacteur, { communicationId: id, personaIds: [org.personaId] })
  const db = clientDeTest(connexion)
  const variante = await db.variante.findFirstOrThrow({ where: { communicationId: id } })
  await db.variante.update({ where: { id: variante.id }, data: { etat: 'CONFORME' } })
  await db.communication.update({ where: { id }, data: { etat: 'EN_CONTROLE' } })
  return { id, varianteId: variante.id }
}

describe('soumettreALApprobation', () => {
  it('est réservé à qui peut soumettre', async () => {
    const { id } = await controlee()
    await expect(soumettreALApprobation(org.approbateur, id)).rejects.toBeInstanceOf(
      ErreurAutorisation,
    )
  })

  it('désigne les approbateurs du persona et passe en approbation', async () => {
    const { id, varianteId } = await controlee()
    expect(await soumettreALApprobation(org.redacteur, id)).toEqual({ approbateurs: 1 })

    const db = clientDeTest(connexion)
    expect((await db.communication.findUniqueOrThrow({ where: { id } })).etat).toBe(
      'EN_APPROBATION',
    )
    const lignes = await db.approbation.findMany({ where: { communicationId: id } })
    expect(lignes).toHaveLength(1)
    expect(lignes[0]).toMatchObject({
      varianteId,
      utilisateurId: org.approbateurId,
      decision: 'EN_ATTENTE',
      regime: 'APPROBATION',
    })
  })

  it('refuse une variante non conforme, ou des contrôles bloquants ouverts', async () => {
    const { id, varianteId } = await controlee()
    const db = clientDeTest(connexion)
    await db.variante.update({ where: { id: varianteId }, data: { etat: 'BLOQUEE' } })
    const erreur = await erreurMetier(soumettreALApprobation(org.redacteur, id))
    expect(erreur.details.motifs).toContain('CONTROLE_BLOQUANT_NON_RESOLU')
    expect((await db.communication.findUniqueOrThrow({ where: { id } })).etat).toBe('EN_CONTROLE')
  })

  it('refuse quand il n’y a pas assez d’approbateurs pour la criticité, sans rien écrire', async () => {
    // IMPORTANTE exige deux approbations ; le persona n'en désigne qu'un.
    const { id } = await controlee('IMPORTANTE')
    const erreur = await erreurMetier(soumettreALApprobation(org.redacteur, id))
    expect(erreur.details.motifs).toContain('APPROBATIONS_INSUFFISANTES')
    const db = clientDeTest(connexion)
    expect(await db.approbation.count({ where: { communicationId: id } })).toBe(0)
    expect((await db.communication.findUniqueOrThrow({ where: { id } })).etat).toBe('EN_CONTROLE')
  })

  it('refuse hors EN_CONTROLE', async () => {
    const { id } = await controlee()
    await clientDeTest(connexion).communication.update({
      where: { id },
      data: { etat: 'BROUILLON' },
    })
    expect((await erreurMetier(soumettreALApprobation(org.redacteur, id))).code).toBe(
      'ETAT_INCOMPATIBLE',
    )
  })
})

describe('decider', () => {
  it('approuve : la communication est APPROUVEE et la variante aussi', async () => {
    const { id, varianteId } = await controlee()
    await soumettreALApprobation(org.redacteur, id)

    expect(await decider(org.approbateur, { communicationId: id, decision: 'APPROUVEE' })).toEqual({
      etat: 'APPROUVEE',
    })
    const db = clientDeTest(connexion)
    expect((await db.communication.findUniqueOrThrow({ where: { id } })).etat).toBe('APPROUVEE')
    expect((await db.variante.findUniqueOrThrow({ where: { id: varianteId } })).etat).toBe(
      'APPROUVEE',
    )
  })

  it('rejette avec un motif, et exige ce motif', async () => {
    const { id } = await controlee()
    await soumettreALApprobation(org.redacteur, id)

    const sansMotif = await erreurMetier(
      decider(org.approbateur, { communicationId: id, decision: 'REJETEE', commentaire: ' ' }),
    )
    expect(sansMotif.details.champs).toMatchObject({ commentaire: 'requis' })

    expect(
      await decider(org.approbateur, {
        communicationId: id,
        decision: 'REJETEE',
        commentaire: 'La date est fausse',
      }),
    ).toEqual({ etat: 'REJETEE' })
    const ligne = await clientDeTest(connexion).approbation.findFirstOrThrow({
      where: { communicationId: id },
    })
    expect(ligne).toMatchObject({ decision: 'REJETEE', commentaire: 'La date est fausse' })
  })

  it('n’approuve qu’au quota : une approbation sur deux laisse la communication en attente', async () => {
    const second = await utilisateurAvecRoles(connexion, org, ['APPROBATEUR'])
    const persona = await clientDeTest(connexion).persona.create({
      data: {
        organisationId: org.organisationId,
        regionId: org.regionId,
        nom: `Persona à deux approbateurs ${Date.now()}`,
        voix: {},
        lexique: {},
        gardeFous: {},
        exemples: [],
        canalDefaut: 'COURRIEL',
        approbateurIds: [org.approbateurId, second.utilisateur.id],
      },
    })
    const { id, varianteId } = await controlee('IMPORTANTE')
    await clientDeTest(connexion).variante.update({
      where: { id: varianteId },
      data: { personaId: persona.id },
    })
    await soumettreALApprobation(org.redacteur, id)

    expect(
      (await decider(org.approbateur, { communicationId: id, decision: 'APPROUVEE' })).etat,
    ).toBe('EN_APPROBATION')
    expect((await decider(second, { communicationId: id, decision: 'APPROUVEE' })).etat).toBe(
      'APPROUVEE',
    )
  })

  it('l’auteur n’approuve pas sa propre communication, et un tiers non désigné non plus', async () => {
    const { id } = await controlee()
    await soumettreALApprobation(org.redacteur, id)
    await expect(
      decider(org.redacteur, { communicationId: id, decision: 'APPROUVEE' }),
    ).rejects.toBeInstanceOf(ErreurAutorisation)

    const intrus = await utilisateurAvecRoles(connexion, org, ['APPROBATEUR'])
    const erreur = await erreurMetier(
      decider(intrus, { communicationId: id, decision: 'APPROUVEE' }),
    )
    expect(erreur.code).toBe('ETAT_INCOMPATIBLE')
    expect(
      (await clientDeTest(connexion).communication.findUniqueOrThrow({ where: { id } })).etat,
    ).toBe('EN_APPROBATION')
  })

  it('ne décide qu’une communication en approbation', async () => {
    const { id } = await controlee()
    expect(
      (await erreurMetier(decider(org.approbateur, { communicationId: id, decision: 'APPROUVEE' })))
        .code,
    ).toBe('ETAT_INCOMPATIBLE')
  })

  it('une écriture de contenu annule l’approbation et ramène en contrôle', async () => {
    const { id, varianteId } = await controlee()
    await soumettreALApprobation(org.redacteur, id)
    await decider(org.approbateur, { communicationId: id, decision: 'APPROUVEE' })

    // Écriture de contenu : par le contexte, seul chemin autorisé (§7).
    await org.redacteur.contexte.ecrireContenuVariante({
      varianteId,
      contenu: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texte modifié' }] }],
      },
      origine: 'EDITEE',
      auteurId: org.redacteur.utilisateur.id,
    })
    const db = clientDeTest(connexion)
    expect((await db.communication.findUniqueOrThrow({ where: { id } })).etat).toBe('EN_CONTROLE')
    expect(
      await db.approbation.count({
        where: { communicationId: id, annuleeLe: null, decision: 'APPROUVEE' },
      }),
    ).toBe(0)
  })
})

describe('chargerApprobations', () => {
  it('montre ce qui attend MA décision, avec le quota, puis l’historique', async () => {
    const { id } = await controlee()
    await soumettreALApprobation(org.redacteur, id)

    const avant = await chargerApprobations(org.approbateur)
    const ligne = avant.enAttente.find((c) => c.communicationId === id)
    expect(ligne).toMatchObject({ variantes: 1, accordees: 0, requises: 1 })
    expect(
      (await chargerApprobations(org.redacteur)).enAttente.some((c) => c.communicationId === id),
    ).toBe(false)

    await decider(org.approbateur, {
      communicationId: id,
      decision: 'APPROUVEE',
      commentaire: 'OK',
    })
    const apres = await chargerApprobations(org.approbateur)
    expect(apres.enAttente.some((c) => c.communicationId === id)).toBe(false)
    expect(apres.historique.find((d) => d.communicationId === id)).toMatchObject({
      decision: 'APPROUVEE',
      commentaire: 'OK',
    })
  })
})
