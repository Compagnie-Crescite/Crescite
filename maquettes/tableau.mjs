// Le tableau de bord de l'administration (admin/index.html, admin/tableau.js), vérifié dans Chromium, hors ligne.
//   node maquettes/tableau.mjs
// L'administration s'ouvre sur une base fictive : les lectures REST de Supabase sont simulées (une poignée de dates,
// personnes, lieux, devis, frais, propositions…), la session est posée dans le stockage du navigateur, le temps réel est
// coupé. Aucune donnée réelle, aucun appel à la base. À l'ordinateur (1 600 px), puis au téléphone ; chaque vérification
// dit ce qu'elle regarde ; les captures vont dans maquettes/dist/shots-tableau/. Sort en erreur si une vérification
// manque. Demande Playwright et Chromium (PLAYWRIGHT_MODULE, CHROMIUM, comme onglets.mjs).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs');

const ICI = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(ICI, '..');
const CAPT = path.join(ICI, 'dist', 'shots-tableau');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
// admin/ tel qu'il est publié : ses fichiers, et les outils communs que build.py copie à côté (agenda.js, tentacules.js…)
const serveur = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/admin\//, '');
  const p = [path.join(ROOT, 'admin', rel), path.join(ICI, 'src', rel)].find(f => f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile());
  if (!p) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => serveur.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${serveur.address().port}/admin/index.html`;

// ---- la base fictive, autour d'aujourd'hui
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plus = n => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return iso(d); };
const saisonDe = j => { const a = +j.slice(0, 4), m = +j.slice(5, 7); return m >= 9 ? `${a}-${a + 1}` : `${a - 1}-${a}`; };
const ilYA = (min) => new Date(Date.now() - min * 6e4).toISOString();
const UID = 'u-essai';
const univers = (scene, accent) => ({ couleurs: { scene, fond: '#1b0f18', texte: '#ffffff', accent } });
const date = (id, spectacle_id, lieu_id, debut, extra = {}) => ({ id, spectacle_id, lieu_id, debut, fin: extra.fin || debut, precision: 'jour', saison: saisonDe(debut), public: 'tout_public', statut: 'confirmee', visible: true, nature: 'representations', intitule: null, details: [], lien: null, nb_representations: null, ...extra });
const rep = (id, date_id, jour, heure, extra = {}) => ({ id, date_id, jour, heure, fin: null, public: 'tout_public', annulee: false, lien: null, note: null, ...extra });
const DB = {
  crescite_admins: [{ user_id: UID, nom: 'Adrien' }],
  crescite_spectacles: [
    { id: 1, slug: 'berenice', ordre: 10, publie: true, page: true, titre: 'Bérénice', univers: univers('#7a2a5a', '#f0b84a'), en_tournee: true },
    { id: 2, slug: 'la-folle-idee', ordre: 20, publie: true, page: true, titre: 'La Folle Idée', univers: univers('#1f5f8b', '#8fd3ff') },
    { id: 3, slug: 'cassandres', ordre: 30, publie: false, page: true, titre: 'Cassandres', univers: univers('#2d6a4f', '#95d5b2') },
  ],
  crescite_lieux: [
    { id: 5, nom: 'Théâtre de Caen', type: 'salle', commune: 'Caen', departement: '14', adresse: '135 boulevard du Maréchal-Leclerc', latitude: 49.18, longitude: -0.37 },
    { id: 6, nom: 'Le Volcan', type: 'salle', commune: 'Le Havre', departement: '76', adresse: '8 place Niemeyer', latitude: 49.49, longitude: 0.11 },
    { id: 7, nom: 'Lycée Voltaire', type: 'etablissement', commune: 'Paris', departement: '75', adresse: null, latitude: 48.85, longitude: 2.35 },
    { id: 8, nom: 'Théâtre de Flers', type: 'salle', commune: 'Flers', departement: '61', adresse: '2 rue du Théâtre', latitude: 48.75, longitude: -0.57 },
  ],
  crescite_dates: [
    date(101, 1, 5, plus(3)), date(102, 2, 6, plus(9)), date(103, 1, 7, plus(23), { public: 'scolaire' }), date(104, 2, 7, plus(-40)),
    date(105, 1, 8, plus(30), { statut: 'option', visible: false }), date(106, 2, 5, plus(50), { nature: 'repetitions', visible: false, fin: plus(52) }),
    date(107, 3, 5, plus(120), { nature: 'residence', fin: plus(124) }),
  ],
  crescite_representations: [rep(1, 101, plus(3), '20:00:00'), rep(2, 102, plus(9), null), rep(3, 103, plus(23), '10:00:00', { public: 'scolaire' }), rep(4, 103, plus(23), '14:30:00', { public: 'scolaire' }), rep(5, 104, plus(-40), '19:00:00')],
  crescite_dates_suivi: [{ date_id: 101, organisateur: 'Théâtre de Caen', contact: 'Régie 02 31 00 00 00', contrat: 'signé', notes: '' }, { date_id: 102, organisateur: '', contact: '', contrat: 'à envoyer', notes: '' }],
  crescite_lieux_suivi: [{ lieu_id: 5, contact: 'Régie : 02 31 00 00 00', jauge: 400, plateau: '12 × 10 m' }, { lieu_id: 6, contact: 'Accueil 02 35 00 00 00' }, { lieu_id: 7, contact: 'Mme Rey, CPE' }],
  crescite_ateliers: [{ id: 1, spectacle_id: 1, ordre: 10, publie: true, titre: 'Atelier de préparation', duree: '2h', obligatoire: true, public: 'Lycée', paragraphes: [], etapes: [], points: [] }],
  crescite_seances: [{ id: 1, atelier_id: 1, spectacle_id: 1, date_id: 103, lieu_id: 7, jour: plus(5), heure_debut: '10:00:00', heure_fin: '12:00:00', classe: '2nde 3', niveau: 'Seconde', nb_eleves: 28, intervenants: 'Camille', statut: 'confirmee' },
    { id: 2, atelier_id: 1, spectacle_id: 1, date_id: 103, lieu_id: 7, jour: plus(45), heure_debut: '14:00:00', heure_fin: '16:00:00', classe: '2nde 5', statut: 'confirmee' }],
  crescite_textes: [],
  crescite_personnes: [
    { id: 1, slug: 'camille-essai', prenom: 'Camille', nom: 'Essai', metiers: ['comédienne'], photo: null, photo_publique: false, publie: true, ordre: 10 },
    { id: 2, slug: 'jean-durand', prenom: 'Jean', nom: 'Durand', metiers: ['régisseur général'], photo: null, photo_publique: false, publie: true, ordre: 20 },
    { id: 3, slug: 'lea-martin', prenom: 'Léa', nom: 'Martin', metiers: ['comédienne'], photo: 'portraits/lea.webp', photo_publique: false, publie: true, ordre: 30 },
  ],
  crescite_personnes_privees: [{ personne_id: 1, email: 'camille@example.org', telephone: '06 12 34 56 78', ville: 'Rouen' }, { personne_id: 2, email: null, telephone: '', ville: 'Caen' }, { personne_id: 3, telephone: '06 98 76 54 32' }],
  crescite_personnes_suivi: [],
  crescite_distributions: [
    { id: 1, spectacle_id: 1, personne_id: 1, categorie: 'jeu', fonction: '', role: 'Bérénice', en_tournee: true, publie: true, ordre: 10 },
    { id: 2, spectacle_id: 1, personne_id: 2, categorie: 'technique', fonction: 'Régie générale', en_tournee: true, publie: true, ordre: 20 },
    { id: 3, spectacle_id: 2, personne_id: 1, categorie: 'jeu', fonction: '', en_tournee: true, publie: true, ordre: 10 },
    { id: 4, spectacle_id: 2, personne_id: 3, categorie: 'jeu', fonction: '', en_tournee: true, publie: true, ordre: 20 },
  ],
  crescite_equipes: [], crescite_documents: [],
  crescite_feuilles: [{ id: 1, date_id: 101, titre: 'Caen', contenu: {}, statut: 'brouillon', version: 1, publiee_le: null }],
  crescite_acces_pro: [{ id: 1, nom: 'Le Volcan', contact: 'Mme Leroux', courriel: 'l@volcan.fr', jeton: 'abc', spectacles: [1], expire_le: plus(7), actif: true, visites: 2, derniere_visite: ilYA(300), cree_le: ilYA(3000) },
    { id: 2, nom: 'Festival d’Avignon', contact: null, jeton: 'def', spectacles: [], expire_le: plus(60), actif: true, visites: 0, cree_le: ilYA(4000) }],
  crescite_diffusion_prospects: [
    { id: 1, spectacle_id: 1, structure: 'Théâtre de Flers', commune: 'Flers', departement: '61', contact_nom: 'M. Petit', etape: 'dossier_envoye', date_dernier_contact: plus(-10), date_prochaine_relance: plus(-3), montant_estime: 3200, cree_le: ilYA(20000) },
    { id: 2, spectacle_id: 2, structure: 'Scène nationale 61', commune: 'Alençon', departement: '61', etape: 'contrat_signe', date_dernier_contact: plus(-30), date_prochaine_relance: null, montant_estime: 4500, cree_le: ilYA(30000) },
    { id: 3, spectacle_id: 1, structure: 'Le Tangram', commune: 'Évreux', departement: '27', etape: 'contact_pris', date_dernier_contact: plus(-1), date_prochaine_relance: plus(10), montant_estime: null, cree_le: ilYA(100) },
  ],
  crescite_notes_frais: [{ id: 1, personne_id: 1, date_id: 101, date_depense: plus(-2), categorie: 'repas', montant_ttc: 23.5, photo_url: null, commentaire: 'Déjeuner montage', statut: 'en_attente', cree_le: ilYA(600) },
    { id: 2, personne_id: 3, date_id: null, date_depense: plus(-12), categorie: 'transport', montant_ttc: 80, statut: 'valide', cree_le: ilYA(9000) }],
  crescite_materiel: [],
  crescite_devis_demandes: [{ id: 1, spectacle_id: 2, type_lieu: 'polyvalente', structure_nom: 'Salle des fêtes de Lisieux', commune: 'Lisieux', departement: '14', contact_nom: 'M. Dupont', contact_email: 'd@lisieux.fr', periode_souhaitee: 'mars 2027', statut: 'nouveau', cree_le: ilYA(120) },
    { id: 2, spectacle_id: 1, type_lieu: 'theatre', structure_nom: 'Théâtre de l’Arsenal', commune: 'Val-de-Reuil', contact_nom: 'Mme Bois', contact_email: 'b@arsenal.fr', statut: 'en_cours', cree_le: ilYA(5000) }],
  crescite_alertes_tournee: [{ id: 1, email: 'a@exemple.fr', departement: '14', commune: 'Caen', active: true, cree_le: ilYA(2000), confirme_le: ilYA(1900), confirmation_statut: 'envoye' },
    { id: 2, email: 'b@exemple.fr', departement: '76', commune: 'Rouen', active: true, cree_le: ilYA(50), confirme_le: null, confirmation_statut: 'envoye' }],
  crescite_dates_chiffres: [{ date_id: 104, jauge: 200, spectateurs: 180, heures_ateliers: null }],
  crescite_propositions: [{ id: 1, titre: 'Option : Théâtre de Flers', message: null, statut: 'ouverte', spectacle_id: 1, date_id: null, cree_le: ilYA(3000),
    jours: [{ id: 11, debut: `${plus(40)}T00:00:00+00:00`, fin: `${plus(41)}T00:00:00+00:00`, journee: true, reponses: [{ id: 31, personne_id: 1, reponse: 'oui', commentaire: null, repondu_le: ilYA(100) }] }],
    destinataires: [{ id: 21, personne_id: 1, courriel_statut: 'envoye', courriel_le: ilYA(2990) }, { id: 22, personne_id: 2, courriel_statut: 'envoye', courriel_le: ilYA(2990) }] }],
  crescite_journal: [
    { id: 5, quand: ilYA(10), qui: UID, table_nom: 'crescite_dates', ligne: '101', operation: 'UPDATE', avant: { id: 101, spectacle_id: 1, debut: plus(3), statut: 'option' }, apres: { id: 101, spectacle_id: 1, debut: plus(3), statut: 'confirmee' } },
    { id: 4, quand: ilYA(90), qui: UID, table_nom: 'crescite_feuilles', ligne: '1', operation: 'INSERT', avant: null, apres: { id: 1, date_id: 101, statut: 'brouillon', version: 1 } },
    { id: 3, quand: ilYA(1500), qui: null, table_nom: 'crescite_lieux', ligne: '8', operation: 'INSERT', avant: null, apres: { id: 8, nom: 'Théâtre de Flers', commune: 'Flers', departement: '61' } },
  ],
  crescite_preferences: [],
};
const ECRITURES = [];   // ce que l'administration écrit dans crescite_preferences
const SESSION = { access_token: 'x', refresh_token: 'y', token_type: 'bearer', expires_in: 864000, expires_at: Math.floor(Date.now() / 1000) + 864000, user: { id: UID, email: 'adrien@example.org', aud: 'authenticated' } };

const resultats = [];
const ok = (nom, v, detail = '') => { resultats.push([v ? 'ok' : 'KO', nom, detail]); };

async function ouvrir(navigateur, { largeur = 1600, hauteur = 1000, hash = '', sombre = false, prefsAbsentes = false } = {}) {
  const ctx = await navigateur.newContext({ viewport: { width: largeur, height: hauteur }, locale: 'fr-FR', timezoneId: 'Europe/Paris', colorScheme: sombre ? 'dark' : 'light', isMobile: largeur < 600, hasTouch: largeur < 600 });
  // la base simulée : REST lu depuis DB, les écritures de préférences gardées ; le temps réel ne répond jamais
  await ctx.route(/supabase\.co\//, async route => {
    const req = route.request(), url = new URL(req.url()), table = url.pathname.split('/').pop(), objet = /pgrst\.object/.test(req.headers().accept || '');
    const json = (status, body, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(body) });
    if (!url.pathname.startsWith('/rest/v1/')) return route.abort();
    if (prefsAbsentes && table === 'crescite_preferences') return json(404, { code: 'PGRST205', message: `Could not find the table 'public.${table}' in the schema cache` });
    if (req.method() === 'GET') {
      if (!(table in DB)) return json(404, { code: 'PGRST205', message: `Could not find the table 'public.${table}' in the schema cache` });
      let rows = DB[table];
      for (const [k, v] of url.searchParams) { const m = /^eq\.(.*)$/.exec(v); if (m && !['select', 'order', 'limit', 'offset'].includes(k)) rows = rows.filter(r => String(r[k]) === m[1]); }
      const limit = url.searchParams.get('limit'); if (limit) rows = rows.slice(0, +limit);
      if (objet) return rows.length ? json(200, rows[0]) : json(406, { code: 'PGRST116', details: 'The result contains 0 rows', message: 'JSON object requested, multiple (or no) rows returned' });
      return json(200, rows, { 'content-range': `0-${Math.max(0, rows.length - 1)}/*` });
    }
    if (req.method() === 'POST' && table === 'crescite_preferences') {
      const body = JSON.parse(req.postData() || '{}'), rows = Array.isArray(body) ? body : [body];
      for (const r of rows) { DB.crescite_preferences = DB.crescite_preferences.filter(x => !(x.user_id === r.user_id && x.cle === r.cle)); DB.crescite_preferences.push(r); ECRITURES.push(r); }
      return route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    }
    return json(200, []);
  });
  await ctx.routeWebSocket(/realtime/, () => { /* jamais relié : le direct reste éteint */ });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|net::ERR|WebSocket/i.test(m.text())) erreurs.push(m.text()); });
  await page.addInitScript(`localStorage.setItem('crescite-admin', ${JSON.stringify(JSON.stringify(SESSION))});`);
  await page.goto(`${URL0}${hash}`);
  await page.waitForSelector('main#vue', { timeout: 20000 });
  return { ctx, page, erreurs };
}
const texte = async (page, sel) => (await page.$eval(sel, e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => ''));
const compte = async (page, sel) => page.$$eval(sel, xs => xs.length);
const tuile = k => `.tb-tuile[data-k="${k}"]`;

const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(CAPT, { recursive: true });

// ================================================================================ à l'ordinateur : la page d'ouverture
{
  const { ctx, page, erreurs } = await ouvrir(navigateur);
  await page.waitForSelector(`${tuile('journal')} .tb-l, ${tuile('journal')} .tb-rien:not([role])`, { timeout: 15000 }).catch(() => {});
  await page.waitForSelector(`${tuile('propositions')} .tb-l`, { timeout: 15000 }).catch(() => {});
  ok('l’administration s’ouvre sur le tableau de bord', await page.evaluate(() => location.hash) === '#/accueil' && (await texte(page, 'main h1')) === 'Tableau de bord', await page.evaluate(() => location.hash));
  ok('la rubrique « Tableau de bord » est la rubrique courante, douze rubriques dans l’en-tête', (await texte(page, '.nav a[aria-current="page"]')) === 'Tableau de bord' && await page.$eval('.barre', e => e.classList.contains('douze')));
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
  const attendu = { 'Demandes de devis à répondre': 1, 'Relances de diffusion en retard': 1, 'Notes de frais à valider': 1, 'Options à confirmer': 1, 'Dates sans horaire': 1, 'Contrats à suivre': 2, 'Feuilles de route à publier': 2, 'Propositions de dates en attente': 1, 'Invitations pro qui échoient': 1 };
  ok('« À traiter » : neuf sujets, les bons comptes', JSON.stringify(Object.fromEntries(cats)) === JSON.stringify(attendu), JSON.stringify(cats));
  ok('« À traiter » : le badge fait le total (11)', (await texte(page, `${tuile('urgent')} .tb-badge`)) === '11', await texte(page, `${tuile('urgent')} .tb-badge`));
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
  ok('avant la tournée : Jean Durand sans téléphone, le lycée sans adresse, trois feuilles à composer (les répétitions aussi) ; badge 5', JSON.stringify(avant) === JSON.stringify([['Téléphones', ['Jean Durand']], ['Lieux', ['Lycée Voltaire, Paris']], ['Feuilles de route', [`${jours[0]} · Le Volcan, Le Havre`, `${jours[1]} · Lycée Voltaire, Paris`, `${jours[2]} · Théâtre de Caen, Caen`]]]) && (await texte(page, `${tuile('avant')} .tb-badge`)) === '5', JSON.stringify(avant));
  ok('le téléphone manquant vise le champ de la fiche', await page.$eval(`${tuile('avant')} a[href="#/equipe/2"]`, e => e.dataset.viser) === 'telephone');
  // prochaines dates
  const prochaines = await page.$$eval(`${tuile('prochaines')} .tb-l`, xs => xs.map(x => x.getAttribute('href').split('/').pop()));
  ok('prochaines dates : six, par ordre, options et répétitions comprises', prochaines.join(',') === '101,102,103,105,106,107', prochaines.join(','));
  ok('la date sans horaire dit « heure ? » ; la scolaire porte ses deux séances', /heure \?/.test(await texte(page, `${tuile('prochaines')} a[href="#/representations/102"]`)) && (await compte(page, `${tuile('prochaines')} a[href="#/representations/103"] .rep.sco`)) === 2);
  // la saison en chiffres
  const kpi = await page.$$eval(`${tuile('chiffres')} .tb-kpi > *`, xs => xs.map(x => `${x.querySelector('span').textContent}=${x.querySelector('b').textContent}${x.querySelector('small') ? ` (${x.querySelector('small').textContent})` : ''}`));
  ok('la saison en chiffres : 4 dates (1 jouée, 3 à venir), 5 représentations, 3 lieux dans 3 départements, 1 scolaire, 2 séances (4 h), 180 spectateurs', kpi.join(' | ') === 'Dates confirmées=4 (1 jouée, 3 à venir) | Représentations=5 | Lieux=3 (dans 3 départements) | Séances scolaires=1 | Séances d’atelier=2 (4 h d’éducation artistique) | Spectateurs=180 (sur 1 date renseignée)', kpi.join(' | '));
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
  ok('dernières modifications : trois lignes, chacune vers sa fiche', journal.join('|') === '#/representations/101 Modification · Date|#/feuilles/101 Ajout · Feuille de route|#/lieux/8 Ajout · Lieu', journal.join('|'));
  ok('la modification dit son auteur et son âge', /il y a 10 min/.test(await texte(page, `${tuile('journal')} .tb-l:first-child .tb-l-d`)) && /Adrien/.test(await texte(page, `${tuile('journal')} .tb-l:first-child .tb-l-d`)));
  ok('la recherche rapide connaît la rubrique', await page.evaluate(() => indexRch().some(x => x.type === 'Rubrique' && x.href === '#/accueil')));
  await page.screenshot({ path: `${CAPT}/tableau.png`, fullPage: true });

  // ---- un lien vise le champ : l'option s'ouvre, le bouton « Confirmée » a le focus
  await page.click(`${tuile('urgent')} a[href="#/representations/105"]`);
  await page.waitForFunction(() => location.hash === '#/representations/105' && document.querySelector('#ed-date [data-statut="confirmee"]'), null, { timeout: 8000 });
  await page.waitForTimeout(120);
  ok('la ligne ouvre la date, le focus sur « Confirmée »', await page.evaluate(() => document.activeElement?.dataset?.statut === 'confirmee'), await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80)));
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
  ok('réglage « 30 prochains jours » : la répétition dans 50 jours sort, badge 4', (await texte(page, `${tuile('avant')} .tb-badge`)) === '4', await texte(page, `${tuile('avant')} .tb-badge`));
  await page.click(`${tuile('urgent')} [data-tb-reglages]`);
  await page.uncheck(`${tuile('urgent')} input[data-tb-reg="categories"][value="contrats"]`);
  ok('« À traiter » sans les contrats : badge 9, le sujet disparaît', (await texte(page, `${tuile('urgent')} .tb-badge`)) === '9' && (await compte(page, `${tuile('urgent')} a[data-viser="#s-contrat"]`)) === 0);
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
  ok('les réglages aussi (5 dates, sans les options ; sans les contrats)', (await compte(page, `${tuile('prochaines')} .tb-l`)) === 5 && (await compte(page, `${tuile('prochaines')} a[href="#/representations/105"]`)) === 0 && (await texte(page, `${tuile('urgent')} .tb-badge`)) === '9');
  await page.click('#tb-personnaliser');
  page.once('dialog', d => d.accept());
  await page.click('#tb-reinit');
  await page.waitForTimeout(200);
  const defaut = await page.$$eval('.tb-tuile', xs => xs.map(x => x.dataset.k));
  ok('« Réinitialiser » remet la disposition d’origine', defaut.join(',') === 'actions,urgent,avant,prochaines,chiffres,equipe,diffusion,propositions,ateliers,journal' && await page.$eval('#tb-grille', e => e.dataset.colonnes === 'auto'), defaut.join(','));
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
  const local = await page.evaluate(() => JSON.parse(localStorage.getItem('crescite-admin-tableau') || 'null'));
  ok('la disposition est dans le stockage de l’appareil', local && local.tuiles.find(t => t.k === 'equipe').visible === false, JSON.stringify(local).slice(0, 120));
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
  ok('aucune erreur de script', erreurs.length === 0, erreurs.join(' / '));
  await ctx.close();
  const s = await ouvrir(navigateur, { sombre: true, hash: '#/accueil' });
  await s.page.waitForSelector(`${tuile('journal')} .tb-l`, { timeout: 15000 });
  ok('en sombre : le fond des tuiles suit le thème', (await s.page.$eval('.tb-tuile', e => getComputedStyle(e).backgroundColor)) === 'rgb(33, 27, 36)', await s.page.$eval('.tb-tuile', e => getComputedStyle(e).backgroundColor));
  await s.page.screenshot({ path: `${CAPT}/sombre.png`, fullPage: false });
  await s.ctx.close();
}

await navigateur.close();
serveur.close();
let ko = 0;
for (const [etat, nom, detail] of resultats) { if (etat === 'KO') ko++; console.log(`${etat === 'ok' ? '  ✓' : '  ✗'} ${nom}${etat === 'KO' && detail ? `\n      ${detail}` : ''}`); }
console.log(`\n${resultats.length - ko} vérification${resultats.length - ko > 1 ? 's' : ''} sur ${resultats.length} · captures dans ${path.relative(ROOT, CAPT)}/`);
process.exit(ko ? 1 : 0);
