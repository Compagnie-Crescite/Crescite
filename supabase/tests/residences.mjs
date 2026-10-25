// Les migrations Crescite dans un Postgres local (PGlite), puis les résidences (le douzième script) : une résidence se
// montre ou non sur le site comme une représentation (sa case « visible »), le public la lit quand elle est visible ;
// une répétition ou une date « autre » reste masquée d'office ; montrer une résidence passée ne prévient personne ; le
// script se relance, avant et après les autres (le premier et le troisième gardent la même règle).
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const lire = f => readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8');
const M = ['20261020_crescite_base.sql', '20261021_crescite_equipe.sql', '20261022_crescite_notifications.sql',
  '20261023_crescite_pro.sql', '20261024_crescite_disponibilites.sql', '20261025_crescite_preferences.sql',
  '20261026_crescite_ideale.sql', '20261027_crescite_documents_publics.sql', '20261028_crescite_signaler.sql',
  '20261029_crescite_chiffres.sql', '20261031_crescite_residences.sql'].map(lire);
const DOUZE = M.length - 1;
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
  create schema net; create table net.appels (url text, body jsonb, headers jsonb);
  create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
    returns bigint language sql as $$ insert into net.appels values (url, body, headers); select 1::bigint $$;
`);
try { await db.exec('create publication supabase_realtime'); } catch (e) { /* PGlite sans publication */ }
for (const s of M) await db.exec(s);
const echecs = [];
for (const i of [DOUZE, 0, 2, DOUZE]) { try { await db.exec(M[i]); } catch (e) { echecs.push(`script ${i + 1} : ${e.message}`); await db.exec('rollback').catch(() => {}); } }
ok(!echecs.length, `les migrations passent ; le douzième script se relance, avant et après le premier et le troisième${echecs.length ? ` (${echecs.join(' ; ')})` : ''}`);
const fin = await db.exec(M[DOUZE]);
ok(/^prêtes/.test(fin.at(-1).rows[0]['état']), `il dit ce qui est en place : ${fin.at(-1).rows.map(r => r['état']).join(' | ')}`);

await db.exec(`
  insert into public.crescite_spectacles (slug, titre, publie) values ('un-spectacle', 'Un spectacle', true);
  insert into public.crescite_lieux (nom, commune, departement) values ('Le Théâtre', 'Rouen', '76');
`);
const sp = (await db.query(`select id from public.crescite_spectacles limit 1`)).rows[0].id;
const lieu = (await db.query(`select id from public.crescite_lieux limit 1`)).rows[0].id;
const nouvelle = async (nature, debut, visible = true) => (await db.query(
  `insert into public.crescite_dates (spectacle_id, lieu_id, debut, fin, visible, nature, public) values ($1, $2, $3, $3, $4, $5, 'autre') returning id, visible`,
  [sp, lieu, debut, visible, nature])).rows[0];
const lit = async (role, q, params) => { await db.exec(`set role ${role}`); try { return await db.query(q, params); } finally { await db.exec('reset role'); } };

// une résidence visible se lit par le public ; une répétition, une date « autre » sont masquées d'office
const r1 = await nouvelle('residence', '2025-11-17');
ok(r1.visible, 'une résidence enregistrée visible le reste');
const pub = (await lit('anon', `select id from public.crescite_dates where id = $1`, [r1.id])).rows;
ok(pub.length === 1, 'le public lit une résidence visible');
const r2 = await nouvelle('residence', '2025-11-24', false);
ok(!(await lit('anon', `select id from public.crescite_dates where id = $1`, [r2.id])).rows.length, 'une résidence masquée ne se lit pas');
const rep = await nouvelle('repetitions', '2025-12-01');
ok(!rep.visible, 'une répétition est masquée d’office');
const autre = await nouvelle('autre', '2025-12-02');
ok(!autre.visible, 'une date « autre » est masquée d’office');

// une représentation qui devient une résidence garde sa case ; une résidence qui devient une répétition se masque
const d = (await db.query(`insert into public.crescite_dates (spectacle_id, lieu_id, debut, fin, visible) values ($1, $2, '2020-10-26', '2020-10-30', true) returning id`, [sp, lieu])).rows[0].id;
await db.query(`update public.crescite_dates set nature = 'residence' where id = $1`, [d]);
ok((await db.query(`select visible from public.crescite_dates where id = $1`, [d])).rows[0].visible, 'une représentation passée en résidence reste visible');
await db.query(`update public.crescite_dates set nature = 'repetitions' where id = $1`, [d]);
ok(!(await db.query(`select visible from public.crescite_dates where id = $1`, [d])).rows[0].visible, 'passée en répétition, elle se masque');

// montrer des résidences passées (ce que fera la compagnie, d'un coup) ne prévient personne
const avant = (await db.query(`select count(*)::int n from public.crescite_notifications`)).rows[0].n;
await db.query(`update public.crescite_dates set visible = true where nature = 'residence' and not visible`);
const apres = (await db.query(`select count(*)::int n from public.crescite_notifications`)).rows[0].n;
ok(apres === avant && (await db.query(`select visible from public.crescite_dates where id = $1`, [r2.id])).rows[0].visible,
  `montrer les résidences passées ne crée aucune notification (${avant} → ${apres})`);

const rapport = await db.exec(M[DOUZE]);
ok(/2 \(2 visibles/.test(rapport.at(-1).rows[1]['état']), `relancé, il compte les résidences : ${rapport.at(-1).rows[1]['état']}`);
