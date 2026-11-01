import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/*
 * Tuile de mesure : une seule information, lisible de loin.
 *
 * Trois lignes, toujours dans le même ordre : ce qu'on mesure (petites
 * capitales), la valeur (chiffres en Manrope, graisse légère), puis ce
 * qu'elle veut dire. La `meta` à droite du libellé sert à qualifier la
 * mesure (une période, un seuil) — pas à y glisser une seconde valeur.
 *
 * La tonalité teinte la LÉGENDE, jamais le fond ni le nombre : une tuile
 * reste une surface calme, et l'état se lit dans les mots.
 */
export type TonTuile = 'neutre' | 'accent' | 'succes' | 'attente' | 'bloquant'

export interface StatTileProps {
  label: string
  meta?: ReactNode
  value: ReactNode
  /** Unité posée après la valeur, en petit (« sec », « % »). */
  unit?: string
  caption?: ReactNode
  ton?: TonTuile
  className?: string
}

const LEGENDES: Record<TonTuile, string> = {
  neutre: 'text-ink-tertiary',
  accent: 'text-ink-accent',
  succes: 'text-success-ink',
  attente: 'text-warning-ink',
  bloquant: 'text-danger-ink',
}

export function StatTile({
  label,
  meta,
  value,
  unit,
  caption,
  ton = 'neutre',
  className,
}: StatTileProps) {
  return (
    <div
      className={cn(
        'flex min-h-[7.25rem] flex-col rounded-md border-w border-line-default bg-surface-raised px-5 py-4',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-2xs tracking-caps text-ink-tertiary uppercase">{label}</span>
        {meta ? (
          <span className={cn('shrink-0 text-2xs tracking-caps uppercase', LEGENDES[ton])}>
            {meta}
          </span>
        ) : null}
      </div>
      {/* La valeur est poussée en bas : les tuiles d'une rangée gardent la
          même ligne de base, même quand un libellé passe sur deux lignes. */}
      <p className="mt-auto pt-4 font-display text-2xl font-regular tracking-display text-ink-primary">
        {value}
        {unit ? <span className="ml-1.5 text-sm text-ink-tertiary">{unit}</span> : null}
      </p>
      {caption ? <p className={cn('mt-1 text-xs', LEGENDES[ton])}>{caption}</p> : null}
    </div>
  )
}
