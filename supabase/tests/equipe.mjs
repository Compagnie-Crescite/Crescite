// Exécute les deux migrations Crescite dans un Postgres local (PGlite) avec des substituts de Supabase, puis vérifie
// les règles d'accès de l'équipe : ce que lisent et écrivent l'administration, une personne de l'équipe, un compte
// sans fiche, et le public ; le rattachement du compte ; la tournée ; le stockage privé ; les versions des feuilles.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const base = readFileSync(new URL('../migrations/20261020_crescite_base.sql', import.meta.url), 'utf8');
const equipe = readFileSync(new URL('../migrations/20261021_crescite_equipe.sql', import.meta.url), 'utf8');
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
  grant usage on schema storage to anon, authenticated, service_role; grant select on storage.objects to authenticated;
  grant usage on schema public to anon, authenticated, service_role;
`);
try { await db.exec('create publication supabase_realtime'); } catch (e) { /* pas de publication ici */ }
await db.exec(base); await db.exec(equipe);
await db.exec(equipe);
ok(true, 'les deux migrations passent, la seconde relancée sans erreur');
const regles = async () => (await db.query(`select count(*)::int n from pg_policies where policyname like 'equipe\\_%'`)).rows[0].n;
const avant = await regles();
await db.exec(base);
ok(await regles() === avant && avant > 0, `relancer la première ne retire pas les règles de l'équipe (${avant})`);

const U = { admin: '11111111-1111-1111-1111-111111111111', lauren: '22222222-2222-2222-2222-222222222222',
            adrien: '33333333-3333-3333-3333-333333333333', rempl: '44444444-4444-4444-4444-444444444444', autre: '55555555-5555-5555-5555-555555555555' };
const mails = { admin: 'admin@x', lauren: 'Lauren@X', adrien: 'adrien@x', rempl: 'rempl@x', autre: 'autre@x' };
for (const k in U) await db.exec(`insert into auth.users values ('${U[k]}', '${mails[k].toLowerCase()}')`);
await db.exec(`insert into public.crescite_admins (user_id, nom) values ('${U.admin}', 'Admin')`);
// données de départ (en service)
await db.exec(`
  insert into public.crescite_spectacles (slug, titre, ordre) values ('berenice', 'Bérénice', 5), ('cassandres', 'Cassandres', 1);
  update public.crescite_spectacles set publie = false where slug = 'cassandres';
  insert into public.crescite_lieux (nom, commune, departement) values ('L’Eclat', 'Pont-Audemer', '27');
  insert into public.crescite_personnes (slug, prenom, nom, metiers) values ('lauren-toulin', 'Lauren', 'Toulin', '{comédienne}'),
    ('adrien-vada', 'Adrien', 'Vada', '{comédien}'), ('remplacant', 'Rem', 'Plaçant', '{comédien}'), ('cache', 'Ca', 'Ché', '{}');
  update public.crescite_personnes set publie = false where slug = 'cache';
`);
const id = async (t, slug) => (await db.query(`select id from public.${t} where slug = $1`, [slug])).rows[0].id;
const P = { lauren: await id('crescite_personnes', 'lauren-toulin'), adrien: await id('crescite_personnes', 'adrien-vada'), rempl: await id('crescite_personnes', 'remplacant') };
const S = { ber: await id('crescite_spectacles', 'berenice'), cas: await id('crescite_spectacles', 'cassandres') };
const lieu = (await db.query(`select id from public.crescite_lieux limit 1`)).rows[0].id;
await db.exec(`
  insert into public.crescite_personnes_privees (personne_id, email, telephone) values (${P.lauren}, 'lauren@x', '01'), (${P.adrien}, 'adrien@x', '02'), (${P.rempl}, 'rempl@x', '03');
  insert into public.crescite_distributions (spectacle_id, personne_id, categorie) values (${S.ber}, ${P.lauren}, 'jeu'), (${S.ber}, ${P.adrien}, 'jeu'), (${S.cas}, ${P.lauren}, 'jeu');
`);
const as = async (role, sub, email, q, params) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub || ''}', false), set_config('request.jwt.claims', '${email ? JSON.stringify({ email }) : ''}', false);`);
  try { return await db.query(q, params); } finally { await db.exec('reset role'); }
};
const essai = async (role, sub, email, q, params) => { try { await as(role, sub, email, q, params); return 'ok'; } catch (e) { return e.message; } };
// des dates : une confirmée, une en option, une d'un spectacle pas encore publié
const nouvelle = async (o) => (await as('authenticated', U.admin, mails.admin, `select public.crescite_enregistrer_date($1::jsonb) as id`, [JSON.stringify(o)])).rows[0].id;
const d1 = await nouvelle({ spectacle_id: S.ber, lieu_id: lieu, debut: '2026-12-18', statut: 'confirmee', representations: [{ jour: '2026-12-18', heure: '14:00', public: 'scolaire' }, { jour: '2026-12-18', heure: '20:00' }] });
const d2 = await nouvelle({ spectacle_id: S.ber, debut: '2027-03-01', statut: 'option', representations: [] });
const d3 = await nouvelle({ spectacle_id: S.cas, debut: '2027-05-10', representations: [{ jour: '2027-05-10', heure: '20:30' }] });
// d1 : Adrien est remplacé par le remplaçant
const r = await essai('authenticated', U.admin, mails.admin, `insert into public.crescite_equipes (date_id, personne_id, present, fonction) values
  ($1, $2, false, null), ($1, $3, true, 'remplace Adrien Vada')`, [d1, P.adrien, P.rempl]);
ok(r === 'ok', 'l’administration compose l’équipe d’une date (un remplacement)');
await as('authenticated', U.admin, mails.admin, `insert into public.crescite_documents (spectacle_id, type, titre, fichier) values
  ($1, 'dossier', 'Dossier', 'berenice/dossier.pdf'), ($1, 'autre', 'Contrats', 'berenice/contrats.pdf')`, [S.ber]);
await as('authenticated', U.admin, mails.admin, `update public.crescite_documents set pour = 'administration' where titre = 'Contrats'`);
await as('authenticated', U.admin, mails.admin, `insert into public.crescite_documents (type, titre, url) values ('autre', 'Charte', 'https://exemple.fr')`);
await db.exec(`insert into storage.objects (bucket_id, name) values ('crescite-equipe', 'berenice/dossier.pdf'), ('crescite-equipe', 'berenice/contrats.pdf'), ('crescite-equipe', 'ailleurs/x.pdf')`);
await as('authenticated', U.admin, mails.admin, `insert into public.crescite_feuilles (date_id, contenu, statut) values ($1, '{"notes":"rdv 9h"}', 'publiee'), ($2, '{}', 'brouillon')`, [d1, d2]);

// le rattachement : à la première connexion, la fiche dont l'adresse est celle du compte
ok((await as('authenticated', U.lauren, mails.lauren, `select public.crescite_moi() m`)).rows[0].m === null, 'avant rattachement, le compte n’a pas de fiche');
const rat = (await as('authenticated', U.lauren, mails.lauren, `select public.crescite_rattacher() p`)).rows[0].p;
ok(Number(rat) === Number(P.lauren), 'crescite_rattacher() relie le compte à la fiche de même adresse (casse ignorée)');
ok(Number((await as('authenticated', U.lauren, mails.lauren, `select public.crescite_rattacher() p`)).rows[0].p) === Number(P.lauren), 'et le refait sans dommage');
ok((await as('authenticated', U.autre, mails.autre, `select public.crescite_rattacher() p`)).rows[0].p === null, 'un compte sans fiche n’est rattaché à rien');
await as('authenticated', U.adrien, mails.adrien, `select public.crescite_rattacher()`);
await as('authenticated', U.rempl, mails.rempl, `select public.crescite_rattacher()`);

// Lauren
const L = (q, p) => as('authenticated', U.lauren, mails.lauren, q, p);
ok((await L(`select count(*)::int n from public.crescite_personnes_privees`)).rows[0].n === 1, 'Lauren ne lit que sa propre fiche privée');
ok((await L(`update public.crescite_personnes_privees set telephone = '06' where personne_id = $1 returning 1`, [P.lauren])).rows.length === 1, 'elle change son téléphone');
ok((await essai('authenticated', U.lauren, mails.lauren, `update public.crescite_personnes_privees set email = 'pirate@x' where personne_id = $1`, [P.lauren])).includes('administration'), 'mais pas l’adresse de son compte');
ok((await L(`update public.crescite_personnes_privees set telephone = '99' where personne_id = $1 returning 1`, [P.adrien])).rows.length === 0, 'ni la fiche d’un autre');
const tL = (await L(`select public.crescite_ma_tournee() t`)).rows[0].t;
ok(tL.length === 3 && tL.map(x => x.id).join() === [d1, d2, d3].join(), `sa tournée : ses trois dates, option et spectacle non publié compris (${tL.length})`);
ok(tL[0].representations.length === 2 && tL[0].feuille && tL[0].feuille.version === 1 && !tL[1].feuille, 'avec les représentations, et la feuille de route seulement si elle est publiée');
ok((await L(`select public.crescite_ma_tournee('2026-2027') t`)).rows[0].t.length === 3 && (await L(`select public.crescite_ma_tournee('2025-2026') t`)).rows[0].t.length === 0, 'filtrée par saison');
ok((await L(`select count(*)::int n from public.crescite_feuilles`)).rows[0].n === 1, 'elle lit la feuille publiée de sa date, pas le brouillon');
ok((await L(`select titre from public.crescite_documents order by titre`)).rows.map(x => x.titre).join() === 'Charte,Dossier', 'les documents de son spectacle et de la compagnie, pas ceux de l’administration');
ok((await L(`select name from storage.objects order by name`)).rows.map(x => x.name).join() === 'berenice/dossier.pdf', 'dans le stockage privé : le seul fichier de son document');
ok((await L(`select count(*)::int n from public.crescite_equipes`)).rows[0].n === 2, 'elle voit qui part sur ses dates');
ok((await L(`select count(*)::int n from public.crescite_spectacles where slug = 'cassandres'`)).rows[0].n === 1, 'et le spectacle en création où elle joue');
ok((await essai('authenticated', U.lauren, mails.lauren, `insert into public.crescite_personnes (slug, nom) values ('x', 'X')`)) !== 'ok', 'elle ne crée pas de fiche');
ok((await essai('authenticated', U.lauren, mails.lauren, `update public.crescite_feuilles set statut = 'brouillon'`)) === 'ok'
   && (await db.query(`select statut from public.crescite_feuilles where date_id = $1`, [d1])).rows[0].statut === 'publiee', 'elle ne modifie pas une feuille de route');
// Adrien, remplacé sur d1
const tA = (await as('authenticated', U.adrien, mails.adrien, `select public.crescite_ma_tournee() t`)).rows[0].t;
ok(tA.map(x => x.id).join() === String(d2), 'Adrien, remplacé sur une date, ne la voit plus dans sa tournée (reste l’option)');
const tR = (await as('authenticated', U.rempl, mails.rempl, `select public.crescite_ma_tournee() t`)).rows[0].t;
ok(tR.map(x => x.id).join() === String(d1), 'son remplaçant la voit, avec la feuille de route');
// un compte sans fiche
const X = (q, p) => as('authenticated', U.autre, mails.autre, q, p);
ok((await X(`select count(*)::int n from public.crescite_personnes_privees`)).rows[0].n === 0 && (await X(`select count(*)::int n from public.crescite_equipes`)).rows[0].n === 0
   && (await X(`select count(*)::int n from public.crescite_documents`)).rows[0].n === 0 && (await X(`select count(*)::int n from public.crescite_feuilles`)).rows[0].n === 0
   && (await X(`select count(*)::int n from storage.objects`)).rows[0].n === 0, 'un compte sans fiche ne lit rien de l’équipe');
ok((await X(`select count(*)::int n from public.crescite_dates`)).rows[0].n === 1, 'et des dates, seulement ce que lit le public');
// le public
const A = (q, p) => as('anon', '', '', q, p);
ok((await A(`select count(*)::int n from public.crescite_personnes`)).rows[0].n === 3, 'le public lit les fiches publiées');
ok((await A(`select count(*)::int n from public.crescite_distributions`)).rows[0].n === 2, 'et la distribution des spectacles publiés seulement');
for (const t of ['crescite_personnes_privees', 'crescite_feuilles', 'crescite_equipes', 'crescite_documents', 'crescite_personnes_suivi'])
  ok((await essai('anon', '', '', `select * from public.${t}`)) !== 'ok', `le public ne lit pas ${t}`);
ok((await essai('anon', '', '', `select public.crescite_ma_tournee()`)) !== 'ok', 'ni la tournée');
// les versions d'une feuille
const v = async () => (await db.query(`select version, publiee_le from public.crescite_feuilles where date_id = $1`, [d1])).rows[0];
const v1 = await v();
await as('authenticated', U.admin, mails.admin, `update public.crescite_feuilles set contenu = '{"notes":"rdv 8h"}' where date_id = $1`, [d1]);
const v2 = await v();
ok(v1.version === 1 && v2.version === 2 && v2.publiee_le > v1.publiee_le, 'une feuille publiée modifiée passe en version 2, datée');
await as('authenticated', U.admin, mails.admin, `update public.crescite_feuilles set statut = 'publiee' where date_id = $1`, [d2]);
ok((await db.query(`select version from public.crescite_feuilles where date_id = $1`, [d2])).rows[0].version === 1, 'un brouillon publié pour la première fois reste en version 1');
// le journal
ok((await db.query(`select count(*)::int n from public.crescite_journal where table_nom = 'crescite_personnes_privees'`)).rows[0].n === 0
   && (await db.query(`select count(*)::int n from public.crescite_journal where table_nom = 'crescite_feuilles'`)).rows[0].n >= 3, 'le journal suit les feuilles, pas les coordonnées personnelles');
// la vérification finale du script
const verif = await db.query(equipe.slice(equipe.indexOf('with souci as')));
ok(verif.rows.length >= 1, `la vérification finale répond : ${verif.rows.map(x => Object.values(x).join(' — ')).join(' | ')}`);
