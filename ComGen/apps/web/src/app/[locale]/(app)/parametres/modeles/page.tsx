import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { EcranRestreint } from '@/components/layout/ecran-restreint'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { resolveLocale } from '@/i18n/params'
import { verifierDroit } from '@/server/auth/droits'
import { acteurDePage } from '@/server/pages'
import { Notice } from '@/components/ui/notice'
import { Badge } from '@/components/ui/badge'
import { Panel } from '@/components/ui/panel'
import { exigerDroit } from '@/server/auth/droits'
import { statutMoteur } from '@/server/moteur'
import { fabriqueAgents } from '@comgen/agents'
import { ROLES_AGENT } from '@comgen/core'
import type { RoleAgentAffiche } from '@/lib/cles-messages'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings.modeles')
  return { title: t('title') }
}

/*
 * Modèles : lecture seule, par construction. Les clés vivent dans
 * l'environnement du serveur (D2, §19) : l'écran nomme la variable et dit
 * si elle est renseignée, sans jamais la lire ni la saisir.
 */
export default async function ModelesPage({ params }: PageProps) {
  await resolveLocale(params)
  const t = await getTranslations('settings.modeles')
  const tg = await getTranslations('generation')
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
  exigerDroit(acteur.utilisateur, 'PARAMETRER')
  const moteur = await statutMoteur()
  const jeu = fabriqueAgents()

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
      <div className="flex max-w-3xl flex-col gap-4">
        <Panel title={t('engine')}>
          <div className="flex flex-col gap-2 text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-ink-secondary">{t('reference')}</span>
              <span className="font-mono text-ink-primary">{moteur.reference}</span>
            </p>
            <p>
              <Badge tone={moteur.etat === 'pret' ? 'success' : 'warning'}>
                {t(`state.${moteur.etat}`)}
              </Badge>
            </p>
          </div>
        </Panel>
        <Panel title={t('agents')}>
          <ul className="flex flex-col gap-2">
            {ROLES_AGENT.map((role) => (
              <li key={role} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink-primary">
                  {tg(`roles.${role}` as `roles.${RoleAgentAffiche}`)}
                </span>
                <Badge tone={jeu.mode === 'simulation' ? 'warning' : 'success'}>
                  {t(`mode.${jeu.mode === 'simulation' ? 'simulation' : 'reel'}`)}
                </Badge>
              </li>
            ))}
          </ul>
        </Panel>
        <Notice level="info" title={t('readOnly')} />
      </div>
    </>
  )
}
