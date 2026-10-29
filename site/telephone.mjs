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
//       ceux d'avant (pas de « + », rien d'inerte : des mesures, pas une comparaison du DOM) ; (i) à CPU=4, aucune tâche de plus de 200 ms, et aucune
//       règle :has() posée sur la racine de la page (html, :root, body), hors impression.
// 2 · tout au doigt (admin/mobile.js : du CSS sous html.ob-actif) : (a) sur quatorze routes (la liste des dates dans ses trois vues, le
//   tableur, la carte, la fenêtre de la distribution d'une date y comprises), aucune commande sous 44 px de haut, aucun champ sous
//   16 px de texte ; la croix et « Annuler » d'une annonce, et « Installer », aussi ; (b) le lieu d'une date passe sur deux lignes au lieu d'être coupé par « … » ; (c) à 1 440 × 900 et à
//   800 × 1 000 au doigt, rien n'a bougé (segments à 36 px, champs à 38, planning à 40) ; (d) l'aide du clavier du tableur n'est plus
//   affichée, mais reste la cible d'aria-describedby.
// 3 · l'essentiel d'abord (admin/tableau.js, index.html : filtresDates, dessinerAvant ; admin/mobile.js ; admin/disponibilites.js) : (a) le tableau
//   de bord sans « Actions rapides », sans « Personnaliser » ni choix de la vue, « À traiter » avant 700 px et « Qui part bientôt » avant
//   2 000, l'ordre du DOM (« À traiter », « Qui part bientôt », « Prochaines dates » d'abord), la rotation qui redessine, rien d'écrit (le chevron et le rouage de « À traiter » compris) ;
//   (b) la première date avant 500 px, « À compléter » replié avec son compte, ouvert le temps de la session, rien d'écrit ; (c) la
//   recherche seule visible, le reste derrière « Filtres » (44 px, son compte, ouvert d'office quand un filtre est posé, la rotation qui le redessine), dans la liste, le
//   tableur et la carte ; (d) les « ＋ Nouveau… » du « + » ne s'affichent plus (ils restent dans la page), les autres restent ; (e) le
//   planning s'ouvre sur le mois ; (f) les trois chiffres de la diffusion sur une ligne ; (g) à 1 440 × 900, rien n'a bougé.
// 4 · la feuille de route lisible, la carte sur les dates (admin/equipe.js, admin/tournee.js) : (a) #/feuilles/101 s'ouvre en « Vue de
//   l'équipe » (du vrai texte, 16 px), sans les outils de mise en page, sans barre collée de plus de 80 px, avec 520 px et plus entre
//   l'en-tête et le pied, « À compléter » et « Publier pour l'équipe » là ; « Page A4 » (un toucher) fait paraître la page et ses
//   outils, non collés ; une saisie en A4 se retrouve dans la vue de l'équipe et au retour ; l'aide dit « touchez » ; (b) la carte
//   s'ouvre « Autour des dates » (les pastilles couvrent la moitié du cadre et plus), « Toute la France » l'éteint pour la session ;
//   (c) à 1 440 × 900, la feuille s'ouvre en page A4 avec sa barre collée, la carte sur la France ; rien n'est écrit dans le compte.
// 5 · une date et un lieu s'ouvrent sur la route (admin/menus.js : MENUS ; admin/mobile.js : MOBILE.route ; index.html : editeurDate, editeurLieu) :
//   (a) #/representations/101 : la rangée « sur la route » est sous le titre, dans le premier écran, avec Itinéraire (google.com/maps/dir),
//   Feuille de route (et son état) et Prévenir l'équipe…, chacun d'au moins 44 × 44 ; toucher « Prévenir » ouvre le panneau de #d-prevenir
//   (rangé dans « Plus » du pied replié) ; depuis l'onglet Dates, Dates, la date, Prévenir : 3 touchers, sans défilement ; une option y
//   ajoute « Confirmer la date… » en quatrième, qui vise le statut sans rien écrire ; une feuille publiée entre-temps se redit ; (b) #/lieux/5 :
//   « Appeler le contact » est un lien tel: avant 844 px, « Copier l'adresse » écrit dans le presse-papiers, un lieu sans contact montre
//   « Contact à renseigner » ; (c) l'appui long sur une date ou un lieu n'a plus « Ouvrir dans un nouvel onglet » ni « Copier le lien » ; (d) sous
//   « moins d'animations », rien ne bouge ; (e) à 1 440 × 900, aucune rangée, et le clic droit garde ces deux entrées.
// Les captures vont dans site/dist/shots-telephone/ (jamais commitées). Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, DB, ECRITURES, plus, ok, ouvrir, bilan } from './admin-fictif.mjs';

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
  // (ce qui est dans un <details> fermé n'est pas à l'écran, même si le navigateur lui garde un rectangle : « Filtres » replie la barre)
  const replie = e => { const d = e.parentElement?.closest('details:not([open])'); return !!d && !(e.tagName === 'SUMMARY' && e.parentElement === d); };
  const visible = e => { const s = getComputedStyle(e), b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && b.bottom > 0 && b.top < innerHeight && !replie(e); };
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
  // (au bout de la page, comme plus haut : depuis le lot 3 la liste commence à l'écran, et elle défile sous le « + » comme sous tout bouton flottant)
  await page.evaluate(() => { window.scrollTo(0, document.documentElement.scrollHeight); annoncer('Date enregistrée.', { action: () => {}, delai: 60000 }); });
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
  // un :has() posé sur la racine (html, :root, body) se réévalue à chaque changement de la page et en refait tous les styles :
  // les trois du lot 1 doublaient le coût des styles à l'ouverture d'une date (250 ms au lieu de 100, à CPU=4). L'impression,
  // qui ne se dessine qu'une fois, n'y est pas comptée.
  const racines = await page.evaluate(() => {
    const xs = [];
    const tete = sel => { let n = 0; for (let i = 0; i < sel.length; i++) { const c = sel[i]; if (c === '(') n++; else if (c === ')') n--; else if (n === 0 && /[\s>+~]/.test(c)) return sel.slice(0, i); } return sel; };
    const lire = (regles, imprime) => { for (const r of regles) {
      if (r.media) { lire(r.cssRules, imprime || /print/.test(r.media.mediaText)); continue; }
      if (r.cssRules && !r.selectorText) { lire(r.cssRules, imprime); continue; }
      if (!r.selectorText || imprime) continue;
      for (const sel of r.selectorText.split(',')) { const t = tete(sel.trim()); if (/^(html|:root|body)\b/.test(t) && t.includes(':has(')) xs.push(sel.trim()); }
    } };
    for (const f of document.styleSheets) { try { lire(f.cssRules, false); } catch { /* une feuille d'une autre origine */ } }
    return xs;
  });
  ok('1 · i · aucune règle (hors impression) ne pose :has() sur la racine de la page : elle referait tous les styles à chaque changement', racines.length === 0, racines.join(' / '));
  fin('1 · CPU=4', erreurs);
  await ctx.close();
}

// ================================================================================ 2 · tout au doigt (admin/mobile.js : du CSS sous html.ob-actif)
// Le critère des 44 px : tout bouton, résumé, liste déroulante, champ (hors les cases, dont la ligne entière est la cible), lien seul
// sur sa ligne, et toute ligne de case, fait 44 px de haut au moins ; une commande sans mot (une icône) en fait 44 de large aussi, sauf
// dans une rangée de six frères ou plus (les mois du tableau de bord, les jours du planning : la largeur y est celle de l'écran
// partagé). Un lien pris dans une phrase (inline, avec du texte autour) est exclu, comme la carte (les pastilles de tournee.js ne
// grossissent pas), le tableur (.tab-cadre : ses cellules) et ce qui est hors de l'écran (le lien d'évitement). Le texte des champs
// fait 16 px au moins (au-dessous, l'iPhone zoome sur le champ touché), hors .tab-cadre.
const MESURE_DOIGT = () => {
  const vis = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && r.bottom > 0 && r.right > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[hidden], [inert]'); };
  const dansPhrase = a => { if (getComputedStyle(a).display !== 'inline') return false;
    return [...a.parentElement.childNodes].some(n => n !== a && ((n.nodeType === 3 && n.textContent.trim()) || (n.nodeType === 1 && getComputedStyle(n).display === 'inline' && n.textContent.trim() && !n.matches('a, button')))); };
  const nom = e => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : ''} « ${(e.getAttribute('aria-label') || e.textContent || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 24)} »`;
  const trop = [];
  for (const e of document.querySelectorAll('button, summary, select, input, textarea, a[href], .case')) {
    if (e.closest('.tab-cadre, svg, .leaflet-container')) continue;
    const t = e.matches('input') ? e.type : '';
    if (t === 'hidden' || t === 'file') continue;
    if (e.matches('.case') && !e.querySelector('input')) continue;
    if (e.matches('a[href]') && dansPhrase(e)) continue;
    const c = t === 'checkbox' || t === 'radio' ? (e.closest('.case') || e.closest('label') || e) : e;
    if (!vis(c)) continue;
    const r = c.getBoundingClientRect(), sansMot = !(c.textContent || '').trim() && !c.matches('input, select, textarea');
    const rangee = c.parentElement && [...c.parentElement.children].filter(x => x.tagName === c.tagName).length >= 6;
    if (r.height < 43.5 || (sansMot && !rangee && r.width < 43.5)) trop.push(`${nom(c)} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  const petits = [...document.querySelectorAll('input, select, textarea, .riche')]
    .filter(e => !e.closest('.tab-cadre') && !['checkbox', 'radio', 'hidden', 'file', 'range', 'color'].includes(e.type) && vis(e) && parseFloat(getComputedStyle(e).fontSize) < 16)
    .map(e => `${nom(e)} ${getComputedStyle(e).fontSize}`);
  return { trop: [...new Set(trop)], petits: [...new Set(petits)] };
};
// (la fenêtre de la distribution d'une date : Jean ne part pas à Caen, Léa est en renfort régie au Havre, comme dans distribution.mjs)
const EQUIPES_2 = [{ date_id: 101, personne_id: 2, present: false, fonction: null, note: null }, { date_id: 103, personne_id: 3, present: true, fonction: 'régie', note: null }];
// ouvre la fenêtre de la distribution de la ligne n du tableur (Entrée sur la case) ; vrai quand elle est là
const ouvrirDistribution = async (page, n = 2) => {
  await page.click(`#tab-corps tr[data-l="${n}"] td.c-distribution`); await page.keyboard.press('Enter');
  return attendre(page, () => document.querySelectorAll('.tab-pop.distribution .dfn-ligne').length >= 2, null, 4000);
};
{
  DB.crescite_equipes.push(...EQUIPES_2);
  const { ctx, page, erreurs } = await ouvrir(navigateur, { ...TEL, hash: '#/accueil' });
  await garnirPlanning(ctx);
  await page.waitForSelector('.ob-barre', { timeout: 15000 });
  await page.waitForTimeout(400);
  const ouvrirTout = () => page.evaluate(() => document.querySelectorAll('#vue details').forEach(d => { d.open = true; }));
  const mesurer = async (nom, hash, attente, avant = null) => {
    const vu = await aller(page, hash, attente, 15000);
    if (avant) await avant();
    await ouvrirTout();
    await page.waitForTimeout(120);
    const m = await page.evaluate(MESURE_DOIGT);
    const n = await page.evaluate(() => document.querySelectorAll('#vue button, #vue summary, #vue select, #vue input, #vue a[href]').length);
    ok(`2 · a · ${nom} : ${n} commandes, aucune sous 44 px de haut (ni de large, sans mot)${m.trop.length ? ' : ' + m.trop.slice(0, 4).join(' ; ') : ''}`, vu && n > 0 && m.trop.length === 0, JSON.stringify(m.trop));
    ok(`2 · a · ${nom} : aucun champ sous 16 px de texte${m.petits.length ? ' : ' + m.petits.slice(0, 4).join(' ; ') : ''}`, vu && m.petits.length === 0, JSON.stringify(m.petits));
    return vu;
  };
  await mesurer('#/accueil', '#/accueil', '.tb-tuile');
  await mesurer('#/representations (la liste, « Plus de filtres » ouvert)', '#/representations', '#l-dates .ligne');
  await page.screenshot({ path: `${CAPT}/2-dates-filtres.png` });
  // les deux autres vues de la liste (« Passées », « Toutes ») : le plan les veut mesurées aussi ; on remet « À venir » après
  for (const [k, nom] of [['passees', 'Passées'], ['toutes', 'Toutes']]) {
    await mesurer(`#/representations (la liste, vue « ${nom} », « Plus de filtres » ouvert)`, '#/representations', '#l-dates .ligne', async () => {
      await toucher(page, `[data-f-periode="${k}"]`);
      await attendre(page, p => document.querySelector(`[data-f-periode="${p}"]`)?.getAttribute('aria-pressed') === 'true', k, 4000);
      await page.waitForTimeout(250);
    });
  }
  await toucher(page, '[data-f-periode="avenir"]');
  await page.waitForTimeout(250);
  await mesurer('#/representations/carte', '#/representations/carte', '.filtres-dates');
  await mesurer('#/representations/tableur', '#/representations/tableur', '#tab-corps tr[data-l]');
  await mesurer('#/representations/tableur (la fenêtre de la distribution : Fonction et Note)', '#/representations/tableur', '#tab-corps tr[data-l]', async () => {
    const la = await ouvrirDistribution(page);
    ok('2 · a · la fenêtre de la distribution d’une date s’ouvre au toucher, avec ses lignes (Fonction, Note, cases)', la && (await page.$$('.tab-pop.distribution .eq-fonction, .tab-pop.distribution [data-eqd-fonction]')).length >= 2);
    await page.screenshot({ path: `${CAPT}/2-distribution.png` });
  });
  await page.keyboard.press('Escape');
  await mesurer('#/representations/101', '#/representations/101', '#ed-date .titre-ed h2');
  await page.screenshot({ path: `${CAPT}/2-fiche-date.png` });
  await mesurer('#/planning (Équipe, « Filtres » ouvert)', '#/planning', '[data-pl-jour]', async () => {
    if ((await page.getAttribute('[data-pl-vue="equipe"]', 'aria-pressed')) === 'false') { await toucher(page, '[data-pl-vue="equipe"]'); await page.waitForTimeout(300); }
    if ((await page.getAttribute('[data-pl="filtres"]', 'aria-expanded')) === 'false') { await toucher(page, '[data-pl="filtres"]'); await page.waitForTimeout(300); }
  });
  await page.screenshot({ path: `${CAPT}/2-planning-equipe.png` });
  await mesurer('#/planning (Mois)', '#/planning', '[data-pl-jour]', async () => { await toucher(page, '[data-pl-vue="mois"]'); await attendre(page, () => document.querySelector('.pl-mois-grille'), null, 6000); await page.waitForTimeout(300); });
  await mesurer('#/equipe/1', '#/equipe/1', '#ed-personne .titre-ed h2');
  await mesurer('#/lieux/5', '#/lieux/5', '#ed-lieu .titre-ed h2');
  await mesurer('#/feuilles', '#/feuilles', '#fr-q');
  await mesurer('#/feuilles/101', '#/feuilles/101', '#vue .pied-ed, #vue h2');
  await mesurer('#/diffusion', '#/diffusion', '#vue h1');
  await mesurer('#/journal', '#/journal', '#j-q');

  // une annonce (la croix) et la feuille de « Plus » (« Installer ») : des commandes qui n'existent qu'un instant
  await page.evaluate(() => { annoncer('Essai de l’annonce', { action: () => {}, libelle: 'Annuler', delai: 60000 }); });
  await page.waitForSelector('.annonce .annonce-fermer', { timeout: 4000 });
  const an = await page.evaluate(() => { const b = document.querySelector('.annonce .annonce-fermer').getBoundingClientRect(), a = document.querySelector('.annonce').getBoundingClientRect(), r = document.querySelector('.annonce [data-tt="retour"]')?.getBoundingClientRect();
    return { l: Math.round(b.width), h: Math.round(b.height), annonceH: Math.round(a.height), dedans: b.right <= a.right + 14 && b.left >= a.left, annulerH: r ? Math.round(r.height) : 0, annulerL: r ? Math.round(r.width) : 0 }; });
  ok('2 · a · la croix d’une annonce fait 44 × 44 px, et l’annonce ne grandit pas pour autant (moins de 80 px de haut)', an.l === 44 && an.h === 44 && an.annonceH < 80 && an.dedans, JSON.stringify(an));
  ok('2 · a · « Annuler » d’une annonce fait 44 px de haut au moins (c’est lui qu’on vise du pouce après une écriture)', an.annulerH >= 44, JSON.stringify(an));
  // et la mesure générale, annonce à l’écran : aucune commande de l’annonce (ni la croix, ni « Annuler ») sous 44 px
  const mAn = await page.evaluate(MESURE_DOIGT);
  ok('2 · a · la mesure générale, une annonce à l’écran : ni « Annuler » ni la croix sous 44 px', !mAn.trop.some(t => /annonce|retour|Annuler|Fermer/.test(t)), JSON.stringify(mAn.trop));
  await page.screenshot({ path: `${CAPT}/2-annonce.png` });
  await page.evaluate(() => document.querySelectorAll('.annonce').forEach(a => a.remove()));
  await toucher(page, '.ob-barre [data-ob="plus"]');
  await page.waitForSelector('.ob-voile.la .ob-tete-btn', { timeout: 4000 });
  const inst = await page.evaluate(() => { const b = document.querySelector('.ob-tete-btn').getBoundingClientRect(); return { texte: document.querySelector('.ob-tete-btn').textContent.trim(), h: Math.round(b.height), l: Math.round(b.width) }; });
  ok('2 · a · « Installer » (dans « Plus ») fait 44 px de haut', inst.h >= 44 && /Installer/.test(inst.texte), JSON.stringify(inst));
  await page.keyboard.press('Escape');

  // ---- (b) le lieu d'une date passe sur deux lignes au lieu d'être coupé par « … »
  await aller(page, '#/representations', '#l-dates .ligne');
  const ou = await page.evaluate(() => {
    const e = [...document.querySelectorAll('#l-dates .ligne .ou')].find(x => /Théâtre de Caen — Caen \(14\)/.test(x.textContent));
    if (!e) return null;
    const s = getComputedStyle(e);
    return { texte: e.textContent.trim(), coupeH: e.scrollWidth > e.clientWidth + 1, coupeV: e.scrollHeight > e.clientHeight + 1, ellipse: s.textOverflow === 'ellipsis' && s.whiteSpace === 'nowrap', blanc: s.whiteSpace, clamp: s.webkitLineClamp };
  });
  ok('2 · b · 390 px : « Théâtre de Caen — Caen (14) » (le lieu d’une date) n’est coupé ni en largeur ni en hauteur, ni mis en « … »', !!ou && !ou.coupeH && !ou.coupeV && !ou.ellipse && ou.blanc === 'normal' && ou.clamp === '2', JSON.stringify(ou));
  // un lieu très long : deux lignes au plus, la suite coupée (la liste ne s'étire pas)
  const long = await page.evaluate(() => { const e = document.querySelector('#l-dates .ligne .ou'); const avant = e.textContent; e.textContent = 'Centre culturel intercommunal des Trois Rivières et de la Vallée — Saint-Martin-de-la-Brasque-en-Auge (14)'; const h = e.getBoundingClientRect().height, lh = parseFloat(getComputedStyle(e).lineHeight) || 18; const r = { lignes: Math.round(h / lh), coupe: e.scrollHeight > e.clientHeight + 1 }; e.textContent = avant; return r; });
  ok('2 · b · un lieu très long tient sur deux lignes au plus, la suite coupée', long.lignes <= 2 && long.coupe, JSON.stringify(long));
  await page.screenshot({ path: `${CAPT}/2-ligne-lieu.png` });

  // ---- (d) l'aide du clavier sous le tableur disparaît, et reste la cible d'aria-describedby
  await aller(page, '#/representations/tableur', '#tab-corps tr[data-l]');
  const aide = await page.evaluate(() => { const a = document.querySelector('#tab-aide'); const d = [...document.querySelectorAll('[aria-describedby]')].filter(x => x.getAttribute('aria-describedby').split(/\s+/).includes('tab-aide')); return a ? { affiche: a.getClientRects().length > 0, texte: a.textContent.trim().length > 10, cibles: d.length } : null; });
  ok('2 · d · l’aide du clavier sous le tableur n’est plus affichée, mais son texte est là et reste lu par aria-describedby', !!aide && !aide.affiche && aide.texte && aide.cibles >= 1, JSON.stringify(aide));
  fin('2 · téléphone', erreurs);
  await ctx.close();
}

// ---- (c) à 1 440 × 900, et à 800 × 1 000 au doigt, rien n'a bougé : les segments à 36 px, les champs à 38, les boutons du planning à 40
for (const [largeur, hauteur, etiquette] of [[1440, 900, '1 440 × 900'], [800, 1000, '800 × 1 000 au doigt']]) {
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur, hauteur, tactile: largeur === 800, hash: '#/representations' });
  await garnirPlanning(ctx);
  await page.waitForSelector('.filtres-dates', { timeout: 15000 });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelectorAll('.f-plus').forEach(d => { d.open = true; }));
  await page.waitForTimeout(100);
  const m = await page.evaluate(() => {
    const css = sel => { const e = document.querySelector(sel); if (!e) return null; const s = getComputedStyle(e); return { min: s.minHeight, taille: s.fontSize, h: Math.round(e.getBoundingClientRect().height) }; };
    return { actif: document.documentElement.classList.contains('ob-actif'), champ: getComputedStyle(document.documentElement).getPropertyValue('--h-champ').trim(), seg: css('.filtres-dates .seg button'), q: css('#f-q'), saison: css('#f-saison'), du: css('#f-du'), plus: css('.f-plus > summary'),
      ou: (() => { const e = document.querySelector('#l-dates .ligne .ou'); return e && { blanc: getComputedStyle(e).whiteSpace }; })() };
  });
  ok(`2 · c · ${etiquette}, #/representations : ni html.ob-actif, ni --h-champ changé (38 px) ; les segments à 36 px, les champs à 38 px de plancher (la liste déroulante à 44 px au doigt, comme avant) et 15 px de texte, du … au à 34 px, le lieu d’une date sur une ligne`,
    !m.actif && m.champ === '38px' && m.seg.min === '36px' && m.q.min === '38px' && m.q.taille === '15px' && m.saison.min === (largeur === 800 ? '44px' : '38px') && m.saison.taille === '15px' && m.du.min === '34px' && !!m.ou && m.ou.blanc === 'nowrap', JSON.stringify(m));
  const fiche = await aller(page, '#/representations/101', '#ed-date .titre-ed h2');
  await page.evaluate(() => document.querySelectorAll('#vue details').forEach(d => { d.open = true; }));
  const css = `(sel) => { const e = document.querySelector(sel); if (!e) return null; const s = getComputedStyle(e); return { min: s.minHeight, taille: s.fontSize }; }`;
  const f = await page.evaluate(`(${css})('.pc-e')`), fc = await page.evaluate(`(${css})('#ed-date .case')`);
  ok(`2 · c · ${etiquette}, une date : les étapes (.pc-e) et les cases gardent leurs planchers d’avant (pas de 44 px)`,
    fiche && !!f && !(parseFloat(f.min) >= 44) && !!fc && !(parseFloat(fc.min) >= 44), JSON.stringify([f, fc]));
  await aller(page, '#/representations/tableur', '#tab-corps tr[data-l]');
  const la = await ouvrirDistribution(page);
  const d = await page.evaluate(`(${css})('.tab-pop.distribution .dfn-ligne .eq-fonction')`), dn = await page.evaluate(`(${css})('.tab-pop.distribution .dfn-ligne .eq-note')`), dc = await page.evaluate(`(${css})('.tab-pop.distribution .case')`);
  ok(`2 · c · ${etiquette}, la fenêtre de la distribution : Fonction et Note gardent leurs 32 px et leurs 13 px de texte, les cases leur hauteur d’avant`,
    la && !!d && d.min === '32px' && d.taille === '13px' && !!dn && dn.min === '32px' && dn.taille === '13px' && !!dc && !(parseFloat(dc.min) >= 44), JSON.stringify([d, dn, dc]));
  await page.keyboard.press('Escape');
  const pl = await aller(page, '#/planning', '[data-pl-jour]', 15000);
  await page.waitForTimeout(300);
  const b = await page.evaluate(() => { const hs = sel => [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length).map(e => parseFloat(getComputedStyle(e).minHeight));
    return { pl_btn: hs('.pl-btn'), vues: hs('.pl-vues button'), rond: [...document.querySelectorAll('.pl-btn.rond')].filter(e => e.getClientRects().length).map(e => Math.round(e.getBoundingClientRect().width)) }; });
  ok(`2 · c · ${etiquette}, #/planning : les boutons du planning à 40 px de plancher (Équipe / Mois à 34 px), les boutons ronds à 40 px de large`,
    pl && b.pl_btn.length > 0 && b.pl_btn.every(x => x === 40 || x === 38) && b.vues.length === 2 && b.vues.every(x => x === 34) && b.rond.every(x => x === 40), JSON.stringify(b));
  if (largeur === 1440) {
    await aller(page, '#/representations/tableur', '#tab-corps tr[data-l]');
    const aide = await page.evaluate(() => { const a = document.querySelector('#tab-aide'); return a && a.getClientRects().length > 0; });
    ok('2 · c · 1 440 × 900, le tableur : l’aide du clavier est toujours là', aide === true);
  }
  await page.screenshot({ path: `${CAPT}/2-${largeur}.png` });
  fin(`2 · ${etiquette}`, erreurs);
  await ctx.close();
}
DB.crescite_equipes = DB.crescite_equipes.filter(x => !EQUIPES_2.some(y => y.date_id === x.date_id && y.personne_id === x.personne_id));

// ================================================================================ 3 · l'essentiel d'abord : tableau de bord, Dates, planning, diffusion
{
  DB.crescite_preferences = [];
  const depuis = ECRITURES.length;
  const ecrites = () => ECRITURES.slice(depuis).map(r => r.cle);
  const haut = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; })()`;
  // le visible vrai : ce que le navigateur dessine (un <details> fermé garde un rectangle à ce qu'il cache)
  const affiche = sel => page => page.evaluate(s => { const e = document.querySelector(s); return !!e && e.checkVisibility() && getComputedStyle(e).display !== 'none'; }, sel);
  const { ctx, page, erreurs } = await ouvrir(navigateur, { ...TEL, hash: '#/accueil' });
  await garnirPlanning(ctx);
  await page.waitForSelector('.ob-barre', { timeout: 15000 });
  await attendre(page, () => document.querySelector('.tb-tuile[data-k="urgent"] a.tb-l'), null, 15000);
  await page.waitForTimeout(400);

  // ---- (a) le tableau de bord : « À traiter » tout de suite, puis « Qui part bientôt », « Prochaines dates »
  const ordreTel = await page.evaluate(() => [...document.querySelectorAll('#tb-grille > .tb-tuile')].map(t => t.dataset.k));
  const a = await page.evaluate(`({ actions: !!document.querySelector('.tb-tuile[data-k="actions"]'), personnaliser: !!document.querySelector('#tb-personnaliser'), vue: !!document.querySelector('#tb-vue'), briefing: document.querySelector('#tb-briefing')?.getBoundingClientRect().height ?? 0,
    traiter: ${haut('.tb-tuile[data-k="urgent"] a.tb-l')}, equipe: ${haut('.tb-tuile[data-k="equipe"]')}, prochaines: ${haut('.tb-tuile[data-k="prochaines"]')} })`);
  ok('3 · a · #/accueil : ni « Actions rapides », ni « Personnaliser », ni le choix de la vue ; « Briefing » reste, d’au moins 44 px', !a.actions && !a.personnaliser && !a.vue && a.briefing >= 44, JSON.stringify(a));
  ok(`3 · a · #/accueil : la première ligne d’« À traiter » commence avant 700 px (${a.traiter}), la tuile « Qui part bientôt » avant 2 000 px (${a.equipe})`, a.traiter !== null && a.traiter < 700 && a.equipe !== null && a.equipe < 2000, JSON.stringify(a));
  ok('3 · a · #/accueil : l’ordre du DOM commence par « À traiter », « Qui part bientôt », « Prochaines dates »', ordreTel.slice(0, 3).join() === 'urgent,equipe,prochaines' && !ordreTel.includes('actions'), ordreTel.join());
  ok('3 · a · #/accueil : rien n’est écrit dans les préférences du compte (ni accueil.tableau, ni autre)', ecrites().length === 0, ecrites().join());
  await page.screenshot({ path: `${CAPT}/3-accueil.png` });
  // les commandes de la tuile « À traiter » (le chevron « Réduire », le rouage « Réglages ») changent la disposition sans rien écrire dans le compte
  const replier = await toucher(page, '.tb-tuile[data-k="urgent"] [data-tb-replier]') && await attendre(page, () => document.querySelector('.tb-tuile[data-k="urgent"] [data-tb-replier]')?.getAttribute('aria-expanded') === 'false', null, 3000);
  const rouage = await toucher(page, '.tb-tuile[data-k="urgent"] [data-tb-reglages]') && await attendre(page, () => document.querySelector('.tb-tuile[data-k="urgent"] [data-tb-reglages]')?.getAttribute('aria-expanded') === 'true', null, 3000);
  await page.waitForTimeout(1000);      // (PREFS écrit 700 ms après le dernier geste : on attend plus que cela)
  ok('3 · a · le chevron « Réduire » et le rouage « Réglages » de « À traiter » marchent au téléphone, et rien n’est écrit dans le compte (accueil.tableau)', replier && rouage && ecrites().length === 0, JSON.stringify({ replier, rouage, ecrites: ecrites() }));
  await toucher(page, '.tb-tuile[data-k="urgent"] [data-tb-reglages]');
  await toucher(page, '.tb-tuile[data-k="urgent"] [data-tb-replier]');
  await attendre(page, () => document.querySelector('.tb-tuile[data-k="urgent"] [data-tb-replier]')?.getAttribute('aria-expanded') === 'true', null, 3000);
  // la rotation : en paysage (plus de 640 px) les actions et « Personnaliser » reviennent aussitôt, sans navigation ; en portrait ils repartent
  await page.setViewportSize({ width: 844, height: 390 });
  const paysage = await attendre(page, () => document.querySelector('.tb-tuile[data-k="actions"]') && document.querySelector('#tb-personnaliser') && document.querySelector('#tb-vue'), null, 4000);
  const ordrePaysage = await page.evaluate(() => [...document.querySelectorAll('#tb-grille > .tb-tuile')].map(t => t.dataset.k));
  ok('3 · a · la rotation en paysage (844 px) redessine le tableau de bord sur place : les actions, « Personnaliser » et le choix de la vue reviennent, dans l’ordre du compte', paysage && ordrePaysage[0] === 'actions', ordrePaysage.join());
  await page.setViewportSize({ width: 390, height: 844 });
  const portrait = await attendre(page, () => !document.querySelector('.tb-tuile[data-k="actions"]') && !document.querySelector('#tb-personnaliser') && document.querySelector('.tb-tuile[data-k="urgent"] a.tb-l'), null, 4000);
  ok('3 · a · et le retour en portrait les ôte aussitôt', portrait && ecrites().length === 0, ecrites().join());

  // ---- (b) l'onglet Dates : une date dès le premier écran, « À compléter » replié avec son compte
  await aller(page, '#/representations', '#l-dates a.ligne');
  await page.waitForTimeout(300);
  const b = await page.evaluate(`({ ligne: ${haut('#l-dates a.ligne')}, ferme: document.querySelector('details.avant')?.open === false, badge: document.querySelector('details.avant > summary .badge')?.textContent.trim() || '', corps: !!document.querySelector('details.avant .avant-corps') })`);
  ok(`3 · b · #/representations : la première date commence avant 500 px (${b.ligne})`, b.ligne !== null && b.ligne < 500, JSON.stringify(b));
  ok(`3 · b · « À compléter avant la tournée » est replié d’office, son compte (${b.badge}) reste dans le titre`, b.ferme && /^\d+$/.test(b.badge) && +b.badge > 0, JSON.stringify(b));
  await page.screenshot({ path: `${CAPT}/3-dates.png` });
  ok('3 · b · un toucher sur « À compléter » l’ouvre, sans rien écrire dans le compte', await toucher(page, 'details.avant > summary') && await attendre(page, () => document.querySelector('details.avant')?.open === true, null, 3000) && !ecrites().includes('representations.avant'), ecrites().join());
  // une écriture dans la base (une adresse et un contact qui arrivent) redessine le bloc : il reste ouvert, et son compte baisse
  const avant = await page.evaluate(() => +document.querySelector('details.avant > summary .badge').textContent);
  await page.evaluate(() => { const id = +document.querySelector('details.avant a[href^="#/lieux/"]').getAttribute('href').split('/')[2]; E.lieux.find(l => l.id === id).adresse = '135 boulevard du Maréchal-Leclerc'; E.lieuxSuivi.push({ lieu_id: id, contact: 'Régie générale, 02 31 00 00 00' }); dessinerAvant(document.querySelector('#avant')); });
  await page.waitForTimeout(150);
  const apres = await page.evaluate(() => ({ ouvert: document.querySelector('details.avant')?.open, n: +(document.querySelector('details.avant > summary .badge')?.textContent || 0) }));
  ok(`3 · b · après une écriture dans la base, « À compléter » reste ouvert (le compte passe de ${avant} à ${apres.n}), et rien n’est écrit dans le compte`, apres.ouvert === true && apres.n < avant && !ecrites().includes('representations.avant'), JSON.stringify({ avant, apres, ecrites: ecrites() }));
  await page.selectOption('#avant-jours', '30');
  await page.waitForTimeout(150);
  ok('3 · b · le choix des 30 jours vit la session : il tient après le redessin, et rien n’est écrit', (await page.$eval('#avant-jours', e => e.value)) === '30' && (await page.$eval('details.avant', e => e.open)) && !ecrites().includes('representations.avant'), ecrites().join());
  await aller(page, '#/lieux', '#vue .tete h1');
  await aller(page, '#/representations', '#l-dates a.ligne');
  ok('3 · b · de retour sur Dates (dans la même session), le bloc est encore ouvert, à 30 jours', (await page.$eval('details.avant', e => e.open)) && (await page.$eval('#avant-jours', e => e.value)) === '30' && !ecrites().includes('representations.avant'), ecrites().join());
  await page.evaluate(() => { document.querySelector('details.avant').open = false; });
  await page.waitForTimeout(100);
  ok('3 · b · le refermer ne s’écrit pas non plus, et la préférence de l’ordinateur n’a pas bougé (aucune ligne representations.avant ni representations.vue)', !ecrites().some(c => /^representations\./.test(c)), ecrites().join());

  // ---- (c) les filtres : la recherche seule, le reste derrière « Filtres » qui dit combien sont posés
  const c0 = await page.evaluate(() => { const s = document.querySelector('.f-tel > summary'), q = document.querySelector('#f-q'); return { tel: !!s, ouvert: document.querySelector('.f-tel')?.open, texte: s?.textContent.trim(), h: Math.round(s?.getBoundingClientRect().height || 0), q: q?.checkVisibility(), seg: document.querySelector('.filtres-dates > .seg') !== null }; });
  const cache = [];
  for (const sel of ['[data-f-periode="avenir"]', '#f-saison', '#f-statut', '#f-public', '.puces .puce', '.f-plus > summary', '#f-saut']) if (await affiche(sel)(page)) cache.push(sel);
  ok('3 · c · #/representations sans filtre : la recherche est seule visible, « Filtres » est fermé et ne dit aucun nombre', c0.tel && c0.ouvert === false && c0.q === true && c0.texte === 'Filtres' && !c0.seg && cache.length === 0, JSON.stringify({ c0, visibles: cache }));
  ok('3 · c · « Filtres » fait 44 px de haut au moins', c0.h >= 44, JSON.stringify(c0));
  await toucher(page, '.f-tel > summary');
  await attendre(page, () => document.querySelector('.f-tel')?.open === true, null, 3000);
  const dehors = [];
  for (const sel of ['[data-f-periode="avenir"]', '#f-saison', '#f-statut', '#f-public', '.puces .puce', '.f-plus > summary', '#f-saut']) if (!(await affiche(sel)(page))) dehors.push(sel);
  ok('3 · c · un toucher sur « Filtres » montre la période, les listes, les puces, « Plus de filtres » et « Aller à une saison »', dehors.length === 0, dehors.join(' '));
  await page.selectOption('#f-statut', 'option');
  await page.waitForTimeout(250);
  const c1 = await page.evaluate(() => ({ texte: document.querySelector('.f-tel > summary').textContent.trim(), ouvert: document.querySelector('.f-tel').open }));
  ok('3 · c · poser un filtre met son compte sur « Filtres » sans le refermer', /^Filtres\s*1$/.test(c1.texte) && c1.ouvert, JSON.stringify(c1));
  await page.selectOption('#f-statut', '');
  await page.waitForTimeout(150);
  ok('3 · c · le relâcher le retire', (await page.$eval('.f-tel > summary', e => e.textContent.trim())) === 'Filtres');
  fin('3 · tableau de bord et Dates', erreurs);
  await ctx.close();

  const f1 = await ouvrir(navigateur, { ...TEL, hash: '?statut=option#/representations' });
  await f1.page.waitForSelector('.f-tel', { timeout: 15000 });
  await f1.page.waitForTimeout(300);
  const c2 = await f1.page.evaluate(() => ({ ouvert: document.querySelector('.f-tel')?.open, texte: document.querySelector('.f-tel > summary')?.textContent.trim(), h: Math.round(document.querySelector('.f-tel > summary').getBoundingClientRect().height), statut: document.querySelector('#f-statut')?.value, visible: document.querySelector('#f-statut')?.checkVisibility() }));
  ok('3 · c · ?statut=option : « Filtres » est ouvert d’office et dit 1 (un filtre posé n’est jamais caché derrière un bouton)', c2.ouvert === true && /^Filtres\s*1$/.test(c2.texte) && c2.statut === 'option' && c2.visible === true && c2.h >= 44, JSON.stringify(c2));
  await f1.page.screenshot({ path: `${CAPT}/3-filtres.png` });
  // la rotation redessine aussi la page des dates : en paysage (plus de 640 px) la barre est dépliée, sans « Filtres », le filtre posé reste ; en portrait « Filtres 1 » revient, ouvert
  await f1.page.setViewportSize({ width: 844, height: 390 });
  const dPaysage = await attendre(f1.page, () => !document.querySelector('.f-tel') && document.querySelector('#f-statut')?.checkVisibility(), null, 4000);
  const sPaysage = await f1.page.$eval('#f-statut', e => e.value).catch(() => null);
  ok('3 · c · la rotation en paysage (844 px) redessine la page des dates : la barre est dépliée, sans « Filtres », et le filtre posé (option) reste', dPaysage && sPaysage === 'option', JSON.stringify({ dPaysage, sPaysage }));
  await f1.page.setViewportSize({ width: 390, height: 844 });
  const dPortrait = await attendre(f1.page, () => document.querySelector('.f-tel')?.open === true && /^Filtres\s*1$/.test(document.querySelector('.f-tel > summary')?.textContent.trim()), null, 4000);
  ok('3 · c · et le retour en portrait remet « Filtres 1 », ouvert, avec le filtre posé', dPortrait && (await f1.page.$eval('#f-statut', e => e.value)) === 'option');
  // le tableur et la carte ont la même barre
  for (const [hash, attente] of [['#/representations/tableur', '#tab-corps tr[data-l]'], ['#/representations/carte', '.filtres-dates']]) {
    const vu = await aller(f1.page, hash, attente, 15000);
    const m = await f1.page.evaluate(() => ({ q: document.querySelector('#f-q')?.checkVisibility(), tel: !!document.querySelector('.f-tel'), ouvert: document.querySelector('.f-tel')?.open, texte: document.querySelector('.f-tel > summary')?.textContent.trim() }));
    ok(`3 · c · ${hash} : la même barre (recherche visible, « Filtres 1 » ouvert)`, vu && m.q && m.tel && m.ouvert && /^Filtres\s*1$/.test(m.texte), JSON.stringify(m));
  }
  fin('3 · filtres', f1.erreurs);
  await f1.ctx.close();

  // ---- les « ＋ Nouveau… » que le « + » propose déjà disparaissent (ils restent dans la page), les autres restent
  const g = await ouvrir(navigateur, { ...TEL, hash: '#/representations' });
  await garnirPlanning(g.ctx);
  await g.page.waitForSelector('.ob-barre', { timeout: 15000 });
  const CREER = [['#/representations', 'a[href="#/representations/nouvelle"]', '＋ Nouvelle date'], ['#/equipe', 'a[href="#/equipe/nouvelle"]', '＋ Nouvelle fiche'], ['#/lieux', 'a[href="#/lieux/nouveau"]', '＋ Nouveau lieu'],
    ['#/ateliers/seances', 'a[href$="/seances/nouvelle"]', '＋ Nouvelle séance'], ['#/planning', 'a[href="#/planning/proposer"]', 'Proposer des dates'], ['#/diffusion', '#b-nouveau-prospect', '＋ Nouvelle opportunité']];
  const GARDES = [['#/spectacles', '#b-nouveau-sp', '＋ Nouveau spectacle'], ['#/pro', 'a[href="#/pro/nouvelle"]', '＋ Nouvelle invitation']];
  const etat = async sel => g.page.evaluate(s => { const e = document.querySelector(`#vue .tete ${s}`) || document.querySelector(s); return e ? { dom: true, affiche: getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0 } : { dom: false, affiche: false }; }, sel);
  const caches = [], perdus = [];
  for (const [hash, sel, nom] of CREER) {
    await aller(g.page, hash, '#vue .tete h1, #vue h1', 15000);
    await g.page.waitForTimeout(200);
    const e = await etat(sel);
    if (!e.dom) perdus.push(nom); else if (e.affiche) caches.push(nom);
  }
  const sel0 = await aller(g.page, '#/representations', '#l-dates a.ligne');
  const sb = await g.page.evaluate(() => { const e = document.querySelector('.sel-bouton'); return e ? { dom: true, affiche: getComputedStyle(e).display !== 'none' } : { dom: false }; });
  ok(`3 · d · au téléphone : « ＋ Nouvelle date / fiche / lieu / séance », « Proposer des dates » et « ＋ Nouvelle opportunité » restent dans la page mais ne s’affichent pas${caches.length ? ' (encore là : ' + caches.join(', ') + ')' : ''}${perdus.length ? ' (absents du DOM : ' + perdus.join(', ') + ')' : ''}`, caches.length === 0 && perdus.length === 0, JSON.stringify({ caches, perdus }));
  ok('3 · d · « Sélectionner » est dans la page de la liste, et ne s’affiche pas', sel0 && sb.dom && !sb.affiche, JSON.stringify(sb));
  const restent = [];
  for (const [hash, sel, nom] of GARDES) {
    await aller(g.page, hash, '#vue .tete h1, #vue h1', 15000);
    await g.page.waitForTimeout(200);
    const e = await etat(sel);
    if (!e.affiche) restent.push(nom);
  }
  ok(`3 · d · « ＋ Nouveau spectacle » et « ＋ Nouvelle invitation » restent affichés${restent.length ? ' (manquent : ' + restent.join(', ') + ')' : ''}`, restent.length === 0, restent.join());
  // le « + » crée tout : « Une opportunité de diffusion » mène encore à la fenêtre (le bouton caché est cliqué par allerEtCliquer)
  await aller(g.page, '#/representations', '#l-dates a.ligne');
  await toucher(g.page, '.ob-plus');
  await g.page.waitForSelector('.ob-voile.la', { timeout: 4000 });
  await g.page.tap('.ob-item:has-text("opportunité")');
  const fenetre = await attendre(g.page, () => document.querySelector('#f-prospect-crm'), null, 8000);
  ok('3 · d · « Une opportunité de diffusion » du « + » ouvre toujours la fenêtre (le bouton de la page est caché, pas retiré)', fenetre);
  await g.page.screenshot({ path: `${CAPT}/3-opportunite.png` });
  await g.page.keyboard.press('Escape');

  // ---- (e) le planning s'ouvre sur le mois ; un choix fait dans la session est gardé
  await aller(g.page, '#/planning', '[data-pl-jour]', 15000);
  await attendre(g.page, () => document.querySelector('.pl-mois-grille'), null, 6000);
  const pm = await g.page.evaluate(() => ({ mois: document.querySelector('[data-pl-vue="mois"]')?.getAttribute('aria-pressed'), equipe: document.querySelector('[data-pl-vue="equipe"]')?.getAttribute('aria-pressed'), grille: !!document.querySelector('.pl-mois-grille') }));
  ok('3 · e · #/planning s’ouvre en Mois (la grille du mois est là, « Mois » est pressé)', pm.mois === 'true' && pm.equipe === 'false' && pm.grille, JSON.stringify(pm));
  await g.page.screenshot({ path: `${CAPT}/3-planning.png` });
  await toucher(g.page, '[data-pl-vue="equipe"]');
  await g.page.waitForTimeout(400);
  await aller(g.page, '#/lieux', '#vue .tete h1');
  await aller(g.page, '#/planning', '[data-pl-jour]', 15000);
  await g.page.waitForTimeout(300);
  ok('3 · e · un choix fait au téléphone (Équipe) est gardé le temps de la session', (await g.page.getAttribute('[data-pl-vue="equipe"]', 'aria-pressed')) === 'true');

  // ---- (f) la diffusion : les trois chiffres sur une ligne, de même haut, sans rien qui déborde
  await aller(g.page, '#/diffusion', '.crm-kpi-boite', 15000);
  await g.page.waitForTimeout(200);
  const k = await g.page.evaluate(() => ({ boites: [...document.querySelectorAll('.crm-kpi-boite')].map(b => { const r = b.getBoundingClientRect(), v = b.querySelector('b'); return { haut: Math.round(r.top + scrollY), bas: Math.round(r.bottom + scrollY), gauche: Math.round(r.left), droite: Math.round(r.right), deborde: v.scrollWidth > b.clientWidth }; }), debordePage: document.documentElement.scrollWidth > innerWidth }));
  const memeHaut = k.boites.length === 3 && k.boites.every(b => b.haut === k.boites[0].haut && b.bas === k.boites[0].bas), enLigne = k.boites.length === 3 && k.boites.every((b, i) => i === 0 || b.gauche >= k.boites[i - 1].droite);
  ok('3 · f · #/diffusion : les trois chiffres tiennent sur une ligne (même haut, l’un à côté de l’autre), sans rien qui déborde de sa boîte ni de la page', memeHaut && enLigne && !k.boites.some(b => b.deborde) && !k.debordePage, JSON.stringify(k));
  await g.page.screenshot({ path: `${CAPT}/3-diffusion.png` });
  ok('3 · rien de ce qui précède n’a écrit dans les préférences du compte (aucune écriture : ni accueil.tableau, ni representations.avant, ni representations.vue)', !ecrites().some(c => ['accueil.tableau', 'representations.avant', 'representations.vue'].includes(c)), ecrites().join());
  fin('3 · nouveautés, planning, diffusion', g.erreurs);
  await g.ctx.close();

  // ---- à 1 440 × 900, rien n'a bougé : les dix actions, l'ordre du compte, « À compléter » ouvert, les filtres dépliés, le planning en Équipe, « ＋ Nouvelle date »
  {
    const o = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
    await garnirPlanning(o.ctx);
    await attendre(o.page, () => document.querySelector('.tb-tuile[data-k="urgent"]'), null, 15000);
    await o.page.waitForTimeout(300);
    const m = await o.page.evaluate(() => ({ actions: document.querySelectorAll('.tb-tuile[data-k="actions"] .tb-actions > *').length, personnaliser: !!document.querySelector('#tb-personnaliser'), vue: !!document.querySelector('#tb-vue'), ordre: [...document.querySelectorAll('#tb-grille > .tb-tuile')].map(t => t.dataset.k) }));
    const attendu = ['urgent', 'equipe', 'prochaines', ...m.ordre.filter(k => !['actions', 'urgent', 'equipe', 'prochaines'].includes(k))].join();
    ok('3 · g · 1 440 × 900, #/accueil : les dix actions rapides, « Personnaliser », le choix de la vue, les tuiles dans l’ordre du compte (« Actions rapides » en tête, « Prochaines dates » avant « Qui part bientôt »)', m.actions === 10 && m.personnaliser && m.vue && m.ordre[0] === 'actions' && m.ordre.indexOf('prochaines') < m.ordre.indexOf('equipe') && m.ordre.join() !== attendu, JSON.stringify(m));
    // l'ordre d'un téléphone : le même, à l'ordre des trois premières tuiles près
    ok('3 · g · l’ordre du téléphone est celui du compte, sans les actions, avec les trois premières en tête', ordreTel.join() === attendu, `${ordreTel.join()} / ${attendu}`);
    await o.page.screenshot({ path: `${CAPT}/3-accueil-bureau.png` });
    await aller(o.page, '#/representations', '#l-dates a.ligne');
    const d = await o.page.evaluate(() => ({ avantOuvert: document.querySelector('details.avant')?.open, tel: !!document.querySelector('.f-tel'), seg: document.querySelector('.filtres-dates .seg')?.checkVisibility(), saison: document.querySelector('#f-saison')?.checkVisibility(), statut: document.querySelector('#f-statut')?.checkVisibility(), puces: document.querySelector('.filtres-dates .puces .puce')?.checkVisibility(), plus: document.querySelector('.f-plus > summary')?.checkVisibility(),
      nouvelle: (() => { const e = document.querySelector('#vue .tete a[href="#/representations/nouvelle"]'); return !!e && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0; })(), filtresDirects: document.querySelectorAll('.filtres-dates > .seg, .filtres-dates > #f-saison, .filtres-dates > #f-statut, .filtres-dates > .puces, .filtres-dates > .f-plus').length }));
    ok('3 · g · 1 440 × 900, #/representations : « À compléter » ouvert, les filtres dépliés (la barre n’a pas de « Filtres »), « ＋ Nouvelle date » affichée', d.avantOuvert === true && !d.tel && d.seg && d.saison && d.statut && d.puces && d.plus && d.nouvelle && d.filtresDirects === 5, JSON.stringify(d));
    const montrees = [];
    for (const [hash, sel, nom] of [...CREER.slice(1), ...GARDES]) {
      await aller(o.page, hash, '#vue .tete h1, #vue h1', 15000);
      const e = await o.page.evaluate(s => { const x = document.querySelector(`#vue .tete ${s}`) || document.querySelector(s); return !!x && getComputedStyle(x).display !== 'none' && x.getClientRects().length > 0; }, sel);
      if (!e) montrees.push(nom);
    }
    ok(`3 · g · 1 440 × 900 : « ＋ Nouvelle fiche / lieu / séance », « Proposer des dates », « ＋ Nouvelle opportunité », « ＋ Nouveau spectacle » et « ＋ Nouvelle invitation » restent affichés${montrees.length ? ' (manquent : ' + montrees.join(', ') + ')' : ''}`, montrees.length === 0, montrees.join());
    await aller(o.page, '#/planning', '[data-pl-jour]', 15000);
    await o.page.waitForTimeout(300);
    const pl = await o.page.evaluate(() => ({ equipe: document.querySelector('[data-pl-vue="equipe"]')?.getAttribute('aria-pressed'), mois: document.querySelector('[data-pl-vue="mois"]')?.getAttribute('aria-pressed') }));
    ok('3 · g · 1 440 × 900, #/planning s’ouvre en Équipe', pl.equipe === 'true' && pl.mois === 'false', JSON.stringify(pl));
    await aller(o.page, '#/diffusion', '.crm-kpi-boite', 15000);
    const k2 = await o.page.evaluate(() => { const g = getComputedStyle(document.querySelector('.crm-kpi')); return { colonnes: g.gridTemplateColumns.split(' ').length, boites: document.querySelectorAll('.crm-kpi-boite').length, b: getComputedStyle(document.querySelector('.crm-kpi-boite b')).fontSize, pad: getComputedStyle(document.querySelector('.crm-kpi-boite')).paddingTop }; });
    ok('3 · g · 1 440 × 900, #/diffusion : les trois chiffres gardent leur grille, leur corps de 22 px et leur marge de 14 px', k2.boites === 3 && k2.b === '22px' && k2.pad === '14px', JSON.stringify(k2));
    fin('3 · 1 440 × 900', o.erreurs);
    await o.ctx.close();
  }
}

// ================================================================================ 4 · la feuille de route lisible, la carte sur les dates
{
  DB.crescite_preferences = [];
  const depuis = ECRITURES.length;
  const ecrites = () => ECRITURES.slice(depuis).map(r => r.cle);
  // la feuille de Caen a du contenu dès l'ouverture (la base fictive la livre vide) : un en-tête, une rubrique, deux lignes dont une qui manque
  const avantContenu = DB.crescite_feuilles[0].contenu;
  DB.crescite_feuilles[0].contenu = { format: 2, composees: [], pages: [], instantane: [], blocs: [
    { id: 'b1', type: 'entete', segments: [{ texte: 'Bérénice', gras: true }] },
    { id: 'b2', type: 'rubrique', segments: [{ texte: 'Planning' }] },
    { id: 'b3', type: 'ligne', segments: [{ texte: '14h : arrivée à Caen' }] },
    { id: 'b4', type: 'ligne', segments: [{ texte: 'téléphone ?', amorce: true }] }] };
  // l'état de la feuille : la vue choisie, les groupes d'outils, la barre, ce qui colle, la place entre l'en-tête et le pied, le corps du texte
  const FEUILLE = () => {
    const o = document.querySelector('.a4-outils'), pied = document.querySelector('.pied-ed'), tete = document.querySelector('.barre');
    // (le pied de la feuille colle par nature : on cherche ce qui s'y ajoute)
    const collants = [...document.querySelectorAll('#vue *')].filter(e => ['sticky', 'fixed'].includes(getComputedStyle(e).position) && e.checkVisibility() && !e.matches('.pied-ed') && e.getBoundingClientRect().height > 80)
      .map(e => `${e.className || e.tagName}:${Math.round(e.getBoundingClientRect().height)}`);
    const ligne = [...document.querySelectorAll('.a4-tel *')].find(e => e.children.length === 0 && /arrivée à Caen/.test(e.textContent));
    const groupes = [...document.querySelectorAll('.a4-groupe')].filter(g => !g.classList.contains('a4-zoom'));
    return { tel: document.querySelector('[data-fr-vue="tel"]')?.getAttribute('aria-pressed'), page: document.querySelector('[data-fr-vue="page"]')?.getAttribute('aria-pressed'),
      doc: !!document.querySelector('.a4-doc'), outils: o ? getComputedStyle(o).position : null, groupes: groupes.map(g => g.checkVisibility()), collants,
      place: pied && tete ? Math.round(pied.getBoundingClientRect().top - tete.getBoundingClientRect().bottom) : null, corps: ligne ? parseFloat(getComputedStyle(ligne).fontSize) : null,
      aide: document.querySelector('#a4-aide')?.textContent || '', manques: document.querySelector('#fr-manques') ? !document.querySelector('#fr-manques').hidden : false,
      publier: !!document.querySelector('#fr-publier')?.checkVisibility(), vues: [...document.querySelectorAll('.a4-vues button')].map(b => Math.round(b.getBoundingClientRect().height)) };
  };
  const tel = await ouvrir(navigateur, { ...TEL, hash: '#/feuilles/101' });
  await tel.page.waitForSelector('.a4-outils', { timeout: 15000 });
  await attendre(tel.page, () => /arrivée à Caen/.test(document.querySelector('.a4-tel')?.textContent || ''), null, 6000);
  await tel.page.waitForTimeout(500);

  // ---- (a) la feuille s'ouvre comme l'équipe la lit
  const f = await tel.page.evaluate(FEUILLE);
  ok('4 · a · #/feuilles/101 : « Vue de l’équipe » est pressée d’office, « Page A4 » non, et la page A4 n’est pas montée', f.tel === 'true' && f.page === 'false' && !f.doc, JSON.stringify({ tel: f.tel, page: f.page, doc: f.doc }));
  ok('4 · a · la feuille de test n’est pas vide : la vue de l’équipe porte sa ligne, « À compléter » est là', f.corps !== null && f.manques, JSON.stringify({ corps: f.corps, manques: f.manques }));
  ok('4 · a · les outils de mise en page (les quatre groupes) ne sont pas affichés, la barre n’est pas collée', f.groupes.length === 4 && f.groupes.every(v => v === false) && f.outils === 'static', JSON.stringify({ groupes: f.groupes, outils: f.outils }));
  ok('4 · a · aucun élément collant de plus de 80 px (hors le pied de la feuille, qui est à lui) ; au moins 520 px entre l’en-tête et le pied', f.collants.length === 0 && f.place >= 520, JSON.stringify({ collants: f.collants, place: f.place }));
  ok('4 · a · le texte de la vue de l’équipe fait au moins 16 px', f.corps >= 16, String(f.corps));
  ok('4 · a · « Publier pour l’équipe » est là, « Page A4 » et « Vue de l’équipe » font 44 px', f.publier && f.vues.length === 2 && f.vues.every(h => h >= 44), JSON.stringify({ publier: f.publier, vues: f.vues }));
  ok('4 · a · l’aide dit « touchez-les », plus « cliquez »', /touchez-les/.test(f.aide) && !/cliquez/.test(f.aide), f.aide.slice(0, 120));
  await tel.page.screenshot({ path: `${CAPT}/4-feuille-equipe.png` });

  // ---- « Page A4 » : un toucher, la page et ses outils, la barre qui ne colle pas ; une saisie reste
  ok('4 · a · un toucher sur « Page A4 » monte la page', await toucher(tel.page, '[data-fr-vue="page"]') && await attendre(tel.page, () => document.querySelector('.a4-doc'), null, 8000));
  await tel.page.waitForTimeout(600);
  const p = await tel.page.evaluate(FEUILLE);
  ok('4 · a · en page A4 : « Page A4 » est pressée, les quatre groupes de mise en page paraissent (le zoom reste masqué au téléphone), la barre ne colle toujours pas', p.page === 'true' && p.tel === 'false' && p.groupes.length === 4 && p.groupes.every(v => v === true) && p.outils === 'static' && p.collants.length === 0, JSON.stringify({ page: p.page, groupes: p.groupes, outils: p.outils, collants: p.collants }));
  await tel.page.screenshot({ path: `${CAPT}/4-feuille-a4.png` });
  await tel.page.tap('#a4-doc [data-id="b3"]');
  await tel.page.keyboard.press('End');
  await tel.page.keyboard.insertText(' (porte B)');
  await tel.page.waitForTimeout(300);
  ok('4 · a · la saisie faite en page A4 est dans la page', await tel.page.evaluate(() => /porte B/.test(document.querySelector('#a4-doc [data-id="b3"]')?.textContent || '')));
  ok('4 · a · « Vue de l’équipe » : la saisie y est, la page A4 est démontée, les groupes disparaissent de nouveau', await toucher(tel.page, '[data-fr-vue="tel"]') && await attendre(tel.page, () => /porte B/.test(document.querySelector('.a4-tel')?.textContent || '') && !document.querySelector('.a4-doc'), null, 6000)
    && (await tel.page.evaluate(FEUILLE)).groupes.every(v => v === false));
  ok('4 · a · de retour sur « Page A4 », la saisie est toujours là (détruire l’éditeur ne perd rien)', await toucher(tel.page, '[data-fr-vue="page"]') && await attendre(tel.page, () => /porte B/.test(document.querySelector('#a4-doc [data-id="b3"]')?.textContent || ''), null, 8000));
  ok('4 · a · rien n’est écrit dans le compte (aucune écriture de préférence : ni representations.vue, ni accueil.tableau, ni le zoom de la page)', ecrites().length === 0, ecrites().join());
  fin('4 · a · feuille', tel.erreurs);
  await tel.ctx.close();

  // ---- une feuille pas encore composée (la date 102) : le premier texte qu'on lit dit « touchez », pas « cliquez »
  const vierge = await ouvrir(navigateur, { ...TEL, hash: '#/feuilles/102' });
  await vierge.page.waitForSelector('#fr-composer', { timeout: 15000 });
  const accueil = await vierge.page.evaluate(() => document.querySelector('.fr-accueil p')?.textContent || '');
  ok('4 · a · une feuille pas encore composée (#/feuilles/102) : le paragraphe d’accueil dit « touchez-le », plus « cliquez »', /touchez-le/.test(accueil) && !/cliquez/.test(accueil), accueil.slice(-90));
  fin('4 · a · feuille pas encore composée', vierge.erreurs);
  await vierge.ctx.close();

  // ---- (b) la carte s'ouvre resserrée autour des dates
  const carte = await ouvrir(navigateur, { ...TEL, hash: '#/representations/carte' });
  await carte.page.waitForSelector('#tn-serre', { state: 'attached', timeout: 15000 });
  await attendre(carte.page, () => document.querySelectorAll('.tn-pin').length > 0, null, 8000);
  await carte.page.waitForTimeout(500);
  // la boîte des pastilles (le plus petit rectangle qui les contient), en part de la largeur de la carte
  const CARTE = () => { const svg = document.querySelector('#tn-carte svg'), sb = svg.getBoundingClientRect(), pins = [...document.querySelectorAll('.tn-pin')].map(x => x.getBoundingClientRect());
    const x0 = Math.min(...pins.map(r => r.left)), x1 = Math.max(...pins.map(r => r.right));
    return { serre: document.querySelector('#tn-serre').checked, vb: svg.getAttribute('viewBox'), pastilles: pins.length, part: pins.length ? Math.round((x1 - x0) / sb.width * 100) / 100 : 0 }; };
  const c = await carte.page.evaluate(CARTE);
  ok(`4 · b · #/representations/carte : « Autour des dates » est coché, les pastilles couvrent ${Math.round(c.part * 100)} % de la largeur de la carte (au moins 50 %)`, c.serre && c.pastilles > 0 && c.part >= 0.5, JSON.stringify(c));
  await carte.page.screenshot({ path: `${CAPT}/4-carte.png` });
  await carte.page.evaluate(() => document.querySelector('[data-tn-zoom="0"]').click());
  await carte.page.waitForTimeout(700);
  const toute = await carte.page.evaluate(CARTE);
  ok('4 · b · « Toute la France » l’éteint : la case se décoche, le cadre s’élargit, les pastilles couvrent moins de la carte', !toute.serre && toute.vb !== c.vb && toute.part < c.part, JSON.stringify({ avant: c, apres: toute }));
  await aller(carte.page, '#/representations', '#l-dates a.ligne', 15000);
  await aller(carte.page, '#/representations/carte', '#tn-serre', 15000).catch(() => false);
  await attendre(carte.page, () => document.querySelectorAll('.tn-pin').length > 0, null, 8000);
  ok('4 · b · le choix tient le temps de la session : de retour sur la carte, la case est restée décochée', (await carte.page.evaluate(CARTE)).serre === false);
  ok('4 · b · rien n’est écrit dans le compte (ni representations.vue, ni representations.avant)', !ecrites().some(k => /^representations\./.test(k)), ecrites().join());
  fin('4 · b · carte', carte.erreurs);
  await carte.ctx.close();
  // la carte atteinte depuis la liste (et non par son adresse) s'ouvre resserrée de même
  const liste = await ouvrir(navigateur, { ...TEL, hash: '#/representations' });
  await liste.page.waitForSelector('#l-dates a.ligne', { timeout: 15000 });
  await aller(liste.page, '#/representations/carte', '#tn-serre', 15000).catch(() => false);
  await attendre(liste.page, () => document.querySelectorAll('.tn-pin').length > 0, null, 8000);
  ok('4 · b · la carte atteinte depuis la liste des dates s’ouvre aussi resserrée', (await liste.page.evaluate(CARTE)).serre === true);
  await liste.ctx.close();

  // ---- (c) à 1 440 × 900, rien n'a bougé : la feuille en page A4 avec sa barre collée, la carte sur la France
  const bureau = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/feuilles/101' });
  await bureau.page.waitForSelector('.a4-doc', { timeout: 15000 });
  await bureau.page.waitForTimeout(500);
  const b = await bureau.page.evaluate(() => { const o = document.querySelector('.a4-outils'), g = [...document.querySelectorAll('.a4-groupe')];
    return { page: document.querySelector('[data-fr-vue="page"]').getAttribute('aria-pressed'), tel: document.querySelector('[data-fr-vue="tel"]').getAttribute('aria-pressed'), outils: getComputedStyle(o).position, groupes: g.map(x => x.checkVisibility()), aide: document.querySelector('#a4-aide').textContent }; });
  ok('4 · c · 1 440 × 900, #/feuilles/101 : la feuille s’ouvre en page A4, sa barre est collée, ses cinq groupes sont affichés, l’aide dit « cliquez dessus »', b.page === 'true' && b.tel === 'false' && b.outils === 'sticky' && b.groupes.length === 5 && b.groupes.every(v => v) && /cliquez dessus/.test(b.aide) && !/touchez-les/.test(b.aide), JSON.stringify({ ...b, aide: b.aide.slice(0, 80) }));
  await bureau.page.screenshot({ path: `${CAPT}/4-feuille-bureau.png` });
  await aller(bureau.page, '#/feuilles/102', '#fr-composer', 15000);
  const accueilB = await bureau.page.evaluate(() => document.querySelector('.fr-accueil p')?.textContent || '');
  ok('4 · c · 1 440 × 900, une feuille pas encore composée : le paragraphe d’accueil dit toujours « cliquez dessus »', /cliquez dessus/.test(accueilB) && !/touchez/.test(accueilB), accueilB.slice(-90));
  await aller(bureau.page, '#/representations/carte', '#tn-serre', 15000);
  await attendre(bureau.page, () => document.querySelectorAll('.tn-pin').length > 0, null, 8000);
  await bureau.page.waitForTimeout(500);
  const cb = await bureau.page.evaluate(CARTE);
  await bureau.page.evaluate(() => document.querySelector('[data-tn-zoom="0"]').click());
  await bureau.page.waitForTimeout(700);
  const franceB = await bureau.page.evaluate(CARTE);
  ok('4 · c · 1 440 × 900, #/representations/carte : « Autour des dates » n’est pas coché, la carte est sur toute la France (le même cadre que « Toute la France »)', cb.serre === false && cb.vb === franceB.vb, JSON.stringify({ ouverte: cb, france: franceB }));
  await bureau.page.screenshot({ path: `${CAPT}/4-carte-bureau.png` });
  fin('4 · 1 440 × 900', bureau.erreurs);
  await bureau.ctx.close();
  DB.crescite_feuilles[0].contenu = avantContenu;
}

// ================================================================================ 5 · une date et un lieu s'ouvrent sur la route
{
  DB.crescite_preferences = [];
  const depuis = ECRITURES.length;
  const ecrites = () => ECRITURES.slice(depuis).map(r => r.cle);
  // la rangée : ses boutons (libellé, lien ou bouton, taille), sa place dans l'écran, le titre au-dessus
  const ROUTE = () => {
    const r = document.querySelector('.ob-route'), t = document.querySelector('#ed-titre') || document.querySelector('.titre-ed h2');
    if (!r) return { visible: false, haut: 0, bas: 0, sousTitre: false, apresTitre: false, boutons: [] };   // (pas de rangée : les vérifications le disent, au lieu de s'arrêter)
    const rr = r.getBoundingClientRect(), tt = t?.getBoundingClientRect();
    return { visible: r.checkVisibility(), haut: Math.round(rr.top), bas: Math.round(rr.bottom), sousTitre: !!tt && rr.top >= tt.bottom - 1, apresTitre: r.previousElementSibling?.classList.contains('titre-ed') === true,
      boutons: [...r.children].map(b => { const k = b.getBoundingClientRect(); return { texte: (b.querySelector('span')?.firstChild?.textContent || b.textContent).trim(), detail: b.querySelector('small')?.textContent || '', lien: b.tagName === 'A', href: b.getAttribute('href') || '',
        l: Math.round(k.width), h: Math.round(k.height), bas: Math.round(k.bottom), coupe: b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1 }; }) };
  };
  const appuiLong = async (page, sel) => {
    const el = await page.$(sel); await el.scrollIntoViewIfNeeded();
    const r = await el.boundingBox(), cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x + 40, y: r.y + r.height / 2 }] });
    await page.waitForTimeout(650);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    await page.waitForSelector('.gm .gm-boite', { timeout: 3000 }).catch(() => {});
    return page.$$eval('.gm .gm-boite [role="menuitem"]', xs => xs.map(x => x.textContent.trim().replace(/\s+/g, ' ')));
  };
  const tel = await ouvrir(navigateur, { ...TEL, hash: '#/accueil' });
  await tel.page.waitForSelector('.ob-barre', { timeout: 15000 });
  await tel.page.waitForTimeout(400);

  // ---- (a) la date : trois touchers depuis l'onglet Dates
  let touchers = 0;
  const toucherCompte = async sel => { touchers++; return toucher(tel.page, sel); };
  ok('5 · a · toucher n° 1 : l’onglet Dates', await toucherCompte('.ob-barre [data-ob="representations"]') && await attendre(tel.page, () => location.hash === '#/representations' && document.querySelector('#l-dates a.ligne[href="#/representations/101"]'), null, 8000));
  await tel.page.waitForTimeout(300);
  ok('5 · a · toucher n° 2 : la date (Bérénice, Caen) est dans le premier écran de la liste, sans défilement', await tel.page.evaluate(() => { const r = document.querySelector('#l-dates a.ligne[href="#/representations/101"]').getBoundingClientRect(); return r.bottom <= innerHeight - 64 && scrollY === 0; })
    && await toucherCompte('#l-dates a.ligne[href="#/representations/101"]') && await attendre(tel.page, () => location.hash === '#/representations/101' && document.querySelector('#ed-titre') && document.querySelector('.ob-route button, .ob-route a'), null, 8000));
  await tel.page.waitForTimeout(500);
  const r = await tel.page.evaluate(ROUTE);
  const noms = r ? r.boutons.map(b => b.texte) : [];
  ok('5 · a · #/representations/101 : la rangée « sur la route » est là, juste après le titre, visible', !!r && r.visible && r.sousTitre && r.apresTitre, JSON.stringify(r && { visible: r.visible, sousTitre: r.sousTitre, apresTitre: r.apresTitre }));
  ok('5 · a · elle est dans le premier écran (elle finit avant 844 px, au-dessus de la barre du bas)', !!r && r.bas <= 844 - 64 && r.boutons.every(b => b.bas <= 844 - 64), JSON.stringify(r && { haut: r.haut, bas: r.bas }));
  ok('5 · a · trois boutons, dans l’ordre : Itinéraire, Feuille de route, Prévenir l’équipe… (une date confirmée n’a pas « Confirmer »)', noms.length === 3 && /^Itinéraire$/.test(noms[0]) && /^Feuille de route$/.test(noms[1]) && /^Prévenir l.équipe/.test(noms[2]), JSON.stringify(noms));
  ok('5 · a · Itinéraire est un lien vers google.com/maps/dir, qui s’ouvre à part ; Feuille de route mène à #/feuilles/101', !!r && r.boutons[0]?.lien && /^https:\/\/www\.google\.com\/maps\/dir\//.test(r.boutons[0].href) && r.boutons[1]?.lien && r.boutons[1].href === '#/feuilles/101'
    && await tel.page.$eval('.ob-route a[href^="https://www.google.com"]', a => a.target === '_blank' && /noopener/.test(a.rel)), JSON.stringify(r?.boutons.map(b => b.href)));
  ok('5 · a · Feuille de route dit son état (brouillon)', /brouillon/.test(r?.boutons[1]?.detail || ''), r?.boutons[1]?.detail);
  ok('5 · a · chaque bouton fait au moins 44 × 44 et son libellé n’est pas coupé', !!r && r.boutons.length > 0 && r.boutons.every(b => b.h >= 44 && b.l >= 44 && !b.coupe), JSON.stringify(r?.boutons.map(b => [b.l, b.h, b.coupe])));
  ok('5 · a · ni « Ouvrir », ni « Fiche du lieu », ni « Devis », ni « Dupliquer », ni « Supprimer » dans la rangée', !noms.some(n => /^(Ouvrir|Fiche du lieu|Devis|Dupliquer|Supprimer|Voir dans)/.test(n)), JSON.stringify(noms));
  await tel.page.screenshot({ path: `${CAPT}/5-date-route.png` });
  // toucher n° 3 : Prévenir l'équipe… (le bouton de la fiche est rangé dans « Plus » du pied, masqué : le panneau s'ouvre quand même)
  const cache = await tel.page.evaluate(() => { const b = document.querySelector('#d-prevenir'); return !b || !b.checkVisibility(); });
  const y0 = await tel.page.evaluate(() => scrollY);
  ok('5 · a · toucher n° 3 : « Prévenir l’équipe… » ouvre le panneau de #d-prevenir (le bouton du pied, lui, est masqué dans « Plus »)', await toucherCompte('.ob-route button:has-text("Prévenir")') && await attendre(tel.page, () => document.querySelector('#d-prevenir-zone'), null, 6000) && cache, `masque=${cache}`);
  // (récapitulatif des trois vérifications numérotées ci-dessus : le décompte est celui du banc, seule la page non défilée se mesure)
  ok('5 · a · récapitulatif : Dates, la date, Prévenir, soit trois touchers au lieu de cinq, et la page n’a pas été défilée avant le dernier', touchers === 3 && y0 === 0, `${touchers} toucher(s), défilement ${y0}`);
  ok('5 · a · le panneau « Prévenir l’équipe » est affiché (titre, message, Envoyer) et rien n’est écrit', await tel.page.evaluate(() => !!document.querySelector('#d-prevenir-zone #pv-texte') && document.querySelector('#d-prevenir-zone').checkVisibility()) && ecrites().length === 0, ecrites().join());
  await tel.page.screenshot({ path: `${CAPT}/5-date-prevenir.png` });
  await tel.page.tap('#pv-annuler').catch(() => {});
  // la rangée se redit quand la fiche se redessine : une feuille publiée entre-temps (le temps réel ne vient jamais dans la base fictive : on l'appelle)
  await tel.page.evaluate(() => changement('crescite_feuilles', { eventType: 'UPDATE', new: { id: 1, date_id: 101, titre: 'Caen', contenu: {}, statut: 'publiee', version: 2, publiee_le: new Date().toISOString() } }));
  ok('5 · a · une feuille publiée entre-temps : la rangée de la fiche ouverte dit « publiée v2 »', await attendre(tel.page, () => /publiée v2/.test(document.querySelector('.ob-route')?.textContent || ''), null, 3000), (await tel.page.evaluate(ROUTE))?.boutons[1]?.detail);
  await tel.page.evaluate(() => changement('crescite_feuilles', { eventType: 'UPDATE', new: { id: 1, date_id: 101, titre: 'Caen', contenu: {}, statut: 'brouillon', version: 1, publiee_le: null } }));
  // un changement reçu sans effet sur la rangée ne la refait pas : le bouton touché garde son nœud et son focus
  await attendre(tel.page, () => /brouillon/.test(document.querySelector('.ob-route')?.textContent || ''), null, 3000);
  await tel.page.evaluate(() => { const b = document.querySelector('.ob-route button'); b.dataset.marque = '1'; b.focus(); });
  await tel.page.evaluate(() => changement('crescite_feuilles', { eventType: 'UPDATE', new: { id: 1, date_id: 101, titre: 'Caen', contenu: {}, statut: 'brouillon', version: 1, publiee_le: null } }));
  await tel.page.waitForTimeout(300);
  ok('5 · a · un changement reçu qui ne change rien à la rangée ne la refait pas : le bouton focalisé reste le même, avec son focus', await tel.page.evaluate(() => document.activeElement === document.querySelector('.ob-route button') && document.activeElement.dataset.marque === '1'),
    await tel.page.evaluate(() => `${document.activeElement?.tagName}.${document.activeElement?.className} marque=${document.activeElement?.dataset?.marque}`));

  // ---- (a bis) une option : « Confirmer la date… » est le quatrième, et vise le statut sans l'écrire ; sans feuille : « à composer »
  const opt = await ouvrir(navigateur, { ...TEL, hash: '#/representations/105' });
  await attendre(opt.page, () => document.querySelector('.ob-route a, .ob-route button'), null, 8000);
  await opt.page.waitForTimeout(400);
  const ro = await opt.page.evaluate(ROUTE), nomsO = ro.boutons.map(b => b.texte);
  ok('5 · a · #/representations/105 (une option à venir) : quatre boutons, Confirmer la date… en dernier', nomsO.length === 4 && /^Itinéraire$/.test(nomsO[0]) && /^Feuille de route$/.test(nomsO[1]) && /^Prévenir/.test(nomsO[2]) && /^Confirmer la date/.test(nomsO[3]), JSON.stringify(nomsO));
  ok('5 · a · sans feuille, Feuille de route dit « à composer » ; chaque bouton fait 44 px au moins, aucun n’est coupé', /à composer/.test(ro.boutons[1]?.detail || '') && ro.boutons.length > 0 && ro.boutons.every(b => b.h >= 44 && !b.coupe), JSON.stringify(ro.boutons.map(b => [b.texte, b.detail, b.h])));
  await opt.page.screenshot({ path: `${CAPT}/5-option-route.png` });
  const avantStatut = await opt.page.$eval('[data-statut="confirmee"]', b => b.getAttribute('aria-pressed'));
  ok('5 · a · toucher « Confirmer la date… » : le bouton « Confirmée » du statut est visé (focus, dans l’écran), sans rien écrire ni changer le statut', await toucher(opt.page, '.ob-route button:has-text("Confirmer")')
    && await attendre(opt.page, () => document.activeElement?.matches('[data-statut="confirmee"]'), null, 4000)
    && await opt.page.$eval('[data-statut="confirmee"]', b => { const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && b.getAttribute('aria-pressed') === 'false'; }) && avantStatut === 'false' && ecrites().length === 0, `avant=${avantStatut} ecritures=${ecrites().join()}`);
  fin('5 · a bis · option', opt.erreurs);
  await opt.ctx.close();

  // ---- (b) le lieu
  const li = await ouvrir(navigateur, { ...TEL, hash: '#/lieux/5' });
  await li.ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(li.page.url()).origin }).catch(() => {});
  await attendre(li.page, () => document.querySelector('.ob-route a, .ob-route button'), null, 8000);
  await li.page.waitForTimeout(400);
  const rl = await li.page.evaluate(ROUTE), nomsL = rl.boutons.map(b => b.texte);
  ok('5 · b · #/lieux/5 : la rangée est sous le titre, trois boutons : Itinéraire, Appeler le contact, Copier l’adresse', rl.visible && rl.apresTitre && nomsL.length === 3 && /^Itinéraire$/.test(nomsL[0]) && /^Appeler le contact$/.test(nomsL[1]) && /^Copier l.adresse$/.test(nomsL[2]), JSON.stringify(nomsL));
  ok('5 · b · « Appeler le contact » est un lien tel: (le numéro de la régie), avant 844 px (il était à 1 311)', !!rl.boutons[1]?.lien && /^tel:\+?[\d\s]+/.test(rl.boutons[1].href) && /02\s?31/.test(rl.boutons[1].detail + rl.boutons[1].href) && rl.boutons[1].bas <= 844 - 64, JSON.stringify(rl.boutons[1]));
  ok('5 · b · Itinéraire pointe sur l’adresse du lieu ; tous les boutons font 44 px au moins et ne sont pas coupés', /maps\/dir.*Caen/.test(decodeURIComponent(rl.boutons[0]?.href || '')) && rl.boutons.length > 0 && rl.boutons.every(b => b.h >= 44 && b.l >= 44 && !b.coupe), JSON.stringify(rl.boutons.map(b => [b.l, b.h, b.coupe])));
  await li.page.screenshot({ path: `${CAPT}/5-lieu-route.png` });
  ok('5 · b · « Copier l’adresse » écrit l’adresse dans le presse-papiers', await toucher(li.page, '.ob-route button:has-text("Copier")') && await attendre(li.page, () => /copié/.test(document.querySelector('#annonces')?.textContent || ''), null, 4000)
    && await li.page.evaluate(() => navigator.clipboard.readText()).then(t => t === 'Théâtre de Caen, 135 boulevard du Maréchal-Leclerc, Caen', () => false));
  ok('5 · b · le reste de la fiche suit, inchangé (le champ de l’adresse, le suivi, le pied)', await li.page.evaluate(() => !!document.querySelector('#li-f [data-chemin="adresse"]') && !!document.querySelector('#li-s [data-chemin="contact"]') && !!document.querySelector('.pied-ed')));
  ok('5 · b · rien n’est écrit', ecrites().length === 0, ecrites().join());
  // un lieu sans contact de suivi : « Contact à renseigner » (il vise le champ, comme l'appui long)
  await aller(li.page, '#/lieux/8', '#ed-lieu #li-f', 15000);
  await attendre(li.page, () => document.querySelector('.ob-route a, .ob-route button'), null, 4000);
  const rs = await li.page.evaluate(ROUTE);
  ok('5 · b · un lieu sans contact (#/lieux/8) : « Contact à renseigner » prend la place d’« Appeler le contact », et vise le champ du contact', rs.boutons.some(b => /^Contact à renseigner$/.test(b.texte) && !b.lien) && await toucher(li.page, '.ob-route button:has-text("Contact à renseigner")')
    && await attendre(li.page, () => document.activeElement?.matches('[data-chemin="contact"]'), null, 4000), JSON.stringify(rs.boutons.map(b => b.texte)));
  // l'appui long sur un lieu : plus d'onglet ni de lien copié non plus
  await aller(li.page, '#/lieux', '#vue a.ligne[href="#/lieux/5"]', 15000);
  const menuL = await appuiLong(li.page, '#vue a.ligne[href="#/lieux/5"]');
  ok('5 · c · l’appui long sur un lieu ouvre sa feuille d’actions (Itinéraire, Copier l’adresse…), sans « Ouvrir dans un nouvel onglet » ni « Copier le lien »', menuL.length > 2 && menuL.some(x => /^Itinéraire/.test(x)) && menuL.some(x => /^Copier l.adresse/.test(x))
    && !menuL.some(x => /nouvel onglet|Copier le lien/.test(x)), JSON.stringify(menuL));
  fin('5 · b · lieu sans contact', li.erreurs);
  await li.ctx.close();

  // ---- (c) l'appui long sur une date : plus d'onglet ni de lien copié
  await aller(tel.page, '#/representations', '#l-dates a.ligne[href="#/representations/101"]', 15000);
  const menu = await appuiLong(tel.page, '#l-dates a.ligne[href="#/representations/101"]');
  ok('5 · c · l’appui long sur une date ouvre sa feuille d’actions (Ouvrir la date, Itinéraire, Prévenir…), sans « Ouvrir dans un nouvel onglet » ni « Copier le lien »', menu.length > 4 && menu.some(x => /^Ouvrir la date/.test(x)) && menu.some(x => /^Itinéraire/.test(x)) && menu.some(x => /^Prévenir/.test(x))
    && !menu.some(x => /nouvel onglet|Copier le lien/.test(x)), JSON.stringify(menu));
  ok('5 · c · elle garde « Supprimer la date » en dernier', /^Supprimer la date/.test(menu[menu.length - 1] || ''), JSON.stringify(menu.slice(-2)));
  await tel.page.screenshot({ path: `${CAPT}/5-appui-long.png` });
  fin('5 · a et c · date, appui long', tel.erreurs);
  await tel.ctx.close();

  // ---- (d) « moins d'animations » : rien ne bouge
  const red = await ouvrir(navigateur, { ...TEL, hash: '#/representations/101', reduit: true });
  await attendre(red.page, () => document.querySelector('.ob-route a, .ob-route button'), null, 8000);
  await red.page.waitForTimeout(600);
  const anims = () => red.page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => `${a.effect?.target?.className || a.effect?.target?.tagName}:${a.animationName || a.transitionProperty || ''}`));
  ok('5 · d · « moins d’animations » : la fiche s’ouvre sur la route sans aucune animation en cours', (await anims()).length === 0 && await red.page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), JSON.stringify(await anims()));
  await toucher(red.page, '.ob-route button:has-text("Prévenir")');
  await red.page.waitForTimeout(500);
  ok('5 · d · et toucher « Prévenir l’équipe… » n’en lance pas non plus', await red.page.evaluate(() => !!document.querySelector('#d-prevenir-zone')) && (await anims()).length === 0, JSON.stringify(await anims()));
  await red.ctx.close();

  // ---- (e) à 1 440 × 900 : aucune rangée, et le clic droit garde ses entrées
  const bureau = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/101' });
  await bureau.page.waitForSelector('#ed-titre', { timeout: 15000 });
  await bureau.page.waitForTimeout(400);
  const nD = await bureau.page.evaluate(() => document.querySelectorAll('.ob-route').length);
  await aller(bureau.page, '#/lieux/5', '#ed-lieu #li-f', 15000);
  const nL = await bureau.page.evaluate(() => document.querySelectorAll('.ob-route').length);
  ok('5 · e · 1 440 × 900 : ni la fiche d’une date ni celle d’un lieu n’a de rangée « sur la route »', nD === 0 && nL === 0, `date=${nD} lieu=${nL}`);
  await aller(bureau.page, '#/representations', '#l-dates a.ligne[href="#/representations/101"]', 15000);
  await bureau.page.click('#l-dates a.ligne[href="#/representations/101"]', { button: 'right' });
  await bureau.page.waitForSelector('.gm .gm-boite', { timeout: 3000 }).catch(() => {});
  const menuB = await bureau.page.$$eval('.gm .gm-boite [role="menuitem"]', xs => xs.map(x => x.textContent.trim().replace(/\s+/g, ' ')));
  ok('5 · e · le menu du clic droit garde « Ouvrir dans un nouvel onglet » et « Copier le lien »', menuB.some(x => /Ouvrir dans un nouvel onglet/.test(x)) && menuB.some(x => /Copier le lien/.test(x)), JSON.stringify(menuB));
  ok('5 · e · rien n’est écrit dans le compte', !ecrites().some(k => /^(accueil|representations)\./.test(k)), ecrites().join());
  fin('5 · e · 1 440 × 900', bureau.erreurs);
  await bureau.ctx.close();
}

await navigateur.close();
bilan(CAPT);
