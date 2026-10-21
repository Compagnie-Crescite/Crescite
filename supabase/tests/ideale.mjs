// Les migrations Crescite dans un Postgres local (PGlite), puis le script « Compagnie Idéale » (alertes de tournée,
// devis, notes de frais, matériel, diffusion) : qui dépose, lit, change quoi. Le public ne fait que déposer une alerte
// ou une demande de devis ; une personne de l'équipe dépose ses notes de frais sans jamais les valider elle-même, et ses
// justificatifs dans son dossier seulement ; un compte du projet qui n'est pas de l'équipe n'a rien.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const lire = f => readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8');
const M = ['20261020_crescite_base.sql', '20261021_crescite_equipe.sql', '20261022_crescite_notifications.sql',
  '20261023_crescite_pro.sql', '20261024_crescite_disponibilites.sql', '20261025_crescite_preferences.sql',
  '20261026_crescite_ideale.sql'].map(lire);
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
  -- comme Supabase : le dossier d'un fichier (« 12/reçu.jpg » → {12})
  create function storage.foldername(name text) returns text[] language plpgsql immutable as $$
    declare p text[] := string_to_array(name, '/'); begin return p[1:array_length(p, 1) - 1]; end $$;
  grant usage on schema storage to anon, authenticated, service_role;
  grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
  grant execute on function storage.foldername(text) to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  -- comme Supabase : une table neuve donne tout à anon et authenticated (les règles et les droits du script filtrent)
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  create schema net; create table net.appels (url text, body jsonb, headers jsonb);
  create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
    returns bigint language sql as $$ insert into net.appels values (url, body, headers); select 1::bigint $$;
`);
let publication = true;
try { await db.exec('create publication supabase_realtime'); } catch (e) { publication = false; }
for (const s of M) await db.exec(s);
await db.exec(M[6]); await db.exec(M[0]); await db.exec(M[1]); await db.exec(M[6]);
ok(true, 'les sept migrations passent ; le script Idéale se relance sans erreur, avant et après les autres');
ok((await db.query(`select count(*)::int n from pg_policies where policyname like 'ide\\_%'`)).rows[0].n === 16
   && (await db.query(`select count(*)::int n from pg_policies where tablename = 'objects' and policyname like 'crescite\\_frais\\_%'`)).rows[0].n === 3,
  'relancé, il garde ses règles : 16 sur les tables, 3 sur les justificatifs');
if (publication) {
  const rt = (await db.query(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' and tablename in
    ('crescite_diffusion_prospects', 'crescite_notes_frais', 'crescite_materiel', 'crescite_devis_demandes')`)).rows;
  ok(rt.length === 4, 'les quatre tables que l’administration écoute sont dans le temps réel');
}
ok((await db.query(`select count(*)::int n from information_schema.columns where table_name = 'crescite_dates_suivi'
   and column_name in ('etape_crm', 'montant_cession', 'date_dernier_contact', 'date_prochaine_relance', 'notes_diffusion')`)).rows[0].n === 5,
  'le suivi des dates a ses colonnes de diffusion');

const U = { admin: '11111111-1111-1111-1111-111111111111', lauren: '22222222-2222-2222-2222-222222222222',
            adrien: '33333333-3333-3333-3333-333333333333', dehors: '44444444-4444-4444-4444-444444444444' };
for (const k in U) await db.exec(`insert into auth.users values ('${U[k]}', '${k}@x')`);
await db.exec(`insert into public.crescite_admins (user_id) values ('${U.admin}')`);
await db.exec(`
  insert into public.crescite_spectacles (slug, titre, ordre) values ('berenice', 'Bérénice', 5);
  insert into public.crescite_personnes (slug, prenom, nom) values ('lauren', 'Lauren', 'L'), ('adrien', 'Adrien', 'A');
`);
const id = async (t, slug) => (await db.query(`select id from public.${t} where slug = $1`, [slug])).rows[0].id;
const P = { lauren: await id('crescite_personnes', 'lauren'), adrien: await id('crescite_personnes', 'adrien') };
const ber = await id('crescite_spectacles', 'berenice');
await db.exec(`insert into public.crescite_personnes_privees (personne_id, email, user_id) values
  (${P.lauren}, 'lauren@x', '${U.lauren}'), (${P.adrien}, 'adrien@x', '${U.adrien}')`);

const as = async (role, sub, q, params, entetes = '{}') => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub || ''}', false),
    set_config('request.jwt.claims', '', false), set_config('request.headers', '${entetes}', false);`);
  try { return await db.query(q, params); } finally { await db.exec('reset role'); }
};
const essai = async (...a) => { try { await as(...a); return 'ok'; } catch (e) { return e.message; } };
const n = async (role, sub, table, entetes) => (await as(role, sub, `select count(*)::int n from public.${table}`, [], entetes)).rows[0].n;

// 1. les alertes de tournée : le public s'inscrit, sans se dire déjà prévenu ; il ne relit que la sienne, par son jeton
const ALERTE = `insert into public.crescite_alertes_tournee (email, code_postal, commune, lat, lon) values ('public@x', '27500', '27500', 49.35, 0.51)`;
ok(await essai('anon', '', ALERTE) === 'ok', 'le public s’inscrit à une alerte de tournée');
ok(await essai('anon', '', `insert into public.crescite_alertes_tournee (email, derniere_notification_le) values ('p@x', now())`) !== 'ok'
   && await essai('anon', '', `insert into public.crescite_alertes_tournee (email, rayon_km) values ('p@x', 5000)`) !== 'ok'
   && await essai('anon', '', `insert into public.crescite_alertes_tournee (email) values ($1)`, ['x'.repeat(300)]) !== 'ok',
  'mais pas déjà « prévenue », ni à 5 000 km, ni avec une adresse de 300 caractères');
const jeton = (await db.query(`select token_desinscription t from public.crescite_alertes_tournee limit 1`)).rows[0].t;
ok(/^[0-9a-f]{32}$/.test(jeton), 'chaque alerte a son jeton (32 caractères au hasard)');
ok(await n('anon', '', 'crescite_alertes_tournee') === 0 && await n('anon', '', 'crescite_alertes_tournee', JSON.stringify({ 'x-token': jeton })) === 1,
  'le public ne lit aucune alerte, sauf la sienne avec son jeton');
ok(await essai('anon', '', `update public.crescite_alertes_tournee set active = false`) !== 'ok'
   && await essai('anon', '', `delete from public.crescite_alertes_tournee`) !== 'ok', 'il ne change ni n’efface rien');
ok(await n('authenticated', U.lauren, 'crescite_alertes_tournee') === 0 && await n('authenticated', U.admin, 'crescite_alertes_tournee') === 1,
  'l’équipe ne lit pas les alertes ; l’administration, si');

// 2. les demandes de devis : le public dépose, jamais le suivi
const DEVIS = c => `insert into public.crescite_devis_demandes (type_lieu, structure_nom, commune, contact_nom, contact_email${c ? ', ' + c[0] : ''})
  values ('theatre', 'Le Théâtre', 'Rouen', 'Prénom Nom', 'prog@x'${c ? ', ' + c[1] : ''})`;
ok(await essai('anon', '', DEVIS()) === 'ok', 'un programmateur dépose une demande de devis');
ok(await essai('anon', '', DEVIS(['statut', `'confirme'`])) !== 'ok' && await essai('anon', '', DEVIS(['notes_internes', `'x'`])) !== 'ok'
   && await essai('anon', '', DEVIS(['message', `repeat('x', 6000)`])) !== 'ok', 'sans poser son statut ni de notes internes, ni un message de 6 000 caractères');
ok(await essai('anon', '', `select * from public.crescite_devis_demandes`) !== 'ok', 'le public ne lit aucune demande');
ok(await n('authenticated', U.lauren, 'crescite_devis_demandes') === 0 && await n('authenticated', U.admin, 'crescite_devis_demandes') === 1
   && await essai('authenticated', U.admin, `update public.crescite_devis_demandes set statut = 'en_cours', notes_internes = 'rappeler'`) === 'ok',
  'l’équipe ne les lit pas ; l’administration les lit et les suit');

// 3. les notes de frais : chacun les siennes, jamais validées par soi-même
const FRAIS = (p, extra = ['', '']) => `insert into public.crescite_notes_frais (personne_id, categorie, montant_ttc${extra[0]}) values (${p}, 'repas', 12.5${extra[1]})`;
ok(await essai('authenticated', U.lauren, FRAIS(P.lauren)) === 'ok', 'Lauren dépose une note de frais');
ok(await essai('authenticated', U.lauren, FRAIS(P.lauren, [', statut', `, 'valide'`])) !== 'ok'
   && await essai('authenticated', U.lauren, FRAIS(P.lauren, [', statut', `, 'rembourse'`])) !== 'ok'
   && await essai('authenticated', U.lauren, FRAIS(P.lauren, [', valide_le', ', now()'])) !== 'ok',
  'pas déjà validée ni remboursée, ni datée de validation');
ok(await essai('authenticated', U.lauren, FRAIS(P.adrien)) !== 'ok', 'ni au nom d’Adrien');
const note = (await db.query(`select id from public.crescite_notes_frais`)).rows[0].id;
ok(await essai('authenticated', U.lauren, `update public.crescite_notes_frais set statut = 'valide' where id = ${note}`) !== 'ok'
   && await essai('authenticated', U.lauren, `update public.crescite_notes_frais set rembourse_le = now() where id = ${note}`) !== 'ok',
  'elle ne la valide pas, ni ne la dit remboursée');
ok(await essai('authenticated', U.lauren, `update public.crescite_notes_frais set commentaire = 'péage' where id = ${note}`) === 'ok', 'elle la retouche tant qu’elle attend');
ok(await n('authenticated', U.adrien, 'crescite_notes_frais') === 0 && await n('authenticated', U.dehors, 'crescite_notes_frais') === 0
   && await essai('anon', '', `select * from public.crescite_notes_frais`) !== 'ok', 'Adrien, un compte hors de l’équipe et le public ne la voient pas');
ok(await essai('authenticated', U.admin, `update public.crescite_notes_frais set statut = 'valide', valide_le = now(), valide_par = '${U.admin}' where id = ${note}`) === 'ok',
  'l’administration la valide');
ok((await as('authenticated', U.lauren, `update public.crescite_notes_frais set statut = 'en_attente', montant_ttc = 99 where id = ${note} returning id`)).rows.length === 0
   && (await db.query(`select statut, montant_ttc::float m from public.crescite_notes_frais where id = ${note}`)).rows[0].m === 12.5,
  'validée, Lauren ne la change plus (ni son montant, ni pour la remettre en attente)');

// 4. le matériel : l'équipe le lit, l'administration le tient
ok(await essai('authenticated', U.admin, `insert into public.crescite_materiel (spectacle_id, malle, categorie, intitule) values (${ber}, 'Malle A', 'lumiere', 'Découpes')`) === 'ok',
  'l’administration ajoute du matériel');
ok(await n('authenticated', U.lauren, 'crescite_materiel') === 1, 'l’équipe le lit');
ok(await n('authenticated', U.dehors, 'crescite_materiel') === 0 && await essai('anon', '', `select * from public.crescite_materiel`) !== 'ok',
  'un compte hors de l’équipe et le public, non');
ok(await essai('authenticated', U.lauren, `insert into public.crescite_materiel (malle, categorie, intitule) values ('x', 'son', 'y')`) !== 'ok', 'l’équipe ne l’écrit pas');

// 5. la diffusion : l'administration seule
ok(await essai('authenticated', U.admin, `insert into public.crescite_diffusion_prospects (structure, commune) values ('Un lieu', 'Caen')`) === 'ok'
   && await n('authenticated', U.lauren, 'crescite_diffusion_prospects') === 0
   && await essai('authenticated', U.lauren, `insert into public.crescite_diffusion_prospects (structure, commune) values ('x', 'y')`) !== 'ok'
   && await essai('anon', '', `select * from public.crescite_diffusion_prospects`) !== 'ok', 'les pistes de diffusion : l’administration seule');

// 6. les justificatifs : chacun dans son dossier (son numéro de fiche), l'administration partout
const DEPOT = (dossier, nom = 'recu.jpg') => `insert into storage.objects (bucket_id, name) values ('crescite-frais', '${dossier}/${nom}')`;
// ce que fait la page de l'équipe : upload(…, { upsert: true }) → un « insert … on conflict do update » sur un nom neuf
const DEPOT_UPSERT = dossier => `insert into storage.objects (bucket_id, name) values ('crescite-frais', '${dossier}/neuf.jpg')
  on conflict (bucket_id, name) do update set name = excluded.name`;
ok(await essai('authenticated', U.lauren, DEPOT(P.lauren)) === 'ok' && await essai('authenticated', U.lauren, DEPOT_UPSERT(P.lauren)) === 'ok',
  'Lauren dépose un justificatif dans son dossier (aussi comme le fait la page, par un upsert)');
ok(await essai('authenticated', U.lauren, DEPOT(P.adrien)) !== 'ok' && await essai('authenticated', U.lauren, DEPOT('autre')) !== 'ok'
   && await essai('authenticated', U.lauren, `insert into storage.objects (bucket_id, name) values ('crescite-frais', 'a-la-racine.jpg')`) !== 'ok',
  'ni dans celui d’Adrien, ni ailleurs');
ok(await essai('authenticated', U.dehors, DEPOT('0')) !== 'ok' && await essai('authenticated', U.dehors, DEPOT('null')) !== 'ok'
   && await essai('anon', '', DEPOT(P.lauren, 'x.jpg')) !== 'ok', 'un compte hors de l’équipe et le public ne déposent rien');
const vus = async sub => (await as('authenticated', sub, `select count(*)::int n from storage.objects where bucket_id = 'crescite-frais'`)).rows[0].n;
ok(await vus(U.lauren) === 2 && await vus(U.adrien) === 0 && await vus(U.dehors) === 0 && await vus(U.admin) === 2,
  'elle relit les siens ; Adrien et un compte extérieur, rien ; l’administration, tout');
// l'ancienne règle de lecture suivait l'adresse écrite dans la note : une note qui finit comme le fichier d'un autre l'ouvrait
await as('authenticated', U.adrien, FRAIS(P.adrien, [', photo_url', `, 'x/${P.lauren}/recu.jpg'`]));
ok(await vus(U.adrien) === 0, 'une note de frais qui pointe vers le fichier de Lauren n’ouvre rien à Adrien');
ok(await essai('authenticated', U.lauren, `delete from storage.objects where bucket_id = 'crescite-frais'`) === 'ok' && await vus(U.admin) === 2,
  'elle n’efface pas ses justificatifs (l’administration, si)');
