/**
 * Contrat commun des connecteurs ITSM.
 *
 * Tout ce que l'application sait d'un ticket passe par ces types : elle ne
 * connaît ni les champs de ServiceNow, ni ceux d'un autre outil. Ajouter
 * Jira Service Management, c'est écrire un adaptateur de plus qui rend ces
 * mêmes structures — rien au-dessus ne change.
 *
 * Un connecteur ne fait que LIRE. Aucune opération n'écrit dans l'ITSM.
 */

export const SYSTEMES_ITSM = ['servicenow', 'mock'] as const
export type SystemeItsm = (typeof SYSTEMES_ITSM)[number]

/** Statuts normalisés sur lesquels on peut filtrer. */
export const STATUTS_FILTRABLES = [
  'NOUVEAU',
  'EN_COURS',
  'EN_ATTENTE',
  'RESOLU',
  'CLOS',
  'ANNULE',
] as const
export type StatutFiltrable = (typeof STATUTS_FILTRABLES)[number]

/**
 * `AUTRE` : un état propre à l'instance, que la normalisation ne sait pas
 * ranger. Le dire vaut mieux que le déguiser en `EN_COURS` — le libellé
 * d'origine reste à côté pour qu'on le lise tel quel.
 */
export type StatutTicket = StatutFiltrable | 'AUTRE'

/** 1 = la plus haute. Même échelle quel que soit l'outil. */
export const NIVEAUX_PRIORITE = [1, 2, 3, 4, 5] as const
export type NiveauPriorite = (typeof NIVEAUX_PRIORITE)[number]

export interface NoteDeTravail {
  date: Date
  texte: string
}

/** Ce que la liste affiche : assez pour reconnaître un ticket, rien de plus. */
export interface TicketResume {
  systeme: SystemeItsm
  /** Identifiant technique de l'outil (le `sys_id` de ServiceNow). */
  idExterne: string
  /** Numéro lisible : INC0012345. */
  numero: string
  titre: string
  statut: { code: StatutTicket; libelle: string }
  priorite: { niveau: NiveauPriorite; libelle: string }
  demandeur: string | null
  groupe: string | null
  ouvertLe: Date
  misAJourLe: Date
}

/** Un ticket lu en entier, prêt à devenir une source. */
export interface TicketItsm extends TicketResume {
  description: string
  resoluLe: Date | null
  notesDeTravail: NoteDeTravail[]
  /** Adresse du ticket dans l'outil d'origine. */
  lien: string
}

export interface FiltresTickets {
  statuts?: readonly StatutFiltrable[] | undefined
  priorites?: readonly NiveauPriorite[] | undefined
  /** Nom exact du groupe d'affectation. */
  groupe?: string | undefined
  /** Bornes sur la date d'ouverture, incluses, en UTC. */
  ouvertApres?: Date | undefined
  ouvertAvant?: Date | undefined
}

export interface PageDemandee {
  /** À partir de 1. */
  page: number
  /** Entre 1 et `TAILLE_PAGE_MAX`. */
  taille: number
}

export const TAILLE_PAGE_MAX = 100

export interface PageTickets {
  tickets: TicketResume[]
  /** Nombre total de tickets pour ce filtre ; `null` si l'outil ne le dit pas. */
  total: number | null
  page: number
  taille: number
}

export type ResultatTest =
  { ok: true; systeme: SystemeItsm; detail: string } | { ok: false; code: string; message: string }

export interface ConnecteurItsm {
  readonly systeme: SystemeItsm
  /** Vérifie que l'accès fonctionne, sans effet de bord. */
  tester(): Promise<ResultatTest>
  lister(filtres: FiltresTickets, page: PageDemandee): Promise<PageTickets>
  /**
   * Lit un ticket en entier. Les notes de travail ne sont lues que si on les
   * demande : elles sont souvent internes, et les lire suppose un droit de
   * plus sur le journal.
   */
  lire(idExterne: string, options?: { avecNotes?: boolean }): Promise<TicketItsm>
}
