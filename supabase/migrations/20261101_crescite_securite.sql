-- Crescite : la sécurité (revue d'octobre 2026). À exécuter après les douze premiers scripts (le onzième d'abord : les
-- alertes confirmées), de la même façon (SQL Editor → New query → coller → Run). Il peut être relancé sans dommage et ne
-- touche qu'à ce qui commence par crescite_.
--
-- Ce qu'il ferme :
-- 1. Rattacher un compte à une fiche : seulement par une adresse électronique confirmée (celle de auth.users), jamais par
--    celle que porte le jeton seul (un compte qui changerait son adresse sans la confirmer ne prend la fiche de personne).
-- 2. Ce que le public dépose (alertes de tournée, demandes de devis) : un débit par origine (une empreinte salée de
--    l'adresse IP, jamais l'adresse elle-même, gardée deux jours) et un plafond par jour ; les demandes de devis, des
--    longueurs bornées partout.
-- 3. Le public n'écrit que les champs de ses formulaires (ni l'identifiant, ni la date, ni le suivi).
-- 4. Les abonnements aux notifications : seulement vers les services de notification connus, en https.
-- 5. Les lieux : le public ne lit que ceux d'une date montrée sur le site (pas les salles de répétition, ni celles d'une
--    option), et sans leur adresse postale.
-- 6. Les fiches de l'équipe : le public ne lit que ce que le site montre (pas la source des photos, ni les biographies).
-- 7. Les alertes de tournée (le onzième script, renforcé) : le nom de commune repris dans les courriels n'est fait que de
--    lettres (ni adresse de site, ni lien), la position est gardée au kilomètre près, et les 50 adresses par 24 heures
--    comptent tous les courriels de confirmation (ceux du dépôt comme ceux du matin).

begin;

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public'
                 and table_name = 'crescite_alertes_tournee' and column_name = 'confirme_le') then
    raise exception 'Lancez d''abord le onzième script (20261030_crescite_alertes.sql), puis celui-ci.';
  end if;
end $$;

-- ------------------------------------------------------------------------------------------------ 1. rattacher un compte

-- à la première connexion : rattache le compte à la fiche dont l'adresse est celle du compte, si cette adresse est
-- confirmée (et si aucune fiche ne l'est encore) ; renvoie l'identifiant de la fiche, ou rien
create or replace function public.crescite_rattacher() returns bigint
language plpgsql security definer set search_path = public as $$
declare
  courriel text;
  p bigint;
begin
  if auth.uid() is null then return null; end if;
  select personne_id into p from public.crescite_personnes_privees where user_id = auth.uid();
  if p is not null then return p; end if;
  select lower(nullif(u.email, '')) into courriel from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null;
  if courriel is null then return null; end if;
  update public.crescite_personnes_privees set user_id = auth.uid(), modifie_le = now()
   where lower(email) = courriel and user_id is null
  returning personne_id into p;
  return p;
end;
$$;
revoke execute on function public.crescite_rattacher() from anon, public;
grant execute on function public.crescite_rattacher() to authenticated;

-- ------------------------------------------------------------------------------------------------ 2. le débit du public

-- chaque dépôt du public : quoi, d'où (une empreinte), quand ; personne ne les lit (seules les fonctions ci-dessous)
create table if not exists public.crescite_debits (
  id bigint generated always as identity primary key,
  quoi text not null,
  origine text,
  quand timestamptz not null default now()
);
create index if not exists crescite_debits_origine on public.crescite_debits (quoi, origine, quand);
create index if not exists crescite_debits_quand on public.crescite_debits (quand);
alter table public.crescite_debits enable row level security;
revoke all on public.crescite_debits from anon, authenticated, public;

-- le sel des empreintes : tiré une fois, jamais montré
insert into public.crescite_secrets (cle, valeur)
values ('sel_origine', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (cle) do nothing;

-- l'origine d'une requête : l'adresse IP que la plateforme transmet, salée et hachée (rien si elle n'en transmet pas)
create or replace function public.crescite_origine() returns text
language plpgsql stable security definer set search_path = public as $$
declare
  h json;
  ip text;
  sel text;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    return null;
  end;
  ip := btrim(coalesce(h ->> 'cf-connecting-ip', h ->> 'x-real-ip', split_part(h ->> 'x-forwarded-for', ',', 1)));
  if ip is null or ip = '' then return null; end if;
  select valeur into sel from public.crescite_secrets where cle = 'sel_origine';
  return md5(coalesce(sel, '') || ip);
end;
$$;
revoke execute on function public.crescite_origine() from anon, authenticated, public;

-- compter un dépôt, ou le refuser (PT429 : PostgREST répond 429, la page montre le message) : au plus par_heure et
-- par_jour depuis une même origine, total par jour en tout ; les traces de plus de deux jours s'effacent. Le public
-- l'exécute (par le déclencheur ci-dessous, qui tourne sous son rôle) mais ne l'appelle jamais lui-même : hors d'un
-- déclencheur, elle refuse
create or replace function public.crescite_debit_compter(quoi text, par_heure integer, par_jour integer, total integer)
returns void
language plpgsql security definer set search_path = public as $$
declare o text;
begin
  if pg_trigger_depth() = 0 then
    raise exception 'crescite_debit_compter ne s''appelle que depuis un dépôt' using errcode = '42501';
  end if;
  o := public.crescite_origine();
  perform pg_advisory_xact_lock(hashtext('crescite_debit ' || quoi));
  delete from public.crescite_debits where quand < now() - interval '2 days';
  if (select count(*) from public.crescite_debits d where d.quoi = crescite_debit_compter.quoi and d.quand > now() - interval '24 hours') >= total then
    raise exception 'Trop de demandes aujourd’hui : réessayez demain, ou écrivez-nous.' using errcode = 'PT429';
  end if;
  if o is not null and (
       (select count(*) from public.crescite_debits d where d.quoi = crescite_debit_compter.quoi and d.origine = o and d.quand > now() - interval '1 hour') >= par_heure
    or (select count(*) from public.crescite_debits d where d.quoi = crescite_debit_compter.quoi and d.origine = o and d.quand > now() - interval '24 hours') >= par_jour) then
    raise exception 'Trop de demandes depuis votre connexion : réessayez plus tard, ou écrivez-nous.' using errcode = 'PT429';
  end if;
  insert into public.crescite_debits (quoi, origine) values (crescite_debit_compter.quoi, o);
end;
$$;
revoke execute on function public.crescite_debit_compter(text, integer, integer, integer) from public;
grant execute on function public.crescite_debit_compter(text, integer, integer, integer) to anon, authenticated;

-- le déclencheur : seulement pour le public (anon, ou un compte qui n'est pas administrateur) ; ses limites en arguments
-- (quoi, par heure, par jour, total par jour). (current_user est ici celui qui dépose : la fonction n'est pas security
-- definer ; le comptage, lui, l'est.)
create or replace function public.crescite_debit() returns trigger
language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') and not coalesce(public.crescite_est_admin(), false) then
    perform public.crescite_debit_compter(tg_argv[0], tg_argv[1]::integer, tg_argv[2]::integer, tg_argv[3]::integer);
  end if;
  return new;
end;
$$;

-- (« crescite_alertes_debit » passe avant la garde et les limites du onzième script : les déclencheurs d'avant passent
-- dans l'ordre de leur nom)
drop trigger if exists crescite_alertes_debit on public.crescite_alertes_tournee;
create trigger crescite_alertes_debit before insert on public.crescite_alertes_tournee
  for each row execute function public.crescite_debit('alerte', '5', '20', '300');
drop trigger if exists crescite_devis_debit on public.crescite_devis_demandes;
create trigger crescite_devis_debit before insert on public.crescite_devis_demandes
  for each row execute function public.crescite_debit('devis', '3', '10', '100');

-- les demandes de devis : des longueurs bornées partout (la règle du septième script n'en bornait que certaines)
do $$
begin
  alter table public.crescite_devis_demandes drop constraint if exists crescite_devis_bornes;
  alter table public.crescite_devis_demandes add constraint crescite_devis_bornes check (
    length(type_lieu) <= 40 and length(coalesce(dimensions_plateau, '')) <= 160 and length(coalesce(departement, '')) <= 60
    and (jauge_estimee is null or jauge_estimee between 0 and 100000)
    and length(structure_nom) <= 200 and length(commune) <= 120 and length(contact_nom) <= 200
    and length(contact_email) <= 254 and length(coalesce(contact_tel, '')) <= 40
    and length(coalesce(message, '')) <= 5000 and length(coalesce(periode_souhaitee, '')) <= 200) not valid;
  begin
    alter table public.crescite_devis_demandes validate constraint crescite_devis_bornes;
  exception when check_violation then
    raise notice 'demandes de devis : d''anciennes lignes dépassent les bornes ; les nouvelles les respectent';
  end;
end $$;

-- ------------------------------------------------------------------------------------------------ 3. les champs des formulaires

revoke insert on public.crescite_alertes_tournee from anon;
grant insert (email, code_postal, commune, departement, lat, lon, rayon_km, spectacle_id, confirme_le)
  on public.crescite_alertes_tournee to anon;
revoke insert on public.crescite_devis_demandes from anon;
grant insert (spectacle_id, type_lieu, dimensions_plateau, jauge_estimee, structure_nom, commune, departement, contact_nom,
              contact_email, contact_tel, periode_souhaitee, message)
  on public.crescite_devis_demandes to anon;

-- ------------------------------------------------------------------------------------------------ 4. les abonnements

do $$
begin
  alter table public.crescite_abonnements drop constraint if exists crescite_abonnements_service;
  alter table public.crescite_abonnements add constraint crescite_abonnements_service check (endpoint ~
    '^https://(fcm\.googleapis\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com|[a-z0-9.-]+\.notify\.windows\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com)/')
    not valid;
  begin
    alter table public.crescite_abonnements validate constraint crescite_abonnements_service;
  exception when check_violation then
    raise notice 'abonnements : d''anciens abonnements vont ailleurs ; les nouveaux, seulement vers les services connus';
  end;
end $$;

-- ------------------------------------------------------------------------------------------------ 5. les lieux

-- une règle restrictive : elle s'ajoute aux autres (même relancé, le premier script n'ouvre pas davantage au public).
-- La sous-requête passe par les règles des dates : un lieu se montre s'il accueille une date que le public voit
-- (visible, pas une option, d'un spectacle publié)
drop policy if exists secu_lieux_public on public.crescite_lieux;
create policy secu_lieux_public on public.crescite_lieux as restrictive for select to anon
  using (exists (select 1 from public.crescite_dates d where d.lieu_id = crescite_lieux.id));
revoke select on public.crescite_lieux from anon;
grant select (id, nom, type, commune, departement, pays, latitude, longitude, site_web) on public.crescite_lieux to anon;

-- ------------------------------------------------------------------------------------------------ 6. les fiches de l'équipe

revoke select on public.crescite_personnes from anon;
grant select (id, slug, prenom, nom, metiers, photo, photo_credit, photo_publique, publie, ordre) on public.crescite_personnes to anon;

-- ------------------------------------------------------------------------------------------------ 7. les alertes de tournée

-- (les mêmes que dans le onzième script : relancé, il ne revient pas en arrière)
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

commit;

notify pgrst, 'reload schema';

-- ce qui est en place
select 'rattacher un compte' as "élément",
  case when position('email_confirmed_at' in pg_get_functiondef('public.crescite_rattacher()'::regprocedure)) > 0
    then 'prêt : seulement par une adresse confirmée' else 'à refaire : relancez ce script' end as "état"
union all
select 'débit du public',
  case when (select count(*) from pg_trigger where tgname in ('crescite_alertes_debit', 'crescite_devis_debit') and not tgisinternal) = 2
    then 'prêt : alertes 5 par heure et 20 par jour par origine (300 par jour en tout), devis 3 et 10 (100)' else 'à refaire : relancez ce script' end
union all
select 'champs des formulaires',
  case when not has_column_privilege('anon', 'public.crescite_devis_demandes', 'statut', 'INSERT')
        and not has_column_privilege('anon', 'public.crescite_alertes_tournee', 'id', 'INSERT')
    then 'prêts : le public n''écrit que les champs de ses formulaires' else 'à refaire : relancez ce script' end
union all
select 'alertes de tournée',
  case when position('[:alpha:]' in pg_get_functiondef('public.crescite_alertes_garde()'::regprocedure)) > 0
        and position('50 -' in pg_get_functiondef('public.crescite_alertes_confirmations(integer)'::regprocedure)) > 0
    then 'prêtes : des communes sans lien, des positions au kilomètre, 50 adresses par jour en tout' else 'à refaire : relancez ce script' end
union all
select 'lieux et fiches',
  case when not has_column_privilege('anon', 'public.crescite_lieux', 'adresse', 'SELECT')
        and not has_column_privilege('anon', 'public.crescite_personnes', 'photo_source', 'SELECT')
    then 'prêts : le public ne lit que ce que le site montre' else 'à refaire : relancez ce script' end;
