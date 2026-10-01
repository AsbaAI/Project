'use server'

import { AuthError } from 'next-auth'

import { getPathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import {
  CHEMIN_CONNEXION,
  FOURNISSEUR_OIDC,
  FOURNISSEUR_SIMULATEUR,
  signIn,
  signOut,
} from '@/server/auth/config'
import { environnement } from '@/server/env'

/**
 * Actions serveur de connexion et de déconnexion. Elles ne reçoivent que
 * des données de formulaire ; la décision (compte connu, fournisseur
 * actif) est prise par la configuration Auth.js côté serveur.
 */

function estLocale(valeur: unknown): valeur is (typeof routing.locales)[number] {
  return typeof valeur === 'string' && (routing.locales as readonly string[]).includes(valeur)
}

function cheminLocalise(locale: unknown, chemin: '/' | typeof CHEMIN_CONNEXION): string {
  return getPathname({ href: chemin, locale: estLocale(locale) ? locale : routing.defaultLocale })
}

function cheminErreur(locale: unknown, code: string): string {
  return `${cheminLocalise(locale, CHEMIN_CONNEXION)}?erreur=${encodeURIComponent(code)}`
}

export async function connecterSimulateur(donnees: FormData): Promise<void> {
  const locale = donnees.get('locale')
  if (!environnement().AUTH_SIMULATEUR) {
    // Le formulaire n'existe pas dans ce cas ; une requête forgée est refusée.
    throw new Error('Le simulateur de connexion est désactivé')
  }
  const courriel = donnees.get('courriel')
  try {
    await signIn(FOURNISSEUR_SIMULATEUR, {
      courriel: typeof courriel === 'string' ? courriel : '',
      redirectTo: cheminLocalise(locale, '/'),
    })
  } catch (erreur) {
    if (erreur instanceof AuthError) {
      const { redirect } = await import('next/navigation')
      redirect(cheminErreur(locale, 'compte-inconnu'))
    }
    throw erreur
  }
}

export async function connecterOidc(donnees: FormData): Promise<void> {
  const locale = donnees.get('locale')
  await signIn(FOURNISSEUR_OIDC, { redirectTo: cheminLocalise(locale, '/') })
}

export async function deconnecter(donnees: FormData): Promise<void> {
  const locale = donnees.get('locale')
  await signOut({ redirectTo: cheminLocalise(locale, CHEMIN_CONNEXION) })
}
