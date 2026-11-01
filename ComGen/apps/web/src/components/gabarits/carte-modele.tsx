'use client'

import { Check, Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { actionInstallerModele } from '@/app/[locale]/(app)/gabarits/actions'
import {
  ETAT_INITIAL,
  cleFormulaire,
  valeurSoumise,
} from '@/app/[locale]/(app)/communications/etat-formulaire'
import { ErreurFormulaire, useErreurDeChamp } from '@/components/communications/erreur-formulaire'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import type { ModelePropose } from '@/server/services/gabarits'

/*
 * Un exemple du catalogue. Installer le COPIE dans l'organisation : à
 * partir de là il vit sa vie, se renomme et se modifie. Le nom porte la
 * clé du modèle entre parenthèses, c'est ce qui dit « déjà installé ».
 */
export function CarteModeleGabarit({
  modele,
  regions,
  regionParDefaut,
  modifiable,
  canaux,
}: {
  modele: ModelePropose
  regions: readonly { id: string; nom: string }[]
  regionParDefaut: string
  modifiable: boolean
  canaux: readonly string[]
}) {
  const t = useTranslations('templates')
  const [etat, action, enCours] = useActionState(actionInstallerModele, ETAT_INITIAL)
  const erreur = useErreurDeChamp(etat)
  const cle = modele.cle as 'newsletter-fr'

  return (
    <article className="flex h-full flex-col gap-3 rounded-md border-w border-line-default bg-surface-raised p-4">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-base font-medium tracking-tight text-ink-primary">
            {t(`modeles.noms.${cle}`)}
          </h3>
          {modele.installe ? (
            <Badge tone="success">{t('modeles.installe')}</Badge>
          ) : (
            <Badge tone="neutral">{t(`modeles.langues.${modele.langue}`)}</Badge>
          )}
        </div>
        <p className="text-sm text-ink-secondary">{t(`modeles.quoi.${cle}`)}</p>
        <p className="flex flex-wrap items-center gap-x-3 text-xs text-ink-tertiary">
          <span>{t(`modeles.formats.${modele.format}`)}</span>
          <span>{t('canaux.sert', { canaux: canaux.join(', ') })}</span>
          <span>{t('bibliotheque.emplacements', { count: modele.emplacements.length })}</span>
        </p>
      </header>

      <details className="text-sm">
        <summary className="cursor-pointer rounded-xs text-ink-accent focus-ring">
          {t('bibliotheque.apercu')}
        </summary>
        <pre className="mt-2 max-h-72 overflow-auto rounded-sm border-w border-line-subtle bg-surface-sunken p-3 font-mono text-xs whitespace-pre-wrap text-ink-primary">
          {modele.corps}
        </pre>
      </details>

      {modifiable ? (
        <form
          key={cleFormulaire(etat)}
          action={action}
          className="mt-auto flex flex-col gap-3"
          noValidate
        >
          <input type="hidden" name="modele" value={modele.cle} />
          <ErreurFormulaire etat={etat} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('modeles.intitule')} error={erreur('intitule')}>
              <Input
                name="intitule"
                maxLength={100}
                defaultValue={valeurSoumise(etat, 'intitule') ?? t(`modeles.noms.${cle}`)}
              />
            </Field>
            <Field label={t('modeles.region')} error={erreur('regionId')}>
              <Select
                name="regionId"
                defaultValue={valeurSoumise(etat, 'regionId') ?? regionParDefaut}
              >
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.nom}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div>
            <Button
              type="submit"
              variant={modele.installe ? 'secondary' : 'primary'}
              loading={enCours}
              icon={
                modele.installe ? <Check aria-hidden="true" /> : <Download aria-hidden="true" />
              }
            >
              {t('modeles.installer')}
            </Button>
          </div>
        </form>
      ) : null}
    </article>
  )
}
