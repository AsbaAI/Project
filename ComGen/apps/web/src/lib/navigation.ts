import { LayoutDashboard, type LucideIcon, SwatchBook } from 'lucide-react'

/*
 * Entrées de la navigation principale.
 *
 * Seules les routes qui EXISTENT figurent ici : un lien mort ment sur
 * l'état de l'application. Les sections à venir (communications, sources,
 * personas, modèles, administration) sont ajoutées par le lot qui les
 * livre, pas avant.
 */
export interface NavEntry {
  /** Clé de traduction sous `nav.*`. */
  key: 'dashboard' | 'design'
  href: '/' | '/design'
  icon: LucideIcon
}

export const NAV_ENTRIES: readonly NavEntry[] = [
  { key: 'dashboard', href: '/', icon: LayoutDashboard },
  { key: 'design', href: '/design', icon: SwatchBook },
]
