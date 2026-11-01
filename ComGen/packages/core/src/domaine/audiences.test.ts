import { describe, expect, it } from 'vitest'

import { personasCorrespondants } from './audiences.ts'

const PERSONAS = [
  { id: 'p1', nom: 'Clients grands comptes' },
  { id: 'p2', nom: 'Clients Amérique du Nord' },
  { id: 'p3', nom: 'Support client' },
  { id: 'p4', nom: 'Direction générale' },
  { id: 'p5', nom: 'Fournisseurs' },
  { id: 'p6', nom: 'Partenaires intégrateurs' },
  { id: 'p7', nom: 'Équipes techniques' },
] as const

const ids = (dimension: string) => personasCorrespondants(dimension, PERSONAS).toSorted()

describe('personasCorrespondants', () => {
  it('rapproche une dimension du début du nom d’un persona', () => {
    expect(ids('Clients')).toEqual(['p1', 'p2'])
    expect(ids('Direction')).toEqual(['p4'])
    expect(ids('Partenaires')).toEqual(['p6'])
  })

  it('ne rapproche pas un persona dont le nom ne fait que contenir la dimension', () => {
    // « Support client » s'adresse à ceux qui soutiennent les clients, pas
    // aux clients : le suggérer serait une fausse piste.
    expect(ids('Clients')).not.toContain('p3')
    expect(ids('Support')).toEqual(['p3'])
  })

  it('ignore les accents et la casse', () => {
    expect(ids('EQUIPES TECHNIQUES')).toEqual(['p7'])
    expect(ids('équipes techniques')).toEqual(['p7'])
  })

  it('ne distingue pas le singulier du pluriel', () => {
    expect(
      personasCorrespondants('Partenaires', [{ id: 'x', nom: 'Partenaire historique' }]),
    ).toEqual(['x'])
    expect(personasCorrespondants('Client', [{ id: 'x', nom: 'Clients' }])).toEqual(['x'])
  })

  it('ignore les mots vides en tête du nom', () => {
    expect(
      personasCorrespondants('Direction', [{ id: 'x', nom: 'La direction générale' }]),
    ).toEqual(['x'])
  })

  it('exige que tous les mots de la dimension suivent, dans l’ordre', () => {
    expect(ids('Équipes commerciales')).toEqual([])
    expect(
      personasCorrespondants('Équipes techniques', [{ id: 'x', nom: 'Techniques équipes' }]),
    ).toEqual([])
  })

  it('ne rapproche pas deux mots qui ne diffèrent que par leur début', () => {
    expect(personasCorrespondants('Support', [{ id: 'x', nom: 'Supporters' }])).toEqual([])
  })

  it('ne rapproche rien d’une dimension vide ou sans mot', () => {
    expect(ids('')).toEqual([])
    expect(ids('  —  ')).toEqual([])
  })

  it('ne rapproche rien quand aucun persona ne correspond', () => {
    expect(ids('Conformité')).toEqual([])
  })
})
