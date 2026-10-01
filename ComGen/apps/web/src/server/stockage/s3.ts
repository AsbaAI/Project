/**
 * Stockage compatible S3 (AWS S3, MinIO). Le client est construit par
 * l'appelant (`creerStockage`) : ce module ne lit aucune variable
 * d'environnement.
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import type { S3Client } from '@aws-sdk/client-s3'

import type { ObjetStocke, Stockage } from './stockage'
import { ErreurStockage, verifierCle } from './stockage'

export interface OptionsStockageS3 {
  client: S3Client
  bucket: string
}

export class StockageS3 implements Stockage {
  readonly type = 's3' as const
  private readonly client: S3Client
  private readonly bucket: string

  constructor({ client, bucket }: OptionsStockageS3) {
    this.client = client
    this.bucket = bucket
  }

  async deposer(cle: string, octets: Uint8Array, typeMime: string): Promise<void> {
    verifierCle(cle)
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: cle,
          Body: octets,
          ContentType: typeMime,
          ContentLength: octets.byteLength,
        }),
      )
    } catch (erreur) {
      throw indisponible('écrire', cle, erreur)
    }
  }

  async lire(cle: string): Promise<ObjetStocke | null> {
    verifierCle(cle)
    try {
      const reponse = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: cle }),
      )
      const octets = reponse.Body ? await reponse.Body.transformToByteArray() : new Uint8Array(0)
      return { octets, typeMime: reponse.ContentType ?? 'application/octet-stream' }
    } catch (erreur) {
      if (estAbsent(erreur)) return null
      throw indisponible('lire', cle, erreur)
    }
  }

  async supprimer(cle: string): Promise<void> {
    verifierCle(cle)
    try {
      // S3 répond 204 même si la clé n'existe pas.
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: cle }))
    } catch (erreur) {
      if (estAbsent(erreur)) return
      throw indisponible('supprimer', cle, erreur)
    }
  }

  async existe(cle: string): Promise<boolean> {
    verifierCle(cle)
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: cle }))
      return true
    } catch (erreur) {
      if (estAbsent(erreur)) return false
      throw indisponible('vérifier', cle, erreur)
    }
  }
}

/** `NoSuchKey` (GetObject), `NotFound` (HeadObject) ou tout 404. */
function estAbsent(erreur: unknown): boolean {
  if (typeof erreur !== 'object' || erreur === null) return false
  const { name, $metadata } = erreur as {
    name?: unknown
    $metadata?: { httpStatusCode?: number }
  }
  return name === 'NoSuchKey' || name === 'NotFound' || $metadata?.httpStatusCode === 404
}

function indisponible(action: string, cle: string, cause: unknown): ErreurStockage {
  return new ErreurStockage('INDISPONIBLE', `Impossible de ${action} l'objet ${cle} (S3)`, {
    cause,
  })
}
