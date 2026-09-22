import { useId } from 'react'
import type { ReactNode } from 'react'
import styles from './Progress.module.css'
import { cx } from '../../lib/cx'

export type ProgressProps = {
  /** Valeur courante, entre 0 et `max`. Omise, la barre est indéterminée. */
  value?: number
  max?: number
  /** Libellé visible au-dessus de la barre. */
  label: ReactNode
  /**
   * Texte annoncé à la place du pourcentage — « 3 documents sur 8 »
   * est plus utile que « 38 % ».
   */
  valueText?: string
  /** Masque le libellé visuellement, sans le retirer aux lecteurs d'écran. */
  hideLabel?: boolean
  tone?: 'accent' | 'success' | 'danger'
  className?: string
}

export function Progress({
  value,
  max = 100,
  label,
  valueText,
  hideLabel = false,
  tone = 'accent',
  className,
}: ProgressProps) {
  const labelId = useId()
  const indeterminate = value === undefined
  const ratio = indeterminate ? 0 : Math.min(Math.max(value / max, 0), 1)
  const percent = Math.round(ratio * 100)

  return (
    <div className={cx(styles.wrapper, className)}>
      <div className={cx(styles.header, hideLabel && 'visually-hidden')}>
        <span className={styles.label} id={labelId}>
          {label}
        </span>
        {!indeterminate && (
          <span className={styles.value}>{valueText ?? `${percent} %`}</span>
        )}
      </div>

      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={max}
        /* Une barre indéterminée n'annonce pas de valeur : `aria-valuenow`
           absent est ce qui signale « en cours, durée inconnue ». */
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuetext={indeterminate ? undefined : valueText}
        className={cx(
          styles.track,
          styles[tone],
          indeterminate && styles.indeterminate,
        )}
      >
        <div
          className={styles.fill}
          style={indeterminate ? undefined : { inlineSize: `${percent}%` }}
        />
      </div>
    </div>
  )
}
