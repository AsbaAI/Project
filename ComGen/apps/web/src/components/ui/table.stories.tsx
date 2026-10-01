import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'

import { Badge, type BadgeTone } from './badge'
import {
  type SortDirection,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from './table'

const meta = {
  title: 'Composants/Tableau',
  component: Table,
  tags: ['autodocs'],
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

interface Ligne {
  id: string
  objet: string
  audience: string
  etat: string
  tonalite: BadgeTone
  affirmations: string
  modifiee: string
}

const LIGNES: Ligne[] = [
  {
    id: 'COM-2026-0001',
    objet: 'Migration de la plateforme de paiement',
    audience: 'Fournisseurs Tier 1',
    etat: 'Envoyée',
    tonalite: 'success',
    affirmations: '18 / 18',
    modifiee: 'il y a 4 min',
  },
  {
    id: 'COM-2026-0002',
    objet: 'Incident INC-2025-0342 : résolution',
    audience: 'Clients Entreprise',
    etat: 'À corriger',
    tonalite: 'warning',
    affirmations: '9 / 11',
    modifiee: 'il y a 1 h',
  },
  {
    id: 'COM-2026-0003',
    objet: 'Nouvelle politique de facturation',
    audience: 'Partenaires intégrateurs',
    etat: 'En approbation',
    tonalite: 'pending',
    affirmations: '22 / 22',
    modifiee: 'hier',
  },
]

const SUIVANT: Record<SortDirection, SortDirection> = {
  none: 'ascending',
  ascending: 'descending',
  descending: 'ascending',
}

function TableauTriable() {
  const [tri, setTri] = useState<SortDirection>('ascending')
  const [selection, setSelection] = useState<string | undefined>(LIGNES[1]?.id)

  const lignes = LIGNES.toSorted((a, b) => {
    const ordre = a.objet.localeCompare(b.objet)
    return tri === 'descending' ? -ordre : ordre
  })

  return (
    <Table className="min-w-160">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Référence</TableHeaderCell>
          <TableHeaderCell sort={tri} onSort={() => setTri(SUIVANT[tri])}>
            Objet
          </TableHeaderCell>
          <TableHeaderCell>Audience</TableHeaderCell>
          <TableHeaderCell>État</TableHeaderCell>
          <TableHeaderCell align="end">Affirmations</TableHeaderCell>
          <TableHeaderCell align="end">Modifiée</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {lignes.map((ligne) => (
          <TableRow
            key={ligne.id}
            interactive
            selected={ligne.id === selection}
            onClick={() => setSelection(ligne.id)}
          >
            <TableCell mono>{ligne.id}</TableCell>
            <TableCell className="font-medium">{ligne.objet}</TableCell>
            <TableCell className="text-ink-secondary">{ligne.audience}</TableCell>
            <TableCell>
              <Badge tone={ligne.tonalite}>{ligne.etat}</Badge>
            </TableCell>
            <TableCell numeric>{ligne.affirmations}</TableCell>
            <TableCell align="end" className="text-ink-tertiary">
              {ligne.modifiee}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/**
 * Tri annoncé par `aria-sort`, ligne entière cliquable, nombres en chiffres
 * tabulaires alignés à droite, références en chasse fixe.
 */
export const Triable: Story = {
  render: () => <TableauTriable />,
}

export const Statique: Story = {
  render: () => (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Fait</TableHeaderCell>
          <TableHeaderCell>Type</TableHeaderCell>
          <TableHeaderCell>Valeur</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell mono>F-01</TableCell>
          <TableCell>Date</TableCell>
          <TableCell>14 mars 2026</TableCell>
        </TableRow>
        <TableRow>
          <TableCell mono>F-02</TableCell>
          <TableCell>Version</TableCell>
          <TableCell mono>4.2.1</TableCell>
        </TableRow>
        <TableRow>
          <TableCell mono>F-03</TableCell>
          <TableCell>Identifiant</TableCell>
          <TableCell mono>INC-2025-0342</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
}
