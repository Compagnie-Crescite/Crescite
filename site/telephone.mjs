// L'administration au téléphone (moins de 641 px de large), vérifiée dans Chromium, hors ligne, sur la base fictive commune
// (admin-fictif.mjs, ouvrir({ largeur: 390, hauteur: 844, tactile: true })) : le banc du plan admin/TELEPHONE.md. Une section par
// lot, « N · … » dans le nom de chaque vérification ; les lots suivants y ajoutent la leur, en fin de fichier.
//   node site/telephone.mjs             (python3 site/build.py d'abord : la page servie vient de site/dist/admin/index.html)
//   bash site/bancs-admin.sh            l'inscrit en fin de BANCS, après les bancs de l'ordinateur
// 1 · le bas de l'écran dégagé, les fiches en plein écran (admin/mobile.js, les pieds de fiche replié de index.html et equipe.js) :
//   (a) une date, une personne, un lieu ouverts commencent en haut (le titre de la rubrique ne prend plus la place, son h1 reste lu,
//       rien de la tête n'est atteint par Tab) ; (b) le « + » est caché dans une feuille de route, un spectacle, le tableur, et le reste
//       quand la vue change ; (c) dix routes nommées ont leur « + », et au bout de la page aucun bouton ni lien ne passe sous lui ;
//       une annonce se pose au-dessus du « + », et au-dessus du pied d'une fiche ; (d) le pied d'une date ouverte en tiroir est collé
//       au bas du tiroir ; (e) le détail d'un jour du planning s'arrête au-dessus de la barre ; (f) le pied de chaque fiche tient sur
//       une rangée et « Supprimer » est dans « Plus » ; une date en tiroir au-dessus d'une fiche a son propre « Plus » ; (g) « Plus » et
//       « Créer » rendent le focus en se fermant (même sans focus au toucher, comme sur l'iPhone), retiennent Tab, glissent en 200 ms
//       au « doux », sans bouger sous « moins d'animations » ; (h) à 1 440 × 900, la tête, les pieds et les classes de sept fiches sont
//       ceux d'avant (pas de « + », rien d'inerte : des mesures, pas une comparaison du DOM) ; (i) à CPU=4, aucune tâche de plus de 200 ms.
// Les captures vont dans site/dist/shots-telephone/ (jamais commitées). Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, DB, plus, ok, ouvrir, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-telephone');
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
const attendre = (page, fn, arg = null, ms = 8000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 'raf' }).then(() => true, () => false);
const fin = (nom, erreurs) => ok(`${nom} · aucune erreur de script`, erreurs.length === 0, erreurs.join(' / '));
// un toucher qui n'attend pas trente secondes un bouton absent : la vérification qui suit le dit
const toucher = (page, sel) => page.tap(sel, { timeout: 4000 }).then(() => true, () => false);
const TEL = { largeur: 390, hauteur: 844, tactile: true };

// aller à une adresse de l'application, attendre la vue qui vient (un sélecteur), puis un souffle
async function aller(page, hash, selecteur, ms = 12000) {
  await page.evaluate(h => { location.hash = h; }, hash);
  const vu = await attendre(page, ([h, s]) => location.hash === h && !!document.querySelector(s), [hash, selecteur], ms);
  await page.waitForTimeout(250);
  return vu;
}
// ce qui croise le rectangle du « + » : les boutons et liens visibles à l'écran (hors la barre du bas et le « + » lui-même)
const CROISENT = () => {
  const p = document.querySelector('.ob-plus');
  if (!p || p.hidden || !p.getClientRects().length) return null;
  const r = p.getBoundingClientRect();
  const visible = e => { const s = getComputedStyle(e), b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && b.bottom > 0 && b.top < innerHeight; };
  return [...document.querySelectorAll('a[href], button, input, select, textarea, summary, [role="button"]')]
    .filter(e => e !== p && !e.closest('.ob-barre') && visible(e))
    .filter(e => { const b = e.getBoundingClientRect(); return b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top; })
    .map(e => `${e.id || e.className || e.tagName} « ${(e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24)} »`);
};
// le planning vient du rpc crescite_planning, que la base fictive laisse vide : on lui donne trois personnes, une indisponibilité, les dates
const garnirPlanning = ctx => ctx.route(/rpc\/crescite_planning/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ moi: null, admin: true,
  personnes: DB.crescite_personnes.map(p => ({ id: p.id, prenom: p.prenom, nom: p.nom, slug: p.slug, metiers: p.metiers, photo: null })),
  indisponibilites: [{ id: 1, personne_id: 2, debut: `${plus(3)}T00:00:00+00:00`, fin: `${plus(4)}T00:00:00+00:00`, journee: true, source: 'admin', motif: 'Tournage' }],
  dates: DB.crescite_dates.map(d => { const sp = DB.crescite_spectacles.find(s => s.id === d.spectacle_id), l = DB.crescite_lieux.find(x => x.id === d.lieu_id);
    return { id: d.id, debut: d.debut, fin: d.fin, precision: 'jour', nature: d.nature, statut: d.statut, public: d.public, spectacle: { id: sp.id, slug: sp.slug, titre: sp.titre, couleur: sp.univers.couleurs.scene }, lieu: { nom: l.nom, commune: l.commune }, equipe: d.spectacle_id === 1 ? [1, 2] : [1, 3] }; }),
  propositions: [] }) }));
const plusCache = page => page.evaluate(() => { const p = document.querySelector('.ob-plus'); return !p || p.hidden || !p.getClientRects().length; });

// ================================================================================ 1 · le bas de l'écran dégagé, les fiches en plein écran
{
  DB.crescite_preferences = [];
  const { ctx, page, erreurs } = await ouvrir(navigateur, { ...TEL, hash: '#/accueil' });
  await garnirPlanning(ctx);
  await page.waitForSelector('.ob-barre', { timeout: 15000 });
  await page.waitForTimeout(400);

  // ---- (a) les fiches commencent en haut de l'écran
  for (const [hash, fiche, rubrique] of [['#/representations/101', '#ed-date', 'Représentations'], ['#/equipe/1', '#ed-personne', 'Équipe'], ['#/lieux/5', '#ed-lieu', 'Lieux']]) {
    const vu = await aller(page, hash, `${fiche} .titre-ed h2`);
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    const m = await page.evaluate(() => {
      const tete = document.querySelector('.tete'), t = document.querySelector('.titre-ed'), h1 = tete?.querySelector('h1');
      const focalisables = tete ? [...tete.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')].filter(e => e.getClientRects().length) : [];
      return { haut: Math.round(t.getBoundingClientRect().top), tete: tete ? Math.round(tete.getBoundingClientRect().height) : -1,
        h1: h1 ? { l: Math.round(h1.getBoundingClientRect().width), h: Math.round(h1.getBoundingClientRect().height) } : null, focalisables: focalisables.length, fil: !!document.querySelector('.fil-ariane') };
    });
    ok(`1 · a · ${hash} : la fiche est ouverte, et le haut de son titre est à 140 px au plus de l'écran (${m.haut} px)`, vu && m.haut <= 140, JSON.stringify(m));
    ok(`1 · a · ${hash} : la tête de la rubrique est invisible (hauteur nulle, aucun bouton ni vue visible), son h1 d'une seule pointe de pixel`, m.tete === 0 && m.focalisables === 0 && !!m.h1 && m.h1.l <= 1 && m.h1.h <= 1, JSON.stringify(m));
    const lu = await page.getByRole('heading', { level: 1, name: rubrique }).count();
    ok(`1 · a · ${hash} : le h1 « ${rubrique} » reste dans l'arbre d'accessibilité (lu des lecteurs d'écran)`, lu === 1, `${lu} titre(s) lu(s)`);
    ok(`1 · a · ${hash} : le fil d'Ariane de la fiche reste visible`, m.fil);
    const dedans = [];
    for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); dedans.push(await page.evaluate(() => !!document.activeElement?.closest('.tete'))); }
    ok(`1 · a · ${hash} : quatorze Tab de suite n'atteignent aucun élément de la tête`, !dedans.some(Boolean), dedans.join(','));
    if (hash === '#/representations/101') await page.screenshot({ path: `${CAPT}/1-fiche-date.png` });
  }

  // ---- toutes les fiches ont leur propre titre (la règle sur la tête le suppose) : rubrique par rubrique
  for (const [hash, rubrique] of [['#/ateliers/catalogue/1', 'Ateliers'], ['#/ateliers/seances/1', 'Ateliers'], ['#/textes/coordonnees', 'Textes du site'], ['#/diffusion/devis/1', 'Diffusion · Demandes de devis'], ['#/pro/1', 'Espace pro'], ['#/planning/proposition/1', 'Planning']]) {
    const vu = await aller(page, hash, '.editeur .titre-ed h2');
    const m = await page.evaluate(() => { const tete = document.querySelector('.tete'), t = document.querySelector('.titre-ed'); return { titre: !!t && !!t.querySelector('h2')?.textContent.trim(), retour: !!t?.querySelector('a[data-tt="retour"]'), tete: tete ? Math.round(tete.getBoundingClientRect().height) : -1, haut: t ? Math.round(t.getBoundingClientRect().top) : -1 }; });
    const lu = await page.getByRole('heading', { level: 1, name: rubrique }).count();
    ok(`1 · a · ${hash} : la fiche a son titre et son retour (la tête de « ${rubrique} » s'efface, son h1 reste lu)`, vu && m.titre && m.retour && m.tete === 0 && m.haut <= 140 && lu === 1, JSON.stringify({ ...m, lu }));
  }

  // ---- (b) le « + » est caché là où la vue a ses boutons en bas, et le reste quand la vue change
  for (const [hash, attente] of [['#/feuilles/101', '#vue .pied-ed, #vue h1, #vue h2'], ['#/spectacles/berenice', '#vue .pied-ed'], ['#/representations/tableur', '#tab-corps tr[data-l]']]) {
    const vu = await aller(page, hash, attente, 15000);
    await page.waitForTimeout(150);
    const cache = await plusCache(page);
    await page.evaluate(() => { const n = document.createElement('div'); n.id = 'essai-noeud'; document.getElementById('vue').append(n); });
    await page.waitForTimeout(150);
    const encore = await plusCache(page);
    ok(`1 · b · ${hash} : le « + » est caché, et il l'est encore 150 ms après l'ajout d'un nœud dans #vue`, vu && cache && encore, JSON.stringify({ vu, cache, encore }));
    if (hash !== '#/spectacles/berenice') await page.screenshot({ path: `${CAPT}/1-sans-plus-${hash.split('/')[1]}.png` });
  }
  // (une vue sans pied ni fiche garde son « + » ; il revient en quittant une fiche)
  await aller(page, '#/representations', '.deux .liste');
  await page.waitForTimeout(150);
  ok('1 · b · #/representations : la liste, elle, garde son « + » (il revient en quittant une fiche)', !(await plusCache(page)));

  // ---- (c) au bout de la page, aucun bouton ni lien ne passe sous le « + » ; une annonce se pose au-dessus
  // (en route, une liste défile sous lui comme sous tout bouton flottant : seul le bout de page compte, là où le pied commun et
  // la dernière ligne s'arrêtent)
  const ROUTES = ['#/representations', '#/lieux', '#/ateliers/seances', '#/diffusion', '#/pro', '#/textes', '#/spectacles', '#/journal', '#/corbeille', '#/feuilles'];
  const sousPlus = [];
  const avec = [];
  for (const hash of ROUTES) {
    await aller(page, hash, '#vue .tete h1, #vue h1');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(120);
    const x = await page.evaluate(CROISENT);
    if (x) avec.push(hash);
    if (x && x.length) sousPlus.push(`${hash} : ${x.join(' ; ')}`);
  }
  // (les dix routes ont leur « + » : une qui le perdrait ferait rougir la vérification, au lieu de passer pour une route sans rien dessous)
  const sansPlus = ROUTES.filter(h => !avec.includes(h));
  ok('1 · c · dix routes, au bout de la page : chacune a son « + », et aucun bouton ni lien visible ne croise son rectangle (« Mentions légales » compris)', sousPlus.length === 0 && sansPlus.length === 0, `sans « + » : ${sansPlus.join(' ') || 'aucune'} ; ${sousPlus.join(' | ')}`);
  await aller(page, '#/lieux', '#vue .tete h1');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${CAPT}/1-bas-lieux.png` });
  await aller(page, '#/representations', '#vue .deux .liste');
  await page.evaluate(() => { window.scrollTo(0, 0); annoncer('Date enregistrée.', { action: () => {}, delai: 60000 }); });
  await page.waitForTimeout(350);
  const annonce = await page.evaluate(() => {
    const p = document.querySelector('.ob-plus').getBoundingClientRect(), a = document.querySelector('#annonces .annonce')?.getBoundingClientRect();
    return a ? { annonceBas: Math.round(a.bottom), plusHaut: Math.round(p.top) } : null;
  });
  const sousAnnonce = await page.evaluate(CROISENT);
  ok('1 · c · une annonce (« Date enregistrée · Annuler ») se pose au-dessus du « + » : son bas est plus haut que le haut du « + », et rien ne le croise', !!annonce && annonce.annonceBas <= annonce.plusHaut && sousAnnonce.length === 0, JSON.stringify({ annonce, sousAnnonce }));
  await page.screenshot({ path: `${CAPT}/1-annonce.png` });
  await page.evaluate(() => document.querySelectorAll('#annonces .annonce').forEach(a => a.remove()));
  // une fiche n'a pas de « + » mais son pied : l'annonce se pose au-dessus du pied, pas dessus (« Plus » et « Enregistrer » restent à portée)
  for (const [hash, fiche] of [['#/representations/101', '#ed-date'], ['#/lieux/5', '#ed-lieu']]) {
    await aller(page, hash, `${fiche} .pied-ed`);
    await page.evaluate(() => { window.scrollTo(0, 0); annoncer('Date enregistrée.', { action: () => {}, delai: 60000 }); });
    await page.waitForTimeout(350);
    const m = await page.evaluate(() => {
      const a = document.querySelector('#annonces .annonce')?.getBoundingClientRect(), p = document.querySelector('.editeur .pied-ed').getBoundingClientRect();
      return a ? { annonceBas: Math.round(a.bottom), piedHaut: Math.round(p.top) } : null;
    });
    ok(`1 · c · ${hash} : une annonce se pose au-dessus du pied de la fiche (son bas est au plus au haut de .pied-ed), sans couvrir « Plus » ni « Enregistrer »`, !!m && m.annonceBas <= m.piedHaut, JSON.stringify(m));
    if (hash === '#/representations/101') await page.screenshot({ path: `${CAPT}/1-annonce-fiche.png` });
    await page.evaluate(() => document.querySelectorAll('#annonces .annonce').forEach(a => a.remove()));
  }

  // ---- (f) le pied tient sur une rangée, « Supprimer » est dans « Plus » ; les six fiches ont ce pied
  for (const [hash, suppr, rangee] of [['#/lieux/5', '#li-suppr', true], ['#/equipe/1', '#pe-suppr', true], ['#/ateliers/seances/1', '#se-suppr', false], ['#/ateliers/catalogue/1', '#a-suppr', false], ['#/diffusion/devis/1', '#dv-suppr', false], ['#/pro/1', '#pro-suppr', false]]) {
    const vu = await aller(page, hash, `.editeur .pied-ed ${suppr}`);
    await page.waitForTimeout(150);
    const m = await page.evaluate(s => {
      const pied = document.querySelector('.editeur .pied-ed'), b = document.querySelector(s), plus = pied.querySelector('.pied-plus'), etat = pied.querySelector('.etat-ed'), enr = pied.querySelector('[data-enregistrer]');
      const haut = e => { const b = e.getBoundingClientRect(); return Math.round(b.top + b.height / 2); };   // (le milieu : l'état est un texte plus bas que les boutons)
      return { aPlus: pied.classList.contains('a-plus'), replie: pied.classList.contains('replie'), dansPlus: !!b.closest('.pied-autres'), supprVisible: !!b.getClientRects().length, plusVisible: !!plus && !!plus.getClientRects().length,
        rangee: !!plus && Math.max(haut(etat), haut(plus), haut(enr)) - Math.min(haut(etat), haut(plus), haut(enr)) <= 6, hauteur: Math.round(pied.getBoundingClientRect().height) };
    }, suppr);
    ok(`1 · f · ${hash} : le pied est replié (« Plus » à côté d'« Enregistrer »), et « Supprimer » est dans « Plus » (caché tant qu'il est fermé)`, vu && m.aPlus && m.dansPlus && !m.supprVisible && (!rangee || (m.replie && m.plusVisible)), JSON.stringify(m));
    if (rangee) ok(`1 · f · ${hash} : le pied tient sur une rangée (état, « Plus », « Enregistrer » à la même hauteur, ${m.hauteur} px)`, m.rangee && m.hauteur <= 80, JSON.stringify(m));
    if (hash === '#/lieux/5') {
      await toucher(page, '.editeur .pied-plus');
      await page.waitForTimeout(250);
      const ouvert = await page.evaluate(s => { const b = document.querySelector(s), r = b.getBoundingClientRect(); return { visible: !!b.getClientRects().length, dansEcran: r.top >= 0 && r.bottom <= innerHeight }; }, suppr);
      ok('1 · f · #/lieux/5 : « Plus » ouvre le menu, « Supprimer » y est visible et dans l\'écran', ouvert.visible && ouvert.dansEcran, JSON.stringify(ouvert));
      await page.screenshot({ path: `${CAPT}/1-pied-plus-lieu.png` });
      await page.keyboard.press('Escape');
    }
  }

  // ---- (g) « Plus », puis Échap : le focus revient au bouton, Tab reste dans la feuille
  await aller(page, '#/representations', '#vue .deux .liste');
  await toucher(page, '[data-ob="plus"]');
  await attendre(page, () => document.querySelector('.ob-voile.la .ob-feuille'));
  await page.waitForTimeout(300);
  const glisse = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('.ob-feuille')); return { duree: s.transitionDuration, courbe: s.transitionTimingFunction, propriete: s.transitionProperty }; });
  ok('1 · g · la feuille glisse en 200 ms au « doux » (cubic-bezier(.2, .8, .2, 1)), comme le tiroir', glisse.duree === '0.2s' && glisse.courbe === 'cubic-bezier(0.2, 0.8, 0.2, 1)' && /transform/.test(glisse.propriete), JSON.stringify(glisse));
  const inertes = await page.evaluate(() => ({ nb: document.querySelectorAll('body > [inert]').length, annonces: !!document.getElementById('annonces')?.closest('[inert]'), barre: !!document.querySelector('.ob-barre')?.inert, voile: !!document.querySelector('.ob-voile')?.closest('[inert]') }));
  ok('1 · g · pendant que la feuille est ouverte, le reste de la page est inerte (la barre, #vue…), pas la feuille', inertes.nb >= 3 && inertes.barre && !inertes.voile, JSON.stringify(inertes));
  await page.evaluate(() => annoncer('Date enregistrée.', { action: () => {}, delai: 60000 }));
  await page.waitForTimeout(150);
  const annulable = await page.evaluate(() => { const b = document.querySelector('#annonces [data-tt="retour"]'); return !!b && !b.closest('[inert]') && !!b.getClientRects().length; });
  ok('1 · g · « Annuler » d\'une annonce reste joignable feuille ouverte (#annonces n\'est pas inerte)', annulable);
  const tabs = [];
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); tabs.push(await page.evaluate(() => !!document.activeElement?.closest('.ob-feuille'))); }
  for (let i = 0; i < 24; i++) { await page.keyboard.press(i % 2 ? 'Shift+Tab' : 'Tab'); tabs.push(await page.evaluate(() => !!document.activeElement?.closest('.ob-feuille'))); }
  ok('1 · g · six Tab (et vingt-quatre de plus, dans les deux sens) restent dans la feuille', tabs.every(Boolean), tabs.map(Number).join(''));
  await page.screenshot({ path: `${CAPT}/1-feuille-plus.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);
  const apres = await page.evaluate(() => ({ actif: document.activeElement?.matches('[data-ob="plus"]'), feuille: !!document.querySelector('.ob-voile'), inertes: document.querySelectorAll('[inert]').length }));
  ok('1 · g · « Plus », puis Échap : le focus est revenu à [data-ob="plus"], la feuille est partie, plus rien n\'est inerte', apres.actif && !apres.feuille && apres.inertes === 0, JSON.stringify(apres));
  await page.evaluate(() => document.querySelectorAll('#annonces .annonce').forEach(a => a.remove()));
  // « Créer » (le « + ») : même retour ; et un lien de la feuille mène ailleurs sans reprendre le focus
  await page.focus('.ob-plus');
  await toucher(page, '.ob-plus');
  await attendre(page, () => document.querySelector('.ob-voile.la .ob-feuille'));
  await page.waitForTimeout(250);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);
  ok('1 · g · « Créer », puis Échap : le focus est revenu au « + »', await page.evaluate(() => document.activeElement?.matches('.ob-plus')));
  // sur un iPhone (Safari), un bouton touché ne prend pas le focus : activeElement est body ; la feuille connaît quand même son bouton
  for (const [nom, sel] of [['Plus', '[data-ob="plus"]'], ['Créer', '.ob-plus']]) {
    const surBody = await page.evaluate(s => { document.activeElement?.blur(); const vide = document.activeElement === document.body; document.querySelector(s).click(); return vide; }, sel);   // (un clic sans focus, comme au toucher sur l'iPhone)
    await attendre(page, () => document.querySelector('.ob-voile.la .ob-feuille'));
    await page.waitForTimeout(250);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
    ok(`1 · g · sans focus au toucher (iPhone) : « ${nom} », puis Échap, rend quand même le focus à ${sel}`, surBody && await page.evaluate(s => document.activeElement?.matches(s), sel), JSON.stringify({ focusSurBodyAvantLeClic: surBody }));
  }
  await toucher(page, '.ob-plus');
  await attendre(page, () => document.querySelector('.ob-voile.la .ob-feuille'));
  await page.waitForTimeout(250);
  await toucher(page, '.ob-feuille a[href="#/lieux/nouveau"]');
  await attendre(page, () => location.hash === '#/lieux/nouveau' && document.querySelector('#ed-lieu .titre-ed'));
  await page.waitForTimeout(450);
  const mene = await page.evaluate(() => ({ feuille: !!document.querySelector('.ob-voile'), inertes: document.querySelectorAll('[inert]').length, surPlus: !!document.activeElement?.matches('.ob-plus, [data-ob="plus"]') }));
  ok('1 · g · un lien de « Créer » mène à la fiche : la feuille est fermée, rien n\'est inerte, le focus n\'est pas revenu au bouton', !mene.feuille && mene.inertes === 0 && !mene.surPlus, JSON.stringify(mene));
  fin('1', erreurs);
  await ctx.close();
}

// ---- (g, suite) sous « moins d'animations », la feuille ne glisse pas
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { ...TEL, hash: '#/accueil', reduit: true });
  await page.waitForSelector('.ob-barre', { timeout: 15000 });
  await page.waitForTimeout(300);
  await toucher(page, '[data-ob="plus"]');
  await attendre(page, () => document.querySelector('.ob-voile .ob-feuille'));
  const r = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('.ob-feuille')); return { duree: s.transitionDuration, anim: document.getAnimations().filter(a => !(a instanceof CSSTransition) || a.effect.getTiming().duration > 0).length, transform: s.transform }; });
  ok('1 · g · sous « moins d\'animations » : la feuille est déjà en place, sans transition', r.duree === '0s' && r.anim === 0 && /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/.test(r.transform), JSON.stringify(r));
  fin('1 · réduit', erreurs);
  await ctx.close();
}

// ---- (d) une date ouverte en tiroir depuis le tableau de bord : son pied est collé au bas du tiroir
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { ...TEL, hash: '#/accueil' });
  const ligne = '.tb-tuile[data-k="prochaines"] a.tb-l[href="#/representations/101"]';
  await page.waitForSelector(ligne, { timeout: 15000 });
  await page.waitForTimeout(500);
  await toucher(page, ligne);
  const arrive = await attendre(page, () => document.querySelector('.tiroir.la #ed-date .pied-ed'), null, 12000);
  await page.waitForTimeout(500);
  await page.evaluate(() => { document.querySelector('.tiroir-corps').scrollTop = 0; });
  await page.waitForTimeout(200);
  const m = await page.evaluate(() => { const t = document.querySelector('.tiroir').getBoundingClientRect(), p = document.querySelector('.tiroir .pied-ed').getBoundingClientRect(); return { tiroirBas: Math.round(t.bottom), piedBas: Math.round(p.bottom), piedHaut: Math.round(p.top), hauteurFenetre: innerHeight }; });
  ok('1 · d · une date ouverte en tiroir depuis #/accueil : le bas de .pied-ed est au bas du tiroir, à 2 px près', arrive && Math.abs(m.piedBas - m.tiroirBas) <= 2, JSON.stringify(m));
  await page.screenshot({ path: `${CAPT}/1-tiroir-pied.png` });
  fin('1 · tiroir', erreurs);
  await ctx.close();
}

// ---- (f, suite) une date ouverte en tiroir depuis la fiche d'une personne : deux pieds repliés à la fois, chacun a son menu « Plus »
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { ...TEL, hash: '#/equipe/1' });
  await page.waitForSelector('#ed-personne .pied-ed .pied-plus', { timeout: 15000 });
  await page.waitForTimeout(500);
  const lien = '#ed-personne a[href="#/representations/101"]';
  const trouve = !!(await page.$(lien));
  if (trouve) { await page.evaluate(l => document.querySelector(l).scrollIntoView({ block: 'center' }), lien); await toucher(page, lien); }
  const arrive = await attendre(page, () => document.querySelector('.tiroir.la #ed-date .pied-ed .pied-plus'), null, 12000);
  await page.waitForTimeout(500);
  const deux = await page.evaluate(() => ({ menus: document.querySelectorAll('.pied-autres').length, ids: new Set([...document.querySelectorAll('.pied-autres')].map(m => m.id)).size, commandes: new Set([...document.querySelectorAll('.pied-plus')].map(b => b.getAttribute('aria-controls'))).size, hash: location.hash }));
  ok('1 · f · #/equipe/1, une date ouverte en tiroir : la fiche et le tiroir ont chacun leur menu « Plus », avec chacun son identifiant', trouve && arrive && deux.menus === 2 && deux.ids === 2 && deux.commandes === 2, JSON.stringify(deux));
  await toucher(page, '.tiroir .pied-plus');
  await page.waitForTimeout(250);
  const m = await page.evaluate(() => {
    const ouvert = e => !!e && e.classList.contains('ouvert') && !!e.getClientRects().length;
    const t = document.querySelector('.tiroir #ed-date .pied-autres'), p = document.querySelector('#ed-personne .pied-autres');
    const dup = [...t.querySelectorAll('.btn')].find(b => /Dupliquer/.test(b.textContent)), r = dup?.getBoundingClientRect();
    return { tiroirOuvert: ouvert(t), personneOuvert: p.classList.contains('ouvert'), dupliquerVisible: !!r && r.width > 0 && r.top >= 0 && r.bottom <= innerHeight };
  });
  ok('1 · f · « Plus » du tiroir ouvre les actions de la date (« Dupliquer » visible dans l\'écran), pas le menu de la personne dessous', m.tiroirOuvert && !m.personneOuvert && m.dupliquerVisible, JSON.stringify(m));
  await page.screenshot({ path: `${CAPT}/1-pied-plus-tiroir.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const ferme = await page.evaluate(() => ({ ouverts: document.querySelectorAll('.pied-autres.ouvert').length, tiroir: !!document.querySelector('.tiroir.la') }));
  ok('1 · f · Échap referme le menu du tiroir (aucun menu ouvert)', ferme.ouverts === 0, JSON.stringify(ferme));
  fin('1 · tiroir sur une fiche', erreurs);
  await ctx.close();
}

// ---- (e) le planning, vue Équipe, un jour choisi : son détail s'arrête au-dessus des onglets
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { ...TEL, hash: '#/accueil' });
  await garnirPlanning(ctx);
  await page.waitForSelector('.ob-barre', { timeout: 15000 });
  await page.evaluate(() => { location.hash = '#/planning'; });
  const jour = `[data-pl-jour="${plus(3)}"]`;
  const vu = await attendre(page, s => document.querySelector(s), jour, 15000);
  await page.waitForTimeout(500);
  const equipe = await page.$('[data-pl-vue="equipe"]');
  if (equipe && (await equipe.getAttribute('aria-pressed')) === 'false') { await equipe.tap(); await page.waitForTimeout(400); }
  if (vu) { await (await page.$(jour)).tap(); await attendre(page, () => document.querySelector('.pl-detail.feuille'), null, 6000); await page.waitForTimeout(500); }
  const m = await page.evaluate(() => { const d = document.querySelector('.pl-detail.feuille'), b = document.querySelector('.ob-barre'); return d ? { detailBas: Math.round(d.getBoundingClientRect().bottom), barreHaut: Math.round(b.getBoundingClientRect().top), pos: getComputedStyle(d).position } : null; });
  ok('1 · e · #/planning, vue Équipe, un jour choisi (planning garni) : le bas de .pl-detail.feuille est au-dessus du haut de .ob-barre', vu && !!m && m.detailBas <= m.barreHaut, JSON.stringify(m));
  await page.screenshot({ path: `${CAPT}/1-planning-jour.png` });
  fin('1 · planning', erreurs);
  await ctx.close();
}

// ---- (h) à 1 440 × 900, rien n'a bougé : la tête, les pieds, pas de « + »
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/101' });
  await page.waitForSelector('#ed-date .titre-ed', { timeout: 15000 });
  await page.waitForTimeout(400);
  const grand = await page.evaluate(() => {
    const tete = document.querySelector('.tete'), h1 = tete.querySelector('h1'), vues = [...tete.children].filter(e => e !== h1);
    return { classe: document.documentElement.classList.contains('ob-actif'), plus: !!document.querySelector('.ob-plus, .ob-barre'), tete: Math.round(tete.getBoundingClientRect().height), h1: Math.round(h1.getBoundingClientRect().width),
      enfants: vues.length, enfantsVisibles: vues.filter(e => e.getClientRects().length).length, inertes: document.querySelectorAll('[inert]').length, scrollPad: getComputedStyle(document.documentElement).scrollPaddingBottom };
  });
  ok('1 · h · 1 440 × 900, #/representations/101 : la tête est visible (le h1, les vues, « Nouvelle date »), ni « + » ni barre, rien d\'inerte', !grand.classe && !grand.plus && grand.tete > 30 && grand.h1 > 50 && grand.enfants >= 2 && grand.enfants === grand.enfantsVisibles && grand.inertes === 0 && /^auto|^0px/.test(grand.scrollPad), JSON.stringify(grand));
  const piedDate = await page.evaluate(() => { const p = document.querySelector('#ed-date .pied-ed'); return { classe: p.className, bas: Math.round(p.getBoundingClientRect().bottom), fenetre: innerHeight, plus: !!p.querySelector('.pied-plus') && !!p.querySelector('.pied-plus').getClientRects().length }; });
  ok('1 · h · 1 440 × 900 : le pied de la date est collé au bas de la fenêtre (comme avant : ni barre, ni marge)', Math.abs(piedDate.bas - piedDate.fenetre) <= 2, JSON.stringify(piedDate));
  // le DOM des fiches n'a aucune trace du téléphone : un pied d'avant (sans « Plus »), un h1 qui n'est pas masqué
  for (const [hash, fiche, suppr] of [['#/lieux/5', '#ed-lieu', '#li-suppr'], ['#/equipe/1', '#ed-personne', '#pe-suppr'], ['#/ateliers/seances/1', '#ed-at', '#se-suppr'], ['#/ateliers/catalogue/1', '#ed-at', '#a-suppr'], ['#/diffusion/devis/1', '#ed-devis', '#dv-suppr'], ['#/pro/1', '#ed-pro', '#pro-suppr']]) {
    await aller(page, hash, `${suppr}`);
    const m = await page.evaluate(([f, s]) => { const p = document.querySelector(s).closest('.pied-ed'); return { pied: p.className, menu: !!p.querySelector('.pied-menu, .pied-plus, .pied-autres'), direct: document.querySelector(s).parentElement === p, tete: Math.round(document.querySelector('.tete').getBoundingClientRect().height) }; }, [fiche, suppr]);
    ok(`1 · h · 1 440 × 900, ${hash} : le pied est celui d'avant (« pied-ed » seul, « Supprimer » sur la rangée, sans menu « Plus »), la tête est là`, m.pied === 'pied-ed' && !m.menu && m.direct && m.tete > 30, JSON.stringify(m));
  }
  fin('1 · ordinateur', erreurs);
  await page.screenshot({ path: `${CAPT}/1-ordinateur.png` });
  await ctx.close();
}

// ---- (i) aucune tâche de plus de 200 ms à CPU=4 : l'ouverture de fiches, le passage d'une rubrique à l'autre, la feuille de « Plus »
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { ...TEL, hash: '#/accueil', cpu: 4, longues: true });
  await page.waitForSelector('.ob-barre', { timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { window.__pret = performance.now(); window.__longues = []; });
  for (const h of ['#/representations', '#/representations/101', '#/lieux/5', '#/equipe/1', '#/representations/tableur', '#/lieux']) { await page.evaluate(x => { location.hash = x; }, h); await page.waitForTimeout(1200); }
  await toucher(page, '[data-ob="plus"]'); await page.waitForTimeout(500); await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  const longues = await page.evaluate(() => window.__longues);
  ok('1 · i · à CPU=4, six vues et la feuille de « Plus » : aucune tâche de plus de 200 ms', longues.every(d => d <= 200), `tâches longues : ${longues.join(', ') || 'aucune'}`);
  fin('1 · CPU=4', erreurs);
  await ctx.close();
}

await navigateur.close();
bilan(CAPT);
