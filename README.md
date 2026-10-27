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
| `site/` | Le site de la compagnie, une seule page (`site/src/index.html`) et ses outils communs (`site/src/*.js`), assemblés par `site/build.py` ; il lit la base en direct et se modifie sur place. Les contrôles (`onglets.mjs`, `mouvement-*.mjs`, `tableau.mjs`…) et les règles du site (`CONTRAT.md`, `MOUVEMENT.md`, `SCROLLYTELLING.md`) sont à côté. |
| `admin/` | L'administration du site : tableau de bord, spectacles, dates et représentations, ateliers, lieux, textes, journal. |
| `equipe/`, `pro/`, `reponse/` | L'espace de l'équipe (une application installable), l'espace des salles (sur invitation), la page de réponse aux propositions de dates et aux alertes. |
| `data/` | Relevé des dates publiées sur crescite.fr de 2016 à 2027 : 464 lignes géolocalisées, en JSON et en CSV. Texte exact des pages publiques de l'ancien site (`site-crescite.json`, relevé par `site_crescite.py`), mentions légales et politique de confidentialité d'aujourd'hui (`textes-legaux.json`), fiche de Cassandres (`cassandres.json`), dossier scolaire de Bérénice (`berenice-dossier.json`), univers et action culturelle de chaque spectacle (`univers-spectacles.json`), zone d'intérêt de chaque photo (`cadrages.json`), projection de la carte des tournées (`carte-projection.json`). |
| `marque/` | Le logo 2.0 et le tracé de ses bras et de ses tentacules. |
| `supabase/` | La base de la compagnie : ses scripts (`migrations/`), ses fonctions (`functions/`), ses essais (`tests/`), l'import (`importer.py`) et l'outil d'écriture (`ecrire.py`). |
| `docs/` | Le site publié (`docs/index.html`), et à côté `admin/`, `equipe/`, `pro/`, `reponse/` et les photos. |
| `private/` (non versionné) | `brand/` logo 2.0 en SVG et le tracé de ses huit bras, `photos/` une photo par spectacle et celles de leurs univers, `dossiers/` les dossiers de la compagnie (scolaire de Bérénice, artistique 2027-2028). |

## Le site

```sh
python3 site/build.py              # le site (site/dist/index.html) et les espaces réservés à côté (non versionné)
python3 site/build.py --captures   # avec des captures de relecture (Playwright et Chromium, site/dist/shots/)
python3 site/build.py --pages      # en plus, le site publié dans docs/
node site/onglets.mjs /tmp/x index # parcourt les vues du site et signale les anomalies
node site/mouvement-equipe.mjs     # les dix effets de l'espace de l'équipe, dans Chromium, hors ligne (après le build)
node site/mouvement-admin.mjs      # le mouvement de l'administration, dans Chromium, sur une base fictive (après le build)
                                   # le vocabulaire de ce mouvement : site/MOUVEMENT.md
python3 data/site_crescite.py      # relève de nouveau le texte de l'ancien crescite.fr (data/site-crescite.json)
```

Un seul site, celui de la compagnie (les dix maquettes et le premier prototype qui l'ont précédé ont été retirés en
octobre 2026 ; ils restent dans l'historique du dépôt). Son texte vient des sources et de rien d'autre : le texte de
crescite.fr, page par page (spectacles, onze saisons de dates, présentation de la compagnie, actions culturelles,
contact), plus Cassandres, création 2027, **le dossier scolaire de Bérénice** et, pour chaque spectacle, **son univers et
son action culturelle** (`data/univers-spectacles.json`, repris des pages d'adrienvada.fr et du dossier artistique
2027-2028) ; s'ajoutent seulement la **carte des tournées** (`site/src/carte.js`) et quelques intitulés de rubrique
(`D.site.libelles`). Il **s'ouvre sur le logo en grand** (`site/src/intro.js`) : au clic, à la molette ou en glissant
vers le bas, ses tentacules ondulent, il grossit et le site apparaît à travers lui. La page de chaque spectacle prend son
univers (couleurs, police de titre, motif, photos, citations) et se lit selon trois entrées, ses onglets : « Je viens voir
un spectacle », « Je souhaite programmer », « Je représente un établissement scolaire » (`#/spectacle/berenice/voir`,
`…/programmer`, `…/etablissement`) ; la dernière entrée choisie sert de défaut. Les anciennes adresses (`#/voir`,
`#/agenda`, `#/programmer`, `#/etablissement`, `#/actions-culturelles`) mènent aux saisons et à l'espace pro, et
l'ancienne adresse du site, `synthese.html` (celle des courriels déjà envoyés), mène à l'index, la suite de l'adresse
gardée. La pieuvre ne compte pas les spectacles.

**Le menu d'aujourd'hui** (règle 21 du contrat) : Saisons, Les spectacles, La compagnie, Espace pro ; les trois entrées
restent les onglets de la page d'un spectacle. `#/espace-pro` se lit sur deux étages, du plus ouvert au plus réservé :
d'abord les deux pages ouvertes à tous, côte à côte en grandes portes photographiques (« Je souhaite programmer », « Je
représente un établissement scolaire ») ; puis, plus discrets, sur le papier, les espaces réservés qui demandent une
connexion (« Avec connexion », un cadenas) : l'espace des salles, celui de l'équipe, l'administration. Aucune entrée ne
reprend la couleur d'un spectacle, hors « Je viens voir », qui est celle de la saison (règle 22) : « Programmer » est un
ambre cuivré (`#94501a`, vive `#eda466`), plus l'or que l'on confondait avec le jaune de Mon Royaume pour un cheval.

**Le nom et les textes légaux.** Le site dit « Compagnie Crescite » (titres d'onglet « Saisons · Compagnie Crescite »,
en-tête) et, dans le texte, « les Crescite » ou « la compagnie Crescite » : `NOMS` (`site/build.py`) récrit dans D,
accords compris, les phrases des sources qui disaient « le Théâtre des Crescite » ; les mentions légales gardent cette
dénomination entre parenthèses. Les mentions légales et la politique de confidentialité sont celles du site tel qu'il est
(`data/textes-legaux.json` : Cloudflare Pages, la base Supabase, ce que le site recueille, ses services tiers), à la place
de celles de l'ancien WordPress que garde le relevé ; le dix-huitième script SQL les met dans la base. Les libellés ont
une seule casse (« En tournée » comme « En création », « Découvrir »), l'apostrophe typographique, un seul verbe par
action (`RETOUCHES`), et le pied mène à la page Facebook de la compagnie.

**Pour les programmateurs.** « Je souhaite programmer » donne d'abord à qui parler : le contact diffusion
(l'administratrice, le courriel de la compagnie, son téléphone s'il est saisi dans la base, « Conditions financières sur
demande »). Puis, pour chaque spectacle, un dossier PDF composé à la demande à partir des données du site, donc toujours
à jour (`site/src/dossier.js` : couverture et photos, présentation, distribution, conditions d'accueil et fiche
technique, représentations et lieux de diffusion, production, contact ; pdfmake chargé au premier clic). Sur la page
d'un spectacle : la fiche technique (celle du dossier de Bérénice ; un fichier déposé par l'administration ; sinon
« Fiche technique sur demande », qui écrit à l'administratrice) et « À télécharger » (le dossier, les documents déposés
pour les pros). Les documents déposés pour les scolaires s'ajoutent à l'onglet établissement. L'action culturelle de
Cassandres n'est pas encore construite : elle reste dans les données et dans la base, masquée (`masquee`), et le site
ne la montre pas (ni sur la page des établissements, ni en onglet).

**La saison d'un regard.** Sur `#/saisons`, la saison en cours se lit dans un tableau : en haut, son
sous-menu (comme celui des univers d'un spectacle), une seule ligne qui s'arrime sous le menu quand on descend : les seuls
spectacles qui tournent dans la saison, chacun sa vignette (sa photo, cadrée), cerclée de sa couleur (celle de ses dates), et
le nombre de ses dates ; le survoler isole ses dates, le choisir filtre la page, et le fond de la saison prend sa photo et sa
couleur (les saisons passées ont leur propre rangée, de leurs spectacles) ; puis
la frise des mois (`friseMois`), douze colonnes de septembre à août où chaque date est une ventouse à la couleur de son
spectacle, son jour écrit dedans (vidée une fois jouée), « aujourd'hui » une goutte sur le bras de la saison ; à côté, la
loupe (`LOUPE`), la carte de la saison, qui s'approche de la ville de la date survolée ou choisie, cadre les communes d'un
mois et revient à la France, la date écrite sous elle. Choisir une date ne garde qu'elle dans les listes, juste sous la
frise, et ouvre sa carte de réservation (rien ne défile) ; survoler un mois le choisit (un clic le garde) ; les filtres en
cours s'effacent sous la frise (un à un, ou « Tout effacer »), Échap aussi. Au téléphone, la frise défile au doigt, posée sur
le mois en cours, la loupe est une carte sous elle, et les filtres sont en bas de l'écran : une barre (les filtres en cours,
les mois à choisir d'un doigt) et « Filtres », un panneau qui monte du bas (la recherche, les mois, les spectacles de la
saison, ceux des saisons passées, les communes ; « Voir les dates » y mène).

**Modifier sur place.** « Modifier le site », au pied de chaque page, ouvre l'édition (`site/src/edition.js`, commun
au site et à l'administration) : après connexion avec un compte administrateur, chaque texte venu de la base se clique et s'écrit
dans la page même (gras, italique, lien, paragraphe ajouté ou retiré) ; une photo de spectacle se remplace d'un clic ;
une date de l'agenda, à venir ou passée, s'ouvre dans un panneau (lieu, représentations et leurs heures, statut,
visibilité, précisions, lien) et « Ajouter une date » se place en tête de chaque agenda. « Enregistrer » écrit dans
la base : les pages ouvertes ailleurs se mettent à jour. La barre et les panneaux prennent le style du site
(variables `--ed-*`). `?edition` à la fin de l'adresse ouvre directement l'édition.

**La pieuvre guide.** Chaque clic lui répond (`site/src/tentacules.js`, commun au site et aux espaces réservés) :
ses bras se contractent et une tentacule fine part du logo de l'en-tête jusqu'au point cliqué, où elle laisse
l'empreinte d'une ventouse. Chaque changement de page « remonte » une tentacule à la couleur de la destination (celle de
l'entrée, ou de l'univers du spectacle) ; ouvrir une saison ou un panneau la déroule, fermer l'enroule, enregistrer
l'enroule autour du bouton. Rien n'est retardé : la page répond tout de suite, l'animation joue par-dessus. Le site
l'habille de ventouses (`TENTACULES.regler`, variables `--tt-*`). Avec « réduire les animations », un fondu bref ; `?anim=0` dans
l'adresse coupe tout. La petite pieuvre de l'en-tête est en plus une créature vivante
(`site/src/creature.js`, sur les vraies tentacules de `pieuvre.js`) : elle ondule et respire, se tourne vers la
souris, suit le courant quand la page défile, se contracte à chaque page, et en entrant dans un spectacle une tentacule
va souligner le titre à la couleur du spectacle, puis revient. Sur la page de la compagnie, la pieuvre de la troupe est
une créature aussi (`CREATURE.creer`), toujours en mouvement (ondulation, respiration, balancement, halo, et sa tête
hoche et se tourne à part du corps, au bout d'un ressort) : quand la lecture descend, elle rapetisse et vit dans la
marge, jamais sur la même ligne : elle choisit un point à sa portée (la marge, ou le vide sous le titre d'un métier), y
file au galop (elle se ramasse, bondit étirée dans le sens du bond, un sillage derrière elle), y flotte, repart ; une
tentacule attrape le médaillon du métier qu'on lit, qui s'anime. Choisir quelqu'un (un clic sur une de ses places) :
sa fiche s'ouvre par-dessus sa photo (plus bas) ; la pieuvre sursaute, puis ses tentacules, lumineuses, vont tenir la
fiche et ses autres places (`c.tenir`), à la place des fils des liens.

`onglets.mjs` compare chaque texte affiché aux sources et signale tout texte qui n'en vient pas ; il vérifie aussi
le menu (à portée sur chaque vue, un seul élément marqué comme courant), les redirections des anciennes adresses,
la page de l'espace pro, la présence des contenus attendus de chaque vue et l'ordre de l'agenda
(les prochaines dates d'abord, les saisons terminées fermées). Il vérifie la page des programmateurs (le contact, le
téléchargement réel du dossier PDF, la fiche technique sur demande) et qu'un spectacle sans action culturelle n'a pas
d'onglet établissement. Avec `EDITION=1`, il vérifie aussi le lien « Modifier le site » et les annotations de l'édition
(`data-edit`, `data-date-id`, `data-agenda`). Il relève tout changement de page gelé (une transition qui attend plus
d'une seconde la capture de l'ancienne page), sur toute la visite et depuis chaque page de spectacle défilée : une
animation liée au défilement qui garde son état final hors de sa plage (`both`) gelait l'écran 4 s dans Chrome ; elles
remplissent en `backwards` (règle 15 C du contrat).

**En ligne.** `python3 site/build.py --pages` écrit le site publié dans `docs/` : `docs/index.html`, et à côté
l'administration, les espaces de l'équipe et des salles, la page de réponse et les photos (rangées une seule fois dans
`docs/photos/`) ; leur publication a été décidée par la compagnie. Elles ne sont pas faites pour être trouvées : chacune
demande aux moteurs de recherche de ne pas l'indexer (`noindex, nofollow, noarchive, nosnippet, noimageindex`).
`docs/` est le site de la compagnie sur Cloudflare Pages, hors de GitHub : `python3 scripts/cloudflare.py` le publie (la
clé, `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`, vient de l'environnement ; les adresses, du projet lui-même) ; il
est aussi servi par GitHub Pages. Cloudflare lit `docs/_headers`, écrit par le build : la même consigne aux moteurs en
en-tête, photos comprises, et ni type deviné ni affichage dans le cadre d'un autre site. Tous les liens du site sont
relatifs, et les connexions reviennent à l'adresse d'où elles partent : il suffit d'ajouter la nouvelle adresse aux
Redirect URLs de Supabase, et `SITE_URL` (secret des fonctions) donne celle des liens envoyés par courriel.

**Réserver, regarder, la nuit, la troupe, le cadrage** (règles 17 à 20 et 24). Les outils communs, injectés dans le site
par `build.py` :
- `reserver.js` (RESERVER) : sur la page d'un spectacle, un bouton par date à venir (le jour, les heures, la ville), la
  prochaine choisie d'avance ; la date choisie ouvre sa carte dans l'univers du spectacle (le lieu, les séances, une
  séance scolaire signalée sans bouton) et un seul bouton « Réserver » vers la billetterie du théâtre (le lien de la
  séance, sinon celui de la date), dans un nouvel onglet ; sur `#/voir`, chaque date s'ouvre sur place. Clavier : flèches,
  Origine, Fin ; la date choisie reste dans l'adresse (`?date=`).
- `lecteur.js` (LECTEUR) : les vidéos se lisent dans la page, sur leur affiche ; rien de YouTube (youtube-nocookie) ni de
  Vimeo (`dnt=1`) ne se charge avant le geste ; « Plein écran » (absent là où le navigateur ne le permet pas, l'iPhone),
  « Assombrir » éteint le reste de la page (Échap ou « Rallumer ») ; une seule vidéo à la fois.
- `theme.js` (THEME, dans le `<head>`) : le site public n'a que son thème sombre (décision de la compagnie, octobre 2026) :
  `data-theme="nuit"` sur `<html>` avant le premier dessin, quel que soit le réglage de l'appareil, et plus de bouton
  jour/nuit. Les espaces réservés aussi sont de nuit par défaut (plus bas).
- `troupe.js` (TROUPE) : sur la page de la compagnie, toutes les personnes des équipes, par catégories de métiers (le jeu,
  la mise en scène, l'écriture, les décors et costumes, la lumière et le son, la production), une vignette seulement pour
  une photo publiée ; survoler ou choisir une personne allume toutes ses places et les relie par des bras. La choisir (un
  clic, Entrée) ouvre sa fiche par-dessus sa photo : la vignette grandit en portrait et la fiche s'ouvre autour d'elle ; son
  nom, ses métiers, ses spectacles (sa fonction, son rôle, son alternance, « En tournée » ou son statut), chacun menant à sa
  page, et les prochaines dates de ceux qui tournent, s'il y en a (cinq au plus, puis « Toutes les dates »). Rien que D
  (`ficheHTML`, dans `index.html`). Elle se ferme quand la personne est relâchée (un second clic, Échap, un clic ailleurs,
  sa croix) et rend le focus à sa place.
- `cadrage.js` (CADRAGE) : chaque photo des spectacles garde dans son cadre sa zone d'intérêt (les comédiens, pas le
  noir du plateau), sur ordinateur comme sur téléphone ; les zones sont dans `data/cadrages.json` (une par photo, posée
  à l'œil sur chacune), et une photo ajoutée y reçoit la sienne.
Les contrôles : `REGLE17=1 REGLE18=1 REGLE19=1 REGLE20=1 EDITION=1 node site/onglets.mjs <sortie> index`.
Les règles que suit le site (le texte, le menu, l'édition sur place, le mouvement, les budgets de réactivité, la
réservation, les vidéos, la nuit seule, la troupe, les couleurs de la saison, le cadrage des photos) sont dans
`site/CONTRAT.md`.

**Les espaces réservés, à la charte du site** (octobre 2026 : « Uniformise », « Mettre tout en mode nuit par défaut »).
L'administration, l'espace de l'équipe, l'espace des salles et la page de réponse ont les polices du site (Ubuntu, Open
Sans, Raleway pour les étiquettes), ses neutres (le papier `#1b1117`, la carte `#2e2128`, l'encre `#f3eee9`…) et sa nuit
par défaut, quel que soit l'appareil : `data-theme="nuit"` sur `<html>` dans la page même, `theme-color` et manifeste de
nuit ; les palettes de jour restent dans les feuilles de style, sous `data-theme="jour"` seulement (aucun bouton), et ce
qui testait le thème en script lit cet attribut (le planning se redessine quand il change). Leur accent n'est plus le
magenta : c'est la couleur de la saison (règle 22). Les sources n'en ont qu'un gris neutre (`--saison-*` par défaut) ;
`build.py` porte ce qu'il faut de `themeSaison` (`theme(complet=True)` : la couleur, la vive, le porteur d'un texte
blanc, le texte lisible le jour et la nuit, leurs nuances) et `poser_saison` l'écrit dans un `<style id="couleurs-saison">`
à la fin du `<head>` de chaque espace publié, que chacun lit sous ses noms (`--accent`, `--magenta`…, la pieuvre
`--pieuvre`) : une nouvelle création les recolore tous. Les quatre en-têtes ont la même marque, la pieuvre (`data-pieuvre`,
posée par `tentacules.js` avec `admin/logo.js`), « Compagnie Crescite » et le nom de l'espace dessous ; dans les salles et
la réponse elle mène au site (`../`), l'administration et l'équipe ont « Le site » dans leur pied. Le pied, commun aux
quatre et en fin de contenu (jamais fixé : au téléphone, les barres d'onglets restent seules en bas) : « Compagnie
Crescite », « Écrire à la compagnie », « Mentions légales », « Politique de confidentialité » (celles du site). Une seule
série d'icônes, à la couleur de la saison (`equipe/icones/`, faite par `equipe(dest)`), sert d'icône d'onglet au site
public (posée par `assemble`), à l'administration, à l'équipe, aux salles et à la réponse. Les onglets s'intitulent
« Administration · Compagnie Crescite », « Équipe · Compagnie Crescite », « Espace des salles · Compagnie Crescite »,
« Des dates vous sont proposées · Compagnie Crescite » ; l'application installée, « Les Crescite ».

**La page des spectacles au téléphone.** Jusqu'à 899 px, `#/spectacles` est une pile d'affiches (`afficheTdm`,
`lierPile`, styles `.pil-*`) : les huit tranches tiennent dans l'écran, une tranche touchée se déplie en affiche, avec sa
fiche et la carte de sa tournée (dessinée à la première ouverture) ; « Découvrir » se pose sur sa photo et l'affiche
dépliée est tout entière le lien vers sa page. Une seule dépliée à la fois, gardée quand D change ou que la fenêtre change
de côté de 900 px ; au bureau, le sommaire et son aperçu. L'édition sur place porte sur chaque texte de la tranche et de
la fiche, la photo et la date, sans déplier.

## Données

`data/representations-site-2016-2027.csv` : une ligne par date publiée, avec saison, spectacle, dates, commune,
code INSEE, département, coordonnées, lieu, public (scolaire ou tout public), annulation, nombre de représentations
quand il est indiqué, texte d'origine et page source. Le classement scolaire / tout public est déduit des intitulés
(collège, lycée, « scolaire ») : à vérifier pour les saisons 2016 à 2020.

Ce relevé ne contient que les dates **publiées** sur le site : une ligne peut couvrir plusieurs représentations,
et beaucoup de représentations n'y figurent pas. Le dossier artistique 2027-2028 de la compagnie compte plus de
1 500 représentations depuis 2011 (au moins 86 par an depuis 2014), quand le site en liste 460 lignes depuis 2016,
soit environ un tiers. Le site ne calcule aucun total à partir du relevé, qui ne sert qu'à placer les dates
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

**Le site lit la base en direct.** Le site s'affiche d'abord avec l'instantané du dépôt, puis
`site/src/donnees.js` lit la base, recompose ses données et s'abonne au temps réel : chaque enregistrement fait
dans l'administration change les pages ouvertes dans la seconde, sans recharger. Le temps réel passe par le client
officiel de Supabase (`admin/vendor/supabase.js`, supabase-js 2.118.0, licence MIT), chargé à la demande ; s'il
manque, la page demande à la base toutes les minutes, et à chaque retour sur l'onglet, si quelque chose a changé. Une ligne d'agenda écrite à la main
(celles reprises de l'ancien site gardent leur texte d'origine) s'affiche telle quelle ; sinon elle se compose à
partir des jours, des heures et du lieu (`site/src/agenda.js`, commun au site et à l'administration).
Ajouter `?base=0` à l'adresse du site le garde sur l'instantané.

**L'administration** (`admin/index.html`, en ligne dans `docs/admin/`) : connexion par adresse et mot de passe d'un
compte du projet inscrit dans `crescite_admins`.

- **Le tableau de bord** (`#/accueil`, `admin/tableau.js`), la page d'ouverture : ce qui presse et ce qui vient, en un
  écran, et le geste qui y mène en un clic (la fiche s'ouvre sur le champ à remplir). Des tuiles : les actions rapides
  (nouvelle date, proposer des dates, nouvelle fiche, nouveau lieu, séance d'atelier, inviter une salle, opportunité de
  diffusion, tableur, modifier sur le site, rechercher…) ; « À traiter » (les demandes de devis à répondre, les relances
  de diffusion en retard, les notes de frais à valider, les options à confirmer, les dates sans horaire, les contrats à
  suivre, les feuilles de route à publier, les propositions de dates en attente, les invitations pro qui échoient, et,
  si on le veut, les portraits sans accord de publication) ; « À compléter avant la tournée » (le même compte que le bloc
  de Représentations) ; les prochaines dates (horaires, lieu, feuille de route) ; la saison en chiffres (dates,
  représentations, lieux, séances d'atelier, spectateurs, à côté de la saison d'avant) ; qui part bientôt (avec le
  téléphone de chacun, à appeler d'un geste) ; la diffusion (pipeline, montants, devis, alertes de tournée) ; les
  propositions de dates ; les séances d'atelier à venir ; les dernières modifications (chacune vers sa fiche) ; les
  spectacles et un mémo (masqués d'office). Une tuile dont la base n'a pas les tables ne se montre pas.
  - **Entièrement personnalisable**, « Personnaliser » : l'ordre (glisser une tuile par son titre, ou ← →), sa largeur
    (une colonne, deux, ou toute la largeur), masquer ou remettre une tuile, la réduire (le chevron) ; les réglages de
    chaque tuile (le rouage : la période, le nombre de lignes, ce qu'elle suit, les actions montrées) ; les colonnes de
    la grille (auto, 2, 3 ou 4) ; la page d'ouverture de l'administration (le tableau de bord, ou Représentations) ;
    « Réinitialiser ». Tout est gardé avec le compte (`crescite_preferences`, clé `accueil.tableau`, le script 6) : on
    retrouve son tableau sur tous ses appareils ; sans le script, sur l'appareil, et la disposition passe dans la base à
    la première ouverture qui suit.
  - **Dix gestes de plus pour gérer sans quitter le tableau.** (1) **Traiter sur place** : l'éclair de chaque ligne « à
    traiter » (ou « Traiter… » du clic droit) ouvre une feuille de modification en place (`GESTES.formulaire`) :
    confirmer une option, fixer les horaires, suivre le contrat, publier ou composer la feuille de route, valider ou
    refuser une note de frais, répondre à un devis, relancer, clore une proposition, prolonger une invitation, noter
    un accord de portrait ; la base écrite, l'état se relit et la ligne disparaît. (2) **La file au clavier** : J et K
    parcourent les lignes à traiter, Entrée ouvre la feuille de la ligne, Échap la referme et rend le focus ; une ligne
    traitée, la suivante prend le focus. (3) **La barre de commande** (Ctrl K, la loupe) cherche aussi les actions
    (« nouvelle date », « briefing », « personnaliser »), les vues, ce qui est à traiter (Entrée le traite sur place),
    les notes de frais, les devis, la diffusion, les propositions, les séances ; le genre compte dans les mots (« frais
    Camille », « lieu Le Volcan »). (4) **Des vues nommées** (« Lundi matin », « Veille de tournée »…) : chacune garde
    une disposition (tuiles, ordre, tailles, réglages, colonnes), choisie dans l'en-tête ; une vue peut s'ouvrir
    d'elle-même certains jours, le matin ou l'après-midi, ou quand une date confirmée est dans les trois jours (un choix
    fait à la main tient six heures) ; « Vue par défaut » rend la disposition d'avant. (5) **Un ordre des urgences qui
    apprend** : chaque ligne pèse (le coût du retard : un contrat non signé la veille pèse plus qu'un portrait sans
    accord) et se pondère par son échéance ; « Par urgence » (réglage) les mêle en une liste ; le clic droit épingle une
    ligne en haut ou la reporte (demain, lundi, dans une semaine : elle se cache jusque-là, « Montrer n lignes
    reportées » la remontre). (6) **Les tuiles se parlent** : survoler une date allume ce qui la concerne dans les
    autres tuiles (puis son spectacle) ; l'entonnoir d'un spectacle filtre tout le tableau sur lui, une pastille le
    dit, Échap le lève. (7) **Les chiffres bougent** : dans « La saison en chiffres », les représentations, les
    spectateurs et les recettes (le montant de cession du suivi) mois par mois, en barres ; un mois cliqué cherche ses
    dates ; la saison d'avant au même point, en écart. (8) **Glisser-déposer entre tuiles** : une personne de « Qui part
    bientôt » déposée sur une date l'y inscrit ; une proposition déposée sur « Prochaines dates » ouvre « Créer la
    date » ; un fichier de l'ordinateur déposé sur un spectacle devient un document de son équipe. (9) **Le fil vivant** :
    une modification de moins d'un quart d'heure a « Annuler » (la ligne revient comme avant, comme « Revenir » du
    journal) ; survoler une ligne montre son diff, champ par champ. (10) **Le briefing** : le résumé des sept jours
    (dates, horaires, lieu, feuille, qui part ; séances d'atelier ; ce qui manque ; échéances), à copier en texte dans un
    message à l'équipe, ou à imprimer.
  - Le temps réel de la base redessine les tuiles (un mémo en cours d'écriture n'est pas touché) ; le journal se relit
    alors. Fait pour l'écran d'ordinateur (trois ou quatre colonnes à 1 600 px, `.tb-grille`), une colonne au téléphone,
    en sombre comme en clair. `node site/tableau.mjs` le vérifie dans Chromium, hors ligne, sur une base fictive
    (115 vérifications : les tuiles et leurs comptes, les liens visés, la personnalisation et sa persistance, le repli sur
    l'appareil sans le script 6, les menus (clic droit, appui long, Maj+F10) et leurs actions directes, les flèches,
    précédent / suivant, le Kanban glissé, le téléphone, le sombre ; captures dans `site/dist/shots-tableau/`).
- **L'habillage** (`admin/habillage.js`, chargé en dernier : rien que l'apparence) : les polices du site (Ubuntu pour
  les titres, Open Sans pour le texte, Raleway pour les étiquettes en capitales espacées, par Google Fonts ; sans
  réseau, le système), les neutres du site et la couleur de la saison, un en-tête de nuit (la pieuvre et la rubrique
  courante à la couleur de la saison), des cartes douces et un dégradé de la saison pour ce qui s'enregistre, chaque tuile du tableau
  de bord avec son icône et sa couleur (corail pour ce qui attend, ambre pour la tournée, indigo pour les dates, sauge
  pour les chiffres, prune pour l'équipe, ciel pour la diffusion), un bandeau du jour en tête du tableau (bonjour, le
  prénom, ce qui attend, la prochaine date, trois chiffres, une tentacule en filigrane), les jours des listes en petits
  calendriers, les colonnes du Kanban colorées ; la nuit par défaut, le jour sous `data-theme="jour"`. `site/tableau.mjs` en garde des captures de chaque
  page (`habillage-*.png`).
- **Le niveau supérieur** (dix modules chargés après les menus, chacun dans son fichier) :
  - **Les fiches en tiroir** (`admin/tiroir.js`) : une date, un lieu, une personne, une demande de devis ou une piste de
    diffusion s'ouvrent dans un panneau qui glisse à droite, depuis n'importe où (le tableau de bord, le Kanban, le
    planning, la recherche, une autre fiche), sans quitter la page ni changer son adresse ; les tiroirs s'empilent (une
    date → son lieu), Échap ou le voile ferment le dernier, « Pleine page » va à la fiche. La fiche est la même qu'à sa
    place (ses enregistrements redessinent le tiroir, ses suppressions le ferment). Dans sa rubrique (Représentations,
    Lieux, Équipe), une fiche s'ouvre à côté de sa liste, comme avant. L'adresse `#/diffusion/piste/3` ouvre le Kanban
    puis la piste ; une carte du Kanban cliquée fait de même.
  - **La sélection multiple** (`admin/selection.js`) : Maj+clic (ou « Sélectionner » dans les filtres, ou la barre
    d'espace) sur des dates, des personnes, des lieux, des cartes du Kanban ou des notes de frais, puis une barre
    flottante : statut, publier ou masquer, écrire aux contacts, exporter en CSV, dupliquer vers…, devis, supprimer
    (dates) ; écrire à toutes, publier ou masquer, exporter (personnes) ; écrire, exporter, supprimer sans date (lieux) ;
    étape, relance faite, supprimer (pistes) ; valider, refuser, rembourser, exporter (notes de frais). Chaque action
    groupée s'annonce avec « Annuler ». La sélection tient quand la liste se redessine.
  - **Le parcours d'une date** (`admin/parcours.js`) : sous le titre d'une date, ses étapes calculées d'après la base,
    confirmée, contrat (à envoyer, envoyé, signé), lieu complet (adresse, contact), équipe (qui part, les téléphones),
    feuille de route (composée, publiée), bilan (les spectateurs, après la date) ; chaque étape dit où elle en est et
    s'ouvre là où on la complète. Dans les listes et les prochaines dates du tableau de bord, des points colorés.
  - **Annuler plutôt que confirmer** (`admin/corbeille.js`) : plus de « Êtes-vous sûr ? » pour supprimer (une date, un
    lieu, une séance, un atelier, une piste, une demande de devis, une alerte, un document, une invitation, du matériel,
    une note) ni pour revenir sur une ligne du journal : c'est fait tout de suite, et l'annonce porte « Annuler » (ou
    « Rétablir ») pendant huit secondes. Toute annonce se renvoie avant l'heure, d'une croix ou d'un geste (la glisser
    de côté ou vers le bas) quand elle couvre un bouton ; survolée ou tenue sous le doigt, elle attend. La **Corbeille** (`#/corbeille`, depuis le journal, la recherche et le téléphone)
    montre ce qui a été supprimé ces trente derniers jours (le journal le garde) et le rétablit, une date avec ses
    séances, son suivi, ses chiffres, son équipe et sa feuille.
  - **Les garde-fous** (`admin/gardefous.js`) : dans la fiche d'une date, en direct, quelqu'un de l'équipe indisponible
    ce jour-là (le planning, `crescite_indisponibilites`), le lieu qui accueille déjà une autre date, une autre date le
    même jour à plus de 150 km, quelqu'un déjà sur une autre date ce jour-là, une date publiée sans horaire ou sans lieu,
    un contrat signé pour une option, une option déjà passée ; dans la fenêtre d'une piste : une cession confirmée sans
    montant, une relance passée, un doublon. Rien ne bloque ; chaque alerte mène où il faut.
  - **La carte de tournée** (`#/representations/carte`, `admin/tournee.js`, le fond et la projection du site dans
    `admin/fond-carte.js`, écrit par `site/build.py`) : les lieux de la saison (ou d'un spectacle, ou à venir) sur la
    carte de France, une pastille par lieu avec ses dates, le trajet dans l'ordre, et la tournée étape par étape avec la
    distance à vol d'oiseau et le délai entre deux dates ; les enchaînements serrés se signalent ; « Autour des dates »
    resserre le cadre ; une pastille ouvre le lieu en tiroir ; les lieux sans position sont listés.
  - **Les documents générés** (`admin/modeles.js`) : un devis, un contrat de cession, une facture, une fiche technique
    d'accueil, depuis une date (ses séances, son lieu, son équipe en tournée) ou une piste (sa structure, son contact), à
    partir des modèles de la compagnie (Textes du site → « Modèle : devis »…, créés avec un texte de départ à la première
    demande, à relire), les coordonnées et le contact de la compagnie, le montant, la TVA (5,5 %) et les conditions
    demandés dans un formulaire (et l'échéance d'une facture) ; en A4 avec le logo, imprimés ou enregistrés en PDF par le
    navigateur. Chacun est émis par la base (`crescite_documents_generes`, le dix-neuvième script, réservé à
    l'administration) : elle donne le numéro (DEV-2026-003…, le suivant de l'année pour ce type, sous un verrou) et garde
    la page telle qu'émise, que « Imprimer » reproduit à l'identique ; un document émis ne change plus, une facture ne
    se supprime pas. Sans le script, rien n'est émis.
  - **Les séries et modèles de dates** (`admin/series.js`) : « Série… » dans une fiche pose d'un coup les séances du … au
    …, les jours choisis, aux heures voulues (10:00, 14:30) ; « Dupliquer vers… » sur une sélection recopie les dates
    décalées de n jours (364 : le même jour de la semaine l'an d'après), en option, avec « Annuler » ; chaque spectacle a
    ses horaires habituels (Spectacles → Déroulé type), gardés dans `crescite_textes` (`modele-date:<slug>`), qui
    préremplissent une nouvelle date.
  - **Le téléphone** (`admin/mobile.js`, sous 640 px) : une barre d'onglets en bas (Tableau, Dates, Planning, Équipe,
    Plus : les autres rubriques, la carte, la corbeille, la recherche), un bouton « + » flottant (une date, une fiche, un
    lieu, une opportunité, une proposition, une séance), les rubriques de l'en-tête masquées, les fiches en plein écran,
    leur pied et les annonces au-dessus de la barre. L'administration **s'installe sur le téléphone** comme l'espace de
    l'équipe (`admin/manifest.webmanifest`, `admin/sw.js`, ses icônes) : « Installer », en tête de « Plus », donne
    l'invite du navigateur, ou sur l'iPhone la marche à suivre dans Safari ; installée, elle s'ouvre en plein écran
    (« Admin Crescite »). Son service passe toujours d'abord par le réseau (elle écrit dans la base) et ne garde la page
    et ses scripts que pour s'ouvrir hors connexion ; il ne garde jamais rien de la base.
  - **Les notes internes** (`admin/notes.js`, le quinzième script `supabase/migrations/20261103_crescite_notes.sql`) :
    un fil sur chaque date, lieu, personne et piste ; `@Prénom Nom` mentionne quelqu'un de l'équipe (l'autocomplétion
    propose les fiches) et la base le prévient dans son espace ; épingler, modifier, supprimer avec « Annuler » ; une
    pièce jointe dans le stockage privé de l'équipe (`notes/`). Le journal garde tout.
  - `node site/niveau.mjs` vérifie les dix idées dans Chromium, hors ligne, sur la base fictive commune
    (`site/admin-fictif.mjs`, partagée avec `tableau.mjs`) : 57 vérifications, des captures dans
    `site/dist/shots-niveau/`.
- **Les gestes** (`admin/gestes.js`, commun avec l'espace de l'équipe ; `admin/menus.js` pour ce que l'administration en
  fait) : un **clic droit**, un **appui long** (au doigt, avec une courte vibration) ou **Maj+F10** sur une ligne, une
  carte ou une tuile ouvrent ce qu'on peut en faire sans ouvrir la fiche, près du pointeur à l'ordinateur, en feuille
  depuis le bas au téléphone (↑ ↓ Entrée Échap au clavier). Une date : ouvrir, confirmer une option, la feuille de route,
  prévenir l'équipe, l'itinéraire, la fiche du lieu, dupliquer, le tableur, copier le lien, supprimer. Une personne :
  appeler, écrire, copier le téléphone. Un lieu : l'itinéraire, appeler ou écrire au contact, une nouvelle date ici. Une
  feuille : compléter, composer, la date. Une demande de devis : écrire, appeler, **changer son statut sans l'ouvrir**. Une
  piste de diffusion : l'étape d'avant ou d'après, **relance faite aujourd'hui**, reporter la relance, le courriel,
  modifier, supprimer ; la carte du Kanban **se glisse d'une colonne à l'autre** (ses flèches nomment l'étape visée). Une
  note de frais : **valider, refuser, marquer remboursée** depuis le tableau de bord. Une invitation pro : prolonger de
  trente jours, copier le lien de la salle, désactiver. Une proposition de dates : la clore. Une séance d'atelier :
  dupliquer, supprimer. Une ligne du journal : revenir, ouvrir la fiche. Une tuile du tableau de bord : ses réglages,
  la réduire, sa largeur, l'avancer, la reculer, la masquer ; une action rapide : la retirer. Un spectacle : ses dates,
  une nouvelle date, l'avancer ou le reculer. Chaque action directe écrit dans la base et les listes se redessinent.
  - **Précédent / suivant** dans chaque fiche ouverte à côté de sa liste (dates, personnes, lieux, devis, invitations,
    propositions, ateliers, séances, textes), dans une feuille de route et dans un spectacle : deux boutons dans le titre,
    nommés d'après ce qu'ils ouvrent (« Précédent : Bérénice · mer. 4 nov. 2026 »), dans l'ordre de la liste et de ses filtres ;
    **Alt+↑** et **Alt+↓** font de même. Dans toutes les listes, **↑ ↓** (← → aussi) passent d'une ligne à l'autre, Début
    et Fin aux bouts.
- **La recherche rapide** : Ctrl K (⌘K sur un Mac), ou la loupe de l'en-tête (au téléphone, au bout de la ligne du
  logo). Une date se trouve par son spectacle, son lieu, sa commune ou son jour (« 21 oct », « mardi », « 21/10 »),
  comme une personne, un lieu, un spectacle, une feuille de route ou une rubrique ; ↑ ↓ choisissent, Entrée ouvre,
  Échap ferme ; sans rien taper, les prochaines dates. Tout se cherche dans ce que l'administration a déjà chargé :
  aucune requête à la frappe.
- **À compléter avant la tournée**, en tête de Représentations (repliable, et repliée elle le reste) : pour les dates
  confirmées des 60 prochains jours (30 ou 90 au choix), les personnes de l'équipe de tournée sans téléphone, les lieux
  sans adresse ou sans contact (ou la date sans lieu), les dates sans feuille de route ou dont la feuille a encore du
  gris. Chaque ligne mène là où on le complète, le curseur dans le champ (la fiche, le lieu, la feuille sur sa liste
  « À compléter ») ; la liste se vide à mesure.
- **Représentations**, présentée comme l'agenda du site : les prochaines dates en haut, puis les saisons passées,
  fermées sauf la saison en cours (« Aller à une saison… »), avec les filtres par spectacle, public et statut. On y
  ajoute une date, on y modifie une date passée. Une date porte autant de représentations qu'il en faut, le même
  jour ou non, chacune avec son heure, son public et sa billetterie. L'aperçu montre la ligne telle que le site
  l'affichera. Sous son lieu, la date montre ce que la fiche du lieu en sait (adresse et itinéraire, contact, jauge,
  plateau, ou ce qui manque) et mène à elle ; son équipe donne le téléphone de chacun (« téléphone ? » mène à la fiche).
  Le pied de la date tient sur une rangée : quand tout n'y tient pas (au téléphone, dans une colonne étroite), Feuille
  de route, Prévenir l'équipe, Dupliquer et Supprimer passent dans un menu « Plus » (↑ ↓, Échap rend le focus) ; seul
  « Enregistrer » reste à côté.
- **Le tableur** (Représentations → Tableur) : une ligne par séance, comme le tableur où la compagnie récapitule ses
  représentations ; les séances d'une même date se suivent, en bande. Colonnes : jour, spectacle, heure et fin, lieu,
  commune, public, statut, nature, distribution, billetterie, précisions, organisateur, contact, contrat, notes, séance
  annulée, site. Ce qui est vide reste vide, et une colonne vide sur toute la vue se replie (« Colonnes vides » la
  montre). Filtres : saison, spectacle, à venir ou passées, recherche ; tri par date.
  - Branché sur la base dans les deux sens. Écrire dans une case enregistre aussitôt, par le même chemin que la fiche
    d'une date (`crescite_enregistrer_date`, puis l'équipe : les mêmes déclencheurs, notifications et journal) ; l'état
    le dit, « Annuler » ou Ctrl+Z le reprend. Ce qui change ailleurs (une autre administratrice, la fiche d'une date, le
    site en édition) arrive en direct, et la case clignote. Une case de la date (spectacle, lieu, statut, nature,
    distribution, billetterie, suivi) vaut pour toutes ses séances : les autres lignes la répètent en gris et s'éclairent
    avec elle.
  - Au clavier comme dans un tableur : flèches, Entrée ou F2 (ou taper directement), Échap, Tab, Maj+flèches pour choisir
    des cases, Ctrl+C et Ctrl+V (des cases venues d'Excel ou de Google Sheets), Suppr pour vider, Ctrl+Suppr pour
    supprimer la séance (après confirmation ; à la souris ou au doigt, le bouton « Supprimer la séance du … » dit
    laquelle), Ctrl+Z. L'en-tête reste en haut, le jour et le spectacle à gauche ; au téléphone, le tableau défile sous
    les doigts.
  - « ＋ Séance » : le jour, l'heure, le spectacle, le lieu (la recherche des lieux) ; une date du même spectacle au
    même lieu qui touche ce jour (le même, la veille ou le lendemain) reçoit la séance, sinon une date se crée, et le
    tableur dit ce qu'il a fait ; un filtre qui la cacherait se relâche.
  - La distribution : l'équipe de la date (la distribution « en tournée » par défaut ; une équipe explicite ne s'écrit
    que si on la change), en pastilles qu'on retire et qu'on ajoute, au clavier aussi. « Étendre à… » la pose sur les
    dates du même spectacle de la saison, de l'année civile ou des lignes choisies (les passées si on le veut), après un
    aperçu du nombre de dates qui changeront ; les remplaçants posés à la main sont signalés avant d'être remplacés.
  - Exporter les lignes et les colonnes de la vue : Excel (un .xlsx écrit par l'administration elle-même, sans
    bibliothèque : de vraies dates et heures, l'en-tête figé et filtrable), CSV (points-virgules, pour Excel en
    français), Google Sheets (le tableau copié, une feuille vierge sheets.new s'ouvre : on colle). « Importer » : des
    lignes copiées d'un tableur (les titres de colonnes reconnus, ou l'ordre de l'export) deviennent des séances, après
    un aperçu ligne par ligne ; « Annuler » reprend tout l'import. Le tableur ne montre ni n'exporte rien des colonnes de
    diffusion du suivi (ni montant ni prix de cession).
- **Spectacles** : toute la fiche, l'univers (avec le contrôle des contrastes) et les photos (allégées avant l'envoi).
- **Ateliers** : le catalogue publié et les séances dans les établissements, avec le total des heures par saison.
- **Lieux** : avec la recherche de commune (geo.api.gouv.fr), la fusion des doublons, et ses dates (à venir, puis
  passées) avec leur feuille de route.
- Sous les champs des fiches (une personne, un lieu, le suivi d'une date), chaque numéro et chaque adresse électronique
  s'ouvrent d'un geste : « Appeler le … » (tel:), « Écrire à … » (mailto:) ; une adresse donne son itinéraire.
- **Textes du site** et **Journal**, d'où l'on peut revenir sur une modification. Le Journal se filtre (une rubrique
  ou une table, un auteur, une période : aujourd'hui, 7 ou 30 jours, ou deux dates) et se cherche (un nom, un numéro,
  un champ, jusque dans les valeurs changées), au téléphone comme à l'ordinateur ; il lit les 300 dernières
  modifications, « Lire 300 modifications plus anciennes » remonte plus loin (et la liste dit quand ce qui est lu ne
  remonte pas assez).
- **Modifier sur le site ↗** ouvre le site en mode édition : les mêmes droits, dans la page publique.

**Son mouvement.** L'administration s'ouvre sur un squelette qui luit le temps de lire la base, puis le contenu paraît.
Les vues s'enchaînent (les View Transitions : la fiche glisse vers la gauche en s'ouvrant, la liste
revient par la droite, une autre rubrique arrive en fondu ; l'en-tête et les annonces restent en place : `changerVueAdmin`,
`sensVue`) ; au premier rendu d'une vue, ses lignes, ses cartes et ses blocs arrivent l'un après l'autre (`main.entree`,
retiré au bout d'une seconde : les rafraîchissements du temps réel ne rejouent rien) ; le pied d'une fiche dit l'état
d'une barre, ambre quand elle est modifiée, verte un instant quand elle est enregistrée ; « À compléter avant la tournée »
se vide à mesure : ce qui vient d'être complété reste un instant en vert, « complété », puis se retire
(`listeQuiSeVide`) ; la recherche rapide s'ouvre et ses premiers résultats arrivent l'un après l'autre ; la pastille
« direct » bat quand un changement arrive ; dans le tableur, la case qu'on vient d'écrire s'encadre de vert ; l'onglet
choisi d'un spectacle arrive ; une connexion refusée secoue le formulaire ; les annonces s'en vont en douceur ; les
compteurs « n à compléter » et le badge d'une feuille publiée sautent ; dans le planning, aujourd'hui se pose ; une liste
qui se redessine (le temps réel, un enregistrement) glisse ses lignes à leur nouvelle place (`glisserVers`) ; le champ
visé par un lien « à compléter » s'allume (`visee`) ; une séance ou une précision ajoutée se pose ; la cloche de « Prévenir
l'équipe » sonne une fois la notification partie ; dans la Diffusion, l'opportunité déplacée glisse jusqu'à sa nouvelle
colonne ; dans une feuille de route, le compte « à compléter » saute quand il baisse ; le statut d'une note de frais
qui change saute ; les photos ajoutées à un spectacle se posent ; les champs changent en douceur ; la première liste du
journal se pose ; les menus (suggestions d'un lieu, export du tableur, « Plus » du pied) et ce qu'un pli ouvre se posent ;
dans l'éditeur A4 d'une feuille de route, l'amorce visée depuis « À compléter » s'allume sur la page. Sur le site en mode
édition (`edition.js`), le point de la barre bat tant que des modifications attendent, et passe au vert un instant à
l'enregistrement. Rien de tout cela si l'appareil
demande moins d'animations, ni avec `?anim=0`. `node site/mouvement-admin.mjs` le vérifie dans Chromium, sur
une base fictive.

Les règles d'accès sont dans la base : le public lit ce qui est publié (ni les options, ni les dates masquées, ni le
suivi, ni les séances), seuls les administrateurs écrivent. Le script a été vérifié sur un PostgreSQL local avec les
rôles de Supabase (droits de lecture et d'écriture, déclencheurs, enregistrement d'une date, journal). Le site a
ensuite été essayé de bout en bout sur la base réelle : il la lit en moins d'une seconde, affiche sans recharger
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
spectacle, d'après les fiches de crescite.fr ; la distribution de Cassandres (le dossier artistique, non publiée tant que
la compagnie ne la confirme pas) n'est pas dans ce dépôt public : `private/equipe-privee.json`, que l'import ajoute. Les
dates passées dont l'équipe n'était pas la distribution d'aujourd'hui (`historique` : Bérénice avant 2023, L'imaginaire
forcé avant la saison 2026-2027) reçoivent leur équipe d'alors, date par date (qui n'y jouait pas encore, qui y jouait). Il
ajoute un déroulé type de journée de représentation par spectacle et les liens vers les textes d'origine du domaine
public (Wikisource). `--photos` envoie les portraits trouvés en ligne (`private/photos/equipe/`, avec leur source et leur
crédit dans un registre privé) : ne sont montrés d'office que les vrais portraits dont la page source cite la compagnie
ou un de ses spectacles ; les autres attendent l'accord de l'administration. `--dossiers` range le dossier scolaire de
Bérénice dans le stockage privé. L'import n'écrase jamais le travail de l'administration.

**L'administration** gagne trois choses :
- **Équipe** : les fiches (publiques, coordonnées, accès, notes), et les documents de toute la compagnie ; la liste
  trouve aussi les fiches « Sans téléphone », à compléter.
- **Dans chaque spectacle** : la distribution, le déroulé type d'une journée de représentation et les documents. **Dans
  la distribution**, « Ajouter quelqu'un de la troupe » (ou « Ajouter au jeu », « à la technique »… sous chaque catégorie)
  ouvre toute la troupe, à chercher par nom, métier ou spectacle, ceux dont le métier va avec la catégorie en tête : un
  geste ajoute, la fenêtre reste ouverte pour en ajouter d'autres, une personne sans fiche se crée au vol. C'est la même
  ligne que « Ses spectacles » sur la fiche de la personne, où l'on peut aussi l'ajouter à un spectacle ou l'en retirer ;
  tout s'enregistre aussitôt. L'onglet « Fiche artistique » (l'ancien « Équipe ») ne garde que le texte libre de la page
  et du dossier. **Qui a joué quand**, sous la distribution : chacun avec ses périodes (« du 12 mars 2019 au 20 mai
  2022 · 34 dates »), lues dans l'équipe de chaque date. « Régler sa période » (du … au … ; vide : depuis la première
  date, jusqu'à la dernière) écrit d'un coup les écarts des dates qu'elle change, avec un aperçu (combien de dates, dont
  combien à venir, dont la personne sera prévenue) et « Annuler » ; « Quelqu'un qui a joué avant » fait de même pour une
  personne qui n'est plus dans la distribution. Retirer de la distribution quelqu'un qui a joué des dates passées
  demande si elles le gardent. La fiche de la personne dit aussi ce qu'elle a joué, et quand. Rien ne change dans la
  base : ce sont les écarts de `crescite_equipes`, comme ceux de l'historique importé. **Dans chaque date** : son équipe (la distribution « en tournée » cochée ; on décoche qui ne part pas, on ajoute un
  remplaçant).
- **Feuilles de route** : la feuille d'une date s'écrit directement sur une page A4 à l'écran, dans la forme des
  feuilles de la compagnie (le logo rond noir, la police FdR Sans, dérivée de Carlito et métriquement identique à
  Calibri, les jours en gras, les personnes surlignées en jaune, les alertes en rouge). La barre d'outils est courte :
  Rubrique, Jour, Ligne, Puce, Gras, Rouge, Surligner, Surligner les noms, Saut de page, Annuler. Un collage depuis
  Word ou Writer est ramené à ces formes.
  - « Composer » écrit la page à partir de la base : l'en-tête, le planning jour par jour (le déroulé type placé autour
    des représentations : le montage passe la veille plutôt que la nuit, un repas ne tombe qu'aux heures de repas, le
    départ est calculé d'après la route, et rien n'est posé avant 6h), les répétitions, les adresses et les contacts.
    Repas et transports sont repris de la feuille précédente du spectacle ; ce qui est écrit à la main dans « Adresses
    et contacts », d'une feuille au même lieu (du même spectacle d'abord, la plus récente avant la date, sinon la plus
    proche après) ; l'hébergement, de la dernière feuille écrite au même lieu (et non de la précédente dans le temps),
    à défaut d'une feuille de la même commune. Au-dessus de la page, « Hébergement : repris de la feuille du … » dit
    d'où il vient et se change d'un geste : une autre feuille du lieu (ou de la commune), ou « à écrire » ; la rubrique
    est remplacée (« Annuler » la reprend), et retouchée à la main, la liste le dit (« écrit dans cette feuille »).
    Ce qui manque s'écrit en gris cliquable et ne s'imprime jamais.
  - **À compléter**, au-dessus de la page : ce que la feuille demande encore (le gris qui pose une question :
    « téléphone ? », « heure ? », « hôtel : nom, adresse… ? »), en une liste qu'on remplit sans viser la page, au clavier
    (Entrée passe au suivant) comme au téléphone ; chaque réponse prend la place du gris, comme un clic sur lui (« Annuler »
    de la barre la reprend), et dit si elle ira dans une fiche. « n à compléter », le même compte, se lit dans la liste
    des feuilles, sur le bouton « Feuille de route » d'une date (au téléphone, le chiffre sur « Plus »), dans « Ses
    prochaines dates » d'une personne et dans les dates d'un lieu ; un clic ouvre la feuille sur sa liste « À
    compléter ». Le compte suit la feuille quand elle change (le temps réel de la base).
  - « Mettre à jour depuis la base » rafraîchit les lignes venues de la base sans toucher à ce qui a été écrit à la main ;
    dans une ligne retouchée, le gris « téléphone ? » ou « adresse du lieu ? » prend la valeur que la base a apprise
    depuis. Quand la base sait de quoi remplir du gris, la feuille le dit dès qu'on l'ouvre.
  - **La mémoire des feuilles.** Ce qu'on écrit dans une feuille à la place d'une information de la base, ou là où elle
    manque, va dans la bonne fiche quand on enregistre la feuille : le téléphone d'une personne de la compagnie (sa ligne
    dans « contacts compagnie » → sa fiche), le contact du lieu, et l'adresse d'un lieu qui n'en a pas, sa jauge et son
    plateau (→ la fiche du lieu), l'organisateur et le contact propre à la date (→ son suivi). Les feuilles suivantes,
    et l'espace de l'équipe, le trouvent alors tout prêt. Une phrase le dit (« Le téléphone de … est gardé dans sa
    fiche ») avec « Annuler », qui remet l'ancienne valeur dans la fiche. Rien n'est deviné : deux numéros dans la ligne,
    pas de numéro reconnaissable, une personne ou un contact qu'on ne retrouve plus (un autre nom que dans la fiche), une
    adresse pour un lieu qui en a déjà une, et rien ne s'enregistre ; la phrase dit ce qui reste dans la feuille, et
    pourquoi. Ce qu'on efface dans la feuille n'efface pas la fiche ; un contact du suivi, texte libre, est complété ou
    corrigé (un numéro changé remplace l'ancien), jamais réécrit. Seul compte ce qui a été écrit depuis l'ouverture de la
    feuille : enregistrer de nouveau ne réapprend rien. La fiche d'une personne, d'un lieu ou le suivi d'une date dit
    ensuite d'où vient une valeur apprise (« Appris de la feuille de route du … », tant que la ligne de la feuille la dit
    encore ; la feuille ne garde que la trace : quelle fiche, quel champ, quand, rien de la valeur), et le Journal, à la
    ligne de la feuille, ce qu'elle a gardé (les coordonnées des personnes, elles, ne vont jamais au journal). Les lignes
    composées depuis la base portent une clé (`cie:<personne>`, `contact:lieu`, `contact:date`, `contact:organisateur`,
    `lieu`, `lieu:precisions`) ; `MEMOIRE`, dans `admin/equipe.js`, relie chacune à sa fiche et à son champ. Aucune
    colonne de plus dans la base.
  - Le PDF est identique à la page, avec les mêmes sauts de page. « Publier pour l'équipe » prévient l'équipe.
  - Le module `admin/feuille.js` fait l'éditeur, le PDF (pdfmake, `admin/vendor/`) et la version web, fluide sur
    téléphone, que l'espace de l'équipe affiche.
- **Dans une date** : sa nature (représentations, répétitions, résidence : seules les représentations sont publiées),
  l'heure de fin des séances, et « Prévenir l'équipe » (un message à toute l'équipe de la date).
- **Les documents publics d'un spectacle** (pour les programmateurs, pour les établissements) se déposent dans sa
  fiche et s'affichent sur le site. Un document de l'équipe se partage par un lien de 30 jours. Le contact « Je souhaite
  programmer » se modifie dans Textes, et une action culturelle pas encore construite se masque d'une case.

**L'espace de l'équipe** (`equipe/index.html`, en ligne dans `docs/equipe/`) est une application qu'on installe sur
son téléphone (« Ajouter à l'écran d'accueil » ; sur iPhone : Partager → Sur l'écran d'accueil). Au téléphone, dans le
navigateur, un bouton « Installer » reste dans la barre du haut tant qu'elle n'est pas installée : l'invite du navigateur
quand il en a une, sinon la marche à suivre. En bas, les onglets
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
- **Les gestes** (`../admin/gestes.js`) : un **appui long** sur un billet (ou le héros d'une date), avec une courte
  vibration, ou un clic droit à l'ordinateur, ouvre une feuille d'actions depuis le bas : ouvrir la date, l'itinéraire, la
  feuille de route et son PDF, l'ajouter à l'agenda, signaler un retard, une note de frais, partager la date ; sur une
  notification : l'ouvrir, la marquer lue, tout marquer lu ; sur un document : l'ouvrir, le partager ; sur une
  proposition : répondre. La page d'une date (et d'une feuille de route) a **date précédente / date suivante**, deux
  boutons nommés, qu'un **balayage** du doigt vers la gauche ou la droite actionne aussi, comme **← →** au clavier ; le
  planning se balaie de même d'une période à l'autre. Rien ne vibre si l'appareil demande moins d'animations.
  Un appui long sur un **horaire**, le **lieu**, une **personne** de « Qui part », une **note de frais**, une
  **indisponibilité** ou la **feuille de route** a aussi ses actions (itinéraire, site, copier l'adresse, sa fiche,
  le justificatif, modifier ou retirer l'indisponibilité, le PDF…).
- **Modifier depuis le téléphone** : quand le compte connecté administre (`crescite_est_admin()`, sondé au
  chargement et gardé hors ligne), ces mêmes appuis longs **modifient** presque tout, sans passer par l'administration,
  dans une feuille de modification qui monte du bas (`GESTES.formulaire`, partagée avec l'administration) et dont
  l'enregistrement relit la page : sur une date, son **statut**, sa nature, sa publication, son lien et ses précisions ;
  **ses représentations** (jour, heure, fin, public, précision, annulée ; en ajouter, en retirer) ; **qui part** (toute
  la distribution du spectacle à cocher, les remplaçants) ; **le lieu** (nom, adresse, site, jauge, plateau, contact,
  accès et notes de suivi) ; **le suivi interne** (organisateur, contact, contrat, cachet, notes) ; **les chiffres**
  (jauge, spectateurs, heures d'ateliers) ; **prévenir l'équipe** (une notification à chaque personne de la date, via
  `crescite_prevenir_equipe`) ; **supprimer la date**. Sur un horaire : changer l'heure, annuler ou rétablir la séance,
  la retirer. Sur une personne : ses **coordonnées** (téléphone, adresse électronique, ville, urgence), « ne part pas
  sur cette date », qui part. Sur une note de frais : la modifier (la sienne tant qu'elle attend ; toutes pour
  l'administration), la supprimer. Sur une notification : l'effacer. Sur une proposition ouverte : répondre d'un geste.
  Sur un **document** : le modifier (titre, type, pour qui : l'équipe, l'administration seulement, ou le public du
  site), **remplacer son fichier** depuis le téléphone, le supprimer (le fichier avec, s'il n'est pas partagé) ; sur
  une date, un spectacle ou la section des documents : **ajouter un document**, un fichier envoyé depuis le téléphone
  (une photo, un PDF…) ou un lien, rangé comme l'administration le ferait (le stockage privé « crescite-equipe » sous
  le dossier du spectacle ; un PDF public dans « crescite », sous documents/). Sur une **feuille de route** lue, chaque
  ligne porte son bloc (`data-bloc`, posé par `FEUILLE.html`) : un appui long y copie le texte, **modifie la ligne**
  (texte, nature, gras ; elle n'est plus « de la base »), en **ajoute une après**, la **retire** ; sur la feuille
  elle-même : une ligne à la fin, **mettre à jour depuis la base** (`FEUILLE.actualiser` sur `FEUILLE.composer`, avec
  les mêmes sources que l'administration : équipe et téléphones, administration et régie générale, suivi de la date et
  du lieu, documents de l'équipe, feuilles des autres dates), **repasser en brouillon** ; dans la liste des feuilles,
  les mêmes ; sur une date sans feuille publiée, « Feuille de route… » **publie le brouillon** (mis à jour, ou tel
  quel) ou **compose la feuille** depuis la base et la publie. La base passe une feuille publiée en version suivante
  à chaque écriture et prévient l'équipe (`crescite_feuilles_avant`, `crescite_notif_feuilles`).
  Les écritures passent par les mêmes tables et les mêmes règles RLS que l'administration ; une erreur se lit dans la
  feuille, sans rien perdre de la saisie.
  `node site/gestes-equipe.mjs` le vérifie dans Chromium (48 vérifications : hors ligne, puis sur une base
  simulée en lecture-écriture, stockage compris, où le compte administre : la date, un horaire, une présence, le lieu,
  prévenir, une notification, un document modifié puis un fichier ajouté, une ligne de feuille de route, la mise à
  jour depuis la base, le brouillon, la publication, la composition), après `python3 site/build.py`.

Les notifications arrivent en direct, avec un badge sur l'icône, et sur le téléphone même quand l'application est
fermée, une fois la fonction `crescite-push` déployée. Un geste sur une notification ouvre la bonne page.
L'application garde la dernière saison lue pour la consulter sans réseau, prévient quand une nouvelle version est
disponible et s'ouvre de nuit, comme le site. Ses icônes sont tirées du logo à la construction, à la couleur de la saison.

**Son mouvement.** Dix effets, dans `equipe/index.html` (la feuille de style, section « le mouvement de l'espace de
l'équipe ») et `equipe.js` : le retour au doigt (depuis le bord gauche, la vue suit le pouce et la précédente revient :
`brancherRetour`) ; le compte à rebours dont les chiffres roulent quand il change, la lampe « En scène » et la lueur du
héros qui respire ; le jour J en direct (le trait « maintenant » descend le long de l'étape en cours, la prochaine dit
« dans 12 min » : `majFrises`) ; le billet dont le talon se décolle à la pression, et la page d'une date qui se pose ;
l'application à la couleur du spectacle lu (curseur des onglets, retour, marque : `teinter`) ; la route pointillée qui
avance de Rouen au lieu sur la carte d'une date, les kilomètres qui se comptent, le billet survolé qui allume son bras
sur la carte (`brancherAllumage`) ; les billets qui glissent à leur nouvelle place quand la base a changé (`glisserVers`)
et l'heure qui vient de changer, lavée de jaune ; la coche de la liste de chargement qui se trace, la jauge qui luit à
100 %, le ticket photographié qui s'envole vers le total des notes de frais ; les notifications qu'on glisse pour les
marquer lues (`brancherGlisserNotif`), leurs jours épinglés, « tout marquer comme lu » qui les éteint l'une après
l'autre ; la pieuvre qui s'étire et nage quand on tire pour rafraîchir, la photo du héros qui dérive ; et encore : l'arrivée en
fondu du squelette au contenu, un bouton qui a réussi le dit un instant (`occupe`), les billets d'une saison passée
arrivent l'un après l'autre, la photo d'un spectacle s'approche au survol, la réponse à une proposition saute, la feuille
de route se lit en direct le jour J (les lignes passées pâlissent, celle du moment se marque : `majFeuilleDirect`), le
bandeau d'une notification dit le temps qu'il lui reste, le bandeau d'état n'entre que s'il change, la page d'un
spectacle se pose comme celle d'une date, une indisponibilité retirée se replie et la neuve se pose, ce qui arrive après
la page (les chiffres, la liste de chargement, le planning) se pose, le héros recule au défilement, les mois de la
saison restent en haut, ce qu'un pli ouvre se pose, le téléphone confirme un bouton qui a réussi, la porte se pose à
l'ouverture et secoue une connexion refusée. Tout ce
qui bouge en continu ne touche que `transform` et `opacity` ; rien ne bouge si l'appareil demande moins d'animations, ni
avec `?anim=0`, la teinte du spectacle exceptée. `node site/mouvement-equipe.mjs` les vérifie dans Chromium, hors
ligne, sur une saison fictive.

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
chaque proposition (réponses par jour, état des courriels, renvoyer, relancer, clore). Chaque jour proposé donne
« Créer la date » : le formulaire d'une nouvelle date s'ouvre pré-rempli (le spectacle, le jour et ses heures, le lieu
quand la proposition le nomme ou qu'elle est liée à une date, la nature d'après le titre — des répétitions ne vont
jamais sur le site —, et l'équipe : celles et ceux qui ont répondu oui ce jour-là) ; une fois la date enregistrée, la
proposition se clôt (l'annonce le dit) et garde sa date (« Date retenue ») ; quitter le formulaire sans enregistrer
n'y touche pas. L'administratrice y masque les
personnes qu'elle ne suit pas : « Masquer du planning » dans le détail d'une personne, ou sur sa ligne (au survol, d'un
toucher sur le nom, au clavier par Maj+Tab depuis la case). Une personne masquée quitte les lignes, les « pas libre »
et les conflits, sauf si on la choisit dans la liste des personnes ; « Masquées (n) », dans la barre des filtres, les
fait revenir une à une ou toutes. La liste est gardée avec son compte (le script 6, ci-dessous) ; l'espace de l'équipe
fait de même quand le compte connecté administre. Trois fonctions, à déployer avec
« Verify JWT » décoché (un nouveau déploiement peut le rallumer : ouverte dans un navigateur, une fonction qui répond
« Missing authorization header » l'a encore allumé) :
- `crescite-agenda` relit les agendas reliés toutes les heures (pg_cron, programmé par le script) et à la demande, et
  donne à chacun le flux de ses dates Crescite (`?flux=<clé>`) à ajouter à son agenda. Le flux porte aussi les
  propositions de dates qui lui sont adressées et encore ouvertes : un événement par jour proposé (une période proposée
  d'un tenant en fait un seul), « Proposition : Bérénice — Théâtre de Flers (à confirmer, vous avez répondu :
  disponible) », provisoire (TENTATIVE) et sans occuper l'agenda (TRANSPARENT), à ses heures s'il en a, sinon en
  journées entières, avec le lien de la proposition dans l'espace de l'équipe (jamais la clé de réponse du courriel).
  Un jour passé ou répondu non, une proposition close, retirée ou devenue une date (elle y est comme date) n'y sont
  pas. Depuis ce changement, la fonction est **à redéployer** par Adrien (aucun script SQL à lancer) : recoller
  `supabase/functions/crescite-agenda/index.ts` dans son éditeur (Edge Functions → crescite-agenda), Deploy, puis
  vérifier que « Verify JWT » est resté décoché : un redéploiement peut le recocher, et le flux ne s'ouvrirait plus ;
- `crescite-courriel` écrit à chaque destinataire d'une proposition (Brevo, clé `BREVO_API_KEY` dans les secrets des
  fonctions ; sans clé, rien ne part et l'administration le voit), et, avec le onzième script, les alertes de tournée ;
- la réponse d'un clic passe par la page du site `reponse/` : Supabase montre en texte brut toute page web servie par
  une fonction. Le lien du courriel arrive sur la page avec le choix prêt, qu'on confirme d'un bouton (les messageries
  ouvrent les liens pour les vérifier). 33 essais du script (`node disponibilites.mjs`), 21 de la fonction des
  courriels (`node courriel.mjs`), 39 du flux d'agenda (`node agenda.mjs` : les dates inchangées, les propositions,
  l'échappement et le pliage des lignes).

**Les préférences.** Le sixième script, `supabase/migrations/20261025_crescite_preferences.sql`, s'exécute après les cinq
autres, de la même façon, et peut être relancé. Il ajoute `crescite_preferences` : ce que chacun règle une fois et
retrouve sur tous ses appareils, une valeur par compte et par clé. Chacun ne lit et n'écrit que les siennes,
l'administration comprise ; le public n'y a aucun droit. Pour commencer, une clé : `planning.masques`, les personnes
masquées du planning. Tant que le script n'est pas passé, la liste reste sur l'appareil (sans message) ; elle passe dans
la base à la première ouverture du planning qui suit. 22 essais (`node preferences.mjs`).

**« Compagnie Idéale » (lancé le 25 octobre 2026).** Le septième script, `supabase/migrations/20261026_crescite_ideale.sql`,
s'exécute après les six autres et peut être relancé. Il ajoute les alertes de tournée et les demandes de devis (le public
les dépose, sans en poser le suivi ; il ne relit que son alerte, par son jeton), les notes de frais (chacun les siennes,
jamais validées ni remboursées par soi-même, avec le jour de la dépense ; les justificatifs dans le stockage privé
`crescite-frais`, chacun dans le dossier de sa fiche), le matériel (lu par l'équipe, tenu par l'administration), les
listes de chargement et les pistes de diffusion (l'administration seule), et cinq colonnes de diffusion au suivi des
dates. Un compte du projet qui n'a pas de fiche dans l'équipe n'y a rien. L'administration écoute ces tables sur un canal
à part, et seulement quand la base les a. 34 essais (`node ideale.mjs`). Tant que le script n'est pas lancé, la rubrique
Diffusion, les notes de frais (Équipe) et l'onglet Matériel d'un spectacle se masquent ; le reste de l'administration, le
tableur compris, n'en dépend pas. De même dans l'espace de l'équipe (une lecture de `crescite_notes_frais` le dit, une
fois par chargement) : le geste « Frais » d'une date, la carte « Notes de frais » de Moi, `#/frais` (qui mène alors à
`#/moi`) et la checklist du camion. Un justificatif se dépose dans `<fiche>/<horodatage>_<nom>`, jamais par-dessus un
autre fichier ; la note garde ce chemin, et le fichier ne s'ouvre que par un lien signé d'une heure (au clic dans l'espace
de l'équipe, par lot dans l'administration ; l'export CSV garde le chemin). Sur le site, l'alerte de tournée et la
demande de devis ne se disent enregistrées que si la base les a enregistrées ; sinon, la page propose d'écrire au
contact diffusion, le récapitulatif prêt.

**Les documents communs (lancé le 25 octobre 2026).** Le huitième script, `supabase/migrations/20261027_crescite_documents_publics.sql`,
s'exécute après les sept autres et peut être relancé. Un document public peut être pour les programmateurs et les
établissements à la fois (`pour` = `tous` ; `pros_scolaires`, son ancien nom, est accepté aussi) : il refait la règle de
lecture publique des documents (`public_lecture`, une seule, pour le public comme pour les comptes connectés : les
documents publics des spectacles publiés) et les documents qu'une invitation de l'espace pro ouvre. La liste complète
des valeurs est aussi dans les troisième et quatrième scripts : relancés après lui, ils ne refusent pas les documents
communs déjà rangés et ne retirent rien de ce qu'il ouvre. 20 essais (`node documents.mjs` : les huit scripts relancés
dans le désordre avec des documents communs rangés, ce que le public, l'équipe et l'espace pro en lisent).

**L'alerte de retard (lancé le 25 octobre 2026).** Le neuvième script, `supabase/migrations/20261028_crescite_signaler.sql`,
s'exécute après les huit autres et peut être relancé. Dans l'espace de l'équipe, le geste « Retard » d'une date à venir
prévient l'équipe de la date (celles et ceux qui partent et ont un compte : la distribution « en tournée », corrigée par
l'équipe de la date) et les administrateurs dont le compte est relié à une fiche, jamais son auteur : une notification
dans l'application et sur les téléphones abonnés, comme les autres. La fonction `crescite_signaler` n'est appelable que
par l'équipe de la date et l'administration ; 280 caractères au plus, cinq alertes par heure et par compte ; chaque
alerte est gardée dans `crescite_signalements` (son auteur la relit, l'administration toutes). Tant que le script n'est
pas lancé, le geste ne se montre pas ; il ne dit « envoyée » que si la base l'a envoyée. 32 essais (`node signaler.mjs`).

**Les chiffres des dates (lancé le 25 octobre 2026 ; les chiffres du récapitulatif y sont rangés).** Le dixième script, `supabase/migrations/20261029_crescite_chiffres.sql`,
s'exécute après les neuf autres et peut être relancé. Il ajoute `crescite_dates_chiffres` : pour une date, la jauge (les
places), les spectateurs (le public venu) et les heures d'ateliers, avec leur source (le récapitulatif des
représentations de la compagnie, feuille et ligne). Jamais publiés : l'administration les lit et les écrit (la fiche
d'une date, bloc « Les chiffres » ; trois colonnes du tableur, exportées en nombres), l'équipe les lit (la page d'une
date, dans son espace), le public et un compte du projet sans fiche n'y ont aucun droit ; chaque changement va au
journal. `crescite_dates_suivi` (organisateur, contacts, contrat) reste à l'administration seule. Tant que le script
n'est pas lancé, rien de cela ne se montre. 19 essais (`node chiffres.mjs`).

**Les alertes de tournée (lancé le 25 octobre 2026 ; ses derniers renforts viennent avec le treizième script).** Le onzième
script, `supabase/migrations/20261030_crescite_alertes.sql`, s'exécute après les dix autres et peut être relancé ; la
fonction `crescite-courriel` est ensuite à redéployer. Sur le
site, « Être prévenu du prochain passage » dépose une alerte : une adresse, un secteur (un code postal ou une commune, et
le département qui s'en déduit ; ou la position du visiteur, 40 km alentour), un spectacle ou tous. Elle ne compte
qu'une fois confirmée d'un clic depuis le courriel envoyé à l'adresse : sans cela, n'importe qui inscrirait l'adresse
d'un autre. Le lien mène à la page `reponse/?alerte=…`, qui fait confirmer d'un bouton (les messageries ouvrent les liens
pour les vérifier) ; le formulaire du site, lui, dit seulement que l'alerte s'activera une fois confirmée, et à quoi sert
l'adresse.
- Ce que la base garantit (des déclencheurs, que le septième script relancé ne défait pas) : le public ne dépose jamais
  une alerte confirmée, ne choisit pas son jeton et ne lit pas celles des autres ; cinq alertes actives au plus par
  adresse ; un courriel de confirmation au plus par adresse et par 24 heures (son lien confirme toutes les alertes en
  attente de l'adresse), et 50 adresses au plus par 24 heures, courriels du dépôt et du matin ensemble ; la même alerte
  déposée deux fois ne se double pas ; la commune, reprise dans les courriels, n'y garde que des lettres (ni lien, ni
  balise) ; une position est gardée au kilomètre près.
- Chaque matin (7 h 17, heure UTC, pg_cron), `crescite-courriel` efface les alertes non confirmées 30 jours après leur
  courriel de confirmation, envoie les confirmations restées en attente (« non_configure » compris, dès qu'une clé
  d'envoi existe), puis un seul courriel par alerte confirmée, avec les dates qu'elle n'a pas encore reçues (le premier :
  toutes les dates à venir) : confirmées, visibles, tout public ou mixte (jamais une scolaire), à venir, d'un spectacle
  publié (celui de l'alerte s'il y en a un), dans son secteur (à moins de 40 km quand l'alerte et le lieu ont une
  position, sinon le même département : la Corse en 2A et 2B, l'outre-mer en trois chiffres). Le courriel donne le
  spectacle, le jour et l'heure, le lieu, la commune, le lien de réservation, les pages du site et le lien pour arrêter
  l'alerte (elle s'efface, avec son adresse ; « toutes mes alertes » efface l'adresse entière). Chaque date écrite est
  notée (`crescite_alertes_envois`) : jamais deux fois la même ; 200 courriels au plus par passage (Brevo gratuit : 300 par
  jour, il en faut pour les propositions et les liens de connexion), le reste le lendemain. Sans clé d'envoi, rien ne
  part : c'est noté « non_configure ».
- Le script répare aussi le septième : les pistes de diffusion gagnent leur montant de cession estimé
  (`montant_estime`), que l'administration écrivait sans que la table l'ait (créer ou changer une piste échouait).
- Aucun suivi d'ouverture ni de clic n'est ajouté aux courriels. Brevo, lui, en pose sur les courriels transactionnels,
  avec son propre en-tête de désinscription (List-Unsubscribe) : pour s'en passer, le lui demander, ou envoyer par Resend
  (`RESEND_API_KEY`), qui reçoit alors le désabonnement d'un geste des messageries (List-Unsubscribe-Post).
- Dans l'administration, la Diffusion a trois parties : les pistes ; les demandes de devis déposées sur le site (la
  demande, le contact, le statut — nouvelle, en cours, devis envoyé, confirmée, sans suite — et les notes internes, que le
  programmateur ne voit jamais ; il suffit du septième script) ; les alertes de tournée (combien sont confirmées, en
  attente, par département et par spectacle ; désactiver, réactiver ou effacer une alerte), masquées tant que le onzième
  script manque.

À faire, dans l'ordre : coller le script dans l'éditeur SQL (Run) : il dit à la fin ce qui est en place ; puis redéployer
`crescite-courriel` (Edge Functions → crescite-courriel → coller `supabase/functions/crescite-courriel/index.ts` →
Deploy) et vérifier que « Verify JWT » est resté décoché ; la clé d'envoi (`BREVO_API_KEY` ou `RESEND_API_KEY`) et
l'expéditeur vérifié restent ceux des propositions. Tant que le script n'est pas lancé, la base refuse l'alerte : le site
ne dit rien enregistré et propose d'écrire au contact diffusion. 72 essais (`node alertes.mjs` : les onze scripts, le
onzième relancé, le septième et le troisième relancés après lui ; la fonction dans Node, Brevo et Resend simulés).

**Les semaines de résidence sur le site.** Le douzième script,
`supabase/migrations/20261031_crescite_residences.sql`, change une seule règle : jusqu'ici une date qui n'était pas une
représentation était masquée d'office ; désormais une résidence se montre ou non, comme une représentation (sa case
« Publiée sur le site », que l'administration laisse cocher), et les répétitions et les dates « autre » restent pour
l'équipe. Lancé le 26 octobre 2026 ; les 47 résidences sont montrées (`ecrire.py`). Sur le site, elles ne
sont pas dans les saisons mais dans l'historique de chaque spectacle (règle 23 : « Résidence », sans réservation, hors
des cartes et des chiffres). Les alertes de tournée ne prennent toujours que des représentations ; montrer une
résidence passée ne prévient personne. 11 essais (`node residences.mjs` : les dix premiers scripts et le douzième, relancé
avant et après le premier et le troisième, qui ont la même règle).

**La sécurité (pas encore lancé).** Le treizième script, `supabase/migrations/20261101_crescite_securite.sql`, s'exécute
après les douze autres (il s'arrête et le dit si le onzième manque) et peut être relancé. Il ferme ce que la revue de
sécurité d'octobre 2026 a trouvé dans la base :
- un compte ne se rattache à une fiche de l'équipe que par une adresse confirmée, lue dans le compte lui-même (plus
  celle que porte le jeton) ;
- ce que le public dépose passe par un débit : 5 alertes par heure et 20 par jour depuis une même connexion, 300 par
  jour en tout ; 3 demandes de devis par heure et 10 par jour, 100 par jour en tout (au-delà, la base répond 429 et le
  site le dit, avec l'adresse où écrire). La connexion n'est gardée que sous la forme d'une empreinte salée de l'adresse
  IP, deux jours ; l'administration et les imports ne sont pas comptés ;
- le public n'écrit que les champs de ses formulaires (ni l'identifiant, ni la date, ni le suivi, ni le jeton), et une
  demande de devis a des longueurs bornées partout ;
- un abonnement aux notifications ne va qu'aux services connus (Google, Mozilla, Apple, Microsoft), en https ;
- le public ne lit des lieux que ceux d'une date qu'il voit, sans leur adresse postale, et des fiches de l'équipe que ce
  que le site montre (ni les biographies, ni la source des photos) ;
- les renforts des alertes de tournée (communes sans lien, positions au kilomètre, 50 adresses par jour en tout).
Les scripts 1, 2, 7 et 11 portent les mêmes droits et les mêmes fonctions : relancés, ils ne rouvrent rien. Les
lectures du site (`donnees.js`) et le temps réel n'en changent pas. 35 essais (`node securite.mjs` : les douze scripts,
le treizième deux fois, puis les scripts 1, 2, 3, 7, 11 et 12 relancés après lui).

Les portraits qui attendent l'accord de publication ne sont plus dans le stockage public : l'administration les range
dans le stockage privé de l'équipe (`crescite-equipe`, `portraits/…`) et les change de stockage quand l'accord change ;
un portrait remplacé ou retiré est effacé.

**Les notes internes (pas encore lancé).** Le quinzième script, `supabase/migrations/20261103_crescite_notes.sql`,
crée `crescite_notes` (le fil de notes de chaque fiche de l'administration : texte, personnes mentionnées, pièce jointe,
épinglée, auteur ; réservées aux administrateurs, journalisées) et prévient les personnes mentionnées dans leur espace
(une notification « message », avec le lien de la date quand la note porte sur une date). Sans lui, le bloc « Notes
internes » des fiches le dit et rien d'autre ne change.

**L'équipe modifie (pas encore lancé).** Le quatorzième script, `supabase/migrations/20261102_crescite_equipe_modifie.sql`,
s'exécute après les treize autres (il s'arrête et le dit si le treizième manque) et peut être relancé ; aucune fonction
n'est à redéployer. Dans l'espace de l'équipe, le geste « Modifier » d'une date à venir (au jour de Paris) permet à son
équipe (la distribution « en tournée », corrigée par l'équipe de la date) d'en changer l'heure et la fin des séances, la
précision de chaque séance (« complet », « hors les murs… ») et les précisions de la date qui n'ont pas de lien ; une
précision qui porte un lien (la billetterie, un plan) reste telle quelle, son texte avec son lien. Sur la page d'un
spectacle, son équipe actuelle (sa distribution, ou l'équipe d'une de ses dates à venir : pas quelqu'un venu une fois il
y a deux ans) ajoute, renomme, range, remplace et supprime les fichiers de travail. Le reste demeure à l'administration,
et la base le refuse : le jour, le public, l'annulation et la billetterie d'une séance ; le statut, la visibilité, la
nature, le lieu, la ligne d'agenda et les liens d'une date ; le suivi (contacts, contrat, montants), les chiffres,
l'équipe d'une date, les feuilles de route ; les documents publics, ceux des salles, de l'administration et de toute la
compagnie. Les textes de l'équipe sont du texte simple (ni lien, ni balise, ni caractère invisible qui cache ou retourne
le texte). Chaque modification prévient une fois l'équipe concernée qui a un compte et les administrateurs qui ont une
fiche, jamais son auteur, et dit qui l'a faite (« Lauren Toulin a changé l'horaire du 19 novembre à Eu »,
« 20 h → 20 h 30 · Bérénice ») : dans l'application, avec son portrait, et sur les téléphones abonnés. Les déclencheurs
« Horaires modifiés » et « Nouveau document » du troisième script se taisent pendant ce geste (le troisième script porte
la même règle : relancé, il ne la défait pas) ; ils parlent comme avant quand l'administration modifie. Chaque changement
va au journal avec son auteur : l'administration y lit son nom (« Lauren Toulin (équipe) ») et peut revenir en arrière.
Un fichier part au chemin que la base prépare (`<spectacle>/<repère>-<nom>.<ext>`, une heure) : le stockage
`crescite-equipe` n'accepte de l'équipe que cet envoi, à ce chemin ; elle n'y relit ni n'y efface rien. Un fichier
remplacé ou supprimé par l'équipe reste donc dans le stockage : le document rétabli depuis le journal le retrouve. Un
fichier envoyé mais jamais inscrit (un envoi interrompu) y reste aussi, sans que personne de l'équipe puisse le relire ;
ces restes sont bornés par la limite de vingt fichiers par heure et par compte, et l'administration les efface dans
Storage (`crescite-equipe`) si besoin. Vingt modifications par heure et par compte (`crescite_modifications` garde
chaque modification : son auteur la relit, l'administration toutes). Tant que le script n'est pas lancé, ces gestes ne se
montrent pas. Un compte qui administre modifie une date par ses propres feuilles, d'un appui long (« Modifier depuis
le téléphone ») : le « Modifier » de l'équipe ne s'y montre pas, une seule voie ; pour les fichiers d'un spectacle, ses
boutons « Ajouter un fichier » et « Modifier » ouvrent, pour ce compte, les feuilles de l'administration (titre, type,
pour qui, remplacer le fichier, supprimer ; un document public, un lien, un document de la compagnie), et les boîtes de
l'équipe pour les autres. Une boîte ouverte, les gestes de la page (← →, le balayage) dorment. 168 essais (`node modifier.mjs` : les treize scripts, le quatorzième deux fois, puis les scripts 1,
2, 3 et 13 relancés après lui, et le quatorzième relancé sur une base où sa première version était passée).

**La base de la compagnie appelle ses propres fonctions (pas encore lancé).** Le dix-septième script,
`supabase/migrations/20261105_crescite_projet_compagnie.sql`, se lance dans le projet de la compagnie
(`fwjgyfzcbcmfyfkhhtuh`) seulement, et peut être relancé. Recopiée le 26 octobre 2026 depuis l'ancien projet
(`omekkqjinvppadsoinvj`, celui d'adrienvada.fr), la base appelait encore les fonctions de celui-ci, qui lisent l'ancienne
base : leur adresse est écrite dans quatre fonctions (`crescite_notif_envoyer`, `crescite_propositions_prevenir`,
`crescite_renvoyer_courriel`, `crescite_alertes_demander`) et deux tâches planifiées (`crescite-agendas`,
`crescite-alertes`). Le script les réécrit à l'identique, l'adresse remplacée (mêmes droits, mêmes noms, mêmes horaires),
puis dit ce qui reste. Les scripts 3, 5 et 11 portent déjà la nouvelle adresse : une base neuve n'en a pas besoin.
9 essais (`node projet.mjs` : les quinze scripts tels que recopiés, puis lui, deux fois).

**Les textes du site d'aujourd'hui (pas encore lancé).** Le dix-huitième script,
`supabase/migrations/20261106_crescite_textes.sql`, se lance dans le projet de la compagnie et peut être relancé. Il
remplace les mentions légales et la politique de confidentialité de l'ancien WordPress (l'hébergeur « WP serveur »,
Google Analytics, Gravatar, les commentaires) par celles de `data/textes-legaux.json`, mot pour mot, et récrit les
phrases du « Théâtre des Crescite » (`NOMS`) dans les présentations des spectacles et le dossier de Bérénice. L'ancien
texte reste au journal. Il harmonise aussi les textes courts (`RETOUCHES` : « Écrire à la compagnie » partout,
« Envoyer », l'apostrophe typographique, « conventionnée par la Ville de Rouen », les cartes de l'espace pro nommées par
leur public) et donne au pied le lien de la page Facebook de la compagnie (`FACEBOOK`, celui de sa fiche à l'ODIA
Normandie). Tant qu'il n'est pas lancé, le site montre les textes de la base, donc les anciens. 15 essais
(`node textes.mjs` : le premier script, les textes de l'import, puis lui, deux fois).

**Les documents générés à l'abri (pas encore lancé, urgent).** Le dix-neuvième script,
`supabase/migrations/20261107_crescite_documents_generes.sql`, se lance dans le projet de la compagnie et peut être
relancé. Les devis, contrats, factures et fiches techniques étaient gardés dans `crescite_textes`, que le site public lit
en entier : ils vont dans `crescite_documents_generes`, que seule l'administration lit, et la base les numérote
(`crescite_emettre_document`). Les clés `modele:…` et `modele-date:…` des textes ne sont plus publiques (même règle dans le
script de base, qu'une relance ne rouvre donc pas). Tant qu'il n'est pas lancé, l'administration n'émet aucun document.
19 essais (`node documents_generes.mjs` : tous les scripts, un devis gardé à l'ancienne, puis lui, deux fois).

**Les correctifs de l'audit (pas encore lancé).** Le vingtième script, `supabase/migrations/20261108_crescite_correctifs.sql`,
se lance dans le projet de la compagnie et peut être relancé ; il ne change aucune table. Un « Prévenir l'équipe » ne
remplace plus le précédent (chacun part sur les téléphones) ; deux propositions de dates, ou les réponses de deux
personnes, ne se fondent plus ; une feuille republiée pour une date passée se tait, retirée elle le dit ; l'absent posé à
la création d'une date n'apprend pas qu'il « ne part plus » ; une date déplacée prévient ; on ne répond plus à une
proposition close ni pour un jour passé ; pistes, demandes de devis, frais, matériel, invitations pro et propositions vont
au journal ; les notes internes se datent. 17 essais (`node correctifs.mjs`). La fonction `crescite-agenda` est à
redéployer : elle ignore désormais, à la relecture d'un agenda relié, les dates de la compagnie qu'on y a importées (sans
quoi chacune était en conflit avec elle-même).

**Écrire dans la base.** `python3 supabase/ecrire.py` est le seul outil par lequel Claude modifie la base quand on le lui
demande : les tables `crescite_` et les stockages de la compagnie seulement (les tables d'adrienvada.fr restent hors
d'atteinte), jamais sans filtre, avec un mode `--essai`. `effacer <stockage> <chemin>` efface un fichier d'un stockage de la compagnie. `lot <fichier.json>` applique une liste d'opérations dans l'ordre et s'arrête à la première erreur ;
une ligne ajoutée se reprend dans les suivantes par « @nom.id ». La règle qui l'y autorise est dans `.claude/settings.json`.
Les scripts SQL et le déploiement des fonctions restent à faire dans Supabase.
