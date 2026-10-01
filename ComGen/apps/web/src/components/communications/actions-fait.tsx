'use client'

import type { StatutFait } from '@comgen/core'
import { Check, ChevronDown, PenLine, RotateCcw, Scale, ShieldHalf, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type ReactNode, useActionState } from 'react'

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
import { cn } from '@/lib/cn'

import { ChampConfidentialite } from './champ-confidentialite'
import { ErreurFormulaire, useErreurDeChamp } from './erreur-formulaire'

/*
 * Actions sur un fait. Les décisions simples (confirmer, retirer,
 * rétablir) sont des boutons ; les modifications qui demandent une saisie
 * s'ouvrent dans un volet `<details>` natif, accessible sans script. Un
 * volet se referme après un enregistrement réussi (remontage par clé).
 */

type Action = (precedent: EtatFormulaire, formulaire: FormData) => Promise<EtatFormulaire>

function cleVolet(etat: EtatFormulaire): string {
  return etat.statut === 'ok' ? `ferme-${etat.jeton}` : 'volet'
}

function Volet({
  titre,
  icone,
  etat,
  children,
}: {
  titre: string
  icone: ReactNode
  etat: EtatFormulaire
  children: ReactNode
}) {
  return (
    <details
      key={cleVolet(etat)}
      open={etat.statut === 'erreur' ? true : undefined}
      className="group w-full rounded-sm border-w border-line-subtle open:bg-surface-base"
    >
      <summary
        className={cn(
          'flex h-control-sm cursor-pointer list-none items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium text-ink-secondary',
          'transition-colors-token hover:bg-surface-hover hover:text-ink-primary focus-ring',
          '[&::-webkit-details-marker]:hidden [&_svg]:size-3.5',
        )}
      >
        {icone}
        {titre}
        <ChevronDown
          aria-hidden="true"
          className="ml-auto transition-transform duration-fast group-open:rotate-180"
        />
      </summary>
      <div className="border-t-w border-line-subtle p-3">{children}</div>
    </details>
  )
}

function useAction(action: Action) {
  return useActionState(action, ETAT_INITIAL)
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
  const [etatStatut, actionStatut, statutEnCours] = useAction(actionStatutFait)
  const [etatEnonce, actionEnonce, enonceEnCours] = useAction(actionModifierEnonce)
  const [etatAmende, actionAmende, amendeEnCours] = useAction(actionAmenderValeur)
  const [etatConf, actionConf, confEnCours] = useAction(actionConfidentialiteFait)
  const erreurEnonce = useErreurDeChamp(etatEnonce)
  const erreurAmende = useErreurDeChamp(etatAmende)
  const vivant = statut === 'PROPOSE' || statut === 'CONFIRME' || statut === 'DECLARE'

  return (
    <div className="flex flex-col gap-2">
      <form action={actionStatut} className="flex flex-col gap-2">
        <input type="hidden" name="faitId" value={faitId} />
        <ErreurFormulaire etat={etatStatut} />
        <div className="flex flex-wrap gap-2">
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
        </div>
      </form>

      {vivant ? (
        <div className="flex flex-col gap-2">
          <Volet
            titre={t('fiche.actions.renameTitle')}
            icone={<PenLine aria-hidden="true" />}
            etat={etatEnonce}
          >
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
          </Volet>

          <Volet
            titre={t('fiche.actions.amendTitle')}
            icone={<Scale aria-hidden="true" />}
            etat={etatAmende}
          >
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
          </Volet>

          <Volet
            titre={t('fiche.fact.confidentiality')}
            icone={<ShieldHalf aria-hidden="true" />}
            etat={etatConf}
          >
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
          </Volet>
        </div>
      ) : null}
    </div>
  )
}
