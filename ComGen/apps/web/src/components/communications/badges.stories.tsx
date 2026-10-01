import { CRITICITES, ETATS_COMMUNICATION, STATUTS_FAIT } from '@comgen/core'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { CriticiteBadge, EtatBadge, StatutFaitBadge } from './badges'

const meta = {
  title: 'Composants/Communications/Badges',
  component: EtatBadge,
  tags: ['autodocs'],
  args: { etat: 'FAITS_A_VALIDER' },
} satisfies Meta<typeof EtatBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Etat: Story = {}

/** Les états de la machine (§7), chacun avec sa forme d'icône. */
export const TousLesEtats: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {ETATS_COMMUNICATION.map((etat) => (
        <EtatBadge key={etat} etat={etat} />
      ))}
    </div>
  ),
}

export const Criticites: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {CRITICITES.map((criticite) => (
        <CriticiteBadge key={criticite} criticite={criticite} />
      ))}
    </div>
  ),
}

export const StatutsDeFait: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {STATUTS_FAIT.map((statut) => (
        <StatutFaitBadge key={statut} statut={statut} />
      ))}
    </div>
  ),
}
