// Les documents dans l'administration (admin/equipe.js), vérifiés dans Chromium, sur la base fictive (admin-fictif.mjs) :
//   node site/documents-admin.mjs            (après le build)
// Comme dans le Drive de la compagnie, un spectacle a son dossier du spectacle (« Dossier <SPECTACLE> 2026 ») et parfois son
// dossier scolaire (« Dossier <SPECTACLE> sco 26-27 ») ; à côté, ses fiches techniques. Ce banc regarde : la sorte d'un
// document public (un seul choix, qui écrit son type et son public), les pages que chaque document nomme sous son titre (et
// pourquoi il ne se montre pas), le nom d'un fichier du Drive qui donne sa sorte et son titre, et « Les dossiers des
// spectacles », tous d'un coup d'œil. Les captures vont dans site/dist/shots-documents/. Sort en erreur si une vérification
// manque. Demande Playwright et Chromium (PLAYWRIGHT_MODULE, CHROMIUM, comme onglets.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, DB, MODIFS, ok, ouvrir, texte, compte, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-documents');
fs.mkdirSync(CAPT, { recursive: true });

// Bérénice : en tournée, une action culturelle ; un dossier du spectacle, un dossier scolaire, une fiche technique, un
// document de l'équipe. Cassandres : sans page publiée, un dossier qu'aucune page ne montre
Object.assign(DB.crescite_spectacles.find(s => s.slug === 'berenice'), { action_culturelle: { type: 'Spectacle in situ', public: 'À partir de la seconde' } });
DB.crescite_documents.push(
  { id: 701, spectacle_id: 1, type: 'dossier', titre: 'Dossier du spectacle 2026', fichier: 'documents/berenice/dossier-2026.pdf', url: null, pour: 'pros', ordre: 10 },
  { id: 702, spectacle_id: 1, type: 'dossier', titre: 'Dossier scolaire 2026', fichier: 'documents/berenice/dossier-scolaire-2026.pdf', url: null, pour: 'scolaires', ordre: 20 },
  { id: 703, spectacle_id: 1, type: 'fiche_technique', titre: 'Fiche technique et plan', fichier: 'documents/berenice/fiche-technique.pdf', url: null, pour: 'pros', ordre: 30 },
  { id: 704, spectacle_id: 1, type: 'texte', titre: 'Le texte', fichier: 'berenice/texte.pdf', url: null, pour: 'equipe', ordre: 10 },
  { id: 705, spectacle_id: 3, type: 'dossier', titre: 'Dossier du spectacle 2026', fichier: 'documents/cassandres/dossier-2026.pdf', url: null, pour: 'pros', ordre: 10 });

const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const { page, erreurs } = await ouvrir(navigateur, { hash: '#/spectacles/berenice' });
await page.evaluate(() => { try { sessionStorage.setItem('crescite-onglet-sp', 'Documents'); } catch (e) { /* */ } });
await page.goto(page.url().replace(/#.*$/, '') + '#/spectacles/la-folle-idee'); await page.waitForTimeout(400);
await page.evaluate(() => { sessionStorage.setItem('crescite-onglet-sp', 'Documents'); location.hash = '#/spectacles/berenice'; });
await page.waitForSelector('[data-doc="701"]', { timeout: 15000 }).catch(() => {});

// ---------------------------------------------------------------- l'onglet Documents d'un spectacle
const titres = await page.$$eval('#docs-sp .docs-titre', xs => xs.map(x => x.textContent.trim()));
ok('l’onglet Documents commence par ce que le site montre, finit par l’équipe', /^Sur le site/.test(titres[0] || '') && /^Pour l’équipe/.test(titres[titres.length - 1] || ''), titres.join(' | '));
const sorte = id => page.$eval(`[data-doc="${id}"] [data-dk="sorte"]`, s => s.selectedOptions[0].textContent).catch(() => null);
ok('un document public a une sorte, d’un seul choix : « Dossier du spectacle », « Dossier scolaire », « Fiche technique »',
  (await sorte(701)) === 'Dossier du spectacle' && (await sorte(702)) === 'Dossier scolaire' && (await sorte(703)) === 'Fiche technique'
    && (await compte(page, '[data-doc="701"] [data-dk="pour"], [data-doc="701"] [data-dk="type"]')) === 0);
const ou = id => texte(page, `[data-doc="${id}"] .doc-ou`);
const o701 = await ou(701), o702 = await ou(702), o703 = await ou(703), o704 = await ou(704);
ok('le dossier du spectacle nomme ses pages : « Je souhaite programmer », Bérénice › Programmer, l’espace des salles, l’équipe',
  /Je souhaite programmer/.test(o701) && /Bérénice › Programmer/.test(o701) && /Espace des salles/.test(o701) && /équipe de Bérénice/.test(o701) && !/Établissement/.test(o701), o701);
ok('les pages du site sont des liens vers le site, dans un nouvel onglet', await page.$$eval('[data-doc="701"] .doc-ou a[target="_blank"]', xs => xs.map(a => a.getAttribute('href'))).then(h => h.includes('../#/espace-pro/programmer') && h.includes('../#/spectacle/berenice/programmer')));
ok('le dossier scolaire : Bérénice › Établissement scolaire, rubrique « Documents pour les enseignants »', /Établissement scolaire, rubrique « Documents pour les enseignants »/.test(o702) && !/programmer/i.test(o702), o702);
ok('la fiche technique : ses deux rubriques et la demande de proposition', /Fiche technique » et « À télécharger/.test(o703) && /demande de proposition/.test(o703), o703);
ok('un document de l’équipe : l’espace de l’équipe et les feuilles de route, pas le site', /Espace de l’équipe de Bérénice/.test(o704) && /feuilles de route/.test(o704) && !/programmer/i.test(o704), o704);
await page.waitForTimeout(900);   // (la transition d'une vue à l'autre s'achève)
await page.screenshot({ path: path.join(CAPT, 'onglet-documents.png'), fullPage: true });

// une autre sorte, d'un seul choix : le type et le public s'écrivent ensemble, et la ligne nomme ses nouvelles pages
MODIFS.length = 0;
await page.selectOption('[data-doc="701"] [data-dk="sorte"]', 'dossier|tous');
await page.waitForTimeout(600);
const m = MODIFS.find(x => x.table === 'crescite_documents' && x.body);
ok('choisir « Dossier commun » écrit type et public ensemble', !!m && m.body.type === 'dossier' && m.body.pour === 'tous', JSON.stringify(MODIFS));
const o701b = await ou(701);
ok('… et la ligne montre alors les pages des programmateurs et celles des enseignants', /Programmer/.test(o701b) && /Établissement scolaire/.test(o701b), o701b);
await page.selectOption('[data-doc="701"] [data-dk="sorte"]', 'dossier|pros'); await page.waitForTimeout(500);

// un fichier du Drive : son nom donne sa sorte et son titre
const envoyer = async (nom, sel = '[data-doc-fichier-public]') => {
  MODIFS.length = 0;
  await page.setInputFiles(`#docs-sp ${sel}`, { name: nom, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 essai') });
  await page.waitForTimeout(900);
  return (MODIFS.find(x => x.table === 'crescite_documents' && x.post) || { post: [{}] }).post[0];
};
const a = await envoyer('Dossier BERENICE 2026.pdf'), b = await envoyer('Dossier MON ROYAUME sco 26-27.pdf'), c = await envoyer('FT Ci-gisait Cyrano-Version légère-compressée.pdf');
ok('« Dossier BERENICE 2026.pdf » devient un dossier du spectacle, « Dossier du spectacle 2026 »', a.type === 'dossier' && a.pour === 'pros' && a.titre === 'Dossier du spectacle 2026', JSON.stringify(a));
ok('« Dossier … sco 26-27.pdf » devient un dossier scolaire, « Dossier scolaire 2026-2027 »', b.type === 'dossier' && b.pour === 'scolaires' && b.titre === 'Dossier scolaire 2026-2027', JSON.stringify(b));
ok('« FT … Version légère ….pdf » devient une fiche technique, « Fiche technique, version légère »', c.type === 'fiche_technique' && c.pour === 'pros' && c.titre === 'Fiche technique, version légère', JSON.stringify(c));
const d = await envoyer('Crescite - Bérénice - Fiche de renseignements.pdf', '[data-doc-fichier]');
ok('une fiche de renseignements, pour l’équipe, garde son nom d’usage', d.type === 'autre' && d.pour === 'equipe' && d.titre === 'Fiche de renseignements (pour les lieux)', JSON.stringify(d));

// ---------------------------------------------------------------- un spectacle sans page : le dossier ne se montre pas, et le dit
await page.evaluate(() => { sessionStorage.setItem('crescite-onglet-sp', 'Documents'); location.hash = '#/spectacles/cassandres'; });
await page.waitForSelector('[data-doc="705"]', { timeout: 10000 }).catch(() => {});
const o705 = await ou(705);
ok('le dossier d’un spectacle sans page publiée dit pourquoi le site ne le montre pas', /n’a pas de page publiée/.test(o705) && !/Je souhaite programmer/.test(o705), o705);

// ---------------------------------------------------------------- tous les spectacles d'un coup d'œil
await page.evaluate(() => { location.hash = '#/equipe/documents'; });
await page.waitForSelector('.recap-docs', { timeout: 10000 }).catch(() => {});
const ligne = slug => page.$$eval('.recap-docs tbody tr', (xs, s) => { const r = xs.find(x => x.querySelector(`a[href="#/spectacles/${s}"]`)); return r ? [...r.children].map(c => c.textContent.trim()) : null; }, slug);
const lb = await ligne('berenice'), lf = await ligne('la-folle-idee');
ok('« Les dossiers des spectacles » : Bérénice a son dossier du spectacle, son dossier scolaire, sa fiche technique', !!lb && /Dossier du spectacle 2026/.test(lb[1]) && /Dossier scolaire 2026/.test(lb[2]) && /Fiche technique et plan/.test(lb[3]), JSON.stringify(lb));
ok('… et un spectacle sans dossier déposé dit qu’il est à déposer', !!lf && /À déposer/.test(lf[1]) && /Sans action culturelle/.test(lf[2]) && /Sur demande/.test(lf[3]), JSON.stringify(lf));
ok('un nom du récapitulatif mène à l’onglet Documents du spectacle', await page.$eval('.recap-docs tbody tr a[href="#/spectacles/berenice"]', a => a.dataset.ongletSp === 'Documents').catch(() => false));
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(CAPT, 'recapitulatif.png'), fullPage: true });

ok('aucune erreur dans la page', !erreurs.length, erreurs.join(' | '));
await navigateur.close();
bilan(CAPT);
