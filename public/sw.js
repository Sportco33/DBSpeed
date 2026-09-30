// DBSpeed — service worker minimal.
// Il sert seulement à rendre l'appli « installable » sur le téléphone.
// Il ne garde rien en cache pour l'instant : on passe toujours par Internet.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
