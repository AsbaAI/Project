import { Check, Compass, FileSearch, ListChecks, Sparkles, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import type { AvancementAssistant, EtapeAssistant } from '@/server/services/assistant'

/*
 * Le parcours de la communication : cinq étapes, cinq cartes.
 *
 * Chaque carte dit son rang (« 01 »), ce qu'elle fait, où elle en est, et
 * la seule mesure qui compte à cette étape. Trois états, et chacun est DIT,
 * pas seulement coloré : une étape faite porte une coche, l'étape courante
 * porte `aria-current="step"`, une étape à venir est annoncée comme telle.
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

const ICONES: Record<EtapeAssistant['cle'], LucideIcon> = {
  cadrage: Compass,
  source: FileSearch,
  faits: ListChecks,
  destinataires: Users,
  generation: Sparkles,
}

export function Assistant({ avancement }: AssistantProps) {
  const t = useTranslations('assistant')

  return (
    <nav aria-label={t('label')} className="mb-6">
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {avancement.etapes.map((etape, rang) => (
          <li key={etape.cle} className="min-w-0">
            <Etape etape={etape} rang={rang + 1} t={t} />
          </li>
        ))}
      </ol>
    </nav>
  )
}

interface EtapeProps {
  etape: EtapeAssistant
  rang: number
  t: ReturnType<typeof useTranslations<'assistant'>>
}

function Etape({ etape, rang, t }: EtapeProps) {
  const faite = etape.etat === 'FAITE'
  const courante = etape.etat === 'COURANTE'
  const Icone = ICONES[etape.cle]
  const libelle = t(LIBELLES[etape.cle])
  const cleCompteur = `compteurs.${etape.cle}` as 'compteurs.faits'

  const contenu = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-2xs tracking-caps text-ink-tertiary uppercase">
          {String(rang).padStart(2, '0')} / {t(`courts.${etape.cle}` as 'courts.faits')}
        </span>
        <span
          className={cn(
            'flex shrink-0 items-center gap-1 text-2xs',
            faite && 'text-success-ink',
            courante && 'font-medium text-ink-accent',
            !faite && !courante && 'text-ink-tertiary',
          )}
        >
          {faite ? <Check aria-hidden="true" className="size-3" strokeWidth={2.5} /> : null}
          {faite ? t('etat.faite') : courante ? t('etat.courante') : t('etat.aVenir')}
        </span>
      </span>

      <span className="mt-5 flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-md',
            courante ? 'bg-ai-bg text-ai-ink' : 'bg-surface-sunken text-ink-tertiary',
          )}
        >
          <Icone className="size-5" strokeWidth={1.6} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-display text-base font-medium tracking-tight">
            {libelle}
          </span>
          <span className="mt-1 truncate text-2xs text-ink-tertiary">
            {t(`descriptions.${etape.cle}` as 'descriptions.faits')}
          </span>
        </span>
      </span>

      <span className="mt-5 flex items-center justify-between gap-2 border-t-w border-line-subtle pt-3 text-2xs text-ink-tertiary">
        {etape.compte === null || !t.has(cleCompteur) ? (
          <span className="truncate">{t(`descriptions.${etape.cle}` as 'descriptions.faits')}</span>
        ) : (
          <>
            <span className="truncate">{t(cleCompteur)}</span>
            <span className="shrink-0 font-medium text-ink-primary tnum">{etape.compte}</span>
          </>
        )}
      </span>
    </>
  )

  const classes = cn(
    'flex h-full flex-col rounded-md border-w p-4 transition-colors-token',
    faite && 'border-line-default bg-surface-raised',
    courante && 'border-ai-line bg-ai-bg/35',
    etape.etat === 'A_VENIR' && 'border-line-subtle bg-surface-sunken',
  )

  if (etape.etat === 'A_VENIR') {
    return (
      <span className={cn(classes, 'text-ink-secondary')} aria-disabled="true">
        {contenu}
      </span>
    )
  }

  return (
    <Link
      href={etape.href}
      aria-current={courante ? 'step' : undefined}
      className={cn(classes, 'text-ink-primary no-underline focus-ring hover:border-line-strong')}
    >
      {contenu}
    </Link>
  )
}
