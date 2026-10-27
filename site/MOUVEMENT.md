# Le mouvement des deux applications

Octobre 2026. L'espace de l'équipe (`equipe/`) et l'administration (`admin/`) ont reçu, lot après lot, un mouvement
d'interface : ce qui répond au doigt, ce qui dit l'état, ce qui arrive et ce qui s'en va. Ce document en garde le
vocabulaire, pour que la suite reste de la même main ; le README dit où chaque effet vit, les bancs d'essai les vérifient.

## Le vocabulaire

Quatre durées, trois courbes, et rien qui bouge sans raison.

| Geste | Durée | Courbe | Où |
| --- | --- | --- | --- |
| Paraître (un bloc, un menu, un contenu lu après la page) | 150 à 450 ms | `cubic-bezier(.2, .8, .2, 1)`, le « doux » | `monte`, `ad-arrive`, `arrive`, `ad-neuf`, `neuve` |
| Sauter (un compte, un badge, une coche, un bouton qui a réussi) | 450 ms | `cubic-bezier(.3, 1.6, .5, 1)`, le ressort | `pop`, `ad-pop`, `fait` |
| Glisser à sa place (une ligne, un billet, une carte qui change de rang) | 380 à 420 ms | le doux, par l'API Web Animations (FLIP) | `glisserVers`, `reperer` |
| Suivre le doigt (le retour, une notification, tirer pour rafraîchir) | le temps du geste, puis 180 à 300 ms | linéaire sous le doigt, le doux pour revenir | `brancherRetour`, `brancherGlisserNotif`, `brancherTirer` |
| Passer d'une vue à l'autre | 220 à 300 ms | le doux, par les View Transitions | `changerVue`, `changerVueAdmin` |
| Replier le menu latéral (la colonne passe de 240 à 64 px, ou l'inverse) | 220 ms ; les libellés en 120 ms d'opacité | le doux, par la propriété déclarée `--large-menu` (`@property`) : la grille et l'aside la lisent, le contenu suit | `--large-menu` (`html`) |
| Respirer (une lueur, une lampe, une photo qui dérive) | 1,6 à 26 s, en continu | ease-in-out | `respire`, `lampe`, `derive`, `bn-temps` |

Ce qui bouge en continu ne touche que `transform` et `opacity` (le compositeur) ; une boîte qui change de taille
s'anime par l'API, jamais par une transition de hauteur en continu (seule exception : le repli du menu latéral, un geste
unique de 220 ms, dont `mouvement-admin.mjs` mesure qu'aucune tâche ne dépasse 200 ms à `CPU=4`). Un chiffre qui change roule (`chiffresRoulants`, recopié dans l'administration pour la jauge de
complétude d'une date : `cpl-roule`, 450 ms, le doux), une
liste qui se redessine glisse, un élément qui s'en va se replie (`retirerLigne`, `listeQuiSeVide`) : rien ne saute d'un
état à l'autre sans que l'œil puisse suivre.

Deux petites choses du menu latéral n'ont pas de ligne à elles : le témoin « G… » qui attend la lettre d'une séquence de
touches (G puis D) paraît et s'efface en 120 ms d'opacité, linéaire, comme les libellés du menu qui se replie, et ne
bouge pas du tout sous « moins d'animations » ; les badges (« 12 » à traiter) sont posés sans mouvement, la pastille
change de chiffre sans rouler (`cadre.mjs` en vérifie le calcul : aucune tâche de plus de 200 ms à `CPU=4`).

## Les règles

- **Rien ne bouge si l'appareil demande moins d'animations** (`prefers-reduced-motion: reduce`), ni avec `?anim=0`
  (`html.still`, qui arrête aussi la feuille de style) : le menu latéral se replie alors d'un coup (`cadre.mjs` y regarde). La teinte du spectacle sur la page d'une date reste : ce n'est pas
  du mouvement.
- **Une entrée ne se rejoue pas** quand la page se redessine après une lecture de la base : `main.entree` (administration)
  ne dure qu'une seconde, `main.rafraichi` (équipe) garde la page immobile, les saisons passées n'arrivent en cascade qu'à
  l'ouverture de leur pli (`.saison-corps.neuve`).
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

`bash site/bancs-admin.sh` enchaîne aussi `prefs.mjs` (où chaque réglage est gardé : avec le compte ou sur l'appareil) et
`tableur.mjs` (le tableur des représentations), `icones.mjs` (la bibliothèque d'icônes), `cadre.mjs` (la coque, le menu
latéral, ses raccourcis et ses badges) et `champs.mjs` (la fiche d'une date : le schéma de ses champs, la jauge, le
bandeau « Modifiée ailleurs », qui paraît en `ad-arrive`). Ils ne touchent presque pas à ce vocabulaire : `cadre.mjs`
mesure seulement que le repli anime la colonne une fois, et rien sous « moins d'animations », et que le compte des
badges ne tient jamais la page plus de 200 ms à `CPU=4` ; pour le reste, ils veillent à ce qu'une refonte ne casse rien.

## Ce qui a été écarté

- Un défilement automatique vers l'étape en cours le jour J : la page arriverait ailleurs que là où on l'a laissée.
- Une animation par mot dans les comptes et les titres : trop de nœuds, le budget d'interaction ne tenait plus.
- Un mouvement continu sur la carte de la tournée de la saison : la route pointillée ne tourne que sur la carte d'une
  date, huit fois, puis se pose.
- Des transitions de hauteur en continu (plis, listes) : l'API Web Animations les joue une fois, à la demande.
