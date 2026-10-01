import { describe, expect, it } from 'vitest'
import {
  CANAUX,
  CRITICITES,
  DECISIONS_APPROBATION,
  DECISIONS_SUGGESTION,
  FORMATS_TEMPLATE,
  GRAVITES,
  INTENTIONS_REPRISE,
  MODES_ENTREE,
  NATURES,
  NIVEAUX,
  ORIGINES_SUGGESTION,
  ORIGINES_TEXTE,
  PORTEES,
  REGIMES,
  ROLES_MENTION,
  ROLES_UTILISATEUR,
  STATUTS_FAIT,
  TYPES_CONTROLE,
  TYPES_ENTITE,
  TYPES_LISTE,
  TYPES_SOURCE,
  TYPES_VALEUR,
  VERDICTS,
  estValeurDe,
} from './enumerations.ts'

/*
 * Les listes de valeurs sont contractuelles (spécification §6, §13, §16).
 * Ces tests figent leur contenu exact : ajouter ou retirer une valeur est
 * une décision, pas un accident.
 */
describe('énumérations contractuelles', () => {
  it('reprend les valeurs du modèle de données §6', () => {
    expect(NATURES).toEqual(['SPEC_UPDATE', 'CHANGE', 'INCIDENT', 'RELEASE', 'ORG', 'REGULATORY'])
    expect(CRITICITES).toEqual(['COURANTE', 'IMPORTANTE', 'CRITIQUE'])
    expect(PORTEES).toEqual(['INTERNE', 'INTER_ORG', 'EXTERNE'])
    expect(MODES_ENTREE).toEqual([
      'FICHIER',
      'TEXTE_SAISI',
      'CONNECTEUR',
      'COURRIEL',
      'DICTEE',
      'API',
      'FORMULAIRE',
    ])
    expect(TYPES_SOURCE).toEqual(MODES_ENTREE)
    expect(INTENTIONS_REPRISE).toEqual(['MISE_A_JOUR', 'CORRECTIF', 'RAPPEL'])
    expect(NIVEAUX).toEqual(['PUBLIC', 'INTERNE', 'RESTREINT', 'SECRET'])
    expect(TYPES_VALEUR).toEqual(['DATE', 'NOMBRE', 'VERSION', 'IDENTIFIANT', 'NOM', 'TEXTE'])
    expect(STATUTS_FAIT).toEqual(['PROPOSE', 'CONFIRME', 'RETIRE', 'PERIME', 'DECLARE'])
    expect(FORMATS_TEMPLATE).toEqual([
      'MAIL_HTML',
      'MAIL_TEXTE',
      'PDF',
      'NEWSLETTER',
      'MESSAGE_INSTANTANE',
      'ARTICLE',
      'UNE_PAGE',
    ])
    expect(VERDICTS).toEqual(['SOUTENUE', 'CONTREDITE', 'SANS_APPUI', 'NON_FACTUELLE'])
    expect(TYPES_CONTROLE).toEqual([
      'ANCRAGE',
      'COMPARAISON_EXACTE',
      'TOXICITE',
      'DONNEES_SENSIBLES',
      'CONFIDENTIALITE_PERSONA',
      'TEMPLATE',
      'LISTE',
      'TON',
      'LISIBILITE',
      'LONGUEUR',
      'COHERENCE_INTER_VARIANTES',
    ])
    expect(GRAVITES).toEqual(['INFO', 'AVERTISSEMENT', 'ERREUR'])
    expect(ORIGINES_TEXTE).toEqual(['GENEREE', 'EDITEE', 'REIMPORTEE', 'CORRIGEE_AGENT'])
    expect(TYPES_ENTITE).toEqual([
      'PROJET',
      'PRODUIT',
      'SYSTEME',
      'CLIENT',
      'SITE',
      'NORME',
      'MOT_CLE',
    ])
    expect(ROLES_MENTION).toEqual(['PRINCIPAL', 'INCIDENT'])
    expect(ORIGINES_SUGGESTION).toEqual(['ENTITE', 'MOT_CLE', 'DIMENSION'])
    expect(DECISIONS_SUGGESTION).toEqual(['EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'REPORTEE'])
    expect(TYPES_LISTE).toEqual(['STATIQUE', 'GROUPE_ANNUAIRE', 'REGLE', 'IMPORT'])
    expect(REGIMES).toEqual(['RELECTURE', 'APPROBATION'])
    expect(DECISIONS_APPROBATION).toEqual(['EN_ATTENTE', 'APPROUVEE', 'REJETEE', 'DELEGUEE'])
  })

  it('définit les canaux d’envoi (non listés par la spécification, voir DECISIONS.md)', () => {
    expect(CANAUX).toEqual(['COURRIEL', 'MESSAGERIE_INSTANTANEE', 'PORTAIL', 'DOCUMENT'])
  })

  it('reprend les cinq rôles utilisateur de §16', () => {
    expect(ROLES_UTILISATEUR).toEqual([
      'REDACTEUR',
      'RELECTEUR',
      'APPROBATEUR',
      'ADMINISTRATEUR',
      'AUDITEUR',
    ])
  })

  it('offre un garde de type générique qui refuse tout ce qui n’est pas dans la liste', () => {
    expect(estValeurDe(CRITICITES, 'CRITIQUE')).toBe(true)
    expect(estValeurDe(CRITICITES, 'critique')).toBe(false)
    expect(estValeurDe(CRITICITES, 3)).toBe(false)
    expect(estValeurDe(CRITICITES, undefined)).toBe(false)
  })
})
