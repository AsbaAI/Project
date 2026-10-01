import { CircleCheck, FilePlus2, History, OctagonX, PenLine } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { ActionCard } from '@/components/ui/action-card'
import { Link } from '@/i18n/navigation'
import { resolveLocale } from '@/i18n/params'
import { cn } from '@/lib/cn'
import { verifierDroit } from '@/server/auth/droits'
import { acteurDePage } from '@/server/pages'
import { chargerTableauDeBord } from '@/server/services/communications'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('home')
  return { title: t('metaTitle') }
}

function Compteur({
  href,
  icone,
  libelle,
  vide,
}: {
  href: string
  icone: ReactNode
  libelle: string
  vide: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-control-md items-center gap-2 rounded-full border-w px-3 text-sm font-medium no-underline',
        'transition-colors-token focus-ring hover:bg-surface-hover [&_svg]:size-4',
        vide
          ? 'border-line-default bg-surface-raised text-ink-secondary'
          : 'border-line-strong bg-surface-raised text-ink-primary',
      )}
    >
      {icone}
      {libelle}
    </Link>
  )
}

/*
 * Accueil : deux portes, créer ou retrouver. Sous les deux cartes, ce qui
 * attend l'utilisateur, en trois compteurs qui mènent au tableau de bord.
 * Les nombres viennent du même service que le tableau de bord : un seul
 * calcul, deux présentations.
 */
export default async function AccueilPage({ params }: PageProps) {
  await resolveLocale(params)
  const t = await getTranslations('home')
  const acteur = await acteurDePage()
  const tableau = await chargerTableauDeBord(acteur)
  const peutCreer = verifierDroit(acteur.utilisateur, 'CREER').autorise
  const prenom = acteur.utilisateur.nom.split(' ')[0] ?? acteur.utilisateur.nom
  const enCours = tableau.mesCommunications.length

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 pt-2 lg:pt-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-primary">
          {t('greeting', { prenom })}
        </h1>
        <p className="text-base text-ink-secondary">{t('question')}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {peutCreer ? (
          <ActionCard
            href="/communications/nouvelle"
            icon={FilePlus2}
            tone="primary"
            title={t('new.title')}
            description={t('new.description')}
          />
        ) : null}
        <ActionCard
          href="/communications"
          icon={History}
          title={t('existing.title')}
          description={t('existing.description')}
        />
      </div>

      <section aria-labelledby="a-traiter" className="flex flex-col gap-3">
        <h2 id="a-traiter" className="text-sm font-semibold text-ink-secondary">
          {t('todo.title')}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Compteur
            href="/tableau-de-bord"
            icone={<OctagonX aria-hidden="true" className="text-danger-ink" />}
            libelle={t('todo.blocked', { count: tableau.bloquees.length })}
            vide={tableau.bloquees.length === 0}
          />
          <Compteur
            href="/tableau-de-bord"
            icone={<CircleCheck aria-hidden="true" className="text-warning-ink" />}
            libelle={t('todo.approval', { count: tableau.aApprouver.length })}
            vide={tableau.aApprouver.length === 0}
          />
          <Compteur
            href="/tableau-de-bord"
            icone={<PenLine aria-hidden="true" className="text-ink-accent" />}
            libelle={t('todo.inProgress', { count: enCours })}
            vide={enCours === 0}
          />
        </div>
      </section>
    </div>
  )
}
