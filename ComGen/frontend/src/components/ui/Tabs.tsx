import { useId, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import styles from './Tabs.module.css'
import { cx } from '../../lib/cx'

export type TabItem = {
  id: string
  label: ReactNode
  /** Compteur ou état affiché après le libellé. */
  trailing?: ReactNode
  disabled?: boolean
}

export type TabsProps = {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  /** Nom du groupe d'onglets, annoncé par les lecteurs d'écran. */
  label: string
  /** Le panneau associé à l'onglet actif. */
  children?: ReactNode
  className?: string
}

/*
 * Onglets
 *
 * Le motif WAI-ARIA impose un comportement clavier précis, et c'est lui
 * qui distingue de vrais onglets d'une rangée de boutons : une seule
 * tabulation entre dans le groupe, puis les flèches circulent entre les
 * onglets. Sans cela, un groupe de huit onglets impose huit tabulations
 * avant d'atteindre le contenu.
 */
export function Tabs({
  items,
  value,
  onChange,
  label,
  children,
  className,
}: TabsProps) {
  const baseId = useId()
  const listRef = useRef<HTMLDivElement>(null)

  const tabId = (id: string) => `${baseId}-tab-${id}`
  const panelId = (id: string) => `${baseId}-panel-${id}`

  const focusTab = (id: string) => {
    onChange(id)
    // Le focus suit la sélection : c'est le mode « activation
    // automatique », adapté quand changer d'onglet ne coûte rien.
    listRef.current
      ?.querySelector<HTMLButtonElement>(`[data-tab-id="${id}"]`)
      ?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const enabled = items.filter((item) => !item.disabled)
    if (enabled.length === 0) return

    const current = enabled.findIndex((item) => item.id === value)
    let next = -1

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (current + 1) % enabled.length
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (current - 1 + enabled.length) % enabled.length
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = enabled.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    focusTab(enabled[next].id)
  }

  return (
    <div className={cx(styles.tabs, className)}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        className={styles.list}
        onKeyDown={handleKeyDown}
      >
        {items.map((item) => {
          const selected = item.id === value

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={tabId(item.id)}
              data-tab-id={item.id}
              aria-selected={selected}
              aria-controls={children ? panelId(item.id) : undefined}
              /* Roving tabindex : un seul onglet est atteignable à la
                 tabulation, les flèches font le reste. */
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              className={cx(styles.tab, selected && styles.tabSelected)}
              onClick={() => onChange(item.id)}
            >
              <span className={styles.tabLabel}>{item.label}</span>
              {item.trailing && (
                <span className={styles.tabTrailing}>{item.trailing}</span>
              )}
            </button>
          )
        })}
      </div>

      {children && (
        <div
          role="tabpanel"
          id={panelId(value)}
          aria-labelledby={tabId(value)}
          /* Le panneau est focalisable : après les flèches, la
             tabulation suivante amène directement dans le contenu. */
          tabIndex={0}
          className={styles.panel}
        >
          {children}
        </div>
      )}
    </div>
  )
}
