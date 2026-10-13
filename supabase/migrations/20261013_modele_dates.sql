-- Crescite : modèle de données proposé pour les dates, les lieux, la troupe et les feuilles de route.
-- Supabase (PostgreSQL 15 ou plus récent).
--
-- PROPOSITION À RELIRE AVANT TOUTE EXÉCUTION.
-- À exécuter uniquement dans un projet Supabase NEUF, créé au nom de la compagnie
-- (compte rattaché à admin@crescite.fr), jamais dans un projet personnel.
-- Exécuter ce script dans l'éditeur SQL de Supabase, d'un seul bloc (transaction).

begin;

-- 1. Types
create type public.public_cible as enum ('tout_public', 'scolaire');
create type public.statut_date as enum ('option', 'confirmee', 'contrat_signe', 'annulee', 'reportee');
create type public.role_membre as enum ('admin', 'diffusion', 'comedien', 'technicien');

-- 2. Tables
create table public.spectacles (
  id bigint generated always as identity primary key,
  slug text not null unique,
  titre text not null,
  sous_titre text,
  annee_creation smallint,
  duree_minutes smallint,
  age_minimum smallint,
  niveaux_scolaires text,
  accroche text,
  texte_public text,
  texte_falc text,                      -- version « facile à lire et à comprendre »
  texte_pro text,
  video_url text,
  dossier_diffusion_url text,
  fiche_technique_url text,
  dossier_pedagogique_url text,
  cred76_url text,
  pass_culture boolean not null default false,
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);

create table public.lieux (
  id bigint generated always as identity primary key,
  nom text not null,
  adresse text,
  code_postal text,
  commune text not null,
  code_insee text,
  departement text,
  pays text not null default 'FR',
  latitude double precision,
  longitude double precision,
  jauge integer,
  plateau text,
  site_web text,
  billetterie_url text,
  contact_nom text,                     -- interne
  contact_email text,                   -- interne
  contact_telephone text,               -- interne
  notes_internes text,                  -- interne
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  unique (nom, commune)
);

create table public.tournees (
  id bigint generated always as identity primary key,
  nom text not null,
  depart date,
  retour date,
  vehicules text,
  hebergement text,
  notes_internes text,
  cree_le timestamptz not null default now(),
  check (retour is null or depart is null or retour >= depart)
);

create table public.representations (
  id bigint generated always as identity primary key,
  spectacle_id bigint not null references public.spectacles (id),
  lieu_id bigint not null references public.lieux (id),
  tournee_id bigint references public.tournees (id) on delete set null,
  jour date not null,
  jour_fin date,
  heure time,
  horaire_texte text,                   -- « matin », « 14h et 20h » quand l'heure exacte manque
  public public.public_cible not null default 'tout_public',
  statut public.statut_date not null default 'confirmee',
  visible_site boolean not null default true,
  nb_representations smallint,
  details_public text,                  -- phrase affichée sur le site
  reservation_url text,
  organisateur text,
  notes_internes text,                  -- interne
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  check (jour_fin is null or jour_fin >= jour)
);
create index representations_jour_idx on public.representations (jour);
create index representations_spectacle_jour_idx on public.representations (spectacle_id, jour);

create table public.personnes (
  id bigint generated always as identity primary key,
  user_id uuid unique references auth.users (id) on delete set null,
  prenom text not null,
  nom text not null,
  role public.role_membre not null default 'comedien',
  email text unique,
  telephone text,
  actif boolean not null default true,
  cree_le timestamptz not null default now()
);

create table public.spectacle_equipe (  -- équipe habituelle d'un spectacle, pour pré-remplir les distributions
  spectacle_id bigint not null references public.spectacles (id) on delete cascade,
  personne_id bigint not null references public.personnes (id) on delete cascade,
  role_dans_le_spectacle text,
  primary key (spectacle_id, personne_id)
);

create table public.distributions (     -- qui joue ou travaille à chaque date
  representation_id bigint not null references public.representations (id) on delete cascade,
  personne_id bigint not null references public.personnes (id) on delete cascade,
  role_dans_le_spectacle text,
  convocation time,
  remplace_personne_id bigint references public.personnes (id),
  primary key (representation_id, personne_id)
);

create table public.feuilles_de_route (
  id bigint generated always as identity primary key,
  tournee_id bigint references public.tournees (id) on delete cascade,
  representation_id bigint references public.representations (id) on delete cascade,
  contenu jsonb not null default '{}'::jsonb,   -- planning, trajets, repas, hôtel, contacts
  pdf_url text,
  version integer not null default 1,
  publiee_le timestamptz,
  cree_le timestamptz not null default now(),
  check (tournee_id is not null or representation_id is not null)
);

-- 3. Date de modification tenue à jour automatiquement
create or replace function public.touch_modifie_le() returns trigger
language plpgsql as $$
begin
  new.modifie_le := now();
  return new;
end;
$$;
create trigger spectacles_touch before update on public.spectacles for each row execute function public.touch_modifie_le();
create trigger lieux_touch before update on public.lieux for each row execute function public.touch_modifie_le();
create trigger representations_touch before update on public.representations for each row execute function public.touch_modifie_le();

-- 4. Qui est connecté ? (fonctions utilisées par les règles d'accès)
create or replace function public.ma_personne() returns bigint
language sql stable security definer set search_path = public as $$
  select id from public.personnes where user_id = auth.uid() and actif
$$;

create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin', 'diffusion') from public.personnes where user_id = auth.uid() and actif), false)
$$;

create or replace function public.je_joue(rep_id bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.distributions d where d.representation_id = rep_id and d.personne_id = public.ma_personne())
$$;

create or replace function public.ma_tournee(t_id bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.distributions d
    join public.representations r on r.id = d.representation_id
    where r.tournee_id = t_id and d.personne_id = public.ma_personne()
  )
$$;

-- 5. Règles d'accès (RLS) : le public lit, la troupe lit ce qui la concerne, l'administration écrit
alter table public.spectacles enable row level security;
alter table public.lieux enable row level security;
alter table public.tournees enable row level security;
alter table public.representations enable row level security;
alter table public.personnes enable row level security;
alter table public.spectacle_equipe enable row level security;
alter table public.distributions enable row level security;
alter table public.feuilles_de_route enable row level security;

create policy spectacles_lecture on public.spectacles for select using (actif or public.est_admin());
create policy lieux_lecture on public.lieux for select using (true);
create policy representations_lecture on public.representations for select using (
  (visible_site and statut in ('confirmee', 'contrat_signe')) or public.est_admin() or public.je_joue(id)
);
create policy tournees_lecture on public.tournees for select using (public.est_admin() or public.ma_tournee(id));
create policy personnes_lecture on public.personnes for select using (user_id = auth.uid() or public.est_admin());
create policy equipe_lecture on public.spectacle_equipe for select using (auth.uid() is not null);
create policy distributions_lecture on public.distributions for select using (personne_id = public.ma_personne() or public.est_admin());
create policy feuilles_lecture on public.feuilles_de_route for select using (
  public.est_admin() or public.je_joue(representation_id) or public.ma_tournee(tournee_id)
);

create policy spectacles_ecriture on public.spectacles for all using (public.est_admin()) with check (public.est_admin());
create policy lieux_ecriture on public.lieux for all using (public.est_admin()) with check (public.est_admin());
create policy tournees_ecriture on public.tournees for all using (public.est_admin()) with check (public.est_admin());
create policy representations_ecriture on public.representations for all using (public.est_admin()) with check (public.est_admin());
create policy personnes_ecriture on public.personnes for all using (public.est_admin()) with check (public.est_admin());
create policy equipe_ecriture on public.spectacle_equipe for all using (public.est_admin()) with check (public.est_admin());
create policy distributions_ecriture on public.distributions for all using (public.est_admin()) with check (public.est_admin());
create policy feuilles_ecriture on public.feuilles_de_route for all using (public.est_admin()) with check (public.est_admin());

-- 6. Colonnes visibles sans connexion : jamais les contacts ni les notes internes
revoke all on public.lieux, public.representations, public.spectacles from anon;
revoke all on public.personnes, public.distributions, public.tournees, public.feuilles_de_route, public.spectacle_equipe from anon;
grant select on public.spectacles to anon;
grant select (id, nom, commune, code_insee, departement, pays, latitude, longitude, site_web, billetterie_url) on public.lieux to anon;
grant select (id, spectacle_id, lieu_id, jour, jour_fin, heure, horaire_texte, public, statut, visible_site,
              nb_representations, details_public, reservation_url) on public.representations to anon;

-- 7. Vue publique de l'agenda (lue par le site, la carte, le flux iCal et les données Google)
create view public.agenda_public with (security_invoker = true) as
select r.id, s.slug as spectacle_slug, s.titre as spectacle, r.jour, r.jour_fin, r.heure, r.horaire_texte,
       r.public, r.details_public, r.reservation_url, r.nb_representations,
       l.nom as lieu, l.commune, l.departement, l.pays, l.latitude, l.longitude
from public.representations r
join public.spectacles s on s.id = r.spectacle_id
join public.lieux l on l.id = r.lieu_id
where r.visible_site and r.statut in ('confirmee', 'contrat_signe');
grant select on public.agenda_public to anon, authenticated;

-- 8. Les spectacles du répertoire (textes complets à reprendre depuis crescite.fr)
insert into public.spectacles (slug, titre, sous_titre, annee_creation, pass_culture) values
  ('cleophene', 'Cléophène', 'd’après Rodogune de Pierre Corneille', 2024, false),
  ('ci-gisait-cyrano', 'Ci-gisait Cyrano', 'd’après Cyrano de Bergerac d’Edmond Rostand', 2023, true),
  ('berenice', 'Bérénice', 'de Jean Racine', 2018, true),
  ('mon-royaume', 'Mon Royaume pour un cheval', 'Romeo & Juliet, d’après Shakespeare', 2013, true),
  ('imaginaire-force', 'L’imaginaire forcé', 'd’après Le Mariage forcé de Molière', 2012, true),
  ('la-folle-idee', 'La Folle Idée', 'texte d’Angelo Jossec et Corinne Meyniel', 2021, false),
  ('macbeth-fatum', 'Macbeth – Fatum', 'd’après Shakespeare', 2016, false)
on conflict (slug) do nothing;

commit;

-- Ensuite : importer l'historique 2016-2027 (data/representations-site-2016-2027.csv, 464 lignes géolocalisées)
-- dans une table de travail via l'import CSV de Supabase, puis le répartir entre lieux et representations.
