// La planche de relecture de l'administration : un outil pour les yeux d'Adrien, pas un banc qui garde le code (on ne le lance
// pas avec la chaîne ordinaire ; il tient en trois minutes au calme, six sous charge). Dix pages de l'administration, en vraies polices, en nuit et
// en jour, à trois largeurs, le menu déplié puis replié, plus les pages d'essai « états » et « icônes » : 122 captures, réunies
// dans une page HTML à lire d'un trait.
//   node site/planche.mjs               ou   bash site/bancs-admin.sh --planche   (à la fin de la chaîne)
// Il écrit dans site/dist/shots-planche/ (jamais commité) : les PNG et planche.html. Ouvrir planche.html : une grille de
// vignettes sur trois colonnes, chacune avec sa légende (la page, la largeur, le thème, le menu, le lot du plan, la police
// effective), la date et la version du code (l'identifiant court du commit, « + modifications locales » s'il n'est pas propre,
// et la branche) en tête ; un clic sur une vignette l'ouvre en grand ; une table des matières mène à chaque page.
//   - Les polices : celles du site (Ubuntu, Open Sans, Raleway), que build.py range dans site/dist/polices/, sont servies ; si le
//     dossier manque (python3 scripts/polices.py ne les a pas encore téléchargées), ce sont celles du système, et la légende de
//     chaque vignette le dit (« polices du système »).
//   - Les préférences : le harnais garde les écritures d'un contexte au suivant ; avant chaque ouverture, la base fictive est
//     remise à la graine du contexte (le jour : theme = jour ; le menu replié : menu.replie = vrai ; la nuit et le menu déplié
//     ne demandent rien, ce sont les défauts). À 1 280 px de large, le menu est replié par la feuille elle-même ; le déplier
//     passe par Alt+M, puis le calme (sous un tiroir ouvert, qui garde les raccourcis, par la note de session qu'Alt+M écrit).
//   - Avant chaque capture, le banc vérifie ce qu'il va montrer : le thème (data-theme), le menu (html.menu-replie, ou son
//     absence, et --large-menu : 64 px replié, 240 px déplié) ; une page qui ne dit pas ce qu'on attend n'est pas photographiée
//     sans le dire (la vérification est rouge).
// Sort en erreur si une capture manque, si une page ne montre pas le thème ou le menu qu'elle annonce, si la version du code n'a pas
// pu être lue, ou si une page lève une erreur de script.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium, ICI, ROOT, DB, UID, ECRITURES, ok, ouvrir, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-planche');
fs.rmSync(CAPT, { recursive: true, force: true });
fs.mkdirSync(CAPT, { recursive: true });
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });

// ---- ce que la planche montre
const LARGEURS = [1280, 1600, 1920];
const THEMES = ['nuit', 'jour'];
const MENUS = ['deplie', 'replie'];
// les dix adresses ; « lot » : le lot du plan qui a donné à la page son état d'aujourd'hui (pour relire lot par lot)
const PAGES = [
  { id: 'accueil', nom: 'Le tableau de bord', hash: '#/accueil', lot: 4, pret: '.tb-tuile[data-k="prochaines"] .tb-l' },
  { id: 'representations', nom: 'Représentations, la liste', hash: '#/representations', lot: 7, pret: '#l-dates a.ligne[href]' },
  { id: 'tableur-simple', nom: 'Le tableur, mode Simple', hash: '?mode=simple#/representations/tableur', lot: 11, pret: '#tab-corps tr[data-l]' },
  { id: 'tableur-complet', nom: 'Le tableur, mode Complet', hash: '?mode=complet#/representations/tableur', lot: 12, pret: '#tab-corps tr[data-l]' },
  { id: 'tableur-distribution', nom: 'Le tableur, mode Distribution', hash: '?mode=distribution&spectacle=1#/representations/tableur', lot: 13, pret: '#tab-corps tr[data-l] td.mat' },
  { id: 'carte', nom: 'La carte de tournée', hash: '#/representations/carte', lot: 15, pret: '#tn-carte' },
  { id: 'tiroir', nom: 'Une fiche en tiroir', hash: '?tiroir=representations/101#/accueil', lot: 6, pret: '.tiroir.la #ed-date #s-org' },
  { id: 'planning', nom: 'Le planning', hash: '#/planning', lot: 14, pret: 'main#vue > *' },
  { id: 'equipe', nom: 'L’équipe', hash: '#/equipe', lot: 14, pret: 'main#vue > *' },
  { id: 'diffusion', nom: 'La diffusion', hash: '#/diffusion', lot: 14, pret: '#kanban-zone' },
];
const ESSAIS = [
  { id: 'etats', nom: 'Les états (page d’essai)', hash: '#/essai/etats', lot: 16, pret: '.essai-etats td' },
  { id: 'icones', nom: 'Les icônes (page d’essai)', hash: '#/essai/icones', lot: 16, pret: 'main#vue svg' },
];
const FAMILLES = ['Ubuntu', 'Open Sans', 'Raleway'];
const HAUTEUR = 1000;

// ---- l'état du dépôt, tel que la légende le dira
const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return ''; } };
const commit = git('rev-parse', '--short', 'HEAD') || 'inconnu';
const propre = git('status', '--porcelain') === '';
const branche = git('branch', '--show-current') || '(détachée)';
const version = `${commit}${propre ? '' : ' + modifications locales'}`;
const maintenant = new Date();
const datee = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(maintenant);

const px = n => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} px`;   // 1600 → « 1 600 px » (espaces insécables)
const attendre = (page, fn, arg = null, ms = 15000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
// le calme d'admin-fictif.mjs (calme()), sauf qu'il n'attend que les animations qui finissent : la page des états montre un bouton
// « occupé » dont l'anneau tourne sans fin, et attendre la fin d'une animation infinie n'a pas de fin
async function calmer(page) {
  await page.evaluate(() => Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect.getComputedTiming().endTime)).map(a => a.finished.catch(() => {})))).catch(() => {});
  await page.waitForTimeout(400);
}

// ---- les captures
const vignettes = [];   // une par PNG : { page, largeur, theme, menu, fichier, legende, alt, polices, erreurs }
const manques = [];     // ce qui n'a pas pu être photographié, et pourquoi

async function photographier({ page: p, largeur, theme, menu, entier = false }) {
  // la graine du contexte : le harnais garde les écritures d'un contexte à l'autre, on repart donc d'une base propre
  DB.crescite_preferences = []; ECRITURES.length = 0;
  if (theme === 'jour') DB.crescite_preferences.push({ user_id: UID, cle: 'theme', valeur: 'jour' });
  if (menu === 'replie') DB.crescite_preferences.push({ user_id: UID, cle: 'menu.replie', valeur: true });
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur, hauteur: HAUTEUR, hash: p.hash, polices: true });
  try {
    const pret = await attendre(page, sel => document.querySelector(sel), p.pret);
    if (!pret) manques.push(`${p.id} · ${largeur} · ${theme} · ${menu} : « ${p.pret} » n’est pas venu`);
    // à 1 280 px, le menu est replié par la feuille : le déplier passe par Alt+M (une préférence ne s'écrit pas, c'est pour la session)
    if (menu === 'deplie' && largeur < 1340) {
      await page.keyboard.press('Alt+KeyM'); await calmer(page);
      // un tiroir ouvert garde les raccourcis pour lui : le dépli passe alors par la note de session qu'Alt+M écrit (cadre.js), puis la page se recharge
      if (!await page.evaluate(() => document.documentElement.classList.contains('menu-deplie'))) {
        await page.evaluate(() => sessionStorage.setItem('crescite-admin-menu', 'deplie'));
        await page.reload();
        await attendre(page, sel => document.querySelector(sel), p.pret);
        await calmer(page);
      }
    }
    // les polices : celles du site ont-elles été chargées ? (sans site/dist/polices/, celles du système)
    const polices = await page.evaluate(async (familles) => {
      await document.fonts.ready;
      const chargees = new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/["']/g, '')));
      return familles.filter(f => chargees.has(f));
    }, FAMILLES);
    await calmer(page);
    // ce que la capture va montrer, vérifié avant de la prendre
    const etat = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, replie: document.documentElement.classList.contains('menu-replie'), deplie: document.documentElement.classList.contains('menu-deplie'), large: getComputedStyle(document.documentElement).getPropertyValue('--large-menu').trim() }));
    const themeOk = etat.theme === theme, menuOk = menu === 'replie' ? etat.replie && etat.large === '64px' : !etat.replie && etat.large === '240px' && (largeur >= 1340 || etat.deplie);
    if (!themeOk) manques.push(`${p.id} · ${largeur} · ${theme} · ${menu} : le thème est « ${etat.theme} »`);
    if (!menuOk) manques.push(`${p.id} · ${largeur} · ${theme} · ${menu} : le menu est ${JSON.stringify(etat)}`);
    const fichier = `${String(vignettes.length + 1).padStart(3, '0')}-${p.id}-${largeur}-${theme}-${menu}.png`;
    await page.screenshot({ path: path.join(CAPT, fichier), fullPage: entier });
    const policesTexte = polices.length ? `polices ${polices.join(', ')}` : 'polices du système';
    const legende = `${p.nom} · ${px(largeur)} · ${theme === 'jour' ? 'jour' : 'nuit'} · menu ${menu === 'replie' ? 'replié' : 'déplié'} · lot ${p.lot} · ${policesTexte}`;
    vignettes.push({ page: p, largeur, theme, menu, fichier, legende, alt: `Capture : ${legende}`, polices, themeOk, menuOk, erreurs: erreurs.slice() });
  } finally { await ctx.close(); }
}

let n = 0;
for (const largeur of LARGEURS) for (const theme of THEMES) for (const menu of MENUS) for (const p of PAGES) {
  await photographier({ page: p, largeur, theme, menu });
  if (++n % 12 === 0) console.log(`  … ${n} captures`);
}
for (const p of ESSAIS) await photographier({ page: p, largeur: 1600, theme: 'nuit', menu: 'deplie', entier: true });

// ---- planche.html : une section par page, douze vignettes (3 largeurs × nuit/jour × menu déplié/replié) sur trois colonnes
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const polices = [...new Set(vignettes.flatMap(v => v.polices))];
const policeEffective = polices.length ? `Polices chargées : ${polices.join(', ')}` : 'Polices du système (site/dist/polices/ n’a pas donné celles du site : Ubuntu, Open Sans, Raleway)';
const sections = [...PAGES, ...ESSAIS].map(p => {
  const vs = vignettes.filter(v => v.page === p);
  return `<section id="${p.id}" aria-labelledby="t-${p.id}">
  <h2 id="t-${p.id}">${esc(p.nom)} <small>lot ${p.lot} · ${esc(p.hash)}</small></h2>
  <ul class="grille">
${vs.map(v => `    <li><figure><a href="${esc(v.fichier)}" title="Voir en grand"><img src="${esc(v.fichier)}" alt="${esc(v.alt)}" loading="lazy" ${ESSAIS.includes(p) ? '' : `width="${v.largeur}" height="${HAUTEUR}"`}></a><figcaption>${esc(v.legende)}</figcaption></figure></li>`).join('\n')}
  </ul>
</section>`;
}).join('\n');
const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>La planche de relecture de l’administration</title>
<style>
:root { --fond: #fbf7f2; --carte: #fff; --encre: #1d1720; --gris: #5d5463; --trait: #ded5cb; --accent: #8a1c4b; }
@media (prefers-color-scheme: dark) { :root { --fond: #170f1a; --carte: #231a27; --encre: #f3ecf4; --gris: #b7acbb; --trait: #3a2e40; --accent: #f0a6c8; } }
* { box-sizing: border-box; }
body { margin: 0; padding: 16px 16px 48px; background: var(--fond); color: var(--encre); font: 16px/1.5 system-ui, sans-serif; }
main { max-width: 1500px; margin: 0 auto; }
h1 { margin: 16px 0 4px; font-size: 28px; }
h2 { margin: 40px 0 12px; font-size: 21px; }
h2 small { font-weight: 400; font-size: 14px; color: var(--gris); margin-left: 8px; }
a { color: var(--accent); }
a:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.etat { margin: 0; color: var(--gris); }
.etat strong { color: var(--encre); }
nav ul { display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 12px 0 0; padding: 0; list-style: none; }
.grille { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin: 0; padding: 0; list-style: none; }
figure { margin: 0; padding: 8px; background: var(--carte); border: 1px solid var(--trait); border-radius: 10px; }
figure img { display: block; width: 100%; height: auto; border-radius: 6px; border: 1px solid var(--trait); }
figcaption { margin-top: 6px; font-size: 13px; line-height: 1.35; color: var(--gris); }
.saut { position: absolute; left: -999px; } .saut:focus { left: 16px; top: 8px; background: var(--carte); padding: 6px 10px; }
@media (max-width: 900px) { .grille { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .grille { grid-template-columns: minmax(0, 1fr); } }
</style>
</head>
<body>
<a class="saut" href="#matieres">Aller à la table des matières</a>
<main>
<header>
  <h1>La planche de relecture de l’administration</h1>
  <p class="etat">${esc(datee)} · version du code <strong>${esc(version)}</strong> · branche <strong>${esc(branche)}</strong></p>
  <p class="etat">${vignettes.length} captures : ${PAGES.length} pages × ${LARGEURS.length} largeurs (${LARGEURS.map(px).join(', ')}) × nuit et jour × menu déplié et replié, puis les deux pages d’essai. ${esc(policeEffective)}.</p>
</header>
<nav id="matieres" aria-label="Table des matières">
  <ul>
${[...PAGES, ...ESSAIS].map(p => `    <li><a href="#${p.id}">${esc(p.nom)}</a></li>`).join('\n')}
  </ul>
</nav>
${sections}
</main>
</body>
</html>
`;
fs.writeFileSync(path.join(CAPT, 'planche.html'), html);

// ---- ce que le banc vérifie
const attendu = LARGEURS.length * THEMES.length * MENUS.length * PAGES.length + ESSAIS.length;
const sur = vignettes.filter(v => fs.existsSync(path.join(CAPT, v.fichier)) && fs.statSync(path.join(CAPT, v.fichier)).size > 2000);
ok(`planche · ${attendu} captures : ${PAGES.length} pages × 12 contextes (3 largeurs × nuit et jour × menu déplié et replié), plus les deux pages d’essai`, vignettes.length === attendu && vignettes.length >= 120 && sur.length === attendu, `${vignettes.length} prises, ${sur.length} fichiers lisibles`);
ok('planche · chaque capture montre le thème et le menu qu’elle annonce (data-theme, html.menu-replie, --large-menu)', manques.length === 0, manques.join(' / '));
const incompletes = vignettes.filter(v => !(v.legende.includes(v.theme === 'jour' ? 'jour' : 'nuit') && v.legende.includes(px(v.largeur)) && /menu (déplié|replié)/.test(v.legende) && /polices/.test(v.legende)));
ok('planche · chaque légende porte le thème, la largeur, l’état du menu et la police effective (sa forme)', incompletes.length === 0, incompletes.map(v => v.fichier).join(', '));
ok('planche · planche.html a un alt par vignette, une table des matières, la date, le commit et la branche', (html.match(/<img /g) || []).length === attendu && (html.match(/ alt="Capture : [^"]+"/g) || []).length === attendu && /id="matieres"/.test(html) && commit !== 'inconnu' && html.includes(esc(version)) && html.includes(esc(branche)) && html.includes(esc(datee)), JSON.stringify({ commit, branche, datee }));
const bruit = vignettes.filter(v => v.erreurs.length);
ok('planche · aucune erreur de script sur les 122 pages', bruit.length === 0, bruit.map(v => `${v.fichier} : ${v.erreurs.join(' / ')}`).join(' // '));
console.log(`\n  ${policeEffective}\n  planche : ${path.relative(ROOT, path.join(CAPT, 'planche.html'))}`);
await navigateur.close();
bilan(CAPT);
