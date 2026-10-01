import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/*
 * Choix exclusif présenté en cartes : de vrais boutons radio natifs, un
 * `fieldset` et sa `legend`. Le clavier (flèches), les lecteurs d'écran et
 * l'envoi du formulaire fonctionnent sans script. L'option choisie se voit
 * à sa bordure, à son fond ET au disque plein du bouton radio.
 */
export interface OptionCarte {
  valeur: string
  libelle: ReactNode
  description?: ReactNode
  /** Mention à droite du libellé (« Pas encore disponible »…). */
  mention?: ReactNode
  desactivee?: boolean
}

export interface ChoixCartesProps {
  nom: string
  legende: ReactNode
  options: readonly OptionCarte[]
  valeurParDefaut?: string | undefined
  erreur?: string | undefined
  colonnes?: 1 | 2 | 3
  requis?: boolean
  mentionRequis?: ReactNode
  /** Note sous les options (choix pas encore proposés…). */
  note?: ReactNode
}

export function ChoixCartes({
  nom,
  legende,
  options,
  valeurParDefaut,
  erreur,
  colonnes = 2,
  requis = false,
  mentionRequis,
  note,
}: ChoixCartesProps) {
  const idErreur = `${nom}-erreur`
  return (
    <fieldset
      className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0"
      aria-describedby={erreur ? idErreur : undefined}
      aria-invalid={erreur ? true : undefined}
    >
      <legend className="mb-1.5 flex items-baseline gap-2 p-0 text-sm font-medium text-ink-primary">
        {legende}
        {mentionRequis ? (
          <span className="text-xs font-regular text-ink-tertiary">{mentionRequis}</span>
        ) : null}
      </legend>
      <div
        className={cn(
          'grid gap-2',
          colonnes === 2 && 'sm:grid-cols-2',
          colonnes === 3 && 'sm:grid-cols-3',
        )}
      >
        {options.map((option) => (
          <label
            key={option.valeur}
            className={cn(
              'flex cursor-pointer items-start gap-2.5 rounded-sm border-w border-line-control bg-surface-raised px-3 py-2.5',
              'transition-colors-token hover:border-line-control-hover',
              'has-checked:border-line-accent has-checked:bg-surface-selected',
              'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-line-accent',
              'has-disabled:cursor-not-allowed has-disabled:bg-surface-sunken has-disabled:hover:border-line-control',
              erreur && 'border-danger-solid',
            )}
          >
            <input
              type="radio"
              name={nom}
              value={option.valeur}
              defaultChecked={option.valeur === valeurParDefaut}
              disabled={option.desactivee}
              required={requis}
              className="mt-0.5 size-4 shrink-0 accent-action"
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium text-ink-primary">
                {option.libelle}
                {option.mention ? (
                  <span className="text-xs font-regular text-ink-secondary">{option.mention}</span>
                ) : null}
              </span>
              {option.description ? (
                <span className="text-xs text-ink-secondary">{option.description}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      {note ? <p className="text-xs text-ink-secondary">{note}</p> : null}
      {erreur ? (
        <p id={idErreur} className="text-xs font-medium text-danger-ink">
          {erreur}
        </p>
      ) : null}
    </fieldset>
  )
}
