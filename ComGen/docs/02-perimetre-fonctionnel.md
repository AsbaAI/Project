# 02 — Périmètre fonctionnel

## Navigation générale

L'application s'organise en quatre espaces :

| Espace | Rôle |
|---|---|
| **Generator** | le parcours de génération, en quatre étapes |
| **Templates** | la bibliothèque de modèles de communication |
| **History** | les générations passées, leurs entrées et leurs sorties |
| **Settings** | paramétrage : langues par défaut, modèle IA, seuils de qualité |

## Le parcours de génération

### Étape 1 — Documents

Deux entrées sont requises.

**Spécification fonctionnelle.** Document source de la livraison, déposé par glisser-déposer
(format Word). C'est lui qui porte le contenu : évolutions, corrections, impacts,
périmètre de déploiement.

**Template de communication.** Deux modes au choix :

- *Téléverser un template Word* — l'utilisateur fournit son propre fichier. Sa mise en
  forme est préservée intégralement.
- *Choisir dans la bibliothèque* — l'utilisateur sélectionne un modèle prédéfini dans
  la galerie.

Le bouton d'analyse ne s'active qu'une fois les deux entrées fournies.

### Étape 2 — Analyse

ComGen traite les deux documents :

- extraction du contenu de la spécification et identification des sections utiles ;
- détection de la structure du template : rubriques attendues, tableaux, emplacements
  réservés aux images ;
- mise en correspondance entre ce que la spécification contient et ce que le template
  réclame.

L'avancement est affiché à l'utilisateur pendant le traitement.

### Étape 3 — Génération

Cinq livrables sont produits et présentés par onglets.

| Onglet | Contenu |
|---|---|
| **Communication** | le document final, dans la mise en forme du template, avec sélecteur de langue |
| **Rapport de validation** | contrôles de cohérence, éléments manquants, score de qualité |
| **Acronymes** | glossaire des sigles détectés et leur définition |
| **Plan de test** | scénarios de test déduits de la spécification |
| **Know-how** | synthèse capitalisable pour les prochaines communications |

Un **score de qualité** sur 100 accompagne la génération et résume le rapport de validation.

### Étape 4 — Export

| Action | Format |
|---|---|
| Copier | texte brut, vers le presse-papiers |
| Exporter la communication | Word |
| Imprimer / PDF | PDF |
| Exporter le plan de test | fichier séparé |

## Bibliothèque de templates

Six familles au catalogue initial :

| Template | Description |
|---|---|
| **Basket Communication** | note de livraison standard : section Évolutions, tableau des corrections, informations de déploiement. *Modèle recommandé par défaut.* |
| **Country Note** | note adressée à un marché spécifique |
| **Technical Bulletin** | bulletin technique destiné aux équipes techniques |
| **Release Note** | note de version applicative |
| **Training Communication** | communication de formation |
| **Warranty Alert** | alerte garantie |

Chaque entrée de la galerie présente un aperçu de la mise en page avant sélection.

## Multilinguisme

Huit langues sont générées depuis la source unique :

| Code | Langue |
|---|---|
| `en` | English |
| `fr` | Français |
| `de` | Deutsch |
| `it` | Italiano |
| `es` | Español |
| `pt` | Português |
| `nl` | Nederlands |
| `pl` | Polski |

Le changement de langue s'applique à l'intégralité du document : corps de texte, titres
de sections, en-têtes de tableaux, mentions de rôles destinataires, formules de
politesse. Les éléments hérités du template (logo, captures, schémas) ne sont pas
traduits — ils sont conservés tels quels.

## Préservation de la mise en forme

Lorsqu'un template Word est téléversé, les éléments non textuels sont identifiés et
réservés :

- logo d'en-tête ;
- captures d'écran illustratives ;
- schémas d'architecture et de flux ;
- styles de tableaux, encadrés d'information, blocs de mise en avant.

Le contenu généré est injecté autour de ces éléments, qui restent intacts dans le
document exporté.

## Règles de gestion

- Aucune génération n'est lancée tant que les deux documents d'entrée ne sont pas fournis.
- Un contenu de la spécification sans emplacement correspondant dans le template est
  signalé dans le rapport de validation, jamais supprimé silencieusement.
- Une rubrique du template sans contenu source disponible est signalée comme manquante.
- Tout acronyme détecté et non défini dans la spécification est listé dans l'onglet
  Acronymes et compté dans le score de qualité.
