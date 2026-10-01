-- Vérification stricte des lieux de France (consigne 40, 01/10/2026).
-- Règle : un lieu Data ES (ministère des Sports = 1re source, qui dit qu'il existe) n'est gardé que si
-- OpenStreetMap (2e source) a une piste de BMX / pump track à 150 m ou moins (la position est confirmée).
-- Résultat le 01/10/2026 : 577 gardés (381 pistes de BMX, 196 pump tracks), 849 mis de côté.
--
-- Comment c'était fait : la base a lu OpenStreetMap elle-même (extension http, curlopt TIMEOUT 300) avec Overpass :
--   area["ISO3166-1"="FR"][admin_level=2]->.fr;(nwr["sport"~"bmx"](area.fr);nwr["cycling"="pump_track"](area.fr););out tags center;
--   area["ISO3166-1"="FR"][admin_level=2]->.fr;(nwr["sport"~"cycling|bicycle"](area.fr););out tags center;
-- → table temporaire verif.osm_fr (3 649 éléments), puis verif.proche_fr = pour chaque lieu dbs-fr-…,
-- l'élément OpenStreetMap le plus proche parmi : sport~bmx, cycling=pump_track, ou sport~cycling avec
-- leisure=track/pitch (sauf vélodromes). Le schéma verif a été supprimé après.

create table if not exists public.lieux_a_confirmer (like public.lieux including defaults);
alter table public.lieux_a_confirmer add column if not exists raison text,
  add column if not exists osm_proche text, add column if not exists distance_osm integer,
  add column if not exists mis_de_cote_le timestamptz not null default now();
do $$ begin alter table public.lieux_a_confirmer add primary key (id); exception when others then null; end $$;
alter table public.lieux_a_confirmer enable row level security;
revoke all on public.lieux_a_confirmer from anon, authenticated;
comment on table public.lieux_a_confirmer is 'Lieux pas assez sûrs (une seule source) : pas affichés. Les remettre dans lieux quand une 2e source confirme existence et position.';

-- 1. Lieux confirmés : lien OpenStreetMap ajouté dans les sources
update public.lieux l set sources = coalesce(l.sources, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
    'nom', 'OpenStreetMap – la même piste, à ' || round(p.d)::int || ' m',
    'url', 'https://www.openstreetmap.org/' || replace(p.osm_id, '-', '/')))
from verif.proche_fr p
where p.id = l.id and p.d <= 150 and l.modifie_par is null
  and not coalesce(l.sources::text, '') like '%openstreetmap.org/%';

-- 2. Les autres : mis de côté
insert into public.lieux_a_confirmer
select l.*, case when p.d is null or p.d > 2000 then 'Pas de piste dans OpenStreetMap à moins de 2 km'
                 else 'La piste OpenStreetMap la plus proche est à ' || round(p.d)::int || ' m (plus de 150 m)' end,
       p.osm_id, round(p.d)::int, now()
from public.lieux l join verif.proche_fr p on p.id = l.id
where (p.d is null or p.d > 150) and l.modifie_par is null
on conflict (id) do nothing;
delete from public.lieux l using public.lieux_a_confirmer c where c.id = l.id and l.modifie_par is null;

-- 3. Une mise à jour Data ES (importer_data_es() ou outils/lieux-france.py) ne doit pas les remettre
create or replace function public.pas_si_a_confirmer() returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.lieux_a_confirmer c where c.id = new.id) then return null; end if;
  return new;
end $$;
revoke execute on function public.pas_si_a_confirmer() from public, anon, authenticated;
drop trigger if exists lieux_pas_si_a_confirmer on public.lieux;
create trigger lieux_pas_si_a_confirmer before insert on public.lieux
  for each row execute function public.pas_si_a_confirmer();
