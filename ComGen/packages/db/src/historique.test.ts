import { normaliserTexteSource, verifierCitation } from '@comgen/core'
import { describe, expect, it } from 'vitest'

import { texteBrut } from '../prisma/seed/contenus.ts'
import {
  NOMBRE_HISTORIQUE,
  PREMIER_NUMERO_HISTORIQUE,
  communicationsHistoriques,
} from '../prisma/seed/historique.ts'

/*
 * L'historique engendré est vérifié par le seed lui-même, qui refuse de
 * charger une citation introuvable. Ces tests disent la même chose plus
 * tôt et plus précisément : ils nomment l'invariant au lieu de le
 * découvrir à l'exécution, et ils échouent sans base de données.
 */
const HISTORIQUE = communicationsHistoriques()

describe('historique de démonstration', () => {
  it('couvre six mois, sans trou de numérotation', () => {
    expect(HISTORIQUE).toHaveLength(NOMBRE_HISTORIQUE)
    expect(HISTORIQUE.map((c) => c.numero)).toEqual(
      Array.from({ length: NOMBRE_HISTORIQUE }, (_, i) => PREMIER_NUMERO_HISTORIQUE + i),
    )

    const dates = HISTORIQUE.map((c) => c.creeLe.getTime())
    const etendueJours = (Math.max(...dates) - Math.min(...dates)) / (24 * 60 * 60 * 1000)
    expect(etendueJours).toBeGreaterThan(150)
    expect(etendueJours).toBeLessThan(200)
  })

  it('ne cite jamais ce que la source ne dit pas', () => {
    for (const communication of HISTORIQUE) {
      const textes = new Map(
        communication.sources.map((source) => [
          source.id,
          normaliserTexteSource(texteBrut(source.contenu)),
        ]),
      )
      for (const fait of communication.faits) {
        const texte = textes.get(fait.sourceId)
        expect(texte, `${communication.id} : source ${fait.sourceId} inconnue`).toBeDefined()
        expect(verifierCitation(texte ?? '', fait.citation).valide).toBe(true)
        // La valeur relevée figure dans sa propre citation : un nombre ou
        // une date ne peut pas avoir été réécrit en chemin.
        expect(fait.citation).toContain(fait.valeur ?? '')
      }
      expect(communication.faits.length).toBeGreaterThan(0)
    }
  })

  it('n’affirme rien sans appui : toute affirmation SOUTENUE cite un fait', () => {
    for (const communication of HISTORIQUE) {
      const citations = new Set(communication.faits.map((fait) => fait.citation))
      for (const variante of communication.variantes ?? []) {
        for (const affirmation of variante.affirmations) {
          if (affirmation.verdict !== 'SOUTENUE') {
            expect(affirmation.citationsAppui).toHaveLength(0)
            continue
          }
          expect(affirmation.citationsAppui.length).toBeGreaterThan(0)
          for (const citation of affirmation.citationsAppui) {
            expect(citations.has(citation)).toBe(true)
          }
        }
      }
    }
  })

  it('n’envoie jamais sans approbation accordée', () => {
    for (const communication of HISTORIQUE) {
      for (const variante of communication.variantes ?? []) {
        if (variante.envoi === undefined) continue
        expect(variante.approbation.decision).toBe('APPROUVEE')
        expect(variante.approbation.decideLe).toBeDefined()
        expect(variante.envoi.envoyeLe.getTime()).toBeGreaterThanOrEqual(
          variante.approbation.decideLe?.getTime() ?? Number.POSITIVE_INFINITY,
        )
      }
    }
  })

  it('ne marque ENVOYEE que ce qui porte vraiment un envoi', () => {
    for (const communication of HISTORIQUE) {
      if (communication.etat !== 'ENVOYEE' && communication.etat !== 'ARCHIVEE') continue
      const envois = (communication.variantes ?? []).filter((v) => v.envoi !== undefined)
      expect(envois.length, `${communication.id} est ${communication.etat} sans envoi`).toBe(1)
    }
  })

  it('porte une référence de ticket cohérente avec sa nature', () => {
    const attendu: Record<string, string> = {
      INCIDENT: 'INC',
      CHANGE: 'CHG',
      RELEASE: 'REL',
      REGULATORY: 'REG',
      ORG: 'ORG',
      SPEC_UPDATE: 'DOC',
    }
    for (const communication of HISTORIQUE) {
      const identifiants = communication.faits.filter((f) => f.typeValeur === 'IDENTIFIANT')
      expect(identifiants.length).toBeGreaterThan(0)
      for (const fait of identifiants) {
        expect(fait.valeur?.startsWith(attendu[communication.nature] ?? '')).toBe(true)
      }
    }
  })

  it('est déterministe : deux appels donnent exactement le même historique', () => {
    expect(JSON.stringify(communicationsHistoriques())).toBe(JSON.stringify(HISTORIQUE))
  })
})
