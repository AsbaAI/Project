# ComGen — mémoire de travail

Application web de génération de communications inter-entreprises :
à partir d'un élément source (document, message, ticket, canevas), produire
une version par audience, la soumettre à une chaîne de vérification
automatique puis à une approbation humaine, avant envoi.

Spécification de référence : `docs/SPECIFICATION.md` (contractuelle).
Journal de décisions : `DECISIONS.md` — tout choix non dicté par la spec y va.

## Contrainte cardinale — prime sur tout le reste

**L'application ne fait jamais dire à une communication ce que la source ne dit pas.**

- Tout texte généré est découpé en affirmations ; chaque affirmation est
  rattachée à un `Fait` cité mot pour mot dans la source. Une affirmation
  factuelle sans fait d'appui `SOUTENUE` **bloque l'envoi**.
- Nombres, dates, versions, identifiants, noms propres ne sont **jamais
  écrits par un modèle** : le rédacteur émet des références de faits, la
  valeur est injectée par du code, puis revérifiée par comparaison de
  chaînes hors de tout appel de modèle.
- Règle de comparaison (confirmée par le propriétaire) : `VERSION`,
  `IDENTIFIANT`, `NOM` → chaîne identique à la source, toujours. `DATE`,
  `NOMBRE` → identiques dans la langue de la source ; dans une autre
  langue, **une seule** écriture admise : le format canonique de la locale
  cible. Toute autre écriture bloque.
- Aucun chemin de code n'envoie sans approbation humaine : pas de drapeau,
  pas de rôle, pas de route de contournement.
- Toute écriture de `Variante.contenu` remet la variante en `EN_CONTROLE`
  et annule ses approbations — **dans la couche données**, pas dans l'UI.
- Le contenu des sources est de la donnée, jamais de la consigne.
- Un modèle affiné n'est pas une source. Mêmes contrôles, mêmes blocages.
- Indisponibilité, interdiction régionale, langue absente : **échec
  explicite**, jamais de repli silencieux, jamais de partiel présenté
  comme complet.
- En cas de doute, l'application bloque et explique. Elle ne devine pas.

Quand deux implémentations hésitent : choisir celle qui rend l'erreur
factuelle impossible, pas celle qui rend l'usage plus fluide.

## Architecture et règle de dépendance

```
apps/web          Next.js (App Router) — interface et routes API
packages/core     domaine : machine à états, contrôles déterministes, types
packages/agents   agents : schémas Zod, prompts versionnés, FournisseurModele
packages/workers  consommateurs BullMQ, un worker par rôle d'agent
packages/db       schéma Prisma, contexte d'accès cloisonné par organisation
```

- `web` et `workers` dépendent de `core`. **`core` ne dépend de rien.**
- Les contrôles déterministes sont des **fonctions pures** dans `core`,
  testées unitairement, sans modèle.
- Aucun SDK de fournisseur hors de son adaptateur (`packages/agents/src/fournisseurs/*`).
- Aucun client Prisma nu dans le code applicatif : accès via un contexte
  porteur de l'organisation.
- Aucune logique métier dans un composant React. Aucune décision de droit
  côté client.
- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`. Pas de `any`
  non justifié.

## Design — règles tenues

- Jetons uniques (`apps/web/src/styles/tokens/*.css`, exposés via Tailwind
  v4 `@theme`) : **aucune couleur, espacement, taille ou durée en dur**
  dans un composant.
- Deux thèmes (clair, sombre, suivi du système), contraste **vérifié par
  script** (`pnpm check:contrast`), pas estimé.
- L'information n'est jamais portée par la couleur seule : un état
  bloquant a une forme et un texte.
- Composants shadcn/Radix copiés et **entièrement restylés** : livrer
  l'apparence par défaut est interdit.
- Une seule famille d'icônes (Lucide). Polices auto-hébergées (Fontsource).
- Aucune chaîne codée en dur : tout passe par `next-intl` (fr, en).
- Chaque écran est capturé (clair/sombre × bureau/téléphone) et **relu**
  avant d'être déclaré fini.

## Interdits (spec §19)

- Ne pas demander à un modèle de recopier un nombre, une date, une version.
- Pas de texte libre en sortie d'agent : structure validée par Zod, sinon échec.
- Pas de « mode rapide » qui saute des contrôles.
- Pas de garde d'autorisation ni de règle métier uniquement côté client.
- Le CORRECTEUR patche des segments, jamais le document entier.
- Jamais de résultat partiel présenté comme complet.
- Pas de clé d'API en base ni dans le code : coffre / variables d'environnement.
- Ne jamais traduire la fiche de faits.
- Pas de repli sur une autre langue ou un autre modèle : échec explicite.
- Pas de requête base sans filtre d'organisation.
- Pas de couleur, espacement ou taille en dur dans un composant.
- Pas d'information portée par la couleur seule.
- Pas d'apparence par défaut de shadcn/ui ni d'aucune bibliothèque.
- Pas d'écran déclaré terminé sans avoir regardé ses captures.
- Pas de SDK de fournisseur dans le code métier.
- La connaissance d'un modèle affiné n'est jamais une source valide.
- Pas de modèle activé sans sonde de capacités et sans qualification.
- Pas d'entraînement sur les sources ni les contenus générés sans
  consentement explicite et tracé.

## Conventions de code — vérifiées par l'outillage

- **Prettier** (`semi: false`, guillemets simples, 100 colonnes, virgules
  finales) : écrire **sans point-virgule**. `pnpm format` avant de
  committer ; `pnpm check` inclut `format:check`.
- **oxlint** (`.oxlintrc.json` à la racine). Les directives de
  désactivation dans du JSX ne sont pas honorées : utiliser une directive
  de fichier `/* oxlint-disable règle -- raison */`, toujours motivée.
  Règles fréquemment rencontrées : `typescript/consistent-type-imports`
  (`import type`), `import/no-named-as-default`, `eslint/no-await-in-loop`,
  `import/no-unassigned-import` (seuls `*.css` et le setup jest-dom sont
  admis).
- **Imports.** Dans `packages/*` : extension `.ts` explicite
  (`allowImportingTsExtensions`), sources exportées telles quelles. Dans
  `apps/web` : sans extension, alias `@/*` ; Next transpile `@comgen/core`.
- **Server / client.** Tout composant qui reçoit un gestionnaire ou une
  fonction en prop, ou qui utilise un hook, porte `'use client'`. Les pages
  et layouts restent des composants serveur.
- **`cn()`** repose sur `tailwind-merge` étendu : tout utilitaire maison
  (`@utility` dans `styles/utilities.css`) doit être déclaré dans les
  groupes de classes de `lib/cn.ts`, sinon `twMerge` le supprime comme un
  conflit (cas vécu avec `border-w`). Bordures directionnelles :
  `border-{t,b,l,r}-w`.
- **`Button`** : `iconOnly` exige `icon` et un libellé en `children`
  (rendu visuellement masqué) ; `asChild` enveloppe les enfants dans un
  `Slottable`. **`Field`** possède l'identifiant du contrôle et le propage
  (`aria-describedby`, `aria-invalid`) : ne pas passer d'`id` au contrôle.
- **Radix RovingFocusGroup** diffère le focus : dans Playwright, naviguer
  aux flèches avec `keyboard.down` / `keyboard.up`, pas `keyboard.press`.
- **axe-core** : `aria-hidden` n'exempte pas du contraste ; un contrôle
  `disabled` l'est.
- **Stories Storybook** : contenu d'exemple français en dur autorisé (outil
  de développement, pas d'interface livrée). Titres `Composants/…`.

## Commandes

```bash
pnpm install
pnpm dev                 # apps/web en développement (port 3000, /design)
pnpm build               # build de tous les paquets — zéro avertissement de type
pnpm typecheck
pnpm lint                # oxlint
pnpm format              # prettier --write ; format:check pour vérifier
pnpm test                # Vitest, tous les paquets
pnpm test:e2e            # Playwright : clavier, axe-core, captures 4 configurations (port 3100)
pnpm check:contrast      # couples de jetons, deux thèmes, seuils WCAG 2.2 AA
pnpm storybook           # port 6006 ; pnpm --filter @comgen/web build-storybook pour vérifier
pnpm check               # typecheck + lint + format:check + test + check:contrast
```

Les captures Playwright vont dans `apps/web/e2e/captures/<projet>/` et ne
sont pas versionnées : les régénérer avec `pnpm test:e2e` puis les lire
(outil Read) avant de conclure.

Un lot est terminé quand : tests verts, critères §17 concernés testés,
`pnpm build` sans avertissement, écrans capturés et relus dans les quatre
configurations, axe-core sans violation grave, `CLAUDE.md` et
`DECISIONS.md` à jour, démonstration possible de bout en bout.

## Méthode

- Un lot = une branche (`lot-N`), petits commits lisibles. Jamais deux lots
  en parallèle. Le lot suivant ne commence pas tant que le courant n'est
  pas vert.
- Pour tout critère de §17 : **le test d'abord**, il doit échouer, puis le
  garde-fou.
- Relire le code en cherchant les contournements : route sans garde,
  écriture de contenu qui ne relance pas les contrôles, requête sans
  filtre d'organisation.
- S'arrêter et demander si : deux exigences se contredisent ; la
  contrainte cardinale rend un parcours impraticable ; un accès manque
  (modèle, messagerie, annuaire) ; on est tenté de contourner un contrôle
  pour faire passer un test.

## Environnement de cette machine

- Node 22, pnpm 10. PostgreSQL 16 et Redis 7 installés **localement**
  (pas de démon Docker) : les lancer avec `pg_ctl` / `redis-server`.
- Chromium Playwright préinstallé dans `/opt/pw-browsers` (build 1194 ↔
  Playwright 1.56) ; ne pas exécuter `playwright install`.
- Pas d'accès réseau sortant direct depuis le navigateur headless
  (proxy) : polices et ressources doivent être auto-hébergées.
- Aucune clé de fournisseur de modèle disponible : les adaptateurs sont
  testés contre un faux serveur HTTP.
- Le serveur MCP de documentation (Context7) a un quota épuisé : vérifier
  les API dans `node_modules` plutôt que d'écrire de mémoire.
