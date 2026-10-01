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

export type {
  Agent,
  CodeErreurAgent,
  ContexteAgent,
  ResultatAgent,
  TraceAgent,
} from './agents/types.ts'
export { ErreurAgent, estErreurAgent, validerSortie, verifierAnnulation } from './agents/types.ts'

export type {
  EtapeOrchestration,
  EtapePlan,
  EtatEtape,
  EvenementOrchestration,
  OptionsOrchestration,
  ResultatOrchestration,
} from './agents/orchestrateur.ts'
export {
  ErreurOrchestration,
  estErreurOrchestration,
  etape,
  orchestrer,
} from './agents/orchestrateur.ts'

export type { JeuAgents, MotifSimulation, OptionsFabrique } from './agents/fabrique.ts'
export { fabriqueAgents } from './agents/fabrique.ts'

export type {
  EntreeRedacteur,
  EntreeTexte,
  EntreeVerificateur,
  SortieAnalyste,
  SortieExtracteur,
  SortieRedacteur,
  SortieSuggesteur,
  SortieVerificateur,
} from './simulation/index.ts'
export {
  DELAIS_SIMULATION,
  agentsSimules,
  creerAnalysteSimule,
  creerExtracteurSimule,
  creerRedacteurSimule,
  creerSuggesteurSimule,
  creerVerificateurSimule,
} from './simulation/index.ts'

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
