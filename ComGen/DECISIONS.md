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

**Archivage du cadrage initial.** `docs/01-…04-*.md`, `samples/` et
`templates/` décrivaient un autre produit (documents Word depuis un
template, huit langues), antérieur à la spécification. Déplacés dans
`docs/archive/cadrage-initial/` avec un avertissement : conservés pour
l'historique, sans valeur normative. Les données de démonstration (§20)
arriveront avec le schéma, au lot 1.

**oxlint + Prettier plutôt qu'ESLint.** Un seul binaire rapide, règles
`import`, `typescript`, `unicorn`, `react` ; Prettier sans point-virgule,
guillemets simples, 100 colonnes. Les directives de désactivation ne sont
pas lues dans le JSX : toute exception est une directive de fichier,
motivée.

**Paquets exportés en sources TypeScript.** `packages/*` n'ont pas d'étape
de build : `exports` pointe sur `src/*.ts`, `apps/web` les transpile
(`transpilePackages`), Vitest les lit directement. Imports internes avec
extension `.ts` explicite (`allowImportingTsExtensions`) pour rester
compatibles avec une exécution Node sans bundler.

**Couche FournisseurModele — détails non tranchés par §5.**

- L'erreur du SDK est conservée en `cause` et exposée masquée
  `{ nom, message, statut? }` : jamais de corps de réponse brut, qui
  pourrait contenir un extrait de source.
- `graine` demandée à un fournisseur non déterministe → échec `CONFIG`,
  pas d'ignorance silencieuse.
- `maxJetonsSortie` absent → `capacites().sortieMax` ; `metadonnees` ne sont
  jamais transmises au fournisseur.
- `sortieStructuree: 'native'` est déclaré par l'adaptateur, pas sondé : la
  sonde vérifie l'accès et la langue, le banc d'essai (lot 9) vérifie le
  taux de 98 %. Le registre refuse `aucune` mais ne mesure pas le taux.
- `verifierIndependance(redacteur, verificateur, baseAffinage?)` : un
  modèle affiné compte pour la famille de sa base.

**Tailwind `@theme inline reference`.** Les jetons sont des variables CSS
possédées par `styles/tokens/*.css` ; `@theme` les référence sans les
redéclarer, donc aucune valeur n'est dupliquée et la feuille générée ne
contient pas de second `:root`.

**Vocabulaire des couleurs renommé** (`surface-*`, `ink-*`, `line-*`,
`action`, `on-action`, `{success,warning,danger}-{bg,line,ink,solid}`) au
lieu de `background/foreground/muted/primary` de shadcn : les noms disent
le rôle, pas la position dans une palette, et empêchent de retrouver
l'apparence par défaut par habitude.

**Pas de MCP Figma (§14.3).** Aucune maquette Figma n'existe : le système
de design est écrit directement dans le dépôt (jetons, page `/design`,
Storybook), qui devient la source de vérité visuelle. Substitution
consignée comme l'exige §14.3.

**Fontsource, nom de famille `Instrument Sans Variable`.** C'est le nom
que le paquet déclare dans son `@font-face` ; le jeton `--font-sans` le
reprend tel quel avec une pile système en repli.

**Amorçage du thème par `<script>` inline** dans `<head>` (`THEME_BOOT_SCRIPT`,
lu depuis `localStorage['comgen:theme']`) pour poser `data-theme` avant le
premier rendu et éviter l'éclair de thème. Le fournisseur React s'abonne au
même stockage via `useSyncExternalStore` ; la bascule est un groupe radio
Radix à trois positions (système, clair, sombre).

**Navigation : seules les routes existantes.** La barre latérale ne liste
que les écrans livrés (tableau de bord, design) ; les entrées des lots à
venir apparaîtront avec leurs écrans, jamais en gris « bientôt ».

**Captures hors dépôt.** Les PNG de `e2e/captures/` sont régénérés par
`pnpm test:e2e` et relus à chaque lot ; les versionner ferait grossir le
dépôt sans valeur de revue.

**Radix `Slottable` pour `Button asChild`** : permet de garder l'icône et
l'indicateur de chargement autour de l'enfant substitué sans casser la
règle « un seul enfant » de `Slot`.

**Barre de progression maison plutôt que `<progress>`** : l'élément natif
ne se restyle pas de façon fiable entre navigateurs ; un `div` avec
`role="progressbar"`, `aria-valuenow/min/max` et un texte de valeur visible
donne la même sémantique et un rendu maîtrisé.

**`lib/state-tone.ts` provisoire.** La liste des états et leur tonalité
sont écrites localement au lot 0 ; au lot 1 elles dérivent du type d'état
de `core`, pour qu'un état ajouté au domaine casse la compilation de l'UI.

**API de `Button iconOnly`** : `icon` obligatoire, `children` devient le
libellé masqué (`sr-only`) — le nom accessible est imposé par le type, pas
par une convention.

**`tailwind-merge` étendu.** Chaque `@utility` maison est déclarée dans
`extendTailwindMerge` ; sinon `twMerge` traite `border-w` et
`border-line-default` comme un conflit et supprime l'épaisseur. Bordures
directionnelles `border-{t,b,l,r}-w` pour les séparateurs.

**Spécimen `ink-disabled` = bouton désactivé.** axe-core n'exempte pas un
texte `aria-hidden` du contraste, mais exempte un contrôle `disabled` ; le
spécimen de la page `/design` est donc un vrai bouton désactivé, ce qui
correspond à l'usage réel du jeton.

**`Field` possède l'identifiant du contrôle** et le fournit par contexte à
`Input`/`Textarea` : libellé, aide et erreur sont toujours liés, sans que
l'appelant puisse l'oublier.

**Vérificateur de contraste** : 61 couples, 2 thèmes, plus l'égalité
stricte des deux blocs sombres (`@media` et `[data-theme='dark']`) — une
règle `@media` ne pouvant pas être réutilisée par un sélecteur, la
duplication est inévitable et donc vérifiée.

**Storybook 10 (`@storybook/nextjs-vite`)** avec addon-docs et addon-a11y.
Le sélecteur de thème de la barre d'outils applique le même
`applyPreference` que l'application sur `data-theme` ; les stories
reçoivent `NextIntlClientProvider` (fr) et `ThemeProvider` comme les pages.
Le contenu d'exemple des stories est en français en dur : outil de
développement, pas d'interface livrée.
