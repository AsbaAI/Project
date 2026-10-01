import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Field, Input, Textarea } from './field'

const meta = {
  title: 'Composants/Champ',
  component: Field,
  tags: ['autodocs'],
  args: {
    label: 'Objet de la communication',
    hint: 'Tel qu’il apparaîtra dans le courriel envoyé.',
    requirementLabel: 'obligatoire',
    required: true,
    children: <Input placeholder="Migration de la plateforme de paiement — fenêtre du 14 mars" />,
  },
  argTypes: { children: { control: false } },
  decorators: [(Story) => <div className="max-w-lg">{Story()}</div>],
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Defaut: Story = {}

/** L'erreur vient après l'aide : rien ne saute au-dessus du champ quand elle apparaît. */
export const EnErreur: Story = {
  args: {
    label: 'Audience',
    hint: 'Une liste par persona. Les destinataires sont validés à l’envoi.',
    error: 'L’audience « Fournisseurs Tier 2 » n’existe plus dans le référentiel.',
    children: <Input defaultValue="Fournisseurs Tier 2" />,
  },
}

export const Facultatif: Story = {
  args: {
    label: 'Notes internes',
    hint: 'Jamais incluses dans la communication.',
    requirementLabel: 'facultatif',
    required: false,
    children: <Textarea />,
  },
}

export const Desactive: Story = {
  args: {
    label: 'Référence',
    hint: 'Attribuée automatiquement à la création.',
    requirementLabel: undefined,
    required: false,
    disabled: true,
    children: <Input defaultValue="COM-2026-0001" className="font-mono" />,
  },
}

export const ZoneDeTexte: Story = {
  args: {
    label: 'Contexte pour le rédacteur',
    hint: 'Consignes de ton et de longueur. Le contenu de la source reste la seule référence factuelle.',
    requirementLabel: 'facultatif',
    required: false,
    children: <Textarea rows={4} />,
  },
}
