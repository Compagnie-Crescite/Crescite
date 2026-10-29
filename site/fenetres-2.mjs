// Les fenêtres ajustables qui restent (admin/fenetres.js : la poignée commune ; admin/planning.js et admin/disponibilites.js : la
// colonne du détail d'un jour ; admin/tournee.js : la colonne de la carte ; admin/tableau.js : la hauteur d'une tuile ;
// admin/equipe.js : le zoom de la page A4 d'une feuille de route), vérifiées dans Chromium, hors ligne, sur la base fictive
// commune (admin-fictif.mjs).
//   python3 site/build.py && node site/fenetres-2.mjs
// Ce que le banc regarde : le planning (une poignée entre la grille et le détail, la variable --pl-detail retenue avec le compte
// et retrouvée au rechargement, reposée après chaque dessin, au clavier ; en vue Équipe, le détail à côté de la grille au-dessus de
// 1 200 px ; rien sous 900 px ; rien sans options.detail.poignee, ni dans le calendrier d'une proposition) ; la carte (un
// séparateur entre elle et les étapes, ses bornes, caché sous 900 px) ; le tableau de bord en « Personnaliser » (une poignée
// basse par tuile que le glisser-déposer natif n'avale pas, la hauteur retenue avec la disposition, une seule écriture par
// geste, « Annuler », une valeur illisible) ; le zoom de la page A4 (− / 100 % / + / Ajuster, Ctrl + molette, la pagination qui
// ne bouge pas, le bureau gris qui défile, le zoom retrouvé) ; le téléphone, l'impression, le budget de CPU.
// Les captures vont dans site/dist/shots-fenetres-2/. Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, UID, URL0, DB, ECRITURES, resultats, ok, calme, ouvrir, texte, compte, tuile, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-fenetres-2');
// une exception en route (un élément qui manque) : ce qui a été vérifié jusque-là est dit avant la sortie en erreur
process.on('uncaughtException', e => { for (const [etat, nom, detail] of resultats) console.log(`${etat === 'ok' ? '  ✓' : '  ✗'} ${nom}${etat === 'KO' && detail ? `\n      ${detail}` : ''}`); console.error(e.message); process.exit(1); });
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
const attendre = (page, fn, arg = null, ms = 6000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
const ecrites = cle => ECRITURES.filter(e => e.cle === cle);
const repartir = () => { DB.crescite_preferences = []; ECRITURES.length = 0; };
const garder = (cle, valeur) => DB.crescite_preferences.push({ user_id: UID, cle, valeur });
const visibles = (page, sel = '.poignee') => page.evaluate(s => [...document.querySelectorAll(s)].filter(e => { const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && r.width > 0 && r.height > 0; }).length, sel);
// le milieu visible d'une poignée
const milieu = (page, sel) => page.evaluate(s => {
  const r = document.querySelector(s).getBoundingClientRect(), haut = Math.max(r.top, 0), bas = Math.min(r.bottom, innerHeight);
  return { x: r.left + r.width / 2, y: haut + Math.min(300, (bas - haut) / 2) };
}, sel);
// tirer une poignée de (dx, dy) : appuyer, bouger en dix pas, lâcher (la pause laisse le temps à une image entre deux pas)
async function tirer(page, sel, dx, dy = 0, { lacher = true, entre = null } = {}) {
  const { x, y } = await milieu(page, sel);
  await page.mouse.move(x, y); await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(x + dx * i / 10, y + dy * i / 10); await page.waitForTimeout(12); }
  if (entre) await entre();
  if (lacher) await page.mouse.up();
  return { x, y };
}
// recharger la page (un goto vers la même adresse, au dièse près, ne rechargerait rien) : la mémoire du navigateur est perdue, le compte reste
const recharger = async (page, hash) => { await page.evaluate(h => { location.hash = h; }, hash); await page.reload(); await page.waitForSelector('main#vue', { timeout: 20000 }); };
const largeur = (page, sel) => page.$eval(sel, e => Math.round(e.getBoundingClientRect().width));
const hauteur = (page, sel) => page.$eval(sel, e => Math.round(e.getBoundingClientRect().height));
const variable = (page, sel, nom) => page.$eval(sel, (e, n) => getComputedStyle(e).getPropertyValue(n).trim() || e.style.getPropertyValue(n).trim(), nom);

// ================================================================================ 1 · le planning : la colonne du détail
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/planning' });
  await page.waitForSelector('.pl-mise, .pl-grille-e', { timeout: 15000 });
  await page.click('[data-pl-vue="mois"]');
  await page.waitForSelector('.pl-mise > .poignee', { timeout: 6000 });
  const p = await page.evaluate(() => { const e = document.querySelector('.pl-mise > .poignee'); return e && { role: e.getAttribute('role'), orientation: e.getAttribute('aria-orientation'), nom: e.getAttribute('aria-label'), min: +e.getAttribute('aria-valuemin'), max: +e.getAttribute('aria-valuemax'), now: +e.getAttribute('aria-valuenow'), tab: e.tabIndex, glisse: e.draggable, curseur: getComputedStyle(e).cursor }; });
  ok('1 · la vue Mois a une poignée entre la grille et le détail : un séparateur vertical nommé, dans l’ordre du clavier', !!p && p.role === 'separator' && p.orientation === 'vertical' && /Largeur du détail/.test(p.nom) && p.tab === 0 && p.glisse === false && p.curseur === 'col-resize', JSON.stringify(p));
  ok('1 · elle dit sa valeur : 300 px, de 240 à 560 px', p.now === 300 && p.min === 240 && p.max === 560, JSON.stringify(p));
  const ordre = await page.evaluate(() => { const m = document.querySelector('.pl-mise'); return [...m.children].map(e => e.className.split(' ')[0]).join(','); });
  ok('1 · elle se tient entre la grille et le détail dans le DOM (le focus passe de l’une à l’autre)', ordre === 'pl-mois-grille,poignee,pl-detail', ordre);
  const place = await page.evaluate(() => { const g = document.querySelector('.pl-mois-grille').getBoundingClientRect(), d = document.querySelector('.pl-detail').getBoundingClientRect(), r = document.querySelector('.pl-mise > .poignee').getBoundingClientRect(); return { milieu: Math.round(r.left + r.width / 2), gouttiere: Math.round((g.right + d.left) / 2), bande: Math.round(r.width) }; });
  ok('1 · sa bande de 6 px est au milieu de la gouttière', place.bande === 6 && Math.abs(place.milieu - place.gouttiere) <= 1, JSON.stringify(place));
  ok('1 · à l’ouverture rien n’est écrit, et le détail fait 300 px', ECRITURES.length === 0 && (await largeur(page, '.pl-detail')) === 300);
  const { x, y } = await milieu(page, '.pl-mise > .poignee');
  await page.mouse.move(x, y); await page.waitForTimeout(250);
  ok('1 · au survol, une ligne de 2 px à la couleur de la saison paraît', await page.evaluate(() => { const s = getComputedStyle(document.querySelector('.pl-mise > .poignee'), '::after'); return s.opacity === '1' && s.width === '2px'; }));

  // le glisser : −100 px vers la gauche agrandit le détail (le bord nommé est celui de la surface réglée : le gauche, d’une colonne de droite)
  let mi = null;
  await tirer(page, '.pl-mise > .poignee', -100, 0, { lacher: false, entre: async () => {
    await page.waitForTimeout(80);
    mi = await page.evaluate(() => ({ redim: document.documentElement.classList.contains('redim'), detail: Math.round(document.querySelector('.pl-detail').getBoundingClientRect().width), actif: document.querySelector('.pl-mise > .poignee').classList.contains('actif'), var: document.querySelector('.pl').style.getPropertyValue('--pl-detail') }));
  } });
  ok('1 · pendant le glisser (−100 px) : html.redim, le détail suit le pointeur (400 px), la variable --pl-detail aussi', !!mi && mi.redim && mi.actif && mi.detail === 400 && mi.var === '400px', JSON.stringify(mi));
  ok('1 · pendant le glisser, rien n’est encore écrit dans le compte', ecrites('fenetres.pl-detail').length === 0);
  await page.screenshot({ path: `${CAPT}/planning-detail.png`, fullPage: false });
  await page.mouse.up();
  await page.waitForTimeout(500);
  ok('1 · au relâchement : --pl-detail lue sur .pl vaut 400 px, le détail aussi', (await variable(page, '.pl', '--pl-detail')) === '400px' && (await largeur(page, '.pl-detail')) === 400);
  ok('1 · fenetres.pl-detail est écrit une seule fois, à 400', ecrites('fenetres.pl-detail').length === 1 && ecrites('fenetres.pl-detail')[0].valeur === 400, JSON.stringify(ecrites('fenetres.pl-detail')));
  ok('1 · la poignée redit sa valeur (aria-valuenow 400)', (await page.$eval('.pl-mise > .poignee', e => e.getAttribute('aria-valuenow'))) === '400');
  ok('1 · la grille a cédé la place : le détail et la grille tiennent encore côte à côte, sans débord', await page.evaluate(() => { const m = document.querySelector('.pl-mise').getBoundingClientRect(), d = document.querySelector('.pl-detail').getBoundingClientRect(); return d.right <= m.right + 1 && document.documentElement.scrollWidth <= innerWidth + 1; }));

  // un clic sur un jour redessine tout l’intérieur du planning : la poignée est reposée, la largeur tient
  await page.click('.pl-m-c[data-pl-jour]:not([aria-disabled="true"]) >> nth=10');
  await page.waitForTimeout(300);
  ok('1 · un jour choisi redessine le planning : une seule poignée, reposée entre la grille et le détail, et le détail garde 400 px', (await compte(page, '.pl-mise > .poignee')) === 1 && (await compte(page, '.poignee')) === 1 && (await largeur(page, '.pl-detail')) === 400);
  // le clavier : la poignée, ← agrandit (de 16 px), → rétrécit, Début et Fin les bornes, Entrée l’origine
  await page.focus('.pl-mise > .poignee');
  await page.keyboard.press('ArrowLeft');
  ok('1 · au clavier, ← agrandit le détail de 16 px (416 px)', (await largeur(page, '.pl-detail')) === 416, String(await largeur(page, '.pl-detail')));
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  ok('1 · → le rétrécit de 16 px (384 px)', (await largeur(page, '.pl-detail')) === 384);
  await page.keyboard.press('End');
  ok('1 · Fin donne la plus grande largeur (560 px au plus : la grille garde de la place)', (await largeur(page, '.pl-detail')) <= 560 && (await largeur(page, '.pl-detail')) >= 500, String(await largeur(page, '.pl-detail')));
  await page.keyboard.press('Home');
  ok('1 · Début donne la plus petite (240 px)', (await largeur(page, '.pl-detail')) === 240);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  ok('1 · Entrée rend la taille d’origine (300 px), et oublie la clé', (await largeur(page, '.pl-detail')) === 300 && ecrites('fenetres.pl-detail').at(-1).valeur === null, JSON.stringify(ecrites('fenetres.pl-detail').at(-1)));
  // le glisser retenu : on retire 100 px de plus pour la suite
  await tirer(page, '.pl-mise > .poignee', -100, 0);
  await page.waitForTimeout(500);
  const n1 = ecrites('fenetres.pl-detail').length;

  // recharger : la vue Mois (session.planning) et la largeur reviennent
  await recharger(page, '#/planning');
  await page.waitForSelector('.pl-mise > .poignee', { timeout: 15000 });
  ok('1 · recharger #/planning : la vue Mois et la largeur (400 px, lue dans le compte) reviennent', (await page.$eval('.pl', e => e.dataset.vue)) === 'mois' && (await variable(page, '.pl', '--pl-detail')) === '400px' && (await largeur(page, '.pl-detail')) === 400);
  ok('1 · la relecture n’écrit rien', ecrites('fenetres.pl-detail').length === n1);
  ok('1 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));

  await ctx.close();
}
{
  // la vue Équipe : au-dessus de 1 200 px, le détail se met à côté de la grille, une fois un jour choisi
  repartir(); garder('fenetres.pl-detail', 400);
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/planning' });
  await page.waitForSelector('.pl-grille-e', { timeout: 15000 });
  await page.waitForTimeout(500);
  const avant = await page.evaluate(() => ({ mise: !!document.querySelector('.pl-mise'), detail: !!document.querySelector('.pl-detail'), poignees: document.querySelectorAll('.poignee').length, defile: Math.round(document.querySelector('.pl-defile').getBoundingClientRect().width) }));
  ok('1 · vue Équipe, aucun jour choisi : la grille a toute la largeur (pas de colonne vide), pas de poignée', avant.mise && !avant.detail && avant.poignees === 0 && avant.defile > 1000, JSON.stringify(avant));
  await page.click('.pl-e-jour button[data-pl-jour]');
  await page.waitForSelector('.pl-detail', { timeout: 4000 });
  await page.waitForTimeout(300);
  const eq = await page.evaluate(() => { const m = document.querySelector('.pl-mise'), d = document.querySelector('.pl-detail').getBoundingClientRect(), g = document.querySelector('.pl-defile').getBoundingClientRect(), r = document.querySelector('.pl-mise > .poignee'); return { colonnes: getComputedStyle(m).gridTemplateColumns.split(' ').length, cote: d.left >= g.right, largeur: Math.round(d.width), poignee: !!r && getComputedStyle(r).display !== 'none', haut: Math.round(d.top - g.top) }; });
  ok('1 · vue Équipe à 1 440 px, un jour choisi : le détail est à côté de la grille (deux colonnes, 400 px gardés, au même niveau), avec sa poignée', eq.colonnes === 2 && eq.cote && eq.largeur === 400 && eq.poignee && Math.abs(eq.haut) <= 1, JSON.stringify(eq));
  await page.screenshot({ path: `${CAPT}/planning-equipe-cote.png`, fullPage: false });
  await tirer(page, '.pl-mise > .poignee', -60, 0);
  await page.waitForTimeout(400);
  ok('1 · vue Équipe : la poignée règle la même largeur (460 px) et la grille se redessine sans la perdre', (await largeur(page, '.pl-detail')) === 460 && (await compte(page, '.pl-mise > .poignee')) === 1);
  await page.setViewportSize({ width: 1150, height: 800 });
  await page.waitForTimeout(400);
  const dessous = await page.evaluate(() => { const d = document.querySelector('.pl-detail').getBoundingClientRect(), g = document.querySelector('.pl-defile').getBoundingClientRect(); return { dessous: d.top >= g.bottom - 1, poignees: [...document.querySelectorAll('.poignee')].filter(e => getComputedStyle(e).display !== 'none').length }; });
  ok('1 · sous 1 200 px, le détail repasse sous la grille de la vue Équipe, sans poignée visible', dessous.dessous && dessous.poignees === 0, JSON.stringify(dessous));
  ok('1 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  // une largeur gardée (560 px) trop grande pour la fenêtre : ramenée à la borne dès l'ouverture, la grille garde ses 360 px
  repartir(); garder('fenetres.pl-detail', 560);
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1000, hauteur: 800, hash: '#/planning' });
  await page.waitForSelector('.pl-grille-e', { timeout: 15000 });
  await page.click('[data-pl-vue="mois"]');
  await page.waitForSelector('.pl-mise > .poignee', { timeout: 6000 });
  await page.waitForTimeout(400);
  const bo = await page.evaluate(() => { const m = document.querySelector('.pl-mise'); return { mise: m.clientWidth, detail: Math.round(document.querySelector('.pl-detail').getBoundingClientRect().width), grille: Math.round(document.querySelector('.pl-mois-grille').getBoundingClientRect().width), now: +m.querySelector(':scope > .poignee').getAttribute('aria-valuenow') }; });
  ok('1 · une largeur gardée trop grande (560 px) est ramenée à la borne à l’ouverture : la grille garde au moins 360 px', bo.detail === bo.mise - 14 - 360 && bo.grille >= 359 && bo.detail < 560 && bo.now === bo.detail, JSON.stringify(bo));
  ok('1 · (la relecture de la borne n’écrit rien dans le compte)', ecrites('fenetres.pl-detail').length === 0);
  ok('1 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  repartir();
  const { ctx, page } = await ouvrir(navigateur, { largeur: 800, hauteur: 800, hash: '#/planning' });
  await page.waitForSelector('.pl-grille-e', { timeout: 15000 });
  await page.click('[data-pl-vue="mois"]');
  await page.waitForTimeout(500);
  ok('1 · à 800 px, la vue Mois n’a aucune poignée visible (le détail passe sous la grille)', (await visibles(page)) === 0 && await page.evaluate(() => { const d = document.querySelector('.pl-detail'); const g = document.querySelector('.pl-mois-grille'); return !d || d.getBoundingClientRect().top >= g.getBoundingClientRect().bottom - 1; }));
  await ctx.close();
}

// ================================================================================ 1 bis · le planning sans poignée : l’espace de l’équipe, le calendrier d'une proposition
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/planning' });
  await page.waitForSelector('.pl-grille-e', { timeout: 15000 });
  const r = await page.evaluate(() => {
    const donnees = { personnes: [{ id: 1, prenom: 'Camille', nom: 'Essai' }], indisponibilites: [], dates: [], propositions: [] };
    const sortie = {};
    for (const [nom, detail] of [['sans-detail', undefined], ['sans-poignee', { ou: 'cote', largeur: 320 }], ['dessous', { ou: 'dessous', largeur: 280, poignee: () => { sortie.appelee = (sortie.appelee || 0) + 1; return null; } }]]) {
      const racine = document.createElement('div'); racine.style.width = '1300px'; document.body.append(racine);
      const pl = PLANNING.monter(racine, { vue: 'mois', jour: '2026-11-10', donnees, ...(detail ? { detail } : {}) });
      const el = racine.querySelector('.pl');
      sortie[nom] = { poignees: racine.querySelectorAll('.poignee').length, variable: el.style.getPropertyValue('--pl-detail'), mise: !!racine.querySelector('.pl-mise') };
      pl.vue('equipe');
      sortie[nom].equipe = { mise: !!racine.querySelector('.pl-mise'), poignees: racine.querySelectorAll('.poignee').length };
      pl.detruire(); racine.remove();
    }
    return sortie;
  });
  ok('1 · PLANNING.monter sans options.detail : aucune poignée, aucune variable, et la vue Équipe n’est pas enveloppée', r['sans-detail'].poignees === 0 && r['sans-detail'].variable === '' && !r['sans-detail'].equipe.mise && r['sans-detail'].equipe.poignees === 0, JSON.stringify(r['sans-detail']));
  ok('1 · avec options.detail mais sans options.detail.poignee : la largeur est posée (320 px), aucune poignée dans la grille', r['sans-poignee'].poignees === 0 && r['sans-poignee'].variable === '320px' && r['sans-poignee'].equipe.poignees === 0, JSON.stringify(r['sans-poignee']));
  ok('1 · « ou: dessous » : la vue Équipe garde son détail sous la grille (pas d’enveloppe, pas d’appel de la poignée en vue Équipe)', !r.dessous.equipe.mise, JSON.stringify(r.dessous));
  // le calendrier d'une proposition (disponibilites.js, #dp-cal) : pas de poignée, sa colonne garde 300 px
  await page.evaluate(() => { location.hash = '#/planning/proposer'; });
  await page.waitForSelector('#dp-cal .pl', { timeout: 10000 });
  await page.waitForTimeout(500);
  ok('1 · le calendrier d’une proposition (#dp-cal) n’a pas de poignée et garde sa colonne de 300 px', (await compte(page, '#dp-cal .poignee')) === 0 && await page.evaluate(() => { const v = getComputedStyle(document.querySelector('#dp-cal .pl')).getPropertyValue('--pl-detail').trim(); return v === ''; }));
  ok('1 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 2 · la carte de tournée : la colonne de la carte
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/carte' });
  await page.waitForSelector('.tn-svg .tn-pin', { timeout: 15000 });
  const p = await page.evaluate(() => { const e = document.querySelector('.tn-deux > .poignee'); return e && { role: e.getAttribute('role'), nom: e.getAttribute('aria-label'), min: +e.getAttribute('aria-valuemin'), max: +e.getAttribute('aria-valuemax'), now: +e.getAttribute('aria-valuenow'), ordre: [...e.parentNode.children].map(x => x.className.split(' ')[0]).join(',') }; });
  const L = await largeur(page, '.tn-deux');
  ok('2 · entre la carte et les étapes, un séparateur nommé (enfant de .tn-deux, entre ses deux colonnes)', !!p && p.role === 'separator' && /Largeur de la carte/.test(p.nom) && p.ordre === 'bloc,poignee,tn-cote', JSON.stringify(p));
  ok('2 · ses bornes : de 360 px à la largeur de la grille moins 338 px (320 px d’étapes et la gouttière)', p.min === 360 && p.max === L - 338, `${JSON.stringify(p)} grille ${L}`);
  const l0 = await largeur(page, '#tn-carte');
  ok('2 · la carte a sa largeur d’origine (1,3 fr contre 1 fr, la variable --l-tn absente)', Math.abs(l0 - Math.round((L - 18) * 1.3 / 2.3)) <= 1 && (await variable(page, '.tn-deux', '--l-tn')) === '' && p.now === l0, `${l0} ${JSON.stringify(p)}`);
  const place = await page.evaluate(() => { const g = document.querySelector('#tn-carte').getBoundingClientRect(), d = document.querySelector('.tn-cote').getBoundingClientRect(), r = document.querySelector('.tn-deux > .poignee').getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - (g.right + d.left) / 2) <= 1 && Math.round(r.width) === 6; });
  ok('2 · sa bande est au milieu de la gouttière', place);
  await calme(page);
  const viewBox0 = await page.$eval('.tn-svg', e => e.getAttribute('viewBox'));
  await tirer(page, '.tn-deux > .poignee', -120, 0);
  await page.waitForTimeout(500);
  ok('2 · tirer de −120 px rétrécit la carte de 120 px', (await largeur(page, '#tn-carte')) === l0 - 120, `${await largeur(page, '#tn-carte')} pour ${l0 - 120}`);
  ok('2 · --l-tn est posée sur .tn-deux, et la colonne des étapes garde au moins 320 px', (await variable(page, '.tn-deux', '--l-tn')) === `${l0 - 120}px` && (await largeur(page, '.tn-cote')) >= 320);
  ok('2 · fenetres.tn est écrit une seule fois', ecrites('fenetres.tn').length === 1 && ecrites('fenetres.tn')[0].valeur === l0 - 120, JSON.stringify(ecrites('fenetres.tn')));
  ok('2 · le cadre de la carte (viewBox) ne change pas : la carte suit sa largeur', (await page.$eval('.tn-svg', e => e.getAttribute('viewBox'))) === viewBox0);
  await page.screenshot({ path: `${CAPT}/carte-separateur.png`, fullPage: false });
  // les bornes : tirer très loin des deux côtés
  await tirer(page, '.tn-deux > .poignee', 2000, 0);
  await page.waitForTimeout(400);
  ok('2 · tirer très loin à droite s’arrête à la borne : la colonne des étapes garde 320 px', (await largeur(page, '#tn-carte')) === L - 338 && (await largeur(page, '.tn-cote')) === 320, `${await largeur(page, '#tn-carte')} / ${await largeur(page, '.tn-cote')}`);
  await tirer(page, '.tn-deux > .poignee', -3000, 0);
  await page.waitForTimeout(400);
  ok('2 · tirer très loin à gauche s’arrête à 360 px', (await largeur(page, '#tn-carte')) === 360, String(await largeur(page, '#tn-carte')));
  // un redessin (un filtre, « Autour des dates ») ne détruit pas le séparateur, ni la largeur
  await page.click('#tn-serre');
  await page.waitForTimeout(300);
  ok('2 · « Autour des dates » redessine la carte : le séparateur et la largeur (360 px) restent, le cadre change', (await compte(page, '.tn-deux > .poignee')) === 1 && (await largeur(page, '#tn-carte')) === 360 && (await page.$eval('.tn-svg', e => e.getAttribute('viewBox'))) !== viewBox0);
  await page.click('#tn-serre');
  // le clavier
  await page.focus('.tn-deux > .poignee');
  await page.keyboard.press('ArrowRight');
  ok('2 · au clavier, → agrandit la carte de 16 px (376 px)', (await largeur(page, '#tn-carte')) === 376, String(await largeur(page, '#tn-carte')));
  await page.keyboard.press('Home');
  await page.waitForTimeout(600);
  // rechargé
  await recharger(page, '#/representations/carte');
  await page.waitForSelector('.tn-svg .tn-pin', { timeout: 15000 });
  await page.waitForTimeout(300);
  ok('2 · recharger : la largeur gardée (360 px) revient', (await largeur(page, '#tn-carte')) === 360 && (await variable(page, '.tn-deux', '--l-tn')) === '360px');
  // « Disposition d'origine » (le menu latéral) : la carte reprend sa largeur d'origine tout de suite, sans recharger
  await page.click('#fen-origine');
  await page.waitForTimeout(500);
  ok('2 · « Disposition d’origine » rend à la carte sa largeur d’origine sur-le-champ (la variable --l-tn effacée : la feuille décide), et efface fenetres.tn', Math.abs((await largeur(page, '#tn-carte')) - l0) <= 1 && (await variable(page, '.tn-deux', '--l-tn')) === '' && ecrites('fenetres.tn').at(-1).valeur === null, `${await largeur(page, '#tn-carte')} pour ${l0}`);
  // sous 900 px, les deux colonnes s'empilent
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.waitForTimeout(500);
  await page.setViewportSize({ width: 800, height: 800 });
  await page.waitForTimeout(500);
  ok('2 · à 800 px, les deux colonnes s’empilent et le séparateur est caché', (await visibles(page, '.tn-deux > .poignee')) === 0 && await page.evaluate(() => { const c = document.querySelector('#tn-carte').getBoundingClientRect(), d = document.querySelector('.tn-cote').getBoundingClientRect(); return d.top >= c.bottom - 1; }));
  ok('2 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

{
  // une largeur gardée (2 000 px) trop grande pour la grille : ramenée à la borne, la colonne des étapes garde 320 px
  repartir(); garder('fenetres.tn', 2000);
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/carte' });
  await page.waitForSelector('.tn-svg .tn-pin', { timeout: 15000 });
  await page.waitForTimeout(400);
  const L = await largeur(page, '.tn-deux');
  ok('2 · une largeur gardée trop grande (2 000 px) est ramenée à la borne à l’ouverture : la carte fait la grille moins 338 px, les étapes 320 px', (await largeur(page, '#tn-carte')) === L - 338 && (await largeur(page, '.tn-cote')) === 320, `${await largeur(page, '#tn-carte')} / ${await largeur(page, '.tn-cote')} pour ${L}`);
  ok('2 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 3 · le tableau de bord : la hauteur d'une tuile
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 1700, hash: '#/accueil' });
  await page.waitForSelector(`${tuile('urgent')} .tb-corps`, { timeout: 15000 });
  await page.waitForTimeout(500);
  ok('3 · en lecture, aucune poignée sur les tuiles (pas d’arrêt de plus pour la touche Tab)', (await compte(page, '#tb-grille .poignee')) === 0);
  await page.click('#tb-personnaliser');
  await page.waitForSelector(`${tuile('urgent')} > .poignee`, { timeout: 4000 });
  const n = await compte(page, '#tb-grille .tb-tuile'), np = await compte(page, '#tb-grille .tb-tuile > .poignee');
  ok('3 · « Personnaliser » : une poignée basse par tuile, enfant de la tuile (hors de son corps)', n >= 9 && np === n && (await compte(page, '#tb-grille .tb-corps .poignee')) === 0, `${np} poignées pour ${n} tuiles`);
  const p = await page.evaluate(sel => { const e = document.querySelector(`${sel} > .poignee`); return { role: e.getAttribute('role'), orientation: e.getAttribute('aria-orientation'), nom: e.getAttribute('aria-label'), glisse: e.draggable, curseur: getComputedStyle(e).cursor, hauteur: Math.round(e.getBoundingClientRect().height), min: +e.getAttribute('aria-valuemin'), max: +e.getAttribute('aria-valuemax') }; }, tuile('urgent'));
  ok('3 · la poignée d’une tuile : un séparateur horizontal nommé, draggable="false", curseur row-resize, bande de 6 px', p.role === 'separator' && p.orientation === 'horizontal' && /Hauteur de la tuile/.test(p.nom) && p.glisse === false && p.curseur === 'row-resize' && p.hauteur === 6, JSON.stringify(p));
  const h0 = await hauteur(page, tuile('urgent'));
  ok('3 · son maximum est la hauteur naturelle de la tuile, son minimum 160 px', p.min === 160 && Math.abs(p.max - h0) <= 3, `${JSON.stringify(p)} tuile ${h0}`);
  const voisine = await page.$eval(tuile('avant'), e => Math.round(e.getBoundingClientRect().top)), v0 = await page.$$eval('#tb-grille .tb-tuile', xs => xs.map(x => Math.round(x.getBoundingClientRect().top)).join(','));
  const nEcr = ecrites('accueil.tableau').length;
  // tirer de −100 px : la tuile se raccourcit ; le corps se voit pendant le geste ; la tuile ne devient pas « glissée »
  let mi = null;
  const hCible = h0 - 100;
  await page.evaluate(() => document.querySelector('#tb-grille .tb-tuile[data-k="urgent"]').scrollIntoView({ block: 'center' }));
  await tirer(page, `${tuile('urgent')} > .poignee`, 0, -100, { lacher: false, entre: async () => {
    await page.waitForTimeout(80);
    mi = await page.evaluate(sel => ({ redim: document.documentElement.classList.contains('redim'), glisse: !!document.querySelector('.tb-tuile.glisse'), corps: getComputedStyle(document.querySelector(`${sel} .tb-corps`)).opacity, h: Math.round(document.querySelector(sel).getBoundingClientRect().height), var: document.querySelector(sel).style.getPropertyValue('--h-tuile') }), tuile('urgent'));
  } });
  ok('3 · pendant le geste : html.redim, la tuile suit le pointeur, son corps se voit (opacité 1), aucune classe « glisse »', !!mi && mi.redim && !mi.glisse && mi.corps === '1' && Math.abs(mi.h - hCible) <= 2 && mi.var === `${mi.h}px`, JSON.stringify(mi));
  ok('3 · pendant le geste, rien n’est écrit dans le compte', ecrites('accueil.tableau').length === nEcr);
  await page.screenshot({ path: `${CAPT}/tuile-hauteur.png`, fullPage: false });
  await page.mouse.up();
  await page.waitForTimeout(1400);
  const h1 = await hauteur(page, tuile('urgent'));
  ok('3 · au relâchement la tuile fait la hauteur tirée (± 2 px), et son corps défile (overflow auto)', Math.abs(h1 - hCible) <= 2 && await page.$eval(`${tuile('urgent')} .tb-corps`, e => getComputedStyle(e).overflowY === 'auto' && e.scrollHeight > e.clientHeight), String(h1));
  const eu = ecrites('accueil.tableau');
  const derniere = eu.at(-1)?.valeur?.tuiles?.find(t => t.k === 'urgent');
  ok('3 · une seule écriture de accueil.tableau par geste, avec tuiles[urgent].hauteur égale à la hauteur tirée (± 2 px)', eu.length === nEcr + 1 && derniere && Math.abs(derniere.hauteur - h1) <= 2, `${eu.length - nEcr} écriture(s) ; ${JSON.stringify(derniere)}`);
  ok('3 · les autres tuiles ne sont pas tirées par la hauteur de celle-ci (align-items: start) : les voisines de la même rangée restent en haut', await page.$eval(tuile('avant'), (e, v) => Math.round(e.getBoundingClientRect().top) <= v + 1, voisine));
  ok('3 · aucune autre tuile n’a de hauteur écrite', eu.at(-1).valeur.tuiles.filter(t => t.k !== 'urgent').every(t => t.hauteur === null || t.hauteur === undefined));
  // le glisser-déposer natif d'une tuile marche toujours (sa poignée ne l'avale pas, et il ne s'ouvre pas depuis elle)
  const dejaGlisse = await page.evaluate(() => { const poignee = document.querySelector('.tb-tuile[data-k="urgent"] > .poignee'); const e = new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() }); poignee.dispatchEvent(e); return { prevenu: e.defaultPrevented, glisse: !!document.querySelector('.tb-tuile.glisse') }; });
  ok('3 · un dragstart parti de la poignée est annulé : la tuile ne passe pas en « glisse »', dejaGlisse.prevenu && !dejaGlisse.glisse, JSON.stringify(dejaGlisse));
  const titre = await page.evaluate(() => { const e = new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() }); document.querySelector('.tb-tuile[data-k="actions"] .tb-tete').dispatchEvent(e); const r = !!document.querySelector('.tb-tuile.glisse'); document.querySelector('#vue').dispatchEvent(new DragEvent('dragend', { bubbles: true })); return r; });
  ok('3 · et le glisser-déposer d’une tuile par son titre fonctionne comme avant', titre);
  // « Annuler » : réinitialiser puis annuler rend la hauteur
  await page.click('#tb-reinit');
  await page.waitForTimeout(300);
  ok('3 · « Réinitialiser » rend à la tuile sa hauteur naturelle', Math.abs((await hauteur(page, tuile('urgent'))) - h0) <= 3, String(await hauteur(page, tuile('urgent'))));
  await page.click('.annonce:last-of-type [data-tt="retour"]');
  await page.waitForTimeout(400);
  ok('3 · « Annuler » rend la hauteur tirée', Math.abs((await hauteur(page, tuile('urgent'))) - h1) <= 2, String(await hauteur(page, tuile('urgent'))));
  // le clavier : ↑ raccourcit de 16 px, Entrée rend la taille d'origine
  await page.focus(`${tuile('urgent')} > .poignee`);
  await page.keyboard.press('ArrowUp');
  ok('3 · au clavier, ↑ raccourcit la tuile de 16 px', Math.abs((await hauteur(page, tuile('urgent'))) - (h1 - 16)) <= 2, String(await hauteur(page, tuile('urgent'))));
  await page.keyboard.press('Enter');
  for (let i = 0; i < 20 && Math.abs((await hauteur(page, tuile('urgent'))) - h0) > 3; i++) await page.waitForTimeout(150);      // (l'animation de retour, plus lente quand la machine est chargée)
  await page.waitForTimeout(700);
  ok('3 · Entrée rend la taille d’origine : la hauteur est effacée de la disposition', Math.abs((await hauteur(page, tuile('urgent'))) - h0) <= 3 && !(await page.$eval(tuile('urgent'), e => e.style.getPropertyValue('--h-tuile'))), String(await hauteur(page, tuile('urgent'))));
  // retirer la hauteur puis la redonner, quitter « Personnaliser » : la hauteur reste, les poignées partent
  await tirer(page, `${tuile('urgent')} > .poignee`, 0, -80);
  await page.waitForTimeout(1200);
  const h2 = await hauteur(page, tuile('urgent'));
  await page.click('#tb-fini');
  await page.waitForTimeout(300);
  ok('3 · « Terminer » : plus aucune poignée dans la grille, la tuile garde sa hauteur', (await compte(page, '#tb-grille .poignee')) === 0 && Math.abs((await hauteur(page, tuile('urgent'))) - h2) <= 2);
  // rechargement : la hauteur revient (lue dans le compte)
  await recharger(page, '#/accueil');
  await page.waitForSelector(`${tuile('urgent')} .tb-corps`, { timeout: 15000 });
  await page.waitForTimeout(500);
  ok('3 · recharger : la hauteur de la tuile revient avec la disposition', Math.abs((await hauteur(page, tuile('urgent'))) - h2) <= 2, `${await hauteur(page, tuile('urgent'))} pour ${h2}`);
  ok('3 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  // une hauteur illisible ou hors bornes dans le compte : ramenée entre 160 et 1 200 px, ou ignorée
  for (const [h, attendu] of [['abc', 'aucune'], [-5, 160], [5000, 'aucune'], [null, 'aucune'], [240, 240]]) {
    repartir();
    garder('accueil.tableau', { v: 1, modifie: 1, colonnes: 'auto', tuiles: [{ k: 'urgent', visible: true, taille: 'm', replie: false, hauteur: h, reglages: {} }] });
    const { ctx, page } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
    await page.waitForSelector(`${tuile('urgent')} .tb-corps`, { timeout: 15000 });
    await page.waitForTimeout(300);
    const v = await page.$eval(tuile('urgent'), e => e.style.getPropertyValue('--h-tuile'));
    const nat = await hauteur(page, tuile('urgent'));
    const sansEffet = h === 5000, ignoree = attendu === 'aucune';
    const juste = sansEffet ? v === '1200px' : ignoree ? v === '' : (v === `${attendu}px` && (attendu === 160 || Math.abs(nat - attendu) <= 2));
    ok(`3 · une hauteur gardée « ${h} » : ${ignoree ? (sansEffet ? 'ramenée à 1 200 px (plus haute que la tuile : sans effet)' : 'ignorée') : `${attendu} px`}`, juste, `${JSON.stringify(v)} ${nat}`);
    await ctx.close();
  }
}

// ================================================================================ 4 · l'éditeur A4 : le zoom
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 760, hauteur: 900, hash: '#/feuilles/102' });
  await page.waitForSelector('#fr-composer', { timeout: 15000 });
  await page.click('#fr-composer');
  await page.waitForSelector('.a4-doc .a4-b, .a4-doc', { timeout: 8000 });
  await page.waitForTimeout(1500);
  const pages = () => page.$$eval('.a4-feuille', xs => xs.length);
  // (le déroulé type d'une date du harnais tient sur une page : un saut de page, posé après le troisième bloc, en fait deux)
  const deuxPages = async () => { if ((await pages()) < 2) { await page.click('.a4-doc > :nth-child(3)'); await page.click('[data-a4="saut"]'); await page.waitForTimeout(800); } };
  await deuxPages();
  const echelle = () => page.evaluate(() => { const p = document.querySelector('.a4-pile'); return { transform: p.style.transform, largeur: Math.round(parseFloat(document.querySelector('.a4-echelle').style.width)) }; });
  const n0 = await pages();
  ok('4 · « Composer la feuille » compose depuis le déroulé type, puis un saut de page : au moins deux pages A4', n0 >= 2, `${n0} page(s)`);
  const g = await page.evaluate(() => ({ boutons: [...document.querySelectorAll('.a4-zoom button')].map(b => `${b.textContent.trim()}|${b.getAttribute('aria-label') || ''}|${b.dataset.a4}`), vivant: document.querySelector('#a4-zoom-val')?.getAttribute('aria-live'), role: document.querySelector('#a4-zoom-val')?.getAttribute('role'), groupe: document.querySelector('.a4-zoom')?.getAttribute('aria-label') }));
  ok('4 · la barre a le groupe « Zoom de la page » : −, 100 %, +, Ajuster, nommés, et une zone annoncée (aria-live)', g.boutons.length === 4 && g.vivant === 'polite' && g.role === 'status' && g.groupe === 'Zoom de la page' && /Réduire/.test(g.boutons[0]) && /Agrandir/.test(g.boutons[2]) && /Ajuster/.test(g.boutons[3]), JSON.stringify(g));
  // (le navigateur écrit l'échelle sur cinq décimales : on compare à 1/10 000 près ; s est l'ancienne formule, min(1, max(0,2, dispo / LARGE)))
  const memeEchelle = (transform, s) => (s >= 1 ? transform === '' : Math.abs(parseFloat(/scale\(([\d.]+)\)/.exec(transform)?.[1]) - s) < 1e-4);
  const ancien = await page.evaluate(() => { const b = document.querySelector('.a4-bureau'), pile = document.querySelector('.a4-pile'), LARGE = parseFloat(getComputedStyle(pile).width), dispo = b.clientWidth - 2 * (b.clientWidth < 500 ? 6 : 16), s = Math.min(1, Math.max(0.2, dispo / LARGE)); return { reel: pile.style.transform, auto: document.querySelector('[data-a4="zoom-auto"]').getAttribute('aria-pressed'), s }; });
  ok('4 · par défaut (« Ajuster ») : l’échelle est la formule d’avant (la page tient dans la largeur, sans dépasser 100 %)', memeEchelle(ancien.reel, ancien.s) && ancien.s < 1 && ancien.auto === 'true', JSON.stringify(ancien));
  ok('4 · le bureau gris ne défile pas quand la page tient', await page.$eval('.a4-bureau', e => e.scrollWidth <= e.clientWidth + 1 && getComputedStyle(e).overflowX === 'auto'));
  const ancre = await page.evaluate(() => [...document.querySelectorAll('.a4-doc > *')].slice(0, 12).map(e => e.style.marginTop || '0').join(','));
  // zoom 50 %, puis 200 %
  await page.click('[data-a4="zoom-cent"]');
  ok('4 · « 100 % » : l’échelle est 1 (aucun transform), la zone dit « Zoom 100 % »', (await echelle()).transform === '' && await attendre(page, () => /Zoom 100 %/.test(document.querySelector('#a4-zoom-val').textContent), null, 1500));
  for (let i = 0; i < 5; i++) await page.click('[data-a4="zoom-moins"]');
  const e50 = await echelle();
  ok('4 · cinq fois « − » : 50 %, le transform est scale(0.5), la largeur de la pile 50 % de celle d’une page', e50.transform === 'scale(0.5)' && await page.$eval('[data-a4="zoom-moins"]', b => b.disabled), JSON.stringify(e50));
  const p50 = await pages();
  ok('4 · à 50 %, la pagination est la même (rien à diviser : offsetTop ne voit pas le transform)', p50 === n0 && (await page.evaluate(() => [...document.querySelectorAll('.a4-doc > *')].slice(0, 12).map(e => e.style.marginTop || '0').join(','))) === ancre, `${p50} pour ${n0}`);
  await page.waitForTimeout(600);
  ok('4 · une seule écriture de fenetres.a4-zoom, à 50 (cinq clics rapides, une valeur gardée)', ecrites('fenetres.a4-zoom').length === 1 && ecrites('fenetres.a4-zoom')[0].valeur === 50, JSON.stringify(ecrites('fenetres.a4-zoom')));
  await page.click('[data-a4="zoom-cent"]');
  for (let i = 0; i < 10; i++) await page.click('[data-a4="zoom-plus"]');
  const e200 = await echelle();
  ok('4 · dix fois « + » depuis 100 % : 200 %, scale(2), « + » grisé', e200.transform === 'scale(2)' && await page.$eval('[data-a4="zoom-plus"]', b => b.disabled), JSON.stringify(e200));
  ok('4 · à 200 %, la pagination est la même', (await pages()) === n0);
  ok('4 · à 200 %, le bureau gris défile : scrollWidth > clientWidth', await page.$eval('.a4-bureau', e => e.scrollWidth > e.clientWidth + 10), await page.$eval('.a4-bureau', e => `${e.scrollWidth} / ${e.clientWidth}`));
  ok('4 · la zone annoncée dit « Zoom 200 % »', /Zoom 200 %/.test(await texte(page, '#a4-zoom-val')), await texte(page, '#a4-zoom-val'));
  await page.evaluate(() => document.querySelector('.a4-bureau').scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: `${CAPT}/a4-zoom.png`, fullPage: false });
  // les dernières écritures : 100 puis 200 (une par arrêt)
  await page.waitForTimeout(700);
  ok('4 · la valeur gardée est la dernière (200)', ecrites('fenetres.a4-zoom').at(-1).valeur === 200, JSON.stringify(ecrites('fenetres.a4-zoom')));
  // Ctrl + molette : sur le bureau, le geste est pris (preventDefault) ; ailleurs, le zoom du navigateur reste à lui
  const prevenu = await page.evaluate(() => {
    const tire = (cible, ctrlKey) => { const e = new WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey, deltaY: 0 }); let vu = null; const f = x => { vu = x.defaultPrevented; }; document.addEventListener('wheel', f); cible.dispatchEvent(e); document.removeEventListener('wheel', f); return vu; };
    return { bureauCtrl: tire(document.querySelector('.a4-bureau'), true), bureauSans: tire(document.querySelector('.a4-bureau'), false), barreCtrl: tire(document.querySelector('.a4-outils'), true), fenetreCtrl: tire(document.querySelector('h1'), true) };
  });
  ok('4 · Ctrl + molette sur le bureau est pris (preventDefault) ; sans Ctrl, sur la barre ou ailleurs, le navigateur garde la main', prevenu.bureauCtrl === true && prevenu.bureauSans === false && prevenu.barreCtrl === false && prevenu.fenetreCtrl === false, JSON.stringify(prevenu));
  // (un point du bureau gris que ni la barre collée en haut ni le bas de la fenêtre ne couvrent)
  const hb = await page.$eval('.a4-bureau', e => { const r = e.getBoundingClientRect(), b = document.querySelector('.a4-outils').getBoundingClientRect(); return { x: r.left + r.width / 2, y: (Math.max(r.top, b.bottom) + Math.min(r.bottom, innerHeight)) / 2 }; });
  ok('4 · (le point visé est bien sur le bureau gris)', await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.a4-bureau'), hb));
  await page.mouse.move(hb.x, hb.y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(150);
  await page.keyboard.up('Control');
  ok('4 · Ctrl + molette vers le bas réduit le zoom de 10 % (190 %)', /Zoom 190 %/.test(await texte(page, '#a4-zoom-val')), await texte(page, '#a4-zoom-val'));
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -120); await page.waitForTimeout(100); await page.mouse.wheel(0, -120);
  await page.waitForTimeout(150);
  await page.keyboard.up('Control');
  ok('4 · Ctrl + molette vers le haut l’agrandit (200 %, borné)', /Zoom 200 %/.test(await texte(page, '#a4-zoom-val')), await texte(page, '#a4-zoom-val'));
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(100);
  ok('4 · la molette seule ne change pas le zoom', /Zoom 200 %/.test(await texte(page, '#a4-zoom-val')));
  // la vue de l'équipe grise le zoom
  await page.click('[data-fr-vue="tel"]');
  await page.waitForTimeout(300);
  ok('4 · en « Vue de l’équipe », les boutons du zoom sont grisés', await page.$$eval('.a4-zoom button', xs => xs.every(b => b.disabled)));
  await page.click('[data-fr-vue="page"]');
  await page.waitForTimeout(800);
  ok('4 · au retour sur la page A4, le zoom (200 %) est retrouvé', (await echelle()).transform === 'scale(2)' && await page.$eval('[data-a4="zoom-plus"]', b => b.disabled));
  // recharger : le zoom revient
  await page.waitForTimeout(500);
  await recharger(page, '#/feuilles/102');
  await page.waitForSelector('#fr-composer', { timeout: 15000 });
  await page.click('#fr-composer');
  await page.waitForSelector('.a4-doc', { timeout: 8000 });
  await page.waitForTimeout(1200);
  await deuxPages();
  ok('4 · recharger puis rouvrir une feuille : le zoom gardé (200 %) revient', (await echelle()).transform === 'scale(2)' && (await pages()) === n0, JSON.stringify(await echelle()));
  // Ajuster : l'ancien calcul
  await page.click('[data-a4="zoom-auto"]');
  await page.waitForTimeout(600);
  const apres = await page.evaluate(() => { const b = document.querySelector('.a4-bureau'), pile = document.querySelector('.a4-pile'), LARGE = parseFloat(getComputedStyle(pile).width), dispo = b.clientWidth - 2 * (b.clientWidth < 500 ? 6 : 16), s = Math.min(1, Math.max(0.2, dispo / LARGE)); return { s, reel: pile.style.transform }; });
  ok('4 · « Ajuster » : pile.style.transform est celui de l’ancien calcul', memeEchelle(apres.reel, apres.s) && apres.reel !== '' && ecrites('fenetres.a4-zoom').at(-1).valeur === 'auto', JSON.stringify({ apres, ecrit: ecrites('fenetres.a4-zoom').at(-1) }));
  // sous « Ajuster », la fenêtre qui change de taille ajuste la page ; sous un zoom fixe, non
  await page.setViewportSize({ width: 700, height: 900 });
  await page.waitForTimeout(600);
  const petit = await echelle();
  ok('4 · sous « Ajuster », la fenêtre qui rétrécit rapetisse la page', parseFloat(/scale\(([\d.]+)\)/.exec(petit.transform)?.[1] || '1') < parseFloat(/scale\(([\d.]+)\)/.exec(apres.reel)[1]), `${petit.transform} contre ${apres.reel}`);
  await page.click('[data-a4="zoom-cent"]');
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.waitForTimeout(600);
  ok('4 · sous un zoom fixe (100 %), la fenêtre qui change de taille ne change pas l’échelle', (await echelle()).transform === '');
  // « Disposition d'origine » : la page ouverte repasse à « Ajuster » tout de suite (à 700 px, plus petite que 100 %), sans réécrire la clé
  await page.setViewportSize({ width: 700, height: 900 });
  await page.waitForTimeout(600);
  const nZoom = ecrites('fenetres.a4-zoom').length;
  await page.click('#fen-origine');
  await page.waitForTimeout(800);
  const remise = await echelle();
  ok('4 · « Disposition d’origine » ramène la page ouverte à « Ajuster » sur-le-champ (plus petite que 100 % à 700 px), et seule la remise à zéro est écrite', /^scale\(0\./.test(remise.transform) && ecrites('fenetres.a4-zoom').length === nZoom + 1 && ecrites('fenetres.a4-zoom').at(-1).valeur === null, `${JSON.stringify(remise)} ${JSON.stringify(ecrites('fenetres.a4-zoom').slice(nZoom))}`);
  ok('4 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 5 · le téléphone, l'impression
{
  repartir();
  for (const hash of ['#/planning', '#/representations/carte', '#/accueil']) {
    const tel = await ouvrir(navigateur, { largeur: 390, hauteur: 800, hash });
    await tel.page.waitForTimeout(1500);
    if (hash === '#/planning') { await tel.page.click('[data-pl-vue="mois"]').catch(() => {}); await tel.page.waitForTimeout(400); }
    ok(`5 · à 390 px, ${hash} : aucune poignée dans la page`, (await compte(tel.page, '.poignee')) === 0 && tel.erreurs.length === 0, tel.erreurs.join(' / '));
    await tel.ctx.close();
  }
  // au téléphone, ce que l'ordinateur a réglé ne s'applique pas : une hauteur de tuile et un zoom de la page A4 gardés avec le compte
  garder('accueil.tableau', { v: 1, modifie: 1, colonnes: 'auto', tuiles: [{ k: 'urgent', visible: true, taille: 'm', replie: false, hauteur: 200, reglages: {} }] });
  const telT = await ouvrir(navigateur, { largeur: 390, hauteur: 900, hash: '#/accueil', tactile: true });
  await telT.page.waitForSelector(`${tuile('urgent')} .tb-corps`, { timeout: 15000 });
  await telT.page.waitForTimeout(400);
  const ht = await telT.page.$eval(tuile('urgent'), e => ({ h: Math.round(e.getBoundingClientRect().height), max: getComputedStyle(e).maxHeight }));
  ok('5 · à 390 px, avec une hauteur de tuile (200 px) gardée à l’ordinateur : la tuile garde la sienne (max-height: none, plus haute que 200 px)', ht.max === 'none' && ht.h > 205, JSON.stringify(ht));
  await telT.ctx.close();
  repartir(); garder('fenetres.a4-zoom', 200);
  const telA = await ouvrir(navigateur, { largeur: 390, hauteur: 900, hash: '#/feuilles/102', tactile: true });
  await telA.page.waitForSelector('#fr-composer', { timeout: 15000 });
  await telA.page.click('#fr-composer');
  await telA.page.waitForSelector('.a4-doc', { timeout: 8000 });
  await telA.page.waitForTimeout(1200);
  const za = await telA.page.evaluate(() => { const b = document.querySelector('.a4-bureau'), g = document.querySelector('.a4-zoom'); return { transform: document.querySelector('.a4-pile').style.transform, defile: b.scrollWidth > b.clientWidth + 2, groupe: getComputedStyle(g).display }; });
  ok('5 · à 390 px, avec un zoom A4 de 200 % gardé à l’ordinateur : la page reste ajustée (pas de scale(2), le bureau ne défile pas) et le groupe de zoom est masqué', za.transform !== 'scale(2)' && !za.defile && za.groupe === 'none', JSON.stringify(za));
  await telA.page.keyboard.down('Control');
  const molette = await telA.page.evaluate(() => { const e = new WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey: true, deltaY: -120 }); document.querySelector('.a4-bureau').dispatchEvent(e); return e.defaultPrevented; });
  await telA.page.keyboard.up('Control');
  ok('5 · à 390 px, Ctrl + molette sur le bureau est inerte (le navigateur garde la main), rien n’est écrit', molette === false && ecrites('fenetres.a4-zoom').length === 0, `${molette} ${ecrites('fenetres.a4-zoom').length}`);
  await telA.ctx.close();
  repartir();
  const tac = await ouvrir(navigateur, { largeur: 1280, hauteur: 800, hash: '#/planning', tactile: true });
  await tac.page.waitForSelector('.pl', { timeout: 15000 });
  await tac.page.click('[data-pl-vue="mois"]');
  await tac.page.waitForTimeout(400);
  ok('5 · à 1 280 px avec un écran tactile (pointer: coarse), le planning n’a pas de poignée et le détail garde 300 px', (await compte(tac.page, '.poignee')) === 0 && (await largeur(tac.page, '.pl-detail')) === 300);
  await tac.ctx.close();
  const { ctx, page } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/planning' });
  await page.waitForSelector('.pl-grille-e', { timeout: 15000 });
  await page.click('.pl-e-jour button[data-pl-jour]');
  await page.waitForSelector('.pl-mise > .poignee', { timeout: 4000 });
  await page.emulateMedia({ media: 'print' });
  const im = await page.evaluate(() => ({ poignee: [...document.querySelectorAll('.poignee')].every(e => getComputedStyle(e).display === 'none'), detail: getComputedStyle(document.querySelector('.pl-detail')).display, defile: getComputedStyle(document.querySelector('.pl-defile')).overflow, largeur: Math.round(document.querySelector('.pl-defile').getBoundingClientRect().width), page: Math.round(document.querySelector('#vue').getBoundingClientRect().width) }));
  ok('5 · à l’impression de la vue Équipe : ni poignée ni détail, la grille se déroule (overflow visible) et prend la largeur de la page', im.poignee && im.detail === 'none' && im.defile === 'visible' && im.largeur >= im.page - 4, JSON.stringify(im));
  await page.screenshot({ path: `${CAPT}/planning-impression.png`, fullPage: false });
  await page.emulateMedia({ media: 'screen' });
  await ctx.close();
}
{
  repartir();
  const { ctx, page } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await page.waitForSelector(`${tuile('urgent')} .tb-corps`, { timeout: 15000 });
  await page.click('#tb-personnaliser');
  await page.waitForSelector(`${tuile('urgent')} > .poignee`);
  await page.emulateMedia({ media: 'print' });
  ok('5 · à l’impression du tableau de bord en « Personnaliser », aucune poignée n’est montrée', await page.evaluate(() => [...document.querySelectorAll('.poignee')].every(e => getComputedStyle(e).display === 'none')));
  await ctx.close();
}

// ================================================================================ 6 · le budget de CPU
{
  repartir();
  const a = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/planning', cpu: 4, longues: true });
  await a.page.waitForSelector('.pl-grille-e', { timeout: 15000 });
  await a.page.click('[data-pl-vue="mois"]');
  await a.page.waitForSelector('.pl-mise > .poignee');
  await a.page.waitForTimeout(1500);
  await a.page.evaluate(() => { window.__longues.length = 0; window.__pret = performance.now(); });
  await tirer(a.page, '.pl-mise > .poignee', -150, 0);
  await tirer(a.page, '.pl-mise > .poignee', 80, 0);
  await a.page.waitForTimeout(700);
  const l1 = await a.page.evaluate(() => window.__longues.slice());
  console.log(`tâches longues pendant deux glisser du détail du planning à CPU=4 (ms) : ${JSON.stringify(l1)}`);
  ok('6 · aucune tâche > 200 ms pendant un glisser de la colonne du détail du planning, à CPU=4', l1.every(d => d < 200), JSON.stringify(l1));
  await a.ctx.close();
  const b = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/carte', cpu: 4, longues: true });
  await b.page.waitForSelector('.tn-deux > .poignee');
  await b.page.waitForTimeout(1500);
  await b.page.evaluate(() => { window.__longues.length = 0; window.__pret = performance.now(); });
  await tirer(b.page, '.tn-deux > .poignee', -150, 0);
  await tirer(b.page, '.tn-deux > .poignee', 80, 0);
  await b.page.waitForTimeout(700);
  const l2 = await b.page.evaluate(() => window.__longues.slice());
  console.log(`tâches longues pendant deux glisser de la colonne de la carte à CPU=4 (ms) : ${JSON.stringify(l2)}`);
  ok('6 · aucune tâche > 200 ms pendant un glisser de la colonne de la carte, à CPU=4', l2.every(d => d < 200), JSON.stringify(l2));
  await b.ctx.close();
  const c = await ouvrir(navigateur, { largeur: 1440, hauteur: 1700, hash: '#/accueil', cpu: 4, longues: true });
  await c.page.waitForSelector(`${tuile('urgent')} .tb-corps`, { timeout: 15000 });
  await c.page.click('#tb-personnaliser');
  await c.page.waitForSelector(`${tuile('urgent')} > .poignee`);
  await c.page.evaluate(() => document.querySelector('#tb-grille .tb-tuile[data-k="urgent"]').scrollIntoView({ block: 'center' }));
  await c.page.waitForTimeout(1500);
  await c.page.evaluate(() => { window.__longues.length = 0; window.__pret = performance.now(); });
  await tirer(c.page, `${tuile('urgent')} > .poignee`, 0, -90);
  await tirer(c.page, `${tuile('urgent')} > .poignee`, 0, 40);
  await c.page.waitForTimeout(700);
  const l3 = await c.page.evaluate(() => window.__longues.slice());
  console.log(`tâches longues pendant deux glisser de la hauteur d’une tuile à CPU=4 (ms) : ${JSON.stringify(l3)}`);
  ok('6 · aucune tâche > 200 ms pendant un glisser de la hauteur d’une tuile, à CPU=4', l3.every(d => d < 200), JSON.stringify(l3));
  await c.ctx.close();
}

await navigateur.close();
bilan(CAPT);
