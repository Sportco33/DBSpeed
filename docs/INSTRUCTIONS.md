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
20. Faire un **bon site web** qui montre tout ce que fait l'appli et **donne envie**, avec une explication **simple et précise** pour **télécharger l'appli**.
21. **Fond en marbre** aux couleurs de la palette, comme sur la photo envoyée (colonnes en marbre bordeaux et vert veiné de blanc, chapiteaux dorés).
22. L'**or doit ressembler à du vrai or** et **briller** comme de l'or.
23. Dans l'appli, une **première page de connexion** avec **3 types de connexion** : **pilotes, organisateurs, spectateurs**. Sur cette page : **se connecter** et **créer un compte**. Ajouter la **connexion avec Google**.
24. Une fois connecté, on arrive sur la **page d'accueil**, avec des **onglets en bas de l'écran** : **Accueil**, **Entraînement**, **Compétition**, **Mon profil**. L'onglet profil sert à **modifier ses informations** et **voir sa page**.
25. À la **première connexion**, un **tuto fluide, intuitif, clair et simple**, qui montre avec un **projecteur** ce qu'il faut comprendre. La personne doit aussi **entrer les informations la concernant**.
26. L'**application**, le **site** et le **tuto** doivent être **animés**, **vivants** et **de qualité**, tout en restant **lisibles et compréhensibles**.
27. **Onglet Compétition** :
    - une **barre de recherche** pour trouver les **compétitions de BMX dans le monde** ;
    - en cliquant sur une compétition : sa **page d'accueil** avec toutes les infos (**lieu, horaires, nombre de pilotes, type de course**) et la **liste des pilotes et des équipes engagés** ;
    - en cliquant sur un **pilote** ou une **équipe** : toutes ses infos **pour cette compétition** (place, temps dans chaque manche) ;
    - sur la page d'accueil de la compétition, un **bouton pour voir les temps et le classement de toutes les manches** et un **arbre** pour voir les **1/16, 1/8, 1/4, 1/2, finale** ;
    - ça doit être **complet** : tous les temps de tous les pilotes, leurs places, et les **temps par secteur**.
28. **Onglet Entraînement** :
    - un **calendrier** (jours, mois, années) pour retrouver les données du pilote ; on voit **les jours où il a enregistré des données** ;
    - en touchant un jour : **tout ce qu'il a enregistré** : **nombre de tours**, **où** il s'est entraîné, **sur quelle piste**, et un **tracé** qui montre la piste ;
    - il voit **chaque tour** ; en touchant un tour, il a **tous les intermédiaires calculés** ;
    - il peut voir les **intermédiaires de ses amis** (qu'il a dans l'appli) et les **intermédiaires record de la piste** ;
    - il peut **publier ses données** : tous les utilisateurs voient alors ses temps, et il y a un **classement**.
29. **Onglet Lieux** :
    - une **barre de recherche** et une **carte** pour voir les **pistes de BMX** et les **pump tracks** autour de l'utilisateur ;
    - on peut **chercher une piste** ;
    - en cliquant sur une piste : sa **page d'accueil** avec toutes les infos : **lieu**, **horaires d'ouverture**, **public ou privé**, **comment est le tracé**, **photos**, **nom du club qui s'entraîne ici**, **compétitions qui auront lieu ici**.
30. **Carte de l'onglet Lieux** :
    - **créer une API pour la carte** ;
    - une carte **détaillée** ;
    - **dès que la carte bouge, les icônes bougent avec elle** ;
    - des icônes **belles** et **bien adaptées à la carte**.
31. Mettre des **vraies données** (compétitions) : chercher sur le **site de l'UCI**.
32. Chercher des données pour montrer les **vrais lieux qui existent** : voir **tous les lieux en Slovaquie**.
33. Ajouter la **localisation** dans l'appli : la **demander dès la première connexion**, puis **l'enregistrer**, et **dès qu'il se connecte, mettre la localisation** tout de suite.
34. **Ne rien payer** : tous les services utilisés doivent rester gratuits (pas de carte bancaire, pas d'offre payante, pas d'essai gratuit qui demande une carte).
35. Faire un **diagnostic complet** de l'appli avec un **score sur 100**, puis **l'améliorer le plus possible**.
