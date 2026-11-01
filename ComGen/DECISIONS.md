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

## 2026-10-01 — Refonte, étape 2 : la fondation de démonstration

### Un seul contrat d'agent, et la trace dit toujours qui a répondu

Agents réels et simulés portent la même interface `Agent<E, S>`. Rien
au-dessus ne sait lequel a travaillé — sauf la trace, qui porte `simule` et
ne le cache jamais. La sortie est validée par son schéma Zod **à la
frontière de l'orchestrateur**, quoi qu'en dise l'agent : c'est là qu'une
structure proposée devient une donnée de confiance.

La fabrique nomme la raison du mode (`AUCUN_FOURNISSEUR` quand aucune clé
n'est configurée, `AGENT_REEL_ABSENT` tant que l'agent réel n'est pas
écrit). Une clé posée ne fera donc pas croire qu'un modèle a parlé.

### L'orchestrateur n'a pas de demi-résultat

Une étape qui échoue arrête la chaîne ; les suivantes sont marquées
`ANNULEE`, pas « en attente ». L'échec lève `ErreurOrchestration`, qui
**porte** l'état partiel pour l'afficher : il faut l'ouvrir pour y accéder,
on ne tombe pas dessus par mégarde. Chaque événement porte l'état de
toutes les étapes, pour que l'interface dessine la chronologie entière dès
le premier et n'ait aucun delta à recoller.

Horloge et attente sont injectées : la simulation échelonne ses paliers
(1 à 3 s, déterministes — une démonstration doit se dérouler deux fois de la
même façon), les tests ne patientent pas.

### Les agents simulés dérivent de la source, jamais d'un canevas

Arbitrage retenu : **données de démonstration dérivées du fichier
réellement déposé**. L'extracteur simulé appelle `proposerFaitsCandidats`,
la fonction pure du domaine ; l'analyste ne propose une audience que si la
source la nomme, et porte la phrase qui le dit ; le suggesteur préremplit
titre, nature et criticité, chacun adossé à un extrait, et chaque
proposition peut être nulle.

Une source sans aucun fait relevable **échoue** (`SOURCE_INEXPLOITABLE`).
C'est le garde-fou « pas de sortie générique mais crédible » écrit en code :
un spectateur qui dépose sa propre note ne doit pas lire des valeurs venues
de nulle part.

### L'historique engendré dit la vérité sur lui-même

Six mois, 150 communications, numéros 7 à 156. Le texte de la source est
composé d'abord ; les faits en sont ensuite **relevés**, jamais recopiés :
une citation ne peut pas diverger de sa source puisqu'elle en est extraite.

Une communication marquée `ENVOYEE` porte sa variante, ses affirmations
appuyées, son approbation et son envoi. L'alternative — poser l'état seul —
aurait mis en base une affirmation fausse, que le tableau de bord aurait
comptée comme vraie. Le seed refuse une affirmation `SOUTENUE` sans fait
d'appui, et un envoi sans approbation accordée.

Rien n'est tiré au hasard : tout dérive de l'indice, et deux exécutions du
seed produisent le même historique — une capture d'écran reste valable.

### L'historique affiché est borné, et le dit

`listerCommunications` rend les 25 plus récentes avec le **total**. La page
affiche « 25 communications sur 105 » : un extrait qui ne dit pas qu'il est
un extrait est un résultat partiel présenté comme complet. Le filtrage et
la pagination arrivent avec l'onglet Analyses.

## Étape 3 — le générateur : un assistant en cinq étapes

### L'assistant remplace la navigation par onglets

`server/services/assistant.ts` lit l'avancement **en base** — nombre de
sources, de faits restant à revoir, de destinataires retenus, de variantes
— et en déduit l'étape courante : la première qui n'est pas faite. Rien
n'est stocké : un avancement mémorisé pourrait mentir sur l'état réel.

Une étape non atteignable n'est pas un lien. Tant qu'un fait reste à
revoir, « Destinataires » est un libellé inerte : la revue de la fiche de
faits (§10) n'est pas sautable, et l'écran le montre au lieu de refuser
après coup.

### Le rédacteur ne peut pas écrire une valeur

Il ne rend pas du texte mais des **segments** : du texte sans valeur, et
des références de faits. `domaine/injection.ts` recompose la phrase et
refuse tout segment libre où `proposerFaitsCandidats` trouve une valeur
(`VALEUR_DANS_TEXTE_LIBRE`). La contrainte cardinale est donc structurelle,
pas surveillée : il n'existe pas de chemin par lequel un modèle écrirait un
nombre, une date, une version.

Conséquence tenue pendant cette étape : une phrase qui porte **deux**
valeurs les référence **toutes les deux**. N'en référencer qu'une laissait
l'autre au fil du texte — et `injecter` refusait, à juste titre. Le test de
bout en bout `parcours.spec.ts` lit les trois valeurs de la source dans le
rapport de vérification, pas dans `main` : le titre de la communication
porte lui aussi le numéro de version, et l'assertion aurait passé sans
texte généré.

### Le texte bloqué est montré, pas caché

Une variante dont une phrase n'est pas appuyée s'affiche avec son rapport
et ses blocages. La masquer empêcherait de corriger ; la laisser partir
violerait la contrainte cardinale. L'approbation, elle, reste fermée tant
qu'un `Controle` bloquant subsiste — et c'est la base qui le garantit, pas
l'écran.

### Ce que les captures ont corrigé

Trois défauts invisibles aux tests de rôle, trouvés en relisant les
captures : les appuis répétés (« F-02, F-03, F-02, F-03 » — une citation
était listée une fois par fait au lieu d'une fois tout court), un titre
« Agents » sans contenu sur une variante sans trace d'exécution, et les
canaux affichés en constantes (`MESSAGERIE_INSTANTANEE`). Les trois sont
corrigés à la source : dédoublonnage dans le seed **et** aux deux
frontières de `generation.ts`, section masquée quand elle est vide,
libellés de canal passés par `next-intl`.

### La communication se lit, le rapport vient après

L'écran de génération montrait le rapport de vérification, le score et les
agents — mais jamais la communication produite. On générait sans voir ce
qu'on avait généré. Le texte est désormais rendu en premier, comme on le
recevrait, et le rapport passe après : on juge un texte en le lisant, pas
en lisant son verdict.

Pour cela, le rôle de chaque paragraphe (ouverture, corps, clôture) est
**écrit dans le document** au lieu d'être jeté à l'écriture
(`paragraphesDuDocument`). Un document ancien n'en porte pas : ses
paragraphes sont rendus en corps, ce qui reste juste, seulement moins
précis.

Pas d'objet répété au-dessus de la lettre : le titre de la communication
est déjà l'en-tête de la page, et la source porte le sien quand elle en a
un. Un essai qui l'affichait a été retiré après lecture des captures.

### L'audit d'accessibilité porte sur une page, pas sur un défilement

Le test du volet d'amendement est devenu rouge sans qu'une ligne de
l'écran change : la machine fournit désormais un Chromium plus récent, et
`target-size` y signale comme « recouvert » tout élément passé sous la
barre supérieure collante. Mesure faite, le lien incriminé faisait bien
24 × 568 px ; il était simplement sous l'en-tête parce que le clic sur
« Amender » avait fait défiler la page.

Le test remonte donc en haut avant d'auditer. Ce n'est pas un contrôle
affaibli : un contenu sous une barre collante n'est pas un défaut, c'est
une position de défilement. Au passage, les liens de contradiction ont
gagné leur cible de 24 px (`min-h-6`), qu'ils n'avaient pas.

Le chemin du navigateur est devenu réglable (`PLAYWRIGHT_CHROMIUM_PATH`) :
la machine en fournit un hors de l'arbre de Playwright, et on ne télécharge
rien — il n'y a pas de réseau pour ça.

## Les agents sont branchés : la génération passe par l'orchestrateur

### Le rédacteur et le vérificateur ne sont plus enchaînés à la main

`genererVariante` appelait ses deux agents l'un après l'autre et fabriquait
elle-même la liste des étapes ; l'orchestrateur, écrit à l'étape 2, n'était
appelé que par ses tests. Elle passe maintenant par `fabriqueAgents()` (la
seule décision entre réel et simulé, qui nomme sa raison) et par
`orchestrer()`.

L'injection des valeurs fait partie de l'étape du rédacteur : un rédacteur
dont la sortie est refusée a échoué, et la chronologie le dit sur son nom
plutôt que sur une étape fantôme.

### La chronologie est dite, pas devinée

La route `POST /api/variantes/[varianteId]/generation` raconte le travail
en lignes JSON : qui répond (annoncé avant le premier agent), l'état de
chaque agent, la fin ou l'échec. Chaque message d'état porte l'état de
**toutes** les étapes : l'écran n'a aucun écart à recoller.

Un agent en échec est dit avec sa raison, et ceux qui le suivaient sont
« annulés », pas « en attente » : ils ne reprendront pas seuls. Fermer la
page coupe la connexion ; le serveur le voit et s'arrête avant le prochain
agent.

### Une route API n'a pas la garde des actions serveur

Les actions serveur vérifient l'origine d'elles-mêmes ; une route API, non,
et celle-ci écrit sur un cookie de session. Contrôle d'origine
(`requeteDeMemeOrigine`) en seconde barrière, derrière `SameSite=Lax`, pour
ne pas dépendre d'un réglage de cookie qu'on pourrait assouplir. Sans
`Origin`, un client hors navigateur passe (il n'a aucun cookie à détourner),
sauf si le navigateur dit lui-même venir d'un autre site.

Une variante d'une autre organisation répond exactement comme une variante
qui n'existe pas (`INTROUVABLE`) : refuser pour l'état dirait à
l'utilisateur qu'elle existe ailleurs.

### Ce qui sort du serveur, et ce qui n'en sort pas

Le message d'une exception qui n'est pas la nôtre n'a pas été écrit pour
être lu : il peut citer une adresse, un hôte, un fragment de requête.
L'orchestrateur le remplace par une phrase générique et garde la cause pour
le journal du serveur ; ni la chronologie, ni la trace, ni la base ne le
reçoivent. De même, le motif technique d'un refus de droit ne sort pas : un
code, que l'interface traduit.

Au passage, `GENERATION_REFUSEE` n'avait aucune traduction : un refus de
génération s'affichait « Certains champs sont à corriger ».

### Un échec laisse une trace, jamais un texte

Une génération qui échoue écrit ses exécutions dans `Execution`
(`succes: false`, avec la raison) : elles ont coûté du travail, l'historique
doit le dire. Elle n'écrit ni texte ni affirmation, et la communication ne
bouge pas. L'écran, lui, ne montre comme agents que ceux de la dernière
génération **réussie** (regroupés par série) : afficher « Rédacteur » à côté
d'une variante dont le texte n'existe pas laisserait croire qu'il en a
produit un.

### Un défaut d'infrastructure, révélé par la première route API

`CLIENT_BRUT`, la clé du client Prisma nu, était un `Symbol` local alors que
la connexion est partagée entre paquets par `globalThis`. Dès que le
bundler embarque `@comgen/db` en deux copies — ce que fait une route API —,
la connexion ouverte par l'une est illisible pour l'autre et la route
répond 500. Les pages n'en souffraient pas : elles partagent une copie.
La clé passe par le registre global (`Symbol.for`). Ce n'est pas une
frontière de sécurité — le code du même processus peut lister les symboles
d'un objet — mais une barrière contre l'usage par mégarde, que le typage
continue d'assurer.

### Les trois autres agents lisent la source au dépôt

EXTRACTEUR, ANALYSTE_IMPACT et SUGGESTEUR passent par la fabrique et
l'orchestrateur à chaque source déposée, avant la transaction (on ne tient
pas une transaction ouverte pendant qu'on attend un agent).

**Chacun tourne seul, pas en chaîne.** Ils lisent la même source sans rien
se transmettre ; en chaîne, l'échec de l'un annulerait les autres. Or une
source sans aucune valeur fait légitimement échouer l'extracteur
(`SOURCE_INEXPLOITABLE`) et l'analyste a encore quelque chose à en dire.

**Seule l'extraction est indispensable.** Un extracteur en panne fait
échouer le dépôt. Une source dont rien ne se laisse relever n'est pas une
panne : elle se dépose sans fait, l'échec est tracé, et le rédacteur en
ajoute à la main. L'analyste et le suggesteur ne font que proposer : leur
échec est tracé, il ne bloque rien.

**La sortie d'un agent est une proposition, pas une donnée de confiance.**
Les faits venaient d'une fonction pure dont la valeur est dans sa citation
par construction ; avec un agent au milieu, plus rien ne le garantit. La
citation est donc relue dans le texte exact de la source (comme avant) et,
nouveau, la valeur dans sa citation. Une citation inventée ou une valeur
absente de sa citation annule tout le dépôt — source, faits, traces. Les
deux gardes ont un test, et le second a été vérifié en le retirant.

### L'agent suggère, l'humain décide — à trois endroits

- **Audiences.** Chaque persona que la source désigne porte « Suggéré par
  la source » et la phrase qui le désigne. Aucun n'est coché. Le
  rapprochement est strict : la dimension doit correspondre au _début_ du
  nom du persona (« Clients » désigne « Clients grands comptes », pas
  « Support client », qui s'adresse à ceux qui soutiennent les clients).
  Mieux vaut une suggestion qui n'allume rien qu'une fausse piste.
  « Fournisseurs » et « Partenaires » sont deux audiences, pas une.
- **Audiences sans persona.** Quand la source nomme quelqu'un pour qui
  aucun destinataire n'existe, l'écran le dit au lieu de le taire.
  Enregistrer la liste fixe la décision de chaque suggestion qui désigne un
  persona (acceptée si retenu, refusée sinon) ; celle qui n'en désigne
  aucun reste en attente, rien ne permet de dire qu'on l'a écartée.
- **Cadrage.** La lecture du suggesteur est gardée avec la source qu'elle
  a lue (`Source.cadrageSuggere`, colonne ajoutée par migration). Elle n'est
  **jamais appliquée** : le cadrage reste ce que le rédacteur a saisi. La
  fiche signale seulement un écart de nature ou de criticité, avec la
  phrase qui le motive. « Pas d'avis » n'est pas un désaccord.

### La durée d'une trace est mesurée

Un agent simulé annonce la durée qu'il joue — la somme de ses paliers. À la
saisie, où rien n'attend, « Extracteur 1 300 ms » était une fiction. La
durée d'une trace est maintenant celle que l'orchestrateur mesure, pour un
agent réel comme simulé : l'orchestrateur est l'autorité sur le temps
écoulé. La fiche affiche « 1 ms · simulé », ce qui est vrai.

### Ce qui reste hors de portée

- **Pas de chronologie en direct à la saisie.** Elle suppose de passer la
  saisie (téléversement de fichiers, résultat par fichier) en flux, ou
  d'ajouter une étape d'analyse lancée à la main ; le dépôt reste donc
  instantané, et ses agents ne se voient qu'après coup, sur la fiche.
- **Les noms de dimension sont français.** Un persona anglais (« Customers »)
  n'est jamais désigné ; l'audience tombe alors dans « sans destinataire
  correspondant ».
- Le seed des 156 communications ne passe pas par les agents : ses
  sources n'ont ni trace de lecture ni suggestion.

## 2026-11-01 — Source ITSM : le ticket devient une source, masqué

Une communication peut désormais partir d'un ticket (ServiceNow ; un autre
outil s'ajoute par un adaptateur). Les choix qui ne découlaient pas de la
spécification sont ici.

### Le secret n'est pas saisi, il est désigné

Le propriétaire demandait un écran de paramétrage ; la décision D2 et §19
interdisent toute clé en base ou dans le code. Les deux tiennent ensemble
parce que l'écran n'enregistre **que le nom** d'une variable
d'environnement (`ITSM_SERVICENOW_SECRET`), jamais sa valeur. Le serveur la
résout au moment de l'appel.

Le nom est contraint **en base** (`refSecret ~ '^ITSM_[A-Z0-9_]{1,60}$'`),
pas seulement dans le formulaire : sans cela, un administrateur aurait pu
désigner `AUTH_SECRET` ou `DATABASE_URL` et lire le secret par le détour
d'une erreur de connexion. L'état du connecteur ne dit qu'une chose de la
variable : si elle est renseignée.

La configuration n'est écrite qu'après un test de connexion réussi. Un test
qui échoue ne remplace pas la configuration précédente : on ne perd pas un
accès qui marche en en essayant un autre.

### L'adresse de l'instance est bornée

C'est la configuration qui décide vers quel serveur partent les
identifiants : elle est donc une surface d'attaque (SSRF). `verifierUrlInstance`
n'accepte que https, sans identifiants dans l'URL, sans port, sans adresse IP
ni nom local, et sur un hôte de la liste autorisée (`.service-now.com`, plus
ce que l'environnement ajoute). Les redirections sont refusées
(`redirect: 'error'`), la réponse est bornée en taille, et aucun message
d'erreur ne reprend l'adresse saisie ni le corps de la réponse.

Limite assumée : on juge le **nom**, pas l'adresse qu'il résout. Un nom
autorisé pointant vers une adresse interne n'est pas détecté ; la liste
autorisée est la défense.

### Le masquage précède l'écriture, pas l'affichage

Masquer à l'affichage aurait laissé les courriels et les téléphones en base,
et surtout aurait permis à un agent de citer ce que l'écran cachait. Le
texte du ticket est donc composé, **masqué**, puis figé comme source : ce
qui est masqué n'existe nulle part dans l'application. La contrainte
cardinale reste vraie mot pour mot, la source de référence étant le texte
masqué.

Une seule fonction (`preparerSourceItsm`) sert l'aperçu et l'import : ce que
l'écran montre est, à la virgule et à l'empreinte près, ce qui sera
enregistré. Une configuration de masquage illisible arrête l'opération
(`ErreurItsm('CONFIG')`) au lieu de retomber sur un masquage plus faible.

Le masquage est une fonction pure de `core`, en une passe : le motif qui
commence le premier gagne, le plus long en cas d'égalité, et rien n'est
masqué deux fois. Les motifs sont bornés et les termes configurés sont
échappés — une configuration ne peut pas ralentir le serveur.

Les préfixes de ticket (INC, CHG, RITM…) ne se masquent jamais : un numéro
de ticket est une valeur que la communication cite.

### Les notes de travail n'entrent que sur demande

Elles sont internes et souvent plus crues que la description. Elles ne sont
donc ni lues ni enregistrées tant que l'utilisateur ne les demande pas, et
le même ticket avec ses notes est une autre source (texte différent,
empreinte différente) : le refus de doublon ne s'y oppose pas.

### Le texte composé suit la langue de la communication

Les libellés et les dates du texte de source sont écrits dans la langue de
la communication, aux formats que l'extraction sait relire (« 12 octobre
2026 », « October 12, 2026 »). Le contenu du ticket, lui, reste dans la
langue de l'outil : c'est de la donnée, elle n'est jamais traduite.

### Ce qui reste hors de portée

- L'adaptateur ServiceNow n'a pas été essayé contre une vraie instance :
  il est testé contre un serveur HTTP local, cas d'erreur compris.
- Le masquage ne détecte pas les noms propres en texte libre ; seuls les
  termes listés le sont.
- Les bornes de date d'un filtre sont interprétées en UTC.
- La démonstration (`ITSM_MODE=mock`) n'engendre que des tickets français.

## 2026-11-01 — Direction « Atelier » : la refonte visuelle V5

Le propriétaire a fourni un jeu de références (V5 clair, V5 sombre, modèle 3)
et demandé de l'implémenter dans les composants réels. Ce qui a été décidé,
et ce qui ne l'a pas été.

### La palette change d'ancre, pas de structure

R1 posait une palette inspirée de TotalEnergies (bleu, orange). La référence
V5 pose un atelier éditorial : canevas ivoire froid, surfaces blanches,
encre graphite, lavande maîtrisée. Les deux niveaux de jetons (palette brute
`--p-*`, sémantique `--color-*`) n'ont pas bougé : seules les ANCRES des
rampes ont été remplacées, converties en OKLCH depuis les valeurs de la
référence. Aucun composant n'a eu à changer de classe pour suivre.

Deux ajustements ne viennent pas de la référence mais de l'accessibilité,
vérifiée par `pnpm check:contrast` (250 couples, deux thèmes) :

- **l'aplat de l'action principale est le graphite**, pas la lavande : un
  bouton lavande plein sous un libellé blanc ne tient pas 4,5:1. La lavande
  reste au texte, aux liens, à l'entrée de navigation retenue et aux
  pastilles d'agent ;
- les paliers qui portent du texte (encre tertiaire, encres d'état, encre
  d'agent) sont descendus en luminosité jusqu'à tenir l'AA sur leur fond.

### La barre de navigation devient une colonne

Six onglets, la marque, l'état du moteur, la langue, le thème et le compte
se disputaient une seule ligne ; le test « la barre ne se chevauche jamais »
existait pour cette raison. La colonne libère la barre, qui ne porte plus
que le contexte et les actions. Les entrées restent une liste unique
(`lib/navigation.ts`), désormais réparties en trois familles, et le tiroir
du téléphone en vit toujours.

Conséquence assumée : colonne et barre SUIVENT le thème, alors que l'ancienne
barre marine était sombre dans les deux. Une colonne de travail n'est pas
une bannière de marque.

### Le modèle 3 est reconnaissable là où il a un sens

Colonne → barre contextuelle → titre → quatre tuiles de mesure → les cinq
étapes en cartes → deux colonnes de travail en bas. Les tuiles sont au
tableau de bord, où les nombres existent et sont comptés en base ; les cinq
cartes d'étapes sont sur chaque écran d'une communication (l'assistant les
portait déjà) ; la colonne de droite existe déjà sur la fiche de faits
(texte des sources) et sur le détail (faire avancer).

Ce qui n'a PAS été repris de la référence, et pourquoi :

- les agents nommés (« Alexandre », « Hélène »), les scores, les durées en
  secondes, les numéros de conformité : ce sont des données de démonstration.
  Les cartes d'étapes n'affichent que ce que la base sait réellement ;
- le bandeau d'accueil ne porte aucun chiffre : il dit ce que l'application
  garantit, jamais ce qu'elle est en train de faire ;
- aucun écran nouveau n'a été inventé pour coller à la référence : rien
  n'est offert qui ne mène quelque part.

### Typographie et signature

DM Sans pour le corps, Manrope pour les titres et les grands nombres, en
graisse 400 et interlettrage resserré. Les deux sont auto-hébergées
(Fontsource) : aucun appel réseau sortant, conformément à la contrainte de
cette machine. Le monogramme et la constellation sont des tracés SVG
originaux, en `currentColor`, servis en ligne — aucune image externe.

### Limites connues

- Le modèle 3 pose un « graphe d'agents » à cinq étapes ; nos cinq étapes
  sont celles du parcours (cadrage → génération), pas cinq agents. La
  chronologie des agents, elle, reste le composant en direct de l'écran de
  génération.
- La page `/design` documente les composants, pas encore les nouvelles
  ancres de palette.

## 2026-11-01 — Approbations : soumission et décision humaine

- **Désignation à la soumission.** Les approbateurs sont ceux du persona de
  chaque variante, sinon tous les approbateurs de l'organisation, jamais
  l'auteur. S'il n'y en a pas assez pour le quota de la criticité, la
  soumission est REFUSÉE (`APPROBATIONS_INSUFFISANTES`) plutôt que de
  laisser une communication bloquée en silence. Être désigné = avoir une
  approbation en attente : il n'existe pas d'autre porte pour décider.
- **Relecture.** Pas d'écran propre : la soumission valide les deux
  transitions de la table (EN_CONTROLE → EN_RELECTURE → EN_APPROBATION) et
  écrit l'état final.
- **Un rejet suffit et se motive.** Il rejette la communication, annule les
  autres décisions en attente. Une approbation n'aboutit à APPROUVEE que si
  la garde du domaine l'autorise une fois la décision écrite.
- **Hors périmètre.** Envoi et notifications ; pas de parcours e2e du flux
  complet (il faudrait un compte approbateur dans les fixtures) — la
  logique et le déclencheur d'annulation sur écriture de contenu sont
  couverts par les tests de service.

## 2026-11-01 — GARDIEN, envoi, analyses, paramétrage

- **GARDIEN est du code, pas un modèle.** `core/domaine/gardien.ts` applique
  les garde-fous du persona : terme du lexique interdit (mot entier, sans
  casse ni accents), sujet interdit (littéral — une paraphrase n'est pas
  reconnue, limite assumée), fait cité plus confidentiel que le plafond du
  persona. Tout est bloquant. Une clé absente = pas de règle ; une clé
  présente et mal formée = configuration illisible, qui BLOQUE.
- **L'envoi est une simulation étiquetée.** Aucun connecteur de canal n'est
  branché : `Envoi.etatRemise = {mode:'SIMULATION', remis:false}`, affiché
  comme tel, compté à part dans les analyses. Ce qui est réel : la garde
  (liste de diffusion résolue et non vide), le droit ENVOYER, l'annulation
  dans la fenêtre. La base garde l'effectif et le nom des listes, pas les
  adresses. Seule une liste STATIQUE se résout.
- **Analyses** : comptées en base à chaque lecture ; sans donnée, « pas de
  mesure », jamais zéro.
- **Paramétrage** : personas (garde-fous, approbateurs) et listes statiques
  s'éditent (PARAMETRER) ; les modèles sont en lecture seule — les clés
  restent dans l'environnement (D2). Le service fusionne : voix, exemples et
  préférences de lexique ne sont pas à l'écran et ne disparaissent pas.
- **Hors périmètre** : constructeur de gabarits (demandé), connecteur de
  canal réel, listes non statiques.

## 2026-11-01 — La voix d'un persona : style, méthode, jargon

Le propriétaire a demandé d'ouvrir le style d'écriture au paramétrage. Ce
qui est réglable, et ce que chaque réglage FAIT réellement :

- `registre` et `personne` sont des CODES (traduits à l'affichage) ; `ton`
  est une phrase libre ; `structure` est le plan, une liste d'étapes nommées
  librement (le seed écrit « prochaine étape », pas un code) ; le jargon est
  `lexique.<langue>.preferes`.
- Tous sont transmis au rédacteur comme consigne de forme. L'agent SIMULÉ
  recopie les citations de la source et ne reformule pas : il n'en tient
  donc pas compte, et l'écran le dit plutôt que de laisser croire à un effet.
- `longueurCible` est le seul réglage appliqué par du code aujourd'hui :
  après génération, un écart de plus de 40 % devient un contrôle LONGUEUR
  **non bloquant** (gravité AVERTISSEMENT). Le texte reste vrai, il est
  seulement trop long ou trop court — ce n'est pas un motif de blocage.
  Sans cible, pas de contrôle : `ecartDeLongueur` rend `null`, jamais zéro,
  qui se lirait comme « conforme ».
- Comme pour les garde-fous : clé absente = pas de règle ; clé présente et
  mal formée = illisible, et la génération REFUSE pour ce persona.

Le seed écrivait `registre: 'professional'` et `personne: 'you'` sur les
personas anglophones. Ces clés étant devenues des codes, le seed est aligné
sur l'énumération ; le ton et le plan restent dans la langue de l'audience.

## 2026-11-01 — Écran des agents : le parcours, et leurs consignes

Le propriétaire a demandé un parcours d'agents visuel et cliquable, et le
réglage de leurs prompts.

- **Le graphe dit la vérité, pas une ambition.** Chaque rôle porte son état
  réel : `simule` (il tourne, sans modèle), `code` (le GARDIEN, du code
  déterministe, donc sans consigne), `absent` (déclaré par la spécification,
  joué par personne). La table est écrite à la main dans
  `services/agents.ts` et non déduite : un test vérifie qu'aucun rôle du
  domaine n'y manque, et le jour où un agent réel arrivera, la table et la
  fabrique devront bouger ensemble.
- **La sélection vit dans l'adresse** (`?agent=`), pas dans un état de
  composant : l'écran se partage, se recharge et marche sans script.
- **La consigne est réelle, son effet est daté.** Elle est enregistrée,
  versionnée (`ConsigneAgent`, version incrémentée par un déclencheur SQL
  dès que le texte change) et attribuée. Elle ne part vers aucun modèle tant
  qu'aucun agent réel n'existe, et l'écran l'écrit : les agents simulés n'en
  lisent pas, et leur trace dit `simulation/…`, jamais la version de
  l'organisation. Un champ qui ne ferait rien serait un faux bouton ; un
  champ qui enregistre vraiment et dit quand il agira, non.
- **Une consigne peut être refusée.** `verifierConsigne` (core, code pur)
  cherche quatre demandes interdites : écrire une valeur, inventer, ignorer
  la source, répondre en texte libre. Un seul constat suffit à refuser
  l'enregistrement, avec la phrase fautive. Le programme ne peut pas
  empêcher un modèle d'obéir à une telle consigne ; il peut refuser de la
  garder.
- **Limite assumée** : la détection est lexicale, en français. Une consigne
  qui demande la même chose avec d'autres mots passera.

## 2026-11-01 — Gabarits : une bibliothèque, et des exemples à installer

- **L'écran commence par les canaux servis.** Un gabarit n'est pas
  décoratif : sans gabarit actif pour son canal, un persona fait refuser la
  génération (`PERSONA_SANS_TEMPLATE`). La première ligne de l'écran dit
  donc, pour chacun des quatre canaux, quel gabarit le sert — ou qu'aucun ne
  le sert.
- **Huit exemples prêts à l'emploi** (`core/domaine/gabarits.ts`) : courriel
  HTML, courriel texte, newsletter, note PDF, message instantané, article de
  portail, et deux équivalents anglais. Ce sont des DÉPARTS : aucun ne porte
  de marque, de couleur ni de nom d'entreprise — une mise en page marquée
  serait à refaire avant le premier envoi. Installer en COPIE le corps et
  les emplacements : le catalogue n'est pas une dépendance vivante.
- **Un gabarit se vérifie.** `verifierGabarit` constate les désaccords entre
  le corps et ses emplacements : un emplacement obligatoire jamais appelé ne
  sera jamais rempli, un `{{trou}}` non déclaré partirait tel quel dans un
  message. Un test vérifie que chaque exemple du catalogue se tient.
- **Le corps est montré, jamais rendu.** Afficher le HTML d'un gabarit comme
  une page donnerait à croire que c'est le résultat final ; celui-ci
  appartient à l'envoi. L'écran le dit.
- **Hors périmètre** : l'édition du corps depuis l'interface (le
  constructeur, demandé à part) et le rendu final HTML/PDF.
