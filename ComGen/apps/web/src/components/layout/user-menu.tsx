import { LogOut } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { deconnecter } from '@/server/auth/actions'

/*
 * Identité de la personne connectée et déconnexion, sur la barre marine.
 * Composant serveur : le formulaire appelle directement l'action serveur,
 * sans script, et la langue courante voyage dans un champ caché pour que
 * la redirection revienne dans la bonne langue.
 *
 * L'avatar porte les initiales et rien d'autre : pas de photo à aller
 * chercher, pas de couleur par personne (une teinte dérivée d'un nom finit
 * toujours par être lue comme un statut).
 */
export interface UserMenuProps {
  utilisateur: { nom: string; courriel: string }
}

/** Deux initiales au plus : première lettre du premier et du dernier mot. */
export function initiales(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean)
  if (mots.length === 0) return '?'
  const premier = mots[0] ?? ''
  const dernier = mots.length > 1 ? (mots[mots.length - 1] ?? '') : ''
  return `${premier.slice(0, 1)}${dernier.slice(0, 1)}`.toLocaleUpperCase()
}

export function UserMenu({ utilisateur }: UserMenuProps) {
  const t = useTranslations('auth')
  const locale = useLocale()

  return (
    <form data-barre="compte" action={deconnecter} className="flex items-center gap-2">
      <input type="hidden" name="locale" value={locale} />
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-nav-selected text-2xs font-semibold tracking-normal text-nav-ink"
      >
        {initiales(utilisateur.nom)}
      </span>
      <span className="hidden text-sm text-nav-ink-muted md:inline" title={utilisateur.courriel}>
        <span className="sr-only">{t('signedInAs')} </span>
        {utilisateur.nom}
      </span>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        iconOnly
        icon={<LogOut aria-hidden="true" />}
        className="text-nav-ink-muted hover:bg-nav-hover hover:text-nav-ink"
      >
        {t('signOut')}
      </Button>
    </form>
  )
}
