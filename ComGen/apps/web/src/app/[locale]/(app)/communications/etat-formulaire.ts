import type { ResultatDepot } from '@/server/services/sources'

/**
 * Issue d'une action serveur, telle qu'un formulaire l'affiche. `jeton`
 * change à chaque réponse : un même message renvoyé deux fois est annoncé
 * deux fois aux technologies d'assistance.
 */
export type EtatFormulaire =
  | { statut: 'repos' }
  | { statut: 'ok'; jeton: number }
  | { statut: 'depot'; depot: ResultatDepot; jeton: number }
  | {
      statut: 'erreur'
      /** Code d'erreur métier, ou NON_AUTORISE. */
      code: string
      champs?: Record<string, string>
      motifs?: string[]
      /**
       * Valeurs soumises, renvoyées pour être réaffichées : React réinitialise
       * un formulaire après son action, la saisie ne doit pas être perdue.
       */
      valeurs?: Record<string, string>
      jeton: number
    }

export const ETAT_INITIAL: EtatFormulaire = { statut: 'repos' }

/** Valeur soumise d'un champ, à reprendre comme valeur par défaut après une erreur. */
export function valeurSoumise(etat: EtatFormulaire, champ: string): string | undefined {
  return etat.statut === 'erreur' ? etat.valeurs?.[champ] : undefined
}

/** Clé de remontage : un formulaire en erreur se remonte avec les valeurs soumises. */
export function cleFormulaire(etat: EtatFormulaire): string {
  return etat.statut === 'erreur' ? `erreur-${etat.jeton}` : 'saisie'
}
