// La passe « mouvement réduit » de l'administration, vérifiée dans Chromium, hors ligne, sur la base fictive commune
// (admin-fictif.mjs, ouvrir({ reduit: true }) : prefers-reduced-motion: reduce).
//   node site/reduit.mjs
// Quatre gestes, tous au clavier, enchaînés dans la même page : le repli du menu (Alt+M), l'ouverture d'un tiroir (Entrée sur
// une ligne de la liste des dates), la remise d'une poignée (Entrée sur « Disposition d'origine ») et le passage du tableur de
// Simple à Complet (Entrée sur le bouton « Complet »). Après chaque geste :
//   - aucune animation à durée non nulle : document.getAnimations() filtré par
//     `!(a instanceof CSSTransition) || a.effect.getTiming().duration > 0` est vide (une transition CSS à durée nulle n'est pas
//     une animation) ; et aucune transition ne s'est lancée pendant le geste (l'événement transitionrun, écouté dès avant) ;
//   - les valeurs finales déjà en place à 0 puis à 50 ms (--large-menu et la classe du menu, la place du tiroir, --l-liste et la
//     largeur de la liste, la classe du mode du tableur) : l'immobilité est une arrivée instantanée, pas une absence d'arrivée.
// Un témoin garde la sonde honnête : le même repli du menu et la même ouverture de tiroir, sans « réduire », laissent bien des
// animations dans la page. Les captures vont dans site/dist/shots-reduit/. Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, DB, UID, ECRITURES, ok, ouvrir, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-reduit');
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
const attendre = (page, fn, arg = null, ms = 8000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 'raf' }).then(() => true, () => false);
const fin = (nom, erreurs) => ok(`${nom} · aucune erreur de script`, erreurs.length === 0, erreurs.join(' / '));

// ce qui bouge encore dans la page : le filtre du plan (une transition CSS à durée nulle n'est pas une animation)
const ANIMATIONS = () => document.getAnimations()
  .filter(a => !(a instanceof CSSTransition) || a.effect.getTiming().duration > 0)
  .map(a => `${a instanceof CSSTransition ? a.transitionProperty : a.animationName} ${a.effect.getTiming().duration} ms`);
const animations = page => page.evaluate(ANIMATIONS);
// les transitions lancées depuis la dernière remise à zéro (une transition à durée nulle ne se lance pas)
const compter = page => page.evaluate(() => { window.__lancees = []; document.addEventListener('transitionrun', e => window.__lancees.push(`${e.propertyName} ${e.target.className || e.target.tagName}`), true); });
const lancees = page => page.evaluate(() => window.__lancees.slice());
// la lecture d'un instant : juste après le geste (0 ms), puis 50 ms plus tard ; les deux doivent dire la même chose, la valeur finale
async function instants(page, lire) {
  const a0 = await page.evaluate(lire), anim0 = await animations(page);
  await page.waitForTimeout(50);
  const a50 = await page.evaluate(lire), anim50 = await animations(page);
  return { a0, a50, anim: [...anim0, ...anim50], stable: JSON.stringify(a0) === JSON.stringify(a50) };
}
const racine = () => ({ menu: getComputedStyle(document.documentElement).getPropertyValue('--large-menu').trim(), replie: document.documentElement.classList.contains('menu-replie'), largeurMenu: Math.round(document.querySelector('.menu').getBoundingClientRect().width), bouton: document.querySelector('.menu-replier')?.getAttribute('aria-expanded') });
const ecrite = (cle, valeur) => ECRITURES.some(e => e.cle === cle && e.valeur === valeur);

// ================================================================================ 1 · les quatre gestes, sous « réduire »
{
  DB.crescite_preferences = []; ECRITURES.length = 0;
  DB.crescite_preferences.push({ user_id: UID, cle: 'fenetres.liste', valeur: 560 }, { user_id: UID, cle: 'fenetres.tiroir', valeur: 1000 });   // deux poignées déplacées, que le geste 3 remet
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/accueil', reduit: true });
  await page.waitForSelector('.tb-tuile[data-k="prochaines"] a.tb-l[href="#/representations/101"]', { timeout: 15000 });
  await page.waitForTimeout(400);
  const base = await page.evaluate(() => ({ reduit: matchMedia('(prefers-reduced-motion: reduce)').matches, calme: CALME_ADMIN(), immobile: document.documentElement.classList.contains('still'), l: document.documentElement.style.getPropertyValue('--l-liste') }));
  ok('1 · la page est ouverte sous « réduire » (prefers-reduced-motion), sans ?anim=0 : c’est la règle globale qui tient, pas html.still', base.reduit && base.calme && !base.immobile, JSON.stringify(base));
  ok('1 · au départ : le menu déplié (240 px), la colonne des listes gardée à 560 px (--l-liste), aucune animation en cours', JSON.stringify((await instants(page, racine)).a0) === JSON.stringify({ menu: '240px', replie: false, largeurMenu: 240, bouton: 'true' }) && base.l === '560px' && (await animations(page)).length === 0, JSON.stringify(base));
  await compter(page);

  // ---- geste 1 : Alt+M replie le menu
  await page.keyboard.press('Alt+KeyM');
  const g1 = await instants(page, racine);
  ok('1 · Alt+M : aucune animation à durée non nulle, après le geste puis 50 ms plus tard', g1.anim.length === 0, g1.anim.join(' ; '));
  ok('1 · Alt+M : aucune transition ne s’est lancée pendant le geste', (await lancees(page)).length === 0, (await lancees(page)).join(' ; '));
  ok('1 · Alt+M : à 0 puis 50 ms, le menu est déjà replié pour de bon (--large-menu 64px, html.menu-replie, l’aside large de 64 px, « Replier » dit aria-expanded=false)', JSON.stringify(g1.a0) === JSON.stringify({ menu: '64px', replie: true, largeurMenu: 64, bouton: 'false' }) && g1.stable, JSON.stringify({ a0: g1.a0, a50: g1.a50 }));
  await page.screenshot({ path: `${CAPT}/1-menu-replie.png` });

  // ---- geste 2 : Entrée sur une ligne du tableau de bord (les prochaines dates) ouvre la fiche en tiroir
  await page.focus('.tb-tuile[data-k="prochaines"] a.tb-l[href="#/representations/101"]');
  await compter(page);
  await page.keyboard.press('Enter');
  const arrive = await attendre(page, () => document.querySelector('.tiroir.la #ed-date'));
  const tiroir = () => { const t = document.querySelector('.tiroir.la'), v = document.querySelector('.tiroir-voile'), r = t.getBoundingClientRect(); return { largeur: Math.round(r.width), transform: getComputedStyle(t).transform, droite: Math.round(r.right), vue: Math.round(r.left) < innerWidth, voile: v && getComputedStyle(v).backgroundColor }; };
  const g2 = arrive ? await instants(page, tiroir) : { a0: null, a50: null, anim: ['le tiroir n’est pas arrivé'], stable: false };
  ok('1 · Entrée sur une ligne : la fiche s’ouvre en tiroir (la date 101)', arrive);
  ok('1 · Entrée sur une ligne : aucune animation à durée non nulle, au moment où le tiroir paraît puis 50 ms plus tard', g2.anim.length === 0, g2.anim.join(' ; '));
  ok('1 · Entrée sur une ligne : aucune transition ne s’est lancée', (await lancees(page)).length === 0, (await lancees(page)).join(' ; '));
  ok('1 · Entrée sur une ligne : dès son apparition, le tiroir est à sa place (translateX nul : son bord droit au bord de la fenêtre, pas à 104 %) et le voile à son opacité finale, à 0 puis 50 ms', !!g2.a0 && /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/.test(g2.a0.transform) && g2.a0.droite === 1600 && g2.a0.largeur === 1000 && g2.a0.vue && g2.a0.voile === 'rgba(23, 15, 26, 0.38)' && g2.stable, JSON.stringify({ a0: g2.a0, a50: g2.a50 }));
  await page.screenshot({ path: `${CAPT}/2-tiroir.png` });

  // ---- geste 3 : Entrée sur « Disposition d'origine » remet les poignées (celle du tiroir ouvert, la colonne des listes) et le menu, replié par le geste 1
  await page.waitForFunction(() => document.querySelector('.menu-reglages #fen-origine'), null, { timeout: 8000 });
  await page.waitForTimeout(250);   // (l'écriture de menu.replie, poussée en différé, doit être faite avant qu'on l'oublie)
  ok('1 · avant la remise : le choix du menu replié est écrit dans le compte (menu.replie)', ecrite('menu.replie', true));
  // (lue dans la page : la fonction y est envoyée telle quelle, elle relit donc le menu comme `racine` plus haut)
  const poignee = () => ({ menu: getComputedStyle(document.documentElement).getPropertyValue('--large-menu').trim(), replie: document.documentElement.classList.contains('menu-replie'), largeurMenu: Math.round(document.querySelector('.menu').getBoundingClientRect().width), bouton: document.querySelector('.menu-replier')?.getAttribute('aria-expanded'), l: document.documentElement.style.getPropertyValue('--l-liste'), tiroir: Math.round(document.querySelector('.tiroir.la').getBoundingClientRect().width), largeurTiroir: document.querySelector('.tiroir.la').style.getPropertyValue('--tiroir-largeur') });
  await page.focus('#fen-origine');
  await compter(page);
  await page.keyboard.press('Enter');
  const g3 = await instants(page, poignee);
  ok('1 · Entrée sur « Disposition d’origine » : aucune animation à durée non nulle, après le geste puis 50 ms plus tard', g3.anim.length === 0, g3.anim.join(' ; '));
  ok('1 · Entrée sur « Disposition d’origine » : aucune transition ne s’est lancée', (await lancees(page)).length === 0, (await lancees(page)).join(' ; '));
  ok('1 · Entrée sur « Disposition d’origine » : à 0 puis 50 ms, le tiroir a déjà sa largeur d’origine (780 px), --l-liste est effacée et le menu est déplié (240 px)', !!g3.a0 && g3.a0.l === '' && g3.a0.tiroir === 780 && g3.a0.largeurTiroir === '780px' && g3.a0.menu === '240px' && !g3.a0.replie && g3.a0.largeurMenu === 240 && g3.stable, JSON.stringify({ a0: g3.a0, a50: g3.a50 }));
  await page.waitForTimeout(300);
  ok('1 · … et le compte garde la remise (fenetres.liste, fenetres.tiroir et menu.replie remis à zéro)', ECRITURES.some(e => e.cle === 'fenetres.liste' && e.valeur === null) && ECRITURES.some(e => e.cle === 'fenetres.tiroir' && e.valeur === null) && ECRITURES.some(e => e.cle === 'menu.replie' && e.valeur === null), JSON.stringify(ECRITURES.map(e => [e.cle, e.valeur])));
  await page.screenshot({ path: `${CAPT}/3-disposition-d-origine.png` });

  // ---- geste 4 : le tableur passe de Simple à Complet (Entrée sur le bouton « Complet »)
  await page.keyboard.press('Escape');   // (le tiroir se ferme : le décor du geste suivant, pas un geste de la passe)
  await attendre(page, () => !document.querySelector('.tiroir'));
  await page.evaluate(() => { location.hash = '#/representations/tableur'; });
  await attendre(page, () => document.querySelector('#tab-corps tr[data-l]') && document.querySelector('.tab-modes [data-mode="complet"]'), null, 15000);
  await page.waitForTimeout(500);
  const mode = () => ({ simple: document.querySelector('#tab').classList.contains('simple'), cadre: document.querySelector('#tab-cadre').classList.contains('tab-simple'), complet: document.querySelector('.tab-modes [data-mode="complet"]').getAttribute('aria-pressed'), simpleBouton: document.querySelector('.tab-modes [data-mode="simple"]').getAttribute('aria-pressed'), colonnes: !document.querySelector('#tab-colonnes').hidden, lignes: document.querySelectorAll('#tab-corps tr[data-l]').length > 0, nom: document.querySelector('#tab').getAttribute('aria-label') });
  const avant = await page.evaluate(mode);
  ok('1 · le tableur s’ouvre en Simple (#tab.simple, « Simple » enfoncé, le bouton des colonnes caché)', avant.simple && avant.cadre && avant.simpleBouton === 'true' && avant.complet === 'false' && !avant.colonnes && avant.lignes, JSON.stringify(avant));
  await page.waitForTimeout(300);
  ok('1 · … sans animation en cours avant le geste', (await animations(page)).length === 0, (await animations(page)).join(' ; '));
  await page.focus('.tab-modes [data-mode="complet"]');
  await compter(page);
  await page.keyboard.press('Enter');
  const g4 = await instants(page, mode);
  ok('1 · Simple → Complet : aucune animation à durée non nulle, après le geste puis 50 ms plus tard (ni sur les boutons du segment, ni sur la grille)', g4.anim.length === 0, g4.anim.join(' ; '));
  ok('1 · Simple → Complet : aucune transition ne s’est lancée', (await lancees(page)).length === 0, (await lancees(page)).join(' ; '));
  ok('1 · Simple → Complet : à 0 puis 50 ms, la grille est déjà en Complet (plus de #tab.simple, « Complet » enfoncé, « Simple » relâché, le bouton des colonnes visible, des lignes posées)', !!g4.a0 && !g4.a0.simple && !g4.a0.cadre && g4.a0.complet === 'true' && g4.a0.simpleBouton === 'false' && g4.a0.colonnes && g4.a0.lignes && g4.stable, JSON.stringify({ a0: g4.a0, a50: g4.a50 }));
  await page.screenshot({ path: `${CAPT}/4-complet.png` });
  fin('1', erreurs);
  await ctx.close();
}

// ================================================================================ 2 · le témoin : sans « réduire », la sonde voit bouger
// (une vérification qui ne peut pas échouer ne compte pas : la même sonde, sur les mêmes gestes, doit trouver des animations)
{
  DB.crescite_preferences = []; ECRITURES.length = 0;
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/accueil' });
  await page.waitForSelector('.tb-tuile[data-k="prochaines"] a.tb-l[href="#/representations/101"]', { timeout: 15000 });
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));   // (l'arrivée des tuiles, qui dure)
  await page.waitForTimeout(500);
  ok('2 · témoin : sans « réduire », la page est au repos avant le geste (la sonde ne voit rien)', (await animations(page)).length === 0, (await animations(page)).join(' ; '));
  await compter(page);
  await page.keyboard.press('Alt+KeyM');
  const menu = await animations(page);
  await page.waitForTimeout(100);   // (les événements de transition partent à l'image suivante)
  ok('2 · témoin : sans « réduire », Alt+M laisse une transition de 220 ms sur --large-menu (la sonde la voit)', menu.some(a => /--large-menu 220/.test(a)) && (await lancees(page)).some(t => /--large-menu/.test(t)), JSON.stringify({ menu, lancees: await lancees(page) }));
  await page.waitForTimeout(400);
  await page.focus('.tb-tuile[data-k="prochaines"] a.tb-l[href="#/representations/101"]');
  await compter(page);
  await page.keyboard.press('Enter');
  await attendre(page, () => document.querySelector('.tiroir.la'));
  const t = await animations(page);
  await page.waitForTimeout(100);
  ok('2 · témoin : sans « réduire », l’ouverture du tiroir glisse (une transition de transform, vue par la sonde)', t.some(a => /^transform/.test(a)) && (await lancees(page)).some(x => /^transform .*tiroir/.test(x)), JSON.stringify({ t, lancees: await lancees(page) }));
  fin('2', erreurs);
  await ctx.close();
}
await navigateur.close();
bilan(CAPT);
