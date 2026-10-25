# Consigne : la finition graphique des onze maquettes

## Le but

Porter chacune des onze maquettes du site public de la compagnie Crescite (théâtre) à un niveau de finition
professionnel, celui d'un studio de design : typographie, mise en page, couleurs, traitement des images, composants et
leurs états (survol, focus, appui, chargement), détails, téléphone compris.

**Chacune garde son idée et son caractère.** Les dix maquettes sont dix propositions que la compagnie compare pour
choisir, de la plus sobre (01) à la plus évoluée (10) ; la synthèse (`synthese.html`) assemble la proposition retenue.
Il ne s'agit pas de les rapprocher d'un même style, mais de pousser chacune plus loin dans le sien, et de corriger ses
faiblesses graphiques.

## Le dépôt, en bref

- `maquettes/src/m01.html` … `m10.html`, `synthese.html` : une maquette par fichier (HTML, CSS et script ensemble). Elles
  lisent tout leur contenu dans l'objet `D` que `maquettes/build.py` injecte, puis dans la base en temps réel (lecture
  seule).
- `maquettes/src/*.js` : les outils communs, insérés par le build (agenda, carte, données vivantes, ouverture sur le
  logo, édition sur place, dossier PDF, frises, mouvement, tentacules ; bientôt réservation, vidéos, jour et nuit, troupe).
- `maquettes/CONTRAT.md` : les règles 1 à 20 que suit chaque maquette. **Lis-le en entier avant de commencer.**
- `maquettes/src/planche.html` : pour chaque maquette, son principe (`principe`), ses forces (`plus`) et ses limites
  (`moins`). Les limites graphiques sont les premières choses à corriger.
- `README.md`, section « Maquettes ».

## Avant de commencer

```sh
git clone https://github.com/adrienvada/Crescite.git    # si le dépôt n'est pas déjà là
cd Crescite
git fetch origin
git switch -c graphisme origin/ccr-2a930e2f-48qjrr
python3 maquettes/build.py m01                          # → maquettes/dist/m01.html
python3 -m http.server 8000 -d maquettes/dist            # → http://localhost:8000/m01.html
```

- `private/` et `maquettes/dist/` ne sont jamais versionnés (`.gitignore`) : ne force jamais leur ajout.
- Le vrai logo 2.0 est dans `marque/` et les photos des spectacles dans `docs/photos/` : le build s'en sert tout seul.
  Si une version de travail montre une pieuvre de substitution à la place du logo, c'est que `marque/` manque : ne
  remplace pas le logo, et ne publie surtout pas (`build.py --pages` refuse d'ailleurs de publier sans lui). Le rendu
  publié se voit aussi dans les pages publiées, qui sont dans le
  dépôt : `python3 -m http.server 8001 -d docs` → http://localhost:8001/m01.html.
- Dans l'adresse : `?base=0` en reste aux données du build (sans la base), `?intro=0` saute l'ouverture sur le logo,
  `?anim=0` coupe les animations, `#/voir`, `#/programmer`, `#/etablissement`, `#/compagnie`… mènent aux vues.

## L'ordre : d'autres travaux sont en cours

En ce moment, sur la branche principale, d'autres modifications touchent le mouvement des maquettes 04 à 07 et la
synthèse (règles 17 à 20 : réserver une date d'un geste, les vidéos dans le site, le mode jour et nuit, la troupe).
Pour éviter les conflits :

1. Commence par **m01, m02, m03, m08, m09, m10**.
2. Ne touche à **m04, m05, m06, m07** et à **synthese.html** que quand Adrien te dit qu'ils sont libres. Ce jour-là,
   reprends d'abord la branche principale : `git fetch origin && git merge origin/ccr-2a930e2f-48qjrr`.
3. Ne pousse jamais sur `ccr-2a930e2f-48qjrr` et n'en réécris jamais l'historique : tu ne pousses que ta branche
   `graphisme`.

## Le périmètre

Tu modifies **seulement** les fichiers des maquettes (`maquettes/src/mNN.html`, puis `synthese.html`), surtout leur
CSS ; du balisage seulement quand le dessin l'exige, sans texte. Tu ne touches pas :

- aux outils communs `maquettes/src/*.js`, à `maquettes/build.py`, `onglets.mjs`, `reactivite.mjs`, `shoot.mjs`,
  `planche.html`, `CONTRAT.md` ;
- à `admin/`, `equipe/`, `pro/`, `reponse/`, `supabase/`, `data/`, `prototype/`, `docs/`. La publication se fait à
  part, après relecture : ne lance jamais `build.py --pages`.

Si une amélioration demande de changer un outil commun ou les données, ne la fais pas : note-la dans ton compte rendu.

## Ce qu'il faut garder

1. **Le texte (règle 1).** Tout texte visible vient de `D` : le texte de crescite.fr, les univers des spectacles, les
   intitulés de `D.site.libelles`. N'ajoute aucun texte : ni accroche, ni slogan, ni « Découvrir », ni faux contenu, ni
   texte dans une image ou dans un `content:` visible de `::before`/`::after`. Les éléments décoratifs sont muets
   (`aria-hidden="true"`). `onglets.mjs` compare chaque texte affiché aux sources et signale le moindre écart.
2. **Ce dont dépendent les scripts.** Ne renomme ni ne retire aucun `id`, aucune classe, aucun attribut `data-*` dont se
   sert un script (celui de la maquette ou un outil commun). Avant de toucher à un nom, cherche-le :
   `grep -n "le-nom" maquettes/src/*.js maquettes/src/mNN.html`. Garde en particulier `data-edit`, `data-date-id`,
   `data-agenda`, `.frise[data-frise]`, `data-moment`, et les routes `#/…`.
3. **Ce qui fait chaque maquette** : les trois entrées (« Je viens voir un spectacle », « Je souhaite programmer », « Je
   représente un établissement scolaire ») à portée dans le premier écran ; l'ouverture sur le logo (`INTRO`) ; la
   pieuvre et ses tentacules (`TENTACULES`, habillées par les variables `--tt-*`) ; la barre et les panneaux de
   l'édition sur place, habillés par les variables `--ed-*` (adapte-les à ton style au lieu de les retirer) ; la carte
   des tournées ; l'agenda complet ; la page des programmateurs ; l'univers de chaque spectacle (couleurs, police de
   titre, motif, photos, citations, pris dans `D` ; Bérénice suit la charte de son dossier).
4. **Le mouvement (règle 15).** Chaque maquette a sa signature de mouvement : garde-la ou affine-la, sans tentacule à
   chaque clic ordinaire. Respecte `prefers-reduced-motion`.
5. **La réactivité.** INP < 100 ms au bureau et < 200 ms sur téléphone ralenti ×4 ; contenu d'une page nouvelle
   < 150 ms ; aucune tâche de plus de 50 ms pendant un geste ; CLS < 0,05. Aucune bibliothèque externe (ni framework, ni
   GSAP) : du CSS et du JavaScript natifs. Les techniques récentes sont bienvenues quand elles servent (animations liées
   au défilement, transitions de vue, `@property`, requêtes de conteneur, `:has()`, `color-mix()`,
   `text-wrap: balance`), avec un repli propre là où elles manquent.
6. **Le téléphone et l'accessibilité.** Rien ne déborde à 360 px de large ; contraste AA (4,5:1 pour le texte, 3:1 pour
   les grands titres et les contrôles) ; focus visible ; tout se fait au clavier ; zones tactiles de 44 px au moins.
7. **Les couleurs en variables.** Toutes les couleurs passent par des variables CSS déclarées sur `:root`, aucune en dur
   dans les règles : une seconde palette (nuit ou jour) s'y ajoutera ensuite (règle 19). Ne crée ni bouton jour/nuit,
   ni bandeau de réservation, ni lecteur vidéo, ni section troupe (règles 17 à 20) : ils arrivent par les outils
   communs.

## Ce qui est interdit (le dépôt est public)

- Rien de `private/` dans Git ; aucune donnée personnelle (téléphone, courriel, adresse d'une personne), aucun prix ni
  montant, aucune clé.
- Aucune nouvelle photo : ni banque d'images, ni image générée, ni portrait. Seulement les images que donne `D`
  (photos des spectacles, logo), et des motifs ou textures dessinés en SVG ou en CSS.
- Polices : Google Fonts seulement, avec `display=swap`, et peu de familles (chacune a un coût).
- **N'écris jamais dans la base.** Les maquettes la lisent avec une clé publique. Ne te connecte pas à l'édition sur
  place (« Modifier le site ») : rien ne doit y être enregistré.
- Garde la balise `noindex` des pages, et n'écris nulle part dans le dépôt l'adresse du site publié.

## Les onze, et ce que chacune peut devenir

Ce sont des pistes : le principe de chacune (dans `planche.html`) fait foi.

- **m01, Le programme de salle** (la plus sobre) : un programme de théâtre imprimé. Pousser le livre : grille et rythme
  vertical, petites capitales, chiffres elzéviriens, filets fins, papier discret.
- **m02, La maison** (sobre) : la clarté d'un théâtre public. Rigueur de signalétique, couleur franche de chaque entrée.
- **m03, La saison** (l'agenda d'abord) : « quand et où ? ». Hiérarchie des dates, lisibilité de l'agenda et de la
  carte, filtres et recherche soignés.
- **m04, Trois portes** (le public d'abord) : la matière des portes, leur ouverture. Plus tard (voir l'ordre).
- **m05, Magenta** (la marque en grand) : aplats, pieuvre blanche, capitales larges. Plus tard.
- **m06, Les bras de la tournée** (la tentacule comme thème). Plus tard.
- **m07, Le noir et la lumière** (théâtral) : la scène dans le noir. Plus tard.
- **m08, Le sommaire** (éditorial) : une table des matières et son aperçu. Une mise en page de revue, de grands titres.
- **m09, Un spectacle par écran** (chapitres) : le plein écran, le passage d'un chapitre à l'autre, la photo.
- **m10, La pieuvre vivante, rangée** (la plus évoluée) : la scène, la pieuvre, la profondeur.
- **synthese** : l'accueil et les cartes de la 06, l'agenda de la 03, les trois entrées en portes, les univers les plus
  aboutis. Plus tard.

## Vérifier, maquette par maquette

Installe Playwright hors du dépôt :

```sh
mkdir -p ~/pw && cd ~/pw && npm init -y >/dev/null && npm i playwright && npx playwright install chromium
export PLAYWRIGHT_MODULE="$HOME/pw/node_modules/playwright/index.mjs"
export CHROMIUM="$(cd ~/pw && node -e "import('playwright').then(p => console.log(p.chromium.executablePath()))")"
```

Puis, dans le dépôt, avant de toucher à une maquette, relève son état de départ :

```sh
mkdir -p ~/verif/avant ~/verif/apres
python3 maquettes/build.py m01
node maquettes/shoot.mjs ~/verif/avant m01                     # captures : bureau et téléphone
EDITION=1 node maquettes/onglets.mjs ~/verif/avant m01          # le texte, les entrées, les vues, l'édition
node maquettes/reactivite.mjs ~/verif/avant m01                 # les budgets
```

Et après chaque étape, les mêmes commandes dans `~/verif/apres`, avec `--strict` pour `reactivite.mjs` :
aucune anomalie nouvelle, aucun budget dépassé. Regarde aussi les captures toi-même, à 1440, 390 et 360 px de large.

## Livrer

- Un commit par maquette (« Graphisme : m01, le programme de salle … »), puis `git push -u origin graphisme`.
- Un compte rendu dans `maquettes/GRAPHISME.md` : pour chaque maquette, ce qui a changé et pourquoi, le résultat des
  vérifications avant et après, et ce que tu n'as pas pu faire (un outil commun à changer, un intitulé absent de `D`).
- Ne versionne pas les captures.
