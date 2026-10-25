// Les alertes de tournée de bout en bout (le onzième script et la fonction crescite-courriel), dans un Postgres local
// (PGlite) : les scripts 1 à 11, le onzième relancé, puis le septième et le troisième relancés après lui sans rien
// affaiblir. Le public dépose une alerte, jamais confirmée, sans choisir son jeton ni lire celles des autres, dans les
// limites (cinq alertes actives par adresse, un courriel de confirmation par adresse et par 24 heures, une alerte
// déposée deux fois ne se double pas) ; la confirmation et la désinscription par le jeton (la page de réponse, le geste
// d'une messagerie) ; les dates d'une alerte (la distance, le département, la Corse, le spectacle ; ni les scolaires, ni
// les passées, ni les masquées) ; un courriel par alerte, jamais deux fois la même date ; 200 courriels par passage ;
// l'effacement des alertes non confirmées ; sans clé d'envoi, « non_configure ». La fonction (écrite pour Deno) tourne
// dans Node, comme dans courriel.mjs : Brevo et Resend sont simulés, rien ne part. Toutes les adresses sont fictives.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const migration = f => new URL(`../migrations/${f}`, import.meta.url);
const FICHIERS = ['20261020_crescite_base.sql', '20261021_crescite_equipe.sql', '20261022_crescite_notifications.sql',
  '20261023_crescite_pro.sql', '20261024_crescite_disponibilites.sql', '20261025_crescite_preferences.sql',
  '20261026_crescite_ideale.sql', '20261027_crescite_documents_publics.sql', '20261028_crescite_signaler.sql',
  '20261029_crescite_chiffres.sql', '20261030_crescite_alertes.sql'].filter(f => existsSync(migration(f)));
const S = Object.fromEntries(FICHIERS.map(f => [f.slice(9, -4), readFileSync(migration(f), 'utf8')]));   // « crescite_alertes » …
const db = new PGlite();
const ok = (c, m) => { if (!c) { console.log('ÉCHEC :', m); process.exitCode = 1; } else console.log('ok :', m); };
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
  create schema storage; create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, unique (bucket_id, name));
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language plpgsql immutable as $$
    declare p text[] := string_to_array(name, '/'); begin return p[1:array_length(p, 1) - 1]; end $$;
  grant usage on schema storage to anon, authenticated, service_role;
  grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
  grant execute on function storage.foldername(text) to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  -- comme Supabase : une table et une fonction neuves sont ouvertes à anon et authenticated (les scripts referment)
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  -- pg_net de Supabase : un substitut qui note les appels
  create schema net; create table net.appels (url text, body jsonb, headers jsonb);
  create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
    returns bigint language sql as $$ insert into net.appels values (url, body, headers); select 1::bigint $$;
  -- pg_cron : un substitut qui garde les tâches (et l'extension inscrite, comme si elle était activée)
  create schema cron; create table cron.job (jobid bigserial primary key, jobname text, schedule text, command text);
  create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.job (jobname, schedule, command) values (n, s, c) returning jobid $$;
  create function cron.unschedule(id bigint) returns boolean language sql as $$ delete from cron.job where jobid = id returning true $$;
  insert into pg_catalog.pg_extension (oid, extname, extowner, extnamespace, extrelocatable, extversion)
    values (987654, 'pg_cron', 10, (select oid from pg_namespace where nspname = 'public'), false, '1.6');
`);
try { await db.exec('create publication supabase_realtime'); } catch (e) { /* pas de publication ici */ }
const echecs = [];
let fin;
for (const f of FICHIERS) { try { fin = await db.exec(readFileSync(migration(f), 'utf8')); } catch (e) { echecs.push(`${f} : ${e.message}`); } }
for (const k of ['crescite_alertes', 'crescite_alertes']) { try { fin = await db.exec(S[k]); } catch (e) { echecs.push(`${k} relancé : ${e.message}`); } }
ok(!echecs.length && FICHIERS.length >= 10, `les ${FICHIERS.length} scripts passent, le onzième se relance sans erreur${echecs.length ? ` (${echecs.join(' ; ')})` : ''}`);
const etat = Object.fromEntries(fin.at(-1).rows.map(r => [r['élément'], r['état']]));
ok(/^prêtes/.test(etat['alertes de tournée']) && /^chaque matin à 7 h 17/.test(etat['envoi quotidien']) && /^aucune alerte/.test(etat.inscrits),
  `il dit ce qui est en place : ${Object.values(etat).join(' | ')}`);
const taches = (await db.query(`select schedule, command from cron.job where jobname = 'crescite-alertes'`)).rows;
ok(taches.length === 1 && taches[0].schedule === '17 7 * * *', 'une seule tâche pg_cron « crescite-alertes », chaque matin à 7 h 17, même relancé');
const jetonBase = (await db.query(`select valeur from public.crescite_secrets where cle = 'jeton_push'`)).rows[0].valeur;
await db.exec(`delete from net.appels; ${taches[0].command}`);
const appelCron = (await db.query(`select url, body, headers from net.appels`)).rows;
ok(appelCron.length === 1 && appelCron[0].url.endsWith('/functions/v1/crescite-courriel') && appelCron[0].body.alertes === true
   && appelCron[0].headers['x-crescite-jeton'] === jetonBase, 'la tâche appelle crescite-courriel { alertes: true } avec le jeton de la base');

// ---------------------------------------------------------------------------------------------- les données
const U = { admin: '11111111-1111-1111-1111-111111111111', equipe: '22222222-2222-2222-2222-222222222222' };
for (const k in U) await db.exec(`insert into auth.users values ('${U[k]}', '${k}@exemple.fr')`);
await db.exec(`insert into public.crescite_admins (user_id) values ('${U.admin}')`);
await db.exec(`insert into public.crescite_personnes (slug, prenom, nom) values ('membre', 'Prénom', 'Membre')`);
await db.exec(`insert into public.crescite_personnes_privees (personne_id, email, user_id) select id, 'equipe@exemple.fr', '${U.equipe}' from public.crescite_personnes where slug = 'membre'`);
const id = async (q, p = []) => (await db.query(q, p)).rows[0]?.id;
const SP = {};
for (const [slug, titre, publie] of [['berenice', 'Bérénice', true], ['cleophene', 'Cléophène', true], ['brouillon', 'Le Brouillon', false]]) {
  SP[slug] = await id(`insert into public.crescite_spectacles (slug, titre, publie) values ($1, $2, $3) returning id`, [slug, titre, publie]);
}
const L = {};
for (const [k, nom, commune, dep, lat, lon] of [
  ['rouen', 'Théâtre de la Ville', 'Rouen', '76', 49.443, 1.099], ['pontaudemer', 'Salle des Fêtes', 'Pont-Audemer', '27', 49.355, 0.515],
  ['elbeuf', 'Le Grand Salon', 'Elbeuf', '76', 49.291, 1.008], ['havre', 'La Halle', 'Le Havre', '76', 49.494, 0.108],
  ['ajaccio', 'Théâtre du Port', 'Ajaccio', '2A', 41.919, 8.738], ['bastia', 'Salle du Vieux Port', 'Bastia', '2B', 42.697, 9.450],
  ['reunion', 'Salle de l’Océan', 'Saint-Denis', '974', -20.882, 55.450], ['evreux', 'Salle sans position', 'Évreux', '27', null, null],
  ['caen', 'La Fabrique', 'Caen', '14', 49.183, -0.370]]) {
  L[k] = await id(`insert into public.crescite_lieux (nom, commune, departement, latitude, longitude) values ($1, $2, $3, $4, $5) returning id`, [nom, commune, dep, lat, lon]);
}
const jour = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
// une date (statut, public, visible, nature, lien, et ses séances : [jour, heure, public, lien])
const D = {};
const date = async (k, sp, lieu, n, o = {}) => {
  D[k] = await id(`insert into public.crescite_dates (spectacle_id, lieu_id, debut, fin, public, statut, visible, nature, lien)
    values ($1, $2, $3, $3, $4, $5, $6, $7, $8) returning id`,
    [SP[sp], L[lieu], jour(n), o.public || 'tout_public', o.statut || 'confirmee', o.visible ?? true, o.nature || 'representations', o.lien || null]);
  for (const [j, h, pub, lien] of o.seances || []) {
    await db.query(`insert into public.crescite_representations (date_id, jour, heure, public, lien) values ($1, $2, $3, $4, $5)`, [D[k], jour(j), h, pub || 'tout_public', lien || null]);
  }
};
await date('rouen', 'berenice', 'rouen', 10, { lien: 'https://billetterie.exemple.fr/rouen', seances: [[10, '20:30']] });
await date('pontaudemer', 'cleophene', 'pontaudemer', 20, { public: 'mixte', seances: [[20, '14:00', 'scolaire'], [20, '20:30', 'tout_public', 'https://billetterie.exemple.fr/pont-audemer']] });
await date('elbeufScolaire', 'berenice', 'elbeuf', 12, { public: 'scolaire' });
await date('elbeuf', 'cleophene', 'elbeuf', 14, { public: 'mixte' });
await date('passee', 'berenice', 'rouen', -10);
await date('masquee', 'berenice', 'rouen', 15, { visible: false });
await date('option', 'berenice', 'rouen', 16, { statut: 'option' });
await date('annulee', 'berenice', 'rouen', 17, { statut: 'annulee' });
await date('residence', 'berenice', 'rouen', 18, { nature: 'residence' });
await date('brouillon', 'brouillon', 'rouen', 19);
await date('havre', 'berenice', 'havre', 21);
await date('ajaccio', 'berenice', 'ajaccio', 22);
await date('bastia', 'cleophene', 'bastia', 23);
await date('reunion', 'berenice', 'reunion', 24);
await date('evreux', 'berenice', 'evreux', 25);
await date('caenAutre', 'berenice', 'caen', 26, { public: 'autre' });
await db.exec(`delete from net.appels`);

const as = async (role, sub, q, params = [], entetes = '{}') => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub || ''}', false),
    set_config('request.jwt.claims', '', false), set_config('request.headers', '${entetes}', false);`);
  try { return await db.query(q, params); } finally { await db.exec('reset role'); }
};
const essai = async (...a) => { try { await as(...a); return 'ok'; } catch (e) { return e.message; } };
const erreur = async (...a) => { try { await as(...a); return null; } catch (e) { return e; } };
// ce que dépose le formulaire du site : une ligne, par l'API, sous le rôle du public (anon)
const COLS = ['email', 'code_postal', 'commune', 'departement', 'lat', 'lon', 'rayon_km', 'spectacle_id', 'confirme_le', 'token_desinscription',
  'confirmation_statut', 'cree_le', 'active', 'derniere_notification_le', 'push_subscription'];
const inscrire = (ligne, role = 'anon', sub = '') => {
  const ks = COLS.filter(k => k in ligne);
  return erreur(role, sub, `insert into public.crescite_alertes_tournee (${ks.join(', ')}) values (${ks.map((k, i) => `$${i + 1}`).join(', ')})`, ks.map(k => ligne[k]));
};
const alertesDe = async m => (await db.query(`select * from public.crescite_alertes_tournee where lower(email) = $1 order by id`, [m])).rows;
const appels = async () => (await db.query(`select body, headers from net.appels`)).rows;
const vieillir = (m, heures) => db.exec(`update public.crescite_alertes_tournee set confirmation_le = confirmation_le - interval '${heures} hours' where lower(email) = '${m}'`);

// ---------------------------------------------------------------------------------------------- le dépôt
ok(await inscrire({ email: ' A@Exemple.FR ', code_postal: '76000', commune: 'Rouen', lat: 49.44, lon: 1.10, confirme_le: new Date().toISOString(),
  token_desinscription: 'x'.repeat(32), confirmation_statut: 'envoye', cree_le: '2020-01-01', derniere_notification_le: null,
  push_subscription: '{"endpoint":"https://push.exemple.fr"}' }) === null, 'le public dépose une alerte (géolocalisée autour de Rouen)');
const [a] = await alertesDe('a@exemple.fr');
ok(a && a.confirme_le === null && a.confirmation_statut === 'en_cours' && a.token_desinscription !== 'x'.repeat(32) && /^[0-9a-f]{32}$/.test(a.token_desinscription)
   && new Date(a.cree_le).getFullYear() > 2020 && a.push_subscription === null && a.email === 'a@exemple.fr' && a.departement === '76',
  'jamais confirmée, ni son jeton ni sa date choisis par le public ; l’adresse en minuscules, le département déduit du code postal');
let ap = await appels();
ok(ap.length === 1 && ap[0].body.alerte_confirmation === Number(a.id) && ap[0].headers['x-crescite-jeton'] === jetonBase,
  'le courriel de confirmation est demandé à crescite-courriel, avec le jeton de la base');
ok(await inscrire({ email: 'pas-une-adresse', code_postal: '76000' }) !== null && await inscrire({ email: 'z@exemple.fr', commune: 'Quelque part' }) !== null
   && await inscrire({ email: 'z@exemple.fr', code_postal: '99999' }) !== null && await inscrire({ email: 'z@exemple.fr', code_postal: '76000', rayon_km: 5000 }) !== null
   && (await alertesDe('z@exemple.fr')).length === 0, 'refusée : une adresse invalide, un secteur introuvable, un rayon de 5 000 km');
ok(await inscrire({ email: 'a@exemple.fr', code_postal: '76000', active: false }, 'authenticated', U.equipe) === null
   && (await alertesDe('a@exemple.fr')).length === 2 && (await alertesDe('a@exemple.fr'))[1].active === true
   && (await alertesDe('a@exemple.fr'))[1].confirme_le === null, 'un compte connecté dépose comme le public (active, en attente)');
ok((await appels()).length === 1, 'la seconde alerte de l’adresse, dans les 24 heures : pas de second courriel (le lien du premier la confirmera)');
await inscrire({ email: 'a@exemple.fr', code_postal: '76100', commune: 'Rouen' });
ok((await alertesDe('a@exemple.fr')).length === 2, 'la même alerte déposée deux fois (même département, même spectacle) ne se double pas');
// l'ancien formulaire écrivait « Rouen (76) » partout
await inscrire({ email: 'vieux@exemple.fr', code_postal: 'Rouen (76)', commune: 'Rouen (76)' });
const [vieux] = await alertesDe('vieux@exemple.fr');
ok(vieux && vieux.departement === '76' && vieux.commune === 'Rouen' && vieux.code_postal === null, 'un secteur « Rouen (76) » se relit : commune Rouen, département 76');
// cinq alertes actives au plus par adresse
for (const cp of ['14000', '27000', '50000', '61000', '53000']) await inscrire({ email: 'cinq@exemple.fr', code_postal: cp });
const sixieme = await inscrire({ email: 'Cinq@exemple.fr', code_postal: '80000' });
ok((await alertesDe('cinq@exemple.fr')).length === 5 && sixieme?.code === 'PT429' && /cinq alertes/.test(sixieme.message),
  'cinq alertes actives au plus par adresse : la sixième est refusée (429), son message dit pourquoi');
await db.exec(`update public.crescite_alertes_tournee set active = false where email = 'cinq@exemple.fr' and code_postal = '14000'`);
ok(await inscrire({ email: 'cinq@exemple.fr', code_postal: '80000' }) === null, 'une alerte désactivée libère sa place');
// un courriel de confirmation par adresse et par 24 heures
const avant = (await appels()).length;
await vieillir('a@exemple.fr', 25);
await inscrire({ email: 'a@exemple.fr', code_postal: '14000' });
ap = await appels();
ok(ap.length === avant + 1 && (await alertesDe('a@exemple.fr')).at(-1).confirmation_statut === 'en_cours', '24 heures plus tard, un nouveau courriel de confirmation part');
// 50 adresses au plus par 24 heures : les suivantes attendent le passage du matin
await db.exec(`insert into public.crescite_alertes_tournee (email, code_postal, confirmation_statut, confirmation_le)
  select 'lot' || i || '@exemple.fr', '76000', 'envoye', now() from generate_series(1, 50) i`);
const n0 = (await appels()).length;
await inscrire({ email: 'cinquante-et-un@exemple.fr', code_postal: '76000' });
ok((await appels()).length === n0 && (await alertesDe('cinquante-et-un@exemple.fr'))[0].confirmation_statut === null,
  'au-delà de 50 adresses en 24 heures, le courriel attend le passage du matin');
await db.exec(`delete from public.crescite_alertes_tournee where email like 'lot%@exemple.fr'`);

// ---------------------------------------------------------------------------------------------- ce que le public lit et touche
ok((await as('anon', '', `select count(*)::int n from public.crescite_alertes_tournee`)).rows[0].n === 0
   && (await as('authenticated', U.equipe, `select count(*)::int n from public.crescite_alertes_tournee`)).rows[0].n === 0
   && (await as('anon', '', `select count(*)::int n from public.crescite_alertes_tournee`, [], JSON.stringify({ 'x-token': 'x'.repeat(32) }))).rows[0].n === 0,
  'le public et l’équipe ne lisent aucune alerte (ni avec un jeton inventé)');
ok((await as('anon', '', `select email from public.crescite_alertes_tournee`, [], JSON.stringify({ 'x-token': a.token_desinscription }))).rows.length === 1,
  'avec le vrai jeton (celui des courriels), la sienne seulement');
ok(await essai('anon', '', `update public.crescite_alertes_tournee set confirme_le = now()`) !== 'ok'
   && await essai('authenticated', U.equipe, `update public.crescite_alertes_tournee set confirme_le = now() returning id`) === 'ok'
   && (await db.query(`select count(*)::int n from public.crescite_alertes_tournee where confirme_le is not null`)).rows[0].n === 0,
  'personne d’autre que l’administration ne confirme une alerte (le public n’a pas le droit, l’équipe ne voit rien à changer)');
ok(await essai('anon', '', `select * from public.crescite_alertes_envois`) !== 'ok' && await essai('authenticated', U.admin, `select * from public.crescite_alertes_envois`) !== 'ok'
   && await essai('anon', '', `insert into public.crescite_alertes_envois values (1, 1, now(), 'envoye')`) !== 'ok', 'ce qui a été écrit aux alertes reste à la fonction');
ok(await essai('anon', '', `select public.crescite_alerte_confirmer($1)`, [a.token_desinscription]) !== 'ok'
   && await essai('authenticated', U.equipe, `select public.crescite_alertes_lot(10)`) !== 'ok'
   && await essai('anon', '', `select public.crescite_alerte_jeton($1)`, [a.token_desinscription]) !== 'ok',
  'les fonctions de la page et du passage ne s’appellent pas par l’API');
ok((await as('authenticated', U.admin, `select count(*)::int n from public.crescite_alertes_tournee`)).rows[0].n > 0
   && await essai('authenticated', U.admin, `update public.crescite_alertes_tournee set active = false where email = 'vieux@exemple.fr'`) === 'ok',
  'l’administration lit les alertes et en désactive une');

// ---------------------------------------------------------------------------------------------- la fonction
const ENV = { SUPABASE_DB_URL: 'postgres://local', SUPABASE_URL: 'https://projet.exemple.supabase.co', SITE_URL: 'https://site.exemple.fr/Crescite/', BREVO_API_KEY: 'essai' };
let servir;
globalThis.Deno = { env: { get: k => ENV[k] }, serve: h => { servir = h; } };
globalThis.__postgres = () => (parts, ...vals) => db.query(parts.reduce((q, s, i) => q + s + (i < vals.length ? `$${i + 1}` : ''), ''), vals).then(r => r.rows);
const envoyes = [];
let panneBrevo = false;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (!u.startsWith('https://api.brevo.com/') && !u.startsWith('https://api.resend.com/')) throw new Error(`appel inattendu : ${u}`);
  const corps = JSON.parse(init.body);
  envoyes.push({ service: u.includes('brevo') ? 'brevo' : 'resend', corps,
    a: u.includes('brevo') ? corps.to[0].email : corps.to[0], html: corps.htmlContent || corps.html, texte: corps.textContent || corps.text, sujet: corps.subject });
  return panneBrevo ? new Response('{"message":"panne"}', { status: 500 }) : new Response('{"messageId":"essai"}', { status: 201 });
};
const dossier = mkdtempSync(join(tmpdir(), 'crescite-alertes-'));
const charger = async nom => {
  const src = readFileSync(new URL('../functions/crescite-courriel/index.ts', import.meta.url), 'utf8')
    .replace(/^import postgres from 'npm:postgres@[^']+';$/m, 'const postgres = globalThis.__postgres;');
  writeFileSync(join(dossier, nom), stripTypeScriptTypes(src));
  await import(pathToFileURL(join(dossier, nom)).href);
};
await charger('brevo.mjs');
const ICI = 'https://projet.exemple.supabase.co/functions/v1/crescite-courriel';
const appel = (methode, corps, entetes = {}, q = '') => servir(new Request(ICI + q, { method: methode, headers: { 'Content-Type': 'application/json', ...entetes },
  body: corps === undefined ? undefined : (typeof corps === 'string' ? corps : JSON.stringify(corps)) }));
const parLaBase = corps => appel('POST', corps, { 'x-crescite-jeton': jetonBase });
const vider = () => envoyes.splice(0);

// la confirmation, demandée par la base
ok((await appel('POST', { alerte_confirmation: a.id })).status === 403 && (await appel('POST', { alertes: true }, { 'x-crescite-jeton': 'faux' })).status === 403,
  'sans le jeton de la base, ni courriel de confirmation ni passage');
const conf = await (await parLaBase({ alerte_confirmation: a.id })).json();
let e = vider();
const aDe = (await alertesDe('a@exemple.fr'));
ok(conf.statut === 'envoye' && e.length === 1 && e[0].a === 'a@exemple.fr' && aDe.every(x => x.confirmation_statut === 'envoye'),
  'le courriel de confirmation part, noté sur toutes les alertes en attente de l’adresse');
const lienConf = `https://site.exemple.fr/Crescite/reponse/?alerte=${a.token_desinscription}&amp;action=confirmer`;
ok(e[0].html.includes(lienConf) && e[0].texte.includes(`reponse/?alerte=${a.token_desinscription}&action=confirmer`)
   && e[0].html.includes('Rouen, 40 km alentour · tous les spectacles') && e[0].html.includes('76000, département 76')
   && e[0].html.includes('14000, département 14') && /Confirmer mes alertes/.test(e[0].html) && !/<img/i.test(e[0].html) && !e[0].html.includes('functions/v1'),
  'il liste les alertes à confirmer et mène à la page du site (un lien pour toutes ; aucune image, aucun lien vers la fonction)');

// la page de réponse : voir, confirmer
const vue = await (await appel('POST', { alerte: a.token_desinscription })).json();
ok(vue.alerte.secteur === 'Rouen, 40 km alentour' && vue.alerte.confirmee === false && vue.attente.length === 3 && vue.autres === 2 && !JSON.stringify(vue).includes('@'),
  'la page lit l’alerte par son jeton : son secteur, les alertes en attente de l’adresse, jamais l’adresse');
ok((await appel('POST', { alerte: 'f'.repeat(32) })).status === 404 && (await appel('POST', { alerte: 'court' })).status === 404
   && (await appel('POST', { alerte: 'f'.repeat(32), action: 'confirmer' })).status === 404, 'un jeton inconnu ne lit ni ne confirme rien');
ok((await db.query(`select count(*)::int n from public.crescite_alertes_tournee where confirme_le is not null`)).rows[0].n === 0, 'ouvrir la page ne confirme rien');
const confirme = await (await appel('POST', { alerte: a.token_desinscription, action: 'confirmer' })).json();
ok(confirme.enregistre === true && confirme.confirmees === 3 && confirme.alerte.confirmee === true && confirme.attente.length === 0
   && (await alertesDe('a@exemple.fr')).every(x => x.confirme_le !== null), 'un seul lien confirme les trois alertes de l’adresse');
ok((await (await appel('POST', { alerte: a.token_desinscription, action: 'confirmer' })).json()).enregistre === false, 'confirmer deux fois ne change rien');
ok((await db.query(`select count(*)::int n from public.crescite_alertes_tournee where confirme_le is not null and lower(email) <> 'a@exemple.fr'`)).rows[0].n === 0,
  'les alertes des autres adresses attendent toujours');

// les autres alertes du jeu d'essai, confirmées par la base (comme par leur lien)
const confirmer = m => db.exec(`update public.crescite_alertes_tournee set confirme_le = now() where email = '${m}'`);
await db.exec(`delete from public.crescite_alertes_tournee where email in ('cinq@exemple.fr', 'vieux@exemple.fr', 'cinquante-et-un@exemple.fr')`);
await db.exec(`delete from public.crescite_alertes_tournee where email = 'a@exemple.fr' and lat is null`);   // ne garder que la position
const deposerConfirmee = async (ligne) => { await inscrire(ligne); await confirmer(ligne.email); };
await deposerConfirmee({ email: 'b@exemple.fr', code_postal: '27500', commune: 'Pont-Audemer' });       // département 27, sans position
await deposerConfirmee({ email: 'c@exemple.fr', code_postal: '20000', commune: 'Ajaccio' });            // 2A
await deposerConfirmee({ email: 'd@exemple.fr', code_postal: '20200', commune: 'Bastia' });             // 2B
await deposerConfirmee({ email: 'e@exemple.fr', code_postal: '97400', commune: 'Saint-Denis' });        // 974
await deposerConfirmee({ email: 'f@exemple.fr', code_postal: '76000', commune: 'Rouen', spectacle_id: SP.cleophene });   // Cléophène seul
await deposerConfirmee({ email: 'g@exemple.fr', code_postal: '76000', commune: 'Rouen', lat: 49.44, lon: 1.10, rayon_km: 100 });
await inscrire({ email: 'h@exemple.fr', code_postal: '76000' });                                          // jamais confirmée,
await vieillir('h@exemple.fr', 25);                                    // et sa demande de courriel restée en route
await db.exec(`delete from net.appels`);

// ---------------------------------------------------------------------------------------------- les dates de chaque alerte
const corr = (await db.query(`select a.email, array_agg(x.id order by x.id) ds from public.crescite_alertes_correspondances() c
  join public.crescite_alertes_tournee a on a.id = c.alerte_id join public.crescite_dates x on x.id = c.date_id group by a.email`)).rows;
const datesDe = m => (corr.find(r => r.email === m)?.ds || []).map(Number).sort((x, y) => x - y);
const attendu = (...ks) => ks.map(k => D[k]).sort((x, y) => x - y);
const egal = (x, y) => JSON.stringify(x) === JSON.stringify(y);
ok(egal(datesDe('a@exemple.fr'), attendu('rouen', 'elbeuf')), 'à 40 km de Rouen : Rouen et Elbeuf (18 km), pas Pont-Audemer (43 km) ni Le Havre (72 km)');
ok(egal(datesDe('g@exemple.fr'), attendu('rouen', 'elbeuf', 'pontaudemer', 'havre')), 'à 100 km : Pont-Audemer et Le Havre aussi ; un lieu sans position ne compte que par son département');
ok(egal(datesDe('b@exemple.fr'), attendu('pontaudemer', 'evreux')), 'sans position : le département (27), lieux avec ou sans position');
ok(egal(datesDe('c@exemple.fr'), attendu('ajaccio')) && egal(datesDe('d@exemple.fr'), attendu('bastia')), 'la Corse : 20000 mène à la Corse-du-Sud (2A), 20200 à la Haute-Corse (2B)');
ok(egal(datesDe('e@exemple.fr'), attendu('reunion')), 'l’outre-mer : 97400 mène à La Réunion (974)');
ok(egal(datesDe('f@exemple.fr'), attendu('elbeuf')), 'une alerte pour Cléophène ne reçoit que Cléophène');
const exclues = ['elbeufScolaire', 'passee', 'masquee', 'option', 'annulee', 'residence', 'brouillon', 'caenAutre'].map(k => D[k]);
ok(!corr.some(r => r.ds.map(Number).some(x => exclues.includes(x))), 'jamais une date scolaire, passée, masquée, en option, annulée, une résidence, d’un spectacle non publié, ni « autre »');
ok(!corr.some(r => r.email === 'h@exemple.fr'), 'une alerte non confirmée ne reçoit rien');

// ---------------------------------------------------------------------------------------------- le passage du matin
let bilan = await (await parLaBase({ alertes: true })).json();
e = vider();
const pour = m => e.filter(x => x.a === m);
ok(bilan.alertes === 7 && bilan.confirmations === 1 && e.length === 8 && ['a', 'b', 'c', 'd', 'e', 'f', 'g'].every(k => pour(`${k}@exemple.fr`).length === 1),
  `un courriel par alerte confirmée (7), et la confirmation qui attendait (h) : ${JSON.stringify(bilan)}`);
ok(pour('h@exemple.fr')[0]?.sujet === 'Crescite : confirmez votre alerte de tournée', 'une confirmation restée en route depuis 24 heures repart au passage');
const ma = pour('a@exemple.fr')[0], mg = pour('g@exemple.fr')[0];
ok(ma.sujet === 'Crescite près de chez vous : 2 dates' && ma.html.includes('Bérénice') && ma.html.includes('Cléophène') && ma.html.includes('Elbeuf (76)')
   && ma.html.includes('Théâtre de la Ville, Rouen (76)') && !ma.html.includes('Pont-Audemer'), 'le courriel de l’alerte de Rouen : ses deux dates, le lieu et la commune');
ok(/Vendredi|Samedi|Dimanche|Lundi|Mardi|Mercredi|Jeudi/.test(ma.html) && ma.html.includes('à 20h30') && ma.html.includes('https://billetterie.exemple.fr/rouen'),
  'le jour, l’heure de la séance et le lien de réservation de la date');
ok(mg.html.includes('https://billetterie.exemple.fr/pont-audemer') && !mg.html.includes('14h'), 'une date mixte : le lien de sa séance tout public, sans la séance scolaire');
ok(ma.html.includes('https://site.exemple.fr/Crescite/synthese.html#/spectacle/berenice/voir') && ma.html.includes('https://site.exemple.fr/Crescite/synthese.html#/saisons')
   && ma.html.includes(`https://site.exemple.fr/Crescite/reponse/?alerte=${a.token_desinscription}&amp;action=arreter`)
   && ma.texte.includes(`reponse/?alerte=${a.token_desinscription}&action=arreter`) && !/<img/i.test(ma.html),
  'les liens du site (le spectacle, toutes les dates) et la désinscription ; aucune image de suivi');
ok(e.every(x => x.service === 'brevo' && !x.corps.headers), 'par Brevo, sans en-tête List-Unsubscribe ajouté (Brevo pose le sien)');
const notes = (await db.query(`select count(*)::int n, count(*) filter (where statut = 'envoye')::int ok from public.crescite_alertes_envois`)).rows[0];
ok(notes.n === 12 && notes.ok === 12 && (await db.query(`select count(*)::int n from public.crescite_alertes_tournee where derniere_notification_le is not null`)).rows[0].n === 7,
  'chaque date écrite est notée pour son alerte (12 envois), et la date du dernier courriel de chaque alerte');
bilan = await (await parLaBase({ alertes: true })).json();
ok(vider().length === 0 && bilan.alertes === 0, 'le passage suivant n’écrit rien : jamais deux fois la même date');
await date('rouen2', 'cleophene', 'rouen', 30, { seances: [[30, '17:00']] });
bilan = await (await parLaBase({ alertes: true })).json();
e = vider();
ok(e.length === 3 && ['a', 'f', 'g'].every(k => pour(`${k}@exemple.fr`).length === 1) && pour('a@exemple.fr')[0].sujet === 'Crescite près de chez vous : Cléophène, Rouen'
   && !pour('a@exemple.fr')[0].html.includes('Bérénice') && pour('a@exemple.fr')[0].html.includes('à 17h'),
  'une date confirmée de plus : un courriel aux seules alertes de son secteur, avec elle seule');
// deux passages en même temps ne prennent pas les mêmes dates
await date('rouen3', 'berenice', 'rouen', 31);
const lot1 = (await db.query(`select public.crescite_alertes_lot(10) v`)).rows[0].v, lot2 = (await db.query(`select public.crescite_alertes_lot(10) v`)).rows[0].v;
ok(lot1.alertes.length === 2 && lot2.alertes.length === 0, 'deux passages au même instant : le second ne reprend pas les dates du premier');
await db.exec(`update public.crescite_alertes_envois set envoye_le = now() - interval '2 hours' where statut = 'en_cours'`);
bilan = await (await parLaBase({ alertes: true })).json();
ok(vider().length === 2 && bilan.alertes === 2, 'un passage interrompu (les dates prises depuis plus d’une heure) est repris');

// le geste d'une messagerie, et la page : arrêter
const f = (await alertesDe('f@exemple.fr'))[0];
const unClic = await servir(new Request(`${ICI}?alerte=${f.token_desinscription}&action=arreter`, { method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' }));
ok(unClic.status === 200 && (await alertesDe('f@exemple.fr')).length === 0
   && (await db.query(`select count(*)::int n from public.crescite_alertes_envois where alerte_id = $1`, [f.id])).rows[0].n === 0,
  'le désabonnement d’un geste (List-Unsubscribe-Post) efface l’alerte et ce qui lui a été écrit');
const g = await appel('GET', undefined, {}, `?alerte=${a.token_desinscription}&action=arreter&autre=1`);
ok(g.status === 302 && g.headers.get('location') === `https://site.exemple.fr/Crescite/reponse/?alerte=${a.token_desinscription}&action=arreter`,
  'un lien vers la fonction renvoie vers la page de réponse du site');
await inscrire({ email: 'b@exemple.fr', code_postal: '14000' });
await inscrire({ email: 'b@exemple.fr', code_postal: '50000' });
const b = (await alertesDe('b@exemple.fr'))[0];
const vueB = await (await appel('POST', { alerte: b.token_desinscription })).json();
const arret = await (await appel('POST', { alerte: b.token_desinscription, action: 'arreter' })).json();
ok(vueB.autres === 2 && arret.enregistre === true && arret.arretees === 1 && (await alertesDe('b@exemple.fr')).length === 2,
  'arrêter une alerte depuis la page : elle seule s’efface');
const reste = (await alertesDe('b@exemple.fr'))[0];
const tout = await (await appel('POST', { alerte: reste.token_desinscription, action: 'arreter', tout: true })).json();
ok(tout.arretees === 2 && (await alertesDe('b@exemple.fr')).length === 0 && (await appel('POST', { alerte: reste.token_desinscription })).status === 404,
  '« toutes mes alertes » : l’adresse disparaît, et le lien ne mène plus à rien');

// ---------------------------------------------------------------------------------------------- 200 courriels par passage
await db.exec(`insert into public.crescite_alertes_tournee (email, code_postal, confirme_le)
  select 'masse' || i || '@exemple.fr', '76000', now() from generate_series(1, 210) i`);
bilan = await (await parLaBase({ alertes: true })).json();
e = vider();
ok(e.length === 200 && bilan.reste === true && bilan.alertes === 200, `200 courriels au plus par passage, le reste attend (${bilan.alertes} alertes, reste : ${bilan.reste})`);
bilan = await (await parLaBase({ alertes: true })).json();
e = vider();
ok(e.length === 10 && bilan.reste === false && new Set(e.map(x => x.a)).size === 10 && e.every(x => /^masse\d+@/.test(x.a)), 'le passage suivant écrit les dix autres');
await db.exec(`delete from public.crescite_alertes_tournee where email like 'masse%@exemple.fr'`);

// l'administration désactive une alerte : elle ne reçoit plus rien ; elle l'efface : ce qui lui a été écrit s'en va aussi
const gId = (await alertesDe('g@exemple.fr'))[0].id;
ok(await essai('authenticated', U.admin, `update public.crescite_alertes_tournee set active = false where id = ${gId}`) === 'ok', 'l’administration désactive une alerte');
await date('rouen6', 'berenice', 'rouen', 34);
bilan = await (await parLaBase({ alertes: true })).json();
e = vider();
ok(pour('g@exemple.fr').length === 0 && pour('a@exemple.fr').length === 1, 'une alerte désactivée ne reçoit plus rien (les autres, si)');
ok(await essai('authenticated', U.admin, `delete from public.crescite_alertes_tournee where id = ${gId}`) === 'ok'
   && (await db.query(`select count(*)::int n from public.crescite_alertes_envois where alerte_id = $1`, [gId])).rows[0].n === 0,
  'l’administration efface une alerte, et ce qui lui a été écrit avec elle');

// ---------------------------------------------------------------------------------------------- l'effacement
await db.exec(`insert into public.crescite_alertes_tournee (email, code_postal, cree_le, confirmation_statut, confirmation_le, confirme_le) values
  ('vieille@exemple.fr', '76000', now() - interval '31 days', null, null, null),
  ('relancee@exemple.fr', '76000', now() - interval '40 days', 'envoye', now() - interval '31 days', null),
  ('recente@exemple.fr', '76000', now() - interval '40 days', 'envoye', now() - interval '10 days', null),
  ('fidele@exemple.fr', '76000', now() - interval '400 days', 'envoye', now() - interval '400 days', now() - interval '399 days')`);
bilan = await (await parLaBase({ alertes: true })).json();
vider();
const restent = (await db.query(`select email from public.crescite_alertes_tournee where email in ('vieille@exemple.fr', 'relancee@exemple.fr', 'recente@exemple.fr', 'fidele@exemple.fr') order by email`)).rows.map(r => r.email);
ok(bilan.effacees === 2 && egal(restent, ['fidele@exemple.fr', 'recente@exemple.fr']),
  'non confirmées 30 jours après leur courriel (ou leur dépôt), les alertes s’effacent ; une alerte confirmée reste');

// ---------------------------------------------------------------------------------------------- sans clé d'envoi
delete ENV.BREVO_API_KEY;
await charger('sans-cle.mjs');
await db.exec(`delete from net.appels`);
await inscrire({ email: 'sanscle@exemple.fr', code_postal: '76000', commune: 'Rouen' });
const [sc] = await alertesDe('sanscle@exemple.fr');
const sansCle = await (await parLaBase({ alerte_confirmation: sc.id })).json();
await date('rouen4', 'berenice', 'rouen', 32);
const prevenues = async () => JSON.stringify((await db.query(`select id, derniere_notification_le from public.crescite_alertes_tournee order by id`)).rows);
const prevenuesAvant = await prevenues();
bilan = await (await parLaBase({ alertes: true })).json();
const nonConf = (await db.query(`select count(*)::int n from public.crescite_alertes_envois where statut = 'non_configure'`)).rows[0].n;
ok(sansCle.statut === 'non_configure' && (await alertesDe('sanscle@exemple.fr'))[0].confirmation_statut === 'non_configure' && envoyes.length === 0
   && bilan.alertes > 0 && nonConf === bilan.dates, 'sans clé d’envoi, rien ne part : confirmations et dates notées « non_configure »');
ok(await prevenues() === prevenuesAvant, 'et aucune alerte ne se dit prévenue');
// la clé arrive : le passage suivant renvoie la confirmation et écrit les dates restées « non_configure »
ENV.RESEND_API_KEY = 'essai';
await charger('resend.mjs');
bilan = await (await parLaBase({ alertes: true })).json();
e = vider();
ok(pour('sanscle@exemple.fr').length === 1 && (await alertesDe('sanscle@exemple.fr'))[0].confirmation_statut === 'envoye'
   && bilan.alertes > 0 && (await db.query(`select count(*)::int n from public.crescite_alertes_envois where statut <> 'envoye'`)).rows[0].n === 0,
  'une clé en place : la confirmation restée « non_configure » repart, les dates en attente aussi');
const parResend = e.find(x => x.a !== 'sanscle@exemple.fr');
ok(parResend && parResend.service === 'resend' && /^<https:\/\/projet\.exemple\.supabase\.co\/functions\/v1\/crescite-courriel\?alerte=[0-9a-f]{32}&action=arreter>$/.test(parResend.corps.headers['List-Unsubscribe'])
   && parResend.corps.headers['List-Unsubscribe-Post'] === 'List-Unsubscribe=One-Click', 'par Resend, l’en-tête List-Unsubscribe mène au désabonnement d’un geste');
// une panne du service : notée, reprise au passage suivant
await date('rouen5', 'cleophene', 'rouen', 33);
delete ENV.RESEND_API_KEY; ENV.BREVO_API_KEY = 'essai';
await charger('panne.mjs');
panneBrevo = true;
bilan = await (await parLaBase({ alertes: true })).json();
panneBrevo = false;
vider();
ok((await db.query(`select count(*)::int n from public.crescite_alertes_envois where statut like 'erreur : Brevo 500%'`)).rows[0].n > 0, 'une panne de Brevo est notée (« erreur : … »)');
bilan = await (await parLaBase({ alertes: true })).json();
ok(vider().length === bilan.alertes && bilan.alertes > 0 && (await db.query(`select count(*)::int n from public.crescite_alertes_envois where statut <> 'envoye'`)).rows[0].n === 0,
  'et les dates sont écrites au passage suivant');

// ---------------------------------------------------------------------------------------------- les scripts relancés
// le septième (il refait ses règles d'accès) et le troisième, après le onzième : rien ne s'affaiblit
const confirmeesAvant = (await db.query(`select count(*)::int n from public.crescite_alertes_tournee where confirme_le is not null`)).rows[0].n;
for (const k of ['crescite_ideale', 'crescite_notifications', 'crescite_alertes']) await db.exec(S[k]);
ok(await inscrire({ email: 'apres@exemple.fr', code_postal: '76000', confirme_le: new Date().toISOString(), token_desinscription: 'y'.repeat(32) }) === null
   && (await alertesDe('apres@exemple.fr'))[0].confirme_le === null && (await alertesDe('apres@exemple.fr'))[0].token_desinscription !== 'y'.repeat(32),
  'le septième et le troisième relancés : le public ne dépose toujours pas d’alerte confirmée, ni son jeton');
await db.exec(S.crescite_ideale);
ok((await db.query(`select count(*)::int n from pg_trigger where tgrelid = 'public.crescite_alertes_tournee'::regclass and tgname like 'crescite_alertes_%'`)).rows[0].n === 3
   && await essai('anon', '', `select * from public.crescite_alertes_envois`) !== 'ok'
   && await essai('anon', '', `select public.crescite_alerte_confirmer('x')`) !== 'ok'
   && (await as('anon', '', `select count(*)::int n from public.crescite_alertes_tournee`)).rows[0].n === 0,
  'les trois déclencheurs restent, les envois et les fonctions restent fermés, le public ne lit toujours rien');
ok((await db.query(`select count(*)::int n from public.crescite_alertes_tournee where confirme_le is not null`)).rows[0].n === confirmeesAvant
   && (await alertesDe('a@exemple.fr'))[0].token_desinscription === a.token_desinscription,
  'relancés, les scripts gardent les alertes confirmées et leur jeton (les liens des courriels marchent encore)');
for (let i = 0; i < 6; i++) await inscrire({ email: 'limite@exemple.fr', code_postal: String(14000 + i * 1000).padStart(5, '0') });
ok((await alertesDe('limite@exemple.fr')).length === 5, 'et la limite de cinq alertes par adresse tient toujours');
