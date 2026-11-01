/**
 * EXTRACTEUR simulé.
 *
 * Il n'invente rien : il relève les faits par `proposerFaitsCandidats`, la
 * fonction pure du domaine qui balaie le texte et cite la phrase entière
 * autour de chaque valeur. C'est donc le fichier réellement déposé qui
 * fournit la démonstration, pas un jeu de faits écrit d'avance.
 *
 * Une source où rien ne se laisse relever échoue (`SOURCE_INEXPLOITABLE`).
 * C'est le point le plus important de ce fichier : un repli « sortie
 * générique mais crédible » serait exactement l'erreur que ce produit
 * existe pour rendre impossible — un spectateur dépose sa note et lit des
 * valeurs qui ne viennent de nulle part.
 */

import { proposerFaitsCandidats } from '@comgen/core'
import { z } from 'zod'

import type { Agent } from '../agents/types.ts'
import { ErreurAgent } from '../agents/types.ts'

import { paliers } from './delais.ts'

export const schemaFaitReleve = z.object({
  enonce: z.string().min(1),
  valeur: z.string().min(1),
  typeValeur: z.enum(['DATE', 'NOMBRE', 'VERSION', 'IDENTIFIANT']),
  citation: z.string().min(1),
  localisation: z.object({
    offsetDebut: z.number().int().nonnegative(),
    offsetFin: z.number().int().nonnegative(),
    ligne: z.number().int().positive(),
  }),
  confiance: z.number().min(0).max(1),
})

export const schemaSortieExtracteur = z.object({ faits: z.array(schemaFaitReleve) })

export type SortieExtracteur = z.infer<typeof schemaSortieExtracteur>

export interface EntreeTexte {
  texte: string
}

export function creerExtracteurSimule(): Agent<EntreeTexte, SortieExtracteur> {
  const [lecture, redaction] = paliers('EXTRACTEUR')
  return {
    role: 'EXTRACTEUR',
    version: 'simulation-1',
    schemaSortie: schemaSortieExtracteur,
    async executer(entree, contexte) {
      await contexte.attendre?.(lecture)
      const faits = proposerFaitsCandidats(entree.texte)
      if (faits.length === 0) {
        throw new ErreurAgent(
          'SOURCE_INEXPLOITABLE',
          'EXTRACTEUR',
          'Aucun fait ne se laisse relever dans cette source : ni date, ni nombre, ' +
            'ni version, ni identifiant. Rien ne sera généré à partir d’elle.',
        )
      }
      await contexte.attendre?.(redaction)
      return {
        sortie: { faits },
        trace: {
          role: 'EXTRACTEUR',
          prompt: 'simulation/extracteur@1',
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
