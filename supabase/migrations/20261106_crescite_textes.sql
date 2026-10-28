-- Crescite : les textes du site d'aujourd'hui (le dix-huitième script) : ses mentions légales, sa politique de
-- confidentialité, et le nom de la compagnie.
-- 1. Les mentions légales et la politique de confidentialité que la base garde depuis l'import (crescite_textes, clé
--    « legal ») sont celles de l'ancien site WordPress : l'hébergeur « WP serveur », Google Analytics et AdWords,
--    Gravatar, les commentaires, un service client, des achats. Le site n'a plus rien de tout cela. Ce script les
--    remplace par celles de data/textes-legaux.json (le même texte, mot pour mot) : Cloudflare Pages héberge les pages,
--    la base Supabase de la compagnie ses données, et la politique dit ce que le site recueille vraiment (l'alerte de
--    passage, la demande de proposition de cession, les espaces réservés, l'empreinte des adresses IP), ce qu'il garde
--    dans le navigateur et ses services tiers.
-- 2. Le nom (demande du client, octobre 2026 : « par défaut les Crescite, ou la Compagnie Crescite ») : les présentations
--    de Macbeth et de Mon Royaume et le dossier scolaire de Bérénice disent encore « le Théâtre des Crescite ». Chaque
--    phrase est récrite, accords compris (la liste NOMS de maquettes/build.py, qui fait de même pour le site construit),
--    dans crescite_spectacles (texte, affirmations, action_culturelle) et crescite_textes.
-- 3. Les textes courts du site, harmonisés (la liste RETOUCHES de maquettes/build.py) : « Écrire à la compagnie » partout
--    (le pied disait « nous écrire »), « Envoyer », l'apostrophe typographique, le tiret de la licence, « conventionnée
--    par la Ville de Rouen » (le « par » manquait), les cartes de l'espace pro nommées par leur public ; et le lien de la
--    page Facebook de la compagnie (celui de sa fiche à l'ODIA Normandie : l'ancien site n'en donnait que l'icône).
--
-- À exécuter dans le projet de la compagnie (fwjgyfzcbcmfyfkhhtuh), de la même façon (SQL Editor → New query → coller →
-- Run). Il peut être relancé sans dommage : il ne touche qu'à ces lignes, et une phrase déjà récrite ne change plus.
-- L'ancien texte reste au journal (crescite_journal) : l'administration peut y revenir. Ensuite, chaque mot se corrige
-- depuis le site (« Modifier le site ») ou la rubrique Textes de l'administration.

insert into public.crescite_textes (cle, valeur)
values ('legal', $legal${
  "mentions-legales": {
    "titre": "Mentions légales",
    "blocs": [
      "<h2>Éditeur du site</h2>",
      "<strong>Compagnie Crescite</strong> (Théâtre des Crescite)<br/>72 boulevard d’Orléans, 76100 Rouen<br/>Siret 749 941 761 00035 – APE 9001Z<br/>Licence L-R-24-002837 – Catégorie 2<br/>Courriel : <a href=\"mailto:contact@crescite.fr\">contact@crescite.fr</a><br/>Responsable de la publication : Barbara Daussy",
      "<h2>Hébergement</h2>",
      "<strong>Les pages du site</strong><br/>Cloudflare, Inc. (Cloudflare Pages)<br/>101 Townsend Street, San Francisco, CA 94107, États-Unis<br/>Tél. +1 650 319 8930 – <a href=\"https://www.cloudflare.com/\">cloudflare.com</a>",
      "<strong>La base de données et les fichiers</strong> (dates, textes, photos, espaces réservés)<br/>Supabase, Inc. – <a href=\"https://supabase.com/\">supabase.com</a>",
      "<h2>Crédits</h2>",
      "Crédits photos : Arnaud Bertereau – Agence Mona, Thomas Cartron, Gaspard Quet, Lauren Toulin, Alban Van Wassenhove, Olivier Héron, DR ; le crédit de chaque photo de spectacle est donné sur sa page.",
      "<h2>Objet du site</h2>",
      "Le site présente les spectacles et les activités de la compagnie Crescite : ses saisons et ses dates de tournée, ses actions culturelles, ses documents pour les programmateurs et les établissements scolaires. Les informations y sont données à titre indicatif et peuvent évoluer ; pour une date, la billetterie du lieu fait foi. Les Crescite s’efforcent de les tenir exactes et à jour, sans pouvoir garantir qu’elles soient complètes.",
      "<h2>Propriété intellectuelle</h2>",
      "Les textes, photos, vidéos, logos et graphismes du site appartiennent à la compagnie Crescite ou à leurs auteurs, qui l’autorisent à les montrer. Toute reproduction, représentation ou adaptation, en tout ou en partie, demande l’accord écrit préalable de la compagnie (et, pour une photo, celui de son photographe).",
      "<h2>Liens vers d’autres sites</h2>",
      "Le site renvoie vers d’autres sites, notamment les billetteries des lieux qui accueillent les spectacles. La compagnie Crescite n’a pas la maîtrise de leur contenu et n’en répond pas.",
      "<h2>Données personnelles</h2>",
      "La manière dont le site traite les données personnelles, et les droits de chacun, sont décrits dans la <a href=\"#/politique-de-confidentialite\">politique de confidentialité</a>.",
      "<h2>Droit applicable</h2>",
      "Le site et ces mentions sont soumis au droit français."
    ]
  },
  "politique-de-confidentialite": {
    "titre": "Politique de confidentialité",
    "blocs": [
      "Le site de la compagnie Crescite se visite sans compte, sans publicité et sans mesure d’audience : il ne dépose aucun cookie publicitaire ni de statistiques. Il ne recueille des données personnelles que lorsque vous les lui confiez vous-même, pour un service précis, décrit ci-dessous.",
      "<h2>Responsable du traitement</h2>",
      "Compagnie Crescite (Théâtre des Crescite), 72 boulevard d’Orléans, 76100 Rouen – <a href=\"mailto:contact@crescite.fr\">contact@crescite.fr</a>.",
      "<h2>Ce que le site recueille, et pourquoi</h2>",
      "<h3>L’alerte de passage</h3>",
      "Pour être prévenu quand un spectacle se joue près de chez vous, vous donnez une adresse électronique, une commune ou un code postal (ou votre position, si vous choisissez « Me géolocaliser » : elle n’est gardée qu’au kilomètre près, pour mesurer la distance aux représentations), un rayon et, si vous le souhaitez, un spectacle. L’alerte ne s’active qu’une fois confirmée depuis le courriel qui vous est envoyé ; non confirmée, elle est effacée au bout de 30 jours. Chaque courriel contient un lien pour vous désinscrire, qui efface l’alerte. Base légale : votre consentement.",
      "<h3>La demande de proposition de cession</h3>",
      "Un programmateur qui demande une proposition donne le nom de sa structure et sa commune, le nom d’un contact, un courriel, éventuellement un téléphone, la période envisagée et ses précisions, avec la description du lieu. La compagnie s’en sert pour lui répondre et suivre la demande. Base légale : les mesures préalables à un contrat demandées par la personne.",
      "<h3>Les espaces réservés</h3>",
      "L’espace des salles (sur invitation), l’espace de l’équipe et l’administration demandent une connexion par adresse électronique. On y trouve les données utiles au travail de la compagnie : pour l’équipe, les coordonnées, les dates, les disponibilités, les feuilles de route et les documents de la tournée ; pour une salle invitée, ses accès et ce qu’elle consulte. Base légale : l’intérêt légitime de la compagnie à organiser ses tournées, et les contrats qui la lient à son équipe et à ses partenaires. Les notifications de l’espace de l’équipe ne sont envoyées qu’aux appareils qui les ont acceptées.",
      "<h3>La protection du site</h3>",
      "Pour limiter les envois abusifs des formulaires, la base garde deux jours une empreinte salée de l’adresse IP (et non l’adresse elle-même).",
      "<h2>Ce qui reste dans votre navigateur</h2>",
      "Le site garde dans votre navigateur, sans les transmettre, la dernière entrée choisie (« Je viens voir », « Je souhaite programmer », « Je représente un établissement scolaire ») et, pour un compte connecté, sa session. Ce ne sont pas des cookies de suivi ; les effacer depuis votre navigateur ne fait que vous déconnecter.",
      "<h2>Les services tiers</h2>",
      "<ul><li><strong>Cloudflare</strong> sert les pages du site et voit, comme tout hébergeur, l’adresse IP des visiteurs.</li><li><strong>Supabase</strong> héberge la base de la compagnie et ses fichiers.</li><li><strong>YouTube</strong> (en mode sans cookie) et <strong>Vimeo</strong> (sans suivi) : rien ne se charge avant que vous ne lanciez une vidéo.</li><li><strong>L’API Géo de l’État</strong> (geo.api.gouv.fr) retrouve la commune d’un code postal ou d’une position, pour l’alerte de passage.</li><li>Un service d’envoi de courriels (Brevo ou Resend) achemine les courriels du site : confirmations, alertes, invitations.</li></ul>",
      "Certains de ces prestataires sont établis hors de l’Union européenne ; leurs transferts de données sont encadrés par les clauses contractuelles types de la Commission européenne ou par le cadre de protection des données UE–États-Unis. Aucune donnée n’est vendue ni cédée.",
      "<h2>Vos droits</h2>",
      "Vous pouvez accéder à vos données, les faire rectifier ou effacer, vous opposer à leur traitement, en demander la limitation ou la portabilité, et retirer votre consentement à tout moment, en écrivant à <a href=\"mailto:contact@crescite.fr\">contact@crescite.fr</a> ou à l’adresse postale de la compagnie. Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL (<a href=\"https://www.cnil.fr/\">cnil.fr</a>)."
    ]
  }
}$legal$::jsonb)
on conflict (cle) do update set valeur = excluded.valeur, modifie_le = now()
  where public.crescite_textes.valeur is distinct from excluded.valeur;

do $$
declare
  r record;
begin
  for r in select * from (values
    ($n$Le Théâtre des Crescite revendique$n$, $n$Les Crescite revendiquent$n$),
    ($n$le Théâtre des Crescite imagine$n$, $n$les Crescite imaginent$n$),
    ($n$le Théâtre des Crescite cherche$n$, $n$les Crescite cherchent$n$),
    ($n$du Théâtre des Crescite est d'offrir$n$, $n$de la compagnie Crescite est d'offrir$n$),
    ($n$Le Théâtre des Crescite est conventionné par$n$, $n$La compagnie Crescite est conventionnée par$n$)
  ) as n (avant, apres) loop
    update public.crescite_spectacles set
      texte = replace(texte::text, r.avant, r.apres)::jsonb,
      affirmations = replace(affirmations::text, r.avant, r.apres)::jsonb,
      action_culturelle = replace(action_culturelle::text, r.avant, r.apres)::jsonb
    where (texte::text || affirmations::text || action_culturelle::text) like '%' || r.avant || '%';
    update public.crescite_textes set valeur = replace(valeur::text, r.avant, r.apres)::jsonb
    where valeur::text like '%' || r.avant || '%';
  end loop;
end $$;

update public.crescite_textes set valeur = jsonb_set(valeur, '{texte}', to_jsonb($t$Écrire à la compagnie$t$::text)) where cle = 'ecrire' and valeur #> '{texte}' is distinct from to_jsonb($t$Écrire à la compagnie$t$::text);
update public.crescite_textes set valeur = jsonb_set(valeur, '{bouton}', to_jsonb($t$Envoyer$t$::text)) where cle = 'contact' and valeur #> '{bouton}' is distinct from to_jsonb($t$Envoyer$t$::text);
update public.crescite_textes set valeur = jsonb_set(valeur, '{consentement}', to_jsonb($t$J’accepte la politique de confidentialité$t$::text)) where cle = 'contact' and valeur #> '{consentement}' is distinct from to_jsonb($t$J’accepte la politique de confidentialité$t$::text);
update public.crescite_textes set valeur = jsonb_set(valeur, '{adresse,0}', to_jsonb($t$72 boulevard d’Orléans$t$::text)) where cle = 'coordonnees' and valeur #> '{adresse,0}' is distinct from to_jsonb($t$72 boulevard d’Orléans$t$::text);
update public.crescite_textes set valeur = jsonb_set(valeur, '{legal,2}', to_jsonb($t$Licence L-R-24-002837 – Catégorie 2$t$::text)) where cle = 'coordonnees' and valeur #> '{legal,2}' is distinct from to_jsonb($t$Licence L-R-24-002837 – Catégorie 2$t$::text);
update public.crescite_textes set valeur = to_jsonb($t$La compagnie Crescite est conventionnée par la Ville de Rouen, et est régulièrement soutenue par la DRAC et la Région Normandie,<br/>le Département de Seine-Maritime et l’ODIA Normandie / Office de Diffusion et d’Information Artistique$t$::text) where cle = 'partenaires' and valeur is distinct from to_jsonb($t$La compagnie Crescite est conventionnée par la Ville de Rouen, et est régulièrement soutenue par la DRAC et la Région Normandie,<br/>le Département de Seine-Maritime et l’ODIA Normandie / Office de Diffusion et d’Information Artistique$t$::text);
update public.crescite_textes set valeur = jsonb_set(valeur, '{portes,0,titre}', to_jsonb($t$Programmateurs et directeurs de salle$t$::text)) where cle = 'espacePro' and valeur #> '{portes,0,titre}' is distinct from to_jsonb($t$Programmateurs et directeurs de salle$t$::text);
update public.crescite_textes set valeur = jsonb_set(valeur, '{href}', to_jsonb($t$https://www.facebook.com/TheatreDesCrescite$t$::text)) where cle = 'facebook' and valeur #> '{href}' is distinct from to_jsonb($t$https://www.facebook.com/TheatreDesCrescite$t$::text);

select 'mentions légales' as "élément",
  case when (select valeur -> 'mentions-legales' -> 'blocs' ->> 3 from public.crescite_textes where cle = 'legal') like '%Cloudflare%'
    then 'à jour : Cloudflare Pages et Supabase, plus de WordPress' else 'à refaire : relancez ce script' end as "état"
union all
select 'politique de confidentialité',
  case when (select valeur::text from public.crescite_textes where cle = 'legal') not like '%Google Analytics%'
    then 'à jour : ce que le site recueille vraiment' else 'à refaire : relancez ce script' end
union all
select 'le nom de la compagnie',
  case when exists (select 1 from public.crescite_spectacles
                    where (texte::text || affirmations::text || action_culturelle::text) like '%Théâtre des Crescite%')
         or exists (select 1 from public.crescite_textes where cle <> 'legal' and valeur::text like '%Théâtre des Crescite%')
    then 'reste « Théâtre des Crescite » ailleurs que dans les mentions légales : à récrire depuis l''administration'
    else 'à jour : les Crescite, ou la compagnie Crescite' end
union all
select 'les textes courts et Facebook',
  case when (select valeur ->> 'texte' from public.crescite_textes where cle = 'ecrire') = 'Écrire à la compagnie'
        and (select valeur ->> 'href' from public.crescite_textes where cle = 'facebook') like 'https://www.facebook.com/%'
    then 'à jour : « Écrire à la compagnie », la page Facebook' else 'à refaire : relancez ce script' end;
