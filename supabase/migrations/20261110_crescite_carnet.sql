-- Crescite : l'équipe d'une date en un seul endroit, et le carnet des lieux (le vingt-troisième script). À exécuter après
-- les précédents, de la même façon (SQL Editor → New query → coller → Run). Il peut être relancé sans dommage et ne
-- touche qu'à ce qui commence par crescite_.
--
-- Ce que le script ajoute :
--   crescite_equipe_date      (une vue) qui part sur une date : la distribution « en tournée » du spectacle, moins les
--                             personnes retirées de la date, plus ses renforts ; la fonction de la date remplace celle
--                             de la distribution (la règle de l'administration et de l'espace de l'équipe). Les
--                             notifications (crescite_membres_date) et les droits de lecture (crescite_membre_date) la
--                             lisent : une seule règle, trois usages.
--   crescite_contacts         les contacts d'un lieu (direction, régie, accueil…) : plusieurs par lieu, chacun son rôle,
--                             son téléphone, son adresse ; « sur la feuille de route » les écrit dans la rubrique
--                             « Adresses et contacts » des feuilles des dates de ce lieu.
--   crescite_hebergements     les hébergements près d'un lieu (hôtel, gîte, logement chez l'habitant) : la feuille de
--                             route les propose comme rubrique Hébergement.
-- Le carnet ne se lit que dans l'administration (jamais publié, jamais lu par l'espace de l'équipe : ce que la feuille
-- en reprend, l'équipe le lit dans la feuille publiée). Il va au journal, comme le reste.

begin;

do $$ begin
  if to_regclass('public.crescite_equipes') is null or to_regprocedure('public.crescite_membres_date(bigint)') is null then
    raise exception 'Lancez d''abord les scripts de l''équipe (20261021_crescite_equipe.sql) et des notifications (20261022_crescite_notifications.sql).';
  end if;
end $$;

-- ------------------------------------------------------------------------------------------------ l'équipe d'une date

-- (deux parties, pour que « where date_id = … » se pose sur chacune et que la base ne lise que cette date)
create or replace view public.crescite_equipe_date with (security_invoker = true) as
  select x.id as date_id, di.personne_id,
         coalesce(nullif(max(e.fonction), ''),
                  string_agg(case when di.categorie = 'jeu' then coalesce(nullif(di.fonction, ''), 'Jeu') || coalesce(' (' || nullif(di.role, '') || ')', '')
                                  else coalesce(nullif(di.fonction, ''), case di.categorie when 'creation' then 'Création' when 'technique' then 'Technique'
                                                                                         when 'production' then 'Production' else di.categorie end) end,
                             ', ' order by di.ordre, di.id)) as fonction,
         max(e.note) as note,
         false as ajout
    from public.crescite_dates x
    join public.crescite_distributions di on di.spectacle_id = x.spectacle_id and di.en_tournee
    left join public.crescite_equipes e on e.date_id = x.id and e.personne_id = di.personne_id
   where e.present is distinct from false
   group by x.id, di.personne_id
  union all
  select e.date_id, e.personne_id, coalesce(e.fonction, ''), e.note, true
    from public.crescite_equipes e
    join public.crescite_dates x on x.id = e.date_id
   where e.present
     and not exists (select 1 from public.crescite_distributions di
                      where di.spectacle_id = x.spectacle_id and di.en_tournee and di.personne_id = e.personne_id);

comment on view public.crescite_equipe_date is 'Qui part sur une date (distribution en tournée, corrigée par l''équipe de la date) ; fonction : celle de la date, sinon celle de la distribution.';
revoke all on public.crescite_equipe_date from anon, public;
grant select on public.crescite_equipe_date to authenticated, service_role;

-- les deux fonctions de toujours, sur la vue (mêmes noms, mêmes résultats : les politiques et les déclencheurs qui les
-- appellent ne changent pas)
create or replace function public.crescite_membre_date(d bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.crescite_equipe_date q where q.date_id = d and q.personne_id = public.crescite_moi())
$$;

create or replace function public.crescite_membres_date(d bigint) returns setof bigint
language sql stable security definer set search_path = public as $$
  select distinct q.personne_id from public.crescite_equipe_date q
   where q.date_id = d
     and exists (select 1 from public.crescite_personnes_privees v where v.personne_id = q.personne_id and v.user_id is not null)
$$;
revoke all on function public.crescite_membres_date(bigint) from anon, authenticated, public;
grant execute on function public.crescite_membre_date(bigint) to authenticated;

-- ------------------------------------------------------------------------------------------------ le carnet des lieux

create table if not exists public.crescite_contacts (
  id bigint generated by default as identity primary key,
  lieu_id bigint not null references public.crescite_lieux (id) on delete cascade,
  nom text not null check (btrim(nom) <> ''),
  role text,                                       -- « Direction », « Régie générale », « Accueil des compagnies »…
  telephone text,
  email text,
  sur_feuille boolean not null default false,      -- écrit dans les feuilles de route des dates de ce lieu
  notes text,
  ordre integer not null default 100,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  modifie_par uuid
);
create index if not exists crescite_contacts_lieu on public.crescite_contacts (lieu_id, ordre);

create table if not exists public.crescite_hebergements (
  id bigint generated by default as identity primary key,
  lieu_id bigint not null references public.crescite_lieux (id) on delete cascade,
  nom text not null check (btrim(nom) <> ''),      -- « Hôtel de la Gare »
  genre text not null default 'hotel' check (genre in ('hotel', 'gite', 'habitant', 'autre')),
  adresse text,
  commune text,
  telephone text,
  email text,
  site_web text,
  prix text,                                       -- « 72 € la chambre, petit-déjeuner compris »
  details text,                                    -- accueil tardif, parking, code de la boîte à clés…
  ordre integer not null default 100,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  modifie_par uuid
);
create index if not exists crescite_hebergements_lieu on public.crescite_hebergements (lieu_id, ordre);

do $$
declare t text;
begin
  foreach t in array array['crescite_contacts', 'crescite_hebergements'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists carnet_admin on public.%I', t);
    execute format('create policy carnet_admin on public.%I for all to authenticated using ((select public.crescite_est_admin())) with check ((select public.crescite_est_admin()))', t);
    execute format('revoke all on public.%I from anon, public', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('drop trigger if exists %I on public.%I', t || '_touche', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.crescite_touche()', t || '_touche', t);
    execute format('drop trigger if exists %I on public.%I', t || '_journal', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.crescite_journaliser()', t || '_journal', t);
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when others then raise notice 'temps réel, % : %', t, sqlerrm;
    end;
  end loop;
end $$;

commit;

notify pgrst, 'reload schema';

select 'équipe d''une date et carnet des lieux', case when to_regclass('public.crescite_equipe_date') is not null
  and to_regclass('public.crescite_contacts') is not null and to_regclass('public.crescite_hebergements') is not null then 'oui' else 'incomplet : relancez ce script' end;
