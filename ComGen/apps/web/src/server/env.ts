import path from 'node:path'

import { z } from 'zod'

/**
 * Configuration du serveur, lue dans les variables d'environnement et
 * validée une fois. Aucun secret n'est lu ailleurs que dans ce module ;
 * aucun secret ne sort de ce module vers le navigateur (les valeurs ne
 * sont jamais passées à un composant client ni renvoyées par une route).
 *
 * Les choix sensibles sont EXPLICITES : l'antivirus n'a pas de mode par
 * défaut, le simulateur de connexion est refusé en production.
 */

const booleen = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1')
  .optional()
  .default(false)

const SchemaEnvironnement = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /**
     * Environnement de déploiement, distinct du mode de build : un build de
     * production sert aussi aux tests de bout en bout. Par défaut, un build
     * de production EST la production ; le dire autrement est explicite.
     */
    COMGEN_ENV: z.enum(['developpement', 'test', 'production']).optional(),
    DATABASE_URL: z.string().url(),
    AUTH_SECRET: z
      .string()
      .min(32, 'AUTH_SECRET : 32 caractères au moins (openssl rand -base64 32)'),
    /** Fournisseur OIDC générique : les trois ensemble, ou aucun. */
    AUTH_OIDC_ISSUER: z.string().url().optional(),
    AUTH_OIDC_CLIENT_ID: z.string().min(1).optional(),
    AUTH_OIDC_CLIENT_SECRET: z.string().min(1).optional(),
    /** Connexion simulée (choix d'un utilisateur de démonstration) : développement et test seulement. */
    AUTH_SIMULATEUR: booleen,
    STOCKAGE_TYPE: z.enum(['fichiers', 's3']).default('fichiers'),
    STOCKAGE_RACINE: z.string().min(1).optional(),
    S3_ENDPOINT: z.string().url().optional(),
    S3_REGION: z.string().min(1).optional(),
    S3_BUCKET: z.string().min(1).optional(),
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    S3_FORCE_PATH_STYLE: booleen,
    ANTIVIRUS_MODE: z.enum(['clamd', 'aucun'], {
      error: "ANTIVIRUS_MODE doit valoir 'clamd' ou, explicitement, 'aucun'",
    }),
    CLAMD_HOTE: z.string().min(1).default('127.0.0.1'),
    CLAMD_PORT: z.coerce.number().int().min(1).max(65535).default(3310),
  })
  .superRefine((env, ctx) => {
    const oidc = [env.AUTH_OIDC_ISSUER, env.AUTH_OIDC_CLIENT_ID, env.AUTH_OIDC_CLIENT_SECRET]
    const renseignes = oidc.filter((v) => v !== undefined).length
    if (renseignes !== 0 && renseignes !== 3) {
      ctx.addIssue({
        code: 'custom',
        message: 'AUTH_OIDC_ISSUER, AUTH_OIDC_CLIENT_ID et AUTH_OIDC_CLIENT_SECRET vont ensemble',
      })
    }
    if (renseignes === 0 && !env.AUTH_SIMULATEUR) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Aucun moyen de connexion : configurez OIDC ou, hors production, AUTH_SIMULATEUR=true',
      })
    }
    if (env.AUTH_SIMULATEUR && environnementDeploiement(env) === 'production') {
      ctx.addIssue({ code: 'custom', message: 'AUTH_SIMULATEUR est interdit en production' })
    }
    if (env.STOCKAGE_TYPE === 's3') {
      for (const nom of [
        'S3_REGION',
        'S3_BUCKET',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
      ] as const) {
        if (env[nom] === undefined) {
          ctx.addIssue({ code: 'custom', message: `${nom} est requis quand STOCKAGE_TYPE=s3` })
        }
      }
    }
  })

type EnvironnementBrut = z.infer<typeof SchemaEnvironnement>

function environnementDeploiement(
  env: Pick<EnvironnementBrut, 'NODE_ENV' | 'COMGEN_ENV'>,
): 'developpement' | 'test' | 'production' {
  return env.COMGEN_ENV ?? (env.NODE_ENV === 'production' ? 'production' : 'developpement')
}

export type Environnement = Omit<EnvironnementBrut, 'COMGEN_ENV'> & {
  COMGEN_ENV: 'developpement' | 'test' | 'production'
}

export class ErreurConfiguration extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ErreurConfiguration'
  }
}

export function analyserEnvironnement(
  source: Readonly<Record<string, string | undefined>>,
): Environnement {
  const resultat = SchemaEnvironnement.safeParse(source)
  if (!resultat.success) {
    const details = resultat.error.issues
      .map((i) => `- ${i.path.join('.') || 'environnement'} : ${i.message}`)
      .join('\n')
    throw new ErreurConfiguration(`Configuration invalide :\n${details}`)
  }
  return { ...resultat.data, COMGEN_ENV: environnementDeploiement(resultat.data) }
}

/** Racine du dépôt local de fichiers : `STOCKAGE_RACINE` ou `<dépôt>/.local/stockage`. */
export function racineStockage(env: Environnement): string {
  return env.STOCKAGE_RACINE ?? path.resolve(process.cwd(), '../../.local/stockage')
}

let memo: Environnement | undefined

/** Lecture paresseuse : la construction (`next build`) n'exige pas la configuration d'exécution. */
export function environnement(): Environnement {
  memo ??= analyserEnvironnement(process.env)
  return memo
}
