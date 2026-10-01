import type { RoleUtilisateur } from './enumerations.ts'

/**
 * Table des droits (spécification §16). Fonction pure, appelée côté
 * serveur sur chaque route ; le client n'en déduit que l'affichage.
 */

export const ACTIONS = [
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
] as const
export type Action = (typeof ACTIONS)[number]

export interface ContexteDroit {
  utilisateurId: string
  /** Auteur de la communication visée, s'il y en a une. */
  auteurId?: string
  /** Approbateurs désignés (persona, région) ; vide = tout approbateur de l'organisation. */
  approbateursDesignes?: readonly string[]
}

export type MotifRefusDroit =
  'ROLE_INSUFFISANT' | 'AUTEUR_DE_LA_COMMUNICATION' | 'APPROBATEUR_NON_DESIGNE'

export type ResultatDroit = { autorise: true } | { autorise: false; motif: MotifRefusDroit }

/** Ce que chaque rôle PEUT, tel que la table §16 l'énonce. Le reste est refusé. */
const DROITS_PAR_ROLE: Readonly<Record<RoleUtilisateur, ReadonlySet<Action>>> = {
  REDACTEUR: new Set(['CONSULTER', 'CREER', 'GENERER', 'EDITER', 'SOUMETTRE', 'COMMENTER']),
  RELECTEUR: new Set(['CONSULTER', 'COMMENTER', 'PROPOSER_CORRECTION']),
  APPROBATEUR: new Set(['CONSULTER', 'COMMENTER', 'APPROUVER', 'REJETER', 'ENVOYER']),
  ADMINISTRATEUR: new Set(['CONSULTER', 'PARAMETRER']),
  AUDITEUR: new Set(['CONSULTER', 'CONSULTER_AUDIT', 'EXPORTER_AUDIT']),
}

export function autoriser(
  roles: readonly RoleUtilisateur[],
  action: Action,
  contexte: ContexteDroit,
): ResultatDroit {
  if (!roles.some((role) => DROITS_PAR_ROLE[role].has(action))) {
    return { autorise: false, motif: 'ROLE_INSUFFISANT' }
  }

  if (action === 'APPROUVER' || action === 'REJETER') {
    // Personne n'approuve sa propre communication, quels que soient ses rôles.
    if (contexte.auteurId !== undefined && contexte.auteurId === contexte.utilisateurId) {
      return { autorise: false, motif: 'AUTEUR_DE_LA_COMMUNICATION' }
    }
    // Un approbateur désigné ne se remplace pas — pas même par un administrateur,
    // qui n'a de toute façon pas le droit d'approuver.
    const designes = contexte.approbateursDesignes ?? []
    if (designes.length > 0 && !designes.includes(contexte.utilisateurId)) {
      return { autorise: false, motif: 'APPROBATEUR_NON_DESIGNE' }
    }
  }

  return { autorise: true }
}
