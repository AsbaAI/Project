import { useTranslations } from 'next-intl'

/*
 * Pied de page : version de l'application et mention du moteur.
 *
 * La version vient de l'environnement de construction, jamais d'une
 * constante recopiée à la main qui finirait par mentir. Absente, le pied
 * n'affiche pas de numéro plutôt qu'un « 0.0.0 » inventé.
 */
export function PiedDePage({ version }: { version?: string | undefined }) {
  const t = useTranslations('app')

  return (
    <footer className="border-t-w border-line-subtle">
      <div className="mx-auto flex w-full max-w-page flex-wrap items-center gap-x-3 gap-y-1 px-gutter py-4 text-xs text-ink-tertiary">
        <span>{version === undefined ? t('name') : t('version', { version })}</span>
        <span aria-hidden="true">·</span>
        <span>{t('poweredBy')}</span>
      </div>
    </footer>
  )
}
