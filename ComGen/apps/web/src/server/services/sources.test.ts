import { createHash } from 'node:crypto'

import { ErreurAgent, creerAnalysteSimule, creerExtracteurSimule } from '@comgen/agents'
import { verifierCitation } from '@comgen/core'
import { type Connexion, ouvrirConnexion } from '@comgen/db'
import { URL_BASE_DE_TEST, clientDeTest } from '@comgen/db/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AntivirusDesactive } from '@/server/antivirus'
import { docxMinimal } from '@/server/extraction/fixtures'

import { creerCommunication } from './communications'
import { ErreurMetier } from './erreurs'
import { deposerFichiers, saisirTexte } from './sources'
import {
  AntivirusFactice,
  type DepotTemporaire,
  type Organisation,
  depotTemporaire,
  octetsTexte,
  organisation,
} from './test/outils'

let connexion: Connexion
let org: Organisation
let depot: DepotTemporaire

beforeAll(async () => {
  connexion = ouvrirConnexion({ url: URL_BASE_DE_TEST, connexionsMax: 4 })
  org = await organisation(connexion)
  depot = await depotTemporaire()
})

afterAll(async () => {
  await depot.nettoyer()
  await connexion.fermer()
})

async function nouvelleCommunication(): Promise<string> {
  const { id } = await creerCommunication(org.redacteur, {
    titre: 'Changement de version',
    nature: 'CHANGE',
    criticite: 'COURANTE',
    portee: 'INTERNE',
    langue: 'fr',
    modeEntree: 'FICHIER',
  })
  return id
}

const FICHE = [
  'Fiche de changement CHG-2026-0412',
  'Le Portail client Atlas passe de la version 4.1.7 à la version 4.2.0.',
  "L'interruption de service est estimée à 45 minutes.",
]

describe('dépôt de fichiers (§10, mode FICHIER)', () => {
  it('fige chaque fichier en source : texte extrait, empreinte, langue, fichier conservé', async () => {
    const id = await nouvelleCommunication()
    const resultat = await deposerFichiers(
      org.redacteur,
      depot,
      id,
      [
        { nom: 'fiche.docx', octets: await docxMinimal(FICHE) },
        {
          nom: 'notes.txt',
          octets: octetsTexte('Mise en production prévue le 14 octobre 2026.\n'),
        },
      ],
      { confidentialite: 'RESTREINT' },
    )
    expect(resultat.analyseAntivirale).toBe('clamd')
    expect(resultat.fichiers.map((f) => f.statut)).toEqual(['DEPOSE', 'DEPOSE'])

    const sources = await clientDeTest(connexion).source.findMany({
      where: { communicationId: id },
      orderBy: { nom: 'asc' },
    })
    expect(sources).toHaveLength(2)
    const fiche = sources.find((s) => s.nom === 'fiche.docx')
    expect(fiche?.contenuTexte).toBe(FICHE.join('\n\n'))
    expect(fiche?.empreinte).toBe(
      createHash('sha256').update(FICHE.join('\n\n'), 'utf8').digest('hex'),
    )
    expect(fiche?.langue).toBe('fr')
    expect(fiche?.confidentialite).toBe('RESTREINT')
    expect(fiche?.cheminStockage).toMatch(new RegExp(`^${org.organisationId}/sources/`))
    const objet = await depot.stockage.lire(fiche?.cheminStockage ?? '')
    expect(objet?.typeMime).toContain('wordprocessingml')

    const communication = await clientDeTest(connexion).communication.findUniqueOrThrow({
      where: { id },
    })
    expect(communication.etat).toBe('FAITS_A_VALIDER')
  })

  it('propose des faits dont chaque citation est un extrait exact de la source', async () => {
    const id = await nouvelleCommunication()
    await deposerFichiers(
      org.redacteur,
      depot,
      id,
      [{ nom: 'fiche.docx', octets: await docxMinimal(FICHE) }],
      { confidentialite: 'INTERNE' },
    )
    const [source] = await clientDeTest(connexion).source.findMany({
      where: { communicationId: id },
    })
    const faits = await clientDeTest(connexion).fait.findMany({
      where: { communicationId: id },
      orderBy: { reference: 'asc' },
    })
    expect(faits.map((f) => [f.reference, f.valeur, f.typeValeur])).toEqual([
      ['F-01', 'CHG-2026-0412', 'IDENTIFIANT'],
      ['F-02', '4.1.7', 'VERSION'],
      ['F-03', '4.2.0', 'VERSION'],
      ['F-04', '45 minutes', 'NOMBRE'],
    ])
    for (const fait of faits) {
      expect(fait.statut).toBe('PROPOSE')
      expect(fait.confidentialite).toBe('INTERNE')
      expect(fait.citation).toContain(fait.valeur ?? '')
      expect(
        verifierCitation(source?.contenuTexte ?? '', fait.citation, fait.localisation as never),
      ).toEqual({ valide: true })
    }
  })

  it('numérote les faits à la suite quand une seconde source arrive', async () => {
    const id = await nouvelleCommunication()
    await saisirTexte(org.redacteur, id, {
      titre: 'Première',
      texte: 'Version 2.0 livrée.',
      confidentialite: 'INTERNE',
    })
    await deposerFichiers(
      org.redacteur,
      depot,
      id,
      [{ nom: 'b.txt', octets: octetsTexte('Version 3.1 prévue le 2026-11-02.') }],
      { confidentialite: 'INTERNE' },
    )
    const faits = await clientDeTest(connexion).fait.findMany({
      where: { communicationId: id },
      orderBy: { reference: 'asc' },
    })
    expect(faits.map((f) => f.reference)).toEqual(['F-01', 'F-02', 'F-03'])
  })

  it('refuse un fichier infecté : rien en base, rien dans le dépôt', async () => {
    const id = await nouvelleCommunication()
    const infecte = await depotTemporaire(
      new AntivirusFactice({ verdict: 'INFECTE', signature: 'Eicar-Test-Signature' }),
    )
    try {
      const resultat = await deposerFichiers(
        org.redacteur,
        infecte,
        id,
        [{ nom: 'eicar.txt', octets: octetsTexte('X5O!P%@AP') }],
        { confidentialite: 'INTERNE' },
      )
      expect(resultat.fichiers).toEqual([
        { nom: 'eicar.txt', statut: 'REFUSE', motif: 'INFECTE', detail: 'Eicar-Test-Signature' },
      ])
      expect(await clientDeTest(connexion).source.count({ where: { communicationId: id } })).toBe(0)
      const { readdir } = await import('node:fs/promises')
      expect(await readdir(infecte.racine)).toEqual([])
    } finally {
      await infecte.nettoyer()
    }
  })

  it("refuse quand l'antivirus est injoignable : pas de repli silencieux", async () => {
    const id = await nouvelleCommunication()
    const injoignable = await depotTemporaire(new AntivirusFactice('INDISPONIBLE'))
    try {
      const resultat = await deposerFichiers(
        org.redacteur,
        injoignable,
        id,
        [{ nom: 'a.txt', octets: octetsTexte('Version 1.2 livrée.') }],
        { confidentialite: 'INTERNE' },
      )
      expect(resultat.fichiers[0]).toMatchObject({
        statut: 'REFUSE',
        motif: 'ANTIVIRUS_INDISPONIBLE',
      })
    } finally {
      await injoignable.nettoyer()
    }
  })

  it('dit quand aucune analyse antivirale n’a été faite', async () => {
    const id = await nouvelleCommunication()
    const sansAnalyse = await depotTemporaire(new AntivirusDesactive())
    try {
      const resultat = await deposerFichiers(
        org.redacteur,
        sansAnalyse,
        id,
        [{ nom: 'a.txt', octets: octetsTexte('Version 1.3 livrée.') }],
        { confidentialite: 'INTERNE' },
      )
      expect(resultat.analyseAntivirale).toBe('aucun')
    } finally {
      await sansAnalyse.nettoyer()
    }
  })

  it('refuse un fichier dont le contenu contredit l’extension, et garde les autres', async () => {
    const id = await nouvelleCommunication()
    const resultat = await deposerFichiers(
      org.redacteur,
      depot,
      id,
      [
        { nom: 'faux.pdf', octets: octetsTexte('Ceci est du texte, pas un PDF.') },
        { nom: 'vrai.txt', octets: octetsTexte('Version 5.0 livrée.') },
      ],
      { confidentialite: 'INTERNE' },
    )
    expect(resultat.fichiers.map((f) => [f.nom, f.statut])).toEqual([
      ['faux.pdf', 'REFUSE'],
      ['vrai.txt', 'DEPOSE'],
    ])
    expect(resultat.fichiers[0]).toMatchObject({ motif: 'FORMAT_INCOHERENT' })
  })

  it('refuse une source déjà présente (même texte, même empreinte)', async () => {
    const id = await nouvelleCommunication()
    const fichier = { nom: 'a.txt', octets: octetsTexte('Version 6.0 livrée.') }
    await deposerFichiers(org.redacteur, depot, id, [fichier], { confidentialite: 'INTERNE' })
    const second = await deposerFichiers(
      org.redacteur,
      depot,
      id,
      [{ ...fichier, nom: 'copie.txt' }],
      { confidentialite: 'INTERNE' },
    )
    expect(second.fichiers[0]).toMatchObject({ statut: 'REFUSE', motif: 'EN_DOUBLE' })
  })

  it('n’accepte plus de source une fois la fiche figée', async () => {
    const id = await nouvelleCommunication()
    await clientDeTest(connexion).communication.update({
      where: { id },
      data: { etat: 'EN_GENERATION' },
    })
    try {
      await deposerFichiers(
        org.redacteur,
        depot,
        id,
        [{ nom: 'a.txt', octets: octetsTexte('Version 7.0 livrée.') }],
        { confidentialite: 'INTERNE' },
      )
      expect.unreachable()
    } catch (erreur) {
      expect(erreur).toBeInstanceOf(ErreurMetier)
      expect((erreur as ErreurMetier).code).toBe('ETAT_INCOMPATIBLE')
    }
  })
})

describe('texte saisi (§10, mode TEXTE_SAISI)', () => {
  it('le texte devient une source avec empreinte, sans fichier', async () => {
    const id = await nouvelleCommunication()
    const texte =
      'Incident INC-2026-0187 : le service de facturation a été rétabli à 15h10 par les équipes.\r\n'
    const resultat = await saisirTexte(org.redacteur, id, {
      titre: 'Déclaration de l’astreinte',
      texte,
      confidentialite: 'INTERNE',
    })
    expect(resultat.langue).toBe('fr')
    expect(resultat.faitsProposes).toBe(2)
    const source = await clientDeTest(connexion).source.findUniqueOrThrow({
      where: { id: resultat.sourceId },
    })
    expect(source).toMatchObject({
      type: 'TEXTE_SAISI',
      nom: 'Déclaration de l’astreinte',
      cheminStockage: null,
      contenuTexte:
        'Incident INC-2026-0187 : le service de facturation a été rétabli à 15h10 par les équipes.',
    })
  })

  it('refuse un texte vide ou sans intitulé', async () => {
    const id = await nouvelleCommunication()
    try {
      await saisirTexte(org.redacteur, id, {
        titre: ' ',
        texte: ' \n ',
        confidentialite: 'INTERNE',
      })
      expect.unreachable()
    } catch (erreur) {
      expect((erreur as ErreurMetier).details.champs).toEqual({ titre: 'requis', texte: 'requis' })
    }
  })
})

describe('lecture des sources par les agents', () => {
  const TEXTE = [
    'Objet : migration du portail vers la version 4.2',
    'La migration aura lieu le 12 mars 2026.',
    'Les clients doivent renouveler leur clé avant la fin de la fenêtre de maintenance.',
    'Le service sera indisponible pendant 45 minutes.',
  ].join('\n')

  const saisie = { titre: 'Note', texte: TEXTE, confidentialite: 'INTERNE' } as const

  it('trace chaque agent qui a lu la source, en disant qu’il est simulé', async () => {
    const id = await nouvelleCommunication()
    await saisirTexte(org.redacteur, id, saisie)

    const executions = await clientDeTest(connexion).execution.findMany({
      where: { communicationId: id },
    })
    expect(executions.map((e) => e.agent).toSorted()).toEqual([
      'ANALYSTE_IMPACT',
      'EXTRACTEUR',
      'SUGGESTEUR',
    ])
    for (const execution of executions) {
      expect(execution.varianteId).toBeNull()
      expect(execution.modele).toBe('simulation')
      expect(execution.succes).toBe(true)
      expect(execution.parametres).toMatchObject({ simule: true })
    }
  })

  it('range les audiences nommées par la source, chacune avec la phrase qui les nomme', async () => {
    const id = await nouvelleCommunication()
    await saisirTexte(org.redacteur, id, saisie)

    const suggestions = await clientDeTest(connexion).suggestionAudience.findMany({
      where: { communicationId: id },
    })
    const clients = suggestions.find((s) => s.dimension === 'Clients')
    expect(clients).toMatchObject({
      origine: 'MOT_CLE',
      decision: 'EN_ATTENTE',
      extrait: 'Les clients doivent renouveler leur clé avant la fin de la fenêtre de maintenance.',
    })
    // Une suggestion est une phrase de la source, pas une invention.
    for (const suggestion of suggestions) expect(TEXTE).toContain(suggestion.extrait)
  })

  it('garde la lecture du cadrage avec la source, sans jamais l’appliquer', async () => {
    // Le cadrage reste ce que le rédacteur a saisi : l'agent propose, il ne décide pas.
    const { id } = await creerCommunication(org.redacteur, {
      titre: 'Livraison du portail',
      nature: 'RELEASE',
      criticite: 'COURANTE',
      portee: 'INTERNE',
      langue: 'fr',
      modeEntree: 'TEXTE_SAISI',
    })
    const { sourceId } = await saisirTexte(org.redacteur, id, saisie)

    const source = await clientDeTest(connexion).source.findUniqueOrThrow({
      where: { id: sourceId },
    })
    expect(source.cadrageSuggere).toMatchObject({
      titre: { valeur: 'migration du portail vers la version 4.2' },
      nature: { valeur: 'CHANGE' },
      criticite: { valeur: 'IMPORTANTE' },
    })
    const communication = await clientDeTest(connexion).communication.findUniqueOrThrow({
      where: { id },
    })
    expect(communication.nature).toBe('RELEASE')
    expect(communication.criticite).toBe('COURANTE')
    expect(communication.titre).toBe('Livraison du portail')
  })

  it('accepte un texte sans aucune valeur : zéro fait, et l’échec de l’extracteur est tracé', async () => {
    // Pas de repli « générique mais crédible » : l'extracteur échoue, et le
    // dépôt continue sans fait — au rédacteur d'en ajouter à la main.
    const id = await nouvelleCommunication()
    const resultat = await saisirTexte(org.redacteur, id, {
      titre: 'Note sans chiffre',
      texte: 'Le portail évolue pour mieux servir les clients.',
      confidentialite: 'INTERNE',
    })
    expect(resultat.faitsProposes).toBe(0)

    const executions = await clientDeTest(connexion).execution.findMany({
      where: { communicationId: id },
    })
    const extracteur = executions.find((e) => e.agent === 'EXTRACTEUR')
    expect(extracteur?.succes).toBe(false)
    expect(extracteur?.erreur).toBeTruthy()
    // Les autres agents ont tout de même lu la source.
    expect(executions.find((e) => e.agent === 'ANALYSTE_IMPACT')?.succes).toBe(true)
    const suggestions = await clientDeTest(connexion).suggestionAudience.findMany({
      where: { communicationId: id },
    })
    expect(suggestions.map((s) => s.dimension)).toEqual(['Clients'])
  })

  it('une citation inventée par l’extracteur annule tout le dépôt', async () => {
    // La sortie de l'agent est une proposition : sa citation est revérifiée
    // contre le texte exact de la source avant d'être écrite.
    const id = await nouvelleCommunication()
    const menteur = {
      ...creerExtracteurSimule(),
      executer: () =>
        Promise.resolve({
          sortie: {
            faits: [
              {
                enonce: 'Le service sera interrompu',
                valeur: '99',
                typeValeur: 'NOMBRE' as const,
                citation: 'Une phrase que la source ne contient pas, 99 minutes.',
                localisation: { offsetDebut: 0, offsetFin: 10, ligne: 1 },
                confiance: 0.9,
              },
            ],
          },
          trace: {
            role: 'EXTRACTEUR' as const,
            prompt: 'test/extracteur@1',
            modele: null,
            jetonsEntree: 0,
            jetonsSortie: 0,
            dureeMs: 0,
            simule: true,
          },
        }),
    }

    await expect(
      saisirTexte(org.redacteur, id, saisie, { agents: { extracteur: menteur } }),
    ).rejects.toThrow(/citation/i)

    const db = clientDeTest(connexion)
    expect(await db.source.count({ where: { communicationId: id } })).toBe(0)
    expect(await db.fait.count({ where: { communicationId: id } })).toBe(0)
    expect(await db.execution.count({ where: { communicationId: id } })).toBe(0)
  })

  it('une valeur que sa citation ne contient pas annule tout le dépôt', async () => {
    // La citation est réelle, mais la valeur annoncée n'y est pas : c'est
    // exactement l'écart qu'une fonction pure ne pouvait pas avoir et qu'un
    // agent peut.
    const id = await nouvelleCommunication()
    const reel = creerExtracteurSimule()
    const altere = {
      ...reel,
      async executer(entree: { texte: string }, contexte: Parameters<typeof reel.executer>[1]) {
        const resultat = await reel.executer(entree, contexte)
        return {
          ...resultat,
          sortie: {
            faits: resultat.sortie.faits.map((fait, rang) =>
              rang === 0 ? Object.assign({}, fait, { valeur: '99999' }) : fait,
            ),
          },
        }
      },
    }

    await expect(
      saisirTexte(org.redacteur, id, saisie, { agents: { extracteur: altere } }),
    ).rejects.toThrow(/valeur/i)

    const db = clientDeTest(connexion)
    expect(await db.source.count({ where: { communicationId: id } })).toBe(0)
    expect(await db.fait.count({ where: { communicationId: id } })).toBe(0)
  })

  it('un analyste en panne ne bloque pas le dépôt : ses suggestions sont facultatives', async () => {
    const id = await nouvelleCommunication()
    const resultat = await saisirTexte(org.redacteur, id, saisie, {
      agents: {
        analyste: {
          ...creerAnalysteSimule(),
          executer: () =>
            Promise.reject(new ErreurAgent('SORTIE_INVALIDE', 'ANALYSTE_IMPACT', 'Panne simulée')),
        },
      },
    })
    expect(resultat.faitsProposes).toBeGreaterThan(0)

    const db = clientDeTest(connexion)
    expect(await db.suggestionAudience.count({ where: { communicationId: id } })).toBe(0)
    const analyste = await db.execution.findFirst({
      where: { communicationId: id, agent: 'ANALYSTE_IMPACT' },
    })
    expect(analyste).toMatchObject({ succes: false })
    expect(analyste?.erreur).toContain('Panne simulée')
  })
})
