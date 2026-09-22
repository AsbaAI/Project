import '@fontsource-variable/instrument-sans/wght.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@/styles/index.css'

import type { Metadata } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { AppShell } from '@/components/layout/app-shell'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { resolveLocale } from '@/i18n/params'
import { routing } from '@/i18n/routing'
import { THEME_BOOT_SCRIPT } from '@/lib/theme'

interface LocaleLayoutProps {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: Pick<LocaleLayoutProps, 'params'>): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: 'app' })
  return {
    title: { template: `%s · ${t('name')}`, default: t('name') },
    description: t('tagline'),
  }
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const locale = await resolveLocale(params)

  return (
    // `suppressHydrationWarning` : le script de pré-amorçage pose
    // `data-theme` avant l'hydratation, ce que React ne peut pas prévoir.
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script>{THEME_BOOT_SCRIPT}</script>
      </head>
      <body className="bg-surface-base text-ink-primary antialiased">
        <NextIntlClientProvider>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
