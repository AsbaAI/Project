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

  it('une démo publique admet le simulateur, déclarée explicitement', () => {
    const env = analyserEnvironnement({
      ...BASE,
      NODE_ENV: 'production',
      COMGEN_ENV: 'demo',
      AUTH_SIMULATEUR: 'true',
    })
    expect(env.COMGEN_ENV).toBe('demo')
    expect(env.AUTH_SIMULATEUR).toBe(true)
  })

  it('une valeur inconnue de COMGEN_ENV est refusée, jamais prise pour une démo', () => {
    expect(() =>
      analyserEnvironnement({
        ...BASE,
        NODE_ENV: 'production',
        COMGEN_ENV: 'demonstration',
        AUTH_SIMULATEUR: 'true',
      }),
    ).toThrow(ErreurConfiguration)
  })
})

describe('COMGEN_DELAIS_SIMULATION', () => {
  const ENV_MINIMAL = {
    DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/x',
    AUTH_SECRET: 'a'.repeat(32),
    AUTH_SIMULATEUR: 'true',
    ANTIVIRUS_MODE: 'aucun',
  }

  it('échelonne la simulation par défaut : une démonstration doit se voir travailler', () => {
    expect(analyserEnvironnement(ENV_MINIMAL).COMGEN_DELAIS_SIMULATION).toBe(true)
  })

  it('se désactive explicitement, pour les tests et la CI', () => {
    expect(
      analyserEnvironnement({ ...ENV_MINIMAL, COMGEN_DELAIS_SIMULATION: 'false' })
        .COMGEN_DELAIS_SIMULATION,
    ).toBe(false)
    expect(
      analyserEnvironnement({ ...ENV_MINIMAL, COMGEN_DELAIS_SIMULATION: '0' })
        .COMGEN_DELAIS_SIMULATION,
    ).toBe(false)
  })
})

describe('connecteur ITSM', () => {
  const MINIMAL = {
    DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/x',
    AUTH_SECRET: 'a'.repeat(32),
    AUTH_SIMULATEUR: 'true',
    ANTIVIRUS_MODE: 'aucun',
  }
  const lire = (surcharge: Record<string, string> = {}) =>
    analyserEnvironnement({ ...MINIMAL, ...surcharge })

  it('se règle par organisation tant qu’on ne dit rien d’autre', () => {
    expect(lire().ITSM_MODE).toBe('servicenow')
  })

  it.each(['mock', 'servicenow', 'desactive'] as const)('admet le mode « %s »', (mode) => {
    expect(lire({ ITSM_MODE: mode }).ITSM_MODE).toBe(mode)
  })

  it('refuse un mode qu’il ne connaît pas', () => {
    expect(() => lire({ ITSM_MODE: 'jira' })).toThrow(ErreurConfiguration)
  })

  it('n’ajoute aucun hôte par défaut : le domaine de ServiceNow est déjà autorisé ailleurs', () => {
    expect(lire().ITSM_HOTES_AUTORISES).toEqual([])
  })

  it('lit la liste d’hôtes autorisés, en minuscules et sans blancs', () => {
    expect(
      lire({ ITSM_HOTES_AUTORISES: ' .Service-Now.com , itsm.entreprise.example,, ' })
        .ITSM_HOTES_AUTORISES,
    ).toEqual(['.service-now.com', 'itsm.entreprise.example'])
  })

  it.each(['https://itsm.example', 'itsm.example/chemin', 'itsm example', '*.example.com', 'a@b'])(
    'refuse « %s » : ce n’est ni un hôte ni un suffixe de domaine',
    (valeur) => {
      expect(() => lire({ ITSM_HOTES_AUTORISES: valeur })).toThrow(ErreurConfiguration)
    },
  )
})
