import {
  BarChart3,
  Blocks,
  CircleCheckBig,
  LayoutTemplate,
  type LucideIcon,
  Settings,
  Sparkles,
} from 'lucide-react'

/*
 * Onglets de la barre supérieure, dans l'ordre du récit : je génère, on
 * approuve, je gère mes gabarits, je les construis, je mesure, je règle.
 *
 * Un onglet ne ment jamais sur l'état de l'application : tant qu'un écran
 * n'est pas livré, sa page le dit et annonce ce qu'elle portera. Mieux vaut
 * une page qui annonce son absence qu'un onglet qui n'existe pas.
 *
 * `alias` rattache les routes héritées à leur onglet, le temps que la
 * refonte les absorbe : ouvrir une communication depuis l'historique ne doit
 * pas éteindre toute la barre.
 */
export type NavHref =
  | '/'
  | '/generateur'
  | '/approbations'
  | '/gabarits'
  | '/gabarits/constructeur'
  | '/analyses'
  | '/parametres'
  | '/design'

export type NavKey =
  'generator' | 'approvals' | 'templates' | 'templateBuilder' | 'analytics' | 'settings'

export interface NavTab {
  /** Clé de traduction sous `nav.*`. */
  key: NavKey
  href: NavHref
  icon: LucideIcon
  /** Chemins hérités qui relèvent de cet onglet (préfixes, sans barre finale). */
  alias?: readonly string[]
}

export const NAV_TABS: readonly NavTab[] = [
  {
    key: 'generator',
    href: '/generateur',
    icon: Sparkles,
    // Le cadrage, l'entrée des sources et la fiche de faits sont les écrans
    // que l'assistant absorbera à l'étape 3 : ils relèvent du générateur.
    alias: ['/communications'],
  },
  {
    key: 'approvals',
    href: '/approbations',
    icon: CircleCheckBig,
    // Ce qui attend une approbation vit encore dans le tableau de bord.
    alias: ['/tableau-de-bord'],
  },
  { key: 'templates', href: '/gabarits', icon: LayoutTemplate },
  { key: 'templateBuilder', href: '/gabarits/constructeur', icon: Blocks },
  { key: 'analytics', href: '/analyses', icon: BarChart3 },
  { key: 'settings', href: '/parametres', icon: Settings },
]

/** Le système de design est un outil d'équipe, pas une destination du produit. */
export const NAV_DESIGN: NavHref = '/design'

/**
 * Onglet correspondant au chemin courant : celui dont un chemin — le sien
 * ou un alias — est le plus long préfixe. `/gabarits/constructeur` relève
 * donc du constructeur, pas de la bibliothèque, bien que les deux
 * correspondent.
 */
export function ongletCourant(
  chemin: string,
  onglets: readonly NavTab[] = NAV_TABS,
): NavHref | null {
  let meilleur: { href: NavHref; longueur: number } | null = null
  for (const onglet of onglets) {
    for (const prefixe of [onglet.href, ...(onglet.alias ?? [])]) {
      if (prefixe === '/') continue
      if (chemin !== prefixe && !chemin.startsWith(`${prefixe}/`)) continue
      if (meilleur === null || prefixe.length > meilleur.longueur) {
        meilleur = { href: onglet.href, longueur: prefixe.length }
      }
    }
  }
  return meilleur?.href ?? null
}
