-- DBSpeed : onglet Lieux (pistes de BMX et pump tracks) + compétitions de chaque lieu
-- Déjà appliqué sur le projet Supabase « DBSpeed » le 01/10/2026 (ne pas relancer).
--
-- Les pistes viennent d'OpenStreetMap (carte libre). Cette table garde seulement
-- ce que DBSpeed ajoute en plus : horaires, public/privé, tracé, photos, club…
-- On peut aussi y ajouter une piste qui n'est pas dans OpenStreetMap (id « dbs-… »).

-- 1. Les compléments de chaque lieu
create table public.lieux (
  id text primary key,                         -- « way-123 » (OpenStreetMap) ou « dbs-<uuid> »
  genre text not null default 'bmx',           -- bmx = piste de BMX race, pump = pump track
  nom text,
  latitude double precision,
  longitude double precision,
  adresse text,
  horaires text,
  acces text,                                  -- public, prive, club
  trace text,                                  -- description du tracé (bosses, virages, butte de départ…)
  photos text[] not null default '{}',         -- adresses https des photos
  club text,
  club_site text,
  modifie_par uuid default auth.uid() references auth.users (id) on delete set null,
  modifie_le timestamptz not null default now(),
  constraint lieu_id_valide check (id ~ '^(node|way|relation|dbs)-[0-9a-z-]{1,40}$'),
  constraint lieu_genre_valide check (genre in ('bmx', 'pump')),
  constraint lieu_acces_valide check (acces is null or acces in ('public', 'prive', 'club')),
  constraint lieu_latitude_valide check (latitude is null or latitude between -90 and 90),
  constraint lieu_longitude_valide check (longitude is null or longitude between -180 and 180),
  constraint lieu_nom_pas_trop_long check (nom is null or char_length(nom) <= 120),
  constraint lieu_adresse_pas_trop_longue check (adresse is null or char_length(adresse) <= 200),
  constraint lieu_horaires_pas_trop_longs check (horaires is null or char_length(horaires) <= 500),
  constraint lieu_trace_pas_trop_long check (trace is null or char_length(trace) <= 2000),
  constraint lieu_club_pas_trop_long check (club is null or char_length(club) <= 120),
  constraint lieu_club_site_pas_trop_long check (club_site is null or char_length(club_site) <= 300),
  constraint lieu_pas_trop_de_photos check (cardinality(photos) <= 12)
);

comment on table public.lieux is 'Ce que DBSpeed ajoute aux pistes de BMX et pump tracks d''OpenStreetMap : horaires, accès, tracé, photos, club.';

-- 2. Les compétitions qui ont lieu sur une piste
create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  lieu_id text not null references public.lieux (id) on delete cascade,
  nom text not null,
  date_debut date not null,
  date_fin date,
  niveau text,                                 -- Départemental, Régional, Coupe de France…
  lien text,
  cree_par uuid default auth.uid() references auth.users (id) on delete set null,
  cree_le timestamptz not null default now(),
  constraint competition_nom_valide check (char_length(nom) between 2 and 120),
  constraint competition_dates_valides check (date_fin is null or date_fin >= date_debut),
  constraint competition_niveau_pas_trop_long check (niveau is null or char_length(niveau) <= 60),
  constraint competition_lien_pas_trop_long check (lien is null or char_length(lien) <= 300)
);

comment on table public.competitions is 'Compétitions de BMX prévues sur un lieu (onglet Lieux).';

create index competitions_par_lieu on public.competitions (lieu_id, date_debut);
create index competitions_cree_par on public.competitions (cree_par);
create index lieux_modifie_par on public.lieux (modifie_par);

-- 3. Qui peut écrire : seulement un organisateur validé par l'équipe DBSpeed
create or replace function public.est_organisateur_valide()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profils
     where id = (select auth.uid())
       and type_compte = 'organisateur'
       and organisateur_valide
  );
$$;

revoke execute on function public.est_organisateur_valide() from public, anon;
grant execute on function public.est_organisateur_valide() to authenticated;

-- 4. Sécurité : tout le monde lit, seuls les organisateurs validés écrivent
alter table public.lieux enable row level security;
alter table public.competitions enable row level security;

create policy "Tout le monde lit les lieux"
  on public.lieux for select to anon, authenticated
  using (true);

create policy "Les organisateurs validés ajoutent un lieu"
  on public.lieux for insert to authenticated
  with check ((select public.est_organisateur_valide()));

create policy "Les organisateurs validés complètent un lieu"
  on public.lieux for update to authenticated
  using ((select public.est_organisateur_valide()))
  with check ((select public.est_organisateur_valide()));

create policy "Tout le monde lit les compétitions"
  on public.competitions for select to anon, authenticated
  using (true);

create policy "Les organisateurs validés ajoutent une compétition"
  on public.competitions for insert to authenticated
  with check ((select public.est_organisateur_valide()) and cree_par = (select auth.uid()));

create policy "L'organisateur modifie ses compétitions"
  on public.competitions for update to authenticated
  using ((select public.est_organisateur_valide()) and cree_par = (select auth.uid()))
  with check ((select public.est_organisateur_valide()) and cree_par = (select auth.uid()));

create policy "L'organisateur supprime ses compétitions"
  on public.competitions for delete to authenticated
  using ((select public.est_organisateur_valide()) and cree_par = (select auth.uid()));

revoke all on public.lieux, public.competitions from anon, authenticated;
grant select on public.lieux, public.competitions to anon, authenticated;
grant insert (id, genre, nom, latitude, longitude, adresse, horaires, acces, trace, photos, club, club_site)
  on public.lieux to authenticated;
grant update (genre, nom, latitude, longitude, adresse, horaires, acces, trace, photos, club, club_site)
  on public.lieux to authenticated;

grant insert (lieu_id, nom, date_debut, date_fin, niveau, lien) on public.competitions to authenticated;
grant update (nom, date_debut, date_fin, niveau, lien) on public.competitions to authenticated;
grant delete on public.competitions to authenticated;

-- 5. Qui a modifié une fiche, et quand (rempli tout seul)
create or replace function public.lieu_modifie()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.modifie_par := (select auth.uid());
  new.modifie_le := now();
  return new;
end;
$$;

revoke execute on function public.lieu_modifie() from public, anon, authenticated;

create trigger avant_modification_lieu
  before update on public.lieux
  for each row execute function public.lieu_modifie();
