import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ThemeToggle } from './theme-toggle'

const meta = {
  title: 'Composants/Bascule de thème',
  component: ThemeToggle,
  tags: ['autodocs'],
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof ThemeToggle>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Groupe radio à trois positions (système, clair, sombre), navigable aux
 * flèches. La préférence est écrite dans le stockage local : elle persiste
 * d'une story à l'autre, comme dans l'application. Le sélecteur de la barre
 * d'outils de Storybook agit sur le même attribut `data-theme`.
 */
export const Defaut: Story = {}
