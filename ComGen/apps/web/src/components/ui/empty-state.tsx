import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/*
 * État vide. Dit ce qui manque et ce qu'on peut faire ; jamais une
 * illustration décorative seule. Le titre est un `<h2>` par défaut parce
 * qu'il remplace le contenu d'une vue ; `headingLevel` s'ajuste dans un
 * panneau.
 */
export interface EmptyStateProps {
  icon: LucideIcon
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  headingLevel?: 2 | 3 | 4
  /** Tonalité : `error` pour un état vide dû à un échec. */
  tone?: 'neutral' | 'error'
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  headingLevel = 2,
  tone = 'neutral',
  className,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      <div
        className={cn(
          'flex size-10 items-center justify-center rounded-md border-w',
          tone === 'error'
            ? 'border-danger-line bg-danger-bg text-danger-ink'
            : 'border-line-subtle bg-surface-sunken text-ink-tertiary',
        )}
      >
        <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
      </div>
      <div className="flex max-w-measure flex-col gap-1">
        <Heading className="text-base font-semibold tracking-snug text-ink-primary">
          {title}
        </Heading>
        {description ? <p className="text-sm text-ink-secondary">{description}</p> : null}
      </div>
      {action ? <div className="mt-1 flex items-center gap-2">{action}</div> : null}
    </div>
  )
}
