-- DBSpeed : comptes et profils
-- Chaque compte a un type : pilote, organisateur ou spectateur.
-- Déjà appliqué sur le projet Supabase « DBSpeed » le 01/10/2026 (ne pas relancer).

-- 1. Les 3 types de compte
create type public.type_compte as enum ('pilote', 'organisateur', 'spectateur');

-- 2. Le profil de chaque compte (une ligne par compte)
create table public.profils (
  id uuid primary key references auth.users (id) on delete cascade,
  type_compte public.type_compte,              -- vide tant que le compte Google n'a pas choisi
  nom text,
  plaque text,                                 -- numéro de plaque, seulement pour les pilotes
  organisateur_valide boolean not null default false,
  cree_le timestamptz not null default now(),
  constraint nom_pas_trop_long check (nom is null or char_length(nom) <= 80),
  constraint plaque_pas_trop_longue check (plaque is null or char_length(plaque) <= 10)
);

comment on table public.profils is 'Profil de chaque compte DBSpeed : type (pilote, organisateur, spectateur), nom, plaque.';
comment on column public.profils.organisateur_valide is 'Un compte organisateur doit être validé à la main avant de pouvoir importer des temps.';

-- 3. Sécurité : chacun ne voit et ne modifie que son propre profil
alter table public.profils enable row level security;

create policy "Chacun lit son profil"
  on public.profils for select to authenticated
  using ((select auth.uid()) = id);

create policy "Chacun modifie son profil"
  on public.profils for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- On peut modifier seulement son nom et sa plaque (jamais son type ni la validation organisateur)
revoke all on public.profils from anon, authenticated;
grant select on public.profils to authenticated;
grant update (nom, plaque) on public.profils to authenticated;

-- 4. Création automatique du profil quand un compte est créé
--    (le type, le nom et la plaque viennent du formulaire d'inscription ;
--     pour un compte Google, le type reste vide et sera choisi juste après)
create or replace function public.creer_profil_nouveau_compte()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text := new.raw_user_meta_data ->> 'type_compte';
begin
  insert into public.profils (id, type_compte, nom, plaque)
  values (
    new.id,
    case when t in ('pilote', 'organisateur', 'spectateur') then t::public.type_compte end,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'nom'), ''),
                  nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
                  nullif(trim(new.raw_user_meta_data ->> 'name'), '')), 80),
    case when t = 'pilote' then left(nullif(trim(new.raw_user_meta_data ->> 'plaque'), ''), 10) end
  );
  return new;
end;
$$;

revoke execute on function public.creer_profil_nouveau_compte() from public, anon, authenticated;

create trigger apres_creation_compte
  after insert on auth.users
  for each row execute function public.creer_profil_nouveau_compte();

-- 5. Choisir son type de compte (une seule fois), pour les comptes créés avec Google
create or replace function public.choisir_type_compte(p_type public.type_compte, p_nom text, p_plaque text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_type = 'pilote' and nullif(trim(p_plaque), '') is null then
    raise exception 'Il faut un numéro de plaque pour un compte pilote.';
  end if;

  update public.profils
     set type_compte = p_type,
         nom = coalesce(left(nullif(trim(p_nom), ''), 80), nom),
         plaque = case when p_type = 'pilote' then left(trim(p_plaque), 10) end
   where id = (select auth.uid())
     and type_compte is null;

  if not found then
    raise exception 'Le type de compte est déjà choisi.';
  end if;
end;
$$;

revoke execute on function public.choisir_type_compte(public.type_compte, text, text) from public, anon;
grant execute on function public.choisir_type_compte(public.type_compte, text, text) to authenticated;
