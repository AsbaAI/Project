import { CircleCheck } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/layout/page-header'
import { Notice } from '@/components/ui/notice'
import { Panel } from '@/components/ui/panel'
import { Link } from '@/i18n/navigation'
import { resolveLocale } from '@/i18n/params'
import { acteurDePage } from '@/server/pages'
import { chargerTableauDeBord } from '@/server/services/communications'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('approvals')
  return { title: t('title') }
}

/*
 * Approbations. Lit le même service que le tableau de bord : un seul
 * calcul, deux présentations.
 *
 * La vue approbateur (approuver, rejeter avec motif) et l'historique des
 * décisions arrivent à l'étape 4. Ce qui est affiché ici est réel : ce qui
 * attend VOTRE approbation, d'après les droits relus en base.
 */
export default async function ApprobationsPage({ params }: PageProps) {
  await resolveLocale(params)
  const t = await getTranslations('approvals')
  const acteur = await acteurDePage()
  const tableau = await chargerTableauDeBord(acteur)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('title')} description={t('description')} />

      <Panel title={t('pending.title')} description={t('pending.description')}>
        {tableau.aApprouver.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-ink-secondary">
            <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-success-ink" />
            {t('pending.empty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tableau.aApprouver.map((c) => (
              <li key={c.id} className="text-sm">
                <Link
                  href={`/communications/${c.id}`}
                  className="rounded-xs font-medium text-ink-primary focus-ring hover:text-ink-accent"
                >
                  {c.titre}
                </Link>{' '}
                <span className="font-mono text-xs text-ink-secondary">{c.reference}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Notice level="info" title={t('wip.title')}>
        {t('wip.description')}
      </Notice>
    </div>
  )
}
