import { useTranslations } from 'next-intl'

import { cn } from '@/lib/cn'
import type { EtatMoteur } from '@/server/moteur'

/*
 * Pastille d'état du moteur, dans la barre supérieure.
 *
 * Deux états seulement, et chacun est DIT, pas seulement coloré : « IA
 * prête » ou « Mode démonstration ». Le point coloré redouble le libellé,
 * il ne le remplace pas — un daltonien lit la même chose.
 *
 * `title` porte la variable attendue (jamais sa valeur) : c'est ce qui
 * explique en un survol pourquoi la pastille est orange, et c'est le même
 * texte que l'écran Paramètres affichera.
 */
export interface BadgeMoteurProps {
  etat: EtatMoteur
  /** Nom de la variable d'environnement attendue. Jamais un secret. */
  reference: string
  className?: string
}

export function BadgeMoteur({ etat, reference, className }: BadgeMoteurProps) {
  const t = useTranslations('engine')
  const pret = etat === 'pret'

  return (
    <span
      title={pret ? t('readyHint', { reference }) : t('demoHint', { reference })}
      className={cn(
        'inline-flex h-control-md items-center gap-1.5 rounded-full bg-nav-selected px-2.5',
        'text-xs font-medium whitespace-nowrap text-nav-ink',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 shrink-0 rounded-full', pret ? 'bg-nav-ok' : 'bg-nav-alert')}
      />
      <span className="sr-only">{t('label')} : </span>
      {pret ? t('ready') : t('demo')}
    </span>
  )
}
