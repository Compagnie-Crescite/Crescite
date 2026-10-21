# Crescite : système d'information de la compagnie

Dépôt de travail pour la reprise en main du site [crescite.fr](https://crescite.fr) et la refonte « Crescite 2.0 ».
L'audit complet, les 10 évolutions proposées et la feuille de route sont dans le document privé
« Audit crescite.fr et Crescite 2.0 » (Claude Docs). Ce dépôt contient les pièces techniques publiables.

> Ce dépôt est **public**. Le logo 2.0 et les photos des spectacles (droits des photographes) n'y sont
> volontairement pas versionnés : ils vont dans `private/`, dossier exclu par `.gitignore`. L'audit (avec ses
> constats de sécurité) reste dans le document privé.

## Contenu

| Dossier | Contenu |
| --- | --- |
| `prototype/` | Démonstrateur interactif, en onglets : la pieuvre (les huit bras du logo mènent aux spectacles), un univers par spectacle, trois portes d’entrée, agenda, carte de tournée, compagnie, espace troupe. Sources dans `prototype/src/`, assemblage par `prototype/build.py`. |
| `maquettes/` | Dix maquettes de la partie publique, de la plus sobre à la plus évoluée, la synthèse et la planche qui les compare. Chacune lit la base en direct et se modifie sur place. Sources dans `maquettes/src/`, assemblage par `maquettes/build.py`. |
| `data/` | Relevé des dates publiées sur crescite.fr de 2016 à 2027 : 464 lignes géolocalisées, en JSON et en CSV. Texte exact des pages publiques du site (`site-crescite.json`, relevé par `site_crescite.py`), fiche de Cassandres (`cassandres.json`), dossier scolaire de Bérénice (`berenice-dossier.json`), univers et action culturelle de chaque spectacle (`univers-spectacles.json`). |
| `supabase/` | La base de la compagnie : le script qui la crée (`migrations/20261020_crescite_base.sql`) et celui qui la remplit (`importer.py`). |
| `admin/` | L'administration du site : spectacles, dates et représentations, ateliers, lieux, textes, journal. En ligne à côté des maquettes (`docs/admin/`). |
| `private/` (non versionné) | `brand/` logo 2.0 en SVG et le tracé de ses huit bras, `photos/` une photo par spectacle et celles de leurs univers, `dossiers/` les dossiers de la compagnie (scolaire de Bérénice, artistique 2027-2028). |

## Prototype

```sh
python3 prototype/build.py            # écrit prototype/dist/index.html (non versionné)
python3 prototype/build.py --public   # écrit prototype/dist/index-public.html, version du dépôt public
```

Ouvrir ensuite le fichier dans un navigateur récent. Avec le dossier `private/` en place, le prototype est complet
(logo 2.0, tracé des bras, photos) ; sans lui, il est construit avec des substituts neutres.
Toutes les dates, y compris celles de l’exemple d’espace troupe, viennent du relevé public du site.

Ce que montre le prototype :

- **La pieuvre.** Le logo 2.0 est dessiné tel quel ; chacun de ses huit bras se prolonge vers un spectacle,
  part de l’extrémité exacte du bras, passe sous les autres traits, souligne le titre et s’enroule. Au repos rien
  ne bouge ; on tire un titre (ou on le choisit au clavier) et la pieuvre ramène le bras vers elle.
- **Un univers par spectacle.** Couleurs, typographie, motif et un effet signature au défilement : les jumeaux
  (*Cléophène*), la tirade du nez (*Ci-gisait Cyrano*), le cercle (*Bérénice*), le paperboard (*Mon Royaume
  pour un cheval*), les annotations (*L’imaginaire forcé*), l’horloge (*La Folle Idée*), le fil rouge
  (*Macbeth – Fatum*), les heures (*Actions culturelles*). Chaque page a son adresse : `#/spectacles/berenice`.
- **Trois portes.** « Je viens voir », « Je programme », « Je fais venir dans mon établissement » : une page
  chacune, et la porte choisie colore la lecture de tout le site (cartes, agenda, page d’un spectacle).
- **Des onglets.** Accueil, Spectacles, Agenda (liste, calendrier, carte), Tournée, La compagnie, Espace troupe ;
  sur téléphone, une barre d’onglets en bas d’écran.

Ce qui est réel : textes, distributions et photos des spectacles (repris de crescite.fr), dates publiées, logo 2.0.
Ce qui est proposé : les univers, les textes marqués « proposition ». Ce qui est à compléter est marqué
« à fournir » ou « exemple » dans l’interface (fiches techniques, dossiers, tarifs, contacts, adresses exactes).

Accessibilité : chaque titre de la pieuvre est un bouton (Tab, flèches, Entrée), « Mode calme » coupe les
animations et l’épinglage des pages, la carte a une version tableau, le réglage système « réduire les
animations » est respecté.

## Maquettes

```sh
python3 maquettes/build.py              # les dix maquettes et la planche (maquettes/dist/, non versionné)
python3 maquettes/build.py m06          # une seule maquette
python3 maquettes/build.py --captures   # avec des captures de relecture (Playwright et Chromium, maquettes/dist/shots/)
node maquettes/onglets.mjs /tmp/x m01 m06 # parcourt les vues de chaque maquette et signale les anomalies
python3 data/site_crescite.py               # relève de nouveau le texte de crescite.fr (data/site-crescite.json)
```

Dix façons de montrer le même contenu : **le texte de crescite.fr**, page par page (spectacles, onze saisons de
dates, présentation de la compagnie, actions culturelles, contact, mentions légales), plus Cassandres, création 2027,
**le dossier scolaire de Bérénice** et, pour chaque spectacle, **son univers et son action culturelle**
(`data/univers-spectacles.json`, repris des pages d'adrienvada.fr et du dossier artistique 2027-2028). Rien n'y est
inventé ; s'ajoutent seulement la **carte des tournées**, dessinée dans l'univers de chaque maquette avec l'outil
commun `maquettes/src/carte.js`, et quelques intitulés de rubrique (`D.site.libelles`). Chacune **s'ouvre sur le
logo en grand** (`maquettes/src/intro.js`) : au clic, à la molette ou en glissant vers le bas, ses tentacules
ondulent, il grossit et le site apparaît à travers lui.

Chacune se lit ensuite par **trois entrées**, la navigation première : « Je viens voir un spectacle » (`#/voir` : les
dates tout public de la saison et leur carte), « Je souhaite programmer » (`#/programmer` : le contact diffusion, le
catalogue, le dossier et la fiche technique de chaque spectacle, voir plus bas), « Je représente un établissement
scolaire » (`#/etablissement` : le type d'action culturelle de chaque spectacle, les actions culturelles du site, le
dossier scolaire de Bérénice). Spectacles, La compagnie et Contact viennent en second. La page de chaque spectacle prend son
univers (couleurs, police de titre, motif, photos, citations ; Bérénice à la charte de son dossier) et se lit dans
l'une des trois entrées : `#/spectacle/berenice/voir`, `…/programmer`, `…/etablissement` ; la dernière entrée choisie
sert de défaut. L'espace pro à mot de passe a disparu : ses anciennes adresses mènent à « Je souhaite programmer »,
celles de l'agenda et des actions culturelles aux deux autres entrées. La pieuvre ne compte pas les spectacles.

**Pour les programmateurs.** « Je souhaite programmer » donne d'abord à qui parler : le contact diffusion
(l'administratrice, le courriel de la compagnie, son téléphone s'il est saisi dans la base, « Conditions financières sur
demande »). Puis, pour chaque spectacle, un dossier PDF composé à la demande à partir des données du site, donc toujours
à jour (`maquettes/src/dossier.js` : couverture et photos, présentation, distribution, conditions d'accueil et fiche
technique, représentations et lieux de diffusion, production, contact ; pdfmake chargé au premier clic). Sur la page
d'un spectacle : la fiche technique (celle du dossier de Bérénice ; un fichier déposé par l'administration ; sinon
« Fiche technique sur demande », qui écrit à l'administratrice) et « À télécharger » (le dossier, les documents déposés
pour les pros). Les documents déposés pour les scolaires s'ajoutent à l'onglet établissement. L'action culturelle de
Cassandres n'est pas encore construite : elle reste dans les données et dans la base, masquée (`masquee`), et le site
ne la montre pas (ni sur la page des établissements, ni en onglet).

**L'agenda complet.** « Je viens voir un spectacle » donne d'abord les prochaines dates tout public, puis toutes les
dates publiées depuis 2016, saison par saison, de la plus récente à la plus ancienne. Les saisons terminées sont
fermées au départ, chacune avec sa petite carte ; un index des saisons permet de sauter de l'une à l'autre, et le
filtre par spectacle comme la recherche par commune portent sur tout l'agenda, en ouvrant les saisons où ils trouvent
quelque chose. `#/agenda/2019-2020` reste la page d'une saison.

**Modifier sur place.** « Modifier le site », au pied de chaque page, ouvre l'édition (`maquettes/src/edition.js`,
commun aux onze) : après connexion avec un compte administrateur, chaque texte venu de la base se clique et s'écrit
dans la page même (gras, italique, lien, paragraphe ajouté ou retiré) ; une photo de spectacle se remplace d'un clic ;
une date de l'agenda, à venir ou passée, s'ouvre dans un panneau (lieu, représentations et leurs heures, statut,
visibilité, précisions, lien) et « Ajouter une date » se place en tête de chaque agenda. « Enregistrer » écrit dans
la base : les pages ouvertes ailleurs se mettent à jour. Chaque maquette habille la barre et les panneaux à son style
(variables `--ed-*`). `?edition` à la fin de l'adresse ouvre directement l'édition.

**La pieuvre guide.** Chaque clic lui répond (`maquettes/src/tentacules.js`, commun aux onze et à l'administration) :
ses bras se contractent et une tentacule fine part du logo de l'en-tête jusqu'au point cliqué, où elle laisse
l'empreinte d'une ventouse. Chaque changement de page « remonte » une tentacule à la couleur de la destination (celle de
l'entrée, ou de l'univers du spectacle) ; ouvrir une saison ou un panneau la déroule, fermer l'enroule, enregistrer
l'enroule autour du bouton. Rien n'est retardé : la page répond tout de suite, l'animation joue par-dessus. Chaque
maquette l'habille à son style (`TENTACULES.regler`, variables `--tt-*`) : trait gravé pour la 01, filet de lumière pour
la 07, ventouses pour la synthèse, fil pour la 08… Avec « réduire les animations », un fondu bref ; `?anim=0` dans
l'adresse coupe tout.

De la 01 (« Le programme de salle », typographie seule) à la 10 (« La pieuvre vivante, rangée », le prototype remis
en ordre) ; la 06 (« Les bras de la tournée ») fait de la tentacule un thème. `maquettes/src/synthese.html` assemble
la proposition retenue : l’accueil et les cartes de la 06, l’agenda de la 03 relié à la carte, les portes de la 04
devenues les trois entrées, et les univers de spectacle les plus aboutis.
`onglets.mjs` compare chaque texte affiché aux sources et signale tout texte qui n'en vient pas ; il vérifie aussi
les trois entrées (à portée dans le premier écran, une seule marquée comme courante), les redirections des anciennes
adresses, la disparition de l'espace pro, la présence des contenus attendus de chaque vue et l'ordre de l'agenda
(les prochaines dates d'abord, les saisons terminées fermées). Il vérifie la page des programmateurs (le contact, le
téléchargement réel du dossier PDF, la fiche technique sur demande) et qu'un spectacle sans action culturelle n'a pas
d'onglet établissement. Avec `EDITION=1`, il vérifie aussi le lien « Modifier le site » et les annotations de l'édition
(`data-edit`, `data-date-id`, `data-agenda`).
`maquettes/dist/maquettes.html` est la planche : une barre d’onglets en haut, qui charge chaque maquette juste en
dessous. « À propos » est le mode d'emploi de la maquette affichée, en six parties courtes avec leurs schémas :
naviguer, trouver une date, modifier le site, l'administration et ses rubriques, les espaces réservés autour de la
base, la planche elle-même ; les nouveautés (réserver, vidéos, jour et nuit, troupe) n'y paraissent que pour les
maquettes qui les ont en ligne (`AVEC`, dans `planche.html`).

**En ligne.** `python3 maquettes/build.py --pages` écrit le site GitHub Pages dans `docs/` : la planche en page
d'accueil et chaque maquette en page à part (`docs/m06.html`, `docs/synthese.html`…). Ces pages embarquent le logo
2.0 et les photos (rangées une seule fois dans `docs/photos/`) : leur publication a été décidée par la compagnie. Elles ne sont pas faites pour être trouvées :
chacune demande aux moteurs de recherche de ne pas l'indexer (`noindex, nofollow, noarchive, nosnippet,
noimageindex`), et leur adresse n'est donnée nulle part dans le dépôt (elle figure dans Settings → Pages). Chaque fichier de `maquettes/src/` lit ses contenus dans l’objet `D` que le script injecte.
Les règles que suit chaque maquette (le texte, les trois entrées, l'édition sur place, le mouvement, les budgets de
réactivité, la réservation, les vidéos, le jour et la nuit, la troupe) sont dans `maquettes/CONTRAT.md`.

## Données

`data/representations-site-2016-2027.csv` : une ligne par date publiée, avec saison, spectacle, dates, commune,
code INSEE, département, coordonnées, lieu, public (scolaire ou tout public), annulation, nombre de représentations
quand il est indiqué, texte d'origine et page source. Le classement scolaire / tout public est déduit des intitulés
(collège, lycée, « scolaire ») : à vérifier pour les saisons 2016 à 2020.

Ce relevé ne contient que les dates **publiées** sur le site : une ligne peut couvrir plusieurs représentations,
et beaucoup de représentations n'y figurent pas. Le dossier artistique 2027-2028 de la compagnie compte plus de
1 500 représentations depuis 2011 (au moins 86 par an depuis 2014), quand le site en liste 460 lignes depuis 2016,
soit environ un tiers. Les maquettes ne calculent aucun total à partir du relevé, qui ne sert qu'à placer les dates
sur les cartes : le nombre de représentations de chaque spectacle, dans « Je souhaite programmer », est celui que
donne le dossier artistique.

`data/site-crescite.json` : le texte des pages publiques de crescite.fr tel qu'il est publié, fautes comprises
(inline `em`, `strong`, listes et liens gardés). `data/cassandres.json` : le texte de Cassandres, relevé sur la page
du projet en attendant sa page sur le site de la compagnie.

`data/berenice-dossier.json` : le dossier scolaire 2026 de Bérénice, section par section (pourquoi l'étudier, le
tableau des programmes, synopsis, adaptation, espace, alexandrin, consignes de préparation, les quatre ateliers,
conditions d'accueil et fiche technique, présentation de la compagnie, portrait du directeur artistique). Le prix de
cession, l'adresse électronique et le téléphone n'y sont pas : le dossier lui-même reste dans `private/dossiers/`.

`data/univers-spectacles.json` : pour chaque spectacle, son univers (couleurs, polices, motif), sa phrase d'accroche,
ses citations, ses photos légendées, son action culturelle (type, public, lieu, textes, dispositifs) et ce qui sert à
le programmer (nombre de représentations, lieux de diffusion). Chaque texte porte sa source : le site, le dossier
scolaire, adrienvada.fr ou le dossier artistique 2027-2028 (seulement ses passages sur les spectacles et les actions
culturelles : ni budget, ni salaire, ni contact). Rien n'y parle de l'action culturelle de Macbeth – Fatum : à compléter.

## Base de données

La base de la compagnie vit dans le projet Supabase du site adrienvada.fr (décision d'Adrien, octobre 2026). Tout ce qui
lui appartient porte le préfixe `crescite_` : rien ne touche aux tables du site personnel, et le jour où la compagnie
aura son propre projet, tout ce qui commence par `crescite_` s'y déplace tel quel.

| Table | Ce qu'elle contient |
| --- | --- |
| `crescite_spectacles` | Le contenu de chaque spectacle : titres, textes, fiche, distribution, univers (couleurs, polices, motif), photos, citations, action culturelle, de quoi le programmer. Les spectacles des saisons passées y sont aussi, sans page. |
| `crescite_lieux` | Salles, festivals et établissements, avec leur position (pour la carte). |
| `crescite_dates` | Une ligne de l'agenda : un spectacle, un lieu, une période, son statut (option, confirmée, annulée, reportée), sa visibilité, ses précisions et son lien. |
| `crescite_representations` | Les représentations d'une date : jour, heure, public (tout public ou scolaire), annulation, billetterie. Plusieurs le même jour. |
| `crescite_ateliers`, `crescite_seances` | Les ateliers proposés (le catalogue publié) et les séances menées dans les établissements (jamais publiées). |
| `crescite_textes` | Les autres textes du site : présentation de la compagnie, actions culturelles, bandeau d'accueil, dossier scolaire de Bérénice, contact diffusion (`programmation`)… |
| `crescite_dates_suivi`, `crescite_lieux_suivi` | Le suivi interne (organisateur, contacts, contrat, notes) : jamais lu par le site. |
| `crescite_journal` | Chaque modification, avec son auteur, l'avant et l'après : l'administration peut revenir en arrière. |
| `crescite_admins` | Les comptes qui peuvent modifier. Les autres ne lisent que ce qui est publié. |

**Mise en place**, une fois : coller `supabase/migrations/20261020_crescite_base.sql` dans l'éditeur SQL du projet
(SQL Editor → New query → Run). Le script crée tables, règles d'accès, temps réel et dossier de photos ; il peut être
relancé sans dommage. Puis `python3 supabase/importer.py --photos` remplit la base à partir du dépôt (les huit
spectacles et ceux des saisons passées, 303 lieux, les 524 lignes d'agenda publiées depuis 2016 avec 792
représentations, les ateliers et les textes), et `python3 supabase/importer.py --admin <adresse>` donne les droits
d'administration à un compte du projet. L'import refuse une base déjà remplie.

**Le site lit la base en direct.** Chaque maquette s'affiche d'abord avec l'instantané du dépôt, puis
`maquettes/src/donnees.js` lit la base, recompose ses données et s'abonne au temps réel : chaque enregistrement fait
dans l'administration change les pages ouvertes dans la seconde, sans recharger. Le temps réel passe par le client
officiel de Supabase (`admin/vendor/supabase.js`, supabase-js 2.118.0, licence MIT), chargé à la demande ; s'il
manque, la page demande à la base toutes les minutes, et à chaque retour sur l'onglet, si quelque chose a changé. Une ligne d'agenda écrite à la main
(celles reprises de l'ancien site gardent leur texte d'origine) s'affiche telle quelle ; sinon elle se compose à
partir des jours, des heures et du lieu (`maquettes/src/agenda.js`, commun au site et à l'administration).
Ajouter `?base=0` à l'adresse d'une maquette la garde sur l'instantané.

**L'administration** (`admin/index.html`, en ligne dans `docs/admin/`) : connexion par adresse et mot de passe d'un
compte du projet inscrit dans `crescite_admins`.

- **Représentations**, présentée comme l'agenda du site : les prochaines dates en haut, puis les saisons passées,
  fermées sauf la saison en cours (« Aller à une saison… »), avec les filtres par spectacle, public et statut. On y
  ajoute une date, on y modifie une date passée. Une date porte autant de représentations qu'il en faut, le même
  jour ou non, chacune avec son heure, son public et sa billetterie. L'aperçu montre la ligne telle que le site
  l'affichera.
- **Spectacles** : toute la fiche, l'univers (avec le contrôle des contrastes) et les photos (allégées avant l'envoi).
- **Ateliers** : le catalogue publié et les séances dans les établissements, avec le total des heures par saison.
- **Lieux** : avec la recherche de commune (geo.api.gouv.fr) et la fusion des doublons.
- **Textes du site** et **Journal**, d'où l'on peut revenir sur une modification.
- **Modifier sur le site ↗** ouvre la synthèse en mode édition : les mêmes droits, dans la page publique.

Les règles d'accès sont dans la base : le public lit ce qui est publié (ni les options, ni les dates masquées, ni le
suivi, ni les séances), seuls les administrateurs écrivent. Le script a été vérifié sur un PostgreSQL local avec les
rôles de Supabase (droits de lecture et d'écriture, déclencheurs, enregistrement d'une date, journal). Les onze maquettes ont
ensuite été essayées de bout en bout sur la base réelle : chacune la lit en moins d'une seconde, affiche sans recharger
une précision ajoutée dans la base, ouvre l'édition après connexion d'un compte administrateur, enregistre dans la base
un paragraphe écrit dans la page, et ouvre une date passée dans le panneau de modification.

## L'équipe

Une fiche par personne de la distribution et de la technique, la tournée de chacun et les feuilles de route. Le second
script, `supabase/migrations/20261021_crescite_equipe.sql`, s'exécute après le premier, de la même façon ; il peut
être relancé sans dommage.

| Table | Ce qu'elle contient |
| --- | --- |
| `crescite_personnes` | La fiche publique : nom, métiers, photo et son crédit. La photo n'apparaît sur le site que si sa publication est accordée. |
| `crescite_personnes_privees` | Adresse du compte, téléphone, ville de départ, régime, urgence : lus par la personne elle-même et par l'administration. |
| `crescite_personnes_suivi` | Les notes de l'administration sur une personne : jamais lues par elle. |
| `crescite_distributions` | Qui fait quoi dans chaque spectacle (jeu, création, technique, production), et qui part en tournée par défaut. |
| `crescite_equipes` | L'équipe d'une date, quand elle s'écarte de la distribution : remplacements, renforts, absences. |
| `crescite_documents` | Les documents de l'équipe (le texte, le dossier, la fiche technique) : un fichier du stockage privé `crescite-equipe`, ou un lien. |
| `crescite_feuilles` | Les feuilles de route, une par date : brouillon puis publiée, avec une version qui augmente à chaque republication. |
| `crescite_notifications` | Les notifications de chaque personne (troisième script) : écrites par la base, lues et marquées comme lues par la personne. |
| `crescite_abonnements` | Les téléphones et ordinateurs abonnés aux notifications (Web Push), chacun ne voit que les siens. |
| `crescite_secrets` | Le jeton qui autorise la base à appeler la fonction d'envoi, et les clés d'envoi : jamais lus par le site ni par l'équipe. |

Une personne connectée ne lit que sa fiche, ses dates (options comprises), les documents de ses spectacles et les
feuilles de route publiées de ses dates ; un fichier privé ne s'ouvre que par un lien signé, si son document se lit. Le
public ne lit que les fiches publiées et la distribution des spectacles publiés. Les règles sont vérifiées par 37 essais
sur PostgreSQL (`supabase/tests/` : `npm install`, puis `node base.mjs`, `node equipe.mjs` et `node notifications.mjs`). Le script se termine par
une vérification : les tables du projet, hors compagnie, qu'un compte connecté pourrait lire. Les comptes de ce projet
sont aussi ceux du site adrienvada.fr.

**Remplir.** `python3 supabase/equipe.py` importe `data/equipe.json` : les 39 personnes et la distribution de chaque
spectacle, d'après les fiches de crescite.fr et, pour Cassandres, le dossier artistique (distribution non publiée). Il
ajoute un déroulé type de journée de représentation par spectacle et les liens vers les textes d'origine du domaine
public (Wikisource). `--photos` envoie les portraits trouvés en ligne (`private/photos/equipe/`, avec leur source et leur
crédit dans un registre privé) : ne sont montrés d'office que les vrais portraits dont la page source cite la compagnie
ou un de ses spectacles ; les autres attendent l'accord de l'administration. `--dossiers` range le dossier scolaire de
Bérénice dans le stockage privé. L'import n'écrase jamais le travail de l'administration.

**L'administration** gagne trois choses :
- **Équipe** : les fiches (publiques, coordonnées, accès, notes), et les documents de toute la compagnie.
- **Dans chaque spectacle** : la distribution, le déroulé type d'une journée de représentation et les documents. **Dans
  chaque date** : son équipe (la distribution « en tournée » cochée ; on décoche qui ne part pas, on ajoute un
  remplaçant).
- **Feuilles de route** : la feuille d'une date s'écrit directement sur une page A4 à l'écran, dans la forme des
  feuilles de la compagnie (le logo rond noir, la police FdR Sans, dérivée de Carlito et métriquement identique à
  Calibri, les jours en gras, les personnes surlignées en jaune, les alertes en rouge). La barre d'outils est courte :
  Rubrique, Jour, Ligne, Puce, Gras, Rouge, Surligner, Surligner les noms, Saut de page, Annuler. Un collage depuis
  Word ou Writer est ramené à ces formes.
  - « Composer » écrit la page à partir de la base : l'en-tête, le planning jour par jour (le déroulé type placé autour
    des représentations : le montage passe la veille plutôt que la nuit, un repas ne tombe qu'aux heures de repas, le
    départ est calculé d'après la route, et rien n'est posé avant 6h), les répétitions, les adresses et les contacts.
    Repas et transports sont repris de la feuille précédente du spectacle, l'hébergement d'une feuille au même lieu.
    Ce qui manque s'écrit en gris cliquable et ne s'imprime jamais.
  - « Mettre à jour depuis la base » rafraîchit les lignes venues de la base sans toucher à ce qui a été écrit à la main.
  - Le PDF est identique à la page, avec les mêmes sauts de page. « Publier pour l'équipe » prévient l'équipe.
  - Le module `admin/feuille.js` fait l'éditeur, le PDF (pdfmake, `admin/vendor/`) et la version web, fluide sur
    téléphone, que l'espace de l'équipe affiche.
- **Dans une date** : sa nature (représentations, répétitions, résidence : seules les représentations sont publiées),
  l'heure de fin des séances, et « Prévenir l'équipe » (un message à toute l'équipe de la date).
- **Les documents publics d'un spectacle** (pour les programmateurs, pour les établissements) se déposent dans sa
  fiche et s'affichent sur le site. Un document de l'équipe se partage par un lien de 30 jours. Le contact « Je souhaite
  programmer » se modifie dans Textes, et une action culturelle pas encore construite se masque d'une case.

**L'espace de l'équipe** (`equipe/index.html`, en ligne dans `docs/equipe/`) est une application qu'on installe sur
son téléphone (« Ajouter à l'écran d'accueil » ; sur iPhone : Partager → Sur l'écran d'accueil). En bas, les onglets
Saison, Feuilles, Planning, Spectacles et Moi, et les notifications dans la cloche en haut ; sur ordinateur, tout se
range en colonne à gauche. On y trouve :
- la prochaine date en grand, aux couleurs du spectacle, avec un compte à rebours ;
- la frise du jour J, tirée de la feuille de route ;
- qui part, l'itinéraire, la carte de la tournée et les chiffres de la saison (l'itinéraire cherche le lieu par son nom
  et son adresse : la position des lieux dans la base n'est que le centre de leur commune, bonne pour la carte) ;
- les répétitions et leurs horaires ;
- la feuille de route (version web et PDF) ;
- **Spectacles** : les spectacles sur lesquels la personne travaille (sa distribution, et les dates où elle remplace ou
  renforce), d'abord ceux qui ont une prochaine date ; dans chacun, ses prochaines dates et ses fichiers de travail
  rangés par genre, chacun avec « Partager » : la feuille de partage du téléphone, avec un lien de 30 jours pour un
  fichier privé (préparé à l'ouverture de la page : iOS refuse le partage après une attente) ;
- **Planning** (le script 5) : le planning de toute l'équipe, ses indisponibilités (à la main, motif privé, ou lues dans
  son agenda relié), l'abonnement de son agenda à ses dates Crescite, et les dates que l'administration lui propose. Il
  s'ouvre sur « Mes projets » : les gens avec qui la personne travaille, c'est-à-dire, pour chacun de ses spectacles (sa
  distribution, et les dates où elle part), toute la distribution et toutes les équipes de tournée (jeu, technique,
  création…), plus elle-même. Seules les personnes sont filtrées (lignes, « pas libre », conflits), pas les dates : on
  voit quand ses partenaires sont pris ailleurs. « Toute l'équipe » et chaque personne sont dans la même liste ; le choix
  est gardé le temps de la session. Sans projet, le planning s'ouvre sur toute l'équipe ;
- sa fiche, et un fichier agenda (.ics).

Les notifications arrivent en direct, avec un badge sur l'icône, et sur le téléphone même quand l'application est
fermée, une fois la fonction `crescite-push` déployée. Un geste sur une notification ouvre la bonne page.
L'application garde la dernière saison lue pour la consulter sans réseau, prévient quand une nouvelle version est
disponible et suit le mode sombre du téléphone. Ses icônes sont tirées du logo à la construction.

**Les notifications.** Le troisième script, `supabase/migrations/20261022_crescite_notifications.sql`, s'exécute
après les deux autres, de la même façon. La base prévient alors elle-même l'équipe d'une date : feuille de route
publiée ou republiée, horaires changés (en tournée comme en répétition), date ajoutée, confirmée, annulée, reportée ou
déplacée, document ajouté pour l'équipe, personne ajoutée ou retirée d'une date, message de l'administration
(« Prévenir l'équipe »). Plusieurs changements faits d'un coup ne donnent qu'une notification. Elles s'affichent dans
l'espace de l'équipe ; pour qu'elles arrivent aussi sur les téléphones, déployer la fonction d'envoi
`supabase/functions/crescite-push/index.ts` (Edge Functions → Deploy a new function → Via Editor, nom `crescite-push`,
coller le fichier, décocher « Verify JWT », Deploy) : elle crée ses clés d'envoi au premier appel, et sans elle rien
ne casse. Le même script ajoute la nature d'une date (représentations, répétitions, résidence, autre : seules les
représentations sont publiques) et l'heure de fin des séances, les documents publics pour les programmateurs et les
établissements, le contact diffusion de la page « Je souhaite programmer », et masque l'action culturelle de
Cassandres. Il est vérifié par 35 essais (`node notifications.mjs`).

**Les documents de la compagnie.** `data/documents.json` liste les documents copiés depuis le Google Drive de la
compagnie (dossier « CRESCITE SPECTACLES ») dans `private/drive/`, jamais versionné, et
`python3 supabase/documents.py` les range dans la base :
- pour les programmateurs et les établissements, en téléchargement public sur le site : les dossiers de diffusion 2026,
  les fiches techniques et les dossiers scolaires 2026-2027 (publication décidée le 20 octobre 2026). Ils demandent le
  troisième script SQL ;
- pour l'équipe, en copies privées : les textes en version de travail, les ateliers de Bérénice, le mémo J-1 et le plan
  de Cléophène, les fiches de renseignements.
Un fichier renvoyé remplace l'ancien, et un document déjà inscrit ne l'est pas deux fois. Une nouvelle version dans le
Drive se recopie, puis on relance le script, ou on la dépose dans l'administration.

**Les comptes.** Les inscriptions libres sont fermées sur le projet : un compte se crée dans Supabase (Authentication →
Users → Add user, avec l'adresse saisie dans la fiche). À la première connexion, il se rattache tout seul à la fiche de
même adresse. Pour que « Recevoir un lien de connexion » et « Mot de passe oublié » reviennent sur l'espace de l'équipe,
ajouter `https://adrienvada.fr/Crescite/**` aux Redirect URLs (Authentication → URL Configuration) et configurer un serveur d'envoi de courriels
(Authentication → Emails) ; sans lui, Supabase n'écrit qu'aux membres de l'équipe du projet, et peu par heure.

**L'espace des salles.** Le quatrième script, `supabase/migrations/20261023_crescite_pro.sql`, ouvre aux
programmateurs et aux directeurs de salle, sur invitation, des fichiers qui ne sont pas publics : les captations, des
photos, une fiche technique détaillée. Dans l'administration, la rubrique Espace pro crée les invitations (une
structure, son contact, les spectacles ouverts, une durée) et montre le journal des visites et des documents ouverts ;
dans chaque spectacle, les documents réservés aux salles se déposent (stockage privé `crescite-pro`, 50 Mo par
fichier) ou se donnent en lien. La salle reçoit un lien `…/pro/#<jeton>` : la page `pro/` passe par la fonction
`supabase/functions/crescite-pro`, qui vérifie l'invitation et donne pour chaque fichier un lien d'une heure. 25 essais
(`node pro.mjs`).

**Les disponibilités.** Le cinquième script, `supabase/migrations/20261024_crescite_disponibilites.sql`, ajoute les
indisponibilités de chacun (à la main, ou lues dans son agenda relié par son adresse iCal secrète, que l'API ne relit
jamais), le planning commun (toute l'équipe voit les heures de tous, le motif reste à la personne et à
l'administration ; d'un agenda relié, aucun titre n'est gardé), et les propositions de dates de l'administration, avec
une réponse par jour. Dans l'administration, la rubrique Planning montre le planning de toute l'équipe (vue Équipe et
vue Mois, motifs et conflits compris), propose des dates en montrant qui n'est pas libre pendant le choix, et suit
chaque proposition (réponses par jour, état des courriels, renvoyer, relancer, clore). L'administratrice y masque les
personnes qu'elle ne suit pas : « Masquer du planning » dans le détail d'une personne, ou sur sa ligne (au survol, d'un
toucher sur le nom, au clavier par Maj+Tab depuis la case). Une personne masquée quitte les lignes, les « pas libre »
et les conflits, sauf si on la choisit dans la liste des personnes ; « Masquées (n) », dans la barre des filtres, les
fait revenir une à une ou toutes. La liste est gardée avec son compte (le script 6, ci-dessous) ; l'espace de l'équipe
fait de même quand le compte connecté administre. Trois fonctions, à déployer avec
« Verify JWT » décoché (un nouveau déploiement peut le rallumer : ouverte dans un navigateur, une fonction qui répond
« Missing authorization header » l'a encore allumé) :
- `crescite-agenda` relit les agendas reliés toutes les heures (pg_cron, programmé par le script) et à la demande, et
  donne à chacun le flux de ses dates Crescite (`?flux=<clé>`) à ajouter à son agenda ;
- `crescite-courriel` écrit à chaque destinataire d'une proposition (Brevo, clé `BREVO_API_KEY` dans les secrets des
  fonctions ; sans clé, rien ne part et l'administration le voit) ;
- la réponse d'un clic passe par la page du site `reponse/` : Supabase montre en texte brut toute page web servie par
  une fonction. Le lien du courriel arrive sur la page avec le choix prêt, qu'on confirme d'un bouton (les messageries
  ouvrent les liens pour les vérifier). 33 essais du script (`node disponibilites.mjs`), 21 de la fonction des
  courriels (`node courriel.mjs`).

**Les préférences.** Le sixième script, `supabase/migrations/20261025_crescite_preferences.sql`, s'exécute après les cinq
autres, de la même façon, et peut être relancé. Il ajoute `crescite_preferences` : ce que chacun règle une fois et
retrouve sur tous ses appareils, une valeur par compte et par clé. Chacun ne lit et n'écrit que les siennes,
l'administration comprise ; le public n'y a aucun droit. Pour commencer, une clé : `planning.masques`, les personnes
masquées du planning. Tant que le script n'est pas passé, la liste reste sur l'appareil (sans message) ; elle passe dans
la base à la première ouverture du planning qui suit. 22 essais (`node preferences.mjs`).

**Écrire dans la base.** `python3 supabase/ecrire.py` est le seul outil par lequel Claude modifie la base quand on le lui
demande : les tables `crescite_` et les stockages de la compagnie seulement (les tables d'adrienvada.fr restent hors
d'atteinte), jamais sans filtre, avec un mode `--essai`. `lot <fichier.json>` applique une liste d'opérations dans l'ordre et s'arrête à la première erreur ;
une ligne ajoutée se reprend dans les suivantes par « @nom.id ». La règle qui l'y autorise est dans `.claude/settings.json`.
Les scripts SQL et le déploiement des fonctions restent à faire dans Supabase.
