// L'espace des salles (pro/) et la page de réponse (reponse/), vérifiés dans Chromium, hors ligne : leurs parcours (le code
// d'accès, l'espace d'une salle, ses documents et sa vidéo, un lien refusé ou une panne ; une proposition de dates, la
// réponse d'un bouton (en route, quitter la page pose la question) ou venue du courriel, une proposition close, l'alerte
// de tournée confirmée ou arrêtée, un lien manquant ou expiré), la charte (la nuit par défaut, les polices, la marque, le
// pied), les cibles de 44 px et rien qui déborde à 360 px.
//   python3 site/build.py && node site/salles-reponse.mjs
// Les fonctions crescite-pro et crescite-courriel sont simulées (aucune donnée réelle, aucun appel à la base) ; les
// polices de Google sont coupées (la charte se lit dans les familles demandées). Captures dans site/dist/shots-salles/.
// Demande Playwright et Chromium.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs');

const ICI = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(ICI, '..');
const DIST = path.join(ICI, 'dist');
const CAPT = path.join(DIST, 'shots-salles');
for (const f of ['pro/index.html', 'reponse/index.html', 'admin/logo.js']) if (!fs.existsSync(path.join(DIST, f))) { console.error(`site/dist/${f} manque : python3 site/build.py d’abord`); process.exit(2); }
fs.mkdirSync(CAPT, { recursive: true });
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const serveur = http.createServer((req, res) => {
  let chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (chemin.endsWith('/')) chemin += 'index.html';
  const p = path.join(DIST, chemin);
  if (!p.startsWith(DIST) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => serveur.listen(0, '127.0.0.1', r));
const RACINE = `http://127.0.0.1:${serveur.address().port}`;

// ---- les données fictives
const d0 = new Date(); d0.setHours(12, 0, 0, 0);
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plus = n => { const d = new Date(d0); d.setDate(d.getDate() + n); return iso(d); };
const J = c => c.repeat(40);                       // un jeton, une clé : 40 caractères
const BON = J('a'), EXPIRE = J('e'), PANNE = J('p'), VIDE = J('v');
const CODE = 'K7QM4TZPXW';                         // le code court de la même invitation (le dix-neuvième script)
const VIDEO = 'https://video.exemple.org/berenice-captation';
const ESPACE = {
  acces: { nom: 'Le Volcan', contact: 'Mme Leroux', expire_le: plus(7) },
  spectacles: [
    { id: 1, titre: 'Bérénice', sous_titre: 'd’après <em>Racine</em>', creation: 'création 2025', photo: null, univers: { couleurs: { scene: '#7a2a5a', accent: '#f0b84a' } },
      documents: [{ id: 11, titre: 'Captation intégrale', type: 'autre', pour: 'salles', lien: true }, { id: 12, titre: 'Dossier de diffusion', type: 'dossier', pour: 'public', lien: false },
        { id: 13, titre: 'Fiche technique', type: 'fiche_technique', pour: 'public', lien: false }] },
    { id: 2, titre: 'La Folle Idée', sous_titre: null, creation: null, photo: null, univers: { couleurs: { scene: '#1f5f8b', accent: '#8fd3ff' } }, documents: [] },
  ],
};
const propositions = () => ({
  [J('r')]: { prenom: 'Camille', proposition: { id: 1, titre: 'Option : Théâtre de Flers', statut: 'ouverte', spectacle: 'Bérénice', message: 'Deux jours de montage, puis la première.' },
    jours: [{ id: 11, debut: `${plus(40)}T00:00:00+02:00`, fin: `${plus(42)}T00:00:00+02:00`, journee: true, reponse: null }, { id: 12, debut: `${plus(45)}T18:00:00+02:00`, fin: `${plus(45)}T23:00:00+02:00`, journee: false, reponse: 'oui' }] },
  [J('c')]: { prenom: 'Jean', proposition: { id: 2, titre: 'Résidence à Caen', statut: 'close', spectacle: null, message: null }, jours: [{ id: 21, debut: `${plus(60)}T00:00:00+02:00`, fin: `${plus(61)}T00:00:00+02:00`, journee: true, reponse: 'non' }] },
});
let PROPS = propositions();
const alertes = () => ({
  [J('n')]: { alerte: { secteur: 'Calvados (14) · Caen', spectacle: null, active: true, confirmee: false }, attente: [{ secteur: 'Calvados (14) · Caen', spectacle: null }, { secteur: 'Seine-Maritime (76)', spectacle: 'Bérénice' }], autres: 0 },
  [J('t')]: { alerte: { secteur: 'Orne (61) · Flers', spectacle: 'La Folle Idée', active: true, confirmee: true }, attente: [], autres: 2 },
});
let ALERTES = alertes();
let pannes = 0;                                       // la fonction échoue tant que pannes > 0
let lenteur = 0;                                      // la fonction répond après tant de millisecondes
const APPELS = [];

const resultats = [];
const ok = (nom, v, detail = '') => { resultats.push([v ? 'ok' : 'KO', nom, detail]); };
const texte = async (page, sel) => (await page.$eval(sel, e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => ''));
const compte = async (page, sel) => page.$$eval(sel, xs => xs.length);
async function calme(page) {
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})))).catch(() => {});
  await page.waitForTimeout(250);
}
const capture = (page, nom) => page.screenshot({ path: path.join(CAPT, `${nom}.png`), fullPage: true });

async function contexte(navigateur, { largeur = 1440, hauteur = 900, mobile = false } = {}) {
  // colorScheme clair : la nuit doit venir de la page, pas de l'appareil
  const ctx = await navigateur.newContext({ viewport: { width: largeur, height: hauteur }, locale: 'fr-FR', timezoneId: 'Europe/Paris', colorScheme: 'light', isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  await ctx.route(/fonts\.g(oogleapis|static)\.com/, r => r.abort());
  await ctx.route(/video\.exemple\.org|storage\.exemple\.org/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Document</title><p>Le document.</p>' }));
  await ctx.route(/supabase\.co\//, async route => {
    const req = route.request(), url = new URL(req.url());
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    if (url.pathname.startsWith('/rest/v1/crescite_textes')) return json(200, [{ valeur: { contact: { nom: 'Adrien Vada', role: 'Directeur artistique', email: 'diffusion@crescite.fr', telephone: '06 00 00 00 00' } } }]);
    const corps = JSON.parse(req.postData() || '{}');
    APPELS.push({ fonction: url.pathname.split('/').pop(), corps: { ...corps } });
    if (lenteur) await new Promise(r => setTimeout(r, lenteur));
    if (pannes > 0) { pannes--; return json(500, { erreur: 'panne' }); }
    if (url.pathname.endsWith('/crescite-pro')) {
      if (corps.jeton === PANNE) return json(500, { erreur: 'panne' });
      if (corps.jeton === CODE) corps.jeton = BON;
      if (corps.jeton !== BON && corps.jeton !== VIDE) return json(404, { erreur: 'acces' });
      if (corps.document_id != null) {
        if (corps.document_id === 11) return json(200, { url: VIDEO, titre: 'Captation intégrale' });
        if (corps.document_id === 12) return json(200, { url: 'https://storage.exemple.org/dossier.pdf', titre: 'Dossier de diffusion' });
        return json(500, { erreur: 'document' });
      }
      return json(200, corps.jeton === VIDE ? { acces: { nom: 'Festival d’Avignon', contact: null, expire_le: plus(60) }, spectacles: [] } : ESPACE);
    }
    if (url.pathname.endsWith('/crescite-courriel')) {
      if (corps.alerte) {
        const a = ALERTES[corps.alerte];
        if (!a) return json(404, { erreur: 'introuvable' });
        if (corps.action === 'confirmer') { const n = a.attente.length; a.attente = []; a.alerte.confirmee = true; return json(200, { enregistre: n > 0, confirmees: n, alerte: a.alerte, attente: [], autres: a.autres }); }
        if (corps.action === 'arreter') { delete ALERTES[corps.alerte]; return json(200, { arretees: corps.tout ? a.autres + 1 : 1 }); }
        return json(200, a);
      }
      const v = PROPS[corps.r];
      if (!v) return json(404, { erreur: 'introuvable' });
      if (corps.j != null) {
        if (v.proposition.statut === 'close') return json(200, { ...v, enregistre: false });
        const j = v.jours.find(x => x.id === Number(corps.j)); if (j) j.reponse = corps.c;
        return json(200, { ...v, enregistre: !!j });
      }
      return json(200, v);
    }
    return route.abort();
  });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|fonts\.g/i.test(m.text())) erreurs.push(m.text()); });
  return { ctx, page, erreurs };
}

// ---- la charte, les cibles, le débordement : les mêmes mesures sur chaque page
async function charte(page, etiquette) {
  const m = await page.evaluate(() => {
    const cs = el => el ? getComputedStyle(el) : null;
    const lum = c => { const x = (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return x.length === 3 ? 0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2] : 1; };
    const premiere = f => (f || '').split(',')[0].replace(/["']/g, '').trim();
    const h1 = document.querySelector('main h1'), sur = document.querySelector('main .sur'), marque = document.querySelector('header .marque');
    const pied = document.querySelector('footer.pied-espace');
    return {
      theme: document.documentElement.dataset.theme, fond: lum(cs(document.body).backgroundColor), encre: lum(cs(document.body).color),
      titre: premiere(cs(h1)?.fontFamily), corps: premiere(cs(document.body).fontFamily), etiquette: premiere(cs(sur)?.fontFamily),
      marque: !!(marque && marque.querySelector('svg') && /Compagnie Crescite/.test(marque.textContent) && marque.getAttribute('href') === '../'),
      pied: !!(pied && /Compagnie Crescite/.test(pied.textContent) && pied.querySelector('a[href$="mentions-legales"]') && pied.querySelector('a[href$="politique-de-confidentialite"]')),
      saison: cs(document.documentElement).getPropertyValue('--saison').trim(),
    };
  });
  ok(`${etiquette} · la nuit par défaut (appareil en clair)`, m.theme === 'nuit' && m.fond < 0.05 && m.encre > 0.6, JSON.stringify(m));
  ok(`${etiquette} · les polices : Ubuntu, Open Sans, Raleway`, m.titre === 'Ubuntu' && m.corps === 'Open Sans' && m.etiquette === 'Raleway', `${m.titre} / ${m.corps} / ${m.etiquette}`);
  ok(`${etiquette} · la marque (la pieuvre, « Compagnie Crescite », vers le site) et le pied`, m.marque && m.pied, JSON.stringify({ marque: m.marque, pied: m.pied }));
  ok(`${etiquette} · l’accent à la couleur de la saison (posée par le build)`, /^#[0-9a-f]{6}$/i.test(m.saison) && m.saison.toLowerCase() !== '#4f4850', m.saison);
}
// toute cible visible fait 44 px de haut et de large, sauf un lien au fil d'une phrase (WCAG 2.5.8, l'exception « en ligne »)
async function cibles(page, etiquette) {
  const petites = await page.evaluate(() => [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button]')].filter(el => {
    if (el.closest('.sr') || el.classList.contains('evitement') || el.closest('[hidden]')) return false;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false;
    if (el.tagName === 'A' && getComputedStyle(el).display === 'inline') { const bloc = el.closest('p, li, dd, td'); if (bloc && bloc.textContent.trim().length > el.textContent.trim().length + 2) return false; }
    return r.height < 43.5 || r.width < 43.5;
  }).map(el => `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''} « ${el.textContent.replace(/\s+/g, ' ').trim().slice(0, 30)} » ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`));
  ok(`${etiquette} · les cibles font 44 px`, !petites.length, petites.slice(0, 6).join(' ; '));
}
async function deborde(page, etiquette) {
  const m = await page.evaluate(() => ({ l: document.documentElement.scrollWidth, v: innerWidth, hors: [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && !el.closest('.sr') && !el.classList.contains('evitement') && getComputedStyle(el).position !== 'fixed'; }).slice(0, 4).map(el => `${el.tagName.toLowerCase()}.${el.className}`) }));
  ok(`${etiquette} · rien ne déborde à ${m.v} px`, m.l <= m.v && !m.hors.length, JSON.stringify(m));
}
const PRO = `${RACINE}/pro/index.html`, REP = `${RACINE}/reponse/index.html`;

const navigateur = await chromium.launch();
try {
  // ================================================================================== l'espace des salles, au bureau
  {
    const { ctx, page, erreurs } = await contexte(navigateur);
    await page.goto(`${PRO}?anim=0`);
    await page.waitForSelector('#form-code');
    ok('salles · sans code : la porte, « Code d’accès » et « Demander un accès »', /Espace des salles/.test(await texte(page, 'main h1')) && await compte(page, 'input#code') === 1 && /^mailto:/.test(await page.getAttribute('.demander a', 'href') || ''));
    ok('salles · sans code : le champ du code a le focus', await page.evaluate(() => document.activeElement?.id === 'code'));
    await page.mouse.click(4, 4);
    await page.keyboard.press('Tab');
    ok('salles · le premier Tab montre « Aller au contenu »', await page.evaluate(() => document.activeElement?.classList.contains('evitement') && document.activeElement.getBoundingClientRect().top >= 0));
    await page.keyboard.press('Enter');
    ok('salles · « Aller au contenu » mène au contenu, l’adresse inchangée', await page.evaluate(() => document.activeElement?.id === 'contenu' && !location.hash));
    await charte(page, 'salles · porte');
    await cibles(page, 'salles · porte');
    await capture(page, 'salles-porte-bureau');
    await page.fill('#code', 'abc');
    await page.click('#form-code button[type=submit]');
    ok('salles · un code incomplet le dit, le champ garde le focus', !(await page.isHidden('#code-erreur')) && await page.evaluate(() => document.activeElement?.id === 'code'));
    await page.fill('#code', `https://crescite.fr/pro/#${BON}`);
    await page.click('#form-code button[type=submit]');
    await page.waitForSelector('.spectacle');
    ok('salles · le lien entier collé ouvre l’espace de la salle', /Bonjour Mme Leroux/.test(await texte(page, 'main h1')) && /Le Volcan/.test(await texte(page, '.accueil .structure')));
    ok('salles · le titre de l’onglet nomme la salle', (await page.title()) === 'Le Volcan · Espace des salles · Compagnie Crescite', await page.title());
    ok('salles · les spectacles et leurs documents (réservés aux salles, dossiers)', await compte(page, '.spectacle') === 2 && await compte(page, 'button.doc') === 3 && /Réservé aux salles/.test(await texte(page, '.spectacle .groupe h3')));
    ok('salles · un spectacle sans photo : sa couleur et la pieuvre', await compte(page, '.sans-photo .pieuvre-cadre svg') === 2);
    ok('salles · un spectacle sans document le dit', /Aucun document/.test(await texte(page, '.spectacle:nth-child(2) .vide')));
    ok('salles · le contact diffusion (courriel, téléphone)', /diffusion@crescite\.fr/.test(await texte(page, '.contact .coords')) && await compte(page, '.contact a[href^="tel:+33"]') === 1);
    await charte(page, 'salles · espace');
    await cibles(page, 'salles · espace');
    await calme(page); await capture(page, 'salles-espace-bureau');
    // la vidéo : l'onglet s'ouvre dans le geste, puis reçoit son lien
    const [onglet] = await Promise.all([ctx.waitForEvent('page'), page.click('button.doc[data-doc="11"]')]);
    await onglet.waitForURL(VIDEO, { timeout: 8000 }).catch(() => {});
    ok('salles · la captation s’ouvre dans un nouvel onglet, à son lien', onglet.url() === VIDEO, onglet.url());
    ok('salles · l’ouverture se dit aux lecteurs d’écran', /s’ouvre dans un nouvel onglet/.test(await page.evaluate(() => new Promise(r => setTimeout(() => r(document.getElementById('annonce').textContent), 120)))));
    await onglet.close();
    // un document qui ne s'ouvre pas : l'onglet vide se referme, la page le dit sous le document
    const [vide] = await Promise.all([ctx.waitForEvent('page'), page.click('button.doc[data-doc="13"]')]);
    await page.waitForSelector('button.doc[data-doc="13"] + .secours:not([hidden])');
    await page.waitForTimeout(150);
    ok('salles · un document en panne : l’onglet vide se referme, la page le dit', vide.isClosed() && /ne s’ouvre pas/.test(await texte(page, 'button.doc[data-doc="13"] + .secours')));
    // un rechargement garde l'espace (le jeton reste pour la session, jamais dans l'adresse)
    await page.reload(); await page.waitForSelector('.spectacle');
    ok('salles · un rechargement garde l’espace, le jeton hors de l’adresse', !page.url().includes(BON) && /Bonjour/.test(await texte(page, 'main h1')));
    ok('salles · aucune erreur de page', !erreurs.length, erreurs.join(' | '));
    await ctx.close();
  }
  // le code court : tapé en minuscules avec son tiret, il ouvre l'espace ; un code bien formé mais inconnu le dit
  {
    const { ctx, page, erreurs } = await contexte(navigateur);
    await page.goto(`${PRO}?anim=0`);
    await page.waitForSelector('#form-code');
    ok('salles · le champ du code se tape en capitales, avec un exemple de sa forme', await page.evaluate(() => { const c = document.getElementById('code'); return c.getAttribute('autocapitalize') === 'characters' && /XXXXX-XXXXX/.test(c.placeholder); }));
    await page.fill('#code', 'zzzzz-zzzzz');
    await page.click('#form-code button[type=submit]');
    await page.waitForSelector('.porte .message');
    ok('salles · un code bien formé mais inconnu : « n’ouvre aucun espace »', /n’ouvre aucun espace/.test(await texte(page, '.porte .message')), await texte(page, '.porte .message'));
    await page.fill('#code', ' k7qm4-tzpxw ');
    await page.click('#form-code button[type=submit]');
    await page.waitForSelector('.spectacle');
    ok('salles · le code, en minuscules avec son tiret, ouvre l’espace', /Bonjour Mme Leroux/.test(await texte(page, 'main h1')));
    ok('salles · le code part ramené à sa forme, et reste pour la session hors de l’adresse', APPELS.some(x => x.fonction === 'crescite-pro' && x.corps.jeton === CODE) && await page.evaluate(c => sessionStorage.getItem('crescite-pro-jeton') === c && !location.hash, CODE));
    await capture(page, 'salles-code-bureau');
    ok('salles · code : aucune erreur de page', !erreurs.length, erreurs.join(' | '));
    await ctx.close();
  }
  // le lien reçu par courriel, un lien refusé, une panne, un espace sans spectacle
  {
    const { ctx, page, erreurs } = await contexte(navigateur);
    await page.goto(`${PRO}?anim=0#${BON}`);
    await page.waitForSelector('.spectacle');
    ok('salles · le lien du courriel ouvre l’espace et quitte l’adresse', !page.url().includes('#') && page.url().endsWith('?anim=0'), page.url());
    await page.evaluate(j => { location.hash = j; }, EXPIRE);
    await page.waitForSelector('#form-code');
    ok('salles · un lien expiré : « plus valable », le code redemandé', /plus valable/.test(await texte(page, '.porte .message')) && await page.evaluate(() => sessionStorage.getItem('crescite-pro-jeton') === null));
    ok('salles · un lien expiré : le message prend le focus de la page', await page.evaluate(() => document.activeElement?.id === 'contenu'));
    await capture(page, 'salles-expire-bureau');
    await page.goto(`${PRO}?anim=0#${PANNE}`);
    await page.waitForSelector('#form-code');
    ok('salles · une panne de l’espace le dit, sans oublier le code', /ne répond pas/.test(await texte(page, '.porte .message.neutre')) && await page.evaluate(j => sessionStorage.getItem('crescite-pro-jeton') === j, PANNE));
    await page.goto(`${PRO}?anim=0#${VIDE}`);
    await page.waitForSelector('.accueil');
    ok('salles · une invitation sans spectacle le dit', /Aucun spectacle/.test(await texte(page, 'main > .vide')) && /Bonjour$/.test(await texte(page, 'main h1')));
    ok('salles · (liens) aucune erreur de page', !erreurs.length, erreurs.join(' | '));
    await ctx.close();
  }
  // au téléphone (390) et à 360 px
  for (const [largeur, nom] of [[390, 'telephone'], [360, '360']]) {
    const { ctx, page, erreurs } = await contexte(navigateur, { largeur, hauteur: 800, mobile: true });
    await page.goto(`${PRO}?anim=0`);
    await page.waitForSelector('#form-code');
    await deborde(page, `salles · porte · ${nom}`);
    await cibles(page, `salles · porte · ${nom}`);
    if (largeur === 390) await capture(page, 'salles-porte-telephone');
    await page.fill('#code', BON); await page.click('#form-code button[type=submit]');
    await page.waitForSelector('.spectacle'); await calme(page);
    await deborde(page, `salles · espace · ${nom}`);
    await cibles(page, `salles · espace · ${nom}`);
    await capture(page, `salles-espace-${nom}`);
    ok(`salles · ${nom} · aucune erreur de page`, !erreurs.length, erreurs.join(' | '));
    await ctx.close();
  }

  // ================================================================================== la page de réponse
  {
    PROPS = propositions();
    const { ctx, page, erreurs } = await contexte(navigateur);
    await page.goto(`${REP}?r=${J('r')}`);
    await page.waitForSelector('.jours li');
    ok('réponse · la proposition : son titre, le spectacle, le message, les jours', /Théâtre de Flers/.test(await texte(page, 'main h1')) && /Bérénice/.test(await texte(page, 'main .spectacle')) && await compte(page, '.jours li') === 2 && /montage/.test(await texte(page, 'main .message')));
    ok('réponse · le titre de l’onglet nomme la proposition', (await page.title()) === 'Option : Théâtre de Flers · Compagnie Crescite', await page.title());
    ok('réponse · la réponse déjà donnée est allumée', await page.getAttribute('li[data-jour="12"] button[data-c="oui"]', 'aria-pressed') === 'true');
    await charte(page, 'réponse · proposition');
    await cibles(page, 'réponse · proposition');
    await capture(page, 'reponse-proposition-bureau');
    await page.click('li[data-jour="11"] button[data-c="peut_etre"]');
    await page.waitForFunction(() => /C’est noté/.test(document.querySelector('li[data-jour="11"] .note')?.textContent || ''));
    ok('réponse · un bouton répond : « C’est noté », le bouton allumé', await page.getAttribute('li[data-jour="11"] button[data-c="peut_etre"]', 'aria-pressed') === 'true' && APPELS.some(a => a.corps.j === 11 && a.corps.c === 'peut_etre'));
    // une réponse en route : quitter la page pose la question du navigateur (beforeunload) ; revenue, plus de question
    const avantDepart = () => page.evaluate(() => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
    lenteur = 1200;
    await page.click('li[data-jour="11"] button[data-c="oui"]');
    await page.waitForTimeout(200);
    const enRoute = await avantDepart();
    await page.waitForFunction(() => document.querySelector('li[data-jour="11"] button[data-c="oui"]')?.getAttribute('aria-pressed') === 'true');
    lenteur = 0;
    ok('réponse · en route, quitter la page pose la question du navigateur ; revenue, plus de question', enRoute && !(await avantDepart()));
    // le choix venu du courriel : rien ne s'enregistre avant « Confirmer »
    const avant = APPELS.length;
    await page.goto(`${REP}?r=${J('r')}&j=11&c=non`);
    await page.waitForSelector('.confirmer');
    ok('réponse · le choix du courriel attend « Confirmer », rien d’enregistré', /Pas disponible/.test(await texte(page, '#confirmer-titre')) && !APPELS.slice(avant).some(a => a.corps.j != null) && await compte(page, 'li.vise') === 1);
    await capture(page, 'reponse-confirmer-bureau');
    await page.click('[data-autre]');
    ok('réponse · « Répondre autrement » retire le choix, le focus sur le jour', await compte(page, '.confirmer') === 0 && !page.url().includes('&c=') && await page.evaluate(() => !!document.activeElement?.closest('li[data-jour="11"]')));
    await page.goto(`${REP}?r=${J('r')}&j=11&c=non`);
    await page.waitForSelector('[data-confirmer]');
    await page.click('[data-confirmer]');
    await page.waitForFunction(() => /C’est noté/.test(document.querySelector('.etat')?.textContent || ''));
    ok('réponse · « Confirmer » enregistre, le dit en tête, quitte l’adresse', await compte(page, '.confirmer') === 0 && !page.url().includes('&c=') && await page.evaluate(() => document.activeElement?.classList.contains('etat')));
    await page.reload(); await page.waitForSelector('.jours li');
    ok('réponse · un rechargement ne repropose pas le choix', await compte(page, '.confirmer') === 0);
    // une proposition close
    await page.goto(`${REP}?r=${J('c')}`);
    await page.waitForSelector('.close');
    ok('réponse · une proposition close : « close », les boutons éteints', await compte(page, '.jours button:not([disabled])') === 0);
    // un lien manquant, inconnu
    await page.goto(`${REP}`);
    await page.waitForFunction(() => /plus valable/.test(document.querySelector('main h1')?.textContent || ''));
    ok('réponse · sans clé : « Ce lien n’est plus valable », le courriel de la compagnie', (await page.title()) === 'Lien expiré · Compagnie Crescite' && await compte(page, 'main a[href^="mailto:"]') === 1);
    await page.goto(`${REP}?r=${J('x')}`);
    await page.waitForFunction(() => /plus valable/.test(document.querySelector('main h1')?.textContent || ''));
    ok('réponse · une clé inconnue (expirée) : « plus valable »', true);
    await charte(page, 'réponse · lien expiré');
    await capture(page, 'reponse-expire-bureau');
    // une panne, puis « Réessayer »
    pannes = 1;
    await page.goto(`${REP}?r=${J('r')}`);
    await page.waitForSelector('[data-reessayer]');
    ok('réponse · une panne le dit, avec « Réessayer »', /pas pu s’ouvrir/.test(await texte(page, 'main h1')));
    await page.click('[data-reessayer]');
    await page.waitForSelector('.jours li');
    ok('réponse · « Réessayer » rouvre la proposition', true);
    ok('réponse · aucune erreur de page', !erreurs.length, erreurs.join(' | '));
    await ctx.close();
  }
  // les alertes de tournée : confirmer, arrêter, arrêter toutes, un lien expiré
  {
    ALERTES = alertes();
    const { ctx, page, erreurs } = await contexte(navigateur);
    const avant = APPELS.length;
    await page.goto(`${REP}?alerte=${J('n')}&action=confirmer`);
    await page.waitForSelector('[data-alerte="confirmer"]');
    ok('alerte · le lien de confirmation montre les secteurs, n’enregistre rien seul', /Confirmez vos alertes/.test(await texte(page, 'main h1')) && await compte(page, '.secteurs li') === 2 && !APPELS.slice(avant).some(a => a.corps.action));
    ok('alerte · le titre de l’onglet', (await page.title()) === 'Alerte de tournée · Compagnie Crescite');
    await charte(page, 'alerte');
    await cibles(page, 'alerte · confirmer');
    await capture(page, 'alerte-confirmer-bureau');
    await page.click('[data-alerte="confirmer"]');
    await page.waitForFunction(() => /actives/.test(document.querySelector('main h1')?.textContent || ''));
    ok('alerte · « Confirmer mes alertes » : actives, le titre a le focus', await page.evaluate(() => document.activeElement?.tagName === 'H1'));
    await page.goto(`${REP}?alerte=${J('t')}&action=arreter`);
    await page.waitForSelector('[data-alerte="arreter-tout"]');
    ok('alerte · le lien de désinscription : arrêter celle-ci, ou toutes (3)', /\(3\)/.test(await texte(page, '[data-alerte="arreter-tout"]')));
    await cibles(page, 'alerte · arrêter');
    await capture(page, 'alerte-arreter-bureau');
    await page.click('[data-alerte="arreter-tout"]');
    await page.waitForFunction(() => /arrêtées/.test(document.querySelector('main h1')?.textContent || ''));
    ok('alerte · « Arrêter toutes mes alertes » : effacées, l’adresse avec elles', /plus nos courriels/.test(await texte(page, 'main .bonjour')) && APPELS.some(a => a.corps.action === 'arreter' && a.corps.tout === true));
    await page.goto(`${REP}?alerte=${J('t')}&action=arreter`);
    await page.waitForFunction(() => /plus valable/.test(document.querySelector('main h1')?.textContent || ''));
    ok('alerte · le même lien, une fois arrêtée : « plus valable », vers les dates', await compte(page, 'main a[href="../#/saisons"]') >= 1);
    await page.goto(`${REP}?alerte=court`);
    await page.waitForFunction(() => /plus valable/.test(document.querySelector('main h1')?.textContent || ''));
    ok('alerte · un jeton manquant ou tronqué : « plus valable »', true);
    ok('alerte · aucune erreur de page', !erreurs.length, erreurs.join(' | '));
    await ctx.close();
  }
  // au téléphone (390) et à 360 px
  for (const [largeur, nom] of [[390, 'telephone'], [360, '360']]) {
    PROPS = propositions(); ALERTES = alertes();
    const { ctx, page, erreurs } = await contexte(navigateur, { largeur, hauteur: 800, mobile: true });
    await page.goto(`${REP}?r=${J('r')}&j=11&c=oui`);
    await page.waitForSelector('.confirmer');
    await deborde(page, `réponse · ${nom}`);
    await cibles(page, `réponse · ${nom}`);
    await capture(page, `reponse-confirmer-${nom}`);
    await page.goto(`${REP}?alerte=${J('t')}&action=arreter`);
    await page.waitForSelector('[data-alerte]');
    await deborde(page, `alerte · ${nom}`);
    await cibles(page, `alerte · ${nom}`);
    await capture(page, `alerte-arreter-${nom}`);
    ok(`réponse · ${nom} · aucune erreur de page`, !erreurs.length, erreurs.join(' | '));
    await ctx.close();
  }
} finally {
  await navigateur.close();
}

serveur.close();
let ko = 0;
for (const [etat, nom, detail] of resultats) { if (etat === 'KO') ko++; console.log(`${etat === 'ok' ? '  ✓' : '  ✗'} ${nom}${etat === 'KO' && detail ? `\n      ${detail}` : ''}`); }
console.log(`\n${resultats.length - ko} vérification${resultats.length - ko > 1 ? 's' : ''} sur ${resultats.length} · captures dans ${path.relative(ROOT, CAPT)}/`);
process.exit(ko ? 1 : 0);
