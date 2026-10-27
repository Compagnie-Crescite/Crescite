// L'équipe d'une date et le carnet des lieux (le vingt-troisième script), dans un Postgres local (PGlite) : tous les
// scripts, puis lui, deux fois. La vue dit qui part (la distribution en tournée, moins les retirés, plus les renforts ;
// la fonction de la date remplace celle de la distribution) ; les deux fonctions de toujours la lisent et rendent ce
// qu'elles rendaient avant, date par date ; le carnet (contacts, hébergements) n'est qu'à l'administration, va au
// journal, suit son lieu. Données fictives.
import { base, lire, ok } from './commun.mjs';
const SCRIPT = '20261110_crescite_carnet.sql';
const { db, as, refus } = await base({ avant: SCRIPT });

const U = { admin: '11111111-1111-1111-1111-111111111111', lauren: '22222222-2222-2222-2222-222222222222', adrien: '33333333-3333-3333-3333-333333333333', yann: '44444444-4444-4444-4444-444444444444' };
for (const k in U) await db.exec(`insert into auth.users (id, email, email_confirmed_at) values ('${U[k]}', '${k}@exemple.fr', now())`);
await db.exec(`insert into public.crescite_admins (user_id) values ('${U.admin}')`);
await db.exec(`
  insert into public.crescite_spectacles (slug, titre, ordre) values ('berenice', 'Bérénice', 5), ('mariage', 'Le Mariage', 6);
  insert into public.crescite_lieux (nom, commune, departement) values ('Théâtre fictif', 'Caen', '14');
  insert into public.crescite_personnes (slug, prenom, nom) values ('lauren', 'Lauren', 'L'), ('adrien', 'Adrien', 'A'), ('yann', 'Yann', 'R'), ('lumiere', 'Léo', 'M'), ('sans', 'Sam', 'S');`);
const id = async (t, slug) => (await db.query(`select id from public.${t} where slug = $1`, [slug])).rows[0].id;
const P = {}; for (const k of ['lauren', 'adrien', 'yann', 'lumiere', 'sans']) P[k] = await id('crescite_personnes', k);
const sp = await id('crescite_spectacles', 'berenice'), sp2 = await id('crescite_spectacles', 'mariage'), L = (await db.query(`select id from public.crescite_lieux limit 1`)).rows[0].id;
await db.exec(`
  insert into public.crescite_personnes_privees (personne_id, email, user_id) values
    (${P.lauren}, 'lauren@x', '${U.lauren}'), (${P.adrien}, 'adrien@x', '${U.adrien}'), (${P.yann}, 'yann@x', '${U.yann}'), (${P.sans}, 'sam@x', null);
  insert into public.crescite_distributions (spectacle_id, personne_id, categorie, fonction, role, en_tournee, ordre) values
    (${sp}, ${P.lauren}, 'jeu', '', 'Bérénice', true, 1), (${sp}, ${P.adrien}, 'jeu', '', null, true, 2),
    (${sp}, ${P.adrien}, 'technique', 'Régie lumière', null, true, 3), (${sp}, ${P.lumiere}, 'creation', 'Création lumière', null, false, 4),
    (${sp}, ${P.sans}, 'technique', '', null, true, 5), (${sp2}, ${P.yann}, 'jeu', '', null, true, 1);`);
const date = async (s, jours) => (await db.query(`insert into public.crescite_dates (spectacle_id, lieu_id, debut, statut) values ($1, $2, current_date + $3::int, 'confirmee') returning id`, [s, L, jours])).rows[0].id;
const d1 = await date(sp, 20), d2 = await date(sp, 40), d3 = await date(sp2, 25);
// d1 : Adrien ne part pas, Yann le remplace (renfort), Lauren y a une fonction de la date ; d2 : la distribution seule
await db.exec(`insert into public.crescite_equipes (date_id, personne_id, present, fonction, note) values
  (${d1}, ${P.adrien}, false, null, null), (${d1}, ${P.yann}, true, 'remplace Adrien', 'arrive la veille'), (${d1}, ${P.lauren}, true, 'Jeu et accueil', null);`);

// la règle d'avant (le deuxième script), pour comparer date par date
const AVANT = `select distinct p from (
    select e.personne_id as p from public.crescite_equipes e where e.date_id = $1 and e.present
    union
    select di.personne_id from public.crescite_dates x join public.crescite_distributions di on di.spectacle_id = x.spectacle_id
     where x.id = $1 and di.en_tournee and not exists (select 1 from public.crescite_equipes e where e.date_id = $1 and e.personne_id = di.personne_id and not e.present)
  ) t where exists (select 1 from public.crescite_personnes_privees v where v.personne_id = t.p and v.user_id is not null) order by 1`;
const avant = {}; for (const d of [d1, d2, d3]) avant[d] = (await db.query(AVANT, [d])).rows.map(r => Number(r.p));

await db.exec(lire(SCRIPT));
await db.exec(lire(SCRIPT));
ok(true, 'le script passe, deux fois, avec une équipe déjà là');

const vue = async d => (await as('authenticated', U.admin, `select personne_id, fonction, note, ajout from public.crescite_equipe_date where date_id = $1 order by personne_id`, [d])).rows
  .map(r => ({ ...r, personne_id: Number(r.personne_id) }));
const v1 = await vue(d1), qui = xs => xs.map(r => r.personne_id).sort((a, b) => a - b).join(',');
ok(qui(v1) === [P.lauren, P.yann, P.sans].sort((a, b) => a - b).join(','), 'd1 : Lauren, Sam et le renfort Yann ; Adrien retiré, la création lumière ne part pas');
ok(v1.find(r => r.personne_id === P.lauren).fonction === 'Jeu et accueil' && !v1.find(r => r.personne_id === P.lauren).ajout, 'la fonction de la date remplace celle de la distribution');
ok(v1.find(r => r.personne_id === P.yann).ajout && v1.find(r => r.personne_id === P.yann).fonction === 'remplace Adrien' && v1.find(r => r.personne_id === P.yann).note === 'arrive la veille', 'le renfort : ajouté, sa fonction et sa note');
ok(v1.find(r => r.personne_id === P.sans).fonction === 'Technique', 'sans fonction écrite : le libellé de la catégorie');
const v2 = await vue(d2);
ok(v2.find(r => r.personne_id === P.adrien)?.fonction === 'Jeu, Régie lumière' && v2.find(r => r.personne_id === P.lauren)?.fonction === 'Jeu (Bérénice)', 'd2 : deux lignes de distribution font une personne, leurs fonctions jointes ; le rôle entre parenthèses');
for (const d of [d1, d2, d3]) {
  const apres = (await db.query(`select public.crescite_membres_date($1) p order by 1`, [d])).rows.map(r => Number(r.p));
  ok(JSON.stringify(apres) === JSON.stringify(avant[d]), `crescite_membres_date rend ce qu’il rendait avant (date ${d} : ${apres.length} personnes avec un compte)`);
}
const membre = async (u, d) => (await as('authenticated', u, `select public.crescite_membre_date($1) m`, [d])).rows[0].m;
ok(await membre(U.yann, d1) && !(await membre(U.adrien, d1)) && await membre(U.adrien, d2) && !(await membre(U.lauren, d3)), 'crescite_membre_date : le renfort lit sa date, le retiré non ; chacun ses spectacles');
await db.exec(`insert into public.crescite_feuilles (date_id, statut) values (${d1}, 'publiee'), (${d2}, 'publiee'), (${d3}, 'publiee')`);
const feuilles = async u => (await as('authenticated', u, `select date_id from public.crescite_feuilles order by date_id`)).rows.map(r => Number(r.date_id)).join(',');
ok(await feuilles(U.lauren) === `${d1},${d2}` && await feuilles(U.adrien) === `${d2}` && await feuilles(U.yann) === `${d1},${d3}`, 'les droits de lecture passent par la vue : chacun lit les feuilles des dates où il part, le retiré non, le renfort oui');
ok(/permission|denied/i.test(await refus('anon', '', `select * from public.crescite_equipe_date`) || ''), 'le public ne lit pas la vue');

// le carnet
const c = (await as('authenticated', U.admin, `insert into public.crescite_contacts (lieu_id, nom, role, telephone, sur_feuille) values ($1, 'Claire Régie', 'Régie générale', '06 00 00 00 00', true) returning id`, [L])).rows[0].id;
const h = (await as('authenticated', U.admin, `insert into public.crescite_hebergements (lieu_id, nom, adresse, commune, prix) values ($1, 'Hôtel de la Gare', '1 place de la Gare', 'Caen', '72 €') returning id`, [L])).rows[0].id;
ok(c && h, 'l’administration ajoute un contact et un hébergement au lieu');
ok((await as('authenticated', U.lauren, `select count(*)::int n from public.crescite_contacts`)).rows[0].n === 0 && (await as('authenticated', U.lauren, `select count(*)::int n from public.crescite_hebergements`)).rows[0].n === 0, 'l’équipe ne lit pas le carnet');
ok(/row-level|policy|violates/i.test(await refus('authenticated', U.lauren, `insert into public.crescite_contacts (lieu_id, nom) values ($1, 'X')`, [L]) || ''), 'ni ne l’écrit');
ok(/permission|denied/i.test(await refus('anon', '', `select * from public.crescite_hebergements`) || ''), 'le public non plus');
ok(/check|crescite_contacts_nom/i.test(await refus('authenticated', U.admin, `insert into public.crescite_contacts (lieu_id, nom) values ($1, '  ')`, [L]) || ''), 'un contact a un nom');
ok(/check|genre/i.test(await refus('authenticated', U.admin, `update public.crescite_hebergements set genre = 'palace' where id = $1`, [h]) || ''), 'un hébergement, un genre de la liste');
await as('authenticated', U.admin, `update public.crescite_contacts set telephone = '06 11 11 11 11' where id = $1`, [c]);
const j = (await db.query(`select operation from public.crescite_journal where table_nom = 'crescite_contacts' and ligne = $1 order by id`, [String(c)])).rows.map(r => r.operation);
ok(j.join(',') === 'INSERT,UPDATE', 'le carnet va au journal');
ok((await db.query(`select modifie_par from public.crescite_contacts where id = $1`, [c])).rows[0].modifie_par === U.admin, 'et se date, qui l’a changé');
await db.exec(`delete from public.crescite_dates where lieu_id = ${L}; delete from public.crescite_lieux where id = ${L}`);
ok((await db.query(`select (select count(*) from public.crescite_contacts)::int + (select count(*) from public.crescite_hebergements)::int n`)).rows[0].n === 0, 'un lieu supprimé emporte son carnet');
await db.close();
