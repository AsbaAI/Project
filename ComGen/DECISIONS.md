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

## 2026-10-01 — Lot 1

### Données et domaine

**Contradiction = même énoncé, même type, valeurs différentes, citations
différentes.** Deux faits vivants se contredisent quand leur énoncé
normalisé et leur type de valeur coïncident, que leurs valeurs diffèrent
et qu'ils ne viennent pas du même extrait (même source, même citation).
Le dernier critère évite un faux positif vécu : deux valeurs d'une même
phrase ne sont pas deux sources en désaccord. Une contradiction se tranche
en retirant un fait ou en amendant sa valeur ; elle bloque
`PRETE_A_GENERER`.

**Garde `FAIT_NON_REVU`.** La spécification rend la revue de la fiche
obligatoire (§10) ; la garde de `FAITS_A_VALIDER → PRETE_A_GENERER`
refuse tant qu'un fait reste `PROPOSE`. Test écrit d'abord.

**`PRETE_A_GENERER` est refusée au lot 1 (`AUCUN_PERSONA`).** Le choix
des personas se stocke sur les variantes, qui naissent au lot 3 ; la
garde existe déjà et le dit, plutôt que de laisser passer une
communication sans audience.

**Transitions manuelles en liste blanche** (`services/etat.ts`) :
brouillon ↔ faits à valider ↔ prête à générer, et l'archivage depuis ces
trois états. Tout le reste passe par son parcours propre (génération,
contrôle, approbation) — un test vérifie qu'aucune requête manuelle
n'atteint `APPROUVEE`, `ENVOI_PLANIFIE` ou `ENVOYEE`. Le changement
d'état est un `updateMany … where etat = <attendu>` : verrou optimiste,
`CONFLIT` si un autre l'a changé entre-temps.

**Amendements seulement fiche ouverte.** Au lot 1, une valeur s'amende
tant que la communication est en brouillon, faits à valider ou prête à
générer (dans ce dernier cas elle revient à faits à valider). Le
déclencheur SQL annule déjà les approbations des variantes qui citent le
fait : le chemin d'amendement après génération est prêt pour le lot 4.

**Reprise : lien enregistré, comportements au lot 8.** Le cadrage
enregistre la communication d'origine (lue dans le contexte cloisonné) et
l'intention (mise à jour, correctif, rappel) ; l'originale n'est jamais
modifiée. Les effets propres à chaque intention viennent avec le lot 8.

**Dates saisies dans le fuseau du site, sinon de l'organisation**,
converties en UTC par `heureLocaleVersUtc` (`core/domaine/temps.ts`). Une
heure inexistante (passage à l'heure d'été) ou ambiguë (retour à l'heure
d'hiver) est refusée avec son motif, jamais devinée. Le fuseau est écrit
à côté des champs.

### Entrée des sources

**Candidats de faits déterministes.** Au lot 1, sans modèle, l'extraction
propose des faits par motifs (identifiants, versions, dates, nombres)
avec citation vérifiée mot pour mot ; tous naissent `PROPOSE` et doivent
être revus. L'EXTRACTEUR du lot 3 remplacera la source des candidats, pas
la règle de citation.

**Langue détectée par heuristique de mots-outils**, stockée sur la
source ; en dessous d'un score de 3, la langue est « non détectée »
plutôt que devinée.

**Formats lus : docx (mammoth), pdf avec texte (pdf-parse), xlsx
(SheetJS 0.20.3 depuis son CDN officiel, la version npm n'étant plus
maintenue), csv, md, txt.** Le type est vérifié par signature (lecteur de
répertoire central zip pour distinguer docx/xlsx/pptx), pas par
extension. Un PDF sans couche texte est refusé (`TEXTE_ABSENT`) : l'OCR,
pptx, eml et msg arrivent au lot 8 et sont aujourd'hui refusés et
signalés comme tels.

**Antivirus explicite.** `ANTIVIRUS_MODE` n'a pas de valeur par défaut :
`clamd` ou `aucun`, écrit en toutes lettres. Avec `aucun`, chaque dépôt
affiche « Aucune analyse antivirale ». Un démon injoignable refuse le
fichier (`ANTIVIRUS_INDISPONIBLE`), jamais de passage silencieux.

**Plafonds** : 20 fichiers, 25 Mio par fichier, 50 Mio par dépôt, 200 000
caractères de texte saisi. Les limites de corps de Next
(`serverActions.bodySizeLimit`, `proxyClientMaxBodySize`) sont alignées à
52 Mio pour que le refus vienne du service, avec son message.

**Stockage local** : `<racine>/<clé>` et un fichier compagnon `.type`
pour le type de contenu ; clé `org/<organisation>/sources/<id>/<nom>`.
L'adaptateur S3 suit la même interface. Les objets d'un dépôt dont la
transaction échoue sont supprimés.

**Doublons par empreinte SHA-256 du texte normalisé**, dans la
communication : le même texte déposé sous deux formats (docx puis pdf)
est un doublon, deux fichiers au texte différent n'en sont pas.

### Authentification

**Auth.js v5, session JWT, utilisateur relu en base à chaque requête** :
rôles et rattachement ne vivent pas dans le jeton, une révocation prend
effet immédiatement. Le simulateur de connexion (choix d'un compte du jeu
de démonstration) n'existe qu'hors production.

**`COMGEN_ENV`** distingue le lieu de déploiement du mode de build : les
tests de bout en bout tournent sur `next start` (`NODE_ENV=production`)
et déclarent `COMGEN_ENV=test` pour utiliser le simulateur ; sans
déclaration, un build de production est la production.

### Tests

**Une base par suite** : `comgen_test` (db), `comgen_test_web` (services
web, fichiers en série), `comgen_e2e` (Playwright). Une suite vide sa
base ; partager une base ferait dépendre un test de l'ordre des autres.

**E2E sur une base remise au seed à chaque passe**, préparée par la
commande du serveur (Playwright démarre le `webServer` avant
`globalSetup`). Les parcours qui écrivent tournent sous Kestrel, les
captures sous Helvea : les écrans relus sont stables.

**Le seed est aligné sur l'extraction réelle** : le texte de chaque
source du jeu de démonstration est exactement celui que l'extracteur
produit sur le fichier déposé (vérifié), sinon les citations du seed
mentiraient sur leur source.

### Interface

**Les formulaires renvoient leurs valeurs.** React 19 réinitialise un
formulaire après son action ; l'état d'erreur porte les valeurs soumises
et le formulaire se remonte avec elles. Rien de ce qui a été saisi ne se
perd sur un refus.

**Actions d'un fait en une barre, un volet à la fois.** Trois `<details>`
empilés par carte rendaient la fiche illisible (27 bandeaux pour 9
faits). Un volet se referme après succès en comparant le jeton de
réponse à celui de l'ouverture — sans effet de bord.

**Modes d'entrée à venir nommés, pas grisés.** Cinq cartes désactivées
noyaient les deux choix réels ; elles deviennent une ligne « Pas encore
disponibles : … ».

**Zone de dépôt maison autour d'un `<input type="file">` natif**,
visuellement masqué : le texte du contrôle natif suit la langue du
navigateur, pas celle de l'interface. Le glisser-déposer est un raccourci
(directive oxlint motivée) ; le contrôle natif reste le chemin clavier.

**Colonne des sources focalisable** (`tabIndex=0`) : elle défile seule sur
grand écran ; sans focus, son contenu serait inatteignable au clavier
(axe `scrollable-region-focusable`). La règle oxlint contraire est levée
pour ce fichier, motif écrit.

**Jeton `highlight`** pour le surlignage des citations : le fond accentué
était presque invisible sur la surface de base. Deux couples de
contraste ajoutés au vérificateur.

**Typographie française** : espaces insécables avant `: ; ? !` et dans
les guillemets, dans tout le catalogue fr (un « » : » isolé en fin de
ligne a été vu sur téléphone).

## 2026-10-01 — Refonte du parcours (validée par le propriétaire)

Le propriétaire a demandé une refonte du parcours et de l'interface :
assistant pas à pas, agents visibles, approbation, paramètres, analyses,
palette inspirée de TotalEnergies. Elle remplace l'ordre des lots 2 à 10
par six étapes (`refonte-1` … `refonte-6`, une branche chacune, issue de
`lot-1`). Arbitrages validés tels que recommandés :

- **D1 — La revue des faits reste une étape de l'assistant** (« Vérifier
  les faits », après le contenu brut). Sans elle, la contrainte cardinale
  tombe.
- **D2 — Les clés d'API ne se saisissent pas dans l'interface.** Les
  paramètres montrent fournisseur, modèle, modèle par agent et une
  _référence_ de secret (variable d'environnement ou coffre) avec son état.
- **D3 — Palette ajustée pour l'AA** (détail ci-dessous).
- **D4 — Treize états internes, cinq statuts affichés** (Brouillon, En
  attente d'approbation, Approuvée, Envoyée, Rejetée) plus un marqueur
  « Bloquée » qui dit pourquoi.
- **D5 — Une communication existante déposée au départ est une référence
  de style**, jamais une source de faits.
- **D6 — Modèle simulé, étiqueté, hors production seulement**, pour
  démontrer la génération sans clé (même principe que le simulateur de
  connexion).
- **D7 — Une branche par étape de refonte**, rien de fusionné sans accord.

Défauts tenus : interface bilingue, données de démonstration fictives
(aucune donnée TotalEnergies inventée, aucun logo sans fourniture), un
écran bloqué dit toujours pourquoi.

### R1 — jetons et mise en page

**Palette.** Les teintes de la charte sont les ancres des rampes OKLCH ;
les paliers qui portent du texte sont ajustés pour tenir 4,5:1, vérifiés
par `check:contrast` (207 couples, deux thèmes) :

| Rôle                      | Charte                          | Employé comme                                                                                   |
| ------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Action, liens             | `#3055FC`                       | aplat sous libellé blanc (5,48:1), texte de lien                                                |
| Bleu                      | `#0186F4`                       | bordure active, grands aplats, début du dégradé ; jamais sous texte blanc (3,67:1)              |
| Orange                    | `#FE7F00`                       | aplat d'action secondaire sous texte sombre (6,3:1), fin du dégradé ; texte orange = palier 700 |
| Orange clair / très clair | `#FFB366` / `#FFF4E8`           | bordure et fond de carte mise en avant                                                          |
| Bleu très clair           | `#EAF4FE`                       | sélection, fond accentué                                                                        |
| Turquoise                 | `#35C1B0`                       | bordure des badges de succès ; texte succès = palier 700                                        |
| Jaune                     | `#FDD600`                       | bordure des badges d'attente ; texte = brun 700                                                 |
| Rouge                     | `#FB0103`                       | indicateur de blocage ; bouton destructif au palier 600                                         |
| Violet                    | `#8434D5`                       | ce qui vient d'un agent (badge `ai`, chronologie)                                               |
| Texte, fonds              | `#202124`, `#F7F8FA`, `#FFFFFF` | encre principale, fond de page, panneaux                                                        |

Le thème sombre est dérivé des mêmes rampes (les deux blocs sombres
restent identiques, vérifié). Nouveaux jetons : `emphasis-*` (orange),
`ai-*` (violet), `brand-start/end` et l'utilitaire `bg-brand-gradient`,
réservé au filet d'en-tête et, en R3, à la chronologie des agents.

**Statut « en attente » en jaune** (badge `pending`), conformément à la
charte ; génération et contrôle en violet (badge `ai`).

**Navigation.** « Nouvelle communication » est un bouton en tête de la
barre latérale ; puis Tableau de bord, Historique, Analyses, Paramètres ;
le système de design passe en pied. L'entrée courante se décide une fois
pour toute la liste (le plus long préfixe de segment) : sur
`/communications/nouvelle`, c'est la création qui est marquée, pas
l'historique.

**Accueil à deux cartes** (`ActionCard`, nouveau : `ChoixCartes` choisit
une valeur de formulaire, ici on navigue) et trois compteurs « à traiter »
calculés par le service du tableau de bord.

**Historique = la liste existante** (`/communications`), renommée ; elle
s'enrichira en R6. Le tableau de bord passe à `/tableau-de-bord`.

**Analyses et Paramètres existent avec un état vide qui dit ce qui
viendra**, plutôt que des zéros qui passeraient pour une mesure ou des
liens vers des pages vides.

## 2026-10-01 — Démonstration publique

Demandée par le propriétaire : un lien public, sur l'hébergement le plus
simple. Procédure dans `docs/DEPLOIEMENT.md`.

- **Vercel + Neon**, offres gratuites. Le build de `apps/web` culmine vers
  950 Mo : les offres à 512 Mo échouent. Neon s'ajoute depuis Vercel et
  pose ses variables lui-même.
- **`COMGEN_ENV=demo`, quatrième environnement, toujours déclaré**, jamais
  déduit : un build de production sans déclaration reste la production, où
  le simulateur de connexion est refusé. En démo, le simulateur est admis et
  un bandeau « Démonstration » (texte et pictogramme) précède l'en-tête de
  chaque page, connexion comprise. La valeur est lue par les layouts
  serveur ; le bandeau ne décide de rien.
- **Hauteur du bandeau fixe** (`--layout-demo-height`) : sa présence
  allonge `--layout-chrome-height`, dont partent la barre latérale
  collante, le panneau collant de la fiche de faits et le défilement
  d'ancre. Version courte du message sous `md` pour tenir sur une ligne.
- **Seed « si vide »** (`pnpm db:seed:si-vide`) au build : un redéploiement
  ne remet pas la démonstration à zéro. La remise à zéro reste le seed
  complet, lancé à la main.
- **Migrations sur `DATABASE_URL_UNPOOLED`** quand elle existe : les
  verrous de session de `migrate deploy` ne passent pas un pooler en mode
  transaction. L'application reste sur l'URL mutualisée.
- **Limites acceptées, écrites dans la procédure** : 4,5 Mo par dépôt
  (plafond des fonctions Vercel), fichiers déposés éphémères (`/tmp` ; le
  texte de la source est en base), pas d'antivirus, pas de modèle.

## 2026-10-01 — Un seul `.env`, chargé explicitement

Le démarrage décrit par le README ne fonctionnait pas sur une installation
neuve : Prisma 7 ne charge plus `.env` de lui-même, et Next ne lit que les
`.env` de `apps/web`. `pnpm db:migrate` échouait donc sur
« datasource.url property is required ».

Le dépôt garde **un seul `.env`, à la racine de l'espace de travail** —
l'application et les outils de base partagent la même configuration. Il est
chargé explicitement par `process.loadEnvFile` dans `prisma.config.ts` et
`next.config.ts`, et par `--env-file-if-exists` pour le seed, qui est un
processus distinct. Les trois sont natifs à Node 22 : aucune dépendance
ajoutée.

`loadEnvFile` **n'écrase jamais** une variable déjà posée : les variables de
Vercel, celles du shell et celles que Playwright injecte gardent la main sur
le fichier. Un `.env` absent est toléré sans erreur (c'est le cas en
production).
