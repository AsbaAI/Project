import { defineRouting } from 'next-intl/routing'

/**
 * Locales de l'interface (§13 de la spécification).
 *
 * Le français est la langue par défaut et n'est pas préfixée dans l'URL ;
 * l'anglais l'est (`/en/...`). Ajouter une langue ici suffit à l'exposer,
 * à condition que `messages/<locale>.json` existe : la construction
 * échoue sinon, ce qui est voulu.
 */
export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed',
})

export type Locale = (typeof routing.locales)[number]
