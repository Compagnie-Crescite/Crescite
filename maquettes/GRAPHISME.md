# Compte rendu de finition graphique (`m01`, `m02`, `m03`, `m08`, `m09`, `m10`)

Ce document présente le travail de finition graphique réalisé sur la branche `graphisme` pour les six premières maquettes (`m01`, `m02`, `m03`, `m08`, `m09`, `m10`), conformément à `maquettes/CONSIGNE-GRAPHISME.md` et `maquettes/CONTRAT.md`.

Chaque maquette a été poussée plus loin dans sa propre direction esthétique et corrigée des faiblesses relevées dans la planche de comparaison (`maquettes/src/planche.html`), tout en centralisant l'ensemble des couleurs dans `:root`, en garantissant des cibles tactiles d'au moins 44 px et en respectant strictement les budgets de performance et d'accessibilité.

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

| Maquette | FCP avant → après | LCP avant → après | CLS avant → après | INP max avant → après | Contenu max avant → après |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`m01`** | 216 ms → **116 ms** | 300 ms → **244 ms** | 0.0030 → **0.0054** | 48 ms → **32 ms** | 29 ms → **31 ms** |
| **`m02`** | 232 ms → **176 ms** | 232 ms → **176 ms** | 0.0004 → **0.0005** | 32 ms → **40 ms** | 62 ms → **62 ms** |
| **`m03`** | 132 ms → **160 ms** | 188 ms → **216 ms** | 0.0055 → **0.0002** | 48 ms → **40 ms** | 47 ms → **46 ms** |
| **`m08`** | 180 ms → **196 ms** | 180 ms → **196 ms** | 0.0035 → **0.0033** | 48 ms → **48 ms** | 60 ms → **59 ms** |
| **`m09`** | 116 ms → **136 ms** | 124 ms → **136 ms** | 0.0001 → **0.0006** | 72 ms → **72 ms** | 46 ms → **47 ms** |
| **`m10`** | 268 ms → **148 ms** | 332 ms → **224 ms** | 0.0004 → **0.0005** | 48 ms → **48 ms** | 46 ms → **61 ms** |

### Téléphone (`390×844`, processeur ralenti ×4)

| Maquette | FCP avant → après | LCP avant → après | CLS avant → après | INP max avant → après | Contenu max avant → après |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`m01`** | 260 ms → **164 ms** | 260 ms → **256 ms** | 0 → **0** | 168 ms → **56 ms** | 46 ms → **47 ms** |
| **`m02`** | 148 ms → **144 ms** | 264 ms → **284 ms** | 0 → **0** | 56 ms → **48 ms** | 96 ms → **96 ms** |
| **`m03`** | 456 ms → **312 ms** | 456 ms → **312 ms** | 0.0002 → **0.0002** | 88 ms → **72 ms** | 79 ms → **63 ms** |
| **`m08`** | 360 ms → **444 ms** | 360 ms → **444 ms** | 0 → **0** | 72 ms → **80 ms** | 97 ms → **96 ms** |
| **`m09`** | 348 ms → **352 ms** | 348 ms → **352 ms** | 0 → **0** | 80 ms → **80 ms** | 77 ms → **77 ms** |
| **`m10`** | 176 ms → **316 ms** | 524 ms → **532 ms** | 0 → **0** | 80 ms → **80 ms** | 79 ms → **78 ms** |

---

## 3. Suggestions (touchant aux outils communs ou à `D`)

Conformément aux consignes, aucun fichier commun ni `D` n'a été modifié. Voici les pistes relevées pour la suite :
1. **Légende d'indice gestuel dans `D.site.libelles` pour `m10`** : la règle 1 interdisant tout texte hors de `D`, l'affordance « tirer ou cliquer un titre » sur la scène de `m10` a été résolue graphiquement (médaillons photographiques sertis d'un anneau de prise et curseur `grab`). Si l'on souhaite un court sous-titre explicite sous `COMPAGNIE CRESCITE` (par ex. *« Tirez un titre vers la pieuvre ou choisissez une porte »*), il suffirait d'ajouter cette clé dans `D.site.libelles`.
2. **Mise à jour des textes d'analyse dans `maquettes/src/planche.html`** : plusieurs faiblesses décrites dans le comparateur (`planche.html`) pour `m01`, `m02`, `m03`, `m08`, `m09` et `m10` (absence de photos sur certaines pages *Programmer* / *Établissement*, absence de pieuvre dans `m02`, absence d'aperçu global au premier écran de `m09`, absence de photos sur la scène de `m10`, chronologie masquée dans `m03`) sont désormais corrigées dans les maquettes elles-mêmes ; les puces « Faiblesses » de `planche.html` pourront être actualisées lors de la phase de synthèse.
