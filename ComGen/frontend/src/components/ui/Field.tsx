import { useId } from 'react'
import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import styles from './Field.module.css'
import { cx } from '../../lib/cx'

type FieldShellProps = {
  label: string
  /** Texte d'aide permanent, sous le champ. */
  hint?: string
  /** Message d'erreur. Sa présence suffit à marquer le champ invalide. */
  error?: string
  required?: boolean
  /**
   * Affiche la mention « facultatif ». À préférer à l'astérisque quand
   * la majorité des champs d'un formulaire sont obligatoires : marquer
   * l'exception est plus lisible que marquer la règle.
   */
  optional?: boolean
  className?: string
}

/*
 * Câblage d'accessibilité mutualisé.
 *
 * Retourne les attributs à poser sur le contrôle pour que le libellé,
 * l'aide et l'erreur lui soient réellement rattachés. Centraliser ce
 * calcul évite la panoplie habituelle de `aria-describedby` oubliés.
 */
function useFieldWiring(hint?: string, error?: string) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') ||
    undefined

  return {
    id,
    hintId,
    errorId,
    controlProps: {
      id,
      'aria-describedby': describedBy,
      'aria-invalid': error ? (true as const) : undefined,
    },
  }
}

function ErrorIcon() {
  return (
    <svg className={styles.errorIcon} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 5v3.5" strokeLinecap="round" />
      <path d="M8 11h.01" strokeLinecap="round" />
    </svg>
  )
}

function FieldShell({
  label,
  hint,
  error,
  required,
  optional,
  className,
  id,
  hintId,
  errorId,
  children,
}: FieldShellProps & {
  id: string
  hintId: string
  errorId: string
  children: ReactNode
}) {
  return (
    <div className={cx(styles.field, className)}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={id}>
          {label}
          {required && (
            <>
              <span className={styles.required} aria-hidden="true">
                *
              </span>
              <span className="visually-hidden"> (requis)</span>
            </>
          )}
        </label>
        {optional && !required && (
          <span className={styles.optional}>facultatif</span>
        )}
      </div>

      {children}

      {/* L'erreur passe avant l'aide : c'est ce que l'utilisateur doit
          lire en premier quand les deux sont présentes. */}
      {error && (
        <p className={styles.error} id={errorId} role="alert">
          <ErrorIcon />
          <span>{error}</span>
        </p>
      )}
      {hint && !error && (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

export type TextFieldProps = FieldShellProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'required'> & {
    ref?: Ref<HTMLInputElement>
  }

export function TextField({
  label,
  hint,
  error,
  required,
  optional,
  className,
  ref,
  ...rest
}: TextFieldProps) {
  const { id, hintId, errorId, controlProps } = useFieldWiring(hint, error)

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
      className={className}
      id={id}
      hintId={hintId}
      errorId={errorId}
    >
      <input
        {...rest}
        {...controlProps}
        ref={ref}
        required={required}
        className={styles.control}
      />
    </FieldShell>
  )
}

/* ------------------------------------------------------------------ */

export type TextAreaFieldProps = FieldShellProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'required'> & {
    ref?: Ref<HTMLTextAreaElement>
  }

export function TextAreaField({
  label,
  hint,
  error,
  required,
  optional,
  className,
  ref,
  ...rest
}: TextAreaFieldProps) {
  const { id, hintId, errorId, controlProps } = useFieldWiring(hint, error)

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
      className={className}
      id={id}
      hintId={hintId}
      errorId={errorId}
    >
      <textarea
        {...rest}
        {...controlProps}
        ref={ref}
        required={required}
        className={cx(styles.control, styles.textarea)}
      />
    </FieldShell>
  )
}

/* ------------------------------------------------------------------ */

export type SelectFieldProps = FieldShellProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'required'> & {
    ref?: Ref<HTMLSelectElement>
    children: ReactNode
  }

export function SelectField({
  label,
  hint,
  error,
  required,
  optional,
  className,
  children,
  ref,
  ...rest
}: SelectFieldProps) {
  const { id, hintId, errorId, controlProps } = useFieldWiring(hint, error)

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
      className={className}
      id={id}
      hintId={hintId}
      errorId={errorId}
    >
      <select
        {...rest}
        {...controlProps}
        ref={ref}
        required={required}
        className={cx(styles.control, styles.select)}
      >
        {children}
      </select>
    </FieldShell>
  )
}
