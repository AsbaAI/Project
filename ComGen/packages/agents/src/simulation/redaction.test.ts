import { injecter, verifierValeursInjectees } from '@comgen/core'
import { describe, expect, it } from 'vitest'

import { ErreurAgent } from '../agents/types.ts'

import { creerRedacteurSimule } from './redacteur.ts'
import { creerVerificateurSimule } from './verificateur.ts'

const FAITS = [
  {
    reference: 'F-01',
    valeur: '12 mars 2026',
    typeValeur: 'DATE' as const,
    citation: 'La migration du Portail client Atlas aura lieu le 12 mars 2026.',
    langueSource: 'fr' as const,
  },
  {
    reference: 'F-02',
    valeur: '4 500',
    typeValeur: 'NOMBRE' as const,
    citation: 'Le service sera indisponible pour 4 500 utilisateurs.',
    langueSource: 'fr' as const,
  },
]

const contexte = { attendre: async () => {} }

describe('REDACTEUR simulé', () => {
  const redacteur = creerRedacteurSimule()

  it('n’écrit jamais une valeur : il émet des références', async () => {
    const { sortie } = await redacteur.executer(
      { faits: FAITS, langue: 'fr', persona: 'Équipes techniques' },
      contexte,
    )

    const libres = sortie.paragraphes
      .flatMap((p) => p.segments)
      .filter((s) => s.type === 'texte')
      .map((s) => (s.type === 'texte' ? s.texte : ''))
    for (const valeur of ['12 mars 2026', '4 500', '4.2']) {
      expect(libres.join(' ')).not.toContain(valeur)
    }
    const references = sortie.paragraphes
      .flatMap((p) => p.segments)
      .filter((s) => s.type === 'reference')
    expect(references).toHaveLength(2)
  })

  it('sa sortie passe l’injection, qui remet les valeurs de la source', async () => {
    const { sortie } = await redacteur.executer(
      { faits: FAITS, langue: 'fr', persona: 'Équipes techniques' },
      contexte,
    )

    const paragraphes = sortie.paragraphes.map((paragraphe) => {
      const resultat = injecter(paragraphe.segments, FAITS, 'fr')
      expect(resultat.ok, JSON.stringify(resultat)).toBe(true)
      return resultat.ok ? resultat.texte : ''
    })

    const texte = paragraphes.join('\n')
    expect(texte).toContain('12 mars 2026')
    expect(texte).toContain('4 500')
    // Seconde lecture, hors de tout agent : les valeurs y sont mot pour mot.
    expect(
      verifierValeursInjectees(
        texte,
        FAITS.map((fait) => ({ reference: fait.reference, attendue: fait.valeur })),
      ).conforme,
    ).toBe(true)
  })

  it('échoue plutôt que d’écrire sans appui, quand aucun fait n’a de valeur citée', async () => {
    const echec = await redacteur
      .executer(
        {
          faits: [{ reference: 'F-09', valeur: null, citation: 'Le service sera rétabli.' }],
          langue: 'fr',
          persona: 'Direction',
        },
        contexte,
      )
      .catch((erreur: unknown) => erreur)

    expect(echec).toBeInstanceOf(ErreurAgent)
    expect((echec as ErreurAgent).code).toBe('SOURCE_INEXPLOITABLE')
  })
})

describe('VERIFICATEUR simulé', () => {
  const verificateur = creerVerificateurSimule()

  it('soutient ce que la fiche de faits cite, et nomme le fait d’appui', async () => {
    const { sortie } = await verificateur.executer(
      { affirmations: [FAITS[0]?.citation ?? ''], faits: FAITS },
      contexte,
    )

    expect(sortie.affirmations[0]?.verdict).toBe('SOUTENUE')
    expect(sortie.affirmations[0]?.appuis).toEqual(['F-01'])
    expect(sortie.bloquant).toBe(false)
    expect(sortie.score).toBe(1)
  })

  it('bloque une affirmation qui porte une valeur qu’aucune citation ne couvre', async () => {
    const { sortie } = await verificateur.executer(
      { affirmations: ['La bascule aura lieu le 3 avril 2027.'], faits: FAITS },
      contexte,
    )

    expect(sortie.affirmations[0]?.verdict).toBe('SANS_APPUI')
    expect(sortie.bloquant).toBe(true)
    expect(sortie.score).toBe(0)
  })

  it('ne bloque pas sur une salutation : elle n’affirme rien de vérifiable', async () => {
    const { sortie } = await verificateur.executer(
      { affirmations: ['Bonjour à toutes et à tous,'], faits: FAITS },
      contexte,
    )

    expect(sortie.affirmations[0]?.verdict).toBe('NON_FACTUELLE')
    expect(sortie.bloquant).toBe(false)
  })

  it('ne rend jamais CONTREDITE : il ne sait pas l’établir, il ne le devine pas', async () => {
    const { sortie } = await verificateur.executer(
      {
        affirmations: ['La migration aura lieu le 12 mars 2026.', 'Sans appui : 99 sites.'],
        faits: FAITS,
      },
      contexte,
    )

    expect(sortie.affirmations.map((a) => a.verdict)).not.toContain('CONTREDITE')
  })
})

describe('la chaîne complète', () => {
  it('rédige, injecte, puis vérifie — et tout est appuyé', async () => {
    const { sortie: redige } = await creerRedacteurSimule().executer(
      { faits: FAITS, langue: 'fr', persona: 'Support' },
      contexte,
    )
    const paragraphes = redige.paragraphes.map((paragraphe) => {
      const resultat = injecter(paragraphe.segments, FAITS, 'fr')
      return resultat.ok ? resultat.texte : ''
    })
    const { sortie: verifie } = await creerVerificateurSimule().executer(
      { affirmations: paragraphes, faits: FAITS },
      contexte,
    )

    expect(verifie.bloquant).toBe(false)
    expect(verifie.score).toBe(1)
    // Ouverture et clôture ne sont pas factuelles ; le corps est soutenu.
    expect(verifie.affirmations.filter((a) => a.verdict === 'SOUTENUE')).toHaveLength(2)
    expect(verifie.affirmations.filter((a) => a.verdict === 'NON_FACTUELLE')).toHaveLength(2)
  })
})
