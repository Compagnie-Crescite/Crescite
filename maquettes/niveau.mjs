// Le niveau supérieur de l'administration (admin/index.html et ses modules : corbeille.js, tiroir.js, selection.js,
// parcours.js, gardefous.js, series.js, modeles.js, notes.js, tournee.js, mobile.js), vérifié dans Chromium, hors ligne,
// sur la base fictive commune (admin-fictif.mjs).
//   node maquettes/niveau.mjs
// Dix idées, chacune regardée : les fiches en tiroir, la sélection multiple, le parcours d'une date, annuler plutôt que
// confirmer (et la corbeille), les garde-fous, la carte de tournée, les documents générés, les séries et modèles, le
// téléphone, les notes internes. Les captures vont dans maquettes/dist/shots-niveau/. Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, URL0, plus, DB, MODIFS, ok, calme, ouvrir, texte, compte, tuile, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-niveau');
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
const attendre = (page, fn, ms = 6000) => page.waitForFunction(fn, null, { timeout: ms }).catch(() => {});

// ================================================================================ 1 · les fiches en tiroir
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900 });
  await page.waitForSelector(`${tuile('prochaines')} .tb-l`, { timeout: 15000 });
  await page.click(`${tuile('prochaines')} a.tb-l[href="#/representations/101"]`);
  await attendre(page, () => document.querySelector('.tiroir.la #ed-date #s-org'));
  ok('1 · une date du tableau de bord s’ouvre en tiroir : la fiche entière, l’adresse de la page inchangée', (await compte(page, '.tiroir #ed-date #s-org')) === 1 && await page.evaluate(() => location.hash === '#/accueil'), await page.evaluate(() => location.hash));
  ok('1 · le tiroir dit ce qu’il montre et offre la pleine page', /Date/.test(await texte(page, '.tiroir-genre')) && /Bérénice/.test(await texte(page, '.tiroir-titre')) && await page.$eval('.tiroir [data-tiroir-pleine]', a => a.getAttribute('href')) === '#/representations/101');
  await calme(page);
  await page.screenshot({ path: `${CAPT}/tiroir.png`, fullPage: false });
  await page.click('.tiroir #d-lieu-fiche a[href="#/lieux/5"]');
  await attendre(page, () => document.querySelectorAll('.tiroir.la').length === 2 && document.querySelector('.tiroir #ed-lieu #li-f'));
  ok('1 · le lieu de la date s’ouvre par-dessus : deux tiroirs empilés, le premier en retrait', (await compte(page, '.tiroir.la')) === 2 && (await compte(page, '.tiroir #ed-lieu #li-f')) === 1 && await page.$eval('.tiroir[aria-hidden="true"]', e => !!e.style.getPropertyValue('--tiroir-recul')));
  await page.screenshot({ path: `${CAPT}/tiroirs-empiles.png`, fullPage: false });
  await page.keyboard.press('Escape');
  await attendre(page, () => document.querySelectorAll('.tiroir').length === 1);
  ok('1 · Échap ferme le dernier tiroir, la date reste', (await compte(page, '.tiroir')) === 1 && (await compte(page, '.tiroir #ed-date')) === 1);
  await page.keyboard.press('Escape');
  await attendre(page, () => !document.querySelector('.tiroir'));
  ok('1 · Échap encore : plus de tiroir, le tableau de bord est toujours là', (await compte(page, '.tiroir')) === 0 && (await compte(page, tuile('prochaines'))) === 1 && await page.evaluate(() => document.documentElement.classList.contains('tiroir-ouvert') === false));
  await page.goto(`${URL0}#/diffusion/piste/1`);
  await attendre(page, () => document.querySelector('.tiroir.la #ed-piste .tiroir-etapes'), 10000);
  ok('1 · l’adresse d’une piste ouvre le Kanban, puis la piste en tiroir : ses étapes, sa relance', (await compte(page, '#kanban-zone')) === 1 && (await compte(page, '.tiroir #ed-piste .tiroir-etapes li')) === 5 && /Théâtre de Flers/.test(await texte(page, '.tiroir-titre')));
  ok('1 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 2 · la sélection multiple
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations' });
  await page.waitForSelector('#l-dates a.ligne', { timeout: 15000 });
  await page.click('#l-dates a.ligne[href="#/representations/101"]', { modifiers: ['Shift'] });
  await page.click('#l-dates a.ligne[href="#/representations/102"]', { modifiers: ['Shift'] });
  await attendre(page, () => document.querySelector('#sel-barre'));
  ok('2 · Maj+clic choisit deux dates sans les ouvrir : la barre dit « 2 dates », les lignes sont marquées', (await texte(page, '#sel-barre .sel-compte')) === '2 dates' && (await compte(page, '#l-dates a.ligne.sel-on')) === 2 && await page.evaluate(() => location.hash === '#/representations' && document.documentElement.classList.contains('sel-mode')));
  const actions = await page.$$eval('#sel-barre [data-sel-action]', xs => xs.map(x => x.textContent.trim()));
  ok('2 · les actions groupées des dates : statut, publier, masquer, écrire, exporter, dupliquer, devis, supprimer', ['Statut…', 'Publier', 'Masquer', 'Écrire aux contacts', 'Exporter CSV', 'Dupliquer vers…', 'Devis…', 'Supprimer'].every(a => actions.includes(a)), actions.join(' | '));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/selection.png`, fullPage: false });
  const n2 = MODIFS.length;
  await page.click('#sel-barre [data-sel-action]:has-text("Masquer")');
  await attendre(page, () => !document.querySelector('#sel-barre'));
  const m2 = MODIFS.slice(n2).find(m => m.table === 'crescite_dates' && m.body && m.body.visible === false);
  ok('2 · « Masquer » écrit les deux dates d’un coup (visible : false), la sélection se vide, l’annonce porte « Annuler »', !!m2 && m2.n === 2 && (await compte(page, '#sel-barre')) === 0 && (await compte(page, '.annonce button')) === 1, JSON.stringify(MODIFS.slice(n2)));
  await page.click('.annonce button');
  await page.waitForTimeout(400);
  ok('2 · « Annuler » remet chaque date comme avant', MODIFS.slice(n2).filter(m => m.table === 'crescite_dates' && m.body && m.body.visible === true).length === 2);
  await page.click('.filtres .sel-bouton');
  await attendre(page, () => document.querySelector('#sel-barre'));
  await page.click('#sel-barre [data-sel-tout]');
  await page.waitForTimeout(100);
  ok('2 · « Sélectionner » puis « Tout » : toutes les dates de la liste', /^\d+ dates$/.test(await texte(page, '#sel-barre .sel-compte')) && (await compte(page, '#l-dates a.ligne.sel-on')) >= 5);
  await page.keyboard.press('Escape');
  await attendre(page, () => !document.querySelector('#sel-barre'));
  ok('2 · Échap quitte la sélection', (await compte(page, '#sel-barre')) === 0 && (await compte(page, '.sel-on')) === 0);
  await page.goto(`${URL0}#/equipe/frais`);
  await page.waitForSelector('#table-frais tr[data-frais-id]', { timeout: 15000 });
  await page.click('#table-frais tr[data-frais-id="1"]', { modifiers: ['Shift'] });
  await attendre(page, () => document.querySelector('#sel-barre'));
  const n3 = MODIFS.length;
  await page.click('#sel-barre [data-sel-action]:has-text("Valider")');
  await page.waitForTimeout(500);
  ok('2 · les notes de frais aussi : « Valider » sur la sélection', MODIFS.slice(n3).some(m => m.table === 'crescite_notes_frais' && m.body && m.body.statut === 'valide'), JSON.stringify(MODIFS.slice(n3)));
  ok('2 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 3 · le parcours d'une date, 5 · les garde-fous
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/101' });
  await page.waitForSelector('#ed-date .parcours', { timeout: 15000 });
  const etapes = await page.$$eval('#ed-date .parcours li', xs => xs.map(x => `${x.className}:${x.querySelector('.pc-l').textContent}`));
  ok('3 · le parcours de la date de Caen : confirmée et contrat signé faits, lieu complet, équipe, feuille en brouillon, bilan plus tard', etapes.includes('pc-fait:Confirmée') && etapes.includes('pc-fait:Contrat') && etapes.includes('pc-fait:Lieu') && etapes.some(e => e.startsWith('pc-encours:Feuille')) && etapes.includes('pc-attente:Bilan'), etapes.join(' | '));
  ok('3 · une étape dit ce qui manque : l’équipe, quelqu’un sans téléphone', /1 sans téléphone/.test(await texte(page, '#ed-date .parcours .pc-encours .pc-d')), await texte(page, '#ed-date .parcours'));
  await page.click('#ed-date .parcours [data-pc-viser="#s-contrat"]');
  await page.waitForTimeout(300);
  ok('3 · l’étape « Contrat » vise le champ du contrat', await page.evaluate(() => document.activeElement?.id === 's-contrat'));
  await page.goto(`${URL0}#/representations`);
  await page.waitForSelector('#l-dates a.ligne .pc-points', { timeout: 15000 });
  ok('3 · dans la liste, des points par étape, colorés', (await compte(page, '#l-dates a.ligne[href="#/representations/101"] .pc-points i.pc-fait')) >= 3);
  await page.goto(`${URL0}#/representations/101`);
  await page.waitForSelector('#ed-date #d-gardefous li', { timeout: 15000 });
  const gf = await page.$$eval('#d-gardefous li', xs => xs.map(x => x.textContent.trim()));
  ok('5 · les garde-fous : Jean est indisponible ce jour-là (crescite_indisponibilites)', gf.some(t => /Jean Durand est indisponible/.test(t) && /Tournage/.test(t)), gf.join(' | '));
  await page.click('#ed-date [data-statut="option"]');
  await page.waitForTimeout(200);
  const gf2 = await page.$$eval('#d-gardefous li', xs => xs.map(x => x.textContent.trim()));
  ok('5 · en direct : passée en option, le contrat signé alerte, avec « Confirmer »', gf2.some(t => /contrat est signé/.test(t)) && (await compte(page, '#d-gardefous [data-gf-viser="[data-statut=\\"confirmee\\"]"]')) === 1, gf2.join(' | '));
  await page.click('#d-gardefous [data-gf-viser]');
  await page.waitForTimeout(200);
  ok('5 · « Confirmer » vise le bouton du statut', await page.evaluate(() => document.activeElement?.dataset?.statut === 'confirmee'));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/parcours-gardefous.png`, fullPage: false });
  ok('3 et 5 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 4 · annuler plutôt que confirmer, la corbeille
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/ateliers/seances/2' });
  let dialogues = 0;
  page.on('dialog', d => { dialogues++; d.dismiss(); });
  await page.waitForSelector('#se-suppr', { timeout: 15000 });
  const n4 = MODIFS.length;
  await page.click('#se-suppr');
  await attendre(page, () => location.hash === '#/ateliers/seances' && document.querySelector('.annonce button'));
  ok('4 · « Supprimer » une séance : tout de suite, sans « Êtes-vous sûr ? », l’annonce porte « Annuler »', dialogues === 0 && MODIFS.slice(n4).some(m => m.table === 'crescite_seances' && m.delete) && (await compte(page, '.annonce button')) === 1 && /Séance supprimée/.test(await texte(page, '.annonce')), await texte(page, '.annonce'));
  await page.click('.annonce button');
  await attendre(page, () => location.hash === '#/ateliers/seances/2');
  ok('4 · « Annuler » la remet (une insertion) et rouvre la séance', MODIFS.slice(n4).some(m => m.table === 'crescite_seances' && m.post) && await page.evaluate(() => location.hash === '#/ateliers/seances/2'));
  await page.goto(`${URL0}#/corbeille`);
  await page.waitForSelector('#l-corbeille .cb-ligne', { timeout: 15000 });
  ok('4 · la corbeille montre ce qui a été supprimé ces trente jours (le lieu effacé du journal), avec « Rétablir »', (await compte(page, '#l-corbeille .cb-ligne')) >= 1 && /Lieu/.test(await texte(page, '#l-corbeille .cb-ligne')) && /Rouen/.test(await texte(page, '#l-corbeille .cb-ligne')));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/corbeille.png`, fullPage: false });
  const n5 = MODIFS.length;
  await page.click('#l-corbeille [data-cb-retablir="2"]');
  await page.waitForTimeout(600);
  ok('4 · « Rétablir » réinsère la ligne telle qu’elle était', MODIFS.slice(n5).some(m => m.table === 'crescite_lieux' && m.post && m.post[0].commune === 'Rouen'), JSON.stringify(MODIFS.slice(n5)));
  await page.goto(`${URL0}#/journal`);
  await page.waitForSelector('#l-journal [data-j]', { timeout: 15000 });
  const n6 = MODIFS.length;
  await page.click('#l-journal [data-j="5"]');
  await page.waitForTimeout(600);
  ok('4 · « Revenir » dans le journal : sans confirmation, et l’annonce porte « Rétablir »', dialogues === 0 && MODIFS.slice(n6).some(m => m.table === 'crescite_dates' && m.body && m.body.statut === 'option') && (await compte(page, '.annonce button')) === 1, JSON.stringify(MODIFS.slice(n6)));
  ok('4 · le journal mène à la corbeille', (await compte(page, 'a[href="#/corbeille"]')) >= 1);
  ok('4 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 8 · les séries et modèles, 7 · les documents générés, 10 · les notes
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/nouvelle' });
  page.on('dialog', d => d.accept());   // « Des modifications ne sont pas enregistrées » en quittant la série non enregistrée
  await page.waitForSelector('#d-serie', { timeout: 15000 });
  await page.click('#d-serie');
  await page.waitForSelector('.gf [role="dialog"]', { timeout: 5000 });
  await page.fill('.gf [name="du"]', plus(10));
  await page.fill('.gf [name="au"]', plus(16));
  await page.fill('.gf [name="heures"]', '10:00, 14:30');
  await page.click('.gf [data-gf-seg="public"] [data-val="scolaire"]');
  await page.click('.gf button[type="submit"]');
  await attendre(page, () => !document.querySelector('.gf') && document.querySelectorAll('#d-reps tr').length >= 8);
  const reps = await page.$$eval('#d-reps tr', xs => xs.map(x => `${x.querySelector('[data-r="jour"]').value} ${x.querySelector('[data-r="heure"]').value} ${x.querySelector('[data-r="public"]').value}`));
  ok('8 · « Série… » pose les séances d’un coup : une semaine du lundi au vendredi à 10 h et 14 h 30, scolaires', reps.length === 10 && reps.every(r => /scolaire$/.test(r)) && reps.filter(r => / 10:00 /.test(r)).length === 5, reps.join(' | '));
  await page.goto(`${URL0}#/spectacles/berenice`);
  await page.waitForSelector('[data-onglet="Déroulé type"]', { timeout: 15000 });
  await page.click('[data-onglet="Déroulé type"]');
  await page.waitForSelector('#md-heures', { timeout: 5000 });
  await page.fill('#md-heures', '20:30');
  await page.fill('#md-sco', '10:00, 14:00');
  const n8 = MODIFS.length;
  await page.click('#md-enregistrer');
  await page.waitForTimeout(400);
  ok('8 · le modèle d’un spectacle (ses horaires habituels) s’enregistre dans crescite_textes', MODIFS.slice(n8).some(m => m.table === 'crescite_textes' && m.post && m.post[0].cle === 'modele-date:berenice' && m.post[0].valeur.heures === '20:30'), JSON.stringify(MODIFS.slice(n8)));
  await page.goto(`${URL0}#/representations/nouvelle`);
  await page.waitForSelector('#d-reps tr', { timeout: 15000 });
  await page.selectOption('#d-sp', '1');
  await page.waitForTimeout(200);
  ok('8 · une nouvelle date de Bérénice part avec l’heure du modèle (20:30)', await page.$eval('#d-reps tr [data-r="heure"]', e => e.value) === '20:30');
  // 7 · les documents
  await page.goto(`${URL0}#/representations/101`);
  await page.waitForSelector('#d-documents [data-doc-generer="devis"]', { timeout: 15000 });
  const n7 = MODIFS.length;
  await page.click('#d-documents [data-doc-generer="devis"]');
  await page.waitForSelector('.gf [role="dialog"]', { timeout: 8000 });
  ok('7 · « Devis… » ouvre le formulaire : le destinataire est le lieu, l’objet nomme le spectacle, la TVA à 5,5', await page.$eval('.gf [name="structure"]', e => e.value) === 'Théâtre de Caen' && /Bérénice/.test(await page.$eval('.gf [name="objet"]', e => e.value)) && await page.$eval('.gf [name="tva_taux"]', e => e.value) === '5.5');
  await page.fill('.gf [name="montant_ht"]', '2500');
  await page.click('.gf button[type="submit"]');
  await attendre(page, () => document.querySelector('#d-documents .doc-liste li'), 10000);
  const doc = await texte(page, '#d-documents .doc-liste li');
  const srcdoc = await page.$eval('iframe[srcdoc]', f => f.getAttribute('srcdoc')).catch(() => '');
  ok('7 · le devis est numéroté, gardé dans la fiche, avec son montant TTC', /DEV-\d{4}-001/.test(doc) && /Devis/.test(doc) && /2\s?637,50 €/.test(doc), doc);
  ok('7 · la page A4 imprimée : le modèle rempli (la compagnie, le spectacle, les séances, les montants)', /Compagnie Crescite/.test(srcdoc) && /Bérénice/.test(srcdoc) && /doc-montants/.test(srcdoc) && /2\s?500,00/.test(srcdoc) && /Théâtre de Caen/.test(srcdoc), srcdoc.slice(0, 200));
  ok('7 · les modèles sont des textes de la compagnie (modele:devis) et le registre documents:generes', MODIFS.slice(n7).some(m => m.table === 'crescite_textes' && m.post && m.post[0].cle === 'modele:devis') && MODIFS.slice(n7).some(m => m.table === 'crescite_textes' && m.post && m.post[0].cle === 'documents:generes'), JSON.stringify(MODIFS.slice(n7).map(m => m.post?.[0]?.cle)));
  // 10 · les notes
  await page.waitForSelector('#d-notes textarea', { timeout: 8000 });
  await page.fill('#d-notes textarea', 'Appeler la régie avec @Cam');
  await page.waitForTimeout(150);
  ok('10 · « @ » propose les gens de l’équipe', (await compte(page, '#d-notes .nt-propositions [data-nt-mention]')) >= 1 && /Camille Essai/.test(await texte(page, '#d-notes .nt-propositions')));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  ok('10 · Entrée complète la mention', /@Camille Essai /.test(await page.$eval('#d-notes textarea', e => e.value)), await page.$eval('#d-notes textarea', e => e.value));
  const n10 = MODIFS.length;
  await page.click('#d-notes button[type="submit"]');
  await attendre(page, () => document.querySelector('#d-notes .nt-note'));
  const note = MODIFS.slice(n10).find(m => m.table === 'crescite_notes' && m.post);
  ok('10 · la note s’écrit avec sa mention (Camille, n° 1) et son auteur ; elle apparaît dans le fil', !!note && note.post[0].cible_table === 'crescite_dates' && note.post[0].cible_id === 101 && JSON.stringify(note.post[0].mentions) === '[1]' && note.post[0].auteur_nom === 'Adrien' && (await compte(page, '#d-notes .nt-note')) === 1 && (await compte(page, '#d-notes .nt-mention')) === 1, JSON.stringify(note));
  ok('10 · l’annonce dit qu’une personne est prévenue', /une personne prévenue/.test(await page.$$eval('.annonce', xs => xs.map(x => x.textContent).join(' '))));
  await page.click('#d-notes [data-nt-epingler]');
  await page.waitForTimeout(400);
  ok('10 · épingler la note', MODIFS.slice(n10).some(m => m.table === 'crescite_notes' && m.body && m.body.epingle === true) && (await compte(page, '#d-notes .nt-note.epinglee')) === 1);
  await calme(page);
  await page.screenshot({ path: `${CAPT}/documents-notes.png`, fullPage: true });
  ok('7, 8 et 10 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 6 · la carte de tournée
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/carte' });
  await page.waitForSelector('.tn-svg .tn-pin', { timeout: 15000 });
  ok('6 · la vue Carte est la troisième vue de Représentations', (await texte(page, '.tab-vue a[aria-current="page"]')) === 'Carte');
  ok('6 · la carte : la France, une pastille par lieu avec ses dates, le trajet', (await compte(page, '.tn-svg .tn-pays')) === 1 && (await compte(page, '.tn-svg .tn-pin')) >= 3 && (await compte(page, '.tn-svg .tn-trajet')) === 1);
  const etapes = await texte(page, '#tn-etapes');
  ok('6 · étape par étape : les dates, et entre deux dates la distance et le délai', (await compte(page, '#tn-etapes .tn-date')) >= 3 && /\d+ km/.test(etapes) && /(le lendemain|jours après|semaines après|mois après)/.test(etapes), etapes.slice(0, 160));
  ok('6 · la tournée en chiffres : dates, lieux, kilomètres, enchaînements serrés', /Kilomètres/.test(await texte(page, '#tn-resume')) && /Enchaînements serrés/.test(await texte(page, '#tn-resume')));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/carte.png`, fullPage: false });
  await page.click('#tn-serre');
  await page.waitForTimeout(200);
  ok('6 · « Autour des dates » resserre le cadre', await page.$eval('.tn-svg', e => e.getAttribute('viewBox') !== '0 0 800 780'));
  await page.click('.tn-svg .tn-pin[data-tn-lieu="5"]');
  await attendre(page, () => document.querySelector('.tiroir.la #ed-lieu'));
  ok('6 · une pastille ouvre le lieu en tiroir', (await compte(page, '.tiroir #ed-lieu')) === 1 && /Caen/.test(await texte(page, '.tiroir-titre')));
  ok('6 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 9 · le téléphone
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 390, hauteur: 844 });
  await page.waitForSelector('.ob-barre', { timeout: 15000 });
  const onglets = await page.$$eval('.ob-barre [data-ob]', xs => xs.map(x => x.textContent.trim()));
  ok('9 · au téléphone, une barre d’onglets en bas : Tableau, Dates, Planning, Équipe, Plus ; la rubrique courante marquée ; les rubriques du haut masquées', onglets.join(',') === 'Tableau,Dates,Planning,Équipe,Plus' && (await texte(page, '.ob-barre [aria-current="page"]')) === 'Tableau' && await page.$eval('.barre .nav', e => getComputedStyle(e).display === 'none'), onglets.join(','));
  ok('9 · le bouton « + » flotte au-dessus de la barre', await page.$eval('.ob-plus', e => !e.hidden && getComputedStyle(e).position === 'fixed'));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/telephone.png`, fullPage: false });
  await page.click('.ob-plus');
  await page.waitForSelector('.ob-voile.la .ob-feuille', { timeout: 3000 });
  const creer = await page.$$eval('.ob-feuille .ob-item', xs => xs.map(x => x.textContent.trim()));
  ok('9 · « + » propose de créer une date, une fiche, un lieu, une opportunité, une proposition, une séance', ['Une date', 'Une fiche dans l’équipe', 'Un lieu', 'Une opportunité de diffusion', 'Une séance d’atelier'].every(x => creer.some(c => c.startsWith(x))), creer.join(' | '));
  await page.screenshot({ path: `${CAPT}/telephone-creer.png`, fullPage: false });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.click('.ob-barre [data-ob="plus"]');
  await page.waitForSelector('.ob-voile.la .ob-feuille', { timeout: 3000 });
  const plusItems = await page.$$eval('.ob-feuille .ob-item', xs => xs.map(x => x.textContent.trim().split('\n')[0]));
  ok('9 · « Plus » : les autres rubriques, la carte, la corbeille, la recherche', ['Feuilles de route', 'Spectacles', 'Lieux', 'Journal'].every(x => plusItems.includes(x)) && plusItems.some(x => /Carte de tournée/.test(x)) && plusItems.some(x => /Corbeille/.test(x)), plusItems.join(' | '));
  await page.click('.ob-feuille .ob-item:has-text("Lieux")');
  await attendre(page, () => location.hash === '#/lieux' && document.querySelector('#l-lieux a.ligne'));
  ok('9 · une rubrique de la feuille s’ouvre, « Plus » devient la rubrique courante', await page.evaluate(() => location.hash === '#/lieux') && (await texte(page, '.ob-barre [aria-current="page"]')) === 'Plus');
  await page.click('#l-lieux a.ligne[href="#/lieux/5"]');
  await attendre(page, () => document.querySelector('#ed-lieu #li-f'));
  await page.waitForTimeout(300);
  ok('9 · une fiche en plein écran : la liste s’efface, le bouton « + » aussi, le pied reste au-dessus de la barre', await page.$eval('.deux', e => e.classList.contains('edition')) && await page.$eval('.ob-plus', e => e.hidden) && await page.$eval('.pied-ed', e => parseFloat(getComputedStyle(e).bottom) >= 60));
  await page.screenshot({ path: `${CAPT}/telephone-fiche.png`, fullPage: false });
  ok('9 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

await navigateur.close();
bilan(CAPT);
