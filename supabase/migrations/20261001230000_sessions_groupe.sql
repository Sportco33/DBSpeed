-- DBSpeed : sessions d'entraînement en groupe
--
-- Idée : une session = un groupe de pilotes, une piste, un jour.
-- Tous les tours des membres sur cette piste ce jour-là font partie de la session :
-- chacun voit les chronos de tout le groupe (qui est devant sur chaque secteur, historique…).
--
--   sessions_groupe  : la session (créateur, piste, jour, nom, code du lien d'invitation, terminée ?)
--   session_membres  : qui est dedans (invite = vrai tant que l'invitation n'est pas acceptée), couleur du pilote
--   tours.heure      : heure de passage d'un tour (pour ranger les tours de tout le groupe dans l'ordre)
--
-- On ne lit et n'écrit jamais ces tables directement : tout passe par les fonctions ci-dessous,
-- qui vérifient à chaque fois que la personne est bien dans la session.

alter table public.tours add column if not exists heure timestamptz;
comment on column public.tours.heure is 'Heure de passage du tour (transpondeur). Sert à ranger les tours de plusieurs pilotes dans l''ordre.';

-- =====================================================================
-- 1. Tables
-- =====================================================================
create table public.sessions_groupe (
  id uuid primary key default gen_random_uuid(),
  createur uuid not null references public.profils (id) on delete cascade,
  piste uuid not null references public.pistes (id) on delete restrict,
  jour date not null,
  nom text,
  -- code du lien d'invitation : 10 caractères tirés au hasard (impossible à deviner)
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  terminee boolean not null default false,
  cree_le timestamptz not null default now(),
  constraint session_nom_court check (nom is null or char_length(nom) between 1 and 60)
);
comment on table public.sessions_groupe is 'Session d''entraînement en groupe : une piste, un jour, plusieurs pilotes. Lue seulement par les fonctions.';
create index sessions_groupe_createur on public.sessions_groupe (createur, cree_le);
create index sessions_groupe_piste_jour on public.sessions_groupe (piste, jour);

create table public.session_membres (
  session uuid not null references public.sessions_groupe (id) on delete cascade,
  pilote uuid not null references public.profils (id) on delete cascade,
  invite boolean not null default false,          -- vrai = invité, pas encore accepté
  invite_par uuid references public.profils (id) on delete set null,
  couleur smallint not null,                      -- 0 à 11 : la couleur du pilote dans la session
  rejoint_le timestamptz not null default now(),
  primary key (session, pilote),
  constraint couleur_ok check (couleur between 0 and 11)
);
comment on table public.session_membres is 'Membres d''une session de groupe (et invitations en attente).';
create index session_membres_pilote on public.session_membres (pilote);

alter table public.sessions_groupe enable row level security;
alter table public.session_membres enable row level security;
revoke all on public.sessions_groupe from anon, authenticated;
revoke all on public.session_membres from anon, authenticated;

-- =====================================================================
-- 2. Petits outils
-- =====================================================================
create or replace function public.couleur_libre(p_session uuid)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select min(c)::smallint from generate_series(0, 11) c
   where c not in (select couleur from public.session_membres where session = p_session);
$$;
revoke execute on function public.couleur_libre(uuid) from public, anon, authenticated;

-- =====================================================================
-- 3. Créer, inviter, rejoindre, quitter
-- =====================================================================

-- Créer une session (pilotes seulement) et inviter des amis tout de suite
create or replace function public.creer_session(p_piste uuid, p_jour date, p_nom text default null, p_invites uuid[] default '{}')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  moi uuid := (select auth.uid());
  s uuid;
  ami uuid;
begin
  if moi is null then raise exception 'Il faut être connecté.'; end if;
  if not exists (select 1 from public.profils where id = moi and type_compte = 'pilote') then
    raise exception 'Seuls les pilotes peuvent créer une session.';
  end if;
  if not exists (select 1 from public.pistes where id = p_piste) then
    raise exception 'Piste introuvable.';
  end if;
  if p_jour is null or p_jour < current_date - 365 or p_jour > current_date + 30 then
    raise exception 'Choisis un jour entre l''année dernière et le mois prochain.';
  end if;
  if (select count(*) from public.sessions_groupe where createur = moi and cree_le > now() - interval '1 day') >= 20 then
    raise exception 'Tu as créé beaucoup de sessions aujourd''hui. Réessaie demain.';
  end if;

  insert into public.sessions_groupe (createur, piste, jour, nom)
  values (moi, p_piste, p_jour, left(nullif(trim(p_nom), ''), 60))
  returning id into s;

  insert into public.session_membres (session, pilote, couleur) values (s, moi, 0);

  foreach ami in array coalesce(p_invites, '{}') loop
    exit when (select count(*) from public.session_membres where session = s) >= 12;
    if ami <> moi and public.sont_amis(moi, ami)
       and not exists (select 1 from public.session_membres where session = s and pilote = ami) then
      insert into public.session_membres (session, pilote, invite, invite_par, couleur)
      values (s, ami, true, moi, public.couleur_libre(s));
    end if;
  end loop;

  return s;
end;
$$;
revoke execute on function public.creer_session(uuid, date, text, uuid[]) from public, anon;
grant execute on function public.creer_session(uuid, date, text, uuid[]) to authenticated;

-- Inviter des amis dans une session dont on est membre
create or replace function public.inviter_session(p_session uuid, p_pilotes uuid[])
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  moi uuid := (select auth.uid());
  ami uuid;
  n int := 0;
begin
  if not exists (select 1 from public.session_membres where session = p_session and pilote = moi and not invite) then
    raise exception 'Session introuvable.';
  end if;
  if (select terminee from public.sessions_groupe where id = p_session) then
    raise exception 'Cette session est terminée.';
  end if;
  foreach ami in array coalesce(p_pilotes, '{}') loop
    exit when (select count(*) from public.session_membres where session = p_session) >= 12;
    if ami <> moi and public.sont_amis(moi, ami)
       and not exists (select 1 from public.session_membres where session = p_session and pilote = ami) then
      insert into public.session_membres (session, pilote, invite, invite_par, couleur)
      values (p_session, ami, true, moi, public.couleur_libre(p_session));
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;
revoke execute on function public.inviter_session(uuid, uuid[]) from public, anon;
grant execute on function public.inviter_session(uuid, uuid[]) to authenticated;

-- Ce qu'on voit avant de rejoindre avec un lien (il faut connaître le code)
create or replace function public.apercu_session(p_code text)
returns table (id uuid, nom text, jour date, piste_nom text, createur_nom text, nb_membres int,
               terminee boolean, deja_membre boolean, invite boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.nom, s.jour, pi.nom, pr.nom,
         (select count(*)::int from public.session_membres m where m.session = s.id and not m.invite),
         s.terminee,
         exists (select 1 from public.session_membres m where m.session = s.id and m.pilote = (select auth.uid()) and not m.invite),
         exists (select 1 from public.session_membres m where m.session = s.id and m.pilote = (select auth.uid()) and m.invite)
    from public.sessions_groupe s
    join public.pistes pi on pi.id = s.piste
    left join public.profils pr on pr.id = s.createur
   where (select auth.uid()) is not null
     and s.code = upper(trim(p_code))
     and char_length(trim(p_code)) = 10;
$$;
revoke execute on function public.apercu_session(text) from public, anon;
grant execute on function public.apercu_session(text) to authenticated;

-- Rejoindre une session avec le code du lien
create or replace function public.rejoindre_session(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  moi uuid := (select auth.uid());
  s public.sessions_groupe;
begin
  if moi is null then raise exception 'Il faut être connecté.'; end if;
  if not exists (select 1 from public.profils where id = moi and type_compte = 'pilote') then
    raise exception 'Seuls les pilotes peuvent rejoindre une session.';
  end if;
  select * into s from public.sessions_groupe where code = upper(trim(p_code)) and char_length(trim(p_code)) = 10;
  if s.id is null then raise exception 'Ce lien ne marche pas (session introuvable).'; end if;
  if s.terminee then raise exception 'Cette session est terminée.'; end if;

  if exists (select 1 from public.session_membres where session = s.id and pilote = moi) then
    update public.session_membres set invite = false, rejoint_le = now() where session = s.id and pilote = moi and invite;
  else
    if (select count(*) from public.session_membres where session = s.id) >= 12 then
      raise exception 'Cette session est complète (12 pilotes maximum).';
    end if;
    insert into public.session_membres (session, pilote, couleur) values (s.id, moi, public.couleur_libre(s.id));
  end if;
  return s.id;
end;
$$;
revoke execute on function public.rejoindre_session(text) from public, anon;
grant execute on function public.rejoindre_session(text) to authenticated;

-- Accepter ou refuser une invitation
create or replace function public.repondre_invitation_session(p_session uuid, p_accepter boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_accepter then
    if (select terminee from public.sessions_groupe where id = p_session) then
      raise exception 'Cette session est terminée.';
    end if;
    update public.session_membres set invite = false, rejoint_le = now()
     where session = p_session and pilote = (select auth.uid()) and invite;
  else
    delete from public.session_membres
     where session = p_session and pilote = (select auth.uid()) and invite;
  end if;
  if not found then raise exception 'Invitation introuvable.'; end if;
end;
$$;
revoke execute on function public.repondre_invitation_session(uuid, boolean) from public, anon;
grant execute on function public.repondre_invitation_session(uuid, boolean) to authenticated;

-- Quitter une session (le créateur, lui, la supprime)
create or replace function public.quitter_session(p_session uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.sessions_groupe where id = p_session and createur = (select auth.uid())) then
    raise exception 'Tu as créé cette session : tu peux la supprimer.';
  end if;
  delete from public.session_membres where session = p_session and pilote = (select auth.uid());
  if not found then raise exception 'Session introuvable.'; end if;
end;
$$;
revoke execute on function public.quitter_session(uuid) from public, anon;
grant execute on function public.quitter_session(uuid) to authenticated;

-- Supprimer une session (créateur seulement). Les tours de chacun restent dans son calendrier.
create or replace function public.supprimer_session(p_session uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.sessions_groupe where id = p_session and createur = (select auth.uid());
  if not found then raise exception 'Seul le pilote qui a créé la session peut la supprimer.'; end if;
end;
$$;
revoke execute on function public.supprimer_session(uuid) from public, anon;
grant execute on function public.supprimer_session(uuid) to authenticated;

-- Terminer (ou rouvrir) une session (créateur seulement)
create or replace function public.terminer_session(p_session uuid, p_terminee boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sessions_groupe set terminee = p_terminee
   where id = p_session and createur = (select auth.uid());
  if not found then raise exception 'Seul le pilote qui a créé la session peut la terminer.'; end if;
end;
$$;
revoke execute on function public.terminer_session(uuid, boolean) from public, anon;
grant execute on function public.terminer_session(uuid, boolean) to authenticated;

-- =====================================================================
-- 4. Lire
-- =====================================================================

-- Mes sessions (en cours, invitations, historique)
create or replace function public.mes_sessions()
returns table (id uuid, nom text, jour date, piste uuid, piste_nom text, createur_nom text,
               est_createur boolean, invite boolean, terminee boolean, nb_membres int, nb_tours int,
               meilleur numeric, meilleur_nom text, cree_le timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with mes as (
    select s.*, m.invite as mon_invite
      from public.session_membres m
      join public.sessions_groupe s on s.id = m.session
     where m.pilote = (select auth.uid())
  ),
  tours_session as (
    select mes.id as session, t.temps_final, e.pilote
      from mes
      join public.session_membres m on m.session = mes.id and not m.invite
      join public.entrainements e on e.pilote = m.pilote and e.piste = mes.piste and e.jour = mes.jour
      join public.tours t on t.entrainement = e.id
  )
  select mes.id, mes.nom, mes.jour, mes.piste, pi.nom, pr.nom,
         mes.createur = (select auth.uid()), mes.mon_invite, mes.terminee,
         (select count(*)::int from public.session_membres m where m.session = mes.id and not m.invite),
         (select count(*)::int from tours_session ts where ts.session = mes.id),
         b.temps_final, bp.nom, mes.cree_le
    from mes
    join public.pistes pi on pi.id = mes.piste
    left join public.profils pr on pr.id = mes.createur
    left join lateral (
      select ts.temps_final, ts.pilote from tours_session ts
       where ts.session = mes.id and ts.temps_final is not null
       order by ts.temps_final limit 1
    ) b on true
    left join public.profils bp on bp.id = b.pilote
   order by mes.mon_invite desc, mes.terminee, mes.jour desc, mes.cree_le desc
   limit 200;
$$;
revoke execute on function public.mes_sessions() from public, anon;
grant execute on function public.mes_sessions() to authenticated;

-- Tout le détail d'une session : la piste, les membres, et tous les tours du groupe
create or replace function public.session_detail(p_session uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  moi uuid := (select auth.uid());
  s public.sessions_groupe;
  resultat jsonb;
begin
  if not exists (select 1 from public.session_membres where session = p_session and pilote = moi) then
    raise exception 'Session introuvable.';
  end if;
  select * into s from public.sessions_groupe where id = p_session;

  select jsonb_build_object(
    'session', jsonb_build_object(
      'id', s.id, 'nom', s.nom, 'jour', s.jour, 'code', s.code, 'terminee', s.terminee,
      'est_createur', s.createur = moi, 'cree_le', s.cree_le,
      'piste', (select jsonb_build_object('id', p.id, 'nom', p.nom, 'lieu', p.lieu, 'trace', p.trace, 'lignes', p.lignes, 'exemple', p.exemple)
                  from public.pistes p where p.id = s.piste)
    ),
    'membres', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.pilote, 'nom', pr.nom, 'plaque', pr.plaque, 'couleur', m.couleur,
               'invite', m.invite, 'est_moi', m.pilote = moi, 'est_createur', m.pilote = s.createur)
             order by m.invite, m.rejoint_le)
        from public.session_membres m
        join public.profils pr on pr.id = m.pilote
       where m.session = s.id
    ), '[]'::jsonb),
    'tours', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id, 'pilote', e.pilote, 'numero', t.numero, 'temps', to_jsonb(t.temps),
               'temps_final', t.temps_final, 'exemple', e.exemple,
               'heure', coalesce(t.heure, e.cree_le + make_interval(secs => t.numero * 90)))
             order by coalesce(t.heure, e.cree_le + make_interval(secs => t.numero * 90)), t.numero)
        from public.session_membres m
        join public.entrainements e on e.pilote = m.pilote and e.piste = s.piste and e.jour = s.jour
        join public.tours t on t.entrainement = e.id
       where m.session = s.id and not m.invite
    ), '[]'::jsonb)
  ) into resultat;

  return resultat;
end;
$$;
revoke execute on function public.session_detail(uuid) from public, anon;
grant execute on function public.session_detail(uuid) to authenticated;

-- =====================================================================
-- 5. Essayer : ajouter quelques tours d'exemple pour soi dans la session
-- =====================================================================
-- Les tours sont des « exemples » (jamais publiés, jamais vus par le classement ni par les amis).
-- Chaque membre peut appuyer sur son téléphone : tout le groupe voit les tours arriver.
create or replace function public.ajouter_tours_exemple_session(p_session uuid, p_nb int default 3)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  moi uuid := (select auth.uid());
  s public.sessions_groupe;
  pos numeric[];
  seance uuid;
  rythme numeric;
  numero_depart int;
  k int;
  i int;
  total numeric;
  cumul numeric;
  t numeric[];
  chute int;
begin
  if not exists (select 1 from public.session_membres where session = p_session and pilote = moi and not invite) then
    raise exception 'Session introuvable.';
  end if;
  select * into s from public.sessions_groupe where id = p_session;
  if s.terminee then raise exception 'Cette session est terminée.'; end if;
  p_nb := least(greatest(coalesce(p_nb, 3), 1), 5);

  -- place de chaque ligne après le départ sur le tracé (0 → 1)
  select array_agg((l ->> 'pos')::numeric order by o) into pos
    from public.pistes p, jsonb_array_elements(p.lignes) with ordinality as x(l, o)
   where p.id = s.piste and o > 1;

  select id into seance from public.entrainements
   where pilote = moi and piste = s.piste and jour = s.jour and exemple
   order by cree_le limit 1;
  if seance is null then
    insert into public.entrainements (pilote, piste, jour, exemple) values (moi, s.piste, s.jour, true)
    returning id into seance;
  end if;

  select coalesce(max(numero), 0) into numero_depart from public.tours where entrainement = seance;
  if numero_depart + p_nb > 60 then raise exception 'Assez de tours d''exemple pour aujourd''hui (60 maximum).'; end if;

  -- le rythme du pilote : sa moyenne s'il a déjà roulé, sinon un rythme au hasard
  select avg(temps_final) into rythme from public.tours where entrainement = seance and temps_final is not null;
  rythme := coalesce(rythme, 33.5 + random() * 4);

  for k in 1 .. p_nb loop
    total := rythme * (1 + (random() - 0.6) * 0.03);   -- il progresse un peu, en moyenne
    t := '{}';
    cumul := 0;
    for i in 1 .. array_length(pos, 1) loop
      cumul := cumul + total * (pos[i] - coalesce(pos[i - 1], 0)) * (1 + (random() - 0.5) * 0.07);
      t := t || round(cumul, 3);
    end loop;
    -- de temps en temps, une chute
    if random() < 0.08 then
      chute := 1 + floor(random() * (array_length(pos, 1) - 1))::int;
      t := t[1:chute] || array_fill(null::numeric, array[array_length(pos, 1) - chute]);
    end if;
    insert into public.tours (entrainement, numero, temps, heure)
    values (seance, numero_depart + k, t, now() + make_interval(secs => k));
  end loop;

  return p_nb;
end;
$$;
revoke execute on function public.ajouter_tours_exemple_session(uuid, int) from public, anon;
grant execute on function public.ajouter_tours_exemple_session(uuid, int) to authenticated;
