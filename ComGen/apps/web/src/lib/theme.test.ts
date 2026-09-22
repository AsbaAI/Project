import { describe, expect, it, vi } from 'vitest'

import {
  THEME_BOOT_SCRIPT,
  THEME_STORAGE_KEY,
  applyPreference,
  isThemePreference,
  readStoredPreference,
  resolveTheme,
  writeStoredPreference,
} from './theme'

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    store,
  }
}

describe('theme', () => {
  it('reconnaît les trois préférences et rejette le reste', () => {
    expect(isThemePreference('system')).toBe(true)
    expect(isThemePreference('light')).toBe(true)
    expect(isThemePreference('dark')).toBe(true)
    expect(isThemePreference('auto')).toBe(false)
    expect(isThemePreference(null)).toBe(false)
    expect(isThemePreference(42)).toBe(false)
  })

  it('lit la préférence stockée et retombe sur system pour toute valeur inattendue', () => {
    expect(readStoredPreference(fakeStorage({ [THEME_STORAGE_KEY]: 'dark' }))).toBe('dark')
    expect(readStoredPreference(fakeStorage({ [THEME_STORAGE_KEY]: 'bleu' }))).toBe('system')
    expect(readStoredPreference(fakeStorage())).toBe('system')
    expect(readStoredPreference(undefined)).toBe('system')
  })

  it('survit à un stockage qui lève', () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError')
      },
    }
    expect(readStoredPreference(broken)).toBe('system')
  })

  it('écrit un choix explicite et efface la clé pour system', () => {
    const storage = fakeStorage()
    writeStoredPreference(storage, 'light')
    expect(storage.store.get(THEME_STORAGE_KEY)).toBe('light')
    writeStoredPreference(storage, 'system')
    expect(storage.store.has(THEME_STORAGE_KEY)).toBe(false)
  })

  it('résout system selon le réglage du système', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('pose data-theme pour un choix explicite et le retire pour system', () => {
    const root = { setAttribute: vi.fn(), removeAttribute: vi.fn() }
    applyPreference(root, 'dark')
    expect(root.setAttribute).toHaveBeenCalledWith('data-theme', 'dark')
    applyPreference(root, 'system')
    expect(root.removeAttribute).toHaveBeenCalledWith('data-theme')
  })

  it('le script de pré-amorçage applique la même règle que applyPreference', () => {
    expect(runBootScript('dark')).toBe('dark')
    expect(runBootScript('light')).toBe('light')
    expect(runBootScript('system')).toBeUndefined()
    expect(runBootScript("n'importe quoi")).toBeUndefined()
    expect(runBootScript(null)).toBeUndefined()
  })
})

/** Exécute le script sérialisé contre un faux document et rend `data-theme`. */
function runBootScript(stored: string | null): string | undefined {
  const attrs = new Map<string, string>()
  const documentElement = {
    setAttribute: (k: string, v: string) => void attrs.set(k, v),
  }
  const localStorage = { getItem: () => stored }
  // Exécution contrôlée d'une chaîne connue : c'est précisément ce que le navigateur fera.
  new Function('localStorage', 'document', THEME_BOOT_SCRIPT)(localStorage, { documentElement })
  return attrs.get('data-theme')
}
