# TODO — DBSpeed

*Rangé par ordre d'importance. On coche au fur et à mesure.*

## Fait ✅
- [x] Créer le projet Supabase séparé (« DBSpeed »)
- [x] Créer le site Netlify (`dbspeed-2let`) et le relier au GitHub
- [x] Brancher Resend (domaine `sportco.cloud`)
- [x] Page de test : Supabase ✅ et Resend ✅ (30/09/2026)
- [x] Fichier Excel d'exemple (`exemples/temps-exemple.xlsx`)
- [x] Cahier des charges, TODO et fichier des consignes

## À faire, dans l'ordre
1. [ ] **Importer le fichier Excel** : une page où on choisit le fichier, et l'appli le lit.
2. [ ] **Calculer les résultats** : temps à chaque ligne, temps entre deux lignes, positions, écart avec le premier, pilote qui ne finit pas.
3. [ ] **Afficher les résultats** : classement de la manche + fiche de chaque pilote, pensé pour téléphone.
4. [ ] **Enregistrer dans Supabase** : garder les manches, pilotes et temps (avec la sécurité de la base activée).
5. [ ] **Envoyer les résultats par mail** aux pilotes (Resend) — à confirmer (voir questions ouvertes).
6. [ ] **Rendre le site public** pour les pilotes (enlever la protection Netlify).
7. [ ] **Adapter au format des transpondeurs** quand on aura un vrai fichier.

## Petits nettoyages (moins urgent)
- [ ] Économiser les crédits Netlify : ne pas relancer de mise en ligne quand seuls les fichiers `docs/` changent.
- [ ] Enlever la page de test quand la vraie page d'accueil sera prête.
- [ ] Donner un nom plus propre au site (ex. `dbspeed-bmx.netlify.app`).
- [ ] Choisir si le dépôt GitHub reste public ou passe en privé.
