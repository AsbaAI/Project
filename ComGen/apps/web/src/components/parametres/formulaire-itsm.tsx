/* oxlint-disable jsx-a11y/label-has-associated-control -- le libellé enveloppe sa case ET son texte ; la règle ne traverse pas les éléments imbriqués (vérifié par axe-core sur l'écran rendu) */
'use client'

import { PlugZap, Save } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { actionConfigurerItsm } from '@/app/[locale]/(app)/parametres/actions'
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
import type { ConfigItsmPublique } from '@/server/services/itsm'

/*
 * Configuration du connecteur ITSM.
 *
 * Ce formulaire ne porte JAMAIS de secret : il nomme la variable
 * d'environnement qui en porte un (« ITSM_… »), et le serveur la résout
 * lui-même. Rien ne permet de saisir une clé, donc rien ne peut la stocker.
 *
 * Deux boutons, une seule action : tester, ou tester puis enregistrer.
 * L'enregistrement sans test n'existe pas.
 */
export interface FormulaireItsmProps {
  config: ConfigItsmPublique | null
  modifiable: boolean
}

/** Les règles d'identifiants telles qu'elles se saisissent : « E:6-7 ». */
function reglesEnTexte(config: ConfigItsmPublique | null): string {
  return (config?.masquage.identifiants ?? [])
    .map((r) => `${r.prefixe}:${String(r.chiffresMin)}-${String(r.chiffresMax)}`)
    .join('\n')
}

export function FormulaireItsm({ config, modifiable }: FormulaireItsmProps) {
  const t = useTranslations('itsm.settings')
  const tItsm = useTranslations('itsm')
  const tCommun = useTranslations('common')
  const [etat, action, enCours] = useActionState(actionConfigurerItsm, ETAT_INITIAL)
  const erreur = useErreurDeChamp(etat)
  const repris = (champ: string, defaut: string) => valeurSoumise(etat, champ) ?? defaut
  // Après une soumission, l'état des cases vient du formulaire renvoyé ;
  // avant, de la configuration enregistrée.
  const coche = (champ: string, defaut: boolean) =>
    etat.statut === 'erreur' || etat.statut === 'testItsm'
      ? valeurSoumise(etat, champ) !== undefined
      : defaut

  const test =
    etat.statut === 'testItsm' ? (
      <Notice
        key={etat.jeton}
        level={etat.resultat.ok ? 'success' : 'blocking'}
        title={etat.resultat.ok ? t('result.ok') : t('result.failed')}
      >
        {etat.resultat.ok
          ? etat.resultat.enregistre
            ? t('saved')
            : null
          : tItsm.has(`erreurs.${etat.resultat.code}` as 'erreurs.CONFIG')
            ? tItsm(`erreurs.${etat.resultat.code}` as 'erreurs.CONFIG')
            : tItsm('erreurs.CONFIG')}
      </Notice>
    ) : null

  return (
    <form key={cleFormulaire(etat)} action={action} className="flex flex-col gap-4" noValidate>
      <ErreurFormulaire etat={etat} />
      {test}

      <fieldset className="flex flex-col gap-4" disabled={!modifiable || enCours}>
        <legend className="visually-hidden">{t('title')}</legend>

        <Field
          label={t('fields.urlInstance')}
          hint={t('fields.urlInstanceHint')}
          error={erreur('urlInstance')}
          required
          requirementLabel={tCommun('required')}
        >
          <Input
            name="urlInstance"
            inputMode="url"
            maxLength={300}
            defaultValue={repris('urlInstance', config?.urlInstance ?? '')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('fields.methodeAuth')}
            error={erreur('methodeAuth')}
            required
            requirementLabel={tCommun('required')}
          >
            <Select
              name="methodeAuth"
              defaultValue={repris('methodeAuth', config?.methodeAuth ?? 'oauth2')}
            >
              <option value="oauth2">{t('methodes.oauth2')}</option>
              <option value="basic">{t('methodes.basic')}</option>
            </Select>
          </Field>
          <Field
            label={t('fields.identifiantPublic')}
            hint={t('fields.identifiantPublicHintOauth')}
            error={erreur('identifiantPublic')}
            required
            requirementLabel={tCommun('required')}
          >
            <Input
              name="identifiantPublic"
              maxLength={200}
              defaultValue={repris('identifiantPublic', config?.identifiantPublic ?? '')}
            />
          </Field>
        </div>

        <Field
          label={t('fields.refSecret')}
          hint={t('fields.refSecretHint')}
          error={erreur('refSecret')}
          required
          requirementLabel={tCommun('required')}
        >
          <Input
            name="refSecret"
            maxLength={65}
            className="font-mono"
            defaultValue={repris('refSecret', config?.refSecret ?? 'ITSM_')}
          />
        </Field>

        <Panel headingLevel={3} title={t('masking.title')} description={t('masking.description')}>
          <div className="flex flex-col gap-3">
            {(
              [
                ['masquerCourriel', t('masking.courriel'), config?.masquage.courriel ?? true],
                ['masquerTelephone', t('masking.telephone'), config?.masquage.telephone ?? true],
                [
                  'masquerDemandeur',
                  t('masking.demandeur'),
                  config?.masquage.champs.includes('demandeur') ?? true,
                ],
              ] as const
            ).map(([nom, libelle, defaut]) => (
              <label key={nom} className="flex items-center gap-3 text-sm text-ink-primary">
                <input
                  type="checkbox"
                  name={nom}
                  value="1"
                  defaultChecked={coche(nom, defaut)}
                  className="size-4 shrink-0 accent-[var(--color-action)] focus-ring"
                />
                <span>{libelle}</span>
              </label>
            ))}
            <Field
              label={t('masking.identifiants')}
              hint={t('masking.identifiantsHint')}
              error={erreur('masquage')}
            >
              <Textarea
                name="identifiants"
                rows={3}
                className="font-mono"
                defaultValue={repris('identifiants', reglesEnTexte(config))}
              />
            </Field>
            <Field label={t('masking.termes')} hint={t('masking.termesHint')}>
              <Textarea
                name="termes"
                rows={4}
                defaultValue={repris('termes', (config?.masquage.termes ?? []).join('\n'))}
              />
            </Field>
          </div>
        </Panel>

        <label className="flex items-start gap-3 text-sm text-ink-primary">
          <input
            type="checkbox"
            name="actif"
            value="1"
            defaultChecked={coche('actif', config?.actif ?? true)}
            className="mt-0.5 size-4 shrink-0 accent-[var(--color-action)] focus-ring"
          />
          <span>
            <span className="block font-medium">{t('fields.actif')}</span>
            <span className="block text-xs text-ink-secondary">{t('fields.actifHint')}</span>
          </span>
        </label>

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            name="intention"
            value="tester"
            variant="secondary"
            loading={enCours}
            icon={<PlugZap aria-hidden="true" />}
          >
            {t('test')}
          </Button>
          <Button
            type="submit"
            name="intention"
            value="enregistrer"
            variant="primary"
            icon={<Save aria-hidden="true" />}
          >
            {t('save')}
          </Button>
        </div>
      </fieldset>
    </form>
  )
}
