import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { FilePlus2, History } from 'lucide-react'

import { ActionCard } from './action-card'

const meta = {
  title: 'Composants/ActionCard',
  component: ActionCard,
  tags: ['autodocs'],
  args: {
    href: '/communications/nouvelle',
    icon: FilePlus2,
    title: 'Nouvelle communication',
    description: "Partir d'un document, d'un texte ou d'un modèle.",
    tone: 'primary',
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ActionCard>

export default meta
type Story = StoryObj<typeof meta>

/** L'action que l'écran existe pour permettre : pastille bleue pleine. */
export const Principale: Story = {}

export const Secondaire: Story = {
  args: {
    href: '/communications',
    icon: History,
    title: 'Communication existante',
    description: "Reprendre, suivre ou dupliquer depuis l'historique.",
    tone: 'secondary',
  },
}

/** Les deux portes de l'accueil, côte à côte. */
export const Accueil: Story = {
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="grid gap-4 md:grid-cols-2">
      <ActionCard
        href="/communications/nouvelle"
        icon={FilePlus2}
        tone="primary"
        title="Nouvelle communication"
        description="Partir d'un document, d'un texte ou d'un modèle."
      />
      <ActionCard
        href="/communications"
        icon={History}
        title="Communication existante"
        description="Reprendre, suivre ou dupliquer depuis l'historique."
      />
    </div>
  ),
}
