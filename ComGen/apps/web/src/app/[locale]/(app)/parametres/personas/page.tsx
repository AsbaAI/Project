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
import { EmptyState } from '@/components/ui/empty-state'
import { FormulairePersona } from '@/components/parametres/formulaire-persona'
import { chargerPersonas } from '@/server/services/parametrage'
import { UsersRound } from 'lucide-react'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings.personas')
  return { title: t('title') }
}

/* Personas : réservé à qui peut paramétrer ; le service refuse les autres. */
export default async function PersonasPage({ params }: PageProps) {
  await resolveLocale(params)
  const t = await getTranslations('settings.personas')
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
  const { personas, approbateurs } = await chargerPersonas(acteur)

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
      {personas.length === 0 ? (
        <EmptyState icon={UsersRound} title={t('empty')} />
      ) : (
        <div className="flex max-w-4xl flex-col gap-4">
          {personas.map((persona) => (
            <FormulairePersona key={persona.id} persona={persona} approbateurs={approbateurs} />
          ))}
        </div>
      )}
    </>
  )
}
