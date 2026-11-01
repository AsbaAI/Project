import { ROLES_AGENT } from '@comgen/core'
import { type Connexion, ouvrirConnexion } from '@comgen/db'
import { URL_BASE_DE_TEST, clientDeTest } from '@comgen/db/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ErreurAutorisation } from '@/server/auth/droits'

import { ROLES_PLACES, chargerAgents, enregistrerConsigne } from './agents'
import { ErreurMetier } from './erreurs'
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

const CONSIGNE =
  'Tu rédiges pour une audience interne. Appuie chaque phrase sur un fait de la fiche et émets une référence plutôt que la valeur elle-même.'

describe('chargerAgents', () => {
  it('place tous les rôles du domaine : aucun n’est oublié en silence', () => {
    expect([...ROLES_PLACES].toSorted()).toEqual([...ROLES_AGENT].toSorted())
  })

  it('est réservé à qui peut paramétrer', async () => {
    await expect(chargerAgents(org.redacteur)).rejects.toBeInstanceOf(ErreurAutorisation)
  })

  it('décrit le parcours dans l’ordre, avec l’état réel de chaque rôle', async () => {
    const agents = await chargerAgents(admin)
    expect(agents.map((a) => a.role)).toEqual([...ROLES_PLACES])
    expect(agents.map((a) => a.rang)).toEqual(agents.map((_, i) => i + 1))
    expect(agents.find((a) => a.role === 'EXTRACTEUR')).toMatchObject({
      etape: 'entree',
      etat: 'simule',
      version: null,
    })
    // Le GARDIEN n'est pas un modèle : c'est du code, et l'écran doit le dire.
    expect(agents.find((a) => a.role === 'GARDIEN')?.etat).toBe('code')
    expect(agents.find((a) => a.role === 'ARBITRE')?.etat).toBe('absent')
  })
})

describe('enregistrerConsigne', () => {
  it('est réservé à qui peut paramétrer', async () => {
    await expect(enregistrerConsigne(org.redacteur, 'REDACTEUR', CONSIGNE)).rejects.toBeInstanceOf(
      ErreurAutorisation,
    )
  })

  it('enregistre, puis versionne à chaque texte différent', async () => {
    expect(await enregistrerConsigne(admin, 'REDACTEUR', CONSIGNE)).toEqual({ version: 1 })
    // Le même texte ne crée pas de version : rien n'a changé.
    expect(await enregistrerConsigne(admin, 'REDACTEUR', CONSIGNE)).toEqual({ version: 1 })
    expect(await enregistrerConsigne(admin, 'REDACTEUR', `${CONSIGNE} Sois bref.`)).toEqual({
      version: 2,
    })

    const agents = await chargerAgents(admin)
    const redacteur = agents.find((a) => a.role === 'REDACTEUR')
    expect(redacteur).toMatchObject({ version: 2, modifieParNom: admin.utilisateur.nom })
    expect(redacteur?.consigne).toContain('Sois bref.')
  })

  it('refuse une consigne qui demande ce que la contrainte cardinale interdit', async () => {
    const erreur = await erreurMetier(
      enregistrerConsigne(admin, 'VERIFICATEUR', `${CONSIGNE} Écris la date de la migration.`),
    )
    expect(erreur.code).toBe('CONSIGNE_REFUSEE')
    expect(erreur.details.motifs).toContain('VALEUR_ECRITE')
    const agents = await chargerAgents(admin)
    expect(agents.find((a) => a.role === 'VERIFICATEUR')?.version).toBeNull()
  })

  it('refuse une consigne trop courte, et un rôle inconnu', async () => {
    expect(
      (await erreurMetier(enregistrerConsigne(admin, 'REDACTEUR', 'Sois bref.'))).details.champs,
    ).toMatchObject({ consigne: 'trop_court' })
    expect(
      (await erreurMetier(enregistrerConsigne(admin, 'POETE', CONSIGNE))).details.champs,
    ).toMatchObject({ role: 'invalide' })
  })

  it('ne voit pas la consigne d’une autre organisation', async () => {
    const autre = await organisation(connexion)
    const autreAdmin = await utilisateurAvecRoles(connexion, autre, ['ADMINISTRATEUR'])
    await enregistrerConsigne(autreAdmin, 'EXTRACTEUR', CONSIGNE)

    const miennes = await chargerAgents(admin)
    expect(miennes.find((a) => a.role === 'EXTRACTEUR')?.version).toBeNull()
    expect(
      await clientDeTest(connexion).consigneAgent.count({
        where: { organisationId: autre.organisationId },
      }),
    ).toBe(1)
  })
})
