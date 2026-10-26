// Les gestes de l'espace de l'équipe (equipe/equipe.js avec ../admin/gestes.js), vérifiés dans Chromium, hors ligne :
// l'appui long sur un billet (une feuille d'actions depuis le bas), la date d'avant et d'après (les boutons, le balayage
// au doigt, ← → au clavier), le clic droit sur une notification.
//   python3 maquettes/build.py synthese && node maquettes/gestes-equipe.mjs
// Même saison fictive que mouvement-equipe.mjs (aucune donnée réelle, la base coupée). Demande Playwright et Chromium.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, DIST, URL0, plus, AUJ, MEMOIRE, ok, compte, texte, hash, MODIFS, baseSimulee, ouvrir, appuiLong, menuSur, balayer, bilan } from './equipe-fictif.mjs';

const CAPT = path.join(DIST, 'shots-gestes');

const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--disable-features=OverscrollHistoryNavigation'] });
fs.mkdirSync(CAPT, { recursive: true });

// ================================================================================ au téléphone : l'appui long, le balayage
{
  const { ctx, page, erreurs } = await ouvrir(navigateur);
  await page.waitForSelector('#billet-102', { timeout: 10000 });
  ok('gestes.js est chargé dans l’espace de l’équipe', await page.evaluate(() => typeof GESTES === 'object' && typeof GESTES.menu === 'function'));
  const b = await page.$('#billet-102');
  await b.scrollIntoViewIfNeeded();
  const r = await b.boundingBox();
  await appuiLong(page, r.x + r.width / 2, r.y + 30);
  await page.waitForSelector('.gm.gm-feuille .gm-boite', { timeout: 3000 }).catch(() => {});
  const items = await page.$$eval('.gm-feuille [data-gm]', xs => xs.map(x => x.querySelector('.gm-l').firstChild.textContent));
  ok('l’appui long sur un billet ouvre une feuille d’actions depuis le bas, au nom de la date', (await compte(page, '.gm.gm-feuille .gm-boite[role="menu"]')) === 1 && /La Folle Idée/.test(await texte(page, '.gm-feuille .gm-titre')), await texte(page, '.gm-feuille .gm-titre'));
  ok('ses actions : ouvrir, itinéraire, agenda, partager', ['Ouvrir la date', 'Itinéraire', 'Ajouter à mon agenda', 'Partager la date'].every(x => items.includes(x)), items.join(' | '));
  ok('la page n’a pas bougé (le clic qui suit l’appui est avalé)', (await hash(page)) === '#/saison');
  await page.screenshot({ path: `${CAPT}/appui-long.png`, fullPage: false });
  await page.tap('.gm-feuille [data-gm]:has-text("Ouvrir la date")');
  await page.waitForFunction(() => location.hash === '#/date/102' && document.querySelector('.heros-page'), null, { timeout: 8000 }).catch(() => {});
  ok('« Ouvrir la date » ouvre la page de la date', (await hash(page)) === '#/date/102', await hash(page));
  await page.waitForTimeout(500);
  const nav = await page.$eval('#contenu .nav-dates', e => [...e.querySelectorAll('[data-gps]')].map(x => `${x.dataset.gps}:${x.dataset.href || 'off'}:${x.textContent.trim()}`)).catch(() => []);
  ok('la page a « date précédente / date suivante », nommées (le jour, puis le spectacle)', /^-1:#\/date\/101:\S+ \d+(er)? \S+ · Bérénice$/.test(nav[0] || '') && /^1:#\/date\/103:\S+ \d+(er)? \S+ · Bérénice$/.test(nav[1] || ''), nav.join(' | '));
  await page.screenshot({ path: `${CAPT}/date.png`, fullPage: false });
  // (après un changement de page, la transition de vue couvre l'écran un instant : le doigt attend qu'elle finisse)
  const pageDe = async id => { await page.waitForFunction(h => location.hash === h && document.querySelector('#contenu .nav-dates') && [...document.querySelectorAll('#contenu .nav-dates [data-gps]')].every(b => b.dataset.href !== h), `#/date/${id}`, { timeout: 6000 }).catch(() => {}); await page.waitForTimeout(500); };
  await page.waitForTimeout(500);
  await balayer(page, [320, 240], [80, 245]);   // sur le héros de la page
  await pageDe(103);
  ok('un balayage vers la gauche ouvre la date suivante', (await hash(page)) === '#/date/103', await hash(page));
  await balayer(page, [80, 240], [320, 245]);
  await pageDe(102);
  ok('un balayage vers la droite revient à la précédente', (await hash(page)) === '#/date/102', await hash(page));
  await page.waitForTimeout(300);
  const h = await page.$('.heros[data-date]');
  const rh = await h.boundingBox();
  await appuiLong(page, rh.x + rh.width / 2, rh.y + rh.height - 30);
  await page.waitForSelector('.gm.gm-feuille .gm-boite', { timeout: 3000 }).catch(() => {});
  const items2 = await page.$$eval('.gm-feuille [data-gm]', xs => xs.map(x => x.querySelector('.gm-l').firstChild.textContent));
  ok('l’appui long sur le héros de la page : les mêmes actions, sans « Ouvrir »', items2.length >= 3 && !items2.includes('Ouvrir la date') && items2.includes('Itinéraire'), items2.join(' | '));
  await page.tap('.gm-feuille .gm-voile', { position: { x: 10, y: 10 } });
  ok('toucher le voile ferme la feuille', (await compte(page, '.gm-boite')) === 0);
  ok('téléphone · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ à l'ordinateur : le clic droit, ← →
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { telephone: false, hash: '#/notifications' });
  await page.waitForSelector('.liste-notifs .notif[data-notif="1"]', { timeout: 10000 });
  await page.click('.liste-notifs .notif[data-notif="1"]', { button: 'right' });
  await page.waitForSelector('.gm-boite [data-gm]:has-text("Marquer comme lue")', { timeout: 3000 }).catch(() => {});
  ok('clic droit sur une notification : ouvrir, marquer comme lue, tout marquer, effacer', (await compte(page, '.gm-boite [data-gm]')) === 4, String(await compte(page, '.gm-boite [data-gm]')));
  await page.click('.gm-boite [data-gm]:has-text("Marquer comme lue")');
  await page.waitForFunction(() => !document.querySelector('.liste-notifs .notif[data-notif="1"].non-lue'), null, { timeout: 4000 }).catch(() => {});
  ok('« Marquer comme lue » la marque, sans quitter la page', (await compte(page, '.liste-notifs .notif[data-notif="1"].non-lue')) === 0 && (await hash(page)) === '#/notifications');
  // (la page d'une date : on attend que ses boutons soient ceux de la nouvelle date, la transition de vue finie)
  const pageDe = id => page.waitForFunction(h => location.hash === h && document.querySelector('#contenu .nav-dates') && [...document.querySelectorAll('#contenu .nav-dates [data-gps]')].every(b => b.dataset.href !== h), `#/date/${id}`, { timeout: 6000 }).catch(() => {});
  await page.goto(`${URL0}#/date/102`);
  await pageDe(102);
  await page.keyboard.press('ArrowRight');
  await pageDe(103);
  ok('→ ouvre la date suivante', (await hash(page)) === '#/date/103', await hash(page));
  await page.keyboard.press('ArrowLeft');
  await pageDe(102);
  ok('← revient à la précédente', (await hash(page)) === '#/date/102', await hash(page));
  await page.click('#contenu .nav-dates [data-gps="-1"]');
  await pageDe(101);
  await page.click('#contenu .nav-dates [data-gps="-1"]');
  await pageDe(104);
  ok('« précédente » deux fois : la date d’aujourd’hui, puis la date passée, qui n’en a plus avant elle', (await hash(page)) === '#/date/104' && await page.$eval('#contenu .nav-dates [data-gps="-1"]', e => e.disabled), await hash(page));
  await page.click('.heros[data-date]', { button: 'right' });
  await page.waitForSelector('.gm-boite', { timeout: 3000 }).catch(() => {});
  ok('clic droit sur le héros d’une date : ses actions', (await compte(page, '.gm-boite [data-gm]')) >= 2);
  await page.keyboard.press('Escape');
  ok('ordinateur · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ le compte administre : modifier d'un appui long
{
  const base = baseSimulee();
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/date/102', base });
  await page.waitForFunction(() => document.querySelector('#contenu .heros[data-date="102"]') && document.querySelector('#contenu .portraits li[data-personne="2"]'), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  ok('en ligne, le compte est reconnu administrateur et la page lit la base simulée (l’équipe de la date : Camille, Jean)', MODIFS.some(m => m.rpc === 'crescite_est_admin') && (await compte(page, '#contenu .portraits li[data-personne]')) === 2, String(await compte(page, '#contenu .portraits li[data-personne]')));
  await menuSur(page, '.heros[data-date="102"]', 'Modifier la date…', { dy: -30 });
  const items = await page.$$eval('.gm-feuille [data-gm]', xs => xs.map(x => x.querySelector('.gm-l').firstChild.textContent));
  ok('l’appui long sur la date, en administrateur : modifier la date, les représentations, qui part, le lieu, le suivi, prévenir, supprimer', ['Modifier la date…', 'Les représentations…', 'Qui part…', 'Modifier le lieu…', 'Suivi interne…', 'Prévenir l’équipe…', 'Supprimer la date…'].every(x => items.includes(x)), items.join(' | '));
  await page.waitForTimeout(400); await page.screenshot({ path: `${CAPT}/admin-menu.png`, fullPage: false });
  // la date : son statut, en feuille
  await page.tap('.gm-feuille [data-gm]:has-text("Modifier la date…")');
  await page.waitForSelector('.gf [role="dialog"]', { timeout: 3000 }).catch(() => {});
  ok('« Modifier la date… » ouvre une feuille de modification (statut, nature, publication, lien, précisions)', (await texte(page, '.gf h2')) === 'Modifier la date' && (await compte(page, '.gf [data-gf-seg="statut"] button')) === 4 && (await compte(page, '.gf [name="lien"]')) === 1);
  await page.waitForTimeout(400); await page.screenshot({ path: `${CAPT}/admin-formulaire.png`, fullPage: false });
  await page.tap('.gf [data-gf-seg="statut"] button[data-val="option"]');
  await page.tap('.gf button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.gf') && document.querySelector('#contenu .heros[data-date="102"] .etat-option'), null, { timeout: 8000 }).catch(() => {});
  ok('Enregistrer écrit le statut dans la base (une option n’est jamais publiée), la feuille se ferme, la page relue dit « Option »', MODIFS.some(m => m.table === 'crescite_dates' && m.patch && m.patch.statut === 'option' && m.patch.visible === false && m.n === 1) && (await compte(page, '.gf')) === 0 && base.DB.crescite_dates.find(d => d.id === 102).statut === 'option' && (await texte(page, '#contenu .heros[data-date="102"] .etat-option')) === 'Option', `${JSON.stringify(MODIFS.filter(m => m.table === 'crescite_dates'))} · ${await texte(page, '#contenu .heros-haut')}`);
  // l'horaire : en feuille, l'heure change
  await page.waitForTimeout(600);
  await menuSur(page, '#contenu .horaires li[data-reps]', 'Changer l’heure…', { dx: 60 });
  ok('l’appui long sur un horaire : changer l’heure, annuler, retirer la séance', (await compte(page, '.gm-feuille [data-gm]')) === 3, String(await compte(page, '.gm-feuille [data-gm]')));
  await page.tap('.gm-feuille [data-gm]:has-text("Changer l’heure…")');
  await page.waitForSelector('.gf input[name="reps.0.heure"]', { timeout: 3000 }).catch(() => {});
  await page.fill('.gf input[name="reps.0.heure"]', '21:00');
  await page.tap('.gf button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.gf') && /21h00/.test(document.querySelector('#contenu .horaires')?.textContent || ''), null, { timeout: 8000 }).catch(() => {});
  ok('la nouvelle heure est écrite (représentation 1020 → 21:00) et la page la montre', MODIFS.some(m => m.table === 'crescite_representations' && m.patch && m.patch.heure === '21:00') && /21h00/.test(await texte(page, '#contenu .horaires')), await texte(page, '#contenu .horaires'));
  // qui part : Jean ne part pas
  await page.waitForTimeout(600);
  await menuSur(page, '#contenu .portraits li[data-personne="2"]', 'Ne part pas sur cette date', { dx: 80 });
  ok('l’appui long sur une personne de l’équipe : ses coordonnées, « ne part pas », qui part', (await compte(page, '.gm-feuille [data-gm]')) === 3, `${await compte(page, '.gm-feuille [data-gm]')} · ${await page.$$eval('.gm-feuille [data-gm]', xs => xs.map(x => x.textContent.trim()).join(' | '))}`);
  await page.tap('.gm-feuille [data-gm]:has-text("Ne part pas sur cette date")');
  await page.waitForFunction(() => !document.querySelector('#contenu .portraits li[data-personne="2"]'), null, { timeout: 8000 }).catch(() => {});
  ok('« Ne part pas sur cette date » écrit l’écart (crescite_equipes, present faux) et Jean quitte « Qui part »', MODIFS.some(m => m.table === 'crescite_equipes' && m.post && m.post[0].personne_id === 2 && m.post[0].present === false) && (await compte(page, '#contenu .portraits li[data-personne="2"]')) === 0 && (await compte(page, '#contenu .portraits li[data-personne="1"]')) === 1);
  // le lieu : l'adresse
  await page.waitForTimeout(600);
  await menuSur(page, '#contenu .bloc-lieu[data-lieu]', 'Modifier le lieu…', { dy: 40 });
  await page.tap('.gm-feuille [data-gm]:has-text("Modifier le lieu…")');
  await page.waitForSelector('.gf input[name="adresse"]', { timeout: 3000 }).catch(() => {});
  await page.fill('.gf input[name="adresse"]', '8 place Oscar-Niemeyer');
  await page.fill('.gf textarea[name="contact"]', 'Régie : 02 35 19 10 10');
  await page.tap('.gf button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.gf') && /Oscar-Niemeyer/.test(document.querySelector('#contenu .bloc-lieu')?.textContent || ''), null, { timeout: 8000 }).catch(() => {});
  ok('le lieu : l’adresse écrite dans crescite_lieux, le contact dans son suivi, la page relue', MODIFS.some(m => m.table === 'crescite_lieux' && m.patch && m.patch.adresse === '8 place Oscar-Niemeyer') && MODIFS.some(m => m.table === 'crescite_lieux_suivi' && m.post && /02 35 19 10 10/.test(m.post[0].contact)) && /Oscar-Niemeyer/.test(await texte(page, '#contenu .bloc-lieu')));
  // prévenir l'équipe
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(250);
  await menuSur(page, '.heros[data-date="102"]', 'Prévenir l’équipe…', { dy: -30 });
  await page.tap('.gm-feuille [data-gm]:has-text("Prévenir l’équipe…")');
  await page.waitForSelector('.gf textarea[name="texte"]', { timeout: 3000 }).catch(() => {});
  await page.fill('.gf textarea[name="texte"]', 'Rendez-vous 14 h au Volcan.');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${CAPT}/admin-prevenir.png`, fullPage: false });
  await page.tap('.gf button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.gf'), null, { timeout: 6000 }).catch(() => {});
  const prevenu = MODIFS.find(m => m.rpc === 'crescite_prevenir_equipe');
  if (!prevenu) console.log('  [diagnostic prévenir]', JSON.stringify({ gf: await compte(page, '.gf'), h2: await texte(page, '.gf h2'), erreur: await page.$eval('.gf-erreur', e => `${e.hidden ? 'cachée' : 'visible'} ${e.textContent}`).catch(() => 'absente'),
    titre: await page.$eval('.gf [name="titre"]', e => e.value).catch(() => null), texte: await page.$eval('.gf textarea[name="texte"]', e => e.value).catch(() => null), menu: await compte(page, '.gm-boite'), annonces: await texte(page, '#annonces'), hash: await page.evaluate(() => location.hash),
    animations: await page.evaluate(() => document.getAnimations().length), journal: page.journal.slice(-8) }));
  ok('« Prévenir l’équipe… » appelle crescite_prevenir_equipe avec la date, le titre et le message', !!prevenu && prevenu.corps.d === 102 && prevenu.corps.texte_ === 'Rendez-vous 14 h au Volcan.' && /Message de l’administration/.test(prevenu.corps.titre_), JSON.stringify(prevenu));
  ok('et le dit', /Message envoyé à 2/.test(await texte(page, '#annonces')), await texte(page, '#annonces'));
  // une notification s'efface
  await page.goto(`${URL0}#/notifications`);
  await page.waitForSelector('.liste-notifs .notif[data-notif="2"]', { timeout: 10000 });
  await page.waitForTimeout(500);
  await menuSur(page, '.liste-notifs .notif[data-notif="2"]', 'Effacer');
  await page.tap('.gm-feuille [data-gm]:has-text("Effacer")');
  await page.waitForFunction(() => !document.querySelector('.liste-notifs .notif[data-notif="2"]'), null, { timeout: 6000 }).catch(() => {});
  ok('« Effacer » retire la notification de la base et de la liste', MODIFS.some(m => m.table === 'crescite_notifications' && m.delete && m.delete.includes(2)) && (await compte(page, '.liste-notifs .notif[data-notif="2"]')) === 0);
  // ---- les documents : modifier, ajouter depuis le téléphone (un fichier envoyé dans le stockage privé de l'équipe)
  page.on('dialog', dlg => dlg.accept());
  await page.goto(`${URL0}#/date/102`);
  await page.waitForFunction(() => document.querySelectorAll('#contenu .puces-docs li[data-doc]').length === 2, null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
  await menuSur(page, '#contenu .puces-docs li[data-doc="31"]', 'Modifier…');
  const itemsDoc = await page.$$eval('.gm-feuille [data-gm]', xs => xs.map(x => x.querySelector('.gm-l').firstChild.textContent));
  ok('l’appui long sur un document, en administrateur : ouvrir, partager, modifier, remplacer le fichier, supprimer', ['Ouvrir', 'Partager', 'Modifier…', 'Remplacer le fichier…', 'Supprimer…'].every(x => itemsDoc.includes(x)), itemsDoc.join(' | '));
  await page.tap('.gm-feuille [data-gm]:has-text("Modifier…")');
  await page.waitForSelector('.gf input[name="titre"]', { timeout: 3000 }).catch(() => {});
  ok('« Modifier… » : le titre, le type, pour qui (l’équipe ou l’administration, pour un fichier privé)', (await page.$eval('.gf input[name="titre"]', e => e.value).catch(() => '')) === 'Fiche technique' && (await compte(page, '.gf [data-gf-seg="type"] button[aria-pressed="true"][data-val="fiche_technique"]')) === 1 && (await compte(page, '.gf select[name="pour"] option')) === 2);
  await page.fill('.gf input[name="titre"]', 'Fiche technique 2026');
  await page.tap('.gf button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.gf') && document.querySelector('#contenu .puces-docs li[data-doc="31"] [title="Fiche technique 2026"]'), null, { timeout: 8000 }).catch(() => {});
  ok('Enregistrer écrit le document, la page le relit', MODIFS.some(m => m.table === 'crescite_documents' && m.patch && m.patch.titre === 'Fiche technique 2026' && m.patch.type === 'fiche_technique' && m.patch.pour === 'equipe' && m.n === 1) && (await compte(page, '#contenu .puces-docs li[data-doc="31"] [title="Fiche technique 2026"]')) === 1, JSON.stringify(MODIFS.filter(m => m.table === 'crescite_documents')));
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
  await menuSur(page, '.heros[data-date="102"]', 'Ajouter un document…', { dy: -30 });
  await page.tap('.gm-feuille [data-gm]:has-text("Ajouter un document…")');
  await page.waitForSelector('.gf input[type="file"]', { timeout: 3000 }).catch(() => {});
  ok('« Ajouter un document… » : un titre, le type, pour qui, un fichier du téléphone ou un lien', (await texte(page, '.gf h2')) === 'Ajouter un document' && (await compte(page, '.gf input[type="file"][name="fichier"]')) === 1 && (await compte(page, '.gf input[name="url"]')) === 1 && (await compte(page, '.gf select[name="pour"] option')) === 5);
  await page.fill('.gf input[name="titre"]', 'Plan de feu');
  await page.tap('.gf [data-gf-seg="type"] button[data-val="plan"]');
  await page.setInputFiles('.gf input[type="file"]', { name: 'plan-de-feu.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF') });
  await page.tap('.gf button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.gf') && document.querySelectorAll('#contenu .puces-docs li[data-doc]').length === 3, null, { timeout: 10000 }).catch(() => {});
  const envoi = MODIFS.find(m => m.stockage && m.envoi);
  ok('le fichier part dans le stockage privé de l’équipe, sous le dossier du spectacle', !!envoi && envoi.stockage === 'crescite-equipe' && /^la-folle-idee\/[a-z0-9]+-plan-de-feu\.pdf$/.test(envoi.envoi), JSON.stringify(envoi));
  const ajout = MODIFS.find(m => m.table === 'crescite_documents' && m.post);
  ok('puis le document s’écrit (un plan, pour l’équipe, le spectacle de la date) et la page le liste', !!ajout && ajout.post[0].type === 'plan' && ajout.post[0].titre === 'Plan de feu' && ajout.post[0].pour === 'equipe' && ajout.post[0].spectacle_id === 2 && !!envoi && ajout.post[0].fichier === envoi.envoi && ajout.post[0].url === null && (await compte(page, '#contenu .puces-docs li[data-doc]')) === 3, JSON.stringify(ajout));
  // ---- la feuille de route lue : une ligne modifiée, la mise à jour depuis la base
  await page.goto(`${URL0}#/feuille/102`);
  await page.waitForSelector('.feuille-cadre [data-bloc="b4"]', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(500);
  ok('la feuille de route lue : chaque ligne porte l’identifiant de son bloc', (await compte(page, '.feuille-cadre [data-bloc]')) >= 6 && (await texte(page, '.feuille-cadre [data-bloc="b4"]')) === '14h : arrivée au Volcan', `${await compte(page, '.feuille-cadre [data-bloc]')} · ${await texte(page, '.feuille-cadre [data-bloc="b4"]')}`);
  await menuSur(page, '.feuille-cadre [data-bloc="b4"]', 'Modifier cette ligne…');
  const itemsLigne = await page.$$eval('.gm-feuille [data-gm]', xs => xs.map(x => x.querySelector('.gm-l').firstChild.textContent));
  ok('l’appui long sur une ligne : copier son texte ; la modifier, en ajouter une après, la retirer (le compte administre)', ['Copier le texte', 'Modifier cette ligne…', 'Ajouter une ligne après…', 'Retirer cette ligne'].every(x => itemsLigne.includes(x)), itemsLigne.join(' | '));
  await page.tap('.gm-feuille [data-gm]:has-text("Modifier cette ligne…")');
  await page.waitForSelector('.gf textarea[name="texte"]', { timeout: 3000 }).catch(() => {});
  ok('la feuille de modification reprend le texte de la ligne, sa nature, et dit la version que l’équipe verra', (await page.$eval('.gf textarea[name="texte"]', e => e.value).catch(() => '')) === '14h : arrivée au Volcan' && (await compte(page, '.gf [data-gf-seg="type"] button[aria-pressed="true"][data-val="ligne"]')) === 1 && /version 3/.test(await texte(page, '.gf-note')), `${await page.$eval('.gf textarea[name="texte"]', e => e.value).catch(() => '')} · ${await texte(page, '.gf-note')}`);
  await page.fill('.gf textarea[name="texte"]', '13h30 : arrivée au Volcan, entrée des artistes');
  await page.tap('.gf button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.gf') && /13h30 : arrivée au Volcan, entrée des artistes/.test(document.querySelector('.feuille-cadre')?.textContent || '') && /Version 3/.test(document.querySelector('.f-version')?.textContent || ''), null, { timeout: 10000 }).catch(() => {});
  const ecritF = MODIFS.filter(m => m.table === 'crescite_feuilles' && m.patch && m.patch.contenu), b4 = ecritF.length ? ecritF[ecritF.length - 1].patch.contenu.blocs.find(b => b.id === 'b4') : null;
  ok('Enregistrer écrit la feuille : la ligne a son texte, n’est plus « de la base » ; la page la relit, en version 3', !!b4 && b4.segments.map(s => s.texte).join('') === '13h30 : arrivée au Volcan, entrée des artistes' && !b4.source && /13h30 : arrivée au Volcan/.test(await texte(page, '.feuille-cadre')) && /Version 3/.test(await texte(page, '.f-version')), `${JSON.stringify(b4)} · ${await texte(page, '.f-version')}`);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
  await menuSur(page, '.vue-feuille .f-version', 'Mettre à jour depuis la base');
  const itemsFeuille = await page.$$eval('.gm-feuille [data-gm]', xs => xs.map(x => x.querySelector('.gm-l').firstChild.textContent));
  ok('l’appui long sur la feuille : le PDF, la date ; une ligne à la fin, la mise à jour depuis la base, l’administration, le brouillon', ['Télécharger le PDF', 'La date', 'Ajouter une ligne à la fin…', 'Mettre à jour depuis la base', 'Modifier dans l’administration', 'Repasser en brouillon'].every(x => itemsFeuille.includes(x)), itemsFeuille.join(' | '));
  await page.tap('.gm-feuille [data-gm]:has-text("Mettre à jour depuis la base")');
  await page.waitForFunction(() => /21h/.test(document.querySelector('.feuille-cadre')?.textContent || '') && /Version 4/.test(document.querySelector('.f-version')?.textContent || ''), null, { timeout: 15000 }).catch(() => {});
  const majF = MODIFS.filter(m => m.table === 'crescite_feuilles' && m.patch && m.patch.contenu).pop(), b5 = majF && majF.patch.contenu.blocs.find(b => b.id === 'b5'), b4b = majF && majF.patch.contenu.blocs.find(b => b.id === 'b4');
  ok('« Mettre à jour depuis la base » : la représentation passée à 21 h plus haut remplace la ligne composée ; la ligne écrite à la main ne change pas', !!b5 && /21h/.test(b5.segments.map(s => s.texte).join('')) && !!b4b && /13h30 : arrivée au Volcan, entrée des artistes/.test(b4b.segments.map(s => s.texte).join('')) && majF.patch.contenu.instantane.some(x => x.heure === '21:00') && /21h/.test(await texte(page, '.feuille-cadre')), `${b5 && b5.segments.map(s => s.texte).join('')} · ${await texte(page, '#annonces')}`);
  // ---- la feuille dans la liste : repassée en brouillon ; la date la publie de nouveau ; une date sans feuille la compose
  await page.goto(`${URL0}#/feuilles`);
  await page.waitForSelector('.feuille-item[data-date="102"]', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
  await menuSur(page, '.feuille-item[data-date="102"]', 'Repasser en brouillon');
  await page.tap('.gm-feuille [data-gm]:has-text("Repasser en brouillon")');
  await page.waitForFunction(() => !document.querySelector('.feuille-item[data-date="102"]'), null, { timeout: 10000 }).catch(() => {});
  ok('dans la liste, « Repasser en brouillon » (après confirmation) : la feuille n’est plus publiée, la liste la retire', MODIFS.some(m => m.table === 'crescite_feuilles' && m.patch && m.patch.statut === 'brouillon') && base.DB.crescite_feuilles.find(f => f.id === 7).statut === 'brouillon' && (await compte(page, '.feuille-item[data-date="102"]')) === 0);
  await page.goto(`${URL0}#/date/102`);
  await page.waitForSelector('.heros[data-date="102"]', { timeout: 10000 }).catch(() => {}); await page.waitForTimeout(500);
  await menuSur(page, '.heros[data-date="102"]', 'Feuille de route…', { dy: -30 });
  await page.tap('.gm-feuille [data-gm]:has-text("Feuille de route…")');
  await page.waitForSelector('.gf [data-gf-seg="maj"]', { timeout: 6000 }).catch(() => {});
  ok('sur la date dont la feuille est en brouillon, « Feuille de route… » propose de la publier, mise à jour ou telle quelle', (await texte(page, '.gf h2')) === 'Publier la feuille de route' && (await compte(page, '.gf [data-gf-seg="maj"] button')) === 2, await texte(page, '.gf h2'));
  await page.tap('.gf [data-gf-seg="maj"] button[data-val="telle"]');
  await page.tap('.gf button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.gf') && document.querySelector('#contenu a[href="#/feuille/102"], #contenu [data-pdf="102"]'), null, { timeout: 10000 }).catch(() => {});
  ok('Publier : la feuille est publiée de nouveau, la date la propose', base.DB.crescite_feuilles.find(f => f.id === 7).statut === 'publiee' && (await compte(page, '#contenu a[href="#/feuille/102"], #contenu [data-pdf="102"]')) >= 1);
  await page.goto(`${URL0}#/date/103`);
  await page.waitForSelector('.heros[data-date="103"]', { timeout: 10000 }).catch(() => {}); await page.waitForTimeout(500);
  await menuSur(page, '.heros[data-date="103"]', 'Feuille de route…', { dy: -30 });
  await page.tap('.gm-feuille [data-gm]:has-text("Feuille de route…")');
  await page.waitForSelector('.gf [data-gf-seg="statut"]', { timeout: 6000 }).catch(() => {});
  ok('sur une date sans feuille : « Composer la feuille de route », à publier ou à garder en brouillon', (await texte(page, '.gf h2')) === 'Composer la feuille de route' && (await compte(page, '.gf [data-gf-seg="statut"] button')) === 2, await texte(page, '.gf h2'));
  await page.tap('.gf button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.gf') && location.hash === '#/feuille/103' && document.querySelector('.feuille-cadre [data-bloc]'), null, { timeout: 15000 }).catch(() => {});
  const compo = MODIFS.find(m => m.table === 'crescite_feuilles' && m.post);
  ok('Composer : la feuille est composée depuis la base (blocs au format 2, l’instantané des horaires), publiée, et s’ouvre', !!compo && compo.post[0].date_id === 103 && compo.post[0].statut === 'publiee' && compo.post[0].contenu.format === 2 && compo.post[0].contenu.blocs.length > 5 && compo.post[0].contenu.instantane.length === 2 && (await page.evaluate(() => location.hash)) === '#/feuille/103' && (await compte(page, '.feuille-cadre [data-bloc]')) > 5, `${compo && compo.post[0].contenu.blocs.length} blocs · ${await page.evaluate(() => location.hash)} · ${await texte(page, '#annonces')}`);
  await page.waitForTimeout(400); await page.screenshot({ path: `${CAPT}/admin-feuille.png`, fullPage: false });
  ok('administrateur · erreurs de page : aucune', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

await navigateur.close();
bilan(CAPT);
