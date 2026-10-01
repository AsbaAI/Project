'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Menu, SwatchBook, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { usePathname } from '@/i18n/navigation'
import { NAV_DESIGN, NAV_TABS, ongletCourant } from '@/lib/navigation'

import type { EtatMoteur } from '@/server/moteur'

import { BadgeMoteur } from './badge-moteur'
import { LocaleSwitcher } from './locale-switcher'
import { NavItem } from './nav-item'

/*
 * Navigation sur téléphone : un tiroir modal (Radix Dialog) ouvert depuis
 * la barre supérieure, portant LES MÊMES entrées que les onglets du bureau
 * — une seule liste, `NAV_TABS`, pour les deux.
 *
 * Le focus est piégé dans le tiroir, Échap le ferme, et toute navigation le
 * referme. Le tiroir a un titre pour les lecteurs d'écran ; la description
 * est volontairement absente (`aria-describedby` vidé).
 *
 * Langue, thème et état du moteur vivent ici en bas sur téléphone : la
 * barre n'a pas la place de les porter sans écraser les onglets, et l'état
 * du moteur ne doit disparaître d'aucune largeur d'écran — c'est lui qui
 * dit d'où vient le texte qu'on va lire.
 */
export function MobileNav({ moteur }: { moteur?: { etat: EtatMoteur; reference: string } }) {
  const t = useTranslations('common')
  const tNav = useTranslations('nav')
  const [open, setOpen] = useState(false)
  const courant = ongletCourant(usePathname())
  const fermer = () => setOpen(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button
          variant="ghost"
          iconOnly
          icon={<Menu aria-hidden="true" />}
          className="text-nav-ink-muted hover:bg-nav-hover hover:text-nav-ink lg:hidden"
        >
          {t('openMenu')}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-overlay bg-surface-inverse/40 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_var(--duration-fast)_var(--ease-out)]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-dialog flex w-[min(20rem,85vw)] flex-col border-r-w border-line-default bg-surface-raised shadow-lg data-[state=open]:animate-[slide-in-start_var(--duration-base)_var(--ease-out)]"
        >
          <div className="flex h-header items-center justify-between border-b-w border-line-default pr-2 pl-4">
            <Dialog.Title className="text-sm font-semibold text-ink-primary">
              {tNav('label')}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" iconOnly icon={<X aria-hidden="true" />}>
                {t('closeMenu')}
              </Button>
            </Dialog.Close>
          </div>

          <nav aria-label={tNav('label')} className="flex-1 overflow-y-auto p-3">
            <ul className="flex flex-col gap-0.5">
              {NAV_TABS.map((onglet) => (
                <li key={onglet.key}>
                  <NavItem
                    href={onglet.href}
                    icon={onglet.icon}
                    label={tNav(onglet.key)}
                    current={courant === onglet.href}
                    onNavigate={fermer}
                  />
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t-w border-line-subtle pt-3">
              <NavItem
                href={NAV_DESIGN}
                icon={SwatchBook}
                label={tNav('design')}
                current={false}
                onNavigate={fermer}
              />
            </div>
          </nav>

          {moteur ? (
            <div className="border-t-w border-line-default px-3 py-2">
              <BadgeMoteur etat={moteur.etat} reference={moteur.reference} ton="surface" />
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 border-t-w border-line-default p-3">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
