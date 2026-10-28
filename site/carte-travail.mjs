// La carte de tournée comme vue de travail (admin/tournee.js, admin/menus.js, admin/selection.js, admin/index.html : badgesDate
// et « Voir sur la carte » dans la fiche d'un lieu), vérifiée dans Chromium, hors ligne, sur la base fictive commune
// (admin-fictif.mjs).
//   node site/carte-travail.mjs
// Ce que le banc regarde : le menu d'une pastille (au clic, à Entrée : les dates du lieu, « Nouvelle date ici », l'itinéraire, la
// fiche ; une date s'ouvre en tiroir sans quitter la carte) ; le survol et le focus, qui allument la pastille et ses étapes (et
// inversement), sans aria-current ; Maj+clic, qui choisit les dates du lieu (la barre, « 2 dates », SELECTION.ids()) ; le cadre
// (+ − ⌂, les touches, Ctrl+molette, la molette après un clic, le glisser, l'échelle des rayons, le glissement de 220 ms et rien
// sous mouvement réduit) ; le cadre et le focus gardés à travers un redessin ; les badges des étapes ; le vide de la carte ; « Voir
// sur la carte » depuis la fiche du lieu et TOURNEE.viser ; le groupe « La carte » de l'aide ; le doigt (le toucher garde le tiroir
// du lieu, l'appui long ouvre le menu) ; l'impression, qui masque les boutons du zoom ; les rôles. Les captures vont dans
// site/dist/shots-carte-travail/. Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, DB, ok, calme, ouvrir, texte, compte, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-carte-travail');
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
const attendre = (page, fn, arg = null, ms = 6000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
const PIN5 = '.tn-svg .tn-pin[data-tn-lieu="5"]';
const cadre = page => page.$eval('.tn-svg', e => e.getAttribute('viewBox'));
const largeurCadre = async page => +(await cadre(page)).split(' ')[2];
const adresse = page => page.evaluate(() => location.hash);
const focusPin = page => page.evaluate(() => document.activeElement?.matches?.('.tn-pin') ? document.activeElement.dataset.tnLieu : null);
const attendreCadre = async page => { await page.waitForTimeout(380); return cadre(page); };    // (le cadre glisse en 220 ms)
const libellesMenu = page => page.$$eval('.gm-boite [data-gm]', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));

// ================================================================================ 1 · le menu d'une pastille
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/carte' });
  await page.waitForSelector(PIN5, { timeout: 15000 });
  ok('1 · la pastille du lieu 5 porte ses deux dates (101, 107), un menu annoncé et le bouton d’un lecteur d’écran', await page.$eval(PIN5, g => g.dataset.dates === '101,107' && g.getAttribute('aria-haspopup') === 'menu' && g.getAttribute('role') === 'button' && g.tabIndex === 0));
  await page.click(PIN5);
  const ouvert = await attendre(page, () => document.querySelector('.gm-boite'));
  const items = ouvert ? await libellesMenu(page) : [];
  ok('1 · cliquer une pastille ouvre un menu (.gm-boite), pas le tiroir du lieu', ouvert && (await compte(page, '.tiroir')) === 0, items.join(' | '));
  ok('1 · le menu dit le lieu, puis ses dates (titre et jour), puis « Nouvelle date ici », l’itinéraire et la fiche', /Caen/.test(await page.$eval('.gm-boite', e => e.getAttribute('aria-label'))) && /Bérénice/.test(items[0] || '') && /Cassandres/.test(items[1] || '') && items.some(t => /^Nouvelle date ici/.test(t)) && items.some(t => /^Itinéraire/.test(t)) && items.some(t => /^Ouvrir la fiche/.test(t)), items.join(' | '));
  ok('1 · chaque date du menu est un lien vers sa fiche (#/representations/101, 107)', (await compte(page, '.gm-boite a[href="#/representations/101"]')) === 1 && (await compte(page, '.gm-boite a[href="#/representations/107"]')) === 1);
  await calme(page);
  await page.screenshot({ path: `${CAPT}/carte-menu.png`, fullPage: false });
  // une date s'ouvre en tiroir, la carte reste là
  await page.click('.gm-boite a[href="#/representations/101"]');
  await attendre(page, () => document.querySelector('.tiroir.la #ed-date'));
  ok('1 · « Bérénice » ouvre la date en tiroir (.tiroir.la #ed-date), le menu se ferme, et l’adresse reste celle de la carte', (await compte(page, '.tiroir.la #ed-date')) === 1 && (await compte(page, '.gm-boite')) === 0 && (await adresse(page)) === '#/representations/carte', await adresse(page));
  ok('1 · la carte est toujours là sous le tiroir', (await compte(page, PIN5)) === 1);
  await page.keyboard.press('Escape');
  await attendre(page, () => !document.querySelector('.tiroir.la'));
  // Entrée au clavier
  await page.focus(PIN5);
  await page.keyboard.press('Enter');
  const ouvert2 = await attendre(page, () => document.querySelector('.gm-boite'));
  ok('1 · Entrée sur la pastille focalisée ouvre le même menu', ouvert2 && (await libellesMenu(page)).some(t => /^Nouvelle date ici/.test(t)));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  ok('1 · Échap referme le menu et le focus revient sur la pastille', (await compte(page, '.gm-boite')) === 0 && (await focusPin(page)) === '5');
  // un clic droit ouvre le même menu
  await page.click(PIN5, { button: 'right' });
  ok('1 · le clic droit sur la pastille ouvre le menu aussi', await attendre(page, () => document.querySelector('.gm-boite')));
  await page.keyboard.press('Escape');
  // « Nouvelle date ici »
  await page.click(PIN5);
  await attendre(page, () => document.querySelector('.gm-boite'));
  await page.click('.gm-boite >> text=Nouvelle date ici');
  await attendre(page, () => document.querySelector('#d-lieu'));
  await page.waitForTimeout(300);
  const nouvelle = await page.evaluate(() => ({ hash: location.hash, lieu: document.querySelector('#d-lieu')?.textContent || '', champ: document.querySelector('#d-lieu input')?.value || '', sp: document.querySelector('#d-sp')?.value || '', fiche: document.querySelector('#d-lieu-fiche a[href^="#/lieux/"]')?.getAttribute('href') || '' }));
  ok('1 · « Nouvelle date ici » ouvre la fiche d’une nouvelle date avec le lieu posé (Caen) et un spectacle d’office', nouvelle.hash === '#/representations/nouvelle' && /Caen/.test(nouvelle.champ) && nouvelle.fiche === '#/lieux/5' && nouvelle.sp !== '', JSON.stringify(nouvelle));
  ok('1 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 2 · le survol et le focus allument
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/carte' });
  await page.waitForSelector(PIN5, { timeout: 15000 });
  ok('2 · chaque étape porte le lieu de sa date (data-lieu)', await page.$$eval('#tn-etapes a.tn-date', xs => xs.length >= 3 && xs.every(x => /^\d+$/.test(x.dataset.lieu))));
  ok('2 · au repos, rien n’est allumé', (await compte(page, '.allume')) === 0);
  await page.hover(`${PIN5} .tn-point`);
  await attendre(page, () => document.querySelector('#tn-etapes .ligne.allume'));
  const etapes = await page.$$eval('#tn-etapes .ligne.allume', xs => xs.map(x => x.getAttribute('href')));
  ok('2 · survoler la pastille 5 allume ses deux étapes (101, 107) dans la colonne de droite', etapes.join(',') === '#/representations/101,#/representations/107', etapes.join(','));
  ok('2 · … sans aria-current (un repère visuel seulement)', (await compte(page, '#tn-etapes .allume[aria-current]')) === 0 && (await compte(page, '#tn-etapes a[aria-current]')) === 0);
  await page.waitForTimeout(550);
  const grossi = await page.evaluate(() => { const g = document.querySelector('.tn-pin[data-tn-lieu="5"]'), c = getComputedStyle(g.querySelector('.tn-point')); return { cercle: c.transform, translate: g.getAttribute('transform'), origine: c.transformBox }; });
  ok('2 · la pastille allumée grossit de 15 % sur ses cercles, et le <g> garde son translate (elle ne saute pas)', /matrix\(1\.15/.test(grossi.cercle) && /^translate\(/.test(grossi.translate) && grossi.origine === 'fill-box', JSON.stringify(grossi));
  ok('2 · l’étape allumée a l’anneau et la bordure de la date courante', await page.$eval('#tn-etapes .ligne.allume', e => { const s = getComputedStyle(e); return /\d+px/.test(s.boxShadow) && s.boxShadow !== 'none' && s.borderLeftColor !== ''; }));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/carte-allume.png`, fullPage: false });
  await page.mouse.move(5, 5);
  await attendre(page, () => !document.querySelector('.allume'));
  ok('2 · quitter la pastille éteint tout', (await compte(page, '.allume')) === 0);
  // l'inverse : une étape allume sa pastille
  await page.hover('#tn-etapes a.tn-date[data-lieu="6"]');
  await attendre(page, () => document.querySelector('.tn-pin.allume'));
  ok('2 · survoler une étape allume la pastille de son lieu (le Havre), et elle seule', (await page.$$eval('.tn-pin.allume', xs => xs.map(x => x.dataset.tnLieu))).join(',') === '6');
  await page.mouse.move(5, 5);
  await attendre(page, () => !document.querySelector('.allume'));
  // le focus au clavier
  await page.focus(PIN5);
  await attendre(page, () => document.querySelector('#tn-etapes .ligne.allume'));
  const desc = await page.$eval(PIN5, g => { const id = g.getAttribute('aria-describedby'); return { id, texte: id ? document.getElementById(id)?.textContent : '' }; });
  ok('2 · le focus sur une pastille allume ses étapes et la décrit : « 2 dates » (aria-describedby)', (await compte(page, '#tn-etapes .ligne.allume')) === 2 && desc.texte === '2 dates', JSON.stringify(desc));
  await page.focus('#f-q');
  await attendre(page, () => !document.querySelector('.allume'));
  ok('2 · le focus parti, plus rien d’allumé ni de décrit', (await compte(page, '.allume')) === 0 && (await page.$eval(PIN5, g => g.hasAttribute('aria-describedby'))) === false);
  ok('2 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 3 · Maj+clic choisit les dates du lieu
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/carte' });
  await page.waitForSelector(PIN5, { timeout: 15000 });
  await page.click(PIN5, { modifiers: ['Shift'] });
  await attendre(page, () => document.querySelector('#sel-barre'));
  ok('3 · Maj+clic sur la pastille 5 : la barre dit « 2 dates », sans ouvrir de menu', /2 dates/.test(await texte(page, '#sel-barre .sel-compte')) && (await compte(page, '.gm-boite')) === 0);
  ok('3 · SELECTION.ids() vaut [101, 107] (genre date)', await page.evaluate(() => JSON.stringify(SELECTION.ids()) === '[101,107]' && SELECTION.genre() === 'date'));
  ok('3 · la pastille est marquée (sel-on, aria-pressed), jamais aria-selected, et ses deux étapes aussi', await page.evaluate(() => { const g = document.querySelector('.tn-pin[data-tn-lieu="5"]'); return g.classList.contains('sel-on') && g.getAttribute('aria-pressed') === 'true' && !g.hasAttribute('aria-selected') && document.querySelectorAll('#tn-etapes a.sel-on').length === 2; }));
  ok('3 · les autres pastilles sont à « non choisie » (aria-pressed=false)', await page.$$eval('.tn-pin:not([data-tn-lieu="5"])', xs => xs.length >= 2 && xs.every(g => g.getAttribute('aria-pressed') === 'false' && !g.classList.contains('sel-on'))));
  ok('3 · la pastille choisie prend le contour d’accent sur son cercle (un <g> SVG ne rend pas .sel-on)', await page.$eval(`${PIN5} .tn-point`, c => { const s = getComputedStyle(c); return s.strokeWidth === '3px' && s.stroke !== getComputedStyle(document.body).color; }));
  const actions = await page.$$eval('#sel-barre .sel-actions button', xs => xs.map(x => x.textContent.trim()));
  ok('3 · la barre propose les actions des dates : statut, publier, écrire aux contacts, dupliquer vers…', ['Statut…', 'Publier', 'Écrire aux contacts', 'Dupliquer vers…'].every(a => actions.includes(a)), actions.join(' | '));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/carte-selection.png`, fullPage: false });
  // en mode sélection, un clic simple sur une autre pastille la prend aussi ; Maj+clic sur la 5 la laisse
  await page.click('.tn-svg .tn-pin[data-tn-lieu="6"]');
  ok('3 · en mode sélection, un clic simple prend la pastille du Havre (102) sans ouvrir de menu', await page.evaluate(() => JSON.stringify(SELECTION.ids()) === '[101,107,102]') && (await compte(page, '.gm-boite')) === 0, await page.evaluate(() => JSON.stringify(SELECTION.ids())));
  await page.click(PIN5, { modifiers: ['Shift'] });
  ok('3 · Maj+clic de nouveau sur la 5 laisse ses deux dates', await page.evaluate(() => JSON.stringify(SELECTION.ids()) === '[102]'), await page.evaluate(() => JSON.stringify(SELECTION.ids())));
  // Espace, au clavier, sur une pastille focalisée en mode sélection
  await page.focus(PIN5);
  await page.keyboard.press(' ');
  ok('3 · Espace, pendant une sélection, prend la pastille (et n’ouvre pas son menu)', await page.evaluate(() => JSON.stringify(SELECTION.ids()) === '[102,101,107]') && (await compte(page, '.gm-boite')) === 0, await page.evaluate(() => JSON.stringify(SELECTION.ids())));
  await page.keyboard.press('Escape');
  await attendre(page, () => !document.querySelector('#sel-barre'));
  ok('3 · Échap quitte la sélection : plus de barre, plus de marque sur les pastilles', (await compte(page, '#sel-barre')) === 0 && (await compte(page, '.tn-pin.sel-on')) === 0 && (await compte(page, '.tn-pin[aria-pressed]')) === 0);
  // Espace hors sélection : le menu
  await page.focus(PIN5);
  await page.keyboard.press(' ');
  ok('3 · Espace hors sélection ouvre le menu, comme Entrée', await attendre(page, () => document.querySelector('.gm-boite')));
  await page.keyboard.press('Escape');
  ok('3 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 4 · le cadre : + − ⌂, les touches, la molette, le glisser
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/carte' });
  await page.waitForSelector(PIN5, { timeout: 15000 });
  ok('4 · trois boutons en coin de carte (rapprocher, éloigner, toute la France), nommés pour un lecteur d’écran', await page.$$eval('.tn-zoom button', xs => xs.length === 3 && xs.map(x => x.textContent.trim()).join('|') === 'Rapprocher|Éloigner|Toute la France') && await page.$eval('.tn-zoom', z => z.getAttribute('role') === 'group'));
  ok('4 · au départ, toute la France (0 0 800 780), rien en session', (await cadre(page)) === '0 0 800 780' && await page.evaluate(() => !session.vues.carte.vb));
  const r0 = await page.$eval(`${PIN5} .tn-point`, c => +c.getAttribute('r'));
  // + : plus petit (après le glissement)
  await page.click('[data-tn-zoom="+"]');
  await page.waitForTimeout(90);
  const milieu = await largeurCadre(page);
  const fin = await attendreCadre(page);
  ok('4 · « + » rapproche : le cadre devient plus étroit (le glissement de 220 ms passe par un cadre intermédiaire)', +fin.split(' ')[2] < 800 && milieu > +fin.split(' ')[2] && milieu < 800, `milieu ${milieu}, fin ${fin}`);
  ok('4 · … il se retient en session (session.vues.carte.vb), pas dans l’adresse', await page.evaluate(f => session.vues.carte.vb === f && !/vb|cadre|zoom/.test(location.hash + location.search), fin));
  ok('4 · … et les rayons suivent l’échelle (le cercle de la pastille est plus petit dans le cadre étroit, il paraît plus grand à l’écran)', await page.$eval(`${PIN5} .tn-point`, (c, r) => +c.getAttribute('r') < r, r0));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/carte-zoom.png`, fullPage: false });
  await page.click('[data-tn-zoom="-"]');
  const apres = await attendreCadre(page);
  ok('4 · « − » éloigne : de nouveau toute la France', apres === '0 0 800 780', apres);
  // ⌂ même avec « Autour des dates » coché avant
  await page.click('#tn-serre');
  const serre = await attendreCadre(page);
  ok('4 · « Autour des dates » resserre le cadre', serre !== '0 0 800 780' && await page.evaluate(() => session.vues.carte.serre === true && !session.vues.carte.vb));
  await page.click('[data-tn-zoom="+"]');
  const serrePlus = await attendreCadre(page);
  ok('4 · « + » depuis le cadre resserré le resserre encore (vb l’emporte sur « Autour des dates »)', +serrePlus.split(' ')[2] < +serre.split(' ')[2]);
  await page.click('[data-tn-zoom="0"]');
  const maison = await attendreCadre(page);
  ok('4 · ⌂ remet toute la France (0 0 800 780), décoche « Autour des dates » et efface vb', maison === '0 0 800 780' && (await page.$eval('#tn-serre', e => e.checked)) === false && await page.evaluate(() => !session.vues.carte.vb && session.vues.carte.serre === false), maison);
  await page.click('[data-tn-zoom="+"]');
  await attendreCadre(page);
  await page.click('#tn-serre');
  const recoche = await attendreCadre(page);
  ok('4 · cocher « Autour des dates » efface le zoom : le cadre resserré revient', recoche === serre && await page.evaluate(() => !session.vues.carte.vb), `${recoche} / ${serre}`);
  await page.click('[data-tn-zoom="0"]');
  await attendreCadre(page);
  // au clavier : + − 0 sur la carte focalisée
  await page.focus(PIN5);
  await page.keyboard.press('+');
  const kp = await attendreCadre(page);
  ok('4 · la touche « + » sur la carte focalisée rapproche', +kp.split(' ')[2] < 800, kp);
  await page.keyboard.press('-');
  ok('4 · la touche « - » éloigne', (await attendreCadre(page)) === '0 0 800 780');
  await page.keyboard.press('+'); await attendreCadre(page);
  await page.keyboard.press('0');
  ok('4 · la touche « 0 » (⌂) remet toute la France', (await attendreCadre(page)) === '0 0 800 780');
  ok('4 · … et le focus est resté sur la pastille à travers ces redessins', (await focusPin(page)) === '5');
  // Ctrl+molette
  const boite = await page.$eval('.tn-svg', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width * .55, y: r.top + r.height * .4 }; });
  await page.mouse.move(boite.x, boite.y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -300);
  await page.keyboard.up('Control');
  const cw = await attendreCadre(page);
  ok('4 · Ctrl+molette (vers le haut) rapproche, autour du pointeur', +cw.split(' ')[2] < 800, cw);
  await page.click('[data-tn-zoom="0"]');
  await attendreCadre(page);
  // la molette seule : la page défile tant que la carte n'est pas choisie ; après un clic, elle zoome
  await page.evaluate(() => { document.body.style.minHeight = '3000px'; });
  await page.mouse.click(5, 300);     // (hors de la carte)
  await page.mouse.move(boite.x, boite.y);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(450);
  ok('4 · la molette seule, carte non choisie, ne zoome pas : la page est laissée à son défilement', (await cadre(page)) === '0 0 800 780');
  await page.mouse.click(boite.x, boite.y);      // (un clic sur la mer : la carte est choisie ; aucun menu)
  await page.mouse.wheel(0, -200);
  const mol = await attendreCadre(page);
  ok('4 · … après un clic sur la carte, la molette seule la zoome', +mol.split(' ')[2] < 800 && (await compte(page, '.gm-boite')) === 0, mol);
  await page.mouse.click(5, 300);
  await page.mouse.move(boite.x, boite.y);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(450);
  ok('4 · … et un clic ailleurs la rend à la page', (await cadre(page)) === mol);
  // le glisser : le cadre suit, un simple clic ne bouge rien, la fin du glisser n'ouvre pas de menu
  const x0 = +mol.split(' ')[0];
  const fond = await page.$eval('.tn-svg', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width * .3, y: r.top + r.height * .7 }; });
  await page.mouse.move(fond.x, fond.y);
  await page.mouse.down();
  await page.mouse.move(fond.x + 60, fond.y + 20, { steps: 6 });
  await page.mouse.up();
  const glisse = await cadre(page);
  ok('4 · glisser la carte déplace le cadre (sa largeur ne change pas) et le retient en session', glisse !== mol && glisse.split(' ')[2] === mol.split(' ')[2] && +glisse.split(' ')[0] < x0 && await page.evaluate(g => session.vues.carte.vb === g, glisse), `${mol} → ${glisse}`);
  await page.mouse.click(fond.x, fond.y);
  ok('4 · un simple clic sur le fond ne déplace rien', (await cadre(page)) === glisse);
  // un bouton du zoom focalisé, puis un clic sur le fond : la carte reste choisie (le focus quitte la carte avec le clic, pas pour la page)
  await page.mouse.click(5, 300);
  await page.click('[data-tn-zoom="0"]'); await attendreCadre(page);
  ok('4 · (cas) le focus est sur le bouton du zoom, dans la carte', await page.evaluate(() => document.activeElement?.matches?.('.tn-zb') && !!document.activeElement.closest('#tn-carte')));
  await page.mouse.click(boite.x, boite.y);
  ok('4 · (cas) … un clic sur le fond de la mer en retire le focus', await page.evaluate(() => !document.activeElement?.closest?.('#tn-carte')));
  await page.mouse.wheel(0, -200);
  const molBouton = await attendreCadre(page);
  ok('4 · … la molette seule zoome encore la carte (le clic l’a choisie, le focus perdu n’y change rien)', +molBouton.split(' ')[2] < 800, molBouton);
  // à l'impression, les boutons du zoom ne sortent pas
  await page.emulateMedia({ media: 'print' });
  ok('4 · à l’impression, les boutons du zoom (+ − ⌂) sont masqués', await page.$eval('.tn-zoom', z => getComputedStyle(z).display === 'none'));
  await page.emulateMedia({ media: 'screen' });
  ok('4 · … et reparaissent à l’écran', await page.$eval('.tn-zoom', z => getComputedStyle(z).display !== 'none'));
  await page.click('[data-tn-zoom="0"]'); await attendreCadre(page);
  await page.click('[data-tn-zoom="+"]'); await attendreCadre(page);
  const pin = await page.$eval(`${PIN5} .tn-point`, c => { const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const avant = await cadre(page);
  await page.mouse.move(pin.x, pin.y);
  await page.mouse.down();
  await page.mouse.move(pin.x + 40, pin.y + 30, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(120);
  ok('4 · commencer un glisser sur une pastille déplace la carte et n’ouvre aucun menu', (await cadre(page)) !== avant && (await compte(page, '.gm-boite')) === 0);
  // les limites : jamais plus près que le neuvième, jamais plus loin que la France
  for (let i = 0; i < 12; i++) await page.click('[data-tn-zoom="+"]');
  const min = await attendreCadre(page);
  ok('4 · le plus près est borné (90 de large, un neuvième de la France)', Math.round(+min.split(' ')[2]) === 90, min);
  for (let i = 0; i < 12; i++) await page.click('[data-tn-zoom="-"]');
  const loin = await attendreCadre(page);
  ok('4 · le plus loin est la France entière', loin === '0 0 800 780', loin);
  ok('4 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 5 · un redessin garde le focus et le cadre
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/carte' });
  await page.waitForSelector(PIN5, { timeout: 15000 });
  await page.click('[data-tn-zoom="+"]');
  const zoome = await attendreCadre(page);
  await page.focus(PIN5);
  await page.evaluate(() => rafraichirListes());
  await page.waitForTimeout(100);
  ok('5 · un redessin de la liste (un enregistrement, le direct) rend le focus à la pastille 5', (await focusPin(page)) === '5', String(await focusPin(page)));
  ok('5 · … et le cadre zoomé est inchangé', (await cadre(page)) === zoome, `${await cadre(page)} / ${zoome}`);
  // sans zoom : le cadre d'origine et d'« Autour des dates » reviennent aussi
  await page.click('[data-tn-zoom="0"]'); await attendreCadre(page);
  await page.click('#tn-serre');
  const serre = await attendreCadre(page);
  await page.focus(PIN5);
  await page.evaluate(() => rafraichirListes());
  await page.waitForTimeout(100);
  ok('5 · avec « Autour des dates », le redessin garde aussi le cadre resserré et le focus', (await cadre(page)) === serre && (await focusPin(page)) === '5');
  // un étape focalisée garde aussi le focus
  await page.focus('#tn-etapes a.tn-date[href="#/representations/102"]');
  await page.evaluate(() => rafraichirListes());
  await page.waitForTimeout(100);
  ok('5 · une étape focalisée garde son focus à travers le redessin', await page.evaluate(() => document.activeElement?.getAttribute('href') === '#/representations/102'));
  // changer un filtre redessine la carte et garde le zoom
  await page.click('[data-tn-zoom="0"]'); await attendreCadre(page);
  await page.click('[data-tn-zoom="+"]');
  const z2 = await attendreCadre(page);
  await page.fill('#f-q', 'Bérénice');
  await page.waitForTimeout(300);
  ok('5 · un filtre redessine la carte (moins de pastilles) mais garde le cadre', (await cadre(page)) === z2 && (await compte(page, '.tn-svg .tn-pin')) < 4, `${await cadre(page)} / ${z2}`);
  ok('5 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 6 · « Voir sur la carte » et TOURNEE.viser
{
  DB.crescite_lieux.push({ id: 9, nom: 'Salle sans point', type: 'salle', commune: 'Nulle-Part', departement: '00', adresse: null, latitude: null, longitude: null });
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/carte' });
  await page.waitForSelector(PIN5, { timeout: 15000 });
  // le parcours du niveau : la pastille, « Ouvrir la fiche », le lieu en tiroir
  await page.click(PIN5);
  await attendre(page, () => document.querySelector('.gm-boite'));
  await page.click('.gm-boite >> text=Ouvrir la fiche');
  await attendre(page, () => document.querySelector('.tiroir.la #ed-lieu'));
  ok('6 · la fiche du lieu s’ouvre en tiroir depuis le menu (« Ouvrir la fiche »), la carte dessous', (await compte(page, '.tiroir #ed-lieu')) === 1 && /Caen/.test(await texte(page, '.tiroir-titre')) && (await adresse(page)) === '#/representations/carte');
  ok('6 · la fiche d’un lieu placé offre « Voir sur la carte »', (await texte(page, '.tiroir #li-carte')) === 'Voir sur la carte');
  await page.screenshot({ path: `${CAPT}/carte-voir.png`, fullPage: false });
  await page.click('.tiroir #li-carte');
  await attendre(page, () => !document.querySelector('.tiroir.la'));
  const cible = await attendreCadre(page);
  ok('6 · le lien referme le tiroir, recadre la carte sur le lieu (cadre plus étroit) et focalise sa pastille', (await compte(page, '.tiroir.la')) === 0 && +cible.split(' ')[2] <= 300 && (await focusPin(page)) === '5', `${cible} · ${await focusPin(page)}`);
  ok('6 · la pastille visée est dans le cadre recadré', await page.evaluate(() => { const [x, y, w, h] = document.querySelector('.tn-svg').getAttribute('viewBox').split(' ').map(Number), m = document.querySelector('.tn-pin[data-tn-lieu="5"]').getAttribute('transform').match(/translate\(([\d.-]+) ([\d.-]+)\)/); return +m[1] > x && +m[1] < x + w && +m[2] > y && +m[2] < y + h; }));
  // un lieu sans position : pas de lien
  await page.evaluate(() => { location.hash = '#/lieux/9'; });
  await page.waitForSelector('#ed-lieu #li-f', { timeout: 8000 });
  ok('6 · la fiche d’un lieu sans position n’offre pas « Voir sur la carte »', (await compte(page, '#li-carte')) === 0);
  // depuis une autre page : TOURNEE.viser y mène
  await page.evaluate(() => { location.hash = '#/representations'; });
  await page.waitForSelector('#l-dates a.ligne', { timeout: 8000 });
  await page.evaluate(() => TOURNEE.viser(6));
  await attendre(page, () => document.querySelector('.tn-svg .tn-pin'));
  const depuis = await attendreCadre(page);
  ok('6 · TOURNEE.viser(6) depuis la liste ouvre la carte, recadrée sur le Havre, pastille focalisée', (await adresse(page)) === '#/representations/carte' && +depuis.split(' ')[2] <= 300 && (await focusPin(page)) === '6', `${await adresse(page)} ${depuis} ${await focusPin(page)}`);
  ok('6 · TOURNEE.viser d’un lieu sans position ne fait rien (faux)', await page.evaluate(() => TOURNEE.viser(9) === false));
  await ctx.close();
  DB.crescite_lieux.pop();
  ok('6 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
}

// ================================================================================ 7 · l'aide « ? »
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/carte' });
  await page.waitForSelector(PIN5, { timeout: 15000 });
  await page.focus('#vue h1');
  await page.keyboard.press('?');
  await attendre(page, () => document.querySelector('dialog.gq-aide[open]'));
  const groupes = await page.$$eval('dialog.gq-aide h3', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  ok('7 · « ? » sur la carte montre le groupe « La carte », marqué « ici »', groupes.includes('La carte ici'), groupes.join(' | '));
  const corps = await texte(page, 'dialog.gq-aide');
  ok('7 · … il dit Entrée, Maj+clic, + −, Ctrl+molette et le glisser', /Entrée/.test(corps) && /Maj/.test(corps) && /Ctrl/.test(corps) && /molette/.test(corps) && /Glisser la carte/.test(corps));
  await page.screenshot({ path: `${CAPT}/carte-aide.png`, fullPage: false });
  await page.keyboard.press('Escape');
  await page.evaluate(() => { location.hash = '#/representations'; });
  await page.waitForSelector('#l-dates a.ligne', { timeout: 8000 });
  await page.focus('#vue h1');
  await page.keyboard.press('?');
  await attendre(page, () => document.querySelector('dialog.gq-aide[open]'));
  ok('7 · sur la liste, le groupe « La carte » n’est pas « ici »', !(await page.$$eval('dialog.gq-aide h3', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()))).includes('La carte ici'));
  ok('7 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 8 · les étapes (badges), les rôles, le vide
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/carte' });
  await page.waitForSelector(PIN5, { timeout: 15000 });
  const badges = id => page.$$eval(`#tn-etapes a[href="#/representations/${id}"] .badge`, xs => xs.map(x => x.textContent.trim()));
  ok('8 · les étapes portent les badges de la liste : option et masquée (105), scolaire (103), résidence (107)', (await badges(105)).join(',') === 'Option,Masquée' && (await badges(103)).join(',') === 'Scolaire' && (await badges(107)).join(',') === 'Résidence', `${await badges(105)} / ${await badges(103)} / ${await badges(107)}`);
  ok('8 · … et les points du parcours (les mêmes que dans la liste)', (await compte(page, '#tn-etapes a.tn-date .pc-points')) >= 1);
  ok('8 · les badges tiennent dans la colonne des étapes (aucun débordement horizontal)', await page.evaluate(() => { const c = document.querySelector('#tn-etapes').getBoundingClientRect(); return [...document.querySelectorAll('#tn-etapes a.tn-date')].every(a => { const r = a.getBoundingClientRect(); return r.right <= c.right + 1 && a.scrollWidth <= a.clientWidth + 1; }); }));
  ok('8 · la carte est un groupe (role="group") qui garde son nom, et ses tracés de fond sont cachés aux lecteurs d’écran', await page.$eval('.tn-svg', s => s.getAttribute('role') === 'group' && /^Carte de la tournée/.test(s.getAttribute('aria-label')) && [...s.querySelectorAll('.tn-pays, .tn-voisin, .tn-trajet')].every(p => p.getAttribute('aria-hidden') === 'true')));
  ok('8 · les pastilles sont des boutons focalisables, nommés par leur lieu et leur compte', await page.$$eval('.tn-pin', xs => xs.length >= 3 && xs.every(g => g.getAttribute('role') === 'button' && g.tabIndex === 0 && /: \d+ dates?$/.test(g.getAttribute('aria-label')))));
  ok('8 · les boutons du zoom font au moins 36 px et leurs icônes sont cachées', await page.$$eval('.tn-zb', xs => xs.every(b => b.getBoundingClientRect().width >= 36 && b.getBoundingClientRect().height >= 36 && [...b.querySelectorAll('svg')].every(s => s.getAttribute('aria-hidden') === 'true') && b.querySelector('.sr'))));
  await ctx.close();
}
{
  // le vide : aucune date à venir
  const gardees = DB.crescite_dates.slice();
  DB.crescite_dates.splice(0, DB.crescite_dates.length, ...gardees.filter(d => d.id === 104));
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/carte' });
  await page.waitForSelector('.tn-svg', { timeout: 15000 });
  await attendre(page, () => document.querySelector('#tn-etapes'));
  ok('8 · sans date à venir, la carte le dit : « Aucune date à venir sur la carte » et « Toutes les périodes »', /Aucune date à venir sur la carte/.test(await texte(page, '#tn-etapes')) && (await texte(page, '#tn-etapes [data-tn-toutes]')) === 'Toutes les périodes' && (await compte(page, '.tn-svg .tn-pin')) === 0);
  await page.screenshot({ path: `${CAPT}/carte-vide.png`, fullPage: false });
  await page.click('#tn-etapes [data-tn-toutes]');
  await attendre(page, () => document.querySelector('#tn-etapes a.tn-date'));
  ok('8 · « Toutes les périodes » ne remet que la période : la date passée (104) paraît, avec son badge « passée »', (await compte(page, '#tn-etapes a[href="#/representations/104"]')) === 1 && (await page.$$eval('#tn-etapes a[href="#/representations/104"] .badge', xs => xs.map(x => x.textContent.trim()))).includes('passée') && await page.evaluate(() => session.dates.periode === 'toutes'));
  ok('8 · … et la pastille de Paris paraît sur la carte', (await compte(page, '.tn-svg .tn-pin[data-tn-lieu="7"]')) === 1);
  await page.fill('#f-q', 'zzzz');
  await page.waitForTimeout(300);
  ok('8 · un filtre sans résultat dit autre chose : « Aucune date ne correspond » et « Effacer les filtres »', /Aucune date ne correspond/.test(await texte(page, '#tn-etapes')) && (await compte(page, '#tn-etapes [data-effacer-filtres]')) === 1 && (await compte(page, '#tn-etapes [data-tn-toutes]')) === 0);
  ok('8 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
  DB.crescite_dates.splice(0, DB.crescite_dates.length, ...gardees);
}

// ================================================================================ 9 · le doigt, le mouvement réduit, le budget
{
  // au doigt : le toucher garde le tiroir du lieu, pas de menu ; pas de boutons de zoom
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1000, hauteur: 800, hash: '#/representations/carte', tactile: true });
  await page.waitForSelector(PIN5, { timeout: 15000 });
  ok('9 · au doigt, les boutons du zoom sont cachés', (await page.$eval('.tn-zoom', e => getComputedStyle(e).display)) === 'none');
  await page.tap(PIN5);
  await attendre(page, () => document.querySelector('.tiroir.la #ed-lieu'));
  ok('9 · au doigt, toucher une pastille ouvre le lieu en tiroir (comme avant), sans menu', (await compte(page, '.tiroir.la #ed-lieu')) === 1 && (await compte(page, '.gm-boite')) === 0 && (await adresse(page)) === '#/representations/carte');
  ok('9 · aucune erreur de script (doigt)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  // au doigt : l'appui long sur une pastille ouvre le menu (jamais le tiroir du lieu)
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1000, hauteur: 800, hash: '#/representations/carte', tactile: true });
  await page.waitForSelector(PIN5, { timeout: 15000 });
  const c = await page.$eval(`${PIN5} .tn-point`, e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
  await page.waitForTimeout(900);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const long = await attendre(page, () => document.querySelector('.gm-boite'));
  await page.waitForTimeout(150);
  ok('9 · au doigt, l’appui long sur une pastille ouvre le menu (.gm-boite) avec « Nouvelle date ici »', long && (await libellesMenu(page)).some(t => /Nouvelle date ici/.test(t)), (await libellesMenu(page)).join(' | '));
  ok('9 · … et aucun tiroir ne s’ouvre, la carte reste à son adresse', (await compte(page, '.tiroir.la')) === 0 && (await adresse(page)) === '#/representations/carte');
  ok('9 · aucune erreur de script (appui long)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  // mouvement réduit : le cadre change d'un coup, rien ne grossit en douceur
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/carte', reduit: true });
  await page.waitForSelector(PIN5, { timeout: 15000 });
  await page.click('[data-tn-zoom="+"]');
  const tout_de_suite = await cadre(page);
  ok('9 · sous mouvement réduit, « + » change le cadre d’un coup (aucun glissement)', tout_de_suite !== '0 0 800 780' && (await attendreCadre(page)) === tout_de_suite, tout_de_suite);
  await page.hover(`${PIN5} .tn-point`);
  await attendre(page, () => document.querySelector('.tn-pin.allume'));
  const s = await page.$eval(`${PIN5} .tn-point`, c => { const st = getComputedStyle(c); return { t: st.transitionDuration, tr: st.transform }; });
  ok('9 · … la pastille allumée ne grossit pas et n’anime rien (pas de transition, pas de transform)', (s.t === '0s' || s.t === '') && (s.tr === 'none'), JSON.stringify(s));
  ok('9 · … mais l’étape reste allumée (le repère visuel)', (await compte(page, '#tn-etapes .ligne.allume')) === 2);
  ok('9 · aucune erreur de script (mouvement réduit)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  // ?anim=0 : même chose
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '?anim=0#/representations/carte' });
  await page.waitForSelector(PIN5, { timeout: 15000 });
  await page.click('[data-tn-zoom="+"]');
  const t = await cadre(page);
  ok('9 · avec ?anim=0, le cadre change aussi d’un coup', t !== '0 0 800 780' && (await attendreCadre(page)) === t);
  ok('9 · aucune erreur de script (?anim=0)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  // le budget : aucune tâche longue (> 200 ms) à CPU=4 pendant les gestes de la carte
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/carte', cpu: 4, longues: true });
  await page.waitForSelector(PIN5, { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__longues.length = 0; window.__pret = performance.now(); });
  const r = await page.$eval('.tn-svg', e => { const b = e.getBoundingClientRect(); return { x: b.left + b.width * .5, y: b.top + b.height * .5 }; });
  for (let i = 0; i < 3; i++) { await page.click('[data-tn-zoom="+"]'); await page.waitForTimeout(260); }
  await page.mouse.move(r.x, r.y);
  await page.keyboard.down('Control');
  for (let i = 0; i < 5; i++) await page.mouse.wheel(0, 100);
  await page.keyboard.up('Control');
  await page.mouse.move(r.x, r.y); await page.mouse.down(); await page.mouse.move(r.x + 120, r.y + 40, { steps: 12 }); await page.mouse.up();
  await page.hover(`${PIN5} .tn-point`);
  await page.click('[data-tn-zoom="0"]');
  await page.waitForTimeout(600);
  const l = await page.evaluate(() => window.__longues.slice());
  console.log(`tâches longues pendant le zoom, la molette, le glisser et le survol de la carte à CPU=4 (ms) : ${JSON.stringify(l)}`);
  ok('9 · aucune tâche > 200 ms pendant le zoom, la molette, le glisser et le survol, à CPU=4', l.every(d => d < 200), JSON.stringify(l));
  ok('9 · aucune erreur de script (CPU=4)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

await navigateur.close();
bilan(CAPT);
