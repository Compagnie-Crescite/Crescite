-- Crescite : la diffusion reliée (le vingt-deuxième script). À exécuter après les précédents, de la même façon (SQL
-- Editor → New query → coller → Run). Il peut être relancé sans dommage et ne touche qu'à ce qui commence par crescite_.
--
-- Ce que le script ajoute :
--   crescite_diffusion_prospects.lieu_id    la piste connaît son lieu (sa fiche : son historique, ses dates, ses chiffres)
--   crescite_acces_pro.prospect_id          l'invitation à l'espace pro connaît sa piste : ses visites et les documents
--                                           ouverts remontent dans la piste, la relance donne le lien personnel
--   crescite_devis_demandes.prospect_id     une demande de devis du site devenue piste ;
--                       .lieu_id            et son lieu
--   les étapes d'une piste                  une seule liste, tenue par la base : contact_pris, dossier_envoye,
--                                           option_discutee, contrat_signe, bilan, refus (une piste perdue)
--                                           et converti_en_date (l'ancienne valeur, gardée) ; les statuts d'une
--                                           demande de devis aussi.
-- Les quatre colonnes de diffusion du suivi des dates (etape_crm, date_dernier_contact, date_prochaine_relance,
-- notes_diffusion), que rien ne lit ni n'écrit, restent en place : la piste porte ce suivi ; on pourra les retirer à la main.

begin;

do $$ begin
  if to_regclass('public.crescite_diffusion_prospects') is null then
    raise exception 'Lancez d''abord le script « Compagnie Idéale » (20261026_crescite_ideale.sql).';
  end if;
end $$;

alter table public.crescite_diffusion_prospects add column if not exists lieu_id bigint references public.crescite_lieux (id) on delete set null;
create index if not exists crescite_diff_prospects_lieu on public.crescite_diffusion_prospects (lieu_id);
alter table public.crescite_acces_pro add column if not exists prospect_id bigint references public.crescite_diffusion_prospects (id) on delete set null;
alter table public.crescite_devis_demandes add column if not exists prospect_id bigint references public.crescite_diffusion_prospects (id) on delete set null;
alter table public.crescite_devis_demandes add column if not exists lieu_id bigint references public.crescite_lieux (id) on delete set null;

-- les étapes et les statuts : une liste tenue par la base (une valeur hors liste déjà là ne bloque pas le script : la
-- contrainte la refusera seulement à la prochaine écriture)
alter table public.crescite_diffusion_prospects drop constraint if exists crescite_diff_prospects_etape;
alter table public.crescite_diffusion_prospects add constraint crescite_diff_prospects_etape check (etape in
  ('contact_pris', 'dossier_envoye', 'option_discutee', 'contrat_signe', 'bilan', 'refus', 'converti_en_date')) not valid;
alter table public.crescite_devis_demandes drop constraint if exists crescite_devis_statut_liste;
alter table public.crescite_devis_demandes add constraint crescite_devis_statut_liste check (statut in
  ('nouveau', 'en_cours', 'devis_envoye', 'confirme', 'sans_suite')) not valid;
do $$ begin
  begin alter table public.crescite_diffusion_prospects validate constraint crescite_diff_prospects_etape;
  exception when check_violation then raise notice 'pistes : une étape hors liste reste, à corriger dans l''administration'; end;
  begin alter table public.crescite_devis_demandes validate constraint crescite_devis_statut_liste;
  exception when check_violation then raise notice 'demandes de devis : un statut hors liste reste'; end;
end $$;

-- le public ne pose jamais ces liens (le treizième script ne lui laisse que les champs de son formulaire) : les colonnes
-- neuves ne lui sont pas ouvertes
revoke insert (prospect_id, lieu_id) on public.crescite_devis_demandes from anon;

commit;

notify pgrst, 'reload schema';

select 'diffusion reliée', case when exists (select 1 from information_schema.columns where table_name = 'crescite_diffusion_prospects' and column_name = 'lieu_id')
  and exists (select 1 from information_schema.columns where table_name = 'crescite_acces_pro' and column_name = 'prospect_id') then 'oui' else 'incomplète : relancez ce script' end;
