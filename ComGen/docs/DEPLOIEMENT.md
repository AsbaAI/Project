# Déploiement — démonstration publique

ComGen se déploie en démonstration publique sur **Vercel** (application) avec
une base **Neon** (PostgreSQL), deux offres gratuites. L'application tourne
alors en `COMGEN_ENV=demo` :

- un bandeau « Démonstration » est affiché en tête de chaque page,
  connexion comprise ;
- la connexion se fait par le choix d'un compte fictif du jeu de
  démonstration, sans mot de passe ;
- la base est migrée et peuplée du jeu de démonstration au premier
  déploiement, puis laissée telle quelle aux déploiements suivants.

Ce mode n'est **pas** la production : le simulateur de connexion y reste
refusé (`COMGEN_ENV=production`, ou non renseigné sur un build de
production). Une démonstration publique ne contient que des données fictives ;
tout visiteur voit et modifie les mêmes communications.

## Pourquoi Vercel et Neon

- Le build Next de `apps/web` culmine vers 950 Mo de mémoire : les offres
  gratuites limitées à 512 Mo (Render, par exemple) échouent au build.
- Vercel connaît Next et les espaces pnpm sans configuration ; Neon
  s'ajoute depuis Vercel en un clic et pose lui-même les variables de base.

## Mise en place (une fois, environ 10 minutes)

1. **Importer le dépôt.** Sur [vercel.com/new](https://vercel.com/new),
   se connecter avec GitHub, importer `AsbaAI/Project`.
2. **Répertoire racine.** Dans l'écran d'import, _Root Directory_ :
   `ComGen/apps/web`. Laisser _Framework Preset_ sur Next.js ; les commandes
   d'installation et de build viennent de `apps/web/vercel.json`, ne pas les
   surcharger.
3. **Variables d'environnement** (même écran, _Environment Variables_) :

   | Variable                       | Valeur                                               |
   | ------------------------------ | ---------------------------------------------------- |
   | `COMGEN_ENV`                   | `demo`                                               |
   | `AUTH_SIMULATEUR`              | `true`                                               |
   | `AUTH_SECRET`                  | 32 caractères aléatoires : `openssl rand -base64 32` |
   | `ANTIVIRUS_MODE`               | `aucun`                                              |
   | `STOCKAGE_TYPE`                | `fichiers`                                           |
   | `STOCKAGE_RACINE`              | `/tmp/comgen-stockage`                               |
   | `ENABLE_EXPERIMENTAL_COREPACK` | `1` : pnpm 10.33, celui de `packageManager`          |

   `AUTH_URL` est inutile : l'adresse est lue dans la requête.

4. **Lancer le premier déploiement.** Il échoue au build : la base n'existe
   pas encore. C'est attendu.
5. **Ajouter la base.** Projet Vercel → onglet _Storage_ → _Create
   Database_ → **Neon** → région **Frankfurt (eu-central-1)**, la plus
   proche de la région des fonctions (`fra1`, fixée dans `vercel.json`).
   Relier la base à tous les environnements. Neon pose `DATABASE_URL`
   (connexions mutualisées, pour l'application) et `DATABASE_URL_UNPOOLED`
   (connexion directe, prise par les migrations).
6. **Redéployer.** Onglet _Deployments_ → dernier déploiement → _Redeploy_.
   Le build migre la base, charge le jeu de démonstration, puis construit
   l'application.
7. **Rendre le lien public.** Le domaine de production
   (`<projet>.vercel.app`) est public. Si le déploiement vient d'une autre
   branche que la branche de production du projet, c'est une _preview_,
   protégée par défaut : soit déclarer cette branche comme branche de
   production (_Settings → Environments → Production → Branch Tracking_),
   soit désactiver la protection des previews (_Settings → Deployment
   Protection → Vercel Authentication_).

Chaque `git push` sur la branche suivie redéploie ensuite seul.

## Ce que fait le build

`apps/web/vercel.json`, exécuté depuis la racine de l'espace pnpm
(`ComGen/`) :

```bash
pnpm install --frozen-lockfile   # postinstall : génère le client Prisma
pnpm db:migrate                  # prisma migrate deploy (DATABASE_URL_UNPOOLED)
pnpm db:seed:si-vide             # jeu de démonstration si aucune organisation
pnpm --filter @comgen/web build
```

`db:seed:si-vide` ne touche à rien si la base contient déjà une
organisation : un redéploiement conserve ce que les visiteurs ont créé.
Pour remettre la démonstration à zéro, lancer le seed complet depuis un
poste, avec l'URL directe de la base :

```bash
DATABASE_URL='<DATABASE_URL_UNPOOLED de Neon>' pnpm db:seed
```

## Limites connues de la démonstration

- **Dépôt de fichiers : 4,5 Mo par envoi.** Vercel refuse au-delà
  (corps de requête des fonctions) ; l'application en admet 50 hors Vercel.
- **Fichiers déposés éphémères.** `/tmp` d'une fonction ne survit pas à son
  instance. Le texte d'une source est enregistré en base, la fiche de faits
  ne dépend donc pas du fichier ; seul l'original déposé est perdu. Pour le
  conserver, passer `STOCKAGE_TYPE=s3` avec un stockage compatible S3.
- **Pas d'antivirus** (`ANTIVIRUS_MODE=aucun`, choix affiché à
  l'utilisateur) : aucun démon ClamAV n'est disponible sur Vercel.
- **Offre gratuite Neon** : la base se met en veille après quelques
  minutes d'inactivité ; la première requête suivante prend une à deux
  secondes de plus.
- **Aucun modèle de langage** n'est configuré : aucune clé n'est déposée
  sur la démonstration.
