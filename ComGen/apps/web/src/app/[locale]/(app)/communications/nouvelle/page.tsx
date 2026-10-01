import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { FormulaireCadrage } from '@/components/communications/formulaire-cadrage'
import { PageHeader } from '@/components/layout/page-header'
import { resolveLocale } from '@/i18n/params'
import { exigerDroit } from '@/server/auth/droits'
import { acteurDePage } from '@/server/pages'
import {
  LANGUES_COMMUNICATION,
  MODES_DISPONIBLES,
  fuseauDeSaisie,
  listerParentsPossibles,
} from '@/server/services/communications'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('communications.cadrage')
  return { title: t('title') }
}

export default async function NouvelleCommunicationPage({ params }: PageProps) {
  const locale = await resolveLocale(params)
  const t = await getTranslations('communications.cadrage')
  const acteur = await acteurDePage()
  exigerDroit(acteur.utilisateur, 'CREER')

  const [fuseau, parents, region] = await Promise.all([
    fuseauDeSaisie(acteur),
    listerParentsPossibles(acteur),
    acteur.contexte.region.findUnique({
      where: { id: acteur.utilisateur.regionId },
      select: { localesAutorisees: true },
    }),
  ])
  const langues = LANGUES_COMMUNICATION.filter((l) => region?.localesAutorisees.includes(l))
  const langueParDefaut = langues.find((l) => l === locale) ?? langues[0] ?? ''

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <FormulaireCadrage
        fuseau={fuseau}
        langues={langues}
        langueParDefaut={langueParDefaut}
        parents={parents}
        modesDisponibles={MODES_DISPONIBLES}
      />
    </>
  )
}
