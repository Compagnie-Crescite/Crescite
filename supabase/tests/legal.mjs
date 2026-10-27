// Le dix-huitième script (les textes du site d'aujourd'hui), dans un Postgres local (PGlite) : le premier script, les
// textes légaux de l'ancien WordPress et les phrases du « Théâtre des Crescite » tels que l'import les a posés, puis lui,
// deux fois. La base garde alors, mot pour mot, les textes de data/textes-legaux.json ; chaque phrase est récrite, accords
// compris, et seulement elle ; l'ancien texte est au journal ; le bilan dit « à jour » ; relancé, il ne double rien.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
const lire = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const BASE = lire('../migrations/20261020_crescite_base.sql');
const DIX_HUITIEME = lire('../migrations/20261106_crescite_textes.sql');
const LEGAL = Object.fromEntries(Object.entries(JSON.parse(lire('../../data/textes-legaux.json'))).filter(([k]) => !k.startsWith('_')));
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

await db.exec(BASE);
const ANCIEN = { 'mentions-legales': { titre: 'Mentions légales', blocs: ['<strong>Hébergeur</strong><br/>● WP serveur'] },
  'politique-de-confidentialite': { titre: 'Politique de confidentialité', blocs: ['Certains de nos outils utilisent Google Analytics et Google Adwords.'] } };
await db.query(`insert into public.crescite_textes (cle, valeur) values ('legal', $1::jsonb)`, [JSON.stringify(ANCIEN)]);
const MACBETH = 'Le Théâtre des Crescite revendique le souhait de pratiquer un « théâtre pauvre » au sens noble du terme.';
await db.query(`insert into public.crescite_spectacles (slug, titre, texte, affirmations) values ('macbeth-fatum', 'Macbeth', $1::jsonb, $2::jsonb)`,
  [JSON.stringify(['Un autre paragraphe.', MACBETH]), JSON.stringify([{ texte: MACBETH, source: 'crescite.fr' }])]);
await db.query(`insert into public.crescite_textes (cle, valeur) values ('dossier:berenice', $1::jsonb)`,
  [JSON.stringify({ partenaires: "Le Théâtre des Crescite est conventionné par la Ville de Rouen", alexandrin: { paragraphes: ["Avec Bérénice, un des objectifs fondamentaux du Théâtre des Crescite est d'offrir la pureté."] } })]);

for (const tour of [1, 2]) {
  const r = await db.exec(DIX_HUITIEME);
  const bilan = r[r.length - 1].rows;
  ok(bilan.length === 3 && bilan.every(l => l['état'].startsWith('à jour')), `tour ${tour} : le bilan dit « à jour » (${bilan.map(l => l['état']).join(' ; ')})`);
  const { rows: [l] } = await db.query(`select valeur from public.crescite_textes where cle = 'legal'`);
  ok(isDeepStrictEqual(l.valeur, LEGAL), `tour ${tour} : la base a, mot pour mot, les textes de data/textes-legaux.json`);
}
const { rows: [n] } = await db.query(`select count(*)::int as n from public.crescite_textes`);
ok(n.n === 2, 'deux lignes dans crescite_textes : rien de doublé');
const { rows: [m] } = await db.query(`select texte, affirmations from public.crescite_spectacles where slug = 'macbeth-fatum'`);
ok(m.texte[0] === 'Un autre paragraphe.' && m.texte[1].startsWith('Les Crescite revendiquent le souhait') && m.affirmations[0].texte.startsWith('Les Crescite revendiquent')
  && m.affirmations[0].source === 'crescite.fr', 'Macbeth : « Les Crescite revendiquent », le reste intact');
const { rows: [b] } = await db.query(`select valeur from public.crescite_textes where cle = 'dossier:berenice'`);
ok(b.valeur.partenaires === 'La compagnie Crescite est conventionnée par la Ville de Rouen'
  && b.valeur.alexandrin.paragraphes[0] === "Avec Bérénice, un des objectifs fondamentaux de la compagnie Crescite est d'offrir la pureté.", 'le dossier de Bérénice : « la compagnie Crescite », accordé');
const { rows: [g] } = await db.query(`select valeur from public.crescite_textes where cle = 'legal'`);
ok(JSON.stringify(g.valeur).includes('(Théâtre des Crescite)'), 'les mentions légales gardent la dénomination entre parenthèses');
const { rows: j } = await db.query(`select avant from public.crescite_journal where table_nom = 'crescite_textes' and operation = 'UPDATE' order by id`);
ok(j.length >= 1 && JSON.stringify(j[0].avant.valeur).includes('WP serveur'), "l'ancien texte est au journal : on peut y revenir");
