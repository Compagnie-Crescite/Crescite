/* Le service de l'administration installée (admin/, manifest.webmanifest) : il la rend installable sur le téléphone et
   l'ouvre sans réseau. Toujours le réseau d'abord : l'administration écrit dans la base, elle doit être celle du jour ;
   la copie gardée de la page et de ses scripts ne sert qu'hors connexion (elle dit alors qu'elle ne joint pas la base).
   Jamais gardés : la base, l'authentification, les fonctions et les fichiers (Supabase), ni rien d'un autre site. */
const COQUILLE = 'crescite-admin-coquille';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(COQUILLE).then(c => c.addAll(['./', 'manifest.webmanifest'].map(u => new Request(u, { cache: 'reload' })))).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url), portee = new URL(self.registration.scope);
  if (url.origin !== self.location.origin) return;
  // la page (quelle que soit la suite de l'adresse) et ce qu'elle charge à côté d'elle, ou des icônes de l'espace de l'équipe
  const page = req.mode === 'navigate';
  if (!page && !url.pathname.startsWith(portee.pathname) && !url.pathname.startsWith(new URL('../equipe/icones/', portee).pathname)) return;
  e.respondWith((async () => {
    const c = await caches.open(COQUILLE);
    try {
      const r = await fetch(req);
      if (r.ok) e.waitUntil(c.put(page ? './' : req, r.clone()).catch(() => {}));
      return r;
    } catch (err) {
      const x = await c.match(page ? './' : req, { ignoreSearch: true });
      if (x) return x;
      throw err;
    }
  })());
});
