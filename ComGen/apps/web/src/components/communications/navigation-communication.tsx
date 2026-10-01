'use client'

import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/cn'

/*
 * Sous-navigation d'une communication : aperçu, entrée, fiche de faits.
 * Des liens, pas des onglets ARIA : chaque vue a son adresse. La vue
 * courante porte `aria-current="page"` et un trait sous le libellé.
 */
export function NavigationCommunication({ id }: { id: string }) {
  const t = useTranslations('communications.navigation')
  const chemin = usePathname()
  const base = `/communications/${id}`
  const vues = [
    { href: base, libelle: t('apercu') },
    { href: `${base}/entree`, libelle: t('entree') },
    { href: `${base}/faits`, libelle: t('faits') },
  ] as const

  return (
    <nav aria-label={t('label')} className="mb-6 border-b-w border-line-default">
      <ul className="flex gap-1 overflow-x-auto">
        {vues.map((vue) => {
          const courante = chemin === vue.href
          return (
            <li key={vue.href}>
              <Link
                href={vue.href}
                aria-current={courante ? 'page' : undefined}
                className={cn(
                  'relative inline-flex h-control-lg items-center px-3 text-sm font-medium whitespace-nowrap',
                  'text-ink-secondary no-underline transition-colors-token focus-ring hover:text-ink-primary',
                  'aria-[current=page]:text-ink-primary',
                  'aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-2 aria-[current=page]:after:bottom-0',
                  'aria-[current=page]:after:h-0.5 aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-action',
                )}
              >
                {vue.libelle}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
