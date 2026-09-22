import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Button } from './button'
import { Notice } from './notice'

const meta = {
  title: 'Composants/Message',
  component: Notice,
  tags: ['autodocs'],
  args: {
    level: 'info',
    title: 'Extraction terminée',
    children: '12 faits ont été extraits de la source. Validez-les avant de générer.',
  },
  argTypes: {
    level: { control: 'inline-radio', options: ['info', 'warning', 'blocking'] },
    action: { control: false },
  },
  decorators: [(Story) => <div className="max-w-2xl">{Story()}</div>],
} satisfies Meta<typeof Notice>

export default meta
type Story = StoryObj<typeof meta>

export const Information: Story = {}

export const Avertissement: Story = {
  args: {
    level: 'warning',
    title: 'Registre incomplet',
    children:
      'Le ton « rassurant » n’a pas de correspondance pour la langue allemande. La variante allemande utilisera le registre par défaut.',
  },
}

/**
 * Un message bloquant dit CE QUI bloque dans son titre et QUOI FAIRE dans son
 * corps (§2 : « bloquer et expliquer »). Il porte `role="alert"`.
 */
export const Bloquant: Story = {
  args: {
    level: 'blocking',
    title: 'Envoi bloqué : 2 affirmations sans fait d’appui',
    children:
      'Les affirmations A-07 et A-11 ne se rattachent à aucun fait de la fiche. Rattachez-les à un fait existant ou supprimez-les de la variante.',
    action: <Button size="sm">Ouvrir la variante</Button>,
  },
}

export const SansCorps: Story = {
  args: { level: 'info', title: 'Brouillon enregistré', children: undefined },
}
