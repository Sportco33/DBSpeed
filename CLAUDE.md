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

## Ne rien payer (obligatoire)

- Nicolas ne veut **rien payer** : seulement des offres **gratuites**, sans carte bancaire. Avant de proposer un service ou une option, vérifier que c'est gratuit et le dire. Ne jamais faire ajouter une carte bancaire (ex. pas d'« essai gratuit » Google Cloud).

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
  - **Le vrai site est public** (la protection Netlify ne couvre que les versions de test). Donc : aucune page ou fonction qui envoie des mails ou coûte quelque chose sans être connecté.
  - `netlify.toml` : en-têtes de sécurité, cache des images et polices, et règle `ignore` : pas de mise en ligne si seuls `docs/`, `README.md`, `CLAUDE.md`, `exemples/`, `outils/` changent.
- **Base de données** : Supabase, projet « DBSpeed » (ref `yqclmsmqkndwzghsbsbi`, région Paris), organisation SportCo.
  - Offre gratuite : 2 projets actifs maximum. Le projet « SportCo » est en pause pour laisser la place.
- **Mails** : Resend, domaine vérifié `sportco.cloud`, expéditeur `DBSpeed <resultats@sportco.cloud>`.
- **Variables Netlify** : `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `MAPTILER_KEY` (facultative, carte détaillée + satellite).
- Fonctions Netlify dans `netlify/functions/` (TypeScript `.mts`), pages dans `public/`.
- Animations : `window.montrer(el, vrai/faux)` (sensations.js) pour afficher/cacher un bloc en douceur ; `data-apparait` (enfants l'un après l'autre) et `data-revele` (un seul élément) pour l'arrivée au défilement ; les `<details>` s'ouvrent en douceur tout seuls. Toujours prévoir le cas « réduire les animations ». Le texte ne bouge pas pendant qu'on le lit.
- Chaque page ajoute `/couleurs.css` (palette, marbre `.marbre-vert` / `.marbre-bordeaux`, or `.or-brillant` / `.bouton-or` / `.cadre-or`) et `/sensations.js` en `defer` (vibration + effet d'appui + fondu entre pages ; `window.vibrer('leger' | 'fort' | 'erreur')`). Ne pas utiliser la classe `.apparait` pour autre chose (elle appartient à sensations.js).
- **Appli** dans `public/app/` : `index.html` (connexion, page de démarrage de l'appli installée), `accueil.html` (onglets en bas), `app.css`, `supabase.js` (client + messages d'erreur en français + liste `CATEGORIES`), `tuto.js` + `tuto.css` (tuto de la première connexion avec le projecteur ; lancé par `accueil.js` si `tuto_fini` est faux). Polices libres (OFL) dans `public/app/polices/`.
- **Onglet Lieux** : `public/app/lieux.js` + `lieux.css` (styles tous préfixés `#onglet-lieux`, classes `l-recherche` / `l-retour` pour ne pas se mélanger avec l'onglet Compétition). Carte **MapLibre GL 6.11.2** (chargée depuis jsdelivr, code dans `public/app/carte.js`) : style MapTiler `streets-v2` / `hybrid` si `MAPTILER_KEY` (variable Netlify, écrite dans `config.js` → `maptilerKey`, logo MapTiler obligatoire), sinon OpenFreeMap `liberty`. Les épingles sont des calques « symbol » (images SVG ajoutées avec `addImage`, remises à chaque `style.load`). Pistes : **API** `netlify/functions/carte.mts` (`/api/carte/lieux|lieu|recherche|adresse`, cache Netlify) qui utilise `public/app/lieux-osm.js` (Overpass `sport~bmx` / `cycling=pump_track`, regroupement, Nominatim) ; l'appli appelle l'API et, si elle échoue, `lieux-osm.js` directement. Tests Playwright : lancer Chromium avec `--use-angle=swiftshader --enable-unsafe-swiftshader` pour la carte, et servir MapLibre depuis une copie locale (release GitHub `dist.zip`). Adresse d'une fiche : `#lieux/way-123`. L'espace de travail cloud n'accède pas à ces services : tester avec Playwright en remplaçant leurs réponses (et ouvrir la page sur `http://localhost:…` pour que la position marche).
- **Position** : `public/app/position.js` (partagé par toute l'appli). Choix dans `profils.localisation` (null / true / false), position seulement dans le `localStorage` du téléphone (`dbspeed_position`, avec la ville trouvée par `/api/carte/adresse`). Évènement `dbspeed:position` quand elle change. `accueil.js` la reprend à l'ouverture si le choix est oui ; `lieux.js` s'en sert sans redemander ; le tuto a une étape « Ta position ».
- `public/config.js` n'est **pas** dans GitHub : il est écrit à la mise en ligne par `scripts/ecrire-config.mjs` (commande de build Netlify) avec `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY`.
- supabase-js est chargé depuis `cdn.jsdelivr.net` (`@supabase/supabase-js@2.117.2/+esm`, version fixe), flux `implicit` (pour que le lien du mail marche même dans un autre navigateur).
- **Base, lieux** : tables `public.lieux` (ce que DBSpeed ajoute à une piste OpenStreetMap, id `way-123` ou `dbs-…` : horaires, acces public/prive/club, trace, photos, club…) et `public.competitions` (lieu_id, nom, dates, niveau, lien). Tout le monde lit ; seuls les organisateurs validés écrivent (fonction `est_organisateur_valide()`), et chacun ne modifie/supprime que ses compétitions. Migration `20261001120000_lieux_et_competitions.sql`. Colonne `sources` (jsonb, liens affichés en bas de la fiche) ajoutée par `20261001140000_lieux_slovaquie.sql`, et `20261001210000_lieux_slovaquie_verifies.sql` : 72 lieux sûrs de Slovaquie (fabriqués par `outils/lieux-slovaquie.py`). **France** : 577 lieux sûrs `dbs-fr-…` (sur 1 426 ; les 849 pas confirmés par OpenStreetMap à 150 m sont dans `public.lieux_a_confirmer`, invisible, et un déclencheur `lieux_pas_si_a_confirmer` les empêche de revenir ; migration `20261001220000_lieux_france_verifies.sql`) importés du Recensement des équipements sportifs (Data ES) par la fonction `public.importer_data_es()` (extension `http` de Supabase : la base lit elle-même l'API equipements.sports.gouv.fr, l'espace de travail cloud n'y a pas accès) ; à relancer pour mettre à jour, n'écrase pas une fiche modifiée par un organisateur. Pour une zone plus grande qu'un petit pays (ex. « France »), l'appli ne demande pas OpenStreetMap et montre seulement les lieux de la base (lus par paquets de 1000). **Pour ajouter un lieu ou un pays (consigne 39, obligatoire)** : vérifier avant — une source indépendante (ville, club, presse, Trailforks ; oma.sk ne compte pas, c'est une copie d'OpenStreetMap) confirme qu'il existe ET sa position est confirmée (objet OpenStreetMap à moins de 50 m ou adresse de la source) ; sinon on ne le met pas ; id `way-…`/`node-…` si l'objet OpenStreetMap est connu, sinon `dbs-<pays>-…`).
- **Lieux de France** : `outils/lieux-france.py` lit les 2 CSV Data ES (liens dans l'outil : pistes de bicross type 604, pumptracks type 610), garde ce qui est en service et vraiment du BMX, calcule la **note sur 20** et écrit `supabase/migrations/20261002100000_lieux_france.sql` (colonnes `lieux.note` et `lieux.note_detail`, ids `dbs-fr-<numéro d'équipement>`, `on conflict` donc on peut relancer). La fiche d'un lieu affiche la note (`htmlNote` dans `lieux.js`) seulement si `note` est remplie. Grille dans le cahier des charges.
- **Pilotes réels** : `public/app/competitions/pilotes-elite.js` (Elite hommes/femmes, `MONDIAUX_2026` calculé, `PILOTES_ELITE_FRANCE`, `COUPE_DE_FRANCE_2026`). Seulement des adultes Elite et des résultats publics, jamais de numéro de licence ni d'infos privées.
- **Classements DBSpeed** : `public/app/competitions/classements.js` (`#competition/classements`, `#competition/classements/pilote/<id>`, ids `ex-…` pour l'exemple). Barème = points de la place × coefficient du type de compétition (`COEFS`), total de la saison par catégorie ; région/département = club du pilote (`DEP_CLUB`, `DEP_EQUIPE_DN1`, `DEPARTEMENTS`), seulement pour les Français au club connu ; noms écrits de deux façons → `MEME_PILOTE`. Vrais résultats : **pas de catégorie Junior** (mineurs). Un nouveau type de compétition → l'ajouter dans `COEFS`.
- **DN1** : `public/app/competitions/dn1-2026.js` (10 équipes, pilotes Elite/U23 par équipe, nombre de U19 sans nom, classement d'avril, champion) ; écrans `#competition/dn1` et `#competition/dn1/<club>` (`ecranDN1`, `ecranClubDN1` dans `competitions/vue.js`). Source : liste FFC des DN 2026 (PDF republié par le club Ain Côtière). Ne jamais afficher le nom d'un pilote U19.
- data.gouv.fr, OpenStreetMap (Overpass), ffc.fr, dataride.uci.ch sont **bloqués** depuis l'espace de travail ; WebFetch garde des réponses en cache et réécrit les mots : **pas fiable pour recopier des données en masse**. Demander le fichier à Nicolas.
- **Base** : table `public.profils` (type_compte pilote/organisateur/spectateur, nom, plaque, club, categorie, tuto_fini, organisateur_valide), créée par un déclencheur à la création du compte ; fonction `choisir_type_compte` pour les comptes Google. Chacun ne lit/modifie que son profil (nom, plaque, club, categorie, tuto_fini seulement). Les migrations sont copiées dans `supabase/migrations/`.
- **Entraînement** (`public/app/entrainement/`) : tables `pistes` (tracé = chemin SVG 320×210, `lignes` = [{nom, pos 0→1}]), `entrainements` (séance : pilote, piste, jour, `publie`, `exemple`), `tours` (`temps` = temps cumulés à chaque ligne après le départ, `temps_final` calculé tout seul), `amis`. Chacun ne lit que ses séances ; les lectures chez les autres passent par des fonctions : `record_piste`, `meilleurs_intermediaires_piste`, `meilleurs_tours_amis`, `classement_piste`, `chercher_pilotes`, `demander_ami`, `repondre_ami`, `retirer_ami`, `mes_amis`, `creer_exemples_entrainement`, `effacer_exemples_entrainement`. Une séance d'exemple ne peut pas être publiée.
- **Sessions de groupe** (`public/app/entrainement/session.js` + `session.css`, chargé par `vue.js` seulement pour `#entrainement/sessions`, `/session/<id|nouvelle|exemple>`, `/rejoindre/<CODE>`) : tables `sessions_groupe` (createur, piste, jour, nom, `code` 10 caractères hexa, terminee) et `session_membres` (pilote, `invite`, couleur 0–11), colonne `tours.heure`. Aucun droit direct sur ces tables : tout passe par `creer_session`, `inviter_session` (amis seulement), `apercu_session(code)`, `rejoindre_session(code)` (pilotes), `repondre_invitation_session`, `quitter_session`, `supprimer_session` / `terminer_session` (créateur), `mes_sessions`, `session_detail` (jsonb : session + piste, membres, tours de tous les membres sur la piste ce jour-là), `ajouter_tours_exemple_session`. Couleurs F1 calculées dans `analyser()` (dans l'ordre des tours). Le code d'un lien reçu sans être connecté est gardé dans `localStorage` `dbspeed_invitation` (accueil.js) et ouvert après connexion / tuto.
- Valider un organisateur : `update public.profils set organisateur_valide = true where id = '...'` (seulement à la demande de Nicolas).
- Fichier Excel d'exemple : `exemples/temps-exemple.xlsx` (format expliqué dans le cahier des charges ; copie téléchargeable dans `public/app/manches/temps-exemple.xlsx`).
- **Manches (onglet Accueil, la fonction principale)** : `public/app/manches/` — `excel.js` (lit .xlsx et .csv sans bibliothèque : zip + XML, `DecompressionStream`), `calcul.js` (places, écarts, secteurs), `vue.js` (adresses `#accueil`, `#accueil/courses`, `#accueil/course/<id>`, `#accueil/manche/<id>[/<resultat>]`, `#accueil/importer`), `manches.css` (styles sous `#onglet-accueil`, réutilise `.t`, `.chiffres`, `.carte-manche`…). Base : `courses` (organisateur, nom, jour, lieu, `lignes` = noms des lignes après le départ), `manches` (numéro, catégorie), `resultats` (plaque, pilote, couloir, `temps` = temps cumulés à chaque ligne). Tout le monde (connecté) lit ; on écrit seulement avec `importer_course(...)` (organisateur validé, tout ou rien) ; l'organisateur supprime ses courses. On n'enregistre que les temps : places et écarts sont recalculés.
- **Sécurité (migration `20261001210000_securite_et_compte.sql`)** : `chercher_pilotes` (plaque exacte ou ≥ 3 lettres, club seulement pour les amis), `demander_ami` (30 en attente max), `importer_course` (chaque valeur vérifiée, messages en français, 30 imports/jour, champ `nom` de la manche), `supprimer_mon_compte()` (efface l'utilisateur : profil, séances, amis ; `courses.organisateur` passe à null). Droits par défaut fermés : **chaque nouvelle table ou fonction doit donner ses droits elle-même** (`grant select … to authenticated`, `grant execute …`).
- API de la carte : `config.rateLimit` (60 appels/min par IP, gratuit : 2 règles max sur l'offre gratuite) ; recherche en minuscules (redirection vers l'adresse « propre »).
- `public/confidentialite.html` : page Confidentialité (liée depuis le site, la connexion et Mon profil). À tenir à jour si on garde de nouvelles données.
- `public/app/outils.js` : petits outils partagés (`esc`, `lienRetour`, `vide`, `puces`, `animer`, `secteurs`, `brancherLiens` pour les lignes `data-lien` au doigt et au clavier, `demander` pour « tu es sûr ? »). Toujours échapper avec `esc` ce qui vient de la base ou d'OpenStreetMap.
- `accueil.js` charge chaque onglet **seulement quand on l'ouvre** (`import()` dynamique) : un nouvel onglet doit s'ajouter dans `modules`.
- **Hors ligne** : `public/sw.js` (cache `dbspeed-vN` : changer N quand on veut forcer la mise à jour), page `public/offline.html`. Pages/JS/CSS : Internet d'abord ; images et polices : copie d'abord ; bibliothèques jsdelivr à **version fixe** gardées ; jamais `/api/*`. Toujours charger les bibliothèques avec une version exacte (supabase-js `2.117.2`).
- **Logo** : `public/logo.js` (chargé par le site et l'appli) applique le style choisi (`localStorage` `dbspeed_logo` : officiel / tron / marbre / feu) aux `<img data-logo>` (médaille) et `<img data-logo-icone>` (icône), à l'icône de l'onglet, à `apple-touch-icon` et au manifeste (`/manifest-<style>.webmanifest`). Il affiche aussi l'**écran d'ouverture animé** sur les pages `/app/` (`#ouverture`, `sessionStorage` `dbspeed_ouverture`, 1,7 s). Fichiers : `public/logos/<style>.svg` et `<style>-icone.svg` (animations en CSS dans le SVG, arrêtées si « réduire les animations »), icônes `public/icones/icone[-<style>]-180|192|512|maskable-512.png`. Pour les refaire : `python3 outils/fabriquer-logos.py <dossier des .ttf>` (les .ttf sont dans l'historique Git) puis `node outils/fabriquer-icones.mjs`.
- Polices en **woff2** (`public/app/polices/`).

## Pièges déjà rencontrés

- Outil Netlify : une variable créée en mode « secret » ne s'enregistre pas vraiment. La créer en mode normal, **sans préciser les scopes**, puis vérifier avec la liste des variables. Après un changement de variable, la nouvelle valeur ne sera prise en compte qu'au prochain « pushcoco ».
- Outil Resend : quand il crée une clé, le texte « IMPORTANT » est collé juste après la clé. Ne pas recopier le « I » de « IMPORTANT ».
- Dans l'espace de travail cloud, npm bloque les paquets `@netlify/*` : on ne peut pas déployer avec la ligne de commande Netlify. On déploie en poussant sur GitHub.
- **Plusieurs conversations travaillent en même temps** : avant de pousser `travail`, toujours récupérer la dernière version (`git fetch`) et intégrer ce qui a été ajouté. Ne jamais écraser (pas de `--force`).
- L'espace de travail cloud n'accède pas à `supabase.co`, `cdn.jsdelivr.net`, `api.resend.com` : on teste les pages avec Playwright + un faux client Supabase, et la base avec `execute_sql` dans une transaction annulée (`begin … rollback`).
- Supabase : sans SMTP personnalisé, les mails ne partent **qu'aux membres de l'équipe Supabase** (« Email address not authorized »). Il faut le SMTP Resend (`smtp.resend.com`, port 465, utilisateur `resend`, mot de passe = clé Resend).
- Les réglages Auth de Supabase (Site URL, Redirect URLs, SMTP, Google) ne se font pas avec les outils : c'est Nicolas qui les fait dans le tableau de bord.
