'use client'

import { useState } from 'react'

import { Badge, type BadgeTone } from '@/components/ui/badge'
import {
  type SortDirection,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table'

/*
 * Démonstrations qui ont besoin d'un état local. Les textes arrivent déjà
 * traduits depuis la page (composant serveur) : ce fichier ne connaît
 * aucune clé de traduction.
 */

export interface TableDemoRow {
  id: string
  subject: string
  audience: string
  stateLabel: string
  stateTone: BadgeTone
  assertions: string
  updated: string
}

export interface TableDemoProps {
  columns: {
    subject: string
    audience: string
    state: string
    assertions: string
    updated: string
  }
  rows: TableDemoRow[]
}

const NEXT_DIRECTION: Record<SortDirection, SortDirection> = {
  none: 'ascending',
  ascending: 'descending',
  descending: 'ascending',
}

export function TableDemo({ columns, rows }: TableDemoProps) {
  const [sort, setSort] = useState<SortDirection>('ascending')
  const [selectedId, setSelectedId] = useState<string | undefined>(rows[1]?.id)

  const sorted = rows.toSorted((a, b) => {
    const order = a.subject.localeCompare(b.subject)
    return sort === 'descending' ? -order : order
  })

  return (
    <Table className="min-w-160">
      <TableHead>
        <TableRow>
          <TableHeaderCell sort={sort} onSort={() => setSort(NEXT_DIRECTION[sort])}>
            {columns.subject}
          </TableHeaderCell>
          <TableHeaderCell>{columns.audience}</TableHeaderCell>
          <TableHeaderCell>{columns.state}</TableHeaderCell>
          <TableHeaderCell align="end">{columns.assertions}</TableHeaderCell>
          <TableHeaderCell align="end">{columns.updated}</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {sorted.map((row) => (
          <TableRow
            key={row.id}
            interactive
            selected={row.id === selectedId}
            onClick={() => setSelectedId(row.id)}
          >
            <TableCell className="font-medium">{row.subject}</TableCell>
            <TableCell className="text-ink-secondary">{row.audience}</TableCell>
            <TableCell>
              <Badge tone={row.stateTone}>{row.stateLabel}</Badge>
            </TableCell>
            <TableCell numeric>{row.assertions}</TableCell>
            <TableCell align="end" className="text-ink-tertiary">
              {row.updated}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
