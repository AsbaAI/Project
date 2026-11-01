/**
 * VERIFICATEUR simulé.
 *
 * Il ne relit pas le texte « avec un regard neuf » : il le COMPARE. Pour
 * chaque affirmation, il cherche la citation qui l'appuie dans la fiche de
 * faits, mot pour mot, par comparaison de chaînes. Rien d'autre ne décide.
 *
 * C'est volontairement mécanique. Un vérificateur qui juge se trompe de la
 * même façon que le rédacteur — c'est pourquoi la spécification exige deux
 * familles de modèles indépendantes (§5.4). Ici, aucune famille : la règle
 * est appliquée par du code, et un code ne partage aucun angle mort avec
 * un modèle.
 *
 * Quatre verdicts, ceux du domaine :
 *  - `SOUTENUE` : l'affirmation est contenue dans une citation ;
 *  - `SANS_APPUI` : elle porte une valeur qu'aucune citation ne couvre ;
 *  - `NON_FACTUELLE` : elle n'affirme rien de vérifiable (salutation…) ;
 *  - `CONTREDITE` : réservé au cas où une citation dit le contraire, que
 *    cette simulation ne sait pas établir — elle ne le rend donc jamais,
 *    plutôt que de le rendre au hasard.
 */

import { proposerFaitsCandidats } from '@comgen/core'
import { z } from 'zod'

import type { Agent } from '../agents/types.ts'

import { paliers } from './delais.ts'

export const schemaAffirmationVerifiee = z.object({
  texte: z.string().min(1),
  verdict: z.enum(['SOUTENUE', 'CONTREDITE', 'SANS_APPUI', 'NON_FACTUELLE']),
  /** Références des faits qui appuient l'affirmation ; vide si aucune. */
  appuis: z.array(z.string()),
  explication: z.string().min(1),
})

export const schemaSortieVerificateur = z.object({
  affirmations: z.array(schemaAffirmationVerifiee),
  /** Part des affirmations factuelles qui sont appuyées, entre 0 et 1. */
  score: z.number().min(0).max(1),
  /** Vrai dès qu'une affirmation factuelle n'est pas appuyée : l'envoi est bloqué. */
  bloquant: z.boolean(),
})

export type SortieVerificateur = z.infer<typeof schemaSortieVerificateur>

export interface EntreeVerificateur {
  affirmations: readonly string[]
  faits: readonly { reference: string; citation: string; valeur: string | null }[]
}

export function creerVerificateurSimule(): Agent<EntreeVerificateur, SortieVerificateur> {
  const [lecture, redaction] = paliers('VERIFICATEUR')
  return {
    role: 'VERIFICATEUR',
    version: 'simulation-1',
    schemaSortie: schemaSortieVerificateur,
    async executer(entree, contexte) {
      await contexte.attendre?.(lecture)

      const affirmations = entree.affirmations.map((texte) => {
        const appuis = entree.faits
          .filter((fait) => fait.citation.includes(texte) || texte.includes(fait.citation))
          .map((fait) => fait.reference)

        if (appuis.length > 0) {
          return {
            texte,
            verdict: 'SOUTENUE' as const,
            appuis,
            explication: `Reprise de la citation du fait ${appuis.join(', ')}.`,
          }
        }

        // Rien ne l'appuie : reste à savoir si elle affirme quelque chose.
        // Le même balayage que l'extraction sert d'arbitre — une phrase
        // sans date, nombre, version ni identifiant n'affirme aucun fait
        // vérifiable par comparaison de chaînes.
        const valeurs = proposerFaitsCandidats(texte)
        if (valeurs.length === 0) {
          return {
            texte,
            verdict: 'NON_FACTUELLE' as const,
            appuis: [],
            explication: 'Aucune valeur vérifiable : salutation, transition ou formule.',
          }
        }
        return {
          texte,
          verdict: 'SANS_APPUI' as const,
          appuis: [],
          explication:
            `Porte « ${valeurs[0]?.valeur ?? ''} », qu'aucune citation de la fiche de faits ` +
            'ne couvre.',
        }
      })

      const factuelles = affirmations.filter((a) => a.verdict !== 'NON_FACTUELLE')
      const soutenues = factuelles.filter((a) => a.verdict === 'SOUTENUE')
      await contexte.attendre?.(redaction)

      return {
        sortie: {
          affirmations,
          // Pas de factuelle : rien n'est affirmé, donc rien n'est en défaut.
          score: factuelles.length === 0 ? 1 : soutenues.length / factuelles.length,
          bloquant: factuelles.length !== soutenues.length,
        },
        trace: {
          role: 'VERIFICATEUR',
          prompt: 'simulation/verificateur@1',
          modele: null,
          jetonsEntree: 0,
          jetonsSortie: 0,
          dureeMs: lecture + redaction,
          simule: true,
        },
      }
    },
  }
}
