import { ArrowLeft, Ticket } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { estErreurItsm } from '@comgen/connecteurs'

import { EnTeteCommunication } from '@/components/communications/en-tete-communication'
import { ApercuTicket } from '@/components/itsm/apercu-ticket'
import { FormulaireImport } from '@/components/itsm/formulaire-import'
import { FiltresTickets } from '@/components/itsm/filtres-tickets'
import { ListeTickets } from '@/components/itsm/liste-tickets'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { Panel } from '@/components/ui/panel'
import { Link, getPathname } from '@/i18n/navigation'
import { resolveLocale } from '@/i18n/params'
import { verifierDroit } from '@/server/auth/droits'
import { acteurDePage, ou404 } from '@/server/pages'
import { chargerAvancement } from '@/server/services/assistant'
import { chargerCommunication, fuseauDeSaisie } from '@/server/services/communications'
import { ErreurMetier } from '@/server/services/erreurs'
import { ETATS_ENTREE_OUVERTE } from '@/server/services/etat'
import {
  type FiltresBruts,
  type SourceItsmPreparee,
  apercuSourceItsm,
  itsmDisponible,
  lireEtatItsm,
  listerTickets,
} from '@/server/services/itsm'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('itsm.picker')
  return { title: t('title') }
}

const seul = (valeur: string | string[] | undefined): string =>
  (Array.isArray(valeur) ? valeur[0] : valeur) ?? ''

const plusieurs = (valeur: string | string[] | undefined): string[] =>
  Array.isArray(valeur) ? valeur : valeur === undefined || valeur === '' ? [] : [valeur]

/**
 * Issue d'un appel au connecteur : une panne de l'outil ITSM est une
 * information à montrer, pas une page en erreur. Le code est rendu tel quel
 * pour être traduit ; aucun message technique ne sort du serveur.
 */
async function essayer<T>(promesse: Promise<T>): Promise<{ valeur: T } | { code: string }> {
  try {
    return { valeur: await promesse }
  } catch (erreur) {
    if (estErreurItsm(erreur)) return { code: erreur.code }
    if (erreur instanceof ErreurMetier && erreur.code !== 'INTROUVABLE') {
      return { code: erreur.code }
    }
    throw erreur
  }
}

/*
 * Choix d'un ticket (§10, mode CONNECTEUR).
 *
 * Les filtres et la page vivent dans l'adresse : l'écran marche sans
 * script, et un lien d'aperçu se partage. On regarde d'abord le texte
 * masqué — ce que les agents liront — avant de l'importer.
 */
export default async function ChoisirTicketPage({ params, searchParams }: PageProps) {
  const locale = await resolveLocale(params)
  const { id } = await params
  const recherche = await searchParams
  const t = await getTranslations('itsm')
  const acteur = await acteurDePage()
  const [{ communication: c }, avancement, fuseau, etat] = await Promise.all([
    ou404(chargerCommunication(acteur, id)),
    chargerAvancement(acteur, id),
    fuseauDeSaisie(acteur),
    lireEtatItsm(acteur),
  ])

  const base = `/communications/${c.id}/entree/itsm`
  const filtres: FiltresBruts = {
    statuts: plusieurs(recherche['statuts']),
    priorites: plusieurs(recherche['priorites']),
    groupe: seul(recherche['groupe']),
    du: seul(recherche['du']),
    au: seul(recherche['au']),
    page: seul(recherche['page']),
  }
  const ticketChoisi = seul(recherche['ticket'])
  const avecNotes = seul(recherche['notes']) === '1'

  /** Le même écran, avec ces paramètres changés et les filtres conservés. */
  const lien = (changements: Record<string, string | undefined>): string => {
    const query = new URLSearchParams()
    for (const statut of filtres.statuts ?? []) query.append('statuts', statut)
    for (const priorite of filtres.priorites ?? []) query.append('priorites', priorite)
    for (const champ of ['groupe', 'du', 'au', 'page'] as const) {
      const valeur = changements[champ] ?? filtres[champ] ?? ''
      if (valeur !== '') query.set(champ, valeur)
    }
    for (const [champ, valeur] of Object.entries(changements)) {
      if (champ === 'groupe' || champ === 'du' || champ === 'au' || champ === 'page') continue
      if (valeur !== undefined && valeur !== '') query.set(champ, valeur)
    }
    const chaine = query.toString()
    return chaine === '' ? base : `${base}?${chaine}`
  }

  const ouverte = ETATS_ENTREE_OUVERTE.has(c.etat)
  const peutEditer = verifierDroit(acteur.utilisateur, 'EDITER').autorise
  const entete = (
    <>
      <EnTeteCommunication
        avancement={avancement}
        reference={c.reference}
        titre={c.titre}
        etat={c.etat}
        criticite={c.criticite}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-measure text-sm text-ink-secondary">{t('picker.description')}</p>
        <Button asChild variant="ghost" icon={<ArrowLeft aria-hidden="true" />}>
          <Link href={`/communications/${c.id}/entree`}>{t('picker.back')}</Link>
        </Button>
      </div>
    </>
  )

  if (!ouverte || !peutEditer || !itsmDisponible(etat)) {
    const tEntree = await getTranslations('communications.entree')
    return (
      <>
        {entete}
        <Notice
          level="info"
          title={ouverte && peutEditer ? t('picker.unavailable.title') : tEntree('closed.title')}
        >
          {ouverte && peutEditer
            ? t('picker.unavailable.description')
            : tEntree('closed.description')}
        </Notice>
      </>
    )
  }

  const page = await essayer(listerTickets(acteur, filtres))
  const apercu: { valeur: SourceItsmPreparee } | { code: string } | null =
    ticketChoisi === ''
      ? null
      : await essayer(
          apercuSourceItsm(acteur, { communicationId: c.id, idExterne: ticketChoisi, avecNotes }),
        )

  const message = (code: string) => {
    const cle = `erreurs.${code}` as 'erreurs.CONFIG'
    return t.has(cle) ? t(cle) : t('erreurs.CONFIG')
  }
  const numeroPage = 'valeur' in page ? page.valeur.page : 1
  const total = 'valeur' in page ? page.valeur.total : null
  const dernierePage =
    total === null
      ? 'valeur' in page && page.valeur.tickets.length < page.valeur.taille
      : numeroPage * ('valeur' in page ? page.valeur.taille : 1) >= total

  return (
    <>
      {entete}
      <div className="flex flex-col gap-4">
        <Panel title={t('picker.filters.title')}>
          <FiltresTickets
            action={getPathname({ href: base, locale })}
            statuts={filtres.statuts ?? []}
            priorites={filtres.priorites ?? []}
            groupe={filtres.groupe ?? ''}
            du={filtres.du ?? ''}
            au={filtres.au ?? ''}
            lienReinitialiser={base}
          />
        </Panel>

        {'code' in page ? (
          <Notice level="blocking" title={t('erreurs.titre')}>
            {message(page.code)}
          </Notice>
        ) : page.valeur.tickets.length === 0 ? (
          <Panel flush>
            <EmptyState
              icon={Ticket}
              title={t('picker.empty.title')}
              description={t('picker.empty.description')}
            />
          </Panel>
        ) : (
          <Panel
            flush
            title={t('picker.title')}
            description={
              total === null
                ? t('picker.pageOf', { page: numeroPage })
                : t('picker.count', { count: total })
            }
          >
            <ListeTickets
              tickets={page.valeur.tickets}
              fuseau={fuseau}
              lienApercu={(idExterne) => lien({ ticket: idExterne, notes: avecNotes ? '1' : '' })}
              selectionne={ticketChoisi === '' ? null : ticketChoisi}
            />
            <nav
              aria-label={t('picker.title')}
              className="flex items-center justify-between gap-3 border-t-w border-line-subtle px-4 py-3"
            >
              {numeroPage > 1 ? (
                <Button asChild variant="ghost">
                  <Link href={lien({ page: String(numeroPage - 1), ticket: '' })}>
                    {t('picker.previous')}
                  </Link>
                </Button>
              ) : (
                <span />
              )}
              <span className="text-sm text-ink-secondary tnum">
                {t('picker.pageOf', { page: numeroPage })}
              </span>
              {dernierePage ? (
                <span />
              ) : (
                <Button asChild variant="ghost">
                  <Link href={lien({ page: String(numeroPage + 1), ticket: '' })}>
                    {t('picker.next')}
                  </Link>
                </Button>
              )}
            </nav>
          </Panel>
        )}

        {apercu === null ? null : 'code' in apercu ? (
          <Notice level="blocking" title={t('erreurs.titre')}>
            {message(apercu.code)}
          </Notice>
        ) : (
          <>
            <ApercuTicket
              source={apercu.valeur}
              lienNotes={lien({ ticket: ticketChoisi, notes: avecNotes ? '' : '1' })}
            />
            <Panel title={t('import.title')} description={t('import.description')}>
              <FormulaireImport
                communicationId={c.id}
                idExterne={ticketChoisi}
                avecNotes={avecNotes}
              />
            </Panel>
          </>
        )}
      </div>
    </>
  )
}
