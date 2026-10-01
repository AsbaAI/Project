// @vitest-environment node
import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'

import { S3Client } from '@aws-sdk/client-s3'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { creerStockage } from './index'
import { StockageS3 } from './s3'
import { ErreurStockage } from './stockage'

const BUCKET = 'comgen-test'
const CLE = 'org-1/sources/src-1/rapport.pdf'
const OCTETS = new Uint8Array([1, 2, 3, 250, 0, 7])

interface ObjetMemoire {
  octets: Buffer
  typeMime: string
}

/**
 * Faux serveur S3 en mémoire, chemin `/<bucket>/<clé>` (`forcePathStyle`).
 * Suffisant pour Put/Get/Head/Delete ; tout le reste répond 501.
 */
function creerFauxS3(): { serveur: Server; objets: Map<string, ObjetMemoire> } {
  const objets = new Map<string, ObjetMemoire>()
  const serveur = createServer((requete, reponse) => {
    void traiter(requete, reponse, objets)
  })
  return { serveur, objets }
}

async function lireCorps(requete: IncomingMessage): Promise<Buffer> {
  const morceaux: Buffer[] = []
  for await (const morceau of requete) morceaux.push(morceau as Buffer)
  return Buffer.concat(morceaux)
}

function repondreAbsent(reponse: ServerResponse, methode: string | undefined): void {
  reponse.writeHead(404, { 'content-type': 'application/xml' })
  reponse.end(
    methode === 'HEAD' ? undefined : '<?xml version="1.0"?><Error><Code>NoSuchKey</Code></Error>',
  )
}

async function traiter(
  requete: IncomingMessage,
  reponse: ServerResponse,
  objets: Map<string, ObjetMemoire>,
): Promise<void> {
  const url = new URL(requete.url ?? '/', 'http://127.0.0.1')
  const prefixe = `/${BUCKET}/`
  if (!url.pathname.startsWith(prefixe)) {
    reponse.writeHead(501)
    reponse.end()
    return
  }
  const cle = decodeURIComponent(url.pathname.slice(prefixe.length))
  const corps = await lireCorps(requete)
  switch (requete.method) {
    case 'PUT': {
      objets.set(cle, {
        octets: corps,
        typeMime: requete.headers['content-type'] ?? 'application/octet-stream',
      })
      reponse.writeHead(200, { etag: '"faux"' })
      reponse.end()
      return
    }
    case 'GET':
    case 'HEAD': {
      const objet = objets.get(cle)
      if (!objet) {
        repondreAbsent(reponse, requete.method)
        return
      }
      reponse.writeHead(200, {
        'content-type': objet.typeMime,
        'content-length': String(objet.octets.length),
      })
      reponse.end(requete.method === 'HEAD' ? undefined : objet.octets)
      return
    }
    case 'DELETE': {
      objets.delete(cle)
      reponse.writeHead(204)
      reponse.end()
      return
    }
    default: {
      reponse.writeHead(501)
      reponse.end()
    }
  }
}

function ecouter(serveur: Server): Promise<number> {
  return new Promise((resoudre) => {
    serveur.listen(0, '127.0.0.1', () => {
      resoudre((serveur.address() as AddressInfo).port)
    })
  })
}

function fermer(serveur: Server): Promise<void> {
  return new Promise((resoudre, rejeter) => {
    serveur.close((erreur) => (erreur ? rejeter(erreur) : resoudre()))
  })
}

function clientPour(port: number): S3Client {
  return new S3Client({
    endpoint: `http://127.0.0.1:${port}`,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
    maxAttempts: 1,
  })
}

async function attendreErreur(promesse: Promise<unknown>): Promise<ErreurStockage> {
  try {
    await promesse
  } catch (erreur) {
    expect(erreur).toBeInstanceOf(ErreurStockage)
    return erreur as ErreurStockage
  }
  throw new Error('Aucune erreur levée')
}

describe('StockageS3', () => {
  const faux = creerFauxS3()
  let port: number
  let stockage: StockageS3

  beforeAll(async () => {
    port = await ecouter(faux.serveur)
    stockage = new StockageS3({ client: clientPour(port), bucket: BUCKET })
  })

  afterAll(async () => {
    await fermer(faux.serveur)
  })

  beforeEach(() => {
    faux.objets.clear()
  })

  it('se déclare de type `s3`', () => {
    expect(stockage.type).toBe('s3')
  })

  it('dépose (PutObject) puis relit (GetObject) octets et type MIME', async () => {
    await stockage.deposer(CLE, OCTETS, 'application/pdf')
    expect(faux.objets.get(CLE)?.typeMime).toBe('application/pdf')
    expect(Array.from(faux.objets.get(CLE)?.octets ?? [])).toEqual(Array.from(OCTETS))

    const objet = await stockage.lire(CLE)
    expect(objet?.typeMime).toBe('application/pdf')
    expect(Array.from(objet?.octets ?? [])).toEqual(Array.from(OCTETS))
  })

  it('lit `null` sur NoSuchKey et `existe` répond faux (HeadObject 404)', async () => {
    expect(await stockage.lire('org-1/sources/absent')).toBeNull()
    expect(await stockage.existe('org-1/sources/absent')).toBe(false)
  })

  it('existe (HeadObject) répond vrai après dépôt', async () => {
    await stockage.deposer(CLE, OCTETS, 'application/pdf')
    expect(await stockage.existe(CLE)).toBe(true)
  })

  it('supprime (DeleteObject), sans effet si absent', async () => {
    await stockage.deposer(CLE, OCTETS, 'application/pdf')
    await stockage.supprimer(CLE)
    expect(faux.objets.has(CLE)).toBe(false)
    await expect(stockage.supprimer(CLE)).resolves.toBeUndefined()
  })

  it('refuse une clé invalide sans appeler le serveur', async () => {
    expect((await attendreErreur(stockage.deposer('../x', OCTETS, 'x/y'))).code).toBe(
      'CLE_INVALIDE',
    )
    expect((await attendreErreur(stockage.lire('seul'))).code).toBe('CLE_INVALIDE')
    expect((await attendreErreur(stockage.supprimer('/abs/x'))).code).toBe('CLE_INVALIDE')
    expect(faux.objets.size).toBe(0)
  })

  it('serveur injoignable → INDISPONIBLE avec la cause', async () => {
    const libre = createServer()
    const portFerme = await ecouter(libre)
    await fermer(libre)
    const injoignable = new StockageS3({ client: clientPour(portFerme), bucket: BUCKET })

    const erreur = await attendreErreur(injoignable.lire(CLE))
    expect(erreur.code).toBe('INDISPONIBLE')
    expect(erreur.cause).toBeDefined()
    expect((await attendreErreur(injoignable.deposer(CLE, OCTETS, 'x/y'))).code).toBe(
      'INDISPONIBLE',
    )
    expect((await attendreErreur(injoignable.supprimer(CLE))).code).toBe('INDISPONIBLE')
  })

  it('creerStockage({ type: "s3" }) construit un adaptateur fonctionnel', async () => {
    const cree = creerStockage({
      type: 's3',
      endpoint: `http://127.0.0.1:${port}`,
      region: 'us-east-1',
      bucket: BUCKET,
      accessKeyId: 'test',
      secretAccessKey: 'test',
      forcePathStyle: true,
    })
    expect(cree.type).toBe('s3')
    await cree.deposer(CLE, OCTETS, 'text/plain')
    expect((await cree.lire(CLE))?.typeMime).toBe('text/plain')
  })
})
