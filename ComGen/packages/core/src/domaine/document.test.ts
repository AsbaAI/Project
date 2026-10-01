import { describe, expect, it } from 'vitest'

import { compterMots, compterMotsDocument, texteDuDocument } from './document.ts'

const DOCUMENT = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'La version ' },
        { type: 'text', text: '4.2.1', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' sera déployée.' },
      ],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Premier point' }] }],
        },
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second point' }] }],
        },
      ],
    },
  ],
}

describe('texteDuDocument', () => {
  it('concatène les nœuds texte et sépare les blocs', () => {
    expect(texteDuDocument(DOCUMENT)).toBe(
      'La version 4.2.1 sera déployée.\nPremier point\n\nSecond point',
    )
  })

  it('rend une chaîne vide pour un document sans texte ou mal formé', () => {
    expect(texteDuDocument({ type: 'doc', content: [] })).toBe('')
    expect(texteDuDocument(null)).toBe('')
    expect(texteDuDocument('pas un document')).toBe('')
  })

  it('traduit un saut de ligne forcé', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'a' },
            { type: 'hardBreak' },
            { type: 'text', text: 'b' },
          ],
        },
      ],
    }
    expect(texteDuDocument(doc)).toBe('a\nb')
  })
})

describe('compterMots', () => {
  it('compte les mots en gardant les nombres et versions comme un seul mot', () => {
    expect(compterMots('La version 4.2.1 sera déployée le 3 octobre.')).toBe(8)
    expect(compterMots("L'incident n°12 est clos")).toBe(5)
    expect(compterMots('')).toBe(0)
    expect(compterMots('   —  ')).toBe(0)
  })

  it('compte les mots d’un document', () => {
    expect(compterMotsDocument(DOCUMENT)).toBe(9)
  })
})
