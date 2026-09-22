# ComGen — frontend (prototype du système de design)

Vitrine du système de design de ComGen : jetons, composants, et un écran
type en situation. Construit avec React 19, TypeScript et Vite, sans
bibliothèque de composants — chaque composant est écrit et possédé ici.

> État : prototype de design antérieur à la spécification complète de
> l'application. Les jetons (`src/styles/tokens/`), la vérification de
> contraste (`scripts/check-contrast.mjs`) et les décisions de composants
> sont la base à reporter dans la pile définitive.

## Commandes

```bash
npm install
npm run dev              # serveur de développement
npm run check            # typecheck + lint + contraste WCAG
npm run build            # tsc -b && vite build
npm run check:contrast   # 62 couples de couleurs, deux thèmes, seuil AA
```

## Organisation

```
src/
  styles/            couches CSS (@layer) : reset, tokens, base, layout, components, utilities
  styles/tokens/     couleur (OKLCH), typographie, espacement, forme, mouvement
  components/ui/     Button, Field, Panel, Badge, Table, Tabs, Progress, EmptyState, ThemeToggle
  components/layout/ AppShell, NavItem, PageHeader
  pages/             vitrine : Atelier (écran type), Fondations, Composants
  lib/               cx, thème
```

## Règles tenues

- Aucune couleur, taille ou durée écrite en dur dans un composant : tout
  passe par les jetons.
- Deux thèmes (clair, sombre, suivi du système), contraste vérifié par le
  script et non estimé.
- Accessibilité intégrée aux composants : onglets au clavier (roving
  tabindex), champs câblés (`aria-describedby`, `aria-invalid`), bouton
  icône sans `aria-label` refusé à la compilation.
- `prefers-reduced-motion` respecté (durées à 1 ms, indicateurs en pulsation).

## Polices

Les polices sont actuellement chargées depuis Google Fonts. Dans un
environnement sans accès réseau sortant, le navigateur retombe sur la
pile système — le rendu reste correct. La cible est l'auto-hébergement
(Fontsource), qui supprime cette dépendance.
