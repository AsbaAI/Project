import { type Connexion, ouvrirConnexion } from '@comgen/db'
import { URL_BASE_DE_TEST, clientDeTest } from '@comgen/db/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ErreurAutorisation } from '@/server/auth/droits'

import { enregistrerConsigne } from './agents'
import { changerEtat, creerCommunication } from './communications'
import { changerActivationGabarit } from './gabarits'
import { chargerJournal } from './journal'
import { modifierListe } from './parametrage'
import { type Organisation, organisation, suffixeUnique, utilisateurAvecRoles } from './test/outils'

/**
 * Le journal d'audit vu des services (plan L3) : chaque geste qui change la
 * configuration ou l'état d'une communication laisse sa ligne, et personne
 * ne lit le journal d'une autre organisation.
 */

let connexion: Connexion
let helvea: Organisation
let autre: Organisation
let admin: Organisation['redacteur']
let auditeur: Organisation['redacteur']
let auditeurAutre: Organisation['redacteur']

const CADRAGE = {
  titre: 'Migration du portail vers la version 4.2',
  nature: 'CHANGE',
  criticite: 'IMPORTANTE',
  portee: 'INTER_ORG',
  langue: 'fr',
  dateEffet: '2026-10-14T22:00',
  modeEntree: 'FICHIER',
} as const

const CONSIGNE =
  'Tu rédiges à partir des faits fournis. Tu ne reprends aucune valeur de toi-même : ' +
  'tu cites les références de faits, et tu rends une structure conforme au schéma.'

beforeAll(async () => {
  connexion = ouvrirConnexion({ url: URL_BASE_DE_TEST, connexionsMax: 4 })
  helvea = await organisation(connexion)
  autre = await organisation(connexion)
  admin = await utilisateurAvecRoles(connexion, helvea, ['ADMINISTRATEUR'])
  auditeur = await utilisateurAvecRoles(connexion, helvea, ['AUDITEUR'])
  auditeurAutre = await utilisateurAvecRoles(connexion, autre, ['AUDITEUR'])
})

afterAll(async () => {
  await connexion.fermer()
})

describe('droit de lecture', () => {
  it('un rédacteur ne lit pas le journal', async () => {
    await expect(chargerJournal(helvea.redacteur)).rejects.toThrow(ErreurAutorisation)
  })

  it('un administrateur non plus : paramétrer n’est pas auditer', async () => {
    await expect(chargerJournal(admin)).rejects.toThrow(ErreurAutorisation)
  })

  it('un auditeur lit', async () => {
    await expect(chargerJournal(auditeur)).resolves.toMatchObject({ lignes: expect.any(Array) })
  })
})

describe('gestes tracés', () => {
  it('une consigne d’agent laisse sa ligne', async () => {
    await enregistrerConsigne(admin, 'REDACTEUR', CONSIGNE)

    const { lignes } = await chargerJournal(auditeur, { objet: 'CONSIGNE_AGENT' })
    expect(lignes[0]).toMatchObject({
      acteurCourriel: admin.utilisateur.courriel,
      objet: 'CONSIGNE_AGENT',
      objetLibelle: 'REDACTEUR',
    })
    expect(lignes[0]?.resume).toContain('version')
  })

  it('l’activation d’un gabarit laisse sa ligne, avec l’avant et l’après', async () => {
    await changerActivationGabarit(admin, helvea.templateId, false)

    const { lignes } = await chargerJournal(auditeur, { objet: 'GABARIT' })
    expect(lignes[0]?.resume).toBe('actif : true → false')
    expect(lignes[0]?.action).toBe('MODIFICATION')
  })

  it('un changement d’état manuel laisse sa ligne', async () => {
    const { id, reference } = await creerCommunication(helvea.redacteur, CADRAGE)
    await changerEtat(helvea.redacteur, id, 'ARCHIVEE')

    const { lignes } = await chargerJournal(auditeur, { objet: 'COMMUNICATION' })
    const ligne = lignes.find((l) => l.objetLibelle === reference)
    expect(ligne).toMatchObject({
      action: 'TRANSITION',
      acteurCourriel: helvea.redacteur.utilisateur.courriel,
    })
    expect(ligne?.resume).toBe('etat : BROUILLON → ARCHIVEE')
  })

  it('un geste refusé n’écrit rien', async () => {
    const avant = (await chargerJournal(auditeur)).lignes.length
    const { id } = await creerCommunication(helvea.redacteur, CADRAGE)

    // ENVOYEE n'est pas une transition manuelle : le service refuse.
    await expect(changerEtat(helvea.redacteur, id, 'ENVOYEE')).rejects.toThrow()

    expect((await chargerJournal(auditeur)).lignes).toHaveLength(avant)
  })

  it('une liste de diffusion trace son effectif, jamais ses adresses', async () => {
    const liste = await clientListeStatique()
    await modifierListe(admin, liste.id, ['Alice, alice@helvea.example', 'bob@helvea.example'])

    const { lignes } = await chargerJournal(auditeur, { objet: 'LISTE_DIFFUSION' })
    expect(lignes[0]?.resume).toContain('effectif')
    expect(JSON.stringify(lignes)).not.toContain('alice@helvea.example')
  })
})

describe('cloisonnement', () => {
  it('une organisation ne lit pas le journal de l’autre', async () => {
    await enregistrerConsigne(admin, 'VERIFICATEUR', CONSIGNE)

    const { lignes } = await chargerJournal(auditeurAutre)
    expect(lignes.every((l) => l.acteurCourriel !== admin.utilisateur.courriel)).toBe(true)
  })
})

describe('filtres', () => {
  it('ignore un filtre inconnu plutôt que de rendre un écran vide', async () => {
    const ecran = await chargerJournal(auditeur, { objet: 'INEXISTANT', action: 'BIDON' })
    expect(ecran.filtres).toEqual({ objet: null, action: null })
    expect(ecran.lignes.length).toBeGreaterThan(0)
  })

  it('filtre par action', async () => {
    const ecran = await chargerJournal(auditeur, { action: 'TRANSITION' })
    expect(ecran.lignes.every((l) => l.action === 'TRANSITION')).toBe(true)
    expect(ecran.filtres.action).toBe('TRANSITION')
  })
})

/** Une liste statique de l'organisation, posée directement en base. */
async function clientListeStatique(): Promise<{ id: string }> {
  return clientDeTest(connexion).listeDiffusion.create({
    data: {
      organisation: { connect: { id: helvea.organisationId } },
      region: { connect: { id: helvea.regionId } },
      nom: `Liste ${suffixeUnique()}`,
      type: 'STATIQUE',
      definition: { destinataires: [] },
    },
    select: { id: true },
  })
}
