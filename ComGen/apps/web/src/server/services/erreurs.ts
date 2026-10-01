import type { MotifRefus } from '@comgen/core'
import type { UtilisateurConnecte, ContexteDonnees } from '@comgen/db'

/**
 * Services métier : la seule couche qui écrit. Chaque fonction reçoit
 * l'acteur (utilisateur relu en base + contexte cloisonné sur son
 * organisation), vérifie le droit, valide l'entrée, puis écrit. Les pages
 * et actions serveur ne font que traduire l'entrée et la sortie.
 */
export interface Acteur {
  utilisateur: UtilisateurConnecte
  contexte: ContexteDonnees
}

export type CodeErreurMetier =
  /** Absent, ou appartenant à une autre organisation : on ne distingue pas. */
  | 'INTROUVABLE'
  | 'DONNEES_INVALIDES'
  /** L'objet n'est pas dans un état où cette opération a un sens. */
  | 'ETAT_INCOMPATIBLE'
  /** La garde de la machine à états refuse ; `motifs` dit tout ce qui manque. */
  | 'TRANSITION_REFUSEE'
  /** Transition réservée à un autre parcours (génération, approbation, envoi). */
  | 'TRANSITION_NON_MANUELLE'
  /** L'objet a changé entre la lecture et l'écriture. */
  | 'CONFLIT'
  | 'MODE_NON_DISPONIBLE'
  | 'LANGUE_NON_AUTORISEE'
  | 'CITATION_INVALIDE'
  | 'VALEUR_HORS_CITATION'
  | 'SOURCE_EN_DOUBLE'
  | 'TEXTE_ABSENT'
  | 'FICHIER_REFUSE'

export interface DetailsErreurMetier {
  /** Champ de formulaire → code de message. */
  champs?: Readonly<Record<string, string>>
  motifs?: readonly MotifRefus[]
}

export class ErreurMetier extends Error {
  readonly code: CodeErreurMetier
  readonly details: DetailsErreurMetier

  constructor(code: CodeErreurMetier, message: string, details: DetailsErreurMetier = {}) {
    super(message)
    this.name = 'ErreurMetier'
    this.code = code
    this.details = details
  }
}

export function introuvable(quoi: string, id: string): ErreurMetier {
  return new ErreurMetier('INTROUVABLE', `${quoi} ${id} introuvable`)
}
