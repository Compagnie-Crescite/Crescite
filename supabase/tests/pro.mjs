// Les quatre migrations Crescite dans un Postgres local (PGlite), puis l'espace des salles : une invitation ouvre ses
// spectacles et leurs documents, pas plus ; une invitation échue ou désactivée n'ouvre rien ; seule l'administration
// voit les invitations ; ni le public ni l'équipe ne lisent les documents des salles.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const lire = f => readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8');
const [base, equipe, notif, pro] = ['20261020_crescite_base.sql', '20261021_crescite_equipe.sql', '20261022_crescite_notifications.sql',
  '20261023_crescite_pro.sql'].map(lire);
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
for (const s of [base, equipe, notif, pro]) await db.exec(s);
await db.exec(pro); await db.exec(notif); await db.exec(base); await db.exec(equipe); await db.exec(pro);
ok(true, 'les quatre migrations passent, relancées dans le désordre sans erreur');
const n = async q => (await db.query(q)).rows[0].n;
ok(await n(`select count(*)::int n from pg_policies where policyname like 'pro\\_%'`) === 3
   && await n(`select count(*)::int n from pg_policies where schemaname = 'storage' and policyname like 'crescite\\_pro\\_%'`) === 4,
   'relancer les autres scripts ne retire pas les règles de l’espace des salles');
ok(await n(`select count(*)::int n from storage.buckets where id = 'crescite-pro' and not public`) === 1, 'le stockage crescite-pro existe, privé');

const U = { admin: '11111111-1111-1111-1111-111111111111', lauren: '22222222-2222-2222-2222-222222222222' };
for (const k in U) await db.exec(`insert into auth.users values ('${U[k]}', '${k}@x')`);
await db.exec(`insert into public.crescite_admins (user_id) values ('${U.admin}')`);
await db.exec(`
  insert into public.crescite_spectacles (slug, titre, ordre) values ('berenice', 'Bérénice', 10), ('cleophene', 'Cléophène', 20), ('cyrano', 'Cyrano', 30);
  insert into public.crescite_personnes (slug, nom) values ('lauren', 'Toulin');
`);
const id = async (t, slug) => (await db.query(`select id from public.${t} where slug = $1`, [slug])).rows[0].id;
const S = { ber: await id('crescite_spectacles', 'berenice'), cle: await id('crescite_spectacles', 'cleophene'), cyr: await id('crescite_spectacles', 'cyrano') };
const lauren = await id('crescite_personnes', 'lauren');
await db.exec(`
  insert into public.crescite_personnes_privees (personne_id, email, user_id) values (${lauren}, 'lauren@x', '${U.lauren}');
  insert into public.crescite_distributions (spectacle_id, personne_id, categorie) values (${S.ber}, ${lauren}, 'jeu');
  insert into public.crescite_documents (spectacle_id, type, titre, fichier, url, pour, ordre) values
    (${S.ber}, 'autre', 'Captation intégrale', null, 'https://video.example/berenice', 'salles', 10),
    (${S.ber}, 'fiche_technique', 'Fiche technique détaillée', 'berenice/ft-detaillee.pdf', null, 'salles', 20),
    (${S.ber}, 'dossier', 'Dossier de diffusion 2026', 'documents/berenice/dossier.pdf', null, 'pros', 10),
    (${S.cle}, 'autre', 'Captation intégrale', null, 'https://video.example/cleophene', 'salles', 10),
    (${S.cyr}, 'dossier', 'Dossier de diffusion 2026', 'documents/cyrano/dossier.pdf', null, 'pros', 10),
    (${S.ber}, 'texte', 'Le texte', 'berenice/texte.pdf', null, 'equipe', 5);
`);
const doc = async titre => (await db.query(`select id from public.crescite_documents where titre = $1 order by id limit 1`, [titre])).rows[0].id;
const as = async (role, sub, q, params) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub || ''}', false), set_config('request.jwt.claims', '', false);`);
  try { return await db.query(q, params); } finally { await db.exec('reset role'); }
};
const essai = async (role, sub, q, params) => { try { await as(role, sub, q, params); return 'ok'; } catch (e) { return e.message; } };

// l'administration crée deux invitations : une pour Bérénice seulement, une pour tout ce qui a des documents de salles
const a1 = (await as('authenticated', U.admin, `insert into public.crescite_acces_pro (nom, contact, spectacles) values ('Théâtre A', 'Prénom Nom', $1) returning jeton`, [[S.ber]])).rows[0].jeton;
const a2 = (await as('authenticated', U.admin, `insert into public.crescite_acces_pro (nom) values ('Festival B') returning jeton`)).rows[0].jeton;
ok(a1.length === 64 && a2 !== a1, `chaque invitation a son jeton secret (${a1.length} caractères)`);
ok((await essai('authenticated', U.lauren, `insert into public.crescite_acces_pro (nom) values ('x')`)) !== 'ok', 'une personne de l’équipe ne crée pas d’invitation');
ok((await as('authenticated', U.lauren, `select count(*)::int n from public.crescite_acces_pro`)).rows[0].n === 0, 'ni ne les voit');
ok((await essai('anon', '', `select * from public.crescite_acces_pro`)) !== 'ok', 'le public ne lit pas les invitations');
ok((await essai('anon', '', `select public.crescite_pro_ouvrir($1)`, [a1])) !== 'ok', 'le public n’appelle pas lui-même les fonctions de l’espace (seule la fonction crescite-pro le fait)');

// ouvrir l'espace (comme le fait la fonction crescite-pro)
const ouvrir = async j => (await db.query(`select public.crescite_pro_ouvrir($1) r`, [j])).rows[0].r;
const r1 = await ouvrir(a1);
ok(r1 && r1.acces.nom === 'Théâtre A' && r1.spectacles.length === 1 && r1.spectacles[0].slug === 'berenice', 'l’invitation de Bérénice n’ouvre que Bérénice');
const docs1 = r1.spectacles[0].documents.map(d => d.titre);
ok(docs1.includes('Captation intégrale') && docs1.includes('Fiche technique détaillée') && docs1.includes('Dossier de diffusion 2026') && !docs1.includes('Le texte'),
   `ses documents : ceux des salles et des pros, pas ceux de l’équipe (${docs1.join(', ')})`);
ok(!JSON.stringify(r1).includes('ft-detaillee.pdf'), 'la liste ne donne aucun chemin de fichier');
const r2 = await ouvrir(a2);
ok(r2.spectacles.map(s => s.slug).join() === 'berenice,cleophene', 'une invitation sans spectacle choisi ouvre ceux qui ont des documents de salles (pas Cyrano)');
ok((await db.query(`select visites from public.crescite_acces_pro where jeton = $1`, [a1])).rows[0].visites === 1, 'la visite est comptée');

// ouvrir un document
const d = async (j, titre) => (await db.query(`select public.crescite_pro_document($1, $2) r`, [j, await doc(titre)])).rows[0].r;
const ft = await d(a1, 'Fiche technique détaillée');
ok(ft && ft.fichier === 'berenice/ft-detaillee.pdf' && ft.stockage === 'crescite-pro', 'un fichier des salles : son chemin dans le stockage privé, pour un lien signé');
const dd = await d(a1, 'Dossier de diffusion 2026');
ok(dd && dd.stockage === 'crescite', 'un document des pros : le stockage public');
ok(await d(a1, 'Le texte') === null, 'un document de l’équipe ne s’ouvre pas');
const cle = await db.query(`select public.crescite_pro_document($1, (select id from public.crescite_documents where spectacle_id = $2 and pour = 'salles')) r`, [a1, S.cle]);
ok(cle.rows[0].r === null, 'un document d’un autre spectacle ne s’ouvre pas');
ok((await db.query(`select count(*)::int n from public.crescite_acces_pro_journal where quoi = 'ouverture'`)).rows[0].n === 2, 'chaque ouverture est notée au journal');
ok((await as('authenticated', U.admin, `select count(*)::int n from public.crescite_acces_pro_journal`)).rows[0].n === 4, 'l’administration lit le journal');

// une invitation échue, désactivée, ou un faux jeton : rien
await db.exec(`update public.crescite_acces_pro set expire_le = current_date - 1 where jeton = '${a1}'`);
ok(await ouvrir(a1) === null && await d(a1, 'Captation intégrale') === null, 'une invitation échue n’ouvre plus rien');
await db.exec(`update public.crescite_acces_pro set expire_le = current_date + 30, actif = false where jeton = '${a1}'`);
ok(await ouvrir(a1) === null, 'une invitation désactivée non plus');
ok(await ouvrir('x') === null && await ouvrir(a2.slice(0, 20)) === null, 'un faux jeton, ou un bout de jeton, non plus');

// ni le public ni l'équipe ne lisent les documents des salles
ok((await as('anon', '', `select count(*)::int n from public.crescite_documents where pour = 'salles'`)).rows[0].n === 0, 'le public ne lit pas les documents des salles');
ok((await as('authenticated', U.lauren, `select count(*)::int n from public.crescite_documents where pour = 'salles'`)).rows[0].n === 0, 'l’équipe non plus');
ok((await as('authenticated', U.lauren, `select count(*)::int n from public.crescite_documents where pour = 'equipe'`)).rows[0].n === 1, 'l’équipe lit toujours les siens');
