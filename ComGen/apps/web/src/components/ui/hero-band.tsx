import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Constellation } from './constellation'

/*
 * Bandeau d'accueil : la seule grande surface teintée de l'application.
 *
 * Il porte une phrase, pas un indicateur : rien de ce qui s'y lit ne
 * dépend de données: ni compteur, ni état, ni horodatage. Les pastilles
 * disent ce que l'application garantit, pas ce qu'elle est en train de
 * faire — un bandeau ne doit jamais devenir un tableau de bord qui
 * s'ignore.
 *
 * Il reste secondaire : il ne dépasse pas 15rem de haut et cède la place
 * aux contrôles dès que la fenêtre se resserre (la constellation
 * disparaît la première).
 */
export interface HeroBandProps {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  /** Mentions courtes, factuelles, sans valeur chiffrée. */
  chips?: readonly string[]
  className?: string
}

export function HeroBand({ eyebrow, title, description, chips, className }: HeroBandProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-lg border-w border-accent-line bg-brand-wash',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] text-ink-accent md:block"
      >
        <Constellation />
      </div>
      <div className="relative flex max-w-measure flex-col gap-3 px-7 py-7 md:px-9 md:py-9">
        <span className="text-2xs font-semibold tracking-caps text-ink-accent uppercase">
          {eyebrow}
        </span>
        <h2 className="max-w-[28ch] font-display text-xl font-regular tracking-display text-ink-primary md:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="max-w-[56ch] text-sm leading-relaxed text-ink-secondary">{description}</p>
        ) : null}
        {chips && chips.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <li
                key={chip}
                className="rounded-full border-w border-accent-line bg-surface-raised/70 px-3 py-1.5 text-2xs text-ink-secondary"
              >
                {chip}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  )
}
