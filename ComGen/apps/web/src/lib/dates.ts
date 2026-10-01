/**
 * Affichage des instants (§13.1) : stockés en UTC, montrés dans le fuseau
 * de l'utilisateur (site, sinon organisation), avec ce fuseau écrit en
 * clair. Une date affichée sans fuseau est une date ambiguë.
 */
export function formaterInstant(
  instant: Date,
  locale: string,
  fuseau: string,
  style: 'date' | 'dateHeure' = 'dateHeure',
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: fuseau,
    dateStyle: 'medium',
    ...(style === 'dateHeure' ? { timeStyle: 'short' } : {}),
  }).format(instant)
}

/** Nom court du fuseau à cet instant (« UTC+2 », « BST »…), pour l'écrire à côté de l'heure. */
export function nomFuseau(instant: Date, locale: string, fuseau: string): string {
  const partie = new Intl.DateTimeFormat(locale, { timeZone: fuseau, timeZoneName: 'short' })
    .formatToParts(instant)
    .find((p) => p.type === 'timeZoneName')
  return partie?.value ?? fuseau
}
