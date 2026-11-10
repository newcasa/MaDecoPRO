// Ma Déco Pro — fonctionnement hors ligne.
// Avec du réseau : la dernière version en ligne est chargée (et gardée en mémoire).
// Sans réseau (ou réseau trop lent) : la version gardée en mémoire est utilisée.
const CACHE = 'ma-deco-pro-v5';
const TIMEOUT = 3500;
const FILES = ['./', './index.html', './config.js', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // seulement les fichiers de l'appli : les échanges avec le serveur de données ne sont jamais mis en cache
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  const key = req.mode === 'navigate' ? './index.html' : req;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(key, { ignoreSearch: true });
    const fresh = fetch(req, { cache: 'no-cache' }).then(res => {
      if (res && res.ok) cache.put(key, res.clone());
      return res;
    });
    if (!cached) return fresh;
    // réseau d'abord ; si pas de réponse rapide, la copie en mémoire
    return Promise.race([
      fresh.catch(() => cached),
      new Promise(r => setTimeout(() => r(cached), TIMEOUT))
    ]);
  }));
});
