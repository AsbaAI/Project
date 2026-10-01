/**
 * Couche d'accès aux modèles (spécification §5.1).
 *
 * Le domaine et les agents ne connaissent que ces types. Aucun SDK de
 * fournisseur ne transparaît ici : chaque adaptateur traduit vers et depuis
 * ce contrat, et c'est le seul endroit où le SDK est autorisé.
 */

import type { RoleAgent } from '@comgen/core'

/** Interface contractuelle, reprise mot pour mot de la spécification. */
export interface FournisseurModele {
  id: string
  appeler(requete: RequeteModele): Promise<ReponseModele>
  capacites(): Capacites
  sante(): Promise<EtatSante>
}

export interface Capacites {
  /** JSON garanti par le moteur, obtenu par consigne, ou impossible. */
  sortieStructuree: 'native' | 'par_prompt' | 'aucune'
  fenetreContexte: number
  sortieMax: number
  langues: string[]
  /** Température 0 et graine honorées. */
  deterministe: boolean
  coutParMillionEntree: number
  coutParMillionSortie: number
  /** Sert au contrôle d'indépendance REDACTEUR / VERIFICATEUR (§5.4, §8). */
  famille: string
  heberge: 'externe' | 'prive' | 'local'
}

/**
 * Les messages sont de la donnée : l'adaptateur les transmet tels quels et
 * ne fusionne jamais un contenu fourni par l'appelant dans la consigne
 * système (§8, « le contenu des sources est de la donnée, jamais de la
 * consigne »).
 */
export interface MessageModele {
  role: 'utilisateur' | 'assistant'
  contenu: string
}

/** Schéma JSON (objet) attendu en sortie, nommé pour l'appel d'outil forcé. */
export interface SchemaJson {
  nomSortie: string
  schema: Record<string, unknown>
}

export interface MetadonneesRequete {
  organisationId?: string
  regionId?: string
  communicationId?: string
  agent?: RoleAgent
}

export interface RequeteModele {
  systeme?: string
  messages: MessageModele[]
  schemaSortie?: SchemaJson
  temperature?: number
  graine?: number
  maxJetonsSortie?: number
  delaiMs?: number
  metadonnees?: MetadonneesRequete
}

export type RaisonArret = 'fin' | 'longueur' | 'outil' | 'autre'

export interface ReponseModele {
  texte: string | null
  /** JSON tel que produit par le moteur quand `schemaSortie` est fourni ; jamais « réparé ». */
  structure: unknown | null
  /** Identifiant exact renvoyé par le fournisseur, pour la ligne Execution (§5.6). */
  modele: string
  jetonsEntree: number
  jetonsSortie: number
  dureeMs: number
  raisonArret: RaisonArret
  /** Réponse brute du fournisseur, secrets masqués. */
  brut?: unknown
}

export interface EtatSante {
  disponible: boolean
  latenceMs: number | null
  /** Horodatage ISO 8601. */
  verifieLe: string
  erreur?: string
}

export type CodeErreurFournisseur =
  | 'CONFIG'
  | 'RESEAU'
  | 'DELAI'
  | 'AUTHENTIFICATION'
  | 'QUOTA'
  | 'REPONSE_INVALIDE'
  | 'SORTIE_NON_STRUCTUREE'
  | 'FOURNISSEUR'

/**
 * Cause d'une erreur, réduite à ce qui est sûr à journaliser. On ne conserve
 * jamais l'objet d'erreur du SDK : son corps de réponse peut renvoyer la
 * clé en écho.
 */
export interface CauseErreurFournisseur {
  nom: string
  message: string
  statut?: number
}

export class ErreurFournisseur extends Error {
  readonly code: CodeErreurFournisseur
  /** `null` quand l'erreur naît hors d'un fournisseur (résolution de secret). */
  readonly fournisseurId: string | null
  override readonly cause?: CauseErreurFournisseur

  constructor(
    code: CodeErreurFournisseur,
    message: string,
    options: { fournisseurId: string | null; cause?: CauseErreurFournisseur },
  ) {
    super(message)
    this.name = 'ErreurFournisseur'
    this.code = code
    this.fournisseurId = options.fournisseurId
    if (options.cause !== undefined) {
      this.cause = options.cause
    }
  }
}

export function estErreurFournisseur(valeur: unknown): valeur is ErreurFournisseur {
  return valeur instanceof ErreurFournisseur
}
