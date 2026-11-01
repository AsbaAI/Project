'use client'

import { Import } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { actionImporterTicket } from '@/app/[locale]/(app)/communications/actions'
import { ETAT_INITIAL, cleFormulaire } from '@/app/[locale]/(app)/communications/etat-formulaire'
import { ChampConfidentialite } from '@/components/communications/champ-confidentialite'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'

/*
 * Import du ticket choisi. Le formulaire ne porte que la référence du
 * ticket et le niveau de confidentialité : le texte, lui, est recomposé et
 * masqué côté serveur, pour que ce qui est écrit ne dépende jamais de ce
 * que le navigateur a renvoyé.
 */
export interface FormulaireImportProps {
  communicationId: string
  idExterne: string
  avecNotes: boolean
}

export function FormulaireImport({ communicationId, idExterne, avecNotes }: FormulaireImportProps) {
  const t = useTranslations('itsm')
  const tEntree = useTranslations('communications.entree')
  const [etat, action, enCours] = useActionState(actionImporterTicket, ETAT_INITIAL)

  const message = (code: string) => {
    const cle = `erreurs.${code}` as 'erreurs.CONFIG'
    return t.has(cle) ? t(cle) : t('erreurs.DONNEES_INVALIDES')
  }

  return (
    <form key={cleFormulaire(etat)} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="communicationId" value={communicationId} />
      <input type="hidden" name="idExterne" value={idExterne} />
      {avecNotes ? <input type="hidden" name="avecNotes" value="1" /> : null}
      {etat.statut === 'erreur' ? (
        <Notice key={etat.jeton} level="blocking" title={t('erreurs.titre')}>
          {message(etat.code)}
        </Notice>
      ) : null}
      <ChampConfidentialite
        libelle={tEntree('confidentiality.label')}
        aide={tEntree('confidentiality.hint')}
        valeurParDefaut="INTERNE"
        className="sm:max-w-xs"
      />
      <div>
        <Button
          type="submit"
          variant="primary"
          loading={enCours}
          icon={<Import aria-hidden="true" />}
        >
          {t('import.submit')}
        </Button>
      </div>
    </form>
  )
}
