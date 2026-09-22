/**
 * Énumérations du domaine (spécification §6, §13, §16). Les noms et les
 * valeurs sont contractuels ; le schéma Prisma les reprend à l'identique et
 * un test de parité (`packages/db`) le vérifie.
 *
 * Chaque liste est un tuple `as const` : le type est dérivé de la valeur,
 * jamais l'inverse, pour qu'une valeur ajoutée ici manque explicitement
 * partout où l'on fait un `switch` exhaustif.
 */

/** Garde de type générique : `valeur` appartient-elle à `liste` ? */
export function estValeurDe<const T extends readonly string[]>(
  liste: T,
  valeur: unknown,
): valeur is T[number] {
  return typeof valeur === 'string' && (liste as readonly string[]).includes(valeur)
}

export const NATURES = [
  'SPEC_UPDATE',
  'CHANGE',
  'INCIDENT',
  'RELEASE',
  'ORG',
  'REGULATORY',
] as const
export type Nature = (typeof NATURES)[number]

export const CRITICITES = ['COURANTE', 'IMPORTANTE', 'CRITIQUE'] as const
export type Criticite = (typeof CRITICITES)[number]

export const PORTEES = ['INTERNE', 'INTER_ORG', 'EXTERNE'] as const
export type Portee = (typeof PORTEES)[number]

export const MODES_ENTREE = [
  'FICHIER',
  'TEXTE_SAISI',
  'CONNECTEUR',
  'COURRIEL',
  'DICTEE',
  'API',
  'FORMULAIRE',
] as const
export type ModeEntree = (typeof MODES_ENTREE)[number]

/** Même liste que les modes d'entrée : une source garde la trace de son mode. */
export const TYPES_SOURCE = MODES_ENTREE
export type TypeSource = ModeEntree

export const INTENTIONS_REPRISE = ['MISE_A_JOUR', 'CORRECTIF', 'RAPPEL'] as const
export type IntentionReprise = (typeof INTENTIONS_REPRISE)[number]

/** Niveaux de confidentialité, du plus ouvert au plus fermé (l'ordre compte, §9.4). */
export const NIVEAUX = ['PUBLIC', 'INTERNE', 'RESTREINT', 'SECRET'] as const
export type Niveau = (typeof NIVEAUX)[number]

export const TYPES_VALEUR = ['DATE', 'NOMBRE', 'VERSION', 'IDENTIFIANT', 'NOM', 'TEXTE'] as const
export type TypeValeur = (typeof TYPES_VALEUR)[number]

export const STATUTS_FAIT = ['PROPOSE', 'CONFIRME', 'RETIRE', 'PERIME', 'DECLARE'] as const
export type StatutFait = (typeof STATUTS_FAIT)[number]

export const FORMATS_TEMPLATE = [
  'MAIL_HTML',
  'MAIL_TEXTE',
  'PDF',
  'NEWSLETTER',
  'MESSAGE_INSTANTANE',
  'ARTICLE',
  'UNE_PAGE',
] as const
export type FormatTemplate = (typeof FORMATS_TEMPLATE)[number]

/**
 * Canaux d'envoi. La spécification nomme le type `Canal` sans en lister les
 * valeurs ; celles-ci sont un choix consigné dans DECISIONS.md.
 */
export const CANAUX = ['COURRIEL', 'MESSAGERIE_INSTANTANEE', 'PORTAIL', 'DOCUMENT'] as const
export type Canal = (typeof CANAUX)[number]

export const VERDICTS = ['SOUTENUE', 'CONTREDITE', 'SANS_APPUI', 'NON_FACTUELLE'] as const
export type Verdict = (typeof VERDICTS)[number]

export const TYPES_CONTROLE = [
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
] as const
export type TypeControle = (typeof TYPES_CONTROLE)[number]

export const GRAVITES = ['INFO', 'AVERTISSEMENT', 'ERREUR'] as const
export type Gravite = (typeof GRAVITES)[number]

export const ORIGINES_TEXTE = ['GENEREE', 'EDITEE', 'REIMPORTEE', 'CORRIGEE_AGENT'] as const
export type OrigineTexte = (typeof ORIGINES_TEXTE)[number]

export const TYPES_ENTITE = [
  'PROJET',
  'PRODUIT',
  'SYSTEME',
  'CLIENT',
  'SITE',
  'NORME',
  'MOT_CLE',
] as const
export type TypeEntite = (typeof TYPES_ENTITE)[number]

export const ROLES_MENTION = ['PRINCIPAL', 'INCIDENT'] as const
export type RoleMention = (typeof ROLES_MENTION)[number]

export const ORIGINES_SUGGESTION = ['ENTITE', 'MOT_CLE', 'DIMENSION'] as const
export type OrigineSuggestion = (typeof ORIGINES_SUGGESTION)[number]

export const DECISIONS_SUGGESTION = ['EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'REPORTEE'] as const
export type DecisionSuggestion = (typeof DECISIONS_SUGGESTION)[number]

export const TYPES_LISTE = ['STATIQUE', 'GROUPE_ANNUAIRE', 'REGLE', 'IMPORT'] as const
export type TypeListe = (typeof TYPES_LISTE)[number]

export const REGIMES = ['RELECTURE', 'APPROBATION'] as const
export type Regime = (typeof REGIMES)[number]

export const DECISIONS_APPROBATION = ['EN_ATTENTE', 'APPROUVEE', 'REJETEE', 'DELEGUEE'] as const
export type DecisionApprobation = (typeof DECISIONS_APPROBATION)[number]

/** Rôles utilisateur (§16). Distincts des rôles d'agent (`RoleAgent`, §8). */
export const ROLES_UTILISATEUR = [
  'REDACTEUR',
  'RELECTEUR',
  'APPROBATEUR',
  'ADMINISTRATEUR',
  'AUDITEUR',
] as const
export type RoleUtilisateur = (typeof ROLES_UTILISATEUR)[number]
