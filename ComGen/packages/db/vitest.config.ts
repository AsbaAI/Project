import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['./vitest.global-setup.ts'],
    // Les tests partagent une base : pas de parallélisme entre fichiers.
    fileParallelism: false,
    testTimeout: 20_000,
  },
})
