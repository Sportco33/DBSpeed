-- DBSpeed : le choix de la personne pour la localisation
-- Déjà appliqué sur le projet Supabase « DBSpeed » le 01/10/2026 (ne pas relancer).
-- vide = pas encore demandé, vrai = oui, faux = non.
-- La position elle-même n'est PAS enregistrée dans la base (elle reste sur le téléphone).
alter table public.profils add column localisation boolean;
comment on column public.profils.localisation is 'Choix pour la localisation : null = pas encore demandé, true = autorisée, false = refusée. La position reste sur le téléphone.';
grant update (localisation) on public.profils to authenticated;
