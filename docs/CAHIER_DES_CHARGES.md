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

**Après connexion** (`/app/accueil.html`), des **onglets en bas de l'écran** :
- **Accueil** : bonjour + dernières manches.
- **Entraînement** : les temps des tours d'entraînement (contenu à préciser).
- **Compétition** : les manches des courses et leurs classements (contenu à préciser).
- **Mon profil** : « ma page » (plaque dorée, nom, type de compte, email), modifier ses infos, se déconnecter.

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
8. **Que mettre dans les onglets Entraînement et Compétition ?**
9. **« Voir sa page »** : seulement pour soi, ou une page publique que les autres peuvent voir ?
