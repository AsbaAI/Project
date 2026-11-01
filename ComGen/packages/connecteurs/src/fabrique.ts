import { ErreurItsm } from './erreurs.ts'
import { ConnecteurMock, type DependancesMock } from './mock/adaptateur.ts'
import {
  ConnecteurServiceNow,
  type ConfigServiceNow,
  type DependancesServiceNow,
} from './servicenow/client.ts'
import type { ConnecteurItsm } from './types.ts'

/**
 * Le seul endroit qui choisit l'adaptateur. Ajouter un outil (Jira Service
 * Management…), c'est ajouter une variante ici et un adaptateur à côté : ni
 * l'interface, ni l'application ne changent.
 */
export type ConfigConnecteur =
  ({ systeme: 'mock' } & DependancesMock) | ({ systeme: 'servicenow' } & ConfigServiceNow)

export function creerConnecteur(
  config: ConfigConnecteur,
  dependances: DependancesServiceNow = {},
): ConnecteurItsm {
  switch (config.systeme) {
    case 'mock':
      return new ConnecteurMock(config)
    case 'servicenow':
      return new ConnecteurServiceNow(config, dependances)
    default:
      throw new ErreurItsm('CONFIG', 'Système ITSM inconnu')
  }
}
