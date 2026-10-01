# TODO — DBSpeed

*Rangé par ordre d'importance. On coche au fur et à mesure.*

## Fait ✅
- [x] Créer le projet Supabase séparé (« DBSpeed »)
- [x] Créer le site Netlify (`dbspeed-2let`) et le relier au GitHub
- [x] Brancher Resend (domaine `sportco.cloud`)
- [x] Page de test : Supabase ✅ et Resend ✅ (30/09/2026)
- [x] Fichier Excel d'exemple (`exemples/temps-exemple.xlsx`)
- [x] Cahier des charges, TODO et fichier des consignes
- [x] Palette de couleurs Or / Vert / Bordeaux dans `public/couleurs.css`, appliquée à la page de test (01/10/2026)
- [x] Site de présentation (`public/index.html`) : accueil, comment ça marche, ce que tu obtiens, exemple de classement, installation iPhone/Android pas à pas, questions. Appli installable (manifest, icônes, `/app/` provisoire). Page de test déplacée dans `public/test.html` (01/10/2026)
- [x] Fond en marbre (vert + bordeaux) et or brillant, sur toutes les pages (accueil, appli, test) (01/10/2026)
- [x] Base Supabase : table `profils` (type de compte, nom, plaque), sécurité testée (01/10/2026)
- [x] Vraie page `/app/` : connexion avec 3 types (pilote, organisateur, spectateur), se connecter, créer un compte, Google (sur `travail`, pas encore en ligne)
- [x] Espace connecté `/app/accueil.html` : onglets en bas (Accueil, Entraînement, Compétition, Mon profil), modifier ses infos, se déconnecter, en marbre et or (sur `travail`)
- [x] **Toute la France dans les Lieux** : 1 426 pistes BMX et pump tracks du recensement officiel (ministère des Sports), recherche « France » (01/10/2026)
- [x] **Localisation** : demandée au tuto, choix enregistré dans le profil, position reprise à chaque connexion, ville dans l'en-tête, réglage dans Mon profil (01/10/2026)
- [x] **Vrais lieux de Slovaquie** : recherche d'un pays entier, fusion des doublons, Coupe de Slovaquie 2026 dans l'onglet Compétition (01/10/2026)
- [x] **Vérification stricte de la Slovaquie** (consigne 39) : 12 lieux pas assez sûrs retirés, 16 lieux vérifiés ajoutés → **72 lieux sûrs** (5 pistes de BMX, 67 pump tracks) (01/10/2026)
- [x] **Vraies compétitions 2026** dans l'onglet Compétition (UCI, UEC, FFC…) : calendrier, résultats publiés, sources ; démo gardée derrière un bouton (sur `travail`) (01/10/2026)
- [x] **Carte des Lieux v2** (01/10/2026) : carte détaillée MapLibre (plan + satellite avec clé MapTiler), épingles or / bordeaux dessinées dans la carte (collées quand elle bouge), groupes en pièce d'or, noms des pistes, épingle choisie qui grossit ; **API de la carte** `/api/carte/*` (fonction Netlify avec cache) ; tracé en or sur photo satellite dans la fiche (sur `travail`)
- [x] **Onglet Lieux** : carte des pistes BMX et pump tracks autour de soi (OpenStreetMap), recherche par nom ou ville, filtres, liste, fiche de chaque piste (adresse, horaires, public/privé, tracé dessiné, photos, club, compétitions à venir, Y aller) ; tables Supabase `lieux` et `competitions` avec sécurité testée ; étape « Lieux » dans le tuto (sur `travail`) (01/10/2026)
- [x] **Onglet Compétition** complet avec 12 compétitions d'exemple : recherche, accueil compétition, fiche pilote, fiche équipe, temps et classements, détail d'une manche, temps par secteur, arbre 1/16 → finale (sur `travail`) (01/10/2026)
- [x] Tuto de la première connexion : bienvenue, infos (club, catégorie), visite guidée avec projecteur, « Revoir le tuto » ; base Supabase mise à jour (club, catégorie, tuto_fini) (sur `travail`) (01/10/2026)
- [x] **Fonction principale : les manches** (01/10/2026) : un organisateur validé importe un fichier **Excel (.xlsx) ou CSV** (lu dans le téléphone, sans bibliothèque), l'appli montre les erreurs ligne par ligne ou un aperçu, puis enregistre la course d'un coup (fonction `importer_course`) ; places, écarts et temps par secteur calculés ; écrans course (chercher un pilote, catégories), manche (arrivée / secteurs / passages), fiche pilote (place à chaque ligne, secteurs), « Mes dernières manches » (par la plaque), toutes les courses ; l'organisateur peut supprimer sa course. Tables `courses`, `manches`, `resultats` avec sécurité testée.
- [x] **Diagnostic et améliorations** (01/10/2026) : page de test et sa fonction d'envoi de mail supprimées (elles étaient ouvertes à tous) ; API de la carte protégée (arrondis, délais, ids vérifiés, pas d'erreurs détaillées) ; appli hors ligne (service worker + page « Pas de connexion ») ; polices en woff2 (−63 %) ; icône adaptable Android ; en-têtes de sécurité ; onglets chargés seulement quand on les ouvre ; supabase-js à version fixe ; lignes de tableau utilisables au clavier ; tuto au clavier (Tab, Échap) ; petits outils partagés (`public/app/outils.js`) ; pas de mise en ligne quand seuls les docs changent.
- [x] Animations partout (01/10/2026) : site (arrivée de l'accueil, démo de manche en direct dans le téléphone, titres et classement qui arrivent en défilant, questions qui s'ouvrent en douceur, damier qui défile) ; appli (arrivée de la connexion, pastille qui glisse Se connecter / Créer un compte, champs qui s'ouvrent en douceur, onglets qui glissent du bon côté, reflet sur la plaque) ; tuto (projecteur qui s'allume et balance, points qui arrivent un par un, pilote BMX qui passe la ligne) (sur `travail`)

## À faire, dans l'ordre
1. [ ] **Réglages à faire par Nicolas** (sinon la connexion ne marche pas en ligne) :
   - [ ] Supabase → adresses du site (Site URL + Redirect URLs)
   - [ ] Supabase → envoi des mails avec Resend (SMTP)
   - [ ] Google Cloud → créer l'accès Google, puis l'activer dans Supabase
2. [ ] ~~pushcoco~~ fait le 01/10/2026 (commit `07d9d7e`, mise en ligne Netlify prête) → **tester en vrai** : créer un compte, confirmer le mail, se connecter, Google.
3. [x] **Onglet Entraînement** : calendrier, journée (piste + tracé + tours), tour (intermédiaires, comparaison record / meilleurs inter / mon meilleur / amis), publier, classement, Mes amis dans le profil ; base Supabase testée (sur `travail`) (01/10/2026)
3a. [ ] **Importer des séances d'entraînement** (fichier Excel puis transpondeurs) dans `entrainements` + `tours`, et **créer les pistes** (nom, lieu, tracé, lignes).
3b. [ ] **Compétitions dans Supabase** : la table `competitions` existe déjà (créée pour l'onglet Lieux : lieu, nom, dates, niveau, lien) → la **compléter** plutôt que d'en créer une autre ; ajouter les tables catégories, engagés, équipes, manches, passages + import par les organisateurs ; remplacer les données d'exemple.
3b2. [ ] **Clé MapTiler** (Nicolas crée le compte, Claude met la clé dans Netlify `MAPTILER_KEY`) → plan détaillé MapTiler + satellite. Sans clé, la carte marche quand même (OpenFreeMap, sans satellite).
3b3. [ ] **Tenir les vraies compétitions à jour** : ajouter les résultats de Pékin (3-4 oct.), Chongli (10-11 oct.), Sarasota (31 oct.-1er nov.), et les résultats manquants (Coupe d'Europe, Coupe de France, Asie) dans `donnees-reelles.js` ; plus tard les mettre dans Supabase. Montrer aussi ces compétitions dans les fiches de l'onglet Lieux.
3b5. [ ] **Pilotes Elite** (`public/app/competitions/pilotes-elite.js`) : 20 hommes, 18 femmes, plaques et classement des Mondiaux 2026 (calculé depuis les feuilles Tissot), + 6 Elite français (Oliviera, Pieczanowsky, Rocherieux, Jacquet, Favrel, Brindjonc), clubs FFC, Coupe de France 2026. Reste : **les afficher** (fiche pilote réelle), **classement UCI** (dataride.uci.ch bloqué pour Claude), **résultats de Vesoul** et du top 8 des championnats de France (PDF FFC illisibles ici), mise à jour après Pékin, Chongli, Sarasota.
3b7. [x] **DN1 2026** : les 10 équipes, leurs pilotes femmes et hommes (liste officielle FFC), classement d'avril, champion Besançon ; écran `#competition/dn1` (01/10/2026). Reste : le **classement final** avec les points (PDF FFC illisibles ici) et relier chaque pilote à sa fiche.
3b6. [ ] **Toutes les pistes BMX et pump tracks de France, notées sur 20** : l'outil `outils/lieux-france.py` et l'affichage de la note dans la fiche sont prêts. **Il manque les 2 fichiers officiels** (Data ES, 1 056 « pistes de bicross » et 433 pumptracks) : Claude ne peut pas les télécharger (réseau bloqué). Nicolas ouvre les 2 liens (dans l'outil) et envoie les fichiers dans la conversation → lancer l'outil, appliquer la migration `20261002100000_lieux_france.sql`, vérifier sur la carte.
3b4. [ ] **Slovaquie, à confirmer** (pas affichés tant qu'on n'est pas sûr) : Malacky, Nitra-Chrenová, Žarnovica, Zákamenné, Stupava, Žabokreky, Dohňany, Beckov, Bohuslavice, Trenčín-Zlatovce, pump track modulaire de Rača, Gbely, Svätý Jur, Senec, Slovenský Grob, Bytča, Bardejov, Gelnica, Trenčín Západ, Šurianky. **Faire la même vérification pour la France** (si Nicolas le veut) ; trouver la piste de BMX de Martin (club Bike Racing Slovakia) ; vérifier si les vieilles pistes existent encore (Oslany, Čierna Voda, Vajnory, Bojnice, Tatranská Lomnica, Bachledova).
3b5. [ ] **France, à améliorer** : relancer `select public.importer_data_es();` de temps en temps (nouvelles pistes) ; ajouter les clubs FFC qui s'entraînent sur chaque piste (pas dans le recensement) ; vérifier quelques fiches au hasard (le recensement contient parfois des petites pistes de terre ou des pistes fermées).
3c. [ ] **Lieux : compléter une fiche** (organisateurs validés) : formulaire horaires, public/privé, tracé, club, **photos (envoi depuis le téléphone, stockage Supabase)**, et **ajouter une compétition** sur la piste. Relier les compétitions de l'onglet Compétition et les `pistes` de l'onglet Entraînement à leur lieu (`lieux.id`).
4. [x] ~~Importer le fichier Excel~~, 5. ~~Calculer les résultats~~, 6. ~~Enregistrer les manches~~, 7. ~~Afficher les manches~~ : faits le 01/10/2026 (voir « Fait »). **À tester en vrai** après le prochain « pushcoco » avec un compte organisateur validé.
7a. [ ] **Plaque fiable** : aujourd'hui deux pilotes peuvent avoir la même plaque, et « Mes manches » se base sur la plaque. Choisir avec Nicolas : plaque unique, ou plaque + catégorie, ou le pilote confirme ses manches.
7b. [ ] Relier une course importée à une **piste de l'onglet Lieux** et à une **compétition**, et montrer les vraies manches dans l'onglet Compétition.
8. [x] Le site est **déjà public** : la protection Netlify ne couvre que les versions de test (pas le vrai site). Rien à faire.
9. [ ] **Envoyer les résultats par mail** (Resend) — à confirmer.
10. [ ] **Adapter au format des transpondeurs** quand on aura un vrai fichier.

## À faire partout (en même temps que chaque écran)
- [x] **Fichier commun « sensations »** (`public/sensations.js`) : vibration à chaque appui + effet d'appui visuel + apparition douce + fondu entre pages. Déjà sur le site et `/app/` (01/10/2026). À ajouter sur chaque nouvelle page.
- [ ] **Transitions fluides entre les pages** et apparition douce des listes.
- [ ] **Vérifier chaque écran** : gros boutons, un seul bouton principal, espaces réguliers, bien équilibré.

## Petits nettoyages (moins urgent)
- [ ] Lieux : le fond de carte (CARTO) et la recherche (Nominatim, Overpass) sont gratuits pour un petit usage ; si l'appli grossit ou devient payante, prendre un fournisseur de carte avec une offre adaptée.
- [ ] Lieux : permettre d'**ajouter une piste qui n'est pas sur la carte** (id `dbs-…`, déjà prévu dans la table `lieux`).
- [ ] Compétition : mettre en avant **ses propres compétitions** (pilote connecté) et un bouton « Suivre » une compétition.
- [ ] Compétition : vérifier avec Nicolas le **format** (qualifs aux points, 4 premiers qui passent) et les **noms des catégories**.
- [ ] Vérifier avec Nicolas la **liste des catégories** BMX proposées (Pré-licencié, Poussin, Pupille, Benjamin, Minime, Cadet, Junior, Senior, Elite, Master, Cruiser).
- [ ] Mettre les mails de Supabase (confirmation, mot de passe) en français.
- [ ] Ajouter « Mot de passe oublié ».
- [x] Économiser les crédits Netlify : pas de mise en ligne quand seuls `docs/`, `README.md`, `CLAUDE.md`, `exemples/` ou `outils/` changent (règle `ignore` dans `netlify.toml`) (01/10/2026).
- [x] Page de test (`/test.html`) enlevée (01/10/2026). La variable Netlify `TEST_EMAIL_TO` ne sert plus : on peut l'effacer.
- [ ] Supprimer une course : aujourd'hui tout ou rien ; plus tard, corriger une seule manche.
- [ ] Supabase : activer la protection contre les mots de passe déjà volés (seulement si c'est gratuit).
- [ ] Ajouter de vraies captures d'écran de l'appli sur le site quand elle existera.
- [ ] Vérifier les textes du site si les choix changent (gratuit, compte avec numéro de plaque).
- [ ] Donner un nom plus propre au site (ex. `dbspeed-bmx.netlify.app`).
- [ ] Choisir si le dépôt GitHub reste public ou passe en privé.
