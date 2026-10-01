import { ErreurFournisseur, resolveurEnvironnement } from '@comgen/agents'

/*
 * État du moteur de génération, affiché par la pastille de la barre
 * supérieure (§5.3).
 *
 * La configuration porte une RÉFÉRENCE de secret, jamais sa valeur : ce
 * module vérifie seulement que la référence se résout, et ne renvoie jamais
 * la clé — ni entière, ni en empreinte. Un appelant n'apprend que trois
 * choses : le fournisseur attendu, le nom de la variable à renseigner, et
 * si elle l'est.
 *
 * La bascule en démonstration n'est JAMAIS déduite d'une clé manquante pour
 * produire quand même du texte : une clé absente retire la génération, elle
 * ne la remplace pas en silence (interdit §19, « pas de repli sur un autre
 * modèle : échec explicite »). Ce que l'absence de clé change, c'est ce que
 * l'interface annonce — et, à l'étape 2, l'activation d'un fournisseur
 * simulé explicitement étiqueté.
 */

/** Fournisseur attendu par défaut, et la variable qui porte sa clé (§19). */
export const REFERENCE_CLE_MODELE = 'ANTHROPIC_API_KEY'
export const FOURNISSEUR_PAR_DEFAUT = 'anthropic'

export type EtatMoteur = 'pret' | 'demonstration'

export interface StatutMoteur {
  etat: EtatMoteur
  /** Identifiant du fournisseur attendu, jamais un secret. */
  fournisseur: string
  /** Nom de la variable d'environnement attendue, jamais sa valeur. */
  reference: string
}

/**
 * Lit l'état du moteur. `demonstration` dès que la référence ne se résout
 * pas : absente, vide, ou refusée par le coffre.
 */
export async function statutMoteur(
  environnement: Record<string, string | undefined> = process.env,
): Promise<StatutMoteur> {
  const base = { fournisseur: FOURNISSEUR_PAR_DEFAUT, reference: REFERENCE_CLE_MODELE }
  try {
    await resolveurEnvironnement(environnement).resoudre(REFERENCE_CLE_MODELE)
    return { ...base, etat: 'pret' }
  } catch (erreur) {
    if (erreur instanceof ErreurFournisseur) {
      return { ...base, etat: 'demonstration' }
    }
    throw erreur
  }
}
