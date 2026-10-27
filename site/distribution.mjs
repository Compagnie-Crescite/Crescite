// La distribution à l'écran, première moitié (admin/distribution.js, et ce qu'il touche : admin/equipe.js, admin/gardefous.js,
// admin/habillage.js), vérifiée dans Chromium, hors ligne, sur la base fictive commune (admin-fictif.mjs).
//   node site/distribution.mjs
// Ce que le banc regarde : la cellule d'une date (DISTRIBUTION.cellule, rendue à part : des pastilles rondes aux initiales,
// jamais de photo, rangées par métier avec leur liseré, un anneau pointillé pour un remplaçant, gris et barré pour qui ne part
// pas, « −n », « +n », l'infobulle, le texte pour les lecteurs d'écran, le contraste des lisérés dans les deux thèmes, la
// aucune animation ni transition, fabrication du HTML de 120 dates de huit personnes, puis la pose d'un écran de 30 dates dans
// la page à CPU=4) ; la règle de qui sera prévenu (celle du déclencheur : un compte, une date à
// venir, une présence qui change) ; GARDEFOUS.indisposDe ; la fiche d'une date (la tournée rangée par métier, la fonction
// et la note de chacun, « Remplace X » en lien qui vise la personne décochée à l'instant, le résumé des personnes
// prévenues, l'enregistrement) ; l'impact d'un changement de distribution dans Spectacles → Distribution (une seule boîte,
// les dates qui changent, « limiter à partir d'aujourd'hui », renoncer, l'ordre des écritures). La matrice, la fenêtre d'une
// case et « Étendre à… » viennent avec le tableur (sous-lot suivant). Les lignes ajoutées à la base fictive le sont avant
// chaque bloc et retirées à la fin : la base commune n'est pas touchée. Les captures vont dans site/dist/shots-distribution/.
// Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, plus, DB, MODIFS, ok, calme, ouvrir, texte, compte, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-distribution');
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
const attendre = (page, fn, arg = null, ms = 6000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);

// ---- la base du banc : une quatrième personne, un compte, des écarts sans identifiant (la clé de crescite_equipes est composite)
const TOUCHEES = ['crescite_personnes', 'crescite_personnes_privees', 'crescite_equipes', 'crescite_distributions'];
const AVANT = Object.fromEntries(TOUCHEES.map(t => [t, structuredClone(DB[t])]));
function garnir() {
  for (const t of TOUCHEES) DB[t] = structuredClone(AVANT[t]);
  DB.crescite_personnes.push({ id: 4, slug: 'noe-petit', prenom: 'Noé', nom: 'Petit', metiers: ['régisseur'], photo: null, photo_publique: false, publie: true, ordre: 40 });
  DB.crescite_personnes_privees.push({ personne_id: 4, telephone: '06 11 22 33 44' });
  DB.crescite_personnes_privees.find(x => x.personne_id === 2).user_id = 'u-jean';   // le seul compte : Jean
  DB.crescite_equipes.push({ date_id: 101, personne_id: 2, present: false, fonction: null, note: null },   // Jean ne part pas à Caen
    { date_id: 103, personne_id: 3, present: true, fonction: 'régie', note: null });                       // Léa en renfort régie au Havre
  MODIFS.length = 0;
}
const retirer = () => { for (const t of TOUCHEES) DB[t] = AVANT[t]; };
const jour = n => plus(n);

// ================================================================================ 1 · la cellule
{
  garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900 });
  await page.waitForFunction(() => typeof DISTRIBUTION !== 'undefined' && E.equipeInstallee, null, { timeout: 15000 });
  ok('1 · distribution.js est chargé (DISTRIBUTION), après equipe.js et avant planning.js', await page.evaluate(() => {
    const ordre = [...document.scripts].map(s => (s.getAttribute('src') || '').split('/').pop()); const i = ordre.indexOf('distribution.js');
    return typeof DISTRIBUTION.cellule === 'function' && i > ordre.indexOf('equipe.js') && i < ordre.indexOf('planning.js');
  }));
  // la cellule de chaque date essayée, posée dans une carte pour la voir et la mesurer
  await page.evaluate(() => {
    const zone = document.createElement('div');
    zone.id = 'essai-cellules'; zone.className = 'tableur';
    zone.style.cssText = 'position:fixed;left:20px;top:20px;z-index:9999;display:grid;gap:8px;padding:14px;background:var(--carte);border:1px solid var(--trait);border-radius:12px;width:290px';
    // Camille a un portrait public (hors portraits/) : la bonne voie ne doit pas le poser dans la grille, la mauvaise (avatar) le poserait
    E.personnes.find(x => x.id === 1).photo = 'photos/camille.webp';
    [101, 103].forEach(id => { const c = document.createElement('div'); c.dataset.d = id; c.style.cssText = 'width:250px;padding:6px 8px;border:1px solid var(--trait)'; c.innerHTML = DISTRIBUTION.cellule(E.dates.find(d => d.id === id)); zone.append(c); });
    document.body.append(zone);
  });
  const lire = id => page.evaluate(i => {
    const c = document.querySelector(`#essai-cellules [data-d="${i}"]`);
    return { n: c.querySelectorAll('.avatar.mini').length, textes: [...c.querySelectorAll('.avatar.mini')].map(a => a.textContent), titres: [...c.querySelectorAll('.avatar.mini')].map(a => a.title),
      classes: [...c.querySelectorAll('.avatar.mini')].map(a => a.className), moins: c.querySelector('.dist-moins')?.textContent || '', plus: c.querySelector('.dist-plus')?.textContent || '',
      lu: c.querySelector('.sr')?.textContent || '', photos: c.querySelectorAll('img, [style*="background-image"]').length, aria: [...c.querySelectorAll('.avatar.mini')].every(a => a.getAttribute('aria-hidden') === 'true') };
  }, id);
  const c101 = await lire(101), c103 = await lire(103);
  ok('1 · la cellule de la 101 montre deux pastilles rondes aux initiales (Camille, Jean)', c101.n === 2 && c101.textes.join(',') === 'CE,JD', JSON.stringify(c101.textes));
  ok('1 · … Jean, qui ne part pas, est gris et barré (.absent), Camille non', /\babsent\b/.test(c101.classes[1]) && !/\babsent\b/.test(c101.classes[0]), JSON.stringify(c101.classes));
  ok('1 · … un badge « −1 » compte ceux de la tournée qui ne partent pas', c101.moins === '−1', c101.moins);
  ok('1 · le rôle est en infobulle : « Camille Essai · Bérénice » ; qui ne part pas le dit (« Jean Durand · ne part pas »)', c101.titres[0] === 'Camille Essai · Bérénice' && c101.titres[1] === 'Jean Durand · ne part pas', JSON.stringify(c101.titres));
  ok('1 · chacun porte le liseré de son métier : Camille jeu, Jean technique', /\bm-jeu\b/.test(c101.classes[0]) && /\bm-technique\b/.test(c101.classes[1]), JSON.stringify(c101.classes));
  ok('1 · les pastilles sont cachées aux lecteurs d’écran, et un texte dit tout (noms, qui ne part pas)', c101.aria && /Camille Essai/.test(c101.lu) && /Jean Durand \(ne part pas\)/.test(c101.lu), c101.lu);
  ok('1 · la cellule de la 103 : Camille, Jean, puis Léa en renfort régie, rangée avec la technique, anneau pointillé (.remplacant)', c103.n === 3 && c103.textes.join(',') === 'CE,JD,LM' && /\bremplacant\b/.test(c103.classes[2]) && /\bm-technique\b/.test(c103.classes[2]) && c103.moins === '', JSON.stringify(c103));
  ok('1 · l’infobulle d’un renfort dit sa fonction et qu’il est renfort', /^Léa Martin · régie/.test(c103.titres[2]) && /remplaçant ou renfort/.test(c103.titres[2]), c103.titres[2]);
  const temoin = await page.evaluate(() => { const camille = E.personnes.find(x => x.id === 1), lea = E.personnes.find(x => x.id === 3); return { publicAvatar: /background-image/.test(avatar(camille, true)), priveAvatar: /background-image/.test(avatar(lea, true)), mini: /background-image|<img/.test(DISTRIBUTION.avatarMini(camille)) }; });
  ok('1 · jamais de photo dans la grille : Camille a un portrait public (avatar() le poserait en fond, ce qui prouve que la vérification peut échouer) et Léa un portrait privé ; ni l’une ni l’autre n’en a dans la cellule', temoin.publicAvatar && !temoin.priveAvatar && !temoin.mini && c101.photos === 0 && c103.photos === 0, JSON.stringify({ ...temoin, c101: c101.photos, c103: c103.photos }));
  const forme = await page.evaluate(() => {
    const as = [...document.querySelectorAll('#essai-cellules [data-d="103"] .avatar.mini')], r = as.map(a => a.getBoundingClientRect()), st = as.map(a => getComputedStyle(a));
    return { w: r[0].width, h: r[0].height, chevauche: r[1].left < r[0].right, bordLea: st[2].borderTopStyle, couleurLea: st[2].borderTopColor, ambre: (() => { const p = document.createElement('i'); p.style.color = 'var(--ambre)'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })(),
      bordCamille: st[0].borderTopStyle, rondeur: st[0].borderRadius, absentBarre: getComputedStyle(document.querySelector('#essai-cellules [data-d="101"] .avatar.absent')).textDecorationLine };
  });
  ok('1 · 24 px, rondes, et qui se chevauchent', forme.w === 24 && forme.h === 24 && forme.chevauche && /50%/.test(forme.rondeur), JSON.stringify(forme));
  ok('1 · un remplaçant ou un renfort a un anneau pointillé ambre ; les autres un trait plein', forme.bordLea === 'dashed' && forme.couleurLea === forme.ambre && forme.bordCamille === 'solid', JSON.stringify(forme));
  ok('1 · qui ne part pas est barré', forme.absentBarre === 'line-through', forme.absentBarre);
  await calme(page);
  await page.locator('#essai-cellules').screenshot({ path: `${CAPT}/distribution-cellule.png` });

  // le métier d'un renfort, l'ordre, « +n », une date sans équipe
  const rang = await page.evaluate(() => {
    E.personnes.push({ id: 9, prenom: 'Zoé', nom: 'Lamy', metiers: ['accueil'] });
    E.equipes.push({ date_id: 102, personne_id: 9, present: true, fonction: 'accueil', note: null }, { date_id: 102, personne_id: 2, present: true, fonction: 'lumière', note: null });
    const d = E.dates.find(x => x.id === 102), h = document.createElement('div'); h.innerHTML = DISTRIBUTION.cellule(d);
    const etroit = document.createElement('div'); etroit.innerHTML = DISTRIBUTION.cellule(d, { largeur: 76 });
    const sansEquipe = DISTRIBUTION.cellule(E.dates.find(x => x.id === 107));
    return { ordre: [...h.querySelectorAll('.avatar.mini')].map(a => a.textContent + ':' + (a.className.match(/m-\w+/) || [''])[0]).join(' '), etroit: [...etroit.querySelectorAll('.avatar.mini')].length, plus: etroit.querySelector('.dist-plus')?.textContent, plusTitre: etroit.querySelector('.dist-plus')?.title, lu: etroit.querySelector('.sr').textContent, sansEquipe,
      motifs: [['régie', 'technique'], ['Son', 'technique'], ['lumière', 'technique'], ['technique', 'technique'], ['jeu', 'jeu'], ['comédien', 'jeu'], ['accueil', null], ['jeunesse', null]].map(([f, v]) => DISTRIBUTION.metier(99, 9999, f) === v ? '' : f).filter(Boolean) };
  });
  ok('1 · l’ordre est celui des métiers (jeu, puis technique) : un renfort « lumière » se range avec la technique, un renfort sans métier reconnu vient en dernier, neutre', rang.ordre === 'CE:m-jeu LM:m-jeu JD:m-technique ZL:m-neutre', rang.ordre);
  ok('1 · le métier d’un renfort se reconnaît par un motif (régie, son, lumière, technique → technique ; jeu, comédien → jeu ; « jeunesse » n’est pas « jeu »)', rang.motifs.length === 0, rang.motifs.join(','));
  ok('1 · quand la place manque, « +n » compte les pastilles cachées, son infobulle les nomme, et le texte pour les lecteurs d’écran les garde toutes', rang.etroit === 2 && rang.plus === '+2' && /Jean Durand/.test(rang.plusTitre) && /Zoé Lamy/.test(rang.lu) && /Camille Essai/.test(rang.lu), JSON.stringify(rang));
  ok('1 · une date sans distribution ni écart n’a pas de cellule (rien à dessiner)', rang.sansEquipe === '');

  // le contraste des lisérés (3:1 contre la carte) dans les deux thèmes
  const contrastes = await page.evaluate(() => {
    const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
    const rgb = c => { const m = c.match(/[\d.]+/g).map(Number); return m.slice(0, 3); };
    const rap = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const out = {};
    for (const theme of ['nuit', 'jour']) {
      document.documentElement.setAttribute('data-theme', theme);
      const carte = document.createElement('div'); carte.style.cssText = 'background:var(--carte);position:fixed;left:0;top:0'; document.body.append(carte);
      const fond = rgb(getComputedStyle(carte).backgroundColor);
      out[theme] = ['jeu', 'creation', 'technique', 'production', 'neutre'].map(m => {
        const a = document.createElement('span'); a.className = `avatar mini m-${m}`; carte.append(a);
        return `${m}:${rap(rgb(getComputedStyle(a).borderTopColor), fond).toFixed(1)}`;
      });
      carte.remove();
    }
    document.documentElement.setAttribute('data-theme', 'nuit');
    return out;
  });
  const faibles = Object.entries(contrastes).flatMap(([t, xs]) => xs.filter(x => parseFloat(x.split(':')[1]) < 3).map(x => `${t} ${x}`));
  ok('1 · le liseré de chaque métier tient 3:1 contre la carte, la nuit comme le jour', faibles.length === 0, JSON.stringify(contrastes));

  // la cellule n'anime rien : ni animation ni transition sur la cellule, les pastilles, les badges (computed, dans les deux thèmes)
  const mouvement = await page.evaluate(() => {
    const vus = [...document.querySelectorAll('#essai-cellules .dist-cell, #essai-cellules .dist-av, #essai-cellules .avatar.mini, #essai-cellules .dist-moins, #essai-cellules .dist-plus')];
    return { n: vus.length, animes: vus.filter(e => { const st = getComputedStyle(e); return st.animationName !== 'none' || st.transitionDuration.split(',').some(t => parseFloat(t) > 0); }).map(e => e.className) };
  });
  ok('1 · les pastilles et les badges de la cellule n’animent rien (ni animation ni transition, d’après le style calculé)', mouvement.n >= 8 && mouvement.animes.length === 0, JSON.stringify(mouvement));

  // la fabrication : 120 dates de huit personnes (la cellule est du texte, pas un SVG par case) ; le dessin réel, plus bas, à CPU=4
  const vitesse = await page.evaluate(() => {
    E.personnes.push(...[11, 12, 13, 14, 15, 16, 17, 18].map(id => ({ id, prenom: `P${id}`, nom: 'Essai', metiers: ['comédien'] })));
    E.distributions.push(...[11, 12, 13, 14, 15, 16, 17, 18].map((p, i) => ({ id: 800 + i, spectacle_id: 3, personne_id: p, categorie: 'jeu', fonction: '', en_tournee: true, publie: true, ordre: 10 + i })));
    const ds = Array.from({ length: 120 }, (_, i) => ({ id: 5000 + i, spectacle_id: 3, lieu_id: 5, debut: '2027-03-01', fin: '2027-03-01', statut: 'confirmee', nature: 'representations' }));
    const t0 = performance.now(); let n = 0; ds.forEach(d => { n += DISTRIBUTION.cellule(d).length; }); return { ms: Math.round(performance.now() - t0), n };
  });
  ok('1 · le HTML de 120 cellules de huit personnes se fabrique en moins de 100 ms', vitesse.ms < 100 && vitesse.n > 0, JSON.stringify(vitesse));
  ok('1 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 1 bis · 120 cellules posées dans la page, à CPU=4
{
  garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, cpu: 4 });
  await page.waitForFunction(() => typeof DISTRIBUTION !== 'undefined' && E.equipeInstallee, null, { timeout: 15000 });
  await page.evaluate(() => {
    E.personnes.push(...[11, 12, 13, 14, 15, 16, 17, 18].map(id => ({ id, prenom: `P${id}`, nom: 'Essai', metiers: ['comédien'] })));
    E.distributions.push(...[11, 12, 13, 14, 15, 16, 17, 18].map((p, i) => ({ id: 800 + i, spectacle_id: 3, personne_id: p, categorie: 'jeu', fonction: '', en_tournee: true, publie: true, ordre: 10 + i })));
  });
  await page.waitForTimeout(600);   // la page se pose avant la mesure : on ne chronomètre que le dessin des cellules
  // une pose d'essai d'abord (les polices et les styles sont déjà prêts quand le tableur dessine), puis trois poses : la médiane.
  // Deux tailles : 30 dates (de quoi remplir un écran) et les 120 d'un coup. Les 960 pastilles des 120 dates coûtent, mises en page,
  // environ 100 à 200 ms à CPU=4 (c'est la mise en page, pas le HTML) : le chiffre est affiché mais ne sert pas de barrière, c'est
  // au tableur de dessiner par tranches. Ce que la cellule tient, c'est un écran de 30 dates en moins de 100 ms.
  const m = await page.evaluate(async () => {
    const ds = Array.from({ length: 120 }, (_, i) => ({ id: 5000 + i, spectacle_id: 3, lieu_id: 5, debut: '2027-03-01', fin: '2027-03-01', statut: 'confirmee', nature: 'representations' }));
    const poser = n => {
      const t0 = performance.now();
      const t = document.createElement('table'); t.className = 'tableur'; t.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:var(--carte)';
      t.innerHTML = `<tbody>${ds.slice(0, n).map(d => `<tr><td class="c-distribution">${DISTRIBUTION.cellule(d)}</td></tr>`).join('')}</tbody>`;
      document.body.append(t);
      const hauteur = t.offsetHeight;   // force la mise en page
      const ms = Math.round(performance.now() - t0); t.remove();
      return { ms, pastilles: t.querySelectorAll('.avatar.mini').length, hauteur };
    };
    const mediane = n => { const rs = [poser(n), poser(n), poser(n)]; return { ms: rs.map(r => r.ms).sort((a, b) => a - b)[1], pastilles: rs[0].pastilles, hauteur: rs[0].hauteur }; };
    poser(3);
    return { ecran: mediane(30), tout: mediane(120) };
  });
  console.log(`cellules posées et mises en page à CPU=4 : 30 dates ${m.ecran.ms} ms, 120 dates (960 pastilles) ${m.tout.ms} ms (information)`);
  ok('1 · un écran de 30 dates de huit personnes : les cellules sont fabriquées, posées dans la page et mises en page en moins de 100 ms à CPU=4 (médiane de trois poses)', m.ecran.pastilles >= 30 * 6 && m.ecran.hauteur > 30 * 20 && m.ecran.ms < 100, JSON.stringify(m.ecran));
  ok('1 · … et les 120 dates d’un coup (960 pastilles) se posent en moins de 500 ms (garde-fou large : le tableur les dessinera par tranches)', m.tout.pastilles >= 120 * 6 && m.tout.ms < 500, JSON.stringify(m.tout));
  ok('1 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 2 · qui sera prévenu
{
  garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900 });
  await page.waitForFunction(() => typeof DISTRIBUTION !== 'undefined' && E.equipeInstallee, null, { timeout: 15000 });
  const r = await page.evaluate(([j3, jm40]) => {
    const d101 = { id: 101, spectacle_id: 1, debut: j3, fin: j3 }, e = (personne_id, present, fonction = '', note = null) => ({ personne_id, present, fonction, note });
    const cas = {};
    cas.jeanRepart = DISTRIBUTION.prevenus(d101, []);                                          // l'écart de Jean s'en va : il repart (il a un compte)
    cas.camilleNePart = DISTRIBUTION.prevenus(d101, [e(2, false), e(1, false)]);              // Camille ne part plus (pas de compte)
    cas.fonctionSeule = DISTRIBUTION.prevenus(d101, [e(2, false), e(1, true, 'Jeu et chant')]); // une fonction qui change : personne
    cas.noteSeule = DISTRIBUTION.prevenus(d101, [e(2, false), e(1, true, '', 'train de 14h12')]);
    cas.passee = DISTRIBUTION.prevenus({ id: 104, spectacle_id: 2, debut: jm40, fin: jm40 }, [e(1, false)]);
    cas.neuveAbsent = DISTRIBUTION.prevenus({ id: null, spectacle_id: 1, debut: j3, fin: j3 }, [e(2, false)]);      // date neuve : qui ne part pas n’est pas prévenu
    cas.neuveRenfort = DISTRIBUTION.prevenus({ id: null, spectacle_id: 2, debut: j3, fin: j3 }, [e(2, true, 'régie')]);   // … mais un renfort avec compte l’est
    cas.sansJour = DISTRIBUTION.prevenus({ id: null, spectacle_id: 2, debut: '', fin: '' }, [e(2, true, 'régie')]);      // pas encore de jour : à venir
    return { cas, phrases: Object.fromEntries(Object.entries(cas).map(([k, v]) => [k, DISTRIBUTION.phrase(v)])) };
  }, [jour(3), jour(-40)]);
  const { cas, phrases } = r;
  ok('2 · Jean, qui a un compte, repart : 1 personne prévenue (« vous partez »)', cas.jeanRepart.n === 1 && cas.jeanRepart.partent.join() === '2' && /^1 personne sera prévenue/.test(phrases.jeanRepart) && /Jean Durand : « vous partez »/.test(phrases.jeanRepart), phrases.jeanRepart);
  ok('2 · Camille, sans compte, ne part plus : personne n’est prévenu, et la phrase le dit', cas.camilleNePart.n === 0 && cas.camilleNePart.sansCompte.join() === '1' && /^Personne ne sera prévenu : Camille Essai n’a pas de compte/.test(phrases.camilleNePart), phrases.camilleNePart);
  ok('2 · un changement de fonction seule, ou de note seule, ne prévient personne et ne dit rien', !cas.fonctionSeule.change && !cas.noteSeule.change && phrases.fonctionSeule === '' && phrases.noteSeule === '');
  ok('2 · une date passée ne prévient personne', cas.passee.n === 0 && !cas.passee.aVenir && /passée/.test(phrases.passee), phrases.passee);
  ok('2 · sur une date toute neuve, qui ne part pas n’est pas prévenu ; un renfort avec compte l’est', !cas.neuveAbsent.change && cas.neuveRenfort.n === 1 && cas.neuveRenfort.partent.join() === '2');
  ok('2 · une date sans jour encore est comptée à venir', cas.sansJour.aVenir && cas.sansJour.n === 1);
  ok('2 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 3 · GARDEFOUS.indisposDe
{
  garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900 });
  await page.waitForFunction(() => typeof GARDEFOUS !== 'undefined' && E.equipeInstallee, null, { timeout: 15000 });
  const g = await page.evaluate(async ([j3, j4, j10]) => {
    await GARDEFOUS.charger();
    const jean = GARDEFOUS.indisposDe(2, [j3, j4, j10]), camille = GARDEFOUS.indisposDe(1, [j3]), horsJours = GARDEFOUS.indisposDe(2, [j10]);
    const sig = typeof GARDEFOUS.alertes === 'function' && GARDEFOUS.alertes.length;
    const sql5 = E.sql5; E.sql5 = false; const sans = GARDEFOUS.indisposDe(2, [j3]); E.sql5 = sql5;
    return { jean, camille, horsJours, sans, sig };
  }, [jour(3), jour(4), jour(10)]);
  ok('3 · indisposDe(2, jours) : l’indisponibilité de Jean touche le seul jour qu’elle couvre (la fin d’une « journée » est exclusive), avec son motif', g.jean.length === 1 && g.jean[0].jours.join() === jour(3) && g.jean[0].motif === 'Tournage', JSON.stringify(g.jean));
  ok('3 · … rien pour quelqu’un qui n’en a pas, rien hors de ses jours, rien sans le cinquième script (E.sql5 === false)', g.camille.length === 0 && g.horsJours.length === 0 && g.sans.length === 0);
  ok('3 · alertes(F, d0) garde sa signature (deux paramètres)', g.sig === 2, String(g.sig));
  ok('3 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 4 · la fiche d'une date
{
  garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 1000, hash: '#/representations/101' });
  await page.waitForSelector('#d-equipe .eq-date li', { timeout: 15000 });
  const nom = pid => page.$eval(`#d-equipe [data-eqd-part="${pid}"]`, e => e.parentNode.textContent.trim());
  const lis = await page.$$eval('#d-equipe .eq-date li', xs => xs.map(l => ({ absent: l.classList.contains('absent'), av: l.querySelector('.eq-av')?.className || '', avatar: !!l.querySelector('.eq-av .avatar'), badge: l.querySelector('.eq-badge')?.textContent.trim() || '', fonction: !!l.querySelector('[data-eqd-fonction-membre]'), note: !!l.querySelector('[data-eqd-note]') })));
  ok('4 · la fiche range la tournée par métier : chacun a son avatar au liseré de son métier (Camille jeu, Jean technique)', lis.length === 2 && /\bm-jeu\b/.test(lis[0].av) && /\bm-technique\b/.test(lis[1].av) && lis.every(l => l.avatar), JSON.stringify(lis));
  ok('4 · le badge dit la fonction et le rôle (« Jeu (Bérénice) »), Jean est marqué « ne part pas »', lis[0].badge === 'Jeu (Bérénice)' && /Régie générale · ne part pas sur cette date/.test(lis[1].badge) && lis[1].absent, JSON.stringify(lis.map(l => l.badge)));
  ok('4 · un membre qui part a un champ fonction et un champ note ; celui qui ne part pas n’en a pas', lis[0].fonction && lis[0].note && !lis[1].fonction && !lis[1].note);
  ok('4 · rien ne change encore : pas de résumé des personnes prévenues', (await texte(page, '#eqd-prevenus')) === '' && await page.$eval('#eqd-prevenus', e => getComputedStyle(e).display === 'none'));
  // Jean repart : il a un compte, il est prévenu
  await page.check('#d-equipe [data-eqd-part="2"]');
  ok('4 · Jean (il a un compte) repart : « 1 personne sera prévenue », avec ce qu’il lira', /^1 personne sera prévenue \(Jean Durand : « vous partez »\)/.test(await texte(page, '#eqd-prevenus')), await texte(page, '#eqd-prevenus'));
  ok('4 · le résumé est une annonce pour les lecteurs d’écran (aria-live)', await page.$eval('#eqd-prevenus', e => e.getAttribute('aria-live') === 'polite'));
  // Camille ne part pas : sans compte, personne n'est prévenu
  await page.uncheck('#d-equipe [data-eqd-part="1"]');
  ok('4 · Camille (sans compte) ne part pas : le résumé ne promet rien pour elle', /Camille Essai n’a pas de compte/.test(await texte(page, '#eqd-prevenus')) && /Jean Durand/.test(await texte(page, '#eqd-prevenus')), await texte(page, '#eqd-prevenus'));
  // « Remplace X » vise la personne décochée à l'instant (Jean en dernier), pas la première absente (Camille)
  await page.uncheck('#d-equipe [data-eqd-part="2"]');
  await page.fill('#eqd-combo input', 'Noé');
  await page.click('#eqd-combo [data-p="4"]');
  await page.waitForSelector('#d-equipe [data-eqd-ajout="4"]', { timeout: 4000 });
  const lien = await page.$eval('#d-equipe [data-eqd-ajout="4"] [data-eqd-remplace]', b => ({ texte: b.textContent.trim(), visible: !b.hidden, cible: b.dataset.eqdRemplace }));
  ok('4 · Noé arrive en renfort : le texte d’attente est un lien « Remplace Jean Durand » (la dernière personne décochée), pas « Remplace Camille Essai » (la première absente)', lien.texte === 'Remplace Jean Durand' && lien.visible && lien.cible === '2', JSON.stringify(lien));
  ok('4 · un renfort est rangé avec son métier (Noé est régisseur : technique) ; il a son anneau de métier', await page.$eval('#d-equipe [data-eqd-ajout="4"] .eq-av', e => e.classList.contains('m-technique')));
  await page.click('#d-equipe [data-eqd-ajout="4"] [data-eqd-remplace]');
  // l'affichage réel (getComputedStyle), pas l'attribut hidden : `.btn { display: inline-flex }` l'emporterait sans `.eq-remplace[hidden]`
  const lienVu = () => page.$eval('#d-equipe [data-eqd-ajout="4"] [data-eqd-remplace]', b => getComputedStyle(b).display !== 'none' && b.offsetParent !== null);
  ok('4 · le lien remplit la fonction du renfort et disparaît de l’écran (affichage réel, pas seulement l’attribut hidden)', await page.$eval('#d-equipe [data-eqd-ajout="4"] [data-eqd-fonction]', e => e.value === 'Remplace Jean Durand') && !(await lienVu()));
  await page.fill('#d-equipe [data-eqd-ajout="4"] [data-eqd-fonction]', 'régie');
  ok('4 · une fonction saisie à la main cache aussi le lien', !(await lienVu()));
  await page.fill('#d-equipe [data-eqd-ajout="4"] [data-eqd-fonction]', '');
  ok('4 · vider le champ fonction du renfort rend le lien « Remplace Jean Durand » à l’écran', await lienVu());
  await page.fill('#d-equipe [data-eqd-ajout="4"] [data-eqd-fonction]', 'régie');
  // l'état final voulu : Jean repart, Camille reste avec une fonction et une note, Noé en régie
  await page.check('#d-equipe [data-eqd-part="2"]');
  await page.check('#d-equipe [data-eqd-part="1"]');
  await page.fill('#d-equipe [data-eqd-fonction-membre="1"]', 'Jeu et chant');
  await page.fill('#d-equipe [data-eqd-note="1"]', 'train de 14h12');
  ok('4 · la fonction et la note d’un membre se saisissent (la ligne présente reste) sans rien changer au résumé : Jean est prévenu (il repart), Noé n’a pas de compte', /^1 personne sera prévenue \(Jean Durand : « vous partez »\)\. Noé Petit n’a pas de compte\./.test(await texte(page, '#eqd-prevenus')), await texte(page, '#eqd-prevenus'));
  await calme(page);
  await page.locator('#d-equipe').screenshot({ path: `${CAPT}/distribution-fiche.png` });
  const n0 = MODIFS.length;
  await page.click('[data-enregistrer]');
  await attendre(page, () => E.equipes.some(x => x.date_id === 101 && x.personne_id === 4) && !E.equipes.some(x => x.date_id === 101 && x.personne_id === 2), null, 8000);
  const eq = MODIFS.slice(n0).filter(m => m.table === 'crescite_equipes');
  ok('4 · Enregistrer écrit l’équipe : Noé en régie (upsert date_id,personne_id), la fonction et la note de Camille', eq.some(m => m.conflit?.join(',') === 'date_id,personne_id' && m.post.some(r => r.date_id === 101 && r.personne_id === 4 && r.fonction === 'régie' && r.present === true) && m.post.some(r => r.personne_id === 1 && r.present === true && r.fonction === 'Jeu et chant' && r.note === 'train de 14h12')), JSON.stringify(eq));
  ok('4 · … et retire l’écart de Jean (il repart comme la distribution)', eq.some(m => m.delete && m.n === 1), JSON.stringify(eq));
  ok('4 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 5 · l'impact, dans Spectacles → Distribution
{
  garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 1000 });
  await page.evaluate(() => { try { sessionStorage.setItem('crescite-onglet-sp', 'Distribution'); } catch { /* */ } location.hash = '#/spectacles/la-folle-idee'; });
  await page.waitForSelector('[data-di="3"] [data-dc="en_tournee"]', { timeout: 15000 });
  const boites = () => page.$$eval('dialog[open]', xs => xs.map(x => x.id));
  const ecritures = n => MODIFS.slice(n).filter(m => m.table === 'crescite_equipes' || m.table === 'crescite_distributions').map(m => `${m.table}:${m.post ? 'ecrit' : m.delete ? 'retire' : 'modifie'}`);
  // décocher « en tournée » (Camille, La Folle Idée : 102 et 106 à venir, 104 passée)
  let n = MODIFS.length;
  await page.uncheck('[data-di="3"] [data-dc="en_tournee"]');
  await page.waitForSelector('#impact-choix[open]', { timeout: 4000 });
  const t = await texte(page, '#impact-choix');
  ok('5 · décocher « en tournée » ouvre l’impact avant d’écrire : « 2 dates à venir changent d’équipe (dont 1 représentation confirmée) »', /2 dates à venir changent d’équipe \(dont 1 représentation confirmée\)/.test(t), t);
  ok('5 · … il dit que personne n’est prévenu automatiquement, et par où le faire (« Prévenir l’équipe »)', /Personne n’est prévenu automatiquement/.test(t) && /Prévenir l’équipe/.test(t), t);
  ok('5 · … « limiter à partir d’aujourd’hui » est coché d’office, avec la date passée qui ne changera pas', await page.$eval('#im-limiter', e => e.checked) && /Limiter à partir d’aujourd’hui : 1 date passée/.test(t), t);
  ok('5 · une seule boîte (pas de seconde question sur les dates passées)', (await boites()).join() === 'impact-choix' && (await compte(page, '#retrait-choix')) === 0);
  ok('5 · rien n’est écrit tant qu’on n’a pas répondu', ecritures(n).length === 0);
  await page.screenshot({ path: `${CAPT}/distribution-impact.png`, fullPage: false });
  await page.keyboard.press('Escape');
  await attendre(page, () => !document.querySelector('#impact-choix'));
  ok('5 · Échap renonce : la case « en tournée » est remise, rien n’est écrit', await page.$eval('[data-di="3"] [data-dc="en_tournee"]', e => e.checked) && ecritures(n).length === 0 && (await compte(page, '#impact-choix')) === 0);
  ok('5 · le focus revient à la case', await page.evaluate(() => document.activeElement?.matches('[data-di="3"] [data-dc="en_tournee"]')));
  // confirmer, limité à aujourd'hui : les dates passées gardent Camille (écrit d'abord), puis la distribution change
  await page.uncheck('[data-di="3"] [data-dc="en_tournee"]');
  await page.waitForSelector('#impact-choix[open]', { timeout: 4000 });
  await page.click('#impact-choix [data-im="ok"]');
  await attendre(page, () => !document.querySelector('#impact-choix') && E.distributions.find(x => x.id === 3)?.en_tournee === false);
  const ordre = ecritures(n);
  ok('5 · confirmer : les écarts des dates passées d’abord (Camille y reste), la distribution ensuite — jamais l’inverse', ordre.join() === 'crescite_equipes:ecrit,crescite_distributions:modifie', ordre.join());
  ok('5 · … l’écart écrit est celui de la 104 (passée), présent', MODIFS.slice(n).some(m => m.table === 'crescite_equipes' && m.conflit?.join(',') === 'date_id,personne_id' && m.post.length === 1 && m.post[0].date_id === 104 && m.post[0].personne_id === 1 && m.post[0].present === true));
  // cocher de nouveau : seules des dates à venir changent, donc pas de case à cocher
  n = MODIFS.length;
  await page.check('[data-di="3"] [data-dc="en_tournee"]');
  await page.waitForSelector('#impact-choix[open]', { timeout: 4000 });
  const t2 = await texte(page, '#impact-choix');
  ok('5 · cocher de nouveau : « 2 dates à venir changent d’équipe », et pas de « limiter » quand aucune date passée ne change (la 104 a son écart)', /2 dates à venir changent/.test(t2) && (await compte(page, '#im-limiter')) === 0, t2);
  await page.click('#impact-choix [data-im="non"]');
  await attendre(page, () => !document.querySelector('#impact-choix'));
  ok('5 · « Annuler » renonce aussi (case remise, rien d’écrit)', !(await page.$eval('[data-di="3"] [data-dc="en_tournee"]', e => e.checked)) && ecritures(n).length === 0);
  // retirer quelqu'un (Léa) sans limiter : une seule boîte, puis le retrait des dates passées aussi
  n = MODIFS.length;
  await page.click('[data-di="4"] [data-dr]');
  await page.waitForSelector('#impact-choix[open]', { timeout: 4000 });
  ok('5 · retirer quelqu’un de la distribution ouvre la même boîte (« Retirer Léa Martin de la distribution de La Folle Idée »)', /Retirer Léa Martin de la distribution de La Folle Idée/.test(await texte(page, '#impact-choix h2')) && (await boites()).join() === 'impact-choix');
  await page.uncheck('#im-limiter');
  await page.click('#impact-choix [data-im="ok"]');
  await attendre(page, () => !E.distributions.some(x => x.id === 4));
  ok('5 · … sans limiter, le retrait va partout : la ligne de distribution part, aucun écart n’est écrit', ecritures(n).join() === 'crescite_distributions:retire', ecritures(n).join());
  // ajouter quelqu'un : l'impact avant l'insertion
  n = MODIFS.length;
  const renonce = page.evaluate(() => ajouterADistribution(1, 4, 'technique'));
  await page.waitForSelector('#impact-choix[open]', { timeout: 4000 });
  const t3 = await texte(page, '#impact-choix');
  ok('5 · ajouter à la distribution (technique, donc en tournée) ouvre l’impact avant l’insertion : les 3 dates de Bérénice, dont 2 représentations confirmées', /Ajouter Noé Petit à la distribution de Bérénice/.test(t3) && /3 dates à venir changent d’équipe \(dont 2 représentations confirmées\)/.test(t3) && (await compte(page, '#im-limiter')) === 0, t3);
  await page.click('#impact-choix [data-im="non"]');
  ok('5 · renoncer à l’ajout : rien n’est inséré, ajouterADistribution rend null', (await renonce) === null && ecritures(n).length === 0);
  const ajoute = page.evaluate(() => ajouterADistribution(1, 4, 'technique').then(x => x && x.personne_id));
  await page.waitForSelector('#impact-choix[open]', { timeout: 4000 });
  await page.click('#impact-choix [data-im="ok"]');
  ok('5 · confirmer l’ajout : la ligne est insérée (Noé en tournée)', (await ajoute) === 4 && MODIFS.slice(n).some(m => m.table === 'crescite_distributions' && m.post?.[0]?.personne_id === 4 && m.post[0].en_tournee === true));
  n = MODIFS.length;
  const creation = await page.evaluate(() => ajouterADistribution(1, 4, 'creation').then(x => x && x.categorie));
  ok('5 · une ligne qui ne part pas en tournée (création) n’ouvre aucune boîte : elle ne change aucune équipe', creation === 'creation' && (await compte(page, '#impact-choix')) === 0);
  // les autres champs de la ligne s'écrivent comme avant, sans question
  n = MODIFS.length;
  await page.fill('[data-di="3"] [data-dc="role"]', 'Cassandre');
  await page.press('[data-di="3"] [data-dc="role"]', 'Tab');
  await attendre(page, () => E.distributions.find(x => x.id === 3)?.role === 'Cassandre');
  ok('5 · le rôle d’une ligne s’enregistre aussitôt, sans boîte', MODIFS.slice(n).some(m => m.table === 'crescite_distributions' && m.body?.role === 'Cassandre') && (await compte(page, '#impact-choix')) === 0);
  ok('5 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 6 · la fiche d'une personne : l'ajout à la distribution passe par l'impact
{
  garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 1000, hash: '#/equipe/4' });
  await page.waitForSelector('#pe-dist-ok', { timeout: 15000 });
  const n = MODIFS.length;
  await page.selectOption('#pe-dist-sp', '2');
  await page.selectOption('#pe-dist-cat', 'technique');
  await page.click('#pe-dist-ok');
  await page.waitForSelector('#impact-choix[open]', { timeout: 4000 });
  const t = await texte(page, '#impact-choix');
  ok('6 · depuis la fiche d’une personne, « Ajouter » à la distribution ouvre l’impact (La Folle Idée : 2 dates à venir, 1 passée)', /Ajouter Noé Petit à la distribution de La Folle Idée/.test(t) && /2 dates à venir changent/.test(t) && /1 date passée/.test(t), t);
  await page.click('#impact-choix [data-im="ok"]');
  await attendre(page, () => E.distributions.some(x => x.spectacle_id === 2 && x.personne_id === 4));
  await attendre(page, () => E.equipes.some(x => x.personne_id === 4 && x.date_id === 104));
  const ordre = MODIFS.slice(n).filter(m => m.table === 'crescite_distributions' || m.table === 'crescite_equipes').map(m => `${m.table}:${m.post ? 'ecrit' : m.delete ? 'retire' : 'modifie'}`);
  ok('6 · limité à aujourd’hui : la distribution d’abord, puis l’écart « ne part pas » sur la 104 passée (il ne compte pas sur ce qui est joué)', ordre[0] === 'crescite_distributions:ecrit' && ordre.includes('crescite_equipes:ecrit') && MODIFS.slice(n).some(m => m.table === 'crescite_equipes' && m.post?.some(r => r.date_id === 104 && r.personne_id === 4 && r.present === false)), ordre.join());
  ok('6 · … il n’y a donc plus de rappel après coup « il compte aussi sur ses dates passées »', !/compte aussi sur ses dates passées/.test(await page.evaluate(() => document.querySelector('.annonce')?.textContent || '')));
  ok('6 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 7 · les deux autres chemins : la troupe, et le retrait depuis la fiche d'une personne
{
  garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 1000 });
  await page.evaluate(() => { try { sessionStorage.setItem('crescite-onglet-sp', 'Distribution'); } catch { /* */ } location.hash = '#/spectacles/la-folle-idee'; });
  await page.waitForSelector('[data-dist-ajouter="technique"]', { timeout: 15000 });
  const ecritures = n => MODIFS.slice(n).filter(m => m.table === 'crescite_equipes' || m.table === 'crescite_distributions').map(m => `${m.table}:${m.post ? 'ecrit' : m.delete ? 'retire' : 'modifie'}`);
  let n = MODIFS.length;
  // « Ajouter quelqu'un de la troupe » : la fenêtre de la troupe s'ouvre, l'impact vient par-dessus
  await page.click('[data-dist-ajouter="technique"]');
  await page.waitForSelector('#troupe-choix[open] .tc-p[data-p="4"]', { timeout: 4000 });
  await page.click('#troupe-choix .tc-p[data-p="4"]');
  await page.waitForSelector('#impact-choix[open]', { timeout: 4000 });
  const t = await texte(page, '#impact-choix');
  ok('7 · « Ajouter quelqu’un de la troupe » (Noé, technique) : l’impact s’ouvre par-dessus la fenêtre de la troupe (La Folle Idée : 2 dates à venir, 1 passée)', /Ajouter Noé Petit à la distribution de La Folle Idée/.test(t) && /2 dates à venir changent/.test(t) && /1 date passée/.test(t), t);
  const dessus = await page.evaluate(() => { const b = document.querySelector('#impact-choix [data-im="ok"]').getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!e?.closest('#impact-choix'); });
  ok('7 · … la boîte est atteignable au clic (au-dessus de la fenêtre de la troupe), et rien n’est encore écrit', dessus && ecritures(n).length === 0);
  await page.click('#impact-choix [data-im="ok"]');
  await attendre(page, () => E.distributions.some(x => x.spectacle_id === 2 && x.personne_id === 4) && E.equipes.some(x => x.personne_id === 4 && x.date_id === 104));
  ok('7 · … confirmer écrit la distribution d’abord, puis l’écart « ne part pas » de la date passée (puis, comme toujours, l’ordre de la catégorie)', ecritures(n).slice(0, 2).join() === 'crescite_distributions:ecrit,crescite_equipes:ecrit', ecritures(n).join());
  ok('7 · … pas de rappel après coup « dates passées » (l’impact l’a déjà dit)', !/compte aussi sur ses dates passées/.test(await page.evaluate(() => document.querySelector('.annonce')?.textContent || '')));
  ok('7 · aucune erreur de script (troupe)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 1000, hash: '#/equipe/3' });
  await page.waitForSelector('[data-pe-retirer]', { timeout: 15000 });
  const n = MODIFS.length;
  await page.click('[data-pe-retirer]');
  await page.waitForSelector('#impact-choix[open]', { timeout: 4000 });
  const t = await texte(page, '#impact-choix');
  ok('7 · depuis la fiche d’une personne, « Retirer » de la distribution ouvre l’impact (« Retirer Léa Martin de la distribution de La Folle Idée »), sans l’ancienne boîte', /Retirer Léa Martin de la distribution de La Folle Idée/.test(t) && (await compte(page, '#retrait-choix')) === 0, t);
  await page.click('#impact-choix [data-im="ok"]');
  await attendre(page, () => !E.distributions.some(x => x.spectacle_id === 2 && x.personne_id === 3));
  const ordre = MODIFS.slice(n).filter(m => m.table === 'crescite_equipes' || m.table === 'crescite_distributions').map(m => `${m.table}:${m.post ? 'ecrit' : m.delete ? 'retire' : 'modifie'}`);
  ok('7 · … limité à aujourd’hui : l’écart « part » de la date passée d’abord, la ligne de distribution retirée ensuite (jamais l’inverse)', ordre.join() === 'crescite_equipes:ecrit,crescite_distributions:retire', ordre.join());
  ok('7 · aucune erreur de script (fiche)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

retirer();
bilan(CAPT);
