import type { EtatCommunication } from '@comgen/core'
import { ETATS_COMMUNICATION } from '@comgen/core'
import { CircleCheck, Inbox, OctagonX, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { EtatBadge } from '@/components/communications/badges'
import { TableauCommunications } from '@/components/communications/tableau-communications'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Panel } from '@/components/ui/panel'
import { Link } from '@/i18n/navigation'
import { resolveLocale } from '@/i18n/params'
import { verifierDroit } from '@/server/auth/droits'
import { acteurDePage } from '@/server/pages'
import { chargerTableauDeBord, fuseauDeSaisie } from '@/server/services/communications'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard')
  return { title: t('title') }
}

/*
 * Tableau de bord (§15) : mes communications par état, ce qui attend mon
 * approbation, ce qui est bloqué. Les nombres sont comptés en base pour
 * l'utilisateur de la session ; rien n'est estimé.
 */
export default async function DashboardPage({ params }: PageProps) {
  await resolveLocale(params)
  const t = await getTranslations('dashboard')
  const acteur = await acteurDePage()
  const [tableau, fuseau] = await Promise.all([
    chargerTableauDeBord(acteur),
    fuseauDeSaisie(acteur),
  ])
  const peutCreer = verifierDroit(acteur.utilisateur, 'CREER').autorise
  const etatsPresents = ETATS_COMMUNICATION.filter(
    (etat): etat is EtatCommunication => (tableau.parEtat[etat] ?? 0) > 0,
  )

  const nouvelle = peutCreer ? (
    <Button asChild variant="primary" icon={<Plus aria-hidden="true" />}>
      <Link href="/communications/nouvelle">{t('newCommunication')}</Link>
    </Button>
  ) : null

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} actions={nouvelle} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel
          title={t('mine.title')}
          description={t('mine.description')}
          flush
          actions={
            <Link
              href="/communications"
              className="rounded-xs text-sm font-medium text-ink-accent focus-ring"
            >
              {t('seeAll')}
            </Link>
          }
        >
          {tableau.mesCommunications.length === 0 ? (
            <EmptyState
              icon={Inbox}
              headingLevel={3}
              title={t('mine.empty.title')}
              description={t('mine.empty.description')}
              action={nouvelle}
            />
          ) : (
            <>
              <div className="border-b-w border-line-subtle px-4 py-3">
                <h3 className="visually-hidden">{t('byState')}</h3>
                <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label={t('byState')}>
                  {etatsPresents.map((etat) => (
                    <li key={etat} className="flex items-center gap-2 text-sm text-ink-secondary">
                      <EtatBadge etat={etat} />
                      <span className="tnum">
                        {t('stateCount', { count: tableau.parEtat[etat] ?? 0 })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <TableauCommunications
                communications={tableau.mesCommunications}
                fuseau={fuseau}
                legende={t('mine.title')}
                colonnes="compact"
              />
            </>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title={t('blocked.title')}>
            {tableau.bloquees.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-ink-secondary">
                <CircleCheck aria-hidden="true" className="size-4 text-success-ink" />
                {t('blocked.empty')}
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {tableau.bloquees.map(({ communication, motif, contradictions }) => (
                  <li key={communication.id} className="flex gap-2.5">
                    <OctagonX
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-danger-ink"
                      strokeWidth={2}
                    />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Link
                        href={`/communications/${communication.id}/faits`}
                        className="rounded-xs text-sm font-medium text-ink-primary focus-ring hover:text-ink-accent"
                      >
                        {communication.titre}
                      </Link>
                      <p className="text-xs text-ink-secondary">
                        <span className="font-mono">{communication.reference}</span> ·{' '}
                        {motif === 'CONTRADICTION_NON_TRANCHEE'
                          ? t('blocked.CONTRADICTION_NON_TRANCHEE', { count: contradictions })
                          : t(`blocked.${motif}`)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t('approval.title')}>
            {tableau.aApprouver.length === 0 ? (
              <p className="text-sm text-ink-secondary">{t('approval.empty')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {tableau.aApprouver.map((c) => (
                  <li key={c.id} className="text-sm">
                    <Link
                      href={`/communications/${c.id}`}
                      className="rounded-xs font-medium text-ink-primary focus-ring hover:text-ink-accent"
                    >
                      {c.titre}
                    </Link>{' '}
                    <span className="font-mono text-xs text-ink-secondary">{c.reference}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  )
}
