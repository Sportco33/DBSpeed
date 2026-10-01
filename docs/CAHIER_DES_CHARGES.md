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
3. **Visite guidée avec un projecteur** : tout l'écran passe dans l'ombre sauf la partie expliquée, éclairée avec un halo doré, et une bulle explique à quoi elle sert. Le projecteur glisse d'une partie à l'autre : la plaque, puis chaque onglet (l'onglet s'ouvre derrière). Boutons « Suivant » et « Passer ».
4. **Tu es prêt !** : damier d'arrivée, bouton « Commencer ».

**Après connexion** (`/app/accueil.html`), des **onglets en bas de l'écran** :
- **Accueil** : bonjour + dernières manches.
- **Entraînement** (fait le 01/10/2026, base Supabase en place) :
  - **Calendrier** (pilote) : mois par mois, flèches ou glisser le doigt pour changer de mois, touche le titre pour choisir un mois / une année. Les **jours avec des données sont dorés** et montrent le nombre de tours ; petit point bordeaux = séance publiée ; résumé du mois (séances, tours).
  - **Une journée** : la **piste** (nom, lieu), son **tracé** dessiné avec le départ (D), les intermédiaires (I1, I2…) et l'arrivée (A, damier) ; chiffres (tours, meilleur, moyenne, chutes) ; **liste des tours** (temps, écart avec le meilleur, chute) ; **Publier cette séance** (avec confirmation) / Retirer du classement ; Supprimer la séance.
  - **Un tour** : temps final, tracé où un pilote **rejoue le tour** au rythme des vrais temps, **tous les intermédiaires** (temps depuis la grille + temps de chaque secteur), et **Comparer** avec : **record de la piste**, **meilleurs intermédiaires de la piste** (meilleur temps publié à chaque ligne), **mon meilleur tour**, **chacun de mes amis**. Écart à chaque ligne et par secteur (vert = plus rapide, bordeaux = plus lent), secteurs colorés sur le tracé, tableau « tout le monde, ligne par ligne ». Boutons tour précédent / suivant.
  - **Classement** par piste : record de la piste avec ses intermédiaires, puis le **meilleur tour publié de chaque pilote** (place, plaque, nom, club, catégorie, temps, écart). Un organisateur ou un spectateur arrive directement sur ce classement.
  - **Qui voit quoi** : le pilote voit toutes ses séances ; ses **amis** voient son meilleur tour sur chaque piste (publié ou non) ; une séance **publiée** est vue par **tout le monde** et compte au classement et au record.
  - **Données d'exemple** : bouton « Essayer avec des exemples » (≈ 2 mois de séances sur 2 pistes d'exemple), visibles seulement par le pilote, jamais publiables, « Effacer les exemples ».
  - Les vraies séances arriveront par l'**import** (fichier Excel puis transpondeurs) : à faire.
  - Code : `public/app/entrainement/` (`vue.js` = les écrans, `amis.js` = Mes amis, `entrainement.css`). Base : tables `pistes`, `entrainements`, `tours`, `amis` (migration `20261001200000_entrainements_amis_classement.sql`).
- **Compétition** (fait le 01/10/2026, avec des données d'exemple) :
  - **Recherche** des compétitions du monde entier (nom, ville, pays, type, catégorie) + filtres En direct / À venir / Terminées.
  - **Page d'accueil d'une compétition** : statut, lieu, dates, type de course, format, piste (longueur, 3 inters + arrivée, secteurs), organisateur, chiffres (pilotes, équipes, catégories, manches), **horaires** jour par jour, **podiums**, **engagés** (pilotes ou équipes, filtre par catégorie, recherche).
  - **Fiche pilote** (pour la compétition) : place finale, tour atteint, points et rang aux qualifs, meilleur temps, **meilleur temps de chaque secteur et son rang dans la catégorie**, point fort, et **chaque manche** (place, temps, écart, couloir, et à chaque ligne : temps, temps du secteur, place, écart).
  - **Fiche équipe** : meilleure place, podiums, finalistes, qualifiés, et chaque pilote avec sa place et ses temps dans chaque manche.
  - **Temps et classements** : par catégorie → classement final, classement des qualifs (places Q1/Q2/Q3, points, qualifiés), et **toutes les manches** de chaque tour en 3 vues : arrivée, **secteurs**, passages.
  - **Détail d'une manche** : arrivée, temps par secteur (meilleur en or), passages (place à chaque ligne).
  - **Tableau final** : arbre des 1/16 → 1/8 → 1/4 → 1/2 → finale, avec les traits qui relient les manches ; on choisit à partir de quel tour l'afficher.
  - Format de course utilisé : 3 manches de qualifs par groupes de 8 max (1re place = 1 point…), les 4 premiers de chaque groupe vont au tableau final, puis les 4 premiers de chaque manche passent au tour suivant. 8 pilotes ou moins : classement aux points.
  - **Secteurs** : S1 départ → Inter 1, S2 Inter 1 → Inter 2, S3 Inter 2 → Inter 3, S4 Inter 3 → arrivée.
  - Code : `public/app/competitions/` (`donnees-exemple.js` = les données, `vue.js` = les écrans). Pour passer aux vraies données, il suffit de réécrire `listerCompetitions()` et `chargerCompetition(id)` pour lire Supabase.
- **Mon profil** : « ma page » (plaque dorée, nom, type de compte, club et catégorie, email), **Mes amis** (chercher un pilote par plaque ou nom, Ajouter, accepter / refuser une demande, retirer un ami avec confirmation), modifier ses infos (nom, plaque, catégorie, club), revoir le tuto, se déconnecter.

**Ce que chaque compte peut voir / faire** (à compléter)
- Pilote : ses temps, ses manches, toutes les manches.
- Organisateur : importer les temps (une fois validé).
- Spectateur : suivre les manches et les classements.

### Couleurs (site + appli)
- Même palette partout, rangée dans **un seul fichier** : `public/couleurs.css`. Chaque page l'ajoute.
- **Or** = couleur principale (boutons, titres, 1re place).
- **Vert** = couleur secondaire (fonds et cartes, en sombre).
- **Bordeaux** = accent (détails, badges, erreurs).
- **Fond en marbre** (comme des colonnes de palais) : marbre **vert** veiné de blanc pour le fond de page, marbre **bordeaux** pour les blocs. Images : `public/images/marbre-vert.jpg` et `marbre-bordeaux.jpg` (fabriquées par `outils/fabriquer-marbre.py`, elles se répètent sans raccord visible).
- **Or qui brille comme de l'or** : dégradé métallique avec des reflets qui bougent doucement, et un éclat de lumière qui passe sur les boutons. Cadre doré autour des blocs. Classes prêtes : `.or-brillant` (texte), `.bouton-or`, `.cadre-or`, `.marbre-vert`, `.marbre-bordeaux`.
- Si le téléphone est réglé sur « réduire les animations », l'or reste doré mais ne bouge plus.
- Appliqué sur : page d'accueil (sections en marbre bordeaux avec filets dorés, cartes en verre fumé à liseré doré, titres et pastilles en or), page appli (`/app/`), page de test (`/test.html`).
- Les pages utilisent des noms de rôle (`--fond`, `--principal`, `--texte`…), jamais les codes couleur directement : pour changer une couleur partout, on la change dans ce fichier.

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
