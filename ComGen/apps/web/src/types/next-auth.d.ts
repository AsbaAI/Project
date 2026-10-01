import type { DefaultSession } from 'next-auth'

/**
 * La session ne porte que l'identifiant de l'utilisateur en base. Tout le
 * reste (rôles, organisation, région) est relu à chaque requête par
 * `utilisateurCourant()` — voir `server/auth/session.ts`.
 */
declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user']
  }
}
