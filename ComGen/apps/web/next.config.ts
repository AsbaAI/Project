import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

/*
 * Next ne lit que les `.env` de `apps/web`. Le dépôt n'en a qu'un, à la
 * racine de l'espace de travail, partagé avec Prisma : il est chargé ici.
 * `loadEnvFile` n'écrase rien, donc un `.env` local à `apps/web` ou les
 * variables de la plateforme restent prioritaires.
 */
const FICHIER_ENV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..', '.env')
if (existsSync(FICHIER_ENV)) process.loadEnvFile(FICHIER_ENV)

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/* La version affichée en pied de page vient du manifeste, à la construction :
 * une constante recopiée à la main finit toujours par mentir. */
const version = JSON.parse(
  readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'package.json'), 'utf8'),
).version

const nextConfig: NextConfig = {
  env: { COMGEN_VERSION: version },
  // Les paquets du dépôt sont publiés en sources TypeScript : Next les
  // transpile lui-même, il n'y a pas d'étape de build intermédiaire.
  transpilePackages: ['@comgen/agents', '@comgen/core', '@comgen/db'],
  typescript: {
    // Un avertissement de type est une erreur de build (définition de « terminé »).
    ignoreBuildErrors: false,
  },
  poweredByHeader: false,
  // Racine du traçage des fichiers serveur : l'espace pnpm (`ComGen/`), pas
  // le dépôt Git qui l'héberge. Le build s'exécute toujours dans apps/web.
  outputFileTracingRoot: path.join(process.cwd(), '../..'),
  experimental: {
    // Dépôt de sources par action serveur : 50 Mio par envoi (voir
    // TAILLE_MAX_DEPOT_OCTETS), plus la marge de l'encodage multipart. Le
    // proxy d'internationalisation lit le corps : même plafond.
    serverActions: { bodySizeLimit: '52mb' },
    proxyClientMaxBodySize: '52mb',
  },
}

export default withNextIntl(nextConfig)
