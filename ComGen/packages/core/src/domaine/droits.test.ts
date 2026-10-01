import { describe, expect, it } from 'vitest'
import { ACTIONS, autoriser, type ContexteDroit } from './droits.ts'

/*
 * Spécification §16 — table des droits. Pure : le serveur l'appelle sur
 * chaque route ; le client ne décide jamais. Chaque « ne peut pas » de la
 * table a son test.
 */
const contexte: ContexteDroit = {
  utilisateurId: 'u-alice',
  auteurId: 'u-bob',
  approbateursDesignes: [],
}

describe('autoriser', () => {
  it('liste les actions couvertes', () => {
    expect(ACTIONS).toEqual([
      'CONSULTER',
      'CREER',
      'GENERER',
      'EDITER',
      'SOUMETTRE',
      'COMMENTER',
      'PROPOSER_CORRECTION',
      'APPROUVER',
      'REJETER',
      'ENVOYER',
      'PARAMETRER',
      'CONSULTER_AUDIT',
      'EXPORTER_AUDIT',
    ])
  })

  it('refuse tout à un utilisateur sans rôle', () => {
    for (const action of ACTIONS) {
      expect(autoriser([], action, contexte)).toEqual({
        autorise: false,
        motif: 'ROLE_INSUFFISANT',
      })
    }
  })

  describe('Rédacteur', () => {
    it('peut créer, générer, éditer, soumettre', () => {
      for (const action of ['CREER', 'GENERER', 'EDITER', 'SOUMETTRE'] as const) {
        expect(autoriser(['REDACTEUR'], action, contexte)).toEqual({ autorise: true })
      }
    })
    it('ne peut ni approuver ni envoyer', () => {
      expect(autoriser(['REDACTEUR'], 'APPROUVER', contexte).autorise).toBe(false)
      expect(autoriser(['REDACTEUR'], 'ENVOYER', contexte).autorise).toBe(false)
    })
  })

  describe('Relecteur', () => {
    it('peut commenter et proposer des corrections', () => {
      expect(autoriser(['RELECTEUR'], 'COMMENTER', contexte)).toEqual({ autorise: true })
      expect(autoriser(['RELECTEUR'], 'PROPOSER_CORRECTION', contexte)).toEqual({ autorise: true })
    })
    it('ne peut ni approuver, ni envoyer, ni éditer', () => {
      expect(autoriser(['RELECTEUR'], 'APPROUVER', contexte).autorise).toBe(false)
      expect(autoriser(['RELECTEUR'], 'ENVOYER', contexte).autorise).toBe(false)
      expect(autoriser(['RELECTEUR'], 'EDITER', contexte).autorise).toBe(false)
    })
  })

  describe('Approbateur', () => {
    it('peut approuver, rejeter, déclencher l’envoi', () => {
      expect(autoriser(['APPROBATEUR'], 'APPROUVER', contexte)).toEqual({ autorise: true })
      expect(autoriser(['APPROBATEUR'], 'REJETER', contexte)).toEqual({ autorise: true })
      expect(autoriser(['APPROBATEUR'], 'ENVOYER', contexte)).toEqual({ autorise: true })
    })
    it('ne peut pas paramétrer', () => {
      expect(autoriser(['APPROBATEUR'], 'PARAMETRER', contexte).autorise).toBe(false)
    })
    it('ne peut pas approuver sa propre communication, même en cumulant les rôles', () => {
      const propre = { ...contexte, auteurId: 'u-alice' }
      expect(autoriser(['REDACTEUR', 'APPROBATEUR'], 'APPROUVER', propre)).toEqual({
        autorise: false,
        motif: 'AUTEUR_DE_LA_COMMUNICATION',
      })
    })
    it('ne peut pas approuver à la place d’un approbateur désigné', () => {
      const designe = { ...contexte, approbateursDesignes: ['u-carol'] }
      expect(autoriser(['APPROBATEUR'], 'APPROUVER', designe)).toEqual({
        autorise: false,
        motif: 'APPROBATEUR_NON_DESIGNE',
      })
      expect(
        autoriser(['APPROBATEUR'], 'APPROUVER', { ...designe, utilisateurId: 'u-carol' }),
      ).toEqual({ autorise: true })
    })
  })

  describe('Administrateur', () => {
    it('peut paramétrer', () => {
      expect(autoriser(['ADMINISTRATEUR'], 'PARAMETRER', contexte)).toEqual({ autorise: true })
    })
    it('ne peut pas approuver, ni à la place d’un approbateur désigné, ni sinon', () => {
      expect(autoriser(['ADMINISTRATEUR'], 'APPROUVER', contexte).autorise).toBe(false)
      expect(
        autoriser(['ADMINISTRATEUR'], 'APPROUVER', {
          ...contexte,
          approbateursDesignes: ['u-carol'],
        }).autorise,
      ).toBe(false)
    })
  })

  describe('Auditeur', () => {
    it('peut consulter et exporter les traces', () => {
      expect(autoriser(['AUDITEUR'], 'CONSULTER', contexte)).toEqual({ autorise: true })
      expect(autoriser(['AUDITEUR'], 'CONSULTER_AUDIT', contexte)).toEqual({ autorise: true })
      expect(autoriser(['AUDITEUR'], 'EXPORTER_AUDIT', contexte)).toEqual({ autorise: true })
    })
    it('ne modifie rien', () => {
      for (const action of [
        'CREER',
        'GENERER',
        'EDITER',
        'SOUMETTRE',
        'COMMENTER',
        'PROPOSER_CORRECTION',
        'APPROUVER',
        'REJETER',
        'ENVOYER',
        'PARAMETRER',
      ] as const) {
        expect(autoriser(['AUDITEUR'], action, contexte).autorise).toBe(false)
      }
    })
  })

  it('tout rôle peut consulter dans son organisation', () => {
    for (const role of ['REDACTEUR', 'RELECTEUR', 'APPROBATEUR', 'ADMINISTRATEUR'] as const) {
      expect(autoriser([role], 'CONSULTER', contexte)).toEqual({ autorise: true })
    }
  })
})
