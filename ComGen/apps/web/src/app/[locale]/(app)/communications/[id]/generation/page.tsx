import { Sparkles, Users } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { CarteVariante } from '@/components/communications/carte-variante'
import { EnTeteCommunication } from '@/components/communications/en-tete-communication'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Link } from '@/i18n/navigation'
import { resolveLocale } from '@/i18n/params'
import { verifierDroit } from '@/server/auth/droits'
import { acteurDePage, ou404 } from '@/server/pages'
import { chargerAvancement } from '@/server/services/assistant'
import { chargerCommunication } from '@/server/services/communications'
import { chargerGeneration } from '@/server/services/generation'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('generation')
  return { title: t('title') }
}

/*
 * Sortie générée (§12), une carte par destinataire.
 *
 * Le texte bloqué est MONTRÉ, avec ce qui le bloque. Le masquer
 * empêcherait le relecteur de corriger ; le laisser partir violerait la
 * contrainte cardinale. L'approbation, elle, reste fermée tant qu'un
 * contrôle bloquant subsiste — et c'est la base qui le garantit.
 */
export default async function GenerationPage({ params }: PageProps) {
  await resolveLocale(params)
  const { id } = await params
  const t = await getTranslations('generation')
  const acteur = await acteurDePage()
  const [detail, ecran, avancement] = await Promise.all([
    ou404(chargerCommunication(acteur, id)),
    chargerGeneration(acteur, id),
    chargerAvancement(acteur, id),
  ])
  const c = detail.communication
  const peutGenerer =
    verifierDroit(acteur.utilisateur, 'GENERER').autorise &&
    (c.etat === 'PRETE_A_GENERER' || c.etat === 'EN_GENERATION')

  return (
    <>
      <EnTeteCommunication
        avancement={avancement}
        reference={c.reference}
        titre={c.titre}
        etat={c.etat}
        criticite={c.criticite}
      />

      {ecran.variantes.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('vide.title')}
          description={t('vide.description')}
          action={
            <Button asChild variant="primary" icon={<Sparkles aria-hidden="true" />}>
              <Link href={`/communications/${id}/destinataires`}>{t('vide.title')}</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {ecran.variantes.map((variante) => (
            <CarteVariante key={variante.id} variante={variante} peutGenerer={peutGenerer} />
          ))}
        </div>
      )}
    </>
  )
}
