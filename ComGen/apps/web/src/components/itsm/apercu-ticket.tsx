import { ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import { Link } from '@/i18n/navigation'
import type { SourceItsmPreparee } from '@/server/services/itsm'

/*
 * Ce que les agents liront, montré avant d'engager quoi que ce soit.
 *
 * Le texte affiché EST celui qui deviendra la source : même composition,
 * même masquage, même empreinte. Rien n'est reformulé pour l'affichage,
 * sinon l'aperçu mentirait.
 */
export interface ApercuTicketProps {
  source: SourceItsmPreparee
  /** Adresse du même aperçu avec les notes de travail en plus ou en moins. */
  lienNotes: string
  /** Action d'import, ajoutée quand l'écran peut écrire. */
  action?: React.ReactNode
}

const CATEGORIES = ['courriel', 'telephone', 'identifiant', 'terme'] as const

export function ApercuTicket({ source, lienNotes, action }: ApercuTicketProps) {
  const t = useTranslations('itsm')
  const compte = CATEGORIES.filter((categorie) => source.masquages[categorie] > 0).map(
    (categorie) => t(`preview.counts.${categorie}`, { count: source.masquages[categorie] }),
  )

  return (
    <Panel
      title={t('preview.title')}
      description={t('preview.description')}
      actions={action}
      footer={
        <div className="flex flex-col gap-2 text-xs text-ink-secondary">
          <p>
            {compte.length > 0
              ? t('preview.masked', { details: compte.join(', ') })
              : t('preview.maskedNone')}
          </p>
          <p className="flex flex-wrap gap-x-2">
            <span>{t('preview.fingerprint')}</span>
            <span className="font-mono break-all text-ink-tertiary">{source.empreinte}</span>
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{source.origine.numero}</Badge>
          {source.origine.avecNotes ? <Badge tone="ai">{t('preview.notesIncluded')}</Badge> : null}
          {source.origine.systeme === 'mock' ? null : (
            <a
              href={source.origine.lien}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-6 items-center gap-1 rounded-xs text-xs text-ink-accent underline focus-ring"
            >
              <ExternalLink aria-hidden="true" className="size-3.5" />
              {t('preview.openTicket')}
            </a>
          )}
        </div>

        <p className="text-xs text-ink-secondary">{t('preview.notesHint')}</p>
        <div>
          <Button asChild variant="secondary">
            <Link href={lienNotes}>
              {source.origine.avecNotes ? t('preview.withoutNotes') : t('preview.withNotes')}
            </Link>
          </Button>
        </div>

        <pre className="max-h-[32rem] overflow-auto rounded-sm border-w border-line-subtle bg-surface-sunken p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink-primary">
          {source.texte}
        </pre>
      </div>
    </Panel>
  )
}
