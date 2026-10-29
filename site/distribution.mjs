// La distribution à l'écran (admin/distribution.js, et ce qu'il touche : admin/equipe.js, admin/gardefous.js, admin/tableur.js,
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
// les dates qui changent, « limiter à partir d'aujourd'hui », renoncer, l'ordre des écritures) ; puis, dans le tableur :
// la cellule branchée dans la colonne Distribution (Simple et Complet), la fenêtre d'une case (« En tournée », « Remplaçants et
// renforts », « Remplace X », les puces de métier, qui sera prévenu, l'écriture, une tournée de dix personnes dans un écran
// court), « Étendre à… » (la fusion qui garde les lignes à fonction, la portée « au même lieu », le nombre de personnes
// prévenues), le mode Distribution (la matrice : une colonne par personne, ✓ / ✕ / ⟳ au clic et à Espace, Ctrl+Z, le point
// d'indisponibilité, les dates annulées grisées et jamais écrites par « Étendre à… », le double-clic qui ne bascule qu'une fois, Suppr qui
// dit qui est prévenu, le menu ⋯ « Régler sa période » (absent à l'impression), la plage et « Étendre à… », un groupe de lignes par
// spectacle, le bas du tableau) et son budget (à CPU=4, aucune tâche de plus de 200 ms à l'ouverture ni après un clic de case : 120 dates
// de dix personnes, 300 dates de douze personnes, 300 dates de deux spectacles sans filtre, soit une vingtaine de colonnes ; le clic est
// celui d'une main : la souris se pose, le bouton descend, puis remonte). Les lignes ajoutées à la base fictive le sont avant
// chaque bloc et retirées à la fin : la base commune n'est pas touchée. Les captures vont dans site/dist/shots-distribution/.
// Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, plus, DB, MODIFS, ECRITURES, ok, calme, ouvrir, texte, compte, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-distribution');
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
const attendre = (page, fn, arg = null, ms = 6000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);

// ---- la base du banc : une quatrième personne, un compte, des écarts sans identifiant (la clé de crescite_equipes est composite)
const TOUCHEES = ['crescite_personnes', 'crescite_personnes_privees', 'crescite_equipes', 'crescite_distributions', 'crescite_dates'];
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

// ================================================================================ 8 · la cellule branchée dans le tableur
const CASE = (l, k) => `#tab-corps tr[data-l="${l}"] td.c-${k}`;
const ecritures = (n, table = 'crescite_equipes') => MODIFS.slice(n).filter(m => m.table === table);
const termine = page => attendre(page, () => /^(Enregistré|Annulé|Pas enregistré|Retour impossible|Distribution posée)/.test(document.querySelector('#tab-etat')?.textContent || ''), null, 8000);
const lireCellule = (page, l) => page.$eval(CASE(l, 'distribution'), td => ({ initiales: [...td.querySelectorAll('.avatar.mini')].map(a => a.textContent), classes: [...td.querySelectorAll('.avatar.mini')].map(a => a.className), titres: [...td.querySelectorAll('.avatar.mini')].map(a => a.title),
  moins: td.querySelector('.dist-moins')?.textContent || '', anciennes: td.querySelectorAll('.tab-pastille, .tab-pastilles-ligne').length, photos: td.querySelectorAll('img, [style*="background-image"]').length, lu: td.querySelector('.sr')?.textContent || '' }));
for (const [mode, hash] of [['Simple', '#/representations/tableur'], ['Complet', '?mode=complet#/representations/tableur']]) {
  garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  const l103 = mode === 'Simple' ? 2 : 3;   // (en Complet, la date 103 a deux séances : sa première ligne est la quatrième)
  const c101 = await lireCellule(page, 0), c103 = await lireCellule(page, l103);
  ok(`8 · ${mode} : la colonne Distribution montre la cellule de DISTRIBUTION, deux pastilles rondes aux initiales (Camille, Jean) et « −1 » pour Jean qui ne part pas, plus aucune pastille de prénom`, c101.initiales.join() === 'CE,JD' && c101.moins === '−1' && c101.anciennes === 0, JSON.stringify(c101));
  ok(`8 · ${mode} : Jean, qui ne part pas, est gris et barré ; l’infobulle dit le rôle (« Camille Essai · Bérénice ») et « ne part pas »`, /\babsent\b/.test(c101.classes[1]) && !/\babsent\b/.test(c101.classes[0]) && c101.titres[0] === 'Camille Essai · Bérénice' && c101.titres[1] === 'Jean Durand · ne part pas', JSON.stringify(c101.titres));
  ok(`8 · ${mode} : la date 103 montre Léa en renfort (régie) avec l’anneau pointillé, rangée avec la technique`, c103.initiales.join() === 'CE,JD,LM' && /\bremplacant\b/.test(c103.classes[2]) && /\bm-technique\b/.test(c103.classes[2]), JSON.stringify(c103));
  ok(`8 · ${mode} : aucune photo dans la grille (initiales seulement), et le texte pour les lecteurs d’écran dit tout le monde`, c101.photos === 0 && c103.photos === 0 && /Jean Durand \(ne part pas\)/.test(c101.lu) && /Léa Martin \(remplaçant ou renfort : régie\)/.test(c103.lu), c103.lu);
  ok(`8 · ${mode} : aucune erreur de script`, erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 9 · la fenêtre d'une case
{
  garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  await page.click(CASE(0, 'distribution'));
  await page.keyboard.press('Enter');
  await page.waitForSelector('.tab-pop.distribution', { timeout: 4000 });
  const vu = await page.evaluate(() => { const p = document.querySelector('.tab-pop.distribution'); return { role: p.getAttribute('role'), nom: p.getAttribute('aria-labelledby'), titres: [...p.querySelectorAll('h4')].map(h => h.textContent), largeur: Math.round(p.getBoundingClientRect().width),
    membres: [...p.querySelectorAll('[data-eqd-part]')].map(i => `${i.parentNode.textContent.trim()}${i.checked ? '+' : '-'}`), puces: [...p.querySelectorAll('.dfn-puce')].map(b => b.textContent), coords: [...p.querySelectorAll('.coord, .manque-tel')].map(a => a.textContent.trim()), pied: p.querySelector('#dfn-prevenus').textContent, focus: document.activeElement === p.querySelector('#dfn-combo input') }; });
  ok('9 · Entrée sur la case ouvre la fenêtre de la distribution (.tab-pop.distribution, 520 px, une boîte de dialogue nommée) avec ses deux blocs « En tournée » et « Remplaçants et renforts »', vu.role === 'dialog' && !!vu.nom && vu.titres.join() === 'En tournée,Remplaçants et renforts' && vu.largeur === 520, JSON.stringify(vu));
  const pose = await page.$eval('.tab-pop.distribution', p => { const s = getComputedStyle(p); return { nom: s.animationName, duree: s.animationDuration }; });
  ok('9 · la fenêtre se pose en 150 ms (ad-arrive)', pose.nom === 'ad-arrive' && pose.duree === '0.15s', JSON.stringify(pose));
  ok('9 · « En tournée » : une case par personne (Camille part, Jean ne part pas), son téléphone ou « téléphone ? », et des puces de métier (Tous, Jeu, Technique)', vu.membres.join() === 'Camille Essai+,Jean Durand-' && vu.coords.length === 1 && /06 12 34 56 78/.test(vu.coords[0]) && vu.puces.join() === 'Tous,Jeu,Technique', JSON.stringify(vu));
  ok('9 · le focus est dans le champ « Ajouter quelqu’un », et le pied dit que rien ne change tant qu’on n’a rien touché', vu.focus && /Rien ne change/.test(vu.pied), vu.pied);
  // Jean repart (il a un compte), Camille ne part plus (elle n'en a pas)
  await page.check('.tab-pop [data-eqd-part="2"]');
  const apresJean = await texte(page, '#dfn-prevenus');
  ok('9 · cocher Jean (qui ne partait pas, et a un compte) : « 1 personne sera prévenue (Jean Durand : « vous partez »)  »', /^1 personne sera prévenue \(Jean Durand : « vous partez »\)/.test(apresJean), apresJean);
  await page.uncheck('.tab-pop [data-eqd-part="1"]');
  const apresCamille = await texte(page, '#dfn-prevenus');
  ok('9 · décocher Camille (sans compte) : elle ne s’ajoute pas aux personnes prévenues, et la phrase le dit', /^1 personne sera prévenue/.test(apresCamille) && /Camille Essai n’a pas de compte/.test(apresCamille), apresCamille);
  await page.click('.tab-pop #dfn-combo input');
  await page.keyboard.type('Noé');
  await attendre(page, () => document.querySelector('.tab-pop .suggestions:not([hidden]) button[data-p="4"]'));
  await page.keyboard.press('Enter');
  await page.waitForSelector('.tab-pop [data-eqd-ajout="4"]', { timeout: 4000 });
  const lien = () => page.$eval('.tab-pop [data-eqd-ajout="4"] [data-eqd-remplace]', b => ({ texte: b.textContent.trim(), visible: getComputedStyle(b).display !== 'none' && b.offsetParent !== null, cible: b.dataset.eqdRemplace }));
  const l1 = await lien();
  ok('9 · Noé (régisseur) est ajouté dans « Remplaçants et renforts », rangé avec la technique ; le texte d’attente « Remplace Camille Essai » vise la personne décochée à l’instant (pas Jean, ni la première)', l1.texte === 'Remplace Camille Essai' && l1.cible === '1' && l1.visible && await page.$eval('.tab-pop [data-eqd-ajout="4"] .eq-av', e => e.classList.contains('m-technique')), JSON.stringify(l1));
  await page.click('.tab-pop [data-eqd-ajout="4"] [data-eqd-remplace]');
  ok('9 · le lien remplit le champ fonction (« Remplace Camille Essai ») et disparaît', await page.$eval('.tab-pop [data-eqd-ajout="4"] [data-eqd-fonction]', e => e.value === 'Remplace Camille Essai') && !(await lien().then(l => l.visible)));
  await page.fill('.tab-pop [data-eqd-ajout="4"] [data-eqd-fonction]', 'régie');
  await page.fill('.tab-pop [data-eqd-note="4"]', 'train de 14h12');
  // les puces de métier : « Technique » ne laisse que Jean et Noé
  await page.click('.tab-pop [data-dfn-metier="technique"]');
  const filtre = await page.evaluate(() => ({ visibles: [...document.querySelectorAll('.tab-pop .dfn-ligne:not([hidden])')].map(l => l.dataset.cat).join(), pressee: document.querySelector('.tab-pop [data-dfn-metier="technique"]').getAttribute('aria-pressed') }));
  ok('9 · la puce « Technique » (aria-pressed) ne laisse voir que Jean et Noé ; une seconde fois, elle rend tout le monde', filtre.visibles === 'technique,technique' && filtre.pressee === 'true', JSON.stringify(filtre));
  await page.click('.tab-pop [data-dfn-metier="technique"]');
  ok('9 · … Camille est de retour', await page.$$eval('.tab-pop .dfn-ligne:not([hidden])', xs => xs.length) === 3);
  await calme(page);
  await page.screenshot({ path: `${CAPT}/distribution-fenetre.png`, fullPage: false });
  const n = MODIFS.length;
  await page.click('.tab-pop [data-eq-ok]');
  await termine(page);
  const equipes = ecritures(n).filter(m => m.post);
  ok('9 · Enregistrer écrit la date par le chemin du tableur : Noé est posé sur la 101 avec sa fonction « régie » (upsert de crescite_equipes sur date_id, personne_id), et Camille ne part pas', MODIFS.slice(n).some(m => m.table === 'crescite_equipes' && m.post && m.conflit.join(',') === 'date_id,personne_id' && m.post.some(r => r.date_id === 101 && r.personne_id === 4 && r.fonction === 'régie')) && equipes.some(m => m.post.some(r => r.personne_id === 1 && r.present === false)), JSON.stringify(equipes));
  ok('9 · … la ligne « ne part pas » de Jean s’efface (il repart avec la distribution)', ecritures(n).some(m => m.delete) && !DB.crescite_equipes.some(r => r.date_id === 101 && r.personne_id === 2));
  const etat = await texte(page, '#tab-etat');
  ok('9 · la phrase d’état dit qui est prévenu (1 personne : Jean)', /1 personne sera prévenue \(Jean Durand/.test(etat), etat);
  const c = await lireCellule(page, 0);
  ok('9 · la case montre Camille (grise, barrée), Jean et Noé (l’anneau pointillé), et « −1 »', c.initiales.join() === 'CE,JD,NP' && /\babsent\b/.test(c.classes[0]) && /\bremplacant\b/.test(c.classes[2]) && c.moins === '−1', JSON.stringify(c));
  ok('9 · le focus revient sur la case, la fenêtre est fermée', (await compte(page, '.tab-pop')) === 0 && await page.evaluate(() => document.activeElement?.matches('#tab-corps td.c-distribution')));
  // Ctrl+Z défait l'écriture de la fenêtre (la pile du tableur)
  await page.keyboard.press('Control+z');
  await termine(page);
  await attendre(page, () => !E.equipes.some(x => x.date_id === 101 && x.personne_id === 4));
  ok('9 · Ctrl+Z rend la fenêtre d’avant : Noé n’est plus sur la date, Jean ne part plus', !DB.crescite_equipes.some(r => r.date_id === 101 && r.personne_id === 4) && DB.crescite_equipes.some(r => r.date_id === 101 && r.personne_id === 2 && !r.present), JSON.stringify(DB.crescite_equipes));
  ok('9 · aucune erreur de script (la fenêtre)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
// une tournée de dix personnes dans un écran court : la fenêtre défile en dedans, ses boutons restent à l'écran
{
  garnir();
  DB.crescite_personnes.push(...[11, 12, 13, 14, 15, 16, 17, 18].map(id => ({ id, slug: `p${id}`, prenom: `Prénom${id}`, nom: 'Essai', metiers: ['comédien'], photo: null, photo_publique: false, publie: true, ordre: id })));
  DB.crescite_distributions.push(...[11, 12, 13, 14, 15, 16, 17, 18].map((p, i) => ({ id: 800 + i, spectacle_id: 1, personne_id: p, categorie: 'jeu', fonction: '', en_tournee: true, publie: true, ordre: 30 + i })));
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 640, hash: '#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  await page.click(CASE(0, 'distribution'));
  await page.keyboard.press('Enter');
  await page.waitForSelector('.tab-pop.distribution', { timeout: 4000 });
  await calme(page);   // (la fenêtre se pose en 150 ms : on la mesure posée)
  const m = await page.evaluate(() => { const p = document.querySelector('.tab-pop.distribution'), r = p.getBoundingClientRect(), corps = p.querySelector('#dfn-corps'), ok = p.querySelector('[data-eq-ok]').getBoundingClientRect();
    return { haut: Math.round(r.top), bas: Math.round(r.bottom), ecran: innerHeight, defile: corps.scrollHeight > corps.clientHeight, overflow: getComputedStyle(corps).overflowY, bouton: Math.round(ok.bottom), n: p.querySelectorAll('[data-eqd-part]').length }; });
  ok('9 · une tournée de dix personnes dans un écran de 640 px : la fenêtre tient dans l’écran (max-height : 100vh − 16 px), son corps défile, et « Enregistrer » reste visible', m.n === 10 && m.bas <= m.ecran - 8 && m.haut >= 0 && m.defile && m.overflow === 'auto' && m.bouton <= m.ecran, JSON.stringify(m));
  ok('9 · aucune erreur de script (la tournée longue)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 10 · « Étendre à… »
{
  garnir();
  // une autre date de Bérénice au même lieu que la 101 (Caen), avec une ligne à fonction posée à la main (Léa : « Remplace Jean Durand »)
  DB.crescite_dates.push({ ...structuredClone(DB.crescite_dates.find(d => d.id === 101)), id: 108, debut: jour(40), fin: jour(40), saison: DB.crescite_dates.find(d => d.id === 101).saison });
  DB.crescite_equipes.push({ date_id: 108, personne_id: 3, present: true, fonction: 'Remplace Jean Durand', note: null });
  // la 109 : au même lieu, dans la saison, mais annulée — « Étendre à… » ne la compte ni ne l'écrit, quelle que soit la portée
  DB.crescite_dates.push({ ...structuredClone(DB.crescite_dates.find(d => d.id === 101)), id: 109, debut: jour(50), fin: jour(50), statut: 'annulee', saison: DB.crescite_dates.find(d => d.id === 101).saison });
  DB.crescite_equipes.splice(0, 1);   // (Jean part à Caen : on étend l'équipe complète de la 101)
  DB.crescite_equipes.push({ date_id: 101, personne_id: 4, present: true, fonction: 'régie', note: null });   // Noé en renfort régie sur la 101
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  await page.click(CASE(0, 'distribution'));
  await page.keyboard.press('Enter');
  await page.waitForSelector('.tab-pop.distribution [data-eq-etendre]', { timeout: 4000 });
  await page.click('.tab-pop [data-eq-etendre]');
  await page.waitForSelector('dialog.tab-dialogue[open] #tab-et-ok', { timeout: 4000 });
  const portees = await page.$$eval('dialog.tab-dialogue input[name=portee]', xs => xs.map(x => `${x.value}${x.checked ? '*' : ''}`));
  const libelles = await page.$$eval('dialog.tab-dialogue fieldset label', xs => xs.map(x => x.textContent.trim()));
  ok('10 · « Étendre à… » propose la saison, l’année, et « cette date et les suivantes au même lieu » (Théâtre de Caen), pas « les lignes choisies » sans plage', portees.join() === 'saison*,annee,lieu' && /cette date et les suivantes au même lieu \(Théâtre de Caen/.test(libelles[2]), JSON.stringify({ portees, libelles }));
  // la portée « saison » (cochée d'office) : toutes les dates à venir de Bérénice qui ne sont ni annulées ni reportées, la 109 exclue
  const vivantes = await page.evaluate(() => { const sa = E.dates.find(d => d.id === 101).saison; return E.dates.filter(d => d.spectacle_id === 1 && d.saison === sa && !['annulee', 'reportee'].includes(d.statut) && (d.fin || d.debut) >= AUJ).length; });
  const apercuSaison = await texte(page, '#tab-et-apercu');
  const comptees = (/(\d+) dates? chang/.exec(apercuSaison)?.[1] | 0) + (/(\d+) dates? (?:sont|est) déjà à jour/.exec(apercuSaison)?.[1] | 0);
  ok('10 · la portée « saison » ne compte pas la date annulée (109) : autant de dates que de dates à venir ni annulées ni reportées', comptees === vivantes && vivantes > 0, `${comptees} / ${vivantes} · ${apercuSaison}`);
  await page.check('dialog.tab-dialogue input[value=lieu]');
  await attendre(page, () => /changera/.test(document.querySelector('#tab-et-apercu')?.textContent || ''));
  const apercu = await texte(page, '#tab-et-apercu');
  ok('10 · la portée « au même lieu » ne touche que la 108 (la 101 est déjà à jour) : « 1 date changera ; 1 date est déjà à jour »', /1 date changera/.test(apercu) && /1 date est déjà à jour/.test(apercu), apercu);
  ok('10 · l’aperçu garde la ligne à fonction de la 108 (Léa, « Remplace Jean Durand ») et le dit', /elles sont gardées/.test(apercu) && /Léa Martin \(Remplace Jean Durand\)/.test(apercu), apercu);
  ok('10 · l’aperçu dit combien de personnes seront prévenues (la règle du déclencheur : un compte, une date à venir, une présence qui change) : ici, personne', /Personne ne sera prévenu/.test(apercu), apercu);
  await calme(page);
  const n = MODIFS.length;
  await page.click('#tab-et-ok');
  await termine(page);
  const posees = ecritures(n).filter(m => m.post).flatMap(m => m.post);
  ok('10 · « Appliquer » pose Noé (« régie ») sur la 108', posees.some(r => r.date_id === 108 && r.personne_id === 4 && r.fonction === 'régie'), JSON.stringify(posees));
  ok('10 · … la date annulée (109), au même lieu, n’est pas écrite', !MODIFS.slice(n).some(m => (m.post || []).some(r => r.date_id === 109) || (m.corps?.p_id === 109 || m.corps?.id === 109)), JSON.stringify(MODIFS.slice(n).map(m => m.rpc || m.table)));
  ok('10 · … et ne touche pas à la ligne à fonction de Léa : elle n’est ni supprimée ni réécrite', !ecritures(n).some(m => m.delete) && !posees.some(r => r.date_id === 108 && r.personne_id === 3) && DB.crescite_equipes.some(r => r.date_id === 108 && r.personne_id === 3 && r.fonction === 'Remplace Jean Durand'));
  ok('10 · l’état dit « Distribution posée sur 1 date »', /Distribution posée sur 1 date/.test(await texte(page, '#tab-etat')));
  ok('10 · aucune erreur de script (Étendre)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 11 · le mode Distribution : la matrice
{
  garnir();
  DB.crescite_equipes.length = 0;
  DB.crescite_equipes.push({ date_id: 103, personne_id: 3, present: true, fonction: 'régie', note: null });   // Léa en renfort régie à Paris ; Jean part à Caen (et sera indisponible ce jour-là)
  DB.crescite_dates.find(d => d.id === 105).statut = 'annulee';   // la 105 est annulée : une ligne de cases grisées
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '?mode=distribution&spectacle=1#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  await attendre(page, () => document.querySelector('#tab-corps .mat-alerte'));
  const vu = await page.evaluate(() => ({ modes: [...document.querySelectorAll('.tab-modes button')].map(b => `${b.textContent.trim()}${b.getAttribute('aria-pressed') === 'true' ? '*' : ''}`).join(), classes: document.querySelector('#tab').className, role: document.querySelector('#tab').getAttribute('role'),
    ths: [...document.querySelectorAll('#tab-tete th')].map(t => t.dataset.k).join(), lignes: document.querySelectorAll('#tab-corps tr[data-l]').length, neuve: document.querySelectorAll('#tab-corps tr[data-neuve]').length,
    p1: document.querySelector('#tab-tete th[data-k="p1"]').textContent.replace(/\s+/g, ' ').trim(), p2: document.querySelector('#tab-tete th[data-k="p2"]').textContent.replace(/\s+/g, ' ').trim(), compte: document.querySelector('#tab-compte').textContent }));
  ok('11 · le troisième bouton du tableur est « Distribution » (enfoncé en ?mode=distribution) ; la table est une grille (role=grid), sans ligne vide au bas', vu.modes === 'Simple,Complet,Distribution*' && vu.role === 'grid' && /\bmatrice\b/.test(vu.classes) && vu.neuve === 0, JSON.stringify(vu));
  ok('11 · pour le spectacle filtré : le jour, le lieu, puis une colonne par personne en tournée (Camille, Jean) et par renfort rencontré (Léa) ; une ligne par date (101, 103, 105 annulée)', vu.ths === 'jour,lieu,p1,p2,p3' && vu.lignes === 3 && /^3 dates · 3 personnes/.test(vu.compte), JSON.stringify(vu));
  ok('11 · l’en-tête d’une colonne : le prénom et son rôle dessous (« Camille » / « Bérénice »), et « téléphone ? » pour Jean qui n’en a pas', /Camille/.test(vu.p1) && /Bérénice/.test(vu.p1) && !/téléphone/.test(vu.p1) && /Jean/.test(vu.p2) && /téléphone \?/.test(vu.p2), `${vu.p1} | ${vu.p2}`);
  const cases = await page.evaluate(() => Object.fromEntries([[0, 'p1'], [0, 'p2'], [1, 'p3'], [2, 'p1'], [1, 'p1']].map(([l, k]) => { const td = document.querySelector(`#tab-corps tr[data-l="${l}"] td.c-${k}`), b = td.querySelector('.mat-case'); return [`${l}${k}`, { classe: b.className, label: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed'), alerte: !!td.querySelector('.mat-alerte'), lecture: td.getAttribute('aria-readonly') }]; })));
  ok('11 · chaque case est un bouton à l’état dit (aria-pressed, aria-label « Camille Essai · … : part »), ✓ pour qui part, ⟳ pour la renfort (Léa)', cases['0p1'].pressed === 'true' && /^Camille Essai · .+ : part$/.test(cases['0p1'].label) && /remplaçant ou renfort/.test(cases['1p3'].label) && /remplacant/.test(cases['1p3'].classe), JSON.stringify(cases));
  ok('11 · un point corail signale l’indisponibilité de Jean sur la 101 (le label le dit : « indisponible (Tournage) »), pas sur les autres cases', cases['0p2'].alerte && /indisponible \(Tournage\)/.test(cases['0p2'].label) && !cases['1p1'].alerte && !cases['0p1'].alerte, JSON.stringify(cases['0p2']));
  ok('11 · la date annulée (105) est une ligne de cases grisées non cliquables (aria-readonly, pas de bouton)', await page.$eval('#tab-corps tr[data-l="2"] td.c-p1', td => td.getAttribute('aria-readonly') === 'true' && !td.querySelector('button') && !!td.querySelector('.mat-case.grise')));
  const pied = await page.$$eval('#tab-pied td', xs => xs.map(x => x.textContent.trim()).join('|'));
  ok('11 · le bas du tableau compte les dates de chacun (Camille 2, Jean 2, Léa 1)', /2 dates\|2 dates\|1 date$/.test(pied), pied);
  await calme(page);
  await page.screenshot({ path: `${CAPT}/distribution-matrice.png`, fullPage: false });
  // un clic bascule ✓ → ✕, par ecrire() du tableur : une écriture de crescite_equipes (Camille, sans compte, ne part plus : personne n'est prévenu)
  let n = MODIFS.length;
  await page.click('#tab-corps tr[data-l="1"] td.c-p1 .mat-case');
  await termine(page);
  const ecrit = ecritures(n).filter(m => m.post);
  ok('11 · un clic sur la case de Camille à Paris la fait passer de ✓ à ✕ : l’écart « ne part pas » est écrit (crescite_equipes, date_id,personne_id)', ecrit.length === 1 && ecrit[0].conflit.join(',') === 'date_id,personne_id' && ecrit[0].post.some(r => r.date_id === 103 && r.personne_id === 1 && r.present === false), JSON.stringify(ecrit));
  ok('11 · la case est ✕ (gris, barré), le bouton dit « ne part pas », et l’état annonce « Annuler » avec la règle de qui est prévenu (Camille n’a pas de compte)', await page.$eval('#tab-corps tr[data-l="1"] td.c-p1 .mat-case', b => b.classList.contains('absent') && /ne part pas/.test(b.getAttribute('aria-label')) && b.getAttribute('aria-pressed') === 'false') && /Camille Essai n’a pas de compte/.test(await texte(page, '#tab-etat')) && (await compte(page, '#tab-annuler')) === 1, await texte(page, '#tab-etat'));
  const saut = await page.$eval('#tab-corps tr[data-l="1"] td.c-p1 .mat-case', b => { const s = getComputedStyle(b); return { classe: b.className, nom: s.animationName, duree: s.animationDuration, courbe: s.animationTimingFunction }; });
  ok('11 · la case qui vient de basculer saute : ad-pop, 450 ms, le ressort (cubic-bezier(.3, 1.6, .5, 1))', /\bsaute\b/.test(saut.classe) && saut.nom === 'ad-pop' && saut.duree === '0.45s' && /cubic-bezier\(0\.3, 1\.6, 0\.5, 1\)/.test(saut.courbe), JSON.stringify(saut));
  await page.keyboard.press('Control+z');
  await attendre(page, () => /^Annulé/.test(document.querySelector('#tab-etat')?.textContent || ''), null, 8000);
  await attendre(page, () => document.querySelector('#tab-corps tr[data-l="1"] td.c-p1 .mat-case')?.classList.contains('part'));
  ok('11 · Ctrl+Z remet la case à ✓ (la ligne d’écart est retirée de la base, la distribution suffit)', await page.$eval('#tab-corps tr[data-l="1"] td.c-p1 .mat-case', b => b.classList.contains('part')) && !DB.crescite_equipes.some(r => r.date_id === 103 && r.personne_id === 1), JSON.stringify(DB.crescite_equipes));
  // Jean, qui a un compte, à Caen : ✕ est annoncé (« 1 personne sera prévenue »)
  await page.click('#tab-corps tr[data-l="0"] td.c-p2 .mat-case');
  await termine(page);
  const t = await texte(page, '#tab-etat');
  ok('11 · cliquer Jean à Caen (il a un compte, la date est à venir) : « 1 personne sera prévenue (Jean Durand : « vous ne partez plus ») »', /1 personne sera prévenue \(Jean Durand : « vous ne partez plus »\)/.test(t), t);
  ok('11 · … et l’indisponibilité n’est plus un souci : le point corail s’en va avec la présence', (await compte(page, '#tab-corps tr[data-l="0"] td.c-p2 .mat-alerte')) === 0);
  await page.keyboard.press('Control+z');
  await attendre(page, () => document.querySelector('#tab-corps tr[data-l="0"] td.c-p2 .mat-case')?.classList.contains('part'));
  // un double-clic bascule une fois, pas trois : une seule écriture de l'équipe, une seule entrée « Annuler »
  n = MODIFS.length;
  await page.dblclick('#tab-corps tr[data-l="1"] td.c-p1 .mat-case');
  await termine(page);
  await page.waitForTimeout(500);
  const dbl = MODIFS.slice(n);
  ok('11 · un double-clic sur une case ne bascule qu’une fois : une seule écriture de la date et de son équipe (✕), pas trois', dbl.filter(m => m.rpc === 'crescite_enregistrer_date').length === 1 && ecritures(n).filter(m => m.post).length === 1 && await page.$eval('#tab-corps tr[data-l="1"] td.c-p1 .mat-case', b => b.classList.contains('absent')), JSON.stringify(dbl.map(m => m.rpc || m.table)));
  await page.keyboard.press('Control+z');
  await attendre(page, () => /^Annulé/.test(document.querySelector('#tab-etat')?.textContent || ''), null, 8000);
  await attendre(page, () => document.querySelector('#tab-corps tr[data-l="1"] td.c-p1 .mat-case')?.classList.contains('part'));
  ok('11 · … et un seul Ctrl+Z la remet à ✓ (une seule entrée dans la pile)', await page.$eval('#tab-corps tr[data-l="1"] td.c-p1 .mat-case', b => b.classList.contains('part')) && !DB.crescite_equipes.some(r => r.date_id === 103 && r.personne_id === 1 && r.present === false));
  // Suppr rend la case à la distribution : Jean (un compte) revient à Caen, et l'état dit qui est prévenu
  await page.click('#tab-corps tr[data-l="0"] td.c-p2 .mat-case');
  await termine(page);
  await page.keyboard.press('Delete');
  await attendre(page, () => /prévenue/.test(document.querySelector('#tab-etat')?.textContent || '') && /: part/.test(document.querySelector('#tab-etat')?.textContent || ''), null, 8000);
  const tSuppr = await texte(page, '#tab-etat');
  ok('11 · Suppr sur la case de Jean (✕ → ✓, il a un compte, la date est à venir) dit « 1 personne sera prévenue »', /1 personne sera prévenue/.test(tSuppr) && await page.$eval('#tab-corps tr[data-l="0"] td.c-p2 .mat-case', b => b.classList.contains('part')), tSuppr);
  // Espace bascule au clavier (la case active), Entrée aussi
  await page.click('#tab-corps tr[data-l="1"] td.c-lieu');
  await page.keyboard.press('ArrowRight');   // (le lieu, puis la colonne de Camille)
  n = MODIFS.length;
  await page.keyboard.press('Space');
  await termine(page);
  ok('11 · Espace sur la case active la bascule (Camille à Paris : ✕), comme un clic', ecritures(n).some(m => m.post?.some(r => r.date_id === 103 && r.personne_id === 1 && r.present === false)) && await page.$eval('#tab-corps tr[data-l="1"] td.c-p1 .mat-case', b => b.classList.contains('absent')));
  await page.keyboard.press('Enter');
  await attendre(page, () => document.querySelector('#tab-corps tr[data-l="1"] td.c-p1 .mat-case')?.classList.contains('part'));
  ok('11 · Entrée la rebascule (✓) ; la case garde le focus', await page.$eval('#tab-corps tr[data-l="1"] td.c-p1 .mat-case', b => b.classList.contains('part')) && await page.evaluate(() => document.activeElement?.matches('#tab-corps td.c-p1')));
  // une date annulée ne s'écrit pas
  n = MODIFS.length;
  await page.click('#tab-corps tr[data-l="2"] td.c-p1');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  ok('11 · la case d’une date annulée ne bascule pas : rien n’est écrit, l’état dit pourquoi', MODIFS.length === n && /annulée/.test(await texte(page, '#tab-etat')), await texte(page, '#tab-etat'));
  // le menu ⋯ d'une colonne : « Régler sa période »
  await page.click('#tab-tete th[data-k="p1"] .mat-menu');
  await page.waitForSelector('[data-gm]', { timeout: 4000 });
  const menu = await page.$$eval('[data-gm]', xs => xs.map(x => x.textContent.trim().replace(/\s+/g, ' ')));
  ok('11 · le bouton ⋯ d’une colonne ouvre son menu : « Régler sa période »', menu.some(x => /^Régler sa période/.test(x)), JSON.stringify(menu));
  await page.click('[data-gm]:has-text("Régler sa période")');
  await page.waitForSelector('#periode-choix[open]', { timeout: 4000 });
  ok('11 · … qui ouvre la boîte de la période de Camille dans Bérénice', /Camille Essai dans Bérénice/.test(await texte(page, '#periode-choix h2')));
  await page.keyboard.press('Escape');
  await attendre(page, () => !document.querySelector('#periode-choix'));
  // une plage au clavier, puis « Étendre à… » : les lignes choisies et le même lieu
  await page.click('#tab-corps tr[data-l="0"] td.c-jour');
  await page.keyboard.press('Shift+ArrowDown');
  await page.click('#tab-etendre');
  await page.waitForSelector('dialog.tab-dialogue[open] #tab-et-ok', { timeout: 4000 });
  const libs = await page.$$eval('dialog.tab-dialogue fieldset label', xs => xs.map(x => x.textContent.trim()));
  ok('11 · Maj+↓ sur deux lignes, puis « Étendre à… » : la portée « les lignes choisies (2 dates) » est proposée, cochée, et « au même lieu » aussi', libs.some(x => /les lignes choisies \(2 dates\)/.test(x)) && libs.some(x => /au même lieu/.test(x)) && await page.$eval('dialog.tab-dialogue input[value=lignes]', i => i.checked), JSON.stringify(libs));
  await page.click('#tab-et-non');
  await attendre(page, () => !document.querySelector('dialog.tab-dialogue'));
  // la plage traverse la date annulée (105, la troisième ligne) : « Étendre à… » ne la compte pas parmi les lignes choisies
  await page.click('#tab-corps tr[data-l="0"] td.c-jour');
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowDown');
  await page.click('#tab-etendre');
  await page.waitForSelector('dialog.tab-dialogue[open] #tab-et-ok', { timeout: 4000 });
  const libs3 = await page.$$eval('dialog.tab-dialogue fieldset label', xs => xs.map(x => x.textContent.trim()));
  ok('11 · une plage de trois lignes qui traverse la date annulée : « les lignes choisies (2 dates) », la 105 n’en est pas', libs3.some(x => /les lignes choisies \(2 dates\)/.test(x)), JSON.stringify(libs3));
  await page.click('#tab-et-non');
  await attendre(page, () => !document.querySelector('dialog.tab-dialogue'));
  // à l'impression, les boutons ⋯ des colonnes ne s'impriment pas (le bouton « Étendre à… » non plus)
  await page.emulateMedia({ media: 'print' });
  const imprime = await page.evaluate(() => ({ menus: [...document.querySelectorAll('.mat-menu')].map(b => getComputedStyle(b).display), etendre: getComputedStyle(document.querySelector('#tab-etendre')).display }));
  await page.emulateMedia({ media: 'screen' });
  ok('11 · à l’impression, les boutons ⋯ des colonnes sont cachés (comme « Étendre à… »)', imprime.menus.length > 0 && imprime.menus.every(d => d === 'none') && imprime.etendre === 'none', JSON.stringify(imprime));
  ok('11 · aucune erreur de script (la matrice)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
// sans spectacle filtré : un groupe de lignes par spectacle
{
  garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '?mode=distribution#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  const g = await page.evaluate(() => ({ ths: [...document.querySelectorAll('#tab-tete th')].map(t => t.dataset.k).join(), figees: [...document.querySelectorAll('#tab-tete th.figee')].map(t => t.dataset.k).join(), groupes: [...document.querySelectorAll('#tab-corps tr.debut-groupe')].map(tr => tr.querySelector('td.c-spectacle')?.textContent.trim()).join('|'),
    suite: [...document.querySelectorAll('#tab-corps tr[data-l]')].map(tr => tr.querySelector('td.c-spectacle')?.textContent.trim()).join('|') }));
  ok('11 · sans spectacle filtré : la colonne du spectacle s’ajoute (figée avec le jour) et chaque spectacle forme un groupe de lignes, le premier de chacun marqué (Bérénice, puis La Folle Idée…)', /^jour,spectacle,lieu,/.test(g.ths) && g.figees === 'jour,spectacle' && /^Bérénice\|La Folle Idée/.test(g.groupes) && g.suite.startsWith('Bérénice|Bérénice|Bérénice|La Folle Idée'), JSON.stringify(g));
  // les colonnes sont celles des personnes de tous les spectacles à l'écran : Léa (La Folle Idée) y est, avec sa case à Paris vide pour Bérénice
  const cols = await page.$$eval('#tab-tete th[data-k^="p"]', xs => xs.map(t => t.dataset.k).join());
  ok('11 · les colonnes des personnes sont celles de tous les spectacles à l’écran, par métier : le jeu (Camille, Léa de La Folle Idée), puis la technique (Jean)', cols === 'p1,p3,p2', cols);
  ok('11 · aucune erreur de script (les groupes)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// le mode se garde avec le compte et se dit dans l'adresse
{
  garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  await page.click('.tab-modes [data-mode="distribution"]');
  await page.waitForSelector('#tab-corps td.mat', { timeout: 8000 });
  await attendre(page, () => /mode=distribution/.test(location.search));
  const cle = () => ECRITURES.filter(e => e.cle === 'tableur.mode').at(-1)?.valeur;
  for (let i = 0; i < 40 && cle() !== 'distribution'; i++) await page.waitForTimeout(50);
  ok('11 · le bouton « Distribution » écrit le mode dans le compte (tableur.mode) et dans l’adresse (?mode=distribution), sur le tableur seulement', cle() === 'distribution' && /mode=distribution/.test(await page.evaluate(() => location.search + location.hash)), `${cle()} · ${await page.evaluate(() => location.search + location.hash)}`);
  ok('11 · le bouton « Étendre à… » n’est montré qu’en Distribution, la ligne vide du bas n’y est pas', await page.$eval('#tab-etendre', b => !b.hidden) && (await compte(page, '#tab-corps tr[data-neuve]')) === 0);
  await page.click('.tab-modes [data-mode="simple"]');
  await page.waitForSelector('#tab-corps tr[data-neuve]', { timeout: 8000 });
  ok('11 · de retour en Simple : plus de colonnes de personnes, « Étendre à… » caché, le bas du tableau vidé, la ligne vide revient', (await compte(page, '#tab-tete th.mat')) === 0 && await page.$eval('#tab-etendre', b => b.hidden) && (await page.$eval('#tab-pied', p => p.textContent)) === '');
  ok('11 · aucune erreur de script (le segment des modes)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
// rien ne bouge sous « moins d'animations » ni avec ?anim=0 : la case qui bascule ne saute pas, la fenêtre ne se pose pas en fondu
for (const [nom, options] of [['« moins d’animations »', { reduit: true, hash: '?mode=distribution&spectacle=1#/representations/tableur' }], ['?anim=0', { hash: '?anim=0&mode=distribution&spectacle=1#/representations/tableur' }]]) {
  garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, ...options });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  await page.click('#tab-corps tr[data-l="1"] td.c-p1 .mat-case');
  await termine(page);
  await page.waitForTimeout(200);
  const fixe = await page.$eval('#tab-corps tr[data-l="1"] td.c-p1 .mat-case', b => ({ nom: getComputedStyle(b).animationName, absent: b.classList.contains('absent') }));
  ok(`12 · ${nom} : la case bascule (✕) sans sauter (aucune animation)`, fixe.absent && fixe.nom === 'none', JSON.stringify(fixe));
  await page.click('.tab-modes [data-mode="simple"]');
  await page.click(CASE(0, 'distribution'));
  await page.keyboard.press('Enter');
  await page.waitForSelector('.tab-pop.distribution', { timeout: 4000 });
  ok(`12 · ${nom} : la fenêtre de la distribution paraît sans animation`, await page.$eval('.tab-pop.distribution', p => getComputedStyle(p).animationName === 'none'));
  ok(`12 · ${nom} : aucune erreur de script`, erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 13 · le budget de la matrice, à CPU=4
// trois grandeurs : 120 dates de dix personnes (le spectacle filtré), 300 dates de douze personnes (la base réelle en compte déjà environ 230),
// et 300 dates de deux spectacles sans filtre (ce que donne le bouton Distribution quand aucun spectacle n'est choisi : une vingtaine de colonnes)
async function budget({ nom, dates, parSpectacle, deux = false, filtre = true }) {
  garnir();
  DB.crescite_preferences = [];   // (le budget d'avant a gardé tableur.mode = distribution : sans cela, la page s'ouvrirait déjà en matrice, et « l'ouverture » ne mesurerait pas le passage du Simple)
  DB.crescite_equipes.length = 0;   // (Léa en renfort ferait une colonne de plus : le compte des personnes est celui qu'on pose ici)
  const sps = deux ? [1, 2] : [1];
  sps.forEach((sp, r) => {
    const nouveaux = Array.from({ length: parSpectacle }, (_, k) => (sp === 1 ? 11 : 111) + k);
    DB.crescite_personnes.push(...nouveaux.map(id => ({ id, slug: `p${id}`, prenom: `Prénom${id}`, nom: 'Essai', metiers: ['comédien'], photo: null, photo_publique: false, publie: true, ordre: id })));
    DB.crescite_distributions.push(...nouveaux.map((p, i) => ({ id: 800 + 100 * r + i, spectacle_id: sp, personne_id: p, categorie: 'jeu', fonction: '', en_tournee: true, publie: true, ordre: 30 + i })));
  });
  const modele = DB.crescite_dates.find(d => d.id === 101);
  for (let i = 0; i < dates; i++) DB.crescite_dates.push({ ...structuredClone(modele), id: 1000 + i, spectacle_id: sps[i % sps.length], debut: plus(i), fin: plus(i), saison: modele.saison });
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/representations/tableur', cpu: 4, longues: true });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 30000 });
  const nbLignes = () => page.evaluate(() => document.querySelectorAll('#tab-corps tr[data-l]').length);
  if (filtre) {
    await page.click('.puce[data-sp="1"]');
    await attendre(page, n => document.querySelectorAll('#tab-corps tr[data-l]').length > n, deux ? dates / 2 : dates, 20000);
  } else await attendre(page, n => document.querySelectorAll('#tab-corps tr[data-l]').length > n, dates, 20000);
  await page.waitForTimeout(800);
  const attendues = await nbLignes();
  await page.evaluate(() => { window.__longues.length = 0; window.__pret = performance.now(); });
  await page.click('.tab-modes [data-mode="distribution"]');
  await attendre(page, n => document.querySelectorAll('#tab-corps tr[data-l]').length >= n && document.querySelector(`#tab-corps tr[data-l="${n - 1}"] td.mat`), attendues, 30000);
  await page.waitForTimeout(600);
  const ouverture = await page.evaluate(() => window.__longues.slice());
  const dim = await page.evaluate(() => ({ lignes: document.querySelectorAll('#tab-corps tr[data-l]').length, cases: document.querySelectorAll('#tab-corps .mat-case').length, colonnes: document.querySelectorAll('#tab-tete th.mat').length }));
  console.log(`tâches longues à l’ouverture de la matrice (${nom} : ${dim.lignes} lignes, ${dim.colonnes} colonnes) à CPU=4 (ms) : ${JSON.stringify(ouverture)}`);
  ok(`13 · ${nom} : toutes les cases sont posées (une case par date et par personne)`, dim.lignes >= Math.min(dates, attendues) && dim.colonnes >= parSpectacle && dim.cases >= dim.lignes * parSpectacle, JSON.stringify(dim));
  ok(`13 · ${nom} : aucune tâche > 200 ms à l’ouverture de la matrice, à CPU=4`, ouverture.every(d => d < 200), JSON.stringify(ouverture));
  // un clic comme le fait une main : la case est amenée à l'écran, la souris s'y pose, le bouton descend, puis remonte (le « click » de Playwright
  // enchaîne tout dans une même tâche et fait ses propres sondages de la page, qui comptent à CPU=4 : ce n'est pas le geste de quelqu'un)
  const milieu = Math.floor(dim.lignes / (deux ? 4 : 2)), cible = `#tab-corps tr[data-l="${milieu}"] td.c-p11 .mat-case`;   // (sans filtre, les lignes du premier spectacle viennent d'abord : la colonne de Prénom11 en est)
  await page.evaluate(sel => document.querySelector(sel).scrollIntoView({ block: 'center', inline: 'center' }), cible);
  await page.waitForTimeout(500);
  const boite = await (await page.$(cible)).boundingBox();
  await page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
  await page.evaluate(() => { window.__longues.length = 0; window.__pret = performance.now(); });
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.up();
  await termine(page);
  await page.waitForTimeout(400);
  const clic = await page.evaluate(() => window.__longues.slice());
  console.log(`tâches longues après un clic de case (${nom}) à CPU=4 (ms) : ${JSON.stringify(clic)}`);
  ok(`13 · ${nom} : un clic de case écrit et redessine la ligne, aucune tâche > 200 ms, à CPU=4`, clic.every(d => d < 200) && await page.$eval(`#tab-corps tr[data-l="${milieu}"] td.c-p11 .mat-case`, b => b.classList.contains('absent')), JSON.stringify(clic));
  ok(`13 · ${nom} : aucune erreur de script`, erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
await budget({ nom: '120 dates, 10 personnes', dates: 120, parSpectacle: 8 });
await budget({ nom: '300 dates, 12 personnes, un spectacle', dates: 300, parSpectacle: 10 });
await budget({ nom: '300 dates de deux spectacles, sans filtre', dates: 300, parSpectacle: 9, deux: true, filtre: false });

retirer();
bilan(CAPT);
