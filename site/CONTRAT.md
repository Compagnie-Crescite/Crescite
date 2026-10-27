# Contrat « les saisons, un univers par spectacle » (v4 : la règle 21 remplace la navigation par trois entrées)

> Les règles du site. Ce contrat a été écrit pour les dix maquettes (m01 à m10) et la synthèse, au temps où l'on en
> comparait plusieurs ; il n'en reste qu'un site (`site/src/index.html`, octobre 2026), et les maquettes ont été retirées.
> Là où il dit « la maquette », « chaque maquette » ou « la synthèse », lire « le site » ; ce qui ne valait que pour les
> autres maquettes (« ne touche qu'à maquettes/src/mNN.html », la planche, les comparaisons) ne vaut plus.

Le client (Adrien, qui reprend l'informatique de la compagnie Crescite) demande, pour TOUTES les propositions :
1. « En t'inspirant de ce dossier [le dossier scolaire Bérénice 2026 de la compagnie] et des pages de mon site
   adrienvada.fr, crée des univers par spectacles, adaptés à une communication de compagnie. »
2. « Supprime l'espace professionnel avec mot de passe. »
3. « Enrichis chaque spectacle de son type d'action culturelle. »
4. « Repense la navigation pour qu'elle respecte vraiment les trois entrées : je viens voir un spectacle, je souhaite
   programmer, je représente un établissement scolaire. »
Restent valables : le texte vient des sources et de rien d'autre, la carte des tournées dans l'univers de la maquette,
l'ouverture sur le logo (INTRO), la pieuvre ne compte pas les spectacles, Cassandres création 2027.

Tu gardes l'univers, le concept et la qualité visuelle de ta maquette (son accueil, sa carte, son ouverture, son
caractère) ; tu en changes la navigation, tu ajoutes les pages des trois entrées et tu refais les pages des spectacles.

## Les données D (v3) : ce qui change
Lance `python3 site/build.py mNN` puis lis `site/dist/data.json` pour les valeurs réelles.
- `D.site.entrees` (NOUVEAU, remplace `portes`) : `[{cle, texte, court, href, couleur, couleurVive}]`
  - voir : « Je viens voir un spectacle » (court « Voir un spectacle ») → `#/voir`
  - programmer : « Je souhaite programmer » (court « Programmer ») → `#/programmer`
  - etablissement : « Je représente un établissement scolaire » (court « Établissement scolaire ») → `#/etablissement`
- `D.site.menu` : le menu second, `[{id, texte, href}]` : Spectacles `#/spectacles`, La compagnie `#/compagnie`, Contact `#/contact`.
- `D.site.redirections` : `{'#/agenda': '#/voir', '#/espace-pro': '#/programmer', '#/actions-culturelles': '#/etablissement'}`.
- SUPPRIMÉS : `D.site.portes`, `D.site.pro` (l'espace pro à mot de passe), les onglets Agenda, Actions culturelles, Espace Pro.
- `D.site.actions` (inchangé : `{titre: 'Actions culturelles', blocs: [HTML], credit}`) se lit désormais dans « Je représente
  un établissement scolaire » ; ses photos : `D.photos['actions-culturelles']` et `D.photos['actions-culturelles/g-1']` à `g-4`.
- `D.site.ecole` (NOUVEAU) : `{texte, source}` : la position de la compagnie sur les publics scolaires (« Aussi, Les Crescite
  ont toujours porté une attention particulière aux publics jeunes… »), à mettre en tête de « Je représente un établissement scolaire ».
- `D.site.compagnie` : `dates` va jusqu'à « 2027 Cassandre(s) » ; NOUVEAU `directeur` `{titre: 'Angelo Jossec, directeur artistique', chapeau, paragraphes: [HTML]}`.
- `D.site.libelles` (étendus ; ce sont les SEULS libellés d'interface écrits pour les maquettes) : enTournee, decouvrir,
  actuellementEnTournee, menu, rechercher, spectacles, saison, saisonsPrecedentes (« Saisons précédentes »), toutPublic,
  scolaire, enEtablissement (« En établissement scolaire »), lieu `{etablissement: 'Dans l’établissement', salle: 'En salle'}`,
  actionCulturelle (« Action culturelle »), aCompleter (« À compléter par la compagnie »), dispositifs, public, ateliers,
  duree, jauge, format, distribution, representations, lieuxDiffusion (« Lieux de diffusion »), ficheTechnique,
  conditionsAccueil, bandeAnnonce, ecrire (« Écrire à la compagnie », lien vers `#/contact`), leSpectacle, lesSpectacles,
  ouverture, dates, photos, dossierScolaire (« Dossier scolaire »).
- `D.shows[]` (8, même ordre) : tout l'ancien, plus :
  - `univers` : `{nom, source, clair, motif, couleurs: {fond, fond2, texte, texte2, accent, accent2, scene, lueur},
    polices: {titre, titreGraisse, texte, etiquette}}`. `palette`, `couleur`, `clair`, `motif` en découlent (Bérénice est
    désormais crème et rouge, à la charte du dossier ; Cléophène, L'imaginaire forcé, Cassandres : les couleurs d'adrienvada.fr).
  - `lieuTemps` (« Rome, an 79. », « Royaume de Pyrie, 124 av. J-C. », « 2077 » ; null ailleurs), `accroche` (une phrase,
    tirée des sources), `affirmations` `[{texte, source}]`, `citations` `[{vers: [lignes], source, prose?}]` (un vers par
    ligne ; `prose` : une réplique, pas un vers), `video` `{titre, url, source}` ou null (en LIEN seulement, jamais d'iframe),
    `photos` `[{id, cle, legende|null, source, etablissement?, atelier?}]` → l'image est `D.photos[cle]`, `creditPhotos`,
    `creditDossier` (Bérénice : « Crédit photos : Olivier Héron », pour les photos de source « dossier »).
  - `actionCulturelle` : `{type|null, public|null, lieu: 'etablissement'|'salle'|null, statut?, textes: [{texte: HTML, source}],
    formule?: [lignes], dispositifs: [HTML], dossier?: true, aCompleter?: true}`. Le TYPE d'action culturelle de chaque spectacle :
    Bérénice « Spectacle in situ » (À partir de la seconde, formule « 6 classes : 2 représentations / 6 ateliers de 1h (1/cl) »,
    dossier scolaire complet) ; L'imaginaire forcé « Forme hybride » ; Mon Royaume « Spectacle tout-terrain » ; Ci-gisait
    Cyrano « Jumelage – résidence d’artistes » ; La Folle Idée « Ateliers » ; Cléophène « Ateliers parcours du spectateur » ;
    Cassandres « Lieux d’enseignement agronomique » (statut « En création ») ; Macbeth : `aCompleter` (rien dans les sources :
    affiche le libellé `D.site.libelles.aCompleter`, n'invente rien).
  - `programmer` : `{format|null, duree|null, jauge?, equipe?, representations|null (« 779 représentations au 31 juillet 2026 »),
    lieux|null (la liste des lieux de diffusion, longue : repliable), ficheTechnique?: true (Bérénice), actualite?
    (L'imaginaire forcé), equipeCreation? (Cassandres)}`.
  - `dossier` : 'berenice' ou null → `D.dossiers.berenice`.
  - Bérénice : `duree` vaut désormais « durée : 1h25 » (dossier 2026).
- `D.dossiers.berenice` (NOUVEAU) : le dossier scolaire, sans prix ni contact : `titre, auteur, creation, type, duree, format,
  public, cession.formule, fiche, production, partenaires, pourquoi {titre, sections [{titre, texte}]}, programmes {titre,
  niveaux [{niveau, lignes [{matiere, intitule, objectif}]}]} (un tableau), synopsis {titre, chapeau, paragraphes},
  adaptation, espace, alexandrin {titre, paragraphes}, consignes {titre, note, intro, demandes [], apres, axes [], atelier},
  ateliers {titre, liste [{titre (HTML), paragraphes [], etapes? [{titre, texte}], points? []}]}, accueil {titre, fiche, blocs
  [{titre|null, lignes [HTML]}], alerte, photos}`.
- `D.dates[]` : NOUVEAU `scolaire` (true : représentation réservée à un établissement). 10 des 31 dates à venir.
- `CARTE` : NOUVEAU `CARTE.aVenir('public')` (sans les scolaires), `CARTE.aVenir('scolaire')`, `CARTE.tout()` (toutes les
  communes de toutes les saisons, pour « Je souhaite programmer »). Voir l'en-tête de `site/src/carte.js`.
- `D.photos[clé]` : en ligne, c'est une ADRESSE (`photos/berenice/av-2.webp`), en local une data URL : ne l'utilise que
  comme `src` ou dans `url("…")`, jamais en la découpant.

## Règle 1 : le texte vient des sources, et de rien d'autre
- Tout texte visible vient de D tel quel (mêmes mots, même ponctuation ; capitales par CSS permises ; HTML inséré tel
  quel). Tu peux choisir quoi montrer, ne garder que des phrases entières, découper une ligne de date pour la composer.
- Libellés permis, et seulement eux : les trois entrées (`texte` et `court`), le menu second, les valeurs de
  `D.site.libelles` (y compris `lieu.etablissement` et `lieu.salle`), « Accueil », les titres et libellés de saison
  (`D.site.saisons`), des intertitres de mois formés des mots des lignes, les noms de communes « Ville (dep) » et
  « Rouen » sur les cartes, les titres des spectacles, les crédits photo, les libellés de `D.site.contact`, « nous écrire »,
  « Facebook », « Mentions légales », « Politique de confidentialité ». Des flèches ou icônes sans texte sont permises.
- N'affiche jamais les clés de source (« drac », « adrienvada », « dossier », « site »), ni prix, téléphone ou adresse
  électronique (il n'y en a aucun dans D, n'en ajoute pas).
- À retirer : l'espace pro (formulaire, « Mot de passe protégé », « Espace Pro »), les anciens libellés de portes
  (« Je viens voir », « Je programme », « Je fais venir dans mon établissement »), les onglets Agenda et Actions culturelles,
  toute phrase inventée. Aria-label, alt et title : courts, descriptifs, tirés de D si possible.

## Règle 2 : la navigation, par les trois entrées
- **Les trois entrées sont la navigation première** : dans l'en-tête de chaque page, bien visibles, avant tout le reste,
  en vrais liens `<a href="#/voir">` etc. Le menu second (Spectacles, La compagnie, Contact) est visiblement subordonné
  (plus petit, à part). Sur ordinateur, `texte` en entier si la place le permet, sinon `court`. Sur téléphone, les trois
  entrées restent à portée sans ouvrir de menu (par exemple une barre fixe en bas d'écran avec `court`) ; le bouton
  « Menu » (libellé de D) ouvre le menu second, qui se referme après un clic.
- L'entrée courante porte `aria-current="page"` (une seule marque par vue, en-tête et barres comprises : ne marque pas deux
  fois la même entrée sur ordinateur) et un état net. Spectacles, La compagnie, Contact : leur lien du menu second.
- Sur une page de spectacle et une saison passée : l'entrée dans laquelle on lit est mise en évidence dans l'en-tête
  (état visuel, `aria-current="true"`), sans marque `aria-current="page"` dans l'en-tête.
- **Mémoire de l'entrée** : la dernière entrée choisie (page d'entrée visitée ou onglet d'entrée d'un spectacle) est
  retenue (`sessionStorage`, dans un try/catch) et sert de défaut : `#/spectacle/<slug>` sans entrée remplace l'adresse
  par `#/spectacle/<slug>/<entrée retenue ou voir>` (`location.replace`). Aucune phrase n'annonce cette mémoire.
- Redirections : `D.site.redirections` (`location.replace`). Une adresse inconnue montre « Page introuvable » (les liens du menu, l'accueil, Contact), l'adresse tapée gardée.
- `document.title` : « <h1 ou libellé> - crescite », un titre par vue : « Je viens voir un spectacle - crescite »,
  « Bérénice - crescite » (onglet voir), « Bérénice - Programmer - crescite », « Bérénice - Établissement scolaire - crescite »,
  « Saison 2019-2020 - crescite »… Focus sur le h1 à chaque vue (tabindex="-1", sans contour) ; la vue remonte en haut.

## Règle 3 : les vues
- **Accueil `#/`** : l'ouverture (règle 6), puis ton concept d'accueil, dont le cœur devient le CHOIX entre les trois
  entrées (grandes, libellé `texte` seul, chacune peut porter une image ou une couleur, sans description inventée). Puis,
  dans l'ordre que tu veux : les spectacles dans leurs univers, la carte, les remerciements aux donateurs (discrets).
- **`#/voir` « Je viens voir un spectacle »** (h1 = `texte`) : la saison (`D.site.saisons[0].titre`) et ses dates TOUT
  PUBLIC (`D.dates` où `!scolaire` : ligne, details, lien sur le détail s'il existe) ; la carte `CARTE.aVenir('public')`
  reliée à la liste (survol ou choix d'une commune met ses dates en avant) ; les spectacles en tournée dans leur univers
  (photo, `lieuTemps`, `accroche`), vers leur page ; « Saisons précédentes » : `D.site.saisons[1…]` → `#/agenda/<saison>`.
  Aucune date scolaire ici.
- **`#/programmer` « Je souhaite programmer »** (h1) : le catalogue, une fiche par spectacle dans son univers (au moins
  ses couleurs et sa police de titre) : titre, `creation`, `programmer.representations`, `duree`, `programmer.format`/`jauge`
  s'ils existent, `fiche` et `avec`, `video` (lien « Bande-annonce »), « Lieux de diffusion » repliables
  (`<details>`), lien vers `#/spectacle/<slug>/programmer`. Cassandres : « En création », `programmer.equipeCreation`.
  La carte `CARTE.tout()` (tous les lieux qui ont accueilli la compagnie), `D.site.partenaires`, et « Écrire à la
  compagnie » → `#/contact`.
- **`#/etablissement` « Je représente un établissement scolaire »** (h1) : `D.site.ecole.texte` en tête ; les spectacles
  groupés par `actionCulturelle.lieu` (« Dans l’établissement », « En salle », puis Macbeth avec « À compléter par la
  compagnie ») avec pour chacun : titre, `actionCulturelle.type` bien visible (c'est la demande 3), `public`, `statut`, un
  texte, `formule`, `dispositifs`, lien vers `#/spectacle/<slug>/etablissement` ; « Dossier scolaire » → Bérénice. Puis la
  page d'origine des actions culturelles (`D.site.actions` : titre, blocs, photo(s), crédit), les prochaines dates
  scolaires (`D.dates` où `scolaire`, sous `libelles.enEtablissement` ou `libelles.scolaire`), et « Écrire à la compagnie ».
- **`#/spectacles`** : les 8 spectacles, chacun dans son univers (palette, police de titre, photo), vers sa page.
- **`#/spectacle/<slug>/<voir|programmer|etablissement>`** : la page du spectacle, dans son univers (règle 8). Un en-tête
  d'univers commun aux trois onglets (titre h1 dans la police du spectacle, `sousTitre`, `creation`, `lieuTemps`,
  `accroche`, grande photo), puis une barre des trois entrées (liens vers les trois adresses, l'onglet courant marqué),
  puis :
  - voir : `affirmations`, `texte`, `photos` (légendes et crédit), `citations` (un vers par ligne), lien `video`, « Actuellement
    en tournée » avec ses dates tout public et la carte `CARTE.spectacle(slug)`, la fiche (`fiche`, `avec`, `production`, `mentions`).
  - programmer : `programmer.*`, `duree`, `fiche`, `avec`, `production`, `mentions`, `video`, lieux de diffusion, la carte
    des tournées passées et à venir ; Bérénice : la fiche technique (`D.dossiers.berenice.accueil` : blocs, alerte) et la
    photo `d-implantation-1` ; « Écrire à la compagnie ».
  - etablissement : `actionCulturelle` en entier (type en grand, public, lieu, statut, textes, formule, dispositifs), ses dates
    scolaires à venir ; Bérénice : le dossier scolaire (pourquoi, programmes en tableau, consignes, les quatre ateliers avec
    les photos `atelier`, `d-implantation-1`) ; Macbeth : « À compléter par la compagnie » ; « Écrire à la compagnie ».
  - Sans date à venir (La Folle Idée, Macbeth) : pas de « Actuellement en tournée », la carte des tournées passées.
    Cassandres : genre, cadre, extraits (`citations`), « Spectacle en création », « Les dates de tournée seront annoncées ici. ».
- `#/agenda/<saison>` : comme avant (h1 titre de saison, la saison par spectacle, sa carte `CARTE.saison(s)`).
- **`#/compagnie`** : h1 « Présentation de la compagnie », paragraphes, « En quelques dates » (jusqu'à 2027), le portrait
  `directeur` (titre, chapeau, paragraphes), `D.site.partenaires`.
- `#/contact`, `#/mentions-legales`, `#/politique-de-confidentialite`, pied de page : comme avant (coordonnées, « nous
  écrire », « Facebook » en texte, partenaires, liens légaux).

## Règle 4 : la carte des tournées, dans l'univers de ta maquette
Comme avant (`CARTE.svg` ou ses formes ; née de ta maquette). Au moins : l'accueil (la plus forte), « Je viens voir un
spectacle » (`aVenir('public')`), « Je souhaite programmer » (`tout()`), les saisons passées, la page de chaque spectacle.

## Règle 5 : la pieuvre n'est pas un compte de spectacles (inchangée)
## Règle 6 : l'ouverture sur le logo (inchangée) : `INTRO.ouvrir({...})` habillé dans ton univers, sur l'accueil seulement.

## Règle 7 : commun
Clarté, accessibilité (contrastes AA, focus visible, tableaux en vrai `<table>`), prefers-reduced-motion, 360 à 1600 px sans
débordement, aucune requête hors Google Fonts (pas d'iframe). Polices : celles de ta maquette, plus, sur les pages et
fiches de spectacles, la police de titre de chaque univers (`univers.polices.titre`, toutes sur Google Fonts : charge-les
dans un seul `<link>` avec `display=swap`, une ou deux graisses chacune).

## Règle 8 : un univers par spectacle, pour une communication de compagnie
- Inspirations : le dossier scolaire de Bérénice (la charte de la compagnie : crème `#fbefe9`, rouge `#cf3723`, bordeaux
  `#631705`, saumon `#dc6d5e`, titres Ubuntu gras, texte Open Sans, étiquettes Raleway en capitales espacées, grands
  aplats, encadrés, tableaux nets) et les pages spectacles d'adrienvada.fr (titre qui se révèle lettre à lettre, synopsis
  écrit mot à mot, chapitres « Ouverture / Le spectacle / Bande-annonce / Dates / Distribution » avec un petit sommaire
  qui suit la lecture, grandes photos légendées en cartons, citations en vers, lueur de la couleur d'accent).
- Communication de COMPAGNIE, pas portfolio d'acteur : jamais de « Rôle · … » ; la compagnie signe (`D.site.nom`), toute
  l'équipe et la distribution sont citées, la production et les partenaires aussi, et chaque page appelle à l'action
  selon l'entrée (dates, programmer, établissement).
- Chaque univers vit dans ta maquette : sa page prend `univers.couleurs` (fond, texte, accent, lueur), sa police de titre,
  et son motif en signature visuelle discrète (arene : le cercle de l'arène ; jumeaux : deux formes jumelles ;
  annotations : notes manuscrites dans la marge ; paperboard : feuille et feutre ; nez : le profil ; horloge : le temps
  du huis clos ; fil : le fil rouge ; chronologie : la frise 1850 → 2077). Les fiches des spectacles ailleurs (Spectacles,
  Programmer, Établissement, accueil) en reprennent au moins la couleur et la police de titre.
- Les contrastes restent AA sur chaque fond d'univers (utilise `texte`/`texte2` sur `fond`/`fond2`, `accent2` pour du texte
  vif sur fond sombre ; sur Bérénice, texte bordeaux sur crème, rouge pour les titres et aplats).

## Règle 9 : prête pour la base de données (temps réel)
La base de données de la compagnie arrive ensuite : chaque enregistrement dans l'administration changera le site en
temps réel. Un nouvel outil commun, `DONNEES` (en-tête de `site/src/donnees.js`, injecté comme CARTE), remplace D
en place puis prévient la maquette. Donc : le rendu de chaque vue relit D à chaque fois (aucune copie figée au
chargement : pas de `const shows = D.shows.map(...)` gardé au niveau global pour l'affichage), et ta maquette appelle
`DONNEES.surChangement(() => …)` pour refaire la vue courante en place : sans remonter en haut, sans voler le focus,
sans rejouer l'ouverture ni les animations d'entrée.

## Règle 10 : l'agenda complet, facile à explorer (demande du client)
« Dans chaque maquette, l'agenda doit contenir également toutes les dates passées (pour l'instant, seulement celles
qu'on a). Tout doit être facile à explorer, avec les prochaines dates tout en haut, et ensuite les dates passées dans
l'ordre inverse chronologique (la plus récente en haut). Les saisons terminées doivent être fermées. J'aime beaucoup
ce qui a été fait dans la maquette 3 pour ça, avec une carte pour prévisualiser chaque saison. Il faudrait que la page
soit encore plus pratique. »
- Où : dans « Je viens voir un spectacle » (`#/voir`). D'abord les prochaines dates tout public (comme aujourd'hui),
  puis l'agenda passé : la saison en cours (ses dates déjà jouées), puis 2025-2026, 2024-2025… jusqu'à 2016-2017.
  Les dates passées viennent de `D.saisons` (toutes les lignes publiées) : passée = `fin` (ou `iso`) avant `D.aujourdhui`.
- Chaque saison : un en-tête (titre « Saison 2019-2020 », une petite carte de la saison `CARTE.saison(s)` qui la
  prévisualise, dans le style de ta maquette) et ses dates de la plus récente à la plus ancienne, avec le titre du
  spectacle (lien vers sa page s'il en a une), la ligne, les précisions, « date annulée », et `libelles.scolaire` pour
  une date scolaire. Les saisons terminées sont FERMÉES au départ (`<details>`, ou bouton `aria-expanded`) : on les
  ouvre d'un geste, et leur contenu ne se dessine qu'à l'ouverture. La saison en cours reste ouverte.
- Plus pratique : un index des saisons pour sauter de l'une à l'autre, le filtre par spectacle (titres) et la
  recherche par commune (placeholder `libelles.rechercher`) qui portent sur tout l'agenda (à venir et passé, en
  ouvrant les saisons qui ont des résultats), « tout ouvrir / tout fermer » si tu veux (icône ou libellé de D), le
  survol d'une date qui allume sa commune sur la carte de sa saison (`CARTE.lier`). Un chiffre seul (nombre de dates
  d'une saison) est permis, sans mot inventé autour.
- `#/agenda/<saison>` reste la page d'une saison (h1 = son titre). La règle 9 vaut : un changement de D refait
  l'agenda en place en gardant les saisons ouvertes, les filtres et la position.
- Le vérificateur contrôle sur `#/voir` : une date à venir et le titre « Saison 2019-2020 » se lisent, les prochaines
  dates précèdent l'agenda passé, et les dates d'une saison terminée (2023-2024) ne se lisent pas tant qu'elle est fermée.

## Règle 11 : administrer la base depuis la maquette, dans son style (édition sur place)
Le client : « une interface en no code, un peu comme WordPress, où elle peut modifier les paragraphes directement ; la
page d'administration doit ressembler à la page agenda, avec la possibilité d'ajouter des dates et de modifier des
dates passées ; chaque maquette permet, dans son style, d'administrer la base de données. »
L'outil commun `EDITION` (en-tête de `site/src/edition.js`, injecté par build.py) fait tout le travail : connexion,
mode édition, barre, panneau de date, enregistrement dans la base, temps réel. Ta maquette fournit :
- un lien ou bouton « Modifier le site » (`D.site.libelles.modifierSite`) qui appelle `EDITION.ouvrir()`, dans le pied
  de page de chaque vue (discret, mais visible) ;
- `data-edit="<chemin dans D>"` sur chaque texte affiché qui vient de D, le contenu de l'élément étant exactement la
  valeur de D (en mode édition, l'outil y remet la valeur brute : un titre découpé en lettres pour une animation
  redevient du texte simple) : au moins les textes des spectacles (`shows.<slug>.accroche`, `.lieuTemps`, `.texte.<i>`,
  `.affirmations.<i>.texte`, `.citations.<i>.source`, `.fiche.<i>.valeur`, `.avec.valeur`, `.production.<i>`,
  `.mentions.<i>`, `.duree`, `.creation`, `.actionCulturelle.type`, `.actionCulturelle.textes.<i>.texte`,
  `.programmer.representations`, `.programmer.lieux`, `.photos.<i>.legende`…), la compagnie (`site.compagnie.titre`,
  `.paragraphes.<i>`, `.dates.<i>.titre`, `.directeur.paragraphes.<i>`), les actions culturelles (`site.actions.blocs.<i>`),
  `site.ecole.texte`, `site.donateurs`, `site.partenaires`, et le dossier scolaire (`dossiers.berenice.…`, y compris
  `dossiers.berenice.ateliers.liste.<i>.paragraphes.<j>`). Les spectacles se désignent par leur slug : `shows.berenice.…`.
  Les libellés d'interface (entrées, menus, `libelles`) ne sont pas annotés ;
- `data-edit-photo="shows.<slug>.photo"` (photo principale) ou `"shows.<slug>.photos.<i>"` sur les photos de spectacle ;
- `data-date-id="<id>"` sur chaque ligne d'agenda (à venir et passées : `D.dates[].id`, et `id` des dates de
  `D.saisons` ; vide en instantané, rempli avec la base) et `data-agenda` sur chaque liste de dates (`data-agenda="<slug>"`
  pour l'agenda d'un spectacle) : en mode édition, cliquer une date l'ouvre dans le panneau (même passée), et
  « ＋ Ajouter une date » apparaît en tête de chaque agenda ;
- les variables CSS `--ed-fond`, `--ed-encre`, `--ed-accent`, `--ed-sur-accent`, `--ed-police`, `--ed-rayon`, `--ed-trait`
  sur `:root`, choisies dans ta palette et tes polices, pour que la barre, la connexion et le panneau de date aient le
  style de ta maquette ; des règles CSS sur `.ed-barre`, `.ed-panneau`, `.ed-bt`… si tu veux aller plus loin.
Ne réécris pas l'outil : branche-toi dessus. Le vérificateur (`EDITION=1 node site/onglets.mjs …`) contrôle le lien
et la présence des annotations ; l'essai réel (connexion, écriture) se fait avec la base.

## Règle 12 : la distribution, avec les portraits (demande du client)
« Cherche des photos de chaque acteur sur internet. Tu peux mettre leurs images dans chaque page de spectacle. »
- Les données : `D.personnes` (slug → `{prenom, nom, metiers, photo, credit}` ; `photo` est une adresse, ou null quand il
  n'y a pas de photo ou que sa publication n'est pas accordée ; `credit` : « © Prénom Nom », ou null) et, pour chaque
  spectacle, `show.equipe` : `[{personne: slug, categorie: 'jeu'|'creation'|'technique'|'production', fonction, role,
  alternance}]`, dans l'ordre de la fiche. Les deux viennent de la base en direct (règle 9) ; relis-les à chaque rendu.
- Où : sur la page de chaque spectacle (onglet voir), à la place de la ligne « avec : … » (`show.avec`) : les comédiens
  (`categorie === 'jeu'`) en portraits, dans le style de ta maquette. Chaque portrait : la photo (alt = le nom), le nom
  (`prenom` + espace + `nom`), l'alternance s'il y en a (« en alternance avec … », tel quel), le rôle s'il y en a, et le
  crédit en petit sous la photo quand il existe. Sans photo : un portrait typographique (initiales, monogramme, filet…)
  dans ton style, jamais une silhouette grise ni le mot « photo ». La fiche (`show.fiche` : mise en scène, lumières,
  régie…) reste telle quelle. Un spectacle sans `equipe` (Cassandres pour l'instant) garde ce qu'il montre aujourd'hui.
- Édition (règle 11) : `data-edit-photo="personnes.<slug>.photo"` sur chaque portrait (avec ou sans photo) : en mode
  édition, un clic permet d'en choisir une, qui est alors montrée sur le site.
- Pas de texte inventé : seulement les noms, alternances, rôles, crédits et intitulés de D (le libellé de la rubrique,
  s'il en faut un, vient de `show.avec.libelle` ou des libellés de D).
- Le vérificateur doit rester sans anomalie (`EDITION=1`), sans débordement à 360 px ; les portraits se chargent
  paresseusement (`loading="lazy"`, dimensions posées pour ne pas faire sauter la page).

## Règle 13 : « Je souhaite programmer », ce qu'il faut à un programmateur (demande du client)
« Upgrade le "je souhaite programmer" pour qu'il soit logique : un contact vers l'administratrice, un dossier artistique,
quelque chose comme ça. UN TRUC LOGIQUE pour les programmateurs et directeurs de salle. La fiche technique etc... »
Un directeur de salle vient chercher trois choses : à qui parler, un dossier à faire circuler, la fiche technique.
- Les données (règle 9 : relis-les à chaque rendu, elles viennent de la base) :
  - `D.site.programmation.contact` = `{nom, role, email, telephone}` (l'administratrice ; `telephone` peut être null) ;
  - `D.documents` = `[{spectacle: slug, type: 'dossier'|'fiche_technique'|'plan'|'texte'|'autre', titre, url, pour:
    'pros'|'scolaires'}]` : les fichiers déposés par l'administration (vide pour l'instant, prévois-le quand même) ;
  - `DOSSIER.telecharger(slug)` (outil commun `dossier.js`) compose et télécharge le dossier PDF du spectacle,
    toujours à jour (couverture, présentation, distribution, conditions d'accueil et fiche technique, diffusion,
    production, contact). Rend une promesse ; quelques centaines de millisecondes ;
  - les libellés `contactDiffusion`, `dossierPdf`, `aTelecharger`, `conditionsFinancieres`, `ficheTechniqueSurDemande`,
    `documentsScolaires`, `objetProgrammation` (et ceux qui existaient : `ficheTechnique`, `conditionsAccueil`…).
- **Le contact diffusion** (`L.contactDiffusion`) : le nom, le rôle, le courriel en lien
  `mailto:<email>?subject=<L.objetProgrammation>` (sur un spectacle : `<L.objetProgrammation> – <titre>`), le téléphone en
  lien `tel:` s'il existe, et `L.conditionsFinancieres` en petit dessous. Annoté : `data-edit="site.programmation.contact.nom"`,
  `.role`, `.email` (sur le texte du courriel), `.telephone` ; un téléphone vide garde son élément vide, invisible hors
  édition (`html:not(.ed-actif)` ou équivalent) pour qu'on puisse en saisir un sur place. C'est l'action principale de
  la page programmer : bien visible dans le premier écran de `#/programmer` (près du titre), dans ton style (bouton,
  carte, bandeau…), et repris, compact, sur l'onglet programmer de chaque spectacle. « Écrire à la compagnie » peut
  rester plus bas.
- **Le dossier du spectacle (PDF)** : un `<button type="button" data-dossier="<slug>">` avec `L.dossierPdf`, qui appelle
  `DOSSIER.telecharger(slug)`. Pendant la composition : `aria-busy="true"`, bouton désactivé, une animation dans ton
  style (les tentacules s'en mêlent volontiers) ; en cas d'échec, l'animation s'arrête et le bouton redevient actif.
  Sur `#/programmer` : un par spectacle (dans sa fiche) ; sur l'onglet programmer : en tête, avec la bande-annonce.
- **La fiche technique** (onglet programmer) : Bérénice comme aujourd'hui (les blocs de `D.dossiers.berenice.accueil`) ; un
  document `type === 'fiche_technique'` du spectacle (pour les pros) en lien ; sinon `L.ficheTechniqueSurDemande` en lien
  `mailto:` vers le contact (objet `<L.ficheTechnique> – <titre>`). Jamais de rubrique vide.
- **À télécharger** (`L.aTelecharger`, onglet programmer, et dans la fiche du spectacle sur `#/programmer` s'il y en a) : le
  dossier PDF et les documents du spectacle `pour === 'pros'`, chacun en lien (`href` = `url`, `target="_blank"`,
  `rel="noopener"`), le titre tel quel.
- **Établissement** : sur l'onglet établissement d'un spectacle, ses documents `pour === 'scolaires'` en liens sous
  `L.documentsScolaires` (à côté du dossier scolaire de Bérénice, inchangé).
- Rien d'inventé, aucun prix (jamais de montant de cession). Le vérificateur attend, sur `#/programmer`, le nom du contact,
  `L.contactDiffusion`, `L.dossierPdf`, `L.conditionsFinancieres`, un lien `mailto:` visible et au moins un
  `[data-dossier]` ; sur l'onglet programmer de Bérénice, `[data-dossier="berenice"]`, dont il essaie le
  téléchargement ; sur chaque onglet programmer, un lien visible vers chacun des documents pros du spectacle ; sur
  celui de Cléophène, le titre de sa fiche technique ; sur celui de Macbeth (sans fiche), `L.ficheTechniqueSurDemande`.
  `D.documents` a maintenant 15 vrais documents (dossiers de diffusion, fiches techniques, dossiers scolaires).

## Règle 14 : un spectacle sans action culturelle (demande du client)
« Supprime pour l'instant l'action culturelle autour de Cassandre. POUR L'INSTANT ELLE n'est pas construite. »
`show.actionCulturelle` vaut maintenant `null` quand un spectacle n'en a pas (Cassandres, pour l'instant : en base elle
est « masquée », elle reviendra). Un tel spectacle :
- n'apparaît pas sur `#/etablissement` (ni dans un groupe, ni comme « À compléter ») ;
- n'a pas d'onglet établissement : la barre des entrées de sa page ne montre que voir et programmer (aucun lien visible
  vers `#/spectacle/<slug>/etablissement`) ;
- son adresse `#/spectacle/<slug>/etablissement` mène à `#/spectacle/<slug>/voir` (remplacement, pas d'historique en plus).
Teste `s.actionCulturelle` avant d'en lire un champ, partout (cartes, compteurs, menus, index, recherche). Ne confonds
pas avec Macbeth : son action existe, à compléter (`aCompleter`), elle reste affichée comme aujourd'hui.

## Règle 15 : le mouvement, au niveau d'exigence suivant, et des frises chronologiques (demande du client)
« Retravaille les animations. À chaque clic la tentacule c'est redondant. Il faut qu'elles aient beaucoup plus de
singularité, que le site soit beaucoup plus réactif, élégant. Fais-le passer au prochain niveau d'exigence. Fais des
frises chronologiques dès qu'il y a des calendriers pour que ce soit plus clair. Fais que ça bouge dynamiquement. »

A. Plus de tentacule à chaque clic. `tentacules.js` ne répond plus aux clics ni aux changements de page par défaut. La
pieuvre et ses tentacules deviennent un MOMENT rare et signifiant : au plus deux moments choisis par maquette (la 06 et
la 10 en font leur thème : la tournée qui pousse sur la carte, l'entrée dans un spectacle ; les autres : aucun, ou la
seule respiration du logo). Retire tout appel générique (toucher, page, ouvrir, onglet… à chaque geste).

B. Une signature de mouvement par maquette : la singularité. Chaque maquette a SON langage, tiré de son concept, et
l'applique avec cohérence à tous les gestes (pas un effet par endroit) :
  1. le changement de page : une transition propre (View Transitions par MOUVEMENT.transition, éléments partagés : la
     carte d'un spectacle cliquée devient l'en-tête de sa page, la porte d'une entrée s'ouvre sur sa page…) ;
  2. ouvrir, fermer (une saison, un menu, un panneau) : le contenu se déplie, ses lignes arrivent en cascade ;
  3. filtrer, chercher : les lignes glissent à leur nouvelle place (MOUVEMENT.flip), celles qui partent s'effacent ;
  4. survol et focus : précis, 120 à 200 ms, jamais de tremblement ;
  5. la pression : une réponse visible à l'instant même (pointerdown), dans le style de la maquette ;
  6. l'apparition au défilement : en cascade, une seule fois (MOUVEMENT.reveler), filets qui se tracent, chiffres qui
     comptent (MOUVEMENT.compter) ;
  7. ce qui vit : le compte à rebours de la prochaine date, « EN TOURNÉE » qui respire, le repère « aujourd'hui ».
  Les langages (à tenir, en allant beaucoup plus loin que ces mots) :
  - 01 Le programme de salle : l'imprimerie. L'encre qui se pose, le filet tiré à la règle, la page qu'on tourne, le
    tampon ; rien de numérique, tout est papier.
  - 02 La maison : la clarté d'un théâtre public. Précis, institutionnel, calme : l'indicateur d'onglet qui glisse, les
    panneaux qui se relaient, des durées courtes, aucune fantaisie.
  - 03 La saison : la grille suisse. Tout s'aligne et se cale sur la grille, les filets se tracent, les chiffres comptent ;
    la frise de la saison est le cœur de la maquette.
  - 04 Trois portes : les battants. Les pages s'ouvrent comme des portes, la lumière passe par l'embrasure, on referme
    derrière soi en revenant.
  - 05 Magenta : l'aplat et la capitale. Des volets de couleur pleine qui balaient l'écran dans la couleur du spectacle,
    la grande typographie qui glisse et se compresse.
  - 06 Les bras de la tournée : la croissance. Les bras poussent de Rouen vers les communes, la frise et la carte
    répondent ensemble ; la tentacule seulement là où elle dit la tournée.
  - 07 Le noir et la lumière : l'éclairage. Noir, puis la lumière monte ; une poursuite suit le regard, les fondus au noir
    séparent les pages ; jamais un mouvement brusque.
  - 08 Le sommaire : l'édition. L'aperçu qui se relaie, le filet qui souligne, la page qui se compose ligne à ligne.
  - 09 Un spectacle par écran : le chapitre. Écran après écran, aimanté, une progression qui avance avec la lecture,
    chaque spectacle prend la place du précédent.
  - 10 La pieuvre vivante : l'organique. Le bras qui se tend vers ce qu'on regarde, l'encre qui recouvre l'écran quand
    on entre dans un spectacle ; vivant, jamais répétitif.
  - Synthèse : le meilleur de la 06 et de la 03, en plus sobre et plus rapide encore.
  Écris en tête du <script> un bloc « Mouvement : … » qui décrit ta signature.

C. Réactif, mesuré (site/reactivite.mjs). Budgets, au bureau et avec le processeur ralenti ×4 :
  - chaque geste (un lien d'entrée, une carte de spectacle, ouvrir une saison, un filtre, taper dans la recherche) se voit
    à l'image suivante, et sa durée d'événement (INP) reste sous 100 ms au bureau, sous 200 ms ralenti ×4 ;
  - un changement de page montre son contenu en moins de 150 ms (bureau) ; une transition dure 450 ms au plus et
    n'empêche jamais un nouveau geste (interruptible) ; aucune tâche de plus de 50 ms pendant un geste ;
  - un changement de page aboutit d'où qu'on parte, même d'une page défilée : une animation liée au défilement
    (animation-timeline) ne garde pas son état final au-delà de sa plage (remplissage backwards, jamais both ni forwards ;
    l'état de base est déjà l'état final, ou ce qui l'a dépassé est hors de l'écran). Sinon Chrome n'arrive plus à capturer
    l'ancienne page pour la transition : l'écran gèle 4 s, puis la transition est abandonnée (TimeoutError) ;
  - les longues listes (l'agenda depuis 2016) se rendent par morceaux (content-visibility, ou le visible d'abord) ;
    content-visibility: auto seulement sur un bloc qu'aucun geste ne déplace tant qu'il est caché (sinon, un billet
    ouvert au-dessus le déplace, et un saut qui le fait reparaître compte ses lignes comme décalées : du CLS) ;
  - aucun décalage de mise en page (CLS < 0,05) : les images ont leurs dimensions.

D. Des frises chronologiques partout où il y a un calendrier (FRISE, l'outil commun frise.js), dans l'univers de ta
maquette, vivantes : elles se tracent quand elles entrent dans l'écran, leurs repères arrivent dans l'ordre du temps, le
repère « aujourd'hui » respire, on les fait défiler au doigt, on y navigue au clavier ; moins d'animations demandé :
immobiles.
  - #/voir : la frise de la saison (septembre à août), toutes ses dates tout public (passées en retrait, à venir aux
    couleurs de leur spectacle) et « aujourd'hui », reliée à la liste (survoler un repère allume sa ligne, et
    inversement ; un clic y mène) et à la carte ; puis, pour l'agenda passé, la frise des saisons (2016 à aujourd'hui) :
    chaque saison et sa densité, un clic ouvre la saison et y mène (elle peut remplacer l'index des saisons) ;
  - #/agenda/<saison> : la frise de cette saison ;
  - la page d'un spectacle (onglet voir) : la frise de sa tournée (toutes ses dates, passées et à venir, et « aujourd'hui ») ;
  - #/etablissement : la frise des dates scolaires à venir ;
  - #/programmer et l'onglet programmer : la diffusion de chaque spectacle au fil des saisons (sa densité par saison) ;
  - #/compagnie : « En quelques dates » devient une frise historique.
  Aucun texte inventé : les libellés de D (dont `libelles.aujourdhui`), les dates écrites comme dans l'agenda (AGENDA).

E. Le vérificateur (onglets.mjs) contrôle la présence des frises, l'absence de tentacule sur un clic ordinaire, qu'aucun
changement de page ne gèle (sur toute la visite, et depuis chaque page de spectacle défilée au tiers de sa hauteur : une
transition dont le rendu attend plus d'une seconde) et les budgets de reactivite.mjs. Rien ne doit régresser : règles 1 à 14, édition sur place, 360 px sans débordement.

## Règle 16 : l'espace pro (demande du client)
« Crée dans les menus un espace pro, qui donne accès à trois types de pages : l'espace personnel comédien, la page
administration, un espace pour le directeur de salle pour leur partager certains fichiers non publics (les captations etc.) »
- Les données : `D.site.espacePro` = `{titre, texte, portes: [{cle: 'equipe'|'salles'|'admin', titre, texte, href}]}`.
  Les href sont relatifs : equipe/, pro/ et admin/ sont publiés à côté des maquettes.
- Le menu second (Spectacles, La compagnie, Contact) et le pied de page gagnent « Espace pro » (`D.site.espacePro.titre`),
  qui mène à `#/espace-pro`. Il reste discret, comme le reste du menu second : ce n'est pas une quatrième entrée.
- `#/espace-pro` (h1 = `titre`) : le texte, puis les trois portes dans le style de ta maquette. Chaque porte a son titre,
  son texte et un vrai `<a href>` vers son href, dans le même onglet. Ordre (demande du client) : programmateurs et
  directeurs de salle, établissements scolaires, équipe (comédiens et techniciens), administration. Les portes suivent
  cet ordre dans `D.site.espacePro.portes` (salles, equipe, admin) ; la synthèse le suit en quatre groupes numérotés (la
  page « programmer » et l'accès des salles côte à côte, puis la page des établissements, l'équipe, l'administration).
  Le mouvement de ta signature (règle 15) s'y applique.
- L'ancienne redirection `#/espace-pro` → `#/programmer` disparaît : `#/espace-pro` est désormais cette page. « Espace pro »
  n'est plus un texte interdit ; « mot de passe » le reste.
- Édition sur place : `data-edit="site.espacePro.titre"`, `.texte`, `.portes.<i>.titre`, `.portes.<i>.texte`.
- Le vérificateur contrôle la vue espace-pro (h1, les trois titres, trois liens vers equipe/, pro/, admin/) et le lien
  « Espace pro » dans le menu.

## Règle 17 : réserver une date, d'un geste (demande du client)
« Fais une retouche pour que ce soit clair, les horaires et les liens de réservation, avec des boutons par date avec
horaires, que ce soit facile de naviguer et sélectionner une date qui nous intéresse, et intuitif, que ça invite à
réserver, avec un effet visuel lié au spectacle qu'on choisit. »
- Les données : chaque date porte ses représentations (`jour`, `heure`, `public`, `annulee`, `lien`) et son `lien` : la page
  du spectacle sur le site du théâtre qui l'accueille, où l'on réserve. Une représentation peut avoir son propre `lien`
  (sa billetterie) : il prime pour cette séance. Une date sans heure dit `libelles.horaireAPreciser` ; une date sans lien
  dit `libelles.reservationAupresDuLieu` suivi du nom du lieu, sans faux bouton. Rien d'inventé : un lien ne s'affiche que
  s'il est dans les données.
- L'outil commun `site/src/reserver.js` (RESERVER) fait le travail (les dates réservables, la bande de dates, la carte
  de réservation, le clavier) ; chaque maquette l'habille dans son style.
- Où :
  - la page d'un spectacle (sa partie « voir ») : ses prochaines dates tout public en une bande de boutons, un bouton par
    date, l'horaire écrit sur le bouton (« ven. 18 déc. · 14h, 20h · Pont-Audemer ») ; la prochaine date est choisie
    d'office ; la carte de la date choisie dessous ;
  - « Je viens voir un spectacle » (`#/voir`) : chaque prochaine date tout public est un bouton qui ouvre sa carte de
    réservation sur place (sans quitter l'agenda), avec le même contenu ;
  - les dates scolaires et passées n'ont pas de bouton « réserver » (elles restent dans l'agenda comme aujourd'hui).
- La carte d'une date : le spectacle, le jour, le lieu et sa commune, chaque séance en bouton avec son heure (le lien de la
  séance s'il existe, sinon celui de la date), et UN bouton principal `libelles.reserver`, le plus visible de la carte, qui
  ouvre la page du théâtre dans un nouvel onglet (`target="_blank" rel="noopener"`) avec `libelles.surLeSiteDuLieu` et le
  nom du lieu. Une séance scolaire dans une date tout public : marquée `libelles.scolaire`, sans lien.
- Facile à naviguer : la bande se parcourt au doigt (défilement aimanté) et au clavier (flèches gauche et droite, Origine,
  Fin ; Entrée choisit), chaque bouton dit s'il est choisi (`aria-pressed`) ; le choix change la carte sur place, sans
  recharger la vue ni perdre la position ; l'adresse peut garder la date choisie (`?date=<id>` ou `#/spectacle/<slug>/voir/<id>`).
- L'effet lié au spectacle : la carte et le bouton choisi prennent l'univers du spectacle (ses couleurs lisibles, sa
  police de titre, sa photo en fond discret), avec une transition qui est la signature de ta maquette (règle 15 B) : un
  billet qu'on imprime (01), un panneau qui se relaie (02), la grille qui se trace (03), une porte qui s'ouvre (04), un
  aplat qui balaie (05), le bras qui pousse jusqu'à la commune sur la carte (06), une poursuite qui s'allume (07), la page
  qui se compose (08), le chapitre qui avance (09), l'encre qui s'ouvre (10). « Moins d'animations » : un fondu bref.
- Inviter à réserver : le bouton principal est le geste évident de la carte (taille, contraste, place), les heures sont
  grandes et lisibles, et rien d'autre ne lui fait concurrence dans la carte.
- Budgets de la règle 15 C : choisir une date répond en moins de 100 ms au bureau et 200 ms au téléphone ralenti ×4.
- Le vérificateur contrôle, sur une page de spectacle qui a des dates à venir et sur `#/voir` : des boutons de date avec
  leur heure, un seul choisi, une carte avec un lien `libelles.reserver` vers une adresse http(s) en nouvel onglet quand la
  date a un lien, et le changement de carte au clavier.

## Règle 18 : les vidéos se lisent dans le site (demande du client)
« Intègre mieux les vidéos dans le site, qu'elles se lisent directement dans le site, avec une option de mettre en plein
écran, et une qui assombrit l'écran. »
- Les données : `video` d'un spectacle ({url, titre}) et ses `medias` de type vidéo (Vimeo, YouTube). Rien d'autre.
- L'outil commun `site/src/lecteur.js` (LECTEUR) : une affiche (la photo du spectacle, prise dans D, jamais une
  image venue de Vimeo ou YouTube), le titre de la vidéo et un bouton de lecture ; au geste, le lecteur se charge sur
  place (YouTube par youtube-nocookie.com, Vimeo avec dnt=1 : rien de tiers n'est chargé avant le geste) et démarre.
- Deux boutons sous la vidéo, avec leurs libellés de D : « plein écran » (l'API Fullscreen sur le cadre du lecteur ; là où
  elle manque, comme sur iPhone, le plein écran du lecteur lui-même suffit et le bouton ne s'affiche pas) et « assombrir »
  (la page s'éteint autour de la vidéo, la vidéo reste lumineuse ; Échap, un geste hors de la vidéo ou « rallumer »
  rallume). Le clavier marche partout ; le focus reste dans la vidéo tant que la page est éteinte.
- Où : partout où une vidéo apparaît aujourd'hui (la page d'un spectacle, ses médias) ; une seule vidéo joue à la fois.
- Le mouvement de ta signature (règle 15) habille l'extinction et l'arrivée de la vidéo ; « moins d'animations » : sans.

## Règle 19 : la nuit, seule, sur le site public (demande du client)
« Supprime le mode jour nuit pour le site public. Ne le laisse que pour les interfaces personnelles, administrateur et
comédien. Ne mets que le thème sombre sur le site. » (octobre 2026 ; elle remplace « un mode jour/nuit partout »)
- Le site public (les maquettes, la synthèse) n'a qu'un thème : la nuit de chaque maquette. Aucun bouton jour/nuit, nulle
  part ; rien à prévoir pour lui dans l'en-tête ou le menu.
- `data-theme="nuit"` est posé sur `<html>` avant le premier dessin (pas d'éclair), quel que soit le réglage de l'appareil
  ou un choix « jour » gardé d'une visite d'avant (la clé `crescite-theme` est effacée). Outil commun
  `site/src/theme.js` (THEME : `actuel()` vaut `'nuit'`, `seul` vaut `true`, `bouton()` ne dessine plus rien).
- Chaque maquette soigne sa nuit, dans son style : une maquette née claire garde son caractère dans le sombre. Les univers
  des spectacles restent lisibles (couleurs sombres de D), les photos et la carte aussi. Contraste AA partout (l'opacité des
  parents d'un texte comprise).
- Les palettes de jour qui restent dans une maquette ne servent plus : on ne les soigne plus, on peut les retirer.
- L'administration, l'espace de l'équipe, l'espace des salles et la page de réponse sont de nuit eux aussi, par défaut,
  quel que soit l'appareil (demande du client, octobre 2026 : « Mettre tout en mode nuit par défaut ») ; leur jour reste
  dans leurs feuilles de style, sous `data-theme="jour"` seulement.

## Règle 20 : la troupe, sur la page de la compagnie (demande du client)
« Ajoute dans la présentation de la compagnie l'ensemble des membres des équipes, avec une vignette seulement s'il y a
une photo, et par catégories de métiers, avec des icônes sympa. Ça doit donner une impression de groupe, hyper évoluée,
avec les dernières technologies d'animation. Entre l'organigramme et la présentation artistique du logo. Sois
imaginatif. Dans le style de chaque maquette. »
- Les données : toutes les personnes publiées de D (leurs métiers, leur photo quand sa publication est accordée), et les
  catégories de métiers de `D.site.troupe` (titre de la section, catégories {cle, titre, metiers}) : le jeu, la mise en
  scène, l'écriture, les décors, costumes et accessoires, la lumière et le son, la production. Une personne paraît dans
  chaque catégorie de ses métiers, avec le métier précis sous son nom ; ses places sont reliées (la survoler ou la choisir
  l'allume partout).
- Une vignette SEULEMENT s'il y a une photo publiée ; sinon le nom seul, sans silhouette ni initiales. Une icône par
  catégorie (l'outil commun en fournit, chaque maquette les habille), « sympa » : vivantes, dessinées, cohérentes.
- La composition : entre un organigramme (les catégories, qui fait quoi, d'un coup d'œil) et une présentation artistique
  du logo (la pieuvre : les catégories comme des bras, ou ce que ta maquette invente dans son univers). Une impression de
  GROUPE, pas une liste.
- Le mouvement : les techniques récentes, bien employées (animations liées au défilement, transitions de vue, @property,
  offset-path, Web Animations), dans ta signature ; « moins d'animations » : composition fixe et lisible. Budgets de la
  règle 15 C ; rien ne déborde à 360 px ; au clavier, chaque personne et chaque catégorie se parcourent.
- Où : sur la page de la compagnie (`#/compagnie`), entre la présentation et les repères. Outil commun
  `site/src/troupe.js` (TROUPE) : les catégories, les places des personnes, les liens entre leurs places, les icônes.
- Édition sur place : `data-edit="site.troupe.titre"` et les titres des catégories.
- La fiche d'une personne (demande du client, octobre 2026 : « Lorsqu'on clique sur une personne dans la troupe, cela doit
  ouvrir par-dessus sa photo une fiche avec ses spectacles, ses prochaines dates si c'est pertinent, etc. ») : la choisir
  ouvre, posée sur sa place, une fiche ([data-troupe-fiche], role="dialog", le focus dedans) : son portrait s'il est publié,
  son nom, ses métiers, ses spectacles (`show.equipe` : fonction, rôle, alternance ; le badge du spectacle), chacun menant à
  sa page, puis les prochaines dates de ces spectacles quand il y en a (`D.dates`), et rien d'autre que D et les libellés
  (`lesSpectacles`, `prochainesDates`, `toutesLesDates`, `fermer`). Relâcher la personne la ferme ; Échap rend le focus à
  sa place. Elle reste dans la troupe et dans l'écran, à 360 px comme au bureau.
- La fiche partout (demande du client, octobre 2026 : « On doit pouvoir accéder à la fiche n'importe où sur le site public,
  dès que les comédiens et techniciens et autres sont mentionnés dans un spectacle par exemple, dans sa distribution
  notamment ») : chaque portrait de la distribution porte un bouton qui l'ouvre (`.u-pt-ouvrir[data-personne]`), et chaque
  nom complet d'une personne publiée écrit dans une page devient un bouton (`.nomme[data-personne]`), au texte inchangé.
  Pas en mode édition (le clic y modifie le texte ou la photo), ni dans les pages légales. La fiche ([data-fiche-personne])
  est dans la couche du dessus, gardée dans l'écran à l'ouverture ; Échap la ferme et rend le focus à ce qui l'a ouverte.

## Règle 21 : la navigation par les saisons (v4, demande du client ; remplace les règles 2 et 3 là où elles diffèrent)
« Le menu, ça doit être les saisons, au pluriel, où tu as la saison en cours, les prochaines dates, évidemment, avec un
mode de sélection, avec une timeline, pas par projet, mais avec des couleurs différentes par projets, une timeline assez
graphique, et toutes les dates. Et aussi les saisons passées sur cette page-là, avec les cartes. Il faut supprimer le
parcours je suis un établissement, je viens voir un spectacle, et le menu devient vraiment les saisons, les spectacles,
la compagnie, l'espace professionnel. Ensuite, on garde par spectacle le fait que je viens voir le spectacle, je veux le
programmer, je représente un établissement scolaire. » Et : « Sur la page des spectacles qui ne sont plus en tournée, tu
ne mets pas le parcours programmer ou établissement scolaire, tu mets juste la présentation du spectacle, le bilan des
dates passées avec une belle carte, et les éventuelles actions culturelles qui ont été menées. »

Partout dans ce contrat, lis désormais `#/saisons` pour `#/voir`, `#/espace-pro/programmer` pour `#/programmer` et
`#/espace-pro/etablissement` pour `#/etablissement` (règles 10, 13, 14, 17…).

**A. Le menu (remplace la règle 2).**
- Les données : `D.site.menu` = `[{cle, texte, court, href}]`, dans l'ordre : les saisons (`#/saisons`), les spectacles
  (`#/spectacles`), la compagnie (`#/compagnie`), l'espace pro (`#/espace-pro`). C'est TOUTE la navigation première :
  dans l'en-tête de chaque page, en vrais liens, dans le style de ta maquette ; au téléphone, à portée sans ouvrir de
  menu (une barre fixe avec `court`, par exemple). L'élément courant porte `aria-current="page"` (un seul par vue) ; sur
  la page d'un spectacle, « les spectacles » est mis en évidence (`aria-current="true"`), dans une sous-page de l'espace
  pro, « l'espace pro ».
- Les trois entrées (« Je viens voir un spectacle », « Je souhaite programmer », « Je représente un établissement
  scolaire ») disparaissent de l'en-tête, des menus, de l'accueil et du pied de page. Elles ne restent que sur la page
  d'un spectacle en tournée, comme ses trois onglets (B). « Contact » reste dans le pied de page.
- `D.site.redirections` mène les anciennes adresses aux nouvelles (`location.replace`) : `#/voir` et `#/agenda` →
  `#/saisons` ; `#/programmer` → `#/espace-pro/programmer` ; `#/etablissement` et `#/actions-culturelles` →
  `#/espace-pro/etablissement`. `#/agenda/<saison>` mène à `#/saisons/<saison>`.
- `document.title` : « Saisons - crescite », « Je souhaite programmer - crescite »… (le h1 de la vue).

**B. Les vues (remplacent celles de la règle 3 qui changent ; les autres restent).**
- **Accueil `#/`** : l'ouverture (règle 6), puis ton concept d'accueil, sans le choix entre trois entrées. Son cœur : la
  saison en cours (ses prochaines dates, un lien vers `#/saisons`) et les spectacles dans leurs univers ; puis, dans
  l'ordre que tu veux, la carte et les remerciements aux donateurs (discrets).
- **`#/saisons` « Saisons »** (h1 = `D.site.menu[0].texte`) : TOUT l'agenda, sur une page.
  1. La saison en cours (`D.site.saisons[0]`, son titre) :
     - **les prochaines dates** (`libelles.prochainesDates`), avec le mode de sélection de la règle 17 : chaque date tout
       public est un bouton qui ouvre sa carte de réservation sur place ; une date scolaire est marquée
       `libelles.scolaire`, sans bouton de réservation ;
     - **la frise de la saison** : une frise chronologique GRAPHIQUE de toutes les dates de la saison (passées et à
       venir), sur une seule ligne du temps (pas une ligne par spectacle), chaque date à la COULEUR DE SON SPECTACLE
       (couleur lisible tirée de son univers), avec une légende des spectacles (leurs titres) ; « aujourd'hui » marqué ;
       choisir une date de la frise la choisit dans la liste (et inversement). L'outil commun `FRISE` (`frise.js`) peut
       servir ; habille-la dans ton style ;
     - **toutes les dates de la saison** (`libelles.toutesLesDates`), dans l'ordre chronologique, passées comprises, avec
       la carte de la saison.
  2. **Les saisons passées** (`libelles.saisonsPassees`), sur la même page, de la plus récente à la plus ancienne :
     chacune annoncée par sa petite carte (`CARTE.saison(s)`, dans ton style) et son titre, FERMÉE au départ (elle
     s'ouvre d'un geste, son contenu ne se dessine qu'à l'ouverture), ses dates de la plus récente à la plus ancienne.
     L'index des saisons, le filtre par spectacle et la recherche par commune de la règle 10 portent sur toute la page.
  `#/saisons/<saison>` ouvre cette saison et y mène (h1 inchangé ; c'est une adresse à part : `document.title` prend le
  titre de cette saison, « Saison 2019-2020 - crescite »).
- **`#/spectacles`** : comme avant (les spectacles dans leurs univers) ; un spectacle en tournée est signalé
  (`libelles.enTournee`).
- **La page d'un spectacle EN TOURNÉE** (`enTournee`) **ou EN CRÉATION** (`statut`, Cassandres) : comme avant, ses trois
  onglets `#/spectacle/<slug>/<voir|programmer|etablissement>` (règles 8, 13, 14, 17), la mémoire de l'onglet comprise.
- **La page d'un spectacle qui N'EST PLUS en tournée** (ni `enTournee` ni `statut` : aujourd'hui La Folle Idée et
  Macbeth – Fatum) : UNE page, `#/spectacle/<slug>`, SANS onglets (aucun lien vers ses adresses programmer ou
  établissement ; elles, et `…/voir`, mènent à `#/spectacle/<slug>` par remplacement). Dans son univers :
  - la présentation : l'en-tête d'univers, `affirmations`, `texte`, `photos`, `citations`, `video`, la fiche (`fiche`,
    `avec`, `production`, `mentions`) et sa distribution (règle 12) ;
  - **le bilan** (`libelles.bilan`) : ses dates passées, toutes saisons (de `D.saisons`), avec une BELLE carte de ses
    tournées (tous ses lieux), et des chiffres tirés des données seules (le nombre de dates, de communes, les saisons) ;
    les dates par saison, de la plus récente à la plus ancienne ;
  - **les actions culturelles menées** (`libelles.actionsMenees`), s'il y en a : son `actionCulturelle` (sans
    « à compléter » ici : sans texte, la rubrique ne paraît pas) et ses dates scolaires passées.
- **`#/espace-pro`** (règle 16, étendue) : le h1 et le texte, puis DEUX pages pour les professionnels et les enseignants
  (avant les trois portes) : « Programmer » vers `#/espace-pro/programmer` et « Établissements scolaires » vers
  `#/espace-pro/etablissement` (titres : le `court` de `D.site.entrees` programmer et etablissement), puis les trois portes.
  (Ordre du client, règle 16 : la page « programmer » vient avant toute porte, celle des établissements avant la porte de
  l'équipe ; la synthèse glisse l'accès des salles juste après « programmer ».)
- **`#/espace-pro/programmer`** (h1 = `texte` de l'entrée programmer) : le contenu de l'ancien `#/programmer` (règles 3 et
  13), sans les dates tout public, qui sont dans les saisons. **`#/espace-pro/etablissement`** (h1 = `texte` de l'entrée
  etablissement) : le contenu de l'ancien `#/etablissement` (règles 3 et 14).
- `#/compagnie`, `#/contact`, les pages légales et le pied de page (les quatre éléments du menu, contact, liens légaux) :
  comme avant.

**C. Le vérificateur** (`site/onglets.mjs`) contrôle : les quatre éléments du menu à portée sur chaque vue (et au
téléphone), un seul `aria-current="page"`, l'absence des trois entrées dans l'en-tête, l'accueil et le pied ; sur
`#/saisons` : une date à venir, les boutons de date (règle 17), la frise (`.frise[data-frise]`) avec des marques de
plusieurs couleurs et la légende, le titre « Saison 2019-2020 » dans les saisons passées, fermées au départ, chacune avec
sa carte ; la page de La Folle Idée sans onglets, avec son bilan et sa carte ; les sous-pages de l'espace pro ; les
redirections.

**D. La synthèse** (le site, demande de la compagnie, octobre 2026 : « N'affiche pas dans les saisons les dates « à
définir ». Simplifie la timeline. ») : une date dont le jour n'est pas encore fixé (précision au mois, « novembre 2026 »)
ne paraît pas sur `#/saisons` tant qu'elle n'est pas passée : ni dans les listes, ni sur la frise, ni sur la carte, ni
dans les puces des spectacles ; une date passée qui n'a gardé que son mois ou son année reste dans l'histoire. La frise de
la saison est simple : des pastilles à la couleur de leur spectacle (la liste dit « Scolaire »), deux couloirs au plus,
sans légende sous elle : les puces des spectacles, juste au-dessus, la font (leur survol isole les dates du spectacle).

Puis (octobre 2026) : « Rends la frise des saisons beaucoup plus claire, avec les dates, et la carte à côté qui zoome sur la
ville en France où a lieu la représentation. Quand on clique dessus, ça agit comme un filtre, ça efface les autres dates,
plutôt que de scroller tout en bas jusqu'à la date. Si on survole un mois, ça définit un filtre. Les filtres sur portable
doivent être intuitifs, apparaître en bas. » Et : « Ne mets dans les filtres accessibles par saison que les spectacles
concernés (pour la saison en cours, juste les spectacles en tournée) », en légende de la frise, à leur couleur.
- La frise de la saison : les mois en colonnes (septembre à août, leurs noms courts `libelles.moisCourts`), chaque date sous
  son mois, son jour écrit (des chiffres) dans une pastille à la couleur de son spectacle ; elle reste un `.frise[data-frise]`
  et ses dates des `.frise-point` (`--fr-c`, `.est-residence`). Juste au-dessus, sa légende : les spectacles de la saison
  seuls, à leur couleur, le nombre de leurs dates ; les saisons passées ont la leur. Puis : « Que ça prenne une ligne. Ça
  peut être un sous-menu, comme pour les univers de spectacle, et se snapper sous le menu principal en haut : les spectacles
  de la saison avec une vignette et leur code couleur, et le fond qui change pour illustrer le spectacle sélectionné. » Cette
  légende est donc le sous-menu de la saison : une ligne arrimée sous le menu (le nom de la saison paraît, arrimé), chaque
  spectacle avec sa vignette (sa photo, `CADRAGE`) cerclée de sa couleur ; le spectacle choisi teinte la bande et donne au
  fond de la saison sa photo, discrète, sous un voile de sa couleur (le texte reste AA).
- À côté, la carte de la saison s'approche de la commune de la date survolée ou choisie (la loupe), cadre un mois, revient
  à la France ; ses noms et ses ventouses gardent leur taille, rien ne change de taille dans la page.
- Choisir une date est un filtre (ses lignes seules, sa carte de réservation ouverte ; le second choix la rend) ; survoler un
  mois (la souris posée) le choisit, un clic le garde ; ces filtres ne portent que sur la saison en cours, les autres
  (spectacle, commune, recherche) sur toute la page. Les filtres en cours s'effacent d'un geste (`libelles.effacerFiltres`).
- Au téléphone : une barre en bas de l'écran (`libelles.filtres`, les filtres en cours, les mois) et un panneau qui monte du
  bas (la recherche, les mois, les spectacles, les communes ; `libelles.voirLesDates` mène aux dates gardées).

## Règle 22 : les couleurs de la saison et des spectacles (demande d'Angelo Jossec, directeur artistique)
« La couleur générale de cette saison, et cela jusqu'à la création de Cassandre, ça doit être le bleu. Voici les couleurs
de chaque spectacle : Mon Royaume pour un cheval jaune, Bérénice violet, Cyrano gris anthracite, L'Imaginaire forcé vert
sauge, Cassandre bleu, Cléophène rose saumon, Macbeth rouge sang ; La Folle Idée, pas encore décidé. »
- **Les spectacles** : leurs univers ont ces couleurs (`univers.couleurs`, dans la base et dans
  data/univers-spectacles.json ; `scene` est la couleur du spectacle, `accent` sa couleur lisible sur son fond).
  Ne mets aucune couleur de spectacle en dur : lis-les dans D, elles peuvent encore changer (La Folle Idée).
  Bérénice passe au violet : la charte de son dossier (règle 8) ne vaut plus pour sa couleur.
- **Le thème : « le dernier spectacle de la saison colore le thème complet du site », logo compris.** C'est la
  création la plus récente (aujourd'hui Cassandres, donc le bleu). `D.site.couleurSaison` = `{slug, couleur, vive}`,
  calculé par le build (`theme()`) et en direct par `DONNEES` (une nouvelle création, ou de nouvelles couleurs dans la
  base, changent le thème sans rien toucher) : `couleur` est assez sombre pour un texte sur fond clair et pour porter la
  pieuvre blanche du logo ; `vive` se lit sur un fond sombre. La maquette s'en sert pour tout ce qui était sa couleur de
  marque : ses accents d'interface (liens, boutons, l'élément courant du menu, les filets, la marque de la saison en
  cours sur `#/saisons`, « aujourd'hui » sur la frise) ET le logo.
- **Le logo n'est plus magenta, ni posé sur du magenta.** `D.logo.full` et `D.logo.mark` ont leur tache à `couleur`
  (`<path class="logo-tache">`, qu'un style peut recolorer en direct) ; l'ouverture (`INTRO`, `tache: true`) aussi ; la
  pieuvre seule prend `couleur` sur fond clair, `vive` ou le blanc sur fond sombre. Plus aucun `#bc3e80` (ni magenta
  de marque) dans une maquette : remplace-les par le thème. Contraste AA comme partout (règle 19, la nuit).

## Les contrôles des règles 17 à 20
Le vérificateur (`site/onglets.mjs`) ne contrôle chaque règle que si sa variable d'environnement est posée
(`REGLE17=1`, `REGLE18=1`, `REGLE19=1`, `REGLE20=1`), le temps que toutes les maquettes l'aient.

## Vérifier (obligatoire), deux tours au plus, sois économe
  python3 site/build.py mNN
  node site/onglets.mjs <ton dossier> mNN
Le rapport liste chaque vue puis les anomalies : il ne doit en rester aucune (lignes sans « · »), y compris « texte absent
des sources », « attendu mais absent », « ne devrait pas apparaître », les redirections et « à portée ». Regarde au moins :
l'intro, l'accueil, les saisons, l'espace pro et ses deux pages, berenice-voir, berenice-etablissement, la page de La
Folle Idée, cassandres, et les saisons au téléphone. Ne touche à aucun autre fichier que site/src/mNN.html. Ni commit ni push.

## Rendu
Un message final court : la navigation par les saisons, comment les univers sont rendus, ce qui a été vérifié.

## Règle 23 : les semaines de résidence, et les spectacles en tournée d'abord dans les filtres (demande du client)
« Dans la page saisons, mets les filtres des spectacles encore en tournée en priorité. Ajoute les semaines de résidence. »
(octobre 2026 ; le menu dit aussi « Saisons » au lieu de « Les saisons », D.site.menu)
- Les résidences viennent de la base (crescite_dates, nature « residence ») : dans D.saisons[k].spectacles[].dates[], avec
  `residence: true` et `nb_representations: 0`, leur ligne et leurs précisions (celles de la base, sinon « Résidence au … »,
  AGENDA.precisions). Jamais dans D.dates : ni « prochaines dates », ni réservation (RESERVER), ni alerte ; jamais sur les
  cartes (D.carte : les tournées, les représentations seules). Une saison à venir (des résidences déjà prévues) n'est pas
  dans D.saisons : elle y vient quand elle commence.
- Sur `#/saisons` (toutes les dates de la saison en cours) et dans chaque saison passée : chaque résidence à sa place dans
  l'ordre du temps, sa ligne marquée « Résidence » (D.site.libelles.residence), dans le style de la maquette (comme
  « Scolaire »), avec son data-date-id ; aucun bouton de réservation.
- La frise : `residence: true` sur son repère (FRISE : un repère carré évidé, une période en pointillé) ; la légende de la
  frise dit « Résidence » (le même signe) quand la saison en a.
- Les chiffres ne comptent pas les résidences : le nombre de dates d'une saison ou d'un spectacle, le bilan d'un spectacle
  qui ne tourne plus (dates, communes, saisons, représentations), la légende. Elles peuvent paraître dans les dates d'un
  bilan, marquées.
- Les filtres par spectacle de `#/saisons` (des puces, une légende qui filtre…) : les spectacles en tournée
  (`D.shows[].enTournee`) d'abord, dans leur ordre, puis les autres.
- Le vérificateur : `REGLE23=1`, avec `INSTANTANE=<dossier>` (un instantané de la base, un `<table>.json` par table, où sont
  les résidences : l'instantané du dépôt n'en a pas).
- La synthèse (le site, demande de la compagnie, octobre 2026 : « Ne mets pas les résidences dans les saisons, mais dans
  l'historique de chaque spectacle ») : aucune résidence sur `#/saisons` ni sur `#/saisons/<saison>` (ni ligne, ni repère
  de frise, ni signe de légende). Elles sont dans l'historique de chaque spectacle : sur sa page, une liste repliée
  « Historique » (`D.site.libelles.historique`) sous ses dates, ses dates passées et ses résidences (même à venir), saison
  par saison puis mois par mois, chaque résidence marquée « Résidence », sans réservation ; le bilan d'un spectacle qui ne
  tourne plus les garde de même ; la frise de sa tournée les marque, et un repère passé ou de résidence mène à sa ligne de
  la page (il ouvre l'historique). Le vérificateur le contrôle pour la synthèse.
- Les chiffres (la diffusion d'un spectacle, celle de la compagnie, la page des saisons, l'historique et le bilan d'un
  spectacle) comptent des représentations, partout (demande de la compagnie : « Je préfère les représentations partout ») :
  celles d'une date dans la base (`nb_representations`, le dixième script), sinon ses séances, sinon une ; aucune pour une
  résidence ni pour une date annulée. Tous les chiffres comptent de la même façon, sous le mot « Représentations »
  (`D.site.libelles.representations`), jamais sous le mot « dates » : un spectacle n'en a jamais plus, sur une saison, que
  toute la compagnie.

## Règle 24 : chaque photo cadrée sur sa zone d'intérêt (demande du client)
« Veille à ce que les images soient correctement centrées et cadrées, en définissant des zones d'intérêt par image pour
smartphone : celle de Cyrano, c'est le plus souvent noir. Il faut sélectionner les acteurs. » (octobre 2026)
- `data/cadrages.json` : pour chaque photo des spectacles (la clé de D.photos), une zone `[gauche, haut, droite, bas]` et
  un point `[x, y]`, en % de l'image : la zone, ce qui doit rester dans le cadre quand il le peut (les comédiens) ; le
  point, ce que garde un cadre plus petit qu'elle (un visage). D.cadrages les porte ; `focale` de chaque spectacle est
  l'abscisse du point de sa photo principale.
- `cadrage.js` (CADRAGE, outil commun) : toute photo en `object-fit: cover` d'une clé connue est placée pour que sa zone
  soit au centre de son cadre, entière si elle y tient, sinon son point au centre ; c'est refait quand le cadre change de
  taille (jamais à chaque image d'une animation), et les photos posées ensuite sont prises au passage. Un cadre peut
  déplacer ce centre par `--cadre-x` et `--cadre-y` (de 0 à 1), pour laisser la place à un texte (la synthèse : la photo
  d'un spectacle par écran, du côté libre de sa colonne de texte).
- Une photo ajoutée reçoit sa zone dans `data/cadrages.json` ; sans zone, elle garde la position de sa feuille de style ;
  `data-cadre="non"` l'exclut.

## Règle 25 : le rideau, puis la page qui se compose (demande du client, octobre 2026)
« Au chargement d'un onglet, il y a un court chargement au noir avec l'octopus animé, puis la page se charge avec chaque
élément qui prend sa place de façon animée (les spectacles : ils doivent s'inscrire rapidement, avec un mouvement, ligne par
ligne, comme un programme qui se compose de façon magique). »
- Le rideau (`Rideau`) : à chaque page ouverte par le menu, et à la première page hors de l'ouverture de l'accueil, un noir
  plein écran (le menu compris) où nage la pieuvre (`CREATURE.creer`, à la couleur vive de la saison ; sans créature, le
  dessin du logo qui flotte). 420 ms, puis il s'ouvre en deux (480 ms) et la pieuvre rejoint la marque du menu. Pas en
  entrant dans un spectacle (l'encre), ni d'un onglet à l'autre d'un spectacle, ni sur la même adresse.
- Rien n'attend le rideau : la page est rendue dessous dès le geste (son titre, son focus, sa place), le rideau ne fait que
  couvrir ; les budgets de la règle 15 C restent ceux du geste. Un geste pendant le noir ouvre le rideau aussitôt ; ouvert,
  il laisse passer les clics.
- La composition (`composer`), à l'ouverture du rideau : ce qui est à l'écran s'inscrit ligne à ligne de haut en bas en
  460 ms, au passage d'un trait de lumière ; une ligne de texte s'écrit de gauche à droite (clip-path ; pas de filtre
  sur le texte, repeint à chaque image), un texte haut se découvre de haut en bas, un cadre se pose, une photo sort du flou. Web Animations
  sur translate, scale, opacity, clip-path et filter : rien ne change de place dans la page (CLS 0). Ce qui a son propre
  mouvement ([data-mv], le titre qui fleurit) n'est pas composé, et ne part qu'à l'ouverture du rideau.
- Moins d'animations, `?anim=0`, un geste qui ouvre le rideau, un appareil trop lent (moins de vingt-cinq images par
  seconde pendant le noir) : la page est là, sans composition.
- Le vérificateur finit les animations d'id `rideau` et `compose` avant de lire une page.
