'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'

import { actionChangerActivationGabarit } from '@/app/[locale]/(app)/gabarits/actions'
import { ETAT_INITIAL } from '@/app/[locale]/(app)/communications/etat-formulaire'
import { ErreurFormulaire } from '@/components/communications/erreur-formulaire'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import type { GabaritLu } from '@/server/services/gabarits'

/*
 * Un gabarit de la bibliothèque : ce qu'il sert, dans quel état il est, et
 * son corps tel qu'il est enregistré.
 *
 * Le corps est affiché en texte, jamais rendu : un gabarit HTML rendu
 * comme une page se lirait comme le résultat final, qui n'existe qu'à
 * l'envoi. Les désaccords entre le corps et ses emplacements sont dits en
 * clair : ce sont eux qui feraient partir un `{{trou}}` dans un message.
 */
export function CarteGabarit({ gabarit, modifiable }: { gabarit: GabaritLu; modifiable: boolean }) {
  const t = useTranslations('templates')
  const [etat, action, enCours] = useActionState(actionChangerActivationGabarit, ETAT_INITIAL)

  return (
    <article className="flex flex-col gap-3 rounded-md border-w border-line-default bg-surface-raised p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="font-display text-base font-medium tracking-tight text-ink-primary">
            {gabarit.nom}
          </h3>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-secondary">
            <span>{t(`modeles.formats.${gabarit.format}`)}</span>
            <span>{t('bibliotheque.region', { nom: gabarit.regionNom })}</span>
            <span>{t('bibliotheque.version', { version: gabarit.version })}</span>
            <span>{t('bibliotheque.emplacements', { count: gabarit.emplacements.length })}</span>
            <span>{t('bibliotheque.variantes', { count: gabarit.variantes })}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {gabarit.actif ? null : <Badge tone="draft">{t('bibliotheque.inactif')}</Badge>}
          {modifiable ? (
            <form action={action}>
              <input type="hidden" name="gabaritId" value={gabarit.id} />
              {gabarit.actif ? null : <input type="hidden" name="actif" value="1" />}
              <Button type="submit" variant="secondary" size="sm" loading={enCours}>
                {gabarit.actif ? t('bibliotheque.desactiver') : t('bibliotheque.activer')}
              </Button>
            </form>
          ) : null}
        </div>
      </header>

      <ErreurFormulaire etat={etat} />

      {gabarit.constats.length === 0 ? null : (
        <Notice level="blocking" title={t('constats.title')}>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {gabarit.constats.map((constat) => (
              <li key={`${constat.code}-${constat.cle ?? ''}`}>
                {t(`constats.${constat.code}`, { cle: constat.cle ?? '' })}
              </li>
            ))}
          </ul>
        </Notice>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer rounded-xs text-ink-accent focus-ring">
          {t('bibliotheque.apercu')}
        </summary>
        <pre className="mt-2 max-h-80 overflow-auto rounded-sm border-w border-line-subtle bg-surface-sunken p-3 font-mono text-xs whitespace-pre-wrap text-ink-primary">
          {gabarit.corps}
        </pre>
      </details>
    </article>
  )
}
