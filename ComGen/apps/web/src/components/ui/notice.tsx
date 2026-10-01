import { Info, OctagonX, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/*
 * Message contextuel. Trois niveaux, trois formes :
 *   - info : cercle « i », fond accent, `role="status"` ;
 *   - warning : triangle, fond alerte, `role="status"` ;
 *   - blocking : octogone barré, fond erreur, `role="alert"` — annoncé
 *     immédiatement. Un message bloquant a toujours un titre qui dit CE
 *     QUI bloque et un corps qui dit QUOI FAIRE (§2, « bloquer et
 *     expliquer »).
 */
export type NoticeLevel = 'info' | 'warning' | 'blocking'

export interface NoticeProps {
  level: NoticeLevel
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
}

const STYLES: Record<NoticeLevel, { icon: typeof Info; container: string; iconColor: string }> = {
  info: {
    icon: Info,
    container: 'border-accent-line bg-accent-bg',
    iconColor: 'text-ink-accent',
  },
  warning: {
    icon: TriangleAlert,
    container: 'border-warning-line bg-warning-bg',
    iconColor: 'text-warning-ink',
  },
  blocking: {
    icon: OctagonX,
    container: 'border-danger-line bg-danger-bg',
    iconColor: 'text-danger-ink',
  },
}

export function Notice({ level, title, children, action, className }: NoticeProps) {
  const style = STYLES[level]
  const Icon = style.icon
  return (
    <div
      role={level === 'blocking' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-md border-w px-3.5 py-3 text-sm text-ink-primary',
        style.container,
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn('mt-0.5 size-4 shrink-0', style.iconColor)}
        strokeWidth={2}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-semibold">{title}</p>
        {children ? <div className="max-w-measure text-ink-secondary">{children}</div> : null}
        {action ? <div className="mt-1.5 flex items-center gap-2">{action}</div> : null}
      </div>
    </div>
  )
}
