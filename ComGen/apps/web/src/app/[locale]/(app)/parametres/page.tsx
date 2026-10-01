import { Bot, LayoutTemplate, type LucideIcon, Mail, UsersRound } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
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
  cle: 'models' | 'personas' | 'lists' | 'templates'
  icone: LucideIcon
}[] = [
  { cle: 'models', icone: Bot },
  { cle: 'personas', icone: UsersRound },
  { cle: 'lists', icone: Mail },
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
        {SECTIONS.map(({ cle, icone: Icone }) => (
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
                  {t(`sections.${cle}.title`)}
                </h2>
                <Badge tone="neutral">{t('soon')}</Badge>
              </div>
              <p className="text-sm text-ink-secondary">{t(`sections.${cle}.description`)}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
