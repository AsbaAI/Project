import { attente } from '@/server/attente'
import { requeteDeMemeOrigine } from '@/server/auth/origine'
import { ErreurAuthentification, exigerSession } from '@/server/auth/session'
import { environnement } from '@/server/env'
import { fluxGeneration } from '@/server/services/flux-generation'

/*
 * Génère une variante en racontant le travail des agents au fil de l'eau
 * (une ligne JSON par changement d'état, voir `lib/flux-agents.ts`).
 *
 * La route ne décide de rien : elle contrôle l'origine, relit la session,
 * puis délègue au service. Le droit, l'état de la communication et chaque
 * garde de la contrainte cardinale sont ceux de `genererVariante` — le même
 * service que n'importe quel autre appelant.
 *
 * Un POST qui écrit, sur un cookie de session : d'où le contrôle d'origine,
 * que les actions serveur font d'elles-mêmes et qu'une route API doit faire
 * à la main.
 */

// Deux agents échelonnés prennent quelques secondes : la durée par défaut de
// certaines plateformes (10 s) serait trop juste le jour où un agent réel
// répondrait lentement.
export const maxDuration = 60

const ENTETES_FLUX = {
  'Content-Type': 'application/x-ndjson; charset=utf-8',
  // Jamais mis en cache, jamais mis en tampon par un mandataire : le flux
  // n'a de sens que s'il arrive au fur et à mesure.
  'Cache-Control': 'no-store, no-transform',
  'X-Accel-Buffering': 'no',
} as const

export async function POST(
  request: Request,
  contexte: { params: Promise<{ varianteId: string }> },
): Promise<Response> {
  if (!requeteDeMemeOrigine(request.headers)) {
    return Response.json({ code: 'ORIGINE_REFUSEE' }, { status: 403 })
  }

  let acteur
  try {
    acteur = await exigerSession()
  } catch (erreur) {
    if (erreur instanceof ErreurAuthentification) {
      return Response.json({ code: 'NON_AUTHENTIFIE' }, { status: 401 })
    }
    throw erreur
  }

  const { varianteId } = await contexte.params
  const flux = fluxGeneration(acteur, varianteId, {
    // Le navigateur ferme la page : la chaîne s'arrête avant le prochain agent.
    signal: request.signal,
    attendre: environnement().COMGEN_DELAIS_SIMULATION ? attente(request.signal) : undefined,
  })
  return new Response(flux, { headers: ENTETES_FLUX })
}
