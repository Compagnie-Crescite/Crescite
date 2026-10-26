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
| Respirer (une lueur, une lampe, une photo qui dérive) | 1,6 à 26 s, en continu | ease-in-out | `respire`, `lampe`, `derive`, `bn-temps` |

Ce qui bouge en continu ne touche que `transform` et `opacity` (le compositeur) ; une boîte qui change de taille
s'anime par l'API, jamais par une transition de hauteur en continu. Un chiffre qui change roule (`chiffresRoulants`), une
liste qui se redessine glisse, un élément qui s'en va se replie (`retirerLigne`, `listeQuiSeVide`) : rien ne saute d'un
état à l'autre sans que l'œil puisse suivre.

## Les règles

- **Rien ne bouge si l'appareil demande moins d'animations** (`prefers-reduced-motion: reduce`), ni avec `?anim=0`
  (`html.still`, qui arrête aussi la feuille de style). La teinte du spectacle sur la page d'une date reste : ce n'est pas
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
- **Le budget tient** : aucune tâche longue au-delà de 200 ms après l'ouverture (les bancs le mesurent), pas de
  bibliothèque, pas d'image en plus.

## Ce que les bancs vérifient

```sh
python3 maquettes/build.py synthese        # d'abord : maquettes/dist/equipe et maquettes/dist/admin
node maquettes/mouvement-equipe.mjs        # l'espace de l'équipe, hors ligne, sur une saison fictive (42 vérifications)
node maquettes/mouvement-admin.mjs         # l'administration, sur une base fictive (29 vérifications)
```

Chacun ouvre l'application dans Chromium sans toucher à la vraie base (la session est gardée dans le navigateur ; les
lectures de tables reçoivent des lignes inventées ; les écritures répondent vide ou sont coupées), au téléphone et à
l'ordinateur, à une heure figée, puis avec le mouvement réduit et avec `?anim=0`. Les captures vont dans
`maquettes/dist/shots-equipe/` et `maquettes/dist/shots-admin/`. Un banc sort en erreur dès qu'une vérification manque.

## Ce qui a été écarté

- Un défilement automatique vers l'étape en cours le jour J : la page arriverait ailleurs que là où on l'a laissée.
- Une animation par mot dans les comptes et les titres : trop de nœuds, le budget d'interaction ne tenait plus.
- Un mouvement continu sur la carte de la tournée de la saison : la route pointillée ne tourne que sur la carte d'une
  date, huit fois, puis se pose.
- Des transitions de hauteur en continu (plis, listes) : l'API Web Animations les joue une fois, à la demande.
