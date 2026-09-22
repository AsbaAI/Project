'use client'

import { Slot, Slottable } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithoutRef, MouseEvent, ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Spinner } from './spinner'

/*
 * Bouton.
 *
 * Quatre intentions, trois tailles. L'intention `primary` est unique par
 * vue : c'est l'action que la vue existe pour permettre. `danger` nomme
 * toujours ce qu'il détruit — jamais un simple « Supprimer ».
 *
 * L'état de chargement conserve le libellé et garde le focus : un bouton
 * qui devient `disabled` pendant qu'il a le focus fait perdre sa place
 * au clavier. On bloque le clic avec `aria-disabled`.
 */
export const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap select-none',
    'font-medium transition-colors-token',
    'focus-ring',
    'disabled:cursor-not-allowed disabled:opacity-60',
    'aria-disabled:cursor-progress',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-action text-on-action',
          'hover:bg-action-hover active:bg-action-active',
          'aria-disabled:hover:bg-action',
        ],
        secondary: [
          'border-w border-line-control bg-surface-raised text-ink-primary',
          'hover:border-line-control-hover hover:bg-surface-hover active:bg-surface-active',
        ],
        ghost: [
          'text-ink-secondary',
          'hover:bg-surface-hover hover:text-ink-primary active:bg-surface-active',
        ],
        danger: [
          'bg-danger-action text-on-danger',
          'hover:bg-danger-action-hover active:bg-danger-action-active',
        ],
      },
      size: {
        sm: 'h-control-sm gap-1.5 rounded-sm px-2.5 text-xs [&_svg]:size-3.5',
        md: 'h-control-md gap-2 rounded-sm px-3 text-sm [&_svg]:size-4',
        lg: 'h-control-lg gap-2 rounded-md px-4 text-base [&_svg]:size-4',
      },
      iconOnly: {
        true: 'px-0',
        false: '',
      },
    },
    compoundVariants: [
      { size: 'sm', iconOnly: true, className: 'w-control-sm' },
      { size: 'md', iconOnly: true, className: 'w-control-md' },
      { size: 'lg', iconOnly: true, className: 'w-control-lg' },
    ],
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
      iconOnly: false,
    },
  },
)

interface ButtonBaseProps
  extends
    ComponentPropsWithoutRef<'button'>,
    Omit<VariantProps<typeof buttonVariants>, 'iconOnly'> {
  /** Rend l'enfant à la place du `<button>` (lien stylé en bouton). */
  asChild?: boolean
  /** Icône avant le libellé. */
  icon?: ReactNode
  /** Action en cours : libellé conservé, indicateur ajouté, clic bloqué. */
  loading?: boolean
}

/**
 * Bouton sans texte visible : l'icône est obligatoire et les enfants forment
 * le libellé, rendu hors écran pour les lecteurs d'écran. Exigé par le type.
 */
type IconOnlyProps = ButtonBaseProps & { iconOnly: true; icon: ReactNode; children: ReactNode }
type LabelledProps = ButtonBaseProps & { iconOnly?: false }

export type ButtonProps = IconOnlyProps | LabelledProps

export function Button({
  className,
  variant,
  size,
  iconOnly = false,
  asChild = false,
  icon,
  loading = false,
  children,
  onClick,
  disabled,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, iconOnly }), className)}
      data-loading={loading ? '' : undefined}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      disabled={disabled}
      type={asChild ? type : (type ?? 'button')}
      onClick={handleClick}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {/* En mode `asChild`, `Slottable` désigne l'élément à habiller (le lien) ;
          l'icône éventuelle est déplacée à l'intérieur de cet élément. */}
      {asChild ? (
        <Slottable>{children}</Slottable>
      ) : iconOnly ? (
        <span className="visually-hidden">{children}</span>
      ) : (
        children
      )}
    </Comp>
  )
}
