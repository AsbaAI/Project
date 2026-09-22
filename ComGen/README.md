# ComGen

**Générateur de communications assisté par IA.**

ComGen transforme une **spécification fonctionnelle** et un **template de communication**
en un livrable de communication complet, prêt à diffuser : le document final mis en forme,
sa traduction dans les langues des marchés, son plan de test, son rapport de validation,
son glossaire d'acronymes et sa fiche de capitalisation (know-how).

---

## 1. Le problème

La diffusion d'une évolution applicative vers le réseau (concessions, après-vente, marchés)
suppose aujourd'hui un travail manuel, répétitif et coûteux :

- relire une spécification fonctionnelle de plusieurs dizaines de pages ;
- en extraire ce qui concerne réellement le destinataire (évolutions, corrections, impacts métier) ;
- recopier ce contenu dans un template Word imposé, en conservant sa charte, ses logos,
  ses tableaux et ses captures d'écran ;
- décliner le tout dans les langues des pays concernés ;
- reconstruire à la main le plan de test associé ;
- vérifier la cohérence, les acronymes non explicités, les oublis.

Le cycle se compte en jours, la qualité dépend du rédacteur, et rien n'est capitalisé
d'une communication à l'autre.

## 2. L'objectif

Réduire ce cycle à quelques minutes, avec un niveau de qualité **mesuré** et **reproductible** :

| Objectif | Indicateur visé |
|---|---|
| Délai de production d'une communication | de plusieurs jours à quelques minutes |
| Respect du template imposé | mise en forme, logos et images préservés à l'identique |
| Couverture linguistique | 8 langues générées en une passe |
| Qualité | score de qualité affiché et rapport de validation détaillé |
| Capitalisation | historique et fiche know-how par communication |

## 3. Le parcours utilisateur

```
  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │ 1. Documents │ → │ 2. Analyse   │ → │ 3. Génération│ → │ 4. Export    │
  │              │   │              │   │              │   │              │
  │ Spéc. fonc.  │   │ Extraction   │   │ Communication│   │ Word / PDF   │
  │ + Template   │   │ du contenu   │   │ Validation   │   │ Copie        │
  │  (upload ou  │   │ Détection de │   │ Acronymes    │   │ Historique   │
  │  bibliothèque│   │ la structure │   │ Plan de test │   │              │
  │  de modèles) │   │ du template  │   │ Know-how     │   │              │
  └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
```

**Étape 1 — Documents.** L'utilisateur dépose la spécification fonctionnelle, puis choisit
son template : soit il téléverse son propre fichier Word, soit il sélectionne un modèle
dans la bibliothèque intégrée.

**Étape 2 — Analyse.** ComGen lit les deux documents, identifie les sections porteuses de
sens dans la spécification et reconstruit la structure attendue par le template
(rubriques, tableaux, emplacements d'images).

**Étape 3 — Génération.** Cinq livrables sont produits en parallèle et présentés par onglets :

- **Communication** — le document final, dans la mise en forme du template ;
- **Rapport de validation** — contrôles de cohérence, points manquants, score de qualité ;
- **Acronymes** — glossaire des sigles rencontrés, avec leur définition ;
- **Plan de test** — scénarios de test déduits de la spécification ;
- **Know-how** — synthèse capitalisable pour les communications suivantes.

**Étape 4 — Export.** Word, PDF, ou copie directe. Chaque génération est conservée
dans l'historique.

## 4. Périmètre fonctionnel

### Bibliothèque de templates

Six familles de communication sont prévues au catalogue :

| Template | Usage |
|---|---|
| Basket Communication | note de livraison standard : évolutions, tableau des corrections, informations de déploiement |
| Country Note | note à destination d'un marché spécifique |
| Technical Bulletin | bulletin technique |
| Release Note | note de version applicative |
| Training Communication | communication de formation |
| Warranty Alert | alerte garantie |

### Langues

Huit langues générées depuis une source unique :
**EN** · **FR** · **DE** · **IT** · **ES** · **PT** · **NL** · **PL**

Le changement de langue s'applique à l'ensemble du document, y compris aux titres de
sections, aux libellés de tableaux et aux mentions légales.

### Préservation de la mise en forme

Lorsqu'un template Word est téléversé, ComGen en conserve les éléments non textuels
— logo d'en-tête, captures d'écran, schémas d'architecture, styles de tableaux — et se
contente d'y injecter le contenu généré. Le document produit reste conforme à la charte
d'origine.

## 5. Structure du dépôt

```
ComGen/
├── README.md              # ce document
├── .gitignore
├── docs/                  # documentation de conception
│   ├── 01-contexte-et-objectifs.md
│   ├── 02-perimetre-fonctionnel.md
│   ├── 03-architecture.md
│   └── 04-roadmap.md
├── frontend/              # interface web (générateur, bibliothèque, historique)
├── backend/               # API, orchestration IA, traitement documentaire
├── templates/             # bibliothèque de templates de communication
├── samples/               # jeux d'exemple (spécifications, communications de référence)
└── tests/                 # tests automatisés
```

Les répertoires de code sont volontairement vides à ce stade : ce dépôt pose le cadre
et la documentation avant l'implémentation.

## 6. Démarrage

```bash
git clone git@github.com:AsbaAI/ComGen.git
cd ComGen
```

La procédure d'installation et de lancement sera renseignée à l'arrivée du premier
composant exécutable (voir `docs/04-roadmap.md`).

## 7. Documentation

| Document | Contenu |
|---|---|
| [`docs/01-contexte-et-objectifs.md`](docs/01-contexte-et-objectifs.md) | contexte métier, problème adressé, objectifs et indicateurs |
| [`docs/02-perimetre-fonctionnel.md`](docs/02-perimetre-fonctionnel.md) | parcours détaillé, écrans, livrables générés |
| [`docs/03-architecture.md`](docs/03-architecture.md) | composants, flux de traitement, choix techniques |
| [`docs/04-roadmap.md`](docs/04-roadmap.md) | jalons et suite des travaux |

---

*Projet interne. Ne pas diffuser en dehors du périmètre autorisé.*
