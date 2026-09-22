import { describe, expect, it } from 'vitest'
import { verifierIndependanceFamilles } from './independance.ts'

/*
 * Spécification §5.4 et §17 : le VERIFICATEUR ne peut pas appartenir à la
 * même famille de modèles que le REDACTEUR qu'il contrôle. Un modèle qui
 * relit sa propre prose partage ses angles morts. Deux modèles affinés à
 * partir de la même base comptent comme une seule famille.
 */
describe('verifierIndependanceFamilles', () => {
  it('accepte deux familles distinctes', () => {
    const resultat = verifierIndependanceFamilles({
      REDACTEUR: { famille: 'claude', identifiantModele: 'claude-sonnet-5' },
      VERIFICATEUR: { famille: 'gpt', identifiantModele: 'gpt-5' },
    })
    expect(resultat).toEqual({ independant: true })
  })

  it('refuse la même famille pour REDACTEUR et VERIFICATEUR', () => {
    const resultat = verifierIndependanceFamilles({
      REDACTEUR: { famille: 'claude', identifiantModele: 'claude-sonnet-5' },
      VERIFICATEUR: { famille: 'claude', identifiantModele: 'claude-opus-5' },
    })
    expect(resultat).toEqual({ independant: false, motif: 'MEME_FAMILLE', famille: 'claude' })
  })

  it('refuse deux modèles affinés issus de la même base, même sous des familles déclarées différentes', () => {
    const resultat = verifierIndependanceFamilles({
      REDACTEUR: {
        famille: 'acme-redaction',
        identifiantModele: 'acme-redac-v3',
        baseAffinage: 'llama-3.1-70b',
      },
      VERIFICATEUR: {
        famille: 'acme-controle',
        identifiantModele: 'acme-verif-v1',
        baseAffinage: 'llama-3.1-70b',
      },
    })
    expect(resultat).toEqual({
      independant: false,
      motif: 'MEME_BASE_AFFINAGE',
      famille: 'llama-3.1-70b',
    })
  })

  it('refuse un modèle affiné dont la base est la famille de l’autre rôle', () => {
    const resultat = verifierIndependanceFamilles({
      REDACTEUR: { famille: 'llama', identifiantModele: 'llama-3.1-70b' },
      VERIFICATEUR: {
        famille: 'acme-controle',
        identifiantModele: 'acme-verif-v1',
        baseAffinage: 'llama',
      },
    })
    expect(resultat.independant).toBe(false)
  })

  it('compare les familles sans tenir compte de la casse ni des espaces', () => {
    const resultat = verifierIndependanceFamilles({
      REDACTEUR: { famille: ' Claude ', identifiantModele: 'a' },
      VERIFICATEUR: { famille: 'claude', identifiantModele: 'b' },
    })
    expect(resultat.independant).toBe(false)
  })

  it('refuse une affectation incomplète : les deux rôles doivent être affectés pour démarrer', () => {
    const resultat = verifierIndependanceFamilles({
      REDACTEUR: { famille: 'claude', identifiantModele: 'a' },
    })
    expect(resultat.independant).toBe(false)
    if (!resultat.independant) expect(resultat.motif).toBe('ROLE_NON_AFFECTE')
  })
})
