# Audit scrollytelling de la synthèse, et la branche de prévisualisation

Octobre 2026. Périmètre : `maquettes/src/synthese.html` (la proposition retenue, publiée dans `docs/synthese.html`), telle
qu'elle est après la fusion des pages composées (l'univers de la 07, le sommaire de la 08, les saisons de la 07 et de la
04, l'espace pro de la 05, la troupe de la 06). Méthode : lecture du code (la signature de mouvement, les outils communs
`mouvement.js`, `frise.js`, `tentacules.js`, `intro.js`, `cadrage.js`), captures au bureau (1440 × 900) et au téléphone
(390 × 844) à une dizaine de hauteurs de défilement sur l'accueil, les saisons, la page d'un spectacle en tournée
(Bérénice), d'un spectacle terminé (La Folle Idée) et la compagnie ; puis les vérificateurs du dépôt (`onglets.mjs`,
`reactivite.mjs`).

Le scrollytelling, c'est le récit porté par le défilement : ce que le visiteur fait avancer avec la molette ou le pouce, à
son rythme, et qu'il peut remonter. Il se distingue de l'animation déclenchée (un fondu qui joue une fois quand un bloc
entre dans l'écran) : celle-ci ne se rejoue pas, ne se remonte pas, et ne dit rien de la position de la lecture.

## 1. L'état des lieux : ce qui bouge déjà avec le défilement

La synthèse est déjà loin : quatre moments sont de vrais scrollytellings, le reste est de l'animation déclenchée à l'entrée.

| Page | Ce qui bouge | Nature | Outil |
| --- | --- | --- | --- |
| Ouverture | Le logo en grand glisse et devient la pieuvre du premier écran | geste (clic, molette, glissé) | `intro.js`, `Scene` |
| Accueil | La scène : pieuvre animée, titres qui s'allument, photos en fondu | temps (boucle, 6,5 s par titre) | `Scene`, canvas |
| Accueil | Les spectacles un par écran, épinglés : la photo s'ouvre, le motif joue (`--p`, `--r`, `--q`) | **lié au défilement** (JS, rAF) | `defileEcrans` |
| Accueil | La carte de la saison : les bras poussent depuis Rouen | déclenché à l'entrée (0,9 s) | `pousserVu` |
| Spectacle en tournée | L'ouverture de la 07 : la photo plein cadre recule et grossit à mesure qu'on la quitte (`--p`) ; le titre lettre à lettre, l'accroche mot à mot, la poursuite suit la main | **lié au défilement** (photo, JS) ; temps (texte) | `FX.une`, `lettres()` |
| Spectacle en tournée | Le récit (« voir ») : le texte pas à pas à côté des photos épinglées qui se relaient, le pas lu s'allume d'un filet, un filet par photo dit où l'on en est | **lié au défilement** (JS) | `FX.recit`, `.rc` |
| Spectacle | Le petit sommaire qui suit la lecture, la barre de progression sous les onglets | **lié au défilement** | `defile` (`--lu`) |
| Spectacle terminé | L'ouverture de la 10 : le filet sous le titre s'allonge avec la lecture, la photo s'éloigne | **lié au défilement** (JS) | `FX.une` |
| Spectacle | Affirmations, citations : s'écrivent mot à mot une fois, ou sont posées | déclenché à l'entrée | `.ecrit.vu` |
| Spectacle | Photos en cartons, fiches en cascade, filets tracés, chiffres qui comptent | déclenché à l'entrée | `MOUVEMENT.reveler` |
| Spectacle | La carte de la tournée et sa frise, le bilan d'un spectacle terminé | déclenché à l'entrée | `pousserVu`, `FRISE` |
| Spectacle | Le lien « spectacle suivant » | aucun | — |
| Spectacles | Le sommaire de la 08 : la liste et l'aperçu qui se relaie | survol, choix | — |
| Saisons | La saison en cours (la 07) : la frise, la liste, la carte épinglée, liés par le survol ; les saisons passées en portes (la 04) | survol seulement | `relier`, `FRISE` |
| Compagnie | La troupe de la 06 : les bras poussent une fois quand elle arrive | déclenché à l'entrée (Web Animations) | `troupe.js` |
| Compagnie | « En quelques dates » : la frise historique, puis les années en grille | déclenché à l'entrée | `FRISE` |

Le mouvement respecte `prefers-reduced-motion` et `?anim=0` (`html.still`) ; le vérificateur retire les animations liées
au défilement pour lire le texte et ses contrastes.

## 2. Les manques

1. **La plupart des effets sont déclenchés, pas liés.** Hors la pile de l'accueil, l'ouverture et le récit d'un spectacle,
   tout joue une fois à l'entrée d'un bloc, en millisecondes : le lecteur ne les conduit pas, ne peut pas les remonter, et
   un lecteur rapide les voit à moitié. Les textes forts (affirmations, citations) s'écrivent seuls au lieu de s'allumer
   sous les yeux ; dans le récit, le pas s'allume d'un bloc, pas ses mots.
2. **Des coupures nettes entre les moments.** La scène de l'accueil s'arrête d'un coup sous le menu (un bloc de papier qui
   la tranche) ; dans l'ouverture d'un spectacle, la photo recule mais le texte, la poursuite et le gobo sortent de l'écran
   comme un bloc ; au bout d'une page de spectacle, le lien vers le suivant est un bandeau plat, rien n'annonce l'univers
   d'après (et son petit motif, sans taille, emplissait le bandeau).
3. **Un écran par spectacle, sans temps de lecture.** Sur l'accueil, `--r` suit `--p` (pas de repos entre deux écrans) :
   le motif ne joue que pendant l'arrivée, le titre, l'accroche et les dates paraissent ensemble ; l'épinglage ne sert
   qu'à la transition, pas à la lecture.
4. **La tournée ne se dessine pas en lisant.** Page d'un spectacle, bilan d'un spectacle terminé, saisons, établissement :
   la liste des dates et la carte épinglée sont côte à côte, mais la carte pousse d'un coup et ne dit jamais où en est la
   lecture ; le lien liste ↔ carte ↔ frise n'existe qu'au survol, donc pas au doigt.
5. **La compagnie se résume, elle ne se raconte pas.** La frise historique se lit d'un regard, la grille des années
   dessous la répète ; les photos des spectacles, qui sont la mémoire de la compagnie, n'apparaissent pas dans son
   histoire.
6. **Le téléphone est servi par défaut.** La pile de l'accueil ne s'épingle pas (voulu), les effets jouent sur la photo ;
   le récit d'un spectacle passe en cartons sur ses photos (bien). Mais, sans survol, rien ne relie les dates à la carte
   ni à la frise.
7. **Technique.** Les effets liés au défilement passent par un écouteur `scroll` + `requestAnimationFrame` qui mesure et
   écrit des variables CSS (fil principal). Les animations CSS liées au défilement (`animation-timeline: view()`,
   composées hors du fil principal, scrubbables par nature) sont maintenant dans tous les navigateurs courants (Chrome
   115, Firefox, Safari 26) ; la synthèse ne s'en sert nulle part.

## 3. Les propositions, classées

Chacune tient les règles du contrat (le texte vient de `D` et de rien d'autre, aucune bibliothèque, les budgets de
réactivité, `prefers-reduced-motion`, 360 px) et le vérificateur : l'état de base est toujours l'état final, lisible.

| # | Proposition | Le récit | La mécanique | Coût | Branche |
| --- | --- | --- | --- | --- | --- |
| 1 | **Le texte qui s'allume à la lecture** | Affirmations (dans le récit, l'ouverture d'un spectacle terminé, la page du programmateur) et citations : chaque mot passe de l'ombre à la lumière quand sa phrase traverse le milieu de l'écran, dans l'ordre, au rythme du lecteur ; en remontant, il s'éteint. | CSS seul : `view-timeline` sur le bloc, une animation par mot décalée par son rang (`--w`, `--n`), sous `@supports` ; repli : l'écriture mot à mot actuelle. | petit | ✔ |
| 2 | **La tournée qui se dessine au fil des dates** | Une ligne de lecture au milieu de l'écran : la date qui la franchit s'allume, sa commune pousse sur la carte épinglée et s'y nomme, son repère s'allume sur la frise ; en remontant, les bras se retirent. Page d'un spectacle (la liste des dates), bilan d'un spectacle terminé, saisons (la saison en cours, les prochaines dates puis toutes ; chaque saison passée ouverte), établissement. | Un `IntersectionObserver` par liste (racine : tout ce qui est au-dessus de la ligne), aucune mesure par image ; `.carte.au-fil`, `.lu`. Au doigt aussi. | moyen | ✔ |
| 3 | **L'ouverture qui prend de la profondeur** | En quittant l'ouverture d'un spectacle, la photo reste en arrière (elle suit déjà la lecture), le texte monte plus vite que la page et s'efface, la poursuite et le gobo s'éteignent : une scène et une salle. | CSS seul, `animation-range: exit` sur `.sp-une`. | petit | ✔ |
| 4 | **Un temps de lecture par spectacle** (accueil) | Chaque écran épinglé reste seul le temps d'un repos (`--df-repos`, 40 vh) : ses dates arrivent l'une après l'autre, le motif continue (l'arène tourne, l'horloge avance, le fil s'écrit), puis le lien ; le suivant monte ensuite. | Une marge sous chaque écran ; `--r` existait déjà dans le moteur. Au téléphone : rien ne change. | petit (la page s'allonge de 3 écrans) | ✔ réglable |
| 5 | **La scène qui se retire, le menu qui monte** | La pieuvre et ses titres glissent plus lentement que la page et s'éteignent sous le menu, dont les cartes montent l'une après l'autre : une continuité à la place d'une coupure. | CSS seul (`exit` sur la scène, `entry` sur chaque carte). | petit | ✔ |
| 6 | **Le spectacle suivant qui monte** | Au bout de la page d'un spectacle, le bandeau du suivant prend la couleur de son univers et sa photo se lève avec lui ; au clic, elle devient l'ouverture (élément partagé déjà en place). | Un fond photo dans le bandeau, `entry` ; le petit motif remis à sa taille. | petit | ✔ |
| 7 | **L'histoire de la compagnie en chapitres** | Sous la frise historique (qui résume), la liste des années devient le récit : une étape par date de `D`, l'année en grand, le titre qui mène au spectacle ; l'étape qui traverse le milieu s'allume, et un panneau épinglé prend la photo et la couleur de son spectacle. Au téléphone, le panneau reste en haut, les étapes passent dessous. | La liste existante (`.frise-l`, éditable) refaite ; un panneau décoratif ; `cover` par étape + ligne de lecture. | moyen | ✔ |
| 8 | **Les chiffres qui comptent avec le défilement** | Le bilan d'un spectacle terminé (dates, communes, saisons) et les faits d'un programmateur : les nombres montent avec la lecture au lieu de compter une fois. | `MOUVEMENT.compter` existe ; une version liée au défilement demande de toucher l'outil commun. | petit | à faire |
| 9 | **La frise de la saison qui suit la lecture** | Sur `#/saisons`, la frise de la saison s'épingle sous l'en-tête le temps de lire ses dates, son curseur suit la date lue. | La frise existe ; l'épinglage coûte 120 px de hauteur d'écran, à réserver au bureau. | moyen | à faire |
| 10 | **Le récit et l'ouverture en CSS** | Le récit d'un spectacle et l'ouverture passent du moteur JS (`FX.recit`, `FX.une`) aux animations CSS liées au défilement (composées), le JS restant le repli ; la pile de l'accueil aussi. | Refonte du moteur `defile` ; gain : fluidité sur téléphone bas de gamme. | gros | à faire |

## 4. Ce que la branche de prévisualisation implémente

Tout est dans `maquettes/src/synthese.html` (aucun outil commun ni donnée touchés), dans le bloc « Mouvement », point 10,
et dans la section CSS « le scrollytelling ». Les règles :

- **L'état de base est l'état final.** Sans mouvement (`prefers-reduced-motion`, `?anim=0`, `html.still`), tout est posé et
  se lit ; le vérificateur, qui retire les animations liées au défilement, lit le même texte, aux mêmes contrastes.
- **Rien par image.** Les nouveaux effets sont des animations CSS liées au défilement (composées, scrubbables) ; là où un
  script est nécessaire (la carte, la frise, le panneau du récit), une ligne de lecture par `IntersectionObserver`, réveillée
  au franchissement seulement. Le moteur `defile` existant n'est pas touché.
- **Repli propre.** Sans `animation-timeline: view()` (`@supports`), l'écriture mot à mot, la carte qui pousse d'un coup, la
  scène qui s'arrête restent ce qu'ils étaient.
- **Réglages.** `--df-repos` (dans `.df-pile`, 40 vh) : le temps de lecture d'un spectacle sur l'accueil ; `0` revient à un
  écran par spectacle. Les plages des animations (`animation-range`) disent en hauteur d'écran quand chaque effet joue.

Ce qui change page par page :

- **Accueil** : la scène se retire sous le menu ; les cartes du menu montent ; chaque spectacle a son temps de lecture, ses
  dates arrivent une à une, le lien « Découvrir » en dernier.
- **Page d'un spectacle** : l'ouverture prend de la profondeur (le texte, la poursuite, le gobo) ; dans le récit, les
  affirmations et les citations s'allument mot à mot ; la liste des dates se dessine sur la carte épinglée (quand le
  spectacle a une liste : sans réservation en ligne), et sur la frise ; le spectacle suivant monte au bout de la page.
- **Spectacle terminé** : les affirmations de l'ouverture s'allument ; le bilan se dessine au fil des saisons.
- **Programmateur** (l'onglet) : l'affirmation s'allume.
- **Saisons** : la saison en cours (les prochaines dates, puis toutes) et chaque saison passée ouverte se dessinent au fil
  des dates sur leur carte épinglée ; la frise de la saison suit.
- **Établissement scolaire** : les dates scolaires à venir se dessinent au fil de la lecture.
- **Compagnie** : « En quelques dates » devient un récit en chapitres sous sa frise, avec les photos des spectacles.

## 5. Vérifications

- `python3 maquettes/build.py synthese` puis `EDITION=1 REGLE17=1 REGLE18=1 REGLE19=1 REGLE20=1 node maquettes/onglets.mjs
  <sortie> synthese` : 19 vues, **aucune anomalie** (texte des sources, menu, frises, redirections, réservation, vidéos,
  nuit, troupe, 360 px).
- `node maquettes/reactivite.mjs <sortie> synthese`, avant et après, dans le même environnement (un conteneur partagé, plus
  lent que le poste de `GRAPHISME.md`) : voir le compte rendu de la branche pour les chiffres ; tous les budgets tenus.
- Captures avant / après aux mêmes hauteurs de défilement, bureau et téléphone ; sondes des valeurs (`--p`, `--r`, `--q`,
  l'opacité des mots, les bras poussés, l'étape lue, la sortie de l'ouverture, le bandeau du suivant).

## 6. Pistes écartées

- Un défilement aimanté (`scroll-snap`) entre les écrans : c'est la 09 ; la synthèse reste libre et rapide.
- Des effets sur le défilement horizontal (la bande des dates réservables) : elle défile déjà au doigt, aimantée.
- Une tentacule qui suit la lecture : la règle 15 fait de la pieuvre un moment rare ; elle le reste.
- Allumer mot à mot les paragraphes du récit : ils sont longs, le filet du pas suffit ; seules les phrases fortes s'allument.
