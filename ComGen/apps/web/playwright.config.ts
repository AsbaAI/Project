import { defineConfig, devices } from '@playwright/test'

import { COMPTES, ENV_E2E, PORT_E2E, URL_E2E } from './e2e/environnement'

/*
 * Quatre configurations, imposées par la spécification (§21) : bureau et
 * téléphone, thème clair et thème sombre. Le thème est piloté par
 * `colorScheme` (préférence système) — l'application suit le système par
 * défaut, c'est donc ce chemin qui est testé ; le choix explicite est
 * couvert par le test de la bascule.
 *
 * Le serveur testé est le build de production (`next start`), pas le
 * serveur de développement : les captures relues sont celles que
 * l'utilisateur verra. Il tourne sur une base dédiée, remise au jeu de
 * démonstration avant chaque passe (migration puis seed, qui vide aussi le
 * dépôt de fichiers de chaque organisation), et les pages sont vues par une
 * rédactrice connectée par l'écran de connexion réel.
 */
const baseURL = URL_E2E
const connecte = { storageState: COMPTES.redactrice.etat }

/*
 * Appels d'API sans écran : les quatre configurations n'y changent rien,
 * un seul projet les joue.
 */
const APPELS_API = /(generation-flux|sante)\.spec\.ts$/

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
    /*
     * Chromium imposé quand la machine en fournit un hors de l'arbre de
     * Playwright (conteneur préinstallé, paquet système). Sans cette
     * variable, rien ne change : Playwright prend le navigateur de la
     * version qu'il attend. On ne télécharge jamais : un `playwright
     * install` ici n'aurait pas accès au réseau.
     */
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH === undefined
      ? {}
      : { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }),
  },
  webServer: {
    // Playwright lance le serveur avant `globalSetup` : la base est donc
    // préparée dans la commande même, avant `next start`.
    command: [
      'pnpm --filter @comgen/db migrate',
      'pnpm --filter @comgen/db seed',
      `pnpm exec next start -p ${PORT_E2E}`,
    ].join(' && '),
    url: `${baseURL}/connexion`,
    env: ENV_E2E,
    // Un serveur déjà lancé n'aurait pas cet environnement : jamais de réemploi.
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: 'connexion', testMatch: /\.setup\.ts$/ },
    {
      name: 'bureau-clair',
      dependencies: ['connexion'],
      use: { ...devices['Desktop Chrome'], colorScheme: 'light', ...connecte },
    },
    {
      name: 'bureau-sombre',
      dependencies: ['connexion'],
      testIgnore: APPELS_API,
      use: { ...devices['Desktop Chrome'], colorScheme: 'dark', ...connecte },
    },
    {
      name: 'telephone-clair',
      dependencies: ['connexion'],
      testIgnore: APPELS_API,
      use: { ...devices['Pixel 7'], colorScheme: 'light', ...connecte },
    },
    {
      name: 'telephone-sombre',
      dependencies: ['connexion'],
      testIgnore: APPELS_API,
      use: { ...devices['Pixel 7'], colorScheme: 'dark', ...connecte },
    },
  ],
})
