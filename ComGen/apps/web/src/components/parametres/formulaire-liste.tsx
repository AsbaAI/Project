'use client'

import { Save } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { actionModifierListe } from '@/app/[locale]/(app)/parametres/actions'
import {
  ETAT_INITIAL,
  cleFormulaire,
  valeurSoumise,
} from '@/app/[locale]/(app)/communications/etat-formulaire'
import { ErreurFormulaire, useErreurDeChamp } from '@/components/communications/erreur-formulaire'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, Textarea } from '@/components/ui/field'
import { Notice } from '@/components/ui/notice'
import { Panel } from '@/components/ui/panel'
import type { ListeParametre } from '@/server/services/parametrage'

/* Une liste de diffusion : une adresse par ligne. Seules les listes statiques s'éditent ici. */
export function FormulaireListe({ liste }: { liste: ListeParametre }) {
  const t = useTranslations('settings.listes')
  const [etat, action, enCours] = useActionState(actionModifierListe, ETAT_INITIAL)
  const erreur = useErreurDeChamp(etat)
  const types = liste.type as 'STATIQUE'

  return (
    <Panel
      title={liste.nom}
      headingLevel={3}
      description={
        liste.personaNom === null ? t('noPersona') : t('persona', { nom: liste.personaNom })
      }
      actions={
        <>
          <Badge tone="neutral">{t(`types.${types}`)}</Badge>
          <Badge tone={liste.effectif === null ? 'warning' : 'success'}>
            {liste.effectif === null ? t('nonResolue') : t('effectif', { count: liste.effectif })}
          </Badge>
        </>
      }
    >
      {liste.editable ? (
        <form key={cleFormulaire(etat)} action={action} className="flex flex-col gap-3" noValidate>
          <input type="hidden" name="listeId" value={liste.id} />
          <ErreurFormulaire etat={etat} />
          {etat.statut === 'ok' ? (
            <Notice key={etat.jeton} level="success" title={t('save')} />
          ) : null}
          <Field
            label={t('destinataires')}
            hint={t('destinatairesHint')}
            error={erreur('destinataires')}
          >
            <Textarea
              name="destinataires"
              rows={Math.min(10, Math.max(3, liste.destinataires.split('\n').length))}
              className="font-mono"
              defaultValue={valeurSoumise(etat, 'destinataires') ?? liste.destinataires}
            />
          </Field>
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
      ) : (
        <p className="text-sm text-ink-secondary">{t('readOnly')}</p>
      )}
    </Panel>
  )
}
