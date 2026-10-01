'use client'

import type { StatutFait } from '@comgen/core'
import { Check, PenLine, RotateCcw, Scale, ShieldHalf, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type ReactNode, useActionState, useId, useState } from 'react'

import {
  actionAmenderValeur,
  actionConfidentialiteFait,
  actionModifierEnonce,
  actionStatutFait,
} from '@/app/[locale]/(app)/communications/actions'
import {
  ETAT_INITIAL,
  type EtatFormulaire,
  cleFormulaire,
  valeurSoumise,
} from '@/app/[locale]/(app)/communications/etat-formulaire'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'

import { ChampConfidentialite } from './champ-confidentialite'
import { ErreurFormulaire, useErreurDeChamp } from './erreur-formulaire'

/*
 * Actions sur un fait, en une seule barre. Les décisions simples
 * (confirmer, retirer, rétablir) sont des boutons d'envoi ; les
 * modifications qui demandent une saisie s'ouvrent dans un volet unique
 * sous la barre, un à la fois. Un volet se referme de lui-même après un
 * enregistrement réussi, et reste ouvert sur une erreur.
 */

type Volet = 'enonce' | 'amende' | 'confidentialite'

function jetonDe(etat: EtatFormulaire): number {
  return etat.statut === 'repos' ? 0 : etat.jeton
}

function BoutonVolet({
  ouvert,
  controle,
  icone,
  onClick,
  children,
}: {
  ouvert: boolean
  controle: string
  icone: ReactNode
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      icon={icone}
      aria-expanded={ouvert}
      aria-controls={ouvert ? controle : undefined}
      onClick={onClick}
      className="aria-expanded:bg-surface-selected aria-expanded:text-ink-primary"
    >
      {children}
    </Button>
  )
}

export interface ActionsFaitProps {
  faitId: string
  statut: StatutFait
  enonce: string
  valeur: string | null
  confidentialite: string
}

export function ActionsFait({ faitId, statut, enonce, valeur, confidentialite }: ActionsFaitProps) {
  const t = useTranslations('communications')
  const idVolet = useId()
  const [etatStatut, actionStatut, statutEnCours] = useActionState(actionStatutFait, ETAT_INITIAL)
  const [etatEnonce, actionEnonce, enonceEnCours] = useActionState(
    actionModifierEnonce,
    ETAT_INITIAL,
  )
  const [etatAmende, actionAmende, amendeEnCours] = useActionState(
    actionAmenderValeur,
    ETAT_INITIAL,
  )
  const [etatConf, actionConf, confEnCours] = useActionState(
    actionConfidentialiteFait,
    ETAT_INITIAL,
  )
  const erreurEnonce = useErreurDeChamp(etatEnonce)
  const erreurAmende = useErreurDeChamp(etatAmende)
  const vivant = statut === 'PROPOSE' || statut === 'CONFIRME' || statut === 'DECLARE'

  const etats: Record<Volet, EtatFormulaire> = {
    enonce: etatEnonce,
    amende: etatAmende,
    confidentialite: etatConf,
  }
  // Volet ouvert, avec le jeton de son action au moment de l'ouverture : une
  // réponse « ok » plus récente que ce jeton le referme, sans effet de bord.
  const [ouverture, setOuverture] = useState<{ volet: Volet; jeton: number } | null>(null)
  const voletOuvert: Volet | null =
    ouverture !== null &&
    !(etats[ouverture.volet].statut === 'ok' && jetonDe(etats[ouverture.volet]) !== ouverture.jeton)
      ? ouverture.volet
      : null
  const basculer = (volet: Volet) =>
    setOuverture(voletOuvert === volet ? null : { volet, jeton: jetonDe(etats[volet]) })

  return (
    <div className="flex flex-col gap-2">
      <form action={actionStatut} className="flex flex-col gap-2">
        <input type="hidden" name="faitId" value={faitId} />
        <ErreurFormulaire etat={etatStatut} />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          {statut === 'PROPOSE' ? (
            <Button
              type="submit"
              name="operation"
              value="confirmer"
              size="sm"
              variant="primary"
              loading={statutEnCours}
              icon={<Check aria-hidden="true" />}
            >
              {t('fiche.actions.confirm')}
            </Button>
          ) : null}
          {vivant ? (
            <Button
              type="submit"
              name="operation"
              value="retirer"
              size="sm"
              variant="secondary"
              loading={statutEnCours}
              icon={<X aria-hidden="true" />}
            >
              {t('fiche.actions.remove')}
            </Button>
          ) : null}
          {statut === 'RETIRE' ? (
            <Button
              type="submit"
              name="operation"
              value="retablir"
              size="sm"
              variant="secondary"
              loading={statutEnCours}
              icon={<RotateCcw aria-hidden="true" />}
            >
              {t('fiche.actions.restore')}
            </Button>
          ) : null}
          {vivant ? (
            <div className="flex flex-wrap gap-1 sm:ml-auto">
              <BoutonVolet
                ouvert={voletOuvert === 'enonce'}
                controle={idVolet}
                icone={<PenLine aria-hidden="true" />}
                onClick={() => basculer('enonce')}
              >
                {t('fiche.actions.rename')}
              </BoutonVolet>
              <BoutonVolet
                ouvert={voletOuvert === 'amende'}
                controle={idVolet}
                icone={<Scale aria-hidden="true" />}
                onClick={() => basculer('amende')}
              >
                {t('fiche.actions.amend')}
              </BoutonVolet>
              <BoutonVolet
                ouvert={voletOuvert === 'confidentialite'}
                controle={idVolet}
                icone={<ShieldHalf aria-hidden="true" />}
                onClick={() => basculer('confidentialite')}
              >
                {t('fiche.fact.confidentiality')}
              </BoutonVolet>
            </div>
          ) : null}
        </div>
      </form>

      {vivant && voletOuvert !== null ? (
        <section
          id={idVolet}
          aria-labelledby={`${idVolet}-titre`}
          className="flex flex-col gap-3 rounded-sm border-w border-line-subtle bg-surface-base p-3"
        >
          <h4 id={`${idVolet}-titre`} className="text-xs font-semibold text-ink-primary">
            {voletOuvert === 'enonce'
              ? t('fiche.actions.renameTitle')
              : voletOuvert === 'amende'
                ? t('fiche.actions.amendTitle')
                : t('fiche.fact.confidentiality')}
          </h4>

          {voletOuvert === 'enonce' ? (
            <form
              key={cleFormulaire(etatEnonce)}
              action={actionEnonce}
              className="flex flex-col gap-3"
              noValidate
            >
              <input type="hidden" name="faitId" value={faitId} />
              <ErreurFormulaire etat={etatEnonce} />
              <Field
                label={t('fiche.add.enonce')}
                hint={t('fiche.actions.renameHint')}
                error={erreurEnonce('enonce')}
                required
              >
                <Textarea
                  name="enonce"
                  rows={2}
                  defaultValue={valeurSoumise(etatEnonce, 'enonce') ?? enonce}
                />
              </Field>
              <div>
                <Button type="submit" size="sm" variant="primary" loading={enonceEnCours}>
                  {t('fiche.actions.renameSubmit')}
                </Button>
              </div>
            </form>
          ) : null}

          {voletOuvert === 'amende' ? (
            <form
              key={cleFormulaire(etatAmende)}
              action={actionAmende}
              className="flex flex-col gap-3"
              noValidate
            >
              <input type="hidden" name="faitId" value={faitId} />
              <p className="text-xs text-ink-secondary">{t('fiche.actions.amendHint')}</p>
              <ErreurFormulaire etat={etatAmende} />
              <Field
                label={t('fiche.actions.newValue')}
                error={erreurAmende('nouvelleValeur')}
                required
              >
                <Input
                  name="nouvelleValeur"
                  className="font-mono"
                  defaultValue={valeurSoumise(etatAmende, 'nouvelleValeur') ?? valeur ?? ''}
                />
              </Field>
              <Field
                label={t('fiche.actions.justification')}
                hint={t('fiche.actions.justificationHint')}
                error={erreurAmende('justification')}
                required
              >
                <Textarea
                  name="justification"
                  rows={2}
                  defaultValue={valeurSoumise(etatAmende, 'justification')}
                />
              </Field>
              <Field
                label={t('fiche.actions.invokedSource')}
                hint={t('fiche.actions.invokedSourceHint')}
                error={erreurAmende('sourceInvoquee')}
              >
                <Input
                  name="sourceInvoquee"
                  defaultValue={valeurSoumise(etatAmende, 'sourceInvoquee')}
                />
              </Field>
              <label className="flex items-start gap-2 text-xs text-ink-primary">
                <input
                  type="checkbox"
                  name="responsabiliteAssumee"
                  value="oui"
                  defaultChecked={valeurSoumise(etatAmende, 'responsabiliteAssumee') === 'oui'}
                  className="mt-0.5 size-4 shrink-0 accent-action"
                />
                <span>{t('fiche.actions.assume')}</span>
              </label>
              <div>
                <Button type="submit" size="sm" variant="primary" loading={amendeEnCours}>
                  {t('fiche.actions.amendSubmit')}
                </Button>
              </div>
            </form>
          ) : null}

          {voletOuvert === 'confidentialite' ? (
            <form action={actionConf} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="faitId" value={faitId} />
              <ErreurFormulaire etat={etatConf} />
              <ChampConfidentialite
                libelle={t('fiche.fact.confidentiality')}
                valeurParDefaut={confidentialite}
                className="min-w-48"
              />
              <Button type="submit" size="sm" variant="secondary" loading={confEnCours}>
                {t('fiche.actions.confidentialitySubmit')}
              </Button>
            </form>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
