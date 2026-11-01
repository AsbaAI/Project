import { cn } from '@/lib/cn'

/*
 * Monogramme ComGen.
 *
 * Dessin original : un « C » ouvert, tracé d'un seul trait de 2,2 px, et
 * une tuile pleine logée dans l'ouverture — la pièce qui manque et qu'on
 * vient poser. Géométrie simple, lisible à 20 px comme à 64 px, sans
 * dégradé ni ombre. Il prend la couleur du texte courant : une seule
 * forme sert la barre claire, la barre sombre et le favicon.
 */
export function Monogramme({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn('size-8', className)}
      fill="none"
    >
      <path
        d="M25.6 10.4V9.2A3.2 3.2 0 0 0 22.4 6H9.6a3.2 3.2 0 0 0-3.2 3.2v13.6A3.2 3.2 0 0 0 9.6 26h12.8a3.2 3.2 0 0 0 3.2-3.2v-1.2"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <rect x="18.9" y="12.9" width="6.2" height="6.2" rx="1.6" fill="currentColor" />
    </svg>
  )
}

/*
 * Pictogramme de l'espace de travail : quatre tuiles, dont une pleine —
 * l'organisation et la région où l'on travaille. Distinct du monogramme,
 * pour que la carte d'espace ne ressemble pas à un second logo.
 */
export function GlypheEspace({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={cn('size-4.5', className)}
      fill="none"
    >
      <rect x="3.2" y="3.2" width="7.6" height="7.6" rx="2" fill="currentColor" />
      <rect
        x="13.2"
        y="3.2"
        width="7.6"
        height="7.6"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="3.2"
        y="13.2"
        width="7.6"
        height="7.6"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="13.2"
        y="13.2"
        width="7.6"
        height="7.6"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  )
}
