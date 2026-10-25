-- Crescite : les alertes de tournée, de bout en bout. Le public s'inscrit sur le site (« Être prévenu du prochain
-- passage », le septième script) ; l'alerte ne compte qu'une fois confirmée d'un clic depuis le courriel reçu à son adresse
-- (double confirmation : personne n'inscrit l'adresse d'un autre, et le domaine de la compagnie n'envoie pas de courrier
-- que personne n'a demandé) ; chaque matin, la fonction crescite-courriel écrit à chaque alerte confirmée les dates de son
-- secteur, confirmées et ouvertes au public, qu'elle n'a pas encore reçues.
-- À exécuter après les dix premiers scripts, de la même façon (SQL Editor → New query → coller → Run). Il peut être
-- relancé sans dommage et ne touche qu'à ce qui commence par crescite_ (plus pg_cron, pour l'envoi quotidien, comme le
-- cinquième script).
--
-- Ce que le script ajoute :
--   crescite_alertes_tournee.confirme_le    l'alerte confirmée (vide : en attente). Le public ne la dépose jamais
--                                            confirmée : un déclencheur l'en empêche (le septième script, relancé, refait
--                                            ses règles d'accès mais ne touche pas aux déclencheurs)
--   .confirmation_le, .confirmation_statut  le courriel de confirmation de l'adresse : quand il a été demandé, et ce qu'il
--                                            est devenu (en_cours, envoye, non_configure, erreur : …)
--   crescite_alertes_envois                 chaque date écrite à chaque alerte (alerte, date, quand, statut), une seule
--                                            fois : une date n'est jamais écrite deux fois à la même alerte
--   le dépôt d'une alerte                   l'adresse en minuscules ; le secteur (le code postal, la commune, et le
--                                            département qui s'en déduit : la Corse en 2A et 2B, l'outre-mer en trois
--                                            chiffres) ; le jeton, tiré par la base ; cinq alertes actives au plus par
--                                            adresse ; un courriel de confirmation au plus par adresse et par 24 heures,
--                                            dont le lien confirme toutes les alertes en attente de l'adresse (50 adresses
--                                            au plus par 24 heures : les autres attendent le passage du matin) ; la même
--                                            alerte déposée deux fois ne se double pas
--   la page de réponse (reponse/?alerte=)   par la fonction : ce qu'elle montre d'une alerte (jamais l'adresse),
--                                            confirmer (toutes les alertes en attente de l'adresse), arrêter (l'alerte
--                                            s'efface, ou toutes celles de l'adresse)
--   l'envoi quotidien                       pg_cron appelle crescite-courriel chaque matin : les alertes non confirmées
--                                            depuis 30 jours s'effacent, les confirmations restées en attente partent
--                                            (« non_configure » compris, dès qu'une clé d'envoi existe), puis un courriel
--                                            par alerte confirmée ; 200 courriels au plus par passage, le reste au suivant
-- Une date va dans le courriel d'une alerte quand elle est confirmée, visible, ouverte au public (tout public ou mixte :
-- jamais une date scolaire), à venir, d'un spectacle publié (celui de l'alerte, s'il y en a un), et dans son secteur : à
-- moins de rayon_km (40 km par défaut) quand l'alerte et le lieu ont une position, sinon dans le même département.

begin;

-- (une réparation du septième script) les pistes de diffusion : le montant de cession estimé, que l'administration écrit
-- déjà (une piste, et les totaux du tableau des pistes) et que la table n'avait pas : créer ou changer une piste échouait.
-- Comme le reste de la table, l'administration seule le lit
alter table public.crescite_diffusion_prospects add column if not exists montant_estime numeric(10, 2);

-- ------------------------------------------------------------------------------------------------ la confirmation

alter table public.crescite_alertes_tournee
  add column if not exists confirme_le timestamptz,               -- vide : en attente de confirmation
  add column if not exists confirmation_le timestamptz,           -- le dernier courriel de confirmation demandé pour l'adresse
  add column if not exists confirmation_statut text;              -- 'en_cours', 'envoye', 'non_configure', 'erreur : …'

create index if not exists crescite_alertes_tournee_adresse on public.crescite_alertes_tournee (lower(email));
create index if not exists crescite_alertes_tournee_confirmation on public.crescite_alertes_tournee (confirmation_le)
  where confirmation_le is not null;

-- chaque date écrite à chaque alerte : une seule fois (en_cours le temps de l'envoi, puis envoye, non_configure ou erreur)
create table if not exists public.crescite_alertes_envois (
  alerte_id bigint not null references public.crescite_alertes_tournee (id) on delete cascade,
  date_id bigint not null references public.crescite_dates (id) on delete cascade,
  envoye_le timestamptz not null default now(),
  statut text not null,
  primary key (alerte_id, date_id)
);
create index if not exists crescite_alertes_envois_date on public.crescite_alertes_envois (date_id);

-- ------------------------------------------------------------------------------------------------ le secteur

-- le département d'un secteur écrit : son code postal (« 76000 » → 76 ; la Corse : « 20000 » → 2A, « 20200 » → 2B ;
-- l'outre-mer : « 97400 » → 974), sinon le département écrit entre parenthèses (« Rouen (76) », ce qu'écrit la
-- géolocalisation de la page), sinon un département seul (« 2A ») ; rien pour ce qui n'est pas un département français.
-- C'est la forme de crescite_lieux.departement (« 76 », « 2A », « 974 »).
create or replace function public.crescite_departement(t text) returns text
language sql immutable as $$
  with x as (
    select substring(coalesce(t, '') from '(?:^|[^0-9])([0-9]{5})(?:[^0-9]|$)') as cp,
           upper(coalesce(substring(coalesce(t, '') from '\(\s*([0-9]{2,3}|2[AaBb])\s*\)'), btrim(coalesce(t, '')))) as d)
  select case
    when cp ~ '^20[0-9]{3}$' then case when cp < '20200' then '2A' else '2B' end
    when cp ~ '^(97[1-6]|98[46-8])[0-9]{2}$' then left(cp, 3)
    when cp ~ '^(0[1-9]|[1-8][0-9]|9[0-5])[0-9]{3}$' then left(cp, 2)
    when cp is null and d ~ '^(0[1-9]|1[0-9]|2[1-9AB]|[3-8][0-9]|9[0-5]|97[1-8]|98[4-8])$' then d
  end
  from x
$$;

-- la distance à vol d'oiseau entre deux points, en kilomètres (la Terre ronde, 6 371 km de rayon)
create or replace function public.crescite_distance_km(lat1 double precision, lon1 double precision,
                                                       lat2 double precision, lon2 double precision) returns double precision
language sql immutable as $$
  select 2 * 6371 * asin(least(1, sqrt(sin(radians(lat2 - lat1) / 2) ^ 2
                                       + cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lon2 - lon1) / 2) ^ 2)))
$$;

-- ------------------------------------------------------------------------------------------------ le dépôt d'une alerte

-- chaque alerte, déposée ou retouchée : l'adresse en minuscules, le secteur relu (le code postal, la commune sans son
-- « (76) », le département déduit), une position incomplète ou impossible oubliée. Ce que dépose le public (anon, ou un
-- compte connecté : la règle du septième script les laisse déposer) : une alerte neuve, jamais confirmée ni déjà
-- prévenue, active, datée de maintenant, son jeton tiré ici (le public ne le choisit pas et ne le relit pas : seuls les
-- courriels le portent), une adresse valable et un secteur où chercher (un département ou une position).
-- (current_user est ici celui qui dépose : la fonction n'est pas security definer.)
create or replace function public.crescite_alertes_garde() returns trigger
language plpgsql as $$
declare
  secteur text := concat_ws(' ', new.code_postal, new.commune);
begin
  new.email := nullif(lower(btrim(coalesce(new.email, ''))), '');
  new.departement := coalesce(public.crescite_departement(secteur), public.crescite_departement(new.departement));
  new.code_postal := substring(secteur from '(?:^|[^0-9])([0-9]{5})(?:[^0-9]|$)');
  new.commune := nullif(left(btrim(regexp_replace(regexp_replace(coalesce(new.commune, ''),
                   '\(\s*([0-9]{2,3}|2[AaBb])\s*\)', '', 'g'), '[0-9]{5}', '', 'g')), 120), '');
  -- un nom de commune : des lettres, des espaces, des traits d'union, des apostrophes ; rien d'autre (il est repris dans les
  -- courriels : ni adresse de site, ni lien n'y passent)
  new.commune := nullif(btrim(regexp_replace(regexp_replace(coalesce(new.commune, ''), '[^[:alpha:][:space:]''’-]+', ' ', 'g'), '\s+', ' ', 'g')), '');
  if new.lat is null or new.lon is null or new.lat not between -90 and 90 or new.lon not between -180 and 180 then
    new.lat := null; new.lon := null;
  else
    -- au kilomètre près : l'alerte n'a pas besoin de plus, l'adresse de la personne n'est pas gardée
    new.lat := round(new.lat, 2); new.lon := round(new.lon, 2);
  end if;
  if tg_op = 'INSERT' and current_user in ('anon', 'authenticated') then
    new.confirme_le := null; new.confirmation_le := null; new.confirmation_statut := null;
    new.active := true; new.derniere_notification_le := null; new.cree_le := now(); new.push_subscription := null;
    new.token_desinscription := replace(gen_random_uuid()::text, '-', '');
    if new.email is null or length(new.email) > 254 or new.email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
      raise exception 'Adresse électronique invalide' using errcode = '22023';
    end if;
    if new.departement is null and new.lat is null then
      raise exception 'Secteur introuvable : un code postal, une commune avec son département, ou une position' using errcode = '22023';
    end if;
    if new.rayon_km is null or new.rayon_km not between 1 and 300 then
      raise exception 'Le rayon va de 1 à 300 km' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

-- un courriel de confirmation est-il parti (ou en train de partir) vers cette adresse depuis moins de 24 heures ?
create or replace function public.crescite_alertes_confirmation_recente(m text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.crescite_alertes_tournee a
                 where lower(a.email) = lower(m) and a.confirmation_statut in ('en_cours', 'envoye')
                   and a.confirmation_le > now() - interval '24 hours')
$$;

-- demander à la fonction crescite-courriel le courriel de confirmation d'une alerte (et de toutes celles en attente de
-- son adresse), comme le cinquième script le fait pour les propositions ; sans pg_net ni jeton, rien ne part et rien ne
-- casse (le passage du matin réessaie)
create or replace function public.crescite_alertes_demander(alerte bigint) returns void
language plpgsql security definer set search_path = public as $$
declare jeton text;
begin
  select valeur into jeton from public.crescite_secrets where cle = 'jeton_push';
  if jeton is null then return; end if;
  begin
    perform net.http_post(
      url := 'https://omekkqjinvppadsoinvj.supabase.co/functions/v1/crescite-courriel',
      body := jsonb_build_object('alerte_confirmation', alerte),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-crescite-jeton', jeton));
  exception when others then
    raise notice 'courriel de confirmation : %', sqlerrm;
  end;
end;
$$;

-- les limites d'une adresse (elles voient toutes les alertes : la fonction est security definer). Une adresse à la fois ;
-- la même alerte déjà là (même spectacle, même département, même position à un kilomètre près, même rayon) ne se double
-- pas : si elle attend sa confirmation, son courriel repart (si les 24 heures le permettent) ; cinq alertes actives au
-- plus ; le courriel de confirmation, au plus un par adresse et par 24 heures (le lien du précédent confirme aussi
-- celle-ci, et le passage du matin écrit pour elle une fois les 24 heures passées), et 50 adresses au plus par 24 heures
create or replace function public.crescite_alertes_limites() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  deja public.crescite_alertes_tournee;
  courriel boolean;
begin
  if new.email is null or not new.active or new.confirme_le is not null then return new; end if;
  perform pg_advisory_xact_lock(hashtext('crescite_alertes ' || new.email));
  courriel := not public.crescite_alertes_confirmation_recente(new.email)
              and (select count(distinct lower(a.email)) from public.crescite_alertes_tournee a
                   where a.confirmation_statut in ('en_cours', 'envoye') and a.confirmation_le > now() - interval '24 hours') < 50;
  select * into deja from public.crescite_alertes_tournee a
   where lower(a.email) = new.email and a.active
     and a.spectacle_id is not distinct from new.spectacle_id and a.departement is not distinct from new.departement
     and a.rayon_km = new.rayon_km and (a.lat is null) = (new.lat is null)
     and (a.lat is null or (round(a.lat, 2) = round(new.lat, 2) and round(a.lon, 2) = round(new.lon, 2)))
   order by a.confirme_le nulls last limit 1;
  if deja.id is not null then
    if deja.confirme_le is null and courriel then
      update public.crescite_alertes_tournee set confirmation_statut = 'en_cours', confirmation_le = now() where id = deja.id;
      perform public.crescite_alertes_demander(deja.id);
    end if;
    return null;
  end if;
  if (select count(*) from public.crescite_alertes_tournee a where lower(a.email) = new.email and a.active) >= 5 then
    -- PT429 : PostgREST répond 429 (trop de demandes) ; la page montre ce message
    raise exception 'Cette adresse a déjà cinq alertes : arrêtez-en une (le lien est au bas de nos courriels) avant d’en ajouter une autre.'
      using errcode = 'PT429';
  end if;
  -- (une alerte déposée par la base elle-même avec l'état de son courriel le garde : le public, lui, n'en a jamais)
  if courriel and new.confirmation_statut is null then
    new.confirmation_statut := 'en_cours';
    new.confirmation_le := now();
  end if;
  return new;
end;
$$;

-- l'alerte déposée : son courriel de confirmation part (s'il lui revient)
create or replace function public.crescite_alertes_apres() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.confirmation_statut = 'en_cours' then perform public.crescite_alertes_demander(new.id); end if;
  return null;
end;
$$;

-- (les déclencheurs d'avant passent dans l'ordre de leur nom : la garde, puis les limites)
drop trigger if exists crescite_alertes_garde on public.crescite_alertes_tournee;
create trigger crescite_alertes_garde before insert or update on public.crescite_alertes_tournee
  for each row execute function public.crescite_alertes_garde();
drop trigger if exists crescite_alertes_limites on public.crescite_alertes_tournee;
create trigger crescite_alertes_limites before insert on public.crescite_alertes_tournee
  for each row execute function public.crescite_alertes_limites();
drop trigger if exists crescite_alertes_apres on public.crescite_alertes_tournee;
create trigger crescite_alertes_apres after insert on public.crescite_alertes_tournee
  for each row execute function public.crescite_alertes_apres();

-- les alertes déposées avant ce script (le septième les ouvrait au public sans confirmation, et le public pouvait y
-- choisir le jeton) : en attente, leur jeton tiré de nouveau, leur secteur relu par la garde. Relancé, le script ne
-- retire que les jetons d'alertes jamais confirmées dont aucun courriel n'est parti (aucun lien ne les porte)
update public.crescite_alertes_tournee set token_desinscription = replace(gen_random_uuid()::text, '-', '')
 where confirme_le is null and confirmation_statut is null;
update public.crescite_alertes_tournee set email = email;
create unique index if not exists crescite_alertes_tournee_jeton on public.crescite_alertes_tournee (token_desinscription);

-- ------------------------------------------------------------------------------------------------ ce que lit la fonction

-- une alerte telle que la montrent ses courriels et la page de réponse : son secteur et son spectacle, jamais l'adresse
create or replace function public.crescite_alerte_json(a public.crescite_alertes_tournee) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('commune', a.commune, 'code_postal', a.code_postal, 'departement', a.departement,
    'rayon_km', a.rayon_km, 'geo', a.lat is not null and a.lon is not null,
    'spectacle', (select s.titre from public.crescite_spectacles s where s.id = a.spectacle_id),
    'confirmee', a.confirme_le is not null, 'active', a.active)
$$;

-- une date telle que l'écrit le courriel d'une alerte : le spectacle, les jours, le lieu, la commune, ses séances tout
-- public à venir (non annulées) et le lien où réserver (celui de la date, sinon celui de sa première séance tout public
-- qui en a un, comme la carte « Réserver » du site ; jamais qu'une adresse web)
create or replace function public.crescite_alertes_date(d bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', x.id, 'debut', x.debut, 'fin', x.fin, 'precision', x.precision, 'saison', x.saison,
    'spectacle', jsonb_build_object('titre', s.titre, 'slug', s.slug, 'page', s.page),
    'lieu', case when l.id is null then null else jsonb_build_object('nom', l.nom, 'commune', l.commune, 'departement', l.departement) end,
    'seances', coalesce((select jsonb_agg(jsonb_build_object('jour', r.jour, 'heure', r.heure) order by r.jour, r.heure nulls last)
                         from public.crescite_representations r
                         where r.date_id = x.id and not r.annulee and r.public <> 'scolaire' and r.jour >= current_date), '[]'::jsonb),
    'lien', coalesce(case when x.lien ~* '^https?://\S+$' then x.lien end,
                     (select r.lien from public.crescite_representations r
                      where r.date_id = x.id and not r.annulee and r.public <> 'scolaire' and r.lien ~* '^https?://\S+$'
                      order by r.jour, r.heure nulls last limit 1)))
  from public.crescite_dates x
  join public.crescite_spectacles s on s.id = x.spectacle_id
  left join public.crescite_lieux l on l.id = x.lieu_id
  where x.id = d
$$;

-- les dates de chaque alerte confirmée et active : confirmées, visibles, des représentations ouvertes au public (tout
-- public ou mixte : les scolaires ne le sont pas), à venir, d'un spectacle publié (celui de l'alerte s'il y en a un), dans
-- son secteur (à moins de rayon_km quand l'alerte et le lieu ont une position, sinon le même département)
create or replace function public.crescite_alertes_correspondances() returns table (alerte_id bigint, date_id bigint)
language sql stable security definer set search_path = public as $$
  select a.id, x.id
  from public.crescite_alertes_tournee a
  join public.crescite_dates x on a.spectacle_id is null or x.spectacle_id = a.spectacle_id
  join public.crescite_spectacles s on s.id = x.spectacle_id
  join public.crescite_lieux l on l.id = x.lieu_id
  where a.active and a.confirme_le is not null and a.email is not null
    and x.statut = 'confirmee' and x.visible and x.nature = 'representations' and x.public in ('tout_public', 'mixte')
    and coalesce(x.fin, x.debut) >= current_date and s.publie
    and case when a.lat is not null and a.lon is not null and l.latitude is not null and l.longitude is not null
             then public.crescite_distance_km(a.lat, a.lon, l.latitude, l.longitude) <= a.rayon_km
             else a.departement is not null and upper(btrim(l.departement)) = a.departement end
$$;

-- le lot du passage : au plus « limite » alertes (un courriel chacune) qui ont des dates à recevoir, ces dates prises
-- (en_cours) le temps de l'envoi : deux passages en même temps n'écrivent pas deux fois la même date (une prise de plus
-- d'une heure, d'un passage interrompu, se reprend). Rend { alertes: [{ id, email, jeton, secteur, dates }], reste }
create or replace function public.crescite_alertes_lot(limite integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  with a_ecrire as (
    select c.alerte_id, c.date_id
    from public.crescite_alertes_correspondances() c
    left join public.crescite_alertes_envois e on e.alerte_id = c.alerte_id and e.date_id = c.date_id
    where e.alerte_id is null
       or (e.statut <> 'envoye' and not (e.statut = 'en_cours' and e.envoye_le > now() - interval '1 hour'))
  ), choisies as (
    select distinct alerte_id from a_ecrire order by alerte_id limit greatest(coalesce(limite, 0), 0)
  ), prises as (
    insert into public.crescite_alertes_envois as e (alerte_id, date_id, envoye_le, statut)
    select alerte_id, date_id, now(), 'en_cours' from a_ecrire where alerte_id in (select alerte_id from choisies)
    on conflict (alerte_id, date_id) do update set envoye_le = now(), statut = 'en_cours'
      where e.statut <> 'envoye' and not (e.statut = 'en_cours' and e.envoye_le > now() - interval '1 hour')
    returning e.alerte_id, e.date_id
  )
  select jsonb_build_object(
    'alertes', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'email', lower(a.email), 'jeton', a.token_desinscription,
                           'secteur', public.crescite_alerte_json(a),
                           'dates', (select jsonb_agg(public.crescite_alertes_date(x.id) order by x.debut, x.id)
                                     from public.crescite_dates x where x.id = any (p.ds))) order by a.id)
                         from public.crescite_alertes_tournee a
                         join (select alerte_id, array_agg(date_id) as ds from prises group by alerte_id) p on p.alerte_id = a.id),
                        '[]'::jsonb),
    'reste', (select count(distinct alerte_id) from a_ecrire) > greatest(coalesce(limite, 0), 0))
  into r;
  return r;
end;
$$;

-- les confirmations qui attendent leur courriel (une alerte déposée quand le courriel n'était pas en place, « non_configure »,
-- une erreur, une demande restée en route, une alerte venue dans les 24 heures d'un autre courriel), au plus « limite »
-- adresses, prises (en_cours) ; jamais une adresse qui a reçu un courriel de confirmation depuis moins de 24 heures, ni
-- une dont toutes les alertes en attente ont déjà eu le leur (pas de relance). Rend une alerte par adresse
create or replace function public.crescite_alertes_confirmations(limite integer) returns setof bigint
language plpgsql security definer set search_path = public as $$
declare x record;
begin
  -- les 50 adresses par 24 heures valent pour tous les courriels de confirmation : ceux partis au dépôt d'une alerte
  -- comptent, le passage du matin ne fait que compléter
  limite := least(coalesce(limite, 0), 50 - (select count(distinct lower(a.email))::int from public.crescite_alertes_tournee a
                   where a.confirmation_statut in ('en_cours', 'envoye') and a.confirmation_le > now() - interval '24 hours'));
  for x in
    select g.m, g.id from (
      select lower(a.email) as m, min(a.id) as id, min(a.cree_le) as depuis
      from public.crescite_alertes_tournee a
      where a.active and a.confirme_le is null and a.email is not null
      group by lower(a.email)
      having bool_or(a.confirmation_statut is distinct from 'envoye')) g
    where not public.crescite_alertes_confirmation_recente(g.m)
    order by g.depuis, g.id
  loop
    exit when coalesce(limite, 0) <= 0;
    -- l'adresse à soi seul le temps de la prendre (un dépôt au même instant attend) ; relue sous le verrou
    if pg_try_advisory_xact_lock(hashtext('crescite_alertes ' || x.m)) and not public.crescite_alertes_confirmation_recente(x.m) then
      update public.crescite_alertes_tournee set confirmation_statut = 'en_cours', confirmation_le = now()
       where lower(email) = x.m and active and confirme_le is null;
      limite := limite - 1;
      return next x.id;
    end if;
  end loop;
end;
$$;

-- ce qu'écrit le courriel de confirmation d'une alerte : l'adresse, le jeton du lien, les alertes de l'adresse qui
-- attendent leur confirmation (rien quand il n'y en a plus)
create or replace function public.crescite_alerte_courriel(alerte bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('email', lower(a.email), 'jeton', a.token_desinscription,
    'attente', (select jsonb_agg(public.crescite_alerte_json(b) order by b.cree_le, b.id)
                from public.crescite_alertes_tournee b
                where lower(b.email) = lower(a.email) and b.active and b.confirme_le is null))
  from public.crescite_alertes_tournee a
  where a.id = alerte and a.email is not null
    and exists (select 1 from public.crescite_alertes_tournee b
                where lower(b.email) = lower(a.email) and b.active and b.confirme_le is null)
$$;

-- les alertes jamais confirmées, 30 jours après leur courriel de confirmation (ou leur dépôt, s'il n'est jamais parti),
-- s'effacent ; rend le nombre d'alertes effacées
create or replace function public.crescite_alertes_purger() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from public.crescite_alertes_tournee
   where confirme_le is null
     and coalesce(case when confirmation_statut = 'envoye' then confirmation_le end, cree_le) < now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ------------------------------------------------------------------------------------------------ la page de réponse

-- une alerte vue par son jeton (le lien d'un courriel) : son secteur et son état, les alertes de la même adresse qui
-- attendent leur confirmation, combien l'adresse en a d'autres ; jamais l'adresse. Rien pour un jeton inconnu
create or replace function public.crescite_alerte_jeton(j text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('alerte', public.crescite_alerte_json(a),
    'attente', (select coalesce(jsonb_agg(public.crescite_alerte_json(b) order by b.cree_le, b.id), '[]'::jsonb)
                from public.crescite_alertes_tournee b
                where lower(b.email) = lower(a.email) and b.active and b.confirme_le is null),
    'autres', (select count(*) from public.crescite_alertes_tournee b where lower(b.email) = lower(a.email) and b.id <> a.id))
  from public.crescite_alertes_tournee a
  where a.token_desinscription = j and length(coalesce(j, '')) >= 32
$$;

-- confirmer, par le jeton d'une alerte : toutes les alertes actives de l'adresse qui attendaient leur confirmation
-- (un seul lien les confirme). Rend leur nombre (0 : rien n'attendait), ou rien pour un jeton inconnu
create or replace function public.crescite_alerte_confirmer(j text) returns integer
language plpgsql security definer set search_path = public as $$
declare
  m text;
  n integer;
begin
  select lower(email) into m from public.crescite_alertes_tournee where token_desinscription = j and length(coalesce(j, '')) >= 32;
  if m is null then return null; end if;
  update public.crescite_alertes_tournee set confirme_le = now() where lower(email) = m and active and confirme_le is null;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- arrêter, par le jeton d'une alerte : l'alerte s'efface (tout : toutes celles de l'adresse), avec ce qui lui a été écrit.
-- Rend le nombre d'alertes effacées, ou rien pour un jeton inconnu
create or replace function public.crescite_alerte_arreter(j text, tout boolean default false) returns integer
language plpgsql security definer set search_path = public as $$
declare
  i bigint;
  m text;
  n integer;
begin
  select id, lower(email) into i, m from public.crescite_alertes_tournee where token_desinscription = j and length(coalesce(j, '')) >= 32;
  if i is null then return null; end if;
  if coalesce(tout, false) and m is not null then
    delete from public.crescite_alertes_tournee where lower(email) = m;
  else
    delete from public.crescite_alertes_tournee where id = i;
  end if;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ------------------------------------------------------------------------------------------------ règles d'accès

-- ce qui a été écrit à chaque alerte : la fonction seule (aucune règle, aucun droit par l'API)
alter table public.crescite_alertes_envois enable row level security;
revoke all on public.crescite_alertes_envois from anon, authenticated, public;
grant all on public.crescite_alertes_envois to service_role;

-- le formulaire du site envoie confirme_le (vide ; la garde le vide de toute façon) : le public l'écrit, comme ses autres champs
grant insert (confirme_le) on public.crescite_alertes_tournee to anon;
-- le département d'un secteur sert à la garde, qui passe sous le rôle de celui qui dépose (un calcul, rien à lire)
grant execute on function public.crescite_departement(text) to anon, authenticated;
-- le reste ne sert qu'à la base et à la fonction crescite-courriel
revoke execute on function public.crescite_distance_km(double precision, double precision, double precision, double precision),
  public.crescite_alertes_confirmation_recente(text), public.crescite_alertes_demander(bigint),
  public.crescite_alerte_json(public.crescite_alertes_tournee), public.crescite_alertes_date(bigint),
  public.crescite_alertes_correspondances(), public.crescite_alertes_lot(integer), public.crescite_alertes_confirmations(integer),
  public.crescite_alerte_courriel(bigint), public.crescite_alertes_purger(), public.crescite_alerte_jeton(text),
  public.crescite_alerte_confirmer(text), public.crescite_alerte_arreter(text, boolean)
  from anon, authenticated, public;

commit;

-- l'envoi quotidien : chaque matin à 7 h 17 (heure UTC), pg_cron appelle crescite-courriel avec le jeton de la base (s'il
-- est disponible ; sinon, rien ne part et rien ne casse). La fonction répond quand elle a fini : deux minutes d'attente
do $$ begin perform set_config('crescite.alertes_quotidiennes', 'non', false); end $$;
do $$ begin
  create extension if not exists pg_cron;
exception when others then raise notice 'pg_cron : %', sqlerrm;
end $$;
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'crescite-alertes';
    perform cron.schedule('crescite-alertes', '17 7 * * *', $c$
      select net.http_post(
        url := 'https://omekkqjinvppadsoinvj.supabase.co/functions/v1/crescite-courriel',
        body := '{"alertes": true}'::jsonb,
        headers := jsonb_build_object('Content-Type', 'application/json',
                                      'x-crescite-jeton', (select valeur from public.crescite_secrets where cle = 'jeton_push')),
        timeout_milliseconds := 120000)
    $c$);
    perform set_config('crescite.alertes_quotidiennes', 'oui', false);
  end if;
exception when others then raise notice 'envoi quotidien des alertes : %', sqlerrm;
end $$;

notify pgrst, 'reload schema';

-- ce qui est en place
select 'alertes de tournée' as "élément",
  case when (select count(*) from pg_trigger where tgrelid = 'public.crescite_alertes_tournee'::regclass
             and tgname in ('crescite_alertes_garde', 'crescite_alertes_limites', 'crescite_alertes_apres')) = 3
        and to_regclass('public.crescite_alertes_envois') is not null
    then 'prêtes : double confirmation par courriel (cinq alertes actives au plus par adresse, un courriel de confirmation par adresse et par 24 heures)'
    else 'incomplètes : relancez ce script' end as "état"
union all
select 'envoi quotidien', case when current_setting('crescite.alertes_quotidiennes', true) = 'oui'
  then 'chaque matin à 7 h 17 (heure UTC, pg_cron), 200 courriels au plus : il reste à redéployer la fonction crescite-courriel (voir README)'
  else 'pg_cron manque : activez-le (Database → Extensions → pg_cron), puis relancez ce script' end
union all
select 'courriels', case when exists (select 1 from pg_extension where extname = 'pg_net')
  then 'la base appelle crescite-courriel ; sans clé d''envoi (BREVO_API_KEY ou RESEND_API_KEY), rien ne part : « non_configure »'
  else 'pg_net manque : aucun courriel de confirmation ne part (Database → Extensions → pg_net, puis relancez ce script)' end
union all
select 'inscrits', (select case when count(*) = 0 then 'aucune alerte pour l''instant'
                                else count(*) filter (where confirme_le is not null and active) || ' confirmée(s), '
                                     || count(*) filter (where confirme_le is null) || ' en attente de confirmation' end
                    from public.crescite_alertes_tournee);
