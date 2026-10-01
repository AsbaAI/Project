import { describe, expect, it } from 'vitest'

import { REFERENCE_CLE_MODELE, statutMoteur } from './moteur'

describe('statutMoteur', () => {
  it('se dit prêt quand la référence de secret se résout', async () => {
    const statut = await statutMoteur({ [REFERENCE_CLE_MODELE]: 'sk-une-valeur-quelconque' })
    expect(statut.etat).toBe('pret')
  })

  it('bascule en démonstration quand la variable est absente', async () => {
    expect((await statutMoteur({})).etat).toBe('demonstration')
  })

  it('bascule en démonstration quand la variable est vide ou blanche', async () => {
    expect((await statutMoteur({ [REFERENCE_CLE_MODELE]: '' })).etat).toBe('demonstration')
    expect((await statutMoteur({ [REFERENCE_CLE_MODELE]: '   ' })).etat).toBe('demonstration')
  })

  it('ne renvoie jamais la valeur du secret, seulement son nom', async () => {
    const secret = 'sk-ne-doit-jamais-sortir-0123456789'
    const statut = await statutMoteur({ [REFERENCE_CLE_MODELE]: secret })
    const serialise = JSON.stringify(statut)
    expect(serialise).not.toContain(secret)
    expect(serialise).not.toContain(secret.slice(0, 8))
    expect(statut.reference).toBe(REFERENCE_CLE_MODELE)
  })
})
