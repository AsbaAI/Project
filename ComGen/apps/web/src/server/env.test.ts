// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { ErreurConfiguration, analyserEnvironnement } from './env'

const BASE = {
  DATABASE_URL: 'postgresql://comgen:secret@127.0.0.1:5432/comgen',
  AUTH_SECRET: 'x'.repeat(32),
  ANTIVIRUS_MODE: 'aucun',
}

describe('analyserEnvironnement', () => {
  it("exige un mode antivirus explicite : il n'y a pas de valeur par défaut", () => {
    const { ANTIVIRUS_MODE: _, ...sansAntivirus } = BASE
    expect(() => analyserEnvironnement({ ...sansAntivirus, AUTH_SIMULATEUR: 'true' })).toThrow(
      ErreurConfiguration,
    )
  })

  it('accepte le simulateur en développement', () => {
    const env = analyserEnvironnement({ ...BASE, NODE_ENV: 'development', AUTH_SIMULATEUR: 'true' })
    expect(env.COMGEN_ENV).toBe('developpement')
    expect(env.AUTH_SIMULATEUR).toBe(true)
  })

  it("un build de production est en production tant qu'on ne dit pas le contraire", () => {
    expect(() =>
      analyserEnvironnement({ ...BASE, NODE_ENV: 'production', AUTH_SIMULATEUR: 'true' }),
    ).toThrow(/AUTH_SIMULATEUR est interdit en production/)
  })

  it('le simulateur reste interdit si COMGEN_ENV=production, même hors build de production', () => {
    expect(() =>
      analyserEnvironnement({
        ...BASE,
        NODE_ENV: 'development',
        COMGEN_ENV: 'production',
        AUTH_SIMULATEUR: 'true',
      }),
    ).toThrow(/AUTH_SIMULATEUR est interdit en production/)
  })

  it('un build de production déclaré environnement de test admet le simulateur (tests de bout en bout)', () => {
    const env = analyserEnvironnement({
      ...BASE,
      NODE_ENV: 'production',
      COMGEN_ENV: 'test',
      AUTH_SIMULATEUR: 'true',
    })
    expect(env.COMGEN_ENV).toBe('test')
  })
})
