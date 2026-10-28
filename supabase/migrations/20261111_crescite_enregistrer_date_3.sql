-- Crescite : l'enregistrement d'une date en une seule fois, version 3 (le vingt-quatrième script). À exécuter après les
-- précédents, de la même façon (SQL Editor → New query → coller → Run). Il peut être relancé sans dommage et ne touche
-- qu'à ce qui commence par crescite_.
--
-- Ce que le script change :
--   crescite_enregistrer_date(d)   la même fonction, la même signature, les mêmes droits (l'administration seule) ; ce qui
--                                  change, c'est ce qu'elle fait d'une clé que l'appelant n'a pas envoyée.
--                                  Avant (version 2) : une clé absente effaçait la valeur. Désormais : une clé absente
--                                  GARDE la valeur. Deux familles de colonnes :
--                                    · celles qui peuvent rester vides (lieu_id, fin, intitule, lien, nb_representations ;
--                                      dans une séance : heure, fin, lien, note) : clé absente = gardée, clé présente à
--                                      null (ou vide) = effacée ;
--                                    · celles qui ne peuvent pas l'être (spectacle_id, debut, precision, saison, public,
--                                      statut, visible, details, nature ; dans une séance : public, annulee) : clé absente
--                                      ou nulle = gardée. Elles ne sont obligatoires qu'à la création d'une date.
--                                  Les séances : la clé « representations » présente remplace toutes les séances de la
--                                  date (comme avant : celles qui ne sont pas dans la liste sont retirées) ; absente, elles
--                                  restent. Dans chaque séance seul « jour » est obligatoire. Une séance, une date, un
--                                  suivi, des chiffres ou une équipe qui ne changent pas ne sont pas réécrits : pas de
--                                  ligne de journal pour rien, pas de fausse notification « Date déplacée ».
--                                  Trois clés neuves, dans le même appel donc dans la même transaction (tout passe, ou
--                                  rien) :
--                                    suivi.montant_cession   le montant de cession HT (avec les quatre colonnes de
--                                                            toujours : organisateur, contact, contrat, notes ; chacune
--                                                            gardée si sa clé est absente, vide = effacée)
--                                    chiffres                { jauge, spectateurs, heures_ateliers, source } : gardés
--                                                            un à un si la clé est absente ; la ligne est supprimée
--                                                            quand la jauge, les spectateurs et les heures sont vides
--                                    equipe                  [{ personne_id, present, fonction, note }] : la liste
--                                                            voulue pour cette date ; les personnes qui n'y sont pas
--                                                            sont retirées de la date, les autres écrites si elles
--                                                            diffèrent (la même règle que la fiche d'une date)
--   crescite_capacites()           ce que la base sait faire, pour que l'administration n'ait pas à le deviner :
--                                  { enregistrer_date: 3 | 2, montant_cession, equipe, chiffres }. Le « 3 » n'est pas
--                                  une constante : il est lu dans le texte de la fonction d'enregistrement (le marqueur
--                                  « version 3 » de son corps). Relancer le troisième script (20261022) remet la version 2 :
--                                  la sonde le dit alors (2), et l'administration retombe sur des écritures séparées au
--                                  lieu de perdre sans bruit les chiffres, l'équipe et le montant.
-- Les quatre colonnes de diffusion du suivi des dates (etape_crm, date_dernier_contact, date_prochaine_relance,
-- notes_diffusion) ne sont ni lues ni écrites : la piste de diffusion porte ce suivi (vingt-deuxième script).
-- Les déclencheurs (la saison, les bornes de la date, la nature, les horaires, les notifications, le journal) jouent
-- comme avant, dans la même transaction.
--
-- Si vous relancez le troisième script (20261022_crescite_notifications.sql), relancez ensuite le vingt-et-unième, le
-- vingt-troisième et celui-ci : le troisième remet la version 2 de l'enregistrement et les anciennes fonctions de
-- notification et d'équipe d'une date.

begin;

do $$ begin
  if to_regprocedure('public.crescite_enregistrer_date(jsonb)') is null or to_regclass('public.crescite_dates_suivi') is null
     or to_regclass('public.crescite_representations') is null then
    raise exception 'Lancez d''abord les scripts précédents (au moins 20261020_crescite_base.sql et 20261022_crescite_notifications.sql).';
  end if;
end $$;

-- ------------------------------------------------------------------------------------------------ l'enregistrement d'une date

create or replace function public.crescite_enregistrer_date(d jsonb) returns bigint
language plpgsql security invoker set search_path = public as $$
-- version 3 (ce marqueur est lu par crescite_capacites() : ne pas le retirer)
declare
  did bigint := nullif(d ->> 'id', '')::bigint;
  date_av public.crescite_dates;                 -- la date telle qu'elle est, puis telle qu'elle doit devenir
  date_ap public.crescite_dates;
  r jsonb;
  rid bigint;
  garder bigint[] := '{}';
  seance_av public.crescite_representations;
  seance_ap public.crescite_representations;
  s jsonb := d -> 'suivi';
  suivi_av public.crescite_dates_suivi;
  organisateur_ap text; contact_ap text; contrat_ap text; notes_ap text; montant_ap numeric(10, 2);
  avec_montant boolean := exists (select 1 from information_schema.columns
                                   where table_schema = 'public' and table_name = 'crescite_dates_suivi' and column_name = 'montant_cession');
  c jsonb := d -> 'chiffres';
  jauge_ap integer; spectateurs_ap integer; heures_ap numeric(7, 1); source_ap text;
  voulus bigint[];
begin
  if not public.crescite_est_admin() then
    raise exception 'Réservé aux administrateurs de la compagnie' using errcode = '42501';
  end if;

  if did is null then
    -- une date neuve : le spectacle et le début sont obligatoires (la base refuse leur absence)
    insert into public.crescite_dates (spectacle_id, lieu_id, debut, fin, precision, saison, public, statut, visible,
                                       intitule, details, lien, nb_representations, nature)
    values ((d ->> 'spectacle_id')::bigint, nullif(d ->> 'lieu_id', '')::bigint, (d ->> 'debut')::date,
            nullif(d ->> 'fin', '')::date, coalesce(nullif(d ->> 'precision', ''), 'jour'), nullif(d ->> 'saison', ''),
            coalesce(nullif(d ->> 'public', ''), 'tout_public'), coalesce(nullif(d ->> 'statut', ''), 'confirmee'),
            coalesce(nullif(d ->> 'visible', '')::boolean, true), nullif(d ->> 'intitule', ''),
            case when jsonb_typeof(d -> 'details') = 'array' then d -> 'details' else '[]'::jsonb end,
            nullif(d ->> 'lien', ''), nullif(d ->> 'nb_representations', '')::smallint,
            coalesce(nullif(d ->> 'nature', ''), 'representations'))
    returning id into did;
  else
    select * into date_av from public.crescite_dates where id = did for update;
    if not found then raise exception 'Date % introuvable', did; end if;
    date_ap := date_av;
    -- les colonnes qui ne peuvent pas être vides : clé absente ou nulle = gardée
    date_ap.spectacle_id := coalesce(nullif(d ->> 'spectacle_id', '')::bigint, date_av.spectacle_id);
    date_ap.debut := coalesce(nullif(d ->> 'debut', '')::date, date_av.debut);
    date_ap.precision := coalesce(nullif(d ->> 'precision', ''), date_av.precision);
    date_ap.saison := coalesce(nullif(d ->> 'saison', ''), date_av.saison);   -- (le déclencheur la recalcule si le début change)
    date_ap.public := coalesce(nullif(d ->> 'public', ''), date_av.public);
    date_ap.statut := coalesce(nullif(d ->> 'statut', ''), date_av.statut);
    date_ap.visible := coalesce(nullif(d ->> 'visible', '')::boolean, date_av.visible);
    date_ap.details := case when jsonb_typeof(d -> 'details') = 'array' then d -> 'details' else date_av.details end;
    date_ap.nature := coalesce(nullif(d ->> 'nature', ''), date_av.nature);
    -- celles qui peuvent l'être : clé absente = gardée, clé présente à null = effacée
    date_ap.lieu_id := case when d ? 'lieu_id' then nullif(d ->> 'lieu_id', '')::bigint else date_av.lieu_id end;
    date_ap.fin := case when d ? 'fin' then nullif(d ->> 'fin', '')::date else date_av.fin end;
    date_ap.intitule := case when d ? 'intitule' then nullif(d ->> 'intitule', '') else date_av.intitule end;
    date_ap.lien := case when d ? 'lien' then nullif(d ->> 'lien', '') else date_av.lien end;
    date_ap.nb_representations := case when d ? 'nb_representations' then nullif(d ->> 'nb_representations', '')::smallint
                                       else date_av.nb_representations end;
    date_ap.fin := coalesce(date_ap.fin, date_ap.debut);   -- (comme le fait le déclencheur : une fin vide devient le début)
    if date_ap is distinct from date_av then
      update public.crescite_dates set
        spectacle_id = date_ap.spectacle_id, lieu_id = date_ap.lieu_id, debut = date_ap.debut, fin = date_ap.fin,
        precision = date_ap.precision, saison = date_ap.saison, public = date_ap.public, statut = date_ap.statut,
        visible = date_ap.visible, intitule = date_ap.intitule, details = date_ap.details, lien = date_ap.lien,
        nb_representations = date_ap.nb_representations, nature = date_ap.nature
      where id = did;
    end if;
  end if;

  -- les séances : la clé présente remplace la liste entière ; dans chacune, une clé absente garde sa valeur
  if jsonb_typeof(d -> 'representations') = 'array' then
    for r in select * from jsonb_array_elements(d -> 'representations') loop
      rid := nullif(r ->> 'id', '')::bigint;
      if nullif(r ->> 'jour', '') is null then
        raise exception 'Chaque séance a besoin de son jour' using errcode = '22023';
      end if;
      if rid is null then
        insert into public.crescite_representations (date_id, jour, heure, fin, public, annulee, lien, note)
        values (did, (r ->> 'jour')::date, nullif(r ->> 'heure', '')::time, nullif(r ->> 'fin', '')::time,
                coalesce(nullif(r ->> 'public', ''), 'tout_public'),
                coalesce(nullif(r ->> 'annulee', '')::boolean, false), nullif(r ->> 'lien', ''), nullif(r ->> 'note', ''))
        returning id into rid;
      else
        select * into seance_av from public.crescite_representations where id = rid and date_id = did;
        if found then
          seance_ap := seance_av;
          seance_ap.jour := (r ->> 'jour')::date;
          seance_ap.heure := case when r ? 'heure' then nullif(r ->> 'heure', '')::time else seance_av.heure end;
          seance_ap.fin := case when r ? 'fin' then nullif(r ->> 'fin', '')::time else seance_av.fin end;
          seance_ap.lien := case when r ? 'lien' then nullif(r ->> 'lien', '') else seance_av.lien end;
          seance_ap.note := case when r ? 'note' then nullif(r ->> 'note', '') else seance_av.note end;
          seance_ap.public := coalesce(nullif(r ->> 'public', ''), seance_av.public);
          seance_ap.annulee := coalesce(nullif(r ->> 'annulee', '')::boolean, seance_av.annulee);
          if seance_ap is distinct from seance_av then
            update public.crescite_representations set jour = seance_ap.jour, heure = seance_ap.heure, fin = seance_ap.fin,
              public = seance_ap.public, annulee = seance_ap.annulee, lien = seance_ap.lien, note = seance_ap.note
            where id = rid and date_id = did;
          end if;
        end if;
      end if;
      garder := garder || rid;
    end loop;
    delete from public.crescite_representations where date_id = did and not (id = any (garder));
  end if;

  -- le suivi interne : les quatre colonnes de toujours et le montant de cession (quand la base l'a) ; une clé absente
  -- garde la valeur, une clé vide l'efface ; la ligne n'est réécrite que si quelque chose change
  if jsonb_typeof(s) = 'object' then
    select * into suivi_av from public.crescite_dates_suivi where date_id = did;
    organisateur_ap := case when s ? 'organisateur' then nullif(s ->> 'organisateur', '') else suivi_av.organisateur end;
    contact_ap := case when s ? 'contact' then nullif(s ->> 'contact', '') else suivi_av.contact end;
    contrat_ap := case when s ? 'contrat' then nullif(s ->> 'contrat', '') else suivi_av.contrat end;
    notes_ap := case when s ? 'notes' then nullif(s ->> 'notes', '') else suivi_av.notes end;
    if avec_montant then
      montant_ap := case when s ? 'montant_cession' then nullif(s ->> 'montant_cession', '')::numeric(10, 2) else suivi_av.montant_cession end;
      insert into public.crescite_dates_suivi (date_id, organisateur, contact, contrat, notes, montant_cession)
      values (did, organisateur_ap, contact_ap, contrat_ap, notes_ap, montant_ap)
      on conflict (date_id) do update set organisateur = excluded.organisateur, contact = excluded.contact,
        contrat = excluded.contrat, notes = excluded.notes, montant_cession = excluded.montant_cession
      where (crescite_dates_suivi.organisateur, crescite_dates_suivi.contact, crescite_dates_suivi.contrat,
             crescite_dates_suivi.notes, crescite_dates_suivi.montant_cession)
            is distinct from (excluded.organisateur, excluded.contact, excluded.contrat, excluded.notes, excluded.montant_cession);
    else
      insert into public.crescite_dates_suivi (date_id, organisateur, contact, contrat, notes)
      values (did, organisateur_ap, contact_ap, contrat_ap, notes_ap)
      on conflict (date_id) do update set organisateur = excluded.organisateur, contact = excluded.contact,
        contrat = excluded.contrat, notes = excluded.notes
      where (crescite_dates_suivi.organisateur, crescite_dates_suivi.contact, crescite_dates_suivi.contrat, crescite_dates_suivi.notes)
            is distinct from (excluded.organisateur, excluded.contact, excluded.contrat, excluded.notes);
    end if;
  end if;

  -- les chiffres (le script des chiffres) : gardés un à un si la clé est absente ; tout vide (jauge, spectateurs,
  -- heures et source, comme ecrireChiffres dans l'administration : une source saisie seule garde la ligne) : la ligne
  -- est supprimée
  if jsonb_typeof(c) = 'object' and to_regclass('public.crescite_dates_chiffres') is not null then
    select jauge, spectateurs, heures_ateliers, source into jauge_ap, spectateurs_ap, heures_ap, source_ap
      from public.crescite_dates_chiffres where date_id = did;
    if c ? 'jauge' then jauge_ap := round(nullif(c ->> 'jauge', '')::numeric)::integer; end if;
    if c ? 'spectateurs' then spectateurs_ap := round(nullif(c ->> 'spectateurs', '')::numeric)::integer; end if;
    if c ? 'heures_ateliers' then heures_ap := nullif(c ->> 'heures_ateliers', '')::numeric(7, 1); end if;
    if c ? 'source' then source_ap := nullif(btrim(c ->> 'source'), ''); end if;
    if jauge_ap is null and spectateurs_ap is null and heures_ap is null and source_ap is null then
      delete from public.crescite_dates_chiffres where date_id = did;
    else
      insert into public.crescite_dates_chiffres (date_id, jauge, spectateurs, heures_ateliers, source)
      values (did, jauge_ap, spectateurs_ap, heures_ap, source_ap)
      on conflict (date_id) do update set jauge = excluded.jauge, spectateurs = excluded.spectateurs,
        heures_ateliers = excluded.heures_ateliers, source = excluded.source
      where (crescite_dates_chiffres.jauge, crescite_dates_chiffres.spectateurs, crescite_dates_chiffres.heures_ateliers,
             crescite_dates_chiffres.source)
            is distinct from (excluded.jauge, excluded.spectateurs, excluded.heures_ateliers, excluded.source);
    end if;
  end if;

  -- l'équipe (le script de l'équipe) : la liste voulue ; les autres personnes sont retirées de la date, les voulues
  -- écrites seulement si elles diffèrent (la table a un déclencheur et un journal)
  if jsonb_typeof(d -> 'equipe') = 'array' and to_regclass('public.crescite_equipes') is not null then
    voulus := array(select (x ->> 'personne_id')::bigint from jsonb_array_elements(d -> 'equipe') x
                     where nullif(x ->> 'personne_id', '') is not null);
    delete from public.crescite_equipes where date_id = did and not (personne_id = any (voulus));
    for r in select * from jsonb_array_elements(d -> 'equipe') loop
      continue when nullif(r ->> 'personne_id', '') is null;
      insert into public.crescite_equipes (date_id, personne_id, present, fonction, note)
      values (did, (r ->> 'personne_id')::bigint, coalesce(nullif(r ->> 'present', '')::boolean, true),
              nullif(btrim(r ->> 'fonction'), ''), nullif(btrim(r ->> 'note'), ''))
      on conflict (date_id, personne_id) do update set present = excluded.present, fonction = excluded.fonction, note = excluded.note
      where (crescite_equipes.present, crescite_equipes.fonction, crescite_equipes.note)
            is distinct from (excluded.present, excluded.fonction, excluded.note);
    end loop;
  end if;
  return did;
end;
$$;

grant execute on function public.crescite_enregistrer_date(jsonb) to authenticated;
revoke execute on function public.crescite_enregistrer_date(jsonb) from anon, public;

-- ------------------------------------------------------------------------------------------------ ce que la base sait faire

-- l'administration la lit au chargement : la version de l'enregistrement est lue dans le texte de la fonction (jamais une
-- constante : relancer le troisième script remet la version 2), le reste dans ce qui est installé
create or replace function public.crescite_capacites() returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'enregistrer_date', case when position('version 3' in pg_get_functiondef('public.crescite_enregistrer_date(jsonb)'::regprocedure)) > 0 then 3 else 2 end,
    'montant_cession', exists (select 1 from information_schema.columns
                                where table_schema = 'public' and table_name = 'crescite_dates_suivi' and column_name = 'montant_cession'),
    'equipe', to_regclass('public.crescite_equipes') is not null,
    'chiffres', to_regclass('public.crescite_dates_chiffres') is not null)
$$;
grant execute on function public.crescite_capacites() to authenticated;
revoke execute on function public.crescite_capacites() from anon, public;

commit;

notify pgrst, 'reload schema';

-- ce qui est en place
select 'enregistrement d''une date' as "élément",
  case when to_regprocedure('public.crescite_capacites()') is not null
        and position('version 3' in pg_get_functiondef('public.crescite_enregistrer_date(jsonb)'::regprocedure)) > 0
    then 'version 3 : une clé absente garde sa valeur, et le suivi, les chiffres et l''équipe s''enregistrent avec la date, en une fois'
    else 'à refaire : relancez ce script' end as "état"
union all
select 'ce que la base sait faire',
  case when to_regprocedure('public.crescite_capacites()') is not null
    then 'montant de cession : ' || case when exists (select 1 from information_schema.columns where table_schema = 'public'
                                                         and table_name = 'crescite_dates_suivi' and column_name = 'montant_cession')
                                         then 'oui' else 'non' end
         || ' · chiffres : ' || case when to_regclass('public.crescite_dates_chiffres') is not null then 'oui' else 'non' end
         || ' · équipe : ' || case when to_regclass('public.crescite_equipes') is not null then 'oui' else 'non' end
    else 'à refaire : relancez ce script' end;
