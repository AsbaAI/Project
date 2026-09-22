import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { cn } from '@/lib/cn'

/*
 * Panneau : le conteneur de base des vues. Séparé du fond par une bordure,
 * jamais par une ombre (voir tokens/shape.css). L'en-tête est facultatif ;
 * quand il est présent, le titre est un `<h2>` par défaut — le niveau se
 * surcharge quand le panneau est imbriqué.
 */

export interface PanelProps extends Omit<ComponentPropsWithoutRef<'section'>, 'title'> {
  title?: ReactNode
  description?: ReactNode
  /** Actions alignées à droite de l'en-tête. */
  actions?: ReactNode
  headingLevel?: 2 | 3 | 4
  /** Retire le rembourrage du corps (tableaux, listes bord à bord). */
  flush?: boolean
  footer?: ReactNode
}

export function Panel({
  title,
  description,
  actions,
  headingLevel = 2,
  flush = false,
  footer,
  className,
  children,
  ...props
}: PanelProps) {
  const Heading = `h${headingLevel}` as const
  const hasHeader = Boolean(title || description || actions)

  return (
    <section
      className={cn(
        'flex flex-col overflow-hidden rounded-md border-w border-line-default bg-surface-raised',
        className,
      )}
      {...props}
    >
      {hasHeader ? (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b-w border-line-subtle px-4 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            {title ? (
              <Heading className="text-base font-semibold tracking-snug text-ink-primary">
                {title}
              </Heading>
            ) : null}
            {description ? <p className="text-sm text-ink-secondary">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn('flex-1', !flush && 'p-4')}>{children}</div>
      {footer ? (
        <footer className="border-t-w border-line-subtle bg-surface-base px-4 py-3">
          {footer}
        </footer>
      ) : null}
    </section>
  )
}
