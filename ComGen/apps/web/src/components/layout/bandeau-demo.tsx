import { FlaskConical } from 'lucide-react'
import { useTranslations } from 'next-intl'

/*
 * Bandeau de démonstration publique, au-dessus de tout le reste. Il n'est
 * rendu que si le serveur a été déclaré `COMGEN_ENV=demo` ; la décision
 * est prise par le layout serveur, ce composant ne fait qu'afficher. Le
 * message est porté par un texte et un pictogramme, pas par la couleur.
 *
 * Une ligne, de hauteur fixe (`--layout-demo-height`) : sa présence
 * (`data-bandeau-demo`) allonge `--layout-chrome-height`, dont partent la
 * barre latérale collante et le défilement d'ancre. Sur téléphone, la
 * version courte tient sur la ligne.
 */
export function BandeauDemo() {
  const t = useTranslations('app.demo')

  return (
    <div
      data-bandeau-demo=""
      className="h-demo border-b-w border-warning-line bg-warning-bg text-warning-ink"
    >
      <p className="mx-auto flex h-full w-full max-w-page items-center gap-2 px-gutter text-sm">
        <FlaskConical aria-hidden="true" className="size-4 shrink-0" />
        <span className="truncate">
          <strong className="font-semibold">{t('label')}</strong>{' '}
          <span className="md:hidden">{t('short')}</span>
          <span className="hidden md:inline">{t('message')}</span>
        </span>
      </p>
    </div>
  )
}
