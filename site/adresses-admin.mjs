// Ne rien perdre en partant, et chaque chose à son adresse, dans l'administration (admin/index.html, tiroir.js,
// gestes.js, notes.js), vérifiés dans Chromium, hors ligne, sur la base fictive commune (admin-fictif.mjs) :
// - une fiche, un tiroir, une feuille de modification, une note commencés : changer de rubrique, le bouton précédent,
//   Annuler, Échap posent la question dans une boîte de la charte (jamais confirm()) ; « Rester » garde la saisie et
//   l'adresse, « Quitter sans enregistrer » mène où l'on allait ; rien de changé, aucune question ; fermer l'onglet, la
//   question du navigateur ;
// - un tiroir a son adresse (?tiroir=…) : le précédent du navigateur le referme sans redessiner la page, le suivant le
//   rouvre, un rechargement (un lien partagé) le rouvre ; le titre de l'onglet dit ce qui est ouvert.
//   python3 site/build.py && node site/adresses-admin.mjs
// Captures dans site/dist/shots-adresses/. Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, ok, calme, ouvrir, texte, compte, tuile, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-adresses');
fs.mkdirSync(CAPT, { recursive: true });
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const attendre = (page, fn, ms = 6000, arg = null) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true).catch(() => false);
const question = async page => { const v = await attendre(page, () => !!document.querySelector('dialog.gq[open]'), 4000); await page.waitForTimeout(400); return v; };   // (la boîte ignore les clics de ses 350 premières ms)
const adresse = page => page.evaluate(() => location.search + location.hash);

// ================================================================================ au bureau
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/spectacles/berenice' });
  let natifs = 0;
  page.on('dialog', d => { natifs++; d.dismiss().catch(() => {}); });
  await page.waitForSelector('[data-onglet]', { timeout: 15000 });
  await attendre(page, () => document.title.startsWith('Bérénice'));
  ok('titre · une fiche de spectacle : « Bérénice · Spectacles · Administration · Compagnie Crescite »', (await page.title()) === 'Bérénice · Spectacles · Administration · Compagnie Crescite', await page.title());
  // rien de changé : on part sans question
  await page.click('.nav a[href="#/lieux"]');
  await attendre(page, () => location.hash === '#/lieux' && document.querySelector('#vue h1'));
  ok('partir · rien de changé : la rubrique change sans question', !(await page.$('dialog.gq[open]')) && natifs === 0);
  await attendre(page, () => document.title.startsWith('Lieux'));
  ok('titre · une rubrique : « Lieux · Administration · Compagnie Crescite »', (await page.title()) === 'Lieux · Administration · Compagnie Crescite', await page.title());
  // une fiche de lieu changée : changer de rubrique pose la question
  await page.evaluate(() => { location.hash = '#/lieux/5'; });
  await page.waitForSelector('#ed-lieu #li-f', { timeout: 8000 });
  await attendre(page, () => /Théâtre de Caen/.test(document.title));
  ok('titre · une fiche de lieu nomme le lieu', /^Théâtre de Caen.* · Lieux · Administration · Compagnie Crescite$/.test(await page.title()), await page.title());
  const champ = '#ed-lieu input:not([type=hidden]):not([type=checkbox]):not([readonly])';
  const avant = await page.$eval(champ, e => e.value);
  await page.fill(champ, `${avant} (essai)`);
  await page.click('.nav a[href="#/spectacles"]');
  ok('partir · une fiche changée : la boîte de la charte, pas confirm()', await question(page) && natifs === 0);
  ok('partir · la boîte : « Rester » a le focus, l’adresse est revenue à la fiche', await page.evaluate(() => document.activeElement?.dataset.gq === 'non') && (await adresse(page)) === '#/lieux/5', await adresse(page));
  await calme(page); await page.screenshot({ path: `${CAPT}/question-bureau.png` });
  await page.click('dialog.gq [data-gq="non"]');
  ok('partir · « Rester » : la fiche et la saisie restent', !(await page.$('dialog.gq[open]')) && (await page.$eval(champ, e => e.value)) === `${avant} (essai)` && (await adresse(page)) === '#/lieux/5');
  // le bouton précédent, de même
  await page.goBack();
  ok('partir · le bouton précédent pose la même question', await question(page) && (await adresse(page)) === '#/lieux/5', await adresse(page));
  await page.keyboard.press('Escape');
  ok('partir · Échap répond « Rester »', !(await page.$('dialog.gq[open]')) && (await page.$eval(champ, e => e.value)) === `${avant} (essai)`);
  await page.goBack();
  await question(page);
  await page.click('dialog.gq [data-gq="oui"]');
  ok('partir · le précédent, « Quitter sans enregistrer » : la rubrique d’avant, l’historique entier', await attendre(page, () => location.hash === '#/lieux' && document.querySelector('#vue h1')) && await page.evaluate(() => history.length) >= 3, await adresse(page));
  await page.goForward();
  await page.waitForSelector('#ed-lieu #li-f', { timeout: 8000 });
  await page.fill(champ, `${avant} (essai)`);
  await page.click('.nav a[href="#/spectacles"]');
  await question(page);
  await page.click('dialog.gq [data-gq="oui"]');
  ok('partir · « Quitter sans enregistrer » mène où l’on allait', await attendre(page, () => location.hash === '#/spectacles' && document.querySelector('#vue h1')));
  await page.goBack();
  ok('partir · puis le précédent revient à la fiche quittée, sans question', await attendre(page, () => location.hash === '#/lieux/5' && document.querySelector('#ed-lieu #li-f')) && !(await page.$('dialog.gq[open]')), await adresse(page));
  // fermer l'onglet : la question du navigateur, seulement s'il y a quelque chose à perdre
  await page.evaluate(() => { location.hash = '#/lieux/6'; });
  await page.waitForSelector('#ed-lieu #li-f', { timeout: 8000 });
  await page.click(champ);   // (un geste : le navigateur ne pose sa question qu'à une page touchée)
  await page.fill(champ, 'Le Volcan (essai)');
  const avantOnglet = natifs;
  page.removeAllListeners('dialog');
  const vu = new Promise(r => { page.once('dialog', d => { r(d.type()); d.dismiss().catch(() => {}); }); setTimeout(() => r(null), 5000); });
  await page.close({ runBeforeUnload: true });
  const quitte = await vu;
  ok('partir · fermer l’onglet sur une fiche changée : la question du navigateur (beforeunload)', quitte === 'beforeunload' && avantOnglet === 0, String(quitte));
  ok('aucune erreur de script (bureau)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ les tiroirs : leur adresse, le précédent
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900 });
  let natifs = 0;
  page.on('dialog', d => { natifs++; d.dismiss().catch(() => {}); });
  await page.waitForSelector(`${tuile('prochaines')} .tb-l`, { timeout: 15000 });
  await page.evaluate(() => { window.__vues = 0; APRES_VUE.push(() => { window.__vues++; }); });
  await page.click(`${tuile('prochaines')} a.tb-l[href="#/representations/101"]`);
  await attendre(page, () => document.querySelector('.tiroir.la #ed-date #s-org'));
  ok('tiroir · une date en tiroir : l’adresse de la page, le tiroir dans ?tiroir=', (await adresse(page)) === '?tiroir=representations/101#/accueil', await adresse(page));
  ok('titre · un tiroir ouvert : sa fiche et sa rubrique', /^Bérénice · .+ · Représentations · Administration · Compagnie Crescite$/.test(await page.title()), await page.title());
  await page.click('.tiroir #d-lieu-fiche a[href="#/lieux/5"]');
  await attendre(page, () => document.querySelectorAll('.tiroir.la').length === 2);
  ok('tiroir · deux tiroirs : les deux dans l’adresse', (await adresse(page)) === '?tiroir=representations/101,lieux/5#/accueil', await adresse(page));
  await page.goBack();
  await attendre(page, () => document.querySelectorAll('.tiroir').length === 1);
  ok('tiroir · le précédent du navigateur ferme le dernier tiroir, la date reste', (await compte(page, '.tiroir')) === 1 && (await compte(page, '.tiroir #ed-date')) === 1 && (await adresse(page)) === '?tiroir=representations/101#/accueil', await adresse(page));
  await page.goBack();
  await attendre(page, () => !document.querySelector('.tiroir'));
  ok('tiroir · le précédent encore : plus de tiroir, le tableau de bord n’a pas été redessiné', (await compte(page, '.tiroir')) === 0 && (await adresse(page)) === '#/accueil' && await page.evaluate(() => window.__vues === 0) && (await compte(page, tuile('prochaines'))) === 1, `${await adresse(page)} vues=${await page.evaluate(() => window.__vues)}`);
  ok('titre · le tiroir fermé : le titre de la page', (await page.title()) === 'Tableau de bord · Administration · Compagnie Crescite', await page.title());
  await page.goForward();
  await attendre(page, () => document.querySelector('.tiroir.la #ed-date'));
  ok('tiroir · le suivant le rouvre', (await compte(page, '.tiroir #ed-date')) === 1 && (await adresse(page)) === '?tiroir=representations/101#/accueil', await adresse(page));
  // fermé à la main : on revient d'un pas (le précédent ne le rouvre pas)
  await page.click('.tiroir [data-tiroir-fermer]');
  await attendre(page, () => !document.querySelector('.tiroir') && location.search === '');
  ok('tiroir · fermé à la main : l’adresse revient à la page', (await adresse(page)) === '#/accueil', await adresse(page));
  // un tiroir changé : le précédent pose la question, « Rester » le garde
  await page.click(`${tuile('prochaines')} a.tb-l[href="#/representations/101"]`);
  await attendre(page, () => document.querySelector('.tiroir.la #ed-date #s-org'));
  await page.fill('.tiroir #s-org', 'Organisateur d’essai');
  await page.goBack();
  ok('tiroir · changé : le précédent pose la question', await question(page) && natifs === 0);
  await calme(page); await page.screenshot({ path: `${CAPT}/tiroir-question.png` });
  await page.click('dialog.gq [data-gq="non"]');
  await page.waitForTimeout(300);
  ok('tiroir · « Rester » : le tiroir, sa saisie et son adresse restent', (await compte(page, '.tiroir #ed-date')) === 1 && (await page.$eval('.tiroir #s-org', e => e.value)) === 'Organisateur d’essai' && (await adresse(page)) === '?tiroir=representations/101#/accueil', await adresse(page));
  await page.click('.tiroir [data-tiroir-fermer]');
  ok('tiroir · « Fermer » changé : la question aussi', await question(page));
  await page.click('dialog.gq [data-gq="oui"]');
  await attendre(page, () => !document.querySelector('.tiroir'));
  ok('tiroir · « Fermer sans enregistrer » le ferme', (await compte(page, '.tiroir')) === 0 && (await adresse(page)) === '#/accueil', await adresse(page));
  // l'adresse d'un tiroir se recharge (un lien partagé entre administrateurs)
  await page.goto(page.url().replace(/#.*$/, '').replace(/\?.*$/, '') + '?tiroir=lieux/5#/accueil');
  await attendre(page, () => document.querySelector('.tiroir.la #ed-lieu #li-f'), 15000);
  ok('tiroir · un lien ?tiroir=lieux/5 rouvre le lieu par-dessus le tableau de bord', (await compte(page, '.tiroir #ed-lieu')) === 1 && (await compte(page, tuile('prochaines'))) === 1);
  await page.evaluate(() => { location.hash = '#/spectacles'; });   // un lien de la page (le voile du tiroir couvre la barre)
  await attendre(page, () => location.hash === '#/spectacles' && !document.querySelector('.tiroir'));
  ok('tiroir · changer de rubrique ferme le tiroir et l’ôte de l’adresse', (await compte(page, '.tiroir')) === 0 && (await adresse(page)) === '#/spectacles', await adresse(page));
  // la fenêtre d'une opportunité (la diffusion) : rien de changé, ✕ la ferme ; commencée, ✕ pose la question
  await page.evaluate(() => { location.hash = '#/diffusion'; });
  await page.waitForSelector('#b-nouveau-prospect', { timeout: 10000 });
  await page.click('#b-nouveau-prospect');
  await page.waitForSelector('#f-prospect-crm', { timeout: 4000 });
  await page.click('#b-fermer-mod-crm');
  ok('opportunité · rien de changé : ✕ ferme la fenêtre sans question', await attendre(page, () => !document.querySelector('#f-prospect-crm')) && !(await page.$('dialog.gq[open]')));
  await page.click('#b-nouveau-prospect');
  await page.waitForSelector('#f-prospect-crm', { timeout: 4000 });
  await page.fill('#crm-structure', 'Le Rayon Vert');
  await page.click('#b-fermer-mod-crm');
  ok('opportunité · commencée : ✕ pose la question, la fenêtre reste', await question(page) && (await compte(page, '#f-prospect-crm')) === 1);
  await page.click('dialog.gq [data-gq="non"]');
  ok('opportunité · « Rester » : la saisie est là', (await page.$eval('#crm-structure', e => e.value)) === 'Le Rayon Vert');
  await page.evaluate(() => { location.hash = '#/accueil'; });
  ok('opportunité · commencée : changer de rubrique pose la question', await question(page) && (await adresse(page)) === '#/diffusion');
  await page.click('dialog.gq [data-gq="oui"]');
  ok('opportunité · « Quitter sans enregistrer » : le tableau de bord', await attendre(page, () => location.hash === '#/accueil' && !document.querySelector('#f-prospect-crm')) && natifs === 0);
  // les lignes collées du tableur (importer des séances) : Échap pose la question, rien de collé, il ferme
  await page.evaluate(() => { location.hash = '#/representations/tableur'; });
  await page.waitForSelector('#tab-importer', { timeout: 10000 });
  await page.click('#tab-importer');
  await page.waitForSelector('dialog[open] #tab-im-texte', { timeout: 4000 });
  await page.fill('#tab-im-texte', `${'x\t'.repeat(3)}Bérénice`);
  await page.keyboard.press('Escape');
  ok('tableur · des lignes collées : Échap pose la question, la fenêtre reste', await question(page) && (await compte(page, 'dialog[open] #tab-im-texte')) === 1);
  await page.click('dialog.gq [data-gq="non"]');
  await page.fill('#tab-im-texte', '');
  await page.keyboard.press('Escape');
  ok('tableur · rien de collé : Échap ferme sans question', await attendre(page, () => !document.querySelector('#tab-im-texte')) && !(await page.$('dialog.gq[open]')));
  ok('aucune erreur de script (tiroirs)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ une note, une feuille de modification ; au téléphone
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 390, hauteur: 844, hash: '#/lieux/5' });
  let natifs = 0;
  page.on('dialog', d => { natifs++; d.dismiss().catch(() => {}); });
  await page.waitForSelector('#ed-lieu #li-f', { timeout: 15000 });
  await attendre(page, () => document.querySelector('#ed-lieu .nt-form textarea'), 8000);
  if (await page.$('#ed-lieu .nt-form textarea')) {
    await page.fill('#ed-lieu .nt-form textarea', 'Rappeler la régie lundi');
    await page.evaluate(() => { location.hash = '#/lieux'; });
    ok('note · une note commencée : quitter la fiche pose la question', await question(page) && natifs === 0 && (await adresse(page)) === '#/lieux/5');
    await calme(page); await page.screenshot({ path: `${CAPT}/question-telephone.png` });
    const boite = await page.$eval('dialog.gq', d => { const r = d.getBoundingClientRect(); return { bas: Math.round(innerHeight - r.bottom), large: Math.round(r.width), boutons: [...d.querySelectorAll('button')].map(b => Math.round(b.getBoundingClientRect().height)) }; });
    ok('note · au téléphone, la boîte monte du bas, ses boutons font 44 px', boite.bas <= 1 && boite.large >= 388 && boite.boutons.every(h => h >= 44), JSON.stringify(boite));
    await page.click('dialog.gq [data-gq="non"]');
    ok('note · « Rester » : la note commencée est toujours là', (await page.$eval('#ed-lieu .nt-form textarea', e => e.value)) === 'Rappeler la régie lundi');
    await page.fill('#ed-lieu .nt-form textarea', '');
    await page.evaluate(() => { location.hash = '#/lieux'; });
    await attendre(page, () => location.hash === '#/lieux' && document.querySelector('#vue h1'));
    ok('note · effacée : on part sans question', !(await page.$('dialog.gq[open]')) && (await adresse(page)) === '#/lieux');
  } else ok('note · le bloc des notes est là', false, 'pas de .nt-form dans la fiche du lieu');
  // une feuille de modification (GESTES.formulaire) changée : Annuler pose la question, rien de changé n'en pose pas
  const ouvrirFeuille = () => page.evaluate(() => { window.__f = GESTES.formulaire({ titre: 'Essai', champs: [{ k: 'texte', t: 'texte', l: 'Texte', valeur: 'avant' }] }); });
  await ouvrirFeuille();
  await page.waitForSelector('.gf form', { timeout: 4000 });
  await page.click('.gf [data-gf-annuler]:not(.gf-voile)');
  ok('feuille · rien de changé : Annuler ferme sans question', await attendre(page, () => !document.querySelector('.gf')) && !(await page.$('dialog.gq[open]')));
  await ouvrirFeuille();
  await page.waitForSelector('.gf form', { timeout: 4000 });
  await page.fill('.gf [name="texte"]', 'après');
  await page.click('.gf [data-gf-annuler]:not(.gf-voile)');
  ok('feuille · changée : Annuler pose la question par-dessus la feuille', await question(page) && (await compte(page, '.gf form')) === 1);
  await page.click('dialog.gq [data-gq="non"]');
  ok('feuille · « Rester » : la feuille et sa saisie restent', (await page.$eval('.gf [name="texte"]', e => e.value)) === 'après');
  await page.evaluate(() => { location.hash = '#/spectacles'; });
  ok('feuille · changée : changer de rubrique pose la question, la feuille reste', await question(page) && (await compte(page, '.gf form')) === 1 && (await adresse(page)) === '#/lieux');
  await page.click('dialog.gq [data-gq="oui"]');
  ok('feuille · « Quitter sans enregistrer » ferme la feuille et change de rubrique', await attendre(page, () => !document.querySelector('.gf') && location.hash === '#/spectacles') && natifs === 0);
  ok('aucune erreur de script (téléphone)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

await navigateur.close();
bilan(CAPT);
