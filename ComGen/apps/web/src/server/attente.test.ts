// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { attente } from './attente'

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('attente', () => {
  it('attend la durée demandée, pas moins', async () => {
    const attendre = attente()
    let fini = false
    void attendre(500).then(() => {
      fini = true
    })
    await vi.advanceTimersByTimeAsync(499)
    expect(fini).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(fini).toBe(true)
  })

  it('se termine aussitôt quand le signal est déclenché en cours d’attente', async () => {
    const controleur = new AbortController()
    const attendre = attente(controleur.signal)
    let fini = false
    void attendre(60_000).then(() => {
      fini = true
    })
    await vi.advanceTimersByTimeAsync(10)
    expect(fini).toBe(false)
    controleur.abort()
    await vi.advanceTimersByTimeAsync(0)
    expect(fini).toBe(true)
  })

  it('n’attend pas du tout quand le signal est déjà déclenché', async () => {
    const controleur = new AbortController()
    controleur.abort()
    let fini = false
    void attente(controleur.signal)(60_000).then(() => {
      fini = true
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(fini).toBe(true)
  })

  it('ne laisse aucun minuteur derrière une attente interrompue', async () => {
    const controleur = new AbortController()
    void attente(controleur.signal)(60_000)
    controleur.abort()
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(0)
  })
})
