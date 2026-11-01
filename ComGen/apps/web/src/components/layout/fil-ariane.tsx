'use client'

import { ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { NAV_TABS, ongletCourant } from '@/lib/navigation'

/*
 * Fil d'Ariane de la barre supérieure : la famille, puis l'écran courant.
 *
 * Il ne dit que ce que la navigation sait — la famille et l'onglet — et
 * jamais le titre de l'objet ouvert : celui-ci est déjà le `<h1>` de la
 * page, et le répéter en plus petit au-dessus l'affaiblirait.
 *
 * Hors des onglets (écran de design, page non rattachée), il ne rend
 * rien plutôt qu'une miette inventée.
 */
export function FilAriane({ className }: { className?: string }) {
  const t = useTranslations('nav')
  const courant = ongletCourant(usePathname())
  const onglet = NAV_TABS.find((tab) => tab.href === courant)
  if (!onglet) return null

  return (
    <nav data-barre="fil" aria-label={t('breadcrumb')} className={className}>
      <ol className="flex items-center gap-0 text-xs text-ink-tertiary">
        <li>{t(`groupes.${onglet.groupe}`)}</li>
        <li aria-hidden="true" className="px-2.5">
          <ChevronRight className="size-3.5" strokeWidth={1.6} />
        </li>
        <li>
          <Link
            href={onglet.href}
            aria-current="page"
            className="rounded-xs font-medium text-ink-primary no-underline focus-ring"
          >
            {t(onglet.key)}
          </Link>
        </li>
      </ol>
    </nav>
  )
}
