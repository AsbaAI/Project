import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { ErreurFournisseur } from '../fournisseurs/types.ts'
import type { Agent } from './types.ts'
import { ErreurAgent } from './types.ts'

import { ErreurOrchestration, etape, orchestrer } from './orchestrateur.ts'

/*
 * Nouvelles tentatives (L2). Une erreur passagère du fournisseur (délai,
 * réseau, quota, 5xx) est retentée deux fois au plus, avec un délai qui
 * double. Tout le reste échoue au premier coup : une clé refusée ne
 * deviendra pas valide, une sortie hors schéma ne se répare pas (§19).
 */

function fournisseur(code: ErreurFournisseur['code'], statut?: number): ErreurFournisseur {
  return new ErreurFournisseur(code, 'message du SDK, jamais affiché', {
    fournisseurId: 'test',
    cause: { nom: 'APIError', message: 'corps brut', ...(statut === undefined ? {} : { statut }) },
  })
}

/** Agent qui rejoue un scénario : une erreur par appel, puis un succès. */
function scenario(erreurs: readonly Error[]) {
  let appels = 0
  const agent: Agent<string, { ok: true }> = {
    role: 'REDACTEUR',
    version: '1',
    schemaSortie: z.object({ ok: z.literal(true) }),
    async executer() {
      const erreur = erreurs[appels]
      appels += 1
      if (erreur !== undefined) throw erreur
      return {
        sortie: { ok: true },
        trace: {
          role: 'REDACTEUR',
          prompt: 'REDACTEUR@1',
          modele: 'modele-test',
          jetonsEntree: 1,
          jetonsSortie: 1,
          dureeMs: 0,
          simule: false,
        },
      }
    },
  }
  const plan = [
    etape(
      agent,
      (d: { texte: string }) => d.texte,
      (d) => d,
    ),
  ]
  return { plan, appels: () => appels }
}

function lancer(erreurs: readonly Error[], attentes: number[] = []) {
  const s = scenario(erreurs)
  const promesse = orchestrer({
    etapes: s.plan,
    dossier: { texte: 'source' },
    contexte: { attendre: async (ms) => void attentes.push(ms) },
    reprises: { alea: () => 0 },
  })
  return { promesse, appels: s.appels }
}

describe('nouvelles tentatives', () => {
  it('retente un quota dépassé puis réussit, en notant la tentative', async () => {
    const attentes: number[] = []
    const { promesse, appels } = lancer([fournisseur('QUOTA', 429)], attentes)
    const resultat = await promesse
    expect(appels()).toBe(2)
    expect(resultat.etapes[0]).toMatchObject({ etat: 'TERMINEE', tentatives: 2 })
    expect(attentes).toEqual([500])
  })

  it('double le délai entre deux tentatives', async () => {
    const attentes: number[] = []
    const { promesse } = lancer([fournisseur('DELAI'), fournisseur('RESEAU')], attentes)
    await promesse
    expect(attentes).toEqual([500, 1000])
  })

  it('abandonne après trois appels et le dit, sans le message du SDK', async () => {
    const { promesse, appels } = lancer([
      fournisseur('FOURNISSEUR', 503),
      fournisseur('FOURNISSEUR', 502),
      fournisseur('FOURNISSEUR', 500),
    ])
    const erreur = await promesse.catch((e: unknown) => e)
    expect(appels()).toBe(3)
    expect(erreur).toBeInstanceOf(ErreurOrchestration)
    const echec = erreur as ErreurOrchestration
    expect(echec.code).toBe('FOURNISSEUR_EN_ECHEC')
    expect(echec.etapes[0]).toMatchObject({ etat: 'ECHOUEE', tentatives: 3 })
    expect(echec.message).not.toContain('message du SDK')
    expect(echec.message).not.toContain('corps brut')
  })

  it.each([
    ['clé refusée', fournisseur('AUTHENTIFICATION', 401)],
    ['configuration absente', fournisseur('CONFIG')],
    ['sortie non structurée', fournisseur('SORTIE_NON_STRUCTUREE')],
    ['requête refusée (4xx)', fournisseur('FOURNISSEUR', 400)],
    ['sortie hors schéma', new ErreurAgent('SORTIE_INVALIDE', 'REDACTEUR', 'hors schéma')],
  ])('ne retente jamais : %s', async (_nom, erreur) => {
    const { promesse, appels } = lancer([erreur])
    await expect(promesse).rejects.toBeInstanceOf(ErreurOrchestration)
    expect(appels()).toBe(1)
  })

  it('ne retente pas une génération annulée', async () => {
    const controleur = new AbortController()
    const s = scenario([fournisseur('QUOTA', 429)])
    const promesse = orchestrer({
      etapes: s.plan,
      dossier: { texte: 'source' },
      contexte: {
        signal: controleur.signal,
        attendre: async () => {
          controleur.abort()
        },
      },
    })
    const erreur = (await promesse.catch((e: unknown) => e)) as ErreurOrchestration
    expect(erreur.code).toBe('ANNULE')
    expect(s.appels()).toBe(1)
  })
})
