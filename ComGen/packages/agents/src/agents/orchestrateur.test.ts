import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import type { Agent, TraceAgent } from './types.ts'
import { ErreurAgent } from './types.ts'

import type { EvenementOrchestration } from './orchestrateur.ts'
import { ErreurOrchestration, etape, orchestrer } from './orchestrateur.ts'

interface Dossier {
  texte: string
  mots?: number
  resume?: string
}

function trace(role: TraceAgent['role'], dureeMs = 0): TraceAgent {
  return {
    role,
    prompt: `${role}@1`,
    modele: null,
    jetonsEntree: 0,
    jetonsSortie: 0,
    dureeMs,
    simule: true,
  }
}

/** Agent de test : compte les mots. Déterministe, sans modèle. */
const compteur: Agent<string, { mots: number }> = {
  role: 'EXTRACTEUR',
  version: '1',
  schemaSortie: z.object({ mots: z.number().int().nonnegative() }),
  async executer(entree, contexte) {
    await contexte.attendre?.(1000)
    return {
      sortie: { mots: entree.split(/\s+/u).filter(Boolean).length },
      trace: trace('EXTRACTEUR'),
    }
  },
}

const resumeur: Agent<number, { resume: string }> = {
  role: 'SUGGESTEUR',
  version: '1',
  schemaSortie: z.object({ resume: z.string().min(1) }),
  async executer(entree) {
    return { sortie: { resume: `${entree} mots` }, trace: trace('SUGGESTEUR') }
  },
}

function planComplet() {
  return [
    etape(
      compteur,
      (dossier: Dossier) => dossier.texte,
      (dossier, sortie) => ({ ...dossier, mots: sortie.mots }),
    ),
    etape(
      resumeur,
      (dossier: Dossier) => dossier.mots ?? 0,
      (dossier, sortie) => ({ ...dossier, resume: sortie.resume }),
    ),
  ]
}

describe('orchestrer', () => {
  it('enchaîne les étapes et passe la sortie de l’une à l’entrée de la suivante', async () => {
    const resultat = await orchestrer({
      etapes: planComplet(),
      dossier: { texte: 'trois petits mots' },
      contexte: {},
    })

    expect(resultat.dossier.mots).toBe(3)
    expect(resultat.dossier.resume).toBe('3 mots')
    expect(resultat.traces.map((t) => t.role)).toEqual(['EXTRACTEUR', 'SUGGESTEUR'])
  })

  it('annonce chaque changement d’état, et l’état de TOUTES les étapes à chaque fois', async () => {
    const vus: EvenementOrchestration[] = []
    await orchestrer({
      etapes: planComplet(),
      dossier: { texte: 'un deux' },
      contexte: {},
      surEvenement: (evenement) => vus.push(evenement),
    })

    // Premier événement : tout est en attente — l'interface peut dessiner
    // la chronologie entière avant que quoi que ce soit ne commence.
    expect(vus[0]?.etapes.map((e) => e.etat)).toEqual(['EN_ATTENTE', 'EN_ATTENTE'])
    expect(vus.at(-1)?.etapes.map((e) => e.etat)).toEqual(['TERMINEE', 'TERMINEE'])
    expect(vus.at(-1)?.termine).toBe(true)
    // Chaque événement porte les deux étapes : jamais un delta à recoller.
    for (const evenement of vus) expect(evenement.etapes).toHaveLength(2)
  })

  it('échoue explicitement : l’étape fautive est dite, les suivantes ne sont pas lancées', async () => {
    const cassé: Agent<number, { resume: string }> = {
      ...resumeur,
      async executer() {
        throw new ErreurAgent('SOURCE_INEXPLOITABLE', 'SUGGESTEUR', 'Rien à proposer')
      },
    }
    let lancéApres = false
    const témoin: Agent<number, { resume: string }> = {
      ...resumeur,
      role: 'REDACTEUR',
      async executer(entree) {
        lancéApres = true
        return { sortie: { resume: `${entree}` }, trace: trace('REDACTEUR') }
      },
    }

    const vus: EvenementOrchestration[] = []
    const echec = await orchestrer({
      etapes: [
        ...planComplet().slice(0, 1),
        etape(
          cassé,
          (dossier: Dossier) => dossier.mots ?? 0,
          (dossier, sortie) => ({ ...dossier, resume: sortie.resume }),
        ),
        etape(
          témoin,
          (dossier: Dossier) => dossier.mots ?? 0,
          (dossier, sortie) => ({ ...dossier, resume: sortie.resume }),
        ),
      ],
      dossier: { texte: 'un deux' },
      contexte: {},
      surEvenement: (evenement) => vus.push(evenement),
    }).catch((erreur: unknown) => erreur)

    expect(echec).toBeInstanceOf(ErreurOrchestration)
    expect(lancéApres).toBe(false)
    const etapes = (echec as ErreurOrchestration).etapes
    expect(etapes.map((e) => e.etat)).toEqual(['TERMINEE', 'ECHOUEE', 'ANNULEE'])
    expect(etapes[1]?.codeErreur).toBe('SOURCE_INEXPLOITABLE')
    // Un résultat partiel n'est jamais présenté comme complet.
    expect(vus.at(-1)?.termine).toBe(false)
  })

  it('refuse une sortie qui ne satisfait pas le schéma de l’agent', async () => {
    const menteur: Agent<string, { mots: number }> = {
      ...compteur,
      async executer() {
        return {
          sortie: { mots: 'beaucoup' } as unknown as { mots: number },
          trace: trace('EXTRACTEUR'),
        }
      },
    }

    const echec = await orchestrer({
      etapes: [
        etape(
          menteur,
          (dossier: Dossier) => dossier.texte,
          (dossier, sortie) => ({ ...dossier, mots: sortie.mots }),
        ),
      ],
      dossier: { texte: 'peu importe' },
      contexte: {},
    }).catch((erreur: unknown) => erreur)

    expect(echec).toBeInstanceOf(ErreurOrchestration)
    expect((echec as ErreurOrchestration).etapes[0]?.codeErreur).toBe('SORTIE_INVALIDE')
  })

  it('s’arrête sur annulation, sans lancer l’étape suivante', async () => {
    const controleur = new AbortController()
    const annulant: Agent<string, { mots: number }> = {
      ...compteur,
      async executer(entree) {
        controleur.abort()
        return { sortie: { mots: entree.length }, trace: trace('EXTRACTEUR') }
      },
    }

    const echec = await orchestrer({
      etapes: [
        etape(
          annulant,
          (dossier: Dossier) => dossier.texte,
          (dossier, sortie) => ({ ...dossier, mots: sortie.mots }),
        ),
        ...planComplet().slice(1),
      ],
      dossier: { texte: 'abc' },
      contexte: { signal: controleur.signal },
    }).catch((erreur: unknown) => erreur)

    expect(echec).toBeInstanceOf(ErreurOrchestration)
    expect((echec as ErreurOrchestration).etapes.map((e) => e.etat)).toEqual([
      'TERMINEE',
      'ANNULEE',
    ])
  })

  it('mesure chaque étape avec l’horloge qu’on lui donne', async () => {
    let maintenant = 0
    const resultat = await orchestrer({
      etapes: planComplet(),
      dossier: { texte: 'un deux' },
      contexte: { attendre: async (ms) => void (maintenant += ms) },
      horloge: () => maintenant,
    })

    expect(resultat.etapes[0]?.dureeMs).toBe(1000)
    expect(resultat.etapes[1]?.dureeMs).toBe(0)
  })
})
