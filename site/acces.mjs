// Les accès rapides du menu latéral et la recherche comme barre de commande (admin/cadre.js : « ＋ Créer », les épinglés, les
// récents ; admin/menus.js : le menu d'un épinglé, « Mettre dans le menu » ; admin/index.html : les commandes de la recherche
// avec leur touche, les récents), vérifiés dans Chromium, hors ligne, sur la base fictive commune (admin-fictif.mjs).
//   node site/acces.mjs
// Ce que le banc regarde : « ＋ Créer » (le menu, ses sept créations avec leur icône, Entrée, Échap, le second clic qui referme,
// un autre menu ouvert, l'opportunité de diffusion qui marche aussi sur la Diffusion, ce que le menu dit au lecteur d'écran) ;
// les épinglés (les sept d'office, hors de la nav des rubriques et sans aria-current, leurs infobulles, une condition qui
// change, une clé mal formée) ; leur menu (Maj+F10 : retirer, monter, descendre, annuler ; le clic droit sur une action de la
// tuile : « Mettre dans le menu ») ; les récents (le lieu d'abord, une fiche créée, une fiche supprimée, un autre onglet) ; la
// recherche (les récents en tête, « replier », « vue carte », les douze rubriques avec leur séquence, la touche à côté du genre
// et jamais dedans) ; le menu replié ; le mouvement (l'arrivée d'un épinglé, d'un récent ; rien sous « moins d'animations ») ;
// l'aide « ? » ; le téléphone qui n'a pas bougé. Les captures vont dans site/dist/shots-acces/ (acces.png, acces-replie.png,
// recherche-commandes.png). Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, UID, DB, ECRITURES, ok, calme, ouvrir, texte, compte, tuile, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-acces');
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
const attendre = (page, fn, arg = null, ms = 6000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
const repartir = () => { DB.crescite_preferences = []; ECRITURES.length = 0; };
const ecrites = () => ECRITURES.filter(e => e.cle === 'menu.epingles');
const epingles = page => page.$$eval('.menu-epingle', xs => xs.map(a => a.dataset.action));
const recents = page => page.$$eval('.menu-recent', xs => xs.map(a => a.textContent));
const hash = page => page.evaluate(() => location.hash);
const boite = page => page.$$eval('.gm-boite [data-gm]', xs => xs.map(x => x.querySelector('.gm-l').firstChild.textContent.trim()));
// la liste de la recherche : [titre, genre, touche] de chaque option
const options = page => page.$$eval('#rch-liste [role=option]', xs => xs.map(o => [o.querySelector('.rch-corps b')?.textContent.trim(), o.querySelector('.rch-type')?.textContent, o.querySelector('.rch-touche')?.textContent || '']));
const chercher = async (page, q) => { await page.keyboard.press('Control+k'); await page.waitForSelector('dialog#recherche[open]'); await page.fill('#rch-q', q); await page.waitForTimeout(120); };
const fermerRecherche = async page => { await page.keyboard.press('Escape'); await page.waitForTimeout(150); };
// la page qui vient d'arriver se cale encore (un défilement tardif ferme un menu ouvert, comme gestes.js le veut) : on attend 400 ms sans défilement
const posee = page => page.evaluate(() => new Promise(fin => { let t; const fini = () => { window.removeEventListener('scroll', rearmer, true); fin(true); }, rearmer = () => { clearTimeout(t); t = setTimeout(fini, 400); }; window.addEventListener('scroll', rearmer, true); rearmer(); setTimeout(fini, 5000); }));
const ouvrirMenu = async (page, sel) => { await page.focus(sel); await page.keyboard.press('Shift+F10'); await page.waitForSelector('.gm-boite'); };

// ================================================================================ 1 · « ＋ Créer »
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 1000, hash: '#/accueil' });
  await page.waitForSelector('#menu .menu-creer', { timeout: 15000 });
  const b = await page.evaluate(() => { const b = document.querySelector('.menu-creer'), m = document.querySelector('#menu'), nav = m.querySelector('nav[aria-label="Rubriques"]'), ac = m.querySelector('nav[aria-label="Accès rapides"]'), rep = m.querySelector('.menu-replier'), F = Node.DOCUMENT_POSITION_FOLLOWING;
    return { haspopup: b.getAttribute('aria-haspopup'), expanded: b.getAttribute('aria-expanded'), nom: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height), svg: !!b.querySelector('svg.ico'), fond: getComputedStyle(b).backgroundImage,
      etiquette: ac?.querySelector('.menu-etiq')?.textContent, ordre: !!(nav && ac && rep) && !!(nav.compareDocumentPosition(ac) & F) && !!(ac.compareDocumentPosition(rep) & F), classeNav: !!ac?.classList.contains('nav'), repere: ac?.tagName };
  });
  ok('1 · « Créer » : un bouton de 44 px au moins, avec son icône, aria-haspopup="menu" et aria-expanded faux, sous l’étiquette « Accès rapides »', b.haspopup === 'menu' && b.expanded === 'false' && b.nom === 'Créer' && b.h >= 44 && b.svg && b.etiquette === 'Accès rapides', JSON.stringify(b));
  ok('1 · le bouton est au dégradé de la saison ; les accès rapides sont une navigation à eux, entre les rubriques et le bouton de repli, sans la classe .nav', /gradient/.test(b.fond) && b.ordre && !b.classeNav && b.repere === 'NAV', JSON.stringify(b));
  await page.click('.menu-creer');
  await page.waitForSelector('.gm-boite');
  const m = await page.evaluate(() => { const x = document.querySelector('.gm-boite'), c = document.querySelector('.menu-creer').getBoundingClientRect(), r = x.getBoundingClientRect();
    return { expanded: document.querySelector('.menu-creer').getAttribute('aria-expanded'), nom: x.getAttribute('aria-label'), role: x.getAttribute('role'), icones: [...x.querySelectorAll('[data-gm]')].every(i => i.querySelector('.gm-ic svg')), focus: document.activeElement?.dataset.gm,
      hors: r.left >= c.right - 1 || r.bottom <= c.top + 1 || r.top >= c.bottom - 1, dedans: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, hrefs: [...x.querySelectorAll('a[data-gm]')].map(a => a.getAttribute('href')) }; });
  ok('1 · un clic ouvre le menu : « Nouvelle date », « Proposer des dates », « Nouvelle fiche », « Nouveau lieu », « Séance d’atelier », « Inviter une salle », « Opportunité de diffusion » (les « ＋ » d’ACTIONS dont la condition est vraie), chacune avec son icône',
    (await boite(page)).join(' | ') === 'Nouvelle date | Proposer des dates | Nouvelle fiche | Nouveau lieu | Séance d’atelier | Inviter une salle | Opportunité de diffusion' && m.icones && m.role === 'menu' && m.nom === 'Créer', JSON.stringify([await boite(page), m]));
  ok('1 · « Créer » passe à aria-expanded vrai ; la première ligne a le focus ; le menu est dans l’écran et ne recouvre pas le bouton', m.expanded === 'true' && m.focus === '0' && m.dedans && m.hors, JSON.stringify(m));
  ok('1 · les créations sont de vrais liens vers leurs adresses (#/representations/nouvelle, #/planning/proposer, #/equipe/nouvelle, #/lieux/nouveau, #/ateliers/seances/nouvelle, #/pro/nouvelle)', m.hrefs.join(' ') === '#/representations/nouvelle #/planning/proposer #/equipe/nouvelle #/lieux/nouveau #/ateliers/seances/nouvelle #/pro/nouvelle', m.hrefs.join(' '));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/acces.png`, fullPage: false });
  await page.keyboard.press('ArrowDown');
  const bas = await page.evaluate(() => document.activeElement?.dataset.gm);
  await page.keyboard.press('ArrowUp');
  const haut = await page.evaluate(() => document.activeElement?.dataset.gm);
  ok('1 · ↓ passe à la ligne suivante (« Proposer des dates »), ↑ revient à « Nouvelle date »', bas === '1' && haut === '0', `${bas} puis ${haut}`);
  await page.keyboard.press('Enter');
  await attendre(page, () => location.hash === '#/representations/nouvelle');
  ok('1 · Entrée sur « Nouvelle date » mène à #/representations/nouvelle, le menu est fermé et « Créer » aussi', (await hash(page)) === '#/representations/nouvelle' && (await compte(page, '.gm-boite')) === 0 && (await page.getAttribute('.menu-creer', 'aria-expanded')) === 'false');
  await posee(page);
  // Échap : le menu se ferme, le focus revient au bouton ; l'événement dit quel élément se ferme
  await page.evaluate(() => { window.__fermes = []; document.addEventListener('gestes:menu-ferme', e => window.__fermes.push(e.detail?.el?.className || '')); });
  await page.click('.menu-creer'); await page.waitForSelector('.gm-boite');
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  const e = await page.evaluate(() => ({ boites: document.querySelectorAll('.gm-boite').length, expanded: document.querySelector('.menu-creer').getAttribute('aria-expanded'), focus: document.activeElement?.classList.contains('menu-creer'), fermes: window.__fermes }));
  ok('1 · Échap ferme le menu, « Créer » repasse à aria-expanded faux et reprend le focus ; gestes.js a dit « gestes:menu-ferme » avec la zone du bouton pour détail', e.boites === 0 && e.expanded === 'false' && e.focus && e.fermes.length === 1 && /menu-creer-zone/.test(e.fermes[0]), JSON.stringify(e));
  // le second clic referme (le pointerdown de gestes.js a déjà fermé : sans garde, le clic rouvrirait)
  await page.click('.menu-creer'); await page.waitForSelector('.gm-boite');
  await page.click('.menu-creer'); await page.waitForTimeout(300);
  ok('1 · un second clic sur « Créer » referme son menu (il ne le rouvre pas) : aria-expanded faux, aucune boîte', (await compte(page, '.gm-boite')) === 0 && (await page.getAttribute('.menu-creer', 'aria-expanded')) === 'false');
  await page.click('.menu-creer'); await page.waitForSelector('.gm-boite');
  ok('1 · un troisième clic le rouvre', (await compte(page, '.gm-boite')) === 1 && (await page.getAttribute('.menu-creer', 'aria-expanded')) === 'true');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  // un autre menu ouvert : le clic sur « Créer » ferme l'autre et ouvre celui-ci
  await page.evaluate(() => { location.hash = '#/accueil'; });
  await page.waitForSelector(`${tuile('actions')} .tb-actions .btn`);
  await page.click(`${tuile('actions')} .tb-actions [data-action="lieu"]`, { button: 'right' });
  await page.waitForSelector('.gm-boite');
  const autre = await boite(page);
  await page.click('.menu-creer'); await page.waitForTimeout(250);
  ok('1 · un autre menu est ouvert (celui d’une action de la tuile) : « Créer » le remplace, sans le rouvrir ni se refermer', autre.some(x => /Retirer des actions rapides/.test(x)) && (await compte(page, '.gm-boite')) === 1 && (await boite(page))[0] === 'Nouvelle date' && (await page.getAttribute('.menu-creer', 'aria-expanded')) === 'true');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  // Maj+F10 sur le bouton : le même menu, et aria-expanded le dit
  await page.focus('.menu-creer'); await page.keyboard.press('Shift+F10'); await page.waitForSelector('.gm-boite');
  ok('1 · Maj+F10 sur « Créer » ouvre le même menu, aria-expanded vrai', (await boite(page)).length === 7 && (await page.getAttribute('.menu-creer', 'aria-expanded')) === 'true');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  ok('1 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 2 · l'opportunité de diffusion
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await page.waitForSelector('#menu .menu-creer', { timeout: 15000 });
  await page.click('.menu-creer'); await page.waitForSelector('.gm-boite');
  await page.click('.gm-boite [data-gm]:has-text("Opportunité de diffusion")');
  const venue = await attendre(page, () => document.querySelector('#crm-modale-zone [role="dialog"]'), null, 8000);
  ok('2 · « Opportunité de diffusion » mène à #/diffusion puis clique « Nouvelle opportunité » : la fenêtre de la piste s’ouvre', venue && (await hash(page)) === '#/diffusion', await hash(page));
  await page.keyboard.press('Escape'); await page.evaluate(() => { document.querySelector('#crm-modale-zone').innerHTML = ''; });
  await page.waitForTimeout(150);
  ok('2 · … et la fenêtre est fermée avant la suite', (await compte(page, '#crm-modale-zone [role="dialog"]')) === 0);
  // déjà sur la Diffusion : avant, le clic restait sans effet (aucun hashchange ne venait)
  await page.click('.menu-creer'); await page.waitForSelector('.gm-boite');
  await page.click('.gm-boite [data-gm]:has-text("Opportunité de diffusion")');
  const encore = await attendre(page, () => document.querySelector('#crm-modale-zone [role="dialog"]'), null, 8000);
  ok('2 · déjà sur #/diffusion, le même geste ouvre la fenêtre tout de suite (il restait sans effet)', encore && (await hash(page)) === '#/diffusion', await hash(page));
  await page.evaluate(() => { document.querySelector('#crm-modale-zone').innerHTML = ''; location.hash = '#/accueil'; });
  await page.waitForSelector(`${tuile('actions')} [data-action="prospect"]`);
  await page.click(`${tuile('actions')} [data-action="prospect"]`);
  const tuileOk = await attendre(page, () => document.querySelector('#crm-modale-zone [role="dialog"]'), null, 8000);
  ok('2 · la tuile « actions » de l’accueil, elle aussi, ouvre la fenêtre de la piste', tuileOk && (await hash(page)) === '#/diffusion', await hash(page));
  await page.evaluate(() => { document.querySelector('#crm-modale-zone').innerHTML = ''; location.hash = '#/diffusion'; });
  await page.waitForTimeout(200);
  await page.evaluate(() => { document.querySelector('#crm-modale-zone').innerHTML = ''; });
  await chercher(page, 'opportunite');
  const prem = await options(page);
  ok('2 · la barre de commande : « opportunité » propose l’action, qui marche aussi sur la Diffusion', prem.some(o => o[0] === 'Opportunité de diffusion' && o[1] === 'Action'), JSON.stringify(prem.slice(0, 4)));
  await page.keyboard.press('Enter');
  ok('2 · … Entrée sur la Diffusion ouvre la fenêtre de la piste', await attendre(page, () => document.querySelector('#crm-modale-zone [role="dialog"]'), null, 8000));
  ok('2 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 3 · les épinglés
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 1000, hash: '#/accueil' });
  await page.waitForSelector('#menu .menu-epingle', { timeout: 15000 });
  const e = await page.evaluate(() => { const xs = [...document.querySelectorAll('.menu-epingle')];
    return { cles: xs.map(a => a.dataset.action), noms: xs.map(a => a.querySelector('.menu-l').textContent), titres: xs.map(a => a.title), hrefs: xs.map(a => a.getAttribute('href')), classeNav: xs.some(a => a.classList.contains('nav') || a.closest('.nav')), courant: xs.some(a => a.hasAttribute('aria-current')),
      svg: xs.every(a => a.querySelector('svg.ico')), haut: Math.min(...xs.map(a => a.getBoundingClientRect().height)), ks: xs.map(a => a.getAttribute('aria-keyshortcuts')), externe: xs.filter(a => a.target === '_blank').map(a => a.dataset.action), courantes: document.querySelectorAll('#menu a[aria-current="page"]').length,
      dansNavRubriques: xs.some(a => a.closest('nav[aria-label="Rubriques"]')), groupe: document.querySelector('.menu-epingles').getAttribute('aria-label') }; });
  ok('3 · les épinglés d’office : le tableur, les feuilles de route, le planning, les devis, les frais, le journal, le site (les sept, la base fictive a E.ideale et E.equipeInstallee)', e.cles.join() === 'tableur,feuilles,planning,devis,frais,journal,site', e.cles.join());
  ok('3 · chacun est un lien <a> avec son icône et son nom (« Tableur des séances », « Feuilles de route »…), de 36 px au moins', e.hrefs.join(' ') === '#/representations/tableur #/feuilles #/planning #/diffusion/devis #/equipe/frais #/journal https://crescite.fr/' || e.hrefs.slice(0, 6).join(' ') === '#/representations/tableur #/feuilles #/planning #/diffusion/devis #/equipe/frais #/journal', JSON.stringify(e.hrefs));
  ok('3 · ni la classe .nav ni aria-current, hors de la navigation « Rubriques » : une seule rubrique courante dans le menu', !e.classeNav && !e.courant && !e.dansNavRubriques && e.courantes === 1 && e.svg && e.haut >= 36, JSON.stringify(e));
  ok('3 · l’infobulle dit le nom et la séquence quand il y en a une (« Planning de l’équipe (G puis P) », « Tableur des séances (V puis T dans Représentations) », la séquence des vues ne valant que là), jamais aria-keyshortcuts (une suite de touches n’en est pas un)', e.titres[0] === 'Tableur des séances (V puis T dans Représentations)' && e.titres[2] === 'Planning de l’équipe (G puis P)' && e.titres[3] === 'Demandes de devis' && e.ks.every(k => !k), JSON.stringify(e.titres));
  ok('3 · le site s’ouvre dans un autre onglet (target=_blank, rel=noopener)', e.externe.join() === 'site' && await page.$eval('.menu-epingle[data-action="site"]', a => a.rel === 'noopener' && a.title === 'Voir le site'));
  ok('3 · le groupe est nommé « Épinglés » (rôle group)', e.groupe === 'Épinglés' && await page.$eval('.menu-epingles', g => g.getAttribute('role') === 'group'));
  // une condition qui change après le chargement : le dessin la relit à chaque vue
  await page.evaluate(() => { E.ideale = false; CADRE.marquer('accueil'); });
  const sans = await epingles(page);
  ok('3 · sans E.ideale, les devis et les frais ne sont pas dessinés (leur condition est fausse) ; la clé n’a pas changé (rien n’est écrit)', sans.join() === 'tableur,feuilles,planning,journal,site' && ecrites().length === 0, sans.join());
  await page.evaluate(() => { E.ideale = true; CADRE.marquer('accueil'); });
  ok('3 · E.ideale de nouveau vrai : ils reviennent, à leur place', (await epingles(page)).join() === 'tableur,feuilles,planning,devis,frais,journal,site');
  await calme(page);
  // un épinglé du compte : les clés inconnues, les « ＋ » et la recherche sont ignorées, les doublons ôtés
  DB.crescite_preferences = [{ user_id: UID, cle: 'menu.epingles', valeur: ['date', 'journal', 'inconnue', 'recherche', 'journal', 'editer', 'proposer', 'tableur'], modifie_le: new Date().toISOString() }];
  await page.reload(); await page.waitForSelector('#menu .menu-epingle', { timeout: 15000 });
  ok('3 · la clé du compte est normalisée : « date », « proposer » (des « ＋ »), « recherche », « inconnue » et le doublon sont ignorés, l’ordre est celui du compte', (await epingles(page)).join() === 'journal,editer,tableur', (await epingles(page)).join());
  DB.crescite_preferences = [{ user_id: UID, cle: 'menu.epingles', valeur: 'n’importe quoi', modifie_le: new Date().toISOString() }];
  await page.reload(); await page.waitForSelector('#menu .menu-epingle', { timeout: 15000 });
  ok('3 · une clé mal formée est remplacée par les sept d’office', (await epingles(page)).join() === 'tableur,feuilles,planning,devis,frais,journal,site');
  DB.crescite_preferences = [{ user_id: UID, cle: 'menu.epingles', valeur: [], modifie_le: new Date().toISOString() }];
  await page.reload(); await page.waitForSelector('#menu .menu-creer', { timeout: 15000 });
  await page.waitForTimeout(400);
  ok('3 · une liste vide est un choix : aucun épinglé, « Créer » et l’étiquette restent', (await compte(page, '.menu-epingle')) === 0 && (await compte(page, '.menu-creer')) === 1);
  ok('3 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  repartir();
  await ctx.close();
}

// ================================================================================ 4 · le menu d'un épinglé, « Mettre dans le menu »
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 1000, hash: '#/accueil' });
  await page.waitForSelector('#menu .menu-epingle', { timeout: 15000 });
  await ouvrirMenu(page, '.menu-epingle[data-action="tableur"]');
  const m1 = await boite(page);
  ok('4 · Maj+F10 sur « Tableur des séances » : Ouvrir, Ouvrir dans un nouvel onglet, Retirer du menu, Descendre (le premier ne monte pas)', m1.join(' | ') === 'Ouvrir | Ouvrir dans un nouvel onglet | Retirer du menu | Descendre', JSON.stringify(m1));
  await page.click('.gm-boite [data-gm]:has-text("Retirer du menu")');
  await page.waitForTimeout(300);
  const apres = await epingles(page);
  ok('4 · « Retirer du menu » : l’épinglé disparaît, ECRITURES porte menu.epingles sans « tableur », écrite aussitôt', apres.join() === 'feuilles,planning,devis,frais,journal,site' && ecrites().length === 1 && ecrites()[0].user_id === UID && ecrites()[0].valeur.join() === 'feuilles,planning,devis,frais,journal,site', JSON.stringify(ecrites().map(x => x.valeur)));
  const annonce = await page.evaluate(() => { const a = [...document.querySelectorAll('.annonce')].find(x => /menu/.test(x.textContent)); return { texte: a?.querySelector('span')?.textContent, annuler: [...(a?.querySelectorAll('button') || [])].some(b => b.textContent.trim() === 'Annuler'), n: document.querySelectorAll('.annonce').length }; });
  ok('4 · l’annonce dit « « Tableur des séances » n’est plus dans le menu. » et offre « Annuler »', /Tableur des séances.* n’est plus dans le menu/.test(annonce.texte || '') && annonce.annuler, JSON.stringify(annonce));
  await page.click('.annonce:has-text("n’est plus dans le menu") button[data-tt="retour"]'); await page.waitForTimeout(500);
  ok('4 · « Annuler » remet l’épinglé à sa place et réécrit la clé', (await epingles(page)).join() === 'tableur,feuilles,planning,devis,frais,journal,site' && ecrites().length === 2 && ecrites()[1].valeur.join() === 'tableur,feuilles,planning,devis,frais,journal,site', JSON.stringify(ecrites().map(x => x.valeur.join())));
  // le clic droit sur l'action de la tuile (la tuile garde ses dix actions)
  await page.waitForSelector(`${tuile('actions')} .tb-actions [data-action="tableur"]`);
  await page.click(`${tuile('actions')} .tb-actions [data-action="tableur"]`, { button: 'right' });
  await page.waitForSelector('.gm-boite');
  const tuileMenu = await boite(page);
  ok('4 · le clic droit sur une action de la tuile déjà au menu propose « Retirer du menu » (et garde « Retirer des actions rapides »)', tuileMenu.some(x => /^Retirer du menu/.test(x)) && tuileMenu.some(x => /^Retirer des actions rapides/.test(x)) && !tuileMenu.some(x => /^Mettre dans le menu/.test(x)), JSON.stringify(tuileMenu));
  await page.click('.gm-boite [data-gm]:has-text("Retirer du menu")'); await page.waitForTimeout(300);
  ok('4 · … il le retire du menu sans toucher à la tuile', !(await epingles(page)).includes('tableur') && (await compte(page, `${tuile('actions')} .tb-actions > *`)) === 10);
  await page.click(`${tuile('actions')} .tb-actions [data-action="tableur"]`, { button: 'right' });
  await page.waitForSelector('.gm-boite');
  const tuileMenu2 = await boite(page);
  ok('4 · puis propose « Mettre dans le menu » ; ni « ＋ » ni « Rechercher » n’en proposent', tuileMenu2.some(x => /^Mettre dans le menu/.test(x)) && !tuileMenu2.some(x => /^Retirer du menu/.test(x)), JSON.stringify(tuileMenu2));
  await page.click('.gm-boite [data-gm]:has-text("Mettre dans le menu")'); await page.waitForTimeout(300);
  ok('4 · « Mettre dans le menu » remet « Tableur » (en dernier, il n’a plus sa place) et écrit la clé', (await epingles(page)).join() === 'feuilles,planning,devis,frais,journal,site,tableur' && ecrites().at(-1).valeur.join() === 'feuilles,planning,devis,frais,journal,site,tableur', (await epingles(page)).join());
  ok('4 · la tuile garde ses dix actions, le premier élément est « ＋ Nouvelle date » (le banc du tableau de bord reste vert)', (await compte(page, `${tuile('actions')} .tb-actions > *`)) === 10 && (await texte(page, `${tuile('actions')} .tb-actions > *:first-child`)) === '＋ Nouvelle date');
  for (const k of ['date', 'recherche', 'prospect']) {
    await page.click(`${tuile('actions')} .tb-actions [data-action="${k}"]`, { button: 'right' });
    await page.waitForSelector('.gm-boite');
    ok(`4 · « ${k} » n’a pas de « Mettre dans le menu » (une création, ou la recherche)`, !(await boite(page)).some(x => /menu/.test(x)), JSON.stringify(await boite(page)));
    await page.keyboard.press('Escape'); await page.waitForTimeout(80);
  }
  // monter, descendre
  await ouvrirMenu(page, '.menu-epingle[data-action="planning"]');
  const m2 = await boite(page);
  ok('4 · le menu d’un épinglé du milieu propose Monter et Descendre', m2.some(x => x === 'Monter') && m2.some(x => x === 'Descendre'), JSON.stringify(m2));
  await page.click('.gm-boite [data-gm]:has-text("Descendre")'); await page.waitForTimeout(300);
  ok('4 · « Descendre » : « Planning » passe après les devis, la clé est écrite', (await epingles(page)).join() === 'feuilles,devis,planning,frais,journal,site,tableur' && ecrites().at(-1).valeur.join() === 'feuilles,devis,planning,frais,journal,site,tableur', (await epingles(page)).join());
  ok('4 · le focus revient sur l’épinglé déplacé (il a été redessiné ailleurs)', await page.evaluate(() => document.activeElement?.dataset.action === 'planning'));
  await ouvrirMenu(page, '.menu-epingle[data-action="tableur"]');
  ok('4 · le dernier ne descend pas : « Monter » seulement', (await boite(page)).some(x => x === 'Monter') && !(await boite(page)).some(x => x === 'Descendre'), JSON.stringify(await boite(page)));
  await page.click('.gm-boite [data-gm]:has-text("Monter")'); await page.waitForTimeout(300);
  ok('4 · « Monter » : « Tableur » passe avant le site', (await epingles(page)).join() === 'feuilles,devis,planning,frais,journal,tableur,site');
  await page.click('.annonce:has-text("monte d’un cran") button[data-tt="retour"]'); await page.waitForTimeout(500);
  ok('4 · « Annuler » défait le déplacement', (await epingles(page)).join() === 'feuilles,devis,planning,frais,journal,site,tableur');
  // le site : un lien hors de l'administration
  await ouvrirMenu(page, '.menu-epingle[data-action="site"]');
  const ms = await page.$$eval('.gm-boite [data-gm]', xs => xs.map(x => [x.textContent.replace(/\s+/g, ' ').trim(), x.getAttribute('href'), x.getAttribute('target')]));
  ok('4 · le menu du site : Ouvrir (dans un onglet à part), Retirer du menu ; pas de doublon « nouvel onglet »', ms[0][0].startsWith('Ouvrir') && ms[0][2] === '_blank' && !ms.some(x => /nouvel onglet/.test(x[0])) && ms.some(x => /^Retirer du menu/.test(x[0])), JSON.stringify(ms));
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  ok('4 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  repartir();
  await ctx.close();
}

// ================================================================================ 5 · les récents
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 1000, hash: '#/accueil' });
  await page.waitForSelector('#menu .menu-creer', { timeout: 15000 });
  await page.evaluate(() => localStorage.removeItem('crescite-admin-recentes'));
  await page.reload(); await page.waitForSelector('#menu .menu-creer', { timeout: 15000 });
  ok('5 · sans fiche ouverte, la section « Récents » n’est pas là (hidden) : une étiquette sans rien dessous ne servirait à rien', await page.$eval('.menu-recents', z => z.hidden && getComputedStyle(z).display === 'none'));
  await page.evaluate(() => { location.hash = '#/representations/101'; });
  await attendre(page, () => document.querySelector('.menu-recent'));
  await page.evaluate(() => { location.hash = '#/lieux/5'; });
  await attendre(page, () => document.querySelectorAll('.menu-recent').length === 2);
  const r = await page.evaluate(() => ({ textes: [...document.querySelectorAll('.menu-recent')].map(a => a.textContent), hrefs: [...document.querySelectorAll('.menu-recent')].map(a => a.getAttribute('href')), titres: [...document.querySelectorAll('.menu-recent')].map(a => a.title), etiquette: document.querySelector('#menu-recents-t')?.textContent,
    groupe: document.querySelector('.menu-recents').getAttribute('aria-labelledby'), classeNav: !!document.querySelector('.menu-recent.nav, .menu-recent[aria-current]'), courantes: document.querySelectorAll('#menu a[aria-current="page"]').length, haut: Math.min(...[...document.querySelectorAll('.menu-recent')].map(a => a.getBoundingClientRect().height)) }));
  ok('5 · ouvrir #/representations/101 puis #/lieux/5 : « Récents » montre les deux, le lieu d’abord (« Lieu · Théâtre de Caen », « Date · Bérénice, 30 oct. »)', r.textes.length === 2 && r.textes[0] === 'Lieu · Théâtre de Caen' && /^Date · Bérénice, \d{1,2} [^ ]+\.?$/.test(r.textes[1]), JSON.stringify(r.textes));
  ok('5 · ce sont des liens ordinaires vers les fiches, avec leur infobulle, sans aria-current ; la section a son étiquette « Récents »', r.hrefs.join() === '#/lieux/5,#/representations/101' && r.titres.join() === r.textes.join() && r.etiquette === 'Récents' && r.groupe === 'menu-recents-t' && !r.classeNav && r.courantes === 1, JSON.stringify(r));
  // la même liste que la recherche, celle de localStorage
  const ls = await page.evaluate(() => JSON.parse(localStorage.getItem('crescite-admin-recentes')));
  ok('5 · la liste est celle de la recherche (localStorage crescite-admin-recentes), pas une seconde : pas de sessionStorage crescite-admin-recents', ls.join() === '#/lieux/5,#/representations/101' && (await page.evaluate(() => sessionStorage.getItem('crescite-admin-recents'))) === null, JSON.stringify(ls));
  // une fiche créée compte comme une fiche ouverte (remplacerAdresse)
  await page.evaluate(() => remplacerAdresse('#/lieux/7'));
  await attendre(page, () => document.querySelectorAll('.menu-recent').length === 3);
  ok('5 · une fiche créée (remplacerAdresse) rejoint les récents, en tête', (await recents(page))[0] === 'Lieu · Lycée Voltaire' && (await recents(page)).length === 3, JSON.stringify(await recents(page)));
  // cinq au plus, une fiche supprimée disparaît, un nom suit
  await page.evaluate(() => { for (const h of ['#/equipe/1', '#/spectacles/berenice', '#/lieux/6', '#/representations/102']) noterRecente(h); });
  const cinq = await recents(page);
  ok('5 · cinq au plus, la plus récente en tête : date, lieu, spectacle, personne, lieu', cinq.length === 5 && /^Date · La Folle Idée, \d{1,2} [^ ]+\.?$/.test(cinq[0]) && cinq.slice(1).join(' / ') === 'Lieu · Le Volcan / Spectacle · Bérénice / Personne · Camille Essai / Lieu · Lycée Voltaire', cinq.join(' / '));
  await page.evaluate(() => { localStorage.setItem('crescite-admin-recentes', JSON.stringify(['#/lieux/999', '#/lieux/6', '#/textes/inexistant', '#/equipe/1'])); CADRE.recents(); });
  ok('5 · une fiche supprimée (#/lieux/999) ou inconnue disparaît de la liste ; les autres restent', (await recents(page)).join(' / ') === 'Lieu · Le Volcan / Personne · Camille Essai', (await recents(page)).join(' / '));
  await page.evaluate(() => { E.lieux.find(l => l.id === 6).nom = 'Le Grand Volcan'; CADRE.marquer('accueil'); });
  ok('5 · un nom changé se relit à chaque vue (le lien garde son adresse, son texte suit)', (await recents(page)).join(' / ') === 'Lieu · Le Grand Volcan / Personne · Camille Essai', (await recents(page)).join(' / '));
  // un autre onglet du même navigateur
  const autre = await ctx.newPage();
  await autre.goto(page.url().split('#')[0] + '#/lieux/8');
  await autre.waitForSelector('main#vue', { timeout: 20000 });
  await autre.waitForFunction(() => document.querySelector('.menu-recent'), null, { timeout: 8000 }).catch(() => {});
  const vu = await attendre(page, () => document.querySelector('.menu-recent')?.textContent === 'Lieu · Théâtre de Flers');
  ok('5 · un autre onglet qui ouvre une fiche la met en tête chez celui-ci aussi : les récents sont partagés entre onglets (localStorage)', vu, (await recents(page)).join());
  await autre.close();
  // le lien mène à la fiche
  await page.click('.menu-recent >> nth=0');
  await attendre(page, () => location.hash === '#/lieux/8');
  ok('5 · un clic sur un récent ouvre la fiche', (await hash(page)) === '#/lieux/8');
  // les flèches ↑ ↓ passent de « Créer » aux épinglés, puis aux récents (GESTES.fleches, une seule liste)
  const focus = () => page.evaluate(() => { const a = document.activeElement; return a ? (a.classList.contains('menu-creer') ? 'creer' : a.classList.contains('menu-epingle') ? 'epingle:' + a.dataset.action : a.classList.contains('menu-recent') ? 'recent:' + a.getAttribute('href') : 'autre') : ''; });
  await page.focus('.menu-creer'); await page.keyboard.press('ArrowDown');
  const f1 = await focus();
  await page.focus('.menu-epingle[data-action="site"]'); await page.keyboard.press('ArrowDown');
  const f2 = await focus();
  await page.keyboard.press('ArrowUp');
  const f3 = await focus();
  await page.focus('.menu-recent >> nth=0'); await page.keyboard.press('ArrowUp');
  const f4 = await focus();
  ok('5 · ↓ depuis « Créer » passe au premier épinglé, ↓ depuis le dernier épinglé au premier récent, ↑ en revient ; ↑ depuis le premier récent mène au dernier épinglé', f1 === 'epingle:tableur' && f2.startsWith('recent:') && f3 === 'epingle:site' && f4 === 'epingle:site', [f1, f2, f3, f4].join(' / '));
  // la recherche, champ vide : les récents en tête
  await page.keyboard.press('Control+k'); await page.waitForSelector('dialog#recherche[open]');
  const rch = await page.evaluate(() => ({ entete: document.querySelector('#rch-entete').textContent, titres: [...document.querySelectorAll('#rch-liste .rch-corps b')].slice(0, 3).map(b => b.textContent), groupes: [...document.querySelectorAll('#rch-liste .rch-groupe')].map(g => g.textContent) }));
  ok('5 · Ctrl K sans rien taper : « Ouvertes récemment » en tête, les mêmes fiches, puis « Prochaines dates »', rch.entete === 'Ouvertes récemment' && rch.titres[0] === 'Théâtre de Flers' && rch.groupes.join() === 'Prochaines dates', JSON.stringify(rch));
  await fermerRecherche(page);
  // une fiche ouverte en tiroir (TIROIR.ouvrir) rejoint les récents, comme une fiche en page
  await page.evaluate(() => TIROIR.ouvrir('#/lieux/5'));
  await attendre(page, () => document.querySelector('.menu-recent')?.textContent === 'Lieu · Théâtre de Caen');
  ok('5 · une fiche ouverte en tiroir (TIROIR.ouvrir) rejoint les récents, en tête, sans quitter la page', (await recents(page))[0] === 'Lieu · Théâtre de Caen' && (await hash(page)) === '#/lieux/8', (await recents(page)).join(' / '));
  await page.evaluate(() => TIROIR.fermerTout());
  await page.waitForTimeout(300);
  ok('5 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 6 · la recherche, barre de commande
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await page.waitForSelector('#menu .menu-creer', { timeout: 15000 });
  await chercher(page, 'replier');
  const rep = await options(page);
  ok('6 · « replier » (menu déplié, 1 440 px) : « Replier le menu », une Action, la touche « Alt M » à côté du genre', rep[0][0] === 'Replier le menu' && rep[0][1] === 'Action' && rep[0][2] === 'Alt M', JSON.stringify(rep.slice(0, 3)));
  const dom = await page.evaluate(() => { const o = document.querySelector('#rch-liste [role=option]'), t = o.querySelector('.rch-touche'), ty = o.querySelector('.rch-type'); return { frere: t?.parentElement === ty?.parentElement && t !== ty, dansType: !!ty.querySelector('kbd'), kbd: t?.querySelectorAll('kbd').length, typeTexte: ty.textContent, dernier: o.lastElementChild === ty, title: t?.title, avant: t?.nextElementSibling === ty }; });
  ok('6 · la touche est dans un <span class="rch-touche"> frère de .rch-type, jamais dedans : le genre reste « Action » en égalité ; deux <kbd> (« Alt », « M »), l’infobulle dit « Raccourci : Alt + M »', dom.frere && !dom.dansType && dom.kbd === 2 && dom.typeTexte === 'Action' && dom.dernier && dom.avant && dom.title === 'Raccourci : Alt + M', JSON.stringify(dom));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/recherche-commandes.png`, fullPage: false });
  await page.keyboard.press('Enter');
  await attendre(page, () => document.documentElement.classList.contains('menu-replie'));
  for (let i = 0; i < 40 && !ECRITURES.some(x => x.cle === 'menu.replie'); i++) await page.waitForTimeout(50);
  ok('6 · Entrée sur « Replier le menu » : html.menu-replie, la clé menu.replie est écrite', await page.evaluate(() => document.documentElement.classList.contains('menu-replie')) && ECRITURES.some(x => x.cle === 'menu.replie' && x.valeur === true));
  await chercher(page, 'deplier');
  const dep = await options(page);
  ok('6 · menu replié, « déplier » propose « Déplier le menu » (le « sous » fait trouver « replier » comme « déplier » dans les deux états)', dep[0][0] === 'Déplier le menu' && dep[0][2] === 'Alt M', JSON.stringify(dep.slice(0, 2)));
  await fermerRecherche(page);
  await chercher(page, 'replier');
  ok('6 · … et « replier » le trouve aussi', (await options(page))[0][0] === 'Déplier le menu');
  await page.keyboard.press('Enter');
  await attendre(page, () => !document.documentElement.classList.contains('menu-replie'));
  ok('6 · Entrée sur « Déplier le menu » : le menu se redéplie', await page.evaluate(() => !document.documentElement.classList.contains('menu-replie')));
  // les vues
  await chercher(page, 'vue carte');
  const vc = await options(page);
  ok('6 · « vue carte » : l’entrée « Carte de tournée », une Rubrique, la touche « V C » ; elle ne se double pas', vc[0][0] === 'Carte de tournée' && vc[0][1] === 'Rubrique' && vc[0][2] === 'V C' && vc.filter(o => o[0] === 'Carte de tournée').length === 1, JSON.stringify(vc.slice(0, 3)));
  await page.keyboard.press('Enter');
  await attendre(page, () => location.hash === '#/representations/carte');
  ok('6 · Entrée sur « vue carte » mène à #/representations/carte', (await hash(page)) === '#/representations/carte');
  await chercher(page, 'vue');
  const vues = (await options(page)).filter(o => o[2] && /^V /.test(o[2])).map(o => `${o[0]}:${o[2]}`);
  ok('6 · « vue » : « Vue liste » (V L), « Tableur » (V T) et « Carte de tournée » (V C), chacune une fois', vues.sort().join() === 'Carte de tournée:V C,Tableur:V T,Vue liste:V L', vues.join());
  await fermerRecherche(page);
  await chercher(page, 'vue liste');
  await page.keyboard.press('Enter');
  await attendre(page, () => location.hash === '#/representations');
  ok('6 · Entrée sur « Vue liste » mène à #/representations', (await hash(page)) === '#/representations');
  // les douze rubriques avec leur séquence
  await chercher(page, 'rubrique');
  const rub = (await options(page)).filter(o => /^G [A-Z]$/.test(o[2]));
  const TOUCHES = { 'Tableau de bord': 'G T', 'Représentations': 'G D', 'Planning': 'G P', 'Feuilles de route': 'G F', 'Spectacles': 'G S', 'Équipe': 'G E', 'Diffusion CRM': 'G C', 'Espace pro': 'G O', 'Ateliers': 'G A', 'Lieux': 'G L', 'Textes du site': 'G X', 'Journal': 'G J' };
  ok('6 · les douze rubriques portent leur séquence (« Représentations » G D, « Diffusion CRM » G C…), sans entrée nouvelle : chacune une seule fois', rub.length === 12 && rub.every(o => TOUCHES[o[0]] === o[2] && o[1] === 'Rubrique') && new Set(rub.map(o => o[0])).size === 12, JSON.stringify(rub));
  ok('6 · l’infobulle de la touche d’une rubrique dit la suite en toutes lettres (« Raccourci : G puis D »)', await page.evaluate(() => [...document.querySelectorAll('#rch-liste [role=option]')].find(o => o.querySelector('.rch-corps b')?.textContent === 'Représentations')?.querySelector('.rch-touche')?.title === 'Raccourci : G puis D'));
  await fermerRecherche(page);
  // les existants : le premier résultat et son genre en égalité (ce que figent les bancs)
  await chercher(page, 'nouvelle date');
  ok('6 · « nouvelle date » : l’Action en premier, sans touche, son genre « Action » en égalité', JSON.stringify((await options(page))[0]) === JSON.stringify(['Nouvelle date', 'Action', '']), JSON.stringify((await options(page))[0]));
  await fermerRecherche(page);
  await chercher(page, 'planning');
  const pl = await options(page);
  ok('6 · une recherche sans commande du cadre garde ses résultats : « planning » trouve la rubrique avec sa touche, la Rubrique en genre', pl.some(o => o[0] === 'Planning' && o[1] === 'Rubrique' && o[2] === 'G P'), JSON.stringify(pl.slice(0, 4)));
  await fermerRecherche(page);
  ok('6 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 7 · le menu replié, le téléphone
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 1000, hash: '#/lieux/5' });
  await page.waitForSelector('#menu .menu-epingle', { timeout: 15000 });
  await page.evaluate(() => { location.hash = '#/representations/101'; });
  await attendre(page, () => document.querySelectorAll('.menu-recent').length === 2);
  await page.click('.menu-replier');
  await attendre(page, () => document.documentElement.classList.contains('menu-replie'));
  await page.evaluate(async () => { await Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))); });
  const r = await page.evaluate(() => { const xs = [...document.querySelectorAll('.menu-epingle')], c = document.querySelector('.menu-creer').getBoundingClientRect(), z = document.querySelector('.menu-recents'), e = document.querySelector('.menu-etiq');
    return { n: xs.length, titres: xs.every(a => a.title.length > 2), sr: xs.every(a => { const l = a.querySelector('.menu-l').getBoundingClientRect(); return Math.round(l.width) <= 1 && Math.round(l.height) <= 1; }), larges: Math.min(...xs.map(a => a.getBoundingClientRect().width)), svg: xs.every(a => a.querySelector('svg.ico')),
      creer: { w: Math.round(c.width), h: Math.round(c.height) }, creerMot: Math.round(document.querySelector('.menu-creer .menu-l').getBoundingClientRect().width) <= 1, recents: getComputedStyle(z).display, etiq: getComputedStyle(e).display, aside: Math.round(document.querySelector('#menu').getBoundingClientRect().width), deborde: document.documentElement.scrollWidth > innerWidth }; });
  ok('7 · replié : « ＋ » et les sept épinglés restent, des icônes (le nom en .sr d’1 px, en infobulle), 44 px au moins en largeur ; les récents et l’étiquette disparaissent', r.n === 7 && r.titres && r.sr && r.svg && r.larges >= 44 && r.creer.w >= 44 && r.creer.h >= 44 && r.creerMot && r.recents === 'none' && r.etiq === 'none' && r.aside === 64 && !r.deborde, JSON.stringify(r));
  await page.click('.menu-creer'); await page.waitForSelector('.gm-boite');
  const mr = await page.evaluate(() => { const x = document.querySelector('.gm-boite').getBoundingClientRect(), c = document.querySelector('.menu-creer').getBoundingClientRect(); return { dedans: x.left >= 0 && x.top >= 0 && x.right <= innerWidth && x.bottom <= innerHeight, hors: x.left >= c.right - 1 || x.bottom <= c.top + 1 || x.top >= c.bottom - 1, n: document.querySelectorAll('.gm-boite [data-gm]').length }; });
  ok('7 · replié, « ＋ » ouvre le même menu, posé dans l’écran sans recouvrir le bouton', mr.n === 7 && mr.dedans && mr.hors, JSON.stringify(mr));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/acces-replie.png`, fullPage: false });
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  await page.click('.menu-epingle[data-action="journal"]');
  await attendre(page, () => location.hash === '#/journal');
  ok('7 · replié, un clic sur l’icône d’un épinglé ouvre sa page', (await hash(page)) === '#/journal');
  ok('7 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 390, hauteur: 844, hash: '#/accueil' });
  await page.waitForSelector('main#vue', { timeout: 15000 });
  await page.waitForTimeout(500);
  const t = await page.evaluate(() => ({ visible: !!document.querySelector('#menu')?.getClientRects().length, onglets: [...document.querySelectorAll('.ob-barre > *')].map(x => x.textContent.trim()).join() }));
  ok('7 · 390 px : le menu latéral et ses accès rapides sont masqués, la barre du bas garde ses cinq onglets', !t.visible && t.onglets === 'Tableau,Dates,Planning,Équipe,Plus', JSON.stringify(t));
  await page.evaluate(() => ouvrirRecherche());
  await page.fill('#rch-q', 'replier'); await page.waitForTimeout(150);
  ok('7 · 390 px : la recherche ne propose pas « Replier le menu » (il n’y a pas de menu)', !(await options(page)).some(o => /menu/i.test(o[0] || '')), JSON.stringify(await options(page)));
  await page.fill('#rch-q', 'planning'); await page.waitForTimeout(150);
  const tch = await page.evaluate(() => { const xs = [...document.querySelectorAll('#rch-liste .rch-touche')]; return { n: xs.length, visibles: xs.filter(x => getComputedStyle(x).display !== 'none' || x.getClientRects().length).length, options: document.querySelectorAll('#rch-liste [role=option]').length }; });
  ok('7 · 390 px : une commande de la recherche (« planning ») porte sa touche dans le DOM, mais aucune touche de clavier n’est visible au téléphone', tch.options > 0 && tch.n > 0 && tch.visibles === 0, JSON.stringify(tch));
  await page.keyboard.press('Escape');
  ok('7 · aucune erreur de script (390 px)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 7 bis · un écran bas
// un portable (1 440 × 720, puis 1 366 × 768) : « Créer » ne défile pas avec les épinglés, il reste entier dans l'écran
for (const [largeur, hauteur] of [[1440, 720], [1366, 768]]) {
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur, hauteur, hash: '#/accueil' });
  await page.waitForSelector('#menu .menu-creer', { timeout: 15000 });
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => { const b = document.querySelector('.menu-creer').getBoundingClientRect(), e = document.querySelector('.menu-etiq').getBoundingClientRect(), m = document.querySelector('#menu').getBoundingClientRect(), d = document.querySelector('.menu-defile').getBoundingClientRect();
    return { haut: Math.round(b.top), bas: Math.round(b.bottom), h: Math.round(b.height), hauteurEcran: innerHeight, etiq: Math.round(e.top), menuBas: Math.round(m.bottom), defile: Math.round(d.height), premier: Math.round(document.querySelector('.menu-epingle').getBoundingClientRect().top) }; });
  ok(`7 bis · ${largeur} × ${hauteur} : « Créer » est entier dans l’écran (44 px de haut, ni rogné ni sous le bord), l’étiquette au-dessus`, r.h >= 44 && r.bas <= r.hauteurEcran && r.haut > r.etiq && r.bas <= r.menuBas, JSON.stringify(r));
  ok(`7 bis · ${largeur} × ${hauteur} : la zone des épinglés et des récents prend ce qui reste et défile d’elle-même (elle ne s’écrase pas à rien)`, await page.$eval('.menu-defile', z => getComputedStyle(z).overflowY === 'auto' && z.getBoundingClientRect().height > 0), JSON.stringify(r));
  ok(`7 bis · ${largeur} × ${hauteur} : aucune erreur de script`, erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 8 · le mouvement
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 1000, hash: '#/accueil' });
  await page.waitForSelector('#menu .menu-epingle', { timeout: 15000 });
  await page.evaluate(() => localStorage.removeItem('crescite-admin-recentes'));
  await page.click('.menu-epingle[data-action="tableur"]', { button: 'right' });
  await page.waitForSelector('.gm-boite');
  const gm = await page.evaluate(() => document.querySelector('.gm-boite').getAnimations().map(a => a.animationName));
  ok('8 · le menu d’un épinglé est un menu de GESTES : il paraît en gm-paraitre (140 ms), rien d’ajouté dans index.html', gm.includes('gm-paraitre'), JSON.stringify(gm));
  await page.click('.gm-boite [data-gm]:has-text("Retirer du menu")');
  await page.waitForTimeout(600);
  await page.click(`${tuile('actions')} .tb-actions [data-action="tableur"]`, { button: 'right' });
  await page.waitForSelector('.gm-boite');
  await page.click('.gm-boite [data-gm]:has-text("Mettre dans le menu")');
  await page.waitForTimeout(40);
  const pop = await page.evaluate(() => { const a = document.querySelector('.menu-epingle[data-action="tableur"]'); return a ? a.getAnimations().map(x => [x.animationName, x.effect.getTiming().duration]) : null; });
  ok('8 · un épinglé qui arrive saute : ad-pop, 450 ms (le ressort)', !!pop && pop.some(x => x[0] === 'ad-pop' && x[1] === 450), JSON.stringify(pop));
  await page.waitForTimeout(550);
  ok('8 · … et la classe .pop s’ôte à la fin : rien ne rejoue au prochain dessin', await page.evaluate(() => !document.querySelector('.menu-epingle[data-action="tableur"]').classList.contains('pop') && document.querySelector('.menu-epingle[data-action="tableur"]').getAnimations().length === 0));
  await page.evaluate(() => { location.hash = '#/lieux/5'; });
  await page.waitForTimeout(40);
  const arrive = await page.evaluate(() => { const a = document.querySelector('.menu-recent'); return a ? a.getAnimations().map(x => [x.animationName, x.effect.getTiming().duration]) : null; });
  ok('8 · un récent neuf se pose : ad-arrive, 300 ms', !!arrive && arrive.some(x => x[0] === 'ad-arrive' && x[1] === 300), JSON.stringify(arrive));
  await page.waitForTimeout(500);
  await page.evaluate(() => { location.hash = '#/lieux/6'; });
  await page.waitForTimeout(40);
  const reste = await page.evaluate(() => [...document.querySelectorAll('.menu-recent')].map(a => [a.textContent, a.getAnimations().length]));
  ok('8 · le récent d’avant ne rejoue rien : seul le neuf s’anime', reste.length === 2 && reste[0][1] === 1 && reste[1][1] === 0, JSON.stringify(reste));
  ok('8 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 1000, hash: '#/accueil', reduit: true });
  await page.waitForSelector('#menu .menu-epingle', { timeout: 15000 });
  await page.click(`${tuile('actions')} .tb-actions [data-action="tableur"]`, { button: 'right' });
  await page.waitForSelector('.gm-boite');
  await page.click('.gm-boite [data-gm]:has-text("Retirer du menu")'); await page.waitForTimeout(500);
  await page.click(`${tuile('actions')} .tb-actions [data-action="tableur"]`, { button: 'right' });
  await page.waitForSelector('.gm-boite');
  await page.click('.gm-boite [data-gm]:has-text("Mettre dans le menu")');
  await page.waitForTimeout(60);
  await page.evaluate(() => { location.hash = '#/lieux/5'; });
  await page.waitForTimeout(60);
  const an = await page.evaluate(() => ({ menu: document.querySelector('.menu-acces').getAnimations({ subtree: true }).length, epingle: !!document.querySelector('.menu-epingle[data-action="tableur"]'), recent: document.querySelectorAll('.menu-recent').length, pop: document.querySelectorAll('.pop, .ad-neuf').length }));
  ok('8 · sous « moins d’animations » : « Mettre dans le menu » et un récent neuf arrivent sans que rien ne bouge (aucune animation dans les accès rapides, aucune classe d’arrivée)', an.epingle && an.recent === 1 && an.menu === 0 && an.pop === 0, JSON.stringify(an));
  await page.click('.menu-creer'); await page.waitForSelector('.gm-boite');
  ok('8 · … le menu « Créer » s’ouvre calme (gm-calme, aucune animation)', await page.evaluate(() => document.querySelector('.gm').classList.contains('gm-calme') && document.querySelector('.gm-boite').getAnimations().length === 0));
  ok('8 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 9 · l'aide, sans la table des préférences
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await page.waitForSelector('#menu .menu-creer', { timeout: 15000 });
  await page.keyboard.press('?');
  await page.waitForSelector('dialog.gq-aide[open]');
  const aide = await page.evaluate(() => [...document.querySelectorAll('dialog.gq-aide section')].map(s => ({ titre: s.querySelector('h3').textContent.replace(/\s*ici$/, ''), lignes: [...s.querySelectorAll('.gq-aide-l')].map(l => l.querySelector('dd').textContent.trim()) })).find(g => g.titre === 'Les accès rapides'));
  ok('9 · l’aide « ? » a son groupe « Les accès rapides » : « Créer », Maj+F10 sur un épinglé, la barre de commande', !!aide && aide.lignes.length === 3 && /Créer/.test(aide.lignes[0]) && /épinglé/.test(aide.lignes[1]) && /replier/.test(aide.lignes[2]), JSON.stringify(aide));
  await page.keyboard.press('Escape');
  ok('9 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil', prefsAbsentes: true });
  await page.waitForSelector('#menu .menu-epingle', { timeout: 15000 });
  await page.click('.menu-epingle[data-action="journal"]', { button: 'right' });
  await page.waitForSelector('.gm-boite');
  await page.click('.gm-boite [data-gm]:has-text("Retirer du menu")'); await page.waitForTimeout(500);
  await page.reload(); await page.waitForSelector('#menu .menu-epingle', { timeout: 15000 });
  ok('9 · sans le script SQL des préférences, les épinglés se gardent sur l’appareil : « Journal » retiré le reste au rechargement', !(await epingles(page)).includes('journal') && (await epingles(page)).length === 6, (await epingles(page)).join());
  ok('9 · aucune erreur de script (sans préférences)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

await navigateur.close();
bilan(CAPT);
