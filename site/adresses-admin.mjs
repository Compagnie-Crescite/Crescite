// Ne rien perdre en partant, et chaque chose à son adresse, dans l'administration (admin/index.html, tiroir.js,
// gestes.js, notes.js), vérifiés dans Chromium, hors ligne, sur la base fictive commune (admin-fictif.mjs) :
// - une fiche, un tiroir, une feuille de modification, une note commencés : changer de rubrique, le bouton précédent,
//   Annuler, Échap posent la question dans une boîte de la charte (jamais confirm()) ; « Rester » garde la saisie et
//   l'adresse, « Quitter sans enregistrer » mène où l'on allait ; rien de changé, aucune question ; fermer l'onglet, la
//   question du navigateur ;
// - un tiroir a son adresse (?tiroir=…) : le précédent du navigateur le referme sans redessiner la page, le suivant le
//   rouvre, un rechargement (un lien partagé) le rouvre ; le titre de l'onglet dit ce qui est ouvert ;
// - une fiche ouverte dit où l'on est par un fil d'Ariane cliquable (« Spectacles › Bérénice »), réduit au téléphone au
//   retour vers le niveau d'au-dessus ; l'en-tête d'un tiroir nomme sa rubrique, en lien ;
// - une liste garde son état dans l'adresse (?statut=…&q=…) : ses fiches, le retour, le précédent, un rechargement, un
//   lien partagé la rouvrent filtrée, une autre rubrique ne prend pas ses filtres ; l'en-tête du mois reste en vue ;
// - une liste vide dit pourquoi et propose le geste utile (« Effacer les filtres »), une colonne du Kanban aussi ;
// - les titres restent visibles : le mois des Feuilles de route, le jour du Journal, le nom des colonnes du Kanban (et au
//   téléphone le mois de Représentations), collés sous l'en-tête quand la page défile ;
// - le témoin de la connexion : « À jour », « Hors ligne · lu à l'instant » quand le réseau tombe (les lecteurs d'écran
//   l'entendent), la base relue à son retour, le bouton qui la relit ;
// - l'aide « ? » : les raccourcis par contexte (la touche, le bouton de l'en-tête), au téléphone les gestes (« Plus »).
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

// ================================================================================ se situer : le fil d'Ariane
{
  const fil = page => page.evaluate(() => { const n = document.querySelector('#vue .fil-ariane'); if (!n) return null;
    const vus = [...n.querySelectorAll('li')].filter(li => li.getClientRects().length);
    return { tout: [...n.querySelectorAll('li')].map(li => li.textContent.trim()), vus: vus.map(li => li.textContent.trim()), liens: [...n.querySelectorAll('a')].map(a => a.getAttribute('href')),
      ici: n.querySelector('[aria-current="page"]')?.textContent, nom: n.getAttribute('aria-label'), avant: n.nextElementSibling?.matches('.titre-ed, .tete'),
      retourVu: !!document.querySelector('#vue .avec-fil > a[data-tt="retour"]')?.getClientRects().length, haut: Math.round(vus[vus.length - 1]?.querySelector('a')?.getBoundingClientRect().height || 0) }; });
  for (const [largeur, hauteur, nom] of [[1440, 900, 'bureau'], [390, 844, 'téléphone']]) {
    const tel = largeur < 600;
    const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur, hauteur, hash: '#/spectacles/berenice' });
    await page.waitForSelector('[data-onglet]', { timeout: 15000 });
    await attendre(page, () => !!document.querySelector('#vue .fil-ariane'));
    const f1 = await fil(page);
    ok(`fil (${nom}) · un spectacle : « Spectacles › Bérénice », nommé, en tête, le dernier marqué`, !!f1 && f1.tout.join(' › ') === 'Spectacles › Bérénice' && f1.liens.join() === '#/spectacles' && f1.ici === 'Bérénice' && f1.nom === 'Fil d’Ariane' && f1.avant, JSON.stringify(f1));
    if (tel) ok('fil (téléphone) · réduit au retour « Spectacles », une cible de 44 px, à la place du bouton ←', f1.vus.join() === 'Spectacles' && f1.haut >= 44 && !f1.retourVu, JSON.stringify(f1));
    else ok('fil (bureau) · tout le chemin se voit, le bouton ← reste', f1.vus.length === 2 && f1.retourVu, JSON.stringify(f1));
    await page.evaluate(() => { location.hash = '#/representations/101'; });
    await attendre(page, () => /Représentations/.test(document.querySelector('#vue .fil-ariane')?.textContent || '') && document.querySelector('#ed-date .titre-ed'));
    const f2 = await fil(page);
    ok(`fil (${nom}) · une date : « Représentations › ven. 30 oct. 2026 · Bérénice » (le jour, puis le spectacle), comme le titre de l’onglet`, !!f2 && f2.tout[0] === 'Représentations' && /^\S+ \d+ \S+ \d{4} · Bérénice$/.test(f2.ici || '') && f2.liens.join() === '#/representations' && /^Bérénice · /.test(await page.title()), `${JSON.stringify(f2)} · ${await page.title()}`);
    await calme(page);
    await page.screenshot({ path: path.join(CAPT, `fil-date-${tel ? 'telephone' : 'bureau'}.png`) });
    await page.click('#vue .fil-ariane .fil-parent a');
    await attendre(page, () => location.hash === '#/representations' && !document.querySelector('#ed-date .titre-ed'));
    ok(`fil (${nom}) · le niveau d’au-dessus ramène à la liste, le fil s’en va`, await page.evaluate(() => location.hash === '#/representations' && !document.querySelector('#vue .fil-ariane')), await adresse(page));
    await page.evaluate(() => { location.hash = '#/planning/proposition/1'; });
    await attendre(page, () => /Propositions/.test(document.querySelector('#vue .fil-ariane')?.textContent || ''));
    const f3 = await fil(page);
    ok(`fil (${nom}) · une proposition : « Planning › Propositions › Option : Théâtre de Flers »`, !!f3 && f3.tout.join(' › ') === 'Planning › Propositions › Option : Théâtre de Flers' && f3.liens.join() === '#/planning,#/planning/propositions' && (!tel || f3.vus.join() === 'Propositions'), JSON.stringify(f3));
    // un tiroir : son en-tête nomme sa rubrique, en lien à l'ordinateur ; au téléphone, son genre (le ← y ramène)
    await page.evaluate(() => { location.hash = '#/accueil'; });
    await page.waitForSelector('.tb-tuile', { timeout: 15000 });
    await page.evaluate(() => TIROIR.ouvrir('#/lieux/5'));
    await attendre(page, () => document.querySelector('.tiroir.la #ed-lieu .titre-ed'));
    const t = await page.evaluate(() => { const lien = document.querySelector('.tiroir .tg-fil a'); return { lien: lien && lien.getClientRects().length ? `${lien.textContent}=${lien.getAttribute('href')}` : null, nom: document.querySelector('.tiroir .tg-nom')?.getClientRects().length ? document.querySelector('.tiroir .tg-nom').textContent : null, titre: document.querySelector('.tiroir .tiroir-titre')?.textContent, page: !!document.querySelector('#vue .fil-ariane') }; });
    ok(`fil (${nom}) · un tiroir : ${tel ? 'son genre, « Lieu »' : 'sa rubrique en lien, « Lieux »'}, puis le nom de la fiche`, (tel ? t.nom === 'Lieu' && !t.lien : t.lien === 'Lieux=#/lieux' && !t.nom) && t.titre === 'Théâtre de Caen — Caen (14)' && !t.page, JSON.stringify(t));
    await calme(page);
    await page.screenshot({ path: path.join(CAPT, `fil-tiroir-${tel ? 'telephone' : 'bureau'}.png`) });
    if (!tel) {
      await page.click('.tiroir .tg-fil a');
      await attendre(page, () => location.hash === '#/lieux' && !document.querySelector('.tiroir'));
      ok('fil (bureau) · le lien du tiroir mène à la rubrique, le tiroir se ferme', await page.evaluate(() => location.hash === '#/lieux' && !document.querySelector('.tiroir') && !new URLSearchParams(location.search).has('tiroir')), await adresse(page));
    }
    ok(`fil (${nom}) · aucune erreur de script`, erreurs.length === 0, erreurs.join(' / '));
    await ctx.close();
  }
}

// ================================================================================ les listes gardent leur état, dans l'adresse
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations' });
  await page.waitForSelector('#f-statut', { timeout: 15000 });
  const pas0 = await page.evaluate(() => history.length);
  await page.selectOption('#f-statut', 'option');
  await page.fill('#f-q', 'flers');
  await attendre(page, () => /statut=option/.test(location.search) && /q=flers/.test(location.search));
  ok('listes · les filtres et la recherche passent dans l’adresse, sans pas de plus dans l’historique', /^\?(?=.*statut=option)(?=.*q=flers)[^#]*#\/representations$/.test(await adresse(page)) && await page.evaluate(() => history.length) === pas0, await adresse(page));
  await page.click('#l-dates a.ligne[href="#/representations/105"]');
  await attendre(page, () => location.hash === '#/representations/105' && document.querySelector('#ed-date .titre-ed'));
  ok('listes · une fiche ouverte de la liste garde les filtres dans son adresse', /statut=option/.test(await adresse(page)) && /q=flers/.test(await adresse(page)), await adresse(page));
  await page.click('#vue .fil-ariane .fil-parent a');
  await attendre(page, () => location.hash === '#/representations' && document.querySelector('#f-statut'));
  ok('listes · le retour d’une fiche rouvre la liste filtrée', await page.evaluate(() => document.querySelector('#f-statut').value === 'option' && document.querySelector('#f-q').value === 'flers' && document.querySelectorAll('#l-dates a.ligne').length === 1), await adresse(page));
  await page.click('.nav a[href="#/lieux"]');
  await attendre(page, () => location.hash === '#/lieux' && document.querySelector('#li-q'));
  ok('listes · une autre rubrique ne prend pas les filtres de la précédente, l’adresse les quitte', !/statut=|q=/.test(await adresse(page)) && await page.$eval('#li-q', e => e.value === ''), await adresse(page));
  await page.selectOption('#li-type', 'etablissement');
  await attendre(page, () => /type=etablissement/.test(location.search));
  await page.goBack();
  await attendre(page, () => location.hash === '#/representations' && document.querySelector('#f-statut'));
  ok('listes · le précédent du navigateur revient à la liste telle qu’on l’avait laissée', /statut=option/.test(await adresse(page)) && await page.$eval('#f-statut', e => e.value === 'option'), await adresse(page));
  await page.click('.nav a[href="#/lieux"]');
  await attendre(page, () => location.hash === '#/lieux' && document.querySelector('#li-type'));
  ok('listes · rouvrir une rubrique depuis l’en-tête la retrouve comme on l’a laissée, et la réécrit dans l’adresse', await page.$eval('#li-type', e => e.value === 'etablissement') && /type=etablissement/.test(await adresse(page)), await adresse(page));
  await page.reload();
  await page.waitForSelector('#li-type', { timeout: 15000 });
  ok('listes · un rechargement rouvre la liste filtrée', await page.$eval('#li-type', e => e.value === 'etablissement') && (await compte(page, '#l-lieux a.ligne')) === 1, await adresse(page));
  ok('listes · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
  // un lien partagé, dans un onglet neuf : la liste s'ouvre filtrée, ce que l'adresse ne dit pas reprend sa valeur d'office
  const b = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '?statut=confirmee&public=scolaire#/representations' });
  await b.page.waitForSelector('#f-statut', { timeout: 15000 });
  ok('listes · un lien partagé (?statut=confirmee&public=scolaire) ouvre la liste filtrée', await b.page.evaluate(() => document.querySelector('#f-statut').value === 'confirmee' && document.querySelector('#f-public').value === 'scolaire' && document.querySelectorAll('#l-dates a.ligne').length === 1), await adresse(b.page));
  // au bureau, l'en-tête du mois reste en vue quand la liste défile
  const colle = await b.page.evaluate(() => { const m = document.querySelector('.deux > .liste .mois'); return m ? getComputedStyle(m).position : ''; });
  ok('listes · au bureau, l’en-tête du mois colle en haut de la liste qui défile', colle === 'sticky', colle);
  await b.ctx.close();
}

// ================================================================================ les listes vides disent pourquoi
for (const [largeur, hauteur, nom] of [[1440, 900, 'bureau'], [390, 844, 'téléphone']]) {
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur, hauteur, hash: '#/representations' });
  await page.waitForSelector('#f-statut', { timeout: 15000 });
  await page.selectOption('#f-statut', 'annulee');
  await page.click('#vue [data-sp="1"]');
  const vide = () => page.evaluate(() => { const v = document.querySelector('#vue .liste-vide'); return v ? { phrase: v.querySelector('p')?.textContent, geste: v.querySelector('.btn')?.textContent, haut: Math.round(v.querySelector('.btn')?.getBoundingClientRect().height || 0) } : null; });
  const v1 = await vide();
  ok(`vides (${nom}) · une liste filtrée sans résultat le dit, et propose « Effacer les filtres » (44 px)`, v1?.phrase === 'Aucune date ne correspond à ces filtres.' && v1.geste === 'Effacer les filtres' && v1.haut >= 44, JSON.stringify(v1));
  await calme(page);
  await page.screenshot({ path: path.join(CAPT, `vide-dates-${largeur < 600 ? 'telephone' : 'bureau'}.png`) });
  await page.click('#vue .liste-vide [data-effacer-filtres]');
  await attendre(page, () => !document.querySelector('#vue .liste-vide') && document.querySelectorAll('#l-dates a.ligne').length > 0);
  ok(`vides (${nom}) · « Effacer les filtres » rend toute la liste, les filtres à leur valeur d’office, l’adresse aussi, le focus à la recherche`, await page.evaluate(() => document.querySelector('#f-statut').value === '' && !document.querySelector('#vue [data-sp][aria-pressed="true"]') && !/statut=|spectacle=/.test(location.search) && document.activeElement?.id === 'f-q'), await adresse(page));
  for (const [h, champ, attendu] of [['#/lieux', '#li-q', 'Aucun lieu ne correspond à ces filtres.'], ['#/equipe', '#eq-q', 'Personne ne correspond.'], ['#/journal', '#j-q', 'Aucune modification ne correspond.'], ['#/diffusion/devis', '#dv-q', 'Aucune demande ne correspond.']]) {
    await page.evaluate(x => { location.hash = x; }, h);
    await page.waitForSelector(champ, { timeout: 8000 });
    if (h === '#/journal') await page.waitForSelector('.journal-ligne', { timeout: 8000 }).catch(() => {});
    await page.fill(champ, 'zzz');
    await attendre(page, () => !!document.querySelector('#vue .liste-vide [data-effacer-filtres]'));
    const v = await vide();
    ok(`vides (${nom}) · ${h} : « ${attendu} », et « Effacer les filtres »`, v?.phrase === attendu && v.geste === 'Effacer les filtres', JSON.stringify(v));
    await page.click('#vue .liste-vide [data-effacer-filtres]');
    await attendre(page, a => !document.querySelector('#vue .liste-vide') && document.querySelector(a).value === '', 4000, champ);
    if (h === '#/lieux') ok(`vides (${nom}) · « Effacer les filtres » rend les lieux`, (await compte(page, '#l-lieux a.ligne')) === 4);
  }
  await page.evaluate(() => { location.hash = '#/diffusion'; });
  await page.waitForSelector('.crm-colonne', { timeout: 8000 });
  const kanban = await page.evaluate(() => getComputedStyle(document.querySelector('.crm-colonne[data-colonne="option_posee"] .crm-cartes, .crm-colonne:nth-child(3) .crm-cartes'), '::before').content);
  ok(`vides (${nom}) · une colonne du Kanban sans piste le dit`, /Aucune piste/.test(kanban), kanban);
  ok(`vides (${nom}) · aucune erreur de script`, erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ les titres restent visibles : le mois, le jour, la colonne
for (const [largeur, hauteur, nom] of [[1440, 900, 'bureau'], [390, 844, 'téléphone']]) {
  const tel = largeur < 600;
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur, hauteur, hash: '#/accueil' });
  await page.waitForSelector('#vue', { timeout: 15000 });
  if (tel) await page.waitForSelector('.ob-barre', { timeout: 8000 });     // (la barre du téléphone se pose juste après la page)
  // les titres arrimés : le mois des Feuilles de route, le jour du Journal, le nom des colonnes du Kanban ; au téléphone, le
  // mois de Représentations ; chacun collé sous l'en-tête (--haut-barre, sa hauteur) quand on fait défiler la page
  await page.setViewportSize({ width: largeur, height: 420 });
  const arrime = sel => page.evaluate(s => { const hb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--haut-barre')), xs = [...document.querySelectorAll(s)];
    // (la page défile jusqu'à ce que le plus long des blocs qui les portent passe sous l'en-tête : son titre doit y rester)
    const p = xs.map(x => x.parentElement).sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0];
    if (p) window.scrollTo(0, p.getBoundingClientRect().top + window.scrollY - hb + 150);
    const barre = Math.round(document.querySelector('.barre').getBoundingClientRect().bottom);
    return { n: xs.length, sticky: xs.length > 0 && xs.every(x => getComputedStyle(x).position === 'sticky'), hb, barre, colle: xs.some(x => Math.abs(x.getBoundingClientRect().top - hb) < 2), deb: document.documentElement.scrollWidth > innerWidth }; }, sel);
  const vers = async (h, sel) => { await page.evaluate(x => { location.hash = x; }, h); await page.waitForSelector(sel, { timeout: 8000 }); await page.waitForTimeout(500); return arrime(sel); };
  const fr = await vers('#/feuilles', '.fr-liste [data-liste] .mois');
  ok(`arrimés (${nom}) · Feuilles de route : les dates par mois, le mois collé sous l'en-tête`, fr.n >= 3 && fr.sticky && fr.colle && fr.hb === fr.barre && !fr.deb, JSON.stringify(fr));
  const jo = await vers('#/journal', '#l-journal .j-jour');
  ok(`arrimés (${nom}) · Journal : les modifications par jour (« Aujourd’hui »…), le jour collé sous l'en-tête`, jo.n >= 2 && jo.sticky && jo.colle && (await texte(page, '#l-journal .j-jour')) === 'Aujourd’hui', JSON.stringify(jo));
  const kb = await vers('#/diffusion', '.crm-col-tete');
  ok(`arrimés (${nom}) · Kanban : le nom de chaque colonne collé sous l'en-tête pendant qu'on fait défiler ses cartes, sans cadre qui défile de côté`, kb.n === 5 && kb.sticky && kb.colle && (await page.$eval('#kanban-zone', e => getComputedStyle(e).overflowX)) === 'visible' && !kb.deb, JSON.stringify(kb));
  await calme(page);
  await page.screenshot({ path: path.join(CAPT, `kanban-arrime-${tel ? 'telephone' : 'bureau'}.png`) });
  if (tel) {
    const re = await vers('#/representations', '#l-dates .mois');
    ok('arrimés (téléphone) · Représentations : le mois collé sous l’en-tête (la liste suit la page)', re.sticky && re.colle, JSON.stringify(re));
  }
  ok(`arrimés (${nom}) · aucune erreur de script`, erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ le témoin de la connexion : à jour, hors ligne, le retour
for (const [largeur, hauteur, nom] of [[1440, 900, 'bureau'], [390, 844, 'téléphone']]) {
  const tel = largeur < 600;
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur, hauteur, hash: '#/accueil' });
  await page.waitForSelector('[data-temoin]', { timeout: 15000 });
  if (tel) await page.waitForSelector('.ob-barre', { timeout: 8000 });     // (la barre du téléphone se pose juste après la page)
  await attendre(page, () => document.querySelector('[data-temoin]').dataset.etat === 'ajour');
  const temoin = () => page.evaluate(() => { const b = document.querySelector('[data-temoin]'), r = b.getBoundingClientRect(); return { etat: b.dataset.etat, texte: b.textContent.trim(), l: Math.round(r.width), h: Math.round(r.height), sr: document.querySelector('#sr-connexion')?.textContent || '' }; });
  const t1 = await temoin();
  ok(`témoin (${nom}) · dans l'en-tête : « À jour », le bouton qui relit la base${tel ? ', une cible de 44 px' : ''}`, t1.etat === 'ajour' && /^À jour/.test(t1.texte) && /Actualiser/.test(t1.texte) && (!tel || (t1.l >= 44 && t1.h >= 44)), JSON.stringify(t1));
  await ctx.setOffline(true);
  await attendre(page, () => document.querySelector('[data-temoin]').dataset.etat === 'horsligne', 3000);
  const t2 = await temoin();
  ok(`témoin (${nom}) · hors ligne : « Hors ligne · lu à l’instant », et les lecteurs d'écran l'entendent`, t2.etat === 'horsligne' && /Hors ligne · lu à l’instant/.test(t2.texte) && /^Connexion perdue/.test(t2.sr) && !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), JSON.stringify(t2));
  await calme(page);
  await page.screenshot({ path: path.join(CAPT, `temoin-horsligne-${tel ? 'telephone' : 'bureau'}.png`) });
  if (!tel) ok('témoin (bureau) · l’en-tête garde ses lignes hors ligne (l’adresse du compte cède la place)', await page.evaluate(() => Math.round(document.querySelector('.barre').getBoundingClientRect().height)) <= 96);
  await ctx.setOffline(false);
  await attendre(page, () => document.querySelector('[data-temoin]').dataset.etat === 'ajour', 6000);
  const t3 = await temoin();
  ok(`témoin (${nom}) · le réseau revient : la base se relit, « À jour », « Connexion rétablie »`, t3.etat === 'ajour' && /^Connexion rétablie/.test(t3.sr), JSON.stringify(t3));
  await page.click('[data-temoin]');
  await attendre(page, () => [...document.querySelectorAll('#annonces .annonce')].some(a => /La base est relue/.test(a.textContent)), 6000);
  ok(`témoin (${nom}) · le toucher relit la base et le dit`, await page.evaluate(() => [...document.querySelectorAll('#annonces .annonce')].some(a => /La base est relue/.test(a.textContent))));
  ok(`témoin (${nom}) · aucune erreur de script`, erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ l'aide « ? » : les raccourcis, au doigt les gestes
for (const [largeur, hauteur, nom] of [[1440, 900, 'bureau'], [390, 844, 'téléphone']]) {
  const tel = largeur < 600;
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur, hauteur, hash: '#/accueil' });
  await page.waitForSelector('[data-temoin]', { timeout: 15000 });
  if (tel) await page.waitForSelector('.ob-barre', { timeout: 8000 });     // (la barre du téléphone se pose juste après la page)
  // l'aide : « ? » (au bureau, la touche et le bouton de l'en-tête ; au téléphone, « Gestes et raccourcis » dans « Plus »)
  if (!tel) {
    await page.focus('#b-aide');
    await page.keyboard.press('?');
    await attendre(page, () => !!document.querySelector('dialog.gq-aide[open]'), 3000);
    const a = await page.evaluate(() => { const d = document.querySelector('dialog.gq-aide[open]'); return d && { titre: d.querySelector('h2').textContent, ici: d.querySelector('section h3')?.textContent, kbd: [...d.querySelectorAll('kbd')].map(k => k.textContent), focus: document.activeElement?.textContent }; });
    ok('aide (bureau) · « ? » ouvre les raccourcis clavier, le tableau de bord d’abord (« ici »), Ctrl K, J, Alt, « Fermer » a le focus', a && a.titre === 'Raccourcis clavier' && /Le tableau de bord/.test(a.ici) && /ici/.test(a.ici) && ['Ctrl', 'K', 'J', 'Alt', 'Échap'].every(k => a.kbd.includes(k)) && a.focus === 'Fermer', JSON.stringify(a));
    await calme(page);
    await page.screenshot({ path: path.join(CAPT, 'aide-bureau.png') });
    await page.keyboard.press('Escape');
    await attendre(page, () => !document.querySelector('dialog.gq-aide'), 2000);
    ok('aide (bureau) · Échap la ferme, le focus revient au bouton « ? »', await page.evaluate(() => !document.querySelector('dialog.gq-aide') && document.activeElement?.id === 'b-aide'));
    await page.evaluate(() => { location.hash = '#/journal'; });
    await page.waitForSelector('#j-q', { timeout: 8000 });
    await page.focus('#j-q'); await page.keyboard.type('?');
    ok('aide (bureau) · « ? » tapé dans un champ reste un « ? »', await page.evaluate(() => !document.querySelector('dialog.gq-aide') && document.querySelector('#j-q').value === '?'));
    await page.fill('#j-q', '');
  } else {
    await page.click('.ob-barre [data-ob="plus"]');
    await page.waitForSelector('.ob-voile.la .ob-feuille', { timeout: 3000 });
    await page.waitForTimeout(300);
    await page.click('.ob-item:has-text("Gestes et raccourcis")');
    await attendre(page, () => !!document.querySelector('dialog.gq-aide[open]'), 3000);
    const a = await page.evaluate(() => { const d = document.querySelector('dialog.gq-aide[open]'); return d && { titre: d.querySelector('h2').textContent, gestes: [...d.querySelectorAll('.gq-geste')].map(x => x.textContent), kbd: d.querySelectorAll('kbd').length, bas: Math.round(d.getBoundingClientRect().bottom) }; });
    ok('aide (téléphone) · « Plus » → « Gestes et raccourcis » : les gestes à la place des touches, depuis le bas', a && a.titre === 'Gestes et raccourcis' && a.gestes.includes('Appui long') && a.gestes.includes('« + »') && a.kbd === 0 && a.bas >= 840, JSON.stringify(a));
    await calme(page);
    await page.screenshot({ path: path.join(CAPT, 'aide-telephone.png') });
    await page.click('dialog.gq-aide [data-gq-fermer]');
    await attendre(page, () => !document.querySelector('dialog.gq-aide'), 2000);
    ok('aide (téléphone) · « Fermer » la ferme, le focus revient à « Plus »', await page.evaluate(() => !document.querySelector('dialog.gq-aide') && document.activeElement?.dataset.ob === 'plus'));
  }
  ok(`aide (${nom}) · aucune erreur de script`, erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

await navigateur.close();
bilan(CAPT);
