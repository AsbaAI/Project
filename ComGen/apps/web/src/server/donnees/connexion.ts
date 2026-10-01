import { type Connexion, ouvrirConnexion } from '@comgen/db'

import { environnement } from '@/server/env'

/**
 * Une connexion (un pool) par processus. En développement, Next recharge
 * les modules serveur à chaud : la connexion est accrochée à `globalThis`
 * pour ne pas ouvrir un pool par rechargement.
 */
const CLE_GLOBALE = Symbol.for('comgen.connexion')

type GlobalAvecConnexion = typeof globalThis & { [CLE_GLOBALE]?: Connexion }

export function connexion(): Connexion {
  const global = globalThis as GlobalAvecConnexion
  global[CLE_GLOBALE] ??= ouvrirConnexion({ url: environnement().DATABASE_URL })
  return global[CLE_GLOBALE]
}
