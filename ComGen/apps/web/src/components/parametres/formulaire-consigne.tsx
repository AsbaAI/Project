'use client'

import { Save } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { actionEnregistrerConsigne } from '@/app/[locale]/(app)/parametres/actions'
import {
  ETAT_INITIAL,
  cleFormulaire,
  valeurSoumise,
} from '@/app/[locale]/(app)/communications/etat-formulaire'
import { useErreurDeChamp } from '@/components/communications/erreur-formulaire'
import { Button } from '@/components/ui/button'
import { Field, Textarea } from '@/components/ui/field'
import { Notice } from '@/components/ui/notice'

/*
 * Consigne d'un agent.
 *
 * Le refus du service est montré tel qu'il est : chaque motif dit ce qui,
 * dans la consigne, demande ce que l'application interdit. On ne corrige
 * pas le texte à la place de l'administrateur, et on n'enregistre pas « en
 * partie ».
 */
export interface FormulaireConsigneProps {
  role: string
  consigne: string
  /** Rappel de ce que la consigne fait — et ne fait pas — aujourd'hui. */
  effet: string
}

export function FormulaireConsigne({ role, consigne, effet }: FormulaireConsigneProps) {
  const t = useTranslations('settings.agents.consigne')
  const [etat, action, enCours] = useActionState(actionEnregistrerConsigne, ETAT_INITIAL)
  const erreur = useErreurDeChamp(etat)
  const refus = etat.statut === 'erreur' && etat.code === 'CONSIGNE_REFUSEE'

  return (
    <form
      key={`${role}-${cleFormulaire(etat)}`}
      action={action}
      className="flex flex-col gap-3"
      noValidate
    >
      <input type="hidden" name="role" value={role} />
      {refus ? (
        <Notice key={etat.jeton} level="blocking" title={t('refus')}>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {(etat.motifs ?? []).map((motif) => (
              <li key={motif}>
                {t.has(`motifs.${motif}` as 'motifs.INVENTION')
                  ? t(`motifs.${motif}` as 'motifs.INVENTION')
                  : motif}
              </li>
            ))}
          </ul>
        </Notice>
      ) : null}
      {etat.statut === 'ok' ? <Notice key={etat.jeton} level="success" title={t('save')} /> : null}

      <Field label={t('title')} hint={t('hint')} error={refus ? undefined : erreur('consigne')}>
        <Textarea
          name="consigne"
          rows={10}
          defaultValue={valeurSoumise(etat, 'consigne') ?? consigne}
        />
      </Field>
      <p className="text-xs text-ink-secondary">{effet}</p>
      <div>
        <Button
          type="submit"
          variant="primary"
          loading={enCours}
          icon={<Save aria-hidden="true" />}
        >
          {t('save')}
        </Button>
      </div>
    </form>
  )
}
