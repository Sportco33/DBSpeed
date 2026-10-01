-- DBSpeed : infos en plus dans le profil + tuto de la première connexion
-- Déjà appliqué sur le projet Supabase « DBSpeed » le 01/10/2026 (ne pas relancer).

alter table public.profils
  add column club text,
  add column categorie text,
  add column tuto_fini boolean not null default false,
  add constraint club_pas_trop_long check (club is null or char_length(club) <= 80),
  add constraint categorie_pas_trop_longue check (categorie is null or char_length(categorie) <= 40);

comment on column public.profils.club is 'Club du pilote, club organisateur, ou club suivi par le spectateur.';
comment on column public.profils.categorie is 'Catégorie du pilote (Minime, Cadet, Junior…), seulement pour les pilotes.';
comment on column public.profils.tuto_fini is 'Vrai quand le tuto de la première connexion est terminé ou passé.';

-- Chacun peut aussi modifier son club, sa catégorie et dire qu'il a fini le tuto
-- (toujours jamais son type ni la validation organisateur)
grant update (club, categorie, tuto_fini) on public.profils to authenticated;
