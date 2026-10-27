// Le dix-neuvième script (le code d'accès des salles), dans un Postgres local (PGlite) : les quatre premiers scripts,
// une invitation faite avant lui, puis lui, deux fois. Chaque invitation a son code de dix caractères, unique, sans lettre
// ambiguë ; il ouvre l'espace comme le jeton (tirets, espaces et minuscules admis) ; une invitation échue ou désactivée
// ne s'ouvre pas par son code ; au-delà de 60 codes essayés en vain en dix minutes, plus aucun code ne s'ouvre, le lien si ;
// le public ne lit ni les codes ni les essais.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const lire = f => readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8');
const [base, equipe, notif, pro] = ['20261020_crescite_base.sql', '20261021_crescite_equipe.sql', '20261022_crescite_notifications.sql',
  '20261023_crescite_pro.sql'].map(lire);
const CODE = lire('20261107_crescite_pro_code.sql');
const ok = (c, m) => { if (!c) { console.log('ÉCHEC :', m); process.exitCode = 1; } else console.log('ok :', m); };
const db = new PGlite();
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
const as = async (role, sub, q, params) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub || ''}', false), set_config('request.jwt.claims', '', false);`);
  try { return await db.query(q, params); } finally { await db.exec('reset role'); }
};
const essai = async (role, sub, q, params) => { try { await as(role, sub, q, params); return 'ok'; } catch (e) { return e.message; } };

// deux invitations d'avant le script
const avant = (await as('authenticated', U.admin, `insert into public.crescite_acces_pro (nom, spectacles) values ('Théâtre A', $1) returning id, jeton`, [[S.ber]])).rows[0];
await db.exec(CODE);
const r1 = await db.exec(CODE);
ok(r1[r1.length - 1].rows[0]['état'].startsWith('prêt'), `relancé, le bilan dit « prêt » (${r1[r1.length - 1].rows[0]['état']})`);
const codeDe = async idx => (await db.query(`select code from public.crescite_acces_pro where id = $1`, [idx])).rows[0].code;
const cA = await codeDe(avant.id);
ok(/^[A-HJKMNP-Z2-9]{10}$/.test(cA), `une invitation d'avant reçoit son code (${cA})`);
const nouv = (await as('authenticated', U.admin, `insert into public.crescite_acces_pro (nom) values ('Festival B') returning id, code`)).rows[0];
ok(/^[A-HJKMNP-Z2-9]{10}$/.test(nouv.code) && nouv.code !== cA, `une nouvelle invitation naît avec le sien (${nouv.code})`);
const lot = (await db.query(`select public.crescite_pro_code_neuf() c from generate_series(1, 2000)`)).rows.map(r => r.c);
ok(lot.every(c => /^[A-HJKMNP-Z2-9]{10}$/.test(c)) && new Set(lot).size === 2000, '2000 codes tirés : tous de la bonne forme, tous différents');
const lettres = new Set(lot.join(''));
ok(lettres.size === 31 && !/[ILO01]/.test([...lettres].join('')), `les 31 caractères de l'alphabet servent, jamais I, L, O, 0 ni 1`);

const ouvrir = async j => (await db.query(`select public.crescite_pro_ouvrir($1) r`, [j])).rows[0].r;
const lisible = c => `${c.slice(0, 5)}-${c.slice(5)}`;
ok((await ouvrir(cA))?.acces?.nom === 'Théâtre A', 'le code ouvre l’espace, comme le jeton');
ok((await ouvrir(` ${lisible(cA).toLowerCase()} `))?.acces?.nom === 'Théâtre A', 'tapé en minuscules, avec le tiret et des espaces aussi');
ok((await ouvrir(avant.jeton))?.acces?.nom === 'Théâtre A', 'le lien (le jeton) s’ouvre toujours');
const doc1 = (await db.query(`select id from public.crescite_documents where titre = 'Captation intégrale' and spectacle_id = $1`, [S.ber])).rows[0].id;
ok((await db.query(`select public.crescite_pro_document($1, $2) r`, [cA, doc1])).rows[0].r?.url === 'https://video.example/berenice', 'le code ouvre aussi un document');
await db.query(`update public.crescite_acces_pro set actif = false where id = $1`, [nouv.id]);
ok(await ouvrir(nouv.code) === null, 'une invitation désactivée ne s’ouvre pas par son code');
await db.query(`update public.crescite_acces_pro set actif = true, expire_le = current_date - 1 where id = $1`, [nouv.id]);
ok(await ouvrir(nouv.code) === null, 'ni une invitation échue');
ok(await ouvrir('ABC') === null && await ouvrir('') === null, 'un code incomplet n’ouvre rien');

ok((await essai('anon', '', `select code from public.crescite_acces_pro`)) !== 'ok', 'le public ne lit pas les codes');
ok((await essai('anon', '', `select * from public.crescite_pro_essais`)) !== 'ok' && (await essai('authenticated', U.lauren, `select * from public.crescite_pro_essais`)) !== 'ok', 'ni les essais, ni l’équipe');
ok((await essai('anon', '', `select public.crescite_pro_acces($1)`, [cA])) !== 'ok', 'le public n’appelle pas lui-même la fonction (seule crescite-pro le fait)');

await db.exec(`delete from public.crescite_pro_essais`);
for (let i = 0; i < 61; i++) await ouvrir(`ZZZZZ${String(i).padStart(5, '2').replace(/[01]/g, '9')}`);
ok(await ouvrir(cA) === null, 'après 60 codes essayés en vain en dix minutes, même le bon code attend');
ok((await ouvrir(avant.jeton))?.acces?.nom === 'Théâtre A', 'le lien, lui, s’ouvre toujours');
await db.exec(`update public.crescite_pro_essais set quand = now() - interval '11 minutes'`);
ok((await ouvrir(cA))?.acces?.nom === 'Théâtre A', 'dix minutes plus tard, le code s’ouvre de nouveau');
