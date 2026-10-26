// Les gestes de l'espace de l'équipe (equipe/equipe.js avec ../admin/gestes.js), vérifiés dans Chromium, hors ligne :
// l'appui long sur un billet (une feuille d'actions depuis le bas), la date d'avant et d'après (les boutons, le balayage
// au doigt, ← → au clavier), le clic droit sur une notification.
//   python3 maquettes/build.py synthese && node maquettes/gestes-equipe.mjs
// Même saison fictive que mouvement-equipe.mjs (aucune donnée réelle, la base coupée). Demande Playwright et Chromium.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs');

const ICI = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ICI, 'dist');
const CAPT = path.join(DIST, 'shots-gestes');
if (!fs.existsSync(path.join(DIST, 'equipe', 'index.html'))) { console.error('maquettes/dist/equipe manque : python3 maquettes/build.py synthese d’abord'); process.exit(2); }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml' };
const serveur = http.createServer((req, res) => {
  const p = path.join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(DIST) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => serveur.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${serveur.address().port}/equipe/index.html`;

// ---- la saison fictive : Caen aujourd'hui, Le Havre dans 9 jours, Paris dans 23, Paris il y a 40
const d0 = new Date(); d0.setHours(14, 0, 0, 0);
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plus = n => { const d = new Date(d0); d.setDate(d.getDate() + n); return iso(d); };
const AUJ = iso(d0);
const berenice = { id: 1, titre: 'Bérénice', slug: 'berenice', univers: { couleurs: { scene: '#7a2a5a', fond: '#1b0f18', texte: '#ffffff', accent: '#f0b84a' } } };
const folle = { id: 2, titre: 'La Folle Idée', slug: 'la-folle-idee', univers: { couleurs: { scene: '#1f5f8b', fond: '#0e1c26', texte: '#ffffff', accent: '#8fd3ff' } } };
const date = (id, sp, jour, lieu, reps, extra = {}) => ({ id, spectacle_id: sp.id, spectacle: sp, statut: 'confirmee', precision: 'jour', debut: jour, fin: jour, saison: '2026-2027', lieu, nature: 'representations',
  representations: reps.map((r, i) => ({ id: id * 10 + i, jour, public: 'tout_public', annulee: false, ...r })), details: [], ...extra });
const caen = { id: 5, nom: 'Théâtre de Caen', commune: 'Caen', departement: '14', adresse: '135 boulevard du Maréchal-Leclerc', latitude: 49.1829, longitude: -0.3707 };
const havre = { id: 6, nom: 'Le Volcan', commune: 'Le Havre', departement: '76', adresse: '8 place Niemeyer', latitude: 49.4944, longitude: 0.1079 };
const paris = { id: 7, nom: 'Théâtre de la Ville', commune: 'Paris', departement: '75', adresse: '2 place du Châtelet', latitude: 48.8566, longitude: 2.3522 };
const MEMOIRE = {
  v: 2, uid: 'u-essai', moi: 1, quand: Date.now(), personne: { id: 1, prenom: 'Camille', nom: 'Essai', slug: 'camille' },
  dates: [
    date(101, berenice, AUJ, caen, [{ heure: '13:30', fin: '14:30' }, { heure: '15:35', fin: '16:45' }], { feuille: null }),
    date(102, folle, plus(9), havre, [{ heure: '20:00' }]),
    date(103, berenice, plus(23), paris, [{ heure: '10:00', public: 'scolaire' }, { heure: '14:30', public: 'scolaire' }]),
    date(104, folle, plus(-40), paris, [{ heure: '19:00' }]),
  ],
  distributions: [], equipes: [], documents: [], spectacles: [berenice, folle], feuilles: [],
  notifs: [
    { id: 1, type: 'horaires', titre: 'Horaires changés à Caen', texte: 'La séance de 15 h passe à 15 h 35.', cree_le: new Date(d0 - 3600e3).toISOString(), lue_le: null },
    { id: 2, type: 'feuille', titre: 'Feuille de route publiée', texte: 'Le Havre, dans neuf jours.', cree_le: new Date(d0 - 7200e3).toISOString(), lue_le: null },
  ], notifsEtat: 'ok',
};
const SESSION = { access_token: 'x', refresh_token: 'y', token_type: 'bearer', expires_in: 864000, expires_at: Math.floor(d0 / 1000) + 864000, user: { id: 'u-essai', email: 'camille@example.org', aud: 'authenticated' } };
const INIT = `localStorage.setItem('crescite-equipe', ${JSON.stringify(JSON.stringify(SESSION))});
localStorage.setItem('crescite-equipe-donnees', ${JSON.stringify(JSON.stringify(MEMOIRE))});`;

const resultats = [];
const ok = (nom, v, detail = '') => { resultats.push([v ? 'ok' : 'KO', nom, detail]); };
const compte = async (page, sel) => page.$$eval(sel, xs => xs.length);
const texte = async (page, sel) => (await page.$eval(sel, e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => ''));
const hash = page => page.evaluate(() => location.hash);

async function ouvrir(navigateur, { telephone = true, hash = '#/saison' } = {}) {
  const ctx = await navigateur.newContext(telephone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'UTC' } : { viewport: { width: 1280, height: 900 }, locale: 'fr-FR', timezoneId: 'UTC' });
  await ctx.route(/supabase\.co|fonts\.g/, r => (/crescite_notifications/.test(r.request().url()) && r.request().method() === 'PATCH' ? r.fulfill({ status: 204, body: '' }) : r.abort()));
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|net::ERR/i.test(m.text())) erreurs.push(m.text()); });
  await page.addInitScript(INIT);
  await page.goto(`${URL0}${hash}`);
  await page.waitForSelector('#app > .appli', { timeout: 15000 });
  await page.waitForSelector('#contenu .heros, #contenu .titre-vue, #contenu .billet', { timeout: 15000 });
  return { ctx, page, erreurs };
}
// l'appui long et le balayage, par le protocole (Playwright n'a que le tap)
async function appuiLong(page, x, y, duree = 650) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(duree);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}
async function balayer(page, [x0, y0], [x1, y1], { pas = 8, dt = 14 } = {}) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= pas; i++) { const t = i / pas; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t }] }); await page.waitForTimeout(dt); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--disable-features=OverscrollHistoryNavigation'] });
fs.mkdirSync(CAPT, { recursive: true });

// ================================================================================ au téléphone : l'appui long, le balayage
{
  const { ctx, page, erreurs } = await ouvrir(navigateur);
  await page.waitForSelector('#billet-102', { timeout: 10000 });
  ok('gestes.js est chargé dans l’espace de l’équipe', await page.evaluate(() => typeof GESTES === 'object' && typeof GESTES.menu === 'function'));
  const b = await page.$('#billet-102');
  await b.scrollIntoViewIfNeeded();
  const r = await b.boundingBox();
  await appuiLong(page, r.x + r.width / 2, r.y + 30);
  await page.waitForSelector('.gm.gm-feuille .gm-boite', { timeout: 3000 }).catch(() => {});
  const items = await page.$$eval('.gm-feuille [data-gm]', xs => xs.map(x => x.querySelector('.gm-l').firstChild.textContent));
  ok('l’appui long sur un billet ouvre une feuille d’actions depuis le bas, au nom de la date', (await compte(page, '.gm.gm-feuille .gm-boite[role="menu"]')) === 1 && /La Folle Idée/.test(await texte(page, '.gm-feuille .gm-titre')), await texte(page, '.gm-feuille .gm-titre'));
  ok('ses actions : ouvrir, itinéraire, agenda, partager', ['Ouvrir la date', 'Itinéraire', 'Ajouter à mon agenda', 'Partager la date'].every(x => items.includes(x)), items.join(' | '));
  ok('la page n’a pas bougé (le clic qui suit l’appui est avalé)', (await hash(page)) === '#/saison');
  await page.screenshot({ path: `${CAPT}/appui-long.png`, fullPage: false });
  await page.tap('.gm-feuille [data-gm]:has-text("Ouvrir la date")');
  await page.waitForFunction(() => location.hash === '#/date/102' && document.querySelector('.heros-page'), null, { timeout: 8000 }).catch(() => {});
  ok('« Ouvrir la date » ouvre la page de la date', (await hash(page)) === '#/date/102', await hash(page));
  await page.waitForTimeout(500);
  const nav = await page.$eval('#contenu .nav-dates', e => [...e.querySelectorAll('[data-gps]')].map(x => `${x.dataset.gps}:${x.dataset.href || 'off'}:${x.textContent.trim()}`)).catch(() => []);
  ok('la page a « date précédente / date suivante », nommées (le jour, puis le spectacle)', /^-1:#\/date\/101:\S+ \d+(er)? \S+ · Bérénice$/.test(nav[0] || '') && /^1:#\/date\/103:\S+ \d+(er)? \S+ · Bérénice$/.test(nav[1] || ''), nav.join(' | '));
  await page.screenshot({ path: `${CAPT}/date.png`, fullPage: false });
  // (après un changement de page, la transition de vue couvre l'écran un instant : le doigt attend qu'elle finisse)
  const pageDe = async id => { await page.waitForFunction(h => location.hash === h && document.querySelector('#contenu .nav-dates') && [...document.querySelectorAll('#contenu .nav-dates [data-gps]')].every(b => b.dataset.href !== h), `#/date/${id}`, { timeout: 6000 }).catch(() => {}); await page.waitForTimeout(500); };
  await page.waitForTimeout(500);
  await balayer(page, [320, 240], [80, 245]);   // sur le héros de la page
  await pageDe(103);
  ok('un balayage vers la gauche ouvre la date suivante', (await hash(page)) === '#/date/103', await hash(page));
  await balayer(page, [80, 240], [320, 245]);
  await pageDe(102);
  ok('un balayage vers la droite revient à la précédente', (await hash(page)) === '#/date/102', await hash(page));
  await page.waitForTimeout(300);
  const h = await page.$('.heros[data-date]');
  const rh = await h.boundingBox();
  await appuiLong(page, rh.x + rh.width / 2, rh.y + rh.height - 30);
  await page.waitForSelector('.gm.gm-feuille .gm-boite', { timeout: 3000 }).catch(() => {});
  const items2 = await page.$$eval('.gm-feuille [data-gm]', xs => xs.map(x => x.querySelector('.gm-l').firstChild.textContent));
  ok('l’appui long sur le héros de la page : les mêmes actions, sans « Ouvrir »', items2.length >= 3 && !items2.includes('Ouvrir la date') && items2.includes('Itinéraire'), items2.join(' | '));
  await page.tap('.gm-feuille .gm-voile', { position: { x: 10, y: 10 } });
  ok('toucher le voile ferme la feuille', (await compte(page, '.gm-boite')) === 0);
  ok('téléphone · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ à l'ordinateur : le clic droit, ← →
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { telephone: false, hash: '#/notifications' });
  await page.waitForSelector('.liste-notifs .notif[data-notif="1"]', { timeout: 10000 });
  await page.click('.liste-notifs .notif[data-notif="1"]', { button: 'right' });
  await page.waitForSelector('.gm-boite [data-gm]:has-text("Marquer comme lue")', { timeout: 3000 }).catch(() => {});
  ok('clic droit sur une notification : ouvrir, marquer comme lue, tout marquer', (await compte(page, '.gm-boite [data-gm]')) === 3, String(await compte(page, '.gm-boite [data-gm]')));
  await page.click('.gm-boite [data-gm]:has-text("Marquer comme lue")');
  await page.waitForFunction(() => !document.querySelector('.liste-notifs .notif[data-notif="1"].non-lue'), null, { timeout: 4000 }).catch(() => {});
  ok('« Marquer comme lue » la marque, sans quitter la page', (await compte(page, '.liste-notifs .notif[data-notif="1"].non-lue')) === 0 && (await hash(page)) === '#/notifications');
  // (la page d'une date : on attend que ses boutons soient ceux de la nouvelle date, la transition de vue finie)
  const pageDe = id => page.waitForFunction(h => location.hash === h && document.querySelector('#contenu .nav-dates') && [...document.querySelectorAll('#contenu .nav-dates [data-gps]')].every(b => b.dataset.href !== h), `#/date/${id}`, { timeout: 6000 }).catch(() => {});
  await page.goto(`${URL0}#/date/102`);
  await pageDe(102);
  await page.keyboard.press('ArrowRight');
  await pageDe(103);
  ok('→ ouvre la date suivante', (await hash(page)) === '#/date/103', await hash(page));
  await page.keyboard.press('ArrowLeft');
  await pageDe(102);
  ok('← revient à la précédente', (await hash(page)) === '#/date/102', await hash(page));
  await page.click('#contenu .nav-dates [data-gps="-1"]');
  await pageDe(101);
  await page.click('#contenu .nav-dates [data-gps="-1"]');
  await pageDe(104);
  ok('« précédente » deux fois : la date d’aujourd’hui, puis la date passée, qui n’en a plus avant elle', (await hash(page)) === '#/date/104' && await page.$eval('#contenu .nav-dates [data-gps="-1"]', e => e.disabled), await hash(page));
  await page.click('.heros[data-date]', { button: 'right' });
  await page.waitForSelector('.gm-boite', { timeout: 3000 }).catch(() => {});
  ok('clic droit sur le héros d’une date : ses actions', (await compte(page, '.gm-boite [data-gm]')) >= 2);
  await page.keyboard.press('Escape');
  ok('ordinateur · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

await navigateur.close();
serveur.close();
let ko = 0;
for (const [etat, nom, detail] of resultats) { if (etat === 'KO') ko++; console.log(`${etat === 'ok' ? '  ✓' : '  ✗'} ${nom}${etat === 'KO' && detail ? `\n      ${detail}` : ''}`); }
console.log(`\n${resultats.length - ko} vérification${resultats.length - ko > 1 ? 's' : ''} sur ${resultats.length} · captures dans ${path.relative(path.resolve(ICI, '..'), CAPT)}/`);
process.exit(ko ? 1 : 0);
