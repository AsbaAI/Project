import { notFound } from 'next/navigation'

import { contextePour, exigerUtilisateur } from '@/server/auth/session'
import { type Acteur, ErreurMetier } from '@/server/services/erreurs'

/*
 * Aides des pages serveur : l'acteur de la requête, et le chargement d'un
 * objet qui vaut 404 s'il n'existe pas — ou s'il appartient à une autre
 * organisation, ce que la page ne distingue pas et ne doit pas distinguer.
 */

export async function acteurDePage(): Promise<Acteur> {
  const utilisateur = await exigerUtilisateur()
  return { utilisateur, contexte: contextePour(utilisateur) }
}

export async function ou404<T>(chargement: Promise<T>): Promise<T> {
  try {
    return await chargement
  } catch (erreur) {
    if (erreur instanceof ErreurMetier && erreur.code === 'INTROUVABLE') notFound()
    throw erreur
  }
}
