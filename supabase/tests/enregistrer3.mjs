// L'enregistrement d'une date, version 3 (le vingt-quatrième script), dans un Postgres local (PGlite) : les vingt-deux
// scripts précédents (par commun.mjs, avec pg_cron et pg_net simulés), puis lui, deux fois. Une clé absente garde la valeur
// (la fin d'une date, ses séances, le spectacle, le début, la case « visible »), une clé présente à vide l'efface (quand la
// colonne peut l'être), la liste des séances présente remplace toutes les séances ; deux enregistrements identiques ne
// laissent qu'une ligne de journal par table ; le montant de cession ne se lit que dans l'administration ; les chiffres et
// l'équipe s'écrivent avec la date, dans la même transaction (une erreur sur l'équipe annule la date) ; la sonde
// crescite_capacites() dit 3, ou 2 quand le troisième script a remis l'ancienne version. Les essais de base.mjs (deux
// séances le même jour, retrait et ajout, une option qui n'est pas publique, le refus d'un compte sans droit) et de
// notifications.mjs (une seule notification pour une date neuve) sont rejoués sur la version 3. Données fictives.
//   cd supabase/tests && npm install && node enregistrer3.mjs
import { base, lire, ok } from './commun.mjs';
const SCRIPT = '20261111_crescite_enregistrer_date_3.sql';
const { db, as, refus } = await base({ avant: SCRIPT });
await db.exec(lire(SCRIPT));
await db.exec(lire(SCRIPT));
ok(true, 'le script passe, deux fois');

const U = { admin: '11111111-1111-1111-1111-111111111111', lauren: '22222222-2222-2222-2222-222222222222', adrien: '33333333-3333-3333-3333-333333333333' };
for (const k in U) await db.exec(`insert into auth.users (id, email, email_confirmed_at) values ('${U[k]}', '${k}@exemple.fr', now())`);
await db.exec(`insert into public.crescite_admins (user_id) values ('${U.admin}')`);
await db.exec(`
  insert into public.crescite_spectacles (slug, titre, ordre) values ('berenice', 'Bérénice', 5);
  insert into public.crescite_lieux (nom, commune, departement) values ('Théâtre fictif', 'Caen', '14'), ('Salle fictive', 'Flers', '61');
  insert into public.crescite_personnes (slug, prenom, nom) values ('lauren', 'Lauren', 'L'), ('adrien', 'Adrien', 'A'), ('barbara', 'Barbara', 'D');`);
const id = async (t, slug) => (await db.query(`select id from public.${t} where slug = $1`, [slug])).rows[0].id;
const P = { lauren: await id('crescite_personnes', 'lauren'), adrien: await id('crescite_personnes', 'adrien'), barbara: await id('crescite_personnes', 'barbara') };
const sp = await id('crescite_spectacles', 'berenice');
const [l1, l2] = (await db.query(`select id from public.crescite_lieux order by id`)).rows.map(r => r.id);
await db.exec(`
  insert into public.crescite_personnes_privees (personne_id, email, user_id) values
    (${P.lauren}, 'lauren@x', '${U.lauren}'), (${P.adrien}, 'adrien@x', '${U.adrien}'), (${P.barbara}, 'barbara@x', null);
  insert into public.crescite_distributions (spectacle_id, personne_id, categorie) values (${sp}, ${P.lauren}, 'jeu'), (${sp}, ${P.adrien}, 'jeu');`);

const jour = n => new Date(Date.now() + 86400e3 * n).toISOString().slice(0, 10);
const iso = v => v == null ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
const enreg = async (o, qui = U.admin) => (await as('authenticated', qui, `select public.crescite_enregistrer_date($1::jsonb) as id`, [JSON.stringify(o)])).rows[0].id;
const date = async i => (await db.query(`select * from public.crescite_dates where id = $1`, [i])).rows[0];
const seances = async i => (await db.query(`select * from public.crescite_representations where date_id = $1 order by jour, heure`, [i])).rows;
const suivi = async i => (await db.query(`select * from public.crescite_dates_suivi where date_id = $1`, [i])).rows[0];
const journal = async t => (await db.query(`select count(*)::int n from public.crescite_journal where table_nom = $1`, [t])).rows[0].n;
const notifs = async (p, type) => (await db.query(`select titre, texte, date_id from public.crescite_notifications where personne_id = $1 and type = $2 order by id`, [p, type])).rows;
const capacites = async () => (await as('authenticated', U.admin, `select public.crescite_capacites() c`)).rows[0].c;

// 0. la sonde
const cap = await capacites();
ok(cap.enregistrer_date === 3 && cap.montant_cession === true && cap.equipe === true && cap.chiffres === true,
  `crescite_capacites() répond : ${JSON.stringify(cap)}`);
ok(/permission/.test(await refus('anon', '', `select public.crescite_capacites()`) || ''), 'le public ne peut pas interroger la sonde');
ok((await as('authenticated', U.lauren, `select public.crescite_capacites() c`)).rows[0].c.enregistrer_date === 3, 'un compte de l’équipe la lit aussi');

// 1. les essais de base.mjs, rejoués sur la version 3 : deux séances le même jour, retrait et ajout
const debut = jour(60), lendemain = jour(61);
const d1 = await enreg({ spectacle_id: sp, lieu_id: l1, debut, statut: 'confirmee', details: [{ texte: '14h et 20h', lien: null }],
  representations: [{ jour: debut, heure: '14:00', public: 'scolaire' }, { jour: debut, heure: '20:00' }], suivi: { organisateur: 'Théâtre fictif', notes: 'contrat signé' } });
ok((await seances(d1)).length === 2 && iso((await date(d1)).debut) === debut && (await date(d1)).precision === 'jour', 'deux séances le même jour : le début suit les séances');
const [s1] = await seances(d1);
await enreg({ id: d1, spectacle_id: sp, lieu_id: l1, debut, representations: [{ id: s1.id, jour: debut, heure: '14:30', public: 'scolaire' }, { jour: lendemain, heure: '20:30' }] });
const rr = await seances(d1);
ok(rr.length === 2 && rr[0].heure === '14:30:00' && iso((await date(d1)).fin) === lendemain, 'retrait d’une séance, ajout d’une autre : la fin de la date suit');
const dopt = await enreg({ spectacle_id: sp, debut: jour(90), statut: 'option', representations: [] });
ok((await as('anon', '', `select count(*)::int n from public.crescite_dates where id = $1`, [dopt])).rows[0].n === 0
   && (await as('anon', '', `select count(*)::int n from public.crescite_dates where id = $1`, [d1])).rows[0].n === 1, 'une option n’est pas publique, une date confirmée l’est');
let code = '';
try { await enreg({ spectacle_id: sp, debut: jour(100) }, U.lauren); } catch (e) { code = e.code; }
ok(code === '42501', 'un compte qui n’est pas administrateur ne peut pas enregistrer (42501)');

// 2. les essais de notifications.mjs : une seule notification pour une date neuve, et rien quand on réenregistre à l’identique
await db.exec(`update public.crescite_notifications set cree_le = now() - interval '1 hour'`);
const dn = await enreg({ spectacle_id: sp, lieu_id: l1, debut: jour(70), representations: [{ jour: jour(70), heure: '14:00', public: 'scolaire' }, { jour: jour(70), heure: '20:00' }] });
const nl = (await notifs(P.lauren, 'date')).filter(n => Number(n.date_id) === Number(dn));
ok(nl.length === 1 && nl[0].titre === 'Nouvelle date', 'une date neuve à deux séances : une seule notification « Nouvelle date »');
await db.exec(`update public.crescite_notifications set cree_le = now() - interval '1 hour'`);
const sn = await seances(dn);
await enreg({ id: dn, spectacle_id: sp, lieu_id: l1, debut: jour(70), representations: sn.map(s => ({ id: s.id, jour: iso(s.jour), heure: s.heure.slice(0, 5), public: s.public })) });
ok((await notifs(P.lauren, 'date')).filter(n => Number(n.date_id) === Number(dn)).length === 1, 'réenregistrer sans rien changer ne prévient personne');

// 3. une clé absente garde la valeur
const dA = await enreg({ spectacle_id: sp, lieu_id: l1, debut: jour(40), fin: jour(42), precision: 'periode', intitule: 'Festival d’automne', lien: 'https://exemple.fr/a',
  nb_representations: 3, statut: 'option', visible: false, public: 'scolaire', details: [{ texte: 'à confirmer', lien: null }] });
let a = await date(dA);
ok(iso(a.fin) === jour(42), 'une date écrite avec une fin');
await enreg({ id: dA, intitule: 'Festival d’automne 2026' });
a = await date(dA);
ok(iso(a.fin) === jour(42) && iso(a.debut) === jour(40) && a.lieu_id === l1 && a.lien === 'https://exemple.fr/a' && a.nb_representations === 3
   && a.precision === 'periode' && a.statut === 'option' && a.public === 'scolaire' && a.details[0].texte === 'à confirmer' && a.intitule === 'Festival d’automne 2026',
  'réécrite sans la clé fin (ni les autres) : la fin, le lieu, le lien, le nombre de séances, les précisions sont gardés');
await enreg({ id: dA, spectacle_id: null, debut: '', statut: null, public: '', precision: null, nature: null, details: null });
a = await date(dA);
ok(a.spectacle_id === sp && iso(a.debut) === jour(40) && a.statut === 'option' && a.public === 'scolaire' && a.precision === 'periode' && a.nature === 'representations',
  'sans spectacle ni début (ou à null) : inchangés');
ok(a.visible === false, 'la case « visible » absente garde faux');
await enreg({ id: dA, lieu_id: null, intitule: '', lien: null, nb_representations: null });
a = await date(dA);
ok(a.lieu_id === null && a.intitule === null && a.lien === null && a.nb_representations === null && iso(a.fin) === jour(42),
  'une clé présente à vide efface le lieu, l’intitulé, le lien, le nombre de séances');
await enreg({ id: dA, fin: null });
ok(iso((await date(dA)).fin) === jour(40), 'la fin envoyée à null est effacée (la base la remet au début)');
ok(/introuvable/.test(await refus('authenticated', U.admin, `select public.crescite_enregistrer_date('{"id": 987654}'::jsonb)`) || ''), 'une date qui n’existe pas est refusée');

// 4. les séances : gardées si la clé est absente, remplacées si elle est présente, champ à champ
const dB = await enreg({ spectacle_id: sp, lieu_id: l1, debut: jour(50), representations: [
  { jour: jour(50), heure: '14:00', fin: '16:00', public: 'scolaire', lien: 'https://exemple.fr/b', note: 'complet', annulee: false },
  { jour: jour(51), heure: '20:00', fin: '22:00' }] });
const [b1, b2] = await seances(dB);
await enreg({ id: dB, intitule: 'Sans toucher aux séances' });
ok((await seances(dB)).length === 2, 'la clé representations absente laisse les séances');
await enreg({ id: dB, representations: [{ id: b1.id, jour: jour(50) }, { id: b2.id, jour: jour(51), heure: '21:00' }] });
const [c1, c2] = await seances(dB);
ok(c1.heure === '14:00:00' && c1.fin === '16:00:00' && c1.public === 'scolaire' && c1.lien === 'https://exemple.fr/b' && c1.note === 'complet' && c1.annulee === false,
  'une séance réécrite avec son seul jour garde l’heure, la fin, le public, le lien, la note');
ok(c2.heure === '21:00:00' && c2.fin === '22:00:00', 'une séance dont seule l’heure change garde sa fin (plus d’effacement des heures de fin)');
await enreg({ id: dB, representations: [{ id: b1.id, jour: jour(50), note: null, annulee: true, fin: null }, { id: b2.id, jour: jour(51) }] });
const [e1] = await seances(dB);
ok(e1.note === null && e1.fin === null && e1.annulee === true && e1.heure === '14:00:00', 'une clé présente à null efface la note et la fin d’une séance');
ok(/besoin de son jour/.test(await refus('authenticated', U.admin, `select public.crescite_enregistrer_date($1::jsonb)`, [JSON.stringify({ id: dB, representations: [{ id: b1.id, heure: '10:00' }] })]) || ''),
  'une séance sans jour est refusée');
await enreg({ id: dB, representations: [{ jour: jour(55), heure: '19:00' }] });
const f = await seances(dB);
ok(f.length === 1 && iso(f[0].jour) === jour(55) && !f.some(s => s.id === b1.id || s.id === b2.id), 'la clé representations présente remplace toutes les séances');
await enreg({ id: dB, representations: [] });
ok((await seances(dB)).length === 0, 'et une liste vide les retire toutes');

// 5. le suivi : le montant de cession se lit dans l’administration seule ; les quatre colonnes de diffusion ne sont pas touchées
const dC = await enreg({ spectacle_id: sp, lieu_id: l1, debut: jour(80), suivi: { organisateur: 'Théâtre fictif', contact: 'Mme X', contrat: 'envoyé', notes: 'à relancer', montant_cession: 2500.5 } });
let su = await suivi(dC);
ok(Number(su.montant_cession) === 2500.5 && su.organisateur === 'Théâtre fictif' && su.contrat === 'envoyé', 'le suivi étendu : le montant de cession est écrit avec les quatre colonnes de toujours');
ok((await as('authenticated', U.admin, `select count(*)::int n from public.crescite_dates_suivi where montant_cession is not null`)).rows[0].n === 1
   && (await as('authenticated', U.lauren, `select count(*)::int n from public.crescite_dates_suivi`)).rows[0].n === 0
   && (await as('anon', '', `select count(*)::int n from public.crescite_dates_suivi`)).rows[0].n === 0,
  'le montant ne se lit que dans l’administration (ni l’équipe ni le public n’en voient rien)');
await db.exec(`update public.crescite_dates_suivi set etape_crm = 'contrat_signe', date_dernier_contact = '2026-10-01', date_prochaine_relance = '2026-11-01', notes_diffusion = 'piste' where date_id = ${dC}`);
await enreg({ id: dC, suivi: { notes: 'relancé le 3' } });
su = await suivi(dC);
ok(su.notes === 'relancé le 3' && Number(su.montant_cession) === 2500.5 && su.organisateur === 'Théâtre fictif' && su.contact === 'Mme X',
  'un suivi sans le montant (ni l’organisateur) les garde');
ok(su.etape_crm === 'contrat_signe' && iso(su.date_dernier_contact) === '2026-10-01' && iso(su.date_prochaine_relance) === '2026-11-01' && su.notes_diffusion === 'piste',
  'les quatre colonnes de diffusion, que la piste porte, ne sont pas touchées');
await enreg({ id: dC, suivi: { montant_cession: '', contact: '' } });
su = await suivi(dC);
ok(su.montant_cession === null && su.contact === null && su.notes === 'relancé le 3', 'un montant ou un contact vide est effacé, le reste gardé');
await enreg({ id: dC, intitule: 'sans suivi' });
ok((await suivi(dC)).notes === 'relancé le 3', 'sans la clé suivi, le suivi reste tel quel');

// 6. deux enregistrements identiques : une seule ligne de journal par table
const T = ['crescite_dates', 'crescite_representations', 'crescite_dates_suivi', 'crescite_dates_chiffres', 'crescite_equipes'];
const charge = { spectacle_id: sp, lieu_id: l1, debut: jour(120), fin: jour(120), intitule: 'Deux fois', statut: 'confirmee', visible: true, details: [{ texte: 't', lien: null }],
  representations: [{ jour: jour(120), heure: '20:00', fin: '22:00', public: 'tout_public', annulee: false, lien: null, note: null }],
  suivi: { organisateur: 'O', contact: null, contrat: null, notes: null, montant_cession: 1200 },
  chiffres: { jauge: 300, spectateurs: 250, heures_ateliers: 2.5 }, equipe: [{ personne_id: P.lauren, present: true, fonction: 'Jeu', note: null }] };
const dD = await enreg(charge);
const apres1 = {}; for (const t of T) apres1[t] = await journal(t);
ok(T.every(t => apres1[t] >= 1), 'un premier enregistrement écrit la date, ses séances, son suivi, ses chiffres et son équipe');
const sd = await seances(dD);
await enreg({ ...charge, id: dD, representations: [{ ...charge.representations[0], id: sd[0].id }] });
const apres2 = {}; for (const t of T) apres2[t] = await journal(t);
ok(T.every(t => apres2[t] === apres1[t]), `le même enregistrement une seconde fois n’ajoute aucune ligne au journal (${T.map(t => apres2[t]).join(' · ')})`);

// 7. les chiffres : gardés un à un, la ligne est supprimée quand tout est vide
const ch = async i => (await db.query(`select * from public.crescite_dates_chiffres where date_id = $1`, [i])).rows[0];
await enreg({ id: dD, chiffres: { spectateurs: null } });
let cc = await ch(dD);
ok(cc.spectateurs === null && cc.jauge === 300 && Number(cc.heures_ateliers) === 2.5, 'un chiffre envoyé à null est effacé, les autres sont gardés');
await enreg({ id: dD, chiffres: { jauge: '', heures_ateliers: null } });
ok(!(await ch(dD)), 'la jauge, les spectateurs et les heures tous vides : la ligne est supprimée');
await enreg({ id: dD, chiffres: { jauge: 120 } });
ok((await ch(dD)).jauge === 120, 'une jauge écrite recrée la ligne');
await enreg({ id: dD, chiffres: { jauge: null, source: ' Billetterie du théâtre ' } });
cc = await ch(dD);
ok(cc && cc.jauge === null && cc.source === 'Billetterie du théâtre', 'une source saisie seule garde la ligne (comme ecrireChiffres dans l’administration)');
await enreg({ id: dD, chiffres: { source: '' } });
ok(!(await ch(dD)), 'la source vidée à son tour : la ligne est supprimée');
await enreg({ id: dD, chiffres: { jauge: 120 } });

// 8. l’équipe : la liste voulue, les autres sont retirées
const eq = async i => (await db.query(`select personne_id, present, fonction, note from public.crescite_equipes where date_id = $1 order by personne_id`, [i])).rows;
await enreg({ id: dD, equipe: [{ personne_id: P.lauren, present: true, fonction: ' Jeu ', note: '' }, { personne_id: P.adrien, present: false, fonction: 'remplacé', note: null }, { personne_id: P.barbara, present: true }] });
let q = await eq(dD);
ok(q.length === 3 && q.find(x => x.personne_id === P.lauren).fonction === 'Jeu' && q.find(x => x.personne_id === P.adrien).present === false, 'l’équipe voulue est écrite (fonctions nettoyées, absence comprise)');
await enreg({ id: dD, equipe: [{ personne_id: P.adrien, present: false, fonction: 'remplacé', note: 'autre note' }] });
q = await eq(dD);
ok(q.length === 1 && q[0].personne_id === P.adrien && q[0].note === 'autre note', 'les personnes qui ne sont plus dans la liste sont retirées de la date, une note qui change est écrite');
await enreg({ id: dD, intitule: 'sans équipe' });
ok((await eq(dD)).length === 1, 'sans la clé equipe, l’équipe reste telle quelle');
await enreg({ id: dD, equipe: [] });
ok((await eq(dD)).length === 0, 'une liste vide retire toute l’équipe');

// 9. tout passe, ou rien : une erreur sur l’équipe annule la date, ses séances, son suivi et ses chiffres
const avantN = (await db.query(`select count(*)::int n from public.crescite_dates`)).rows[0].n;
const msg = await refus('authenticated', U.admin, `select public.crescite_enregistrer_date($1::jsonb)`, [JSON.stringify({ id: dD, intitule: 'NE DOIT PAS PASSER',
  representations: [{ jour: jour(130), heure: '10:00' }], suivi: { notes: 'NON' }, chiffres: { jauge: 999 }, equipe: [{ personne_id: 987654, present: true }] })]);
ok(msg && /crescite_equipes|violates|clé/.test(msg), `une équipe qui ne va pas est refusée (${(msg || '').slice(0, 60)})`);
const dd = await date(dD);
ok(dd.intitule === 'sans équipe' && (await seances(dD)).length === 1 && (await ch(dD)).jauge === 120 && (await suivi(dD)).notes === null,
  'et rien n’est passé : ni l’intitulé, ni les séances, ni le suivi, ni les chiffres');
await refus('authenticated', U.admin, `select public.crescite_enregistrer_date($1::jsonb)`, [JSON.stringify({ spectacle_id: sp, debut: jour(131), intitule: 'Date fantôme', equipe: [{ personne_id: 987654 }] })]);
ok((await db.query(`select count(*)::int n from public.crescite_dates`)).rows[0].n === avantN, 'une date neuve dont l’équipe est refusée n’est pas créée non plus');

// 10. une date neuve avec son équipe : l’absent posé à la création n’apprend rien, une seule annonce pour les autres
await db.exec(`update public.crescite_notifications set cree_le = now() - interval '1 hour'`);
const dE = await enreg({ spectacle_id: sp, lieu_id: l1, debut: jour(140), representations: [{ jour: jour(140), heure: '20:00' }],
  equipe: [{ personne_id: P.lauren, present: true, fonction: 'Jeu' }, { personne_id: P.adrien, present: false, fonction: 'remplacé' }], chiffres: { jauge: 200 } });
ok((await notifs(P.lauren, 'date')).filter(n => Number(n.date_id) === Number(dE)).length === 1
   && !(await notifs(P.adrien, 'date')).some(n => Number(n.date_id) === Number(dE)) && !(await notifs(P.adrien, 'equipe')).some(n => Number(n.date_id) === Number(dE)),
  'une date neuve et son équipe dans le même appel : Lauren apprend la date, l’absent n’apprend rien');

// 11. pas de fausse « Date déplacée » quand la fin n’est pas renvoyée
const dF = await enreg({ spectacle_id: sp, lieu_id: l1, debut: jour(150), fin: jour(152) });
await db.exec(`update public.crescite_notifications set cree_le = now() - interval '1 hour'`);
const deplacees = async () => (await notifs(P.lauren, 'date')).filter(n => Number(n.date_id) === Number(dF) && n.titre === 'Date déplacée').length;
await enreg({ id: dF, spectacle_id: sp, debut: jour(150), intitule: 'Renommée' });
ok(await deplacees() === 0, 'réécrite sans la clé fin : aucune « Date déplacée »');
await enreg({ id: dF, spectacle_id: sp, debut: jour(151), fin: jour(152) });
ok(await deplacees() === 1, 'et un vrai déplacement en fait une');

// 12. le désordre : relancer le troisième script remet la version 2 (la sonde le dit, la fin est de nouveau effacée) ; on relance celui-ci
const rejouer = async (...fichiers) => { for (const f of fichiers) await db.exec(lire(f)); };
await rejouer('20261020_crescite_base.sql', '20261021_crescite_equipe.sql', '20261022_crescite_notifications.sql', '20261026_crescite_ideale.sql',
  '20261029_crescite_chiffres.sql', '20261102_crescite_equipe_modifie.sql');
ok((await capacites()).enregistrer_date === 2, 'après le troisième script relancé, la sonde dit 2');
await enreg({ id: dA, spectacle_id: sp, debut: jour(40), intitule: 'Version 2' });
ok(iso((await date(dA)).fin) === jour(40), 'la fin est de nouveau effacée par l’ancienne version (le début la remplace)');
await db.exec(`update public.crescite_dates set fin = '${jour(42)}' where id = ${dA}`);
const membres = async () => /crescite_equipe_date/.test((await db.query(`select pg_get_functiondef('public.crescite_membres_date(bigint)'::regprocedure) f`)).rows[0].f);
ok(!(await membres()), 'et les anciennes fonctions du vingt-et-unième et du vingt-troisième script sont revenues');
await db.exec(lire(SCRIPT));
ok((await capacites()).enregistrer_date === 3, 'relancé, le script remet la version 3 : la sonde dit 3');
await enreg({ id: dA, intitule: 'Version 3' });
ok(iso((await date(dA)).fin) === jour(42), 'la fin est de nouveau gardée');
await rejouer('20261108_crescite_correctifs.sql', '20261110_crescite_carnet.sql');
ok(await membres() && (await capacites()).enregistrer_date === 3, 'relancer ensuite le vingt-et-unième et le vingt-troisième remet leurs fonctions sans défaire la version 3');
