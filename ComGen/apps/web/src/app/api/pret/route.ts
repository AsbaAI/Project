import { connexion } from '@/server/donnees/connexion'
import { lireDisponibilite } from '@/server/sante'
import { dependancesEntree } from '@/server/services/dependances'

/*
 * Disponibilité : l'instance peut-elle servir ? 200 si la base et le
 * stockage répondent, 503 sinon, avec le nom des dépendances en échec.
 *
 * Le stockage est sondé par une LECTURE d'une clé qui n'existe pas : rien
 * n'est écrit, et une réponse « absent » prouve que le dépôt répond. Une
 * configuration invalide (environnement, stockage) échoue dans sa sonde et
 * se lit comme une dépendance en échec, pas comme un 500.
 */
export const dynamic = 'force-dynamic'

const CLE_SONDE = 'sante/sonde'

export async function GET(): Promise<Response> {
  const etat = await lireDisponibilite({
    base: () => connexion().verifier(),
    stockage: async () => {
      await dependancesEntree().stockage.lire(CLE_SONDE)
    },
  })
  return Response.json(etat, {
    status: etat.pret ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  })
}
