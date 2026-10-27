// La diffusion reliée (le vingt-deuxième script), dans un Postgres local (PGlite) : tous les scripts, une piste à
// l'ancienne, puis lui, deux fois. Une piste connaît son lieu, une invitation pro et une demande de devis leur piste ; un
// lieu ou une piste supprimés délient sans rien perdre ; les étapes et les statuts sont tenus par la base ; le public
// ne pose pas ces liens. Données fictives.
import { base, lire, ok } from './commun.mjs';
const SCRIPT = '20261109_crescite_diffusion.sql';
const { db, as, refus } = await base({ avant: SCRIPT });
const U = { admin: '11111111-1111-1111-1111-111111111111' };
await db.exec(`insert into auth.users (id, email, email_confirmed_at) values ('${U.admin}', 'admin@exemple.fr', now());
  insert into public.crescite_admins (user_id) values ('${U.admin}');
  insert into public.crescite_lieux (nom, commune, departement) values ('Théâtre fictif', 'Caen', '14');
  insert into public.crescite_diffusion_prospects (structure, commune, etape) values ('Théâtre fictif', 'Caen', 'contact_pris');`);
await db.exec(lire(SCRIPT));
await db.exec(lire(SCRIPT));
ok(true, 'le script passe, deux fois, avec une piste déjà là');
const L = (await db.query(`select id from public.crescite_lieux limit 1`)).rows[0].id, P = (await db.query(`select id from public.crescite_diffusion_prospects limit 1`)).rows[0].id;
await as('authenticated', U.admin, `update public.crescite_diffusion_prospects set lieu_id = $1, etape = 'refus' where id = $2`, [L, P]);
const inv = (await as('authenticated', U.admin, `insert into public.crescite_acces_pro (nom, courriel, prospect_id) values ('Théâtre fictif', 'prog@exemple.fr', $1) returning id`, [P])).rows[0].id;
ok((await db.query(`select lieu_id, etape from public.crescite_diffusion_prospects where id = $1`, [P])).rows[0].etape === 'refus', 'une piste se relie à son lieu, et se marque perdue (refus)');
ok(/check|crescite_diff_prospects_etape/i.test(await refus('authenticated', U.admin, `update public.crescite_diffusion_prospects set etape = 'n_importe' where id = $1`, [P]) || ''), 'une étape hors liste est refusée');
ok(/check|statut/i.test(await refus('authenticated', U.admin, `insert into public.crescite_devis_demandes (type_lieu, structure_nom, commune, contact_nom, contact_email, statut) values ('theatre', 'X', 'Caen', 'Y', 'y@exemple.fr', 'perdu')`) || ''),
  'un statut de demande hors liste aussi');
ok(/permission|denied/i.test(await refus('anon', '', `insert into public.crescite_devis_demandes (type_lieu, structure_nom, commune, contact_nom, contact_email, prospect_id) values ('theatre', 'X', 'Caen', 'Y', 'y@exemple.fr', $1)`, [P]) || ''),
  'le public ne relie pas sa demande à une piste');
await db.exec(`delete from public.crescite_lieux where id = ${L}`);
ok((await db.query(`select lieu_id from public.crescite_diffusion_prospects where id = $1`, [P])).rows[0].lieu_id === null, 'un lieu supprimé délie la piste sans la perdre');
await db.exec(`delete from public.crescite_diffusion_prospects where id = ${P}`);
ok((await db.query(`select prospect_id from public.crescite_acces_pro where id = $1`, [inv])).rows[0].prospect_id === null, 'une piste supprimée délie l’invitation');
await db.close();
