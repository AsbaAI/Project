import { useState } from 'react'
import {
  Badge,
  Button,
  Panel,
  Progress,
  SelectField,
  Tabs,
  TextAreaField,
  TextField,
} from '../components/ui'
import { PageHeader } from '../components/layout'
import { IconCheck, IconDownload, IconSparks } from '../components/icons'
import styles from './Workspace.module.css'
import showcase from './showcase.module.css'

const LANGUES = [
  'Français',
  'Anglais',
  'Allemand',
  'Espagnol',
  'Italien',
  'Portugais',
  'Polonais',
  'Néerlandais',
]

const SORTIES: Record<string, { objet?: string; corps: string }> = {
  courriel: {
    objet: 'Arrêt planifié de la plateforme de facturation — samedi 4 octobre',
    corps: `Bonjour,

La plateforme de facturation sera indisponible le samedi 4 octobre, de 22 h 00 à 03 h 00 (heure de Paris), pour une mise à niveau de l’infrastructure de stockage.

Ce que cela change pour vous
Aucune saisie ne sera possible pendant l’intervention. Les factures déjà validées restent consultables depuis l’espace d’archives, en lecture seule.

Ce que vous n’avez pas à faire
Aucune action de votre part n’est nécessaire. Les traitements en attente reprendront automatiquement à la remise en service.

En cas de difficulté après le rétablissement, ouvrez un ticket auprès du support en précisant la référence CHG-2481.`,
  },
  intranet: {
    corps: `Facturation : interruption planifiée dans la nuit du 4 au 5 octobre

L’application sera arrêtée samedi 4 octobre de 22 h 00 à 03 h 00 pour une mise à niveau du stockage. L’espace d’archives reste accessible en lecture seule pendant toute la durée de l’intervention.`,
  },
  banniere: {
    corps: `Facturation indisponible samedi 4 octobre, 22 h – 03 h. Archives consultables en lecture seule.`,
  },
  teams: {
    corps: `📌 **Facturation — arrêt planifié**
Samedi 4 octobre, 22 h 00 → 03 h 00 (Paris).
Saisie impossible pendant l’intervention ; archives en lecture seule.
Référence du changement : CHG-2481.`,
  },
}

const CONTROLES = [
  { libelle: 'Ton conforme au gabarit « Changement »', ok: true },
  { libelle: 'Aucune donnée personnelle détectée', ok: true },
  { libelle: 'Horaires et fuseau explicites', ok: true },
  { libelle: 'Action attendue du lecteur formulée', ok: true },
  { libelle: 'Longueur adaptée au canal', ok: true },
]

/*
 * Écran type
 *
 * Cet écran n'est pas une démonstration de composants : c'est une mise
 * en situation. Un système de design ne se juge pas sur une planche de
 * boutons, mais sur ce qu'il donne une fois assemblé en densité réelle.
 */
export function Workspace() {
  const [onglet, setOnglet] = useState('courriel')
  const sortie = SORTIES[onglet]

  return (
    <div className={showcase.page}>
      <PageHeader
        eyebrow="Générateur"
        title="Arrêt planifié — plateforme de facturation"
        description="Brouillon enregistré il y a 3 minutes."
        actions={
          <>
            <Badge tone="success" dot>
              Score 92/100
            </Badge>
            <Button iconStart={<IconDownload />}>Exporter</Button>
            <Button variant="primary" iconStart={<IconSparks />}>
              Régénérer
            </Button>
          </>
        }
      />

      <div className={styles.split}>
        <div className={styles.column}>
          <Panel
            title="Source"
            subtitle="Ce que vous fournissez à ComGen."
            footer={
              <>
                <Button variant="ghost">Vider</Button>
                <Button variant="primary">Analyser</Button>
              </>
            }
          >
            <div className={styles.form}>
              <SelectField label="Gabarit" defaultValue="changement">
                <option value="incident">Incident majeur</option>
                <option value="changement">Changement</option>
                <option value="migration">Migration</option>
                <option value="fin">Fin de service</option>
              </SelectField>

              <TextField
                label="Référence du changement"
                defaultValue="CHG-2481"
                optional
              />

              <TextAreaField
                label="Note technique"
                rows={7}
                defaultValue="Upgrade baie de stockage SAN-04. Fenêtre 04/10 22:00-03:00 CEST. Impact: appli FACT indispo, archives en RO. Rollback prévu si KO à 01:30. Pas d'action utilisateur."
                hint="Le vocabulaire technique n’apparaîtra pas dans la communication produite."
              />
            </div>
          </Panel>

          <Panel title="Langues" subtitle="8 langues, générées en parallèle.">
            <div className={styles.langues}>
              {LANGUES.map((langue, index) => (
                <Badge key={langue} tone={index < 5 ? 'success' : 'default'} dot>
                  {langue}
                </Badge>
              ))}
            </div>
            <div className={styles.progress}>
              <Progress
                label="Traduction"
                value={5}
                max={8}
                valueText="5 langues sur 8"
              />
            </div>
          </Panel>
        </div>

        <div className={styles.column}>
          <Panel
            title="Résultat"
            subtitle="Un contenu par canal, pas un contenu recoupé."
            actions={<Badge tone="accent">Relecture requise</Badge>}
          >
            <Tabs
              label="Canal de diffusion"
              value={onglet}
              onChange={setOnglet}
              items={[
                { id: 'courriel', label: 'Courriel' },
                { id: 'intranet', label: 'Intranet' },
                { id: 'banniere', label: 'Bannière' },
                { id: 'teams', label: 'Teams' },
              ]}
            >
              {sortie.objet && (
                <p className={styles.objet}>
                  <span className={styles.objetLabel}>Objet</span>
                  {sortie.objet}
                </p>
              )}
              <div className={styles.sortie}>{sortie.corps}</div>
            </Tabs>
          </Panel>

          <Panel
            title="Contrôles"
            subtitle="Exécutés à chaque génération."
            flush
          >
            <ul className={styles.controles}>
              {CONTROLES.map((controle) => (
                <li key={controle.libelle} className={styles.controle}>
                  <span className={styles.controleIcone} aria-hidden="true">
                    <IconCheck />
                  </span>
                  <span>{controle.libelle}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  )
}
