import { type Connexion, ouvrirConnexion } from '@comgen/db'
import { URL_BASE_DE_TEST, clientDeTest } from '@comgen/db/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ErreurAutorisation } from '@/server/auth/droits'

import {
  changerEtat,
  chargerCommunication,
  chargerTableauDeBord,
  creerCommunication,
  listerCommunications,
} from './communications'
import { ErreurMetier } from './erreurs'
import { saisirTexte } from './sources'
import { type Organisation, organisation, utilisateurAvecRoles } from './test/outils'

let connexion: Connexion
let helvea: Organisation
let autre: Organisation

beforeAll(async () => {
  connexion = ouvrirConnexion({ url: URL_BASE_DE_TEST, connexionsMax: 4 })
  helvea = await organisation(connexion)
  autre = await organisation(connexion)
})

afterAll(async () => {
  await connexion.fermer()
})

const CADRAGE = {
  titre: 'Migration du portail vers la version 4.2',
  nature: 'CHANGE',
  criticite: 'IMPORTANTE',
  portee: 'INTER_ORG',
  langue: 'fr',
  dateEffet: '2026-10-14T22:00',
  modeEntree: 'FICHIER',
} as const

async function erreurDe(promesse: Promise<unknown>): Promise<unknown> {
  try {
    await promesse
  } catch (erreur) {
    return erreur
  }
  throw new Error('La promesse aurait dû échouer')
}

async function codeDe(promesse: Promise<unknown>): Promise<string> {
  const erreur = await erreurDe(promesse)
  if (erreur instanceof ErreurMetier) return erreur.code
  throw erreur
}

describe('cadrage', () => {
  it('crée un brouillon référencé, daté en UTC depuis le fuseau de l’organisation', async () => {
    const { id, reference } = await creerCommunication(helvea.redacteur, CADRAGE)
    expect(reference).toMatch(/^COM-\d{4}-\d{4}$/)

    const ligne = await clientDeTest(connexion).communication.findUniqueOrThrow({ where: { id } })
    expect(ligne).toMatchObject({
      etat: 'BROUILLON',
      auteurId: helvea.redacteurId,
      organisationId: helvea.organisationId,
      regionId: helvea.regionId,
      modeEntree: 'FICHIER',
      parentId: null,
    })
    // Europe/Paris en octobre : UTC+2.
    expect(ligne.dateEffet?.toISOString()).toBe('2026-10-14T20:00:00.000Z')
  })

  it('refuse la création à qui n’a pas le droit CREER, quel que soit son autre rôle', async () => {
    const erreur = await erreurDe(creerCommunication(helvea.approbateur, CADRAGE))
    expect(erreur).toBeInstanceOf(ErreurAutorisation)
  })

  it('rend tous les champs invalides d’un coup, avec un code par champ', async () => {
    const erreur = await erreurDe(
      creerCommunication(helvea.redacteur, {
        ...CADRAGE,
        titre: 'ab',
        nature: 'INVENTEE' as never,
      }),
    )
    expect(erreur).toBeInstanceOf(ErreurMetier)
    expect((erreur as ErreurMetier).details.champs).toMatchObject({
      titre: 'trop_court',
      nature: 'requis',
    })
  })

  it('refuse un mode d’entrée non livré plutôt que de créer une communication sans entrée', async () => {
    const erreur = (await erreurDe(
      creerCommunication(helvea.redacteur, { ...CADRAGE, modeEntree: 'CONNECTEUR' }),
    )) as ErreurMetier
    expect(erreur.details.champs).toEqual({ modeEntree: 'mode_non_disponible' })
  })

  it('refuse une heure ambiguë au changement d’heure au lieu de choisir', async () => {
    const erreur = (await erreurDe(
      creerCommunication(helvea.redacteur, { ...CADRAGE, dateEffet: '2026-10-25T02:30' }),
    )) as ErreurMetier
    expect(erreur.details.champs).toEqual({ dateEffet: 'heure_ambigue' })
  })

  it('exige l’intention quand un rattachement est demandé', async () => {
    const parent = await creerCommunication(helvea.redacteur, CADRAGE)
    const erreur = (await erreurDe(
      creerCommunication(helvea.redacteur, { ...CADRAGE, parentId: parent.id }),
    )) as ErreurMetier
    expect(erreur.details.champs).toEqual({ intentionReprise: 'requis' })

    const reprise = await creerCommunication(helvea.redacteur, {
      ...CADRAGE,
      parentId: parent.id,
      intentionReprise: 'CORRECTIF',
    })
    const ligne = await clientDeTest(connexion).communication.findUniqueOrThrow({
      where: { id: reprise.id },
    })
    expect(ligne).toMatchObject({ parentId: parent.id, intentionReprise: 'CORRECTIF' })
  })

  it('ne rattache jamais à une communication d’une autre organisation', async () => {
    const etrangere = await creerCommunication(autre.redacteur, CADRAGE)
    const erreur = (await erreurDe(
      creerCommunication(helvea.redacteur, {
        ...CADRAGE,
        parentId: etrangere.id,
        intentionReprise: 'CORRECTIF',
      }),
    )) as ErreurMetier
    expect(erreur.details.champs).toEqual({ parentId: 'parent_introuvable' })
  })
})

describe('cloisonnement par organisation (§13.2, §17)', () => {
  it('la lecture par identifiant d’une communication d’une autre organisation échoue, quel que soit le rôle', async () => {
    const { id } = await creerCommunication(autre.redacteur, CADRAGE)
    const roles = [
      helvea.redacteur,
      helvea.approbateur,
      await utilisateurAvecRoles(connexion, helvea, ['ADMINISTRATEUR']),
      await utilisateurAvecRoles(connexion, helvea, ['AUDITEUR']),
      await utilisateurAvecRoles(connexion, helvea, [
        'REDACTEUR',
        'RELECTEUR',
        'APPROBATEUR',
        'ADMINISTRATEUR',
        'AUDITEUR',
      ]),
    ]
    const codes = await Promise.all(roles.map((a) => codeDe(chargerCommunication(a, id))))
    expect(codes).toEqual(roles.map(() => 'INTROUVABLE'))
  })

  it('aucune écriture ne traverse la frontière d’organisation', async () => {
    const { id } = await creerCommunication(autre.redacteur, CADRAGE)
    expect(await codeDe(changerEtat(helvea.redacteur, id, 'ARCHIVEE'))).toBe('INTROUVABLE')
    expect(
      await codeDe(
        saisirTexte(helvea.redacteur, id, {
          titre: 'Intrusion',
          texte: 'Texte déposé depuis une autre organisation.',
          confidentialite: 'INTERNE',
        }),
      ),
    ).toBe('INTROUVABLE')
    const ligne = await clientDeTest(connexion).communication.findUniqueOrThrow({ where: { id } })
    expect(ligne.etat).toBe('BROUILLON')
  })

  it('la liste ne montre que les communications de l’organisation', async () => {
    await creerCommunication(autre.redacteur, { ...CADRAGE, titre: 'Communication étrangère' })
    const liste = await listerCommunications(helvea.redacteur)
    expect(liste.length).toBeGreaterThan(0)
    expect(liste.some((c) => c.titre === 'Communication étrangère')).toBe(false)
    const ids = new Set(
      (
        await clientDeTest(connexion).communication.findMany({
          where: { organisationId: helvea.organisationId },
          select: { id: true },
        })
      ).map((c) => c.id),
    )
    expect(liste.every((c) => ids.has(c.id))).toBe(true)
  })
})

describe('transitions manuelles', () => {
  it('refuse PRETE_A_GENERER en disant tout ce qui manque', async () => {
    const { id } = await creerCommunication(helvea.redacteur, CADRAGE)
    await saisirTexte(helvea.redacteur, id, {
      titre: 'Annonce',
      texte: 'La version 4.2.0 sera déployée le 14 octobre 2026.',
      confidentialite: 'INTERNE',
    })
    const erreur = (await erreurDe(changerEtat(helvea.redacteur, id, 'PRETE_A_GENERER'))) as
      ErreurMetier | undefined
    expect(erreur?.code).toBe('TRANSITION_REFUSEE')
    expect(erreur?.details.motifs).toEqual([
      'AUCUN_FAIT_CONFIRME',
      'FAIT_NON_REVU',
      'AUCUN_PERSONA',
    ])
  })

  it('aucun chemin manuel ne mène à l’approbation ou à l’envoi', async () => {
    const { id } = await creerCommunication(helvea.redacteur, CADRAGE)
    await clientDeTest(connexion).communication.update({
      where: { id },
      data: { etat: 'EN_APPROBATION' },
    })
    for (const vers of ['APPROUVEE', 'ENVOI_PLANIFIE', 'ENVOYEE'] as const) {
      // oxlint-disable-next-line no-await-in-loop -- trois cas lus dans l'ordre
      expect(await codeDe(changerEtat(helvea.redacteur, id, vers))).toBe('TRANSITION_NON_MANUELLE')
    }
  })

  it('un approbateur ne modifie pas l’état d’une fiche (droit EDITER)', async () => {
    const { id } = await creerCommunication(helvea.redacteur, CADRAGE)
    const erreur = await erreurDe(changerEtat(helvea.approbateur, id, 'FAITS_A_VALIDER'))
    expect(erreur).toBeInstanceOf(ErreurAutorisation)
  })

  it('archive un brouillon et propose les transitions évaluées', async () => {
    const { id } = await creerCommunication(helvea.redacteur, CADRAGE)
    const detail = await chargerCommunication(helvea.redacteur, id)
    expect(detail.transitions.map((t) => t.vers)).toEqual(['FAITS_A_VALIDER', 'ARCHIVEE'])
    await changerEtat(helvea.redacteur, id, 'ARCHIVEE')
    expect((await chargerCommunication(helvea.redacteur, id)).communication.etat).toBe('ARCHIVEE')
  })
})

describe('tableau de bord', () => {
  it('compte mes communications par état et signale celles qu’une contradiction bloque', async () => {
    const equipe = await organisation(connexion)
    const { id } = await creerCommunication(equipe.redacteur, CADRAGE)
    await saisirTexte(equipe.redacteur, id, {
      titre: 'Déclaration',
      texte: 'Le service a été rétabli à 15h10.',
      confidentialite: 'INTERNE',
    })
    await saisirTexte(equipe.redacteur, id, {
      titre: 'Journal',
      texte: 'Supervision : service rétabli à 14h52.',
      confidentialite: 'INTERNE',
    })
    // Le rédacteur nomme les deux faits de la même façon : ils se contredisent.
    await clientDeTest(connexion).fait.updateMany({
      where: { communicationId: id },
      data: { enonce: 'Heure de rétablissement du service' },
    })
    await creerCommunication(equipe.redacteur, { ...CADRAGE, titre: 'Second brouillon' })

    const tableau = await chargerTableauDeBord(equipe.redacteur)
    expect(tableau.parEtat).toEqual({ FAITS_A_VALIDER: 1, BROUILLON: 1 })
    expect(tableau.bloquees).toHaveLength(1)
    expect(tableau.bloquees[0]).toMatchObject({
      motif: 'CONTRADICTION_NON_TRANCHEE',
      contradictions: 1,
    })
    expect(tableau.aApprouver).toEqual([])
  })
})
