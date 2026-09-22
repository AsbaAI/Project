import { hasLocale, type Messages } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'

import { routing } from './routing'

/**
 * Configuration de next-intl pour chaque requête serveur.
 *
 * Une locale inconnue dans l'URL retombe sur la locale par défaut : le
 * segment `[locale]` agit comme un attrape-tout pour les chemins
 * inconnus (`/favicon.ico`, `/robots.txt`), et le layout se charge de
 * répondre 404 quand c'est réellement une langue non prise en charge.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  const chargement = (await import(`../../messages/${locale}.json`)) as { default: Messages }

  return {
    locale,
    messages: chargement.default,
    timeZone: 'Europe/Paris',
  }
})
