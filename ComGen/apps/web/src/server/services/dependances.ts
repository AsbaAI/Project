import { type Antivirus, creerAntivirus } from '@/server/antivirus'
import { environnement, racineStockage } from '@/server/env'
import { type Stockage, creerStockage } from '@/server/stockage'

import type { DependancesEntree } from './sources'

/**
 * Adaptateurs d'infrastructure construits une fois, depuis l'environnement
 * validé. Les services les reçoivent en paramètre : les tests leur passent
 * les leurs, sans variable d'environnement.
 */

let stockage: Stockage | undefined
let antivirus: Antivirus | undefined

export function dependancesEntree(): DependancesEntree {
  const env = environnement()
  stockage ??= creerStockage(
    env.STOCKAGE_TYPE === 'fichiers'
      ? { type: 'fichiers', racine: racineStockage(env) }
      : {
          type: 's3',
          region: env.S3_REGION ?? '',
          bucket: env.S3_BUCKET ?? '',
          accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
          secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
          forcePathStyle: env.S3_FORCE_PATH_STYLE,
          ...(env.S3_ENDPOINT === undefined ? {} : { endpoint: env.S3_ENDPOINT }),
        },
  )
  antivirus ??= creerAntivirus(
    env.ANTIVIRUS_MODE === 'clamd'
      ? { mode: 'clamd', hote: env.CLAMD_HOTE, port: env.CLAMD_PORT }
      : { mode: 'aucun' },
  )
  return { stockage, antivirus }
}
