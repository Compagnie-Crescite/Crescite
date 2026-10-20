// Les cinq migrations Crescite dans un Postgres local (PGlite), puis les disponibilités : chacun écrit les siennes ;
// toute l'équipe voit le planning de tous, sans les motifs ; l'adresse d'un agenda relié ne se relit pas ;
// l'administration propose des dates, chaque destinataire est prévenu et répond (dans l'application ou d'un clic).
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const lire = f => readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8');
const M = ['20261020_crescite_base.sql', '20261021_crescite_equipe.sql', '20261022_crescite_notifications.sql',
  '20261023_crescite_pro.sql', '20261024_crescite_disponibilites.sql'].map(lire);
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
for (const s of M) await db.exec(s);
await db.exec(M[4]); await db.exec(M[2]); await db.exec(M[0]); await db.exec(M[1]); await db.exec(M[3]); await db.exec(M[4]);
ok(true, 'les cinq migrations passent, relancées dans le désordre sans erreur');
ok((await db.query(`select count(*)::int n from pg_policies where policyname like 'dispo\\_%'`)).rows[0].n === 16, 'relancer les autres scripts ne retire pas les règles des disponibilités');

const U = { admin: '11111111-1111-1111-1111-111111111111', lauren: '22222222-2222-2222-2222-222222222222', adrien: '33333333-3333-3333-3333-333333333333', autre: '44444444-4444-4444-4444-444444444444' };
for (const k in U) await db.exec(`insert into auth.users values ('${U[k]}', '${k}@x')`);
await db.exec(`insert into public.crescite_admins (user_id) values ('${U.admin}')`);
await db.exec(`
  insert into public.crescite_spectacles (slug, titre, univers) values ('berenice', 'Bérénice', '{"couleurs": {"scene": "#cf3723"}}');
  insert into public.crescite_lieux (nom, commune, departement) values ('L’Eclat', 'Pont-Audemer', '27');
  insert into public.crescite_personnes (slug, prenom, nom) values ('lauren', 'Lauren', 'Toulin'), ('adrien', 'Adrien', 'Vada'), ('barbara', 'Barbara', 'Daussy');
`);
const id = async (t, slug) => (await db.query(`select id from public.${t} where slug = $1`, [slug])).rows[0].id;
const P = { lauren: await id('crescite_personnes', 'lauren'), adrien: await id('crescite_personnes', 'adrien'), barbara: await id('crescite_personnes', 'barbara') };
const sp = await id('crescite_spectacles', 'berenice');
const lieu = (await db.query(`select id from public.crescite_lieux limit 1`)).rows[0].id;
await db.exec(`
  insert into public.crescite_personnes_privees (personne_id, email, user_id) values
    (${P.lauren}, 'lauren@x', '${U.lauren}'), (${P.adrien}, 'adrien@x', '${U.adrien}'), (${P.barbara}, 'barbara@x', '${U.admin}');
  insert into public.crescite_distributions (spectacle_id, personne_id, categorie) values (${sp}, ${P.lauren}, 'jeu'), (${sp}, ${P.adrien}, 'jeu');
  insert into public.crescite_dates (spectacle_id, lieu_id, debut, statut) values
    (${sp}, ${lieu}, current_date + 40, 'confirmee'), (${sp}, ${lieu}, current_date + 50, 'option');
`);
const as = async (role, sub, q, params) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub || ''}', false), set_config('request.jwt.claims', '', false);`);
  try { return await db.query(q, params); } finally { await db.exec('reset role'); }
};
const essai = async (role, sub, q, params) => { try { await as(role, sub, q, params); return 'ok'; } catch (e) { return e.message; } };

// les agendas reliés : l'adresse s'écrit, ne se relit pas
ok((await essai('authenticated', U.lauren, `insert into public.crescite_agendas_lies (personne_id, nom, url) values ($1, 'Google', 'webcal://calendar.example.com/ical/secret/basic.ics')`, [P.lauren])) === 'ok', 'Lauren relie son agenda (webcal accepté)');
ok((await db.query(`select url from public.crescite_agendas_lies`)).rows[0].url.startsWith('https://calendar.example.com/'), 'webcal:// devient https://');
ok((await essai('authenticated', U.lauren, `select url from public.crescite_agendas_lies`)) !== 'ok', 'elle ne peut pas relire l’adresse secrète');
ok((await as('authenticated', U.lauren, `select nom from public.crescite_agendas_lies`)).rows.length === 1, 'elle voit son agenda relié (sans l’adresse)');
ok((await as('authenticated', U.adrien, `select id from public.crescite_agendas_lies`)).rows.length === 0, 'Adrien ne voit pas l’agenda de Lauren');
ok((await essai('authenticated', U.adrien, `insert into public.crescite_agendas_lies (personne_id, url) values ($1, 'https://x.example.com/a.ics')`, [P.lauren])) !== 'ok', 'ni ne relie un agenda à sa place');
ok((await essai('authenticated', U.lauren, `insert into public.crescite_agendas_lies (personne_id, url) values ($1, 'javascript:alert(1)')`, [P.lauren])).includes('invalide'), 'une adresse qui n’est pas https est refusée');

// les indisponibilités
await as('authenticated', U.lauren, `insert into public.crescite_indisponibilites (personne_id, debut, fin, journee, motif) values ($1, current_date + 40, current_date + 42, true, 'Tournage')`, [P.lauren]);
ok((await as('authenticated', U.adrien, `select count(*)::int n from public.crescite_indisponibilites`)).rows[0].n === 0, 'Adrien ne lit pas directement les indisponibilités de Lauren');
const planning = async (u) => (await as('authenticated', u, `select public.crescite_planning(current_date, current_date + 90) r`)).rows[0].r;
const pa = await planning(U.adrien);
const iL = pa.indisponibilites.find(i => Number(i.personne_id) === Number(P.lauren));
ok(iL && iL.motif === null && iL.journee === true, 'mais il voit dans le planning quand Lauren n’est pas libre, sans le motif');
ok((await planning(U.lauren)).indisponibilites[0].motif === 'Tournage', 'Lauren voit son motif');
ok((await planning(U.admin)).indisponibilites[0].motif === 'Tournage', 'l’administration aussi');
ok(pa.dates.length === 2 && pa.dates[0].equipe.map(Number).sort().join() === [P.lauren, P.adrien].map(Number).sort().join(), 'le planning donne les dates et qui part (Adrien est de la distribution : il voit aussi l’option)');
ok((await essai('anon', '', `select public.crescite_planning(current_date, current_date + 30)`)) !== 'ok', 'le public n’a pas le planning');
ok((await essai('authenticated', U.autre, `select public.crescite_planning(current_date, current_date + 30)`)).includes('équipe'), 'un compte sans fiche non plus');
ok((await essai('authenticated', U.lauren, `insert into public.crescite_indisponibilites (personne_id, debut, fin, source) values ($1, now(), now() + interval '1 hour', 'agenda')`, [P.lauren])) !== 'ok', 'à la main, on n’écrit que des indisponibilités « manuel »');
ok((await essai('authenticated', U.adrien, `update public.crescite_indisponibilites set motif = 'x' returning id`)) === 'ok'
   && (await as('authenticated', U.adrien, `update public.crescite_indisponibilites set motif = 'x' returning id`)).rows.length === 0, 'Adrien ne modifie pas celles de Lauren');

// proposer des dates
await db.exec(`delete from net.appels`);
const pid = (await as('authenticated', U.admin, `select public.crescite_proposer($1::jsonb) id`, [JSON.stringify({
  titre: 'Option : Théâtre de Flers', message: 'Êtes-vous libres ?', spectacle_id: sp,
  jours: [{ debut: new Date(Date.now() + 86400e3 * 60).toISOString().slice(0, 10) }, { debut: new Date(Date.now() + 86400e3 * 61).toISOString().slice(0, 10) }],
  personnes: [P.lauren, P.adrien] })])).rows[0].id;
ok(pid > 0, 'l’administration propose deux jours à Lauren et Adrien');
ok((await essai('authenticated', U.lauren, `select public.crescite_proposer('{"jours":[{"debut":"2027-01-01"}],"personnes":[1]}'::jsonb)`)).includes('Réservé'), 'Lauren ne propose pas de dates');
const notes = (await db.query(`select personne_id, type, titre, texte, lien from public.crescite_notifications where type = 'proposition' order by personne_id`)).rows;
ok(notes.length === 2 && notes.every(n => n.titre === 'Des dates vous sont proposées' && n.texte === 'Option : Théâtre de Flers' && n.lien === `#/proposition/${pid}`), 'chacun est prévenu dans l’application');
const appels = (await db.query(`select url, body from net.appels where url like '%crescite-courriel'`)).rows;
ok(appels.length === 2, 'et un courriel part pour chacun (fonction crescite-courriel)');
ok((await as('authenticated', U.lauren, `select id from public.crescite_propositions`)).rows.length === 1
   && (await as('authenticated', U.lauren, `select id from public.crescite_propositions_jours`)).rows.length === 2, 'Lauren lit la proposition et ses jours');
ok((await essai('authenticated', U.lauren, `select jeton from public.crescite_propositions_destinataires`)) !== 'ok', 'mais pas les clés des courriels');
const jours = (await db.query(`select id from public.crescite_propositions_jours where proposition_id = $1 order by debut`, [pid])).rows.map(r => r.id);
await as('authenticated', U.lauren, `select public.crescite_repondre($1, 'oui', 'Avec plaisir')`, [jours[0]]);
ok((await as('authenticated', U.lauren, `select reponse from public.crescite_propositions_reponses where jour_id = $1`, [jours[0]])).rows[0].reponse === 'oui', 'Lauren répond « oui » pour le premier jour');
ok((await db.query(`select count(*)::int n from public.crescite_notifications where personne_id = $1 and titre like 'Réponse%'`, [P.barbara])).rows[0].n === 1, 'l’administration est prévenue de la réponse');
ok((await planning(U.adrien)).propositions[0].jours[0].reponses.every(r => Number(r.personne_id) === Number(P.adrien)), 'Adrien ne voit que ses propres réponses');
ok((await planning(U.admin)).propositions[0].jours[0].reponses.length === 2, 'l’administration voit toutes les réponses');

// répondre d'un clic, depuis le courriel
const jeton = (await db.query(`select jeton from public.crescite_propositions_destinataires where personne_id = $1`, [P.adrien])).rows[0].jeton;
const vue = (await db.query(`select public.crescite_proposition_jeton($1) r`, [jeton])).rows[0].r;
ok(vue.personne.prenom === 'Adrien' && vue.jours.length === 2, 'la page du courriel montre la proposition et ses jours');
ok((await db.query(`select public.crescite_repondre_jeton($1, $2, 'non') r`, [jeton, jours[1]])).rows[0].r === true
   && (await db.query(`select reponse from public.crescite_propositions_reponses where jour_id = $1 and personne_id = $2`, [jours[1], P.adrien])).rows[0].reponse === 'non', 'Adrien répond « non » d’un clic');
ok((await db.query(`select public.crescite_repondre_jeton($1, $2, 'oui') r`, ['x'.repeat(64), jours[1]])).rows[0].r === false, 'une fausse clé ne répond pas');
ok((await essai('anon', '', `select public.crescite_repondre_jeton($1, $2, 'oui')`, [jeton, jours[1]])) !== 'ok', 'le public n’appelle pas ces fonctions lui-même');
const j0 = (await db.query(`select agenda_jeton from public.crescite_personnes_privees where personne_id = $1`, [P.lauren])).rows[0].agenda_jeton;
const j1 = (await as('authenticated', U.lauren, `select public.crescite_nouveau_jeton_agenda() j`)).rows[0].j;
ok(j0 && j0.length === 64 && j1 !== j0, 'chacun a une clé de flux d’agenda, qu’il peut changer');
