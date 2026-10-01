'use client'

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- `<progress>` natif écarté :
   ses pseudo-éléments de rendu diffèrent par moteur et n'acceptent pas les
   jetons de façon fiable. Le rôle ARIA porte exactement la même sémantique. */

import { useId } from 'react'

import { cn } from '@/lib/cn'

/*
 * Barre de progression. Le libellé et la valeur sont obligatoires : une
 * barre seule n'est pas lisible par un lecteur d'écran, et un pourcentage
 * sans libellé ne dit pas de quoi.
 */
export interface ProgressProps {
  label: string
  /** Texte de la valeur, déjà formaté et traduit (« 2 sur 3 »). */
  valueText: string
  value: number
  max: number
  tone?: 'accent' | 'success' | 'danger'
  className?: string
}

export function Progress({
  label,
  valueText,
  value,
  max,
  tone = 'accent',
  className,
}: ProgressProps) {
  const id = useId()
  const ratio = max <= 0 ? 0 : Math.min(1, Math.max(0, value / max))

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span id={id} className="font-medium text-ink-primary">
          {label}
        </span>
        <span className="tnum text-ink-secondary">{valueText}</span>
      </div>
      <div
        role="progressbar"
        aria-labelledby={id}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText}
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken border-w border-line-subtle"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-slow ease-out',
            tone === 'accent' && 'bg-action',
            tone === 'success' && 'bg-success-solid',
            tone === 'danger' && 'bg-danger-solid',
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  )
}
