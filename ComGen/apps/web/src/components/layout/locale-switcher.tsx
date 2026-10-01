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
export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations('locale')
  const current = useLocale()
  const pathname = usePathname()

  return (
    <nav aria-label={t('label')} className={className}>
      <ul className="inline-flex h-control-md items-center gap-0.5 rounded-sm border-w border-line-default bg-surface-sunken p-0.5">
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
                  'text-ink-secondary transition-colors-token focus-ring hover:text-ink-primary',
                  active && 'bg-surface-raised text-ink-primary shadow-sm',
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
