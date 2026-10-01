import { TriangleAlert } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import { formaterInstant } from '@/lib/dates'
import type { FaitDeFiche } from '@/server/services/faits'

import { ActionsFait } from './actions-fait'
import { StatutFaitBadge } from './badges'

/*
 * Un fait, citation en regard (§15). L'énoncé est le libellé, la valeur est
 * écrite en chasse fixe telle que la source la donne, la citation est
 * rendue mot pour mot avec un lien vers sa place dans la source.
 */
export interface CarteFaitProps {
  fait: FaitDeFiche
  nomSource: string
  modifiable: boolean
  fuseau: string
}

export function CarteFait({ fait, nomSource, modifiable, fuseau }: CarteFaitProps) {
  const t = useTranslations('communications')
  const locale = useLocale()
  const retire = fait.statut === 'RETIRE' || fait.statut === 'PERIME'
  const enContradiction = fait.contradiction !== null && !retire

  return (
    <article
      id={`fait-${fait.reference}`}
      aria-labelledby={`fait-${fait.reference}-titre`}
      className={cn(
        'scroll-mt-24 rounded-md border-w bg-surface-raised',
        enContradiction ? 'border-danger-line' : 'border-line-default',
      )}
    >
      <header className="flex flex-wrap items-center gap-2 border-b-w border-line-subtle px-4 py-2.5">
        <span className="font-mono text-xs font-semibold text-ink-secondary">{fait.reference}</span>
        <StatutFaitBadge statut={fait.statut} />
        {enContradiction ? <Badge tone="danger">{t('fiche.contradictions.badge')}</Badge> : null}
        {fait.confidentialite !== 'PUBLIC' && fait.confidentialite !== 'INTERNE' ? (
          <Badge tone="warning">{t(`niveaux.${fait.confidentialite}`)}</Badge>
        ) : null}
      </header>

      <div className={cn('flex flex-col gap-3 px-4 py-3', retire && 'text-ink-secondary')}>
        <h3
          id={`fait-${fait.reference}-titre`}
          className={cn(
            'text-sm font-medium tracking-normal',
            retire ? 'text-ink-secondary line-through' : 'text-ink-primary',
          )}
        >
          {fait.enonce}
        </h3>

        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
          {fait.valeur !== null ? (
            <>
              <dt className="text-ink-tertiary">{t('fiche.fact.value')}</dt>
              <dd>
                <span className="rounded-xs border-w border-line-subtle bg-surface-sunken px-1.5 py-0.5 font-mono text-xs text-ink-primary">
                  {fait.valeur}
                </span>
              </dd>
            </>
          ) : null}
          <dt className="text-ink-tertiary">{t('fiche.fact.type')}</dt>
          <dd className="text-ink-secondary">
            {fait.typeValeur ? t(`typesValeur.${fait.typeValeur}`) : t('typesValeur.TEXTE')}
          </dd>
          <dt className="text-ink-tertiary">{t('fiche.fact.source')}</dt>
          <dd className="text-ink-secondary">
            <a
              href={`#citation-${fait.reference}`}
              className="rounded-xs text-ink-accent focus-ring"
              aria-label={`${t('fiche.fact.showInSource')} — ${fait.reference}`}
            >
              {nomSource}
            </a>
            {fait.localisation.ligne ? (
              <span className="text-ink-tertiary">
                {' · '}
                {t('fiche.fact.line', { ligne: fait.localisation.ligne })}
              </span>
            ) : null}
          </dd>
        </dl>

        <figure className="flex flex-col gap-1">
          <figcaption className="text-xs text-ink-tertiary">{t('fiche.fact.citation')}</figcaption>
          <blockquote className="border-l-w border-line-strong pl-3 text-sm whitespace-pre-wrap text-ink-primary">
            {fait.citation}
          </blockquote>
        </figure>

        {fait.amendements.length > 0 ? (
          <section aria-label={t('fiche.fact.amendments')} className="flex flex-col gap-1.5">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-warning-ink">
              <TriangleAlert aria-hidden="true" className="size-3.5" />
              {t('fiche.fact.amendments')}
            </h4>
            <ul className="flex flex-col gap-2">
              {fait.amendements.map((a) => (
                <li
                  key={a.creeLe.toISOString()}
                  className="rounded-sm border-w border-warning-line bg-warning-bg px-3 py-2 text-xs text-ink-primary"
                >
                  <p className="font-medium">
                    {a.ancienneValeur === null
                      ? t('fiche.fact.amendmentNoPrevious', {
                          nouvelle: a.nouvelleValeur,
                          auteur: a.auteurNom,
                          date: formaterInstant(a.creeLe, locale, fuseau),
                        })
                      : t('fiche.fact.amendment', {
                          ancienne: a.ancienneValeur,
                          nouvelle: a.nouvelleValeur,
                          auteur: a.auteurNom,
                          date: formaterInstant(a.creeLe, locale, fuseau),
                        })}
                  </p>
                  <p className="text-ink-secondary">
                    {t('fiche.fact.justification', { texte: a.justification })}
                  </p>
                  {a.sourceInvoquee ? (
                    <p className="text-ink-secondary">
                      {t('fiche.fact.invokedSource', { texte: a.sourceInvoquee })}
                    </p>
                  ) : null}
                  {a.responsabiliteAssumee ? (
                    <p className="text-ink-secondary">{t('fiche.fact.assumed')}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {modifiable ? (
          <ActionsFait
            faitId={fait.id}
            statut={fait.statut}
            enonce={fait.enonce}
            valeur={fait.valeur}
            confidentialite={fait.confidentialite}
          />
        ) : null}
      </div>
    </article>
  )
}
