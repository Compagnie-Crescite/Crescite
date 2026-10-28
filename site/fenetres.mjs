// Les fenêtres ajustables de l'administration (admin/fenetres.js : la poignée, les bornes, la mémoire ; admin/tiroir.js : la
// largeur du tiroir, le bouton « ⋯ », le recul des tiroirs couverts ; admin/menus.js : le menu de l'en-tête du tiroir ;
// admin/index.html : la colonne de la liste à côté d'une fiche, le geste qui suspend le glissement des lignes et le pied),
// vérifiées dans Chromium, hors ligne, sur la base fictive commune (admin-fictif.mjs).
//   python3 site/build.py && node site/fenetres.mjs
// Ce que le banc regarde : la poignée du tiroir (un séparateur nommé, ses valeurs, sa place dans l'ordre du clavier ; un glisser
// de −200 px qui écrit fenetres.tiroir une seule fois, au relâchement ; la largeur retrouvée à la réouverture, bornée à
// l'écran moins 80 px sur un écran plus petit ; le double-clic et Entrée qui rendent la taille d'origine, les flèches, le
// bouton « ⋯ » et « Plus large » ; le recul du tiroir couvert qui tient compte de la différence des largeurs ; Échap qui
// ferme toujours) ; le séparateur de la liste (une largeur pour toutes les pages à deux colonnes, rien pendant le geste
// qui fasse glisser les lignes, retrouvé après un enregistrement à sa place, absent sous 1 100 px, lu par le squelette) ;
// le geste lui-même (html.redim, transitions coupées, rien d'écrit avant le relâchement, aucune tâche > 200 ms à CPU=4) ;
// la remise animée une fois, et pas du tout sous « moins d'animations » ; « Disposition d'origine » et son « Annuler »
// (toutOublier, rendre) ; le téléphone et le doigt, où il n'y a aucune poignée ; l'impression, qui n'en montre pas.
// Les captures vont dans site/dist/shots-fenetres/. Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, UID, URL0, DB, ECRITURES, resultats, ok, calme, ouvrir, texte, compte, tuile, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-fenetres');
// une exception en route (un élément qui manque) : ce qui a été vérifié jusque-là est dit avant la sortie en erreur
process.on('uncaughtException', e => { for (const [etat, nom, detail] of resultats) console.log(`${etat === 'ok' ? '  ✓' : '  ✗'} ${nom}${etat === 'KO' && detail ? `\n      ${detail}` : ''}`); console.error(e.message); process.exit(1); });
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
const attendre = (page, fn, arg = null, ms = 6000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
const ecrites = cle => ECRITURES.filter(e => e.cle === cle);
const repartir = () => { DB.crescite_preferences = []; ECRITURES.length = 0; };
const garder = (cle, valeur) => DB.crescite_preferences.push({ user_id: UID, cle, valeur });
const largeurTiroir = page => page.evaluate(() => { const t = [...document.querySelectorAll('.tiroir')].pop(); return t ? t.style.getPropertyValue('--tiroir-largeur') : null; });
const racine = (page, nom) => page.evaluate(n => document.documentElement.style.getPropertyValue(n), nom);
// le milieu visible d'une poignée (un séparateur de liste est aussi haut que la page : on vise ce qui se voit)
const milieu = (page, sel) => page.evaluate(s => {
  const r = document.querySelector(s).getBoundingClientRect(), haut = Math.max(r.top, 0), bas = Math.min(r.bottom, innerHeight);
  return { x: r.left + r.width / 2, y: haut + Math.min(300, (bas - haut) / 2) };
}, sel);
// tirer une poignée de dx : appuyer, bouger en dix pas, lâcher (la pause laisse le temps à une image entre deux pas)
async function tirer(page, sel, dx, dy = 0, { lacher = true, entre = null } = {}) {
  const { x, y } = await milieu(page, sel);
  await page.mouse.move(x, y); await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(x + dx * i / 10, y + dy * i / 10); await page.waitForTimeout(12); }
  if (entre) await entre();
  if (lacher) await page.mouse.up();
  return { x, y };
}
// ouvrir le tiroir d'une date depuis le tableau de bord (niveau.mjs)
async function ouvrirTiroir(page) {
  await page.waitForSelector(`${tuile('prochaines')} .tb-l`, { timeout: 15000 });
  await page.click(`${tuile('prochaines')} a.tb-l[href="#/representations/101"]`);
  await attendre(page, () => document.querySelector('.tiroir.la #ed-date #s-org'));
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
}

// ================================================================================ 1 · le tiroir : la poignée de son bord gauche
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await ouvrirTiroir(page);
  const p = await page.evaluate(() => { const e = document.querySelector('.tiroir .poignee'); return e && { role: e.getAttribute('role'), orientation: e.getAttribute('aria-orientation'), nom: e.getAttribute('aria-label'), min: e.getAttribute('aria-valuemin'), max: e.getAttribute('aria-valuemax'), now: e.getAttribute('aria-valuenow'), tab: e.tabIndex, titre: e.title, glisse: e.draggable, touch: getComputedStyle(e).touchAction, bande: Math.round(e.getBoundingClientRect().width), curseur: getComputedStyle(e).cursor }; });
  ok('1 · le tiroir a une poignée à son bord gauche : un séparateur vertical nommé, dans l’ordre du clavier, bande de 6 px, curseur col-resize', !!p && p.role === 'separator' && p.orientation === 'vertical' && /Largeur du tiroir/.test(p.nom) && p.tab === 0 && p.glisse === false && p.touch === 'none' && p.bande === 6 && p.curseur === 'col-resize', JSON.stringify(p));
  ok('1 · elle dit sa valeur : 780 px à 1 440 px, de 480 px à l’écran moins 80 px (aria-valuenow, -min, -max)', p.now === '780' && p.min === '480' && p.max === '1360' && /double-clic/.test(p.titre), JSON.stringify(p));
  ok('1 · le tiroir s’ouvre à 780 px (--tiroir-largeur en nombre, pas en min(…))', (await largeurTiroir(page)) === '780px', await largeurTiroir(page));
  ok('1 · rien n’est écrit à l’ouverture d’un tiroir', ecrites('fenetres.tiroir').length === 0 && ECRITURES.every(e => !/^fenetres\./.test(e.cle)), JSON.stringify(ECRITURES.map(e => e.cle)));
  // l’ordre du clavier : « ← », puis la poignée
  const ordre = await page.evaluate(async () => {
    document.querySelector('.tiroir [data-tiroir-fermer]').focus();
    const a = document.activeElement.textContent.trim();
    return a;
  });
  await page.keyboard.press('Tab');
  ok('1 · la poignée suit « ← » dans l’ordre du focus', ordre === '←' && await page.evaluate(() => document.activeElement.classList.contains('poignee')));
  // le survol : la ligne de 2 px paraît
  const { x, y } = await milieu(page, '.tiroir .poignee');
  await page.mouse.move(x, y);
  await page.waitForTimeout(250);
  const ligne = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('.tiroir .poignee'), '::after'); return { opacite: s.opacity, largeur: s.width, fond: s.backgroundColor }; });
  ok('1 · au survol, une ligne de 2 px à la couleur de la saison paraît', ligne.opacite === '1' && ligne.largeur === '2px' && ligne.fond !== 'rgba(0, 0, 0, 0)', JSON.stringify(ligne));
  await page.screenshot({ path: `${CAPT}/poignee-tiroir.png`, fullPage: false });

  // le glisser : −200 px → 980 px ; pendant le geste, html.redim, les transitions coupées, rien d'écrit
  let mi = null;
  await tirer(page, '.tiroir .poignee', -200, 0, { lacher: false, entre: async () => {
    await page.waitForTimeout(80);
    mi = await page.evaluate(() => ({ redim: document.documentElement.classList.contains('redim'), sens: document.documentElement.dataset.redim, transition: getComputedStyle(document.querySelector('.tiroir')).transitionDuration, selection: getComputedStyle(document.body).userSelect, curseur: getComputedStyle(document.querySelector('.tiroir .poignee')).cursor, largeur: document.querySelector('.tiroir').style.getPropertyValue('--tiroir-largeur'), actif: document.querySelector('.tiroir .poignee').classList.contains('actif') }));
  } });
  ok('1 · pendant le glisser : html.redim, les transitions coupées, rien ne se sélectionne, la largeur suit le pointeur', !!mi && mi.redim && mi.sens === 'x' && mi.transition === '0s' && mi.selection === 'none' && mi.curseur === 'col-resize' && mi.actif && mi.largeur === '980px', JSON.stringify(mi));
  ok('1 · pendant le glisser, rien n’est encore écrit dans le compte', ecrites('fenetres.tiroir').length === 0);
  await page.mouse.up();
  await attendre(page, () => true);
  await page.waitForTimeout(600);
  ok('1 · le glisser ne sélectionne aucun texte de la page', await page.evaluate(() => getSelection().toString() === ''));
  ok('1 · tirer le bord de −200 px donne 980 px', (await largeurTiroir(page)) === '980px', await largeurTiroir(page));
  ok('1 · au relâchement, html.redim est levé et la poignée redevient discrète', await page.evaluate(() => !document.documentElement.classList.contains('redim') && !document.documentElement.dataset.redim && !document.querySelector('.poignee.actif')));
  ok('1 · fenetres.tiroir est écrit une seule fois (au relâchement, pas à chaque mouvement), à 980', ecrites('fenetres.tiroir').length === 1 && ecrites('fenetres.tiroir')[0].valeur === 980, JSON.stringify(ecrites('fenetres.tiroir')));
  ok('1 · la poignée redit sa valeur (aria-valuenow 980) et l’annonce en différé aux lecteurs d’écran', (await page.$eval('.tiroir .poignee', e => e.getAttribute('aria-valuenow'))) === '980' && await attendre(page, () => /Largeur : 980 px/.test(document.getElementById('sr-fenetres')?.textContent || ''), null, 2000));
  await page.screenshot({ path: `${CAPT}/poignee-tiroir-large.png`, fullPage: false });

  // un clic sur la poignée, sans glisser, n'écrit rien
  const n = ECRITURES.length;
  await page.mouse.click(...Object.values(await milieu(page, '.tiroir .poignee')));
  await page.waitForTimeout(500);
  ok('1 · un simple clic sur la poignée (sans glisser) n’écrit rien', ECRITURES.length === n && (await largeurTiroir(page)) === '980px');
  // Échap ferme toujours le tiroir, y compris avec le focus sur la poignée
  await page.focus('.tiroir .poignee');
  await page.keyboard.press('Escape');
  await attendre(page, () => !document.querySelector('.tiroir'));
  ok('1 · Échap ferme le tiroir, le focus sur la poignée ou ailleurs', (await compte(page, '.tiroir')) === 0);
  ok('1 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 2 · la largeur se retrouve, bornée à l'écran
{
  // la page suivante retrouve la largeur gardée (le compte, lu dans la base fictive)
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await ouvrirTiroir(page);
  ok('2 · un second « ouvrir » retrouve la largeur gardée : 980 px', (await largeurTiroir(page)) === '980px', await largeurTiroir(page));
  // un tiroir plus grand que l'écran du moment : 1 500 px gardés, 1 280 px de large → 1 200 px
  await ctx.close();
  repartir(); garder('fenetres.tiroir', 1500);
  const p2 = await ouvrir(navigateur, { largeur: 1280, hauteur: 800, hash: '#/accueil' });
  await ouvrirTiroir(p2.page);
  ok('2 · à 1 280 px, une largeur gardée de 1 500 px est bornée à 1 280 − 80 = 1 200 px (le voile reste cliquable)', (await largeurTiroir(p2.page)) === '1200px', await largeurTiroir(p2.page));
  const reste = await p2.page.evaluate(() => { const v = document.querySelector('.tiroir-voile').getBoundingClientRect(), t = document.querySelector('.tiroir').getBoundingClientRect(); return Math.round(t.left); });
  ok('2 · il reste 80 px de voile à gauche du tiroir', reste === 80, String(reste));
  // la fenêtre rétrécit : le tiroir ouvert suit
  await p2.page.setViewportSize({ width: 1000, height: 800 });
  ok('2 · la fenêtre rétrécit à 1 000 px : le tiroir ouvert suit (920 px)', await attendre(p2.page, () => document.querySelector('.tiroir').style.getPropertyValue('--tiroir-largeur') === '920px', null, 3000), await largeurTiroir(p2.page));
  ok('2 · une valeur illisible (un mot, un nombre négatif) retombe sur la taille d’origine', await (async () => {
    await p2.ctx.close();
    repartir(); garder('fenetres.tiroir', 'large'); const a = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' }); await ouvrirTiroir(a.page);
    const un = await largeurTiroir(a.page); await a.ctx.close();
    repartir(); garder('fenetres.tiroir', -50); const b = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' }); await ouvrirTiroir(b.page);
    const deux = await largeurTiroir(b.page); await b.ctx.close();
    return un === '780px' && deux === '480px';
  })());
  ok('2 · aucune erreur de script', erreurs.length === 0 && p2.erreurs.length === 0, [...erreurs, ...p2.erreurs].join(' / '));
}

// ================================================================================ 3 · la taille d'origine : double-clic, Entrée, flèches, bouton « ⋯ »
{
  repartir(); garder('fenetres.tiroir', 980);
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await ouvrirTiroir(page);
  // la remise s'anime une fois : on regarde la largeur à chaque image
  await page.evaluate(() => { window.__suite = []; const lire = () => { const t = document.querySelector('.tiroir'); if (t) window.__suite.push(t.style.getPropertyValue('--tiroir-largeur')); window.__tour = requestAnimationFrame(lire); }; lire(); });
  await page.mouse.dblclick(...Object.values(await milieu(page, '.tiroir .poignee')));
  await attendre(page, () => document.querySelector('.tiroir').style.getPropertyValue('--tiroir-largeur') === '780px', null, 3000);
  await page.waitForTimeout(300);
  const suite = await page.evaluate(() => { cancelAnimationFrame(window.__tour); return [...new Set(window.__suite)]; });
  const milieux = suite.filter(v => v !== '980px' && v !== '780px');
  ok('3 · un double-clic sur la poignée rend la taille d’origine : 780 px à 1 440 px', (await largeurTiroir(page)) === '780px', await largeurTiroir(page));
  ok('3 · la remise s’anime (220 ms) : plusieurs largeurs entre 980 et 780, toutes dans l’intervalle, qui descendent', milieux.length >= 2 && milieux.every(v => parseInt(v) < 980 && parseInt(v) > 780) && milieux.map(v => parseInt(v)).every((v, i, a) => !i || v <= a[i - 1]), JSON.stringify(suite));
  ok('3 · le double-clic oublie la clé (fenetres.tiroir écrit à null, une fois)', ecrites('fenetres.tiroir').length === 1 && ecrites('fenetres.tiroir')[0].valeur === null, JSON.stringify(ecrites('fenetres.tiroir')));
  ok('3 · la poignée dit 780 après la remise', (await page.$eval('.tiroir .poignee', e => e.getAttribute('aria-valuenow'))) === '780');
  // les flèches : ← agrandit (le bord se déplace avec la flèche), Maj ×4, Début / Fin, puis Entrée
  await page.focus('.tiroir .poignee');
  await page.keyboard.press('ArrowLeft');
  ok('3 · ← élargit le tiroir de 16 px (le bord suit la flèche)', (await largeurTiroir(page)) === '796px', await largeurTiroir(page));
  await page.keyboard.press('Shift+ArrowLeft');
  ok('3 · Maj + ← de 64 px de plus', (await largeurTiroir(page)) === '860px', await largeurTiroir(page));
  await page.keyboard.press('ArrowRight');
  ok('3 · → le rétrécit de 16 px', (await largeurTiroir(page)) === '844px', await largeurTiroir(page));
  await page.waitForTimeout(800);
  ok('3 · les touches n’écrivent qu’une fois, quand on s’arrête (fenetres.tiroir = 844)', ecrites('fenetres.tiroir').length === 2 && ecrites('fenetres.tiroir')[1].valeur === 844, JSON.stringify(ecrites('fenetres.tiroir').map(e => e.valeur)));
  await page.keyboard.press('End');
  ok('3 · Fin : la plus grande (écran moins 80 px)', (await largeurTiroir(page)) === '1360px', await largeurTiroir(page));
  await page.keyboard.press('Home');
  ok('3 · Début : la plus petite (480 px)', (await largeurTiroir(page)) === '480px', await largeurTiroir(page));
  await page.keyboard.press('Enter');
  ok('3 · Entrée : la taille d’origine (780 px), sans qu’Entrée n’aille ailleurs', await attendre(page, () => document.querySelector('.tiroir').style.getPropertyValue('--tiroir-largeur') === '780px', null, 3000) && (await compte(page, '.tiroir')) === 1);
  await page.waitForTimeout(500);

  // le bouton « ⋯ » et le menu de l'en-tête
  const bouton = await page.evaluate(() => { const b = document.querySelector('.tiroir .tiroir-tete [data-gestes-menu]'); return b && { haspopup: b.getAttribute('aria-haspopup'), titre: b.title, nom: b.textContent.replace(/\s+/g, ' ').trim(), visible: b.getBoundingClientRect().width > 0, apres: b.previousElementSibling?.matches('[data-tiroir-pleine]') }; });
  ok('3 · un bouton « ⋯ » visible dans l’en-tête, après « Pleine page » (aria-haspopup="menu", « Taille du tiroir »)', !!bouton && bouton.haspopup === 'menu' && /Taille du tiroir/.test(bouton.titre) && /⋯/.test(bouton.nom) && bouton.visible && bouton.apres, JSON.stringify(bouton));
  await page.click('.tiroir .tiroir-tete [data-gestes-menu]');
  await page.waitForSelector('.gm [role=menuitem]', { timeout: 3000 });
  const items = await page.$$eval('.gm [role=menuitem]', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  ok('3 · le menu propose « Taille d’origine », « Plus large » et « Pleine page »', items.length === 3 && /^Taille d’origine/.test(items[0]) && /^Plus large/.test(items[1]) && /^Pleine page/.test(items[2]), JSON.stringify(items));
  await page.screenshot({ path: `${CAPT}/menu-taille-tiroir.png`, fullPage: false });
  await page.click('.gm [role=menuitem]:nth-child(2)');
  ok('3 · « Plus large » ajoute 160 px (780 → 940)', await attendre(page, () => document.querySelector('.tiroir').style.getPropertyValue('--tiroir-largeur') === '940px', null, 3000), await largeurTiroir(page));
  await page.waitForTimeout(500);
  ok('3 · « Plus large » est gardé (fenetres.tiroir = 940)', ecrites('fenetres.tiroir').at(-1)?.valeur === 940, JSON.stringify(ecrites('fenetres.tiroir').map(e => e.valeur)));
  // le clic droit sur l'en-tête ouvre le même menu, « Taille d'origine » y rend 780
  await page.click('.tiroir .tiroir-fil', { button: 'right' });
  await page.waitForSelector('.gm [role=menuitem]', { timeout: 3000 });
  await page.click('.gm [role=menuitem]:nth-child(1)');
  ok('3 · le clic droit sur l’en-tête ouvre le même menu ; « Taille d’origine » rend 780 px', await attendre(page, () => document.querySelector('.tiroir').style.getPropertyValue('--tiroir-largeur') === '780px', null, 3000), await largeurTiroir(page));
  // Maj+F10 depuis « ← » ouvre aussi le menu
  await page.focus('.tiroir [data-tiroir-fermer]');
  await page.keyboard.press('Shift+F10');
  ok('3 · Maj + F10 sur « ← » ouvre le menu de la taille', await attendre(page, () => document.querySelectorAll('.gm [role=menuitem]').length === 3, null, 2000));
  await page.keyboard.press('Escape');
  await attendre(page, () => !document.querySelector('.gm'));
  ok('3 · Échap ferme le menu d’abord, le tiroir reste ouvert', (await compte(page, '.tiroir.la')) === 1);
  // « Pleine page » du menu : la fiche à sa place, comme le lien de l'en-tête
  await page.keyboard.press('Shift+F10');
  await page.waitForSelector('.gm [role=menuitem]', { timeout: 3000 });
  await page.click('.gm [role=menuitem]:nth-child(3)');
  await attendre(page, () => location.hash === '#/representations/101' && !document.querySelector('.tiroir.la'), null, 4000);
  ok('3 · « Pleine page » du menu ouvre la fiche à sa place (#/representations/101) et le tiroir s’en va', await page.evaluate(() => location.hash === '#/representations/101') && (await compte(page, '.tiroir.la')) === 0);
  // « ? » : l'aide dit le geste
  await page.evaluate(() => ouvrirAide());
  await attendre(page, () => document.querySelector('dialog.gq-aide[open] .gq-geste'), null, 3000);
  ok('3 · l’aide « ? » dit « Glisser le bord du tiroir » et « Glisser le séparateur »', /Glisser le bord du tiroir/.test(await texte(page, 'dialog.gq-aide')) && /Glisser le séparateur/.test(await texte(page, 'dialog.gq-aide')));
  ok('3 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 3 bis · saisir la poignée pendant la remise animée
{
  repartir(); garder('fenetres.tiroir', 980);
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await ouvrirTiroir(page);
  const m = await milieu(page, '.tiroir .poignee');
  await page.mouse.dblclick(m.x, m.y);
  await page.waitForTimeout(70);
  const enRoute = await largeurTiroir(page);
  // (un appui sans glisser, en pleine remise : des événements de pointeur posés sur la poignée même, le bord qui file sous la souris ne se vise pas)
  await page.evaluate(() => { const p = document.querySelector('.tiroir .poignee'), r = p.getBoundingClientRect(), o = { pointerId: 7, isPrimary: true, button: 0, bubbles: true, clientX: r.left + 3, clientY: r.top + 300 };
    p.dispatchEvent(new PointerEvent('pointerdown', o)); p.dispatchEvent(new PointerEvent('pointerup', o)); });
  await page.waitForTimeout(500);
  const fin = await largeurTiroir(page);
  ok('3 · un appui sur la poignée en pleine remise la finit d’un coup : 780 px (et non une taille d’entre-deux), html.redim levé', enRoute !== '980px' && enRoute !== '780px' && fin === '780px' && await page.evaluate(() => !document.documentElement.classList.contains('redim')), `${enRoute} → ${fin}`);
  ok('3 · la valeur gardée est celle de la taille d’origine (null), la poignée redit 780', ecrites('fenetres.tiroir').at(-1)?.valeur === null && (await page.$eval('.tiroir .poignee', e => e.getAttribute('aria-valuenow'))) === '780');
  ok('3 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 4 · deux tiroirs : le recul tient compte des largeurs
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await ouvrirTiroir(page);
  await page.click('.tiroir #d-lieu-fiche a[href="#/lieux/5"]');
  await attendre(page, () => document.querySelectorAll('.tiroir.la').length === 2 && document.querySelector('.tiroir #ed-lieu #li-f'));
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
  const recul = () => page.evaluate(() => document.querySelector('.tiroir[aria-hidden="true"]').style.getPropertyValue('--tiroir-recul'));
  ok('4 · deux tiroirs de même largeur : le premier recule de 28 px, en style en ligne', (await recul()) === '28px', await recul());
  const hauts = await page.$$('.tiroir .poignee');
  ok('4 · chaque tiroir a sa poignée', hauts.length === 2);
  await tirer(page, '.tiroir:not([aria-hidden="true"]) .poignee', -200);
  await page.waitForTimeout(500);
  ok('4 · le lieu (au-dessus) élargi de 200 px : le recul de la date vaut 28 + 200 = 228 px', (await recul()) === '228px', await recul());
  const bords = await page.evaluate(() => [...document.querySelectorAll('.tiroir')].map(t => Math.round(t.getBoundingClientRect().left)));
  ok('4 · le bord de la date reste à 28 px à gauche de celui du lieu', bords[0] === bords[1] - 28, JSON.stringify(bords));
  await page.screenshot({ path: `${CAPT}/tiroirs-recul.png`, fullPage: false });
  // un troisième tiroir, plus étroit que le lieu : la date (780 px) est couverte par le lieu (980 px) comme par lui, elle recule d'autant que le plus large
  await page.evaluate(() => TIROIR.ouvrir('#/representations/102'));
  await attendre(page, () => document.querySelectorAll('.tiroir.la').length === 3 && document.querySelector('.tiroir:last-of-type #ed-date'));
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
  const reculs = await page.evaluate(() => [...document.querySelectorAll('.tiroir')].map(t => t.style.getPropertyValue('--tiroir-recul')));
  ok('4 · trois tiroirs (780 / 980 / 780 px) : le lieu recule de 28 px, la date de 2 × 28 + 200 = 256 px (le plus large de ceux qui la couvrent, pas seulement le dernier)', reculs[0] === '256px' && reculs[1] === '28px' && reculs[2] === '', JSON.stringify(reculs));
  await page.keyboard.press('Escape');
  await attendre(page, () => document.querySelectorAll('.tiroir').length === 2);
  ok('4 · le troisième fermé, le recul de la date redevient 228 px', (await recul()) === '228px', await recul());
  await page.keyboard.press('Escape');
  await attendre(page, () => document.querySelectorAll('.tiroir').length === 1);
  ok('4 · le lieu fermé, la date reprend sa place : plus de recul, plus d’aria-hidden', await page.evaluate(() => { const t = document.querySelector('.tiroir'); return !t.style.getPropertyValue('--tiroir-recul') && !t.hasAttribute('aria-hidden') && !t.inert; }));
  // le menu « Taille » du tiroir d'en haut seulement : la poignée du tiroir couvert est inerte
  await page.keyboard.press('Escape');
  await attendre(page, () => !document.querySelector('.tiroir'));
  ok('4 · Échap ferme encore chaque tiroir, l’un après l’autre', (await compte(page, '.tiroir')) === 0);
  ok('4 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 5 · la colonne de la liste
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/101' });
  await page.waitForSelector('#ed-date #s-org', { timeout: 15000 });
  await page.waitForSelector('.deux > .sep-v', { timeout: 5000 });
  const s = await page.evaluate(() => { const e = document.querySelector('.deux > .sep-v'), l = document.querySelector('.deux > .liste'), d = document.querySelector('.deux'); const r = e.getBoundingClientRect(), lr = l.getBoundingClientRect(); return { n: document.querySelectorAll('.sep-v').length, role: e.getAttribute('role'), nom: e.getAttribute('aria-label'), now: e.getAttribute('aria-valuenow'), min: e.getAttribute('aria-valuemin'), max: e.getAttribute('aria-valuemax'), apres: Math.round(r.left - lr.right), enfants: d.children.length, liste: Math.round(lr.width), pos: getComputedStyle(e).position, haut: Math.round(r.height), curseur: getComputedStyle(e).cursor }; });
  ok('5 · #/representations/101 à 1 440 px : un séparateur entre la liste et la fiche, nommé, avec ses valeurs', s.n === 1 && s.role === 'separator' && /Largeur de la liste/.test(s.nom) && s.now === '460' && s.min === '340' && +s.max >= 600 && +s.max <= 700, JSON.stringify(s));
  ok('5 · il est posé en absolu, 3 px avant la fin de la gouttière (la liste + 6 px), sur toute la hauteur de la grille, sans devenir une troisième colonne', s.pos === 'absolute' && s.apres === 6 && s.enfants === 3 && s.liste === 460 && s.curseur === 'col-resize', JSON.stringify(s));
  ok('5 · la liste garde 460 px tant que rien n’est réglé (--l-liste absente de <html>)', (await racine(page, '--l-liste')) === '');
  // (le curseur sur le séparateur, pour que la capture montre sa ligne)
  { const m = await milieu(page, '.deux > .sep-v'); await page.mouse.move(m.x, m.y); await page.waitForTimeout(250); }
  ok('5 · au survol du séparateur, sa ligne de 2 px paraît (celle que montre la capture)', await page.evaluate(() => { const s = getComputedStyle(document.querySelector('.deux > .sep-v'), '::after'); return s.opacity === '1' && s.width === '2px'; }));
  await page.screenshot({ path: `${CAPT}/poignee-liste.png`, fullPage: false });
  await page.mouse.move(5, 5);
  // rien ne glisse pendant le geste : reperer rend une Map vide, glisserVers ne pose aucune animation
  const reperes = await page.evaluate(() => ({ avant: reperer($('[data-liste]')).size }));
  let mi = null, glisse = null;
  await tirer(page, '.deux > .sep-v', 80, 0, { lacher: false, entre: async () => {
    mi = await page.evaluate(() => { const l = $('[data-liste]'); const anims0 = [...document.querySelectorAll('.ligne')].flatMap(e => e.getAnimations()).length; const places = reperer(l); rafraichirListes(); return { redim: document.documentElement.classList.contains('redim'), places: places.size, anims: [...document.querySelectorAll('.ligne')].flatMap(e => e.getAnimations()).length - anims0, largeur: Math.round(document.querySelector('.deux > .liste').getBoundingClientRect().width), actif: document.querySelector('.sep-v').classList.contains('actif'), transition: getComputedStyle(document.querySelector('.deux > .liste')).transitionDuration }; });
  } });
  await page.mouse.up();
  await page.waitForTimeout(500);
  ok('5 · hors geste, reperer note les lignes de la liste (sans quoi la vérification suivante ne prouverait rien)', reperes.avant > 0, String(reperes.avant));
  ok('5 · pendant le geste : html.redim, reperer rend une Map vide, un redessin de la liste ne fait glisser aucune ligne', !!mi && mi.redim && mi.places === 0 && mi.anims === 0 && mi.actif, JSON.stringify(mi));
  ok('5 · +80 px : la liste mesure 540 px pendant le geste (au pas du pointeur), puis --l-liste = 540px sur <html>, la grille de la page redevenue celle de la feuille de style', (await racine(page, '--l-liste')) === '540px' && mi.largeur === 540 && await page.$eval('.deux', e => e.style.gridTemplateColumns === ''), `${await racine(page, '--l-liste')} / ${mi.largeur}`);
  ok('5 · la liste mesure 540 px, le séparateur la suit (6 px après son bord)', await page.evaluate(() => { const l = document.querySelector('.deux > .liste').getBoundingClientRect(), r = document.querySelector('.sep-v').getBoundingClientRect(); return Math.round(l.width) === 540 && Math.round(r.left - l.right) === 6; }));
  ok('5 · fenetres.liste est écrit une fois, à 540, au relâchement', ecrites('fenetres.liste').length === 1 && ecrites('fenetres.liste')[0].valeur === 540, JSON.stringify(ecrites('fenetres.liste')));
  // enregistrer la date à sa place : la page se redessine, le séparateur et la colonne restent
  await page.fill('#s-org', 'Théâtre de Caen · essai de colonne');
  await page.click('#ed-date [data-enregistrer]');
  await attendre(page, () => document.querySelector('#ed-date .etat-ed:not(.sale)'), null, 8000);
  await page.waitForTimeout(500);
  ok('5 · enregistrer la date 101 à sa place redessine la page : le séparateur est toujours là (un seul), --l-liste inchangée', (await compte(page, '.deux > .sep-v')) === 1 && (await racine(page, '--l-liste')) === '540px' && (await page.$eval('.deux > .liste', e => Math.round(e.getBoundingClientRect().width))) === 540);
  // une seule largeur pour toutes les pages
  const pages = {};
  for (const h of ['#/lieux', '#/equipe', '#/ateliers', '#/textes', '#/pro', '#/diffusion/devis', '#/planning/propositions']) {
    await page.evaluate(x => { location.hash = x; }, h);
    await attendre(page, () => document.querySelector('#vue .deux'), null, 8000);
    await calme(page);
    pages[h] = await page.evaluate(() => { const l = document.querySelector('#vue .deux > .liste'); return { sep: document.querySelectorAll('#vue .deux > .sep-v').length, liste: l ? Math.round(l.getBoundingClientRect().width) : null }; });
  }
  ok('5 · une seule largeur pour toutes les pages à deux colonnes : Lieux, Équipe, Ateliers, Textes, Espace pro, Devis, Planning › propositions ont leur séparateur et 540 px', Object.values(pages).every(v => v.sep === 1 && v.liste === 540), JSON.stringify(pages));
  // double-clic : retour à 460 (la transition de vue de la dernière page doit être finie : elle prend les clics)
  await calme(page);
  const c = await milieu(page, '.deux > .sep-v');
  await page.mouse.dblclick(c.x, c.y);
  await attendre(page, () => document.documentElement.style.getPropertyValue('--l-liste') === '460px', null, 3000);
  await page.waitForTimeout(500);
  ok('5 · un double-clic sur le séparateur rend la colonne d’origine (460 px) et oublie la clé', (await racine(page, '--l-liste')) === '460px' && ecrites('fenetres.liste').at(-1)?.valeur === null, JSON.stringify(ecrites('fenetres.liste').map(e => e.valeur)));
  ok('5 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  // le plancher et le plafond, le squelette, le clavier
  repartir(); garder('fenetres.liste', 1500);
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/lieux' });
  await page.waitForSelector('.deux > .sep-v', { timeout: 15000 });
  const plafond = await page.evaluate(() => ({ v: document.documentElement.style.getPropertyValue('--l-liste'), deux: document.querySelector('.deux').clientWidth }));
  ok('5 · une colonne gardée trop large est bornée à 55 % de la largeur du contenu', parseInt(plafond.v) === Math.floor(plafond.deux * .55), JSON.stringify(plafond));
  await page.focus('.deux > .sep-v');
  await page.keyboard.press('Home');
  ok('5 · Début : la plus étroite, 340 px (le plancher d’aujourd’hui, pas 300)', (await racine(page, '--l-liste')) === '340px', await racine(page, '--l-liste'));
  await page.keyboard.press('ArrowRight');
  ok('5 · → élargit la colonne de 16 px', (await racine(page, '--l-liste')) === '356px', await racine(page, '--l-liste'));
  await page.keyboard.press('Shift+ArrowLeft');
  ok('5 · Maj + ← la rétrécit de 64 px, sans passer sous 340 px', (await racine(page, '--l-liste')) === '340px');
  await page.keyboard.press('Enter');
  await attendre(page, () => document.documentElement.style.getPropertyValue('--l-liste') === '460px', null, 3000);
  await calme(page);      // (la remise va jusqu'au bout de ses 220 ms)
  ok('5 · Entrée : la colonne d’origine', (await racine(page, '--l-liste')) === '460px');
  // le squelette du chargement lit la même variable : le vrai (squeletteAdmin), dessiné comme au premier chargement, sans page (ni #vue ni .deux),
  // avec une colonne réglée à 600 px (à 1 440 px, 55 % du contenu de 1 160 px en laissent 638 : la valeur gardée doit passer entière)
  await page.evaluate(() => { PREFS.ecrire('fenetres.liste', 600, { aussitot: true }); document.documentElement.style.removeProperty('--l-liste'); document.getElementById('app').innerHTML = ''; squeletteAdmin(); });
  const sq = await page.evaluate(() => ({ colonnes: getComputedStyle(document.querySelector('.sq-deux')).gridTemplateColumns, variable: document.documentElement.style.getPropertyValue('--l-liste'), vue: !!document.getElementById('vue') }));
  ok('5 · le squelette du chargement (.sq-deux, dessiné par squeletteAdmin sans page) lit --l-liste : 600 px dès le premier dessin, pas de saut', !sq.vue && sq.variable === '600px' && sq.colonnes.split(' ')[0] === '600px', JSON.stringify(sq));
  ok('5 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  // sous 1 100 px, la fiche passe sous la liste : pas de séparateur ; et à l'ouverture d'une page, rien n'est écrit
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1000, hauteur: 800, hash: '#/representations/101' });
  await page.waitForSelector('#ed-date #s-org', { timeout: 15000 });
  ok('5 · à 1 000 px, aucun séparateur', (await compte(page, '.sep-v')) === 0 && (await compte(page, '.poignee')) === 0);
  await page.setViewportSize({ width: 1440, height: 900 });
  ok('5 · la fenêtre s’élargit à 1 440 px : le séparateur paraît', await attendre(page, () => document.querySelectorAll('.deux > .sep-v').length === 1, null, 3000));
  await page.setViewportSize({ width: 1000, height: 800 });
  ok('5 · elle se rétrécit : il s’en va', await attendre(page, () => document.querySelectorAll('.sep-v').length === 0, null, 3000));
  ok('5 · naviguer d’une page à l’autre n’écrit rien dans fenetres.*', ECRITURES.every(e => !/^fenetres\./.test(e.cle)), JSON.stringify(ECRITURES.map(e => e.cle)));
  ok('5 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/planning/propositions' });
  await page.waitForSelector('#vue .deux', { timeout: 15000 });
  await page.waitForTimeout(300);
  ok('5 · #/planning/propositions à 1 440 px compte un séparateur', (await compte(page, '#vue .deux > .sep-v')) === 1);
  await ctx.close();
}

// ================================================================================ 6 · le geste suspend aussi le pied d'une fiche
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/101' });
  await page.waitForSelector('#ed-date .pied-ed', { timeout: 15000 });
  await page.waitForSelector('.deux > .sep-v', { timeout: 5000 });
  await page.evaluate(() => { window.__mesures = 0; const o = window.ajusterPied; window.ajusterPied = (...a) => { window.__mesures++; return o(...a); }; });
  let pendant = null;
  await tirer(page, '.deux > .sep-v', 120, 0, { lacher: false, entre: async () => { await page.waitForTimeout(250); pendant = await page.evaluate(() => window.__mesures); } });
  await page.mouse.up();
  await page.waitForTimeout(100);
  const juste = await page.evaluate(() => window.__mesures);
  await page.waitForTimeout(500);
  const apres = await page.evaluate(() => window.__mesures);
  ok('6 · pendant le geste, le pied de la fiche n’est pas remesuré (le ResizeObserver dort)', pendant === 0, String(pendant));
  ok('6 · le geste fini, le pied est remesuré (une fois, d’un coup)', apres === 1, `${juste} / ${apres}`);
  ok('6 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 7 · sous « moins d'animations » : la remise ne s'anime pas
{
  repartir(); garder('fenetres.tiroir', 980);
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil', reduit: true });
  await ouvrirTiroir(page);
  await page.evaluate(() => { window.__suite = []; const lire = () => { const t = document.querySelector('.tiroir'); if (t) window.__suite.push(t.style.getPropertyValue('--tiroir-largeur')); window.__tour = requestAnimationFrame(lire); }; lire(); });
  await page.mouse.dblclick(...Object.values(await milieu(page, '.tiroir .poignee')));
  await page.waitForTimeout(500);
  const suite = await page.evaluate(() => { cancelAnimationFrame(window.__tour); return [...new Set(window.__suite)]; });
  ok('7 · sous « moins d’animations », le double-clic rend 780 px d’un coup (deux valeurs vues : 980, puis 780)', JSON.stringify(suite) === JSON.stringify(['980px', '780px']), JSON.stringify(suite));
  await page.focus('.tiroir .poignee');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  ok('7 · Entrée aussi : 780 px sans transition', (await largeurTiroir(page)) === '780px');
  ok('7 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 8 · « Disposition d'origine » : tout oublier, puis tout rendre
{
  repartir(); garder('fenetres.tiroir', 1000); garder('fenetres.liste', 560);
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/lieux' });
  await page.waitForSelector('.deux > .sep-v', { timeout: 15000 });
  ok('8 · la colonne gardée (560 px) est lue à l’ouverture', (await racine(page, '--l-liste')) === '560px' && (await page.$eval('.deux > .liste', e => Math.round(e.getBoundingClientRect().width))) === 560);
  await page.evaluate(() => { window.__avant = FENETRES.toutOublier(); });
  await page.waitForTimeout(500);
  const ec = ECRITURES.filter(e => /^fenetres\./.test(e.cle));
  ok('8 · toutOublier met chaque clé fenetres.* gardée à null et rend ce qu’elles valaient', ec.length === 2 && ec.every(e => e.valeur === null) && JSON.stringify(await page.evaluate(() => window.__avant)) === JSON.stringify({ tiroir: 1000, liste: 560 }), JSON.stringify(ec));
  ok('8 · la colonne redevient celle d’origine tout de suite (460 px), sans rouvrir la page', (await racine(page, '--l-liste')) === '' && (await page.$eval('.deux > .liste', e => Math.round(e.getBoundingClientRect().width))) === 460 && await page.evaluate(() => { const l = document.querySelector('.deux > .liste').getBoundingClientRect(), r = document.querySelector('.sep-v').getBoundingClientRect(); return Math.round(r.left - l.right) === 6; }));
  ok('8 · FENETRES.taille ne rend plus rien', await page.evaluate(() => FENETRES.taille('tiroir') === null && FENETRES.taille('liste') === null));
  await page.evaluate(() => FENETRES.rendre(window.__avant));
  await page.waitForTimeout(500);
  ok('8 · rendre (« Annuler ») remet les deux clés comme elles étaient, la colonne aussi', (await racine(page, '--l-liste')) === '560px' && ecrites('fenetres.tiroir').at(-1)?.valeur === 1000 && ecrites('fenetres.liste').at(-1)?.valeur === 560, JSON.stringify(ECRITURES.map(e => [e.cle, e.valeur])));
  ok('8 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  // un tiroir ouvert reprend sa taille d'origine quand tout est oublié
  repartir(); garder('fenetres.tiroir', 1000);
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await ouvrirTiroir(page);
  ok('8 · un tiroir gardé à 1 000 px s’ouvre à 1 000 px', (await largeurTiroir(page)) === '1000px');
  await page.evaluate(() => FENETRES.toutOublier());
  ok('8 · tout oublier ramène le tiroir ouvert à 780 px', await attendre(page, () => document.querySelector('.tiroir').style.getPropertyValue('--tiroir-largeur') === '780px', null, 3000));
  ok('8 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 9 · le téléphone et le doigt : aucune poignée
{
  repartir(); garder('fenetres.tiroir', 1000); garder('fenetres.liste', 560);
  const tel = await ouvrir(navigateur, { largeur: 390, hauteur: 800, hash: '#/accueil' });
  await tel.page.waitForSelector('#vue', { timeout: 15000 });
  await tel.page.waitForTimeout(600);
  await tel.page.evaluate(() => { location.hash = '#/representations/101'; });
  await attendre(tel.page, () => document.querySelector('#ed-date #s-org'), null, 8000);
  ok('9 · à 390 px, aucune .poignee dans la page (ni séparateur)', (await compte(tel.page, '.poignee, .sep-v, .dlg-coin')) === 0);
  await tel.ctx.close();
  const tac = await ouvrir(navigateur, { largeur: 1280, hauteur: 800, hash: '#/accueil', tactile: true });
  await tac.page.waitForSelector(`${tuile('prochaines')} .tb-l`, { timeout: 15000 });
  const coarse = await tac.page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  await tac.page.click(`${tuile('prochaines')} a.tb-l[href="#/representations/101"]`);
  await attendre(tac.page, () => document.querySelector('.tiroir.la #ed-date #s-org'));
  const w = await largeurTiroir(tac.page);
  ok('9 · à 1 280 px avec un écran tactile (pointer: coarse), le tiroir n’a ni poignée ni bouton « ⋯ », et ignore la largeur gardée', coarse && (await compte(tac.page, '.poignee, .tiroir [data-gestes-menu]')) === 0 && /min\(780px, 94vw\)/.test(w), `${coarse} ${w}`);
  await tac.page.keyboard.press('Escape');
  await attendre(tac.page, () => !document.querySelector('.tiroir'));
  await tac.page.evaluate(() => { location.hash = '#/lieux'; });
  await attendre(tac.page, () => document.querySelector('#vue .deux'), null, 8000);
  await tac.page.waitForTimeout(300);
  ok('9 · de même pour le séparateur de la liste, et la colonne garde 460 px', (await compte(tac.page, '.poignee, .sep-v')) === 0 && (await tac.page.$eval('.deux > .liste', e => Math.round(e.getBoundingClientRect().width))) === 460);
  ok('9 · aucune erreur de script', tac.erreurs.length === 0 && tel.erreurs.length === 0, [...tac.erreurs, ...tel.erreurs].join(' / '));
  await tac.ctx.close();
}

// ================================================================================ 10 · l'impression, le budget de CPU
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/lieux' });
  await page.waitForSelector('.deux > .sep-v', { timeout: 15000 });
  await page.emulateMedia({ media: 'print' });
  ok('10 · à l’impression, la poignée de la liste n’est pas montrée', await page.evaluate(() => getComputedStyle(document.querySelector('.sep-v')).display === 'none'));
  await page.emulateMedia({ media: 'screen' });
  await ctx.close();
}
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil', cpu: 4, longues: true });
  await ouvrirTiroir(page);
  await page.waitForTimeout(1500);      // (l'ouverture finit de se dessiner ; seul le geste est mesuré)
  await page.evaluate(() => { window.__longues.length = 0; window.__pret = performance.now(); });
  await tirer(page, '.tiroir .poignee', -300, 0);
  await tirer(page, '.tiroir .poignee', 150, 0);
  await page.waitForTimeout(700);
  const l = await page.evaluate(() => window.__longues.slice());
  console.log(`tâches longues pendant deux glisser du tiroir à CPU=4 (ms) : ${JSON.stringify(l)}`);
  ok('10 · aucune tâche > 200 ms pendant un glisser du tiroir, à CPU=4', l.every(d => d < 200), JSON.stringify(l));
  await page.keyboard.press('Escape');
  await attendre(page, () => !document.querySelector('.tiroir'));
  await page.goto(`${URL0}#/representations/101`);
  await page.waitForSelector('.deux > .sep-v', { timeout: 15000 });
  await page.evaluate(() => { window.__longues.length = 0; window.__pret = performance.now(); });
  await tirer(page, '.deux > .sep-v', 100, 0);
  await page.waitForTimeout(700);
  const l2 = await page.evaluate(() => window.__longues.slice());
  console.log(`tâches longues pendant un glisser de la liste à CPU=4 (ms) : ${JSON.stringify(l2)}`);
  ok('10 · aucune tâche > 200 ms pendant un glisser de la colonne de la liste, à CPU=4', l2.every(d => d < 200), JSON.stringify(l2));
  ok('10 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

await navigateur.close();
bilan(CAPT);
