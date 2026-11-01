import {
  Bot,
  LayoutTemplate,
  type LucideIcon,
  Mail,
  PlugZap,
  UsersRound,
  Workflow,
} from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Link } from '@/i18n/navigation'
import { resolveLocale } from '@/i18n/params'
import { acteurDePage } from '@/server/pages'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings')
  return { title: t('title') }
}

const SECTIONS: readonly {
  cle: 'agentsCard' | 'models' | 'personas' | 'lists' | 'templates'
  icone: LucideIcon
  /** Absent : l'écran n'existe pas encore, la carte l'annonce sans lien. */
  href?:
    '/parametres/agents' | '/parametres/modeles' | '/parametres/personas' | '/parametres/listes'
}[] = [
  { cle: 'agentsCard', icone: Workflow, href: '/parametres/agents' },
  { cle: 'models', icone: Bot, href: '/parametres/modeles' },
  { cle: 'personas', icone: UsersRound, href: '/parametres/personas' },
  { cle: 'lists', icone: Mail, href: '/parametres/listes' },
  { cle: 'templates', icone: LayoutTemplate },
]

/*
 * Paramètres : les quatre familles de réglages, annoncées. Aucune n'est
 * encore modifiable ; chaque carte le dit par un badge, sans lien qui
 * mènerait à une page vide.
 */
export default async function ParametresPage({ params }: PageProps) {
  await resolveLocale(params)
  await acteurDePage()
  const t = await getTranslations('settings')

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <ul className="grid gap-3 sm:grid-cols-2">
        <li className="flex items-start gap-3 rounded-lg border-w border-line-default bg-surface-raised p-4">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-bg text-ink-accent [&_svg]:size-5"
          >
            <PlugZap strokeWidth={1.75} />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-base font-semibold text-ink-primary">
              <Link href="/parametres/itsm" className="rounded-xs focus-ring hover:text-ink-accent">
                {t('sections.itsm.title')}
              </Link>
            </h2>
            <p className="text-sm text-ink-secondary">{t('sections.itsm.description')}</p>
          </div>
        </li>
        {SECTIONS.map(({ cle, icone: Icone, href }) => (
          <li
            key={cle}
            className="flex items-start gap-3 rounded-lg border-w border-line-default bg-surface-raised p-4"
          >
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-bg text-ink-accent [&_svg]:size-5"
            >
              <Icone strokeWidth={1.75} />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-ink-primary">
                  {href === undefined ? (
                    t(`sections.${cle}.title`)
                  ) : (
                    <Link href={href} className="rounded-xs focus-ring hover:text-ink-accent">
                      {t(`sections.${cle}.title`)}
                    </Link>
                  )}
                </h2>
                {href === undefined ? <Badge tone="neutral">{t('soon')}</Badge> : null}
              </div>
              <p className="text-sm text-ink-secondary">{t(`sections.${cle}.description`)}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
