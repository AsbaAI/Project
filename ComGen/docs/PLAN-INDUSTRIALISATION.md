# Plan d'industrialisation — ComGen

Suite de `docs/AUDIT-INDUSTRIALISATION.md`. Ce plan découpe le travail en
lots livrables, dans l'ordre où ils doivent être faits. Chaque lot dit ce
qu'il livre, ce qu'il touche, comment on le teste et quand il est fini.

## 0. Règles qui s'appliquent à tous les lots

- **Un lot = une branche** (`refonte-3`, `refonte-4`, …), petits commits.
  Le lot suivant ne commence pas tant que le courant n'est pas vert
  (CLAUDE.md, « Méthode »).
- **Le test d'abord** : il doit échouer, puis on écrit le garde-fou.
- **Contrainte cardinale inchangée** : aucun lot ne relâche un contrôle
  déterministe, aucun chemin n'envoie sans approbation humaine.
- **Aucune dépendance nouvelle sans justification** écrite dans
  `DECISIONS.md`. Les seules prévues sont `bullmq` (L7, déjà annoncé par
  l'architecture) et un outil de charge (L19).
- **Rien d'affiché qui ne soit réel** : un réglage enregistré mais sans
  effet le dit à l'écran ; une métrique non mesurée s'affiche « non
  mesuré », jamais 0.
- **Un lot est fini** quand : `pnpm check` vert, `pnpm build` sans
  avertissement, `pnpm test:e2e` vert, écrans capturés et relus dans les
  quatre configurations, `CLAUDE.md` et `DECISIONS.md` à jour.

Tailles indicatives : **S** = moins d'une journée de travail, **M** = une
à trois journées, **L** = plus de trois journées. Ce sont des estimations
avant étude détaillée, pas des engagements.

## 1. Vue d'ensemble

| Phase                        | Lots      | Bloqué par une décision ?                           | Résultat                                                           |
| ---------------------------- | --------- | --------------------------------------------------- | ------------------------------------------------------------------ |
| 1. Socle de fiabilité        | L1 à L6   | Non                                                 | Santé, retries, audit, sauvegarde, durcissement, journal structuré |
| 2. Exécution en arrière-plan | L7, L8    | Hébergement des workers (D4) pour la prod seulement | Génération en file, reprise, envois idempotents                    |
| 3. Qualité mesurable         | L9        | Non                                                 | Banc de qualité et golden dataset, d'abord sur la simulation       |
| 4. Vrais modèles             | L10 à L13 | **Clé de modèle (D1)**                              | Agents réels qualifiés, boucle de correction bornée                |
| 5. Agent Control Center      | L14       | Non (L10 pour le test isolé réel)                   | Configuration complète, versionnée, restaurable                    |
| 6. Observabilité             | L15       | Non                                                 | Console de traces, Workflow Monitor, coûts mesurés                 |
| 7. Documents et gabarits     | L16, L17  | Stockage (D3), antivirus (D5)                       | Fichiers persistants, gabarits versionnés et prévisualisés         |
| 8. Sécurité et gouvernance   | L18       | **IdP (D2)**                                        | Connexion d'entreprise, rôles alignés, rétention                   |
| 9. Charge et production      | L19, L20  | D1 à D5                                             | Capacité mesurée, procédure de déploiement et de rollback          |

Les phases 1, 3, 5 et 6 avancent **sans attendre** aucune décision
extérieure. C'est par elles que je propose de commencer.

## 2. Décisions attendues

| #   | Décision                                                                                                      | Lots bloqués | Sans réponse, on peut quand même…                             |
| --- | ------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------- |
| D1  | Fournisseur de modèle et clé de TEST (Anthropic, passerelle interne, autre)                                   | L10 à L13    | construire le banc de qualité (L9) et le Control Center (L14) |
| D2  | Fournisseur d'identité (Entra ID ou autre OIDC)                                                               | L18          | tout le reste ; l'OIDC générique existe déjà                  |
| D3  | Stockage objet compatible S3 (fournisseur, bucket, rétention)                                                 | L16, L20     | tester l'adaptateur S3 contre un serveur local                |
| D4  | Hébergement des workers (service toujours allumé)                                                             | L20          | développer et tester les workers en local (Redis installé)    |
| D5  | Antivirus (ClamAV ou service, ou refus consigné)                                                              | L16          | tester l'adaptateur `clamd` contre un faux démon              |
| D6  | Nom du client (TotalEnergies ou jeu Helvea/Kestrel)                                                           | aucun        | garder le jeu de démonstration actuel                         |
| D7  | Rôles cibles (Administrateur/Éditeur/Validateur/Lecteur) et leur correspondance avec les quatre rôles actuels | L18          | garder les rôles actuels                                      |
| D8  | Charge cible (utilisateurs, générations simultanées, volume mensuel)                                          | L19          | mesurer quand même, sans conclure « suffisant »               |
| D9  | Constructeur de gabarits : il avait été exclu ; la mission demande de créer et modifier des gabarits          | L17          | installer et activer les exemples (existant)                  |

---

## Phase 1 — Socle de fiabilité (sans décision extérieure)

### L1 — Santé et disponibilité · S

**Objectif** : un hébergeur sait si l'application vit et si elle peut servir.

- `GET /api/sante` : 200 tant que le processus répond. Aucune dépendance.
- `GET /api/pret` : 200 si la base répond, et si Redis et le stockage
  répondent quand ils sont configurés ; 503 sinon, avec la liste des
  dépendances en échec, **sans** détail technique ni secret.
- Aucune session requise, aucune donnée d'organisation exposée.

**Tests d'abord** : base arrêtée → 503 `base` ; stockage injoignable → 503
`stockage` ; réponse sans chaîne de connexion ni message d'exception.

**Fini quand** : les deux routes répondent en moins de 1 s sur la machine
de test, et `docs/DEPLOIEMENT.md` les mentionne.

### L2 — Retries, backoff et classement des erreurs · M

**Objectif** : une erreur temporaire du fournisseur ne fait pas échouer une
génération ; une erreur durable échoue vite et le dit.

- Dans l'orchestrateur (`packages/agents/src/agents/orchestrateur.ts`), pas
  dans l'adaptateur : au plus **2 nouvelles tentatives**, backoff
  exponentiel avec gigue, délai injecté (comme `attendre`).
- Réessayé : délai dépassé, 429, 5xx, connexion coupée.
- **Jamais réessayé** : authentification refusée, configuration absente,
  sortie non structurée, sortie hors schéma (§19 : on échoue, on ne répare
  pas).
- Chaque tentative laisse une ligne dans `Execution` (numéro de tentative,
  cause), jamais un texte partiel.
- Annulation propagée (`AbortSignal`) : une génération annulée ne réessaie pas.

**Tests d'abord** (faux fournisseur) : 429 puis succès → succès en 2
appels ; trois 5xx → échec `INDISPONIBLE` après 3 appels ; 401 → échec
après 1 appel ; sortie invalide → échec après 1 appel.

### L3 — Journal d'audit non modifiable · M

**Objectif** : toute modification de configuration et toute décision
humaine laisse une trace que personne ne peut effacer depuis l'application.

- Table `JournalAudit` : organisation, acteur, action, objet, horodatage,
  résumé du changement (avant/après **sans** contenu confidentiel ni secret).
- Déclencheur SQL qui refuse `UPDATE` et `DELETE` ; le rôle applicatif n'a
  que `INSERT` et `SELECT`.
- Alimentée par : consignes d'agent, personas, listes, gabarits, ITSM,
  approbations, envois, changements d'état manuels.
- Écran de consultation réservé aux administrateurs, filtrable.

**Tests d'abord** : un `UPDATE` direct échoue ; chaque service cité écrit
sa ligne dans la même transaction que le changement ; une lecture est
cloisonnée par organisation.

### L4 — Sauvegarde et restauration testées · S

**Objectif** : une restauration a été faite au moins une fois et fonctionne.

- Script `scripts/sauvegarde.sh` (`pg_dump` au format custom, horodaté) et
  `scripts/restauration.sh` (vers une base cible nommée, jamais la base
  courante par défaut).
- Test automatisé : seed → sauvegarde → restauration dans une base jetable
  → comptes de lignes identiques par table.
- Procédure, RPO et RTO **proposés** écrits dans `docs/EXPLOITATION.md` ;
  les valeurs cibles restent à valider avec le client.

### L5 — Durcissement · M

- En-têtes de sécurité dans `next.config.ts` : CSP stricte (polices et
  ressources auto-hébergées, donc sans domaine tiers), HSTS,
  `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`.
- Limitation de débit sur la connexion et la génération. En mémoire pour
  une instance ; sur Redis dès L7 (plusieurs instances). Écrit dans
  `DECISIONS.md`.
- Vérification au démarrage : `COMGEN_ENV=demo` ou `AUTH_SIMULATEUR=true`
  refusés si l'hébergement se déclare production.
- `ITSM_MODE` : défaut `desactive` au lieu de `servicenow` (une
  installation vierge ne doit pas tenter d'appel réel).
- Fichiers déposés : contrôle du type par **signature** (premiers octets),
  pas seulement par extension.

**Tests d'abord** : en-têtes présents sur une page et une route API ;
11ᵉ tentative de connexion en une minute refusée ; démarrage refusé en
production avec le simulateur ; un `.pdf` qui est un exécutable est refusé.

### L6 — Journal structuré et identifiant de trace · M

**Objectif** : une génération se retrace de la requête jusqu'à la base.

- Un journaliseur minimal (lignes JSON sur la sortie standard) dans
  `apps/web/src/server/journal.ts`. Pas de dépendance : le besoin tient en
  quelques fonctions. Champs : niveau, horodatage, `traceId`,
  `communicationId`, `executionId`, agent, durée, code d'erreur.
- `traceId` créé à l'entrée de la génération, transmis à l'orchestrateur et
  écrit dans `Execution`.
- **Jamais** dans le journal : texte des sources, prompts complets, contenu
  des variantes, secrets. Masquage appliqué en sortie (test dédié).
- Remplacement des `console.error` existants (`generation.ts`, `flux-generation.ts`).

**Tests d'abord** : une génération produit des lignes avec le même
`traceId` ; une ligne contenant une clé ou une citation de source est
masquée.

---

## Phase 2 — Exécution en arrière-plan

### L7 — File et workers · L

**Objectif** : une génération survit à l'arrêt du serveur web et ne
s'exécute jamais deux fois.

- `packages/workers` : consommateurs BullMQ sur Redis, comme prévu par
  l'architecture. Dépendance `bullmq` justifiée dans `DECISIONS.md`.
- La route `/api/variantes/[varianteId]/generation` **dépose** une tâche
  au lieu d'exécuter ; l'écran suit l'avancement (flux ou relecture
  périodique) depuis la base, pas depuis la mémoire du serveur.
- Clé d'idempotence par génération demandée : un double clic ne crée
  qu'une tâche (contrainte d'unicité en base).
- Reprise : une tâche interrompue reprend depuis la dernière étape
  terminée, ou échoue proprement ; jamais de texte partiel écrit.
- Les écritures de contenu passent toujours par
  `contexte.ecrireContenuVariante` (les déclencheurs d'annulation restent
  valables).

**Tests d'abord** : worker tué au milieu → la tâche reprend et la
variante finale est identique à une exécution sans arrêt ; deux dépôts
identiques → une seule exécution ; Redis indisponible → l'écran dit
« génération impossible », pas « en cours » indéfiniment.

### L8 — Envois idempotents · S

- Clé d'idempotence unique par envoi en base ; un rejeu renvoie l'envoi
  existant.
- L'envoi reste `SIMULATION` tant qu'aucun canal de diffusion réel n'est
  branché (décision à venir), et l'écran continue de le dire.

**Tests d'abord** : deux confirmations concurrentes → un seul `Envoi` ;
une confirmation après annulation → refus.

---

## Phase 3 — Qualité mesurable

### L9 — Banc de qualité et golden dataset · M

**Objectif** : mesurer la qualité de façon reproductible **avant** de
brancher un modèle, pour que la première mesure réelle ait un point de
comparaison.

- `packages/core/src/qualite/` : métriques **déterministes**, fonctions
  pures :
  - fidélité des valeurs (nombres, dates, versions, identifiants, noms
    identiques à la source, selon la règle de comparaison de CLAUDE.md) ;
  - couverture des faits retenus ;
  - mentions obligatoires présentes ;
  - longueur dans la cible du persona ;
  - absence de segments libres porteurs de valeur.
- `qualite/jeu/` : **20 cas** de référence (incident, maintenance,
  changement, sécurité, note interne) × **4 audiences**, versionnés, avec
  la sortie attendue sur les points mesurables.
- Commande `pnpm qualite` : exécute la chaîne sur le jeu, écrit un rapport
  horodaté, compare à la version précédente.
- Un juge LLM, plus tard, ne fera que **signaler** ; il ne valide jamais seul.

**Fini quand** : le banc tourne sur les agents simulés, et un défaut
injecté volontairement (valeur modifiée) fait baisser la métrique de
fidélité.

---

## Phase 4 — Vrais modèles (demande D1)

### L10 — Branchement du fournisseur et configuration des modèles · M

- Table `ModeleConfigure` : organisation, fournisseur, identifiant exact du
  modèle, **nom de la variable** qui porte la clé (même règle que
  `ITSM_*` : contrainte SQL sur le nom, jamais la valeur), capacités
  sondées, état de qualification.
- Sonde de capacités avant toute activation (interdit §19 : « pas de
  modèle activé sans sonde de capacités et sans qualification »).
- Les services passent le fournisseur à `fabriqueAgents({ fournisseur })`,
  aujourd'hui appelé sans argument (`generation.ts`, `sources.ts`, `itsm.ts`).
- Test de fumée réel, activé seulement si la clé de TEST est présente.

### L11 — Rédacteur réel · L

- Agent `REDACTEUR` qui implémente `Agent<E, S>` avec le schéma de sortie
  existant (`schemaSortieRedacteur` : segments de texte et **références**
  de faits). Le modèle n'écrit jamais une valeur.
- Consigne de l'organisation (`ConsigneAgent`) et voix du persona
  réellement transmises ; leur version voyage dans la trace.
- Température 0, graine quand le modèle l'honore.
- La fabrique ne choisit le réel que pour un rôle **qualifié** ; les autres
  restent simulés et l'écran le dit, rôle par rôle.

**Fini quand** : le banc L9 tourne sur le rédacteur réel, ses métriques
déterministes sont au moins égales à la simulation, et les contrôles de
`core` restent bloquants sur un cas piégé.

### L12 — Autres agents réels · L

Dans cet ordre, chacun qualifié sur le banc avant activation :

1. **VERIFICATEUR** : d'une **famille de modèle différente** du rédacteur
   (contrôle d'indépendance déjà prévu par `Capacites.famille`).
2. **CORRECTEUR** : patche des segments, jamais le document entier.
3. **EXTRACTEUR** : propose des faits ; chaque fait reste cité mot pour mot
   et confirmé par un humain.
4. **ANALYSTE_IMPACT** et **SUGGESTEUR**.

La **traduction** n'est pas un rôle du schéma actuel (`RoleAgent`) : une
variante par langue est rédigée depuis la fiche de faits, qui ne se traduit
jamais. À confirmer dans `docs/SPECIFICATION.md` avant d'ajouter un rôle.

### L13 — Boucle génération, évaluation, correction · M

- Rédaction → contrôles déterministes → vérification → correction de
  segments → contrôles, avec **au plus 2 tours** de correction.
- Arrêt : tous les contrôles bloquants levés, ou nombre de tours atteint.
- Au-delà : la variante reste `A_REVOIR` avec ses blocages affichés, et
  passe à un humain. Jamais d'envoi, jamais de « succès » affiché.

---

## Phase 5 — Agent Control Center

### L14 — Configuration complète des agents · L

Complète l'écran existant `parametres/agents` :

- **Activer / désactiver** un agent optionnel. Un agent indispensable
  (rédacteur, GARDIEN, contrôles) ne se désactive pas, et l'écran dit pourquoi.
- **Modèle** choisi parmi les modèles qualifiés (L10), **température**,
  **limite de jetons**, **délai**, bornés par les capacités sondées.
- **Outils et sources autorisés** : liste fermée, par rôle.
- **Versions** : chaque enregistrement crée une version immuable ;
  **restauration** d'une version antérieure (qui crée une nouvelle
  version, sans réécrire l'historique).
- **Test isolé** : l'agent tourne sur un cas du golden dataset dans un bac
  à sable qui **n'écrit rien** en base de production ; affiche entrée,
  sortie, contrôles et trace.
- **Publication contrôlée** : une version est un brouillon jusqu'à sa
  publication par un administrateur ; seule la version publiée sert aux
  générations.
- Droit dédié `MODIFIER_AGENT` ; chaque changement passe au journal d'audit (L3).

Ce qui reste interdit, quelle que soit la configuration : une consigne qui
demande d'écrire une valeur ou d'ignorer la source (`verifierConsigne`),
une sortie en texte libre, un repli silencieux sur un autre modèle.

---

## Phase 6 — Observabilité

### L15 — Console de traces et Workflow Monitor · L

- **Console** : exécutions filtrables par agent, communication, période,
  statut et gravité ; durée, modèle, version de prompt, jetons, coût
  **mesuré** (à partir de L10 ; avant, « non mesuré »), tentatives, erreurs.
- **Détail d'une exécution** : entrées et sorties visibles uniquement par un
  rôle autorisé, avec journal de consultation.
- **Workflow Monitor** : générations en file, en cours, en échec, reprises.
- **Alertes** : taux d'échec d'un agent, file qui grossit, fournisseur
  indisponible. Le canal d'alerte est à décider ; la règle est testée d'abord.

---

## Phase 7 — Documents et gabarits

### L16 — Stockage persistant et antivirus · M (demande D3, D5)

- `STOCKAGE_TYPE=s3` **obligatoire** hors démonstration et tests (refus au
  démarrage sinon).
- Antivirus réel (`clamd` ou service retenu) ; refus consigné sinon.
- Document volumineux ou mal formé : extraction partielle **déclarée**
  partielle, jamais présentée comme complète.
- Téléchargement des communications générées.

### L17 — Gabarits versionnés et prévisualisés · L (demande D9)

- Création, modification, duplication, **versions** et restauration.
- Association à un service, une audience, un canal, une langue.
- **Prévisualisation** du rendu avec des valeurs d'exemple étiquetées
  comme telles ; `verifierGabarit` bloque l'enregistrement d'un gabarit
  incohérent.
- Recherche dans les communications passées, reprise d'une communication.

---

## Phase 8 — Sécurité et gouvernance

### L18 — Identité, rôles, rétention · M (demande D2, D7)

- Brancher l'IdP retenu sur l'OIDC existant ; groupes de l'IdP associés
  aux rôles en base.
- Rôles alignés sur la décision D7, avec une table de droits testée rôle
  par rôle (comme `droits.test.ts`).
- Politique de rétention écrite et purge planifiée (worker L7).
- Jeu de tests d'**injection** : sources qui tentent de donner des
  consignes, de faire écrire une valeur, de lire une autre organisation.

---

## Phase 9 — Charge et mise en production

### L19 — Tests de charge · M (demande D8)

- Outil de charge justifié dans `DECISIONS.md` (k6 ou équivalent).
- Scénarios : 1, 10, 50 générations simultanées ; 20 utilisateurs sur le
  tableau de bord ; fournisseur lent ; fournisseur qui renvoie des 429.
- Mesures : latence p50 et p95, taux d'erreur, profondeur de file, jetons,
  coût, connexions à la base.
- **Aucune capacité annoncée sans ces chiffres.** Le rapport dit la limite
  observée et la ressource qui sature en premier.

### L20 — Procédure de production · M (demande D1 à D5)

- `docs/EXPLOITATION.md` : environnements DEV, TEST et PROD séparés,
  variables par environnement, migrations, déploiement, **rollback**
  (application et migrations), restauration, astreinte.
- Répétition complète sur un environnement de TEST : déploiement, rollback,
  restauration.
- Verdict final selon les critères ci-dessous.

---

## 3. Critères de verdict

| Verdict              | Conditions                                                                                                                                                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **POC READY**        | Phase 1 terminée ; démonstration de bout en bout (déjà le cas).                                                                                                                                                                              |
| **PILOT READY**      | Phases 1 à 4 terminées : vrais agents qualifiés sur le golden dataset, générations en file avec reprise, audit, sauvegarde testée, connexion d'entreprise (L18). Utilisateurs pilotes identifiés, envois réels encore désactivés ou limités. |
| **PRODUCTION READY** | Tous les lots terminés, charge mesurée contre la cible D8, restauration et rollback répétés, aucune réserve bloquante ouverte.                                                                                                               |

## 4. Ordre proposé pour commencer

1. **L1 Santé** puis **L2 Retries** : courts, sans dépendance, ils
   sécurisent tout ce qui suit.
2. **L3 Audit** et **L4 Sauvegarde**.
3. **L9 Banc de qualité**, en parallèle de la réponse à D1.
4. **L5**, **L6**, puis **L7** et **L8**.
5. Phase 4 dès que la clé de TEST est disponible.
