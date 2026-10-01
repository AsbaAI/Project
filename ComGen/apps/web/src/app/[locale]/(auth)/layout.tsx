import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { BandeauDemo } from '@/components/layout/bandeau-demo'
import { LocaleSwitcher } from '@/components/layout/locale-switcher'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { environnement } from '@/server/env'

/*
 * Écrans hors session (connexion). Pas de navigation : il n'y a nulle part
 * où aller. La marque, la langue et le thème restent accessibles.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('app')

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenu" className="skip-link">
        {t('skipToContent')}
      </a>
      {environnement().COMGEN_ENV === 'demo' ? <BandeauDemo /> : null}
      <header className="h-header border-b-w border-line-default bg-surface-raised">
        <div className="mx-auto flex h-full w-full max-w-page items-center gap-3 px-gutter">
          <span className="flex items-center gap-2 text-base font-semibold tracking-tight text-ink-primary">
            <span
              aria-hidden="true"
              className="flex size-6 items-center justify-center rounded-xs bg-action text-2xs font-bold tracking-normal text-on-action"
            >
              CG
            </span>
            {t('name')}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main
        id="contenu"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-page flex-1 flex-col items-center px-gutter py-10 outline-none lg:py-16"
      >
        {children}
      </main>
    </div>
  )
}
