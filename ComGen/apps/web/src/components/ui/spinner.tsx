import { LoaderCircle } from 'lucide-react'

import { cn } from '@/lib/cn'

interface SpinnerProps {
  className?: string
  /** Libellé pour les lecteurs d'écran ; sans libellé, l'icône est décorative. */
  label?: string
}

/**
 * Indicateur d'activité. Toujours accompagné d'un texte visible dans son
 * contexte (bouton, état de chargement) : seul, il n'explique rien.
 */
export function Spinner({ className, label }: SpinnerProps) {
  return (
    <span role={label ? 'status' : undefined} className={cn('inline-flex', className)}>
      <LoaderCircle aria-hidden="true" className="spinner size-[1em]" strokeWidth={2} />
      {label ? <span className="visually-hidden">{label}</span> : null}
    </span>
  )
}
