// L'apparence de l'administration : le thème (nuit, jour, appareil) et la densité (confortable, compacte), choisis dans le menu
// (admin/cadre.js : CADRE.reglages), posés avant le premier dessin (le <script id="apparence"> d'admin/index.html), gardés avec
// le compte (PREFS : theme, densite) et sur l'appareil (crescite-admin-apparence:<compte>). Vérifié dans Chromium, hors ligne, sur
// la base fictive commune (admin-fictif.mjs).
//   node site/theme.mjs
// Ce que le banc regarde : la nuit par défaut, même sur un appareil réglé en clair, et la pilule du thème (radiogroup, trois
// radios de 44 px, flèches, libellés, contraste contre la bande de nuit) ; le jour (data-theme, les balises color-scheme et
// theme-color, les tuiles claires, la coque qui reste de nuit, la préférence écrite, le miroir, l'annonce, aucune transition de
// couleur, l'icône qui saute, la tentacule qui remonte à la couleur du jour) ; le rechargement qui pose le thème avant le
// premier dessin de la vue, et qui ne le change plus ensuite ; « appareil » qui suit le système sans recharger (et le planning
// qui se redessine) ; la compacte à la souris (une ligne de date, une ligne du menu, un champ, le texte courant) et rien au
// doigt ; un autre onglet qui suit (BroadcastChannel) ; la première ouverture sur un appareil (le miroir manque) ; sans le
// script SQL 6 (le thème tient, sur l'appareil) ; les commandes de la recherche ; le menu replié (une colonne de quatre
// icônes) ; moins d'animations ; le budget de 200 ms à CPU=4 ; les neuf pages d'habillage en jour. Les captures vont dans
// site/dist/shots-theme/ (jour.png, nuit.png, compacte.png, jour-*.png). Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, URL0, UID, DB, ECRITURES, ok, calme, ouvrir, texte, compte, tuile, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-theme');
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
for (const f of fs.readdirSync(CAPT)) if (/^jour-.*\.png$/.test(f)) fs.rmSync(path.join(CAPT, f));   // (les neuf captures du jour comptées plus bas sont celles de cette exécution)
const attendre = (page, fn, arg = null, ms = 6000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
const repartir = () => { DB.crescite_preferences = []; ECRITURES.length = 0; };
const ecrites = cle => ECRITURES.filter(e => e.cle === cle);
const theme = page => page.evaluate(() => document.documentElement.dataset.theme);
const densite = page => page.evaluate(() => document.documentElement.getAttribute('data-densite'));
const metas = page => page.evaluate(() => ({ barre: document.querySelector('meta[name="theme-color"]').content, schema: document.querySelector('meta[name="color-scheme"]').content }));
const miroir = (page, u = UID) => page.evaluate(id => JSON.parse(localStorage.getItem(`crescite-admin-apparence:${id}`) || 'null'), u);
const radio = (page, k) => page.locator(`.reg-theme [data-theme-choix="${k}"]`);
const fondTuile = page => page.$eval('.tb-tuile', e => getComputedStyle(e).backgroundColor);
const annonces = page => page.evaluate(() => [...document.querySelectorAll('.annonce')].map(a => a.textContent.replace(/\s+/g, ' ').trim()));
// la sonde d'ouverture : ce que valent le thème et la densité quand main#vue entre dans la page, et si le thème change ensuite
const sonde = `window.__vue = null; window.__apres = 0; (function () {
  const note = () => ({ theme: document.documentElement.dataset.theme, densite: document.documentElement.getAttribute('data-densite'), schema: document.querySelector('meta[name="color-scheme"]')?.content, barre: document.querySelector('meta[name="theme-color"]')?.content });
  new MutationObserver(() => { if (document.querySelector('#vue') && !window.__vue) window.__vue = note(); }).observe(document, { childList: true, subtree: true });
  new MutationObserver(() => { if (window.__vue) window.__apres++; }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-theme', 'data-densite'] });
  document.addEventListener('DOMContentLoaded', () => { window.__dcl = note(); });
})();`;

// le contraste de la pilule contre la bande de nuit : la fin de --menu-fond (la saison dans le papier de la nuit), la plus claire ;
// la part de saison et le papier sont lus dans la déclaration même de la feuille (habillage.js), pas recopiés ici
const contraste = (page) => page.evaluate(() => {
  const css = getComputedStyle(document.documentElement), dec = s => (s.match(/[\d.]+/g) || []).map(Number), hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const rapport = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const voile = (fond, [r, g, b], a) => fond.map((v, i) => v * (1 - a) + [r, g, b][i] * a);
  const jour = document.documentElement.dataset.theme === 'jour', saison = hex(css.getPropertyValue('--saison').trim()), fin = css.getPropertyValue('--menu-fond').match(/color-mix\(in srgb,\s*[^,]+?\s+([\d.]+)%,\s*(#[0-9a-f]{6})\)/i);
  if (!fin) return { theme: document.documentElement.dataset.theme, repos: 0, choisi: 0, texte: 'le fond de la bande n’a plus la forme attendue : ' + css.getPropertyValue('--menu-fond') };
  const part = +fin[1] / 100, base = hex(fin[2]);
  const bande = [0, 1, 2].map(i => saison[i] * part + base[i] * (1 - part));
  const pilule = document.querySelector('.reg-theme'), repos = document.querySelector('.reg-theme [role=radio]:not([aria-checked="true"])'), choisi = document.querySelector('.reg-theme [role=radio][aria-checked="true"]');
  const fond = voile(bande, [255, 255, 255], dec(getComputedStyle(pilule).backgroundColor)[3]), t = dec(getComputedStyle(repos).color), tc = dec(getComputedStyle(choisi).color), fc = dec(getComputedStyle(choisi).backgroundColor);
  const fondChoisi = voile(fond, fc.slice(0, 3), fc[3] ?? 1);
  return { theme: document.documentElement.dataset.theme, repos: +rapport(voile(fond, t.slice(0, 3), t[3] ?? 1), fond).toFixed(2), choisi: +rapport(tc.slice(0, 3), fondChoisi).toFixed(2), texte: getComputedStyle(repos).color };
});

// ================================================================================ la nuit par défaut, et la pilule
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, sombre: false, hash: '#/accueil' });
  await page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  await page.waitForSelector('.reg-theme', { timeout: 5000 });
  ok('nuit par défaut : l’appareil réglé en clair n’y change rien (data-theme="nuit", tuiles de nuit, balises de nuit)', (await theme(page)) === 'nuit' && (await fondTuile(page)) === 'rgb(46, 33, 40)' && JSON.stringify(await metas(page)) === JSON.stringify({ barre: '#1b1117', schema: 'dark' }), JSON.stringify(await metas(page)));
  ok('rien n’est écrit pour avoir ouvert la page (ni thème ni densité dans la base, ni dans le miroir d’apparence)', ecrites('theme').length === 0 && ecrites('densite').length === 0 && (await miroir(page)) === null, JSON.stringify(await miroir(page)));
  const p = await page.evaluate(() => {
    const g = document.querySelector('#menu .menu-reglages .reg-theme'), rs = [...g.querySelectorAll('[role=radio]')], d = document.querySelector('#menu .menu-reglages .reg-densite');
    return { role: g.getAttribute('role'), nom: g.getAttribute('aria-label'), n: rs.length, ordre: rs.map(r => r.dataset.themeChoix), coches: rs.map(r => r.getAttribute('aria-checked')), tab: rs.map(r => r.tabIndex),
      tailles: [...rs, d].map(b => [Math.round(b.getBoundingClientRect().width), Math.round(b.getBoundingClientRect().height)]), libelles: rs.map(r => r.querySelector('.sr')?.textContent), svg: [...rs, d].every(b => b.querySelector('svg.ico[aria-hidden="true"]')),
      titres: [...rs, d].map(b => b.title), densite: { presse: d.getAttribute('aria-pressed'), libelle: d.querySelector('.sr')?.textContent, titre: d.title }, ksh: [...rs, d].filter(b => b.hasAttribute('aria-keyshortcuts')).length,
      dansLeMenu: !!g.closest('.menu-reglages') && !!d.closest('.menu-reglages'), bas: Math.round(innerHeight - d.getBoundingClientRect().bottom) };
  });
  ok('la pilule : un radiogroup « Thème » de trois radios (nuit, jour, appareil), la nuit cochée et seule dans l’ordre du clavier', p.role === 'radiogroup' && p.nom === 'Thème' && p.n === 3 && p.ordre.join() === 'nuit,jour,appareil' && p.coches.join() === 'true,false,false' && p.tab.join() === '0,-1,-1', JSON.stringify(p));
  ok('quatre commandes de 44 px au moins, une icône (masquée aux lecteurs d’écran), un libellé en .sr et une infobulle chacune', p.tailles.every(([w, h]) => w >= 44 && h >= 44) && p.svg && p.libelles.join() === 'Nuit,Jour,Appareil' && p.titres.every(t => t.length >= 3) && p.densite.libelle === 'Compact', JSON.stringify(p));
  ok('le bouton de densité : aria-pressed faux (confortable) ; aucun aria-keyshortcuts (aucun accord de touches à dire)', p.densite.presse === 'false' && p.ksh === 0, JSON.stringify(p.densite));
  ok('les réglages sont dans le logement du menu (.menu-reglages), au pied de la colonne', p.dansLeMenu && p.bas < 40, String(p.bas));
  const cn = await contraste(page);
  ok('contraste de la pilule contre la bande de nuit : 4,5:1 au moins, l’icône au repos comme l’icône choisie (la nuit)', cn.theme === 'nuit' && cn.repos >= 4.5 && cn.choisi >= 4.5, JSON.stringify(cn));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/nuit.png`, fullPage: false });

  // les flèches : un radiogroup passe d’un choix à l’autre et choisit (le focus et le choix vont ensemble)
  await radio(page, 'nuit').focus();
  await page.keyboard.press('ArrowRight');
  const f = await page.evaluate(() => ({ actif: document.activeElement?.dataset.themeChoix, coches: [...document.querySelectorAll('.reg-theme [role=radio]')].map(r => r.getAttribute('aria-checked')).join(), tab: [...document.querySelectorAll('.reg-theme [role=radio]')].map(r => r.tabIndex).join(), theme: document.documentElement.dataset.theme }));
  ok('→ sur la nuit : le jour a le focus, il est coché, seul dans l’ordre du clavier, la page passe au jour', f.actif === 'jour' && f.coches === 'false,true,false' && f.tab === '-1,0,-1' && f.theme === 'jour', JSON.stringify(f));
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  ok('→ → : on revient à la nuit en bouclant (appareil puis nuit)', (await page.evaluate(() => document.activeElement?.dataset.themeChoix)) === 'nuit' && (await theme(page)) === 'nuit');
  await page.keyboard.press('End');
  ok('Fin : le dernier choix (appareil) ; Début : le premier', (await page.evaluate(() => document.activeElement?.dataset.themeChoix)) === 'appareil');
  await page.keyboard.press('Home');
  ok('… Début revient à la nuit', (await page.evaluate(() => document.activeElement?.dataset.themeChoix)) === 'nuit' && (await theme(page)) === 'nuit');
  ok('nuit · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ le jour
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, sombre: false, hash: '#/accueil' });
  await page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  // la tentacule de la page : on écoute ce qui lui est demandé (TT est l’objet que tt() appelle à chaque fois)
  await page.evaluate(() => { window.__tt = []; if (typeof TENTACULES !== 'undefined') { const o = TENTACULES, f = o.page; o.page = (...a) => { window.__tt.push(a[0]); return f.apply(o, a); }; } });
  const avant = await page.evaluate(() => ({ accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() }));
  await radio(page, 'jour').click();
  await attendre(page, () => document.documentElement.dataset.theme === 'jour');
  // (aussitôt : l’icône qui saute dure 450 ms)
  const saut = await page.evaluate(() => { const s = document.querySelector('.reg-theme [data-theme-choix="jour"] svg'); return s.getAnimations().map(a => ({ nom: a.animationName, duree: a.effect.getTiming().duration, courbe: getComputedStyle(s).animationTimingFunction })); });
  ok('jour · data-theme="jour", les tuiles claires (rgb(255, 253, 249)), la page au papier', (await theme(page)) === 'jour' && (await fondTuile(page)) === 'rgb(255, 253, 249)' && (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === 'rgb(246, 242, 235)', await fondTuile(page));
  ok('jour · les balises du <head> suivent : theme-color #f6f2eb, color-scheme « light », et la feuille de style en color-scheme light', JSON.stringify(await metas(page)) === JSON.stringify({ barre: '#f6f2eb', schema: 'light' }) && (await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)) === 'light', JSON.stringify(await metas(page)));
  const coque = await page.evaluate(() => { const sombre = f => { const m = (f.match(/rgb\((\d+), (\d+), (\d+)\)/) || []).slice(1, 4).map(Number); return m.length === 3 && Math.max(...m) < 40; };
    const barre = getComputedStyle(document.querySelector('.barre')).backgroundImage, menu = getComputedStyle(document.querySelector('#menu')).backgroundImage;
    return { barre: sombre(barre), menu: sombre(menu), texte: getComputedStyle(document.querySelector('.barre')).color, lien: getComputedStyle(document.querySelector('.nav a[aria-current="page"]')).color }; });
  ok('jour · la coque (l’en-tête et le menu) reste de nuit : fonds très sombres, texte blanc', coque.barre && coque.menu && coque.texte === 'rgb(255, 255, 255)' && coque.lien === 'rgb(255, 255, 255)', JSON.stringify(coque));
  const cj = await contraste(page);
  ok('contraste de la pilule contre la bande de nuit : 4,5:1 au moins, l’icône au repos comme l’icône choisie (le jour)', cj.theme === 'jour' && cj.repos >= 4.5 && cj.choisi >= 4.5, JSON.stringify(cj));
  const r = await page.evaluate(() => [...document.querySelectorAll('.reg-theme [role=radio]')].map(x => x.getAttribute('aria-checked')).join());
  ok('jour · le jour est coché, la nuit ne l’est plus', r === 'false,true,false', r);
  await page.waitForTimeout(900);
  ok('jour · la préférence « theme » part au compte (ECRITURES : { cle: "theme", valeur: "jour" })', ecrites('theme').length === 1 && ecrites('theme')[0].valeur === 'jour' && ecrites('theme')[0].user_id === UID, JSON.stringify(ecrites('theme')));
  ok('jour · le miroir de l’appareil (crescite-admin-apparence:<compte>) porte le thème', (await miroir(page))?.theme === 'jour', JSON.stringify(await miroir(page)));
  const an = await annonces(page);
  ok('jour · l’annonce « Thème : jour. », puis « Gardé avec votre compte. » (la règle des préférences, une fois par session)', an.some(t => /^Thème : jour\./.test(t)) && an.some(t => /Gardé avec votre compte/.test(t)), an.join(' | '));
  // l’icône choisie saute : le ressort, 450 ms
  ok('jour · l’icône choisie saute : « ad-pop », 450 ms, le ressort cubic-bezier(.3, 1.6, .5, 1)', saut.length === 1 && saut[0].nom === 'ad-pop' && saut[0].duree === 450 && /cubic-bezier\(0\.3, 1\.6, 0\.5, 1\)/.test(saut[0].courbe), JSON.stringify(saut));
  // la tentacule de la page remonte, à la couleur d’accent du jour (et non à celle de la nuit)
  await attendre(page, () => window.__tt.length > 0);
  const tt = await page.evaluate(() => ({ appels: window.__tt, accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() }));
  ok('jour · la tentacule de la page remonte à la couleur d’accent du jour (pas celle de la nuit)', tt.appels.length === 1 && tt.appels[0] === tt.accent && tt.accent !== avant.accent, JSON.stringify({ tt, avant: avant.accent }));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/jour.png`, fullPage: false });
  // le jour est choisi : un clic de nouveau sur lui ne fait rien (pas de deuxième écriture, pas de deuxième annonce)
  const nAnnonces = (await annonces(page)).length;
  await radio(page, 'jour').click();
  await page.waitForTimeout(300);
  ok('jour · cliquer le thème déjà choisi ne fait rien (une seule écriture, aucune annonce de plus)', ecrites('theme').length === 1 && (await annonces(page)).length === nAnnonces);

  // rechargement : le thème est posé avant le premier dessin de la vue, et ne change plus ensuite
  await page.addInitScript(sonde);
  await page.reload();
  await page.waitForSelector('main#vue', { timeout: 20000 });
  await page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  const v = await page.evaluate(() => ({ vue: window.__vue, apres: window.__apres, dcl: window.__dcl }));
  ok('rechargement · data-theme="jour" est posé avant main#vue (et avant le DOMContentLoaded), ainsi que les deux balises', v.vue?.theme === 'jour' && v.dcl?.theme === 'jour' && v.vue.barre === '#f6f2eb' && v.vue.schema === 'light', JSON.stringify(v));
  ok('rechargement · le thème ne change plus une fois la vue posée : la page ne clignote pas en sombre', v.apres === 0 && (await theme(page)) === 'jour', JSON.stringify(v));
  ok('jour · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ aucune transition de couleur
{
  repartir();
  // (la liste des dates : des lignes qui transitionnent leurs bordures et leurs ombres, un menu, des boutons ; sans html.bascule
  // le changement de thème en lancerait une vingtaine)
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations' });
  await page.waitForSelector('a.ligne', { timeout: 15000 });
  await page.waitForTimeout(800);
  const lancees = () => page.evaluate(() => document.getAnimations().filter(a => a.transitionProperty && !/^--/.test(a.transitionProperty)).map(a => `${a.transitionProperty} ${a.effect.target?.className?.baseVal ?? a.effect.target?.className ?? ''}`));
  await radio(page, 'jour').click();
  const t1 = await lancees();
  await attendre(page, () => document.documentElement.dataset.theme === 'jour');
  await radio(page, 'nuit').click();
  const t2 = await lancees();
  ok('aucune transition de couleur ne se lance au changement de thème, ni vers le jour ni vers la nuit (html.bascule les coupe le temps du recalcul)', (await theme(page)) === 'nuit' && t1.length === 0 && t2.length === 0, `${t1.join(' ; ')} / ${t2.join(' ; ')}`);
  await page.waitForTimeout(300);
  ok('… et html.bascule est retirée aussitôt (les survols gardent leurs transitions)', await page.evaluate(() => !document.documentElement.classList.contains('bascule')));
  ok('aucune transition · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ le jour sur les neuf pages d’habillage
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  await radio(page, 'jour').click();
  await attendre(page, () => document.documentElement.dataset.theme === 'jour');
  await page.waitForTimeout(500);
  await calme(page); await page.screenshot({ path: `${CAPT}/jour-tableau.png`, fullPage: false });
  const pages = [['#/representations', 'representations', '.ligne'], ['#/representations/101', 'date', '#ed-date'], ['#/equipe', 'equipe', '.ligne, .bloc'], ['#/diffusion', 'diffusion', '.crm-colonne'], ['#/feuilles', 'feuilles', '.ligne, .bloc'], ['#/planning', 'planning', '.pl, .bloc'], ['#/journal', 'journal', '.journal-ligne, .vide']];
  const lus = [];
  for (const [h, nom, att] of pages) {
    await page.goto(`${URL0}${h}`);
    await page.reload();                                           // (le fragment seul ne recharge rien : on rouvre à froid)
    await page.waitForSelector(att, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(700);
    lus.push([nom, await theme(page), await page.evaluate(() => { const c = getComputedStyle(document.body).backgroundColor, t = getComputedStyle(document.body).color; return `${c}|${t}`; })]);
    await calme(page); await page.screenshot({ path: `${CAPT}/jour-${nom}.png`, fullPage: false });
  }
  await page.goto(`${URL0}#/accueil`); await page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  await page.keyboard.press('Control+k'); await page.waitForSelector('#recherche[open]', { timeout: 3000 }); await page.fill('#rch-q', 'bérénice'); await page.waitForTimeout(200);
  await page.screenshot({ path: `${CAPT}/jour-recherche.png`, fullPage: false });
  await page.keyboard.press('Escape');
  ok('jour · les sept pages, chacune rechargée à froid : le jour dès le premier dessin (fond papier, texte d’encre sombre)', lus.length === 7 && lus.every(([, t, c]) => t === 'jour' && c === 'rgb(246, 242, 235)|rgb(29, 20, 24)'), JSON.stringify(lus));
  ok('jour · neuf captures prises (tableau, sept pages, recherche)', ['tableau', 'representations', 'date', 'equipe', 'diffusion', 'feuilles', 'planning', 'journal', 'recherche'].every(n => fs.existsSync(`${CAPT}/jour-${n}.png`)), fs.readdirSync(CAPT).join());
  ok('jour (neuf pages) · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ « appareil » suit le système
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, sombre: false, hash: '#/planning' });
  await page.waitForSelector('.pl-o-b, .pl', { timeout: 15000 });
  await page.waitForTimeout(600);
  // le planning se redessine : sa grille est réécrite (on compte les changements de son arbre et de ses attributs, d’abord au repos)
  await page.evaluate(() => { window.__pl = 0; new MutationObserver(l => { window.__pl += l.length; }).observe(document.querySelector('#vue'), { childList: true, subtree: true, attributes: true, characterData: true }); });
  await attendre(page, () => !document.querySelector('.pl-premier'), null, 8000);   // (le premier dessin se pose quatre secondes)
  await page.evaluate(() => { window.__pl = 0; });
  await page.waitForTimeout(700);
  const repos = await page.evaluate(() => window.__pl);
  const redessine = async () => ({ vers: await attendre(page, () => window.__pl > 0), n: await page.evaluate(() => window.__pl) });
  await page.evaluate(() => { window.__pl = 0; });
  await radio(page, 'appareil').click();
  await attendre(page, () => document.documentElement.dataset.theme === 'jour');
  const an = await annonces(page);
  const r1 = await redessine();
  await page.waitForTimeout(300);
  ok('appareil · l’appareil est en clair : le jour', (await theme(page)) === 'jour' && JSON.stringify(await metas(page)) === JSON.stringify({ barre: '#f6f2eb', schema: 'light' }), await theme(page));
  ok('appareil · le planning s’est redessiné pour le jour (sa grille est réécrite, alors qu’elle était au repos)', repos === 0 && r1.vers, JSON.stringify({ repos, r1 }));
  await page.waitForTimeout(800);
  ok('appareil · la préférence « theme » vaut « appareil » (le choix, non son résultat)', ecrites('theme').length === 1 && ecrites('theme')[0].valeur === 'appareil', JSON.stringify(ecrites('theme')));
  ok('appareil · le miroir garde « appareil » (la résolution se refait à chaque ouverture)', (await miroir(page))?.theme === 'appareil', JSON.stringify(await miroir(page)));
  ok('appareil · l’annonce dit le thème : « Thème : celui de l’appareil. »', an.some(t => /^Thème : celui de l’appareil\./.test(t)), an.join(' | '));
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.__pl = 0; });
  await page.emulateMedia({ colorScheme: 'dark' });
  const bascule = await attendre(page, () => document.documentElement.dataset.theme === 'nuit');
  const r2 = await redessine();
  await page.waitForTimeout(300);
  ok('appareil · le système passe en sombre : data-theme="nuit" et theme-color #1b1117, sans recharger', bascule && JSON.stringify(await metas(page)) === JSON.stringify({ barre: '#1b1117', schema: 'dark' }), JSON.stringify(await metas(page)));
  ok('appareil · le planning se redessine de nouveau, pour la nuit', r2.vers, JSON.stringify(r2));
  await page.screenshot({ path: `${CAPT}/appareil-sombre.png`, fullPage: false });
  await page.emulateMedia({ colorScheme: 'light' });
  ok('appareil · et de nouveau en clair : le jour', await attendre(page, () => document.documentElement.dataset.theme === 'jour'));
  // un thème qui n’est pas « appareil » ne suit pas le système
  await radio(page, 'nuit').click();
  await page.emulateMedia({ colorScheme: 'light' }); await page.emulateMedia({ colorScheme: 'dark' }); await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForTimeout(400);
  ok('nuit choisie · le système qui change de réglage n’y touche pas', (await theme(page)) === 'nuit');
  // au rechargement, « appareil » se résout dans le <head> avec le réglage du moment
  await radio(page, 'appareil').click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await attendre(page, () => document.documentElement.dataset.theme === 'nuit');
  await page.addInitScript(sonde);
  await page.reload();
  await page.waitForSelector('main#vue', { timeout: 20000 });
  await page.waitForTimeout(500);
  const v = await page.evaluate(() => ({ vue: window.__vue, apres: window.__apres }));
  ok('appareil · rechargé alors que le système est en sombre : la nuit, posée avant la vue', v.vue?.theme === 'nuit' && v.vue.barre === '#1b1117' && v.apres === 0, JSON.stringify(v));
  ok('appareil · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ la densité compacte, à la souris
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations' });
  await page.waitForSelector('a.ligne', { timeout: 15000 });
  const mesures = () => page.evaluate(() => {
    const l = document.querySelector('a.ligne'), n = document.querySelector('.menu .nav a'), q = document.querySelector('input[type=search]'), s = document.querySelector('main select'), css = getComputedStyle(document.documentElement);
    return { ligne: l.getBoundingClientRect().height, padLigne: getComputedStyle(l).paddingTop, menu: n.getBoundingClientRect().height, champ: q ? q.getBoundingClientRect().height : null, liste: s ? s.getBoundingClientRect().height : null, corps: getComputedStyle(document.body).fontSize,
      pas: css.getPropertyValue('--pas').trim(), hc: css.getPropertyValue('--h-champ').trim(), hm: css.getPropertyValue('--h-ligne-menu').trim(), jj: document.querySelector('a.ligne .jj')?.getBoundingClientRect().height || 0,
      blocs: document.querySelector('.bloc') ? getComputedStyle(document.querySelector('.bloc')).paddingTop : null };
  });
  const a = await mesures();
  ok('confortable · une ligne du menu fait 44 px, le texte courant 15 px', Math.round(a.menu) === 44 && a.corps === '15px' && a.pas === '10px' && a.hm === '44px' && a.hc === '38px', JSON.stringify(a));
  ok('confortable · un champ de recherche d’environ 40 px (le padding et la police le font, le plancher de 38 px n’agit pas)', a.champ !== null && a.champ > 38, JSON.stringify(a));
  await page.click('.reg-densite');
  await attendre(page, () => document.documentElement.getAttribute('data-densite') === 'compacte');
  const b = await mesures();
  ok('compacte · data-densite="compacte" sur <html>, le bouton est pressé (aria-pressed)', (await densite(page)) === 'compacte' && (await page.$eval('.reg-densite', e => e.getAttribute('aria-pressed'))) === 'true');
  ok('compacte · une ligne de date diminue d’au moins 8 px, sans descendre sous 54 px (ses deux lignes de texte tiennent)', a.ligne - b.ligne >= 8 && b.ligne >= 54, `${a.ligne} → ${b.ligne}`);
  ok('compacte · une ligne du menu fait 36 px', Math.round(b.menu) === 36 && b.hm === '36px', JSON.stringify(b));
  ok('compacte · un champ de recherche fait 32 px', b.champ !== null && Math.round(b.champ) === 32 && b.hc === '32px', JSON.stringify(b));
  ok('compacte · le texte courant passe à 14 px et le pas de la mise en page à 6 px', b.corps === '14px' && b.pas === '6px', JSON.stringify(b));
  const titres = await page.evaluate(() => getComputedStyle(document.querySelector('a.ligne .ou')).fontSize);
  await page.click('.reg-densite');
  await attendre(page, () => !document.documentElement.hasAttribute('data-densite'));
  const t2 = await page.evaluate(() => getComputedStyle(document.querySelector('a.ligne .ou')).fontSize);
  ok('confortable de nouveau · tout revient (ligne, menu, champ, texte)', Math.abs((await mesures()).ligne - a.ligne) < 1 && Math.round((await mesures()).menu) === 44 && (await mesures()).corps === '15px', JSON.stringify(await mesures()));
  ok('… et la taille du texte d’une ligne à taille propre (le lieu, 13,5 px) ne dépendait pas de la densité', titres === t2, `${titres} / ${t2}`);
  await page.click('.reg-densite');
  await attendre(page, () => document.documentElement.getAttribute('data-densite') === 'compacte');
  await page.waitForTimeout(900);
  ok('compacte · la préférence « densite » part au compte, le miroir la porte, l’annonce la dit', ecrites('densite').length === 3 && ecrites('densite').at(-1).valeur === 'compacte' && (await miroir(page))?.densite === 'compacte' && (await annonces(page)).some(t => /^Densité : compacte\./.test(t)), JSON.stringify([ecrites('densite'), await miroir(page), await annonces(page)]));
  // les champs des feuilles de gestes (.gf) ne bougent pas : 44 px, 16 px (elles servent aussi l’équipe)
  const gf = await page.evaluate(() => [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch { return []; } }).filter(r => r.selectorText && /^\.gf-btn$|^\.gf input/.test(r.selectorText) && r.style.minHeight).map(r => `${r.selectorText.slice(0, 40)} → ${r.style.minHeight}`));
  ok('compacte · les champs et boutons des feuilles de gestes (.gf) gardent leurs 44 px : leurs règles ne lisent aucune variable de densité', gf.length >= 2 && gf.every(t => /→ 44px$/.test(t)), gf.join(' ; '));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/compacte.png`, fullPage: false });
  // rechargement en compacte : lue avant le premier dessin
  await page.addInitScript(sonde);
  await page.reload();
  await page.waitForSelector('a.ligne', { timeout: 20000 });
  const v = await page.evaluate(() => ({ vue: window.__vue, apres: window.__apres }));
  ok('rechargement en compacte · data-densite est posé avant main#vue, et ne change plus', v.vue?.densite === 'compacte' && v.apres === 0, JSON.stringify(v));
  ok('compacte · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  // une seconde page du même navigateur reçoit le thème par BroadcastChannel (et la densité)
  const page2 = await ctx.newPage();
  await page2.goto(`${URL0}#/accueil`);
  await page2.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  ok('seconde page · elle naît en compacte (le miroir de l’appareil), dans la nuit', (await densite(page2)) === 'compacte' && (await theme(page2)) === 'nuit');
  await radio(page, 'jour').click();
  ok('seconde page · le jour choisi dans la première arrive sans rechargement (BroadcastChannel)', await attendre(page2, () => document.documentElement.dataset.theme === 'jour'), await theme(page2));
  await page.click('.reg-densite');
  ok('seconde page · la densité aussi : confortable', await attendre(page2, () => !document.documentElement.hasAttribute('data-densite')));
  ok('seconde page · ses boutons suivent (jour coché, densité non pressée)', (await page2.evaluate(() => [...document.querySelectorAll('.reg-theme [role=radio]')].map(r => r.getAttribute('aria-checked')).join())) === 'false,true,false' && (await page2.$eval('.reg-densite', e => e.getAttribute('aria-pressed'))) === 'false');
  await ctx.close();
}

// ================================================================================ au doigt, la compacte n’agit jamais
{
  repartir();
  DB.crescite_preferences = [{ user_id: UID, cle: 'densite', valeur: 'compacte' }, { user_id: UID, cle: 'theme', valeur: 'jour' }];
  for (const [nom, opt] of [['390 px (le téléphone)', { largeur: 390, hauteur: 800 }], ['1 440 px au doigt (une tablette)', { largeur: 1440, hauteur: 900, tactile: true }]]) {
    const { ctx, page, erreurs } = await ouvrir(navigateur, { ...opt, hash: '#/representations' });
    await page.waitForSelector('a.ligne', { timeout: 15000 });
    const m = await page.evaluate(() => { const css = getComputedStyle(document.documentElement), l = document.querySelector('a.ligne'); return { fin: matchMedia('(pointer: fine)').matches, attr: document.documentElement.getAttribute('data-densite'), pas: css.getPropertyValue('--pas').trim(), hc: css.getPropertyValue('--h-champ').trim(), corps: getComputedStyle(document.body).fontSize, pad: getComputedStyle(l).paddingTop,
      champs: [...document.querySelectorAll('input[type=search], select')].map(e => Math.round(e.getBoundingClientRect().height)) }; });
    ok(`${nom} · la compacte est ignorée : --pas 10 px, --h-champ 38 px, texte de 15 px, ligne de 10 px (le pointeur n’est pas fin)`, !m.fin && m.pas === '10px' && m.hc === '38px' && m.corps === '15px' && m.pad === '10px' && m.champs.every(h => h >= 38), JSON.stringify(m));
    if (nom.startsWith('390')) ok('390 px · le compte dit « jour » : le téléphone reste de nuit (il n’a pas le menu des réglages, et il ne change pas)', (await theme(page)) === 'nuit' && (await page.$eval('meta[name="theme-color"]', m => m.content)) === '#1b1117', await theme(page));
    if (nom.startsWith('1 440')) {
      const c = await page.evaluate(() => [...document.querySelectorAll('.reg-theme [role=radio], .reg-densite')].map(b => Math.round(b.getBoundingClientRect().height)));
      ok('1 440 px au doigt · les commandes d’apparence font 44 px au moins', c.length === 4 && c.every(h => h >= 44), c.join());
      await page.click('.reg-densite');                            // (le compte disait « compacte » : ce clic repasse au confortable…)
      await page.click('.reg-densite');                            // (… et celui-ci redemande la compacte, que le doigt n'applique pas)
      const an = await annonces(page);
      ok('1 440 px au doigt · l’annonce de la compacte dit qu’elle ne vaut qu’à la souris', an.some(t => /Densité : compacte \(à la souris seulement\)/.test(t)), an.join(' | '));
    }
    ok(`${nom} · aucune erreur de script`, erreurs.length === 0, erreurs.join(' / '));
    await ctx.close();
  }
}

// ================================================================================ la première ouverture sur un appareil : le miroir manque
{
  repartir();
  DB.crescite_preferences = [{ user_id: UID, cle: 'theme', valeur: 'jour' }, { user_id: UID, cle: 'densite', valeur: 'compacte' }];
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  await page.waitForSelector('.reg-theme', { timeout: 5000 });
  ok('premier passage · le miroir manquait, le compte dit « jour » et « compacte » : la coque les pose à son dessin', (await theme(page)) === 'jour' && (await densite(page)) === 'compacte' && JSON.stringify(await metas(page)) === JSON.stringify({ barre: '#f6f2eb', schema: 'light' }), `${await theme(page)} ${await densite(page)}`);
  ok('premier passage · le miroir est écrit pour la prochaine ouverture ; rien n’est renvoyé à la base', (await miroir(page))?.theme === 'jour' && (await miroir(page))?.densite === 'compacte' && ecrites('theme').length === 0, JSON.stringify(await miroir(page)));
  ok('premier passage · les boutons disent ce qui est réglé (jour coché, densité pressée)', (await page.evaluate(() => [...document.querySelectorAll('.reg-theme [role=radio]')].map(r => r.getAttribute('aria-checked')).join())) === 'false,true,false' && (await page.$eval('.reg-densite', e => e.getAttribute('aria-pressed'))) === 'true');
  // une valeur mal formée dans le compte retombe sur le défaut
  await ctx.close();
  repartir();
  DB.crescite_preferences = [{ user_id: UID, cle: 'theme', valeur: 'rose' }, { user_id: UID, cle: 'densite', valeur: 'minuscule' }];
  const m = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await m.page.waitForSelector('.reg-theme', { timeout: 15000 });
  ok('une valeur inconnue dans le compte (« rose », « minuscule ») : la nuit et le confortable', (await theme(m.page)) === 'nuit' && (await densite(m.page)) === null && (await miroir(m.page)) === null, `${await theme(m.page)} ${await densite(m.page)}`);
  ok('premier passage · aucune erreur de script', erreurs.length === 0 && m.erreurs.length === 0, erreurs.concat(m.erreurs).join(' / '));
  await m.ctx.close();
  repartir();
}

// ================================================================================ sans le script SQL 6 : le thème tient sur l’appareil
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil', prefsAbsentes: true });
  await page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  await radio(page, 'jour').click();
  await attendre(page, () => document.documentElement.dataset.theme === 'jour');
  await page.waitForTimeout(600);
  const an = await annonces(page);
  ok('sans la table des préférences · le jour s’applique, rien n’est écrit dans la base, l’annonce dit « sur cet appareil »', (await theme(page)) === 'jour' && ECRITURES.length === 0 && an.some(t => /Gardé sur cet appareil/.test(t)) && !an.some(t => /avec votre compte/.test(t)), `${ECRITURES.length} ${an.join(' | ')}`);
  await page.addInitScript(sonde);
  await page.reload();
  await page.waitForSelector('main#vue', { timeout: 20000 });
  await page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  const v = await page.evaluate(() => ({ vue: window.__vue, apres: window.__apres }));
  ok('sans la table des préférences · rechargé, le jour tient (le miroir de l’appareil), posé avant la vue', v.vue?.theme === 'jour' && v.apres === 0 && (await theme(page)) === 'jour', JSON.stringify(v));
  await page.click('.reg-densite');
  await page.waitForTimeout(300);
  await page.reload(); await page.waitForSelector('main#vue', { timeout: 20000 }); await page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  ok('sans la table des préférences · la compacte tient aussi', (await densite(page)) === 'compacte' && (await page.$eval('.reg-densite', e => e.getAttribute('aria-pressed'))) === 'true');
  ok('sans la table des préférences · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ les commandes de la recherche
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  const commande = async (q, titre) => {
    await page.keyboard.press('Control+k'); await page.waitForSelector('#recherche[open]', { timeout: 3000 });
    await page.fill('#rch-q', q); await page.waitForTimeout(250);
    const t = await page.evaluate(() => [...document.querySelectorAll('#rch-liste [role=option]')].slice(0, 3).map(o => o.textContent.replace(/\s+/g, ' ').trim()));
    await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    return t;
  };
  const t1 = await commande('mode jour', 'Mode jour');
  ok('recherche · « Mode jour » est la première réponse, et Entrée passe la page au jour', /^Mode jour/.test(t1[0] || '') && (await theme(page)) === 'jour' && !(await page.evaluate(() => document.querySelector('#recherche')?.open)), t1.join(' | '));
  const t2 = await commande('mode nuit', 'Mode nuit');
  ok('recherche · « Mode nuit » repasse la page à la nuit ; la pilule suit', /^Mode nuit/.test(t2[0] || '') && (await theme(page)) === 'nuit' && (await page.evaluate(() => document.querySelector('.reg-theme [data-theme-choix="nuit"]').getAttribute('aria-checked'))) === 'true', t2.join(' | '));
  const t3 = await commande('compact', 'Compact');
  ok('recherche · « Compact » resserre (data-densite="compacte"), le bouton est pressé', /^Compact/.test(t3[0] || '') && (await densite(page)) === 'compacte' && (await page.$eval('.reg-densite', e => e.getAttribute('aria-pressed'))) === 'true', t3.join(' | '));
  await page.waitForTimeout(800);
  ok('recherche · les trois commandes ont écrit leurs préférences (jour, nuit, compacte)', ecrites('theme').map(e => e.valeur).join() === 'jour,nuit' && ecrites('densite').at(-1)?.valeur === 'compacte', JSON.stringify(ECRITURES.map(e => [e.cle, e.valeur])));
  ok('recherche · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ le menu replié : une colonne de quatre icônes
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1280, hauteur: 900, hash: '#/accueil' });
  await page.waitForSelector('.reg-theme', { timeout: 15000 });
  // replié à 1 280 × 900, les rubriques, « ＋ », les épinglés, le repli et cette colonne dépassent la hauteur : le menu défile
  // jusqu'à elle (le lot 4 : sur un écran bas, c'est le menu entier qui défile)
  const m = await page.evaluate(() => {
    const menu = document.querySelector('#menu'); menu.scrollTop = menu.scrollHeight;
    const aside = menu.getBoundingClientRect(), bs = [...document.querySelectorAll('.reg-theme [role=radio], .reg-densite')].map(b => { const r = b.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), titre: b.title }; });
    return { aside: Math.round(aside.width), bs, bas: Math.round(innerHeight - Math.max(...bs.map(b => b.y + b.h))) };
  });
  const colonne = new Set(m.bs.map(b => b.x)).size === 1 && m.bs.every((b, i) => i === 0 || b.y >= m.bs[i - 1].y + m.bs[i - 1].h - 1);
  ok('menu replié (64 px) · quatre icônes de 44 px en colonne, dans la largeur du menu, chacune avec une infobulle, dans l’écran une fois le menu défilé', m.aside === 64 && m.bs.length === 4 && m.bs.every(b => b.w >= 44 && b.h >= 44 && b.x >= 0 && b.x + b.w <= 64 && b.titre.length >= 3) && colonne && m.bas >= 0, JSON.stringify(m));
  await radio(page, 'jour').click();
  await attendre(page, () => document.documentElement.dataset.theme === 'jour');
  ok('menu replié · le jour se choisit aussi de là', (await theme(page)) === 'jour');
  await page.screenshot({ path: `${CAPT}/jour-menu-replie.png`, fullPage: false });
  ok('menu replié · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ moins d’animations
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil', reduit: true });
  await page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  await page.evaluate(() => { window.__tt = []; if (typeof TENTACULES !== 'undefined') { const o = TENTACULES, f = o.page; o.page = (...a) => { window.__tt.push(a[0]); return f.apply(o, a); }; } });
  await radio(page, 'jour').click();
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, anims: document.getAnimations().filter(a => a.animationName === 'ad-pop' || a.transitionProperty).length, tt: window.__tt.length }));
  ok('moins d’animations · le jour se pose, l’icône ne saute pas, aucune transition, la tentacule ne remonte pas', m.theme === 'jour' && m.anims === 0 && m.tt === 0, JSON.stringify(m));
  await ctx.close();
  const s = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '?anim=0#/accueil' });
  await s.page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  await radio(s.page, 'jour').click();
  await s.page.waitForTimeout(500);
  const k = await s.page.evaluate(() => ({ still: document.documentElement.classList.contains('still'), theme: document.documentElement.dataset.theme, anims: document.getAnimations().filter(a => a.animationName === 'ad-pop' || a.transitionProperty).length }));
  ok('?anim=0 · html.still : le jour se pose, rien ne saute', k.still && k.theme === 'jour' && k.anims === 0, JSON.stringify(k));
  await s.ctx.close();
}

// ================================================================================ le budget : aucune tâche de plus de 200 ms à CPU=4
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations', cpu: 4, longues: true });
  await page.waitForSelector('a.ligne', { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { window.__pret = performance.now(); window.__longues.length = 0; });
  await radio(page, 'jour').click();
  await page.waitForTimeout(900);
  await radio(page, 'appareil').click();
  await page.waitForTimeout(900);
  await page.click('.reg-densite');
  await page.waitForTimeout(900);
  const l = await page.evaluate(() => window.__longues.slice());
  ok('CPU=4 · changer de thème (jour, appareil) et de densité sur la liste des dates : aucune tâche longue de plus de 200 ms', l.every(d => d < 200), `tâches longues : ${l.join(', ') || 'aucune'}`);
  ok('CPU=4 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

bilan(CAPT);
