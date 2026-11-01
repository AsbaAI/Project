import { exigerDroit } from '@/server/auth/droits'

import type { Acteur } from './erreurs'
import { introuvable } from './erreurs'

/**
 * L'assistant de génération, en cinq étapes (§10, §12).
 *
 *   cadrage → source → faits → destinataires → génération
 *
 * L'état de chaque étape est LU en base, jamais déduit de l'adresse. Un fil
 * d'avancement qui se contente de surligner la page courante ment dès qu'on
 * revient en arrière : il faut qu'il dise ce qui est réellement fait.
 *
 * La revue de la fiche de faits est une étape à part entière, et elle n'est
 * pas sautable : c'est l'arbitrage retenu, et c'est §10 — « revue
 * obligatoire de la fiche de faits avant génération ».
 */

export const CLES_ETAPES = ['cadrage', 'source', 'faits', 'destinataires', 'generation'] as const
export type CleEtapeAssistant = (typeof CLES_ETAPES)[number]

export type EtatEtapeAssistant =
  /** Son objet est atteint ; on peut y revenir. */
  | 'FAITE'
  /** Première étape non faite : c'est là qu'il faut agir. */
  | 'COURANTE'
  /** Pas encore atteignable : une étape antérieure manque. */
  | 'A_VENIR'

export interface EtapeAssistant {
  cle: CleEtapeAssistant
  href: string
  etat: EtatEtapeAssistant
  /** Court complément chiffré affiché sous le libellé, ou `null`. */
  compte: number | null
}

export interface AvancementAssistant {
  communicationId: string
  reference: string
  etapes: readonly EtapeAssistant[]
  /** Clé de l'étape courante, ou `null` quand tout est fait. */
  courante: CleEtapeAssistant | null
}

export async function chargerAvancement(
  acteur: Acteur,
  communicationId: string,
): Promise<AvancementAssistant> {
  exigerDroit(acteur.utilisateur, 'CONSULTER')

  const communication = await acteur.contexte.communication.findUnique({
    where: { id: communicationId },
    select: { id: true, reference: true },
  })
  if (communication === null) throw introuvable('Communication', communicationId)

  const [sources, faitsProposes, faitsRevus, variantes, variantesARediger] = await Promise.all([
    acteur.contexte.source.count({ where: { communicationId } }),
    acteur.contexte.fait.count({ where: { communicationId, statut: 'PROPOSE' } }),
    acteur.contexte.fait.count({
      where: { communicationId, statut: { in: ['CONFIRME', 'DECLARE'] } },
    }),
    acteur.contexte.variante.count({ where: { communicationId } }),
    acteur.contexte.variante.count({ where: { communicationId, etat: 'EN_GENERATION' } }),
  ])

  const base = `/communications/${communicationId}`
  const faites: Record<CleEtapeAssistant, boolean> = {
    // La communication existe : son cadrage est posé par construction.
    cadrage: true,
    source: sources > 0,
    faits: faitsRevus > 0 && faitsProposes === 0,
    destinataires: variantes > 0,
    generation: variantes > 0 && variantesARediger === 0,
  }
  const comptes: Record<CleEtapeAssistant, number | null> = {
    cadrage: null,
    source: sources,
    faits: faitsRevus + faitsProposes,
    destinataires: variantes,
    generation: variantes - variantesARediger,
  }
  const hrefs: Record<CleEtapeAssistant, string> = {
    cadrage: base,
    source: `${base}/entree`,
    faits: `${base}/faits`,
    destinataires: `${base}/destinataires`,
    generation: `${base}/generation`,
  }

  const courante = CLES_ETAPES.find((cle) => !faites[cle]) ?? null

  return {
    communicationId,
    reference: communication.reference,
    courante,
    etapes: CLES_ETAPES.map((cle) => ({
      cle,
      href: hrefs[cle],
      compte: comptes[cle],
      etat: faites[cle] ? 'FAITE' : cle === courante ? 'COURANTE' : 'A_VENIR',
    })),
  }
}
