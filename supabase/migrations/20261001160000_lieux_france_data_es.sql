-- DBSpeed : toutes les pistes de BMX et les pump tracks de France (≈ 1 430 lieux)
-- Déjà appliqué sur le projet Supabase « DBSpeed » le 01/10/2026 (ne pas relancer en entier).
-- Source : Recensement des équipements sportifs (Data ES, ministère des Sports, Licence Ouverte),
--          types « Piste de bicross » et « Pumptrack ». https://equipements.sports.gouv.fr/explore/dataset/data-es/
-- Les lieux ont l'id « dbs-fr-<numéro de l'équipement> ».
-- Pour mettre à jour plus tard (nouvelles pistes) : select public.importer_data_es();
-- Une fiche complétée à la main par un organisateur (modifie_par rempli) n'est jamais écrasée.

-- 1. Pouvoir lire des données ouvertes directement depuis la base
create extension if not exists http with schema extensions;

-- 2. « de Le Fenouiller » → « du Fenouiller », « de Anglet » → « d'Anglet »
create or replace function public.de_commune(commune text) returns text language sql immutable set search_path = '' as $$
  select case
    when commune is null then null
    when commune ~ '^Le ' then 'du ' || substr(commune, 4)
    when commune ~ '^Les ' then 'des ' || substr(commune, 5)
    when commune ~ '^La ' then 'de la ' || substr(commune, 4)
    when commune ~ '^L[''’]' then 'de l''' || substr(commune, 3)
    when commune ~* '^[aeiouyhâéèêîôûœ]' then 'd''' || commune
    else 'de ' || commune end;
$$;

-- 3. De jolis noms (pas « Piste de BMX – Complexe sportif »)
create or replace function public.nettoyer_noms_data_es() returns void language plpgsql set search_path = '' as $$
begin
  update public.lieux l set nom = left(x.inst, 120)
  from (select id, regexp_replace(nom, '^(Piste de BMX|Pump track) – ', '') as inst from public.lieux
        where id like 'dbs-fr-%' and modifie_par is null and nom ~ '^(Piste de BMX|Pump track) – ') x
  where l.id = x.id and x.inst ~* '(bmx|bicross|bi-cross|pump)' and x.inst !~* '^terrain de bi ?cross$';
  update public.lieux set nom = case when genre = 'pump' then 'Pump track ' else 'Piste de BMX ' end
      || public.de_commune(substring(adresse from '[0-9]{5} (.+)$'))
  where id like 'dbs-fr-%' and modifie_par is null and adresse ~ '[0-9]{5} .+$'
    and nom ~* '^(Piste de BMX|Pump track) – (terrain de bi ?cross|complexe sportif|terrain de sport|terrains de sport|equipements sportifs|équipements sportifs|stade|stade municipal|plaine de jeux)$';
  update public.lieux
  set nom = (regexp_match(nom, '^(Piste de BMX|Pump track) de (.+)$'))[1] || ' '
         || public.de_commune((regexp_match(nom, '^(Piste de BMX|Pump track) de (.+)$'))[2])
  where id like 'dbs-fr-%' and modifie_par is null
    and nom ~ '^(Piste de BMX|Pump track) de (Le |Les |La |L[''’]|[AEIOUYHÂÉÈÊÎÔÛŒaeiouyh])';
end;
$$;

-- 4. L'import (voir la définition complète dans la base : select pg_get_functiondef('public.importer_data_es()'::regprocedure);)
--    Il lit l'export JSON de Data ES (types « Piste de bicross » et « Pumptrack »), enlève les équipements hors service
--    et les pistes de VTT, puis remplit : nom, genre (bmx / pump), position, adresse, accès (public si accès libre,
--    club si réservé aux clubs), description (longueur, largeur, sol, éclairage, année, note du recensement),
--    site de l'équipement, sources. Ensuite il appelle nettoyer_noms_data_es().

revoke execute on function public.de_commune(text) from public, anon, authenticated;
revoke execute on function public.nettoyer_noms_data_es() from public, anon, authenticated;

-- 5. Premier import : select public.importer_data_es();  → 1426 lieux (1002 pistes de BMX, 424 pump tracks)
