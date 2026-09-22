/*
 * Icônes
 *
 * Dessinées sur une grille de 16 avec un trait de 1,4 — la même pour
 * toutes. Un jeu d'icônes qui mélange les épaisseurs se voit
 * immédiatement, même quand chaque icône prise isolément est correcte.
 *
 * Elles sont toujours décoratives : le sens est porté par le texte qui
 * les accompagne, ou par l'`aria-label` du contrôle qui les contient.
 */

import type { ReactNode } from 'react'

type IconProps = { className?: string }

function Icon({ children, className }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function IconSparks(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 2 7.1 5.4 10.5 6.5 7.1 7.6 6 11 4.9 7.6 1.5 6.5 4.9 5.4 6 2Z" />
      <path d="M11.5 9.5 12.1 11.2 13.8 11.8 12.1 12.4 11.5 14.1 10.9 12.4 9.2 11.8 10.9 11.2 11.5 9.5Z" />
    </Icon>
  )
}

export function IconLayers(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1.8 14.3 5 8 8.2 1.7 5 8 1.8Z" />
      <path d="M2.4 8.2 8 11 13.6 8.2" />
      <path d="M2.4 11.3 8 14.1 13.6 11.3" />
    </Icon>
  )
}

export function IconClock(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M8 4.6V8l2.2 1.6" />
    </Icon>
  )
}

export function IconSliders(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 12.8V9.6M3 6.4V3.2M8 12.8V8M8 4.8V3.2M13 12.8v-1.6M13 8V3.2" />
      <path d="M1.6 8h2.8M6.6 6.4h2.8M11.6 9.6h2.8" />
    </Icon>
  )
}

export function IconDocument(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 1.8H4.4a1 1 0 0 0-1 1v10.4a1 1 0 0 0 1 1h7.2a1 1 0 0 0 1-1V5.4L9 1.8Z" />
      <path d="M9 1.8v3.6h3.6" />
      <path d="M5.8 9h4.4M5.8 11.2h3" />
    </Icon>
  )
}

export function IconCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m3 8.4 3.2 3.2L13 4.8" />
    </Icon>
  )
}

export function IconDownload(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 2.6v7.2" />
      <path d="m5 7 3 3 3-3" />
      <path d="M2.8 12.2v.6a1 1 0 0 0 1 1h8.4a1 1 0 0 0 1-1v-.6" />
    </Icon>
  )
}

export function IconPlus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 3.2v9.6M3.2 8h9.6" />
    </Icon>
  )
}

export function IconSearch(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="7.2" cy="7.2" r="4.4" />
      <path d="m10.5 10.5 3 3" />
    </Icon>
  )
}

export function IconInbox(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.2 9.2 4 3.4a1 1 0 0 1 .95-.7h6.1a1 1 0 0 1 .95.7l1.8 5.8" />
      <path d="M2.2 9.2h3.1l.8 1.8h3.8l.8-1.8h3.1v3.1a1 1 0 0 1-1 1H3.2a1 1 0 0 1-1-1V9.2Z" />
    </Icon>
  )
}
