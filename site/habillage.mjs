// L'habillage final de l'administration (admin/habillage.js : le jeu d'états des commandes, la règle des étiquettes, les vides
// illustrés, la règle « mouvement réduit » ; admin/index.html : les pages d'essai #/essai/etats et #/essai/icones), vérifié dans
// Chromium, hors ligne, sur la base fictive commune (admin-fictif.mjs).
//   node site/habillage.mjs
// Ce que le banc regarde : le focus des segments et de la pilule des vues (anneau de 3 px, en dedans de 3 px) ; un bouton
// occupé (le curseur « en cours », plus de clic, une opacité entière même désactivé, l'anneau qui tourne, blanc sur le menu ; fixe sous « réduire »
// et avec ?anim=0) ; les champs (aucun contour, l'ombre à la place) ; les outils des tuiles à 32 px à la souris et à 44 px au doigt ;
// la règle des étiquettes sur chacun de ses porteurs (le tableau de bord, le tiroir, la liste des dates et celle des feuilles, le tableur, le mois d'une date à précision « mois », la
// recherche) ; la tentacule des listes vides (liste, tableur, carte) ; la page #/essai/etats (six états sur six commandes, chacun lu dans
// le style calculé, au repos comme au survol réel) ; la page #/essai/icones ; la règle « mouvement réduit » (toutes les durées à
// zéro) ; le jour (les contrastes des états, du menu, des poignées, des étiquettes, de la matrice). Les captures vont dans
// site/dist/shots-habillage/ (etats.png, icones.png, vide.png, menu-jour.png, tableur-jour.png, matrice-jour.png).
// Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, URL0, DB, ok, calme, ouvrir, texte, compte, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-habillage');
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
const attendre = (page, fn, arg = null, ms = 6000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
const jour = page => page.evaluate(() => document.documentElement.setAttribute('data-theme', 'jour'));
const style = (page, sel, props, pseudo = null) => page.$eval(sel, (e, [ps, pseudo]) => { const s = getComputedStyle(e, pseudo); return Object.fromEntries(ps.map(p => [p, s[p]])); }, [props, pseudo]);
// les outils de contraste, posés dans la page : une couleur CSS quelconque (color-mix compris) ramenée à du rouge-vert-bleu par un canevas, puis le fond
// réel d'un élément (les fonds translucides posés sur ceux de leurs parents)
const OUTILS = `window.__c = (() => {
  const toile = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rvb = css => { toile.clearRect(0, 0, 1, 1); toile.fillStyle = '#000'; toile.fillStyle = css; toile.fillRect(0, 0, 1, 1); const [r, g, b, a] = toile.getImageData(0, 0, 1, 1).data; return [r, g, b, a / 255]; };
  const poser = (haut, bas) => [0, 1, 2].map(i => haut[i] * haut[3] + bas[i] * (1 - haut[3]));
  const fond = el => { const pile = []; for (let e = el; e; e = e.parentElement) { pile.push(rvb(getComputedStyle(e).backgroundColor)); if (pile.at(-1)[3] === 1) break; } let f = [255, 255, 255]; for (const c of pile.reverse()) f = poser(c, f); return f; };
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const rapport = (a, b) => { const x = lum(a), y = lum(b); return Math.round((Math.max(x, y) + .05) / (Math.min(x, y) + .05) * 100) / 100; };
  return { rvb, fond, rapport, poser, texte: el => { const c = rvb(getComputedStyle(el).color); return poser(c, fond(el)); } };
})();`;
const fin = (nom, erreurs) => ok(`${nom} · aucune erreur de script`, erreurs.length === 0, erreurs.join(' / '));

// ================================================================================ 1 · la page #/essai/etats : six états, six commandes
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/essai/etats' });
  await attendre(page, () => document.querySelector('.essai-etats td'), null, 15000);
  const d = await page.evaluate(() => ({ cols: [...document.querySelectorAll('.essai-etats thead th[data-etat-col]')].map(t => t.dataset.etatCol).join(), lignes: document.querySelectorAll('.essai-etats tbody tr').length,
    cases: document.querySelectorAll('.essai-etats tbody td').length, sans: document.querySelectorAll('.essai-sans').length, noms: [...document.querySelectorAll('.essai-etats tbody th code')].map(c => c.textContent).join(),
    titre: document.querySelector('main h1').textContent, hash: location.hash, region: document.querySelector('.essai-etats-cadre').getAttribute('role') }));
  ok('1 · #/essai/etats rend six états en colonnes : repos, survol, pressé, clavier, désactivé, occupé', d.cols === 'repos,survol,presse,clavier,desactive,occupe', d.cols);
  ok('1 · … sur six commandes (.btn, .seg, .puce, .tb-ico, .menu a, .poignee), soit 36 cases dont trois « sans objet » (un lien ne s’occupe pas, une poignée ne se désactive pas)', d.lignes === 6 && d.cases === 36 && d.sans === 3 && d.noms === '.btn,.seg,.puce,.tb-ico,.menu a,.poignee', JSON.stringify(d));
  ok('1 · la page est une région nommée, au titre « Les états »', d.region === 'region' && d.titre === 'Les états');
  const cel = (c, e) => `.essai-etats tbody tr:nth-child(${c}) td[data-etat-col="${e}"]`;
  const lire = (c, e, sel) => style(page, `${cel(c, e)} ${sel}`, ['backgroundColor', 'borderTopColor', 'opacity', 'transform', 'outlineStyle', 'outlineWidth', 'outlineOffset', 'outlineColor', 'cursor', 'pointerEvents', 'transitionDuration']);
  await page.mouse.move(5, 5);
  const [r, s, p, c, de, oc] = await Promise.all(['repos', 'survol', 'presse', 'clavier', 'desactive', 'occupe'].map(e => lire(1, e, 'button')));
  ok('1 · .btn au survol : un fond et un bord teintés de la saison, différents de ceux du repos', s.backgroundColor !== r.backgroundColor && s.borderTopColor !== r.borderTopColor, `${r.backgroundColor} → ${s.backgroundColor} ; ${r.borderTopColor} → ${s.borderTopColor}`);
  ok('1 · .btn pressé : il s’enfonce de 3 % (scale .97) et son fond s’assombrit à peine', p.transform === 'matrix(0.97, 0, 0, 0.97, 0, 0)' && p.backgroundColor !== r.backgroundColor && p.backgroundColor !== s.backgroundColor, `${p.transform} ${p.backgroundColor}`);
  ok('1 · .btn au clavier : un anneau plein de 3 px, à 2 px du bouton, à la couleur de la saison (--accent)', c.outlineStyle === 'solid' && c.outlineWidth === '3px' && c.outlineOffset === '2px' && c.outlineColor === await page.evaluate(() => { const t = document.createElement('i'); t.style.color = 'var(--accent)'; document.body.append(t); const v = getComputedStyle(t).color; t.remove(); return v; }), JSON.stringify(c));
  ok('1 · .btn désactivé : à moitié transparent', de.opacity === '0.5' && r.opacity === '1', de.opacity);
  ok('1 · .btn occupé : le curseur « en cours », plus de clic, l’opacité entière bien que désactivé en même temps', oc.cursor === 'progress' && oc.pointerEvents === 'none' && oc.opacity === '1', JSON.stringify(oc));
  ok('1 · .btn : survol et pressé se jouent en 120 ms (le jeu d’états)', /0\.12s/.test(r.transitionDuration), r.transitionDuration);
  // le survol réel (la souris) donne le même fond que l’état posé par data-etat
  await page.hover(`${cel(1, 'repos')} button`);
  await page.waitForTimeout(250);
  const reel = await lire(1, 'repos', 'button');
  ok('1 · le survol réel de la souris donne le fond et le bord de l’état « au survol »', reel.backgroundColor === s.backgroundColor && reel.borderTopColor === s.borderTopColor, `${reel.backgroundColor} / ${s.backgroundColor}`);
  await page.mouse.down(); await page.waitForTimeout(250);
  const presse = await lire(1, 'repos', 'button');
  await page.mouse.up(); await page.mouse.move(5, 5);
  ok('1 · l’appui réel de la souris enfonce le bouton comme l’état « pressé »', presse.transform === 'matrix(0.97, 0, 0, 0.97, 0, 0)', presse.transform);
  // le segment : le bouton choisi ne bouge pas au survol ; l’anneau est en dedans
  const segRepos = await style(page, `${cel(2, 'repos')} button[aria-pressed="true"]`, ['backgroundImage', 'backgroundColor']);
  await page.hover(`${cel(2, 'repos')} button[aria-pressed="true"]`); await page.waitForTimeout(250);
  const segSurvol = await style(page, `${cel(2, 'repos')} button[aria-pressed="true"]`, ['backgroundImage', 'backgroundColor']);
  await page.mouse.move(5, 5);
  ok('1 · .seg : le bouton choisi garde son dégradé au survol (le survol ne recolore pas ce qui est choisi)', JSON.stringify(segRepos) === JSON.stringify(segSurvol), JSON.stringify([segRepos, segSurvol]));
  const sc = await lire(2, 'clavier', 'button[aria-pressed="false"]');
  ok('1 · .seg au clavier : l’anneau de 3 px est en dedans (offset −3 px : le segment rogne ce qui le dépasse)', sc.outlineWidth === '3px' && sc.outlineOffset === '-3px', JSON.stringify(sc));
  ok('1 · .seg désactivé et occupé : moitié d’opacité, puis entière avec le curseur « en cours »', (await lire(2, 'desactive', 'button[aria-pressed="false"]')).opacity === '0.5' && (await lire(2, 'occupe', 'button[aria-pressed="false"]')).cursor === 'progress' && (await lire(2, 'occupe', 'button[aria-pressed="false"]')).opacity === '1');
  const puce = await Promise.all(['repos', 'survol', 'presse', 'clavier', 'desactive', 'occupe'].map(e => lire(3, e, 'button')));
  ok('1 · .puce : survol teinté, pressé enfoncé, anneau de 3 px, moitié d’opacité, occupée', puce[1].backgroundColor !== puce[0].backgroundColor && puce[2].transform === 'matrix(0.97, 0, 0, 0.97, 0, 0)' && puce[3].outlineWidth === '3px' && puce[4].opacity === '0.5' && puce[5].cursor === 'progress' && puce[5].opacity === '1', JSON.stringify(puce.map(x => [x.backgroundColor, x.transform, x.outlineWidth, x.opacity, x.cursor])));
  const ico = await Promise.all(['repos', 'survol', 'presse', 'clavier', 'desactive', 'occupe'].map(e => lire(4, e, 'button')));
  ok('1 · .tb-ico : survol teinté, pressé enfoncé, anneau de 3 px à 2 px, moitié d’opacité, occupé', ico[1].backgroundColor !== ico[0].backgroundColor && ico[2].transform === 'matrix(0.97, 0, 0, 0.97, 0, 0)' && ico[3].outlineWidth === '3px' && ico[3].outlineOffset === '2px' && ico[4].opacity === '0.5' && ico[5].cursor === 'progress' && ico[5].opacity === '1', JSON.stringify(ico.map(x => [x.backgroundColor, x.transform, x.outlineWidth, x.opacity, x.cursor])));
  const men = await Promise.all(['repos', 'survol', 'presse', 'clavier', 'desactive'].map(e => lire(5, e, 'a')));
  ok('1 · .menu a : survol et pressé en blanc translucide (la bande est de nuit), anneau blanc de 3 px en dedans, moitié d’opacité', men[1].backgroundColor !== men[0].backgroundColor && /rgba\(255, 255, 255/.test(men[1].backgroundColor) && men[2].transform === 'matrix(0.97, 0, 0, 0.97, 0, 0)' && men[3].outlineWidth === '3px' && men[3].outlineOffset === '-3px' && men[3].outlineColor === 'rgb(255, 255, 255)' && men[4].opacity === '0.5', JSON.stringify(men.map(x => [x.backgroundColor, x.transform, x.outlineWidth, x.outlineOffset, x.opacity])));
  const lig = await Promise.all(['repos', 'survol', 'presse', 'clavier'].map(e => style(page, `${cel(6, e)} .poignee::after`.replace('::after', ''), ['opacity']).then(async x => ({ ...x, apres: (await page.$eval(`${cel(6, e)} .poignee`, el => getComputedStyle(el, '::after').opacity)) }))));
  ok('1 · .poignee : invisible au repos, sa ligne paraît au survol, pressée et au clavier', lig[0].apres === '0' && lig[1].apres === '1' && lig[2].apres === '1' && lig[3].apres === '1', JSON.stringify(lig.map(x => x.apres)));
  // l’anneau qui tourne : 14 px, le mouvement du témoin du direct
  const anneau = await page.$eval(`${cel(1, 'occupe')} button`, e => { const s = getComputedStyle(e, '::after'); return { w: s.width, h: s.height, anim: s.animationName, duree: s.animationDuration, courbe: s.animationTimingFunction, iter: s.animationIterationCount, lib: e.getAttribute('aria-busy') }; });
  ok('1 · l’anneau occupé : 14 px, temoin-tourne en 0,9 s, linéaire, sans fin', anneau.w === '14px' && anneau.h === '14px' && anneau.anim === 'temoin-tourne' && anneau.duree === '0.9s' && anneau.courbe === 'linear' && anneau.iter === 'infinite' && anneau.lib === 'true', JSON.stringify(anneau));
  await page.waitForTimeout(400);   // (calme() attendrait l'anneau occupé, qui ne finit jamais)
  await page.screenshot({ path: `${CAPT}/etats.png`, fullPage: false });
  // le jour : les états se lisent aussi
  await jour(page); await page.waitForTimeout(200);
  await page.evaluate(OUTILS);
  const cj = await page.evaluate(([ids]) => {
    const c = window.__c, tout = s => document.querySelector(s), accent = c.rvb(getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#000');
    const carte = c.rvb(getComputedStyle(tout('.essai-etats-cadre')).backgroundColor), fondPage = c.fond(tout('main'));
    const bouton = s => { const e = tout(s); return c.rapport(c.rvb(getComputedStyle(e).color).slice(0, 3), c.fond(e)); };
    const anneau = c.rapport(accent.slice(0, 3), c.poser(carte, [255, 255, 255]));
    return { survol: bouton(ids.survol), presse: bouton(ids.presse), puce: bouton(ids.puce), ico: bouton(ids.ico), anneau, anneauFond: c.rapport(accent.slice(0, 3), fondPage), ligne: c.rapport(c.rvb(getComputedStyle(tout(ids.poignee), '::after').backgroundColor).slice(0, 3), c.poser(carte, [255, 255, 255])) };
  }, [{ survol: `${cel(1, 'survol')} button`, presse: `${cel(1, 'presse')} button`, puce: `${cel(3, 'survol')} button`, ico: `${cel(4, 'survol')} button`, poignee: `${cel(6, 'survol')} .poignee` }]);
  ok('1 · le jour : le texte d’un bouton au survol et pressé, d’une puce, d’un outil tient 4,5:1 sur son fond doux', cj.survol >= 4.5 && cj.presse >= 4.5 && cj.puce >= 4.5 && cj.ico >= 4.5, JSON.stringify(cj));
  ok('1 · le jour : l’anneau du clavier et la ligne de la poignée tiennent 3:1 contre la carte et contre le fond de la page', cj.anneau >= 3 && cj.anneauFond >= 3 && cj.ligne >= 3, JSON.stringify(cj));
  await page.mouse.move(5, 5); await page.waitForTimeout(400);
  await page.screenshot({ path: `${CAPT}/etats-jour.png`, fullPage: false });
  fin('1', erreurs);
  await ctx.close();
}

// ================================================================================ 2 · #/essai/icones, hors du menu et de la recherche
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/essai/icones' });
  await attendre(page, () => document.querySelector('.essai-icones li'), null, 15000);
  const v = await page.evaluate(() => ({ n: document.querySelectorAll('.essai-icones li').length, attendu: Object.keys(ICONES.TRACES).length, menu: document.querySelectorAll('#menu a[href*="essai"]').length }));
  ok('2 · #/essai/icones montre autant de cases que Object.keys(ICONES.TRACES)', v.n === v.attendu && v.n > 50, JSON.stringify(v));
  ok('2 · aucune des deux pages d’essai n’est dans le menu', v.menu === 0);
  await page.keyboard.press('Control+k'); await page.waitForSelector('#recherche[open]', { timeout: 3000 });
  await page.fill('#rch-q', 'essai'); await page.waitForTimeout(300);
  const liste = await page.$$eval('#rch-liste [role=option]', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  await page.fill('#rch-q', 'états'); await page.waitForTimeout(300);
  const liste2 = await page.$$eval('#rch-liste [role=option]', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  ok('2 · ni l’une ni l’autre n’est dans la recherche (Ctrl K « essai », « états »)', !liste.concat(liste2).some(t => /icônes|Les états|essai\/(etats|icones)/i.test(t)), JSON.stringify([liste, liste2]));
  await page.keyboard.press('Escape');
  await page.evaluate(() => { location.hash = '#/essai/icones'; }); await page.waitForTimeout(300);
  await calme(page);
  await page.screenshot({ path: `${CAPT}/icones.png`, fullPage: false });
  fin('2', erreurs);
  await ctx.close();
}

// ================================================================================ 3 · le focus, les champs, les boutons occupés, les outils des tuiles
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations' });
  await page.waitForSelector('#vue .vues a', { timeout: 15000 });
  await page.keyboard.press('Tab');   // (le clavier a parlé : un focus donné par programme est un focus au clavier)
  const f1 = await page.evaluate(() => { const a = document.querySelector('#vue .vues a'); a.focus(); const s = getComputedStyle(a); return { cl: a.matches(':focus-visible'), w: s.outlineWidth, o: s.outlineOffset, st: s.outlineStyle, cour: a.getAttribute('aria-current') === 'page', couleur: s.outlineColor }; });
  ok('3 · la pilule des vues au clavier : un anneau plein de 3 px, outline-offset −3 px (la pilule rogne ce qui la dépasse)', f1.cl && f1.st === 'solid' && f1.w === '3px' && f1.o === '-3px', JSON.stringify(f1));
  const segs = await page.evaluate(() => { const b = [...document.querySelectorAll('#vue .seg:not(.vues) button')].find(x => x.getAttribute('aria-pressed') !== 'true') || document.querySelector('#vue .seg:not(.vues) button'); if (!b) return null; b.focus(); const s = getComputedStyle(b); return { cl: b.matches(':focus-visible'), w: s.outlineWidth, o: s.outlineOffset }; });
  ok('3 · un segment de la liste au clavier : l’anneau de 3 px en dedans (−3 px)', !!segs && segs.cl && segs.w === '3px' && segs.o === '-3px', JSON.stringify(segs));
  const ch = await page.evaluate(() => { const i = document.querySelector('#vue input[type=search]'); i.focus(); const s = getComputedStyle(i); return { st: s.outlineStyle, ombre: s.boxShadow, bord: s.borderTopColor }; });
  ok('3 · un champ au focus : aucun contour (outline: none), son ombre à la couleur de la saison à la place', ch.st === 'none' && ch.ombre !== 'none', JSON.stringify(ch));
  // les boutons des feuilles de gestes.js (partagé) : sous html.admin seulement, moitié d’opacité, occupé plein
  const gf = await page.evaluate(() => {
    const zone = document.createElement('div'); zone.id = 'essai-gf'; zone.innerHTML = '<button type="button" class="gf-btn" disabled>Un</button><button type="button" class="gf-btn" disabled aria-busy="true">Deux</button><button type="button" class="gf-btn">Trois</button>'; document.body.append(zone);
    const [a, b, c] = zone.children, lire = e => { const s = getComputedStyle(e); return { op: s.opacity, cur: s.cursor, apres: getComputedStyle(e, '::after').width }; };
    const sortie = { desactive: lire(a), occupe: lire(b), repos: lire(c) };
    document.documentElement.classList.remove('admin'); sortie.sansAdmin = { desactive: lire(a).op, occupe: getComputedStyle(b, '::after').content };
    document.documentElement.classList.add('admin'); zone.remove(); return sortie;
  });
  ok('3 · un bouton de feuille (.gf-btn) désactivé : à moitié transparent (.5, non plus .6) ; occupé : l’opacité entière, le curseur « en cours », l’anneau de 14 px', gf.desactive.op === '0.5' && gf.occupe.op === '1' && gf.occupe.cur === 'progress' && gf.occupe.apres === '14px' && gf.repos.op === '1', JSON.stringify(gf));
  ok('3 · … et hors de l’administration (sans html.admin : l’espace de l’équipe), ce jeu ne s’applique pas : opacité .6 de gestes.js, aucun anneau', gf.sansAdmin.desactive === '0.6' && (gf.sansAdmin.occupe === 'none' || gf.sansAdmin.occupe === 'normal'), JSON.stringify(gf.sansAdmin));
  // un bouton occupé de l’administration : l’état se lit sur un vrai .btn de la liste
  await page.evaluate(() => { const b = document.querySelector('#vue .btn'); b.setAttribute('aria-busy', 'true'); b.disabled = true; });
  await page.waitForTimeout(300);   // (le libellé s'efface en 120 ms)
  const oc = await page.evaluate(() => { const b = document.querySelector('#vue .btn'); const s = getComputedStyle(b); const r = { cur: s.cursor, op: s.opacity, pe: s.pointerEvents, couleur: s.color, anneau: getComputedStyle(b, '::after').animationName }; b.removeAttribute('aria-busy'); b.disabled = false; return r; });
  ok('3 · un vrai bouton de la liste, occupé et désactivé : le curseur « en cours », l’opacité entière, le libellé effacé (transparent), l’anneau qui tourne', oc.cur === 'progress' && oc.op === '1' && oc.pe === 'none' && oc.couleur === 'rgba(0, 0, 0, 0)' && oc.anneau === 'temoin-tourne', JSON.stringify(oc));
  // un aria-busy qui n’est pas un bouton garde son apparence : le témoin du direct, le squelette, la barre de lecture
  const hors = await page.evaluate(() => { const t = document.querySelector('.temoin'); const a = t ? getComputedStyle(t, '::after').content : 'absent'; return { temoin: a, tn: t ? getComputedStyle(t).pointerEvents : '' }; });
  ok('3 · le témoin du direct n’est pas un bouton du jeu : pas d’anneau ajouté (::after) ni de clic coupé', hors.temoin === 'none' && hors.tn !== 'none', JSON.stringify(hors));
  await page.goto(`${URL0}#/accueil`);
  await page.waitForSelector('.tb-tuile .tb-ico', { timeout: 15000 });
  const t32 = await page.evaluate(() => { const e = [...document.querySelectorAll('.tb-ico')].filter(x => x.offsetParent), r = e[0].getBoundingClientRect(); e[0].focus(); const s = getComputedStyle(e[0]); return { n: e.length, larg: r.width, haut: r.height, fine: matchMedia('(pointer: fine)').matches, w: s.outlineWidth, o: s.outlineOffset }; });
  ok('3 · à 1 440 px (un pointeur précis), les outils des tuiles (.tb-ico) font 32 × 32 px', t32.fine && t32.larg === 32 && t32.haut === 32 && t32.n > 3, JSON.stringify(t32));
  await page.keyboard.press('Tab');
  const t32f = await page.evaluate(() => { const e = [...document.querySelectorAll('.tb-ico')].find(x => x.offsetParent); e.focus(); const s = getComputedStyle(e); return { cl: e.matches(':focus-visible'), w: s.outlineWidth, o: s.outlineOffset, st: s.outlineStyle }; });
  ok('3 · un outil de tuile au clavier : l’anneau de 3 px à 2 px, plus petit que le retrait de l’en-tête (8 px) : la tuile ne le rogne pas', t32f.cl && t32f.w === '3px' && t32f.o === '2px' && t32f.st === 'solid', JSON.stringify(t32f));
  // le menu est de nuit dans les deux thèmes : l'anneau d'un bouton occupé y est blanc, en jour comme en nuit
  const anneauxMenu = [];
  for (const theme of ['nuit', 'jour']) {
    await page.evaluate(t => { document.documentElement.setAttribute('data-theme', t); const b = document.querySelector('#menu button'); b.setAttribute('aria-busy', 'true'); }, theme);
    anneauxMenu.push(await page.evaluate(() => { const b = document.querySelector('#menu button[aria-busy="true"]'); const s = getComputedStyle(b, '::after'); const r = { theme: document.documentElement.dataset.theme, couleur: s.borderTopColor, bas: s.borderBottomColor }; b.removeAttribute('aria-busy'); return r; }));
  }
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'nuit'));
  ok('3 · un bouton occupé du menu (bande de nuit) : l’anneau est blanc, de nuit comme de jour', anneauxMenu.every(a => a.bas === 'rgb(255, 255, 255)'), JSON.stringify(anneauxMenu));
  fin('3', erreurs);
  await ctx.close();
  // au téléphone : 44 px
  const tel = await ouvrir(navigateur, { largeur: 390, hauteur: 844, hash: '#/accueil' });
  await tel.page.waitForSelector('.tb-tuile .tb-ico', { timeout: 15000 });
  const t44 = await tel.page.evaluate(() => { const e = [...document.querySelectorAll('.tb-ico')].filter(x => x.offsetParent), r = e[0].getBoundingClientRect(); return { coarse: matchMedia('(pointer: coarse)').matches, larg: Math.round(r.width), haut: Math.round(r.height) }; });
  ok('3 · au téléphone (le doigt), les outils des tuiles gardent leurs 44 px', t44.coarse && t44.larg >= 44 && t44.haut >= 44, JSON.stringify(t44));
  fin('3 (téléphone)', tel.erreurs);
  await tel.ctx.close();
}

// ================================================================================ 4 · la règle des étiquettes, sur chacun de ses porteurs
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900 });
  await page.waitForSelector('.tb-tuile .tb-cat h3', { timeout: 15000 });
  const lire = sel => page.$eval(sel, e => { const s = getComputedStyle(e); return { famille: s.fontFamily, taille: s.fontSize, espace: s.letterSpacing, casse: s.textTransform, poids: s.fontWeight, couleur: s.color }; });
  const relevé = {};
  relevé.cat = await lire('.tb-tuile .tb-cat h3');
  // le tiroir : une date du tableau de bord
  await page.click(`.tb-tuile[data-k="prochaines"] a.tb-l[href="#/representations/101"]`);
  await attendre(page, () => document.querySelector('.tiroir.la .tiroir-genre'));
  relevé.genre = await lire('.tiroir .tiroir-genre');
  const accent = await page.evaluate(() => { const t = document.createElement('i'); t.style.color = 'var(--accent)'; document.body.append(t); const v = getComputedStyle(t).color; t.remove(); return v; });
  await page.keyboard.press('Escape'); await attendre(page, () => !document.querySelector('.tiroir'));
  await page.goto(`${URL0}#/representations`); await page.waitForSelector('#l-dates div.mois', { timeout: 15000 });
  relevé.mois = await lire('#l-dates div.mois');
  await page.goto(`${URL0}#/representations/tableur`); await page.waitForSelector('#tab-tete th', { timeout: 15000 });
  relevé.th = await lire('.tableur thead th');
  await page.goto(`${URL0}#/accueil`); await page.waitForSelector('.tb-tuile .tb-l', { timeout: 15000 });
  await page.keyboard.press('Control+k'); await page.waitForSelector('#recherche[open]', { timeout: 3000 });
  await page.fill('#rch-q', 'bérénice'); await page.waitForTimeout(300);
  relevé.rch = await lire('.rch-entete');
  const noms = Object.keys(relevé), famille = relevé.cat.famille;
  ok('4 · la règle des étiquettes : « À traiter », le tiroir, « novembre », l’en-tête du tableur, la recherche parlent d’une seule voix (Raleway)', noms.every(k => relevé[k].famille === famille) && /Raleway/.test(famille), JSON.stringify(relevé));
  ok('4 · … en 11 px, de .1em d’espacement (1,1 px), en capitales, en gras', noms.every(k => relevé[k].taille === '11px' && relevé[k].espace === '1.1px' && relevé[k].casse === 'uppercase' && relevé[k].poids === '700'), JSON.stringify(relevé));
  ok('4 · le tiroir garde sa couleur : l’accent de la saison (la règle ne pose aucune couleur)', relevé.genre.couleur === accent, `${relevé.genre.couleur} / ${accent}`);
  ok('4 · aucune règle de couleur dans la règle des étiquettes : « À traiter » et les mois restent gris', relevé.cat.couleur === relevé.mois.couleur && relevé.cat.couleur !== accent, `${relevé.cat.couleur} / ${relevé.mois.couleur}`);
  await page.keyboard.press('Escape');
  // les titres « À venir » et « Dates passées » de la liste des dates et de celle des feuilles de route : .mois.accent, plus de style en ligne
  // (chacun est lu sur sa vraie page, et doit y être : sinon la vérification ne regarderait rien)
  const titres = async (hash, zone) => {
    await page.goto(`${URL0}${hash}`); const la = await attendre(page, z => document.querySelector(`${z} h2.mois.accent`), zone, 15000);
    return page.evaluate(([z, la]) => { const hs = [...document.querySelectorAll(`${z} h2.mois.accent`)]; return { la, n: hs.length, textes: hs.map(h => h.textContent.trim()).join(' / '), tailles: [...new Set(hs.map(h => getComputedStyle(h).fontSize))].join(), couleurs: [...new Set(hs.map(h => getComputedStyle(h).color))].join(), poids: [...new Set(hs.map(h => getComputedStyle(h).fontWeight))].join(), enLigne: document.querySelectorAll('#vue [style*="font-size:13px;color:var(--accent)"]').length }; }, [zone, la]);
  };
  const dates = await titres('#/representations', '#l-dates'), feuilles = await titres('#/feuilles', '#l-feuilles');
  ok('4 · « À venir » / « Dates passées » de la liste des dates (h2.mois.accent) : la même étiquette de 11 px, à la couleur de la saison', dates.la && dates.n === 2 && dates.tailles === '11px' && dates.couleurs === accent && dates.poids === '700', JSON.stringify(dates));
  ok('4 · … et ceux de la liste des feuilles de route (equipe.js) : de même', feuilles.la && feuilles.n === 2 && feuilles.tailles === '11px' && feuilles.couleurs === accent && feuilles.poids === '700', JSON.stringify(feuilles));
  ok('4 · aucun titre « mois » ne porte plus de style en ligne (13 px), dans l’une ni l’autre liste', dates.enLigne === 0 && feuilles.enLigne === 0, JSON.stringify([dates.enLigne, feuilles.enLigne]));
  fin('4', erreurs);
  await ctx.close();
}

// ================================================================================ 4 bis · le mois d'une date à précision « mois », dans la tuile du tableur : pas une étiquette
{
  const AVANT = structuredClone(DB.crescite_dates);
  DB.crescite_dates.push({ ...DB.crescite_dates.find(d => d.id === 101), id: 190, precision: 'mois' });
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/tableur' });
  await attendre(page, () => document.querySelector('#tab-corps .tab-jj b.mois'), null, 15000);
  const j = await page.evaluate(() => { const lire = e => { const s = getComputedStyle(e); return { famille: s.fontFamily, espace: s.letterSpacing, taille: s.fontSize }; }; const m = document.querySelector('#tab-corps .tab-jj b.mois'), n = document.querySelector('#tab-corps .tab-jj b:not(.mois)'); return { mois: m && lire(m), jour: n && lire(n) }; });
  ok('4 · le mois d’une date à précision « mois » (tuile du tableur) garde la police et l’espacement du numéro de jour voisin (Ubuntu, sans espacement), non ceux d’une étiquette', !!j.mois && !!j.jour && j.mois.famille === j.jour.famille && /Ubuntu/.test(j.mois.famille) && j.mois.espace === j.jour.espace && j.mois.espace !== '1.1px' && j.mois.taille === '17px', JSON.stringify(j));
  // (la marge d'un titre .mois, posée sur ce <b>, poussait l'année sous le bord rogné de la tuile)
  const an = await page.evaluate(() => { const m = document.querySelector('#tab-corps .tab-jj b.mois'), t = m.closest('.tab-jj'), i = m.nextElementSibling, r = t.getBoundingClientRect(), ri = i.getBoundingClientRect(), rm = m.getBoundingClientRect(); return { annee: i.textContent, haut: Math.round(rm.top - r.top), bas: Math.round(r.bottom - ri.bottom), marge: getComputedStyle(m).margin }; });
  ok('4 · … et l’année tient dans la tuile, sous le mois (pas de marge de titre sur le mois)', /^\d{4}$/.test(an.annee) && an.bas >= 0 && an.marge === '0px', JSON.stringify(an));
  fin('4 (précision mois)', erreurs);
  await ctx.close();
  DB.crescite_dates.length = 0; DB.crescite_dates.push(...AVANT);
}

// ================================================================================ 5 · les vides : la tentacule en filigrane
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations' });
  await page.waitForSelector('#l-dates a.ligne', { timeout: 15000 });
  await page.fill('#vue input[type="search"]', 'zzzzzz'); await page.waitForTimeout(500);
  await page.waitForSelector('#vue .vide.liste-vide', { timeout: 5000 });
  const v = await page.evaluate(() => { const z = document.querySelector('#vue .vide.liste-vide'), o = z.querySelector('svg.vide-orne'), p = z.querySelector('p'), b = z.querySelector('.btn'); const s = o && getComputedStyle(o); const r = o && o.getBoundingClientRect();
    return { ornement: !!o, aria: o?.getAttribute('aria-hidden'), avant: !!o && !!p && (o.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING) > 0, opacite: s?.opacity, larg: r && Math.round(r.width), couleur: s?.color, phrase: p?.textContent, geste: b?.textContent.trim(), hb: b && b.getBoundingClientRect().height, nOrne: z.querySelectorAll('svg').length, focusable: o?.getAttribute('focusable') }; });
  const accent = await page.evaluate(() => { const t = document.createElement('i'); t.style.color = 'var(--accent)'; document.body.append(t); const x = getComputedStyle(t).color; t.remove(); return x; });
  ok('5 · une liste filtrée sans résultat montre la tentacule en filigrane (svg.vide-orne, aria-hidden) avant la phrase', v.ornement && v.aria === 'true' && v.avant && v.nOrne === 1, JSON.stringify(v));
  ok('5 · … 140 px de large, à la couleur de la saison, à 18 % d’opacité', v.larg === 140 && v.couleur === accent && v.opacite === '0.18', JSON.stringify(v));
  ok('5 · … puis le geste utile : « Effacer les filtres » (44 px), la phrase reste un <p>', v.geste === 'Effacer les filtres' && v.hb >= 44 && /ne correspond/.test(v.phrase), JSON.stringify(v));
  await page.locator('#vue .vide.liste-vide').scrollIntoViewIfNeeded();
  await calme(page);
  await page.screenshot({ path: `${CAPT}/vide.png`, fullPage: false });
  // le tableur : la ligne vide (le filtre de la liste est effacé, puis posé de nouveau dans le tableur)
  await page.click('#vue .liste-vide [data-effacer-filtres]'); await page.waitForSelector('#l-dates a.ligne', { timeout: 5000 });
  await page.goto(`${URL0}#/representations/tableur`); await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  await page.fill('#vue input[type="search"]', 'zzzzzz'); await page.waitForTimeout(500);
  const t = await page.evaluate(() => { const td = document.querySelector('#tab-corps td.tab-vide'); const o = td?.querySelector('svg.vide-orne'); return { td: !!td, orne: !!o, aria: o?.getAttribute('aria-hidden'), premier: td?.firstElementChild === o, geste: td?.querySelector('[data-effacer-filtres]')?.textContent, texte: td?.textContent.replace(/\s+/g, ' ').trim() }; });
  ok('5 · le tableur sans résultat : la tentacule d’abord (aria-hidden), puis la phrase, puis « Effacer les filtres »', t.td && t.orne && t.aria === 'true' && t.premier && /ne correspond/.test(t.texte) && t.geste === 'Effacer les filtres', JSON.stringify(t));
  // une tuile du tableau de bord vide : l’ornement, sauf pour le « tout est à jour » vert
  await page.goto(`${URL0}#/accueil`); await page.waitForSelector('.tb-tuile .tb-l', { timeout: 15000 });
  const tb = await page.evaluate(() => ({ nu: [...document.querySelectorAll('.tb-rien.ok')].every(p => p.previousElementSibling?.classList.contains('vide-orne') === false), pasOk: [...document.querySelectorAll('.tb-rien:not(.ok):not([role])')].map(p => p.previousElementSibling?.classList.contains('vide-orne')), nb: document.querySelectorAll('.tb-corps > .vide-orne').length }));
  ok('5 · dans les tuiles : chaque phrase « rien à voir » (sauf le « tout est à jour » vert, nu) porte l’ornement avant elle', tb.nu && tb.pasOk.every(x => x === true), JSON.stringify(tb));
  fin('5', erreurs);
  await ctx.close();
  // une carte vide : Toutes les périodes sans date
  const c = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/carte' });
  await attendre(c.page, () => document.querySelector('#vue .tn-cote, #vue #tn-etapes, #vue .liste-vide'), null, 15000);
  await c.page.fill('#f-q', 'zzzzzz');   // (un filtre sans résultat : la carte n'a plus d'étape)
  const vide = await attendre(c.page, () => document.querySelector('#tn-etapes .liste-vide'), null, 5000);
  const carte = await c.page.evaluate(() => { const z = document.querySelector('#tn-etapes .liste-vide'); return z ? { orne: !!z.querySelector('svg.vide-orne'), aria: z.querySelector('svg.vide-orne')?.getAttribute('aria-hidden'), avant: z.firstElementChild?.classList.contains('vide-orne'), phrase: z.querySelector('p')?.textContent, geste: z.querySelector('.btn')?.textContent.trim() } : null; });
  ok('5 · la carte vide (lot 15) porte l’ornement (aria-hidden) avant la phrase, puis le geste « Effacer les filtres »', vide && !!carte && carte.orne && carte.aria === 'true' && carte.avant && /ne correspond/.test(carte.phrase) && carte.geste === 'Effacer les filtres', JSON.stringify(carte));
  fin('5 (carte)', c.erreurs);
  await c.ctx.close();
}

// ================================================================================ 6 · « réduire les animations » : toutes les durées à zéro
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/essai/etats', reduit: true });
  await attendre(page, () => document.querySelector('.essai-etats td'), null, 15000);
  const r = await page.evaluate(() => {
    const dur = e => getComputedStyle(e).transitionDuration.split(',').every(x => parseFloat(x) === 0);
    const sel = ['.essai-etats .btn', '.essai-etats .seg button', '.essai-etats .puce', '.essai-etats .tb-ico', '.essai-etats .menu a', 'a.btn, button.btn', '.menu .nav a', '.tb-ico', '.barre .btn'];
    const non = sel.filter(s => { const e = document.querySelector(s); return e && !dur(e); });
    // tous les éléments de la page : aucune durée de transition ni d’animation
    const trop = [...document.querySelectorAll('body *')].filter(e => { const s = getComputedStyle(e); return s.transitionDuration.split(',').some(x => parseFloat(x) > 0) || s.animationDuration.split(',').some(x => parseFloat(x) > 0); }).slice(0, 5).map(e => `${e.tagName.toLowerCase()}.${e.className}`);
    const ring = getComputedStyle(document.querySelector('.essai-etats td[data-etat-col="occupe"] button'), '::after');
    return { non, trop, anneau: ring.animationName, w: ring.width };
  });
  ok('6 · sous « réduire les animations » : aucune durée de transition ni d’animation sur la page (une seule règle globale)', r.non.length === 0 && r.trop.length === 0, JSON.stringify(r));
  ok('6 · … l’anneau occupé est fixe (aucune animation), mais bien là (14 px)', r.anneau === 'none' && r.w === '14px', JSON.stringify(r));
  await page.hover('.essai-etats tbody tr:first-child td[data-etat-col="repos"] button'); await page.waitForTimeout(50);
  const bg = await page.$eval('.essai-etats tbody tr:first-child td[data-etat-col="repos"] button', e => getComputedStyle(e).backgroundColor);
  const bgSurvol = await page.$eval('.essai-etats tbody tr:first-child td[data-etat-col="survol"] button', e => getComputedStyle(e).backgroundColor);
  ok('6 · … le survol change d’un coup (le fond du survol est là dès 50 ms)', bg === bgSurvol, `${bg} / ${bgSurvol}`);
  fin('6', erreurs);
  await ctx.close();
  const still = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await still.page.goto(`${URL0}?anim=0#/essai/etats`);
  await attendre(still.page, () => document.querySelector('.essai-etats td'), null, 15000);
  const a0 = await still.page.evaluate(() => ({ still: document.documentElement.classList.contains('still'), anim: getComputedStyle(document.querySelector('.essai-etats td[data-etat-col="occupe"] button'), '::after').animationName, tr: getComputedStyle(document.querySelector('.essai-etats .btn')).transitionDuration }));
  ok('6 · ?anim=0 : html.still, l’anneau occupé fixe, aucune transition sur un bouton', a0.still && a0.anim === 'none' && a0.tr.split(',').every(x => parseFloat(x) === 0), JSON.stringify(a0));
  fin('6 (?anim=0)', still.erreurs);
  await still.ctx.close();
}

// ================================================================================ 7 · le jour, relu : le menu, les poignées, le sélecteur, le tableur, la matrice
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await page.waitForSelector('.tb-tuile .tb-l', { timeout: 15000 });
  await jour(page); await page.waitForTimeout(200); await page.evaluate(OUTILS);
  // le menu : la bande reste de nuit ; l’état du lien, au survol et au clavier, se lit dessus
  await page.hover('#menu .nav a[data-rubrique="planning"]'); await page.waitForTimeout(250);
  const m = await page.evaluate(() => {
    // la bande est un dégradé de la saison dans le papier de la nuit : son bout le plus clair (comme site/theme.mjs)
    const c = window.__c, css = getComputedStyle(document.documentElement), hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const fin = css.getPropertyValue('--menu-fond').match(/color-mix\(in srgb,\s*[^,]+?\s+([\d.]+)%,\s*(#[0-9a-f]{6})\)/i);
    if (!fin) return { erreur: css.getPropertyValue('--menu-fond') };
    const saison = hex(css.getPropertyValue('--saison').trim()), part = +fin[1] / 100, base = hex(fin[2]), band = [0, 1, 2].map(i => saison[i] * part + base[i] * (1 - part));
    const a = document.querySelector('#menu .nav a[data-rubrique="planning"]'), s = getComputedStyle(a), survol = c.poser(c.rvb(s.backgroundColor), band), txt = c.rvb(s.color);
    const f = document.querySelector('#menu .nav a[data-rubrique="lieux"]'); f.focus(); const sf = getComputedStyle(f);
    return { survol: c.rapport(txt.slice(0, 3), survol), anneau: c.rapport(c.rvb(sf.outlineColor).slice(0, 3), band), bg: s.backgroundColor, couleur: s.color };
  });
  ok('7 · le menu, le jour : le lien survolé tient 4,5:1 (blanc sur la bande de nuit éclaircie), l’anneau du clavier 3:1', m.survol >= 4.5 && m.anneau >= 3, JSON.stringify(m));
  await page.mouse.move(700, 450); await calme(page);
  await page.screenshot({ path: `${CAPT}/menu-jour.png`, fullPage: false });
  // le sélecteur (la recherche), le jour
  await page.keyboard.press('Control+k'); await page.waitForSelector('#recherche[open]', { timeout: 3000 }); await page.fill('#rch-q', 'bérénice'); await page.waitForTimeout(300);
  const rch = await page.evaluate(() => { const c = window.__c, e = document.querySelector('.rch-entete'), o = document.querySelector('.rch-liste [role=option][aria-selected=true]'); return { entete: c.rapport(c.texte(e), c.fond(e)), choisi: o ? c.rapport(c.texte(o), c.fond(o)) : 0 }; });
  ok('7 · le sélecteur (Ctrl K), le jour : l’étiquette (« Dates… ») et le choix tiennent 4,5:1', rch.entete >= 4.5 && rch.choisi >= 4.5, JSON.stringify(rch));
  await page.keyboard.press('Escape');
  // la liste des dates, le jour : le mois (étiquette grise), la ligne survolée
  await page.goto(`${URL0}#/representations`); await page.waitForSelector('#l-dates div.mois', { timeout: 15000 }); await jour(page); await page.evaluate(OUTILS);
  const l = await page.evaluate(() => { const c = window.__c, m = document.querySelector('#l-dates div.mois'); return { mois: c.rapport(c.texte(m), c.fond(m)) }; });
  ok('7 · la liste des dates, le jour : « novembre » (l’étiquette grise) tient 4,5:1 sur le fond', l.mois >= 4.5, JSON.stringify(l));
  // le tableur Simple et Complet, le jour : l’en-tête (étiquette), les poignées
  await page.goto(`${URL0}#/representations/tableur`); await page.waitForSelector('#tab-tete th', { timeout: 15000 }); await jour(page); await page.waitForTimeout(150); await page.evaluate(OUTILS);
  const tj = await page.evaluate(() => { const c = window.__c, th = document.querySelector('#tab-tete th:not(.figee)') || document.querySelector('#tab-tete th'); const p = document.querySelector('#tab-tete .poignee'); const sp = p && getComputedStyle(p, '::after');
    return { th: c.rapport(c.texte(th), c.fond(th)), lignePoignee: p ? c.rapport(c.rvb(sp.backgroundColor).slice(0, 3), c.fond(th)) : null }; });
  ok('7 · le tableur, le jour : l’en-tête d’une colonne (étiquette) tient 4,5:1 sur son fond, la ligne d’une poignée de colonne 3:1', tj.th >= 4.5 && tj.lignePoignee !== null && tj.lignePoignee >= 3, JSON.stringify(tj));
  await calme(page); await page.screenshot({ path: `${CAPT}/tableur-jour.png`, fullPage: false });
  await page.click('.tab-modes button:has-text("Complet")'); await page.waitForTimeout(500); await page.evaluate(OUTILS);
  const tc = await page.evaluate(() => { const c = window.__c, th = document.querySelector('#tab-tete th'); const p = document.querySelector('#tab-tete .poignee'); return { th: c.rapport(c.texte(th), c.fond(th)), poignee: p ? c.rapport(c.rvb(getComputedStyle(p, '::after').backgroundColor).slice(0, 3), c.fond(th)) : null }; });
  ok('7 · le tableur Complet, le jour : l’en-tête tient 4,5:1 ; la ligne d’une poignée de colonne (tirée au survol) tient 3:1', tc.th >= 4.5 && tc.poignee !== null && tc.poignee >= 3, JSON.stringify(tc));
  await page.click('.tab-modes button:has-text("Simple")'); await page.waitForTimeout(300);
  fin('7', erreurs);
  await ctx.close();
}
{
  // la matrice de la distribution, le jour (des lignes ajoutées à la base le temps du bloc : Jean ne part pas à Caen, Léa en renfort au Havre)
  const AVANT = structuredClone(DB.crescite_equipes);
  DB.crescite_equipes.push({ date_id: 101, personne_id: 2, present: false, fonction: null, note: null }, { date_id: 103, personne_id: 3, present: true, fonction: 'régie', note: null });
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '?mode=distribution&spectacle=1#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l] .mat-case', { timeout: 15000 });
  await jour(page); await page.waitForTimeout(200); await page.evaluate(OUTILS);
  const mj = await page.evaluate(() => { const c = window.__c, cases = [...document.querySelectorAll('#tab-corps .mat-case:not(.vide)')].filter(b => b.textContent.trim()).slice(0, 8);
    return { n: cases.length, pires: cases.map(b => c.rapport(c.texte(b), c.fond(b))).sort((a, b) => a - b).slice(0, 2), th: (th => c.rapport(c.texte(th), c.fond(th)))(document.querySelector('#tab-tete th')) }; });
  ok('7 · la matrice, le jour : le texte des cases (✓, ✕, ⟳) tient 4,5:1 ou 3:1 pour une marque seule, l’en-tête 4,5:1', mj.n >= 3 && mj.th >= 4.5 && mj.pires[0] >= 3, JSON.stringify(mj));
  await page.mouse.move(5, 5); await calme(page);
  await page.screenshot({ path: `${CAPT}/matrice-jour.png`, fullPage: false });
  fin('7 (matrice)', erreurs);
  await ctx.close();
  DB.crescite_equipes.length = 0; DB.crescite_equipes.push(...AVANT);
}

bilan(CAPT);
