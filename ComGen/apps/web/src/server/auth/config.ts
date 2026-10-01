import { rechercherUtilisateurPourConnexion, type UtilisateurConnecte } from '@comgen/db'
import NextAuth, { type NextAuthConfig, type NextAuthResult } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import type { Profile } from 'next-auth'
import type { OIDCConfig } from 'next-auth/providers'

import { connexion } from '@/server/donnees/connexion'
import { type Environnement, environnement } from '@/server/env'

/**
 * Authentification (spécification §3 : OIDC, rôles en base, fournisseur
 * simulé en développement).
 *
 * Principes :
 * - la session ne porte que l'identifiant de l'utilisateur ; les rôles,
 *   l'organisation et la région sont RELUS EN BASE à chaque requête par
 *   `utilisateurCourant()` — un rôle retiré prend effet immédiatement ;
 * - un compte OIDC inconnu de la base est refusé : l'annuaire de
 *   l'application fait foi, pas le fournisseur d'identité ;
 * - le simulateur (choix d'un compte de démonstration) n'existe qu'hors
 *   production, sous `AUTH_SIMULATEUR=true`, et ne connaît aucun mot de
 *   passe : il n'y a rien à deviner, seulement à choisir.
 */

export const FOURNISSEUR_OIDC = 'oidc'
export const FOURNISSEUR_SIMULATEUR = 'simulateur'
export const CHEMIN_CONNEXION = '/connexion'

/** Correspondance d'un profil OIDC avec un compte de l'annuaire : `sub` d'abord, courriel ensuite. */
async function correspondreProfilOidc(profil: Profile): Promise<UtilisateurConnecte | null> {
  if (typeof profil.sub === 'string' && profil.sub.length > 0) {
    const parSujet = await rechercherUtilisateurPourConnexion(connexion(), {
      sujetOidc: profil.sub,
    })
    if (parSujet) return parSujet
  }
  if (typeof profil.email === 'string' && profil.email.length > 0) {
    return rechercherUtilisateurPourConnexion(connexion(), { courriel: profil.email.toLowerCase() })
  }
  return null
}

function fournisseurOidc(env: Environnement): OIDCConfig<Profile> | null {
  if (
    env.AUTH_OIDC_ISSUER === undefined ||
    env.AUTH_OIDC_CLIENT_ID === undefined ||
    env.AUTH_OIDC_CLIENT_SECRET === undefined
  ) {
    return null
  }
  return {
    id: FOURNISSEUR_OIDC,
    name: 'SSO',
    type: 'oidc',
    issuer: env.AUTH_OIDC_ISSUER,
    clientId: env.AUTH_OIDC_CLIENT_ID,
    clientSecret: env.AUTH_OIDC_CLIENT_SECRET,
    checks: ['pkce', 'state'],
  }
}

function fournisseurSimulateur(env: Environnement) {
  if (!env.AUTH_SIMULATEUR || env.NODE_ENV === 'production') return null
  return Credentials({
    id: FOURNISSEUR_SIMULATEUR,
    name: 'Simulateur',
    credentials: { courriel: { type: 'email' } },
    async authorize(identifiants) {
      const courriel = identifiants['courriel']
      if (typeof courriel !== 'string' || courriel.length === 0) return null
      const utilisateur = await rechercherUtilisateurPourConnexion(connexion(), {
        courriel: courriel.toLowerCase(),
      })
      if (!utilisateur) return null
      return { id: utilisateur.id, name: utilisateur.nom, email: utilisateur.courriel }
    },
  })
}

export function construireConfiguration(env: Environnement): NextAuthConfig {
  const oidc = fournisseurOidc(env)
  const simulateur = fournisseurSimulateur(env)
  return {
    secret: env.AUTH_SECRET,
    trustHost: true,
    session: { strategy: 'jwt', maxAge: 12 * 60 * 60 },
    pages: { signIn: CHEMIN_CONNEXION, error: CHEMIN_CONNEXION },
    providers: [...(oidc ? [oidc] : []), ...(simulateur ? [simulateur] : [])],
    callbacks: {
      async signIn({ account, profile }) {
        if (account?.provider !== FOURNISSEUR_OIDC) return true
        if (!profile) return false
        return (await correspondreProfilOidc(profile)) !== null
      },
      async jwt({ token, user, account, profile }) {
        if (account?.provider === FOURNISSEUR_OIDC && profile) {
          const utilisateur = await correspondreProfilOidc(profile)
          if (!utilisateur) return null
          token.sub = utilisateur.id
        } else if (user?.id !== undefined) {
          token.sub = user.id
        }
        // Rien d'autre dans le jeton : ni rôles, ni organisation (relus en base).
        delete token.picture
        return token
      },
      session({ session, token }) {
        if (token.sub !== undefined) session.user.id = token.sub
        return session
      },
    },
  }
}

/** Fournisseurs de connexion disponibles, pour que l'écran n'affiche que ce qui existe. */
export function fournisseursDisponibles(env: Environnement): {
  oidc: boolean
  simulateur: boolean
} {
  return {
    oidc: fournisseurOidc(env) !== null,
    simulateur: fournisseurSimulateur(env) !== null,
  }
}

// Forme « fonction » de NextAuth : la configuration est construite à la
// première requête, pas à l'import — `next build` n'a pas besoin de
// l'environnement d'exécution.
const resultat: NextAuthResult = NextAuth(() => construireConfiguration(environnement()))

export const { handlers, auth, signIn, signOut } = resultat
