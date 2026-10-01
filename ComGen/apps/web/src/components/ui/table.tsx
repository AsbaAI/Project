'use client'

import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/lib/cn'

/*
 * Tableau. Bord à bord dans son conteneur défilant ; les nombres sont
 * alignés à droite en chiffres tabulaires. Le tri est annoncé par
 * `aria-sort` sur l'en-tête, jamais par la seule icône.
 */

export function Table({ className, ...props }: ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn('w-full border-collapse text-sm text-ink-primary', className)}
        {...props}
      />
    </div>
  )
}

export function TableHead({ className, ...props }: ComponentPropsWithoutRef<'thead'>) {
  return <thead className={cn('bg-surface-sunken', className)} {...props} />
}

export function TableBody({ className, ...props }: ComponentPropsWithoutRef<'tbody'>) {
  return (
    <tbody className={cn('[&_tr]:border-t-w [&_tr]:border-line-subtle', className)} {...props} />
  )
}

export interface TableRowProps extends ComponentPropsWithoutRef<'tr'> {
  /** Ligne sélectionnable : survol marqué, curseur main. */
  interactive?: boolean
  selected?: boolean
}

export function TableRow({ className, interactive, selected, ...props }: TableRowProps) {
  return (
    <tr
      aria-selected={selected}
      className={cn(
        'transition-colors-token',
        interactive && 'cursor-pointer hover:bg-surface-hover',
        selected && 'bg-surface-selected',
        className,
      )}
      {...props}
    />
  )
}

export type SortDirection = 'ascending' | 'descending' | 'none'

export interface TableHeaderCellProps extends Omit<ComponentPropsWithoutRef<'th'>, 'align'> {
  align?: 'start' | 'end'
  /** Si défini, l'en-tête est triable et annonce sa direction. */
  sort?: SortDirection
  onSort?: () => void
}

const SORT_ICONS = {
  ascending: ChevronUp,
  descending: ChevronDown,
  none: ChevronsUpDown,
} as const

export function TableHeaderCell({
  align = 'start',
  sort,
  onSort,
  className,
  children,
  ...props
}: TableHeaderCellProps) {
  const sortable = sort !== undefined
  const SortIcon = sortable ? SORT_ICONS[sort] : null
  return (
    <th
      scope="col"
      aria-sort={sortable && sort !== 'none' ? sort : undefined}
      className={cn(
        'h-9 px-3 text-xs font-semibold text-ink-secondary',
        align === 'end' ? 'text-end' : 'text-start',
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            '-mx-1.5 inline-flex h-7 items-center gap-1 rounded-xs px-1.5 transition-colors-token',
            'hover:bg-surface-hover hover:text-ink-primary focus-ring',
            sort !== 'none' && 'text-ink-primary',
            align === 'end' && 'flex-row-reverse',
          )}
        >
          {children}
          {SortIcon ? <SortIcon aria-hidden="true" className="size-3.5" /> : null}
        </button>
      ) : (
        children
      )}
    </th>
  )
}

export interface TableCellProps extends Omit<ComponentPropsWithoutRef<'td'>, 'align'> {
  align?: 'start' | 'end'
  /** Nombre : aligné à droite, chiffres tabulaires. */
  numeric?: boolean
  /** Cellule de référence (identifiant, version) : chasse fixe. */
  mono?: boolean
}

export function TableCell({ align, numeric, mono, className, ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        'h-10 px-3 align-middle',
        (align === 'end' || numeric) && 'text-end tnum',
        mono && 'font-mono text-xs',
        className,
      )}
      {...props}
    />
  )
}
