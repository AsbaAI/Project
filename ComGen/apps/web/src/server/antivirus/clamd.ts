/**
 * Adaptateur ClamAV : protocole INSTREAM du démon `clamd`, en TCP.
 *
 * Dialogue : `zINSTREAM\0`, puis des blocs `<longueur uint32 BE><octets>`,
 * puis un bloc de longueur nulle ; le démon répond une ligne terminée par
 * `\0` : `stream: OK` ou `stream: <Signature> FOUND`, sinon `... ERROR`.
 */

import { createConnection } from 'node:net'
import type { Socket } from 'node:net'

import type { Antivirus, VerdictAntivirus } from './antivirus'
import { ErreurAntivirus } from './antivirus'

export interface OptionsClamd {
  hote: string
  port: number
  /** Délai d'inactivité de la connexion (connexion comprise). */
  delaiMs?: number
  /** Taille des blocs INSTREAM ; clamd limite la taille totale (StreamMaxLength). */
  tailleBloc?: number
}

const COMMANDE = Buffer.from('zINSTREAM\0', 'ascii')
const TERMINATEUR = Buffer.alloc(4)

export class AntivirusClamd implements Antivirus {
  readonly mode = 'clamd' as const
  private readonly hote: string
  private readonly port: number
  private readonly delaiMs: number
  private readonly tailleBloc: number

  constructor({ hote, port, delaiMs = 10_000, tailleBloc = 64 * 1024 }: OptionsClamd) {
    this.hote = hote
    this.port = port
    this.delaiMs = delaiMs
    this.tailleBloc = tailleBloc
  }

  analyser(octets: Uint8Array): Promise<VerdictAntivirus> {
    return new Promise((resoudre, rejeter) => {
      const socket = createConnection({ host: this.hote, port: this.port })
      let reponse = Buffer.alloc(0)
      let termine = false

      const conclure = (issue: () => void): void => {
        if (termine) return
        termine = true
        socket.destroy()
        issue()
      }
      const echouer = (erreur: ErreurAntivirus): void => conclure(() => rejeter(erreur))

      socket.setTimeout(this.delaiMs)
      socket.on('timeout', () =>
        echouer(
          new ErreurAntivirus(
            'INDISPONIBLE',
            `clamd (${this.hote}:${this.port}) n'a pas répondu en ${this.delaiMs} ms`,
          ),
        ),
      )
      socket.on('error', (cause) =>
        echouer(
          new ErreurAntivirus('INDISPONIBLE', `clamd (${this.hote}:${this.port}) injoignable`, {
            cause,
          }),
        ),
      )
      socket.on('close', () =>
        echouer(
          new ErreurAntivirus(
            'INDISPONIBLE',
            `clamd (${this.hote}:${this.port}) a fermé la connexion avant de répondre`,
          ),
        ),
      )
      socket.on('data', (morceau: Buffer) => {
        reponse = Buffer.concat([reponse, morceau])
        const fin = reponse.indexOf(0)
        if (fin === -1) return
        const texte = reponse.subarray(0, fin).toString('utf8')
        conclure(() => {
          try {
            resoudre(interpreterReponse(texte))
          } catch (erreur) {
            rejeter(erreur)
          }
        })
      })
      socket.on('connect', () => envoyerFlux(socket, octets, this.tailleBloc))
    })
  }
}

/**
 * Écrit commande, blocs et terminateur. Les retours de `write` sont ignorés
 * à dessein : le fichier est borné (TAILLE_MAX_OCTETS) et tient en mémoire.
 */
function envoyerFlux(socket: Socket, octets: Uint8Array, tailleBloc: number): void {
  socket.write(COMMANDE)
  for (let debut = 0; debut < octets.length; debut += tailleBloc) {
    const bloc = octets.subarray(debut, Math.min(debut + tailleBloc, octets.length))
    const entete = Buffer.alloc(4)
    entete.writeUInt32BE(bloc.length, 0)
    socket.write(entete)
    socket.write(bloc)
  }
  socket.write(TERMINATEUR)
}

const INFECTE = /^stream: (.+) FOUND$/

function interpreterReponse(texte: string): VerdictAntivirus {
  if (texte === 'stream: OK') return { verdict: 'SAIN' }
  const signature = INFECTE.exec(texte)?.[1]
  if (signature !== undefined) return { verdict: 'INFECTE', signature }
  throw new ErreurAntivirus('REPONSE_INATTENDUE', `Réponse inattendue de clamd : ${texte}`)
}
