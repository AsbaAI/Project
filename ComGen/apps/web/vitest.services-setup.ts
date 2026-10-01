import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/** Applique les migrations à la base des tests de services avant la première suite. */
export default function preparerBaseServices(): void {
  const url =
    process.env['DATABASE_URL_TEST_WEB'] ??
    'postgresql://comgen:comgen_dev@127.0.0.1:5432/comgen_test_web'
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: fileURLToPath(new URL('../../packages/db', import.meta.url)),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  })
}
