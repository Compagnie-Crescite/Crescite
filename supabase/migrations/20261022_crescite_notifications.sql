-- Crescite : les notifications de l'équipe, les répétitions, et les documents publics (pour les programmateurs et les
-- établissements scolaires). À exécuter après 20261020_crescite_base.sql et 20261021_crescite_equipe.sql, de la même
-- façon (SQL Editor → New query → coller → Run). Il peut être relancé sans dommage et ne touche qu'à ce qui commence
-- par crescite_ (plus l'extension pg_net de Supabase, qui sert à prévenir les téléphones).
--
-- Ce que le script ajoute :
--   crescite_dates.nature            représentations, répétitions, résidence, autre : seules les représentations vont
--                                    sur le site public ; les autres ne sont que pour l'équipe
--   crescite_representations.fin     l'heure de fin d'une séance (une répétition : 10h-18h)
--   crescite_documents.pour          + 'pros' et 'scolaires' : des documents publics (dossier artistique, fiche technique,
--                                    dossier pédagogique), rangés dans le stockage public « crescite », sous documents/
--   crescite_notifications           une notification par personne : feuille de route publiée, horaires changés (en
--                                    répétition comme en tournée), date ajoutée, confirmée, annulée, document ajouté,
--                                    départ ou retrait d'une date, message de l'administration. La base les écrit seule.
--   crescite_abonnements             les téléphones et ordinateurs abonnés aux notifications (Web Push)
--   crescite_secrets                 le jeton qui autorise la base à appeler la fonction d'envoi ; les clés d'envoi
--                                    (VAPID), créées par la fonction elle-même. Jamais lus par le site ni par l'équipe.
--   crescite_textes 'programmation'  le contact diffusion de la page « Je souhaite programmer » (l'administratrice, et
--                                    le courriel de la compagnie ; un téléphone seulement si l'administration en saisit un)
--   Cassandres                       son action culturelle n'est pas encore construite : elle reste en base, masquée
--                                    (action_culturelle.masquee), et le site ne la montre plus
-- L'envoi vers les téléphones passe par la fonction Supabase « crescite-push » (supabase/functions/crescite-push) :
-- tant qu'elle n'est pas déployée, les notifications restent dans l'application, rien ne casse.

begin;

-- ------------------------------------------------------------------------------------------------ répétitions et résidences
-- (les mêmes définitions que dans le script de base, pour une base déjà installée)

alter table public.crescite_dates add column if not exists nature text not null default 'representations';
do $$ begin
  alter table public.crescite_dates add constraint crescite_dates_nature_valeurs
    check (nature in ('representations', 'repetitions', 'residence', 'autre'));
exception when duplicate_object then null; end $$;
alter table public.crescite_representations add column if not exists fin time;

create or replace function public.crescite_dates_nature() returns trigger
language plpgsql as $$
begin
  if new.nature <> 'representations' then new.visible := false; end if;
  return new;
end;
$$;
drop trigger if exists crescite_dates_nature on public.crescite_dates;
create trigger crescite_dates_nature before insert or update on public.crescite_dates
  for each row execute function public.crescite_dates_nature();

create or replace function public.crescite_enregistrer_date(d jsonb) returns bigint
language plpgsql security invoker set search_path = public as $$
declare
  did bigint := nullif(d ->> 'id', '')::bigint;
  r jsonb;
  rid bigint;
  garder bigint[] := '{}';
begin
  if not public.crescite_est_admin() then
    raise exception 'Réservé aux administrateurs de la compagnie' using errcode = '42501';
  end if;
  if did is null then
    insert into public.crescite_dates (spectacle_id, lieu_id, debut, fin, precision, saison, public, statut, visible,
                                       intitule, details, lien, nb_representations, nature)
    values ((d ->> 'spectacle_id')::bigint, nullif(d ->> 'lieu_id', '')::bigint, (d ->> 'debut')::date,
            nullif(d ->> 'fin', '')::date, coalesce(nullif(d ->> 'precision', ''), 'jour'), nullif(d ->> 'saison', ''),
            coalesce(nullif(d ->> 'public', ''), 'tout_public'), coalesce(nullif(d ->> 'statut', ''), 'confirmee'),
            coalesce((d ->> 'visible')::boolean, true), nullif(d ->> 'intitule', ''), coalesce(d -> 'details', '[]'),
            nullif(d ->> 'lien', ''), nullif(d ->> 'nb_representations', '')::smallint,
            coalesce(nullif(d ->> 'nature', ''), 'representations'))
    returning id into did;
  else
    update public.crescite_dates set
      spectacle_id = (d ->> 'spectacle_id')::bigint, lieu_id = nullif(d ->> 'lieu_id', '')::bigint,
      debut = (d ->> 'debut')::date, fin = nullif(d ->> 'fin', '')::date,
      precision = coalesce(nullif(d ->> 'precision', ''), 'jour'),
      saison = coalesce(nullif(d ->> 'saison', ''), saison),
      public = coalesce(nullif(d ->> 'public', ''), 'tout_public'), statut = coalesce(nullif(d ->> 'statut', ''), 'confirmee'),
      visible = coalesce((d ->> 'visible')::boolean, true), intitule = nullif(d ->> 'intitule', ''),
      details = coalesce(d -> 'details', '[]'), lien = nullif(d ->> 'lien', ''),
      nb_representations = nullif(d ->> 'nb_representations', '')::smallint,
      nature = coalesce(nullif(d ->> 'nature', ''), nature)
    where id = did;
    if not found then raise exception 'Date % introuvable', did; end if;
  end if;

  if d ? 'representations' then
    for r in select * from jsonb_array_elements(d -> 'representations') loop
      rid := nullif(r ->> 'id', '')::bigint;
      if rid is null then
        insert into public.crescite_representations (date_id, jour, heure, fin, public, annulee, lien, note)
        values (did, (r ->> 'jour')::date, nullif(r ->> 'heure', '')::time, nullif(r ->> 'fin', '')::time,
                coalesce(nullif(r ->> 'public', ''), 'tout_public'),
                coalesce((r ->> 'annulee')::boolean, false), nullif(r ->> 'lien', ''), nullif(r ->> 'note', ''))
        returning id into rid;
      else
        update public.crescite_representations set
          jour = (r ->> 'jour')::date, heure = nullif(r ->> 'heure', '')::time, fin = nullif(r ->> 'fin', '')::time,
          public = coalesce(nullif(r ->> 'public', ''), 'tout_public'), annulee = coalesce((r ->> 'annulee')::boolean, false),
          lien = nullif(r ->> 'lien', ''), note = nullif(r ->> 'note', '')
        where id = rid and date_id = did;
      end if;
      garder := garder || rid;
    end loop;
    delete from public.crescite_representations where date_id = did and not (id = any (garder));
  end if;

  if d ? 'suivi' then
    insert into public.crescite_dates_suivi (date_id, organisateur, contact, contrat, notes)
    values (did, nullif(d -> 'suivi' ->> 'organisateur', ''), nullif(d -> 'suivi' ->> 'contact', ''),
            nullif(d -> 'suivi' ->> 'contrat', ''), nullif(d -> 'suivi' ->> 'notes', ''))
    on conflict (date_id) do update set organisateur = excluded.organisateur, contact = excluded.contact,
      contrat = excluded.contrat, notes = excluded.notes;
  end if;
  return did;
end;
$$;

-- la tournée d'une personne dit maintenant la nature de chaque date et l'heure de fin des séances
create or replace function public.crescite_ma_tournee(saison_voulue text default null) returns jsonb
language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_agg(x order by x ->> 'debut', (x ->> 'id')::bigint), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', d.id, 'debut', d.debut, 'fin', d.fin, 'precision', d.precision, 'saison', d.saison, 'public', d.public,
      'statut', d.statut, 'intitule', d.intitule, 'details', d.details, 'lien', d.lien, 'nature', d.nature,
      'spectacle', jsonb_build_object('id', s.id, 'slug', s.slug, 'titre', s.titre, 'duree', s.duree, 'univers', s.univers),
      'lieu', case when l.id is null then null else jsonb_build_object('id', l.id, 'nom', l.nom, 'commune', l.commune,
              'departement', l.departement, 'adresse', l.adresse, 'latitude', l.latitude, 'longitude', l.longitude,
              'site_web', l.site_web) end,
      'representations', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'jour', r.jour, 'heure', r.heure, 'fin', r.fin,
              'public', r.public, 'annulee', r.annulee, 'note', r.note) order by r.jour, r.heure nulls last)
              from public.crescite_representations r where r.date_id = d.id), '[]'::jsonb),
      'feuille', (select jsonb_build_object('id', f.id, 'version', f.version, 'publiee_le', f.publiee_le)
                  from public.crescite_feuilles f where f.date_id = d.id and f.statut = 'publiee')
    ) as x
    from public.crescite_dates d
    join public.crescite_spectacles s on s.id = d.spectacle_id
    left join public.crescite_lieux l on l.id = d.lieu_id
    where public.crescite_membre_date(d.id) and (saison_voulue is null or d.saison = saison_voulue)
  ) t
$$;

-- ------------------------------------------------------------------------------------------------ documents publics

-- 'pros' : pour les programmateurs (dossier artistique, fiche technique) ; 'scolaires' : pour les établissements
-- (dossier pédagogique). Leurs fichiers sont dans le stockage public « crescite », sous documents/<spectacle>/.
alter table public.crescite_documents drop constraint if exists crescite_documents_pour_check;
alter table public.crescite_documents add constraint crescite_documents_pour_check
  check (pour in ('equipe', 'administration', 'pros', 'scolaires'));

-- ------------------------------------------------------------------------------------------------ les notifications

create table if not exists public.crescite_notifications (
  id bigint generated by default as identity primary key,
  personne_id bigint not null references public.crescite_personnes (id) on delete cascade,
  type text not null check (type in ('feuille', 'horaires', 'date', 'document', 'equipe', 'message')),
  titre text not null,
  texte text,
  date_id bigint references public.crescite_dates (id) on delete cascade,
  spectacle_id bigint references public.crescite_spectacles (id) on delete cascade,
  lien text,                                       -- une adresse de l'espace de l'équipe : '#/date/12', '#/feuille/12'…
  cree_le timestamptz not null default now(),
  lue_le timestamptz
);
create index if not exists crescite_notifications_personne on public.crescite_notifications (personne_id, cree_le desc);

-- les appareils abonnés : un abonnement Web Push par navigateur
create table if not exists public.crescite_abonnements (
  id bigint generated by default as identity primary key,
  personne_id bigint not null references public.crescite_personnes (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  appareil text,
  cree_le timestamptz not null default now()
);
create index if not exists crescite_abonnements_personne on public.crescite_abonnements (personne_id);

-- ce que seuls la base et la fonction d'envoi lisent
create table if not exists public.crescite_secrets (
  cle text primary key,
  valeur text not null,
  modifie_le timestamptz not null default now()
);
insert into public.crescite_secrets (cle, valeur)
values ('jeton_push', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (cle) do nothing;

-- les personnes qui partent sur une date (celles qui ont un compte) : la distribution « en tournée », corrigée par
-- l'équipe de la date
create or replace function public.crescite_membres_date(d bigint) returns setof bigint
language sql stable security definer set search_path = public as $$
  select distinct p from (
    select e.personne_id as p from public.crescite_equipes e where e.date_id = d and e.present
    union
    select di.personne_id from public.crescite_dates x
      join public.crescite_distributions di on di.spectacle_id = x.spectacle_id
     where x.id = d and di.en_tournee
       and not exists (select 1 from public.crescite_equipes e where e.date_id = d and e.personne_id = di.personne_id and not e.present)
  ) t
  where exists (select 1 from public.crescite_personnes_privees v where v.personne_id = t.p and v.user_id is not null)
$$;

-- une date en quelques mots : « Bérénice · 18 déc. · Pont-Audemer »
create or replace function public.crescite_date_texte(d bigint) returns text
language sql stable security definer set search_path = public as $$
  select concat_ws(' · ', s.titre,
           case when x.precision in ('mois', 'saison') then null else
             extract(day from x.debut)::int::text || ' ' ||
             (array['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'])[extract(month from x.debut)::int]
             || case when x.fin is not null and x.fin > x.debut then ' → ' || extract(day from x.fin)::int::text || ' ' ||
             (array['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'])[extract(month from x.fin)::int]
             else '' end end,
           l.commune)
  from public.crescite_dates x join public.crescite_spectacles s on s.id = x.spectacle_id
  left join public.crescite_lieux l on l.id = x.lieu_id
  where x.id = d
$$;

-- prévenir des personnes ; une notification non lue du même genre pour la même date, de moins d'un quart d'heure, est
-- mise à jour plutôt que doublée (plusieurs horaires changés d'un coup : une seule notification)
create or replace function public.crescite_notifier(personnes bigint[], genre text, titre_ text, texte_ text,
                                                     d bigint, s bigint, lien_ text) returns integer
language plpgsql security definer set search_path = public as $$
declare
  p bigint;
  n integer := 0;
begin
  foreach p in array coalesce(personnes, '{}') loop
    update public.crescite_notifications set titre = titre_, texte = texte_, lien = lien_, cree_le = now()
     where personne_id = p and type = genre and date_id is not distinct from d and lue_le is null
       and cree_le > now() - interval '15 minutes';
    if not found then
      insert into public.crescite_notifications (personne_id, type, titre, texte, date_id, spectacle_id, lien)
      values (p, genre, titre_, texte_, d, s, lien_);
    end if;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- une date à venir (ou en cours) : on ne prévient pas pour les dates passées
create or replace function public.crescite_a_venir(d bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.crescite_dates x where x.id = d and coalesce(x.fin, x.debut) >= current_date)
$$;

-- une feuille de route publiée, ou republiée
create or replace function public.crescite_notif_feuilles() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.statut = 'publiee' and (tg_op = 'INSERT' or old.statut is distinct from 'publiee' or old.version is distinct from new.version) then
    perform public.crescite_notifier(array(select public.crescite_membres_date(new.date_id)), 'feuille',
      case when new.version > 1 then 'Feuille de route mise à jour' else 'Feuille de route publiée' end,
      public.crescite_date_texte(new.date_id) || case when new.version > 1 then ' · version ' || new.version else '' end,
      new.date_id, (select spectacle_id from public.crescite_dates where id = new.date_id), '#/feuille/' || new.date_id);
  end if;
  return null;
end;
$$;

-- des horaires qui changent (représentations, répétitions) : jour, heure, fin, annulation
create or replace function public.crescite_notif_horaires() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  d bigint := coalesce(new.date_id, old.date_id);
  nat text;
begin
  if tg_op = 'UPDATE' and new.jour is not distinct from old.jour and new.heure is not distinct from old.heure
     and new.fin is not distinct from old.fin and new.annulee is not distinct from old.annulee then
    return null;
  end if;
  if not public.crescite_a_venir(d) then return null; end if;
  -- une date toute neuve est déjà annoncée comme telle
  if exists (select 1 from public.crescite_notifications where date_id = d and type = 'date' and cree_le > now() - interval '2 minutes') then
    return null;
  end if;
  select nature into nat from public.crescite_dates where id = d;
  perform public.crescite_notifier(array(select public.crescite_membres_date(d)), 'horaires',
    case when nat = 'repetitions' then 'Horaires de répétition modifiés' when nat = 'residence' then 'Horaires de résidence modifiés'
         else 'Horaires modifiés' end,
    public.crescite_date_texte(d), d, (select spectacle_id from public.crescite_dates where id = d), '#/date/' || d);
  return null;
end;
$$;

-- une date ajoutée, confirmée, annulée, reportée, ou qui change de lieu
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
  else
    return null;
  end if;
  perform public.crescite_notifier(array(select public.crescite_membres_date(new.id)), 'date', titre_,
    public.crescite_date_texte(new.id), new.id, new.spectacle_id, '#/date/' || new.id);
  return null;
end;
$$;

-- un document ajouté pour l'équipe d'un spectacle (ou de toute la compagnie)
create or replace function public.crescite_notif_documents() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.pour <> 'equipe' then return null; end if;
  perform public.crescite_notifier(array(
      select distinct di.personne_id from public.crescite_distributions di
       where (new.spectacle_id is null or di.spectacle_id = new.spectacle_id)
         and exists (select 1 from public.crescite_personnes_privees v where v.personne_id = di.personne_id and v.user_id is not null)),
    'document', 'Nouveau document',
    concat_ws(' · ', new.titre, (select titre from public.crescite_spectacles where id = new.spectacle_id)),
    null, new.spectacle_id, '#/documents');
  return null;
end;
$$;

-- une personne ajoutée à une date, ou retirée (par rapport à la distribution « en tournée »)
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
  perform public.crescite_notifier(array[r.personne_id], 'equipe',
    case when part then 'Vous partez sur une date' else 'Vous ne partez plus sur une date' end,
    public.crescite_date_texte(r.date_id), r.date_id, (select spectacle_id from public.crescite_dates where id = r.date_id),
    '#/date/' || r.date_id);
  return null;
end;
$$;

-- un message de l'administration à l'équipe d'une date
create or replace function public.crescite_prevenir_equipe(d bigint, titre_ text, texte_ text default null) returns integer
language plpgsql security definer set search_path = public as $$
begin
  if not public.crescite_est_admin() then
    raise exception 'Réservé aux administrateurs de la compagnie' using errcode = '42501';
  end if;
  return public.crescite_notifier(array(select public.crescite_membres_date(d)), 'message', titre_,
    coalesce(nullif(texte_, ''), public.crescite_date_texte(d)), d, (select spectacle_id from public.crescite_dates where id = d),
    '#/date/' || d);
end;
$$;

-- chaque notification nouvelle part vers les appareils abonnés de sa personne, par la fonction « crescite-push »
-- (si pg_net ou la fonction manquent, la notification reste dans l'application)
create or replace function public.crescite_notif_envoyer() returns trigger
language plpgsql security definer set search_path = public as $$
declare jeton text;
begin
  if not exists (select 1 from public.crescite_abonnements a where a.personne_id = new.personne_id) then return null; end if;
  select valeur into jeton from public.crescite_secrets where cle = 'jeton_push';
  if jeton is null then return null; end if;
  begin
    perform net.http_post(
      url := 'https://omekkqjinvppadsoinvj.supabase.co/functions/v1/crescite-push',
      body := jsonb_build_object('notification_id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-crescite-jeton', jeton));
  exception when others then
    raise notice 'envoi des notifications : %', sqlerrm;
  end;
  return null;
end;
$$;

do $$ begin
  create extension if not exists pg_net;
exception when others then raise notice 'pg_net : %', sqlerrm;
end $$;

drop trigger if exists crescite_notif_feuilles on public.crescite_feuilles;
create trigger crescite_notif_feuilles after insert or update on public.crescite_feuilles
  for each row execute function public.crescite_notif_feuilles();
drop trigger if exists crescite_notif_horaires on public.crescite_representations;
create trigger crescite_notif_horaires after insert or update or delete on public.crescite_representations
  for each row execute function public.crescite_notif_horaires();
drop trigger if exists crescite_notif_dates on public.crescite_dates;
create trigger crescite_notif_dates after insert or update on public.crescite_dates
  for each row execute function public.crescite_notif_dates();
drop trigger if exists crescite_notif_documents on public.crescite_documents;
create trigger crescite_notif_documents after insert on public.crescite_documents
  for each row execute function public.crescite_notif_documents();
drop trigger if exists crescite_notif_equipes on public.crescite_equipes;
create trigger crescite_notif_equipes after insert or update or delete on public.crescite_equipes
  for each row execute function public.crescite_notif_equipes();
drop trigger if exists crescite_notif_envoyer on public.crescite_notifications;
create trigger crescite_notif_envoyer after insert on public.crescite_notifications
  for each row execute function public.crescite_notif_envoyer();

-- ------------------------------------------------------------------------------------------------ règles d'accès

alter table public.crescite_notifications enable row level security;
alter table public.crescite_abonnements enable row level security;
alter table public.crescite_secrets enable row level security;

-- les règles de ce script s'appellent notif_… ou public_… : on les refait à chaque passage, sans toucher aux autres
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename like 'crescite\_%' and (policyname like 'notif\_%' or policyname like 'public\_%') loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- chacun ses notifications : il les lit, les marque comme lues (seulement lue_le), les efface
create policy notif_lecture on public.crescite_notifications for select to authenticated
  using (personne_id = (select public.crescite_moi()) or (select public.crescite_est_admin()));
create policy notif_modification on public.crescite_notifications for update to authenticated
  using (personne_id = (select public.crescite_moi())) with check (personne_id = (select public.crescite_moi()));
create policy notif_suppression on public.crescite_notifications for delete to authenticated
  using (personne_id = (select public.crescite_moi()) or (select public.crescite_est_admin()));
create policy notif_ajout on public.crescite_notifications for insert to authenticated
  with check ((select public.crescite_est_admin()));

-- chacun ses appareils abonnés
create policy notif_lecture on public.crescite_abonnements for select to authenticated
  using (personne_id = (select public.crescite_moi()) or (select public.crescite_est_admin()));
create policy notif_ajout on public.crescite_abonnements for insert to authenticated
  with check (personne_id = (select public.crescite_moi()));
create policy notif_modification on public.crescite_abonnements for update to authenticated
  using (personne_id = (select public.crescite_moi())) with check (personne_id = (select public.crescite_moi()));
create policy notif_suppression on public.crescite_abonnements for delete to authenticated
  using (personne_id = (select public.crescite_moi()) or (select public.crescite_est_admin()));

-- crescite_secrets : aucune règle, aucun droit : personne ne le lit par l'API (seulement la base et la fonction d'envoi)

-- les documents publics (pros, scolaires) : tout le monde les lit
create policy public_lecture on public.crescite_documents for select to anon, authenticated
  using (pour in ('pros', 'scolaires') and (spectacle_id is null
         or exists (select 1 from public.crescite_spectacles s where s.id = spectacle_id and s.publie)));

grant select, delete on public.crescite_notifications to authenticated;
grant update (lue_le) on public.crescite_notifications to authenticated;
grant insert on public.crescite_notifications to authenticated;
grant select, insert, update, delete on public.crescite_abonnements to authenticated;
grant select on public.crescite_documents to anon;
grant usage, select on sequence public.crescite_notifications_id_seq, public.crescite_abonnements_id_seq to authenticated;
grant all on public.crescite_notifications, public.crescite_abonnements, public.crescite_secrets to service_role;
revoke all on public.crescite_secrets from anon, authenticated;
grant execute on function public.crescite_prevenir_equipe(bigint, text, text) to authenticated;
revoke execute on function public.crescite_prevenir_equipe(bigint, text, text) from anon, public;
revoke execute on function public.crescite_notifier(bigint[], text, text, text, bigint, bigint, text),
  public.crescite_membres_date(bigint), public.crescite_date_texte(bigint), public.crescite_a_venir(bigint) from anon, authenticated, public;

-- ------------------------------------------------------------------------------------------------ « Je souhaite programmer »
-- le contact diffusion, modifiable ensuite dans l'administration ou sur le site ; jamais écrasé si le script est relancé
insert into public.crescite_textes (cle, valeur) values
  ('programmation', '{"contact": {"nom": "Barbara Daussy", "role": "Administratrice", "email": "contact@crescite.fr", "telephone": null}}')
on conflict (cle) do nothing;

-- l'action culturelle de Cassandres, pas encore construite : masquée, pas effacée. Pour la rouvrir, l'administration
-- met masquee à false ; ce script ne la remasque pas (il ne touche qu'une action qui n'a jamais eu la clé)
update public.crescite_spectacles set action_culturelle = action_culturelle || '{"masquee": true}'::jsonb
where slug = 'cassandres' and not (action_culturelle ? 'masquee');

-- ------------------------------------------------------------------------------------------------ temps réel

do $$
begin
  execute 'alter publication supabase_realtime add table public.crescite_notifications';
exception
  when duplicate_object then null;
  when others then raise notice 'temps réel : %', sqlerrm;
end $$;

commit;

notify pgrst, 'reload schema';

-- ce qui est en place
select 'notifications' as "élément", 'prêtes : la base prévient l''équipe à chaque changement' as "état"
union all
select 'page des programmateurs', case when exists (select 1 from public.crescite_textes where cle = 'programmation')
  then 'contact diffusion en place' else 'contact diffusion absent' end
union all
select 'envoi aux téléphones', case when exists (select 1 from pg_extension where extname = 'pg_net')
  then 'pg_net est là : il reste à déployer la fonction crescite-push (voir README)'
  else 'pg_net manque : les notifications restent dans l''application' end;
