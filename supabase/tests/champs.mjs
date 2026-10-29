// Les colonnes d'une date, telles que la base les a : le premier visage de l'essai « aucun champ oublié ». Tous les scripts
// du dossier migrations/ passent dans un Postgres local (PGlite), puis la liste des colonnes des cinq tables d'une date
// (crescite_dates, crescite_representations, crescite_dates_suivi, crescite_dates_chiffres, crescite_equipes) est lue
// dans information_schema et écrite dans supabase/tests/champs-date.json (table, colonne, type, nul permis, défaut). Le
// second visage est site/champs.mjs : il compare ce fichier au schéma de la date de l'administration (SCHEMA_DATE) et à
// la liste de ce qui est écarté exprès. Une colonne ajoutée par un script, sans champ dans le schéma, fait rougir l'un
// des deux : on relance cet essai (node supabase/tests/champs.mjs), on commite le JSON, puis on lance le banc.
//   cd supabase/tests && npm install && node champs.mjs
// La requête se restreint aux cinq tables par leur nom : la vue crescite_equipe_date (script 23) et les tables du carnet
// des lieux y figureraient sinon. Rien d'autre n'est écrit nulle part.
import { writeFileSync } from 'node:fs';
import { base, ok } from './commun.mjs';
const TABLES = ['crescite_dates', 'crescite_representations', 'crescite_dates_suivi', 'crescite_dates_chiffres', 'crescite_equipes'];
const { db } = await base({ avant: '9' });   // (tous les scripts : aucun nom ne commence par 9)

const { rows } = await db.query(`select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns
  where table_schema = 'public' and table_name = any($1::text[]) order by table_name, ordinal_position`, [TABLES]);
const colonnes = rows.map(r => ({ table: r.table_name, colonne: r.column_name, type: r.data_type, nul: r.is_nullable === 'YES', defaut: r.column_default }));
const de = t => colonnes.filter(c => c.table === t).map(c => c.colonne);

ok(TABLES.every(t => de(t).length), 'les cinq tables d’une date existent, chacune avec ses colonnes');
ok(!colonnes.some(c => !TABLES.includes(c.table)), 'rien d’autre que les cinq tables (ni la vue de l’équipe d’une date, ni le carnet des lieux)');
ok(['spectacle_id', 'lieu_id', 'debut', 'fin', 'precision', 'saison', 'public', 'statut', 'visible', 'intitule', 'details', 'lien', 'nb_representations', 'source', 'nature'].every(c => de('crescite_dates').includes(c)), 'crescite_dates : les quinze colonnes qu’on saisit ou qu’on déduit');
ok(['jour', 'heure', 'fin', 'public', 'annulee', 'lien', 'note'].every(c => de('crescite_representations').includes(c)), 'crescite_representations : le jour, l’heure, la fin, le public, l’annulation, le lien, la précision');
ok(['organisateur', 'contact', 'contrat', 'notes', 'montant_cession'].every(c => de('crescite_dates_suivi').includes(c)), 'crescite_dates_suivi : le suivi interne et le montant de cession');
ok(['etape_crm', 'date_dernier_contact', 'date_prochaine_relance', 'notes_diffusion'].every(c => de('crescite_dates_suivi').includes(c)), 'crescite_dates_suivi : les quatre colonnes de diffusion existent encore (la piste de diffusion porte ce suivi, le schéma les écarte)');
ok(['jauge', 'spectateurs', 'heures_ateliers', 'source'].every(c => de('crescite_dates_chiffres').includes(c)), 'crescite_dates_chiffres : la jauge, les spectateurs, les heures d’ateliers et leur source');
ok(['personne_id', 'present', 'fonction', 'note'].every(c => de('crescite_equipes').includes(c)), 'crescite_equipes : la personne, qui part, sa fonction, sa note');

writeFileSync(new URL('./champs-date.json', import.meta.url), `${JSON.stringify({ tables: TABLES, colonnes }, null, 1)}\n`);
console.log(`écrit : supabase/tests/champs-date.json (${colonnes.length} colonnes)`);
