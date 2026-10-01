/**
 * Découpe un texte en segments selon des plages marquées (citations de
 * faits) qui peuvent se chevaucher ou coïncider. Chaque segment sait quelles
 * marques le couvrent et lesquelles y commencent : l'affichage surligne et
 * pose une ancre par fait, sans jamais réécrire un caractère du texte.
 */
export interface Marque {
  cle: string
  debut: number
  fin: number
}

export interface Segment {
  texte: string
  debut: number
  couvrant: readonly string[]
  commencant: readonly string[]
}

export function decouperEnSegments(texte: string, marques: readonly Marque[]): Segment[] {
  const valides = marques.filter(
    (m) =>
      Number.isInteger(m.debut) &&
      Number.isInteger(m.fin) &&
      m.debut >= 0 &&
      m.fin <= texte.length &&
      m.debut < m.fin,
  )
  const bornes = [
    ...new Set([0, texte.length, ...valides.flatMap((m) => [m.debut, m.fin])]),
  ].toSorted((a, b) => a - b)
  const segments: Segment[] = []
  for (let i = 0; i < bornes.length - 1; i += 1) {
    const debut = bornes[i] ?? 0
    const fin = bornes[i + 1] ?? texte.length
    if (fin <= debut) continue
    segments.push({
      texte: texte.slice(debut, fin),
      debut,
      couvrant: valides.filter((m) => m.debut <= debut && m.fin >= fin).map((m) => m.cle),
      commencant: valides.filter((m) => m.debut === debut).map((m) => m.cle),
    })
  }
  return segments
}
