import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Link } from '@/i18n/navigation'
import type { EtatMoteur } from '@/server/moteur'

import { BadgeMoteur } from './badge-moteur'
import { BandeauDemo } from './bandeau-demo'
import { FilAriane } from './fil-ariane'
import { LocaleSwitcher } from './locale-switcher'
import { MobileNav } from './mobile-nav'
import { PiedDePage } from './pied-de-page'
import { Sidebar } from './sidebar'
import { UserMenu, type UserMenuProps } from './user-menu'

/*
 * Coquille de l'application — disposition « atelier ».
 *
 *   ┌───────────┬──────────────────────────────────────────────────┐
 *   │ colonne   │ bandeau de démonstration (si COMGEN_ENV=demo)    │
 *   │ de nav    ├──────────────────────────────────────────────────┤
 *   │ marque    │ barre contextuelle : fil d'Ariane · moteur ·     │
 *   │ espace    │ langue · thème · action principale               │
 *   │ 3 groupes ├──────────────────────────────────────────────────┤
 *   │           │ <main id="contenu">                              │
 *   │ identité  ├──────────────────────────────────────────────────┤
 *   │           │ pied : version · Powered by Multi-Provider AI    │
 *   └───────────┴──────────────────────────────────────────────────┘
 *
 * La navigation est une COLONNE, pas une barre : six entrées réparties en
 * trois familles s'y lisent sans se disputer la place avec le compte, la
 * langue et l'état du moteur. Sous `lg`, la colonne cède au tiroir, qui
 * porte les mêmes entrées depuis la même liste.
 *
 * Colonne et barre suivent le thème (blanc sur ivoire en clair, graphite
 * sur anthracite en sombre) : ce sont des surfaces de travail, pas une
 * bannière de marque. La barre reste collante ; sa hauteur, bandeau
 * compris, est portée par `--layout-chrome-height`, dont partent tous les
 * décalages. Le lien d'évitement reste le premier élément focalisable.
 */
export interface AppShellProps {
  children: ReactNode
  /** Personne connectée ; absente dans les stories et les tests de composants. */
  utilisateur?: UserMenuProps['utilisateur']
  /** Organisation et résidence des données, lues en base (`services/espace.ts`). */
  espace?: { organisation: string; residence: string } | undefined
  /** Démonstration publique : bandeau d'avertissement en tête de page. */
  demo?: boolean
  /** État du moteur de génération, lu côté serveur (`server/moteur.ts`). */
  moteur?: { etat: EtatMoteur; reference: string }
  /** Vrai si la personne a le droit de créer : sinon l'action principale n'existe pas. */
  peutCreer?: boolean
  /** Version affichée en pied de page. */
  version?: string | undefined
}

export function AppShell({
  children,
  utilisateur,
  espace,
  demo = false,
  moteur,
  peutCreer = false,
  version,
}: AppShellProps) {
  const t = useTranslations('app')

  return (
    <div className="flex min-h-dvh">
      <a href="#contenu" className="skip-link">
        {t('skipToContent')}
      </a>

      <Sidebar espace={espace}>
        {utilisateur ? <UserMenu utilisateur={utilisateur} /> : null}
      </Sidebar>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-header border-b-w border-nav-line bg-nav-surface">
          {demo ? <BandeauDemo /> : null}
          <div className="flex h-header items-center gap-3 px-gutter">
            <MobileNav {...(moteur ? { moteur } : {})} />
            <FilAriane className="hidden min-w-0 sm:block" />

            <div className="ml-auto flex shrink-0 items-center gap-1.5 2xl:gap-2">
              {moteur ? (
                <BadgeMoteur
                  etat={moteur.etat}
                  reference={moteur.reference}
                  className="hidden xl:inline-flex"
                />
              ) : null}
              <LocaleSwitcher ton="barre" className="hidden lg:block" />
              <ThemeToggle ton="barre" className="hidden lg:inline-flex" />
              {peutCreer ? (
                <Button
                  asChild
                  variant="primary"
                  icon={<Plus aria-hidden="true" />}
                  data-barre="action"
                  className="hidden sm:inline-flex"
                >
                  <Link href="/communications/nouvelle">{t('newCommunication')}</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <main
          id="contenu"
          tabIndex={-1}
          className="mx-auto w-full max-w-page flex-1 px-gutter py-7 outline-none lg:py-9"
        >
          {children}
        </main>

        <PiedDePage version={version} />
      </div>
    </div>
  )
}
