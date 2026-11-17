import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Connexion } from './connexion.ts'
import { creerContexte, type ContexteDonnees } from './contexte.ts'
import { ErreurDonnees } from './erreurs.ts'
import {
  clientDeTest,
  creerOrganisation,
  ouvrirConnexionDeTest,
  viderBase,
  type JeuMinimal,
} from './test/base-de-test.ts'

/**
 * Le journal d'audit (plan L3). Ce qui est vérifié ici n'est pas qu'on sait
 * écrire une ligne, mais qu'on ne sait pas la défaire : par le contexte, par
 * une requête Prisma ordinaire, et par SQL direct.
 */

let connexion: Connexion
let alpha: JeuMinimal
let beta: JeuMinimal
let contexteAlpha: ContexteDonnees
let contexteBeta: ContexteDonnees

async function courrielDe(utilisateurId: string): Promise<string> {
  const utilisateur = await clientDeTest(connexion).utilisateur.findUniqueOrThrow({
    where: { id: utilisateurId },
    select: { courriel: true },
  })
  return utilisateur.courriel
}

beforeAll(() => {
  connexion = ouvrirConnexionDeTest()
})

afterAll(async () => {
  await connexion.fermer()
})

beforeEach(async () => {
  await viderBase(connexion)
  alpha = await creerOrganisation(connexion, 'audit-alpha')
  beta = await creerOrganisation(connexion, 'audit-beta')
  contexteAlpha = creerContexte(connexion, {
    organisationId: alpha.organisationId,
    utilisateurId: alpha.redacteurId,
    utilisateurCourriel: await courrielDe(alpha.redacteurId),
  })
  contexteBeta = creerContexte(connexion, {
    organisationId: beta.organisationId,
    utilisateurId: beta.redacteurId,
    utilisateurCourriel: await courrielDe(beta.redacteurId),
  })
})

const ECRITURE = {
  action: 'MODIFICATION',
  objet: 'PERSONA',
  objetId: 'persona-1',
  objetLibelle: 'Exploitation',
  changements: [{ champ: 'nom', avant: 'a', apres: 'b' }],
} as const

describe('écriture', () => {
  it('ajoute une ligne qui nomme son acteur', async () => {
    await contexteAlpha.journaliser(ECRITURE)

    const lignes = await contexteAlpha.listerAudit()
    expect(lignes).toHaveLength(1)
    expect(lignes[0]).toMatchObject({
      acteurCourriel: await courrielDe(alpha.redacteurId),
      action: 'MODIFICATION',
      objet: 'PERSONA',
      objetLibelle: 'Exploitation',
      changements: [{ champ: 'nom', avant: 'a', apres: 'b' }],
    })
  })

  it('refuse d’écrire sans acteur : une trace anonyme n’en est pas une', async () => {
    const sansActeur = creerContexte(connexion, { organisationId: alpha.organisationId })

    await expect(sansActeur.journaliser(ECRITURE)).rejects.toThrow(ErreurDonnees)
    await expect(sansActeur.journaliser(ECRITURE)).rejects.toMatchObject({
      code: 'AUDIT_SANS_ACTEUR',
    })
  })

  it('écrit la trace dans la même transaction que le changement', async () => {
    await contexteAlpha.$transaction(async (tx) => {
      await tx.persona.update({
        where: { id: alpha.personaId },
        data: { nom: 'Exploitation EMEA' },
      })
      await tx.journaliser({ ...ECRITURE, objetId: alpha.personaId })
    })

    expect(await contexteAlpha.listerAudit()).toHaveLength(1)
  })

  it('n’écrit aucune trace si la transaction échoue', async () => {
    await expect(
      contexteAlpha.$transaction(async (tx) => {
        await tx.journaliser({ ...ECRITURE, objetId: alpha.personaId })
        throw new Error('changement refusé plus loin')
      }),
    ).rejects.toThrow('changement refusé plus loin')

    expect(await contexteAlpha.listerAudit()).toHaveLength(0)
  })
})

describe('ajout seul', () => {
  it('refuse une modification par le contexte', async () => {
    await contexteAlpha.journaliser(ECRITURE)
    const [ligne] = await contexteAlpha.listerAudit()

    const client = clientDeTest(connexion)
    await expect(
      client.journalAudit.update({
        where: { id: ligne?.id ?? '' },
        data: { objetLibelle: 'réécrit' },
      }),
    ).rejects.toThrow(/ajout seul/)
  })

  it('refuse une suppression par SQL direct', async () => {
    await contexteAlpha.journaliser(ECRITURE)

    await expect(
      clientDeTest(connexion).$executeRawUnsafe(`DELETE FROM "JournalAudit"`),
    ).rejects.toThrow(/ajout seul/)
    expect(await contexteAlpha.listerAudit()).toHaveLength(1)
  })

  it('refuse un vidage tant que la maintenance n’est pas assumée', async () => {
    await contexteAlpha.journaliser(ECRITURE)

    await expect(
      clientDeTest(connexion).$executeRawUnsafe(`TRUNCATE TABLE "JournalAudit"`),
    ).rejects.toThrow(/ajout seul/)
    expect(await contexteAlpha.listerAudit()).toHaveLength(1)
  })

  it('refuse d’atteindre le modèle depuis un contexte cloisonné', async () => {
    const atteindre = contexteAlpha as unknown as Record<string, unknown>
    expect(() => atteindre['journalAudit']).toThrow(ErreurDonnees)
  })
})

describe('cloisonnement', () => {
  it('une organisation ne voit pas le journal de l’autre', async () => {
    await contexteAlpha.journaliser(ECRITURE)
    await contexteBeta.journaliser({ ...ECRITURE, objetLibelle: 'Chez Beta' })

    const vuesAlpha = await contexteAlpha.listerAudit()
    expect(vuesAlpha).toHaveLength(1)
    expect(vuesAlpha[0]?.objetLibelle).toBe('Exploitation')

    const vuesBeta = await contexteBeta.listerAudit()
    expect(vuesBeta).toHaveLength(1)
    expect(vuesBeta[0]?.objetLibelle).toBe('Chez Beta')
  })

  it('filtre par objet et par action', async () => {
    await contexteAlpha.journaliser(ECRITURE)
    await contexteAlpha.journaliser({ ...ECRITURE, objet: 'ENVOI', action: 'DECISION' })

    expect(await contexteAlpha.listerAudit({ objet: 'ENVOI' })).toHaveLength(1)
    expect(await contexteAlpha.listerAudit({ action: 'MODIFICATION' })).toHaveLength(1)
    expect(await contexteAlpha.listerAudit()).toHaveLength(2)
  })

  it('rend les lignes de la plus récente à la plus ancienne', async () => {
    await contexteAlpha.journaliser({ ...ECRITURE, objetLibelle: 'première' })
    await contexteAlpha.journaliser({ ...ECRITURE, objetLibelle: 'seconde' })

    const lignes = await contexteAlpha.listerAudit()
    expect(lignes.map((l) => l.objetLibelle)).toEqual(['seconde', 'première'])
  })
})
