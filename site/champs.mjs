// La fiche d'une date et ses champs (admin/index.html : SCHEMA_DATE, ecrireChamps, la fiche ; admin/parcours.js :
// COMPLETUDE ; admin/tableau.js : TRAITER), vérifiés dans Chromium, hors ligne, sur la base fictive commune
// (admin-fictif.mjs).
//   node site/champs.mjs        (après python3 site/build.py ; node supabase/tests/champs.mjs a écrit champs-date.json)
// Deux visages. L'essai « aucun champ oublié » : chaque colonne des cinq tables d'une date (supabase/tests/champs-date.json,
// lu dans information_schema par l'essai SQL) a son champ dans SCHEMA_DATE, ou une raison d'être écartée ici ; et l'inverse
// (aucun champ du schéma ne vise une colonne qui n'existe pas). Puis le rail unique d'écriture : les feuilles « traiter sur
// place » du tableau de bord envoient la date entière au rpc (jamais un PATCH de la ligne), le montant de cession passe
// après lui, une modification de séance sans séance est refusée, « Annuler » rejoue l'instantané. Puis la fiche : les
// puces « calculé tout seul », la jauge et « Compléter », la piste de diffusion, la source des chiffres, le bandeau
// « Modifiée à 14h32 par Barbara ». Enfin le bloc « avec v3 » : quand la base répond crescite_capacites (le vingt-quatrième
// script), un seul rpc par geste, sans écriture séparée du suivi, des chiffres ou de l'équipe ; sans elle, les quatre écritures.
// Les captures vont dans site/dist/shots-champs/. Sort en erreur si une vérification manque.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, ICI, plus, DB, MODIFS, ok, calme, ouvrir, texte, compte, tuile, bilan } from './admin-fictif.mjs';

const CAPT = path.join(ICI, 'dist', 'shots-champs');
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });
const attendre = (page, fn, ms = 6000, arg = null) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);

// ---- ce qui est écarté du schéma, et pourquoi : des colonnes de la base que la fiche ne saisit pas
const ECARTS = {
  crescite_dates: { id: 'la clé', modifie_le: 'posée par le déclencheur', modifie_par: 'posée par le déclencheur' },
  crescite_representations: { id: 'la clé', date_id: 'la date qui la porte', modifie_le: 'posée par le déclencheur', modifie_par: 'posée par le déclencheur' },
  crescite_dates_suivi: { date_id: 'la clé', modifie_le: 'posée par le déclencheur', modifie_par: 'posée par le déclencheur',
    etape_crm: 'la piste de diffusion porte ce suivi (script 22)', date_dernier_contact: 'la piste de diffusion porte ce suivi (script 22)',
    date_prochaine_relance: 'la piste de diffusion porte ce suivi (script 22)', notes_diffusion: 'la piste de diffusion porte ce suivi (script 22)' },
  crescite_dates_chiffres: { date_id: 'la clé', modifie_le: 'posée par le déclencheur', modifie_par: 'posée par le déclencheur' },
  crescite_equipes: { date_id: 'la date qui la porte', personne_id: 'la clé de la ligne : la personne', modifie_le: 'posée par le déclencheur', modifie_par: 'posée par le déclencheur' },
};
// la comparaison, en une fonction : colonnes (le JSON) contre champs (le schéma) et écarts
function comparer(colonnes, champs) {
  const cle = (t, c) => `${t}.${c}`;
  const couvertes = new Set(champs.filter(c => c.table && c.col).map(c => cle(`crescite_${c.table}`, c.col)));
  const existantes = new Set(colonnes.map(c => cle(c.table, c.colonne)));
  const ecartees = new Set(Object.entries(ECARTS).flatMap(([t, cs]) => Object.keys(cs).map(c => cle(t, c))));
  return {
    oubliees: colonnes.filter(c => !couvertes.has(cle(c.table, c.colonne)) && !ecartees.has(cle(c.table, c.colonne))).map(c => cle(c.table, c.colonne)),
    inconnues: champs.filter(c => c.table && c.col && !existantes.has(cle(`crescite_${c.table}`, c.col))).map(c => c.k),
    ecartsInutiles: [...ecartees].filter(k => !existantes.has(k)),
    doubles: [...ecartees].filter(k => couvertes.has(k)),
  };
}

// ================================================================================ 1 · aucun champ oublié
{
  const json = JSON.parse(fs.readFileSync(path.join(ICI, '..', 'supabase', 'tests', 'champs-date.json'), 'utf8'));
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/representations/101' });
  await page.waitForSelector('#ed-date #s-org', { timeout: 15000 });
  const champs = await page.evaluate(() => SCHEMA_DATE.map(c => ({ k: c.k, table: c.table, col: c.col, niveau: c.niveau, colonne: !!c.colonne, ecrit: typeof c.ecrire === 'function', derive: typeof c.derive === 'function', confidentiel: !!c.confidentiel, jeux: c.jeux || [] })));
  const r = comparer(json.colonnes, champs);
  ok('aucun champ oublié : chaque colonne des cinq tables d’une date a son champ dans SCHEMA_DATE ou une raison d’être écartée', r.oubliees.length === 0, `oubliées : ${r.oubliees.join(', ')}`);
  ok('aucun champ du schéma ne vise une colonne qui n’existe pas', r.inconnues.length === 0, `inconnues : ${r.inconnues.join(', ')}`);
  ok('aucune exclusion périmée : chaque colonne écartée existe, et aucune n’est aussi un champ', r.ecartsInutiles.length === 0 && r.doubles.length === 0, `inutiles : ${r.ecartsInutiles.join(', ')} · doubles : ${r.doubles.join(', ')}`);
  const faux = comparer([...json.colonnes, { table: 'crescite_dates', colonne: 'colonne_inventee' }], champs);
  ok('l’essai sait échouer : une colonne ajoutée à la base, sans champ, est vue comme oubliée', faux.oubliees.length === 1 && faux.oubliees[0] === 'crescite_dates.colonne_inventee');
  ok('les quatre colonnes mortes de diffusion du suivi ne sont pas des champs ; la cession HT l’est, confidentielle, du jeu diffusion',
    !champs.some(c => ['etape_crm', 'date_dernier_contact', 'date_prochaine_relance', 'notes_diffusion'].includes(c.col)) && champs.some(c => c.k === 'montant' && c.table === 'dates_suivi' && c.col === 'montant_cession' && c.confidentiel && c.jeux.includes('diffusion') && c.niveau === 'diffusion'));
  ok('un identifiant par champ ; chaque champ écrivable a son geste d’écriture ; les dérivés sont en lecture avec leur raison',
    new Set(champs.map(c => c.k)).size === champs.length && champs.filter(c => c.niveau !== 'lecture' && c.niveau !== 'lieu').every(c => c.ecrit) && champs.filter(c => c.niveau === 'lecture' && c.col && c.derive).length >= 4, '');
  ok('les 22 colonnes du tableur sont portées dans le schéma (colonne propre)', champs.filter(c => c.colonne).length === 22, String(champs.filter(c => c.colonne).length));
  ok('le schéma porte les quatre envois entiers : séances, équipe, suivi, chiffres', ['representations', 'equipe', 'suivi', 'chiffres'].every(k => champs.some(c => c.k === k && c.ecrit)));
  ok('1 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 2 · le rail unique d'écriture, depuis le tableau de bord
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/accueil' });
  page.on('dialog', d => d.accept());
  await page.waitForSelector(`${tuile('urgent')} .tb-l`, { timeout: 15000 });
  // options : confirmer la date de Flers (105)
  let n = MODIFS.length;
  await page.click(`${tuile('urgent')} [data-traiter="options:105"]`);
  await page.waitForSelector('.gf [data-gf-seg="statut"]', { timeout: 5000 }).catch(() => {});
  await page.click('.gf button[type="submit"]');
  await attendre(page, () => !document.querySelector('.gf'), 10000);
  const rpc1 = MODIFS.slice(n).filter(m => m.rpc === 'crescite_enregistrer_date');
  ok('TRAITER.options : un seul rpc crescite_enregistrer_date, la date entière (spectacle, lieu, début, séances, suivi), « confirmée »', rpc1.length === 1 && rpc1[0].corps.d.id === 105 && rpc1[0].corps.d.statut === 'confirmee' && rpc1[0].corps.d.spectacle_id === 1 && rpc1[0].corps.d.lieu_id === 8 && !!rpc1[0].corps.d.debut && Array.isArray(rpc1[0].corps.d.representations) && !!rpc1[0].corps.d.suivi, JSON.stringify(rpc1));
  ok('TRAITER.options : aucun PATCH de crescite_dates', !MODIFS.slice(n).some(m => m.table === 'crescite_dates'), JSON.stringify(MODIFS.slice(n)));
  ok('TRAITER.options : l’annonce dit « Date confirmée. » et porte « Annuler »', /Date confirmée\./.test(await texte(page, '.annonce span')) && (await compte(page, '.annonce [data-tt="retour"]')) >= 1);
  // heures : les deux séances de Villeneuve (103) partent ensemble
  await page.evaluate(() => document.querySelectorAll('.annonce').forEach(a => a.remove()));
  n = MODIFS.length;
  const ensemble = await page.evaluate(async () => {
    const d = E.dates.find(x => x.id === 103), liens = E.reps.filter(r => r.date_id === 103).map(r => r.lien);
    const r = await ecrireChamps(103, { representations: repsDe(103).map((x, i) => ({ id: x.id, jour: x.jour, heure: i ? '15:00' : h5(x.heure), fin: '', public: x.public, annulee: false, lien: x.lien || '', note: '' })) }, { dire: 'Horaires essai.' });
    return { ok: r.ok, phrase: r.phrase, d: !!d, liens };
  });
  const rpc2 = MODIFS.slice(n).filter(m => m.rpc === 'crescite_enregistrer_date');
  ok('TRAITER.heures (le rail) : les deux séances de la date partent dans un seul rpc, l’une changée, l’autre non', ensemble.ok && rpc2.length === 1 && rpc2[0].corps.d.representations.length === 2 && rpc2[0].corps.d.representations.some(r => r.heure === '15:00') && rpc2[0].corps.d.representations.some(r => r.heure === '10:00'), JSON.stringify(rpc2));
  await page.evaluate(() => document.querySelectorAll('.annonce').forEach(a => a.remove()));
  // contrats : un montant, puis le vider
  n = MODIFS.length;
  const cleContrat = await page.$eval(`${tuile('urgent')} a[data-viser="#s-contrat"]`, a => a.closest('.tb-lt')?.querySelector('[data-traiter]')?.dataset.traiter || '').catch(() => '');
  ok('« À traiter » offre un contrat à traiter sur place', /^contrats:/.test(cleContrat), cleContrat);
  const idContrat = +cleContrat.split(':')[1];
  await page.click(`${tuile('urgent')} [data-traiter="${cleContrat}"]`);
  await page.waitForSelector('.gf input[name="montant_cession"]', { timeout: 5000 }).catch(() => {});
  const champ = await page.$eval('.gf input[name="montant_cession"]', e => ({ min: e.min, step: e.step, max: e.max, lib: e.closest('.gf-champ')?.textContent || '' })).catch(() => ({}));
  ok('TRAITER.contrats : le champ du montant vient du schéma (libellé, 0 au centime)', champ.min === '0' && champ.step === '0.01' && /Montant de cession HT/.test(champ.lib), JSON.stringify(champ));
  await page.fill('.gf input[name="montant_cession"]', '1234.5');
  await page.click('.gf button[type="submit"]');
  await attendre(page, () => !document.querySelector('.gf'), 10000);
  const apres = MODIFS.slice(n), iRpc = apres.findIndex(m => m.rpc === 'crescite_enregistrer_date'), iMontant = apres.findIndex(m => m.table === 'crescite_dates_suivi' && m.post && m.post[0].montant_cession === 1234.5);
  ok('TRAITER.contrats avec un montant : un rpc, puis un upsert crescite_dates_suivi portant montant_cession (on_conflict date_id)', iRpc >= 0 && iMontant > iRpc && apres[iMontant].conflit.join() === 'date_id' && apres[iMontant].post[0].date_id === idContrat && !apres.some(m => m.table === 'crescite_dates_suivi' && m.post && m.post[0].contrat !== undefined), JSON.stringify(apres));
  await page.evaluate(() => document.querySelectorAll('.annonce').forEach(a => a.remove()));
  n = MODIFS.length;
  await page.click(`${tuile('urgent')} [data-traiter="${cleContrat}"]`).catch(() => {});
  await page.waitForSelector('.gf input[name="montant_cession"]', { timeout: 5000 }).catch(() => {});
  const garde = await page.$eval('.gf input[name="montant_cession"]', e => e.value).catch(() => '');
  await page.fill('.gf input[name="montant_cession"]', '');
  await page.click('.gf button[type="submit"]');
  await attendre(page, () => !document.querySelector('.gf'), 10000);
  ok('TRAITER.contrats peut effacer le montant : le champ garde 1234.5, vidé il écrit montant_cession : null', garde === '1234.5' && MODIFS.slice(n).some(m => m.table === 'crescite_dates_suivi' && m.post && m.post[0].montant_cession === null), `${garde} · ${JSON.stringify(MODIFS.slice(n))}`);
  ok('2 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 3 · le rail : refus, Annuler, raccourcis
{
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/accueil' });
  await page.waitForSelector(`${tuile('urgent')} .tb-l`, { timeout: 15000 });
  let n = MODIFS.length;
  const refus = await page.evaluate(async () => {
    const nb = E.reps.length;
    const sans = await ecrireChamps(101, [['heure', '21:00']]);
    const inconnu = await ecrireChamps(101, { 'champ-qui-n-existe-pas': 1 });
    const lecture = await ecrireChamps(101, { saison: '2030-2031' });
    const absente = await ecrireChamps(99999, { statut: 'option' });
    return { sans: [sans.ok, sans.phrase], inconnu: inconnu.ok, lecture: lecture.ok, absente: absente.ok, nb, apres: E.reps.length };
  });
  ok('ecrireChamps refuse une modification de séance sans séance (jamais de séance fantôme), un champ inconnu, un champ calculé, une date absente', !refus.sans[0] && /séance/.test(refus.sans[1]) && !refus.inconnu && !refus.lecture && !refus.absente && refus.nb === refus.apres && MODIFS.length === n, JSON.stringify(refus));
  n = MODIFS.length;
  const avecSeance = await page.evaluate(async () => { const r0 = E.reps.find(r => r.date_id === 101); const r = await ecrireChamps(101, [['heure', '21:30', { r: r0 }]], { dire: 'Heure essai.' }); return { ok: r.ok, reps: E.reps.filter(x => x.date_id === 101).map(x => String(x.heure).slice(0, 5)) }; });
  const rpc = MODIFS.slice(n).filter(m => m.rpc === 'crescite_enregistrer_date');
  ok('avec sa séance, l’heure s’écrit : un rpc qui porte la séance à 21:30 et les autres champs de la date inchangés', avecSeance.ok && rpc.length === 1 && rpc[0].corps.d.representations.length === 1 && rpc[0].corps.d.representations[0].heure === '21:30' && rpc[0].corps.d.statut === 'confirmee' && avecSeance.reps.join() === '21:30', JSON.stringify(rpc));
  // Annuler
  await page.evaluate(() => document.querySelectorAll('.annonce').forEach(a => a.remove()));
  n = MODIFS.length;
  await page.evaluate(() => { window.__r = ecrireChamps(102, { statut: 'option', billetterie: 'https://essai.example/102' }, { dire: 'Date de Rouen passée en option.' }); return window.__r.then(() => 1); });
  ok('ecrireChamps annonce sa phrase avec « Annuler »', /passée en option/.test(await texte(page, '.annonce span')) && (await compte(page, '.annonce [data-tt="retour"]')) === 1);
  ok('deux champs d’une date : un seul rpc, les deux y sont', MODIFS.slice(n).filter(m => m.rpc === 'crescite_enregistrer_date').length === 1 && MODIFS.slice(n).some(m => m.corps?.d?.statut === 'option' && m.corps.d.lien === 'https://essai.example/102'));
  n = MODIFS.length;
  await page.click('.annonce [data-tt="retour"]');
  await attendre(page, () => !document.querySelector('.annonce [data-tt="retour"]') && E.dates.find(d => d.id === 102).statut === 'confirmee', 6000);
  const retour = MODIFS.slice(n).filter(m => m.rpc === 'crescite_enregistrer_date');
  ok('« Annuler » rejoue l’instantané : un rpc qui remet « confirmée » et la billetterie vide', retour.length === 1 && retour[0].corps.d.statut === 'confirmee' && retour[0].corps.d.lien === null && DB.crescite_dates.find(d => d.id === 102).statut === 'confirmee', JSON.stringify(retour));
  // les raccourcis : les chiffres seuls et l'équipe seule n'appellent pas le rpc
  await page.evaluate(() => document.querySelectorAll('.annonce').forEach(a => a.remove()));
  n = MODIFS.length;
  const chiffres = await page.evaluate(async () => { const r = await ecrireChamps(101, { 'chiffre-jauge': 310, 'chiffres-source': 'Essai' }, { dire: 'Chiffres essai.' }); return { ok: r.ok, ligne: (E.chiffres || []).find(x => x.date_id === 101) }; });
  ok('les chiffres seuls s’écrivent sans le rpc : un upsert crescite_dates_chiffres (jauge, source), la date n’est pas touchée', chiffres.ok && !MODIFS.slice(n).some(m => m.rpc) && MODIFS.slice(n).some(m => m.table === 'crescite_dates_chiffres' && m.post && m.post[0].jauge === 310 && m.post[0].source === 'Essai') && chiffres.ligne?.jauge === 310, JSON.stringify(MODIFS.slice(n)));
  n = MODIFS.length;
  await page.evaluate(() => document.querySelectorAll('.annonce').forEach(a => a.remove()));
  const equipe = await page.evaluate(async () => { const r = await ecrireChamps(101, { equipe: [{ personne_id: 3, present: true, fonction: 'Renfort', note: null }] }, { dire: 'Équipe essai.' }); return { ok: r.ok, n: E.equipes.filter(x => x.date_id === 101).length }; });
  ok('l’équipe seule s’écrit sans le rpc : un upsert crescite_equipes, et la date relue garde son équipe', equipe.ok && !MODIFS.slice(n).some(m => m.rpc) && MODIFS.slice(n).some(m => m.table === 'crescite_equipes' && m.post && m.post[0].personne_id === 3 && m.post[0].date_id === 101) && equipe.n >= 1, JSON.stringify(MODIFS.slice(n)));
  DB.crescite_equipes = DB.crescite_equipes.filter(x => x.date_id !== 101);
  DB.crescite_dates_chiffres = DB.crescite_dates_chiffres.filter(x => x.date_id !== 101);
  ok('3 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 3 bis · la feuille « Horaires » (le vrai TRAITER.heures), Annuler d'un retrait, l'échec partiel
{
  const rep3 = DB.crescite_representations.find(r => r.id === 3), lien0 = rep3.lien;
  rep3.lien = 'https://billet.example/103';   // le lien de billetterie d'une séance, absent de la feuille : il doit être gardé
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/accueil' });
  await page.waitForSelector(`${tuile('urgent')} .tb-l`, { timeout: 15000 });
  const nSeances = () => page.evaluate(() => E.reps.filter(r => r.date_id === 103).length);
  const avant = await nSeances();
  let n = MODIFS.length;
  await page.evaluate(() => TABLEAU.traiter('heures:103'));
  await page.waitForSelector('.gf [data-gf-groupe="reps"] [data-gf-item]', { timeout: 5000 }).catch(() => {});
  ok('TRAITER.heures : la feuille « Horaires » s’ouvre avec une ligne par séance de la date', (await compte(page, '.gf [data-gf-groupe="reps"] [data-gf-item]')) === avant && avant === 2, String(avant));
  await page.fill('.gf [data-gf-item]:nth-of-type(1) input[name$=".heure"]', '11:15');
  await page.click('.gf [data-gf-item]:nth-of-type(2) [data-gf-retirer]');
  await page.click('.gf button[type="submit"]');
  await attendre(page, () => !document.querySelector('.gf'), 10000);
  const rpc = MODIFS.slice(n).filter(m => m.rpc === 'crescite_enregistrer_date'), reps = rpc[0]?.corps.d.representations || [];
  ok('TRAITER.heures (la feuille) : un seul rpc, la séance gardée garde son numéro, son lien de billetterie et sa nouvelle heure, la séance retirée n’y est plus',
    rpc.length === 1 && reps.length === 1 && reps[0].id === 3 && reps[0].heure === '11:15' && reps[0].lien === 'https://billet.example/103' && !MODIFS.slice(n).some(m => m.table === 'crescite_representations') && (await nSeances()) === 1, JSON.stringify(rpc));
  ok('l’annonce dit « Horaires enregistrés. » et porte « Annuler »', /Horaires enregistrés\./.test(await texte(page, '.annonce span')) && (await compte(page, '.annonce [data-tt="retour"]')) === 1);
  // Annuler : la séance retirée par le geste revient (recréée), l'heure reprend son ancienne valeur
  n = MODIFS.length;
  await page.click('.annonce [data-tt="retour"]');
  await attendre(page, () => E.reps.filter(r => r.date_id === 103).length === 2, 6000);
  const retour = MODIFS.slice(n).filter(m => m.rpc === 'crescite_enregistrer_date'), rr = retour[0]?.corps.d.representations || [];
  ok('« Annuler » après un retrait de séance remet la séance retirée : un rpc à deux séances (l’une recréée sans numéro), la base et la page en ont deux de nouveau',
    retour.length === 1 && rr.length === 2 && rr.some(r => r.id === 3 && r.heure === '10:00') && rr.some(r => !r.id) && (await nSeances()) === 2 && DB.crescite_representations.filter(r => r.date_id === 103).length === 2, JSON.stringify(retour));
  rep3.lien = lien0;
  // l'échec partiel : la date est écrite, le montant ou l'équipe non
  const partiel = await page.evaluate(async () => {
    const vrai = window.ecrireMontant, vraiEq = window.enregistrerEquipeDate, statut = E.dates.find(d => d.id === 102).statut;
    window.ecrireMontant = async () => false;
    const a = await ecrireChamps(102, { statut }, { annulable: false });
    window.ecrireMontant = vrai;
    window.enregistrerEquipeDate = async () => false;
    const b = await ecrireChamps(101, { equipe: [{ personne_id: 3, present: true, fonction: 'Renfort', note: null }] }, { annulable: false });
    window.enregistrerEquipeDate = vraiEq;
    return { a: [a.ok, a.partiel, a.phrase], b: [b.ok, b.partiel, b.phrase] };
  });
  ok('le montant en échec : la date est écrite, ecrireChamps rend ok (partiel) pour que la feuille se ferme, la phrase dit ce qui manque ; l’équipe seule en échec n’a rien écrit : pas ok',
    partiel.a[0] === true && partiel.a[1] === true && /pas son montant/.test(partiel.a[2]) && partiel.b[0] === false && /pas son équipe/.test(partiel.b[2]), JSON.stringify(partiel));
  ok('3 bis · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}
{
  // « Compléter » sur une date neuve : le lieu choisi, il faut viser le jour de la ligne de séance posée d'office (pas #d-debut, absent)
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/representations/nouvelle', largeur: 1440, hauteur: 1000 });
  await page.waitForSelector('#d-lieu input', { timeout: 15000 });
  await page.selectOption('#d-sp', { index: 1 });
  await page.click('#d-lieu input');
  await page.keyboard.type('Caen');
  await page.waitForSelector('#d-lieu button[data-id="5"]', { timeout: 4000 });
  await page.click('#d-lieu button[data-id="5"]');
  await attendre(page, () => document.querySelector('#d-completude .cpl-completer')?.dataset.cplViser, 3000);
  const viser = await page.$eval('#d-completude .cpl-completer', b => b.dataset.cplViser);
  ok('date neuve · « Compléter » vise une cible qui existe dans la fiche (le jour de la première séance sans jour)', (await compte(page, '#d-debut')) === 0 && (await compte(page, viser)) === 1 && /data-r="jour"/.test(viser), viser);
  await page.click('#d-completude .cpl-completer');
  ok('date neuve · « Compléter » allume le jour de la séance et lui donne le focus', await attendre(page, () => document.querySelector('.visee')?.matches('#d-reps [data-r="jour"]') && document.activeElement === document.querySelector('.visee'), 3000));
  ok('3 ter · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
}

// ================================================================================ 4 · la fiche : dérivés, jauge, diffusion, chiffres
{
  DB.crescite_diffusion_prospects[0].date_convertie_id = 101;   // la piste de Flers a donné la date de Caen (retirée à la fin du bloc)
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/representations/101', largeur: 1440, hauteur: 1000 });
  await page.waitForSelector('#ed-date #s-org', { timeout: 15000 });
  const puces = await page.$$eval('#ed-date .derive', xs => xs.map(x => ({ t: x.textContent, title: x.title, d: x.getAttribute('aria-describedby'), tag: x.tagName, sr: document.getElementById(x.getAttribute('aria-describedby'))?.textContent })));
  ok('la fiche montre au moins trois puces « calculé tout seul », des <output> avec leur raison en infobulle et aria-describedby', puces.length >= 3 && puces.every(p => p.tag === 'OUTPUT' && p.title && p.d && p.sr === p.title), JSON.stringify(puces));
  ok('les raisons : la saison et le jour d’où elle vient, début et fin qui suivent les séances, le public d’après les séances', puces.some(p => /^Saison \d{4}-\d{4} : déduite du /.test(p.title)) && puces.some(p => p.title === 'Début et fin : suivent les séances') && puces.some(p => /^Public : .+, d’après les séances$/.test(p.title)), puces.map(p => p.title).join(' | '));
  const jauge = await page.$eval('#d-completude .cpl-jauge', e => ({ role: e.getAttribute('role'), now: +e.getAttribute('aria-valuenow'), max: +e.getAttribute('aria-valuemax'), txt: e.getAttribute('aria-valuetext'), vu: e.textContent.replace(/\s+/g, ' ').trim(), nom: e.getAttribute('aria-label') })).catch(() => null);
  ok('la jauge de complétude sous le titre : un progressbar, « n champs sur m », une phrase pour la voix (aria-valuetext)', !!jauge && jauge.role === 'progressbar' && jauge.max >= 6 && jauge.now > 0 && jauge.now < jauge.max && new RegExp(`^${jauge.now} champs? sur ${jauge.max}$`).test(jauge.vu) && /^\d+ champs? sur \d+\. Il manque : /.test(jauge.txt), JSON.stringify(jauge));
  ok('la jauge ne bouscule ni le parcours ni le titre (classes à elle, pas .parcours ni .pc-*)', (await compte(page, '#d-completude .parcours, #d-completude [class*="pc-"]')) === 0 && (await compte(page, '#ed-date .parcours')) === 1 && (await compte(page, '#ed-date .titre-ed')) === 1);
  await page.screenshot({ path: `${CAPT}/fiche-derives.png`, fullPage: false });
  const cible = await page.$eval('#d-completude .cpl-completer', b => b.dataset.cplViser);
  await page.click('#d-completude .cpl-completer');
  await attendre(page, () => document.querySelector('.visee'), 3000);
  ok('« Compléter » vise le premier champ vide : il s’allume (.visee) et prend le focus', !!cible && (await page.evaluate(sel => { const e = document.querySelector('.visee'); return !!e && (e.matches(sel) || e.closest(sel) !== null || !!e.querySelector(sel) || document.querySelector(sel) === e); }, cible)) && await page.evaluate(() => document.activeElement && document.activeElement !== document.body), cible);
  // remplir le premier champ vide fait rouler le compte
  const avant = jauge.now;
  await page.fill('#s-montant', '2500');
  await attendre(page, a => +document.querySelector('#d-completude .cpl-jauge').getAttribute('aria-valuenow') === a, 3000, avant + 1);
  ok('un champ rempli fait monter le compte de la jauge, sur place (la barre et le texte suivent)', (await page.$eval('#d-completude .cpl-jauge', e => +e.getAttribute('aria-valuenow'))) === avant + 1 && /^\d+ champs? sur \d+$/.test(await texte(page, '#d-completude .cpl-jauge')));
  // la piste de diffusion
  ok('« Piste de diffusion » : la piste dont la date est convertie en celle-ci, son étape, son dernier contact, sa prochaine relance, son lien', (await compte(page, '#d-pistes a[href="#/diffusion/piste/1"]')) === 1 && /Dossier/.test(await texte(page, '#d-pistes')) && /Dernier contact : .+ · prochaine relance : /.test(await texte(page, '#d-pistes')), await texte(page, '#d-pistes'));
  ok('la section dit « jamais publié, jamais exporté sans le demander » et se nomme par son titre', /jamais publié, jamais exporté sans le demander/.test(await texte(page, '#d-pistes h3')) && await page.$eval('#d-pistes', e => e.getAttribute('aria-labelledby') === 'd-pistes-t'));
  ok('plus de section « Diffusion » à colonnes mortes : ni étape, ni notes de diffusion à saisir ; le montant reste dans le suivi interne', (await compte(page, '#etape-crm, #d-etape, #d-notes-diffusion, [name="etape_crm"], #s-dernier-contact')) === 0 && (await compte(page, '#s-montant')) === 1 && /Montant de cession HT/.test(await texte(page, '.bloc:has(#s-montant) label[for="s-montant"]')));
  await page.screenshot({ path: `${CAPT}/fiche-diffusion.png`, fullPage: true });
  // la source des chiffres
  ok('« Les chiffres » porte la source (D’où viennent ces chiffres)', (await compte(page, '#c-source')) === 1 && /D’où viennent ces chiffres/.test(await texte(page, 'label[for="c-source"]')));
  await page.fill('#c-jauge', '380');
  await page.fill('#c-source', 'Récapitulatif de la compagnie, ligne 12');
  const n = MODIFS.length;
  await page.click('#ed-date [data-enregistrer]');
  await attendre(page, () => document.querySelector('#ed-date .etat-ed:not(.sale)'), 6000);
  const ch = MODIFS.slice(n).find(m => m.table === 'crescite_dates_chiffres');
  ok('enregistrer écrit la ligne de chiffres avec sa source (upsert crescite_dates_chiffres)', !!ch && ch.post[0].source === 'Récapitulatif de la compagnie, ligne 12' && ch.post[0].jauge === 380 && ch.post[0].date_id === 101, JSON.stringify(ch));
  ok('4 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
  delete DB.crescite_diffusion_prospects[0].date_convertie_id;
}
{
  // sans piste ni tables de la diffusion : pas de section, pas de montant ; la fiche reste complète
  const garde = Object.fromEntries(['crescite_diffusion_prospects', 'crescite_notes_frais', 'crescite_materiel', 'crescite_devis_demandes'].map(t => [t, DB[t]]));
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/representations/101' });
  await page.waitForSelector('#ed-date #s-org', { timeout: 15000 });
  ok('sans piste qui mène à elle : pas de section « Piste de diffusion »', (await compte(page, '#d-pistes')) === 0);
  await ctx.close();
  for (const t of Object.keys(garde)) delete DB[t];
  const sans = await ouvrir(navigateur, { hash: '#/representations/101' });
  await sans.page.waitForSelector('#ed-date #s-org', { timeout: 15000 });
  ok('la base sans les tables de la diffusion : ni « Piste de diffusion », ni montant de cession ; la jauge et les puces restent', (await compte(sans.page, '#d-pistes')) === 0 && (await compte(sans.page, '#s-montant')) === 0 && (await compte(sans.page, '#d-completude .cpl-jauge')) === 1 && (await compte(sans.page, '#ed-date .derive')) >= 3);
  ok('4 bis · aucune erreur de script', sans.erreurs.length === 0 && erreurs.length === 0, [...sans.erreurs, ...erreurs].join(' / '));
  await sans.ctx.close();
  Object.assign(DB, garde);
}

// ================================================================================ 5 · « Modifiée ailleurs »
{
  DB.crescite_admins.push({ user_id: 'u-barbara', nom: 'Barbara' });   // (la base fictive n'a qu'Adrien)
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/representations/101', largeur: 1440, hauteur: 1000 });
  await page.waitForSelector('#ed-date #s-org', { timeout: 15000 });
  ok('la fiche ouverte sait quelle date elle montre (data-id) ; pas de bandeau au départ', await page.$eval('#ed-date', e => e.dataset.id) === '101' && (await compte(page, '#ed-date [role=status]')) === 0);
  await page.evaluate(() => changement('crescite_dates', { eventType: 'UPDATE', new: { ...E.dates.find(d => d.id === 101), modifie_par: E.session.user.id, modifie_le: new Date().toISOString() } }));
  ok('une modification faite par soi-même ne fait pas de bandeau', (await compte(page, '#ed-date [role=status]')) === 0);
  await page.evaluate(() => changement('crescite_dates', { eventType: 'UPDATE', new: { ...E.dates.find(d => d.id === 102), statut: 'option', modifie_par: 'u-barbara', modifie_le: new Date().toISOString() } }));
  ok('une autre date modifiée ailleurs ne touche pas cette fiche', (await compte(page, '#ed-date [role=status]')) === 0);
  await page.evaluate(() => changement('crescite_dates', { eventType: 'UPDATE', new: { ...E.dates.find(d => d.id === 101), modifie_par: null, modifie_le: new Date().toISOString() } }));
  ok('une modification sans auteur identifié (un import, un compte inconnu) ne fait pas de bandeau « par import »', (await compte(page, '#ed-date [role=status]')) === 0);
  await page.fill('#s-org', 'Saisie en cours');   // la fiche est sale : le bandeau vient quand même
  const d101 = DB.crescite_dates.find(d => d.id === 101), statut0 = d101.statut;
  d101.statut = 'option';   // (l'autre administratrice a enregistré : la base l'a)
  await page.evaluate(() => changement('crescite_dates', { eventType: 'UPDATE', new: { ...E.dates.find(d => d.id === 101), statut: 'option', modifie_par: 'u-barbara', modifie_le: new Date().toISOString() } }));
  await attendre(page, () => document.querySelector('#ed-date [role=status]'), 2000);
  const bandeau = await texte(page, '#ed-date [role=status]');
  ok('le bandeau « Modifiée à 14h32 par Barbara » paraît en tête de la fiche, même sale, avec « Recharger » et « Garder mes changements »', /^Modifiée à \d{2}h\d{2} par Barbara/.test(bandeau) && /Recharger/.test(bandeau) && /Garder mes changements/.test(bandeau) && await page.$eval('#ed-date', e => e.firstElementChild.classList.contains('ailleurs')) && (await page.$eval('#s-org', e => e.value)) === 'Saisie en cours', bandeau);
  await page.evaluate(() => window.scrollTo(0, 0));
  await calme(page);
  await page.screenshot({ path: `${CAPT}/fiche-ailleurs.png`, fullPage: false });
  await page.click('#ed-date [data-ailleurs="garder"]');
  ok('« Garder mes changements » retire le bandeau et laisse la saisie', (await compte(page, '#ed-date [role=status]')) === 0 && (await page.$eval('#s-org', e => e.value)) === 'Saisie en cours');
  await page.evaluate(() => changement('crescite_dates', { eventType: 'UPDATE', new: { ...E.dates.find(d => d.id === 101), modifie_par: 'u-barbara', modifie_le: new Date().toISOString() } }));
  await page.click('#ed-date [data-ailleurs="recharger"]');
  await attendre(page, () => document.querySelector('#ed-date [data-statut="option"][aria-pressed="true"]'), 4000);
  ok('« Recharger » relit la date et redessine la fiche : le statut de l’autre compte, la saisie perdue, plus de bandeau', (await compte(page, '#ed-date [data-statut="option"][aria-pressed="true"]')) === 1 && (await compte(page, '#ed-date [role=status]')) === 0 && (await page.$eval('#s-org', e => e.value)) === 'Théâtre de Caen');
  d101.statut = statut0;
  ok('5 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
  // la fiche en tiroir : le bandeau est dans le tiroir, et « Recharger » redessine ce tiroir
  const tir = await ouvrir(navigateur, { hash: '#/accueil', largeur: 1440, hauteur: 1000 });
  await tir.page.waitForSelector(`${tuile('urgent')} .tb-l`, { timeout: 15000 });
  await tir.page.evaluate(() => TIROIR.ouvrir('#/representations/101'));
  await tir.page.waitForSelector('.tiroir #ed-date #s-org', { timeout: 8000 });
  d101.statut = 'option';
  await tir.page.evaluate(() => changement('crescite_dates', { eventType: 'UPDATE', new: { ...E.dates.find(d => d.id === 101), statut: 'option', modifie_par: 'u-barbara', modifie_le: new Date().toISOString() } }));
  await attendre(tir.page, () => document.querySelector('.tiroir #ed-date [role=status]'), 2000);
  await tir.page.click('.tiroir #ed-date [data-ailleurs="recharger"]');
  await attendre(tir.page, () => document.querySelector('.tiroir #ed-date [data-statut="option"][aria-pressed="true"]'), 4000);
  ok('en tiroir : le bandeau paraît dans le tiroir et « Recharger » redessine cette fiche (statut de l’autre compte, plus de bandeau)', (await compte(tir.page, '.tiroir #ed-date [data-statut="option"][aria-pressed="true"]')) === 1 && (await compte(tir.page, '.tiroir #ed-date [role=status]')) === 0);
  d101.statut = statut0;
  ok('5 bis · aucune erreur de script', tir.erreurs.length === 0, tir.erreurs.join(' / '));
  await tir.ctx.close();
  DB.crescite_admins.pop();
}

// ================================================================================ 6 · avec la version 3 : un seul appel par geste
// Le vingt-quatrième script rend crescite_capacites() : { enregistrer_date: 3, … }. Alors une date s'écrit en UN appel
// (crescite_enregistrer_date porte aussi le montant de cession, les chiffres et l'équipe : tout passe ou rien) ; sans lui
// (la sonde répond rien, ou la fonction n'existe pas), les quatre écritures d'avant. La sonde est une lecture : elle ne
// laisse rien dans MODIFS. Une sonde qui échoue autrement n'est jamais prise pour « version 2 ».
{
  const CAP3 = { enregistrer_date: 3, montant_cession: true, equipe: true, chiffres: true };
  const gardees = Object.fromEntries(['crescite_dates', 'crescite_representations', 'crescite_dates_suivi', 'crescite_dates_chiffres', 'crescite_equipes'].map(t => [t, structuredClone(DB[t])]));
  const SEPARES = ['crescite_dates_suivi', 'crescite_dates_chiffres', 'crescite_equipes'];
  const separees = ms => ms.filter(m => SEPARES.includes(m.table));
  const rpcs = ms => ms.filter(m => m.rpc === 'crescite_enregistrer_date');
  const { ctx, page, erreurs } = await ouvrir(navigateur, { hash: '#/representations/101', largeur: 1440, hauteur: 1000, capacites: CAP3 });
  await page.waitForSelector('#ed-date #s-org', { timeout: 15000 });
  ok('avec v3 · le chargement sonde crescite_capacites : E.capacites porte la réponse de la base', JSON.stringify(await page.evaluate(() => E.capacites)) === JSON.stringify(CAP3));
  ok('avec v3 · la sonde est une lecture : aucune entrée rpc crescite_capacites dans MODIFS, même après un chargement', !MODIFS.some(m => m.rpc === 'crescite_capacites'));
  const n0 = MODIFS.length;
  // 1 · la fiche : les chiffres, leur source et le montant partent avec la date, dans le même appel
  await page.fill('#c-jauge', '420');
  await page.fill('#c-source', 'Billetterie, version 3');
  await page.fill('#s-montant', '3100');
  let n = MODIFS.length;
  await page.click('#ed-date [data-enregistrer]');
  await attendre(page, () => document.querySelector('#ed-date .etat-ed:not(.sale)'), 6000);
  let r = rpcs(MODIFS.slice(n)), d = r[0]?.corps.d;
  ok('avec v3 · la fiche enregistre en un seul rpc, qui porte le montant (suivi), les chiffres (avec leur source) et l’équipe', r.length === 1 && d.id === 101 && d.suivi.montant_cession === 3100 && d.chiffres.jauge === 420 && d.chiffres.source === 'Billetterie, version 3' && Array.isArray(d.equipe), JSON.stringify(d));
  ok('avec v3 · la fiche n’écrit ni crescite_dates_suivi, ni crescite_dates_chiffres, ni crescite_equipes à côté', separees(MODIFS.slice(n)).length === 0, JSON.stringify(separees(MODIFS.slice(n))));
  const relu = await page.evaluate(() => ({ jauge: (E.chiffres || []).find(x => x.date_id === 101)?.jauge, montant: E.suivis.find(x => x.date_id === 101)?.montant_cession }));
  ok('avec v3 · la date relue porte les chiffres et le montant que la base vient d’enregistrer', relu.jauge === 420 && Number(relu.montant) === 3100, JSON.stringify(relu));
  // 2 · le rail : un geste qui mêle la date, l'équipe, le montant et les chiffres
  await page.evaluate(() => document.querySelectorAll('.annonce').forEach(a => a.remove()));
  n = MODIFS.length;
  const mixte = await page.evaluate(async () => { const x = await ecrireChamps(101, { statut: 'confirmee', 'chiffre-jauge': 510, montant: 4200, equipe: [{ personne_id: 3, present: true, fonction: 'Renfort', note: null }] }, { dire: 'Geste mêlé.' }); return { ok: x.ok, partiel: x.partiel, equipe: E.equipes.filter(y => y.date_id === 101).map(y => y.personne_id), jauge: (E.chiffres || []).find(y => y.date_id === 101)?.jauge }; });
  r = rpcs(MODIFS.slice(n)); d = r[0]?.corps.d;
  ok('avec v3 · un geste qui mêle date, équipe, montant et chiffres : un seul rpc, aucune écriture séparée, ok sans partiel', mixte.ok && !mixte.partiel && r.length === 1 && d.suivi.montant_cession === 4200 && d.chiffres.jauge === 510 && d.equipe.some(e => e.personne_id === 3 && e.fonction === 'Renfort') && separees(MODIFS.slice(n)).length === 0, JSON.stringify({ mixte, d }));
  ok('avec v3 · …et la page relue a l’équipe et les chiffres de la base', mixte.equipe.includes(3) && mixte.jauge === 510, JSON.stringify(mixte));
  // 3 · la feuille « Horaires » du tableau de bord
  await page.evaluate(() => document.querySelectorAll('.annonce').forEach(a => a.remove()));
  await page.evaluate(() => { location.hash = '#/accueil'; });
  await page.waitForSelector(`${tuile('urgent')} .tb-l`, { timeout: 15000 });
  await page.evaluate(() => TABLEAU.traiter('heures:103'));
  await page.waitForSelector('.gf [data-gf-groupe="reps"] [data-gf-item]', { timeout: 5000 }).catch(() => {});
  await page.fill('.gf [data-gf-item]:nth-of-type(1) input[name$=".heure"]', '09:45');
  n = MODIFS.length;
  await page.click('.gf button[type="submit"]');
  await attendre(page, () => !document.querySelector('.gf'), 10000);
  r = rpcs(MODIFS.slice(n));
  ok('avec v3 · la feuille « Horaires » : un seul rpc (les deux séances), aucune écriture séparée', r.length === 1 && r[0].corps.d.representations.some(x => x.heure === '09:45') && separees(MODIFS.slice(n)).length === 0 && !MODIFS.slice(n).some(m => m.table === 'crescite_representations'), JSON.stringify(MODIFS.slice(n)));
  ok('avec v3 · du début à la fin, une entrée rpc par geste (trois) et jamais d’écriture séparée', rpcs(MODIFS.slice(n0)).length === 3 && separees(MODIFS.slice(n0)).length === 0, `${rpcs(MODIFS.slice(n0)).length} · ${JSON.stringify(separees(MODIFS.slice(n0)))}`);
  // 4 · une sonde qui échoue n'est pas « version 2 » : la relecture échoue, le client garde ce qu'il savait
  await page.evaluate(() => document.querySelectorAll('.annonce').forEach(a => a.remove()));
  const sonde = reponse => page.evaluate(async rep => {
    const propre = Object.prototype.hasOwnProperty.call(sb, 'rpc'), vrai = sb.rpc;
    sb.rpc = function (nom, ...a) { return nom === 'crescite_capacites' ? Promise.resolve(rep) : vrai.call(this, nom, ...a); };
    const relue = await actualiser();
    if (propre) sb.rpc = vrai; else delete sb.rpc;
    return { relue, version: E.capacites?.enregistrer_date ?? null };
  }, reponse);
  const panne = await sonde({ data: null, error: { message: 'TypeError: Failed to fetch', code: '' }, status: 0 });
  ok('avec v3 · la sonde en panne (réseau) fait échouer la relecture, et le client garde « version 3 » (jamais un retour silencieux aux écritures séparées)', panne.relue === false && panne.version === 3, JSON.stringify(panne));
  const refus500 = await sonde({ data: null, error: { message: 'erreur interne', code: 'XX000' }, status: 500 });
  ok('avec v3 · une erreur de la base (500) n’est pas une absence : la relecture échoue, « version 3 » est gardée', refus500.relue === false && refus500.version === 3, JSON.stringify(refus500));
  ok('avec v3 · la relecture réussie garde la version 3', (await page.evaluate(() => actualiser())) === true && (await page.evaluate(() => E.capacites?.enregistrer_date)) === 3);
  // 5 · la fonction absente (PGRST202, 404) : version 2, les quatre écritures
  const absente = await sonde({ data: null, error: { message: 'Could not find the function public.crescite_capacites without parameters in the schema cache', code: 'PGRST202' }, status: 404 });
  ok('sans v3 · la fonction absente (PGRST202, 404) vaut null : la relecture réussit et E.capacites est null', absente.relue === true && absente.version === null, JSON.stringify(absente));
  n = MODIFS.length;
  const separe = await page.evaluate(async () => { const x = await ecrireChamps(101, { statut: 'confirmee', 'chiffre-jauge': 530, montant: 4300, equipe: [{ personne_id: 2, present: true, fonction: 'Régie', note: null }] }, { dire: 'Geste mêlé, sans v3.' }); return { ok: x.ok, partiel: x.partiel }; });
  const apres = MODIFS.slice(n), iRpc = apres.findIndex(m => m.rpc === 'crescite_enregistrer_date');
  ok('sans v3 · le même geste fait les quatre écritures : le rpc (sans chiffres ni équipe), puis le montant, les chiffres et l’équipe',
    separe.ok && !separe.partiel && iRpc === 0 && !apres[iRpc].corps.d.chiffres && !apres[iRpc].corps.d.equipe && apres.some(m => m.table === 'crescite_dates_suivi' && m.post && m.post[0].montant_cession === 4300) && apres.some(m => m.table === 'crescite_dates_chiffres' && m.post && m.post[0].jauge === 530)
      && apres.some(m => m.table === 'crescite_equipes' && m.post && m.post[0].personne_id === 2), JSON.stringify(apres));
  // une source saisie sans aucun nombre reste (la ligne ne s'en va que si les trois nombres et la source sont vides) ; la fonction
  // absente du geste d'avant a ramené E.capacites à null : une relecture le remet à la version 3
  await page.evaluate(() => actualiser());
  ok('avec v3 · …la sonde relue remet la version 3 après la fonction absente', (await page.evaluate(() => E.capacites?.enregistrer_date)) === 3);
  n = MODIFS.length;
  const seule = await page.evaluate(async () => { const d = E.dates.find(x => x.id === 105), F = dateVersForm(d); F.chiffres = { jauge: '', spectateurs: '', heures_ateliers: '', source: 'Relevé de la salle' }; await ecrireDate(F, d); return { ligne: (E.chiffres || []).find(x => x.date_id === 105) || null }; });
  ok('avec v3 · une source de chiffres saisie sans aucun nombre est gardée (la ligne reste, un seul rpc)', seule.ligne?.source === 'Relevé de la salle' && DB.crescite_dates_chiffres.find(x => x.date_id === 105)?.source === 'Relevé de la salle' && rpcs(MODIFS.slice(n)).length === 1 && separees(MODIFS.slice(n)).length === 0, JSON.stringify({ seule, chiffres: DB.crescite_dates_chiffres }));
  n = MODIFS.length;
  const videe = await page.evaluate(async () => { const d = E.dates.find(x => x.id === 105), F = dateVersForm(d); F.chiffres = { jauge: '', spectateurs: '', heures_ateliers: '', source: '' }; await ecrireDate(F, d); return (E.chiffres || []).some(x => x.date_id === 105); });
  ok('avec v3 · …et la ligne s’en va quand les trois nombres et la source sont vides', videe === false && !DB.crescite_dates_chiffres.some(x => x.date_id === 105) && separees(MODIFS.slice(n)).length === 0);
  ok('avec v3 · aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
  // le tableur : une case de la date s'écrit aussi en un seul appel (ecrireDate est son seul chemin)
  const tab = await ouvrir(navigateur, { hash: '?mode=complet#/representations/tableur', largeur: 1600, hauteur: 1000, capacites: CAP3 });   // (le tableur s'ouvre en Simple : la colonne Organisateur est celle du Complet)
  await tab.page.waitForSelector('table[role=grid] #tab-corps tr[data-l]', { timeout: 15000 });
  n = MODIFS.length;
  await tab.page.click('#tab-corps tr[data-l="0"] td.c-organisateur');
  await tab.page.keyboard.press('Enter');
  await tab.page.keyboard.type('Association Version 3');
  await tab.page.keyboard.press('Enter');
  await attendre(tab.page, () => /^(Enregistré|Pas enregistré)/.test(document.querySelector('#tab-etat')?.textContent || ''), 8000);
  r = rpcs(MODIFS.slice(n));
  ok('avec v3 · le tableur enregistre une case en un seul rpc, sans écriture séparée', r.length === 1 && r[0].corps.d.suivi?.organisateur === 'Association Version 3' && separees(MODIFS.slice(n)).length === 0, JSON.stringify(MODIFS.slice(n)));
  ok('avec v3 · le tableur : aucune erreur de script', tab.erreurs.length === 0, tab.erreurs.join(' / '));
  await tab.ctx.close();
  // 6 · la base refuse : une seule erreur, rien d'écrit à côté
  const ref = await ouvrir(navigateur, { hash: '#/representations/101', largeur: 1440, hauteur: 1000, capacites: CAP3, refuser: { rpc: 'crescite_enregistrer_date', status: 400, message: 'refusé par la base' } });
  await ref.page.waitForSelector('#ed-date #s-org', { timeout: 15000 });
  await ref.page.fill('#c-jauge', '999');
  await ref.page.fill('#s-montant', '9999');
  n = MODIFS.length;
  await ref.page.click('#ed-date [data-enregistrer]');
  await attendre(ref.page, () => /refusé par la base/.test(document.body.textContent), 6000);
  const dit = await texte(ref.page, '.annonce');
  ok('avec v3 · la base refuse : une seule erreur (« L’enregistrement a échoué »), pas de « la date est enregistrée, mais pas… », et rien d’écrit à côté', /L’enregistrement a échoué : refusé par la base/.test(dit) && !/est enregistrée, mais pas/.test(dit) && separees(MODIFS.slice(n)).length === 0 && MODIFS.slice(n).filter(m => m.rpc).length === 1, `${dit} · ${JSON.stringify(MODIFS.slice(n))}`);
  ok('avec v3 · après le refus, la base garde ses chiffres (la saisie reste dans la fiche)', DB.crescite_dates_chiffres.find(x => x.date_id === 101)?.jauge !== 999);
  ok('6 · aucune erreur de script (hors le refus que le banc provoque)', ref.erreurs.filter(e => !/refusé par la base/.test(e)).length === 0, ref.erreurs.join(' / '));
  await ref.ctx.close();
  Object.assign(DB, gardees);
}

await navigateur.close();
bilan(CAPT);
