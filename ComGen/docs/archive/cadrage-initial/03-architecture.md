# 03 — Architecture

> Document de cadrage. Les choix techniques marqués *(à arbitrer)* restent ouverts et
> seront tranchés avant le premier développement.

## Vue d'ensemble

```
   Utilisateur
        │
        ▼
┌───────────────────────────────────────────────────────┐
│  frontend/          Interface web                     │
│  Generator · Templates · History · Settings           │
└───────────────────────┬───────────────────────────────┘
                        │  HTTP / JSON
                        ▼
┌───────────────────────────────────────────────────────┐
│  backend/           API et orchestration              │
│                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │ Ingestion   │→ │ Analyse     │→ │ Génération    │  │
│  │ documents   │  │ & mapping   │  │ des livrables │  │
│  └─────────────┘  └─────────────┘  └───────┬───────┘  │
│                                            │          │
│  ┌─────────────┐  ┌─────────────┐  ┌───────▼───────┐  │
│  │ Validation  │← │ Traduction  │← │ Rendu Word    │  │
│  │ & scoring   │  │ multilingue │  │ / PDF         │  │
│  └─────────────┘  └─────────────┘  └───────────────┘  │
└───────────────────────┬───────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   templates/      Modèle IA        Historique
   bibliothèque    (LLM)            des générations
```

## Composants

### `frontend/` — interface web

Application web servant le parcours en quatre étapes, la galerie de templates,
l'historique et les paramètres. Responsable de l'affichage des cinq onglets de sortie,
du sélecteur de langue et des actions d'export côté client.

*(à arbitrer)* : application statique, ou framework à composants.

### `backend/` — API et orchestration

Six responsabilités distinctes :

| Module | Rôle |
|---|---|
| **Ingestion** | réception des fichiers, extraction du texte et de la structure des documents Word, inventaire des éléments non textuels à préserver |
| **Analyse & mapping** | identification des sections utiles de la spécification, détection de la structure du template, mise en correspondance des deux |
| **Génération** | production des cinq livrables : communication, validation, acronymes, plan de test, know-how |
| **Traduction** | déclinaison de la communication dans les huit langues cibles, y compris les libellés structurels |
| **Rendu** | réinjection du contenu dans le template, production des fichiers Word et PDF |
| **Validation & scoring** | contrôles de cohérence, détection des manques, calcul du score de qualité |

### `templates/` — bibliothèque

Stockage des modèles de communication et de leurs métadonnées : famille, description,
aperçu, structure attendue.

### `samples/` — jeux d'exemple

Spécifications fonctionnelles et communications de référence servant aux tests et aux
démonstrations. **Aucune donnée réelle non anonymisée ne doit y figurer.**

### `tests/` — tests automatisés

Tests unitaires des modules backend, tests d'intégration du parcours complet, et
tests de non-régression sur la fidélité au template.

## Flux de traitement

1. **Dépôt** — la spécification et le template sont reçus et stockés temporairement.
2. **Extraction** — le texte, la structure et l'inventaire des médias sont produits pour
   chaque document.
3. **Mapping** — chaque rubrique du template est associée au contenu source correspondant ;
   les écarts dans les deux sens sont enregistrés.
4. **Génération** — le modèle IA produit le contenu de chaque rubrique, puis les quatre
   livrables annexes.
5. **Traduction** — la communication est déclinée dans les langues demandées.
6. **Validation** — les contrôles s'appliquent sur le résultat ; le score est calculé.
7. **Rendu** — le contenu est réinjecté dans le template, les médias d'origine sont
   restitués, les fichiers d'export sont produits.
8. **Archivage** — entrées, sorties, paramètres et score sont consignés dans l'historique.

## Points d'attention

**Fidélité au template.** C'est la contrainte structurante. Le rendu ne doit pas
reconstruire le document mais y injecter du contenu, afin que logos, captures et styles
restent exactement ceux du fichier d'origine.

**Traitement des médias.** Les images du template sont référencées, jamais régénérées.
Leur emplacement dans le document de sortie doit être stable quelle que soit la langue.

**Cohérence multilingue.** Les huit versions doivent porter le même contenu. Une
divergence entre langues est un défaut de qualité à détecter, pas une variante acceptable.

**Confidentialité.** Les spécifications fonctionnelles sont des documents internes. Le
choix du modèle IA et de son mode d'hébergement doit respecter les règles de traitement
des données applicables *(à arbitrer)*.

**Reproductibilité.** Une même entrée avec les mêmes paramètres doit produire un
résultat stable ; la génération est consignée avec sa version de modèle et ses paramètres.
