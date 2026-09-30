# DBSpeed — règles pour Claude

Ce fichier est lu automatiquement au début de chaque conversation Claude Code sur ce dépôt.
Lis aussi, avant de travailler :
- `docs/CAHIER_DES_CHARGES.md` : ce que doit faire l'appli
- `docs/TODO.md` : ce qui est fait et ce qui reste, par ordre d'importance
- `docs/INSTRUCTIONS.md` : toutes les consignes données par l'utilisateur

## Comment répondre à l'utilisateur

- Toujours en français, avec des mots simples, sans jargon. Écrire comme si c'était lui qui parlait.
- Réponses courtes et claires. Aller à l'essentiel.
- Quand il doit faire quelque chose : étapes numérotées, avec le **lien exact** et **le bouton précis** sur lequel appuyer.
- Il travaille **uniquement sur son téléphone** pour l'instant : jamais de commande à taper, jamais « ouvre ton ordi ».
- **Vérifier avant de dire que c'est fait** (déploiement terminé, test passé, variable bien enregistrée…). Si une erreur a été faite, le dire tout de suite et la corriger.
- Avancer étape par étape, pas tout d'un coup.
- **Terminer chaque réponse par une partie « À améliorer »** : les points principaux à améliorer, le plus important en premier (2 ou 3 maximum).

## Tenir les fichiers à jour (obligatoire)

- Chaque nouvelle consigne de l'utilisateur → l'ajouter dans `docs/INSTRUCTIONS.md` (avec la date).
- Si la consigne change ce que fait l'appli → mettre à jour `docs/CAHIER_DES_CHARGES.md`.
- Quand une tâche est finie ou qu'une nouvelle apparaît → mettre à jour `docs/TODO.md`.
- Pousser ces changements sur GitHub avec le reste du travail.

## Infos techniques

- **Code** : GitHub `Sportco33/DBSpeed` (dépôt **public** : ne jamais mettre de clé ou mot de passe dans le code).
- **Site** : Netlify, projet `dbspeed-2let` (site id `e7817334-e146-4733-91ec-23186b563821`) → https://dbspeed-2let.netlify.app
  - Chaque `git push` sur `main` met le site à jour tout seul (1 minute environ).
  - Le site est protégé (connexion Netlify demandée) tant qu'on ne l'a pas rendu public.
- **Base de données** : Supabase, projet « DBSpeed » (ref `yqclmsmqkndwzghsbsbi`, région Paris), organisation SportCo.
  - Offre gratuite : 2 projets actifs maximum. Le projet « SportCo » est en pause pour laisser la place.
- **Mails** : Resend, domaine vérifié `sportco.cloud`, expéditeur `DBSpeed <resultats@sportco.cloud>`.
- **Variables Netlify** : `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `TEST_EMAIL_TO`.
- Fonctions Netlify dans `netlify/functions/` (TypeScript `.mts`), pages dans `public/`.
- Fichier Excel d'exemple : `exemples/temps-exemple.xlsx` (format expliqué dans le cahier des charges).

## Pièges déjà rencontrés

- Outil Netlify : une variable créée en mode « secret » ne s'enregistre pas vraiment. La créer en mode normal, **sans préciser les scopes**, puis vérifier avec la liste des variables. Après un changement de variable, relancer un déploiement (commit vide + push).
- Outil Resend : quand il crée une clé, le texte « IMPORTANT » est collé juste après la clé. Ne pas recopier le « I » de « IMPORTANT ».
- Dans l'espace de travail cloud, npm bloque les paquets `@netlify/*` : on ne peut pas déployer avec la ligne de commande Netlify. On déploie en poussant sur GitHub.
