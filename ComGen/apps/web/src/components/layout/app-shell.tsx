import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import { ThemeToggle } from '@/components/ui/theme-toggle'

import { LocaleSwitcher } from './locale-switcher'
import { MainNav } from './main-nav'
import { MobileNav } from './mobile-nav'

/*
 * Coquille de l'application.
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ en-tête 48px : menu (tél.) · marque · langue · thème │
 *   ├──────────┬───────────────────────────────────┤
 *   │ barre    │ <main id="contenu">               │
 *   │ latérale │                                   │
 *   │ 240px    │                                   │
 *   │ (≥ lg)   │                                   │
 *   └──────────┴───────────────────────────────────┘
 *
 * Le lien d'évitement est le premier élément focalisable. La barre
 * latérale est collante sous l'en-tête et défile indépendamment. Le
 * contenu est limité à `max-w-page` (1440px) et centré au-delà.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations('app')

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenu" className="skip-link">
        {t('skipToContent')}
      </a>

      <header className="sticky top-0 z-header h-header border-b-w border-line-default bg-surface-raised">
        <div className="mx-auto flex h-full w-full max-w-page items-center gap-3 px-gutter">
          <MobileNav />
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xs text-base font-semibold tracking-tight text-ink-primary no-underline focus-ring"
          >
            <span
              aria-hidden="true"
              className="flex size-6 items-center justify-center rounded-xs bg-action text-2xs font-bold tracking-normal text-on-action"
            >
              CG
            </span>
            {t('name')}
          </Link>
          <p className="hidden text-sm text-ink-tertiary md:block">{t('tagline')}</p>
          <div className="ml-auto flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-page flex-1">
        <aside className="sticky top-header hidden h-[calc(100dvh-var(--layout-header-height))] w-sidebar shrink-0 overflow-y-auto border-r-w border-line-default px-4 py-4 lg:block">
          <MainNav />
        </aside>
        <main
          id="contenu"
          tabIndex={-1}
          className="min-w-0 flex-1 px-gutter py-6 outline-none lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
