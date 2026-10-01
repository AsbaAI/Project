# ComGen

**Génération de communications inter-organisations, vérifiées fait par fait,
approuvées par des humains.**

À partir d'un élément à communiquer — document technique, message rédigé,
ticket, canevas rempli — ComGen produit une version adaptée à chaque
audience, la soumet à une chaîne de vérification automatique, puis à une
approbation humaine, avant envoi sur les canaux configurés.

La spécification de référence est `docs/SPECIFICATION.md`. Elle est
contractuelle : en cas de divergence entre la spécification et le code,
c'est le code qui est en tort.

---

## Contrainte cardinale

**L'application ne fait jamais dire à une communication ce que la source ne
dit pas.** Cette règle prime sur l'ergonomie, la rapidité et l'élégance du
code.

- Tout texte généré est découpé en affirmations ; chaque affirmation est
  rattachée à un fait cité mot pour mot dans la source. Une affirmation sans
  fait d'appui bloque l'envoi.
- Nombres, dates, versions, identifiants et noms propres ne sont jamais
  écrits par un modèle de langage : ils sont recopiés depuis la source et
  vérifiés par comparaison de chaînes, hors de tout appel de modèle.
- Aucun chemin de code n'envoie sans approbation humaine. Pas de drapeau,
  pas de rôle privilégié, pas d'API de contournement.
- En cas de doute, l'application bloque et explique. Elle ne devine pas.

## Ce que fait l'application

| Étape          | Ce qui se passe                                                                             |
| -------------- | ------------------------------------------------------------------------------------------- |
| Dépôt          | Import d'un document (docx, pdf, xlsx), d'un message, d'un ticket ou d'un canevas           |
| Fiche de faits | Extraction des faits, chacun cité mot pour mot ; revue et validation humaine                |
| Génération     | Une variante par audience (persona × langue × canal), écrite par référence aux faits        |
| Contrôles      | Vérification déterministe des valeurs, rattachement de chaque affirmation, garde éditoriale |
| Correction     | Correctif ciblé segment par segment ; toute édition relance les contrôles                   |
| Approbation    | Relecture puis approbation humaine, par organisation et par région ; journal d'audit        |
| Envoi          | Planification par fuseau, envoi sur les canaux configurés, traçabilité complète             |

Les modèles de langage sont accessibles par une couche d'abstraction unique
(`FournisseurModele`) : Anthropic, OpenAI-compatibles, Azure, Bedrock,
Vertex et modèles hébergés par l'organisation, interchangeables sans
toucher au domaine. Un modèle n'est activé qu'après sonde de capacités et
qualification.

## Architecture

```
apps/web          Next.js (App Router) — interface et routes API
packages/core     domaine : machine à états, contrôles déterministes, types partagés
packages/agents   agents : schémas Zod, prompts versionnés, FournisseurModele et adaptateurs
packages/workers  consommateurs BullMQ, un worker par rôle d'agent
packages/db       schéma Prisma, accès aux données cloisonné par organisation
```

Règle de dépendance : `web` et `workers` dépendent de `core` ; **`core` ne
dépend de rien**. Les contrôles déterministes sont des fonctions pures dans
`core`, testées sans modèle.

## Pile

Next.js 16 (App Router) · React 19 · TypeScript strict avec
`noUncheckedIndexedAccess` · Tailwind CSS v4 + primitives Radix, composants
maison entièrement restylés · next-intl (fr, en) · PostgreSQL 16 + Prisma ·
Redis + BullMQ · S3 compatible (MinIO) · TipTap · NextAuth (OIDC) ·
Vitest · Playwright + axe-core · Storybook · oxlint · Prettier.

## Démarrage

Prérequis : Node ≥ 22.12, pnpm 10, PostgreSQL 16, Chromium Playwright
(Redis 7 à partir du lot 3).

```bash
pnpm install
cp .env.example .env     # puis renseigner AUTH_SECRET (openssl rand -base64 32)
pnpm db:migrate          # crée la base si besoin et applique les migrations
pnpm db:seed             # jeu de démonstration (§20) : 2 organisations, 6 communications
pnpm dev                 # http://localhost:3000 — connexion par compte de démonstration
```

Le rôle PostgreSQL `comgen` doit pouvoir créer des bases (`CREATEDB`) :
chaque suite de tests a la sienne, créée par Prisma au premier passage.
Le compte de démonstration conseillé pour découvrir l'application est
Claire Fontaine (rédactrice, Helvea) ; COM-2026-0002 porte une
contradiction entre deux sources à trancher.

## Commandes

```bash
pnpm build               # build de tous les paquets, zéro avertissement
pnpm typecheck
pnpm lint                # oxlint
pnpm format              # prettier --write ; format:check pour vérifier
pnpm test                # Vitest, tous les paquets
pnpm test:e2e            # Playwright sur le build : parcours, clavier, axe-core, captures 4 configurations
pnpm check:contrast      # couples de jetons, deux thèmes, seuils WCAG 2.2 AA
pnpm storybook           # Storybook sur le port 6006
pnpm check               # typecheck + lint + format:check + test + check:contrast
```

Les captures Playwright (clair/sombre × bureau/téléphone) sont écrites dans
`apps/web/e2e/captures/` et relues avant qu'un écran soit déclaré terminé ;
elles ne sont pas versionnées.

## Avancement

Lots 0 et 1 selon la spécification (§18), puis la refonte du parcours validée
par le propriétaire (voir `DECISIONS.md`), une branche par étape.

| Étape | Contenu                                                                                   | État     |
| ----- | ----------------------------------------------------------------------------------------- | -------- |
| Lot 0 | Système de design, internationalisation, `FournisseurModele` + adaptateur Anthropic       | livré    |
| Lot 1 | Schéma, machine à états, cloisonnement, authentification, dépôt, fiche de faits           | en revue |
| R1    | Jetons inspirés de TotalEnergies, navigation latérale, accueil, pages Analyses/Paramètres | en revue |
| R2    | Assistant pas à pas : départ, gabarit, contenu, vérification des faits, destinataires     | à venir  |
| R3    | Agents (extraction, contexte, suggestion, rédaction, relecture), génération en direct     | à venir  |
| R4    | Approbation, envoi (simulé puis réel), tableau de bord par statut                         | à venir  |
| R5    | Paramètres : modèles, personas, listes de diffusion, gabarits                             | à venir  |
| R6    | Analyses et historique : indicateurs, recherche, export PDF/DOCX, duplication             | à venir  |

## Documentation

| Document                                         | Contenu                                                        |
| ------------------------------------------------ | -------------------------------------------------------------- |
| [`docs/SPECIFICATION.md`](docs/SPECIFICATION.md) | spécification contractuelle, sections 1 à 21                   |
| [`CLAUDE.md`](CLAUDE.md)                         | mémoire de travail : contrainte cardinale, règles, commandes   |
| [`DECISIONS.md`](DECISIONS.md)                   | journal des choix non dictés par la spécification              |
| `docs/archive/cadrage-initial/`                  | documents antérieurs à la spécification, sans valeur normative |

---

_Projet interne. Ne pas diffuser en dehors du périmètre autorisé._
