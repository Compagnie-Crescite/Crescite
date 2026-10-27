// Ce que partagent les essais des scripts récents : un Postgres local (PGlite) préparé comme Supabase (rôles, auth,
// stockage, pg_net, pg_cron simulés), les scripts du dossier migrations/ lancés dans l'ordre, et trois aides.
//   const { db, lire, as, refus, ok } = await base({ avant: '20261108_…sql' })   tous les scripts avant celui-là
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
const dossier = new URL('../migrations/', import.meta.url);
export const lire = f => readFileSync(new URL(f, dossier), 'utf8');
export const ok = (c, m) => { if (!c) { console.log('ÉCHEC :', m); process.exitCode = 1; } else console.log('ok :', m); };
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
export async function base({ avant }) {
  const db = new PGlite();
  await db.exec(PREPARER);
  try { await db.exec('create publication supabase_realtime'); } catch (e) { /* pas de publication ici */ }
  for (const f of readdirSync(dossier).filter(f => f.endsWith('.sql') && f < avant).sort()) await db.exec(lire(f));
  const as = async (role, sub, q, params = []) => {
    await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub || ''}', false), set_config('request.jwt.claims', '', false);`);
    try { return await db.query(q, params); } finally { await db.exec('reset role'); }
  };
  const refus = async (...a) => { try { await as(...a); return null; } catch (e) { return e.message; } };
  return { db, as, refus };
}
