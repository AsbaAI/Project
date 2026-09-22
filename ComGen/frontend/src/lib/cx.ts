/**
 * Concatène des noms de classes en ignorant les valeurs vides.
 *
 * Volontairement minuscule : `clsx` et `classnames` ajoutent une
 * dépendance pour huit lignes de code, et gèrent des formes (objets,
 * tableaux imbriqués) dont ce projet n'a pas l'usage.
 *
 *   cx(styles.button, isActive && styles.active, className)
 */
export function cx(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(' ')
}
