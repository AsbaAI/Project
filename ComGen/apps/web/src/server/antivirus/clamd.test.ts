// @vitest-environment node
import { createServer } from 'node:net'
import type { AddressInfo, Server, Socket } from 'node:net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ErreurAntivirus } from './antivirus'
import { AntivirusClamd } from './clamd'
import { creerAntivirus } from './index'

const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'

/** Un faux clamd : décode réellement INSTREAM et applique `verdict` sur les octets reçus. */
function creerFauxClamd(verdict: (octets: Buffer) => string): Server {
  return createServer((socket) => {
    void dialoguer(socket, verdict)
  })
}

async function dialoguer(socket: Socket, verdict: (octets: Buffer) => string): Promise<void> {
  let tampon = Buffer.alloc(0)
  let commandeLue = false
  const blocs: Buffer[] = []
  for await (const morceau of socket) {
    tampon = Buffer.concat([tampon, morceau as Buffer])
    if (!commandeLue) {
      const fin = tampon.indexOf(0)
      if (fin === -1) continue
      const commande = tampon.subarray(0, fin).toString('utf8')
      tampon = tampon.subarray(fin + 1)
      commandeLue = true
      if (commande !== 'zINSTREAM') {
        socket.end('UNKNOWN COMMAND\0')
        return
      }
    }
    // Blocs <longueur uint32 BE><octets> ; longueur 0 = fin du flux.
    while (tampon.length >= 4) {
      const longueur = tampon.readUInt32BE(0)
      if (longueur === 0) {
        socket.end(`${verdict(Buffer.concat(blocs))}\0`)
        return
      }
      if (tampon.length < 4 + longueur) break
      blocs.push(tampon.subarray(4, 4 + longueur))
      tampon = tampon.subarray(4 + longueur)
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
  return new Promise((resoudre) => {
    serveur.close(() => resoudre())
  })
}

async function attendreErreur(promesse: Promise<unknown>): Promise<ErreurAntivirus> {
  try {
    await promesse
  } catch (erreur) {
    expect(erreur).toBeInstanceOf(ErreurAntivirus)
    return erreur as ErreurAntivirus
  }
  throw new Error('Aucune erreur levée')
}

const verdictEicar = (octets: Buffer) =>
  octets.includes(EICAR) ? 'stream: Win.Test.EICAR_HDB-1 FOUND' : 'stream: OK'

describe('AntivirusClamd', () => {
  const serveur = creerFauxClamd(verdictEicar)
  let port: number

  beforeAll(async () => {
    port = await ecouter(serveur)
  })

  afterAll(async () => {
    await fermer(serveur)
  })

  it('se déclare en mode `clamd`', () => {
    expect(new AntivirusClamd({ hote: '127.0.0.1', port }).mode).toBe('clamd')
  })

  it('déclare SAIN un fichier sans signature', async () => {
    const antivirus = new AntivirusClamd({ hote: '127.0.0.1', port })
    expect(await antivirus.analyser(new TextEncoder().encode('Bonjour le monde'))).toEqual({
      verdict: 'SAIN',
    })
  })

  it('déclare INFECTE avec la signature quand le démon répond FOUND', async () => {
    const antivirus = new AntivirusClamd({ hote: '127.0.0.1', port })
    expect(await antivirus.analyser(new TextEncoder().encode(`préambule ${EICAR} suite`))).toEqual({
      verdict: 'INFECTE',
      signature: 'Win.Test.EICAR_HDB-1',
    })
  })

  it('découpe en blocs de `tailleBloc` : la signature à cheval sur deux blocs est reconstituée', async () => {
    const antivirus = new AntivirusClamd({ hote: '127.0.0.1', port, tailleBloc: 16 })
    const octets = new TextEncoder().encode(`0123456789${EICAR}`)
    expect(octets.length).toBeGreaterThan(16 * 3)
    expect(await antivirus.analyser(octets)).toEqual({
      verdict: 'INFECTE',
      signature: 'Win.Test.EICAR_HDB-1',
    })
  })

  it('analyse un fichier vide (aucun bloc, seulement le terminateur)', async () => {
    const antivirus = new AntivirusClamd({ hote: '127.0.0.1', port })
    expect(await antivirus.analyser(new Uint8Array(0))).toEqual({ verdict: 'SAIN' })
  })

  it('port fermé → INDISPONIBLE', async () => {
    const libre = createServer()
    const portFerme = await ecouter(libre)
    await fermer(libre)
    const antivirus = new AntivirusClamd({ hote: '127.0.0.1', port: portFerme })
    const erreur = await attendreErreur(antivirus.analyser(new Uint8Array([1])))
    expect(erreur.code).toBe('INDISPONIBLE')
    expect(erreur.cause).toBeDefined()
  })

  it('démon muet au-delà du délai → INDISPONIBLE', async () => {
    // Accepte et ne répond jamais ; ses sockets, jamais lues, doivent être détruites à la main.
    const connexions = new Set<Socket>()
    const muet = createServer((socket) => {
      connexions.add(socket)
    })
    const portMuet = await ecouter(muet)
    try {
      const antivirus = new AntivirusClamd({ hote: '127.0.0.1', port: portMuet, delaiMs: 200 })
      const erreur = await attendreErreur(antivirus.analyser(new Uint8Array([1])))
      expect(erreur.code).toBe('INDISPONIBLE')
      expect(erreur.message).toContain('200 ms')
    } finally {
      for (const socket of connexions) socket.destroy()
      await fermer(muet)
    }
  })

  it('réponse ERROR → REPONSE_INATTENDUE', async () => {
    const enErreur = creerFauxClamd(() => 'INSTREAM size limit exceeded. ERROR')
    const portErreur = await ecouter(enErreur)
    try {
      const antivirus = new AntivirusClamd({ hote: '127.0.0.1', port: portErreur })
      const erreur = await attendreErreur(antivirus.analyser(new Uint8Array([1])))
      expect(erreur.code).toBe('REPONSE_INATTENDUE')
      expect(erreur.message).toContain('INSTREAM size limit exceeded. ERROR')
    } finally {
      await fermer(enErreur)
    }
  })

  it('connexion coupée avant la réponse → INDISPONIBLE', async () => {
    const coupe = createServer((socket) => {
      socket.once('data', () => socket.destroy())
    })
    const portCoupe = await ecouter(coupe)
    try {
      const antivirus = new AntivirusClamd({ hote: '127.0.0.1', port: portCoupe })
      const erreur = await attendreErreur(antivirus.analyser(new Uint8Array([1, 2, 3])))
      expect(erreur.code).toBe('INDISPONIBLE')
    } finally {
      await fermer(coupe)
    }
  })

  it('creerAntivirus({ mode: "clamd" }) renvoie cet adaptateur', () => {
    const cree = creerAntivirus({ mode: 'clamd', hote: '127.0.0.1', port })
    expect(cree).toBeInstanceOf(AntivirusClamd)
    expect(cree.mode).toBe('clamd')
  })
})
