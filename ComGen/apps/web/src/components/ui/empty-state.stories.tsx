import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CircleAlert, FileUp, Inbox } from 'lucide-react'

import { Button } from './button'
import { EmptyState } from './empty-state'
import { Panel } from './panel'

const meta = {
  title: 'Composants/État vide',
  component: EmptyState,
  tags: ['autodocs'],
  args: {
    icon: FileUp,
    title: 'Aucune source déposée',
    description: 'Déposez un document, un courriel ou un ticket pour en extraire les faits.',
    action: <Button variant="primary">Déposer une source</Button>,
  },
  argTypes: {
    icon: { control: false },
    action: { control: false },
    tone: { control: 'inline-radio', options: ['neutral', 'error'] },
    headingLevel: { control: 'inline-radio', options: [2, 3, 4] },
  },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Defaut: Story = {}

/** Un état vide dû à un échec : il dit ce qui n'a pas marché et ce qui est intact. */
export const Erreur: Story = {
  args: {
    icon: CircleAlert,
    tone: 'error',
    title: 'Impossible de charger les communications',
    description: 'Le service de données n’a pas répondu. Vos brouillons sont intacts.',
    action: <Button>Réessayer</Button>,
  },
}

export const SansAction: Story = {
  args: {
    icon: Inbox,
    title: 'Aucune communication pour l’instant',
    description: 'Les communications créées dans votre organisation apparaîtront ici.',
    action: undefined,
  },
}

/** Dans un panneau, le titre descend d'un niveau pour respecter la hiérarchie des titres. */
export const DansUnPanneau: Story = {
  render: (args) => (
    <Panel title="Sources" description="Documents et messages déposés pour cette communication.">
      <EmptyState {...args} headingLevel={3} />
    </Panel>
  ),
}
