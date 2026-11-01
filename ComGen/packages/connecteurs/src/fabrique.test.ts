import { describe, expect, it } from 'vitest'

import { ErreurItsm } from './erreurs.ts'
import { creerConnecteur } from './fabrique.ts'
import { ConnecteurMock } from './mock/adaptateur.ts'
import { ConnecteurServiceNow } from './servicenow/client.ts'

describe('creerConnecteur', () => {
  it('rend le connecteur de démonstration', () => {
    const connecteur = creerConnecteur({ systeme: 'mock' })
    expect(connecteur).toBeInstanceOf(ConnecteurMock)
    expect(connecteur.systeme).toBe('mock')
  })

  it('rend le connecteur ServiceNow', () => {
    const connecteur = creerConnecteur({
      systeme: 'servicenow',
      urlInstance: 'https://acme.service-now.com',
      identifiants: { methode: 'basic', utilisateur: 'u', motDePasse: 'p' },
    })
    expect(connecteur).toBeInstanceOf(ConnecteurServiceNow)
  })

  it('refuse un système qu’il ne connaît pas', () => {
    expect(() => creerConnecteur({ systeme: 'jira' } as never)).toThrow(ErreurItsm)
  })

  it('refuse une adresse d’instance illisible', () => {
    expect(() =>
      creerConnecteur({
        systeme: 'servicenow',
        urlInstance: 'pas une url',
        identifiants: { methode: 'basic', utilisateur: 'u', motDePasse: 'p' },
      }),
    ).toThrow(ErreurItsm)
  })
})
