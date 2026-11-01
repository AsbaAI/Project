import {
  ErreurAgent,
  type EvenementOrchestration,
  creerRedacteurSimule,
  creerVerificateurSimule,
} from '@comgen/agents'
import { type Connexion, ouvrirConnexion } from '@comgen/db'
import { URL_BASE_DE_TEST, clientDeTest } from '@comgen/db/test'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { type MessageFlux, messagesDuFlux } from '@/lib/flux-agents'

import { changerEtat, creerCommunication } from './communications'
import { ErreurMetier } from './erreurs'
import { chargerFiche, confirmerFait } from './faits'
import { fluxGeneration } from './flux-generation'
import {
  chargerGeneration,
  choisirDestinataires,
  genererVariante,
  listerAudiencesSansPersona,
  listerPersonas,
} from './generation'
import { saisirTexte } from './sources'
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
  it('GARDIEN : un persona plafonné sous la confidentialité des faits bloque la variante', async () => {
    const { varianteId, communicationId } = await communicationPrete()
    const db = clientDeTest(connexion)
    const variante = await db.variante.findUniqueOrThrow({ where: { id: varianteId } })
    const original = await db.persona.findUniqueOrThrow({ where: { id: variante.personaId } })
    // Les faits de la source sont INTERNE ; ce persona n'a droit qu'au PUBLIC.
    await db.persona.update({
      where: { id: original.id },
      data: { gardeFous: { confidentialiteMax: 'PUBLIC', sujetsInterdits: [] } },
    })
    try {
      const rapport = await genererVariante(org.redacteur, { varianteId })
      expect(rapport.bloquant).toBe(false) // le vérificateur est satisfait…
      const apres = await db.variante.findUniqueOrThrow({ where: { id: varianteId } })
      expect(apres.etat).toBe('A_REVOIR') // …mais le GARDIEN bloque.
      const controles = await db.controle.findMany({
        where: { varianteId, type: 'CONFIDENTIALITE_PERSONA' },
      })
      expect(controles).toHaveLength(1)
      expect(controles[0]).toMatchObject({ bloquant: true })
      expect(controles[0]?.message).toContain('PUBLIC')
    } finally {
      await db.persona.update({
        where: { id: original.id },
        data: { gardeFous: original.gardeFous ?? {} },
      })
    }
    expect(communicationId).toBeTruthy()
  })

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
    const { varianteId } = await communicationPrete()
    await genererVariante(org.redacteur, { varianteId })

    const executions = await clientDeTest(connexion).execution.findMany({
      where: { varianteId },
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

describe('genererVariante — orchestration des agents', () => {
  it('annonce l’état de chaque agent, de l’attente à la fin', async () => {
    const { varianteId } = await communicationPrete()
    const evenements: EvenementOrchestration[] = []
    await genererVariante(
      org.redacteur,
      { varianteId },
      { surEvenement: (evenement) => evenements.push(evenement) },
    )

    // Dès le premier événement toute la chronologie est connue : rien n'a
    // commencé, et l'interface n'a rien à recoller ensuite.
    expect(evenements[0]?.etapes.map((e) => [e.role, e.etat])).toEqual([
      ['REDACTEUR', 'EN_ATTENTE'],
      ['VERIFICATEUR', 'EN_ATTENTE'],
    ])
    // Un seul agent travaille à la fois : la chaîne est séquentielle.
    for (const evenement of evenements) {
      expect(evenement.etapes.filter((e) => e.etat === 'EN_COURS').length).toBeLessThanOrEqual(1)
    }
    const dernier = evenements.at(-1)
    expect(dernier?.termine).toBe(true)
    expect(dernier?.etapes.map((e) => e.etat)).toEqual(['TERMINEE', 'TERMINEE'])
  })

  it('transmet les délais aux agents : deux paliers chacun', async () => {
    const { varianteId } = await communicationPrete()
    const attentes: number[] = []
    await genererVariante(
      org.redacteur,
      { varianteId },
      {
        attendre: (ms) => {
          attentes.push(ms)
          return Promise.resolve()
        },
      },
    )
    expect(attentes).toHaveLength(4)
    expect(attentes.every((ms) => ms > 0)).toBe(true)
  })

  it('dit que les agents sont simulés, et pourquoi, par la fabrique', async () => {
    const { varianteId } = await communicationPrete()
    const rapport = await genererVariante(org.redacteur, { varianteId })
    expect(rapport.mode).toBe('simulation')
    expect(rapport.motif).toBe('AUCUN_FOURNISSEUR')
  })

  it('un agent qui échoue arrête la chaîne : suivant annulé, rien d’écrit, échec tracé', async () => {
    const { varianteId, communicationId } = await communicationPrete()
    const avant = await clientDeTest(connexion).variante.findUniqueOrThrow({
      where: { id: varianteId },
    })
    const evenements: EvenementOrchestration[] = []

    const erreur = await erreurMetier(
      genererVariante(
        org.redacteur,
        { varianteId },
        {
          agents: {
            redacteur: {
              ...creerRedacteurSimule(),
              executer: () =>
                Promise.reject(
                  new ErreurAgent('SOURCE_INEXPLOITABLE', 'REDACTEUR', 'Rien à écrire'),
                ),
            },
          },
          surEvenement: (evenement) => evenements.push(evenement),
        },
      ),
    )

    expect(erreur.code).toBe('GENERATION_REFUSEE')
    expect(erreur.message).toContain('Rien à écrire')
    // Le suivant est ANNULEE, pas « en attente » : il ne reprendra pas seul.
    expect(evenements.at(-1)?.etapes.map((e) => e.etat)).toEqual(['ECHOUEE', 'ANNULEE'])

    // Aucun résultat partiel : le texte, les affirmations et l'état n'ont pas bougé.
    const apres = await clientDeTest(connexion).variante.findUniqueOrThrow({
      where: { id: varianteId },
    })
    expect(apres.contenu).toEqual(avant.contenu)
    expect(apres.etat).toBe(avant.etat)
    expect(await clientDeTest(connexion).affirmation.count({ where: { varianteId } })).toBe(0)
    const communication = await clientDeTest(connexion).communication.findUniqueOrThrow({
      where: { id: communicationId },
    })
    expect(communication.etat).toBe('PRETE_A_GENERER')

    // L'échec est tracé : il a coûté du travail, l'historique doit le dire.
    const executions = await clientDeTest(connexion).execution.findMany({
      where: { varianteId },
    })
    expect(executions).toHaveLength(1)
    expect(executions[0]).toMatchObject({ agent: 'REDACTEUR', succes: false })
    expect(executions[0]?.erreur).toContain('Rien à écrire')
  })

  it('un rédacteur qui écrit une valeur à la main est refusé, et rien n’est écrit', async () => {
    // La contrainte cardinale vue du service : quoi que dise l'agent, une
    // date glissée dans un segment libre n'atteint jamais le texte.
    const { varianteId } = await communicationPrete()

    const erreur = await erreurMetier(
      genererVariante(
        org.redacteur,
        { varianteId },
        {
          agents: {
            redacteur: {
              ...creerRedacteurSimule(),
              executer: () =>
                Promise.resolve({
                  sortie: {
                    paragraphes: [
                      {
                        role: 'corps' as const,
                        segments: [
                          {
                            type: 'texte' as const,
                            texte: 'La migration aura lieu le 5 mai 2027.',
                          },
                        ],
                      },
                    ],
                  },
                  trace: {
                    role: 'REDACTEUR' as const,
                    prompt: 'test/redacteur@1',
                    modele: null,
                    jetonsEntree: 0,
                    jetonsSortie: 0,
                    dureeMs: 0,
                    simule: true,
                  },
                }),
            },
          },
        },
      ),
    )

    expect(erreur.code).toBe('GENERATION_REFUSEE')
    const variante = await clientDeTest(connexion).variante.findUniqueOrThrow({
      where: { id: varianteId },
    })
    expect(JSON.stringify(variante.contenu)).not.toContain('5 mai 2027')
    expect(await clientDeTest(connexion).affirmation.count({ where: { varianteId } })).toBe(0)
    const executions = await clientDeTest(connexion).execution.findMany({
      where: { varianteId },
    })
    expect(executions.map((e) => [e.agent, e.succes])).toEqual([['REDACTEUR', false]])
  })

  it('un vérificateur en panne laisse le texte non écrit, et trace les deux agents', async () => {
    const { varianteId } = await communicationPrete()
    const avant = await clientDeTest(connexion).variante.findUniqueOrThrow({
      where: { id: varianteId },
    })

    const erreur = await erreurMetier(
      genererVariante(
        org.redacteur,
        { varianteId },
        {
          agents: {
            verificateur: {
              ...creerVerificateurSimule(),
              executer: () =>
                Promise.reject(new ErreurAgent('SORTIE_INVALIDE', 'VERIFICATEUR', 'Panne simulée')),
            },
          },
        },
      ),
    )
    expect(erreur.message).toContain('Panne simulée')

    // Un texte que personne n'a vérifié n'est pas écrit : ce serait un
    // résultat partiel présenté comme complet.
    const apres = await clientDeTest(connexion).variante.findUniqueOrThrow({
      where: { id: varianteId },
    })
    expect(apres.contenu).toEqual(avant.contenu)

    const executions = await clientDeTest(connexion).execution.findMany({
      where: { varianteId },
      orderBy: { creeLe: 'asc' },
    })
    expect(executions.map((e) => [e.agent, e.succes]).toSorted()).toEqual([
      ['REDACTEUR', true],
      ['VERIFICATEUR', false],
    ])
  })

  it('une génération annulée n’écrit rien et ne trace aucun agent', async () => {
    const { varianteId } = await communicationPrete()
    const controleur = new AbortController()
    controleur.abort()
    const evenements: EvenementOrchestration[] = []

    const erreur = await erreurMetier(
      genererVariante(
        org.redacteur,
        { varianteId },
        { signal: controleur.signal, surEvenement: (evenement) => evenements.push(evenement) },
      ),
    )
    expect(erreur.code).toBe('GENERATION_REFUSEE')
    expect(evenements.at(-1)?.etapes.map((e) => e.etat)).toEqual(['ANNULEE', 'ANNULEE'])
    expect(await clientDeTest(connexion).affirmation.count({ where: { varianteId } })).toBe(0)
    // Aucun agent n'a tourné : rien à tracer.
    expect(await clientDeTest(connexion).execution.count({ where: { varianteId } })).toBe(0)
  })
})

async function lireFlux(flux: ReadableStream<Uint8Array>): Promise<MessageFlux[]> {
  const messages: MessageFlux[] = []
  for await (const message of messagesDuFlux(flux)) messages.push(message)
  return messages
}

describe('fluxGeneration', () => {
  it('annonce qui répond, puis chaque agent, puis la fin', async () => {
    const { varianteId } = await communicationPrete()
    const messages = await lireFlux(fluxGeneration(org.redacteur, varianteId))

    // Avant le premier agent : on dit déjà si c'est une simulation.
    expect(messages[0]).toEqual({
      type: 'debut',
      mode: 'simulation',
      motif: 'AUCUN_FOURNISSEUR',
    })
    expect(messages.at(-1)).toEqual({ type: 'fin', bloquant: false })

    const etats = messages.flatMap((m) => (m.type === 'etat' ? [m] : []))
    // Attente, REDACTEUR en cours, REDACTEUR fini, VERIFICATEUR en cours, fini.
    expect(etats.length).toBeGreaterThanOrEqual(5)
    expect(etats[0]?.etapes.map((e) => e.etat)).toEqual(['EN_ATTENTE', 'EN_ATTENTE'])
    expect(etats.at(-1)?.termine).toBe(true)
  })

  it('dit l’échec comme dernier message, sans jamais annoncer de fin', async () => {
    const { varianteId } = await communicationPrete()
    const messages = await lireFlux(
      fluxGeneration(org.redacteur, varianteId, {
        agents: {
          redacteur: {
            ...creerRedacteurSimule(),
            executer: () =>
              Promise.reject(new ErreurAgent('SOURCE_INEXPLOITABLE', 'REDACTEUR', 'Rien à écrire')),
          },
        },
      }),
    )
    expect(messages.some((m) => m.type === 'fin')).toBe(false)
    expect(messages.at(-1)).toEqual({
      type: 'erreur',
      code: 'GENERATION_REFUSEE',
      detail: 'Rien à écrire',
    })
    // La chronologie dit aussi lequel a échoué et ce qui n'a pas eu lieu.
    const dernierEtat = messages.findLast((m) => m.type === 'etat')
    expect(dernierEtat?.type === 'etat' && dernierEtat.etapes.map((e) => e.etat)).toEqual([
      'ECHOUEE',
      'ANNULEE',
    ])
  })

  it('refuse sans le droit de générer, sans dire pourquoi en détail', async () => {
    const { varianteId } = await communicationPrete()
    const auditeur = await utilisateurAvecRoles(connexion, org, ['AUDITEUR'])
    const messages = await lireFlux(fluxGeneration(auditeur, varianteId))
    // Le motif technique (« Action GENERER refusée : … ») ne sort pas du serveur.
    expect(messages.at(-1)).toEqual({ type: 'erreur', code: 'NON_AUTORISE' })
    expect(messages.some((m) => m.type === 'etat')).toBe(false)
  })

  it('dit qu’une variante est introuvable, sans détail', async () => {
    const messages = await lireFlux(fluxGeneration(org.redacteur, 'variante-inexistante'))
    expect(messages.at(-1)).toEqual({ type: 'erreur', code: 'INTROUVABLE' })
  })

  it('une panne inattendue ne divulgue rien de sa cause, mais la journalise', async () => {
    const { varianteId } = await communicationPrete()
    const journal = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const panne = new TypeError('connexion postgres://secret@interne/base')
    try {
      const messages = await lireFlux(
        fluxGeneration(org.redacteur, varianteId, {
          agents: {
            verificateur: {
              ...creerVerificateurSimule(),
              executer: () => Promise.reject(panne),
            },
          },
        }),
      )
      // Ni le dernier message, ni aucun état intermédiaire : la cause ne
      // sort du serveur sous aucune forme.
      expect(JSON.stringify(messages)).not.toContain('postgres://')
      expect(messages.at(-1)?.type).toBe('erreur')
      // Elle va au journal du serveur, où quelqu'un pourra la lire.
      expect(journal).toHaveBeenCalledWith(expect.any(String), panne)
    } finally {
      journal.mockRestore()
    }
  })
})

describe('chargerGeneration — agents affichés', () => {
  it('n’affiche aucun agent pour une génération qui a échoué', async () => {
    // Le rédacteur a tourné, le vérificateur est tombé : aucun texte n'a été
    // écrit. Afficher « Rédacteur » à côté d'une variante vide laisserait
    // croire qu'il en a produit un.
    const { communicationId, varianteId } = await communicationPrete()
    await erreurMetier(
      genererVariante(
        org.redacteur,
        { varianteId },
        {
          agents: {
            verificateur: {
              ...creerVerificateurSimule(),
              executer: () =>
                Promise.reject(new ErreurAgent('SORTIE_INVALIDE', 'VERIFICATEUR', 'Panne simulée')),
            },
          },
        },
      ),
    )

    const ecran = await chargerGeneration(org.redacteur, communicationId)
    expect(ecran.variantes[0]?.executions).toEqual([])
  })

  it('n’affiche que les agents de la génération qui a réussi, pas ceux d’un essai raté avant', async () => {
    const { communicationId, varianteId } = await communicationPrete()
    await erreurMetier(
      genererVariante(
        org.redacteur,
        { varianteId },
        {
          agents: {
            verificateur: {
              ...creerVerificateurSimule(),
              executer: () =>
                Promise.reject(new ErreurAgent('SORTIE_INVALIDE', 'VERIFICATEUR', 'Panne simulée')),
            },
          },
        },
      ),
    )
    await genererVariante(org.redacteur, { varianteId })

    const ecran = await chargerGeneration(org.redacteur, communicationId)
    expect(ecran.variantes[0]?.executions.map((e) => e.agent).toSorted()).toEqual([
      'REDACTEUR',
      'VERIFICATEUR',
    ])
    // L'historique, lui, garde tout : quatre agents ont tourné, un a échoué.
    expect(await clientDeTest(connexion).execution.count({ where: { varianteId } })).toBe(4)
  })
})

async function personaNomme(nom: string) {
  return clientDeTest(connexion).persona.create({
    data: {
      organisationId: org.organisationId,
      regionId: org.regionId,
      nom,
      voix: {},
      lexique: {},
      gardeFous: {},
      exemples: [],
      canalDefaut: 'COURRIEL',
      approbateurIds: [],
    },
  })
}

describe('audiences suggérées par la source', () => {
  const TEXTE_AUDIENCES = [
    'Les clients doivent renouveler leur clé avant le 12 mars 2026.',
    'Les fournisseurs seront prévenus le 3 mars 2026.',
  ].join('\n')

  async function communicationAvecSource() {
    const { id } = await creerCommunication(org.redacteur, CADRAGE)
    await saisirTexte(org.redacteur, id, {
      titre: 'Note',
      texte: TEXTE_AUDIENCES,
      confidentialite: 'INTERNE',
    })
    return id
  }

  it('désigne le persona que la source nomme, avec la phrase qui le nomme', async () => {
    const clients = await personaNomme('Clients grands comptes')
    const support = await personaNomme('Support client')
    const id = await communicationAvecSource()

    const personas = await listerPersonas(org.redacteur, id)
    expect(personas.find((p) => p.id === clients.id)?.suggestion).toMatchObject({
      extrait: 'Les clients doivent renouveler leur clé avant le 12 mars 2026.',
    })
    // « Support client » s'adresse à ceux qui soutiennent les clients.
    expect(personas.find((p) => p.id === support.id)?.suggestion).toBeNull()
  })

  it('dit les audiences que la source nomme sans qu’aucun persona leur corresponde', async () => {
    await personaNomme('Clients grands comptes')
    const id = await communicationAvecSource()

    const sansPersona = await listerAudiencesSansPersona(org.redacteur, id)
    expect(sansPersona.map((a) => a.dimension)).toEqual(['Fournisseurs'])
    expect(sansPersona[0]?.extrait).toBe('Les fournisseurs seront prévenus le 3 mars 2026.')
  })

  it('ne retient aucun persona d’office : l’agent suggère, l’humain décide', async () => {
    await personaNomme('Clients grands comptes')
    const id = await communicationAvecSource()
    expect(await clientDeTest(connexion).variante.count({ where: { communicationId: id } })).toBe(0)
  })

  it('enregistre la décision : acceptée si le persona est retenu, refusée sinon', async () => {
    const clients = await personaNomme('Clients grands comptes')
    const autre = await personaNomme('Équipes techniques')
    const id = await communicationAvecSource()
    const decisions = async () =>
      Object.fromEntries(
        (
          await clientDeTest(connexion).suggestionAudience.findMany({
            where: { communicationId: id },
          })
        ).map((s) => [s.dimension, s.decision]),
      )
    expect(await decisions()).toEqual({ Clients: 'EN_ATTENTE', Fournisseurs: 'EN_ATTENTE' })

    await choisirDestinataires(org.redacteur, { communicationId: id, personaIds: [clients.id] })
    // « Fournisseurs » ne désigne aucun persona : elle ne peut être ni acceptée ni refusée.
    expect(await decisions()).toEqual({ Clients: 'ACCEPTEE', Fournisseurs: 'EN_ATTENTE' })

    await choisirDestinataires(org.redacteur, { communicationId: id, personaIds: [autre.id] })
    expect(await decisions()).toEqual({ Clients: 'REFUSEE', Fournisseurs: 'EN_ATTENTE' })
  })
})
