import createMiddleware from 'next-intl/middleware'

import { routing } from './i18n/routing'

/**
 * Négociation de langue à l'entrée (Next 16 : `proxy.ts`, ex-middleware).
 *
 * Ne fait rien d'autre. L'authentification et les autorisations ne
 * passent PAS ici : elles sont décidées côté serveur, au plus près de la
 * donnée (§3 et §19 de la spécification).
 */
export default createMiddleware(routing)

export const config = {
  // Tout sauf les routes API, les ressources Next et les fichiers statiques.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
