import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { COMMUNICATION_STATES, STATE_TONE } from '@/lib/state-tone'

import { Badge } from './badge'

const meta = {
  title: 'Composants/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: { children: 'En contrôle', tone: 'accent' },
  argTypes: {
    tone: {
      control: 'select',
      options: [
        'draft',
        'neutral',
        'accent',
        'pending',
        'success',
        'warning',
        'danger',
        'archived',
      ],
    },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Defaut: Story = {}

/** Chaque tonalité a sa forme d'icône : la couleur confirme, elle ne porte pas l'état seule. */
export const Tonalites: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge tone="draft">Brouillon</Badge>
      <Badge tone="neutral">Neutre</Badge>
      <Badge tone="accent">Accent</Badge>
      <Badge tone="pending">En attente</Badge>
      <Badge tone="success">Succès</Badge>
      <Badge tone="warning">Alerte</Badge>
      <Badge tone="danger">Erreur</Badge>
      <Badge tone="archived">Archivée</Badge>
    </div>
  ),
}

const LIBELLES: Record<(typeof COMMUNICATION_STATES)[number], string> = {
  BROUILLON: 'Brouillon',
  FAITS_A_VALIDER: 'Faits à valider',
  PRETE_A_GENERER: 'Prête à générer',
  EN_GENERATION: 'En génération',
  EN_CONTROLE: 'En contrôle',
  A_CORRIGER: 'À corriger',
  EN_RELECTURE: 'En relecture',
  EN_APPROBATION: 'En approbation',
  APPROUVEE: 'Approuvée',
  ENVOI_PLANIFIE: 'Envoi planifié',
  ENVOYEE: 'Envoyée',
  REJETEE: 'Rejetée',
  ARCHIVEE: 'Archivée',
}

/** Les treize états de la machine (§7), avec la tonalité que leur assigne `state-tone.ts`. */
export const EtatsDeCommunication: Story = {
  render: () => (
    <ul className="flex flex-wrap gap-2">
      {COMMUNICATION_STATES.map((etat) => (
        <li key={etat}>
          <Badge tone={STATE_TONE[etat]}>{LIBELLES[etat]}</Badge>
        </li>
      ))}
    </ul>
  ),
}

export const LibelleLong: Story = {
  args: {
    tone: 'warning',
    children: 'À corriger — 2 affirmations sans fait d’appui',
    className: 'max-w-48',
  },
}
