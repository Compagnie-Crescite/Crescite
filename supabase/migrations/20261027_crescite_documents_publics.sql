-- Crescite : documents publics pour programmateurs ET établissements scolaires
--
-- Permet à un document public d'être marqué 'tous' (ou 'pros_scolaires') pour être affiché
-- à la fois sur l'espace pro / programmateurs et sur l'espace établissements scolaires.
--
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor -> New query -> coller -> Run).
-- Le script est idempotent et peut être relancé sans dommage.

begin;

alter table public.crescite_documents drop constraint if exists crescite_documents_pour_check;
alter table public.crescite_documents add constraint crescite_documents_pour_check
  check (pour in ('equipe', 'administration', 'pros', 'scolaires', 'salles', 'tous', 'pros_scolaires'));

-- Mise à jour de la politique de lecture publique (RLS) pour les visiteurs anonymes
drop policy if exists "crescite_documents_public" on public.crescite_documents;
create policy "crescite_documents_public" on public.crescite_documents
  for select to anon
  using (pour in ('pros', 'scolaires', 'tous', 'pros_scolaires') and (spectacle_id is null
         or exists (select 1 from public.crescite_spectacles s where s.id = crescite_documents.spectacle_id and s.publie)));

-- Mise à jour de la fonction des documents pour l'espace pro (salles invitées)
create or replace function public.crescite_pro_documents_de(a public.crescite_acces_pro) returns setof public.crescite_documents
language sql stable security definer set search_path = public as $$
  select d.* from public.crescite_documents d
  where d.pour in ('salles', 'pros', 'tous', 'pros_scolaires') and d.spectacle_id is not null
    and (case when coalesce(cardinality(a.spectacles), 0) = 0
              then exists (select 1 from public.crescite_documents x where x.spectacle_id = d.spectacle_id and x.pour = 'salles')
              else d.spectacle_id = any (a.spectacles) end)
$$;

commit;
