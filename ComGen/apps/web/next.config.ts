import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  // Les paquets du dépôt sont publiés en sources TypeScript : Next les
  // transpile lui-même, il n'y a pas d'étape de build intermédiaire.
  transpilePackages: ['@comgen/core', '@comgen/db'],
  typescript: {
    // Un avertissement de type est une erreur de build (définition de « terminé »).
    ignoreBuildErrors: false,
  },
  poweredByHeader: false,
  experimental: {
    // Dépôt de sources par action serveur : 50 Mio par envoi (voir
    // TAILLE_MAX_DEPOT_OCTETS), plus la marge de l'encodage multipart. Le
    // proxy d'internationalisation lit le corps : même plafond.
    serverActions: { bodySizeLimit: '52mb' },
    proxyClientMaxBodySize: '52mb',
  },
}

export default withNextIntl(nextConfig)
