/**
 * ANALYSTE_IMPACT simulé : qui faut-il prévenir ?
 *
 * Le principe est le même que pour l'extracteur, appliqué aux audiences :
 * une audience n'est proposée que si la source la NOMME, et la proposition
 * porte la phrase entière qui le dit. Le relecteur voit donc toujours
 * pourquoi on lui suggère quelqu'un, et peut refuser.
 *
 * Une source qui ne nomme personne ne produit aucune suggestion. C'est un
 * résultat, pas un échec : l'absence d'audience n'est pas l'absence de
 * contenu, et deviner ici reviendrait à écrire la liste de diffusion à la
 * place de l'humain.
 */

import { decouperEnPhrases } from '@comgen/core'
import { z } from 'zod'

import type { Agent } from '../agents/types.ts'

import { paliers } from './delais.ts'
import type { EntreeTexte } from './extracteur.ts'

export const schemaSuggestionAudience = z.object({
  /** `MOT_CLE` : la source nomme l'audience. Les autres origines exigent un annuaire. */
  origine: z.literal('MOT_CLE'),
  dimension: z.string().min(1),
  /** Le mot de la source qui a déclenché la suggestion, tel qu'il y figure. */
  motDeclencheur: z.string().min(1),
  justification: z.string().min(1),
  /** Phrase entière de la source, mot pour mot. */
  extrait: z.string().min(1),
  pertinence: z.number().min(0).max(1),
})

export const schemaSortieAnalyste = z.object({
  suggestions: z.array(schemaSuggestionAudience),
})

export type SortieAnalyste = z.infer<typeof schemaSortieAnalyste>

/**
 * Audiences reconnaissables au vocabulaire, en français et en anglais. La
 * liste est volontairement courte et explicite : une audience devinée par
 * ressemblance serait une audience inventée.
 */
const VOCABULAIRE: readonly { dimension: string; mots: readonly string[]; pertinence: number }[] = [
  { dimension: 'Support', mots: ['support', 'helpdesk', 'assistance'], pertinence: 0.8 },
  {
    dimension: 'Clients',
    mots: ['client', 'clients', 'customer', 'customers', 'grands comptes'],
    pertinence: 0.75,
  },
  {
    dimension: 'Utilisateurs',
    mots: ['utilisateur', 'utilisateurs', 'user', 'users'],
    pertinence: 0.7,
  },
  { dimension: 'Exploitation', mots: ['exploitation', 'production', 'ops'], pertinence: 0.7 },
  { dimension: 'Direction', mots: ['direction', 'comité', 'management'], pertinence: 0.6 },
  {
    dimension: 'Partenaires',
    mots: ['partenaire', 'partenaires', 'fournisseur', 'fournisseurs'],
    pertinence: 0.6,
  },
  { dimension: 'Conformité', mots: ['conformité', 'juridique', 'réglementaire'], pertinence: 0.7 },
  {
    dimension: 'Équipes techniques',
    mots: ['développement', 'équipes techniques', 'ingénierie', 'recette'],
    pertinence: 0.65,
  },
]

export function creerAnalysteSimule(): Agent<EntreeTexte, SortieAnalyste> {
  const [lecture, redaction] = paliers('ANALYSTE_IMPACT')
  return {
    role: 'ANALYSTE_IMPACT',
    version: 'simulation-1',
    schemaSortie: schemaSortieAnalyste,
    async executer(entree, contexte) {
      await contexte.attendre?.(lecture)

      const suggestions: SortieAnalyste['suggestions'] = []
      const dejaVues = new Set<string>()
      for (const phrase of decouperEnPhrases(entree.texte)) {
        const minuscule = phrase.texte.toLocaleLowerCase('fr')
        for (const audience of VOCABULAIRE) {
          if (dejaVues.has(audience.dimension)) continue
          const mot = audience.mots.find((candidat) => minuscule.includes(candidat))
          if (mot === undefined) continue
          dejaVues.add(audience.dimension)
          suggestions.push({
            origine: 'MOT_CLE',
            dimension: audience.dimension,
            motDeclencheur: mot,
            justification: `La source nomme « ${mot} ».`,
            extrait: phrase.texte,
            pertinence: audience.pertinence,
          })
        }
      }

      await contexte.attendre?.(redaction)
      return {
        sortie: { suggestions },
        trace: {
          role: 'ANALYSTE_IMPACT',
          prompt: 'simulation/analyste@1',
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
