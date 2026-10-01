import { ArrowRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'

/*
 * Grande carte d'action : une destination, un pictogramme, un titre court,
 * une ligne d'explication. Toute la carte est le lien (une seule cible,
 * nommée par son titre). `primary` met en avant l'action que l'écran
 * existe pour permettre : pastille bleue pleine ; `secondary`, pastille
 * orange claire. La flèche avance au survol, sans mouvement si l'utilisateur
 * le refuse (durées nulles, voir `motion.css`).
 *
 * Différente de `ChoixCartes` : ici on navigue, là on choisit une valeur
 * dans un formulaire.
 */
export interface ActionCardProps {
  href: string
  icon: LucideIcon
  title: ReactNode
  description?: ReactNode
  tone?: 'primary' | 'secondary'
  className?: string
}

export function ActionCard({
  href,
  icon: Icon,
  title,
  description,
  tone = 'secondary',
  className,
}: ActionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex min-w-0 items-start gap-4 rounded-xl border-w bg-surface-raised p-5 no-underline shadow-sm sm:p-6',
        'transition-colors-token focus-ring hover:shadow-md',
        tone === 'primary'
          ? 'border-accent-line hover:border-line-accent'
          : 'border-line-default hover:border-emphasis-line',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-12 shrink-0 items-center justify-center rounded-lg [&_svg]:size-6',
          tone === 'primary'
            ? 'bg-action text-on-action'
            : 'bg-emphasis-bg text-emphasis-ink ring-1 ring-emphasis-line',
        )}
      >
        <Icon strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-lg font-semibold tracking-tight text-ink-primary">{title}</span>
        {description ? <span className="text-sm text-ink-secondary">{description}</span> : null}
      </span>
      <ArrowRight
        aria-hidden="true"
        className="mt-1 size-5 shrink-0 text-ink-tertiary transition-transform duration-fast group-hover:translate-x-1 group-hover:text-ink-accent"
      />
    </Link>
  )
}
