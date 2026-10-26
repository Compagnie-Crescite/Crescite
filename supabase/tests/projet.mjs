// Le seizième script (la base de la compagnie appelle ses propres fonctions), dans un Postgres local (PGlite) : les quinze
// scripts tels que recopiés de l'ancien projet (leurs adresses ramenées à omekkqjinvppadsoinvj), puis le seizième, deux
// fois. Plus aucune fonction crescite_ ni aucune tâche crescite- n'appelle l'ancien projet ; les quatre fonctions et les
// deux tâches appellent celui de la compagnie, sous le même nom, au même horaire, sans tâche doublée ; les fonctions
// gardent leurs droits et leur security definer ; un appel réel part vers la nouvelle adresse ; le bilan dit « prêtes ».
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, existsSync } from 'node:fs';
const migration = f => new URL(`../migrations/${f}`, import.meta.url);
const ANCIEN = 'omekkqjinvppadsoinvj', NOUVEAU = 'fwjgyfzcbcmfyfkhhtuh';
const FICHIERS = ['20261020_crescite_base.sql', '20261021_crescite_equipe.sql', '20261022_crescite_notifications.sql',
  '20261023_crescite_pro.sql', '20261024_crescite_disponibilites.sql', '20261025_crescite_preferences.sql',
  '20261026_crescite_ideale.sql', '20261027_crescite_documents_publics.sql', '20261028_crescite_signaler.sql',
  '20261029_crescite_chiffres.sql', '20261030_crescite_alertes.sql', '20261031_crescite_residences.sql',
  '20261101_crescite_securite.sql', '20261102_crescite_equipe_modifie.sql', '20261103_crescite_notes.sql'].filter(f => existsSync(migration(f)));
// (la copie du 26 octobre : les scripts tels qu'ils étaient passés dans l'ancien projet)
const COPIE = FICHIERS.map(f => readFileSync(migration(f), 'utf8').replaceAll(NOUVEAU, ANCIEN));
const SEIZIEME = readFileSync(migration('20261104_crescite_projet_compagnie.sql'), 'utf8');
const ok = (c, m) => { if (!c) { console.log('ÉCHEC :', m); process.exitCode = 1; } else console.log('ok :', m); };

const db = new PGlite();
await db.exec(`
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
  -- pg_cron, comme le vrai : une tâche reprogrammée sous son nom est remplacée
  create schema cron; create table cron.job (jobid bigserial primary key, jobname text unique, schedule text, command text);
  create function cron.schedule(n text, s text, c text) returns bigint language sql as $$
    insert into cron.job (jobname, schedule, command) values (n, s, c)
    on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command returning jobid $$;
  create function cron.unschedule(id bigint) returns boolean language sql as $$ delete from cron.job where jobid = id returning true $$;
  insert into pg_catalog.pg_extension (oid, extname, extowner, extnamespace, extrelocatable, extversion)
    values (987654, 'pg_cron', 10, (select oid from pg_namespace where nspname = 'public'), false, '1.6');
`);
try { await db.exec('create publication supabase_realtime'); } catch (e) { /* pas de publication ici */ }

const echecs = [];
for (const [i, s] of COPIE.entries()) { try { await db.exec(s); } catch (e) { echecs.push(`${FICHIERS[i]} : ${e.message}`); await db.exec('rollback').catch(() => {}); } }
ok(!echecs.length, `les ${FICHIERS.length} scripts de l'ancien projet passent${echecs.length ? ` (${echecs.join(' ; ')})` : ''}`);

const FONCTIONS = ['crescite_notif_envoyer()', 'crescite_propositions_prevenir()', 'crescite_renvoyer_courriel(bigint)', 'crescite_alertes_demander(bigint)'];
const etat = async () => ({
  fonctions: (await db.query(`select p.proname, p.prosecdef, p.prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public' and p.proname like 'crescite\\_%' and p.prosrc like '%supabase.co/functions/v1/%' order by 1`)).rows,
  taches: (await db.query(`select jobname, schedule, command from cron.job order by jobname`)).rows,
  droits: (await db.query(`select ${FONCTIONS.map((f, i) => `has_function_privilege('anon', 'public.${f}', 'execute') a${i},
                            has_function_privilege('authenticated', 'public.${f}', 'execute') b${i}`).join(', ')}`)).rows[0],
});
const avant = await etat();
ok(avant.fonctions.length === 4 && avant.fonctions.every(f => f.prosrc.includes(ANCIEN))
   && avant.taches.filter(t => t.command.includes(ANCIEN)).length === 2,
   `avant : les quatre fonctions et les deux tâches appellent l'ancien projet (${avant.fonctions.map(f => f.proname).join(', ')})`);

let bilan;
try { bilan = await db.exec(SEIZIEME); } catch (e) { ok(false, `le seizième script passe (${e.message})`); }
try { bilan = await db.exec(SEIZIEME); ok(true, 'le seizième script passe, et se relance sans erreur'); } catch (e) { ok(false, `le seizième script se relance (${e.message})`); }

const apres = await etat();
// (hors pg_temp : la fonction de bilan du script cherche l'ancienne adresse, elle la contient donc)
const restes = (await db.query(`select count(*)::int n from pg_proc where pronamespace = 'public'::regnamespace and prosrc like '%${ANCIEN}%'`)).rows[0].n;
ok(restes === 0 && apres.fonctions.length === 4 && apres.fonctions.every(f => f.prosrc.includes(`https://${NOUVEAU}.supabase.co/functions/v1/`)),
   'après : plus aucune fonction n’appelle l’ancien projet ; les quatre appellent celui de la compagnie');
ok(JSON.stringify(apres.fonctions.map(f => [f.proname, f.prosecdef])) === JSON.stringify(avant.fonctions.map(f => [f.proname, f.prosecdef]))
   && apres.fonctions.every((f, i) => f.prosrc === avant.fonctions[i].prosrc.replaceAll(ANCIEN, NOUVEAU)),
   'les fonctions sont les mêmes, à l’adresse près, et gardent leur security definer');
ok(JSON.stringify(apres.droits) === JSON.stringify(avant.droits), 'leurs droits ne changent pas (anon, authenticated)');
ok(apres.taches.length === avant.taches.length && apres.taches.every((t, i) => t.jobname === avant.taches[i].jobname
   && t.schedule === avant.taches[i].schedule && t.command === avant.taches[i].command.replaceAll(ANCIEN, NOUVEAU)),
   `les tâches gardent leur nom et leur horaire, sans doublon, avec la nouvelle adresse (${apres.taches.map(t => `${t.jobname} ${t.schedule}`).join(', ')})`);

await db.exec(`insert into public.crescite_secrets (cle, valeur) values ('jeton_push', 'essai-jeton') on conflict (cle) do update set valeur = excluded.valeur`);
await db.exec(`select public.crescite_alertes_demander(1)`);
const appel = (await db.query(`select url from net.appels order by ctid desc limit 1`)).rows[0];
ok(appel?.url === `https://${NOUVEAU}.supabase.co/functions/v1/crescite-courriel`, `un vrai appel part vers le projet de la compagnie (${appel?.url})`);

const lignes = bilan?.at(-1)?.rows || [];
ok(lignes.length === 2 && lignes.every(l => /^prêtes/.test(l['état'])), `le bilan : ${lignes.map(l => `${l['élément']} — ${l['état']}`).join(' | ')}`);
await db.close();
