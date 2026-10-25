-- Crescite : les chiffres d'une date (la jauge, le nombre de spectateurs, les heures d'ateliers), tels que le
-- récapitulatif des représentations de la compagnie les tient. À exécuter après les neuf premiers scripts, de la même
-- façon (SQL Editor → New query → coller → Run). Il peut être relancé sans dommage et ne touche qu'à ce qui commence par
-- crescite_.
--
-- Ce que le script ajoute :
--   crescite_dates_chiffres   une ligne par date : jauge (les places), spectateurs (le public venu), heures_ateliers
--                             (les heures d'ateliers menées autour de la date), source (d'où vient le chiffre). Jamais
--                             publiés : l'administration les lit et les écrit, l'équipe (une personne qui a sa fiche) les
--                             lit, le public et un compte du projet sans fiche n'y ont aucun droit. Chaque changement va
--                             au journal, comme ceux des dates. (crescite_dates_suivi, lui, reste à l'administration seule :
--                             l'organisateur, les contacts, le contrat.)

begin;

create table if not exists public.crescite_dates_chiffres (
  date_id bigint primary key references public.crescite_dates (id) on delete cascade,
  jauge integer check (jauge is null or jauge between 0 and 100000),
  spectateurs integer check (spectateurs is null or spectateurs between 0 and 1000000),
  heures_ateliers numeric(7, 1) check (heures_ateliers is null or heures_ateliers between 0 and 100000),
  source text,                                     -- « Récapitulatif de la compagnie, feuille « Bérénice », ligne 12 »
  modifie_le timestamptz not null default now(),
  modifie_par uuid
);

-- la date et l'auteur du dernier changement, et le journal (l'administration y relit qui a changé quoi)
drop trigger if exists crescite_dates_chiffres_touche on public.crescite_dates_chiffres;
create trigger crescite_dates_chiffres_touche before update on public.crescite_dates_chiffres
  for each row execute function public.crescite_touche();
drop trigger if exists crescite_dates_chiffres_journal on public.crescite_dates_chiffres;
create trigger crescite_dates_chiffres_journal after insert or update or delete on public.crescite_dates_chiffres
  for each row execute function public.crescite_journaliser();

-- ------------------------------------------------------------------------------------------------ règles d'accès

alter table public.crescite_dates_chiffres enable row level security;

-- les règles de ce script s'appellent chiffres_… : on les refait à chaque passage, sans toucher aux autres
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'crescite_dates_chiffres' and policyname like 'chiffres\_%' loop
    execute format('drop policy %I on public.crescite_dates_chiffres', p.policyname);
  end loop;
end $$;

-- l'équipe et l'administration les lisent ; l'administration seule les écrit
create policy chiffres_lecture on public.crescite_dates_chiffres for select to authenticated
  using ((select public.crescite_moi()) is not null or (select public.crescite_est_admin()));
create policy chiffres_ajout on public.crescite_dates_chiffres for insert to authenticated
  with check ((select public.crescite_est_admin()));
create policy chiffres_modification on public.crescite_dates_chiffres for update to authenticated
  using ((select public.crescite_est_admin())) with check ((select public.crescite_est_admin()));
create policy chiffres_suppression on public.crescite_dates_chiffres for delete to authenticated
  using ((select public.crescite_est_admin()));

-- (Supabase donne tout à anon et authenticated sur une table neuve : les droits ferment ce que le public n'a pas à toucher)
revoke all on public.crescite_dates_chiffres from anon, public;
grant select, insert, update, delete on public.crescite_dates_chiffres to authenticated;
grant all on public.crescite_dates_chiffres to service_role;

-- ------------------------------------------------------------------------------------------------ temps réel

-- l'administration écoute la table (sur son propre canal, et seulement quand la base l'a)
do $$
begin
  execute 'alter publication supabase_realtime add table public.crescite_dates_chiffres';
exception
  when duplicate_object then null;
  when others then raise notice 'temps réel, crescite_dates_chiffres : %', sqlerrm;
end $$;

commit;

notify pgrst, 'reload schema';

-- ce qui est en place
select 'chiffres des dates' as "élément",
  case when exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'crescite_dates_chiffres')
        and (select count(*) from pg_policies where schemaname = 'public' and tablename = 'crescite_dates_chiffres'
                                                and policyname like 'chiffres\_%') = 4
    then 'prêts : l''administration les écrit, l''équipe les lit, le public n''y a aucun droit'
    else 'incomplets : relancez ce script' end as "état"
union all
select 'dates chiffrées', (select case count(*) when 0 then 'aucune pour l''instant' when 1 then 'une date'
                                  else count(*) || ' dates' end from public.crescite_dates_chiffres);
