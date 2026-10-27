// La bibliothèque d'icônes de l'administration (admin/icones.js, ICONES) et ses consommateurs, vérifiés dans Chromium, hors
// ligne, sur la base fictive commune (admin-fictif.mjs).
//   python3 site/build.py && node site/icones.mjs
// Ce que le banc regarde : la bibliothèque elle-même (gelée, sans doublon de tracé, tous les noms de GESTES.ICO, l'ancien nom
// de chaque icône qui mène à un tracé), ce qu'ICONES.svg écrit (le carré 24 × 24, aria-hidden, la taille par --ico, le trait
// donné) ; chaque svg de l'accueil, de Représentations et du planning ; la barre du téléphone (390 px) et la tuile Équipe, qui
// partagent le même dessin ; les tracés d'avant, comparés à un tableau en dur (un échange d'icône se verrait) ; les tailles
// d'avant (la barre du bas 22 px, le fil d'Ariane 18 px, les boutons de tuile, le témoin) ; l'espace de l'équipe, qui garde
// ses tracés sans la bibliothèque ; et la petite vue d'essai #/essai/icones (hors du menu et de la recherche), photographiée
// dans site/dist/shots-icones/icones.png. Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, ROOT, URL0, ok, calme, ouvrir, compte, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-icones');
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
const attendre = (page, fn, ms = 6000, arg = null) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);

// ---- ce que le banc sait des icônes d'avant (le dessin de chaque icône du téléphone et du planning, tel qu'il était dans mobile.js et planning.js)
const TELEPHONE_AVANT = {
  tableau: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>',
  dates: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  planning: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  equipe: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5a5 5 0 0 1 6 5"/>',
  plus: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  ajouter: '<path d="M12 5v14M5 12h14"/>',
  installer: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M12 7v7M9 11l3 3 3-3"/>',
};
const PLANNING_AVANT = {
  avant: '<path d="m15 18-6-6 6-6"/>',
  apres: '<path d="m9 18 6-6-6-6"/>',
  ici: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none"/>',
  fermer: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  masquer: '<path d="M10.6 5.1A9.9 9.9 0 0 1 12 5c5.4 0 8.8 4.6 9.8 6.4a1.3 1.3 0 0 1 0 1.2 15.5 15.5 0 0 1-2.4 3.2M6.6 6.6C4.4 8 2.9 10.2 2.2 11.4a1.3 1.3 0 0 0 0 1.2C3.2 14.4 6.6 19 12 19a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/>',
  gens: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',
};
// les clés que GESTES.ICO portait, lues par menus.js, equipe/equipe.js et les autres modules
const CLES_ICO = ['agenda', 'bas', 'cache', 'carte', 'coche', 'copier', 'croix', 'droite', 'dupliquer', 'euro', 'externe', 'feuille', 'gauche', 'haut', 'mel', 'message', 'moins', 'oeil', 'ouvrir', 'plus', 'poubelle', 'reglages', 'tel', 'points', 'partager', 'alerte'];
// ce que les lots suivants dessinent : ils doivent déjà exister
const NOUVEAUX = ['tableau-de-bord', 'dates', 'planning', 'equipe', 'liste', 'grille', 'carte', 'soleil', 'lune', 'moniteur', 'densite', 'epingle', 'etoile', 'replier', 'deplier', 'poignee-h', 'poignee-v', 'coin', 'coche-cercle', 'remplacant', 'absent', 'cadenas', 'fiche', 'vue-liste', 'vue-tableur', 'vue-carte', 'engrenage', 'spectacles', 'diffusion', 'mallette', 'ateliers', 'lieux', 'feuilles', 'texte', 'journal'];

// le dedans d'un svg tel que le navigateur le relit (un texte de tracé et un svg posé se comparent à égalité)
const INTERNE = `window.interne = html => { const t = document.createElement('template'); t.innerHTML = html; return t.content.firstChild.innerHTML; };`;
const poser = page => page.evaluate(INTERNE);

// ---- un svg qui n'est pas de la bibliothèque doit être l'une de ces exceptions nommées
const hors = page => page.evaluate(() => [...document.querySelectorAll('svg:not(.ico)')].filter(s => s.getBoundingClientRect().width > 0).map(s => {
  const vb = s.getAttribute('viewBox') || '';
  const exception = s.closest('.pieuvre, [data-pieuvre]') ? 'pieuvre' : s.classList.contains('tb-salut-orne') ? 'ornement' : s.closest('.fond-carte, .carte-fond, #carte') ? 'fond de carte' : s.closest('.tt-calque') ? 'tentacules' : vb === '0 0 12 12' || vb === '0 0 12 18' ? 'petit (12 × 12, 12 × 18)' : '';
  return { exception, vb, parent: (s.parentElement.id || s.parentElement.className || s.parentElement.tagName) + '' };
}).filter(x => !x.exception));
const seule = page => page.evaluate(() => [...document.querySelectorAll('svg.ico')].filter(s => s.getBoundingClientRect().width > 0).map(s => ({ vb: s.getAttribute('viewBox'), cache: s.getAttribute('aria-hidden'), parent: (s.parentElement.id || s.parentElement.className || s.parentElement.tagName) + '' })));
const bons = xs => xs.filter(x => x.vb !== '0 0 24 24' || x.cache !== 'true');

// ================================================================================ 1 · la bibliothèque
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  await page.waitForSelector('.tb-tuile', { timeout: 15000 });
  const b = await page.evaluate(([cles, nouveaux]) => {
    const T = ICONES.TRACES, nettoie = d => d.replace(/\s+/g, '');
    const vus = new Map(), doublons = [];
    for (const [nom, d] of Object.entries(T)) { const k = nettoie(d); if (vus.has(k)) doublons.push(`${vus.get(k)} = ${nom}`); else vus.set(k, nom); }
    let inconnue = '';
    try { ICONES.svg('pas-une-icone'); } catch (e) { inconnue = String(e.message); }
    const un = ICONES.svg('plus', { taille: 22, trait: 1.9 }), deux = ICONES.svg('plus'), trois = ICONES.svg('actualiser', { taille: 16, trait: 2.2, classe: 'temoin-ic' });
    const gestes = typeof GESTES !== 'undefined' ? GESTES : null;
    return {
      gele: Object.isFrozen(T), noms: JSON.stringify(ICONES.NOMS) === JSON.stringify(Object.keys(T)), n: ICONES.NOMS.length, doublons,
      manquantsIco: cles.filter(k => !(k in ICONES.ICO) || !/^<svg class="ico"/.test(ICONES.ICO[k])),
      manquantsNoms: nouveaux.filter(n => !(n in T) && !(n in ICONES.ALIAS)),
      renommages: Object.entries(ICONES.RENOMMAGE).filter(([, n]) => !(n in T)).map(([a]) => a), nRenommages: Object.keys(ICONES.RENOMMAGE).length,
      alias: Object.entries(ICONES.ALIAS).filter(([, n]) => !(n in T)).map(([a]) => a),
      inconnue, un, deux, trois,
      icoSeize: Object.values(ICONES.ICO).every(s => { const ouvrante = s.match(/^<svg[^>]*>/)[0]; return /style="--ico:16px"/.test(ouvrante) && !/ (width|height)=/.test(ouvrante); }),
      reglages: ICONES.ICO.reglages === ICONES.svg('engrenage', { taille: 16 }) && ICONES.ICO.reglages !== ICONES.svg('soleil', { taille: 16 }),
      agenda: ICONES.ICO.agenda === ICONES.svg('calendrier', { taille: 16 }), cache: ICONES.ICO.cache === ICONES.svg('oeil-barre', { taille: 16 }),
      alias_menus: !!gestes && gestes.ICO === ICONES.ICO, exportsGestes: !!gestes && typeof gestes.dansChamp === 'function' && typeof gestes.modaleOuverte === 'function',
      ornement: ICONES.ornement.includes('viewBox="0 0 260 160"') && ICONES.ornement.includes('class="tb-salut-orne"'),
      carteEstLeRepere: T.carte.includes('M12 21s-6.5-5.6-6.5-11'),
    };
  }, [CLES_ICO, NOUVEAUX]);
  ok('1 · ICONES.TRACES est gelé et ICONES.NOMS en est la liste des clés', b.gele && b.noms && b.n >= 65, `${b.n} noms`);
  ok('1 · aucun doublon de tracé dans ICONES.TRACES (un engrenage, un calendrier, une équipe, une horloge)', b.doublons.length === 0, b.doublons.join(' ; '));
  ok('1 · ICONES.ICO porte les 26 clés de l’ancien GESTES.ICO, en svg de la bibliothèque à 16 px', b.manquantsIco.length === 0 && b.icoSeize, b.manquantsIco.join(', '));
  ok('1 · « reglages » est la roue dentée (engrenage), « soleil » garde le cercle aux huit rayons ; agenda est le calendrier, cache l’œil barré', b.reglages && b.agenda && b.cache);
  ok('1 · « carte » reste le repère de lieu ; les noms neufs que les lots suivants dessinent existent déjà', b.carteEstLeRepere && b.manquantsNoms.length === 0, b.manquantsNoms.join(', '));
  ok('1 · chaque ancien nom (fichier:nom) de la table de renommage mène à un tracé, chaque alias de rubrique aussi', b.renommages.length === 0 && b.alias.length === 0 && b.nRenommages >= 55, `${b.nRenommages} · ${b.renommages.join(', ')} · ${b.alias.join(', ')}`);
  ok('1 · un nom inconnu lève une erreur qui le nomme (jamais un trou muet)', /pas-une-icone/.test(b.inconnue), b.inconnue);
  ok('1 · ICONES.svg écrit le carré 24 × 24, aria-hidden, la taille par --ico (jamais width / height) et le trait demandé', /^<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="--ico:22px">/.test(b.un) && !/ width=| height=/.test(b.un));
  ok('1 · sans taille, pas de style (la règle .ico donne 16 px) et le trait vaut 2 ; une classe s’ajoute à « ico »', !/style=/.test(b.deux) && /stroke-width="2"/.test(b.deux) && /^<svg class="ico temoin-ic" /.test(b.trois));
  ok('1 · menus.js lit G.ICO : GESTES.ICO est ICONES.ICO ; GESTES exporte dansChamp et modaleOuverte (le lot 3 les consomme)', b.alias_menus && b.exportsGestes);
  ok('1 · ICONES.ornement : la tentacule du tableau de bord, 260 × 160, hors du carré 24 × 24', b.ornement);
  ok('1 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 2 · l’accueil, Représentations et le planning (1440 px)
for (const [nom, hash, attente] of [['l’accueil', '#/accueil', '.tb-tuile'], ['Représentations', '#/representations', '#l-dates a.ligne'], ['le planning', '#/planning', '.pl-btn']]) {
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash });
  await page.waitForSelector(attente, { timeout: 15000 });
  await page.waitForTimeout(500);
  await poser(page);
  const xs = await seule(page), mauvais = bons(xs), autres = await hors(page);
  ok(`2 · ${nom} : ${xs.length} svg de la bibliothèque, tous en 24 × 24 et aria-hidden`, xs.length >= 3 && mauvais.length === 0, JSON.stringify(mauvais));
  ok(`2 · ${nom} : les svg hors bibliothèque sont des exceptions nommées (la pieuvre, la tentacule, le fond de carte, les 12 × 12 et 12 × 18)`, autres.length === 0, JSON.stringify(autres));
  ok(`2 · ${nom} : aucune erreur de script`, erreurs.length === 0, erreurs.join(' / '));
  if (hash === '#/accueil') {
    const t = await page.evaluate(() => ({
      tuiles: [...document.querySelectorAll('.tb-tuile .tb-ico-t svg')].map(s => { const r = s.getBoundingClientRect(); return `${r.width}x${r.height}`; }),
      boutons: [...document.querySelectorAll('.tb-ico svg')].map(s => { const r = s.getBoundingClientRect(); return r.width ? `${r.width}x${r.height}` : ''; }).filter(Boolean),
      temoin: [...document.querySelectorAll('#b-temoin svg.temoin-ic')].map(s => { const r = s.getBoundingClientRect(); return `${r.width}x${r.height}`; }),
      cle: [...document.querySelectorAll('#b-mdp svg')].map(s => { const r = s.getBoundingClientRect(); return { t: `${r.width}x${r.height}`, align: getComputedStyle(s).verticalAlign }; }),
      loupe: [...document.querySelectorAll('#b-chercher svg')].map(s => { const r = s.getBoundingClientRect(); return { t: `${r.width}x${r.height}`, trait: getComputedStyle(s).strokeWidth }; }),
      ornement: [...document.querySelectorAll('.tb-salut-orne')].map(s => s.innerHTML === interne(ICONES.ornement) ? 'identique' : 'autre'),
    }));
    ok('2 · l’accueil : au moins 10 icônes de tuile, chacune à 15 px (habillage.js : .tb-ico-t svg)', t.tuiles.length >= 10 && t.tuiles.every(x => x === '15x15'), t.tuiles.join(' '));
    ok('2 · l’accueil : les boutons de tuile gardent leur svg d’avant (16 × 16 pour l’engrenage, 12 × 12 pour le chevron)', t.boutons.length >= 2 && t.boutons.every(x => x === '16x16' || x === '12x12') && t.boutons.includes('16x16'), t.boutons.join(' '));
    ok('2 · l’accueil : .temoin-ic est toujours sur le svg du témoin (16 px) ; la clé du mot de passe 15 px, alignée à -3px par le CSS ; la loupe 18 px au trait de 2,2', t.temoin.join() === '16x16' && t.cle.length === 1 && t.cle[0].t === '15x15' && t.cle[0].align === '-3px' && t.loupe[0].t === '18x18' && t.loupe[0].trait === '2.2px', JSON.stringify(t));
    ok('2 · l’accueil : la tentacule du salut est ICONES.ornement', t.ornement.join() === 'identique', t.ornement.join());
    await page.click('.tb-tuile .tb-ico[data-tb-reglages]').catch(() => {});
    await page.waitForTimeout(200);
    await page.evaluate(() => annoncer('Essai des icônes', { action: () => {} }));
    const a = await page.evaluate(() => { const s = document.querySelector('.annonce .annonce-fermer svg'); if (!s) return null; const r = s.getBoundingClientRect(); return { t: `${r.width}x${r.height}`, trait: getComputedStyle(s).strokeWidth, croix: s.innerHTML === interne(ICONES.svg('croix')) }; });
    ok('2 · l’accueil : la croix d’une annonce est celle de la bibliothèque, 16 px au trait de 2,4', !!a && a.t === '16x16' && a.trait === '2.4px' && a.croix, JSON.stringify(a));
  }
  await ctx.close();
}

// ================================================================================ 3 · le planning : ses six dessins, comparés à ceux d’avant
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/planning' });
  await page.waitForSelector('.pl-btn[data-pl="avant"]', { timeout: 15000 });
  await poser(page);
  const norme = (page, html) => page.evaluate(h => { const t = document.createElement('template'); t.innerHTML = `<svg>${h}</svg>`; return t.content.firstChild.innerHTML; }, html);
  const p = await page.evaluate(() => ({
    avant: document.querySelector('.pl-btn[data-pl="avant"] svg')?.innerHTML, apres: document.querySelector('.pl-btn[data-pl="apres"] svg')?.innerHTML,
    taille: (() => { const r = document.querySelector('.pl-btn[data-pl="avant"] svg').getBoundingClientRect(); return `${r.width}x${r.height}`; })(),
    trait: getComputedStyle(document.querySelector('.pl-btn[data-pl="avant"] svg')).strokeWidth,
    table: Object.fromEntries(['gauche', 'droite', 'aujourdhui', 'croix', 'oeil-barre', 'personne'].map(n => [n, interne(ICONES.svg(n))])),
  }));
  ok('3 · le planning : les flèches « avant » et « après » sont celles d’avant, 18 px, trait 2,2', p.avant === await norme(page, PLANNING_AVANT.avant) && p.apres === await norme(page, PLANNING_AVANT.apres) && p.taille === '18x18' && p.trait === '2.2px', `${p.avant} · ${p.taille} · ${p.trait}`);
  const attendus = { gauche: 'avant', droite: 'apres', aujourdhui: 'ici', croix: 'fermer', 'oeil-barre': 'masquer', personne: 'gens' };
  const ecarts = [];
  for (const [n, ancien] of Object.entries(attendus)) if (p.table[n] !== await norme(page, PLANNING_AVANT[ancien])) ecarts.push(`${ancien} → ${n}`);
  ok('3 · les six dessins du planning (avant, après, ici, fermer, masquer, gens) sont ceux d’avant : un échange d’icône se verrait', ecarts.length === 0, ecarts.join(' ; '));
  ok('3 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 4 · le téléphone (390 px)
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 390, hauteur: 844, hash: '#/accueil' });
  await page.waitForSelector('.ob-barre a', { timeout: 15000 });
  await page.waitForSelector('.tb-tuile[data-k="equipe"] .tb-ico-t svg', { timeout: 15000 });
  const norme = html => page.evaluate(h => { const t = document.createElement('template'); t.innerHTML = `<svg>${h}</svg>`; return t.content.firstChild.innerHTML; }, html);
  const t = await page.evaluate(() => {
    const mes = s => { const r = s.getBoundingClientRect(); return `${r.width}x${r.height}`; };
    return {
      barre: [...document.querySelectorAll('.ob-barre a svg, .ob-barre button svg')].map(s => ({ t: mes(s), trait: getComputedStyle(s).strokeWidth, d: s.innerHTML, cls: s.getAttribute('class') })),
      creer: [...document.querySelectorAll('.ob-plus svg')].map(s => ({ t: mes(s), trait: getComputedStyle(s).strokeWidth, d: s.innerHTML })),
      tuileEquipe: document.querySelector('.tb-tuile[data-k="equipe"] .tb-ico-t svg').innerHTML,
      noms: [...document.querySelectorAll('.ob-barre a span, .ob-barre button span')].map(s => s.textContent.trim()),
    };
  });
  ok('4 · la barre du téléphone : cinq icônes de la bibliothèque, chacune 22 × 22 au trait de 1,9, et les libellés d’avant', t.barre.length === 5 && t.barre.every(x => x.t === '22x22' && x.trait === '1.9px' && /^ico$/.test(x.cls)) && t.noms.join() === 'Tableau,Dates,Planning,Équipe,Plus', JSON.stringify(t.barre.map(x => x.t + x.trait)) + t.noms.join());
  const attendu = [TELEPHONE_AVANT.tableau, TELEPHONE_AVANT.dates, TELEPHONE_AVANT.planning, TELEPHONE_AVANT.equipe, TELEPHONE_AVANT.plus];
  const ecarts = [];
  for (let i = 0; i < 5; i++) if (t.barre[i]?.d !== await norme(attendu[i])) ecarts.push(['Tableau', 'Dates', 'Planning', 'Équipe', 'Plus'][i]);
  ok('4 · les cinq dessins de la barre du téléphone sont ceux d’avant, comparés à un tableau en dur', ecarts.length === 0, ecarts.join(', '));
  ok('4 · le bouton « Créer » flottant : le plus d’avant, 22 × 22 au trait de 1,9', t.creer.length === 1 && t.creer[0].t === '22x22' && t.creer[0].trait === '1.9px' && t.creer[0].d === await norme(TELEPHONE_AVANT.ajouter));
  ok('4 · la barre du téléphone et la tuile Équipe partagent le même dessin (le même d)', t.tuileEquipe === t.barre[3].d, t.tuileEquipe);
  await page.click('[data-ob="plus"]');
  await attendre(page, () => document.querySelector('.ob-tete-btn svg'));
  const inst = await page.evaluate(() => { const s = document.querySelector('.ob-tete-btn svg'); if (!s) return null; const r = s.getBoundingClientRect(); return { t: `${r.width}x${r.height}`, d: s.innerHTML }; });
  ok('4 · la feuille « Plus » : l’icône « Installer » est celle d’avant, 18 px (.ob-tete-btn svg)', !!inst && inst.t === '18x18' && inst.d === await norme(TELEPHONE_AVANT.installer), JSON.stringify(inst));
  await page.keyboard.press('Escape');
  await page.goto(`${URL0}#/representations/101`);
  await attendre(page, () => document.querySelector('.fil-ariane a svg'));
  await page.waitForTimeout(300);
  const f = await page.evaluate(() => { const s = document.querySelector('.fil-ariane a svg'); if (!s) return null; const r = s.getBoundingClientRect(); return { t: `${r.width}x${r.height}`, trait: getComputedStyle(s).strokeWidth }; });
  ok('4 · le fil d’Ariane (« ‹ Représentations ») : le chevron fait 18 px, au trait de 2,2', !!f && f.t === '18x18' && f.trait === '2.2px', JSON.stringify(f));
  ok('4 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 5 · l’espace de l’équipe garde ses tracés
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  const equipeHtml = fs.readFileSync(path.join(ROOT, 'equipe', 'index.html'), 'utf8');
  ok('5 · equipe/index.html ne charge pas icones.js (l’équipe garde ses tracés)', !/icones\.js/.test(equipeHtml));
  // gestes.js chargé seul, comme dans l’espace de l’équipe : ICONES n’existe pas, ICO garde ses tracés (le cercle aux huit rayons)
  const nu = await ctx.newPage();
  await nu.goto(URL0.replace('index.html', 'gestes.js'));
  await nu.addScriptTag({ url: URL0.replace('index.html', 'gestes.js') });
  const e = await nu.evaluate(() => ({ icones: typeof ICONES, reglages: GESTES.ICO.reglages, croix: GESTES.ICO.croix, cles: Object.keys(GESTES.ICO).length }));
  ok('5 · gestes.js sans la bibliothèque : GESTES.ICO garde ses 26 tracés, ses réglages restent le cercle aux huit rayons, à l’ancienne', e.icones === 'undefined' && e.cles === 26 && e.reglages.includes('M12 2v3M12 19v3') && !/class="ico"/.test(e.reglages) && e.croix.includes('width="16"'), JSON.stringify({ ...e, reglages: e.reglages.slice(0, 80) }));
  await nu.close();
  ok('5 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 6 · la petite vue d’essai #/essai/icones
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1280, hauteur: 900, hash: '#/essai/icones' });
  await attendre(page, () => document.querySelector('.essai-icones li'), 15000);
  await page.waitForTimeout(400);
  const v = await page.evaluate(() => ({
    n: document.querySelectorAll('.essai-icones li').length, noms: [...document.querySelectorAll('.essai-icones li code')].map(c => c.textContent), attendus: ICONES.NOMS,
    sans: [...document.querySelectorAll('.essai-icones li')].filter(li => !li.querySelector('svg.ico')).length, adresse: location.hash,
    vides: [...document.querySelectorAll('.essai-icones svg')].map((s, i) => { const b = s.getBBox(); return { i, b }; }).filter(({ b }) => (b.width < 1 && b.height < 1) || b.x < -0.5 || b.y < -0.5 || b.x + b.width > 24.5 || b.y + b.height > 24.5).map(x => ICONES.NOMS[x.i]),
    taille: (() => { const r = document.querySelector('.essai-icones svg').getBoundingClientRect(); return `${r.width}x${r.height}`; })(),
    menu: document.querySelectorAll('nav.nav a[href*="essai"], .nav-autres a[href*="essai"]').length, titre: document.querySelector('h1')?.textContent,
  }));
  ok('6 · #/essai/icones montre ICONES.NOMS en grille : un svg et le nom sous chaque icône, dans l’ordre', v.n === v.attendus.length && v.noms.join() === v.attendus.join() && v.sans === 0 && v.adresse === '#/essai/icones', `${v.n} sur ${v.attendus.length}`);
  ok('6 · chaque dessin est tracé dans son carré 24 × 24 (ni vide, ni débordant) et se montre à 28 px', v.vides.length === 0 && v.taille === '28x28', v.vides.join(', '));
  ok('6 · la vue d’essai est hors du menu des rubriques', v.menu === 0 && v.titre === 'Les icônes');
  await page.click('#b-chercher');
  await page.fill('#rch-q', 'icônes');
  await page.waitForTimeout(400);
  const trouves = await page.evaluate(() => document.querySelector('#rch-liste')?.textContent || '');
  ok('6 · … et hors de la recherche', !/essai|Les icônes/i.test(trouves), trouves.replace(/\s+/g, ' ').slice(0, 120));
  await page.keyboard.press('Escape');
  await calme(page);
  await page.screenshot({ path: `${CAPT}/icones.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  ok('6 · à 390 px la grille tient dans l’écran, sans défilement de côté', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  ok('6 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

await navigateur.close();
bilan(CAPT);
