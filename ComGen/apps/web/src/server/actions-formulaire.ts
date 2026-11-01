import { getLocale } from 'next-intl/server'
import { revalidatePath } from 'next/cache'

import { redirect } from '@/i18n/navigation'
import { CHEMIN_CONNEXION } from '@/server/auth/config'
import { ErreurAutorisation } from '@/server/auth/droits'
import { ErreurAuthentification, exigerSession } from '@/server/auth/session'
import type { Acteur } from '@/server/services/erreurs'
import { ErreurMetier } from '@/server/services/erreurs'

import type { EtatFormulaire } from '@/app/[locale]/(app)/communications/etat-formulaire'

/*
 * Plomberie commune des actions serveur : lire un champ, et exécuter une
 * opération pour l'acteur de la session en traduisant son issue en un état
 * affichable. Les actions elles-mêmes ne décident de rien ; ce module non
 * plus — il ne connaît ni service, ni règle.
 */

export function texte(formulaire: FormData, champ: string): string | undefined {
  const valeur = formulaire.get(champ)
  return typeof valeur === 'string' ? valeur : undefined
}

/** Vrai si la case est cochée : un interrupteur absent du formulaire vaut faux. */
export function coche(formulaire: FormData, champ: string): boolean {
  return formulaire.get(champ) !== null
}

/** Lignes non vides d'une zone de texte, détourées. */
export function lignes(formulaire: FormData, champ: string): string[] {
  return (texte(formulaire, champ) ?? '')
    .split('\n')
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne !== '')
}

let jeton = 0
export const prochainJeton = () => {
  jeton += 1
  return jeton
}

/**
 * Exécute une opération pour l'acteur de la session. Une erreur attendue
 * (métier, droit) devient un état affichable ; toute autre erreur remonte
 * telle quelle jusqu'à la page d'erreur : jamais de succès supposé.
 */
export async function executer(
  formulaire: FormData,
  operation: (acteur: Acteur) => Promise<EtatFormulaire | void>,
): Promise<EtatFormulaire> {
  const valeurs: Record<string, string> = {}
  for (const [cle, valeur] of formulaire.entries()) {
    if (typeof valeur === 'string') valeurs[cle] = valeur
  }
  let acteur: Acteur
  try {
    acteur = await exigerSession()
  } catch (erreur) {
    if (erreur instanceof ErreurAuthentification) {
      redirect({ href: CHEMIN_CONNEXION, locale: await getLocale() })
    }
    throw erreur
  }
  try {
    const resultat = await operation(acteur)
    revalidatePath('/', 'layout')
    return resultat ?? { statut: 'ok', jeton: prochainJeton() }
  } catch (erreur) {
    if (erreur instanceof ErreurMetier) {
      return {
        statut: 'erreur',
        code: erreur.code,
        ...(erreur.details.champs ? { champs: { ...erreur.details.champs } } : {}),
        ...(erreur.details.motifs ? { motifs: [...erreur.details.motifs] } : {}),
        valeurs,
        jeton: prochainJeton(),
      }
    }
    if (erreur instanceof ErreurAutorisation) {
      return { statut: 'erreur', code: 'NON_AUTORISE', valeurs, jeton: prochainJeton() }
    }
    throw erreur
  }
}
