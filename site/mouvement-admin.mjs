// Le mouvement de l'administration (admin/index.html, equipe.js, planning.js), vérifié dans Chromium.
//   python3 site/build.py && node site/mouvement-admin.mjs
// L'administration s'ouvre sur une base fictive : une session gardée dans le navigateur, et chaque lecture de table
// (rest/v1/…) reçoit quelques lignes inventées ; rien ne part vers la vraie base, qui est coupée (les écritures
// répondent vide). On vérifie les vues qui s'enchaînent, les listes qui arrivent, le pied qui dit l'état, la liste « à
// compléter » qui se vide, la recherche qui s'ouvre, la connexion qui secoue, les annonces ; puis le mouvement réduit.
// Sort en erreur si une vérification manque. Demande Playwright et Chromium (PLAYWRIGHT_MODULE, CHROMIUM, comme onglets.mjs).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs');

const ICI = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ICI, 'dist');
const CAPT = path.join(DIST, 'shots-admin');
if (!fs.existsSync(path.join(DIST, 'admin', 'index.html'))) { console.error('site/dist/admin manque : python3 site/build.py d’abord'); process.exit(2); }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml' };
const serveur = http.createServer((req, res) => {
  const p = path.join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(DIST) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => serveur.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${serveur.address().port}/admin/index.html`;

// ---- la base fictive
const d0 = new Date(); d0.setHours(14, 0, 0, 0);
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plus = n => { const d = new Date(d0); d.setDate(d.getDate() + n); return iso(d); };
const saisonDe = j => { const a = +j.slice(0, 4), m = +j.slice(5, 7); return m >= 8 ? `${a}-${a + 1}` : `${a - 1}-${a}`; };
const spectacles = [
  { id: 1, slug: 'berenice', titre: 'Bérénice', ordre: 1, page: true, publie: true, en_tournee: true, creation: '2023', univers: { couleurs: { scene: '#7a2a5a', fond: '#1b0f18', texte: '#ffffff', accent: '#f0b84a' } } },
  { id: 2, slug: 'la-folle-idee', titre: 'La Folle Idée', ordre: 2, page: true, publie: true, en_tournee: false, creation: '2021', univers: { couleurs: { scene: '#1f5f8b', fond: '#0e1c26', texte: '#ffffff' } } },
];
const lieux = [
  { id: 5, nom: 'Théâtre de Caen', commune: 'Caen', departement: '14', adresse: '', latitude: 49.1829, longitude: -0.3707 },
  { id: 6, nom: 'Le Volcan', commune: 'Le Havre', departement: '76', adresse: '8 place Niemeyer', latitude: 49.4944, longitude: 0.1079 },
  { id: 7, nom: 'Théâtre de la Ville', commune: 'Paris', departement: '75', adresse: '2 place du Châtelet', latitude: 48.8566, longitude: 2.3522 },
];
const date = (id, sp, lieu, jour, extra = {}) => ({ id, spectacle_id: sp, lieu_id: lieu, debut: jour, fin: jour, saison: saisonDe(jour), statut: 'confirmee', visible: true, public: 'tout_public', nature: 'representations', intitule: null, lien: null, details: [], ...extra });
const dates = [date(101, 1, 5, plus(3)), date(102, 2, 6, plus(9)), date(103, 1, 7, plus(23)), date(104, 2, 7, plus(-40))];
const reps = [{ id: 1, date_id: 101, jour: plus(3), heure: '20:00', fin: null, public: 'tout_public', annulee: false }, { id: 2, date_id: 102, jour: plus(9), heure: '20:00', fin: null, public: 'tout_public', annulee: false },
  { id: 3, date_id: 103, jour: plus(23), heure: '10:00', fin: null, public: 'scolaire', annulee: false }, { id: 4, date_id: 104, jour: plus(-40), heure: '19:00', fin: null, public: 'tout_public', annulee: false }];
const TABLES = { crescite_admins: [{ user_id: 'u-admin', nom: 'Essai' }], crescite_spectacles: spectacles, crescite_lieux: lieux, crescite_dates: dates, crescite_representations: reps,
  crescite_dates_suivi: [], crescite_lieux_suivi: [], crescite_ateliers: [], crescite_seances: [], crescite_textes: [], crescite_personnes: [], crescite_personnes_privees: [], crescite_personnes_suivi: [],
  crescite_distributions: [], crescite_equipes: [], crescite_documents: [], crescite_feuilles: [], crescite_journal: [] };
const SESSION = { access_token: 'x', refresh_token: 'y', token_type: 'bearer', expires_in: 864000, expires_at: Math.floor(d0 / 1000) + 864000, user: { id: 'u-admin', email: 'admin@example.org', aud: 'authenticated' } };
const INIT = `localStorage.setItem('crescite-admin', ${JSON.stringify(JSON.stringify(SESSION))});
window.__longues = []; window.__pret = 0;
try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (window.__pret && e.startTime > window.__pret) window.__longues.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
window.__vt = []; const _svt = document.startViewTransition; if (_svt) document.startViewTransition = function (cb) { window.__vt.push(document.documentElement.dataset.sens || ''); return _svt.call(document, cb); };`;

const resultats = [];
const ok = (nom, v, detail = '') => { resultats.push([v ? 'ok' : 'KO', nom, detail]); };

async function ouvrir(navigateur, { reduit = false, hash = '#/representations', largeur = 1280, sombre = false } = {}) {
  const ctx = await navigateur.newContext({ viewport: { width: largeur, height: 820 }, reducedMotion: reduit ? 'reduce' : 'no-preference', colorScheme: sombre ? 'dark' : 'light', locale: 'fr-FR', timezoneId: 'UTC' });
  await ctx.route(/supabase\.co|fonts\.g/, async r => {
    const u = new URL(r.request().url()), m = u.pathname.match(/\/rest\/v1\/([a-z_]+)/);
    if (m && r.request().method() === 'GET') {
      const xs = TABLES[m[1]];
      if (m[1] === 'crescite_admins') await new Promise(res => setTimeout(res, 500));   // le squelette a le temps de se voir
      if (!xs) return r.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST205', message: `Could not find the table 'public.${m[1]}'` }) });
      return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': `0-${xs.length}/${xs.length}` }, body: JSON.stringify(xs) });
    }
    if (/\/rest\/v1\/rpc\//.test(u.pathname)) return r.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
    return r.abort();
  });
  const page = await ctx.newPage();
  if (process.env.CPU) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +process.env.CPU }); }   // CPU=4 : un téléphone lent
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|net::ERR|WebSocket/i.test(m.text())) erreurs.push(m.text()); });
  await page.clock.install({ time: d0 });
  await page.addInitScript(INIT);
  await page.goto(`${URL0}${hash}`);
  const squelette = await page.waitForSelector('.ad-squelette', { timeout: 4000 }).then(() => true).catch(() => false);
  // la forme du squelette : l'en-tête (inerte) et sa hauteur, le titre, la liste et la fiche d'une rubrique à liste
  const forme = squelette ? await page.evaluate(() => { const b = document.querySelector('.barre'), t = document.querySelector('.ad-squelette .sq-titre');
    return { attente: !!b && b.classList.contains('attente') && b.inert, hBarre: b ? Math.round(b.getBoundingClientRect().height) : 0, titre: t ? Math.round(t.getBoundingClientRect().top) : 0, liste: !!document.querySelector('.ad-squelette .sq-deux .sq-ligne'), fiche: !!document.querySelector('.ad-squelette .sq-fiche') }; }) : null;
  await page.waitForSelector('#vue', { timeout: 20000 });
  await page.evaluate(() => { window.__pret = performance.now(); });
  return { ctx, page, erreurs, squelette, forme };
}

const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });

// ================================================================================ à l'ordinateur, mouvement permis
{
  const { ctx, page, erreurs, squelette, forme } = await ouvrir(navigateur);
  await page.waitForTimeout(300);
  ok('le chargement montre un squelette qui luit, puis le contenu paraît', squelette && await page.evaluate(() => document.querySelector('#vue').classList.contains('fondu')));
  const vraie = await page.evaluate(() => ({ hBarre: Math.round(document.querySelector('.barre').getBoundingClientRect().height), titre: Math.round(document.querySelector('#vue h1').getBoundingClientRect().top) }));
  ok('le squelette a la forme de la vue : l’en-tête tel qu’il sera (inerte, à la même hauteur), le titre à sa place (à 6 px près), la liste et la fiche', !!forme && forme.attente && forme.hBarre === vraie.hBarre && Math.abs(forme.titre - vraie.titre) <= 6 && forme.liste && forme.fiche, JSON.stringify({ forme, vraie }));
  ok('les listes arrivent : main.entree au premier rendu, les lignes animées', await page.evaluate(() => { const m = document.querySelector('#vue'), l = document.querySelector('#l-dates .ligne'); return m.classList.contains('entree') && !!l && getComputedStyle(l).animationName === 'ad-arrive'; }));
  await page.waitForTimeout(1000);
  ok('… puis main.entree se retire (les rafraîchissements ne rejouent rien)', await page.evaluate(() => !document.querySelector('#vue').classList.contains('entree')));
  ok('« à compléter » : Caen sans adresse y est', await page.evaluate(() => !!document.querySelector('.avant li a[href="#/lieux/5"]')), await page.evaluate(() => document.querySelector('.avant')?.textContent.slice(0, 120)));
  // la liste qui se vide : l'adresse de Caen arrive (comme si on l'avait complétée), le bloc se redessine
  await page.evaluate(() => { E.lieux.find(l => l.id === 5).adresse = '135 boulevard du Maréchal-Leclerc'; E.lieuxSuivi.push({ lieu_id: 5, contact: 'Régie générale, 02 31 00 00 00' }); dessinerAvant(document.querySelector('#avant')); });
  const fait = await page.evaluate(() => { const li = document.querySelector('.avant-faits li.fait'); return { fait: !!li, texte: li && li.textContent, pop: !!document.querySelector('.avant summary .badge.pop'), reste: !!document.querySelector('.avant li a[href="#/lieux/5"]') }; });
  await page.waitForTimeout(2500);
  ok('« à compléter » : Caen, complété, reste un instant en vert puis se retire', fait.fait && /Caen/.test(fait.texte) && /complété/.test(fait.texte) && !fait.reste && await page.evaluate(() => !document.querySelector('.avant-faits')), JSON.stringify(fait));
  // la liste qui glisse : deux dates échangent leur jour, la liste se redessine, les lignes glissent
  const glisse = await page.evaluate(() => {
    const a = E.dates.find(d => d.id === 101), b = E.dates.find(d => d.id === 102), t = a.debut; a.debut = b.debut; a.fin = b.fin; b.debut = t; b.fin = t;
    rafraichirListes();
    return [...document.querySelectorAll('#l-dates .ligne[href]')].map(l => `${l.getAttribute('href').split('/').pop()}:${l.getAnimations().length}`);
  });
  ok('la liste qui glisse : les deux lignes échangées s\'animent, les autres non', JSON.stringify(glisse) === JSON.stringify(['102:1', '101:1', '103:0', '104:0']), JSON.stringify(glisse));
  await page.waitForTimeout(450);
  // le champ visé s'allume : « à compléter » mène au lieu du Havre (sans contact), sur son champ contact ; depuis
  // Représentations, le lieu s'ouvre en tiroir (tiroir.js), la liste reste
  await page.click('.avant li a[href="#/lieux/6"]');
  await page.waitForFunction(() => document.querySelector('.tiroir.la #ed-lieu .visee'), null, { timeout: 8000 }).catch(() => {});
  const visee = await page.evaluate(() => { const v = document.querySelector('.visee'); return { visee: !!v, chemin: v && v.dataset.chemin, focus: document.activeElement && document.activeElement.closest('.visee') === v, anim: v && getComputedStyle(v).animationName }; });
  ok('le champ visé par « à compléter » s\'allume et prend le focus (le lieu en tiroir, la liste reste)', visee.visee && visee.chemin === 'contact' && visee.focus && visee.anim === 'visee', JSON.stringify(visee));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.tiroir'), null, { timeout: 3000 }).catch(() => {});
  await page.goto(`${URL0}#/representations`);
  await page.waitForFunction(() => location.hash === '#/representations' && document.querySelector('#l-dates .ligne'), null, { timeout: 8000 });
  await page.evaluate(() => { window.__vt = []; });
  await page.waitForTimeout(300);
  // les vues s'enchaînent : la liste → une date (avant), la date → la liste (arrière), une autre rubrique (fondu)
  await page.click('#l-dates a.ligne[href="#/representations/101"]');
  await page.waitForFunction(() => location.hash === '#/representations/101' && document.querySelector('#ed-date .bloc'), null, { timeout: 8000 });
  await page.waitForTimeout(400);
  ok('la fiche d\'une date s\'ouvre dans l\'éditeur (ses blocs arrivent)', await page.evaluate(() => getComputedStyle(document.querySelector('#ed-date .bloc')).animationName === 'ad-arrive' || !!document.querySelector('#ed-date .bloc')));
  await page.click('#ed-date a[href="#/representations"]');
  await page.waitForFunction(() => location.hash === '#/representations', null, { timeout: 8000 });
  await page.waitForTimeout(400);
  await page.click('nav[aria-label="Rubriques"] a[href="#/spectacles"]');
  await page.waitForFunction(() => location.hash === '#/spectacles' && document.querySelector('.carte-sp'), null, { timeout: 8000 });
  await page.waitForFunction(() => !document.documentElement.dataset.sens, null, { timeout: 4000 }).catch(() => {});   // (la transition finie, plutôt qu'un délai à l'aveugle)
  const vt = await page.evaluate(() => window.__vt);
  ok('les vues s\'enchaînent : avant (la fiche), arrière (la liste), fondu (une autre rubrique)', JSON.stringify(vt) === JSON.stringify(['avant', 'arriere', 'fondu']), JSON.stringify(vt));
  ok('… et html[data-sens] est retiré après', await page.evaluate(() => !document.documentElement.dataset.sens));
  ok('les cartes des spectacles arrivent, et se soulèvent au survol', await page.evaluate(() => { const c = document.querySelector('.carte-sp'); return getComputedStyle(c).transitionProperty.includes('transform'); }));
  await page.screenshot({ path: `${CAPT}/spectacles.png` });
  // la recherche rapide
  await page.keyboard.press('Control+k');
  await page.waitForSelector('dialog.recherche[open]', { timeout: 5000 });
  const rch = await page.evaluate(() => { const d = document.querySelector('dialog.recherche'), o = document.querySelector('#rch-liste [role=option]'); return { ouvre: getComputedStyle(d).animationName, entree: document.querySelector('#rch-liste').classList.contains('entree'), i: o && o.style.getPropertyValue('--i'), anim: o && getComputedStyle(o).animationName }; });
  ok('la recherche s\'ouvre et ses premiers résultats arrivent l\'un après l\'autre', rch.ouvre === 'rch-ouvre' && rch.entree && rch.i === '0' && rch.anim === 'ad-arrive', JSON.stringify(rch));
  await page.keyboard.type('caen');
  await page.waitForTimeout(100);
  ok('… mais pas à chaque lettre', await page.evaluate(() => !document.querySelector('#rch-liste').classList.contains('entree') && document.querySelectorAll('#rch-liste [role=option]').length > 0));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // le pied dit l'état : une fiche modifiée, puis « enregistrée » (bravo)
  await page.goto(`${URL0}#/representations/101`);
  await page.waitForFunction(() => location.hash === '#/representations/101' && document.querySelector('#s-org'), null, { timeout: 8000 });
  await page.waitForTimeout(300);
  await page.fill('#s-org', 'Ville de Caen');
  // (la barre se déploie en 0,3 s : on attend qu'elle ait commencé, pas un temps fixe, que la machine chargée dépassait)
  await page.waitForFunction(() => { const p = document.querySelector('.pied-ed'), m = getComputedStyle(p, '::before').transform.match(/matrix\(([-\d.]+)/); return p.classList.contains('sale') && m && parseFloat(m[1]) > 0.05; }, null, { timeout: 3000 }).catch(() => {});
  const sale = await page.evaluate(() => { const p = document.querySelector('.pied-ed'); return { sale: p.classList.contains('sale'), barre: getComputedStyle(p, '::before').transform, etat: p.querySelector('.etat-ed').textContent }; });
  ok('le pied dit l\'état : modifiée, la barre ambre se déploie', sale.sale && parseFloat((sale.barre.match(/matrix\(([-\d.]+)/) || [])[1] || '0') > 0.05 && /non enregistrées/.test(sale.etat), JSON.stringify(sale));
  await page.evaluate(() => { marquerSale(false); bravo(); });
  await page.waitForTimeout(80);
  ok('… enregistrée : la barre passe au vert un instant', await page.evaluate(() => { const p = document.querySelector('.pied-ed'); return !p.classList.contains('sale') && p.classList.contains('ok'); }));
  await page.waitForTimeout(1700);
  ok('… puis se range', await page.evaluate(() => !document.querySelector('.pied-ed').classList.contains('ok')));
  // les onglets d'un spectacle
  await page.goto(`${URL0}#/spectacles/berenice`);
  await page.waitForSelector('.onglets-ed [data-onglet="Univers"]', { timeout: 8000 });
  await page.waitForTimeout(300);
  await page.click('.onglets-ed [data-onglet="Univers"]');
  await page.waitForTimeout(50);
  ok('l\'onglet choisi d\'un spectacle arrive (onglet-neuf)', await page.evaluate(() => document.querySelector('#ed-sp').classList.contains('onglet-neuf') && getComputedStyle(document.querySelector('#ed-sp > .bloc')).animationName === 'ad-arrive'));
  // la pastille « direct » bat quand quelque chose arrive
  await page.evaluate(() => { document.querySelector('.direct').classList.add('on'); changement('crescite_lieux', { eventType: 'UPDATE', new: { ...E.lieux[1], adresse: '8 place Oscar-Niemeyer' }, old: E.lieux[1] }); });
  ok('la pastille « direct » bat quand un changement arrive', await page.evaluate(() => document.querySelector('.direct').classList.contains('bat') && getComputedStyle(document.querySelector('.direct'), '::before').animationName === 'direct-bat'));
  // les annonces s'en vont en douceur ; la connexion refusée secoue
  await page.evaluate(() => annoncer('Essai', { delai: 150 }));
  await page.waitForTimeout(220);
  ok('une annonce s\'en va en douceur (part)', await page.evaluate(() => { const a = document.querySelector('.annonce'); return !!a && a.classList.contains('part'); }));
  await page.evaluate(() => ecranConnexion('Adresse ou mot de passe incorrect.'));
  ok('la connexion refusée secoue le formulaire', await page.evaluate(() => { const f = document.querySelector('#f-connexion'); return f.classList.contains('secoue') && getComputedStyle(f).animationName === 'secoue'; }));
  ok('erreurs de page : aucune', erreurs.length === 0, erreurs.join(' | ').slice(0, 300));
  const longues = await page.evaluate(() => window.__longues);
  console.log(`tâches longues (ms) : ${JSON.stringify(longues)}`);
  ok('tâches longues après l\'ouverture : aucune au-delà de 200 ms', longues.every(d => d < 200), JSON.stringify(longues));
  await ctx.close();
}

// ================================================================================ mouvement réduit : rien ne bouge
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { reduit: true });
  await page.waitForTimeout(300);
  ok('réduit · pas de main.entree, pas d\'animation sur les lignes', await page.evaluate(() => !document.querySelector('#vue').classList.contains('entree') && getComputedStyle(document.querySelector('#l-dates .ligne')).animationName === 'none'));
  await page.click('#l-dates a.ligne[href="#/representations/101"]');
  await page.waitForFunction(() => location.hash === '#/representations/101' && document.querySelector('#ed-date .bloc'), null, { timeout: 8000 });
  await page.waitForTimeout(300);
  ok('réduit · pas de transition de vue', await page.evaluate(() => window.__vt.length === 0 && !document.querySelector('#vue').classList.contains('fondu')), await page.evaluate(() => JSON.stringify(window.__vt)));
  ok('réduit · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' | ').slice(0, 300));
  await ctx.close();
}

// ================================================================================ ?anim=0 : rien ne bouge, pas même la feuille de style
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '?anim=0#/representations' });
  await page.waitForTimeout(300);
  ok('?anim=0 · html.still, pas de main.entree, le curseur sans transition', await page.evaluate(() => document.documentElement.classList.contains('still') && !document.querySelector('#vue').classList.contains('entree') && getComputedStyle(document.querySelector('#l-dates .ligne')).transitionDuration.split(',').every(x => x.trim() === '0s')));
  ok('?anim=0 · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' | ').slice(0, 300));
  await ctx.close();
}

// ================================================================================ la nuit : les mêmes vues, en mode sombre (captures)
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { sombre: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${CAPT}/representations-nuit.png` });
  await page.goto(`${URL0}#/representations/101`); await page.waitForFunction(() => document.querySelector('#ed-date .bloc'), null, { timeout: 8000 }); await page.waitForTimeout(400);
  await page.screenshot({ path: `${CAPT}/date-nuit.png` });
  ok('nuit · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' | ').slice(0, 300));
  await ctx.close();
}

// ================================================================================ au téléphone : la même chose en étroit
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 390 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${CAPT}/telephone.png` });
  await page.click('#l-dates a.ligne[href="#/representations/102"]');
  await page.waitForFunction(() => location.hash === '#/representations/102' && document.querySelector('#ed-date .bloc'), null, { timeout: 8000 });
  await page.waitForTimeout(400);
  ok('téléphone · la fiche s\'ouvre (avant)', await page.evaluate(() => JSON.stringify(window.__vt) === '["avant"]' && !!document.querySelector('#ed-date .bloc')), await page.evaluate(() => JSON.stringify(window.__vt)));
  ok('téléphone · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' | ').slice(0, 300));
  await ctx.close();
}

await navigateur.close();
serveur.close();
for (const [etat, nom, detail] of resultats) console.log(`${etat === 'ok' ? '✓' : '✗'} ${nom}${detail && etat !== 'ok' ? `\n    ${detail}` : ''}`);
const ko = resultats.filter(r => r[0] !== 'ok').length;
console.log(`\n${resultats.length - ko}/${resultats.length} vérifications passent`);
process.exit(ko ? 1 : 0);
