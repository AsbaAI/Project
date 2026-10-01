/* oxlint-disable jsx-a11y/label-has-associated-control -- le libellé enveloppe sa case ET son texte ; la règle ne traverse pas les éléments imbriqués (vérifié par axe-core sur l'écran rendu) */
'use client'

import { Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { actionChoisirDestinataires } from '@/app/[locale]/(app)/communications/actions'
import { ETAT_INITIAL, cleFormulaire } from '@/app/[locale]/(app)/communications/etat-formulaire'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import type { CanalAffiche } from '@/lib/cles-messages'
import type { PersonaDisponible } from '@/server/services/generation'

import { ErreurFormulaire } from './erreur-formulaire'

/*
 * Un persona retenu = une version à produire.
 *
 * Un persona sans gabarit pour son canal reste visible, désactivé, avec la
 * raison écrite à côté : le retirer de la liste laisserait croire qu'il
 * n'existe pas, et on chercherait longtemps pourquoi.
 *
 * Les cases sont natives et portent toutes le même `name` : le formulaire
 * marche sans script, et l'action lit `getAll`.
 */
export interface FormulaireDestinatairesProps {
  communicationId: string
  personas: readonly PersonaDisponible[]
  /** Faux une fois la génération commencée : la liste est alors figée. */
  modifiable: boolean
}

export function FormulaireDestinataires({
  communicationId,
  personas,
  modifiable,
}: FormulaireDestinatairesProps) {
  const t = useTranslations('destinataires')
  const tc = useTranslations('communications')
  const [etat, action, enCours] = useActionState(actionChoisirDestinataires, ETAT_INITIAL)

  /*
   * Le canal arrive en constante (`MESSAGERIE_INSTANTANEE`) ; on l'écrit
   * dans la langue de la page. Un code non traduit s'affiche tel quel
   * plutôt que de masquer l'information.
   */
  const libelleCanal = (canal: string) => {
    const cle = `canaux.${canal}`
    return tc.has(cle as `canaux.${CanalAffiche}`) ? tc(cle as `canaux.${CanalAffiche}`) : canal
  }

  return (
    <form key={cleFormulaire(etat)} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="communicationId" value={communicationId} />
      <ErreurFormulaire etat={etat} />

      <fieldset className="flex flex-col gap-2" disabled={!modifiable || enCours}>
        <legend className="sr-only">{t('legende')}</legend>
        {personas.map((persona) => (
          <label
            key={persona.id}
            className={cn(
              'flex items-start gap-3 rounded-sm border-w px-3 py-2.5',
              persona.gabaritDisponible
                ? 'border-line-default bg-surface-raised has-[:checked]:border-action has-[:checked]:bg-surface-selected'
                : 'border-line-subtle bg-surface-sunken',
            )}
          >
            <input
              type="checkbox"
              name="personaIds"
              value={persona.id}
              defaultChecked={persona.retenu}
              disabled={!persona.gabaritDisponible}
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-action)] focus-ring"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink-primary">{persona.nom}</span>
              <span className="block text-xs text-ink-secondary">
                {persona.gabaritDisponible
                  ? t('canal', { canal: libelleCanal(persona.canal) })
                  : t('sansGabarit', { canal: libelleCanal(persona.canal) })}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {modifiable ? (
        <div>
          <Button
            type="submit"
            variant="primary"
            icon={<Users aria-hidden="true" />}
            loading={enCours}
          >
            {t('valider')}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-ink-secondary">{t('figee')}</p>
      )}
    </form>
  )
}
