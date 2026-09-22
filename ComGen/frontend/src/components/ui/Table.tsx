import type { ReactNode } from 'react'
import styles from './Table.module.css'
import { cx } from '../../lib/cx'

export type SortDirection = 'asc' | 'desc'

export type Column<Row> = {
  /** Identifiant stable de la colonne, utilisé comme clé React et de tri. */
  key: string
  header: ReactNode
  cell: (row: Row) => ReactNode
  /**
   * Aligne la colonne en fin de ligne. À utiliser pour les nombres :
   * un nombre se lit par la droite, unités sous unités.
   */
  align?: 'start' | 'end'
  /** Active les chiffres tabulaires sur la colonne. */
  numeric?: boolean
  /** Largeur fixe (`8rem`, `20%`…). Sinon la colonne se partage l'espace. */
  width?: string
  /** Rend l'en-tête cliquable et annonce l'état de tri. */
  sortable?: boolean
}

export type TableProps<Row> = {
  columns: Column<Row>[]
  rows: Row[]
  /** Clé React de la ligne. Jamais l'index : il change au tri. */
  rowKey: (row: Row) => string
  /**
   * Résumé du tableau pour les lecteurs d'écran. Masqué visuellement :
   * le titre du panneau qui contient le tableau le dit déjà à l'œil.
   */
  caption: string
  /** Colonne triée et sens, quand le tri est piloté par le parent. */
  sort?: { key: string; direction: SortDirection }
  onSortChange?: (key: string) => void
  /** Affiché à la place du corps quand `rows` est vide. */
  empty?: ReactNode
  className?: string
}

function SortIcon({ direction }: { direction?: SortDirection }) {
  return (
    <svg
      className={cx(styles.sortIcon, direction && styles.sortIconActive)}
      viewBox="0 0 12 12"
      aria-hidden="true"
    >
      <path
        d="M6 2.5 L9 6 H3 Z"
        className={cx(direction === 'asc' && styles.sortArrowOn)}
      />
      <path
        d="M6 9.5 L3 6 H9 Z"
        className={cx(direction === 'desc' && styles.sortArrowOn)}
      />
    </svg>
  )
}

export function Table<Row>({
  columns,
  rows,
  rowKey,
  caption,
  sort,
  onSortChange,
  empty,
  className,
}: TableProps<Row>) {
  if (rows.length === 0 && empty) {
    return <div className={cx(styles.empty, className)}>{empty}</div>
  }

  return (
    <div className={cx(styles.scroll, className)}>
      <table className={styles.table}>
        <caption className="visually-hidden">{caption}</caption>

        <colgroup>
          {columns.map((column) => (
            <col
              key={column.key}
              style={column.width ? { inlineSize: column.width } : undefined}
            />
          ))}
        </colgroup>

        <thead className={styles.head}>
          <tr>
            {columns.map((column) => {
              const direction =
                sort?.key === column.key ? sort.direction : undefined

              return (
                <th
                  key={column.key}
                  scope="col"
                  className={cx(
                    styles.th,
                    column.align === 'end' && styles.alignEnd,
                  )}
                  /* `aria-sort` porte l'état de tri ; sans lui, la flèche
                     n'existe que pour ceux qui la voient. */
                  aria-sort={
                    column.sortable
                      ? direction === 'asc'
                        ? 'ascending'
                        : direction === 'desc'
                          ? 'descending'
                          : 'none'
                      : undefined
                  }
                >
                  {column.sortable && onSortChange ? (
                    <button
                      type="button"
                      className={styles.sortButton}
                      onClick={() => onSortChange(column.key)}
                    >
                      <span>{column.header}</span>
                      <SortIcon direction={direction} />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className={styles.row}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cx(
                    styles.td,
                    column.align === 'end' && styles.alignEnd,
                    column.numeric && styles.numeric,
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
