import { afterEach, describe, expect, it } from 'vitest'

import { ErreurFournisseur } from '../fournisseurs/types.ts'
import {
  empreinteSecret,
  masquerSecret,
  masquerSecretDansValeur,
  resolveurEnvironnement,
} from './index.ts'

/*
 * Spécification §5.3 : les secrets ne sont jamais renvoyés, seule une
 * empreinte partielle est affichée ; §19 : variables d'environnement
 * uniquement. Les tests vérifient que rien de la valeur ne fuit.
 */

const NOM_VARIABLE = 'COMGEN_TEST_SECRET_ENV'

afterEach(() => {
  delete process.env[NOM_VARIABLE]
})

describe('empreinteSecret', () => {
  it('ne montre que le début et la fin', () => {
    expect(empreinteSecret('sk-ant-api03-abcdefghijklmnop')).toBe('sk-…mnop')
  })

  it('ne montre rien d’un secret court', () => {
    expect(empreinteSecret('court')).toBe('…')
    expect(empreinteSecret('12345678901')).toBe('…')
    expect(empreinteSecret('123456789012')).toBe('123…9012')
  })
})

describe('masquerSecret', () => {
  it('remplace chaque occurrence', () => {
    expect(masquerSecret('a=SECRET;b=SECRET', 'SECRET')).toBe('a=[secret masqué];b=[secret masqué]')
  })

  it('laisse le texte intact pour un secret vide', () => {
    expect(masquerSecret('rien à masquer', '')).toBe('rien à masquer')
  })

  it('masque dans une valeur structurée', () => {
    const masquee = masquerSecretDansValeur(
      { entetes: { cle: 'SECRET' }, liste: ['SECRET'] },
      'SECRET',
    )
    expect(masquee).toEqual({ entetes: { cle: '[secret masqué]' }, liste: ['[secret masqué]'] })
    expect(masquerSecretDansValeur(undefined, 'SECRET')).toBeUndefined()
  })
})

describe('resolveurEnvironnement', () => {
  it('lit la variable nommée par la référence', async () => {
    process.env[NOM_VARIABLE] = 'valeur-de-test'
    await expect(resolveurEnvironnement().resoudre(NOM_VARIABLE)).resolves.toBe('valeur-de-test')
  })

  it.each([
    ['absente', {}],
    ['vide', { [NOM_VARIABLE]: '   ' }],
  ])(
    'échoue en CONFIG en nommant la référence quand la variable est %s',
    async (_cas, environnement) => {
      const erreur = await resolveurEnvironnement(environnement)
        .resoudre(NOM_VARIABLE)
        .then(
          () => null,
          (e: unknown) => e,
        )
      expect(erreur).toBeInstanceOf(ErreurFournisseur)
      expect((erreur as ErreurFournisseur).code).toBe('CONFIG')
      expect((erreur as ErreurFournisseur).fournisseurId).toBeNull()
      expect((erreur as ErreurFournisseur).message).toContain(NOM_VARIABLE)
    },
  )
})
