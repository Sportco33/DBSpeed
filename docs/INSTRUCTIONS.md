# Consignes de l'utilisateur

*Chaque consigne donnée à Claude est notée ici, avec la date. La plus récente en bas.*

## 30/09/2026
1. Créer une appli de chronomètre pour le **BMX race** : ligne de départ (ou système de départ), plusieurs lignes intermédiaires, une ligne d'arrivée. À la fin du tour, les pilotes ont toutes les infos sur leurs temps de passage.
2. Une course se fait de **1 à 8 pilotes** en même temps : chaque pilote doit avoir sa **position aux intermédiaires** et surtout **à l'arrivée**.
3. Les temps de passage arrivent dans un **Excel** : l'appli doit le lire et donner à chaque pilote ses temps.
4. Travailler avec **Supabase, Netlify et Resend**.
5. Créer un **projet Supabase à part** pour ne pas mélanger avec les autres projets. → Projet « SportCo » mis en pause pour libérer la place.
6. Le nom de l'appli est **« DBSpeed »**.
7. Toujours donner les étapes **avec les liens et où appuyer**.
8. Pour l'instant, travail **uniquement sur téléphone**, pas d'ordi. Travailler avec **GitHub**.
9. Créer un **fichier Excel d'exemple** pour développer l'appli. Plus tard, on adaptera pour que ça marche avec les **transpondeurs**.
10. Faire un **cahier des charges** et une **TODO** qu'on améliorera avec le temps.
11. **Noter chaque consigne dans un fichier** pour qu'une nouvelle conversation Claude Code y ait accès.
12. Répondre à chaque fois de la manière **la plus simple et claire possible**.
13. Dire clairement **les étapes, les liens, où cliquer**.
14. **Ne pas faire d'erreur** : vérifier avant de dire que c'est fait.
15. À chaque fois, dire **les choses principales à améliorer**, en commençant par la plus importante.
16. **Mot de code « pushcoco »** : ne publier (commit + push sur `main`, donc mise en ligne Netlify) **que quand l'utilisateur dit « pushcoco »**, car il a peu de crédits Netlify. À ce moment-là, prendre en compte tout ce qui a été dit dans toutes les conversations et tout ce qui est sur GitHub, puis commit et push.
17. Faire une **webapp** avec :
    - un **site qui présente le projet** et qui permet de **télécharger l'application** ;
    - une **application** où les utilisateurs peuvent **créer un compte**, **voir les temps de leur manche** et **voir toutes les manches**.

## 01/10/2026
18. **Palette de couleurs** pour l'application ET la webapp : **Or** (principale), **Vert** (secondaire), **Bordeaux** (accent), chacune en 6 teintes (50 à 900) :
    - Or : `#FBF5E6` `#F2DFAE` `#E2C06E` `#D4A63A` `#9A7228` `#5E4518`
    - Vert : `#EAF1EE` `#C8DBD3` `#6E9A89` `#2E5246` `#213B32` `#14241F`
    - Bordeaux : `#F6ECEE` `#E6C9CE` `#B06B77` `#5C2A33` `#431E25` `#2A1217`
    → Rangée dans `public/couleurs.css`.
19. **Ergonomie et sensations (UI / UX)**, pour l'application ET la webapp :
    - **Retour haptique** (vibration courte) **à chaque fois qu'on appuie sur quelque chose** : boutons, onglets, cartes, liens.
    - **Animations de transition super fluides** à chaque clic et à chaque changement de page.
    - Une appli **ergonomique**, avec une **bonne UI et une bonne UX**.
    - Un écran **bien équilibré et bien réparti** (espaces réguliers, rien de tassé, rien de vide).
