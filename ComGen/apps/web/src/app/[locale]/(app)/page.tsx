import { Inbox } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Panel } from '@/components/ui/panel'
import { Link } from '@/i18n/navigation'
import { resolveLocale } from '@/i18n/params'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard')
  return { title: t('title') }
}

/*
 * Tableau de bord. Au lot 0 il n'y a rien à montrer : on le dit, sans
 * chiffres inventés ni cartes vides — un état vide honnête qui oriente
 * vers ce qui existe.
 */
export default async function DashboardPage({ params }: PageProps) {
  await resolveLocale(params)
  const t = await getTranslations('dashboard')

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <Panel flush>
        <EmptyState
          icon={Inbox}
          title={t('empty.title')}
          description={t('empty.description')}
          action={
            <Button asChild variant="secondary">
              <Link href="/design">{t('empty.action')}</Link>
            </Button>
          }
        />
      </Panel>
    </>
  )
}
