'use client'

import { Save } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { actionSaisirTexte } from '@/app/[locale]/(app)/communications/actions'
import {
  ETAT_INITIAL,
  cleFormulaire,
  valeurSoumise,
} from '@/app/[locale]/(app)/communications/etat-formulaire'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'

import { ChampConfidentialite } from './champ-confidentialite'
import { ErreurFormulaire, useErreurDeChamp } from './erreur-formulaire'

/*
 * Rédaction directe (§10, mode TEXTE_SAISI) : le texte saisi devient une
 * source, au mot près, puis la fiche de faits s'ouvre.
 */
export function FormulaireTexte({ communicationId }: { communicationId: string }) {
  const t = useTranslations('communications')
  const tCommun = useTranslations('common')
  const [etat, action, enCours] = useActionState(actionSaisirTexte, ETAT_INITIAL)
  const erreur = useErreurDeChamp(etat)

  return (
    <form key={cleFormulaire(etat)} action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="communicationId" value={communicationId} />
      <ErreurFormulaire etat={etat} />
      <Field
        label={t('entree.text.titre')}
        hint={t('entree.text.titreHint')}
        error={erreur('titre')}
        required
        requirementLabel={tCommun('required')}
      >
        <Input name="titre" maxLength={200} defaultValue={valeurSoumise(etat, 'titre')} />
      </Field>
      <Field
        label={t('entree.text.texte')}
        error={erreur('texte')}
        required
        requirementLabel={tCommun('required')}
      >
        <Textarea name="texte" rows={12} defaultValue={valeurSoumise(etat, 'texte')} />
      </Field>
      <ChampConfidentialite
        libelle={t('entree.confidentiality.label')}
        aide={t('entree.confidentiality.hint')}
        erreur={erreur('confidentialite')}
        valeurParDefaut={valeurSoumise(etat, 'confidentialite') ?? 'INTERNE'}
        className="sm:max-w-xs"
      />
      <div>
        <Button
          type="submit"
          variant="primary"
          loading={enCours}
          icon={<Save aria-hidden="true" />}
        >
          {t('entree.text.submit')}
        </Button>
      </div>
    </form>
  )
}
