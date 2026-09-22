import type { ReactNode } from 'react'
import styles from './AppShell.module.css'

export type AppShellProps = {
  /** Marque ou nom du produit, à gauche de l'en-tête. */
  brand: ReactNode
  /** Actions de droite : recherche, thème, compte. */
  headerActions?: ReactNode
  /** Navigation principale. Absente, le contenu occupe toute la largeur. */
  sidebar?: ReactNode
  children: ReactNode
}

const MAIN_ID = 'contenu-principal'

/*
 * Charpente de l'application
 *
 * En-tête fixe, colonne de navigation, zone de contenu qui défile
 * seule. Le lien d'évitement est le premier élément focalisable de la
 * page : sans lui, atteindre le contenu au clavier impose de traverser
 * toute la navigation à chaque changement d'écran.
 */
export function AppShell({
  brand,
  headerActions,
  sidebar,
  children,
}: AppShellProps) {
  return (
    <div className={styles.shell}>
      <a className="skip-link" href={`#${MAIN_ID}`}>
        Aller au contenu
      </a>

      <header className={styles.header}>
        <div className={styles.brand}>{brand}</div>
        {headerActions && <div className={styles.actions}>{headerActions}</div>}
      </header>

      <div className={styles.body}>
        {sidebar && (
          <nav className={styles.sidebar} aria-label="Navigation principale">
            {sidebar}
          </nav>
        )}

        <main id={MAIN_ID} className={styles.main} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  )
}
