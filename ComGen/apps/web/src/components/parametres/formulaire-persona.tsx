/* oxlint-disable jsx-a11y/label-has-associated-control -- le libellé enveloppe sa case ET son texte ; la règle ne traverse pas les éléments imbriqués (vérifié par axe-core sur l'écran rendu) */
'use client'

import { Save } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { actionModifierPersona } from '@/app/[locale]/(app)/parametres/actions'
import {
  ETAT_INITIAL,
  cleFormulaire,
  valeurSoumise,
} from '@/app/[locale]/(app)/communications/etat-formulaire'
import { ErreurFormulaire, useErreurDeChamp } from '@/components/communications/erreur-formulaire'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Notice } from '@/components/ui/notice'
import { Panel } from '@/components/ui/panel'
import { CANAUX, NIVEAUX } from '@comgen/core'
import type { CanalAffiche } from '@/lib/cles-messages'
import type { Approbateur, PersonaParametre } from '@/server/services/parametrage'

/*
 * Réglages d'un persona. Le formulaire envoie des lignes de texte ; c'est
 * le service qui valide et qui garde ce que l'écran ne montre pas (voix,
 * exemples, préférences de lexique).
 */
export function FormulairePersona({
  persona,
  approbateurs,
}: {
  persona: PersonaParametre
  approbateurs: readonly Approbateur[]
}) {
  const t = useTranslations('settings.personas')
  const tc = useTranslations('communications')
  const [etat, action, enCours] = useActionState(actionModifierPersona, ETAT_INITIAL)
  const erreur = useErreurDeChamp(etat)
  const repris = (champ: string, defaut: string) => valeurSoumise(etat, champ) ?? defaut
  const soumis = etat.statut === 'erreur'

  return (
    <Panel title={persona.nom} headingLevel={3}>
      <form key={cleFormulaire(etat)} action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="personaId" value={persona.id} />
        <ErreurFormulaire etat={etat} />
        {etat.statut === 'ok' ? (
          <Notice key={etat.jeton} level="success" title={t('saved')} />
        ) : null}
        {persona.gardeFousLisibles ? null : <Notice level="blocking" title={t('illisible')} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('fields.nom')} error={erreur('nom')} required>
            <Input name="nom" maxLength={100} defaultValue={repris('nom', persona.nom)} />
          </Field>
          <Field label={t('fields.canal')} error={erreur('canalDefaut')}>
            <Select name="canalDefaut" defaultValue={repris('canalDefaut', persona.canalDefaut)}>
              {CANAUX.map((canal) => (
                <option key={canal} value={canal}>
                  {tc(`canaux.${canal}` as `canaux.${CanalAffiche}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('fields.interditsFr')}
            hint={t('fields.listHint')}
            error={erreur('interditsFr')}
          >
            <Textarea
              name="interditsFr"
              rows={3}
              defaultValue={repris('interditsFr', persona.interditsFr.join('\n'))}
            />
          </Field>
          <Field
            label={t('fields.interditsEn')}
            hint={t('fields.listHint')}
            error={erreur('interditsEn')}
          >
            <Textarea
              name="interditsEn"
              rows={3}
              defaultValue={repris('interditsEn', persona.interditsEn.join('\n'))}
            />
          </Field>
        </div>

        <Field
          label={t('fields.sujets')}
          hint={t('fields.sujetsHint')}
          error={erreur('sujetsInterdits')}
        >
          <Textarea
            name="sujetsInterdits"
            rows={2}
            defaultValue={repris('sujetsInterdits', persona.sujetsInterdits.join('\n'))}
          />
        </Field>

        <Field
          label={t('fields.max')}
          hint={t('fields.maxHint')}
          error={erreur('confidentialiteMax')}
        >
          <Select
            name="confidentialiteMax"
            defaultValue={repris('confidentialiteMax', persona.confidentialiteMax)}
            className="sm:max-w-xs"
          >
            {NIVEAUX.map((niveau) => (
              <option key={niveau} value={niveau}>
                {tc(`niveaux.${niveau}`)}
              </option>
            ))}
          </Select>
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-ink-primary">
            {t('fields.approbateurs')}
          </legend>
          <p className="text-xs text-ink-secondary">{t('fields.approbateursHint')}</p>
          {erreur('approbateurIds') ? (
            <p className="text-xs text-danger-ink">{erreur('approbateurIds')}</p>
          ) : null}
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {approbateurs.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm text-ink-primary">
                <input
                  type="checkbox"
                  name="approbateurIds"
                  value={a.id}
                  defaultChecked={soumis ? false : persona.approbateurIds.includes(a.id)}
                  className="size-4 shrink-0 accent-[var(--color-action)] focus-ring"
                />
                <span>{a.nom}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-ink-primary">
          <input
            type="checkbox"
            name="actif"
            value="1"
            defaultChecked={soumis ? valeurSoumise(etat, 'actif') !== undefined : persona.actif}
            className="size-4 shrink-0 accent-[var(--color-action)] focus-ring"
          />
          <span>{t('fields.actif')}</span>
        </label>

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
    </Panel>
  )
}
