import type { ReactNode } from 'react'
import styles from './NavItem.module.css'
import { cx } from '../../lib/cx'

export type NavItemProps = {
  label: string
  icon?: ReactNode
  /** Compteur ou pastille, aligné à droite. */
  trailing?: ReactNode
  current?: boolean
  onClick?: () => void
  className?: string
}

/*
 * Entrée de navigation
 *
 * `aria-current="page"` fait l'essentiel du travail : il dit où l'on se
 * trouve à qui ne voit pas la couleur de fond. Le style ne fait que
 * doubler cette information.
 */
export function NavItem({
  label,
  icon,
  trailing,
  current = false,
  onClick,
  className,
}: NavItemProps) {
  return (
    <button
      type="button"
      aria-current={current ? 'page' : undefined}
      onClick={onClick}
      className={cx(styles.item, className)}
    >
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={styles.label}>{label}</span>
      {trailing && <span className={styles.trailing}>{trailing}</span>}
    </button>
  )
}
