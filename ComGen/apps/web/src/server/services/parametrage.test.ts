import { type Connexion, ouvrirConnexion } from '@comgen/db'
import { URL_BASE_DE_TEST, clientDeTest } from '@comgen/db/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ErreurAutorisation } from '@/server/auth/droits'

import { ErreurMetier } from './erreurs'
import { chargerListes, chargerPersonas, modifierListe, modifierPersona } from './parametrage'
import { type Organisation, organisation, utilisateurAvecRoles } from './test/outils'

let connexion: Connexion
let org: Organisation
let admin: Organisation['redacteur']

beforeAll(async () => {
  connexion = ouvrirConnexion({ url: URL_BASE_DE_TEST, connexionsMax: 4 })
  org = await organisation(connexion)
  admin = await utilisateurAvecRoles(connexion, org, ['ADMINISTRATEUR'])
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

const SAISIE = {
  nom: 'Direction générale',
  actif: true,
  canalDefaut: 'COURRIEL',
  registre: 'soutenu',
  ton: 'synthétique, orienté décision',
  personne: 'nous',
  structure: ['enjeu', 'décision ou changement'],
  longueurCible: '150',
  jargonFr: ['enjeu', 'impact métier'],
  jargonEn: ['business impact'],
  interditsFr: ['bug', 'rollback'],
  interditsEn: ['crash'],
  sujetsInterdits: ['rémunérations'],
  confidentialiteMax: 'RESTREINT',
  approbateurIds: [] as string[],
} as const

describe('personas', () => {
  it('est réservé à qui peut paramétrer', async () => {
    await expect(chargerPersonas(org.redacteur)).rejects.toBeInstanceOf(ErreurAutorisation)
    await expect(modifierPersona(org.redacteur, org.personaId, SAISIE)).rejects.toBeInstanceOf(
      ErreurAutorisation,
    )
  })

  it('enregistre les garde-fous que le GARDIEN lira, sans écraser le reste', async () => {
    const db = clientDeTest(connexion)
    await db.persona.update({
      where: { id: org.personaId },
      data: {
        lexique: { fr: { preferes: ['enjeu'], interdits: [] }, en: { preferes: ['decision'] } },
        voix: { registre: 'soutenu' },
      },
    })
    await modifierPersona(admin, org.personaId, { ...SAISIE, approbateurIds: [org.approbateurId] })

    const ligne = await db.persona.findUniqueOrThrow({ where: { id: org.personaId } })
    expect(ligne.lexique).toEqual({
      fr: { preferes: ['enjeu', 'impact métier'], interdits: ['bug', 'rollback'] },
      en: { preferes: ['business impact'], interdits: ['crash'] },
    })
    expect(ligne.voix).toMatchObject({
      registre: 'soutenu',
      ton: 'synthétique, orienté décision',
      personne: 'nous',
      structure: ['enjeu', 'décision ou changement'],
      longueurCible: 150,
    })
    expect(ligne.gardeFous).toMatchObject({
      confidentialiteMax: 'RESTREINT',
      sujetsInterdits: ['rémunérations'],
    })
    expect(ligne.approbateurIds).toEqual([org.approbateurId])

    const ecran = await chargerPersonas(admin)
    expect(ecran.personas.find((p) => p.id === org.personaId)).toMatchObject({
      interditsFr: ['bug', 'rollback'],
      confidentialiteMax: 'RESTREINT',
      gardeFousLisibles: true,
      registre: 'soutenu',
      personne: 'nous',
      structure: ['enjeu', 'décision ou changement'],
      longueurCible: 150,
      jargonFr: ['enjeu', 'impact métier'],
      voixLisible: true,
    })
    expect(ecran.approbateurs.map((a) => a.id)).toContain(org.approbateurId)
  })

  it('refuse un niveau inventé, un terme trop court et un approbateur qui n’en est pas un', async () => {
    const niveau = await erreurMetier(
      modifierPersona(admin, org.personaId, { ...SAISIE, confidentialiteMax: 'TOP' as never }),
    )
    expect(niveau.details.champs).toMatchObject({ confidentialiteMax: 'invalide' })
    const terme = await erreurMetier(
      modifierPersona(admin, org.personaId, { ...SAISIE, interditsFr: ['a'] }),
    )
    expect(terme.details.champs).toMatchObject({ interditsFr: 'invalide' })
    const intrus = await erreurMetier(
      modifierPersona(admin, org.personaId, { ...SAISIE, approbateurIds: [org.redacteurId] }),
    )
    expect(intrus.details.champs).toMatchObject({ approbateurIds: 'invalide' })
  })

  it('refuse un style d’écriture inventé, et une longueur hors bornes', async () => {
    for (const [champ, saisie] of [
      ['registre', { ...SAISIE, registre: 'poétique' }],
      ['personne', { ...SAISIE, personne: 'il' }],
      ['structure', { ...SAISIE, structure: ['x'] }],
      ['longueurCible', { ...SAISIE, longueurCible: '12' }],
      ['longueurCible', { ...SAISIE, longueurCible: '5000' }],
    ] as const) {
      // eslint-disable-next-line no-await-in-loop -- un cas après l'autre
      const erreur = await erreurMetier(modifierPersona(admin, org.personaId, saisie))
      expect(erreur.details.champs).toMatchObject({ [champ]: 'invalide' })
    }
  })

  it('une longueur cible vide est une absence de cible, pas un zéro', async () => {
    await modifierPersona(admin, org.personaId, { ...SAISIE, longueurCible: '' })
    const ecran = await chargerPersonas(admin)
    expect(ecran.personas.find((p) => p.id === org.personaId)?.longueurCible).toBeNull()
  })

  it('dit quand la voix enregistrée est illisible', async () => {
    const autre = await organisation(connexion)
    const autreAdmin = await utilisateurAvecRoles(connexion, autre, ['ADMINISTRATEUR'])
    await clientDeTest(connexion).persona.update({
      where: { id: autre.personaId },
      data: { voix: { registre: 'poétique' } },
    })
    const ecran = await chargerPersonas(autreAdmin)
    expect(ecran.personas.find((p) => p.id === autre.personaId)?.voixLisible).toBe(false)
  })

  it('ne touche pas au persona d’une autre organisation', async () => {
    const autre = await organisation(connexion)
    const erreur = await erreurMetier(modifierPersona(admin, autre.personaId, SAISIE))
    expect(erreur.code).toBe('INTROUVABLE')
  })

  it('dit quand les garde-fous enregistrés sont illisibles', async () => {
    const db = clientDeTest(connexion)
    const autre = await organisation(connexion)
    const autreAdmin = await utilisateurAvecRoles(connexion, autre, ['ADMINISTRATEUR'])
    await db.persona.update({
      where: { id: autre.personaId },
      data: { gardeFous: { confidentialiteMax: 'TOP' } },
    })
    const ecran = await chargerPersonas(autreAdmin)
    expect(ecran.personas.find((p) => p.id === autre.personaId)?.gardeFousLisibles).toBe(false)
  })
})

async function liste(type: 'STATIQUE' | 'REGLE' = 'STATIQUE') {
  const creee = await clientDeTest(connexion).listeDiffusion.create({
    data: {
      organisationId: org.organisationId,
      regionId: org.regionId,
      nom: `Liste ${Date.now()}`,
      type,
      definition: { destinataires: [{ nom: 'Ada', courriel: 'ada@exemple.test' }] },
      exclusions: [],
      personaId: org.personaId,
    },
  })
  return creee.id
}

describe('listes de diffusion', () => {
  it('est réservé à qui peut paramétrer', async () => {
    const id = await liste()
    await expect(chargerListes(org.redacteur)).rejects.toBeInstanceOf(ErreurAutorisation)
    await expect(modifierListe(org.redacteur, id, ['a@exemple.test'])).rejects.toBeInstanceOf(
      ErreurAutorisation,
    )
  })

  it('remplace les destinataires, dédoublonne et dit l’effectif', async () => {
    const id = await liste()
    const resultat = await modifierListe(admin, id, [
      'Grace Hopper, grace@exemple.test',
      'GRACE@exemple.test',
      '  linus@exemple.test ',
      '',
    ])
    expect(resultat).toEqual({ effectif: 2 })
    const ecran = await chargerListes(admin)
    expect(ecran.find((l) => l.id === id)).toMatchObject({
      editable: true,
      effectif: 2,
      destinataires: 'Grace Hopper, grace@exemple.test\ngrace@exemple.test\nlinus@exemple.test',
    })
  })

  it('refuse une adresse invalide sans rien écrire', async () => {
    const id = await liste()
    const erreur = await erreurMetier(
      modifierListe(admin, id, ['ada@exemple.test', 'pas-une-adresse']),
    )
    expect(erreur.details.champs).toMatchObject({ destinataires: 'invalide' })
    const ecran = await chargerListes(admin)
    expect(ecran.find((l) => l.id === id)?.destinataires).toBe('Ada, ada@exemple.test')
  })

  it('ne modifie qu’une liste statique', async () => {
    const id = await liste('REGLE')
    expect((await erreurMetier(modifierListe(admin, id, ['a@exemple.test']))).code).toBe(
      'ETAT_INCOMPATIBLE',
    )
  })

  it('ne voit pas la liste d’une autre organisation', async () => {
    const autre = await organisation(connexion)
    const creee = await clientDeTest(connexion).listeDiffusion.create({
      data: {
        organisationId: autre.organisationId,
        regionId: autre.regionId,
        nom: 'Étrangère',
        type: 'STATIQUE',
        definition: { destinataires: [] },
        exclusions: [],
      },
    })
    expect((await erreurMetier(modifierListe(admin, creee.id, ['a@exemple.test']))).code).toBe(
      'INTROUVABLE',
    )
  })
})
