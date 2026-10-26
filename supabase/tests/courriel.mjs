// La fonction crescite-courriel (écrite pour Deno) dans Node, sur les cinq migrations en local (PGlite) : le courriel
// d'une proposition mène à la page de réponse du site (Supabase ne sert pas de page web depuis une fonction) ; la page
// lit la proposition par la clé de la personne, sans son adresse, et enregistre ses réponses ; rien ne s'enregistre sur
// une proposition close ; un ancien lien vers la fonction renvoie vers le site ; sans clé d'envoi, rien ne part.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
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

const U = { admin: '11111111-1111-1111-1111-111111111111', lauren: '22222222-2222-2222-2222-222222222222', adrien: '33333333-3333-3333-3333-333333333333' };
for (const k in U) await db.exec(`insert into auth.users values ('${U[k]}', '${k}@x')`);
await db.exec(`insert into public.crescite_admins (user_id) values ('${U.admin}')`);
await db.exec(`
  insert into public.crescite_spectacles (slug, titre, univers) values ('berenice', 'Bérénice', '{}');
  insert into public.crescite_personnes (slug, prenom, nom) values ('lauren', 'Lauren', 'Toulin'), ('adrien', 'Adrien', 'Vada'), ('barbara', 'Barbara', 'Daussy');
`);
const id = async (t, slug) => (await db.query(`select id from public.${t} where slug = $1`, [slug])).rows[0].id;
const P = { lauren: await id('crescite_personnes', 'lauren'), adrien: await id('crescite_personnes', 'adrien'), barbara: await id('crescite_personnes', 'barbara') };
const sp = await id('crescite_spectacles', 'berenice');
await db.exec(`insert into public.crescite_personnes_privees (personne_id, email, user_id) values
  (${P.lauren}, 'lauren@x', '${U.lauren}'), (${P.adrien}, 'adrien@x', '${U.adrien}'), (${P.barbara}, 'barbara@x', '${U.admin}')`);
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${U.admin}', false);`);
const jour = n => new Date(Date.now() + 86400e3 * n).toISOString().slice(0, 10);
const pid = (await db.query(`select public.crescite_proposer($1::jsonb) id`, [JSON.stringify({
  titre: 'Option : Théâtre de Flers', message: 'Êtes-vous libres ?', spectacle_id: sp, jours: [{ debut: jour(60) }, { debut: jour(61) }],
  personnes: [P.lauren, P.adrien] })])).rows[0].id;
await db.exec('reset role');
const jours = (await db.query(`select id from public.crescite_propositions_jours where proposition_id = $1 order by debut`, [pid])).rows.map(r => Number(r.id));
const dest = (await db.query(`select id, jeton from public.crescite_propositions_destinataires where personne_id = $1`, [P.adrien])).rows[0];
const jetonBase = (await db.query(`select valeur from public.crescite_secrets where cle = 'jeton_push'`)).rows[0]?.valeur;
ok(pid > 0 && jours.length === 2 && dest?.jeton?.length >= 32 && jetonBase, 'une proposition de deux jours, une clé par destinataire');

// la fonction, chargée comme Supabase la lance : ses variables, son serveur, son accès à la base, l'envoi par Brevo
const ENV = { SUPABASE_DB_URL: 'postgres://local', SUPABASE_URL: 'https://fwjgyfzcbcmfyfkhhtuh.supabase.co', SITE_URL: 'https://adrienvada.fr/Crescite/', BREVO_API_KEY: 'essai' };
let servir;
globalThis.Deno = { env: { get: k => ENV[k] }, serve: h => { servir = h; } };
globalThis.__postgres = () => (parts, ...vals) => db.query(parts.reduce((q, s, i) => q + s + (i < vals.length ? `$${i + 1}` : ''), ''), vals).then(r => r.rows);
const envoyes = [];
globalThis.fetch = async (url, init) => {
  if (!String(url).startsWith('https://api.brevo.com/')) throw new Error(`appel inattendu : ${url}`);
  envoyes.push({ cle: init.headers['api-key'], corps: JSON.parse(init.body) });
  return new Response('{"messageId":"essai"}', { status: 201 });
};
const dossier = mkdtempSync(join(tmpdir(), 'crescite-courriel-'));
const charger = async nom => {
  const src = readFileSync(new URL('../functions/crescite-courriel/index.ts', import.meta.url), 'utf8')
    .replace(/^import postgres from 'npm:postgres@[^']+';$/m, 'const postgres = globalThis.__postgres;');
  writeFileSync(join(dossier, nom), stripTypeScriptTypes(src));
  await import(pathToFileURL(join(dossier, nom)).href);
};
await charger('index.mjs');
const ICI = 'https://fwjgyfzcbcmfyfkhhtuh.supabase.co/functions/v1/crescite-courriel';
const appel = (methode, corps, entetes = {}, q = '') => servir(new Request(ICI + q, { method: methode, headers: { 'Content-Type': 'application/json', ...entetes },
  body: corps === undefined ? undefined : (typeof corps === 'string' ? corps : JSON.stringify(corps)) }));

// l'envoi, demandé par la base
ok((await appel('POST', { destinataire_id: dest.id })).status === 403, 'sans le jeton de la base, aucun courriel ne part');
ok((await appel('POST', { destinataire_id: dest.id }, { 'x-crescite-jeton': 'faux' })).status === 403, 'ni avec un faux jeton');
const envoi = await appel('POST', { destinataire_id: dest.id }, { 'x-crescite-jeton': jetonBase });
ok(envoi.status === 200 && (await envoi.json()).statut === 'envoye' && envoyes.length === 1, 'avec le jeton de la base, le courriel part par Brevo');
const c = envoyes[0].corps;
ok(c.to[0].email === 'adrien@x' && c.sender.email === 'contact@crescite.fr' && envoyes[0].cle === 'essai', 'à Adrien, de contact@crescite.fr');
const page = `https://adrienvada.fr/Crescite/reponse/?r=${dest.jeton}`;
ok(c.htmlContent.includes(`${page}&amp;j=${jours[0]}&amp;c=oui`) && c.htmlContent.includes(`${page}&amp;j=${jours[1]}&amp;c=peut_etre`),
  'chaque réponse du courriel mène à la page de réponse du site, le jour et le choix dans l’adresse');
ok(c.textContent.includes(`${page}&j=${jours[0]}`) && !c.htmlContent.includes('functions/v1') && !c.textContent.includes('functions/v1'),
  'la version texte aussi, et aucun lien ne mène à la fonction');
ok(/<strong>[A-ZÉ][a-zéû]+ \d{1,2} [a-zéû]+<\/strong>/.test(c.htmlContent), 'les jours s’écrivent avec la seule majuscule initiale');
ok((await db.query(`select courriel_statut from public.crescite_propositions_destinataires where id = $1`, [dest.id])).rows[0].courriel_statut === 'envoye',
  'l’envoi est noté pour l’administration');

// la page de réponse : lire, répondre
const lue = await appel('POST', { r: dest.jeton });
const v = await lue.json();
ok(lue.status === 200 && lue.headers.get('access-control-allow-origin') === '*' && v.proposition.titre === 'Option : Théâtre de Flers'
   && v.proposition.spectacle === 'Bérénice' && v.prenom === 'Adrien' && v.jours.length === 2, 'la page lit la proposition par la clé de la personne');
ok(!JSON.stringify(v).includes('@'), 'sans jamais son adresse');
const rep = await (await appel('POST', { r: dest.jeton, j: jours[1], c: 'peut_etre' })).json();
ok(rep.enregistre === true && rep.jours[1].reponse === 'peut_etre', 'Adrien répond « peut-être » au second jour, la page se met à jour');
ok((await db.query(`select reponse from public.crescite_propositions_reponses where jour_id = $1 and personne_id = $2`, [jours[1], P.adrien])).rows[0].reponse === 'peut_etre',
  'la réponse est dans la base');
ok((await (await appel('POST', { r: dest.jeton, j: jours[1], c: 'toString' })).json()).enregistre === false, 'un choix inconnu ne s’enregistre pas');
ok((await appel('POST', { r: 'x'.repeat(64) })).status === 404 && (await appel('POST', { r: 'court' })).status === 404, 'une fausse clé ne lit rien');
const lauren = (await db.query(`select jeton from public.crescite_propositions_destinataires where personne_id = $1`, [P.lauren])).rows[0].jeton;
await appel('POST', { r: lauren, j: jours[1], c: 'non' });
ok((await db.query(`select reponse from public.crescite_propositions_reponses where jour_id = $1 and personne_id = $2`, [jours[1], P.adrien])).rows[0].reponse === 'peut_etre',
  'la clé de Lauren ne répond que pour Lauren');
ok((await appel('POST', 'pas du json')).status === 400 && (await appel('PUT', {})).status === 405, 'une requête mal formée est refusée');
const pre = await appel('OPTIONS');
ok(pre.status === 200 && /content-type/.test(pre.headers.get('access-control-allow-headers')), 'la page du site peut appeler la fonction (CORS)');

// un lien vers la fonction elle-même renvoie vers le site
const g = await appel('GET', undefined, {}, `?r=${dest.jeton}&j=${jours[0]}&c=oui&autre=1`);
ok(g.status === 302 && g.headers.get('location') === `${page}&j=${jours[0]}&c=oui`, 'un lien vers la fonction renvoie vers la page du site');

// une proposition close
await db.exec(`update public.crescite_propositions set statut = 'close' where id = ${pid}`);
const close = await (await appel('POST', { r: dest.jeton, j: jours[0], c: 'oui' })).json();
ok(close.enregistre === false && close.proposition.statut === 'close'
   && (await db.query(`select reponse from public.crescite_propositions_reponses where jour_id = $1 and personne_id = $2`, [jours[0], P.adrien])).rows[0].reponse === null,
  'rien ne s’enregistre sur une proposition close');

// sans clé d'envoi
delete ENV.BREVO_API_KEY;
await charger('sans-cle.mjs');
const sans = await (await appel('POST', { destinataire_id: dest.id }, { 'x-crescite-jeton': jetonBase })).json();
ok(sans.statut === 'non_configure' && envoyes.length === 1, 'sans clé d’envoi, rien ne part : « non_configure »');
