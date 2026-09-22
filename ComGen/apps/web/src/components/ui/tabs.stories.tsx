import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

const meta = {
  title: 'Composants/Onglets',
  component: Tabs,
  tags: ['autodocs'],
  args: { defaultValue: 'faits' },
  decorators: [(Story) => <div className="max-w-2xl">{Story()}</div>],
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

/** Pour des vues parallèles d'un même objet, jamais pour des étapes séquentielles. */
export const Defaut: Story = {
  render: (args) => (
    <Tabs {...args}>
      <TabsList aria-label="Vues de la communication">
        <TabsTrigger value="faits">Faits</TabsTrigger>
        <TabsTrigger value="variantes">Variantes</TabsTrigger>
        <TabsTrigger value="controles">Contrôles</TabsTrigger>
        <TabsTrigger value="historique">Historique</TabsTrigger>
      </TabsList>
      <TabsContent value="faits" className="text-sm text-ink-secondary">
        Fiche de faits : 12 faits, 2 amendements en attente.
      </TabsContent>
      <TabsContent value="variantes" className="text-sm text-ink-secondary">
        3 variantes générées, 1 en correction.
      </TabsContent>
      <TabsContent value="controles" className="text-sm text-ink-secondary">
        7 contrôles exécutés, 1 bloquant.
      </TabsContent>
      <TabsContent value="historique" className="text-sm text-ink-secondary">
        Dernière modification il y a 4 minutes.
      </TabsContent>
    </Tabs>
  ),
}

export const AvecOngletDesactive: Story = {
  render: (args) => (
    <Tabs {...args}>
      <TabsList aria-label="Vues de la communication">
        <TabsTrigger value="faits">Faits</TabsTrigger>
        <TabsTrigger value="variantes" disabled>
          Variantes
        </TabsTrigger>
        <TabsTrigger value="controles">Contrôles</TabsTrigger>
      </TabsList>
      <TabsContent value="faits" className="text-sm text-ink-secondary">
        Les variantes ne sont disponibles qu’une fois la fiche de faits validée.
      </TabsContent>
      <TabsContent value="controles" className="text-sm text-ink-secondary">
        Aucun contrôle exécuté.
      </TabsContent>
    </Tabs>
  ),
}
