// La saison fictive de l’espace de l’équipe, commune aux harnais (gestes-equipe.mjs, equipe-niveau.mjs) : un petit serveur qui
// sert maquettes/dist (python3 maquettes/build.py synthese d’abord), la dernière saison lue posée dans le stockage, une base
// simulée en lecture et en écriture (baseSimulee : DB, route, MODIFS), ouvrir(navigateur, { telephone, hash, base }),
// l’appui long et le menu par le protocole (appuiLong, menuSur), ok(nom, v, detail) et bilan(CAPT). Aucune donnée réelle.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs');

const ICI = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ICI, 'dist');
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
    { id: 3, type: 'proposition', titre: 'Option : Théâtre de Flers', texte: 'Une date proposée, dans douze jours.', lien: '#/proposition/1', cree_le: new Date(d0 - 9000e3).toISOString(), lue_le: null },
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
function baseSimulee({ tournee: avecTournee = true } = {}) {
  const personnes = { 1: { id: 1, slug: 'camille-essai', prenom: 'Camille', nom: 'Essai', metiers: ['comédienne'], photo: null, photo_publique: false }, 2: { id: 2, slug: 'jean-durand', prenom: 'Jean', nom: 'Durand', metiers: ['régisseur'], photo: null, photo_publique: false } };
  const lieux = { 5: caen, 6: havre, 7: paris };
  const DB = {
    crescite_dates: MEMOIRE.dates.map(d => ({ id: d.id, spectacle_id: d.spectacle_id, lieu_id: d.lieu.id, debut: d.debut, fin: d.fin, precision: 'jour', saison: d.saison, public: 'tout_public', statut: d.statut, visible: true, intitule: null, details: [], lien: null, nature: 'representations' })),
    crescite_representations: MEMOIRE.dates.flatMap(d => d.representations.map(r => ({ id: r.id, date_id: d.id, jour: r.jour, heure: r.heure ? `${r.heure}:00` : null, fin: r.fin ? `${r.fin}:00` : null, public: r.public, annulee: false, note: null }))),
    crescite_lieux: Object.values(lieux).map(l => ({ ...l, site_web: null })), crescite_spectacles: [berenice, folle].map(s => ({ ...s, duree: null, ordre: s.id * 10, photo: null })),
    crescite_personnes: Object.values(personnes), crescite_personnes_privees: [{ personne_id: 1, email: 'camille@example.org', telephone: '06 12 34 56 78', ville: 'Rouen', urgence: null }, { personne_id: 2, email: null, telephone: '06 98 76 54 32', ville: 'Caen', urgence: null }],
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
    crescite_propositions: [{ id: 1, titre: 'Option : Théâtre de Flers', message: null, statut: 'ouverte', spectacle_id: 1, cree_le: new Date(d0 - 9000e3).toISOString(), spectacle: { id: 1, titre: 'Bérénice', slug: 'berenice' },
      jours: [{ id: 11, debut: `${plus(12)}T00:00:00+00:00`, fin: `${plus(13)}T00:00:00+00:00`, journee: true, reponses: [{ personne_id: 1, reponse: null, commentaire: null, repondu_le: null }] }] }],
    crescite_notifications: MEMOIRE.notifs.map(n => ({ ...n, personne_id: 1, date_id: null, spectacle_id: null, lien: n.lien || null })),
    crescite_notes_frais: [], crescite_signalements: [], crescite_dates_chiffres: [], crescite_checklists_chargement: [], crescite_lieux_suivi: [], crescite_dates_suivi: [], crescite_materiel: [],
    crescite_textes: [{ cle: 'frais', valeur: { bareme_km: 0.636 } }],
    // le seizième script (20261104_crescite_tournee.sql) : Jean sera là au Havre, un message de lui sur le fil, un trajet en voiture ; rien d'autre
    ...(avecTournee ? { crescite_presences: [{ date_id: 102, personne_id: 2, statut: 'present', motif: null, feuille_lue_version: null, feuille_lue_le: null, maj_le: new Date(d0 - 3600e3).toISOString() }],
      crescite_fil: [{ id: 1, date_id: 102, personne_id: 2, auteur_nom: 'Jean Durand', texte: 'Le camion est chargé, à tout de suite @Camille Essai', mentions: [1], fichier: null, fichier_nom: null, cree_le: new Date(d0 - 1800e3).toISOString(), modifie_le: null }],
      crescite_trajets: [{ id: 1, date_id: 102, personne_id: 2, sens: 'aller', mode: 'voiture', depart: 'Rouen, gare', jour: plus(9), heure: '10:30:00', places: 2, passagers: [], details: null, cree_le: new Date(d0 - 7200e3).toISOString(), modifie_le: null }],
      crescite_checklists: [], crescite_creneaux: [] } : {}),
  };
  const tournee = () => DB.crescite_dates.map(d => ({ ...d, spectacle: DB.crescite_spectacles.find(s => s.id === d.spectacle_id), lieu: DB.crescite_lieux.find(l => l.id === d.lieu_id) || null,
    representations: DB.crescite_representations.filter(r => r.date_id === d.id).sort((a, b) => (a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : String(a.heure || '99').localeCompare(String(b.heure || '99')))),
    feuille: (f => (f ? { id: f.id, version: f.version, publiee_le: f.publiee_le } : null))(DB.crescite_feuilles.find(f => f.date_id === d.id && f.statut === 'publiee')) }));
  // la feuille des autres dates, jointe à sa date (select=…date:crescite_dates(debut, lieu_id, spectacle_id, lieu:crescite_lieux(nom, commune)))
  const avecDate = f => { const d = DB.crescite_dates.find(x => x.id === f.date_id), l = d && DB.crescite_lieux.find(x => x.id === d.lieu_id); return { ...f, date: d ? { debut: d.debut, lieu_id: d.lieu_id, spectacle_id: d.spectacle_id, lieu: l ? { nom: l.nom, commune: l.commune } : null } : null }; };
  // ce que la base fait d'une feuille écrite (crescite_feuilles_avant) : publiée et changée, elle passe en version suivante
  const avantFeuille = (ancien, neuf) => { if (neuf.statut === 'publiee' && (ancien.statut !== 'publiee' || JSON.stringify(ancien.contenu) !== JSON.stringify(neuf.contenu) || (ancien.titre || null) !== (neuf.titre || null))) { if (ancien.publiee_le) neuf.version = (ancien.version || 1) + 1; neuf.publiee_le = new Date().toISOString(); } neuf.modifie_le = new Date().toISOString(); };
  const filtrer = (rows, params) => { for (const [k, v] of params) { let m; if ((m = /^eq\.(.*)$/.exec(v))) rows = rows.filter(r => String(r[k]) === m[1]); else if ((m = /^neq\.(.*)$/.exec(v))) rows = rows.filter(r => String(r[k]) !== m[1]); else if (v === 'is.null') rows = rows.filter(r => r[k] == null); else if ((m = /^in\.\((.*)\)$/.exec(v))) { const xs = m[1].split(','); rows = rows.filter(r => xs.includes(String(r[k]))); } else if ((m = /^(gte|lte|gt|lt)\.(.*)$/.exec(v))) { const op = m[1], w = m[2]; rows = rows.filter(r => { const a = String(r[k] ?? ''); return op === 'gte' ? a >= w : op === 'lte' ? a <= w : op === 'gt' ? a > w : a < w; }); } else if (v === 'not.is.null') rows = rows.filter(r => r[k] != null); } return rows; };
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
      if (table === 'crescite_repondre') { const p = DB.crescite_propositions.find(x => x.jours.some(j => j.id === corps.jour)), j = p && p.jours.find(x => x.id === corps.jour); if (j) { const r = j.reponses.find(x => x.personne_id === 1); if (r) Object.assign(r, { reponse: corps.reponse_, commentaire: corps.commentaire_, repondu_le: new Date().toISOString() }); } return json(200, null); }
      if (table === 'crescite_equipe_du_jour') { if (!avecTournee) return json(404, { code: 'PGRST202', message: 'Could not find the function public.crescite_equipe_du_jour' }); const d = DB.crescite_dates.find(x => x.id === corps.d); const pids = [...new Set(DB.crescite_distributions.filter(x => d && x.spectacle_id === d.spectacle_id && x.en_tournee).map(x => x.personne_id))];
        return json(200, pids.map(id => { const p = personnes[id], pv = DB.crescite_personnes_privees.find(x => x.personne_id === id) || {}; return { personne_id: id, prenom: p.prenom, nom: p.nom, metiers: p.metiers, telephone: pv.telephone || null, email: pv.email || null, ville: pv.ville || null }; })); }
      if (table === 'crescite_trajet_monter') { if (!avecTournee) return json(404, { code: 'PGRST202', message: 'Could not find the function public.crescite_trajet_monter' }); const t = DB.crescite_trajets.find(x => x.id === corps.t); if (!t) return json(200, null); t.passagers = (t.passagers || []).filter(x => x !== 1); if (corps.oui) t.passagers.push(1); return json(200, { passagers: t.passagers }); }
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
      const xs = Array.isArray(body) ? body : [body], cles = (url.searchParams.get('on_conflict') || '').split(',').filter(Boolean), ecrits = [];
      for (const x of xs) { const existant = cles.length ? DB[table].find(y => cles.every(k => String(y[k]) === String(x[k]))) : null; if (existant) { Object.assign(existant, x); ecrits.push(existant); } else { const neuf = { id: Date.now() % 100000 + DB[table].length, ...x }; ecrits.push(neuf); if (table === 'crescite_feuilles') avantFeuille({ statut: null }, neuf); DB[table].push(neuf); } }
      MODIFS.push({ table, post: xs, conflit: cles });
      return objet ? json(201, ecrits[0] || xs[0]) : r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(ecrits) });
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


function bilan(CAPT) {
  serveur.close();
  let ko = 0;
  for (const [etat, nom, detail] of resultats) { if (etat === 'KO') ko++; console.log(`${etat === 'ok' ? '  ✓' : '  ✗'} ${nom}${etat === 'KO' && detail ? `\n      ${detail}` : ''}`); }
  console.log(`\n${resultats.length - ko} vérification${resultats.length - ko > 1 ? 's' : ''} sur ${resultats.length} · captures dans ${path.relative(path.resolve(ICI, '..'), CAPT)}/`);
  process.exit(ko ? 1 : 0);
}
export { chromium, ICI, DIST, serveur, URL0, d0, iso, plus, AUJ, berenice, folle, date, caen, havre, paris, MEMOIRE, SESSION, INIT, resultats, ok, compte, texte, hash, MODIFS, baseSimulee, ouvrir, appuiLong, menuSur, balayer, bilan };
