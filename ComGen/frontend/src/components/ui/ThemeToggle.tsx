import { useId } from 'react'
import type { ReactElement } from 'react'
import styles from './ThemeToggle.module.css'
import { useTheme, type ThemePreference } from '../../lib/theme'

const OPTIONS: {
  value: ThemePreference
  label: string
  icon: ReactElement
}[] = [
  {
    value: 'system',
    label: 'Système',
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2" y="3" width="12" height="8" rx="1.5" />
        <path d="M6 13.5h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'light',
    label: 'Clair',
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="3" />
        <path
          d="M8 1.5v1.2M8 13.3v1.2M14.5 8h-1.2M2.7 8H1.5M12.6 3.4l-.85.85M4.25 11.75l-.85.85M12.6 12.6l-.85-.85M4.25 4.25l-.85-.85"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Sombre',
    icon: (
      <svg viewBox="0 0 16 16" className={styles.solid} aria-hidden="true">
        <path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8Z" />
      </svg>
    ),
  },
]

/*
 * Sélecteur de thème
 *
 * Construit sur de vrais boutons radio : le groupe se parcourt aux
 * flèches, une seule tabulation y entre, et l'état sélectionné est
 * annoncé — tout cela sans une ligne de JavaScript. Reproduire ce
 * comportement avec des <button> coûterait trente lignes et un bug.
 */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme()
  const name = useId()

  return (
    <fieldset className={styles.group}>
      <legend className="visually-hidden">Thème de l’interface</legend>

      {OPTIONS.map((option) => (
        <label key={option.value} className={styles.option}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={preference === option.value}
            onChange={() => setPreference(option.value)}
            className={styles.input}
          />
          <span className={styles.face} title={option.label}>
            {option.icon}
            <span className="visually-hidden">{option.label}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}
