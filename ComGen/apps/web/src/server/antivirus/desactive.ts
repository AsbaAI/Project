import type { Antivirus, VerdictAntivirus } from './antivirus'

/**
 * Mode `aucun` : aucune analyse n'est faite, tout est déclaré SAIN.
 *
 * Ce mode est choisi par l'environnement (configuration explicite), il est
 * journalisé et affiché à l'utilisateur. Il n'est jamais un repli : quand
 * `clamd` est configuré mais injoignable, l'analyse échoue (`INDISPONIBLE`)
 * et le dépôt est bloqué ; on ne bascule pas ici en silence.
 */
export class AntivirusDesactive implements Antivirus {
  readonly mode = 'aucun' as const

  analyser(_octets: Uint8Array): Promise<VerdictAntivirus> {
    return Promise.resolve({ verdict: 'SAIN' })
  }
}
