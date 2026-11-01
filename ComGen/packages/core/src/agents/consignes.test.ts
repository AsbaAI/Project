import { describe, expect, it } from 'vitest'

import { verifierConsigne } from './consignes.ts'

const SAINE =
  'Tu rédiges pour une audience interne. Appuie chaque phrase sur un fait de la fiche et émets une référence au lieu de la valeur.'

describe('verifierConsigne', () => {
  it('laisse passer une consigne qui ne demande rien d’interdit', () => {
    expect(verifierConsigne(SAINE)).toEqual([])
  })

  it('refuse une consigne qui demande d’écrire une valeur', () => {
    for (const phrase of [
      'Écris la date de la migration dans la première phrase.',
      'Recopie le numéro de version depuis la source.',
      'Indique toujours les montants concernés.',
      'ecris la date exacte',
    ]) {
      expect(
        verifierConsigne(phrase).map((c) => c.code),
        phrase,
      ).toContain('VALEUR_ECRITE')
    }
  })

  it('refuse une consigne qui demande d’inventer ou de deviner', () => {
    expect(verifierConsigne('Si une information manque, estime-la.')[0]).toMatchObject({
      code: 'INVENTION',
    })
    expect(verifierConsigne('Complète les trous avec ce qui semble plausible.')[0]?.code).toBe(
      'INVENTION',
    )
  })

  it('refuse une consigne qui demande d’ignorer la source', () => {
    expect(
      verifierConsigne('Ignore les faits si le texte est plus fluide sans eux.')[0],
    ).toMatchObject({ code: 'SOURCE_IGNOREE' })
  })

  it('refuse une consigne qui demande du texte libre', () => {
    expect(
      verifierConsigne('Réponds en texte libre, sans structure.').map((c) => c.code),
    ).toContain('TEXTE_LIBRE')
  })

  it('rend la phrase fautive, pas la consigne entière', () => {
    const consigne = `${SAINE} Écris la date au format long. Reste sobre.`
    const [constat] = verifierConsigne(consigne)
    expect(constat?.extrait).toBe('Écris la date au format long')
  })

  it('ne confond pas un mot qui contient un motif avec une demande', () => {
    expect(
      verifierConsigne('Le ton reste factuel : aucune estimation ne doit apparaître sans fait.'),
    ).toEqual([])
  })
})
