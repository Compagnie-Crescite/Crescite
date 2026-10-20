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
dates tout public de la saison et leur carte), « Je souhaite programmer » (`#/programmer` : le catalogue, le nombre
de représentations, les lieux de diffusion, la fiche technique), « Je représente un établissement scolaire »
(`#/etablissement` : le type d'action culturelle de chaque spectacle, les actions culturelles du site, le dossier
scolaire de Bérénice). Spectacles, La compagnie et Contact viennent en second. La page de chaque spectacle prend son
univers (couleurs, police de titre, motif, photos, citations ; Bérénice à la charte de son dossier) et se lit dans
l'une des trois entrées : `#/spectacle/berenice/voir`, `…/programmer`, `…/etablissement` ; la dernière entrée choisie
sert de défaut. L'espace pro à mot de passe a disparu : ses anciennes adresses mènent à « Je souhaite programmer »,
celles de l'agenda et des actions culturelles aux deux autres entrées. La pieuvre ne compte pas les spectacles.

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
(les prochaines dates d'abord, les saisons terminées fermées). Avec `EDITION=1`, il vérifie aussi le lien « Modifier
le site » et les annotations de l'édition (`data-edit`, `data-date-id`, `data-agenda`).
`maquettes/dist/maquettes.html` est la planche : une barre d’onglets en haut, qui charge chaque maquette juste en
dessous, et pour chacune son principe, ses forces et ses limites (« À propos »).

**En ligne.** `python3 maquettes/build.py --pages` écrit le site GitHub Pages dans `docs/` : la planche en page
d'accueil et chaque maquette en page à part (`docs/m06.html`, `docs/synthese.html`…). Ces pages embarquent le logo
2.0 et les photos (rangées une seule fois dans `docs/photos/`) : leur publication a été décidée par la compagnie. Elles ne sont pas faites pour être trouvées :
chacune demande aux moteurs de recherche de ne pas l'indexer (`noindex, nofollow, noarchive, nosnippet,
noimageindex`), et leur adresse n'est donnée nulle part dans le dépôt (elle figure dans Settings → Pages). Chaque fichier de `maquettes/src/` lit ses contenus dans l’objet `D` que le script injecte.

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
| `crescite_textes` | Les autres textes du site : présentation de la compagnie, actions culturelles, bandeau d'accueil, dossier scolaire de Bérénice… |
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

Une personne connectée ne lit que sa fiche, ses dates (options comprises), les documents de ses spectacles et les
feuilles de route publiées de ses dates ; un fichier privé ne s'ouvre que par un lien signé, si son document se lit. Le
public ne lit que les fiches publiées et la distribution des spectacles publiés. Les règles sont vérifiées par 37 essais
sur PostgreSQL (`supabase/tests/` : `npm install`, puis `node base.mjs` et `node equipe.mjs`). Le script se termine par
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
- **Feuilles de route** : « Composer » remplit tout ce que la base sait (le lieu et son itinéraire, le trajet estimé
  depuis Rouen, les horaires, le planning posé autour des représentations d'après le déroulé type, l'équipe et ses
  téléphones, les contacts du lieu et de la compagnie) ; transport, hébergement et repas se complètent à la main ;
  « Publier pour l'équipe », « Télécharger le PDF », « Imprimer ». Recomposer ne perd jamais une saisie. Le module
  `admin/feuille.js` fait la version web et le PDF (pdfmake, `admin/vendor/`), pour l'administration comme pour l'équipe.

**L'espace de l'équipe** (`equipe/index.html`, en ligne dans `docs/equipe/`) : chacun s'y connecte et retrouve sa
saison (la prochaine date en avant, les saisons passées fermées), les horaires des représentations, l'itinéraire, qui
part, la feuille de route (web et PDF), le texte et le dossier de ses spectacles, sa fiche (téléphone, ville, régime,
urgence), et un fichier agenda (.ics) de ses représentations. La dernière saison lue reste consultable sans réseau.

**Les comptes.** Les inscriptions libres sont fermées sur le projet : un compte se crée dans Supabase (Authentication →
Users → Add user, avec l'adresse saisie dans la fiche). À la première connexion, il se rattache tout seul à la fiche de
même adresse. Pour que « Recevoir un lien de connexion » et « Mot de passe oublié » reviennent sur l'espace de l'équipe,
ajouter son adresse aux Redirect URLs (Authentication → URL Configuration) et configurer un serveur d'envoi de courriels
(Authentication → Emails) ; sans lui, Supabase n'écrit qu'aux membres de l'équipe du projet, et peu par heure.
