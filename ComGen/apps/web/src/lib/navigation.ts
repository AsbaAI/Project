import { BarChart3, History, LayoutDashboard, type LucideIcon, Plus, Settings } from 'lucide-react'

/*
 * Entrées de la navigation principale, dans l'ordre du parcours : créer,
 * suivre, retrouver, mesurer, régler. « Nouvelle communication » est
 * l'action principale de l'application : elle est rendue en bouton en tête
 * de la barre latérale.
 *
 * Analyses et Paramètres existent dès maintenant avec un état vide qui dit
 * ce qui viendra : un lien n'y ment pas sur l'état de l'application.
 */
export type NavHref =
  | '/'
  | '/communications/nouvelle'
  | '/tableau-de-bord'
  | '/communications'
  | '/analyses'
  | '/parametres'
  | '/design'

export interface NavEntry {
  /** Clé de traduction sous `nav.*`. */
  key: 'newCommunication' | 'dashboard' | 'history' | 'analytics' | 'settings'
  href: NavHref
  icon: LucideIcon
}

export const NAV_ACTION: NavEntry = {
  key: 'newCommunication',
  href: '/communications/nouvelle',
  icon: Plus,
}

export const NAV_ENTRIES: readonly NavEntry[] = [
  { key: 'dashboard', href: '/tableau-de-bord', icon: LayoutDashboard },
  { key: 'history', href: '/communications', icon: History },
  { key: 'analytics', href: '/analyses', icon: BarChart3 },
  { key: 'settings', href: '/parametres', icon: Settings },
]

/**
 * Entrée correspondant au chemin courant : la plus longue dont le chemin
 * est un préfixe. `/communications/nouvelle` relève de l'action, pas de
 * l'historique ; une communication ouverte relève de l'historique.
 */
export function entreeCourante(
  chemin: string,
  entrees: readonly Pick<NavEntry, 'href'>[],
): NavHref | null {
  const candidates = entrees
    .map((e) => e.href)
    .filter((href) => href !== '/' && (chemin === href || chemin.startsWith(`${href}/`)))
  if (candidates.length === 0) return null
  return candidates.reduce((a, b) => (b.length > a.length ? b : a))
}
