import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { FilePlus, X } from 'lucide-react'

import { Button } from './button'

const meta = {
  title: 'Composants/Bouton',
  component: Button,
  tags: ['autodocs'],
  args: { children: 'Enregistrer le brouillon', variant: 'secondary', size: 'md' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    icon: { control: false },
    asChild: { control: false },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Secondaire: Story = {}

export const Principal: Story = {
  args: { variant: 'primary', children: 'Générer les variantes' },
}

export const Discret: Story = {
  args: { variant: 'ghost', children: 'Annuler' },
}

/** Une action destructive nomme toujours ce qu'elle détruit. */
export const Destructif: Story = {
  args: { variant: 'danger', children: 'Rejeter la communication' },
}

/** Le libellé reste, le focus reste ; seul le clic est bloqué. */
export const EnCours: Story = {
  args: { variant: 'primary', loading: true, children: 'Génération en cours' },
}

export const Desactive: Story = {
  args: { variant: 'primary', disabled: true, children: 'Envoyer' },
}

export const AvecIcone: Story = {
  args: { icon: <FilePlus aria-hidden="true" /> },
}

/** L'icône est obligatoire et les enfants deviennent le libellé hors écran. */
export const IconeSeule: Story = {
  args: { iconOnly: true, icon: <X aria-hidden="true" />, children: 'Fermer le panneau' },
}

export const Tailles: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} size="sm" icon={<FilePlus aria-hidden="true" />} />
      <Button {...args} size="md" icon={<FilePlus aria-hidden="true" />} />
      <Button {...args} size="lg" icon={<FilePlus aria-hidden="true" />} />
    </div>
  ),
}

/** Un lien habillé en bouton : `asChild` rend l'enfant à la place du `<button>`. */
export const Lien: Story = {
  args: { asChild: true, children: <a href="#design">Voir le système de design</a> },
}
