import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'

import { type Locale, routing } from './routing'

/**
 * Lit et valide le segment `[locale]` d'une page ou d'un layout, puis le
 * déclare à next-intl pour permettre le rendu statique. Une langue
 * inconnue vaut 404 : jamais de repli silencieux sur la langue par défaut.
 */
export async function resolveLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  return locale
}
