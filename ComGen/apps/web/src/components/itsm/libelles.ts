import type { BadgeTone } from '@/components/ui/badge'

/*
 * Vocabulaire des tickets. Le code de statut vient normalisé du
 * connecteur ; l'application l'écrit dans la langue de la page, et garde le
 * libellé de l'outil quand le code lui est inconnu (`AUTRE`) plutôt que de
 * perdre l'information.
 */

export type StatutAffiche =
  'NOUVEAU' | 'EN_COURS' | 'EN_ATTENTE' | 'RESOLU' | 'CLOS' | 'ANNULE' | 'AUTRE'

const TONS: Record<StatutAffiche, BadgeTone> = {
  NOUVEAU: 'draft',
  EN_COURS: 'accent',
  EN_ATTENTE: 'pending',
  RESOLU: 'success',
  CLOS: 'neutral',
  ANNULE: 'neutral',
  AUTRE: 'neutral',
}

export function tonStatut(code: string): BadgeTone {
  return TONS[code as StatutAffiche] ?? 'neutral'
}
