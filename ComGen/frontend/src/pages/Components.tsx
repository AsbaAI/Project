import { useState } from 'react'
import {
  Badge,
  Button,
  EmptyState,
  Panel,
  Progress,
  SelectField,
  Table,
  Tabs,
  TextAreaField,
  TextField,
  type Column,
} from '../components/ui'
import { PageHeader } from '../components/layout'
import { IconDownload, IconInbox, IconPlus, IconSearch } from '../components/icons'
import styles from './showcase.module.css'

type Run = {
  id: string
  objet: string
  gabarit: string
  langues: number
  score: number
  etat: 'Terminé' | 'En cours' | 'Échec'
}

const RUNS: Run[] = [
  {
    id: 'r-4821',
    objet: 'Arrêt planifié — plateforme de facturation',
    gabarit: 'Incident majeur',
    langues: 5,
    score: 92,
    etat: 'Terminé',
  },
  {
    id: 'r-4820',
    objet: 'Nouvelle politique de mots de passe',
    gabarit: 'Changement',
    langues: 8,
    score: 88,
    etat: 'Terminé',
  },
  {
    id: 'r-4819',
    objet: 'Migration des boîtes partagées — vague 3',
    gabarit: 'Migration',
    langues: 3,
    score: 0,
    etat: 'En cours',
  },
  {
    id: 'r-4817',
    objet: 'Fermeture du service de conférence audio',
    gabarit: 'Fin de service',
    langues: 2,
    score: 61,
    etat: 'Échec',
  },
]

const ETATS = {
  Terminé: 'success',
  'En cours': 'accent',
  Échec: 'danger',
} as const

const COLUMNS: Column<Run>[] = [
  {
    key: 'objet',
    header: 'Objet',
    cell: (run) => run.objet,
    sortable: true,
  },
  {
    key: 'gabarit',
    header: 'Gabarit',
    cell: (run) => run.gabarit,
    width: '10rem',
  },
  {
    key: 'langues',
    header: 'Langues',
    cell: (run) => run.langues,
    align: 'end',
    numeric: true,
    width: '6rem',
  },
  {
    key: 'score',
    header: 'Score',
    cell: (run) => (run.score === 0 ? '—' : `${run.score}/100`),
    align: 'end',
    numeric: true,
    width: '6rem',
    sortable: true,
  },
  {
    key: 'etat',
    header: 'État',
    cell: (run) => (
      <Badge tone={ETATS[run.etat]} dot>
        {run.etat}
      </Badge>
    ),
    width: '8rem',
  },
]

export function Components() {
  const [tab, setTab] = useState('courriel')
  const [sortKey, setSortKey] = useState('objet')

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Système de design"
        title="Composants"
        description="Chaque composant embarque son comportement d’accessibilité : le clavier, l’annonce et l’état ne sont pas des options à rebrancher à chaque écran."
        actions={
          <>
            <Button variant="ghost" iconStart={<IconSearch />}>
              Rechercher
            </Button>
            <Button variant="primary" iconStart={<IconPlus />}>
              Nouvelle communication
            </Button>
          </>
        }
      />

      <div className={styles.stack}>
        <Panel
          title="Boutons"
          subtitle="Quatre intentions, trois tailles. Une seule action principale par écran."
        >
          <div className={styles.stack} style={{ gap: 'var(--space-4)' }}>
            <div className={styles.row}>
              <Button variant="primary">Générer</Button>
              <Button>Enregistrer le brouillon</Button>
              <Button variant="ghost">Annuler</Button>
              <Button variant="danger">Supprimer</Button>
            </div>

            <div className={styles.row}>
              <Button size="sm">Petit</Button>
              <Button size="md">Moyen</Button>
              <Button size="lg">Grand</Button>
              <Button aria-label="Télécharger" iconStart={<IconDownload />} />
            </div>

            <div className={styles.row}>
              <Button variant="primary" loading>
                Génération en cours
              </Button>
              <Button disabled>Indisponible</Button>
            </div>

            <p className={styles.note}>
              Le libellé reste lisible pendant le chargement : l’utilisateur
              doit pouvoir relire l’action qu’il vient de déclencher. Un bouton
              sans libellé visible exige un <code>aria-label</code> — le type
              TypeScript refuse de compiler sans lui.
            </p>
          </div>
        </Panel>

        <Panel
          title="Champs"
          subtitle="Libellé, aide et erreur sont câblés au contrôle, pas simplement posés à côté."
        >
          <div className={styles.formGrid}>
            <TextField
              label="Objet de la communication"
              placeholder="Arrêt planifié — plateforme de facturation"
              hint="Il apparaîtra tel quel en objet du courriel."
              required
            />
            <SelectField label="Gabarit" defaultValue="incident">
              <option value="incident">Incident majeur</option>
              <option value="changement">Changement</option>
              <option value="migration">Migration</option>
              <option value="fin">Fin de service</option>
            </SelectField>
            <TextField
              label="Date de début"
              type="datetime-local"
              error="La date de début doit précéder la date de fin."
            />
            <TextField label="Référence interne" optional />
            <TextAreaField
              className={styles.span2}
              label="Éléments à intégrer"
              rows={4}
              placeholder="Collez ici la note technique, le compte rendu ou le courriel d’origine."
              hint="Le contenu source n’est jamais diffusé tel quel : il sert de matière à la génération."
            />
            <TextField
              className={styles.span2}
              label="Champ neutralisé"
              defaultValue="Renseigné automatiquement"
              disabled
            />
          </div>
        </Panel>

        <div className={styles.cols2}>
          <Panel
            title="Qualificatifs"
            subtitle="Le texte dit ce que la couleur souligne."
          >
            <div className={styles.stack} style={{ gap: 'var(--space-3)' }}>
              <div className={styles.row}>
                <Badge>Brouillon</Badge>
                <Badge tone="accent" dot>
                  En cours
                </Badge>
                <Badge tone="success" dot>
                  Validé
                </Badge>
                <Badge tone="warning" dot>
                  À relire
                </Badge>
                <Badge tone="danger" dot>
                  Échec
                </Badge>
              </div>
              <div className={styles.row}>
                <Badge count>8</Badge>
                <Badge count>12</Badge>
                <Badge count tone="danger">
                  3
                </Badge>
                <span className={styles.note}>
                  Compteurs à chasse fixe : une liste ne se décale pas quand un
                  nombre passe de 9 à 10.
                </span>
              </div>
            </div>
          </Panel>

          <Panel
            title="Progression"
            subtitle="Une barre s’accompagne toujours d’une valeur lisible."
          >
            <div className={styles.stack} style={{ gap: 'var(--space-5)' }}>
              <Progress
                label="Traduction"
                value={5}
                max={8}
                valueText="5 langues sur 8"
              />
              <Progress
                label="Score de conformité"
                value={92}
                tone="success"
                valueText="92 sur 100"
              />
              <Progress label="Analyse du document source" />
            </div>
          </Panel>
        </div>

        <Panel
          title="Onglets et tableau"
          subtitle="Une seule tabulation entre dans le groupe ; les flèches font le reste."
          flush
        >
          <div style={{ padding: 'var(--space-4) var(--space-4) 0' }}>
            <Tabs
              label="Formats de sortie"
              value={tab}
              onChange={setTab}
              items={[
                { id: 'courriel', label: 'Courriel', trailing: <Badge count>8</Badge> },
                { id: 'intranet', label: 'Intranet' },
                { id: 'banniere', label: 'Bannière' },
                { id: 'teams', label: 'Teams' },
                { id: 'sms', label: 'SMS', disabled: true },
              ]}
            />
          </div>

          <Table
            caption="Communications générées récemment"
            columns={COLUMNS}
            rows={RUNS}
            rowKey={(run) => run.id}
            sort={{ key: sortKey, direction: 'desc' }}
            onSortChange={setSortKey}
          />
        </Panel>

        <Panel title="État vide">
          <EmptyState
            icon={<IconInbox />}
            title="Aucune communication pour l’instant"
            description="Déposez une note technique ou un compte rendu : ComGen en tire un courriel, une annonce intranet et une bannière, dans les langues que vous choisissez."
            action={
              <Button variant="primary" iconStart={<IconPlus />}>
                Nouvelle communication
              </Button>
            }
          />
        </Panel>
      </div>
    </div>
  )
}
