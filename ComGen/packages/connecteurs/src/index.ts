/**
 * @comgen/connecteurs — surface publique.
 *
 * Aucune dépendance vers le reste de l'application : ce paquet ne connaît
 * ni la base, ni l'interface, ni les secrets de l'environnement. Les
 * identifiants lui sont remis déjà résolus par l'appelant.
 */

export type {
  ConnecteurItsm,
  FiltresTickets,
  NiveauPriorite,
  NoteDeTravail,
  PageDemandee,
  PageTickets,
  ResultatTest,
  StatutFiltrable,
  StatutTicket,
  SystemeItsm,
  TicketItsm,
  TicketResume,
} from './types.ts'
export { NIVEAUX_PRIORITE, STATUTS_FILTRABLES, SYSTEMES_ITSM, TAILLE_PAGE_MAX } from './types.ts'

export type { CodeErreurItsm } from './erreurs.ts'
export { ErreurItsm, estErreurItsm } from './erreurs.ts'

export type { PolitiqueUrl } from './url.ts'
export { POLITIQUE_PAR_DEFAUT, verifierUrlInstance } from './url.ts'

export type { ConfigServiceNow, DependancesServiceNow, Identifiants } from './servicenow/client.ts'
export { ConnecteurServiceNow } from './servicenow/client.ts'
export { ID_EXTERNE } from './servicenow/requetes.ts'

export type { DependancesMock } from './mock/adaptateur.ts'
export { ConnecteurMock } from './mock/adaptateur.ts'
export { NOMBRE_DE_TICKETS_MOCK, REFERENCE_MOCK } from './mock/donnees.ts'

export type { ConfigConnecteur } from './fabrique.ts'
export { creerConnecteur } from './fabrique.ts'

export type { OptionsTexteSource } from './texte-source.ts'
export { composerTexteSource } from './texte-source.ts'
