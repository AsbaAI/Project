'use client'

import type { LucideIcon } from 'lucide-react'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/cn'

/*
 * Entrée de navigation. La page courante est marquée par `aria-current`
 * — le style s'y accroche, pas l'inverse — et par une barre latérale de
 * 2px en plus de la couleur du texte.
 */
export interface NavItemProps {
  href: '/' | '/design'
  icon: LucideIcon
  label: string
  onNavigate?: (() => void) | undefined
}

export function NavItem({ href, icon: Icon, label, onNavigate }: NavItemProps) {
  const pathname = usePathname()
  const current = href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      onClick={onNavigate}
      className={cn(
        'relative flex h-control-lg items-center gap-2.5 rounded-sm px-2.5 text-sm font-medium no-underline',
        'text-ink-secondary transition-colors-token focus-ring',
        'hover:bg-surface-hover hover:text-ink-primary',
        'aria-[current=page]:bg-surface-selected aria-[current=page]:text-ink-accent',
        'aria-[current=page]:before:absolute aria-[current=page]:before:inset-y-2 aria-[current=page]:before:-left-2',
        'aria-[current=page]:before:w-0.5 aria-[current=page]:before:rounded-full aria-[current=page]:before:bg-action',
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
      <span className="truncate">{label}</span>
    </Link>
  )
}
