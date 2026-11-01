import type { Criticite, EtatCommunication } from '@comgen/core'
import { ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { PageHeader } from '@/components/layout/page-header'
import { Link } from '@/i18n/navigation'
import type { AvancementAssistant } from '@/server/services/assistant'

import { Assistant } from './assistant'
import { CriticiteBadge, EtatBadge } from './badges'

/*
 * En-tête commun aux vues d'une communication : retour à la liste, titre,
 * référence en chasse fixe, état et criticité, puis le fil des cinq
 * étapes.
 *
 * Le fil a remplacé la sous-navigation : les deux côte à côte posaient
 * deux fois la même question (« où suis-je ? ») avec deux réponses
 * différentes, l'une tirée de l'adresse, l'autre de l'état réel.
 */
export interface EnTeteCommunicationProps {
  /** Avancement lu en base ; absent dans les stories et tests de composants. */
  avancement?: AvancementAssistant
  reference: string
  titre: string
  etat: EtatCommunication
  criticite?: Criticite
  actions?: React.ReactNode
}

export function EnTeteCommunication({
  avancement,
  reference,
  titre,
  etat,
  criticite,
  actions,
}: EnTeteCommunicationProps) {
  const t = useTranslations('communications')
  return (
    <>
      <Link
        href="/communications"
        className="mb-3 inline-flex items-center gap-1.5 rounded-xs text-sm text-ink-secondary no-underline focus-ring hover:text-ink-primary"
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        {t('list.title')}
      </Link>
      <PageHeader
        className="mb-4"
        title={titre}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-ink-secondary">{reference}</span>
            <EtatBadge etat={etat} />
            {criticite ? <CriticiteBadge criticite={criticite} /> : null}
          </span>
        }
        actions={actions}
      />
      {avancement ? <Assistant avancement={avancement} /> : null}
    </>
  )
}
