import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Panel.module.css'
import { cx } from '../../lib/cx'

export type PanelProps = HTMLAttributes<HTMLElement> & {
  title?: ReactNode
  subtitle?: ReactNode
  /** Actions alignées à droite de l'en-tête. */
  actions?: ReactNode
  /** Contenu du pied, aligné à droite. */
  footer?: ReactNode
  /**
   * Supprime le rembourrage du corps, pour un contenu qui doit toucher
   * les bords : tableau, liste, éditeur.
   */
  flush?: boolean
  children: ReactNode
}

export function Panel({
  title,
  subtitle,
  actions,
  footer,
  flush = false,
  children,
  className,
  ...rest
}: PanelProps) {
  return (
    <section {...rest} className={cx(styles.panel, className)}>
      {(title || actions) && (
        <header className={styles.header}>
          <div className={styles.headings}>
            {title && <h2 className={styles.title}>{title}</h2>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}

      <div className={cx(styles.body, flush && styles.bodyFlush)}>
        {children}
      </div>

      {footer && <footer className={styles.footer}>{footer}</footer>}
    </section>
  )
}
