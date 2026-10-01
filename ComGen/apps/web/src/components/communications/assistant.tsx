import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import type { AvancementAssistant, EtapeAssistant } from '@/server/services/assistant'

/*
 * Fil des cinq étapes de l'assistant.
 *
 * Trois états, et chacun est DIT, pas seulement coloré : une étape faite
 * porte une coche et son rang reste lisible ; l'étape courante porte
 * `aria-current="step"` ; une étape à venir est annoncée comme telle au
 * lecteur d'écran. Rien ici ne repose sur la couleur seule.
 *
 * Une étape à venir n'est pas un lien : elle n'est pas atteignable, et un
 * lien qui mène à un écran vide apprend à ne plus cliquer. Une étape faite
 * en est un : on revient en arrière autant qu'on veut.
 */
export interface AssistantProps {
  avancement: AvancementAssistant
}

const LIBELLES = {
  cadrage: 'cadrage',
  source: 'source',
  faits: 'faits',
  destinataires: 'destinataires',
  generation: 'generation',
} as const

export function Assistant({ avancement }: AssistantProps) {
  const t = useTranslations('assistant')

  return (
    <nav aria-label={t('label')} className="mb-6">
      <ol className="flex flex-wrap items-stretch gap-1">
        {avancement.etapes.map((etape, rang) => (
          <li key={etape.cle} className="min-w-0 flex-1 basis-40">
            <Etape etape={etape} rang={rang + 1} libelle={t(LIBELLES[etape.cle])} t={t} />
          </li>
        ))}
      </ol>
    </nav>
  )
}

interface EtapeProps {
  etape: EtapeAssistant
  rang: number
  libelle: string
  t: ReturnType<typeof useTranslations<'assistant'>>
}

function Etape({ etape, rang, libelle, t }: EtapeProps) {
  const faite = etape.etat === 'FAITE'
  const courante = etape.etat === 'COURANTE'

  const contenu = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full text-2xs font-semibold',
          faite && 'bg-success-solid text-on-action',
          courante && 'bg-action text-on-action',
          etape.etat === 'A_VENIR' && 'border-w border-line-default text-ink-tertiary',
        )}
      >
        {faite ? <Check className="size-3.5" strokeWidth={3} /> : rang}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{libelle}</span>
        <span className="block text-2xs text-ink-tertiary">
          {/* L'état est écrit, pas seulement peint. */}
          {faite ? t('etat.faite') : courante ? t('etat.courante') : t('etat.aVenir')}
          {etape.compte === null ? null : ` · ${etape.compte}`}
        </span>
      </span>
    </>
  )

  const classes = cn(
    'flex h-full items-center gap-2 rounded-sm border-w px-3 py-2',
    faite && 'border-line-default bg-surface-raised text-ink-primary',
    courante && 'border-action bg-surface-selected text-ink-primary',
    etape.etat === 'A_VENIR' && 'border-line-subtle bg-surface-sunken text-ink-secondary',
  )

  if (etape.etat === 'A_VENIR') {
    return (
      <span className={classes} aria-disabled="true">
        {contenu}
      </span>
    )
  }

  return (
    <Link
      href={etape.href}
      aria-current={courante ? 'step' : undefined}
      className={cn(
        classes,
        'no-underline transition-colors-token focus-ring hover:bg-surface-hover',
      )}
    >
      {contenu}
    </Link>
  )
}
