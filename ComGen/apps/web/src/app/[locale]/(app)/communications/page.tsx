import { FileStack, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { TableauCommunications } from '@/components/communications/tableau-communications'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Panel } from '@/components/ui/panel'
import { Link } from '@/i18n/navigation'
import { resolveLocale } from '@/i18n/params'
import { verifierDroit } from '@/server/auth/droits'
import { acteurDePage } from '@/server/pages'
import { fuseauDeSaisie, listerCommunications } from '@/server/services/communications'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('communications.list')
  return { title: t('title') }
}

export default async function CommunicationsPage({ params }: PageProps) {
  await resolveLocale(params)
  const t = await getTranslations('communications.list')
  const tDashboard = await getTranslations('dashboard')
  const acteur = await acteurDePage()
  const [communications, fuseau] = await Promise.all([
    listerCommunications(acteur),
    fuseauDeSaisie(acteur),
  ])
  const nouvelle = verifierDroit(acteur.utilisateur, 'CREER').autorise ? (
    <Button asChild variant="primary" icon={<Plus aria-hidden="true" />}>
      <Link href="/communications/nouvelle">{tDashboard('newCommunication')}</Link>
    </Button>
  ) : null

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} actions={nouvelle} />
      <Panel flush>
        {communications.length === 0 ? (
          <EmptyState
            icon={FileStack}
            title={t('empty.title')}
            description={t('empty.description')}
            action={nouvelle}
          />
        ) : (
          <TableauCommunications
            communications={communications}
            fuseau={fuseau}
            legende={t('caption')}
          />
        )}
      </Panel>
    </>
  )
}
