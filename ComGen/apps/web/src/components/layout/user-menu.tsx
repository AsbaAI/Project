import { LogOut } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { deconnecter } from '@/server/auth/actions'

/*
 * Identité de la personne connectée et déconnexion. Composant serveur :
 * le formulaire appelle directement l'action serveur, sans script, et la
 * langue courante voyage dans un champ caché pour que la redirection
 * revienne dans la bonne langue.
 */
export interface UserMenuProps {
  utilisateur: { nom: string; courriel: string }
}

export function UserMenu({ utilisateur }: UserMenuProps) {
  const t = useTranslations('auth')
  const locale = useLocale()

  return (
    <form action={deconnecter} className="flex items-center gap-2">
      <input type="hidden" name="locale" value={locale} />
      <span className="hidden text-sm text-ink-secondary sm:inline" title={utilisateur.courriel}>
        <span className="sr-only">{t('signedInAs')} </span>
        {utilisateur.nom}
      </span>
      <Button type="submit" variant="ghost" size="sm" iconOnly icon={<LogOut aria-hidden="true" />}>
        {t('signOut')}
      </Button>
    </form>
  )
}
