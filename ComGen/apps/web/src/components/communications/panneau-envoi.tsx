'use client'

import { Ban, CalendarClock, SendHorizontal } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { actionEnvoi } from '@/app/[locale]/(app)/communications/actions'
import { ETAT_INITIAL } from '@/app/[locale]/(app)/communications/etat-formulaire'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { Panel } from '@/components/ui/panel'
import type { CanalAffiche } from '@/lib/cles-messages'

import { ErreurFormulaire } from './erreur-formulaire'

/*
 * Envoi. L'écran dit toujours ce qu'il en est : tant qu'aucun canal n'est
 * connecté, un envoi est une simulation et le panneau l'annonce. Les
 * boutons n'apparaissent que si le droit d'envoyer est accordé ; c'est le
 * service qui garde la porte.
 */
export interface PanneauEnvoiProps {
  communicationId: string
  etat: 'APPROUVEE' | 'ENVOI_PLANIFIE' | 'ENVOYEE'
  peutEnvoyer: boolean
  envois: readonly {
    canal: string
    effectif: number
    listes: readonly string[]
    envoyeLe: Date | null
    simule: boolean
  }[]
}

export function PanneauEnvoi({ communicationId, etat, peutEnvoyer, envois }: PanneauEnvoiProps) {
  const t = useTranslations('envoi')
  const tc = useTranslations('communications')
  const format = useFormatter()
  const [formEtat, action, enCours] = useActionState(actionEnvoi, ETAT_INITIAL)
  const libelleCanal = (canal: string) => {
    const cle = `canaux.${canal}` as `canaux.${CanalAffiche}`
    return tc.has(cle) ? tc(cle) : canal
  }
  const dernier = envois.find((e) => e.envoyeLe !== null)

  return (
    <Panel title={t('title')}>
      <div className="flex flex-col gap-3">
        {envois.some((e) => e.simule) || envois.length === 0 ? (
          <Notice level="warning" title={t('simulation')} />
        ) : null}
        <p className="text-sm text-ink-secondary">
          {etat === 'APPROUVEE' ? t('approved') : null}
          {etat === 'ENVOI_PLANIFIE' ? t('planned') : null}
          {etat === 'ENVOYEE' && dernier?.envoyeLe
            ? t('sent', {
                date: format.dateTime(dernier.envoyeLe, { dateStyle: 'long', timeStyle: 'short' }),
              })
            : null}
        </p>
        {envois.length > 0 ? (
          <ul className="flex flex-col gap-1 text-xs text-ink-secondary">
            {envois.map((e) => (
              <li key={`${e.canal}-${e.listes.join(',')}`}>
                {t('item', {
                  canal: libelleCanal(e.canal),
                  effectif: e.effectif,
                  listes: e.listes.join(', '),
                })}
              </li>
            ))}
          </ul>
        ) : null}
        <ErreurFormulaire etat={formEtat} />
        {peutEnvoyer && etat !== 'ENVOYEE' ? (
          <form action={action} className="flex flex-wrap gap-2">
            <input type="hidden" name="communicationId" value={communicationId} />
            {etat === 'APPROUVEE' ? (
              <Button
                type="submit"
                name="intention"
                value="planifier"
                variant="primary"
                loading={enCours}
                icon={<CalendarClock aria-hidden="true" />}
              >
                {t('plan')}
              </Button>
            ) : (
              <>
                <Button
                  type="submit"
                  name="intention"
                  value="annuler"
                  variant="secondary"
                  icon={<Ban aria-hidden="true" />}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  name="intention"
                  value="confirmer"
                  variant="primary"
                  loading={enCours}
                  icon={<SendHorizontal aria-hidden="true" />}
                >
                  {t('confirm')}
                </Button>
              </>
            )}
          </form>
        ) : null}
      </div>
    </Panel>
  )
}
