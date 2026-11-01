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
import { FormulaireListe } from '@/components/parametres/formulaire-liste'
import { chargerListes } from '@/server/services/parametrage'
import { Mail } from 'lucide-react'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings.listes')
  return { title: t('title') }
}

export default async function ListesPage({ params }: PageProps) {
  await resolveLocale(params)
  const t = await getTranslations('settings.listes')
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
  const listes = await chargerListes(acteur)

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
      {listes.length === 0 ? (
        <EmptyState icon={Mail} title={t('empty')} />
      ) : (
        <div className="flex max-w-4xl flex-col gap-4">
          {listes.map((liste) => (
            <FormulaireListe key={liste.id} liste={liste} />
          ))}
        </div>
      )}
    </>
  )
}
