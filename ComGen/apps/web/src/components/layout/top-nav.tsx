'use client'

import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import { NAV_TABS, ongletCourant } from '@/lib/navigation'

/*
 * Onglets de la barre supérieure, sur fond marine.
 *
 * L'onglet courant est marqué par `aria-current="page"` — le style s'y
 * accroche — et par un filet de 2px sous le libellé en plus de sa surface :
 * la couleur n'est jamais le seul signal. Quel onglet est courant se décide
 * une fois pour toute la barre (`ongletCourant`), pas onglet par onglet.
 *
 * Masqué sous `lg` : en deçà, c'est le tiroir (`MobileNav`) qui porte les
 * mêmes entrées, depuis la même liste.
 *
 * Les pictogrammes n'arrivent qu'à `2xl`. Six onglets, la marque, l'état du
 * moteur, la langue, le thème et le compte ne tiennent pas ensemble en
 * dessous : il faut alors sacrifier quelque chose, et une icône qui double
 * un libellé se sacrifie avant une information. Les largeurs sont mesurées,
 * pas estimées — le test « la barre ne se chevauche jamais » les tient.
 */
export function TopNav({ className }: { className?: string }) {
  const t = useTranslations('nav')
  const courant = ongletCourant(usePathname())

  return (
    // `data-barre` nomme les boîtes dont la barre garantit qu'elles ne se
    // chevauchent jamais ; c'est ce que mesure le test de la barre.
    <nav data-barre="onglets" aria-label={t('label')} className={cn('hidden lg:block', className)}>
      <ul className="flex items-center gap-0.5 2xl:gap-1">
        {NAV_TABS.map((onglet) => {
          const Icon = onglet.icon
          const actif = courant === onglet.href
          return (
            <li key={onglet.key}>
              <Link
                href={onglet.href}
                aria-current={actif ? 'page' : undefined}
                className={cn(
                  'relative flex h-control-lg items-center gap-2 rounded-sm px-2 text-sm font-medium no-underline 2xl:px-3',
                  'text-nav-ink-muted transition-colors-token focus-ring',
                  'hover:bg-nav-hover hover:text-nav-ink',
                  'aria-[current=page]:bg-nav-selected aria-[current=page]:font-semibold aria-[current=page]:text-nav-ink',
                  'aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-2 aria-[current=page]:after:-bottom-px 2xl:aria-[current=page]:after:inset-x-3',
                  'aria-[current=page]:after:h-0.5 aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-nav-ink',
                )}
              >
                <Icon
                  aria-hidden="true"
                  className="hidden size-4 shrink-0 2xl:block"
                  strokeWidth={1.75}
                />
                <span className="whitespace-nowrap">{t(onglet.key)}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
