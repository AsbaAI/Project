# Journal de décisions

Chaque choix technique ou visuel **non dicté par la spécification** est
consigné ici en deux lignes, avec sa raison. Les substitutions d'outils
de la section 14.3 y figurent obligatoirement.

Format : date — décision — raison. Ordre chronologique.

---

## 2026-09-22 — Cadrage

**Emplacement du dépôt.** ComGen vit dans `ComGen/` du dépôt
`AsbaAI/Project`, pas dans un dépôt dédié : la création de dépôt est
bloquée par le proxy de la session (`setup-comgen-repo.sh` reste
disponible pour l'extraire plus tard). Le monorepo pnpm a sa racine dans
`ComGen/`.

**Règle de comparaison des valeurs (§9.1 vs §13.1).** Contradiction
tranchée par le propriétaire : `VERSION`, `IDENTIFIANT`, `NOM` → chaîne
identique ; `DATE`, `NOMBRE` → identiques dans la langue source, une seule
écriture canonique admise par locale cible. Rend « 1,234.56 » acceptable
en anglais et « 4.2.0 » bloqué partout.

**Une branche par lot (`lot-N`).** Autorisé explicitement par le
propriétaire, par dérogation à la consigne de session « une seule
branche ». Rien n'est fusionné sans le dire.

**Abandon du prototype Vite.** Un prototype de système de design (React +
Vite + CSS Modules) a été construit avant réception de la spécification,
qui impose Next.js + Tailwind + Radix. Le prototype reste dans l'historique
(commit `b07cf69`) ; ses **jetons OKLCH, son vérificateur de contraste et
ses décisions de composants** sont portés dans la pile imposée. Le dossier
`frontend/` est supprimé au profit de `apps/web`.

## 2026-09-22 — Lot 0

**Tailwind v4, configuration CSS-first.** Les jetons restent des variables
CSS dans `styles/tokens/*.css` ; `@theme` ne fait que les exposer comme
utilitaires. Tailwind ne possède aucune valeur : supprimer Tailwind ne
changerait aucune couleur.

**Radix UI plutôt que React Aria.** Point de départ shadcn imposé, qui
repose sur Radix ; ne pas mélanger deux bibliothèques de primitives.

**Lucide** comme unique jeu d'icônes (trait 1,5 uniforme, arbre secouable,
intégration Radix/shadcn éprouvée). Phosphor écarté pour n'avoir qu'une
famille.

**Instrument Sans (variable) + JetBrains Mono**, via Fontsource,
auto-hébergées. Choix repris du prototype : sans-serif à chasse compacte
adaptée aux interfaces denses, sans la banalité d'Inter ; mono pour les
références (`F-01`, `COM-2026-0001`, versions).

**Rayons impairs (3/5/7/10/14 px), séparation par bordure et non par
ombre.** Repris du prototype : le triplet 8/12/16 et les cartes flottantes
sont la signature la plus immédiate d'une interface produite sans décision.

**Base typographique 14 px, échelle fixe.** Outil de travail dense ; une
échelle fluide fait bouger les alignements entre écrans.

**Playwright épinglé en 1.56.x** pour correspondre au Chromium préinstallé
(`/opt/pw-browsers`, build 1194) — l'environnement n'autorise pas
`playwright install`.

**TypeScript ~6.0** plutôt que 7.x (port natif) : l'écosystème Next /
Prisma / Storybook n'est pas encore aligné sur 7 ; on ne prend pas ce
risque sur l'outillage de base.
