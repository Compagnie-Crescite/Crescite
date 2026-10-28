// Les trois vues de Représentations (la liste, le tableur, la carte de tournée) et ce qu'elles partagent : le sélecteur de
// vues à icônes, la barre de filtres commune dont l'adresse porte l'état, « Voir dans le tableur » et le focus après un
// changement de vue (admin/index.html : choixVueDates, filtresDates, dateRetenue ; admin/tableur.js ; admin/tournee.js ;
// admin/menus.js), vérifiés dans Chromium, hors ligne, sur la base fictive commune (admin-fictif.mjs).
//   node site/vues-dates.mjs
// Ce que le banc regarde : la pilule (trois liens, une icône et un nom chacun, le nom masqué sous 1 100 px sans quitter le
// lien) ; la barre (les mêmes identifiants dans les trois vues, un compte par vue) ; l'état commun (une recherche et une
// période écrites depuis la liste se retrouvent dans l'adresse, le tableur et la carte, au rechargement et au précédent ;
// les cinq filtres de plus : nature, département, contrat, du, au) ; les annulées et les reportées sur la carte quand on
// les demande ; « Effacer les filtres » ; l'ancien lien ?tri=desc et les anciens états du tableur et de la carte ; le
// fondu d'une vue à l'autre ; le focus et l'annonce après un changement de vue ; « Voir dans le tableur » qui arrive sur
// la ligne ; la vue retenue (la clé representations.vue, écrite à chaque route à l'ordinateur et jamais au téléphone, lue par
// le lien « Représentations » du menu et par la page d'ouverture, sans toucher à l'adresse nue) et les touches V puis L / T / C.
// Les captures vont dans site/dist/shots-vues-dates/. Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, URL0, UID, plus, saisonDe, DB, ECRITURES, ok, calme, ouvrir, texte, compte, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-vues-dates');
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
const attendre = (page, fn, arg = null, ms = 6000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
const adresse = page => page.evaluate(() => location.search + location.hash);
const lignesListe = page => page.$$eval('#l-dates a.ligne', xs => xs.map(x => +x.getAttribute('href').split('/').pop()).sort((a, b) => a - b));
const lignesTableur = page => page.$$eval('#tab-corps tr[data-l]', xs => xs.length);
const etapesCarte = page => page.$$eval('#tn-etapes a.tn-date', xs => xs.map(x => +x.getAttribute('href').split('/').pop()).sort((a, b) => a - b));
const vue = (page, v) => page.evaluate(x => { location.hash = x; }, v === 'liste' ? '#/representations' : `#/representations/${v}`);
const IDS = ['#f-q', '#f-saison', '#f-public', '#f-statut', '#f-compte', '[data-sp]'];
// une date annulée au Havre et une reportée à Flers, le temps d'un bloc : la base fictive n'en a aucune
const date = (id, sp, lieu, debut, extra = {}) => ({ id, spectacle_id: sp, lieu_id: lieu, debut, fin: extra.fin || debut, precision: 'jour', saison: saisonDe(debut), public: 'tout_public', statut: 'confirmee', visible: true, nature: 'representations', intitule: null, details: [], lien: null, nb_representations: null, ...extra });

// ================================================================================ 1 · le sélecteur de vues
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations' });
  await page.waitForSelector('#l-dates a.ligne', { timeout: 15000 });
  const liens = await page.$$eval('nav.vues a', xs => xs.map(a => ({ href: a.getAttribute('href'), texte: a.textContent.trim(), svg: a.querySelectorAll('svg').length, courant: a.getAttribute('aria-current'), titre: a.title })));
  ok('1 · la pilule : trois liens (Liste, Tableur, Carte), chacun avec son icône et son nom', liens.length === 3 && liens.map(l => l.texte).join(',') === 'Liste,Tableur,Carte' && liens.every(l => l.svg === 1), JSON.stringify(liens));
  ok('1 · « Liste » est la vue courante (aria-current), les autres non ; chaque lien va à son adresse', liens.map(l => l.courant).join(',') === 'page,false,false' && liens.map(l => l.href).join(',') === '#/representations,#/representations/tableur,#/representations/carte', JSON.stringify(liens));
  ok('1 · chaque lien a son infobulle, avec la touche (« Vue liste (V puis L) »)', liens.map(l => l.titre).join(' | ') === 'Vue liste (V puis L) | Vue tableur (V puis T) | Vue carte (V puis C)', liens.map(l => l.titre).join(' | '));
  ok('1 · le texte du lien est son nom, rien de plus (la barre du niveau lit « Carte »)', await page.evaluate(() => document.querySelector('.tab-vue a[data-vue="carte"]').textContent === 'Carte'));
  const forme = await page.evaluate(() => { const n = document.querySelector('nav.vues'), r = n.getBoundingClientRect(), h1 = document.querySelector('.tete h1').getBoundingClientRect(), a = n.querySelector('a[aria-current="page"]'); return { haut: Math.round(r.height), cote: r.left - h1.right, rayon: getComputedStyle(n).borderTopLeftRadius, fond: getComputedStyle(a).backgroundImage }; });
  ok('1 · la pilule fait 44 px de haut et tient à côté du titre (pas poussée à l’autre bout)', forme.haut >= 44 && forme.cote >= 0 && forme.cote < 80, JSON.stringify(forme));
  ok('1 · la vue ouverte est en dégradé de la saison, la pilule est ronde', /gradient/.test(forme.fond) && parseFloat(forme.rayon) >= 20, JSON.stringify(forme));
  ok('1 · une annonce discrète pour les lecteurs d’écran (#vues-annonce, aria-live), pas le toast', await page.$eval('#vues-annonce', p => p.classList.contains('sr') && p.getAttribute('aria-live') === 'polite') && (await compte(page, '.annonce')) === 0);
  await calme(page);
  await page.screenshot({ path: `${CAPT}/vue-liste.png`, fullPage: false });
  ok('1 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1000, hauteur: 800, hash: '#/representations' });
  await page.waitForSelector('#l-dates a.ligne', { timeout: 15000 });
  const mini = await page.evaluate(() => [...document.querySelectorAll('nav.vues a')].map(a => { const m = a.querySelector('.mot').getBoundingClientRect(), r = a.getBoundingClientRect(); return { mot: Math.round(m.width), lien: Math.round(r.width), haut: Math.round(r.height), texte: a.textContent.trim(), titre: a.title }; }));
  ok('1 · à 1 000 px l’icône seule : le nom est masqué (1 px), reste dans le lien, l’infobulle le dit', mini.every(m => m.mot <= 1 && m.texte && m.titre) && mini.map(m => m.texte).join(',') === 'Liste,Tableur,Carte', JSON.stringify(mini));
  ok('1 · … et chaque lien reste une cible d’au moins 38 px sur 40', mini.every(m => m.lien >= 40 && m.haut >= 38), JSON.stringify(mini));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/selecteur-1000.png`, fullPage: false });
  ok('1 · aucune erreur de script (1 000 px)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 2 · une barre, les mêmes identifiants dans les trois vues
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations' });
  await page.waitForSelector('#l-dates a.ligne', { timeout: 15000 });
  for (const v of ['liste', 'tableur', 'carte']) {
    if (v !== 'liste') { await vue(page, v); await page.waitForSelector(v === 'tableur' ? '#tab-corps tr[data-l]' : '.tn-svg', { timeout: 8000 }); }
    const manque = [];
    for (const s of IDS) if ((await compte(page, s)) < 1) manque.push(s);
    ok(`2 · la barre de ${v} porte ${IDS.join(', ')}`, !manque.length, `manque : ${manque.join(', ')}`);
    ok(`2 · la barre de ${v} garde la classe filtres et son rôle de recherche (l’impression la lit), et aucun ancien identifiant de filtre`, await page.evaluate(() => { const b = document.querySelector('.filtres'); return !!b && b.getAttribute('role') === 'search' && !document.querySelector('#tab-q, #tab-saison, #tab-sp, [data-tab-periode], #tn-saison, [data-tn-sp], #tn-avenir, #tn-compte'); }));
  }
  ok('2 · la liste dit son compte dans #f-compte (« n à venir · m passées »)', (await vue(page, 'liste'), await attendre(page, () => /à venir/.test(document.querySelector('#f-compte')?.textContent || ''))) && /^\d+ à venir · \d+ passées?$/.test(await texte(page, '#f-compte')), await texte(page, '#f-compte'));
  await vue(page, 'carte');
  await attendre(page, () => /dates? ·/.test(document.querySelector('#f-compte')?.textContent || ''));
  ok('2 · la carte dit le sien dans #f-compte (« n dates · m lieux »)', /^\d+ dates? · \d+ lieux?$/.test(await texte(page, '#f-compte')), await texte(page, '#f-compte'));
  await vue(page, 'tableur');
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 8000 });
  ok('2 · le tableur garde le sien dans sa ligne d’état (#tab-compte) : #f-compte y est masqué, le compte n’est jamais dit deux fois', /séances? · \d+ dates?/.test(await texte(page, '#tab-compte')) && await page.$eval('#f-compte', e => e.hidden && getComputedStyle(e).display === 'none'));
  ok('2 · ce qui est propre à la vue est à droite de la barre : « Colonnes vides » (tableur)', await page.evaluate(() => !!document.querySelector('.filtres .f-propre #tab-vides')));
  ok('2 · la recherche dit ce qu’elle cherche : le tableur annonce les personnes et les notes, que la liste ne cherche pas', /personne/.test(await page.getAttribute('#f-q', 'placeholder')));
  await vue(page, 'carte');
  await page.waitForSelector('.tn-svg', { timeout: 8000 });
  ok('2 · … « Autour des dates » (carte)', await page.evaluate(() => !!document.querySelector('.filtres .f-propre #tn-serre')));
  await vue(page, 'liste');
  await page.waitForSelector('#l-dates a.ligne', { timeout: 8000 });
  ok('2 · … « Aller à une saison… » (liste), sous un autre identifiant que la saison de la barre', await page.evaluate(() => !!document.querySelector('.filtres .f-propre #f-saut') && document.querySelector('#f-saut') !== document.querySelector('#f-saison')));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/vue-liste-barre.png`, fullPage: false });
  ok('2 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 3 · changer de vue garde les filtres, l'adresse les porte
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations' });
  await page.waitForSelector('#l-dates a.ligne', { timeout: 15000 });
  await page.fill('#f-q', 'caen');
  await page.click('[data-f-periode="toutes"]');
  await attendre(page, () => /q=caen/.test(location.search) && /periode=toutes/.test(location.search));
  ok('3 · depuis la liste, ?q=caen&periode=toutes s’écrit dans l’adresse (rien d’autre : ce qui est d’office reste dehors)', /^\?(?=.*q=caen)(?=.*periode=toutes)[^#]*#\/representations$/.test(await adresse(page)) && !/saison=|statut=|public=|spectacle=|nature=/.test(await adresse(page)), await adresse(page));
  ok('3 · la liste montre les trois dates de Caen (101, 106, 107)', (await lignesListe(page)).join(',') === '101,106,107', (await lignesListe(page)).join(','));
  await page.click('nav.vues a[data-vue="tableur"]');
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 8000 });
  ok('3 · le lien Tableur garde la recherche et la période : même barre, même adresse', await page.evaluate(() => document.querySelector('#f-q').value === 'caen' && document.querySelector('[data-f-periode="toutes"]').getAttribute('aria-pressed') === 'true') && /q=caen/.test(await adresse(page)) && /periode=toutes/.test(await adresse(page)) && (await adresse(page)).endsWith('#/representations/tableur'), await adresse(page));
  ok('3 · le tableur ne montre que ces trois dates (une séance chacune)', (await lignesTableur(page)) === 3 && /^3 séances · 3 dates/.test(await texte(page, '#tab-compte')), await texte(page, '#tab-compte'));
  await page.click('nav.vues a[data-vue="carte"]');
  await page.waitForSelector('.tn-svg', { timeout: 8000 });
  await attendre(page, () => document.querySelector('#f-q')?.value === 'caen');
  ok('3 · le lien Carte aussi : la recherche, la période, l’adresse', await page.evaluate(() => document.querySelector('#f-q').value === 'caen' && document.querySelector('[data-f-periode="toutes"]').getAttribute('aria-pressed') === 'true') && /q=caen/.test(await adresse(page)) && (await adresse(page)).endsWith('#/representations/carte'), await adresse(page));
  ok('3 · la carte ne montre que Caen : les répétitions (106) n’y sont pas, la date (101) et la résidence (107) si', (await etapesCarte(page)).join(',') === '101,107' && /^2 dates · 1 lieu$/.test(await texte(page, '#f-compte')), `${(await etapesCarte(page)).join(',')} · ${await texte(page, '#f-compte')}`);
  await calme(page);
  await page.screenshot({ path: `${CAPT}/vue-carte.png`, fullPage: false });
  // le retour à la liste, le rechargement, le précédent
  await page.click('nav.vues a[data-vue="liste"]');
  await page.waitForSelector('#l-dates a.ligne', { timeout: 8000 });
  ok('3 · de retour à la liste : les trois mêmes dates', (await lignesListe(page)).join(',') === '101,106,107' && await page.$eval('#f-q', e => e.value === 'caen'));
  await page.click('nav.vues a[data-vue="tableur"]');
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 8000 });
  await calme(page);
  await page.screenshot({ path: `${CAPT}/vue-tableur.png`, fullPage: false });
  await page.reload();
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  ok('3 · un rechargement rouvre le tableur filtré (la recherche, la période, trois lignes)', await page.$eval('#f-q', e => e.value === 'caen') && (await lignesTableur(page)) === 3 && /periode=toutes/.test(await adresse(page)), await adresse(page));
  await page.goBack();
  await attendre(page, () => location.hash === '#/representations' && document.querySelector('#l-dates a.ligne'));
  ok('3 · le précédent du navigateur revient à la liste, filtrée comme on l’avait laissée', await page.$eval('#f-q', e => e.value === 'caen') && (await lignesListe(page)).join(',') === '101,106,107' && /q=caen/.test(await adresse(page)), await adresse(page));
  ok('3 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 4 · les cinq filtres de plus (nature, département, contrat, du, au) suivent aussi
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations' });
  await page.waitForSelector('#l-dates a.ligne', { timeout: 15000 });
  ok('4 · « Plus de filtres » est replié tant qu’aucun des cinq n’est choisi', await page.$eval('details.f-plus', d => !d.open));
  await page.click('details.f-plus > summary');
  await page.selectOption('#f-nature', 'repetitions');
  await attendre(page, () => /nature=repetitions/.test(location.search));
  ok('4 · nature=repetitions : la liste ne garde que la répétition (106), l’adresse la porte, le résumé compte 1', (await lignesListe(page)).join(',') === '106' && /nature=repetitions/.test(await adresse(page)) && /Plus de filtres\s*1/.test(await texte(page, 'details.f-plus > summary')), `${(await lignesListe(page)).join(',')} ${await adresse(page)}`);
  await page.click('nav.vues a[data-vue="tableur"]');
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 8000 });
  ok('4 · le tableur la garde : une seule ligne, « Plus de filtres » ouvert sur son choix', (await lignesTableur(page)) === 1 && await page.$eval('#f-nature', e => e.value === 'repetitions') && await page.$eval('details.f-plus', d => d.open));
  await page.click('nav.vues a[data-vue="carte"]');
  await page.waitForSelector('.tn-svg', { timeout: 8000 });
  await attendre(page, () => document.querySelector('#f-nature')?.value === 'repetitions');
  ok('4 · la carte aussi : les répétitions, d’ordinaire hors carte, y sont quand on les demande', (await etapesCarte(page)).join(',') === '106' && /^1 date · 1 lieu$/.test(await texte(page, '#f-compte')), `${(await etapesCarte(page)).join(',')} ${await texte(page, '#f-compte')}`);
  await page.selectOption('#f-nature', '');
  await page.selectOption('#f-dep', '76');
  await attendre(page, () => /dep=76/.test(location.search));
  ok('4 · le département 76 sur la carte : le Havre seul (102)', (await etapesCarte(page)).join(',') === '102' && /dep=76/.test(await adresse(page)), `${(await etapesCarte(page)).join(',')} ${await adresse(page)}`);
  await page.selectOption('#f-dep', '');
  await page.selectOption('#f-contrat', 'signé');
  await attendre(page, () => /contrat=/.test(location.search));
  ok('4 · le contrat signé : la date de Caen (101) seule', (await etapesCarte(page)).join(',') === '101', (await etapesCarte(page)).join(','));
  await page.selectOption('#f-contrat', '');
  await page.fill('#f-du', plus(20));
  await page.fill('#f-au', plus(40));
  await attendre(page, () => /du=/.test(location.search) && /au=/.test(location.search));
  await vue(page, 'liste');
  await page.waitForSelector('#l-dates a.ligne', { timeout: 8000 });
  await attendre(page, () => document.querySelector('#f-du')?.value);
  ok('4 · du … au (dans trente jours environ) : la liste garde 103 et 105, les champs et l’adresse les portent', (await lignesListe(page)).join(',') === '103,105' && /du=/.test(await adresse(page)) && /au=/.test(await adresse(page)), `${(await lignesListe(page)).join(',')} ${await adresse(page)}`);
  ok('4 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 5 · la période de la liste ; les annulées et les reportées sur la carte
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '?periode=passees#/representations' });
  await page.waitForSelector('#l-dates a.ligne', { timeout: 15000 });
  ok('5 · « Passées » : la liste ne montre que les saisons passées (la date d’il y a quarante jours, 104), plus de bloc « À venir »', (await lignesListe(page)).join(',') === '104' && !/À venir/.test(await texte(page, '#l-dates h2')) && await page.$eval('[data-f-periode="passees"]', b => b.getAttribute('aria-pressed') === 'true'), `${(await lignesListe(page)).join(',')} ${await texte(page, '#l-dates')}`.slice(0, 200));
  await page.click('[data-f-periode="toutes"]');
  await attendre(page, () => document.querySelectorAll('#l-dates a.ligne').length >= 7);
  ok('5 · « Toutes » : les sept dates, les saisons passées ouvertes', (await lignesListe(page)).length === 7 && await page.$$eval('#l-dates details.saison-ad', xs => xs.every(d => d.open)), (await lignesListe(page)).join(','));
  await page.click('[data-f-periode="avenir"]');
  await attendre(page, () => /^\d+ à venir/.test(document.querySelector('#f-compte')?.textContent || ''));
  ok('5 · « À venir » (d’office) : le bloc des dates à venir, l’adresse n’en dit rien', !/periode=/.test(await adresse(page)) && (await lignesListe(page)).includes(101));
  await ctx.close();
}
{
  DB.crescite_dates.push(date(108, 1, 6, plus(15), { statut: 'annulee' }), date(109, 2, 8, plus(16), { statut: 'reportee' }));
  try {
    const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/carte' });
    await page.waitForSelector('.tn-svg .tn-pin', { timeout: 15000 });
    ok('5 · d’office, la carte ne montre ni l’annulée (108) ni la reportée (109)', !(await etapesCarte(page)).some(i => i > 107) && (await compte(page, '.tn-svg .tn-pin')) >= 3, (await etapesCarte(page)).join(','));
    await ctx.close();
    const b = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '?periode=toutes&statut=annulee#/representations/carte' });
    await b.page.waitForSelector('.tn-svg .tn-pin', { timeout: 15000 });
    ok('5 · l’adresse ?periode=toutes&statut=annulee rouvre la carte avec l’annulée : une pastille (Le Havre), une étape (108)', (await etapesCarte(b.page)).join(',') === '108' && (await compte(b.page, '.tn-svg .tn-pin')) === 1 && await b.page.$eval('.tn-svg .tn-pin', g => g.dataset.tnLieu === '6'), (await etapesCarte(b.page)).join(','));
    ok('5 · … le choix « Annulées » est dans la barre, l’étape porte son badge « Annulée »', await b.page.$eval('#f-statut', e => e.value === 'annulee') && /Annulée/.test(await texte(b.page, '#tn-etapes')));
    await calme(b.page);
    await b.page.screenshot({ path: `${CAPT}/carte-annulees.png`, fullPage: false });
    await b.page.selectOption('#f-statut', 'reportee');
    await attendre(b.page, () => /statut=reportee/.test(location.search));
    ok('5 · « Reportées » : la reportée (109) paraît sur la carte, la carte n’est pas vide', (await etapesCarte(b.page)).join(',') === '109' && /Reportée/.test(await texte(b.page, '#tn-etapes')), (await etapesCarte(b.page)).join(','));
    await b.page.click('nav.vues a[data-vue="tableur"]');
    await b.page.waitForSelector('#tab-corps tr[data-l]', { timeout: 8000 });
    ok('5 · le tableur garde le statut « Reportées » : une ligne, la 109', (await lignesTableur(b.page)) === 1 && await b.page.$eval('#f-statut', e => e.value === 'reportee'));
    ok('5 · aucune erreur de script', b.erreurs.length === 0, b.erreurs.join(' / '));
    await b.ctx.close();
  } finally {
    DB.crescite_dates = DB.crescite_dates.filter(d => d.id < 108);
  }
}
{
  // une carte vide : à venir (d'office), aucune date ne tombe sur la carte
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '?spectacle=3&statut=annulee#/representations/carte' });
  await page.waitForSelector('.tn-svg', { timeout: 15000 });
  await attendre(page, () => document.querySelector('#tn-etapes .liste-vide'));
  ok('5 · une carte sans date le dit et propose d’effacer les filtres', /ne correspond/.test(await texte(page, '#tn-etapes')) && (await compte(page, '#tn-etapes [data-effacer-filtres]')) === 1 && /^0 date · 0 lieu$/.test(await texte(page, '#f-compte')), await texte(page, '#tn-etapes'));
  await ctx.close();
}

// ================================================================================ 6 · « Effacer les filtres » remet l'état commun, le focus à la recherche
for (const v of ['tableur', 'carte']) {
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: `?q=zzz&statut=option&periode=toutes#/representations/${v}` });
  await page.waitForSelector(v === 'tableur' ? '#tab-corps' : '.tn-svg', { timeout: 15000 });
  await attendre(page, () => document.querySelector('[data-effacer-filtres]'));
  const adresse0 = await adresse(page);
  const pas = await page.evaluate(() => history.length);
  await page.click('#vue [data-effacer-filtres]');
  await attendre(page, () => document.activeElement?.id === 'f-q' && !document.querySelector('#vue [data-effacer-filtres]'));
  const etat = await page.evaluate(() => ({ q: document.querySelector('#f-q').value, statut: document.querySelector('#f-statut').value, periode: document.querySelector('[data-f-periode][aria-pressed="true"]').dataset.fPeriode, focus: document.activeElement.id, session: JSON.stringify(Object.fromEntries(Object.entries(session.dates).filter(([k, x]) => x !== '' && k !== 'periode'))), pas: history.length }));
  ok(`6 · « Effacer les filtres » (${v}) : la recherche, le statut et la période reprennent leur valeur d’office dans la barre et dans l’état commun`, etat.q === '' && etat.statut === '' && etat.periode === 'avenir' && etat.session === '{}', JSON.stringify(etat));
  ok(`6 · … l’adresse les quitte (${adresse0} devient ${await adresse(page)}), sans pas de plus dans l’historique, le focus est à la recherche`, !/q=|statut=|periode=/.test(await adresse(page)) && (await adresse(page)).endsWith(`#/representations/${v}`) && etat.pas === pas && etat.focus === 'f-q', await adresse(page));
  ok(`6 · … sans routage : la vue reste là, ${v === 'tableur' ? 'la grille a ses lignes' : 'la carte a ses pastilles'}`, v === 'tableur' ? (await lignesTableur(page)) > 0 : (await compte(page, '.tn-svg .tn-pin')) > 0);
  ok(`6 · aucune erreur de script (${v})`, erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 7 · les vieux liens et les vieux états
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '?tri=desc#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  ok('7 · un ancien lien ?tri=desc est encore lu (le tableur trie du plus récent au plus ancien) et sort de l’adresse', await page.$eval('#tab-tete th.c-jour', th => th.getAttribute('aria-sort') === 'descending') && !/tri=/.test(await adresse(page)), await adresse(page));
  await page.click('nav.vues a[data-vue="carte"]');
  await page.waitForSelector('.tn-svg', { timeout: 8000 });
  ok('7 · … et ne revient pas dans l’adresse des autres vues', !/tri=/.test(await adresse(page)), await adresse(page));
  await ctx.close();
}
{
  // ce que le tableur et la carte gardaient chacun dans la session de l'onglet, d'avant les filtres communs
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  await page.evaluate(() => sessionStorage.setItem('crescite-admin-filtres', JSON.stringify({ tableur: { q: '', saison: '', spectacle: '', periode: 'toutes', tri: 'desc', vides: true }, tournee: { saison: 'toutes', spectacle: '', avenir: true, serre: true }, dates: { spectacle: '', public: '', statut: '', q: '', ouvertes: ['2024-2025'] } })));
  await page.goto(`${URL0}#/representations/tableur`);
  await page.reload();
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  const t = await page.evaluate(() => ({ periode: document.querySelector('[data-f-periode][aria-pressed="true"]').dataset.fPeriode, tri: document.querySelector('#tab-tete th.c-jour').getAttribute('aria-sort'), vides: document.querySelector('#tab-vides').checked, anciens: ['tableur', 'tournee'].filter(k => k in session), ouvertes: 'ouvertes' in session.dates, vues: JSON.stringify(session.vues) }));
  ok('7 · l’ancien état du tableur passe dans l’état commun (période) et dans sa vue (tri, colonnes vides), puis s’efface', t.periode === 'toutes' && t.tri === 'descending' && t.vides && !t.anciens.length, JSON.stringify(t));
  ok('7 · les saisons ouvertes de la liste quittent l’état commun pour session.vues.liste', !t.ouvertes && /"ouvertes":\["2024-2025"\]/.test(t.vues), t.vues);
  await page.click('nav.vues a[data-vue="carte"]');
  await page.waitForSelector('.tn-svg', { timeout: 8000 });
  ok('7 · l’ancien état de la carte : « Autour des dates » reste coché', await page.$eval('#tn-serre', e => e.checked));
  ok('7 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 8 · le fondu d'une vue à l'autre ; le focus et l'annonce après un changement de vue
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations' });
  await page.waitForSelector('#l-dates a.ligne', { timeout: 15000 });
  const sens = await page.evaluate(() => { const h0 = E.hashVue; const r = []; for (const [a, b] of [['#/representations', '#/representations/tableur'], ['#/representations/tableur', '#/representations/carte'], ['#/representations/carte', '#/representations'], ['#/representations', '#/representations/101'], ['#/representations/101', '#/representations'], ['#/representations', '#/lieux']]) { E.hashVue = a; r.push(sensVue(b)); } E.hashVue = h0; return r.join(','); });
  ok('8 · entre la liste, le tableur et la carte, la transition est un fondu (même rubrique, même profondeur) ; vers une fiche elle glisse encore', sens === 'fondu,fondu,fondu,avant,arriere,fondu', sens);
  await page.click('nav.vues a[data-vue="tableur"]');
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 8000 });
  await attendre(page, () => document.activeElement?.matches?.('nav.vues a[aria-current="page"]'));
  ok('8 · après le clic sur Tableur, le focus est sur le lien actif de la nouvelle vue (la pilule a été redessinée)', await page.evaluate(() => document.activeElement.matches('nav.vues a[aria-current="page"]') && document.activeElement.dataset.vue === 'tableur'));
  await attendre(page, () => document.querySelector('#vues-annonce')?.textContent);
  ok('8 · #vues-annonce dit « Vue tableur » aux lecteurs d’écran, sans toast', await texte(page, '#vues-annonce') === 'Vue tableur' && (await compte(page, '.annonce')) === 0, await texte(page, '#vues-annonce'));
  await page.focus('nav.vues a[data-vue="carte"]');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.tn-svg', { timeout: 8000 });
  await attendre(page, () => document.activeElement?.dataset?.vue === 'carte');
  ok('8 · au clavier (Entrée sur Carte) : le focus reste sur le lien actif', await page.evaluate(() => document.activeElement.dataset.vue === 'carte' && document.activeElement.getAttribute('aria-current') === 'page'));
  // le précédent du navigateur ne ravit pas le focus au hasard : il ne va au lien que si c'est la pilule qui a changé la vue
  await page.goBack();
  await attendre(page, () => location.hash === '#/representations/tableur');
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 8000 });
  await page.waitForTimeout(150);
  ok('8 · le précédent du navigateur change de vue sans prendre le focus à la page (il n’est pas sur le lien)', await page.evaluate(() => !document.activeElement?.matches?.('nav.vues a')), await page.evaluate(() => document.activeElement?.outerHTML?.slice(0, 80)));
  ok('8 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 9 · « Voir dans le tableur » arrive sur la ligne
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations' });
  await page.waitForSelector('#l-dates a.ligne', { timeout: 15000 });
  await page.click('#l-dates a.ligne[href="#/representations/101"]', { button: 'right' });
  await page.waitForSelector('.gm-boite [data-gm]:has-text("Voir dans le tableur")', { timeout: 4000 });
  await page.click('.gm-boite [data-gm]:has-text("Voir dans le tableur")');
  await page.waitForSelector('#tab-corps td.actif', { timeout: 8000 });
  const ligne = await page.evaluate(() => { const td = document.querySelector('#tab-corps td.actif'), tr = td.parentNode; return { spectacle: tr.querySelector('td.c-spectacle').textContent.trim(), lieu: tr.querySelector('td.c-lieu').textContent.trim(), cases: tr.querySelectorAll('td').length, visees: tr.querySelectorAll('td.visee').length, ailleurs: document.querySelectorAll('#tab-corps td.visee').length, focus: document.activeElement === td, adresse: location.hash, cible: 'cible' in session.dates, enVue: (r => r.top >= 0 && r.bottom <= innerHeight)(tr.getBoundingClientRect()) }; });
  ok('9 · « Voir dans le tableur » depuis le menu d’une date : le tableur s’ouvre, la case active est sur la ligne de la 101 (Bérénice, Théâtre de Caen)', ligne.adresse === '#/representations/tableur' && ligne.spectacle === 'Bérénice' && /Caen/.test(ligne.lieu), JSON.stringify(ligne));
  ok('9 · … chaque case de la ligne porte « visee » (cerclée un instant), et elle seule ; la ligne est en vue, la case a le focus', ligne.visees === ligne.cases && ligne.ailleurs === ligne.cases && ligne.focus && ligne.enVue, JSON.stringify(ligne));
  ok('9 · … la cible est oubliée aussitôt (elle ne reste ni dans l’état ni dans l’adresse)', !ligne.cible && !/cible/.test(await adresse(page)));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/voir-dans-le-tableur.png`, fullPage: false });
  await attendre(page, () => !document.querySelector('#tab-corps td.visee'), null, 4000);
  ok('9 · le cercle s’éteint seul (le temps de l’animation)', (await compte(page, '#tab-corps td.visee')) === 0);
  await page.reload();
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  ok('9 · un rechargement ne ressuscite pas la cible', (await compte(page, '#tab-corps td.visee')) === 0);
  // une date qui n'est pas la première, et qui a deux séances : la case active est sur la première de ses lignes, une seule ligne est cerclée
  await page.evaluate(() => { location.hash = '#/representations'; });
  await page.waitForSelector('#l-dates a.ligne', { timeout: 8000 });
  await page.click('#l-dates a.ligne[href="#/representations/103"]', { button: 'right' });
  await page.waitForSelector('.gm-boite [data-gm]:has-text("Voir dans le tableur")', { timeout: 4000 });
  await page.click('.gm-boite [data-gm]:has-text("Voir dans le tableur")');
  await page.waitForSelector('#tab-corps td.actif', { timeout: 8000 });
  const l103 = await page.evaluate(() => { const td = document.querySelector('#tab-corps td.actif'), tr = td.parentNode; return { lieu: tr.querySelector('td.c-lieu').textContent.trim(), heure: tr.querySelector('td.c-heure').textContent.trim(), ligne: +tr.dataset.l, lignes: document.querySelectorAll('#tab-corps tr[data-l]').length, cases: tr.querySelectorAll('td').length, visees: document.querySelectorAll('#tab-corps td.visee').length }; });
  ok('9 · la 103 (Lycée Voltaire, deux séances, pas la première ligne) : la case active est sur sa première séance (10h), une seule ligne est cerclée', /Voltaire/.test(l103.lieu) && l103.heure === '10h' && l103.ligne > 0 && l103.visees === l103.cases, JSON.stringify(l103));
  // la date que le filtre cache : « Passées » ne la montre pas, le tableur relâche ce filtre pour l'atteindre
  await page.evaluate(() => { location.hash = '#/representations'; });
  await page.waitForSelector('#l-dates a.ligne', { timeout: 8000 });
  await page.click('[data-f-periode="passees"]');
  await attendre(page, () => document.querySelectorAll('#l-dates a.ligne').length === 1);
  await page.evaluate(() => { session.dates.cible = 101; location.hash = '#/representations/tableur'; });
  await page.waitForSelector('#tab-corps td.actif', { timeout: 8000 });
  ok('9 · si un filtre cache la date (« Passées »), le tableur le relâche : la ligne de la 101 est là, active, et la barre le montre', await page.evaluate(() => document.querySelector('#tab-corps td.actif').parentNode.querySelector('td.c-lieu').textContent.includes('Caen') && document.querySelector('[data-f-periode="toutes"]').getAttribute('aria-pressed') === 'true'));
  ok('9 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  // l'action rapide « Tableur des séances » du tableau de bord n'a pas de date : elle ne pose aucune cible
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations/tableur' });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 15000 });
  ok('9 · le tableur ouvert tout droit n’active aucune ligne en particulier (la première case est active, rien de cerclé)', (await compte(page, '#tab-corps tr[data-l="0"] td.actif[data-c="0"]')) === 1 && (await compte(page, '#tab-corps td.actif')) === 1 && (await compte(page, '#tab-corps td.visee')) === 0);
  await ctx.close();
}
{
  // sans mouvement (prefers-reduced-motion), la ligne visée est tout de même marquée : un cadre fixe, pas une animation
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations', reduit: true });
  await page.waitForSelector('#l-dates a.ligne', { timeout: 15000 });
  await page.click('#l-dates a.ligne[href="#/representations/101"]', { button: 'right' });
  await page.waitForSelector('.gm-boite [data-gm]:has-text("Voir dans le tableur")', { timeout: 4000 });
  await page.click('.gm-boite [data-gm]:has-text("Voir dans le tableur")');
  await page.waitForSelector('#tab-corps td.visee', { timeout: 8000 });
  const marque = await page.evaluate(() => { const st = getComputedStyle(document.querySelector('#tab-corps td.visee')); return { animation: st.animationName, ombre: st.boxShadow, fond: st.backgroundColor }; });
  ok('9 · sous « moins d’animations », la ligne visée est marquée sans mouvement : un cadre et un fond fixes, aucune animation', marque.animation === 'none' && marque.ombre !== 'none' && marque.fond !== 'rgba(0, 0, 0, 0)', JSON.stringify(marque));
  await attendre(page, () => !document.querySelector('#tab-corps td.visee'), null, 4000);
  ok('9 · … et la marque part seule (un instant)', (await compte(page, '#tab-corps td.visee')) === 0);
  ok('9 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 10 · la vue retenue ; les touches V puis L / T / C
const ecritesVue = () => ECRITURES.filter(e => e.cle === 'representations.vue').map(e => e.valeur);
const lienMenu = page => page.getAttribute('.nav a[title^="Représentations"]', 'href');
const repartir = () => { DB.crescite_preferences = []; ECRITURES.length = 0; };
const attendreEcriture = async (n, ms = 4000) => { const t0 = Date.now(); while (ecritesVue().length < n && Date.now() - t0 < ms) await new Promise(r => setTimeout(r, 50)); };
const hashEst = (page, h) => attendre(page, x => location.hash === x, h);
// (les touches partent du focus où l'on est : un champ ou la grille du tableur les garde, c'est ce qu'on vérifie ; hors(page) retire le focus
// quand une vérification veut partir « hors d'un champ »)
const touches = async (page, ...ts) => { for (const t of ts) await page.keyboard.press(t); };
const hors = page => page.evaluate(() => document.activeElement?.blur?.());
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/representations' });
  await page.waitForSelector('#l-dates a.ligne', { timeout: 15000 });
  ok('10 · ouvrir la liste n’écrit rien (c’est la vue d’office) et le lien « Représentations » du menu va à #/representations', ecritesVue().length === 0 && await lienMenu(page) === '#/representations', JSON.stringify({ ecrites: ecritesVue(), lien: await lienMenu(page) }));
  await page.click('nav.vues a[data-vue="tableur"]');
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 8000 });
  await attendreEcriture(1);
  ok('10 · le tableur ouvert, la vue est écrite aussitôt dans le compte (representations.vue = tableur) et le lien du menu la suit', ecritesVue().join(',') === 'tableur' && await lienMenu(page) === '#/representations/tableur' && ECRITURES.at(-1).user_id === UID, JSON.stringify({ ecrites: ecritesVue(), lien: await lienMenu(page) }));
  ok('10 · le lien du menu garde aria-current sur la rubrique ouverte', await page.$eval('.nav a[title^="Représentations"]', a => a.getAttribute('aria-current') === 'page'));
  // V puis C, V puis L, V puis T
  await touches(page, 'v', 'c');
  await hashEst(page, '#/representations/carte');
  await page.waitForSelector('.tn-svg', { timeout: 8000 });
  await attendreEcriture(2);
  ok('10 · « V » puis « C » ouvre la carte (la vue retenue devient la carte, le menu la suit)', await adresse(page) === '#/representations/carte' && ecritesVue().join(',') === 'tableur,carte' && await lienMenu(page) === '#/representations/carte', JSON.stringify({ adresse: await adresse(page), ecrites: ecritesVue(), lien: await lienMenu(page) }));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/vue-carte.png`, fullPage: false });
  // une fiche ou « Nouvelle date » ouverte depuis la carte ne change pas la vue retenue : le lien du menu rouvre la carte
  await page.click('.tete a.btn.principal[href="#/representations/nouvelle"]');
  await page.waitForSelector('#ed-date input', { timeout: 8000 });
  await page.waitForTimeout(300);
  ok('10 · « ＋ Nouvelle date » depuis la carte ouvre la fiche sans changer la vue retenue (toujours la carte : la clé, et le lien du menu)', await adresse(page) === '#/representations/nouvelle' && ecritesVue().join(',') === 'tableur,carte' && DB.crescite_preferences.find(r => r.cle === 'representations.vue')?.valeur === 'carte' && await lienMenu(page) === '#/representations/carte', JSON.stringify({ adresse: await adresse(page), ecrites: ecritesVue(), lien: await lienMenu(page) }));
  await page.evaluate(() => { location.hash = '#/representations/101'; });
  await page.waitForSelector('#ed-date input', { timeout: 8000 });
  await page.waitForTimeout(300);
  ok('10 · … et une fiche (#/representations/101) de même : le lien du menu garde la carte', ecritesVue().join(',') === 'tableur,carte' && await lienMenu(page) === '#/representations/carte', JSON.stringify({ ecrites: ecritesVue(), lien: await lienMenu(page) }));
  await page.evaluate(() => { location.hash = '#/representations/carte'; });
  await page.waitForSelector('.tn-svg', { timeout: 8000 });
  await hors(page);
  await touches(page, 'v', 'l');
  await hashEst(page, '#/representations');
  await page.waitForSelector('#l-dates a.ligne', { timeout: 8000 });
  await attendreEcriture(3);
  ok('10 · « V » puis « L » rouvre la liste', await adresse(page) === '#/representations' && ecritesVue().join(',') === 'tableur,carte,liste' && await lienMenu(page) === '#/representations', JSON.stringify({ adresse: await adresse(page), ecrites: ecritesVue() }));
  await touches(page, 'v', 't');
  await hashEst(page, '#/representations/tableur');
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 8000 });
  ok('10 · « V » puis « T » ouvre le tableur', await adresse(page) === '#/representations/tableur', await adresse(page));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/vue-tableur.png`, fullPage: false });
  // dans la grille du tableur, une lettre ouvre la case : « V » n'y est pas une touche de vue (on en sort en cliquant hors de la grille)
  await page.click('#tab-corps td.c-spectacle');
  const avant = await page.$eval('#tab-corps td.c-spectacle', td => td.textContent);
  await touches(page, 'v', 'l');
  await page.waitForTimeout(250);
  const grille = await page.evaluate(() => ({ hash: location.hash, temoin: document.getElementById('rac-temoin')?.textContent || '', edition: !!document.querySelector('#tab-corps .tab-ed') }));
  await touches(page, 'Escape');
  await page.waitForTimeout(150);
  ok('10 · depuis une case du tableur, « V » puis « L » ne change pas de vue : la lettre ouvre la case (l’adresse reste le tableur, le témoin « V… » ne paraît pas, Échap rend la case intacte)', grille.hash === '#/representations/tableur' && grille.temoin === '' && grille.edition && await page.$eval('#tab-corps td.c-spectacle', td => td.textContent) === avant, JSON.stringify({ ...grille, avant }));
  await page.click('.tete h1');
  await touches(page, 'v', 'l');
  await hashEst(page, '#/representations');
  await page.waitForSelector('#l-dates a.ligne', { timeout: 8000 });
  ok('10 · … et en cliquant hors de la grille (le titre), « V » puis « L » rouvre la liste', await adresse(page) === '#/representations', await adresse(page));
  await touches(page, 'v', 't');
  await hashEst(page, '#/representations/tableur');
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 8000 });
  // les filtres restent : V puis C depuis la liste filtrée
  await page.evaluate(() => { location.hash = '#/representations'; });
  await page.waitForSelector('#l-dates a.ligne', { timeout: 8000 });
  await page.fill('#f-q', 'caen');
  await attendre(page, () => /q=caen/.test(location.search));
  await hors(page);
  await touches(page, 'v', 'c');
  await page.waitForSelector('.tn-svg', { timeout: 8000 });
  ok('10 · … et change de vue en gardant les filtres (la recherche « caen » suit dans l’adresse)', /q=caen/.test(await adresse(page)) && /#\/representations\/carte$/.test(await adresse(page)), await adresse(page));
  // dans un champ, les lettres sont des lettres
  await page.evaluate(() => { location.hash = '#/representations'; });
  // (le passage d'une vue à l'autre est un fondu : tant qu'il dure, la page montre encore la carte, avec son propre #f-q ; on attend
  // la liste elle-même, puis le champ qu'elle a dessiné)
  await page.waitForSelector('#l-dates', { timeout: 8000 });
  await page.waitForSelector('#f-q', { timeout: 8000 });
  await page.fill('#f-q', '');
  await page.focus('#f-q');
  await page.keyboard.press('v'); await page.keyboard.press('t');
  await page.waitForTimeout(150);
  const champ = await page.evaluate(() => ({ valeur: document.querySelector('#f-q').value, hash: location.hash, temoin: document.getElementById('rac-temoin')?.textContent || '' }));
  ok('10 · « V » tapé dans un champ ne fait rien : le champ reçoit « vt », l’adresse ne bouge pas, le témoin reste vide', champ.valeur === 'vt' && champ.hash === '#/representations' && champ.temoin === '', JSON.stringify(champ));
  await page.fill('#f-q', '');
  // hors de la rubrique, V ne fait rien
  await page.evaluate(() => { location.hash = '#/lieux'; });
  await page.waitForSelector('#vue h1', { timeout: 8000 });
  await page.waitForTimeout(300);
  await hors(page);
  await touches(page, 'v', 't');
  await page.waitForTimeout(250);
  ok('10 · hors de Représentations, « V » puis « T » ne fait rien (les Lieux restent ouverts)', await page.evaluate(() => location.hash) === '#/lieux');
  // le lien du menu, depuis une autre rubrique, rouvre la vue retenue : la carte (la dernière vue vue)
  await page.evaluate(() => { location.hash = '#/representations/carte'; });
  await page.waitForSelector('.tn-svg', { timeout: 8000 });
  await page.evaluate(() => { location.hash = '#/lieux'; });
  await page.waitForSelector('#vue h1', { timeout: 8000 });
  ok('10 · depuis une autre rubrique, le lien « Représentations » du menu a l’adresse de la carte', await lienMenu(page) === '#/representations/carte', await lienMenu(page));
  await page.click('.nav a[title^="Représentations"]');
  await page.waitForSelector('.tn-svg', { timeout: 8000 });
  ok('10 · … et rouvre la carte', await adresse(page) === '#/representations/carte', await adresse(page));
  // l'adresse nue reste la liste, quelle que soit la vue retenue
  await page.evaluate(() => { location.hash = '#/lieux'; });
  await page.waitForSelector('#vue h1', { timeout: 8000 });
  await page.evaluate(() => { location.hash = '#/representations'; });
  await page.waitForSelector('#l-dates a.ligne', { timeout: 8000 });
  ok('10 · #/representations nu ouvre toujours la liste (#f-statut, les dates), même quand la carte était la vue retenue', await page.evaluate(() => !!document.querySelector('#f-statut') && !!document.querySelector('nav.vues a[data-vue="liste"][aria-current="page"]') && !document.querySelector('.tn-svg')) && await adresse(page) === '#/representations');
  // l'aide « ? » les montre
  await page.focus('#b-aide');
  await page.keyboard.press('?');
  await attendre(page, () => !!document.querySelector('dialog.gq-aide[open]'), null, 3000);
  const aide = await page.evaluate(() => { const g = [...document.querySelectorAll('dialog.gq-aide[open] section')].find(x => /Les représentations/.test(x.querySelector('h3')?.textContent || '')); return g && { titre: g.querySelector('h3').textContent, texte: g.textContent.replace(/\s+/g, ' ') }; });
  ok('10 · l’aide « ? » montre un groupe « Les représentations » : V puis L, V puis T, V puis C', aide && ['V puis L', 'V puis T', 'V puis C'].every(k => aide.texte.includes(k)), JSON.stringify(aide));
  await page.keyboard.press('Escape');
  ok('10 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  // la page d'ouverture « Représentations » ouvre la vue retenue ; au téléphone, toujours la liste
  repartir();
  DB.crescite_preferences.push({ user_id: UID, cle: 'accueil.tableau', valeur: { depart: 'representations' } }, { user_id: UID, cle: 'representations.vue', valeur: 'carte' });
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900 });
  await page.waitForSelector('.tn-svg', { timeout: 15000 });
  ok('10 · la page d’ouverture choisie est Représentations : elle ouvre la vue retenue (la carte), TABLEAU.depart() la rend', await adresse(page) === '#/representations/carte' && await page.evaluate(() => TABLEAU.depart()) === '#/representations/carte', await adresse(page));
  ok('10 · aucune erreur de script (ouverture)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
  const tel = await ouvrir(navigateur, { largeur: 390, hauteur: 800 });
  await attendre(tel.page, () => location.hash.startsWith('#/representations'), null, 15000);
  await tel.page.waitForSelector('#l-dates', { timeout: 15000 });
  ok('10 · au téléphone la vue retenue n’est pas appliquée : l’ouverture est la liste, TABLEAU.depart() aussi', await adresse(tel.page) === '#/representations' && await tel.page.evaluate(() => TABLEAU.depart()) === '#/representations', await adresse(tel.page));
  ECRITURES.length = 0;
  await tel.page.evaluate(() => { location.hash = '#/representations/tableur'; });
  await tel.page.waitForSelector('#tab-corps tr[data-l]', { timeout: 8000 });
  await tel.page.waitForTimeout(300);
  ok('10 · … et ouvrir le tableur au téléphone n’écrit rien (la vue retenue du compte est celle de l’ordinateur)', ecritesVue().length === 0 && DB.crescite_preferences.find(r => r.cle === 'representations.vue')?.valeur === 'carte', JSON.stringify(ecritesVue()));
  ok('10 · aucune erreur de script (téléphone)', tel.erreurs.length === 0, tel.erreurs.join(' / '));
  await tel.ctx.close();
}
{
  // une base sans la table des préférences : rien n'est hérité d'un autre contexte, rien n'est envoyé à la base
  repartir();
  DB.crescite_preferences.push({ user_id: 'autre-compte', cle: 'representations.vue', valeur: 'carte' });
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil', prefsAbsentes: true });
  await page.waitForSelector('.nav a[title^="Représentations"]', { timeout: 15000 });
  ok('10 · sans la table des préférences, le lien « Représentations » va à la liste (la vue d’un autre contexte n’est pas prise)', await lienMenu(page) === '#/representations', await lienMenu(page));
  await page.evaluate(() => { location.hash = '#/representations/tableur'; });
  await page.waitForSelector('#tab-corps tr[data-l]', { timeout: 8000 });
  await page.waitForTimeout(300);
  ok('10 · … et ouvrir le tableur n’envoie rien à la base (ECRITURES reste vide) ; le menu suit sur cet appareil', ecritesVue().length === 0 && await lienMenu(page) === '#/representations/tableur', JSON.stringify({ ecrites: ecritesVue(), lien: await lienMenu(page) }));
  ok('10 · aucune erreur de script (sans préférences)', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
  repartir();
}

bilan(CAPT);
