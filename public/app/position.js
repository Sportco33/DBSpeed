// La position de l'utilisateur, pour toute l'appli.
//
// - Demandée une fois, pendant le tuto de la première connexion (ou depuis Mon profil).
// - Le CHOIX (oui / non) est enregistré dans le profil (colonne profils.localisation) :
//   il suit la personne sur tous ses téléphones.
// - La POSITION elle-même reste sur le téléphone (localStorage) : elle n'est jamais envoyée
//   dans la base. On ne garde que la dernière, avec sa ville.
// - À chaque ouverture de l'appli, si la personne a dit oui, on reprend sa position tout de suite.
//
// Les autres écrans écoutent l'évènement « dbspeed:position » (detail = { lat, lon, ville, quand }).
import * as osm from '/app/lieux-osm.js';

const MEMOIRE = 'dbspeed_position';
const FRAICHE = 5 * 60 * 1000;   // une position de moins de 5 minutes est encore bonne

let derniere = lire();
let choix = null;   // le choix du profil : null (pas demandé), true, false

export function retenirChoix(valeur) { choix = valeur; }
export function choixPosition() { return choix; }
let enCours = null;

function lire() {
  try {
    const p = JSON.parse(localStorage.getItem(MEMOIRE) || 'null');
    return p && Number.isFinite(p.lat) && Number.isFinite(p.lon) ? p : null;
  } catch { return null; }
}

function garder(p) {
  derniere = p;
  try { localStorage.setItem(MEMOIRE, JSON.stringify(p)); } catch { /* navigation privée : tant pis */ }
  window.dispatchEvent(new CustomEvent('dbspeed:position', { detail: p }));
}

export function oublierPosition() {
  derniere = null;
  try { localStorage.removeItem(MEMOIRE); } catch { /* rien */ }
  window.dispatchEvent(new CustomEvent('dbspeed:position', { detail: null }));
}

// La dernière position connue (ou null). `fraiche` : seulement si elle a moins de 5 minutes.
export function positionConnue({ fraiche = false } = {}) {
  if (!derniere) return null;
  if (fraiche && Date.now() - derniere.quand > FRAICHE) return null;
  return derniere;
}

// Le nom de la ville, par l'API de la carte (secours : OpenStreetMap directement)
async function villeDe(lat, lon) {
  const point = { lat: lat.toFixed(3), lon: lon.toFixed(3) };   // arrondi ≈ 100 m : suffisant pour une ville
  try {
    const rep = await fetch(`/api/carte/adresse?${new URLSearchParams(point)}`, { headers: { Accept: 'application/json' } });
    if (!rep.ok || !(rep.headers.get('content-type') || '').includes('json')) throw new Error('API');
    return (await rep.json()).ville || '';
  } catch {
    try { return (await osm.adresseDuPoint(Number(point.lat), Number(point.lon))).ville || ''; } catch { return ''; }
  }
}

// Demande la position au téléphone.
// Renvoie { etat: 'ok', position } ou { etat: 'refusee' | 'introuvable' | 'absente' }.
export function prendrePosition() {
  if (enCours) return enCours;
  enCours = new Promise((ok) => {
    if (!navigator.geolocation) { ok({ etat: 'absente' }); return; }
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const position = {
          lat: p.coords.latitude, lon: p.coords.longitude,
          ville: derniere && Math.abs(derniere.lat - p.coords.latitude) < 0.01 && Math.abs(derniere.lon - p.coords.longitude) < 0.01
            ? derniere.ville : '',
          quand: Date.now(),
        };
        garder(position);
        ok({ etat: 'ok', position });
        // la ville arrive un peu après (elle n'est pas nécessaire pour la carte)
        if (!position.ville) {
          const ville = await villeDe(position.lat, position.lon);
          if (ville && derniere === position) garder({ ...position, ville });
        }
      },
      (e) => ok({ etat: e.code === 1 ? 'refusee' : 'introuvable' }),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
    );
  }).finally(() => { enCours = null; });
  return enCours;
}

// À l'ouverture de l'appli (si la personne a dit oui) : on reprend la position,
// puis à chaque retour dans l'appli après plus de 5 minutes.
let suivi = false;
export function suivrePosition() {
  prendrePosition();
  if (suivi) return;
  suivi = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !positionConnue({ fraiche: true })) prendrePosition();
  });
}
