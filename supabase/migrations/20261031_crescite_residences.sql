-- Crescite : les semaines de résidence peuvent aller sur le site (demande de la compagnie, octobre 2026 : « Ajoute les
-- semaines de résidence »). À exécuter après les dix premiers scripts (le onzième, s'il attend encore, n'y change rien), de
-- la même façon (SQL Editor → New query → coller → Run). Il peut être relancé sans dommage et ne touche qu'à ce qui
-- commence par crescite_.
--
-- Jusqu'ici, seules les représentations allaient sur le site : une date d'une autre nature était masquée d'office (le
-- déclencheur crescite_dates_nature remettait sa case « visible » à faux). Désormais une résidence se montre ou non,
-- comme une représentation : sa case « visible » décide. Les répétitions et les dates « autre » restent pour l'équipe.
-- Le script ne montre rien de lui-même : les résidences déjà saisies restent masquées tant qu'on ne les montre pas (le
-- site les marque « Résidence », sans réservation, hors des cartes et des chiffres des représentations ; les alertes de
-- tournée ne prennent que des représentations).

begin;

create or replace function public.crescite_dates_nature() returns trigger
language plpgsql as $$
begin
  -- une répétition, une date « autre » : jamais sur le site ; une représentation, une résidence : sa case « visible »
  if new.nature not in ('representations', 'residence') then new.visible := false; end if;
  return new;
end;
$$;

commit;

notify pgrst, 'reload schema';

-- ce qui est en place
select 'résidences' as "élément",
  case when position('residence' in pg_get_functiondef('public.crescite_dates_nature()'::regprocedure)) > 0
    then 'prêtes : une résidence peut aller sur le site, sa case « visible » décide ; les répétitions restent pour l''équipe'
    else 'à refaire : relancez ce script' end as "état"
union all
select 'résidences saisies', (select case count(*) when 0 then 'aucune' else count(*) || ' (' || count(*) filter (where visible) || ' visibles sur le site)' end
                              from public.crescite_dates where nature = 'residence');
