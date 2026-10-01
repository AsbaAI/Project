import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Progress } from './progress'

const meta = {
  title: 'Composants/Progression',
  component: Progress,
  tags: ['autodocs'],
  args: {
    label: 'Génération des variantes',
    valueText: '2 sur 3',
    value: 2,
    max: 3,
    tone: 'accent',
  },
  argTypes: { tone: { control: 'inline-radio', options: ['accent', 'success', 'danger'] } },
  decorators: [(Story) => <div className="max-w-md">{Story()}</div>],
} satisfies Meta<typeof Progress>

export default meta
type Story = StoryObj<typeof meta>

/** Toujours un libellé et une valeur chiffrée : une barre seule ne dit rien. */
export const EnCours: Story = {}

export const Terminee: Story = {
  args: { valueText: '3 sur 3', value: 3, tone: 'success' },
}

export const EnEchec: Story = {
  args: { label: 'Contrôles', valueText: '4 sur 7 — 1 bloquant', value: 4, max: 7, tone: 'danger' },
}

export const Vide: Story = {
  args: { valueText: '0 sur 3', value: 0 },
}
