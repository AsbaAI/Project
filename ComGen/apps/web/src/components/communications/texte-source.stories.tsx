import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { TexteSource } from './texte-source'

const CONTENU = [
  "Déclaration d'incident INC-2026-0187 — indisponibilité du service de facturation",
  '',
  'Actions menées : extension du volume de 200 Go à 400 Go. Le service a été rétabli à 15h10.',
].join('\n')

function fait(reference: string, extrait: string, contradiction: number | null = null) {
  const offsetDebut = CONTENU.indexOf(extrait)
  return {
    reference,
    localisation: { offsetDebut, offsetFin: offsetDebut + extrait.length },
    statut: 'CONFIRME' as const,
    contradiction,
  }
}

const meta = {
  title: 'Composants/Communications/TexteSource',
  component: TexteSource,
  tags: ['autodocs'],
  args: {
    contenu: CONTENU,
    faits: [
      fait('F-01', "Déclaration d'incident INC-2026-0187"),
      fait('F-02', 'extension du volume de 200 Go à 400 Go'),
    ],
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TexteSource>

export default meta
type Story = StoryObj<typeof meta>

/** Les citations des faits vivants sont surlignées ; le reste est rendu tel quel. */
export const Citations: Story = {}

/** Une citation en contradiction est soulignée d'un trait ondulé : la forme, pas la seule couleur. */
export const Contradiction: Story = {
  args: {
    faits: [
      fait('F-01', "Déclaration d'incident INC-2026-0187"),
      fait('F-04', 'Le service a été rétabli à 15h10', 0),
    ],
  },
}

export const SansFait: Story = { args: { faits: [] } }
