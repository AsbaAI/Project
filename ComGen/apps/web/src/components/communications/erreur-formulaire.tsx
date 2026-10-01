'use client'

import { useTranslations } from 'next-intl'

import { Notice } from '@/components/ui/notice'
import type { CodeChamp, CodeErreurAffiche, MotifAffiche } from '@/lib/cles-messages'

import type { EtatFormulaire } from '@/app/[locale]/(app)/communications/etat-formulaire'

/*
 * Erreur d'une action serveur : un message bloquant qui dit ce qui a été
 * refusé et, pour une transition, tout ce qui manque. Les erreurs de champ
 * sont affichées par chaque champ (`erreurDeChamp`).
 */
export function ErreurFormulaire({ etat }: { etat: EtatFormulaire }) {
  const t = useTranslations('communications')
  if (etat.statut !== 'erreur') return null
  const cle = `erreurs.${etat.code}` as `erreurs.${CodeErreurAffiche}`
  const message = t.has(cle) ? t(cle) : t('erreurs.DONNEES_INVALIDES')
  return (
    <Notice key={etat.jeton} level="blocking" title={t('erreurs.titre')}>
      <p>{message}</p>
      {etat.motifs && etat.motifs.length > 0 ? (
        <ul className="mt-1 list-disc pl-5">
          {etat.motifs.map((motif) => {
            const cleMotif = `motifs.${motif}` as `motifs.${MotifAffiche}`
            return <li key={motif}>{t.has(cleMotif) ? t(cleMotif) : motif}</li>
          })}
        </ul>
      ) : null}
    </Notice>
  )
}

/** Message d'un champ en erreur, traduit ; `undefined` si le champ est valide. */
export function useErreurDeChamp(etat: EtatFormulaire) {
  const t = useTranslations('communications.champs')
  return (champ: string): string | undefined => {
    if (etat.statut !== 'erreur') return undefined
    const code = etat.champs?.[champ]
    if (code === undefined) return undefined
    const cle = code as CodeChamp
    return t.has(cle) ? t(cle) : t('invalide')
  }
}
