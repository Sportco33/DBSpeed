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

## À faire, dans l'ordre
1. [ ] **Site de présentation** : page d'accueil qui présente DBSpeed + bouton pour installer l'appli.
2. [ ] **Importer le fichier Excel** : une page où on choisit le fichier, et l'appli le lit.
3. [ ] **Calculer les résultats** : temps à chaque ligne, temps entre deux lignes, positions, écart avec le premier, pilote qui ne finit pas.
4. [ ] **Enregistrer dans Supabase** : garder les manches, pilotes et temps (avec la sécurité de la base activée).
5. [ ] **Comptes pilotes** : créer un compte, se connecter, relier le compte à son numéro de plaque.
6. [ ] **Page « Mes manches »** : le pilote voit ses temps et positions, pensé pour téléphone.
7. [ ] **Page « Toutes les manches »** : liste des manches et leurs classements.
8. [ ] **Rendre l'appli installable** sur l'écran d'accueil du téléphone.
9. [ ] **Rendre le site public** (enlever la protection Netlify).
10. [ ] **Envoyer les résultats par mail** (Resend) — à confirmer.
11. [ ] **Adapter au format des transpondeurs** quand on aura un vrai fichier.

## À faire partout (en même temps que chaque écran)
- [ ] **Fichier commun « sensations »** (`public/sensations.js`) : vibration à chaque appui + effet d'appui visuel, ajouté sur toutes les pages.
- [ ] **Transitions fluides entre les pages** et apparition douce des listes.
- [ ] **Vérifier chaque écran** : gros boutons, un seul bouton principal, espaces réguliers, bien équilibré.

## Petits nettoyages (moins urgent)
- [ ] Économiser les crédits Netlify : ne pas relancer de mise en ligne quand seuls les fichiers `docs/` changent.
- [ ] Enlever la page de test quand la vraie page d'accueil sera prête.
- [ ] Donner un nom plus propre au site (ex. `dbspeed-bmx.netlify.app`).
- [ ] Choisir si le dépôt GitHub reste public ou passe en privé.
