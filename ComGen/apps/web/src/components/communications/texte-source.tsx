import { decouperEnSegments } from '@/lib/segments'
import type { FaitDeFiche } from '@/server/services/faits'

/*
 * Texte d'une source, tel que figé : chaque caractère est rendu, aucun
 * n'est réécrit. Les citations des faits vivants sont surlignées ; une
 * citation en contradiction est en plus soulignée d'un trait ondulé (la
 * forme, pas seulement la couleur). Chaque fait a son ancre
 * (`#citation-F-03`), atteinte depuis sa carte.
 */
export function TexteSource({
  contenu,
  faits,
}: {
  contenu: string
  faits: readonly Pick<FaitDeFiche, 'reference' | 'localisation' | 'statut' | 'contradiction'>[]
}) {
  const vivants = faits.filter((f) => f.statut !== 'RETIRE' && f.statut !== 'PERIME')
  const enContradiction = new Set(
    vivants.filter((f) => f.contradiction !== null).map((f) => f.reference),
  )
  const segments = decouperEnSegments(
    contenu,
    faits.map((f) => ({
      cle: f.reference,
      debut: f.localisation.offsetDebut,
      fin: f.localisation.offsetFin,
    })),
  )
  const vivantsParCle = new Set(vivants.map((f) => f.reference))

  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-ink-primary">
      {segments.map((segment) => {
        const ancres = segment.commencant.map((cle) => (
          <span key={cle} id={`citation-${cle}`} className="scroll-mt-24" />
        ))
        const couvrants = segment.couvrant.filter((cle) => vivantsParCle.has(cle))
        if (couvrants.length === 0) {
          return (
            <span key={segment.debut}>
              {ancres}
              {segment.texte}
            </span>
          )
        }
        const contradictoire = couvrants.some((cle) => enContradiction.has(cle))
        return (
          <mark
            key={segment.debut}
            data-faits={couvrants.join(' ')}
            className={
              contradictoire
                ? 'rounded-xs bg-highlight-danger text-ink-primary underline decoration-danger-solid decoration-wavy decoration-1 underline-offset-4'
                : 'rounded-xs bg-highlight text-ink-primary'
            }
          >
            {ancres}
            {segment.texte}
          </mark>
        )
      })}
    </p>
  )
}
