/**
 * @comgen/db — accès aux données, cloisonné par organisation.
 *
 * Ce paquet n'exporte jamais de client Prisma nu. L'application ouvre une
 * connexion, puis crée un contexte par requête entrante à partir de
 * l'organisation de l'utilisateur authentifié.
 */
export { ouvrirConnexion, type Connexion, type OptionsConnexion } from './connexion.ts'
export {
  creerContexte,
  type AmendementDeFait,
  type ContexteDonnees,
  type ContexteTransaction,
  type EcritureContenuVariante,
  type IdentiteContexte,
} from './contexte.ts'
export {
  listerComptesSimulables,
  rechercherUtilisateurPourConnexion,
  type CompteSimulable,
  type CritereConnexion,
  type UtilisateurConnecte,
} from './annuaire.ts'
export { ErreurDonnees, estErreurDonnees, type CodeErreurDonnees } from './erreurs.ts'
export { Prisma } from './generated/client.ts'
export type * from './generated/models.ts'
