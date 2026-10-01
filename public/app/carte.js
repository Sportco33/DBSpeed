// La carte de l'onglet Lieux (MapLibre GL) : fond de carte détaillé, satellite, icônes des pistes.
//
// Les icônes sont dessinées DANS la carte (calques « symbol ») : elles restent collées à leur
// endroit quand on fait glisser, zoome ou tourne la carte, image par image.
//
// Fond de carte :
// - avec une clé MapTiler (variable Netlify MAPTILER_KEY → config.js) : plan détaillé
//   « streets-v2 » + vue satellite « hybrid » (photo aérienne avec les noms) ;
// - sans clé : plan détaillé OpenFreeMap « liberty » (gratuit, sans compte), pas de satellite.
const VERSION = '6.11.2';
const CDN = `https://cdn.jsdelivr.net/npm/maplibre-gl@${VERSION}/dist`;

const cle = (window.DBSPEED_CONFIG || {}).maptilerKey || '';
export const satelliteDispo = Boolean(cle);

export function urlStyle(mode) {
  if (cle) {
    const nom = mode === 'satellite' ? 'hybrid' : 'streets-v2';
    return `https://api.maptiler.com/maps/${nom}/style.json?key=${encodeURIComponent(cle)}`;
  }
  return 'https://tiles.openfreemap.org/styles/liberty';
}

const POLICE = ['Noto Sans Bold'];

// ---------- Charger MapLibre (seulement à l'ouverture de l'onglet) ----------

let promesse = null;
export function chargerCarte() {
  if (!promesse) {
    promesse = (async () => {
      if (!document.querySelector('link[data-maplibre]')) {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = `${CDN}/maplibre-gl.css`;
        css.dataset.maplibre = '';
        document.head.append(css);
      }
      return import(`${CDN}/maplibre-gl.mjs`);
    })().catch((err) => { promesse = null; throw err; });
  }
  return promesse;
}

// ---------- Les icônes (dessinées une fois, en haute définition) ----------

const PICTOS = {
  bmx: '<path d="M3 18c2.5 0 3-5 6-5s3.5 5 6 5 3-8 6-8"/><path d="M5 9.5V3"/><path d="M5 3.5h6l-1.4 2.3L11 8.2H5"/>',
  pump: '<path d="M2 13c2 0 2-4 4-4s2 4 4 4 2-4 4-4 2 4 4 4 2-4 4-4"/><path d="M2 18.5h20"/>',
};

function svgEpingle(genre, grand = false) {
  const or = genre === 'bmx';
  const corps = or
    ? '<linearGradient id="c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1C4"/><stop offset=".28" stop-color="#E2C06E"/><stop offset=".55" stop-color="#D4A63A"/><stop offset=".8" stop-color="#9A7228"/><stop offset="1" stop-color="#E2C06E"/></linearGradient>'
    : '<linearGradient id="c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B06B77"/><stop offset=".45" stop-color="#5C2A33"/><stop offset="1" stop-color="#2A1217"/></linearGradient>';
  const bord = or ? '#5E4518' : '#E2C06E';
  const disque = or ? '#14241F' : '#2A1217';
  const picto = or ? '#E2C06E' : '#F2DFAE';
  const halo = grand ? '<circle cx="40" cy="34" r="31" fill="#FBF5E6" fill-opacity=".35"/>' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="96" viewBox="0 0 80 96">
    <defs>${corps}
      <radialGradient id="o" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
      <linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
    </defs>
    <ellipse cx="40" cy="90" rx="13" ry="4.5" fill="url(#o)"/>
    ${halo}
    <path d="M40 89 C33 75 13 61 13 37 A27 27 0 1 1 67 37 C67 61 47 75 40 89 Z" fill="url(#c)" stroke="${bord}" stroke-width="3"/>
    <path d="M40 13 A24 24 0 0 0 16.5 32 C24 26 56 26 63.5 32 A24 24 0 0 0 40 13 Z" fill="url(#r)"/>
    <circle cx="40" cy="37" r="17" fill="${disque}" stroke="${or ? '#FFF6D8' : '#D4A63A'}" stroke-width="2" stroke-opacity=".9"/>
    <g transform="translate(26.8 23.8) scale(1.1)" fill="none" stroke="${picto}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${PICTOS[genre]}</g>
  </svg>`;
}

function svgGroupe() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="0 0 88 88">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1C4"/><stop offset=".35" stop-color="#E2C06E"/><stop offset=".6" stop-color="#D4A63A"/><stop offset="1" stop-color="#9A7228"/></linearGradient></defs>
    <circle cx="44" cy="44" r="41" fill="#14241F" fill-opacity=".35"/>
    <circle cx="44" cy="44" r="34" fill="url(#g)" stroke="#5E4518" stroke-width="3"/>
    <circle cx="44" cy="44" r="27" fill="none" stroke="#FFF6D8" stroke-opacity=".7" stroke-width="2"/>
  </svg>`;
}

function image(svg) {
  return new Promise((ok, pasOk) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = pasOk;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

let images = null;
function preparerImages() {
  if (!images) {
    images = Promise.all([
      image(svgEpingle('bmx')), image(svgEpingle('pump')),
      image(svgEpingle('bmx', true)), image(svgEpingle('pump', true)), image(svgGroupe()),
    ]).then(([bmx, pump, bmxOn, pumpOn, groupe]) => ({
      'epingle-bmx': bmx, 'epingle-pump': pump, 'epingle-bmx-on': bmxOn, 'epingle-pump-on': pumpOn, groupe,
    }));
  }
  return images;
}

async function ajouterImages(carte) {
  const liste = await preparerImages();
  for (const [nom, img] of Object.entries(liste)) {
    if (!carte.hasImage(nom)) carte.addImage(nom, img, { pixelRatio: 2 });
  }
}

// Le logo MapTiler doit être visible quand on utilise leur carte (offre gratuite)
function logoMapTiler(conteneur) {
  if (!cle || conteneur.querySelector('.logo-maptiler')) return;
  const a = document.createElement('a');
  a.className = 'logo-maptiler';
  a.href = 'https://www.maptiler.com';
  a.target = '_blank';
  a.rel = 'noopener';
  a.innerHTML = '<img src="https://api.maptiler.com/resources/logo.svg" alt="MapTiler" width="67" height="20">';
  conteneur.append(a);
}

// ---------- La grande carte, avec toutes les pistes ----------

const VIDE = { type: 'FeatureCollection', features: [] };

// Crée la carte. `quand` reçoit les actions de l'utilisateur (toucher une piste…)
export async function creerGrandeCarte(conteneur, { centre, zoom, quand }) {
  const ml = await chargerCarte();
  const carte = new ml.Map({
    container: conteneur,
    style: urlStyle('plan'),
    center: [centre.lon, centre.lat],
    zoom,
    attributionControl: { compact: true },
    maxPitch: 60,
    dragRotate: true,
    locale: {
      'NavigationControl.ZoomIn': 'Zoomer',
      'NavigationControl.ZoomOut': 'Dézoomer',
      'NavigationControl.ResetBearing': 'Remettre le nord en haut',
    },
  });
  carte.addControl(new ml.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right');
  logoMapTiler(conteneur);

  const etat = { ml, carte, donnees: VIDE, selection: '', mode: 'plan', bulle: null, quand };

  // À chaque (re)chargement du fond (plan ↔ satellite), on remet nos icônes par-dessus
  carte.on('style.load', async () => {
    await ajouterImages(carte);
    installerPistes(etat);
  });

  carte.on('click', 'pistes-icones', (e) => {
    const f = e.features?.[0];
    if (f) quand.toucherPiste(f.properties.id);
  });
  carte.on('click', 'pistes-groupes', async (e) => {
    const f = e.features?.[0];
    if (!f) return;
    window.vibrer?.('leger');
    const zoomGroupe = await carte.getSource('pistes').getClusterExpansionZoom(f.properties.cluster_id);
    carte.easeTo({ center: f.geometry.coordinates, zoom: zoomGroupe + 0.5, duration: 450 }, { auto: true });
  });
  for (const calque of ['pistes-icones', 'pistes-groupes']) {
    carte.on('mouseenter', calque, () => { carte.getCanvas().style.cursor = 'pointer'; });
    carte.on('mouseleave', calque, () => { carte.getCanvas().style.cursor = ''; });
  }
  carte.on('moveend', (e) => quand.bouge?.(Boolean(e.auto)));

  return {
    carte,
    ml,
    pret: new Promise((ok) => { if (carte.isStyleLoaded()) ok(); else carte.once('load', ok); }),
    mettrePistes(pistes) {
      etat.donnees = {
        type: 'FeatureCollection',
        features: pistes.map((p) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
          properties: { id: p.id, genre: p.genre, nom: p.nom },
        })),
      };
      carte.getSource('pistes')?.setData(etat.donnees);
    },
    choisir(id) {
      etat.selection = id || '';
      appliquerSelection(etat);
    },
    ouvrirBulle(lon, lat, contenu) {
      etat.bulle?.remove();
      etat.bulle = new ml.Popup({ closeButton: false, className: 'bulle-piste', maxWidth: '260px', offset: [0, -44], focusAfterOpen: false })
        .setLngLat([lon, lat]).setDOMContent(contenu).addTo(carte);
      etat.bulle.on('close', () => { if (etat.selection) { etat.selection = ''; appliquerSelection(etat); } });
    },
    fermerBulle() { etat.bulle?.remove(); etat.bulle = null; },
    changerMode(mode) {
      if (mode === etat.mode) return;
      etat.mode = mode;
      carte.setStyle(urlStyle(mode), { diff: false });
    },
    get mode() { return etat.mode; },
    // déplacements faits par l'appli (pas par le doigt) : marqués « auto »
    allerA(lon, lat, zoom) {
      carte.flyTo({ center: [lon, lat], zoom, duration: 900, essential: false }, { auto: true });
    },
    cadrer(points, maxZoom = 13) {
      if (!points.length) return;
      const zone = new ml.LngLatBounds(points[0], points[0]);
      for (const p of points) zone.extend(p);
      carte.fitBounds(zone, { padding: { top: 70, bottom: 60, left: 50, right: 70 }, maxZoom, duration: 800, essential: false }, { auto: true });
    },
    centre() { const c = carte.getCenter(); return { lat: c.lat, lon: c.lng }; },
    zoom() { return carte.getZoom(); },
    taille() { carte.resize(); },
  };
}

function installerPistes(etat) {
  const { carte } = etat;
  if (carte.getSource('pistes')) return;
  const surSatellite = etat.mode === 'satellite';
  carte.addSource('pistes', {
    type: 'geojson',
    data: etat.donnees,
    cluster: true,
    clusterMaxZoom: 10,
    clusterRadius: 44,
  });
  // Les groupes (quand on voit de loin) : une pièce d'or avec le nombre de pistes
  carte.addLayer({
    id: 'pistes-groupes',
    type: 'symbol',
    source: 'pistes',
    filter: ['has', 'point_count'],
    layout: {
      'icon-image': 'groupe',
      'icon-size': ['interpolate', ['linear'], ['get', 'point_count'], 2, 0.9, 20, 1.15, 100, 1.35],
      'icon-allow-overlap': true,
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': POLICE,
      'text-size': 15,
      'text-allow-overlap': true,
    },
    paint: { 'text-color': '#14241F' },
  });
  // Le nom de la piste, sous l'icône, quand on est assez près
  carte.addLayer({
    id: 'pistes-noms',
    type: 'symbol',
    source: 'pistes',
    filter: ['!', ['has', 'point_count']],
    minzoom: 11.5,
    layout: {
      'text-field': ['get', 'nom'],
      'text-font': POLICE,
      'text-size': ['interpolate', ['linear'], ['zoom'], 12, 11.5, 16, 14],
      'text-anchor': 'top',
      'text-offset': [0, 0.5],
      'text-max-width': 9,
      'text-optional': true,
    },
    paint: {
      'text-color': surSatellite ? '#FBF5E6' : '#14241F',
      'text-halo-color': surSatellite ? '#14241F' : '#FBF5E6',
      'text-halo-width': 1.6,
      'text-halo-blur': 0.4,
    },
  });
  // Les épingles : dorée = piste de BMX, bordeaux = pump track
  carte.addLayer({
    id: 'pistes-icones',
    type: 'symbol',
    source: 'pistes',
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': ['case', ['==', ['get', 'genre'], 'pump'], 'epingle-pump', 'epingle-bmx'],
      'icon-anchor': 'bottom',
      'icon-offset': [0, 2],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 13, 1, 17, 1.15],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'symbol-sort-key': ['case', ['==', ['get', 'genre'], 'bmx'], 1, 0],
    },
  });
  // L'épingle choisie : plus grande, avec un halo, au-dessus des autres
  carte.addLayer({
    id: 'pistes-choisie',
    type: 'symbol',
    source: 'pistes',
    filter: ['==', ['get', 'id'], '__aucune__'],
    layout: {
      'icon-image': ['case', ['==', ['get', 'genre'], 'pump'], 'epingle-pump-on', 'epingle-bmx-on'],
      'icon-anchor': 'bottom',
      'icon-offset': [0, 2],
      'icon-size': 1.3,
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  });
  appliquerSelection(etat);
}

function appliquerSelection(etat) {
  const { carte } = etat;
  if (!carte.getLayer('pistes-choisie')) return;
  carte.setFilter('pistes-choisie', ['==', ['get', 'id'], etat.selection || '__aucune__']);
  carte.setFilter('pistes-icones', etat.selection
    ? ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'id'], etat.selection]]
    : ['!', ['has', 'point_count']]);
}

// ---------- La petite carte de la fiche (le tracé) ----------

export async function creerCarteTrace(conteneur, piste) {
  const ml = await chargerCarte();
  const mode = satelliteDispo ? 'satellite' : 'plan';
  const carte = new ml.Map({
    container: conteneur,
    style: urlStyle(mode),
    center: [piste.lon, piste.lat],
    zoom: 17,
    attributionControl: { compact: true },
    cooperativeGestures: true,
    locale: {
      'CooperativeGesturesHandler.MobileHelpText': 'Utilise deux doigts pour bouger la carte',
      'CooperativeGesturesHandler.WindowsHelpText': 'Ctrl + molette pour zoomer',
      'CooperativeGesturesHandler.MacHelpText': '⌘ + molette pour zoomer',
    },
  });
  logoMapTiler(conteneur);
  const lignes = {
    type: 'FeatureCollection',
    features: piste.traces.map((l) => ({
      type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: l.map(([lat, lon]) => [lon, lat]) },
    })),
  };
  carte.on('style.load', async () => {
    await ajouterImages(carte);
    carte.addSource('trace', { type: 'geojson', data: lignes });
    carte.addSource('point', {
      type: 'geojson',
      data: { type: 'Feature', properties: { genre: piste.genre }, geometry: { type: 'Point', coordinates: [piste.lon, piste.lat] } },
    });
    // le tracé en or, avec une lueur
    carte.addLayer({ id: 'trace-lueur', type: 'line', source: 'trace', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#E2C06E', 'line-width': 12, 'line-opacity': 0.35, 'line-blur': 5 } });
    carte.addLayer({ id: 'trace-bord', type: 'line', source: 'trace', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#5E4518', 'line-width': 6.5 } });
    carte.addLayer({ id: 'trace', type: 'line', source: 'trace', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#E2C06E', 'line-width': 4 } });
    carte.addLayer({ id: 'point', type: 'symbol', source: 'point', layout: {
      'icon-image': piste.genre === 'pump' ? 'epingle-pump' : 'epingle-bmx',
      'icon-anchor': 'bottom', 'icon-allow-overlap': true,
    } });
  });
  if (piste.traces.length) {
    const zone = new ml.LngLatBounds();
    for (const l of piste.traces) for (const [lat, lon] of l) zone.extend([lon, lat]);
    carte.fitBounds(zone, { padding: 30, maxZoom: 18.5, duration: 0 });
  }
  return carte;
}
