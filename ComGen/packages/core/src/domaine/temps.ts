/**
 * Heures locales et instants UTC (spécification §13.1 : tout est stocké en
 * UTC, saisi et affiché dans le fuseau de l'organisation ou du site).
 *
 * Une heure murale n'identifie pas toujours un instant : au passage à
 * l'heure d'été, certaines n'existent pas ; au retour à l'heure d'hiver,
 * certaines existent deux fois. Dans ces deux cas la conversion refuse au
 * lieu de choisir — l'utilisateur précise, l'application ne devine pas.
 */

/** Valeur d'un champ `datetime-local` : `AAAA-MM-JJTHH:mm`. */
export type HeureLocale = string

export type ResultatConversion =
  | { statut: 'OK'; instant: Date }
  | { statut: 'INEXISTANTE' }
  | { statut: 'AMBIGUE' }
  | { statut: 'INVALIDE' }

const FORMAT_HEURE_LOCALE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

const UNE_HEURE_MS = 3_600_000

function formateur(fuseau: string): Intl.DateTimeFormat | null {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: fuseau,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return null
  }
}

function heureMurale(format: Intl.DateTimeFormat, instant: Date): HeureLocale {
  const parties = Object.fromEntries(
    format.formatToParts(instant).map((partie) => [partie.type, partie.value]),
  )
  return `${parties['year']}-${parties['month']}-${parties['day']}T${parties['hour']}:${parties['minute']}`
}

/** Décalage du fuseau à cet instant, en millisecondes (heure murale − UTC). */
function decalage(format: Intl.DateTimeFormat, instant: Date): number {
  const murale = heureMurale(format, instant)
  return Date.parse(`${murale}:00.000Z`) - Math.floor(instant.getTime() / 60_000) * 60_000
}

export function heureLocaleVersUtc(valeur: HeureLocale, fuseau: string): ResultatConversion {
  const format = formateur(fuseau)
  const morceaux = FORMAT_HEURE_LOCALE.exec(valeur)
  if (format === null || morceaux === null) return { statut: 'INVALIDE' }

  // La date murale lue comme si elle était UTC ; rejette 30 février, 25h…
  const commeUtc = Date.parse(`${valeur}:00.000Z`)
  if (Number.isNaN(commeUtc) || new Date(commeUtc).toISOString().slice(0, 16) !== valeur) {
    return { statut: 'INVALIDE' }
  }

  // Les décalages possibles autour de cette heure : avant et après un
  // éventuel changement d'heure (jamais plus d'un par tranche de 24 h).
  const decalages = new Set([
    decalage(format, new Date(commeUtc - 12 * UNE_HEURE_MS)),
    decalage(format, new Date(commeUtc + 12 * UNE_HEURE_MS)),
  ])
  const instants = [...decalages]
    .map((d) => new Date(commeUtc - d))
    .filter((instant) => heureMurale(format, instant) === valeur)
  const uniques = [...new Set(instants.map((instant) => instant.getTime()))]

  const [seul, ...autres] = uniques
  if (seul === undefined) return { statut: 'INEXISTANTE' }
  if (autres.length > 0) return { statut: 'AMBIGUE' }
  return { statut: 'OK', instant: new Date(seul) }
}

/** Heure murale de l'instant dans le fuseau, au format d'un champ `datetime-local`. */
export function instantVersHeureLocale(instant: Date, fuseau: string): HeureLocale {
  const format = formateur(fuseau)
  if (format === null) throw new RangeError(`Fuseau horaire inconnu : ${fuseau}`)
  return heureMurale(format, instant)
}
