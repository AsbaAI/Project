import { defineConfig } from 'prisma/config'

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
    seed: 'node --experimental-strip-types prisma/seed.ts',
  },
  ...(url === undefined ? {} : { datasource: { url } }),
})
