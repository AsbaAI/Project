import { describe, expect, it } from 'vitest'

import { lireDisponibilite } from './sante'

/*
 * Disponibilité : chaque dépendance est sondée, avec un délai. La réponse
 * dit laquelle manque, jamais pourquoi : un message d'exception peut porter
 * une chaîne de connexion, un hôte, un identifiant.
 */
const ok = async () => {}
const panne = async () => {
  throw new Error('connect ECONNREFUSED postgresql://comgen:motdepasse@10.0.0.4:5432/comgen')
}
const jamais = () => new Promise<void>(() => {})

describe('lireDisponibilite', () => {
  it('est prête quand toutes les sondes répondent', async () => {
    const etat = await lireDisponibilite({ base: ok, stockage: ok })
    expect(etat).toEqual({ pret: true, dependances: { base: 'ok', stockage: 'ok' } })
  })

  it('nomme la dépendance en échec, sans son message', async () => {
    const etat = await lireDisponibilite({ base: panne, stockage: ok })
    expect(etat).toEqual({ pret: false, dependances: { base: 'echec', stockage: 'ok' } })
    expect(JSON.stringify(etat)).not.toContain('motdepasse')
    expect(JSON.stringify(etat)).not.toContain('10.0.0.4')
  })

  it('compte une sonde trop lente comme un échec', async () => {
    const etat = await lireDisponibilite({ base: ok, stockage: jamais }, { delaiMs: 20 })
    expect(etat).toEqual({ pret: false, dependances: { base: 'ok', stockage: 'echec' } })
  })
})
