# Compte rendu de finition graphique des dix maquettes (`m01` à `m10`) et de la synthèse

Ce document présente le travail de finition graphique réalisé sur la branche `graphisme` pour l'ensemble des maquettes (`m01` à `m10`) et la synthèse (`synthese.html`), conformément à `maquettes/CONSIGNE-GRAPHISME.md` et `maquettes/CONTRAT.md`.

Chaque proposition a été poussée plus loin dans sa propre direction esthétique et son caractère singulier, tout en préservant scrupuleusement ses éléments graphiques distinctifs et en corrigeant les faiblesses relevées dans la planche de comparaison (`maquettes/src/planche.html`). L'ensemble respecte strictement l'accessibilité (contraste WCAG AA, cibles tactiles >= 44 px, zéro débordement à 360 px) et les budgets de réactivité (INP < 100 ms bureau / < 200 ms téléphone ×4, premier rendu < 150-200 ms, CLS < 0,05).

---

## 1. Détail des finitions par maquette

### `m01` — « Le programme de salle »
- **Direction poussée (programme de théâtre de poche imprimé)** : texture de papier vergé ivoire sur le fond, doubles filets d'imprimeur (`border-double`) en tête de page, sous les bandeaux et en clôture de programme, chiffres elzéviriens (`oldstyle-nums`) sur les numéros de programme et d'acte, et encadrement des photographies en tirages contrecollés sur passe-partout crème avec filet intérieur.
- **Faiblesses résolues** :
  - Ajout d'une vignette gravée du motif de l'univers de chaque spectacle dans la liste d'accueil (`.bill-list`) pour habiter le programme dès le premier écran.
  - Activation des photographies de plateau (`photo: true`) sur les cartouches des pages *Je souhaite programmer* et *Je représente un établissement scolaire*, qui étaient auparavant uniquement typographiques.
  - Suppression du rognage (`overflow: hidden`) sur les frises chronologiques afin de laisser respirer le tampon « aujourd'hui » et les étiquettes.

### `m02` — « La maison »
- **Direction poussée (scène nationale / architecture suisse)** : grille éditoriale à 12 colonnes affirmée par des filets architecturaux francs (`2.5px` / `2px`), typographie monumentale tendue et contrastes de cartouches institutionnels.
- **Faiblesses résolues** :
  - Intégration de la pieuvre de Crescite (`D.logo.octopus`, `aria-hidden="true"`) dans la charpente même des pages : grand filigrane architectural en haut à droite des en-têtes de page (`.page-head`), filigrane de pied de page (`.site-footer`) et grand cartouche emblème dans les colonnes 9 à 12 de la page *La compagnie*.
  - Cadrage photographique en tirages d'exposition au sein des cadres de scène et d'univers.

### `m03` — « La saison »
- **Direction poussée (revue culturelle / brochure de saison)** : composition de l'accueil comme une véritable une de revue culturelle (*Télérama*, *Mouvement*) articulant manchette éditoriale, photographie de couverture et portes d'entrée.
- **Faiblesses résolues** :
  - Création d'une colonne « À la une » (`.une-card`) en regard de la manchette sur le premier écran de l'accueil, mettant en avant un spectacle de la saison avec sa photographie de plateau grand format, son lieu/temps et son accroche, accompagnée des 3 cartes d'entrée en pleine couleur (soit 4 photographies de plateau distinctes visibles dès l'ouverture sans défiler).
  - Ajout des photographies de plateau (`.fe-ph`) dans les fiches de la page *Je représente un établissement scolaire*.
  - Affichage direct de la chronologie *En quelques dates* (`.co-dates`) sur la page *La compagnie* (auparavant masquée en `display: none`).

### `m04` — « Trois portes »
- **Direction poussée (les trois grandes portes en arche et matière théâtrale)** : trois arches monumentales avec battants 3D et perspective, fond prune chaleureux (`#22101d`) et faisceaux de lumière dorée.
- **Faiblesses résolues** :
  - Ajout de la photographie de plateau en arche (`.ac-photo.arche-img`) dans les fiches établissement scolaire pour donner la même présence scénique que sur la page de programmation.
  - Cibles tactiles de la navigation garanties à 44 px au moins (`.site-nav a` en `display: inline-flex; min-height: 44px; align-items: center;`).

### `m05` — « Magenta »
- **Direction poussée (affirmation de la marque et graphisme d'impact)** : grands aplats magenta et noir d'encre, pieuvre blanche héraldique, bandeau dynamique « EN TOURNÉE », typographie Archivo monumentale.
- **Faiblesses résolues** :
  - Intégration de la photographie de plateau (`.ac-ph.duo-u`) au format 16/9 dans les fiches de la page *Je représente un établissement scolaire* aux côtés du motif de l'univers, assurant une parfaite homogénéité avec le catalogue de programmation.
  - Préservation intégrale des aplats, des contrastes chromatiques et des animations de tentacules.

### `m06` — « Les bras de la tournée »
- **Direction poussée (la tentacule comme fil conducteur)** : la carte vivante des tournées qui rayonne depuis Rouen le long des bras de pieuvre, vagues et ondulations décoratives fluides.
- **Faiblesses résolues** :
  - Intégration des photographies de plateau grand format dans les fiches de programmation (`.fu-photo`) et les cartes d'établissement scolaire (`.au-photo`), avec cadrage dans l'univers du spectacle.
  - Cibles tactiles de la navigation secondaire (`.second a`) portées à 44 px au moins.

### `m07` — « Le noir et la lumière »
- **Direction poussée (clarté théâtrale et faisceaux de poursuite)** : noir profond de salle obscure, gobo lumineux de chaque univers, carte aux faisceaux rayonnants et poursuite douce.
- **Faiblesses résolues** :
  - Correction de l'assombrissement excessif au téléphone sur les spectacles à centre sombre (notamment *Ci-gisait Cyrano*) grâce à un halo théâtral lumineux (`.scene--spectacle .scene-visuel::before`) en mode écran (`mix-blend-mode: screen`), éclairant le plateau sans surcoût de repeinte.
  - Recadrage photographique des fiches d'établissement scolaire (`.cac-ph` à `16/8`) pour une mise en valeur optimale des comédiens et de la scénographie.
  - Cibles tactiles de navigation, du sélecteur de scène et des filtres d'agenda portées à 44 px minimum (`.second a`, `.menu-btn`, `.titre`, `.chip`, `.idx`, `.idx-tout`).


### `m08` — « Le sommaire »
- **Direction poussée (index raisonné / grand catalogue d'exposition)** : double filet d'encre en tête de catalogue, filet vertical continu formant la reliure centrale entre la colonne du sommaire (`.som`) et la colonne d'aperçu (`.pv`), et cadrage de l'aperçu comme une planche hors-texte posée sur papier crème (`1.25fr / .95fr`).
- **Faiblesses résolues** :
  - Ajout de vignettes photographiques de plateau (`.toc-vign`) sur chaque ligne des entrées (`.som-e`) et du répertoire (`.som-s`) dans la colonne gauche, afin que la vie du plateau soit présente sur l'ensemble du sommaire et sur mobile sans dépendre du seul survol.
  - Ajout d'une photographie de plateau (`.pv-fig`) aux côtés de la carte de diffusion dans l'aperçu de l'entrée *Je souhaite programmer*, afin que les trois entrées présentent chacune une photographie de scène au survol.

### `m09` — « Un spectacle par écran »
- **Direction poussée (collection d'affiches plein cadre en clair-obscur)** : proportions d'affiche plein cadre (`1.12fr .88fr`) avec fondu progressif entre la photographie de scène et la nuit de l'univers, typographie Gloock monumentale auréolée de la lueur du spectacle, et magnétisme doux (`scroll-snap-type: y proximity`).
- **Faiblesses résolues** :
  - Ajout d'un bandeau de répertoire (`.choix-rep` / `.choix-spectacles`) au bas du premier écran (`#chap-0`), présentant les 8 spectacles avec leur médaillon photographique de plateau et leur titre cliquable menant directement à leur affiche plein cadre : on embrasse ainsi toute la saison d'un seul coup d'œil dès l'ouverture.
  - Rendu permanent du titre du chapitre actif (`aria-current="true"`) sous forme de pastille lisible dans le sommaire latéral (`#sommaire`) sur les chapitres de spectacles et les fiches spectacles.
  - Correction d'une collision de nom de fonction (`function entrer(c)` écrasée par `function entrer(type, partage)`), renommée en `entrerChoix(c)`, qui laissait le premier écran en `opacity: 0` après la fermeture de l'introduction.

### `m10` — « La pieuvre vivante, rangée »
- **Direction poussée (gravure naturaliste à l'encre de seiche et papier ancien)** : trame de papier vergé ancien sur les fonds couleur de lait, doubles filets de planche naturaliste (`border-double`) au bas de la scène, des en-têtes et des index de saison, et ombres douces d'encre sépia.
- **Faiblesses résolues** :
  - Ajout d'un médaillon photographique de plateau (`.t-medaillon`) serti d'un double anneau d'encre à l'extrémité extérieure de chaque titre de spectacle sur la scène (`.stage`) : la vie du plateau habite immédiatement la nuit autour de la pieuvre, l'anneau suggère visuellement la prise pour tirer ou cliquer le titre, et la pointe du tentacule vient s'enrouler autour du médaillon au survol.
  - Ajout des photographies de plateau (`.fp-ph` et `.fe-ph`) en tête des fiches des pages *Je souhaite programmer* et *Je représente un établissement scolaire*.
  - Correction du filet de soulignement des entrées multi-lignes sur la scène (`.t-entree .t-title`) et montage immédiat après premier rendu (`differe`) des premières frises de diffusion sur mobile.

---

## 2. Mesures de réactivité avant / après (`reactivite.mjs --strict`)

Toutes les vérifications (`shoot.mjs`, `EDITION=1 onglets.mjs`, `reactivite.mjs --strict`) passent avec **0 anomalie** et **100 % des budgets tenus**.

### Bureau (`1440×900`)

| Maquette | FCP | LCP | CLS | INP max | Contenu max |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`m01`** | **116 ms** | **244 ms** | **0.0054** | **32 ms** | **31 ms** |
| **`m02`** | **176 ms** | **176 ms** | **0.0005** | **40 ms** | **62 ms** |
| **`m03`** | **160 ms** | **216 ms** | **0.0002** | **40 ms** | **46 ms** |
| **`m04`** | **184 ms** | **184 ms** | **0.0051** | **48 ms** | **95 ms** |
| **`m05`** | **92 ms** | **92 ms** | **0.0022** | **48 ms** | **61 ms** |
| **`m06`** | **156 ms** | **156 ms** | **0.0031** | **48 ms** | **63 ms** |
| **`m07`** | **184 ms** | **184 ms** | **0.0045** | **48 ms** | **129 ms** |
| **`m08`** | **196 ms** | **196 ms** | **0.0033** | **48 ms** | **59 ms** |
| **`m09`** | **136 ms** | **136 ms** | **0.0006** | **72 ms** | **47 ms** |
| **`m10`** | **148 ms** | **224 ms** | **0.0005** | **48 ms** | **61 ms** |
| **`synthese`** | **144 ms** | **144 ms** | **0.0134** | **48 ms** | **63 ms** |

### Téléphone (`390×844`, processeur ralenti ×4)

| Maquette | FCP | LCP | CLS | INP max | Contenu max |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`m01`** | **164 ms** | **256 ms** | **0** | **56 ms** | **47 ms** |
| **`m02`** | **144 ms** | **284 ms** | **0** | **48 ms** | **96 ms** |
| **`m03`** | **312 ms** | **312 ms** | **0.0002** | **72 ms** | **63 ms** |
| **`m04`** | **144 ms** | **320 ms** | **0** | **72 ms** | **128 ms** |
| **`m05`** | **152 ms** | **312 ms** | **0** | **48 ms** | **96 ms** |
| **`m06`** | **112 ms** | **376 ms** | **0** | **64 ms** | **96 ms** |
| **`m07`** | **168 ms** | **352 ms** | **0** | **48 ms** | **130 ms** |
| **`m08`** | **444 ms** | **444 ms** | **0** | **80 ms** | **96 ms** |
| **`m09`** | **352 ms** | **352 ms** | **0** | **80 ms** | **77 ms** |
| **`m10`** | **316 ms** | **532 ms** | **0** | **80 ms** | **78 ms** |
| **`synthese`** | **140 ms** | **328 ms** | **0** | **72 ms** | **176 ms** |

---

## 3. Suggestions (touchant aux outils communs ou à `D`)

Conformément aux consignes, aucun fichier commun ni `D` n'a été modifié. Voici les pistes relevées pour la suite :
1. **Légende d'indice gestuel dans `D.site.libelles` pour `m10`** : la règle 1 interdisant tout texte hors de `D`, l'affordance « tirer ou cliquer un titre » sur la scène de `m10` a été résolue graphiquement (médaillons photographiques sertis d'un anneau de prise et curseur `grab`). Si l'on souhaite un court sous-titre explicite sous `COMPAGNIE CRESCITE` (par ex. *« Tirez un titre vers la pieuvre ou choisissez une porte »*), il suffirait d'ajouter cette clé dans `D.site.libelles`.
2. **Mise à jour des textes d'analyse dans `maquettes/src/planche.html`** : plusieurs faiblesses décrites dans le comparateur (`planche.html`) pour `m01`, `m02`, `m03`, `m08`, `m09` et `m10` (absence de photos sur certaines pages *Programmer* / *Établissement*, absence de pieuvre dans `m02`, absence d'aperçu global au premier écran de `m09`, absence de photos sur la scène de `m10`, chronologie masquée dans `m03`) sont désormais corrigées dans les maquettes elles-mêmes ; les puces « Faiblesses » de `planche.html` pourront être actualisées lors de la phase de synthèse.
