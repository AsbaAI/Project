/* oxlint-disable jsx-a11y/label-has-associated-control -- le libellé enveloppe sa case ET son texte ; la règle ne traverse pas les éléments imbriqués (vérifié par axe-core sur l'écran rendu) */
import { Filter } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Link } from '@/i18n/navigation'

/*
 * Filtres de la liste. Formulaire natif en GET : les filtres sont dans
 * l'adresse, donc partageables et rejouables, et l'écran fonctionne sans
 * script. Chaque soumission repart de la première page.
 */
export interface FiltresTicketsProps {
  /** Chemin de l'écran, sans paramètres : cible du formulaire. */
  action: string
  statuts: readonly string[]
  priorites: readonly string[]
  groupe: string
  du: string
  au: string
  /** Adresse du même écran sans aucun filtre. */
  lienReinitialiser: string
}

const STATUTS = ['NOUVEAU', 'EN_COURS', 'EN_ATTENTE', 'RESOLU', 'CLOS', 'ANNULE'] as const
const PRIORITES = ['1', '2', '3', '4', '5'] as const

export function FiltresTickets({
  action,
  statuts,
  priorites,
  groupe,
  du,
  au,
  lienReinitialiser,
}: FiltresTicketsProps) {
  const t = useTranslations('itsm')

  return (
    <form method="get" action={action} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-ink-primary">
          {t('picker.filters.statut')}
        </legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {STATUTS.map((statut) => (
            <label key={statut} className="flex items-center gap-2 text-sm text-ink-primary">
              <input
                type="checkbox"
                name="statuts"
                value={statut}
                defaultChecked={statuts.includes(statut)}
                className="size-4 shrink-0 accent-[var(--color-action)] focus-ring"
              />
              <span>{t(`statuts.${statut}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-ink-primary">
          {t('picker.filters.priorite')}
        </legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {PRIORITES.map((priorite) => (
            <label key={priorite} className="flex items-center gap-2 text-sm text-ink-primary">
              <input
                type="checkbox"
                name="priorites"
                value={priorite}
                defaultChecked={priorites.includes(priorite)}
                className="size-4 shrink-0 accent-[var(--color-action)] focus-ring"
              />
              <span>{t(`priorites.${priorite}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t('picker.filters.groupe')}>
          <Input name="groupe" maxLength={100} defaultValue={groupe} />
        </Field>
        <Field label={t('picker.filters.du')}>
          <Input name="du" type="date" defaultValue={du} />
        </Field>
        <Field label={t('picker.filters.au')}>
          <Input name="au" type="date" defaultValue={au} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="secondary" icon={<Filter aria-hidden="true" />}>
          {t('picker.filters.submit')}
        </Button>
        <Button asChild variant="ghost">
          <Link href={lienReinitialiser}>{t('picker.filters.reset')}</Link>
        </Button>
      </div>
    </form>
  )
}
