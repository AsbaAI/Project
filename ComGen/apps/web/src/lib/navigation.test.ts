import { describe, expect, it } from 'vitest'

import { NAV_TABS, ongletCourant } from './navigation'

describe('NAV_TABS', () => {
  it('porte les six onglets du parcours, sans doublon de chemin', () => {
    expect(NAV_TABS).toHaveLength(6)
    const chemins = NAV_TABS.map((t) => t.href)
    expect(new Set(chemins).size).toBe(chemins.length)
  })

  it('donne une clé de traduction distincte à chaque onglet', () => {
    const cles = NAV_TABS.map((t) => t.key)
    expect(new Set(cles).size).toBe(cles.length)
  })
})

describe('ongletCourant', () => {
  it('marque l’onglet dont le chemin est exactement le chemin courant', () => {
    expect(ongletCourant('/analyses')).toBe('/analyses')
    expect(ongletCourant('/parametres')).toBe('/parametres')
  })

  it('préfère le préfixe le plus long : le constructeur n’est pas la bibliothèque', () => {
    expect(ongletCourant('/gabarits')).toBe('/gabarits')
    expect(ongletCourant('/gabarits/constructeur')).toBe('/gabarits/constructeur')
  })

  it('marque un onglet depuis une sous-page', () => {
    expect(ongletCourant('/approbations/en-attente')).toBe('/approbations')
  })

  it('rattache une route héritée à son onglet', () => {
    expect(ongletCourant('/communications')).toBe('/generateur')
    expect(ongletCourant('/communications/abc123/faits')).toBe('/generateur')
    expect(ongletCourant('/tableau-de-bord')).toBe('/approbations')
  })

  it('n’allume aucun onglet hors du produit', () => {
    expect(ongletCourant('/')).toBeNull()
    expect(ongletCourant('/design')).toBeNull()
  })

  it('ne confond pas un chemin qui commence par les mêmes lettres', () => {
    expect(ongletCourant('/analyses-internes')).toBeNull()
    expect(ongletCourant('/gabaritstheque')).toBeNull()
  })
})
