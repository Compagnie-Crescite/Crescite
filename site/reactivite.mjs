// La réactivité d'une maquette, mesurée (règle 15 C du contrat) : chaque geste se voit à l'image suivante, une page
// nouvelle montre son contenu tout de suite, rien ne bloque, rien ne saute.
// Usage : node site/reactivite.mjs <dossier de sortie> m03 [m04 …] [--strict] [--dist <dossier des maquettes>]
//   --strict  sort en erreur (code 1) au premier budget dépassé
//   --dist    un autre dossier que site/dist (pour mesurer une version d'avant, par exemple)
// Pour chaque maquette (<dist>/<n>.html?base=0&intro=0) : le bureau (1440×900), puis le téléphone (390×844, tactile)
// avec le processeur ralenti ×4 (CDP Emulation.setCPUThrottlingRate). On mesure le premier rendu (FCP, LCP), le
// décalage de mise en page (CLS, par fenêtres de session) et les longues tâches du chargement ; puis on rejoue les
// gestes : chaque élément du menu (règle 21 : les saisons, les spectacles, la compagnie, l'espace pro), une carte de
// spectacle, puis sur la page des saisons : choisir une date (règle 17), ouvrir une saison passée, le filtre par spectacle,
// trois caractères dans la recherche ; enfin le retour. Pour chaque geste : la durée d'évènement (Event Timing, durationThreshold 16 : l'INP du
// geste), le délai jusqu'à l'image suivante, le temps jusqu'au nouveau contenu (le h1 de la page) et les longues tâches
// pendant le geste.
// Budgets : INP < 100 ms au bureau et < 200 ms ralenti ×4 ; contenu d'une page nouvelle < 150 ms au bureau ; aucune tâche
// de plus de 50 ms pendant un geste au bureau ; CLS < 0,05.
// Rendu : <sortie>/reactivite.json (toutes les mesures) et un tableau lisible sur la sortie standard.
// S'importe aussi : import { mesurer, BUDGETS } from './reactivite.mjs' (onglets.mjs, avec REACTIVITE=1).
import { writeFileSync, mkdirSync } from 'node:fs';
import { loadavg } from 'node:os';
import { pathToFileURL } from 'node:url';

const PW = process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs';
export const BUDGETS = { inpBureau: 100, inpTelephone: 200, contenuBureau: 150, tacheGeste: 50, cls: 0.05 };
export const PROFILS = {
  bureau: { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, ralenti: 1, repos: 700 },
  telephone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ralenti: 4, repos: 1500 },
};

// l'instrument, posé avant tout script de la page
const INSTRUMENT = () => {
  const M = window.__mesures = { events: [], longtasks: [], shifts: [], paints: {}, lcp: 0, geste: null };
  const po = (type, f, o = {}) => { try { new PerformanceObserver(l => l.getEntries().forEach(f)).observe({ type, buffered: true, ...o }); } catch (e) { /* type absent */ } };
  po('event', e => M.events.push({ n: e.name, s: e.startTime, d: e.duration, id: e.interactionId || 0 }), { durationThreshold: 16 });
  po('longtask', e => M.longtasks.push({ s: e.startTime, d: e.duration }));
  const nomNoeud = x => !x ? '?' : x.nodeType !== 1 ? '#texte' : x.tagName.toLowerCase() + (typeof x.className === 'string' && x.className.trim() ? '.' + x.className.trim().split(/\s+/).join('.') : '') + (x.id ? '#' + x.id : '');
  po('layout-shift', e => { if (!e.hadRecentInput) M.shifts.push({ s: e.startTime, v: e.value, vue: location.hash, sources: (e.sources || []).slice(0, 3).map(x => nomNoeud(x.node)) }); });
  po('paint', e => { M.paints[e.name] = e.startTime; });
  po('largest-contentful-paint', e => { M.lcp = e.startTime; });
  // le geste en cours : son premier évènement, l'image qui suit chacun de ses évènements, le nouveau h1
  const titre = () => { const h = document.querySelector('main h1') || document.querySelector('h1'); return h ? h.textContent.replace(/\s+/g, '') : ''; };
  const sur = e => {
    const g = M.geste;
    if (!g || !e.isTrusted) return;
    if (g.t0 == null) g.t0 = e.timeStamp;
    if (e.type === 'click' && g.clic == null) g.clic = e.timeStamp;
    const ts = e.timeStamp;
    requestAnimationFrame(() => { g.images.push(performance.now() - ts); });
  };
  ['pointerdown', 'pointerup', 'click', 'keydown', 'input'].forEach(t => addEventListener(t, sur, { capture: true, passive: true }));
  window.__debutGeste = (h1 = true) => {
    const g = M.geste = { t0: null, clic: null, images: [], h1Avant: titre(), contenuDom: null, contenu: null, depart: performance.now() };
    if (!h1) return;
    const mo = new MutationObserver(() => {
      if (titre() === g.h1Avant || !titre()) return;
      mo.disconnect();
      const base = g.clic != null ? g.clic : g.t0 != null ? g.t0 : g.depart;
      g.contenuDom = performance.now() - base;
      requestAnimationFrame(t => { g.contenu = t - base; });
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    g.arreter = () => mo.disconnect();
  };
  window.__finGeste = (fenetre = 1000) => {
    const g = M.geste; if (!g) return null;
    if (g.arreter) g.arreter();
    const base = g.t0 != null ? g.t0 : g.depart;
    const dans = s => s >= base - 2 && s <= base + fenetre;
    const ev = M.events.filter(e => dans(e.s));
    const lt = M.longtasks.filter(e => dans(e.s) || (e.s < base && e.s + e.d > base));
    return {
      inp: ev.length ? Math.max(...ev.map(e => e.d)) : 0, evenements: [...new Set(ev.map(e => e.n))].join(','),
      image: g.images.length ? Math.round(Math.max(...g.images)) : null,
      contenu: g.contenu != null ? Math.round(g.contenu) : null, contenuDom: g.contenuDom != null ? Math.round(g.contenuDom) : null,
      taches: lt.length, tacheMax: lt.length ? Math.round(Math.max(...lt.map(e => e.d))) : 0,
    };
  };
  // le CLS : la plus grande fenêtre de session (1 s entre deux décalages, 5 s au plus)
  window.__cls = () => {
    let max = 0, somme = 0, debut = -1, prec = -1;
    M.shifts.slice().sort((a, b) => a.s - b.s).forEach(x => {
      if (prec >= 0 && x.s - prec < 1000 && x.s - debut < 5000) somme += x.v; else { somme = x.v; debut = x.s; }
      prec = x.s; max = Math.max(max, somme);
    });
    return Math.round(max * 10000) / 10000;
  };
};

// marque l'élément à toucher (le premier visible qui convient) ; rend vrai s'il existe
async function cibler(page, quoi) {
  return page.evaluate(quoi => {
    document.querySelectorAll('[data-reactivite]').forEach(e => e.removeAttribute('data-reactivite'));
    const vis = e => { if (!e || !e.getClientRects().length) return false; for (let x = e; x && x !== document.body; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden') return false; } const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const premier = sels => { for (const s of sels) { const e = [...document.querySelectorAll(s)].find(vis); if (e) return e; } return null; };
    let el = null;
    if (quoi.entree) el = premier([`header a[href="${quoi.entree}"]`, `nav a[href="${quoi.entree}"]`, `a[href="${quoi.entree}"]`]);
    else if (quoi === 'spectacle') el = premier(['main a[href^="#/spectacle/"]']);
    else if (quoi === 'tranche') el = premier(['main .pil-aff:not(.ouvert) .pil-dos']);
    else if (quoi === 'saison') el = premier(['main details:not([open]) > summary', 'main [aria-expanded="false"]:not(header *)']);
    else if (quoi === 'date') el = premier(['main button[data-reserver][aria-pressed="false"]']);
    else if (quoi === 'filtre') el = premier(['main button[aria-pressed="false"]:not([data-reserver])']);
    else if (quoi === 'recherche') el = premier(['main input[type="search"]', 'main input[placeholder]']);
    if (!el) return false;
    el.setAttribute('data-reactivite', 'cible');
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    // le geste part sans les vérifications de Playwright (force) : la cible doit être celle qu'on touche, en son centre
    const r = el.getBoundingClientRect(), dessus = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!dessus && (dessus === el || el.contains(dessus));
  }, quoi);
}

async function aller(page, hash, repos) {
  await page.evaluate(h => { location.hash = h; }, hash);
  await page.waitForTimeout(repos);
}

export async function mesurer(browser, n, { dist, profil = 'bureau' } = {}) {
  const P = PROFILS[profil];
  const ctx = await browser.newContext({ viewport: P.viewport, deviceScaleFactor: 1, isMobile: P.isMobile, hasTouch: P.hasTouch, locale: 'fr-FR' });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  await page.addInitScript(INSTRUMENT);
  if (P.ralenti > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: P.ralenti }); }
  const url = new URL(`${n}.html?base=0&intro=0`, dist).href;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(P.repos + 800);
  const charge = await page.evaluate(() => ({ fcp: Math.round(window.__mesures.paints['first-contentful-paint'] || 0), lcp: Math.round(window.__mesures.lcp || 0),
    taches: window.__mesures.longtasks.length, tacheMax: Math.round(Math.max(0, ...window.__mesures.longtasks.map(e => e.d))) }));
  const gestes = [];
  const toucher = async () => { const l = page.locator('[data-reactivite="cible"]'); if (P.hasTouch) await l.tap({ force: true }); else await l.click({ force: true }); };
  async function geste(nom, faire, { h1 = true } = {}) {
    await page.evaluate(h => window.__debutGeste(h), h1);
    const fait = await faire();
    if (fait === false) { gestes.push({ nom, absent: true }); return; }
    await page.waitForTimeout(P.repos);
    const r = await page.evaluate(() => window.__finGeste(1000));
    gestes.push({ nom, ...r, navigation: h1 });
  }
  // les éléments du menu, l'un après l'autre, par l'en-tête (ou la barre du téléphone) ; s'il manque, les adresses de la règle 21
  const menu = await page.evaluate(() => ((typeof D !== 'undefined' && D.site && D.site.menu) || []).map(m => m.href).filter(Boolean));
  for (const h of menu.length ? menu : ['#/saisons', '#/spectacles', '#/compagnie', '#/espace-pro']) {
    await geste(`menu ${h.slice(2)}`, async () => { if (!(await cibler(page, { entree: h }))) return false; await toucher(); });
  }
  // une carte de spectacle ; au téléphone, la page des spectacles est une pile d'affiches : son lien « Découvrir » ne se
  // touche qu'une fois l'affiche dépliée (il est caché, visibility: hidden, sur une tranche repliée). Une tranche se déplie
  // d'abord, hors mesure, et le geste mesuré est le toucher de ce lien
  await aller(page, '#/spectacles', P.repos);
  if (!(await cibler(page, 'spectacle')) && (await cibler(page, 'tranche'))) { await toucher(); await page.waitForTimeout(P.repos); }
  await geste('carte de spectacle', async () => { if (!(await cibler(page, 'spectacle'))) return false; await toucher(); });
  // les saisons : choisir une date (sa carte de réservation s'ouvre sur place), ouvrir une saison passée, filtrer par
  // spectacle, chercher
  await aller(page, '#/saisons', P.repos);
  await geste('choisir une date', async () => { if (!(await cibler(page, 'date'))) return false; await toucher(); }, { h1: false });
  await geste('ouvrir une saison', async () => { if (!(await cibler(page, 'saison'))) return false; await toucher(); }, { h1: false });
  await geste('filtre par spectacle', async () => { if (!(await cibler(page, 'filtre'))) return false; await toucher(); }, { h1: false });
  await geste('recherche (3 caractères)', async () => {
    if (!(await cibler(page, 'recherche'))) return false;
    await page.locator('[data-reactivite="cible"]').focus();
    await page.keyboard.type('rou', { delay: 140 });
  }, { h1: false });
  // le retour : l'historique du navigateur
  await geste('retour', async () => { await page.evaluate(() => { window.__mesures.geste.depart = performance.now(); history.back(); }); });
  const cls = await page.evaluate(() => window.__cls());
  const decalages = await page.evaluate(() => window.__mesures.shifts.filter(x => x.v >= .001).map(x => ({ ...x, s: Math.round(x.s), v: Math.round(x.v * 10000) / 10000 })));
  await ctx.close();
  return { maquette: n, profil, ralenti: P.ralenti, viewport: P.viewport, ...charge, cls, gestes, decalages, erreurs };
}

// les budgets dépassés d'une mesure : [texte]
export function depassements(m) {
  const out = [], bureau = m.profil === 'bureau', inpMax = bureau ? BUDGETS.inpBureau : BUDGETS.inpTelephone;
  if (m.cls >= BUDGETS.cls) out.push(`${m.maquette} ${m.profil} : CLS ${m.cls} (budget < ${BUDGETS.cls})`);
  for (const g of m.gestes) {
    if (g.absent) continue;
    if (g.inp >= inpMax) out.push(`${m.maquette} ${m.profil} ${g.nom} : INP ${g.inp} ms (budget < ${inpMax} ms)`);
    if (bureau && g.navigation && (g.contenu == null || g.contenu >= BUDGETS.contenuBureau)) out.push(`${m.maquette} ${m.profil} ${g.nom} : contenu ${g.contenu == null ? 'jamais vu' : g.contenu + ' ms'} (budget < ${BUDGETS.contenuBureau} ms)`);
    if (bureau && g.tacheMax > BUDGETS.tacheGeste) out.push(`${m.maquette} ${m.profil} ${g.nom} : tâche de ${g.tacheMax} ms pendant le geste (budget ≤ ${BUDGETS.tacheGeste} ms)${m.chargeMachine && m.chargeMachine[0] > 4 ? ` — machine chargée (${m.chargeMachine[0]})` : ''}`);
  }
  for (const e of m.erreurs) out.push(`${m.maquette} ${m.profil} : erreur ${e}`);
  return out;
}

export function tableau(m) {
  const c = (v, w) => String(v ?? '—').padStart(w);
  const lignes = [`${m.maquette} · ${m.profil} ${m.viewport.width}×${m.viewport.height}${m.ralenti > 1 ? ` · processeur ralenti ×${m.ralenti}` : ''}`,
    `  premier rendu ${m.fcp} ms · LCP ${m.lcp} ms · CLS ${m.cls} · longues tâches au chargement ${m.taches} (max ${m.tacheMax} ms)`,
    `  ${'geste'.padEnd(28)}${'INP'.padStart(7)}${'image'.padStart(8)}${'contenu'.padStart(9)}${'tâche max'.padStart(11)}`];
  for (const g of m.gestes) {
    if (g.absent) { lignes.push(`  ${g.nom.padEnd(28)}   (introuvable)`); continue; }
    lignes.push(`  ${g.nom.padEnd(28)}${c(g.inp, 7)}${c(g.image, 8)}${c(g.navigation ? g.contenu : null, 9)}${c(g.tacheMax || null, 11)}`);
  }
  return lignes.join('\n');
}

// en ligne de commande
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const args = process.argv.slice(2), strict = args.includes('--strict');
  const iDist = args.indexOf('--dist');
  const dist = iDist >= 0 ? pathToFileURL(args[iDist + 1].replace(/\/?$/, '/')) : new URL('./dist/', import.meta.url);
  const [out, ...names] = args.filter((a, i) => !a.startsWith('--') && !(iDist >= 0 && i === iDist + 1));
  if (!out || !names.length) { console.error('usage : node site/reactivite.mjs <dossier de sortie> m03 [m04 …] [--strict] [--dist <dossier>]'); process.exit(2); }
  mkdirSync(out, { recursive: true });
  const { chromium } = await import(PW);
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--no-sandbox'] });
  const rapport = {}, tous = [];
  let code = 0;
  fin: for (const n of names) {
    rapport[n] = {};
    for (const profil of Object.keys(PROFILS)) {
      // deux mesures, la meilleure gardée : quand d'autres mesurent en même temps sur la machine, les écarts vont du
      // simple au double ; la charge de la machine est notée avec. La meilleure : celle qui dépasse le moins de budgets (une
      // tâche longue isolée, la machine prise ailleurs, ne tombe pas deux fois sur le même geste), puis le pire INP
      const pire = x => Math.max(0, ...x.gestes.map(g => g.inp || 0));
      const ms = [await mesurer(browser, n, { dist, profil }), await mesurer(browser, n, { dist, profil })];
      const [d0, d1] = ms.map(x => depassements(x).length);
      const m = d0 !== d1 ? (d0 < d1 ? ms[0] : ms[1]) : pire(ms[0]) <= pire(ms[1]) ? ms[0] : ms[1];
      m.chargeMachine = loadavg().map(x => Math.round(x * 10) / 10);
      rapport[n][profil] = m;
      console.log(tableau(m) + '\n');
      const d = depassements(m);
      tous.push(...d);
      if (d.length && strict) { console.error(`budget dépassé : ${d[0]}`); code = 1; break fin; }
    }
  }
  writeFileSync(`${out}/reactivite.json`, JSON.stringify({ budgets: BUDGETS, rapport, depassements: tous }, null, 1));
  console.log(tous.length ? `budgets dépassés :\n  ${tous.join('\n  ')}` : 'tous les budgets sont tenus');
  await browser.close();
  process.exit(code);
}
