import { type Connexion, ouvrirConnexion } from '@comgen/db'
import { URL_BASE_DE_TEST, clientDeTest } from '@comgen/db/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ErreurAutorisation } from '@/server/auth/droits'

import { changerEtat, chargerCommunication, creerCommunication } from './communications'
import { ErreurMetier } from './erreurs'
import {
  ajouterFait,
  amenderValeur,
  changerConfidentialiteFait,
  chargerFiche,
  confirmerFait,
  modifierEnonce,
  retablirFait,
  retirerFait,
} from './faits'
import { saisirTexte } from './sources'
import { type Organisation, organisation } from './test/outils'

let connexion: Connexion
let org: Organisation
let autre: Organisation

beforeAll(async () => {
  connexion = ouvrirConnexion({ url: URL_BASE_DE_TEST, connexionsMax: 4 })
  org = await organisation(connexion)
  autre = await organisation(connexion)
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

const DECLARATION = 'Déclaration : le service de facturation a été rétabli à 15h10.'
const JOURNAL = 'Journal de supervision : le service de facturation a été rétabli à 14h52.'

/** Une communication à deux sources dont les heures de rétablissement divergent. */
async function incident(proprietaire: Organisation = org) {
  const { id } = await creerCommunication(proprietaire.redacteur, {
    titre: 'Incident de facturation',
    nature: 'INCIDENT',
    criticite: 'CRITIQUE',
    portee: 'INTERNE',
    langue: 'fr',
    modeEntree: 'TEXTE_SAISI',
  })
  const declaration = await saisirTexte(proprietaire.redacteur, id, {
    titre: 'Déclaration',
    texte: DECLARATION,
    confidentialite: 'INTERNE',
  })
  const journal = await saisirTexte(proprietaire.redacteur, id, {
    titre: 'Journal',
    texte: JOURNAL,
    confidentialite: 'INTERNE',
  })
  const faits = await clientDeTest(connexion).fait.findMany({
    where: { communicationId: id },
    orderBy: { reference: 'asc' },
  })
  const [heureDeclaree, heureJournal] = faits
  if (!heureDeclaree || !heureJournal) throw new Error('Faits candidats attendus')
  return { id, declaration, journal, heureDeclaree, heureJournal }
}

describe('revue fait par fait', () => {
  it('confirme, retire, rétablit ; chaque fait garde sa citation en regard', async () => {
    const { id, heureDeclaree } = await incident()
    await confirmerFait(org.redacteur, heureDeclaree.id)
    let fiche = await chargerFiche(org.redacteur, id)
    expect(fiche.faits.find((f) => f.id === heureDeclaree.id)).toMatchObject({
      statut: 'CONFIRME',
      citation: DECLARATION,
      valeur: '15h10',
    })
    expect(fiche.sources.map((s) => s.contenuTexte)).toEqual([DECLARATION, JOURNAL])

    await retirerFait(org.redacteur, heureDeclaree.id)
    await retablirFait(org.redacteur, heureDeclaree.id)
    fiche = await chargerFiche(org.redacteur, id)
    expect(fiche.faits.find((f) => f.id === heureDeclaree.id)?.statut).toBe('PROPOSE')
  })

  it('refuse de confirmer un fait retiré, et de toucher une fiche figée', async () => {
    const { id, heureDeclaree } = await incident()
    await retirerFait(org.redacteur, heureDeclaree.id)
    expect((await erreurMetier(confirmerFait(org.redacteur, heureDeclaree.id))).code).toBe(
      'ETAT_INCOMPATIBLE',
    )
    await clientDeTest(connexion).communication.update({
      where: { id },
      data: { etat: 'EN_GENERATION' },
    })
    expect((await erreurMetier(retablirFait(org.redacteur, heureDeclaree.id))).code).toBe(
      'ETAT_INCOMPATIBLE',
    )
  })

  it('marque un fait confidentiel', async () => {
    const { heureJournal } = await incident()
    await changerConfidentialiteFait(org.redacteur, heureJournal.id, 'SECRET')
    const fait = await clientDeTest(connexion).fait.findUniqueOrThrow({
      where: { id: heureJournal.id },
    })
    expect(fait.confidentialite).toBe('SECRET')
  })

  it('n’écrit rien pour un approbateur ni pour une autre organisation', async () => {
    const { heureDeclaree } = await incident()
    await expect(confirmerFait(org.approbateur, heureDeclaree.id)).rejects.toBeInstanceOf(
      ErreurAutorisation,
    )
    expect((await erreurMetier(confirmerFait(autre.redacteur, heureDeclaree.id))).code).toBe(
      'INTROUVABLE',
    )
    expect(
      (await erreurMetier(chargerFiche(autre.redacteur, heureDeclaree.communicationId))).code,
    ).toBe('INTROUVABLE')
    const fait = await clientDeTest(connexion).fait.findUniqueOrThrow({
      where: { id: heureDeclaree.id },
    })
    expect(fait.statut).toBe('PROPOSE')
  })
})

describe('contradictions entre sources (§15)', () => {
  it('nommer deux faits de la même façon révèle la contradiction, qui bloque la suite', async () => {
    const { id, heureDeclaree, heureJournal } = await incident()
    for (const fait of [heureDeclaree, heureJournal]) {
      // oxlint-disable-next-line no-await-in-loop -- deux écritures successives sur la même fiche
      await modifierEnonce(org.redacteur, fait.id, 'Heure de rétablissement du service')
      // oxlint-disable-next-line no-await-in-loop -- idem
      await confirmerFait(org.redacteur, fait.id)
    }
    const fiche = await chargerFiche(org.redacteur, id)
    expect(fiche.contradictions).toHaveLength(1)
    expect(fiche.contradictions[0]?.valeurs).toEqual(['15h10', '14h52'])
    expect(fiche.faits.filter((f) => f.contradiction === 0)).toHaveLength(2)

    const erreur = await erreurMetier(changerEtat(org.redacteur, id, 'PRETE_A_GENERER'))
    expect(erreur.code).toBe('TRANSITION_REFUSEE')
    expect(erreur.details.motifs).toContain('CONTRADICTION_NON_TRANCHEE')
  })

  it('trancher en retirant un des faits lève la barrière', async () => {
    const { id, heureDeclaree, heureJournal } = await incident()
    for (const fait of [heureDeclaree, heureJournal]) {
      // oxlint-disable-next-line no-await-in-loop -- écritures successives
      await modifierEnonce(org.redacteur, fait.id, 'Heure de rétablissement du service')
    }
    await confirmerFait(org.redacteur, heureJournal.id)
    await retirerFait(org.redacteur, heureDeclaree.id)
    const detail = await chargerCommunication(org.redacteur, id)
    expect(detail.contradictions).toEqual([])
    const versPrete = detail.transitions.find((t) => t.vers === 'PRETE_A_GENERER')
    expect(versPrete?.resultat).toEqual({ autorisee: false, motifs: ['AUCUN_PERSONA'] })
  })

  it('trancher par amendement : la valeur rejoint l’autre source, justification tracée', async () => {
    const { id, heureDeclaree, heureJournal } = await incident()
    for (const fait of [heureDeclaree, heureJournal]) {
      // oxlint-disable-next-line no-await-in-loop -- écritures successives
      await modifierEnonce(org.redacteur, fait.id, 'Heure de rétablissement du service')
    }
    await amenderValeur(org.redacteur, heureDeclaree.id, {
      nouvelleValeur: '14h52',
      justification: 'Le journal de supervision horodate le rétablissement à la minute près.',
      sourceInvoquee: 'Journal de supervision FACT-CORE du 15 septembre',
      responsabiliteAssumee: false,
    })
    const fiche = await chargerFiche(org.redacteur, id)
    expect(fiche.contradictions).toEqual([])
    const amende = fiche.faits.find((f) => f.id === heureDeclaree.id)
    expect(amende).toMatchObject({ valeur: '14h52', statut: 'CONFIRME', citation: DECLARATION })
    expect(amende?.amendements).toEqual([
      expect.objectContaining({
        ancienneValeur: '15h10',
        nouvelleValeur: '14h52',
        responsabiliteAssumee: false,
        auteurNom: org.redacteur.utilisateur.nom,
      }),
    ])
  })
})

describe('amendement (§11)', () => {
  it('exige une justification et un appui : source invoquée ou responsabilité assumée', async () => {
    const { heureDeclaree } = await incident()
    const erreur = await erreurMetier(
      amenderValeur(org.redacteur, heureDeclaree.id, {
        nouvelleValeur: '15h00',
        justification: 'court',
        responsabiliteAssumee: false,
      }),
    )
    expect(erreur.details.champs).toEqual({
      justification: 'trop_court',
      sourceInvoquee: 'appui_requis',
    })
    expect(
      await clientDeTest(connexion).amendementFait.count({ where: { faitId: heureDeclaree.id } }),
    ).toBe(0)
  })

  it('un fait dont on assume la valeur devient DECLARE', async () => {
    const { heureDeclaree } = await incident()
    await amenderValeur(org.redacteur, heureDeclaree.id, {
      nouvelleValeur: '15h05',
      justification: 'Confirmé oralement par le responsable de l’astreinte.',
      responsabiliteAssumee: true,
    })
    const fait = await clientDeTest(connexion).fait.findUniqueOrThrow({
      where: { id: heureDeclaree.id },
    })
    expect(fait).toMatchObject({ valeur: '15h05', statut: 'DECLARE' })
  })

  it('une fiche prête modifiée revient à valider', async () => {
    const { id, heureDeclaree } = await incident()
    await clientDeTest(connexion).communication.update({
      where: { id },
      data: { etat: 'PRETE_A_GENERER' },
    })
    await amenderValeur(org.redacteur, heureDeclaree.id, {
      nouvelleValeur: '15h11',
      justification: 'Correction d’une faute de frappe signalée par l’astreinte.',
      sourceInvoquee: 'Message de l’astreinte du 15 septembre',
      responsabiliteAssumee: false,
    })
    const communication = await clientDeTest(connexion).communication.findUniqueOrThrow({
      where: { id },
    })
    expect(communication.etat).toBe('FAITS_A_VALIDER')
  })
})

describe('ajout manuel d’un fait', () => {
  it('accepte une citation exacte et une valeur qui y figure', async () => {
    const { id, journal } = await incident()
    const { reference } = await ajouterFait(org.redacteur, id, {
      sourceId: journal.sourceId,
      citation: 'le service de facturation a été rétabli',
      enonce: 'Le service de facturation est rétabli',
      typeValeur: 'TEXTE',
      confidentialite: 'INTERNE',
    })
    expect(reference).toBe('F-03')
    const fait = await clientDeTest(connexion).fait.findFirstOrThrow({
      where: { communicationId: id, reference },
    })
    expect(fait).toMatchObject({ statut: 'CONFIRME', confiance: 1 })
    expect(fait.localisation).toMatchObject({ offsetDebut: 25, offsetFin: 64, ligne: 1 })
  })

  it('refuse une citation absente de la source, même à une lettre près', async () => {
    const { id, journal } = await incident()
    const erreur = await erreurMetier(
      ajouterFait(org.redacteur, id, {
        sourceId: journal.sourceId,
        citation: 'le service de facturation a ete retabli',
        enonce: 'Le service est rétabli',
        typeValeur: 'TEXTE',
        confidentialite: 'INTERNE',
      }),
    )
    expect(erreur.code).toBe('CITATION_INVALIDE')
  })

  it('refuse une valeur qui ne figure pas telle quelle dans la citation', async () => {
    const { id, journal } = await incident()
    const erreur = await erreurMetier(
      ajouterFait(org.redacteur, id, {
        sourceId: journal.sourceId,
        citation: 'rétabli à 14h52',
        enonce: 'Heure de rétablissement',
        typeValeur: 'DATE',
        valeur: '14:52',
        confidentialite: 'INTERNE',
      }),
    )
    expect(erreur.code).toBe('VALEUR_HORS_CITATION')
  })

  it('refuse une source d’une autre communication', async () => {
    const premiere = await incident()
    const seconde = await incident()
    const erreur = await erreurMetier(
      ajouterFait(org.redacteur, seconde.id, {
        sourceId: premiere.journal.sourceId,
        citation: 'rétabli à 14h52',
        enonce: 'Heure de rétablissement',
        typeValeur: 'DATE',
        valeur: '14h52',
        confidentialite: 'INTERNE',
      }),
    )
    expect(erreur.details.champs).toEqual({ sourceId: 'invalide' })
  })
})
