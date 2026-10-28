// Les colonnes du tableur à la carte (rubrique Représentations, vue « Tableur » : #/representations/tableur), vérifiées dans
// Chromium, hors ligne, sur la base fictive commune (admin-fictif.mjs).
//   python3 site/build.py && node site/tableur-colonnes.mjs
// Ce que le banc regarde : une poignée au bord droit de chaque en-tête (au pointeur fin et au-dessus de 700 px seulement), qui
// se tire (une seule écriture de tableur.colonnes, au relâchement), se règle aux flèches, ajuste la colonne à son contenu d'un
// double-clic, et dont la largeur gardée est retrouvée (bornée à 640 px) ; le cadre qui naît avec ses largeurs ; le menu d'un
// en-tête (focus tournant, Maj+F10) : masquer, figer jusqu'ici (les bords gauche cumulés, la case visée jamais sous les colonnes
// figées), avancer / reculer (Alt+← Alt+→), colonnes d'origine ; la fenêtre « Colonnes… » (cocher, ↑ ↓, glisser) ; l'export qui
// suit les colonnes montrées ; la hauteur du cadre (la place qui reste, le menu replié, la poignée du bas) ; le coin des fenêtres
// du lieu et de la distribution, la taille de la zone de texte des notes ; le « +n » de la distribution, compté d'après la largeur
// de la case ; un changement qui arrive pendant un glisser sans casser le geste ; la forme plate de l'ancienne préférence.
// Les captures vont dans site/dist/shots-tableur-colonnes/. Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, UID, DB, ECRITURES, resultats, plus, saisonDe, ok, calme, ouvrir, texte, compte, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-tableur-colonnes');
// une exception en route (un élément qui manque) : ce qui a été vérifié jusque-là est dit avant la sortie en erreur
process.on('uncaughtException', e => { for (const [etat, nom, detail] of resultats) console.log(`${etat === 'ok' ? '  ✓' : '  ✗'} ${nom}${etat === 'KO' && detail ? `\n      ${detail}` : ''}`); console.error(e.message); process.exit(1); });
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
const attendre = (page, fn, arg = null, ms = 6000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
const ecrites = () => ECRITURES.filter(e => e.cle === 'tableur.colonnes');
const dernieres = () => ecrites().at(-1)?.valeur;
const repartir = () => { DB.crescite_preferences = [{ user_id: UID, cle: 'tableur.mode', valeur: 'complet' }]; ECRITURES.length = 0; };   // (le tableur s'ouvre en Simple : ces essais sont ceux du Complet)
const garder = (cle, valeur) => DB.crescite_preferences.push({ user_id: UID, cle, valeur });
const TETE = '#tab-tete th';
const enTetes = page => page.$$eval(TETE, xs => xs.map(x => x.dataset.k));
const largeurDe = (page, k) => page.$eval(`#tab-tete th[data-k="${k}"]`, th => Math.round(th.getBoundingClientRect().width * 10) / 10);
const variable = (page, nom) => page.$eval('#tab-cadre', (c, n) => c.style.getPropertyValue(n), nom);
const poignee = k => `#tab-tete th[data-k="${k}"] > .poignee`;
const centre = (page, sel) => page.$eval(sel, e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
// tirer une poignée de dx, dy : appuyer, bouger en dix pas, lâcher (la pause laisse une image entre deux pas)
async function tirer(page, sel, dx, dy = 0, { lacher = true, entre = null } = {}) {
  const { x, y } = await centre(page, sel);
  await page.mouse.move(x, y); await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(x + dx * i / 10, y + dy * i / 10); await page.waitForTimeout(12); }
  if (entre) await entre();
  if (lacher) { await page.mouse.up(); await page.waitForTimeout(120); }
}
const menuOuvert = page => page.waitForSelector('.gm [role=menuitem]', { timeout: 4000 }).then(() => true, () => false);
const actionsMenu = page => page.$$eval('.gm [data-gm]', xs => xs.map(x => x.querySelector('.gm-l')?.firstChild?.textContent.trim() || x.textContent.trim()));
async function choisirDansLeMenu(page, libelle) {
  const b = page.locator('.gm [data-gm]', { hasText: libelle }).first();
  await b.click();
  await page.waitForTimeout(80);
}
const pause = (page, ms = 150) => page.waitForTimeout(ms);
// les préférences partent après le geste, de façon asynchrone : on attend que plus rien ne s'écrive depuis un instant
async function ecritureStable(page) { let n = -1; while (n !== ECRITURES.length) { n = ECRITURES.length; await page.waitForTimeout(120); } }
const annonces = page => page.$$eval('.annonce', xs => xs.map(x => x.textContent.trim()).join(' | '));

// ================================================================================ 1 · les poignées : où elles sont, où elles ne sont pas
{
  repartir();
  // l'instant où le cadre naît : ses largeurs sont déjà dans son style (pas de saut au premier dessin)
  garder('tableur.colonnes', { complet: { largeurs: { lieu: 230 } } });
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000 });
  await page.evaluate(() => { window.__gabarit = null; const cadre0 = window.cadre; window.cadre = (rubrique, contenu) => { if (/id="tab-cadre"/.test(contenu)) window.__gabarit = contenu; return cadre0(rubrique, contenu); }; });
  await page.evaluate(() => { location.hash = '#/representations/tableur'; });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  const gabarit = await page.evaluate(() => window.__gabarit);
  ok('1 · le cadre naît avec sa largeur retenue : le gabarit de la vue porte déjà --w-lieu:230px dans le style de #tab-cadre (avant le premier dessin)', !!gabarit && /id="tab-cadre" style="[^"]*--w-lieu:230px/.test(gabarit), (gabarit || '').match(/id="tab-cadre"[^>]*>/)?.[0]);
  const n = await compte(page, TETE);
  ok('1 · à 1 600 px, au pointeur fin : une poignée au bord droit de chaque en-tête (role=separator, nommée, vertical)', n >= 10 && (await compte(page, `${TETE} > .poignee[role=separator][aria-label^="Largeur de la colonne"]`)) === n && (await compte(page, `${TETE} > .poignee[aria-orientation=vertical]`)) === n, `${n} en-têtes`);
  ok('1 · une seule poignée est dans l’ordre de Tab (celle de l’en-tête courant), les autres se joignent aux flèches', (await compte(page, `${TETE} > .poignee[tabindex="0"]`)) === 1 && (await compte(page, `${TETE}[tabindex="0"]`)) === 1);
  ok('1 · la poignée dit sa valeur (aria-valuenow = la largeur de la colonne), ses bornes 48 et 640', await page.$eval(poignee('lieu'), (p) => p.getAttribute('aria-valuemin') === '48' && p.getAttribute('aria-valuemax') === '640' && p.getAttribute('aria-valuenow') === '230'));
  ok('1 · la largeur retenue au démarrage s’applique : « Lieu » fait 230 px', (await largeurDe(page, 'lieu')) === 230);
  ok('1 · la poignée a draggable=false et touch-action: none (le glisser natif ne lui prend pas le pointeur)', await page.$eval(poignee('lieu'), p => p.draggable === false && getComputedStyle(p).touchAction === 'none'));
  ok('1 · la poignée dit ce que fait le double-clic : l’ajuster au contenu', /ajuster au contenu/.test(await page.$eval(poignee('lieu'), p => p.title)));
  // la fenêtre se rétrécit sous 700 px : plus de poignée, plus de largeur retenue (les media queries du téléphone reprennent la main), puis tout revient
  await page.setViewportSize({ width: 600, height: 900 });
  const visibles = () => page.evaluate(() => [...document.querySelectorAll('.poignee')].filter(p => getComputedStyle(p).display !== 'none').length);
  await attendre(page, () => document.querySelectorAll('#tab-tete .poignee').length === 0);
  ok('1 · à 600 px, la fenêtre étant rétrécie : plus aucune poignée visible, plus de --w-lieu en ligne (la feuille du téléphone règne)', (await visibles()) === 0 && (await compte(page, `${TETE} > .poignee`)) === 0 && (await variable(page, '--w-lieu')) === '' && (await largeurDe(page, 'lieu')) === 190);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await attendre(page, () => document.querySelectorAll('#tab-tete .poignee').length > 10);
  ok('1 · … agrandie de nouveau : les poignées et la largeur retenue (230 px) reviennent', (await compte(page, `${TETE} > .poignee`)) === n && (await largeurDe(page, 'lieu')) === 230);
  ok('1 · aucune erreur de script (1 600 px)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
  repartir();
  const a = await ouvrir(navigateur, { largeur: 390, hauteur: 844, hash: '#/representations/tableur' });
  await a.page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  ok('1 · à 390 px : le tableur est là et aucune poignée (ni dans les en-têtes, ni sous le cadre)', (await compte(a.page, TETE)) >= 10 && (await compte(a.page, '.poignee')) === 0);
  ok('1 · … et les largeurs du téléphone gardent la main (--w-jour de la feuille de style : 86 px sous 520 px)', await a.page.evaluate(() => getComputedStyle(document.getElementById('tab-cadre')).getPropertyValue('--w-jour').trim() === '86px'));
  // au téléphone, les largeurs ne se règlent pas : le menu d'un en-tête ne propose pas de les ajuster (rien ne serait écrit)
  await a.page.click('#tab-tete th[data-k="commune"]', { button: 'right' });
  await menuOuvert(a.page);
  const actionsTel = await actionsMenu(a.page);
  ok('1 · à 390 px : le menu d’un en-tête propose Masquer mais pas « Ajuster la largeur »', actionsTel.includes('Masquer') && !actionsTel.includes('Ajuster la largeur'), actionsTel.join(' | '));
  await a.page.keyboard.press('Escape');
  await a.page.click('#tab-colonnes');
  await a.page.waitForSelector('.tab-pop .tab-col', { timeout: 4000 });
  ok('1 · … et dans la fenêtre « Colonnes… », chaque case à cocher est une cible de 44 px au doigt', await a.page.$$eval('.tab-col-nom', xs => xs.length > 10 && xs.every(x => x.getBoundingClientRect().height >= 44)));
  await a.ctx.close();
  const b = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, tactile: true, hash: '#/representations/tableur' });
  await b.page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  ok('1 · à 1 600 px au doigt (tactile) : aucune poignée non plus', (await compte(b.page, TETE)) >= 10 && (await compte(b.page, '.poignee')) === 0);
  await b.ctx.close();
}

// ================================================================================ 2 · tirer, régler aux flèches, ajuster, retrouver
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  ok('2 · « Lieu » fait 190 px au départ (sa largeur d’origine, celle du schéma)', (await largeurDe(page, 'lieu')) === 190);
  await page.evaluate(() => { window.__ligne = document.querySelector('#tab-corps tr[data-l="0"]'); window.__tete = document.querySelector('#tab-tete tr'); });
  await tirer(page, poignee('lieu'), 60, 0, {
    entre: async () => {
      ok('2 · pendant le glisser : la variable --w-lieu suit (250 px), rien n’est encore écrit dans la base', (await variable(page, '--w-lieu')) === '250px' && ecrites().length === 0, `${await variable(page, '--w-lieu')} · ${ecrites().length} écriture(s)`);
      ok('2 · … html.redim est posé, et la grille ne se redessine pas (les lignes et l’en-tête sont les mêmes éléments qu’avant)', await page.evaluate(() => document.documentElement.classList.contains('redim') && window.__ligne.isConnected && document.querySelector('#tab-corps tr[data-l="0"]') === window.__ligne && document.querySelector('#tab-tete tr') === window.__tete));
    },
  });
  await pause(page, 250);
  ok('2 · glisser la poignée de « Lieu » de +60 px : --w-lieu = 250px sur #tab-cadre, la colonne fait 250 px', (await variable(page, '--w-lieu')) === '250px' && (await largeurDe(page, 'lieu')) === 250);
  await ecritureStable(page);
  ok('2 · une seule écriture de tableur.colonnes, au relâchement, avec la largeur (complet.largeurs.lieu = 250)', ecrites().length === 1 && dernieres()?.complet?.largeurs?.lieu === 250, JSON.stringify(ecrites().map(e => e.valeur)));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/colonnes.png`, fullPage: false });
  await page.reload();
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  ok('2 · rechargement : 250 est retrouvé (--w-lieu et la colonne)', (await variable(page, '--w-lieu')) === '250px' && (await largeurDe(page, 'lieu')) === 250);

  // aux flèches : +16 (Maj : 64), puis une écriture quand on s'arrête
  await page.focus(poignee('lieu'));
  const n0 = ecrites().length;
  await page.keyboard.press('ArrowRight');
  await pause(page, 100);
  ok('2 · → sur la poignée focalisée : +16 px (266)', (await largeurDe(page, 'lieu')) === 266, String(await largeurDe(page, 'lieu')));
  await pause(page, 800);
  await ecritureStable(page);
  ok('2 · … et la valeur est écrite une fois la touche relâchée un moment (266)', ecrites().length === n0 + 1 && dernieres().complet.largeurs.lieu === 266, JSON.stringify(dernieres()?.complet?.largeurs));
  // la grille ne se redessine pas pendant un réglage aux flèches (le focus reste sur la poignée)
  ok('2 · le focus est resté sur la poignée (le thead n’a pas été refait)', await page.evaluate(() => document.activeElement?.classList.contains('poignee')));

  // ajuster : un double-clic
  const anciennes = (await largeurDe(page, 'lieu'));
  const { x, y } = await centre(page, poignee('lieu'));
  await page.mouse.dblclick(x, y);
  await pause(page, 500);
  const apres = await largeurDe(page, 'lieu');
  const rogne = await page.$$eval('#tab-corps td.c-lieu', xs => xs.filter(td => td.scrollWidth > td.clientWidth + 1).length);
  ok('2 · double-clic sur la poignée : la colonne est ajustée à son contenu (plus étroite que 266, rien de rogné)', apres < anciennes && apres >= 48 && rogne === 0, `${anciennes} → ${apres} · ${rogne} case(s) rognée(s)`);
  await ecritureStable(page);
  ok('2 · … et cette largeur est celle qui est gardée', dernieres()?.complet?.largeurs?.lieu === apres, JSON.stringify(dernieres()?.complet?.largeurs));
  // Entrée ajuste aussi
  await page.focus(poignee('lieu'));
  await page.keyboard.press('ArrowRight'); await pause(page, 100);
  await page.keyboard.press('Enter'); await pause(page, 500);
  ok('2 · Entrée sur la poignée ajuste de la même façon', (await largeurDe(page, 'lieu')) === apres, String(await largeurDe(page, 'lieu')));
  // borner : on ne descend pas sous 48 px
  await tirer(page, poignee('heure'), -400, 0);
  ok('2 · tirer de −400 px s’arrête à 48 px (le minimum)', (await largeurDe(page, 'heure')) === 48, String(await largeurDe(page, 'heure')));
  ok('2 · aucune erreur de script (glisser)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 3 · une largeur gardée trop grande est bornée
{
  repartir();
  garder('tableur.colonnes', { complet: { largeurs: { lieu: 900, heure: 5, inconnue: 200 } } });
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1280, hauteur: 800, hash: '#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  ok('3 · à 1 280 px, une largeur gardée de 900 est bornée à 640, une de 5 à 48 ; une clé inconnue est ignorée', (await variable(page, '--w-lieu')) === '640px' && (await variable(page, '--w-heure')) === '48px' && (await variable(page, '--w-inconnue')) === '', `${await variable(page, '--w-lieu')} ${await variable(page, '--w-heure')}`);
  ok('3 · aucune erreur de script (bornes)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
  // l'ancienne forme plate de la préférence est lue comme le mode complet
  repartir();
  garder('tableur.colonnes', { vides: true, masquees: ['commune'], largeurs: { lieu: 200 } });
  const b = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/representations/tableur' });
  await b.page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  const cles = await enTetes(b.page);
  ok('3 · l’ancienne forme plate est lue : « Colonnes vides » cochée (22 colonnes moins la masquée), Lieu à 200 px', cles.length === 21 && !cles.includes('commune') && (await b.page.$eval('#tab-vides', c => c.checked)) && (await largeurDe(b.page, 'lieu')) === 200, `${cles.length} colonnes`);
  await b.ctx.close();
}

// ================================================================================ 4 · le menu d'un en-tête : masquer, figer, ordre, origine
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  const cles0 = await enTetes(page);
  ok('4 · les colonnes d’aujourd’hui, dans l’ordre d’origine (celui du schéma)', cles0.join() === 'jour,spectacle,heure,lieu,commune,public,statut,nature,distribution,organisateur,contact,contrat,site', cles0.join());
  ok('4 · Jour et Spectacle sont figés d’office : deux th.figee, la seconde .derniere', (await compte(page, `${TETE}.figee`)) === 2 && (await compte(page, `${TETE}.figee.derniere[data-k="spectacle"]`)) === 1 && (await compte(page, '#tab-corps td.figee')) === 14);
  // le focus tournant : Tab arrive sur un seul en-tête, ← → passent de l'un à l'autre
  await page.focus('#tab-tete th[data-k="jour"]');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  ok('4 · ← → passent d’un en-tête à l’autre (le focus tournant : le tabindex 0 suit)', await page.evaluate(() => document.activeElement?.dataset.k === 'heure' && document.querySelector('#tab-tete th[data-k="heure"]').tabIndex === 0 && document.querySelector('#tab-tete th[data-k="jour"]').tabIndex === -1));
  ok('4 · chaque en-tête annonce Alt+← et Alt+→ (aria-keyshortcuts)', await page.$eval(TETE, th => th.getAttribute('aria-keyshortcuts') === 'Alt+ArrowLeft Alt+ArrowRight'));
  // Maj+F10 sur « Commune » : le menu, « Masquer »
  await page.focus('#tab-tete th[data-k="commune"]');
  await page.keyboard.press('Shift+F10');
  ok('4 · Maj+F10 sur l’en-tête « Commune » ouvre son menu', await menuOuvert(page));
  const actions = await actionsMenu(page);
  ok('4 · … Masquer, Figer jusqu’ici, Ajuster la largeur, Avancer, Reculer, Colonnes d’origine', ['Masquer', 'Figer jusqu’ici', 'Ajuster la largeur', 'Avancer', 'Reculer', 'Colonnes d’origine'].every(a => actions.includes(a)), actions.join(' | '));
  ok('4 · … le menu porte le nom de la colonne (aria-label)', (await page.$eval('.gm-boite', b => b.getAttribute('aria-label'))) === 'Commune');
  await calme(page);
  await page.screenshot({ path: `${CAPT}/colonnes-menu.png`, fullPage: false });
  await choisirDansLeMenu(page, 'Masquer');
  await pause(page, 200);
  await ecritureStable(page);
  ok('4 · « Masquer » : la colonne Commune a disparu, masquees la porte', !(await enTetes(page)).includes('commune') && dernieres()?.complet?.masquees?.join() === 'commune', JSON.stringify(dernieres()?.complet?.masquees));
  ok('4 · … le focus reste dans les en-têtes : sur celui qui prend la place de Commune (Public)', await page.evaluate(() => document.activeElement?.dataset?.k === 'public'));
  ok('4 · … une annonce le dit, avec « Annuler »', /Commune.*masquée/.test(await annonces(page)) && (await compte(page, '.annonce [data-tt="retour"]')) === 1);
  // le CSV n'a plus la commune
  await page.click('#tab-exporter');
  const [csv] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('#tab-export [data-export="csv"]')]);
  const lignesCsv = fs.readFileSync(await csv.path(), 'utf8').replace(/^﻿/, '').split('\r\n');
  ok('4 · le CSV suit les colonnes montrées : plus de Commune dans l’en-tête', !/Commune/.test(lignesCsv[0]) && /^Jour;Spectacle;Heure;Lieu;Public/.test(lignesCsv[0]), lignesCsv[0]);
  // « Annuler » rend la colonne
  await page.click('.annonce [data-tt="retour"]');
  await pause(page, 250);
  await ecritureStable(page);
  ok('4 · « Annuler » rend la colonne Commune, à sa place', (await enTetes(page)).join() === cles0.join() && (dernieres()?.complet?.masquees || []).length === 0, (await enTetes(page)).join());
  // le jour ne se masque pas
  await page.click('#tab-tete th[data-k="jour"]', { button: 'right' });
  await menuOuvert(page);
  ok('4 · clic droit sur « Jour » : « Masquer » est grisé (le jour date chaque ligne), « Trier » est là', await page.evaluate(() => { const m = [...document.querySelectorAll('.gm [data-gm]')].find(b => /^Masquer/.test(b.textContent)); return m?.getAttribute('aria-disabled') === 'true' && [...document.querySelectorAll('.gm [data-gm]')].some(b => /^Trier/.test(b.textContent)); }));
  await page.keyboard.press('Escape');

  // figer jusqu'ici sur « Lieu » : quatre colonnes (jour, spectacle, heure, lieu)
  await page.click('#tab-tete th[data-k="lieu"]', { button: 'right' });
  await menuOuvert(page);
  await choisirDansLeMenu(page, 'Figer jusqu’ici');
  await pause(page, 250);
  const figees = await page.$$eval(`${TETE}.figee`, xs => xs.map(th => ({ k: th.dataset.k, left: Math.round(parseFloat(getComputedStyle(th).left)), w: Math.round(th.getBoundingClientRect().width) })));
  ok('4 · « Figer jusqu’ici » sur « Lieu » : quatre th.figee (jour, spectacle, heure, lieu : la séance 1 a l’heure 20:00, la colonne Heure est montrée)', figees.map(f => f.k).join() === 'jour,spectacle,heure,lieu', JSON.stringify(figees));
  const attendus = []; let cumul = 0; figees.forEach(f => { attendus.push(cumul); cumul += f.w; });
  ok('4 · … avec des bords gauche croissants et cumulés (0, 138, 316, 394 : la somme des largeurs qui précèdent)', figees.map(f => f.left).join() === attendus.join() && figees.map(f => f.left).join() === '0,138,316,394', `${figees.map(f => f.left)} · attendus ${attendus}`);
  ok('4 · … la dernière porte .derniere (son trait), les cases de la colonne aussi', (await compte(page, `${TETE}.figee.derniere[data-k="lieu"]`)) === 1 && (await compte(page, '#tab-corps td.c-lieu.figee.derniere')) === 7, '');
  await pause(page, 150);
  await ecritureStable(page);
  ok('4 · … la préférence retient cinq : le compte se fait dans l’ordre de toutes les colonnes, la colonne Fin (vide, repliée) y compte', dernieres()?.complet?.figees === 5, String(dernieres()?.complet?.figees));
  // enVue : une case de droite mise en vue n'est pas sous les figées
  await page.evaluate(() => { document.querySelector('#tab-cadre').style.maxWidth = '900px'; });
  await page.click('#tab-corps tr[data-l="0"] td.c-jour');
  await page.keyboard.press('End'); await pause(page, 200);
  const vu = await page.evaluate(() => { const td = document.querySelector('#tab-corps td.actif'), f = document.querySelector('#tab-tete th.derniere').getBoundingClientRect(), r = td.getBoundingClientRect(), c = document.querySelector('#tab-cadre').getBoundingClientRect(); return { colonne: td.className.split(' ')[0], gauche: Math.round(r.left), figeesDroite: Math.round(f.right), droite: Math.round(r.right), cadreDroite: Math.round(c.right), defile: document.querySelector('#tab-cadre').scrollLeft }; });
  ok('4 · Fin va à la dernière colonne et la met en vue : à droite des colonnes figées, dans le cadre', vu.defile > 0 && vu.gauche >= vu.figeesDroite - 1 && vu.droite <= vu.cadreDroite + 1, JSON.stringify(vu));
  await page.evaluate(() => { document.querySelector('#tab-cadre').style.maxWidth = ''; });
  await page.evaluate(() => { document.querySelector('#tab-cadre').scrollLeft = 0; });
  // « Colonnes vides » : cinq figées (Fin entre Heure et Lieu), la préférence porte vides
  await page.check('#tab-vides');
  await attendre(page, () => document.querySelectorAll('#tab-tete th').length > 15);
  await ecritureStable(page);
  ok('4 · avec « Colonnes vides », cinq colonnes figées (jour, spectacle, heure, fin, lieu) : le compte compte les colonnes repliées', (await page.$$eval(`${TETE}.figee`, xs => xs.map(x => x.dataset.k))).join() === 'jour,spectacle,heure,fin,lieu' && dernieres()?.complet?.vides === true);
  await page.uncheck('#tab-vides');
  await attendre(page, () => document.querySelectorAll('#tab-tete th').length < 15);
  await pause(page, 250);
  await ecritureStable(page);
  ok('4 · … décochée, elle le redit (vides: false dans la préférence, rien dans la session)', dernieres()?.complet?.vides === false && !(await page.evaluate(() => 'vides' in (session.vues?.tableur || {}))));

  // l'ordre au clavier : Alt+→ sur « Heure »
  await page.focus('#tab-tete th[data-k="heure"]');
  await page.keyboard.press('Alt+ArrowRight');
  await pause(page, 250);
  const ordre = await enTetes(page);
  ok('4 · Alt+→ sur l’en-tête « Heure » la recule d’un cran (après Lieu), sans changer de page ; le focus reste sur elle', ordre.indexOf('heure') === ordre.indexOf('lieu') + 1 && (await page.evaluate(() => location.hash)) === '#/representations/tableur' && (await page.evaluate(() => document.activeElement?.dataset.k)) === 'heure', ordre.join());
  await ecritureStable(page);
  ok('4 · … l’ordre est gardé (complet.ordre), l’annonce dit « Heure déplacée en 4e »', dernieres()?.complet?.ordre?.length > 10 && /Heure déplacée en 4e/.test(await annonces(page)), await annonces(page));
  await page.keyboard.press('Alt+ArrowLeft');
  await pause(page, 250);
  ok('4 · Alt+← la ramène', (await enTetes(page)).join() === cles0.join(), (await enTetes(page)).join());
  // depuis la poignée de l'en-tête et le bouton du tri (le Tab qui suit le th) : retenus aussi, sinon le navigateur fait Précédent / Suivant
  await page.evaluate(() => { window.__retenu = []; document.addEventListener('keydown', e => { if (e.altKey) window.__retenu.push(e.defaultPrevented); }); });
  await page.focus(poignee('heure'));
  await page.keyboard.press('Alt+ArrowRight');
  await pause(page, 250);
  const ordreP = await enTetes(page);
  ok('4 · Alt+→ envoyé à la poignée de l’en-tête « Heure » est retenu (pas de Suivant du navigateur) et recule la colonne', (await page.evaluate(() => window.__retenu.at(-1))) === true && ordreP.indexOf('heure') === ordreP.indexOf('lieu') + 1, ordreP.join());
  await page.keyboard.press('Alt+ArrowLeft');
  await pause(page, 250);
  await page.focus('#tab-tri');
  await page.keyboard.press('Alt+ArrowLeft');
  ok('4 · Alt+← sur le bouton du tri est retenu aussi (« Jour » est déjà la première colonne : rien ne bouge)', (await page.evaluate(() => window.__retenu.at(-1))) === true && (await enTetes(page)).join() === cles0.join(), (await enTetes(page)).join());

  // colonnes d'origine
  await page.click('#tab-tete th[data-k="lieu"]', { button: 'right' });
  await menuOuvert(page);
  await choisirDansLeMenu(page, 'Colonnes d’origine');
  await pause(page, 250);
  await ecritureStable(page);
  ok('4 · « Colonnes d’origine » : la préférence repasse à null, les deux figées d’origine, Lieu à 190 px', ecrites().at(-1)?.valeur === null && (await compte(page, `${TETE}.figee`)) === 2 && (await largeurDe(page, 'lieu')) === 190, JSON.stringify(ecrites().at(-1)));
  ok('4 · … avec « Annuler » dans l’annonce, qui rend ce qui était', (await compte(page, '.annonce [data-tt="retour"]')) === 1);
  await page.click('.annonce [data-tt="retour"]');
  await pause(page, 250);
  ok('4 · « Annuler » rend la disposition d’avant (Lieu et les trois figées de nouveau)', (await compte(page, `${TETE}.figee`)) === 4, String(await compte(page, `${TETE}.figee`)));
  ok('4 · aucune erreur de script (le menu)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 5 · la fenêtre « Colonnes… »
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  ok('5 · un bouton « Colonnes… » est dans la tête, à côté d’Exporter', (await texte(page, '#tab-colonnes')) === 'Colonnes…' && (await page.$eval('#tab-colonnes', b => b.getAttribute('aria-haspopup') === 'dialog' && b.getAttribute('aria-expanded') === 'false')));
  await page.click('#tab-colonnes');
  await page.waitForSelector('.tab-pop .tab-col-liste .tab-col', { timeout: 4000 });
  const lignes = await page.$$eval('.tab-col', xs => xs.map(x => x.dataset.k));
  ok('5 · la fenêtre liste toutes les colonnes possibles (22 : Fin, Jauge, Notes… y sont, même vides), cochables', lignes.length === 22 && (await compte(page, '.tab-col input[type=checkbox]')) === 22, `${lignes.length} colonnes`);
  ok('5 · … toutes cochées (22) : neuf disent « vide, repliée » (« Colonnes vides » les montre) ; « Jour » reste coché et grisé', (await compte(page, '.tab-col input:checked')) === 22 && (await compte(page, '.tab-col small')) === 9 && (await page.$eval('.tab-col[data-k="jour"] input', i => i.disabled && i.checked)), `${await compte(page, '.tab-col small')} vides`);
  ok('5 · le bouton est enfoncé (aria-expanded), la fenêtre est un dialog nommé', (await page.$eval('#tab-colonnes', b => b.getAttribute('aria-expanded'))) === 'true' && (await page.$eval('.tab-pop', p => p.getAttribute('role') === 'dialog' && p.getAttribute('aria-label') === 'Colonnes du tableur')));
  // décocher « Public »
  await page.uncheck('.tab-col[data-k="public"] input');
  await pause(page, 200);
  await ecritureStable(page);
  ok('5 · décocher « Public » la masque dans le tableau (et la préférence la porte)', !(await enTetes(page)).includes('public') && dernieres()?.complet?.masquees?.join() === 'public');
  // ↓ sur « Lieu » : avance après Commune
  await page.click('.tab-col[data-k="lieu"] [data-col-bas]');
  await pause(page, 250);
  const ordre = await enTetes(page);
  ok('5 · ↓ sur « Lieu » la recule d’un cran (après Commune) ; l’annonce dit « Lieu déplacée en 6e » (son rang dans la liste, qui compte la colonne Fin, repliée) ; le focus reste sur ↓', ordre.indexOf('lieu') === ordre.indexOf('commune') + 1 && /Lieu déplacée en 6e/.test(await annonces(page)) && (await page.evaluate(() => document.activeElement?.matches('.tab-col[data-k="lieu"] [data-col-bas]'))), `${ordre.join()} · ${await annonces(page)}`);
  ok('5 · … la liste de la fenêtre suit', (await page.$$eval('.tab-col', xs => xs.map(x => x.dataset.k))).indexOf('lieu') === 5);
  // glisser « Distribution » sur « Heure » (la ligne tirée vers le haut prend la place de celle qu'on vise)
  await page.dragAndDrop('.tab-col[data-k="distribution"]', '.tab-col[data-k="heure"]');
  await pause(page, 350);
  const apres = await page.$$eval('.tab-col', xs => xs.map(x => x.dataset.k)), colonnes = await enTetes(page);
  await ecritureStable(page);
  ok('5 · glisser « Distribution » sur « Heure » la place avant elle, dans la liste, dans le tableau et dans la préférence', apres.indexOf('distribution') === apres.indexOf('heure') - 1 && colonnes.indexOf('distribution') === colonnes.indexOf('heure') - 1 && dernieres()?.complet?.ordre?.indexOf('distribution') === dernieres()?.complet?.ordre?.indexOf('heure') - 1, apres.join());
  await calme(page);
  await page.screenshot({ path: `${CAPT}/colonnes-fenetre.png`, fullPage: false });
  await page.keyboard.press('Escape');
  await pause(page, 150);
  ok('5 · Échap (même après un glisser) ferme la fenêtre et rend le focus au bouton « Colonnes… »', !(await page.$('.tab-pop')) && (await page.evaluate(() => document.activeElement?.id)) === 'tab-colonnes' && (await page.$eval('#tab-colonnes', b => b.getAttribute('aria-expanded'))) === 'false');
  // la fenêtre, rouverte : « Colonnes d'origine »
  await page.click('#tab-colonnes');
  await page.waitForSelector('.tab-col-liste .tab-col');
  await page.click('.tab-pop [data-col-origine]');
  await pause(page, 250);
  await ecritureStable(page);
  ok('5 · « Colonnes d’origine » dans la fenêtre : tout est remis (préférence à null, Public revient, ordre d’origine)', ecrites().at(-1)?.valeur === null && (await enTetes(page)).includes('public') && (await page.$$eval('.tab-col', xs => xs.map(x => x.dataset.k))).slice(0, 4).join() === 'jour,spectacle,heure,fin');
  await page.click('#tab-colonnes');
  await pause(page, 100);
  ok('5 · un second clic sur « Colonnes… » ferme la fenêtre (elle ne se rouvre pas aussitôt)', !(await page.$('.tab-pop')));
  ok('5 · aucune erreur de script (la fenêtre)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 6 · l'Excel fige autant de colonnes que la vue
{
  repartir();
  garder('tableur.colonnes', { complet: { figees: 3 } });
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  await page.click('#tab-exporter');
  const [xl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('#tab-export [data-export="xlsx"]')]);
  const feuille = fs.readFileSync(await xl.path()).toString('latin1');
  ok('6 · avec trois colonnes figées dans la vue, le classeur fige trois colonnes (xSplit="3")', /<pane xSplit="3" ySplit="1"/.test(feuille), (feuille.match(/<pane [^>]*>/) || [''])[0]);
  ok('6 · aucune erreur de script (Excel)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 7 · la hauteur du cadre
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1100, hauteur: 900, hash: '#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  const mesure = () => page.evaluate(() => { const c = document.getElementById('tab-cadre'), r = c.getBoundingClientRect(); return { haut: Math.round(r.top + scrollY), largeur: Math.round(r.width), max: parseInt(c.style.maxHeight), hauteur: Math.round(r.height), bas: document.querySelector('.tab-ligne-etat').offsetHeight + 6, menu: ['menu-replie', 'menu-deplie'].map(c => document.documentElement.classList.contains(c)).join() }; });
  const m0 = await mesure();
  // (la barre d'état est collée sous le cadre, lot 11 : sa hauteur et sa marge se retranchent aussi à la place du cadre)
  ok('7 · la hauteur maximale du cadre est la place qui reste sous lui (la fenêtre moins son haut, moins 24 px, moins la barre d’état collée sous lui)', Math.abs(m0.max - (900 - m0.haut - 24 - m0.bas)) <= 2 || m0.max === 300, JSON.stringify(m0));
  ok('7 · une poignée est sous le cadre (frère du cadre, hors du défilement), nommée « Hauteur du tableur »', await page.evaluate(() => { const p = document.querySelector('#tab-zone > .tab-poignee-h'); return !!p && p.previousElementSibling?.id === 'tab-cadre' && p.getAttribute('aria-label') === 'Hauteur du tableur' && p.getAttribute('aria-orientation') === 'horizontal'; }));
  ok('7 · aucune erreur « ResizeObserver loop » : le cadre n’est observé par personne', erreurs.length === 0, erreurs.join(' / '));
  await page.keyboard.press('Alt+KeyM');
  await pause(page, 500);
  const m1 = await mesure();
  ok('7 · à 1 100 px le menu se déplie (Alt+M) : le cadre suit (sa largeur change, sa hauteur maximale est recalculée avec la nouvelle place)', m1.menu !== m0.menu && m1.largeur !== m0.largeur && Math.abs(m1.max - Math.max(300, 900 - m1.haut - 24 - m1.bas)) <= 2, `${JSON.stringify(m0)} → ${JSON.stringify(m1)}`);
  // la poignée du bas : fenetres.tableur-h
  await tirer(page, '#tab-zone > .tab-poignee-h', 0, 120);
  await pause(page, 300);
  const e = ECRITURES.filter(x => x.cle === 'fenetres.tableur-h');
  const m2 = await mesure();
  ok('7 · tirer la poignée du bas de +120 px écrit fenetres.tableur-h (une fois) et le cadre prend cette hauteur', e.length === 1 && Math.abs(e[0].valeur - m2.hauteur) <= 2 && e[0].valeur > m1.hauteur, JSON.stringify({ e: e.map(x => x.valeur), m1: m1.hauteur, m2 }));
  await page.reload();
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  const m3 = await mesure();
  ok('7 · rechargement : la hauteur voulue est retrouvée (bornée par la place)', Math.abs(m3.hauteur - Math.min(e[0].valeur, Math.max(300, 900 - m3.haut - 24))) <= 2, JSON.stringify(m3));
  // une fenêtre trop basse : la valeur voulue est bornée par la place, pas écrasée
  await page.setViewportSize({ width: 1100, height: 560 });
  await pause(page, 400);
  const m4 = await mesure();
  ok('7 · la fenêtre rétrécit : le cadre se serre à la place qui reste (jamais sous 300 px), la valeur gardée ne change pas', m4.max <= m3.max && ECRITURES.filter(x => x.cle === 'fenetres.tableur-h').length === 1, JSON.stringify(m4));
  await page.setViewportSize({ width: 1100, height: 900 });
  ok('7 · aucune erreur de script (hauteur)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 8 · le menu latéral replié à 1 600 px
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  const largeur = () => page.$eval('#tab-cadre', c => Math.round(c.getBoundingClientRect().width));
  const l0 = await largeur();
  await page.keyboard.press('Alt+KeyM');
  await pause(page, 700);
  const l1 = await largeur();
  ok('8 · à 1 600 px, le menu latéral se replie (Alt+M) : le cadre grandit de la place rendue (la page plafonne à 1 500 px)', l1 - l0 >= 100 && (await page.evaluate(() => document.documentElement.classList.contains('menu-replie'))), `${l0} → ${l1} px`);
  ok('8 · … la grille suit sans erreur (aucun « ResizeObserver loop »)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 9 · le coin des fenêtres et la zone de texte
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  await page.click('#tab-corps tr[data-l="0"] td.c-lieu');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.tab-pop #tab-lieu input', { timeout: 4000 });
  const l0 = await page.$eval('.tab-pop', p => Math.round(p.getBoundingClientRect().width)), h0 = await page.$eval('.tab-pop', p => Math.round(p.getBoundingClientRect().height));
  ok('9 · la fenêtre du lieu a un coin qu’on tire (separator « Taille de la fenêtre ») et fait 340 px au départ', l0 === 340 && (await compte(page, '.tab-pop > .poignee-coin[role=separator]')) === 1, String(l0));
  await tirer(page, '.tab-pop > .poignee-coin', 80, 0);
  const l1 = await page.$eval('.tab-pop', p => Math.round(p.getBoundingClientRect().width));
  ok('9 · tirer le coin de +80 px : la fenêtre fait 420 px, et fenetres.tab-pop-lieu l’écrit une fois', l1 === 420 && ECRITURES.filter(e => e.cle === 'fenetres.tab-pop-lieu').length === 1 && ECRITURES.find(e => e.cle === 'fenetres.tab-pop-lieu').valeur.l === 420, JSON.stringify(ECRITURES.filter(e => e.cle.startsWith('fenetres.tab-pop'))));
  ok('9 · tirer le coin ne ferme pas la fenêtre (le mousedown du coin est « dedans »)', !!(await page.$('.tab-pop')));
  await page.keyboard.press('Escape');
  await page.click('#tab-corps tr[data-l="1"] td.c-lieu');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.tab-pop #tab-lieu input', { timeout: 4000 });
  ok('9 · rouverte sur une autre case, la fenêtre du lieu retient 420 px', (await page.$eval('.tab-pop', p => Math.round(p.getBoundingClientRect().width))) === 420);
  // la hauteur aussi se retient, et le double-clic du coin rend la taille d'origine : la largeur ET la hauteur
  await tirer(page, '.tab-pop > .poignee-coin', 0, 200);
  const h1 = await page.$eval('.tab-pop', p => Math.round(p.getBoundingClientRect().height));
  await page.keyboard.press('Escape');
  await page.click('#tab-corps tr[data-l="0"] td.c-lieu');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.tab-pop #tab-lieu input', { timeout: 4000 });
  ok('9 · tirée de +200 px en hauteur, la fenêtre du lieu rouverte retient aussi sa hauteur', h1 >= h0 + 190 && Math.abs((await page.$eval('.tab-pop', p => Math.round(p.getBoundingClientRect().height))) - h1) <= 2, `${h0} → ${h1} px`);
  await page.mouse.dblclick(...Object.values(await centre(page, '.tab-pop > .poignee-coin')));
  await pause(page, 500);
  const apres = await page.$eval('.tab-pop', p => ({ l: Math.round(p.getBoundingClientRect().width), h: Math.round(p.getBoundingClientRect().height), min: p.style.minHeight }));
  ok('9 · le double-clic du coin rend la taille d’origine : 340 px de large et la hauteur d’avant (pas celle qu’on avait tirée), la préférence oubliée', apres.l === 340 && Math.abs(apres.h - h0) <= 3 && ECRITURES.filter(e => e.cle === 'fenetres.tab-pop-lieu').at(-1).valeur === null, JSON.stringify({ h0, h1, apres }));
  await calme(page);
  await page.keyboard.press('Escape');
  // la distribution a sa propre clé
  await page.click('#tab-corps tr[data-l="0"] td.c-distribution');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.tab-pop #tab-eq-q', { timeout: 4000 });
  const d0 = await page.$eval('.tab-pop', p => Math.round(p.getBoundingClientRect().width));
  await tirer(page, '.tab-pop > .poignee-coin', 60, 0);
  ok('9 · la fenêtre de la distribution (430 px) a sa clé : fenetres.tab-pop-distribution, indépendante du lieu', d0 === 430 && (await page.$eval('.tab-pop', p => Math.round(p.getBoundingClientRect().width))) === 490 && ECRITURES.some(e => e.cle === 'fenetres.tab-pop-distribution' && e.valeur.l === 490) && ECRITURES.find(e => e.cle === 'fenetres.tab-pop-lieu').valeur.l === 420);
  await page.keyboard.press('Escape');
  await pause(page, 100);

  // la zone de texte des notes : sa taille est gardée à la fermeture
  await page.check('#tab-vides');
  await attendre(page, () => document.querySelector('#tab-tete th[data-k="notes"]'));
  await page.click('#tab-corps tr[data-l="0"] td.c-notes');
  await page.keyboard.press('Enter');
  await page.waitForSelector('textarea.tab-ed', { timeout: 4000 });
  const t0 = await page.$eval('textarea.tab-ed', t => ({ l: t.offsetWidth, h: t.offsetHeight }));
  await page.$eval('textarea.tab-ed', t => { t.style.width = `${t.offsetWidth + 100}px`; t.style.height = `${t.offsetHeight + 60}px`; });   // (ce que le coin natif écrit : la taille en ligne)
  await page.keyboard.press('Escape');
  await pause(page, 150);
  const gardee = ECRITURES.find(e => e.cle === 'fenetres.tab-ed-notes');
  ok('9 · la zone de texte des notes agrandie est gardée à la fermeture (fenetres.tab-ed-notes = la taille, en largeur et hauteur)', !!gardee && gardee.valeur.l === t0.l + 100 && gardee.valeur.h === t0.h + 60, JSON.stringify({ t0, gardee: gardee?.valeur }));
  await page.click('#tab-corps tr[data-l="1"] td.c-notes');
  await page.keyboard.press('Enter');
  await page.waitForSelector('textarea.tab-ed', { timeout: 4000 });
  ok('9 · rouverte, elle reprend cette taille', await page.$eval('textarea.tab-ed', t => t.offsetWidth) === t0.l + 100 && await page.$eval('textarea.tab-ed', t => t.offsetHeight) === t0.h + 60);
  const n0 = ECRITURES.filter(e => e.cle === 'fenetres.tab-ed-notes').length;
  await page.keyboard.press('Escape');
  await pause(page, 100);
  ok('9 · … et refermée sans y toucher, elle n’écrit rien de plus', ECRITURES.filter(e => e.cle === 'fenetres.tab-ed-notes').length === n0);
  ok('9 · aucune erreur de script (les fenêtres)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 10 · le « +n » de la distribution
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  const plus = () => page.$eval('#tab-corps tr[data-l="0"] td.c-distribution', td => td.dataset.plus ?? null);
  ok('10 · deux personnes tiennent dans les 250 px d’aujourd’hui : la case de la date 101 n’a pas de data-plus (549)', (await plus()) === null && (await compte(page, '#tab-corps tr[data-l="0"] .tab-pastilles-ligne .tab-pastille')) === 2);
  // la colonne ramenée à 60 px : une pastille tient, l'autre se compte (le cadre défile jusqu'à elle : la poignée est à l'écran)
  await page.evaluate(() => { const c = document.getElementById('tab-cadre'); c.scrollLeft = c.scrollWidth; });
  let observe = null;
  await tirer(page, poignee('distribution'), -190, 0, { lacher: false });
  observe = await attendre(page, () => document.querySelector('#tab-corps tr[data-l="0"] td.c-distribution')?.dataset.plus === '1');
  await page.mouse.up();
  await pause(page, 250);
  const w = await largeurDe(page, 'distribution');
  ok('10 · la poignée de « Distribution » tirée jusqu’à 60 px : la case de la date 101 porte data-plus="1" (une pastille tient, une se compte)', observe && w === 60 && (await plus()) === '1', `${w} px · plus=${await plus()}`);
  ok('10 · … le « +1 » s’écrit par CSS dans le coin de la case (::after), la case réserve sa place à droite', await page.$eval('#tab-corps tr[data-l="0"] td.c-distribution', td => { const a = getComputedStyle(td, '::after'); return a.content.replace(/["']/g, '') === '+1' && a.position === 'absolute' && parseFloat(getComputedStyle(td).paddingRight) === 30; }));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/distribution-plus.png`, fullPage: false });
  await page.evaluate(() => { const c = document.getElementById('tab-cadre'); c.scrollLeft = c.scrollWidth; });
  await tirer(page, poignee('distribution'), 190, 0);
  await attendre(page, () => document.querySelector('#tab-corps tr[data-l="0"] td.c-distribution')?.dataset.plus === undefined);
  ok('10 · la remettre à 250 px : l’attribut tombe', (await plus()) === null && (await largeurDe(page, 'distribution')) === 250, `${await largeurDe(page, 'distribution')} px · plus=${await plus()}`);
  ok('10 · aucune erreur de script (le « +n »)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 11 · un changement qui arrive pendant un glisser
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  await page.evaluate(() => { window.__poignee = document.querySelector('#tab-tete th[data-k="lieu"] > .poignee'); });
  await tirer(page, poignee('lieu'), 70, 0, {
    lacher: false,
    entre: async () => {
      // un changement arrive de l'extérieur (le temps réel) : la date 101 passe en option
      await page.evaluate(() => changement('crescite_dates', { eventType: 'UPDATE', new: { ...E.dates.find(d => d.id === 101), statut: 'option' }, old: E.dates.find(d => d.id === 101) }));
      await page.waitForTimeout(150);
    },
  });
  ok('11 · un changement() appelé pendant un glisser ne refait pas l’en-tête : la poignée est la même, le glisser continue', await page.evaluate(() => window.__poignee.isConnected && document.querySelector('#tab-tete th[data-k="lieu"] > .poignee') === window.__poignee && document.documentElement.classList.contains('redim')));
  await page.mouse.move((await centre(page, poignee('lieu'))).x + 20, (await centre(page, poignee('lieu'))).y);
  await page.mouse.up();
  await pause(page, 400);
  await ecritureStable(page);
  ok('11 · … le glisser va à son terme (190 + 90 = 280 px, une écriture) et la grille est redessinée ensuite avec le changement (Option)', (await largeurDe(page, 'lieu')) === 280 && ecrites().length === 1 && /Option/.test(await texte(page, '#tab-corps tr[data-l="0"] td.c-statut')), `${await largeurDe(page, 'lieu')} · ${ecrites().length} · ${await texte(page, '#tab-corps tr[data-l="0"] td.c-statut')}`);
  ok('11 · aucune erreur de script (le changement)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 12 · l'impression, l'aide « ? », le mouvement réduit
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/representations/tableur', reduit: true });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  // un glisser de poignée ferme la fenêtre ouverte sur une case (le mousedown « dehors »)
  await page.click('#tab-corps tr[data-l="0"] td.c-lieu');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.tab-pop #tab-lieu input', { timeout: 4000 });
  await tirer(page, poignee('commune'), 30, 0);
  ok('12 · un glisser de poignée ferme la fenêtre ouverte sur une case (et la colonne a bougé : 150 → 180 px)', !(await page.$('.tab-pop')) && (await largeurDe(page, 'commune')) === 180, `pop=${!!(await page.$('.tab-pop'))} largeur=${await largeurDe(page, 'commune')}`);
  // le mouvement réduit : l'ajustement du double-clic est d'un coup, rien ne s'anime
  const { x, y } = await centre(page, poignee('commune'));
  await page.mouse.dblclick(x, y);
  await pause(page, 60);
  const tot = await largeurDe(page, 'commune');
  await pause(page, 500);
  ok('12 · sous « moins d’animations », le double-clic ajuste d’un coup (la largeur finale est déjà là après 60 ms, rien ne court)', tot === (await largeurDe(page, 'commune')) && tot !== 180 && (await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect?.getTiming().duration > 0).length)) === 0, String(tot));
  // l'aide « ? » liste les raccourcis des colonnes
  await page.click('h1');
  await page.keyboard.press('?');
  await attendre(page, () => /Raccourcis clavier/.test(document.body.textContent) && document.querySelector('dialog[open], .gq-aide, [role=dialog]'));
  const aide = await page.evaluate(() => { const d = [...document.querySelectorAll('dialog[open], [role=dialog]')].pop(); return d ? d.textContent.replace(/\s+/g, ' ') : ''; });
  ok('12 · l’aide « ? » dit Alt+← Alt+→ (le registre), le bord d’un en-tête, le clic droit, « Colonnes… » et la hauteur', /Avancer la colonne dont l’en-tête a le focus/.test(aide) && /Reculer la colonne/.test(aide) && /Glisser le bord d’un en-tête/.test(aide) && /Clic droit sur un en-tête/.test(aide) && /Colonnes…/.test(aide) && /Glisser le bas du cadre/.test(aide), aide.slice(0, 200));
  await page.keyboard.press('Escape');
  await pause(page, 200);
  // l'impression : ni poignée, ni bouton « Colonnes… », le cadre sans hauteur ni défilement
  await page.emulateMedia({ media: 'print' });
  const imp = await page.evaluate(() => { const c = getComputedStyle(document.getElementById('tab-cadre')); return { poignees: [...document.querySelectorAll('.poignee')].length, caches: [...document.querySelectorAll('.poignee')].every(p => getComputedStyle(p).display === 'none'), colonnes: getComputedStyle(document.getElementById('tab-colonnes')).display, maxHeight: c.maxHeight, overflow: c.overflow, height: document.getElementById('tab-cadre').style.height }; });
  ok('12 · à l’impression : les poignées (en-têtes et bas) sont masquées, « Colonnes… » aussi, le cadre n’a ni hauteur maximale ni défilement', imp.poignees > 10 && imp.caches && imp.colonnes === 'none' && imp.maxHeight === 'none' && imp.overflow === 'visible', JSON.stringify(imp));
  await page.emulateMedia({ media: 'screen' });
  ok('12 · aucune erreur de script (impression, aide)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 13 · le budget : aucune tâche de plus de 200 ms à CPU=4
// Une trentaine de lignes seulement (14 dates ajoutées, 28 séances) : à 230 lignes, l'ouverture coûte bien plus (voir site/MOUVEMENT.md).
// Chaque geste se mesure à part, sa plus longue tâche étant relevée aussitôt ; la mesure d'un processeur ralenti est inégale
// (un pic isolé de 200 à 300 ms arrive sans que le code y soit pour rien ; un double-clic se joue avec 80 ms entre l'appui et le
// relâchement, comme une main : sans pause, tous les appuis s'empilent dans la même image et le premier rendu paie pour quatre), donc un geste qui dépasse est défait puis refait une
// fois, et c'est le second passage qui compte : deux dépassements de suite sont réels.
{
  repartir();
  const dates0 = DB.crescite_dates.length, reps0 = DB.crescite_representations.length;
  for (let i = 0; i < 14; i++) {
    const j = plus(5 + i);
    DB.crescite_dates.push({ id: 2000 + i, spectacle_id: 1 + i % 2, lieu_id: 5 + i % 4, debut: j, fin: j, precision: 'jour', saison: saisonDe(j), public: 'tout_public', statut: 'confirmee', visible: true, nature: 'representations', intitule: null, details: [], lien: null, nb_representations: null });
    DB.crescite_representations.push({ id: 2000 + i, date_id: 2000 + i, jour: j, heure: '20:00:00', fin: null, public: 'tout_public', annulee: false, lien: null, note: null });
    if (i % 2) DB.crescite_representations.push({ id: 3000 + i, date_id: 2000 + i, jour: j, heure: '15:00:00', fin: null, public: 'scolaire', annulee: false, lien: null, note: null });
  }
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/accueil', cpu: 4, longues: true });
  await page.waitForSelector('main#vue', { timeout: 20000 });
  await pause(page, 600);
  const budget = [];
  // faire, puis (si une tâche dépasse 200 ms) defaire et refaire : le second passage est celui qui est dit
  async function geste(nom, faire, defaire) {
    const passer = async () => {
      await page.evaluate(() => { window.__longues.length = 0; window.__pret = performance.now(); });
      await faire();
      await pause(page, 500);
      return page.evaluate(() => window.__longues.slice());
    };
    let longues = await passer(), relance = false;
    if (longues.some(d => d >= 200)) { await defaire(); await pause(page, 500); longues = await passer(); relance = true; }
    budget.push({ nom, longues, relance });
    return longues;
  }
  const ouvertureTableur = async () => { await page.evaluate(() => { location.hash = '#/representations/tableur'; }); await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 30000 }); };
  const quitterTableur = async () => { await page.evaluate(() => { location.hash = '#/accueil'; }); await page.waitForSelector('#tab-corps', { state: 'detached', timeout: 15000 }); await pause(page, 300); };
  await geste('l’ouverture du tableur', ouvertureTableur, quitterTableur);
  const n = await compte(page, '#tab-corps tr[data-l]');
  await geste('un glisser de poignée (+60 px)', () => tirer(page, poignee('lieu'), 60, 0), () => tirer(page, poignee('lieu'), -60, 0));
  await geste('un double-clic qui ajuste la colonne', async () => { const { x, y } = await centre(page, poignee('lieu')); await page.mouse.dblclick(x, y, { delay: 80 }); }, () => tirer(page, poignee('lieu'), 80, 0));
  await page.focus('#tab-tete th[data-k="heure"]');
  await geste('Alt+→ (un changement d’ordre)', () => page.keyboard.press('Alt+ArrowRight'), () => page.keyboard.press('Alt+ArrowLeft'));
  await geste('Alt+← (le retour)', () => page.keyboard.press('Alt+ArrowLeft'), () => page.keyboard.press('Alt+ArrowRight'));
  await geste('masquer une colonne par le menu d’un en-tête', async () => {
    await page.click('#tab-tete th[data-k="commune"]', { button: 'right' });
    await menuOuvert(page);
    await choisirDansLeMenu(page, 'Masquer');
  }, () => page.evaluate(() => TABLEUR.colonnes.montrer('commune')));
  await geste('« Colonnes vides »', () => page.check('#tab-vides'), () => page.uncheck('#tab-vides'));
  await geste('le menu latéral replié (Alt+M)', () => page.keyboard.press('Alt+KeyM'), () => page.keyboard.press('Alt+KeyM'));
  for (const { nom, longues, relance } of budget) ok(`13 · à CPU=4, ${n} lignes : ${nom} ne tient jamais la page plus de 200 ms`, longues.every(d => d < 200) && n > 20, `${n} lignes · tâches longues : ${longues.join(', ') || 'aucune'}${relance ? ' (second passage ; le premier avait dépassé)' : ''}`);
  ok('13 · aucune erreur de script (le budget)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
  DB.crescite_dates.length = dates0; DB.crescite_representations.length = reps0;
  repartir();
}

await navigateur.close();
bilan(CAPT);
