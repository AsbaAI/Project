/**
 * Analyse antivirale des fichiers déposés (spécification §10, mode FICHIER).
 *
 * Deux modes, choisis par l'environnement et jamais devinés :
 * - `clamd` : démon ClamAV joint en TCP (protocole INSTREAM) ;
 * - `aucun` : aucune analyse. Ce mode est explicite, journalisé et
 *   affiché à l'utilisateur ; il n'est pas un repli silencieux quand le
 *   démon est injoignable — un démon injoignable est une erreur.
 */

export type VerdictAntivirus = { verdict: 'SAIN' } | { verdict: 'INFECTE'; signature: string }

export interface Antivirus {
  readonly mode: 'clamd' | 'aucun'
  analyser(octets: Uint8Array): Promise<VerdictAntivirus>
}

export type CodeErreurAntivirus = 'INDISPONIBLE' | 'REPONSE_INATTENDUE'

export class ErreurAntivirus extends Error {
  readonly code: CodeErreurAntivirus

  constructor(code: CodeErreurAntivirus, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ErreurAntivirus'
    this.code = code
  }
}
