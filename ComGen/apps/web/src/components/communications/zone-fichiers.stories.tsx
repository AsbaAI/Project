import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Field } from '@/components/ui/field'

import { ZoneFichiers } from './zone-fichiers'

const meta = {
  title: 'Composants/Communications/ZoneFichiers',
  component: ZoneFichiers,
  tags: ['autodocs'],
  args: { name: 'fichiers', accept: '.docx,.pdf,.xlsx,.csv,.md,.txt' },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ZoneFichiers>

export default meta
type Story = StoryObj<typeof meta>

/** Dans un `Field`, qui lui donne son libellé, son aide et son identifiant. */
export const DansUnChamp: Story = {
  render: (args) => (
    <Field label="Fichiers" hint="Jusqu'à 20 fichiers, 50 Mio au total.">
      <ZoneFichiers {...args} />
    </Field>
  ),
}

export const EnErreur: Story = {
  render: (args) => (
    <Field label="Fichiers" error="Choisissez au moins un fichier.">
      <ZoneFichiers {...args} />
    </Field>
  ),
}
