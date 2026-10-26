// La tournée vue par l'équipe : les dix idées de equipe/tournee.js (le direct, « Je serai là » et « J'ai lu », le fil, les
// trajets, ma check-list, mon compteur, les frais sans friction, tout emporter hors connexion, répondre d'un tap et mes
// créneaux, l'équipe du soir), vérifiées dans Chromium sur la saison fictive de maquettes/equipe-fictif.mjs : la base
// simulée a le seizième script, puis ne l'a pas (chaque bloc le dit, le reste marche). Aucune donnée réelle.
//   python3 maquettes/build.py synthese && node maquettes/equipe-niveau.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium, DIST, URL0, plus, ok, compte, texte, hash, MODIFS, baseSimulee, ouvrir, bilan } from './equipe-fictif.mjs';

const CAPT = path.join(DIST, 'shots-niveau-equipe');
fs.mkdirSync(CAPT, { recursive: true });
const navigateur = await chromium.launch();
const attendre = (page, f, arg = null, t = 8000) => page.waitForFunction(f, arg, { timeout: t }).catch(() => null);
const modif = f => MODIFS.find(f) || null;
const attendreModif = async (page, f, t = 6000) => { const fin = Date.now() + t; while (Date.now() < fin) { const m = modif(f); if (m) return m; await page.waitForTimeout(100); } return null; };
const geo = ctx => ctx.route(/geo\.api\.gouv\.fr/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ nom: 'Rouen', centre: { type: 'Point', coordinates: [1.0993, 49.4431] } }]) }));

// ================================================================================ la date du Havre : présences, fil, trajets, check-list ; la saison ; le direct ; l'équipe du soir
{
  const base = baseSimulee();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/date/102', base });
  await page.waitForSelector('#presence-102 [data-presence="present"]', { timeout: 15000 });
  await attendre(page, () => document.querySelector('[data-fil="102"] .fil-msg'));
  ok('2 · la date demande « Serez-vous là ? » : Jean a confirmé, « 1 sur 2 a confirmé »', /1 sur 2 a confirmé/.test(await texte(page, '#presence-102 .etat-presence')), await texte(page, '#presence-102 .etat-presence'));
  await page.tap('#presence-102 [data-presence="present"]');
  const mp = await attendreModif(page, m => m.table === 'crescite_presences' && m.post && m.post[0].statut === 'present' && m.post[0].date_id === 102);
  await attendre(page, () => /2 sur 2 ont confirmé/.test(document.querySelector('#presence-102 .etat-presence')?.textContent || ''));
  ok('2 · « Je serai là » écrit ma présence (crescite_presences, present, sur la date et moi) ; la page dit « 2 sur 2 ont confirmé »', !!mp && mp.conflit.join(',') === 'date_id,personne_id' && /2 sur 2 ont confirmé/.test(await texte(page, '#presence-102 .etat-presence')), await texte(page, '#presence-102 .etat-presence'));
  ok('3 · le fil montre le message de Jean, la mention de Camille en gras', (await compte(page, '[data-fil="102"] .fil-msg')) === 1 && (await compte(page, '[data-fil="102"] .fil-mention')) === 1 && /camion est chargé/.test(await texte(page, '[data-fil="102"]')));
  await page.tap('[data-fil-form="102"] textarea');
  await page.type('[data-fil-form="102"] textarea', 'Je prends les clés @Je');
  await attendre(page, () => document.querySelector('[data-fil-form="102"] .fil-propositions [data-fil-mention]'));
  ok('3 · « @ » propose les gens de la date : Jean', (await compte(page, '[data-fil-form="102"] .fil-propositions [data-fil-mention]')) >= 1 && /Jean Durand/.test(await texte(page, '[data-fil-form="102"] .fil-propositions')), await texte(page, '[data-fil-form="102"] .fil-propositions'));
  await page.tap('[data-fil-form="102"] .fil-propositions [data-fil-mention]');
  const saisi = await page.$eval('[data-fil-form="102"] textarea', e => e.value);
  ok('3 · la mention choisie remplace ce qui était tapé', /@Jean Durand/.test(saisi), saisi);
  await page.screenshot({ path: `${CAPT}/date-fil.png`, fullPage: false });
  await page.tap('[data-fil-form="102"] button[type="submit"]');
  const mf = await attendreModif(page, m => m.table === 'crescite_fil' && m.post);
  await attendre(page, () => document.querySelectorAll('[data-fil="102"] .fil-msg').length === 2);
  ok('3 · Envoyer écrit le message (crescite_fil : la date, moi, le texte, la mention de Jean) et le fil le montre', !!mf && mf.post[0].date_id === 102 && mf.post[0].personne_id === 1 && /Jean Durand/.test(mf.post[0].texte) && (mf.post[0].mentions || []).includes(2) && (await compte(page, '[data-fil="102"] .fil-msg')) === 2, JSON.stringify(mf && mf.post[0]));
  ok('4 · les trajets : celui de Jean, en voiture depuis Rouen, deux places, « Je monte »', (await compte(page, '#trajets-102 .trajet')) === 1 && (await compte(page, '#trajets-102 [data-trajet-monter]')) === 1 && /Rouen, gare/.test(await texte(page, '#trajets-102')), await texte(page, '#trajets-102'));
  await page.tap('#trajets-102 [data-trajet-monter]');
  const mm = await attendreModif(page, m => m.rpc === 'crescite_trajet_monter');
  ok('4 · « Je monte » appelle crescite_trajet_monter (le trajet 1, oui)', !!mm && mm.corps.t === 1 && mm.corps.oui === true, JSON.stringify(mm && mm.corps));
  await page.tap('#trajets-102 [data-trajet-nouveau]');
  await page.waitForSelector('.gf input[name="depart"]', { timeout: 4000 }).catch(() => {});
  ok('4 · « Dire comment je viens » : une feuille avec le sens, le moyen, d’où (ma ville, Rouen), le jour, l’heure, les places', (await texte(page, '#gf-titre')) === 'Mon trajet' && (await page.$eval('.gf input[name="depart"]', e => e.value).catch(() => '')) === 'Rouen' && (await compte(page, '.gf [data-gf-seg="mode"] button')) === 4, await texte(page, '.gf'));
  await page.tap('.gf [data-gf-seg="sens"] button[data-val="retour"]');
  await page.fill('.gf input[name="heure"]', '23:30');
  await page.fill('.gf input[name="places"]', '3');
  await page.tap('.gf button[type="submit"]');
  const mt = await attendreModif(page, m => m.table === 'crescite_trajets' && m.post);
  await attendre(page, () => document.querySelectorAll('#trajets-102 .trajet').length === 2);
  ok('4 · le trajet s’écrit (crescite_trajets : retour, voiture, Rouen, 23 h 30, 3 places) et la page le liste', !!mt && mt.post[0].sens === 'retour' && mt.post[0].mode === 'voiture' && mt.post[0].depart === 'Rouen' && mt.post[0].heure === '23:30' && mt.post[0].places === 3 && (await compte(page, '#trajets-102 .trajet')) === 2, JSON.stringify(mt && mt.post[0]));
  ok('5 · ma check-list est vide : « Partir de mon modèle », « Mon modèle… », une ligne à ajouter', (await compte(page, '#check-102 [data-check-modele]')) === 1 && (await compte(page, '#check-102 [data-check-form] input')) === 1);
  await page.tap('#check-102 [data-check-modele]');
  const mc = await attendreModif(page, m => m.table === 'crescite_checklists' && m.post);
  await attendre(page, () => document.querySelectorAll('#check-102 [data-check-i]').length >= 3);
  const nItems = await compte(page, '#check-102 [data-check-i]');
  ok('5 · le modèle pose les éléments de la check-list et l’écrit (crescite_checklists : la date, mes éléments)', !!mc && mc.post[0].date_id === 102 && Array.isArray(mc.post[0].items) && nItems >= 3, `${nItems} éléments, ${JSON.stringify(mc && mc.post[0])}`);
  await page.tap('#check-102 [data-check-i="0"]');
  const mc2 = await attendreModif(page, m => m.table === 'crescite_checklists' && ((m.patch && m.patch.items && m.patch.items[0].fait) || (m.post && m.post[0].items && m.post[0].items[0].fait)));
  ok('5 · cocher barre l’élément et l’écrit après un instant (la base garde ma check-list)', !!mc2 && (await compte(page, '#check-102 li.fait')) === 1 && /1\/\d+/.test(await texte(page, '#check-102 h2')), await texte(page, '#check-102 h2'));
  await page.fill('#check-102 [data-check-form] input', 'La perruque');
  await page.press('#check-102 [data-check-form] input', 'Enter');
  await attendre(page, n => document.querySelectorAll('#check-102 [data-check-i]').length === n + 1, nItems);
  ok('5 · une ligne tapée puis Entrée s’ajoute à la liste', (await compte(page, '#check-102 [data-check-i]')) === nItems + 1 && /La perruque/.test(await texte(page, '#check-102')));
  await page.screenshot({ path: `${CAPT}/date-trajets-checklist.png`, fullPage: false });
  // la saison : les étiquettes, le jour J, le rappel
  await page.goto(`${URL0}#/saison`);
  await page.waitForSelector('#billet-102', { timeout: 10000 }).catch(() => {});
  ok('2 · dans la saison, le billet du Havre dit « Vous serez là »', /Vous serez là/.test(await texte(page, '#billet-102')), await texte(page, '#billet-102'));
  ok('1 · la section du jour J propose « Le direct »', (await compte(page, '#contenu a[href="#/direct/101"]')) >= 1);
  ok('9 · la saison rappelle la proposition sans réponse (Flers, le premier jour dans 12 jours), avec « Répondre »', (await compte(page, '#t-rappel')) === 1 && /Flers/.test(await texte(page, '.carte-action.rappel')) && /dans 12 jours/.test(await texte(page, '.carte-action.rappel')) && (await compte(page, '.carte-action.rappel a[href="#/proposition/1"]')) >= 1, await texte(page, '.carte-action.rappel'));
  await page.screenshot({ path: `${CAPT}/saison.png`, fullPage: false });
  // le direct du jour J
  await page.goto(`${URL0}#/direct/101`);
  await page.waitForSelector('.direct[data-direct="101"]', { timeout: 10000 }).catch(() => {});
  ok('1 · le direct : le rideau (dans…, levé, ou joué), la frise des étapes du jour, l’écran sombre et grand', (await compte(page, '.direct[data-direct="101"]')) === 1 && await page.evaluate(() => document.documentElement.classList.contains('direct-ouvert')) && (await compte(page, '.direct-frise li')) >= 2 && /Rideau|joué|Pas de séance/.test(await texte(page, '.direct-rideau')), await texte(page, '.direct-rideau'));
  ok('1 · ses gestes : l’itinéraire, l’équipe du soir, la date ; « garder l’écran allumé »', (await compte(page, '.direct a[href="#/equipe/101"]')) === 1 && (await compte(page, '.direct a[href="#/date/101"]')) === 1 && (await compte(page, '.direct [data-veille]')) === 1);
  await page.screenshot({ path: `${CAPT}/direct.png`, fullPage: false });
  await page.goto(`${URL0}#/date/101`);
  await page.waitForSelector('#contenu .heros[data-date="101"]', { timeout: 10000 }).catch(() => {});
  ok('1 · quitter le direct rend l’écran clair', !(await page.evaluate(() => document.documentElement.classList.contains('direct-ouvert'))));
  ok('1 · la date d’aujourd’hui a le geste « Direct » ; toute date a « Équipe » et « Emporter »', (await compte(page, '#contenu .geste[href="#/direct/101"]')) === 1 && (await compte(page, '#contenu .geste[href="#/equipe/101"]')) === 1 && (await compte(page, '#contenu [data-emporter="101"]')) === 1);
  // l'équipe du soir
  await page.goto(`${URL0}#/equipe/102`);
  await page.waitForSelector('[data-coord]', { timeout: 10000 }).catch(() => {});
  const me = modif(m => m.rpc === 'crescite_equipe_du_jour' && m.corps.d === 102);
  ok('10 · l’équipe du soir du Havre (crescite_equipe_du_jour) : Camille et Jean, leurs rôles ; le téléphone de Camille ; un SMS groupé', !!me && (await compte(page, '[data-coord]')) === 2 && /Régie générale/.test(await texte(page, '#eq-gens-102')) && (await compte(page, '#eq-gens-102 a[href^="tel:"]')) >= 1 && (await compte(page, '#soir-groupe-102 a[href^="sms:"]')) === 1, await texte(page, '#eq-gens-102'));
  ok('10 · le lieu : le Volcan, l’adresse, l’itinéraire, les contacts de la feuille de route', (await compte(page, '#eq-lieu-102')) === 1 && /Volcan/.test(await texte(page, '#eq-lieu-102')) && /Niemeyer/.test(await texte(page, '#eq-lieu-102')), await texte(page, '#eq-lieu-102'));
  await page.screenshot({ path: `${CAPT}/equipe-du-soir.png`, fullPage: false });
  ok('téléphone · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ emporter, moi, le compteur, les créneaux, répondre d'un tap, les frais
{
  const base = baseSimulee();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/date/102', base });
  await geo(ctx);
  await page.waitForSelector('#contenu [data-emporter="102"]', { timeout: 15000 });
  await page.tap('#contenu [data-emporter="102"]');
  await attendre(page, () => /102/.test(localStorage.getItem('crescite-equipe-emportees') || ''), null, 10000);
  await attendre(page, () => document.querySelector('#contenu [data-emporter="102"][aria-pressed="true"]'));
  const nFichiers = await page.evaluate(() => new Promise(r => { const o = indexedDB.open('crescite-equipe-emporte'); o.onsuccess = () => { const db = o.result; if (!db.objectStoreNames.contains('fichiers')) return r(-1); const t = db.transaction('fichiers').objectStore('fichiers').count(); t.onsuccess = () => r(t.result); t.onerror = () => r(-3); }; o.onerror = () => r(-2); }));
  ok('8 · « Emporter » marque la date emportée (le geste dit « Emportée »), range la fiche technique du spectacle dans IndexedDB', /102/.test(await page.evaluate(() => localStorage.getItem('crescite-equipe-emportees') || '')) && (await compte(page, '#contenu [data-emporter="102"][aria-pressed="true"]')) === 1 && nFichiers === 1, `${nFichiers} fichier(s)`);
  // sans réseau, le document s'ouvre depuis l'appareil
  await page.evaluate(() => { window.__ouverts = []; window.open = u => { window.__ouverts.push(String(u)); return {}; }; });
  await ctx.setOffline(true);
  const docSel = '#contenu [data-fichier="la-folle-idee/fiche-technique.pdf"]';
  if (await page.$(docSel)) { await page.tap(docSel); await attendre(page, () => window.__ouverts.length > 0, null, 4000); }
  const ouverts = await page.evaluate(() => window.__ouverts);
  ok('8 · sans réseau, la fiche technique s’ouvre depuis l’appareil (un lien blob:, pas un lien signé)', ouverts.length === 1 && /^blob:/.test(ouverts[0]), JSON.stringify(ouverts));
  await ctx.setOffline(false);
  await page.goto(`${URL0}#/saison`);
  await page.waitForSelector('#billet-102', { timeout: 10000 }).catch(() => {});
  ok('8 · dans la saison, le billet du Havre dit « Sur l’appareil »', /Sur l’appareil/.test(await texte(page, '#billet-102')), await texte(page, '#billet-102'));
  // moi
  await page.goto(`${URL0}#/moi`);
  await page.waitForSelector('#t-compteur', { timeout: 10000 }).catch(() => {});
  await attendre(page, () => document.querySelector('#t-emport'));
  ok('6 · 9 · 8 · « Moi » : Mon compteur, Mes créneaux libres, Sur l’appareil (une date emportée, avec ses documents)', (await compte(page, '#t-compteur')) === 1 && (await compte(page, '#t-creneaux')) === 1 && (await compte(page, '#t-emport')) === 1 && /1 date emportée/.test(await texte(page, '#zone-emport')) && /La Folle Idée/.test(await texte(page, '#zone-emport')), await texte(page, '#zone-emport'));
  await page.screenshot({ path: `${CAPT}/moi.png`, fullPage: true });
  await page.tap('[data-tout-retirer]');
  await attendre(page, () => !document.querySelector('#t-emport'));
  ok('8 · « Tout retirer » vide l’appareil : la carte disparaît, plus rien dans IndexedDB', (await compte(page, '#t-emport')) === 0 && (await page.evaluate(() => new Promise(r => { const o = indexedDB.open('crescite-equipe-emporte'); o.onsuccess = () => { const t = o.result.transaction('fichiers').objectStore('fichiers').count(); t.onsuccess = () => r(t.result); }; o.onerror = () => r(-2); }))) === 0);
  // le compteur
  await page.goto(`${URL0}#/compteur`);
  await page.waitForSelector('.compteur-total', { timeout: 10000 }).catch(() => {});
  ok('6 · le compteur : 1 cachet joué (Paris, il y a quarante jours), 1 date, 5 séances à venir, une seule saison', /1\s*cachet joué/.test(await texte(page, '.compteur-total')) && /5\s*à venir/.test(await texte(page, '.compteur-total')) && (await compte(page, 'table.compteur tbody tr')) === 1 && /2026-2027/.test(await texte(page, 'table.compteur tbody')), await texte(page, '.compteur-total'));
  const [telech] = await Promise.all([page.waitForEvent('download', { timeout: 6000 }).catch(() => null), page.tap('[data-compteur-csv]')]);
  ok('6 · « Exporter en CSV » télécharge mon-compteur.csv', !!telech && telech.suggestedFilename() === 'mon-compteur.csv', telech ? telech.suggestedFilename() : 'pas de téléchargement');
  await page.evaluate(() => { window.__attest = ''; window.open = () => ({ document: { write(h) { window.__attest += h; }, close() {} }, focus() {}, print() {} }); });
  await page.tap('[data-compteur-attestation]');
  await attendre(page, () => window.__attest.length > 0, null, 4000);
  const attest = await page.evaluate(() => window.__attest);
  ok('6 · l’attestation : un relevé imprimable au nom de Camille Essai, la représentation de Paris, la réserve d’usage', /Relevé des dates de Camille Essai/.test(attest) && /Paris/.test(attest) && /ne vaut pas attestation d’employeur/.test(attest), attest.slice(0, 200));
  await page.screenshot({ path: `${CAPT}/compteur.png`, fullPage: true });
  // mes créneaux
  await page.goto(`${URL0}#/creneaux`);
  await page.waitForSelector('#f-creneau', { timeout: 10000 }).catch(() => {});
  await attendre(page, () => !document.querySelector('#zone-creneaux .chargement'));
  ok('9 · « Mes créneaux libres » (onglet planning) : du, au, un mot ; aucun créneau pour l’instant', (await hash(page)) === '#/creneaux' && (await compte(page, '#cr-du')) === 1 && /Aucun créneau/.test(await texte(page, '#zone-creneaux')), await texte(page, '#zone-creneaux'));
  await page.fill('#cr-du', plus(30));
  await page.fill('#cr-au', plus(34));
  await page.fill('#cr-message', 'Libre pour une tournée');
  await page.tap('#f-creneau button[type="submit"]');
  const mcr = await attendreModif(page, m => m.table === 'crescite_creneaux' && m.post);
  await attendre(page, () => document.querySelector('.creneaux li'));
  ok('9 · « Proposer » écrit le créneau (crescite_creneaux : moi, du, au, le mot) et la liste le montre', !!mcr && mcr.post[0].personne_id === 1 && mcr.post[0].debut === plus(30) && mcr.post[0].fin === plus(34) && mcr.post[0].message === 'Libre pour une tournée' && (await compte(page, '.creneaux li')) === 1 && /Libre pour une tournée/.test(await texte(page, '.creneaux')), JSON.stringify(mcr && mcr.post[0]));
  await page.screenshot({ path: `${CAPT}/creneaux.png`, fullPage: false });
  await page.tap('.creneaux [data-creneau-retirer]');
  const mcd = await attendreModif(page, m => m.table === 'crescite_creneaux' && m.delete);
  await attendre(page, () => !document.querySelector('.creneaux li'));
  ok('9 · « Retirer » le supprime', !!mcd && (await compte(page, '.creneaux li')) === 0);
  // répondre d'un tap, depuis la notification
  await page.goto(`${URL0}#/notifications`);
  await page.waitForSelector('.liste-notifs .notif[data-notif="3"]', { timeout: 10000 }).catch(() => {});
  ok('9 · la notification de la proposition porte les trois réponses d’un tap : Disponible, Pas disponible, Peut-être', (await compte(page, '[data-rep-notif="11"]')) === 3 && (await compte(page, '[data-rep-notif="11"][data-reponse="oui"]')) === 1, String(await compte(page, '[data-rep-notif]')));
  await page.screenshot({ path: `${CAPT}/notifications.png`, fullPage: false });
  await page.tap('[data-rep-notif="11"][data-reponse="oui"]');
  const mr = await attendreModif(page, m => m.rpc === 'crescite_repondre');
  await attendre(page, () => !document.querySelector('[data-rep-notif]'));
  ok('9 · « Disponible » appelle crescite_repondre (le jour 11, oui) ; la réponse donnée, les boutons s’effacent', !!mr && mr.corps.jour === 11 && mr.corps.reponse_ === 'oui' && (await compte(page, '[data-rep-notif]')) === 0, JSON.stringify(mr && mr.corps));
  // les frais sans friction
  await page.goto(`${URL0}#/frais`);
  await page.waitForSelector('#nf-km-zone', { timeout: 10000 }).catch(() => {});
  ok('7 · le formulaire des frais porte un bloc kilométrage, caché tant que la catégorie n’est pas « transport »', (await compte(page, '#nf-km-zone')) === 1 && await page.$eval('#nf-km-zone', e => e.hidden));
  await page.selectOption('#nf-categorie', 'transport');
  await page.selectOption('#nf-date-tournee', '101').catch(() => {});
  ok('7 · « transport » le montre : les kilomètres, « De ma ville au lieu », le barème (0,636 €/km)', !(await page.$eval('#nf-km-zone', e => e.hidden)) && /0,636 €\/km/.test(await texte(page, '#nf-km-aide')), await texte(page, '#nf-km-aide'));
  await page.tap('#nf-km-calc');
  await attendre(page, () => Number(document.querySelector('#nf-km').value) > 0, null, 6000);
  const kms = Number(await page.$eval('#nf-km', e => e.value)), montant = Number(await page.$eval('#nf-montant', e => e.value));
  ok('7 · Rouen → Caen : 111 km à vol d’oiseau, × 1,3 par la route, aller-retour ≈ 288 km ; le montant suit le barème', kms >= 270 && kms <= 300 && Math.abs(montant - Math.round(kms * 0.636 * 100) / 100) < 0.011, `${kms} km, ${montant} €, « ${await page.$eval('#nf-commentaire', e => e.value)} »`);
  await page.tap('#btn-soumettre-frais');
  const mn = await attendreModif(page, m => m.table === 'crescite_notes_frais' && m.post);
  ok('7 · Enregistrer accepte la note sans ticket : transport, le montant, photo_url nulle, le commentaire dit le kilométrage et le trajet', !!mn && mn.post[0].categorie === 'transport' && mn.post[0].photo_url === null && Number(mn.post[0].montant_ttc) === montant && /Kilométrage : \d+ km/.test(mn.post[0].commentaire) && /Rouen → Caen/.test(mn.post[0].commentaire), JSON.stringify(mn && mn.post[0]));
  await attendre(page, () => document.querySelector('#frais-recap tbody tr'));
  ok('7 · le récapitulatif mois par mois (une note, le total en attente) et l’export CSV', (await compte(page, '#frais-recap tbody tr')) === 1 && (await compte(page, '[data-frais-csv]')) === 1, await texte(page, '#frais-recap'));
  await page.screenshot({ path: `${CAPT}/frais.png`, fullPage: true });
  ok('téléphone (suite) · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ sans le seizième script : chaque bloc le dit, le reste marche
{
  const base = baseSimulee({ tournee: false });
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/date/102', base });
  await page.waitForSelector('#presence-102', { timeout: 15000 });
  const bientot = /Bientôt dans l’application/;
  ok('sans le script : « Serez-vous là ? », le fil, les trajets, la check-list disent « Bientôt dans l’application », sans erreur', bientot.test(await texte(page, '#presence-102')) && bientot.test(await texte(page, '#fil-102')) && bientot.test(await texte(page, '#trajets-102')) && bientot.test(await texte(page, '#check-102')), await texte(page, '#presence-102'));
  ok('sans le script : « Équipe », « Emporter » et le direct restent', (await compte(page, '#contenu .geste[href="#/equipe/102"]')) === 1 && (await compte(page, '#contenu [data-emporter="102"]')) === 1);
  await page.goto(`${URL0}#/equipe/102`);
  await page.waitForSelector('#eq-gens-102', { timeout: 10000 }).catch(() => {});
  ok('sans le script, l’équipe du soir se dresse depuis la distribution : Camille et Jean, sans téléphone', (await compte(page, '#eq-gens-102 [data-coord]')) === 2, String(await compte(page, '#eq-gens-102 [data-coord]')));
  await page.goto(`${URL0}#/compteur`);
  await page.waitForSelector('.compteur-total', { timeout: 10000 }).catch(() => {});
  ok('sans le script, le compteur compte quand même', /1\s*cachet joué/.test(await texte(page, '.compteur-total')), await texte(page, '.compteur-total'));
  ok('sans le script · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ à l'ordinateur
{
  const base = baseSimulee();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { telephone: false, hash: '#/equipe/102', base });
  await page.waitForSelector('[data-coord]', { timeout: 15000 }).catch(() => {});
  ok('ordinateur · l’équipe du soir, le compteur et le direct se dessinent', (await compte(page, '[data-coord]')) === 2);
  await page.screenshot({ path: `${CAPT}/ordinateur-equipe.png`, fullPage: false });
  await page.goto(`${URL0}#/compteur`);
  await page.waitForSelector('table.compteur', { timeout: 10000 }).catch(() => {});
  ok('ordinateur · le compteur en table', (await compte(page, 'table.compteur tbody tr')) === 1);
  await page.goto(`${URL0}#/direct/101`);
  await page.waitForSelector('.direct[data-direct="101"]', { timeout: 10000 }).catch(() => {});
  ok('ordinateur · le direct', (await compte(page, '.direct[data-direct="101"]')) === 1);
  ok('ordinateur · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

await navigateur.close();
bilan(CAPT);
