// Le tableur des représentations (rubrique Représentations, vue « Tableur » : #/representations/tableur), tel qu'il est
// aujourd'hui, vérifié dans Chromium, hors ligne, sur la base fictive commune (admin-fictif.mjs).
//   node site/tableur.mjs
// C'est le filet sous lequel le tableur change de place : le banc n'ouvre que la page (jamais le source), il cherche la
// grille par ses rôles et ses identifiants (table[role=grid], #tab-corps, td.actif…) et par ce qu'elle écrit dans la base
// fictive (MODIFS). Le rendu (lignes, colonnes, colonnes vides repliées, colonnes collées), le clavier (flèches, Entrée,
// F2, Échap, Tab, Ctrl+A, taper pour écrire), l'édition d'une case qui vaut pour toute une date, le collage d'un texte
// de tableur, Ctrl+Z, la fenêtre de la distribution et « Étendre à… », l'import, l'export CSV et Excel. Les captures
// vont dans site/dist/shots-tableur/. Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, URL0, plus, DB, MODIFS, ok, calme, ouvrir, texte, compte, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-tableur');
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
const attendre = (page, fn, ms = 6000, arg = null) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);

// ---- ce que le banc lit dans la page : une case se trouve par sa ligne (data-l) et sa colonne (la classe c-<clé>)
const CASE = (l, k) => `#tab-corps tr[data-l="${l}"] td.c-${k}`;
const lignes = page => page.$$eval('#tab-corps tr[data-l]', xs => xs.length);
const enTetes = page => page.$$eval('#tab-tete th', xs => xs.map(x => x.className.split(' ').find(c => c.startsWith('c-')).slice(2)));
const actif = page => page.$eval('#tab-corps td.actif', td => ({ l: +td.parentNode.dataset.l, k: [...td.classList].find(c => c.startsWith('c-')).slice(2), focus: document.activeElement === td })).catch(() => null);
const cases = (page, l, k) => page.$eval(CASE(l, k), td => td.textContent.replace(/\s+/g, ' ').trim());
const etat = page => texte(page, '#tab-etat');
const ecrit = (n0, rpc) => MODIFS.slice(n0).filter(m => m.rpc === rpc);
// se placer sur une case : un clic, sauf si elle est déjà la case active (un clic sur elle se mettrait à écrire)
async function aller(page, l, k) {
  if (await page.$eval(CASE(l, k), td => td.classList.contains('actif'))) await page.focus(CASE(l, k)); else await page.click(CASE(l, k));
  await attendre(page, s => document.activeElement?.matches(s), 2000, CASE(l, k));
}
const enregistre = page => attendre(page, () => /^(Enregistré|Annulé|Pas enregistré|Retour impossible|Rien)/.test(document.querySelector('#tab-etat')?.textContent || ''), 8000);
// un texte de tableur « collé » : Playwright hors ligne n'a pas de presse-papiers, l'événement est construit dans la page
const coller = (page, tsv) => page.evaluate(t => { const dt = new DataTransfer(); dt.setData('text/plain', t); document.querySelector('#tab').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, tsv);
const copier = page => page.evaluate(() => { const dt = new DataTransfer(); document.querySelector('#tab').dispatchEvent(new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true })); return dt.getData('text/plain'); });
const jjmmaaaa = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

// ================================================================================ 1 · le rendu
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '?mode=complet#/representations/tableur' });
  await page.waitForSelector('table[role=grid] #tab-corps tr[data-l]', { timeout: 15000 });
  ok('1 · la grille est une table[role=grid] nommée, avec son corps #tab-corps', (await compte(page, 'table[role=grid]#tab #tab-corps')) === 1 && /une ligne par séance/.test(await page.$eval('table[role=grid]', t => t.getAttribute('aria-label'))));
  ok('1 · sept lignes à venir, une par séance : 101, 102, 103 (deux séances), 105, 106, 107', (await lignes(page)) === 7);
  const cols = await enTetes(page), rowcount = await page.$eval('#tab', t => t.getAttribute('aria-rowcount')), colcount = await page.$eval('#tab', t => t.getAttribute('aria-colcount'));
  ok('1 · aria-rowcount (en-tête comprise) et aria-colcount disent la grille', rowcount === '8' && colcount === String(cols.length) && cols.length >= 10, `${rowcount} × ${colcount}`);
  ok('1 · chaque case est une gridcell numérotée (aria-colindex), chaque ligne aussi (aria-rowindex 2 à 8)', await page.evaluate(() => {
    const rs = [...document.querySelectorAll('#tab-corps tr[data-l]')];
    return rs.every((r, i) => r.getAttribute('role') === 'row' && r.getAttribute('aria-rowindex') === String(i + 2) && [...r.children].every((td, j) => td.getAttribute('role') === 'gridcell' && td.getAttribute('aria-colindex') === String(j + 1)));
  }));
  ok('1 · les colonnes d’aujourd’hui : Jour et Spectacle en tête, puis Heure, Lieu, Commune, Public, Statut, Nature, Distribution…', cols[0] === 'jour' && cols[1] === 'spectacle' && ['heure', 'lieu', 'commune', 'public', 'statut', 'nature', 'distribution', 'organisateur', 'contact', 'contrat', 'site'].every(k => cols.includes(k)), cols.join(','));
  ok('1 · les colonnes vides sont repliées : Fin, Billetterie, Précisions, Notes, Jauge… ne sont pas là, la phrase du compte le dit', !['fin', 'billetterie', 'precisions', 'notes', 'chiffre-jauge', 'annulee'].some(k => cols.includes(k)) && /colonnes vides repliées/.test(await texte(page, '#tab-compte')));
  ok('1 · le compte dit « 7 séances · 6 dates »', /^7 séances · 6 dates/.test(await texte(page, '#tab-compte')), await texte(page, '#tab-compte'));
  ok('1 · l’en-tête de la colonne Jour porte aria-sort (croissant)', (await page.$eval('#tab-tete th.c-jour', th => th.getAttribute('aria-sort'))) === 'ascending');
  ok('1 · la date du 19 novembre a deux séances (10h, 14h30) : la seconde ligne répète les cases de la date (.repete)', (await cases(page, 2, 'heure')) === '10h' && (await cases(page, 3, 'heure')) === '14h30'
    && await page.$eval(CASE(3, 'statut'), td => td.classList.contains('repete')) && !(await page.$eval(CASE(2, 'statut'), td => td.classList.contains('repete'))) && !(await page.$eval(CASE(3, 'heure'), td => td.classList.contains('repete'))));
  ok('1 · les cases des répétitions et des résidences sont en lecture seule pour la colonne Site, celle de la date masquée dit « masquée »', (await cases(page, 4, 'site')) === 'masquée' && (await page.$eval(CASE(5, 'site'), td => td.getAttribute('aria-readonly'))) === 'true');
  ok('1 · la commune vient du lieu : lecture seule (aria-readonly)', (await page.$eval(CASE(0, 'commune'), td => td.getAttribute('aria-readonly'))) === 'true' && (await cases(page, 0, 'commune')) === 'Caen (14)');
  ok('1 · une période (répétitions) s’écrit « jour → jour » dans la colonne Jour', /→/.test(await cases(page, 5, 'jour')));
  ok('1 · une seule case porte tabindex 0 (la case active, la première), et elle est marquée .actif', await page.evaluate(() => document.querySelectorAll('#tab-corps td[tabindex="0"]').length === 1 && document.querySelector('#tab-corps td[tabindex="0"]').classList.contains('actif')));
  ok('1 · la distribution s’affiche en pastilles rondes aux initiales (Camille Essai, Jean Durand pour la première séance)', await page.$$eval(`${CASE(0, 'distribution')} .avatar.mini`, xs => xs.map(x => x.textContent.trim()).join(',')) === 'CE,JD');
  // le bouton « Supprimer » dit sur quoi il agit, et son raccourci
  ok('1 · « Supprimer la séance du … » annonce son raccourci (aria-keyshortcuts)', (await page.$eval('#tab-suppr', b => b.getAttribute('aria-keyshortcuts'))) === 'Control+Delete' && /^Supprimer la séance du/.test(await texte(page, '#tab-suppr')));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/tableur-1600.png`, fullPage: false });
  ok('1 · aucune erreur de script (rendu)', erreurs.length === 0, erreurs.join(' / '));

  // ================================================================================ 2 · les filtres et le tri
  await page.fill('#f-q', 'volcan');
  await attendre(page, () => document.querySelectorAll('#tab-corps tr[data-l]').length === 1);
  ok('2 · chercher « volcan » ne laisse que la séance du Havre, le compte suit', (await lignes(page)) === 1 && /^1 séance · 1 date/.test(await texte(page, '#tab-compte')) && (await cases(page, 0, 'lieu')) === 'Le Volcan');
  await page.fill('#f-q', 'zzzz');
  await attendre(page, () => document.querySelector('#tab-corps .tab-vide'));
  ok('2 · rien ne correspond : la grille le dit et propose d’effacer les filtres', /Aucune séance ne correspond/.test(await texte(page, '#tab-corps')) && (await compte(page, '#tab-corps [data-effacer-filtres]')) === 1);
  await page.fill('#f-q', '');
  await page.click('[data-f-periode="passees"]');
  await attendre(page, () => document.querySelectorAll('#tab-corps tr[data-l]').length === 1);
  ok('2 · « Passées » ne montre que la date d’il y a quarante jours (104), le bouton est enfoncé (aria-pressed)', (await lignes(page)) === 1 && (await page.$eval('[data-f-periode="passees"]', b => b.getAttribute('aria-pressed'))) === 'true' && (await cases(page, 0, 'spectacle')) === 'La Folle Idée');
  await page.click('[data-f-periode="avenir"]');
  await attendre(page, () => document.querySelectorAll('#tab-corps tr[data-l]').length === 7);
  await page.click('#tab-tri');
  await attendre(page, () => document.querySelector('#tab-tete th.c-jour')?.getAttribute('aria-sort') === 'descending');
  ok('2 · le bouton du jour inverse le tri : la résidence de 2027 passe en tête (aria-sort décroissant)', (await cases(page, 0, 'spectacle')) === 'Cassandres' && (await lignes(page)) === 7);
  await page.click('#tab-tri');
  await attendre(page, () => document.querySelector('#tab-tete th.c-jour')?.getAttribute('aria-sort') === 'ascending');
  ok('2 · … et le remet dans l’ordre', (await cases(page, 0, 'spectacle')) === 'Bérénice');
  const sans = await enTetes(page).then(c => c.length);
  await page.check('#tab-vides');
  await attendre(page, n => document.querySelectorAll('#tab-tete th').length > n, 4000, sans);
  const toutes = await enTetes(page);
  ok('2 · « Colonnes vides » les déplie toutes : la grille passe de ' + sans + ' à ' + toutes.length + ' colonnes (Fin, Billetterie, Notes, Jauge, Séance annulée reviennent)', toutes.length > sans && ['fin', 'billetterie', 'precisions', 'notes', 'chiffre-jauge', 'chiffre-spectateurs', 'chiffre-heures_ateliers', 'annulee', 'montant'].every(k => toutes.includes(k)) && (await page.$eval('#tab', t => t.getAttribute('aria-colcount'))) === String(toutes.length), `${toutes.length} colonnes`);
  await page.uncheck('#tab-vides');
  await attendre(page, n => document.querySelectorAll('#tab-tete th').length === n, 4000, sans);
  ok('2 · … et les replie', (await enTetes(page)).length === sans);
  // (« Colonnes vides » est une préférence du compte depuis le lot 10 : la base fictive la garde pour les sections suivantes ; on
  // attend que le décochage y soit écrit avant de fermer la page, sinon l'export plus bas hériterait des colonnes vides)
  for (let i = 0; i < 60 && DB.crescite_preferences.find(p => p.cle === 'tableur.colonnes')?.valeur?.complet?.vides !== false; i++) await page.waitForTimeout(50);
  await ctx.close();
}

// ================================================================================ 3 · le clavier
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '?mode=complet#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  const cols = await enTetes(page), derniere = cols[cols.length - 1];
  await page.click(CASE(0, 'jour'));
  let a = await actif(page);
  ok('3 · un clic place la case active (ligne 0, Jour) et le focus du clavier dessus', a && a.l === 0 && a.k === 'jour' && a.focus, JSON.stringify(a));
  await page.keyboard.press('ArrowRight');
  a = await actif(page);
  ok('3 · → : la colonne suivante (Spectacle)', a.l === 0 && a.k === 'spectacle', JSON.stringify(a));
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
  a = await actif(page);
  ok('3 · ↓ deux fois : deux lignes plus bas', a.l === 2 && a.k === 'spectacle', JSON.stringify(a));
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowUp');
  a = await actif(page);
  ok('3 · ← et ↑ reviennent en arrière', a.l === 1 && a.k === 'jour', JSON.stringify(a));
  await page.keyboard.press('Control+ArrowDown');
  a = await actif(page);
  ok('3 · Ctrl+↓ va à la dernière ligne', a.l === 6 && a.k === 'jour', JSON.stringify(a));
  await page.keyboard.press('End');
  a = await actif(page);
  ok('3 · Fin va à la dernière colonne de la ligne', a.l === 6 && a.k === derniere, JSON.stringify(a));
  await page.keyboard.press('Control+Home');
  a = await actif(page);
  ok('3 · Ctrl+Début revient à la première case', a.l === 0 && a.k === 'jour', JSON.stringify(a));
  await page.keyboard.press('Shift+ArrowDown'); await page.keyboard.press('Shift+ArrowRight');
  const choisies = await page.$$eval('#tab-corps td.choisie', xs => xs.length), marquees = await page.$$eval('#tab-corps td[aria-selected="true"]', xs => xs.length);
  ok('3 · Maj+flèches choisissent une plage de 2 × 2 cases (.choisie, aria-selected), le bouton Supprimer parle de « ces 2 séances »', choisies === 4 && marquees === 4 && /^Supprimer ces 2 séances/.test(await texte(page, '#tab-suppr')), `${choisies}, ${marquees}`);
  await page.keyboard.press('Escape');
  a = await actif(page);
  ok('3 · Échap défait la plage mais garde la case active', (await compte(page, '#tab-corps td.choisie')) === 0 && a.l === 1 && a.k === 'spectacle', JSON.stringify(a));
  await page.keyboard.press('Control+a');
  const n = await lignes(page);
  ok('3 · Ctrl+A choisit toute la grille', (await compte(page, '#tab-corps td.choisie')) === n * cols.length, `${await compte(page, '#tab-corps td.choisie')} sur ${n * cols.length}`);
  await page.keyboard.press('Escape');
  // Tab : de case en case, et à la fin d'une ligne au début de la suivante
  await page.keyboard.press('Control+Home');
  await page.keyboard.press('Tab');
  a = await actif(page);
  ok('3 · Tab passe à la case de droite', a.l === 0 && a.k === 'spectacle', JSON.stringify(a));
  await page.keyboard.press('Shift+Tab');
  a = await actif(page);
  ok('3 · Maj+Tab revient', a.l === 0 && a.k === 'jour', JSON.stringify(a));
  await page.keyboard.press('End'); await page.keyboard.press('Tab');
  a = await actif(page);
  ok('3 · Tab au bout d’une ligne passe au début de la ligne suivante', a.l === 1 && a.k === 'jour', JSON.stringify(a));
  // Entrée / F2 écrivent, Échap renonce
  const n0 = MODIFS.length;
  await aller(page, 0, 'organisateur');
  await page.keyboard.press('Enter');
  const ed = await page.$eval(`${CASE(0, 'organisateur')} .tab-ed`, e => ({ tag: e.tagName, label: e.getAttribute('aria-label'), actif: document.activeElement === e })).catch(() => null);
  ok('3 · Entrée ouvre un champ dans la case (étiqueté, avec le focus) : Organisateur, pour les séances de la date', !!ed && ed.tag === 'INPUT' && ed.actif && /^Organisateur/.test(ed.label), JSON.stringify(ed));
  await page.keyboard.type('Brouillon');
  await page.keyboard.press('Escape');
  a = await actif(page);
  ok('3 · Échap renonce : le champ part, la case garde sa valeur, rien n’est écrit, le focus revient à la case', (await compte(page, '.tab-ed')) === 0 && (await cases(page, 0, 'organisateur')) === 'Théâtre de Caen' && MODIFS.length === n0 && a.l === 0 && a.k === 'organisateur' && a.focus, `${await cases(page, 0, 'organisateur')}`);
  await page.keyboard.press('F2');
  ok('3 · F2 ouvre aussi le champ', (await compte(page, `${CASE(0, 'organisateur')} .tab-ed`)) === 1);
  await page.keyboard.press('Escape');
  await aller(page, 1, 'contact');
  await page.keyboard.press('x');
  const tape = await page.$eval(`${CASE(1, 'contact')} .tab-ed`, e => e.value).catch(() => null);
  ok('3 · taper une lettre sur une case de texte ouvre le champ avec cette lettre', tape === 'x', String(tape));
  await page.keyboard.press('Escape');
  ok('3 · … et Échap l’abandonne sans rien écrire', (await compte(page, '.tab-ed')) === 0 && MODIFS.length === n0 && (await cases(page, 1, 'contact')) === '');
  await page.keyboard.press('Control+z');
  ok('3 · Ctrl+Z sans rien à annuler le dit', /Rien à annuler/.test(await etat(page)), await etat(page));
  ok('3 · aucune erreur de script (clavier)', erreurs.length === 0, erreurs.join(' / '));

  // ================================================================================ 4 · une case qui vaut pour toute la date
  const n1 = MODIFS.length;
  await aller(page, 2, 'statut');
  await page.keyboard.press('Enter');
  const sel = await page.$eval(`${CASE(2, 'statut')} select.tab-ed`, s => ({ valeur: s.value, label: s.getAttribute('aria-label'), choix: [...s.options].map(o => o.value).join(',') })).catch(() => null);
  ok('4 · Entrée sur le statut ouvre une liste, qui dit que la case vaut pour les 2 séances de la date', !!sel && sel.valeur === 'confirmee' && /pour les 2 séances/.test(sel.label) && /option/.test(sel.choix), JSON.stringify(sel));
  await page.selectOption(`${CASE(2, 'statut')} select.tab-ed`, 'option');
  await page.keyboard.press('Enter');
  await enregistre(page);
  const rpcs = ecrit(n1, 'crescite_enregistrer_date');
  const d = rpcs[0]?.corps?.d;
  ok('4 · Entrée valide : un seul enregistrement de la date 103, avec ses deux séances et le statut « option »', rpcs.length === 1 && d && d.id === 103 && d.statut === 'option' && Array.isArray(d.representations) && d.representations.length === 2, JSON.stringify(d ? { id: d.id, statut: d.statut, reps: d.representations?.length } : rpcs));
  ok('4 · les deux lignes de la date montrent « Option »', (await cases(page, 2, 'statut')) === 'Option' && (await cases(page, 3, 'statut')) === 'Option');
  ok('4 · la case écrite et la case répétée de l’autre ligne sont marquées .enregistree, l’état dit « Enregistré »', await page.$eval(CASE(2, 'statut'), td => td.classList.contains('enregistree')) && await page.$eval(CASE(3, 'statut'), td => td.classList.contains('enregistree')) && /^Enregistré/.test(await etat(page)), await etat(page));
  ok('4 · l’état propose « Annuler » (Ctrl Z)', (await compte(page, '#tab-annuler')) === 1);
  await calme(page);
  await page.keyboard.press('Control+z');
  await attendre(page, () => /^Annulé/.test(document.querySelector('#tab-etat')?.textContent || ''), 8000);
  const retour = ecrit(n1, 'crescite_enregistrer_date')[1]?.corps?.d;
  ok('4 · Ctrl+Z défait : la date est réécrite « confirmée », avec ses deux séances', !!retour && retour.id === 103 && retour.statut === 'confirmee' && (await cases(page, 2, 'statut')) === 'Confirmée' && (await cases(page, 3, 'statut')) === 'Confirmée', JSON.stringify(retour && { id: retour.id, statut: retour.statut }));
  ok('4 · … et l’état dit « Annulé »', /^Annulé/.test(await etat(page)), await etat(page));

  // ================================================================================ 5 · coller un texte de tableur
  const n2 = MODIFS.length;
  await aller(page, 0, 'organisateur');
  await coller(page, 'Salle A\t06 00 00 00 01\nSalle B\t06 00 00 00 02');
  await enregistre(page);
  await attendre(page, () => document.querySelector('#tab-etat')?.className.includes('ok'), 8000);
  const collees = ecrit(n2, 'crescite_enregistrer_date');
  const suivis = collees.map(m => ({ id: m.corps.d.id, org: m.corps.d.suivi?.organisateur, contact: m.corps.d.suivi?.contact })).sort((x, y) => x.id - y.id);
  ok('5 · deux lignes × deux colonnes collées : une écriture par date (101 et 102), organisateur et contact posés', suivis.length === 2 && suivis[0].id === 101 && suivis[0].org === 'Salle A' && suivis[0].contact === '06 00 00 00 01' && suivis[1].id === 102 && suivis[1].org === 'Salle B', JSON.stringify(suivis));
  ok('5 · les cases le montrent, l’état dit « 4 cases collées »', (await cases(page, 0, 'organisateur')) === 'Salle A' && (await cases(page, 1, 'contact')) === '06 00 00 00 02' && /4 cases collées/.test(await etat(page)), await etat(page));
  await page.keyboard.press('Control+z');
  await attendre(page, () => /^Annulé/.test(document.querySelector('#tab-etat')?.textContent || ''), 8000);
  ok('5 · Ctrl+Z défait tout le collage d’un coup : le Théâtre de Caen revient, le contact de la date 102 est vide', (await cases(page, 0, 'organisateur')) === 'Théâtre de Caen' && (await cases(page, 1, 'contact')) === '' && (await cases(page, 0, 'contact')) === 'Régie 02 31 00 00 00');
  // un texte qui n'est pas reconnu : rien n'est écrit
  const n3 = MODIFS.length;
  await aller(page, 0, 'statut');
  await coller(page, 'n’importe quoi');
  await attendre(page, () => /Rien de collé/.test(document.querySelector('#tab-etat')?.textContent || ''), 3000);
  ok('5 · une valeur non reconnue n’est pas collée : « Rien de collé », aucune écriture', /Rien de collé/.test(await etat(page)) && MODIFS.length === n3, await etat(page));
  // un même texte sur une plage choisie : toutes les cases
  await aller(page, 0, 'contact');
  await page.keyboard.press('Shift+ArrowDown');
  await coller(page, 'Mme Test');
  await enregistre(page);
  ok('5 · un seul mot collé sur une plage de deux cases les remplit toutes les deux', (await cases(page, 0, 'contact')) === 'Mme Test' && (await cases(page, 1, 'contact')) === 'Mme Test', `${await cases(page, 0, 'contact')} / ${await cases(page, 1, 'contact')}`);
  await page.keyboard.press('Control+z');
  await attendre(page, () => /^Annulé/.test(document.querySelector('#tab-etat')?.textContent || ''), 8000);
  ok('5 · Ctrl+Z remet les contacts comme avant', (await cases(page, 0, 'contact')) === 'Régie 02 31 00 00 00' && (await cases(page, 1, 'contact')) === '');
  // copier
  await aller(page, 2, 'heure');
  await page.keyboard.press('Shift+ArrowDown'); await page.keyboard.press('Shift+ArrowRight');
  const tsv = await copier(page);
  ok('5 · Ctrl+C met la plage dans le presse-papiers en colonnes séparées par des tabulations (10:00, 14:30 et le lieu)', tsv.split('\n').length === 2 && tsv.split('\n').every(l => l.split('\t').length === 2) && /^10:00\t/.test(tsv) && /\n14:30\t/.test(tsv), JSON.stringify(tsv));
  ok('5 · aucune erreur de script (collage)', erreurs.length === 0, erreurs.join(' / '));

  // ================================================================================ 6 · la fenêtre de la distribution, « Étendre à… »
  const n4 = MODIFS.length;
  await aller(page, 4, 'distribution');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.tab-pop[role=dialog]', { timeout: 4000 });
  const pop = await page.evaluate(() => ({ membres: [...document.querySelectorAll('.tab-pop.distribution [data-eqd-part]')].map(x => x.parentNode.textContent.trim()), champ: document.activeElement === document.querySelector('.tab-pop.distribution #dfn-combo input'), nom: document.querySelector('.tab-pop').getAttribute('aria-labelledby') }));
  ok('6 · Entrée sur la distribution ouvre une fenêtre nommée : « En tournée » liste qui part (Camille Essai, Jean Durand), le focus est dans le champ d’ajout', pop.membres.join(',') === 'Camille Essai,Jean Durand' && pop.champ && !!pop.nom, JSON.stringify(pop));
  await page.keyboard.type('Lé');
  await attendre(page, () => document.querySelector('.tab-pop .suggestions:not([hidden]) button[data-p]'));
  const liste = await page.evaluate(() => ({ options: [...document.querySelectorAll('.tab-pop .suggestions button[data-p]')].map(o => o.textContent.replace(/\s+/g, ' ').trim()) }));
  ok('6 · taper « Lé » propose Léa Martin, et elle seule', liste.options.length === 1 && /Léa Martin/.test(liste.options[0]), JSON.stringify(liste));
  await page.keyboard.press('Enter');
  ok('6 · Entrée l’ajoute : Léa est dans « Remplaçants et renforts », le champ se vide', (await compte(page, '.tab-pop [data-eqd-ajout="3"]')) === 1 && (await page.$eval('.tab-pop #dfn-combo input', q => q.value)) === '');
  await calme(page);
  await page.screenshot({ path: `${CAPT}/tableur-distribution.png`, fullPage: false });
  await page.click('.tab-pop [data-eq-ok]');
  await enregistre(page);
  const equipes = MODIFS.slice(n4).filter(m => m.table === 'crescite_equipes' && m.post);
  ok('6 · Enregistrer : la date est écrite, puis l’équipe (crescite_equipes upsert : Léa présente sur la date 105)', ecrit(n4, 'crescite_enregistrer_date').length === 1 && equipes.length === 1 && equipes[0].conflit.join() === 'date_id,personne_id' && equipes[0].post.some(r => r.date_id === 105 && r.personne_id === 3 && r.present === true), JSON.stringify(equipes));
  ok('6 · la fenêtre se ferme, la case montre Camille, Léa (le jeu) puis Jean (la technique), par leurs initiales', (await compte(page, '.tab-pop')) === 0 && (await page.$$eval(`${CASE(4, 'distribution')} .avatar.mini`, xs => xs.map(x => x.textContent.trim()).join(','))) === 'CE,LM,JD');
  ok('6 · l’équipe est poussée dans l’état de la page : la base fictive la porte', DB.crescite_equipes.some(r => r.date_id === 105 && r.personne_id === 3 && r.present));
  // « Étendre à… »
  await aller(page, 4, 'distribution');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.tab-pop [data-eq-etendre]', { timeout: 4000 });
  await page.click('.tab-pop [data-eq-etendre]');
  await page.waitForSelector('dialog.tab-dialogue[open]', { timeout: 4000 });
  await attendre(page, () => /changeront/.test(document.querySelector('#tab-et-apercu')?.textContent || ''));
  const apercu = await texte(page, '#tab-et-apercu');
  ok('6 · « Étendre à… » ouvre un dialogue nommé, avec un aperçu : 2 dates changeront, 1 est déjà à jour', /Étendre la distribution/.test(await texte(page, 'dialog.tab-dialogue h2')) && /2 dates changeront/.test(apercu) && /1 date est déjà à jour/.test(apercu), apercu);
  ok('6 · le bouton dit ce qu’il fera : « Appliquer à 2 dates »', (await texte(page, '#tab-et-ok')) === 'Appliquer à 2 dates');
  const n5 = MODIFS.length;
  await page.click('#tab-et-non');
  await attendre(page, () => !document.querySelector('dialog.tab-dialogue'));
  ok('6 · « Annuler » ferme le dialogue sans rien écrire', (await compte(page, 'dialog.tab-dialogue')) === 0 && MODIFS.length === n5);
  await aller(page, 4, 'distribution');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.tab-pop [data-eq-etendre]', { timeout: 4000 });
  await page.click('.tab-pop [data-eq-etendre]');
  await page.waitForSelector('dialog.tab-dialogue[open] #tab-et-ok:not([disabled])', { timeout: 4000 });
  await page.click('#tab-et-ok');
  await attendre(page, () => !document.querySelector('dialog.tab-dialogue') && /Distribution posée/.test(document.querySelector('#tab-etat')?.textContent || ''), 10000);
  const posees = MODIFS.slice(n5).filter(m => m.table === 'crescite_equipes' && m.post).flatMap(m => m.post.filter(r => r.personne_id === 3 && r.present).map(r => r.date_id)).sort();
  ok('6 · « Appliquer » pose Léa sur les deux autres dates de Bérénice (101 et 103), l’état dit « Distribution posée sur 2 dates »', posees.join() === '101,103' && /Distribution posée sur 2 dates/.test(await etat(page)), `${posees} · ${await etat(page)}`);
  ok('6 · les trois dates de Bérénice montrent Léa', (await page.$$eval(`${CASE(0, 'distribution')} .avatar.mini`, xs => xs.map(x => x.textContent.trim()).join(','))) === 'CE,LM,JD' && (await page.$$eval(`${CASE(2, 'distribution')} .avatar.mini`, xs => xs.length)) === 3);
  await page.keyboard.press('Control+z');
  await attendre(page, () => /^Annulé/.test(document.querySelector('#tab-etat')?.textContent || ''), 10000);
  await page.keyboard.press('Control+z');
  await attendre(page, s => [...document.querySelectorAll(s)].map(x => x.textContent.trim()).join() === 'CE,JD', 10000, `${CASE(4, 'distribution')} .avatar.mini`);
  ok('6 · deux fois Ctrl+Z : l’extension puis l’ajout se défont, plus personne en renfort dans la base fictive', !DB.crescite_equipes.some(r => r.personne_id === 3 && r.present) && (await page.$$eval(`${CASE(4, 'distribution')} .avatar.mini`, xs => xs.map(x => x.textContent.trim()).join(','))) === 'CE,JD', JSON.stringify(DB.crescite_equipes));
  ok('6 · aucune erreur de script (distribution)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 7 · importer, exporter
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1600, hauteur: 1000, hash: '?mode=complet#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  await page.click('#tab-importer');
  await page.waitForSelector('dialog[open] #tab-im-texte', { timeout: 4000 });
  ok('7 · « Importer » ouvre un dialogue nommé, le champ des lignes a le focus', (await page.$eval('dialog[open]', d => d.getAttribute('aria-labelledby'))) === 'tab-im-titre' && await page.evaluate(() => document.activeElement?.id === 'tab-im-texte'));
  await page.fill('#tab-im-texte', `Jour\tHeure\tSpectacle\tLieu\n${jjmmaaaa(plus(70))}\t20h30\tSpectacle fantôme\tLe Volcan`);
  await attendre(page, () => document.querySelector('#tab-im-apercu .tab-im-erreur'));
  ok('7 · une ligne au spectacle inconnu reste de côté, l’aperçu le dit, « Créer » est grisé', /spectacle inconnu/.test(await texte(page, '#tab-im-apercu')) && (await page.$eval('#tab-im-ok', b => b.disabled)));
  await page.fill('#tab-im-texte', `Jour\tHeure\tSpectacle\tLieu\n${jjmmaaaa(plus(70))}\t20h30\tLa Folle Idée\tLe Volcan`);
  await attendre(page, () => /1 séance à créer/.test(document.querySelector('#tab-im-apercu')?.textContent || ''));
  ok('7 · la ligne reconnue : « 1 séance à créer », nouvelle date, colonnes lues nommées, « Créer 1 séance »', /nouvelle date/.test(await texte(page, '#tab-im-apercu')) && /colonnes lues : Jour, Heure, Spectacle, Lieu/.test(await texte(page, '#tab-im-apercu')) && (await texte(page, '#tab-im-ok')) === 'Créer 1 séance' && !(await page.$eval('#tab-im-ok', b => b.disabled)), await texte(page, '#tab-im-apercu'));
  const n0 = MODIFS.length;
  await page.click('#tab-im-ok');
  await attendre(page, () => !document.querySelector('dialog[open] #tab-im-texte') && /^Import/.test(document.querySelector('#tab-etat')?.textContent || ''), 10000);
  const cree = ecrit(n0, 'crescite_enregistrer_date')[0]?.corps?.d;
  ok('7 · « Créer » écrit une nouvelle date (le spectacle 2, le lieu 6, une séance à 20h30)', !!cree && !cree.id && cree.spectacle_id === 2 && cree.lieu_id === 6 && cree.representations?.length === 1 && /^20:30/.test(cree.representations[0].heure), JSON.stringify(cree && { id: cree.id, sp: cree.spectacle_id, lieu: cree.lieu_id, reps: cree.representations }));
  ok('7 · l’état dit « Import : 1 séance créée, dont 1 nouvelle date », la grille a une ligne de plus', /Import : 1 séance créée, dont 1 nouvelle date/.test(await etat(page)) && (await lignes(page)) === 8, await etat(page));
  await page.click('#tab-annuler');
  await attendre(page, () => document.querySelectorAll('#tab-corps tr[data-l]').length === 7, 10000);
  ok('7 · « Annuler » (le bouton de l’état) retire la date importée : la base fictive la perd, sept lignes', (await lignes(page)) === 7 && MODIFS.slice(n0).some(m => m.table === 'crescite_dates' && m.delete), String(await lignes(page)));
  await page.click('#tab-importer');
  await page.waitForSelector('dialog[open] #tab-im-texte', { timeout: 4000 });
  await page.keyboard.press('Escape');
  ok('7 · Échap sur un import vide le ferme sans question', await attendre(page, () => !document.querySelector('#tab-im-texte')) && !(await page.$('dialog.gq[open]')));

  // exporter : CSV et Excel sont des fichiers (des blobs) téléchargés
  await page.click('#tab-exporter');
  ok('7 · « Exporter » déplie un groupe de trois formats, le bouton le dit (aria-expanded)', (await page.$eval('#tab-exporter', b => b.getAttribute('aria-expanded'))) === 'true' && (await compte(page, '#tab-export [data-export]')) === 3);
  const [csv] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('#tab-export [data-export="csv"]')]);
  const brut = fs.readFileSync(await csv.path(), 'utf8'), l = brut.replace(/^﻿/, '').split('\r\n');
  ok('7 · le CSV porte le nom crescite-representations-<jour>.csv, un BOM, des points-virgules, un en-tête et huit lignes', /^crescite-representations-\d{4}-\d{2}-\d{2}\.csv$/.test(csv.suggestedFilename()) && brut.startsWith('﻿') && /^Jour;Spectacle;Heure;Lieu;Commune;Public;Statut/.test(l[0]) && l.length === 8, `${csv.suggestedFilename()} · ${l.length} lignes · ${l[0]}`);
  ok('7 · … avec les jours en jj/mm/aaaa et les cases de la vue (Bérénice, Théâtre de Caen, Confirmée)', /^\d{2}\/\d{2}\/\d{4};Bérénice;20:00;Théâtre de Caen;Caen \(14\);Tout public;Confirmée/.test(l[1]), l[1]);
  await attendre(page, () => /^CSV/.test(document.querySelector('#tab-etat')?.textContent || ''), 3000);
  await page.click('#tab-exporter');
  const [xl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('#tab-export [data-export="xlsx"]')]);
  const octets = fs.readFileSync(await xl.path());
  ok('7 · l’export Excel est un classeur .xlsx (une archive zip : « PK », workbook.xml, la feuille Représentations)', /\.xlsx$/.test(xl.suggestedFilename()) && octets.slice(0, 2).toString() === 'PK' && octets.includes('xl/workbook.xml') && octets.includes('Représentations'), xl.suggestedFilename());
  ok('7 · aucune erreur de script (import, export)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 8 · à 1280 px : les colonnes collées
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1280, hauteur: 800, hash: '?mode=complet#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  await page.check('#tab-vides');
  await attendre(page, () => document.querySelectorAll('#tab-tete th').length > 15, 4000);
  const defile = await page.$eval('#tab-cadre', c => { c.scrollLeft = c.scrollWidth; return { large: c.scrollWidth > c.clientWidth, gauche: c.scrollLeft }; });
  await attendre(page, () => document.querySelector('#tab-cadre').scrollLeft > 100, 4000);
  const g = await page.evaluate(() => {
    const cadre = document.querySelector('#tab-cadre').getBoundingClientRect(), j = document.querySelector('#tab-corps td.c-jour').getBoundingClientRect(), s = document.querySelector('#tab-corps td.c-spectacle').getBoundingClientRect(), hj = document.querySelector('#tab-tete th.c-jour').getBoundingClientRect();
    return { cadre: cadre.left, jour: j.left, jourDroite: j.right, spectacle: s.left, enTete: hj.left, pos: [getComputedStyle(document.querySelector('#tab-corps td.c-jour')).position, getComputedStyle(document.querySelector('#tab-corps td.c-spectacle')).position] };
  });
  ok('8 · à 1280 px, toutes colonnes dépliées, le cadre défile en large', defile.large && defile.gauche > 100, JSON.stringify(defile));
  ok('8 · défilé à droite, les colonnes Jour et Spectacle restent collées à gauche du cadre (position sticky), l’en-tête avec elles', g.pos.join() === 'sticky,sticky' && Math.abs(g.jour - g.cadre) <= 2 && Math.abs(g.enTete - g.cadre) <= 2 && Math.abs(g.spectacle - g.jourDroite) <= 2, JSON.stringify(g));
  await page.$eval('#tab-cadre', c => { c.scrollLeft = 0; });
  await page.uncheck('#tab-vides');
  await attendre(page, () => document.querySelectorAll('#tab-tete th').length < 15, 4000);
  await calme(page);
  await page.screenshot({ path: `${CAPT}/tableur-1280.png`, fullPage: false });
  ok('8 · aucune erreur de script (1280)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

await navigateur.close();
bilan(CAPT);
