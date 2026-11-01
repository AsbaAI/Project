import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/layout/page-header'
import { FormulaireItsm } from '@/components/parametres/formulaire-itsm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { Panel } from '@/components/ui/panel'
import { Link } from '@/i18n/navigation'
import { resolveLocale } from '@/i18n/params'
import { formaterInstant } from '@/lib/dates'
import { verifierDroit } from '@/server/auth/droits'
import { acteurDePage } from '@/server/pages'
import { fuseauDeSaisie } from '@/server/services/communications'
import { lireEtatItsm } from '@/server/services/itsm'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('itsm.settings')
  return { title: t('title') }
}

/*
 * Connecteur ITSM : l'adresse de l'instance, l'authentification et le
 * masquage. Le secret n'est pas ici — la page nomme la variable qui le
 * porte et dit seulement si elle est renseignée (D2, §19).
 *
 * Le mode du déploiement prime : en démonstration ou en « désactivé », il
 * n'y a rien à configurer, et la page le dit au lieu d'offrir un formulaire
 * qui ne servirait à rien.
 */
export default async function ParametresItsmPage({ params }: PageProps) {
  const locale = await resolveLocale(params)
  const t = await getTranslations('itsm.settings')
  const acteur = await acteurDePage()
  const [etat, fuseau] = await Promise.all([lireEtatItsm(acteur), fuseauDeSaisie(acteur)])
  const peutParametrer = verifierDroit(acteur.utilisateur, 'PARAMETRER').autorise
  const config = etat.mode === 'servicenow' && etat.configure ? etat.config : null

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button asChild variant="ghost" icon={<ArrowLeft aria-hidden="true" />}>
            <Link href="/parametres">{t('back')}</Link>
          </Button>
        }
      />

      {etat.mode === 'desactive' ? (
        <Notice level="info" title={t('disabled.title')}>
          {t('disabled.description')}
        </Notice>
      ) : (
        <div className="flex max-w-3xl flex-col gap-4">
          {etat.mode === 'mock' ? (
            <Notice level="warning" title={t('demo.title')}>
              {t('demo.description')}
            </Notice>
          ) : null}

          <Panel title={t('state.title')}>
            <ul className="flex flex-col gap-2 text-sm text-ink-secondary">
              <li>
                <Badge tone={config ? 'success' : 'draft'}>
                  {config ? t('state.configured') : t('state.notConfigured')}
                </Badge>
              </li>
              {config ? (
                <>
                  <li>
                    {config.secretPresent
                      ? t('state.secretPresent')
                      : t('state.secretMissing', { reference: config.refSecret })}
                  </li>
                  <li>
                    {config.testeLe
                      ? t('state.testedOn', {
                          date: formaterInstant(config.testeLe, locale, fuseau),
                        })
                      : t('state.neverTested')}
                  </li>
                </>
              ) : null}
            </ul>
          </Panel>

          {peutParametrer || etat.mode === 'mock' ? null : (
            <Notice level="info" title={t('readOnly')} />
          )}
          <Panel>
            <FormulaireItsm
              config={config}
              modifiable={peutParametrer && etat.mode === 'servicenow'}
            />
          </Panel>
        </div>
      )}
    </>
  )
}
