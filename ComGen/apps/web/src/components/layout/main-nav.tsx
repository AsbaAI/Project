'use client'

import { SwatchBook } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import { NAV_ACTION, NAV_ENTRIES, entreeCourante } from '@/lib/navigation'

import { NavItem } from './nav-item'

/*
 * Navigation partagée par la barre latérale (bureau) et le tiroir
 * (téléphone). En tête, l'action principale de l'application, rendue en
 * bouton ; puis les sections ; en pied, le système de design, outil de
 * l'équipe plutôt que destination. Composant client : il passe des icônes
 * (fonctions) et un rappel de fermeture à ses entrées.
 */
export function MainNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('nav')
  const chemin = usePathname()
  const courante = entreeCourante(chemin, [NAV_ACTION, ...NAV_ENTRIES, { href: '/design' }])
  const Action = NAV_ACTION.icon
  const actionCourante = courante === NAV_ACTION.href

  return (
    <nav aria-label={t('label')} className="flex h-full flex-col gap-5">
      <Link
        href={NAV_ACTION.href}
        aria-current={actionCourante ? 'page' : undefined}
        onClick={onNavigate}
        className={cn(
          'flex h-control-lg items-center gap-2 rounded-md bg-action px-3 text-sm font-semibold text-on-action no-underline shadow-sm',
          'transition-colors-token hover:bg-action-hover active:bg-action-active focus-ring',
          'aria-[current=page]:bg-action-active',
        )}
      >
        <Action aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.25} />
        <span className="truncate">{t(NAV_ACTION.key)}</span>
      </Link>

      <ul className="flex flex-col gap-0.5">
        {NAV_ENTRIES.map((entry) => (
          <li key={entry.key}>
            <NavItem
              href={entry.href}
              icon={entry.icon}
              label={t(entry.key)}
              current={courante === entry.href}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>

      <div className="mt-auto border-t-w border-line-subtle pt-3">
        <NavItem
          href="/design"
          icon={SwatchBook}
          label={t('design')}
          current={courante === '/design'}
          onNavigate={onNavigate}
        />
      </div>
    </nav>
  )
}
