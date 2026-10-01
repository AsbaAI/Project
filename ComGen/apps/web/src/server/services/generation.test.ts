import { type Connexion, ouvrirConnexion } from '@comgen/db'
import { URL_BASE_DE_TEST, clientDeTest } from '@comgen/db/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { changerEtat, creerCommunication } from './communications'
import { ErreurMetier } from './erreurs'
import { chargerFiche, confirmerFait } from './faits'
import { choisirDestinataires, genererVariante, listerPersonas } from './generation'
import { saisirTexte } from './sources'
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

const CADRAGE = {
  titre: 'Migration du portail vers la version 4.2',
  nature: 'CHANGE',
  criticite: 'IMPORTANTE',
  portee: 'INTER_ORG',
  langue: 'fr',
  dateEffet: '2026-10-14T22:00',
  modeEntree: 'TEXTE_SAISI',
} as const

const TEXTE_SOURCE = [
  'La migration du portail aura lieu le 12 mars 2026.',
  'Le service sera indisponible pour 4 500 utilisateurs.',
  'Le changement est suivi sous la référence CHG-2026-0042.',
].join('\n')

async function erreurMetier(promesse: Promise<unknown>): Promise<ErreurMetier> {
  try {
    await promesse
  } catch (erreur) {
    if (erreur instanceof ErreurMetier) return erreur
    throw erreur
  }
  throw new Error('La promesse aurait dû échouer')
}

/** Une communication prête à générer : source saisie, faits confirmés, persona retenu. */
async function communicationPrete(
  texte: string = TEXTE_SOURCE,
  personaIds: readonly string[] = [org.personaId],
) {
  const { id } = await creerCommunication(org.redacteur, CADRAGE)
  await saisirTexte(org.redacteur, id, {
    titre: 'Note de cadrage',
    texte,
    confidentialite: 'INTERNE',
  })
  // Saisir une source mène déjà la communication en FAITS_A_VALIDER.
  await choisirDestinataires(org.redacteur, { communicationId: id, personaIds })

  const fiche = await chargerFiche(org.redacteur, id)
  for (const fait of fiche.faits) {
    // eslint-disable-next-line no-await-in-loop -- la revue est un geste par fait
    await confirmerFait(org.redacteur, fait.id)
  }
  await changerEtat(org.redacteur, id, 'PRETE_A_GENERER')

  const variante = await clientDeTest(connexion).variante.findFirstOrThrow({
    where: { communicationId: id },
  })
  return { communicationId: id, varianteId: variante.id }
}

describe('choisirDestinataires', () => {
  it('crée une variante vide par persona retenu, avec le gabarit de son canal', async () => {
    const { id } = await creerCommunication(org.redacteur, CADRAGE)
    await choisirDestinataires(org.redacteur, { communicationId: id, personaIds: [org.personaId] })

    const variantes = await clientDeTest(connexion).variante.findMany({
      where: { communicationId: id },
    })
    expect(variantes).toHaveLength(1)
    expect(variantes[0]?.personaId).toBe(org.personaId)
    expect(variantes[0]?.templateId).toBe(org.templateId)
    expect(variantes[0]?.etat).toBe('EN_GENERATION')
  })

  it('dit quels personas sont retenus et lesquels n’ont pas de gabarit', async () => {
    const { id } = await creerCommunication(org.redacteur, CADRAGE)
    const avant = await listerPersonas(org.redacteur, id)
    expect(avant.find((p) => p.id === org.personaId)?.retenu).toBe(false)
    expect(avant.find((p) => p.id === org.personaId)?.gabaritDisponible).toBe(true)

    await choisirDestinataires(org.redacteur, { communicationId: id, personaIds: [org.personaId] })
    const apres = await listerPersonas(org.redacteur, id)
    expect(apres.find((p) => p.id === org.personaId)?.retenu).toBe(true)
  })

  it('fige la liste dès que la génération a commencé', async () => {
    const autre = await clientDeTest(connexion).persona.create({
      data: {
        organisationId: org.organisationId,
        regionId: org.regionId,
        nom: `Persona de remplacement ${Date.now()}`,
        voix: {},
        lexique: {},
        gardeFous: {},
        exemples: [],
        canalDefaut: 'COURRIEL',
        approbateurIds: [],
      },
    })
    const { communicationId, varianteId } = await communicationPrete()
    await genererVariante(org.redacteur, { varianteId })

    // Liste non vide, mais qui exclut le persona déjà rédigé : c'est bien la
    // garde du service qui doit refuser, pas le schéma d'entrée.
    const erreur = await erreurMetier(
      choisirDestinataires(org.redacteur, { communicationId, personaIds: [autre.id] }),
    )
    expect(erreur.code).toBe('ETAT_INCOMPATIBLE')
    expect(erreur.message).toContain('figent')
  })
})

describe('genererVariante', () => {
  it('écrit un texte dont chaque valeur vient de la source, mot pour mot', async () => {
    const { varianteId } = await communicationPrete()
    const rapport = await genererVariante(org.redacteur, { varianteId })

    const variante = await clientDeTest(connexion).variante.findUniqueOrThrow({
      where: { id: varianteId },
    })
    const texte = JSON.stringify(variante.contenu)
    expect(texte).toContain('12 mars 2026')
    expect(texte).toContain('4 500')
    expect(texte).toContain('CHG-2026-0042')
    expect(rapport.bloquant).toBe(false)
    expect(rapport.score).toBe(1)
    expect(variante.etat).toBe('CONFORME')
  })

  it('rattache chaque affirmation soutenue à des faits réels', async () => {
    const { varianteId } = await communicationPrete()
    await genererVariante(org.redacteur, { varianteId })

    const affirmations = await clientDeTest(connexion).affirmation.findMany({
      where: { varianteId },
    })
    const soutenues = affirmations.filter((a) => a.verdict === 'SOUTENUE')
    expect(soutenues.length).toBeGreaterThan(0)

    const faits = await clientDeTest(connexion).fait.findMany({
      where: { id: { in: soutenues.flatMap((a) => a.faitIds) } },
    })
    const citationParId = new Map(faits.map((fait) => [fait.id, fait.citation]))
    for (const affirmation of soutenues) {
      expect(affirmation.faitIds.length).toBeGreaterThan(0)
      for (const faitId of affirmation.faitIds) {
        // Le fait existe vraiment, et sa citation porte bien l'affirmation.
        expect(citationParId.get(faitId)).toContain(affirmation.texte.trim())
      }
    }
  })

  it('trace chaque agent, en disant qu’il est simulé', async () => {
    const { varianteId, communicationId } = await communicationPrete()
    await genererVariante(org.redacteur, { varianteId })

    const executions = await clientDeTest(connexion).execution.findMany({
      where: { communicationId },
    })
    expect(executions.map((e) => e.agent).toSorted()).toEqual(['REDACTEUR', 'VERIFICATEUR'])
    for (const execution of executions) {
      expect(execution.modele).toBe('simulation')
      expect(execution.promptVersion).toContain('simulation/')
    }
  })

  it('refuse de générer tant que la fiche de faits n’est pas revue', async () => {
    const { id } = await creerCommunication(org.redacteur, CADRAGE)
    await saisirTexte(org.redacteur, id, {
      titre: 'Note de cadrage',
      texte: TEXTE_SOURCE,
      confidentialite: 'INTERNE',
    })
    await choisirDestinataires(org.redacteur, { communicationId: id, personaIds: [org.personaId] })
    const variante = await clientDeTest(connexion).variante.findFirstOrThrow({
      where: { communicationId: id },
    })

    const erreur = await erreurMetier(genererVariante(org.redacteur, { varianteId: variante.id }))
    expect(erreur.code).toBe('ETAT_INCOMPATIBLE')
  })

  it('mène la communication en contrôle quand toutes ses variantes sont rédigées', async () => {
    const { communicationId, varianteId } = await communicationPrete()
    await genererVariante(org.redacteur, { varianteId })

    const communication = await clientDeTest(connexion).communication.findUniqueOrThrow({
      where: { id: communicationId },
    })
    expect(communication.etat).toBe('EN_CONTROLE')
  })

  it('refuse de régénérer une fois la communication passée en contrôle', async () => {
    // Le domaine ne prévoit pas EN_CONTROLE → EN_GENERATION : une fois le
    // texte produit, on le corrige (A_CORRIGER), on ne le réécrit pas d'un
    // bloc. Inventer la transition ici contournerait la machine à états.
    const { varianteId } = await communicationPrete()
    await genererVariante(org.redacteur, { varianteId })

    const erreur = await erreurMetier(genererVariante(org.redacteur, { varianteId }))
    expect(erreur.code).toBe('ETAT_INCOMPATIBLE')
  })

  it('génère persona par persona, et ne passe en contrôle qu’au dernier', async () => {
    const second = await clientDeTest(connexion).persona.create({
      data: {
        organisationId: org.organisationId,
        regionId: org.regionId,
        nom: `Second persona ${Date.now()}`,
        voix: {},
        lexique: {},
        gardeFous: {},
        exemples: [],
        canalDefaut: 'COURRIEL',
        approbateurIds: [],
      },
    })
    const { communicationId } = await communicationPrete(TEXTE_SOURCE, [org.personaId, second.id])
    const variantes = await clientDeTest(connexion).variante.findMany({
      where: { communicationId },
      orderBy: { personaId: 'asc' },
    })
    expect(variantes).toHaveLength(2)

    await genererVariante(org.redacteur, { varianteId: variantes[0]?.id ?? '' })
    const apresPremier = await clientDeTest(connexion).communication.findUniqueOrThrow({
      where: { id: communicationId },
    })
    expect(apresPremier.etat).toBe('EN_GENERATION')

    // Tant que la communication est EN_GENERATION, régénérer reste possible —
    // et ne doit rien empiler.
    const avant = await clientDeTest(connexion).affirmation.count({
      where: { varianteId: variantes[0]?.id ?? '' },
    })
    await genererVariante(org.redacteur, { varianteId: variantes[0]?.id ?? '' })
    const apres = await clientDeTest(connexion).affirmation.count({
      where: { varianteId: variantes[0]?.id ?? '' },
    })
    expect(apres).toBe(avant)

    await genererVariante(org.redacteur, { varianteId: variantes[1]?.id ?? '' })
    const fin = await clientDeTest(connexion).communication.findUniqueOrThrow({
      where: { id: communicationId },
    })
    expect(fin.etat).toBe('EN_CONTROLE')
  })
})
