import { cn } from '@/lib/cn'

/*
 * Constellation : le visuel de signature de l'application.
 *
 * Dessin vectoriel original, posé une seule fois, en bandeau d'accueil. Il
 * figure ce que fait l'application — une source, des agents qui la lisent,
 * des audiences qui en sortent — sans prétendre être un schéma : aucune
 * étiquette, aucune donnée. Il est purement décoratif, donc caché aux
 * technologies d'assistance.
 *
 * Tout est en `currentColor` avec des opacités variables : le même tracé
 * sert les deux thèmes. Les coordonnées sont fixes et volontairement
 * irrégulières — une grille parfaite ferait « fond d'écran ».
 */

/** Nœuds : [x, y, rayon, opacité]. Le premier est le foyer. */
const NOEUDS: readonly [number, number, number, number][] = [
  [240, 140, 7, 1],
  [138, 72, 3.4, 0.75],
  [336, 68, 3, 0.65],
  [96, 164, 3.8, 0.8],
  [386, 150, 3.4, 0.7],
  [168, 232, 3, 0.6],
  [312, 236, 3.6, 0.75],
  [60, 96, 2.4, 0.45],
  [420, 96, 2.2, 0.4],
  [248, 44, 2.6, 0.5],
  [244, 262, 2.4, 0.45],
  [430, 212, 2.2, 0.4],
  [74, 232, 2, 0.35],
]

/** Liens : index de départ, index d'arrivée. */
const LIENS: readonly [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [0, 6],
  [1, 7],
  [1, 9],
  [2, 8],
  [2, 9],
  [3, 12],
  [3, 5],
  [4, 11],
  [4, 6],
  [5, 10],
  [6, 10],
  [6, 11],
]

export function Constellation({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 300"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
      className={cn('size-full', className)}
      fill="none"
    >
      {/* Halo du foyer : une seule respiration, pas un dégradé partout. */}
      <circle cx="240" cy="140" r="78" fill="currentColor" opacity="0.05" />
      <circle cx="240" cy="140" r="46" fill="currentColor" opacity="0.06" />
      <g stroke="currentColor" strokeWidth="0.9">
        {LIENS.map(([de, vers]) => {
          const depart = NOEUDS[de]
          const arrivee = NOEUDS[vers]
          if (!depart || !arrivee) return null
          return (
            <line
              key={`${String(de)}-${String(vers)}`}
              x1={depart[0]}
              y1={depart[1]}
              x2={arrivee[0]}
              y2={arrivee[1]}
              opacity={0.28}
            />
          )
        })}
      </g>
      <g fill="currentColor">
        {NOEUDS.map(([x, y, r, opacite]) => (
          <circle key={`${String(x)}-${String(y)}`} cx={x} cy={y} r={r} opacity={opacite} />
        ))}
      </g>
      {/* Anneau du foyer : la seule forme qui ne soit pas un point. */}
      <circle cx="240" cy="140" r="19" stroke="currentColor" strokeWidth="1.1" opacity="0.45" />
    </svg>
  )
}
