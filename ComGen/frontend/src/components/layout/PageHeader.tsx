import type { ReactNode } from 'react'
import styles from './PageHeader.module.css'
import { cx } from '../../lib/cx'

export type PageHeaderProps = {
  title: string
  /** Une phrase qui dit à quoi sert l'écran. */
  description?: ReactNode
  /** Surtitre : famille, section ou fil d'Ariane réduit. */
  eyebrow?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cx(styles.header, className)}>
      <div className={styles.text}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  )
}
