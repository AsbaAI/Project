/**
 * Secrets des fournisseurs (spécification §5.3) : la configuration porte une
 * référence, jamais la valeur. La valeur est résolue au dernier moment, ne
 * sort jamais de l'adaptateur et n'apparaît ni dans les erreurs ni dans les
 * journaux — seule une empreinte partielle est affichable.
 */

import { ErreurFournisseur } from '../fournisseurs/types.ts'

export interface ResolveurSecret {
  resoudre(reference: string): Promise<string>
}

/** Coffre minimal : variables d'environnement (§19, « variables d'environnement uniquement »). */
export function resolveurEnvironnement(
  environnement: Record<string, string | undefined> = process.env,
): ResolveurSecret {
  return {
    async resoudre(reference: string): Promise<string> {
      const valeur = environnement[reference]
      if (valeur === undefined || valeur.trim() === '') {
        throw new ErreurFournisseur(
          'CONFIG',
          `Secret introuvable : la variable d'environnement « ${reference} » est absente ou vide.`,
          { fournisseurId: null },
        )
      }
      return valeur
    },
  }
}

const LONGUEUR_MINIMALE_EMPREINTE = 12

/**
 * Empreinte affichable : début et fin seulement. Sous douze caractères, on
 * ne montre rien du tout : trop court pour qu'une partie ne trahisse pas le reste.
 */
export function empreinteSecret(valeur: string): string {
  if (valeur.length < LONGUEUR_MINIMALE_EMPREINTE) {
    return '…'
  }
  return `${valeur.slice(0, 3)}…${valeur.slice(-4)}`
}

export const MARQUEUR_SECRET_MASQUE = '[secret masqué]'

/** Remplace chaque occurrence du secret. Un secret vide ne masque rien. */
export function masquerSecret(texte: string, secret: string): string {
  if (secret === '') {
    return texte
  }
  return texte.split(secret).join(MARQUEUR_SECRET_MASQUE)
}

/**
 * Masque le secret dans une valeur arbitraire (réponse brute, corps
 * d'erreur) en passant par sa forme JSON. Une valeur non sérialisable est
 * remplacée par son type : mieux vaut perdre du détail que laisser fuir.
 */
export function masquerSecretDansValeur(valeur: unknown, secret: string): unknown {
  if (valeur === undefined) {
    return undefined
  }
  try {
    const json = JSON.stringify(valeur)
    if (json === undefined) {
      return undefined
    }
    return JSON.parse(masquerSecret(json, secret))
  } catch {
    return `[valeur non sérialisable : ${typeof valeur}]`
  }
}
