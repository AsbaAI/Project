import { describe, expect, it } from 'vitest'

import { ErreurItsm } from './erreurs.ts'
import { POLITIQUE_PAR_DEFAUT, verifierUrlInstance } from './url.ts'

function refus(brut: string, politique = POLITIQUE_PAR_DEFAUT): ErreurItsm {
  try {
    verifierUrlInstance(brut, politique)
  } catch (erreur) {
    if (erreur instanceof ErreurItsm) return erreur
    throw erreur
  }
  throw new Error(`« ${brut} » aurait dû être refusée`)
}

describe('verifierUrlInstance', () => {
  it('accepte une instance ServiceNow et rend son origine', () => {
    expect(verifierUrlInstance('https://acme.service-now.com')).toBe('https://acme.service-now.com')
  })

  it('ne garde que l’origine : chemin, requête et ancre sont écartés', () => {
    expect(verifierUrlInstance('https://acme.service-now.com/nav_to.do?uri=x#y')).toBe(
      'https://acme.service-now.com',
    )
  })

  it('met l’hôte en minuscules et accepte le port 443 écrit', () => {
    expect(verifierUrlInstance('https://ACME.Service-Now.com:443/')).toBe(
      'https://acme.service-now.com',
    )
  })

  it('refuse tout ce qui n’est pas https, avec le code CONFIG', () => {
    const erreur = refus('http://acme.service-now.com')
    expect(erreur.code).toBe('CONFIG')
  })

  it('refuse des identifiants glissés dans l’adresse', () => {
    expect(refus('https://admin:secret@acme.service-now.com').code).toBe('CONFIG')
    expect(refus('https://admin@acme.service-now.com').code).toBe('CONFIG')
  })

  it('refuse un hôte hors de la liste autorisée', () => {
    expect(refus('https://evil.example').code).toBe('CONFIG')
  })

  it('refuse les hôtes qui ne font que ressembler à un domaine autorisé', () => {
    expect(refus('https://acme.service-now.com.evil.example').code).toBe('CONFIG')
    expect(refus('https://evilservice-now.com').code).toBe('CONFIG')
    expect(refus('https://service-now.com').code).toBe('CONFIG')
  })

  it('un suffixe commence par un point ; un hôte entier ne s’étend pas à ses sous-domaines', () => {
    const politique = { hotesAutorises: ['itsm.entreprise.example'] }
    expect(verifierUrlInstance('https://itsm.entreprise.example', politique)).toBe(
      'https://itsm.entreprise.example',
    )
    expect(refus('https://sous.itsm.entreprise.example', politique).code).toBe('CONFIG')
  })

  it('refuse un port qui n’est pas celui de https', () => {
    expect(refus('https://acme.service-now.com:8443').code).toBe('CONFIG')
  })

  it('refuse les adresses IP et localhost, même présents dans la liste', () => {
    const politique = { hotesAutorises: ['10.0.0.5', '[::1]', 'localhost', '127.0.0.1'] }
    for (const adresse of [
      'https://10.0.0.5',
      'https://[::1]',
      'https://localhost',
      'https://127.0.0.1',
      'https://169.254.169.254',
    ]) {
      expect(refus(adresse, politique).code).toBe('CONFIG')
    }
  })

  it('refuse une adresse illisible ou vide', () => {
    expect(refus('pas une url').code).toBe('CONFIG')
    expect(refus('').code).toBe('CONFIG')
  })

  it('une politique permissive ouvre http, les adresses locales et les ports — pour les tests seulement', () => {
    const politique = {
      hotesAutorises: ['127.0.0.1'],
      autoriserHttp: true,
      autoriserAdressesPrivees: true,
      autoriserPorts: true,
    }
    expect(verifierUrlInstance('http://127.0.0.1:4010/x', politique)).toBe('http://127.0.0.1:4010')
  })

  it('le message ne reprend pas l’adresse saisie : elle peut porter un secret', () => {
    const erreur = refus('https://admin:motdepasse@evil.example')
    expect(erreur.message).not.toContain('motdepasse')
  })
})
