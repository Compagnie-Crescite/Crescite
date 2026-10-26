// La base fictive de l’administration, commune aux harnais (tableau.mjs, niveau.mjs) : un petit serveur qui sert
// admin/ et maquettes/src/, les lectures et écritures REST de Supabase simulées (DB, MODIFS, ECRITURES), la session posée
// dans le stockage du navigateur, le temps réel coupé, les polices coupées. Aucune donnée réelle, aucun appel à la base.
// ouvrir(navigateur, { largeur, hauteur, hash, sombre, prefsAbsentes }) → { ctx, page, erreurs } ; ok(nom, v, detail) note une
// vérification ; bilan(CAPT) les imprime, ferme le serveur et sort en erreur si une manque.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs');

const ICI = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(ICI, '..');
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
  crescite_textes: [{ cle: 'coordonnees', valeur: { nom: 'Compagnie Crescite', adresse: ['72 boulevard d’Orléans', '76100 Rouen'], legal: ['Siret 000 000 000 00000', 'Licence 2-000000'] } },
    { cle: 'programmation', valeur: { contact: { nom: 'Adrien Vada', role: 'Directeur artistique', email: 'contact@crescite.fr', telephone: '' } } }],
  crescite_notes: [],
  crescite_indisponibilites: [{ id: 1, personne_id: 2, debut: `${plus(3)}T00:00:00+00:00`, fin: `${plus(4)}T00:00:00+00:00`, journee: true, motif: 'Tournage' }],
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
    { id: 2, quand: ilYA(2000), qui: UID, table_nom: 'crescite_lieux', ligne: '9', operation: 'DELETE', avant: { id: 9, nom: 'Salle Jeanne-d’Arc', type: 'salle', commune: 'Rouen', departement: '76', pays: 'FR', adresse: null, latitude: 49.44, longitude: 1.1 }, apres: null },
  ],
  crescite_preferences: [],
};
const ECRITURES = [];   // ce que l'administration écrit dans crescite_preferences
const MODIFS = [];      // les autres écritures (les actions directes des menus)
const SESSION = { access_token: 'x', refresh_token: 'y', token_type: 'bearer', expires_in: 864000, expires_at: Math.floor(Date.now() / 1000) + 864000, user: { id: UID, email: 'adrien@example.org', aud: 'authenticated' } };

const resultats = [];
const ok = (nom, v, detail = '') => { resultats.push([v ? 'ok' : 'KO', nom, detail]); };

// avant une capture : les transitions de vue et de survol finies, puis un souffle
async function calme(page) {
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})))).catch(() => {});
  await page.waitForTimeout(400);
}

async function ouvrir(navigateur, { largeur = 1600, hauteur = 1000, hash = '', sombre = false, prefsAbsentes = false } = {}) {
  const ctx = await navigateur.newContext({ viewport: { width: largeur, height: hauteur }, locale: 'fr-FR', timezoneId: 'Europe/Paris', colorScheme: sombre ? 'dark' : 'light', isMobile: largeur < 600, hasTouch: largeur < 600 });
  // la base simulée : REST lu depuis DB, les écritures de préférences gardées ; le temps réel ne répond jamais
  await ctx.route(/fonts\.g(oogleapis|static)\.com/, r => r.abort());   // (hors ligne : les polices du système)
  await ctx.route(/supabase\.co\//, async route => {
    const req = route.request(), url = new URL(req.url()), table = url.pathname.split('/').pop(), objet = /pgrst\.object/.test(req.headers().accept || '');
    const json = (status, body, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(body) });
    if (url.pathname.startsWith('/storage/v1/object/')) {   // le stockage : un fichier envoyé, retiré
      const reste = url.pathname.slice('/storage/v1/object/'.length).split('/').map(decodeURIComponent), seau = reste[0], chemin = reste.slice(1).join('/');
      if (req.method() === 'POST' || req.method() === 'PUT') { MODIFS.push({ stockage: seau, envoi: chemin }); return json(200, { Key: `${seau}/${chemin}`, Id: 'f-essai' }); }
      if (req.method() === 'DELETE') { MODIFS.push({ stockage: seau, retrait: JSON.parse(req.postData() || '{}').prefixes || [] }); return json(200, []); }
      return json(200, {});
    }
    if (!url.pathname.startsWith('/rest/v1/')) return route.abort();
    if (url.pathname.startsWith('/rest/v1/rpc/')) { MODIFS.push({ rpc: table, corps: JSON.parse(req.postData() || '{}') }); return json(200, table === 'crescite_prevenir_equipe' ? 2 : null); }
    if (prefsAbsentes && table === 'crescite_preferences') return json(404, { code: 'PGRST205', message: `Could not find the table 'public.${table}' in the schema cache` });
    if (req.method() === 'GET') {
      if (!(table in DB)) return json(404, { code: 'PGRST205', message: `Could not find the table 'public.${table}' in the schema cache` });
      let rows = DB[table];
      for (const [k, v] of url.searchParams) { const m = /^eq\.(.*)$/.exec(v); if (m && !['select', 'order', 'limit', 'offset'].includes(k)) rows = rows.filter(r => String(r[k]) === m[1]); }
      const limit = url.searchParams.get('limit'); if (limit) rows = rows.slice(0, +limit);
      if (objet) return rows.length ? json(200, rows[0]) : json(406, { code: 'PGRST116', details: 'The result contains 0 rows', message: 'JSON object requested, multiple (or no) rows returned' });
      return json(200, rows, { 'content-range': `0-${Math.max(0, rows.length - 1)}/*` });
    }
    if (req.method() === 'PATCH' && table in DB) {
      const body = JSON.parse(req.postData() || '{}');
      let rows = DB[table];
      for (const [k, v] of url.searchParams) { let m; if ((m = /^eq\.(.*)$/.exec(v))) rows = rows.filter(r => String(r[k]) === m[1]); else if ((m = /^in\.\((.*)\)$/.exec(v))) { const xs = m[1].split(','); rows = rows.filter(r => xs.includes(String(r[k]))); } }
      rows.forEach(r => Object.assign(r, body));
      MODIFS.push({ table, body, n: rows.length });
      if (objet) return rows.length ? json(200, rows[0]) : json(406, { code: 'PGRST116', details: 'The result contains 0 rows' });
      return route.fulfill({ status: 204, body: '' });
    }
    if (req.method() === 'POST' && table === 'crescite_preferences') {
      const body = JSON.parse(req.postData() || '{}'), rows = Array.isArray(body) ? body : [body];
      for (const r of rows) { DB.crescite_preferences = DB.crescite_preferences.filter(x => !(x.user_id === r.user_id && x.cle === r.cle)); DB.crescite_preferences.push(r); ECRITURES.push(r); }
      return route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    }
    if (req.method() === 'POST' && table in DB) {   // une insertion, ou un upsert (on_conflict) : appliqué à la base simulée, gardé dans MODIFS
      const body = JSON.parse(req.postData() || '{}'), rows = Array.isArray(body) ? body : [body], cles = (url.searchParams.get('on_conflict') || '').split(',').filter(Boolean);
      for (const r of rows) { const existant = cles.length ? DB[table].find(x => cles.every(k => String(x[k]) === String(r[k]))) : null; if (existant) Object.assign(existant, r); else DB[table].push({ id: 9000 + DB[table].length, ...r }); }
      MODIFS.push({ table, post: rows, conflit: cles });
      return objet ? json(201, rows[0]) : route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    }
    if (req.method() === 'DELETE' && table in DB) {
      let rows = DB[table];
      for (const [k, v] of url.searchParams) { let m; if ((m = /^eq\.(.*)$/.exec(v))) rows = rows.filter(r => String(r[k]) === m[1]); else if ((m = /^in\.\((.*)\)$/.exec(v))) { const xs = m[1].split(','); rows = rows.filter(r => xs.includes(String(r[k]))); } }
      DB[table] = DB[table].filter(x => !rows.includes(x)); MODIFS.push({ table, delete: rows.map(x => x.id ?? x), n: rows.length });
      return route.fulfill({ status: 204, body: '' });
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


function bilan(CAPT) {
  serveur.close();
  let ko = 0;
  for (const [etat, nom, detail] of resultats) { if (etat === 'KO') ko++; console.log(`${etat === 'ok' ? '  ✓' : '  ✗'} ${nom}${etat === 'KO' && detail ? `\n      ${detail}` : ''}`); }
  console.log(`\n${resultats.length - ko} vérification${resultats.length - ko > 1 ? 's' : ''} sur ${resultats.length} · captures dans ${path.relative(ROOT, CAPT)}/`);
  process.exit(ko ? 1 : 0);
}
export { chromium, ICI, ROOT, serveur, URL0, iso, plus, saisonDe, ilYA, UID, DB, ECRITURES, MODIFS, SESSION, resultats, ok, calme, ouvrir, texte, compte, tuile, bilan };
