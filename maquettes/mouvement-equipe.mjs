// Le mouvement de l'espace de l'équipe (equipe/index.html, equipe.js) : les dix effets, vérifiés dans Chromium.
//   python3 maquettes/build.py synthese && node maquettes/mouvement-equipe.mjs
// L'application s'ouvre hors ligne, sur une saison fictive gardée en cache (la session et la mémoire que equipe.js relit :
// aucune donnée réelle, aucun appel à la base, qui est coupée) ; au téléphone (tactile), à une heure figée (14 h,
// aujourd'hui : une séance en cours, une autre dans 1 h 35), puis avec le mouvement réduit, puis à l'ordinateur. Chaque
// vérification dit ce qu'elle regarde ; les captures vont dans maquettes/dist/shots-equipe/. Sort en erreur si une
// vérification manque. Demande Playwright et Chromium (PLAYWRIGHT_MODULE, CHROMIUM, comme onglets.mjs).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs');

const ICI = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ICI, 'dist');
const CAPT = path.join(DIST, 'shots-equipe');
if (!fs.existsSync(path.join(DIST, 'equipe', 'index.html'))) { console.error('maquettes/dist/equipe manque : python3 maquettes/build.py synthese d’abord'); process.exit(2); }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml' };
const serveur = http.createServer((req, res) => {
  const p = path.join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(DIST) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => serveur.listen(0, '127.0.0.1', r));
const PORT = serveur.address().port, URL0 = `http://127.0.0.1:${PORT}/equipe/index.html`;

// ---- la saison fictive : aujourd'hui à Caen (une séance en cours, une autre dans 1 h 35), puis Le Havre et Paris
const d0 = new Date(); d0.setHours(14, 0, 0, 0);
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plus = n => { const d = new Date(d0); d.setDate(d.getDate() + n); return iso(d); };
const AUJ = iso(d0);
const berenice = { id: 1, titre: 'Bérénice', slug: 'berenice', photo: 'essai.jpg', univers: { couleurs: { scene: '#7a2a5a', fond: '#1b0f18', texte: '#ffffff', accent: '#f0b84a' } } };
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
    { id: 3, type: 'date', titre: 'Nouvelle date', texte: 'Paris, le mois prochain.', cree_le: new Date(d0 - 2 * 864e5).toISOString(), lue_le: new Date(d0 - 864e5).toISOString() },
  ], notifsEtat: 'ok',
};
const SESSION = { access_token: 'x', refresh_token: 'y', token_type: 'bearer', expires_in: 864000, expires_at: Math.floor(d0 / 1000) + 864000, user: { id: 'u-essai', email: 'camille@example.org', aud: 'authenticated' } };
const INIT = `localStorage.setItem('crescite-equipe', ${JSON.stringify(JSON.stringify(SESSION))});
localStorage.setItem('crescite-equipe-donnees', ${JSON.stringify(JSON.stringify(MEMOIRE))});
window.__longues = []; window.__pret = 0;
try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (window.__pret && e.startTime > window.__pret) window.__longues.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
`;

const resultats = [];
const ok = (nom, v, detail = '') => { resultats.push([v ? 'ok' : 'KO', nom, detail]); };

// les touchers, par le protocole (Playwright n'a que le tap)
async function toucher(page, points, { pas = 8, dt = 16 } = {}) {
  const cdp = await page.context().newCDPSession(page);
  const [x0, y0] = points[0], [x1, y1] = points[points.length - 1];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= pas; i++) {
    const t = i / pas;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t }] });
    await page.waitForTimeout(dt);
  }
  return cdp;
}
async function lacher(cdp) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach(); }

async function ouvrir(navigateur, { reduit = false, hash = '#/saison', sombre = false } = {}) {
  const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: reduit ? 'reduce' : 'no-preference', colorScheme: sombre ? 'dark' : 'light', locale: 'fr-FR', timezoneId: 'UTC' });
  await ctx.route(/supabase\.co|fonts\.g/, r => (/crescite_notifications/.test(r.request().url()) && r.request().method() === 'PATCH' ? r.fulfill({ status: 204, body: '' }) : r.abort()));
  const page = await ctx.newPage();
  if (process.env.CPU) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +process.env.CPU }); }   // CPU=4 : un téléphone lent
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|net::ERR/i.test(m.text())) erreurs.push(m.text()); });
  await page.clock.install({ time: d0 });
  await page.addInitScript(INIT);
  await page.goto(hash.startsWith('?') ? `${URL0}${hash}` : `${URL0}${hash}`);
  await page.waitForSelector('#app > .appli', { timeout: 15000 });
  await page.waitForSelector('#contenu .heros, #contenu .titre-vue', { timeout: 15000 });
  await page.evaluate(() => { window.__pret = performance.now(); });
  return { ctx, page, erreurs };
}

// sans le retour natif de Chromium au bord de l'écran : c'est le geste de l'application qu'on mesure
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--disable-features=OverscrollHistoryNavigation'] });
fs.mkdirSync(CAPT, { recursive: true });

// ================================================================================ au téléphone, mouvement permis
{
  const { ctx, page, erreurs } = await ouvrir(navigateur);
  await page.waitForTimeout(400);
  // 2. la lampe « En scène » (la séance de 13 h 30 est en cours à 14 h), les chiffres en span
  ok('2 · héros : « En scène » avec sa lampe', await page.$('.heros .decompte-grand .lampe') !== null, await page.$eval('.heros .decompte-grand', e => e.textContent.trim().replace(/\s+/g, ' ')).catch(() => ''));
  ok('2 · la lueur du héros respire (animation)', await page.$eval('.heros-motif', e => getComputedStyle(e).animationName).catch(() => '') === 'respire');
  ok('10 · la photo du héros dérive', await page.$eval('.heros-photo img', e => getComputedStyle(e).animationName).catch(() => '') === 'derive');
  // 3. le jour J : le trait « maintenant » à mi-course, « dans 1 h 35 » sous la prochaine
  const frise = await page.evaluate(() => {
    const li = document.querySelector('.jourj .frise li.maintenant'), s = document.querySelector('.jourj .frise .dans');
    return { avance: li && li.style.getPropertyValue('--avance'), dans: s && s.textContent, pseudo: li && getComputedStyle(li, '::after').height };
  });
  ok('3 · le trait « maintenant » à mi-course (--avance 0,5)', frise.avance === '0.500', JSON.stringify(frise));
  ok('3 · « dans 1 h 35 » sous la prochaine étape', (frise.dans || '').replace(/ /g, ' ') === 'dans 1 h 35', frise.dans);
  // 13. le bandeau d'état (hors connexion) entre, et ne se redessine pas tant qu'il ne change pas
  const bandeau = await page.evaluate(() => { const m = document.querySelector('.bandeau-etat .message'); return { la: !!m, anim: m && getComputedStyle(m).animationName, h: !!document.querySelector('#bandeau-etat').dataset.h }; });
  ok('13 · le bandeau d\'état entre une fois (monte) et garde sa signature', bandeau.la && bandeau.anim === 'monte' && bandeau.h, JSON.stringify(bandeau));
  ok('15 · les mois de la saison restent en haut', await page.$eval('.o-suite .mois', e => getComputedStyle(e).position) === 'sticky');
  // le bouton « Installer » de la barre : visible au téléphone dans le navigateur, sa fenêtre s'ouvre et se ferme
  const inst = await page.evaluate(() => { const b = document.querySelector('[data-installer-barre]'); const r = b.getBoundingClientRect(); return { la: !!b && !b.hidden && getComputedStyle(b).display !== 'none', largeur: Math.round(r.width), texte: b.textContent.trim() }; });
  await page.click('[data-installer-barre]');
  await page.waitForTimeout(100);
  const modale = await page.evaluate(() => { const m = document.querySelector('#modale-installation .modale-boite'); return { la: !!m, titre: m && m.querySelector('h2').textContent.trim(), focus: document.activeElement && document.activeElement.closest('#modale-installation') !== null }; });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  ok('« Installer » reste dans la barre au téléphone, ouvre la marche à suivre, Échap la ferme et rend le focus', inst.la && inst.largeur > 70 && /Installer/.test(inst.texte) && modale.la && /Installer l’application/.test(modale.titre) && modale.focus && await page.evaluate(() => !document.querySelector('#modale-installation') && document.activeElement === document.querySelector('[data-installer-barre]')), JSON.stringify({ inst, modale }));
  // 5. l'accueil garde la couleur de la saison
  ok('5 · accueil : pas de teinte', await page.$eval('.appli', e => !e.hasAttribute('data-teinte')));
  // 6. la carte : bras et lieux portent leurs dates ; survoler un billet allume son bras
  await page.waitForSelector('.o-carte .carte-tournee svg .bras[data-dates]', { timeout: 5000 }).catch(() => {});
  const carte = await page.evaluate(() => ({ bras: document.querySelectorAll('.o-carte .bras[data-dates]').length, lieux: document.querySelectorAll('.o-carte a.lieu-carte[data-dates]').length, routes: document.querySelectorAll('.o-carte .route').length }));
  ok('6 · carte de la saison : bras et lieux avec data-dates, sans route pointillée', carte.bras >= 3 && carte.lieux >= 3 && carte.routes === 0, JSON.stringify(carte));
  await page.hover('#billet-102').catch(() => {});
  await page.waitForTimeout(80);
  const allume = await page.evaluate(() => ({ bras: document.querySelectorAll('.o-carte .bras.allume').length, point: document.querySelectorAll('.o-carte a.lieu-carte.allume').length, active: !!document.querySelector('.o-carte .carte-tournee.cible-active'), opacite: getComputedStyle(document.querySelector('.o-carte .bras:not(.allume)') || document.body).opacity }));
  ok('6 · survol du billet du Havre : son bras et son point s\'allument, les autres s\'effacent', allume.bras === 1 && allume.point === 1 && allume.active, JSON.stringify(allume));
  await page.mouse.move(5, 400); await page.waitForTimeout(80);
  ok('6 · le survol parti : tout s\'éteint', await page.evaluate(() => !document.querySelector('.allume, .cible-active')));
  await page.screenshot({ path: `${CAPT}/accueil.png`, fullPage: false });
  // 2. le compte roule : à 14 h 31 la séance est finie, le compte passe à « dans 1 h 04 »
  await page.clock.runFor(31 * 60 * 1000);
  await page.waitForTimeout(50);
  const compte = await page.evaluate(() => { const el = document.querySelector('.heros .decompte-grand'); return { roule: el.classList.contains('roule'), texte: el.textContent.trim().replace(/\s+/g, ' '), d: el.querySelectorAll('.d').length, anim: getComputedStyle(el.querySelector('.d') || el).animationName }; });
  ok('2 · à 14 h 31 le compte roule (classe roule, chiffres en span animés)', compte.roule && compte.d >= 3 && compte.anim === 'roule', JSON.stringify(compte));
  ok('3 · la première étape est passée, le trait a quitté la frise', await page.evaluate(() => !document.querySelector('.jourj .frise li.maintenant') && !!document.querySelector('.jourj .frise li.passe')));

  // ---- la page d'une date : teinte, route, kilomètres, entrée
  await page.click('#billet-102 .lien-etendu');
  await page.waitForFunction(() => location.hash === '#/date/102' && document.querySelector('.heros-page'), null, { timeout: 8000 });
  await page.waitForTimeout(700);
  const teinte = await page.evaluate(() => { const a = document.querySelector('.appli'); return { teinte: a.dataset.teinte, t: a.style.getPropertyValue('--teinte'), curseur: getComputedStyle(document.querySelector('.nav-curseur')).backgroundColor, icone: getComputedStyle(document.querySelector('.nav-item[aria-current] .nav-icone')).color, retour: getComputedStyle(document.querySelector('.barre-haut .retour')).color }; });
  ok('5 · page de la date : l\'application prend la teinte du spectacle', teinte.teinte === '#1f5f8b' && !!teinte.t, JSON.stringify(teinte));
  const mini = await page.evaluate(() => ({ route: document.querySelectorAll('.bloc-lieu .route').length, anim: (x => x && getComputedStyle(x).animationName)(document.querySelector('.bloc-lieu .route')), km: (x => x && x.textContent)(document.querySelector('[data-compter][data-route]')), rafraichi: document.querySelector('main').classList.contains('rafraichi'), pose: getComputedStyle(document.querySelector('.heros-page .heros-corps > :nth-child(2)')).animationName }));
  ok('6 · carte de la date : la route pointillée avance ; les km se comptent', mini.route === 1 && mini.anim === 'roule-route' && /^\d/.test(mini.km || ''), JSON.stringify(mini));
  ok('4 · la page se pose (les lignes du héros montent) et n\'est pas marquée rafraîchie', mini.pose === 'monte' && !mini.rafraichi, JSON.stringify({ pose: mini.pose, rafraichi: mini.rafraichi }));
  await page.screenshot({ path: `${CAPT}/date.png`, fullPage: false });
  // 1. le retour au doigt : depuis le bord gauche, à droite
  const avantH = await page.evaluate(() => location.hash);
  let cdp = await toucher(page, [[6, 500], [230, 505]], { pas: 10, dt: 20 });
  const pendant = await page.evaluate(() => ({ glisse: document.querySelector('main').classList.contains('glisse'), tr: document.querySelector('main').style.transform, retour: document.documentElement.style.getPropertyValue('--retour') }));
  await lacher(cdp);
  await page.waitForFunction(() => location.hash === '#/saison', null, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(400);
  const apresH = await page.evaluate(() => ({ hash: location.hash, tr: document.querySelector('main').style.transform, cls: document.querySelector('main').className, retour: document.documentElement.style.getPropertyValue('--retour') }));
  ok('1 · le retour au doigt : la vue suit le pouce puis la saison revient, propre', avantH === '#/date/102' && pendant.glisse && /translateX/.test(pendant.tr) && apresH.hash === '#/saison' && !apresH.tr && !/glisse/.test(apresH.cls) && !apresH.retour, JSON.stringify({ pendant, apresH }));
  // un glissé trop court revient en place
  await page.click('#billet-102 .lien-etendu');
  await page.waitForFunction(() => location.hash === '#/date/102', null, { timeout: 8000 });
  await page.waitForTimeout(500);
  cdp = await toucher(page, [[6, 500], [60, 502]], { pas: 6, dt: 60 });
  await lacher(cdp);
  await page.waitForTimeout(400);
  ok('1 · un glissé trop court : la page reste', await page.evaluate(() => location.hash === '#/date/102' && !document.querySelector('main').style.transform));
  // un défilement vertical depuis le bord ne déclenche rien
  cdp = await toucher(page, [[6, 500], [12, 300]], { pas: 6, dt: 20 });
  await lacher(cdp);
  await page.waitForTimeout(300);
  ok('1 · un défilement vertical depuis le bord : rien', await page.evaluate(() => location.hash === '#/date/102' && !document.querySelector('main').classList.contains('glisse')));
  await page.evaluate(() => window.scrollTo(0, 0));
  // 10. tirer pour rafraîchir : la pieuvre s'étire
  cdp = await toucher(page, [[200, 200], [200, 420]], { pas: 10, dt: 20 });
  const tire = await page.evaluate(() => { const t = document.querySelector('#tirer'); return { pieuvre: !!t.querySelector('.pieuvre svg'), icone: !!t.querySelector('.ic'), etire: t.style.getPropertyValue('--etire'), tire: t.classList.contains('tire'), pret: t.classList.contains('pret'), nage: getComputedStyle(t.querySelector('.pieuvre')).animationName, tr: t.style.transform }; });
  await lacher(cdp);
  await page.waitForTimeout(100);
  const charge = await page.evaluate(() => { const t = document.querySelector('#tirer'); return { charge: t.classList.contains('charge'), nage: getComputedStyle(t.querySelector('.pieuvre')).animationName }; });
  ok('10 · tirer : la pieuvre remplace la flèche, s\'étire (--etire) et ondule une fois prête', tire.pieuvre && !tire.icone && +tire.etire > 0.5 && tire.pret && tire.nage === 'nage' && !/rotate/.test(tire.tr), JSON.stringify(tire));
  ok('10 · lâchée : elle nage pendant le rafraîchissement', charge.charge && charge.nage === 'nage', JSON.stringify(charge));
  // la base coupée fait attendre supabase-js une dizaine de secondes (comme avant ces effets) : elle se range ensuite
  const rangee = await page.waitForFunction(() => { const t = document.querySelector('#tirer'); return !t.classList.contains('charge') && getComputedStyle(t).opacity === '0'; }, null, { timeout: 20000 }).then(() => true).catch(() => false);
  ok('10 · puis elle se range', rangee, await page.evaluate(() => document.querySelector('#tirer').className));
  // 4. le talon du billet se décolle à la pression (règle en place)
  await page.goto(`${URL0}#/saison`); await page.waitForSelector('#billet-102', { timeout: 8000 });
  await page.waitForTimeout(300);
  ok('4 · le talon du billet : règle :active sur .billet-pied', await page.evaluate(() => [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r.cssText.includes('.billet:has(.lien-etendu:active) .billet-pied')); } catch (e) { return false; } })));
  // 14. la page d'un spectacle se pose : sa photo se cale puis dérive, ses lignes montent
  await page.goto(`${URL0}#/spectacles/berenice`); await page.waitForSelector('.tete-spectacle', { timeout: 8000 });
  await page.waitForTimeout(200);
  const ts = await page.evaluate(() => ({ photo: getComputedStyle(document.querySelector('.ts-photo img')).animationName, corps: getComputedStyle(document.querySelector('.ts-corps > :nth-child(2)')).animationName, clip: getComputedStyle(document.querySelector('.ts-photo')).overflow }));
  ok('14 · la page d\'un spectacle se pose (pose puis dérive, lignes qui montent, photo cadrée)', /pose/.test(ts.photo) && /derive/.test(ts.photo) && ts.corps === 'monte' && ts.clip === 'hidden', JSON.stringify(ts));
  // 9. les notifications : en-têtes épinglés, glisser pour lire, tout marquer lu
  await page.goto(`${URL0}#/notifications`);
  await page.waitForSelector('.liste-notifs .notif.non-lue', { timeout: 8000 });
  await page.waitForTimeout(300);
  ok('9 · les en-têtes des jours sont épinglés', await page.$eval('.notifs-jour', e => getComputedStyle(e).position) === 'sticky');
  const n1 = await page.$('.liste-notifs .notif.non-lue');
  await n1.scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
  const b = await n1.boundingBox();
  const cible = await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return el && (el.className || el.tagName); }, [b.x + b.width - 30, b.y + b.height / 2]);
  cdp = await toucher(page, [[b.x + b.width - 30, b.y + b.height / 2], [b.x + b.width - 260, b.y + b.height / 2 + 2]], { pas: 10, dt: 20 });
  const glisse = await page.evaluate(() => { const a = document.querySelector('.liste-notifs .notif.glisse'); const li = a && a.parentElement; return { glisse: !!a, tr: a && a.style.transform, pret: li && li.classList.contains('pret'), lu: li && getComputedStyle(li, '::after').opacity }; });
  await lacher(cdp);
  await page.waitForTimeout(600);
  const apresN = await page.evaluate(() => ({ nonLues: document.querySelectorAll('.liste-notifs .notif.non-lue').length, hash: location.hash }));
  ok('9 · glisser une notification à gauche : « Lu » se découvre, elle se marque lue, sans s\'ouvrir', glisse.glisse && /translateX\(-/.test(glisse.tr) && glisse.pret && glisse.lu === '1' && apresN.nonLues === 1 && apresN.hash === '#/notifications', JSON.stringify({ glisse, apresN, b, cible }));
  await page.click('[data-tout-lu]');
  await page.waitForTimeout(100);
  const balaye = await page.evaluate(() => ({ balaye: document.querySelectorAll('.liste-notifs .notif.balaye').length, nonLues: document.querySelectorAll('.liste-notifs .notif.non-lue').length, anim: (x => x && getComputedStyle(x).animationName)(document.querySelector('.notif.balaye')) }));
  ok('9 · « tout marquer comme lu » : la dernière non lue s\'éteint (balaye)', balaye.balaye === 1 && balaye.nonLues === 0 && balaye.anim === 'balaye', JSON.stringify(balaye));
  await page.screenshot({ path: `${CAPT}/notifications.png`, fullPage: false });
  // 12. la feuille de route en direct : une feuille fictive (le rendu de FEUILLE.html) posée dans la page, relue par majFrises
  await page.evaluate(() => {
    const j = new Date(), JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'], MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const titre = `${JOURS[j.getDay()]} ${j.getDate() === 1 ? '1er' : j.getDate()} ${MOIS[j.getMonth()]}`;
    document.querySelector('#contenu').insertAdjacentHTML('beforeend', `<div class="feuille-cadre"><article class="fdr"><h2 class="fdr-rub">Planning</h2><h3 class="fdr-jour">Lundi 2 mars</h3><p class="fdr-p">9h : montage</p>
      <h3 class="fdr-jour">${titre.charAt(0).toUpperCase()}${titre.slice(1)}</h3><p class="fdr-p">9h30 : départ de Rouen</p><p class="fdr-p">12h30-13h30 : déjeuner</p><p class="fdr-p">déjeuner : tout le monde</p><p class="fdr-p"><span class="g">15h35 : représentation</span></p><p class="fdr-p">17h : démontage</p></article></div>`);
  });
  await page.clock.runFor(30 * 1000);
  const direct = await page.evaluate(() => [...document.querySelectorAll('.feuille-cadre .fdr-p')].map(p => `${p.textContent.slice(0, 12)}|${p.className.replace('fdr-p', '').trim()}`));
  ok('12 · la feuille de route en direct : à 14 h 31, le matin est passé, le déjeuner aussi, la représentation attend', JSON.stringify(direct) === JSON.stringify(['9h : montage|', '9h30 : dépar|passe', '12h30-13h30 |passe', 'déjeuner : t|passe', '15h35 : repr|', '17h : démont|']), JSON.stringify(direct));
  await page.clock.runFor(70 * 60 * 1000);
  const direct2 = await page.evaluate(() => [...document.querySelectorAll('.feuille-cadre .fdr-p')].map(p => p.className.replace('fdr-p', '').trim()));
  ok('12 · à 15 h 41, la représentation se passe maintenant (« en ce moment »)', JSON.stringify(direct2) === JSON.stringify(['', 'passe', 'passe', 'passe', 'maintenant', '']) && await page.evaluate(() => getComputedStyle(document.querySelector('.fdr-p.maintenant'), '::after').content.includes('en ce moment')), JSON.stringify(direct2));
  // 7. l'heure changée : la classe fraiche n'est posée qu'avec une modification récente (ici aucune)
  await page.goto(`${URL0}#/date/101`); await page.waitForSelector('.bloc .horaires', { timeout: 8000 });
  ok('7 · sans changement récent, pas de lavis', await page.evaluate(() => !document.querySelector('.horaires li.fraiche')));
  // 8. la checklist : le bloc demande le septième script (absent hors ligne) ; la règle de la coche est en place
  ok('8 · la coche dessinée : règles en place', await page.evaluate(() => [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r.cssText.includes('.camion-item.coche .coche-svg path')); } catch (e) { return false; } })));
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
  const calme = await page.evaluate(() => ({ motif: getComputedStyle(document.querySelector('.heros-motif')).animationName, lampe: (x => x && getComputedStyle(x).animationName)(document.querySelector('.lampe')), route: !!document.querySelector('.route') }));
  ok('réduit · la lueur et la lampe ne battent pas', calme.motif === 'none' && (calme.lampe === 'none' || calme.lampe == null), JSON.stringify(calme));
  await page.clock.runFor(31 * 60 * 1000); await page.waitForTimeout(50);
  ok('réduit · le compte change sans rouler', await page.evaluate(() => { const el = document.querySelector('.heros .decompte-grand'); return !el.classList.contains('roule') && /1 h 04|1 h 04/.test(el.textContent); }));
  await page.click('#billet-102 .lien-etendu');
  await page.waitForFunction(() => location.hash === '#/date/102', null, { timeout: 8000 });
  await page.waitForTimeout(300);
  const redT = await page.evaluate(() => document.querySelector('.appli').dataset.teinte);
  const cdp = await toucher(page, [[6, 500], [230, 505]], { pas: 10, dt: 20 });
  const pendant = await page.evaluate(() => document.querySelector('main').classList.contains('glisse'));
  await lacher(cdp);
  await page.waitForTimeout(500);
  const redR = await page.evaluate(() => ({ hash: location.hash, teinte: document.querySelector('.appli').dataset.teinte, cls: document.querySelector('main').className }));
  ok('réduit · pas de retour au doigt (le bouton Retour reste)', !pendant && redR.hash === '#/date/102', JSON.stringify({ pendant, redR }));
  ok('réduit · la teinte du spectacle reste (ce n\'est pas du mouvement)', redT === '#1f5f8b', JSON.stringify({ redT }));
  ok('réduit · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' | ').slice(0, 300));
  await ctx.close();
}

// ================================================================================ ?anim=0 : rien ne bouge, pas même la feuille de style
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '?anim=0#/saison' });
  await page.waitForTimeout(300);
  ok('?anim=0 · html.still, la lueur ne respire pas, le curseur des onglets ne glisse pas', await page.evaluate(() => document.documentElement.classList.contains('still') && getComputedStyle(document.querySelector('.heros-motif')).animationName === 'none' && getComputedStyle(document.querySelector('.nav-curseur')).transitionDuration.split(',').every(x => x.trim() === '0s')));
  ok('?anim=0 · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' | ').slice(0, 300));
  await ctx.close();
}

// ================================================================================ la nuit : les mêmes vues, en mode sombre (captures)
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { sombre: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${CAPT}/accueil-nuit.png` });
  await page.goto(`${URL0}#/date/102`); await page.waitForSelector('.heros-page', { timeout: 8000 }); await page.waitForTimeout(400);
  await page.screenshot({ path: `${CAPT}/date-nuit.png` });
  await page.goto(`${URL0}#/notifications`); await page.waitForSelector('.liste-notifs', { timeout: 8000 }); await page.waitForTimeout(300);
  await page.screenshot({ path: `${CAPT}/notifications-nuit.png` });
  ok('nuit · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' | ').slice(0, 300));
  await ctx.close();
}

// ================================================================================ à l'ordinateur : le rail et la teinte
{
  const ctx = await navigateur.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference', locale: 'fr-FR', timezoneId: 'UTC' });
  await ctx.route(/supabase\.co|fonts\.g/, r => (/crescite_notifications/.test(r.request().url()) && r.request().method() === 'PATCH' ? r.fulfill({ status: 204, body: '' }) : r.abort()));
  const page = await ctx.newPage();
  const erreurs = []; page.on('pageerror', e => erreurs.push(String(e.message || e)));
  await page.clock.install({ time: d0 });
  await page.addInitScript(INIT);
  await page.goto(`${URL0}#/date/103`);
  await page.waitForSelector('.heros-page', { timeout: 15000 });
  await page.waitForTimeout(600);
  const t = await page.evaluate(() => ({ teinte: document.querySelector('.appli').dataset.teinte, onglet: getComputedStyle(document.querySelector('.nav-item[aria-current]')).color, fondCurseur: getComputedStyle(document.querySelector('.nav-curseur')).backgroundColor }));
  ok('ordinateur · la page de Bérénice teinte le rail', t.teinte === '#7a2a5a', JSON.stringify(t));
  ok('ordinateur · pas de bouton « Installer » dans la barre', await page.$eval('[data-installer-barre]', e => getComputedStyle(e).display === 'none'));
  await page.screenshot({ path: `${CAPT}/ordinateur-date.png` });
  ok('ordinateur · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' | ').slice(0, 300));
  await ctx.close();
}

await navigateur.close();
serveur.close();
for (const [etat, nom, detail] of resultats) console.log(`${etat === 'ok' ? '✓' : '✗'} ${nom}${detail && etat !== 'ok' ? `\n    ${detail}` : ''}`);
const ko = resultats.filter(r => r[0] !== 'ok').length;
console.log(`\n${resultats.length - ko}/${resultats.length} vérifications passent`);
process.exit(ko ? 1 : 0);
