-- Crescite : un document public pour les programmateurs ET les établissements scolaires (un dossier commun aux deux).
-- À exécuter après les sept premiers scripts, de la même façon (SQL Editor → New query → coller → Run). Il peut être
-- relancé sans dommage et ne touche qu'à ce qui commence par crescite_.
--
-- Ce que le script ajoute :
--   crescite_documents.pour      + 'tous' (et 'pros_scolaires', son ancien nom, accepté aussi) : un document public
--                                montré aux programmateurs comme aux établissements, rangé comme les autres dans le
--                                stockage public « crescite », sous documents/<spectacle>/
--   public_lecture               la règle de lecture des documents publics (troisième script), refaite avec ces valeurs :
--                                tout le monde, connecté ou non, lit les documents publics des spectacles publiés
--   crescite_pro_documents_de    les documents qu'une invitation de l'espace pro ouvre (quatrième script) : ceux des
--                                salles et ceux des programmateurs, dont ces documents communs
-- La liste complète des valeurs est aussi dans les troisième et quatrième scripts : les relancer après celui-ci ne
-- refuse pas les documents communs, et ne retire rien de ce qu'il ouvre.

begin;

alter table public.crescite_documents drop constraint if exists crescite_documents_pour_check;
alter table public.crescite_documents add constraint crescite_documents_pour_check
  check (pour in ('equipe', 'administration', 'pros', 'scolaires', 'salles', 'tous', 'pros_scolaires'));

-- une seule règle de lecture publique, pour tous (la première version de ce script en ajoutait une seconde, pour anon)
drop policy if exists crescite_documents_public on public.crescite_documents;
drop policy if exists public_lecture on public.crescite_documents;
create policy public_lecture on public.crescite_documents for select to anon, authenticated
  using (pour in ('pros', 'scolaires', 'tous', 'pros_scolaires') and (spectacle_id is null
         or exists (select 1 from public.crescite_spectacles s where s.id = spectacle_id and s.publie)));
grant select on public.crescite_documents to anon;

-- les documents qu'une invitation ouvre : ceux des salles et ceux des programmateurs (communs compris), pour ses spectacles
create or replace function public.crescite_pro_documents_de(a public.crescite_acces_pro) returns setof public.crescite_documents
language sql stable security definer set search_path = public as $$
  select d.* from public.crescite_documents d
  where d.pour in ('salles', 'pros', 'tous', 'pros_scolaires') and d.spectacle_id is not null
    and (case when coalesce(cardinality(a.spectacles), 0) = 0
              then exists (select 1 from public.crescite_documents x where x.spectacle_id = d.spectacle_id and x.pour = 'salles')
              else d.spectacle_id = any (a.spectacles) end)
$$;
revoke execute on function public.crescite_pro_documents_de(public.crescite_acces_pro) from anon, authenticated, public;

commit;

notify pgrst, 'reload schema';

-- ce qui est en place
select 'documents communs' as "élément",
  case when (select count(*) from pg_policies where schemaname = 'public' and tablename = 'crescite_documents'
                                              and cmd = 'SELECT' and 'anon' = any (roles)) = 1
    then 'prêts : programmateurs et établissements les lisent, une seule règle de lecture publique'
    else 'plusieurs règles de lecture publique : relancez ce script' end as "état"
union all
select 'documents publics', (select case when n = 0 then 'aucun pour l''instant'
                                          else n || case when n = 1 then ' document' else ' documents' end
                                               || case c when 0 then ', aucun commun pour l''instant' when 1 then ', dont un commun'
                                                         else ', dont ' || c || ' communs' end end
                             from (select count(*) filter (where pour in ('pros', 'scolaires', 'tous', 'pros_scolaires')) n,
                                          count(*) filter (where pour in ('tous', 'pros_scolaires')) c
                                   from public.crescite_documents) x);
