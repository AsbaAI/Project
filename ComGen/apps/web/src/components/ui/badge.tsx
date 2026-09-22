import { cva, type VariantProps } from 'class-variance-authority'
import {
  Archive,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleDot,
  Clock,
  type LucideIcon,
  OctagonX,
  TriangleAlert,
} from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/lib/cn'

/*
 * Badge d'état.
 *
 * Chaque tonalité a SA forme d'icône : cercle plein pour le neutre, point
 * pour l'accent, cercle coché pour le succès, triangle pour l'alerte,
 * octogone barré pour l'erreur, horloge pour l'attente, cercle tireté
 * pour le brouillon, boîte pour l'archive. Un daltonien distingue les
 * états à la forme ; la couleur confirme.
 */
const badgeVariants = cva(
  [
    'inline-flex h-5 max-w-full items-center gap-1 rounded-xs border-w px-1.5',
    'text-2xs font-semibold uppercase tracking-caps whitespace-nowrap',
    '[&_svg]:size-3 [&_svg]:shrink-0',
  ],
  {
    variants: {
      tone: {
        draft: 'border-line-default bg-surface-sunken text-ink-secondary',
        neutral: 'border-line-default bg-surface-sunken text-ink-secondary',
        accent: 'border-accent-line bg-accent-bg text-ink-accent',
        pending: 'border-accent-line bg-accent-bg text-ink-accent',
        success: 'border-success-line bg-success-bg text-success-ink',
        warning: 'border-warning-line bg-warning-bg text-warning-ink',
        danger: 'border-danger-line bg-danger-bg text-danger-ink',
        archived: 'border-line-subtle bg-transparent text-ink-tertiary',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>

const ICONS: Record<BadgeTone, LucideIcon> = {
  draft: CircleDashed,
  neutral: Circle,
  accent: CircleDot,
  pending: Clock,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: OctagonX,
  archived: Archive,
}

export interface BadgeProps
  extends ComponentPropsWithoutRef<'span'>, VariantProps<typeof badgeVariants> {}

export function Badge({ tone, className, children, ...props }: BadgeProps) {
  const Icon = ICONS[tone ?? 'neutral']
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      <Icon aria-hidden="true" strokeWidth={2.25} />
      <span className="truncate">{children}</span>
    </span>
  )
}
