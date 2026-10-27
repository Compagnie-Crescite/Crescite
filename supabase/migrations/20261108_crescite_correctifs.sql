-- Crescite : les correctifs de l'audit du 27 octobre 2026 (le vingt-et-unième script). À exécuter après les précédents, de la
-- même façon (SQL Editor → New query → coller → Run). Il peut être relancé sans dommage et ne touche qu'à ce qui
-- commence par crescite_. Il redéfinit des fonctions et des déclencheurs ; il ne change aucune table.
--
-- Ce que le script corrige :
--   les messages perdus        un « Prévenir l'équipe » envoyé moins d'un quart d'heure après un autre remplaçait le
--                              premier (non lu) et ne partait pas sur les téléphones ; deux propositions de dates, ou les
--                              réponses de deux personnes, se fondaient en une. Un message ne se fond plus jamais ; une
--                              proposition seulement avec elle-même (même lien, même titre).
--   les feuilles de route      republiée pour une date passée, elle ne prévient plus ; repassée en brouillon, elle dit à
--                              l'équipe qu'elle est retirée.
--   l'équipe d'une date neuve  les absents posés à la création de la date ne reçoivent plus « Vous ne partez plus sur une
--                              date » (et l'annonce « Nouvelle date » qu'ils venaient de recevoir s'efface).
--   une date déplacée          un changement de début ou de fin prévient l'équipe (« Date déplacée »).
--   les propositions closes    on n'y répond plus, ni pour un jour passé (dans l'application comme par courriel).
--   le journal                 pistes de diffusion, demandes de devis, notes de frais, matériel, invitations à l'espace
--                              pro et propositions de dates y vont désormais (« Revenir », corbeille de 30 jours).
--   les notes internes         leur date de modification se tient à jour (le quinzième script cherchait une fonction
--                              qui n'existe pas).

begin;

-- ------------------------------------------------------------------------------------------------ les notifications
create or replace function public.crescite_notifier(personnes bigint[], genre text, titre_ text, texte_ text,
                                                     d bigint, s bigint, lien_ text) returns integer
language plpgsql security definer set search_path = public as $$
declare
  p bigint;
  n integer := 0;
begin
  foreach p in array coalesce(personnes, '{}') loop
    -- une notification non lue du même genre pour la même date, de moins d'un quart d'heure, est mise à jour plutôt que
    -- doublée (plusieurs horaires changés d'un coup : une seule) ; jamais un message ; une proposition seulement avec
    -- elle-même
    if genre <> 'message' then
      update public.crescite_notifications set titre = titre_, texte = texte_, lien = lien_, cree_le = now()
       where personne_id = p and type = genre and date_id is not distinct from d and lue_le is null
         and cree_le > now() - interval '15 minutes'
         and (genre <> 'proposition' or (lien is not distinct from lien_ and titre is not distinct from titre_));
    end if;
    if genre = 'message' or not found then
      insert into public.crescite_notifications (personne_id, type, titre, texte, date_id, spectacle_id, lien)
      values (p, genre, titre_, texte_, d, s, lien_);
    end if;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- une feuille de route publiée, republiée, ou retirée (repassée en brouillon) ; jamais pour une date passée
create or replace function public.crescite_notif_feuilles() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.crescite_a_venir(new.date_id) then return null; end if;
  if new.statut = 'publiee' and (tg_op = 'INSERT' or old.statut is distinct from 'publiee' or old.version is distinct from new.version) then
    perform public.crescite_notifier(array(select public.crescite_membres_date(new.date_id)), 'feuille',
      case when new.version > 1 then 'Feuille de route mise à jour' else 'Feuille de route publiée' end,
      public.crescite_date_texte(new.date_id) || case when new.version > 1 then ' · version ' || new.version else '' end,
      new.date_id, (select spectacle_id from public.crescite_dates where id = new.date_id), '#/feuille/' || new.date_id);
  elsif tg_op = 'UPDATE' and old.statut = 'publiee' and new.statut is distinct from 'publiee' then
    perform public.crescite_notifier(array(select public.crescite_membres_date(new.date_id)), 'feuille',
      'Feuille de route retirée', public.crescite_date_texte(new.date_id) || ' · elle sera republiée',
      new.date_id, (select spectacle_id from public.crescite_dates where id = new.date_id), '#/date/' || new.date_id);
  end if;
  return null;
end;
$$;

-- une date ajoutée, confirmée, annulée, reportée, déplacée, ou qui change de lieu
create or replace function public.crescite_notif_dates() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  titre_ text;
  quoi text := case new.nature when 'repetitions' then 'répétition' when 'residence' then 'résidence' else 'date' end;
begin
  if coalesce(new.fin, new.debut) < current_date then return null; end if;
  if tg_op = 'INSERT' then
    titre_ := case when new.statut = 'option' then 'Nouvelle option' else 'Nouvelle ' || quoi end;
  elsif new.statut is distinct from old.statut then
    titre_ := case new.statut when 'confirmee' then 'Date confirmée' when 'annulee' then 'Date annulée'
                              when 'reportee' then 'Date reportée' else 'Date en option' end;
  elsif new.lieu_id is distinct from old.lieu_id then
    titre_ := 'Changement de lieu';
  elsif new.debut is distinct from old.debut or new.fin is distinct from old.fin then
    titre_ := case when quoi = 'date' then 'Date déplacée' else initcap(quoi) || ' déplacée' end;
  else
    return null;
  end if;
  perform public.crescite_notifier(array(select public.crescite_membres_date(new.id)), 'date', titre_,
    public.crescite_date_texte(new.id), new.id, new.spectacle_id, '#/date/' || new.id);
  return null;
end;
$$;

-- une personne ajoutée à une date, ou retirée (par rapport à la distribution « en tournée »). Une date toute neuve (son
-- annonce a moins de deux minutes) : l'absent posé à la création n'est pas prévenu qu'il « ne part plus », et l'annonce
-- de la date qu'il venait de recevoir s'efface
create or replace function public.crescite_notif_equipes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record := coalesce(new, old);
  defaut boolean;
  part boolean;
begin
  if not public.crescite_a_venir(r.date_id) then return null; end if;
  if not exists (select 1 from public.crescite_personnes_privees v where v.personne_id = r.personne_id and v.user_id is not null) then
    return null;
  end if;
  select exists (select 1 from public.crescite_dates x join public.crescite_distributions di on di.spectacle_id = x.spectacle_id
                  where x.id = r.date_id and di.personne_id = r.personne_id and di.en_tournee) into defaut;
  if tg_op = 'DELETE' then part := defaut;                   -- la ligne retirée : retour à la distribution
  elsif tg_op = 'UPDATE' and new.present is not distinct from old.present then return null;
  else part := new.present;
  end if;
  if tg_op = 'DELETE' and old.present = defaut then return null; end if;
  if tg_op = 'INSERT' and new.present = defaut then return null; end if;
  if not part and exists (select 1 from public.crescite_notifications where date_id = r.date_id and type = 'date'
                           and cree_le > now() - interval '2 minutes') then
    delete from public.crescite_notifications where personne_id = r.personne_id and date_id = r.date_id and type = 'date'
       and lue_le is null and cree_le > now() - interval '2 minutes';
    return null;
  end if;
  perform public.crescite_notifier(array[r.personne_id], 'equipe',
    case when part then 'Vous partez sur une date' else 'Vous ne partez plus sur une date' end,
    public.crescite_date_texte(r.date_id), r.date_id, (select spectacle_id from public.crescite_dates where id = r.date_id),
    '#/date/' || r.date_id);
  return null;
end;
$$;

-- ------------------------------------------------------------------------------------------------ les propositions
-- un jour d'une proposition ouverte et pas encore passé (à Paris)
create or replace function public.crescite_jour_ouvert(jour bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.crescite_propositions_jours pj join public.crescite_propositions p on p.id = pj.proposition_id
                  where pj.id = jour and p.statut is distinct from 'close'
                    and (pj.fin at time zone 'Europe/Paris')::date >= public.crescite_aujourdhui_paris())
$$;

-- répondre (la personne elle-même, dans l'application) : pas à une proposition close ni pour un jour passé
create or replace function public.crescite_repondre(jour bigint, reponse_ text, commentaire_ text default null) returns void
language plpgsql security definer set search_path = public as $$
declare moi bigint := public.crescite_moi();
begin
  if moi is null then raise exception 'Réservé à l''équipe' using errcode = '42501'; end if;
  if not public.crescite_jour_ouvert(jour) then
    raise exception 'Cette proposition est close, ou ce jour est passé' using errcode = '22023';
  end if;
  update public.crescite_propositions_reponses set reponse = nullif(reponse_, ''), commentaire = nullif(btrim(commentaire_), ''),
    repondu_le = now()
  where jour_id = jour and personne_id = moi;
  if not found then raise exception 'Cette proposition ne vous est pas adressée' using errcode = '42501'; end if;
end;
$$;

-- répondre d'un clic dans le courriel (fonction crescite-courriel, avec la clé de la personne) : de même
create or replace function public.crescite_repondre_jeton(j text, jour bigint, reponse_ text) returns boolean
language plpgsql security definer set search_path = public as $$
declare d public.crescite_propositions_destinataires;
begin
  select * into d from public.crescite_propositions_destinataires where jeton = j and length(coalesce(j, '')) >= 32;
  if d.id is null or reponse_ not in ('oui', 'non', 'peut_etre') then return false; end if;
  if not public.crescite_jour_ouvert(jour) then return false; end if;
  update public.crescite_propositions_reponses r set reponse = reponse_, repondu_le = now()
  from public.crescite_propositions_jours pj
  where r.jour_id = jour and r.personne_id = d.personne_id and pj.id = r.jour_id and pj.proposition_id = d.proposition_id;
  return found;
end;
$$;
revoke all on function public.crescite_jour_ouvert(bigint) from public, anon;
grant execute on function public.crescite_jour_ouvert(bigint) to authenticated, service_role;

-- ------------------------------------------------------------------------------------------------ le journal
do $$
declare t text;
begin
  foreach t in array array['crescite_diffusion_prospects', 'crescite_devis_demandes', 'crescite_notes_frais', 'crescite_materiel',
                           'crescite_acces_pro', 'crescite_propositions'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists %I on public.%I', t || '_journal', t);
      execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.crescite_journaliser()', t || '_journal', t);
    end if;
  end loop;
end $$;

-- les notes internes : modifie_le et modifie_par comme sur les autres tables
do $$ begin
  if to_regclass('public.crescite_notes') is not null then
    execute 'drop trigger if exists crescite_notes_touche on public.crescite_notes';
    execute 'create trigger crescite_notes_touche before update on public.crescite_notes for each row execute function public.crescite_touche()';
  end if;
end $$;

commit;

notify pgrst, 'reload schema';

select 'correctifs', case when exists (select 1 from pg_trigger where tgname = 'crescite_diffusion_prospects_journal')
  and exists (select 1 from pg_proc where proname = 'crescite_jour_ouvert') then 'appliqués' else 'incomplets : relancez ce script' end;
