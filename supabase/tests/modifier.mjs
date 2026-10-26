// L'équipe modifie ce qui la concerne (le quatorzième script), dans un Postgres local (PGlite) : les treize premiers
// scripts, le quatorzième deux fois (sans le treizième, il s'arrête). L'horaire, la précision d'une séance et le texte
// des précisions d'une date ; les fichiers d'un spectacle (préparer le chemin, déposer, inscrire, renommer, remplacer,
// supprimer, effacer l'ancien fichier). Qui le peut (l'équipe de la date, ou du spectacle, et l'administration) et qui
// ne le peut pas (une personne retirée de la date, une autre troupe, un compte sans fiche, le public) ; ce qui reste à
// l'administration ; une notification par personne, jamais pour l'auteur, qui le nomme, une seule (les déclencheurs du
// troisième script se taisent pendant le geste, et parlent de nouveau après) ; le journal avec l'auteur ; vingt
// modifications et vingt fichiers par heure et par compte ; les anciens scripts relancés après lui. Adresses fictives.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const migration = f => readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8');
const FICHIERS = ['20261020_crescite_base.sql', '20261021_crescite_equipe.sql', '20261022_crescite_notifications.sql',
  '20261023_crescite_pro.sql', '20261024_crescite_disponibilites.sql', '20261025_crescite_preferences.sql',
  '20261026_crescite_ideale.sql', '20261027_crescite_documents_publics.sql', '20261028_crescite_signaler.sql',
  '20261029_crescite_chiffres.sql', '20261030_crescite_alertes.sql', '20261031_crescite_residences.sql',
  '20261101_crescite_securite.sql'];
const S = FICHIERS.map(migration);
const MODIFIE = migration('20261102_crescite_equipe_modifie.sql');
const ok = (c, m) => { if (!c) { console.log('ÉCHEC :', m); process.exitCode = 1; } else console.log('ok :', m); };
const PREPARER = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
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
  -- pg_net de Supabase : un substitut qui note les appels
  create schema net; create table net.appels (url text, body jsonb, headers jsonb);
  create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
    returns bigint language sql as $$ insert into net.appels values (url, body, headers); select 1::bigint $$;
  create schema cron; create table cron.job (jobid bigserial primary key, jobname text, schedule text, command text);
  create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.job (jobname, schedule, command) values (n, s, c) returning jobid $$;
  create function cron.unschedule(id bigint) returns boolean language sql as $$ delete from cron.job where jobid = id returning true $$;
  insert into pg_catalog.pg_extension (oid, extname, extowner, extnamespace, extrelocatable, extversion)
    values (987654, 'pg_cron', 10, (select oid from pg_namespace where nspname = 'public'), false, '1.6');`;
const ouvrir = async () => {
  const b = new PGlite();
  await b.exec(PREPARER);
  try { await b.exec('create publication supabase_realtime'); } catch (e) { /* pas de publication ici */ }
  return b;
};

// ---------------------------------------------------------------------------------------------- sans le treizième script
{
  const b = await ouvrir();
  for (const s of S.slice(0, 12)) await b.exec(s);
  let refus = null;
  try { await b.exec(MODIFIE); } catch (e) { refus = e.message; await b.exec('rollback'); }
  ok(/treizième script/.test(refus || '') && !(await b.query(`select to_regclass('public.crescite_modifications') t`)).rows[0].t,
    'sans le treizième script, le quatorzième s’arrête et dit lequel lancer d’abord (rien n’est changé)');
  await b.close();
}

// ---------------------------------------------------------------------------------------------- les scripts
const db = await ouvrir();
const echecs = [];
for (const [i, s] of S.entries()) { try { await db.exec(s); } catch (e) { echecs.push(`script ${i + 1} : ${e.message}`); await db.exec('rollback').catch(() => {}); } }
let fin;
for (let i = 0; i < 2; i++) { try { fin = await db.exec(MODIFIE); } catch (e) { echecs.push(`quatorzième (${i + 1}) : ${e.message}`); await db.exec('rollback').catch(() => {}); } }
ok(!echecs.length, `les treize scripts passent, puis le quatorzième deux fois${echecs.length ? ` (${echecs.join(' ; ')})` : ''}`);
const etat = fin ? fin.at(-1).rows : [];
ok(etat.length === 4 && etat.slice(0, 3).every(r => /^prêt(e?s)? :/.test(r['état'])), `il dit ce qui est en place : ${etat.map(r => r['état']).join(' | ')}`);
const n = async (q, p = []) => (await db.query(q, p)).rows[0].n;
ok(await n(`select count(*)::int n from pg_policies where schemaname = 'storage' and policyname like 'crescite\\_equipe\\_membre\\_%'`) === 3
   && await n(`select count(*)::int n from pg_policies where tablename = 'crescite_modifications'`) === 1,
  'ses trois règles du stockage et sa règle de lecture, une fois chacune');

// ---------------------------------------------------------------------------------------------- les données
// Bérénice : Lauren et Adrien partent en tournée (Adrien est retiré de la date d'Eu, un remplaçant y est ajouté), Thomas
// est dans la distribution sans partir, une personne n'a pas de compte ; Cléophène : une autre comédienne. Barbara
// administre et a sa fiche, un second compte administre sans fiche, un compte du projet n'est pas de l'équipe
const U = { barbara: '11111111-1111-1111-1111-111111111111', lauren: '22222222-2222-2222-2222-222222222222', adrien: '33333333-3333-3333-3333-333333333333',
  thomas: '44444444-4444-4444-4444-444444444444', rempl: '55555555-5555-5555-5555-555555555555', admin2: '66666666-6666-6666-6666-666666666666',
  autre: '77777777-7777-7777-7777-777777777777', dehors: '88888888-8888-8888-8888-888888888888' };
for (const k in U) await db.exec(`insert into auth.users values ('${U[k]}', '${k}@exemple.fr', now())`);
await db.exec(`insert into public.crescite_admins (user_id) values ('${U.barbara}'), ('${U.admin2}')`);
const id = async (q, p = []) => (await db.query(q, p)).rows[0]?.id;
const P = {};
for (const [slug, prenom, nom] of [['lauren', 'Lauren', 'Toulin'], ['adrien', 'Adrien', 'Vada'], ['thomas', 'Thomas', 'J'], ['rempl', 'Rem', 'Plaçant'],
  ['autre', 'Autre', 'Comédienne'], ['sans-compte', 'Sans', 'Compte'], ['barbara', 'Barbara', 'D']]) {
  P[slug] = await id(`insert into public.crescite_personnes (slug, prenom, nom) values ($1, $2, $3) returning id`, [slug, prenom, nom]);
}
for (const k of ['lauren', 'adrien', 'thomas', 'rempl', 'autre', 'barbara']) {
  await db.query(`insert into public.crescite_personnes_privees (personne_id, email, user_id) values ($1, $2, $3)`, [P[k], `${k}@exemple.fr`, U[k]]);
}
await db.query(`insert into public.crescite_personnes_privees (personne_id) values ($1)`, [P['sans-compte']]);
const ber = await id(`insert into public.crescite_spectacles (slug, titre) values ('berenice', 'Bérénice') returning id`);
const cleo = await id(`insert into public.crescite_spectacles (slug, titre) values ('cleophene', 'Cléophène') returning id`);
const eu = await id(`insert into public.crescite_lieux (nom, commune, departement) values ('Théâtre d’Eu', 'Eu', '76') returning id`);
const havre = await id(`insert into public.crescite_lieux (nom, commune, departement) values ('Le Volcan', 'Le Havre', '76') returning id`);
await db.query(`insert into public.crescite_distributions (spectacle_id, personne_id, categorie, en_tournee) values
  ($1, $2, 'jeu', true), ($1, $3, 'jeu', true), ($1, $4, 'creation', false), ($1, $5, 'jeu', true), ($6, $7, 'jeu', true)`,
  [ber, P.lauren, P.adrien, P.thomas, P['sans-compte'], cleo, P.autre]);
const jour = k => new Date(Date.now() + k * 864e5).toISOString().slice(0, 10);
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const jourTexte = j => { const [, m, x] = j.split('-').map(Number); return `${x === 1 ? '1er' : x} ${MOIS[m - 1]}`; };
const jourCourt = j => { const [, m, x] = j.split('-').map(Number); return `${x} ${MOIS_C[m - 1]}`; };
const nbsp = s => s.replace(/_/g, ' ');           // « 20_h_30 » → « 20 h 30 » (espaces insécables)
const date = async (sp, lieu, statut = 'confirmee', details = []) =>
  id(`insert into public.crescite_dates (spectacle_id, lieu_id, debut, statut, details) values ($1, $2, $3, $4, $5) returning id`,
     [sp, lieu, jour(1), statut, JSON.stringify(details)]);
const seance = async (d, k, heure, extra = {}) => id(`insert into public.crescite_representations (date_id, jour, heure, public, note, annulee)
  values ($1, $2, $3, $4, $5, $6) returning id`, [d, jour(k), heure, extra.public || 'tout_public', extra.note || null, !!extra.annulee]);
const LIEN = 'https://exemple.fr/eu';
const d = await date(ber, eu, 'confirmee', [{ texte: '14h et 20h : représentations à Eu', lien: LIEN }, { texte: 'Garer le camion derrière le théâtre', lien: null }]);
const r1 = await seance(d, 20, '20:00'), r2 = await seance(d, 20, '14:00', { public: 'scolaire', note: 'complet' });
const r8 = await seance(d, 20, '17:00', { annulee: true });
const dh = await date(ber, havre);
const r3 = await seance(dh, 30, '20:00'), r4 = await seance(dh, 31, '15:00');
const passee = await date(ber, eu);
const r5 = await seance(passee, -20, '20:00');
const annulee = await date(ber, eu, 'annulee');
await seance(annulee, 25, '20:00');
const dc = await date(cleo, eu);
const r7 = await seance(dc, 22, '20:00');
await db.query(`insert into public.crescite_equipes (date_id, personne_id, present) values ($1, $2, false), ($1, $3, true)`, [d, P.adrien, P.rempl]);
await db.query(`insert into public.crescite_abonnements (personne_id, endpoint, p256dh, auth) values ($1, 'https://fcm.googleapis.com/fcm/send/r', 'k', 'a'),
  ($2, 'https://fcm.googleapis.com/fcm/send/l', 'k', 'a')`, [P.rempl, P.lauren]);
// les documents : de l'équipe (un fichier, un lien), public, de l'administration, d'une autre troupe, de toute la compagnie
const doc = async (sp, titre, fichier, pour, url = null) => id(`insert into public.crescite_documents (spectacle_id, type, titre, fichier, url, pour)
  values ($1, 'texte', $2, $3, $4, $5) returning id`, [sp, titre, fichier, url, pour]);
const D = {
  texte: await doc(ber, 'Le texte', 'berenice/texte.pdf', 'equipe'),
  lien: await doc(ber, 'Le texte sur Wikisource', null, 'equipe', 'https://fr.wikisource.org/wiki/Bérénice'),
  pros: await doc(ber, 'Dossier artistique', 'documents/berenice/dossier.pdf', 'pros'),
  admin: await doc(ber, 'Contrat', 'berenice/contrat.pdf', 'administration'),
  cleo: await doc(cleo, 'Le texte', 'cleophene/texte.pdf', 'equipe'),
  cie: await doc(null, 'Charte de la compagnie', 'compagnie/charte.pdf', 'equipe'),
};
for (const f of ['berenice/texte.pdf', 'berenice/contrat.pdf', 'berenice/orphelin.pdf', 'cleophene/texte.pdf', 'compagnie/charte.pdf', 'portraits/lauren.webp']) {
  await db.query(`insert into storage.objects (bucket_id, name) values ('crescite-equipe', $1)`, [f]);
}
await db.exec(`insert into storage.objects (bucket_id, name) values ('crescite', 'documents/berenice/dossier.pdf')`);
await db.exec(`delete from public.crescite_notifications; delete from net.appels; delete from public.crescite_journal`);

const as = async (role, sub, q, params = []) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub || ''}', false), set_config('request.jwt.claims', '', false);`);
  try { return await db.query(q, params); } finally { await db.exec('reset role'); }
};
const erreur = async (...a) => { try { await as(...a); return null; } catch (e) { return e; } };
const code = async (...a) => { const e = await erreur(...a); return e ? `${e.code} ${e.message}` : 'ok'; };
const modifierDate = (qui, dd, ch) => as('authenticated', U[qui], `select public.crescite_modifier_date($1, $2::jsonb) r`, [dd, JSON.stringify(ch)]).then(x => x.rows[0].r);
const essaiDate = (qui, dd, ch) => code('authenticated', U[qui], `select public.crescite_modifier_date($1, $2::jsonb)`, [dd, JSON.stringify(ch)]);
const recues = async k => (await db.query(`select type, titre, texte, date_id, spectacle_id, lien, auteur_id from public.crescite_notifications
  where personne_id = $1 order by id`, [P[k]])).rows;
const toutes = async () => (await db.query(`select personne_id, titre from public.crescite_notifications order by id`)).rows;
const vider = () => db.exec(`delete from public.crescite_notifications; delete from net.appels`);
const ligneRep = async r => (await db.query(`select heure, fin, note, modifie_par from public.crescite_representations where id = $1`, [r])).rows[0];
const journal = async (table, ligne) => (await db.query(`select qui, operation, avant, apres from public.crescite_journal where table_nom = $1 and ligne = $2
  order by id desc limit 1`, [table, String(ligne)])).rows[0];

// ---------------------------------------------------------------------------------------------- 1. l'horaire d'une séance
const J20 = jour(20), J30 = jour(30);
const res1 = await modifierDate('lauren', d, { representations: [{ id: r1, heure: '20:30', avant: { heure: '20:00' } }] });
ok(res1.prevenus === 2 && res1.modifications === 1, `Lauren change l’horaire de 20 h : ${res1.prevenus} personnes prévenues (le remplaçant et l’administratrice)`);
const titre1 = `Lauren Toulin a changé l’horaire du ${jourTexte(J20)} à Eu`, texte1 = nbsp('20_h → 20_h_30 · Bérénice');
const n1 = (await recues('rempl'))[0];
ok(n1 && n1.type === 'horaires' && n1.titre === titre1 && n1.texte === texte1, `la notification nomme l’auteur et dit ce qui change : « ${n1?.titre} » — « ${n1?.texte} »`);
ok(n1 && n1.lien === `#/date/${d}` && n1.date_id === null && Number(n1.spectacle_id) === Number(ber) && Number(n1.auteur_id) === Number(P.lauren),
  'elle mène à la date, porte son auteur (auteur_id), sans date_id (une notification de l’administration ne la réécrit pas)');
ok((await recues('barbara')).length === 1 && (await recues('barbara'))[0].titre === titre1, 'l’administratrice qui a une fiche la reçoit');
ok((await recues('lauren')).length === 0, 'son auteur ne la reçoit pas');
ok((await recues('adrien')).length === 0 && (await recues('thomas')).length === 0 && (await recues('autre')).length === 0,
  'ni Adrien (retiré de la date), ni Thomas (qui ne part pas), ni une autre troupe');
ok((await toutes()).length === 2, 'une seule notification par personne : le déclencheur « Horaires modifiés » s’est tu');
const appels1 = (await db.query(`select body from net.appels`)).rows;
const idRempl = (await db.query(`select id from public.crescite_notifications where personne_id = $1`, [P.rempl])).rows[0].id;
ok(appels1.length === 1 && Number(appels1[0].body.notification_id) === Number(idRempl), 'elle part vers le téléphone abonné du remplaçant (Lauren, abonnée, n’est pas destinataire)');
const l1 = await ligneRep(r1), j1 = await journal('crescite_representations', r1);
ok(l1.heure === '20:30:00' && l1.modifie_par === U.lauren, 'la séance passe à 20 h 30, modifiée par Lauren');
ok(j1 && j1.qui === U.lauren && j1.operation === 'UPDATE' && j1.avant.heure === '20:00:00' && j1.apres.heure === '20:30:00',
  'le journal garde l’avant, l’après et l’auteur (son compte)');
const m1 = (await as('authenticated', U.lauren, `select quoi, date_id, personne_id, titre, prevenus from public.crescite_modifications`)).rows;
ok(m1.length === 1 && m1[0].quoi === 'date' && Number(m1[0].date_id) === Number(d) && Number(m1[0].personne_id) === Number(P.lauren) && m1[0].titre === titre1 && m1[0].prevenus === 2,
  'la modification est gardée (crescite_modifications) : Lauren la relit');
ok(await n(`select count(*)::int n from public.crescite_modifications`) === 1
   && (await as('authenticated', U.rempl, `select count(*)::int n from public.crescite_modifications`)).rows[0].n === 0
   && (await as('authenticated', U.barbara, `select count(*)::int n from public.crescite_modifications`)).rows[0].n === 1,
  'les autres ne relisent pas celles de Lauren ; l’administration toutes');

// la fin et la précision d'une séance, par le remplaçant
await vider();
const res2 = await modifierDate('rempl', d, { representations: [{ id: r2, fin: '15:00', note: '  complet,   liste d’attente ' }] });
const n2 = (await recues('lauren'))[0];
ok(res2.prevenus === 2 && n2 && n2.titre === `Rem Plaçant a changé l’horaire et les précisions du ${jourTexte(J20)} à Eu`
   && n2.texte === nbsp('14_h → 14_h – 15_h ; séance de 14_h : «_complet, liste d’attente_» · Bérénice'),
  `le remplaçant change la fin et la précision d’une séance : « ${n2?.titre} » — « ${n2?.texte} »`);
ok((await ligneRep(r2)).note === 'complet, liste d’attente' && (await ligneRep(r2)).fin === '15:00:00', 'la précision est rangée, espaces resserrés');

// une date sur deux jours, au Havre
await vider();
const res3 = await modifierDate('lauren', dh, { representations: [{ id: r3, heure: '21:00' }] });
const n3 = (await recues('adrien'))[0];
ok(res3.prevenus === 2 && n3 && n3.titre === `Lauren Toulin a changé l’horaire du ${jourTexte(J30)} au Havre`
   && n3.texte === nbsp(`${jourCourt(J30).replace(/ /g, '_')} : 20_h → 21_h · Bérénice`),
  `sur une date de deux jours, le jour de la séance ; « au Havre » : « ${n3?.titre} » — « ${n3?.texte} »`);
ok((await recues('rempl')).length === 0 && (await recues('barbara')).length === 1, 'l’équipe de cette date-là (Adrien y part) et l’administratrice ; pas le remplaçant d’Eu');

// ---------------------------------------------------------------------------------------------- 2. les précisions de la date
await vider();
const precisions = [{ texte: '14h et 20h30 : représentations à Eu', lien: LIEN }, { texte: 'Garer le camion derrière le théâtre', lien: null }, { texte: 'Loges au premier étage' }];
const res4 = await modifierDate('lauren', d, { precisions });
const det = (await db.query(`select details from public.crescite_dates where id = $1`, [d])).rows[0].details;
const n4 = (await recues('rempl'))[0];
ok(res4.prevenus === 2 && n4 && n4.type === 'date' && n4.titre === `Lauren Toulin a changé les précisions du ${jourTexte(J20)} à Eu`
   && n4.texte === 'précisions de la date mises à jour · Bérénice', `les précisions de la date : « ${n4?.titre} » — « ${n4?.texte} »`);
ok(det.length === 3 && det[0].lien === LIEN && det[0].texte === '14h et 20h30 : représentations à Eu' && det[2].texte === 'Loges au premier étage' && det[2].lien === null,
  'le texte change, le lien de la précision reste ; une précision s’ajoute');
const jd = await journal('crescite_dates', d);
ok(jd && jd.qui === U.lauren && jd.operation === 'UPDATE' && jd.avant.details.length === 2 && jd.apres.details.length === 3, 'le journal garde les précisions d’avant et l’auteur');
const refusPrec = {
  'retirer la précision qui porte un lien': [precisions[1], precisions[2]],
  'changer son lien': [{ ...precisions[0], lien: 'https://pirate.exemple/eu' }, precisions[1]],
  'ajouter un lien': [precisions[0], { ...precisions[1], lien: 'https://exemple.fr/camion' }],
  'un autre champ (gras)': [{ ...precisions[0], gras: true }],
};
for (const [quoi, ps] of Object.entries(refusPrec)) {
  const r = await essaiDate('lauren', d, { precisions: ps });
  ok(/^42501/.test(r), `${quoi} : refusé (${r})`);
}
const refusTexte = {
  'vider le texte d’une précision qui porte un lien': [{ texte: ' ', lien: LIEN }],
  'une balise': [precisions[0], { texte: 'Loges <b>au premier</b>' }],
  'un lien dans le texte': [precisions[0], { texte: 'Plan : https://exemple.fr/plan' }],
  '201 caractères': [precisions[0], { texte: 'x'.repeat(201) }],
  'neuf précisions': [precisions[0], ...Array.from({ length: 8 }, (_, i) => ({ texte: `Précision ${i}` }))],
};
for (const [quoi, ps] of Object.entries(refusTexte)) {
  const r = await essaiDate('lauren', d, { precisions: ps });
  ok(/^22023/.test(r), `${quoi} : refusé (${r})`);
}
ok((await db.query(`select details from public.crescite_dates where id = $1`, [d])).rows[0].details.length === 3, 'rien de refusé n’est écrit');

// ---------------------------------------------------------------------------------------------- 3. ce qui reste à l'administration
const champsDate = { statut: 'annulee', visible: false, nature: 'repetitions', lien: 'https://exemple.fr/billets', intitule: 'Ailleurs', details: [],
  lieu_id: havre, debut: jour(40), public: 'scolaire', nb_representations: 3 };
for (const [k, v] of Object.entries(champsDate)) {
  const r = await essaiDate('lauren', d, { [k]: v });
  ok(new RegExp(`^42501 Ce champ reste à l’administration : ${k}$`).test(r), `la date : ${k} reste à l’administration`);
}
for (const [k, v] of Object.entries({ jour: jour(21), annulee: true, public: 'scolaire', lien: 'https://exemple.fr/billet', date_id: dc })) {
  const r = await essaiDate('lauren', d, { representations: [{ id: r1, [k]: v }] });
  ok(new RegExp(`^42501 Ce champ reste à l’administration : ${k}$`).test(r), `une séance : ${k} reste à l’administration`);
}
const x0 = (await db.query(`select statut, visible, lieu_id from public.crescite_dates where id = $1`, [d])).rows[0], l0 = await ligneRep(r1);
ok(x0.statut === 'confirmee' && x0.visible && Number(x0.lieu_id) === Number(eu) && l0.heure === '20:30:00', 'rien de cela n’a changé');

// ---------------------------------------------------------------------------------------------- 4. ce que la base vérifie
const refus = {
  'une heure impossible (25:00)': { representations: [{ id: r1, heure: '25:00' }] },
  'une heure en lettres': { representations: [{ id: r1, heure: 'vingt heures' }] },
  'une heure qui n’est pas un texte': { representations: [{ id: r1, heure: 20 }] },
  'une fin sans début': { representations: [{ id: r1, heure: null, fin: '22:00' }] },
  'une fin à l’heure du début': { representations: [{ id: r1, fin: '20:30' }] },
  'une précision de 121 caractères': { representations: [{ id: r1, note: 'x'.repeat(121) }] },
  'une précision avec une balise': { representations: [{ id: r1, note: '<img src=x onerror=alert(1)>' }] },
  'une séance d’une autre date': { representations: [{ id: r7, heure: '19:00' }] },
  'une séance annulée': { representations: [{ id: r8, heure: '18:00' }] },
  'une séance en double': { representations: [{ id: r1, heure: '19:00' }, { id: r1, heure: '19:30' }] },
};
for (const [quoi, ch] of Object.entries(refus)) {
  const r = await essaiDate('lauren', d, ch);
  ok(/^22023/.test(r), `${quoi} : refusé (${r})`);
}
ok(/^22023 Cette date est passée/.test(await essaiDate('lauren', passee, { representations: [{ id: r5, heure: '21:00' }] })), 'une date passée ne se modifie pas');
ok(/^22023 Cette date est annulée/.test(await essaiDate('barbara', annulee, { precisions: [] })), 'ni une date annulée (même par l’administration)');
ok((await ligneRep(r1)).heure === '20:30:00', 'rien de refusé n’est écrit');
ok(/^PT409/.test(await essaiDate('lauren', d, { representations: [{ id: r1, heure: '21:00', avant: { heure: '20:00' } }] })),
  'une séance changée depuis que la page l’a lue n’est pas écrasée (PT409)');

// ---------------------------------------------------------------------------------------------- 5. qui peut modifier une date
for (const [qui, pourquoi] of [['adrien', 'Adrien, retiré de la date'], ['thomas', 'Thomas, qui ne part pas'], ['autre', 'une autre troupe'], ['dehors', 'un compte du projet hors de l’équipe']]) {
  ok(/^42501/.test(await essaiDate(qui, d, { representations: [{ id: r1, heure: '19:00' }] })), `${pourquoi} : refusé`);
}
ok(/permission denied/.test(await code('anon', '', `select public.crescite_modifier_date($1, '{}'::jsonb)`, [d])), 'le public n’a pas le droit d’appeler la fonction');
ok(/^42501/.test(await essaiDate('rempl', dh, { representations: [{ id: r3, heure: '19:00' }] })), 'le remplaçant d’Eu ne touche pas à la date du Havre');
await vider();
const res5 = await modifierDate('admin2', d, { representations: [{ id: r1, note: 'audiodécrite' }] });
const n5 = (await recues('lauren'))[0];
ok(res5.prevenus === 3 && n5 && n5.titre.startsWith('L’administration a changé les précisions') && n5.auteur_id === null,
  `un administrateur sans fiche : « ${n5?.titre} », Lauren, le remplaçant et l’administratrice prévenus`);
const sansRien = await modifierDate('lauren', d, { representations: [{ id: r1, heure: '20:30', note: 'audiodécrite' }] });
ok(sansRien.prevenus === 0 && sansRien.modifications === 0 && (await toutes()).length === 3, 'rien de changé : rien ne part, rien n’est compté');

// ---------------------------------------------------------------------------------------------- 6. l'administration, comme avant
await vider();
await as('authenticated', U.barbara, `update public.crescite_representations set heure = '21:00' where id = $1`, [r1]);
const n6 = await recues('lauren');
ok(n6.length === 1 && n6[0].titre === 'Horaires modifiés' && n6[0].auteur_id === null && Number(n6[0].date_id) === Number(d),
  'l’administration change une heure : « Horaires modifiés », comme avant (le geste de l’équipe ne laisse rien derrière lui)');
await vider();
await as('authenticated', U.barbara, `insert into public.crescite_documents (spectacle_id, titre, url, pour) values ($1, 'Mise en scène', 'https://exemple.fr/ms', 'equipe')`, [ber]);
ok((await recues('lauren')).map(x => x.titre).join() === 'Nouveau document', 'un document ajouté par l’administration : « Nouveau document », comme avant');

// ---------------------------------------------------------------------------------------------- 7. les fichiers : déposer
await vider();
const preparer = (qui, s, nom) => as('authenticated', U[qui], `select public.crescite_preparer_fichier($1, $2) c`, [s, nom]).then(x => x.rows[0].c);
const deposer = (qui, nom, role = 'authenticated') => code(role, U[qui] || '', `insert into storage.objects (bucket_id, name) values ('crescite-equipe', $1)`, [nom]);
const voit = async (qui, nom) => (await as('authenticated', U[qui], `select count(*)::int n from storage.objects where bucket_id = 'crescite-equipe' and name = $1`, [nom])).rows[0].n === 1;
const effacer = async (qui, nom) => (await as('authenticated', U[qui], `delete from storage.objects where bucket_id = 'crescite-equipe' and name = $1 returning name`, [nom])).rows.length;
const c1 = await preparer('lauren', ber, 'Le Texte (version 3) — Acte I.PDF');
ok(/^berenice\/[0-9a-f]{12,}-le-texte-version-3-acte-i\.pdf$/.test(c1), `le chemin préparé : ${c1}`);
ok(/^42501/.test(await code('authenticated', U.lauren, `select public.crescite_preparer_fichier($1, 'x.pdf')`, [cleo])), 'pas pour le spectacle d’une autre troupe');
ok(/^22023/.test(await code('authenticated', U.lauren, `select public.crescite_preparer_fichier($1, 'outil.exe')`, [ber]))
   && /^22023/.test(await code('authenticated', U.lauren, `select public.crescite_preparer_fichier($1, 'sans-extension')`, [ber])), 'ni un type que le stockage refuse');
ok(/^42501/.test(await code('authenticated', U.dehors, `select public.crescite_preparer_fichier($1, 'x.pdf')`, [ber]))
   && /permission denied/.test(await code('anon', '', `select public.crescite_preparer_fichier($1, 'x.pdf')`, [ber])), 'ni pour un compte hors de l’équipe, ni pour le public');
ok(await deposer('lauren', c1) === 'ok', 'Lauren dépose son fichier au chemin préparé');
const refusDepot = { 'ailleurs dans son spectacle': ['lauren', 'berenice/autre.pdf'], 'dans les portraits': ['lauren', 'portraits/x.webp'],
  'dans un autre spectacle': ['lauren', 'cleophene/x.pdf'], 'par-dessus un fichier existant': ['lauren', 'berenice/contrat.pdf'],
  'au chemin préparé par une autre': ['autre', c1.replace('.pdf', '-bis.pdf')] };
for (const [quoi, [qui, nom]] of Object.entries(refusDepot)) {
  const r = await deposer(qui, nom);
  ok(r !== 'ok', `déposer ${quoi} : refusé (${r.split(' ').slice(0, 6).join(' ')}…)`);
}
const cAutre = await preparer('lauren', ber, 'plan.png');
ok((await deposer('adrien', cAutre)) !== 'ok' && (await deposer(null, cAutre, 'anon')) !== 'ok', 'le chemin préparé par Lauren n’est qu’à elle (ni Adrien, ni le public)');
ok(await voit('lauren', c1) && !(await voit('adrien', c1)), 'avant d’être un document, son dépôt n’est visible que d’elle');

// inscrire le document
const ajouter = (qui, s, docu) => as('authenticated', U[qui], `select public.crescite_ajouter_document($1, $2::jsonb) r`, [s, JSON.stringify(docu)]).then(x => x.rows[0].r);
const essaiAjout = (qui, s, docu) => code('authenticated', U[qui], `select public.crescite_ajouter_document($1, $2::jsonb)`, [s, JSON.stringify(docu)]);
const a1 = await ajouter('lauren', ber, { titre: 'Le texte, version 3', type: 'texte', fichier: c1 });
const nd = (await recues('adrien'))[0];
ok(a1.prevenus === 4 && nd && nd.type === 'document' && nd.titre === 'Lauren Toulin a ajouté un document à Bérénice' && nd.texte === 'Le texte, version 3'
   && nd.lien === '#/spectacles/berenice' && Number(nd.auteur_id) === Number(P.lauren),
  `le document est inscrit ; l’équipe du spectacle et l’administratrice prévenues (${a1.prevenus}) : « ${nd?.titre} »`);
ok((await recues('thomas')).length === 1 && (await recues('rempl')).length === 1 && (await recues('barbara')).length === 1 && (await recues('lauren')).length === 0
   && (await recues('autre')).length === 0, 'Adrien, Thomas (la distribution), le remplaçant (l’équipe d’une date), l’administratrice ; ni Lauren, ni l’autre troupe');
ok(!(await toutes()).some(x => x.titre === 'Nouveau document'), 'une seule notification : le déclencheur « Nouveau document » s’est tu');
const ligneDoc = (await db.query(`select pour, spectacle_id, ordre, modifie_par from public.crescite_documents where id = $1`, [a1.id])).rows[0];
ok(ligneDoc.pour === 'equipe' && Number(ligneDoc.spectacle_id) === Number(ber) && ligneDoc.ordre > 100, 'un document de l’équipe, à la fin de la liste');
const ja = await journal('crescite_documents', a1.id);
ok(ja && ja.qui === U.lauren && ja.operation === 'INSERT', 'le journal garde l’ajout et son auteur');
ok(await voit('adrien', c1) && await voit('thomas', c1) && !(await voit('autre', c1)), 'l’équipe du spectacle lit le fichier ; pas l’autre troupe');
ok(/^22023/.test(await essaiAjout('lauren', ber, { titre: 'Encore', fichier: c1 })), 'un fichier déjà inscrit ne s’inscrit pas deux fois');
ok(/^22023/.test(await essaiAjout('lauren', ber, { titre: 'Contrat', fichier: 'berenice/contrat.pdf' })),
  'le fichier d’un document de l’administration ne devient pas un document de l’équipe (il resterait illisible pour elle)');
ok(/^42501/.test(await essaiAjout('lauren', cleo, { titre: 'X', fichier: c1 })), 'pas dans le spectacle d’une autre troupe');
for (const k of ['pour', 'url', 'spectacle_id', 'ordre']) {
  ok(new RegExp(`^42501 Ce champ reste à l’administration : ${k}$`).test(await essaiAjout('lauren', ber, { titre: 'X', fichier: cAutre, [k]: 'pros' })), `ajouter : ${k} reste à l’administration`);
}
ok(/^22023/.test(await essaiAjout('lauren', ber, { titre: ' ', fichier: cAutre })) && /^22023/.test(await essaiAjout('lauren', ber, { titre: 'x'.repeat(121), fichier: cAutre }))
   && /^22023/.test(await essaiAjout('lauren', ber, { titre: 'Plan', type: 'secret', fichier: cAutre })), 'un titre vide ou trop long, un genre inconnu : refusés');
const cThomas = await preparer('thomas', ber, 'note de mise en scène.docx');
ok(await deposer('thomas', cThomas) === 'ok' && (await ajouter('thomas', ber, { titre: 'Note de mise en scène', type: 'dossier', fichier: cThomas })).prevenus === 4,
  'Thomas (la distribution, sans partir) ajoute aussi un fichier au spectacle');

// ---------------------------------------------------------------------------------------------- 8. renommer, remplacer
await vider();
const modifierDoc = (qui, x, ch) => as('authenticated', U[qui], `select public.crescite_modifier_document($1, $2::jsonb) r`, [x, JSON.stringify(ch)]).then(y => y.rows[0].r);
const essaiDoc = (qui, x, ch) => code('authenticated', U[qui], `select public.crescite_modifier_document($1, $2::jsonb)`, [x, JSON.stringify(ch)]);
const rn = await modifierDoc('lauren', D.texte, { titre: 'Le texte, version de travail' });
const nr = (await recues('adrien'))[0];
ok(rn.prevenus === 4 && nr && nr.titre === 'Lauren Toulin a renommé un document de Bérénice' && nr.texte === nbsp('«_Le texte_» → «_Le texte, version de travail_»'),
  `renommer : « ${nr?.titre} » — « ${nr?.texte} »`);
const jr = await journal('crescite_documents', D.texte);
ok(jr && jr.qui === U.lauren && jr.avant.titre === 'Le texte' && jr.apres.titre === 'Le texte, version de travail', 'le journal garde l’ancien titre et l’auteur');
await vider();
await modifierDoc('lauren', D.texte, { type: 'plan' });
ok((await recues('adrien'))[0]?.texte === 'Le texte, version de travail : rangé avec les plans', 'changer son genre le dit');
await modifierDoc('lauren', D.texte, { type: 'texte' });
await vider();
const c2 = await preparer('lauren', ber, 'texte-v4.pdf');
ok(await deposer('lauren', c2) === 'ok', 'une nouvelle version déposée au chemin préparé');
const rp = await modifierDoc('lauren', D.texte, { fichier: c2 });
const np = (await recues('adrien'))[0];
ok(rp.ancien_fichier === 'berenice/texte.pdf' && np && np.titre === 'Lauren Toulin a remplacé un document de Bérénice' && np.texte === 'Le texte, version de travail, nouvelle version',
  `remplacer : « ${np?.titre} » — « ${np?.texte} » ; l’ancien fichier est rendu`);
ok((await db.query(`select fichier from public.crescite_documents where id = $1`, [D.texte])).rows[0].fichier === c2, 'le document tient le nouveau fichier');
ok(await effacer('adrien', 'berenice/texte.pdf') === 0, 'Adrien n’efface pas l’ancien fichier (ce n’est pas son geste)');
ok(await voit('lauren', 'berenice/texte.pdf') && await effacer('lauren', 'berenice/texte.pdf') === 1, 'Lauren, qui l’a remplacé, le relit et l’efface');
const intouchables = { 'le fichier d’un document': c2, 'celui d’un document de l’administration': 'berenice/contrat.pdf', 'un fichier orphelin d’un autre': 'berenice/orphelin.pdf',
  'un portrait': 'portraits/lauren.webp', 'un fichier d’une autre troupe': 'cleophene/texte.pdf', 'un fichier de toute la compagnie': 'compagnie/charte.pdf' };
for (const [quoi, nom] of Object.entries(intouchables)) ok(await effacer('lauren', nom) === 0, `elle n’efface pas ${quoi}`);
ok(!(await voit('lauren', 'berenice/contrat.pdf')) && !(await voit('lauren', 'berenice/orphelin.pdf')) && !(await voit('lauren', 'portraits/lauren.webp')),
  'ni ne lit le contrat, un orphelin, un portrait');
// une inscription interrompue : son propre dépôt s'efface
const c3 = await preparer('lauren', ber, 'brouillon.txt');
await deposer('lauren', c3);
ok(await effacer('adrien', c3) === 0 && await effacer('lauren', c3) === 1, 'un dépôt resté sans document : celle qui l’a déposé l’efface, pas les autres');

// ---------------------------------------------------------------------------------------------- 9. ce qui reste à l'administration
const interdits = { 'un document public': D.pros, 'un document de l’administration': D.admin, 'un document de toute la compagnie': D.cie, 'le document d’une autre troupe': D.cleo };
for (const [quoi, x] of Object.entries(interdits)) {
  ok(/^42501/.test(await essaiDoc('lauren', x, { titre: 'Pirate' })) && /^42501/.test(await code('authenticated', U.lauren, `select public.crescite_supprimer_document($1)`, [x])),
    `${quoi} ne se renomme ni ne se supprime`);
}
for (const k of ['pour', 'url', 'spectacle_id', 'ordre']) {
  ok(new RegExp(`^42501 Ce champ reste à l’administration : ${k}$`).test(await essaiDoc('lauren', D.texte, { [k]: k === 'spectacle_id' ? cleo : 'pros' })), `modifier : ${k} reste à l’administration`);
}
ok(/^22023/.test(await essaiDoc('lauren', D.texte, { fichier: 'berenice/contrat.pdf' })) && /^22023/.test(await essaiDoc('lauren', D.texte, { fichier: cAutre.replace('plan', 'jamais') })),
  'un fichier qui n’a pas été préparé par elle ne devient pas la nouvelle version');
ok(/^42501/.test(await essaiDoc('dehors', D.texte, { titre: 'X' })) && /^42501/.test(await essaiDoc('autre', D.texte, { titre: 'X' }))
   && /permission denied/.test(await code('anon', '', `select public.crescite_modifier_document($1, '{}'::jsonb)`, [D.texte])),
  'un compte hors de l’équipe, une autre troupe, le public : refusés');
ok((await db.query(`select titre from public.crescite_documents where id = $1`, [D.pros])).rows[0].titre === 'Dossier artistique', 'rien de cela n’a changé');

// ---------------------------------------------------------------------------------------------- 10. supprimer
await vider();
const supprimer = (qui, x) => as('authenticated', U[qui], `select public.crescite_supprimer_document($1) r`, [x]).then(y => y.rows[0].r);
const s1 = await supprimer('lauren', D.lien);
const ns = (await recues('thomas'))[0];
ok(s1.ancien_fichier === null && ns && ns.titre === 'Lauren Toulin a supprimé un document de Bérénice' && ns.texte === 'Le texte sur Wikisource',
  `supprimer un lien : « ${ns?.titre} » — « ${ns?.texte} »`);
const js = await journal('crescite_documents', D.lien);
ok(js && js.qui === U.lauren && js.operation === 'DELETE' && js.avant.titre === 'Le texte sur Wikisource', 'le journal garde le document supprimé et son auteur (l’administration peut le rétablir)');
const s2 = await supprimer('lauren', a1.id);
ok(s2.ancien_fichier === c1 && await effacer('lauren', c1) === 1, 'supprimer un fichier : celle qui l’a supprimé l’efface du stockage');

// ---------------------------------------------------------------------------------------------- 11. les limites
const compter = async (qui) => (await db.query(`select count(*)::int n from public.crescite_modifications where user_id = $1 and cree_le > now() - interval '1 hour'`, [U[qui]])).rows[0].n;
const dejaLauren = await compter('lauren');
await db.query(`insert into public.crescite_modifications (quoi, user_id, titre) select 'date', $1, 'essai' from generate_series(1, $2::int)`, [U.lauren, 20 - dejaLauren]);
const limite = await essaiDate('lauren', d, { representations: [{ id: r1, heure: '19:45' }] });
ok(/^PT429 Vingt modifications en une heure/.test(limite), `la vingt et unième modification de l’heure est refusée (${limite})`);
ok(/^PT429/.test(await essaiDoc('lauren', D.texte, { titre: 'Encore un titre' })), 'les fichiers comptent aussi');
ok((await ligneRep(r1)).heure === '21:00:00', 'et rien n’est écrit');
ok((await modifierDate('rempl', d, { representations: [{ id: r1, heure: '19:45' }] })).prevenus === 2, 'la limite est celle de chaque compte');
await db.query(`update public.crescite_modifications set cree_le = cree_le - interval '61 minutes' where user_id = $1`, [U.lauren]);
ok((await modifierDate('lauren', d, { representations: [{ id: r1, heure: '20:00' }] })).modifications === 1, 'une heure plus tard, Lauren modifie de nouveau');
const dejaDepots = (await db.query(`select count(*)::int n from public.crescite_fichiers_equipe where user_id = $1 and geste = 'depot'`, [U.lauren])).rows[0].n;
for (let i = dejaDepots; i < 20; i++) await preparer('lauren', ber, `plan-${i}.png`);
ok(/^PT429 Vingt fichiers en une heure/.test(await code('authenticated', U.lauren, `select public.crescite_preparer_fichier($1, 'un-de-trop.pdf')`, [ber])),
  'vingt fichiers préparés par heure et par compte, au plus');
// un remplaçant retiré de sa date ne dépose plus ce qu'il avait préparé
const cR = await preparer('rempl', ber, 'plan-plateau.pdf');
await db.query(`update public.crescite_equipes set present = false where date_id = $1 and personne_id = $2`, [d, P.rempl]);
ok(await deposer('rempl', cR) !== 'ok', 'retiré de l’équipe, le remplaçant ne dépose plus ce qu’il avait préparé');
await db.query(`update public.crescite_equipes set present = true where date_id = $1 and personne_id = $2`, [d, P.rempl]);

// ---------------------------------------------------------------------------------------------- 12. ce que personne n'appelle
ok(/permission denied/.test(await code('authenticated', U.lauren, `select public.crescite_prevenir_modification(array[$1::bigint], 'message', 'x', null, null, null, null)`, [P.adrien]))
   && /permission denied/.test(await code('authenticated', U.lauren, `select public.crescite_a_prevenir($1, null, null)`, [d]))
   && /permission denied/.test(await code('authenticated', U.lauren, `select public.crescite_liberer_fichier('berenice/contrat.pdf', $1)`, [ber])),
  'les fonctions internes ne s’appellent pas par l’API (écrire une notification, libérer un fichier)');
let dehorsGeste = null;
try { await db.query(`select public.crescite_prevenir_modification(array[$1::bigint], 'message', 'x', null, null, null, null)`, [P.adrien]); } catch (e) { dehorsGeste = e.code; }
ok(dehorsGeste === '42501', 'et hors d’un geste de l’équipe, la notification refuse de partir');
ok(/permission denied/.test(await code('authenticated', U.lauren, `insert into public.crescite_modifications (quoi, titre) values ('date', 'x')`))
   && /permission denied/.test(await code('authenticated', U.barbara, `delete from public.crescite_modifications`))
   && /permission denied/.test(await code('authenticated', U.lauren, `select * from public.crescite_fichiers_equipe`))
   && /permission denied/.test(await code('anon', '', `select * from public.crescite_modifications`)),
  'personne n’écrit ni n’efface le registre à la main ; les fichiers en chemin ne se lisent pas ; le public rien');

// ---------------------------------------------------------------------------------------------- 13. les anciens scripts relancés
const DEFS = ['crescite_notif_horaires()', 'crescite_notif_documents()'];
const definitions = async () => Promise.all(DEFS.map(async f => (await db.query(`select pg_get_functiondef('public.${f}'::regprocedure) d`)).rows[0].d));
const apres14 = await definitions();
const relances = [];
for (const i of [0, 1, 2, 12]) { try { await db.exec(S[i]); } catch (e) { relances.push(`script ${i + 1} : ${e.message}`); await db.exec('rollback').catch(() => {}); } }
ok(!relances.length, `les scripts 1, 2, 3 et 13 se relancent après le quatorzième${relances.length ? ` (${relances.join(' ; ')})` : ''}`);
ok(JSON.stringify(await definitions()) === JSON.stringify(apres14) && apres14.every(x => x.includes('crescite.geste')),
  'le troisième script porte les mêmes déclencheurs : relancé, il ne fait pas revenir la double notification');
ok(await n(`select count(*)::int n from pg_policies where schemaname = 'storage' and policyname like 'crescite\\_equipe\\_membre\\_%'`) === 3,
  'relancer le deuxième script ne retire pas les règles du stockage de l’équipe');
await vider();
await db.query(`update public.crescite_modifications set cree_le = cree_le - interval '2 hours'`);
await modifierDate('lauren', d, { representations: [{ id: r1, heure: '20:15' }] });
ok((await toutes()).length === 2 && (await recues('rempl'))[0]?.titre === titre1, 'relancés, une modification de l’équipe ne part toujours qu’une fois, avec son auteur');
const fin2 = await db.exec(MODIFIE);
ok(fin2.at(-1).rows.slice(0, 3).every(r => /^prêt(e?s)? :/.test(r['état'])) && /^un /.test(fin2.at(-1).rows[3]['état']),
  `relancé encore, le quatorzième le dit : ${fin2.at(-1).rows.map(r => r['état']).join(' | ')}`);
await db.close();
