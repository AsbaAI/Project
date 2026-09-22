import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  THEME_STORAGE_KEY,
  ThemeContext,
  type ResolvedTheme,
  type ThemePreference,
} from '../lib/theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function readStoredPreference(): ThemePreference {
  if (typeof localStorage === 'undefined') return 'system'
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

function systemTheme(): ResolvedTheme {
  if (typeof matchMedia === 'undefined') return 'light'
  return matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

/*
 * Thème
 *
 * Trois états, pas deux : clair, sombre, et « comme le système ». Un
 * simple interrupteur oblige l'utilisateur à refaire à la main ce que
 * son système d'exploitation fait déjà au coucher du soleil.
 *
 * Le choix est stocké, mais tant qu'il vaut « système » aucun attribut
 * n'est posé sur <html> : ce sont les media queries des tokens qui
 * décident, et le suivi est alors automatique.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] =
    useState<ThemePreference>(readStoredPreference)
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme)

  // Suit le réglage du système même quand l'utilisateur a choisi
  // explicitement : il peut revenir sur « système » à tout moment.
  useEffect(() => {
    const media = matchMedia(DARK_QUERY)
    const onChange = (event: MediaQueryListEvent) => {
      setSystem(event.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const resolved: ResolvedTheme = preference === 'system' ? system : preference

  useEffect(() => {
    const root = document.documentElement

    if (preference === 'system') {
      root.removeAttribute('data-theme')
    } else {
      root.dataset.theme = preference
    }

    // Indique au navigateur la couleur des éléments natifs :
    // ascenseurs, champs de formulaire par défaut, menus.
    root.style.colorScheme = resolved
  }, [preference, resolved])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    try {
      if (next === 'system') {
        localStorage.removeItem(THEME_STORAGE_KEY)
      } else {
        localStorage.setItem(THEME_STORAGE_KEY, next)
      }
    } catch {
      // Navigation privée ou stockage refusé : le thème reste actif
      // pour la session, ce n'est pas une raison d'échouer.
    }
  }, [])

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}
