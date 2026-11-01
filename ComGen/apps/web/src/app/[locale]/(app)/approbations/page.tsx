import { CircleCheck } from 'lucide-react'
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

import { FormulaireDecision } from '@/components/communications/formulaire-decision'
import { CriticiteBadge } from '@/components/communications/badges'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Panel } from '@/components/ui/panel'
import { Link } from '@/i18n/navigation'
import { resolveLocale } from '@/i18n/params'
import { formaterInstant } from '@/lib/dates'
import type { CriticiteAffichee } from '@/lib/cles-messages'
import { verifierDroit } from '@/server/auth/droits'
import { acteurDePage } from '@/server/pages'
import { chargerApprobations } from '@/server/services/approbation'
import { fuseauDeSaisie } from '@/server/services/communications'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('approvals')
  return { title: t('title') }
}

/*
 * Approbations : ce qui attend MA décision, avec le quota de la
 * criticité, puis mes décisions. La décision s'écrit ici ; la relecture
 * des variantes se fait sur l'écran de génération, un clic plus loin.
 */
export default async function ApprobationsPage({ params }: PageProps) {
  await resolveLocale(params)
  const locale = await getLocale()
  const t = await getTranslations('approvals')
  const acteur = await acteurDePage()
  const [ecran, fuseau] = await Promise.all([chargerApprobations(acteur), fuseauDeSaisie(acteur)])
  const peutDecider = verifierDroit(acteur.utilisateur, 'APPROUVER').autorise

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('title')} description={t('description')} />

      <Panel title={t('pending.title')} description={t('pending.description')}>
        {ecran.enAttente.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-ink-secondary">
            <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-success-ink" />
            {t('pending.empty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {ecran.enAttente.map((c) => (
              <li
                key={c.communicationId}
                className="flex flex-col gap-3 rounded-md border-w border-line-default p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <Link
                      href={`/communications/${c.communicationId}/generation`}
                      className="rounded-xs font-medium text-ink-primary focus-ring hover:text-ink-accent"
                    >
                      {c.titre}
                    </Link>
                    <span className="font-mono text-xs text-ink-secondary">{c.reference}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CriticiteBadge criticite={c.criticite as CriticiteAffichee} />
                    <Badge tone="pending">
                      {t('pending.quota', { accordees: c.accordees, requises: c.requises })}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-ink-secondary">
                  {t('pending.by', { auteur: c.auteurNom })} ·{' '}
                  {t('pending.variantes', { count: c.variantes })}
                </p>
                {peutDecider ? <FormulaireDecision communicationId={c.communicationId} /> : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={t('history.title')} description={t('history.description')}>
        {ecran.historique.length === 0 ? (
          <p className="text-sm text-ink-secondary">{t('history.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ecran.historique.map((d) => (
              <li key={`${d.communicationId}-${d.decideLe.toISOString()}`} className="text-sm">
                <Badge tone={d.decision === 'APPROUVEE' ? 'success' : 'danger'}>
                  {t(`decision.done.${d.decision === 'APPROUVEE' ? 'APPROUVEE' : 'REJETEE'}`)}
                </Badge>{' '}
                <Link
                  href={`/communications/${d.communicationId}/generation`}
                  className="rounded-xs font-medium text-ink-primary focus-ring hover:text-ink-accent"
                >
                  {d.titre}
                </Link>{' '}
                <span className="font-mono text-xs text-ink-secondary">{d.reference}</span>
                <span className="text-xs text-ink-tertiary">
                  {' · '}
                  {formaterInstant(d.decideLe, locale, fuseau)}
                </span>
                {d.commentaire ? (
                  <span className="block text-xs text-ink-secondary">{d.commentaire}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
