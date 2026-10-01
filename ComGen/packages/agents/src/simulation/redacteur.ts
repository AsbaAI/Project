/**
 * REDACTEUR simulé.
 *
 * Il ne rend pas du texte : il rend des **segments**, du texte sans valeur
 * et des références de faits. C'est la structure même de sa sortie qui lui
 * interdit d'écrire un nombre, une date, une version ou un identifiant —
 * et `injecter`, côté domaine, refuse de toute façon un segment libre qui
 * en contiendrait un.
 *
 * Il compose à partir des citations de la fiche de faits : pour chaque fait
 * retenu, la phrase de la source est découpée autour de sa valeur, et la
 * valeur devient une référence. Le texte produit est donc, mot pour mot,
 * celui de la source — avec ses valeurs réinjectées par du code.
 *
 * C'est délibérément pauvre. Un vrai rédacteur reformulerait selon la voix
 * du persona ; aucun modèle ne tourne ici, et reformuler sans modèle, c'est
 * paraphraser au jugé. Mieux vaut une démonstration qui dit moins qu'une
 * démonstration qui invente.
 */

import type { SegmentRedige } from '@comgen/core'
import { z } from 'zod'

import type { Agent } from '../agents/types.ts'
import { ErreurAgent } from '../agents/types.ts'

import { paliers } from './delais.ts'

export const schemaSegment = z.discriminatedUnion('type', [
  z.object({ type: z.literal('texte'), texte: z.string() }),
  z.object({ type: z.literal('reference'), reference: z.string().min(1) }),
])

export const schemaParagraphe = z.object({
  role: z.enum(['ouverture', 'corps', 'cloture']),
  segments: z.array(schemaSegment).min(1),
})

export const schemaSortieRedacteur = z.object({
  paragraphes: z.array(schemaParagraphe).min(1),
})

export type SortieRedacteur = z.infer<typeof schemaSortieRedacteur>

/** Ce que le rédacteur reçoit : les faits retenus, et pour qui il écrit. */
export interface EntreeRedacteur {
  faits: readonly {
    reference: string
    valeur: string | null
    citation: string
  }[]
  langue: 'fr' | 'en'
  /** Nom du persona, pour l'ouverture. Jamais une valeur factuelle. */
  persona: string
}

const OUVERTURE = {
  fr: 'Bonjour à toutes et à tous,',
  en: 'Dear colleagues,',
} as const

const CLOTURE = {
  fr: 'L’équipe reste à votre disposition pour toute question.',
  en: 'The team remains available for any question.',
} as const

/**
 * Découpe une citation autour de TOUTES ses valeurs.
 *
 * Une phrase porte souvent plusieurs valeurs — « La version 3.9.2 sera
 * déployée le 12 novembre 2026. » en porte deux. N'en référencer qu'une
 * laisserait l'autre en texte libre, et `injecter` refuserait à juste
 * titre : une valeur laissée au fil du texte n'est plus rattachée à rien.
 *
 * Les occurrences qui se chevauchent sont ignorées après la première : on
 * ne coupe pas une valeur en deux pour en caser une autre.
 *
 * `null` quand aucune valeur ne se retrouve dans la citation. Une citation
 * qui ne contient pas ses propres valeurs est une donnée abîmée, pas un
 * cas à rattraper.
 */
function segmenter(
  citation: string,
  faits: readonly { reference: string; valeur: string }[],
): SegmentRedige[] | null {
  const occurrences = faits
    .flatMap((fait) => {
      const debut = citation.indexOf(fait.valeur)
      return debut < 0
        ? []
        : [{ debut, fin: debut + fait.valeur.length, reference: fait.reference }]
    })
    .toSorted((a, b) => a.debut - b.debut)
  if (occurrences.length === 0) return null

  const segments: SegmentRedige[] = []
  let curseur = 0
  for (const occurrence of occurrences) {
    if (occurrence.debut < curseur) continue
    const avant = citation.slice(curseur, occurrence.debut)
    if (avant.length > 0) segments.push({ type: 'texte', texte: avant })
    segments.push({ type: 'reference', reference: occurrence.reference })
    curseur = occurrence.fin
  }
  const reste = citation.slice(curseur)
  if (reste.length > 0) segments.push({ type: 'texte', texte: reste })
  return segments
}

export function creerRedacteurSimule(): Agent<EntreeRedacteur, SortieRedacteur> {
  const [lecture, redaction] = paliers('REDACTEUR')
  return {
    role: 'REDACTEUR',
    version: 'simulation-1',
    schemaSortie: schemaSortieRedacteur,
    async executer(entree, contexte) {
      await contexte.attendre?.(lecture)

      /*
       * Une phrase par citation, dans l'ordre où les faits arrivent, avec
       * toutes les valeurs de cette phrase référencées d'un coup.
       */
      const parCitation = new Map<string, { reference: string; valeur: string }[]>()
      const ordre: string[] = []
      for (const fait of entree.faits) {
        if (fait.valeur === null) continue
        const existants = parCitation.get(fait.citation)
        if (existants === undefined) {
          parCitation.set(fait.citation, [{ reference: fait.reference, valeur: fait.valeur }])
          ordre.push(fait.citation)
        } else {
          existants.push({ reference: fait.reference, valeur: fait.valeur })
        }
      }

      const corps: SortieRedacteur['paragraphes'] = []
      for (const citation of ordre) {
        const segments = segmenter(citation, parCitation.get(citation) ?? [])
        if (segments === null) continue
        corps.push({ role: 'corps', segments })
      }

      if (corps.length === 0) {
        throw new ErreurAgent(
          'SOURCE_INEXPLOITABLE',
          'REDACTEUR',
          'Aucun fait retenu ne porte une valeur citée : il n’y a rien à écrire ' +
            'qui soit appuyé par la source.',
        )
      }

      await contexte.attendre?.(redaction)
      return {
        sortie: {
          paragraphes: [
            { role: 'ouverture', segments: [{ type: 'texte', texte: OUVERTURE[entree.langue] }] },
            ...corps,
            { role: 'cloture', segments: [{ type: 'texte', texte: CLOTURE[entree.langue] }] },
          ],
        },
        trace: {
          role: 'REDACTEUR',
          prompt: 'simulation/redacteur@1',
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
