// Les gestes de l'espace de l'équipe (equipe/equipe.js avec ../admin/gestes.js), vérifiés dans Chromium, hors ligne :
// l'appui long sur un billet (une feuille d'actions depuis le bas), la date d'avant et d'après (les boutons, le balayage
// au doigt, ← → au clavier), le clic droit sur une notification ; ne rien perdre en partant ; supprimer dans la boîte de
// la charte (jamais confirm()), un retard signalé et un mot pour l'administration commencés protégés du départ.
//   python3 site/build.py && node site/gestes-equipe.mjs
// Même saison fictive que mouvement-equipe.mjs (aucune donnée réelle, la base coupée). Demande Playwright et Chromium.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs');

const ICI = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ICI, 'dist');
const CAPT = path.join(DIST, 'shots-gestes');
if (!fs.existsSync(path.join(DIST, 'equipe', 'index.html'))) { console.error('site/dist/equipe manque : python3 site/build.py d’abord'); process.exit(2); }
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

// ---- la base simulée, en lecture et en écriture (le compte administre) : ce que l'application lit (sa tournée, sa fiche,
// la distribution, l'équipe, les notifications), ce qu'elle écrit (les menus de modification), gardé dans MODIFS
const MODIFS = [];
function baseSimulee() {
  const personnes = { 1: { id: 1, slug: 'camille-essai', prenom: 'Camille', nom: 'Essai', metiers: ['comédienne'], photo: null, photo_publique: false }, 2: { id: 2, slug: 'jean-durand', prenom: 'Jean', nom: 'Durand', metiers: ['régisseur'], photo: null, photo_publique: false } };
  const lieux = { 5: caen, 6: havre, 7: paris };
  const DB = {
    crescite_dates: MEMOIRE.dates.map(d => ({ id: d.id, spectacle_id: d.spectacle_id, lieu_id: d.lieu.id, debut: d.debut, fin: d.fin, precision: 'jour', saison: d.saison, public: 'tout_public', statut: d.statut, visible: true, intitule: null, details: [], lien: null, nature: 'representations' })),
    crescite_representations: MEMOIRE.dates.flatMap(d => d.representations.map(r => ({ id: r.id, date_id: d.id, jour: r.jour, heure: r.heure ? `${r.heure}:00` : null, fin: r.fin ? `${r.fin}:00` : null, public: r.public, annulee: false, note: null }))),
    crescite_lieux: Object.values(lieux).map(l => ({ ...l, site_web: null })), crescite_spectacles: [berenice, folle].map(s => ({ ...s, duree: null, ordre: s.id * 10, photo: null })),
    crescite_personnes: Object.values(personnes), crescite_personnes_privees: [{ personne_id: 1, email: 'camille@example.org', telephone: '06 12 34 56 78', ville: 'Rouen', regime: null, urgence: null }],
    crescite_distributions: [{ id: 1, spectacle_id: 2, personne_id: 1, categorie: 'jeu', fonction: '', role: null, alternance: null, en_tournee: true, ordre: 10, personne: personnes[1] }, { id: 2, spectacle_id: 2, personne_id: 2, categorie: 'technique', fonction: 'Régie générale', role: null, alternance: null, en_tournee: true, ordre: 20, personne: personnes[2] },
      { id: 3, spectacle_id: 1, personne_id: 1, categorie: 'jeu', fonction: '', role: 'Bérénice', alternance: null, en_tournee: true, ordre: 10, personne: personnes[1] }],
    crescite_equipes: [],
    crescite_documents: [{ id: 31, spectacle_id: 2, type: 'fiche_technique', titre: 'Fiche technique', fichier: 'la-folle-idee/fiche-technique.pdf', url: null, pour: 'equipe', ordre: 10 },
      { id: 32, spectacle_id: 2, type: 'texte', titre: 'Le texte sur Wikisource', fichier: null, url: 'https://fr.wikisource.org/wiki/La_Folle_Idee', pour: 'equipe', ordre: 20 }],
    crescite_feuilles: [(() => { const d = MEMOIRE.dates.find(x => x.id === 102), j = d.debut, rep = d.representations[0].id, il = new Date(Date.now() - 86400e3).toISOString();
      return { id: 7, date_id: 102, titre: null, statut: 'publiee', version: 2, publiee_le: il, modifie_le: il, contenu: { format: 2, composees: ['entete:spectacle', 'rub:planning', `pl:${j}:rep:${rep}`], pages: [], compose_le: il,
        instantane: [{ jour: j, heure: '20:00', fin: null, annulee: false }], blocs: [
          { id: 'b1', type: 'entete', segments: [{ texte: 'La Folle Idée', gras: true }], cle: 'entete:spectacle', source: 'base' },
          { id: 'b2', type: 'entete', segments: [{ texte: 'Le Volcan, Le Havre' }], petit: true },
          { id: 'b3', type: 'rubrique', segments: [{ texte: 'Planning' }], cle: 'rub:planning', source: 'base' },
          { id: 'b4', type: 'ligne', segments: [{ texte: '14h : arrivée au Volcan' }], source: 'base', origine: { jour: j, heure: '14:00', fin: null, rep: false } },
          { id: 'b5', type: 'ligne', segments: [{ texte: '20h : représentation', gras: true }], cle: `pl:${j}:rep:${rep}`, source: 'base', origine: { jour: j, heure: '20:00', fin: null, rep: true } },
          { id: 'b6', type: 'rubrique', segments: [{ texte: 'Hébergement' }] },
          { id: 'b7', type: 'ligne', segments: [{ texte: 'Hôtel du Port, 2 quai de Southampton' }] }] } }; })()],
    crescite_propositions: [], crescite_notifications: MEMOIRE.notifs.map(n => ({ ...n, personne_id: 1, date_id: null, spectacle_id: null, lien: null })),
    crescite_notes_frais: [], crescite_signalements: [], crescite_dates_chiffres: [], crescite_checklists_chargement: [], crescite_lieux_suivi: [], crescite_dates_suivi: [], crescite_materiel: [],
  };
  const tournee = () => DB.crescite_dates.map(d => ({ ...d, spectacle: DB.crescite_spectacles.find(s => s.id === d.spectacle_id), lieu: DB.crescite_lieux.find(l => l.id === d.lieu_id) || null,
    representations: DB.crescite_representations.filter(r => r.date_id === d.id).sort((a, b) => (a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : String(a.heure || '99').localeCompare(String(b.heure || '99')))),
    feuille: (f => (f ? { id: f.id, version: f.version, publiee_le: f.publiee_le } : null))(DB.crescite_feuilles.find(f => f.date_id === d.id && f.statut === 'publiee')) }));
  // la feuille des autres dates, jointe à sa date (select=…date:crescite_dates(debut, lieu_id, spectacle_id, lieu:crescite_lieux(nom, commune)))
  const avecDate = f => { const d = DB.crescite_dates.find(x => x.id === f.date_id), l = d && DB.crescite_lieux.find(x => x.id === d.lieu_id); return { ...f, date: d ? { debut: d.debut, lieu_id: d.lieu_id, spectacle_id: d.spectacle_id, lieu: l ? { nom: l.nom, commune: l.commune } : null } : null }; };
  // ce que la base fait d'une feuille écrite (crescite_feuilles_avant) : publiée et changée, elle passe en version suivante
  const avantFeuille = (ancien, neuf) => { if (neuf.statut === 'publiee' && (ancien.statut !== 'publiee' || JSON.stringify(ancien.contenu) !== JSON.stringify(neuf.contenu) || (ancien.titre || null) !== (neuf.titre || null))) { if (ancien.publiee_le) neuf.version = (ancien.version || 1) + 1; neuf.publiee_le = new Date().toISOString(); } neuf.modifie_le = new Date().toISOString(); };
  const filtrer = (rows, params) => { for (const [k, v] of params) { let m; if ((m = /^eq\.(.*)$/.exec(v))) rows = rows.filter(r => String(r[k]) === m[1]); else if ((m = /^neq\.(.*)$/.exec(v))) rows = rows.filter(r => String(r[k]) !== m[1]); else if (v === 'is.null') rows = rows.filter(r => r[k] == null); else if ((m = /^in\.\((.*)\)$/.exec(v))) { const xs = m[1].split(','); rows = rows.filter(r => xs.includes(String(r[k]))); } } return rows; };
  const route = async r => {
    const req = r.request(), url = new URL(req.url()), partie = url.pathname.split('/'), table = partie.pop(), objet = /pgrst\.object/.test(req.headers().accept || '');
    const json = (status, body) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    // le stockage : signer des liens, envoyer un fichier, le retirer
    if (url.pathname.startsWith('/storage/v1/object/')) {
      const reste = url.pathname.slice('/storage/v1/object/'.length).split('/').map(decodeURIComponent);
      if (reste[0] === 'sign') { const seau = reste[1], chemin = reste.slice(2).join('/'); const corps = JSON.parse(req.postData() || '{}');
        if (chemin) return json(200, { signedURL: `/object/sign/${seau}/${chemin}?token=essai` });
        return json(200, (corps.paths || []).map(x => ({ error: null, path: x, signedURL: `/object/sign/${seau}/${x}?token=essai` }))); }
      const seau = reste[0], chemin = reste.slice(1).join('/');
      if (req.method() === 'POST' || req.method() === 'PUT') { MODIFS.push({ stockage: seau, envoi: chemin, type: req.headers()['content-type'] || '' }); return json(200, { Key: `${seau}/${chemin}`, Id: 'f-essai' }); }
      if (req.method() === 'DELETE') { const corps = JSON.parse(req.postData() || '{}'); MODIFS.push({ stockage: seau, retrait: corps.prefixes || [] }); return json(200, []); }
      return json(200, {});
    }
    if (!url.pathname.startsWith('/rest/v1/')) return r.abort();
    if (partie[partie.length - 1] === 'rpc') {
      const corps = JSON.parse(req.postData() || '{}');
      MODIFS.push({ rpc: table, corps });
      if (table === 'crescite_rattacher') return json(200, 1);
      if (table === 'crescite_est_admin') return json(200, true);
      if (table === 'crescite_ma_tournee') return json(200, tournee());
      if (table === 'crescite_prevenir_equipe') return json(200, 2);
      return json(200, null);
    }
    if (!(table in DB)) return json(404, { code: 'PGRST205', message: `Could not find the table 'public.${table}' in the schema cache` });
    if (req.method() === 'GET') {
      let rows = filtrer(DB[table], url.searchParams);
      if (table === 'crescite_feuilles' && /crescite_dates\(/.test(url.searchParams.get('select') || '')) rows = rows.map(avecDate);
      const limit = url.searchParams.get('limit'); if (limit) rows = rows.slice(0, +limit);
      if (objet) return rows.length ? json(200, rows[0]) : json(406, { code: 'PGRST116', details: 'The result contains 0 rows', message: 'JSON object requested, multiple (or no) rows returned' });
      return json(200, rows);
    }
    const body = req.postData() ? JSON.parse(req.postData()) : {};
    if (req.method() === 'PATCH') { const rows = filtrer(DB[table], url.searchParams); rows.forEach(x => { const ancien = { ...x }; Object.assign(x, body); if (table === 'crescite_feuilles') avantFeuille(ancien, x); }); MODIFS.push({ table, patch: body, n: rows.length }); return objet ? json(200, rows[0] || null) : r.fulfill({ status: 204, body: '' }); }
    if (req.method() === 'DELETE') { const rows = filtrer(DB[table], url.searchParams); DB[table] = DB[table].filter(x => !rows.includes(x)); MODIFS.push({ table, delete: rows.map(x => x.id ?? x), n: rows.length }); return r.fulfill({ status: 204, body: '' }); }
    if (req.method() === 'POST') {
      const xs = Array.isArray(body) ? body : [body], cles = (url.searchParams.get('on_conflict') || '').split(',').filter(Boolean);
      for (const x of xs) { const existant = cles.length ? DB[table].find(y => cles.every(k => String(y[k]) === String(x[k]))) : null; if (existant) Object.assign(existant, x); else { const neuf = { id: Date.now() % 100000 + DB[table].length, ...x }; if (table === 'crescite_feuilles') avantFeuille({ statut: null }, neuf); DB[table].push(neuf); } }
      MODIFS.push({ table, post: xs, conflit: cles });
      return objet ? json(201, xs[0]) : r.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    }
    return json(200, []);
  };
  return { DB, route };
}

async function ouvrir(navigateur, { telephone = true, hash = '#/saison', base = null } = {}) {
  const ctx = await navigateur.newContext(telephone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'UTC' } : { viewport: { width: 1280, height: 900 }, locale: 'fr-FR', timezoneId: 'UTC' });
  if (base) { await ctx.route(/supabase\.co/, base.route); await ctx.route(/fonts\.g/, r => r.abort()); await ctx.routeWebSocket(/realtime/, () => {}); }
  else await ctx.route(/supabase\.co|fonts\.g/, r => (/crescite_notifications/.test(r.request().url()) && r.request().method() === 'PATCH' ? r.fulfill({ status: 204, body: '' }) : r.abort()));
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|net::ERR/i.test(m.text())) erreurs.push(m.text()); });
  const journal = []; page.on('console', m => journal.push(`${m.type()}: ${m.text().slice(0, 160)}`));
  page.journal = journal;
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
// l'appui long sur un élément (défilé en vue), jusqu'à ce que le menu attendu s'ouvre : la page peut se redessiner entre-temps
async function menuSur(page, selecteur, attendu, { dx = null, dy = null, essais = 3 } = {}) {
  for (let i = 0; i < essais; i++) {
    const el = await page.$(selecteur); if (!el) { await page.waitForTimeout(500); continue; }
    await el.scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(300);
    const r = await el.boundingBox(); if (!r) continue;
    await appuiLong(page, r.x + (dx ?? r.width / 2), dy == null ? r.y + r.height / 2 : dy < 0 ? r.y + r.height + dy : r.y + dy);
    if (await page.waitForSelector(`.gm-feuille [data-gm]:has-text("${attendu}")`, { timeout: 2500 }).catch(() => null)) { await page.waitForTimeout(250); return true; }
    await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(400);
  }
  return false;
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
  ok('clic droit sur une notification : ouvrir, marquer comme lue, tout marquer, effacer', (await compte(page, '.gm-boite [data-gm]')) === 4, String(await compte(page, '.gm-boite [data-gm]')));
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

// ================================================================================ le compte administre : modifier d'un appui long
{
  const base = baseSimulee();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/date/102', base });
  await page.waitForFunction(() => document.querySelector('#contenu .heros[data-date="102"]') && document.querySelector('#contenu .portraits li[data-personne="2"]'), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  ok('en ligne, le compte est reconnu administrateur et la page lit la base simulée (l’équipe de la date : Camille, Jean)', MODIFS.some(m => m.rpc === 'crescite_est_admin') && (await compte(page, '#contenu .portraits li[data-personne]')) === 2, String(await compte(page, '#contenu .portraits li[data-personne]')));
  await menuSur(page, '.heros[data-date="102"]', 'Modifier la date…', { dy: -30 });
  const items = await page.$$eval('.gm-feuille [data-gm]', xs => xs.map(x => x.querySelector('.gm-l').firstChild.textContent));
  ok('l’appui long sur la date, en administrateur : modifier la date, les représentations, qui part, le lieu, le suivi, prévenir, supprimer', ['Modifier la date…', 'Les représentations…', 'Qui part…', 'Modifier le lieu…', 'Suivi interne…', 'Prévenir l’équipe…', 'Supprimer la date…'].every(x => items.includes(x)), items.join(' | '));
  await page.waitForTimeout(400); await page.screenshot({ path: `${CAPT}/admin-menu.png`, fullPage: false });
  // la date : son statut, en feuille
  await page.tap('.gm-feuille [data-gm]:has-text("Modifier la date…")');
  await page.waitForSelector('.gf [role="dialog"]', { timeout: 3000 }).catch(() => {});
  ok('« Modifier la date… » ouvre une feuille de modification (statut, nature, publication, lien, précisions)', (await texte(page, '.gf h2')) === 'Modifier la date' && (await compte(page, '.gf [data-gf-seg="statut"] button')) === 4 && (await compte(page, '.gf [name="lien"]')) === 1);
  await page.waitForTimeout(400); await page.screenshot({ path: `${CAPT}/admin-formulaire.png`, fullPage: false });
  await page.tap('.gf [data-gf-seg="statut"] button[data-val="option"]');
  await page.tap('.gf button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.gf') && document.querySelector('#contenu .heros[data-date="102"] .etat-option'), null, { timeout: 8000 }).catch(() => {});
  ok('Enregistrer écrit le statut dans la base (une option n’est jamais publiée), la feuille se ferme, la page relue dit « Option »', MODIFS.some(m => m.table === 'crescite_dates' && m.patch && m.patch.statut === 'option' && m.patch.visible === false && m.n === 1) && (await compte(page, '.gf')) === 0 && base.DB.crescite_dates.find(d => d.id === 102).statut === 'option' && (await texte(page, '#contenu .heros[data-date="102"] .etat-option')) === 'Option', `${JSON.stringify(MODIFS.filter(m => m.table === 'crescite_dates'))} · ${await texte(page, '#contenu .heros-haut')}`);
  // l'horaire : en feuille, l'heure change
  await page.waitForTimeout(600);
  await menuSur(page, '#contenu .horaires li[data-reps]', 'Changer l’heure…', { dx: 60 });
  ok('l’appui long sur un horaire : changer l’heure, annuler, retirer la séance', (await compte(page, '.gm-feuille [data-gm]')) === 3, String(await compte(page, '.gm-feuille [data-gm]')));
  await page.tap('.gm-feuille [data-gm]:has-text("Changer l’heure…")');
  await page.waitForSelector('.gf input[name="reps.0.heure"]', { timeout: 3000 }).catch(() => {});
  await page.fill('.gf input[name="reps.0.heure"]', '21:00');
  await page.tap('.gf button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.gf') && /21h00/.test(document.querySelector('#contenu .horaires')?.textContent || ''), null, { timeout: 8000 }).catch(() => {});
  ok('la nouvelle heure est écrite (représentation 1020 → 21:00) et la page la montre', MODIFS.some(m => m.table === 'crescite_representations' && m.patch && m.patch.heure === '21:00') && /21h00/.test(await texte(page, '#contenu .horaires')), await texte(page, '#contenu .horaires'));
  // qui part : Jean ne part pas
  await page.waitForTimeout(600);
  await menuSur(page, '#contenu .portraits li[data-personne="2"]', 'Ne part pas sur cette date', { dx: 80 });
  ok('l’appui long sur une personne de l’équipe : ses coordonnées, « ne part pas », qui part', (await compte(page, '.gm-feuille [data-gm]')) === 3, `${await compte(page, '.gm-feuille [data-gm]')} · ${await page.$$eval('.gm-feuille [data-gm]', xs => xs.map(x => x.textContent.trim()).join(' | '))}`);
  await page.tap('.gm-feuille [data-gm]:has-text("Ne part pas sur cette date")');
  await page.waitForFunction(() => !document.querySelector('#contenu .portraits li[data-personne="2"]'), null, { timeout: 8000 }).catch(() => {});
  ok('« Ne part pas sur cette date » écrit l’écart (crescite_equipes, present faux) et Jean quitte « Qui part »', MODIFS.some(m => m.table === 'crescite_equipes' && m.post && m.post[0].personne_id === 2 && m.post[0].present === false) && (await compte(page, '#contenu .portraits li[data-personne="2"]')) === 0 && (await compte(page, '#contenu .portraits li[data-personne="1"]')) === 1);
  // le lieu : l'adresse
  await page.waitForTimeout(600);
  await menuSur(page, '#contenu .bloc-lieu[data-lieu]', 'Modifier le lieu…', { dy: 40 });
  await page.tap('.gm-feuille [data-gm]:has-text("Modifier le lieu…")');
  await page.waitForSelector('.gf input[name="adresse"]', { timeout: 3000 }).catch(() => {});
  await page.fill('.gf input[name="adresse"]', '8 place Oscar-Niemeyer');
  await page.fill('.gf textarea[name="contact"]', 'Régie : 02 35 19 10 10');
  await page.tap('.gf button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.gf') && /Oscar-Niemeyer/.test(document.querySelector('#contenu .bloc-lieu')?.textContent || ''), null, { timeout: 8000 }).catch(() => {});
  ok('le lieu : l’adresse écrite dans crescite_lieux, le contact dans son suivi, la page relue', MODIFS.some(m => m.table === 'crescite_lieux' && m.patch && m.patch.adresse === '8 place Oscar-Niemeyer') && MODIFS.some(m => m.table === 'crescite_lieux_suivi' && m.post && /02 35 19 10 10/.test(m.post[0].contact)) && /Oscar-Niemeyer/.test(await texte(page, '#contenu .bloc-lieu')));
  // prévenir l'équipe
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(250);
  await menuSur(page, '.heros[data-date="102"]', 'Prévenir l’équipe…', { dy: -30 });
  await page.tap('.gm-feuille [data-gm]:has-text("Prévenir l’équipe…")');
  await page.waitForSelector('.gf textarea[name="texte"]', { timeout: 3000 }).catch(() => {});
  await page.fill('.gf textarea[name="texte"]', 'Rendez-vous 14 h au Volcan.');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${CAPT}/admin-prevenir.png`, fullPage: false });
  await page.tap('.gf button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.gf'), null, { timeout: 6000 }).catch(() => {});
  const prevenu = MODIFS.find(m => m.rpc === 'crescite_prevenir_equipe');
  if (!prevenu) console.log('  [diagnostic prévenir]', JSON.stringify({ gf: await compte(page, '.gf'), h2: await texte(page, '.gf h2'), erreur: await page.$eval('.gf-erreur', e => `${e.hidden ? 'cachée' : 'visible'} ${e.textContent}`).catch(() => 'absente'),
    titre: await page.$eval('.gf [name="titre"]', e => e.value).catch(() => null), texte: await page.$eval('.gf textarea[name="texte"]', e => e.value).catch(() => null), menu: await compte(page, '.gm-boite'), annonces: await texte(page, '#annonces'), hash: await page.evaluate(() => location.hash),
    animations: await page.evaluate(() => document.getAnimations().length), journal: page.journal.slice(-8) }));
  ok('« Prévenir l’équipe… » appelle crescite_prevenir_equipe avec la date, le titre et le message', !!prevenu && prevenu.corps.d === 102 && prevenu.corps.texte_ === 'Rendez-vous 14 h au Volcan.' && /Message de l’administration/.test(prevenu.corps.titre_), JSON.stringify(prevenu));
  ok('et le dit', /Message envoyé à 2/.test(await texte(page, '#annonces')), await texte(page, '#annonces'));
  // une notification s'efface
  await page.goto(`${URL0}#/notifications`);
  await page.waitForSelector('.liste-notifs .notif[data-notif="2"]', { timeout: 10000 });
  await page.waitForTimeout(500);
  await menuSur(page, '.liste-notifs .notif[data-notif="2"]', 'Effacer');
  await page.tap('.gm-feuille [data-gm]:has-text("Effacer")');
  await page.waitForFunction(() => !document.querySelector('.liste-notifs .notif[data-notif="2"]'), null, { timeout: 6000 }).catch(() => {});
  ok('« Effacer » retire la notification de la base et de la liste', MODIFS.some(m => m.table === 'crescite_notifications' && m.delete && m.delete.includes(2)) && (await compte(page, '.liste-notifs .notif[data-notif="2"]')) === 0);
  // ---- les documents : modifier, ajouter depuis le téléphone (un fichier envoyé dans le stockage privé de l'équipe)
  page.on('dialog', dlg => dlg.accept());
  await page.goto(`${URL0}#/date/102`);
  await page.waitForFunction(() => document.querySelectorAll('#contenu .puces-docs li[data-doc]').length === 2, null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
  await menuSur(page, '#contenu .puces-docs li[data-doc="31"]', 'Modifier…');
  const itemsDoc = await page.$$eval('.gm-feuille [data-gm]', xs => xs.map(x => x.querySelector('.gm-l').firstChild.textContent));
  ok('l’appui long sur un document, en administrateur : ouvrir, partager, modifier, remplacer le fichier, supprimer', ['Ouvrir', 'Partager', 'Modifier…', 'Remplacer le fichier…', 'Supprimer…'].every(x => itemsDoc.includes(x)), itemsDoc.join(' | '));
  await page.tap('.gm-feuille [data-gm]:has-text("Modifier…")');
  await page.waitForSelector('.gf input[name="titre"]', { timeout: 3000 }).catch(() => {});
  ok('« Modifier… » : le titre, le type, pour qui (l’équipe ou l’administration, pour un fichier privé)', (await page.$eval('.gf input[name="titre"]', e => e.value).catch(() => '')) === 'Fiche technique' && (await compte(page, '.gf [data-gf-seg="type"] button[aria-pressed="true"][data-val="fiche_technique"]')) === 1 && (await compte(page, '.gf select[name="pour"] option')) === 2);
  await page.fill('.gf input[name="titre"]', 'Fiche technique 2026');
  await page.tap('.gf button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.gf') && document.querySelector('#contenu .puces-docs li[data-doc="31"] [title="Fiche technique 2026"]'), null, { timeout: 8000 }).catch(() => {});
  ok('Enregistrer écrit le document, la page le relit', MODIFS.some(m => m.table === 'crescite_documents' && m.patch && m.patch.titre === 'Fiche technique 2026' && m.patch.type === 'fiche_technique' && m.patch.pour === 'equipe' && m.n === 1) && (await compte(page, '#contenu .puces-docs li[data-doc="31"] [title="Fiche technique 2026"]')) === 1, JSON.stringify(MODIFS.filter(m => m.table === 'crescite_documents')));
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
  await menuSur(page, '.heros[data-date="102"]', 'Ajouter un document…', { dy: -30 });
  await page.tap('.gm-feuille [data-gm]:has-text("Ajouter un document…")');
  await page.waitForSelector('.gf input[type="file"]', { timeout: 3000 }).catch(() => {});
  ok('« Ajouter un document… » : un titre, le type, pour qui, un fichier du téléphone ou un lien', (await texte(page, '.gf h2')) === 'Ajouter un document' && (await compte(page, '.gf input[type="file"][name="fichier"]')) === 1 && (await compte(page, '.gf input[name="url"]')) === 1 && (await compte(page, '.gf select[name="pour"] option')) === 5);
  await page.fill('.gf input[name="titre"]', 'Plan de feu');
  await page.tap('.gf [data-gf-seg="type"] button[data-val="plan"]');
  await page.setInputFiles('.gf input[type="file"]', { name: 'plan-de-feu.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF') });
  await page.tap('.gf button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.gf') && document.querySelectorAll('#contenu .puces-docs li[data-doc]').length === 3, null, { timeout: 10000 }).catch(() => {});
  const envoi = MODIFS.find(m => m.stockage && m.envoi);
  ok('le fichier part dans le stockage privé de l’équipe, sous le dossier du spectacle', !!envoi && envoi.stockage === 'crescite-equipe' && /^la-folle-idee\/[a-z0-9]+-plan-de-feu\.pdf$/.test(envoi.envoi), JSON.stringify(envoi));
  const ajout = MODIFS.find(m => m.table === 'crescite_documents' && m.post);
  ok('puis le document s’écrit (un plan, pour l’équipe, le spectacle de la date) et la page le liste', !!ajout && ajout.post[0].type === 'plan' && ajout.post[0].titre === 'Plan de feu' && ajout.post[0].pour === 'equipe' && ajout.post[0].spectacle_id === 2 && !!envoi && ajout.post[0].fichier === envoi.envoi && ajout.post[0].url === null && (await compte(page, '#contenu .puces-docs li[data-doc]')) === 3, JSON.stringify(ajout));
  // ---- la feuille de route lue : une ligne modifiée, la mise à jour depuis la base
  await page.goto(`${URL0}#/feuille/102`);
  await page.waitForSelector('.feuille-cadre [data-bloc="b4"]', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(500);
  ok('la feuille de route lue : chaque ligne porte l’identifiant de son bloc', (await compte(page, '.feuille-cadre [data-bloc]')) >= 6 && (await texte(page, '.feuille-cadre [data-bloc="b4"]')) === '14h : arrivée au Volcan', `${await compte(page, '.feuille-cadre [data-bloc]')} · ${await texte(page, '.feuille-cadre [data-bloc="b4"]')}`);
  await menuSur(page, '.feuille-cadre [data-bloc="b4"]', 'Modifier cette ligne…');
  const itemsLigne = await page.$$eval('.gm-feuille [data-gm]', xs => xs.map(x => x.querySelector('.gm-l').firstChild.textContent));
  ok('l’appui long sur une ligne : copier son texte ; la modifier, en ajouter une après, la retirer (le compte administre)', ['Copier le texte', 'Modifier cette ligne…', 'Ajouter une ligne après…', 'Retirer cette ligne'].every(x => itemsLigne.includes(x)), itemsLigne.join(' | '));
  await page.tap('.gm-feuille [data-gm]:has-text("Modifier cette ligne…")');
  await page.waitForSelector('.gf textarea[name="texte"]', { timeout: 3000 }).catch(() => {});
  ok('la feuille de modification reprend le texte de la ligne, sa nature, et dit la version que l’équipe verra', (await page.$eval('.gf textarea[name="texte"]', e => e.value).catch(() => '')) === '14h : arrivée au Volcan' && (await compte(page, '.gf [data-gf-seg="type"] button[aria-pressed="true"][data-val="ligne"]')) === 1 && /version 3/.test(await texte(page, '.gf-note')), `${await page.$eval('.gf textarea[name="texte"]', e => e.value).catch(() => '')} · ${await texte(page, '.gf-note')}`);
  await page.fill('.gf textarea[name="texte"]', '13h30 : arrivée au Volcan, entrée des artistes');
  await page.tap('.gf button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.gf') && /13h30 : arrivée au Volcan, entrée des artistes/.test(document.querySelector('.feuille-cadre')?.textContent || '') && /Version 3/.test(document.querySelector('.f-version')?.textContent || ''), null, { timeout: 10000 }).catch(() => {});
  const ecritF = MODIFS.filter(m => m.table === 'crescite_feuilles' && m.patch && m.patch.contenu), b4 = ecritF.length ? ecritF[ecritF.length - 1].patch.contenu.blocs.find(b => b.id === 'b4') : null;
  ok('Enregistrer écrit la feuille : la ligne a son texte, n’est plus « de la base » ; la page la relit, en version 3', !!b4 && b4.segments.map(s => s.texte).join('') === '13h30 : arrivée au Volcan, entrée des artistes' && !b4.source && /13h30 : arrivée au Volcan/.test(await texte(page, '.feuille-cadre')) && /Version 3/.test(await texte(page, '.f-version')), `${JSON.stringify(b4)} · ${await texte(page, '.f-version')}`);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
  await menuSur(page, '.vue-feuille .f-version', 'Mettre à jour depuis la base');
  const itemsFeuille = await page.$$eval('.gm-feuille [data-gm]', xs => xs.map(x => x.querySelector('.gm-l').firstChild.textContent));
  ok('l’appui long sur la feuille : le PDF, la date ; une ligne à la fin, la mise à jour depuis la base, l’administration, le brouillon', ['Télécharger le PDF', 'La date', 'Ajouter une ligne à la fin…', 'Mettre à jour depuis la base', 'Modifier dans l’administration', 'Repasser en brouillon'].every(x => itemsFeuille.includes(x)), itemsFeuille.join(' | '));
  await page.tap('.gm-feuille [data-gm]:has-text("Mettre à jour depuis la base")');
  await page.waitForFunction(() => /21h/.test(document.querySelector('.feuille-cadre')?.textContent || '') && /Version 4/.test(document.querySelector('.f-version')?.textContent || ''), null, { timeout: 15000 }).catch(() => {});
  const majF = MODIFS.filter(m => m.table === 'crescite_feuilles' && m.patch && m.patch.contenu).pop(), b5 = majF && majF.patch.contenu.blocs.find(b => b.id === 'b5'), b4b = majF && majF.patch.contenu.blocs.find(b => b.id === 'b4');
  ok('« Mettre à jour depuis la base » : la représentation passée à 21 h plus haut remplace la ligne composée ; la ligne écrite à la main ne change pas', !!b5 && /21h/.test(b5.segments.map(s => s.texte).join('')) && !!b4b && /13h30 : arrivée au Volcan, entrée des artistes/.test(b4b.segments.map(s => s.texte).join('')) && majF.patch.contenu.instantane.some(x => x.heure === '21:00') && /21h/.test(await texte(page, '.feuille-cadre')), `${b5 && b5.segments.map(s => s.texte).join('')} · ${await texte(page, '#annonces')}`);
  // ---- la feuille dans la liste : repassée en brouillon ; la date la publie de nouveau ; une date sans feuille la compose
  await page.goto(`${URL0}#/feuilles`);
  await page.waitForSelector('.feuille-item[data-date="102"]', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
  await menuSur(page, '.feuille-item[data-date="102"]', 'Repasser en brouillon');
  await page.tap('.gm-feuille [data-gm]:has-text("Repasser en brouillon")');
  // la question dans la boîte de la charte (jamais confirm()) : le bouton nommé par son action, « Annuler » a le focus
  await page.waitForSelector('dialog.gq[open] [data-gq="oui"]', { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(400);
  const boiteBrouillon = await page.evaluate(() => ({ ok: document.querySelector('dialog.gq[open] [data-gq="oui"]')?.textContent, focus: document.activeElement?.dataset?.gq, danger: !!document.querySelector('dialog.gq.gq-danger[open]') }));
  ok('« Repasser en brouillon » : la boîte de la charte, « Repasser en brouillon » à la couleur d’alerte, « Annuler » a le focus', boiteBrouillon.ok === 'Repasser en brouillon' && boiteBrouillon.focus === 'non' && boiteBrouillon.danger, JSON.stringify(boiteBrouillon));
  await page.tap('dialog.gq [data-gq="oui"]').catch(() => {});
  await page.waitForFunction(() => !document.querySelector('.feuille-item[data-date="102"]'), null, { timeout: 10000 }).catch(() => {});
  ok('dans la liste, « Repasser en brouillon » (après confirmation) : la feuille n’est plus publiée, la liste la retire', MODIFS.some(m => m.table === 'crescite_feuilles' && m.patch && m.patch.statut === 'brouillon') && base.DB.crescite_feuilles.find(f => f.id === 7).statut === 'brouillon' && (await compte(page, '.feuille-item[data-date="102"]')) === 0);
  await page.goto(`${URL0}#/date/102`);
  await page.waitForSelector('.heros[data-date="102"]', { timeout: 10000 }).catch(() => {}); await page.waitForTimeout(500);
  await menuSur(page, '.heros[data-date="102"]', 'Feuille de route…', { dy: -30 });
  await page.tap('.gm-feuille [data-gm]:has-text("Feuille de route…")');
  await page.waitForSelector('.gf [data-gf-seg="maj"]', { timeout: 6000 }).catch(() => {});
  ok('sur la date dont la feuille est en brouillon, « Feuille de route… » propose de la publier, mise à jour ou telle quelle', (await texte(page, '.gf h2')) === 'Publier la feuille de route' && (await compte(page, '.gf [data-gf-seg="maj"] button')) === 2, await texte(page, '.gf h2'));
  await page.tap('.gf [data-gf-seg="maj"] button[data-val="telle"]');
  await page.tap('.gf button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.gf') && document.querySelector('#contenu a[href="#/feuille/102"], #contenu [data-pdf="102"]'), null, { timeout: 10000 }).catch(() => {});
  ok('Publier : la feuille est publiée de nouveau, la date la propose', base.DB.crescite_feuilles.find(f => f.id === 7).statut === 'publiee' && (await compte(page, '#contenu a[href="#/feuille/102"], #contenu [data-pdf="102"]')) >= 1);
  await page.goto(`${URL0}#/date/103`);
  await page.waitForSelector('.heros[data-date="103"]', { timeout: 10000 }).catch(() => {}); await page.waitForTimeout(500);
  await menuSur(page, '.heros[data-date="103"]', 'Feuille de route…', { dy: -30 });
  await page.tap('.gm-feuille [data-gm]:has-text("Feuille de route…")');
  await page.waitForSelector('.gf [data-gf-seg="statut"]', { timeout: 6000 }).catch(() => {});
  ok('sur une date sans feuille : « Composer la feuille de route », à publier ou à garder en brouillon', (await texte(page, '.gf h2')) === 'Composer la feuille de route' && (await compte(page, '.gf [data-gf-seg="statut"] button')) === 2, await texte(page, '.gf h2'));
  await page.tap('.gf button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.gf') && location.hash === '#/feuille/103' && document.querySelector('.feuille-cadre [data-bloc]'), null, { timeout: 15000 }).catch(() => {});
  const compo = MODIFS.find(m => m.table === 'crescite_feuilles' && m.post);
  ok('Composer : la feuille est composée depuis la base (blocs au format 2, l’instantané des horaires), publiée, et s’ouvre', !!compo && compo.post[0].date_id === 103 && compo.post[0].statut === 'publiee' && compo.post[0].contenu.format === 2 && compo.post[0].contenu.blocs.length > 5 && compo.post[0].contenu.instantane.length === 2 && (await page.evaluate(() => location.hash)) === '#/feuille/103' && (await compte(page, '.feuille-cadre [data-bloc]')) > 5, `${compo && compo.post[0].contenu.blocs.length} blocs · ${await page.evaluate(() => location.hash)} · ${await texte(page, '#annonces')}`);
  await page.waitForTimeout(400); await page.screenshot({ path: `${CAPT}/admin-feuille.png`, fullPage: false });
  ok('administrateur · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ ne rien perdre en partant, le titre de l'onglet
// la fiche « Moi » changée : changer de vue, le bouton précédent posent la question dans une boîte de la charte (jamais
// confirm()) ; « Rester » garde la saisie et l'adresse ; une feuille de modification changée aussi ; fermer l'onglet, la
// question du navigateur
{
  const base = baseSimulee();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/date/102', base });
  let natifs = 0;
  page.on('dialog', d => { natifs++; d.dismiss().catch(() => {}); });
  const question = () => page.waitForFunction(() => !!document.querySelector('dialog.gq[open]'), null, { timeout: 4000 }).then(() => page.waitForTimeout(400)).then(() => true).catch(() => false);   // (la boîte ignore les clics de ses 350 premières ms)
  const adresse = () => page.evaluate(() => location.hash);
  // un vrai geste sur la barre des onglets (une entrée d'historique sans geste, le précédent du navigateur la saute)
  const onglet = k => page.locator(`.nav-item[data-onglet="${k}"]:visible`).first().tap();
  await page.waitForSelector('.heros[data-date="102"]', { timeout: 10000 }).catch(() => {});
  await page.waitForFunction(() => /La Folle Idée · /.test(document.title), null, { timeout: 5000 }).catch(() => {});
  ok('titre · une date : le spectacle, le jour, l’onglet (« La Folle Idée · … · Ma saison · Équipe · Compagnie Crescite »)', /^(\(\d+\) )?La Folle Idée · \S+ \S+ \S+ · Ma saison · Équipe · Compagnie Crescite$/.test(await page.title()), await page.title());
  await onglet('moi');
  await page.waitForSelector('#f-telephone', { timeout: 10000 });
  await page.waitForTimeout(400);
  ok('titre · une vue d’onglet : « Moi · Équipe · Compagnie Crescite »', /(^|\) )Moi · Équipe · Compagnie Crescite$/.test(await page.title()), await page.title());
  await onglet('saison');
  await page.waitForFunction(() => location.hash === '#/saison' && document.querySelector('#contenu .heros, #contenu .billet'), null, { timeout: 6000 }).catch(() => {});
  ok('partir · la fiche sans changement : on change de vue sans question', !(await page.$('dialog.gq[open]')) && (await adresse()) === '#/saison');
  await page.goBack();
  await page.waitForSelector('#f-telephone', { timeout: 10000 });
  await page.fill('#f-telephone', '06 00 00 00 01');
  await onglet('planning');
  ok('partir · la fiche changée : changer de vue pose la question, pas confirm()', await question() && natifs === 0 && (await adresse()) === '#/moi', await adresse());
  await page.waitForTimeout(300); await page.screenshot({ path: `${CAPT}/partir-question.png`, fullPage: false });
  await page.tap('dialog.gq [data-gq="non"]');
  ok('partir · « Rester » : la fiche et sa saisie restent', !(await page.$('dialog.gq[open]')) && (await page.$eval('#f-telephone', e => e.value)) === '06 00 00 00 01' && (await adresse()) === '#/moi');
  await page.goBack();
  ok('partir · le bouton précédent pose la même question, l’adresse revient à la fiche', await question() && (await adresse()) === '#/moi', await adresse());
  await page.tap('dialog.gq [data-gq="oui"]').catch(() => {});
  // (la vue d'avant la fiche : la date, « Planning » ayant pris la place de « Ma saison » dans l'historique)
  await page.waitForFunction(() => location.hash === '#/date/102', null, { timeout: 6000 }).catch(() => {});
  ok('partir · « Quitter sans enregistrer » : la vue d’avant (le précédent rejoué)', (await adresse()) === '#/date/102' && !(await page.$('dialog.gq[open]')), await adresse());
  await page.goForward();
  await page.waitForSelector('#f-telephone', { timeout: 10000 });
  ok('partir · le suivant revient à la fiche, telle qu’enregistrée, sans question', (await page.$eval('#f-telephone', e => e.value)) === '06 12 34 56 78' && !(await page.$('dialog.gq[open]')), await page.$eval('#f-telephone', e => e.value));
  // une feuille de modification changée : Annuler, puis changer de vue
  await page.evaluate(() => { GESTES.formulaire({ titre: 'Essai', champs: [{ k: 'texte', t: 'texte', l: 'Texte', valeur: 'avant' }] }); });
  await page.waitForSelector('.gf form', { timeout: 4000 });
  await page.fill('.gf [name="texte"]', 'après');
  await page.tap('.gf button[data-gf-annuler]');
  ok('feuille · changée : Annuler pose la question par-dessus la feuille', await question() && (await compte(page, '.gf form')) === 1);
  await page.tap('dialog.gq [data-gq="non"]');
  await page.evaluate(() => { location.hash = '#/saison'; });   // (la feuille couvre la barre des onglets)
  ok('feuille · changée : changer de vue pose la question, la feuille reste', await question() && (await compte(page, '.gf form')) === 1 && (await adresse()) === '#/moi');
  await page.tap('dialog.gq [data-gq="oui"]').catch(() => {});
  await page.waitForFunction(() => !document.querySelector('.gf') && location.hash === '#/saison', null, { timeout: 6000 }).catch(() => {});
  ok('feuille · « Quitter sans enregistrer » ferme la feuille et change de vue', !(await page.$('.gf')) && (await adresse()) === '#/saison' && natifs === 0);
  // fermer l'onglet sur une fiche changée : la question du navigateur
  await onglet('moi');
  await page.waitForSelector('#f-telephone', { timeout: 10000 });
  await page.tap('#f-telephone');   // (un geste : le navigateur ne pose sa question qu'à une page touchée)
  await page.fill('#f-telephone', '06 00 00 00 02');
  page.removeAllListeners('dialog');
  const vu = new Promise(r => { page.once('dialog', d => { r(d.type()); d.dismiss().catch(() => {}); }); setTimeout(() => r(null), 5000); });
  ok('partir · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' / '));
  await page.close({ runBeforeUnload: true });
  const avantQuitter = await vu;
  ok('partir · fermer l’onglet sur la fiche changée : la question du navigateur (beforeunload)', avantQuitter === 'beforeunload', String(avantQuitter));
  await ctx.close();
}

// ================================================================================ supprimer sans trembler, les dernières saisies protégées
// supprimer une date : la boîte de la charte (jamais confirm()), « Supprimer la date » à la couleur d'alerte, « Annuler »
// a le focus et ne supprime rien ; le retard signalé, un mot pour l'administration commencés : la question en partant
{
  const base = baseSimulee();
  base.DB.crescite_propositions = [{ id: 1, titre: 'Option : Théâtre de Flers', message: null, statut: 'ouverte', spectacle_id: 1, cree_le: new Date(d0 - 864e5).toISOString(), spectacle: { id: 1, titre: 'Bérénice', slug: 'berenice' },
    jours: [{ id: 11, debut: `${plus(40)}T00:00:00+00:00`, fin: `${plus(41)}T00:00:00+00:00`, journee: true, reponses: [{ personne_id: 1, reponse: null, commentaire: null, repondu_le: null }] }] }];
  base.DB.crescite_indisponibilites = [];   // (le planning installé : sans la table, la proposition se dirait « bientôt »)
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/date/102', base });
  let natifs = 0;
  page.on('dialog', d => { natifs++; d.dismiss().catch(() => {}); });
  const question = () => page.waitForFunction(() => !!document.querySelector('dialog.gq[open]'), null, { timeout: 4000 }).then(() => page.waitForTimeout(400)).then(() => true).catch(() => false);
  const boite = () => page.evaluate(() => ({ titre: document.querySelector('dialog.gq[open] h2')?.textContent, ok: document.querySelector('dialog.gq[open] [data-gq="oui"]')?.textContent, annuler: document.querySelector('dialog.gq[open] [data-gq="non"]')?.textContent, focus: document.activeElement?.dataset?.gq, danger: !!document.querySelector('dialog.gq.gq-danger[open]') }));
  await page.waitForSelector('.heros[data-date="102"]', { timeout: 10000 }).catch(() => {}); await page.waitForTimeout(500);
  await menuSur(page, '.heros[data-date="102"]', 'Supprimer la date…', { dy: -30 });
  await page.tap('.gm-feuille [data-gm]:has-text("Supprimer la date…")');
  const b1 = await question() && await boite();
  ok('supprimer · une date : la boîte de la charte, pas confirm() ; « Supprimer la date » à la couleur d’alerte, « Annuler » a le focus', !!b1 && natifs === 0 && /^Supprimer « La Folle Idée · /.test(b1.titre) && b1.ok === 'Supprimer la date' && b1.annuler === 'Annuler' && b1.focus === 'non' && b1.danger, JSON.stringify(b1));
  await page.screenshot({ path: path.join(CAPT, 'supprimer-date-telephone.png') });
  await page.tap('dialog.gq [data-gq="non"]');
  await page.waitForTimeout(300);
  ok('supprimer · « Annuler » : rien n’est supprimé, la date reste', !(await page.$('dialog.gq[open]')) && !MODIFS.some(m => m.table === 'crescite_dates' && m.delete) && (await compte(page, '.heros[data-date="102"]')) === 1);
  await menuSur(page, '.heros[data-date="102"]', 'Supprimer la date…', { dy: -30 });
  await page.tap('.gm-feuille [data-gm]:has-text("Supprimer la date…")');
  await question();
  await page.tap('dialog.gq [data-gq="oui"]');
  await page.waitForFunction(() => location.hash === '#/saison', null, { timeout: 8000 }).catch(() => {});
  ok('supprimer · « Supprimer la date » : la date part de la base, retour à la saison', MODIFS.some(m => m.table === 'crescite_dates' && m.delete && m.delete.includes(102)) && (await page.evaluate(() => location.hash)) === '#/saison');
  // le retard signalé : une précision écrite ne se perd pas d'un Échap
  await page.goto(`${URL0}#/date/101`);
  await page.waitForSelector('[data-retard]', { timeout: 10000 }).catch(() => {});
  await page.tap('[data-retard]');
  await page.waitForSelector('#retard-texte', { timeout: 4000 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  ok('retard · rien d’écrit : Échap ferme sans question', !(await page.$('#modale-retard')) && !(await page.$('dialog.gq[open]')));
  await page.tap('[data-retard]');
  await page.waitForSelector('#retard-texte', { timeout: 4000 });
  await page.fill('#retard-texte', 'Accident A13, arrivée vers 14h20');
  await page.keyboard.press('Escape');
  const b2 = await question() && await boite();
  ok('retard · une précision écrite : Échap pose la question (« Fermer sans envoyer », « Rester »)', !!b2 && b2.ok === 'Fermer sans envoyer' && b2.focus === 'non' && (await compte(page, '#modale-retard')) === 1, JSON.stringify(b2));
  await page.screenshot({ path: path.join(CAPT, 'retard-question-telephone.png') });
  await page.tap('dialog.gq [data-gq="non"]');
  ok('retard · « Rester » : la boîte et la précision restent', !(await page.$('dialog.gq[open]')) && (await page.$eval('#retard-texte', e => e.value).catch(() => '')) === 'Accident A13, arrivée vers 14h20');
  await page.evaluate(() => { location.hash = '#/saison'; });
  ok('retard · changer de vue pose la question, la boîte reste', await question() && (await compte(page, '#modale-retard')) === 1 && (await page.evaluate(() => location.hash)) === '#/date/101');
  await page.tap('dialog.gq [data-gq="oui"]').catch(() => {});
  await page.waitForFunction(() => !document.querySelector('#modale-retard') && location.hash === '#/saison', null, { timeout: 6000 }).catch(() => {});
  ok('retard · « Fermer sans envoyer » ferme la boîte et change de vue, rien n’est parti', !(await page.$('#modale-retard')) && (await page.evaluate(() => location.hash)) === '#/saison' && !MODIFS.some(m => m.rpc === 'crescite_signaler'));
  // un mot pour l'administration, sans réponse choisie : il ne part pas ; changer de vue pose la question
  await page.evaluate(() => { location.hash = '#/proposition/1'; });
  await page.waitForSelector('[data-commentaire="11"]', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.evaluate(() => { location.hash = '#/saison'; });
  await page.waitForTimeout(500);
  ok('proposition · rien d’écrit : on change de vue sans question', !(await page.$('dialog.gq[open]')) && (await page.evaluate(() => location.hash)) === '#/saison');
  await page.goBack();
  await page.waitForSelector('[data-commentaire="11"]', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.fill('[data-commentaire="11"]', 'Libre le premier jour seulement, après 14 h.');
  await page.evaluate(() => { location.hash = '#/saison'; });
  ok('proposition · un mot commencé : changer de vue pose la question', await question() && (await page.evaluate(() => location.hash)) === '#/proposition/1');
  await page.tap('dialog.gq [data-gq="non"]');
  ok('proposition · « Rester » : le mot reste', (await page.$eval('[data-commentaire="11"]', e => e.value).catch(() => '')) === 'Libre le premier jour seulement, après 14 h.');
  await page.tap('[data-commentaire="11"]');
  const avantRep = MODIFS.length;
  await page.tap('[data-jour-prop="11"] [data-reponse="oui"]');
  await page.waitForFunction(() => document.querySelector('[data-jour-prop="11"] [data-reponse="oui"][aria-pressed="true"]'), null, { timeout: 6000 }).catch(() => {});
  ok('proposition · une réponse choisie emporte le mot', MODIFS.slice(avantRep).some(m => m.rpc === 'crescite_repondre' && m.corps.commentaire_ === 'Libre le premier jour seulement, après 14 h.'), JSON.stringify(MODIFS.slice(avantRep)));
  await page.evaluate(() => { location.hash = '#/saison'; });
  await page.waitForTimeout(500);
  ok('proposition · le mot parti avec la réponse : on change de vue sans question', !(await page.$('dialog.gq[open]')) && (await page.evaluate(() => location.hash)) === '#/saison' && natifs === 0);
  ok('supprimer, retard, proposition · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

await navigateur.close();
serveur.close();
let ko = 0;
for (const [etat, nom, detail] of resultats) { if (etat === 'KO') ko++; console.log(`${etat === 'ok' ? '  ✓' : '  ✗'} ${nom}${etat === 'KO' && detail ? `\n      ${detail}` : ''}`); }
console.log(`\n${resultats.length - ko} vérification${resultats.length - ko > 1 ? 's' : ''} sur ${resultats.length} · captures dans ${path.relative(path.resolve(ICI, '..'), CAPT)}/`);
process.exit(ko ? 1 : 0);
