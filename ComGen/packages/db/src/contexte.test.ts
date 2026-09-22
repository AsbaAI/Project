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

let connexion: Connexion
let alpha: JeuMinimal
let beta: JeuMinimal
let contexteAlpha: ContexteDonnees
let contexteBeta: ContexteDonnees

const DOCUMENT_A = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Version A' }] }],
}
const DOCUMENT_B = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Version B modifiée' }] }],
}

async function creerCommunication(contexte: ContexteDonnees, jeu: JeuMinimal, titre: string) {
  return contexte.communication.create({
    data: {
      regionId: jeu.regionId,
      reference: await contexte.prochaineReference(2026),
      titre,
      nature: 'CHANGE',
      criticite: 'COURANTE',
      portee: 'INTERNE',
      langue: 'fr',
      modeEntree: 'TEXTE_SAISI',
      auteurId: jeu.redacteurId,
      // Le contexte pose l'organisation lui-même : le type l'exige, la
      // valeur de l'appelant est ignorée.
      organisationId: 'valeur-ignoree',
    },
  })
}

async function creerVarianteApprouvee(contexte: ContexteDonnees, jeu: JeuMinimal) {
  const communication = await creerCommunication(contexte, jeu, 'Approuvée')
  const variante = await contexte.variante.create({
    data: {
      organisationId: jeu.organisationId,
      communicationId: communication.id,
      personaId: jeu.personaId,
      templateId: jeu.templateId,
      templateVersion: 1,
      contenu: DOCUMENT_A,
      etat: 'APPROUVEE',
    },
  })
  await contexte.approbation.create({
    data: {
      organisationId: jeu.organisationId,
      communicationId: communication.id,
      varianteId: variante.id,
      utilisateurId: jeu.approbateurId,
      regime: 'APPROBATION',
      decision: 'APPROUVEE',
      decideLe: new Date(),
    },
  })
  await clientDeTest(connexion).communication.update({
    where: { id: communication.id },
    data: { etat: 'APPROUVEE' },
  })
  return { communication, variante }
}

beforeAll(async () => {
  connexion = ouvrirConnexionDeTest()
  await viderBase(connexion)
  alpha = await creerOrganisation(connexion, 'alpha')
  beta = await creerOrganisation(connexion, 'beta')
  contexteAlpha = creerContexte(connexion, {
    organisationId: alpha.organisationId,
    utilisateurId: alpha.redacteurId,
  })
  contexteBeta = creerContexte(connexion, { organisationId: beta.organisationId })
})

beforeEach(async () => {
  const client = clientDeTest(connexion)
  await client.communication.deleteMany({})
  await client.compteurReference.deleteMany({})
})

afterAll(async () => {
  await connexion.fermer()
})

describe('cloisonnement par organisation (§13.2, §17)', () => {
  it('une communication lue par son identifiant depuis une autre organisation est introuvable', async () => {
    const communication = await creerCommunication(contexteAlpha, alpha, 'Interne à alpha')
    expect(communication.organisationId).toBe(alpha.organisationId)

    await expect(
      contexteBeta.communication.findUnique({ where: { id: communication.id } }),
    ).resolves.toBeNull()
    await expect(
      contexteBeta.communication.findUniqueOrThrow({ where: { id: communication.id } }),
    ).rejects.toThrow()
    await expect(contexteBeta.communication.findMany({})).resolves.toEqual([])
    await expect(contexteBeta.communication.count()).resolves.toBe(0)
    await expect(
      contexteAlpha.communication.findUnique({ where: { id: communication.id } }),
    ).resolves.toMatchObject({
      id: communication.id,
    })
  })

  it('un filtre explicite sur une autre organisation est neutralisé', async () => {
    await creerCommunication(contexteAlpha, alpha, 'Alpha')
    const lues = await contexteBeta.communication.findMany({
      where: { organisationId: alpha.organisationId },
    })
    expect(lues).toEqual([])
    const propres = await contexteAlpha.communication.findMany({
      where: { organisationId: beta.organisationId },
    })
    expect(propres).toEqual([])
  })

  it('une modification ou une suppression depuis une autre organisation ne touche aucune ligne', async () => {
    const communication = await creerCommunication(contexteAlpha, alpha, 'Alpha')
    const modifiees = await contexteBeta.communication.updateMany({
      where: { id: communication.id },
      data: { titre: 'Détournée' },
    })
    expect(modifiees.count).toBe(0)
    await expect(
      contexteBeta.communication.update({
        where: { id: communication.id },
        data: { titre: 'Détournée' },
      }),
    ).rejects.toThrow()
    await expect(
      contexteBeta.communication.delete({ where: { id: communication.id } }),
    ).rejects.toThrow()
    const relue = await contexteAlpha.communication.findUniqueOrThrow({
      where: { id: communication.id },
    })
    expect(relue.titre).toBe('Alpha')
  })

  it('une ligne fille ne peut pas être rattachée à un parent d’une autre organisation', async () => {
    const communication = await creerCommunication(contexteAlpha, alpha, 'Alpha')
    await expect(
      contexteBeta.source.create({
        data: {
          organisationId: beta.organisationId,
          communicationId: communication.id,
          type: 'TEXTE_SAISI',
          nom: 'intruse.txt',
          empreinte: 'a'.repeat(64),
          confidentialite: 'INTERNE',
        },
      }),
    ).rejects.toThrow(/COMGEN_ORGANISATION_INCOHERENTE/)
  })

  it('les régions et l’organisation elle-même sont cloisonnées', async () => {
    await expect(
      contexteBeta.region.findUnique({ where: { id: alpha.regionId } }),
    ).resolves.toBeNull()
    await expect(
      contexteBeta.organisation.findUnique({ where: { id: alpha.organisationId } }),
    ).resolves.toBeNull()
    await expect(contexteAlpha.organisation.findMany({})).resolves.toHaveLength(1)
  })

  it('les accès bruts et les modèles réservés sont refusés, même en contournant les types', () => {
    const contourne = contexteAlpha as unknown as Record<string, unknown>
    expect(() => contourne['$queryRaw']).toThrow(ErreurDonnees)
    expect(() => contourne['$executeRawUnsafe']).toThrow(ErreurDonnees)
    expect(() => contourne['compteurReference']).toThrow(ErreurDonnees)
  })

  it('la transaction interactive reste cloisonnée', async () => {
    const communication = await creerCommunication(contexteAlpha, alpha, 'Alpha')
    const resultat = await contexteBeta.$transaction(async (tx) => {
      expect(() => (tx as unknown as Record<string, unknown>)['$executeRawUnsafe']).toThrow(
        ErreurDonnees,
      )
      return tx.communication.findUnique({ where: { id: communication.id } })
    })
    expect(resultat).toBeNull()
  })
})

describe('références', () => {
  it('numérote COM-AAAA-NNNN sans trou ni doublon, y compris en concurrence', async () => {
    const references = await Promise.all(
      Array.from({ length: 12 }, () => contexteAlpha.prochaineReference(2026)),
    )
    expect(new Set(references).size).toBe(12)
    expect(references.toSorted()).toEqual(
      Array.from({ length: 12 }, (_, i) => `COM-2026-${String(i + 1).padStart(4, '0')}`),
    )
    await expect(contexteBeta.prochaineReference(2027)).resolves.toBe('COM-2027-0001')
  })
})

describe('écriture de Variante.contenu (§7, §17)', () => {
  it('refuse l’écriture directe du contenu par le client cloisonné', async () => {
    const { variante } = await creerVarianteApprouvee(contexteAlpha, alpha)
    await expect(
      contexteAlpha.variante.update({ where: { id: variante.id }, data: { contenu: DOCUMENT_B } }),
    ).rejects.toMatchObject({ code: 'ECRITURE_CONTENU_INTERDITE' })
  })

  it('ramène la variante à revoir, annule ses approbations, trace la version et ramène la communication en contrôle', async () => {
    const { communication, variante } = await creerVarianteApprouvee(contexteAlpha, alpha)

    await contexteAlpha.ecrireContenuVariante({
      varianteId: variante.id,
      contenu: DOCUMENT_B,
      origine: 'EDITEE',
      auteurId: alpha.redacteurId,
    })

    const relue = await contexteAlpha.variante.findUniqueOrThrow({
      where: { id: variante.id },
      include: { approbations: true, versions: true, communication: true },
    })
    expect(relue.etat).toBe('A_REVOIR')
    expect(relue.contenu).toEqual(DOCUMENT_B)
    expect(relue.longueurMots).toBe(3)
    expect(relue.communication.etat).toBe('EN_CONTROLE')
    expect(relue.approbations).toHaveLength(1)
    expect(relue.approbations[0]?.annuleeLe).toBeInstanceOf(Date)
    expect(relue.approbations[0]?.motifAnnulation).toBe('CONTENU_MODIFIE')
    expect(relue.versions).toHaveLength(1)
    expect(relue.versions[0]).toMatchObject({ origine: 'EDITEE', auteurId: alpha.redacteurId })
    expect(communication.etat).toBe('BROUILLON')
  })

  it('applique la règle même par SQL direct, hors du contexte', async () => {
    const { variante } = await creerVarianteApprouvee(contexteAlpha, alpha)
    const client = clientDeTest(connexion)

    await client.$executeRawUnsafe(
      `UPDATE "Variante" SET contenu = $1::jsonb, etat = 'APPROUVEE' WHERE id = $2`,
      JSON.stringify(DOCUMENT_B),
      variante.id,
    )

    const relue = await client.variante.findUniqueOrThrow({
      where: { id: variante.id },
      include: { approbations: true, communication: true },
    })
    expect(relue.etat).toBe('A_REVOIR')
    expect(relue.communication.etat).toBe('EN_CONTROLE')
    expect(relue.approbations.every((a) => a.annuleeLe !== null)).toBe(true)
  })

  it('ne touche à rien si le contenu est identique', async () => {
    const { variante } = await creerVarianteApprouvee(contexteAlpha, alpha)
    await clientDeTest(connexion).$executeRawUnsafe(
      `UPDATE "Variante" SET contenu = $1::jsonb WHERE id = $2`,
      JSON.stringify(DOCUMENT_A),
      variante.id,
    )
    const relue = await contexteAlpha.variante.findUniqueOrThrow({
      where: { id: variante.id },
      include: { approbations: true },
    })
    expect(relue.etat).toBe('APPROUVEE')
    expect(relue.approbations[0]?.annuleeLe).toBeNull()
  })

  it('refuse d’écrire le contenu d’une variante envoyée ou d’une communication planifiée', async () => {
    const { communication, variante } = await creerVarianteApprouvee(contexteAlpha, alpha)
    const client = clientDeTest(connexion)

    await client.communication.update({
      where: { id: communication.id },
      data: { etat: 'ENVOI_PLANIFIE' },
    })
    await expect(
      contexteAlpha.ecrireContenuVariante({
        varianteId: variante.id,
        contenu: DOCUMENT_B,
        origine: 'EDITEE',
      }),
    ).rejects.toMatchObject({ code: 'CONTENU_FIGE' })
    await expect(
      client.$executeRawUnsafe(
        `UPDATE "Variante" SET contenu = $1::jsonb WHERE id = $2`,
        JSON.stringify(DOCUMENT_B),
        variante.id,
      ),
    ).rejects.toThrow(/COMGEN_CONTENU_FIGE/)

    await client.communication.update({
      where: { id: communication.id },
      data: { etat: 'ENVOYEE' },
    })
    await client.variante.update({ where: { id: variante.id }, data: { etat: 'ENVOYEE' } })
    await expect(
      contexteAlpha.ecrireContenuVariante({
        varianteId: variante.id,
        contenu: DOCUMENT_B,
        origine: 'EDITEE',
      }),
    ).rejects.toMatchObject({ code: 'CONTENU_FIGE' })
  })

  it('une variante d’une autre organisation est introuvable', async () => {
    const { variante } = await creerVarianteApprouvee(contexteAlpha, alpha)
    await expect(
      contexteBeta.ecrireContenuVariante({
        varianteId: variante.id,
        contenu: DOCUMENT_B,
        origine: 'EDITEE',
      }),
    ).rejects.toMatchObject({ code: 'INTROUVABLE' })
  })
})

async function creerFaitReference(contexte: ContexteDonnees, jeu: JeuMinimal) {
  const { communication, variante } = await creerVarianteApprouvee(contexte, jeu)
  const source = await contexte.source.create({
    data: {
      organisationId: jeu.organisationId,
      communicationId: communication.id,
      type: 'TEXTE_SAISI',
      nom: 'note.txt',
      empreinte: 'b'.repeat(64),
      contenuTexte: 'La version 4.2.1 sera déployée le 3 octobre 2026.',
      confidentialite: 'INTERNE',
    },
  })
  const fait = await contexte.fait.create({
    data: {
      organisationId: jeu.organisationId,
      communicationId: communication.id,
      reference: 'F-01',
      enonce: 'Version déployée',
      valeur: '4.2.1',
      typeValeur: 'VERSION',
      citation: 'La version 4.2.1 sera déployée',
      sourceId: source.id,
      localisation: { offsetDebut: 0, offsetFin: 30, ligne: 1 },
      confiance: 0.98,
      confidentialite: 'INTERNE',
      statut: 'CONFIRME',
    },
  })
  await contexte.affirmation.create({
    data: {
      organisationId: jeu.organisationId,
      varianteId: variante.id,
      texte: 'La version 4.2.1 sera déployée.',
      position: { debut: 0, fin: 31 },
      verdict: 'SOUTENUE',
      faitIds: [fait.id],
    },
  })
  return { communication, variante, fait }
}

describe('amendement de fait (§11, §17)', () => {
  it('exige une source invoquée ou la responsabilité assumée', async () => {
    const { fait } = await creerFaitReference(contexteAlpha, alpha)
    await expect(
      contexteAlpha.amenderFait({
        faitId: fait.id,
        nouvelleValeur: '4.2.2',
        justification: 'Coquille',
        responsabiliteAssumee: false,
        auteurId: alpha.redacteurId,
      }),
    ).rejects.toMatchObject({ code: 'AMENDEMENT_SANS_APPUI' })
  })

  it('invalide les approbations des variantes qui s’appuient sur le fait et marque le fait DECLARE', async () => {
    const { communication, variante, fait } = await creerFaitReference(contexteAlpha, alpha)

    const { amendementId } = await contexteAlpha.amenderFait({
      faitId: fait.id,
      nouvelleValeur: '4.2.2',
      justification: 'Numéro corrigé par le chef de projet',
      responsabiliteAssumee: true,
      auteurId: alpha.redacteurId,
    })

    const amendement = await contexteAlpha.amendementFait.findUniqueOrThrow({
      where: { id: amendementId },
    })
    expect(amendement).toMatchObject({ ancienneValeur: '4.2.1', nouvelleValeur: '4.2.2' })

    const faitRelu = await contexteAlpha.fait.findUniqueOrThrow({ where: { id: fait.id } })
    expect(faitRelu).toMatchObject({ valeur: '4.2.2', statut: 'DECLARE' })

    const varianteRelue = await contexteAlpha.variante.findUniqueOrThrow({
      where: { id: variante.id },
      include: { approbations: true },
    })
    expect(varianteRelue.etat).toBe('A_REVOIR')
    expect(varianteRelue.approbations[0]?.motifAnnulation).toBe('FAIT_AMENDE')

    const communicationRelue = await contexteAlpha.communication.findUniqueOrThrow({
      where: { id: communication.id },
    })
    expect(communicationRelue.etat).toBe('EN_CONTROLE')
  })

  it('laisse intactes les variantes qui ne référencent pas le fait', async () => {
    const { fait } = await creerFaitReference(contexteAlpha, alpha)
    const autre = await creerVarianteApprouvee(contexteAlpha, alpha)

    await contexteAlpha.amenderFait({
      faitId: fait.id,
      nouvelleValeur: '4.2.2',
      justification: 'Correction',
      sourceInvoquee: 'Compte rendu du 21/09',
      responsabiliteAssumee: false,
      auteurId: alpha.redacteurId,
    })

    const relue = await contexteAlpha.variante.findUniqueOrThrow({
      where: { id: autre.variante.id },
      include: { approbations: true },
    })
    expect(relue.etat).toBe('APPROUVEE')
    expect(relue.approbations[0]?.annuleeLe).toBeNull()
    const faitRelu = await contexteAlpha.fait.findUniqueOrThrow({ where: { id: fait.id } })
    expect(faitRelu.statut).toBe('CONFIRME')
  })
})
