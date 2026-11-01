import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

import { FormulaireConsigne } from '@/components/parametres/formulaire-consigne'
import { ParcoursAgents } from '@/components/parametres/parcours-agents'
import { EcranRestreint } from '@/components/layout/ecran-restreint'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { Panel } from '@/components/ui/panel'
import { Link } from '@/i18n/navigation'
import { resolveLocale } from '@/i18n/params'
import { formaterInstant } from '@/lib/dates'
import { verifierDroit } from '@/server/auth/droits'
import { acteurDePage } from '@/server/pages'
import { chargerAgents } from '@/server/services/agents'
import { fuseauDeSaisie } from '@/server/services/communications'

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings.agents')
  return { title: t('title') }
}

/*
 * Agents : le parcours à gauche, la fiche de l'agent choisi à droite.
 *
 * La sélection vit dans l'adresse (`?agent=`), pas dans un état de
 * composant : l'écran se partage, revient en arrière et fonctionne sans
 * script. Chaque fiche dit ce que l'agent fait, ce qu'il reçoit, ce qu'il
 * rend, et qui répond pour lui aujourd'hui.
 *
 * La consigne ne s'édite que pour un agent qui peut en recevoir une. Le
 * GARDIEN est du code et un rôle non livré n'existe pas : plutôt qu'un
 * champ grisé sans explication, l'écran dit pourquoi il n'y a rien à
 * régler.
 */
export default async function AgentsPage({ params, searchParams }: PageProps) {
  await resolveLocale(params)
  const locale = await getLocale()
  const t = await getTranslations('settings.agents')
  const acteur = await acteurDePage()

  if (!verifierDroit(acteur.utilisateur, 'PARAMETRER').autorise) {
    const tr = await getTranslations('settings.restricted')
    return (
      <EcranRestreint
        titre={t('title')}
        description={t('description')}
        motifTitre={tr('title')}
        motifDescription={tr('description')}
      />
    )
  }

  const [agents, fuseau] = await Promise.all([chargerAgents(acteur), fuseauDeSaisie(acteur)])
  const recherche = await searchParams
  const demande = recherche['agent']
  const choisi = Array.isArray(demande) ? demande[0] : demande
  const agent = agents.find((a) => a.role === choisi) ?? null

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button asChild variant="ghost" icon={<ArrowLeft aria-hidden="true" />}>
            <Link href="/parametres">{(await getTranslations('settings.personas'))('back')}</Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-5">
        <Panel title={t('legend')}>
          <ParcoursAgents
            agents={agents}
            selection={agent?.role ?? null}
            lien={(role) => `/parametres/agents?agent=${role}`}
          />
        </Panel>

        <Panel
          title={
            agent === null
              ? t('inspecteur.title')
              : t(`roles.${agent.role}.nom` as 'roles.GARDIEN.nom')
          }
          description={agent === null ? t('inspecteur.choisir') : t(`etapes.${agent.etape}`)}
          flush={agent === null}
          actions={
            agent === null ? null : (
              <Badge
                tone={agent.etat === 'simule' ? 'ai' : agent.etat === 'code' ? 'success' : 'draft'}
              >
                {t(`etats.${agent.etat}`)}
              </Badge>
            )
          }
        >
          {agent === null ? null : (
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-4 text-sm">
                <p className="text-ink-primary">
                  {t(`roles.${agent.role}.quoi` as 'roles.GARDIEN.quoi')}
                </p>
                <p className="flex flex-wrap gap-x-2 text-xs text-ink-secondary">
                  <span className="font-medium text-ink-tertiary">{t('inspecteur.entree')}</span>
                  <span>{t(`roles.${agent.role}.entree` as 'roles.GARDIEN.entree')}</span>
                </p>
                <p className="flex flex-wrap gap-x-2 text-xs text-ink-secondary">
                  <span className="font-medium text-ink-tertiary">{t('inspecteur.sortie')}</span>
                  <span>{t(`roles.${agent.role}.sortie` as 'roles.GARDIEN.sortie')}</span>
                </p>

                <Notice
                  level={agent.etat === 'simule' ? 'warning' : 'info'}
                  title={t(`etats.${agent.etat}`)}
                >
                  {t(`etatsDetail.${agent.etat}`)}
                </Notice>
              </div>

              {agent.etat === 'simule' ? (
                <div className="flex flex-col gap-3">
                  <p className="flex flex-wrap items-center gap-2 text-xs text-ink-secondary">
                    {agent.version === null ? (
                      <span>{t('consigne.aucune')}</span>
                    ) : (
                      <>
                        <Badge tone="neutral">
                          {t('consigne.version', { version: agent.version })}
                        </Badge>
                        {agent.modifieLe === null ? null : (
                          <span>
                            {t('consigne.modifiePar', {
                              nom: agent.modifieParNom ?? '',
                              date: formaterInstant(agent.modifieLe, locale, fuseau),
                            })}
                          </span>
                        )}
                      </>
                    )}
                  </p>
                  <FormulaireConsigne
                    role={agent.role}
                    consigne={agent.consigne}
                    effet={t('consigne.effet')}
                  />
                </div>
              ) : null}
            </div>
          )}
        </Panel>
      </div>
    </>
  )
}
