import { describe, expect, it } from 'vitest'

import { LANGUES_DETECTABLES, detecterLangue } from './langue.ts'

const FRANCAIS = `La migration du portail client vers la version 4.2.0 aura lieu le samedi 14 octobre 2026.
Pendant la fenêtre de maintenance, le service ne sera pas disponible pour les utilisateurs.
Les équipes techniques sont mobilisées et un plan de repli est prévu en cas de problème.`

const ANGLAIS = `The customer portal will be migrated to version 4.2.0 on Saturday, October 14, 2026.
During the maintenance window the service will not be available to users.
The technical teams are mobilised and a rollback plan is in place in case of failure.`

describe('detecterLangue', () => {
  it('ne connaît que les langues de la fiche', () => {
    expect(LANGUES_DETECTABLES).toEqual(['fr', 'en'])
  })

  it('reconnaît un texte français', () => {
    expect(detecterLangue(FRANCAIS)).toBe('fr')
  })

  it('reconnaît un texte anglais', () => {
    expect(detecterLangue(ANGLAIS)).toBe('en')
  })

  it('ne devine pas quand le texte est trop court ou ambigu', () => {
    expect(detecterLangue('')).toBeNull()
    expect(detecterLangue('CHG-2026-0412 4.2.0 14/10/2026')).toBeNull()
    expect(detecterLangue('Atlas 4.2.0')).toBeNull()
  })

  it('ne devine pas quand deux langues se disputent le texte', () => {
    expect(detecterLangue(`${FRANCAIS}\n${ANGLAIS}`)).toBeNull()
  })

  it('ignore la casse et la ponctuation', () => {
    expect(detecterLangue('LE SERVICE EST DISPONIBLE POUR LES CLIENTS, ET LES PARTENAIRES.')).toBe(
      'fr',
    )
  })
})
