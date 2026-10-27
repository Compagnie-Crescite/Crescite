-- Crescite : le code d'accès des salles (le dix-neuvième script). Une invitation de l'espace des salles s'ouvre par son
-- lien, …/pro/#<jeton> : un jeton de 64 caractères, qu'on ne lit pas à voix haute et qu'on ne recopie pas. Ce script
-- donne à chaque invitation, en plus, un code court qu'on lit, qu'on dicte et qu'on tape : dix caractères, sans les
-- lettres et les chiffres qu'on confond (ni I, L, O, ni 0, 1), montré en deux groupes (« K7QM4-TZPXW »). Le programmateur
-- le saisit dans « Code d'accès » de l'espace des salles ; le lien continue de marcher comme avant.
--
-- À exécuter dans le projet de la compagnie (fwjgyfzcbcmfyfkhhtuh), après les autres (SQL Editor → New query → coller →
-- Run). Il peut être relancé sans dommage. Puis redéployer la fonction crescite-pro (elle accepte désormais un code de
-- dix caractères, et plus seulement un jeton) : sans elle, le code s'affiche dans l'administration mais ne s'ouvre pas.
--   crescite_acces_pro.code     le code de chaque invitation, tiré au hasard à sa création (et donné aux anciennes),
--                               unique ; seule l'administration le lit, comme le jeton
--   crescite_pro_acces(j)       une invitation valide, par son jeton ou par son code (espaces, tirets et minuscules
--                               admis) ; les codes essayés en vain sont comptés : au-delà de 60 en dix minutes, plus
--                               aucun code ne s'ouvre pendant ce temps (le lien, lui, s'ouvre toujours)
--   crescite_pro_essais         ces essais, gardés une heure, sans rien qui désigne qui les a faits

begin;

-- un code neuf : dix caractères pris dans un alphabet sans ambiguïté, à partir du hasard de gen_random_uuid (sans pgcrypto)
create or replace function public.crescite_pro_code_neuf() returns text
language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  h text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  r text := '';
begin
  for i in 0..9 loop
    r := r || substr(alphabet, 1 + (('x' || substr(h, i * 4 + 1, 4))::bit(16)::int % 31), 1);
  end loop;
  return r;
end;
$$;

-- ce qu'on a tapé, ramené à la forme du code : sans espaces ni tirets, en capitales
create or replace function public.crescite_pro_code_net(j text) returns text
language sql immutable set search_path = public as $$
  select upper(regexp_replace(coalesce(j, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

alter table public.crescite_acces_pro add column if not exists code text;
update public.crescite_acces_pro set code = public.crescite_pro_code_neuf() where code is null;
alter table public.crescite_acces_pro alter column code set default public.crescite_pro_code_neuf();
alter table public.crescite_acces_pro alter column code set not null;
create unique index if not exists crescite_acces_pro_code on public.crescite_acces_pro (code);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'crescite_acces_pro_code_forme') then
    alter table public.crescite_acces_pro add constraint crescite_acces_pro_code_forme check (code ~ '^[A-HJKMNP-Z2-9]{10}$');
  end if;
end $$;

create table if not exists public.crescite_pro_essais (quand timestamptz not null default now());
create index if not exists crescite_pro_essais_quand on public.crescite_pro_essais (quand);
alter table public.crescite_pro_essais enable row level security;

-- une invitation valide : active et pas encore échue, par son jeton (le lien) ou par son code (saisi)
create or replace function public.crescite_pro_acces(j text) returns public.crescite_acces_pro
language plpgsql volatile security definer set search_path = public as $$
declare
  a public.crescite_acces_pro;
  c text := public.crescite_pro_code_net(j);
begin
  if length(coalesce(j, '')) >= 32 then
    select x.* into a from public.crescite_acces_pro x where x.jeton = j and x.actif and x.expire_le >= current_date;
    return a;
  end if;
  if length(c) <> 10 then return a; end if;
  delete from public.crescite_pro_essais where quand < now() - interval '1 hour';
  if (select count(*) from public.crescite_pro_essais where quand > now() - interval '10 minutes') >= 60 then return a; end if;
  select x.* into a from public.crescite_acces_pro x where x.code = c and x.actif and x.expire_le >= current_date;
  if a.id is null then insert into public.crescite_pro_essais default values; end if;
  return a;
end;
$$;

grant execute on function public.crescite_pro_code_neuf() to authenticated, service_role;
revoke execute on function public.crescite_pro_code_neuf() from anon, public;
revoke execute on function public.crescite_pro_code_net(text), public.crescite_pro_acces(text) from anon, authenticated, public;
grant all on public.crescite_pro_essais to service_role;
revoke all on public.crescite_pro_essais from anon, authenticated;

commit;

notify pgrst, 'reload schema';

select 'code d''accès des salles' as "élément",
  case when (select count(*) from public.crescite_acces_pro where code is null) = 0
            and exists (select 1 from pg_indexes where indexname = 'crescite_acces_pro_code')
    then 'prêt : ' || (select count(*) from public.crescite_acces_pro) || ' invitation(s) avec leur code ; redéployez la fonction crescite-pro'
    else 'à refaire : relancez ce script' end as "état";
