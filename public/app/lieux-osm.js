// DBSpeed — lire les pistes de BMX et les pump tracks dans OpenStreetMap.
// Ce fichier sert à DEUX endroits :
//   - l'API de la carte (netlify/functions/carte.mts), côté serveur ;
//   - l'appli (lieux.js), seulement si l'API ne répond pas (secours).
// Il ne touche pas à la page : seulement des calculs et des appels réseau.

export const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
export const NOMINATIM = 'https://nominatim.openstreetmap.org';

// Temps d'attente maximum d'un appel à OpenStreetMap (par essai).
// L'appli (secours direct) peut attendre 20 s ; l'API, elle, doit répondre en moins de 10 s
// (limite de Netlify) : elle passe des délais plus courts (voir carte.mts).
export const DELAI_APPLI = 20000;

// Infos d'OpenStreetMap qu'on garde pour une piste (le reste ne sert pas à l'appli)
const TAGS_UTILES = [
  'name', 'official_name', 'opening_hours', 'access', 'fee', 'surface', 'lit', 'operator',
  'website', 'contact:website', 'image', 'wikimedia_commons', 'sport', 'cycling', 'leisure',
  'addr:housenumber', 'addr:street', 'addr:postcode', 'addr:city', 'addr:village', 'addr:town',
];

export function sansAccents(texte) {
  return String(texte || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function distance(a, b) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Id d'une piste : « node-123 », « way-123 », « relation-123 » (OpenStreetMap, que des chiffres)
// ou « dbs-… » (piste ajoutée dans DBSpeed).
export function idValide(id) {
  const texte = String(id || '');
  return /^(node|way|relation)-[0-9]{1,15}$/.test(texte) || /^dbs-[0-9a-z-]{1,40}$/.test(texte);
}

// ---------- Arrondis partagés par l'appli et l'API ----------
// Deux personnes proches demandent exactement la même adresse : la réponse déjà en cache sert à tout le monde.
export const DECIMALES_ZONE = 2;      // ≈ 1 km : chercher les pistes autour d'un point
export const DECIMALES_ADRESSE = 4;   // ≈ 10 m : l'adresse d'un point
export function arrondir(x, decimales) {
  const f = 10 ** decimales;
  return Math.round(x * f) / f;
}

// Rayons de recherche permis (en mètres) : on prend le premier qui couvre la demande
export const RAYONS = [1000, 2000, 5000, 10000, 20000, 35000, 50000];
export function rayonPermis(metres) {
  return RAYONS.find((r) => r >= metres) ?? RAYONS[RAYONS.length - 1];
}

// Piste de BMX ou pump track ? (null = on ne garde pas : skatepark, chemin…)
export function genreDe(tags) {
  const sport = sansAccents(tags.sport);
  const nom = sansAccents(tags.name);
  if (tags.cycling === 'pump_track' || /pump[ -]?track/.test(nom)) return 'pump';
  if (!/(^|;)\s*bmx\s*(;|$)/.test(sport)) return null;
  if (tags.highway || tags.leisure === 'skatepark' || /skate/.test(sport) || /skate/.test(nom)) return null;
  if (/dirt/.test(sansAccents(tags.bmx)) || /dirt/.test(nom)) return null;
  return 'bmx';
}

function centreElement(el) {
  if (el.type === 'node' && Number.isFinite(el.lat)) return { lat: el.lat, lon: el.lon };
  if (el.center) return { lat: el.center.lat, lon: el.center.lon };
  if (el.bounds) {
    return { lat: (el.bounds.minlat + el.bounds.maxlat) / 2, lon: (el.bounds.minlon + el.bounds.maxlon) / 2 };
  }
  if (el.geometry?.length) {
    const s = el.geometry.reduce((a, p) => ({ lat: a.lat + p.lat, lon: a.lon + p.lon }), { lat: 0, lon: 0 });
    return { lat: s.lat / el.geometry.length, lon: s.lon / el.geometry.length };
  }
  return null;
}

function longueurLigne(points) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += distance({ lat: points[i - 1][0], lon: points[i - 1][1] }, { lat: points[i][0], lon: points[i][1] });
  }
  return total;
}

const arrondi = (x) => Math.round(x * 1e6) / 1e6;

// Le dessin du tracé : seulement les lignes de piste (pas le contour du terrain)
function lignesDuTrace(el) {
  const lignes = [];
  const garder = (tags) => tags?.leisure === 'track' || tags?.cycling === 'pump_track';
  const ligne = (geo) => geo.map((p) => [arrondi(p.lat), arrondi(p.lon)]);
  if (el.type === 'way' && garder(el.tags) && el.geometry?.length > 1) lignes.push(ligne(el.geometry));
  if (el.type === 'relation' && garder(el.tags)) {
    for (const m of el.members || []) {
      if (m.type === 'way' && m.geometry?.length > 1) lignes.push(ligne(m.geometry));
    }
  }
  return lignes;
}

// Plus la note est haute, plus l'élément représente bien la piste (il donne son nom et son id)
function note(el) {
  const t = el.tags || {};
  let n = 0;
  if (t.name) n += 10;
  if (el.type === 'node' || ['pitch', 'sports_centre', 'park'].includes(t.leisure)) n += 4;
  if (t.opening_hours || t.website || t.operator) n += 2;
  return n;
}

const ORDRE_TYPE = { node: 0, way: 1, relation: 2 };

// Une même piste est souvent dessinée en plusieurs morceaux (le terrain + la piste + le départ) :
// on les regroupe en une seule piste.
export function regrouper(elements) {
  const candidats = [];
  for (const el of elements) {
    const genre = genreDe(el.tags || {});
    const centre = centreElement(el);
    if (!genre || !centre) continue;
    candidats.push({ el, genre, centre, note: note(el) });
  }
  candidats.sort((a, b) => b.note - a.note
    || ORDRE_TYPE[a.el.type] - ORDRE_TYPE[b.el.type] || a.el.id - b.el.id);

  const groupes = [];
  for (const c of candidats) {
    const proche = groupes.find((g) => g.genre === c.genre && distance(g.centreDepart, c.centre) < 150);
    if (proche) proche.membres.push(c);
    else groupes.push({ genre: c.genre, centreDepart: c.centre, membres: [c] });
  }

  // Un terrain « BMX » sans nom ni piste dessinée, collé à une pump track : c'est la pump track
  const pumps = groupes.filter((g) => g.genre === 'pump');
  const finaux = groupes.filter((g) => {
    if (g.genre !== 'bmx' || !pumps.length) return true;
    const sansNom = !g.membres.some((m) => m.el.tags?.name);
    const sansPiste = !g.membres.some((m) => lignesDuTrace(m.el).length);
    const voisine = pumps.find((p) => distance(p.centreDepart, g.centreDepart) < 100);
    if (sansNom && sansPiste && voisine) { voisine.membres.push(...g.membres); return false; }
    return true;
  });

  return finaux.map((g) => {
    const chef = g.membres[0].el;
    const tags = {};
    for (const m of g.membres) {
      for (const [cle, val] of Object.entries(m.el.tags || {})) {
        if (TAGS_UTILES.includes(cle) && !(cle in tags)) tags[cle] = String(val).slice(0, 300);
      }
    }
    const traces = g.membres.flatMap((m) => lignesDuTrace(m.el));
    const longueur = traces.reduce((s, l) => s + longueurLigne(l), 0);
    const centre = g.membres[0].centre;
    return {
      id: `${chef.type}-${chef.id}`,
      ids: g.membres.map((m) => `${m.el.type}-${m.el.id}`),
      genre: g.genre,
      lat: arrondi(centre.lat),
      lon: arrondi(centre.lon),
      tags,
      traces,
      longueur: longueur > 20 ? Math.round(longueur) : null,
      source: 'osm',
    };
  });
}

// ---------- Appels à OpenStreetMap ----------
// Options de chaque appel :
//   entetes    : en-têtes en plus (l'API se présente aux services d'OpenStreetMap)
//   delaiEssai : temps maximum d'un essai, en ms
//   finAvant   : heure limite (Date.now()) pour tout finir, ou null

// Le temps qu'on peut encore donner à un essai
function tempsDispo({ delaiEssai = DELAI_APPLI, finAvant = null } = {}) {
  return finAvant ? Math.min(delaiEssai, finAvant - Date.now()) : delaiEssai;
}

// Un signal qui coupe l'appel au bout de « ms » (avec une solution pour les vieux navigateurs)
function signalDelai(ms) {
  if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) return AbortSignal.timeout(ms);
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

// Overpass doit arrêter de chercher avant qu'on arrête de l'attendre
const secondesOverpass = (options) => Math.max(5, Math.floor((options?.delaiEssai ?? DELAI_APPLI) / 1000));

export async function demanderOverpass(requete, options = {}) {
  const { entetes = {} } = options;
  let derniereErreur = null;
  for (const adresse of OVERPASS) {
    const delai = tempsDispo(options);
    if (delai < 1000) break;   // plus assez de temps pour un nouvel essai
    try {
      const rep = await fetch(adresse, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...entetes },
        body: `data=${encodeURIComponent(requete)}`,
        signal: signalDelai(delai),
      });
      if (!rep.ok) throw new Error(`Overpass ${rep.status}`);
      const json = await rep.json();
      // Overpass répond parfois « 200 » avec une erreur dans « remark » (trop long, trop lourd) :
      // la réponse est alors vide ou incomplète, on ne la garde pas.
      if (/error/i.test(json.remark || '')) throw new Error(`Overpass : ${json.remark}`);
      return json.elements || [];
    } catch (err) {
      derniereErreur = err;
    }
  }
  throw derniereErreur || new Error('Overpass : plus de temps');
}

function requeteAutour(lat, lon, rayon, secondes) {
  const zone = `(around:${Math.round(rayon)},${lat.toFixed(5)},${lon.toFixed(5)})`;
  return `[out:json][timeout:${secondes}];(nwr["sport"~"bmx"]${zone};nwr["cycling"="pump_track"]${zone};);out body geom;`;
}

export async function pistesAutour(lat, lon, rayon, options = {}) {
  return regrouper(await demanderOverpass(requeteAutour(lat, lon, rayon, secondesOverpass(options)), options));
}

// Toute une zone (un pays, une région) : [sud, ouest, nord, est]
export const ZONE_MAX = { lat: 6, lon: 9 }; // pas plus grand qu'un pays moyen (la Slovaquie, la Suisse…)
export function zoneValide(z) {
  if (!Array.isArray(z) || z.length !== 4 || !z.every(Number.isFinite)) return false;
  const [s, o, n, e] = z;
  return s >= -90 && n <= 90 && o >= -180 && e <= 180 && n > s && e > o
    && n - s <= ZONE_MAX.lat && e - o <= ZONE_MAX.lon;
}
export async function pistesDansZone(zone, options) {
  if (!zoneValide(zone)) throw new Error('Zone trop grande');
  const z = `(${zone.map((x) => x.toFixed(4)).join(',')})`;
  const requete = `[out:json][timeout:60];(nwr["sport"~"bmx"]${z};nwr["cycling"="pump_track"]${z};);out body geom;`;
  return regrouper(await demanderOverpass(requete, options));
}

// Une piste par son id (ex. « way-123 »), avec les morceaux qui l'entourent
export async function pisteParId(id, options = {}) {
  if (!idValide(id) || id.startsWith('dbs-')) return null;
  const [type, num] = id.split('-');   // num : que des chiffres (vérifié par idValide)
  const elements = await demanderOverpass(`[out:json][timeout:${secondesOverpass(options)}];${type}(${num});out center;`, options);
  const el = elements[0];
  const centre = el && centreElement(el);
  if (!centre) return null;
  const pistes = await pistesAutour(centre.lat, centre.lon, 600, options);
  return pistes.find((p) => p.ids.includes(id)) || null;
}

async function demanderNominatim(url, options = {}) {
  const delai = tempsDispo(options);
  if (delai < 1000) throw new Error('Nominatim : plus de temps');
  return fetch(url, { headers: { Accept: 'application/json', ...(options.entetes || {}) }, signal: signalDelai(delai) });
}

// Chercher un nom de ville ou de piste
export async function chercherEndroit(texte, options = {}) {
  const url = `${NOMINATIM}/search?format=jsonv2&limit=1&accept-language=fr&q=${encodeURIComponent(texte)}`;
  const rep = await demanderNominatim(url, options);
  if (!rep.ok) throw new Error(`Nominatim ${rep.status}`);
  const r = (await rep.json())[0];
  if (!r) return null;
  // boundingbox de Nominatim : [sud, nord, ouest, est] → [sud, ouest, nord, est]
  const b = (r.boundingbox || []).map(Number);
  const zone = b.length === 4 ? [b[0], b[2], b[1], b[3]] : null;
  return {
    lat: Number(r.lat),
    lon: Number(r.lon),
    nom: String(r.name || r.display_name || texte).split(',')[0],
    id: r.osm_type && r.osm_id ? `${r.osm_type}-${r.osm_id}` : null,
    zone: zone && zone.every(Number.isFinite) ? zone : null,
  };
}

// L'adresse d'un point (rue + code postal + ville)
export async function adresseDuPoint(lat, lon, options = {}) {
  const url = `${NOMINATIM}/reverse?format=jsonv2&zoom=17&accept-language=fr&lat=${lat}&lon=${lon}`;
  const rep = await demanderNominatim(url, options);
  if (!rep.ok) throw new Error(`Nominatim ${rep.status}`);
  const a = (await rep.json()).address || {};
  const ville = a.city || a.town || a.village || a.municipality || '';
  const rue = [a.house_number, a.road].filter(Boolean).join(' ');
  return {
    ville,
    adresse: [rue, [a.postcode, ville].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null,
  };
}
