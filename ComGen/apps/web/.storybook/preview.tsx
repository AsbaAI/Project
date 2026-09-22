import '@fontsource-variable/instrument-sans/wght.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '../src/styles/index.css'

import type { Preview } from '@storybook/nextjs-vite'
import { NextIntlClientProvider } from 'next-intl'
import { type ReactNode, useEffect } from 'react'

import { ThemeProvider } from '../src/components/theme/theme-provider'
import {
  THEME_PREFERENCES,
  type ThemePreference,
  applyPreference,
  isThemePreference,
} from '../src/lib/theme'
import fr from '../messages/fr.json'

/*
 * Le cadre reproduit ce que fait `app/[locale]/layout.tsx` : traductions,
 * fournisseur de thème, surface et encre de base sur le conteneur. Le thème
 * se choisit dans la barre d'outils ; « système » retire l'attribut et
 * laisse le réglage du poste décider, comme dans l'application.
 */
function Cadre({ theme, children }: { theme: ThemePreference; children: ReactNode }) {
  useEffect(() => {
    applyPreference(document.documentElement, theme)
  }, [theme])

  return (
    <NextIntlClientProvider locale="fr" messages={fr} timeZone="Europe/Paris">
      <ThemeProvider>
        <div className="min-h-dvh bg-surface-base p-6 text-ink-primary antialiased">{children}</div>
      </ThemeProvider>
    </NextIntlClientProvider>
  )
}

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    // Le fond est celui des jetons du thème, jamais celui de Storybook.
    backgrounds: { disable: true },
    controls: { expanded: true },
    options: {
      storySort: { order: ['Fondations', 'Composants', 'Mise en page'] },
    },
  },
  globalTypes: {
    theme: {
      description: 'Thème d’affichage',
      toolbar: {
        title: 'Thème',
        icon: 'mirror',
        dynamicTitle: true,
        items: [
          { value: 'system', title: 'Système', icon: 'browser' },
          { value: 'light', title: 'Clair', icon: 'sun' },
          { value: 'dark', title: 'Sombre', icon: 'moon' },
        ],
      },
    },
  },
  initialGlobals: { theme: THEME_PREFERENCES[0] },
  decorators: [
    (Story, context) => {
      const brut: unknown = context.globals.theme
      const theme = isThemePreference(brut) ? brut : 'system'
      return (
        <Cadre theme={theme}>
          <Story />
        </Cadre>
      )
    },
  ],
}

export default preview
