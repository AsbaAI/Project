import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'prisma/config'

/*
 * Prisma 7 ne charge plus `.env` de lui-même. Le fichier unique de l'espace
 * de travail (`ComGen/.env`) est lu ici, sinon `migrate` échoue sur une
 * installation neuve qui suit le README. `loadEnvFile` n'écrase jamais une
 * variable déjà posée : le shell, Vercel et Playwright gardent la main.
 */
const FICHIER_ENV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..', '.env')
if (existsSync(FICHIER_ENV)) process.loadEnvFile(FICHIER_ENV)

/**
 * Configuration Prisma 7. L'URL de la base ne vit que dans l'environnement
 * (`DATABASE_URL`), jamais dans le schéma ni dans le dépôt. Elle est
 * facultative ici pour que `prisma generate` (postinstall) fonctionne sans
 * base ; `migrate` et `db seed` échouent explicitement si elle manque.
 *
 * `DATABASE_URL_UNPOOLED` (posée par l'intégration Neon de Vercel) passe
 * devant : les migrations prennent des verrous de session, qu'un pooler en
 * mode transaction ne garantit pas. L'application, elle, reste sur le pool.
 */
const url = process.env['DATABASE_URL_UNPOOLED'] || process.env['DATABASE_URL']

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node --env-file-if-exists=../../.env --experimental-strip-types prisma/seed.ts',
  },
  ...(url === undefined ? {} : { datasource: { url } }),
})
