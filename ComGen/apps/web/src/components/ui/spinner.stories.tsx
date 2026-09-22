import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Spinner } from './spinner'

const meta = {
  title: 'Composants/Indicateur d’activité',
  component: Spinner,
  tags: ['autodocs'],
  args: { label: 'Chargement des communications' },
} satisfies Meta<typeof Spinner>

export default meta
type Story = StoryObj<typeof meta>

/** Avec libellé : annoncé comme `status` aux lecteurs d'écran. */
export const AvecLibelle: Story = {}

/** Sans libellé, l'icône est décorative : le contexte (bouton, texte voisin) doit expliquer. */
export const Decoratif: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <p className="flex items-center gap-2 text-sm text-ink-secondary">
      <Spinner />
      Chargement…
    </p>
  ),
}

export const Tailles: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-4 text-ink-secondary">
      <Spinner className="text-xs" />
      <Spinner className="text-base" />
      <Spinner className="text-xl" />
    </div>
  ),
}
