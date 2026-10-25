-- Crescite : extensions « Compagnie Idéale »
-- Chantiers retenus :
--   1. Alertes de tournée par proximité géographique (crescite_alertes_tournee)
--   2. Simulateur d'accueil & Devis flash (crescite_devis_demandes)
--   7. Notes de frais mobiles pour les intermittents (crescite_notes_frais + bucket crescite-frais)
--   8. Régie Matériel & Checklist de chargement du camion (crescite_materiel + crescite_checklists_chargement)
--  10. Pipeline CRM de diffusion Kanban (colonnes CRM sur crescite_dates_suivi + table crescite_diffusion_prospects)
--
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor -> New query -> coller -> Run).
-- Le script est idempotent et peut être relancé sans dommage.

begin;

-- =====================================================================================================
-- 1. ALERTES DE TOURNÉE (PROXIMITÉ GÉOGRAPHIQUE)
-- =====================================================================================================

create table if not exists public.crescite_alertes_tournee (
  id bigserial primary key,
  email text,
  push_subscription jsonb,
  code_postal text,
  commune text,
  departement text,
  lat numeric(9, 6),
  lon numeric(9, 6),
  rayon_km integer not null default 40,
  spectacle_id integer references public.crescite_spectacles (id) on delete cascade,
  token_desinscription text not null default replace(gen_random_uuid()::text, '-', ''),   -- sans pgcrypto
  active boolean not null default true,
  derniere_notification_le timestamptz,
  cree_le timestamptz not null default now()
);

create index if not exists crescite_alertes_tournee_dep on public.crescite_alertes_tournee (departement);
create index if not exists crescite_alertes_tournee_active on public.crescite_alertes_tournee (active) where active = true;

-- =====================================================================================================
-- 2. SIMULATEUR D'ACCUEIL & DEVIS FLASH (PROGRAMMATEURS)
-- =====================================================================================================

create table if not exists public.crescite_devis_demandes (
  id bigserial primary key,
  spectacle_id integer references public.crescite_spectacles (id) on delete set null,
  type_lieu text not null,                          -- 'theatre', 'polyvalente', 'etablissement', 'exterieur', 'autre'
  dimensions_plateau text,                         -- ex. '9m x 7m x 5m'
  jauge_estimee integer,
  structure_nom text not null,
  commune text not null,
  departement text,
  contact_nom text not null,
  contact_email text not null,
  contact_tel text,
  periode_souhaitee text,
  message text,
  statut text not null default 'nouveau',          -- 'nouveau', 'en_cours', 'devis_envoye', 'confirme', 'sans_suite'
  notes_internes text,
  cree_le timestamptz not null default now()
);

create index if not exists crescite_devis_statut on public.crescite_devis_demandes (statut);

-- =====================================================================================================
-- 7. NOTES DE FRAIS MOBILES (INTERMITTENTS EN TOURNÉE)
-- =====================================================================================================

create table if not exists public.crescite_notes_frais (
  id bigserial primary key,
  personne_id integer not null references public.crescite_personnes (id) on delete cascade,
  date_id bigint references public.crescite_dates (id) on delete set null,
  date_depense date,                               -- le jour de la dépense (celui du ticket)
  categorie text not null,                         -- 'repas', 'transport', 'peage_carburant', 'hebergement', 'autre'
  montant_ttc numeric(8, 2) not null,
  photo_url text,                                  -- le chemin du justificatif dans « crescite-frais » : <personne_id>/<horodatage>_<nom>
  commentaire text,
  statut text not null default 'en_attente',       -- 'en_attente', 'valide', 'rembourse', 'refuse'
  cree_le timestamptz not null default now(),
  valide_le timestamptz,
  valide_par uuid,
  rembourse_le timestamptz
);

-- (une table créée par une version d'avant de ce script : la colonne s'ajoute)
alter table public.crescite_notes_frais add column if not exists date_depense date;

create index if not exists crescite_notes_frais_personne on public.crescite_notes_frais (personne_id);
create index if not exists crescite_notes_frais_date on public.crescite_notes_frais (date_id);
create index if not exists crescite_notes_frais_statut on public.crescite_notes_frais (statut);

-- =====================================================================================================
-- 8. RÉGIE MATÉRIEL & CHECKLIST DE CHARGEMENT CAMION
-- =====================================================================================================

create table if not exists public.crescite_materiel (
  id bigserial primary key,
  spectacle_id integer references public.crescite_spectacles (id) on delete cascade,
  malle text not null,                             -- 'Malle Lumière A', 'Fly Son', 'Caisse Décor 1', 'Penderie Costumes'
  categorie text not null,                         -- 'lumiere', 'son', 'costumes', 'accessoires', 'regie', 'decor'
  intitule text not null,                          -- 'Projecteurs Découpe 614SX', 'Micro HF serre-tête'
  quantite integer not null default 1,
  priorite text not null default 'indispensable',  -- 'indispensable', 'confort', 'rechange'
  notes text,
  cree_le timestamptz not null default now()
);

create index if not exists crescite_materiel_sp on public.crescite_materiel (spectacle_id);

create table if not exists public.crescite_checklists_chargement (
  id bigserial primary key,
  date_id bigint not null references public.crescite_dates (id) on delete cascade,
  materiel_id bigint not null references public.crescite_materiel (id) on delete cascade,
  phase text not null,                             -- 'depart_rouen', 'arrivee_salle', 'remballage', 'retour_rouen'
  coche boolean not null default false,
  coche_par integer references public.crescite_personnes (id) on delete set null,
  coche_le timestamptz,
  unique (date_id, materiel_id, phase)
);

create index if not exists crescite_checklists_date on public.crescite_checklists_chargement (date_id, phase);

-- =====================================================================================================
-- 10. CRM DE DIFFUSION (PIPELINE KANBAN)
-- =====================================================================================================

-- Enrichissement de crescite_dates_suivi pour intégrer le suivi d'opportunité commerciale
alter table public.crescite_dates_suivi
  add column if not exists etape_crm text not null default 'option_posee',
  add column if not exists montant_cession numeric(10, 2),
  add column if not exists date_dernier_contact date,
  add column if not exists date_prochaine_relance date,
  add column if not exists notes_diffusion text;

-- Table des pistes/prospects de diffusion (lieux & programmateurs prospectés avant même de poser une date)
create table if not exists public.crescite_diffusion_prospects (
  id bigserial primary key,
  spectacle_id integer references public.crescite_spectacles (id) on delete set null,
  structure text not null,
  commune text not null,
  departement text,
  contact_nom text,
  contact_email text,
  contact_tel text,
  etape text not null default 'contact_pris',      -- 'contact_pris', 'dossier_envoye', 'option_discutee', 'refus', 'converti_en_date'
  date_dernier_contact date not null default current_date,
  date_prochaine_relance date,
  notes text,
  date_convertie_id bigint references public.crescite_dates (id) on delete set null,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);

create index if not exists crescite_diff_prospects_etape on public.crescite_diffusion_prospects (etape);

-- =====================================================================================================
-- RÈGLES DE SÉCURITÉ (RLS)
-- =====================================================================================================

alter table public.crescite_alertes_tournee enable row level security;
alter table public.crescite_devis_demandes enable row level security;
alter table public.crescite_notes_frais enable row level security;
alter table public.crescite_materiel enable row level security;
alter table public.crescite_checklists_chargement enable row level security;
alter table public.crescite_diffusion_prospects enable row level security;

-- Nettoyage des anciennes politiques ide_...
do $$
declare
  p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies
           where schemaname = 'public' and policyname like 'ide\_%' loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- 1. Alertes : le public peut s'inscrire, désinscrire via son token, l'admin voit tout
create policy ide_alertes_inscrire on public.crescite_alertes_tournee for insert to anon, authenticated
  with check (active and derniere_notification_le is null
              and (email is null or length(email) <= 254)
              and (push_subscription is null or length(push_subscription::text) <= 4000)
              and rayon_km between 1 and 300);
create policy ide_alertes_lecture on public.crescite_alertes_tournee for select to anon, authenticated
  using ((select public.crescite_est_admin()) or token_desinscription = current_setting('request.headers', true)::json->>'x-token');
create policy ide_alertes_admin on public.crescite_alertes_tournee for all to authenticated
  using ((select public.crescite_est_admin())) with check ((select public.crescite_est_admin()));

-- 2. Devis flash : le public peut envoyer une demande, l'admin gère tout
-- le public dépose une demande, jamais son suivi (statut, notes internes) ; des longueurs raisonnables
create policy ide_devis_deposer on public.crescite_devis_demandes for insert to anon, authenticated
  with check (statut = 'nouveau' and notes_internes is null
              and length(structure_nom) <= 200 and length(commune) <= 120 and length(contact_nom) <= 200
              and length(contact_email) <= 254 and length(coalesce(contact_tel, '')) <= 40
              and length(coalesce(message, '')) <= 5000 and length(coalesce(periode_souhaitee, '')) <= 200);
create policy ide_devis_admin on public.crescite_devis_demandes for all to authenticated
  using ((select public.crescite_est_admin())) with check ((select public.crescite_est_admin()));

-- 7. Notes de frais : chacun les siennes, l'admin voit et valide tout. Une personne dépose et retouche sa note tant
-- qu'elle attend : jamais validée, ni remboursée, ni datée de validation par elle-même
create policy ide_frais_lecture on public.crescite_notes_frais for select to authenticated
  using (personne_id = (select public.crescite_moi()) or (select public.crescite_est_admin()));
create policy ide_frais_creer on public.crescite_notes_frais for insert to authenticated
  with check ((select public.crescite_est_admin())
              or (personne_id = (select public.crescite_moi()) and statut = 'en_attente'
                  and valide_le is null and valide_par is null and rembourse_le is null));
create policy ide_frais_modif_soi on public.crescite_notes_frais for update to authenticated
  using ((personne_id = (select public.crescite_moi()) and statut = 'en_attente') or (select public.crescite_est_admin()))
  with check ((select public.crescite_est_admin())
              or (personne_id = (select public.crescite_moi()) and statut = 'en_attente'
                  and valide_le is null and valide_par is null and rembourse_le is null));
create policy ide_frais_admin on public.crescite_notes_frais for delete to authenticated
  using ((select public.crescite_est_admin()));

-- 8. Matériel & Checklists : l'équipe de la date ou l'admin. La liste du matériel : les personnes de l'équipe (le
-- projet Supabase est partagé : un compte qui n'a pas de fiche dans l'équipe ne la lit pas)
create policy ide_mat_lecture on public.crescite_materiel for select to authenticated
  using ((select public.crescite_moi()) is not null or (select public.crescite_est_admin()));
create policy ide_mat_admin on public.crescite_materiel for all to authenticated
  using ((select public.crescite_est_admin())) with check ((select public.crescite_est_admin()));

create policy ide_chk_lecture on public.crescite_checklists_chargement for select to authenticated
  using ((select public.crescite_est_admin()) or public.crescite_membre_date(date_id));
create policy ide_chk_coche on public.crescite_checklists_chargement for update to authenticated
  using ((select public.crescite_est_admin()) or public.crescite_membre_date(date_id))
  with check ((select public.crescite_est_admin()) or public.crescite_membre_date(date_id));
create policy ide_chk_ajout on public.crescite_checklists_chargement for insert to authenticated
  with check ((select public.crescite_est_admin()) or public.crescite_membre_date(date_id));
create policy ide_chk_suppr on public.crescite_checklists_chargement for delete to authenticated
  using ((select public.crescite_est_admin()));

-- 10. CRM Prospects : réservé aux administrateurs
create policy ide_crm_prospects on public.crescite_diffusion_prospects for all to authenticated
  using ((select public.crescite_est_admin())) with check ((select public.crescite_est_admin()));

-- Les droits sur les tables (Supabase donne tout à anon et authenticated sur une table neuve ; les règles ci-dessus
-- filtrent, et les droits ferment ce que le public n'a pas à toucher) : le public dépose une alerte ou une demande de
-- devis, rien d'autre
revoke all on public.crescite_alertes_tournee, public.crescite_devis_demandes, public.crescite_notes_frais,
  public.crescite_materiel, public.crescite_checklists_chargement, public.crescite_diffusion_prospects from anon, public;
grant insert on public.crescite_alertes_tournee, public.crescite_devis_demandes to anon;
grant select on public.crescite_alertes_tournee to anon;   -- sa propre alerte, par son jeton (règle ide_alertes_lecture)
grant select, insert, update, delete on public.crescite_alertes_tournee, public.crescite_devis_demandes, public.crescite_notes_frais,
  public.crescite_materiel, public.crescite_checklists_chargement, public.crescite_diffusion_prospects to authenticated;
revoke all on sequence public.crescite_alertes_tournee_id_seq, public.crescite_devis_demandes_id_seq, public.crescite_notes_frais_id_seq,
  public.crescite_materiel_id_seq, public.crescite_checklists_chargement_id_seq, public.crescite_diffusion_prospects_id_seq from anon, public;
grant usage on sequence public.crescite_alertes_tournee_id_seq, public.crescite_devis_demandes_id_seq to anon;
grant usage, select on sequence public.crescite_alertes_tournee_id_seq, public.crescite_devis_demandes_id_seq, public.crescite_notes_frais_id_seq,
  public.crescite_materiel_id_seq, public.crescite_checklists_chargement_id_seq, public.crescite_diffusion_prospects_id_seq to authenticated;
grant all on public.crescite_alertes_tournee, public.crescite_devis_demandes, public.crescite_notes_frais,
  public.crescite_materiel, public.crescite_checklists_chargement, public.crescite_diffusion_prospects to service_role;

-- =====================================================================================================
-- BUCKET DE STOCKAGE POUR LES JUSTIFICATIFS DE FRAIS (crescite-frais)
-- =====================================================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('crescite-frais', 'crescite-frais', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  file_size_limit = 15728640,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

do $$
declare
  p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'storage' and tablename = 'objects' and policyname like 'crescite_frais\_%' loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

-- Les justificatifs sont rangés dans le dossier de la personne (son numéro de fiche : « 12/1761234567_jpg »).
-- Lecture : la personne, dans son dossier, ou un administrateur. (Une règle fondée sur l'adresse écrite dans la note
-- de frais laissait quiconque écrire une adresse qui finit comme le fichier d'un autre, et le lire.)
create policy crescite_frais_lecture on storage.objects for select to authenticated
  using (bucket_id = 'crescite-frais' and (
    (select public.crescite_est_admin()) or (storage.foldername(name))[1] = (select public.crescite_moi())::text
  ));

-- Dépose d'un justificatif : une personne de l'équipe, dans son propre dossier seulement (le projet Supabase est
-- partagé : un compte qui n'est pas de l'équipe n'y dépose rien)
create policy crescite_frais_envoi on storage.objects for insert to authenticated
  with check (bucket_id = 'crescite-frais' and (storage.foldername(name))[1] = (select public.crescite_moi())::text);

create policy crescite_frais_admin_suppr on storage.objects for delete to authenticated
  using (bucket_id = 'crescite-frais' and (select public.crescite_est_admin()));

-- ------------------------------------------------------------------------------------------------ temps réel
-- l'administration écoute ces tables (sur leur propre canal) : sans elles dans la publication, ce canal ne reçoit rien

do $$
declare t text;
begin
  foreach t in array array['crescite_diffusion_prospects', 'crescite_notes_frais', 'crescite_materiel', 'crescite_devis_demandes'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when others then raise notice 'temps réel, %: %', t, sqlerrm;
    end;
  end loop;
end $$;

commit;

notify pgrst, 'reload schema';

-- ce qui est en place
select 'Compagnie Idéale' as "élément",
  case when (select count(*) from information_schema.tables where table_schema = 'public' and table_name in
             ('crescite_alertes_tournee', 'crescite_devis_demandes', 'crescite_notes_frais', 'crescite_materiel',
              'crescite_checklists_chargement', 'crescite_diffusion_prospects')) = 6
    then 'prête : alertes de tournée, demandes de devis, notes de frais, matériel, listes de chargement, pistes de diffusion'
    else 'incomplète : relancez ce script' end as "état"
union all
select 'justificatifs', case when exists (select 1 from storage.buckets where id = 'crescite-frais' and not public)
  then 'stockage privé « crescite-frais » : chacun dépose et relit dans son dossier, l''administration lit tout'
  else 'stockage « crescite-frais » absent : relancez ce script' end
union all
select 'temps réel', (select count(*) from pg_publication_tables where pubname = 'supabase_realtime'
  and schemaname = 'public' and tablename in ('crescite_diffusion_prospects', 'crescite_notes_frais', 'crescite_materiel',
                                              'crescite_devis_demandes')) || ' tables sur 4 écoutées par l''administration';
