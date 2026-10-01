import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import type { EtatMoteur } from '@/server/moteur'

import { BandeauDemo } from './bandeau-demo'
import { BadgeMoteur } from './badge-moteur'
import { MobileNav } from './mobile-nav'
import { PiedDePage } from './pied-de-page'
import { TopNav } from './top-nav'
import { UserMenu, type UserMenuProps } from './user-menu'

/*
 * Coquille de l'application.
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ bandeau de démonstration (si COMGEN_ENV=demo)                │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ barre marine : menu (tél.) · marque · onglets ·              │
 *   │                état du moteur · compte                       │
 *   │ filet bleu → orange en pied de barre                         │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ <main id="contenu">                                          │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ pied : version · Powered by Multi-Provider AI                │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * La barre est sombre dans les deux thèmes : c'est une surface de marque.
 * Elle est collante ; sa hauteur, bandeau compris, est portée par
 * `--layout-chrome-height`, dont partent tous les décalages (défilement
 * d'ancre, panneaux collants). Le lien d'évitement reste le premier élément
 * focalisable. Le contenu est limité à `max-w-page` (1440px) et centré.
 */
export interface AppShellProps {
  children: ReactNode
  /** Personne connectée ; absente dans les stories et les tests de composants. */
  utilisateur?: UserMenuProps['utilisateur']
  /** Démonstration publique : bandeau d'avertissement en tête de page. */
  demo?: boolean
  /** État du moteur de génération, lu côté serveur (`server/moteur.ts`). */
  moteur?: { etat: EtatMoteur; reference: string }
  /** Version affichée en pied de page. */
  version?: string | undefined
}

export function AppShell({ children, utilisateur, demo = false, moteur, version }: AppShellProps) {
  const t = useTranslations('app')

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenu" className="skip-link">
        {t('skipToContent')}
      </a>

      <div className="sticky top-0 z-header">
        {demo ? <BandeauDemo /> : null}
        <div className="relative h-header bg-nav-surface">
          {/* Filet de marque bleu → orange : l'un des rares emplois du dégradé. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-brand-gradient"
          />
          <div className="mx-auto flex h-full w-full max-w-page items-center gap-2 px-gutter">
            <MobileNav />
            <Link
              href="/generateur"
              className="flex shrink-0 items-center gap-2 rounded-xs text-base font-semibold tracking-tight text-nav-ink no-underline focus-ring"
            >
              <span
                aria-hidden="true"
                className="flex size-6 items-center justify-center rounded-xs bg-action text-2xs font-bold tracking-normal text-on-action"
              >
                CG
              </span>
              {t('name')}
            </Link>

            <TopNav className="ml-4 min-w-0 flex-1" />

            <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
              {moteur ? (
                <BadgeMoteur
                  etat={moteur.etat}
                  reference={moteur.reference}
                  className="hidden sm:inline-flex"
                />
              ) : null}
              {utilisateur ? <UserMenu utilisateur={utilisateur} /> : null}
            </div>
          </div>
        </div>
      </div>

      <main
        id="contenu"
        tabIndex={-1}
        className="mx-auto w-full max-w-page flex-1 px-gutter py-6 outline-none lg:py-8"
      >
        {children}
      </main>

      <PiedDePage version={version} />
    </div>
  )
}
