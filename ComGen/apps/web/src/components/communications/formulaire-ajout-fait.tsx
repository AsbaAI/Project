'use client'

import { TYPES_VALEUR } from '@comgen/core'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { actionAjouterFait } from '@/app/[locale]/(app)/communications/actions'
import {
  ETAT_INITIAL,
  cleFormulaire,
  valeurSoumise,
} from '@/app/[locale]/(app)/communications/etat-formulaire'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'

import { ChampConfidentialite } from './champ-confidentialite'
import { ErreurFormulaire, useErreurDeChamp } from './erreur-formulaire'

/*
 * Ajout d'un fait relevé à la main. Le serveur vérifie que la citation est
 * un extrait exact de la source et que la valeur y figure telle quelle ;
 * l'interface ne fait que le dire avant.
 */
export function FormulaireAjoutFait({
  communicationId,
  sources,
}: {
  communicationId: string
  sources: readonly { id: string; nom: string }[]
}) {
  const t = useTranslations('communications')
  const [etat, action, enCours] = useActionState(actionAjouterFait, ETAT_INITIAL)
  const erreur = useErreurDeChamp(etat)
  const v = (champ: string) => valeurSoumise(etat, champ)
  // Après un ajout réussi, le formulaire repart vide.
  const cle = etat.statut === 'ok' ? `ajoute-${etat.jeton}` : cleFormulaire(etat)

  return (
    <form key={cle} action={action} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="communicationId" value={communicationId} />
      <ErreurFormulaire etat={etat} />
      <Field label={t('fiche.add.source')} error={erreur('sourceId')} required>
        <Select name="sourceId" defaultValue={v('sourceId') ?? sources[0]?.id ?? ''}>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.nom}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('fiche.add.citation')} error={erreur('citation')} required>
        <Textarea name="citation" rows={3} defaultValue={v('citation')} />
      </Field>
      <Field label={t('fiche.add.enonce')} error={erreur('enonce')} required>
        <Input name="enonce" defaultValue={v('enonce')} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('fiche.add.typeValeur')} error={erreur('typeValeur')} required>
          <Select name="typeValeur" defaultValue={v('typeValeur') ?? 'TEXTE'}>
            {TYPES_VALEUR.map((type) => (
              <option key={type} value={type}>
                {t(`typesValeur.${type}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={t('fiche.add.valeur')}
          hint={t('fiche.add.valeurHint')}
          error={erreur('valeur')}
        >
          <Input name="valeur" className="font-mono" defaultValue={v('valeur')} />
        </Field>
      </div>
      <ChampConfidentialite
        libelle={t('fiche.fact.confidentiality')}
        valeurParDefaut={v('confidentialite') ?? 'INTERNE'}
        erreur={erreur('confidentialite')}
      />
      <div>
        <Button
          type="submit"
          variant="secondary"
          loading={enCours}
          icon={<Plus aria-hidden="true" />}
        >
          {t('fiche.add.submit')}
        </Button>
      </div>
    </form>
  )
}
