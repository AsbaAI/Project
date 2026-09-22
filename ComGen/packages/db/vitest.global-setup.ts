import { execFileSync } from 'node:child_process'

import { URL_BASE_DE_TEST } from './src/test/base-de-test.ts'

/** Applique les migrations à la base de test avant la première suite. */
export default function preparerBaseDeTest(): void {
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: import.meta.dirname,
    env: { ...process.env, DATABASE_URL: URL_BASE_DE_TEST },
    stdio: 'pipe',
  })
}
