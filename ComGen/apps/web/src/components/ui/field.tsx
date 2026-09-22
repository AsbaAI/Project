'use client'

import { CircleAlert } from 'lucide-react'
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  createContext,
  useContext,
  useId,
  useMemo,
} from 'react'

import { cn } from '@/lib/cn'

/*
 * Champ de formulaire.
 *
 * `Field` porte le libellé, l'aide et l'erreur, et distribue les
 * identifiants à son contrôle par contexte : le contrôle n'a rien à
 * câbler, il reçoit `id`, `aria-describedby`, `aria-invalid` et
 * `aria-required` corrects par construction.
 *
 * Ordre visuel et ordre de lecture : libellé, contrôle, aide, erreur.
 * L'erreur vient après l'aide pour que l'aide reste stable quand l'erreur
 * apparaît — rien ne saute au-dessus du champ.
 */

interface FieldContextValue {
  controlId: string
  hintId: string | undefined
  errorId: string | undefined
  invalid: boolean
  required: boolean
  disabled: boolean
}

const FieldContext = createContext<FieldContextValue | null>(null)

export function useFieldControl(): FieldContextValue | null {
  return useContext(FieldContext)
}

export interface FieldProps {
  /** Identifiant du contrôle (porté par le libellé) ; généré s'il est absent. Se pose ici, pas sur le contrôle. */
  id?: string
  label: ReactNode
  /** Texte explicatif, toujours visible. */
  hint?: ReactNode
  /** Message d'erreur ; sa présence rend le champ invalide. */
  error?: ReactNode
  required?: boolean
  disabled?: boolean
  /** Mention affichée à côté du libellé : « obligatoire » ou « facultatif ». Traduite par l'appelant. */
  requirementLabel?: ReactNode
  className?: string
  children: ReactNode
}

export function Field({
  id: idProp,
  label,
  hint,
  error,
  required = false,
  disabled = false,
  requirementLabel,
  className,
  children,
}: FieldProps) {
  const id = useId()
  const controlId = idProp ?? `${id}-control`
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const invalid = Boolean(error)
  const context = useMemo(
    () => ({ controlId, hintId, errorId, invalid, required, disabled }),
    [controlId, hintId, errorId, invalid, required, disabled],
  )

  return (
    <FieldContext.Provider value={context}>
      <div className={cn('flex flex-col gap-1.5', className)} data-disabled={disabled || undefined}>
        <label
          htmlFor={controlId}
          className={cn(
            'flex items-baseline gap-2 text-sm font-medium text-ink-primary',
            disabled && 'text-ink-disabled',
          )}
        >
          {label}
          {requirementLabel ? (
            <span className="text-xs font-regular text-ink-tertiary">{requirementLabel}</span>
          ) : null}
        </label>
        {children}
        {hint ? (
          <p id={hintId} className="text-xs text-ink-tertiary">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} className="flex items-start gap-1.5 text-xs font-medium text-danger-ink">
            <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  )
}

/** Attributs ARIA dérivés du contexte du champ, fusionnés avec ceux de l'appelant. */
function useControlAttributes(props: {
  id?: string | undefined
  'aria-describedby'?: string | undefined
  disabled?: boolean | undefined
  required?: boolean | undefined
}) {
  const field = useFieldControl()
  if (!field) return props
  const describedBy = [props['aria-describedby'], field.hintId, field.errorId]
    .filter(Boolean)
    .join(' ')
  return {
    // L'identifiant vient toujours du Field : c'est lui que le libellé référence.
    id: field.controlId,
    'aria-describedby': describedBy === '' ? undefined : describedBy,
    'aria-invalid': field.invalid || undefined,
    'aria-required': field.required || undefined,
    disabled: props.disabled ?? field.disabled,
    required: props.required ?? field.required,
  }
}

export const controlClassName = cn(
  'w-full rounded-sm border-w border-line-control bg-surface-raised text-sm text-ink-primary',
  'placeholder:text-ink-tertiary',
  'transition-colors-token',
  'hover:border-line-control-hover',
  'focus-visible:border-line-accent',
  'aria-invalid:border-danger-solid aria-invalid:hover:border-danger-solid',
  'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-disabled disabled:hover:border-line-control',
)

export type InputProps = ComponentPropsWithoutRef<'input'>

export function Input({ className, ...props }: InputProps) {
  const attributes = useControlAttributes(props)
  return (
    <input
      {...props}
      {...attributes}
      className={cn(controlClassName, 'h-control-md px-3', className)}
    />
  )
}

export type TextareaProps = ComponentPropsWithoutRef<'textarea'>

export function Textarea({ className, rows = 3, ...props }: TextareaProps) {
  const attributes = useControlAttributes(props)
  return (
    <textarea
      {...props}
      {...attributes}
      rows={rows}
      className={cn(controlClassName, 'min-h-control-md px-3 py-1.5 leading-[1.5]', className)}
    />
  )
}
