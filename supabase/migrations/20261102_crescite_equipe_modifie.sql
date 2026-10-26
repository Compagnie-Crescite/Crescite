-- Crescite : l'équipe modifie ce qui la concerne, depuis son espace (equipe/), à la demande d'Adrien (octobre 2026 :
-- « chaque comédien peut modifier les fichiers d'un spectacle, l'horaire de la représentation, et les autres infos si
-- besoin ; chacun reçoit une notification de modification avec l'auteur »). À exécuter après les treize premiers scripts
-- (il s'arrête et le dit si le treizième manque), de la même façon (SQL Editor → New query → coller → Run). Il peut être
-- relancé sans dommage et ne touche qu'à ce qui commence par crescite_ (et, dans le stockage « crescite-equipe », à ses
-- règles crescite_equipe_membre_…).
--
-- Ce que le script ajoute :
--   crescite_modifier_date(d, changements)         pour l'équipe de la date (et l'administration), sur une date à venir
--                                                  (au jour de Paris), ni annulée ni reportée : l'heure et la fin de ses
--                                                  séances, la précision de chaque séance (« complet », « hors les murs, au
--                                                  collège… »), et les précisions de la date qui n'ont pas de lien
--                                                  (« Garer le camion derrière le théâtre ») : les changer, en ajouter, en
--                                                  retirer. Elles restent du texte simple (ni lien, ni balise, ni caractère
--                                                  invisible : l'administration les ouvre dans un éditeur riche). Une
--                                                  précision qui porte un lien (la billetterie, un plan) reste telle quelle,
--                                                  son texte avec son lien ; seul son rang peut changer. changements =
--                                                  {representations: [{id, heure?, fin?, note?, avant?}], precisions:
--                                                  [{texte, lien}]} ; « avant » : ce que la page avait lu (si la séance a
--                                                  changé depuis, rien n'est écrasé).
--   crescite_preparer_fichier(s, nom)              pour l'équipe actuelle d'un spectacle (sa distribution, ou l'équipe d'une
--                                                  de ses dates à venir) et l'administration : le chemin où déposer un
--                                                  fichier, <spectacle>/<repère>-<nom>.<ext>, valable une heure. Le
--                                                  stockage n'accepte de l'équipe que ce chemin-là, et seulement l'envoi :
--                                                  ni relire, ni remplacer, ni effacer
--   crescite_ajouter_document(s, document)         le fichier déposé devient un document de l'équipe du spectacle
--                                                  ({titre, type, fichier})
--   crescite_modifier_document(doc, changements)   son titre, son genre (texte, dossier, fiche technique, plan, autre), ou
--                                                  une nouvelle version du fichier ({titre?, type?, fichier?})
--   crescite_supprimer_document(doc)               le document quitte les fichiers de travail du spectacle
--   crescite_modifications                         chaque modification faite ainsi : qui, quoi, la notification, combien de
--                                                  personnes l'ont reçue. L'auteur relit les siennes, l'administration
--                                                  toutes ; seules les fonctions l'écrivent. Vingt modifications par heure
--                                                  et par compte, et vingt fichiers préparés. L'espace de l'équipe y lit une
--                                                  ligne pour savoir si ce script est passé : avant lui, ses gestes
--                                                  (« Modifier » d'une date, les fichiers d'un spectacle) ne se montrent pas.
--   crescite_fichiers_equipe                       les dépôts préparés (lus par la règle du stockage, jamais par l'API)
--   crescite_notifications.auteur_id               la fiche de qui a fait la modification (l'application montre son portrait)
-- Chaque modification prévient tout le monde, une fois, avec le nom de son auteur (« Lauren Toulin a changé l'horaire du
-- 19 novembre à Eu », « 20 h → 20 h 30 · Bérénice »), jamais son auteur : l'équipe de la date (ou, pour un fichier,
-- l'équipe actuelle du spectacle) qui a un compte, et les administrateurs qui ont une fiche. Elle arrive dans
-- l'application (en temps réel) et sur les téléphones abonnés, par le déclencheur des notifications du troisième script ;
-- les déclencheurs « horaires changés » et « nouveau document » se taisent pendant ce geste (il n'y a qu'une
-- notification, celle qui dit qui). Chaque changement va au journal, avec son auteur, comme ceux de l'administration, qui
-- peut y revenir : un fichier remplacé ou retiré par l'équipe reste dans le stockage (l'équipe n'y efface rien), et le
-- document rétabli depuis le journal le retrouve. Un fichier déposé mais jamais inscrit y reste aussi, sans que personne
-- de l'équipe puisse le relire (vingt par heure et par compte au plus) : l'administration l'efface dans Storage.
-- « À venir », « passée » : au jour qu'il est à Paris, quel que soit le fuseau que la connexion choisit.
-- Ce qui reste à l'administration : le jour d'une séance, son public, son annulation, sa billetterie ; le statut d'une
-- date, sa visibilité, sa nature, son lieu, sa ligne d'agenda, ses liens et les précisions qui portent un lien ; le
-- suivi (organisateur, contacts, contrat, montants), les chiffres, l'équipe d'une date, les feuilles de route ; les
-- documents publics (programmateurs, établissements, salles), ceux de l'administration et ceux de toute la compagnie ;
-- effacer un fichier du stockage.

begin;

do $$
begin
  if to_regclass('public.crescite_debits') is null then
    raise exception 'Lancez d''abord le treizième script (20261101_crescite_securite.sql), puis celui-ci.';
  end if;
end $$;

-- ------------------------------------------------------------------------------------------------ le registre

create table if not exists public.crescite_modifications (
  id bigint generated by default as identity primary key,
  quoi text not null check (quoi in ('date', 'document')),
  date_id bigint references public.crescite_dates (id) on delete set null,
  spectacle_id bigint references public.crescite_spectacles (id) on delete set null,
  document_id bigint,                                                                 -- (le document a pu être retiré)
  personne_id bigint references public.crescite_personnes (id) on delete set null,   -- l'auteur (vide : un administrateur sans fiche)
  user_id uuid references auth.users (id) on delete set null,                         -- son compte : la limite se compte par compte
  titre text not null,                                                                -- la notification partie
  texte text,
  prevenus integer not null default 0,                                                -- combien de personnes l'ont reçue
  cree_le timestamptz not null default now()
);
create index if not exists crescite_modifications_compte on public.crescite_modifications (user_id, cree_le desc);

-- les dépôts préparés dans « crescite-equipe » : le chemin qu'un compte a reçu pour un fichier d'un spectacle (une heure
-- pour l'envoyer ; inscrit, le dépôt s'oublie ; sinon, au bout de deux jours). Seules les fonctions de ce script
-- l'écrivent ; la règle du stockage le lit
create table if not exists public.crescite_fichiers_equipe (
  nom text primary key,                                                          -- le chemin dans « crescite-equipe »
  spectacle_id bigint references public.crescite_spectacles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  quand timestamptz not null default now()
);
-- (une première version de ce script y gardait aussi les fichiers libérés, que l'équipe pouvait effacer : on les oublie)
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'crescite_fichiers_equipe' and column_name = 'geste') then
    execute 'delete from public.crescite_fichiers_equipe where geste <> ''depot''';
    alter table public.crescite_fichiers_equipe drop column geste;
  end if;
end $$;
create index if not exists crescite_fichiers_equipe_compte on public.crescite_fichiers_equipe (user_id, quand desc);

-- qui a fait la modification qu'une notification annonce (vide : la base, ou l'administration)
alter table public.crescite_notifications add column if not exists auteur_id bigint
  references public.crescite_personnes (id) on delete set null;

-- ------------------------------------------------------------------------------------------------ les mots

-- une heure en mots : « 20 h », « 20 h 30 », « 9 h 05 » (espaces insécables)
create or replace function public.crescite_heure_texte(h time) returns text
language sql immutable as $$
  select extract(hour from h)::int || chr(160) || 'h'
         || case when extract(minute from h)::int > 0 then chr(160) || lpad(extract(minute from h)::int::text, 2, '0') else '' end
$$;

-- une séance en mots : « 20 h », « 10 h – 18 h », « heure à préciser »
create or replace function public.crescite_seance_texte(h time, f time) returns text
language sql immutable as $$
  select case when h is null then 'heure à préciser'
              else public.crescite_heure_texte(h) || coalesce(' – ' || public.crescite_heure_texte(f), '') end
$$;

-- un jour en mots : « 19 novembre », « 1er décembre » ; en court : « 19 nov. »
create or replace function public.crescite_jour_texte(j date) returns text
language sql immutable as $$
  select case extract(day from j)::int when 1 then '1er' else extract(day from j)::int::text end || chr(160)
         || (array['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre',
                   'décembre'])[extract(month from j)::int]
$$;
create or replace function public.crescite_jour_court(j date) returns text
language sql immutable as $$
  select extract(day from j)::int || chr(160)
         || (array['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'])[extract(month from j)::int]
$$;

-- une date en mots, après « a changé l'horaire » : « du 19 novembre », « du 19 au 21 novembre », « d'avril 2027 »
create or replace function public.crescite_periode_texte(debut date, fin date, prec text, saison text) returns text
language sql immutable as $$
  select case
    when prec = 'mois' then (case when m ~ '^[aeiou]' then 'd’' else 'de ' end) || m || ' ' || extract(year from debut)::int
    when prec = 'saison' then 'de la saison ' || coalesce(saison, '')
    when fin is null or fin <= debut then 'du ' || public.crescite_jour_texte(debut)
    when date_trunc('month', fin) = date_trunc('month', debut)
      then 'du ' || case extract(day from debut)::int when 1 then '1er' else extract(day from debut)::int::text end
           || ' au ' || public.crescite_jour_texte(fin)
    else 'du ' || public.crescite_jour_texte(debut) || ' au ' || public.crescite_jour_texte(fin) end
  from (select (array['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre',
                      'novembre', 'décembre'])[extract(month from debut)::int] as m) x
$$;

-- « à Eu », « au Havre », « aux Andelys » ; « de Bérénice », « du Cid », « d'Andromaque »
create or replace function public.crescite_prep_a(t text) returns text
language sql immutable as $$
  select case when nullif(btrim(t), '') is null then null
              when t ~ '^Le ' then 'au ' || substr(t, 4)
              when t ~ '^Les ' then 'aux ' || substr(t, 5)
              else 'à ' || t end
$$;
create or replace function public.crescite_prep_de(t text) returns text
language sql immutable as $$
  select case when nullif(btrim(t), '') is null then null
              when t ~ '^Le ' then 'du ' || substr(t, 4)
              when t ~ '^Les ' then 'des ' || substr(t, 5)
              when t ~ '^[AEIOUYÀÂÄÉÈÊËÎÏÔÖÙÛÜHaeiouyàâäéèêëîïôöùûüh]' then 'd’' || t
              else 'de ' || t end
$$;

-- « Bérénice » entre guillemets français
create or replace function public.crescite_guillemets(t text) returns text
language sql immutable as $$
  select '«' || chr(160) || t || chr(160) || '»'
$$;

-- le nom de l'auteur d'une modification : sa fiche, sinon « L'administration » (un administrateur sans fiche)
create or replace function public.crescite_auteur_nom(p bigint) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select nullif(concat_ws(' ', pe.prenom, pe.nom), '') from public.crescite_personnes pe where pe.id = p),
                  'L’administration')
$$;

-- ------------------------------------------------------------------------------------------------ ce que l'équipe écrit

-- une heure envoyée par la page : « 20:30 » (ou « 20:30:00 ») ; vide : pas d'heure
create or replace function public.crescite_lire_heure(v jsonb) returns time
language plpgsql immutable as $$
declare t text;
begin
  if v is null or jsonb_typeof(v) = 'null' then return null; end if;
  if jsonb_typeof(v) <> 'string' then raise exception 'Heure invalide (attendu HH:MM)' using errcode = '22023'; end if;
  t := btrim(v #>> '{}');
  if t = '' then return null; end if;
  if t !~ '^([01]?[0-9]|2[0-3]):[0-5][0-9](:00)?$' then
    raise exception 'Heure invalide : « % » (attendu HH:MM)', left(t, 20) using errcode = '22023';
  end if;
  return t::time;
end;
$$;

-- un texte écrit par l'équipe : les espaces resserrés ; vide : rien ; jamais plus de maxi caractères, ni balise (« < »,
-- « > » : l'administration ouvre les précisions dans un éditeur riche), ni caractère de contrôle, ni caractère
-- invisible qui cache ou retourne le texte : trait d'union conditionnel, marque de lettre arabe, espaces et liants sans
-- chasse, marques, enchâssements et isolats de sens d'écriture (un « Planning » suivi d'un renversement et de
-- « fdp.exe » se lirait « Planningexe.pdf »), gluon de mots, indicateur d'ordre des octets. Ni lien (les liens restent
-- à l'administration). Les espaces insécables, elles, restent permises
create or replace function public.crescite_lire_texte(t text, maxi integer, quoi text) returns text
language plpgsql immutable as $$
declare v text := btrim(regexp_replace(coalesce(t, ''), '\s+', ' ', 'g'));
begin
  if v = '' then return null; end if;
  if char_length(v) > maxi then raise exception '% dépasse % caractères', quoi, maxi using errcode = '22023'; end if;
  if v ~ '[<>[:cntrl:]\u00AD\u061C\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]' then
    raise exception '% ne peut contenir ni « < », ni « > », ni caractère de contrôle ou invisible', quoi using errcode = '22023';
  end if;
  if v ~* '(https?:|www\.|://)' then
    raise exception '% ne porte pas de lien : l’administration les ajoute', quoi using errcode = '22023';
  end if;
  return v;
end;
$$;

-- ------------------------------------------------------------------------------------------------ qui le peut, qui est prévenu

-- le jour qu'il est à Paris. Une page peut choisir le fuseau de sa connexion (PostgREST l'accepte), et current_date le
-- suit : une date d'hier redeviendrait « à venir ». Les gestes de ce script comptent donc au jour de Paris
-- (crescite_a_venir, du troisième script, reste tel quel : relancé, il reviendrait)
create or replace function public.crescite_aujourdhui_paris() returns date
language sql stable as $$
  select (now() at time zone 'Europe/Paris')::date
$$;

-- vrai si la personne connectée est aujourd'hui de l'équipe de ce spectacle : dans sa distribution, ou présente dans
-- l'équipe d'une de ses dates à venir. C'est elle qui peut en changer les fichiers. (crescite_membre_spectacle, du
-- deuxième script, compte aussi les dates passées, même d'il y a des années : d'autres lectures s'en servent, on n'y
-- touche pas ; les gestes de ce script passent par celle-ci)
create or replace function public.crescite_membre_actuel(s bigint) returns boolean
language sql stable security definer set search_path = public as $$
  with moi as (select public.crescite_moi() as id)
  select exists (select 1 from moi where moi.id is not null and (
           exists (select 1 from public.crescite_distributions di where di.spectacle_id = s and di.personne_id = moi.id)
        or exists (select 1 from public.crescite_equipes e join public.crescite_dates x on x.id = e.date_id
                   where x.spectacle_id = s and e.personne_id = moi.id and e.present
                     and coalesce(x.fin, x.debut) >= public.crescite_aujourdhui_paris())))
$$;

-- l'équipe actuelle d'un spectacle qui a un compte : sa distribution, et l'équipe de ses dates à venir (ceux qui peuvent
-- en changer les fichiers, et qu'un changement de ses fichiers concerne)
create or replace function public.crescite_membres_spectacle(s bigint) returns setof bigint
language sql stable security definer set search_path = public as $$
  select distinct t.p from (
    select di.personne_id as p from public.crescite_distributions di where di.spectacle_id = s
    union
    select e.personne_id from public.crescite_equipes e join public.crescite_dates x on x.id = e.date_id
     where x.spectacle_id = s and e.present and coalesce(x.fin, x.debut) >= public.crescite_aujourdhui_paris()
  ) t
  where exists (select 1 from public.crescite_personnes_privees v where v.personne_id = t.p and v.user_id is not null)
$$;

-- qui prévenir d'une modification d'une date (s : null) ou d'un fichier d'un spectacle (d : null) : son équipe qui a un
-- compte, et les administrateurs qui ont une fiche ; jamais l'auteur
create or replace function public.crescite_a_prevenir(d bigint, s bigint, auteur bigint) returns bigint[]
language sql stable security definer set search_path = public as $$
  select array(
    select distinct t.p from (
      select public.crescite_membres_date(d) as p where d is not null
      union
      select public.crescite_membres_spectacle(s) where s is not null
      union
      select v.personne_id from public.crescite_admins a join public.crescite_personnes_privees v on v.user_id = a.user_id
    ) t
    where t.p is not null and t.p is distinct from auteur
    order by t.p)
$$;

-- la notification d'une modification : une à chacun, avec son auteur, écrite ici et non par crescite_notifier (qui
-- fondrait deux modifications du même quart d'heure en une seule, mise à jour, qui ne part pas vers les téléphones).
-- Elle porte le lien de la date (ou du spectacle) mais pas son date_id : une notification de l'administration du même
-- quart d'heure ne vient pas la réécrire, et sur le téléphone elle ne remplace pas une autre notification de la date.
-- Seules les fonctions de ce script l'appellent, pendant leur geste
create or replace function public.crescite_prevenir_modification(dest bigint[], genre text, titre_ text, texte_ text,
                                                                  s bigint, lien_ text, auteur bigint) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if current_setting('crescite.geste', true) is distinct from 'equipe' then
    raise exception 'crescite_prevenir_modification ne s''appelle que pendant une modification de l''équipe' using errcode = '42501';
  end if;
  insert into public.crescite_notifications (personne_id, type, titre, texte, date_id, spectacle_id, lien, auteur_id)
  select p, genre, titre_, texte_, null, s, lien_, auteur
  from (select distinct p from unnest(coalesce(dest, '{}')) p where p is not null and p is distinct from auteur) x;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- vingt modifications par heure et par compte ; un compte à la fois (deux gestes envoyés au même instant ne passent pas
-- ensemble sous la limite). PT429 : PostgREST répond 429 (trop de demandes), la page montre le message
create or replace function public.crescite_modifications_limite() returns void
language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('crescite_modifier ' || coalesce(auth.uid()::text, '')));
  if (select count(*) from public.crescite_modifications
      where user_id = auth.uid() and cree_le > now() - interval '1 hour') >= 20 then
    raise exception 'Vingt modifications en une heure : c’est le maximum. Réessayez plus tard, ou écrivez à l’administration.'
      using errcode = 'PT429';
  end if;
end;
$$;

-- ------------------------------------------------------------------------------------------------ une date

-- l'horaire et les précisions d'une date (voir l'en-tête) ; rend {prevenus, modifications, titre, texte}. Rien de
-- changé : rien ne part, rien n'est compté
create or replace function public.crescite_modifier_date(d bigint, changements jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  moi bigint := public.crescite_moi();
  x public.crescite_dates;
  rep public.crescite_representations;
  titre_sp text;
  commune text;
  r jsonb;
  av jsonb;
  k text;
  rid bigint;
  vus bigint[] := '{}';
  nh time;
  nf time;
  nn text;
  plusieurs boolean;
  jour_ text;
  morceaux text[] := '{}';
  jours date[] := '{}';
  n_horaires integer := 0;
  n_autres integer := 0;
  anciens jsonb;
  nouveaux jsonb := '[]';
  t text;
  l text;
  objet text;
  titre_ text;
  texte_ text;
  n integer;
begin
  if auth.uid() is null or not (public.crescite_est_admin() or public.crescite_membre_date(d)) then
    raise exception 'Réservé à l’équipe de cette date et à l’administration' using errcode = '42501';
  end if;
  select * into x from public.crescite_dates where id = d for update;
  if x.id is null then raise exception 'Date % introuvable', d using errcode = '22023'; end if;
  -- (au jour de Paris, pas au fuseau que la connexion a choisi)
  if coalesce(x.fin, x.debut) is null or coalesce(x.fin, x.debut) < public.crescite_aujourdhui_paris() then
    raise exception 'Cette date est passée' using errcode = '22023';
  end if;
  if x.statut in ('annulee', 'reportee') then
    raise exception 'Cette date est % : l’administration seule y touche',
      case x.statut when 'annulee' then 'annulée' else 'reportée' end using errcode = '22023';
  end if;
  if jsonb_typeof(changements) is distinct from 'object' then raise exception 'Rien à modifier' using errcode = '22023'; end if;
  -- ce qui n'est pas dans la liste reste à l'administration
  for k in select jsonb_object_keys(changements) loop
    if k not in ('representations', 'precisions') then
      raise exception 'Ce champ reste à l’administration : %', k using errcode = '42501';
    end if;
  end loop;
  perform public.crescite_modifications_limite();
  -- les déclencheurs du troisième script se taisent : la notification part d'ici, avec son auteur
  perform set_config('crescite.geste', 'equipe', true);
  select s.titre, li.commune into titre_sp, commune
  from public.crescite_spectacles s left join public.crescite_lieux li on li.id = x.lieu_id where s.id = x.spectacle_id;
  plusieurs := (select count(distinct jour) from public.crescite_representations where date_id = d) > 1;

  -- les séances : l'heure, la fin, la précision
  if changements ? 'representations' then
    if jsonb_typeof(changements -> 'representations') <> 'array' then
      raise exception 'Les séances : une liste' using errcode = '22023';
    end if;
    for r in select * from jsonb_array_elements(changements -> 'representations') loop
      if jsonb_typeof(r) <> 'object' or coalesce(r ->> 'id', '') !~ '^[0-9]{1,18}$' then
        raise exception 'Une séance sans identifiant' using errcode = '22023';
      end if;
      for k in select jsonb_object_keys(r) loop
        if k not in ('id', 'heure', 'fin', 'note', 'avant') then
          raise exception 'Ce champ reste à l’administration : %', k using errcode = '42501';
        end if;
      end loop;
      rid := (r ->> 'id')::bigint;
      if rid = any (vus) then raise exception 'La séance % est là deux fois', rid using errcode = '22023'; end if;
      vus := vus || rid;
      select * into rep from public.crescite_representations where id = rid and date_id = d for update;
      if rep.id is null then raise exception 'Séance % introuvable sur cette date', rid using errcode = '22023'; end if;
      if rep.annulee then raise exception 'Cette séance est annulée : l’administration seule y touche' using errcode = '22023'; end if;
      -- ce que la page avait lu : si la séance a changé depuis, on ne l'écrase pas (PT409 : PostgREST répond 409)
      av := r -> 'avant';
      if jsonb_typeof(av) = 'object' and (
           (av ? 'heure' and public.crescite_lire_heure(av -> 'heure') is distinct from rep.heure)
        or (av ? 'fin' and public.crescite_lire_heure(av -> 'fin') is distinct from rep.fin)
        or (av ? 'note' and nullif(btrim(coalesce(av ->> 'note', '')), '') is distinct from rep.note)) then
        raise exception 'Cette séance vient de changer : relisez la date, puis recommencez' using errcode = 'PT409';
      end if;
      nh := case when r ? 'heure' then public.crescite_lire_heure(r -> 'heure') else rep.heure end;
      nf := case when r ? 'fin' then public.crescite_lire_heure(r -> 'fin') else rep.fin end;
      -- une précision inchangée passe telle quelle (l'administration l'a écrite) ; une nouvelle est relue
      nn := case when not r ? 'note' then rep.note
                 when nullif(btrim(coalesce(r ->> 'note', '')), '') is not distinct from rep.note then rep.note
                 else public.crescite_lire_texte(r ->> 'note', 120, 'La précision d’une séance') end;
      if nf is not null and nh is null then
        raise exception 'Une heure de fin demande une heure de début' using errcode = '22023';
      end if;
      if nf is not null and nf = nh then raise exception 'La fin est à l’heure du début' using errcode = '22023'; end if;
      jour_ := case when plusieurs then public.crescite_jour_court(rep.jour) || ' : ' else '' end;
      if (nh, nf) is distinct from (rep.heure, rep.fin) then
        n_horaires := n_horaires + 1;
        jours := jours || rep.jour;
        morceaux := morceaux || (jour_ || public.crescite_seance_texte(rep.heure, rep.fin) || ' → ' || public.crescite_seance_texte(nh, nf));
      end if;
      if nn is distinct from rep.note then
        n_autres := n_autres + 1;
        jours := jours || rep.jour;
        morceaux := morceaux || (jour_ || case when nh is null then 'séance' else 'séance de ' || public.crescite_heure_texte(nh) end
                                 || case when nn is null then ' : précision retirée' else ' : ' || public.crescite_guillemets(nn) end);
      end if;
      if (nh, nf, nn) is distinct from (rep.heure, rep.fin, rep.note) then
        update public.crescite_representations set heure = nh, fin = nf, note = nn where id = rid;
      end if;
    end loop;
  end if;

  -- les précisions de la date. Celles qui portent un lien (la billetterie, un plan) restent telles quelles, chacune son
  -- texte avec son lien : un lien ne passe pas sur un autre texte (« Spectacle annulé : demandez le remboursement ici »).
  -- La page les renvoie, dans l'ordre qu'elle veut ; l'équipe change, ajoute ou retire celles qui n'en ont pas
  if changements ? 'precisions' then
    if jsonb_typeof(changements -> 'precisions') <> 'array' then
      raise exception 'Les précisions : une liste' using errcode = '22023';
    end if;
    select coalesce(jsonb_agg(jsonb_build_object(
             'texte', case when jsonb_typeof(a) = 'string' then a #>> '{}' else a ->> 'texte' end,
             'lien', case when jsonb_typeof(a) = 'object' then nullif(a ->> 'lien', '') end) order by o), '[]'::jsonb)
      into anciens
    from jsonb_array_elements(case when jsonb_typeof(x.details) = 'array' then x.details else '[]'::jsonb end) with ordinality e(a, o)
    where jsonb_typeof(a) in ('object', 'string');
    if jsonb_array_length(changements -> 'precisions') > greatest(8, jsonb_array_length(anciens)) then
      raise exception 'Huit précisions au plus' using errcode = '22023';
    end if;
    for r in select * from jsonb_array_elements(changements -> 'precisions') loop
      if jsonb_typeof(r) <> 'object' then raise exception 'Une précision : un texte' using errcode = '22023'; end if;
      for k in select jsonb_object_keys(r) loop
        if k not in ('texte', 'lien') then
          raise exception 'Ce champ reste à l’administration : %', k using errcode = '42501';
        end if;
      end loop;
      l := nullif(r ->> 'lien', '');
      t := r ->> 'texte';
      if l is not null then
        -- une précision à lien : l'une de celles d'avant, son texte avec son lien, telle quelle
        if not exists (select 1 from jsonb_array_elements(anciens) a where a ->> 'lien' = l and a ->> 'texte' = t) then
          raise exception 'Les précisions qui portent un lien restent à l’administration : ni leur texte ni leur lien ne changent'
            using errcode = '42501';
        end if;
        nouveaux := nouveaux || jsonb_build_array(jsonb_build_object('texte', t, 'lien', l));
        continue;
      end if;
      -- sans lien : un texte déjà là passe tel quel (l'administration l'a peut-être mis en forme) ; un texte neuf est relu
      if t is null or not exists (select 1 from jsonb_array_elements(anciens) a where a ->> 'texte' = t) then
        t := public.crescite_lire_texte(t, 200, 'Une précision');
      end if;
      if t is null then continue; end if;
      nouveaux := nouveaux || jsonb_build_array(jsonb_build_object('texte', t, 'lien', null));
    end loop;
    -- chaque précision à lien d'avant est encore là, une fois : ni retirée, ni doublée (l'administration seule en ajoute,
    -- en change ou en retire)
    if (select coalesce(array_agg(a::text order by a::text), '{}') from jsonb_array_elements(anciens) a where a ->> 'lien' is not null)
       is distinct from
       (select coalesce(array_agg(a::text order by a::text), '{}') from jsonb_array_elements(nouveaux) a where a ->> 'lien' is not null) then
      raise exception 'Les précisions qui portent un lien restent à l’administration : ni leur texte ni leur lien ne changent'
        using errcode = '42501';
    end if;
    if nouveaux is distinct from anciens then
      update public.crescite_dates set details = nouveaux where id = d;
      n_autres := n_autres + 1;
      morceaux := morceaux || 'précisions de la date mises à jour'::text;
    end if;
  end if;

  if n_horaires + n_autres = 0 then return jsonb_build_object('prevenus', 0, 'modifications', 0); end if;

  -- « Lauren Toulin a changé l'horaire du 19 novembre à Eu » ; « 20 h → 20 h 30 · Bérénice »
  objet := case when n_autres = 0 then case when n_horaires > 1 then 'les horaires' else 'l’horaire' end
                when n_horaires = 0 then 'les précisions'
                when n_horaires > 1 then 'les horaires et les précisions'
                else 'l’horaire et les précisions' end;
  titre_ := public.crescite_auteur_nom(moi) || ' a changé ' || objet || ' '
            || case when (select count(distinct j) from unnest(jours) j) = 1 then 'du ' || public.crescite_jour_texte(jours[1])
                    else public.crescite_periode_texte(x.debut, x.fin, x.precision, x.saison) end
            || coalesce(' ' || public.crescite_prep_a(commune), '');
  texte_ := array_to_string(morceaux, ' ; ');
  if char_length(texte_) > 300 then texte_ := left(texte_, 299) || '…'; end if;
  texte_ := concat_ws(' · ', texte_, titre_sp);
  n := public.crescite_prevenir_modification(public.crescite_a_prevenir(d, null, moi),
         case when n_horaires > 0 then 'horaires' else 'date' end, titre_, texte_, x.spectacle_id, '#/date/' || d, moi);
  insert into public.crescite_modifications (quoi, date_id, spectacle_id, personne_id, user_id, titre, texte, prevenus)
  values ('date', d, x.spectacle_id, moi, auth.uid(), titre_, texte_, n);
  return jsonb_build_object('prevenus', n, 'modifications', n_horaires + n_autres, 'titre', titre_, 'texte', texte_);
end;
$$;

-- ------------------------------------------------------------------------------------------------ les fichiers d'un spectacle

-- un document que l'équipe peut changer : un document de l'équipe (pour = 'equipe') d'un spectacle dont la personne
-- connectée est aujourd'hui (crescite_membre_actuel), ou l'administration. Les documents publics, ceux des salles, ceux
-- de l'administration et ceux de toute la compagnie restent à l'administration
create or replace function public.crescite_document_equipe(doc bigint) returns public.crescite_documents
language plpgsql security definer set search_path = public as $$
declare x public.crescite_documents;
begin
  select * into x from public.crescite_documents where id = doc for update;
  if auth.uid() is null or x.id is null or x.pour <> 'equipe' or x.spectacle_id is null
     or not (public.crescite_est_admin() or public.crescite_membre_actuel(x.spectacle_id)) then
    raise exception 'Ce document n’est pas (ou plus) un document de l’équipe de vos spectacles' using errcode = '42501';
  end if;
  return x;
end;
$$;

-- un fichier préparé par ce compte pour ce spectacle, dans l'heure, et qu'aucun document ne tient encore
create or replace function public.crescite_fichier_prepare(chemin text, s bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select chemin is not null
     and exists (select 1 from public.crescite_fichiers_equipe f
                  where f.nom = chemin and f.user_id = auth.uid() and f.spectacle_id = s
                    and f.quand > now() - interval '1 hour')
     and not exists (select 1 from public.crescite_documents x where x.fichier = chemin)
$$;

-- le chemin où déposer un fichier d'un spectacle : <spectacle>/<repère>-<nom sans accents>.<ext>, les types que le
-- stockage « crescite-equipe » accepte ; vingt par heure et par compte
create or replace function public.crescite_preparer_fichier(s bigint, nom text) returns text
language plpgsql security definer set search_path = public as $$
declare
  dossier text;
  ext text := lower(substring(coalesce(nom, '') from '\.([A-Za-z0-9]{1,5})$'));
  base text;
  chemin text;
begin
  if auth.uid() is null or not (public.crescite_est_admin() or public.crescite_membre_actuel(s)) then
    raise exception 'Réservé à l’équipe actuelle de ce spectacle et à l’administration' using errcode = '42501';
  end if;
  select slug into dossier from public.crescite_spectacles where id = s;
  if dossier is null then raise exception 'Spectacle % introuvable', s using errcode = '22023'; end if;
  -- (les dossiers des portraits et de toute la compagnie ne sont jamais ceux d'un spectacle)
  if dossier in ('portraits', 'compagnie') then
    raise exception 'Les fichiers de ce spectacle restent à l’administration' using errcode = '42501';
  end if;
  if ext is null or ext not in ('pdf', 'odt', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'webp') then
    raise exception 'Ce type de fichier n’est pas accepté : PDF, image (JPEG, PNG, WebP), texte, ODT ou DOCX' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('crescite_fichiers ' || auth.uid()::text));
  -- (un dépôt jamais inscrit s'oublie au bout de deux jours ; son fichier, s'il est parti, reste à l'administration)
  delete from public.crescite_fichiers_equipe where quand < now() - interval '2 days';
  if (select count(*) from public.crescite_fichiers_equipe
      where user_id = auth.uid() and quand > now() - interval '1 hour') >= 20 then
    raise exception 'Vingt fichiers en une heure : c’est le maximum. Réessayez plus tard.' using errcode = 'PT429';
  end if;
  base := btrim(regexp_replace(lower(translate(regexp_replace(coalesce(nom, ''), '\.[^.]*$', ''),
            'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸ', 'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUYY')),
            '[^a-z0-9]+', '-', 'g'), '-');
  base := coalesce(nullif(btrim(left(base, 60), '-'), ''), 'document');
  chemin := dossier || '/' || to_hex((extract(epoch from clock_timestamp()) * 1000)::bigint) || substr(md5(random()::text), 1, 4)
            || '-' || base || '.' || ext;
  insert into public.crescite_fichiers_equipe (nom, spectacle_id, user_id) values (chemin, s, auth.uid());
  return chemin;
end;
$$;

-- le fichier déposé devient un document de l'équipe du spectacle, à la fin de sa liste ; rend {id, prevenus}
create or replace function public.crescite_ajouter_document(s bigint, document jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  moi bigint := public.crescite_moi();
  sp public.crescite_spectacles;
  k text;
  fichier_ text;
  titre_ text;
  genre_ text;
  did bigint;
  titre_n text;
  n integer;
begin
  if auth.uid() is null or not (public.crescite_est_admin() or public.crescite_membre_actuel(s)) then
    raise exception 'Réservé à l’équipe actuelle de ce spectacle et à l’administration' using errcode = '42501';
  end if;
  select * into sp from public.crescite_spectacles where id = s;
  if sp.id is null then raise exception 'Spectacle % introuvable', s using errcode = '22023'; end if;
  if jsonb_typeof(document) is distinct from 'object' then raise exception 'Rien à ajouter' using errcode = '22023'; end if;
  for k in select jsonb_object_keys(document) loop
    if k not in ('titre', 'type', 'fichier') then
      raise exception 'Ce champ reste à l’administration : %', k using errcode = '42501';
    end if;
  end loop;
  fichier_ := document ->> 'fichier';
  if not public.crescite_fichier_prepare(fichier_, s) then
    raise exception 'Ce fichier n’a pas été préparé pour ce spectacle (ou il y a plus d’une heure) : envoyez-le de nouveau'
      using errcode = '22023';
  end if;
  titre_ := public.crescite_lire_texte(document ->> 'titre', 120, 'Le titre');
  if titre_ is null then raise exception 'Un document a besoin d’un titre' using errcode = '22023'; end if;
  genre_ := coalesce(nullif(document ->> 'type', ''), 'autre');
  if genre_ not in ('texte', 'dossier', 'fiche_technique', 'plan', 'autre') then
    raise exception 'Genre de document inconnu : %', left(genre_, 40) using errcode = '22023';
  end if;
  perform public.crescite_modifications_limite();
  perform set_config('crescite.geste', 'equipe', true);
  insert into public.crescite_documents (spectacle_id, type, titre, fichier, pour, ordre)
  values (s, genre_, titre_, fichier_, 'equipe',
          (select coalesce(max(ordre), 0) + 10 from public.crescite_documents where spectacle_id = s and pour = 'equipe'))
  returning id into did;
  delete from public.crescite_fichiers_equipe where nom = fichier_;
  titre_n := public.crescite_auteur_nom(moi) || ' a ajouté un document ' || public.crescite_prep_a(sp.titre);
  n := public.crescite_prevenir_modification(public.crescite_a_prevenir(null, s, moi), 'document', titre_n, titre_, s,
                                             '#/spectacles/' || sp.slug, moi);
  insert into public.crescite_modifications (quoi, spectacle_id, document_id, personne_id, user_id, titre, texte, prevenus)
  values ('document', s, did, moi, auth.uid(), titre_n, titre_, n);
  return jsonb_build_object('id', did, 'prevenus', n);
end;
$$;

-- le titre, le genre, ou une nouvelle version du fichier d'un document de l'équipe ; rend {prevenus, modifications}.
-- La version remplacée reste dans le stockage (l'équipe n'y efface rien) : rétabli depuis le journal, le document la
-- retrouve
create or replace function public.crescite_modifier_document(doc bigint, changements jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  moi bigint := public.crescite_moi();
  x public.crescite_documents;
  sp public.crescite_spectacles;
  k text;
  titre_ text;
  genre_ text;
  fichier_ text;
  titre_n text;
  texte_n text;
  n integer;
begin
  x := public.crescite_document_equipe(doc);
  if jsonb_typeof(changements) is distinct from 'object' then raise exception 'Rien à modifier' using errcode = '22023'; end if;
  for k in select jsonb_object_keys(changements) loop
    if k not in ('titre', 'type', 'fichier') then
      raise exception 'Ce champ reste à l’administration : %', k using errcode = '42501';
    end if;
  end loop;
  titre_ := case when not changements ? 'titre' then x.titre
                 when btrim(coalesce(changements ->> 'titre', '')) = x.titre then x.titre
                 else public.crescite_lire_texte(changements ->> 'titre', 120, 'Le titre') end;
  if titre_ is null then raise exception 'Un document a besoin d’un titre' using errcode = '22023'; end if;
  genre_ := coalesce(nullif(changements ->> 'type', ''), x.type);
  if genre_ not in ('texte', 'dossier', 'fiche_technique', 'plan', 'autre') then
    raise exception 'Genre de document inconnu : %', left(genre_, 40) using errcode = '22023';
  end if;
  fichier_ := nullif(changements ->> 'fichier', '');
  if fichier_ is not distinct from x.fichier then fichier_ := null; end if;
  if fichier_ is not null and not public.crescite_fichier_prepare(fichier_, x.spectacle_id) then
    raise exception 'Ce fichier n’a pas été préparé pour ce spectacle (ou il y a plus d’une heure) : envoyez-le de nouveau'
      using errcode = '22023';
  end if;
  if titre_ = x.titre and genre_ = x.type and fichier_ is null then
    return jsonb_build_object('prevenus', 0, 'modifications', 0);
  end if;
  perform public.crescite_modifications_limite();
  perform set_config('crescite.geste', 'equipe', true);
  update public.crescite_documents set titre = titre_, type = genre_, fichier = coalesce(fichier_, fichier),
         url = case when fichier_ is not null then null else url end
  where id = doc;
  if fichier_ is not null then delete from public.crescite_fichiers_equipe where nom = fichier_; end if;
  select * into sp from public.crescite_spectacles where id = x.spectacle_id;
  if fichier_ is not null then
    titre_n := public.crescite_auteur_nom(moi) || ' a remplacé un document ' || public.crescite_prep_de(sp.titre);
    texte_n := case when titre_ <> x.titre
                    then public.crescite_guillemets(x.titre) || ' devient ' || public.crescite_guillemets(titre_) || ', nouvelle version'
                    else titre_ || ', nouvelle version' end;
  elsif titre_ <> x.titre then
    titre_n := public.crescite_auteur_nom(moi) || ' a renommé un document ' || public.crescite_prep_de(sp.titre);
    texte_n := public.crescite_guillemets(x.titre) || ' → ' || public.crescite_guillemets(titre_);
  else
    titre_n := public.crescite_auteur_nom(moi) || ' a modifié un document ' || public.crescite_prep_de(sp.titre);
    texte_n := titre_ || ' : rangé avec ' || case genre_ when 'texte' then 'les textes' when 'dossier' then 'les dossiers'
                 when 'fiche_technique' then 'les fiches techniques' when 'plan' then 'les plans' else 'les autres documents' end;
  end if;
  n := public.crescite_prevenir_modification(public.crescite_a_prevenir(null, x.spectacle_id, moi), 'document', titre_n, texte_n,
                                             x.spectacle_id, '#/spectacles/' || sp.slug, moi);
  insert into public.crescite_modifications (quoi, spectacle_id, document_id, personne_id, user_id, titre, texte, prevenus)
  values ('document', x.spectacle_id, doc, moi, auth.uid(), titre_n, texte_n, n);
  return jsonb_build_object('prevenus', n, 'modifications', 1);
end;
$$;

-- un document de l'équipe quitte les fichiers de travail ; rend {prevenus}. Son fichier reste dans le stockage
-- (l'équipe n'y efface rien) : l'administration rétablit le document depuis le journal, ou efface le fichier
create or replace function public.crescite_supprimer_document(doc bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  moi bigint := public.crescite_moi();
  x public.crescite_documents;
  sp public.crescite_spectacles;
  titre_n text;
  n integer;
begin
  x := public.crescite_document_equipe(doc);
  perform public.crescite_modifications_limite();
  perform set_config('crescite.geste', 'equipe', true);
  delete from public.crescite_documents where id = doc;
  select * into sp from public.crescite_spectacles where id = x.spectacle_id;
  titre_n := public.crescite_auteur_nom(moi) || ' a supprimé un document ' || public.crescite_prep_de(sp.titre);
  n := public.crescite_prevenir_modification(public.crescite_a_prevenir(null, x.spectacle_id, moi), 'document', titre_n, x.titre,
                                             x.spectacle_id, '#/spectacles/' || sp.slug, moi);
  insert into public.crescite_modifications (quoi, spectacle_id, document_id, personne_id, user_id, titre, texte, prevenus)
  values ('document', x.spectacle_id, doc, moi, auth.uid(), titre_n, x.titre, n);
  return jsonb_build_object('prevenus', n);
end;
$$;

-- ------------------------------------------------------------------------------------------------ le stockage « crescite-equipe »

-- déposer : seulement au chemin préparé par ce compte (crescite_preparer_fichier), dans l'heure, s'il est toujours de
-- l'équipe actuelle du spectacle. (La règle du stockage appelle cette fonction sous le rôle de la personne connectée.)
create or replace function public.crescite_equipe_peut_deposer(nom text) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.crescite_fichiers_equipe f
     where f.nom = crescite_equipe_peut_deposer.nom and f.user_id = auth.uid()
       and f.quand > now() - interval '1 hour'
       and (public.crescite_est_admin() or public.crescite_membre_actuel(f.spectacle_id)))
$$;

-- les règles de ce script s'appellent crescite_equipe_membre_… : on les refait à chaque passage, sans toucher à celles
-- de l'administration (crescite_equipe_lecture, _ajout, _modification, _suppression, du deuxième script). L'équipe n'a
-- que l'envoi, au chemin préparé : ni relire (pas de lien signé d'un fichier qu'aucun document ne tient), ni remplacer
-- (pas d'upsert), ni effacer. Elle lit les fichiers de ses documents par la règle du deuxième script, comme avant.
-- (Une première version de ce script donnait aussi la relecture et l'effacement de ce qu'un geste libérait : ces deux
-- règles, crescite_equipe_membre_lecture et _retrait, et leurs fonctions s'en vont ici)
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'
           and policyname like 'crescite\_equipe\_membre\_%' loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;
drop function if exists public.crescite_equipe_peut_retirer(text);
drop function if exists public.crescite_liberer_fichier(text, bigint);
create policy crescite_equipe_membre_depot on storage.objects for insert to authenticated
  with check (bucket_id = 'crescite-equipe' and public.crescite_equipe_peut_deposer(name));

-- ------------------------------------------------------------------------------------------------ les déclencheurs du troisième script

-- (les mêmes que dans le troisième script, qui les porte aussi : relancé, il ne revient pas en arrière)
-- des horaires qui changent (représentations, répétitions) : jour, heure, fin, annulation. Une modification faite depuis
-- l'espace de l'équipe (le quatorzième script) prévient elle-même, avec son auteur : ce déclencheur se tait alors
create or replace function public.crescite_notif_horaires() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  d bigint := coalesce(new.date_id, old.date_id);
  nat text;
begin
  if current_setting('crescite.geste', true) = 'equipe' then return null; end if;
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

-- un document ajouté pour l'équipe d'un spectacle (ou de toute la compagnie). Ajouté depuis l'espace de l'équipe (le
-- quatorzième script), il prévient lui-même, avec son auteur : ce déclencheur se tait alors
create or replace function public.crescite_notif_documents() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if current_setting('crescite.geste', true) = 'equipe' then return null; end if;
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

-- ------------------------------------------------------------------------------------------------ règles d'accès

alter table public.crescite_modifications enable row level security;
alter table public.crescite_fichiers_equipe enable row level security;

-- les règles de ce script s'appellent modif_… : on les refait à chaque passage, sans toucher aux autres
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename in ('crescite_modifications', 'crescite_fichiers_equipe')
             and policyname like 'modif\_%' loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- chacun relit ses modifications, l'administration toutes ; aucune règle d'écriture : seules les fonctions écrivent.
-- crescite_fichiers_equipe : aucune règle, aucun droit (les fonctions et la règle du stockage seulement)
create policy modif_lecture on public.crescite_modifications for select to authenticated
  using (user_id = (select auth.uid()) or (select public.crescite_est_admin()));

revoke all on public.crescite_modifications, public.crescite_fichiers_equipe from anon, authenticated, public;
grant select on public.crescite_modifications to authenticated;
grant all on public.crescite_modifications, public.crescite_fichiers_equipe to service_role;

-- l'API : les cinq gestes ; la règle du stockage : crescite_equipe_peut_deposer (appelée sous le rôle de la personne)
grant execute on function public.crescite_modifier_date(bigint, jsonb), public.crescite_preparer_fichier(bigint, text),
  public.crescite_ajouter_document(bigint, jsonb), public.crescite_modifier_document(bigint, jsonb),
  public.crescite_supprimer_document(bigint), public.crescite_equipe_peut_deposer(text) to authenticated;
revoke execute on function public.crescite_modifier_date(bigint, jsonb), public.crescite_preparer_fichier(bigint, text),
  public.crescite_ajouter_document(bigint, jsonb), public.crescite_modifier_document(bigint, jsonb),
  public.crescite_supprimer_document(bigint), public.crescite_equipe_peut_deposer(text) from anon, public;
-- le reste ne sert qu'à l'intérieur des gestes
revoke execute on function public.crescite_heure_texte(time), public.crescite_seance_texte(time, time),
  public.crescite_jour_texte(date), public.crescite_jour_court(date), public.crescite_periode_texte(date, date, text, text),
  public.crescite_prep_a(text), public.crescite_prep_de(text), public.crescite_guillemets(text),
  public.crescite_auteur_nom(bigint), public.crescite_lire_heure(jsonb), public.crescite_lire_texte(text, integer, text),
  public.crescite_aujourdhui_paris(), public.crescite_membre_actuel(bigint),
  public.crescite_membres_spectacle(bigint), public.crescite_a_prevenir(bigint, bigint, bigint),
  public.crescite_prevenir_modification(bigint[], text, text, text, bigint, text, bigint),
  public.crescite_modifications_limite(), public.crescite_document_equipe(bigint),
  public.crescite_fichier_prepare(text, bigint)
  from anon, authenticated, public;

commit;

notify pgrst, 'reload schema';

-- ce qui est en place
select 'modifications de l''équipe' as "élément",
  case when exists (select 1 from pg_proc where proname = 'crescite_modifier_date')
        and exists (select 1 from pg_proc where proname = 'crescite_supprimer_document')
        and exists (select 1 from pg_proc where proname = 'crescite_membre_actuel')
        and (select count(*) from pg_policies where schemaname = 'public' and tablename = 'crescite_modifications'
                                                and policyname like 'modif\_%') = 1
    then 'prêtes : l''équipe change l''horaire et les précisions sans lien de ses dates à venir, et les fichiers des spectacles dont elle est aujourd''hui (vingt modifications par heure et par compte)'
    else 'incomplètes : relancez ce script' end as "état"
union all
select 'stockage de l''équipe',
  case when (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'
                                              and policyname like 'crescite\_equipe\_membre\_%') = 1
        and exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                    and policyname = 'crescite_equipe_membre_depot' and cmd = 'INSERT')
        and to_regprocedure('public.crescite_equipe_peut_retirer(text)') is null
    then 'prêt : l''équipe envoie au chemin préparé (vingt fichiers par heure), sans rien relire ni effacer ; ce qu''elle remplace ou retire reste à l''administration'
    else 'incomplet : relancez ce script' end
union all
select 'notifications',
  case when position('crescite.geste' in pg_get_functiondef('public.crescite_notif_horaires()'::regprocedure)) > 0
        and position('crescite.geste' in pg_get_functiondef('public.crescite_notif_documents()'::regprocedure)) > 0
        and exists (select 1 from information_schema.columns where table_schema = 'public'
                    and table_name = 'crescite_notifications' and column_name = 'auteur_id')
    then 'prêtes : une seule par modification, avec le nom de son auteur, jamais pour lui'
    else 'à refaire : relancez ce script' end
union all
select 'administrateurs prévenus', case (select count(*) from public.crescite_admins a
                                        join public.crescite_personnes_privees v on v.user_id = a.user_id)
  when 0 then 'aucun : un administrateur n''est prévenu que si son compte est relié à une fiche de l''équipe'
  when 1 then 'un (son compte est relié à une fiche de l''équipe)'
  else (select count(*) from public.crescite_admins a join public.crescite_personnes_privees v on v.user_id = a.user_id)
       || ' (leurs comptes sont reliés à une fiche de l''équipe)' end;
