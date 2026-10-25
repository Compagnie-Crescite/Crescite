// Les dix migrations Crescite dans un Postgres local (PGlite), puis les chiffres des dates (le dixième script) : la
// jauge, les spectateurs et les heures d'ateliers ne sont jamais publics ; l'équipe les lit, l'administration seule les
// écrit ; chaque changement va au journal ; une date effacée emporte ses chiffres ; le script se relance, avant et après
// les autres, sans rien ouvrir de plus.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const lire = f => readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8');
const M = ['20261020_crescite_base.sql', '20261021_crescite_equipe.sql', '20261022_crescite_notifications.sql',
  '20261023_crescite_pro.sql', '20261024_crescite_disponibilites.sql', '20261025_crescite_preferences.sql',
  '20261026_crescite_ideale.sql', '20261027_crescite_documents_publics.sql', '20261028_crescite_signaler.sql',
  '20261029_crescite_chiffres.sql'].map(lire);
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
let publication = true;
try { await db.exec('create publication supabase_realtime'); } catch (e) { publication = false; }
for (const s of M) await db.exec(s);
const echecs = [];
for (const i of [9, 0, 1, 2, 6, 9]) { try { await db.exec(M[i]); } catch (e) { echecs.push(`script ${i + 1} : ${e.message}`); await db.exec('rollback').catch(() => {}); } }
ok(!echecs.length, `les dix migrations passent ; le dixième script se relance sans erreur, avant et après les autres${echecs.length ? ` (${echecs.join(' ; ')})` : ''}`);
const fin = await db.exec(M[9]);
const regles = (await db.query(`select policyname from pg_policies where tablename = 'crescite_dates_chiffres' order by 1`)).rows.map(r => r.policyname);
ok(/^prêts/.test(fin.at(-1).rows[0]['état']) && regles.length === 4,
  `il dit ce qui est en place et garde ses quatre règles : ${fin.at(-1).rows.map(r => r['état']).join(' | ')} (${regles.join(', ')})`);
if (publication) {
  const pub = (await db.query(`select count(*)::int n from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'crescite_dates_chiffres'`)).rows[0].n;
  ok(pub === 1, 'la table est dans la publication du temps réel (une fois, même relancé)');
}

// une administratrice qui a sa fiche, une comédienne, un compte du projet qui n'est pas de l'équipe
const U = { admin: '11111111-1111-1111-1111-111111111111', comedienne: '22222222-2222-2222-2222-222222222222',
  dehors: '33333333-3333-3333-3333-333333333333' };
for (const k in U) await db.exec(`insert into auth.users values ('${U[k]}', '${k}@exemple.fr')`);
await db.exec(`insert into public.crescite_admins (user_id) values ('${U.admin}')`);
await db.exec(`
  insert into public.crescite_spectacles (slug, titre, publie) values ('un-spectacle', 'Un spectacle', true);
  insert into public.crescite_lieux (nom, commune, departement) values ('Le Théâtre', 'Rouen', '76');
  insert into public.crescite_personnes (slug, prenom, nom) values ('admin', 'Ad', 'Min'), ('comedienne', 'Co', 'Médienne');
`);
const pid = async slug => (await db.query(`select id from public.crescite_personnes where slug = $1`, [slug])).rows[0].id;
await db.exec(`insert into public.crescite_personnes_privees (personne_id, email, user_id) values
  (${await pid('admin')}, 'admin@exemple.fr', '${U.admin}'), (${await pid('comedienne')}, 'comedienne@exemple.fr', '${U.comedienne}')`);
const sp = (await db.query(`select id from public.crescite_spectacles limit 1`)).rows[0].id;
const lieu = (await db.query(`select id from public.crescite_lieux limit 1`)).rows[0].id;
const nouvelleDate = async (debut, visible = true) => (await db.query(
  `insert into public.crescite_dates (spectacle_id, lieu_id, debut, fin, visible) values ($1, $2, $3, $3, $4) returning id`,
  [sp, lieu, debut, visible])).rows[0].id;
const d1 = await nouvelleDate('2024-03-12'), d2 = await nouvelleDate('2025-01-20');

const as = async (role, sub, q, params) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub || ''}', false)`);
  try { return await db.query(q, params); } finally { await db.exec('reset role'); }
};
const refuse = async (role, sub, q, params) => { try { await as(role, sub, q, params); return false; } catch (e) { return true; } };

// l'administration écrit
await as('authenticated', U.admin, `insert into public.crescite_dates_chiffres (date_id, jauge, spectateurs, heures_ateliers, source)
  values ($1, 260, 240, 6, 'Récapitulatif, ligne 12'), ($2, null, null, 12.5, 'Récapitulatif, ligne 40')`, [d1, d2]);
const lu = (await as('authenticated', U.admin, `select * from public.crescite_dates_chiffres order by date_id`)).rows;
ok(lu.length === 2 && lu[0].jauge === 260 && lu[0].spectateurs === 240 && Number(lu[1].heures_ateliers) === 12.5,
  'l’administration écrit et relit la jauge, les spectateurs et les heures d’ateliers (une demi-heure comprise)');
await as('authenticated', U.admin, `update public.crescite_dates_chiffres set spectateurs = 250 where date_id = $1`, [d1]);
const apres = (await db.query(`select spectateurs, modifie_par from public.crescite_dates_chiffres where date_id = $1`, [d1])).rows[0];
ok(apres.spectateurs === 250 && apres.modifie_par === U.admin, 'un changement garde son auteur');
const journal = (await db.query(`select operation, ligne from public.crescite_journal where table_nom = 'crescite_dates_chiffres' order by id`)).rows;
ok(journal.length === 3 && journal[0].ligne === String(d1) && journal[2].operation === 'UPDATE',
  `chaque changement va au journal, avec la date (${journal.map(j => `${j.operation} ${j.ligne}`).join(', ')})`);

// l'équipe lit, n'écrit pas
const vu = (await as('authenticated', U.comedienne, `select date_id, jauge, spectateurs from public.crescite_dates_chiffres order by date_id`)).rows;
ok(vu.length === 2 && vu[0].spectateurs === 250, 'une personne de l’équipe lit les chiffres de toutes les dates');
ok(await refuse('authenticated', U.comedienne, `insert into public.crescite_dates_chiffres (date_id, jauge) values ($1, 10)`, [await nouvelleDate('2025-02-02')]),
  'elle n’en ajoute pas');
const change = await as('authenticated', U.comedienne, `update public.crescite_dates_chiffres set jauge = 1 where date_id = $1 returning date_id`, [d1]);
ok(!change.rows.length && (await db.query(`select jauge from public.crescite_dates_chiffres where date_id = $1`, [d1])).rows[0].jauge === 260,
  'elle n’en change pas');
const efface = await as('authenticated', U.comedienne, `delete from public.crescite_dates_chiffres where date_id = $1 returning date_id`, [d1]);
ok(!efface.rows.length, 'elle n’en efface pas');

// ni le public, ni un compte du projet qui n'est pas de l'équipe
ok(await refuse('anon', '', `select * from public.crescite_dates_chiffres`), 'le public n’a aucun droit sur la table (pas même la lire)');
ok(await refuse('anon', '', `insert into public.crescite_dates_chiffres (date_id, jauge) values ($1, 10)`, [d2]), 'le public n’y écrit pas');
const dehors = (await as('authenticated', U.dehors, `select * from public.crescite_dates_chiffres`)).rows;
ok(!dehors.length, 'un compte du projet sans fiche dans l’équipe n’en lit rien');
ok(!(await as('authenticated', U.dehors, `update public.crescite_dates_chiffres set jauge = 1 returning date_id`)).rows.length,
  'ni n’en change');

// les contrôles des valeurs
ok(await refuse('authenticated', U.admin, `update public.crescite_dates_chiffres set spectateurs = -1 where date_id = $1`, [d1]), 'pas de nombre négatif');
ok(await refuse('authenticated', U.admin, `insert into public.crescite_dates_chiffres (date_id) values (999999)`), 'pas de chiffres pour une date qui n’existe pas');

// une date effacée emporte ses chiffres
await as('authenticated', U.admin, `delete from public.crescite_dates where id = $1`, [d2]);
ok(!(await db.query(`select 1 from public.crescite_dates_chiffres where date_id = $1`, [d2])).rows.length, 'une date effacée emporte ses chiffres');

// le suivi interne reste à l'administration seule (organisateur, contacts, contrat)
const suivi = (await db.query(`select policyname from pg_policies where tablename = 'crescite_dates_suivi' and cmd = 'SELECT'`)).rows.map(r => r.policyname);
ok(suivi.every(p => !/^chiffres_/.test(p)), `aucune règle de ce script sur le suivi (${suivi.join(', ')})`);

const final = await db.exec(M[9]);
ok(/1 date|une date/.test(final.at(-1).rows[1]['état']), `relancé, il compte les dates chiffrées : ${final.at(-1).rows[1]['état']}`);
