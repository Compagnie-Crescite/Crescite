# Le mouvement des deux applications

Octobre 2026. L'espace de l'équipe (`equipe/`) et l'administration (`admin/`) ont reçu, lot après lot, un mouvement
d'interface : ce qui répond au doigt, ce qui dit l'état, ce qui arrive et ce qui s'en va. Ce document en garde le
vocabulaire, pour que la suite reste de la même main ; le README dit où chaque effet vit, les bancs d'essai les vérifient.

## Le vocabulaire

Quatre durées, trois courbes, et rien qui bouge sans raison.

| Geste | Durée | Courbe | Où |
| --- | --- | --- | --- |
| Paraître (un bloc, un menu, un contenu lu après la page) | 150 à 450 ms | `cubic-bezier(.2, .8, .2, 1)`, le « doux » | `monte`, `ad-arrive`, `arrive`, `ad-neuf`, `neuve` |
| Sauter (un compte, un badge, une coche, un bouton qui a réussi, l'icône du thème ou de la densité qu'on vient de choisir) | 450 ms | `cubic-bezier(.3, 1.6, .5, 1)`, le ressort | `pop`, `ad-pop`, `fait` |
| Glisser à sa place (une ligne, un billet, une carte qui change de rang) | 380 à 420 ms | le doux, par l'API Web Animations (FLIP) | `glisserVers`, `reperer` |
| Suivre le doigt ou le pointeur (le retour, une notification, tirer pour rafraîchir, le bord d'une fenêtre qu'on tire) | le temps du geste, puis 180 à 300 ms ; la remise d'une fenêtre à sa taille d'origine, 220 ms | linéaire sous le doigt ou le pointeur (une mise à jour par image, jamais un transform), le doux pour revenir | `brancherRetour`, `brancherGlisserNotif`, `brancherTirer`, `FENETRES.poignee` |
| Passer d'une vue à l'autre | 220 à 300 ms | le doux, par les View Transitions | `changerVue`, `changerVueAdmin` |
| Replier le menu latéral (la colonne passe de 240 à 64 px, ou l'inverse) | 220 ms ; les libellés en 120 ms d'opacité | le doux, par la propriété déclarée `--large-menu` (`@property`) : la grille et l'aside la lisent, le contenu suit | `--large-menu` (`html`) |
| Zoomer la carte de tournée (+ − ⌂, Ctrl+molette, « Voir sur la carte ») | 220 ms | le doux : une animation sans cible donne la progression déjà adoucie, un `setAttribute('viewBox')` par image la suit (le glisser au pointeur, lui, suit le pointeur sans durée) | `animerCadre` (tournee.js) |
| Allumer une pastille de la carte (le survol d'une étape, le focus) | 450 ms | le ressort, sur ses deux cercles (`scale(1.15)`, `transform-box: fill-box`), jamais sur le `<g>` qui porte son `translate` | `.tn-pin.allume` |
| Viser une ligne (le champ qu'un lien vise, la ligne que « Voir dans le tableur » ouvre) | 1,6 s | `ease-out` | `visee`, `visee-ligne` |
| Respirer (une lueur, une lampe, une photo qui dérive) | 1,6 à 26 s, en continu | ease-in-out | `respire`, `lampe`, `derive`, `bn-temps` |
| Attendre (l'anneau d'une case du tableur que la base est en train d'enregistrer) | 0,9 s, en boucle | linéaire, `transform` seulement : un tour sans fin, pas de durée à suivre | `tab-tourne` |

Entre la liste, le tableur et la carte de Représentations (une même page, trois vues : même rubrique, même profondeur) le
passage est un fondu, jamais un glissement (`sensVue`) ; le sélecteur de vues (la pilule) ne glisse pas, il est redessiné
avec la vue ; sous `prefers-reduced-motion` ou `?anim=0` rien ne bouge, la ligne visée est seulement marquée un instant (un cadre et un fond fixes, 1,8 s).

Ce qui bouge en continu ne touche que `transform` et `opacity` (le compositeur) ; une boîte qui change de taille
s'anime par l'API, jamais par une transition de hauteur en continu (seule exception : le repli du menu latéral, un geste
unique de 220 ms, dont `mouvement-admin.mjs` mesure qu'aucune tâche ne dépasse 200 ms à `CPU=4`). Un chiffre qui change roule (`chiffresRoulants`, recopié dans l'administration pour la jauge de
complétude d'une date : `cpl-roule`, 450 ms, le doux), une
liste qui se redessine glisse, un élément qui s'en va se replie (`retirerLigne`, `listeQuiSeVide`) : rien ne saute d'un
état à l'autre sans que l'œil puisse suivre.

Deux petites choses du menu latéral n'ont pas de ligne à elles : le témoin « G… » qui attend la lettre d'une séquence de
touches (G puis D) paraît et s'efface en 120 ms d'opacité, linéaire, comme les libellés du menu qui se replie, et ne
bouge pas du tout sous « moins d'animations » ; le changement de thème (nuit, jour, appareil) est instantané : aucune
transition de couleur ne se lance (`html.bascule` les coupe le temps d'un recalcul de style : un fondu sur toute la page
coûterait cher), et seule l'icône choisie saute (`pop`, le ressort, 450 ms) ; les badges (« 12 » à traiter) sont posés sans mouvement, la pastille
change de chiffre sans rouler (`cadre.mjs` en vérifie le calcul : aucune tâche de plus de 200 ms à `CPU=4`).

Les accès rapides du menu latéral n'ajoutent rien au vocabulaire : un accès épinglé qui arrive (« Mettre dans le menu ») saute
en ressort (`ad-pop`, 450 ms, par la classe `.pop`, ôtée à la fin de l'animation) ; une fiche récente qui apparaît dans
« Récents » se pose (`ad-arrive`, 300 ms, le doux, par `.ad-neuf`) ; le menu « Créer » est un menu de `GESTES`, il paraît en
`gm-paraitre` (140 ms) comme tous les autres. Rien de cela ne joue au premier dessin de la page (les accès déjà là ne sautent
pas), ni quand un épinglé change de place (il est déplacé, pas recréé), et rien du tout sous « moins d'animations » ni avec
`?anim=0` (`acces.mjs` le vérifie : aucune animation dans la zone, aucune classe d'arrivée ; le menu « Créer » s'ouvre en
`gm-calme`).

Le tableur Simple (une ligne par date) n'ajoute presque rien à ce vocabulaire. Passer de « Simple » à « Complet » (le
segment de la tête) redessine la grille d'un coup, sans transition : une grille n'entre pas en cascade, ce serait
payer cher des centaines de lignes pour rien. La fenêtre des séances d'une date, posée sous la case, paraît en 150 ms (`ad-arrive`, `ease-out`),
comme les menus ; sous « moins d'animations » ou `?anim=0` elle est posée d'un coup. Une ligne qui se redessine parce
que le temps réel a touché sa date ne rejoue aucune entrée (`dessinerLignes` remplace son `<tr>` seulement : les autres
lignes, et un redessin qui ne change rien, ne touchent pas au DOM, donc à aucune mise en page) ; la case qui a changé
clignote comme avant (`vient-d-ailleurs`, `tab-ok`). Une saison entière (trois cents dates) se pose par tranches : les
douze premières lignes d'abord, le reste de tâche en tâche (`poserTranche`), pour qu'aucune tâche ne dépasse 200 ms à `CPU=4` ;
un redessin qui ne change que des lignes les remplace aussi par tranches.

Le tableur Complet, chaque champ atteignable, n'ajoute aucun mouvement non plus. Ctrl+Entrée et l'icône « fiche » ouvrent la date dans le
tiroir, qui glisse comme tous les tiroirs (le doux, 220 ms) ; le champ de la colonne s'allume en `visee` (1,6 s, `ease-out`, le même
effet que pour tout lien qui vise un champ) ; la grille qui se redessine derrière quand on enregistre ne rejoue rien (`dessinerLignes`),
et l'icône « fiche » n'est qu'une case dessinée en masque CSS, sans bouton ni svg par ligne (une saison entière en pose six cents :
un bouton et un svg par ligne alourdissaient chaque tranche et le changement de mode). Le menu « Jeu » redessine la grille d'un coup, comme le changement de mode. Le menu du
garde-fou d'une date « période » se pose comme les autres menus (150 ms, `ad-arrive`). Sous « moins d'animations » ou `?anim=0`, le
tiroir est posé d'un coup et le champ visé reçoit sa marque sans s'animer (`tableur-complet.mjs` le vérifie : aucune animation sur
le champ visé).

Trois choses s'y ajoutent, toutes à `transform` ou `opacity`. Une case qu'on écrit prend un petit anneau dans le coin, qui
tourne tant que la base répond (`tab-tourne`, 0,9 s, linéaire, en boucle, `transform` seulement : un mouvement sans durée à suivre, la
ligne « Attendre » du tableau) ; enregistrée, elle garde le cadre vert de `tab-ok` (1,4 s) et une coche paraît dans le coin,
tient, puis s'efface avec lui (`tab-coche`, 1,4 s, `ease-out`) ; refusée, elle est cerclée de rouge sans mouvement. Le petit calendrier
posé sur la case du jour, comme la fenêtre des séances, paraît en 150 ms (`ad-arrive`, `ease-out`, comme les menus). Sous « moins d'animations » ou avec
`?anim=0`, l'anneau reste là, fixe (un arc de couleur sur un cercle pâle), la coche ne paraît pas, le calendrier est posé d'un coup :
la barre d'état sous le cadre dit la même chose en mots (« Enregistrement… », « Enregistré : … », « Pas enregistré : … »).

## Les règles

- **Rien ne bouge si l'appareil demande moins d'animations** (`prefers-reduced-motion: reduce`), ni avec `?anim=0`
  (`html.still`, qui arrête aussi la feuille de style) : le menu latéral se replie alors d'un coup (`cadre.mjs` y regarde). La teinte du spectacle sur la page d'une date reste : ce n'est pas
  du mouvement.
- **Une entrée ne se rejoue pas** quand la page se redessine après une lecture de la base : `main.entree` (administration)
  ne dure qu'une seconde, `main.rafraichi` (équipe) garde la page immobile, les saisons passées n'arrivent en cascade qu'à
  l'ouverture de leur pli (`.saison-corps.neuve`).
- **Tirer le bord d'une fenêtre suit le pointeur, sans rien d'autre** (`FENETRES.poignee`, `html.redim`) : une mise à jour
  par image, en largeur ou en variable, jamais en transform ; pendant le geste les transitions sont coupées (pas les
  animations), les lignes d'une liste ne glissent pas (`reperer` rend une Map vide) et le pied d'une fiche ne se remesure
  pas ; la remise à la taille d'origine s'anime une fois, 220 ms, le doux ; le tiroir, lui, arrive et repart au doux
  (`transform` seul, 220 ms). Sous « moins d'animations », la taille d'origine revient d'un coup. Les mêmes règles valent pour
  le détail du planning (`--pl-detail`), la carte de tournée (`--l-tn`) et la hauteur d'une tuile (`--h-tuile`) : en
  « Personnaliser », le corps de la tuile se voit pendant le geste (opacité pleine) et le redessin complet de la grille est
  différé au relâchement ; le zoom de la feuille A4 change d'échelle d'un coup, sans transition (une page qui glisse sous
  une mesure fausserait la pagination, qui mesure par `offsetTop`).
- **La carte de tournée** : le cadre (le `viewBox`) glisse de l'ancien au nouveau en 220 ms, au doux, à chaque zoom (+ − ⌂, la
  molette, « Voir sur la carte » ou « Autour des dates ») ; la carte est redessinée d'abord, avec les rayons et les polices
  à l'échelle du nouveau cadre, puis le cadre rejoint sa place. Le glisser au pointeur suit le pointeur (une mise à jour par
  image, rien d'animé). Sous « moins d'animations » ou avec `?anim=0`, le cadre change d'un coup, et la pastille allumée ne
  grossit pas (l'étape allumée, elle, garde son anneau : c'est un repère, pas un mouvement). `carte-travail.mjs` y regarde.
- **Une mesure ne se fait pas sous un transform** : ce qu'un pli ouvre paraît en fondu, sans translation, pour que les
  lignes qui glissent se mesurent juste.
- **Ce qui s'anime reste lisible aux lecteurs d'écran** : « en ce moment » est aussi un `aria-current="time"`, un bouton
  occupé est `aria-busy`, un chiffre roulant garde son texte entier.
- **Le téléphone confirme** (`vibrer`) un geste qui a abouti : le retour au doigt, une notification lue, une case cochée,
  un bouton qui a réussi, le rafraîchissement.
- **Le budget tient** : aucune tâche longue au-delà de 200 ms après l'ouverture, même sur un processeur quatre fois
  plus lent (`CPU=4`, les bancs le mesurent : une cinquantaine de millisecondes au plus), pas de bibliothèque, pas
  d'image en plus.

## Ce que les bancs vérifient

```sh
python3 site/build.py        # d'abord : site/dist/equipe et site/dist/admin
node site/mouvement-equipe.mjs        # l'espace de l'équipe, hors ligne, sur une saison fictive (51 vérifications)
node site/mouvement-admin.mjs         # l'administration, sur une base fictive (34 vérifications)
CPU=4 node site/mouvement-equipe.mjs  # la même chose sur un téléphone quatre fois plus lent (le budget du contrat)
bash site/bancs-admin.sh              # le build, puis tous les bancs de l'administration, dont mouvement-admin.mjs
```

Chacun des deux bancs du mouvement ouvre l'application dans Chromium sans toucher à la vraie base (la session est
gardée dans le navigateur ; les lectures de tables reçoivent des lignes inventées ; les écritures répondent vide ou sont
coupées), au téléphone et à l'ordinateur, à une heure figée, puis avec le mouvement réduit et avec `?anim=0`. Les
captures vont dans `site/dist/shots-equipe/` et `site/dist/shots-admin/`. Un banc sort en erreur dès qu'une vérification
manque.

`bash site/bancs-admin.sh` enchaîne aussi `prefs.mjs` (où chaque réglage est gardé : avec le compte ou sur
l'appareil), `tableur.mjs` (le tableur des représentations, en Complet), `tableur-complet.mjs` (le tableur Complet, chaque
champ atteignable : les jeux de colonnes, la diffusion et sa case d'export, Ctrl+Entrée et l'icône « fiche », le garde-fou
d'une période, « Détacher », l'import), `tableur-simple.mjs` (le tableur Simple : une ligne par
date, ses modes, la fenêtre des séances, la ligne vide, le rendu par ligne du temps réel, les états d'une case, la
barre d'état, le petit calendrier, les lecteurs, le collage), `icones.mjs` (la bibliothèque d'icônes), `cadre.mjs` (la
coque, le menu latéral, ses raccourcis et ses badges), `champs.mjs` (la fiche d'une date : le schéma de ses champs, la
jauge, le bandeau « Modifiée ailleurs », qui paraît en `ad-arrive`), `vues-dates.mjs` (les trois vues de
Représentations : la pilule, les filtres communs, le fondu, le focus, la ligne visée, la vue retenue et les touches V
puis L / T / C), `theme.mjs` (le thème et la densité : le jour, « appareil » qui suit le système, la compacte, le menu
replié), `distribution.mjs` (la distribution à l'écran : la cellule d'une date, qui sera prévenu, la boîte d'impact,
la fiche d'une date), `fenetres.mjs` (les fenêtres ajustables : la poignée du tiroir, le séparateur de la liste, le
coin des boîtes et les réglages du menu), `fenetres-2.mjs` (les autres : le détail du planning, la carte, la hauteur
d'une tuile, le zoom de la feuille A4), `carte-travail.mjs` (la carte comme vue de travail), `tableur-colonnes.mjs`
(les colonnes du tableur à la carte : la poignée d'un en-tête, le menu, la hauteur du cadre, le « +n » de la
distribution) et `acces.mjs` (les accès rapides du menu et la barre de commande : l'arrivée d'un épinglé en `ad-pop`,
d'un récent en `ad-arrive`, le menu « Créer » en `gm-paraitre`). Ils ne touchent presque pas à ce vocabulaire :
`cadre.mjs` mesure seulement que le repli anime la colonne une fois, et rien sous « moins d'animations », et que le
compte des badges ne tient jamais la page plus de 200 ms à `CPU=4` ; `vues-dates.mjs`, que le passage entre les trois
vues est un fondu ; `theme.mjs`, qu'aucune transition de couleur ne se lance au changement de thème, que l'icône
choisie saute en 450 ms au ressort, que rien ne bouge sous « moins d'animations » ou `?anim=0`, et qu'à `CPU=4` aucune
tâche ne dépasse 200 ms ; `distribution.mjs`, que les pastilles de la cellule (qui se chevauchent, un anneau pointillé
pour un remplaçant, grises et barrées pour qui ne part pas) n'animent rien (ni animation ni transition, d'après le
style calculé), que le HTML de 120 dates de huit personnes se fabrique en moins de 100 ms, et qu'un écran de 30 dates
se pose et se met en page en moins de 100 ms à `CPU=4` (les 120 d'un coup, 960 pastilles, coûtent plus de 100 ms de
mise en page : le tableur les dessinera par tranches) ; `fenetres.mjs`, que la remise à la taille d'origine s'anime
une fois (et d'un coup sous « moins d'animations »), que rien ne glisse ni ne se remesure pendant le geste, et
qu'aucune tâche ne dépasse 200 ms à `CPU=4` pendant un glisser (le coin d'une boîte suit le pointeur de la même façon,
et sa remise à la taille d'origine est la même) ; `fenetres-2.mjs`, qu'aucune tâche ne dépasse 200 ms à `CPU=4`
pendant un glisser du détail du planning, de la carte ou d'une tuile, et que le zoom A4 ne bouge ni la pagination ni
rien d'autre ; `carte-travail.mjs`, que le cadre de la carte glisse en passant par un cadre intermédiaire (et change
d'un coup sous « moins d'animations » et avec `?anim=0`, la pastille allumée ne grossissant pas non plus), et
qu'aucune tâche ne dépasse 200 ms à `CPU=4` pendant le zoom, la molette, le glisser et le survol ;
`tableur-colonnes.mjs`, que la grille ne se redessine pas pendant le glisser d'un bord d'en-tête (seule une variable
CSS change) et qu'aucune tâche ne dépasse 200 ms à `CPU=4` à l'ouverture du tableur, pendant un glisser, un
ajustement, un changement d'ordre, un masquage, « Colonnes vides » ou le repli du menu, **sur une trentaine de
lignes** seulement (28 séances, chaque geste mesuré à part et refait une fois s'il dépasse) : avec les 230 lignes de
la base réelle, l'ouverture coûte environ 450 ms et un cran de glisser 150 à 230 ms, donc la tenue des 200 ms n'est
pas encore vérifiée sur des données réelles (le tableur Simple, lui, l'est sur trois cents dates de deux séances :
`tableur-simple.mjs` mesure à `CPU=4` qu'aucune tâche ne dépasse 200 ms à l'ouverture, au temps réel d'une séance ou
d'un lieu, à `rafraichirListes()` et à une écriture) ; `acces.mjs`, les trois arrivées ci-dessus, et le silence sous « moins
d'animations » ; pour le reste, ils veillent à ce qu'une refonte ne casse rien. (La case de la matrice qui saute,
`ad-pop`, vient avec le mode Distribution du tableur.)

## Ce qui a été écarté

- Un défilement automatique vers l'étape en cours le jour J : la page arriverait ailleurs que là où on l'a laissée.
- Une animation par mot dans les comptes et les titres : trop de nœuds, le budget d'interaction ne tenait plus.
- Un mouvement continu sur la carte de la tournée de la saison (la route pointillée ne tourne pas, ni quand on zoome) : elle ne tourne que sur la carte d'une
  date, huit fois, puis se pose.
- Des transitions de hauteur en continu (plis, listes) : l'API Web Animations les joue une fois, à la demande.
