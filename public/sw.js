// DBSpeed — service worker.
// Rôle : rendre l'appli installable et la faire marcher même sans réseau.
// - Pages, JS, CSS : on demande d'abord à Internet (pour avoir toujours la
//   dernière version), et on garde une copie. Sans réseau → la copie.
// - Images et polices : on sert la copie tout de suite, et on la met à jour
//   en arrière-plan.
// - On ne touche JAMAIS à /api/* ni aux autres sites (Supabase, cartes, CDN…).
// Pour forcer tout le monde à repartir de zéro : changer le numéro ci-dessous.
const CACHE = 'dbspeed-v2';

// Le strict minimum gardé dès l'installation.
const COQUILLE = [
  '/', '/app/', '/app/accueil.html', '/offline.html',
  '/couleurs.css', '/sensations.js', '/app/app.css', '/manifest.webmanifest',
  '/icones/icone-180.png', '/icones/icone-192.png', '/icones/icone-512.png',
  '/icones/icone-maskable-512.png',
  '/images/marbre-vert.jpg', '/images/marbre-bordeaux.jpg',
  '/app/polices/Barlow-Regular.woff2', '/app/polices/Barlow-SemiBold.woff2',
  '/app/polices/BigShouldersDisplay-Variable.woff2',
];

// Une réponse « propre » à garder : bonne (200), et venant de notre site.
const bonne = (rep) => rep && rep.ok && rep.type === 'basic';

// Une réponse qui a suivi une redirection ne peut pas servir de page : on la recopie.
async function propre(rep) {
  if (!rep.redirected) return rep;
  return new Response(await rep.blob(), { status: rep.status, statusText: rep.statusText, headers: rep.headers });
}

async function garder(requete, rep) {
  const cache = await caches.open(CACHE);
  await cache.put(requete, await propre(rep));
}

// Installation : on range la coquille, fichier par fichier (si un seul rate, on continue).
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(COQUILLE.map(async (url) => {
      try {
        const rep = await fetch(url, { cache: 'reload' });
        if (bonne(rep)) await cache.put(url, await propre(rep));
      } catch (_) { /* pas grave, il sera gardé plus tard */ }
    }));
    await self.skipWaiting();
  })());
});

// Activation : on efface les anciens caches et on prend la main tout de suite.
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// D'abord Internet, sinon la copie (et la page « Pas de connexion » pour une page inconnue).
async function reseauDabord(requete, cle, estPage) {
  try {
    const rep = await fetch(requete);
    if (bonne(rep)) garder(cle, rep.clone()).catch(() => {});
    return rep;
  } catch (err) {
    const copie = await caches.match(cle, { ignoreSearch: estPage });
    if (copie) return copie;
    if (estPage) {
      const horsLigne = await caches.match('/offline.html');
      if (horsLigne) return horsLigne;
    }
    throw err;
  }
}

// D'abord la copie, mise à jour en arrière-plan (images, polices).
async function copieDabord(e) {
  const copie = await caches.match(e.request);
  const frais = fetch(e.request).then((rep) => {
    if (bonne(rep)) garder(e.request, rep.clone()).catch(() => {});
    return rep;
  });
  if (copie) {
    e.waitUntil(frais.catch(() => {}));
    return copie;
  }
  return frais;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;     // autres sites : le navigateur gère
  if (url.pathname.startsWith('/api/')) return;         // API : jamais en cache
  if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return; // bug connu de Chrome

  if (req.mode === 'navigate') {
    // Une page : on la range sans le « ?… » pour ne pas garder 50 copies.
    e.respondWith(reseauDabord(req, url.origin + url.pathname, true));
  } else if (req.destination === 'image' || req.destination === 'font' ||
             /\.(png|jpe?g|webp|svg|gif|ico|woff2?)$/i.test(url.pathname)) {
    e.respondWith(copieDabord(e));
  } else {
    // JS, CSS, config.js, manifeste… : toujours la version fraîche si on a du réseau.
    e.respondWith(reseauDabord(req, req, false));
  }
});
