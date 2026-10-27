// Les documents générés (le vingtième script), dans un Postgres local (PGlite) : tous les scripts, avec un devis encore
// gardé à l'ancienne dans crescite_textes, puis lui, deux fois. Le public ne lit plus ni les documents ni les modèles (il
// lit toujours les textes du site) ; la base donne les numéros, à la suite par type et par année ; un document émis ne
// change plus, sauf ce qui le suit (paiement, échéance, annulation) ; une facture ne se supprime pas ; seule
// l'administration émet et lit. Relancer le script de base ne rouvre rien. Toutes les données sont fictives.
import { base, lire, ok } from './commun.mjs';
const SCRIPT = '20261107_crescite_documents_generes.sql';
const { db, as, refus } = await base({ avant: SCRIPT });

const U = { admin: '11111111-1111-1111-1111-111111111111', lauren: '22222222-2222-2222-2222-222222222222' };
for (const k in U) await db.exec(`insert into auth.users (id, email, email_confirmed_at) values ('${U[k]}', '${k}@exemple.fr', now())`);
await db.exec(`insert into public.crescite_admins (user_id) values ('${U.admin}')`);
await db.exec(`
  insert into public.crescite_spectacles (slug, titre, ordre) values ('berenice', 'Bérénice', 5);
  insert into public.crescite_lieux (nom, commune, departement) values ('Théâtre fictif', 'Caen', '14');
  insert into public.crescite_dates (spectacle_id, lieu_id, debut, fin, statut) select s.id, l.id, '2027-03-12', '2027-03-12', 'confirmee'
    from public.crescite_spectacles s, public.crescite_lieux l;
  -- (la règle d'avant ce script, telle qu'elle est encore dans la base de la compagnie : tout le monde lit tout)
  drop policy if exists lecture on public.crescite_textes;
  create policy lecture on public.crescite_textes for select to anon, authenticated using (true);
  insert into public.crescite_textes (cle, valeur) values ('modele:devis', '{"titre": "Devis"}'), ('modele-date:berenice', '{}'),
    ('coordonnees', '{"nom": "Compagnie Crescite"}')
    on conflict (cle) do update set valeur = excluded.valeur;
  insert into public.crescite_textes (cle, valeur) select 'documents:generes', jsonb_build_array(jsonb_build_object('numero', 'DEV-'
    || extract(year from public.crescite_aujourdhui_paris())::int || '-001', 'type', 'devis', 'date_id', (select id from public.crescite_dates limit 1),
    'structure', 'Théâtre fictif', 'montant_ttc', 2110, 'le', now(), 'valeurs', '{"montant_ht": 2000}'))
    on conflict (cle) do update set valeur = excluded.valeur;`);
const AN = (await db.query(`select extract(year from public.crescite_aujourdhui_paris())::int an`)).rows[0].an;
const D = (await db.query(`select id from public.crescite_dates limit 1`)).rows[0].id;

const cles = async (role, sub) => (await as(role, sub, `select cle from public.crescite_textes order by cle`)).rows.map(r => r.cle);

ok((await cles('anon')).includes('documents:generes'), 'avant le script : le public lit le devis gardé dans les textes (la faille)');
await db.exec(lire(SCRIPT));
await db.exec(lire(SCRIPT));
ok(true, 'le script passe, deux fois');

const publics = await cles('anon');
ok(!publics.some(c => /^(documents|modele|modele-date):/.test(c)) && publics.includes('coordonnees'),
  'le public lit toujours les textes du site, plus les documents ni les modèles');
ok((await cles('authenticated', U.lauren)).every(c => !/^(documents|modele|modele-date):/.test(c)), 'un compte de l’équipe non plus');
ok((await cles('authenticated', U.admin)).includes('modele:devis'), 'l’administration lit les modèles');
const repris = (await db.query(`select numero, date_id, structure, montant_ttc::float m from public.crescite_documents_generes`)).rows;
ok(repris.length === 1 && repris[0].numero === `DEV-${AN}-001` && Number(repris[0].date_id) === Number(D) && repris[0].m === 2110,
  'le devis gardé à l’ancienne est repris (une seule fois), avec sa date et son montant');
ok(!(await db.query(`select 1 from public.crescite_textes where cle = 'documents:generes'`)).rows.length, 'et effacé des textes');

const emettre = (sub, type, html = '<h1>N° {{numero}}</h1>') => as('authenticated', sub,
  `select * from public.crescite_emettre_document($1, $2, '{"montant_ht": 1000}', $3, '{}', null, null, 'Théâtre fictif', 1000, 1055)`, [type, html, D]);
const d2 = (await emettre(U.admin, 'devis')).rows[0];
const d3 = (await emettre(U.admin, 'devis')).rows[0];
const f1 = (await emettre(U.admin, 'facture')).rows[0];
ok(d2.numero === `DEV-${AN}-002` && d3.numero === `DEV-${AN}-003` && f1.numero === `FAC-${AN}-001`,
  'la base numérote : à la suite du devis repris, et chaque type à part');
ok(d2.html === `<h1>N° DEV-${AN}-002</h1>` && d2.valeurs.numero === d2.numero, 'le numéro est posé dans la page et dans les valeurs');
ok(/administrateurs/.test(await refus('authenticated', U.lauren, `select public.crescite_emettre_document('devis', 'x')`) || '')
   && /permission|denied/i.test(await refus('anon', '', `select public.crescite_emettre_document('devis', 'x')`) || ''),
  'un compte de l’équipe ou le public ne peut pas émettre');
ok(!(await as('authenticated', U.lauren, `select * from public.crescite_documents_generes`)).rows.length
   && /permission|denied/i.test(await refus('anon', '', `select * from public.crescite_documents_generes`) || ''),
  'ni lire les documents');
ok(/permission|denied/i.test(await refus('authenticated', U.admin, `insert into public.crescite_documents_generes (type, annee, rang, numero) values ('devis', ${AN}, 99, 'DEV-${AN}-099')`) || ''),
  'même l’administration n’insère pas à la main : le numéro vient de la base');
ok(/ne change plus/.test(await refus('authenticated', U.admin, `update public.crescite_documents_generes set html = 'autre' where id = ${f1.id}`) || '')
   && /ne change plus/.test(await refus('authenticated', U.admin, `update public.crescite_documents_generes set montant_ttc = 1 where id = ${f1.id}`) || ''),
  'un document émis ne change plus (sa page, ses montants)');
await as('authenticated', U.admin, `update public.crescite_documents_generes set paye_le = '2027-04-01', echeance = '2027-04-12', note = 'virement reçu' where id = ${f1.id}`);
ok((await db.query(`select paye_le::text p, modifie_par::text m from public.crescite_documents_generes where id = ${f1.id}`)).rows[0].p === '2027-04-01',
  'ce qui le suit se note : paiement, échéance, note');
ok(/ne se supprime pas/.test(await refus('authenticated', U.admin, `delete from public.crescite_documents_generes where id = ${f1.id}`) || ''),
  'une facture ne se supprime pas');
await as('authenticated', U.admin, `delete from public.crescite_documents_generes where id = ${d3.id}`);
ok((await emettre(U.admin, 'devis')).rows[0].numero === `DEV-${AN}-003`, 'un devis se supprime ; son numéro, le dernier, sert de nouveau');
ok((await db.query(`select count(*)::int n from public.crescite_journal where table_nom = 'crescite_documents_generes'`)).rows[0].n >= 5,
  'émissions, paiement et suppression vont au journal');
await db.exec(`delete from public.crescite_dates where id = ${D}`);
ok((await db.query(`select count(*)::int n from public.crescite_documents_generes where date_id is null`)).rows[0].n === 4,
  'une date supprimée délie ses documents sans les perdre');

await db.exec(lire('20261020_crescite_base.sql'));
ok(!(await cles('anon')).some(c => /^(documents|modele|modele-date):/.test(c)), 'le script de base relancé ne rouvre pas les modèles au public');
await db.close();
