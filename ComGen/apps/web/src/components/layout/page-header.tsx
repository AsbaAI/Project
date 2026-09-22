import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/*
 * En-tête de page : un seul `<h1>` par page, une description d'une ou
 * deux phrases limitée à la mesure de lecture, et les actions de la page
 * alignées à droite (l'action principale en dernier, donc la plus à
 * droite, donc la première atteinte depuis la fin au clavier inversé).
 */
export interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn('mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3', className)}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-ink-primary">{title}</h1>
        {description ? (
          <p className="max-w-measure text-sm text-ink-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}
