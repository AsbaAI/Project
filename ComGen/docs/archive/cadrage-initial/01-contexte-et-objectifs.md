# 01 — Contexte et objectifs

## Contexte métier

Chaque livraison applicative doit être annoncée au réseau : concessions, équipes
après-vente, responsables de marché. Cette annonce prend la forme d'un document
formaté — note de livraison, bulletin technique, note pays — produit à partir de la
spécification fonctionnelle de la livraison.

Cette production est aujourd'hui entièrement manuelle. Elle mobilise un rédacteur
qui doit, pour chaque livraison :

1. lire la spécification fonctionnelle et en isoler ce qui concerne le destinataire ;
2. reformuler ce contenu technique en langage métier ;
3. le placer dans un template Word imposé, sans en altérer la charte ;
4. produire les versions linguistiques attendues par les marchés ;
5. rédiger le plan de test associé ;
6. relire l'ensemble.

## Problèmes constatés

| Problème                    | Conséquence                                                           |
| --------------------------- | --------------------------------------------------------------------- |
| Cycle long                  | la communication arrive après la livraison, ou la retarde             |
| Qualité variable            | le résultat dépend du rédacteur et du temps disponible                |
| Mise en forme fragile       | copier-coller depuis la spécification qui casse la charte du template |
| Traductions désynchronisées | les versions linguistiques divergent de la version source             |
| Acronymes non explicités    | le destinataire métier ne comprend pas le contenu                     |
| Aucune capitalisation       | chaque communication repart de zéro                                   |

## Objectifs

**Objectif principal** — produire, à partir d'une spécification fonctionnelle et d'un
template, une communication complète, multilingue et conforme, en quelques minutes.

**Objectifs dérivés**

- _Conformité_ — le document produit respecte le template à l'identique : logo,
  tableaux, captures d'écran, styles.
- _Exhaustivité_ — rien d'important dans la spécification n'est omis ; ce qui manque
  est signalé plutôt que silencieusement ignoré.
- _Mesurabilité_ — chaque génération porte un score de qualité et un rapport de
  validation consultable.
- _Traçabilité_ — l'historique conserve les entrées, les sorties et les paramètres de
  chaque génération.
- _Capitalisation_ — la fiche know-how produite alimente les communications suivantes.

## Indicateurs

| Indicateur                                | Cible                                 |
| ----------------------------------------- | ------------------------------------- |
| Délai de production                       | < 10 minutes de bout en bout          |
| Score de qualité moyen                    | ≥ 85 / 100                            |
| Langues couvertes par génération          | 8                                     |
| Taux de reprise manuelle après génération | < 20 % du document                    |
| Fidélité au template                      | mise en forme préservée sans retouche |

## Hors périmètre (à ce stade)

- La diffusion elle-même (envoi aux listes, publication sur le portail réseau).
- La gestion des droits et des workflows d'approbation métier.
- La traduction certifiée à valeur contractuelle : les sorties restent des propositions
  soumises à relecture.
