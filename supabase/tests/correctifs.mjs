// Les correctifs de l'audit (le vingtième script), dans un Postgres local (PGlite) : tous les scripts, puis lui, deux
// fois. Deux « Prévenir l'équipe » coup sur coup font deux notifications, chacune envoyée ; deux propositions ou deux
// réponses ne se fondent plus ; une feuille republiée pour une date passée se tait, retirée elle prévient ; l'absent
// posé à la création d'une date n'apprend pas qu'il « ne part plus » ; une date déplacée prévient ; on ne répond plus à
// une proposition close ; les pistes et les frais vont au journal ; les notes internes se datent. Données fictives.
import { base, lire, ok } from './commun.mjs';
const SCRIPT = '20261108_crescite_correctifs.sql';
const { db, as, refus } = await base({ avant: SCRIPT });
await db.exec(lire(SCRIPT));
await db.exec(lire(SCRIPT));
ok(true, 'le script passe, deux fois');

const U = { admin: '11111111-1111-1111-1111-111111111111', lauren: '22222222-2222-2222-2222-222222222222', adrien: '33333333-3333-3333-3333-333333333333' };
for (const k in U) await db.exec(`insert into auth.users (id, email, email_confirmed_at) values ('${U[k]}', '${k}@exemple.fr', now())`);
await db.exec(`insert into public.crescite_admins (user_id) values ('${U.admin}')`);
await db.exec(`
  insert into public.crescite_spectacles (slug, titre, ordre) values ('berenice', 'Bérénice', 5);
  insert into public.crescite_lieux (nom, commune, departement) values ('Théâtre fictif', 'Caen', '14');
  insert into public.crescite_personnes (slug, prenom, nom) values ('lauren', 'Lauren', 'L'), ('adrien', 'Adrien', 'A'), ('barbara', 'Barbara', 'D');`);
const id = async (t, slug) => (await db.query(`select id from public.${t} where slug = $1`, [slug])).rows[0].id;
const P = { lauren: await id('crescite_personnes', 'lauren'), adrien: await id('crescite_personnes', 'adrien'), barbara: await id('crescite_personnes', 'barbara') };
const sp = await id('crescite_spectacles', 'berenice'), lieu = (await db.query(`select id from public.crescite_lieux limit 1`)).rows[0].id;
await db.exec(`
  insert into public.crescite_personnes_privees (personne_id, email, user_id) values
    (${P.lauren}, 'lauren@x', '${U.lauren}'), (${P.adrien}, 'adrien@x', '${U.adrien}'), (${P.barbara}, 'barbara@x', '${U.admin}');
  insert into public.crescite_distributions (spectacle_id, personne_id, categorie) values (${sp}, ${P.lauren}, 'jeu'), (${sp}, ${P.adrien}, 'jeu');`);
const nouvelleDate = async (jours, statut = 'confirmee') => (await db.query(`insert into public.crescite_dates (spectacle_id, lieu_id, debut, statut)
  values ($1, $2, current_date + $3::int, $4) returning id`, [sp, lieu, jours, statut])).rows[0].id;
const notifs = async (p, type) => (await db.query(`select titre, texte, date_id, lien from public.crescite_notifications where personne_id = $1 and type = $2 order by id`, [p, type])).rows;
const d1 = await nouvelleDate(30);
await db.exec(`update public.crescite_notifications set cree_le = now() - interval '1 hour'`);   // la date n'est plus neuve

// 1. deux messages coup sur coup : deux notifications, deux envois
await as('authenticated', U.lauren, `insert into public.crescite_abonnements (personne_id, endpoint, p256dh, auth) values ($1, 'https://fcm.googleapis.com/fcm/send/essai-lauren', 'k', 'a')`, [P.lauren]);
await db.exec(`delete from net.appels`);
await as('authenticated', U.admin, `select public.crescite_prevenir_equipe($1, 'Rendez-vous avancé à 13h')`, [d1]);
await as('authenticated', U.admin, `select public.crescite_prevenir_equipe($1, 'Prenez vos papiers')`, [d1]);
const msgs = await notifs(P.lauren, 'message');
ok(msgs.length === 2 && msgs[0].titre === 'Rendez-vous avancé à 13h' && msgs[1].titre === 'Prenez vos papiers', 'deux « Prévenir l’équipe » coup sur coup : deux notifications');
ok((await db.query(`select count(*)::int n from net.appels where url like '%crescite-push'`)).rows[0].n === 2, 'et deux envois sur le téléphone');

// 2. deux propositions : deux notifications ; deux réponses de deux personnes : deux notifications pour l'administration
const proposer = async titre => (await as('authenticated', U.admin, `select public.crescite_proposer($1::jsonb) id`, [JSON.stringify({ titre, spectacle_id: sp,
  jours: [{ debut: new Date(Date.now() + 86400e3 * 60).toISOString().slice(0, 10) }, { debut: new Date(Date.now() + 86400e3 * 61).toISOString().slice(0, 10) }],
  personnes: [P.lauren, P.adrien] })])).rows[0].id;
const pa = await proposer('Option : Flers'), pb = await proposer('Option : Lisieux');
ok((await notifs(P.lauren, 'proposition')).map(n => n.texte).join(' | ') === 'Option : Flers | Option : Lisieux', 'deux propositions : deux notifications');
const jours = async pid => (await db.query(`select id from public.crescite_propositions_jours where proposition_id = $1 order by debut`, [pid])).rows.map(r => r.id);
const [ja1, ja2] = await jours(pa);
await as('authenticated', U.lauren, `select public.crescite_repondre($1, 'oui')`, [ja1]);
await as('authenticated', U.lauren, `select public.crescite_repondre($1, 'non')`, [ja2]);
await as('authenticated', U.adrien, `select public.crescite_repondre($1, 'oui')`, [ja1]);
ok((await notifs(P.barbara, 'proposition')).map(n => n.titre).join(' | ') === 'Réponse : Lauren L | Réponse : Adrien A',
  'deux personnes répondent : deux notifications ; les deux jours de Lauren n’en font qu’une');

// 3. on ne répond plus à une proposition close, ni pour un jour passé
await as('authenticated', U.admin, `update public.crescite_propositions set statut = 'close' where id = $1`, [pb]);
const [jb1] = await jours(pb);
ok(/close/.test(await refus('authenticated', U.lauren, `select public.crescite_repondre($1, 'oui')`, [jb1]) || ''), 'une proposition close refuse une réponse');
const jeton = (await db.query(`select jeton from public.crescite_propositions_destinataires where proposition_id = $1 and personne_id = $2`, [pb, P.lauren])).rows[0].jeton;
ok((await db.query(`select public.crescite_repondre_jeton($1, $2, 'oui') r`, [jeton, jb1])).rows[0].r === false, 'par courriel non plus');
await db.query(`update public.crescite_propositions_jours set debut = now() - interval '3 days', fin = now() - interval '2 days' where id = $1`, [ja2]);
ok(/passé/.test(await refus('authenticated', U.adrien, `select public.crescite_repondre($1, 'oui')`, [ja2]) || ''), 'ni pour un jour passé');

// 4. les feuilles de route
const dp = await nouvelleDate(-10);
await as('authenticated', U.admin, `insert into public.crescite_feuilles (date_id, contenu, statut) values ($1, '{}', 'publiee')`, [dp]);
ok(!(await notifs(P.lauren, 'feuille')).length, 'une feuille publiée pour une date passée ne prévient pas');
await as('authenticated', U.admin, `insert into public.crescite_feuilles (date_id, contenu, statut) values ($1, '{}', 'publiee')`, [d1]);
await db.exec(`update public.crescite_notifications set lue_le = now() where type = 'feuille'`);   // (Lauren l'a lue)
await as('authenticated', U.admin, `update public.crescite_feuilles set statut = 'brouillon' where date_id = $1`, [d1]);
ok((await notifs(P.lauren, 'feuille')).map(n => n.titre).join(' | ') === 'Feuille de route publiée | Feuille de route retirée', 'une feuille retirée le dit');

// 5. une date neuve avec un absent : il n'apprend pas qu'il « ne part plus »
const d2 = await nouvelleDate(45);
ok((await notifs(P.adrien, 'date')).some(n => Number(n.date_id) === Number(d2)), 'à la création, toute la distribution apprend la nouvelle date');
await as('authenticated', U.admin, `insert into public.crescite_equipes (date_id, personne_id, present) values ($1, $2, false)`, [d2, P.adrien]);
ok(!(await notifs(P.adrien, 'equipe')).length && !(await notifs(P.adrien, 'date')).some(n => Number(n.date_id) === Number(d2)),
  'l’absent posé à la création n’apprend pas qu’il « ne part plus », et l’annonce de la date s’efface');
await db.exec(`update public.crescite_notifications set cree_le = now() - interval '1 hour'`);
await as('authenticated', U.admin, `delete from public.crescite_equipes where date_id = $1 and personne_id = $2`, [d2, P.adrien]);
ok((await notifs(P.adrien, 'equipe')).map(n => n.titre).join() === 'Vous partez sur une date', 'plus tard, le remettre le prévient');
await as('authenticated', U.admin, `insert into public.crescite_equipes (date_id, personne_id, present) values ($1, $2, false)`, [d2, P.lauren]);
ok((await notifs(P.lauren, 'equipe')).map(n => n.titre).join() === 'Vous ne partez plus sur une date', 'et le retirer d’une date déjà annoncée aussi');

// 6. une date déplacée
await as('authenticated', U.admin, `update public.crescite_dates set debut = debut + 2, fin = coalesce(fin, debut) + 2 where id = $1`, [d1]);
ok((await notifs(P.lauren, 'date')).some(n => n.titre === 'Date déplacée' && Number(n.date_id) === Number(d1)), 'une date déplacée prévient l’équipe');

// 7. le journal et les notes
await as('authenticated', U.admin, `insert into public.crescite_diffusion_prospects (spectacle_id, structure, commune) values ($1, 'Théâtre fictif', 'Caen')`, [sp]);
ok((await db.query(`select count(*)::int n from public.crescite_journal where table_nom = 'crescite_diffusion_prospects'`)).rows[0].n === 1, 'une piste de diffusion va au journal');
const note = (await as('authenticated', U.admin, `insert into public.crescite_notes (cible_table, cible_id, texte) values ('crescite_dates', $1, 'Appeler la régie') returning id, modifie_le::text m`, [d1])).rows[0];
await db.exec(`select pg_sleep(0.01)`);
await as('authenticated', U.admin, `update public.crescite_notes set texte = 'Appeler la régie demain' where id = $1`, [note.id]);
const apres = (await db.query(`select modifie_le::text m, modifie_par::text p from public.crescite_notes where id = $1`, [note.id])).rows[0];
ok(apres.m !== note.m && apres.p === U.admin, 'une note modifiée se date, avec son auteur');
await db.close();
