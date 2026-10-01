// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { AntivirusDesactive } from './desactive'
import { creerAntivirus } from './index'

const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'

describe('AntivirusDesactive', () => {
  it('se déclare en mode `aucun`, jamais `clamd`', () => {
    expect(new AntivirusDesactive().mode).toBe('aucun')
  })

  it('répond SAIN sans analyser, même sur la chaîne EICAR', async () => {
    const antivirus = new AntivirusDesactive()
    expect(await antivirus.analyser(new TextEncoder().encode(EICAR))).toEqual({ verdict: 'SAIN' })
    expect(await antivirus.analyser(new Uint8Array(0))).toEqual({ verdict: 'SAIN' })
  })

  it('creerAntivirus({ mode: "aucun" }) renvoie cet adaptateur', () => {
    const cree = creerAntivirus({ mode: 'aucun' })
    expect(cree).toBeInstanceOf(AntivirusDesactive)
    expect(cree.mode).toBe('aucun')
  })
})
