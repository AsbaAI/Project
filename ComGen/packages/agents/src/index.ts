/**
 * @comgen/agents — surface publique.
 *
 * Le code métier importe uniquement d'ici : le contrat `FournisseurModele`,
 * le registre et les fabriques d'adaptateurs. Aucun type du SDK Anthropic
 * ne transite par cette surface.
 */

export type {
  Capacites,
  CauseErreurFournisseur,
  CodeErreurFournisseur,
  EtatSante,
  FournisseurModele,
  MessageModele,
  MetadonneesRequete,
  RaisonArret,
  ReponseModele,
  RequeteModele,
  SchemaJson,
} from './fournisseurs/types.ts'
export { ErreurFournisseur, estErreurFournisseur } from './fournisseurs/types.ts'

export type { ResolveurSecret } from './secrets/index.ts'
export {
  MARQUEUR_SECRET_MASQUE,
  empreinteSecret,
  masquerSecret,
  masquerSecretDansValeur,
  resolveurEnvironnement,
} from './secrets/index.ts'

export type { ConfigAnthropic, DependancesAnthropic } from './fournisseurs/anthropic.ts'
export { creerFournisseurAnthropic } from './fournisseurs/anthropic.ts'

export type {
  AffinagesControles,
  CodeRefusAffectation,
  ResultatAffectation,
} from './fournisseurs/registre.ts'
export { RegistreFournisseurs } from './fournisseurs/registre.ts'
