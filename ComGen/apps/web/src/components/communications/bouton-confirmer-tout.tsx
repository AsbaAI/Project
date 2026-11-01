'use client'

import { CheckCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { actionConfirmerTousLesFaits } from '@/app/[locale]/(app)/communications/actions'
import { ETAT_INITIAL } from '@/app/[locale]/(app)/communications/etat-formulaire'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'

import { ErreurFormulaire } from './erreur-formulaire'

/*
 * Confirmer d'un coup les faits encore à revoir.
 *
 * Le bouton annonce COMBIEN de faits il confirme, et n'apparaît pas quand
 * il n'y en a aucun. Il ne promet jamais « tout » : les faits pris dans
 * une contradiction restent à trancher un par un, et le bilan renvoyé par
 * le serveur le dit en toutes lettres.
 */
export interface BoutonConfirmerToutProps {
  communicationId: string
  /** Faits proposés hors contradiction : ce que le bouton confirmera. */
  confirmables: number
}

export function BoutonConfirmerTout({ communicationId, confirmables }: BoutonConfirmerToutProps) {
  const t = useTranslations('communications.fiche.tout')
  const [etat, action, enCours] = useActionState(actionConfirmerTousLesFaits, ETAT_INITIAL)

  return (
    <div className="flex flex-col gap-2">
      <ErreurFormulaire etat={etat} />
      {etat.statut === 'bilan' ? (
        <Notice
          key={etat.jeton}
          level={etat.laisses > 0 ? 'warning' : 'success'}
          title={t('bilan', { count: etat.confirmes })}
        >
          {etat.laisses > 0 ? t('laisses', { count: etat.laisses }) : null}
        </Notice>
      ) : null}
      {confirmables > 0 ? (
        <form action={action} className="flex flex-col items-start gap-1.5">
          <input type="hidden" name="communicationId" value={communicationId} />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            loading={enCours}
            icon={<CheckCheck aria-hidden="true" />}
          >
            {t('action', { count: confirmables })}
          </Button>
          <p className="text-xs text-ink-tertiary">{t('aide')}</p>
        </form>
      ) : null}
    </div>
  )
}
