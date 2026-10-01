import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Badge } from './badge'
import { Button } from './button'
import { Panel } from './panel'

const meta = {
  title: 'Composants/Panneau',
  component: Panel,
  tags: ['autodocs'],
  args: {
    title: 'Fiche de faits',
    description: '12 faits extraits, 2 amendements en attente.',
    children: (
      <p className="max-w-measure text-sm text-ink-secondary">
        Chaque fait cite la source mot pour mot. Un fait modifié à la main devient un amendement,
        tracé et soumis à validation avant toute génération.
      </p>
    ),
  },
  argTypes: {
    children: { control: false },
    actions: { control: false },
    footer: { control: false },
  },
  decorators: [(Story) => <div className="max-w-2xl">{Story()}</div>],
} satisfies Meta<typeof Panel>

export default meta
type Story = StoryObj<typeof meta>

export const Defaut: Story = {}

export const AvecActions: Story = {
  args: {
    actions: (
      <>
        <Badge tone="pending">Faits à valider</Badge>
        <Button size="sm">Ajouter un fait</Button>
      </>
    ),
  },
}

export const AvecPied: Story = {
  args: {
    footer: (
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm">
          Annuler
        </Button>
        <Button variant="primary" size="sm">
          Valider la fiche
        </Button>
      </div>
    ),
  },
}

/** Sans en-tête : un simple conteneur bordé. */
export const SansEnTete: Story = {
  args: { title: undefined, description: undefined },
}

/** `flush` retire le rembourrage du corps pour un contenu bord à bord (tableau, liste). */
export const BordABord: Story = {
  args: {
    flush: true,
    children: (
      <ul className="divide-y divide-line-subtle text-sm">
        <li className="px-4 py-2.5">F-01 — « La fenêtre de migration est fixée au 14 mars. »</li>
        <li className="px-4 py-2.5">F-02 — « Aucune interruption de service n’est prévue. »</li>
        <li className="px-4 py-2.5">F-03 — « La version 4.2.1 sera déployée. »</li>
      </ul>
    ),
  },
}
