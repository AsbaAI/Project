'use client'

import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import { NAV_GROUPES, NAV_TABS, type NavGroupe, ongletCourant } from '@/lib/navigation'

import { GlypheEspace, Monogramme } from './marque'

/*
 * Colonne de navigation (à partir de `lg`).
 *
 * Trois familles — espace de travail, intelligence, opérations — tirées de
 * la MÊME liste que le tiroir du téléphone : une entrée ajoutée ici
 * apparaît là-bas, sans seconde source de vérité.
 *
 * L'entrée courante est marquée par `aria-current="page"` (le style s'y
 * accroche) et par un filet vertical de 2px en plus de sa surface : la
 * couleur n'est jamais le seul signal. La carte d'espace de travail porte
 * deux informations réelles, lues en base — jamais un libellé décoratif.
 */
/** Les entrées d'une famille, dans l'ordre de la liste unique. */
const entreesDe = (nom: NavGroupe) => NAV_TABS.filter((onglet) => onglet.groupe === nom)

export interface SidebarProps {
  espace?: { organisation: string; residence: string } | undefined
  /** Pied de colonne : identité et déconnexion. */
  children?: React.ReactNode
  className?: string
}

export function Sidebar({ espace, children, className }: SidebarProps) {
  const t = useTranslations('nav')
  const tApp = useTranslations('app')
  const courant = ongletCourant(usePathname())

  return (
    <aside
      aria-label={t('label')}
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r-w border-nav-line bg-nav-surface lg:flex',
        'w-sidebar px-4 pt-6 pb-4',
        className,
      )}
    >
      <Link
        href="/generateur"
        className="mb-7 flex items-center gap-3 rounded-sm px-2 text-nav-ink no-underline focus-ring"
      >
        <Monogramme className="size-9 shrink-0 text-ink-accent" />
        <span className="flex min-w-0 flex-col">
          <span className="font-display text-base font-semibold tracking-[0.19em] uppercase">
            {tApp('name')}
          </span>
          <span className="mt-1 text-2xs tracking-[0.17em] text-ink-tertiary uppercase">
            {tApp('studio')}
          </span>
        </span>
      </Link>

      {espace ? (
        <div className="mb-7 flex items-center gap-2.5 rounded-md border-w border-nav-line bg-nav-sunken p-3">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-ai-bg text-ai-ink"
          >
            <GlypheEspace />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-semibold text-nav-ink">
              {espace.organisation}
            </span>
            <span className="mt-0.5 truncate text-2xs text-ink-tertiary">{espace.residence}</span>
          </span>
        </div>
      ) : null}

      <nav aria-label={t('label')} className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        {NAV_GROUPES.map((nom) => (
          <div key={nom}>
            <h2 className="mb-3 px-3 text-2xs font-semibold tracking-[0.15em] text-ink-tertiary uppercase">
              {t(`groupes.${nom}`)}
            </h2>
            <ul className="flex flex-col gap-0.5">
              {entreesDe(nom).map((onglet) => {
                const Icon = onglet.icon
                const actif = courant === onglet.href
                return (
                  <li key={onglet.key}>
                    <Link
                      href={onglet.href}
                      aria-current={actif ? 'page' : undefined}
                      className={cn(
                        'relative flex h-control-lg items-center gap-3 rounded-sm px-3 text-sm no-underline',
                        'text-nav-ink-muted transition-colors-token focus-ring',
                        'hover:bg-nav-hover hover:text-nav-ink',
                        'aria-[current=page]:bg-nav-selected aria-[current=page]:font-medium aria-[current=page]:text-ink-accent',
                        'aria-[current=page]:before:absolute aria-[current=page]:before:inset-y-2.5 aria-[current=page]:before:left-0',
                        'aria-[current=page]:before:w-0.5 aria-[current=page]:before:rounded-full aria-[current=page]:before:bg-ai-solid',
                      )}
                    >
                      <Icon aria-hidden="true" className="size-4.5 shrink-0" strokeWidth={1.6} />
                      <span className="truncate">{t(onglet.key)}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {children ? <div className="mt-4 border-t-w border-nav-line pt-4">{children}</div> : null}
    </aside>
  )
}
