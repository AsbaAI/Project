import { useLocale, useTranslations } from 'next-intl'

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
import type { ResumeCommunication } from '@/server/services/communications'

import { CriticiteBadge, EtatBadge } from './badges'

/*
 * Liste de communications. Le titre est le lien : une seule cible par
 * ligne, nommée par son contenu. Sur téléphone, les colonnes secondaires
 * cèdent la place ; la référence, le titre et l'état restent.
 */
export interface TableauCommunicationsProps {
  communications: readonly ResumeCommunication[]
  fuseau: string
  legende: string
  colonnes?: 'complet' | 'compact'
}

export function TableauCommunications({
  communications,
  fuseau,
  legende,
  colonnes = 'complet',
}: TableauCommunicationsProps) {
  const t = useTranslations('communications')
  const locale = useLocale()
  const complet = colonnes === 'complet'

  return (
    <Table>
      <caption className="visually-hidden">{legende}</caption>
      <TableHead>
        <tr>
          <TableHeaderCell className="w-32">{t('list.columns.reference')}</TableHeaderCell>
          <TableHeaderCell>{t('list.columns.titre')}</TableHeaderCell>
          {complet ? (
            <TableHeaderCell className="hidden lg:table-cell">
              {t('list.columns.nature')}
            </TableHeaderCell>
          ) : null}
          <TableHeaderCell className="hidden md:table-cell">
            {t('list.columns.criticite')}
          </TableHeaderCell>
          <TableHeaderCell>{t('list.columns.etat')}</TableHeaderCell>
          {complet ? (
            <TableHeaderCell className="hidden xl:table-cell">
              {t('list.columns.auteur')}
            </TableHeaderCell>
          ) : null}
          <TableHeaderCell align="end" className="hidden sm:table-cell">
            {t('list.columns.modifieLe')}
          </TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {communications.map((c) => (
          <TableRow key={c.id}>
            <TableCell mono className="whitespace-nowrap text-ink-secondary">
              {c.reference}
            </TableCell>
            <TableCell className="min-w-48">
              <Link
                href={`/communications/${c.id}`}
                className="rounded-xs font-medium text-ink-primary focus-ring hover:text-ink-accent"
              >
                {c.titre}
              </Link>
            </TableCell>
            {complet ? (
              <TableCell className="hidden text-ink-secondary lg:table-cell">
                {t(`natures.${c.nature}`)}
              </TableCell>
            ) : null}
            <TableCell className="hidden md:table-cell">
              <CriticiteBadge criticite={c.criticite} />
            </TableCell>
            <TableCell>
              <EtatBadge etat={c.etat} />
            </TableCell>
            {complet ? (
              <TableCell className="hidden text-ink-secondary xl:table-cell">
                {c.auteurNom}
              </TableCell>
            ) : null}
            <TableCell
              align="end"
              className="hidden whitespace-nowrap text-ink-secondary tnum sm:table-cell"
            >
              {formaterInstant(c.modifieLe, locale, fuseau, 'date')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
