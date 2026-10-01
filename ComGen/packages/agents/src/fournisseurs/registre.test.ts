import { ROLES_AGENT } from '@comgen/core'
import { describe, expect, it } from 'vitest'

import { RegistreFournisseurs } from './registre.ts'
import { type Capacites, ErreurFournisseur, type FournisseurModele } from './types.ts'

/*
 * Spécification §5.1 et §5.4 : un fournisseur sans sortie structurée ne peut
 * servir aucun rôle d'agent ; EXTRACTEUR et VERIFICATEUR exigent `native` ou
 * `par_prompt` ; REDACTEUR et VERIFICATEUR doivent venir de familles
 * différentes. Le registre applique ces gardes et explique ses refus.
 */

function fauxFournisseur(id: string, surcharges: Partial<Capacites> = {}): FournisseurModele {
  const capacites: Capacites = {
    sortieStructuree: 'native',
    fenetreContexte: 100_000,
    sortieMax: 4096,
    langues: ['fr'],
    deterministe: true,
    coutParMillionEntree: 1,
    coutParMillionSortie: 2,
    famille: id,
    heberge: 'externe',
    ...surcharges,
  }
  return {
    id,
    appeler: () => Promise.reject(new Error('non appelé dans ces tests')),
    capacites: () => capacites,
    sante: () =>
      Promise.resolve({ disponible: true, latenceMs: 1, verifieLe: new Date().toISOString() }),
  }
}

describe('RegistreFournisseurs — enregistrement', () => {
  it('enregistre, retrouve et liste les fournisseurs', () => {
    const registre = new RegistreFournisseurs()
    const a = fauxFournisseur('a')
    const b = fauxFournisseur('b')
    registre.enregistrer(a)
    registre.enregistrer(b)
    expect(registre.obtenir('a')).toBe(a)
    expect(registre.lister().map((f) => f.id)).toEqual(['a', 'b'])
  })

  it('refuse un identifiant inconnu avec une erreur CONFIG', () => {
    const registre = new RegistreFournisseurs()
    expect(() => registre.obtenir('inconnu')).toThrowError(ErreurFournisseur)
    try {
      registre.obtenir('inconnu')
    } catch (erreur) {
      expect((erreur as ErreurFournisseur).code).toBe('CONFIG')
      expect((erreur as ErreurFournisseur).fournisseurId).toBe('inconnu')
    }
  })

  it('refuse un doublon d’identifiant', () => {
    const registre = new RegistreFournisseurs()
    registre.enregistrer(fauxFournisseur('a'))
    expect(() => registre.enregistrer(fauxFournisseur('a'))).toThrowError(ErreurFournisseur)
  })
})

describe('RegistreFournisseurs — verifierAffectable', () => {
  const registre = new RegistreFournisseurs()

  it('refuse « aucune » pour chaque rôle d’agent, avec explication', () => {
    const sansStructure = fauxFournisseur('libre', { sortieStructuree: 'aucune' })
    for (const role of ROLES_AGENT) {
      const resultat = registre.verifierAffectable(sansStructure, role)
      expect(resultat.affectable).toBe(false)
      if (!resultat.affectable) {
        expect(resultat.code).toBe('SORTIE_STRUCTUREE_AUCUNE')
        expect(resultat.motif).toContain(role)
        expect(resultat.motif).toContain('libre')
      }
    }
  })

  it('accepte « par_prompt » pour REDACTEUR et VERIFICATEUR', () => {
    const parConsigne = fauxFournisseur('consigne', { sortieStructuree: 'par_prompt' })
    expect(registre.verifierAffectable(parConsigne, 'REDACTEUR')).toEqual({ affectable: true })
    expect(registre.verifierAffectable(parConsigne, 'VERIFICATEUR')).toEqual({ affectable: true })
  })

  it('accepte « native » pour EXTRACTEUR', () => {
    expect(registre.verifierAffectable(fauxFournisseur('natif'), 'EXTRACTEUR')).toEqual({
      affectable: true,
    })
  })
})

describe('RegistreFournisseurs — verifierIndependance', () => {
  const registre = new RegistreFournisseurs()

  it('refuse la même famille pour REDACTEUR et VERIFICATEUR', () => {
    const redacteur = fauxFournisseur('sonnet', { famille: 'claude' })
    const verificateur = fauxFournisseur('opus', { famille: 'claude' })
    const resultat = registre.verifierIndependance(redacteur, verificateur)
    expect(resultat.independant).toBe(false)
    if (!resultat.independant) {
      expect(resultat.motif).toBe('MEME_FAMILLE')
    }
  })

  it('refuse deux modèles affinés sur la même base', () => {
    const redacteur = fauxFournisseur('redac', { famille: 'acme-redaction' })
    const verificateur = fauxFournisseur('verif', { famille: 'acme-controle' })
    const resultat = registre.verifierIndependance(redacteur, verificateur, {
      redacteur: 'llama-3.1-70b',
      verificateur: 'llama-3.1-70b',
    })
    expect(resultat.independant).toBe(false)
    if (!resultat.independant) {
      expect(resultat.motif).toBe('MEME_BASE_AFFINAGE')
    }
  })

  it('accepte deux familles distinctes', () => {
    const redacteur = fauxFournisseur('sonnet', { famille: 'claude' })
    const verificateur = fauxFournisseur('gpt', { famille: 'gpt' })
    expect(registre.verifierIndependance(redacteur, verificateur)).toEqual({ independant: true })
  })
})
