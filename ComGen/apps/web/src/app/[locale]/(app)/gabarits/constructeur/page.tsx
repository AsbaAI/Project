import { Blocks } from 'lucide-react'
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
  const t = await getTranslations('templateBuilder')
  return { title: t('title') }
}

/*
 * Constructeur de gabarits. Rien n'en existe encore : la page dit ce
 * qu'elle portera, plutôt que de livrer une zone de travail inerte dans
 * laquelle on essaierait de glisser des blocs sans effet.
 */
export default async function ConstructeurPage({ params }: PageProps) {
  await resolveLocale(params)
  await acteurDePage()
  const t = await getTranslations('templateBuilder')

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <EmptyState
        icon={Blocks}
        headingLevel={2}
        title={t('empty.title')}
        description={t('empty.description')}
      />
    </>
  )
}
