import { createNavigation } from 'next-intl/navigation'

import { routing } from './routing'

/**
 * Primitives de navigation conscientes de la locale. À utiliser à la
 * place de `next/link` et `next/navigation` partout dans l'application :
 * elles préfixent les chemins selon `routing`.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
