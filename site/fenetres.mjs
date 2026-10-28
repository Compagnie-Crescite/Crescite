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
// (toutOublier, rendre) ; le téléphone et le doigt, où il n'y a aucune poignée ; l'impression, qui n'en montre pas ; le coin de
// chaque boîte (la recherche, le briefing rouvert, l'aide, la feuille de modification et son piège de Tab, « Importer », la
// troupe ; les deux petites questions n'en ont pas) ; les fenêtres de la diffusion (l'opportunité, le courriel de relance :
// des dialog.tab-dialogue sur la page, leurs fermetures, la question « Fermer sans enregistrer ? ») ; « Pleine largeur » et
// « Disposition d'origine » dans les réglages du menu ; un écran bas (1 440 × 700 px : le coin d'une boîte qui défile reste dans l'angle,
// l'opportunité a sa clé fenetres.crm, les réglages du menu tiennent sur une rangée de 36 px sous « Replier », au-dessus de
// l'apparence, et le menu défilé jusqu'en bas les montre ; à 900 px, l'un sous l'autre en 44 px) et « Annuler »
// qui rend la largeur gardée sur un plus grand écran sans la borner.
// Les captures vont dans site/dist/shots-fenetres/. Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, UID, URL0, DB, ECRITURES, MODIFS, resultats, ok, calme, ouvrir, texte, compte, tuile, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-fenetres');
// une exception en route (un élément qui manque) : ce qui a été vérifié jusque-là est dit avant la sortie en erreur
process.on('uncaughtException', e => { for (const [etat, nom, detail] of resultats) console.log(`${etat === 'ok' ? '  ✓' : '  ✗'} ${nom}${etat === 'KO' && detail ? `\n      ${detail}` : ''}`); console.error(e.message); process.exit(1); });
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
const attendre = (page, fn, arg = null, ms = 6000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
// une pause franche (la remise écrit 30 ms après le relâchement) : une seconde écriture tardive serait comptée
const pause = async (page, ms = 350) => { await page.waitForTimeout(ms); return true; };
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
  // « Disposition d'origine » remet aussi ce qui est gardé hors des clés fenetres.* d'ici : les fenêtres du tableur (fenetres.tableur-h),
  // ses colonnes (tableur.colonnes) et le menu replié (menu.replie) ; « Annuler » rend le tout
  repartir(); garder('fenetres.tableur-h', 520); garder('menu.replie', true);
  // (en Complet : le tableur s'ouvre en Simple depuis le lot 11, et les colonnes qu'on masque ici sont celles du Complet)
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '?mode=complet#/representations/tableur' });
  await page.waitForSelector('#tab-tete th[data-k="lieu"]', { timeout: 15000 });
  await page.evaluate(() => TABLEUR.colonnes.masquer('lieu'));
  await page.waitForTimeout(300);
  const etat = () => page.evaluate(() => ({ lieu: !!document.querySelector('#tab-tete th[data-k="lieu"]'), replie: document.documentElement.classList.contains('menu-replie'), h: FENETRES.taille('tableur-h') }));
  const e0 = await etat();
  ok('8 · avant : la colonne Lieu masquée, le menu replié par choix, la hauteur du tableur gardée (520 px)', !e0.lieu && e0.replie && e0.h === 520, JSON.stringify(e0));
  await page.evaluate(() => { window.__avant = FENETRES.toutOublier(); });
  await page.waitForTimeout(400);
  const e1 = await etat(), av = await page.evaluate(() => window.__avant);
  ok('8 · toutOublier remet aussi les colonnes du tableur, sa hauteur et le menu (les trois clés à null, la colonne Lieu revient, le menu se déplie à 1 440 px)', e1.lieu && !e1.replie && e1.h === null && ecrites('tableur.colonnes').at(-1)?.valeur === null && ecrites('menu.replie').at(-1)?.valeur === null && ecrites('fenetres.tableur-h').at(-1)?.valeur === null, JSON.stringify({ e1, av }));
  ok('8 · l’instantané garde ce qu’elles valaient (tableur-h, @tableur.colonnes, @menu.replie)', av['tableur-h'] === 520 && av['@menu.replie'] === true && !!av['@tableur.colonnes'], JSON.stringify(av));
  await page.evaluate(() => FENETRES.rendre(window.__avant));
  await page.waitForTimeout(400);
  const e2 = await etat();
  ok('8 · rendre (« Annuler ») remet la colonne masquée, le menu replié et la hauteur', !e2.lieu && e2.replie && e2.h === 520, JSON.stringify(e2));
  ok('8 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  // la hauteur du tableur seule : rien d'autre ne redessine le tableur, « Disposition d'origine » doit la remettre elle-même
  repartir(); garder('fenetres.tableur-h', 420);
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/tableur' });
  await page.waitForSelector('#tab-cadre', { timeout: 15000 });
  await page.waitForTimeout(300);
  const cadre = () => page.$eval('#tab-cadre', c => ({ h: Math.round(c.getBoundingClientRect().height), enLigne: c.style.height }));
  const c0 = await cadre();
  await page.evaluate(() => { window.__avant = FENETRES.toutOublier(); });
  await page.waitForTimeout(300);
  const c1 = await cadre();
  await page.evaluate(() => FENETRES.rendre(window.__avant));
  await page.waitForTimeout(300);
  const c2 = await cadre();
  ok('8 · la hauteur gardée du tableur (420 px) revient à la place qui reste sur-le-champ, puis « Annuler » la rend', c0.h === 420 && c1.h !== 420 && c1.enLigne === '' && c2.h === 420, JSON.stringify({ c0, c1, c2 }));
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
  repartir(); garder('fenetres.tiroir', 1000); garder('fenetres.liste', 560); garder('fenetres.pleine', true); garder('fenetres.gf', { l: 700, h: 500 });
  const tel = await ouvrir(navigateur, { largeur: 390, hauteur: 800, hash: '#/accueil' });
  await tel.page.waitForSelector('#vue', { timeout: 15000 });
  await tel.page.waitForTimeout(600);
  await tel.page.evaluate(() => { location.hash = '#/representations/101'; });
  await attendre(tel.page, () => document.querySelector('#ed-date #s-org'), null, 8000);
  ok('9 · à 390 px, aucune .poignee dans la page (ni séparateur)', (await compte(tel.page, '.poignee, .sep-v, .dlg-coin')) === 0);
  ok('9 · à 390 px, la pleine largeur gardée dort (html.pleine-largeur absente)', await tel.page.evaluate(() => !document.documentElement.classList.contains('pleine-largeur')));
  await tel.page.evaluate(() => { GESTES.formulaire({ titre: 'Essai', champs: [{ k: 'a', l: 'Un champ' }], enregistrer: async () => true }); });
  await tel.page.waitForSelector('.gf .gf-boite', { timeout: 3000 });
  await tel.page.waitForTimeout(300);
  ok('9 · la feuille de modification à 390 px n’a aucun coin, ni la taille gardée', (await compte(tel.page, '.gf-boite')) === 1 && (await compte(tel.page, '.dlg-coin, .poignee')) === 0 && await tel.page.$eval('.gf-boite', e => !e.style.width && !e.style.height));
  await tel.page.keyboard.press('Escape');
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
  await tac.page.evaluate(() => { location.hash = '#/accueil'; });
  await tac.page.waitForSelector(`${tuile('prochaines')} .tb-l`, { timeout: 15000 });
  await tac.page.keyboard.press('Control+k');
  await tac.page.waitForSelector('#recherche[open]', { timeout: 3000 });
  await tac.page.waitForTimeout(400);
  ok('9 · à 1 280 px avec un écran tactile, la recherche n’a pas de coin', (await compte(tac.page, '.dlg-coin')) === 0);
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
  await page.goto(`${URL0}#/accueil`);
  await page.waitForSelector(`${tuile('prochaines')} .tb-l`, { timeout: 15000 });
  await page.keyboard.press('Control+k');
  await page.waitForSelector('#recherche[open]', { timeout: 4000 });
  await attendre(page, () => document.querySelector('#recherche > .dlg-coin'), null, 3000);
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.__longues.length = 0; window.__pret = performance.now(); });
  await tirer(page, '#recherche > .dlg-coin', 200, 80);
  await tirer(page, '#recherche > .dlg-coin', -100, -40);
  await page.waitForTimeout(700);
  const l3 = await page.evaluate(() => window.__longues.slice());
  console.log(`tâches longues pendant deux glisser du coin de la recherche à CPU=4 (ms) : ${JSON.stringify(l3)}`);
  ok('10 · aucune tâche > 200 ms pendant un glisser du coin de la recherche, à CPU=4', l3.every(d => d < 200), JSON.stringify(l3));
  ok('10 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 11 · les boîtes : le coin de la recherche
const coinDe = sel => `${sel} > .dlg-coin`;
const rect = (page, sel) => page.$eval(sel, e => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; });
const enLigne = (page, sel) => page.$eval(sel, e => ({ l: e.style.width, h: e.style.height, max: e.style.maxHeight, classe: e.classList.contains('dlg-taille') }));
async function ouvrirRecherche(page) {
  await page.keyboard.press('Control+k');
  await page.waitForSelector('#recherche[open]', { timeout: 4000 });
  await attendre(page, () => document.querySelector('#recherche > .dlg-coin'), null, 3000);
  await calme(page);
}
repartir();
const GR = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/accueil' });      // (une seule page, de la section 11 à la 13)
{
  const { page, erreurs } = GR;
  await page.waitForSelector(`${tuile('prochaines')} .tb-l`, { timeout: 15000 });
  await ouvrirRecherche(page);
  const c = await page.$eval(coinDe('#recherche'), e => ({ role: e.getAttribute('role'), nom: e.getAttribute('aria-label'), tab: e.tabIndex, curseur: getComputedStyle(e).cursor, classe: e.className, touch: getComputedStyle(e).touchAction, l: Math.round(e.getBoundingClientRect().width) }));
  ok('11 · la recherche a un coin en bas à droite : un séparateur nommé, dans l’ordre du clavier, curseur nwse-resize, zone de 16 px', c.role === 'separator' && /Taille de la fenêtre/.test(c.nom) && c.tab === 0 && c.curseur === 'nwse-resize' && c.touch === 'none' && c.l === 16 && /dlg-coin/.test(c.classe), JSON.stringify(c));
  ok('11 · sa position : le coin est dans l’angle bas droit de la boîte', await page.evaluate(() => { const d = document.querySelector('#recherche').getBoundingClientRect(), k = document.querySelector('#recherche > .dlg-coin').getBoundingClientRect(); return Math.abs(k.right - d.right) <= 2 && Math.abs(k.bottom - d.bottom) <= 2; }));
  ok('11 · rien n’est écrit à l’ouverture, ni de taille en ligne', ECRITURES.length === 0 && (await enLigne(page, '#recherche')).l === '');
  const avant = await rect(page, '#recherche');
  await page.screenshot({ path: `${CAPT}/coin-recherche-avant.png`, fullPage: false });
  await tirer(page, coinDe('#recherche'), 120, 60);
  await attendre(page, () => true);
  await page.waitForTimeout(300);
  const apres = await rect(page, '#recherche'), li = await enLigne(page, '#recherche');
  ok('11 · tirer le coin de 120 px à droite et 60 px en bas : le bord droit suit le pointeur à ± 2 px (la boîte est centrée : largeur += 2 × Δ)', Math.abs(apres.r - avant.r - 120) <= 2 && Math.abs(apres.l - avant.l + 120) <= 2 && Math.abs(apres.b - avant.b - 60) <= 2 && apres.t === avant.t, JSON.stringify({ avant, apres }));
  ok('11 · la taille est en ligne (width et height), avec le plafond de hauteur de l’écran (le plafond de 580 px de la feuille de style n’annule plus rien)', /^\d+px$/.test(li.l) && /^\d+px$/.test(li.h) && /max\(12px, 9vh\)/.test(li.max) && li.classe, JSON.stringify(li));
  ok('11 · la boîte intérieure de la recherche remplit la nouvelle hauteur', await page.evaluate(() => { const d = document.querySelector('#recherche').getBoundingClientRect(), b = document.querySelector('#recherche .rch-boite').getBoundingClientRect(); return Math.abs(b.height - d.height) <= 4; }));
  ok('11 · une seule écriture au relâchement : fenetres.recherche = { l, h } à la taille tirée', await pause(page) && ecrites('fenetres.recherche').length === 1 && ecrites('fenetres.recherche')[0].valeur?.l === apres.w && ecrites('fenetres.recherche')[0].valeur?.h === apres.h, JSON.stringify(ecrites('fenetres.recherche')));
  await page.screenshot({ path: `${CAPT}/coin-recherche.png`, fullPage: false });
  // les bornes : l’écran moins 24 px
  await tirer(page, coinDe('#recherche'), 2000, 2000);
  await page.waitForTimeout(300);
  const max = await rect(page, '#recherche');
  ok('11 · tirée trop loin, la boîte s’arrête à l’écran : 100vw − 24 px de large (1 576), et en hauteur ce que la marge du haut laisse (1 000 − 90 − 12 = 898 : le coin reste atteignable)', max.w === 1576 && max.h === 898 && max.b <= 1000, JSON.stringify(max));
  await tirer(page, coinDe('#recherche'), -3000, -3000);
  await page.waitForTimeout(300);
  const min = await rect(page, '#recherche');
  ok('11 · rétrécie à fond, elle s’arrête à 320 × 200', min.w === 320 && min.h === 200, JSON.stringify(min));
  // la même taille à la prochaine ouverture
  await page.keyboard.press('Escape');
  await attendre(page, () => !document.querySelector('#recherche[open]'));
  await ouvrirRecherche(page);
  const r2 = await rect(page, '#recherche');
  ok('11 · la recherche rouverte a la taille gardée, et un seul coin', r2.w === 320 && r2.h === 200 && (await compte(page, '#recherche .dlg-coin')) === 1, JSON.stringify(r2));
  ok('11 · le champ de recherche garde le focus (le coin ne le prend pas)', await page.evaluate(() => document.activeElement?.id === 'rch-q'));
  // la remise : double-clic
  await page.mouse.dblclick(...Object.values(await milieu(page, coinDe('#recherche'))));
  ok('11 · un double-clic sur le coin rend la taille d’origine : la taille en ligne s’efface (640 px, le contenu)', await attendre(page, () => { const d = document.querySelector('#recherche'); return !d.style.width && !d.style.height && !d.classList.contains('dlg-taille'); }, null, 3000) && Math.round((await rect(page, '#recherche')).w) === 640, JSON.stringify(await rect(page, '#recherche')));
  ok('11 · et la clé fenetres.recherche est oubliée (écrite à null)', await pause(page) && ecrites('fenetres.recherche').at(-1)?.valeur === null, JSON.stringify(ecrites('fenetres.recherche').map(e => e.valeur)));
  // Entrée sur le coin
  await page.focus(coinDe('#recherche'));
  const k0 = await rect(page, '#recherche');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Shift+ArrowDown');
  const k = await rect(page, '#recherche');
  ok('11 · au clavier, → élargit la boîte de 16 px (656) et Maj + ↓ l’allonge de 64 px', k.w === 656 && k.h === k0.h + 64, JSON.stringify({ k0, k }));
  await page.keyboard.press('Enter');
  ok('11 · Entrée sur le coin : la taille d’origine', await attendre(page, () => !document.querySelector('#recherche').style.width, null, 3000));
  ok('11 · Échap ferme la recherche, le focus sur le coin ou ailleurs', await (async () => { await page.keyboard.press('Escape'); return attendre(page, () => !document.querySelector('#recherche[open]')); })());
  ok('11 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
}

// ================================================================================ 12 · le briefing, l'aide, la feuille, Importer
{
  repartir();
  const { page, erreurs } = GR;
  // ---- le briefing : son contenu est réécrit à chaque ouverture, le coin doit revenir
  await page.click('#tb-briefing');
  await page.waitForSelector('#tb-brief[open]', { timeout: 3000 });
  await attendre(page, () => document.querySelector('#tb-brief > .dlg-coin'));
  ok('12 · le briefing a son coin', (await compte(page, coinDe('#tb-brief'))) === 1 && await page.$eval(coinDe('#tb-brief'), e => e.dataset.poignee === 'tb-brief'));
  const b0 = await rect(page, '#tb-brief');
  await tirer(page, coinDe('#tb-brief'), -100, -60);
  await page.waitForTimeout(300);
  const b1 = await rect(page, '#tb-brief');
  ok('12 · tirer le coin du briefing vers le haut et la gauche le rétrécit (boîte centrée : 2 × Δ)', Math.abs(b0.w - b1.w - 200) <= 2 && Math.abs(b0.h - b1.h - 120) <= 2, JSON.stringify({ b0, b1 }));
  ok('12 · sa boîte intérieure suit la hauteur tirée (le corps défile dedans, le coin reste en place)', await page.evaluate(() => { const d = document.querySelector('#tb-brief').getBoundingClientRect(), b = document.querySelector('#tb-brief .tb-brief-boite').getBoundingClientRect(); return Math.abs(b.height - d.height) <= 4; }));
  ok('12 · fenetres.tb-brief est écrit une fois', await pause(page) && ecrites('fenetres.tb-brief').length === 1, JSON.stringify(ecrites('fenetres.tb-brief')));
  // l'impression du briefing : la taille tirée ne la tronque pas
  await page.evaluate(() => document.documentElement.classList.add('tb-impression'));
  await page.emulateMedia({ media: 'print' });
  const imp = await rect(page, '#tb-brief');
  ok('12 · à l’impression du briefing, la largeur et la hauteur tirées ne comptent plus (auto !important), et le coin n’est pas montré', imp.w > b1.w + 100 && imp.h !== b1.h && await page.$eval(coinDe('#tb-brief'), e => getComputedStyle(e).display === 'none'), JSON.stringify({ b1, imp }));
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => document.documentElement.classList.remove('tb-impression'));
  await page.click('#tb-brief [data-tb-brief-fermer]');
  await attendre(page, () => !document.querySelector('#tb-brief[open]'));
  await page.click('#tb-briefing');
  await page.waitForSelector('#tb-brief[open]', { timeout: 3000 });
  await attendre(page, () => document.querySelector('#tb-brief > .dlg-coin'));
  const b2 = await rect(page, '#tb-brief');
  ok('12 · le briefing rouvert : le coin est toujours là (un seul), à la taille gardée', (await compte(page, coinDe('#tb-brief'))) === 1 && b2.w === b1.w && b2.h === b1.h, JSON.stringify({ b1, b2 }));
  ok('12 · le briefing rouvert reprend le focus sur « Fermer »', await page.evaluate(() => document.activeElement?.matches('[data-tb-brief-fermer]')));
  await page.click('#tb-brief [data-tb-brief-fermer]');
  await attendre(page, () => !document.querySelector('#tb-brief[open]'));

  // ---- l'aide « ? »
  await page.keyboard.press('?');
  await page.waitForSelector('dialog.gq-aide[open]', { timeout: 3000 });
  await attendre(page, () => document.querySelector('dialog.gq-aide > .dlg-coin'));
  await calme(page);
  ok('12 · l’aide « ? » a son coin, et le focus reste sur « Fermer »', (await compte(page, 'dialog.gq-aide > .dlg-coin')) === 1 && await page.evaluate(() => document.activeElement?.matches('[data-gq-fermer]')));
  const a0 = await rect(page, 'dialog.gq-aide');
  await tirer(page, 'dialog.gq-aide > .dlg-coin', 80, 10);
  await page.waitForTimeout(300);
  const a1 = await rect(page, 'dialog.gq-aide');
  ok('12 · tirer le coin de l’aide l’agrandit (+ 160 de large, + 20 de haut : elle touchait presque le bas de l’écran), centrée', Math.abs(a1.w - a0.w - 160) <= 2 && Math.abs(a1.h - a0.h - 20) <= 2, JSON.stringify({ a0, a1 }));
  ok('12 · l’aide tirée garde le centre de l’écran et son corps défile dedans', Math.abs((a1.l + a1.r) / 2 - 800) <= 2 && await page.evaluate(() => { const d = document.querySelector('dialog.gq-aide').getBoundingClientRect(), b = document.querySelector('dialog.gq-aide .gq-boite').getBoundingClientRect(); return Math.abs(b.height - d.height) <= 4; }), JSON.stringify(a1));
  ok('12 · fenetres.gq-aide est écrit une fois', await pause(page) && ecrites('fenetres.gq-aide').length === 1);
  await page.keyboard.press('Escape');
  await attendre(page, () => !document.querySelector('dialog.gq-aide'));

  // ---- la feuille de modification (TRAITER)
  await page.click(`${tuile('urgent')} [data-traiter="options:105"]`);
  await page.waitForSelector('.gf .gf-boite', { timeout: 5000 });
  await attendre(page, () => document.querySelector('.gf-boite > .dlg-coin'));
  await calme(page);
  ok('12 · la feuille TRAITER a son coin, à 1 600 px', (await compte(page, '.gf-boite > .dlg-coin')) === 1 && await page.$eval('.gf-boite > .dlg-coin', e => e.dataset.poignee === 'gf'));
  // le piège de Tab de la feuille compte la poignée : depuis le dernier bouton, Tab y va, puis revient au premier champ
  await page.focus('.gf-boite button[type=submit]');
  await page.keyboard.press('Tab');
  const surCoin = await page.evaluate(() => document.activeElement?.classList.contains('poignee'));
  await page.keyboard.press('Tab');
  const apresCoin = await page.evaluate(() => ({ dedans: !!document.activeElement?.closest('.gf-boite'), coin: document.activeElement?.classList.contains('poignee') }));
  ok('12 · Tab depuis le dernier bouton de la feuille atteint le coin, puis revient au premier champ (la feuille garde le focus)', surCoin && apresCoin.dedans && !apresCoin.coin, JSON.stringify(apresCoin));
  await page.evaluate(() => document.querySelector('.gf-boite input:not([type=hidden]), .gf-boite select, .gf-boite textarea, .gf-boite button').focus());
  await page.keyboard.press('Shift+Tab');
  ok('12 · Maj + Tab depuis le premier élément de la feuille va au coin (le dernier de la feuille)', await page.evaluate(() => document.activeElement?.classList.contains('poignee')));
  const f0 = await rect(page, '.gf-boite');
  await tirer(page, '.gf-boite > .dlg-coin', 70, 50);
  await page.waitForTimeout(300);
  const f1 = await rect(page, '.gf-boite');
  ok('12 · tirer le coin de la feuille : son bord droit suit le pointeur (la feuille est centrée par un transform : 2 × Δ)', Math.abs(f1.r - f0.r - 70) <= 2 && Math.abs(f1.b - f0.b - 50) <= 2, JSON.stringify({ f0, f1 }));
  ok('12 · fenetres.gf est écrit une fois, la page garde le défilement bloqué (gf-ouvert)', await pause(page) && ecrites('fenetres.gf').length === 1 && await page.evaluate(() => document.documentElement.classList.contains('gf-ouvert')), JSON.stringify(ecrites('fenetres.gf')));
  await page.screenshot({ path: `${CAPT}/coin-feuille.png`, fullPage: false });
  await page.focus('.gf-boite > .dlg-coin');
  await page.keyboard.press('Escape');
  ok('12 · Échap, le focus sur le coin, ferme la feuille inchangée', await attendre(page, () => !document.querySelector('.gf')));
  // la suivante s'ouvre à la taille gardée
  await page.click(`${tuile('urgent')} [data-traiter="options:105"]`);
  await page.waitForSelector('.gf .gf-boite', { timeout: 5000 });
  await attendre(page, () => document.querySelector('.gf-boite > .dlg-coin'));
  await calme(page);
  const f2 = await rect(page, '.gf-boite');
  ok('12 · la feuille suivante s’ouvre à la taille gardée', Math.abs(f2.w - f1.w) <= 2 && Math.abs(f2.h - f1.h) <= 2, JSON.stringify({ f1, f2 }));
  await page.keyboard.press('Escape');
  await attendre(page, () => !document.querySelector('.gf'));

  // ---- Importer (tab-dialogue-large), et les petites questions de l'équipe, qui ne sont pas équipées
  await page.evaluate(() => { location.hash = '#/representations/tableur'; });
  await page.waitForSelector('#tab-importer', { timeout: 10000 });
  await page.click('#tab-importer');
  await page.waitForSelector('dialog.tab-dialogue.large[open]', { timeout: 4000 });
  await attendre(page, () => document.querySelector('dialog.tab-dialogue.large > .dlg-coin'));
  ok('12 · « Importer » a son coin, de la clé tab-dialogue-large', await page.$eval('dialog.tab-dialogue.large > .dlg-coin', e => e.dataset.poignee === 'tab-dialogue-large'));
  const i0 = await rect(page, 'dialog.tab-dialogue.large');
  await tirer(page, 'dialog.tab-dialogue.large > .dlg-coin', 50, 30);
  await page.waitForTimeout(300);
  const i1 = await rect(page, 'dialog.tab-dialogue.large');
  ok('12 · tirer le coin d’« Importer » l’agrandit (+ 100 × + 60)', Math.abs(i1.w - i0.w - 100) <= 2 && Math.abs(i1.h - i0.h - 60) <= 2, JSON.stringify({ i0, i1 }));
  ok('12 · sa boîte intérieure suit la hauteur (le tableau d’aperçu garde sa place)', await page.evaluate(() => { const d = document.querySelector('dialog.tab-dialogue.large').getBoundingClientRect(), b = document.querySelector('dialog.tab-dialogue.large .tab-dialogue-boite').getBoundingClientRect(); return Math.abs(b.height - d.height) <= 4; }));
  ok('12 · fenetres.tab-dialogue-large est écrit une fois', await pause(page) && ecrites('fenetres.tab-dialogue-large').length === 1);
  await page.keyboard.press('Escape');
  await attendre(page, () => !document.querySelector('dialog.tab-dialogue'));
  // des dialogs à la volée, comme periode-choix, retrait-choix (rien) et troupe-choix (comme Importer)
  const q = await page.evaluate(async () => {
    const faire = (id, classe) => { const d = document.createElement('dialog'); d.id = id; d.className = classe; d.innerHTML = '<div class="tab-dialogue-boite"><h2>Essai</h2><button type="button">Fermer</button></div>'; document.body.append(d); d.showModal(); return d; };
    const a = faire('retrait-choix', 'tab-dialogue'), b = faire('periode-choix', 'tab-dialogue periode-choix'), c = faire('troupe-choix', 'tab-dialogue large troupe-choix');
    await new Promise(r => setTimeout(r, 200));
    const rep = { retrait: a.querySelectorAll(':scope > .dlg-coin').length, periode: b.querySelectorAll(':scope > .dlg-coin').length, troupe: c.querySelectorAll(':scope > .dlg-coin').length, cle: c.querySelector(':scope > .dlg-coin')?.dataset.poignee };
    a.close(); b.close(); c.close(); a.remove(); b.remove(); c.remove();
    return rep;
  });
  ok('12 · les deux petites questions (retrait-choix, periode-choix) n’ont pas de coin ; troupe-choix en a un, de la clé d’Importer', q.retrait === 0 && q.periode === 0 && q.troupe === 1 && q.cle === 'tab-dialogue-large', JSON.stringify(q));
  ok('12 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
}

// ================================================================================ 13 · les fenêtres de la diffusion : des dialog.tab-dialogue
{
  repartir();
  const prospects0 = JSON.parse(JSON.stringify(DB.crescite_diffusion_prospects));      // (la base commune est rendue telle quelle après)
  const { page, erreurs } = GR;
  await page.evaluate(() => { location.hash = '#/diffusion'; });
  await page.waitForSelector('#b-nouveau-prospect', { timeout: 15000 });
  await page.click('#b-nouveau-prospect');
  await page.waitForSelector('dialog.tab-dialogue[open] #f-prospect-crm', { timeout: 4000 });
  await attendre(page, () => document.querySelector('dialog.crm-boite > .dlg-coin'));
  const o = await page.evaluate(() => { const d = document.querySelector('#f-prospect-crm').closest('dialog'); return { parent: d.parentNode === document.body, modal: d.matches(':modal'), nom: d.getAttribute('aria-labelledby') && document.getElementById(d.getAttribute('aria-labelledby'))?.textContent, zone: !!document.getElementById('crm-modale-zone'), cle: d.querySelector(':scope > .dlg-coin')?.dataset.poignee, focus: document.activeElement?.id }; });
  ok('13 · « Nouvelle opportunité » est un dialog.tab-dialogue modal posé sur le corps de la page, nommé par son titre, avec son coin (sa clé à elle : crm, pas celle d’« Étendre »)', o.parent && o.modal && o.nom === 'Nouvelle opportunité' && o.cle === 'crm', JSON.stringify(o));
  ok('13 · la zone #crm-modale-zone n’existe plus, et le focus est sur le premier champ', !o.zone && o.focus === 'crm-structure', JSON.stringify(o));
  await page.screenshot({ path: `${CAPT}/opportunite.png`, fullPage: false });
  // un redessin en direct de la vue Diffusion n'emporte plus la fenêtre
  await page.evaluate(() => { vueDiffusion(); });
  await page.waitForTimeout(500);
  ok('13 · un redessin de la vue Diffusion (le temps réel) laisse la fenêtre ouverte', (await compte(page, 'dialog[open] #f-prospect-crm')) === 1);
  await page.keyboard.press('Escape');
  ok('13 · Échap la ferme, sans question quand rien n’est saisi : la fenêtre quitte la page', await attendre(page, () => !document.querySelector('#f-prospect-crm')) && !(await page.$('dialog.gq[open]')));
  await page.click('#b-nouveau-prospect');
  await page.waitForSelector('#f-prospect-crm', { timeout: 4000 });
  await page.fill('#crm-structure', 'Le Rayon Vert');
  await page.keyboard.press('Escape');
  ok('13 · Échap, une saisie commencée : la question « Fermer sans enregistrer ? », la fenêtre reste', await attendre(page, () => !!document.querySelector('dialog.gq[open]')) && (await compte(page, '#f-prospect-crm')) === 1 && /Fermer sans enregistrer/.test(await texte(page, 'dialog.gq h2')), await texte(page, 'dialog.gq h2'));
  await page.waitForTimeout(450);      // (la question ignore les clics de ses 350 premières ms)
  await page.click('dialog.gq [data-gq="non"]');
  ok('13 · « Rester » : la saisie est là, le focus revient dans la fenêtre', (await page.$eval('#crm-structure', e => e.value)) === 'Le Rayon Vert' && await attendre(page, () => !!document.activeElement?.closest('#f-prospect-crm, dialog.crm-boite')));
  await page.click('#b-annuler-crm');
  ok('13 · Annuler pose la même question', await attendre(page, () => !!document.querySelector('dialog.gq[open]')));
  await page.waitForTimeout(450);
  await page.click('dialog.gq [data-gq="oui"]');
  ok('13 · « Fermer sans enregistrer » ferme et retire la fenêtre', await attendre(page, () => !document.querySelector('#f-prospect-crm, dialog.crm-boite')));
  // l'enregistrement : la fenêtre part, sans question
  await page.click('#b-nouveau-prospect');
  await page.waitForSelector('#f-prospect-crm', { timeout: 4000 });
  await page.fill('#crm-structure', 'Théâtre du Rayon Vert'); await page.fill('#crm-commune', 'Saint-Valery-en-Caux');
  await page.click('#b-sauver-crm');
  ok('13 · Enregistrer ferme la fenêtre sans question, et la piste est écrite', await attendre(page, () => !document.querySelector('#f-prospect-crm, dialog.crm-boite'), null, 5000) && !(await page.$('dialog.gq[open]')) && MODIFS.some(m => m.table === 'crescite_diffusion_prospects' && m.post?.some(r => r.structure === 'Théâtre du Rayon Vert')), JSON.stringify(MODIFS.slice(-2)));
  // changer de rubrique ferme la fenêtre qui n'a rien de commencé
  await page.click('#b-nouveau-prospect');
  await page.waitForSelector('#f-prospect-crm', { timeout: 4000 });
  await page.evaluate(() => { location.hash = '#/accueil'; });
  ok('13 · changer de rubrique, rien de saisi : la fenêtre se ferme et on part', await attendre(page, () => location.hash === '#/accueil' && !document.querySelector('#f-prospect-crm')), await page.evaluate(() => location.hash));
  await page.evaluate(() => { location.hash = '#/diffusion'; });
  await page.waitForSelector('[data-crm-email]', { timeout: 10000 });
  // le courriel de relance
  await page.click('[data-crm-email]');
  await page.waitForSelector('dialog.crm-boite[open] #mel-corps', { timeout: 4000 });
  await attendre(page, () => document.querySelector('dialog.crm-boite > .dlg-coin'));
  const m = await page.evaluate(() => { const d = document.querySelector('#mel-corps').closest('dialog'); return { modal: d.matches(':modal'), nom: d.getAttribute('aria-labelledby') && document.getElementById(d.getAttribute('aria-labelledby'))?.textContent, coin: d.querySelectorAll(':scope > .dlg-coin').length, garde: d.dataset.garde !== undefined }; });
  ok('13 · le courriel de relance est un dialog.tab-dialogue modal avec son coin, et il n’est pas gardé (rien d’important à y saisir)', m.modal && /courriel de relance/.test(m.nom) && m.coin === 1 && !m.garde, JSON.stringify(m));
  await page.fill('#mel-objet', 'Un autre objet');
  await page.keyboard.press('Escape');
  ok('13 · Échap ferme le courriel, sans question même modifié, et le retire de la page', await attendre(page, () => !document.querySelector('#mel-corps')) && !(await page.$('dialog.gq[open]')));
  await page.click('[data-crm-email]');
  await page.waitForSelector('#mel-corps', { timeout: 4000 });
  await page.click('#b-fermer-mod-mel');
  ok('13 · le ✕ du courriel le ferme', await attendre(page, () => !document.querySelector('#mel-corps')));
  await page.click('[data-crm-email]');
  await page.waitForSelector('#mel-corps', { timeout: 4000 });
  await page.click('#b-fermer-mel');
  ok('13 · « Fermer » du courriel le ferme', await attendre(page, () => !document.querySelector('#mel-corps')));
  await page.click('[data-crm-email]');
  await page.waitForSelector('#b-relance-faite', { timeout: 4000 });
  const nM = MODIFS.length;
  await page.click('#b-relance-faite');
  ok('13 · « Relance faite » écrit la relance en base, ferme le courriel et le retire de la page', await attendre(page, () => !document.querySelector('#mel-corps, dialog.crm-boite')) && MODIFS.length > nM && MODIFS.slice(nM).some(x => x.table === 'crescite_diffusion_prospects' && x.body?.date_prochaine_relance), JSON.stringify(MODIFS.slice(nM)));
  ok('13 · aucun dialog ne reste dans la page', (await compte(page, 'dialog[open]')) === 0);
  ok('13 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await GR.ctx.close();
  DB.crescite_diffusion_prospects = prospects0;
}

// ================================================================================ 14 · « Pleine largeur » et « Disposition d'origine » (les réglages du menu)
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1920, hauteur: 1000, hash: '#/lieux' });
  await page.waitForSelector('#fen-pleine', { timeout: 15000 });
  await page.waitForSelector('.deux > .liste', { timeout: 15000 });
  const base = await page.evaluate(() => ({ main: Math.round(document.querySelector('main').getBoundingClientRect().width), pied: Math.round(document.querySelector('.pied-espace')?.getBoundingClientRect().width || 0), pressed: document.getElementById('fen-pleine').getAttribute('aria-pressed'), dans: !!document.getElementById('fen-pleine').closest('.menu-reglages'), libelles: [...document.querySelectorAll('.fen-reglage .menu-l')].map(e => e.textContent) }));
  ok('14 · les deux réglages sont dans le menu : « Pleine largeur » (un interrupteur, éteint) et « Disposition d’origine »', base.dans && base.pressed === 'false' && base.libelles.join('|') === 'Pleine largeur|Disposition d’origine', JSON.stringify(base));
  ok('14 · à 1 920 px, le contenu et le pied de page plafonnent à 1 500 px', base.main === 1500 && base.pied === 1500, JSON.stringify(base));
  await page.click('#fen-pleine');
  await page.waitForTimeout(300);
  const p = await page.evaluate(() => ({ cls: document.documentElement.classList.contains('pleine-largeur'), main: Math.round(document.querySelector('main').getBoundingClientRect().width), pied: Math.round(document.querySelector('.pied-espace')?.getBoundingClientRect().width || 0), pressed: document.getElementById('fen-pleine').getAttribute('aria-pressed'), menu: Math.round(document.querySelector('.menu').getBoundingClientRect().width) }));
  ok('14 · « Pleine largeur » pose html.pleine-largeur : main prend toute la place à côté du menu (plus de 1 500 px)', p.cls && p.main > 1500 && p.main === 1920 - p.menu && p.pressed === 'true', JSON.stringify(p));
  ok('14 · le pied de page n’est plus plafonné non plus (il existe, et dépasse 1 500 px)', p.pied > 1500, JSON.stringify(p));
  await page.screenshot({ path: `${CAPT}/pleine-largeur.png`, fullPage: false });
  ok('14 · fenetres.pleine est écrit : vrai', await pause(page) && ecrites('fenetres.pleine').at(-1)?.valeur === true, JSON.stringify(ecrites('fenetres.pleine')));
  await page.reload();
  await page.waitForSelector('#fen-pleine', { timeout: 15000 });
  ok('14 · rechargée, la page retrouve la pleine largeur (et le bouton le dit)', await page.evaluate(() => document.documentElement.classList.contains('pleine-largeur') && document.getElementById('fen-pleine').getAttribute('aria-pressed') === 'true'));
  await page.click('#fen-pleine');
  await page.waitForTimeout(200);
  ok('14 · un second clic rend les 1 500 px (la clé est oubliée)', await page.evaluate(() => !document.documentElement.classList.contains('pleine-largeur') && Math.round(document.querySelector('main').getBoundingClientRect().width) === 1500) && ecrites('fenetres.pleine').at(-1)?.valeur === null, JSON.stringify(ecrites('fenetres.pleine')));
  // « Disposition d'origine » : tout oublier, avec « Annuler »
  repartir(); garder('fenetres.tiroir', 900); garder('fenetres.liste', 520); garder('fenetres.pleine', true); garder('fenetres.recherche', { l: 700, h: 420 });
  await page.reload();
  await page.waitForSelector('.deux > .liste', { timeout: 15000 });
  await page.waitForSelector('#fen-origine', { timeout: 15000 });
  ok('14 · les tailles gardées sont lues : colonne 520 px, pleine largeur', (await racine(page, '--l-liste')) === '520px' && await page.evaluate(() => document.documentElement.classList.contains('pleine-largeur')));
  await page.click('#fen-origine');
  await attendre(page, () => document.querySelector('.annonce'));
  await page.waitForTimeout(500);
  const ec = ECRITURES.filter(e => /^fenetres\./.test(e.cle));
  ok('14 · « Disposition d’origine » met à null chaque clé fenetres.* gardée (quatre écritures, une par clé)', ec.length === 4 && ec.every(e => e.valeur === null), JSON.stringify(ec));
  ok('14 · la colonne de la liste, la pleine largeur : tout redevient celui d’origine tout de suite', (await racine(page, '--l-liste')) === '' && await page.evaluate(() => !document.documentElement.classList.contains('pleine-largeur') && Math.round(document.querySelector('.deux > .liste').getBoundingClientRect().width) === 460));
  const an = await page.evaluate(() => { const a = document.querySelector('.annonce:last-of-type'); return { texte: a?.textContent || '', annuler: !!a?.querySelector('[data-tt="retour"], button') }; });
  ok('14 · l’annonce dit ce qui est fait et porte « Annuler »', /Disposition d’origine remise/.test(an.texte) && /Annuler/.test(an.texte) && an.annuler, JSON.stringify(an));
  await page.screenshot({ path: `${CAPT}/disposition-origine.png`, fullPage: false });
  await page.click('.annonce:last-of-type button');
  await page.waitForTimeout(500);
  ok('14 · « Annuler » rend chaque clé comme elle était (colonne 520 px, pleine largeur, la taille de la recherche)', (await racine(page, '--l-liste')) === '520px' && await page.evaluate(() => document.documentElement.classList.contains('pleine-largeur')) && ecrites('fenetres.pleine').at(-1)?.valeur === true && JSON.stringify(ecrites('fenetres.recherche').at(-1)?.valeur) === JSON.stringify({ l: 700, h: 420 }) && ecrites('fenetres.tiroir').at(-1)?.valeur === 900, JSON.stringify(ECRITURES.map(e => [e.cle, e.valeur])));
  // rien à oublier : une annonce qui le dit, et aucune écriture
  await page.click('#fen-origine');
  await page.waitForTimeout(400);
  ECRITURES.length = 0;
  await page.click('#fen-origine');
  await page.waitForTimeout(400);
  ok('14 · quand tout est déjà d’origine, rien n’est écrit et l’annonce le dit', ECRITURES.length === 0 && /déjà celle d’origine/.test(await page.evaluate(() => document.querySelector('.annonce:last-of-type')?.textContent || '')), JSON.stringify(ECRITURES));
  // le menu replié (à 1 280 px, 64 px) : les deux réglages sont des icônes, leur nom reste lisible aux lecteurs d'écran
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => ({ menu: Math.round(document.querySelector('.menu').getBoundingClientRect().width), l: [...document.querySelectorAll('.fen-reglage')].map(b => ({ nom: b.textContent.trim(), larg: Math.round(b.getBoundingClientRect().width), vu: Math.round(b.querySelector('.menu-l').getBoundingClientRect().width) })) }));
  ok('14 · le menu replié (64 px) : les deux réglages sont des boutons d’icône, leur nom reste lisible aux lecteurs d’écran (.menu-l réduit à 1 px)', r.menu === 64 && r.l.length === 2 && r.l.every(b => b.larg > 30 && b.vu <= 1) && r.l[0].nom === 'Pleine largeur', JSON.stringify(r));
  ok('14 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 15 · un écran bas : le coin reste dans l'angle quand la boîte défile, le menu, « Annuler » sans perte
{
  repartir();
  const prospects0 = JSON.parse(JSON.stringify(DB.crescite_diffusion_prospects));
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 700, hash: '#/diffusion' });
  await page.waitForSelector('#b-nouveau-prospect', { timeout: 15000 });
  await page.click('#b-nouveau-prospect');
  await page.waitForSelector('dialog.crm-boite[open] #f-prospect-crm', { timeout: 4000 });
  await attendre(page, () => document.querySelector('dialog.crm-boite > .dlg-coin'));
  // la position du coin dans la boîte (sa distance aux bords bas et droit), et ce qu'on touche au milieu du coin
  const coin = () => page.evaluate(() => {
    const d = document.querySelector('dialog.crm-boite'), c = d.querySelector(':scope > .dlg-coin'), r = c.getBoundingClientRect(), b = d.getBoundingClientRect();
    const touche = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2)[0];
    const i = d.querySelector('.tab-dialogue-boite');
    return { bas: Math.round(b.bottom - r.bottom), droite: Math.round(b.right - r.right), touche: touche === c, dlgDefile: d.scrollHeight > d.clientHeight + 1, interieurDefile: i.scrollHeight > i.clientHeight + 1, haut: Math.round(b.height), top: i.scrollTop };
  });
  const avant = await coin();
  ok('15 · à 1 440 × 700 px, l’opportunité est plus haute que l’écran : sa boîte intérieure défile, la boîte elle-même jamais', avant.interieurDefile && !avant.dlgDefile, JSON.stringify(avant));
  ok('15 · au repos, le coin est dans l’angle bas droit de la boîte (à 2 px) et reçoit le pointeur', avant.bas <= 2 && avant.droite <= 2 && avant.touche, JSON.stringify(avant));
  await page.evaluate(() => { const i = document.querySelector('dialog.crm-boite .tab-dialogue-boite'); i.scrollTop = i.scrollHeight; });
  await page.waitForTimeout(150);
  const apres = await coin();
  ok('15 · la boîte défilée jusqu’en bas, le coin n’a pas bougé : toujours dans l’angle, toujours au-dessus des champs', apres.top > 50 && apres.bas <= 2 && apres.droite <= 2 && apres.touche && !apres.dlgDefile, JSON.stringify(apres));
  await page.screenshot({ path: `${CAPT}/opportunite-basse.png`, fullPage: false });
  // le coin tire encore : la clé est la sienne, écrite une fois
  await tirer(page, 'dialog.crm-boite > .dlg-coin', -60, -40);
  ok('15 · tirer le coin de l’opportunité écrit fenetres.crm une fois, et pas fenetres.tab-dialogue', await pause(page) && ecrites('fenetres.crm').length === 1 && ecrites('fenetres.tab-dialogue').length === 0, JSON.stringify(ECRITURES.map(e => e.cle)));
  const tiree = await coin();
  ok('15 · la boîte tirée plus basse, le coin reste dans l’angle et la boîte intérieure défile toujours dedans', tiree.bas <= 2 && tiree.droite <= 2 && tiree.touche && !tiree.dlgDefile, JSON.stringify(tiree));
  await page.keyboard.press('Escape');
  await attendre(page, () => !document.querySelector('dialog.crm-boite'));
  // « Étendre » ne reprend pas la taille de l'opportunité (une autre clé)
  ok('15 · « Étendre » (fenetres.tab-dialogue) ne reçoit pas la taille de l’opportunité', await page.evaluate(() => FENETRES.taille('tab-dialogue') === null && FENETRES.taille('crm') !== null));

  // le menu d'un écran bas : les deux réglages sont sous « Replier », sur une rangée, au-dessus de l'apparence. Avec les douze
  // rubriques, les accès rapides (lot 4) et l'apparence (lot 5), le menu défile à ces hauteurs (le lot 4 : sur un écran bas, c'est le
  // menu entier qui défile) : on le fait défiler jusqu'en bas, et tout doit être dans la fenêtre
  const auBas = () => page.evaluate(() => {
    const m = document.querySelector('.menu'); m.scrollTop = m.scrollHeight;
    const r = document.querySelector('.menu-replier').getBoundingClientRect(), g = [...document.querySelectorAll('.fen-reglage')].map(b => b.getBoundingClientRect()), a = document.querySelector('.reg-apparence')?.getBoundingClientRect();
    return { replierBas: Math.round(r.bottom), fenetre: innerHeight, reglagesHaut: Math.round(Math.min(...g.map(x => x.top))), reglagesBas: Math.round(Math.max(...g.map(x => x.bottom))), apparenceHaut: a ? Math.round(a.top) : null,
      rangee: g.length === 2 && Math.abs(g[0].top - g[1].top) < 2, colonne: g.length === 2 && g[1].top > g[0].top + 20, h: Math.round(g[0].height) };
  });
  const ordre = x => x.reglagesHaut >= x.replierBas - 1 && (x.apparenceHaut === null || x.reglagesBas <= x.apparenceHaut + 1);
  const menu = await auBas();
  ok('15 · à 700 px de haut, les deux réglages tiennent sur une rangée de 36 px, sous « Replier » et au-dessus de l’apparence', menu.rangee && menu.h === 36 && ordre(menu), JSON.stringify(menu));
  ok('15 · et le menu défilé jusqu’en bas les montre entiers dans la fenêtre', menu.reglagesBas <= menu.fenetre, JSON.stringify(menu));
  await page.setViewportSize({ width: 1440, height: 768 });
  await page.waitForTimeout(300);
  const m768 = await auBas();
  ok('15 · à 768 px de haut (un portable courant), les deux réglages restent sur une rangée, dans l’ordre, et le menu défilé jusqu’en bas les montre', m768.rangee && ordre(m768) && m768.reglagesBas <= m768.fenetre, JSON.stringify(m768));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);
  const haut = await auBas();
  ok('15 · à 900 px de haut, les deux réglages gardent leurs 44 px, l’un sous l’autre, dans l’ordre, et le menu défilé jusqu’en bas les montre', haut.colonne && haut.h >= 44 && ordre(haut) && haut.reglagesBas <= haut.fenetre, JSON.stringify(haut));
  await page.evaluate(() => { document.querySelector('.menu').scrollTop = 0; });
  ok('15 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
  DB.crescite_diffusion_prospects = prospects0;
}
{
  // « Disposition d'origine » puis « Annuler » sur une fenêtre plus petite que celle où la largeur a été réglée : rien n'est perdu
  repartir(); garder('fenetres.tiroir', 1500);
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1100, hauteur: 800, hash: '#/accueil' });
  await page.waitForSelector('#fen-origine', { timeout: 15000 });
  ECRITURES.length = 0;
  await page.click('#fen-origine');
  await page.waitForSelector('.annonce button', { timeout: 3000 });
  await pause(page);
  await page.click('.annonce:last-of-type button');
  await pause(page);
  const e = ecrites('fenetres.tiroir').map(x => x.valeur);
  ok('15 · à 1 100 px, « Disposition d’origine » puis « Annuler » rend la largeur gardée telle quelle (1 500), pas celle que l’écran permet (1 020)', e.length === 2 && e[0] === null && e[1] === 1500, JSON.stringify(e));
  ok('15 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

await navigateur.close();
bilan(CAPT);
