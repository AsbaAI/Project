'use client'

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react'

import {
  type ResolvedTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
  applyPreference,
  readStoredPreference,
  resolveTheme,
  writeStoredPreference,
} from '@/lib/theme'

/*
 * Fournisseur de thème.
 *
 * La source de vérité est le stockage local, pas un état React : c'est ce
 * qui permet au script de pré-amorçage (dans `<head>`) et à ce fournisseur
 * de lire la même chose, et à deux onglets de rester synchronisés via
 * l'événement `storage`. `useSyncExternalStore` fournit un instantané
 * serveur (`system`) pour que l'hydratation ne diverge jamais du HTML.
 */

interface ThemeContextValue {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const DARK_QUERY = '(prefers-color-scheme: dark)'
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const media = window.matchMedia(DARK_QUERY)
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === THEME_STORAGE_KEY) listener()
  }
  window.addEventListener('storage', onStorage)
  media.addEventListener('change', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
    media.removeEventListener('change', listener)
  }
}

function getPreferenceSnapshot(): ThemePreference {
  return readStoredPreference(window.localStorage)
}

function getResolvedSnapshot(): ResolvedTheme {
  return resolveTheme(getPreferenceSnapshot(), window.matchMedia(DARK_QUERY).matches)
}

const getServerPreference = (): ThemePreference => 'system'
const getServerResolved = (): ResolvedTheme => 'light'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(subscribe, getPreferenceSnapshot, getServerPreference)
  const resolved = useSyncExternalStore(subscribe, getResolvedSnapshot, getServerResolved)

  // Reflète au document toute préférence venue d'ailleurs (autre onglet).
  useEffect(() => {
    applyPreference(document.documentElement, preference)
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => {
    writeStoredPreference(window.localStorage, next)
    applyPreference(document.documentElement, next)
    notify()
  }, [])

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme doit être appelé sous <ThemeProvider>.')
  }
  return context
}
