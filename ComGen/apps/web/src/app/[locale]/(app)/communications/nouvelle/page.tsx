import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { FormulaireCadrage } from '@/components/communications/formulaire-cadrage'
import { EcranRestreint } from '@/components/layout/ecran-restreint'
import { PageHeader } from '@/components/layout/page-header'
import { resolveLocale } from '@/i18n/params'
import { verifierDroit } from '@/server/auth/droits'
import { acteurDePage } from '@/server/pages'
import { itsmDisponible, lireEtatItsm } from '@/server/services/itsm'
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
  /*
   * Sans le droit de créer, l'écran le dit plutôt que de rompre : le
   * cadrage n'a rien à montrer, mais la page garde son titre et nomme ce
   * qui manque.
   */
  if (!verifierDroit(acteur.utilisateur, 'CREER').autorise) {
    return (
      <EcranRestreint
        titre={t('title')}
        description={t('description')}
        motifTitre={t('refus.title')}
        motifDescription={t('refus.description')}
      />
    )
  }

  const [fuseau, parents, region, etatItsm] = await Promise.all([
    fuseauDeSaisie(acteur),
    listerParentsPossibles(acteur),
    acteur.contexte.region.findUnique({
      where: { id: acteur.utilisateur.regionId },
      select: { localesAutorisees: true },
    }),
    lireEtatItsm(acteur),
  ])
  /*
   * La source ITSM n'est proposée que si un connecteur répond : un mode qui
   * mène à un écran vide vaut moins qu'un mode absent. Le dépôt et la
   * saisie restent ouverts quoi qu'il arrive.
   */
  const modes = MODES_DISPONIBLES.filter(
    (mode) => mode !== 'CONNECTEUR' || itsmDisponible(etatItsm),
  )
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
        modesDisponibles={modes}
      />
    </>
  )
}
