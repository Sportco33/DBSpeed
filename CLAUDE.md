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

## Ergonomie et sensations (à appliquer sur chaque écran, sans qu'on le redemande)

- **Retour haptique à chaque appui** (bouton, onglet, carte, lien) + effet visuel d'appui.
- **Animations de transition super fluides** à chaque clic et entre les pages.
- Appli **ergonomique** (bonne UI / UX), écran **bien équilibré et bien réparti**.
- Détails dans `docs/CAHIER_DES_CHARGES.md` (partie « Ergonomie et sensations »).

## Publier : le mot de code « pushcoco » (obligatoire)

L'utilisateur a peu de crédits Netlify : chaque mise à jour de `main` lance une mise en ligne qui coûte des crédits.
- **Ne jamais pousser sur `main` sans que l'utilisateur ait dit « pushcoco ».**
- Pendant le travail : faire les commits sur la branche **`travail`** et la pousser sur GitHub (ça sauvegarde sans mettre en ligne, pour ne rien perdre d'une conversation à l'autre).
- Au début d'une conversation : partir de la branche `travail` (la récupérer depuis GitHub), pas de `main`.
- Quand l'utilisateur dit **« pushcoco »** :
  1. Vérifier que tout ce qui a été dit est pris en compte (code + `docs/INSTRUCTIONS.md`, `docs/TODO.md`, `docs/CAHIER_DES_CHARGES.md`).
  2. Faire le commit sur `travail`, puis fusionner `travail` dans `main` et pousser `main`.
  3. Vérifier que Netlify a bien fini la mise en ligne, et le dire à l'utilisateur avec le lien du site.

## Tenir les fichiers à jour (obligatoire)

- Chaque nouvelle consigne de l'utilisateur → l'ajouter dans `docs/INSTRUCTIONS.md` (avec la date).
- Si la consigne change ce que fait l'appli → mettre à jour `docs/CAHIER_DES_CHARGES.md`.
- Quand une tâche est finie ou qu'une nouvelle apparaît → mettre à jour `docs/TODO.md`.
- Pousser ces changements sur GitHub avec le reste du travail.

## Infos techniques

- **Code** : GitHub `Sportco33/DBSpeed` (dépôt **public** : ne jamais mettre de clé ou mot de passe dans le code).
- **Site** : Netlify, projet `dbspeed-2let` (site id `e7817334-e146-4733-91ec-23186b563821`) → https://dbspeed-2let.netlify.app
  - Chaque `git push` sur `main` met le site à jour tout seul (1 minute environ) et coûte des crédits → seulement après « pushcoco ».
  - La branche `travail` ne doit pas être mise en ligne (réglage Netlify : « Deploy only the production branch »).
  - Le site est protégé (connexion Netlify demandée) tant qu'on ne l'a pas rendu public.
- **Base de données** : Supabase, projet « DBSpeed » (ref `yqclmsmqkndwzghsbsbi`, région Paris), organisation SportCo.
  - Offre gratuite : 2 projets actifs maximum. Le projet « SportCo » est en pause pour laisser la place.
- **Mails** : Resend, domaine vérifié `sportco.cloud`, expéditeur `DBSpeed <resultats@sportco.cloud>`.
- **Variables Netlify** : `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `TEST_EMAIL_TO`.
- Fonctions Netlify dans `netlify/functions/` (TypeScript `.mts`), pages dans `public/`.
- Chaque page ajoute `/couleurs.css` (palette, marbre `.marbre-vert` / `.marbre-bordeaux`, or `.or-brillant` / `.bouton-or` / `.cadre-or`) et `/sensations.js` en `defer` (vibration + effet d'appui + fondu entre pages ; `window.vibrer('leger' | 'fort' | 'erreur')`). Ne pas utiliser la classe `.apparait` pour autre chose (elle appartient à sensations.js).
- **Appli** dans `public/app/` : `index.html` (connexion, page de démarrage de l'appli installée), `accueil.html` (onglets en bas), `app.css`, `supabase.js` (client + messages d'erreur en français + liste `CATEGORIES`), `tuto.js` + `tuto.css` (tuto de la première connexion avec le projecteur ; lancé par `accueil.js` si `tuto_fini` est faux). Polices libres (OFL) dans `public/app/polices/`.
- `public/config.js` n'est **pas** dans GitHub : il est écrit à la mise en ligne par `scripts/ecrire-config.mjs` (commande de build Netlify) avec `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY`.
- supabase-js est chargé depuis `cdn.jsdelivr.net` (`@supabase/supabase-js@2/+esm`), flux `implicit` (pour que le lien du mail marche même dans un autre navigateur).
- **Base** : table `public.profils` (type_compte pilote/organisateur/spectateur, nom, plaque, club, categorie, tuto_fini, organisateur_valide), créée par un déclencheur à la création du compte ; fonction `choisir_type_compte` pour les comptes Google. Chacun ne lit/modifie que son profil (nom, plaque, club, categorie, tuto_fini seulement). Les migrations sont copiées dans `supabase/migrations/`.
- Valider un organisateur : `update public.profils set organisateur_valide = true where id = '...'` (seulement à la demande de Nicolas).
- Fichier Excel d'exemple : `exemples/temps-exemple.xlsx` (format expliqué dans le cahier des charges).

## Pièges déjà rencontrés

- Outil Netlify : une variable créée en mode « secret » ne s'enregistre pas vraiment. La créer en mode normal, **sans préciser les scopes**, puis vérifier avec la liste des variables. Après un changement de variable, la nouvelle valeur ne sera prise en compte qu'au prochain « pushcoco ».
- Outil Resend : quand il crée une clé, le texte « IMPORTANT » est collé juste après la clé. Ne pas recopier le « I » de « IMPORTANT ».
- Dans l'espace de travail cloud, npm bloque les paquets `@netlify/*` : on ne peut pas déployer avec la ligne de commande Netlify. On déploie en poussant sur GitHub.
- **Plusieurs conversations travaillent en même temps** : avant de pousser `travail`, toujours récupérer la dernière version (`git fetch`) et intégrer ce qui a été ajouté. Ne jamais écraser (pas de `--force`).
- L'espace de travail cloud n'accède pas à `supabase.co`, `cdn.jsdelivr.net`, `api.resend.com` : on teste les pages avec Playwright + un faux client Supabase, et la base avec `execute_sql` dans une transaction annulée (`begin … rollback`).
- Supabase : sans SMTP personnalisé, les mails ne partent **qu'aux membres de l'équipe Supabase** (« Email address not authorized »). Il faut le SMTP Resend (`smtp.resend.com`, port 465, utilisateur `resend`, mot de passe = clé Resend).
- Les réglages Auth de Supabase (Site URL, Redirect URLs, SMTP, Google) ne se font pas avec les outils : c'est Nicolas qui les fait dans le tableau de bord.
