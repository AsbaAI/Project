import type { Antivirus } from './antivirus'
import { AntivirusClamd } from './clamd'
import { AntivirusDesactive } from './desactive'

export type { Antivirus, VerdictAntivirus, CodeErreurAntivirus } from './antivirus'
export { ErreurAntivirus } from './antivirus'
export { AntivirusClamd } from './clamd'
export type { OptionsClamd } from './clamd'
export { AntivirusDesactive } from './desactive'

export type ConfigAntivirus = { mode: 'clamd'; hote: string; port: number } | { mode: 'aucun' }

/** Construit l'adaptateur déclaré par `config` ; le mode n'est jamais deviné. */
export function creerAntivirus(config: ConfigAntivirus): Antivirus {
  if (config.mode === 'aucun') return new AntivirusDesactive()
  return new AntivirusClamd({ hote: config.hote, port: config.port })
}
