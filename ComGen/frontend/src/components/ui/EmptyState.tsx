import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'
import { cx } from '../../lib/cx'

export type EmptyStateProps = {
  title: string
  /** Ce que l'utilisateur peut faire, en une phrase. */
  description?: ReactNode
  /** Illustration discrète. Purement décorative. */
  icon?: ReactNode
  /** L'action qui sort de l'état vide. */
  action?: ReactNode
  className?: string
}

/*
 * État vide
 *
 * Un écran vide est le premier écran que voit un nouvel utilisateur.
 * Il ne dit pas « aucune donnée » : il dit ce qui manque et par où
 * commencer. D'où le couple description + action, et non une simple
 * phrase grise centrée.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cx(styles.empty, className)}>
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
