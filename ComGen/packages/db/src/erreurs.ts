/**
 * Erreurs de la couche données. Toutes portent un `code` stable que
 * l'application traduit ; le message est destiné aux journaux.
 */
export type CodeErreurDonnees =
  | 'ACCES_INTERDIT'
  | 'ECRITURE_CONTENU_INTERDITE'
  | 'CONTENU_FIGE'
  | 'INTROUVABLE'
  | 'AMENDEMENT_SANS_APPUI'
  | 'OPERATION_NON_PRISE_EN_CHARGE'

export class ErreurDonnees extends Error {
  readonly code: CodeErreurDonnees

  constructor(code: CodeErreurDonnees, message: string) {
    super(message)
    this.name = 'ErreurDonnees'
    this.code = code
  }
}

export function estErreurDonnees(
  erreur: unknown,
  code?: CodeErreurDonnees,
): erreur is ErreurDonnees {
  return erreur instanceof ErreurDonnees && (code === undefined || erreur.code === code)
}
