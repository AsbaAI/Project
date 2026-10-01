import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ChoixCartes } from './choix-cartes'

const CRITICITES = [
  { valeur: 'COURANTE', libelle: 'Courante', description: 'Information de routine.' },
  {
    valeur: 'IMPORTANTE',
    libelle: 'Importante',
    description: 'Impact notable pour les destinataires.',
  },
  {
    valeur: 'CRITIQUE',
    libelle: 'Critique',
    description: "Impact majeur ; double approbation et fenêtre d'annulation.",
  },
]

const meta = {
  title: 'Composants/Communications/ChoixCartes',
  component: ChoixCartes,
  tags: ['autodocs'],
  args: {
    nom: 'criticite',
    legende: 'Criticité',
    mentionRequis: 'obligatoire',
    colonnes: 3,
    options: CRITICITES,
  },
} satisfies Meta<typeof ChoixCartes>

export default meta
type Story = StoryObj<typeof meta>

/** Aucune valeur par défaut : la criticité se déclare, elle ne se devine pas. */
export const SansChoix: Story = {}

export const Choisi: Story = { args: { valeurParDefaut: 'IMPORTANTE' } }

/** Erreur renvoyée par le serveur : bordure, message et `aria-invalid`. */
export const EnErreur: Story = { args: { erreur: 'Choisissez une valeur.' } }

/** Options indisponibles : nommées en note plutôt qu'en cartes grisées. */
export const AvecNote: Story = {
  args: {
    nom: 'modeEntree',
    legende: 'Comment la source arrive-t-elle ?',
    colonnes: 2,
    options: [
      {
        valeur: 'FICHIER',
        libelle: 'Dépôt de fichiers',
        description: 'Documents Word, PDF, Excel, CSV, Markdown ou texte.',
      },
      {
        valeur: 'TEXTE_SAISI',
        libelle: 'Rédaction directe',
        description: 'Vous écrivez le message ; il devient la source.',
      },
    ],
    note: 'Pas encore disponibles : Connecteur, Courriel transféré, Dictée, API et Formulaire.',
  },
}

export const OptionDesactivee: Story = {
  args: {
    options: CRITICITES.map((option) =>
      option.valeur === 'CRITIQUE'
        ? Object.assign({}, option, { desactivee: true, mention: 'Réservé' })
        : option,
    ),
  },
}
