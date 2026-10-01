-- DBSpeed : corrections de sécurité après le diagnostic du 01/10/2026 (après-midi)
-- Appliqué sur le projet Supabase « DBSpeed » le 01/10/2026 (ne pas relancer).
--
-- 1. Chercher un pilote : plus moyen de sortir la liste de tout le monde, le club seulement pour les amis
-- 2. Demandes d'ami : 30 en attente au maximum
-- 3. Importer une course : chaque valeur vérifiée (messages en français), nom de manche, 30 imports par jour
-- 4. Supprimer son compte (RGPD) ; les courses d'un organisateur restent visibles s'il part
-- 5. Les nouvelles tables et fonctions ne sont plus ouvertes à tout le monde par défaut

-- 1. Chercher un pilote ---------------------------------------------------------------
-- Avant : « %% » devenait une recherche vide qui trouvait tout le monde.
-- Maintenant : on nettoie d'abord ; plaque exacte, ou au moins 3 lettres du nom.
create or replace function public.chercher_pilotes(p_texte text)
returns table (id uuid, nom text, plaque text, club text, lien text)
language sql
stable
security definer
set search_path = ''
as $$
  with moi as (select (select auth.uid()) as id),
  t as (select nullif(trim(replace(replace(left(coalesce(p_texte, ''), 40), '%', ''), '_', '')), '') as v)
  select p.id, p.nom, p.plaque,
         case when a.accepte then p.club end as club,       -- le club : seulement pour ses amis
         case
           when a.id is null then 'aucun'
           when a.accepte then 'ami'
           when a.demandeur = (select id from moi) then 'envoye'
           else 'recu'
         end as lien
    from public.profils p
    left join public.amis a
      on least(a.demandeur, a.receveur) = least(p.id, (select id from moi))
     and greatest(a.demandeur, a.receveur) = greatest(p.id, (select id from moi))
   where p.type_compte = 'pilote'
     and (select id from moi) is not null
     and p.id <> (select id from moi)
     and (select v from t) is not null
     and (p.plaque = (select v from t)
          or (char_length((select v from t)) >= 3 and p.nom ilike '%' || (select v from t) || '%'))
   order by (p.plaque = (select v from t)) desc, p.nom
   limit 10;
$$;
revoke execute on function public.chercher_pilotes(text) from public, anon;
grant execute on function public.chercher_pilotes(text) to authenticated;

-- 2. Demandes d'ami : pas plus de 30 en attente ------------------------------------------
create or replace function public.demander_ami(p_pilote uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  moi uuid := (select auth.uid());
  lien public.amis;
begin
  if moi is null then raise exception 'Il faut être connecté.'; end if;
  if p_pilote = moi then raise exception 'Tu ne peux pas t''ajouter toi-même.'; end if;
  if not exists (select 1 from public.profils where id = p_pilote and type_compte = 'pilote') then
    raise exception 'Pilote introuvable.';
  end if;

  select * into lien from public.amis
   where least(demandeur, receveur) = least(moi, p_pilote)
     and greatest(demandeur, receveur) = greatest(moi, p_pilote);

  if lien.id is null then
    if (select count(*) from public.amis where demandeur = moi and not accepte) >= 30 then
      raise exception 'Tu as déjà 30 demandes en attente. Attends qu''on te réponde avant d''en envoyer d''autres.';
    end if;
    insert into public.amis (demandeur, receveur) values (moi, p_pilote);
    return 'envoye';
  elsif lien.accepte then
    return 'ami';
  elsif lien.receveur = moi then
    update public.amis set accepte = true where id = lien.id;
    return 'ami';
  else
    return 'envoye';
  end if;
end;
$$;
revoke execute on function public.demander_ami(uuid) from public, anon;
grant execute on function public.demander_ami(uuid) to authenticated;

-- 3. Importer une course ---------------------------------------------------------------
-- Nom d'une manche tel qu'il est écrit dans le fichier (ex. « 1/4 finale A »), facultatif
alter table public.manches add column if not exists nom text;
alter table public.manches drop constraint if exists manche_nom_pas_trop_long;
alter table public.manches add constraint manche_nom_pas_trop_long check (nom is null or char_length(nom) <= 40);

-- Si l'organisateur supprime son compte, ses courses restent (sans organisateur)
alter table public.courses alter column organisateur drop not null;
alter table public.courses drop constraint courses_organisateur_fkey;
alter table public.courses add constraint courses_organisateur_fkey
  foreign key (organisateur) references public.profils (id) on delete set null;

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
  t jsonb;
  v numeric;
  v_temps numeric(8, 3)[];
  v_avant numeric;
  v_numero integer;
  v_plaque text;
  v_couloir integer;
  v_ou text;
  n_lignes integer;
  moi uuid := (select auth.uid());
begin
  if not public.est_organisateur_valide() then
    raise exception 'Seuls les organisateurs validés peuvent importer des temps.';
  end if;
  if (select count(*) from public.courses where organisateur = moi and cree_le > now() - interval '1 day') >= 30 then
    raise exception 'Tu as déjà importé 30 courses aujourd''hui. Réessaie demain.';
  end if;
  if p_nom is null or char_length(trim(p_nom)) not between 2 and 120 then
    raise exception 'Le nom de la course doit faire entre 2 et 120 caractères.';
  end if;
  if p_jour is null or p_jour < date '2000-01-01' or p_jour > current_date + 366 then
    raise exception 'La date de la course n''est pas valable.';
  end if;
  if p_lieu is not null and char_length(trim(p_lieu)) > 120 then
    raise exception 'Le lieu est trop long (120 caractères au maximum).';
  end if;
  if p_lignes is null or array_ndims(p_lignes) is distinct from 1 or cardinality(p_lignes) not between 1 and 12 then
    raise exception 'Il faut entre 1 et 12 lignes de chronométrage.';
  end if;
  n_lignes := cardinality(p_lignes);
  if exists (select 1 from unnest(p_lignes) l where l is null or char_length(trim(l)) not between 1 and 30) then
    raise exception 'Le nom d''une ligne est vide ou trop long.';
  end if;
  if jsonb_typeof(p_manches) is distinct from 'array' or jsonb_array_length(p_manches) not between 1 and 500 then
    raise exception 'Il faut entre 1 et 500 manches.';
  end if;

  insert into public.courses (nom, jour, lieu, lignes, fichier)
  values (trim(p_nom), p_jour, nullif(trim(p_lieu), ''), (select array_agg(trim(l)) from unnest(p_lignes) l),
          left(nullif(trim(p_fichier), ''), 200))
  returning id into v_course;

  for m in select * from jsonb_array_elements(p_manches) loop
    if jsonb_typeof(m) is distinct from 'object' or coalesce(m ->> 'numero', '') !~ '^[0-9]{1,4}$'
       or (m ->> 'numero')::integer < 1 then
      raise exception 'Un numéro de manche n''est pas valable (il doit aller de 1 à 9999).';
    end if;
    v_numero := (m ->> 'numero')::integer;
    v_ou := 'Manche ' || v_numero;
    if jsonb_typeof(m -> 'categorie') not in ('string', 'null') or char_length(trim(m ->> 'categorie')) > 40 then
      raise exception '% : la catégorie est trop longue (40 caractères au maximum).', v_ou;
    end if;
    if jsonb_typeof(m -> 'nom') not in ('string', 'null') or char_length(trim(m ->> 'nom')) > 40 then
      raise exception '% : le nom de la manche est trop long (40 caractères au maximum).', v_ou;
    end if;
    if jsonb_typeof(m -> 'pilotes') is distinct from 'array' or jsonb_array_length(m -> 'pilotes') not between 1 and 8 then
      raise exception '% : il faut entre 1 et 8 pilotes.', v_ou;
    end if;
    insert into public.manches (course_id, numero, categorie, nom)
    values (v_course, v_numero, nullif(trim(m ->> 'categorie'), ''), nullif(trim(m ->> 'nom'), ''))
    returning id into v_manche;

    for p in select * from jsonb_array_elements(m -> 'pilotes') loop
      v_plaque := trim(p ->> 'plaque');
      if jsonb_typeof(p -> 'plaque') is distinct from 'string' or v_plaque is null or char_length(v_plaque) not between 1 and 10 then
        raise exception '% : une plaque est vide ou trop longue (10 caractères au maximum).', v_ou;
      end if;
      if jsonb_typeof(p -> 'pilote') not in ('string', 'null') or char_length(trim(p ->> 'pilote')) > 80 then
        raise exception '%, plaque % : le nom du pilote est trop long.', v_ou, v_plaque;
      end if;
      v_couloir := null;
      if jsonb_typeof(p -> 'couloir') = 'number' and (p ->> 'couloir') ~ '^[1-8]$' then
        v_couloir := (p ->> 'couloir')::integer;
      elsif jsonb_typeof(p -> 'couloir') not in ('null') and p ? 'couloir' then
        raise exception '%, plaque % : le couloir doit aller de 1 à 8.', v_ou, v_plaque;
      end if;
      if jsonb_typeof(p -> 'temps') is distinct from 'array' or jsonb_array_length(p -> 'temps') <> n_lignes then
        raise exception '%, plaque % : il faut un temps (ou une case vide) pour chaque ligne.', v_ou, v_plaque;
      end if;
      v_temps := array[]::numeric(8, 3)[];
      v_avant := 0;
      for t in select * from jsonb_array_elements(p -> 'temps') loop
        if jsonb_typeof(t) = 'null' then
          v_temps := v_temps || null::numeric(8, 3);
        elsif jsonb_typeof(t) = 'number' then
          v := round((t #>> '{}')::numeric, 3);       -- on arrondit d'abord, puis on vérifie
          if v <= 0 or v >= 600 then
            raise exception '%, plaque % : temps impossible (%). Il doit être entre 0 et 600 secondes.', v_ou, v_plaque, v;
          end if;
          if v <= v_avant then
            raise exception '%, plaque % : un temps est plus petit que celui de la ligne d''avant.', v_ou, v_plaque;
          end if;
          v_avant := v;
          v_temps := v_temps || v::numeric(8, 3);
        else
          raise exception '%, plaque % : un temps n''est pas un nombre.', v_ou, v_plaque;
        end if;
      end loop;
      insert into public.resultats (manche_id, plaque, pilote, couloir, temps)
      values (v_manche, v_plaque, nullif(trim(p ->> 'pilote'), ''), v_couloir, v_temps);
    end loop;
  end loop;

  return v_course;
exception
  when unique_violation then
    raise exception 'Une plaque ou une manche est en double dans le fichier.';
  when raise_exception then
    raise;                                            -- nos messages en français passent tels quels
  when others then
    raise exception 'Le fichier contient une valeur illisible. Vérifie-le et réessaie.';
end;
$$;
revoke execute on function public.importer_course(text, date, text, text[], text, jsonb) from public, anon;
grant execute on function public.importer_course(text, date, text, text[], text, jsonb) to authenticated;

-- 4. Supprimer son compte -------------------------------------------------------------------
-- Efface le compte et tout ce qui est à soi (profil, séances, tours, amis).
-- Les courses importées par un organisateur restent visibles, sans son nom.
create or replace function public.supprimer_mon_compte()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  moi uuid := (select auth.uid());
begin
  if moi is null then raise exception 'Il faut être connecté.'; end if;
  delete from auth.users where id = moi;
end;
$$;
revoke execute on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;

-- 5. Par défaut, rien n'est ouvert : chaque nouvelle table ou fonction donne ses droits elle-même
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- Index de la clé « demandeur » des amis (avant, il était dans un fichier trop tôt)
create index if not exists amis_demandeur on public.amis (demandeur);
