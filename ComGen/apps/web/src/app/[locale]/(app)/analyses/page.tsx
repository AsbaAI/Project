import { ETATS_COMMUNICATION, type EtatCommunication, MODES_ENTREE } from '@comgen/core'
import type { Metadata } from 'next'
import { getFormatter, getTranslations } from 'next-intl/server'

import { EtatBadge } from '@/components/communications/badges'
import { PageHeader } from '@/components/layout/page-header'
import { Panel } from '@/components/ui/panel'
import { StatTile } from '@/components/ui/stat-tile'
import { resolveLocale } from '@/i18n/params'
import type { OrigineAffichee } from '@/lib/cles-messages'
import { acteurDePage } from '@/server/pages'
import { chargerAnalyses } from '@/server/services/analyses'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('analytics')
  return { title: t('title') }
}

/*
 * Analyses : des nombres COMPTÉS en base pour l'organisation, jamais
 * estimés. Un indicateur sans donnée dit « pas de mesure » au lieu d'un
 * zéro qui passerait pour une mesure ; un envoi simulé n'est jamais compté
 * comme remis.
 */
export default async function AnalysesPage({ params }: PageProps) {
  await resolveLocale(params)
  const t = await getTranslations('analytics')
  const tDash = await getTranslations('dashboard')
  const format = await getFormatter()
  const acteur = await acteurDePage()
  const a = await chargerAnalyses(acteur)

  const etats = ETATS_COMMUNICATION.filter(
    (etat): etat is EtatCommunication => (a.parEtat[etat] ?? 0) > 0,
  )
  const origines = MODES_ENTREE.filter((mode) => (a.parOrigine[mode] ?? 0) > 0)

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={t('tiles.total')} value={a.total} caption={t('tiles.totalCaption')} />
        <StatTile
          label={t('tiles.rate')}
          value={
            a.tauxApprobation === null
              ? t('tiles.noMeasure')
              : format.number(a.tauxApprobation, { style: 'percent', maximumFractionDigits: 0 })
          }
          caption={
            a.tauxApprobation === null ? t('tiles.noDecision') : t('tiles.rateCaption', a.decisions)
          }
          ton="accent"
        />
        <StatTile
          label={t('tiles.sent')}
          value={a.envois.total}
          caption={t('tiles.sentCaption', { remis: a.envois.remis, simules: a.envois.simules })}
          ton={a.envois.simules > 0 ? 'attente' : 'succes'}
        />
        <StatTile
          label={t('tiles.delay')}
          value={
            a.delaiMedianHeures === null
              ? t('tiles.noMeasure')
              : format.number(a.delaiMedianHeures, { maximumFractionDigits: 1 })
          }
          unit={a.delaiMedianHeures === null ? undefined : t('tiles.hours')}
          caption={t('tiles.delayCaption')}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t('byState')}>
          <ul className="flex flex-col gap-2">
            {etats.map((etat) => (
              <li key={etat} className="flex items-center justify-between gap-3 text-sm">
                <EtatBadge etat={etat} />
                <span className="tnum text-ink-secondary">
                  {t('count', { count: a.parEtat[etat] ?? 0 })}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={t('byOrigin')}>
          <ul className="flex flex-col gap-2">
            {origines.map((mode) => (
              <li key={mode} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink-primary">
                  {tDash(`origins.${mode}` as `origins.${OrigineAffichee}`)}
                </span>
                <span className="tnum text-ink-secondary">
                  {t('count', { count: a.parOrigine[mode] ?? 0 })}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={t('blocking')} className="lg:col-span-2">
          {a.controlesBloquants.length === 0 ? (
            <p className="text-sm text-ink-secondary">{t('blockingEmpty')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {a.controlesBloquants.map((c) => (
                <li key={c.type} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink-primary">
                    {t.has(`types.${c.type}` as 'types.ANCRAGE')
                      ? t(`types.${c.type}` as 'types.ANCRAGE')
                      : c.type}
                  </span>
                  <span className="tnum text-ink-secondary">
                    {t('occurrences', { count: c.nombre })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  )
}
