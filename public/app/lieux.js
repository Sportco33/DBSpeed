// Onglet Lieux : carte des pistes de BMX et des pump tracks autour de l'utilisateur,
// barre de recherche (une piste ou une ville), et fiche de chaque piste.
//
// D'où viennent les infos :
// - les pistes et leur forme : OpenStreetMap (carte libre), via le service Overpass ;
// - la recherche d'une ville et l'adresse d'une piste : Nominatim (OpenStreetMap) ;
// - ce que DBSpeed ajoute (horaires, public/privé, tracé, photos, club, compétitions) :
//   tables Supabase `lieux` et `competitions`.
// La carte elle-même (Leaflet) est rangée dans /app/leaflet/ et chargée seulement à l'ouverture de l'onglet.
import { supabase, configOk } from '/app/supabase.js';

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const FOND_CARTE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const CREDITS = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
  + ' &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>';
const FRANCE = { lat: 46.6, lon: 2.4, zoom: 5 };
const RAYON = 35000;          // on cherche à 35 km autour du point choisi
const MAX_LISTE = 40;         // nombre de pistes dans la liste sous la carte
const MEMOIRE_CENTRE = 'dbspeed_lieux_centre';

const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);

const etat = {
  L: null,                 // Leaflet
  carte: null,
  couche: null,            // les repères des pistes
  moi: null,               // le point « ma position »
  miniCarte: null,         // la petite carte de la fiche
  groupes: new Map(),      // toutes les pistes déjà vues (id → piste)
  resultats: [],           // les pistes de la dernière recherche (ids)
  complements: new Map(),  // ce que DBSpeed ajoute (id → ligne de la table lieux)
  position: null,          // position de l'utilisateur { lat, lon }
  centre: null,            // centre de la dernière recherche { lat, lon, nom }
  filtre: 'tout',
  texte: '',
  bougeAuto: false,        // la carte bouge toute seule (pas le doigt de l'utilisateur)
  chargement: 0,
  ficheOuverte: null,
  scrollListe: 0,
};

// ---------- Petits outils ----------

function esc(texte) {
  return String(texte ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Garde seulement les vraies adresses web (jamais « javascript: »…)
function lienSur(url) {
  try {
    const u = new URL(String(url).trim().startsWith('www.') ? `https://${String(url).trim()}` : String(url).trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch { return null; }
}

function sansAccents(texte) {
  return String(texte || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function distance(a, b) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function texteDistance(m) {
  if (m == null) return '';
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  if (m < 10000) return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
  return `${Math.round(m / 1000)} km`;
}

function pointDeDepart() {
  return etat.position || etat.centre;
}

function retenirCentre(centre) {
  try { localStorage.setItem(MEMOIRE_CENTRE, JSON.stringify(centre)); } catch { /* rien */ }
}
function centreRetenu() {
  try {
    const c = JSON.parse(localStorage.getItem(MEMOIRE_CENTRE) || 'null');
    return c && Number.isFinite(c.lat) && Number.isFinite(c.lon) ? c : null;
  } catch { return null; }
}

const GENRES = {
  bmx: { nom: 'Piste de BMX', court: 'Piste BMX' },
  pump: { nom: 'Pump track', court: 'Pump track' },
};

const ICONE_BMX = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18c2.5 0 3-5 6-5s3.5 5 6 5 3-8 6-8"/><path d="M5 6V2.5"/><path d="M5 3h5l-1.2 2L10 7H5"/></svg>';
const ICONE_PUMP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 14c2 0 2-4 4-4s2 4 4 4 2-4 4-4 2 4 4 4 2-4 4-4"/><path d="M2 19h20"/></svg>';
const icone = (genre) => (genre === 'pump' ? ICONE_PUMP : ICONE_BMX);

// ---------- Lire OpenStreetMap ----------

// Piste de BMX ou pump track ? (null = on ne garde pas : skatepark, chemin…)
function genreDe(tags) {
  const sport = sansAccents(tags.sport);
  const nom = sansAccents(tags.name);
  if (tags.cycling === 'pump_track' || /pump[ -]?track/.test(nom)) return 'pump';
  if (!/(^|;)\s*bmx\s*(;|$)/.test(sport)) return null;
  if (tags.highway || tags.leisure === 'skatepark' || /skate/.test(sport) || /skate/.test(nom)) return null;
  if (/dirt/.test(sansAccents(tags.bmx)) || /dirt/.test(nom)) return null;
  return 'bmx';
}

function centreElement(el) {
  if (el.type === 'node') return { lat: el.lat, lon: el.lon };
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

// Le dessin du tracé : seulement les lignes de piste (pas le contour du terrain)
function lignesDuTrace(el) {
  const lignes = [];
  const garder = (tags) => tags?.leisure === 'track' || tags?.cycling === 'pump_track';
  if (el.type === 'way' && garder(el.tags) && el.geometry?.length > 1) {
    lignes.push(el.geometry.map((p) => [p.lat, p.lon]));
  }
  if (el.type === 'relation' && garder(el.tags)) {
    for (const m of el.members || []) {
      if (m.type === 'way' && m.geometry?.length > 1) lignes.push(m.geometry.map((p) => [p.lat, p.lon]));
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
function regrouper(elements) {
  const candidats = [];
  for (const el of elements) {
    const tags = el.tags || {};
    const genre = genreDe(tags);
    const centre = centreElement(el);
    if (!genre || !centre) continue;
    candidats.push({ el, genre, centre, note: note(el) });
  }
  candidats.sort((a, b) => b.note - a.note
    || ORDRE_TYPE[a.el.type] - ORDRE_TYPE[b.el.type] || a.el.id - b.el.id);

  const groupes = [];
  for (const c of candidats) {
    const proche = groupes.find((g) => g.genre === c.genre && distance(g.centreDepart, c.centre) < 150);
    if (proche) {
      proche.membres.push(c);
    } else {
      groupes.push({ genre: c.genre, centreDepart: c.centre, membres: [c] });
    }
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
      for (const [cle, val] of Object.entries(m.el.tags || {})) if (!(cle in tags)) tags[cle] = val;
    }
    const traces = g.membres.flatMap((m) => lignesDuTrace(m.el));
    const longueur = traces.reduce((s, l) => s + longueurLigne(l), 0);
    const centreChef = g.membres[0].centre;
    return {
      id: `${chef.type}-${chef.id}`,
      ids: g.membres.map((m) => `${m.el.type}-${m.el.id}`),
      genre: g.genre,
      lat: centreChef.lat,
      lon: centreChef.lon,
      tags,
      traces,
      longueur: longueur > 20 ? longueur : null,
      source: 'osm',
    };
  });
}

async function demanderOverpass(requete) {
  let derniereErreur = null;
  for (const adresse of OVERPASS) {
    try {
      const rep = await fetch(adresse, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(requete)}`,
      });
      if (!rep.ok) throw new Error(`Overpass ${rep.status}`);
      const json = await rep.json();
      return json.elements || [];
    } catch (err) {
      derniereErreur = err;
    }
  }
  throw derniereErreur || new Error('Overpass');
}

function requeteAutour(lat, lon, rayon) {
  const zone = `(around:${Math.round(rayon)},${lat.toFixed(5)},${lon.toFixed(5)})`;
  return `[out:json][timeout:25];(nwr["sport"~"bmx"]${zone};nwr["cycling"="pump_track"]${zone};);out body geom;`;
}

async function pistesAutour(lat, lon, rayon) {
  const elements = await demanderOverpass(requeteAutour(lat, lon, rayon));
  return regrouper(elements);
}

// ---------- Ce que DBSpeed ajoute (Supabase) ----------

async function complementsDansZone(lat, lon, rayon) {
  if (!configOk) return [];
  const dLat = rayon / 111000;
  const dLon = rayon / (111000 * Math.cos((lat * Math.PI) / 180));
  const { data, error } = await supabase.from('lieux').select('*')
    .gte('latitude', lat - dLat).lte('latitude', lat + dLat)
    .gte('longitude', lon - dLon).lte('longitude', lon + dLon)
    .limit(300);
  if (error) throw error;
  return data || [];
}

async function complementDe(piste) {
  for (const id of piste.ids) if (etat.complements.has(id)) return etat.complements.get(id);
  if (!configOk) return null;
  const { data, error } = await supabase.from('lieux').select('*').in('id', piste.ids).limit(1);
  if (error) throw error;
  const ligne = (data || []).find((r) => piste.ids.includes(r.id)) || null;
  if (ligne) etat.complements.set(ligne.id, ligne);
  return ligne;
}

async function competitionsDe(piste) {
  if (!configOk) return [];
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from('competitions')
    .select('id, nom, date_debut, date_fin, niveau, lien')
    .in('lieu_id', piste.ids)
    .or(`date_debut.gte.${aujourdhui},date_fin.gte.${aujourdhui}`)
    .order('date_debut')
    .limit(12);
  if (error) throw error;
  return data || [];
}

// Une piste ajoutée dans DBSpeed (pas dans OpenStreetMap)
function pisteDepuisComplement(ligne) {
  return {
    id: ligne.id, ids: [ligne.id], genre: ligne.genre || 'bmx',
    lat: ligne.latitude, lon: ligne.longitude, tags: {}, traces: [], longueur: null, source: 'dbspeed',
  };
}

// ---------- Ce qu'on affiche d'une piste ----------

function complementConnu(piste) {
  for (const id of piste.ids) if (etat.complements.has(id)) return etat.complements.get(id);
  return null;
}

function villeDe(piste) {
  const t = piste.tags;
  return t['addr:city'] || t['addr:village'] || t['addr:town'] || piste.commune || '';
}

function nomDe(piste) {
  const c = complementConnu(piste);
  const nom = c?.nom || piste.tags.name || piste.tags.official_name;
  if (nom) return nom;
  const ville = villeDe(piste);
  return ville ? `${GENRES[piste.genre].nom} de ${ville}` : `${GENRES[piste.genre].nom} sans nom`;
}

const MOTS_JOURS = {
  Mo: 'lun.', Tu: 'mar.', We: 'mer.', Th: 'jeu.', Fr: 'ven.', Sa: 'sam.', Su: 'dim.', PH: 'jours fériés',
};
const MOIS = {
  Jan: 'janv.', Feb: 'févr.', Mar: 'mars', Apr: 'avr.', May: 'mai', Jun: 'juin',
  Jul: 'juil.', Aug: 'août', Sep: 'sept.', Oct: 'oct.', Nov: 'nov.', Dec: 'déc.',
};

// « Mo-Fr 09:00-20:00; Sa,Su 10:00-19:00 » → lignes en français
function horairesEnFrancais(brut) {
  const texte = String(brut || '').trim();
  if (!texte) return [];
  if (texte === '24/7') return ['Ouvert tout le temps, 24 h/24'];
  return texte.split(';').map((morceau) => morceau.trim()).filter(Boolean).map((morceau) => morceau
    .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (j) => MOTS_JOURS[j])
    .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (m) => MOIS[m])
    .replace(/sunrise/g, 'lever du soleil')
    .replace(/sunset/g, 'coucher du soleil')
    .replace(/\boff\b|\bclosed\b/g, 'fermé')
    .replace(/(\d\d):(\d\d)/g, (_, h, m) => (m === '00' ? `${Number(h)} h` : `${Number(h)} h ${m}`))
    .replace(/(\S)-(\S)/g, '$1 – $2')
    .replace(/,/g, ', ')
    .replace(/^./, (c) => c.toUpperCase()));
}

const ACCES = {
  public: { texte: 'Public', detail: 'Accès libre, ouvert à tous.' },
  prive: { texte: 'Privé', detail: 'Accès privé, pas ouvert au public.' },
  club: { texte: 'Réservé au club', detail: 'Réservé aux licenciés du club (ou sur autorisation).' },
};

function accesDe(piste, complement) {
  if (complement?.acces && ACCES[complement.acces]) return complement.acces;
  const a = piste.tags.access;
  if (['yes', 'permissive', 'public', 'designated'].includes(a)) return 'public';
  if (['private', 'no'].includes(a)) return 'prive';
  if (['members', 'customers', 'permit'].includes(a)) return 'club';
  if (!a && piste.genre === 'pump' && !piste.tags.fee) return null;
  return null;
}

const REVETEMENTS = {
  asphalt: 'Enrobé (bitume)', paved: 'Revêtu', concrete: 'Béton', dirt: 'Terre', earth: 'Terre',
  ground: 'Terre', compacted: 'Terre compactée', fine_gravel: 'Gravier fin', gravel: 'Gravier',
  grass: 'Herbe', sand: 'Sable', clay: 'Argile', wood: 'Bois', unpaved: 'Non revêtu', artificial_turf: 'Synthétique',
};

function revetement(tags) {
  const s = tags.surface;
  if (!s) return null;
  return s.split(';').map((x) => REVETEMENTS[x.trim()] || x.trim()).join(', ');
}

function photosDe(piste, complement) {
  const liste = [];
  for (const url of complement?.photos || []) {
    const sure = lienSur(url);
    if (sure?.startsWith('https://')) liste.push(sure);
  }
  const image = lienSur(piste.tags.image || '');
  if (image?.startsWith('https://')) liste.push(image);
  const commons = piste.tags.wikimedia_commons;
  if (commons && /^File:/i.test(commons)) {
    liste.push(`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commons.slice(5))}?width=900`);
  }
  return [...new Set(liste)].slice(0, 12);
}

function dateCourte(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---------- La carte ----------

let promesseLeaflet = null;
function chargerLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (promesseLeaflet) return promesseLeaflet;
  promesseLeaflet = new Promise((ok, pasOk) => {
    // la feuille de style de Leaflet est déjà dans accueil.html (avant lieux.css, pour garder nos couleurs)
    const script = document.createElement('script');
    script.src = '/app/leaflet/leaflet.js';
    script.onload = () => ok(window.L);
    script.onerror = () => { promesseLeaflet = null; pasOk(new Error('Leaflet')); };
    document.head.append(script);
  });
  return promesseLeaflet;
}

function iconeRepere(genre) {
  return etat.L.divIcon({
    className: 'repere-boite',
    html: `<span class="repere repere-${genre}">${icone(genre)}</span>`,
    iconSize: [36, 44],
    iconAnchor: [18, 42],
    popupAnchor: [0, -38],
  });
}

async function preparerCarte() {
  if (etat.carte) return;
  const L = await chargerLeaflet();
  etat.L = L;
  const depart = centreRetenu() || FRANCE;
  etat.carte = L.map('lieux-carte', {
    zoomControl: !L.Browser.mobile,   // sur téléphone on zoome avec deux doigts
    attributionControl: true,
    tap: true,
    scrollWheelZoom: true,
  }).setView([depart.lat, depart.lon], depart.zoom || 11);
  etat.carte.attributionControl.setPrefix(false);
  L.tileLayer(FOND_CARTE, {
    attribution: CREDITS, subdomains: 'abcd', maxZoom: 19, detectRetina: false,
  }).addTo(etat.carte);
  etat.couche = L.layerGroup().addTo(etat.carte);

  // Si l'utilisateur déplace la carte loin de la dernière recherche : on propose de chercher là
  etat.carte.on('moveend', () => {
    if (etat.bougeAuto) { etat.bougeAuto = false; return; }
    const c = etat.carte.getCenter();
    const loin = !etat.centre || distance(etat.centre, { lat: c.lat, lon: c.lng }) > RAYON * 0.4;
    window.montrer($('lieux-zone'), loin && etat.carte.getZoom() >= 8);
  });
}

function bougerCarte(fonction) {
  etat.bougeAuto = true;
  fonction();
  // si la carte ne bouge pas vraiment, « moveend » n'arrive pas : on remet à zéro
  setTimeout(() => { etat.bougeAuto = false; }, 1200);
}

function dessinerRepereMoi() {
  if (!etat.carte || !etat.position) return;
  const L = etat.L;
  if (etat.moi) etat.moi.setLatLng([etat.position.lat, etat.position.lon]);
  else {
    etat.moi = L.marker([etat.position.lat, etat.position.lon], {
      icon: L.divIcon({ className: 'moi-boite', html: '<span class="moi"></span>', iconSize: [22, 22], iconAnchor: [11, 11] }),
      keyboard: false, interactive: false, zIndexOffset: -100,
    }).addTo(etat.carte);
  }
}

// ---------- Position de l'utilisateur ----------

function demanderPosition() {
  return new Promise((ok) => {
    if (!navigator.geolocation) return ok({ erreur: 'absente' });
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => ok({ erreur: e.code === 1 ? 'refusee' : 'introuvable' }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  });
}

async function localiser({ auto = false } = {}) {
  const bouton = $('lieux-ici');
  bouton.classList.add('cherche');
  dire(auto ? 'On cherche où tu es…' : 'On te localise…', 'attente');
  const rep = await demanderPosition();
  bouton.classList.remove('cherche');
  if (rep.erreur) {
    const deja = centreRetenu();
    if (rep.erreur === 'refusee') {
      dire(auto && deja
        ? 'Ta position n’est pas partagée : voici ta dernière recherche. Tu peux aussi chercher une ville.'
        : 'Ta position n’est pas partagée. Cherche une ville ou une piste dans la barre en haut, ou autorise la position pour DBSpeed dans les réglages du téléphone.', auto ? 'info' : 'erreur');
    } else {
      dire('Impossible de trouver ta position. Cherche une ville ou une piste dans la barre en haut.', auto ? 'info' : 'erreur');
    }
    if (auto && deja) await chercherIci(deja.lat, deja.lon, deja.nom);
    return false;
  }
  etat.position = { lat: rep.lat, lon: rep.lon };
  dessinerRepereMoi();
  await chercherIci(rep.lat, rep.lon, null);
  return true;
}

// ---------- Chercher les pistes d'une zone ----------

function dire(texte, genre = 'info', reessayer = null) {
  const zone = $('lieux-etat');
  zone.className = `lieux-etat ${genre}`;
  zone.innerHTML = genre === 'attente' ? `<span class="roue" aria-hidden="true"></span>${esc(texte)}` : esc(texte);
  if (reessayer) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lien-bouton';
    b.textContent = 'Réessayer';
    b.addEventListener('click', reessayer);
    zone.append(' ', b);
  }
  if (genre === 'erreur') window.vibrer?.('erreur');
}

async function chercherIci(lat, lon, nomLieu, idAOuvrir = null) {
  const numero = ++etat.chargement;
  etat.centre = { lat, lon, nom: nomLieu };
  window.montrer($('lieux-zone'), false);
  bougerCarte(() => etat.carte.setView([lat, lon], 11, { animate: !calme }));
  dire(nomLieu ? `On cherche les pistes autour de ${nomLieu}…` : 'On cherche les pistes autour de toi…', 'attente');
  $('lieux-liste').classList.add('en-charge');

  let pistes;
  try {
    pistes = await pistesAutour(lat, lon, RAYON);
  } catch {
    if (numero !== etat.chargement) return;
    $('lieux-liste').classList.remove('en-charge');
    dire('Impossible de charger les pistes pour l’instant. Vérifie ta connexion.', 'erreur',
      () => chercherIci(lat, lon, nomLieu, idAOuvrir));
    return;
  }
  // Les compléments DBSpeed : s'ils ne viennent pas, la carte marche quand même
  let complements = [];
  try { complements = await complementsDansZone(lat, lon, RAYON); } catch { /* rien */ }
  if (numero !== etat.chargement) return;

  for (const c of complements) etat.complements.set(c.id, c);
  const connus = new Set(pistes.flatMap((p) => p.ids));
  for (const c of complements) {
    if (!connus.has(c.id) && Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) {
      pistes.push(pisteDepuisComplement(c));
    }
  }
  for (const p of pistes) etat.groupes.set(p.id, p);
  etat.resultats = pistes.map((p) => p.id);
  retenirCentre({ lat, lon, nom: nomLieu, zoom: 11 });
  $('lieux-liste').classList.remove('en-charge');
  afficherResultats();

  const trouvee = idAOuvrir && pistes.find((p) => p.ids.includes(idAOuvrir));
  if (trouvee) {
    ouvrirRepere(trouvee.id);
  } else {
    // on cadre la carte sur le point de départ et les pistes les plus proches
    const proches = pistesVisibles().slice(0, 6).map(({ piste }) => [piste.lat, piste.lon]);
    if (proches.length) {
      const zone = etat.L.latLngBounds([[lat, lon], ...proches]);
      bougerCarte(() => etat.carte.fitBounds(zone, { paddingTopLeft: [60, 50], paddingBottomRight: [70, 70], maxZoom: 13, animate: !calme }));
    }
  }
}

function pistesVisibles() {
  const texte = sansAccents(etat.texte);
  const depart = pointDeDepart();
  return etat.resultats
    .map((id) => etat.groupes.get(id))
    .filter(Boolean)
    .filter((p) => etat.filtre === 'tout' || p.genre === etat.filtre)
    .filter((p) => !texte || sansAccents(`${nomDe(p)} ${villeDe(p)} ${p.tags.operator || ''}`).includes(texte))
    .map((p) => ({ piste: p, metres: depart ? distance(depart, p) : null }))
    .sort((a, b) => (a.metres ?? 0) - (b.metres ?? 0));
}

const marqueurs = new Map();

function afficherResultats() {
  const visibles = pistesVisibles();
  const L = etat.L;

  // Les repères sur la carte
  etat.couche.clearLayers();
  marqueurs.clear();
  for (const { piste, metres } of visibles) {
    const m = L.marker([piste.lat, piste.lon], { icon: iconeRepere(piste.genre), title: nomDe(piste), riseOnHover: true });
    m.bindPopup(() => contenuBulle(piste, metres), { closeButton: false, className: 'bulle-piste', maxWidth: 260 });
    m.on('click', () => window.vibrer?.('leger'));
    m.addTo(etat.couche);
    marqueurs.set(piste.id, m);
  }

  // La liste sous la carte
  const liste = $('lieux-liste');
  liste.innerHTML = '';
  visibles.slice(0, MAX_LISTE).forEach(({ piste, metres }, i) => {
    const li = document.createElement('li');
    li.style.setProperty('--i', Math.min(i, 8));
    const ville = villeDe(piste);
    const infos = [GENRES[piste.genre].court, texteDistance(metres), ville].filter(Boolean).join(' · ');
    li.innerHTML = `<a class="lieu-carte touchable" href="#lieux/${esc(piste.id)}">
        <span class="lieu-icone lieu-icone-${piste.genre}">${icone(piste.genre)}</span>
        <span class="lieu-textes"><span class="lieu-nom">${esc(nomDe(piste))}</span>
        <span class="lieu-infos">${esc(infos)}</span></span>
        <svg class="lieu-fleche" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>
      </a>`;
    liste.append(li);
  });
  if (visibles.length > MAX_LISTE) {
    const li = document.createElement('li');
    li.className = 'lieu-plus';
    li.textContent = `Et ${visibles.length - MAX_LISTE} autres plus loin : approche la carte pour les voir.`;
    liste.append(li);
  }

  // Le message au-dessus de la liste
  const total = visibles.length;
  const ou = etat.centre?.nom ? `autour de ${etat.centre.nom}` : 'autour de toi';
  if (etat.texte && !total) {
    dire(`Aucune piste « ${etat.texte} » ici. Appuie sur Rechercher pour chercher ce nom ou cette ville ailleurs.`, 'info');
  } else if (!total) {
    const quoi = etat.filtre === 'pump' ? 'pump track' : etat.filtre === 'bmx' ? 'piste de BMX' : 'piste';
    dire(`Aucune ${quoi} trouvée ${ou} (35 km). Déplace la carte ou cherche une autre ville.`, 'info');
  } else {
    const quoi = total > 1 ? 'lieux' : 'lieu';
    dire(`${total} ${quoi} ${etat.texte ? `pour « ${etat.texte} »` : ou}.`, 'ok');
  }
}

function contenuBulle(piste, metres) {
  const div = document.createElement('div');
  div.innerHTML = `<p class="bulle-type">${esc(GENRES[piste.genre].court)}${metres != null ? ` · ${esc(texteDistance(metres))}` : ''}</p>
    <p class="bulle-nom">${esc(nomDe(piste))}</p>
    <a class="bouton bouton-principal bouton-or bulle-bouton" href="#lieux/${esc(piste.id)}">Voir la piste</a>`;
  return div;
}

function ouvrirRepere(id) {
  const m = marqueurs.get(id);
  const piste = etat.groupes.get(id);
  if (!m || !piste) return;
  bougerCarte(() => etat.carte.setView([piste.lat, piste.lon], Math.max(etat.carte.getZoom(), 14), { animate: !calme }));
  setTimeout(() => m.openPopup(), calme ? 0 : 300);
}

// ---------- Barre de recherche ----------

async function chercherAilleurs(texte) {
  dire(`On cherche « ${texte} »…`, 'attente');
  let resultat = null;
  try {
    const url = `${NOMINATIM}/search?format=jsonv2&limit=1&accept-language=fr&q=${encodeURIComponent(texte)}`;
    const rep = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!rep.ok) throw new Error('Nominatim');
    resultat = (await rep.json())[0] || null;
  } catch {
    dire('La recherche ne répond pas pour l’instant. Vérifie ta connexion et réessaie.', 'erreur');
    return;
  }
  if (!resultat) {
    dire(`Rien trouvé pour « ${texte} ». Essaie avec le nom d’une ville.`, 'erreur');
    return;
  }
  const nomCourt = String(resultat.name || resultat.display_name || texte).split(',')[0];
  const idOsm = resultat.osm_type && resultat.osm_id ? `${resultat.osm_type}-${resultat.osm_id}` : null;
  // on enlève le texte : il a servi à trouver l'endroit, plus à filtrer la liste
  etat.texte = '';
  $('lieux-champ').value = '';
  window.montrer($('lieux-effacer'), false);
  await chercherIci(Number(resultat.lat), Number(resultat.lon), nomCourt, idOsm);
}

function preparerRecherche() {
  const champ = $('lieux-champ');
  const effacer = $('lieux-effacer');
  champ.addEventListener('input', () => {
    etat.texte = champ.value.trim();
    window.montrer(effacer, Boolean(champ.value));
    if (etat.carte) afficherResultats();
  });
  effacer.addEventListener('click', () => {
    champ.value = '';
    etat.texte = '';
    window.montrer(effacer, false);
    if (etat.carte) afficherResultats();
    champ.focus();
  });
  $('lieux-recherche').addEventListener('submit', async (e) => {
    e.preventDefault();
    const texte = champ.value.trim();
    if (!texte) return;
    champ.blur();
    await preparerCarte();
    const visibles = pistesVisibles();
    if (visibles.length === 1) {
      ouvrirRepere(visibles[0].piste.id);
    } else if (visibles.length > 1) {
      const zone = etat.L.latLngBounds(visibles.map(({ piste }) => [piste.lat, piste.lon]));
      bougerCarte(() => etat.carte.fitBounds(zone, { padding: [40, 40], maxZoom: 14, animate: !calme }));
    } else {
      await chercherAilleurs(texte);
    }
  });

  for (const bouton of document.querySelectorAll('.filtres button')) {
    bouton.addEventListener('click', () => {
      etat.filtre = bouton.dataset.filtre;
      for (const b of document.querySelectorAll('.filtres button')) {
        b.setAttribute('aria-pressed', String(b === bouton));
      }
      $('lieux-filtres').dataset.choix = etat.filtre;
      if (etat.carte) afficherResultats();
    });
  }

  $('lieux-ici').addEventListener('click', async () => {
    await preparerCarte();
    if (etat.position) {
      dessinerRepereMoi();
      chercherIci(etat.position.lat, etat.position.lon, null);
    } else {
      localiser();
    }
  });

  $('lieux-zone').addEventListener('click', () => {
    const c = etat.carte.getCenter();
    chercherIci(c.lat, c.lng, 'cette zone');
  });
}

// ---------- La fiche d'une piste ----------

function idValide(id) {
  return /^(node|way|relation|dbs)-[0-9a-z-]{1,40}$/.test(id);
}

async function trouverPiste(id) {
  const connue = etat.groupes.get(id) || [...etat.groupes.values()].find((p) => p.ids.includes(id));
  if (connue) return connue;
  if (id.startsWith('dbs-')) {
    if (!configOk) return null;
    const { data } = await supabase.from('lieux').select('*').eq('id', id).maybeSingle();
    if (!data || !Number.isFinite(data.latitude)) return null;
    etat.complements.set(data.id, data);
    const piste = pisteDepuisComplement(data);
    etat.groupes.set(piste.id, piste);
    return piste;
  }
  // Lien ouvert directement (page rechargée…) : on retrouve la piste et ses voisins
  const [type, num] = id.split('-');
  const elements = await demanderOverpass(`[out:json][timeout:20];${type}(${Number(num)});out center;`);
  const el = elements[0];
  const centre = el && centreElement(el);
  if (!centre) return null;
  const pistes = await pistesAutour(centre.lat, centre.lon, 600);
  for (const p of pistes) etat.groupes.set(p.id, p);
  return pistes.find((p) => p.ids.includes(id)) || null;
}

async function communeDe(piste) {
  if (piste.adresseTrouvee !== undefined) return piste.adresseTrouvee;
  try {
    const url = `${NOMINATIM}/reverse?format=jsonv2&zoom=17&accept-language=fr&lat=${piste.lat}&lon=${piste.lon}`;
    const rep = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!rep.ok) throw new Error('Nominatim');
    const json = await rep.json();
    const a = json.address || {};
    const ville = a.city || a.town || a.village || a.municipality || '';
    const rue = [a.house_number, a.road].filter(Boolean).join(' ');
    piste.commune = ville;
    piste.adresseTrouvee = [rue, [a.postcode, ville].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null;
  } catch {
    piste.adresseTrouvee = null;
  }
  return piste.adresseTrouvee;
}

function adresseOsm(tags) {
  const rue = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const ville = [tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(' ');
  return [rue, ville].filter(Boolean).join(', ') || null;
}

function ligneInfo(icone, titre, valeur) {
  return `<div class="info-ligne"><span class="info-icone" aria-hidden="true">${icone}</span>
    <div><p class="info-titre">${esc(titre)}</p><p class="info-valeur">${valeur}</p></div></div>`;
}

const PETITES_ICONES = {
  adresse: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  horloge: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  cadenas: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>',
  regle: '<svg viewBox="0 0 24 24"><path d="M3 16 16 3l5 5L8 21z"/><path d="m7 12 2 2M10 9l2 2M13 6l2 2"/></svg>',
  sol: '<svg viewBox="0 0 24 24"><path d="M3 17c3 0 3-4 6-4s3 4 6 4 3-4 6-4"/><path d="M3 21h18"/></svg>',
  lampe: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
  club: '<svg viewBox="0 0 24 24"><path d="M12 3 4 6v5c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6z"/></svg>',
  web: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17"/></svg>',
};

function htmlFiche(piste, complement) {
  const nom = nomDe(piste);
  const genre = GENRES[piste.genre];
  const acces = accesDe(piste, complement);
  const photos = photosDe(piste, complement);
  const metres = pointDeDepart() ? distance(pointDeDepart(), piste) : null;
  const itineraire = `https://www.google.com/maps/dir/?api=1&destination=${piste.lat.toFixed(6)},${piste.lon.toFixed(6)}`;
  const adresse = complement?.adresse || adresseOsm(piste.tags);

  // Photos, ou un bandeau dessiné s'il n'y en a pas encore
  const haut = photos.length
    ? `<div class="fiche-photos" aria-label="Photos">
        <div class="photos-defile">${photos.map((url, i) => `<img src="${esc(url)}" alt="Photo ${i + 1} de ${esc(nom)}" loading="${i ? 'lazy' : 'eager'}" referrerpolicy="no-referrer">`).join('')}</div>
        ${photos.length > 1 ? `<div class="photos-points" aria-hidden="true">${photos.map((_, i) => `<span${i ? '' : ' class="actif"'}></span>`).join('')}</div>` : ''}
      </div>`
    : `<div class="fiche-banniere marbre-bordeaux cadre-or fiche-banniere-${piste.genre}">
        <svg viewBox="0 0 320 90" aria-hidden="true" class="banniere-dessin">
          ${piste.genre === 'pump'
    ? '<path d="M0 70 C20 70 20 40 40 40 S60 70 80 70 100 40 120 40 140 70 160 70 180 40 200 40 220 70 240 70 260 40 280 40 300 70 320 70"/>'
    : '<path d="M0 72 L40 72 L52 30 L64 30 L70 72 C90 72 92 52 104 52 S118 72 130 72 C150 72 152 50 166 50 S182 72 196 72 L230 72 C250 72 252 56 264 56 S278 72 290 72 L320 72"/><path d="M48 30 V8 M48 9 h22 l-5 7 5 7 h-22" class="drapeau"/>'}
        </svg>
        <span class="banniere-texte">Pas encore de photo</span>
      </div>`;

  const badges = [
    `<span class="badge badge-${piste.genre}">${esc(genre.nom)}</span>`,
    acces ? `<span class="badge badge-acces">${esc(ACCES[acces].texte)}</span>` : '',
    metres != null ? `<span class="badge badge-doux">${esc(texteDistance(metres))}</span>` : '',
  ].join('');

  // Horaires
  const horaires = complement?.horaires
    ? esc(complement.horaires).replace(/\n/g, '<br>')
    : horairesEnFrancais(piste.tags.opening_hours).map(esc).join('<br>');

  // Le tracé
  const lignesTrace = [];
  if (complement?.trace) lignesTrace.push(`<p class="trace-texte">${esc(complement.trace).replace(/\n/g, '<br>')}</p>`);
  const details = [];
  if (piste.longueur) details.push(ligneInfo(PETITES_ICONES.regle, 'Longueur', `environ ${esc(texteDistance(Math.round(piste.longueur)))}`));
  if (revetement(piste.tags)) details.push(ligneInfo(PETITES_ICONES.sol, 'Revêtement', esc(revetement(piste.tags))));
  if (piste.tags.lit === 'yes') details.push(ligneInfo(PETITES_ICONES.lampe, 'Éclairage', 'Éclairée le soir'));

  // Le club
  const siteClub = lienSur(complement?.club_site || '');
  const siteOsm = lienSur(piste.tags.website || piste.tags['contact:website'] || '');
  let club;
  if (complement?.club) {
    club = ligneInfo(PETITES_ICONES.club, 'Club qui s’entraîne ici', esc(complement.club));
  } else if (piste.tags.operator) {
    club = ligneInfo(PETITES_ICONES.club, 'Géré par', esc(piste.tags.operator));
  } else {
    club = '<p class="pas-encore">Pas encore de club indiqué.</p>';
  }
  const site = siteClub || siteOsm;
  if (site) {
    club += ligneInfo(PETITES_ICONES.web, 'Site internet',
      `<a href="${esc(site)}" target="_blank" rel="noopener">${esc(new URL(site).hostname.replace(/^www\./, ''))}</a>`);
  }

  return `
    <button type="button" class="l-retour" id="fiche-retour">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>Toutes les pistes
    </button>
    ${haut}
    <div class="fiche-tete">
      <h1 class="fiche-nom" id="fiche-titre">${esc(nom)}</h1>
      <div class="badges">${badges}</div>
    </div>
    <a class="bouton bouton-principal bouton-or" href="${esc(itineraire)}" target="_blank" rel="noopener">
      <svg class="bouton-icone" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 21 3l-8 18-2-8z"/></svg>Y aller
    </a>

    <section class="fiche-bloc" aria-labelledby="fiche-t-lieu">
      <h2 id="fiche-t-lieu">Le lieu</h2>
      ${ligneInfo(PETITES_ICONES.adresse, 'Adresse', `<span id="fiche-adresse">${adresse ? esc(adresse) : '<span class="pas-encore">On cherche l’adresse…</span>'}</span>`)}
    </section>

    <section class="fiche-bloc" aria-labelledby="fiche-t-horaires">
      <h2 id="fiche-t-horaires">Horaires d’ouverture</h2>
      ${horaires ? ligneInfo(PETITES_ICONES.horloge, 'Ouvert', horaires) : '<p class="pas-encore">Horaires pas encore indiqués.</p>'}
    </section>

    <section class="fiche-bloc" aria-labelledby="fiche-t-acces">
      <h2 id="fiche-t-acces">Public ou privé</h2>
      ${acces ? ligneInfo(PETITES_ICONES.cadenas, ACCES[acces].texte, esc(ACCES[acces].detail)) : '<p class="pas-encore">Pas encore indiqué.</p>'}
      ${piste.tags.fee === 'yes' ? '<p class="info-plus">Entrée payante.</p>' : ''}
    </section>

    <section class="fiche-bloc" aria-labelledby="fiche-t-trace">
      <h2 id="fiche-t-trace">Le tracé</h2>
      <div class="fiche-carte cadre-or" id="fiche-carte" role="img" aria-label="Plan de la piste${piste.traces.length ? ' avec son tracé' : ''}"></div>
      ${lignesTrace.join('')}${details.join('')}
      ${!lignesTrace.length && !details.length ? '<p class="pas-encore">Pas encore de description du tracé.</p>' : ''}
    </section>

    <section class="fiche-bloc" aria-labelledby="fiche-t-club">
      <h2 id="fiche-t-club">Le club</h2>
      ${club}
    </section>

    <section class="fiche-bloc" aria-labelledby="fiche-t-compet">
      <h2 id="fiche-t-compet">Compétitions à venir</h2>
      <div id="fiche-competitions"><p class="pas-encore"><span class="roue" aria-hidden="true"></span>Chargement…</p></div>
    </section>

    <p class="fiche-source">Carte et infos de base : les contributeurs OpenStreetMap${complement ? ', complétées par DBSpeed' : ''}.</p>`;
}

function htmlCompetitions(liste) {
  if (!liste.length) return '<p class="pas-encore">Aucune compétition prévue ici pour l’instant.</p>';
  return `<ul class="competitions">${liste.map((c) => {
    const jour = new Date(`${c.date_debut}T12:00:00`);
    const fin = c.date_fin && c.date_fin !== c.date_debut ? ` au ${dateCourte(c.date_fin)}` : '';
    const lien = lienSur(c.lien || '');
    return `<li class="competition">
        <span class="competition-date" aria-hidden="true">
          <strong>${jour.getDate()}</strong>${esc(jour.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''))}
        </span>
        <span class="competition-textes">
          <span class="competition-nom">${esc(c.nom)}</span>
          <span class="competition-infos">${esc([`Le ${dateCourte(c.date_debut)}${fin}`, c.niveau].filter(Boolean).join(' · '))}</span>
          ${lien ? `<a href="${esc(lien)}" target="_blank" rel="noopener">Infos et inscription</a>` : ''}
        </span>
      </li>`;
  }).join('')}</ul>`;
}

function dessinerMiniCarte(piste) {
  if (etat.miniCarte) { etat.miniCarte.remove(); etat.miniCarte = null; }
  const zone = $('fiche-carte');
  if (!zone || !etat.L) return;
  const L = etat.L;
  const carte = L.map(zone, {
    zoomControl: false, attributionControl: true, scrollWheelZoom: false,
    dragging: !L.Browser.mobile, tap: false, boxZoom: false, keyboard: false,
  });
  carte.attributionControl.setPrefix(false);
  L.tileLayer(FOND_CARTE, { attribution: CREDITS, subdomains: 'abcd', maxZoom: 20 }).addTo(carte);
  const lignes = piste.traces.map((l) => L.polyline(l, { color: '#D4A63A', weight: 5, opacity: 0.95, lineCap: 'round' }));
  L.marker([piste.lat, piste.lon], { icon: iconeRepere(piste.genre), interactive: false, keyboard: false }).addTo(carte);
  if (lignes.length) {
    const groupe = L.featureGroup(lignes).addTo(carte);
    carte.fitBounds(groupe.getBounds(), { padding: [24, 24], maxZoom: 19 });
  } else {
    carte.setView([piste.lat, piste.lon], 17);
  }
  etat.miniCarte = carte;
}

function preparerPhotos() {
  const defile = document.querySelector('.photos-defile');
  if (!defile) return;
  const points = document.querySelectorAll('.photos-points span');
  defile.addEventListener('scroll', () => {
    const i = Math.round(defile.scrollLeft / defile.clientWidth);
    points.forEach((p, j) => p.classList.toggle('actif', i === j));
  }, { passive: true });
  // une photo qui ne s'affiche pas : on l'enlève
  for (const img of defile.querySelectorAll('img')) {
    img.addEventListener('error', () => {
      img.remove();
      if (!defile.querySelector('img')) defile.parentElement.remove();
    });
  }
}

async function ouvrirFiche(id) {
  const vueCarte = $('lieux-vue-carte');
  const fiche = $('lieux-fiche');
  if (!vueCarte.hidden) etat.scrollListe = window.scrollY;
  etat.ficheOuverte = id;
  vueCarte.hidden = true;
  fiche.hidden = false;
  animer(fiche, 'glisse-gauche');
  window.scrollTo(0, 0);

  let piste = null;
  if (!idValide(id)) {
    piste = null;
  } else {
    if (!etat.groupes.get(id)) {
      fiche.innerHTML = '<p class="chargement"><span class="roue" aria-hidden="true"></span>On ouvre la piste…</p>';
    }
    try {
      await chargerLeaflet().then((L) => { etat.L = L; });
      piste = await trouverPiste(id);
    } catch {
      if (etat.ficheOuverte !== id) return;
      fiche.innerHTML = `<button type="button" class="l-retour" id="fiche-retour"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>Toutes les pistes</button>
        <p class="message erreur">Impossible d’ouvrir cette piste pour l’instant. Vérifie ta connexion.</p>`;
      $('fiche-retour').addEventListener('click', retourCarte);
      return;
    }
  }
  if (etat.ficheOuverte !== id) return;
  if (!piste) {
    fiche.innerHTML = `<button type="button" class="l-retour" id="fiche-retour"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>Toutes les pistes</button>
      <div class="vide"><strong>Piste introuvable.</strong>Elle a peut-être été retirée de la carte.</div>`;
    $('fiche-retour').addEventListener('click', retourCarte);
    return;
  }

  let complement = complementConnu(piste);
  fiche.innerHTML = htmlFiche(piste, complement);
  animer(fiche, 'glisse-gauche');
  $('fiche-retour').addEventListener('click', retourCarte);
  preparerPhotos();
  dessinerMiniCarte(piste);

  // Ce qui arrive ensuite (DBSpeed, adresse, compétitions)
  const suite = [];
  if (!complement && configOk) {
    suite.push(complementDe(piste).then((c) => {
      if (c && etat.ficheOuverte === id) {
        complement = c;
        fiche.innerHTML = htmlFiche(piste, complement);
        $('fiche-retour').addEventListener('click', retourCarte);
        preparerPhotos();
        dessinerMiniCarte(piste);
      }
    }).catch(() => {}));
  }
  await Promise.all(suite);

  competitionsDe(piste)
    .then((liste) => { if (etat.ficheOuverte === id && $('fiche-competitions')) $('fiche-competitions').innerHTML = htmlCompetitions(liste); })
    .catch(() => {
      if (etat.ficheOuverte === id && $('fiche-competitions')) {
        $('fiche-competitions').innerHTML = '<p class="pas-encore">Impossible de charger les compétitions pour l’instant.</p>';
      }
    });

  if (!complement?.adresse && !adresseOsm(piste.tags)) {
    const adresse = await communeDe(piste);
    if (etat.ficheOuverte !== id || !$('fiche-adresse')) return;
    $('fiche-adresse').innerHTML = adresse ? esc(adresse) : '<span class="pas-encore">Adresse pas encore indiquée.</span>';
    // la piste sans nom prend le nom de sa commune
    if (!piste.tags.name && !complement?.nom && piste.commune) $('fiche-titre').textContent = nomDe(piste);
  }
}

function retourCarte() {
  if (etat.venuDeLaCarte) history.back();
  else window.location.hash = 'lieux';
}

function animer(el, classe) {
  if (calme) return;
  el.classList.remove('glisse-gauche', 'glisse-droite');
  void el.offsetWidth;
  el.classList.add(classe);
}

function fermerFiche() {
  const fiche = $('lieux-fiche');
  const vueCarte = $('lieux-vue-carte');
  const revient = !fiche.hidden;
  etat.ficheOuverte = null;
  if (etat.miniCarte) { etat.miniCarte.remove(); etat.miniCarte = null; }
  fiche.hidden = true;
  fiche.innerHTML = '';
  vueCarte.hidden = false;
  if (revient) {
    animer(vueCarte, 'glisse-droite');
    requestAnimationFrame(() => window.scrollTo(0, etat.scrollListe));
  }
  return revient;
}

// ---------- Entrée : appelée par accueil.js quand l'onglet Lieux s'affiche ----------

let prepare = false;
let premiereFois = true;
let dejaLocalise = false;

export async function afficherLieux(sous = '') {
  if (!prepare) { preparerRecherche(); prepare = true; }
  if (sous) {
    etat.venuDeLaCarte = !$('lieux-vue-carte').hidden && !premiereFois;
    premiereFois = false;
    return ouvrirFiche(sous);
  }
  etat.venuDeLaCarte = false;
  fermerFiche();
  try {
    await preparerCarte();
  } catch {
    dire('La carte ne se charge pas. Vérifie ta connexion.', 'erreur', () => afficherLieux());
    return;
  }
  // la carte était cachée : elle doit reprendre sa taille
  setTimeout(() => etat.carte.invalidateSize(), calme ? 0 : 360);
  premiereFois = false;
  if (!dejaLocalise) {
    dejaLocalise = true;
    await localiser({ auto: true });
  }
}
