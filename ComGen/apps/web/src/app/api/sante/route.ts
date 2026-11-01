/*
 * Vivacité : le processus répond. Aucune dépendance sondée — une base
 * lente ne doit pas faire redémarrer une instance saine (c'est le rôle de
 * `/api/pret` de dire si l'instance peut servir). Aucune session requise,
 * aucune donnée exposée.
 */
export const dynamic = 'force-dynamic'

export function GET(): Response {
  return Response.json({ statut: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
}
