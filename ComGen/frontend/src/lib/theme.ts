import { createContext, useContext } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export type ThemeContextValue = {
  /** Ce que l'utilisateur a choisi, « système » compris. */
  preference: ThemePreference
  /** Ce qui est réellement appliqué, une fois « système » résolu. */
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

/*
 * La clé est lue à deux endroits : ici, et dans le script de
 * pré-amorçage d'`index.html` qui pose l'attribut avant le premier
 * rendu. Les deux doivent rester identiques — sans quoi la page
 * clignote en clair avant de basculer en sombre.
 */
export const THEME_STORAGE_KEY = 'comgen:theme'

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme doit être utilisé à l’intérieur de ThemeProvider')
  }
  return context
}
