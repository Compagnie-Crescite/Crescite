-- Crescite : les préférences de chacun, gardées avec son compte. Ce qu'une personne règle une fois dans l'administration
-- ou dans l'espace de l'équipe, elle le retrouve sur tous ses appareils.
-- À exécuter après les cinq premiers scripts, de la même façon (SQL Editor → New query → coller → Run). Il peut être
-- relancé sans dommage et ne touche qu'à ce qui commence par crescite_.
--
-- Ce que le script ajoute :
--   crescite_preferences    une préférence par compte et par clé, sa valeur en JSON. Chacun ne lit et n'écrit que les
--                           siennes, l'administration comprise ; le public n'y a aucun droit.
-- Les clés en usage (toutes passent par admin/prefs.js, PREFS) :
--   planning.masques        [id…] les personnes masquées du planning par une administratrice (dans l'administration, et
--                           dans l'espace de l'équipe quand son compte administre) ; « Masquées » les fait revenir. Sa
--                           forme est celle d'une liste brute : l'espace de l'équipe la lit telle quelle.
--                           Avant ce script, la liste reste sur l'appareil, dans crescite-planning-masques (la clé que
--                           partagent l'administration et l'espace de l'équipe) ; elle passe dans la base à la première
--                           ouverture qui suit, et l'administration efface alors la clé de l'appareil.
--   accueil.tableau         la disposition du tableau de bord de l'administration (admin/tableau.js) : l'ordre, la
--                           taille et les réglages des tuiles, les colonnes, la page d'ouverture, le mémo. Avant ce
--                           script, elle reste sur l'appareil (crescite-prefs:<compte>, et l'ancienne clé
--                           crescite-admin-tableau) ; elle passe dans la base à la première ouverture qui suit.
--   representations.avant   le panneau « À compléter avant la tournée » de la rubrique Représentations : { ouvert, jours }
--                           (ouvert ou fermé, 30, 60 ou 90 jours). Avant ce script, sur l'appareil, comme les autres ;
--                           l'ancienne clé de l'appareil (crescite-admin-avant) passe dans la base puis s'efface.
-- Rien à migrer dans la base : les clés sont des lignes, pas des colonnes.

begin;

create table if not exists public.crescite_preferences (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cle text not null,                               -- « planning.masques »
  valeur jsonb not null default 'null',
  modifie_le timestamptz not null default now(),
  primary key (user_id, cle)
);

-- la date de la dernière modification
create or replace function public.crescite_preferences_touche() returns trigger
language plpgsql as $$
begin
  new.modifie_le := now();
  return new;
end;
$$;
drop trigger if exists crescite_preferences_touche on public.crescite_preferences;
create trigger crescite_preferences_touche before update on public.crescite_preferences
  for each row execute function public.crescite_preferences_touche();

-- ------------------------------------------------------------------------------------------------ règles d'accès

alter table public.crescite_preferences enable row level security;

-- les règles de ce script s'appellent pref_… : on les refait à chaque passage, sans toucher aux autres
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'crescite_preferences' and policyname like 'pref\_%' loop
    execute format('drop policy %I on public.crescite_preferences', p.policyname);
  end loop;
end $$;

-- chacun les siennes, et seulement les siennes
create policy pref_lecture on public.crescite_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy pref_ajout on public.crescite_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy pref_modification on public.crescite_preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy pref_suppression on public.crescite_preferences for delete to authenticated
  using (user_id = (select auth.uid()));

-- les droits : aux comptes connectés seulement
revoke all on public.crescite_preferences from anon, public;
grant select, insert, update, delete on public.crescite_preferences to authenticated;

commit;

notify pgrst, 'reload schema';

-- ce qui est en place
select 'préférences' as "élément",
  case when (select relrowsecurity from pg_class where oid = 'public.crescite_preferences'::regclass)
        and (select count(*) from pg_policies where schemaname = 'public' and tablename = 'crescite_preferences'
                                                and policyname like 'pref\_%') = 4
    then 'prêtes : chacun lit et écrit les siennes, le public n''y a aucun droit'
    else 'règles d''accès incomplètes : relancez ce script' end as "état"
union all
select 'personnes masquées du planning', 'gardées avec le compte (clé planning.masques) : '
  || (select case count(*) when 0 then 'aucune liste pour l''instant' when 1 then 'une liste' else count(*) || ' listes' end
      from public.crescite_preferences where cle = 'planning.masques');
