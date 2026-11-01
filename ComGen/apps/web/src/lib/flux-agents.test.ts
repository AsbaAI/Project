import { describe, expect, it } from 'vitest'

import { ErreurFlux, type MessageFlux, lireMessage, messagesDuFlux, versLigne } from './flux-agents'

/** Un flux d'octets découpé comme le réseau le voudra : n'importe où. */
function fluxEn(morceaux: readonly string[]): ReadableStream<Uint8Array> {
  const encodeur = new TextEncoder()
  return new ReadableStream({
    start(controleur) {
      for (const morceau of morceaux) controleur.enqueue(encodeur.encode(morceau))
      controleur.close()
    },
  })
}

async function toutLire(flux: ReadableStream<Uint8Array>): Promise<MessageFlux[]> {
  const messages: MessageFlux[] = []
  for await (const message of messagesDuFlux(flux)) messages.push(message)
  return messages
}

const DEBUT: MessageFlux = { type: 'debut', mode: 'simulation', motif: 'AUCUN_FOURNISSEUR' }
const ETAT: MessageFlux = {
  type: 'etat',
  termine: false,
  etapes: [
    { role: 'REDACTEUR', etat: 'EN_COURS' },
    { role: 'VERIFICATEUR', etat: 'EN_ATTENTE' },
  ],
}

describe('lireMessage', () => {
  it('relit ce que versLigne a écrit', () => {
    for (const message of [DEBUT, ETAT, { type: 'fin', bloquant: false } as const]) {
      expect(lireMessage(versLigne(message).trim())).toEqual(message)
    }
  })

  it('refuse une ligne qui n’est pas du JSON', () => {
    expect(lireMessage('pas du json')).toBeNull()
  })

  it('refuse un message de forme inconnue ou incomplète', () => {
    expect(lireMessage('{"type":"inconnu"}')).toBeNull()
    expect(lireMessage('{"type":"etat","termine":true}')).toBeNull()
    expect(
      lireMessage('{"type":"etat","termine":true,"etapes":[{"role":"X","etat":"BIZARRE"}]}'),
    ).toBeNull()
  })
})

describe('messagesDuFlux', () => {
  it('rend un message par ligne, dans l’ordre', async () => {
    const flux = fluxEn([versLigne(DEBUT), versLigne(ETAT)])
    expect(await toutLire(flux)).toEqual([DEBUT, ETAT])
  })

  it('recolle une ligne coupée au milieu entre deux blocs', async () => {
    const ligne = versLigne(ETAT)
    const coupe = Math.floor(ligne.length / 2)
    const flux = fluxEn([versLigne(DEBUT), ligne.slice(0, coupe), ligne.slice(coupe)])
    expect(await toutLire(flux)).toEqual([DEBUT, ETAT])
  })

  it('recolle un caractère accentué coupé entre deux blocs d’octets', async () => {
    const message: MessageFlux = {
      type: 'erreur',
      code: 'GENERATION_REFUSEE',
      detail: 'Génération refusée : élan',
    }
    const octets = new TextEncoder().encode(versLigne(message))
    const accent = octets.indexOf(0xc3) // premier octet d'un « é » encodé sur deux
    expect(accent).toBeGreaterThan(0)
    const flux = new ReadableStream<Uint8Array>({
      start(controleur) {
        controleur.enqueue(octets.slice(0, accent + 1))
        controleur.enqueue(octets.slice(accent + 1))
        controleur.close()
      },
    })
    expect(await toutLire(flux)).toEqual([message])
  })

  it('lit une dernière ligne sans saut de ligne final', async () => {
    const flux = fluxEn([versLigne(DEBUT), versLigne(ETAT).trimEnd()])
    expect(await toutLire(flux)).toEqual([DEBUT, ETAT])
  })

  it('ignore les lignes vides', async () => {
    const flux = fluxEn(['\n\n', versLigne(DEBUT), '\n'])
    expect(await toutLire(flux)).toEqual([DEBUT])
  })

  it('échoue sur une ligne illisible : un flux corrompu ne se devine pas', async () => {
    const flux = fluxEn([versLigne(DEBUT), 'n’importe quoi\n'])
    await expect(toutLire(flux)).rejects.toBeInstanceOf(ErreurFlux)
  })
})
