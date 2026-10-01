/**
 * Thème d'affichage.
 *
 * Trois préférences, deux thèmes effectifs. `system` ne pose aucun
 * attribut : ce sont les feuilles de style (`@media (prefers-color-scheme)`)
 * qui décident, et l'interface suit le réglage du système en direct.
 *
 * Ce module est volontairement sans dépendance React : il est exécuté
 * aussi par le script de pré-amorçage inséré dans `<head>`, avant toute
 * hydratation, pour éviter un éclair de thème clair au chargement.
 */

export const THEME_STORAGE_KEY = 'comgen:theme'

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]
export type ResolvedTheme = Exclude<ThemePreference, 'system'>

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value)
}

/** Lit la préférence stockée ; toute valeur inattendue vaut `system`. */
export function readStoredPreference(
  storage: Pick<Storage, 'getItem'> | undefined,
): ThemePreference {
  if (!storage) return 'system'
  try {
    const raw = storage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(raw) ? raw : 'system'
  } catch {
    // Stockage indisponible (navigation privée, politique de site) :
    // l'application reste utilisable, elle suit simplement le système.
    return 'system'
  }
}

export function writeStoredPreference(
  storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined,
  preference: ThemePreference,
): void {
  if (!storage) return
  try {
    if (preference === 'system') storage.removeItem(THEME_STORAGE_KEY)
    else storage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Même raison : l'échec d'écriture n'est pas une erreur applicative.
  }
}

/** Résout la préférence en thème effectif à partir du réglage système. */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light'
  return preference
}

/**
 * Applique la préférence au document : pose `data-theme` pour un choix
 * explicite, le retire pour `system`. C'est le seul endroit qui écrit
 * cet attribut.
 */
export function applyPreference(
  root: Pick<Element, 'setAttribute' | 'removeAttribute'>,
  preference: ThemePreference,
): void {
  if (preference === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', preference)
}

/**
 * Script de pré-amorçage, sérialisé pour être inséré dans `<head>`.
 * Il reproduit `readStoredPreference` + `applyPreference` sans importer
 * ce module (il s'exécute avant tout bundle). Testé pour rester aligné.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var v=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(v==='light'||v==='dark'){document.documentElement.setAttribute('data-theme',v)}}catch(e){}})();`
