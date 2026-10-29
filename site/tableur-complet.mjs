// Le tableur Complet, chaque champ atteignable (rubrique Représentations, vue « Tableur » en Complet : ?mode=complet#/representations/tableur),
// vérifié dans Chromium, hors ligne, sur la base fictive commune (admin-fictif.mjs).
//   node site/tableur-complet.mjs
// Ce que le banc regarde : le menu « Jeu » (la disposition d'origine, Site, Tournée, Suivi, Bilan, Diffusion, Tout : les colonnes de chaque jeu, vides
// comprises, la préférence qui le retient), les colonnes nouvelles (la ligne du site, les précisions du site, la billetterie de la séance, le nombre de
// représentations, la précision, la fin de période, la saison, la feuille de route, « Modifié le… par… », les sources) et ce qu'elles écrivent ou
// refusent d'écrire (une case figée dit pourquoi), la diffusion (le montant de cession : cadenas, bande, jamais exporté sans la case « Inclure la
// diffusion (confidentiel) » ; l'étape de la piste en lecture), l'icône « fiche » et Ctrl+Entrée (la date dans le tiroir, sur le champ de la case, la
// grille qui se redessine derrière, le focus qui revient), le garde-fou d'une date « période » (la case demande avant d'ajouter une séance ; le collage
// et Suppr n'en créent jamais), « Détacher cette séance dans sa propre date » (un seul « Annuler »), l'import de toutes les colonnes reconnues, le
// téléphone. Les captures vont dans site/dist/shots-tableur-complet/. Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, URL0, UID, plus, ilYA, DB, ECRITURES, MODIFS, ok, calme, ouvrir, texte, compte, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-tableur-complet');
// une exception en route (un élément qui manque) : ce qui a été vérifié jusque-là est dit avant la sortie en erreur
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
const attendre = (page, fn, ms = 6000, arg = null) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);

// ---- ce que le banc lit dans la page : une case se trouve par sa ligne (data-l) et sa colonne (la classe c-<clé>)
const CASE = (l, k) => `#tab-corps tr[data-l="${l}"] td.c-${k}`;
const enTetes = page => page.$$eval('#tab-tete th', xs => xs.map(x => x.dataset.k));
const etat = page => texte(page, '#tab-etat');
const rpcs = n0 => MODIFS.slice(n0).filter(m => m.rpc === 'crescite_enregistrer_date');
const termine = page => attendre(page, () => /^(Enregistré|Annulé|Pas enregistré|Retour impossible|Rien|Nouvelle date|Import|Séance du|Pas détachée)/.test(document.querySelector('#tab-etat')?.textContent || ''), 8000);
const dateDe = id => DB.crescite_dates.find(d => d.id === id);
// l'écriture d'une préférence part après le geste, de façon asynchrone : on attend qu'elle soit là
async function ecritureEgale(cle, test, ms = 3000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (test(ECRITURES.filter(e => e.cle === cle).at(-1)?.valeur)) return true; await new Promise(r => setTimeout(r, 50)); } return false; }
const colonnesGardees = () => ECRITURES.filter(e => e.cle === 'tableur.colonnes').at(-1)?.valeur;
// un texte de tableur « collé » : Playwright hors ligne n'a pas de presse-papiers, l'événement est construit dans la page
const coller = (page, tsv) => page.evaluate(t => { const dt = new DataTransfer(); dt.setData('text/plain', t); document.querySelector('#tab').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, tsv);
// se placer sur une case : un clic, sauf si elle est déjà la case active (un clic sur elle se mettrait à écrire)
async function aller(page, sel) {
  if (await page.$eval(sel, td => td.classList.contains('actif'))) await page.focus(sel); else await page.click(sel);
  await attendre(page, s => document.activeElement?.matches(s), 2000, sel);
}
// écrire dans une case : Entrée, le texte, Entrée
async function ecrire(page, sel, texteTape) {
  await aller(page, sel);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#tab-corps .tab-ed', { timeout: 4000 });
  await page.keyboard.type(texteTape);
  await page.keyboard.press('Enter');
}
const jj = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
// la base fictive est partagée : chaque bloc repart de celle du début (les écritures des blocs d'avant n'y restent pas)
const DEPART = structuredClone(DB);
const repartir = () => { for (const k of Object.keys(DB)) DB[k] = structuredClone(DEPART[k]); DB.crescite_preferences = [{ user_id: UID, cle: 'tableur.mode', valeur: 'complet' }]; ECRITURES.length = 0; };   // (le tableur s'ouvre en Simple : ces essais sont ceux du Complet)
// ce que le banc ajoute à la base fictive, avant ouvrir() (repartir() le retire) : une ligne du site et un nombre de représentations sur des dates sans séance,
// le montant de cession de la 101, une piste de diffusion qui a donné la 101, la dernière modification de la 102, une équipe avec fonction et note sur la 103
function garnir() {
  dateDe(105).intitule = 'Flers, soirée de gala'; dateDe(105).nb_representations = 3; dateDe(106).details = [{ texte: 'Entrée libre', lien: null }, { texte: 'Sur réservation', lien: null }];
  dateDe(102).modifie_le = ilYA(30); dateDe(102).modifie_par = UID; dateDe(102).source = 'ancien site';
  DB.crescite_dates_suivi.find(s => s.date_id === 101).montant_cession = 1800;
  DB.crescite_diffusion_prospects[0].date_convertie_id = 101;
  DB.crescite_dates_suivi.push({ date_id: 103, organisateur: 'Lycée Voltaire', contact: 'Mme Rey', contrat: 'envoyé', notes: '', montant_cession: 900 });
  DB.crescite_equipes.push({ date_id: 103, personne_id: 3, present: true, fonction: 'remplace Camille', note: 'train de 8h' });
}

// ================================================================================ 1 · le menu « Jeu » et les colonnes nouvelles
{
  repartir(); garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  const origine = await enTetes(page);
  ok('1 · la disposition d’origine est celle d’avant (le montant, rempli sur la 101, y est) et se termine par l’icône « fiche »', origine.join() === 'jour,spectacle,heure,lieu,commune,public,statut,nature,distribution,organisateur,contact,contrat,montant,site,fiche', origine.join());
  ok('1 · aucune des colonnes nouvelles n’y est (elles viennent avec un jeu, ou par « Colonnes… »), même la ligne du site et le nombre de représentations, remplis', !['intitule', 'details', 'nb-representations', 'precision', 'date-fin', 'saison', 'feuille', 'modifie', 'source-date', 'etape-piste', 'billetterie-seance', 'chiffres-source'].some(k => origine.includes(k)));
  const options = await page.$$eval('#tab-jeu option', xs => xs.map(x => `${x.value}:${x.textContent.trim()}`));
  ok('1 · le menu « Jeu » (un select nommé) propose la disposition d’origine, Site, Tournée, Suivi, Bilan, Diffusion et Tout', options.join(' | ') === ':Disposition d’origine | site:Site | tournee:Tournée | suivi:Suivi | bilan:Bilan | diffusion:Diffusion | tout:Tout' && (await page.$eval('#tab-jeu', s => s.getAttribute('aria-label') === 'Jeu de colonnes' && s.value === '')), options.join(' | '));
  // Jeu : Tout
  await page.selectOption('#tab-jeu', 'tout');
  await attendre(page, () => document.querySelectorAll('#tab-tete th').length > 30);
  const tout = await enTetes(page);
  ok('1 · « Jeu : Tout » montre toutes les colonnes, vides comprises : 34 et l’icône « fiche »', tout.length === 35 && tout.at(-1) === 'fiche' && ['intitule', 'details', 'billetterie-seance', 'nb-representations', 'precision', 'date-fin', 'saison', 'feuille', 'modifie', 'source-date', 'chiffres-source', 'etape-piste', 'fin', 'montant'].every(k => tout.includes(k)), `${tout.length} : ${tout.join()}`);
  const etiquettes = await page.$$eval('#tab-tete th', xs => Object.fromEntries(xs.map(x => [x.dataset.k, { texte: x.textContent.replace(/\s+/g, ' ').trim(), title: x.title }])));
  ok('1 · « Ligne du site », « Nombre de représentations » et « Précision » ont chacune une étiquette et une infobulle', [['intitule', 'Ligne du site'], ['nb-representations', 'Nombre de représentations'], ['precision', 'Précision']].every(([k, l]) => etiquettes[k]?.texte === l && etiquettes[k].title.length > 8), JSON.stringify([etiquettes.intitule, etiquettes['nb-representations'], etiquettes.precision]));
  ok('1 · la note de séance a changé de nom (« Note de séance »), les précisions du site ont le leur, la billetterie de la séance aussi', etiquettes.precisions?.texte === 'Note de séance' && etiquettes.details?.texte === 'Précisions du site' && etiquettes['billetterie-seance']?.texte === 'Billetterie de la séance' && etiquettes.billetterie?.texte === 'Billetterie');
  ok('1 · la préférence retient le jeu (complet.jeu = tout, aucune colonne masquée)', await ecritureEgale('tableur.colonnes', v => v?.complet?.jeu === 'tout' && v.complet.masquees.length === 0), JSON.stringify(colonnesGardees()));
  ok('1 · le menu dit le jeu choisi (Tout), et l’annonce aussi', (await page.$eval('#tab-jeu', s => s.value)) === 'tout' && /Jeu « Tout »/.test(await page.$$eval('.annonce', xs => xs.map(x => x.textContent).join(' | '))));
  // les cases : ce que disent les colonnes nouvelles
  ok('1 · la ligne du site, le nombre de représentations et « 2 précisions » se lisent dans la case (la 105 et la 106)', (await page.$eval(CASE(4, 'intitule'), td => td.textContent.trim())) === 'Flers, soirée de gala' && (await page.$eval(CASE(4, 'nb-representations'), td => td.textContent.trim())) === '3' && (await page.$eval(CASE(5, 'details'), td => td.textContent.trim())) === '2 précisions');
  ok('1 · la précision se dit en toutes lettres (Jour), la saison est en lecture seule (aria-readonly) et la fin de période d’une date à séance est figée avec sa raison', (await page.$eval(CASE(0, 'precision'), td => td.textContent.trim())) === 'Jour' && (await page.$eval(CASE(0, 'saison'), td => td.getAttribute('aria-readonly') === 'true' && /^\d{4}-\d{4}$/.test(td.textContent.trim()))) && (await page.$eval(CASE(0, 'date-fin'), td => td.getAttribute('aria-readonly') === 'true' && /séances/.test(td.title))));
  const feuille0 = await page.$eval(CASE(0, 'feuille'), td => ({ t: td.textContent.replace(/\s+/g, ' ').trim(), href: td.querySelector('a')?.getAttribute('href'), ro: td.getAttribute('aria-readonly') })), feuille1 = await page.$eval(CASE(1, 'feuille'), td => td.textContent.replace(/\s+/g, ' ').trim());
  ok('1 · la feuille de route : « brouillon » avec un lien vers sa page pour la 101, « à composer » ailleurs, en lecture seule', /^brouillon : la feuille de route du/.test(feuille0.t) && feuille0.href === '#/feuilles/101' && feuille0.ro === 'true' && /^à composer/.test(feuille1), JSON.stringify([feuille0, feuille1]));
  const modifie = await page.$eval(CASE(1, 'modifie'), td => ({ t: td.textContent.trim(), ro: td.getAttribute('aria-readonly') }));
  ok('1 · « Modifié le… par… » dit quand et par qui (la 102), en lecture seule ; la source de la date aussi', /· Adrien$/.test(modifie.t) && modifie.ro === 'true' && (await page.$eval(CASE(1, 'source-date'), td => td.textContent.trim())) === 'ancien site', JSON.stringify(modifie));
  ok('1 · l’icône « fiche » n’a pas de poignée de largeur (sa largeur ne se règle pas), les autres en-têtes en ont une', (await page.$$eval('#tab-tete th.c-fiche .poignee', xs => xs.length)) === 0 && (await page.$$eval('#tab-tete th.c-spectacle .poignee', xs => xs.length)) === 1);
  await calme(page);
  await page.screenshot({ path: `${CAPT}/complet-jeux.png`, fullPage: false });
  ok('1 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}


// ================================================================================ 2 · les jeux, un par un
{
  repartir(); garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '?mode=complet#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  const origine = await enTetes(page);
  const jeu = async k => { await page.focus('#tab-jeu'); await page.selectOption('#tab-jeu', k); await ecritureEgale('tableur.colonnes', v => (v?.complet?.jeu || '') === k); await page.waitForTimeout(80); return enTetes(page); };
  const site = await jeu('site');
  ok('2 · « Jeu : Site » : le jour, le spectacle et tout ce que le site dit (la ligne, les précisions, la billetterie, la précision, la fin de période, le nombre de représentations…), vides comprises', site.join() === 'jour,spectacle,heure,lieu,precision,date-fin,nb-representations,saison,public,statut,nature,billetterie,intitule,details,billetterie-seance,precisions,annulee,site,fiche', site.join());
  const gardee = colonnesGardees()?.complet;
  ok('2 · … la préférence porte le jeu et les colonnes masquées (jamais le jour)', gardee?.jeu === 'site' && gardee.masquees.includes('organisateur') && gardee.masquees.includes('montant') && gardee.masquees.includes('distribution') && !gardee.masquees.includes('jour') && !gardee.masquees.includes('intitule'), JSON.stringify(gardee?.masquees));
  const tournee = await jeu('tournee');
  ok('2 · « Jeu : Tournée » : le lieu et la commune, l’heure et sa fin, le statut, la distribution, la feuille de route', tournee.join() === 'jour,spectacle,heure,fin,lieu,commune,statut,distribution,feuille,annulee,fiche', tournee.join());
  const suivi = await jeu('suivi');
  ok('2 · « Jeu : Suivi » : l’organisateur, le contact, le contrat, les notes et la dernière modification', suivi.join() === 'jour,spectacle,organisateur,contact,contrat,notes,modifie,fiche', suivi.join());
  const bilanJeu = await jeu('bilan');
  ok('2 · « Jeu : Bilan » : la saison, le montant de cession, les trois chiffres et leur source, la source de la date', bilanJeu.join() === 'jour,spectacle,saison,montant,chiffre-jauge,chiffre-spectateurs,chiffre-heures_ateliers,chiffres-source,source-date,fiche', bilanJeu.join());
  const diffusion = await jeu('diffusion');
  ok('2 · « Jeu : Diffusion » : le montant de cession et l’étape de la piste (le suivi de la diffusion vit sur la piste : le script 22)', diffusion.join() === 'jour,spectacle,montant,etape-piste,fiche', diffusion.join());
  ok('2 · le menu suit le jeu choisi, l’en-tête est refait (le focus reste dans le menu)', (await page.$eval('#tab-jeu', s => s.value === 'diffusion' && document.activeElement === s)));
  const retour = await jeu('');
  ok('2 · « Disposition d’origine » rend les colonnes d’avant, le jeu repasse à null', retour.join() === origine.join() && colonnesGardees()?.complet?.jeu === null && colonnesGardees().complet.masquees.length === 0, retour.join());
  // sans jeu, une colonne hors de la disposition d'origine se montre par « Colonnes… »
  await page.click('#tab-colonnes');
  await page.waitForSelector('.tab-pop .tab-col[data-k="saison"]', { timeout: 4000 });
  ok('2 · « Colonnes… » liste les colonnes nouvelles, décochées (la saison), et pas l’icône « fiche »', (await page.$eval('.tab-col[data-k="saison"] input', i => !i.checked)) && (await compte(page, '.tab-col[data-k="fiche"]')) === 0 && (await compte(page, '.tab-col')) === 34);
  await page.check('.tab-col[data-k="saison"] input');
  await ecritureEgale('tableur.colonnes', v => v?.complet?.montrees?.includes('saison'));
  ok('2 · cocher la saison la montre, sans jeu (montrees la porte) ; la décocher la masque de nouveau', (await enTetes(page)).includes('saison') && colonnesGardees()?.complet?.montrees?.join() === 'saison' && await (async () => { await page.uncheck('.tab-col[data-k="saison"] input'); await page.waitForTimeout(250); return !(await enTetes(page)).includes('saison'); })());
  await page.keyboard.press('Escape');
  ok('2 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 3 · la diffusion : le montant de cession, jamais exporté sans la case
{
  repartir(); garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '?mode=complet#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  const th = await page.$eval('#tab-tete th[data-k="montant"]', e => ({ classe: e.className, cadenas: !!e.querySelector('.tab-cadenas svg'), sr: e.querySelector('.tab-cadenas .sr')?.textContent.trim(), fond: getComputedStyle(e).backgroundColor, title: e.title }));
  const ciel = await page.evaluate(() => { const i = document.createElement('i'); i.style.background = 'var(--ciel-doux)'; document.body.append(i); const c = getComputedStyle(i).backgroundColor; i.remove(); return c; });
  ok('2 bis · le montant reste visible en Complet (rempli), avec un cadenas (« confidentiel » en .sr) et la bande --ciel-doux dans l’en-tête', /confidentiel/.test(th.classe) && th.cadenas && th.sr === 'confidentiel' && th.fond === ciel && /confidentiel/.test(th.title), JSON.stringify(th));
  ok('3 · l’étape de la piste n’y est pas par défaut', !(await enTetes(page)).includes('etape-piste'));
  await page.selectOption('#tab-jeu', 'diffusion');
  await attendre(page, () => document.querySelector('#tab-tete th[data-k="etape-piste"]'));
  const etape = await page.$eval(CASE(0, 'etape-piste'), td => ({ t: td.textContent.trim(), ro: td.getAttribute('aria-readonly') })), th2 = await page.$eval('#tab-tete th[data-k="etape-piste"]', e => !!e.querySelector('.tab-cadenas svg') && /confidentiel/.test(e.className));
  ok('3 · « Jeu : Diffusion » : l’étape de la piste liée à la date (la 101) est en lecture seule (aria-readonly), avec le cadenas', etape.t === '2. Dossier / Devis' && etape.ro === 'true' && th2 && (await page.$eval(CASE(1, 'etape-piste'), td => td.textContent.trim())) === '', JSON.stringify(etape));
  const n0 = MODIFS.length;
  await ecrire(page, CASE(1, 'montant'), '1 200');
  await termine(page);
  ok('3 · écrire « 1 200 » dans le montant de la 102 : l’upsert du suivi porte 1200 (le montant s’écrit après le rpc, sans le vingt-quatrième script)', MODIFS.slice(n0).some(m => m.table === 'crescite_dates_suivi' && m.post?.[0].montant_cession === 1200) && DB.crescite_dates_suivi.find(x => x.date_id === 102).montant_cession === 1200, JSON.stringify(MODIFS.slice(n0)));
  ok('3 · … et la case le montre', /1 200/.test((await page.$eval(CASE(1, 'montant'), td => td.textContent)).replace(/\s/g, ' ')), await page.$eval(CASE(1, 'montant'), td => td.textContent));
  // ce que tableau() rend, et ce qu'un fichier porte
  const sans = await page.evaluate(() => TABLEUR.tableau({ confidentiel: false })), avec = await page.evaluate(() => TABLEUR.tableau({ confidentiel: true })), defaut = await page.evaluate(() => TABLEUR.tableau());
  ok('3 · tableau({ confidentiel: false }) n’a ni le montant ni l’étape (ni l’icône « fiche ») ; { confidentiel: true } les a ; sans option, comme false', !sans.entetes.includes('Cession HT (€)') && !sans.entetes.includes('Étape de la piste') && !sans.entetes.includes('Fiche') && avec.entetes.includes('Cession HT (€)') && avec.entetes.includes('Étape de la piste') && defaut.entetes.join() === sans.entetes.join() && sans.exclues.join() === 'Cession HT (€),Étape de la piste', `${sans.entetes.join()} / ${avec.entetes.join()}`);
  ok('3 · avec la diffusion, la ligne de la 101 porte 1800 (un nombre) et l’étape', avec.lignes[0][avec.entetes.indexOf('Cession HT (€)')]?.v === 1800 && avec.lignes[0][avec.entetes.indexOf('Cession HT (€)')]?.t === 'n' && avec.lignes[0][avec.entetes.indexOf('Étape de la piste')]?.v === '2. Dossier / Devis');
  // le menu Exporter : la case, décochée, jamais mémorisée ; un CSV sans, puis avec
  await page.click('#tab-exporter');
  ok('3 · le menu Exporter a la case « Inclure la diffusion (confidentiel) », décochée', (await texte(page, '.tab-export-conf')) === 'Inclure la diffusion (confidentiel)' && (await page.$eval('#tab-export-conf', c => !c.checked)) && (await compte(page, '#tab-export [data-export]')) === 3);
  const [csv1] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('#tab-export [data-export="csv"]')]);
  const brut1 = fs.readFileSync(await csv1.path(), 'utf8').replace(/^﻿/, '').split('\r\n');
  ok('3 · le CSV sans la case n’a ni « Cession HT » ni l’étape ; la barre le dit', !/Cession|Étape|Fiche/.test(brut1[0]) && !/1800|Dossier/.test(brut1.join('\n')) && /sans la diffusion/.test(await etat(page)), `${brut1[0]} · ${await etat(page)}`);
  await page.click('#tab-exporter');
  ok('3 · la case est décochée de nouveau (jamais mémorisée)', await page.$eval('#tab-export-conf', c => !c.checked));
  await page.check('#tab-export-conf');
  const [csv2] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('#tab-export [data-export="csv"]')]);
  const brut2 = fs.readFileSync(await csv2.path(), 'utf8').replace(/^﻿/, '').split('\r\n');
  ok('3 · cochée, le CSV porte « Cession HT (€) » et « Étape de la piste », et le montant de la 101', /Cession HT \(€\)/.test(brut2[0]) && /Étape de la piste/.test(brut2[0]) && /1800/.test(brut2[1]) && !/sans la diffusion/.test(await etat(page)), brut2[0]);
  await page.click('#tab-exporter');
  ok('3 · … et la case est de nouveau décochée après l’export', await page.$eval('#tab-export-conf', c => !c.checked));
  await page.keyboard.press('Escape');
  await calme(page);
  await page.screenshot({ path: `${CAPT}/complet-diffusion.png`, fullPage: false });
  // Simple : la case n'a pas de sens
  await page.click('.tab-modes [data-mode=simple]');
  await page.waitForTimeout(200);
  ok('3 · en Simple, ni le menu « Jeu » ni la case ne sont montrés', await page.evaluate(() => getComputedStyle(document.querySelector('.tab-jeu')).display === 'none' && document.querySelector('.tab-export-conf').closest('label').hidden));
  ok('3 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 4 · l'icône « fiche » et Ctrl+Entrée : la date dans le tiroir, sur le champ de la case
{
  repartir(); garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '?mode=complet#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  ok('4 · chaque ligne finit par l’icône « fiche » : une case nommée (la date dans son texte, caché comme un .sr), aria-keyshortcuts Control+Enter, une infobulle, l’icône dessinée, 44 px de large au moins', await page.evaluate(() => { const b = document.querySelector('#tab-corps tr[data-l="0"] td.c-fiche'); return !!b && b.classList.contains('tab-fiche') && b.getAttribute('aria-keyshortcuts') === 'Control+Enter' && /^Ouvrir la date du/.test(b.textContent) && /Ctrl\+Entrée/.test(b.title) && b.getBoundingClientRect().width >= 44 && getComputedStyle(b, '::before').width === '16px' && !b.querySelector('svg'); }));
  ok('4 · l’en-tête de l’icône a son libellé en .sr, pas de menu de colonne (rien à masquer ni à déplacer)', (await page.$eval('#tab-tete th[data-k="fiche"]', th => th.querySelector('.sr')?.textContent === 'Fiche' && !th.hasAttribute('aria-keyshortcuts'))));
  ok('4 · Ctrl+Entrée est déclaré au registre (« Le tableur ») et l’aide « ? » le liste', await page.evaluate(() => RACCOURCIS.groupes().find(g => g.titre === 'Le tableur')?.lignes.some(l => l.t && l.t[0].join('+') === 'Ctrl+Entrée')));
  await aller(page, CASE(0, 'contrat'));
  await page.keyboard.press('Control+Enter');
  ok('4 · Ctrl+Entrée sur le contrat de la 101 ouvre la date dans le tiroir (#ed-date) et vise #s-contrat, qui s’allume et a le focus', await attendre(page, () => document.querySelector('.tiroir.la #ed-date #s-contrat') && document.activeElement?.id === 's-contrat') && await page.$eval('#s-contrat', e => e.classList.contains('visee') && getComputedStyle(e).animationName === 'visee'));
  ok('4 · l’adresse ne gagne que le tiroir (?tiroir=representations/101) : pas de ?champ=, la page reste le tableur', await page.evaluate(() => location.search === '?mode=complet&tiroir=representations/101' && location.hash === '#/representations/tableur' && !/champ/.test(location.href)), await page.evaluate(() => location.search + location.hash));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/tiroir-depuis-grille.png`, fullPage: false });
  // enregistrer dans le tiroir : la grille derrière se redessine, sans le temps réel
  await page.fill('#s-org', 'Association de Caen');
  await page.click('#ed-date [data-enregistrer]');
  ok('4 · enregistrer la date dans le tiroir : la case Organisateur de la grille, derrière, se redessine aussitôt', await attendre(page, () => document.querySelector('#tab-corps tr[data-l="0"] td.c-organisateur')?.textContent.trim() === 'Association de Caen', 8000), await page.$eval(CASE(0, 'organisateur'), td => td.textContent.trim()));
  await page.keyboard.press('Escape');
  ok('4 · Échap ferme le tiroir et rend le focus à la case d’où l’on venait (le contrat de la 101), la ligne ayant été redessinée entre-temps', await attendre(page, () => !document.querySelector('.tiroir') && document.activeElement?.matches('#tab-corps tr[data-l="0"] td.c-contrat.actif'), 6000), await page.evaluate(() => document.activeElement?.className));
  // le jour d'une séance : sa ligne dans la fiche ; la période : le début
  await aller(page, CASE(2, 'heure'));
  await page.keyboard.press('Control+Enter');
  ok('4 · sur l’heure de la deuxième ligne de la 103 (sa première séance, 10h), le champ visé est l’heure de cette séance dans la fiche', await attendre(page, () => document.activeElement?.matches('#d-reps tr[data-i="0"] [data-r="heure"]')) && await page.$eval('#d-reps tr[data-i="0"] [data-r="heure"]', e => e.value === '10:00'));
  await page.keyboard.press('Escape'); await attendre(page, () => !document.querySelector('.tiroir'));
  await aller(page, CASE(3, 'heure'));
  await page.keyboard.press('Control+Enter');
  ok('4 · sur la troisième ligne de la 103 (14h30), c’est la deuxième séance', await attendre(page, () => document.activeElement?.matches('#d-reps tr[data-i="1"] [data-r="heure"]')) && await page.$eval('#d-reps tr[data-i="1"] [data-r="heure"]', e => e.value === '14:30'));
  await page.keyboard.press('Escape'); await attendre(page, () => !document.querySelector('.tiroir'));
  await aller(page, CASE(5, 'jour'));
  await page.keyboard.press('Control+Enter');
  ok('4 · sur le jour d’une période (la 106, sans séance), c’est le début de la date', await attendre(page, () => document.activeElement?.id === 'd-debut'));
  await page.keyboard.press('Escape'); await attendre(page, () => !document.querySelector('.tiroir'));
  // l'icône à la souris : le tiroir sans champ visé, et le focus revient à la case de l'icône
  await page.click(CASE(1, 'fiche'));
  ok('4 · cliquer l’icône de la 102 ouvre sa date dans le tiroir, sans champ visé (le focus est sur « ← »), la case de l’icône devient active', await attendre(page, () => document.querySelector('.tiroir.la #ed-date') && /representations\/102/.test(location.search)) && (await page.$eval('#tab-corps tr[data-l="1"] td.c-fiche', td => td.classList.contains('actif'))) && (await compte(page, '.tiroir .visee')) === 0);
  await page.click('.tiroir [data-tiroir-fermer]');
  ok('4 · fermer le tiroir rend le focus à la case de l’icône', await attendre(page, () => !document.querySelector('.tiroir') && document.activeElement?.matches('#tab-corps tr[data-l="1"] td.c-fiche.actif'), 6000));
  // Entrée sur l'icône : la même chose
  await page.keyboard.press('Enter');
  ok('4 · Entrée sur la case de l’icône ouvre aussi le tiroir', await attendre(page, () => document.querySelector('.tiroir.la #ed-date')));
  await page.keyboard.press('Escape'); await attendre(page, () => !document.querySelector('.tiroir'));
  // la case précisions du site s'écrit dans la fiche
  await page.selectOption('#tab-jeu', 'site');
  await attendre(page, () => document.querySelector('#tab-tete th[data-k="details"]'));
  await aller(page, CASE(5, 'details'));
  await page.keyboard.press('Enter');
  ok('4 · Entrée sur les précisions du site ouvre le tiroir sur #d-details (elles s’écrivent dans la fiche)', await attendre(page, () => document.querySelector('.tiroir.la #d-details') && document.querySelector('#d-details').classList.contains('visee')));
  await page.keyboard.press('Escape'); await attendre(page, () => !document.querySelector('.tiroir'));
  ok('4 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 5 · une date « période » : le garde-fou
{
  repartir(); garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '?mode=complet#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  ok('5 · les cases de séance d’une date sans séance (la 106) sont marquées .periode ; celles d’une date à séance, non', (await compte(page, '#tab-corps tr[data-l="5"] td.periode')) >= 3 && (await compte(page, '#tab-corps tr[data-l="0"] td.periode')) === 0 && (await page.$eval(CASE(5, 'heure'), td => td.classList.contains('periode'))) && !(await page.$eval(CASE(5, 'spectacle'), td => td.classList.contains('periode'))));
  let n = MODIFS.length;
  await aller(page, CASE(5, 'heure'));
  await page.keyboard.press('Enter');
  await page.waitForSelector('.gm-boite', { timeout: 4000 });
  const items = await page.$$eval('.gm [data-gm]', xs => xs.map(x => x.querySelector('.gm-l').firstChild.textContent.trim()));
  ok('5 · Entrée sur l’heure d’une période n’écrit rien : un menu demande « Ajouter une séance ce jour » ou « Annuler »', items.join(' | ') === 'Ajouter une séance ce jour | Annuler' && (await compte(page, '#tab-corps .tab-ed')) === 0 && MODIFS.length === n, items.join(' | '));
  ok('5 · le menu du garde-fou se nomme « Cette date est une période » (le nom que lisent les lecteurs d’écran)', (await page.$eval('.gm-boite', b => b.getAttribute('aria-label'))) === 'Cette date est une période');
  await page.keyboard.press('Escape');
  ok('5 · Échap le ferme, la case garde le focus, rien n’est écrit', await attendre(page, () => !document.querySelector('.gm') && document.activeElement?.matches('td.c-heure.actif')) && MODIFS.length === n);
  await page.keyboard.press('Enter');
  await page.waitForSelector('.gm-boite');
  await page.click('.gm [data-gm]:has-text("Annuler")');
  ok('5 · « Annuler » du menu : pas de saisie, rien d’écrit', (await compte(page, '#tab-corps .tab-ed')) === 0 && MODIFS.length === n && (await page.evaluate(() => !document.querySelector('.gm'))));
  // taper un caractère passe aussi par le garde-fou, et la saisie reprend avec lui
  await page.keyboard.type('2');
  await page.waitForSelector('.gm-boite');
  await page.click('.gm [data-gm]:has-text("Ajouter une séance ce jour")');
  await page.waitForSelector('#tab-corps .tab-ed', { timeout: 4000 });
  ok('5 · taper « 2 » ouvre le menu ; « Ajouter une séance ce jour » ouvre la saisie, avec le « 2 » déjà dedans', (await page.$eval('#tab-corps .tab-ed', e => e.value)) === '2');
  await page.keyboard.type('1h');
  await page.keyboard.press('Enter');
  await termine(page);
  let r = rpcs(n);
  ok('5 · … et l’heure s’écrit : un rpc, une séance à 21h, la date est un jour (précision jour, début = fin)', r.length === 1 && DB.crescite_representations.filter(x => x.date_id === 106).length === 1 && DB.crescite_representations.find(x => x.date_id === 106).heure.slice(0, 5) === '21:00' && dateDe(106).precision === 'jour' && dateDe(106).fin === dateDe(106).debut, JSON.stringify(r.map(x => x.corps.d)));
  // le jour d'une période : « Déplacer le début »
  n = MODIFS.length;
  await aller(page, CASE(6, 'jour'));
  await page.keyboard.press('Enter');
  await page.waitForSelector('.gm-boite');
  const itemsJour = await page.$$eval('.gm [data-gm]', xs => xs.map(x => x.querySelector('.gm-l').firstChild.textContent.trim()));
  ok('5 · sur le jour d’une période (la 107), le menu propose aussi « Déplacer le début »', itemsJour.join(' | ') === 'Ajouter une séance ce jour | Déplacer le début | Annuler', itemsJour.join(' | '));
  const fin107 = dateDe(107).fin;
  await page.click('.gm [data-gm]:has-text("Déplacer le début")');
  await page.waitForSelector('#tab-corps .tab-ed', { timeout: 4000 });
  await page.keyboard.press('Control+a');
  await page.keyboard.type(jj(plus(126)));
  await page.keyboard.press('Enter');
  await termine(page);
  r = rpcs(n);
  ok('5 · « Déplacer le début » à plus loin que la fin : le début se déplace, la fin le suit (fin ≥ début), aucune séance n’est créée', r.length === 1 && dateDe(107).debut === plus(126) && dateDe(107).fin === plus(126) && fin107 !== plus(126) && DB.crescite_representations.filter(x => x.date_id === 107).length === 0, JSON.stringify(r.map(x => [x.corps.d.debut, x.corps.d.fin])));
  n = MODIFS.length;
  await page.keyboard.press('Control+z');
  await termine(page);
  ok('5 · Ctrl+Z rend le début et la fin d’avant (un seul retour, les deux dates reviennent)', dateDe(107).debut === plus(120) && dateDe(107).fin === fin107, `${dateDe(107).debut} → ${dateDe(107).fin}`);
  // le collage et Suppr ne créent jamais de séance en silence
  n = MODIFS.length;
  await aller(page, CASE(6, 'heure'));
  await coller(page, '20h');
  await attendre(page, () => document.querySelector('#tab-corps td.ignoree'));
  const ign = await page.$eval(CASE(6, 'heure'), td => ({ classe: td.classList.contains('ignoree'), title: td.title }));
  ok('5 · une heure collée sur la période est ignorée (en ambre, .ignoree), la raison dit « cette date est une période : Entrée sur la case pour choisir » ; rien n’est écrit', ign.classe && /cette date est une période : Entrée sur la case pour choisir/.test(ign.title) && MODIFS.length === n && /ignorée/.test(await etat(page)), JSON.stringify(ign));
  await page.keyboard.press('Delete');
  ok('5 · Suppr sur une case de séance d’une période ne crée rien non plus', MODIFS.length === n);
  await page.selectOption('#tab-jeu', 'tout');
  await attendre(page, () => document.querySelector('#tab-tete th[data-k="annulee"]'));
  await aller(page, CASE(6, 'annulee'));
  await page.keyboard.press('Enter');
  ok('5 · la case « annulée » (à cocher) passe par le garde-fou comme les autres', await attendre(page, () => document.querySelector('.gm-boite')) && MODIFS.length === n);
  await page.keyboard.press('Escape');
  ok('5 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 6 · « Détacher cette séance dans sa propre date »
{
  repartir(); garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '?mode=complet#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  await page.click(CASE(0, 'heure'), { button: 'right' });
  await page.waitForSelector('.gm-boite');
  const seule = await page.$$eval('.gm [data-gm]', xs => xs.map(x => ({ l: x.querySelector('.gm-l').firstChild.textContent.trim(), off: x.getAttribute('aria-disabled') === 'true' })));
  ok('6 · le menu d’une ligne propose la date dans le tiroir et « Détacher cette séance dans sa propre date », grisé quand la date n’a qu’une séance', seule.length === 2 && seule[0].l === 'Ouvrir la date dans le tiroir' && seule[1].l === 'Détacher cette séance dans sa propre date' && seule[1].off, JSON.stringify(seule));
  ok('6 · … et se nomme « Date du … », pas « Cette date est une période »', /^Date du /.test(await page.$eval('.gm-boite', b => b.getAttribute('aria-label'))));
  await page.keyboard.press('Escape');
  const nDates = DB.crescite_dates.length, n = MODIFS.length;
  await page.click(CASE(2, 'heure'), { button: 'right' });
  await page.waitForSelector('.gm-boite');
  ok('6 · … et actif sur une date de deux séances (la 103)', await page.$eval('.gm [data-gm]:has-text("Détacher")', b => b.getAttribute('aria-disabled') !== 'true'));
  await page.click('.gm [data-gm]:has-text("Détacher")');
  await page.waitForSelector('dialog.gq[open] [data-gq="oui"]', { timeout: 4000 });
  const question = await texte(page, 'dialog.gq');
  ok('6 · une confirmation nomme la séance, dit ce qui est copié et que l’équipe reçoit « Nouvelle date »', /Détacher la séance du .* à 10h/.test(question) && /Nouvelle date/.test(question) && /sauf le montant de cession/.test(question), question);
  await page.waitForTimeout(420);
  await page.click('dialog.gq [data-gq="oui"]');
  await termine(page);
  const r = rpcs(n), nouvelle = DB.crescite_dates.find(d => d.id !== 103 && !DEPART.crescite_dates.some(x => x.id === d.id));
  ok('6 · détacher fait deux rpc (la date neuve, puis la séance quitte l’ancienne) : la 103 n’a plus que la séance de 14h30, la date neuve celle de 10h', r.length === 2 && DB.crescite_dates.length === nDates + 1 && !!nouvelle && DB.crescite_representations.filter(x => x.date_id === 103).map(x => x.heure.slice(0, 5)).join() === '14:30' && DB.crescite_representations.filter(x => x.date_id === nouvelle.id).map(x => x.heure.slice(0, 5)).join() === '10:00', JSON.stringify(r.map(x => x.corps.d.id)));
  ok('6 · la date neuve reprend le spectacle, le lieu, le statut et le public de la 103 (scolaire)', nouvelle?.spectacle_id === dateDe(103).spectacle_id && nouvelle.lieu_id === dateDe(103).lieu_id && nouvelle.statut === dateDe(103).statut && nouvelle.public === 'scolaire' && nouvelle.visible === dateDe(103).visible);
  const eq = DB.crescite_equipes.filter(x => x.date_id === nouvelle?.id);
  ok('6 · … et son équipe, avec la fonction et la note du renfort (« remplace Camille », « train de 8h ») : rien n’est perdu', eq.some(x => x.personne_id === 3 && x.present && x.fonction === 'remplace Camille' && x.note === 'train de 8h'), JSON.stringify(eq));
  const suiviNeuf = DB.crescite_dates_suivi.find(x => x.date_id === nouvelle?.id);
  ok('6 · le suivi (organisateur, contact, contrat) est copié, pas le montant de cession : la 103 garde ses 900 €, la date neuve n’en a pas', suiviNeuf?.organisateur === 'Lycée Voltaire' && suiviNeuf.contrat === 'envoyé' && suiviNeuf.contact === 'Mme Rey' && !suiviNeuf.montant_cession && DB.crescite_dates_suivi.find(x => x.date_id === 103).montant_cession === 900, JSON.stringify(suiviNeuf));
  ok('6 · la barre dit « détachée », la ligne de la date neuve est la case active, avec « Annuler »', /détachée dans sa propre date/.test(await etat(page)) && (await page.evaluate(() => { const td = document.querySelector('#tab-corps td.actif'); return !!td && td.closest('tr').querySelector('td.c-heure')?.textContent.trim().length > 0; })) && (await compte(page, '#tab-annuler')) === 1);
  const n2 = MODIFS.length;
  await page.keyboard.press('Control+z');
  await attendre(page, () => /^Annulé/.test(document.querySelector('#tab-etat')?.textContent || ''), 8000);
  ok('6 · un seul Ctrl+Z (« Annulé ») rend tout : la séance revient dans la 103, la date neuve s’efface', /Annulé/.test(await etat(page)) && DB.crescite_dates.length === nDates && DB.crescite_representations.filter(x => x.date_id === 103).map(x => x.heure.slice(0, 5)).sort().join() === '10:00,14:30' && rpcs(n2).length === 1 && MODIFS.slice(n2).some(m => m.table === 'crescite_dates' && m.delete), JSON.stringify(MODIFS.slice(n2)));
  ok('6 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 6 bis · « Détacher » dont la seconde écriture est refusée
{
  repartir(); garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '?mode=complet#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  // la base répond bien à la première écriture (la date neuve) et refuse la seconde (la séance quitte l'ancienne date)
  let appels = 0;
  await page.route(/rpc\/crescite_enregistrer_date/, route => { appels++; return appels === 2 ? route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: '400', message: 'refus d’essai' }) }) : route.fallback(); });
  const nDates = DB.crescite_dates.length;
  await page.click(CASE(2, 'heure'), { button: 'right' });
  await page.waitForSelector('.gm-boite');
  await page.click('.gm [data-gm]:has-text("Détacher")');
  await page.waitForSelector('dialog.gq[open] [data-gq="oui"]', { timeout: 4000 });
  await page.waitForTimeout(420);
  await page.click('dialog.gq [data-gq="oui"]');
  await termine(page);
  await attendre(page, () => /^Pas détachée/.test(document.querySelector('#tab-etat')?.textContent || ''), 8000);
  ok('6 bis · la seconde écriture refusée : la barre dit « Pas détachée » et que la date neuve a été retirée', /^Pas détachée.*refus d’essai.*date neuve a été retirée/.test(await etat(page)), await etat(page));
  ok('6 bis · … la base n’a pas gardé de date en double : autant de dates qu’avant, la 103 a toujours ses deux séances', DB.crescite_dates.length === nDates && DB.crescite_representations.filter(x => x.date_id === 103).length === 2, `${DB.crescite_dates.length} / ${nDates}`);
  ok('6 bis · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 7 · ce que les colonnes nouvelles écrivent, et ce qu'elles refusent
{
  repartir(); garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '?mode=complet#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  await page.selectOption('#tab-jeu', 'tout');
  await attendre(page, () => document.querySelectorAll('#tab-tete th').length > 30);
  let n = MODIFS.length;
  // la ligne du site : posée sur une date qui n'en avait pas, elle n'est pas perdue ; vidée, la ligne revient au site
  await ecrire(page, CASE(1, 'intitule'), 'Soirée de gala au Volcan');
  await termine(page);
  let r = rpcs(n);
  ok('7 · une ligne du site posée sur une date qui n’en avait pas est écrite (libre se calcule après l’écriture) : le rpc la porte, la base la garde', r.length === 1 && r[0].corps.d.intitule === 'Soirée de gala au Volcan' && dateDe(102).intitule === 'Soirée de gala au Volcan', JSON.stringify(r.map(x => x.corps.d.intitule)));
  n = MODIFS.length;
  await aller(page, CASE(1, 'intitule'));
  await page.keyboard.press('Delete');
  await termine(page);
  r = rpcs(n);
  ok('7 · … la vider rend la ligne au site (intitule null)', r.length === 1 && r[0].corps.d.intitule === null && dateDe(102).intitule === null, JSON.stringify(r.map(x => x.corps.d.intitule)));
  // la billetterie de la séance
  n = MODIFS.length;
  await ecrire(page, CASE(0, 'billetterie-seance'), 'billetterie.example/soiree');
  await termine(page);
  r = rpcs(n);
  ok('7 · la billetterie de la séance (une adresse sans https:// la prend) s’écrit sur la séance, pas sur la date', r.length === 1 && r[0].corps.d.representations[0].lien === 'https://billetterie.example/soiree' && !dateDe(101).lien, JSON.stringify(r.map(x => x.corps.d.representations)));
  // le nombre de représentations : figé avec des séances, libre sans
  n = MODIFS.length;
  await aller(page, CASE(0, 'nb-representations'));
  await page.keyboard.press('Enter');
  ok('7 · le nombre de représentations d’une date à séances est figé : la case le dit en infobulle, Entrée aussi, rien n’est écrit', /séances/.test(await page.$eval(CASE(0, 'nb-representations'), td => td.title)) && /séances/.test(await etat(page)) && (await compte(page, '#tab-corps .tab-ed')) === 0 && MODIFS.length === n, await etat(page));
  await ecrire(page, CASE(6, 'nb-representations'), '4');
  await termine(page);
  r = rpcs(n);
  ok('7 · sur une date sans séance (la 107) il s’écrit', r.length === 1 && r[0].corps.d.nb_representations === 4 && dateDe(107).nb_representations === 4, JSON.stringify(r.map(x => x.corps.d.nb_representations)));
  // la fin de période : ≥ début
  n = MODIFS.length;
  await ecrire(page, CASE(6, 'date-fin'), jj(plus(100)));
  ok('7 · une fin avant le début est refusée avec sa raison (« ne peut pas venir avant le début »), rien n’est écrit', await attendre(page, () => /ne peut pas venir avant le début/.test(document.querySelector('#tab-etat')?.textContent || '')) && MODIFS.length === n, await etat(page));
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await ecrire(page, CASE(6, 'date-fin'), jj(plus(130)));
  await termine(page);
  r = rpcs(n);
  ok('7 · une fin valide s’écrit (la 107 finit plus tard)', r.length === 1 && dateDe(107).fin === plus(130) && r[0].corps.d.precision === 'jour', JSON.stringify(r.map(x => [x.corps.d.fin, x.corps.d.precision])));
  ok('7 · la fin d’une date à séances est figée : la case dit pourquoi', /séances/.test(await page.$eval(CASE(0, 'date-fin'), td => td.title)));
  // la précision
  n = MODIFS.length;
  await ecrire(page, CASE(6, 'precision'), 'Mois');
  await termine(page);
  r = rpcs(n);
  ok('7 · la précision se choisit (Jour, Période, Mois, Saison) : « Mois » sur la 107, et le jour de la ligne se dit alors par son mois', r.length === 1 && r[0].corps.d.precision === 'mois' && dateDe(107).precision === 'mois' && /\d{4}$/.test(await page.$eval(CASE(6, 'jour'), td => td.textContent.trim())), JSON.stringify(r.map(x => x.corps.d.precision)));
  const choixPrec = await page.evaluate(() => champDate('precision').choix().map(c => c[0]).join());
  ok('7 · la base admet « saison » : le choix la propose (jour, periode, mois, saison)', choixPrec === 'jour,periode,mois,saison');
  // les lectures ne s'écrivent pas : la case dit pourquoi, ou mène à sa page
  n = MODIFS.length;
  await aller(page, CASE(0, 'saison'));
  await page.keyboard.press('Enter');
  ok('7 · la saison est une lecture : Entrée dit pourquoi, rien n’est écrit', /Saison : se déduit du premier jour/.test(await etat(page)) && (await compte(page, '#tab-corps .tab-ed')) === 0 && MODIFS.length === n, await etat(page));
  // les précisions du site copiées gardent leur séparation (une par ligne, entre guillemets), collées elles redeviennent deux
  await aller(page, CASE(5, 'details'));
  const copie = await page.evaluate(() => { const dt = new DataTransfer(); document.querySelector('#tab').dispatchEvent(new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true })); return dt.getData('text/plain'); });
  ok('7 · copier les précisions du site de la 106 garde un saut de ligne entre elles (entre guillemets)', copie === '"Entrée libre\nSur réservation"', JSON.stringify(copie));
  n = MODIFS.length;
  await aller(page, CASE(1, 'details'));
  await coller(page, copie);
  await termine(page);
  r = rpcs(n);
  ok('7 · … et collées sur une autre date, elles y sont encore deux', r.length === 1 && dateDe(102).details?.map(x => x.texte).join('|') === 'Entrée libre|Sur réservation', JSON.stringify(dateDe(102).details));
  await aller(page, CASE(0, 'feuille'));
  await page.keyboard.press('Enter');
  ok('7 · Entrée sur la feuille de route mène à sa page', await attendre(page, () => location.hash === '#/feuilles/101'), await page.evaluate(() => location.hash));
  ok('7 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 8 · l'import lit toutes les colonnes qu'il reconnaît
{
  repartir(); garnir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '?mode=complet#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  const lu = await page.evaluate(([j]) => { const t = TABLEUR.lireImport(`Jour\tSpectacle\tCession HT (€)\tJauge\tSpectateurs\tHeures d’ateliers\tLigne du site\tPrécisions du site\tPrécisions\tStatut\tSite\tBilletterie de la séance\tBilletterie\n${j}\tBérénice\t2 500\t180\t150\t3,5\tGala\tEntrée libre\tcomplet\tOption\tmasquée\tlien.example/s\tlien.example/d`); return { cles: t.cles, avecTete: t.avecTete, l: t.lignes[0] }; }, [jj(plus(200))]);
  ok('8 · les en-têtes d’un export sont reconnus, « Cession HT (€) », « Jauge », « Spectateurs » et « Heures d’ateliers » compris', lu.avecTete && lu.cles.join() === 'jour,spectacle,montant,chiffre-jauge,chiffre-spectateurs,chiffre-heures_ateliers,intitule,details,precisions,statut,site,billetterie-seance,billetterie', lu.cles.join());
  const sc = lu.l.seance;
  ok('8 · la ligne lue porte le montant, les chiffres, la ligne du site, une précision du site, le statut, le site masqué ; « Précisions » est la note de séance, la billetterie de la séance et celle de la date sont deux', lu.l.ok && sc.suivi.montant_cession === 2500 && sc.chiffres.jauge === 180 && sc.chiffres.spectateurs === 150 && sc.chiffres.heures_ateliers === 3.5 && sc.date.intitule === 'Gala' && sc.date.details.length === 1 && /Entrée libre/.test(sc.date.details[0].texte) && sc.date.statut === 'option' && sc.date.visible === false && sc.seance.note === 'complet' && sc.seance.lien === 'https://lien.example/s' && sc.date.lien === 'https://lien.example/d', JSON.stringify(sc));
  // sans titres : les colonnes du tableau ; sous un jeu, l'aperçu demande une ligne de titres
  const supposees = await page.evaluate(() => { const t = TABLEUR.lireImport('5/11/2027\tBérénice\t20h30'); return { cles: t.cles.join(), avertir: t.avertir, supposees: t.supposees }; });
  ok('8 · sans ligne de titres, les colonnes sont celles du tableau (jour, spectacle, heure…), le tableau montrant sa disposition d’origine : pas d’avertissement', supposees.supposees && supposees.cles.startsWith('jour,spectacle,heure,lieu') && supposees.avertir === '', JSON.stringify(supposees));
  await page.selectOption('#tab-jeu', 'suivi');
  await ecritureEgale('tableur.colonnes', v => v?.complet?.jeu === 'suivi');
  const sousJeu = await page.evaluate(() => { const t = TABLEUR.lireImport('5/11/2027\tBérénice\tAsso'); return { cles: t.cles.join(), avertir: t.avertir }; });
  ok('8 · sous un jeu, les colonnes supposées suivent celles du tableau (jour, spectacle, organisateur…) et l’aperçu demande une ligne de titres', sousJeu.cles.startsWith('jour,spectacle,organisateur') && /ligne de titres/.test(sousJeu.avertir), JSON.stringify(sousJeu));
  await page.selectOption('#tab-jeu', '');
  await ecritureEgale('tableur.colonnes', v => v?.complet?.jeu === null);
  // une colonne montrée une à une (la saison, qui n'a pas de titre à lire) garde sa place : sans elle, tout ce qui suit serait lu une colonne trop tôt
  await page.evaluate(() => TABLEUR.colonnes.montrer('saison'));
  await attendre(page, () => document.querySelector('#tab-tete th[data-k="saison"]'));
  const trou = await page.evaluate(() => { const t = TABLEUR.lireImport('5/11/2027\tBérénice\t20h30\tThéâtre de Caen\tCaen\t2027-2028\tscolaire\tOption'); return { v: t.lignes[0].v, avertir: t.avertir }; });
  ok('8 · une colonne montrée sans titre à lire (la saison) garde sa place dans les colonnes supposées : les suivantes restent alignées sur le tableau (le public est « scolaire », le statut « Option »)', trou.v.public === 'scolaire' && trou.v.statut === 'Option' && trou.v.commune === 'Caen' && !('saison' in trou.v), JSON.stringify(trou.v));
  ok('8 · … et l’aperçu demande une ligne de titres, alors qu’aucune colonne n’est masquée', /ligne de titres/.test(trou.avertir), trou.avertir);
  await page.evaluate(() => TABLEUR.colonnes.masquer('saison'));
  const euros = await page.evaluate(() => ['Montant (EUR)', 'Cession HT (eur)', 'Cession HT (€)', 'Prix de cession'].map(h => TABLEUR.lireImport(`Jour\tSpectacle\t${h}\n5/11/2027\tBérénice\t2 500`).cles.join()));
  ok('8 · « Montant (EUR) », « Cession HT (eur) », « Cession HT (€) » et « Prix de cession » sont reconnus comme le montant', euros.every(c => c === 'jour,spectacle,montant'), euros.join(' | '));
  // par le dialogue : « Jour, Spectacle, Jauge », la jauge est appliquée
  await page.click('#tab-importer');
  await page.waitForSelector('dialog[open] #tab-im-texte');
  await page.fill('#tab-im-texte', `Jour\tSpectacle\tJauge\n${jj(plus(200))}\tLa Folle Idée\t240`);
  await attendre(page, () => /1 séance à créer/.test(document.querySelector('#tab-im-apercu')?.textContent || ''));
  ok('8 · l’aperçu nomme les colonnes lues (Jour, Spectacle, Jauge) et montre la jauge comprise dans sa propre colonne', /colonnes lues : Jour, Spectacle, Jauge/.test(await texte(page, '#tab-im-apercu')) && (await page.$$eval('#tab-im-apercu thead th', xs => xs.map(x => x.textContent.trim()).join())) === 'Ligne,Jour,Heure,Spectacle,Lieu,Jauge,Ce qui se fera' && (await page.$$eval('#tab-im-apercu tbody td', xs => xs[5].textContent.trim())) === '240', await texte(page, '#tab-im-apercu'));
  const n = MODIFS.length;
  await page.click('#tab-im-ok');
  await attendre(page, () => !document.querySelector('dialog[open] #tab-im-texte') && /^Import/.test(document.querySelector('#tab-etat')?.textContent || ''), 10000);
  const creee = DB.crescite_dates.find(d => d.debut === plus(200));
  ok('8 · « Créer » applique la jauge : la date neuve a ses chiffres (jauge 240) écrits avec elle', !!creee && DB.crescite_dates_chiffres.find(c => c.date_id === creee.id)?.jauge === 240, JSON.stringify(DB.crescite_dates_chiffres));
  // une ligne du site, des précisions, le statut et la source des chiffres : tout passe sur la date neuve
  await page.click('#tab-importer');
  await page.waitForSelector('dialog[open] #tab-im-texte');
  await page.fill('#tab-im-texte', `Jour\tSpectacle\tLigne du site\tPrécisions du site\tStatut\tSource des chiffres\tSpectateurs\n${jj(plus(210))}\tLa Folle Idée\tUne soirée\tEntrée libre\tOption\tRelevé de la salle\t95`);
  await attendre(page, () => /1 séance à créer/.test(document.querySelector('#tab-im-apercu')?.textContent || ''));
  await page.click('#tab-im-ok');
  await attendre(page, () => !document.querySelector('dialog[open] #tab-im-texte') && /^Import/.test(document.querySelector('#tab-etat')?.textContent || ''), 10000);
  const creee2 = DB.crescite_dates.find(d => d.debut === plus(210));
  ok('8 · la ligne du site, la précision du site, le statut, le nombre de spectateurs et leur source arrivent sur la date neuve', creee2?.intitule === 'Une soirée' && creee2.details?.[0]?.texte === 'Entrée libre' && creee2.statut === 'option' && DB.crescite_dates_chiffres.find(c => c.date_id === creee2.id)?.spectateurs === 95 && DB.crescite_dates_chiffres.find(c => c.date_id === creee2.id)?.source === 'Relevé de la salle', JSON.stringify([creee2, DB.crescite_dates_chiffres.at(-1)]));
  // une ligne qui rejoint une date qui existe : seule la séance, et l'aperçu le dit
  await page.click('#tab-importer');
  await page.waitForSelector('dialog[open] #tab-im-texte');
  await page.fill('#tab-im-texte', `Jour\tHeure\tSpectacle\tLieu\tJauge\n${jj(plus(3))}\t22h\tBérénice\tThéâtre de Caen\t300`);
  await attendre(page, () => /1 séance à créer/.test(document.querySelector('#tab-im-apercu')?.textContent || ''));
  ok('8 · une ligne qui rejoint une date existante (la 101) le dit à l’avance : seule la séance est reprise, le reste de la ligne ne l’est pas', /ajoutée à la date du .*seule la séance est reprise/.test(await texte(page, '#tab-im-apercu')), await texte(page, '#tab-im-apercu'));
  await page.click('#tab-im-ok');
  await attendre(page, () => !document.querySelector('dialog[open] #tab-im-texte') && /^Import/.test(document.querySelector('#tab-etat')?.textContent || ''), 10000);
  ok('8 · … et la jauge de la 101 n’a pas bougé', !DB.crescite_dates_chiffres.some(c => c.date_id === 101) && DB.crescite_representations.filter(x => x.date_id === 101).length === 2);
  ok('8 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 9 · le téléphone, et rien ne bouge sous « moins d'animations »
{
  repartir(); garnir();
  const a = await ouvrir(navigateur, { largeur: 390, hauteur: 844, hash: '#/representations/tableur' });
  await a.page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  ok('9 · à 390 px, le tableur ne change pas : ni menu « Jeu » ni icône « fiche » montrés', await a.page.evaluate(() => getComputedStyle(document.querySelector('.tab-jeu')).display === 'none' && [...document.querySelectorAll('.c-fiche')].every(e => getComputedStyle(e).display === 'none')));
  ok('9 · … aucune erreur de script', a.erreurs.length === 0, a.erreurs.join(' / '));
  await a.ctx.close();
  const b = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '?mode=complet#/representations/tableur', reduit: true });
  await b.page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  await aller(b.page, CASE(0, 'contrat'));
  await b.page.keyboard.press('Control+Enter');
  await attendre(b.page, () => document.querySelector('.tiroir.la #s-contrat'));
  ok('9 · sous « moins d’animations », le champ visé est marqué sans s’animer (aucune animation), le tiroir apparaît sans glisser', await b.page.evaluate(() => { const e = document.querySelector('#s-contrat'); return e.classList.contains('visee') && getComputedStyle(e).animationName === 'none'; }));
  await b.page.keyboard.press('Escape');
  ok('9 · … aucune erreur de script', b.erreurs.length === 0, b.erreurs.join(' / '));
  await b.ctx.close();
}
// ================================================================================ 10 · le menu « Jeu » après un passage du Simple au Complet, et l'impression
{
  repartir(); garnir();
  DB.crescite_preferences = [{ user_id: UID, cle: 'tableur.mode', valeur: 'simple' }, { user_id: UID, cle: 'tableur.colonnes', valeur: { complet: { jeu: 'diffusion' } } }];
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  ok('10 · le tableur s’ouvre en Simple (le menu « Jeu » est caché) alors que le jeu Diffusion est retenu pour le Complet', (await page.$eval('#tab', t => t.classList.contains('simple'))) && (await page.$eval('#tab-jeu', s => s.closest('label').hidden)));
  await page.click('.tab-modes [data-mode="complet"]');
  await attendre(page, () => document.querySelector('#tab-tete th[data-k="etape-piste"]'));
  ok('10 · en passant au Complet, la grille montre le jeu Diffusion ET le menu « Jeu » le dit (« Diffusion », pas « Disposition d’origine »)', (await page.$eval('#tab-jeu', s => s.value)) === 'diffusion' && (await enTetes(page)).includes('etape-piste'), await page.$eval('#tab-jeu', s => s.value));
  await page.emulateMedia({ media: 'print' });
  ok('10 · à l’impression, la colonne de l’icône « fiche » n’occupe pas de place (ni en-tête ni cases)', await page.evaluate(() => [...document.querySelectorAll('th.c-fiche, td.c-fiche')].every(e => getComputedStyle(e).display === 'none')));
  await page.emulateMedia({ media: 'screen' });
  ok('10 · … et à l’écran elle reste là, avec son dessin venu de la bibliothèque d’icônes (le masque est posé)', await page.evaluate(() => { const td = document.querySelector('td.c-fiche'); return getComputedStyle(td).display !== 'none' && /svg/.test(getComputedStyle(td, '::before').maskImage || getComputedStyle(td, '::before').webkitMaskImage || '') && !!document.getElementById('tab-fiche-masque'); }));
  ok('10 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
await navigateur.close();
bilan(CAPT);
