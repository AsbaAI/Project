import type { Criticite, EtatCommunication } from '@comgen/core'
import { ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { PageHeader } from '@/components/layout/page-header'
import { Link } from '@/i18n/navigation'

import { CriticiteBadge, EtatBadge } from './badges'
import { NavigationCommunication } from './navigation-communication'

/*
 * En-tête commun aux vues d'une communication : retour à la liste, titre,
 * référence en chasse fixe, état et criticité, puis la sous-navigation.
 */
export interface EnTeteCommunicationProps {
  id: string
  reference: string
  titre: string
  etat: EtatCommunication
  criticite?: Criticite
  actions?: React.ReactNode
}

export function EnTeteCommunication({
  id,
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
      <NavigationCommunication id={id} />
    </>
  )
}
