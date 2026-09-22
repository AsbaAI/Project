import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  // Les paquets du dépôt sont publiés en sources TypeScript : Next les
  // transpile lui-même, il n'y a pas d'étape de build intermédiaire.
  transpilePackages: ['@comgen/core'],
  typescript: {
    // Un avertissement de type est une erreur de build (définition de « terminé »).
    ignoreBuildErrors: false,
  },
  poweredByHeader: false,
}

export default withNextIntl(nextConfig)
