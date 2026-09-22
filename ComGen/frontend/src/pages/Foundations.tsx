import { Panel } from '../components/ui'
import { PageHeader } from '../components/layout'
import styles from './showcase.module.css'

const SURFACES = [
  ['--color-surface-base', 'Fond de l’application'],
  ['--color-surface-raised', 'Panneaux, champs, menus'],
  ['--color-surface-sunken', 'Creux : pistes, en-têtes de tableau'],
  ['--color-surface-selected', 'Élément sélectionné'],
  ['--color-surface-inverse', 'Infobulles, bandeaux inversés'],
]

const TEXT = [
  ['--color-text-primary', 'Contenu'],
  ['--color-text-secondary', 'Libellés'],
  ['--color-text-tertiary', 'Aides, métadonnées'],
  ['--color-text-accent', 'Liens, éléments actifs'],
  ['--color-text-disabled', 'Contrôle neutralisé'],
]

const STATUS = [
  ['--color-action-bg', 'Action principale'],
  ['--color-success-solid', 'Succès'],
  ['--color-warning-solid', 'Vigilance'],
  ['--color-danger-solid', 'Erreur, destruction'],
  ['--color-border-control', 'Bordure de contrôle — 3:1 garanti'],
]

const TYPE_SCALE = [
  ['--text-display', '--text-display-lh', 'Générer une communication'],
  ['--text-2xl', '--text-2xl-lh', 'Générer une communication'],
  ['--text-xl', '--text-xl-lh', 'Générer une communication'],
  ['--text-lg', '--text-lg-lh', 'Générer une communication'],
  ['--text-md', '--text-md-lh', 'Générer une communication'],
  ['--text-base', '--text-base-lh', 'Générer une communication'],
  ['--text-sm', '--text-sm-lh', 'Générer une communication'],
  ['--text-xs', '--text-xs-lh', 'Générer une communication'],
  ['--text-2xs', '--text-2xs-lh', 'GÉNÉRER UNE COMMUNICATION'],
]

const SPACE_SCALE = [
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--space-6',
  '--space-8',
  '--space-12',
  '--space-16',
]

const RADII = ['--radius-xs', '--radius-sm', '--radius-md', '--radius-lg']
const SHADOWS = ['--shadow-sm', '--shadow-md', '--shadow-lg']

function Swatches({ tokens }: { tokens: string[][] }) {
  return (
    <div className={styles.swatches}>
      {tokens.map(([token, role]) => (
        <div key={token} className={styles.swatch}>
          <div
            className={styles.swatchChip}
            style={{ backgroundColor: `var(${token})` }}
          />
          <span className={styles.swatchName}>{token}</span>
          <span className={styles.swatchRole}>{role}</span>
        </div>
      ))}
    </div>
  )
}

export function Foundations() {
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Système de design"
        title="Fondations"
        description="Les jetons sont la seule source de vérité : aucun composant ne contient de couleur, de taille ou de durée écrite en dur. Changer un thème revient à redéfinir une liste de variables, jamais à reprendre des composants."
      />

      <div className={styles.stack}>
        <Panel
          title="Surfaces"
          subtitle="Deux niveaux suffisent : le fond, et ce qui est posé dessus."
        >
          <Swatches tokens={SURFACES} />
        </Panel>

        <Panel
          title="Texte"
          subtitle="Trois niveaux de hiérarchie, tous contrôlés à 4,5:1 minimum."
        >
          <Swatches tokens={TEXT} />
          <p className={styles.note} style={{ marginBlockStart: 'var(--space-4)' }}>
            Les rapports de contraste ne sont pas vérifiés à l’œil :
            <code> npm run check:contrast </code>
            calcule les 62 couples utilisés dans l’interface, sur les deux
            thèmes, et échoue si l’un d’eux passe sous le seuil WCAG 2.2 AA.
          </p>
        </Panel>

        <Panel
          title="État et action"
          subtitle="La couleur souligne l’information, elle ne la porte jamais seule."
        >
          <Swatches tokens={STATUS} />
        </Panel>

        <Panel
          title="Échelle typographique"
          subtitle="Chaque corps est apparié à son interligne : les deux ne se règlent jamais séparément."
        >
          {TYPE_SCALE.map(([size, lh, sample]) => (
            <div key={size} className={styles.specimen}>
              <span className={styles.specimenMeta}>{size}</span>
              <span
                className={styles.specimenText}
                style={{
                  fontSize: `var(${size})`,
                  lineHeight: `var(${lh})`,
                  letterSpacing:
                    size === '--text-2xs'
                      ? 'var(--tracking-caps)'
                      : 'var(--tracking-snug)',
                  fontWeight:
                    size === '--text-2xs'
                      ? 'var(--weight-semibold)'
                      : undefined,
                }}
              >
                {sample}
              </span>
            </div>
          ))}
        </Panel>

        <div className={styles.cols2}>
          <Panel
            title="Espacement"
            subtitle="Grille de 4 px. Aucune valeur intermédiaire n’est admise."
          >
            <div className={styles.stack} style={{ gap: 'var(--space-2)' }}>
              {SPACE_SCALE.map((token) => (
                <div key={token} className={styles.scaleRow}>
                  <span>{token.replace('--space-', '')}</span>
                  <span>
                    {Number(token.replace('--space-', '')) * 4}
                    px
                  </span>
                  <span
                    className={styles.scaleBar}
                    style={{ inlineSize: `var(${token})` }}
                  />
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Formes et élévation"
            subtitle="Rayons impairs, ombres en deux couches."
          >
            <div className={styles.row}>
              {RADII.map((token) => (
                <div key={token} className={styles.shapeCard}>
                  <div
                    className={styles.shapeSample}
                    style={{ borderRadius: `var(${token})` }}
                  />
                  <span className={styles.shapeLabel}>
                    {token.replace('--radius-', '')}
                  </span>
                </div>
              ))}
            </div>

            <div
              className={styles.row}
              style={{ marginBlockStart: 'var(--space-4)' }}
            >
              {SHADOWS.map((token) => (
                <div key={token} className={styles.shapeCard}>
                  <div
                    className={styles.shapeSample}
                    style={{
                      borderRadius: 'var(--radius-md)',
                      borderColor: 'transparent',
                      boxShadow: `var(${token})`,
                    }}
                  />
                  <span className={styles.shapeLabel}>
                    {token.replace('--shadow-', '')}
                  </span>
                </div>
              ))}
            </div>

            <p
              className={styles.note}
              style={{ marginBlockStart: 'var(--space-4)' }}
            >
              L’ombre est réservée à ce qui sort du plan — menu, dialogue,
              segment actif. Les panneaux sont délimités par une bordure :
              quand tout flotte, plus rien ne ressort.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  )
}
