import type { StorybookConfig } from '@storybook/nextjs-vite'

/*
 * Storybook sert de catalogue des composants dans leur état réel : mêmes
 * jetons, mêmes feuilles de style, mêmes traductions que l'application.
 * Les stories vivent à côté des composants (`*.stories.tsx`).
 */
const config: StorybookConfig = {
  framework: { name: '@storybook/nextjs-vite', options: {} },
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  core: { disableTelemetry: true },
}

export default config
