# Cahier des charges — DBSpeed

*Dernière mise à jour : 01/10/2026. Ce document évolue avec le projet.*

## 1. L'idée

DBSpeed est une appli de chronométrage pour le **BMX race**.
Sur la piste, il y a une **ligne de départ** (la grille), plusieurs **lignes intermédiaires** et une **ligne d'arrivée**.
Les pilotes passent sur ces lignes pendant leur manche. À la fin du tour, chaque pilote doit avoir **toutes les infos sur sa course**.

## 2. Ce que l'appli doit faire

### Lire les temps
- Les temps de passage à chaque ligne arrivent dans un **fichier Excel**.
- L'appli lit ce fichier et retrouve, pour chaque pilote, ses temps de passage.
- Pour l'instant on utilise un fichier d'exemple. **Plus tard, le fichier viendra des transpondeurs** : il faudra adapter la lecture à leur format.

### Calculer, pour chaque pilote
- Son **temps à chaque ligne** (intermédiaires et arrivée).
- Son **temps entre deux lignes** (par exemple de l'Inter 1 à l'Inter 2).
- Sa **position à chaque intermédiaire**.
- Sa **position à l'arrivée** (le plus important).
- Son **écart avec le premier** à chaque ligne.
- Gérer le pilote qui **ne finit pas** (chute, abandon) : il n'a pas de temps sur certaines lignes.

### Une manche
- De **1 à 8 pilotes** en même temps.

### Afficher
- Le **classement de la manche** à l'arrivée.
- La **fiche de chaque pilote** avec tous ses temps et positions.
- Pensé d'abord pour le **téléphone**.

### Le site de présentation
- Une page qui **présente DBSpeed** (à quoi ça sert, comment ça marche).
- Un bouton pour **télécharger / installer l'application** sur son téléphone.
- Sections : accueil (avec un écran d'exemple), comment ça marche (3 étapes), ce que tu obtiens, exemple de classement, **installation pas à pas iPhone (Safari) et Android (Chrome)**, questions fréquentes.
- Sur Android/Chrome, un bouton « Installer en un clic » apparaît quand le téléphone le permet. Le bon onglet (iPhone ou Android) s'ouvre tout seul.

### L'application
**Page de connexion** (`/app/`, c'est aussi la page qui s'ouvre quand on lance l'appli installée)
- 3 types de compte : **Pilote**, **Organisateur**, **Spectateur**.
- **Se connecter** ou **Créer un compte** (prénom et nom, email, mot de passe ; numéro de plaque pour un pilote).
- **Continuer avec Google**. Après la première connexion Google, une « dernière étape » demande le type de compte, le nom et la plaque.
- Un compte **organisateur doit être validé** par l'équipe DBSpeed avant de pouvoir importer des temps (proposition de Claude, à confirmer).

**Tuto de la première connexion** (une seule fois, puis « Revoir le tuto » dans Mon profil)
1. **Bienvenue** : prénom, feux de départ, 3 choses que fait l'appli (selon le type de compte).
2. **Tes infos** : prénom et nom ; pour un pilote, plaque (obligatoire), catégorie (facultatif, en pastilles), club (facultatif) ; pour un organisateur, club ou structure qui organise (obligatoire) ; pour un spectateur, club suivi (facultatif).
3. **Ta position** : une épingle dorée avec des ondes, « Autoriser ma position » ou « Plus tard ». Le choix est enregistré dans le profil (`profils.localisation`).
4. **Visite guidée avec un projecteur** : tout l'écran passe dans l'ombre sauf la partie expliquée, éclairée avec un halo doré, et une bulle explique à quoi elle sert. Le projecteur glisse d'une partie à l'autre : la plaque, puis chaque onglet (l'onglet s'ouvre derrière). Boutons « Suivant » et « Passer ».
5. **Tu es prêt !** : damier d'arrivée, bouton « Commencer ».

**Après connexion** (`/app/accueil.html`), des **onglets en bas de l'écran** :
- **Accueil** (fait le 01/10/2026, la fonction principale) : bonjour, puis :
  - **Mes dernières manches** (pilote) : retrouvées avec sa **plaque** ; grosse place, course, manche, temps et écart.
  - **Dernières courses** (tout le monde) et **Toutes les courses** (recherche par nom ou lieu).
  - **Importer un fichier de temps** (bouton en haut, **organisateurs validés** seulement) : on choisit un fichier **.xlsx ou .csv**. L'appli le lit dans le téléphone : colonnes reconnues par leur titre (Manche, Plaque, Pilote ou Prénom + Nom, Couloir, Catégorie, Départ, Inter 1…, Arrivée ; aussi Dossard, Lane, Finish…), temps en `36.254`, `36,254` ou `0:36.254`, case vide / DNF / chute = pas passé. Si « Départ » est une heure (transpondeurs), les temps partent de là. Les erreurs sont listées **ligne par ligne** (plaque manquante, temps illisible, temps qui recule, plaque en double, plus de 8 pilotes) et **rien n'est enregistré** tant qu'il y en a. Sinon : aperçu (manches, pilotes, lignes, non finis, classement de chaque manche), nom de la course, jour, lieu, puis **Enregistrer la course** (tout ou rien).
  - **Une course** : chiffres (manches, pilotes, lignes, non finis), **chercher un pilote** (plaque ou nom), bouton « Mes manches », filtre par catégorie, chaque manche avec son arrivée. L'organisateur de la course peut la **supprimer** (avec confirmation).
  - **Une manche** : le vainqueur, puis 3 vues : **Arrivée** (place, couloir, pilote, temps, écart), **Secteurs** (S1 départ → Inter 1… ; le plus rapide en or), **Passages** (temps et place à chaque ligne).
  - **Fiche d'un pilote dans une manche** : place, temps, écart au 1er, secteurs les plus rapides, **place à chaque ligne**, tableau ligne par ligne (temps, place, écart), temps et rang de chaque secteur ; pilote qui n'a pas fini expliqué (« dernier passage à Inter 2 ») ; pilote précédent / suivant.
  - **Noms des manches** : si le fichier écrit « 1/4 finale A », « Demi 1 », « Q2 »…, ce nom est gardé et affiché ; deux colonnes (ex. Tour + Série) donnent « Qualif 1 · Série 2 ». Une colonne inconnue (Points, Vitesse, Club…) est ignorée avec un message, elle ne devient jamais une ligne de chrono.
  - **Plaque** : « 021 » et « 21 » sont la même plaque pour retrouver ses manches.
  - **Importer deux fois** la même course (même nom, même jour) : l'appli demande confirmation.
  - **Limites** (gratuit, contre les abus) : 30 imports par jour et par organisateur, 500 manches par fichier.
  - **Calcul** : place à l'arrivée par le temps final ; égalité = même place ; ceux qui ne finissent pas sont classés après (le plus loin d'abord ; même ligne et même temps = même place). Les places, écarts et secteurs ne sont **pas enregistrés** : ils sont recalculés à partir des temps (impossible d'avoir une place fausse).
  - Code : `public/app/manches/` (`excel.js` = lire le fichier, `calcul.js` = places et écarts, `vue.js` = écrans, `manches.css`). Base : tables `courses`, `manches`, `resultats` + fonction `importer_course` (migration `20261001160000_courses_manches_resultats.sql`).
- **Entraînement** (fait le 01/10/2026, base Supabase en place) :
  - **Calendrier** (pilote) : mois par mois, flèches ou glisser le doigt pour changer de mois, touche le titre pour choisir un mois / une année. Les **jours avec des données sont dorés** et montrent le nombre de tours ; petit point bordeaux = séance publiée ; résumé du mois (séances, tours).
  - **Une journée** : la **piste** (nom, lieu), son **tracé** dessiné avec le départ (D), les intermédiaires (I1, I2…) et l'arrivée (A, damier) ; chiffres (tours, meilleur, moyenne, chutes) ; **liste des tours** (temps, écart avec le meilleur, chute) ; **Publier cette séance** (avec confirmation) / Retirer du classement ; Supprimer la séance.
  - **Un tour** : temps final, tracé où un pilote **rejoue le tour** au rythme des vrais temps, **tous les intermédiaires** (temps depuis la grille + temps de chaque secteur), et **Comparer** avec : **record de la piste**, **meilleurs intermédiaires de la piste** (meilleur temps publié à chaque ligne), **mon meilleur tour**, **chacun de mes amis**. Écart à chaque ligne et par secteur (vert = plus rapide, bordeaux = plus lent), secteurs colorés sur le tracé, tableau « tout le monde, ligne par ligne ». Boutons tour précédent / suivant.
  - **Classement** par piste : record de la piste avec ses intermédiaires, puis le **meilleur tour publié de chaque pilote** (place, plaque, nom, club, catégorie, temps, écart). Un organisateur ou un spectateur arrive directement sur ce classement.
  - **Qui voit quoi** : le pilote voit toutes ses séances ; ses **amis** voient son meilleur tour sur chaque piste (publié ou non) ; une séance **publiée** est vue par **tout le monde** et compte au classement et au record.
  - **Données d'exemple** : bouton « Essayer avec des exemples » (≈ 2 mois de séances sur 2 pistes d'exemple), visibles seulement par le pilote, jamais publiables, « Effacer les exemples ».
  - Les vraies séances arriveront par l'**import** (fichier Excel puis transpondeurs) : à faire.
  - Code : `public/app/entrainement/` (`vue.js` = les écrans, `amis.js` = Mes amis, `entrainement.css`). Base : tables `pistes`, `entrainements`, `tours`, `amis` (migration `20261001200000_entrainements_amis_classement.sql`).
- **Compétition** — **vraies données** depuis le 01/10/2026 (`public/app/competitions/donnees-reelles.js`) : 23 compétitions réelles de 2026 trouvées sur le site de l'UCI (uci.org) et d'autres sources officielles (UEC, FFC, COPACI, Oceania Cycling, USA Cycling) : Coupe du monde UCI (5 week-ends), Championnats du monde (Brisbane), championnats d'Europe / panaméricains / d'Océanie / d'Asie, Coupe d'Europe UEC (6 week-ends), Championnat de France, Coupe de France (4 week-ends), Trophée de France, championnat des États-Unis. Pour chacune : lieu, dates, piste si connue, organisateur, description, **résultats publiés** (podiums, parfois d'autres places et des temps), **sources** cliquables. Fiche pilote : ses places dans la compétition. Recherche aussi par nom de pilote. Le détail des manches (temps à chaque ligne) n'est pas publié en données ouvertes : il viendra des fichiers des organisateurs. Les compétitions d'exemple restent visibles avec le bouton « Voir aussi des compétitions d'exemple (démo des temps détaillés) ».
- Écrans de la démo (données d'exemple) :
  - **Recherche** des compétitions du monde entier (nom, ville, pays, type, catégorie) + filtres En direct / À venir / Terminées.
  - **Page d'accueil d'une compétition** : statut, lieu, dates, type de course, format, piste (longueur, 3 inters + arrivée, secteurs), organisateur, chiffres (pilotes, équipes, catégories, manches), **horaires** jour par jour, **podiums**, **engagés** (pilotes ou équipes, filtre par catégorie, recherche).
  - **Rang UCI / rang FFC de chaque pilote** (consigne 42) : une pastille à côté du nom, partout où un pilote apparaît (classement, qualifs, manches, secteurs, passages, détail d'une manche, arbre, engagés, podiums, équipes) : « UCI 12 » = 12e au classement mondial UCI, « FFC 5 » = 5e au classement national FFC, « NC » = pas classé. Course internationale ou hors de France : rang UCI d'abord ; course française : rang FFC d'abord (si le pilote n'a pas le premier, on montre l'autre). Les engagés sont triés par place, puis par rang. Fiche pilote : ses **deux rangs en grand**, et dans chaque manche la liste **« Contre qui il a couru »** (place, plaque, nom, rang, pays, équipe, temps ; lui-même en or). Compétitions d'exemple : rangs inventés comme le reste (les plus rapides ont les meilleurs rangs ; UCI seulement pour Elite et Junior ; FFC pour les pilotes français). Vraies compétitions : rangs lus dans `RANGS` (`pilotes-elite.js`), **vide tant qu'on n'a pas le classement officiel** → on n'affiche rien plutôt qu'un rang faux.
  - **Fiche pilote** (pour la compétition) : place finale, tour atteint, points et rang aux qualifs, meilleur temps, **meilleur temps de chaque secteur et son rang dans la catégorie**, point fort, et **chaque manche** (place, temps, écart, couloir, et à chaque ligne : temps, temps du secteur, place, écart).
  - **Fiche équipe** : meilleure place, podiums, finalistes, qualifiés, et chaque pilote avec sa place et ses temps dans chaque manche.
  - **Temps et classements** : par catégorie → classement final, classement des qualifs (places Q1/Q2/Q3, points, qualifiés), et **toutes les manches** de chaque tour en 3 vues : arrivée, **secteurs**, passages.
  - **Détail d'une manche** : arrivée, temps par secteur (meilleur en or), passages (place à chaque ligne).
  - **Tableau final** : arbre des 1/16 → 1/8 → 1/4 → 1/2 → finale, avec les traits qui relient les manches ; on choisit à partir de quel tour l'afficher.
  - Format de course utilisé : 3 manches de qualifs par groupes de 8 max (1re place = 1 point…), les 4 premiers de chaque groupe vont au tableau final, puis les 4 premiers de chaque manche passent au tour suivant. 8 pilotes ou moins : classement aux points.
  - **Secteurs** : S1 départ → Inter 1, S2 Inter 1 → Inter 2, S3 Inter 2 → Inter 3, S4 Inter 3 → arrivée.
  - Code : `public/app/competitions/` (`donnees-exemple.js` = les données, `vue.js` = les écrans). Pour passer aux vraies données, il suffit de réécrire `listerCompetitions()` et `chargerCompetition(id)` pour lire Supabase.
- **Lieux** (fait le 01/10/2026) : les pistes de BMX et les pump tracks autour de soi.
  - **Carte détaillée** (MapLibre : rues, bâtiments, parcs, noms) qu'on peut faire glisser, zoomer, tourner et incliner. Avec la clé MapTiler : plan détaillé + bouton **Satellite** (vraie photo du terrain). Sans clé : plan détaillé OpenFreeMap (gratuit).
  - **Icônes dessinées dans la carte** : elles restent collées à leur endroit quand la carte bouge. Épingle **dorée** = piste de BMX, **bordeaux** = pump track, avec un pictogramme ; de loin, les pistes proches se regroupent dans une **pièce d'or** avec leur nombre (on la touche pour zoomer) ; de près, le **nom** de la piste s'affiche dessous ; l'épingle touchée **grossit** avec un halo. Un point doré qui respire = **ma position**. Au premier passage, l'appli demande la position et cherche à **35 km** autour. Si la position est refusée : la dernière recherche, sinon la France entière + un message pour chercher une ville.
  - **Barre de recherche** : en tapant, la liste se filtre par **nom de piste, ville ou gestionnaire** ; avec « Rechercher », si rien ne correspond ici, on cherche le **nom ou la ville ailleurs** (ex. « Sarrians ») et la carte y va.
  - **Filtres** Tout / Pistes BMX / Pump tracks, bouton **Me localiser**, bouton **Chercher dans cette zone** quand on déplace la carte.
  - **Liste** des pistes sous la carte, de la plus proche à la plus loin (nom, type, distance, ville). Toucher un repère ouvre une bulle « Voir la piste ».
  - **Fiche d'une piste** (`#lieux/way-123`) : photos (ou un dessin « Pas encore de photo »), nom, type, public/privé, distance, bouton **Y aller** (itinéraire Google Maps), **adresse**, **horaires d'ouverture**, **public ou privé**, **le tracé** (petite carte avec la piste dessinée en or, description, longueur, revêtement, éclairage), **le club** qui s'entraîne ici (+ site), **compétitions à venir**.
  - **API de la carte DBSpeed** (`/api/carte/…`, fonction Netlify `netlify/functions/carte.mts`) : `lieux` (pistes autour d'un point), `lieu` (une piste), `recherche` (ville ou piste), `adresse` (adresse d'un point). Elle lit OpenStreetMap, n'envoie que l'utile, et Netlify garde les réponses en cache (24 h pour les pistes, 7 jours pour une recherche, 30 jours pour une adresse). Si elle ne répond pas, l'appli lit OpenStreetMap elle-même (`public/app/lieux-osm.js`, code partagé avec l'API).
  - **Chercher tout un pays ou une région** (ex. « Slovaquie ») : si la ville trouvée est grande, l'appli montre **toutes les pistes de la zone** (jusqu'à la taille d'un pays) au lieu de 35 km. En dézoomant, le bouton « Chercher dans cette zone » cherche dans toute la carte visible. Sans ma position, la liste est rangée par nom (pas de distance trompeuse).
  - **Toute la France** (01/10/2026) : **577 lieux sûrs** (381 pistes de BMX et 196 pump tracks ; sur 1 426 au départ, ceux qui ne sont pas confirmés par OpenStreetMap à 150 m ou moins sont mis de côté, consigne 40) importés du **Recensement des équipements sportifs** du ministère des Sports (données officielles et gratuites, Licence Ouverte) : nom, position, adresse, public / réservé aux clubs, description (longueur, largeur, sol, éclairage, année), source. Taper « France » montre toute la France (lieux de la base seulement : OpenStreetMap en direct serait trop lourd à cette échelle). Pour mettre à jour : `select public.importer_data_es();`.
  - **Vrais lieux de Slovaquie** (01/10/2026) : **72 lieux sûrs** dans la table `lieux` (pistes de BMX : Bratislava-Rača, Košice-Furča, Liptovský Mikuláš, Dunajská Lužná, ancienne piste Iuventa ; 67 pump tracks), avec adresse, horaires et accès quand ils sont publiés, description du tracé, club, et **sources** (affichées en bas de la fiche). **Règle de vérification** (consigne 39) : un lieu n'est affiché que si une source indépendante confirme qu'il existe et que sa position est confirmée (OpenStreetMap à moins de 50 m ou adresse de la source) ; aucune position devinée. Un lieu de la base à moins de 250 m d'une piste OpenStreetMap du même type est fusionné avec elle (pas de doublon).
  - **D'où viennent les infos** : les pistes, leur forme, et parfois les horaires / l'accès / le revêtement viennent d'**OpenStreetMap** (carte libre et gratuite, via Overpass ; adresse et recherche de ville via Nominatim). Ce que DBSpeed ajoute (horaires, public/privé, description du tracé, photos, club, compétitions) est dans Supabase (tables `lieux` et `competitions`). **Seuls les organisateurs validés** pourront compléter une fiche ou ajouter une compétition (formulaire à faire).
- **Mon profil** : « ma page » (plaque dorée, nom, type de compte, club et catégorie, email), **Mes amis** (chercher un pilote par plaque ou nom, Ajouter, accepter / refuser une demande, retirer un ami avec confirmation), modifier ses infos (nom, plaque, catégorie, club), revoir le tuto, se déconnecter ; **Mes données et mon compte** : lien vers la page Confidentialité (`/confidentialite.html`) et **Supprimer mon compte** (avec confirmation : efface le profil, les séances et les amis ; les courses importées restent, sans le nom de l'organisateur).
  - **Chercher un pilote** (Mes amis) : avec sa plaque exacte ou au moins 3 lettres de son nom ; son club n'est visible que de ses amis.

**Ma position** (01/10/2026) :
- Demandée **une seule fois**, au tuto de la première connexion. Pour les comptes qui ont déjà fini le tuto : une carte « Active ta position » sur l'Accueil (Activer / Non merci).
- Le **choix** (oui / non) est enregistré dans le profil, donc il suit la personne sur tous ses téléphones. La **position** reste sur le téléphone (jamais envoyée dans la base) : seulement la dernière, avec sa ville.
- **À chaque connexion**, si c'est oui : l'appli reprend la position tout de suite (et quand on revient dans l'appli après 5 minutes). La ville s'affiche en haut à côté de la plaque (on la touche pour aller aux Lieux), et la carte des Lieux s'ouvre directement autour de soi, sans redemander.
- Si c'est non : l'appli ne redemande jamais toute seule (la carte des Lieux propose le bouton viseur).
- **Mon profil → Ma position** : état (activée / désactivée, dernière position et heure), bouton pour activer ou désactiver (désactiver efface la position du téléphone).

**Ce que chaque compte peut voir / faire** (à compléter)
- Pilote : ses temps, ses manches, toutes les manches.
- Organisateur : importer les temps (une fois validé).
- Spectateur : suivre les manches et les classements.

### Classements DBSpeed, onglet Compétition (consigne 45)

- Carte **« Classements »** en haut de la liste des compétitions → `#competition/classements` (code : `public/app/competitions/classements.js`, chargé seulement quand on l'ouvre).
- Choix : **Vrais résultats 2026** ou **Exemple (démo)** ; **Hommes / Femmes** ; **catégorie** (Elite, U23, Junior… celles qui ont des résultats) ; **niveau** : **Monde**, **Pays** (choisir le pays), **Région**, **Département** (France).
- **Notre propre classement**, calculé avec ce qui existe déjà (inspiré du classement UCI) : points de la place (1er 100, 2e 80, 3e 65, 4e 55, 5e 45, 6e 40, 7e 35, 8e 30, 9e-16e 20, 17e-32e 10, plus loin 5) **× importance de la compétition** (Championnat du monde ×6 ; Coupe du monde ×3 par manche ; Championnat d'Europe ×3 ; autres continentaux ×2,5 ; Coupe d'Europe ×1,5 ; championnats nationaux ×1,5 ; Coupe de France et Trophée de France ×1 ; Coupe de Slovaquie ×0,6 ; exemple : International ×3, National ×1,5, Régional ×0,5). Total de la saison, par catégorie. À égalité de points : même rang (puis meilleure place, puis victoires pour l'ordre). Le « classement final » d'une série ne compte pas (ses manches comptent déjà). Barème expliqué dans « Comment on calcule ? ».
- **Région et département** = ceux du **club** du pilote (comme les comités FFC), seulement pour les pilotes **français** dont on connaît le club (`pilotes-elite.js`, puis équipes de DN1). Compétitions d'exemple : département inventé mais fixe pour un même club.
- **Fiche d'un pilote** (`#competition/classements/pilote/<id>`) : club, département, région ; pour chaque catégorie : son rang **monde / pays / région / département** (« sur N »), et chaque course qui lui a rapporté des points (place × coefficient = points, lien vers la compétition).
- La fiche d'un vrai pilote dans une compétition montre son **rang mondial DBSpeed** (lien vers sa fiche de classement).
- Vrais résultats : **pas de classement Junior** (ce sont des mineurs : pas de fiche à leur nom) ; il est visible dans l'exemple.
- Limite honnête : les vrais résultats publiés sont souvent seulement les podiums → le classement deviendra complet quand les organisateurs importeront leurs résultats.

### Championnat de France des clubs (DN1), onglet Compétition

- En haut de la liste des compétitions, une carte **« Championnat de France des clubs »** ouvre la **DN1** de la saison : les 10 équipes, le champion, le classement publié (places et points), les vainqueurs DN2 et Équipe Avenir, les sources.
- En touchant une équipe : sa ville, sa région, son club, sa place, puis ses **pilotes femmes** et ses **pilotes hommes** (drapeau, pays, catégorie Elite ou U23).
- Les pilotes juniors (U19) sont **seulement comptés** : leur nom n'est pas affiché (ce sont souvent des mineurs).

### Note des lieux sur 20 (onglet Lieux)

Chaque piste de BMX et chaque pump track de France a une **note DBSpeed sur 20**, calculée avec la fiche officielle du ministère des Sports (Data ES). Une info qui n'est pas remplie dans la fiche compte 0 point. La fiche du lieu montre la note et le détail de chaque critère.

- **Piste de BMX** : longueur 4 pts (350 m et plus : 4 ; 300 m : 3 ; 200 m : 2 ; moins : 1) · sol 4 (enrobé 4 ; béton, terre artificielle, stabilisé, synthétique 3 ; terre battue 2 ; naturel 1) · éclairage 3 · vestiaires, toilettes, douches 3 (1 chacun) · récente ou refaite 3 (depuis 2018 : 3 ; 2008-2017 : 2 ; avant : 1) · homologation et tribune 2 · accès libre 1.
- **Pump track** : taille 6 (surface : 1 500 m² et plus 6, 800 : 5, 400 : 4, 200 : 3, moins : 2 ; sinon longueur) · sol 5 (enrobé 5 ; béton 4 ; synthétique 3 ; modulaire/autre, terre artificielle, stabilisé 2 ; terre 1) · éclairage 3 · accès libre 3 · récent 3 (depuis 2020 : 3 ; 2015-2019 : 2 ; avant : 1).

### Couleurs (site + appli)
- Même palette partout, rangée dans **un seul fichier** : `public/couleurs.css`. Chaque page l'ajoute.
- **Or** = couleur principale (boutons, titres, 1re place).
- **Vert** = couleur secondaire (fonds et cartes, en sombre).
- **Bordeaux** = accent (détails, badges, erreurs).
- **Fond en marbre** (comme des colonnes de palais) : marbre **vert** veiné de blanc pour le fond de page, marbre **bordeaux** pour les blocs. Images : `public/images/marbre-vert.jpg` et `marbre-bordeaux.jpg` (fabriquées par `outils/fabriquer-marbre.py`, elles se répètent sans raccord visible).
- **Or qui brille comme de l'or** : dégradé métallique avec des reflets qui bougent doucement, et un éclat de lumière qui passe sur les boutons. Cadre doré autour des blocs. Classes prêtes : `.or-brillant` (texte), `.bouton-or`, `.cadre-or`, `.marbre-vert`, `.marbre-bordeaux`.
- Si le téléphone est réglé sur « réduire les animations », l'or reste doré mais ne bouge plus.
- Appliqué sur : page d'accueil (sections en marbre bordeaux avec filets dorés, cartes en verre fumé à liseré doré, titres et pastilles en or), page appli (`/app/`), page « Pas de connexion » (`/offline.html`).
- Les pages utilisent des noms de rôle (`--fond`, `--principal`, `--texte`…), jamais les codes couleur directement : pour changer une couleur partout, on la change dans ce fichier.

### Logo (site + appli)
- **Logo officiel** : une médaille d'or (anneau doré, disque vert, « DB » en or métallique, 3 traits de vitesse bordeaux, « CHRONOMÉTRAGE » en haut et « BMX RACE » en bas, graduations de chrono).
- **4 styles** : **Officiel** (or et vert), **Néon** (noir et néon bleu, façon Tron : une lumière fait le tour, grille au sol), **Marbre blanc** (marbre blanc veiné, traits en or, étincelles), **Feu** (médaille en flammes, braises qui montent).
- **Animés** : graduations qui tournent doucement, reflet de lumière sur l'or, traits de vitesse qui filent ; s'arrêtent si le téléphone demande moins d'animations.
- Lettres transformées en **tracés** (le logo est le même partout, sans police à charger). Deux versions par style : `public/logos/<style>.svg` (médaille complète) et `<style>-icone.svg` (simple, pour les petites tailles).
- **Choix du logo** dans **Mon profil → Logo de l'appli** : change la médaille de la page de connexion, le logo du site, l'icône de l'onglet et l'icône « Ajouter à l'écran d'accueil » (un manifeste par style). Le choix reste sur le téléphone. Une appli **déjà installée** garde son icône : il faut la supprimer puis la réinstaller (le téléphone ne permet pas de la changer tout seul).
- **Écran d'ouverture animé** : à chaque ouverture de l'appli (`/app/…`), la médaille du style choisi apparaît en grand sur le fond de son style (marbre vert, noir néon, marbre blanc, braises), animée, pendant 1,7 s, puis l'appli s'affiche en fondu. Toucher l'écran le passe. Une fois par ouverture ; si l'appli passe de la connexion à l'accueil pendant l'ouverture, elle ne recommence pas. Avec « réduire les animations » : plus court et sans mouvement. (L'icône de l'écran d'accueil du téléphone, elle, ne peut pas être animée.)
- Fabrication : `outils/fabriquer-logos.py` (SVG) puis `outils/fabriquer-icones.mjs` (PNG 180, 192, 512 et 512 « maskable » pour chaque style).

### Ergonomie et sensations (site + appli) — à respecter sur chaque écran
- **Retour haptique à chaque appui** : une petite vibration quand on touche un bouton, un onglet, une carte, un lien. Un peu plus marquée pour une action importante (valider, envoyer), différente pour une erreur.
  - Sur Android : ça marche dans le navigateur. Sur iPhone, le navigateur ne laisse pas vibrer une page web : on remplace par un **effet visuel d'appui** (le bouton s'enfonce légèrement), et ce sera une vraie vibration si on fait plus tard une vraie appli.
  - Tout est rangé dans **un seul fichier commun** (ex. `public/sensations.js`) que chaque page ajoute, comme `couleurs.css`.
- **Animations fluides** :
  - Chaque bouton réagit **tout de suite** au toucher (il s'enfonce puis revient).
  - **Transition douce entre les pages** (glissement ou fondu), jamais d'écran blanc qui clignote.
  - Les listes et les cartes **apparaissent en douceur**, les unes après les autres.
  - Animations **courtes** (0,15 à 0,35 seconde), fluides même sur un petit téléphone.
  - Si le téléphone est réglé sur « réduire les animations », on les réduit aussi.
- **Vivant et de qualité, mais toujours lisible** (site, appli, tuto) :
  - Chaque écran **arrive en mouvement** (les éléments montent l'un après l'autre), chaque changement (onglet, champ qui s'ouvre, question) est **animé**, jamais un saut sec.
  - Les animations **expliquent** : la démo du site **rejoue une vraie manche** (le chrono tourne, le pilote avance sur la piste, sa place change à chaque ligne) ; le tuto éclaire chaque partie avec un **projecteur**.
  - **Le texte ne bouge jamais pendant qu'on doit le lire** : il arrive, puis il reste immobile. Les résultats restent affichés assez longtemps pour être lus.
  - De petits détails « vivants » : reflet qui passe sur l'or et la plaque, damier qui défile, icône d'onglet qui bondit, pilote BMX qui passe la ligne à la fin du tuto.
- **Ergonomie (UX)** :
  - Tout se fait **au pouce, d'une main** : gros boutons (au moins 44 px), actions importantes en bas de l'écran.
  - **Un seul bouton principal par écran**, bien visible.
  - L'utilisateur **sait toujours où il est** (titre, onglet actif) et **peut revenir en arrière**.
  - Chaque action donne un **retour clair** : chargement, réussite, erreur (avec un message simple).
- **Belle interface (UI) bien équilibrée** :
  - Espaces **réguliers** partout (toujours les mêmes tailles d'espace), rien de tassé, rien de trop vide.
  - Éléments **bien alignés et bien répartis** sur l'écran.
  - Peu de tailles de texte différentes, et une hiérarchie claire (titre, sous-titre, texte).
  - Les couleurs de la palette utilisées avec mesure : l'or pour ce qui compte, pas partout.

## 3. Format du fichier Excel (version actuelle)

Onglet `Temps`, une ligne par pilote dans une manche :

| Manche | Plaque | Pilote | Couloir | Départ | Inter 1 | Inter 2 | Inter 3 | Arrivée |
|---|---|---|---|---|---|---|---|---|
| 1 | 21 | Enzo Robert | 4 | 0.000 | 6.187 | 17.355 | 27.092 | 36.118 |

- Temps en **secondes depuis la chute de la grille** (36.118 = 36 s et 118 millièmes).
- **Case vide** = le pilote n'est pas passé sur cette ligne.
- Exemple complet : `exemples/temps-exemple.xlsx` (3 manches : 8, 5 et 1 pilote, avec une chute).

## 4. Outils utilisés

- **Netlify** : met le site en ligne.
- **Supabase** : base de données (pour garder les manches, pilotes et temps).
- **Resend** : envoie des mails depuis `sportco.cloud`.
- **GitHub** : garde le code. Chaque modification met le site à jour tout seul.

## 5. Questions encore ouvertes

À régler avec l'utilisateur au fur et à mesure :
1. **Qui importe le fichier Excel ?** → les **organisateurs**. Reste à confirmer : validation à la main des comptes organisateur ?
2. **Comment relier un compte à un pilote ?** → fait avec le **numéro de plaque** donné à l'inscription.
3. **« Télécharger l'application »** : choix pris par défaut le 01/10/2026 → **appli web installable** sur l'écran d'accueil (gratuit, marche avec Netlify). À confirmer ; l'App Store / Google Play reste possible plus tard.
4. **Mail en plus ?** Envoyer aussi les résultats par mail (Resend) à la fin de la manche ?
5. **Faut-il garder l'historique** des courses (pour voir sa progression) ?
6. **Combien d'intermédiaires** sur une vraie piste ? (l'exemple en a 3)
7. **Format exact des transpondeurs** : temps depuis le départ, ou heure exacte du passage ?
8. ~~Que mettre dans les onglets Entraînement et Compétition ?~~ → fait le 01/10/2026.
10. **Entraînement** : comment arrivent les séances d'entraînement (le pilote importe son fichier ? le club ? les transpondeurs directement) ? Qui crée les **pistes** (nom, lieu, tracé, place des lignes) ?
11. **Record de la piste** : seulement avec les séances publiées (choix actuel) ou aussi les temps de compétition ?
9. **« Voir sa page »** : seulement pour soi, ou une page publique que les autres peuvent voir ?
10. **Lieux** : qui complète les fiches des pistes (organisateurs validés seulement, ou aussi les clubs / les pilotes avec validation) ? Faut-il un compte « club » ?
