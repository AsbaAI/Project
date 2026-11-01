'use client'

import { useLocale, useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { cn } from '@/lib/cn'

/*
 * Sélecteur de langue : un lien par langue, vers LA MÊME page. La langue
 * courante est marquée `aria-current="true"` et rendue non cliquable en
 * apparence (mais reste un lien : on ne retire pas un repère du DOM).
 * Chaque lien porte la langue cible dans `hreflang` et `lang`, pour que la
 * synthèse vocale prononce « English » en anglais.
 */
export interface LocaleSwitcherProps {
  className?: string
  /** `barre` : posé sur la barre marine, qui ne suit pas le thème. */
  ton?: 'surface' | 'barre'
}

export function LocaleSwitcher({ className, ton = 'surface' }: LocaleSwitcherProps) {
  const t = useTranslations('locale')
  const current = useLocale()
  const pathname = usePathname()

  return (
    <nav
      {...(ton === 'barre' ? { 'data-barre': 'langue' } : {})}
      aria-label={t('label')}
      className={className}
    >
      <ul
        className={cn(
          'inline-flex h-control-md items-center gap-0.5 rounded-sm p-0.5',
          ton === 'barre' ? 'bg-nav-sunken' : 'border-w border-line-default bg-surface-sunken',
        )}
      >
        {routing.locales.map((locale) => {
          const active = locale === current
          return (
            <li key={locale}>
              <Link
                href={pathname}
                locale={locale}
                hrefLang={locale}
                lang={locale}
                aria-current={active ? 'true' : undefined}
                aria-label={t(locale)}
                className={cn(
                  'inline-flex h-7 min-w-7 items-center justify-center rounded-xs px-1.5 text-xs font-semibold uppercase tracking-caps no-underline',
                  'transition-colors-token focus-ring',
                  ton === 'barre'
                    ? 'text-nav-ink-muted hover:text-nav-ink'
                    : 'text-ink-secondary hover:text-ink-primary',
                  active &&
                    (ton === 'barre'
                      ? 'bg-nav-selected text-nav-ink'
                      : 'bg-surface-raised text-ink-primary shadow-sm'),
                )}
              >
                {locale}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
