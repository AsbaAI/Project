import { LayoutTemplate } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { CarteModeleGabarit } from '@/components/gabarits/carte-modele'
import { CarteGabarit } from '@/components/gabarits/carte-gabarit'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { Panel } from '@/components/ui/panel'
import type { CanalAffiche } from '@/lib/cles-messages'
import { resolveLocale } from '@/i18n/params'
import { verifierDroit } from '@/server/auth/droits'
import { acteurDePage } from '@/server/pages'
import { chargerGabarits } from '@/server/services/gabarits'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('templates')
  return { title: t('title') }
}

/*
 * Bibliothèque de gabarits.
 *
 * L'écran commence par ce qui compte : quels canaux sont servis. Un canal
 * sans gabarit actif n'est pas une case vide, c'est une génération qui
 * refusera — autant le lire ici.
 *
 * Les exemples sont des départs : on les installe, puis on les modifie.
 * Le corps est montré tel qu'il est enregistré, jamais rendu : afficher le
 * HTML d'un gabarit comme une page donnerait à croire que c'est le rendu
 * final, qui appartient à l'envoi.
 */
export default async function GabaritsPage({ params }: PageProps) {
  await resolveLocale(params)
  const t = await getTranslations('templates')
  const tc = await getTranslations('communications')
  const acteur = await acteurDePage()
  const ecran = await chargerGabarits(acteur)
  const peutParametrer = verifierDroit(acteur.utilisateur, 'PARAMETRER').autorise
  const libelleCanal = (canal: string) => {
    const cle = `canaux.${canal}` as `canaux.${CanalAffiche}`
    return tc.has(cle) ? tc(cle) : canal
  }

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />

      <div className="flex flex-col gap-5">
        <Panel title={t('canaux.title')} description={t('canaux.description')}>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {ecran.canaux.map((canal) => (
              <li
                key={canal.canal}
                className="flex flex-col gap-2 rounded-md border-w border-line-default p-3"
              >
                <span className="text-sm font-medium text-ink-primary">
                  {libelleCanal(canal.canal)}
                </span>
                {canal.gabaritNom === null ? (
                  <Badge tone="warning">{t('canaux.aucun')}</Badge>
                ) : (
                  <span className="truncate text-xs text-ink-secondary">{canal.gabaritNom}</span>
                )}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={t('bibliotheque.title')} description={t('rendu')}>
          {ecran.gabarits.length === 0 ? (
            <EmptyState
              icon={LayoutTemplate}
              headingLevel={3}
              title={t('bibliotheque.empty')}
              description={t('modeles.description')}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {ecran.gabarits.map((gabarit) => (
                <li key={gabarit.id}>
                  <CarteGabarit gabarit={gabarit} modifiable={peutParametrer} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t('modeles.title')} description={t('modeles.description')}>
          {peutParametrer ? null : (
            <Notice
              level="info"
              className="mb-3"
              title={(await getTranslations('settings.restricted'))('title')}
            />
          )}
          <ul className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {ecran.modeles.map((modele) => (
              <li key={modele.cle}>
                <CarteModeleGabarit
                  modele={modele}
                  regions={ecran.regions}
                  regionParDefaut={ecran.regionParDefaut}
                  modifiable={peutParametrer}
                  canaux={modele.canaux.map(libelleCanal)}
                />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  )
}
