/*
 * Disponibilité de l'application, lue par `/api/pret`.
 *
 * Chaque dépendance est sondée en parallèle, bornée par un délai : une
 * sonde qui ne répond pas compte comme un échec, au lieu de faire attendre
 * l'hébergeur indéfiniment. La réponse dit QUELLE dépendance manque, jamais
 * POURQUOI : le message d'une exception de pilote peut porter une chaîne de
 * connexion, un hôte ou un identifiant. Le détail va au journal du serveur.
 */

export type EtatDependance = 'ok' | 'echec'

export interface Sondes {
  base: () => Promise<void>
  stockage: () => Promise<void>
}

export interface Disponibilite {
  pret: boolean
  dependances: Record<keyof Sondes, EtatDependance>
}

export const DELAI_SONDE_MS = 2_000

async function sonder(sonde: () => Promise<void>, delaiMs: number): Promise<EtatDependance> {
  let minuterie: ReturnType<typeof setTimeout> | undefined
  const delai = new Promise<never>((_, rejeter) => {
    minuterie = setTimeout(() => rejeter(new Error('délai de sonde dépassé')), delaiMs)
  })
  try {
    await Promise.race([sonde(), delai])
    return 'ok'
  } catch {
    return 'echec'
  } finally {
    clearTimeout(minuterie)
  }
}

export async function lireDisponibilite(
  sondes: Sondes,
  { delaiMs = DELAI_SONDE_MS }: { delaiMs?: number } = {},
): Promise<Disponibilite> {
  const [base, stockage] = await Promise.all([
    sonder(sondes.base, delaiMs),
    sonder(sondes.stockage, delaiMs),
  ])
  return { pret: base === 'ok' && stockage === 'ok', dependances: { base, stockage } }
}
