'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { actionChangerEtat } from '@/app/[locale]/(app)/communications/actions'
import { ETAT_INITIAL } from '@/app/[locale]/(app)/communications/etat-formulaire'
import { Button } from '@/components/ui/button'
import type { MotifAffiche } from '@/lib/cles-messages'
import type { EtatCibleManuel } from '@/server/services/etat'

import { ErreurFormulaire } from './erreur-formulaire'

/*
 * Une transition manuelle. Sa garde a été évaluée côté serveur au rendu :
 * refusée, le bouton est désactivé et TOUS les motifs sont écrits sous
 * lui. Le serveur réévalue à l'envoi ; l'interface n'est qu'un reflet.
 */
export interface BoutonTransitionProps {
  communicationId: string
  vers: EtatCibleManuel
  autorisee: boolean
  motifs: readonly string[]
  principal?: boolean
}

export function BoutonTransition({
  communicationId,
  vers,
  autorisee,
  motifs,
  principal = false,
}: BoutonTransitionProps) {
  const t = useTranslations('communications')
  const [etat, action, enCours] = useActionState(actionChangerEtat, ETAT_INITIAL)
  const idMotifs = `motifs-${vers}`

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="communicationId" value={communicationId} />
      <input type="hidden" name="vers" value={vers} />
      <ErreurFormulaire etat={etat} />
      <div>
        <Button
          type="submit"
          variant={principal ? 'primary' : vers === 'ARCHIVEE' ? 'ghost' : 'secondary'}
          disabled={!autorisee}
          loading={enCours}
          aria-describedby={autorisee ? undefined : idMotifs}
        >
          {t(`detail.toState.${vers}`)}
        </Button>
      </div>
      {!autorisee && motifs.length > 0 ? (
        <div id={idMotifs} className="text-xs text-ink-secondary">
          <p className="font-medium text-ink-primary">{t('detail.transitions.refused')}</p>
          <ul className="mt-1 list-disc pl-4">
            {motifs.map((motif) => {
              const cle = `motifs.${motif}` as `motifs.${MotifAffiche}`
              return <li key={motif}>{t.has(cle) ? t(cle) : motif}</li>
            })}
          </ul>
        </div>
      ) : null}
    </form>
  )
}
