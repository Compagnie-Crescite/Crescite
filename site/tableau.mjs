// Le tableau de bord de l'administration (admin/index.html, admin/tableau.js), vérifié dans Chromium, hors ligne.
//   node site/tableau.mjs
// L'administration s'ouvre sur une base fictive : les lectures REST de Supabase sont simulées (une poignée de dates,
// personnes, lieux, devis, frais, propositions…), la session est posée dans le stockage du navigateur, le temps réel est
// coupé. Aucune donnée réelle, aucun appel à la base. À l'ordinateur (1 600 px), puis au téléphone ; chaque vérification
// dit ce qu'elle regarde ; les captures vont dans site/dist/shots-tableau/. Sort en erreur si une vérification
// manque. Demande Playwright et Chromium (PLAYWRIGHT_MODULE, CHROMIUM, comme onglets.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, ROOT, URL0, plus, ilYA, UID, DB, ECRITURES, MODIFS, ok, calme, ouvrir, texte, compte, tuile, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-tableau');

const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });

// ================================================================================ à l'ordinateur : la page d'ouverture
{
  const { ctx, page, erreurs } = await ouvrir(navigateur);
  await page.waitForSelector(`${tuile('journal')} .tb-l, ${tuile('journal')} .tb-rien:not([role])`, { timeout: 15000 }).catch(() => {});
  await page.waitForSelector(`${tuile('propositions')} .tb-l`, { timeout: 15000 }).catch(() => {});
  ok('l’administration s’ouvre sur le tableau de bord', await page.evaluate(() => location.hash) === '#/accueil' && (await texte(page, 'main h1')) === 'Tableau de bord', await page.evaluate(() => location.hash));
  // (le menu des rubriques se cherche par son nom, où qu'il soit : dans l'en-tête aujourd'hui, à côté du contenu plus tard)
  ok('la rubrique « Tableau de bord » est la rubrique courante, douze rubriques au moins dans le menu', (await texte(page, 'nav[aria-label="Rubriques"] a[aria-current="page"]')) === 'Tableau de bord' && (await compte(page, 'nav[aria-label="Rubriques"] a[href^="#/"]')) >= 12);
  const ordre = await page.$$eval('.tb-tuile', xs => xs.map(x => x.dataset.k));
  ok('les dix tuiles par défaut, dans l’ordre ; Spectacles et Mémo masquées', ordre.join(',') === 'actions,urgent,avant,prochaines,chiffres,equipe,diffusion,propositions,ateliers,journal', ordre.join(','));
  ok('les réglages des tuiles sont repliés ; le rouage les ouvre', await page.$$eval('.tb-reglages', xs => xs.every(x => getComputedStyle(x).display === 'none')) && (await compte(page, '[data-tb-reglages][aria-expanded="false"]')) >= 8);
  ok('dans une tuile étroite, le lien garde sa flèche et son infobulle, le titre entier', await page.$eval(`${tuile('avant')} .tb-lien`, e => getComputedStyle(e.querySelector('.mot')).display === 'none' && e.title === 'Ouvrir : Représentations') && await page.$eval(`${tuile('avant')} .tb-titre`, e => e.scrollWidth <= e.clientWidth + 1 && e.getBoundingClientRect().height < 40));
  ok('la tuile des actions prend toute la largeur, « À traiter » deux colonnes', await page.$eval(tuile('actions'), e => e.classList.contains('taille-g')) && await page.$eval(tuile('urgent'), e => e.classList.contains('taille-m')));
  // les actions rapides
  const actions = await page.$$eval(`${tuile('actions')} .tb-actions > *`, xs => xs.map(x => x.textContent.trim()));
  ok('actions rapides : les dix gestes par défaut, « Nouvelle date » en premier', actions.length === 10 && actions[0] === '＋ Nouvelle date' && actions.includes('＋ Proposer des dates') && actions.includes('＋ Inviter une salle') && actions.includes('＋ Opportunité de diffusion'), actions.join(' | '));
  // à traiter
  const cats = await page.$$eval(`${tuile('urgent')} .tb-cat`, xs => xs.map(x => [x.querySelector('h3 a').textContent.trim(), x.querySelectorAll('.tb-l').length]));
  const attendu = { 'Demandes de devis à répondre': 1, 'Relances de diffusion en retard': 1, 'Notes de frais à valider': 1, 'Options à confirmer': 1, 'Dates sans horaire': 1, 'Contrats à suivre': 2, 'Conflits d’équipe': 1, 'Feuilles de route à publier': 2, 'Propositions de dates en attente': 1, 'Invitations pro qui échoient': 1 };
  ok('« À traiter » : dix sujets (Jean indisponible le jour où il part), les bons comptes', JSON.stringify(Object.fromEntries(cats)) === JSON.stringify(attendu), JSON.stringify(cats));
  ok('« À traiter » : le badge fait le total (12)', (await texte(page, `${tuile('urgent')} .tb-badge`)) === '12', await texte(page, `${tuile('urgent')} .tb-badge`));
  const devis = await page.$eval(`${tuile('urgent')} .tb-cat:first-child .tb-l`, e => ({ href: e.getAttribute('href'), t: e.querySelector('.tb-l-t').textContent, d: e.querySelector('.tb-l-d').textContent }));
  ok('la demande de devis mène à sa fiche, dit depuis quand', devis.href === '#/diffusion/devis/1' && devis.t === 'Salle des fêtes de Lisieux' && /il y a 2 heures/.test(devis.d), JSON.stringify(devis));
  const option = await page.$eval(`${tuile('urgent')} a[href="#/representations/105"]`, e => ({ viser: e.dataset.viser, d: e.querySelector('.tb-l-d').textContent }));
  ok('l’option mène à la date, le bouton « Confirmée » visé, « dans 4 semaines »', option.viser === '[data-statut="confirmee"]' && /dans 4 semaines/.test(option.d), JSON.stringify(option));
  const contrats = await page.$$eval(`${tuile('urgent')} a[data-viser="#s-contrat"] .badge`, xs => xs.map(x => x.textContent));
  ok('contrats : « à envoyer » (Le Havre) et « contrat ? » (Paris) ; le signé n’y est pas', contrats.join('|') === 'contrat à envoyer|contrat ?', contrats.join('|'));
  const feuilles = await page.$$eval(`${tuile('urgent')} a[href^="#/feuilles/"]`, xs => xs.map(x => `${x.getAttribute('href')} ${x.dataset.viser} ${x.querySelector('.badge').textContent}`));
  ok('feuilles à publier : le brouillon de Caen (liste À compléter visée), celle du Havre à composer', feuilles.join('|') === '#/feuilles/101 #fr-manques brouillon|#/feuilles/102 #fr-composer à composer', feuilles.join('|'));
  // avant la tournée
  const avant = await page.$$eval(`${tuile('avant')} .tb-cat`, xs => xs.map(x => [x.querySelector('h3').firstChild.textContent.trim(), [...x.querySelectorAll('.tb-l')].map(l => l.querySelector('.tb-l-t').textContent)]));
  const jours = await page.evaluate(js => js.map(jourSansAn), [plus(9), plus(23), plus(50)]);
  ok('avant la tournée : Jean Durand sans téléphone, le lycée sans adresse, personne n’a de compte (donc pas prévenu), trois feuilles à composer (les répétitions aussi) ; badge 8', JSON.stringify(avant) === JSON.stringify([['Téléphones', ['Jean Durand']], ['Lieux', ['Lycée Voltaire, Paris']], ['Qui ne sera pas prévenu', ['Camille Essai', 'Jean Durand', 'Léa Martin']], ['Feuilles de route', [`${jours[0]} · Le Volcan, Le Havre`, `${jours[1]} · Lycée Voltaire, Paris`, `${jours[2]} · Théâtre de Caen, Caen`]]]) && (await texte(page, `${tuile('avant')} .tb-badge`)) === '8', JSON.stringify(avant));
  ok('le téléphone manquant vise le champ de la fiche', await page.$eval(`${tuile('avant')} a[href="#/equipe/2"]`, e => e.dataset.viser) === 'telephone');
  // prochaines dates
  const prochaines = await page.$$eval(`${tuile('prochaines')} .tb-l`, xs => xs.map(x => x.getAttribute('href').split('/').pop()));
  ok('prochaines dates : six, par ordre, options et répétitions comprises', prochaines.join(',') === '101,102,103,105,106,107', prochaines.join(','));
  ok('la date sans horaire dit « heure ? » ; la scolaire porte ses deux séances', /heure \?/.test(await texte(page, `${tuile('prochaines')} a[href="#/representations/102"]`)) && (await compte(page, `${tuile('prochaines')} a[href="#/representations/103"] .rep.sco`)) === 2);
  // la saison en chiffres
  const kpi = await page.$$eval(`${tuile('chiffres')} .tb-kpi > *`, xs => xs.map(x => `${x.querySelector('span').textContent}=${x.querySelector('b').textContent}${x.querySelector('small') ? ` (${x.querySelector('small').textContent})` : ''}`));
  ok('la saison en chiffres : 4 dates (1 jouée, 3 à venir), 5 représentations, 3 lieux dans 3 départements, 1 scolaire, 2 séances (4 h), 180 spectateurs', kpi.join(' | ') === 'Dates confirmées=4 (1 jouée, 3 à venir) | Représentations=5 | Lieux=3 (dans 3 départements) | Dates scolaires=1 | Séances d’atelier=2 (4 h d’éducation artistique) | Spectateurs=180 (sur 1 date renseignée)', kpi.join(' | '));
  ok('la saison en tête, avec son option et sa résidence', /Saison \d{4}-\d{4} · 1 option · 1 résidence/.test(await texte(page, `${tuile('chiffres')} .tb-saison`)), await texte(page, `${tuile('chiffres')} .tb-saison`));
  // qui part bientôt
  const equipe = await page.$$eval(`${tuile('equipe')} .tb-l`, xs => xs.map(x => `${x.querySelector('.tb-l-t').textContent}:${x.querySelector('.tb-l-d').textContent.trim()}`));
  ok('qui part bientôt : Camille (son téléphone), Jean (téléphone ?), Léa', equipe.join('|') === 'Camille Essai:06 12 34 56 78|Jean Durand:téléphone ?|Léa Martin:06 98 76 54 32', equipe.join('|'));
  ok('le téléphone s’appelle d’un geste (tel:)', await page.$eval(`${tuile('equipe')} .tb-tel`, e => e.dataset.tel) === 'tel:+33612345678', await page.$eval(`${tuile('equipe')} .tb-tel`, e => e.dataset.tel));
  // diffusion
  const dif = await page.$$eval(`${tuile('diffusion')} .tb-kpi > *`, xs => xs.map(x => `${x.querySelector('span').textContent}=${x.querySelector('b').textContent}${x.querySelector('small') ? ` (${x.querySelector('small').textContent})` : ''}`.replace(/[\u202f\u00a0]/g, ' ')));
  ok('diffusion : 3 dossiers actifs (1 relance en retard), 3 200 € en négociation, 4 500 € confirmés, 1 devis nouveau, 1 alerte confirmée (1 en attente)', dif.join(' | ') === 'Dossiers actifs=3 (1 relance en retard) | En négociation=3 200 € (montants estimés) | Cessions confirmées=4 500 € | Demandes de devis=1 (nouvelle, à répondre) | Alertes de tournée=1 (1 en attente de confirmation)', dif.join(' | '));
  ok('le pipeline en barre et sa légende', (await compte(page, `${tuile('diffusion')} .tb-pipe span`)) === 3 && /Contact pris 1/.test(await texte(page, `${tuile('diffusion')} .tb-legende`)));
  // propositions
  const prop = await texte(page, `${tuile('propositions')} .tb-l`);
  ok('propositions : la proposition ouverte, 2 personnes, ✓ 1 … 1, et « Proposer des dates »', /Option : Théâtre de Flers/.test(prop) && /2 personnes/.test(prop) && /✓ 1/.test(prop) && /… 1/.test(prop) && (await compte(page, `${tuile('propositions')} a[href="#/planning/proposer"]`)) === 1, prop);
  // ateliers
  const atel = await texte(page, `${tuile('ateliers')} .tb-corps`);
  ok('séances d’atelier : la séance dans 5 jours (2nde 3, 28 élèves, 10h–12h), 2 h au total ; celle dans 45 jours non', /Atelier de préparation/.test(atel) && /2nde 3 · Seconde · 28 élèves/.test(atel) && /10h–12h/.test(atel) && /1 séance · 2 h/.test(atel) && (await compte(page, `${tuile('ateliers')} .tb-l`)) === 1, atel);
  // journal
  const journal = await page.$$eval(`${tuile('journal')} .tb-l`, xs => xs.map(x => `${x.getAttribute('href')} ${x.querySelector('.tb-l-t').textContent}`));
  ok('dernières modifications : les lignes, chacune vers sa fiche', journal.slice(0, 3).join('|') === '#/representations/101 Modification · Date|#/feuilles/101 Ajout · Feuille de route|#/lieux/8 Ajout · Lieu' && journal.length === 4, journal.join('|'));
  ok('la modification dit son auteur et son âge', /il y a 10 min/.test(await texte(page, `${tuile('journal')} .tb-l:first-child .tb-l-d`)) && /Adrien/.test(await texte(page, `${tuile('journal')} .tb-l:first-child .tb-l-d`)));
  ok('la recherche rapide connaît la rubrique', await page.evaluate(() => indexRch().some(x => x.type === 'Rubrique' && x.href === '#/accueil')));
  await page.screenshot({ path: `${CAPT}/tableau.png`, fullPage: true });

  // ---- les gestes : le clic droit sur une ligne ouvre ses actions ; une action directe écrit dans la base
  await page.click(`${tuile('urgent')} a[data-devis="1"]`, { button: 'right' });
  await page.waitForSelector('.gm-boite[role="menu"]', { timeout: 3000 });
  const menuDevis = await page.$$eval('.gm-boite [data-gm]', xs => xs.map(x => x.querySelector('.gm-l').firstChild.textContent));
  ok('clic droit sur une demande de devis : ouvrir, écrire, les statuts à marquer, le lien', menuDevis.includes('Ouvrir la demande') && menuDevis.includes('Écrire à M. Dupont') && menuDevis.includes('Marquer « En cours »') && menuDevis.includes('Copier le lien'), menuDevis.join(' | '));
  ok('le premier élément du menu a le focus, le menu a un titre', await page.evaluate(() => document.activeElement?.matches('.gm-boite [data-gm]')) && (await page.$eval('.gm-boite', e => e.getAttribute('aria-label'))) === 'Salle des fêtes de Lisieux');
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${CAPT}/menu.png`, fullPage: false });
  await page.click('.gm-boite [data-gm]:has-text("Marquer « En cours »")');
  await page.waitForFunction(() => !document.querySelector('.gm-boite') && !document.querySelector('.tb-tuile[data-k="urgent"] a[data-devis="1"]'), null, { timeout: 4000 }).catch(() => {});
  ok('« Marquer En cours » écrit le statut dans la base et la demande quitte « À traiter » (badge 11)', MODIFS.some(m => m.table === 'crescite_devis_demandes' && m.body.statut === 'en_cours') && (await compte(page, `${tuile('urgent')} a[data-devis="1"]`)) === 0 && (await texte(page, `${tuile('urgent')} .tb-badge`)) === '11', JSON.stringify(MODIFS));
  await page.click(`${tuile('urgent')} a[data-frais="1"]`, { button: 'right' });
  await page.waitForSelector('.gm-boite [data-gm]:has-text("Valider")', { timeout: 3000 });
  await page.click('.gm-boite [data-gm]:has-text("Valider")');
  await page.waitForFunction(() => !document.querySelector('.tb-tuile[data-k="urgent"] a[data-frais="1"]'), null, { timeout: 4000 }).catch(() => {});
  ok('« Valider » une note de frais depuis son menu : écrite validée, sortie de la liste', MODIFS.some(m => m.table === 'crescite_notes_frais' && m.body.statut === 'valide' && m.body.valide_par === 'u-essai') && (await compte(page, `${tuile('urgent')} a[data-frais="1"]`)) === 0);
  // le clavier : Maj+F10 ouvre le menu de la ligne qui a le focus, Échap le ferme et rend le focus ; ↓ passe à la ligne d'après
  await page.focus(`${tuile('prochaines')} .tb-l:first-child`);
  await page.keyboard.press('Shift+F10');
  await page.waitForSelector('.gm-boite', { timeout: 3000 });
  const menuDate = await page.$$eval('.gm-boite [data-gm]', xs => xs.map(x => x.querySelector('.gm-l').firstChild.textContent));
  ok('Maj+F10 sur une date : ouvrir, feuille de route, prévenir, itinéraire, dupliquer, tableur, supprimer', ['Ouvrir la date', 'Feuille de route', 'Prévenir l’équipe…', 'Itinéraire', 'Dupliquer', 'Voir dans le tableur', 'Supprimer la date'].every(x => menuDate.includes(x)), menuDate.join(' | '));
  await page.keyboard.press('Escape');
  ok('Échap ferme le menu et rend le focus à la ligne', (await compte(page, '.gm-boite')) === 0 && await page.evaluate(() => document.activeElement?.matches('.tb-tuile[data-k="prochaines"] .tb-l:first-child')));
  await page.keyboard.press('ArrowDown');
  ok('↓ passe à la ligne suivante de la tuile', await page.evaluate(() => document.activeElement?.matches('.tb-tuile[data-k="prochaines"] .tb-l:nth-child(2)')));
  await page.keyboard.press('ArrowUp');
  ok('↑ revient', await page.evaluate(() => document.activeElement?.matches('.tb-tuile[data-k="prochaines"] .tb-l:first-child')));
  // le menu d'une tuile : la réduire
  await page.click(`${tuile('journal')} .tb-tete`, { button: 'right' });
  await page.waitForSelector('.gm-boite [data-gm]:has-text("Réduire")', { timeout: 3000 });
  await page.click('.gm-boite [data-gm]:has-text("Réduire")');
  ok('clic droit sur l’en-tête d’une tuile → « Réduire » la replie', await page.$eval(tuile('journal'), e => e.classList.contains('replie')));
  await page.click(`${tuile('journal')} .tb-tete`, { button: 'right' });
  await page.waitForSelector('.gm-boite', { timeout: 3000 });
  await page.click('.gm-boite [data-gm]:has-text("Déployer")');
  // une action rapide se retire de son menu
  await page.click(`${tuile('actions')} .tb-actions [data-action="tableur"]`, { button: 'right' });
  await page.waitForSelector('.gm-boite [data-gm]:has-text("Retirer des actions rapides")', { timeout: 3000 });
  await page.click('.gm-boite [data-gm]:has-text("Retirer des actions rapides")');
  ok('« Retirer des actions rapides » ôte le bouton', (await compte(page, `${tuile('actions')} .tb-actions [data-action="tableur"]`)) === 0 && (await compte(page, `${tuile('actions')} .tb-actions > *`)) === 9);
  await page.click(`${tuile('actions')} [data-tb-reglages]`);
  await page.check(`${tuile('actions')} input[data-tb-reg="actions"][value="tableur"]`);
  await page.click(`${tuile('actions')} [data-tb-reglages]`);

  // ---- précédent / suivant dans une fiche à côté de sa liste : Alt+↓
  await page.goto(`${URL0}#/representations/102`);
  await page.waitForSelector('#ed-date .titre-ed .gps', { timeout: 15000 });
  const gps = await page.$eval('#ed-date .titre-ed .gps', e => [...e.querySelectorAll('[data-gps]')].map(b => `${b.dataset.gps}:${b.disabled ? 'off' : b.dataset.href}:${b.title}`));
  ok('la fiche d’une date a « précédent / suivant », nommés d’après la liste', gps[0].startsWith('-1:#/representations/101:Précédent : Bérénice') && gps[1].startsWith('1:#/representations/103:Suivant : Bérénice') && /Alt\+↓/.test(gps[1]), gps.join(' | '));
  await page.keyboard.press('Alt+ArrowDown');
  await page.waitForFunction(() => location.hash === '#/representations/103', null, { timeout: 5000 }).catch(() => {});
  ok('Alt+↓ ouvre la date suivante', await page.evaluate(() => location.hash) === '#/representations/103', await page.evaluate(() => location.hash));
  await page.waitForSelector('#ed-date .titre-ed .gps', { timeout: 5000 });
  await page.click('#ed-date .titre-ed [data-gps="-1"]');
  await page.waitForFunction(() => location.hash === '#/representations/102', null, { timeout: 5000 }).catch(() => {});
  ok('le bouton « précédent » revient', await page.evaluate(() => location.hash) === '#/representations/102');

  // ---- le Kanban : les flèches disent leur étape ; une carte se glisse d'une colonne à l'autre
  await page.goto(`${URL0}#/diffusion`);
  await page.waitForSelector('.crm-carte[data-prospect-id="3"]', { timeout: 15000 });
  ok('les flèches d’une carte nomment l’étape visée', (await page.$eval('.crm-carte[data-prospect-id="3"] [data-crm-deplacer="1"]', e => e.title)) === 'Étape suivante : 2. Dossier / Devis');
  await page.dragAndDrop('.crm-carte[data-prospect-id="3"] .crm-carte-structure', '.crm-colonne[data-colonne="option_discutee"] .crm-col-tete');
  await page.waitForFunction(() => document.querySelector('.crm-colonne[data-colonne="option_discutee"] .crm-carte[data-prospect-id="3"]'), null, { timeout: 5000 }).catch(() => {});
  ok('la carte glissée change de colonne, l’étape est écrite', (await compte(page, '.crm-colonne[data-colonne="option_discutee"] .crm-carte[data-prospect-id="3"]')) === 1 && MODIFS.some(m => m.table === 'crescite_diffusion_prospects' && m.body.etape === 'option_discutee'), JSON.stringify(MODIFS.filter(m => m.table === 'crescite_diffusion_prospects')));
  await page.click('.crm-carte[data-prospect-id="1"]', { button: 'right' });
  await page.waitForSelector('.gm-boite [data-gm]:has-text("Relance faite aujourd’hui")', { timeout: 3000 });
  await page.click('.gm-boite [data-gm]:has-text("Relance faite aujourd’hui")');
  await page.waitForTimeout(300);
  ok('« Relance faite aujourd’hui » note la relance et la prochaine dans 7 jours', MODIFS.some(m => m.table === 'crescite_diffusion_prospects' && m.body.date_dernier_contact === plus(0) && m.body.date_prochaine_relance === plus(7)) && !(await page.$eval('.crm-carte[data-prospect-id="1"] .crm-carte-relance', e => e.classList.contains('retard'))));
  await page.goto(`${URL0}#/accueil`);
  await page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });

  // ---- un lien vise le champ : l'option s'ouvre, le bouton « Confirmée » a le focus
  await page.click(`${tuile('urgent')} a[href="#/representations/105"]`);
  await page.waitForFunction(() => document.querySelector('.tiroir.la #ed-date [data-statut="confirmee"]'), null, { timeout: 8000 });
  await page.waitForTimeout(150);
  ok('la ligne ouvre la date en tiroir, sans quitter le tableau, le focus sur « Confirmée »', await page.evaluate(() => location.hash === '#/accueil' && document.activeElement?.dataset?.statut === 'confirmee' && !!document.querySelector('.tiroir [data-tiroir-pleine][href="#/representations/105"]')), await page.evaluate(() => `${location.hash} ${document.activeElement?.outerHTML.slice(0, 80)}`));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.tiroir'), null, { timeout: 3000 }).catch(() => {});
  ok('la marque ramène au tableau de bord', await page.$eval('.marque', e => e.getAttribute('href')) === '#/accueil');
  await page.goto(`${URL0}#/accueil`);
  await page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });

  // ---- personnaliser
  await page.click('#tb-personnaliser');
  ok('« Personnaliser » : le panneau, les tuiles masquées à remettre, la grille en édition', !(await page.$eval('#tb-panneau', e => e.hidden)) && (await page.$$eval('[data-tb-montrer]', xs => xs.map(x => x.dataset.tbMontrer))).join(',') === 'spectacles,memo' && await page.$eval('#tb-grille', e => e.classList.contains('edition')));
  await page.click('[data-tb-montrer="memo"]');
  ok('« ＋ Mémo » affiche la tuile du mémo (à la fin)', (await page.$$eval('.tb-tuile', xs => xs.map(x => x.dataset.k))).pop() === 'memo');
  await page.click(`${tuile('urgent')} [data-tb-deplacer="1"]`);
  const apres = await page.$$eval('.tb-tuile', xs => xs.map(x => x.dataset.k)).then(xs => xs.slice(0, 4).join(','));
  ok('→ recule « À traiter » derrière « Avant la tournée » ; le focus reste sur la flèche', apres === 'actions,avant,urgent,prochaines' && await page.evaluate(() => document.activeElement?.closest('.tb-tuile')?.dataset.k === 'urgent' && document.activeElement.dataset.tbDeplacer === '1'), apres);
  await page.click(`${tuile('prochaines')} [data-tb-taille="m"]`);
  ok('la taille « 2 » élargit « Prochaines dates »', await page.$eval(tuile('prochaines'), e => e.classList.contains('taille-m') && !e.classList.contains('taille-p')));
  await page.click(`${tuile('ateliers')} [data-tb-masquer]`);
  ok('la croix masque « Séances d’atelier », qui rejoint les tuiles masquées', (await compte(page, tuile('ateliers'))) === 0 && (await compte(page, '[data-tb-montrer="ateliers"]')) === 1);
  await page.click('[data-tb-colonnes="3"]');
  await page.click('[data-tb-depart="representations"]');
  ok('trois colonnes ; l’ouverture sur Représentations', await page.$eval('#tb-grille', e => e.dataset.colonnes === '3') && await page.$eval('[data-tb-depart="representations"]', e => e.getAttribute('aria-pressed') === 'true'));
  // glisser-déposer : « La saison en chiffres » posée avant « Actions rapides »
  // (la source et la cible dans la fenêtre : Playwright fait défiler la cible en vue avant que le glissement ne commence)
  await page.setViewportSize({ width: 1600, height: 2400 });
  await page.dragAndDrop(`${tuile('chiffres')} .tb-tete`, `${tuile('actions')} .tb-tete`, { targetPosition: { x: 20, y: 10 } });
  await page.setViewportSize({ width: 1600, height: 1000 });
  const glisse = await page.$$eval('.tb-tuile', xs => xs.map(x => x.dataset.k)).then(xs => xs.slice(0, 2).join(','));
  ok('glisser une tuile par son titre la déplace (chiffres avant actions)', glisse === 'chiffres,actions', glisse);
  await page.screenshot({ path: `${CAPT}/personnaliser.png`, fullPage: true });
  await page.click('#tb-fini');
  ok('« Terminer » referme la personnalisation', await page.$eval('#tb-panneau', e => e.hidden) && !(await page.$eval('#tb-grille', e => e.classList.contains('edition'))));
  // les réglages d'une tuile
  await page.click(`${tuile('prochaines')} [data-tb-reglages]`);
  await page.selectOption(`${tuile('prochaines')} select[data-tb-reg="n"]`, '5');
  ok('réglage « 5 dates » : la tuile se redessine aussitôt, « Et une autre »', (await compte(page, `${tuile('prochaines')} .tb-l`)) === 5 && /Et une autre/.test(await texte(page, `${tuile('prochaines')} .tb-plus`)));
  await page.uncheck(`${tuile('prochaines')} input[data-tb-reg="options"]`);
  ok('sans les options, la date de Flers quitte la liste', (await compte(page, `${tuile('prochaines')} a[href="#/representations/105"]`)) === 0);
  await page.click(`${tuile('avant')} [data-tb-reglages]`);
  await page.selectOption(`${tuile('avant')} select[data-tb-reg="jours"]`, '30');
  ok('réglage « 30 prochains jours » : la répétition dans 50 jours sort, badge 7', (await texte(page, `${tuile('avant')} .tb-badge`)) === '7', await texte(page, `${tuile('avant')} .tb-badge`));
  await page.click(`${tuile('urgent')} [data-tb-reglages]`);
  await page.uncheck(`${tuile('urgent')} input[data-tb-reg="categories"][value="contrats"]`);
  ok('« À traiter » sans les contrats : badge 7 (le devis, la note de frais et la relance traités, les deux contrats écartés, le conflit reste), le sujet disparaît', (await texte(page, `${tuile('urgent')} .tb-badge`)) === '7' && (await compte(page, `${tuile('urgent')} a[data-viser="#s-contrat"]`)) === 0, await texte(page, `${tuile('urgent')} .tb-badge`));
  // le mémo
  await page.fill(`${tuile('memo')} .tb-memo`, 'Rappeler le Volcan lundi');
  await page.waitForFunction(() => document.querySelector('.tb-memo-etat')?.textContent === 'Enregistré', null, { timeout: 6000 }).catch(() => {});
  ok('le mémo s’enregistre en écrivant', (await texte(page, `${tuile('memo')} .tb-memo-etat`)) === 'Enregistré', await texte(page, `${tuile('memo')} .tb-memo-etat`));
  await page.click(`${tuile('journal')} [data-tb-replier]`);
  ok('le chevron réduit la tuile', await page.$eval(tuile('journal'), e => e.classList.contains('replie') && getComputedStyle(e.querySelector('.tb-corps')).display === 'none'));
  // le temps réel : la grille se redessine sans rien casser, le mémo ouvert n'est pas touché
  await page.focus(`${tuile('memo')} .tb-memo`);
  await page.evaluate(() => rafraichirListes());
  await page.waitForTimeout(100);
  ok('rafraîchir la grille garde le mémo en cours d’écriture', (await page.$eval(`${tuile('memo')} .tb-memo`, e => e.value)) === 'Rappeler le Volcan lundi' && (await compte(page, '.tb-tuile')) === 10);
  await page.waitForTimeout(900);
  await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
  const derniere = ECRITURES[ECRITURES.length - 1];
  ok('la disposition est écrite dans crescite_preferences (clé accueil.tableau), avec le mémo, l’ordre, la taille, les réglages', derniere && derniere.cle === 'accueil.tableau' && derniere.user_id === UID
    && derniere.valeur.colonnes === '3' && derniere.valeur.depart === 'representations' && derniere.valeur.tuiles.find(t => t.k === 'memo').reglages.texte === 'Rappeler le Volcan lundi'
    && derniere.valeur.tuiles.find(t => t.k === 'ateliers').visible === false && derniere.valeur.tuiles.find(t => t.k === 'prochaines').taille === 'm' && derniere.valeur.tuiles.find(t => t.k === 'prochaines').reglages.n === 5
    && derniere.valeur.tuiles.find(t => t.k === 'journal').replie === true && derniere.valeur.tuiles.map(t => t.k).slice(0, 3).join(',') === 'chiffres,actions,avant', JSON.stringify(derniere?.valeur).slice(0, 400));
  ok('aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ une autre session : la disposition revient de la base
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1400, hauteur: 900 });
  await page.waitForSelector('main h1', { timeout: 15000 });
  ok('l’ouverture choisie : Représentations', await page.evaluate(() => location.hash) === '#/representations' && (await texte(page, 'main h1')) === 'Représentations', await page.evaluate(() => location.hash));
  await page.click('.nav a[href="#/accueil"]');
  await page.waitForSelector('.tb-tuile', { timeout: 15000 });
  const ordre = await page.$$eval('.tb-tuile', xs => xs.map(x => `${x.dataset.k}${x.classList.contains('taille-m') ? '*' : ''}${x.classList.contains('replie') ? '-' : ''}`));
  ok('la disposition du compte revient : ordre, tailles, tuile réduite, atelier masqué, trois colonnes', ordre.join(',') === 'chiffres,actions,avant,urgent*,prochaines*,equipe,diffusion,propositions,journal-,memo' && await page.$eval('#tb-grille', e => e.dataset.colonnes === '3'), ordre.join(','));
  ok('le mémo aussi', (await page.$eval(`${tuile('memo')} .tb-memo`, e => e.value)) === 'Rappeler le Volcan lundi');
  ok('les réglages aussi (5 dates, sans les options ; sans les contrats)', (await compte(page, `${tuile('prochaines')} .tb-l`)) === 5 && (await compte(page, `${tuile('prochaines')} a[href="#/representations/105"]`)) === 0 && (await texte(page, `${tuile('urgent')} .tb-badge`)) === '7', await texte(page, `${tuile('urgent')} .tb-badge`));
  await page.click('#tb-personnaliser');
  let natifsReinit = 0;
  page.on('dialog', d => { natifsReinit++; d.dismiss().catch(() => {}); });
  await page.click('#tb-reinit');
  await page.waitForTimeout(200);
  const defaut = await page.$$eval('.tb-tuile', xs => xs.map(x => x.dataset.k));
  ok('« Réinitialiser » remet la disposition d’origine, tout de suite, sans « Êtes-vous sûr ? »', natifsReinit === 0 && defaut.join(',') === 'actions,urgent,avant,prochaines,chiffres,equipe,diffusion,propositions,ateliers,journal' && await page.$eval('#tb-grille', e => e.dataset.colonnes === 'auto'), defaut.join(','));
  // l'annonce porte « Annuler » : la disposition d'avant revient, tuiles, tailles, colonnes et mémo
  ok('« Réinitialiser » : l’annonce porte « Annuler »', /Disposition d’origine remise/.test(await texte(page, '.annonce:last-of-type')) && (await compte(page, '.annonce:last-of-type [data-tt="retour"]')) === 1, await texte(page, '.annonce:last-of-type'));
  await page.click('.annonce:last-of-type [data-tt="retour"]');
  await page.waitForTimeout(250);
  const revenue = await page.$$eval('.tb-tuile', xs => xs.map(x => `${x.dataset.k}${x.classList.contains('taille-m') ? '*' : ''}${x.classList.contains('replie') ? '-' : ''}`));
  ok('« Annuler » remet la disposition d’avant, et le mémo', revenue.join(',') === 'chiffres,actions,avant,urgent*,prochaines*,equipe,diffusion,propositions,journal-,memo' && await page.$eval('#tb-grille', e => e.dataset.colonnes === '3') && (await page.$eval(`${tuile('memo')} .tb-memo`, e => e.value).catch(() => '')) === 'Rappeler le Volcan lundi', revenue.join(','));
  ok('aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ sans le script 6 : la disposition reste sur l'appareil
{
  DB.crescite_preferences = [];
  const { ctx, page, erreurs } = await ouvrir(navigateur, { prefsAbsentes: true });
  await page.waitForSelector('.tb-tuile', { timeout: 15000 });
  await page.click('#tb-personnaliser');
  await page.click(`${tuile('equipe')} [data-tb-masquer]`);
  ok('sans crescite_preferences, le panneau le dit : gardée sur cet appareil', /gardée sur cet appareil/.test(await texte(page, '#tb-panneau .aide')), await texte(page, '#tb-panneau .aide'));
  await page.waitForTimeout(1200);
  const local = await page.evaluate(() => JSON.parse(localStorage.getItem('crescite-prefs:u-essai') || 'null')?.valeurs?.['accueil.tableau'] || null);
  ok('la disposition est dans le stockage de l’appareil', local && local.tuiles.find(t => t.k === 'equipe').visible === false && await page.evaluate(() => localStorage.getItem('crescite-admin-tableau') === null), JSON.stringify(local).slice(0, 120));
  await page.reload();
  await page.waitForSelector('.tb-tuile', { timeout: 15000 });
  ok('et revient au rechargement', (await compte(page, tuile('equipe'))) === 0 && (await compte(page, '.tb-tuile')) === 9);
  ok('aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ au téléphone et en sombre
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 390, hauteur: 844, hash: '#/accueil' });
  await page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  const colonnes = await page.$eval('#tb-grille', e => getComputedStyle(e).gridTemplateColumns.split(' ').length);
  ok('au téléphone : une colonne, rien ne déborde', colonnes === 1 && await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${colonnes} colonne(s), ${await page.evaluate(() => `${document.documentElement.scrollWidth}/${window.innerWidth}`)}`);
  await page.screenshot({ path: `${CAPT}/telephone.png`, fullPage: false });
  // l'appui long sur une ligne : une feuille d'actions depuis le bas, qui se ferme en touchant le voile
  const ligne = await page.$(`${tuile('urgent')} a[data-devis="2"], ${tuile('urgent')} a[data-frais], ${tuile('urgent')} a.tb-l`);
  await ligne.scrollIntoViewIfNeeded();
  const r = await ligne.boundingBox();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x + 40, y: r.y + r.height / 2 }] });
  await page.waitForTimeout(650);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await page.waitForSelector('.gm.gm-feuille .gm-boite', { timeout: 3000 }).catch(() => {});
  ok('au téléphone, l’appui long ouvre une feuille d’actions depuis le bas, avec le titre', (await compte(page, '.gm.gm-feuille .gm-boite[role="menu"]')) === 1 && (await compte(page, '.gm-feuille .gm-titre')) === 1 && (await compte(page, '.gm-feuille [data-gm]')) >= 2, await page.evaluate(() => location.hash));
  await page.screenshot({ path: `${CAPT}/telephone-menu.png`, fullPage: false });
  ok('la page n’a pas bougé (le clic qui suit l’appui est avalé)', await page.evaluate(() => location.hash) === '#/accueil');
  await page.click('.gm-feuille .gm-voile', { position: { x: 10, y: 10 } });
  ok('toucher le voile ferme la feuille', (await compte(page, '.gm-boite')) === 0);
  // l'en-tête arrimé tient sur une ligne (il en prenait trois, 126 px) : la marque, le direct, la loupe ; le compte passe
  // dans « Plus », dont les rubriques, sur deux colonnes, tiennent dans l'écran, celle où l'on est marquée
  const tete = await page.evaluate(() => { const b = document.querySelector('.barre'), m = b.querySelector('.marque').getBoundingClientRect(), c = b.querySelector('.chercher').getBoundingClientRect();
    return { h: Math.round(b.getBoundingClientRect().height), uneLigne: Math.abs((m.top + m.bottom) / 2 - (c.top + c.bottom) / 2) < 4, loupe: [Math.round(c.width), Math.round(c.height)], compte: getComputedStyle(b.querySelector('#b-sortir')).display }; });
  ok('au téléphone, l’en-tête sur une ligne (64 px au plus), la loupe de 44 px, le compte ôté de l’en-tête', tete.h <= 64 && tete.uneLigne && tete.loupe[0] >= 44 && tete.loupe[1] >= 44 && tete.compte === 'none', JSON.stringify(tete));
  const plusVue = async () => { await page.click('.ob-barre [data-ob="plus"]'); await page.waitForSelector('.ob-voile.la .ob-feuille', { timeout: 3000 }); await page.waitForTimeout(300);
    return page.evaluate(() => { const f = document.querySelector('.ob-feuille'), it = [...f.querySelectorAll('.ob-item')], fermer = f.querySelector('.ob-fermer').getBoundingClientRect();
      return { items: it.map(x => x.textContent.trim().split('\n')[0].replace(/\s+/g, ' ')), courant: it.filter(x => x.getAttribute('aria-current') === 'page').map(x => x.textContent.trim()), focus: document.activeElement?.textContent.trim(),
        enVue: fermer.bottom <= innerHeight + 1 && f.scrollHeight <= f.clientHeight + 1, cible: Math.min(...it.map(x => x.getBoundingClientRect().height)) }; }); };
  let plus = await plusVue();
  await page.screenshot({ path: `${CAPT}/telephone-plus.png`, fullPage: false });
  ok('« Plus » : les rubriques sur deux colonnes, puis le compte (voir le site, le modifier, le mot de passe, la déconnexion), tout en vue', ['Feuilles de route', 'Spectacles', 'Lieux', 'Textes du site', 'Journal', 'Voir le site ↗', 'Mot de passe', 'Se déconnecter'].every(x => plus.items.includes(x)) && plus.enVue && plus.cible >= 44 && !plus.courant.length, JSON.stringify(plus));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#/textes'; }); await page.waitForTimeout(800);
  plus = await plusVue();
  ok('depuis « Textes du site », « Plus » la marque comme la rubrique courante, et le focus s’y pose', plus.courant.join() === 'Textes du site' && plus.focus === 'Textes du site', JSON.stringify(plus));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.setViewportSize({ width: 360, height: 800 });
  plus = await plusVue();
  await page.screenshot({ path: `${CAPT}/telephone-plus-360.png`, fullPage: false });
  ok('à 360 × 800, « Plus » tient dans l’écran sans défiler, « Fermer » compris', plus.enVue && !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), JSON.stringify(plus));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  ok('aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
  const s = await ouvrir(navigateur, { sombre: true, hash: '#/accueil' });
  await s.page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  ok('en sombre : le fond des tuiles suit le thème', (await s.page.$eval('.tb-tuile', e => getComputedStyle(e).backgroundColor)) === 'rgb(46, 33, 40)', await s.page.$eval('.tb-tuile', e => getComputedStyle(e).backgroundColor));
  await s.page.screenshot({ path: `${CAPT}/sombre.png`, fullPage: false });
  await s.ctx.close();
  // la nuit par défaut : l'appareil réglé en clair n'y change rien ; data-theme="jour" seul rend le jour
  const c = await ouvrir(navigateur, { sombre: false, hash: '#/accueil' });
  await c.page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  const fondTuile = () => c.page.$eval('.tb-tuile', e => getComputedStyle(e).backgroundColor);
  ok('appareil en clair : la nuit quand même (data-theme="nuit", les tuiles de nuit)', (await c.page.evaluate(() => document.documentElement.dataset.theme)) === 'nuit' && (await fondTuile()) === 'rgb(46, 33, 40)', await fondTuile());
  await c.page.evaluate(() => { document.documentElement.dataset.theme = 'jour'; });
  ok('data-theme="jour" : le jour (les tuiles claires)', (await fondTuile()) === 'rgb(255, 253, 249)', await fondTuile());
  await c.ctx.close();
}

// ================================================================================ l'habillage : des captures de plusieurs pages, en clair et en sombre
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900 });
  await page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  ok('le bandeau du jour : bonjour, le prénom, trois chiffres, le titre de la page', /Bonjour|Bonsoir/.test(await texte(page, '.tb-bonjour')) && /Adrien/.test(await texte(page, '.tb-bonjour')) && (await compte(page, '.tb-salut-chiffres li')) === 3 && (await texte(page, 'main h1')) === 'Tableau de bord', await texte(page, '.tb-salut'));
  ok('chaque tuile a son icône et sa couleur', (await compte(page, '.tb-tuile .tb-ico-t svg')) >= 10 && await page.$eval(tuile('urgent'), e => getComputedStyle(e).borderTopColor !== getComputedStyle(document.querySelector('.tb-tuile[data-k="prochaines"]')).borderTopColor));
  ok('l’en-tête est de nuit, la rubrique courante à la couleur de la saison', await page.$eval('.barre', e => getComputedStyle(e).backgroundImage !== 'none') && await page.$eval('.nav a[aria-current="page"]', e => getComputedStyle(e).color === 'rgb(255, 255, 255)'));
  await calme(page); await page.screenshot({ path: `${CAPT}/habillage-tableau.png`, fullPage: false });
  for (const [h, nom, attendre] of [['#/representations', 'representations', '.ligne'], ['#/representations/101', 'date', '#ed-date'], ['#/equipe', 'equipe', '.ligne, .bloc'], ['#/diffusion', 'diffusion', '.crm-colonne'], ['#/feuilles', 'feuilles', '.ligne, .bloc'], ['#/planning', 'planning', '.pl, .bloc'], ['#/journal', 'journal', '.journal-ligne, .vide']]) {
    await page.goto(`${URL0}${h}`);
    await page.waitForSelector(attendre, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(700);
    await calme(page); await page.screenshot({ path: `${CAPT}/habillage-${nom}.png`, fullPage: false });
  }
  await page.goto(`${URL0}#/accueil`); await page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  await page.keyboard.press('Control+k'); await page.waitForSelector('#recherche[open]', { timeout: 3000 }); await page.fill('#rch-q', 'bérénice'); await page.waitForTimeout(200);
  await page.screenshot({ path: `${CAPT}/habillage-recherche.png`, fullPage: false });
  await page.keyboard.press('Escape');
  ok('habillage · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
  const s2 = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, sombre: true });
  await s2.page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  await calme(s2.page); await s2.page.screenshot({ path: `${CAPT}/habillage-sombre.png`, fullPage: false });
  await s2.page.goto(`${URL0}#/representations/101`); await s2.page.waitForSelector('#ed-date', { timeout: 15000 }).catch(() => {}); await s2.page.waitForTimeout(600);
  await calme(s2.page); await s2.page.screenshot({ path: `${CAPT}/habillage-date-sombre.png`, fullPage: false });
  ok('habillage sombre · aucune erreur de script', s2.erreurs.length === 0, s2.erreurs.join(' / '));
  await s2.ctx.close();
}

// ================================================================================ les dix idées : traiter sur place, la file, la palette, les vues,
// les urgences, les tuiles qui se parlent, les chiffres, glisser-déposer, le fil, le briefing
{
  const { ctx, page, erreurs } = await ouvrir(navigateur);
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  page.on('dialog', d => d.accept());
  await page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  await page.waitForSelector(`${tuile('propositions')} .tb-l`, { timeout: 15000 }).catch(() => {});
  // 1. traiter sans quitter le tableau : l'option de Flers (105) se confirme sur place
  ok('1 · chaque ligne à traiter porte sa clé et son éclair « Traiter »', (await compte(page, `${tuile('urgent')} [data-traiter]`)) >= 6 && (await compte(page, `${tuile('urgent')} a.tb-l[data-cle="options:105"]`)) === 1, String(await compte(page, `${tuile('urgent')} [data-traiter]`)));
  await page.click(`${tuile('urgent')} [data-traiter="options:105"]`);
  await page.waitForSelector('.gf [data-gf-seg="statut"]', { timeout: 5000 }).catch(() => {});
  ok('1 · l’éclair ouvre « Confirmer la date ? » sur place, le tableau reste derrière', (await texte(page, '.gf h2')) === 'Confirmer la date ?' && await page.evaluate(() => location.hash) === '#/accueil', await texte(page, '.gf h2'));
  const n1 = MODIFS.length;
  await page.click('.gf button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.gf') && !document.querySelector('.tb-tuile[data-k="urgent"] a.tb-l[data-cle="options:105"]'), null, { timeout: 10000 }).catch(() => {});
  ok('1 · Enregistrer écrit « confirmée », l’état se relit, la date quitte « Options à confirmer »', MODIFS.slice(n1).some(m => m.table === 'crescite_dates' && m.body && m.body.statut === 'confirmee' && m.n === 1) && (await compte(page, `${tuile('urgent')} a.tb-l[data-cle="options:105"]`)) === 0, JSON.stringify(MODIFS.slice(n1)));
  // 2. la file au clavier
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('j');
  const cle1 = await page.evaluate(() => document.activeElement?.dataset?.cle || '');
  await page.keyboard.press('j');
  const cle2 = await page.evaluate(() => document.activeElement?.dataset?.cle || '');
  ok('2 · J parcourt les lignes à traiter, le focus de ligne en ligne', !!cle1 && !!cle2 && cle1 !== cle2 && await page.evaluate(() => document.activeElement?.matches('.tb-tuile[data-k="urgent"] a.tb-l')), `${cle1} → ${cle2}`);
  await page.keyboard.press('k');
  ok('2 · K remonte', await page.evaluate(() => document.activeElement?.dataset?.cle) === cle1);
  await page.keyboard.press('Enter');
  await page.waitForSelector('.gf [role="dialog"]', { timeout: 5000 }).catch(() => {});
  ok('2 · Entrée ouvre la feuille de traitement de la ligne, sans quitter le tableau', (await compte(page, '.gf [role="dialog"]')) === 1 && await page.evaluate(() => location.hash) === '#/accueil', await page.evaluate(() => location.hash));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.gf'), null, { timeout: 3000 }).catch(() => {});
  ok('2 · Échap la referme et rend le focus à la ligne', (await compte(page, '.gf')) === 0 && await page.evaluate(() => document.activeElement?.dataset?.cle) === cle1, await page.evaluate(() => document.activeElement?.outerHTML?.slice(0, 80)));
  // 5. les urgences : épingler, reporter, l'ordre par urgence
  await page.click(`${tuile('urgent')} a.tb-l[data-cle="heures:105"]`, { button: 'right' });
  await page.waitForSelector('.gm-boite [data-gm]', { timeout: 3000 }).catch(() => {});
  const itemsU = await page.$$eval('.gm-boite [data-gm]', xs => xs.map(x => x.querySelector('.gm-l')?.firstChild?.textContent || x.textContent.trim()));
  ok('5 · le clic droit d’une ligne : Traiter…, Épingler en haut, Me le rappeler demain, lundi, dans une semaine', ['Traiter…', 'Épingler en haut', 'Me le rappeler demain', 'Me le rappeler lundi', 'Me le rappeler dans une semaine'].every(x => itemsU.includes(x)), itemsU.join(' | '));
  await page.click('.gm-boite [data-gm]:has-text("Épingler en haut")');
  await page.waitForTimeout(300);
  ok('5 · épinglée, la ligne passe en tête de son sujet, marquée', await page.$eval(`${tuile('urgent')} a.tb-l[data-cle="heures:105"]`, a => a.closest('.tb-lt').classList.contains('epingle') && a.closest('.tb-cat').querySelector('.tb-lt') === a.closest('.tb-lt')).catch(() => false));
  await page.evaluate(() => TABLEAU.reporter('heures:105', new Date(Date.now() + 86400e3).toISOString().slice(0, 10)));
  await page.waitForTimeout(300);
  ok('5 · reportée à demain, la ligne se cache ; « Montrer 1 ligne reportée »', (await compte(page, `${tuile('urgent')} a.tb-l[data-cle="heures:105"]`)) === 0 && /1 ligne reportée/.test(await texte(page, `${tuile('urgent')} [data-tb-reportees]`)), await texte(page, `${tuile('urgent')} [data-tb-reportees]`));
  await page.click(`${tuile('urgent')} [data-tb-reportees]`);
  await page.waitForTimeout(200);
  ok('5 · montrée, la ligne reportée dit jusqu’à quand', (await compte(page, `${tuile('urgent')} .tb-lt.reportee a.tb-l[data-cle="heures:105"]`)) === 1 && /reportée au/.test(await texte(page, `${tuile('urgent')} .tb-lt.reportee`)));
  await page.evaluate(() => TABLEAU.reporter('heures:105', null));
  await page.click(`${tuile('urgent')} [data-tb-reglages]`);
  await page.selectOption(`${tuile('urgent')} select[data-tb-reg="ordre"]`, 'urgence');
  await page.waitForTimeout(300);
  ok('5 · « Par urgence » : une seule liste pondérée (échéance, coût du retard), chaque ligne avec son sujet, l’épinglée en tête', (await compte(page, `${tuile('urgent')} .tb-cat-plate`)) === 1 && (await compte(page, `${tuile('urgent')} .tb-cat-tag`)) >= 6 && await page.$eval(`${tuile('urgent')} .tb-cat-plate .tb-lt`, e => e.classList.contains('epingle')), String(await compte(page, `${tuile('urgent')} .tb-cat-tag`)));
  await page.selectOption(`${tuile('urgent')} select[data-tb-reg="ordre"]`, 'sujet');
  await page.click(`${tuile('urgent')} [data-tb-reglages]`);
  await page.waitForTimeout(1300);
  const pref5 = DB.crescite_preferences.find(x => x.cle === 'accueil.tableau')?.valeur || {};
  ok('5 · l’épingle est gardée avec la disposition du compte', Array.isArray(pref5.urgent?.epingles) && pref5.urgent.epingles.includes('heures:105'), JSON.stringify(pref5.urgent));
  // 3. la barre de commande
  await page.keyboard.press('Control+k');
  await page.waitForSelector('#recherche[open]', { timeout: 3000 });
  const premier = async () => [await texte(page, '#rch-liste [role=option]:first-child .rch-type'), await texte(page, '#rch-liste [role=option]:first-child b')];
  await page.fill('#rch-q', 'frais camille'); await page.waitForTimeout(150);
  let r3 = await premier();
  ok('3 · « frais camille » : la note de frais de Camille, en tête', r3[0] === 'Frais' && /Camille/.test(r3[1]), r3.join(' · '));
  await page.fill('#rch-q', 'lieu volcan'); await page.waitForTimeout(150); r3 = await premier();
  ok('3 · « lieu volcan » : le lieu', r3[0] === 'Lieu' && /Volcan/.test(r3[1]), r3.join(' · '));
  await page.fill('#rch-q', 'briefing'); await page.waitForTimeout(150); r3 = await premier();
  ok('3 · « briefing » : une action', r3[0] === 'Action' && /Briefing/.test(r3[1]), r3.join(' · '));
  await page.fill('#rch-q', 'contrat volcan'); await page.waitForTimeout(150); r3 = await premier();
  ok('3 · « contrat volcan » : la ligne à traiter (le contrat de la date du Havre)', r3[0] === 'À traiter' && /Folle Idée/.test(r3[1]), r3.join(' · '));
  await page.keyboard.press('Enter');
  await page.waitForSelector('.gf [role="dialog"]', { timeout: 5000 }).catch(() => {});
  ok('3 · Entrée la traite sur place : « Le contrat »', (await texte(page, '.gf h2')) === 'Le contrat', await texte(page, '.gf h2'));
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await page.keyboard.press('Control+k');
  await page.waitForSelector('#recherche[open]', { timeout: 3000 });
  await page.fill('#rch-q', 'nouvelle date'); await page.waitForTimeout(150);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => location.hash === '#/representations/nouvelle', null, { timeout: 5000 }).catch(() => {});
  ok('3 · « nouvelle date » + Entrée ouvre le formulaire d’une nouvelle date', await page.evaluate(() => location.hash) === '#/representations/nouvelle', await page.evaluate(() => location.hash));
  await page.goto(`${URL0}#/accueil`);
  await page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  // 4. les vues nommées
  await page.selectOption('#tb-vue', '+');
  await page.waitForSelector('.gf input[name="nom"]', { timeout: 3000 }).catch(() => {});
  await page.fill('.gf input[name="nom"]', 'Lundi matin');
  await page.click('.gf button[type="submit"]');
  await page.waitForFunction(() => document.querySelector('#tb-vue')?.value === 'Lundi matin', null, { timeout: 5000 }).catch(() => {});
  ok('4 · « Enregistrer la vue actuelle sous… » : la vue « Lundi matin », choisie dans l’en-tête', await page.$eval('#tb-vue', e => e.value) === 'Lundi matin', await page.$eval('#tb-vue', e => e.value));
  await page.click('#tb-personnaliser'); await page.click(`${tuile('ateliers')} [data-tb-masquer]`); await page.click('#tb-fini');
  await page.selectOption('#tb-vue', '+');
  await page.waitForSelector('.gf input[name="nom"]', { timeout: 3000 }).catch(() => {});
  await page.fill('.gf input[name="nom"]', 'Veille de tournée');
  await page.click('.gf input[name="veille"]');
  await page.click('.gf button[type="submit"]');
  await page.waitForFunction(() => document.querySelector('#tb-vue')?.value === 'Veille de tournée', null, { timeout: 5000 }).catch(() => {});
  await page.selectOption('#tb-vue', 'Lundi matin'); await page.waitForTimeout(300);
  const a4 = (await compte(page, tuile('ateliers'))) === 1;
  await page.selectOption('#tb-vue', 'Veille de tournée'); await page.waitForTimeout(300);
  const b4 = (await compte(page, tuile('ateliers'))) === 0;
  await page.selectOption('#tb-vue', ''); await page.waitForTimeout(300);
  const c4 = (await compte(page, tuile('ateliers'))) === 1;
  ok('4 · chaque vue garde sa disposition (les ateliers visibles dans « Lundi matin », masqués dans « Veille de tournée ») ; la vue par défaut revient', a4 && b4 && c4, `${a4} ${b4} ${c4}`);
  await page.waitForTimeout(1300);
  const pref4 = DB.crescite_preferences.find(x => x.cle === 'accueil.tableau')?.valeur || {};
  ok('4 · les vues sont gardées avec le compte, la règle d’ouverture automatique aussi (veille de tournée)', Array.isArray(pref4.vues) && pref4.vues.length === 2 && pref4.vues[1].auto?.veille === true, JSON.stringify((pref4.vues || []).map(v => [v.nom, v.auto])));
  // (un choix fait à la main tient six heures : on le vieillit dans la disposition gardée, puis on revient)
  const pref4b = DB.crescite_preferences.find(x => x.cle === 'accueil.tableau'); if (pref4b) pref4b.valeur.manuelLe = Date.now() - 7 * 3600e3;
  await page.reload(); await page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  ok('4 · au retour (le choix manuel vieilli), la vue « Veille de tournée » s’ouvre d’elle-même : une date est dans trois jours', await page.$eval('#tb-vue', e => e.value) === 'Veille de tournée' && /automatique/.test(await page.$eval('#tb-vue', e => e.selectedOptions[0]?.textContent || '')), await page.$eval('#tb-vue', e => e.selectedOptions[0]?.textContent || ''));
  // 6. les tuiles qui se parlent
  await page.hover(`${tuile('prochaines')} a.tb-l[data-date="101"]`);
  await page.waitForTimeout(150);
  ok('6 · survoler une date allume ce qui la concerne ailleurs (sa feuille à publier, à compléter), et son spectacle', (await compte(page, '#tb-grille .tb-lie')) >= 1 && (await compte(page, '#tb-grille .tb-lie-sp')) >= 1, `${await compte(page, '#tb-grille .tb-lie')} / ${await compte(page, '#tb-grille .tb-lie-sp')}`);
  await page.evaluate(() => TABLEAU.filtrer(1));
  await page.waitForTimeout(150);
  ok('6 · filtrer sur Bérénice : la pastille le dit, les lignes des autres spectacles se cachent', /Filtré : Bérénice/.test(await texte(page, '#tb-filtre')) && await page.$eval(`${tuile('prochaines')} a.tb-l[data-date="102"]`, e => e.hidden) && !(await page.$eval(`${tuile('prochaines')} a.tb-l[data-date="101"]`, e => e.hidden)), await texte(page, '#tb-filtre'));
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  ok('6 · Échap lève le filtre', await page.$eval('#tb-filtre', e => e.hidden) && !(await page.$eval(`${tuile('prochaines')} a.tb-l[data-date="102"]`, e => e.hidden)));
  // 7. les chiffres qui bougent
  ok('7 · les chiffres mois par mois : des barres pour les représentations, un mois cliquable ; la saison passée au même point', (await compte(page, `${tuile('chiffres')} .tb-courbe`)) >= 1 && (await compte(page, `${tuile('chiffres')} [data-tb-mois]`)) >= 12 && /même point la saison passée/.test(await texte(page, `${tuile('chiffres')} .tb-note`)), await texte(page, `${tuile('chiffres')} .tb-note`));
  const mois7 = await page.$$eval(`${tuile('chiffres')} [data-tb-mois]`, xs => xs.find(x => x.style.getPropertyValue('--h') !== '0%')?.dataset.tbMois || '');
  await page.click(`${tuile('chiffres')} [data-tb-mois="${mois7}"]`);
  await page.waitForSelector('#recherche[open]', { timeout: 3000 }).catch(() => {});
  ok('7 · un mois cliqué cherche ses dates', (await compte(page, '#recherche[open]')) === 1 && /\d{4}$/.test(await page.$eval('#rch-q', e => e.value).catch(() => '')) && (await compte(page, '#rch-liste [role=option]')) >= 1, await page.$eval('#rch-q', e => e.value).catch(() => ''));
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  // 8. glisser-déposer entre tuiles
  // (à la souris, pas à pas : Chromium veut deux mouvements au-dessus de la cible pour livrer dragover puis drop)
  const src8 = await page.$(`${tuile('equipe')} a.tb-l[data-personne="3"]`), dst8 = await page.$(`${tuile('prochaines')} a.tb-l[data-date="101"]`);
  await src8.scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
  await src8.hover(); await page.mouse.down(); await page.mouse.move(5, 5, { steps: 3 }); await dst8.hover(); await dst8.hover({ position: { x: 40, y: 12 } }); await page.mouse.up();
  await page.waitForTimeout(900);
  ok('8 · déposer Léa (qui part bientôt) sur la date de Caen l’y inscrit (crescite_equipes, présente)', MODIFS.some(m => m.table === 'crescite_equipes' && m.post && m.post[0].personne_id === 3 && m.post[0].date_id === 101 && m.post[0].present === true), JSON.stringify(MODIFS.filter(m => m.table === 'crescite_equipes')));
  await page.click('#tb-personnaliser'); await page.click('[data-tb-montrer="spectacles"]'); await page.click('#tb-fini');
  await page.waitForSelector(`${tuile('spectacles')} .tb-sp[data-sp="1"]`, { timeout: 3000 });
  const dt = await page.evaluateHandle(() => { const dt = new DataTransfer(); dt.items.add(new File(['%PDF-1.4 essai'], 'plan-de-feu.pdf', { type: 'application/pdf' })); return dt; });
  await page.dispatchEvent(`${tuile('spectacles')} .tb-sp[data-sp="1"]`, 'drop', { dataTransfer: dt });
  await page.waitForTimeout(900);
  ok('8 · un fichier déposé sur Bérénice part dans crescite-equipe sous berenice/ et devient un document de l’équipe (un plan)', MODIFS.some(m => m.stockage === 'crescite-equipe' && /^berenice\/[a-z0-9]+-plan-de-feu\.pdf$/.test(m.envoi)) && MODIFS.some(m => m.table === 'crescite_documents' && m.post && m.post[0].spectacle_id === 1 && m.post[0].type === 'plan' && m.post[0].pour === 'equipe'), JSON.stringify(MODIFS.filter(m => m.stockage || m.table === 'crescite_documents')));
  // 9. le fil : voir le diff, annuler
  ok('9 · une modification récente a « Annuler » ; une ancienne non', (await compte(page, `${tuile('journal')} [data-tb-annuler="5"]`)) === 1 && (await compte(page, `${tuile('journal')} [data-tb-annuler="3"]`)) === 0);
  await page.hover(`${tuile('journal')} a.tb-l[data-j="5"]`);
  await page.waitForSelector('#tb-diff', { timeout: 2000 }).catch(() => {});
  const diff9 = await texte(page, '#tb-diff');
  ok('9 · survoler la ligne montre le diff, champ par champ : statut, option → confirmée', (await compte(page, '#tb-diff')) === 1 && /statut/.test(diff9) && /option/.test(diff9) && /confirm/.test(diff9), diff9);
  const n9 = MODIFS.length;
  await page.click(`${tuile('journal')} [data-tb-annuler="5"]`);
  await page.waitForTimeout(900);
  ok('9 · « Annuler » remet la ligne comme avant (la date de Caen en option)', MODIFS.slice(n9).some(m => m.table === 'crescite_dates' && m.body && m.body.statut === 'option' && m.n === 1), JSON.stringify(MODIFS.slice(n9)));
  // 10. le briefing
  await page.click('#tb-briefing');
  await page.waitForSelector('#tb-brief[open]', { timeout: 3000 });
  const brief = await texte(page, '#tb-brief .tb-brief-corps');
  ok('10 · le briefing : les dates de la semaine (Caen dans trois jours), ce qui manque, les échéances', /Bérénice/.test(brief) && /Théâtre de Caen/.test(brief) && /Ce qui manque/.test(brief) && /Échéances/.test(brief), brief.slice(0, 120));
  await page.click('#tb-brief [data-tb-brief-copier]');
  await page.waitForTimeout(300);
  const presse = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  ok('10 · « Copier le texte » met le briefing dans le presse-papiers, en texte simple', /^Briefing du /.test(presse) && /DATES/.test(presse) && /Bérénice/.test(presse), presse.slice(0, 80));
  await page.screenshot({ path: `${CAPT}/briefing.png`, fullPage: false });
  await page.click('#tb-brief [data-tb-brief-fermer]');
  await page.screenshot({ path: `${CAPT}/dix-idees.png`, fullPage: true });
  ok('dix idées · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ l'en-tête sur une ou deux lignes (rangerBarre)
// de 641 à 1 440 px : jamais plus de deux lignes, rien ne déborde ; ce qui ne tient pas est dans « Plus » (les rubriques,
// le compte), qui s'ouvre au clavier et se referme par Échap ; au téléphone couché, une ligne arrimée de 64 px au plus
for (const [largeur, hauteur, tactile] of [[700, 900, false], [1000, 900, false], [1120, 820, false], [1366, 768, false], [1440, 900, false], [844, 390, true], [667, 375, true]]) {
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur, hauteur, hash: '#/accueil', tactile });
  await page.waitForTimeout(300);
  const t = await page.evaluate(() => {
    // le menu des rubriques est cherché par son nom accessible : dans l'en-tête aujourd'hui, dans la colonne de gauche (la coque)
    // une fois le lot 3 passé ; ce qui ne vaut que pour une nav d'en-tête (« Plus », les rubriques cachées) devient facultatif
    const b = document.querySelector('.barre'), m = b.querySelector('.marque').getBoundingClientRect(), nav = document.querySelector('nav[aria-label="Rubriques"]');
    const dansBarre = !!nav && b.contains(nav), np = b.querySelector('.nav-plus');
    // les lignes : les milieux des éléments visibles, regroupés quand ils sont à moins de 14 px l'un de l'autre
    const milieux = [...b.querySelectorAll('.marque, .chercher, .qui > *' + (dansBarre ? ', nav[aria-label="Rubriques"] > :not([hidden])' : ''))].filter(e => e.getBoundingClientRect().width > 0).map(e => { const r = e.getBoundingClientRect(); return (r.top + r.bottom) / 2; }).sort((x, y) => x - y);
    const lignes = milieux.filter((y, i) => !i || y - milieux[i - 1] > 14).length;
    return { h: Math.round(b.getBoundingClientRect().height), lignes, position: getComputedStyle(b).position, deborde: document.documentElement.scrollWidth > innerWidth || (dansBarre && nav.scrollWidth > nav.clientWidth + 1),
      caches: dansBarre ? nav.querySelectorAll(':scope > a[hidden]').length : 0, plus: !!np && !np.hidden, courante: !!nav && !!nav.querySelector('a[aria-current="page"]:not([hidden])'), compte: b.classList.contains('r-compte'), dansBarre, haut: m.top };
  });
  const bas = hauteur <= 500;
  ok(`en-tête (${largeur}×${hauteur}) : ${bas ? 'une ligne arrimée, 64 px au plus' : 'une ou deux lignes'}, rien ne déborde, la rubrique courante en vue, « Plus » dès qu’une chose n’y tient pas`,
    t.lignes <= (bas ? 1 : 2) && !t.deborde && t.courante && (!bas || (t.h <= 64 && t.position === 'sticky')) && (!t.dansBarre || t.plus === (t.caches > 0 || t.compte)), JSON.stringify(t));
  if (t.plus) {
    await page.focus('.nav-plus'); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
    const m = await page.evaluate(() => { const x = document.querySelector('#nav-autres'), r = x.getBoundingClientRect(), it = [...x.querySelectorAll('.na-item')];
      return { ouvert: x.classList.contains('ouvert'), n: it.length, rub: it.filter(a => a.matches('a[href^="#/"]')).length, focus: document.activeElement?.classList.contains('na-item'), dedans: r.left >= 0 && r.right <= innerWidth + 1, cible: Math.min(...it.map(a => a.getBoundingClientRect().height)) }; });
    await page.keyboard.press('ArrowDown');
    const second = await page.evaluate(() => document.activeElement === document.querySelectorAll('#nav-autres .na-item')[1]);
    await page.keyboard.press('Escape');
    const ferme = await page.evaluate(() => !document.querySelector('#nav-autres').classList.contains('ouvert') && document.activeElement?.classList.contains('nav-plus'));
    ok(`en-tête (${largeur}×${hauteur}) : « Plus » s’ouvre au clavier sur ce qui n’a pas tenu (${t.caches} rubrique${t.caches > 1 ? 's' : ''}${t.compte ? ', le compte' : ''}), cibles de 44 px, ↓ puis Échap rend le focus`,
      m.ouvert && m.rub === t.caches && m.focus && m.dedans && m.cible >= 44 && second && ferme, JSON.stringify({ m, second, ferme }));
    if (largeur === 1120 || largeur === 844) { await page.click('.nav-plus'); await page.waitForTimeout(250); await page.screenshot({ path: `${CAPT}/entete-plus-${largeur}.png` }); await page.keyboard.press('Escape'); }
  }
  ok(`en-tête (${largeur}×${hauteur}) : aucune erreur de script`, erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ la recherche rapide : tout ce qui a une adresse
// les fiches ouvertes reviennent champ vide (puis les prochaines dates) ; un téléphone, un contact, une partie de rubrique,
// un texte du site, une invitation se trouvent ; le passage trouvé hors du titre se montre, souligné ; le clavier ouvre
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur: 1440, hauteur: 900, hash: '#/accueil' });
  for (const h of ['#/lieux/6', '#/equipe/1']) { await page.evaluate(x => { location.hash = x; }, h); await page.waitForTimeout(400); }
  await page.keyboard.press('Control+k'); await page.waitForSelector('dialog.recherche[open]');
  const vide = await page.evaluate(() => ({ entete: document.querySelector('#rch-entete').textContent, groupes: [...document.querySelectorAll('.rch-groupe')].map(x => x.textContent),
    titres: [...document.querySelectorAll('#rch-liste [role=option] b')].slice(0, 2).map(b => b.textContent) }));
  ok('recherche · champ vide : les fiches ouvertes en dernier (la plus récente d’abord), puis les prochaines dates', vide.entete === 'Ouvertes récemment' && vide.titres[0] === 'Camille Essai' && vide.titres[1] === 'Le Volcan' && vide.groupes[0] === 'Prochaines dates', JSON.stringify(vide));
  const chercher = async q => { await page.fill('#rch-q', q); await page.waitForTimeout(80); return page.evaluate(() => [...document.querySelectorAll('#rch-liste [role=option]')].map(o => ({ type: o.querySelector('.rch-type').textContent, titre: o.querySelector('b').textContent, passage: o.querySelector('.rch-passage')?.textContent || '', marques: [...o.querySelectorAll('.rch-passage mark')].map(m => m.textContent) }))); };
  const tel = await chercher('06 12');
  ok('recherche · un numéro trouve la personne, et le passage trouvé (« Téléphone : 06 12 34 56 78 ») se montre souligné', tel.length === 1 && tel[0].titre === 'Camille Essai' && /^Téléphone : 06 12 34 56 78/.test(tel[0].passage) && tel[0].marques.join(' ') === '06 12', JSON.stringify(tel));
  const regie = await chercher('régie');
  ok('recherche · un contact trouve le lieu et la date qu’il suit', regie.some(x => x.type === 'Lieu' && x.titre === 'Théâtre de Caen' && /^Contact/.test(x.passage)) && regie.some(x => x.type === 'Date'), JSON.stringify(regie));
  const parties = [];
  for (const q of ['carte de tournée', 'propositions', 'coordonnées', 'volcan', 'préparation', 'mot de passe']) parties.push([q, (await chercher(q)).map(x => `${x.type}:${x.titre}`)]);
  const a = Object.fromEntries(parties);
  ok('recherche · les parties des rubriques, les textes du site, les invitations, les ateliers, le compte se trouvent', a['carte de tournée'].includes('Rubrique:Carte de tournée') && a.propositions.includes('Rubrique:Propositions') && a['coordonnées'].includes('Texte:Coordonnées')
    && a.volcan.includes('Invitation:Le Volcan') && a['préparation'].includes('Atelier:Atelier de préparation') && a['mot de passe'].includes('Compte:Mot de passe'), JSON.stringify(a));
  await page.fill('#rch-q', 'carte de tournée'); await page.waitForTimeout(80); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  ok('recherche · Entrée ouvre la partie trouvée', await page.evaluate(() => location.hash) === '#/representations/carte');
  ok('recherche · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ les repères (axe-core : landmark-one-main, region)
// l'en-tête, le menu des rubriques (nommé, la rubrique ouverte marquée), le contenu, le pied ; « Aller au contenu » en
// premier arrêt du clavier, qui pose le focus sur le titre sans changer l'adresse ; la porte a aussi son repère principal
for (const [largeur, hauteur, nom] of [[1440, 900, 'bureau'], [390, 844, 'téléphone']]) {
  const { ctx, page, erreurs } = await ouvrir(navigateur, { largeur, hauteur, hash: '#/representations' });
  await page.waitForSelector('main#vue h1', { timeout: 15000 });
  const reperes = await page.evaluate(() => {
    const hors = [...document.querySelectorAll('#app > *')].filter(e => !e.matches('header, main, footer, .evitement, .coque'));   // (.coque : le menu et le contenu côte à côte)
    const nav = document.querySelector('nav[aria-label="Rubriques"]');
    return { mains: document.querySelectorAll('main').length, tete: !!document.querySelector('#app > header .marque'), navPresente: !!nav && nav.getClientRects().length > 0, nav: nav?.querySelector('a[aria-current="page"]')?.textContent,
      pied: !!document.querySelector('#app > footer'), hors: hors.map(e => e.className || e.tagName) };
  });
  ok(`repères (${nom}) : un en-tête, le menu des rubriques (Représentations marquée), un contenu, un pied, rien hors d’eux`, reperes.mains === 1 && reperes.tete && (reperes.nav === 'Représentations' || (nom === 'téléphone' && !reperes.navPresente)) && reperes.pied && !reperes.hors.length, JSON.stringify(reperes));
  await page.keyboard.press('Tab');
  const lien = await page.evaluate(() => { const a = document.activeElement; return { texte: a.textContent, classe: a.classList.contains('evitement') ? 'evitement' : a.className, haut: Math.round(a.getBoundingClientRect().top) }; });
  ok(`« Aller au contenu » (${nom}) : le premier arrêt du clavier, visible quand il a le focus`, lien.texte === 'Aller au contenu' && lien.classe === 'evitement' && lien.haut >= 0, JSON.stringify(lien));
  if (nom === 'bureau') await page.screenshot({ path: `${CAPT}/evitement.png` });
  await page.keyboard.press('Enter');
  ok(`« Aller au contenu » (${nom}) : le titre de la rubrique reçoit le focus, l’adresse ne change pas`, await page.evaluate(() => document.activeElement === document.querySelector('main#vue h1') && location.hash === '#/representations'));
  ok(`repères (${nom}) : aucune erreur de script`, erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'fr-FR' });
  await ctx.route(/supabase\.co|fonts\.g/, r => r.abort());
  const page = await ctx.newPage();
  await page.goto(URL0);
  await page.waitForSelector('#f-connexion', { timeout: 15000 });
  ok('la porte (sans session) : le formulaire et la marque dans le repère principal, le pied à côté', await page.evaluate(() => document.querySelectorAll('main').length === 1 && !!document.querySelector('main #f-connexion .marque') && !!document.querySelector('main + footer.pied-espace')));
  await ctx.close();
}

await navigateur.close();
bilan(CAPT);
