import { BarChart3 } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { resolveLocale } from '@/i18n/params'
import { acteurDePage } from '@/server/pages'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('analytics')
  return { title: t('title') }
}

/*
 * Analyses. Les indicateurs se calculent sur des envois réels : tant que
 * l'envoi n'existe pas, la page le dit au lieu d'afficher des zéros qui
 * passeraient pour une mesure.
 */
export default async function AnalysesPage({ params }: PageProps) {
  await resolveLocale(params)
  await acteurDePage()
  const t = await getTranslations('analytics')

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <EmptyState
        icon={BarChart3}
        headingLevel={2}
        title={t('empty.title')}
        description={t('empty.description')}
      />
    </>
  )
}
