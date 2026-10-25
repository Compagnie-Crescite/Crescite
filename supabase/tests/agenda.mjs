// Le flux iCalendar de la fonction crescite-agenda (écrite pour Deno) dans Node : d'abord sa composition seule
// (composerFlux, pure, sur des données simulées), puis la fonction entière (GET ?flux=<clé>) sur les cinq migrations en
// local (PGlite). Les dates de la personne restent telles quelles ; les propositions de dates qui lui sont adressées et
// encore ouvertes s'y ajoutent, « à confirmer » (TENTATIVE), sans occuper l'agenda (TRANSPARENT), un événement par jour
// proposé, sa réponse dans le titre ; une proposition close, retirée ou devenue une date, un jour répondu non ou passé
// n'y sont pas ; rien de ce qu'elle n'a pas à voir. L'échappement (virgules, points-virgules, retours à la ligne) et le
// pliage des lignes de plus de 75 octets. Tout est inventé ici : ni vraie personne, ni vraie adresse, ni vraie clé.
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

// ———————————————————————————————————————————— la fonction, chargée comme Supabase la lance
// ses variables, son serveur ; postgres.js imité sur PGlite (comme lui, un int8 revient en texte, un timestamptz en
// Date) ; ical.js ne sert qu'à relire les agendas reliés, pas au flux
const SITE = 'https://site.exemple.test/Crescite';
const ENV = { SUPABASE_DB_URL: 'postgres://local', SUPABASE_URL: 'https://base.exemple.test', SUPABASE_ANON_KEY: 'cle-inventee', SITE_URL: `${SITE}/` };
let servir;
globalThis.Deno = { env: { get: k => ENV[k] }, serve: h => { servir = h; } };
globalThis.__postgres = () => (parts, ...vals) => db.query(parts.reduce((q, s, i) => q + s + (i < vals.length ? `$${i + 1}` : ''), ''), vals)
  .then(r => { const int8 = r.fields.filter(f => f.dataTypeID === 20).map(f => f.name);
    return r.rows.map(x => { for (const k of int8) if (x[k] != null) x[k] = String(x[k]); return x; }); });
const source = readFileSync(new URL('../functions/crescite-agenda/index.ts', import.meta.url), 'utf8');
const src = source.replace(/^import postgres from 'npm:postgres@[^']+';$/m, 'const postgres = globalThis.__postgres;')
  .replace(/^import ICAL from 'npm:ical.js@[^']+';$/m, 'const ICAL = globalThis.__ical;');
const dossier = mkdtempSync(join(tmpdir(), 'crescite-agenda-'));
writeFileSync(join(dossier, 'index.mjs'), stripTypeScriptTypes(src));
const { composerFlux } = await import(pathToFileURL(join(dossier, 'index.mjs')).href);
ok(typeof composerFlux === 'function' && typeof servir === 'function', 'la fonction se charge dans Node (types retirés, postgres imité)');

// ———————————————————————————————————————————— lire un flux
const FIN = 'END:VCALENDAR\r\n';
const deplier = ics => ics.replace(/\r\n[ \t]/g, '');
// une valeur de texte rendue : \n, \, \; et \\ redeviennent ce qu'ils étaient
const rendre = v => v.replace(/\\([\\;,nN])/g, (_, c) => (c === 'n' || c === 'N' ? '\n' : c));
// les événements d'un flux : { NOM: valeur brute, 'NOM@': la ligne jusqu'aux deux-points (paramètres compris), bloc }
function evenements(ics) {
  const out = [];
  let e = null;
  for (const l of deplier(ics).split('\r\n')) {
    if (l === 'BEGIN:VEVENT') { e = { bloc: [l] }; continue; }
    if (!e) continue;
    e.bloc.push(l);
    if (l === 'END:VEVENT') { e.bloc = e.bloc.join('\r\n'); out.push(e); e = null; continue; }
    const i = l.indexOf(':'), nom = l.slice(0, i).split(';')[0];
    e[nom] = l.slice(i + 1); e[`${nom}@`] = l.slice(0, i);
  }
  return out;
}
const propositionsDe = ics => evenements(ics).filter(e => /^crescite-proposition-/.test(e.UID));
const datesDe = ics => evenements(ics).filter(e => !/^crescite-proposition-/.test(e.UID));
// les lignes physiques : 75 octets au plus, de l'UTF-8 entier (aucun caractère coupé), CRLF partout
function lignesSaines(ics) {
  const octets = Buffer.from(ics, 'utf8'), dec = new TextDecoder('utf-8', { fatal: true });
  if (/[^\r]\n|\r(?!\n)/.test(ics)) return false;
  let debut = 0;
  for (let i = 0; i < octets.length - 1; i++) {
    if (octets[i] !== 13 || octets[i + 1] !== 10) continue;
    const ligne = octets.subarray(debut, i);
    if (ligne.length > 75) return false;
    try { dec.decode(ligne); } catch { return false; }
    debut = i + 2;
  }
  return debut === octets.length;
}
const compact = j => j.replace(/-/g, '');

// ———————————————————————————————————————————— 1. la composition seule, sur des données simulées
const T = new Date('2026-10-25T10:00:00Z');
const seance = (id, jour, heure, fin = null, pub = 'tout_public') => ({ id, jour, heure, fin, public: pub, annulee: false, note: null });
const DATES = [
  { id: 1, debut: '2026-11-04', fin: null, precision: 'jour', statut: 'confirmee', nature: 'representations', public: 'tout_public',
    details: [{ texte: 'Accueil par l’entrée des artistes' }], titre: 'Bérénice', slug: 'berenice', duree: '1h30',
    lieu_nom: 'Salle des Essais', adresse: '1 rue Inventée', commune: 'Essai-sur-Mer', departement: '76',
    seances: [seance(11, '2026-11-04', '14:00:00', null, 'scolaire'), seance(12, '2026-11-04', '20:00:00')] },
  { id: 2, debut: '2026-12-01', fin: '2026-12-03', precision: 'periode', statut: 'option', nature: 'representations', public: 'tout_public',
    details: [], titre: 'Bérénice', slug: 'berenice', duree: '1h30', lieu_nom: null, adresse: null, commune: 'Essai-les-Bains', departement: '27', seances: [] },
  { id: 3, debut: '2026-11-20', fin: null, precision: 'jour', statut: 'confirmee', nature: 'repetitions', public: 'autre',
    details: [], titre: 'Bérénice', slug: 'berenice', duree: null, lieu_nom: 'Salle des Essais', adresse: null, commune: 'Essai-sur-Mer', departement: '76',
    seances: [seance(31, '2026-11-20', '10:00:00', '18:00:00', 'autre')] },
];
// un jour proposé : journée entière de minuit à minuit à Paris (comme l'administration l'écrit), ou des heures
const jourProp = (id, jour_id, debut, fin, journee, reste = {}) => ({ id, jour_id, titre: 'Option : Théâtre de Flers', message: null, statut: 'ouverte',
  spectacle: 'Bérénice', date_id: null, debut, fin, journee, reponse: null, ...reste });
const PROPS = [
  jourProp(7, 70, '2026-11-11T23:00:00.000Z', '2026-11-12T23:00:00.000Z', true),                          // le 12 novembre, sans réponse
  jourProp(7, 71, '2026-11-12T23:00:00.000Z', '2026-11-13T23:00:00.000Z', true, { reponse: 'oui' }),     // le 13 : disponible
  jourProp(7, 72, '2026-11-13T23:00:00.000Z', '2026-11-14T23:00:00.000Z', true, { reponse: 'peut_etre' }),
  jourProp(7, 73, '2026-11-14T23:00:00.000Z', '2026-11-15T23:00:00.000Z', true, { reponse: 'non' }),     // non : pas là
  jourProp(8, 80, '2026-11-17T13:00:00.000Z', '2026-11-17T16:00:00.000Z', false, { titre: 'Répétitions' }),  // 14h-17h (heure d'hiver)
  jourProp(8, 81, '2027-06-08T12:00:00.000Z', '2027-06-08T15:30:00.000Z', false, { titre: 'Répétitions' }),  // 14h-17h30 (heure d'été)
  jourProp(9, 90, '2026-11-23T23:00:00.000Z', '2026-11-26T23:00:00.000Z', true, { titre: 'Résidence', spectacle: null }),   // trois jours d'un tenant
  jourProp(10, 100, '2026-11-12T00:00:00.000Z', '2026-11-13T00:00:00.000Z', true, { titre: 'Des dates à confirmer', spectacle: null }),  // minuit UTC
  jourProp(11, 110, '2026-11-18T23:00:00.000Z', '2026-11-19T23:00:00.000Z', true, { statut: 'close' }),        // close : pas là
  jourProp(12, 120, '2026-12-01T23:00:00.000Z', '2026-12-02T23:00:00.000Z', true, { date_id: 2 }),            // devenue la date 2 : déjà là
  jourProp(13, 130, '2026-12-05T23:00:00.000Z', '2026-12-06T23:00:00.000Z', true, { date_id: 99 }),           // une date hors du flux
  jourProp(14, 140, '2026-10-20T22:00:00.000Z', '2026-10-21T22:00:00.000Z', true),                            // passé : pas là
  jourProp(15, 150, '2026-11-20T14:00:00.000Z', '2026-11-20T18:00:00.000Z', true),                            // « journée » mal bornée : rien
];
const personne = { prenom: 'Alix' };
const sans = composerFlux(personne, DATES, T), vide = composerFlux(personne, DATES, T, []);
const avec = composerFlux(personne, DATES, T, PROPS);
ok(sans === vide && !sans.includes('crescite-proposition-'), 'sans propositions : le flux des dates seul, appelé comme avant (trois arguments)');
ok(avec.startsWith(sans.slice(0, -FIN.length)) && avec.endsWith(FIN) && avec.length > sans.length,
  'avec propositions : les dates d’abord, octet pour octet les mêmes, puis les propositions');
const D0 = datesDe(sans);
ok(D0.length === 4 && D0.filter(e => e.STATUS === 'TENTATIVE').length === 1 && D0.every(e => e.TRANSP === 'OPAQUE')
   && D0.find(e => e.STATUS === 'TENTATIVE').SUMMARY === 'Option · Bérénice', 'les dates : deux séances, la répétition, l’option « à confirmer » ; elles occupent l’agenda');
ok(/^X-WR-CALDESC:.*dates qu’elle vous propose\\, à confirmer\./m.test(deplier(avec)), 'la description du calendrier dit qu’il porte aussi les propositions');

const P = propositionsDe(avec), uid = (id, j) => `crescite-proposition-${id}-jour-${j}@crescite.fr`, de = (id, j) => P.find(e => e.UID === uid(id, j));
ok(P.map(e => e.UID).join() === [uid(7, 70), uid(7, 71), uid(7, 72), uid(8, 80), uid(8, 81), uid(9, 90), uid(10, 100), uid(13, 130)].join(),
  `un événement par jour proposé ; ni le jour répondu non, ni la proposition close, ni celle devenue une date du flux, ni le jour passé (${P.length})`);
ok(P.every(e => e.STATUS === 'TENTATIVE' && e.TRANSP === 'TRANSPARENT' && e.DTSTAMP === '20261025T100000Z'),
  'chacun « à confirmer » (TENTATIVE), sans occuper l’agenda (TRANSPARENT), avec un DTSTAMP');
ok(P.every(e => e.URL === `${SITE}/equipe/#/proposition/${e.UID.match(/proposition-(\d+)-/)[1]}`) && !avec.includes('/reponse/'),
  'le lien mène à la proposition dans l’espace de l’équipe (jamais à la page de réponse et sa clé)');
ok(rendre(de(7, 70).SUMMARY) === 'Proposition : Bérénice — Théâtre de Flers (à confirmer)'
   && rendre(de(7, 71).SUMMARY) === 'Proposition : Bérénice — Théâtre de Flers (à confirmer, vous avez répondu : disponible)'
   && rendre(de(7, 72).SUMMARY) === 'Proposition : Bérénice — Théâtre de Flers (à confirmer, vous avez répondu : peut-être)',
  'le titre : le spectacle, l’objet de la proposition, « à confirmer », la réponse déjà donnée');
ok(rendre(de(10, 100).SUMMARY) === 'Proposition de dates (à confirmer)' && rendre(de(9, 90).SUMMARY) === 'Proposition : Résidence (à confirmer)'
   && rendre(de(8, 80).SUMMARY) === 'Proposition : Bérénice — Répétitions (à confirmer)', 'sans spectacle ni titre choisi : « Proposition de dates »');
ok(de(7, 70)['DTSTART@'] === 'DTSTART;VALUE=DATE' && de(7, 70).DTSTART === '20261112' && de(7, 70).DTEND === '20261113'
   && de(10, 100).DTSTART === '20261112' && de(10, 100).DTEND === '20261113', 'sans heures, des journées entières (minuit à Paris comme minuit UTC), fin exclue');
ok(de(9, 90).DTSTART === '20261124' && de(9, 90).DTEND === '20261127', 'une période proposée d’un tenant : un seul événement, du 24 au 26 novembre');
ok(de(8, 80)['DTSTART@'] === 'DTSTART;TZID=Europe/Paris' && de(8, 80).DTSTART === '20261117T140000' && de(8, 80).DTEND === '20261117T170000'
   && de(8, 81).DTSTART === '20270608T140000' && de(8, 81).DTEND === '20270608T173000', 'avec des heures : à l’heure de Paris (hiver comme été)');
const d71 = rendre(de(7, 71).DESCRIPTION), d70 = rendre(de(7, 70).DESCRIPTION);
ok(d71.split('\n')[0] === 'Des dates que la compagnie vous propose, pas encore confirmées : « Option : Théâtre de Flers » (Bérénice).'
   && d71.includes('Vous avez répondu : disponible.') && d70.includes('Vous n’avez pas encore répondu.')
   && d71.endsWith(`Répondre dans l’application : ${SITE}/equipe/#/proposition/7`), 'la description : la proposition, la réponse, le lien');
ok(composerFlux(personne, [], T, [jourProp(12, 120, '2026-12-01T23:00:00.000Z', '2026-12-02T23:00:00.000Z', true, { date_id: 2 })]).includes(uid(12, 120)),
  'une proposition liée à une date qui n’est pas dans son flux y reste');

// l'échappement et le pliage
const titreDur = 'Option : Théâtre, salle 2; puis \\ l’Atelier';
const messageDur = 'Montage la veille, à 9h;\nretour le soir\r\nvers 23h.\rPrévoir\u0007 deux jours\tde marge.';
const long = 'Option : Théâtre municipal de Saint-Étienne-du-Rouvray — grande salle, plateau 12 × 9 m, accès décor 🎭';
const dur = composerFlux(personne, [], T, [jourProp(20, 200, '2026-11-11T23:00:00.000Z', '2026-11-12T23:00:00.000Z', true, { titre: titreDur, message: messageDur, reponse: 'oui' }),
  jourProp(21, 210, '2026-11-11T23:00:00.000Z', '2026-11-12T23:00:00.000Z', true, { titre: long, message: long.repeat(3) })]);
const [e1, e2] = propositionsDe(dur);
ok(e1.SUMMARY === 'Proposition : Bérénice — Théâtre\\, salle 2\\; puis \\\\ l’Atelier (à confirmer\\, vous avez répondu : disponible)',
  'virgules, points-virgules et barres obliques inverses échappés dans le titre');
ok(rendre(e1.DESCRIPTION).includes('Montage la veille, à 9h;\nretour le soir\nvers 23h.\nPrévoir deux jours\tde marge.') && !/[\r\n]/.test(e1.DESCRIPTION)
   && e1.DESCRIPTION.includes('9h\\;\\nretour'), 'les retours à la ligne (\\n, \\r\\n, \\r seul) deviennent \\n, les caractères de contrôle partent, la tabulation reste');
ok(lignesSaines(dur) && lignesSaines(avec) && lignesSaines(sans), 'lignes de 75 octets au plus, aucun caractère coupé (accents, tirets, emoji), CRLF partout');
const brut = dur.split('\r\n'), suites = brut.filter(l => l.startsWith(' '));
ok(suites.length >= 6 && brut.some(l => l.startsWith('SUMMARY:') && Buffer.byteLength(l) > 70)
   && rendre(e2.SUMMARY) === `Proposition : Bérénice — ${long.replace(/^Option : /, '')} (à confirmer)` && rendre(e2.DESCRIPTION).includes(long.repeat(3)),
  `les lignes longues sont pliées (${suites.length} suites, une espace en tête) et se déplient à l’identique`);

// le coût : un gros flux se compose en quelques millisecondes (Supabase arrête un appel vers deux secondes de calcul)
const grosDates = Array.from({ length: 400 }, (_, i) => ({ ...DATES[0], id: 1000 + i, seances: [seance(5000 + 3 * i, '2026-11-04', '14:00:00'),
  seance(5001 + 3 * i, '2026-11-04', '20:00:00'), seance(5002 + 3 * i, '2026-11-05', null)] }));
const grosProps = Array.from({ length: 300 }, (_, i) => jourProp(2000 + Math.floor(i / 10), 9000 + i, '2026-11-11T23:00:00.000Z', '2026-11-12T23:00:00.000Z', i % 2 === 0,
  { message: 'Un message assez long pour être plié, avec des virgules, des points-virgules; et des retours\nà la ligne.' }));
composerFlux(personne, grosDates, T, grosProps);
let t = performance.now();
const gros = composerFlux(personne, grosDates, T, grosProps);
t = performance.now() - t;
ok(evenements(gros).length === 1500 && t < 250, `1 200 séances et 300 jours proposés : ${Math.round(t)} ms`);

// ———————————————————————————————————————————— 2. la fonction entière, sur la base locale
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

// des comptes et des personnes inventés : une administratrice (sans fiche), Alix, Basile et Camille
const U = { admin: '11111111-1111-1111-1111-111111111111', alix: '22222222-2222-2222-2222-222222222222', basile: '33333333-3333-3333-3333-333333333333' };
for (const k in U) await db.exec(`insert into auth.users values ('${U[k]}', null)`);
await db.exec(`insert into public.crescite_admins (user_id) values ('${U.admin}')`);
await db.exec(`
  insert into public.crescite_spectacles (slug, titre, duree, univers) values ('berenice', 'Bérénice', '1h30', '{}');
  insert into public.crescite_lieux (nom, commune, departement, adresse) values ('Salle des Essais', 'Essai-sur-Mer', '76', '1 rue Inventée');
  insert into public.crescite_personnes (slug, prenom, nom) values ('alix', 'Alix', 'Essai'), ('basile', 'Basile', 'Essai'), ('camille', 'Camille', 'Essai');
`);
const un = async (q, p) => (await db.query(q, p)).rows[0];
const id = async (t, slug) => (await un(`select id from public.${t} where slug = $1`, [slug])).id;
const PE = { alix: await id('crescite_personnes', 'alix'), basile: await id('crescite_personnes', 'basile'), camille: await id('crescite_personnes', 'camille') };
const sp = await id('crescite_spectacles', 'berenice'), lieu = (await un(`select id from public.crescite_lieux`)).id;
await db.exec(`
  insert into public.crescite_personnes_privees (personne_id, user_id) values (${PE.alix}, '${U.alix}'), (${PE.basile}, '${U.basile}'), (${PE.camille}, null);
  insert into public.crescite_distributions (spectacle_id, personne_id, categorie, en_tournee) values (${sp}, ${PE.alix}, 'jeu', true), (${sp}, ${PE.basile}, 'jeu', true), (${sp}, ${PE.camille}, 'jeu', true);
`);
const jour = n => new Date(Date.now() + n * 86400e3).toISOString().slice(0, 10);
const date = async (debut, fin, precision, statut) => (await un(`insert into public.crescite_dates (spectacle_id, lieu_id, debut, fin, precision, statut)
  values ($1, $2, $3, $4, $5, $6) returning id`, [sp, lieu, debut, fin, precision, statut])).id;
const dConfirmee = await date(jour(20), null, 'jour', 'confirmee'), dOption = await date(jour(30), jour(31), 'periode', 'option');
await db.query(`insert into public.crescite_representations (date_id, jour, heure, public) values ($1, $2, '20:00', 'tout_public')`, [dConfirmee, jour(20)]);
const jetonDe = async p => (await un(`select agenda_jeton from public.crescite_personnes_privees where personne_id = $1`, [p])).agenda_jeton;
const J = { alix: await jetonDe(PE.alix), basile: await jetonDe(PE.basile), camille: await jetonDe(PE.camille) };
const ICI = 'https://base.exemple.test/functions/v1/crescite-agenda';
const lireFluxDe = async (qui, methode = 'GET') => servir(new Request(`${ICI}?flux=${J[qui]}`, { method: methode }));
const fluxDe = async qui => (await lireFluxDe(qui)).text();
const sansStamp = s => s.replace(/^DTSTAMP:.*$/gm, '');
const avant = { alix: await fluxDe('alix'), camille: await fluxDe('camille') };
ok(datesDe(avant.alix).length === 2 && !propositionsDe(avant.alix).length, 'avant toute proposition : les deux dates d’Alix');

// l'administration propose (crescite_proposer, comme l'administration) ; on répond comme dans l'application
const comme = async (u, q, p = []) => { await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${u}', false);`);
  try { return await db.query(q, p); } finally { await db.exec('reset role'); } };
const paris = async (j, h = '00:00') => (await un(`select (($1::date + $2::time) at time zone 'Europe/Paris') t`, [j, h])).t.toISOString();
const journee = async n => ({ debut: await paris(jour(n)), fin: await paris(jour(n + 1)), journee: true });
const proposer = async (o, jours, personnes) => Number((await comme(U.admin, `select public.crescite_proposer($1::jsonb) id`,
  [JSON.stringify({ titre: o.titre ?? 'Option : Théâtre de Flers', message: o.message ?? null, spectacle_id: o.spectacle === false ? null : sp, jours, personnes })])).rows[0].id);
const joursDe = async pid => (await db.query(`select id from public.crescite_propositions_jours where proposition_id = $1 order by debut`, [pid])).rows.map(r => Number(r.id));
const repondre = (u, j, r) => comme(u, `select public.crescite_repondre($1, $2)`, [j, r]);

const p1 = await proposer({ message: 'Deux soirs à Flers, montage la veille ; êtes-vous libres ?' }, [await journee(60), await journee(61)], [PE.alix, PE.basile]);
const [j60, j61] = await joursDe(p1);
await repondre(U.alix, j60, 'oui');
await repondre(U.basile, j60, 'non'); await repondre(U.basile, j61, 'peut_etre');
const p2 = await proposer({ titre: 'Répétitions' }, [{ debut: await paris(jour(70), '14:00'), fin: await paris(jour(70), '17:00'), journee: false }], [PE.alix]);
const p3 = await proposer({ titre: 'Résidence, Essai-sur-Mer; semaine 2', message: 'Ligne 1,\nligne 2; fin', spectacle: false },
  [{ debut: await paris(jour(80)), fin: await paris(jour(83)), journee: true }], [PE.alix]);
const p4 = await proposer({ titre: 'Close' }, [await journee(85)], [PE.alix]);
const p5 = await proposer({ titre: 'Répondue non' }, [await journee(86)], [PE.alix]);
await repondre(U.alix, (await joursDe(p5))[0], 'non');
const p6 = await proposer({ titre: 'Devenue une date' }, [await journee(90)], [PE.alix, PE.basile]);
const p7 = await proposer({ titre: 'Pour Basile seul' }, [await journee(95)], [PE.basile]);
const p8 = await proposer({ titre: 'Retirée' }, [await journee(96)], [PE.alix]);
const p9 = await proposer({ titre: 'Un jour passé, un à venir' }, [await journee(-3), await journee(100)], [PE.alix]);
const p10 = await proposer({ titre: '', spectacle: false }, [{ debut: jour(110) }], [PE.alix]);   // un jour sans heure, minuit UTC
await db.exec(`update public.crescite_propositions set statut = 'close' where id = ${p4}`);
await db.exec(`delete from public.crescite_propositions_destinataires where proposition_id = ${p8} and personne_id = ${PE.alix}`);
// « Créer la date » depuis p6 : la date, avec qui a dit oui (Alix) ; le reste de la distribution n'y part pas (Basile,
// Camille) ; puis la proposition close qui la garde
const dRetenue = await date(jour(90), null, 'jour', 'confirmee');
await repondre(U.alix, (await joursDe(p6))[0], 'oui');
await db.query(`insert into public.crescite_equipes (date_id, personne_id, present) values ($1, $2, true), ($1, $3, false), ($1, $4, false)`,
  [dRetenue, PE.alix, PE.basile, PE.camille]);
await db.exec(`update public.crescite_propositions set statut = 'close', date_id = ${dRetenue} where id = ${p6}`);

const r = await lireFluxDe('alix'), alix = await r.text();
ok(r.status === 200 && /^text\/calendar/.test(r.headers.get('content-type')) && /private, max-age=900/.test(r.headers.get('cache-control')), 'le flux : text/calendar, gardé un quart d’heure');
const PA = propositionsDe(alix), uidJ = (pid, j) => `crescite-proposition-${pid}-jour-${j}@crescite.fr`;
const [j70] = await joursDe(p2), [j80] = await joursDe(p3), [, j100] = await joursDe(p9), [j110] = await joursDe(p10);
ok(PA.map(e => e.UID).sort().join() === [uidJ(p1, j60), uidJ(p1, j61), uidJ(p2, j70), uidJ(p3, j80), uidJ(p9, j100), uidJ(p10, j110)].sort().join(),
  `Alix : ses propositions ouvertes, un événement par jour proposé (${PA.length}) ; ni la close, ni celle répondue non, ni la retirée, ni celle devenue une date, ni celle de Basile, ni le jour passé`);
const ev = (pid, j) => PA.find(e => e.UID === uidJ(pid, j));
ok(rendre(ev(p1, j60).SUMMARY) === 'Proposition : Bérénice — Théâtre de Flers (à confirmer, vous avez répondu : disponible)'
   && rendre(ev(p1, j61).SUMMARY) === 'Proposition : Bérénice — Théâtre de Flers (à confirmer)', 'sa réponse dans le titre, jour par jour');
ok(ev(p1, j60).DTSTART === compact(jour(60)) && ev(p1, j60).DTEND === compact(jour(61)) && ev(p10, j110).DTSTART === compact(jour(110))
   && ev(p10, j110).DTEND === compact(jour(111)) && rendre(ev(p10, j110).SUMMARY) === 'Proposition de dates (à confirmer)', 'des journées entières, à leur jour');
ok(ev(p2, j70).DTSTART === `${compact(jour(70))}T140000` && ev(p2, j70).DTEND === `${compact(jour(70))}T170000`, 'des heures : de 14h à 17h, heure de Paris');
ok(ev(p3, j80).DTSTART === compact(jour(80)) && ev(p3, j80).DTEND === compact(jour(83)) && ev(p3, j80).SUMMARY === 'Proposition : Résidence\\, Essai-sur-Mer\\; semaine 2 (à confirmer)'
   && rendre(ev(p3, j80).DESCRIPTION).includes('Ligne 1,\nligne 2; fin'), 'une période de trois jours, un événement ; le titre et le message échappés');
ok(PA.every(e => e.STATUS === 'TENTATIVE' && e.TRANSP === 'TRANSPARENT' && e.URL === `${SITE}/equipe/#/proposition/${e.UID.match(/proposition-(\d+)-/)[1]}`),
  'TENTATIVE, TRANSPARENT, et l’adresse de la proposition dans l’espace de l’équipe');
ok(alix.includes(`crescite-date-${dRetenue}@crescite.fr`) && !alix.includes(`crescite-proposition-${p6}-`), 'la proposition devenue une date est là comme date, une seule fois');
ok(sansStamp(datesDe(avant.alix).map(e => e.bloc).join('\n')) === sansStamp(datesDe(alix).filter(e => !e.UID.includes(`-${dRetenue}@`)).map(e => e.bloc).join('\n')),
  'ses dates d’avant sont restées les mêmes, à l’octet près (hors DTSTAMP)');
ok(lignesSaines(alix), 'lignes de 75 octets au plus, CRLF');
const jetons = (await db.query(`select jeton from public.crescite_propositions_destinataires`)).rows.map(x => x.jeton);
ok(!/Basile|Camille/.test(alix) && jetons.every(x => !alix.includes(x)) && !alix.includes('/reponse/'),
  'rien de ce qu’Alix n’a pas à voir : ni les autres destinataires, ni leurs réponses, ni les clés de réponse des courriels');

const basile = await fluxDe('basile'), PB = propositionsDe(basile);
ok(!basile.includes(uidJ(p1, j60)) && rendre(PB.find(e => e.UID === uidJ(p1, j61)).SUMMARY).endsWith('(à confirmer, vous avez répondu : peut-être)')
   && basile.includes(`crescite-proposition-${p7}-`), 'Basile : le jour répondu non n’y est pas, le « peut-être » y est, et sa proposition à lui');
ok(!basile.includes(`crescite-date-${dRetenue}@`) && !basile.includes(`crescite-proposition-${p6}-`), 'la proposition devenue une date (close) : ni la date, où il ne part pas, ni la proposition');
await db.exec(`update public.crescite_propositions set statut = 'ouverte' where id = ${p6}`);
ok(!(await fluxDe('alix')).includes(`crescite-proposition-${p6}-`) && (await fluxDe('basile')).includes(`crescite-proposition-${p6}-`),
  'rouverte : toujours pas chez Alix (la date est dans son flux), de nouveau chez Basile');

const camille = await fluxDe('camille');
ok(!propositionsDe(camille).length && datesDe(camille).length === 2 && sansStamp(camille) === sansStamp(avant.camille), 'Camille, sans proposition : son flux est le même qu’avant');
const tete = await lireFluxDe('alix', 'HEAD');
ok(tete.status === 200 && (await tete.text()) === '', 'HEAD : sans le corps');

// si la lecture des propositions échoue, le flux des dates reste
await db.exec('alter table public.crescite_propositions_reponses rename to crescite_propositions_reponses_cachees');
const erreur = console.error; console.error = () => {};
const panne = await lireFluxDe('alix');
console.error = erreur;
await db.exec('alter table public.crescite_propositions_reponses_cachees rename to crescite_propositions_reponses');
const sansProps = await panne.text();
ok(panne.status === 200 && datesDe(sansProps).length === 3 && !propositionsDe(sansProps).length, 'la lecture des propositions en panne : le flux des dates reste entier');
