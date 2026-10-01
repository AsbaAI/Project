import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * Deux projets :
 * - `interface` : composants et modules sans base (jsdom par défaut ; un
 *   fichier serveur choisit `node` par directive en tête) ;
 * - `services` : services métier contre une vraie base PostgreSQL, la leur
 *   (`comgen_test_web`), pour ne jamais croiser les tests de `@comgen/db`
 *   qui vident `comgen_test`. Séquentiels : ils partagent cette base.
 */
const BASE_SERVICES =
  process.env['DATABASE_URL_TEST_WEB'] ??
  'postgresql://comgen:comgen_dev@127.0.0.1:5432/comgen_test_web'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'interface',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./vitest.setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/server/services/**'],
          css: false,
        },
      },
      {
        extends: true,
        test: {
          name: 'services',
          environment: 'node',
          include: ['src/server/services/**/*.test.ts'],
          globalSetup: ['./vitest.services-setup.ts'],
          env: { DATABASE_URL_TEST: BASE_SERVICES },
          fileParallelism: false,
          testTimeout: 30_000,
        },
      },
    ],
  },
})
