'use client'

import { SendHorizontal } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { actionSoumettreApprobation } from '@/app/[locale]/(app)/communications/actions'
import { ETAT_INITIAL } from '@/app/[locale]/(app)/communications/etat-formulaire'
import { Button } from '@/components/ui/button'

import { ErreurFormulaire } from './erreur-formulaire'

/*
 * Soumission à l'approbation. Le bouton ne décide de rien : le service
 * refuse tout ce qui n'est pas conforme et dit pourquoi (motifs affichés).
 */
export function BoutonSoumettre({ communicationId }: { communicationId: string }) {
  const t = useTranslations('approvals.submit')
  const [etat, action, enCours] = useActionState(actionSoumettreApprobation, ETAT_INITIAL)
  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="communicationId" value={communicationId} />
      <ErreurFormulaire etat={etat} />
      <Button
        type="submit"
        variant="primary"
        loading={enCours}
        icon={<SendHorizontal aria-hidden="true" />}
      >
        {t('action')}
      </Button>
      <p className="text-xs text-ink-tertiary">{t('hint')}</p>
    </form>
  )
}
