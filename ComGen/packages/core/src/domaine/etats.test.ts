import { describe, expect, it } from 'vitest'
import {
  ETATS_COMMUNICATION,
  ETATS_VARIANTE,
  TRANSITIONS_COMMUNICATION,
  evaluerTransition,
  transitionsDepuis,
  type ContexteTransition,
  type EtatCommunication,
} from './etats.ts'

/*
 * Spécification §7 : la machine à états est une table explicite dans core,
 * avec une garde sur chaque transition. Les gardes non négociables sont
 * testées une par une, en commençant par le cas qui doit échouer.
 */

const contexteSain: ContexteTransition = {
  criticite: 'COURANTE',
  sourcesFigees: 1,
  faitsConfirmes: 3,
  faitsProposes: 0,
  faitsDeclares: 0,
  contradictionsNonTranchees: 0,
  personas: 2,
  personasSansTemplate: 0,
  variantes: [
    {
      id: 'v1',
      controlesBloquantsNonResolus: 0,
      approbationsAccordees: 1,
      destinatairesResolus: 12,
    },
    {
      id: 'v2',
      controlesBloquantsNonResolus: 0,
      approbationsAccordees: 1,
      destinatairesResolus: 4,
    },
  ],
}

describe('états', () => {
  it('liste les treize états de communication dans l’ordre du flux, puis REJETEE et ARCHIVEE', () => {
    expect(ETATS_COMMUNICATION).toEqual([
      'BROUILLON',
      'FAITS_A_VALIDER',
      'PRETE_A_GENERER',
      'EN_GENERATION',
      'EN_CONTROLE',
      'A_CORRIGER',
      'EN_RELECTURE',
      'EN_APPROBATION',
      'APPROUVEE',
      'ENVOI_PLANIFIE',
      'ENVOYEE',
      'REJETEE',
      'ARCHIVEE',
    ])
    expect(ETATS_VARIANTE).toEqual([
      'EN_GENERATION',
      'A_REVOIR',
      'BLOQUEE',
      'CONFORME',
      'APPROUVEE',
      'ENVOYEE',
      'ECHEC',
    ])
  })

  it('n’a de table que pour des états connus, et chaque état est atteignable', () => {
    const cibles = new Set<EtatCommunication>()
    for (const transition of TRANSITIONS_COMMUNICATION) {
      expect(ETATS_COMMUNICATION).toContain(transition.de)
      expect(ETATS_COMMUNICATION).toContain(transition.vers)
      expect(transition.de).not.toBe(transition.vers)
      cibles.add(transition.vers)
    }
    for (const etat of ETATS_COMMUNICATION) {
      if (etat !== 'BROUILLON') expect(cibles).toContain(etat)
    }
  })

  it('refuse toute transition absente de la table', () => {
    const resultat = evaluerTransition('BROUILLON', 'ENVOYEE', contexteSain)
    expect(resultat.autorisee).toBe(false)
    if (!resultat.autorisee) expect(resultat.motifs).toEqual(['TRANSITION_INCONNUE'])
  })

  it('refuse une transition vers le même état', () => {
    expect(evaluerTransition('BROUILLON', 'BROUILLON', contexteSain).autorisee).toBe(false)
  })
})

describe('garde PRETE_A_GENERER (§7)', () => {
  const depuis = 'FAITS_A_VALIDER'

  it('passe quand une source est figée, un fait confirmé, un persona choisi et chaque persona a un template', () => {
    expect(evaluerTransition(depuis, 'PRETE_A_GENERER', contexteSain)).toEqual({ autorisee: true })
  })

  it('bloque sans source figée', () => {
    const r = evaluerTransition(depuis, 'PRETE_A_GENERER', { ...contexteSain, sourcesFigees: 0 })
    expect(r).toEqual({ autorisee: false, motifs: ['AUCUNE_SOURCE_FIGEE'] })
  })

  it('bloque sans fait CONFIRME', () => {
    const r = evaluerTransition(depuis, 'PRETE_A_GENERER', { ...contexteSain, faitsConfirmes: 0 })
    expect(r).toEqual({ autorisee: false, motifs: ['AUCUN_FAIT_CONFIRME'] })
  })

  it('bloque sans persona', () => {
    const r = evaluerTransition(depuis, 'PRETE_A_GENERER', { ...contexteSain, personas: 0 })
    expect(r).toEqual({ autorisee: false, motifs: ['AUCUN_PERSONA'] })
  })

  it('bloque quand un persona n’a pas de template', () => {
    const r = evaluerTransition(depuis, 'PRETE_A_GENERER', {
      ...contexteSain,
      personasSansTemplate: 1,
    })
    expect(r).toEqual({ autorisee: false, motifs: ['PERSONA_SANS_TEMPLATE'] })
  })

  it('bloque tant qu’une contradiction entre sources n’est pas tranchée (§15)', () => {
    const r = evaluerTransition(depuis, 'PRETE_A_GENERER', {
      ...contexteSain,
      contradictionsNonTranchees: 2,
    })
    expect(r).toEqual({ autorisee: false, motifs: ['CONTRADICTION_NON_TRANCHEE'] })
  })

  it('bloque tant qu’un fait proposé n’a été ni confirmé ni retiré (§10 : revue obligatoire)', () => {
    const r = evaluerTransition(depuis, 'PRETE_A_GENERER', { ...contexteSain, faitsProposes: 1 })
    expect(r).toEqual({ autorisee: false, motifs: ['FAIT_NON_REVU'] })
  })

  it('cumule tous les motifs au lieu de s’arrêter au premier', () => {
    const r = evaluerTransition(depuis, 'PRETE_A_GENERER', {
      ...contexteSain,
      sourcesFigees: 0,
      faitsConfirmes: 0,
      personas: 0,
    })
    expect(r.autorisee).toBe(false)
    if (!r.autorisee) {
      expect(r.motifs).toEqual(['AUCUNE_SOURCE_FIGEE', 'AUCUN_FAIT_CONFIRME', 'AUCUN_PERSONA'])
    }
  })
})

describe('garde EN_APPROBATION → APPROUVEE (§7)', () => {
  it('passe sans contrôle bloquant non résolu et avec le nombre d’approbations requis', () => {
    expect(evaluerTransition('EN_APPROBATION', 'APPROUVEE', contexteSain)).toEqual({
      autorisee: true,
    })
  })

  it('bloque dès qu’une variante garde un contrôle bloquant non résolu', () => {
    const r = evaluerTransition('EN_APPROBATION', 'APPROUVEE', {
      ...contexteSain,
      variantes: [
        { ...contexteSain.variantes[0]!, controlesBloquantsNonResolus: 1 },
        contexteSain.variantes[1]!,
      ],
    })
    expect(r).toEqual({ autorisee: false, motifs: ['CONTROLE_BLOQUANT_NON_RESOLU'] })
  })

  it('bloque quand une variante n’a pas assez d’approbations pour la criticité', () => {
    const r = evaluerTransition('EN_APPROBATION', 'APPROUVEE', {
      ...contexteSain,
      criticite: 'IMPORTANTE',
    })
    expect(r).toEqual({ autorisee: false, motifs: ['APPROBATIONS_INSUFFISANTES'] })
  })

  it('bloque sans aucune variante : rien à approuver', () => {
    const r = evaluerTransition('EN_APPROBATION', 'APPROUVEE', { ...contexteSain, variantes: [] })
    expect(r).toEqual({ autorisee: false, motifs: ['AUCUNE_VARIANTE'] })
  })

  it('exige au moins une approbation même en COURANTE quand un fait est déclaré sous responsabilité (§11)', () => {
    const r = evaluerTransition('EN_APPROBATION', 'APPROUVEE', {
      ...contexteSain,
      faitsDeclares: 1,
      variantes: contexteSain.variantes.map((v) => ({ ...v, approbationsAccordees: 0 })),
    })
    expect(r).toEqual({ autorisee: false, motifs: ['APPROBATIONS_INSUFFISANTES'] })
  })
})

describe('garde APPROUVEE → ENVOI_PLANIFIE (§7, §17)', () => {
  it('passe quand chaque variante a une liste résolue non vide', () => {
    expect(evaluerTransition('APPROUVEE', 'ENVOI_PLANIFIE', contexteSain)).toEqual({
      autorisee: true,
    })
  })

  it('bloque quand une variante a une liste résolue vide', () => {
    const r = evaluerTransition('APPROUVEE', 'ENVOI_PLANIFIE', {
      ...contexteSain,
      variantes: [
        contexteSain.variantes[0]!,
        { ...contexteSain.variantes[1]!, destinatairesResolus: 0 },
      ],
    })
    expect(r).toEqual({ autorisee: false, motifs: ['LISTE_DIFFUSION_VIDE'] })
  })

  it('bloque quand une variante n’a pas de liste résolue du tout', () => {
    const r = evaluerTransition('APPROUVEE', 'ENVOI_PLANIFIE', {
      ...contexteSain,
      variantes: [{ ...contexteSain.variantes[0]!, destinatairesResolus: null }],
    })
    expect(r).toEqual({ autorisee: false, motifs: ['LISTE_DIFFUSION_NON_RESOLUE'] })
  })
})

describe('aucun raccourci vers l’envoi', () => {
  it('ENVOYEE n’est atteignable que depuis ENVOI_PLANIFIE', () => {
    const origines = TRANSITIONS_COMMUNICATION.filter((t) => t.vers === 'ENVOYEE').map((t) => t.de)
    expect(origines).toEqual(['ENVOI_PLANIFIE'])
  })

  it('ENVOI_PLANIFIE n’est atteignable que depuis APPROUVEE', () => {
    const origines = TRANSITIONS_COMMUNICATION.filter((t) => t.vers === 'ENVOI_PLANIFIE').map(
      (t) => t.de,
    )
    expect(origines).toEqual(['APPROUVEE'])
  })

  it('APPROUVEE n’est atteignable que depuis EN_APPROBATION', () => {
    const origines = TRANSITIONS_COMMUNICATION.filter((t) => t.vers === 'APPROUVEE').map(
      (t) => t.de,
    )
    expect(origines).toEqual(['EN_APPROBATION', 'ENVOI_PLANIFIE'])
  })

  it('une écriture de contenu ramène une communication approuvée en EN_CONTROLE', () => {
    expect(evaluerTransition('APPROUVEE', 'EN_CONTROLE', contexteSain)).toEqual({
      autorisee: true,
    })
  })

  it('énumère les cibles possibles depuis un état', () => {
    expect(transitionsDepuis('ENVOYEE')).toEqual(['ARCHIVEE'])
    expect(transitionsDepuis('ARCHIVEE')).toEqual([])
  })
})
