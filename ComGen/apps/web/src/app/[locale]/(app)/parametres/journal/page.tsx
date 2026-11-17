import { ArrowLeft, ScrollText } from 'lucide-react'
import type { Metadata } from 'next'
import { getFormatter, getTranslations } from 'next-intl/server'

import { EcranRestreint } from '@/components/layout/ecran-restreint'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { resolveLocale } from '@/i18n/params'
import { verifierDroit } from '@/server/auth/droits'
import { acteurDePage } from '@/server/pages'
import { chargerJournal } from '@/server/services/journal'

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ objet?: string; action?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings.journal')
  return { title: t('title') }
}

/*
 * Journal d'audit (plan L3). Lecture seule, réservée au droit
 * `CONSULTER_AUDIT` : la page ne propose aucune action, parce qu'il n'en
 * existe aucune — une ligne écrite ne se modifie pas.
 *
 * Les filtres sont des liens, pas un formulaire : l'état tient dans
 * l'adresse, la page reste un composant serveur, et un filtre se partage.
 */
export default async function JournalPage({ params, searchParams }: PageProps) {
  await resolveLocale(params)
  const t = await getTranslations('settings.journal')
  const acteur = await acteurDePage()

  if (!verifierDroit(acteur.utilisateur, 'CONSULTER_AUDIT').autorise) {
    const tr = await getTranslations('settings.journal.restricted')
    return (
      <EcranRestreint
        titre={t('title')}
        description={t('description')}
        motifTitre={tr('title')}
        motifDescription={tr('description')}
      />
    )
  }

  const { objet, action } = await searchParams
  const ecran = await chargerJournal(acteur, {
    ...(objet === undefined ? {} : { objet }),
    ...(action === undefined ? {} : { action }),
  })
  const format = await getFormatter()

  const lienObjet = (valeur: string | null) => ({
    pathname: '/parametres/journal' as const,
    query: {
      ...(valeur === null ? {} : { objet: valeur }),
      ...(ecran.filtres.action === null ? {} : { action: ecran.filtres.action }),
    },
  })

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

      <nav aria-label={t('filterLabel')} className="mb-4 flex flex-wrap items-center gap-2">
        <FiltreLien
          href={lienObjet(null)}
          actif={ecran.filtres.objet === null}
          libelle={t('all')}
        />
        {ecran.objets.map((valeur) => (
          <FiltreLien
            key={valeur}
            href={lienObjet(valeur)}
            actif={ecran.filtres.objet === valeur}
            libelle={t(`objects.${valeur}`)}
          />
        ))}
      </nav>

      {ecran.lignes.length === 0 ? (
        <EmptyState icon={ScrollText} title={t('empty')} description={t('emptyHint')} />
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-200">
            <TableHead>
              <TableRow>
                <TableHeaderCell scope="col">{t('columns.when')}</TableHeaderCell>
                <TableHeaderCell scope="col">{t('columns.what')}</TableHeaderCell>
                <TableHeaderCell scope="col">{t('columns.object')}</TableHeaderCell>
                <TableHeaderCell scope="col">{t('columns.change')}</TableHeaderCell>
                <TableHeaderCell scope="col">{t('columns.who')}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ecran.lignes.map((ligne) => (
                <TableRow key={ligne.id}>
                  <TableCell mono>
                    {format.dateTime(ligne.creeLe, {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge tone="neutral">{t(`actions.${ligne.action}`)}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="block text-ink-primary">{ligne.objetLibelle}</span>
                    <span className="block text-xs text-ink-secondary">
                      {t(`objects.${ligne.objet}`)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {ligne.resume === '' ? (
                      <span className="text-ink-secondary">{t('noChange')}</span>
                    ) : (
                      ligne.resume
                    )}
                  </TableCell>
                  <TableCell>{ligne.acteurCourriel}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}

function FiltreLien({
  href,
  actif,
  libelle,
}: {
  href: { pathname: '/parametres/journal'; query: Record<string, string> }
  actif: boolean
  libelle: string
}) {
  return (
    <Link
      href={href}
      aria-current={actif ? 'true' : undefined}
      className={
        actif
          ? 'rounded-md border-w border-accent-border bg-accent-bg px-3 py-1 text-sm font-medium text-ink-accent no-underline focus-ring'
          : 'rounded-md border-w border-line-default px-3 py-1 text-sm text-ink-secondary no-underline hover:text-ink-accent focus-ring'
      }
    >
      {libelle}
    </Link>
  )
}
