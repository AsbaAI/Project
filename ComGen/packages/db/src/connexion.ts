import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from './generated/client.ts'

/** Clé privée du module : le client Prisma nu ne sort jamais de ce paquet. */
export const CLIENT_BRUT: unique symbol = Symbol('comgen.client-brut')

/**
 * Une connexion à la base (un pool). À ouvrir une fois par processus et à
 * partager ; les contextes cloisonnés se créent à partir d'elle.
 */
export interface Connexion {
  readonly [CLIENT_BRUT]: PrismaClient
  fermer(): Promise<void>
}

export interface OptionsConnexion {
  /** URL PostgreSQL. Vient de l'environnement, jamais du code. */
  url: string
  /** Taille maximale du pool `pg` (défaut : celle de `pg`). */
  connexionsMax?: number
}

export function ouvrirConnexion(options: OptionsConnexion): Connexion {
  const adapter = new PrismaPg({
    connectionString: options.url,
    ...(options.connexionsMax === undefined ? {} : { max: options.connexionsMax }),
  })
  const client = new PrismaClient({ adapter })
  return {
    [CLIENT_BRUT]: client,
    fermer: () => client.$disconnect(),
  }
}
