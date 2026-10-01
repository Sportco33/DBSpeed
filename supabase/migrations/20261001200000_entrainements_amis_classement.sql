-- DBSpeed : entraînements (calendrier, séances, tours), amis, record de piste, classement
--
-- Idée :
--   pistes         : une piste BMX, son tracé (dessin) et ses lignes (départ, inter, arrivée)
--   entrainements  : une séance d'un pilote, un jour, sur une piste (publiée ou non)
--   tours          : chaque tour de la séance, avec le temps à chaque ligne
--   amis           : les liens d'amitié entre comptes (demande puis acceptation)
--
-- Qui voit quoi :
--   - chacun voit TOUTES ses séances et tous ses tours ;
--   - ses AMIS voient son meilleur tour sur chaque piste (fonction meilleurs_tours_amis) ;
--   - quand une séance est PUBLIÉE, tout le monde voit ses temps : record de la piste et classement.
--   Les lectures chez les autres passent par des fonctions qui ne renvoient que le nécessaire.

-- =====================================================================
-- 1. Pistes
-- =====================================================================
create table public.pistes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  lieu text,
  -- dessin du tracé : chemin SVG dans un cadre de 320 x 210
  trace text not null,
  -- lignes de chronométrage dans l'ordre, avec leur place sur le tracé (0 = début, 1 = fin)
  -- ex. [{"nom":"Départ","pos":0},{"nom":"Inter 1","pos":0.27},…,{"nom":"Arrivée","pos":1}]
  lignes jsonb not null,
  exemple boolean not null default false,       -- piste qui sert aux données d'exemple
  cree_le timestamptz not null default now(),
  constraint piste_nom_court check (char_length(nom) between 1 and 80),
  constraint piste_lieu_court check (lieu is null or char_length(lieu) <= 80),
  constraint piste_trace_court check (char_length(trace) <= 4000),
  constraint piste_lignes_liste check (jsonb_typeof(lignes) = 'array' and jsonb_array_length(lignes) between 2 and 12)
);
comment on table public.pistes is 'Pistes BMX : nom, lieu, tracé (chemin SVG 320x210) et lignes de chronométrage.';

alter table public.pistes enable row level security;
create policy "Tout compte connecté voit les pistes"
  on public.pistes for select to authenticated using (true);
revoke all on public.pistes from anon, authenticated;
grant select on public.pistes to authenticated;

-- Deux pistes d'exemple (pour essayer l'appli avant d'avoir de vrais temps)
insert into public.pistes (nom, lieu, trace, lignes, exemple) values
(
  'Piste exemple A', 'Données d''exemple',
  'M28 28 H262 A25 25 0 0 1 262 78 H58 A25 25 0 0 0 58 128 H262 A25 25 0 0 1 262 178 H36',
  '[{"nom":"Départ","pos":0},{"nom":"Inter 1","pos":0.26},{"nom":"Inter 2","pos":0.52},{"nom":"Inter 3","pos":0.77},{"nom":"Arrivée","pos":1}]',
  true
),
(
  'Piste exemple B', 'Données d''exemple',
  'M36 34 H230 C300 34 300 112 230 112 H110 C40 112 40 182 110 182 H290',
  '[{"nom":"Départ","pos":0},{"nom":"Inter 1","pos":0.36},{"nom":"Inter 2","pos":0.7},{"nom":"Arrivée","pos":1}]',
  true
);

-- =====================================================================
-- 2. Séances d'entraînement
-- =====================================================================
create table public.entrainements (
  id uuid primary key default gen_random_uuid(),
  pilote uuid not null references public.profils (id) on delete cascade,
  piste uuid not null references public.pistes (id) on delete restrict,
  jour date not null,
  publie boolean not null default false,        -- vrai = tout le monde voit les temps (classement)
  exemple boolean not null default false,       -- données d'exemple (ne peuvent pas être publiées)
  cree_le timestamptz not null default now(),
  constraint exemple_jamais_publie check (not (exemple and publie))
);
comment on table public.entrainements is 'Séance d''entraînement d''un pilote : un jour, une piste. publie = visible par tous et compte au classement.';
create index entrainements_pilote_jour on public.entrainements (pilote, jour);
create index entrainements_piste_publie on public.entrainements (piste) where publie;

alter table public.entrainements enable row level security;
create policy "Chacun voit ses séances"
  on public.entrainements for select to authenticated
  using ((select auth.uid()) = pilote);
create policy "Chacun publie ou retire ses séances"
  on public.entrainements for update to authenticated
  using ((select auth.uid()) = pilote)
  with check ((select auth.uid()) = pilote);
create policy "Chacun supprime ses séances"
  on public.entrainements for delete to authenticated
  using ((select auth.uid()) = pilote);
revoke all on public.entrainements from anon, authenticated;
grant select, delete on public.entrainements to authenticated;
grant update (publie) on public.entrainements to authenticated;

-- =====================================================================
-- 3. Tours
-- =====================================================================
create table public.tours (
  id uuid primary key default gen_random_uuid(),
  entrainement uuid not null references public.entrainements (id) on delete cascade,
  numero int not null,
  -- temps (en secondes depuis le départ) à chaque ligne après le départ :
  -- [Inter 1, Inter 2, …, Arrivée]. Case vide (null) = pas passé (chute, abandon).
  temps numeric(7, 3)[] not null,
  -- temps à l'arrivée (vide si le tour n'est pas fini), calculé tout seul
  temps_final numeric(7, 3) generated always as (temps[array_upper(temps, 1)]) stored,
  constraint tour_numero_positif check (numero between 1 and 999),
  constraint tour_temps_taille check (array_length(temps, 1) between 1 and 11),
  unique (entrainement, numero)
);
comment on table public.tours is 'Tours d''une séance : temps à chaque ligne après le départ (dernier = arrivée).';
create index tours_final on public.tours (entrainement, temps_final);

alter table public.tours enable row level security;
create policy "Chacun voit ses tours"
  on public.tours for select to authenticated
  using (exists (
    select 1 from public.entrainements e
    where e.id = entrainement and e.pilote = (select auth.uid())
  ));
revoke all on public.tours from anon, authenticated;
grant select on public.tours to authenticated;

-- =====================================================================
-- 4. Amis
-- =====================================================================
create table public.amis (
  id uuid primary key default gen_random_uuid(),
  demandeur uuid not null references public.profils (id) on delete cascade,
  receveur uuid not null references public.profils (id) on delete cascade,
  accepte boolean not null default false,
  cree_le timestamptz not null default now(),
  constraint pas_ami_avec_soi check (demandeur <> receveur)
);
comment on table public.amis is 'Amis : une demande (accepte = faux) puis l''acceptation (accepte = vrai).';
-- une seule ligne par paire, dans un sens ou dans l'autre
create unique index amis_une_paire on public.amis (least(demandeur, receveur), greatest(demandeur, receveur));
create index amis_receveur on public.amis (receveur);

alter table public.amis enable row level security;
create policy "Chacun voit ses liens d'amitié"
  on public.amis for select to authenticated
  using ((select auth.uid()) in (demandeur, receveur));
revoke all on public.amis from anon, authenticated;
grant select on public.amis to authenticated;

-- Vrai si les deux comptes sont amis (demande acceptée)
create or replace function public.sont_amis(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.amis
    where accepte
      and least(demandeur, receveur) = least(a, b)
      and greatest(demandeur, receveur) = greatest(a, b)
  );
$$;
revoke execute on function public.sont_amis(uuid, uuid) from public, anon, authenticated;

-- Chercher un pilote par numéro de plaque ou par nom (pour l'ajouter en ami)
create or replace function public.chercher_pilotes(p_texte text)
returns table (id uuid, nom text, plaque text, club text, lien text)
language sql
stable
security definer
set search_path = ''
as $$
  with moi as (select (select auth.uid()) as id),
  t as (select nullif(trim(p_texte), '') as v)
  select p.id, p.nom, p.plaque, p.club,
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
     and p.id <> (select id from moi)
     and (select v from t) is not null
     and char_length((select v from t)) >= 1
     and (p.plaque = (select v from t)
          or (char_length((select v from t)) >= 2 and p.nom ilike '%' || replace(replace((select v from t), '%', ''), '_', '') || '%'))
   order by (p.plaque = (select v from t)) desc, p.nom
   limit 10;
$$;
revoke execute on function public.chercher_pilotes(text) from public, anon;
grant execute on function public.chercher_pilotes(text) to authenticated;

-- Demander un pilote en ami (ou accepter s'il nous avait déjà demandé)
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

-- Répondre à une demande reçue (accepter ou refuser)
create or replace function public.repondre_ami(p_lien uuid, p_accepter boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_accepter then
    update public.amis set accepte = true
     where id = p_lien and receveur = (select auth.uid()) and not accepte;
  else
    delete from public.amis
     where id = p_lien and receveur = (select auth.uid()) and not accepte;
  end if;
  if not found then raise exception 'Demande introuvable.'; end if;
end;
$$;
revoke execute on function public.repondre_ami(uuid, boolean) from public, anon;
grant execute on function public.repondre_ami(uuid, boolean) to authenticated;

-- Retirer un ami (ou annuler une demande envoyée)
create or replace function public.retirer_ami(p_lien uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.amis
   where id = p_lien and (select auth.uid()) in (demandeur, receveur);
  if not found then raise exception 'Ami introuvable.'; end if;
end;
$$;
revoke execute on function public.retirer_ami(uuid) from public, anon;
grant execute on function public.retirer_ami(uuid) to authenticated;

-- Mes amis + demandes reçues + demandes envoyées
create or replace function public.mes_amis()
returns table (lien uuid, id uuid, nom text, plaque text, club text, statut text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, p.id, p.nom, p.plaque, p.club,
         case when a.accepte then 'ami'
              when a.receveur = (select auth.uid()) then 'recu'
              else 'envoye' end
    from public.amis a
    join public.profils p
      on p.id = case when a.demandeur = (select auth.uid()) then a.receveur else a.demandeur end
   where (select auth.uid()) in (a.demandeur, a.receveur)
   order by (not a.accepte and a.receveur = (select auth.uid())) desc, a.accepte desc, p.nom;
$$;
revoke execute on function public.mes_amis() from public, anon;
grant execute on function public.mes_amis() to authenticated;

-- =====================================================================
-- 5. Comparer : meilleur tour des amis, record de la piste, classement
-- =====================================================================

-- Meilleur tour de chacun de mes amis sur une piste (publié ou non : les amis voient tout)
create or replace function public.meilleurs_tours_amis(p_piste uuid)
returns table (pilote uuid, nom text, plaque text, jour date, temps numeric[], temps_final numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (e.pilote)
         e.pilote, p.nom, p.plaque, e.jour, t.temps, t.temps_final
    from public.tours t
    join public.entrainements e on e.id = t.entrainement
    join public.profils p on p.id = e.pilote
   where e.piste = p_piste
     and not e.exemple
     and t.temps_final is not null
     and e.pilote <> (select auth.uid())
     and public.sont_amis(e.pilote, (select auth.uid()))
   order by e.pilote, t.temps_final, e.jour;
$$;
revoke execute on function public.meilleurs_tours_amis(uuid) from public, anon;
grant execute on function public.meilleurs_tours_amis(uuid) to authenticated;

-- Record de la piste : le meilleur tour publié (avec tous ses intermédiaires)
create or replace function public.record_piste(p_piste uuid)
returns table (pilote uuid, nom text, plaque text, jour date, temps numeric[], temps_final numeric, est_moi boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select e.pilote, p.nom, p.plaque, e.jour, t.temps, t.temps_final, e.pilote = (select auth.uid())
    from public.tours t
    join public.entrainements e on e.id = t.entrainement
    join public.profils p on p.id = e.pilote
   where e.piste = p_piste
     and e.publie
     and t.temps_final is not null
   order by t.temps_final, e.jour
   limit 1;
$$;
revoke execute on function public.record_piste(uuid) from public, anon;
grant execute on function public.record_piste(uuid) to authenticated;

-- Meilleur temps publié de chaque ligne de la piste (ligne par ligne, tous pilotes confondus)
create or replace function public.meilleurs_intermediaires_piste(p_piste uuid)
returns numeric[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_agg(m order by i)
    from (
      select i, min(t.temps[i]) as m
        from public.tours t
        join public.entrainements e on e.id = t.entrainement
        cross join lateral generate_subscripts(t.temps, 1) as i
       where e.piste = p_piste and e.publie
       group by i
    ) x;
$$;
revoke execute on function public.meilleurs_intermediaires_piste(uuid) from public, anon;
grant execute on function public.meilleurs_intermediaires_piste(uuid) to authenticated;

-- Classement d'une piste : le meilleur tour publié de chaque pilote
create or replace function public.classement_piste(p_piste uuid)
returns table (rang bigint, pilote uuid, nom text, plaque text, club text, categorie text,
               jour date, temps numeric[], temps_final numeric, est_moi boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with meilleurs as (
    select distinct on (e.pilote)
           e.pilote, e.jour, t.temps, t.temps_final
      from public.tours t
      join public.entrainements e on e.id = t.entrainement
     where e.piste = p_piste and e.publie and t.temps_final is not null
     order by e.pilote, t.temps_final, e.jour
  )
  select rank() over (order by m.temps_final), m.pilote, p.nom, p.plaque, p.club, p.categorie,
         m.jour, m.temps, m.temps_final, m.pilote = (select auth.uid())
    from meilleurs m
    join public.profils p on p.id = m.pilote
   order by m.temps_final, p.nom
   limit 100;
$$;
revoke execute on function public.classement_piste(uuid) from public, anon;
grant execute on function public.classement_piste(uuid) to authenticated;

-- =====================================================================
-- 6. Données d'exemple (pour essayer avant d'avoir de vrais temps)
-- =====================================================================
-- Crée environ 2 mois de séances sur les pistes d'exemple pour le pilote connecté.
-- Elles sont marquées « exemple » : jamais publiées, jamais vues par les autres.
create or replace function public.creer_exemples_entrainement()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  moi uuid := (select auth.uid());
  piste_a public.pistes;
  piste_b public.pistes;
  s int;
  n int;
  k int;
  nb_seances int := 0;
  seance uuid;
  forme numeric;        -- le pilote progresse : plus la séance est récente, plus il est rapide
  base numeric[];
  t numeric[];
  cumul numeric;
  chute int;
  jours int[] := array[2, 5, 9, 12, 16, 20, 23, 27, 33, 37, 41, 48, 55];
  p public.pistes;
begin
  if moi is null then raise exception 'Il faut être connecté.'; end if;
  if not exists (select 1 from public.profils where id = moi and type_compte = 'pilote') then
    raise exception 'Les exemples d''entraînement sont pour les comptes pilote.';
  end if;

  select * into piste_a from public.pistes where exemple and nom = 'Piste exemple A';
  select * into piste_b from public.pistes where exemple and nom = 'Piste exemple B';

  -- on repart de zéro
  delete from public.entrainements where pilote = moi and exemple;

  for s in 1 .. array_length(jours, 1) loop
    -- une séance sur 3 sur la piste B
    if s % 3 = 0 then
      p := piste_b;
      base := array[9.1, 19.6, 30.4];               -- temps à Inter 1, Inter 2, Arrivée
    else
      p := piste_a;
      base := array[6.25, 17.45, 27.25, 36.30];
    end if;
    forme := 1 + jours[s] * 0.0009;                 -- plus vieux = un peu plus lent

    insert into public.entrainements (pilote, piste, jour, exemple)
    values (moi, p.id, current_date - jours[s], true)
    returning id into seance;
    nb_seances := nb_seances + 1;

    chute := case when s % 4 = 1 then 2 + floor(random() * 3)::int else 0 end;
    for n in 1 .. 4 + floor(random() * 6)::int loop
      t := '{}';
      cumul := 0;
      for k in 1 .. array_length(base, 1) loop
        -- temps de chaque secteur, avec un peu de hasard ; le 1er tour est un peu plus lent
        cumul := cumul + (base[k] - coalesce(base[k - 1], 0)) * forme
                 * (1 + (random() - 0.45) * 0.035 + case when n = 1 then 0.012 else 0 end);
        t := t || round(cumul, 3);
      end loop;
      if n = chute then
        -- chute : plus de temps après le 2e secteur
        t := t[1:2] || array_fill(null::numeric, array[array_length(base, 1) - 2]);
      end if;
      insert into public.tours (entrainement, numero, temps) values (seance, n, t);
    end loop;
  end loop;

  return nb_seances;
end;
$$;
revoke execute on function public.creer_exemples_entrainement() from public, anon;
grant execute on function public.creer_exemples_entrainement() to authenticated;

-- Effacer ses données d'exemple
create or replace function public.effacer_exemples_entrainement()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.entrainements where pilote = (select auth.uid()) and exemple;
$$;
revoke execute on function public.effacer_exemples_entrainement() from public, anon;
grant execute on function public.effacer_exemples_entrainement() to authenticated;
