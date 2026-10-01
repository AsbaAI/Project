import { describe, expect, it } from 'vitest'

import { ErreurAgent } from '../agents/types.ts'

import { DELAIS_SIMULATION, agentsSimules } from './index.ts'

/** Source réaliste : c'est d'elle, et de rien d'autre, que tout doit sortir. */
const SOURCE = [
  'Objet : migration du Portail client Atlas vers la version 4.2',
  '',
  'La migration du Portail client Atlas vers la version 4.2 aura lieu le 12 mars 2026.',
  'Le service sera indisponible de 22h00 à 02h00 pour les 4 500 utilisateurs concernés.',
  'Le ticket INC-2026-0187 suit l’incident de performance relevé en recette.',
  'Les équipes support et les clients grands comptes doivent être prévenus.',
].join('\n')

/** Contexte de test : aucune attente réelle, le temps simulé est compté. */
function contexteRapide() {
  let attendu = 0
  return {
    contexte: { attendre: async (ms: number) => void (attendu += ms) },
    attendu: () => attendu,
  }
}

describe('EXTRACTEUR simulé', () => {
  const { extracteur } = agentsSimules()

  it('ne relève que des faits cités mot pour mot dans la source', async () => {
    const { contexte } = contexteRapide()
    const { sortie } = await extracteur.executer({ texte: SOURCE }, contexte)

    expect(sortie.faits.length).toBeGreaterThan(0)
    for (const fait of sortie.faits) {
      expect(SOURCE).toContain(fait.citation)
      expect(fait.citation).toContain(fait.valeur)
      // La localisation repère la phrase citée, pas la valeur seule : c'est
      // la phrase qui doit rester retrouvable mot pour mot dans la source.
      expect(SOURCE.slice(fait.localisation.offsetDebut, fait.localisation.offsetFin)).toBe(
        fait.citation,
      )
    }
  })

  it('relève la date, la version et l’identifiant sans jamais les réécrire', async () => {
    const { contexte } = contexteRapide()
    const { sortie } = await extracteur.executer({ texte: SOURCE }, contexte)
    const valeurs = sortie.faits.map((fait) => fait.valeur)

    expect(valeurs).toContain('12 mars 2026')
    expect(valeurs).toContain('4.2')
    expect(valeurs).toContain('INC-2026-0187')
  })

  it('échoue sur une source sans aucun fait, au lieu d’inventer une sortie crédible', async () => {
    const { contexte } = contexteRapide()
    const echec = await extracteur
      .executer({ texte: 'Bonjour, ceci est un mot sans la moindre donnée.' }, contexte)
      .catch((erreur: unknown) => erreur)

    expect(echec).toBeInstanceOf(ErreurAgent)
    expect((echec as ErreurAgent).code).toBe('SOURCE_INEXPLOITABLE')
  })

  it('se déclare simulé dans sa trace, sans modèle', async () => {
    const { contexte } = contexteRapide()
    const { trace } = await extracteur.executer({ texte: SOURCE }, contexte)

    expect(trace.simule).toBe(true)
    expect(trace.modele).toBeNull()
    expect(trace.role).toBe('EXTRACTEUR')
  })

  it('échelonne son travail dans la plage annoncée', async () => {
    const { contexte, attendu } = contexteRapide()
    await extracteur.executer({ texte: SOURCE }, contexte)

    expect(attendu()).toBeGreaterThanOrEqual(DELAIS_SIMULATION.min)
    expect(attendu()).toBeLessThanOrEqual(DELAIS_SIMULATION.max)
  })
})

describe('ANALYSTE_IMPACT simulé', () => {
  const { analyste } = agentsSimules()

  it('ne propose une audience que si la source la nomme, et cite la phrase', async () => {
    const { contexte } = contexteRapide()
    const { sortie } = await analyste.executer({ texte: SOURCE }, contexte)

    expect(sortie.suggestions.length).toBeGreaterThan(0)
    for (const suggestion of sortie.suggestions) {
      expect(SOURCE).toContain(suggestion.extrait)
      expect(suggestion.extrait.toLowerCase()).toContain(suggestion.motDeclencheur.toLowerCase())
    }
  })

  it('ne propose rien plutôt que de deviner, quand la source ne nomme personne', async () => {
    const { contexte } = contexteRapide()
    const { sortie } = await analyste.executer(
      { texte: 'La version 4.2 est disponible depuis le 12 mars 2026.' },
      contexte,
    )

    expect(sortie.suggestions).toEqual([])
  })
})

describe('SUGGESTEUR simulé', () => {
  const { suggesteur } = agentsSimules()

  it('propose un titre repris mot pour mot de la source', async () => {
    const { contexte } = contexteRapide()
    const { sortie } = await suggesteur.executer({ texte: SOURCE }, contexte)

    expect(sortie.titre).not.toBeNull()
    expect(SOURCE).toContain(sortie.titre?.valeur ?? '')
  })

  it('justifie nature et criticité par un extrait de la source, ou ne propose rien', async () => {
    const { contexte } = contexteRapide()
    const { sortie } = await suggesteur.executer({ texte: SOURCE }, contexte)

    for (const proposition of [sortie.nature, sortie.criticite]) {
      if (proposition === null) continue
      expect(SOURCE).toContain(proposition.extrait)
    }
    expect(sortie.nature?.valeur).toBe('CHANGE')
  })

  it('ne propose aucune criticité quand rien dans la source ne la justifie', async () => {
    const { contexte } = contexteRapide()
    const { sortie } = await suggesteur.executer(
      { texte: 'Le document est mis à jour en version 4.2.' },
      contexte,
    )

    expect(sortie.criticite).toBeNull()
  })
})
