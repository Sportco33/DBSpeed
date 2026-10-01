"""Fabrique le SQL des pistes de BMX et pump tracks de France, notées sur 20, pour la table public.lieux.

Source : Data ES, le recensement officiel des équipements sportifs du ministère des Sports
(licence ouverte), via l'API de data.gouv.fr. On télécharge deux fichiers CSV déjà filtrés :
  - pistes de bicross (type 604) : voir LIEN_BMX plus bas
  - pumptracks (type 610)        : voir LIEN_PUMP plus bas
Puis : python3 outils/lieux-france.py bmx.csv pump.csv
→ écrit supabase/migrations/20261002100000_lieux_france.sql et affiche les classements.

On garde seulement les équipements en service, avec une position, et (pour le type 604) ceux qui
sont vraiment du BMX (le type 604 contient aussi des pistes de VTT).
Chaque note est calculée avec la grille ci-dessous, uniquement avec ce que dit la fiche officielle :
une info pas remplie donne 0 point (la note dit donc aussi « fiche bien remplie ou pas »).

VÉRIFICATION (consigne 40) : un lieu n'est affiché que si OpenStreetMap a la même piste à 150 m ou moins.
Les 849 lieux pas confirmés sont dans public.lieux_a_confirmer ; un déclencheur empêche ce fichier de les remettre.
Un NOUVEAU lieu Data ES doit être vérifié de la même façon avant d'être ajouté
(voir supabase/migrations/20261001220000_lieux_france_verifies.sql).
"""
import csv, json, sys, unicodedata

RES = 'ea4f5879-af40-4e3e-949d-812d6eeb5e02'
COLONNES = ('__id,equip_numero,equip_type_code,inst_nom,equip_nom,inst_adresse,inst_cp,new_name,dep_code,equip_y,equip_x,'
            'equip_sol,equip_long,equip_larg,equip_surf,equip_eclair,equip_acc_libre,equip_ouv_public_bool,'
            'equip_service_date,equip_travaux_date,equip_homo_date,equip_trib_nb,equip_vest_sport,equip_sanit,'
            'equip_douche,equip_saison,inst_hs_bool,aps_name,equip_url')
LIEN = f'https://tabular-api.data.gouv.fr/api/resources/{RES}/data/csv/?columns={COLONNES}&equip_type_code__exact='
LIEN_BMX, LIEN_PUMP = LIEN + '604', LIEN + '610'
SOURCE = {'nom': 'Data ES – recensement officiel des équipements sportifs (ministère des Sports)',
          'url': 'https://www.data.gouv.fr/datasets/recensement-des-equipements-sportifs-espaces-et-sites-de-pratiques'}
SORTIE = 'supabase/migrations/20261002100000_lieux_france.sql'


# ------------------------------------------------------------------ petits outils
def sans_accents(t):
    return ''.join(c for c in unicodedata.normalize('NFD', t or '') if unicodedata.category(c) != 'Mn').lower()

def vrai(v):
    return str(v).strip().lower() in ('true', '1', 'oui', 'yes', 't')

def nombre(v):
    try:
        x = float(str(v).replace(',', '.'))
        return x if x == x else None
    except (TypeError, ValueError):
        return None

def annee(v):
    x = nombre(v)
    return int(x) if x and 1900 <= x <= 2030 else None

PETITS = {'de', 'du', 'des', 'la', 'le', 'les', 'et', 'en', 'au', 'aux', 'sur', 'sous', 'a', 'à', "d'", "l'"}
def propre(t):
    t = ' '.join((t or '').split())
    if t and t == t.upper():  # tout en majuscules → « Piste de Bicross »
        mots = t.lower().split(' ')
        t = ' '.join(m if (i and m in PETITS) else m[:2] + m[2:3].upper() + m[3:] if m[:2] in ("d'", "l'") else m[:1].upper() + m[1:] for i, m in enumerate(mots))
        t = t.replace('Bmx', 'BMX')
    return t

GENERIQUES = {'piste', 'de', 'bmx', 'bicross', 'bi', 'cross', 'bi-cross', 'terrain', 'site', 'piste/terrain', 'pumptrack',
              'pump', 'track', 'pump-track', 'parcours', 'velo', 'du', 'la', 'le', 'pour', 'aire', 'equipement', '/', '-', 'et'}
def nom_parlant(t):
    mots = [m for m in sans_accents(t).replace('(', ' ').replace(')', ' ').split() if m]
    return any(m not in GENERIQUES for m in mots)

def est_bmx(l):
    texte = sans_accents(' '.join([l.get('aps_name', ''), l.get('equip_nom', ''), l.get('inst_nom', '')]))
    return any(m in texte for m in ('bmx', 'bicross', 'bi-cross', 'bi cross', 'b.m.x', 'b m x'))


# ------------------------------------------------------------------ les notes
def points_sol(sol, grille):
    s = sans_accents(sol)
    for cle, pts in grille:
        if cle in s:
            return pts
    return 0

SOL_BMX = [('enrob', 4), ('bitume', 4), ('beton', 3), ('terre artificielle', 3), ('stabilis', 3), ('synthet', 3),
           ('terre battue', 2), ('naturel', 1), ('gazon', 1), ('autre', 1)]
SOL_PUMP = [('enrob', 5), ('bitume', 5), ('beton', 4), ('synthet', 3), ('autre', 2), ('terre artificielle', 2),
            ('stabilis', 2), ('terre battue', 1), ('naturel', 1), ('gazon', 1)]

def derniere_annee(l):
    a = [x for x in (annee(l.get('equip_travaux_date')), annee(l.get('equip_service_date'))) if x]
    return max(a) if a else None

def note_bmx(l):
    d = {}
    long_ = nombre(l.get('equip_long'))
    d['longueur'] = 0 if not long_ else 4 if long_ >= 350 else 3 if long_ >= 300 else 2 if long_ >= 200 else 1
    d['sol'] = points_sol(l.get('equip_sol'), SOL_BMX)
    d['eclairage'] = 3 if vrai(l.get('equip_eclair')) else 0
    vest = nombre(l.get('equip_vest_sport')) or 0
    d['confort'] = (1 if vest > 0 else 0) + (1 if vrai(l.get('equip_sanit')) else 0) + (1 if vrai(l.get('equip_douche')) else 0)
    a = derniere_annee(l)
    d['recente'] = 0 if not a else 3 if a >= 2018 else 2 if a >= 2008 else 1
    trib = nombre(l.get('equip_trib_nb')) or 0
    d['competition'] = (1 if annee(l.get('equip_homo_date')) else 0) + (1 if trib > 0 else 0)
    d['acces_libre'] = 1 if vrai(l.get('equip_acc_libre')) else 0
    return d  # sur 4 + 4 + 3 + 3 + 3 + 2 + 1 = 20

def note_pump(l):
    d = {}
    surf, long_ = nombre(l.get('equip_surf')), nombre(l.get('equip_long'))
    if surf:
        d['taille'] = 6 if surf >= 1500 else 5 if surf >= 800 else 4 if surf >= 400 else 3 if surf >= 200 else 2
    elif long_:
        d['taille'] = 4 if long_ >= 150 else 3 if long_ >= 80 else 2
    else:
        d['taille'] = 0
    d['sol'] = points_sol(l.get('equip_sol'), SOL_PUMP)
    d['eclairage'] = 3 if vrai(l.get('equip_eclair')) else 0
    d['acces_libre'] = 3 if vrai(l.get('equip_acc_libre')) else 0
    a = derniere_annee(l)
    d['recente'] = 0 if not a else 3 if a >= 2020 else 2 if a >= 2015 else 1
    return d  # sur 6 + 5 + 3 + 3 + 3 = 20

GRILLE = {
    'bmx': {'longueur': 4, 'sol': 4, 'eclairage': 3, 'confort': 3, 'recente': 3, 'competition': 2, 'acces_libre': 1},
    'pump': {'taille': 6, 'sol': 5, 'eclairage': 3, 'acces_libre': 3, 'recente': 3},
}
assert all(sum(g.values()) == 20 for g in GRILLE.values())


# ------------------------------------------------------------------ une ligne → un lieu
def lieu(l, genre):
    lat, lon = nombre(l.get('equip_y')), nombre(l.get('equip_x'))
    if lat is None or lon is None or not (-90 <= lat <= 90 and -180 <= lon <= 180) or (lat == 0 and lon == 0):
        return None
    numero = (l.get('equip_numero') or '').strip().lower()
    if not numero or not all(c.isalnum() for c in numero):
        return None
    commune = propre(l.get('new_name'))
    base = propre(l.get('equip_nom'))
    if not nom_parlant(base):
        base = ''
    titre = 'Piste de BMX' if genre == 'bmx' else 'Pumptrack'
    nom = f"{base} – {commune}" if base and sans_accents(commune) not in sans_accents(base) else (base or f"{titre} – {commune}")
    detail = note_bmx(l) if genre == 'bmx' else note_pump(l)

    infos = []
    long_, surf = nombre(l.get('equip_long')), nombre(l.get('equip_surf'))
    if long_: infos.append(f"Longueur : {int(long_)} m.")
    if surf: infos.append(f"Surface : {int(surf)} m².")
    if l.get('equip_sol'): infos.append(f"Sol : {l['equip_sol'].strip().lower()}.")
    infos.append('Éclairée le soir.' if vrai(l.get('equip_eclair')) else 'Pas d’éclairage indiqué.')
    a_service, a_travaux = annee(l.get('equip_service_date')), annee(l.get('equip_travaux_date'))
    if a_service: infos.append(f"Mise en service : {a_service}." + (f" Derniers travaux : {a_travaux}." if a_travaux and a_travaux != a_service else ''))
    if annee(l.get('equip_homo_date')): infos.append(f"Homologuée en {annee(l.get('equip_homo_date'))}.")
    if (nombre(l.get('equip_vest_sport')) or 0) > 0: infos.append('Vestiaires sur place.')
    if vrai(l.get('equip_saison')): infos.append('Ouverte seulement une partie de l’année.')

    adresse = ', '.join(x for x in (propre(l.get('inst_adresse')), ' '.join(x for x in (l.get('inst_cp', '').strip(), commune) if x)) if x)
    site = (l.get('equip_url') or '').strip()
    if site and not site.lower().startswith('http'):
        site = 'https://' + site.lower()
    acces = 'public' if vrai(l.get('equip_acc_libre')) else None
    return dict(id=f"dbs-fr-{numero}"[:44], genre=genre, nom=nom[:120], latitude=round(lat, 7), longitude=round(lon, 7),
                adresse=adresse[:200] or None, acces=acces, trace=' '.join(infos)[:2000] or None,
                club_site=site[:300] if site.startswith('https://') and ' ' not in site else None,
                note=sum(detail.values()), note_detail=detail, departement=l.get('dep_code', '').strip())


def lire(chemin):
    with open(chemin, newline='', encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))

def sql(v):
    if v is None:
        return 'null'
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, (dict, list)):
        return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    return "'" + str(v).replace("'", "''") + "'"


def main(fichiers):
    lieux, ecartes = [], {'hors service': 0, 'pas du BMX': 0, 'sans position': 0}
    vus = set()
    for chemin in fichiers:
        for l in lire(chemin):
            code = str(l.get('equip_type_code', '')).split('.')[0]
            genre = 'bmx' if code == '604' else 'pump' if code == '610' else None
            if not genre:
                continue
            if vrai(l.get('inst_hs_bool')):
                ecartes['hors service'] += 1; continue
            if genre == 'bmx' and not est_bmx(l):
                ecartes['pas du BMX'] += 1; continue
            x = lieu(l, genre)
            if not x:
                ecartes['sans position'] += 1; continue
            if x['id'] in vus:
                continue
            vus.add(x['id']); lieux.append(x)

    cols = ['id', 'genre', 'nom', 'latitude', 'longitude', 'adresse', 'acces', 'trace', 'club_site', 'note', 'note_detail', 'sources']
    lignes = [f"({', '.join(sql(x.get(c)) if c != 'sources' else sql([SOURCE]) for c in cols)})" for x in lieux]
    entete = f"""-- DBSpeed : les pistes de BMX et pump tracks de France (Data ES, ministère des Sports), notées sur 20.
-- Fabriqué par outils/lieux-france.py ({len(lieux)} lieux). Relancer ce fichier met les lieux à jour sans doublon.
-- Grille de notes : voir docs/CAHIER_DES_CHARGES.md (partie « Note des lieux »).

alter table public.lieux add column if not exists note smallint,
  add column if not exists note_detail jsonb;
do $$ begin
  alter table public.lieux add constraint lieu_note_valide check (note is null or note between 0 and 20);
exception when duplicate_object then null; end $$;
comment on column public.lieux.note is 'Note DBSpeed sur 20, calculée avec la fiche officielle Data ES (outils/lieux-france.py)';
comment on column public.lieux.note_detail is 'Points de chaque critère de la note : {{"sol": 4, "eclairage": 3, …}}';

"""
    corps = (f"insert into public.lieux ({', '.join(cols)}) values\n" + ',\n'.join(lignes) +
             "\non conflict (id) do update set genre = excluded.genre, nom = excluded.nom, latitude = excluded.latitude,"
             " longitude = excluded.longitude, adresse = excluded.adresse, acces = excluded.acces, trace = excluded.trace,"
             " club_site = excluded.club_site, note = excluded.note, note_detail = excluded.note_detail, sources = excluded.sources;\n")
    with open(SORTIE, 'w', encoding='utf-8') as f:
        f.write(entete + corps)

    for genre, titre in (('bmx', 'Pistes de BMX'), ('pump', 'Pumptracks')):
        g = sorted((x for x in lieux if x['genre'] == genre), key=lambda x: (-x['note'], x['nom']))
        print(f"\n{titre} : {len(g)} — note moyenne {sum(x['note'] for x in g) / max(len(g), 1):.1f}/20")
        for x in g[:15]:
            print(f"  {x['note']:>2}/20  {x['nom']} ({x['departement']})")
    print('\nÉcartés :', ecartes, '→', SORTIE)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__); print('LIEN_BMX  =', LIEN_BMX); print('LIEN_PUMP =', LIEN_PUMP); sys.exit(1)
    main(sys.argv[1:])
