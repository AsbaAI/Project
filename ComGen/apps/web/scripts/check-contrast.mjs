#!/usr/bin/env node
/*
 * Vérificateur de contraste WCAG 2.2 AA — `pnpm check:contrast`.
 *
 * Lit `src/styles/tokens/color.css`, résout les alias `var()`, convertit
 * OKLCH en sRGB et calcule le ratio de contraste de chaque couple de jetons
 * réellement employé dans l'interface, dans les deux thèmes. Échoue si un
 * couple passe sous son seuil, ou si le bloc « sombre forcé »
 * (`[data-theme='dark']`) diverge du bloc `@media (prefers-color-scheme:
 * dark)` — les deux doivent rester identiques, une règle `@media` ne
 * pouvant pas être réutilisée par un sélecteur.
 *
 * Seuils :
 *   - texte, quelle que soit sa taille        4,5:1  (1.4.3 ; aucune
 *     couleur du système ne repose sur la dérogation « grand texte »)
 *   - bordures et indicateurs porteurs de sens 3:1    (1.4.11)
 *   - texte désactivé                          2:1    (exempté par 1.4.3 ;
 *     vérifié quand même pour rester perceptible)
 *
 * Ajouter un composant qui introduit un nouveau couple = l'ajouter ici.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const TOKENS = join(here, '..', 'src', 'styles', 'tokens', 'color.css')

/* ------------------------------------------------------------------ *
 * Conversion couleur : OKLCH → OKLab → LMS → sRGB linéaire
 * Matrices de Björn Ottosson (https://bottosson.github.io/posts/oklab/)
 * ------------------------------------------------------------------ */

function oklchToLinearSrgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)

  const lRacine = L + 0.3963377774 * a + 0.2158037573 * b
  const mRacine = L - 0.1055613458 * a - 0.0638541728 * b
  const sRacine = L - 0.0894841775 * a - 1.291485548 * b

  const l = lRacine ** 3
  const m = mRacine ** 3
  const s = sRacine ** 3

  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

/* Luminance relative (WCAG 2.x). Les composantes hors gamme sont ramenées
 * dans [0,1] : c'est ce que fait l'écran, donc ce que voit l'utilisateur. */
const clamp = (v) => Math.min(1, Math.max(0, v))

function relativeLuminance([r, g, b]) {
  return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(b)
}

function contrastRatio(a, b) {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/* Compose une couleur translucide sur un fond opaque. */
function composite(fg, alpha, bg) {
  return fg.map((c, i) => c * alpha + bg[i] * (1 - alpha))
}

/* ------------------------------------------------------------------ *
 * Lecture des jetons
 * ------------------------------------------------------------------ */

const OKLCH = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)/
const DECL = /(--[\w-]+)\s*:\s*([^;]+?)\s*;/g

/**
 * Isole les déclarations par sélecteur : palette (`--p-*`), thème clair,
 * thème sombre via `@media`, thème sombre forcé via `[data-theme='dark']`.
 */
function parseThemes(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const palette = {}
  const light = {}
  const darkMedia = {}
  const darkForced = {}

  for (const [, rawSelector, body] of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = rawSelector.trim()
    let target
    if (selector.includes(":not([data-theme='light'])")) target = darkMedia
    else if (selector.includes("data-theme='dark'")) target = darkForced
    else if (selector.includes(':root')) target = light
    else continue

    for (const [, name, value] of body.matchAll(DECL)) {
      if (name.startsWith('--p-')) palette[name] = value
      else target[name] = value
    }
  }

  return { palette, light, darkMedia, darkForced }
}

/** Résout un jeton jusqu'à une valeur `oklch()`, en suivant les `var()`. */
function resolve(token, theme, palette, seen = new Set()) {
  if (seen.has(token)) throw new Error(`Référence circulaire : ${token}`)
  seen.add(token)

  const raw = theme[token] ?? palette[token]
  if (raw === undefined) throw new Error(`Jeton introuvable : ${token}`)

  const alias = raw.match(/var\(\s*(--[\w-]+)\s*\)/)
  if (alias) return resolve(alias[1], theme, palette, seen)

  const m = raw.match(OKLCH)
  if (!m) throw new Error(`Valeur non convertible pour ${token} : ${raw}`)

  const [, L, C, H, A] = m
  return { rgb: oklchToLinearSrgb(Number(L), Number(C), Number(H)), alpha: A ? Number(A) : 1 }
}

/* ------------------------------------------------------------------ *
 * Couples vérifiés — chacun existe dans un composant livré.
 * ------------------------------------------------------------------ */

const TEXTE = 4.5
const UI = 3
const INACTIF = 2

const PAIRS = [
  // Encre sur les surfaces neutres
  ['--color-ink-primary', '--color-surface-base', TEXTE, 'Texte principal / fond'],
  ['--color-ink-primary', '--color-surface-raised', TEXTE, 'Texte principal / panneau'],
  ['--color-ink-primary', '--color-surface-sunken', TEXTE, 'Texte principal / zone enfoncée'],
  ['--color-ink-primary', '--color-surface-overlay', TEXTE, 'Texte principal / tiroir'],
  [
    '--color-ink-primary',
    '--color-surface-selected',
    TEXTE,
    'Texte principal / ligne sélectionnée',
  ],
  ['--color-ink-secondary', '--color-surface-base', TEXTE, 'Texte secondaire / fond'],
  ['--color-ink-secondary', '--color-surface-raised', TEXTE, 'Texte secondaire / panneau'],
  [
    '--color-ink-secondary',
    '--color-surface-sunken',
    TEXTE,
    'Texte secondaire / en-tête de tableau',
  ],
  ['--color-ink-secondary', '--color-surface-overlay', TEXTE, 'Texte secondaire / tiroir'],
  [
    '--color-ink-secondary',
    '--color-surface-selected',
    TEXTE,
    'Texte secondaire / ligne sélectionnée',
  ],
  ['--color-ink-tertiary', '--color-surface-base', TEXTE, 'Texte tertiaire / fond'],
  [
    '--color-ink-tertiary',
    '--color-surface-raised',
    TEXTE,
    'Texte tertiaire, aide, placeholder / panneau',
  ],
  ['--color-ink-tertiary', '--color-surface-sunken', TEXTE, 'Texte tertiaire / zone enfoncée'],
  [
    '--color-ink-tertiary',
    '--color-surface-selected',
    TEXTE,
    'Texte tertiaire / ligne sélectionnée',
  ],
  ['--color-ink-accent', '--color-surface-base', TEXTE, 'Texte accentué / fond'],
  ['--color-ink-accent', '--color-surface-raised', TEXTE, 'Texte accentué / panneau'],
  ['--color-ink-accent', '--color-surface-selected', TEXTE, 'Élément de navigation courant'],
  ['--color-ink-link', '--color-surface-base', TEXTE, 'Lien / fond'],
  ['--color-ink-link', '--color-surface-raised', TEXTE, 'Lien / panneau'],
  ['--color-ink-inverse', '--color-surface-inverse', TEXTE, 'Texte inversé / surface inversée'],

  // Actions : le libellé sur son propre aplat, dans chaque état
  ['--color-on-action', '--color-action', TEXTE, 'Libellé du bouton principal'],
  ['--color-on-action', '--color-action-hover', TEXTE, 'Libellé du bouton principal (survol)'],
  ['--color-on-action', '--color-action-active', TEXTE, 'Libellé du bouton principal (pressé)'],
  ['--color-on-danger', '--color-danger-action', TEXTE, 'Libellé du bouton destructif'],
  [
    '--color-on-danger',
    '--color-danger-action-hover',
    TEXTE,
    'Libellé du bouton destructif (survol)',
  ],
  [
    '--color-on-danger',
    '--color-danger-action-active',
    TEXTE,
    'Libellé du bouton destructif (pressé)',
  ],

  // États : texte sur son fond teinté (badges, messages)
  ['--color-success-ink', '--color-success-bg', TEXTE, 'Texte succès / fond succès'],
  ['--color-warning-ink', '--color-warning-bg', TEXTE, 'Texte alerte / fond alerte'],
  ['--color-danger-ink', '--color-danger-bg', TEXTE, 'Texte erreur / fond erreur'],
  ['--color-ink-accent', '--color-accent-bg', TEXTE, 'Texte accentué / fond accentué'],
  ['--color-ink-primary', '--color-success-bg', TEXTE, 'Corps de message / fond succès'],
  ['--color-ink-primary', '--color-warning-bg', TEXTE, 'Corps de message / fond alerte'],
  ['--color-ink-primary', '--color-danger-bg', TEXTE, 'Corps de message / fond erreur'],
  ['--color-ink-primary', '--color-accent-bg', TEXTE, 'Corps de message / fond accentué'],
  ['--color-ink-secondary', '--color-success-bg', TEXTE, 'Détail de message / fond succès'],
  ['--color-ink-secondary', '--color-warning-bg', TEXTE, 'Détail de message / fond alerte'],
  ['--color-ink-secondary', '--color-danger-bg', TEXTE, 'Détail de message / fond erreur'],
  ['--color-ink-secondary', '--color-accent-bg', TEXTE, 'Détail de message / fond accentué'],
  ['--color-danger-ink', '--color-surface-raised', TEXTE, 'Message d’erreur de champ / panneau'],
  ['--color-danger-ink', '--color-surface-base', TEXTE, 'Message d’erreur de champ / fond'],

  // Éléments d'interface porteurs de sens — WCAG 1.4.11.
  // Seules les bordures FONCTIONNELLES figurent ici : `line-subtle` et
  // `line-default` séparent, elles n'identifient pas un contrôle.
  ['--color-line-control', '--color-surface-raised', UI, 'Bordure de champ / panneau'],
  ['--color-line-control', '--color-surface-base', UI, 'Bordure de champ / fond'],
  [
    '--color-line-control-hover',
    '--color-surface-raised',
    UI,
    'Bordure de champ (survol) / panneau',
  ],
  ['--color-line-strong', '--color-surface-base', UI, 'Bordure forte / fond'],
  ['--color-line-accent', '--color-surface-raised', UI, 'Bordure de champ focalisé / panneau'],
  ['--color-focus', '--color-surface-base', UI, 'Anneau de focus / fond'],
  ['--color-focus', '--color-surface-raised', UI, 'Anneau de focus / panneau'],
  ['--color-focus', '--color-surface-sunken', UI, 'Anneau de focus / zone enfoncée'],
  ['--color-action', '--color-surface-raised', UI, 'Aplat d’action, onglet actif / panneau'],
  ['--color-action', '--color-surface-base', UI, 'Aplat d’action / fond'],
  ['--color-danger-action', '--color-surface-raised', UI, 'Aplat destructif / panneau'],
  ['--color-success-solid', '--color-surface-raised', UI, 'Indicateur succès / panneau'],
  ['--color-warning-solid', '--color-surface-raised', UI, 'Indicateur alerte / panneau'],
  [
    '--color-danger-solid',
    '--color-surface-raised',
    UI,
    'Indicateur erreur, bordure invalide / panneau',
  ],
  ['--color-success-ink', '--color-surface-raised', UI, 'Icône succès / panneau'],
  ['--color-warning-ink', '--color-surface-raised', UI, 'Icône alerte / panneau'],
  ['--color-danger-ink', '--color-danger-bg', UI, 'Icône bloquante / fond erreur'],
  ['--color-ink-tertiary', '--color-surface-sunken', UI, 'Icône d’état vide / zone enfoncée'],

  // Texte désactivé : seuil abaissé (contrôle inactif, 1.4.3)
  ['--color-ink-disabled', '--color-surface-raised', INACTIF, 'Texte désactivé / panneau'],
  ['--color-ink-disabled', '--color-surface-sunken', INACTIF, 'Texte désactivé / champ désactivé'],
  ['--color-ink-disabled', '--color-surface-base', INACTIF, 'Texte désactivé / fond'],
]

/* ------------------------------------------------------------------ */

const css = readFileSync(TOKENS, 'utf8')
const { palette, light, darkMedia, darkForced } = parseThemes(css)

let failures = 0
let checks = 0

/* 1. Les deux blocs sombres sont identiques. */
console.log('COHÉRENCE DES DEUX BLOCS SOMBRES')
console.log('─'.repeat(74))
const names = new Set([...Object.keys(darkMedia), ...Object.keys(darkForced)])
for (const name of [...names].toSorted()) {
  checks += 1
  const a = darkMedia[name]
  const b = darkForced[name]
  if (a === b) continue
  failures += 1
  console.log(
    `  ÉCHEC  ${name}\n         @media : ${a ?? '(absent)'}\n         forcé  : ${b ?? '(absent)'}`,
  )
}
if (failures === 0)
  console.log(`  ok     ${names.size} jetons identiques dans @media et [data-theme='dark']`)

/* 2. Les couples, dans chaque thème. Le sombre n'hérite pas : il redéfinit
 * ce qu'il change et retombe sur le clair pour le reste. */
const themes = { 'THÈME CLAIR': light, 'THÈME SOMBRE': { ...light, ...darkMedia } }

for (const [label, theme] of Object.entries(themes)) {
  console.log(`\n${label}`)
  console.log('─'.repeat(74))

  for (const [fgToken, bgToken, threshold, description] of PAIRS) {
    checks += 1
    let fg
    let bg
    try {
      fg = resolve(fgToken, theme, palette)
      bg = resolve(bgToken, theme, palette)
    } catch (error) {
      console.log(`  ERREUR  ${description} — ${error.message}`)
      failures += 1
      continue
    }

    // Un fond translucide est composé sur la surface de base ; un avant-plan
    // translucide, sur son fond.
    const bgRgb =
      bg.alpha < 1
        ? composite(bg.rgb, bg.alpha, resolve('--color-surface-base', theme, palette).rgb)
        : bg.rgb
    const fgRgb = fg.alpha < 1 ? composite(fg.rgb, fg.alpha, bgRgb) : fg.rgb
    const ratio = contrastRatio(fgRgb, bgRgb)
    const ok = ratio >= threshold
    if (!ok) failures += 1

    console.log(
      `  ${ok ? 'ok   ' : 'ÉCHEC'}  ${ratio.toFixed(2).padStart(5)}:1  (min ${threshold})  ${description}`,
    )
  }
}

console.log(`\n${'═'.repeat(74)}`)
if (failures > 0) {
  console.error(
    `${failures} vérification(s) en échec sur ${checks}.\nCorriger les jetons dans src/styles/tokens/color.css.`,
  )
  process.exit(1)
}
console.log(`${checks} vérifications, toutes conformes WCAG 2.2 AA.`)
