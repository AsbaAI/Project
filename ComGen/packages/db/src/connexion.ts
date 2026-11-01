import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from './generated/client.ts'

/**
 * Clé du client Prisma nu : le paquet ne l'exporte pas, le code applicatif
 * ne la voit donc pas et n'a accès à la base que par un contexte cloisonné.
 *
 * Elle vient du registre global (`Symbol.for`) et non d'un symbole propre à
 * ce module : l'application peut embarquer ce module en plusieurs copies,
 * et la connexion qu'elle partage doit rester lisible de toutes. Avec un
 * symbole local, une connexion ouverte par une copie était illisible pour
 * une autre — la première route API créée aurait répondu 500. Ce n'est pas
 * une frontière de sécurité (le code du même processus peut toujours lister
 * les symboles d'un objet) : c'est une barrière contre l'usage par mégarde,
 * que le typage continue d'assurer.
 */
export const CLIENT_BRUT: unique symbol = Symbol.for('comgen.client-brut')

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
