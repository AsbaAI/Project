import { FileStack, LayoutDashboard, type LucideIcon, SwatchBook } from 'lucide-react'

/*
 * Entrées de la navigation principale.
 *
 * Seules les routes qui EXISTENT figurent ici : un lien mort ment sur
 * l'état de l'application. Les sections à venir (communications, sources,
 * personas, modèles, administration) sont ajoutées par le lot qui les
 * livre, pas avant.
 */
export type NavHref = '/' | '/communications' | '/design'

export interface NavEntry {
  /** Clé de traduction sous `nav.*`. */
  key: 'dashboard' | 'communications' | 'design'
  href: NavHref
  icon: LucideIcon
}

export const NAV_ENTRIES: readonly NavEntry[] = [
  { key: 'dashboard', href: '/', icon: LayoutDashboard },
  { key: 'communications', href: '/communications', icon: FileStack },
  { key: 'design', href: '/design', icon: SwatchBook },
]
