import path from 'node:path'

/*
 * Environnement du serveur testé par Playwright. Une base dédiée
 * (`comgen_e2e`), remise au jeu de démonstration avant chaque passe, et un
 * dépôt de fichiers à part : les tests ne touchent jamais la base de
 * développement. Le secret est une valeur de test, sans portée hors de
 * cette base jetable.
 */
const RACINE_DEPOT = path.resolve(import.meta.dirname, '..', '..', '..')

export const PORT_E2E = 3100
export const URL_E2E = `http://127.0.0.1:${PORT_E2E}`

export const ENV_E2E = {
  COMGEN_ENV: 'test',
  DATABASE_URL:
    process.env['DATABASE_URL_E2E'] ?? 'postgresql://comgen:comgen_dev@127.0.0.1:5432/comgen_e2e',
  AUTH_SECRET: 'e2e-secret-de-test-sans-valeur-hors-de-la-base-jetable',
  AUTH_URL: URL_E2E,
  AUTH_SIMULATEUR: 'true',
  ANTIVIRUS_MODE: 'aucun',
  STOCKAGE_TYPE: 'fichiers',
  STOCKAGE_RACINE: path.join(RACINE_DEPOT, '.local', 'e2e', 'stockage'),
} as const

/** Comptes de démonstration utilisés par les tests (identifiants du seed). */
export const COMPTES = {
  /** Rédactrice Helvea : écrans capturés, jamais modifiés par un test. */
  redactrice: {
    courriel: 'claire.fontaine@helvea.example',
    etat: path.join(import.meta.dirname, '.auth', 'redactrice.json'),
  },
  /** Rédactrice Kestrel : parcours qui écrivent, isolés des captures par l'organisation. */
  parcours: {
    courriel: 'olivia.hart@kestrel.example',
    etat: path.join(import.meta.dirname, '.auth', 'parcours.json'),
  },
} as const
