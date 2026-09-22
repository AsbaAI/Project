#!/usr/bin/env node
/*
 * Vérificateur de contraste WCAG.
 *
 * Lit les tokens de couleur, résout les alias, convertit OKLCH en sRGB
 * et calcule le ratio de contraste de chaque paire réellement utilisée
 * dans l'interface. Échoue si une paire passe sous son seuil.
 *
 * Objectif : qu'aucune régression de contraste ne puisse être poussée
 * sans être vue. `npm run check:contrast`
 *
 * Seuils (WCAG 2.2 niveau AA) :
 *   - texte courant          4.5:1
 *   - texte ≥ 18.66px gras
 *     ou ≥ 24px              3:1
 *   - bordures et éléments
 *     d'interface porteurs
 *     de sens (1.4.11)       3:1
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const TOKENS = join(here, '..', 'src', 'styles', 'tokens', 'color.css')

/* ------------------------------------------------------------------ *
 * Conversion couleur : OKLCH → OKLab → LMS → sRGB linéaire → sRGB
 * Matrices de Björn Ottosson (https://bottosson.github.io/posts/oklab/)
 * ------------------------------------------------------------------ */

function oklchToLinearSrgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3

  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

/* Luminance relative selon WCAG 2.x. Les composantes hors gamme sont
 * ramenées dans [0,1] : c'est ce que fait l'écran, donc ce que voit
 * réellement l'utilisateur. */
function relativeLuminance([r, g, b]) {
  const clamp = (v) => Math.min(1, Math.max(0, v))
  const [lr, lg, lb] = [clamp(r), clamp(g), clamp(b)]
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

function contrastRatio(colorA, colorB) {
  const la = relativeLuminance(colorA)
  const lb = relativeLuminance(colorB)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/* Compose une couleur semi-transparente sur un fond opaque. */
function composite(fg, alpha, bg) {
  return fg.map((c, i) => c * alpha + bg[i] * (1 - alpha))
}

/* ------------------------------------------------------------------ *
 * Lecture des tokens
 * ------------------------------------------------------------------ */

const OKLCH = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)/
const DECL = /^\s*(--[\w-]+)\s*:\s*(.+?)\s*;/gm

/*
 * Un bloc de tokens = un thème. On isole les déclarations par sélecteur
 * pour que `--color-text-primary` du thème sombre n'écrase pas celui du
 * thème clair.
 */
function parseThemes(css) {
  // Retire les commentaires : ils contiennent des exemples de couleurs.
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')

  const palette = {}
  const themes = { light: {}, dark: {} }

  // Chaque bloc `sélecteur { ... }` de premier niveau utile.
  const blocks = [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)]

  for (const [, rawSelector, body] of blocks) {
    const selector = rawSelector.trim()
    const decls = {}
    for (const [, name, value] of body.matchAll(DECL)) decls[name] = value

    const isDark =
      selector.includes("data-theme='dark'") ||
      selector.includes(":not([data-theme='light'])")
    const isLight =
      !isDark &&
      (selector === ':root' ||
        selector.includes(':root') ||
        selector.includes("data-theme='light'"))

    for (const [name, value] of Object.entries(decls)) {
      if (name.startsWith('--p-')) palette[name] = value
      else if (isDark) themes.dark[name] = value
      else if (isLight) themes.light[name] = value
    }
  }

  // Le thème sombre n'hérite pas : il redéfinit tout ce qu'il change,
  // mais retombe sur le thème clair pour le reste.
  themes.dark = { ...themes.light, ...themes.dark }
  return { palette, themes }
}

/* Résout un token jusqu'à une valeur oklch(), en suivant les var(). */
function resolve(token, theme, palette, seen = new Set()) {
  if (seen.has(token)) throw new Error(`Référence circulaire : ${token}`)
  seen.add(token)

  const raw = theme[token] ?? palette[token]
  if (raw === undefined) throw new Error(`Token introuvable : ${token}`)

  const alias = raw.match(/var\(\s*(--[\w-]+)\s*\)/)
  if (alias) return resolve(alias[1], theme, palette, seen)

  const m = raw.match(OKLCH)
  if (!m) throw new Error(`Valeur non convertible pour ${token} : ${raw}`)

  const [, L, C, H, A] = m
  return {
    rgb: oklchToLinearSrgb(Number(L), Number(C), Number(H)),
    alpha: A === undefined ? 1 : Number(A),
  }
}

/* ------------------------------------------------------------------ *
 * Paires vérifiées
 *
 * Chacune correspond à une combinaison qui existe vraiment dans
 * l'interface. Ajouter un composant qui introduit une nouvelle paire
 * veut dire l'ajouter ici.
 * ------------------------------------------------------------------ */

/*
 * Aucun seuil « grand texte » (3:1) n'apparaît ici, et c'est volontaire :
 * aucune couleur du système ne repose sur cette dérogation. Tout ce qui
 * est du texte est tenu à 4,5:1, quelle que soit sa taille.
 */
const AA_TEXT = 4.5
const AA_UI = 3

const PAIRS = [
  // Texte sur les trois surfaces
  ['--color-text-primary', '--color-surface-base', AA_TEXT, 'Texte principal / fond'],
  ['--color-text-primary', '--color-surface-raised', AA_TEXT, 'Texte principal / panneau'],
  ['--color-text-primary', '--color-surface-sunken', AA_TEXT, 'Texte principal / zone enfoncée'],
  ['--color-text-secondary', '--color-surface-base', AA_TEXT, 'Texte secondaire / fond'],
  ['--color-text-secondary', '--color-surface-raised', AA_TEXT, 'Texte secondaire / panneau'],
  ['--color-text-tertiary', '--color-surface-base', AA_TEXT, 'Texte tertiaire / fond'],
  ['--color-text-tertiary', '--color-surface-raised', AA_TEXT, 'Texte tertiaire / panneau'],
  ['--color-text-accent', '--color-surface-raised', AA_TEXT, 'Texte accentué / panneau'],
  ['--color-text-link', '--color-surface-base', AA_TEXT, 'Lien / fond'],

  // Actions : le libellé sur son propre aplat, dans chacun de ses états
  ['--color-on-action', '--color-action-bg', AA_TEXT, 'Libellé bouton principal'],
  ['--color-on-action', '--color-action-bg-hover', AA_TEXT, 'Libellé bouton principal (survol)'],
  ['--color-on-action', '--color-action-bg-active', AA_TEXT, 'Libellé bouton principal (pressé)'],
  ['--color-on-danger', '--color-danger-bg', AA_TEXT, 'Libellé bouton destructif'],
  ['--color-on-danger', '--color-danger-bg-hover', AA_TEXT, 'Libellé bouton destructif (survol)'],
  ['--color-on-danger', '--color-danger-bg-active', AA_TEXT, 'Libellé bouton destructif (pressé)'],
  ['--color-text-inverse', '--color-surface-inverse', AA_TEXT, 'Texte inversé / surface inversée'],

  // États : texte sur son fond teinté
  ['--color-success-text', '--color-success-surface', AA_TEXT, 'Texte succès / fond succès'],
  ['--color-warning-text', '--color-warning-surface', AA_TEXT, 'Texte alerte / fond alerte'],
  ['--color-danger-text', '--color-danger-surface', AA_TEXT, 'Texte erreur / fond erreur'],
  ['--color-text-accent', '--color-accent-surface', AA_TEXT, 'Texte accentué / fond accentué'],

  // Éléments d'interface porteurs de sens — WCAG 1.4.11
  //
  // Seules les bordures FONCTIONNELLES figurent ici. `--color-border-subtle`
  // et `--color-border-default` sont décoratives : elles séparent, elles
  // n'identifient pas un contrôle, et la norme ne leur impose rien.
  ['--color-border-control', '--color-surface-raised', AA_UI, 'Bordure de champ / panneau'],
  ['--color-border-control', '--color-surface-base', AA_UI, 'Bordure de champ / fond'],
  ['--color-border-control-hover', '--color-surface-raised', AA_UI, 'Bordure de champ (survol) / panneau'],
  ['--color-border-strong', '--color-surface-base', AA_UI, 'Bordure forte / fond'],
  ['--color-focus-ring', '--color-surface-base', AA_UI, 'Anneau de focus / fond'],
  ['--color-focus-ring', '--color-surface-raised', AA_UI, 'Anneau de focus / panneau'],
  ['--color-action-bg', '--color-surface-raised', AA_UI, 'Aplat d’action / panneau'],
  ['--color-success-solid', '--color-surface-raised', AA_UI, 'Indicateur succès / panneau'],
  ['--color-warning-solid', '--color-surface-raised', AA_UI, 'Indicateur alerte / panneau'],
  ['--color-danger-solid', '--color-surface-raised', AA_UI, 'Indicateur erreur / panneau'],

  // Texte désactivé : seuil abaissé, WCAG exempte les contrôles inactifs
  // (1.4.3). Vérifié quand même pour qu'il reste perceptible.
  ['--color-text-disabled', '--color-surface-raised', 2, 'Texte désactivé / panneau'],
]

/* ------------------------------------------------------------------ */

const css = readFileSync(TOKENS, 'utf8')
const { palette, themes } = parseThemes(css)

let failures = 0
let checks = 0

for (const themeName of ['light', 'dark']) {
  const theme = themes[themeName]
  const label = themeName === 'light' ? 'THÈME CLAIR' : 'THÈME SOMBRE'

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

    // Une couleur d'avant-plan translucide est composée sur son fond.
    const fgRgb = fg.alpha < 1 ? composite(fg.rgb, fg.alpha, bg.rgb) : fg.rgb
    const ratio = contrastRatio(fgRgb, bg.rgb)
    const ok = ratio >= threshold
    if (!ok) failures += 1

    const mark = ok ? 'ok  ' : 'ÉCHEC'
    const value = ratio.toFixed(2).padStart(5)
    console.log(
      `  ${mark}  ${value}:1  (min ${threshold})  ${description}`,
    )
  }
}

console.log('\n' + '═'.repeat(74))
if (failures > 0) {
  console.error(
    `${failures} paire(s) sous le seuil sur ${checks} vérifiée(s).\n` +
      `Corriger les tokens dans src/styles/tokens/color.css.`,
  )
  process.exit(1)
}
console.log(`${checks} paires vérifiées, toutes conformes WCAG 2.2 AA.`)
