'use client'

import { Check, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { actionDecider } from '@/app/[locale]/(app)/communications/actions'
import {
  ETAT_INITIAL,
  cleFormulaire,
  valeurSoumise,
} from '@/app/[locale]/(app)/communications/etat-formulaire'
import { Button } from '@/components/ui/button'
import { Field, Textarea } from '@/components/ui/field'

import { ErreurFormulaire, useErreurDeChamp } from './erreur-formulaire'

/*
 * Décision d'un approbateur. Deux boutons, une seule action : le bouton
 * pressé porte la décision. Le rejet exige un motif — le service le
 * vérifie, le champ le dit.
 */
export function FormulaireDecision({ communicationId }: { communicationId: string }) {
  const t = useTranslations('approvals.decision')
  const [etat, action, enCours] = useActionState(actionDecider, ETAT_INITIAL)
  const erreur = useErreurDeChamp(etat)
  return (
    <form key={cleFormulaire(etat)} action={action} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="communicationId" value={communicationId} />
      <ErreurFormulaire etat={etat} />
      <Field label={t('motif')} hint={t('motifHint')} error={erreur('commentaire')}>
        <Textarea name="commentaire" rows={2} defaultValue={valeurSoumise(etat, 'commentaire')} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="decision"
          value="REJETEE"
          variant="secondary"
          loading={enCours}
          icon={<X aria-hidden="true" />}
        >
          {t('reject')}
        </Button>
        <Button
          type="submit"
          name="decision"
          value="APPROUVEE"
          variant="primary"
          icon={<Check aria-hidden="true" />}
        >
          {t('approve')}
        </Button>
      </div>
    </form>
  )
}
