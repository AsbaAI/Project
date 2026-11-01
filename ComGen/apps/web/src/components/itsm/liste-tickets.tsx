import type { TicketResume } from '@comgen/connecteurs'
import { useLocale, useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { formaterInstant } from '@/lib/dates'

import { tonStatut } from './libelles'

/*
 * Tickets de l'outil ITSM. Le numéro est le lien : une seule cible par
 * ligne, qui ouvre l'aperçu de ce que les agents liraient. Rien n'est
 * importé depuis cette liste — on regarde d'abord.
 */
export interface ListeTicketsProps {
  tickets: readonly TicketResume[]
  fuseau: string
  /** Adresse de l'aperçu d'un ticket, filtres et page conservés. */
  lienApercu: (idExterne: string) => string
  selectionne: string | null
}

export function ListeTickets({ tickets, fuseau, lienApercu, selectionne }: ListeTicketsProps) {
  const t = useTranslations('itsm')
  const locale = useLocale()

  return (
    <Table>
      <caption className="visually-hidden">{t('picker.legend')}</caption>
      <TableHead>
        <tr>
          <TableHeaderCell className="w-36">{t('picker.columns.numero')}</TableHeaderCell>
          <TableHeaderCell>{t('picker.columns.titre')}</TableHeaderCell>
          <TableHeaderCell className="hidden sm:table-cell">
            {t('picker.columns.statut')}
          </TableHeaderCell>
          <TableHeaderCell className="hidden lg:table-cell">
            {t('picker.columns.priorite')}
          </TableHeaderCell>
          <TableHeaderCell className="hidden xl:table-cell">
            {t('picker.columns.groupe')}
          </TableHeaderCell>
          <TableHeaderCell align="end" className="hidden sm:table-cell">
            {t('picker.columns.misAJour')}
          </TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {tickets.map((ticket) => (
          <TableRow
            key={ticket.idExterne}
            className={ticket.idExterne === selectionne ? 'bg-surface-selected' : undefined}
          >
            <TableCell mono className="whitespace-nowrap">
              <Link
                href={lienApercu(ticket.idExterne)}
                aria-current={ticket.idExterne === selectionne ? 'true' : undefined}
                className="rounded-xs font-medium text-ink-primary focus-ring hover:text-ink-accent"
              >
                {ticket.numero}
              </Link>
            </TableCell>
            <TableCell className="min-w-40 text-ink-primary">{ticket.titre}</TableCell>
            <TableCell className="hidden sm:table-cell">
              <Badge tone={tonStatut(ticket.statut.code)}>
                {t.has(`statuts.${ticket.statut.code}` as 'statuts.AUTRE')
                  ? t(`statuts.${ticket.statut.code}` as 'statuts.AUTRE')
                  : ticket.statut.libelle}
              </Badge>
            </TableCell>
            <TableCell className="hidden text-ink-secondary lg:table-cell">
              {t.has(`priorites.${ticket.priorite.niveau}` as 'priorites.3')
                ? t(`priorites.${ticket.priorite.niveau}` as 'priorites.3')
                : ticket.priorite.libelle}
            </TableCell>
            <TableCell className="hidden text-ink-secondary xl:table-cell">
              {ticket.groupe ?? ''}
            </TableCell>
            <TableCell
              align="end"
              className="hidden whitespace-nowrap text-ink-secondary tnum sm:table-cell"
            >
              {formaterInstant(ticket.misAJourLe, locale, fuseau, 'date')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
