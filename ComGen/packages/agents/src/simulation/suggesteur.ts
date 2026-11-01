/**
 * SUGGESTEUR simulé : il préremplit le cadrage, il ne le décide pas.
 *
 * Trois propositions, chacune adossée à un extrait de la source :
 *
 *  - le titre, repris MOT POUR MOT d'une ligne de la source (jamais
 *    reformulé : un titre réécrit est déjà une affirmation) ;
 *  - la nature, déduite d'un vocabulaire explicite ;
 *  - la criticité, déduite du même vocabulaire.
 *
 * Chaque proposition peut être `null`. C'est le cas normal, pas une panne :
 * quand rien dans la source ne justifie une criticité, l'écran la laisse
 * vide et c'est l'humain qui tranche. Un agent qui remplit toujours tout
 * apprend au relecteur à ne plus lire.
 */

import type { Criticite, Nature } from '@comgen/core'
import { decouperEnPhrases } from '@comgen/core'
import { z } from 'zod'

import type { Agent } from '../agents/types.ts'

import { paliers } from './delais.ts'
import type { EntreeTexte } from './extracteur.ts'

const schemaProposition = <T extends string>(valeurs: readonly [T, ...T[]]) =>
  z
    .object({
      valeur: z.enum(valeurs),
      /** Phrase de la source qui justifie la proposition, mot pour mot. */
      extrait: z.string().min(1),
    })
    .nullable()

export const schemaSortieSuggesteur = z.object({
  titre: z.object({ valeur: z.string().min(1), extrait: z.string().min(1) }).nullable(),
  nature: schemaProposition([
    'SPEC_UPDATE',
    'CHANGE',
    'INCIDENT',
    'RELEASE',
    'ORG',
    'REGULATORY',
  ] as const),
  criticite: schemaProposition(['COURANTE', 'IMPORTANTE', 'CRITIQUE'] as const),
})

export type SortieSuggesteur = z.infer<typeof schemaSortieSuggesteur>

/** Vocabulaire → nature. Le premier motif rencontré gagne, dans cet ordre. */
const NATURES: readonly { valeur: Nature; mots: readonly string[] }[] = [
  { valeur: 'INCIDENT', mots: ['incident', 'panne', 'indisponibilité', 'interruption'] },
  { valeur: 'REGULATORY', mots: ['réglementaire', 'conformité', 'rgpd', 'obligation légale'] },
  { valeur: 'CHANGE', mots: ['migration', 'changement', 'bascule', 'fenêtre de maintenance'] },
  { valeur: 'RELEASE', mots: ['livraison', 'mise en production', 'déploiement', 'release'] },
  { valeur: 'ORG', mots: ['organisation', 'nomination', 'réorganisation'] },
  { valeur: 'SPEC_UPDATE', mots: ['spécification', 'documentation', 'procédure'] },
]

/** Vocabulaire → criticité. Rien ne la rend « courante » par défaut. */
const CRITICITES: readonly { valeur: Criticite; mots: readonly string[] }[] = [
  { valeur: 'CRITIQUE', mots: ['critique', 'urgent', 'bloquant', 'sécurité'] },
  {
    valeur: 'IMPORTANTE',
    mots: ['indisponible', 'indisponibilité', 'interruption', 'migration', 'obligatoire'],
  },
  { valeur: 'COURANTE', mots: ['information', 'pour rappel', 'courant'] },
]

/**
 * La source est lue de haut en bas : c'est la PREMIÈRE phrase qui dit
 * quelque chose qui décide, et l'ordre de la table ne tranche qu'à
 * l'intérieur d'une même phrase.
 *
 * L'ordre inverse — la table d'abord — donnait le résultat qu'on voit
 * arriver : une note de migration dont la cinquième ligne mentionne un
 * ticket d'incident était classée « incident », contre son propre objet.
 * Un humain lit le titre avant les détails ; l'agent fait de même.
 */
function chercher<T extends string>(
  phrases: readonly { texte: string }[],
  table: readonly { valeur: T; mots: readonly string[] }[],
): { valeur: T; extrait: string } | null {
  for (const phrase of phrases) {
    const minuscule = phrase.texte.toLocaleLowerCase('fr')
    for (const entree of table) {
      if (entree.mots.some((mot) => minuscule.includes(mot))) {
        return { valeur: entree.valeur, extrait: phrase.texte }
      }
    }
  }
  return null
}

/**
 * Titre : la première ligne utile de la source, reprise telle quelle. Le
 * préfixe « Objet : » est retiré — c'est une étiquette de courriel, pas du
 * contenu — et rien d'autre n'est touché.
 */
function proposerTitre(
  phrases: readonly { texte: string }[],
): { valeur: string; extrait: string } | null {
  for (const phrase of phrases) {
    const sansPrefixe = phrase.texte.replace(/^\s*(?:objet|subject)\s*:\s*/iu, '').trim()
    if (sansPrefixe.length >= 10) return { valeur: sansPrefixe, extrait: phrase.texte }
  }
  return null
}

export function creerSuggesteurSimule(): Agent<EntreeTexte, SortieSuggesteur> {
  const [lecture, redaction] = paliers('SUGGESTEUR')
  return {
    role: 'SUGGESTEUR',
    version: 'simulation-1',
    schemaSortie: schemaSortieSuggesteur,
    async executer(entree, contexte) {
      await contexte.attendre?.(lecture)
      const phrases = decouperEnPhrases(entree.texte)
      const sortie: SortieSuggesteur = {
        titre: proposerTitre(phrases),
        nature: chercher(phrases, NATURES),
        criticite: chercher(phrases, CRITICITES),
      }
      await contexte.attendre?.(redaction)
      return {
        sortie,
        trace: {
          role: 'SUGGESTEUR',
          prompt: 'simulation/suggesteur@1',
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
