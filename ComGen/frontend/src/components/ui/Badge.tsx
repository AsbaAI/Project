import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Badge.module.css'
import { cx } from '../../lib/cx'

export type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'accent'

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone
  /**
   * Ajoute une pastille devant le libellé. À réserver aux états d'un
   * même axe (en cours / terminé / en erreur) : c'est la répétition de
   * la forme qui rend la série lisible.
   */
  dot?: boolean
  /** Variante compteur : chiffres tabulaires et largeur stable. */
  count?: boolean
  children: ReactNode
}

const TONES: Record<BadgeTone, string | undefined> = {
  default: undefined,
  success: styles.success,
  warning: styles.warning,
  danger: styles.danger,
  accent: styles.accent,
}

export function Badge({
  tone = 'default',
  dot = false,
  count = false,
  children,
  className,
  ...rest
}: BadgeProps) {
  return (
    <span
      {...rest}
      className={cx(styles.badge, TONES[tone], count && styles.count, className)}
    >
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  )
}
