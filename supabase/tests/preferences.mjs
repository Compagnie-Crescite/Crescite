// Les six migrations Crescite dans un Postgres local (PGlite), puis les préférences : chacun écrit et relit les siennes
// (comme le fait la page, par un « upsert ») ; personne, pas même l'administration, ne voit ni ne change celles d'un
// autre ; le public n'a rien.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const lire = f => readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8');
const M = ['20261020_crescite_base.sql', '20261021_crescite_equipe.sql', '20261022_crescite_notifications.sql',
  '20261023_crescite_pro.sql', '20261024_crescite_disponibilites.sql', '20261025_crescite_preferences.sql'].map(lire);
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
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema public to anon, authenticated, service_role;
  create schema net; create table net.appels (url text, body jsonb, headers jsonb);
  create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
    returns bigint language sql as $$ insert into net.appels values (url, body, headers); select 1::bigint $$;
`);
try { await db.exec('create publication supabase_realtime'); } catch (e) { /* pas de publication ici */ }
for (const s of M) await db.exec(s);
await db.exec(M[5]); await db.exec(M[4]); await db.exec(M[0]); await db.exec(M[1]); await db.exec(M[2]); await db.exec(M[3]);
const fin = await db.exec(M[5]);
ok(true, 'les six migrations passent, relancées dans le désordre sans erreur');
ok((await db.query(`select count(*)::int n from pg_policies where tablename = 'crescite_preferences' and policyname like 'pref\\_%'`)).rows[0].n === 4,
  'relancer les autres scripts ne retire pas les règles des préférences (quatre)');
const etat = fin.at(-1).rows;
ok(etat.length === 2 && /^prêtes/.test(etat[0]['état']) && /aucune liste/.test(etat[1]['état']), `le script dit ce qui est en place : ${etat.map(r => r['état']).join(' | ')}`);

const U = { admin: '11111111-1111-1111-1111-111111111111', lauren: '22222222-2222-2222-2222-222222222222', adrien: '33333333-3333-3333-3333-333333333333' };
for (const k in U) await db.exec(`insert into auth.users values ('${U[k]}', '${k}@x')`);
await db.exec(`insert into public.crescite_admins (user_id) values ('${U.admin}')`);
const as = async (role, sub, q, params) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub || ''}', false), set_config('request.jwt.claims', '', false);`);
  try { return await db.query(q, params); } finally { await db.exec('reset role'); }
};
const essai = async (role, sub, q, params) => { try { await as(role, sub, q, params); return 'ok'; } catch (e) { return e.message; } };
// ce que fait la page : supabase-js upsert({ user_id, cle, valeur }, { onConflict: 'user_id,cle' })
const UPSERT = `insert into public.crescite_preferences (user_id, cle, valeur) values ($1, $2, $3::jsonb)
                on conflict (user_id, cle) do update set valeur = excluded.valeur returning valeur`;
const mes = async u => (await as('authenticated', u, `select user_id, cle, valeur, modifie_le from public.crescite_preferences order by cle`)).rows;

// écrire et relire les siennes
ok((await essai('authenticated', U.lauren, `insert into public.crescite_preferences (cle, valeur) values ('planning.masques', '[4, 7]')`)) === 'ok',
  'Lauren écrit une préférence (le compte se met tout seul : user_id = auth.uid())');
let l = await mes(U.lauren);
ok(l.length === 1 && l[0].user_id === U.lauren && JSON.stringify(l[0].valeur) === '[4,7]', 'elle la relit : [4, 7]');
await db.exec(`update public.crescite_preferences set modifie_le = now() - interval '1 day' where user_id = '${U.lauren}'`);
ok((await as('authenticated', U.lauren, UPSERT, [U.lauren, 'planning.masques', '[5]'])).rows[0].valeur[0] === 5, 'elle la change par un upsert (comme la page)');
l = await mes(U.lauren);
ok(l.length === 1 && JSON.stringify(l[0].valeur) === '[5]' && Date.now() - new Date(l[0].modifie_le).getTime() < 3600e3, 'toujours une seule ligne, [5], et sa date de modification suit');
ok((await essai('authenticated', U.lauren, `insert into public.crescite_preferences (cle) values ('essai.vide')`)) === 'ok'
   && (await as('authenticated', U.lauren, `select valeur from public.crescite_preferences where cle = 'essai.vide'`)).rows[0].valeur === null, 'sans valeur : null (JSON)');
ok((await essai('authenticated', U.lauren, `delete from public.crescite_preferences where cle = 'essai.vide'`)) === 'ok' && (await mes(U.lauren)).length === 1, 'elle efface les siennes');

// rien chez les autres
ok((await mes(U.adrien)).length === 0, 'Adrien ne voit pas celles de Lauren');
ok((await as('authenticated', U.adrien, `select count(*)::int n from public.crescite_preferences where user_id = $1`, [U.lauren])).rows[0].n === 0, 'même en les cherchant');
ok((await mes(U.admin)).length === 0, 'l’administration non plus');
ok((await as('authenticated', U.adrien, `update public.crescite_preferences set valeur = '[]' where user_id = $1 returning user_id`, [U.lauren])).rows.length === 0
   && (await as('authenticated', U.admin, `update public.crescite_preferences set valeur = '[]' returning user_id`)).rows.length === 0
   && JSON.stringify((await mes(U.lauren))[0].valeur) === '[5]', 'ni Adrien ni l’administration ne les changent');
ok((await as('authenticated', U.adrien, `delete from public.crescite_preferences where user_id = $1 returning user_id`, [U.lauren])).rows.length === 0
   && (await mes(U.lauren)).length === 1, 'ni ne les effacent');
ok((await essai('authenticated', U.adrien, UPSERT, [U.lauren, 'planning.masques', '[1]'])) !== 'ok'
   && (await essai('authenticated', U.adrien, `insert into public.crescite_preferences (user_id, cle, valeur) values ($1, 'autre', '1')`, [U.lauren])) !== 'ok'
   && JSON.stringify((await mes(U.lauren))[0].valeur) === '[5]', 'ni n’écrivent à leur nom (ajout ou upsert refusés)');
ok((await essai('authenticated', U.lauren, `update public.crescite_preferences set user_id = $1`, [U.adrien])) !== 'ok', 'Lauren ne donne pas sa ligne à un autre compte');
ok((await as('authenticated', U.adrien, UPSERT, [U.adrien, 'planning.masques', '[4]'])).rows.length === 1
   && JSON.stringify((await mes(U.adrien)).map(x => x.valeur)) === '[[4]]' && JSON.stringify((await mes(U.lauren)).map(x => x.valeur)) === '[[5]]',
   'la même clé pour Adrien : chacun la sienne');
ok((await essai('authenticated', '', `insert into public.crescite_preferences (cle, valeur) values ('x', '1')`)) !== 'ok', 'connecté sans compte : rien à écrire');

// le public n'a rien
ok((await essai('anon', '', `select * from public.crescite_preferences`)) !== 'ok', 'le public ne lit rien');
ok((await essai('anon', '', `insert into public.crescite_preferences (user_id, cle, valeur) values ($1, 'x', '1')`, [U.lauren])) !== 'ok', 'ni n’écrit');
ok(!(await db.query(`select has_table_privilege('anon', 'public.crescite_preferences', 'select') or has_table_privilege('anon', 'public.crescite_preferences', 'insert') a`)).rows[0].a,
  'aucun droit pour anon sur la table');

// un compte supprimé emporte ses préférences
await db.exec(`delete from auth.users where id = '${U.adrien}'`);
ok((await db.query(`select count(*)::int n from public.crescite_preferences where user_id = $1`, [U.adrien])).rows[0].n === 0, 'un compte supprimé emporte ses préférences');
