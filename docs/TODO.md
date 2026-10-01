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
- [x] **Vraies compétitions 2026** dans l'onglet Compétition (UCI, UEC, FFC…) : calendrier, résultats publiés, sources ; démo gardée derrière un bouton (sur `travail`) (01/10/2026)
- [x] **Carte des Lieux v2** (01/10/2026) : carte détaillée MapLibre (plan + satellite avec clé MapTiler), épingles or / bordeaux dessinées dans la carte (collées quand elle bouge), groupes en pièce d'or, noms des pistes, épingle choisie qui grossit ; **API de la carte** `/api/carte/*` (fonction Netlify avec cache) ; tracé en or sur photo satellite dans la fiche (sur `travail`)
- [x] **Onglet Lieux** : carte des pistes BMX et pump tracks autour de soi (OpenStreetMap), recherche par nom ou ville, filtres, liste, fiche de chaque piste (adresse, horaires, public/privé, tracé dessiné, photos, club, compétitions à venir, Y aller) ; tables Supabase `lieux` et `competitions` avec sécurité testée ; étape « Lieux » dans le tuto (sur `travail`) (01/10/2026)
- [x] **Onglet Compétition** complet avec 12 compétitions d'exemple : recherche, accueil compétition, fiche pilote, fiche équipe, temps et classements, détail d'une manche, temps par secteur, arbre 1/16 → finale (sur `travail`) (01/10/2026)
- [x] Tuto de la première connexion : bienvenue, infos (club, catégorie), visite guidée avec projecteur, « Revoir le tuto » ; base Supabase mise à jour (club, catégorie, tuto_fini) (sur `travail`) (01/10/2026)
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
3c. [ ] **Lieux : compléter une fiche** (organisateurs validés) : formulaire horaires, public/privé, tracé, club, **photos (envoi depuis le téléphone, stockage Supabase)**, et **ajouter une compétition** sur la piste. Relier les compétitions de l'onglet Compétition et les `pistes` de l'onglet Entraînement à leur lieu (`lieux.id`).
4. [ ] **Importer le fichier Excel** (organisateurs validés) : une page où on choisit le fichier, et l'appli le lit.
5. [ ] **Calculer les résultats** : temps à chaque ligne, temps entre deux lignes, positions, écart avec le premier, pilote qui ne finit pas.
6. [ ] **Enregistrer les manches dans Supabase** (avec la sécurité de la base activée).
7. [ ] **Afficher les manches** : les miennes (pilote) et toutes les manches.
8. [ ] **Rendre le site public** (enlever la protection Netlify).
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
- [ ] Économiser les crédits Netlify : ne pas relancer de mise en ligne quand seuls les fichiers `docs/` changent.
- [ ] Enlever la page de test (`/test.html`) quand l'appli sera prête.
- [ ] Ajouter de vraies captures d'écran de l'appli sur le site quand elle existera.
- [ ] Vérifier les textes du site si les choix changent (gratuit, compte avec numéro de plaque).
- [ ] Donner un nom plus propre au site (ex. `dbspeed-bmx.netlify.app`).
- [ ] Choisir si le dépôt GitHub reste public ou passe en privé.
