// Les préférences de l'administration (admin/prefs.js : PREFS, et ses trois clients : tableau.js, disponibilites.js, la
// rubrique Représentations d'index.html), vérifiées dans Chromium, hors ligne, sur la base fictive commune (admin-fictif.mjs).
//   node site/prefs.mjs
// Ce que le banc regarde : une seule lecture de crescite_preferences au démarrage ; trois gestes rapides, une écriture ; les
// anciennes clés de l'appareil qui passent dans la base puis s'effacent ; le miroir de l'appareil par compte ; sans le
// script SQL 6, « gardée sur cet appareil » et planning.masques dans son ancienne clé ; une valeur mal formée remise
// d'équerre ; ce qui attend d'être envoyé l'emporte sur la base (et la base sur un miroir sans attente) ; la relecture qui
// ne l'écrase pas ; la fermeture de la page qui envoie ce qui reste ; un refus (403) qui ne fait qu'une annonce ; l'annonce
// « Gardé avec votre compte » ou « Gardé sur cet appareil » une seule fois ; deux onglets du même navigateur qui se
// préviennent ; deux comptes, deux miroirs. Les captures vont dans site/dist/shots-prefs/. Sort en erreur si une
// vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, URL0, UID, DB, ECRITURES, MODIFS, LECTURES, ok, ouvrir, texte, compte, tuile, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-prefs');
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
const attendre = (page, fn, arg = null, ms = 6000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
const lectures = () => LECTURES.filter(l => l.table === 'crescite_preferences').length;
const ecritesDe = cle => ECRITURES.filter(e => e.cle === cle);
const miroir = (page, u = UID) => page.evaluate(id => JSON.parse(localStorage.getItem(`crescite-prefs:${id}`) || 'null'), u);
const repartir = () => { DB.crescite_preferences = []; ECRITURES.length = 0; LECTURES.length = 0; MODIFS.length = 0; };

// ================================================================================ une seule lecture, trois gestes une écriture
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur);
  await page.waitForSelector('.tb-tuile', { timeout: 15000 });
  ok('au démarrage, une seule requête de lecture de crescite_preferences (le tableau de bord, le planning et le panneau la partagent)', lectures() === 1, String(lectures()));
  ok('la lecture porte les trois colonnes et le compte', LECTURES.filter(l => l.table === 'crescite_preferences').every(l => /cle/.test(l.searchParams.get('select') || '') && l.searchParams.get('user_id') === `eq.${UID}`), JSON.stringify([...LECTURES[0]?.searchParams || []]));
  ok('PREFS est chargé et sait où il en est : l’état « ok »', await page.evaluate(() => PREFS.etat()) === 'ok');
  await page.evaluate(() => PREFS.charger());
  ok('charger() rejoué sans relire ne refait aucune requête', lectures() === 1, String(lectures()));
  // trois gestes rapides sur une même clé : une seule écriture, la dernière valeur
  await page.click('#tb-personnaliser');
  for (const k of ['2', '3', '4']) await page.click(`[data-tb-colonnes="${k}"]`);
  const avant = ecritesDe('accueil.tableau').length;
  ok('trois gestes rapides : rien n’est encore parti avant les 700 ms (l’appareil, lui, a tout)', avant === 0 && (await miroir(page))?.valeurs?.['accueil.tableau']?.colonnes === '4' && (await miroir(page)).attente.includes('accueil.tableau'));
  await page.waitForTimeout(1200);
  const apres = ecritesDe('accueil.tableau');
  ok('… puis une seule écriture, avec la dernière valeur', apres.length === 1 && apres[0].user_id === UID && apres[0].valeur.colonnes === '4', JSON.stringify(apres.map(e => e.valeur.colonnes)));
  ok('une fois écrite, la clé n’est plus en attente dans le miroir', !(await miroir(page)).attente.includes('accueil.tableau'));
  ok('l’écriture est un upsert d’une ligne par clé (on_conflict user_id,cle)', MODIFS.length === 0 && DB.crescite_preferences.filter(r => r.cle === 'accueil.tableau').length === 1);
  // le même geste par l'outil : la file garde l'ordre des clés et ne mélange pas
  await page.evaluate(() => { PREFS.ecrire('essai.a', 1, { muet: true }); PREFS.ecrire('essai.b', 2, { muet: true }); PREFS.ecrire('essai.a', 3, { muet: true }); });
  await page.waitForTimeout(1200);
  ok('deux clés, trois gestes : deux écritures, chacune avec sa dernière valeur', ecritesDe('essai.a').length === 1 && ecritesDe('essai.a')[0].valeur === 3 && ecritesDe('essai.b').length === 1 && ecritesDe('essai.b')[0].valeur === 2);
  await page.evaluate(() => PREFS.ecrire('essai.clic', 'oui', { aussitot: true, muet: true }));
  await page.evaluate(() => PREFS.attendre());
  ok('« aussitot » (un clic) n’attend pas les 700 ms', ecritesDe('essai.clic').length === 1);
  ok('aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ sans le script 6 : le repli
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { prefsAbsentes: true });
  await page.waitForSelector('.tb-tuile', { timeout: 15000 });
  ok('sans crescite_preferences, l’état est « absent » et rien n’est annoncé', await page.evaluate(() => PREFS.etat()) === 'absent' && (await compte(page, '.annonce.erreur')) === 0);
  await page.click('#tb-personnaliser');
  await page.click(`${tuile('equipe')} [data-tb-masquer]`);
  ok('le panneau du tableau de bord le dit : gardée sur cet appareil', /gardée sur cet appareil/.test(await texte(page, '#tb-panneau .aide')));
  await page.waitForTimeout(1000);
  const m = await miroir(page);
  ok('la disposition est dans le miroir de l’appareil', m?.valeurs?.['accueil.tableau']?.tuiles?.find(t => t.k === 'equipe')?.visible === false);
  ok('… et rien n’est parti vers la base (la clé reste en attente pour le jour où le script passe)', ECRITURES.length === 0 && m.attente.includes('accueil.tableau'));
  // les personnes masquées : l'ancienne clé, que partage l'espace de l'équipe
  await page.evaluate(() => PREFS.ecrire('planning.masques', [2, 3], { aussitot: true, muet: true }));
  ok('planning.masques est écrite dans crescite-planning-masques (le repli que partage l’espace de l’équipe), en tableau brut', await page.evaluate(() => localStorage.getItem('crescite-planning-masques')) === '[2,3]');
  ok('… et se relit de là', JSON.stringify(await page.evaluate(() => PREFS.lire('planning.masques', []))) === '[2,3]');
  await page.evaluate(() => localStorage.setItem('crescite-planning-masques', '[3]'));
  ok('l’espace de l’équipe y touche : PREFS relit l’ancienne clé, pas une copie', JSON.stringify(await page.evaluate(() => PREFS.lire('planning.masques', []))) === '[3]');
  await page.reload();
  await page.waitForSelector('.tb-tuile', { timeout: 15000 });
  ok('au rechargement, la disposition revient et la migration ne l’écrase pas', (await compte(page, tuile('equipe'))) === 0 && (await compte(page, '.tb-tuile')) === 9);
  // la rubrique Représentations
  await page.goto(`${URL0}#/representations`);
  await page.waitForSelector('details.avant', { timeout: 15000 });
  await page.click('details.avant > summary');
  await page.waitForSelector('.annonce', { timeout: 3000 }).catch(() => {});
  ok('un réglage hors tableau de bord est annoncé : « Gardé sur cet appareil »', /Gardé sur cet appareil/.test(await texte(page, '.annonce:last-of-type')), await texte(page, '.annonce:last-of-type'));
  ok('le panneau « à compléter » garde son choix dans le miroir', (await miroir(page))?.valeurs?.['representations.avant']?.ouvert === false);
  ok('aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ les anciennes clés passent dans la base, puis s'effacent
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/representations' });
  await page.evaluate(() => {
    localStorage.removeItem('crescite-prefs:u-essai');
    localStorage.setItem('crescite-admin-avant', JSON.stringify({ ouvert: false, jours: 30 }));
    localStorage.setItem('crescite-planning-masques', JSON.stringify([1]));
    const c = { v: 1, modifie: Date.now(), colonnes: '3', depart: 'accueil', tuiles: [], urgent: { epingles: [], reports: {} }, vues: [] };
    localStorage.setItem('crescite-admin-tableau', JSON.stringify(c));
  });
  repartir();
  await page.reload();
  await page.waitForSelector('details.avant', { timeout: 15000 });
  await page.waitForTimeout(500);
  ok('une valeur locale ancienne se lit aussitôt : le panneau « à compléter » est fermé, à 30 jours', await page.$eval('details.avant', e => !e.open) && (await page.$eval('#avant-jours', e => e.value)) === '30');
  await page.evaluate(() => PREFS.attendre());
  await page.waitForTimeout(500);
  ok('… elle passe dans la base, une ligne par clé : les trois', ['representations.avant', 'planning.masques', 'accueil.tableau'].every(c => DB.crescite_preferences.some(r => r.cle === c && r.user_id === UID)), JSON.stringify(DB.crescite_preferences.map(r => r.cle)));
  ok('… sans changer de forme (masques en tableau brut, avant en objet)', JSON.stringify(DB.crescite_preferences.find(r => r.cle === 'planning.masques')?.valeur) === '[1]' && DB.crescite_preferences.find(r => r.cle === 'representations.avant')?.valeur.jours === 30);
  const reste = await page.evaluate(() => ['crescite-admin-avant', 'crescite-planning-masques', 'crescite-admin-tableau'].map(k => localStorage.getItem(k)));
  ok('… puis les anciennes clés s’effacent (la valeur est dans la base)', reste.every(v => v === null), JSON.stringify(reste));
  ok('le miroir n’a plus rien en attente', (await miroir(page)).attente.length === 0, JSON.stringify(await miroir(page)));
  ok('aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ une valeur mal formée, la base qui gagne, ce qui attend qui l'emporte
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/representations' });
  await page.waitForSelector('details.avant', { timeout: 15000 });
  // la base : trois valeurs fausses, deux bonnes ; le miroir : une valeur en attente (elle l'emporte), une autre sans attente (la base l'emporte)
  DB.crescite_preferences.push(
    { user_id: UID, cle: 'accueil.tableau', valeur: { tuiles: 'pas une liste', colonnes: 9, depart: 42, vues: [1, null, { nom: 3 }] } },
    { user_id: UID, cle: 'planning.masques', valeur: { a: 1 } },
    { user_id: UID, cle: 'representations.avant', valeur: 'zzz' },
    { user_id: UID, cle: 'essai.base', valeur: 'de la base' },
    { user_id: UID, cle: 'essai.attente', valeur: 'ancienne de la base' });
  await page.evaluate(() => localStorage.setItem('crescite-prefs:u-essai', JSON.stringify({ valeurs: { 'essai.attente': 'écrite ici, pas partie', 'essai.base': 'vieux miroir' }, attente: ['essai.attente'] })));
  ECRITURES.length = 0;
  await page.reload();
  await page.waitForSelector('details.avant', { timeout: 15000 });
  const lu = await page.evaluate(() => ({ base: PREFS.lire('essai.base'), attente: PREFS.lire('essai.attente'), absente: PREFS.lire('essai.absente', 'défaut') }));
  ok('sans attente dans le miroir, la base gagne', lu.base === 'de la base', lu.base);
  ok('une clé en attente dans le miroir l’emporte sur la base', lu.attente === 'écrite ici, pas partie', lu.attente);
  ok('une clé inconnue rend le défaut', lu.absente === 'défaut');
  await page.waitForTimeout(500);
  ok('… et la clé en attente est renvoyée à la base', DB.crescite_preferences.find(r => r.cle === 'essai.attente')?.valeur === 'écrite ici, pas partie' && ecritesDe('essai.attente').length === 1 && ecritesDe('essai.base').length === 0);
  ok('une valeur mal formée du panneau « à compléter » : les valeurs d’origine (ouvert, 60 jours)', await page.$eval('details.avant', e => e.open) && (await page.$eval('#avant-jours', e => e.value)) === '60');
  await page.goto(`${URL0}#/accueil`);
  await page.waitForSelector('.tb-tuile', { timeout: 15000 });
  const ordre = await page.$$eval('.tb-tuile', xs => xs.map(x => x.dataset.k));
  ok('une disposition mal formée est remise d’équerre : les dix tuiles par défaut, trois colonnes de 9 refusées', ordre.length === 10 && await page.$eval('#tb-grille', e => e.dataset.colonnes === 'auto'), ordre.join(','));
  await page.goto(`${URL0}#/planning`);
  await page.waitForSelector('main h1', { timeout: 15000 });
  await page.waitForTimeout(800);
  ok('des personnes masquées mal formées (un objet au lieu d’une liste) : le planning s’ouvre, sans erreur de script', (await texte(page, 'main h1')) === 'Planning' && erreurs.length === 0, `${await texte(page, 'main h1')} ${erreurs.join(' / ')}`);
  // la relecture (actualiser) n'écrase pas ce qui attend d'être envoyé
  await page.evaluate(() => { PREFS.ecrire('essai.relire', 'nouvelle', { muet: true }); });
  DB.crescite_preferences.push({ user_id: UID, cle: 'essai.relire', valeur: 'vieille de la base' });
  await page.evaluate(() => PREFS.charger({ relire: true }));
  ok('relire ne remplace pas une clé en attente', await page.evaluate(() => PREFS.lire('essai.relire')) === 'nouvelle');
  await page.waitForTimeout(1000);
  ok('… qui part ensuite', DB.crescite_preferences.find(r => r.cle === 'essai.relire')?.valeur === 'nouvelle');
  // la relecture qui apporte une valeur nouvelle prévient les abonnés
  await page.evaluate(() => { window.__vu = []; PREFS.surChangement('essai.base', v => window.__vu.push(v)); });
  DB.crescite_preferences.find(r => r.cle === 'essai.base').valeur = 'changée ailleurs';
  await page.evaluate(() => PREFS.charger({ relire: true }));
  ok('relire apporte ce qui a changé ailleurs, et les abonnés en sont prévenus', await page.evaluate(() => PREFS.lire('essai.base')) === 'changée ailleurs' && JSON.stringify(await page.evaluate(() => window.__vu)) === '["changée ailleurs"]', JSON.stringify(await page.evaluate(() => window.__vu)));
  ok('aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ la fermeture de la page, un refus, l'annonce
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/representations' });
  await page.waitForSelector('details.avant', { timeout: 15000 });
  // la fermeture : ce qui n'est pas parti l'est par un fetch qui survit à la page (l'autorisation du compte, en une seule requête)
  const requetes = [];
  page.on('request', r => { if (/crescite_preferences/.test(r.url()) && r.method() === 'POST') requetes.push({ url: r.url(), entetes: r.headers(), corps: r.postData() }); });
  await page.evaluate(() => { PREFS.ecrire('essai.f1', { a: 1 }, { muet: true }); PREFS.ecrire('essai.f2', [2], { muet: true }); window.dispatchEvent(new Event('pagehide')); });
  await page.waitForTimeout(500);
  ok('pagehide envoie ce qui attendait, d’un seul fetch', requetes.length === 1 && ecritesDe('essai.f1').length === 1 && ecritesDe('essai.f2').length === 1, String(requetes.length));
  ok('… avec l’autorisation du compte, la fusion des doublons et la clé de conflit', requetes[0] && /^Bearer /.test(requetes[0].entetes.authorization || '') && /merge-duplicates/.test(requetes[0].entetes.prefer || '') && /on_conflict=user_id,cle/.test(requetes[0].url) && requetes[0].entetes.apikey, JSON.stringify(requetes[0]?.entetes));
  ok('… le miroir garde le drapeau jusqu’au prochain démarrage', (await miroir(page)).attente.includes('essai.f1'));
  await page.waitForTimeout(900);
  ok('… et les minuteurs de la page n’écrivent pas une seconde fois', ecritesDe('essai.f1').length === 1 && ecritesDe('essai.f2').length === 1);
  // l'annonce, une fois par session
  const n0 = await page.$$eval('.annonce', xs => xs.map(x => x.textContent.trim()));
  await page.selectOption('#avant-jours', '90');
  await page.waitForTimeout(150);
  await page.click('details.avant > summary');
  await page.waitForTimeout(150);
  const dites = await page.$$eval('.annonce', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()).filter(t => /^Gardé /.test(t)));
  ok('« Gardé avec votre compte » : une seule annonce, au premier réglage, pas aux suivants', dites.length === 1 && /^Gardé avec votre compte/.test(dites[0]) && n0.length === 0, JSON.stringify({ dites, avant: n0 }));
  await page.screenshot({ path: `${CAPT}/annonce.png` });
  // un refus (403) : une seule annonce d'erreur, quel que soit le nombre de clés
  await page.route(/crescite_preferences/, r => (r.request().method() === 'POST' ? r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: '42501', message: 'new row violates row-level security policy' }) }) : r.fallback()));
  ECRITURES.length = 0;
  await page.evaluate(() => { PREFS.ecrire('essai.r1', 1, { aussitot: true, muet: true }); PREFS.ecrire('essai.r2', 2, { aussitot: true, muet: true }); PREFS.ecrire('essai.r3', 3, { aussitot: true, muet: true }); });
  await page.waitForTimeout(800);
  const erreursDites = await page.$$eval('.annonce.erreur', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  ok('trois écritures refusées (403) : une seule annonce d’erreur, qui dit que le réglage reste sur l’appareil', erreursDites.length === 1 && /restent sur cet appareil/.test(erreursDites[0]) && ECRITURES.length === 0, JSON.stringify(erreursDites));
  ok('… le miroir garde les trois en attente', (await miroir(page)).attente.filter(c => /^essai\.r\d$/.test(c)).length === 3);
  await page.unroute(/crescite_preferences/);
  ok('aucune erreur de script', erreurs.filter(e => !/403|row-level/.test(e)).length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ deux onglets, deux comptes
{
  repartir();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/representations' });
  await page.waitForSelector('details.avant', { timeout: 15000 });
  const page2 = await ctx.newPage();
  const erreurs2 = [];
  page2.on('pageerror', e => erreurs2.push(String(e.message || e)));
  await page2.goto(`${URL0}#/representations`);
  await page2.waitForSelector('details.avant', { timeout: 15000 });
  await page2.evaluate(() => { window.__recu = []; PREFS.surChangement('essai.diffuse', v => window.__recu.push(v)); });
  await page.evaluate(() => PREFS.ecrire('essai.diffuse', { n: 7 }, { muet: true }));
  const recu = await attendre(page2, () => window.__recu.length > 0);
  ok('deux pages du même navigateur : la seconde reçoit le BroadcastChannel et relit son miroir', recu && JSON.stringify(await page2.evaluate(() => window.__recu[0])) === '{"n":7}', JSON.stringify(await page2.evaluate(() => window.__recu)));
  ok('… et PREFS.lire y répond la nouvelle valeur, sans attendre la base', JSON.stringify(await page2.evaluate(() => PREFS.lire('essai.diffuse'))) === '{"n":7}' && ecritesDe('essai.diffuse').length === 0);
  // jamais pendant une saisie : le message attend
  await page2.evaluate(() => { window.__recu = []; });
  await page2.evaluate(() => { E.sale = true; });
  await page.evaluate(() => PREFS.ecrire('essai.diffuse', { n: 8 }, { muet: true }));
  await page2.waitForTimeout(500);
  ok('pendant une saisie en cours (E.sale), les abonnés ne sont pas prévenus', JSON.stringify(await page2.evaluate(() => window.__recu)) === '[]');
  await page2.evaluate(() => { E.sale = false; });
  const apres = await attendre(page2, () => window.__recu.length > 0, null, 4000);
  ok('… ils le sont une fois la saisie finie', apres && JSON.stringify(await page2.evaluate(() => window.__recu[0])) === '{"n":8}', JSON.stringify(await page2.evaluate(() => window.__recu)));
  ok('aucune erreur de script (deux pages)', erreurs.length === 0 && erreurs2.length === 0, erreurs.concat(erreurs2).join(' / '));
  await ctx.close();
}
{
  repartir();
  const a = await ouvrir(navigateur, { hash: '#/representations' });
  const b = await ouvrir(navigateur, { hash: '#/representations', uid: 'u-deux' });
  await a.page.waitForSelector('details.avant', { timeout: 15000 });
  await b.page.waitForSelector('details.avant', { timeout: 15000 });
  await a.page.evaluate(() => PREFS.ecrire('essai.mien', 'pour u-essai', { aussitot: true, muet: true }));
  await b.page.evaluate(() => PREFS.ecrire('essai.mien', 'pour u-deux', { aussitot: true, muet: true }));
  await a.page.waitForTimeout(500);
  const ma = await miroir(a.page, UID), mb = await miroir(b.page, 'u-deux');
  ok('deux comptes, deux miroirs : crescite-prefs:u-essai et crescite-prefs:u-deux', ma?.valeurs?.['essai.mien'] === 'pour u-essai' && mb?.valeurs?.['essai.mien'] === 'pour u-deux' && (await miroir(a.page, 'u-deux')) === null && (await miroir(b.page, UID)) === null);
  ok('… et deux lignes dans la base, une par compte', DB.crescite_preferences.filter(r => r.cle === 'essai.mien').map(r => `${r.user_id}:${r.valeur}`).sort().join('|') === 'u-deux:pour u-deux|u-essai:pour u-essai');
  ok('chaque compte ne lit que le sien', await a.page.evaluate(() => PREFS.lire('essai.mien')) === 'pour u-essai' && await b.page.evaluate(() => PREFS.lire('essai.mien')) === 'pour u-deux');
  ok('aucune erreur de script (deux comptes)', a.erreurs.length === 0 && b.erreurs.length === 0, a.erreurs.concat(b.erreurs).join(' / '));
  await a.ctx.close(); await b.ctx.close();
  DB.crescite_admins = DB.crescite_admins.filter(x => x.user_id !== 'u-deux');
}

await navigateur.close();
bilan(CAPT);
