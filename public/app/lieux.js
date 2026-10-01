// Onglet Lieux : carte des pistes de BMX et des pump tracks autour de l'utilisateur,
// barre de recherche (une piste ou une ville), et fiche de chaque piste.
//
// D'où viennent les infos :
// - les pistes et leur forme : OpenStreetMap (carte libre), via le service Overpass ;
// - la recherche d'une ville et l'adresse d'une piste : Nominatim (OpenStreetMap) ;
// - ce que DBSpeed ajoute (horaires, public/privé, tracé, photos, club, compétitions) :
//   tables Supabase `lieux` et `competitions`.
// La carte elle-même (MapLibre, fond détaillé, satellite, icônes) est dans /app/carte.js.
import { supabase, configOk } from '/app/supabase.js';
import { creerGrandeCarte, creerCarteTrace, satelliteDispo } from '/app/carte.js';
import * as osm from '/app/lieux-osm.js';
import { prendrePosition, positionConnue, choixPosition } from '/app/position.js';
import { esc, animer as animerEcran } from '/app/outils.js';

const { sansAccents, distance, idValide } = osm;
// L'API de la carte DBSpeed (netlify/functions/carte.mts) : elle lit OpenStreetMap et garde
// les réponses en cache. Si elle ne répond pas, l'appli lit OpenStreetMap elle-même.
const API = '/api/carte';
const FRANCE = { lat: 46.6, lon: 2.4, zoom: 5 };
const RAYON = 35000;          // on cherche à 35 km autour du point choisi
const MAX_LISTE = 80;         // nombre de pistes dans la liste sous la carte
const GRANDE_ZONE = 0.6;      // au-delà (en degrés), une recherche de ville devient une recherche de toute la zone (pays, région)
const MEMOIRE_CENTRE = 'dbspeed_lieux_centre';

const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);

const etat = {
  carte: null,             // la grande carte (voir carte.js)
  moi: null,               // le point « ma position »
  miniCarte: null,         // la petite carte de la fiche
  groupes: new Map(),      // toutes les pistes déjà vues (id → piste)
  resultats: [],           // les pistes de la dernière recherche (ids)
  complements: new Map(),  // ce que DBSpeed ajoute (id → ligne de la table lieux)
  position: null,          // position de l'utilisateur { lat, lon }
  centre: null,            // centre de la dernière recherche { lat, lon, nom }
  filtre: 'tout',
  texte: '',
  chargement: 0,
  ficheOuverte: null,
  scrollListe: 0,
};

// ---------- Petits outils ----------

// Garde seulement les vraies adresses web (jamais « javascript: »…)
function lienSur(url) {
  try {
    const u = new URL(String(url).trim().startsWith('www.') ? `https://${String(url).trim()}` : String(url).trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch { return null; }
}

function texteDistance(m) {
  if (m == null) return '';
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  if (m < 10000) return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
  return `${Math.round(m / 1000)} km`;
}

function pointDeDepart() {
  // recherche d'un pays entier sans ma position : la distance depuis le milieu du pays ne veut rien dire
  if (etat.position) return etat.position;
  return etat.centre?.zone ? null : etat.centre;
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

// ---------- Les pistes : l'API DBSpeed d'abord, OpenStreetMap en direct en secours ----------

async function demanderApi(action, params) {
  const rep = await fetch(`${API}/${action}?${new URLSearchParams(params)}`, { headers: { Accept: 'application/json' } });
  if (!rep.ok || !(rep.headers.get('content-type') || '').includes('json')) throw new Error(`API ${rep.status}`);
  return rep.json();
}

// Toute une zone [sud, ouest, nord, est] : un pays, une région (arrondie comme l'API)
const arrondirZone = (zone) => zone.map((x) => osm.arrondir(x, osm.DECIMALES_ZONE));
async function pistesDansZone(zone) {
  const z = arrondirZone(zone);
  try {
    return (await demanderApi('lieux', { zone: z.join(',') })).lieux;
  } catch {
    return osm.pistesDansZone(z);
  }
}

// On arrondit le point (≈ 1 km) et le rayon comme l'API : deux personnes proches reçoivent
// la même réponse, déjà en cache (sinon l'API renverrait vers l'adresse arrondie).
async function pistesAutour(lat, lon, rayon) {
  const point = { lat: osm.arrondir(lat, osm.DECIMALES_ZONE), lon: osm.arrondir(lon, osm.DECIMALES_ZONE) };
  const r = osm.rayonPermis(rayon);
  try {
    return (await demanderApi('lieux', { ...point, rayon: r })).lieux;
  } catch {
    return osm.pistesAutour(point.lat, point.lon, r);
  }
}

async function pisteParId(id) {
  try {
    return (await demanderApi('lieu', { id })).lieu;
  } catch {
    return osm.pisteParId(id);
  }
}

async function chercherEndroit(texte) {
  try {
    // écrite comme l'API l'attend (minuscules, espaces simples) : pas de détour par une redirection
    return (await demanderApi('recherche', { q: texte.trim().replace(/\s+/g, ' ').toLowerCase() })).resultat;
  } catch {
    return osm.chercherEndroit(texte);
  }
}

async function adresseDuPoint(lat, lon) {
  // ≈ 10 m, comme l'API (sinon elle renverrait vers l'adresse arrondie)
  const point = { lat: osm.arrondir(lat, osm.DECIMALES_ADRESSE), lon: osm.arrondir(lon, osm.DECIMALES_ADRESSE) };
  try {
    return await demanderApi('adresse', point);
  } catch {
    return osm.adresseDuPoint(point.lat, point.lon);
  }
}

// ---------- Ce que DBSpeed ajoute (Supabase) ----------

function zoneAutour(lat, lon, rayon) {
  const dLat = rayon / 111000;
  const dLon = rayon / (111000 * Math.cos((lat * Math.PI) / 180));
  return [lat - dLat, lon - dLon, lat + dLat, lon + dLon];
}

// Les lieux de la base (DBSpeed + recensement officiel), par paquets de 1000 (limite de Supabase)
async function complementsDansZone([sud, ouest, nord, est]) {
  if (!configOk) return [];
  const tous = [];
  for (let debut = 0; debut < 6000; debut += 1000) {
    const { data, error } = await supabase.from('lieux').select('*')
      .gte('latitude', sud).lte('latitude', nord)
      .gte('longitude', ouest).lte('longitude', est)
      .order('id')
      .range(debut, debut + 999);
    if (error) throw error;
    tous.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return tous;
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
    // la ville, prise dans l'adresse (« …, 33700 Mérignac »)
    commune: (String(ligne.adresse || '').match(/\b\d{4,5}\s+([^,]+)$/) || [])[1] || '',
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
  // « 1er oct. 2026 » (le français écrit 1er pour le premier jour du mois)
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/^1 /, '1er ');
}

// ---------- La carte ----------

async function preparerCarte() {
  if (etat.carte) return etat.carte.pret;
  const depart = centreRetenu() || FRANCE;
  etat.carte = await creerGrandeCarte($('lieux-carte'), {
    centre: depart,
    zoom: depart.zoom || 11,
    quand: {
      toucherPiste: (id) => { window.vibrer?.('leger'); ouvrirRepere(id, { bouger: false }); },
      // Si l'utilisateur déplace la carte loin de la dernière recherche : on propose de chercher là
      bouge: (auto) => {
        if (auto) return;
        const loin = !etat.centre || distance(etat.centre, etat.carte.centre()) > RAYON * 0.4;
        // on a dézoomé pour voir plus large qu'une recherche de 35 km : on propose aussi de chercher
        const plusLarge = etat.centre && !etat.centre.zone && etat.carte.zoom() < 9;
        window.montrer($('lieux-zone'), (loin || plusLarge) && etat.carte.zoom() >= 5.5);
      },
    },
  });
  $('lieux-satellite').hidden = !satelliteDispo;
  return etat.carte.pret;
}

function dessinerRepereMoi() {
  if (!etat.carte || !etat.position) return;
  const point = [etat.position.lon, etat.position.lat];
  if (etat.moi) { etat.moi.setLngLat(point); return; }
  const el = document.createElement('span');
  el.className = 'moi';
  el.setAttribute('aria-label', 'Ma position');
  etat.moi = new etat.carte.ml.Marker({ element: el, anchor: 'center' }).setLngLat(point).addTo(etat.carte.carte);
}

// ---------- Position de l'utilisateur ----------

// La position vient de position.js (partagée par toute l'appli, demandée au tuto)
async function demanderPosition({ auto }) {
  // déjà connue et récente (l'appli l'a prise à l'ouverture) : pas besoin de redemander
  const connue = positionConnue({ fraiche: true });
  if (auto && connue) return { lat: connue.lat, lon: connue.lon };
  // la personne a dit non à la localisation : on ne redemande pas tout seul
  if (auto && choixPosition() === false) return { erreur: 'non' };
  const rep = await prendrePosition();
  return rep.etat === 'ok' ? { lat: rep.position.lat, lon: rep.position.lon } : { erreur: rep.etat };
}

// Quand l'appli reçoit une nouvelle position (ouverture, retour dans l'appli) : le point bouge sur la carte
window.addEventListener('dbspeed:position', (e) => {
  if (!e.detail) { etat.position = null; etat.moi?.remove(); etat.moi = null; return; }
  etat.position = { lat: e.detail.lat, lon: e.detail.lon };
  dessinerRepereMoi();
});

async function localiser({ auto = false } = {}) {
  const bouton = $('lieux-ici');
  bouton.classList.add('cherche');
  dire(auto ? 'On cherche où tu es…' : 'On te localise…', 'attente');
  const rep = await demanderPosition({ auto });
  bouton.classList.remove('cherche');
  if (rep.erreur) {
    const deja = centreRetenu();
    if (rep.erreur === 'non') {
      dire(deja
        ? 'Ta position est désactivée : voici ta dernière recherche. Touche le bouton viseur pour te localiser.'
        : 'Ta position est désactivée. Cherche une ville ou une piste, ou touche le bouton viseur pour te localiser.', 'info');
    } else if (rep.erreur === 'refusee') {
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

// zone (facultative) = [sud, ouest, nord, est] : on cherche dans toute la zone (pays, région, carte visible)
async function chercherIci(lat, lon, nomLieu, idAOuvrir = null, zone = null) {
  const numero = ++etat.chargement;
  etat.centre = { lat, lon, nom: nomLieu, zone };
  window.montrer($('lieux-zone'), false);
  etat.carte.fermerBulle();
  if (zone) etat.carte.cadrer([[zone[1], zone[0]], [zone[3], zone[2]]], 13);
  else etat.carte.allerA(lon, lat, 11);
  const ou = nomLieu ? `${zone ? 'en' : 'autour de'} ${nomLieu}` : 'autour de toi';
  dire(`On cherche les pistes ${ou}…`, 'attente');
  $('lieux-liste').classList.add('en-charge');

  let pistes;
  try {
    // un très grand pays (ex. la France) : trop lourd pour OpenStreetMap en direct,
    // on montre seulement les lieux de la base (recensement officiel + lieux DBSpeed)
    if (zone && !osm.zoneValide(arrondirZone(zone))) pistes = [];
    else pistes = zone ? await pistesDansZone(zone) : await pistesAutour(lat, lon, RAYON);
  } catch {
    if (numero !== etat.chargement) return;
    $('lieux-liste').classList.remove('en-charge');
    dire('Impossible de charger les pistes pour l’instant. Vérifie ta connexion.', 'erreur',
      () => chercherIci(lat, lon, nomLieu, idAOuvrir, zone));
    return;
  }
  // Les lieux complétés ou ajoutés par DBSpeed : s'ils ne viennent pas, la carte marche quand même
  let complements = [];
  try { complements = await complementsDansZone(zone || zoneAutour(lat, lon, RAYON)); } catch { /* rien */ }
  if (numero !== etat.chargement) return;

  for (const c of complements) etat.complements.set(c.id, c);
  const connus = new Set(pistes.flatMap((p) => p.ids));
  for (const c of complements) {
    if (connus.has(c.id) || !Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) continue;
    // une piste de la base qui est déjà sur la carte OpenStreetMap (à moins de 250 m) : on la fusionne
    const point = { lat: c.latitude, lon: c.longitude };
    const meme = pistes.find((p) => p.genre === (c.genre || 'bmx') && distance(p, point) < 250);
    if (meme) meme.ids.push(c.id);
    else pistes.push(pisteDepuisComplement(c));
  }
  for (const p of pistes) etat.groupes.set(p.id, p);
  etat.resultats = pistes.map((p) => p.id);
  if (!zone) retenirCentre({ lat, lon, nom: nomLieu, zoom: 11 });
  $('lieux-liste').classList.remove('en-charge');
  afficherResultats();

  const trouvee = idAOuvrir && pistes.find((p) => p.ids.includes(idAOuvrir));
  if (trouvee) {
    ouvrirRepere(trouvee.id);
  } else if (!zone) {
    // on cadre la carte sur le point de départ et les pistes les plus proches
    const proches = pistesVisibles().slice(0, 6).map(({ piste }) => [piste.lon, piste.lat]);
    if (proches.length) etat.carte.cadrer([[lon, lat], ...proches], 13);
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
    .sort((a, b) => (a.metres == null || b.metres == null
      ? nomDe(a.piste).localeCompare(nomDe(b.piste), 'fr')
      : a.metres - b.metres));
}

function afficherResultats() {
  const visibles = pistesVisibles();

  // Les épingles sur la carte (dessinées dans la carte : elles bougent avec elle)
  etat.carte.mettrePistes(visibles.map(({ piste }) => ({ id: piste.id, genre: piste.genre, lat: piste.lat, lon: piste.lon, nom: nomDe(piste) })));

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
  const ou = etat.centre?.nom ? `${etat.centre.zone ? 'en' : 'autour de'} ${etat.centre.nom}` : 'autour de toi';
  if (etat.texte && !total) {
    dire(`Aucune piste « ${etat.texte} » ici. Appuie sur Rechercher pour chercher ce nom ou cette ville ailleurs.`, 'info');
  } else if (!total) {
    const quoi = etat.filtre === 'pump' ? 'pump track' : etat.filtre === 'bmx' ? 'piste de BMX' : 'piste';
    dire(`Aucune ${quoi} trouvée ${ou}${etat.centre?.zone ? '' : ' (35 km)'}. Déplace la carte ou cherche une autre ville.`, 'info');
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

function ouvrirRepere(id, { bouger = true } = {}) {
  const piste = etat.groupes.get(id);
  if (!piste) return;
  const depart = pointDeDepart();
  etat.carte.choisir(id);
  if (bouger) etat.carte.allerA(piste.lon, piste.lat, Math.max(etat.carte.zoom(), 14));
  etat.carte.ouvrirBulle(piste.lon, piste.lat, contenuBulle(piste, depart ? distance(depart, piste) : null));
}

// ---------- Barre de recherche ----------

async function chercherAilleurs(texte) {
  dire(`On cherche « ${texte} »…`, 'attente');
  let resultat = null;
  try {
    resultat = await chercherEndroit(texte);
  } catch {
    dire('La recherche ne répond pas pour l’instant. Vérifie ta connexion et réessaie.', 'erreur');
    return;
  }
  if (!resultat) {
    dire(`Rien trouvé pour « ${texte} ». Essaie avec le nom d’une ville.`, 'erreur');
    return;
  }
  // on enlève le texte : il a servi à trouver l'endroit, plus à filtrer la liste
  etat.texte = '';
  $('lieux-champ').value = '';
  window.montrer($('lieux-effacer'), false);
  let z = resultat.zone;
  // un pays avec des territoires très loin (ex. la France et l'outre-mer) : on garde le pays autour de son centre
  if (z && (z[2] - z[0] > 20 || z[3] - z[1] > 20)) z = [resultat.lat - 6, resultat.lon - 9, resultat.lat + 6, resultat.lon + 9];
  const grande = z && (z[2] - z[0] > GRANDE_ZONE || z[3] - z[1] > GRANDE_ZONE);
  await chercherIci(resultat.lat, resultat.lon, resultat.nom, resultat.id, grande ? z : null);
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
      etat.carte.cadrer(visibles.map(({ piste }) => [piste.lon, piste.lat]), 14);
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
    const c = etat.carte.centre();
    const b = etat.carte.bornes();
    const large = b[2] - b[0] > GRANDE_ZONE || b[3] - b[1] > GRANDE_ZONE;
    chercherIci(c.lat, c.lon, 'cette zone', null, large ? b : null);
  });

  // Plan ↔ satellite (seulement avec la clé MapTiler)
  $('lieux-satellite').addEventListener('click', () => {
    const satellite = etat.carte.mode !== 'satellite';
    etat.carte.changerMode(satellite ? 'satellite' : 'plan');
    $('lieux-satellite').setAttribute('aria-pressed', String(satellite));
    $('lieux-satellite').querySelector('span').textContent = satellite ? 'Plan' : 'Satellite';
  });
}

// ---------- La fiche d'une piste ----------

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
  // Lien ouvert directement (page rechargée…) : on demande cette piste
  const piste = await pisteParId(id);
  if (piste) etat.groupes.set(piste.id, piste);
  return piste;
}

async function communeDe(piste) {
  if (piste.adresseTrouvee !== undefined) return piste.adresseTrouvee;
  try {
    const { ville, adresse } = await adresseDuPoint(piste.lat, piste.lon);
    piste.commune = ville || '';
    piste.adresseTrouvee = adresse || null;
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

// Note DBSpeed sur 20 (calculée par outils/lieux-france.py avec la fiche officielle Data ES)
const NOTE_CRITERES = {
  bmx: [['longueur', 'Longueur de la piste', 4], ['sol', 'Sol', 4], ['eclairage', 'Éclairage', 3], ['confort', 'Vestiaires, toilettes, douches', 3],
    ['recente', 'Piste récente ou refaite', 3], ['competition', 'Homologation et tribune', 2], ['acces_libre', 'Accès libre', 1]],
  pump: [['taille', 'Taille', 6], ['sol', 'Sol', 5], ['eclairage', 'Éclairage', 3], ['acces_libre', 'Accès libre', 3], ['recente', 'Récent', 3]],
};

function htmlNote(complement) {
  const note = complement?.note;
  if (!Number.isFinite(note)) return '';
  const criteres = NOTE_CRITERES[complement.genre] || NOTE_CRITERES.bmx;
  const detail = complement.note_detail || {};
  const lignes = criteres.map(([cle, texte, max]) => {
    const pts = Number.isFinite(detail[cle]) ? detail[cle] : 0;
    return `<li><span>${esc(texte)}</span><span class="note-barre" aria-hidden="true"><i style="width:${Math.round((pts / max) * 100)}%"></i></span><b>${pts}/${max}</b></li>`;
  }).join('');
  return `<section class="fiche-bloc" aria-labelledby="fiche-t-note">
      <h2 id="fiche-t-note">Note DBSpeed</h2>
      <p class="note-totale"><b class="or-brillant">${note}</b><span>/20</span></p>
      <ul class="note-criteres">${lignes}</ul>
      <p class="info-plus">Calculée avec la fiche officielle du ministère des Sports. Une info pas remplie compte 0 point.</p>
    </section>`;
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

    ${htmlNote(complement)}

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

    ${complement?.sources?.length ? `<section class="fiche-bloc" aria-labelledby="fiche-t-sources">
      <h2 id="fiche-t-sources">Sources</h2>
      <ul class="fiche-sources">${complement.sources.map((x) => {
        const url = lienSur(x.url);
        return url ? `<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(x.nom || new URL(url).hostname)}</a></li>` : '';
      }).join('')}</ul>
    </section>` : ''}

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

async function dessinerMiniCarte(piste) {
  if (etat.miniCarte) { etat.miniCarte.remove(); etat.miniCarte = null; }
  const zone = $('fiche-carte');
  if (!zone) return;
  try {
    const carte = await creerCarteTrace(zone, piste);
    // la fiche a peut-être changé pendant le chargement
    if (!document.body.contains(zone)) { carte.remove(); return; }
    etat.miniCarte = carte;
  } catch {
    zone.innerHTML = '<p class="pas-encore carte-absente">La carte ne se charge pas pour l’instant.</p>';
  }
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
  if (!calme) animerEcran(el, classe);
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
  setTimeout(() => etat.carte.taille(), calme ? 0 : 360);
  premiereFois = false;
  if (!dejaLocalise) {
    dejaLocalise = true;
    await localiser({ auto: true });
  }
}
