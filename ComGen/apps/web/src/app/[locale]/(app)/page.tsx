import { redirect } from '@/i18n/navigation'
import { resolveLocale } from '@/i18n/params'

interface PageProps {
  params: Promise<{ locale: string }>
}

/*
 * Racine du produit. Avec six onglets dans la barre, un accueil sans
 * onglet n'a plus de place : la racine mène au générateur, qui est le
 * premier pas du récit. Les deux cartes de l'ancien accueil y vivent
 * maintenant ; les compteurs « à traiter » sont passés aux approbations.
 */
export default async function RacinePage({ params }: PageProps) {
  const locale = await resolveLocale(params)
  redirect({ href: '/generateur', locale })
}
