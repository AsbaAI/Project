import { MODELES_GABARIT } from '@comgen/core'
import { type Connexion, ouvrirConnexion } from '@comgen/db'
import { URL_BASE_DE_TEST, clientDeTest } from '@comgen/db/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ErreurAutorisation } from '@/server/auth/droits'

import { ErreurMetier } from './erreurs'
import { changerActivationGabarit, chargerGabarits, installerModele } from './gabarits'
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

describe('chargerGabarits', () => {
  it('dit quels canaux sont servis, et par quel gabarit', async () => {
    const ecran = await chargerGabarits(org.redacteur)
    const courriel = ecran.canaux.find((c) => c.canal === 'COURRIEL')
    expect(courriel?.gabaritNom).not.toBeNull()
    // Aucun gabarit de messagerie instantanée dans le jeu minimal : la
    // génération refuserait, et l'écran doit le montrer.
    expect(ecran.canaux.find((c) => c.canal === 'MESSAGERIE_INSTANTANEE')?.gabaritNom).toBeNull()
  })

  it('propose tout le catalogue, avec les canaux que chaque format sert', async () => {
    const ecran = await chargerGabarits(org.redacteur)
    expect(ecran.modeles.map((m) => m.cle)).toEqual(MODELES_GABARIT.map((m) => m.cle))
    expect(ecran.modeles.find((m) => m.cle === 'newsletter-fr')?.canaux).toEqual(['COURRIEL'])
    expect(ecran.modeles.find((m) => m.cle === 'note-interne-fr')?.canaux).toEqual(['DOCUMENT'])
    expect(ecran.modeles.every((m) => !m.installe)).toBe(true)
  })

  it('signale un gabarit dont le corps et les emplacements ne coïncident pas', async () => {
    const abime = await clientDeTest(connexion).template.create({
      data: {
        organisationId: org.organisationId,
        regionId: org.regionId,
        nom: 'Gabarit abîmé',
        format: 'ARTICLE',
        corps: '<h1>{{objet}}</h1>{{inconnu}}',
        emplacements: [{ cle: 'objet', description: '', obligatoire: true, longueurMax: 10 }],
      },
    })
    const ecran = await chargerGabarits(org.redacteur)
    expect(ecran.gabarits.find((g) => g.id === abime.id)?.constats).toEqual([
      { code: 'APPEL_INCONNU', cle: 'inconnu' },
    ])
    await clientDeTest(connexion).template.delete({ where: { id: abime.id } })
  })
})

describe('installerModele', () => {
  it('est réservé à qui peut paramétrer', async () => {
    await expect(
      installerModele(org.redacteur, 'newsletter-fr', org.regionId, 'Lettre mensuelle'),
    ).rejects.toBeInstanceOf(ErreurAutorisation)
  })

  it('copie le corps et les emplacements du modèle, actif et servant son canal', async () => {
    const { id } = await installerModele(admin, 'note-interne-fr', org.regionId, 'Note interne')
    const ligne = await clientDeTest(connexion).template.findUniqueOrThrow({ where: { id } })
    const modele = MODELES_GABARIT.find((m) => m.cle === 'note-interne-fr')
    expect(ligne).toMatchObject({ format: 'PDF', actif: true, version: 1 })
    expect(ligne.corps).toBe(modele?.corps)
    expect(ligne.nom).toContain('(note-interne-fr)')

    const ecran = await chargerGabarits(admin)
    expect(ecran.modeles.find((m) => m.cle === 'note-interne-fr')?.installe).toBe(true)
    expect(ecran.canaux.find((c) => c.canal === 'DOCUMENT')?.gabaritNom).toBe(ligne.nom)
  })

  it('refuse deux fois le même modèle, et un modèle inconnu', async () => {
    await installerModele(admin, 'message-instantane-fr', org.regionId, 'Message')
    const doublon = await erreurMetier(
      installerModele(admin, 'message-instantane-fr', org.regionId, 'Message'),
    )
    expect(doublon.code).toBe('SOURCE_EN_DOUBLE')
    const inconnu = await erreurMetier(installerModele(admin, 'poeme', org.regionId, 'Poème'))
    expect(inconnu.details.champs).toMatchObject({ modele: 'invalide' })
  })

  it('n’installe pas dans la région d’une autre organisation', async () => {
    const autre = await organisation(connexion)
    const erreur = await erreurMetier(
      installerModele(admin, 'article-portail-fr', autre.regionId, 'Article'),
    )
    expect(erreur.code).toBe('INTROUVABLE')
  })
})

describe('changerActivationGabarit', () => {
  it('désactive un gabarit : son canal n’est plus servi', async () => {
    const propre = await organisation(connexion)
    const propreAdmin = await utilisateurAvecRoles(connexion, propre, ['ADMINISTRATEUR'])
    const { id } = await installerModele(propreAdmin, 'note-interne-fr', propre.regionId, 'Note')

    await changerActivationGabarit(propreAdmin, id, false)
    const ecran = await chargerGabarits(propreAdmin)
    expect(ecran.gabarits.find((g) => g.id === id)?.actif).toBe(false)
    expect(ecran.canaux.find((c) => c.canal === 'DOCUMENT')?.gabaritNom).toBeNull()
  })

  it('ne touche pas au gabarit d’une autre organisation', async () => {
    const autre = await organisation(connexion)
    const autreAdmin = await utilisateurAvecRoles(connexion, autre, ['ADMINISTRATEUR'])
    const { id } = await installerModele(autreAdmin, 'courriel-texte-fr', autre.regionId, 'Texte')
    const erreur = await erreurMetier(changerActivationGabarit(admin, id, false))
    expect(erreur.code).toBe('INTROUVABLE')
  })
})
