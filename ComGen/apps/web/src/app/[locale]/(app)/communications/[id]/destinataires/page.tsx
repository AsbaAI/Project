import { Users } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { EnTeteCommunication } from '@/components/communications/en-tete-communication'
import { FormulaireDestinataires } from '@/components/communications/formulaire-destinataires'
import { EmptyState } from '@/components/ui/empty-state'
import { Panel } from '@/components/ui/panel'
import { resolveLocale } from '@/i18n/params'
import { verifierDroit } from '@/server/auth/droits'
import { acteurDePage, ou404 } from '@/server/pages'
import { chargerAvancement } from '@/server/services/assistant'
import { chargerCommunication } from '@/server/services/communications'
import { listerPersonas } from '@/server/services/generation'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('destinataires')
  return { title: t('title') }
}

/*
 * Choix des destinataires (§9) : un persona retenu = une version à
 * produire. Un persona dont aucun gabarit ne sert le canal est montré mais
 * non sélectionnable, et la page dit pourquoi : le masquer laisserait
 * croire qu'il n'existe pas.
 */
export default async function DestinatairesPage({ params }: PageProps) {
  await resolveLocale(params)
  const { id } = await params
  const t = await getTranslations('destinataires')
  const acteur = await acteurDePage()
  const [detail, personas, avancement] = await Promise.all([
    ou404(chargerCommunication(acteur, id)),
    listerPersonas(acteur, id),
    chargerAvancement(acteur, id),
  ])
  const c = detail.communication
  const modifiable =
    verifierDroit(acteur.utilisateur, 'GENERER').autorise &&
    (c.etat === 'BROUILLON' || c.etat === 'FAITS_A_VALIDER' || c.etat === 'PRETE_A_GENERER')

  return (
    <>
      <EnTeteCommunication
        avancement={avancement}
        reference={c.reference}
        titre={c.titre}
        etat={c.etat}
        criticite={c.criticite}
      />

      <Panel title={t('title')} description={t('description')}>
        {personas.length === 0 ? (
          <EmptyState icon={Users} title={t('vide.title')} description={t('vide.description')} />
        ) : (
          <FormulaireDestinataires
            communicationId={id}
            personas={personas}
            modifiable={modifiable}
          />
        )}
      </Panel>
    </>
  )
}
