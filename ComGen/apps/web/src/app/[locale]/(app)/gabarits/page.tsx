import { LayoutTemplate } from 'lucide-react'
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
  const t = await getTranslations('templates')
  return { title: t('title') }
}

/*
 * Bibliothèque de gabarits. Le schéma porte déjà des `Template` et leurs
 * emplacements, mais aucun service ne les lit encore : la page annonce ce
 * qu'elle portera plutôt que d'afficher une liste vide qui se lirait comme
 * « aucun gabarit n'existe ».
 */
export default async function GabaritsPage({ params }: PageProps) {
  await resolveLocale(params)
  await acteurDePage()
  const t = await getTranslations('templates')

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <EmptyState
        icon={LayoutTemplate}
        headingLevel={2}
        title={t('empty.title')}
        description={t('empty.description')}
      />
    </>
  )
}
