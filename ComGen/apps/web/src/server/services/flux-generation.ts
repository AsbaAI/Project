import { type MessageFlux, versLigne } from '@/lib/flux-agents'
import { ErreurAutorisation } from '@/server/auth/droits'

import { type Acteur, ErreurMetier } from './erreurs'
import { type OptionsGeneration, genererVariante, modeDesAgents } from './generation'

/**
 * La génération d'une variante, racontée au fil de l'eau.
 *
 * Même service que partout : `genererVariante`. Ce module n'ajoute aucune
 * règle, il traduit ce que le service annonce — qui répond, l'état de
 * chaque agent, la fin ou l'échec — en lignes que le navigateur lit.
 *
 * Ce que le flux ne dit jamais : le motif technique d'un refus de droit, le
 * message d'une panne imprévue. Un code et, pour un refus de génération
 * seulement, sa raison — écrite pour être lue.
 */

function messageErreur(erreur: unknown): MessageFlux {
  if (erreur instanceof ErreurMetier) {
    return erreur.code === 'GENERATION_REFUSEE'
      ? { type: 'erreur', code: erreur.code, detail: erreur.message }
      : { type: 'erreur', code: erreur.code }
  }
  if (erreur instanceof ErreurAutorisation) return { type: 'erreur', code: 'NON_AUTORISE' }
  // Inattendu : le détail va au journal, l'utilisateur ne reçoit qu'un code.
  console.error('[génération] panne imprévue :', erreur)
  return { type: 'erreur', code: 'INCONNUE' }
}

export function fluxGeneration(
  acteur: Acteur,
  varianteId: string,
  options: OptionsGeneration = {},
): ReadableStream<Uint8Array> {
  const encodeur = new TextEncoder()
  // Vrai dès que le lecteur a coupé : écrire ensuite lèverait une erreur.
  let ferme = false

  return new ReadableStream<Uint8Array>({
    async start(controleur) {
      const envoyer = (message: MessageFlux) => {
        if (ferme) return
        try {
          controleur.enqueue(encodeur.encode(versLigne(message)))
        } catch {
          ferme = true
        }
      }

      try {
        const { mode, motif } = modeDesAgents()
        envoyer({ type: 'debut', mode, ...(motif === undefined ? {} : { motif }) })
        const rapport = await genererVariante(
          acteur,
          { varianteId },
          {
            ...options,
            surEvenement: (evenement) => {
              options.surEvenement?.(evenement)
              envoyer({
                type: 'etat',
                termine: evenement.termine,
                etapes: evenement.etapes.map((etape) => ({
                  role: etape.role,
                  etat: etape.etat,
                  ...(etape.dureeMs === undefined ? {} : { dureeMs: etape.dureeMs }),
                  ...(etape.message === undefined ? {} : { message: etape.message }),
                })),
              })
            },
          },
        )
        envoyer({ type: 'fin', bloquant: rapport.bloquant })
      } catch (erreur) {
        envoyer(messageErreur(erreur))
      } finally {
        if (!ferme) {
          ferme = true
          controleur.close()
        }
      }
    },
    cancel() {
      ferme = true
    },
  })
}
