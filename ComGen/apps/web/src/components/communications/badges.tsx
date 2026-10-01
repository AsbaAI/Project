import type { Criticite, EtatCommunication, StatutFait } from '@comgen/core'
import { useTranslations } from 'next-intl'

import { Badge, type BadgeTone } from '@/components/ui/badge'
import { STATE_TONE } from '@/lib/state-tone'

/*
 * Badges du domaine. Forme et texte portent l'information ; la couleur la
 * confirme (voir `Badge`).
 */

export function EtatBadge({ etat }: { etat: EtatCommunication }) {
  const t = useTranslations('states')
  return <Badge tone={STATE_TONE[etat]}>{t(etat)}</Badge>
}

const TONALITE_CRITICITE: Record<Criticite, BadgeTone> = {
  COURANTE: 'neutral',
  IMPORTANTE: 'warning',
  CRITIQUE: 'danger',
}

export function CriticiteBadge({ criticite }: { criticite: Criticite }) {
  const t = useTranslations('communications.criticites')
  return <Badge tone={TONALITE_CRITICITE[criticite]}>{t(criticite)}</Badge>
}

const TONALITE_STATUT: Record<StatutFait, BadgeTone> = {
  PROPOSE: 'pending',
  CONFIRME: 'success',
  RETIRE: 'archived',
  PERIME: 'archived',
  DECLARE: 'warning',
}

export function StatutFaitBadge({ statut }: { statut: StatutFait }) {
  const t = useTranslations('communications.statutsFait')
  return <Badge tone={TONALITE_STATUT[statut]}>{t(statut)}</Badge>
}
