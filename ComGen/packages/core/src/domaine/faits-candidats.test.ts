import { describe, expect, it } from 'vitest'

import { type FaitCandidat, proposerFaitsCandidats } from './faits-candidats.ts'
import { verifierCitation } from './sources.ts'

const FICHE = `Fiche de changement CHG-2026-0412
Le Portail client Atlas passe en version 4.2.0 le samedi 14 octobre 2026.
La fenêtre d'intervention s'étend de 22h00 à 02h00 (heure de Paris). L'interruption prévue est de 45 minutes.
Le taux de disponibilité cible reste de 99,9 % sur le mois.
Contact : astreinte Atlas, référence interne ATL-7781.`

function parType(candidats: readonly FaitCandidat[], type: FaitCandidat['typeValeur']) {
  return candidats.filter((c) => c.typeValeur === type).map((c) => c.valeur)
}

describe('proposerFaitsCandidats', () => {
  const candidats = proposerFaitsCandidats(FICHE)

  it('repère identifiants, versions, dates, heures et nombres avec unité', () => {
    expect(parType(candidats, 'IDENTIFIANT')).toEqual(['CHG-2026-0412', 'ATL-7781'])
    expect(parType(candidats, 'VERSION')).toEqual(['4.2.0'])
    expect(parType(candidats, 'DATE')).toEqual(['samedi 14 octobre 2026', '22h00', '02h00'])
    expect(parType(candidats, 'NOMBRE')).toEqual(['45 minutes', '99,9 %'])
  })

  it('cite la phrase entière, mot pour mot, avec une localisation exacte', () => {
    for (const candidat of candidats) {
      expect(verifierCitation(FICHE, candidat.citation, candidat.localisation)).toEqual({
        valide: true,
      })
      expect(candidat.citation).toContain(candidat.valeur)
      expect(candidat.enonce).toBe(candidat.citation)
    }
  })

  it('rend les candidats dans l’ordre du texte, sans doublon', () => {
    const debuts = candidats.map((c) => c.localisation.offsetDebut + c.citation.indexOf(c.valeur))
    expect(debuts.toSorted((a, b) => a - b)).toEqual(debuts)
    const cles = candidats.map((c) => `${c.typeValeur}|${c.valeur}|${c.localisation.offsetDebut}`)
    expect(new Set(cles).size).toBe(cles.length)
  })

  it('ne confond pas une date numérique avec une version', () => {
    const c = proposerFaitsCandidats('Livraison le 14.10.2026, build 2.1.')
    expect(parType(c, 'DATE')).toEqual(['14.10.2026'])
    expect(parType(c, 'VERSION')).toEqual(['2.1'])
  })

  it('reconnaît les dates ISO, numériques et anglaises', () => {
    const c = proposerFaitsCandidats(
      'Cutover on 2026-10-14. Backup window: 21/10/2026. Go-live October 14, 2026 and 14 October 2026.',
    )
    expect(parType(c, 'DATE')).toEqual([
      '2026-10-14',
      '21/10/2026',
      'October 14, 2026',
      '14 October 2026',
    ])
  })

  it('ne propose rien pour un texte sans valeur repérable', () => {
    expect(proposerFaitsCandidats('Bonjour à toutes et à tous.')).toEqual([])
    expect(proposerFaitsCandidats('')).toEqual([])
  })

  it('propose un candidat par valeur même quand la phrase en contient plusieurs', () => {
    const c = proposerFaitsCandidats('Le service a été rétabli à 14h52 puis à 15h10.')
    expect(c).toHaveLength(2)
    expect(c[0]?.citation).toBe(c[1]?.citation)
  })
})
