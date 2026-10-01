import { FilePlus2, History } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/layout/page-header'
import { ActionCard } from '@/components/ui/action-card'
import { resolveLocale } from '@/i18n/params'
import { verifierDroit } from '@/server/auth/droits'
import { acteurDePage } from '@/server/pages'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('generator')
  return { title: t('title') }
}

/*
 * Générateur — départ. Deux portes : créer, ou reprendre.
 *
 * L'assistant à cinq étapes commence derrière ces cartes ; son fil
 * d'avancement est porté par la communication elle-même, puisque c'est
 * elle qui sait où elle en est.
 */
export default async function GenerateurPage({ params }: PageProps) {
  await resolveLocale(params)
  const t = await getTranslations('generator')
  const acteur = await acteurDePage()
  const peutCreer = verifierDroit(acteur.utilisateur, 'CREER').autorise

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader title={t('title')} description={t('description')} />

      <div className="grid gap-4 md:grid-cols-2">
        {peutCreer ? (
          <ActionCard
            href="/communications/nouvelle"
            icon={FilePlus2}
            tone="primary"
            title={t('new.title')}
            description={t('new.description')}
          />
        ) : null}
        <ActionCard
          href="/communications"
          icon={History}
          title={t('existing.title')}
          description={t('existing.description')}
        />
      </div>
    </div>
  )
}
