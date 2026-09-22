import { defineConfig, devices } from '@playwright/test'

/*
 * Quatre configurations, imposées par la spécification (§21) : bureau et
 * téléphone, thème clair et thème sombre. Le thème est piloté par
 * `colorScheme` (préférence système) — l'application suit le système par
 * défaut, c'est donc ce chemin qui est testé ; le choix explicite est
 * couvert par le test de la bascule.
 *
 * Le serveur testé est le build de production (`next start`), pas le
 * serveur de développement : les captures relues sont celles que
 * l'utilisateur verra.
 */
const PORT = 3100
const baseURL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  },
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'bureau-clair',
      use: { ...devices['Desktop Chrome'], colorScheme: 'light' },
    },
    {
      name: 'bureau-sombre',
      use: { ...devices['Desktop Chrome'], colorScheme: 'dark' },
    },
    {
      name: 'telephone-clair',
      use: { ...devices['Pixel 7'], colorScheme: 'light' },
    },
    {
      name: 'telephone-sombre',
      use: { ...devices['Pixel 7'], colorScheme: 'dark' },
    },
  ],
})
