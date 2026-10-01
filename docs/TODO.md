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
- [x] Tuto de la première connexion : bienvenue, infos (club, catégorie), visite guidée avec projecteur, « Revoir le tuto » ; base Supabase mise à jour (club, catégorie, tuto_fini) (sur `travail`) (01/10/2026)

## À faire, dans l'ordre
1. [ ] **Réglages à faire par Nicolas** (sinon la connexion ne marche pas en ligne) :
   - [ ] Supabase → adresses du site (Site URL + Redirect URLs)
   - [ ] Supabase → envoi des mails avec Resend (SMTP)
   - [ ] Google Cloud → créer l'accès Google, puis l'activer dans Supabase
2. [ ] **pushcoco** puis tester en vrai : créer un compte, confirmer le mail, se connecter, Google.
3. [ ] **Contenu des onglets Entraînement et Compétition** (à préciser avec Nicolas).
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
- [ ] Vérifier avec Nicolas la **liste des catégories** BMX proposées (Pré-licencié, Poussin, Pupille, Benjamin, Minime, Cadet, Junior, Senior, Elite, Master, Cruiser).
- [ ] Mettre les mails de Supabase (confirmation, mot de passe) en français.
- [ ] Ajouter « Mot de passe oublié ».
- [ ] Économiser les crédits Netlify : ne pas relancer de mise en ligne quand seuls les fichiers `docs/` changent.
- [ ] Enlever la page de test (`/test.html`) quand l'appli sera prête.
- [ ] Ajouter de vraies captures d'écran de l'appli sur le site quand elle existera.
- [ ] Vérifier les textes du site si les choix changent (gratuit, compte avec numéro de plaque).
- [ ] Donner un nom plus propre au site (ex. `dbspeed-bmx.netlify.app`).
- [ ] Choisir si le dépôt GitHub reste public ou passe en privé.
