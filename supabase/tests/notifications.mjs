// Les trois migrations Crescite dans un Postgres local (PGlite), puis les notifications : qui est prévenu, quand, une
// seule fois ; ce que chacun lit et écrit ; l'appel de la fonction d'envoi ; les répétitions ; les documents publics.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const lire = f => readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8');
const [base, equipe, notif] = ['20261020_crescite_base.sql', '20261021_crescite_equipe.sql', '20261022_crescite_notifications.sql'].map(lire);
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
  -- pg_net de Supabase : un substitut qui note les appels
  create schema net; create table net.appels (url text, body jsonb, headers jsonb);
  create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
    returns bigint language sql as $$ insert into net.appels values (url, body, headers); select 1::bigint $$;
`);
try { await db.exec('create publication supabase_realtime'); } catch (e) { /* pas de publication ici */ }
for (const s of [base, equipe, notif]) await db.exec(s);
await db.exec(notif); await db.exec(base); await db.exec(equipe);
ok(true, 'les trois migrations passent, relancées dans le désordre sans erreur');
const n = async (q, p) => (await db.query(q, p)).rows[0].n;
ok(await n(`select count(*)::int n from pg_policies where policyname like 'notif\\_%' or policyname like 'public\\_%'`) === 9, 'relancer les deux premières ne retire pas les règles des notifications');

const U = { admin: '11111111-1111-1111-1111-111111111111', lauren: '22222222-2222-2222-2222-222222222222', adrien: '33333333-3333-3333-3333-333333333333' };
for (const k in U) await db.exec(`insert into auth.users values ('${U[k]}', '${k}@x')`);
await db.exec(`insert into public.crescite_admins (user_id) values ('${U.admin}')`);
await db.exec(`
  insert into public.crescite_spectacles (slug, titre) values ('berenice', 'Bérénice');
  insert into public.crescite_lieux (nom, commune, departement) values ('L’Eclat', 'Pont-Audemer', '27'), ('Le Rive Gauche', 'Saint-Étienne-du-Rouvray', '76');
  insert into public.crescite_personnes (slug, nom) values ('lauren', 'Toulin'), ('adrien', 'Vada'), ('sans-compte', 'X'), ('rempl', 'R');
`);
const id = async (t, slug) => (await db.query(`select id from public.${t} where slug = $1`, [slug])).rows[0].id;
const P = { lauren: await id('crescite_personnes', 'lauren'), adrien: await id('crescite_personnes', 'adrien'), sans: await id('crescite_personnes', 'sans-compte'), rempl: await id('crescite_personnes', 'rempl') };
const sp = await id('crescite_spectacles', 'berenice');
const [l1, l2] = (await db.query(`select id from public.crescite_lieux order by id`)).rows.map(r => r.id);
await db.exec(`
  insert into public.crescite_personnes_privees (personne_id, email, user_id) values
    (${P.lauren}, 'lauren@x', '${U.lauren}'), (${P.adrien}, 'adrien@x', '${U.adrien}'), (${P.sans}, null, null), (${P.rempl}, 'rempl@x', null);
  insert into public.crescite_distributions (spectacle_id, personne_id, categorie) values (${sp}, ${P.lauren}, 'jeu'), (${sp}, ${P.adrien}, 'jeu'), (${sp}, ${P.sans}, 'jeu');
`);
const as = async (role, sub, q, params) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub || ''}', false), set_config('request.jwt.claims', '', false);`);
  try { return await db.query(q, params); } finally { await db.exec('reset role'); }
};
const essai = async (role, sub, q, params) => { try { await as(role, sub, q, params); return 'ok'; } catch (e) { return e.message; } };
const notifs = async p => (await db.query(`select type, titre, texte, lien, date_id from public.crescite_notifications where personne_id = $1 order by id`, [p])).rows;
const enreg = async o => (await as('authenticated', U.admin, `select public.crescite_enregistrer_date($1::jsonb) as id`, [JSON.stringify(o)])).rows[0].id;
const demain = new Date(Date.now() + 86400e3 * 30).toISOString().slice(0, 10);

// une date nouvelle, avec deux représentations : une seule notification « Nouvelle date », pas d'« horaires » en plus
const d1 = await enreg({ spectacle_id: sp, lieu_id: l1, debut: demain, representations: [{ jour: demain, heure: '14:00', public: 'scolaire' }, { jour: demain, heure: '20:00' }] });
let L = await notifs(P.lauren);
ok(L.length === 1 && L[0].type === 'date' && L[0].titre === 'Nouvelle date' && L[0].lien === `#/date/${d1}`, `une date nouvelle : « ${L[0]?.titre} » — ${L[0]?.texte}`);
ok((await notifs(P.adrien)).length === 1 && (await notifs(P.sans)).length === 0, 'les personnes avec un compte sont prévenues, pas les autres');
// on réenregistre sans rien changer : rien
const reps = (await db.query(`select id, jour, heure, public from public.crescite_representations where date_id = $1 order by heure`, [d1])).rows;
const repsJson = reps.map(r => ({ id: r.id, jour: r.jour.toISOString().slice(0, 10), heure: r.heure.slice(0, 5), public: r.public }));
await db.exec(`update public.crescite_notifications set cree_le = now() - interval '1 hour'`);   // la date n'est plus « toute neuve »
await enreg({ id: d1, spectacle_id: sp, lieu_id: l1, debut: demain, representations: repsJson });
ok((await notifs(P.lauren)).length === 1, 'réenregistrer une date sans rien changer ne prévient personne');
// on change deux horaires d'un coup : une seule notification « Horaires modifiés »
await enreg({ id: d1, spectacle_id: sp, lieu_id: l1, debut: demain, representations: [{ ...repsJson[0], heure: '14:30' }, { ...repsJson[1], heure: '20:30' }] });
L = await notifs(P.lauren);
ok(L.length === 2 && L[1].type === 'horaires' && L[1].titre === 'Horaires modifiés', `deux horaires changés d'un coup : une seule notification (« ${L[1]?.titre} »)`);
// changement de lieu, puis annulation
await enreg({ id: d1, spectacle_id: sp, lieu_id: l2, debut: demain, representations: [{ ...repsJson[0], heure: '14:30' }, { ...repsJson[1], heure: '20:30' }] });
await enreg({ id: d1, spectacle_id: sp, lieu_id: l2, debut: demain, statut: 'annulee', representations: [{ ...repsJson[0], heure: '14:30' }, { ...repsJson[1], heure: '20:30' }] });
L = await notifs(P.lauren);
ok(L.map(x => x.titre).slice(2).join(' | ') === 'Date annulée', `changement de lieu puis annulation, coup sur coup : une seule notification, la dernière nouvelle (${L.map(x => x.titre).slice(2).join(' | ')})`);
// une date passée : personne n'est prévenu
const avant = (await notifs(P.lauren)).length;
await enreg({ spectacle_id: sp, lieu_id: l1, debut: '2019-03-01', representations: [{ jour: '2019-03-01', heure: '20:00' }] });
ok((await notifs(P.lauren)).length === avant, 'une date passée ne prévient personne');

// une répétition : jamais publique, horaires de fin, notification dédiée
const d2 = await enreg({ spectacle_id: sp, lieu_id: l1, debut: demain, nature: 'repetitions', representations: [{ jour: demain, heure: '10:00', fin: '18:00' }] });
const r2 = (await db.query(`select d.visible, d.nature, r.fin from public.crescite_dates d join public.crescite_representations r on r.date_id = d.id where d.id = $1`, [d2])).rows[0];
ok(!r2.visible && r2.nature === 'repetitions' && r2.fin === '18:00:00', 'une répétition est enregistrée avec son heure de fin, et jamais publiée');
ok((await as('anon', '', `select count(*)::int n from public.crescite_dates where id = $1`, [d2])).rows[0].n === 0, 'le public ne la voit pas');
L = await notifs(P.lauren);
ok(L.at(-1).titre === 'Nouvelle répétition', `on annonce « ${L.at(-1).titre} »`);
await db.exec(`update public.crescite_notifications set cree_le = now() - interval '1 hour'`);
const rr = (await db.query(`select id from public.crescite_representations where date_id = $1`, [d2])).rows[0].id;
await enreg({ id: d2, spectacle_id: sp, lieu_id: l1, debut: demain, nature: 'repetitions', representations: [{ id: rr, jour: demain, heure: '10:00', fin: '19:00' }] });
L = await notifs(P.lauren);
ok(L.at(-1).titre === 'Horaires de répétition modifiés', 'une heure de fin de répétition qui change : « Horaires de répétition modifiés »');
const tour = (await as('authenticated', U.lauren, `select public.crescite_ma_tournee() t`)).rows[0].t;
const rep = tour.find(x => x.id === Number(d2));
ok(rep && rep.nature === 'repetitions' && rep.representations[0].fin === '19:00:00', 'la tournée de la personne dit la nature et l’heure de fin');

// la feuille de route publiée, puis republiée
const d3 = await enreg({ spectacle_id: sp, lieu_id: l1, debut: demain, representations: [{ jour: demain, heure: '20:00' }] });
await as('authenticated', U.admin, `insert into public.crescite_feuilles (date_id, contenu, statut) values ($1, '{}', 'brouillon')`, [d3]);
let nb = (await notifs(P.lauren)).length;
await as('authenticated', U.admin, `update public.crescite_feuilles set statut = 'publiee' where date_id = $1`, [d3]);
L = await notifs(P.lauren);
ok(L.length === nb + 1 && L.at(-1).titre === 'Feuille de route publiée' && L.at(-1).lien === `#/feuille/${d3}`, 'une feuille publiée prévient l’équipe de la date');
await db.exec(`update public.crescite_notifications set lue_le = now()`);
await as('authenticated', U.admin, `update public.crescite_feuilles set contenu = '{"notes":"8h"}' where date_id = $1`, [d3]);
L = await notifs(P.lauren);
ok(L.at(-1).titre === 'Feuille de route mise à jour' && /version 2/.test(L.at(-1).texte), `republiée : « ${L.at(-1).titre} » (${L.at(-1).texte})`);

// l'équipe d'une date : Adrien retiré, un remplaçant ajouté (qui n'a pas de compte : pas prévenu)
nb = (await notifs(P.adrien)).length;
await as('authenticated', U.admin, `insert into public.crescite_equipes (date_id, personne_id, present) values ($1, $2, false), ($1, $3, true)`, [d3, P.adrien, P.rempl]);
L = await notifs(P.adrien);
ok(L.length === nb + 1 && L.at(-1).titre === 'Vous ne partez plus sur une date', 'retiré d’une date : prévenu');
ok((await notifs(P.rempl)).length === 0, 'le remplaçant sans compte n’est pas prévenu');
await as('authenticated', U.admin, `delete from public.crescite_equipes where date_id = $1 and personne_id = $2`, [d3, P.adrien]);
ok((await notifs(P.adrien)).at(-1).titre === 'Vous partez sur une date', 'remis sur la date : prévenu');

// un document pour l'équipe ; un document public ne prévient pas
nb = (await notifs(P.lauren)).length;
await as('authenticated', U.admin, `insert into public.crescite_documents (spectacle_id, type, titre, url, pour) values ($1, 'texte', 'Le texte, version 3', 'https://x', 'equipe'), ($1, 'dossier', 'Dossier artistique', 'https://y', 'pros')`, [sp]);
L = await notifs(P.lauren);
ok(L.length === nb + 1 && L.at(-1).type === 'document' && L.at(-1).texte.startsWith('Le texte, version 3'), 'un document de l’équipe prévient ; un document public non');
ok((await as('anon', '', `select titre from public.crescite_documents`)).rows.map(r => r.titre).join() === 'Dossier artistique', 'le public lit les documents publics, et eux seuls');

// un message de l'administration
ok((await essai('authenticated', U.lauren, `select public.crescite_prevenir_equipe($1, 'Coucou')`, [d3])) !== 'ok', 'seule l’administration envoie un message');
await as('authenticated', U.admin, `select public.crescite_prevenir_equipe($1, 'Rendez-vous avancé à 13h', 'Gare de Rouen, quai 3')`, [d3]);
ok((await notifs(P.lauren)).at(-1).titre === 'Rendez-vous avancé à 13h', 'le message de l’administration arrive à l’équipe de la date');

// ce que chacun lit et écrit
const Ln = (await as('authenticated', U.lauren, `select personne_id from public.crescite_notifications`)).rows;
ok(Ln.length > 0 && Ln.every(r => Number(r.personne_id) === Number(P.lauren)), 'Lauren ne lit que ses notifications');
ok((await as('authenticated', U.lauren, `update public.crescite_notifications set lue_le = now() returning id`)).rows.length === Ln.length, 'elle les marque comme lues');
ok((await essai('authenticated', U.lauren, `update public.crescite_notifications set titre = 'x'`)) !== 'ok', 'mais n’en change pas le texte');
ok((await essai('authenticated', U.lauren, `insert into public.crescite_notifications (personne_id, type, titre) values ($1, 'message', 'x')`, [P.adrien])) !== 'ok', 'ni n’en écrit à d’autres');
ok((await essai('anon', '', `select * from public.crescite_notifications`)) !== 'ok', 'le public ne lit pas les notifications');
ok((await essai('authenticated', U.lauren, `select * from public.crescite_secrets`)) !== 'ok' && (await essai('anon', '', `select * from public.crescite_secrets`)) !== 'ok', 'personne ne lit les secrets par l’API');

// les appareils abonnés, et l'appel de la fonction d'envoi
ok((await essai('authenticated', U.lauren, `insert into public.crescite_abonnements (personne_id, endpoint, p256dh, auth) values ($1, 'https://push/a', 'k', 'a')`, [P.adrien])) !== 'ok', 'on n’abonne pas l’appareil d’un autre');
await as('authenticated', U.lauren, `insert into public.crescite_abonnements (personne_id, endpoint, p256dh, auth) values ($1, 'https://push/l', 'k', 'a')`, [P.lauren]);
ok((await as('authenticated', U.adrien, `select count(*)::int n from public.crescite_abonnements`)).rows[0].n === 0, 'chacun ne voit que ses appareils');
await db.exec(`delete from net.appels`);
await as('authenticated', U.admin, `select public.crescite_prevenir_equipe($1, 'Test')`, [d3]);
const appels = (await db.query(`select url, body, headers from net.appels`)).rows;
const jeton = (await db.query(`select valeur from public.crescite_secrets where cle = 'jeton_push'`)).rows[0].valeur;
ok(appels.length === 1 && appels[0].url.endsWith('/functions/v1/crescite-push') && appels[0].headers['x-crescite-jeton'] === jeton && jeton.length === 64,
   `seule la personne abonnée déclenche l’envoi (${appels.length} appel), avec le jeton`);

// « Je souhaite programmer » : le contact diffusion, lisible par le public ; l'action culturelle de Cassandres masquée une
// seule fois (rouverte par l'administration, elle le reste quand on relance le script)
const prog = (await as('anon', '', `select valeur from public.crescite_textes where cle = 'programmation'`)).rows[0];
ok(prog && prog.valeur.contact.nom === 'Barbara Daussy' && prog.valeur.contact.telephone === null, 'le contact diffusion est en place, lisible par le public, sans téléphone');
await db.exec(`update public.crescite_textes set valeur = jsonb_set(valeur, '{contact,telephone}', '"02 00 00 00 00"') where cle = 'programmation'`);
await db.exec(`insert into public.crescite_spectacles (slug, titre, action_culturelle) values ('cassandres', 'Cassandres', '{"type": "Lieux", "textes": [{"texte": "t"}]}')`);
await db.exec(notif);
const ac = async () => (await db.query(`select action_culturelle a from public.crescite_spectacles where slug = 'cassandres'`)).rows[0].a;
ok((await ac()).masquee === true && (await ac()).type === 'Lieux', 'l’action culturelle de Cassandres est masquée, pas effacée');
ok((await db.query(`select valeur from public.crescite_textes where cle = 'programmation'`)).rows[0].valeur.contact.telephone === '02 00 00 00 00', 'relancer le script n’écrase pas le contact saisi');
await db.exec(`update public.crescite_spectacles set action_culturelle = action_culturelle || '{"masquee": false}' where slug = 'cassandres'`);
await db.exec(notif);
ok((await ac()).masquee === false, 'rouverte par l’administration, elle n’est pas remasquée quand on relance le script');
// le stockage public accepte les PDF (les dossiers), sans perdre les images ; relancer le script ne double rien
const b = (await db.query(`select allowed_mime_types m, file_size_limit l from storage.buckets where id = 'crescite'`)).rows[0];
ok(b && b.m.includes('application/pdf') && b.m.includes('image/webp') && new Set(b.m).size === b.m.length && Number(b.l) >= 26214400,
   `le stockage public accepte les PDF jusqu'à 25 Mo (${b && b.m.join(', ')})`);
