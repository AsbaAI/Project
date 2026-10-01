import { S3Client } from '@aws-sdk/client-s3'

import { StockageFichiers } from './fichiers'
import { StockageS3 } from './s3'
import type { Stockage } from './stockage'

export type { ObjetStocke, Stockage, CodeErreurStockage } from './stockage'
export { ErreurStockage, cleSource, verifierCle } from './stockage'
export { StockageFichiers } from './fichiers'
export { StockageS3 } from './s3'
export type { OptionsStockageS3 } from './s3'

export type ConfigStockage =
  | { type: 'fichiers'; racine: string }
  | {
      type: 's3'
      endpoint?: string
      region: string
      bucket: string
      accessKeyId: string
      secretAccessKey: string
      forcePathStyle?: boolean
    }

/**
 * Construit l'adaptateur décrit par `config`. La configuration vient de
 * l'appelant (lecture de l'environnement faite ailleurs, une seule fois).
 */
export function creerStockage(config: ConfigStockage): Stockage {
  if (config.type === 'fichiers') return new StockageFichiers(config.racine)
  const client = new S3Client({
    region: config.region,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    ...(config.endpoint === undefined ? {} : { endpoint: config.endpoint }),
    ...(config.forcePathStyle === undefined ? {} : { forcePathStyle: config.forcePathStyle }),
  })
  return new StockageS3({ client, bucket: config.bucket })
}
