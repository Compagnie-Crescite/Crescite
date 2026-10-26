-- Crescite : la base de la compagnie appelle ses propres fonctions (le seizième script). Le 26 octobre 2026, la base est
-- passée du projet d'adrienvada.fr (omekkqjinvppadsoinvj) au projet de la compagnie (fwjgyfzcbcmfyfkhhtuh, « crescite.fr »),
-- recopiée à l'identique. Mais la base appelle ses fonctions par leur adresse, écrite en toutes lettres dans quatre
-- fonctions et deux tâches planifiées : recopiées telles quelles, elles appelaient encore les fonctions de l'ancien projet,
-- qui lisaient l'ancienne base (une notification, une proposition, une alerte nées dans la nouvelle n'y existent pas, ou
-- y sont autres). Ce script les fait appeler les fonctions du projet de la compagnie.
--
-- À exécuter dans le projet de la compagnie seulement, de la même façon (SQL Editor → New query → coller → Run). Il peut
-- être relancé sans dommage et ne touche qu'à ce qui commence par crescite_ :
--   les fonctions crescite_…   celles dont le code contient l'adresse de l'ancien projet sont réécrites à l'identique,
--                              l'adresse remplacée (aujourd'hui : crescite_notif_envoyer, crescite_propositions_prevenir,
--                              crescite_renvoyer_courriel, crescite_alertes_demander). Leurs droits ne changent pas.
--   les tâches crescite-…      celles qui appellent l'ancien projet (crescite-agendas, crescite-alertes) gardent leur nom et
--                              leur horaire, avec la nouvelle adresse.
-- La fin dit ce qui reste (rien, normalement).

do $$
declare
  ancien constant text := 'https://omekkqjinvppadsoinvj.supabase.co';
  nouveau constant text := 'https://fwjgyfzcbcmfyfkhhtuh.supabase.co';
  f record;
begin
  for f in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'crescite\_%' and p.prosrc like '%' || ancien || '%'
  loop
    -- (pg_get_functiondef rend un « create or replace function » complet : la fonction garde son propriétaire et ses droits)
    execute replace(pg_get_functiondef(f.oid), ancien, nouveau);
  end loop;
end $$;

do $$
declare
  ancien constant text := 'https://omekkqjinvppadsoinvj.supabase.co';
  nouveau constant text := 'https://fwjgyfzcbcmfyfkhhtuh.supabase.co';
  j record;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    for j in execute $q$ select jobname, schedule, command from cron.job
                         where jobname like 'crescite-%' and command like '%' || $1 || '%' $q$ using ancien
    loop
      -- (une tâche reprogrammée sous son nom est remplacée, pas doublée)
      perform cron.schedule(j.jobname, j.schedule, replace(j.command, ancien, nouveau));
    end loop;
  end if;
exception when others then raise notice 'tâches planifiées : %', sqlerrm;
end $$;

-- ce qui est en place (les tâches se lisent par une fonction de passage : sans pg_cron, cron.job n'existe pas)
create or replace function pg_temp.crescite_taches() returns text language plpgsql as $f$
declare r text;
begin
  if to_regclass('cron.job') is null then return 'pg_cron absent : aucune tâche planifiée'; end if;
  execute $q$ select case when count(*) filter (where command like '%omekkqjinvppadsoinvj%') = 0
                 then 'prêtes : ' || coalesce(string_agg(jobname || ' (' || schedule || ')', ', ' order by jobname), 'aucune')
                 else 'à refaire : relancez ce script' end
              from cron.job where jobname like 'crescite-%' $q$ into r;
  return r;
end $f$;

select 'fonctions de la base' as "élément",
  case (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname like 'crescite\_%' and p.prosrc like '%omekkqjinvppadsoinvj%')
    when 0 then 'prêtes : ' || (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                                where n.nspname = 'public' and p.proname like 'crescite\_%'
                                  and p.prosrc like '%fwjgyfzcbcmfyfkhhtuh.supabase.co/functions/v1/%')
                 || ' appellent les fonctions du projet de la compagnie, aucune l''ancien projet'
    else 'à refaire : relancez ce script' end as "état"
union all
select 'tâches planifiées', pg_temp.crescite_taches();
