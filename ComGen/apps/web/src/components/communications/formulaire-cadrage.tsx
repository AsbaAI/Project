'use client'

import { CRITICITES, INTENTIONS_REPRISE, MODES_ENTREE, NATURES, PORTEES } from '@comgen/core'
import { ArrowRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { actionCreerCommunication } from '@/app/[locale]/(app)/communications/actions'
import {
  ETAT_INITIAL,
  cleFormulaire,
  valeurSoumise,
} from '@/app/[locale]/(app)/communications/etat-formulaire'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { Panel } from '@/components/ui/panel'
import type { LangueAffichee } from '@/lib/cles-messages'

import { ChoixCartes } from './choix-cartes'
import { ErreurFormulaire, useErreurDeChamp } from './erreur-formulaire'

/*
 * Cadrage d'une communication (§15). Tout est déclaré, rien n'est deviné :
 * pas de valeur par défaut pour la nature, la criticité ni la portée. Les
 * erreurs reviennent du serveur, champ par champ, toutes à la fois.
 */
export interface FormulaireCadrageProps {
  /** Fuseau de saisie des dates, écrit en clair à côté des champs. */
  fuseau: string
  langues: readonly string[]
  langueParDefaut: string
  parents: readonly { id: string; reference: string; titre: string }[]
  modesDisponibles: readonly string[]
}

export function FormulaireCadrage({
  fuseau,
  langues,
  langueParDefaut,
  parents,
  modesDisponibles,
}: FormulaireCadrageProps) {
  const t = useTranslations('communications')
  const tCommun = useTranslations('common')
  const [etat, action, enCours] = useActionState(actionCreerCommunication, ETAT_INITIAL)
  const erreur = useErreurDeChamp(etat)
  const requis = tCommun('required')
  const facultatif = tCommun('optional')
  const v = (champ: string) => valeurSoumise(etat, champ)
  const locale = useLocale()
  // Les modes pas encore proposés sont nommés, pas présentés en choix grisés.
  const modesAVenir = MODES_ENTREE.filter((mode) => !modesDisponibles.includes(mode))

  return (
    <form
      key={cleFormulaire(etat)}
      action={action}
      className="flex max-w-3xl flex-col gap-4"
      noValidate
    >
      <ErreurFormulaire etat={etat} />

      <Panel title={t('cadrage.sections.sujet')} headingLevel={2}>
        <div className="flex flex-col gap-4">
          <Field
            label={t('cadrage.fields.titre.label')}
            hint={t('cadrage.fields.titre.hint')}
            error={erreur('titre')}
            required
            requirementLabel={requis}
          >
            <Input name="titre" autoComplete="off" maxLength={200} defaultValue={v('titre')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('cadrage.fields.nature.label')}
              error={erreur('nature')}
              required
              requirementLabel={requis}
            >
              <Select name="nature" defaultValue={v('nature') ?? ''}>
                <option value="" disabled>
                  {t('cadrage.choose')}
                </option>
                {NATURES.map((nature) => (
                  <option key={nature} value={nature}>
                    {t(`natures.${nature}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={t('cadrage.fields.langue.label')}
              hint={t('cadrage.fields.langue.hint')}
              error={erreur('langue')}
              required
              requirementLabel={requis}
            >
              <Select name="langue" defaultValue={v('langue') ?? langueParDefaut}>
                {langues.map((langue) => {
                  const cle = `langues.${langue}` as `langues.${LangueAffichee}`
                  return (
                    <option key={langue} value={langue}>
                      {t.has(cle) ? t(cle) : langue}
                    </option>
                  )
                })}
              </Select>
            </Field>
          </div>
        </div>
      </Panel>

      <Panel title={t('cadrage.sections.exigence')} headingLevel={2}>
        <div className="flex flex-col gap-5">
          <ChoixCartes
            nom="criticite"
            legende={t('cadrage.fields.criticite.label')}
            mentionRequis={requis}
            colonnes={3}
            erreur={erreur('criticite')}
            valeurParDefaut={v('criticite')}
            options={CRITICITES.map((criticite) => ({
              valeur: criticite,
              libelle: t(`criticites.${criticite}`),
              description: t(`criticitesDescriptions.${criticite}`),
            }))}
          />
          <Field
            label={t('cadrage.fields.portee.label')}
            error={erreur('portee')}
            required
            requirementLabel={requis}
            className="sm:max-w-xs"
          >
            <Select name="portee" defaultValue={v('portee') ?? ''}>
              <option value="" disabled>
                {t('cadrage.choose')}
              </option>
              {PORTEES.map((portee) => (
                <option key={portee} value={portee}>
                  {t(`portees.${portee}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Panel>

      <Panel title={t('cadrage.sections.calendrier')} headingLevel={2}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('cadrage.fields.dateEffet.label')}
            hint={t('cadrage.fields.dateEffet.hint', { fuseau })}
            error={erreur('dateEffet')}
            requirementLabel={facultatif}
          >
            <Input type="datetime-local" name="dateEffet" defaultValue={v('dateEffet')} />
          </Field>
          <Field
            label={t('cadrage.fields.echeance.label')}
            hint={t('cadrage.fields.echeance.hint', { fuseau })}
            error={erreur('echeance')}
            requirementLabel={facultatif}
          >
            <Input type="datetime-local" name="echeance" defaultValue={v('echeance')} />
          </Field>
        </div>
      </Panel>

      <Panel title={t('cadrage.sections.rattachement')} headingLevel={2}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('cadrage.fields.parentId.label')}
            hint={t('cadrage.fields.parentId.hint')}
            error={erreur('parentId')}
            requirementLabel={facultatif}
          >
            <Select name="parentId" defaultValue={v('parentId') ?? ''}>
              <option value="">{t('cadrage.noParent')}</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.reference} — {parent.titre}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={t('cadrage.fields.intentionReprise.label')}
            error={erreur('intentionReprise')}
            requirementLabel={facultatif}
          >
            <Select name="intentionReprise" defaultValue={v('intentionReprise') ?? ''}>
              <option value="">{tCommun('none')}</option>
              {INTENTIONS_REPRISE.map((intention) => (
                <option key={intention} value={intention}>
                  {t(`intentions.${intention}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Panel>

      <Panel title={t('cadrage.sections.entree')} headingLevel={2}>
        <ChoixCartes
          nom="modeEntree"
          legende={t('cadrage.fields.modeEntree.label')}
          mentionRequis={requis}
          erreur={erreur('modeEntree')}
          valeurParDefaut={v('modeEntree')}
          options={MODES_ENTREE.filter((mode) => modesDisponibles.includes(mode)).map((mode) => ({
            valeur: mode,
            libelle: t(`modes.${mode}`),
            description: t(`modesDescriptions.${mode}`),
          }))}
          note={
            modesAVenir.length > 0
              ? t('modesLater', {
                  modes: new Intl.ListFormat(locale, { type: 'conjunction' }).format(
                    modesAVenir.map((mode) => t(`modes.${mode}`)),
                  ),
                })
              : undefined
          }
        />
      </Panel>

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          loading={enCours}
          icon={<ArrowRight aria-hidden="true" />}
        >
          {t('cadrage.submit')}
        </Button>
      </div>
    </form>
  )
}
