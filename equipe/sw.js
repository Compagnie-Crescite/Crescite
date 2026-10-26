/* Le service de l'application de l'équipe (equipe/). Il garde l'application sur l'appareil (elle s'ouvre sans réseau, sur
   la dernière saison lue), relit la base d'abord sur le réseau (et, sans lui, sur sa dernière réponse, pour la personne
   connectée seulement), et reçoit les notifications que pousse la fonction crescite-push : il les montre, et un geste
   sur l'une d'elles ouvre l'application à la bonne vue.

   VERSION est posée par maquettes/build.py (equipe(dest)) : une empreinte de tout ce que ce service garde (la page, ses
   scripts, ceux de l'administration qu'elle charge, la carte, les icônes). Une nouvelle version s'installe à côté et
   attend : la page annonce « Nouvelle version disponible » et, sur un geste, lui demande de prendre la main (skipWaiting).
   Servi sans build (le dossier equipe/ tel quel), VERSION garde son gabarit (deux soulignés devant) : tout passe alors
   d'abord par le réseau.

   Jamais gardés : l'authentification, la fonction d'envoi, les liens signés des documents, et toute écriture. */
const VERSION = '__VERSION__';
const DEV = VERSION.startsWith('__');
const COQUILLE = `crescite-equipe-coquille-${VERSION}`;   // l'application elle-même, par version
const OUTILS = 'crescite-equipe-outils';                  // ce qu'elle charge à la demande (pdfmake pour les PDF)
const DONNEES = 'crescite-equipe-donnees';                // les dernières réponses de la base, par personne
const MEDIAS = 'crescite-equipe-medias';                  // les photos, les portraits, les polices
const BASE = 'https://omekkqjinvppadsoinvj.supabase.co';
const ESSENTIELS = ['./', 'equipe.js', 'manifest.webmanifest', '../admin/vendor/supabase.js'];
const UTILES = ['carte.js', '../admin/agenda.js', '../admin/feuille.js', '../admin/logo.js', '../admin/tentacules.js', '../admin/gestes.js', '../admin/planning.js',
  'icones/192.png', 'icones/512.png', 'icones/180.png', 'icones/masquable-512.png', 'icones/badge.png'];
const MAX_MEDIAS = 120;
const MAX_DONNEES = 30 * 864e5;                            // une réponse de la base gardée sert un mois au plus hors connexion
const LIENS_SURS = /^#\/(saison|feuilles|planning|spectacles|documents|notifications|moi|frais|indisponibilites|agendas|propositions|date\/\d+|feuille\/\d+|proposition\/\d+|spectacles\/[a-z0-9-]{1,80})$/;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(COQUILLE);
    await c.addAll(ESSENTIELS.map(u => new Request(u, { cache: 'reload' })));
    await Promise.allSettled(UTILES.map(u => c.add(new Request(u, { cache: 'reload' }))));
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms.filter(n => n.startsWith('crescite-equipe-coquille-') && n !== COQUILLE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  const m = e.data || {};
  if (m.type === 'skipWaiting') self.skipWaiting();
  // la déconnexion : les réponses gardées de la base s'effacent
  if (m.type === 'oublier') e.waitUntil(caches.delete(DONNEES));
});

// ———————————————————————————————————————————————————————————————————————————————— le réseau
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === BASE) {
    if (url.pathname.startsWith('/rest/v1/')) e.respondWith(base(req));
    else if (url.pathname.startsWith('/storage/v1/object/public/')) e.respondWith(media(req, e));
    return;
  }
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') { e.respondWith(media(req, e)); return; }
  if (url.origin !== self.location.origin) return;
  const portee = new URL(self.registration.scope);
  if (req.mode === 'navigate') {
    if (url.pathname === portee.pathname || url.pathname === `${portee.pathname}index.html`) e.respondWith(page(req));
    return;
  }
  if (url.pathname.startsWith(portee.pathname) || url.pathname.startsWith(new URL('../admin/', portee).pathname)) e.respondWith(fichier(req, e));
});

// l'application : celle de cette version, sans attendre le réseau ; sinon (dev, ou pas encore gardée) le réseau
async function page(req) {
  const c = await caches.open(COQUILLE);
  if (!DEV) { const x = await c.match('./'); if (x) return x; }
  try { return await fetch(req); } catch (err) { const x = await c.match('./'); if (x) return x; throw err; }
}
async function fichier(req, e) {
  const c = await caches.open(COQUILLE);
  if (DEV) {
    try { const r = await fetch(req); if (r.ok) c.put(req, r.clone()).catch(() => {}); return r; } catch (err) { const x = await c.match(req, { ignoreSearch: true }); if (x) return x; throw err; }
  }
  const x = await c.match(req, { ignoreSearch: true });
  if (x) return x;
  return parDessous(OUTILS, req, e);
}
// gardé au passage et rafraîchi en arrière-plan (pdfmake, les photos, les polices)
async function parDessous(nom, req, e, max = 0) {
  const c = await caches.open(nom), x = await c.match(req);
  const frais = fetch(req).then(r => {
    if (r.ok && r.type !== 'opaque') c.put(req, r.clone()).then(() => (max ? elaguer(c, max) : null)).catch(() => {});
    return r;
  });
  if (x) { e.waitUntil(frais.catch(() => {})); return x; }
  return frais;
}
const media = (req, e) => parDessous(MEDIAS, req, e, MAX_MEDIAS);
async function elaguer(c, max) { const ks = await c.keys(); for (const k of ks.slice(0, Math.max(0, ks.length - max))) await c.delete(k); }

// la base : d'abord le réseau ; sans lui, la dernière réponse à la même question, pour la même personne (lue dans son jeton),
// si elle a moins d'un mois (MAX_DONNEES) ; une réponse plus vieille s'efface
function qui(req) {
  const m = /^Bearer\s+[^.]+\.([^.]+)\./.exec(req.headers.get('authorization') || '');
  if (!m) return null;
  try { return JSON.parse(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))).sub || null; } catch (err) { return null; }
}
const cleDe = (req, sub) => { const u = new URL(req.url); u.searchParams.set('__personne', sub); return u.href; };
async function base(req) {
  const sub = qui(req);
  try {
    const r = await fetch(req);
    if (r.ok && sub) {
      const copie = r.clone();
      (async () => {
        const h = new Headers(copie.headers);
        h.set('x-crescite-garde-le', String(Date.now()));
        const garde = new Response(await copie.blob(), { status: copie.status, statusText: copie.statusText, headers: h });
        await (await caches.open(DONNEES)).put(cleDe(req, sub), garde);
      })().catch(() => {});
    }
    return r;
  } catch (err) {
    if (!sub) throw err;
    const c = await caches.open(DONNEES), cle = cleDe(req, sub), x = await c.match(cle);
    if (!x) throw err;
    if (!(Date.now() - Number(x.headers.get('x-crescite-garde-le') || 0) < MAX_DONNEES)) { await c.delete(cle); throw err; }
    const h = new Headers(x.headers);
    h.set('x-crescite-hors-ligne', '1');
    return new Response(await x.blob(), { status: x.status, statusText: x.statusText, headers: h });
  }
}

// ———————————————————————————————————————————————————————————————————————————————— les notifications poussées
// charge utile de crescite-push : {id, type, titre, texte, lien, date_id}
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { texte: e.data ? e.data.text() : '' }; }
  const titre = String(d.titre || d.title || 'Crescite');
  const texte = String(d.texte || d.body || '');
  const brut = d.lien || d.url || '';
  const lien = typeof brut === 'string' && LIENS_SURS.test(brut) ? brut : d.date_id ? `#/date/${d.date_id}` : '#/notifications';
  e.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    fenetres.forEach(c => c.postMessage({ type: 'push', notification: d }));
    // l'application est à l'écran : elle montre son propre bandeau
    if (fenetres.some(c => c.visibilityState === 'visible' && c.focused)) return;
    await self.registration.showNotification(titre, {
      body: texte, tag: `crescite-notif-${d.id ?? Date.now()}`, renotify: false, lang: 'fr',
      icon: 'icones/192.png', badge: 'icones/badge.png', timestamp: Date.now(), data: { lien, id: d.id ?? null },
    });
    if (self.navigator && self.navigator.setAppBadge && Number.isFinite(+d.badge)) self.navigator.setAppBadge(+d.badge).catch(() => {});
  })());
});

// un geste sur une notification : l'application s'ouvre (ou revient au premier plan) sur sa vue, et la notification est lue
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const { lien = '#/notifications', id = null } = e.notification.data || {};
  const vers = LIENS_SURS.test(lien) ? lien : '#/notifications';
  e.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const app = fenetres.find(c => c.url.startsWith(self.registration.scope));
    if (app) { app.postMessage({ type: 'ouvrir', lien: vers, id }); return app.focus(); }
    return self.clients.openWindow(new URL(`./${id != null ? `?lue=${encodeURIComponent(id)}` : ''}${vers}`, self.registration.scope).href);
  })());
});

// le navigateur a renouvelé l'abonnement : la page l'enregistrera dans la base à sa prochaine ouverture
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil((async () => {
    try { if (e.oldSubscription && e.oldSubscription.options) await self.registration.pushManager.subscribe(e.oldSubscription.options); } catch (err) { /* la page s'en chargera */ }
    const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    fenetres.forEach(c => c.postMessage({ type: 'abonnement-change' }));
  })());
});
