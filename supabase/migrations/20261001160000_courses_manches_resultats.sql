-- DBSpeed : la fonction principale — les temps des manches importés par les organisateurs
-- Appliqué sur le projet Supabase « DBSpeed » le 01/10/2026 (ne pas relancer).
--
-- Une « course » = un fichier importé (une journée de course : nom, jour, lieu, noms des lignes).
-- Une course a des « manches » (1 à 8 pilotes chacune), et chaque manche a les « resultats »
-- de ses pilotes : les temps à chaque ligne après le départ (comme les tours d'entraînement).
-- On ne garde que les temps : les places, écarts et temps par secteur sont recalculés par l'appli
-- (une seule vérité, impossible d'avoir une place qui ne colle pas avec les temps).

-- 1. Les courses (un fichier importé)
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  organisateur uuid not null default auth.uid() references public.profils (id) on delete cascade,
  nom text not null,
  jour date not null,
  lieu text,
  lignes text[] not null,                      -- noms des lignes après le départ : {Inter 1, Inter 2, Inter 3, Arrivée}
  fichier text,                                -- nom du fichier importé (pour s'y retrouver)
  cree_le timestamptz not null default now(),
  constraint course_nom_valide check (char_length(nom) between 2 and 120),
  constraint course_lieu_pas_trop_long check (lieu is null or char_length(lieu) <= 120),
  constraint course_lignes_valides check (cardinality(lignes) between 1 and 12),
  constraint course_fichier_pas_trop_long check (fichier is null or char_length(fichier) <= 200)
);
comment on table public.courses is 'Une journée de course importée par un organisateur validé (un fichier de temps).';
create index courses_par_jour on public.courses (jour desc, cree_le desc);
create index courses_par_organisateur on public.courses (organisateur);

-- 2. Les manches d'une course
create table public.manches (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  numero integer not null,
  categorie text,
  constraint manche_numero_valide check (numero between 1 and 9999),
  constraint manche_categorie_pas_trop_longue check (categorie is null or char_length(categorie) <= 40),
  constraint manche_unique unique nulls not distinct (course_id, categorie, numero)  -- « Manche 1 » peut exister dans chaque catégorie
);
comment on table public.manches is 'Une manche (1 à 8 pilotes) d''une course importée.';

-- 3. Les temps de chaque pilote dans une manche
create table public.resultats (
  id uuid primary key default gen_random_uuid(),
  manche_id uuid not null references public.manches (id) on delete cascade,
  plaque text not null,
  pilote text,
  couloir integer,
  temps numeric(8, 3)[] not null,              -- secondes depuis la grille, à chaque ligne ; null = pas passé
  constraint resultat_plaque_valide check (char_length(plaque) between 1 and 10),
  constraint resultat_pilote_pas_trop_long check (pilote is null or char_length(pilote) <= 80),
  constraint resultat_couloir_valide check (couloir is null or couloir between 1 and 8),
  constraint resultat_temps_valides check (cardinality(temps) between 1 and 12),
  constraint resultat_plaque_unique unique (manche_id, plaque)
);
comment on table public.resultats is 'Temps de passage d''un pilote à chaque ligne d''une manche.';
create index resultats_par_plaque on public.resultats (plaque);

-- 4. Sécurité : tout le monde (connecté) lit ; personne n'écrit directement.
--    On importe avec la fonction importer_course (tout ou rien) ;
--    l'organisateur peut supprimer ses propres courses (les manches et les temps partent avec).
alter table public.courses enable row level security;
alter table public.manches enable row level security;
alter table public.resultats enable row level security;

create policy "Tout le monde lit les courses" on public.courses for select to authenticated using (true);
create policy "Tout le monde lit les manches" on public.manches for select to authenticated using (true);
create policy "Tout le monde lit les résultats" on public.resultats for select to authenticated using (true);
create policy "L'organisateur supprime ses courses" on public.courses for delete to authenticated
  using (organisateur = (select auth.uid()));

revoke all on public.courses, public.manches, public.resultats from anon, authenticated;
grant select on public.courses, public.manches, public.resultats to authenticated;
grant delete on public.courses to authenticated;

-- 5. Importer une course entière, en une fois (si une ligne est fausse, rien n'est enregistré)
--    p_manches = [{ "numero": 1, "categorie": null,
--                   "pilotes": [{ "plaque": "21", "pilote": "Enzo Robert", "couloir": 4,
--                                 "temps": [6.187, 17.355, 27.092, 36.118] }, …] }, …]
create or replace function public.importer_course(
  p_nom text, p_jour date, p_lieu text, p_lignes text[], p_fichier text, p_manches jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course uuid;
  v_manche uuid;
  m jsonb;
  p jsonb;
  v_temps numeric(8, 3)[];
  t jsonb;
  n_lignes integer := coalesce(cardinality(p_lignes), 0);
begin
  if not public.est_organisateur_valide() then
    raise exception 'Seuls les organisateurs validés peuvent importer des temps.';
  end if;
  if n_lignes < 1 or n_lignes > 12 then
    raise exception 'Il faut entre 1 et 12 lignes de chronométrage.';
  end if;
  if exists (select 1 from unnest(p_lignes) l where l is null or char_length(trim(l)) not between 1 and 30) then
    raise exception 'Le nom d''une ligne est vide ou trop long.';
  end if;
  if jsonb_typeof(p_manches) is distinct from 'array' or jsonb_array_length(p_manches) not between 1 and 500 then
    raise exception 'Il faut entre 1 et 500 manches.';
  end if;

  insert into public.courses (nom, jour, lieu, lignes, fichier)
  values (trim(p_nom), p_jour, nullif(trim(p_lieu), ''), p_lignes, nullif(trim(p_fichier), ''))
  returning id into v_course;

  for m in select * from jsonb_array_elements(p_manches) loop
    if jsonb_typeof(m -> 'pilotes') is distinct from 'array' or jsonb_array_length(m -> 'pilotes') not between 1 and 8 then
      raise exception 'La manche % doit avoir entre 1 et 8 pilotes.', m ->> 'numero';
    end if;
    insert into public.manches (course_id, numero, categorie)
    values (v_course, (m ->> 'numero')::integer, nullif(trim(m ->> 'categorie'), ''))
    returning id into v_manche;

    for p in select * from jsonb_array_elements(m -> 'pilotes') loop
      if jsonb_typeof(p -> 'temps') is distinct from 'array' or jsonb_array_length(p -> 'temps') <> n_lignes then
        raise exception 'Manche % : il faut un temps (ou une case vide) pour chaque ligne.', m ->> 'numero';
      end if;
      v_temps := array[]::numeric(8, 3)[];
      for t in select * from jsonb_array_elements(p -> 'temps') loop
        if jsonb_typeof(t) = 'number' then
          if (t #>> '{}')::numeric <= 0 or (t #>> '{}')::numeric >= 600 then
            raise exception 'Manche %, plaque % : temps impossible (%).', m ->> 'numero', p ->> 'plaque', t #>> '{}';
          end if;
          v_temps := v_temps || (t #>> '{}')::numeric(8, 3);
        elsif jsonb_typeof(t) = 'null' then
          v_temps := v_temps || null::numeric(8, 3);
        else
          raise exception 'Manche %, plaque % : un temps n''est pas un nombre.', m ->> 'numero', p ->> 'plaque';
        end if;
      end loop;
      insert into public.resultats (manche_id, plaque, pilote, couloir, temps)
      values (v_manche, trim(p ->> 'plaque'), nullif(trim(p ->> 'pilote'), ''), (p ->> 'couloir')::integer, v_temps);
    end loop;
  end loop;

  return v_course;
exception
  when unique_violation then
    raise exception 'Une plaque ou un numéro de manche est en double dans le fichier.';
  when check_violation then
    raise exception 'Une valeur du fichier n''est pas valide (plaque, couloir ou nom trop long ?).';
end;
$$;

revoke execute on function public.importer_course(text, date, text, text[], text, jsonb) from public, anon;
grant execute on function public.importer_course(text, date, text, text[], text, jsonb) to authenticated;

-- (L'index amis_demandeur a été déplacé dans 20261001210000_securite_et_compte.sql :
--  la table amis n'existe qu'après 20261001200000.)
