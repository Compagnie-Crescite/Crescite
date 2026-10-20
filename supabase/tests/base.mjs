// Exécute la migration Crescite dans un Postgres local (PGlite) avec des substituts de Supabase, puis vérifie
// les règles d'accès, les déclencheurs et la fonction d'enregistrement.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const sql = readFileSync(new URL('../migrations/20261020_crescite_base.sql', import.meta.url), 'utf8');
const db = new PGlite();
const ok = (c, m) => { if (!c) { console.log('ÉCHEC :', m); process.exitCode = 1; } else console.log('ok :', m); };
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role; grant execute on function auth.uid() to anon, authenticated, service_role;
  create schema storage; create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema public to anon, authenticated, service_role;
`);
try { await db.exec('create publication supabase_realtime'); } catch (e) { console.log('(publication non prise en charge ici :', e.message, ')'); }
await db.exec(sql);
console.log('migration exécutée');
// relancer la migration ne casse rien
await db.exec(sql);
console.log('migration relancée sans erreur');

const A = '11111111-1111-1111-1111-111111111111', B = '22222222-2222-2222-2222-222222222222';
await db.exec(`insert into auth.users values ('${A}', 'admin@x'), ('${B}', 'autre@x'); insert into public.crescite_admins (user_id, nom) values ('${A}', 'Admin');`);
// données de départ (en service)
await db.exec(`
  insert into public.crescite_spectacles (slug, titre, ordre) values ('berenice', 'Bérénice', 5), ('cache', 'Caché', 9);
  update public.crescite_spectacles set publie = false where slug = 'cache';
  insert into public.crescite_lieux (nom, commune, departement, latitude, longitude) values ('L’Eclat', 'Pont-Audemer', '27', 49.35, 0.51);
`);
const sp = (await db.query(`select id from public.crescite_spectacles where slug = 'berenice'`)).rows[0].id;
const cache = (await db.query(`select id from public.crescite_spectacles where slug = 'cache'`)).rows[0].id;
const lieu = (await db.query(`select id from public.crescite_lieux limit 1`)).rows[0].id;
const as = async (role, sub, q, params) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub || ''}', false);`);
  try { return await db.query(q, params); } finally { await db.exec('reset role'); }
};
// l'administration enregistre une date à deux représentations le même jour
const r1 = await as('authenticated', A, `select public.crescite_enregistrer_date($1::jsonb) as id`, [JSON.stringify({
  spectacle_id: sp, lieu_id: lieu, debut: '2026-12-01', statut: 'confirmee', details: [{ texte: '14h et 20h : représentations à L’Eclat', lien: null }],
  representations: [{ jour: '2026-12-18', heure: '14:00', public: 'scolaire' }, { jour: '2026-12-18', heure: '20:00' }],
  suivi: { organisateur: 'L’Eclat', notes: 'contrat signé' } })]);
const did = r1.rows[0].id;
let d = (await db.query(`select * from public.crescite_dates where id = $1`, [did])).rows[0];
ok(d.debut.toISOString().slice(0, 10) === '2026-12-18' && d.saison === '2026-2027' && d.precision === 'jour', `début et saison suivent les représentations (${d.debut.toISOString().slice(0, 10)}, ${d.saison})`);
ok((await db.query(`select count(*)::int n from public.crescite_representations where date_id = $1`, [did])).rows[0].n === 2, 'deux représentations le même jour');
// modification : on retire une représentation, on en ajoute une le lendemain
const reps = (await db.query(`select id, heure from public.crescite_representations where date_id = $1 order by heure`, [did])).rows;
await as('authenticated', A, `select public.crescite_enregistrer_date($1::jsonb)`, [JSON.stringify({ id: did, spectacle_id: sp, lieu_id: lieu, debut: '2026-12-18',
  representations: [{ id: reps[0].id, jour: '2026-12-18', heure: '14:30', public: 'scolaire' }, { jour: '2026-12-19', heure: '20:30' }] })]);
d = (await db.query(`select * from public.crescite_dates where id = $1`, [did])).rows[0];
const rr = (await db.query(`select jour, heure from public.crescite_representations where date_id = $1 order by jour, heure`, [did])).rows;
ok(rr.length === 2 && rr[0].heure === '14:30:00' && d.fin.toISOString().slice(0, 10) === '2026-12-19', 'modification : une représentation retirée, une ajoutée, la fin suit');
// une option n'est pas publique ; une date d'un spectacle non publié non plus
await as('authenticated', A, `select public.crescite_enregistrer_date($1::jsonb)`, [JSON.stringify({ spectacle_id: sp, debut: '2027-03-01', statut: 'option', representations: [] })]);
await as('authenticated', A, `select public.crescite_enregistrer_date($1::jsonb)`, [JSON.stringify({ spectacle_id: cache, debut: '2027-04-01', representations: [] })]);
const vuAnon = (await as('anon', '', `select count(*)::int n from public.crescite_dates`)).rows[0].n;
const vuAdmin = (await as('authenticated', A, `select count(*)::int n from public.crescite_dates`)).rows[0].n;
ok(vuAnon === 1 && vuAdmin === 3, `le public voit 1 date, l'administration 3 (public ${vuAnon}, admin ${vuAdmin})`);
ok((await as('anon', '', `select count(*)::int n from public.crescite_representations`)).rows[0].n === 2, 'le public voit les représentations des dates publiées');
ok((await as('anon', '', `select count(*)::int n from public.crescite_spectacles`)).rows[0].n === 1, 'le public ne voit pas un spectacle non publié');
// le suivi, les séances et le journal restent privés
let refus = 0;
try { await as('anon', '', `select * from public.crescite_dates_suivi`); } catch { refus++; }
ok(refus === 1, 'le public ne peut pas lire le suivi interne');
ok((await as('authenticated', B, `select count(*)::int n from public.crescite_dates_suivi`)).rows[0].n === 0, 'un compte non administrateur ne lit pas le suivi');
ok((await as('authenticated', A, `select count(*)::int n from public.crescite_dates_suivi`)).rows[0].n === 1, "l'administration lit le suivi");
// un compte non administrateur ne peut rien écrire
let e1 = '';
try { await as('authenticated', B, `select public.crescite_enregistrer_date($1::jsonb)`, [JSON.stringify({ spectacle_id: sp, debut: '2027-01-01' })]); } catch (e) { e1 = e.message; }
ok(/administrateurs/.test(e1), 'un compte non administrateur ne peut pas enregistrer de date');
const u = await as('authenticated', B, `update public.crescite_spectacles set titre = 'X' returning id`);
ok(u.rows.length === 0, 'un compte non administrateur ne peut pas modifier un spectacle');
let e2 = '';
try { await as('anon', '', `insert into public.crescite_textes (cle, valeur) values ('x', '{}')`); } catch (e) { e2 = e.message; }
ok(e2 !== '', 'le public ne peut pas écrire');
// l'administration modifie un texte ; le journal garde l'avant et l'après, avec l'auteur
await as('authenticated', A, `insert into public.crescite_textes (cle, valeur) values ('ecole', '{"texte": "a"}')`);
await as('authenticated', A, `update public.crescite_textes set valeur = '{"texte": "b"}' where cle = 'ecole'`);
const j = (await as('authenticated', A, `select * from public.crescite_journal where table_nom = 'crescite_textes' order by id desc limit 1`)).rows[0];
ok(j && j.operation === 'UPDATE' && j.avant.valeur.texte === 'a' && j.apres.valeur.texte === 'b' && j.qui === A, 'le journal garde avant, après et auteur');
const t = (await db.query(`select modifie_par from public.crescite_textes where cle = 'ecole'`)).rows[0];
ok(t.modifie_par === A, 'modifie_par suit la personne connectée');
const v = (await as('anon', '', `select public.crescite_version() as v`)).rows[0].v;
ok(Number(v) > 0, `la version publique avance à chaque enregistrement (${v})`);
// supprimer une date supprime ses représentations
await as('authenticated', A, `delete from public.crescite_dates where id = $1`, [did]);
ok((await db.query(`select count(*)::int n from public.crescite_representations where date_id = $1`, [did])).rows[0].n === 0, 'supprimer une date supprime ses représentations');
// on ne supprime pas un spectacle qui a des dates
let e3 = '';
try { await as('authenticated', A, `delete from public.crescite_spectacles where id = $1`, [cache]); } catch (e) { e3 = e.message; }
ok(/foreign key|violates/.test(e3), 'un spectacle qui a des dates ne peut pas être supprimé');
console.log('saisons :', (await db.query(`select public.crescite_saison('2026-08-31') a, public.crescite_saison('2026-09-01') b`)).rows[0]);
