// La sécurité (le treizième script), dans un Postgres local (PGlite) : les scripts 1 à 12, le treizième deux fois, puis
// les anciens relancés après lui sans rien rouvrir. Un compte ne se rattache à une fiche que par une adresse confirmée ;
// le public dépose des alertes et des demandes de devis dans un débit (par origine, une empreinte de l'adresse IP, et
// par jour en tout), n'écrit que les champs de ses formulaires, ne lit des lieux que ceux d'une date qu'il voit (sans
// leur adresse) et des fiches que ce que le site montre ; les abonnements ne vont qu'aux services de notification
// connus. Les requêtes du site (donnees.js, index.html) passent telles quelles. Toutes les adresses sont fictives.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, existsSync } from 'node:fs';
const migration = f => new URL(`../migrations/${f}`, import.meta.url);
const FICHIERS = ['20261020_crescite_base.sql', '20261021_crescite_equipe.sql', '20261022_crescite_notifications.sql',
  '20261023_crescite_pro.sql', '20261024_crescite_disponibilites.sql', '20261025_crescite_preferences.sql',
  '20261026_crescite_ideale.sql', '20261027_crescite_documents_publics.sql', '20261028_crescite_signaler.sql',
  '20261029_crescite_chiffres.sql', '20261030_crescite_alertes.sql', '20261031_crescite_residences.sql'].filter(f => existsSync(migration(f)));
const S = Object.fromEntries(FICHIERS.map(f => [f.slice(9, -4), readFileSync(migration(f), 'utf8')]));   // « crescite_base » …
const SECURITE = readFileSync(migration('20261101_crescite_securite.sql'), 'utf8');
const ok = (c, m) => { if (!c) { console.log('ÉCHEC :', m); process.exitCode = 1; } else console.log('ok :', m); };
const PREPARER = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
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
  create schema net; create table net.appels (url text, body jsonb, headers jsonb);
  create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
    returns bigint language sql as $$ insert into net.appels values (url, body, headers); select 1::bigint $$;
  create schema cron; create table cron.job (jobid bigserial primary key, jobname text, schedule text, command text);
  create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.job (jobname, schedule, command) values (n, s, c) returning jobid $$;
  create function cron.unschedule(id bigint) returns boolean language sql as $$ delete from cron.job where jobid = id returning true $$;
  insert into pg_catalog.pg_extension (oid, extname, extowner, extnamespace, extrelocatable, extversion)
    values (987654, 'pg_cron', 10, (select oid from pg_namespace where nspname = 'public'), false, '1.6');`;
const ouvrir = async () => {
  const b = new PGlite();
  await b.exec(PREPARER);
  try { await b.exec('create publication supabase_realtime'); } catch (e) { /* pas de publication ici */ }
  return b;
};

// ---------------------------------------------------------------------------------------------- sans le onzième script
{
  const b = await ouvrir();
  for (const f of FICHIERS.filter(f => !/alertes|residences/.test(f))) await b.exec(readFileSync(migration(f), 'utf8'));
  let refus = null;
  try { await b.exec(SECURITE); } catch (e) { refus = e.message; await b.exec('rollback'); }
  ok(/onzième script/.test(refus || '') && !(await b.query(`select to_regclass('public.crescite_debits') t`)).rows[0].t,
    'sans le onzième script, le treizième s’arrête et dit lequel lancer d’abord (rien n’est changé)');
  await b.close();
}

// ---------------------------------------------------------------------------------------------- les scripts
const db = await ouvrir();
const echecs = [];
let fin;
for (const f of FICHIERS) { try { await db.exec(readFileSync(migration(f), 'utf8')); } catch (e) { echecs.push(`${f} : ${e.message}`); } }
// les fonctions que le treizième redéfinit : les anciens scripts portent les mêmes (relancés, ils ne reviennent pas en arrière)
const REDEFINIES = ['crescite_rattacher()', 'crescite_alertes_garde()', 'crescite_alertes_confirmations(integer)'];
const definitions = async () => Promise.all(REDEFINIES.map(async f => (await db.query(`select pg_get_functiondef('public.${f}'::regprocedure) d`)).rows[0].d));
const avant13 = await definitions();
for (let i = 0; i < 2; i++) { try { fin = await db.exec(SECURITE); } catch (e) { echecs.push(`treizième (${i + 1}) : ${e.message}`); } }
ok(!echecs.length && FICHIERS.length === 12, `les ${FICHIERS.length} scripts passent, le treizième deux fois${echecs.length ? ` (${echecs.join(' ; ')})` : ''}`);
const etat = Object.fromEntries(fin.at(-1).rows.map(r => [r['élément'], r['état']]));
ok(Object.keys(etat).length === 5 && Object.values(etat).every(v => /^prêt(e?s)? :/.test(v)), `il dit ce qui est en place : ${Object.values(etat).join(' | ')}`);
ok(JSON.stringify(await definitions()) === JSON.stringify(avant13),
  'les fonctions que le treizième redéfinit sont celles des scripts 2 et 11 (les mêmes, mot pour mot)');

// ---------------------------------------------------------------------------------------------- les données
const U = { admin: '11111111-1111-1111-1111-111111111111', lauren: '22222222-2222-2222-2222-222222222222',
  pirate: '33333333-3333-3333-3333-333333333333', neuf: '44444444-4444-4444-4444-444444444444' };
await db.exec(`insert into auth.users values ('${U.admin}', 'admin@exemple.fr', now()), ('${U.lauren}', 'lauren@exemple.fr', now()),
  ('${U.pirate}', 'pirate@exemple.fr', now()), ('${U.neuf}', 'neuf@exemple.fr', null)`);
await db.exec(`insert into public.crescite_admins (user_id) values ('${U.admin}')`);
const id = async (q, p = []) => (await db.query(q, p)).rows[0]?.id;
const P = {};
for (const [slug, prenom, nom, mail] of [['lauren', 'Lauren', 'Exemple', 'Lauren@Exemple.fr'], ['neuf', 'Neuf', 'Exemple', 'neuf@exemple.fr']]) {
  P[slug] = await id(`insert into public.crescite_personnes (slug, prenom, nom, bio, photo_source) values ($1, $2, $3, 'Une biographie', 'https://source.exemple.fr') returning id`, [slug, prenom, nom]);
  await db.query(`insert into public.crescite_personnes_privees (personne_id, email) values ($1, $2)`, [P[slug], mail]);
}
const SP = {};
for (const [slug, titre, publie] of [['berenice', 'Bérénice', true], ['brouillon', 'Le Brouillon', false]]) {
  SP[slug] = await id(`insert into public.crescite_spectacles (slug, titre, publie) values ($1, $2, $3) returning id`, [slug, titre, publie]);
}
const L = {};
for (const k of ['montree', 'option', 'masquee', 'brouillon', 'repetition', 'passee']) {
  L[k] = await id(`insert into public.crescite_lieux (nom, commune, departement, adresse, latitude, longitude) values ($1, 'Rouen', '76', '1 rue de l’Exemple', 49.44, 1.10) returning id`, [`Salle ${k}`]);
}
const jour = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
for (const [lieu, sp, n, statut, visible] of [['montree', 'berenice', 10, 'confirmee', true], ['option', 'berenice', 12, 'option', true],
  ['masquee', 'berenice', 14, 'confirmee', false], ['brouillon', 'brouillon', 16, 'confirmee', true], ['passee', 'berenice', -400, 'confirmee', true]]) {
  await db.query(`insert into public.crescite_dates (spectacle_id, lieu_id, debut, fin, statut, visible) values ($1, $2, $3, $3, $4, $5)`, [SP[sp], L[lieu], jour(n), statut, visible]);
}
await db.exec(`delete from net.appels`);

const as = async (role, sub, q, params = [], entetes = {}, claims = '') => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub || ''}', false),
    set_config('request.jwt.claims', '${claims}', false), set_config('request.headers', '${JSON.stringify(entetes)}', false);`);
  try { return await db.query(q, params); } finally { await db.exec('reset role'); }
};
const erreur = async (...a) => { try { await as(...a); return null; } catch (e) { return e; } };
const deposer = (table, ligne, ip, role = 'anon', sub = '') => {
  const ks = Object.keys(ligne);
  return erreur(role, sub, `insert into public.${table} (${ks.join(', ')}) values (${ks.map((k, i) => `$${i + 1}`).join(', ')})`,
    ks.map(k => ligne[k]), ip ? { 'x-forwarded-for': `${ip}, 10.0.0.1` } : {});
};
let n = 0;
// ce qu'envoient les formulaires du site (index.html), tels quels
const alerte = () => ({ email: `public${++n}@exemple.fr`, code_postal: '76000', commune: 'Rouen', departement: '76', spectacle_id: null,
  lat: null, lon: null, confirme_le: null });
const devis = () => ({ spectacle_id: SP.berenice, type_lieu: 'theatre', dimensions_plateau: '10m x 8m x 6m (theatre)', structure_nom: `Théâtre ${++n}`,
  commune: `Théâtre ${n}`, contact_nom: 'Prénom Nom', contact_email: `prog${n}@exemple.fr`, contact_tel: null, periode_souhaitee: null, message: null });
const debits = async quoi => (await db.query(`select count(*)::int n from public.crescite_debits where quoi = $1`, [quoi])).rows[0].n;

// ---------------------------------------------------------------------------------------------- 1. rattacher un compte
const rattacher = (u, mail) => as('authenticated', u, `select public.crescite_rattacher() p`, [], {}, JSON.stringify({ email: mail }));
ok((await rattacher(U.neuf, 'neuf@exemple.fr')).rows[0].p === null
   && (await db.query(`select user_id from public.crescite_personnes_privees where personne_id = $1`, [P.neuf])).rows[0].user_id === null,
  'un compte dont l’adresse n’est pas confirmée ne prend pas la fiche de même adresse');
ok((await rattacher(U.pirate, 'lauren@exemple.fr')).rows[0].p === null
   && (await db.query(`select user_id from public.crescite_personnes_privees where personne_id = $1`, [P.lauren])).rows[0].user_id === null,
  'un jeton qui annonce l’adresse d’une autre ne prend pas sa fiche (l’adresse vient du compte)');
ok(Number((await rattacher(U.lauren, 'autre@exemple.fr')).rows[0].p) === Number(P.lauren)
   && Number((await rattacher(U.lauren, '')).rows[0].p) === Number(P.lauren),
  'un compte à l’adresse confirmée prend sa fiche (casse ignorée), et la retrouve ensuite');
await db.exec(`update auth.users set email_confirmed_at = now() where id = '${U.neuf}'`);
ok(Number((await rattacher(U.neuf, '')).rows[0].p) === Number(P.neuf), 'une fois l’adresse confirmée, le compte prend sa fiche');

// ---------------------------------------------------------------------------------------------- 2. le débit du public
let e;
for (let i = 0; i < 5; i++) e = e || await deposer('crescite_alertes_tournee', alerte(), '203.0.113.7');
const sixieme = await deposer('crescite_alertes_tournee', alerte(), '203.0.113.7');
ok(e === null && sixieme?.code === 'PT429' && /depuis votre connexion/.test(sixieme.message) && await debits('alerte') === 5,
  'cinq alertes par heure depuis une même connexion : la sixième est refusée (429), son message le dit');
ok(await deposer('crescite_alertes_tournee', alerte(), '198.51.100.9') === null, 'une autre connexion dépose encore');
ok((await db.query(`select bool_and(origine ~ '^[0-9a-f]{32}$') b, bool_or(origine like '%203.0.113.7%') ip from public.crescite_debits`)).rows[0].b === true
   && !(await db.query(`select bool_or(origine like '%203%') ip from public.crescite_debits`)).rows[0].ip,
  'l’origine est une empreinte (jamais l’adresse IP)');
await db.exec(`update public.crescite_debits set quand = quand - interval '61 minutes'`);
ok(await deposer('crescite_alertes_tournee', alerte(), '203.0.113.7') === null, 'une heure plus tard, la même connexion dépose de nouveau');
await db.exec(`insert into public.crescite_debits (quoi, origine, quand)
  select 'alerte', (select origine from public.crescite_debits where quoi = 'alerte' order by id limit 1), now() - interval '3 hours' from generate_series(1, 14)`);
const vingtieme = await deposer('crescite_alertes_tournee', alerte(), '203.0.113.7');
ok(vingtieme?.code === 'PT429', 'vingt alertes par jour depuis une même connexion, au plus');
for (let i = 0; i < 3; i++) e = await deposer('crescite_devis_demandes', devis(), '192.0.2.44') || e;
const quatrieme = await deposer('crescite_devis_demandes', devis(), '192.0.2.44');
ok(e === null && quatrieme?.code === 'PT429' && await debits('devis') === 3, 'trois demandes de devis par heure depuis une même connexion');
await db.exec(`insert into public.crescite_debits (quoi, origine) select 'devis', md5(g::text) from generate_series(1, 97) g`);
const centieme = await deposer('crescite_devis_demandes', devis(), '192.0.2.99');
ok(centieme?.code === 'PT429' && /aujourd’hui/.test(centieme.message), 'cent demandes de devis par jour en tout, d’où qu’elles viennent');
ok(await deposer('crescite_devis_demandes', devis(), null, 'authenticated', U.admin) === null
   && await erreur('service_role', '', `insert into public.crescite_devis_demandes (type_lieu, structure_nom, commune, contact_nom, contact_email)
      values ('theatre', 'Import', 'Rouen', 'Nom', 'import@exemple.fr')`) === null,
  'l’administration et les imports (service_role) ne sont pas comptés');
await db.exec(`insert into public.crescite_debits (quoi, origine, quand) values ('alerte', 'vieux', now() - interval '3 days')`);
await deposer('crescite_alertes_tournee', alerte(), '198.51.100.10');
ok((await db.query(`select count(*)::int n from public.crescite_debits where origine = 'vieux'`)).rows[0].n === 0, 'les traces de plus de deux jours s’effacent');
const direct = await erreur('anon', '', `select public.crescite_debit_compter('devis', 1000, 1000, 1000000)`);
ok(direct?.code === '42501' && await erreur('anon', '', `select public.crescite_origine()`) !== null
   && await erreur('anon', '', `select * from public.crescite_debits`) !== null && await erreur('authenticated', U.lauren, `select * from public.crescite_debits`) !== null
   && await erreur('anon', '', `select valeur from public.crescite_secrets where cle = 'sel_origine'`) !== null,
  'le public n’appelle pas le comptage lui-même, ne lit ni les traces, ni le sel, ni son empreinte');

// ---------------------------------------------------------------------------------------------- 3. les champs des formulaires
await db.exec(`delete from public.crescite_debits`);
const horsDevis = await Promise.all([{ statut: 'confirme' }, { notes_internes: 'note' }, { id: 999999 }, { cree_le: '2020-01-01' }]
  .map(x => deposer('crescite_devis_demandes', { ...devis(), ...x }, '192.0.2.50')));
const horsAlerte = await Promise.all([{ token_desinscription: 'x'.repeat(32) }, { id: 999999 }, { active: false }, { push_subscription: '{}' }]
  .map(x => deposer('crescite_alertes_tournee', { ...alerte(), ...x }, '192.0.2.51')));
ok([...horsDevis, ...horsAlerte].every(x => x?.code === '42501'), 'le public n’écrit ni le suivi, ni l’identifiant, ni la date, ni le jeton (refusé)');
ok(await deposer('crescite_devis_demandes', { ...devis(), jauge_estimee: 300, departement: '76' }, '192.0.2.52') === null
   && await deposer('crescite_alertes_tournee', { ...alerte(), rayon_km: 60 }, '192.0.2.53') === null,
  'les champs des formulaires passent tous (jauge, département, rayon)');
const bornes = await Promise.all([{ dimensions_plateau: 'x'.repeat(161) }, { type_lieu: 'x'.repeat(41) }, { jauge_estimee: 1000000 }, { departement: 'x'.repeat(61) }]
  .map((x, i) => deposer('crescite_devis_demandes', { ...devis(), ...x }, `192.0.2.${60 + i}`)));
ok(bornes.every(x => x?.code === '23514'), 'une demande de devis aux champs démesurés est refusée');

// ---------------------------------------------------------------------------------------------- 7. les alertes de tournée
await deposer('crescite_alertes_tournee', { ...alerte(), email: 'lien@exemple.fr', commune: 'Rouen https://pirate.fr/x?y=1 <b>gagné</b>', lat: 49.443519, lon: 1.099874 }, '192.0.2.90');
const [lien] = (await db.query(`select commune, lat::text, lon::text from public.crescite_alertes_tournee where email = 'lien@exemple.fr'`)).rows;
ok(lien && !/[:/.<>?=]/.test(lien.commune) && /^Rouen https pirate fr x y b gagné b$/.test(lien.commune) && lien.lat === '49.440000' && lien.lon === '1.100000',
  'une commune ne garde que des lettres (ni lien, ni balise dans les courriels), la position est arrondie au kilomètre');
// 30 adresses ont eu leur courriel au dépôt aujourd'hui, 40 attendent le leur (posées sans les déclencheurs)
await db.exec(`delete from public.crescite_alertes_tournee; set session_replication_role = replica;
  insert into public.crescite_alertes_tournee (email, departement, active, confirmation_statut, confirmation_le, token_desinscription)
    select 'depot' || g || '@exemple.fr', '76', true, 'envoye', now() - interval '2 hours', md5('d' || g) from generate_series(1, 30) g;
  insert into public.crescite_alertes_tournee (email, departement, active, confirmation_statut, confirmation_le, token_desinscription)
    select 'matin' || g || '@exemple.fr', '76', true, null, null, md5('m' || g) from generate_series(1, 40) g;
  set session_replication_role = origin;`);
const matin = (await db.query(`select count(*)::int n from public.crescite_alertes_confirmations(200)`)).rows[0].n;
ok(matin === 20, `le passage du matin complète jusqu’à 50 adresses par 24 heures en tout (30 au dépôt, ${matin} le matin)`);

// ---------------------------------------------------------------------------------------------- 4. les abonnements
const abonner = async endpoint => { try { await db.query(`insert into public.crescite_abonnements (personne_id, endpoint, p256dh, auth) values ($1, $2, 'p', 'a')`, [P.lauren, endpoint]); return null; } catch (x) { return x; } };
ok(await abonner('https://fcm.googleapis.com/fcm/send/abc') === null && await abonner('https://updates.push.services.mozilla.com/wpush/v2/abc') === null
   && await abonner('https://web.push.apple.com/abc') === null && await abonner('https://wns2-par02p.notify.windows.com/w/?token=abc') === null,
  'un abonnement va aux services connus (Google, Mozilla, Apple, Microsoft)');
ok((await abonner('https://pirate.exemple.fr/push'))?.code === '23514' && (await abonner('http://fcm.googleapis.com/fcm/send/x'))?.code === '23514'
   && (await abonner('https://fcm.googleapis.com.pirate.fr/x'))?.code === '23514',
  'jamais ailleurs, ni en clair, ni vers un faux domaine qui commence comme un vrai');

// ---------------------------------------------------------------------------------------------- 5 et 6. ce que le public lit
const lieuxPublics = async () => (await as('anon', '', `select id from public.crescite_lieux order by id`)).rows.map(r => Number(r.id));
ok(JSON.stringify(await lieuxPublics()) === JSON.stringify([L.montree, L.passee].map(Number)),
  'le public ne lit que les lieux d’une date qu’il voit (ni option, ni date masquée, ni spectacle non publié, ni salle sans date)');
ok((await erreur('anon', '', `select adresse from public.crescite_lieux`))?.code === '42501' && (await erreur('anon', '', `select * from public.crescite_lieux`))?.code === '42501'
   && (await erreur('anon', '', `select bio from public.crescite_personnes`))?.code === '42501' && (await erreur('anon', '', `select photo_source from public.crescite_personnes`))?.code === '42501',
  'ni l’adresse des lieux, ni la biographie ou la source des photos des fiches');
const SITE = { lieux: 'id,nom,type,commune,departement,pays,latitude,longitude,site_web', personnes: 'id,slug,prenom,nom,metiers,photo,photo_credit,photo_publique,ordre' };
ok(await erreur('anon', '', `select ${SITE.lieux} from public.crescite_lieux order by id`) === null
   && (await as('anon', '', `select ${SITE.personnes} from public.crescite_personnes order by ordre, id`)).rows.length === 2,
  'les lectures du site (donnees.js) passent telles quelles');
ok((await as('authenticated', U.admin, `select count(*)::int n, count(adresse)::int a from public.crescite_lieux`)).rows[0].n === 6
   && (await as('authenticated', U.admin, `select bio from public.crescite_personnes where id = $1`, [P.lauren])).rows[0].bio === 'Une biographie',
  'l’administration lit tout (les lieux sans date, les adresses, les biographies)');
await db.query(`insert into public.crescite_distributions (spectacle_id, personne_id, categorie, fonction, en_tournee) values ($1, $2, 'jeu', '', true)`, [SP.berenice, P.lauren]);
const tournee = (await as('authenticated', U.lauren, `select public.crescite_ma_tournee() t`)).rows[0].t;
ok(tournee.length >= 3 && tournee.some(d => d.lieu?.adresse === '1 rue de l’Exemple' && Number(d.lieu.id) === Number(L.masquee)),
  'l’équipe lit encore sa tournée, lieux et adresses compris (même ceux d’une date que le public ne voit pas)');

// ---------------------------------------------------------------------------------------------- les anciens scripts relancés
const rattacheAvant = (await db.query(`select count(*)::int n from public.crescite_personnes_privees where user_id is not null`)).rows[0].n;
const relances = [];
for (const k of ['crescite_base', 'crescite_equipe', 'crescite_notifications', 'crescite_ideale', 'crescite_alertes', 'crescite_residences']) {
  try { await db.exec(S[k]); } catch (x) { relances.push(`${k} : ${x.message}`); }
}
ok(!relances.length, `les scripts 1, 2, 3, 7, 11 et 12 se relancent après le treizième${relances.length ? ` (${relances.join(' ; ')})` : ''}`);
await db.exec(`delete from public.crescite_debits`);
await db.exec(`update auth.users set email_confirmed_at = null where id = '${U.pirate}'`);
await db.exec(`insert into public.crescite_personnes (slug, nom) values ('autre', 'Autre');
  insert into public.crescite_personnes_privees (personne_id, email) select id, 'pirate@exemple.fr' from public.crescite_personnes where slug = 'autre'`);
ok((await rattacher(U.pirate, 'pirate@exemple.fr')).rows[0].p === null
   && (await db.query(`select count(*)::int n from public.crescite_personnes_privees where user_id is not null`)).rows[0].n === rattacheAvant,
  'relancés : un compte ne se rattache toujours que par une adresse confirmée, et les rattachements restent');
ok((await erreur('anon', '', `select adresse from public.crescite_lieux`))?.code === '42501' && (await erreur('anon', '', `select bio from public.crescite_personnes`))?.code === '42501'
   && JSON.stringify(await lieuxPublics()) === JSON.stringify([L.montree, L.passee].map(Number)),
  'relancés : le public ne lit toujours ni les adresses, ni les biographies, ni les lieux sans date montrée');
ok((await deposer('crescite_devis_demandes', { ...devis(), statut: 'confirme' }, '192.0.2.70'))?.code === '42501'
   && (await deposer('crescite_alertes_tournee', { ...alerte(), token_desinscription: 'y'.repeat(32) }, '192.0.2.71'))?.code === '42501'
   && await deposer('crescite_alertes_tournee', alerte(), '192.0.2.72') === null && await deposer('crescite_devis_demandes', devis(), '192.0.2.73') === null,
  'relancés : les formulaires passent, et seulement leurs champs');
for (let i = 0; i < 3; i++) await deposer('crescite_devis_demandes', devis(), '192.0.2.80');
ok((await deposer('crescite_devis_demandes', devis(), '192.0.2.80'))?.code === 'PT429' && (await abonner('https://pirate.exemple.fr/x'))?.code === '23514',
  'relancés : le débit et les abonnements tiennent');
await db.close();
