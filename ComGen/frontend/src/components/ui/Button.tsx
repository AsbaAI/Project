import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import styles from './Button.module.css'
import { cx } from '../../lib/cx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

type BaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Occupe toute la largeur disponible. */
  fullWidth?: boolean
  /**
   * Affiche un indicateur d'activité et neutralise le bouton.
   * Le libellé reste visible : l'utilisateur doit pouvoir relire
   * l'action qu'il vient de déclencher.
   */
  loading?: boolean
  /** Icône placée avant le libellé. */
  iconStart?: ReactNode
  /** Icône placée après le libellé. */
  iconEnd?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

/*
 * Un bouton sans libellé visible DOIT porter un `aria-label` : le type
 * l'impose, il n'est pas possible d'oublier. C'est la façon la plus sûre
 * de tenir une règle d'accessibilité — la faire vérifier par le
 * compilateur plutôt que par une relecture.
 */
type WithLabel = BaseProps & { children: ReactNode; 'aria-label'?: string }
type IconOnly = BaseProps & { children?: never; 'aria-label': string }

export type ButtonProps = WithLabel | IconOnly

export function Button({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  loading = false,
  iconStart,
  iconEnd,
  children,
  className,
  disabled,
  type = 'button',
  ref,
  ...rest
}: ButtonProps) {
  const iconOnly = children === undefined

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      disabled={disabled ?? loading}
      // Annonce l'activité aux technologies d'assistance sans retirer le
      // bouton de l'ordre de tabulation.
      aria-busy={loading || undefined}
      className={cx(
        styles.button,
        styles[variant],
        size !== 'md' && styles[size],
        fullWidth && styles.fullWidth,
        iconOnly && styles.iconOnly,
        loading && styles.loading,
        className,
      )}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {iconStart}
      {!iconOnly && <span className={styles.label}>{children}</span>}
      {iconEnd}
    </button>
  )
}
