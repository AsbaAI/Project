'use client'

import { useTranslations } from 'next-intl'

import { NAV_ENTRIES } from '@/lib/navigation'

import { NavItem } from './nav-item'

/*
 * Liste de navigation partagée par la barre latérale (bureau) et le
 * tiroir (téléphone). Composant client : il passe des icônes (fonctions)
 * et un rappel de fermeture à ses entrées, ce qu'un composant serveur ne
 * peut pas sérialiser.
 */
export function MainNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('nav')
  return (
    <nav aria-label={t('label')}>
      <ul className="flex flex-col gap-0.5">
        {NAV_ENTRIES.map((entry) => (
          <li key={entry.key}>
            <NavItem
              href={entry.href}
              icon={entry.icon}
              label={t(entry.key)}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </nav>
  )
}
