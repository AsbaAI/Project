'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Menu, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { MainNav } from './main-nav'

/*
 * Navigation sur téléphone : un tiroir modal (Radix Dialog) ouvert depuis
 * l'en-tête. Le focus est piégé dans le tiroir, Échap le ferme, et toute
 * navigation le referme. Le tiroir a un titre pour les lecteurs d'écran ;
 * la description est volontairement absente (`aria-describedby` vidé).
 */
export function MobileNav() {
  const t = useTranslations()
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" iconOnly icon={<Menu aria-hidden="true" />} className="lg:hidden">
          {t('common.openMenu')}
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
              {t('nav.label')}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" iconOnly icon={<X aria-hidden="true" />}>
                {t('common.closeMenu')}
              </Button>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <MainNav onNavigate={() => setOpen(false)} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
