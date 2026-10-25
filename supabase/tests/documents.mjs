// Les huit migrations Crescite dans un Postgres local (PGlite), puis les documents communs aux programmateurs et aux
// établissements (le huitième script, 'tous' et 'pros_scolaires') : les scripts relancés dans le désordre, des documents
// communs déjà rangés, sans erreur ; une seule règle de lecture publique ; le public lit les documents communs d'un
// spectacle publié, pas ceux d'un spectacle masqué ; l'espace pro les ouvre aux salles invitées.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const lire = f => readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8');
const M = ['20261020_crescite_base.sql', '20261021_crescite_equipe.sql', '20261022_crescite_notifications.sql',
  '20261023_crescite_pro.sql', '20261024_crescite_disponibilites.sql', '20261025_crescite_preferences.sql',
  '20261026_crescite_ideale.sql', '20261027_crescite_documents_publics.sql'].map(lire);
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
  -- comme Supabase : une table neuve donne tout à anon et authenticated (les règles et les droits des scripts filtrent)
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  create schema net; create table net.appels (url text, body jsonb, headers jsonb);
  create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
    returns bigint language sql as $$ insert into net.appels values (url, body, headers); select 1::bigint $$;
`);
try { await db.exec('create publication supabase_realtime'); } catch (e) { /* pas de publication ici */ }
for (const s of M) await db.exec(s);
ok(true, 'les huit migrations passent, dans l’ordre');

const U = { admin: '11111111-1111-1111-1111-111111111111', lauren: '22222222-2222-2222-2222-222222222222', dehors: '44444444-4444-4444-4444-444444444444' };
for (const k in U) await db.exec(`insert into auth.users values ('${U[k]}', '${k}@x')`);
await db.exec(`insert into public.crescite_admins (user_id) values ('${U.admin}')`);
await db.exec(`
  insert into public.crescite_spectacles (slug, titre, publie) values ('berenice', 'Bérénice', true), ('en-chantier', 'En chantier', false);
  insert into public.crescite_personnes (slug, prenom, nom) values ('lauren', 'Lauren', 'L');
`);
const id = async (t, slug) => (await db.query(`select id from public.${t} where slug = $1`, [slug])).rows[0].id;
const ber = await id('crescite_spectacles', 'berenice'), cache = await id('crescite_spectacles', 'en-chantier');
await db.exec(`insert into public.crescite_personnes_privees (personne_id, email, user_id) values (${await id('crescite_personnes', 'lauren')}, 'lauren@x', '${U.lauren}')`);
// pour chaque spectacle : un document commun ('tous'), un sous son ancien nom ('pros_scolaires'), un pour les
// programmateurs, un pour les établissements, un pour l'équipe, un pour les salles invitées
const DOCS = [['tous', 'Dossier commun'], ['pros_scolaires', 'Dossier commun (ancien nom)'], ['pros', 'Fiche technique'],
  ['scolaires', 'Dossier pédagogique'], ['equipe', 'Texte de travail'], ['salles', 'Captation intégrale']];
for (const [sp, nom] of [[ber, 'Bérénice'], [cache, 'En chantier']])
  for (const [pour, titre] of DOCS)
    await db.query(`insert into public.crescite_documents (spectacle_id, type, titre, url, pour) values ($1, 'dossier', $2, 'https://x', $3)`, [sp, `${titre} · ${nom}`, pour]);
await db.exec(`insert into public.crescite_documents (spectacle_id, type, titre, url, pour) values (null, 'autre', 'Présentation de la compagnie', 'https://x', 'tous')`);

// relancés dans le désordre, avec des documents communs déjà rangés : le troisième et le quatrième script les acceptent
const ordre = [7, 2, 3, 0, 1, 6, 4, 5, 3, 2, 7], echecs = [];
for (const i of ordre) {
  try { await db.exec(M[i]); } catch (e) { echecs.push(`script ${i + 1} : ${e.message}`); await db.exec('rollback').catch(() => {}); }
}
ok(!echecs.length, `relancés dans le désordre (${ordre.map(i => i + 1).join(', ')}), des documents communs déjà rangés : aucune erreur${echecs.length ? ` (${echecs.join(' ; ')})` : ''}`);
const fin = await db.exec(M[7]).catch(e => { console.log('ÉCHEC : le huitième script relancé :', e.message); process.exitCode = 1; return [{ rows: [] }]; });
const etat = fin.at(-1).rows;
ok(etat.length === 2 && /^prêts/.test(etat[0]['état']) && /9 documents, dont 5 communs/.test(etat[1]['état']), `le script dit ce qui est en place : ${etat.map(r => r['état']).join(' | ')}`);

// une seule règle de lecture publique, pour tout le monde
const regles = (await db.query(`select policyname, roles from pg_policies where tablename = 'crescite_documents' and cmd = 'SELECT' and 'anon' = any (roles)`)).rows;
ok(regles.length === 1 && regles[0].policyname === 'public_lecture' && regles[0].roles.includes('authenticated'),
  `une seule règle de lecture pour le public : ${regles.map(r => `${r.policyname} (${r.roles.join(', ')})`).join(' ; ')}`);
ok((await db.query(`select count(*)::int n from pg_policies where tablename = 'crescite_documents' and policyname = 'crescite_documents_public'`)).rows[0].n === 0,
  'la seconde règle de la première version du script n’existe pas');
ok((await db.query(`select pg_get_constraintdef(oid) d from pg_constraint where conname = 'crescite_documents_pour_check'`)).rows[0].d.includes('pros_scolaires'),
  'la liste des valeurs est complète, après chaque script relancé');
let refus = null;
try { await db.exec(`insert into public.crescite_documents (spectacle_id, titre, url, pour) values (${ber}, 'x', 'https://x', 'partout')`); } catch (e) { refus = e.message; }
ok(refus && /crescite_documents_pour_check/.test(refus), 'une valeur inconnue reste refusée');

const as = async (role, sub, q, params) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub || ''}', false), set_config('request.jwt.claims', '', false);`);
  try { return await db.query(q, params); } finally { await db.exec('reset role'); }
};
const essai = async (...a) => { try { await as(...a); return 'ok'; } catch (e) { return e.message; } };
const titres = async (role, sub) => (await as(role, sub, `select titre from public.crescite_documents order by titre`)).rows.map(r => r.titre);

// le public lit les documents publics des spectacles publiés, communs compris ; rien d'un spectacle masqué
const publics = await titres('anon', '');
ok(publics.includes('Dossier commun · Bérénice') && publics.includes('Dossier commun (ancien nom) · Bérénice'), 'le public lit les documents communs (tous, pros_scolaires) d’un spectacle publié');
ok(publics.includes('Fiche technique · Bérénice') && publics.includes('Dossier pédagogique · Bérénice') && publics.includes('Présentation de la compagnie'),
  'et toujours ceux des programmateurs, des établissements, et ceux de toute la compagnie');
ok(!publics.some(t => t.endsWith('En chantier')), 'rien d’un spectacle qui n’est pas publié, documents communs compris');
ok(!publics.some(t => /^(Texte de travail|Captation intégrale)/.test(t)) && publics.length === 5, `ni ceux de l’équipe, ni ceux des salles (${publics.length} documents lus)`);
ok(JSON.stringify(await titres('authenticated', U.dehors)) === JSON.stringify(publics), 'un compte connecté hors de l’équipe lit les mêmes');
const deLauren = await titres('authenticated', U.lauren);
ok(deLauren.includes('Dossier commun · Bérénice') && !deLauren.includes('Captation intégrale · Bérénice'), 'une personne de l’équipe aussi, sans les documents des salles');
ok((await titres('authenticated', U.admin)).length === 13, 'l’administration lit tout');

// l'espace pro : une invitation ouvre les documents communs de ses spectacles, avec ceux des salles et des programmateurs
await db.exec(`insert into public.crescite_acces_pro (nom, jeton, spectacles) values ('Théâtre des Essais', repeat('a', 64), array[${ber}]::bigint[]),
  ('Festival Modèle', repeat('b', 64), null)`);
const ouvre = async j => (await db.query(`select d.titre, d.pour from public.crescite_pro_documents_de(public.crescite_pro_acces($1)) d order by d.titre`, [j])).rows;
const a = await ouvre('a'.repeat(64));
ok(a.some(d => d.pour === 'tous') && a.some(d => d.pour === 'pros_scolaires') && a.some(d => d.pour === 'salles') && a.some(d => d.pour === 'pros'),
  `crescite_pro_documents_de rend les documents communs, avec ceux des salles et des programmateurs (${a.map(d => d.pour).join(', ')})`);
ok(!a.some(d => ['scolaires', 'equipe'].includes(d.pour)) && a.every(d => d.titre.endsWith('Bérénice')), 'ni ceux des seuls établissements, ni ceux de l’équipe, ni ceux d’un autre spectacle');
const b = await ouvre('b'.repeat(64));
ok(b.some(d => d.pour === 'tous') && b.length === 8, `une invitation sans spectacle choisi ouvre les spectacles qui ont des documents de salles (${b.length} documents)`);
const page = (await db.query(`select public.crescite_pro_ouvrir($1) r`, ['a'.repeat(64)])).rows[0].r;
ok(page.spectacles.length === 1 && page.spectacles[0].documents.some(d => d.pour === 'tous'), 'la page de l’invitation montre le document commun');
const commun = (await db.query(`select id from public.crescite_documents where pour = 'tous' and spectacle_id = $1`, [ber])).rows[0].id;
const doc = (await db.query(`select public.crescite_pro_document($1, $2) r`, ['a'.repeat(64), commun])).rows[0].r;
ok(doc && doc.stockage === 'crescite' && doc.url === 'https://x', 'un document commun s’ouvre depuis le stockage public');
ok(await essai('anon', '', `select * from public.crescite_pro_documents_de((select a from public.crescite_acces_pro a limit 1))`) !== 'ok'
   && await essai('authenticated', U.lauren, `select public.crescite_pro_ouvrir($1)`, ['a'.repeat(64)]) !== 'ok', 'ces fonctions ne s’appellent pas par l’API (le public, l’équipe)');
