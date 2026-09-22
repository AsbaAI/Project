# 04 — Roadmap

## Jalon 0 — Cadrage *(en cours)*

- [x] Création du dépôt et de la structure
- [x] Formalisation du contexte et des objectifs
- [x] Formalisation du périmètre fonctionnel
- [x] Première version de l'architecture cible
- [ ] Arbitrage des choix techniques ouverts (framework frontend, modèle IA et mode
      d'hébergement, format de stockage de la bibliothèque de templates)
- [ ] Constitution d'un jeu d'exemple anonymisé dans `samples/`

## Jalon 1 — Socle documentaire

Rendre l'application capable de lire et de restituer un document Word sans perte.

- [ ] Ingestion d'un template Word : extraction du texte, de la structure et inventaire
      des médias
- [ ] Ingestion d'une spécification fonctionnelle
- [ ] Rendu : réinjection de contenu dans le template et export Word
- [ ] Test de non-régression sur la fidélité : un aller-retour sans modification doit
      produire un document identique à l'original

## Jalon 2 — Génération monolingue

- [ ] Analyse de la spécification et détection des sections utiles
- [ ] Mapping spécification ↔ structure du template
- [ ] Génération de la communication en une langue
- [ ] Parcours web en quatre étapes, onglet Communication
- [ ] Export Word et PDF

## Jalon 3 — Livrables annexes

- [ ] Rapport de validation et score de qualité
- [ ] Glossaire d'acronymes
- [ ] Plan de test
- [ ] Fiche know-how
- [ ] Affichage par onglets

## Jalon 4 — Multilinguisme

- [ ] Traduction du contenu vers les 7 langues additionnelles
- [ ] Traduction des libellés structurels (titres, en-têtes de tableaux, mentions)
- [ ] Sélecteur de langue et bascule à chaud du document affiché
- [ ] Contrôle de cohérence inter-langues

## Jalon 5 — Bibliothèque et historique

- [ ] Galerie des six familles de templates avec aperçus
- [ ] Sélection d'un modèle depuis la bibliothèque comme alternative au téléversement
- [ ] Historique des générations : entrées, sorties, paramètres, score
- [ ] Écran de paramétrage

## Au-delà

Pistes identifiées, non planifiées :

- diffusion directe vers les listes de destinataires ;
- workflow d'approbation métier avant diffusion ;
- enrichissement automatique du glossaire d'acronymes à partir de l'historique ;
- réutilisation des fiches know-how comme contexte des générations suivantes ;
- extension du catalogue de templates au-delà des six familles initiales.
