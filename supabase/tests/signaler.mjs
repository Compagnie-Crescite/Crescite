// Les neuf migrations Crescite dans un Postgres local (PGlite), puis l'alerte de retard (le neuvième script) : qui
// l'envoie, qui la reçoit (l'équipe de la date et l'administration, jamais son auteur), l'appel de la fonction d'envoi
// vers les téléphones, la longueur du texte, cinq alertes par heure et par compte, ce que chacun relit.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const lire = f => readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8');
const M = ['20261020_crescite_base.sql', '20261021_crescite_equipe.sql', '20261022_crescite_notifications.sql',
  '20261023_crescite_pro.sql', '20261024_crescite_disponibilites.sql', '20261025_crescite_preferences.sql',
  '20261026_crescite_ideale.sql', '20261027_crescite_documents_publics.sql', '20261028_crescite_signaler.sql'].map(lire);
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
`);
try { await db.exec('create publication supabase_realtime'); } catch (e) { /* pas de publication ici */ }
for (const s of M) await db.exec(s);
const echecs = [];
for (const i of [8, 2, 0, 1, 8, 6, 3, 8]) { try { await db.exec(M[i]); } catch (e) { echecs.push(`script ${i + 1} : ${e.message}`); await db.exec('rollback').catch(() => {}); } }
ok(!echecs.length, `les neuf migrations passent ; le neuvième script se relance sans erreur, avant et après les autres${echecs.length ? ` (${echecs.join(' ; ')})` : ''}`);
const fin = await db.exec(M[8]);
ok(/^prêtes/.test(fin.at(-1).rows[0]['état']) && (await db.query(`select count(*)::int n from pg_policies where tablename = 'crescite_signalements'`)).rows[0].n === 1,
  `il dit ce qui est en place et garde sa seule règle : ${fin.at(-1).rows.map(r => r['état']).join(' | ')}`);

// l'équipe : Lauren et Adrien partent avec Bérénice (Adrien est retiré de la date, un remplaçant y est ajouté), Thomas
// est dans la distribution sans partir en tournée, une personne n'a pas de compte ; Barbara administre et a sa fiche,
// un second compte administre sans fiche ; un compte du projet n'est pas de l'équipe
const U = { barbara: '11111111-1111-1111-1111-111111111111', lauren: '22222222-2222-2222-2222-222222222222', adrien: '33333333-3333-3333-3333-333333333333',
  thomas: '44444444-4444-4444-4444-444444444444', rempl: '55555555-5555-5555-5555-555555555555', admin2: '66666666-6666-6666-6666-666666666666',
  dehors: '77777777-7777-7777-7777-777777777777' };
for (const k in U) await db.exec(`insert into auth.users values ('${U[k]}', '${k}@x')`);
await db.exec(`insert into public.crescite_admins (user_id) values ('${U.barbara}'), ('${U.admin2}')`);
await db.exec(`
  insert into public.crescite_spectacles (slug, titre) values ('berenice', 'Bérénice');
  insert into public.crescite_lieux (nom, commune, departement) values ('L’Eclat', 'Pont-Audemer', '27');
  insert into public.crescite_personnes (slug, prenom, nom) values ('lauren', 'Lauren', 'Toulin'), ('adrien', 'Adrien', 'Vada'),
    ('thomas', 'Thomas', 'J'), ('rempl', 'Rem', 'Plaçant'), ('sans-compte', 'Sans', 'Compte'), ('barbara', 'Barbara', 'D');
`);
const id = async (t, slug) => (await db.query(`select id from public.${t} where slug = $1`, [slug])).rows[0].id;
const P = {};
for (const k of ['lauren', 'adrien', 'thomas', 'rempl', 'sans-compte', 'barbara']) P[k] = await id('crescite_personnes', k);
const ber = await id('crescite_spectacles', 'berenice');
const lieu = (await db.query(`select id from public.crescite_lieux limit 1`)).rows[0].id;
await db.exec(`
  insert into public.crescite_personnes_privees (personne_id, email, user_id) values
    (${P.lauren}, 'lauren@x', '${U.lauren}'), (${P.adrien}, 'adrien@x', '${U.adrien}'), (${P.thomas}, 'thomas@x', '${U.thomas}'),
    (${P.rempl}, 'rempl@x', '${U.rempl}'), (${P['sans-compte']}, null, null), (${P.barbara}, 'barbara@x', '${U.barbara}');
  insert into public.crescite_distributions (spectacle_id, personne_id, categorie, en_tournee) values
    (${ber}, ${P.lauren}, 'jeu', true), (${ber}, ${P.adrien}, 'jeu', true), (${ber}, ${P.thomas}, 'creation', false), (${ber}, ${P['sans-compte']}, 'jeu', true);
`);
const jour = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const d = (await db.query(`insert into public.crescite_dates (spectacle_id, lieu_id, debut, fin) values ($1, $2, $3, $3) returning id`, [ber, lieu, jour(20)])).rows[0].id;
const passee = (await db.query(`insert into public.crescite_dates (spectacle_id, lieu_id, debut, fin) values ($1, $2, $3, $3) returning id`, [ber, lieu, jour(-20)])).rows[0].id;
await db.exec(`insert into public.crescite_equipes (date_id, personne_id, present) values (${d}, ${P.adrien}, false), (${d}, ${P.rempl}, true)`);
// Rem et Lauren ont un téléphone abonné aux notifications ; Barbara non
await db.exec(`insert into public.crescite_abonnements (personne_id, endpoint, p256dh, auth) values (${P.rempl}, 'https://push/r', 'k', 'a'), (${P.lauren}, 'https://push/l', 'k', 'a')`);
await db.exec(`delete from public.crescite_notifications; delete from net.appels`);

const as = async (role, sub, q, params) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub || ''}', false), set_config('request.jwt.claims', '', false);`);
  try { return await db.query(q, params); } finally { await db.exec('reset role'); }
};
const essai = async (...a) => { try { await as(...a); return 'ok'; } catch (e) { return `${e.code || ''} ${e.message}`; } };
const signaler = (qui, texte, date = d) => as('authenticated', U[qui], `select public.crescite_signaler($1, $2) n`, [date, texte]).then(r => r.rows[0].n);
const recues = async k => (await db.query(`select type, titre, texte, date_id, spectacle_id, lien from public.crescite_notifications where personne_id = $1 order by id`, [P[k]])).rows;

// 1. Lauren signale un retard : l'équipe de la date et l'administration sont prévenues, pas elle
const n1 = await signaler('lauren', '  Retard ~30 min (train/route) :   accident A13  ');
ok(n1 === 2, `Lauren signale un retard : ${n1} personnes prévenues (le remplaçant de la date et l’administratrice)`);
const r = (await recues('rempl'))[0];
ok(r && r.type === 'message' && r.titre === 'Retard ou imprévu : Lauren Toulin' && r.lien === `#/date/${d}` && Number(r.spectacle_id) === Number(ber),
  `la notification : « ${r?.titre} », lien ${r?.lien}`);
ok(r && /^Retard ~30 min \(train\/route\) : accident A13 · Bérénice · \d+ \S+ · Pont-Audemer$/.test(r.texte), `son texte, espaces resserrés, et la date : « ${r?.texte} »`);
ok(r && r.date_id === null, 'sans date_id : un message de l’administration ne viendra pas la réécrire');
ok((await recues('barbara')).length === 1, 'l’administratrice qui a une fiche la reçoit');
ok((await recues('lauren')).length === 0, 'son auteur ne la reçoit pas');
ok((await recues('adrien')).length === 0 && (await recues('thomas')).length === 0 && (await recues('sans-compte')).length === 0,
  'ni Adrien (retiré de la date), ni Thomas (pas en tournée), ni la personne sans compte');
const appels = (await db.query(`select url, body from net.appels`)).rows;
const idRempl = (await db.query(`select id from public.crescite_notifications where personne_id = $1`, [P.rempl])).rows[0].id;
ok(appels.length === 1 && appels[0].url.endsWith('/functions/v1/crescite-push') && Number(appels[0].body.notification_id) === Number(idRempl),
  `elle part vers le téléphone abonné (${appels.length} appel de crescite-push : celui du remplaçant ; Lauren, abonnée, n’est pas destinataire)`);

// 2. qui peut l'envoyer
ok(/^42501/.test(await essai('authenticated', U.adrien, `select public.crescite_signaler($1, 'x')`, [d])), 'Adrien, retiré de la date, ne peut pas');
ok(/^42501/.test(await essai('authenticated', U.thomas, `select public.crescite_signaler($1, 'x')`, [d])), 'Thomas, qui ne part pas en tournée, non plus');
ok(/^42501/.test(await essai('authenticated', U.dehors, `select public.crescite_signaler($1, 'x')`, [d])), 'ni un compte du projet hors de l’équipe');
ok(/^42501/.test(await essai('anon', '', `select public.crescite_signaler($1, 'x')`, [d])), 'ni le public');
ok(await signaler('rempl', 'Panne / Problème véhicule') === 2, 'le remplaçant ajouté à la date, si (Lauren et l’administratrice sont prévenues)');
ok(await signaler('admin2', 'Le théâtre ouvre à 13h') === 3 && (await recues('lauren')).at(-1).titre === 'Retard ou imprévu : l’administration',
  'un administrateur sans fiche aussi : l’équipe de la date et l’administratrice sont prévenues, au nom de « l’administration »');

// 3. le texte et la date
ok(/^22023/.test(await essai('authenticated', U.lauren, `select public.crescite_signaler($1, '   ')`, [d])), 'un message vide est refusé');
ok(/^22023/.test(await essai('authenticated', U.lauren, `select public.crescite_signaler($1, $2)`, [d, 'x'.repeat(281)])), 'un message de 281 caractères aussi');
ok(/^22023 Cette date est passée/.test(await essai('authenticated', U.lauren, `select public.crescite_signaler($1, 'x')`, [passee])), 'une date passée ne se signale pas');
ok(/^22023 Cette date est passée/.test(await essai('authenticated', U.barbara, `select public.crescite_signaler($1, 'x')`, [passee])), 'même par l’administration');
ok(/^22023/.test(await essai('authenticated', U.barbara, `select public.crescite_signaler(999999, 'x')`)), 'ni une date qui n’existe pas');

// 4. un message de l'administration dans le quart d'heure : il ne réécrit pas l'alerte, il part à son tour
const avant = (await recues('rempl')).length;
await db.exec(`delete from net.appels`);
await as('authenticated', U.barbara, `select public.crescite_prevenir_equipe($1, 'Rendez-vous avancé à 13h')`, [d]);
const apres = await recues('rempl');
ok(apres.length === avant + 1 && apres[0].titre === 'Retard ou imprévu : Lauren Toulin' && apres.at(-1).titre === 'Rendez-vous avancé à 13h',
  'un message de l’administration envoyé juste après ne réécrit pas l’alerte : les deux restent');
ok((await db.query(`select count(*)::int n from net.appels`)).rows[0].n === 2, 'et le message de l’administration part, lui aussi, vers les téléphones abonnés (Rem et Lauren)');

// 5. cinq alertes par heure et par compte
for (let i = 2; i <= 5; i++) await signaler('lauren', `Retard n° ${i}`);
const nb = (await recues('rempl')).length;
const refus = await essai('authenticated', U.lauren, `select public.crescite_signaler($1, 'Une de trop')`, [d]);
ok(/^PT429 Cinq alertes en une heure/.test(refus), `la sixième alerte de l’heure est refusée (${refus.trim()})`);
ok((await recues('rempl')).length === nb, 'et rien n’est parti');
ok(await signaler('rempl', 'Moi, je peux encore') === 2, 'la limite est celle de chaque compte');
await db.exec(`update public.crescite_signalements set cree_le = now() - interval '61 minutes' where user_id = '${U.lauren}'`);
ok(await signaler('lauren', 'Une heure plus tard') === 2, 'une heure plus tard, Lauren peut de nouveau');

// 6. ce que chacun relit
const lues = async k => (await as('authenticated', U[k], `select count(*)::int n from public.crescite_signalements`)).rows[0].n;
ok(await lues('lauren') === 6 && await lues('rempl') === 2 && await lues('barbara') === 9, 'chacun relit ses alertes ; l’administration toutes');
const sl = (await as('authenticated', U.lauren, `select texte, prevenus, personne_id from public.crescite_signalements order by id limit 1`)).rows[0];
ok(sl.texte === 'Retard ~30 min (train/route) : accident A13' && sl.prevenus === 2 && Number(sl.personne_id) === Number(P.lauren), 'avec le texte, son auteur et le nombre de personnes prévenues');
ok(await lues('dehors') === 0 && /permission denied/.test(await essai('anon', '', `select * from public.crescite_signalements`)), 'un compte hors de l’équipe n’en relit aucune ; le public rien');
ok(/permission denied/.test(await essai('authenticated', U.lauren, `insert into public.crescite_signalements (date_id, texte) values ($1, 'x')`, [d]))
   && /permission denied/.test(await essai('authenticated', U.barbara, `delete from public.crescite_signalements`)), 'personne ne les écrit ni ne les efface à la main');
ok(!(await db.query(`select has_function_privilege('anon', 'public.crescite_signaler(bigint, text)', 'execute') a`)).rows[0].a, 'le public n’a pas le droit d’appeler la fonction');
