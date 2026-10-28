// Le cadre de l'administration (admin/index.html : poserCoque, cadre ; admin/cadre.js : CADRE), vérifié dans Chromium, hors
// ligne, sur la base fictive commune (admin-fictif.mjs).
//   node site/cadre.mjs
// Ce que le banc regarde : l'en-tête sur une ligne et le menu latéral déplié à 1 440 px (douze rubriques, la courante marquée,
// l'aside collé sous l'en-tête au défilement, les annonces centrées sur le contenu) ; replié d'office à 1 280 px sans rien
// écrire, et déplié exprès pour l'onglet seulement ; le repli à 1 440 px (la colonne qui s'anime, la clé menu.replie écrite,
// le miroir de l'appareil, l'état retrouvé dès le premier dessin) ; sans le script SQL 6 ; sous « moins d'animations » ;
// l'état des rubriques qui suit la navigation, la Diffusion qui paraît à chaud ; la coque construite une seule fois, et de
// nouveau après un écran hors cadre ; le téléphone qui n'a pas bougé ; l'impression (la vue seule) ; l'ordre du clavier ;
// les raccourcis (Alt+M, au Mac comme au clavier français ; « G puis une lettre » pour les douze rubriques, le témoin « G… »,
// ce qui les fait dormir : un champ, une grille, une boîte ; la file J / K qui ne bouge pas ; l'aide « ? » qui les liste) ; les
// badges (le compte du tableau de bord, des devis, des notes de frais ; dits aux lecteurs d'écran, en point une fois replié ;
// le mémo de 30 s, le calcul différé, un changement en direct, une ligne reportée, des catégories imposées ; le budget de
// 200 ms à CPU=4).
// Les captures vont dans site/dist/shots-cadre/. Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, UID, DB, ECRITURES, ok, ouvrir, texte, compte, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-cadre');
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
const repartir = () => { DB.crescite_preferences = []; ECRITURES.length = 0; };
const ecritesMenu = () => ECRITURES.filter(e => e.cle === 'menu.replie');
// ce qu'on lit dans la feuille de style, à l'instant (les classes de <html>, la largeur déclarée, celle de l'aside)
const etat = page => page.evaluate(() => { const a = document.querySelector('#menu'); return { classes: document.documentElement.className, large: getComputedStyle(document.documentElement).getPropertyValue('--large-menu').trim(), aside: a ? Math.round(a.getBoundingClientRect().width) : null }; });
// la fin de la transition de la colonne (--large-menu), puis combien il y en avait : zéro si rien ne s'est animé
const finTransition = page => page.evaluate(async () => { const xs = document.getAnimations().filter(a => a.transitionProperty === '--large-menu'); await Promise.all(xs.map(a => a.finished.catch(() => {}))); return xs.length; });
// l'état de <html> et de l'aside à l'instant où main#vue entre dans la page (avant le premier dessin de la vue)
const sondeVue = `window.__avant = null; new MutationObserver((_, o) => { if (document.querySelector('#vue')) { const a = document.querySelector('#menu'); window.__avant = { classes: document.documentElement.className, affichage: a ? getComputedStyle(a).display : null }; o.disconnect(); } }).observe(document, { childList: true, subtree: true });`;
// la lettre qui suit « G » pour chaque rubrique
const TOUCHES = { accueil: 'T', representations: 'D', planning: 'P', feuilles: 'F', spectacles: 'S', equipe: 'E', diffusion: 'C', pro: 'O', ateliers: 'A', lieux: 'L', textes: 'X', journal: 'J' };
const attendre = (page, fn, arg = null, ms = 6000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);

// ================================================================================ 1 440 px : l'en-tête sur une ligne, le menu déplié
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await page.waitForSelector('#menu .nav a', { timeout: 15000 });
  const t = await page.evaluate(() => {
    const b = document.querySelector('.barre'), liens = [...b.querySelectorAll('.qui a[target="_blank"]')].filter(a => a.getClientRects().length), m = b.querySelector('.marque').getBoundingClientRect(), q = b.querySelector('.qui').getBoundingClientRect();
    return { h: Math.round(b.getBoundingClientRect().height), unelLigne: Math.abs((m.top + m.bottom) / 2 - (q.top + q.bottom) / 2) < 8, sites: liens.map(a => a.textContent.trim().replace(/\s+/g, ' ')), nav: !!b.querySelector('nav'),
      admin: document.documentElement.classList.contains('admin'), role: document.querySelector('#menu').tagName };
  });
  ok('1 440 px · l’en-tête tient sur une ligne (moins de 64 px), les deux liens vers le site y sont, aucune rubrique dedans', t.h < 64 && t.unelLigne && t.sites.length === 2 && /Voir le site/.test(t.sites[0]) && /Modifier/.test(t.sites[1]) && !t.nav, JSON.stringify(t));
  ok('<html> porte la classe « admin » (sous laquelle les modules partagés allument leurs poignées)', t.admin);
  const sr = await page.evaluate(() => { const r = document.getElementById('sr-menu'); return r ? { role: r.getAttribute('role'), texte: r.textContent } : null; });
  ok('la zone polie des annonces du menu (#sr-menu, role="status") est posée vide avec le menu : le premier changement de texte sera annoncé', !!sr && sr.role === 'status' && sr.texte === '', JSON.stringify(sr));
  const e = await etat(page);
  ok('1 440 px · le menu est déplié : 240 px, ni html.menu-replie ni html.menu-deplie, la largeur déclarée est lue par la colonne', e.large === '240px' && e.aside === 240 && !/menu-replie|menu-deplie/.test(e.classes), JSON.stringify(e));
  const m = await page.evaluate(() => { const xs = [...document.querySelectorAll('#menu nav[aria-label="Rubriques"] a')], c = xs.filter(a => a.getAttribute('aria-current') === 'page');
    return { n: xs.length, svg: xs.every(a => a.querySelector('svg.ico')), textes: xs.every(a => a.querySelector('.menu-l')?.textContent.trim()), courantes: c.map(a => a.querySelector('.menu-l').textContent), hauteurs: Math.min(...xs.map(a => a.getBoundingClientRect().height)),
      titres: xs.map(a => a.title), noms: xs.map(a => a.querySelector('.menu-l').textContent), cles: xs.map(a => a.getAttribute('href').slice(2)) }; });
  ok('le menu a douze rubriques, chacune avec une icône et son nom, de 44 px au moins ; « Tableau de bord » est la seule courante', m.n === 12 && m.svg && m.textes && m.hauteurs >= 44 && m.courantes.join() === 'Tableau de bord', JSON.stringify(m));
  ok('chaque rubrique a son nom et sa séquence en infobulle (title) : « Représentations (G puis D) »', m.titres.every((t, i) => t === `${m.noms[i]} (G puis ${TOUCHES[m.cles[i]]})`), m.titres.join(' | '));
  const bouton = await page.evaluate(() => { const b = document.querySelector('#menu .menu-replier'); return { expanded: b.getAttribute('aria-expanded'), controls: b.getAttribute('aria-controls'), nom: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height), reglages: !!document.querySelector('#menu .menu-reglages'), vide: [...document.querySelector('#menu .menu-reglages').children].every(c => /(^|\s)(reg-|fen-reglages)/.test(c.className)),
    bas: Math.round((document.querySelector('#menu .menu-reglages').children.length ? document.querySelector('#menu .menu-reglages').getBoundingClientRect().top : innerHeight) - b.getBoundingClientRect().bottom) }; });   // (le bouton est au pied de la colonne, juste au-dessus des réglages posés sous lui)
  ok('le bouton « Replier » : aria-expanded vrai, aria-controls="menu", 44 px, au pied de la colonne (juste au-dessus des réglages) ; le logement des réglages est là, ses enfants sont des blocs de réglages (.reg-*, .fen-reglages) ; theme.mjs vérifie celui de l’apparence, fenetres.mjs celui des fenêtres', bouton.expanded === 'true' && bouton.controls === 'menu' && bouton.nom === 'Replier' && bouton.h >= 44 && bouton.bas < 24 && bouton.reglages && bouton.vide, JSON.stringify(bouton));
  const ksh = await page.evaluate(() => ({ bouton: document.querySelector('#menu .menu-replier').getAttribute('aria-keyshortcuts'), liens: document.querySelectorAll('#menu .nav a[aria-keyshortcuts]').length }));
  ok('aria-keyshortcuts="Alt+M" sur le seul bouton de repli, et sur aucun lien (une suite de touches n’est pas un raccourci de rechange)', ksh.bouton === 'Alt+M' && ksh.liens === 0, JSON.stringify(ksh));
  ok('l’aside est un repère nommé « Menu », avec la navigation « Rubriques » dedans', await page.$eval('#menu', a => a.tagName === 'ASIDE' && a.getAttribute('aria-label') === 'Menu' && !!a.querySelector('nav[aria-label="Rubriques"]')));
  await page.screenshot({ path: `${CAPT}/menu-deplie.png` });
  await page.screenshot({ path: `${CAPT}/entete-1440.png`, clip: { x: 0, y: 0, width: 1440, height: 90 } });

  // l'aside colle sous l'en-tête
  await page.evaluate(() => { location.hash = '#/representations'; });
  await page.waitForSelector('main#vue h1');
  await page.waitForTimeout(300);
  const colle = await page.evaluate(async () => {
    document.querySelector('main#vue').insertAdjacentHTML('beforeend', '<div id="cale" style="height:2400px"></div>');   // (de quoi défiler, quelle que soit la longueur de la liste)
    window.scrollTo(0, 2000); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const a = document.querySelector('#menu').getBoundingClientRect(), hb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--haut-barre')), br = document.querySelector('.barre').getBoundingClientRect().bottom;
    const r = { defile: window.scrollY, haut: Math.round(a.top), hb, bas: Math.round(a.bottom), fenetre: innerHeight, barre: Math.round(br) };
    document.querySelector('#cale').remove(); window.scrollTo(0, 0);
    return r;
  });
  ok('après avoir défilé de 2 000 px, l’aside est collé sous l’en-tête (son haut vaut --haut-barre) et tient dans la fenêtre', colle.defile >= 1500 && colle.haut === colle.hb && colle.hb === colle.barre && colle.bas <= colle.fenetre, JSON.stringify(colle));
  // les annonces et la barre de sélection, centrées sur le contenu (à droite du menu)
  const centre = await page.evaluate(() => {
    annoncer('Essai du cadre.');
    const an = document.querySelector('#annonces').getBoundingClientRect();
    const s = document.createElement('div'); s.className = 'sel-barre'; s.textContent = 'x'; document.body.append(s);
    const sb = s.getBoundingClientRect(); s.remove();
    return { annonces: Math.round(an.left + an.width / 2), selection: Math.round(sb.left + sb.width / 2) };
  });
  ok('#annonces et la barre de sélection sont centrées sur le contenu (840 px : entre le menu de 240 px et le bord droit), non sur la fenêtre', centre.annonces === 840 && centre.selection === 840, JSON.stringify(centre));
  // la navigation : aria-current suit
  await page.evaluate(() => { location.hash = '#/planning'; });
  await attendre(page, () => document.querySelector('#menu a[aria-current="page"]')?.getAttribute('href') === '#/planning');
  ok('la navigation fait suivre aria-current : Planning est la rubrique courante, une seule', (await texte(page, '#menu a[aria-current="page"] .menu-l')) === 'Planning' && (await compte(page, '#menu a[aria-current="page"]')) === 1);
  await page.evaluate(() => { location.hash = '#/spectacles/essai-inconnu'; });
  await page.waitForTimeout(400);
  ok('une rubrique à sous-adresse garde la sienne marquée', (await texte(page, '#menu a[aria-current="page"] .menu-l')) === 'Spectacles', await texte(page, '#menu a[aria-current="page"] .menu-l'));
  // ↑ ↓ entre rubriques
  await page.focus('#menu .nav a:first-child');
  await page.keyboard.press('ArrowDown');
  ok('↓ passe à la rubrique suivante du menu, ↑ revient', await page.evaluate(() => document.activeElement?.getAttribute('href')) === '#/representations' && (await page.keyboard.press('ArrowUp'), await page.evaluate(() => document.activeElement?.getAttribute('href'))) === '#/accueil');
  ok('1 440 px · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ la coque : construite une fois, reconstruite après un écran hors cadre
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await page.waitForSelector('#menu .nav a');
  const lire = () => page.evaluate(() => ({ coque: document.querySelector('.coque')?.dataset.coque, coques: document.querySelectorAll('.coque').length, sortir: document.querySelectorAll('#b-sortir').length, menus: document.querySelectorAll('#menu').length, aside: document.querySelector('#menu') && document.querySelector('#menu').dataset.pose, vues: document.querySelectorAll('main#vue').length }));
  const a = await lire();
  for (const h of ['#/planning', '#/lieux', '#/journal']) { await page.evaluate(x => { location.hash = x; }, h); await attendre(page, x => document.querySelector(`#menu a[aria-current="page"]`)?.getAttribute('href') === x, h); await page.waitForTimeout(150); }
  const b = await lire();
  ok('la coque n’est construite qu’une fois : après trois routes, un seul #b-sortir, le même data-coque, un seul aside, un seul main#vue', a.sortir === 1 && b.sortir === 1 && b.coque === a.coque && b.coques === 1 && b.menus === 1 && b.vues === 1, JSON.stringify([a, b]));
  // le menu de l'aside est gardé d'une route à l'autre (le même nœud)
  const garde = await page.evaluate(async () => { const n = document.querySelector('#menu .nav a'); location.hash = '#/textes'; await new Promise(r => setTimeout(r, 500)); return document.querySelector('#menu .nav a') === n; });
  ok('l’aside est gardé d’une route à l’autre : ses liens sont les mêmes nœuds', garde);
  // l'en-tête de la coque : un nom de transition pour l'en-tête et pour le menu, aucun pour le squelette
  const noms = await page.evaluate(() => ({ barre: getComputedStyle(document.querySelector('.barre')).viewTransitionName, menu: getComputedStyle(document.querySelector('#menu')).viewTransitionName }));
  ok('l’en-tête et le menu portent chacun leur nom de transition (barre, menu) : ils restent immobiles quand la vue glisse', noms.barre === 'barre' && noms.menu === 'menu', JSON.stringify(noms));
  // un écran hors cadre : le mot de passe, puis Annuler
  await page.evaluate(() => ecranMotDePasse(true));
  await page.waitForSelector('#f-mdp');
  const hors = await lire();
  ok('l’écran du mot de passe n’a plus de coque (#app est effacé)', hors.coques === 0 && hors.menus === 0 && hors.sortir === 0, JSON.stringify(hors));
  await page.click('#n-annuler');
  await page.waitForSelector('main#vue h1');
  await page.waitForSelector('#menu .nav a');
  const c = await lire();
  ok('après « Annuler », la coque est de nouveau là, une seule : un seul #b-sortir et un seul aside (pas de nom de transition en double), un autre data-coque', c.coques === 1 && c.sortir === 1 && c.menus === 1 && c.vues === 1 && c.coque !== b.coque && c.aside === '1', JSON.stringify(c));
  const noms2 = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(x => getComputedStyle(x).viewTransitionName === 'menu').length);
  ok('… un seul élément porte le nom de transition « menu » (deux noms identiques annuleraient la transition)', noms2 === 1, String(noms2));
  ok('… le menu est dessiné de nouveau (douze rubriques) et marque la rubrique de l’adresse', (await compte(page, '#menu .nav a')) === 12 && (await texte(page, '#menu a[aria-current="page"] .menu-l')) === 'Textes du site');
  await page.click('#b-chercher'); await page.waitForSelector('dialog.recherche[open]');
  ok('… et les boutons de l’en-tête sont reliés une seule fois : la recherche s’ouvre, une fois', (await compte(page, 'dialog.recherche[open]')) === 1);
  await page.keyboard.press('Escape');
  // la Diffusion paraît à chaud (E.ideale)
  const ideale = await page.evaluate(() => {
    const noms = () => [...document.querySelectorAll('#menu .nav a')].map(a => a.getAttribute('href').slice(2));
    E.ideale = false; CADRE.marquer('accueil'); const sans = noms();
    E.ideale = true; CADRE.marquer('accueil'); const avec = noms();
    return { sans: sans.length, sansDiffusion: !sans.includes('diffusion'), avec: avec.length, avecDiffusion: avec.includes('diffusion'), courante: document.querySelector('#menu a[aria-current="page"]')?.getAttribute('href') };
  });
  ok('E.ideale à chaud : sans lui onze rubriques (pas de Diffusion), avec lui douze et la Diffusion paraît à sa place ; la courante est marquée', ideale.sans === 11 && ideale.sansDiffusion && ideale.avec === 12 && ideale.avecDiffusion && ideale.courante === '#/accueil', JSON.stringify(ideale));
  ok('la coque · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 1 280 px : replié d'office, sans écriture ; déplié exprès, pour l'onglet seulement
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1280, hauteur: 800, hash: '#/accueil' });
  await page.addInitScript(sondeVue);
  await page.waitForSelector('#menu .nav a');
  await page.waitForTimeout(1200);
  const e = await etat(page);
  ok('1 280 px · le menu naît replié : 64 px, ni html.menu-replie ni html.menu-deplie (rien n’est retenu comme un choix), aucune écriture', e.large === '64px' && e.aside === 64 && !/menu-replie|menu-deplie/.test(e.classes) && ECRITURES.length === 0, JSON.stringify({ e, ecritures: ECRITURES.length }));
  const r = await page.evaluate(() => { const xs = [...document.querySelectorAll('#menu .nav a')], l = xs[0].querySelector('.menu-l').getBoundingClientRect();
    return { libelles: xs.every(a => a.querySelector('.menu-l').textContent.trim().length > 2), sr: Math.round(l.width) <= 1 && Math.round(l.height) <= 1, titres: xs.every(a => a.title.length > 2), haut: Math.min(...xs.map(a => a.getBoundingClientRect().height)), large: Math.min(...xs.map(a => a.getBoundingClientRect().width)),
      bouton: document.querySelector('.menu-replier').getAttribute('aria-expanded'), nomBouton: document.querySelector('.menu-replier').textContent.trim(), fleche: !!document.querySelector('.menu-replier svg') }; });
  ok('replié, chaque lien garde son libellé (.menu-l en .sr : 1 × 1 px) et son infobulle, 44 px au moins en hauteur et en largeur ; le bouton dit « Déplier » (aria-expanded faux)', r.libelles && r.sr && r.titres && r.haut >= 44 && r.large >= 44 && r.bouton === 'false' && r.nomBouton === 'Déplier' && r.fleche, JSON.stringify(r));
  await page.screenshot({ path: `${CAPT}/menu-1280.png` });
  // déplié exprès : l'onglet seulement
  await page.click('.menu-replier');
  const n = await finTransition(page);
  const d = await etat(page);
  ok('« Déplier » à 1 280 px : html.menu-deplie, la colonne s’anime puis --large-menu vaut 240px, l’aside 240 px', /menu-deplie/.test(d.classes) && n >= 1 && d.large === '240px' && d.aside === 240, JSON.stringify({ d, n }));
  await page.waitForTimeout(1200);
  const s = await page.evaluate(() => sessionStorage.getItem('crescite-admin-menu'));
  ok('… le dépli exprès sous 1 340 px ne va qu’en sessionStorage : aucune écriture dans le compte, ni dans le miroir de l’appareil', s === 'deplie' && ECRITURES.length === 0 && (await page.evaluate(id => localStorage.getItem(`crescite-admin-apparence:${id}`), UID)) === null, JSON.stringify({ s, ecritures: ECRITURES.length }));
  ok('… le bouton dit « Replier », la zone polie dit « Menu déplié. »', (await texte(page, '.menu-replier')) === 'Replier' && (await texte(page, '#sr-menu')) === 'Menu déplié.');
  await page.screenshot({ path: `${CAPT}/menu-1280-deplie.png` });
  // le rechargement : le dépli de l'onglet est retrouvé avant le premier dessin
  await page.reload();
  await page.waitForSelector('#menu .nav a');
  const av = await page.evaluate(() => window.__avant);
  ok('rechargé, le dépli de l’onglet est là dès l’arrivée de main#vue (html.menu-deplie posé par le script du <head>, avant le premier dessin)', !!av && /menu-deplie/.test(av.classes), JSON.stringify(av));
  // se replier de nouveau : l'onglet oublie son dépli, la clé reste intacte
  await page.click('.menu-replier'); await finTransition(page);
  const r2 = await etat(page);
  ok('se replier de nouveau à 1 280 px : 64 px, le dépli de l’onglet est oublié, toujours rien d’écrit', r2.large === '64px' && (await page.evaluate(() => sessionStorage.getItem('crescite-admin-menu'))) === null && ECRITURES.length === 0, JSON.stringify(r2));
  ok('1 280 px · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 1 440 px : replier (un choix, gardé par le compte)
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await page.waitForSelector('#menu .nav a');
  await page.waitForTimeout(1200);
  ok('à 1 440 puis 1 280 px, ouvrir l’administration n’écrit pas la clé menu.replie (ni ici, ni plus haut)', ecritesMenu().length === 0 && ECRITURES.length === 0);
  await page.click('.menu-replier');
  const n = await finTransition(page);
  const e = await etat(page);
  ok('« Replier » à 1 440 px : html.menu-replie, la colonne s’anime (une transition de --large-menu), puis --large-menu vaut 64px et l’aside 64 px', /menu-replie/.test(e.classes) && !/menu-deplie/.test(e.classes) && n === 1 && e.large === '64px' && e.aside === 64, JSON.stringify({ e, n }));
  await page.waitForTimeout(400);
  ok('… la clé menu.replie est écrite aussitôt, à vrai', ecritesMenu().length === 1 && ecritesMenu()[0].valeur === true && ecritesMenu()[0].user_id === UID, JSON.stringify(ecritesMenu()));
  const mi = await page.evaluate(id => JSON.parse(localStorage.getItem(`crescite-admin-apparence:${id}`) || 'null'), UID);
  ok('… le miroir de l’appareil par compte (crescite-admin-apparence:<compte>) dit { "menu.replie": true }', mi && mi['menu.replie'] === true, JSON.stringify(mi));
  ok('… l’annonce dit une fois où le choix est gardé (« Gardé avec votre compte »), et la zone polie « Menu replié. »', (await compte(page, '#annonces .annonce')) === 1 && /Gardé avec votre compte/.test(await texte(page, '#annonces .annonce')) && (await texte(page, '#sr-menu')) === 'Menu replié.', await texte(page, '#annonces'));
  ok('… le bouton dit « Déplier » (aria-expanded faux) et sa flèche regarde à droite', await page.evaluate(() => { const b = document.querySelector('.menu-replier'); return b.getAttribute('aria-expanded') === 'false' && b.textContent.trim() === 'Déplier' && b.title === 'Déplier le menu (Alt+M)'; }));
  const contenu = await page.evaluate(() => Math.round(document.querySelector('main#vue').getBoundingClientRect().left));
  ok('… le contenu s’élargit : il commence à 64 px (la grille suit la colonne)', contenu >= 64 && contenu < 90, String(contenu));
  await page.screenshot({ path: `${CAPT}/menu-replie.png` });
  // l'état retrouvé dès le premier dessin
  await page.addInitScript(sondeVue);
  await page.reload();
  await page.waitForSelector('#menu .nav a');
  const av = await page.evaluate(() => window.__avant);
  ok('rechargé, le menu naît replié : html.menu-replie est posé quand main#vue arrive, avant le premier dessin de la vue', !!av && /menu-replie/.test(av.classes), JSON.stringify(av));
  ok('… et après le rechargement la colonne vaut 64px sans animation', (await etat(page)).large === '64px' && (await finTransition(page)) === 0);
  // le rouvrir
  await page.click('.menu-replier'); await finTransition(page);
  const o = await etat(page);
  await page.waitForTimeout(400);
  ok('« Déplier » le rouvre : 240px sans aucune classe (déplié est le défaut d’un grand écran), la clé passe à faux, le miroir ne garde plus le repli', o.large === '240px' && !/menu-replie|menu-deplie/.test(o.classes) && ecritesMenu().length === 2 && ecritesMenu()[1].valeur === false
    && (await page.evaluate(id => JSON.parse(localStorage.getItem(`crescite-admin-apparence:${id}`) || '{}')['menu.replie'], UID)) === undefined, JSON.stringify({ o, ecritures: ecritesMenu().map(x => x.valeur) }));
  // un dépli voulu sur un grand écran, puis la fenêtre qui se rétrécit : le menu se replie d'office (il ne reste pas à 240 px)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(300); await finTransition(page);
  const p = await etat(page);
  ok('… déplié à 1 440 px puis la fenêtre ramenée à 1 280 px : le menu se replie d’office (64 px), sans html.menu-deplie ni écriture de plus', p.large === '64px' && p.aside === 64 && !/menu-deplie/.test(p.classes) && ecritesMenu().length === 2, JSON.stringify(p));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300); await finTransition(page);
  const q = await etat(page);
  ok('… et remise à 1 440 px, le choix du compte (déplié) reprend la main : 240 px', q.large === '240px' && q.aside === 240 && !/menu-deplie/.test(q.classes), JSON.stringify(q));
  ok('1 440 px · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ la courante est marquée dès le premier dessin
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  // au premier instant où la rubrique courante paraît : sa couleur et ses animations en cours (une couleur posée après coup passerait par la transition des liens : un fondu)
  await page.addInitScript(`window.__courante = null; new MutationObserver((_, o) => { const a = document.querySelector('#menu a[aria-current="page"]'); if (a) { window.__courante = { couleur: getComputedStyle(a).color, animations: a.getAnimations().length }; o.disconnect(); } }).observe(document, { childList: true, subtree: true, attributes: true });`);
  await page.reload();
  await page.waitForSelector('#menu a[aria-current="page"]');
  const c = await page.evaluate(() => window.__courante);
  ok('la rubrique courante est dessinée courante : blanche et sans animation en cours dès sa première apparition (pas de fondu)', !!c && c.couleur === 'rgb(255, 255, 255)' && c.animations === 0, JSON.stringify(c));
  ok('… aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ un second onglet se replie avec le premier
{
  repartir();
  const a = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  const b = { page: await a.ctx.newPage(), erreurs: [] };
  b.page.on('pageerror', e => b.erreurs.push(String(e.message || e)));
  await b.page.goto(a.page.url());
  await b.page.waitForSelector('#menu .nav a');
  await attendre(b.page, () => typeof PREFS !== 'undefined' && PREFS.etat() !== null, null, 15000);          // (le second onglet a lu les préférences du compte : sous charge, il n'écoutait pas encore)
  await b.page.waitForTimeout(600);
  await a.page.click('.menu-replier');
  // (la base fictive ne garde pas les écritures : la vraie aurait reçu la clé ; sans elle, une relecture du second onglet, sous charge, effacerait le repli que le canal vient de lui dire)
  await a.page.waitForTimeout(150);
  DB.crescite_preferences = [{ user_id: UID, cle: 'menu.replie', valeur: true }];
  await a.page.waitForTimeout(550);
  ok('deux onglets du même navigateur : replier dans le premier replie le second (la clé arrive par le canal entre onglets)', await attendre(b.page, () => document.documentElement.classList.contains('menu-replie')), JSON.stringify(await b.page.evaluate(() => ({ classes: document.documentElement.className, etat: PREFS.etat(), uid: E.session?.user?.id, miroir: localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith('crescite-prefs:')) || '') }))));
  ok('… le second onglet n’a rien écrit lui-même', ecritesMenu().length === 1);
  ok('deux onglets · aucune erreur de script', a.erreurs.length === 0 && b.erreurs.length === 0, a.erreurs.concat(b.erreurs).join(' / '));
  await a.ctx.close();
}

// ================================================================================ la clé du compte, à l'ouverture (l'autre appareil a replié)
{
  repartir();
  DB.crescite_preferences = [{ user_id: UID, cle: 'menu.replie', valeur: true }];
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await page.waitForSelector('#menu .nav a');
  await page.waitForTimeout(500);
  ok('le compte a replié le menu sur un autre appareil : à l’ouverture ici, il est replié (64 px) sans rien écrire', (await etat(page)).large === '64px' && /menu-replie/.test((await etat(page)).classes) && ECRITURES.length === 0, JSON.stringify(await etat(page)));
  ok('… et le miroir de l’appareil le retient pour le prochain premier dessin', (await page.evaluate(id => JSON.parse(localStorage.getItem(`crescite-admin-apparence:${id}`) || 'null'), UID))?.['menu.replie'] === true);
  ok('le compte · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
  repartir();
}

// ================================================================================ sans le script SQL des préférences
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil', prefsAbsentes: true });
  await page.waitForSelector('#menu .nav a');
  await page.click('.menu-replier'); await finTransition(page);
  await page.waitForTimeout(500);
  ok('sans la table des préférences, le menu se replie quand même : 64px, rien n’est envoyé à la base', (await etat(page)).large === '64px' && ECRITURES.length === 0, JSON.stringify(await etat(page)));
  ok('… et l’annonce dit « Gardé sur cet appareil »', /Gardé sur cet appareil/.test(await texte(page, '#annonces')), await texte(page, '#annonces'));
  const mi = await page.evaluate(id => JSON.parse(localStorage.getItem(`crescite-admin-apparence:${id}`) || 'null'), UID);
  ok('… le miroir de l’apparence retient le repli pour le prochain premier dessin', mi && mi['menu.replie'] === true, JSON.stringify(mi));
  ok('sans la table · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ moins d'animations : le repli est immédiat
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil', reduit: true });
  await page.waitForSelector('#menu .nav a');
  await page.click('.menu-replier');
  const vide = await page.evaluate(() => ({ anims: document.getAnimations().filter(a => a.transitionProperty === '--large-menu').length, large: getComputedStyle(document.documentElement).getPropertyValue('--large-menu').trim() }));
  ok('sous « moins d’animations », le repli n’anime rien (aucune animation en cours) : --large-menu vaut 64px aussitôt', vide.anims === 0 && vide.large === '64px', JSON.stringify(vide));
  ok('moins d’animations · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
  repartir();
  const f = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '?anim=0#/accueil' });
  await f.page.waitForSelector('#menu .nav a');
  await f.page.click('.menu-replier');
  const fige = await f.page.evaluate(() => ({ anims: document.getAnimations().filter(a => a.transitionProperty === '--large-menu').length, large: getComputedStyle(document.documentElement).getPropertyValue('--large-menu').trim() }));
  ok('avec ?anim=0 (html.still), le repli n’anime rien non plus', fige.anims === 0 && fige.large === '64px', JSON.stringify(fige));
  await f.ctx.close();
}

// ================================================================================ 720 px : le menu replié, l'en-tête sur une ligne
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 720, hauteur: 900, hash: '#/accueil' });
  await page.waitForSelector('#menu .nav a');
  const t = await page.evaluate(() => { const nav = document.querySelector('#menu nav'), cs = getComputedStyle(nav), b = document.querySelector('.barre'); return { masque: cs.maskImage, webkit: cs.webkitMaskImage, h: Math.round(b.getBoundingClientRect().height), deborde: document.documentElement.scrollWidth > innerWidth, large: getComputedStyle(document.documentElement).getPropertyValue('--large-menu').trim() }; });
  ok('720 px · le menu est replié (64px), aucun masque sur la colonne de rubriques (le masque de droite n’efface rien), l’en-tête sur une ligne sans débordement', t.masque === 'none' && (t.webkit === 'none' || t.webkit === '') && t.large === '64px' && t.h < 64 && !t.deborde, JSON.stringify(t));
  await page.screenshot({ path: `${CAPT}/menu-720.png` });
  ok('720 px · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ le téléphone n'a pas bougé
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 390, hauteur: 844, hash: '#/accueil' });
  await page.addInitScript(sondeVue);
  await page.reload();
  await page.waitForSelector('#menu', { state: 'attached' });
  await page.waitForTimeout(500);
  const av = await page.evaluate(() => window.__avant);
  ok('390 px · l’aside est display: none dès l’arrivée de main#vue (la feuille d’index.html, sans attendre mobile.js)', !!av && av.affichage === 'none', JSON.stringify(av));
  const t = await page.evaluate(() => { const b = document.querySelector('.barre'), cs = getComputedStyle(b), c = document.querySelector('.chercher').getBoundingClientRect(), ob = document.querySelector('.ob-barre').getBoundingClientRect(), m = document.querySelector('main#vue'), mc = getComputedStyle(m);
    return { padding: cs.padding, minH: cs.minHeight, h: Math.round(b.getBoundingClientRect().height), loupe: [Math.round(c.width), Math.round(c.height)], ob: [Math.round(ob.top), Math.round(ob.height)], mainPad: mc.padding, mainLeft: Math.round(m.getBoundingClientRect().left), mainW: Math.round(m.getBoundingClientRect().width), haut: getComputedStyle(document.documentElement).getPropertyValue('--haut-barre'),
      large: getComputedStyle(document.documentElement).getPropertyValue('--large-menu').trim(), menu: Math.round(document.querySelector('#menu').getBoundingClientRect().width), onglets: [...document.querySelectorAll('.ob-barre > *')].map(x => x.textContent.trim()).join() }; });
  // (mesuré avant le lot, sur la même base : l'en-tête du téléphone, son bouton de recherche, la barre du bas, le contenu pleine largeur)
  const avant = { padding: '6px 10px 6px 12px', minH: '56px', h: 56, loupe: [44, 44], ob: [785, 60], mainPad: '14px 12px 20px', mainLeft: 0, mainW: 390, haut: '56px' };
  ok('390 px · l’en-tête, son bouton de recherche de 44 px, la barre du bas et le contenu sont tels qu’avant le lot (mesures prises avant le changement)', Object.entries(avant).every(([k, v]) => JSON.stringify(t[k]) === JSON.stringify(v)), JSON.stringify(t));
  ok('390 px · la colonne du menu vaut 0 (--large-menu: 0px), la barre du bas garde ses cinq onglets', t.large === '0px' && t.menu === 0 && t.onglets === 'Tableau,Dates,Planning,Équipe,Plus', JSON.stringify([t.large, t.menu, t.onglets]));
  const pied = await page.evaluate(() => { const c = document.querySelector('.coque'), main = c.querySelector('main'); return { pad: getComputedStyle(main).paddingBottom, suivant: c.nextElementSibling?.className }; });
  ok('390 px · avant le pied commun, le contenu garde son bas de 20 px (la coque n’a pas changé la marge qui laisse la place à la barre)', pied.pad === '20px' && /pied-espace/.test(pied.suivant), JSON.stringify(pied));
  await page.screenshot({ path: `${CAPT}/telephone.png` });
  ok('390 px · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ l'ordre du clavier, et l'impression
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations' });
  await page.waitForSelector('#menu .nav a');
  await page.keyboard.press('Tab');
  const premier = await page.evaluate(() => ({ texte: document.activeElement.textContent, classe: document.activeElement.className }));
  ok('Tab · le premier arrêt est « Aller au contenu » (le lien d’évitement), avant le menu', premier.texte === 'Aller au contenu' && premier.classe === 'evitement', JSON.stringify(premier));
  const ordre = await page.evaluate(() => { const ev = document.querySelector('.evitement'), tete = document.querySelector('.barre'), menu = document.querySelector('#menu'), vue = document.querySelector('#vue'), F = Node.DOCUMENT_POSITION_FOLLOWING;
    return { evitementAvant: !!(ev.compareDocumentPosition(tete) & F) && !!(ev.compareDocumentPosition(menu) & F), teteAvantMenu: !!(tete.compareDocumentPosition(menu) & F), menuAvantVue: !!(menu.compareDocumentPosition(vue) & F) }; });
  ok('dans le DOM : le lien d’évitement, puis l’en-tête, puis le menu, puis le contenu', ordre.evitementAvant && ordre.teteAvantMenu && ordre.menuAvantVue, JSON.stringify(ordre));
  await page.keyboard.press('Enter');
  ok('« Aller au contenu » mène au titre de la rubrique, l’adresse ne change pas', await page.evaluate(() => document.activeElement === document.querySelector('main#vue h1') && location.hash === '#/representations'));
  await page.emulateMedia({ media: 'print' });
  const imp = await page.evaluate(() => { const aff = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).display : 'absent'; }, v = document.querySelector('#vue').getBoundingClientRect();
    return { vue: aff('#vue'), vueLarge: Math.round(v.width), vueHaute: Math.round(v.height), menu: aff('#menu'), barre: aff('.barre'), pied: aff('.pied-espace'), coque: aff('.coque'), titre: document.querySelector('#vue h1')?.getBoundingClientRect().height > 0, tete: document.querySelector('#imp-tete') ? getComputedStyle(document.querySelector('#imp-tete')).display : 'absent' }; });
  ok('à l’impression : la vue est visible (pleine largeur, pas une page blanche), le menu, l’en-tête et le pied ne sont pas imprimés, la grille de la coque est neutralisée', imp.vue !== 'none' && imp.vueLarge > 600 && imp.vueHaute > 100 && imp.menu === 'none' && imp.barre === 'none' && imp.pied === 'none' && imp.coque === 'block', JSON.stringify(imp));
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  ok('la tête de la page imprimée dit la rubrique, même quand le titre manque (repli : la rubrique courante du menu)', await page.evaluate(() => { document.querySelector('#vue .tete h1').remove(); window.dispatchEvent(new Event('beforeprint')); return /Représentations/.test(document.querySelector('#imp-tete .imp-quoi')?.textContent || ''); }));
  ok('clavier et impression · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ les raccourcis : Alt+M, « G puis une lettre », le témoin « G… »
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await page.waitForSelector('#menu .nav a');
  await page.waitForTimeout(800);
  const touche = init => page.evaluate(i => document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...i })), init);
  const replie = () => page.evaluate(() => document.documentElement.classList.contains('menu-replie'));
  // Alt+M : le menu se replie, puis se déplie
  await page.keyboard.press('Alt+KeyM');
  const n1 = await finTransition(page);
  const e1 = await etat(page);
  ok('Alt+M replie le menu (html.menu-replie, la colonne s’anime puis vaut 64px) et écrit le choix comme le bouton', /menu-replie/.test(e1.classes) && n1 === 1 && e1.large === '64px' && e1.aside === 64, JSON.stringify({ e1, n1 }));
  await page.waitForTimeout(300);
  ok('… la clé menu.replie est écrite à vrai, et la zone polie dit « Menu replié. »', ecritesMenu().length === 1 && ecritesMenu()[0].valeur === true && (await texte(page, '#sr-menu')) === 'Menu replié.', JSON.stringify(ecritesMenu()));
  await page.keyboard.press('Alt+KeyM'); await finTransition(page);
  ok('Alt+M le déplie de nouveau : 240px', (await etat(page)).large === '240px' && !(await replie()));
  // la lettre et la touche physique : un Mac (Option+M tape « µ »), un clavier français (le M n’est pas à la place de KeyM)
  await touche({ key: 'µ', code: 'KeyM', altKey: true }); await finTransition(page);
  const mac = await replie();
  await touche({ key: 'm', code: 'Semicolon', altKey: true }); await finTransition(page);
  const azerty = !(await replie());
  ok('Option+M d’un Mac (e.key « µ », e.code KeyM) et Alt+M d’un clavier français (e.key « m », e.code Semicolon) font de même', mac && azerty, JSON.stringify({ mac, azerty }));
  await page.waitForTimeout(300);
  const avant = ecritesMenu().length;
  await touche({ key: ',', code: 'KeyM', altKey: true });              // (la virgule d’un clavier français est à la place de KeyM)
  await touche({ key: 'm', code: 'KeyM', altKey: true, ctrlKey: true });
  await touche({ key: 'M', code: 'KeyM', altKey: true, shiftKey: true });
  await touche({ key: 'm', code: 'KeyM', altKey: true, metaKey: true });
  await touche({ key: 'm', code: 'KeyM' });
  await page.waitForTimeout(300);
  ok('Alt + virgule, Ctrl+Alt+M, Alt+Maj+M, Méta+Alt+M et M seul ne font rien (l’accord est exact)', !(await replie()) && ecritesMenu().length === avant, String(ecritesMenu().length - avant));
  // dans un champ, dans une grille (role="grid", comme le tableur), dans une boîte modale : rien
  await page.evaluate(() => { const i = document.createElement('input'); i.id = 'essai-champ'; document.querySelector('#vue').append(i); i.focus(); });
  await page.keyboard.press('Alt+KeyM'); await page.keyboard.press('g'); await page.keyboard.press('d');
  const champ = await page.evaluate(() => ({ valeur: document.querySelector('#essai-champ').value, hash: location.hash, replie: document.documentElement.classList.contains('menu-replie'), temoin: document.getElementById('rac-temoin').textContent }));
  ok('dans un champ de saisie, Alt+M et « G puis D » ne font rien : le champ reçoit « gd », l’adresse ne bouge pas, le témoin reste vide', champ.valeur === 'gd' && champ.hash === '#/accueil' && !champ.replie && champ.temoin === '', JSON.stringify(champ));
  await page.evaluate(() => { document.querySelector('#essai-champ').remove(); const g = document.createElement('div'); g.id = 'essai-grille'; g.setAttribute('role', 'grid'); g.tabIndex = 0; document.querySelector('#vue').append(g); g.focus(); });
  await page.keyboard.press('g'); await page.keyboard.press('d'); await page.keyboard.press('Alt+KeyM');
  const grille = await page.evaluate(() => ({ hash: location.hash, replie: document.documentElement.classList.contains('menu-replie'), temoin: document.getElementById('rac-temoin').textContent }));
  ok('sur une grille (role="grid", comme le tableur), ni « G puis D » ni Alt+M ne font rien', grille.hash === '#/accueil' && !grille.replie && grille.temoin === '', JSON.stringify(grille));
  await page.evaluate(() => { document.querySelector('#essai-grille').remove(); document.activeElement.blur(); });
  // les douze séquences : à chaque fois depuis une autre rubrique
  const MENE = {};
  for (const [k, l] of Object.entries(TOUCHES)) {
    const depart = k === 'textes' ? '#/lieux' : '#/textes';
    await page.evaluate(x => { location.hash = x; }, depart);
    await attendre(page, x => document.querySelector('#menu a[aria-current="page"]')?.getAttribute('href') === x, depart);
    await page.keyboard.press('g'); await page.keyboard.press(l.toLowerCase());
    MENE[k] = await page.evaluate(() => location.hash);
    await attendre(page, x => document.querySelector('#menu a[aria-current="page"]')?.getAttribute('href') === x, `#/${k}`);
  }
  ok('« G puis » T D P F S E C O A L X J mène au Tableau de bord, aux Représentations, au Planning, aux Feuilles, aux Spectacles, à l’Équipe, à la Diffusion, à l’Espace pro, aux Ateliers, aux Lieux, aux Textes, au Journal', Object.entries(MENE).every(([k, h]) => h === `#/${k}`), JSON.stringify(MENE));
  // le témoin « G… »
  await page.evaluate(() => { location.hash = '#/accueil'; });
  await attendre(page, () => document.querySelector('#menu a[aria-current="page"]')?.getAttribute('href') === '#/accueil');
  await page.keyboard.press('g');
  await attendre(page, () => getComputedStyle(document.getElementById('rac-temoin')).opacity === '1');              // (le fondu de 120 ms)
  const t1 = await page.evaluate(() => { const t = document.getElementById('rac-temoin'); return { texte: t.textContent, live: t.getAttribute('aria-live'), opacite: getComputedStyle(t).opacity, tag: t.tagName, position: getComputedStyle(t).position }; });
  ok('après « G », un témoin « G… » paraît (une touche flottante, en aria-live poli)', t1.texte === 'G…' && t1.live === 'polite' && t1.tag === 'KBD' && t1.position === 'fixed' && t1.opacite === '1', JSON.stringify(t1));
  await page.screenshot({ path: `${CAPT}/temoin-g.png`, clip: { x: 0, y: 760, width: 500, height: 140 } });
  await page.waitForTimeout(1100);
  await page.keyboard.press('d');
  const t2 = await page.evaluate(() => ({ texte: document.getElementById('rac-temoin').textContent, hash: location.hash }));
  ok('au bout de 900 ms la séquence est perdue : le témoin s’efface, « D » seul ne mène nulle part', t2.texte === '' && t2.hash === '#/accueil', JSON.stringify(t2));
  await page.keyboard.press('g'); await page.keyboard.press('z');
  const t3 = await page.evaluate(() => ({ texte: document.getElementById('rac-temoin').textContent, hash: location.hash }));
  ok('« G » puis une lettre qui ne mène nulle part (Z) : le témoin s’efface aussitôt, l’adresse ne bouge pas', t3.texte === '' && t3.hash === '#/accueil', JSON.stringify(t3));
  // la file J / K du tableau de bord ne bouge pas pendant « G puis J »
  await page.evaluate(() => { window.__file = []; document.addEventListener('focusin', e => { if (e.target.closest?.('a.tb-l')) window.__file.push(e.target.dataset.cle || 'ligne'); }); });
  await page.keyboard.press('j');
  const seule = await page.evaluate(() => window.__file.length);
  await page.evaluate(() => { document.activeElement.blur(); window.__file.length = 0; });
  await page.keyboard.press('g'); await page.keyboard.press('j');
  const suite = await page.evaluate(() => ({ file: window.__file.length, hash: location.hash }));
  ok('sur le tableau de bord, « J » seul fait avancer la file (la ligne prend le focus) mais « G puis J » va au Journal sans que la file ait bougé', seule === 1 && suite.file === 0 && suite.hash === '#/journal', JSON.stringify({ seule, suite }));
  // la Diffusion n'a son G puis C que si la base l'a
  await page.evaluate(() => { location.hash = '#/accueil'; });
  await attendre(page, () => document.querySelector('#menu a[aria-current="page"]')?.getAttribute('href') === '#/accueil');
  await page.evaluate(() => { E.ideale = false; CADRE.marquer('accueil'); });
  await page.keyboard.press('g'); await page.keyboard.press('c');
  const sans = await page.evaluate(() => ({ hash: location.hash, temoin: document.getElementById('rac-temoin').textContent }));
  await page.keyboard.press('?'); await page.waitForSelector('dialog.gq-aide[open]');
  const aideSans = await page.evaluate(() => [...document.querySelectorAll('dialog.gq-aide section')].map(s => ({ titre: s.querySelector('h3').textContent.replace(/\s*ici$/, ''), n: s.querySelectorAll('.gq-aide-l').length, texte: s.textContent })));
  await page.keyboard.press('Escape'); await page.waitForSelector('dialog.gq-aide', { state: 'detached' });
  await page.evaluate(() => { E.ideale = true; CADRE.marquer('accueil'); });
  const rubSans = aideSans.find(g => g.titre === 'Aller à une rubrique');
  ok('sans la base de la Diffusion (E.ideale faux), « G puis C » ne mène nulle part, et l’aide ne liste que onze rubriques', sans.hash === '#/accueil' && sans.temoin === '' && rubSans?.n === 11 && !/Diffusion/.test(rubSans.texte), JSON.stringify(sans));
  await page.keyboard.press('g'); await page.keyboard.press('c');
  ok('… et avec elle (à chaud), « G puis C » mène à la Diffusion, dont le lien du menu dit « (G puis C) »', (await page.evaluate(() => location.hash)) === '#/diffusion' && (await page.$eval('#menu a[href="#/diffusion"]', a => a.title)) === 'Diffusion CRM (G puis C)');
  // l'aide « ? »
  await page.evaluate(() => { location.hash = '#/accueil'; });
  await attendre(page, () => document.querySelector('#menu a[aria-current="page"]')?.getAttribute('href') === '#/accueil');
  await page.keyboard.press('?'); await page.waitForSelector('dialog.gq-aide[open]');
  const aide = await page.evaluate(() => { const gs = [...document.querySelectorAll('dialog.gq-aide section')].map(s => ({ titre: s.querySelector('h3').textContent.replace(/\s*ici$/, ''), lignes: [...s.querySelectorAll('.gq-aide-l')].map(l => ({ t: l.querySelector('dt').textContent.replace(/\s+/g, ' ').trim(), d: l.querySelector('dd').textContent.trim() })) }));
    return { gs, partout: gs.find(g => g.titre === 'Partout')?.lignes.find(l => /Replier ou déplier/.test(l.d)), rub: gs.find(g => g.titre === 'Aller à une rubrique') }; });
  ok('« ? » liste Alt+M (sous « Partout ») et les douze « G puis une lettre » (sous « Aller à une rubrique »)', !!aide.partout && /Alt/.test(aide.partout.t) && /M/.test(aide.partout.t) && /Replier ou déplier le menu/.test(aide.partout.d) && aide.rub?.lignes.length === 12 && aide.rub.lignes.some(l => l.t === 'G puis D' && l.d === 'Représentations') && aide.rub.lignes.some(l => l.t === 'G puis C' && l.d === 'Diffusion CRM'), JSON.stringify(aide.rub?.lignes.slice(0, 3)));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${CAPT}/aide-raccourcis.png` });
  // dans la boîte, les raccourcis dorment
  await page.keyboard.press('g'); await page.keyboard.press('d'); await page.keyboard.press('Alt+KeyM');
  const modale = await page.evaluate(() => ({ hash: location.hash, replie: document.documentElement.classList.contains('menu-replie'), ouverte: !!document.querySelector('dialog.gq-aide[open]') }));
  ok('boîte d’aide ouverte, « G puis D » et Alt+M ne font rien', modale.hash === '#/accueil' && !modale.replie && modale.ouverte, JSON.stringify(modale));
  await page.keyboard.press('Escape'); await page.waitForSelector('dialog.gq-aide', { state: 'detached' });
  // les boîtes natives n'ont pas d'aria-modal (seule l'aide le pose) : la question de confirmation et le briefing dorment aussi
  const boites = () => page.evaluate(() => ({ hash: location.hash, replie: document.documentElement.classList.contains('menu-replie'), modale: !!document.querySelector('[aria-modal="true"]'), boite: !!document.querySelector('dialog[open]'), question: GESTES.question() }));
  await page.evaluate(() => { window.__q = GESTES.confirmer({ titre: 'Supprimer cette date ?', ok: 'Oui', non: 'Non' }); });
  await page.waitForSelector('dialog.gq[open]');
  await page.focus('dialog.gq [data-gq="non"]');
  const avantQ = await boites();
  await page.keyboard.press('g'); await page.keyboard.press('d'); await page.keyboard.press('Alt+KeyM');
  const q = await boites();
  ok('la question de confirmation (une <dialog> sans aria-modal) est ouverte : « G puis D » et Alt+M ne font rien derrière elle', !avantQ.modale && avantQ.boite && avantQ.question && q.hash === '#/accueil' && !q.replie && q.question, JSON.stringify({ avantQ, q }));
  await page.keyboard.press('Escape'); await page.waitForSelector('dialog.gq', { state: 'detached' });
  await page.evaluate(() => TABLEAU.ouvrirBriefing());
  await page.waitForSelector('dialog[open]:not(.gq-aide)');
  const avantB = await boites();
  await page.evaluate(() => { const b = document.querySelector('dialog[open] button'); if (b) b.focus(); });
  await page.keyboard.press('g'); await page.keyboard.press('d'); await page.keyboard.press('Alt+KeyM');
  const b = await boites();
  ok('le briefing de la semaine (une <dialog> sans aria-modal) est ouvert : « G puis D » et Alt+M ne font rien derrière lui', !avantB.modale && avantB.boite && b.boite && b.hash === '#/accueil' && !b.replie, JSON.stringify({ avantB, b }));
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  // la boîte fermée, « G puis D » marche de nouveau (la vérification précédente ne dort pas pour une autre raison)
  await page.keyboard.press('g'); await page.keyboard.press('d');
  ok('… et la boîte fermée, « G puis D » mène de nouveau aux Représentations', (await page.evaluate(() => location.hash)) === '#/representations');
  // en disposition des tuiles (« Personnaliser »), aucune séquence ne quitte le tableau de bord
  await page.evaluate(() => { location.hash = '#/accueil'; });
  await attendre(page, () => document.querySelector('#menu a[aria-current="page"]')?.getAttribute('href') === '#/accueil');
  await page.click('#tb-personnaliser'); await page.waitForSelector('#tb-grille.edition');
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('g'); await page.keyboard.press('d');
  const dispo = await page.evaluate(() => ({ hash: location.hash, temoin: document.getElementById('rac-temoin').textContent }));
  ok('le tableau de bord en disposition des tuiles : « G puis D » n’en fait pas quitter la page, le témoin reste vide', dispo.hash === '#/accueil' && dispo.temoin === '', JSON.stringify(dispo));
  await page.click('#tb-personnaliser', { timeout: 3000 }).catch(() => {});
  ok('raccourcis · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
  repartir();
}

// ================================================================================ la grille du tableur : « G » ne la quitte pas
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/tableur' });
  await page.waitForSelector('table[role=grid] #tab-corps tr[data-l]', { timeout: 15000 });
  await page.focus('#tab-corps td[tabindex="0"]');
  await page.keyboard.press('g'); await page.keyboard.press('d');
  const t = await page.evaluate(() => ({ hash: location.hash, temoin: document.getElementById('rac-temoin').textContent }));
  ok('dans une case du tableur, « G » ouvre la case (la lettre est pour elle) : « G puis D » ne quitte pas le tableur, le témoin reste vide', t.hash === '#/representations/tableur' && t.temoin === '', JSON.stringify(t));
  ok('tableur · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ les badges : ce qui attend, sur trois rubriques
{
  repartir();
  const maintenant = new Date().toISOString();
  DB.crescite_devis_demandes.push({ id: 90, spectacle_id: 2, type_lieu: 'polyvalente', structure_nom: 'Mairie de Falaise', commune: 'Falaise', departement: '14', statut: null, cree_le: maintenant });
  DB.crescite_notes_frais.push({ id: 91, personne_id: 1, date_id: null, date_depense: maintenant.slice(0, 10), categorie: 'repas', montant_ttc: 12, statut: null, commentaire: 'Essai', cree_le: maintenant });
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  const badge = k => page.$eval(`#menu a[href="#/${k}"] .menu-badge`, b => b.dataset.n || '').catch(() => null);
  const attendreBadge = (k, v) => attendre(page, ([k, v]) => document.querySelector(`#menu a[href="#/${k}"] .menu-badge`)?.dataset.n === v, [k, v], 8000);
  await page.waitForSelector('#menu .nav a');
  await attendre(page, () => document.querySelector('#menu a[href="#/accueil"] .menu-badge')?.dataset.n, null, 8000);
  const pose = await page.evaluate(() => ({ tuile: document.querySelector('.tb-tuile[data-k="urgent"] .tb-badge')?.textContent.trim(), devis: E.devis.filter(d => (d.statut || 'nouveau') === 'nouveau').length, frais: E.frais.filter(f => (f.statut || 'en_attente') === 'en_attente').length }));
  const b = { accueil: await badge('accueil'), diffusion: await badge('diffusion'), equipe: await badge('equipe'), planning: await badge('planning') };
  ok('le badge du Tableau de bord est le compte de la tuile « À traiter » (autant que le tableau de bord en montre)', Number(b.accueil) >= 12 && b.accueil === pose.tuile, JSON.stringify({ b, pose }));
  ok('le badge de la Diffusion compte les devis nouveaux (celui sans statut compte, celui « en cours » non), celui de l’Équipe les notes de frais en attente', b.diffusion === String(pose.devis) && b.equipe === String(pose.frais) && pose.devis === 2 && pose.frais === 2, JSON.stringify({ b, pose }));
  ok('une rubrique sans compte (Planning) n’a ni badge ni libellé de plus', b.planning === '' && (await page.$eval('#menu a[href="#/planning"]', a => !a.hasAttribute('aria-label'))));
  const nom = await page.evaluate(() => ({ badge: document.querySelector('#menu a[href="#/diffusion"] .menu-badge').getAttribute('aria-hidden'), diffusion: document.querySelector('#menu a[href="#/diffusion"]').getAttribute('aria-label'), equipe: document.querySelector('#menu a[href="#/equipe"]').getAttribute('aria-label'), accueil: document.querySelector('#menu a[href="#/accueil"]').getAttribute('aria-label'), titre: document.querySelector('#menu a[href="#/diffusion"]').title }));
  ok('le lien dit son compte en toutes lettres (« Diffusion CRM, 2 devis à traiter »), le chiffre du badge est caché aux lecteurs d’écran, l’infobulle garde la séquence', nom.badge === 'true' && nom.diffusion === 'Diffusion CRM, 2 devis à traiter' && nom.equipe === 'Équipe, 2 notes de frais en attente' && nom.accueil === `Tableau de bord, ${b.accueil} à traiter` && nom.titre === 'Diffusion CRM (G puis C)', JSON.stringify(nom));
  ok('… et le nom accessible du lien est celui-là (la technologie d’assistance lit le compte)', (await page.getByRole('link', { name: 'Diffusion CRM, 2 devis à traiter' }).count()) === 1 && (await page.getByRole('link', { name: 'Équipe, 2 notes de frais en attente' }).count()) === 1);
  const geo = await page.evaluate(() => { const bd = document.querySelector('#menu a[href="#/accueil"] .menu-badge'), r = bd.getBoundingClientRect(); return { h: Math.round(r.height), l: Math.round(r.width), fond: getComputedStyle(bd).backgroundColor, a: Math.round(document.querySelector('#menu a[href="#/accueil"]').getBoundingClientRect().height) }; });
  ok('déplié, le badge est une pastille corail de 18 px, sur la ligne de 44 px', geo.h === 18 && geo.l >= 18 && geo.fond === 'rgb(242, 138, 108)' && geo.a >= 44, JSON.stringify(geo));
  await page.screenshot({ path: `${CAPT}/menu-badges.png`, clip: { x: 0, y: 0, width: 330, height: 640 } });
  // replié : un point sur l'icône
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(300); await finTransition(page);
  const point = await page.evaluate(() => { const bd = document.querySelector('#menu a[href="#/accueil"] .menu-badge'), r = bd.getBoundingClientRect(), a = document.querySelector('#menu a[href="#/accueil"]'), ic = a.querySelector('svg').getBoundingClientRect();
    return { l: Math.round(r.width), h: Math.round(r.height), surIcone: r.left > ic.left && r.left < ic.right + 12 && r.top < ic.top + 10, dansLien: r.right <= a.getBoundingClientRect().right + 1, nom: a.getAttribute('aria-label') }; });
  ok('replié (1 280 px), le badge devient un point de 8 px sur l’icône, et le lien garde son compte dit en toutes lettres', point.l === 8 && point.h === 8 && point.surIcone && point.dansLien && /^Tableau de bord, \d+ à traiter$/.test(point.nom), JSON.stringify(point));
  await page.screenshot({ path: `${CAPT}/menu-badges-replie.png`, clip: { x: 0, y: 0, width: 200, height: 640 } });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300); await finTransition(page);
  // le mémo, le calcul différé, les reports, les catégories imposées, le temps réel
  await page.evaluate(() => { window.__appels = 0; const f = TABLEAU.urgences; TABLEAU.urgences = function (...a) { window.__appels++; return f.apply(this, a); }; window.__reel = Date.now.bind(Date); window.__decalage = 0; Date.now = () => window.__reel() + window.__decalage; });
  for (const h of ['#/planning', '#/lieux', '#/accueil']) { await page.evaluate(x => { location.hash = x; }, h); await attendre(page, x => document.querySelector('#menu a[aria-current="page"]')?.getAttribute('href') === x, h); await page.waitForTimeout(250); }
  ok('le compte est gardé 30 secondes : trois changements de rubrique de suite ne le refont pas', (await page.evaluate(() => window.__appels)) === 0);
  const diff = await page.evaluate(async () => { window.__decalage += 31000; const avant = window.__appels; CADRE.badges(); const synchrone = window.__appels - avant; await new Promise(r => setTimeout(r, 700)); return { synchrone, apres: window.__appels - avant }; });
  ok('le mémo périmé (31 s) se refait au repos de la page, jamais dans le tour de CADRE.badges() lui-même (aucun appel tout de suite, puis les deux comptes)', diff.synchrone === 0 && diff.apres === 2, JSON.stringify(diff));
  const avantAcc = Number(await badge('accueil'));
  await page.evaluate(() => changement('crescite_devis_demandes', { eventType: 'INSERT', new: { id: 92, spectacle_id: 2, type_lieu: 'theatre', structure_nom: 'Théâtre de Bayeux', commune: 'Bayeux', statut: 'nouveau', cree_le: new Date().toISOString() } }));
  const tout = await badge('diffusion');
  ok('un changement reçu en direct (un devis arrive) ne repeint pas à l’instant : le badge attend la fin de la rafale…', tout === '2', tout);
  ok('… puis la Diffusion passe à 3 devis, et le Tableau de bord compte la ligne de plus', await attendreBadge('diffusion', '3') && Number(await badge('accueil')) === avantAcc + 1, `${await badge('diffusion')} / ${await badge('accueil')} (avant ${avantAcc})`);
  // une ligne reportée ne compte plus : le badge suit la tuile sans que le mémo de 30 s soit périmé (l'horloge n'avance pas)
  const rep = await page.evaluate(() => { const j = TABLEAU.REPORTS()[0][2]; TABLEAU.reporter('devis:90', j); return j; });
  const tuile = () => page.$eval('.tb-tuile[data-k="urgent"] .tb-badge', b => b.textContent.trim()).catch(() => null);
  ok('une ligne reportée (« me le rappeler demain ») ne compte plus : la Diffusion revient à 2, le Tableau de bord aussi baisse d’une ligne', await attendreBadge('diffusion', '2') && Number(await badge('accueil')) === avantAcc, `${await badge('diffusion')} / ${await badge('accueil')} (reportée au ${rep})`);
  ok('… et le badge du Tableau de bord redit le chiffre de la tuile « À traiter », sans que l’horloge ait avancé', (await badge('accueil')) === (await tuile()) && Number(await tuile()) === avantAcc, `${await badge('accueil')} / ${await tuile()}`);
  await page.evaluate(() => { location.hash = '#/planning'; });
  await attendre(page, () => document.querySelector('#menu a[aria-current="page"]')?.getAttribute('href') === '#/planning');
  await page.evaluate(() => { location.hash = '#/accueil'; });
  await attendre(page, () => document.querySelector('#menu a[aria-current="page"]')?.getAttribute('href') === '#/accueil');
  await page.waitForTimeout(500);
  ok('… et après un aller-retour par une autre rubrique, tuile et badge sont toujours d’accord', (await badge('accueil')) === (await tuile()), `${await badge('accueil')} / ${await tuile()}`);
  // des catégories imposées : la tuile ne suit plus les devis, la Diffusion les compte quand même (le réglage passe par garder(), comme dans la tuile)
  await page.evaluate(() => { TABLEAU.conf().tuiles.find(t => t.k === 'urgent').reglages = { categories: ['options'] }; TABLEAU.epingler('rien:0', false); });
  await attendre(page, n => Number(document.querySelector('#menu a[href="#/accueil"] .menu-badge')?.dataset.n) < n, avantAcc, 8000);
  const imp = { accueil: Number(await badge('accueil')), diffusion: await badge('diffusion'), equipe: await badge('equipe') };
  ok('la tuile « À traiter » ne suit plus que les options : le badge du Tableau de bord la suit, ceux de la Diffusion et de l’Équipe comptent leurs catégories quand même', imp.accueil < avantAcc && imp.diffusion === '2' && imp.equipe === '2', JSON.stringify({ imp, avantAcc }));
  ok('badges · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
  DB.crescite_devis_demandes = DB.crescite_devis_demandes.filter(d => d.id !== 90);
  DB.crescite_notes_frais = DB.crescite_notes_frais.filter(f => f.id !== 91);
  repartir();
}

// ================================================================================ les badges sur la base commune : 12, 1, 1
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await attendre(page, () => document.querySelector('#menu a[href="#/accueil"] .menu-badge')?.dataset.n, null, 8000);
  const b = await page.evaluate(() => ['accueil', 'diffusion', 'equipe'].map(k => document.querySelector(`#menu a[href="#/${k}"] .menu-badge`).dataset.n || ''));
  ok('sur la base fictive commune : 12 à traiter au Tableau de bord (le compte de tableau.mjs), 1 devis nouveau, 1 note de frais en attente', b.join() === '12,1,1', b.join());
  ok('le chiffre du badge n’entre pas dans le texte du lien : « Tableau de bord » reste « Tableau de bord » (data-n, écrit par la feuille)', (await texte(page, 'nav[aria-label="Rubriques"] a[aria-current="page"]')) === 'Tableau de bord' && (await page.$eval('#menu a[href="#/accueil"] .menu-badge', b => b.textContent)) === '');
  ok('… au singulier : « Diffusion CRM, 1 devis à traiter », « Équipe, 1 note de frais en attente »', (await page.$eval('#menu a[href="#/diffusion"]', a => a.getAttribute('aria-label'))) === 'Diffusion CRM, 1 devis à traiter' && (await page.$eval('#menu a[href="#/equipe"]', a => a.getAttribute('aria-label'))) === 'Équipe, 1 note de frais en attente');
  ok('base commune · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ les badges : aucune tâche longue, même sur un processeur quatre fois plus lent
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil', cpu: 4 });
  await page.addInitScript(`window.__longues = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__longues.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); } catch (e) {}`);
  await page.reload();
  await attendre(page, () => document.querySelector('#menu a[href="#/accueil"] .menu-badge')?.dataset.n, null, 15000);
  await page.waitForTimeout(800);
  const m = await page.evaluate(async () => {
    window.__longues.length = 0;
    const t0 = performance.now(); TABLEAU.urgences(); TABLEAU.urgences({ categories: ['devis', 'frais'] }); const calcul = Math.round(performance.now() - t0);
    window.__longues.length = 0;
    const reel = Date.now.bind(Date); Date.now = () => reel() + 31000; CADRE.badges(); await new Promise(r => setTimeout(r, 1500)); Date.now = reel;
    return { calcul, longues: window.__longues.slice() };
  });
  console.log(`le compte des badges à CPU=4 : ${m.calcul} ms ; tâches longues pendant le recalcul (ms) : ${JSON.stringify(m.longues)}`);
  ok('le compte des badges (les deux appels de TABLEAU.urgences) prend moins de 200 ms à CPU=4', m.calcul < 200, `${m.calcul} ms`);
  ok('aucune tâche > 200 ms pendant le recalcul différé des badges, à CPU=4', m.longues.every(d => d < 200), JSON.stringify(m.longues));
  ok('badges à CPU=4 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

await navigateur.close();
bilan(CAPT);
