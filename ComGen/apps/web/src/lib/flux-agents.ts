import { z } from 'zod'

/*
 * Protocole du flux « agents au travail » : ce que la route envoie et ce que
 * le navigateur lit, une ligne JSON par message (NDJSON).
 *
 * Ce module ne contient aucune règle : il décrit la forme des messages et la
 * lit. Il est partagé entre le serveur (qui écrit) et le client (qui lit),
 * donc il n'importe rien du serveur.
 *
 * Chaque message `etat` porte l'état de TOUTES les étapes, comme
 * l'orchestrateur : le client dessine la chronologie entière dès le premier
 * message et n'a aucun écart à recoller.
 *
 * Ce qui arrive du réseau est relu avec un schéma, jamais présumé : une
 * ligne illisible fait échouer le flux au lieu d'être sautée, parce qu'un
 * état qu'on ne comprend pas ne doit pas être affiché comme un autre.
 */

export const ETATS_ETAPE_FLUX = [
  'EN_ATTENTE',
  'EN_COURS',
  'TERMINEE',
  'ECHOUEE',
  'ANNULEE',
] as const

const schemaEtapeFlux = z.object({
  /** Rôle d'agent tel que le contrat le nomme ; la traduction vient de l'interface. */
  role: z.string().min(1),
  etat: z.enum(ETATS_ETAPE_FLUX),
  dureeMs: z.number().nonnegative().optional(),
  message: z.string().optional(),
})

const schemaMessageFlux = z.discriminatedUnion('type', [
  /** Qui répond : annoncé avant le premier agent, pour que l'écran ne le laisse jamais deviner. */
  z.object({
    type: z.literal('debut'),
    mode: z.enum(['simulation', 'reel']),
    motif: z.string().optional(),
  }),
  z.object({
    type: z.literal('etat'),
    etapes: z.array(schemaEtapeFlux),
    termine: z.boolean(),
  }),
  z.object({ type: z.literal('fin'), bloquant: z.boolean() }),
  /**
   * `code` est un code d'erreur métier que l'interface traduit ; `detail`
   * n'accompagne que un refus de génération, dont la raison (« valeur
   * absente du texte final… ») est écrite pour être lue.
   */
  z.object({ type: z.literal('erreur'), code: z.string().min(1), detail: z.string().optional() }),
])

export type EtapeFlux = z.infer<typeof schemaEtapeFlux>
export type MessageFlux = z.infer<typeof schemaMessageFlux>
export type EtatEtapeFlux = EtapeFlux['etat']

export class ErreurFlux extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ErreurFlux'
  }
}

/** Une ligne, terminée par son saut de ligne. */
export function versLigne(message: MessageFlux): string {
  return `${JSON.stringify(message)}\n`
}

/** `null` si la ligne n'est ni du JSON ni un message connu. */
export function lireMessage(ligne: string): MessageFlux | null {
  let brut: unknown
  try {
    brut = JSON.parse(ligne)
  } catch {
    return null
  }
  const resultat = schemaMessageFlux.safeParse(brut)
  return resultat.success ? resultat.data : null
}

/** `null` pour une ligne vide ; une ligne non vide qui ne se lit pas est une erreur. */
function lireLigne(ligne: string): MessageFlux | null {
  if (ligne.trim().length === 0) return null
  const message = lireMessage(ligne)
  if (message === null) throw new ErreurFlux('Message illisible dans le flux des agents')
  return message
}

/**
 * Les messages d'un corps de réponse, au fil de leur arrivée.
 *
 * Le réseau découpe n'importe où — au milieu d'une ligne, au milieu d'un
 * caractère accentué codé sur deux octets. Le décodeur garde donc l'octet
 * en attente d'un bloc à l'autre, et la ligne incomplète attend son
 * complément.
 */
export async function* messagesDuFlux(
  corps: ReadableStream<Uint8Array>,
): AsyncGenerator<MessageFlux, void, void> {
  const decodeur = new TextDecoder()
  const lecteur = corps.getReader()
  let reste = ''

  try {
    for (;;) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- lecture séquentielle d'un flux : chaque bloc dépend du précédent.
      const { done, value } = await lecteur.read()
      if (done) break
      reste += decodeur.decode(value, { stream: true })
      const lignes = reste.split('\n')
      reste = lignes.pop() ?? ''
      for (const ligne of lignes) {
        const message = lireLigne(ligne)
        if (message !== null) yield message
      }
    }
    reste += decodeur.decode()
    const dernier = lireLigne(reste)
    if (dernier !== null) yield dernier
  } finally {
    lecteur.releaseLock()
  }
}
