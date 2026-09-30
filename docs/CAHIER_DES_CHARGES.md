# Cahier des charges — DBSpeed

*Dernière mise à jour : 30/09/2026. Ce document évolue avec le projet.*

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
1. **Qui utilise l'appli ?** Le chronométreur qui importe le fichier, les pilotes qui regardent leurs temps, les deux ?
2. **Comment les pilotes reçoivent leurs temps ?** Sur une page, par mail (Resend), les deux ? Où trouver leur adresse mail ?
3. **Faut-il garder l'historique** des courses (pour voir sa progression) ?
4. **Combien d'intermédiaires** sur une vraie piste ? (l'exemple en a 3)
5. **Format exact des transpondeurs** : temps depuis le départ, ou heure exacte du passage ?
