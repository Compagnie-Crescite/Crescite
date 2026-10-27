# L'administration à l'ordinateur, au niveau suivant : le plan d'implémentation

Dix-sept lots pour l'administration de la compagnie Crescite (`admin/`), à l'ordinateur seulement (≥ 641 px, pointeur
fin) : un menu latéral repliable, des accès rapides, toutes les fenêtres ajustables, un tableur « à la Excel » très
simplifié sur les dates, chaque champ possible renseignable, la distribution, la sélection par icônes entre liste,
tableur et carte, le tout très visuel, clair et professionnel. Les socles d'abord, un banc avant chaque refonte, rien
de réécrit deux fois ; le menu latéral est le troisième lot livré. Le téléphone (`admin/mobile.js`, < 640 px) ne change
pas et ses bancs restent verts. Chaque fichier:ligne cité a été relu dans le dépôt le 27 octobre 2026 ; les numéros
sont ceux de ce jour et dérivent dès le premier lot : on cherche l'ancre (le nom cité), jamais le numéro seul. Le
prompt qui lance l'implémentation est à côté : `admin/ORDINATEUR-PROMPT.md`.

## 1. Ce qu'Adrien verra

**La coque.** L'administration s'ouvre dans un cadre qui ne bouge plus d'une page à l'autre. En haut, l'en-tête de nuit
qu'on connaît (la pieuvre et « Compagnie Crescite · Administration », la loupe « Rechercher Ctrl K », le témoin
« À jour », le compte, « ? », « Se déconnecter »), sur une seule ligne à toutes les largeurs : il a perdu les douze
rubriques qui l'obligeaient à se plier sur deux ou trois rangées. À gauche, sous cet en-tête, un menu vertical de la
même nuit, qui prolonge la barre vers le bas comme un « L » sombre. Chaque rubrique y a son icône et son nom ; la
rubrique ouverte est blanche, portée par un filet à la couleur de la saison ; un petit badge dit combien de choses
attendent (« 11 » sur Tableau de bord, « 3 » sur Diffusion). Sous les rubriques, « ＋ Créer » (une date, une séance, une
fiche, un lieu, une opportunité…), les accès **épinglés** qu'on choisit soi-même (le tableur, les feuilles de route, le
planning, les devis…), puis les **cinq dernières fiches ouvertes** : revenir à la date de Pont-Audemer qu'on avait sous
les yeux il y a dix minutes prend un clic. Tout en bas, les réglages d'interface : nuit, jour ou comme l'appareil ;
confortable ou compact ; « Pleine largeur » ; « Disposition d'origine » ; et « ‹ Replier ». Replié (le bouton, ou
Alt+M, ou de lui-même sur un portable de moins de 1 340 px), le menu ne garde que ses icônes sur 64 px, le nom paraît au
survol, et le contenu s'élargit d'autant, en un cinquième de seconde, sans saut. Il reste comme on l'a laissé, sur cet
ordinateur comme sur l'autre, parce que le choix est gardé avec le compte. Au téléphone, rien n'a bougé : la barre du bas
et « Plus » sont toujours là.

**Représentations** s'ouvre sur la dernière vue qu'on y a choisie. En tête de la rubrique, une pilule à trois icônes,
toujours au même endroit : **Liste** (trois lignes), **Tableur** (une grille), **Carte** (une épingle), le nom écrit à
côté, la vue ouverte en dégradé de la saison. On passe de l'une à l'autre d'un clic ou de deux touches (V puis L, T ou
C), et les filtres suivent : la recherche, la saison, le spectacle, la période (à venir, passées, toutes), le statut et
le public restent les mêmes d'une vue à l'autre, et l'adresse les porte : un lien envoyé à l'administratrice rouvre
exactement la même vue, filtrée de la même façon.

**Le tableur** a trois boutons en tête : **Simple**, **Complet**, **Distribution**. En Simple, une ligne par date et six
grandes colonnes : le jour (un petit calendrier au bandeau de la couleur du spectacle), les séances (des pastilles
d'heures : « 15h », « 20h30 »), le spectacle, le lieu, le statut (un badge coloré), qui part (des initiales qui se
chevauchent). On clique une case, on tape, Entrée : la case passe en italique le temps d'enregistrer, puis une coche
verte paraît dans son coin et s'efface ; une erreur cerne la case de rouge et l'explique dans la barre fine sous le
tableau, avec « Annuler ». Sur le jour, un petit calendrier se pose sous la case ; on peut aussi taper « 5/11 »,
« jeudi 5 nov », « 05-11-2026 », et coller quinze lignes reçues d'un théâtre telles qu'Excel les copie (« 20:30:00 »
compris) : ce qui n'a pas été compris se surligne et se dit. En Complet, une ligne par séance et toutes les colonnes,
dont celles qui manquaient (la ligne du site, les précisions, le nombre de représentations, la billetterie d'une
séance, et, si Adrien le veut, le suivi de diffusion), rangées en jeux nommés (Site, Tournée, Suivi, Bilan,
Diffusion) ; chaque colonne se règle comme dans Excel : on tire son bord, un double-clic l'ajuste, on la masque, on la
fige, on la déplace, et tout est retenu. Depuis n'importe quelle ligne, Ctrl+Entrée ouvre la fiche complète dans un
tiroir à droite, sur le champ voulu, sans quitter la grille. En Distribution, une grille dates × personnes : une case par
personne et par date, cochée si elle part, barrée si elle ne part pas, marquée si c'est un remplaçant ; un clic change
la case, et les trous d'une tournée sautent aux yeux.

**Les fenêtres** se règlent toutes à la main : le tiroir d'une fiche par son bord gauche, la colonne de la liste à côté
d'une fiche, les colonnes et la hauteur du tableur, les boîtes de la recherche, de la distribution, du briefing, de
l'aide et des formulaires par leur coin, le détail du planning, la carte et ses étapes, la hauteur des tuiles du tableau
de bord ; l'éditeur A4 des feuilles de route gagne un zoom. Une poignée discrète sur le bord, un double-clic pour
revenir à la taille d'origine, et chaque taille est retenue avec le compte, bornée à l'écran du moment pour qu'un
réglage pris sur un 27 pouces ne déborde pas d'un portable.

**Une journée.** Le matin, l'administratrice ouvre Représentations en Tableur Simple, colle les quinze dates reçues du
théâtre de Caen, corrige deux heures, voit les coches vertes à chaque enregistrement. Elle bascule en Distribution,
décoche Lauren sur les trois dates de janvier, ajoute un renfort régie avec sa fonction, lit « 2 personnes seront
prévenues » avant d'enregistrer, puis « Étendre à… » le pose sur la suite de la tournée. Adrien, de son côté, reçoit
l'appel d'un programmateur : Ctrl K, « volcan », la date s'ouvre en tiroir, il élargit le tiroir d'un geste pour lire le
suivi, répond, ferme. L'après-midi, la Carte : les enchaînements serrés de mars se voient, une pastille ouvre les dates
du lieu, « Nouvelle date ici » prépare la suivante. Avant de partir, « À compléter avant la tournée » et la jauge de
complétude de chaque fiche disent ce qui manque encore, et le champ visé s'allume quand on y va. Le soir, il passe en
jour pour relire la planche de captures que la main lui a envoyée.

## 2. Hypothèses et décisions

Les décisions de cadrage, reformulées (elles s'imposent) :

- Les huit attentes sont toutes couvertes ; le périmètre est l'ordinateur (≥ 641 px, pointeur fin) ; mobile.js (< 640 px) ne change pas et ses bancs restent verts.
- L'en-tête `.barre` reste pleine largeur, arrimé, et perd la nav des rubriques à l'ordinateur ; `#b-sortir` et `#b-mdp` y restent (la feuille « Plus » du téléphone les clique, mobile.js:87-88).
- Un `<aside class="menu">` contenant `<nav aria-label="Rubriques">` prend les rubriques, les accès rapides et les réglages ; à gauche de `main#vue`, sticky sous l'en-tête, repliable en icônes, replié d'office sous 1 340 px, masqué sous 640 px.
- La coque se construit une fois ; `cadre(rubrique, contenu)` garde sa signature (une trentaine d'appelants) et ne remplit plus que `#vue` ; les écrans de connexion, de mot de passe et le squelette restent ; la coque se reconstruit si elle manque.
- `--haut-barre` reste la hauteur de ce qui est arrimé en haut ; l'aside porte un `view-transition-name`.
- Un outil commun `admin/prefs.js` (PREFS.charger / lire / ecrire / surChangement / normaliser / etat), chargé juste après le script principal ; par compte (crescite_preferences, script 6), miroir local par compte, repli « gardé sur cet appareil », écriture débouncée ou au relâchement, vidage au pagehide ; tableau.js et disponibilites.js passent dessus ; equipe/equipe.js n'est pas touché.
- Clés : `menu.replie`, `menu.epingles`, `fenetres.*` (bornées à l'écran à la lecture), `tableur.colonnes`, `tableur.mode`, `representations.vue`, `theme`, `densite` ; les récents en sessionStorage ; BroadcastChannel entre onglets, pas de temps réel des préférences.
- Le thème : la nuit reste le défaut ; nuit / jour / appareil dans le menu, appliqué depuis `<head>` par le miroir local.
- Trois vues Liste / Tableur / Carte par un sélecteur à icônes (liens + `aria-current="page"` dans `<nav aria-label="Vue">`, libellé masqué sous 1 100 px, title + .sr, V L / V T / V C) ; une vue Mois seulement en option.
- La dernière vue est retenue (`representations.vue`) ; `#/representations` nu y mène ; l'adresse explicite reste la vérité des liens partagés.
- Un seul état de filtres `session.dates` (q, saison, spectacle, periode, statut, public) déclaré une fois dans LISTES_ADRESSE ; tri, colonnes vides, serré, saisons ouvertes hors adresse.
- TABLEUR sort vers `admin/tableur.js` sans changement de comportement, sous un banc `site/tableur.mjs` écrit avant.
- Trois modes Simple / Complet / Distribution dans l'en-tête du tableur, dans l'adresse et dans `tableur.mode` ; colonnes à la carte dans `tableur.colonnes`.
- Chaque champ atteignable : par une colonne s'il est simple, par le tiroir (Ctrl+Entrée) s'il est riche ; un schéma déclaratif unique SCHEMA_DATE alimente la fiche, les colonnes, les feuilles, l'import et l'export.
- Les colonnes de diffusion du suivi forment un jeu « Diffusion » masqué par défaut, jamais exporté sans case explicite : à faire valider par Adrien.
- La version 3 de `crescite_enregistrer_date` est un lot base à part, avec son essai SQL ; le plan dit ce qui marche sans elle.
- `admin/fenetres.js` : FENETRES.poignee(el, {axe, bord, min, max, lire, ecrire, defaut}), Pointer Events, rôle separator (flèches ±16, Maj ±64, Début/Fin, Entrée = défaut), double-clic = origine, `html.redim`, une seule langue visuelle (6 px, ligne de 2 px), poignées seulement sous `(min-width: 641px) and (pointer: fine)`.
- Surfaces : tiroir, colonne liste de `.deux`, colonnes et hauteur du tableur, fenêtres posées, boîtes de la charte (recherche, tab-dialogue, brief, aide, GESTES.formulaire sous html.admin), détail du planning, carte, tuiles ; zoom A4 ; les deux modales CRM inline passent en `dialog.tab-dialogue`.
- `admin/icones.js` unique (viewBox 24, trait 2, currentColor, aria-hidden), née de GESTES.ICO ; un jeu d'états partagé, une classe `.etiquette`, des vides illustrés sans image, une densité au pointeur fin seulement.
- Le mouvement reste celui de site/MOUVEMENT.md ; rien sous reduced motion ni `?anim=0` ; budget 200 ms à CPU=4.
- Un banc Playwright par lot (< 60 s) sur admin-fictif.mjs, les quatre bancs existants relancés ; le harnais gagne `order=`, `polices: true`, `reduit: true` ; `site/bancs-admin.sh` ; pas de CI.
- Le premier lot corrige la dérive du README (57 → 65, 115 → 137, adresses-admin.mjs) et amende les repères figés par tableau.mjs:528-545.
- Chaque lot : module avec en-tête, ligne dans index.html, tuple de build.py, paragraphe README (section Administration), MOUVEMENT.md si mouvement, `python3 site/build.py --pages`, commit des sources et de docs/admin/* seulement, message en français avec un corps.
- Raccourcis : Alt+M, « G puis lettre », « V puis L / T / C », déclarés une fois dans un registre RACCOURCIS.
- Ni CI, ni bibliothèque, ni changement du site public ou de l'espace de l'équipe hors ce que gestes.js, planning.js et feuille.js imposent (défauts inchangés ; poignées sous html.admin).

Les décisions du plan (ce que le cadrage laissait ouvert, tranché ici) :

- Les socles d'abord, en deux lots serrés (socle + filet ; icônes + extraction) : le menu latéral est le troisième lot livré, en deuxième semaine.
- Le module de la coque s'appelle `admin/cadre.js` (CADRE), chargé après tournee.js et avant mobile.js ; `poserCoque()` reste dans le script principal à côté de `cadre()` ; le crochet `APRES_VUE.push(CADRE.marquer)` se pose depuis cadre.js, comme menus.js:307 et tiroir.js:175, jamais à index.html:1284 (CADRE n'existe pas quand cette ligne s'exécute).
- La `<nav class="nav" aria-label="Rubriques">` garde sa classe dans l'aside (tableau.mjs:23 et mouvement-admin.mjs:130 continuent de marcher) ; les règles `.nav` d'index.html:78-81 sont réécrites sous `.menu` pour la verticale ; celles de nuit (habillage.js:56-58) sont reprises.
- Un seul miroir d'appareil, `crescite-admin-apparence` (thème, densité, menu replié), lu par un `<script id="apparence">` inline dans `<head>` avant la feuille de style : pas d'éclair, le menu naît replié sans saut.
- Le registre RACCOURCIS vit dans le script principal (à la place de l'écouteur 1492-1495) ; un seul écouteur, qui ignore `e.defaultPrevented`, un champ (GESTES.dansChamp), une modale (GESTES.modaleOuverte), un menu (GESTES.ouvert()) et un `activeElement` dans `[role="grid"]` ; une séquence dure 900 ms, un témoin « G… » le dit.
- `menu.epingles` est une clé propre (initialisée depuis ACTIONS_DEFAUT, tableau.js:102) : le menu est un raccourci permanent, la tuile « actions » une page d'ouverture ; une étoile dans la tuile épingle dans le menu.
- Les tailles de fenêtres sont par compte, bornées en px et en vw à la lecture et au resize ; une seule largeur de tiroir, une seule largeur de liste pour les sept pages en `.deux` ; une seule clé `fenetres` (un objet), écrite au relâchement du geste.
- Les boîtes se redimensionnent par un coin, elles ne se déplacent pas (le centrage natif des `<dialog>` est gardé).
- Le mode par défaut est Simple ; le dernier mode vu est retenu ; Simple = une ligne par date (les heures en pastilles), les colonnes de niveau « séance » n'y sont pas montrées.
- COLONNES n'est écrite qu'une fois : SCHEMA_DATE (lot 8) avant les colonnes à la carte (lot 10, qui dérive COLONNES du schéma) avant les modes (lots 11-12, qui n'allument que des champs) ; le CSS du tableur passe en variables une seule fois (lot 10).
- Le rail `ecrireChamps(dateId, patch)` envoie toujours la date entière (dateVersForm → chargeDate → ecrireDate) ; raccourcis « équipe seule » / « chiffres seuls » ; la sélection groupée garde ses `update … in()` d'une colonne (ils n'effacent rien), documentés comme l'exception.
- La version 3 du RPC est conservatrice pour tous ses appelants (clé absente = valeur gardée) et expose `crescite_capacites()` ; c'est le dix-neuvième script (README:954 nomme déjà le dix-huitième).
- Le tableur se redessine par ligne pour le temps réel ; un bloc de banc pousse 300 dates × 2 séances et mesure le budget à CPU=4.
- Dans la grille, les portraits sont des initiales (aucune URL signée) ; les photos n'apparaissent que dans la fenêtre de distribution et la matrice ; `avatar(p, petit)` (equipe.js:86) est booléen et `.avatar.petit` fait 30 px (3321) : la variante 24 px est une création.
- La distribution vit dans un module `admin/distribution.js` à part (cellule, fenêtre, matrice, impact) : equipe.js fait déjà 3 519 lignes et tableur.js n'a pas à porter 300 lignes de plus.
- Valeur d'office commune des filtres : période « À venir », toutes saisons, tous spectacles ; la carte montre les annulées seulement quand le statut « Annulées » est choisi.
- Les composants nés entre le lot 3 et le lot 16 emploient les classes existantes (`.btn`, `.seg a`, `.puce`, le `:focus-visible` d'index.html:54) : le lot 16 unifie les états sans rien réécrire.
- Le menu est de nuit dans les deux thèmes, comme l'en-tête (habillage.js:52) : la coque est sombre, le contenu prend le thème (question 2 à Adrien).
- Les conflits d'édition : un bandeau « Modifiée ailleurs » dans la fiche ouverte (lot 8) ; un verrou optimiste côté base reste hors plan.
- La vue Mois n'est pas dans ce plan ; la route (index.html:1272) reste prête.

## 3. L'architecture cible

### Modules nouveaux et modifiés

| Module | État | Rôle | Lots |
| --- | --- | --- | --- |
| `admin/prefs.js` (PREFS) | nouveau | les préférences par compte : une requête, cache, miroir local par uid, écriture débouncée, BroadcastChannel, migration des clés locales | 1 |
| `admin/icones.js` (ICONES) | nouveau | la bibliothèque d'icônes unique, `ICONES.svg(nom, { taille, trait, classe })`, `ICONES.ICO`, `ICONES.ornement` | 2 |
| `admin/tableur.js` (TABLEUR) | nouveau | l'IIFE index.html:2399-3422 sortie telle quelle, puis les colonnes à la carte, les modes, le visuel | 2, 7, 10, 11, 12 |
| `admin/cadre.js` (CADRE) | nouveau | le menu latéral, ses badges, les accès rapides, les réglages d'interface, le marquage après chaque vue | 3, 4, 5, 6 |
| `admin/fenetres.js` (FENETRES) | nouveau | la poignée commune, les bornes, la mémoire des tailles, « Pleine largeur », « Disposition d'origine » | 6, 10, 14 |
| `admin/distribution.js` (DISTRIBUTION) | nouveau | la cellule à avatars, la fenêtre enrichie, la matrice, le volet d'impact | 13 |
| `admin/index.html` (script principal) | modifié | poserCoque / cadre allégé, RACCOURCIS, `<script id="apparence">`, choixVueDates, filtresDates, SCHEMA_DATE, ecrireChamps, la recherche enrichie, les modales CRM, le CSS | 3, 4, 5, 6, 7, 8 |
| `admin/tableau.js`, `admin/disponibilites.js` | modifiés | consommateurs de PREFS ; ACTIONS et urgences lus par le menu ; TRAITER sur le rail ; hauteur des tuiles | 1, 3, 4, 8, 14 |
| `admin/tiroir.js`, `admin/menus.js`, `admin/gestes.js`, `admin/planning.js`, `admin/tournee.js`, `admin/equipe.js`, `admin/selection.js`, `admin/parcours.js`, `admin/gardefous.js` | modifiés à la marge | poignées (sous html.admin pour les modules partagés), aide depuis le registre, « Voir dans le tableur » visé, blocEquipeDate, carte de travail | 3, 6, 7, 8, 13, 14, 15 |
| `admin/mobile.js` | modifié | consomme ICONES ; `html.ob-actif .menu { display: none }` ; rien d'autre | 2, 3 |
| `admin/habillage.js` | modifié | l'apparence du menu, de la pilule des vues, des poignées, du tableur ; le jeu d'états, `.etiquette`, la densité | 3, 5, 6, 7, 11, 16 |
| `supabase/migrations/20261107_crescite_enregistrer_date_3.sql` | nouveau | la version 3 du RPC et `crescite_capacites()` | 9 |
| `site/*.mjs`, `site/bancs-admin.sh` | nouveaux | un banc par lot, le script qui enchaîne tout, la planche | tous |

### L'ordre de chargement (index.html:691-697 et 4583-4608, numéros d'aujourd'hui)

```
691 vendor/supabase.js · 692 agenda.js · 693 logo.js · 694 tentacules.js
    icones.js          ← lot 2, avant gestes.js (696) : le script principal s'en sert au chargement (LOUPE 1507, CHEVRON_FIL 1352)
696 gestes.js            (son ICO prend ICONES.ICO quand elle est là, sinon ses tracés : l'espace de l'équipe ne change pas)
697 <script> principal   (E, RACCOURCIS, poserCoque / cadre, SCHEMA_DATE, ecrireChamps, choixVueDates, filtresDates, la recherche)
    prefs.js           ← lot 1, juste après le script principal, avant feuille.js (4583) : ses premiers consommateurs suivent
4583 feuille.js · 4584 equipe.js
    distribution.js    ← lot 13, après equipe.js (avatar, equipeDate, enregistrerEquipeDate), avant planning.js (4587)
4587 planning.js · 4588 disponibilites.js · 4590 tableau.js
    tableur.js         ← lot 2, après tableau.js, avant menus.js (4592) ; TABLEUR n'est appelé qu'au routage, après chargerTout
4592 menus.js · 4596 corbeille.js
    fenetres.js        ← lot 6, après corbeille.js, avant tiroir.js (4597) qui lit FENETRES.taille à l'ouverture
4597 tiroir.js · 4598 selection.js · … · 4604 fond-carte.js · 4605 tournee.js
    cadre.js           ← lot 3, après tableau.js (ACTIONS, urgences), menus.js (ouvrirAide) et tournee.js, avant mobile.js (4606)
4606 mobile.js
4608 habillage.js        (dernier : rien que l'apparence)
```

Chaque nom nouveau entre dans le tuple de `site/build.py:1116-1118` (sinon ni site/dist/admin ni docs/admin ne l'ont) ;
le service (sw.js:8, 12) n'a rien à lister. Les déclarations `const` et `function` du script principal (un script
classique, `'use strict'` à la ligne 698, sans IIFE) sont visibles des scripts suivants : l'extraction du tableur n'a
rien à exporter. `TABLEUR` est un objet littéral rendu à la ligne 3422, non gelé : `TABLEUR.choixVue = choixVueDates`
est permis le temps que tournee.js:42 et 47 appellent la nouvelle fonction.

### Les clés de préférence (crescite_preferences, script 6 ; documentées en tête du script, lignes 9-16, et README:778-783)

| Clé | Valeur | Écriture | Lot |
| --- | --- | --- | --- |
| `representations.avant` | `{ ouvert, jours }` (migrée de `crescite-admin-avant`, index.html:1962-1963) | aussitôt | 1 |
| `menu.replie` | booléen ; seul le choix explicite est écrit (le défaut dépend de la largeur) | aussitôt | 3 |
| `menu.epingles` | `[clé d'ACTIONS…]` ≤ 12, normalisée contre TABLEAU.ACTIONS (84-101), défaut ACTIONS_DEFAUT (102) | aussitôt | 4 |
| `theme`, `densite` | `'nuit' \| 'jour' \| 'appareil'` ; `'confortable' \| 'compacte'` (+ miroir `crescite-admin-apparence`) | aussitôt | 5 |
| `fenetres` | un objet `{ tiroir, liste, pleine, recherche, 'tab-dialogue', 'tab-dialogue-large', 'tb-brief', 'gq-aide', gf, 'tableur-h', 'tab-pop-lieu', 'tab-pop-distribution', 'tab-ed-<k>', 'pl-detail', tn, 'a4-zoom' }` en px (pleine : booléen ; a4-zoom : %), bornés à la lecture en px et en vw | au relâchement du geste | 6, 10, 14 |
| `representations.vue` | `'liste' \| 'tableur' \| 'carte'` | aussitôt | 7 |
| `tableur.colonnes` | `{ ordre: [k…], masquees: [k…], figees: n, largeurs: {k: px}, vides: bool, jeu: nom }` normalisé contre COLONNES (clés inconnues ignorées, colonnes dont `si()` est faux tolérées, largeurs 48-640 px) | 700 ms (largeurs au relâchement) | 10, 12 |
| `tableur.mode` | `'simple' \| 'complet' \| 'distribution'` (aussi `?mode=` dans l'adresse) | aussitôt | 11 |

Hors base : `crescite-prefs:<uid>` (le miroir par compte, avec un drapeau `attente`), `crescite-admin-apparence`
(thème, densité, menu replié : par appareil, pour le premier dessin), `crescite-admin-recents` (sessionStorage, cinq
fiches), `crescite-admin-filtres` (inchangé : `session`, index.html:783-785), `session.dates.cible` (la ligne visée) et
le viewBox de la carte (session). Migration douce à la première lecture : `crescite-admin-tableau` → `accueil.tableau`,
`crescite-planning-masques` → `planning.masques`, `crescite-admin-avant` → `representations.avant`.

### Le schéma déclaratif de la date (SCHEMA_DATE, index.html à côté de dateVersForm 2078)

```js
// un champ = { k, l, aide, table: 'dates'|'representations'|'dates_suivi'|'dates_chiffres'|'equipes', colonne,
//   niveau: 'date'|'seance'|'lieu'|'suivi'|'diffusion'|'chiffres'|'equipe'|'lecture',
//   type: 'jour'|'heure'|'choix'|'spectacle'|'lieu'|'equipe'|'lien'|'texte'|'long'|'riche'|'nombre'|'montant'|'case'|'lecture',
//   choix?, si?: () => bool (E.sql3, E.equipeInstallee, E.chiffresInstalles, E.ideale), derive?: F => 'la raison' (saison, debut/fin/precision
//   avec séances, public, visible hors nature publiable), confidentiel?: true (jeu Diffusion), jeux: ['site'|'tournee'|'suivi'|'bilan'|'diffusion'],
//   colonne?: { largeur, icone, toujours? } (absent : le champ ne vit que dans la fiche), entetes: /regex d'import/, exporte: bool,
//   val: x => v, texte: x => s, html?: x => s, lire: (t, x) => v | undefined, ecrire: (F, x, v) => {} }
```

Une entrée par colonne de crescite_dates (base.sql:122-151), crescite_representations (153-166), crescite_dates_suivi
(170-178 + ideale.sql:125-131), crescite_dates_chiffres (chiffres.sql:16-24) et des écarts d'équipe (equipe.sql:87-96 :
fonction, note). Il alimente : COLONNES du tableur (`colonneDe(champ)`, même contrat que le commentaire 2484-2486), les
libellés, aides et puces dérivées de la fiche (editeurDate 2108-2283), la section « Diffusion » de la fiche, les feuilles
TRAITER (tableau.js:745-788 : `SCHEMA_DATE.champs(['contrat', 'organisateur'…])`), l'import (`entetes` remplace
ENTETES_LUS 3329-3333), l'export (`exporte`, `confidentiel`) et l'essai « aucun champ oublié » (lot 8).

### Les rails d'écriture

1. `ecrireDate(F, d0, { libre })` (index.html:2311-2318) reste le seul chemin vers la base pour une date : le RPC avec chargeDate (2285-2304), puis ecrireChiffres (2091), puis enregistrerEquipeDate (equipe.js:1180), puis rechargerDate (2338) ; avec la version 3 (`E.capacites.enregistrer_date >= 3`), un seul appel et une relecture qui couvre aussi les chiffres et l'équipe.
2. `ecrireChamps(dateId, patch, { dire, annulable })` (nouveau, à côté de 2311, lot 8) : `dateVersForm(d)` → le `ecrire` de chaque champ du schéma → `manqueDate` (2306) → `ecrireDate` → la phrase d'état ; raccourcis : un patch qui ne touche que `equipe` passe par enregistrerEquipeDate, que `chiffres` par ecrireChiffres. Consommateurs : le tableur (`ecrire`, ex-2825), TRAITER.options / heures / contrats (tableau.js:745-788), la fenêtre de distribution, la matrice, le tiroir.
3. Avant la version 3, les cinq colonnes de diffusion (ideale.sql:125-131) s'écrivent par un upsert direct de crescite_dates_suivi après le RPC (comme TRAITER.contrats aujourd'hui, tableau.js:784-785) ; avec elle, dans `suivi` du RPC.
4. Exceptions documentées : la sélection groupée (selection.js:1-11 : `update … in()` d'une colonne), les feuilles du téléphone (equipe/equipe.js, hors périmètre).

### Les bancs

Un banc par lot, chacun sous 60 s, sur `site/admin-fictif.mjs` (ouvrir, DB, ECRITURES, MODIFS, ok, calme, bilan :
lignes 121-196) ; les lignes ajoutées à DB le sont dans le bloc du banc (`DB.x.push` avant `ouvrir`, patron
niveau.mjs:275), jamais au niveau partagé (tableau.mjs:36 compte le badge « 11 »). La base fictive a sept dates : 104
est passée (`plus(-40)`, admin-fictif.mjs:53), la date 103 a deux séances (10:00 et 14:30, ligne 57), 101 une seule
(20:00) : avec la période « à venir » d'office, un mode Simple montre 6 lignes et un mode Complet 7. Bancs : `prefs.mjs`
et `tableur.mjs` (lot 1), `icones.mjs` (2), `cadre.mjs` (3), `acces.mjs` (4), `theme.mjs` (5), `fenetres.mjs` (6),
`vues-dates.mjs` (7), `champs.mjs` + `supabase/tests/champs.mjs` (8), `supabase/tests/enregistrer3.mjs` (9),
`tableur-colonnes.mjs` (10), `tableur-simple.mjs` (11), `tableur-complet.mjs` (12), `distribution.mjs` (13),
`fenetres-2.mjs` (14), `carte-travail.mjs` (15), `habillage.mjs` (16), `planche.mjs` (17, hors quota). Le harnais gagne
`reduit: true` (reducedMotion, comme mouvement-admin.mjs:59), `polices: true` (ne pas couper fonts.g* à la ligne 124)
et `order=col.asc|desc` dans le GET simulé (137-144). `site/bancs-admin.sh` enchaîne `python3 site/build.py` puis tous
les bancs admin et s'arrête au premier rouge ; `mouvement-equipe.mjs` est relancé dès que planning.js ou gestes.js
bougent.

## 4. Les lots

### Lot 1 — Le socle : prefs.js, le harnais, le filet des bancs, le README

**Objectif.** Vérifier avant de toucher : un outil commun des préférences, un banc du tableur d'aujourd'hui, des
repères de bancs tolérants à la future coque, un harnais prêt pour les lots de bureau, un script qui enchaîne tout, un
README dont les comptes sont vrais.

**Ce que voit Adrien à la fin du lot.** Rien de nouveau à l'écran : le tableau de bord et les personnes masquées du
planning se comportent comme avant, y compris « gardée sur cet appareil » sans le script 6. Une annonce discrète, une
fois par session, dit où un réglage est gardé (« avec votre compte » ou « sur cet appareil »). Un script
`site/bancs-admin.sh` construit et lance tous les bancs.

**Fichiers et lignes touchés.**
- `admin/prefs.js` (nouveau).
- `admin/index.html` 1053 et 1068 (chargerTout : `PREFS.charger()` attendu avant `TABLEAU.charger()`), 1188-1190 (actualiser relit les préférences), 1962-1963 (reglagesAvant / garderAvant → `representations.avant`), 4583 (ligne de script avant feuille.js).
- `admin/tableau.js` 22-27 (CLE_PREF, CLE_LOCAL, absent, uid), 355-398 (devient consommateur), 455 et 645 (libellés conservés).
- `admin/disponibilites.js` 93-121 (planning.masques par PREFS).
- `site/admin-fictif.mjs` 121-124 (ouvrir : `reduit`, `polices`), 137-144 (GET : `order=`).
- `site/tableau.mjs` 23 (`.barre.douze` n'est plus exigée), 530-535 (repères : le filtre `hors` accepte `.coque` ; `nav[aria-label="Rubriques"]` sans préfixe `header`).
- `site/niveau.mjs` 244 (au téléphone : la nav des rubriques absente ou masquée, `.barre .nav` ou `aside.menu`).
- `site/mouvement-admin.mjs` 130 (`nav[aria-label="Rubriques"] a[href="#/spectacles"]`).
- `site/tableur.mjs`, `site/prefs.mjs`, `site/bancs-admin.sh` (nouveaux) ; `site/build.py` 1116-1118.
- `README.md` 24-33 (commandes), 318-321 (115 → 137), 389-391 (57 → 65), un paragraphe pour adresses-admin.mjs (116 vérifications, shots-adresses/), 778-783 (la convention des clés) ; `site/MOUVEMENT.md` 43-50 (la liste des bancs) ; `supabase/migrations/20261025_crescite_preferences.sql` 9-16 (commentaire des clés, sans migration).

**Étapes.**
1. `admin/prefs.js` (IIFE, `'use strict'`, en-tête d'API) : `PREFS.charger()` lit en une requête `select cle, valeur, modifie_le` du compte (cache `P.valeurs` par uid ; erreur → `etat` 'absent' par la regex absent() reprise de tableau.js:26, sinon 'erreur') ; `PREFS.lire(cle, defaut)` synchrone depuis le cache puis le miroir local ; `PREFS.ecrire(cle, valeur, { aussitot })` : miroir local tout de suite (clé `crescite-prefs:<uid>`, objet `{ valeurs, attente: [cles] }`), base 700 ms après le dernier geste de la même clé dans une file sérialisée `P.file`, 401/403 regroupés en une seule annonce ; `PREFS.surChangement(cle, fn)` ; `PREFS.normaliser(cle, fn)` (la remise d'équerre appelée à la lecture, modèle de normaliser tableau.js:323) ; `PREFS.etat()` ; `pagehide` vide la file.
2. La règle de conflit sans horloge : une clé en `attente` dans le miroir l'emporte sur la base et se renvoie ; sinon la base gagne (remplace la comparaison des horodatages de tableau.js:371).
3. Entre onglets : `new BroadcastChannel('crescite-prefs')` ; une écriture diffuse `{ uid, cle }` ; l'autre onglet relit son miroir et appelle `surChangement`, jamais pendant `E.sale` (index.html:1229) : différé.
4. Migration : à la première lecture d'un compte, `crescite-admin-tableau` → `accueil.tableau`, `crescite-planning-masques` → `planning.masques`, `crescite-admin-avant` → `representations.avant`, puis effacement des clés anciennes ; la forme d'`accueil.tableau` et de `planning.masques` ne change pas (equipe/equipe.js lit `planning.masques` en tableau brut).
5. tableau.js : `charger()` → `PREFS.charger().then(() => { T.conf = normaliser(PREFS.lire(CLE_PREF)); })`, `garder()` → `PREFS.ecrire(CLE_PREF, c, { aussitot })`, `T.prefs` → `PREFS.etat()` ; disponibilites.js:93-121 pareil ; les libellés 455 et 645 inchangés (tableau.mjs:257 les attend).
6. chargerTout (1053) : `const prefs = typeof PREFS !== 'undefined' ? PREFS.charger() : null`, attendu avant `tableau` ; actualiser() (1188) rejoue la lecture sans écraser une clé en attente, sans redessiner si `E.sale`.
7. Le harnais : `ouvrir({ reduit, polices })` (121-124), `order=col.asc|desc` (tri en mémoire, 137-144) ; valeurs par défaut inchangées : les captures existantes ne bougent pas.
8. Les repères tolérants (tableau.mjs:23, 531-533 ; niveau.mjs:244 ; mouvement-admin.mjs:130) : ils passent aujourd'hui et passeront après le lot 3.
9. `site/tableur.mjs` (modèle niveau.mjs:1-16) exerce la grille d'aujourd'hui : le rendu (`#tab-corps` dans `table[role=grid]`, aria-rowcount / colcount, colonnes vides repliées, `.c-jour` et `.c-spectacle` collées), le clavier (clavier 2730 : flèches, Entrée / F2, Échap, Tab, Ctrl+A), l'édition d'une case de niveau date répétée (le statut de la date 103 → MODIFS porte le rpc `crescite_enregistrer_date` avec ses deux séances, la case `.enregistree`, la case répétée de l'autre ligne), le collage TSV (coller 3201), la fenêtre de distribution (editerEquipe 2940 : pastilles, combobox, Enregistrer → upsert crescite_equipes, les équipes poussées dans le bloc), « Étendre à… » (etendre 2996 : dialog.tab-dialogue, aperçu), l'import et Échap (adresses-admin.mjs:161-172 reste vert), Ctrl+Z (T.pile), l'export CSV (le blob). Captures `tableur-1600.png`, `tableur-1280.png`.
10. `site/bancs-admin.sh` : `python3 site/build.py` puis `node site/tableau.mjs && node site/niveau.mjs && node site/adresses-admin.mjs && node site/mouvement-admin.mjs && node site/prefs.mjs && node site/tableur.mjs`, puis les bancs des lots suivants à mesure ; `--planche` au lot 17.
11. README (comptes, commandes, « Les préférences » dans la section Administration, 778-783), MOUVEMENT.md (la liste), le commentaire du script SQL 6.

**Préférences et adresse.** Les deux clés existantes et `representations.avant` ; rien dans l'adresse.
**Accessibilité et clavier.** L'annonce `annoncer()` (854) « Gardé avec votre compte » / « Gardé sur cet appareil » une fois par session, au premier réglage ; rien d'autre ne change.
**Mouvement.** Aucun ; MOUVEMENT.md liste prefs.mjs et tableur.mjs.
**Banc d'essai et vérifications.**
- `site/prefs.mjs` : une seule requête de lecture au démarrage ; trois gestes rapides → une écriture (ECRITURES) ; `prefsAbsentes: true` → repli et « gardée sur cet appareil » (tableau.mjs:257 reste vert) ; une valeur locale ancienne passe dans la base puis s'efface ; une valeur mal formée (`DB.crescite_preferences.push` d'un objet faux) est normalisée ; deux pages du même contexte : la seconde reçoit le BroadcastChannel ; deux uid → deux miroirs ; aucune erreur de script.
- `site/tableur.mjs` : les vérifications de l'étape 9, environ quarante ; 7 lignes à venir en mode « une ligne par séance » (101, 102, 103 ×2, 105, 106, 107), 21 colonnes possibles.
- Les quatre bancs existants au même compte ; `site/bancs-admin.sh` vert de bout en bout.
**Documentation.** En-tête de prefs.js ; README (comptes, commandes, préférences) ; MOUVEMENT.md ; le script SQL 6 (9-16).
**Risques et parades.** Écraser une écriture locale en attente par une relecture : le drapeau `attente`. Une tempête d'écritures : 700 ms par clé, `aussitot` réservé aux clics. Un appareil partagé : le miroir est par uid. Le harnais n'entend ni `select=` imbriqué ni `or=` : on ne l'étend que pour `order=`, et les trois bancs qui le partagent sont relancés. Oublier le build avant un banc : bancs-admin.sh le fait d'office.
**Taille.** M à L, 4 à 5 jours.

### Lot 2 — icones.js, puis tableur.js extrait sans changement

**Objectif.** Une bibliothèque ICONES née de GESTES.ICO, dédoublonnée et enrichie de ce que les lots suivants dessinent ;
l'IIFE TABLEUR sortie telle quelle vers `admin/tableur.js`, sous le filet de `site/tableur.mjs`.

**Ce que voit Adrien à la fin du lot.** Les mêmes icônes, au même trait partout (l'engrenage, le calendrier, l'équipe
dessinés une seule fois) ; le tableur identique. Rien ne bouge de place.

**Fichiers et lignes touchés.**
- `admin/icones.js`, `admin/tableur.js` (nouveaux).
- `admin/index.html` 696 (ligne de script avant gestes.js), 858 (la croix d'annonce), 1143 (ICONE_ACTUALISER), 1244 (la clé), 1352 (CHEVRON_FIL), 1507 (LOUPE) → `ICONES.svg` ; 2378-3422 retirées (le commentaire 2379-2398 devient l'en-tête du module) ; 4592 (ligne de script après tableau.js, avant menus.js).
- `admin/gestes.js` 39-52 (`const ICO = (typeof ICONES !== 'undefined' && ICONES.ICO) || { … }`), 659 (exporter aussi `dansChamp` et `modaleOuverte`, que le lot 3 consomme).
- `admin/mobile.js` 16-25 ; `admin/tableau.js` 71-78, 495 (ORNEMENT → `ICONES.ornement`), 510-518 ; `admin/planning.js` 576-583 (garde typeof : partagé avec l'équipe) ; `admin/habillage.js` 143 (`.tb-ico-t svg` 15 px, conservé).
- `site/build.py` 1116-1118 ; `site/icones.mjs` (nouveau) ; `README.md` 322-323 (une ligne dans « L'habillage »), 430 (`admin/tableur.js`).

**Étapes.**
1. `ICONES.svg(nom, { taille, trait = 2, classe })` → `<svg class="ico …" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` ; la taille par CSS (`.ico { width: var(--ico, 16px); height: var(--ico, 16px); flex: none }`, posé près d'index.html:54) et, pour les consommateurs anciens, les attributs width / height quand `taille` est donné.
2. L'inventaire `ICONES.TRACES` (gelé) : les 26 tracés de gestes.js:40-52, les 7 de mobile.js:17-25, les 12 tuiles de tableau.js:511-518, les 6 du planning (576-583), loupe, actualiser, clé, chevron, croix, poignée, éclair, entonnoir (tableau.js:72-77) ; dédoublonnés (un engrenage, un calendrier, une équipe, une horloge) ; nouveaux : les douze rubriques, liste, grille, carte, soleil, lune, moniteur, densite, epingle, etoile, replier, deplier, poignee-h, poignee-v, coin, coche-cercle, remplacant, absent, cadenas, fiche ; `ICONES.ornement` (la tentacule 260 × 160 de tableau.js:495) ; `ICONES.NOMS`.
3. `ICONES.ICO` : l'objet 16 px aux noms de GESTES.ICO, pour menus.js:20 ; gestes.js garde ses tracés quand ICONES manque (equipe/index.html).
4. Les consommateurs : mobile.js (`ICONES.svg(nom, { taille: 22, trait: 1.9 })`), tableau.js, planning.js (`typeof ICONES !== 'undefined' ? ICONES.svg(…) : local`), les cinq constantes d'index.html.
5. L'extraction : relever les deux faces de la frontière (`grep -no '\b[a-zA-Z_]\+(' admin/tableur.js | sort -u` croisé avec les déclarations du script principal : `E`, `$`, `$$`, `esc`, `cadre`, `session`, `garderFiltres`, `dateVersForm` 2078, `ecrireDate` 2311, `manqueDate` 2306, `nouvelleDate` 2070, `comboLieu` 1852, `annoncer` 854, `jourCourt` 773, `couleurSp` 780, `AUJ` 769, `CALME_ADMIN` 733, `equipeDeLaDate` / `ecartsDate` / `enregistrerEquipeDate` equipe.js:110 / 1136 / 1180 ; et `grep -n 'TABLEUR\.' admin/*.js admin/index.html` : vue 1920, choixVue 1924 et tournee.js:42, 47, lireJour / lireHeure / lireTsv / xlsx / lireImport) ; vérifier que `PUBLICS`, `STATUTS`, `CONTRATS` (2403-2405) ne sont lus que dans l'IIFE ; `natif()` (2402) est la seule lecture au chargement.
6. Déplacer 2378-3422 tel quel, `'use strict'`, l'en-tête (API : vue, choixVue, lireJour, lireHeure, lireTsv, xlsx, lireImport ; après quoi il se charge), des sous-blocs commentés (les colonnes, la lecture, la grille, l'édition, les fenêtres posées, la distribution, l'import et l'export) ; le CSS 481-600 reste dans index.html ; `<script src="tableur.js">` après tableau.js ; tuple de build.py.
7. `python3 site/build.py` puis `node site/tableur.mjs` : même compte, mêmes captures (comparaison à l'œil) ; commit à part (« Le tableur a son fichier »).

**Préférences et adresse.** Inchangées (`session.tableur`, LISTES_ADRESSE 794).
**Accessibilité et clavier.** `aria-hidden` sur chaque svg ; le libellé reste à côté (jamais une icône seule sans title ni .sr) ; la grille inchangée (le banc le prouve).
**Mouvement.** Aucun (`tab-ok` 674-675 reste dans index.html).
**Banc d'essai et vérifications.**
- `site/icones.mjs` : tout svg de l'accueil, de Représentations et du planning a `viewBox="0 0 24 24"` et `aria-hidden` (tolérance de trait pour GESTES.ICO) ; aucun doublon de tracé dans ICONES.TRACES ; la barre du téléphone et la tuile Équipe partagent le même `d` ; ≥ 10 `.tb-ico-t svg` (tableau.mjs:334 vert) ; capture `icones.png` (ICONES.NOMS en grille, une page d'essai servie par le harnais).
- `site/tableur.mjs` vert au même compte qu'au lot 1 ; adresses-admin.mjs:161-172 vert ; aucune erreur de page au chargement (une dépendance cachée se verrait là).
**Documentation.** En-têtes d'icones.js (l'inventaire) et de tableur.js ; README 322-323 et 430 ; commentaires HTML des deux lignes de script.
**Risques et parades.** Les tailles fixées en CSS (`.tb-ico` 28 px tableau.js:1261, `.tb-ico-t svg` 15 px habillage.js:143) : conservées, captures shots-tableau comparées avant / après. Une fonction déclarée après 3422 et lue au chargement de l'IIFE : il n'y en a pas (natif() seul), et `erreurs` de page le dirait. Le service worker (sw.js:12-31) : réseau d'abord, le nouveau script arrive au premier chargement réussi.
**Taille.** M, 3 à 3,5 jours.

### Lot 3 — cadre.js : la coque, le menu latéral, le registre des raccourcis

**Objectif.** Construire la coque une fois, poser le menu latéral repliable avec ses badges, déclarer les raccourcis dans
un registre unique, sans casser `--haut-barre`, les View Transitions, mobile.js ni les bancs.

**Ce que voit Adrien à la fin du lot.** L'en-tête tient sur une ligne dès 861 px. À gauche, un rail de nuit de 240 px
qui prolonge l'en-tête : douze lignes de 44 px avec une icône et le nom en petites capitales, la rubrique courante en
blanc avec un filet à la couleur de la saison, un badge corail sur Tableau de bord (« 11 » à traiter), Diffusion (les
devis nouveaux) et Équipe (les notes de frais en attente). En bas, « ‹ Replier » : le menu passe à 64 px d'icônes avec
le nom en infobulle, le contenu s'élargit ; sur un portable de 1 280 px il naît replié, sans écriture ; il reste comme on
l'a laissé, et l'annonce dit une fois où le choix est gardé. « G puis D » va aux Représentations, « G puis P » au
planning ; « ? » liste ces touches. Au téléphone, rien n'a bougé.

**Fichiers et lignes touchés.**
- `admin/cadre.js` (nouveau).
- `admin/index.html` 2-10 (`<script id="apparence">` inline dans `<head>`), 72-82 (CSS de l'en-tête : plus de `.nav` dedans), 78-81 (règles `.nav` réécrites sous `.menu`), 105-129 et 141-142 (les media queries des dix / onze / douze rubriques remplacées par deux paliers), 197 (main dans `.coque`), 380 (#annonces centré sur le contenu), 606-610 (`.menu { view-transition-name: menu }` et ses règles old / new / group), 966-1035 (ecranConnexion, ecranMotDePasse, demarrer 1012 : la coque se reconstruit au `cadre()` suivant), 1237-1259 (cadre → poserCoque + cadre allégé ; la classe `onze douze` de 1239 n'est plus posée), 1263-1267 (poserHautBarre pose aussi `--large-menu`), 1492-1495 (l'écouteur unique du registre RACCOURCIS), 4605-4606 (ligne de script après tournee.js, avant mobile.js).
- `admin/menus.js` 317-320 (groupesClavier concatène `RACCOURCIS.groupes()` pour « Partout » et « Les représentations »).
- `admin/mobile.js` 121 (`html.ob-actif .menu { display: none }`).
- `admin/selection.js` 180 (`.sel-barre` centrée sur le contenu).
- `admin/equipe.js` 1540 (`poserHautBarre(false)` à la place de la remesure locale).
- `admin/habillage.js` 52-66 (l'apparence du menu).
- `site/build.py` 1116-1118 ; `site/cadre.mjs` (nouveau) ; `site/mouvement-admin.mjs` (bloc « aucune tâche > 200 ms après un repli »).

**Étapes.**
1. Le registre, script principal : `const RACCOURCIS = []` et `declarerRaccourci({ id, touches: ['Alt+M'] | ['G', 'D'], groupe, d, quand: () => bool, faire })` ; un seul `document.addEventListener('keydown')` (1492) qui garde Ctrl S et Ctrl K, puis ignore `e.defaultPrevented`, `GESTES.dansChamp(e.target)` (gestes.js:35), `GESTES.modaleOuverte()` (38), `GESTES.ouvert()`, un `activeElement` dans `[role="grid"]` ; les séquences (G puis lettre, V puis lettre) avec une fenêtre de 900 ms et un `kbd` flottant « G… » en `aria-live` ; `RACCOURCIS.groupes()` alimente groupesClavier (menus.js:317), `RACCOURCIS.keyshortcuts(id)` les `aria-keyshortcuts`. Vérifier que clavier() du tableur (tableur.js, ex-2756-2759) appelle `preventDefault` quand une lettre ouvre l'édition : c'est le cas (2758-2759).
2. `poserCoque()` (script principal, à côté de 1237) : si `#app > .coque` manque, écrit `.evitement` + `header.barre` (marque, #b-chercher, `.qui` avec #b-mdp, #b-aide, #b-sortir ; plus de nav) + `<div class="coque"><aside class="menu" id="menu" aria-label="Menu"></aside><main id="vue" tabindex="-1"></main></div>` + PIED, relie #b-sortir / #b-mdp / #b-chercher une fois (1248-1250), `majTemoin()`, `poserHautBarre()`, `tt('pieuvre')`, pose `data-coque="1"`, puis `CADRE.poser()` sous typeof. `cadre(rubrique, contenu)` : `poserCoque()` ; `$('#vue').innerHTML = contenu` ; classe `entree` (ouvertureMuette / CALME_ADMIN inchangés, 1247) ; `CADRE.marquer(rubrique)` sous typeof. Les trente appelants ne changent pas.
3. `CADRE.poser()` dessine dans `#menu` la `<nav class="nav" aria-label="Rubriques">` depuis rubriquesVisibles() (1235) : `<a href="#/k" aria-keyshortcuts="G D"><svg…/><span class="menu-l">Libellé</span><span class="menu-badge"></span></a>` avec ICONES, `title` quand replié ; puis le bouton `<button class="menu-replier" aria-expanded aria-controls="menu" aria-keyshortcuts="Alt+M">` ; `CADRE.marquer(rubrique)` pose `aria-current="page"`, redessine la nav si rubriquesVisibles() a changé (E.ideale), appelle `CADRE.badges()` ; `cadre.js` pousse `APRES_VUE.push(CADRE.marquer)` à son chargement ; `CADRE.basculer(replie?)` pose `html.menu-replie`, écrit `menu.replie` (aussitôt) et le miroir `crescite-admin-apparence`, anime une fois.
4. `CADRE.badges()` : Tableau de bord = `TABLEAU.urgences().lignes.filter(x => !x.reporte).length`, Diffusion = devis `statut === 'nouveau'`, Équipe = frais `en_attente` ; calcul après `requestIdleCallback`, mémo de 30 s, rejoué après `changement()` (1220) par un debounce ; `aria-label="Diffusion, 3 devis à traiter"`, texte `.sr`.
5. Géométrie : `--large-menu` (240 px déplié, 64 px replié, 0 sous `html.ob-actif`) posé par poserHautBarre (1263) étendu d'un ResizeObserver sur l'aside ; `.coque { display: grid; grid-template-columns: var(--large-menu) minmax(0, 1fr) }` ; l'aside `position: sticky; top: var(--haut-barre); max-height: calc(100vh - var(--haut-barre)); overflow: auto; z-index: 10` (sous `.barre` 20, #annonces 50, `.sel-barre` 55, le tiroir 60-61) ; `#annonces` (380) et `.sel-barre` (selection.js:180) en `left: calc(50% + var(--large-menu, 0px) / 2)` ; `main { max-width: 1500px }` (197) conservé. Paliers : ≥ 1 340 px déplié par défaut, 641-1 339 replié par défaut (seul le choix explicite est gardé), ≤ 640 masqué. Les media queries 110-129 et 141-142 disparaissent ; `.chercher .mot` visible dès 861 px.
6. Le `<script id="apparence">` inline dans `<head>` (après la ligne 10, avant la feuille de style) : lit `crescite-admin-apparence` (try/catch), pose `html.menu-replie` (lot 5 : `data-theme`, `data-densite`, `theme-color`) avant le premier dessin.
7. View Transitions : `.menu { view-transition-name: menu }` avec les règles de 608-610 ; après ecranConnexion / ecranMotDePasse, poserCoque reconstruit (l'ancien aside est parti avec `#app.innerHTML` : pas de nom en double) ; si une reconstruction tombe pendant une transition, le nom est posé après `t.finished`.
8. mobile.js:121 : `html.ob-actif .menu { display: none }` ; rien d'autre (la feuille « Plus » clique toujours #b-sortir / #b-mdp, restés dans l'en-tête).
9. equipe.js:1540 : la remesure locale devient `typeof poserHautBarre === 'function' ? poserHautBarre(false) : …`.
10. habillage.js:52-66 : l'aside prend `--barre-fond` (31, 44) à la verticale (de nuit dans les deux thèmes, comme `.barre` 52), les liens en Raleway capitales 12 px (56-58), rayon 10 px, marge 4 px 8 px ; survol blanc 12 % ; la rubrique courante blanche sur blanc 14 % avec un filet `inset 3px` (comme `.ob-item[aria-current]`, mobile.js:170) et l'ombre de la saison (58) ; le badge corail 18 px ; replié, le badge devient un point de 8 px sur l'icône ; focus visible en anneau intérieur.
11. Raccourcis déclarés : `Alt+M` (basculer), `G` puis `T D P F S E C O A L X J` (tableau de bord, dates, planning, feuilles, spectacles, équipe, diffusion (C, si E.ideale), pro, ateliers, lieux, textes, journal) ; `aria-keyshortcuts` sur chaque lien.

**Préférences et adresse.** `menu.replie` (PREFS, aussitôt) et le miroir d'appareil ; rien dans l'adresse ; BroadcastChannel : un second onglet se replie avec le premier.
**Accessibilité et clavier.** `.evitement` reste le premier Tab (tableau.mjs:536-538) ; l'aside vient après lui dans le DOM ; `nav[aria-label="Rubriques"]` et `aria-current="page"` conservés ; replié, chaque lien garde son libellé (`.menu-l` passe en `.sr`) et un `title` ; le bouton de repli porte `aria-expanded` et `aria-controls` ; ↑ ↓ entre rubriques (GESTES.fleches, gestes.js:218) ; cibles ≥ 44 px ; annonce aria-live « Menu replié » ; Alt+M libre dans Chrome, Firefox et Safari.
**Mouvement.** Le repli est une animation à la demande : `aside.animate` sur la largeur 240 ↔ 64 px (220 ms, le doux `cubic-bezier(.2,.8,.2,1)`), les libellés en opacité 120 ms, le contenu suit par la grille ; rien sous CALME_ADMIN (733) ni `html.still` (605) ; l'aside nommé reste immobile pendant que root glisse (638-646) ; aucune tâche > 200 ms après le repli.
**Banc d'essai et vérifications.**
- `site/cadre.mjs` : à 1 440 px, l'en-tête tient sur une ligne (hauteur < 64 px) et le menu est déplié ; l'aside a douze liens avec un svg et un texte, « Tableau de bord » courant ; à 1 280 px il naît replié sans écriture ; clic sur « Replier » → `html.menu-replie`, `--large-menu` = 64px (getComputedStyle), ECRITURES porte `menu.replie` ; Alt+M le rouvre ; rechargement → l'état retrouvé dès le premier dessin (`html.menu-replie` posé avant `main#vue`, lu par `addInitScript`) ; `prefsAbsentes: true` → tout marche, annonce « sur cet appareil » ; navigation → `aria-current` suit ; `G` puis `D` → `#/representations` ; `G` tapé dans un champ ou dans une case du tableur ne navigue pas ; la coque n'est construite qu'une fois (`#b-sortir` unique et `data-coque` identique après trois routes) ; après `ecranMotDePasse(true)` + Annuler, la coque est de nouveau là, une seule ; `E.ideale = true` à chaud puis `CADRE.marquer` → Diffusion paraît ; le badge du Tableau de bord vaut 11 (le compte de tableau.mjs:36) ; `#annonces` centrée sur le contenu ; à 390 px `aside.menu` est `display: none` et la barre du bas inchangée ; Tab 1 = « Aller au contenu » ; sous `reduit: true`, aucune animation au repli (`getAnimations()` vide) ; aucune erreur ; captures `menu-deplie.png`, `menu-replie.png`, `menu-1280.png`, `entete-1440.png`.
- tableau.mjs (repères du lot 1), niveau.mjs, adresses-admin.mjs, mouvement-admin.mjs verts ; mouvement-admin gagne « aucune tâche > 200 ms après un repli » à CPU=4.
**Documentation.** En-tête de cadre.js ; README : nouveau paragraphe « Le cadre et le menu latéral » (section Administration, avant « Les gestes » 392) avec les raccourcis ; MOUVEMENT.md : le repli (tableau « Paraître » et liste des bancs) ; le commentaire 7-8 d'index.html ; la clé `menu.replie` (script SQL 6, README:778-783).
**Risques et parades.** Reconstruire la coque par inadvertance (double liaison de #b-sortir) : la garde sur `#app > .coque` et le compteur vérifié par le banc. Oublier de la reconstruire après un écran hors cadre : `cadre()` passe toujours par poserCoque(). Les règles `.nav` d'index.html:78-81 (flex horizontal, overflow-x) s'appliqueraient à la nav verticale : réécrites sous `.menu .nav`. La largeur utile à 1 440 px (main plafonné à 1 500 px, 197) : repli d'office sous 1 340 px et repli manuel au-dessus. Collision de touches : Alt+M est libre, les séquences passent par les gardes de l'étape 1, G n'est pas pris par la file J/K (tableau.js:1234).
**Taille.** L, 5 à 6 jours.

### Lot 4 — Les accès rapides et la recherche comme barre de commande

**Objectif.** Le menu devient un tableau de commande : « ＋ Créer », les épinglés, les récents ; la recherche Ctrl K
propose les commandes du cadre avec leur touche, et les récents sans rien taper.

**Ce que voit Adrien à la fin du lot.** Sous les rubriques, l'étiquette « ACCÈS RAPIDES », un bouton « ＋ Créer » en
dégradé de la saison qui ouvre un menu (Nouvelle date, Proposer des dates, Nouvelle fiche, Nouveau lieu, Séance
d'atelier, Inviter une salle, Opportunité), puis ses actions épinglées (le tableur, les feuilles de route, le planning,
les devis…), puis « Récents » : les cinq dernières fiches ouvertes avec leur genre (« Date · Bérénice, 5 nov. »). Un
clic droit (ou Maj+F10) sur un épinglé propose « Retirer », « Monter », « Descendre » ; une étoile dans la tuile
« actions » du tableau de bord propose « Épingler dans le menu ». Replié, seuls « ＋ » et les icônes des épinglés
restent. Dans la recherche (Ctrl K) : « Replier le menu Alt M », « Vue carte V C », les douze rubriques avec leur
séquence ; sans rien taper, les récents puis les prochaines dates.

**Fichiers et lignes touchés.**
- `admin/cadre.js` (sections Créer, Épinglés, Récents).
- `admin/tableau.js` 84-102 (ACTIONS, ACTIONS_DEFAUT lus par le menu), 180-182 (le réglage « actions » gagne l'étoile), 1431 (retirerAction : le geste côté tuile), 1437 (export).
- `admin/index.html` 1292 (noterAdresse : pousse aussi dans les récents), 1316 (nomFiche : le libellé), 1509-1510 (TYPES_RCH : genres « Raccourci » et « Récent »), 1546-1553 (indexRch : les commandes du cadre), 1618-1631 (rendreRch : les récents sans saisie), 159 (`.rch-type` avec un `kbd`).
- `admin/menus.js` 55-70 (motif des fournisseurs : un menu sur `.menu-epingle`), `admin/gestes.js` 62-68 (GESTES.menu).
- `admin/mobile.js` 79 (allerEtCliquer), 102-110 (feuilleCreer lit la même liste).
- `site/acces.mjs` (nouveau).

**Étapes.**
1. `CADRE.creer()` : un `GESTES.menu` (gestes.js:62-68, rendu 100-116) sous le bouton, nourri par `TABLEAU.ACTIONS` filtrées sur `/^＋/` et `a[3]()` ; `prospect` et `recherche` reprennent la logique d'index.html:1549-1551 (hashchange puis `#b-nouveau-prospect`) et mobile.js:79 ; feuilleCreer (mobile.js:102-110) lit la même liste : une source.
2. `CADRE.epingles()` : `PREFS.lire('menu.epingles', ACTIONS_DEFAUT)` normalisé contre ACTIONS (clés inconnues ignorées, ≤ 12, conditions `a[3]()` vérifiées à chaque dessin) ; `CADRE.epingler(k)` / `retirer(k)` / `deplacer(k, sens)` écrivent la clé (aussitôt) et annoncent avec « Annuler ».
3. Un fournisseur de menu (menus.js, motif actionsDate 55-70) sur `.menu-epingle` : Retirer, Monter, Descendre ; dans la tuile « actions » (tableau.js:180-182), une étoile `[data-epingler]` par action, pressée quand elle est déjà dans le menu.
4. Les récents : `noterRecent({ href, libelle, genre })` appelé par noterAdresse (1292) quand l'adresse est une fiche (TIROIR.FICHES, tiroir.js:27-33, donne le genre et le titre), et par TIROIR.ouvrir ; sessionStorage `crescite-admin-recents`, cinq entrées, dédoublonnées, la plus récente en tête ; `CADRE.recents()` les dessine ; masqués replié.
5. La recherche : `mettre({ type: 'Raccourci', titre: 'Replier le menu' / 'Déplier le menu', faire: CADRE.basculer, touche: 'Alt M' })`, « Vue liste / tableur / carte » (href, touche « V L »…), les douze rubriques avec « G puis lettre » ; `TYPES_RCH` (1509) gagne « Raccourci » et « Récent » ; `.rch-type` montre la touche en `kbd` (140) ; sans saisie, rendreRch (1621-1623) montre les récents avant les prochaines dates.

**Préférences et adresse.** `menu.epingles` (aussitôt) ; les récents en sessionStorage ; rien dans l'adresse.
**Accessibilité et clavier.** « ＋ Créer » `aria-haspopup="menu"` et `aria-expanded` ; ↑ ↓ Entrée Échap dans le menu (GESTES.menu) ; les épinglés sont des `<a>` avec `aria-keyshortcuts` quand une touche existe ; Maj+F10 ouvre leur menu (gestes.js:204) ; les récents : liens ordinaires avec `title` ; l'aide « ? » gagne « Les accès rapides ».
**Mouvement.** Un épinglé qui arrive saute (`ad-pop` 668-669, ressort 450 ms) ; le menu « Créer » paraît en 150 ms (682) ; un récent se pose (`ad-arrive` 300 ms) ; rien sous CALME_ADMIN.
**Banc d'essai et vérifications.**
- `site/acces.mjs` : « ＋ Créer » ouvre `.gm-boite` avec « Nouvelle date », Entrée mène à `#/representations/nouvelle` ; `prospect` clique `#b-nouveau-prospect` ; les épinglés par défaut sont dix (ACTIONS_DEFAUT) ; Maj+F10 sur « Tableur des séances » → « Retirer » → ECRITURES porte `menu.epingles` sans `tableur` ; l'étoile de la tuile le remet ; ouvrir `#/representations/101` puis `#/lieux/5` → « Récents » montre les deux, le lieu d'abord ; Ctrl K sans rien taper → les récents en tête ; « replier » dans la recherche → `html.menu-replie` ; « vue carte » → `#/representations/carte` ; replié, les épinglés sont des icônes avec `title` ; aucune erreur ; captures `acces.png`, `acces-replie.png`, `recherche-commandes.png`.
**Documentation.** README (« Le cadre et le menu latéral » : Créer, Épinglés, Récents, badges ; « La recherche rapide » 411) ; la clé `menu.epingles` (script SQL 6, README:778-783) ; en-tête de cadre.js.
**Risques et parades.** Les conditions `a[3]()` qui changent après chargement (E.sql4, E.ideale) : dessin à chaque `CADRE.marquer`. Deux listes d'actions (tuile et menu) qui divergent : voulu, initialisées pareil, l'étoile fait le pont. Un menu « Créer » sous un menu replié : posé au pointeur, rabattu dans l'écran (gestes.js:110-114).
**Taille.** M, 3 à 4 jours.

### Lot 5 — Nuit, jour, appareil ; la densité

**Objectif.** Le choix du thème et de la densité dans le menu, appliqué avant le premier dessin, gardé avec le compte ;
les jetons de densité que les composants suivants lisent.

**Ce que voit Adrien à la fin du lot.** En bas du menu, une pilule de trois petites icônes (lune, soleil, moniteur) et
une quatrième pour la densité. Le jour : le contenu passe au papier, la coque (en-tête et menu) reste de nuit ;
« Appareil » suit le réglage du système. Compact, à la souris seulement : les lignes font 36 px au lieu de 44, les champs
32 au lieu de 38, le texte 14 px ; au doigt, rien ne descend sous 44 px. Aucun éclair de nuit à l'ouverture en jour.

**Fichiers et lignes touchés.**
- `admin/index.html` 2-10 (`<script id="apparence">` : `data-theme`, `data-densite`, `theme-color` ligne 10, `color-scheme` ligne 9), 30-48 (jetons `--pas`, `--h-champ` ; la nuit sous `:root:not([data-theme="jour"])` inchangée), 177 (champs 38 px → `var(--h-champ)`), 225 (`.ligne` lit `--pas`).
- `admin/habillage.js` 13-46 (jetons ; `html[data-densite="compacte"]` sous `(pointer: fine)`), 35-37.
- `admin/cadre.js` (`CADRE.reglages()` : le radiogroup du thème, le bouton de densité).
- `admin/planning.js` 1209-1212 (se redessine déjà sur `data-theme`).
- `site/theme.mjs` (nouveau) ; `site/tableau.mjs` 319-325 (la nuit par défaut : reste vert).

**Étapes.**
1. Le `<script id="apparence">` (lot 3) pose aussi `data-theme` ('appareil' → `matchMedia('(prefers-color-scheme: dark)')`), `data-densite`, `meta[name=theme-color]` (`#1b1117` nuit, `#f6f2eb` jour ; `color-scheme` passe à `light dark` quand le thème suit l'appareil).
2. PREFS `theme` et `densite` (défauts 'nuit', 'confortable') ; `surChangement` → appliquer et réécrire le miroir ; si 'appareil', écoute du `change` de matchMedia.
3. `CADRE.reglages()` : le thème en `role="radiogroup"` (trois `role="radio"` aria-checked, flèches), la densité en bouton `aria-pressed` ; les mêmes commandes dans la recherche (« Mode jour », « Mode nuit », « Compact »).
4. Densité : `@media (pointer: fine) { html[data-densite="compacte"] { --pas: 6px; --h-champ: 32px; font-size: 14px } }` ; les composants qui lisent `--pas` : `.ligne` (225), les lignes du menu (44 → 36), `.bloc` (185), `.tb-tete` (tableau.js:1253), et, plus tard, le tableur Simple (lot 11).
5. Annonce aria-live « Thème : jour — Gardé avec votre compte » ; planning.js se redessine seul.

**Préférences et adresse.** `theme`, `densite` (aussitôt) + le miroir d'appareil ; rien dans l'adresse.
**Accessibilité et clavier.** Radiogroup aux flèches ; `color-scheme` suivi (formulaires natifs) ; contrastes 4,5:1 des deux palettes (habillage.js:19-22, 39-41) vérifiés sur le menu ; jamais sous 44 px au doigt.
**Mouvement.** Aucune transition de couleur (un fondu sur toute la page coûte cher) ; l'icône choisie saute (ressort 450 ms) ; rien sous CALME_ADMIN.
**Banc d'essai et vérifications.**
- `site/theme.mjs` : nuit par défaut même avec `colorScheme: 'light'` (tableau.mjs:323 vert) ; « jour » → `data-theme="jour"`, tuiles `rgb(255, 253, 249)` (tableau.mjs:325), `theme-color` `#f6f2eb`, ECRITURES porte `theme`, localStorage `crescite-admin-apparence` ; rechargement : `data-theme` posé avant `main#vue` (`addInitScript` qui note l'attribut au `DOMContentLoaded`) ; « appareil » avec `sombre: false` → jour ; compacte au pointeur fin : une `.ligne` mesure < 40 px, `--h-champ` 32 px ; compacte ignorée à 390 px (tactile) ; aucune erreur ; captures `jour.png`, `nuit.png`, `compacte.png`.
**Documentation.** README 322-330 (« L'habillage » : le thème, la densité) ; le commentaire 7-8 d'index.html réécrit ; les clés `theme` et `densite`.
**Risques et parades.** L'éclair de nuit : le miroir dans `<head>`. Le jour jamais montré avant : chaque lot suivant capture ses composants en jour, la planche (lot 17) les réunit. La densité contre 44 px : pointeur fin seulement.
**Taille.** S, 2 jours.

### Lot 6 — fenetres.js : la poignée commune ; le tiroir, la liste, les boîtes ; « Pleine largeur », « Disposition d'origine »

**Objectif.** Un seul module FENETRES (poignée, bornes, mémoire) et ses premières surfaces : le tiroir, la colonne liste
de `.deux`, les boîtes de la charte et la feuille GESTES.formulaire sous html.admin, après la migration des deux modales
CRM ; deux réglages du menu : « Pleine largeur » et « Disposition d'origine ».

**Ce que voit Adrien à la fin du lot.** Une poignée est une bande invisible de 6 px au bord d'une surface ; au survol
ou au focus, une ligne de 2 px à la couleur de la saison paraît et le curseur dit le sens. Le bord gauche du tiroir se
tire (de 480 px à l'écran moins 80 px) ; le menu de son en-tête propose « Taille d'origine », « Plus large », « Pleine
page ». Entre la liste et la fiche (Représentations, Lieux, Équipe, Ateliers, Textes, Espace pro), un séparateur règle
la colonne de la liste. La recherche, « Étendre », « Importer », « Choisir dans la troupe », le briefing, l'aide et la
feuille de modification ont un coin en bas à droite qui se tire. Double-clic ou Entrée sur la poignée : la taille
d'origine, en un cinquième de seconde. L'opportunité de diffusion et le courriel de relance s'ouvrent dans la même boîte
que les autres. Dans les réglages du menu, « Pleine largeur » (le contenu ne plafonne plus à 1 500 px) et « Disposition
d'origine », avec « Annuler ».

**Fichiers et lignes touchés.**
- `admin/fenetres.js` (nouveau).
- `admin/tiroir.js` 24 (LARGEUR), 79 (la largeur lue), 80-83 (la poignée dans `.tiroir-tete`), 88 et 123 (recul : tient compte des largeurs), 257 (transition sur transform seulement, courbe alignée sur le doux), 277 (téléphone inchangé).
- `admin/index.html` 143-145 (dialog.recherche), 197 (`main { max-width }` levé par `html.pleine-largeur`), 201-205 (`.deux` : `minmax(300px, var(--l-liste, 460px))` + séparateur), 578-579 (dialog.tab-dialogue, .large), 1657-1659 et 1664-1672 (reperer / glisserVers : rien pendant `html.redim`), 1807-1810 (suivrePied : le ResizeObserver dort pendant le geste), 4086-4099 et 4232-4240 (modales CRM → `dialog.tab-dialogue`), 4596-4597 (ligne de script après corbeille.js, avant tiroir.js).
- `admin/tableau.js` 1217-1233 et 1413-1414 (dialog.tb-brief), 605-613 (le patron « Disposition d'origine » + Annuler).
- `admin/gestes.js` 566 (dialog.gq-aide), 606-607 (.gf-boite sous `html.admin`, option `{ ajustable: true }`), 410-413 (le piège de focus inclut la poignée).
- `admin/equipe.js` 513-520 et 3368-3370 (dialog.troupe-choix).
- `admin/menus.js` (fournisseur de menu sur `.tiroir-tete` ; l'aide gagne « Glisser le bord… »), `admin/cadre.js` (les deux réglages), `admin/habillage.js` (la langue visuelle des poignées).
- `site/build.py` 1116-1118 ; `site/fenetres.mjs` (nouveau).

**Étapes.**
1. `FENETRES.poignee(el, { axe: 'x'|'y'|'xy', bord: 'gauche'|'droite'|'bas'|'coin', min, max, lire, ecrire, defaut, libelle })` : un `<div class="poignee" role="separator" tabindex="0" aria-orientation aria-valuemin/max/now aria-label title="Glisser pour ajuster · double-clic : taille d'origine">` ; Pointer Events + `setPointerCapture`, `touch-action: none` ; pendant le geste `html.redim` (transitions coupées, `user-select: none`, FLIP et ajusterPied suspendus) ; `pointermove` → `requestAnimationFrame` → `ecrire(valeur bornée)` (une variable CSS ou width / height inline, jamais un transform) ; `pointerup` → `FENETRES.garder(cle, valeur)` et un relevé des repères FLIP ; clavier ← → / ↑ ↓ ±16, Maj ±64, Début / Fin, Entrée = `defaut` ; double-clic = `defaut`, animé une fois par l'API (220 ms, doux) si `!CALME_ADMIN()` ; bornes recalculées au `resize` ; rien hors `(min-width: 641px) and (pointer: fine)`.
2. `FENETRES.taille(cle)` / `garder(cle, v)` / `oublier(cle)` / `toutOublier()` sur `PREFS.lire / ecrire('fenetres')` ; `normaliser` borne chaque clé (min en px, max en px et en vw : `Math.min(v, innerWidth * .94)`) à la lecture et au resize ; `FENETRES.equiperDialog(dlg, cle)` pose un `.dlg-coin` ; `FENETRES.equiperDeux()` pose un `.sep-v` dans le gap quand `#vue .deux` existe, appelé par un crochet APRES_VUE poussé par fenetres.js lui-même (une seule largeur pour les sept pages : index.html:1925, 3663, 3778, 3891, 4283 ; equipe.js:172, 2801 ; au-dessus de 1 100 px seulement, 204-205 ; bornes 300 px à 55 % de main).
3. Le CSS commun injecté par fenetres.js : bande 6 px, ligne 2 px au survol / focus (`--accent`, toute la hauteur pendant le geste), `cursor: col-resize | row-resize | nwse-resize`, équerre 10 px pour un coin.
4. Tiroir : tiroir.js:79 → `el.style.setProperty('--tiroir-largeur', FENETRES.taille('tiroir') ?? LARGEUR)` ; poignée bord gauche (bornes 480 px à `innerWidth − 80` : le voile reste cliquable) ; le recul (88, 123) ajoute la différence quand un tiroir plus étroit couvre un plus large ; 257 : la courbe `cubic-bezier(.3,.7,.3,1)` passe au doux ; le menu de `.tiroir-tete` (menus.js, motif des fournisseurs) : Taille d'origine, Plus large (+160 px), Pleine page (lien existant 82).
5. Boîtes : le coin sur dialog.recherche (143), dialog.tab-dialogue et `.large` (578-579 ; troupe-choix equipe.js:514 en hérite), dialog.tb-brief (tableau.js:1413), dialog.gq-aide (gestes.js:566), `.gf-boite` (gestes.js:606) sous `html.admin` seulement ; width / height inline bornées à `100dvh − 24px` ; `max-width: none` est déjà là (143, 578) ; le piège de Tab de la feuille (412) inclut la poignée.
6. Les modales CRM (4086-4099, 4232-4240) : une fonction `boiteCrm(titre, html)` qui rend un `dialog.tab-dialogue` (fermetures `#b-fermer-mod-crm` / `#b-fermer-mod-mel` et Échap, question « Quitter sans enregistrer ? » par GESTES.garder) avant de recevoir le coin.
7. « Pleine largeur » : `fenetres.pleine` pose `html.pleine-largeur` qui lève `main { max-width: 1500px }` (197) ; « Disposition d'origine » : `FENETRES.toutOublier()` (plus, aux lots suivants, `tableur.colonnes` et `menu.replie`), annonce avec « Annuler » sur un instantané, patron tableau.js:605-613.

**Préférences et adresse.** `fenetres.{tiroir, liste, pleine, recherche, 'tab-dialogue', 'tab-dialogue-large', 'tb-brief', 'gq-aide', gf}` au relâchement ; rien dans l'adresse.
**Accessibilité et clavier.** Rôle separator avec valeurs ; flèches, Début / Fin, Entrée ; `:focus-visible` de la charte (54) ; la poignée du tiroir entre dans l'ordre de focus après « ← » (tiroir.js:80, 91) ; `aria-live` « Largeur : 820 px » au relâchement (débouncé) ; l'aide « ? » dit le geste.
**Mouvement.** Le glisser suit le pointeur (linéaire, rAF, aucune transition) ; la remise s'anime une fois par l'API (doux) ; le tiroir s'aligne sur le vocabulaire ; `html.redim` suspend FLIP (1664-1672) et le pied (1807-1810) ; aucune mesure sous transform.
**Banc d'essai et vérifications.**
- `site/fenetres.mjs` : ouvrir le tiroir d'une date depuis le tableau de bord (niveau.mjs:19-22), `page.mouse` tire sa poignée de −200 px → `--tiroir-largeur` + 200, ECRITURES porte `fenetres` une fois (pas une par pointermove) ; un second `ouvrir` la retrouve ; à 1 280 px une largeur gardée de 1 500 est bornée à `1280 − 80` ; double-clic → `min(780px, 94vw)` ; → puis Entrée au clavier ; Échap ferme toujours le tiroir (niveau.mjs:17-26 vert) ; `#/representations/101` à 1 440 px : le `.sep-v` existe, +80 px → `--l-liste` = 540px, aucun `glisserVers` pendant le geste ; à 1 000 px pas de séparateur ; `#recherche` ouvert : son coin écrit `width` / `height` inline, bornés ; la feuille TRAITER a un coin à 1 600 px, aucun à 390 px ; la modale « Nouvelle opportunité » est un `dialog.tab-dialogue[open]`, Échap la ferme ; « Pleine largeur » → `html.pleine-largeur` et main plus large que 1 500 px à 1 920 px ; « Disposition d'origine » vide `fenetres`, « Annuler » la rend ; aucune `.poignee` à 390 px ni avec `hasTouch` ; sous `reduit: true` la remise ne s'anime pas ; aucune tâche > 200 ms pendant un glisser (CPU=4) ; aucune erreur ; captures `poignee-tiroir.png`, `poignee-liste.png`, `coin-recherche.png`.
- niveau.mjs et tableau.mjs verts (les modales CRM ont changé de balisage).
**Documentation.** En-tête de fenetres.js ; README : « Les fenêtres ajustables » (section Administration) ; MOUVEMENT.md : « Suivre le pointeur » (le glisser) et la remise animée, le tiroir au doux ; l'aide « ? » ; tiroir.js, gestes.js (coin sous html.admin) en-têtes ; la clé `fenetres`.
**Risques et parades.** Une largeur mémorisée illisible sur un autre écran : bornes vw à la lecture et au resize. Un glisser pendant un redessin temps réel : `html.redim` suspend FLIP et le ResizeObserver du pied. Des poignées qui fuient dans l'espace de l'équipe (gestes.js partagé) : `html.admin` + option explicite. Un redimensionnement de surface ne déclenche pas `window.resize` : le menu contextuel (gestes.js:151) ne se ferme pas, le tab-pop se replace par son propre `placer` (lot 10). Le double-clic de remise contre la sélection de texte : réservé à la poignée.
**Taille.** L, 5 à 6 jours.

### Lot 7 — Les vues de Représentations : sélecteur à icônes, filtres communs, vue retenue

**Objectif.** Un seul en-tête pour Liste / Tableur / Carte (icônes, liens, aria-current, V L / V T / V C), un seul état de
filtres `session.dates` dans l'adresse, la dernière vue retenue, « Voir dans le tableur » qui arrive sur sa ligne.

**Ce que voit Adrien à la fin du lot.** À côté du titre « Représentations », une pilule à trois icônes (calquée sur la
pilule du planning) avec leur nom : Liste, Tableur, Carte, la vue ouverte en dégradé de la saison ; sous 1 100 px
l'icône seule, le nom en infobulle. Une barre de filtres identique dans les trois vues : la recherche, un segment À venir
/ Passées / Toutes, la saison, les puces colorées des spectacles (qui servent aussi de légende), le statut, le public, le
compte ; à droite, ce qui est propre à la vue (Colonnes vides, Autour des dates, le tri). Changer de vue garde les
filtres ; l'adresse les porte ; « Représentations » rouvre la dernière vue ; « Voir dans le tableur » depuis une date
arrive sur sa ligne, cerclée un instant.

**Fichiers et lignes touchés.**
- `admin/index.html` 793-805 (LISTES_ADRESSE : une entrée `dates` pour `#/representations(?:/(?:nouvelle|tableur|carte|\d+))?` avec q, saison, spectacle, periode: 'avenir', statut, public ; l'entrée `tableur` retirée), 1272 (route inchangée), 1919-1932 (vueDates construit `f = session.dates` et appelle `filtresDates(f, 'liste')`), 2028-2035 (listeDates applique saison et période), 838-849 (effacerFiltres remet `f` aux valeurs d'office puis `router()`), 1032 (depart), `choixVueDates` et `filtresDates` (nouvelles, à côté de vueDates).
- `admin/tableur.js` (ex-2553-2560 lignes() applique statut et public, sémantique « masquee » et « mixte » reprise de 2031-2032 ; ex-2573-2601 vue(f) ; ex-2602 choixVue → alias de `choixVueDates` ; ex-2596-2599 : `session.dates.cible` → `T.actif` sur la ligne `${id}:…`, `enVue`, `visee`).
- `admin/tournee.js` 42 et 47 (choixVueDates), 44-46 (`f` commun), 57 (periode et statut à la place de la case « À venir seulement » ; les annulées montrées si `statut === 'annulee'`).
- `admin/menus.js` 67 (« Voir dans le tableur » pose `session.dates.cible = d.id`), `admin/tableau.js` 92 (l'action rapide), 399 (depart() connaît `representations.vue`), 452 (« Page d'ouverture »).
- `admin/mobile.js` 26 (l'onglet Dates respecte la vue retenue), 86 (« Carte de tournée » reste).
- `admin/habillage.js` 106, 115-118 (la pilule, calquée sur `.pl-vues` planning.js:368-370 ; focus en anneau intérieur, `.seg { overflow: hidden }` 207).
- `site/vues-dates.mjs` (nouveau) ; `site/niveau.mjs` 222 (le texte « Carte » lu dans `.vues a[aria-current="page"]`).

**Étapes.**
1. `choixVueDates(v)` (script principal) : `<nav class="vues" aria-label="Vue">` de trois `<a>` (`#/representations`, `/tableur`, `/carte` si TOURNEE) avec `ICONES.svg('liste' | 'grille' | 'carte')`, `<span class="mot">Liste</span>`, `title="Vue liste (V L)"`, `aria-current="page"`, `aria-keyshortcuts="V L"` ; `.mot` en `.sr` sous 1 100 px ; `TABLEUR.choixVue = choixVueDates` le temps du lot, puis tournee.js appelle directement.
2. L'état commun : `session.dates = Object.assign({ q: '', saison: '', spectacle: '', periode: 'avenir', statut: '', public: '' }, session.dates || {})` construit dans vueDates et passé à `TABLEUR.vue(f)`, `TOURNEE.vue(f)`, `listeDates` ; migration douce : `session.tableur` et `session.tournee` lus une fois (saison, periode) puis effacés ; tri, vides, serre, ouvertes restent en `session.vues.<vue>` hors adresse.
3. `filtresDates(f, { vue, aDroite })` rend la barre commune (recherche, seg Période repris de 2584-2585 et 3710, saison, puces spectacle colorées 1930 / tournee.js:50, statut, public, compte) et `brancherFiltresDates(f, maj)` relie les contrôles une fois ; effacerFiltres (838-849) réinitialise `f` puis redessine au lieu de rejouer le DOM.
4. lignes() applique statut et public ; listeDates saison et période (les saisons passées en `<details>` restent quand periode = 'toutes') ; tournee.dessiner (57) lit periode et statut.
5. `representations.vue` : écrite (aussitôt) à chaque route de la rubrique ; `#/representations` nu → `location.replace` vers l'adresse explicite de la vue retenue ; `TABLEAU.depart()` (399), le lien du menu (CADRE) et l'onglet Dates (mobile.js:26) la respectent.
6. RACCOURCIS : « V » puis L / T / C, groupe « Les représentations », `quand: () => location.hash.startsWith('#/representations')`.
7. « Voir dans le tableur » (menus.js:67, tableau.js:92) : `session.dates.cible = id` puis `#/representations/tableur` ; `TABLEUR.vue` active la ligne, la met en vue, la cercle (`visee` 678), puis oublie la cible.
8. Après un changement de vue, le focus revient sur le lien actif (un drapeau posé par le sélecteur, lu dans apresVue).

**Préférences et adresse.** `representations.vue` ; l'adresse porte `?q=&saison=&spectacle=&periode=&statut=&public=` (ce qui diffère des valeurs d'office) pour les trois vues ; `cible`, tri, vides, serre, ouvertes hors adresse.
**Accessibilité et clavier.** Liens + `aria-current="page"` (pas de radiogroup sur des liens : Ctrl+clic, historique) ; `title` + `.sr` ; 44 px de haut ; focus visible en anneau intérieur ; annonce aria-live « Vue tableur » à chaque bascule.
**Mouvement.** Le passage d'une vue à l'autre reste `changerVueAdmin` (1399-1411 : fondu 220 ms, même rubrique, même profondeur) ; la pilule ne glisse pas (son DOM est recréé) ; rien sous CALME_ADMIN.
**Banc d'essai et vérifications.**
- `site/vues-dates.mjs` : trois liens avec svg et texte, « Liste » courant ; le texte « Carte » présent (niveau.mjs:222 adapté) ; libellé masqué à 1 000 px, `title` présent ; `?q=caen&periode=toutes` écrit depuis la liste, retrouvé dans l'adresse du tableur et de la carte ; une adresse `?periode=toutes&statut=annulee` rouvre la carte avec les annulées ; rechargement et précédent les gardent (comme adresses-admin.mjs:11-12) ; « Effacer les filtres » remet `f` ; `V` puis `T` → tableur ; `V` tapé dans un champ ne fait rien ; ECRITURES porte `representations.vue` ; `#/representations` nu rouvre la carte après l'avoir quittée, avec une adresse explicite ; un autre contexte (`prefsAbsentes`, ECRITURES vidé) ne la prend pas ; « Voir dans le tableur » depuis la liste → `td.actif` sur la ligne de 101, classe `visee` ; le focus est sur le lien actif après le changement ; aucune erreur ; captures `vue-liste.png`, `vue-tableur.png`, `vue-carte.png`, `selecteur-1000.png`.
**Documentation.** README 421-434 (Représentations : les trois vues, les filtres communs, la vue retenue) ; en-têtes ; la clé `representations.vue`.
**Risques et parades.** Des liens anciens `?periode=` écrits par la clé `tableur` lus désormais par la liste : documenté, et les noms de paramètres ne changent pas. Une carte vide (toutes saisons + à venir) : le compte et un vide illustré « Aucune date à venir sur la carte » avec « Toutes les périodes » (lot 16 l'habille). La case active du tableur qui disparaît du filtre : `dessiner({ garder })` retombe sur la première case (ex-2609).
**Taille.** M, 3 à 4 jours.

### Lot 8 — SCHEMA_DATE, le rail ecrireChamps, la fiche (Diffusion, dérivés, jauge), l'essai « aucun champ oublié »

**Objectif.** Un schéma déclaratif de la date, un seul rail d'écriture client qui envoie toujours la date entière, les
feuilles « traiter sur place » dessus, une fiche qui montre ses champs dérivés avec leur raison et une section
« Diffusion » ; un bandeau quand la fiche ouverte a été modifiée ailleurs ; un essai qui prouve qu'aucune colonne de la
base n'est oubliée.

**Ce que voit Adrien à la fin du lot.** Dans la fiche d'une date, les champs qu'on ne saisit pas sont des puces grises
avec leur raison en infobulle (« Saison 2026-2027 : déduite du 18 déc. », « Début et fin : suivent les séances »,
« Public : mixte, d'après les séances », « Masquée : une répétition ne va jamais sur le site ») ; sous le titre, une
jauge de complétude (« 7 champs sur 9 ») avec « Compléter » qui vise le premier vide ; après le suivi interne, une
section « Diffusion » (étape, montant de cession, dernier contact, prochaine relance, notes de diffusion) si la base l'a,
et la source des chiffres. Si une autre administratrice enregistre la date qu'il a sous les yeux, un bandeau le dit
(« Modifiée à 14h32 par Barbara — Recharger »). Rien d'autre ne change de place.

**Fichiers et lignes touchés.**
- `admin/index.html` 2070-2083 (nouvelleDate / dateVersForm : suivi étendu, `chiffres.source`), 2078 (SCHEMA_DATE à côté), 2091-2103 (ecrireChiffres : source), 2108-2283 (editeurDate : libellés et aides depuis le schéma, section Diffusion après 2145-2149, puces dérivées près de l'aperçu 2157, jauge sous le titre), 2285-2304 (chargeDate : suivi étendu si E.ideale), 2311-2318 (ecrireDate : `ecrireSuiviEtendu` après le RPC tant que la v3 manque), 2338-2344 (rechargerDate relit chiffres et équipe), `ecrireChamps` (nouvelle, après ecrireDate), 1220-1230 (changement : le bandeau de la fiche ouverte).
- `admin/tableau.js` 745-788 (TRAITER.options / heures / contrats → ecrireChamps).
- `admin/parcours.js` 15 (`PARCOURS.completude(F)` par section), 69-73.
- `admin/gestes.js` 317-416 (types `montant` et `personne` déclarés dans lire() 359-360).
- `admin/tiroir.js` 28 (la fiche date s'ouvre avec `{ champ }` et vise `#s-contrat`…).
- `site/champs.mjs`, `supabase/tests/champs.mjs` (nouveaux) ; `site/tableau.mjs` 371-374 (le bloc « Confirmer la date ? » attend un rpc, plus un PATCH crescite_dates).

**Étapes.**
1. `SCHEMA_DATE` (forme en § 3) : une entrée par colonne de crescite_dates (base.sql:122-151), representations (153-166), dates_suivi (170-178 + ideale.sql:125-131, `confidentiel: true`, `jeux: ['diffusion']`), dates_chiffres (chiffres.sql:16-24), equipes (equipe.sql:87-96 : fonction, note) ; les `lire` / `ecrire` / `val` / `texte` des 21 colonnes d'aujourd'hui y sont portés depuis COLONNES (tableur.js, ex-2493-2548 ; les deux déclarations coexistent jusqu'au lot 10, qui retire l'ancienne) ; dérivés en `niveau: 'lecture'` avec `derive` : saison (trigger dates_avant base.sql:191), debut / fin / precision avec séances (dates_bornes 218), public de la date (chargeDate 2292), visible hors nature publiable (dates_nature 207, PUBLIABLE 2104).
2. `ecrireChamps(dateId, patch, { dire, annulable })` : `d = E.dates.find`, `F = dateVersForm(d)`, pour chaque `[k, v]` du patch `champ(k).ecrire(F, null, v)`, `manqueDate`, `ecrireDate(F, d, { libre: !!(d.intitule || '').trim() })`, phrase ; raccourcis `equipe` seule → enregistrerEquipeDate (equipe.js:1180), `chiffres` seuls → ecrireChiffres (2091) ; rend `{ ok, phrase }` ; `annoncer` avec Annuler (instantané de F avant, rejoué par ecrireChamps).
3. `ecrireDate` : après le RPC, `ecrireSuiviEtendu(id, F.suivi)` (upsert direct des cinq colonnes de diffusion si E.ideale et si elles ont changé ; `etape_crm` jamais écrit vide) ; avec `E.capacites?.enregistrer_date >= 3` (lot 9), un seul appel, et rechargerDate relit aussi `crescite_dates_chiffres` et `crescite_equipes`.
4. TRAITER (tableau.js:745-788) : options → `ecrireChamps(id, { statut, visible })` ; heures → `ecrireChamps(id, { representations })` (la recomposition de chargeDate revient : le public de la date) ; contrats → `ecrireChamps(id, { suivi: {…} })` ; tableau.mjs:371-374 est amendé dans le même commit : le bloc « Confirmer la date ? » vérifie désormais `MODIFS.some(m => m.rpc === 'crescite_enregistrer_date' && m.corps.d.statut === 'confirmee')`.
5. La fiche : les libellés et aides depuis le schéma ; la section « Diffusion » (si E.ideale, `<details>` fermé) avec, pour l'étape, le vocabulaire d'ETAPES_CRM (index.html:3923-3929 : contact_pris, dossier_envoye, option_discutee, contrat_signe, bilan) en lecture tant qu'Adrien n'a pas validé (question 3) ; `chiffres.source` dans « Les chiffres » (2151-2152) ; les puces dérivées (`<output>` avec `title`) ; la jauge `PARCOURS.completude(F)` (sections : date, séances, site, suivi, diffusion, chiffres, équipe), `role="progressbar"`, « Compléter » vise le premier champ vide (`visee` 678).
6. Le bandeau : dans changement() (1220), si la ligne reçue est la date ouverte (`#ed-date` dans la page ou le tiroir) et vient d'un autre compte (`p.new.modifie_par !== E.session.user.id`, le nom par crescite_admins), un bandeau en tête de fiche « Modifiée à 14h32 par Barbara — Recharger / Garder mes changements » ; dernier écrivain gagnant reste la règle, documentée.
7. L'essai à deux faces : `supabase/tests/champs.mjs` (PGlite, modèle preferences.mjs) charge les migrations et écrit `supabase/tests/champs-date.json` (les colonnes d'information_schema pour les cinq tables) ; `site/champs.mjs` compare ce JSON aux `k` de SCHEMA_DATE (chaque colonne a un champ, sauf une liste d'exclusions explicite : id, date_id, modifie_le, modifie_par).

**Préférences et adresse.** `?champ=` lu par le tiroir comme `?tiroir=` (hors LISTES_ADRESSE) ; rien d'autre.
**Accessibilité et clavier.** Les puces dérivées sont des `<output>` avec `title` et `aria-describedby` ; la section Diffusion porte « jamais publié, jamais exporté sans le demander » ; la jauge a `aria-valuetext` ; le bandeau est `role="status"` avec deux boutons ; Ctrl S inchangé.
**Mouvement.** `visee` (678-679) sur le champ visé ; la jauge roule (`chiffresRoulants`, MOUVEMENT.md) ; le bandeau paraît (`ad-arrive`) ; rien d'autre.
**Banc d'essai et vérifications.**
- `site/champs.mjs` : « aucun champ oublié » (`champs-date.json` couvert par SCHEMA_DATE ∪ dérivés ∪ exclusions) ; TRAITER.options depuis le tableau de bord → MODIFS porte un rpc `crescite_enregistrer_date` avec la date entière, aucun `PATCH crescite_dates` ; TRAITER.contrats avec un montant → upsert `crescite_dates_suivi` portant `montant_cession` après le rpc ; la fiche montre Diffusion quand DB a les tables idéales, pas sinon ; ≥ 3 puces dérivées et la jauge ; « Compléter » vise un champ (`.visee`) ; `changement()` appelé à la main avec `modifie_par` étranger sur la date ouverte → le bandeau ; Annuler rejoue l'instantané ; aucune erreur ; captures `fiche-derives.png`, `fiche-diffusion.png`.
- `node supabase/tests/champs.mjs` écrit le JSON ; tableau.mjs (bloc 371-374 amendé) vert.
**Documentation.** README (la fiche d'une date : Diffusion, dérivés, jauge, le bandeau ; « Le tableau de bord » : traiter sur place par le même chemin que la fiche ; supabase/tests 524) ; le commentaire de SCHEMA_DATE (le contrat d'un champ).
**Risques et parades.** Un payload partiel au RPC : impossible par construction (ecrireChamps part de dateVersForm). `etape_crm` à défaut non nul : affiché « — » tant qu'aucune étape n'a été choisie. Un champ `montant` dans GESTES.formulaire (partagé) : un type de plus, les autres inchangés. Un verrou optimiste côté base : hors plan (question 8).
**Taille.** M à L, 3 à 4 jours.

### Lot 9 — Base : la version 3 de crescite_enregistrer_date et crescite_capacites()

**Objectif.** Une migration qui rend le RPC conservateur (clé absente = valeur gardée), y range le suivi étendu, les
chiffres et l'équipe dans une même transaction, et expose une sonde unique ; son essai SQL ; le client qui sonde.

**Ce que voit Adrien à la fin du lot.** Rien de visible ; « La date est enregistrée, mais pas ses chiffres / son
équipe » ne peut plus arriver (tout passe ou rien) ; le site en édition n'efface plus les heures de fin. Sans ce script,
tout ce qui précède marche comme décrit, en trois écritures.

**Fichiers et lignes touchés.**
- `supabase/migrations/20261107_crescite_enregistrer_date_3.sql` (nouveau, après 20261106 : le dix-neuvième script).
- `supabase/tests/enregistrer3.mjs` (nouveau ; modèle preferences.mjs, étend base.mjs:41-72 et notifications.mjs:55).
- `admin/index.html` 1050-1068 (chargerTout sonde `crescite_capacites` → `E.capacites`), 2311-2318 (ecrireDate : un appel si v3), 2338-2344 (relecture étendue).
- `site/admin-fictif.mjs` 135 (le rpc `crescite_capacites` répond `{ enregistrer_date: 3 }` dans un bloc du banc, null ailleurs).
- `README.md` (après 954 : le dix-neuvième script), 524 (les essais).

**Étapes.**
1. `create or replace function public.crescite_enregistrer_date(d jsonb) returns bigint` (même signature, security invoker, execute pour authenticated : base.sql:507) : à l'update, chaque scalaire `case when d ? 'k' then … else k end` (lieu_id, fin, precision, saison, public, statut, visible, intitule, details, lien, nb_representations, nature) ; la clé `representations` présente = remplacement complet (sémantique « date entière » conservée, notifications.sql:104), et dans chaque séance `fin`, `lien`, `note`, `public`, `annulee` gardés si absents (98 : plus d'effacement de `fin` par edition.js:649-653) ; `suivi` : les quatre colonnes historiques (112-113) + `etape_crm`, `montant_cession`, `date_dernier_contact`, `date_prochaine_relance`, `notes_diffusion` quand elles existent (information_schema), chacune gardée si absente ; `chiffres` : upsert, ou delete si tout est vide (comme ecrireChiffres 2091) ; `equipe` : `[{ personne_id, present, fonction, note }]` = la liste voulue, delete des autres + upsert (comme enregistrerEquipeDate 1180-1190), si la table existe.
2. `create or replace function public.crescite_capacites() returns jsonb` → `{ "enregistrer_date": 3, "suivi_diffusion": bool, "equipe": bool, "chiffres": bool }` ; execute pour authenticated.
3. Idempotent, relançable, commenté en français ; les déclencheurs (dates_avant 191, dates_bornes 218, notif_horaires 273, notif_equipes 341, le journal) jouent inchangés dans la transaction ; `crescite.geste` inchangé.
4. `supabase/tests/enregistrer3.mjs` : les migrations dans l'ordre et dans le désordre ; une date écrite avec `fin` puis réécrite sans la clé garde `fin` ; `visible` absente garde `false` ; `representations` présente remplace ; `suivi.montant_cession` écrit et lu par l'administration seule (RLS base.sql:465) ; chiffres et équipe dans la même transaction (une erreur sur l'équipe annule la date) ; refus d'un non-administrateur (42501) ; `crescite_capacites()` répond ; base.mjs:41-72 et notifications.mjs:55 toujours verts ; une vingtaine d'essais.
5. Client : `E.capacites = (await sb.rpc('crescite_capacites')).data || null` dans chargerTout (PGRST202 → null) ; ecrireDate envoie tout en un appel si `E.capacites?.enregistrer_date >= 3`, sinon les trois écritures et leurs messages ; un message d'erreur unique « Pas enregistré : … » remplace les deux messages partiels.

**Préférences et adresse.** Aucune.
**Accessibilité et clavier.** Sans objet.
**Mouvement.** Sans objet.
**Banc d'essai et vérifications.**
- `node supabase/tests/enregistrer3.mjs` (≈ 20 essais, `npm install` dans supabase/tests).
- `site/champs.mjs` gagne un bloc « avec v3 » : avec le rpc de capacités à 3, une seule entrée MODIFS.rpc par geste, aucun upsert de suivi, de chiffres ni d'équipe à côté ; avec null, les trois écritures.
**Documentation.** README : le dix-neuvième script (ce qu'il change, la compatibilité, les clés acceptées), 524 ; l'en-tête du script.
**Risques et parades.** Un appelant qui comptait sur la remise à zéro par omission : aucun dans le dépôt (chargeDate envoie des null explicites ; edition.js:656 y gagne). La sémantique « clé présente à null » reste « effacer » : documentée. Le site public ne change pas (docs/index.html n'est reconstruit que si edition.js est touché : il ne l'est pas).
**Taille.** S à M, 1,5 à 2 jours.

### Lot 10 — Le tableur : COLONNES depuis le schéma, colonnes à la carte, hauteur, fenêtres posées

**Objectif.** Dériver COLONNES de SCHEMA_DATE une fois pour toutes ; rendre les colonnes pilotables (largeur, ordre,
masquage, figées) avec FENETRES, le CSS en variables, la hauteur du cadre respectueuse de la place ; mémoire
`tableur.colonnes`.

**Ce que voit Adrien à la fin du lot.** Le bord droit de chaque en-tête se tire ; un double-clic ajuste la colonne au
contenu ; un clic droit sur l'en-tête propose « Masquer », « Figer jusqu'ici », « Ajuster la largeur », « Avancer »,
« Reculer », « Trier » (jour), « Colonnes d'origine » ; un bouton « Colonnes… » dans la tête ouvre la liste cochable,
réordonnable par ↑ ↓ ou glisser ; une poignée sous le cadre règle sa hauteur, et le cadre suit le menu latéral replié ;
la fenêtre du lieu ou de la distribution sur une case retient sa largeur, l'éditeur long sa taille. Tout est retenu.

**Fichiers et lignes touchés.**
- `admin/index.html` 503 (`.tab-cadre` : les variables, la poignée basse), 509-511 (`left` cumulé des figées), 535-537 (`.tab-ed`), 538-556 (`width: var(--w-<k>, <défaut>px)`), 562-563 (`.tab-pop` : le coin).
- `admin/tableur.js` ex-2493-2548 (COLONNES = `SCHEMA_DATE.filter(c => c.colonne).map(colonneDe)` + les colonnes propres : commune en lecture, distribution ; l'ancienne déclaration retirée), ex-2569-2570 (possibles / colonnes : ordre, masquées, figées, vides), ex-2606-2616 (dessiner : thead avec poignées, menu, `style="--w-k"` sur `#tab-cadre`, `left` des figées), ex-2644-2648 (largeurs → `placer()` : ResizeObserver sur `#vue`, `--h-tableur` bornée), ex-2668-2672 (enVue lit `th.figee`), ex-2649 (cellule par k), ex-2893-2916 (poser : coin, largeur relue avant placer), ex-2764-2796 (editer : taille de `.tab-ed` retenue par colonne), ex-2727 (resize), ex-2520-2523 (le « +n » de la distribution par CSS).
- `admin/menus.js` (fournisseur de menu sur `#tab-tete th`), `admin/fenetres.js` (poignées des th : min 48, max 640).
- `site/tableur-colonnes.mjs` (nouveau).

**Étapes.**
1. `colonneDe(champ)` : du schéma vers le contrat d'une colonne (ex-2484-2486) selon `type` ; les 21 colonnes d'aujourd'hui ont `colonne: true` dans le schéma, les champs nouveaux non encore (le lot 12 les allume) ; `site/tableur.mjs` (lot 1) reste vert : même rendu.
2. CSS : chaque triplet 538-556 → `width: var(--w-<k>, 138px)` (min / max idem) ; `.c-spectacle { left: var(--w-jour) }` (510) devient `left: var(--l-<k>, 0)` posé par dessiner pour chaque colonne figée (somme cumulée) ; `.tab-cadre` reçoit les variables en style inline avant `innerHTML` (pas de saut).
3. `tableur.colonnes` : `{ ordre, masquees, figees, largeurs, vides }` normalisé contre COLONNES (clés inconnues ignorées, colonnes dont `si()` est faux tolérées, largeurs 48-640) ; `possibles()` filtre et ordonne ; `vides` quitte `session.tableur` (ex-2574).
4. dessiner : chaque `th` reçoit `FENETRES.poignee(…, { axe: 'x', bord: 'droite', min: 48, max: 640, ecrire: v => cadre.style.setProperty('--w-k', v), garder: débouncé dans tableur.colonnes.largeurs })` ; `mousedown` de la poignée en `stopPropagation` (le tri `.tab-tri` 508 garde son clic, le double-clic de la case 2723 aussi) ; double-clic sur la poignée = ajuster au contenu (`scrollWidth` des `td` visibles, une fois, hors transform) ; `th` `draggable` + Alt+← / → pour l'ordre ; `aria-sort` conservé.
5. Le menu d'en-tête (menus.js, cible `#tab-tete th`, Maj+F10 aussi) et la fenêtre « Colonnes… » (bouton à côté d'Exporter, ex-2578-2579 ; `poser()` avec cases, ↑ ↓, annonce « Lieu déplacée en 3e ») ; « Colonnes d'origine » → `PREFS.ecrire('tableur.colonnes', null)` avec « Annuler » ; « Disposition d'origine » (lot 6) l'inclut.
6. Hauteur : `placer()` = `min(--h-tableur ?? ∞, place sous le cadre jusqu'au bas de #vue − 24 px)`, bornée à 300, par ResizeObserver sur `#vue` (le menu replié ou une fenêtre ajustée changent la place) ; poignée basse `axe: 'y'` → `fenetres['tableur-h']`.
7. `poser()` : coin `FENETRES.poignee(pop, { axe: 'xy', bord: 'coin' })`, largeur relue avant `placer()` (`fenetres['tab-pop-lieu']`, `['tab-pop-distribution']`) ; `textarea.tab-ed` : taille par colonne (`fenetres['tab-ed-notes']`) reposée à l'ouverture.
8. Le compte « +n » de la distribution (ex-2522-2523, constante 232 / 7,4) devient un rendu CSS (`flex-wrap: nowrap; overflow: hidden`) avec un ResizeObserver unique sur `#tab-corps` qui pose `data-plus` après rendu.

**Préférences et adresse.** `tableur.colonnes` (largeurs au relâchement, le reste aussitôt), `fenetres['tableur-h']`, `fenetres['tab-pop-*']`, `fenetres['tab-ed-*']` ; rien de nouveau dans l'adresse.
**Accessibilité et clavier.** Grille `role=grid` intacte (aria-rowcount / colcount / colindex) ; poignées `role=separator` au clavier ; ordre au clavier (Alt+← / → sur un `th` focalisé) ; menu d'en-tête par Maj+F10 (gestes.js:204) ; l'aide « Le tableur » (menus.js:343-349) complétée.
**Mouvement.** Aucun pendant le glisser ; la remise s'anime une fois ; le menu paraît (150 ms) ; `pointermove` ne redessine jamais la grille.
**Banc d'essai et vérifications.**
- `site/tableur-colonnes.mjs` : une poignée par `th` à 1 600 px, aucune à 390 px ni avec `hasTouch` ; glisser la poignée de « Lieu » de +60 px → `--w-lieu` = 250px sur `#tab-cadre`, ECRITURES porte `tableur.colonnes` une fois ; rechargement → 250 retrouvé ; à 1 280 px une largeur gardée de 900 est bornée ; double-clic → ajustée ; → sur la poignée focalisée → +16 ; Maj+F10 sur « Commune » → « Masquer » → absente et `masquees` la porte ; « Figer jusqu'ici » sur « Lieu » → trois `th.figee` avec `left` croissants, enVue correct (une case de droite mise en vue n'est pas sous les figées) ; ordre déplacé par Alt+→ ; « Colonnes d'origine » → prefs à null ; menu replié → le cadre grandit ; la poignée du bas → `fenetres['tableur-h']` ; `.tab-pop` du lieu retient 420 px ; une rangée de distribution trop étroite porte `data-plus` ; aucune erreur ; captures `colonnes.png`, `colonnes-menu.png`.
- `site/tableur.mjs` (lot 1) toujours vert au même compte.
**Documentation.** README 430-434 (colonnes à la carte, hauteur) ; en-tête de tableur.js ; MOUVEMENT.md (rien de neuf) ; la clé `tableur.colonnes`.
**Risques et parades.** `left` des figées et `width: max-content` (504) : variables posées avant `innerHTML`. `largeurs()` écrasant la hauteur : une seule fonction `placer()` tient l'ordre « valeur de l'utilisateur bornée par la place ». Les media queries du téléphone (591-599) : inchangées, les variables ne s'écrivent qu'au pointeur fin. Deux déclarations de colonnes entre les lots 8 et 10 : le lot 10 retire l'ancienne, le banc du lot 1 prouve l'équivalence.
**Taille.** M à L, 3 à 4 jours.

### Lot 11 — Le tableur « Simple » : une ligne par date, le visuel des cases, le calendrier posé, la saisie tolérante, le rendu par ligne

**Objectif.** Le mode Simple (une ligne par date, six colonnes, grandes cases), le visuel « à la Excel » (petit
calendrier, liseré, pastilles d'heures, badges, états de case, barre d'état), le petit calendrier posé sur la case Jour,
les lecteurs tolérants et les cases ignorées dites et marquées, un rendu par ligne pour le temps réel, le budget mesuré.

**Ce que voit Adrien à la fin du lot.** En tête du tableur, un segment à icônes « Simple · Complet » (Distribution au
lot 13). Simple, par défaut : des lignes de 44 px ; le jour en petit calendrier (« JEU 5 NOV ») avec un bandeau de la
couleur du spectacle, et toute la ligne porte ce liseré à gauche, comme les lignes de la liste ; les séances en
pastilles d'heures (« 15h », « 20h30 », barrée si annulée, un « + » en bout), une case qui s'ouvre en fenêtre pour
ajouter, retirer ou changer une heure ; le spectacle avec sa pastille ; le lieu sur deux lignes (le nom, la commune) ;
le statut en badge coloré (option ambre, confirmée sauge, annulée corail, reportée indigo, « masquée » en second) ; la
distribution en pastilles (le lot 13 en fait des portraits). Une case en cours d'enregistrement passe en italique avec
un petit anneau ; enregistrée, une coche verte dans le coin s'efface ; en erreur, un anneau rouge et le message dans la
barre fine collée sous le cadre, avec « Annuler ». Sur le jour, un petit calendrier se pose sous la case (mois ‹ ›,
lundi en premier, aujourd'hui cerclé, Page ↑ ↓ pour changer de mois) ; on peut aussi taper « 05-11-2026 »,
« 2026/11/05 », « 5 nov 26 », « 20:30:00 », « 20 h ». On colle quinze lignes d'Excel : les cases non comprises se
surlignent en ambre vingt secondes, et l'état dit « 2 cases ignorées » avec « Voir ».

**Fichiers et lignes touchés.**
- `admin/tableur.js` ex-2553-2567 (lignes : mode Simple groupé `{ d, rs }`), ex-2573-2601 (la tête : le segment des modes), ex-2606-2643 (dessiner par ligne : `dessinerLigne(cle)` ; `.tableur.simple` ; `.tab-jj` dans la colonne jour ; les en-têtes avec l'icône de type à la place du souligné pointillé), ex-2423-2440 (lireJour / lireHeure élargis), ex-2764-2796 (editer : type jour → `.tab-cal` ; type `seances` → fenêtre posée), ex-2688-2694 (etat : la barre collée), ex-3201-3222 (coller : les cases ignorées `.ignoree` listées), ex-2596 (corps.rafraichir ciblé par date), la colonne `seances` (type `seances`, niveau date, `html` en pastilles, `lire` « 15h · 20h30 », `ecrire` remplace `F.representations`).
- `admin/index.html` 503-534 (CSS : `.tableur.simple`, `.tab-jj`, `.tab-heure`, le liseré sur `td.c-jour`, les bandes 512-513 adoucies, les en-têtes 507, `td.erreur`, `.tab-ligne-etat` 495 collée sous le cadre), 525 (en-cours), 674-675 (tab-ok + la coche), 793-805 (`mode` entre dans l'entrée `dates` de LISTES_ADRESSE), 1220-1230 (changement passe `p.new.id` / `date_id` à rafraichirListes), 1654-1660.
- `admin/habillage.js` 89-93 (`.tab-jj` rejoint `.jj`), 106.
- `admin/menus.js` 343-349 (l'aide du tableur gagne les modes et le calendrier).
- `site/tableur-simple.mjs` (nouveau) ; `site/mouvement-admin.mjs` (bloc budget à 300 dates).

**Étapes.**
1. `MODES = { simple: { colonnes: ['jour', 'seances', 'spectacle', 'lieu', 'statut', 'distribution'], parDate: true }, complet: { parDate: false } }` ; `T.mode = session.dates.mode` (défaut PREFS `tableur.mode`, puis 'simple') ; le segment à icônes dans la tête ; `mode` dans l'adresse (`?mode=complet`, hors défaut) et dans PREFS.
2. lignes() en Simple : une ligne par date `{ d, rs: repsDe(d.id), cle: `${d.id}:d` }` ; les colonnes de niveau `seance` ne sont pas montrées ; la colonne `seances` rend les pastilles (barrée si annulée, « sco » si scolaire) et s'édite dans une fenêtre posée (poser) qui liste les séances (jour, heure, fin, ＋ / ✕) et écrit `ecrireChamps(id, { representations })` ; `lire` accepte « 15h · 20h30 » et « 15h, 20h30 » (collage).
3. Le visuel : `.tableur.simple` (padding 10 px 12 px, 14,5 px, lignes 44 px, lues depuis `--pas` du lot 5) ; `.tab-jj` (42 px, bandeau 4 px `--c`, « JEU » Raleway 10 px, « 5 » Ubuntu 19 px, comme habillage.js:89-91) ; le liseré 4 px `--c` sur `td.c-jour` (comme `.ligne` 225) ; `.tab-heure` (rayon 999, fond `--doux`, Ubuntu 600 13 px ; annulée barrée sur `--alerte-doux`) ; les badges de statut par les variables existantes (`--option`, `--sauge`, `--alerte`, `--indigo` et leurs `-doux`) ; les en-têtes en `.etiquette` (lot 16 l'unifie) avec une icône de type 14 px (agenda, horloge, masques, épingle, coche-cercle, équipe) à la place du souligné pointillé (507) ; bandes b0 / b1 adoucies (513 : 40 %).
4. Les états : `td.en-cours` italique `--option` (525) + un anneau `::after` qui tourne (transform seulement, fixe sous reduced motion) ; `td.enregistree` : `tab-ok` (674-675) + une coche 12 px en haut à droite qui s'efface ; `td.erreur` : anneau `--alerte`, le message en `title` ; `.tab-ligne-etat` (495) devient `position: sticky; bottom: 0` sous le cadre, avec l'icône, la phrase et « Annuler ».
5. `.tab-cal` posé par `poser()` pour le type jour : « ‹ Novembre 2026 › » en Ubuntu 15, grille 7 × 6 de 32 px `role=grid` `aria-label`, lundi en premier, aujourd'hui cerclé `--accent`, le jour choisi en `--principal`, les jours hors mois gris 50 % ; clavier : flèches, Page ↑ ↓ (mois), Entrée, Échap ; natif() (ex-2402) garde le champ natif au tactile.
6. Les lecteurs : lireJour gagne `jj-mm-aaaa`, `aaaa/mm/jj`, « 5 nov 26 » ; lireHeure gagne « 20:30:00 », « 20 h », « 20h 30 » ; les mêmes servent à la saisie, au collage (ex-3205) et à l'import (ex-3340) ; un intervalle « du 5 au 7 nov » est refusé proprement (question 9).
7. Le collage : `coller()` garde la liste des `{ ligne, colonne, brut, raison }` ignorés, les marque `.ignoree` (fond `--option-doux`, `title` avec la raison) vingt secondes, et `etat()` dit « n cases ignorées » avec « Voir » qui active la première.
8. Rendu par ligne : `dessiner()` complet au changement de filtre, de mode ou de colonnes ; `dessinerLigne(cle)` pour le temps réel (changement 1220 passe `p.new.id` / `date_id` → `corps.rafraichir(ids)`) et pour `ecrire` ; `T.textes` par ligne ; `vient-d-ailleurs` / `enregistree` inchangés.

**Préférences et adresse.** `tableur.mode` (aussitôt) ; `?mode=` dans l'adresse ; les filtres communs (lot 7).
**Accessibilité et clavier.** `role=grid` gardé ; le segment des modes `role=group` + `aria-pressed` ; la fenêtre des séances `role=dialog` avec `aria-label="Séances du jeu. 5 nov. 2026"`, Tab circulaire, Échap ; les pastilles d'heures sont du texte ; `.tab-cal` `role=grid` `aria-selected` ; les cases ignorées ont un `title` et sont listées dans l'état (`aria-live="polite"`) ; les icônes de type `aria-hidden` avec le libellé à côté.
**Mouvement.** Le changement de mode redessine sans transition (une grille n'entre pas en cascade : budget) ; la coche paraît et s'efface (`tab-ok` 1,4 s) ; l'anneau « en cours » tourne (transform) ; le calendrier et la fenêtre des séances se posent en 150 ms (682) ; une ligne redessinée ne rejoue aucune entrée ; rien sous CALME_ADMIN.
**Banc d'essai et vérifications.**
- `site/tableur-simple.mjs` : Simple par défaut = 6 `th`, 6 lignes (une par date à venir), `.tableur.simple` ; la date 103 (deux séances, 10:00 et 14:30) tient sur une ligne avec deux `.tab-heure` ; Entrée dessus ouvre `.tab-pop` avec deux lignes, ✕ sur la seconde → rpc avec une seule représentation ; « Complet » = 7 lignes, `?mode=complet` dans l'adresse, ECRITURES porte `tableur.mode`, rechargement retrouve ; changer le statut → `td.en-cours` puis MODIFS rpc avec le statut et `td.enregistree` ; une erreur simulée (rpc 400 dans le bloc) → `td.erreur` et la barre d'état avec Annuler ; le calendrier : ouvrir sur Jour, → puis Entrée → le jour + 1 dans MODIFS ; `TABLEUR.lireHeure('20:30:00')` et `lireJour('05-11-2026')` via page.evaluate ; coller « xx\t20h » dans une plage → 1 `.ignoree`, état « 1 case ignorée » ; `td.c-jour` a un liseré de la couleur du spectacle ; le cadre touche le bas de la fenêtre à 24 px près, menu déplié ; un bloc pousse 300 dates × 2 séances dans DB et vérifie, à CPU=4, aucune tâche > 200 ms après l'ouverture ni après `changement()` appelé à la main (tableau.mjs:208) ; aucune erreur ; captures `tableur-simple.png`, `tableur-complet.png`, `calendrier.png`, `tableur-1280.png`, `tableur-jour.png`.
- `site/tableur.mjs` (lot 1) rejoué en `?mode=complet` : vert.
**Documentation.** README 430-434 réécrit (les modes, le calendrier, les états, les formats lus, les cases ignorées) ; MOUVEMENT.md (la coche, l'anneau, le calendrier) ; en-tête de tableur.js ; l'aide « ? ».
**Risques et parades.** Le DOM d'un tableur sur une saison : rendu par ligne et six colonnes en Simple, mesuré à CPU=4. Une case de niveau séance en Simple : masquée, la fenêtre des séances la porte. Écrire une heure sur une date « période » crée une séance en silence (repDe ex-2487-2491) : en Simple, la fenêtre des séances dit « Cette date est une période (5 → 7 nov.) : ajouter une séance la fixe au jour » (le garde-fou complet est au lot 12). Le temps réel pendant une saisie : `T.edition` / `T.pop` (ex-2596) inchangés.
**Taille.** L, 5 à 6 jours.

### Lot 12 — Le mode Complet : chaque champ atteignable, les jeux, Diffusion, Ctrl+Entrée, l'import générique

**Objectif.** Toutes les colonnes depuis le schéma (y compris le jeu Diffusion masqué et jamais exporté sans case), les
jeux nommés, le tiroir par Ctrl+Entrée sur le champ visé, les garde-fous de la ligne « période », l'import générique.

**Ce que voit Adrien à la fin du lot.** En Complet, une colonne pour chaque champ : ligne du site, précisions (une par
ligne), billetterie de la séance, nombre de représentations, précision (jour / période / mois), fin de période,
saison (lecture), feuille de route (lecture, cliquable), modifié le · par (lecture), source des chiffres, fonction du
remplaçant ; un menu « Jeu » : Site, Tournée, Suivi, Bilan, Tout, et, si Adrien le valide, **Diffusion** (étape, montant
de cession, dernier contact, prochaine relance, notes de diffusion), masqué d'office, avec un cadenas dans l'en-tête ;
l'export ne les prend qu'avec la case « Inclure la diffusion (confidentiel) ». Une icône « fiche » en bout de ligne et
Ctrl+Entrée ouvrent la date dans le tiroir, sur le champ voulu, qui s'allume ; la grille se met à jour derrière. Taper
dans la ligne d'une période demande « Ajouter une séance ce jour, ou déplacer le début ? » ; « Détacher cette séance
dans sa propre date » existe. « Importer » lit toutes les colonnes qu'il reconnaît (les chiffres et le site compris).

**Fichiers et lignes touchés.**
- `admin/index.html` : SCHEMA_DATE (`colonne: { largeur, icone }` allumée sur les champs nouveaux ; `jeux` par champ).
- `admin/tableur.js` (COLONNES suit le schéma sans réécriture ; `JEUX` ; ex-3224-3327 export : `exporte`, `confidentiel`, la case du menu Exporter ex-488 ; ex-3329-3371 ENTETES_LUS et lireImport génériques, ORDRE_EXPORT ex-3334 aligné sur les colonnes visibles ; ex-2487-2491 repDe : le garde-fou ; « Détacher » dans ecrire ex-2825-2868 ; Ctrl+Entrée dans clavier ex-2730 ; l'icône fiche en bout de ligne).
- `admin/tiroir.js` 28 (la fiche date s'ouvre avec `{ champ }` ; `TIROIR.peut` répond vrai sur `/tableur` : la page n'a pas de zone `ed-date`, 44-47).
- `admin/menus.js` 343-349 (aide) ; `admin/equipe.js` 1160-1165 (ajouter() : un écart `present: true` avec fonction pour un membre de la distribution), 1189-1190 (enregistrerEquipeDate compare aussi `note`).
- `site/tableur-complet.mjs` (nouveau) ; `README.md` 431-434, 457-458.

**Étapes.**
1. Dans le schéma, `colonne: true` (avec largeur et icône) sur : billetterie de séance (`r.lien`, niveau seance, lien), fin de période, précision (choix jour / période / mois, `fige` dès qu'une séance existe), nombre de représentations (`fige` si séances), ligne du site (`intitule`, `libre = true` à l'écriture), précisions (`details`, type `riche` : lecture résumée « n précisions », édition dans le tiroir), saison (lecture, `derive`), feuille de route (lecture : à composer / brouillon / publiée, lien), modifié le · par (lecture), source des chiffres, fonction et note de l'écart (niveau equipe), et le jeu Diffusion (`confidentiel`).
2. `JEUX = { Site: [...], Tournée: [...], Suivi: [...], Bilan: [...], Diffusion: [...], Tout: null }` ; choisir un jeu écrit `tableur.colonnes.jeu` et `masquees` ; Diffusion masqué par défaut, ses colonnes `confidentiel` jamais dans l'export ni dans Google Sheets sans la case « Inclure la diffusion (confidentiel) » du menu Exporter (décochée par défaut, jamais mémorisée) ; cadenas (ICONES) et bande `--ciel-doux` dans l'en-tête.
3. Ctrl+Entrée et `.tab-fiche` (icône `fiche`) en bout de ligne → `TIROIR.ouvrir('#/representations/<id>', { depuis: td, champ })` ; `?champ=` lu par le tiroir comme `?tiroir=` ; à la fermeture, la case reprend le focus ; `corps.rafraichir(ids)` redessine la ligne derrière (rechargerDate + temps réel).
4. Le garde-fou de la période : dans `editer()`, si `!x.r && c.niveau === 'seance'` → GESTES.menu « Ajouter une séance ce jour (la période devient un jour) · Déplacer le début · Annuler » au lieu de créer en silence ; « Détacher cette séance dans sa propre date » dans le menu d'une ligne (ajouterSeance avec date, suivi et équipe copiés puis retrait, un seul défaire ; T.file sérialise).
5. L'import générique : `lireImport` part de `nouvelleDate()` et applique `champ.lire` / `champ.ecrire` pour chaque `entetes` reconnu ; l'aperçu (ex-3384) montre toutes les colonnes lues ; « site » appliqué ; les chiffres importés.
6. La fonction (et la note) d'un membre de la distribution pour la date : ajouter() (equipe.js:1160) crée l'écart `present: true` avec fonction ; ecartsPour (tableur.js ex-2475-2480) reçoit `{ fonctions }` ; enregistrerEquipeDate compare la note (1189-1190).

**Préférences et adresse.** `tableur.colonnes.jeu` ; `?champ=` pour le tiroir ; rien d'autre.
**Accessibilité et clavier.** Ctrl+Entrée déclaré au registre (« Le tableur ») et en `aria-keyshortcuts` sur `.tab-fiche` ; le cadenas a « confidentiel » en `.sr` ; `aria-readonly` sur les lectures ; les colonnes figées (`fige`) disent pourquoi en `title`.
**Mouvement.** `visee` 1,6 s sur le champ (678) ; le tiroir glisse (tiroir.js:257) ; rien d'autre ; rien sous CALME_ADMIN.
**Banc d'essai et vérifications.**
- `site/tableur-complet.mjs` : en Complet, les colonnes « Ligne du site », « Nombre de représentations », « Précision » existent, chacune avec une étiquette et un `title` ; « Jeu : Site » → 7 colonnes ; Diffusion absente par défaut, présente après « Jeu : Diffusion », avec le cadenas ; écrire « 1 200 » dans Montant → MODIFS porte un upsert `crescite_dates_suivi` avec `montant_cession: 1200` (sans v3) ; le CSV (TABLEUR.tableau() par evaluate) sans la case n'a pas le montant, avec la case il l'a ; Ctrl+Entrée sur une ligne → `.tiroir.la #ed-date` et `#s-contrat` visé, Échap rend le focus à la case ; écrire une heure sur la ligne de la date 106 (période) → `.gm-boite` avec « Ajouter une séance ce jour » ; « Détacher » → deux écritures, un seul Ctrl+Z ; l'import de « Jour\tSpectacle\tJauge » applique la jauge ; `champs.mjs` (lot 8) rejoué : chaque champ `colonne` du schéma a un `th` en « Tout » ; aucune erreur ; captures `complet-jeux.png`, `complet-diffusion.png`, `tiroir-depuis-grille.png`.
**Documentation.** README 431-434 (les colonnes, les jeux), 457-458 (la règle réécrite si Adrien valide : « masqué d'office, jamais exporté sans la case ») ; l'aide « ? » ; en-têtes.
**Risques et parades.** Le jeu Diffusion contredit le README 457-458 : décision d'Adrien, l'export reste exclu sans case. `ORDRE_EXPORT` (ex-3334) supposait toutes les colonnes : aligné sur les visibles. Un renfort recomposé perdait sa fonction : `{ fonctions }`.
**Taille.** M à L, 4 à 5 jours.

### Lot 13 — La distribution : distribution.js (cellule, fenêtre, matrice, impact), la fiche

**Objectif.** Qui joue, qui part, sur chaque date : une cellule lisible, une fenêtre riche qui dit qui sera prévenu, le
mode « Distribution » (la matrice dates × personnes avec les alertes), le bloc de la fiche enrichi, la distribution d'un
spectacle avec son volet d'impact.

**Ce que voit Adrien à la fin du lot.** Dans la cellule, des avatars de 24 px à initiales qui se chevauchent, rangés par
métier avec un liseré de la couleur du métier (jeu prune, création indigo, technique ambre, production sauge) ; un
remplaçant ou un renfort a un anneau pointillé ambre ; qui ne part pas est gris et barré ; un badge « −1 » corail quand
l'équipe est plus petite que la tournée ; « +n » quand la place manque. La fenêtre d'une case a deux blocs : « En
tournée » (une case par personne avec son portrait, sa fonction, son téléphone) et « Remplaçants et renforts » (nom,
fonction, « Remplace Lauren » proposé quand on vient de la décocher, créer une fiche au vol), des puces de métier pour
filtrer, et, en pied, « 2 personnes seront prévenues : vous partez / ne partez plus ». Le troisième bouton du tableur,
**Distribution** : pour le spectacle filtré (sinon une grille par spectacle, l'une sous l'autre), une colonne par
personne (portrait, prénom, bandeau du métier, alerte si le téléphone manque), une ligne par date, une case ✓ (part) /
✕ (ne part pas) / ⟳ (remplaçant) ; un clic ou Espace bascule ; un point corail signale une indisponibilité ; le menu
d'une colonne offre « Régler sa période ». « Étendre à… » gagne « cette date et les suivantes au même lieu » et garde les
remplaçants posés à la main. Dans Spectacles → Distribution, avant d'ajouter ou de retirer quelqu'un « en tournée » :
« 3 dates à venir changent d'équipe, 2 personnes seront prévenues — limiter à une période ? ».

**Fichiers et lignes touchés.**
- `admin/distribution.js` (nouveau : `DISTRIBUTION.cellule(d)`, `fenetre(td, d)`, `matrice(f)`, `impact(spId, changement)`).
- `admin/tableur.js` (ex-2520-2523 cellule → DISTRIBUTION.cellule ; ex-2940-2994 editerEquipe → DISTRIBUTION.fenetre ; ex-2996-3052 etendre : fusion des remplaçants, portée « même lieu, dates suivantes » ; `MODES.distribution` → DISTRIBUTION.matrice).
- `admin/equipe.js` 86 (avatar : une variante `.avatar.mini` 24 px à créer, à côté de `.avatar.petit` 3321), 98-110 (equipeDate : `ajout`), 1137-1178 (blocEquipeDate : rangée d'avatars par métier, lien « remplace X », résumé des notifications), 749-805 (ongletDistribution : le volet d'impact avant ajouterADistribution 480 / retirerDeDistribution 492, presences 594, reglerPeriode 638), 613-627 (ecrireEcarts), 1133 (telEquipe), 1327 (categoriesDe), 252-254 (portraits privés : jamais dans la grille), 33 (CATEGORIES).
- `admin/gardefous.js` 29-61 (une fonction `GARDEFOUS.indisposDe(pid, jours)` pour la matrice).
- `admin/selection.js` 43 (le genre date dans la matrice : les lignes portent `a.ligne[href]`).
- `admin/index.html` 568-577 (CSS des listes de la fenêtre), 4584-4587 (ligne de script après equipe.js, avant planning.js) ; `admin/habillage.js` 95-98 (liserés de nuit 3:1).
- `site/build.py` 1116-1118 ; `site/distribution.mjs` (nouveau) ; `site/admin-fictif.mjs` 66, 74-80 (DB garnie dans le bloc du banc).

**Étapes.**
1. `DISTRIBUTION.cellule(d)` : avatars initiales (`avatar(p, true)` plus la classe `mini` ; aucune URL signée), ordre `categoriesDe`, classes `.remplacant` (ajout) / `.absent` (écart `present: false`), badge « −n », « +n » mesuré (lot 10) ; cases en texte et CSS, pas de SVG par case.
2. `DISTRIBUTION.fenetre(td, d)` reprend blocEquipeDate (1143-1152) dans un `.tab-pop.large` : cases « part » avec portrait et fonction, champ fonction des renforts (« Remplace X » proposé quand quelqu'un vient d'être décoché), comboPersonne avec création, puces de métier, téléphone (telEquipe 1133) ; calcule qui sera prévenu comme crescite_membres_date (notifications.sql:199-210 : ceux qui ont un compte, parmi ceux dont la participation change) ; Enregistrer → `ecrireChamps(id, { equipe })` par `ecartsPour({ fonctions })`.
3. `DISTRIBUTION.matrice(f)` : colonnes = `distributionDe(sp)` en tournée puis les renforts rencontrés (portrait en `th`, groupées par catégorie, alerte téléphone manquant) ; lignes = les dates filtrées (sans spectacle : une grille par spectacle avec son en-tête) ; case = ✓ / ✕ / ⟳ (texte en `.sr`, glyphes CSS) ; clic ou Espace bascule via ecartsPour → `ecrireChamps` (défaire empilé) ; le menu d'une colonne : « Régler sa période » (reglerPeriode 638) ; les cases colorées par GARDEFOUS (indisponible, déjà ailleurs) ; une ligne en bas : « n dates » par colonne ; Maj+clic sur des lignes → sélection (selection.js:43) → « Étendre à… ».
4. etendre : fusion (un remplaçant posé à la main n'est écrasé qu'après l'aperçu ; les écarts à fonction non vide gardés) ; portée « cette date et les suivantes du même lieu » (`dd.lieu_id === d0.lieu_id && dd.debut >= d0.debut`).
5. ongletDistribution : `DISTRIBUTION.impact(spId, { pid, sens })` avant ajouter / retirer : dates à venir qui changent (presences 594), membres avec compte prévenus, « limiter à partir d'aujourd'hui » coché par défaut (reglerPeriode) ; pas de nouveau déclencheur SQL (question 5).
6. La fiche : blocEquipeDate dessine les avatars par catégorie, le badge fonction / rôle, le lien « remplace X », fonction et note modifiables (lot 12), et le résumé « n personnes seront prévenues » (crescite_notif_equipes 341-366).

**Préférences et adresse.** `tableur.mode = 'distribution'` (`?mode=distribution`) ; le spectacle filtré est déjà dans `session.dates.spectacle` ; `tableur.distribution.personnes` seulement si Adrien veut choisir qui s'affiche (question 7).
**Accessibilité et clavier.** La matrice reste `role=grid` ; chaque case un gridcell avec un bouton `aria-pressed` et `aria-label="Lauren Toulin · 5 nov. : part"` ; Espace / Entrée basculent ; avatars `aria-hidden`, noms en `.sr` ; la fenêtre annonce qui sera prévenu ; focus rendu à la case après la fenêtre ; alertes GARDEFOUS avec `title` et texte.
**Mouvement.** Une case qui bascule saute (`ad-pop`, ressort 450 ms) ; la fenêtre se pose en 150 ms ; les avatars n'animent pas ; budget mesuré sur 120 dates × 8 personnes ; rien sous CALME_ADMIN.
**Banc d'essai et vérifications.**
- `site/distribution.mjs` : le bloc garnit `DB.crescite_equipes` (date 101 : la personne 2 `present: false` ; la personne 3 renfort « régie ») et pose l'indisponibilité de la ligne 66 (personne 2, jour + 3) sur la date 101 ; la cellule de 101 montre deux `.avatar.mini`, un barré, un anneau pointillé, « −1 » ; Entrée → `.tab-pop.large` avec « En tournée » et « Remplaçants » ; décocher → placeholder « Remplace … » ; « 1 personne sera prévenue » ; ajouter « Camille » avec fonction « régie » → MODIFS porte un upsert `crescite_equipes` on_conflict avec `fonction: 'régie'` (admin-fictif.mjs:159-165) ; la matrice (mode, spectacle 1) : une colonne par personne en tournée, une ligne par date, ✓ → ✕ au clic → MODIFS, Ctrl+Z la remet ; le point d'alerte sur la case indisponible ; Maj+clic sur une colonne → « Régler sa période » ; « Étendre à… » propose « au même lieu » ; dans Spectacles, retirer quelqu'un ouvre l'impact (« dates à venir changent ») ; la fiche montre la fonction d'un membre ; « Prévenir l'équipe » rpc rend 2 (admin-fictif.mjs:135) ; aucune erreur ; captures `distribution-cellule.png`, `distribution-fenetre.png`, `distribution-matrice.png`, `distribution-impact.png`.
- `site/tableur.mjs` et niveau.mjs verts.
**Documentation.** README 448-452 (la distribution : cellule, fenêtre, matrice, étendre), la fiche d'une date, Spectacles (l'impact) ; MOUVEMENT.md (la case qui saute) ; en-tête de distribution.js.
**Risques et parades.** Portraits privés (equipe.js:252-254) : initiales dans la grille, photos en fenêtre et matrice seulement si `portraitPrive` est faux. « Étendre » écrasant des remplaçants : l'aperçu reste, la fusion est proposée. Un changement de distribution rétroactif et silencieux (aucun déclencheur sur crescite_distributions) : le volet d'impact et la période par défaut. 300 lignes × 12 colonnes : cases en texte, pas de SVG par case.
**Taille.** L, 5 à 6 jours.

### Lot 14 — Les fenêtres restantes : planning, carte, tuiles, éditeur A4

**Objectif.** Finir l'attente 3 sur les surfaces qui restent, avec le même module FENETRES, sans toucher aux défauts des
modules partagés.

**Ce que voit Adrien à la fin du lot.** La même ligne de 2 px partout : entre la grille du planning et son détail (et,
au-dessus de 1 200 px, le détail peut se mettre à côté en vue Équipe), entre la carte et la colonne des étapes, sous
chaque tuile en mode « Personnaliser » ; l'éditeur A4 gagne « − 100 % + Ajuster » et Ctrl+molette, et son bureau défile.

**Fichiers et lignes touchés.**
- `admin/planning.js` 527 (`minmax(0, 1fr) var(--pl-detail, 300px)`), 534 (option `detail: 'cote' | 'dessous'`), 550 (la feuille du téléphone, intacte), 1012-1016 (animerDetail : pas de mesure pendant).
- `admin/disponibilites.js` 175-199 (pose l'option et `poignees: true` sous html.admin).
- `admin/tournee.js` 99-101 (`.tn-deux` : `minmax(0, var(--l-tn, 1.3fr)) minmax(320px, 1fr)` + séparateur ; le SVG suit), 67 (l'échelle recalculée).
- `admin/tableau.js` 81, 323 (normaliser : `tuiles[k].hauteur`), 436-445 et 1247-1249 (hauteur par tuile en mode Personnaliser, `--h-tuile`, corps en overflow auto ; la grille est `align-items: start` 1243).
- `admin/equipe.js` 1910 (`.a4-bureau` overflow auto), 1900 (`.a4-outils` sticky, inchangé), 2669-2675 (ajusterEchelle → zoom choisi borné), 2678 (paginer mesure hors échelle : diviser par s).
- `site/fenetres-2.mjs` (nouveau).

**Étapes.**
1. Planning : la variable et une poignée entre grille et détail, seulement si `options.poignees` (posée par disponibilites.js sous `html.admin` ; l'espace de l'équipe ne change pas) ; `options.detail = 'cote'` aussi en vue Équipe au-dessus de 1 200 px ; animerDetail (1012-1016) inchangé et non mesuré pendant `html.redim`.
2. Carte : `--l-tn` + séparateur ; « Autour des dates » reste l'ajustement automatique ; le viewBox persiste à travers `dessiner()` (le lot 15 le pilote).
3. Tuiles : une poignée basse par tuile en mode « Personnaliser » écrit `--h-tuile` (corps en overflow auto) ; `conf.tuiles[k].hauteur` normalisée (323) et gardée par garder() (378) ; « Annuler » (605-613) couvre la hauteur ; « lignes par sujet » (190) reste le moyen sobre.
4. A4 : `fenetres['a4-zoom']` ; `s = zoom choisi (50-200 %) borné par la place` ; boutons − / 100 % / + / Ajuster et Ctrl+molette dans le bureau seulement ; `.a4-bureau` en overflow auto (1910) ; paginer (2678) mesure hors échelle ; l'impression et le PDF inchangés (FEUILLE.MISE).

**Préférences et adresse.** `fenetres['pl-detail']`, `fenetres.tn`, `fenetres['a4-zoom']` ; `accueil.tableau.tuiles[k].hauteur` ; rien dans l'adresse.
**Accessibilité et clavier.** Séparateurs au clavier ; le zoom A4 a des boutons nommés et un `aria-live` « Zoom 125 % » ; Ctrl+molette ne vole pas le zoom du navigateur hors du bureau ; la poignée d'une tuile n'existe qu'en mode Personnaliser (pas d'arrêt de Tab en plus en lecture).
**Mouvement.** Comme le lot 6 ; l'A4 change d'échelle sans transition (les mesures) ; rien sous CALME_ADMIN.
**Banc d'essai et vérifications.**
- `site/fenetres-2.mjs` : `#/planning` vue Mois à 1 440 px → poignée, `--pl-detail` change et est retenue ; `PLANNING.monter` appelé par le banc sur une racine d'essai sans `poignees` → aucune `.poignee` dans la grille ; `#/representations/carte` → séparateur, `--l-tn` écrit ; tableau de bord Personnaliser → poignée basse sur une tuile, `conf.tuiles.urgent.hauteur` dans ECRITURES ; feuille de route A4 → zoom 125 % puis Ajuster, pagination inchangée ; au téléphone, aucune poignée ; niveau.mjs (carte, planning) et tableau.mjs verts ; `node site/mouvement-equipe.mjs` vert (planning.js partagé) ; captures `planning-detail.png`, `carte-separateur.png`, `tuile-hauteur.png`, `a4-zoom.png`.
**Documentation.** README (planning, carte, tableau de bord « Personnaliser », feuilles de route A4 : une ligne chacun) ; en-têtes de planning.js (l'option) et de fenetres.js.
**Risques et parades.** Fuite des poignées dans l'espace de l'équipe : option explicite + `html.admin`, vérifiée par le banc. La pagination A4 sous échelle : mesurer hors transform ou diviser par s (MOUVEMENT.md). Une tuile haute qui tirerait ses voisines : `align-items: start` (1243) laisse les voisines.
**Taille.** M, 3 à 4 jours.

### Lot 15 — La carte comme vue de travail

**Objectif.** La carte devient une vue où l'on travaille, pas seulement une vue qu'on regarde : les pastilles sont des
points d'entrée, le survol relie la carte aux étapes, le zoom et le déplacement, la date s'ouvre en tiroir sans quitter
la carte.

**Ce que voit Adrien à la fin du lot.** Cliquer une pastille ouvre un menu : les dates du lieu (chacune en tiroir),
« Nouvelle date ici », l'itinéraire, la fiche du lieu ; Maj+clic sélectionne les dates du lieu (la barre flottante
paraît : statut, dupliquer vers…, écrire aux contacts) ; survoler une pastille allume ses étapes dans la colonne de
droite, et inversement ; en coin de la carte, trois boutons (+, −, « Toute la France »), Ctrl+molette et le glisser
règlent la vue, « Autour des dates » recadre ; les étapes portent les badges de statut et les points du parcours ; une
carte vide le dit avec « Toutes les périodes ».

**Fichiers et lignes touchés.**
- `admin/tournee.js` 56-83 (dessiner : garde la pastille focalisée et le viewBox à travers un redessin ; les pastilles portent `data-dates` ; le vide illustré), 67-68 (l'échelle recalculée au zoom), 78-79 (pastilles : menu, Maj+clic, survol), 93-95 (ouvrirLieu → le menu, clic et Entrée / Espace), 97-121 (le `<style>` : `.tn-pin.allume`, `.tn-date.allume`, `.tn-zoom`), 123 (API : `TOURNEE.viser`).
- `admin/menus.js` 55-70 (un fournisseur « lieu sur la carte » : Ouvrir en tiroir, Nouvelle date ici, Itinéraire, Fiche du lieu, Feuille de route).
- `admin/tiroir.js` 44-47 (`TIROIR.peut` répond vrai sur la carte : pas de zone `ed-date`).
- `admin/selection.js` 43 (le genre date accepte `[data-dates]` des pastilles).
- `admin/index.html` 1948-1952 (`E.dateDepart` avec le lieu pour « Nouvelle date ici »).
- `admin/parcours.js` 69-73 (les points dans les étapes) ; `admin/fond-carte.js` (inchangé).
- `site/carte-travail.mjs` (nouveau).

**Étapes.**
1. Le fournisseur GESTES.menu sur `.tn-pin` : les dates du lieu (titre, jour ; `TIROIR.ouvrir`), « Nouvelle date ici » (`E.dateDepart = { lieu_id }` puis `#/representations/nouvelle`), itinéraire (ICO.carte), fiche du lieu, feuille de route ; Entrée et clic l'ouvrent (93-95).
2. Maj+clic → SELECTION (selection.js:43 étendu à `[data-dates]`) ; la barre propose les actions des dates.
3. Survol ou focus d'une pastille → `.allume` sur ses `.tn-date[data-lieu]` dans `#tn-etapes` (fond `color-mix(in srgb, var(--carte) 80%, var(--c))` et anneau 3 px, comme `.ligne[aria-current]` 227), et l'inverse.
4. Le zoom : viewBox courant en session (hors adresse), boutons + − ⌂, Ctrl+molette (la molette seule après un clic sur la carte : question 10), glisser au pointeur (capture, rien pendant un simple clic) ; l'échelle des rayons et polices (67-68) recalculée ; « Autour des dates » recadre.
5. `dessiner()` garde la pastille focalisée (clé du lieu) et le viewBox ; les étapes reçoivent les badges statut / scolaire / masquée et `PARCOURS.points(d)` ; un vide illustré quand aucune date ne passe les filtres (« Aucune date à venir sur la carte », bouton « Toutes les périodes »).

**Préférences et adresse.** `fenetres.tn` (lot 14) ; les filtres communs (lot 7) ; le viewBox en session, recadré à l'ouverture ; rien dans l'adresse.
**Accessibilité et clavier.** Pastilles `role=button tabindex=0` `aria-haspopup="menu"` ; Entrée ouvre le menu (↑ ↓ Entrée Échap) ; + et − au clavier sur la carte focalisée ; `role=img` + `aria-label` du SVG tenus ; `.allume` aussi au focus ; les étapes allumées ont `aria-current="true"` temporaire ; l'aide « ? » gagne « La carte ».
**Mouvement.** Le zoom s'anime 220 ms doux (le viewBox par un proxy animé et `setAttribute` par rAF ; rien sous reduced motion) ; une pastille allumée grossit en ressort 450 ms ; la route pointillée ne tourne pas (MOUVEMENT.md, écarté).
**Banc d'essai et vérifications.**
- `site/carte-travail.mjs` : clic sur la pastille du lieu 5 → `.gm-boite` avec ses dates et « Nouvelle date ici » ; Entrée au clavier idem ; « Ouvrir » → `.tiroir.la #ed-date` et `location.hash` reste `/carte` ; survol → `#tn-etapes .ligne.allume` ≥ 1 ; Maj+clic → `#sel-barre` « 2 dates » ; + → viewBox plus petit, ⌂ → `0 0 800 780` ; le focus reste sur la pastille après un filtre ; « Nouvelle date ici » → `#/representations/nouvelle` avec le lieu posé ; filtre sans résultat → le vide et « Toutes les périodes » ; niveau.mjs:218-230 vert ; aucune erreur ; captures `carte-menu.png`, `carte-zoom.png`, `carte-allume.png`.
**Documentation.** README 361-365 (la carte de travail) ; MOUVEMENT.md (le zoom) ; en-tête de tournee.js.
**Risques et parades.** Le SVG se redessine en entier (innerHTML) : `dessiner()` restaure focus et viewBox. La molette qui défile la page : `preventDefault` seulement sur la carte active. La sélection ciblait `a.ligne` : étendue aux pastilles, vérifiée par le banc.
**Taille.** M, 3 à 4 jours.

### Lot 16 — L'habillage final : états, étiquettes, vides illustrés, pages d'essai, le jour relu

**Objectif.** Ce qui rend l'ensemble « très visuel, friendly, clair et professionnel » et qui ne pouvait venir qu'à la
fin, quand tous les composants existent : un jeu d'états unique, `.etiquette`, des vides illustrés, les boutons à icône à
32 px, le focus visible dans les segments, le jour relu partout, deux pages d'essai capturées.

**Ce que voit Adrien à la fin du lot.** Chaque bouton, puce, segment, lien du menu, poignée réagit pareil : au repos, au
survol (fond doux teinté de la saison), pressé (il s'enfonce de 3 %), au clavier (anneau de 3 px à la couleur de la
saison, à l'intérieur dans un segment), désactivé (à moitié transparent), occupé (un petit anneau tourne). Les titres de
section (« NOVEMBRE », « À TRAITER », « DATE », les en-têtes du tableur) parlent d'une seule voix. Une liste vide montre
la tentacule en filigrane, la phrase, le geste utile. Le jour est aussi fini que la nuit, sur le menu, le tableur, les
poignées, la matrice.

**Fichiers et lignes touchés.**
- `admin/habillage.js` 104-124 (le jeu d'états, une règle par état pour `.btn, .seg a, .seg button, .puce, .tb-ico, .menu a, .menu button, .vues a, .poignee, .tab-cal button`), 75-78 (`.etiquette`), 100 (vides), 201 (reduced motion).
- `admin/index.html` 54 (focus : `outline-offset: -3px` dans `.seg` et `.vues`, 207 rogne), 166 et 181 (les doubles définitions de survol et de focus retirées : une seule couche), 172 (désactivé), 213 (`.mois`), 151 (`.rch-entete`), 403 (`.avant h3`), 243-247 et 831-836 (listeVide : `<svg class="vide-orne">` = ICONES.ornement, 140 px, `--accent`, opacité .18, `aria-hidden`), 250 (le Kanban vide garde son pointillé), 534 (`td.tab-vide`), 636 (pressé `scale(.97)`).
- `admin/tiroir.js` 262 (`.tiroir-genre` → `.etiquette`) ; `admin/tableau.js` 1261-1263 (`.tb-ico` 32 px, zone de 44 px au doigt, `:focus-visible` explicite), 1291 (`.tb-rien` illustré).
- `site/habillage.mjs` (nouveau) ; `site/tableau.mjs` 329-354 (captures doublées en jour).

**Étapes.**
1. Les états, écrits une fois dans habillage.js : repos (carte / trait) ; survol (105 : bord accent 45 %, fond accent-doux 55 %) ; pressé `:active` `scale(.97)` (636) + fond doux ; `:focus-visible` anneau 3 px accent, offset 2 px (54), `-3px` dans `.seg` et `.vues` ; désactivé `[disabled], [aria-disabled="true"]` opacité .5 (172) ; occupé `[aria-busy="true"]` : curseur progress, `pointer-events: none`, un anneau `::after` de 14 px qui tourne (.9 s linéaire, comme `temoin-tourne` index.html:98-100), fixe sous reduced motion (201) ; les règles concurrentes d'index.html (166, 181) retirées.
2. `.etiquette` (Raleway 700, 11 px, .1em, capitales, `--gris`, habillage.js:75-78) posée sur `.mois` (213), `.tb-cat h3`, `.avant h3` (403), `.rch-entete` (151), `.tiroir-genre` (tiroir.js:262), les en-têtes du tableur et des jeux ; les polices en doublon retirées d'index.html et de tiroir.js (les couleurs restent) ; les sélecteurs des bancs (`.tb-bonjour`, `tuile('…')`) ne changent pas.
3. Les vides : listeVide (831-836), `.tb-rien` (tableau.js:1291), `td.tab-vide` (534) et la carte vide (lot 15) reçoivent `ICONES.ornement` au-dessus de la phrase (Ubuntu 500, habillage.js:100) et le geste ; les bancs qui lisent `.vide.liste-vide p` passent.
4. `.tb-ico` (tableau.js:1261) : 32 px, zone de 44 px au doigt (`@media (pointer: coarse)`), `:focus-visible` explicite ; les attributs `data-tb-…` des bancs gardés.
5. Le jour : passe sur le menu, les poignées, le sélecteur, le tableur Simple et Complet, la matrice (4,5:1 et 3:1 vérifiés comme habillage.js:19-27) ; tableau.mjs:329-354 double ses captures en jour.
6. Deux pages d'essai servies par le harnais (`site/src/essai-etats.html`, `essai-icones.html`) : les six états sur `.btn` / `.seg` / `.puce` / `.tb-ico` / `.menu a` / `.poignee`, et ICONES.NOMS en grille.

**Préférences et adresse.** Aucune.
**Accessibilité et clavier.** 44 px au doigt partout ; focus visible sur chaque commande, y compris dans `.seg` et `.vues` ; `aria-busy` sur un bouton occupé ; contrastes des deux palettes inchangés.
**Mouvement.** Survol et pression en 120 ms (104) ; l'anneau occupé tourne en continu (transform seulement) ; rien d'autre : ce n'est pas une entrée.
**Banc d'essai et vérifications.**
- `site/habillage.mjs` : dans `.seg` et `.vues`, `outline-offset` −3 px au focus ; un bouton `aria-busy` a le curseur progress ; `.tb-ico` mesure 32 px ; `.etiquette` présente sur les cinq anciens sélecteurs ; une liste filtrée sans résultat montre `.vide-orne` (svg `aria-hidden`) ; la page « états » rend six états ; `CPU=4 node site/mouvement-admin.mjs` vert ; captures `etats.png`, `icones.png`, `vide.png`, `menu-jour.png`, `tableur-jour.png`, `matrice-jour.png`.
- tableau.mjs avec ses captures en jour.
**Documentation.** README 322-330 (« L'habillage » : les états, l'étiquette, les vides, les pages d'essai) ; MOUVEMENT.md (rien de neuf) ; en-tête d'habillage.js.
**Risques et parades.** Rogner l'anneau de focus (`overflow: hidden` 207, 331) : anneau intérieur. Deux couches CSS qui se recouvrent : chaque état défini une fois, et une fois seulement, les doublons retirés dans le même commit.
**Taille.** M, 3 à 4 jours.

### Lot 17 — La planche de relecture et la passe « mouvement réduit »

**Objectif.** Une planche HTML qui réunit les captures en vraies polices, en nuit et en jour, à trois largeurs, menu
déplié et replié, pour la relecture d'Adrien ; une passe qui prouve l'immobilité sous mouvement réduit.

**Ce que voit Adrien à la fin du lot.** Il ouvre `site/dist/shots-planche/planche.html` : une grille de vignettes sur
trois colonnes, chacune avec sa légende (la page, la largeur, le thème, le lot), datée et marquée du commit ; les pages
« états » et « icônes » ; il clique pour voir en grand.

**Fichiers et lignes touchés.**
- `site/planche.mjs` (nouveau) ; `site/admin-fictif.mjs` 124 (`polices: true`, lot 1) ; `site/bancs-admin.sh` (option `--planche`) ; `README.md` 24-33 ; `site/MOUVEMENT.md` 43-56.

**Étapes.**
1. planche.mjs : `ouvrir({ polices: true, largeur: 1280 | 1600 | 1920, sombre, hash })` × { nuit, jour } × { déplié, replié } sur l'accueil, Représentations (liste, tableur Simple, Complet, Distribution, carte), une fiche en tiroir avec sa poignée, le planning, l'équipe, la diffusion ; PNG dans `site/dist/shots-planche/`.
2. Écrit `planche.html` (grille, légendes, `git rev-parse --short HEAD`, la date, la police effective) avec un `alt` par vignette et une table des matières.
3. Une passe `reduit: true` sur le repli du menu, le tiroir, la remise d'une poignée, le tableur : `getAnimations()` vide.
4. `site/bancs-admin.sh --planche` l'ajoute à la fin ; sans l'option, la planche n'est pas lancée (≈ 90 s, hors du quota des 60 s : un banc de relecture, pas de non-régression).

**Préférences et adresse.** Aucune.
**Accessibilité et clavier.** La planche a un `alt` par vignette et une table des matières.
**Mouvement.** La passe réduite prouve l'immobilité ; les captures passent par `calme()` (admin-fictif.mjs:116-119).
**Banc d'essai et vérifications.**
- `node site/planche.mjs` : ≥ 40 captures, aucune erreur de script, aucune animation sous `reduit`.
**Documentation.** README 24-33 (la commande) et la section Administration (« la planche de relecture ») ; MOUVEMENT.md (la liste des bancs).
**Risques et parades.** Sans réseau, les polices du système : la légende le dit. La durée : à la demande seulement.
**Taille.** S, 1 à 2 jours.

## 5. Couverture des huit attentes

| Attente | Lots | Ce qui la satisfait |
| --- | --- | --- |
| 1. Un menu latéral repliable | 3 (socles 1, 2 ; thème 5) | `aside.menu` persistant construit une fois, icônes ICONES, nav verticale de 240 px, repli à 64 px par le bouton ou Alt+M (animé une fois, immobile sous reduced motion), replié d'office sous 1 340 px, `menu.replie` retenu par compte et appliqué dès `<head>`, `view-transition-name`, `--large-menu`, mobile.js intact ; banc cadre.mjs |
| 2. Des accès rapides | 4 (3, 7, 12) | « ＋ Créer », les épinglés (`menu.epingles`, étoile dans la tuile, menu Retirer / Monter / Descendre), les cinq récents, les badges du menu, la recherche Ctrl K comme barre de commande avec les touches et les récents sans saisie, « G puis lettre », « V puis lettre », « Voir dans le tableur » qui arrive sur la ligne, Ctrl+Entrée et `?champ=` vers la fiche, le menu de l'en-tête du tiroir ; bancs acces.mjs, cadre.mjs, vues-dates.mjs |
| 3. Toutes les fenêtres ajustables | 6, 10, 14 | FENETRES.poignee (souris, clavier, double-clic, une seule langue visuelle) sur le tiroir, la colonne liste, les boîtes de la charte et la feuille, les modales CRM migrées, les colonnes et la hauteur du tableur, les fenêtres posées et l'éditeur de case, le détail du planning, la carte, les tuiles, le zoom A4 ; `fenetres` par compte, bornées à l'écran ; « Pleine largeur », « Disposition d'origine » avec Annuler ; bancs fenetres.mjs, tableur-colonnes.mjs, fenetres-2.mjs |
| 4. Une interface « à la Excel » très simplifiée sur les dates | 11 (socles 1, 2, 7, 10) | Le mode Simple (une ligne par date, six grandes colonnes, 44 px), le petit calendrier dans la case et posé sous elle, les pastilles d'heures, les badges, le liseré du spectacle, les états en cours / enregistré / erreur et la barre d'état, la saisie et le collage tolérants, les cases ignorées dites et marquées, les colonnes à la carte, le rendu par ligne et le budget mesuré ; bancs tableur.mjs, tableur-simple.mjs |
| 5. Renseigner chaque champ possible | 8, 9, 12 | SCHEMA_DATE (tout champ existe une fois), le rail ecrireChamps, les colonnes nouvelles allumées en Complet, les jeux nommés, le jeu Diffusion sous validation, la section Diffusion et les dérivés expliqués dans la fiche, la jauge de complétude, le tiroir visé pour les champs riches, le garde-fou des périodes, l'import générique, la fonction et la note d'un remplaçant, le RPC v3 en une transaction, l'essai « aucun champ oublié » à deux faces ; bancs champs.mjs, tableur-complet.mjs, enregistrer3.mjs |
| 6. La distribution | 13 (8, 12) | La cellule à avatars et catégories (« −1 », remplaçants, absents), la fenêtre « En tournée / Remplaçants » avec fonction et « n personnes seront prévenues », le mode Distribution (matrice dates × personnes, alertes, « Régler sa période »), « Étendre » fusionnant et au même lieu, la fiche enrichie, le volet d'impact dans Spectacles ; banc distribution.mjs |
| 7. La sélection par icônes entre carte, Excel et liste | 7, 15 (2) | La pilule `nav.vues` à trois icônes avec libellé, `aria-current`, V L / V T / V C, la vue retenue (`representations.vue`), un seul état de filtres dans l'adresse pour les trois vues, le focus rendu au sélecteur, la carte comme vue de travail ; bancs vues-dates.mjs, carte-travail.mjs |
| 8. Le tout très visuel, friendly, clair et professionnel | 2, 3, 5, 11, 16, 17 (tous) | Une famille d'icônes, l'en-tête sur une ligne et le menu signalétique, nuit / jour / appareil sans éclair, la densité, les mêmes liserés et badges dans les trois vues, six états écrits une fois, `.etiquette`, les vides illustrés, les annonces qui disent où un réglage est gardé, le mouvement du vocabulaire mesuré à CPU=4, des captures à chaque lot et la planche de relecture avec quatre jalons ; bancs icones.mjs, theme.mjs, habillage.mjs, planche.mjs |

## 6. Questions à Adrien

1. **Le jeu « Diffusion » dans le tableur** (étape, montant de cession, relances, notes) : le README (457-458) l'exclut aujourd'hui. *Recommandation : oui, masqué d'office, avec un cadenas dans l'en-tête, jamais exporté sans cocher « Inclure la diffusion (confidentiel) » ; le montant reste absent du mode Simple ; la section Diffusion de la fiche (lot 8) existe dans tous les cas.*
2. **Le menu de nuit dans les deux thèmes ?** *Recommandation : oui, la coque (en-tête et menu) reste de nuit comme l'en-tête d'aujourd'hui, le contenu prend le thème ; un menu papier en jour serait un lot S de plus.*
3. **Le vocabulaire des étapes de diffusion d'une date** (`etape_crm`, défaut `option_posee`, ideale.sql:127, sans écran aujourd'hui). *Recommandation : reprendre ETAPES_CRM des pistes (index.html:3923-3929 : contact pris, dossier / devis, option posée, cession confirmée, bilan) ; la colonne et le champ restent en lecture tant que ce vocabulaire n'est pas arrêté.*
4. **Les épinglés du menu et les actions de la tuile** : une seule liste ou deux ? *Recommandation : deux, initialisées pareil (le menu est un raccourci permanent, la tuile une page d'ouverture) ; l'étoile de la tuile épingle dans le menu. Le plan est écrit ainsi.*
5. **Prévenir l'équipe quand la distribution « en tournée » change** (aucun déclencheur sur crescite_distributions ; le changement est rétroactif sur toutes les dates sans écart). *Recommandation : pas de nouveau déclencheur dans ce plan ; le volet d'impact avec « limiter à partir d'aujourd'hui » coché, et « Prévenir l'équipe » manuel (equipe.js:1217) ; à revoir après usage.*
6. **La valeur d'office commune des filtres** : la carte ouvrait sur la saison courante, le tableur sur « À venir » toutes saisons, la liste sur tout. *Recommandation : « À venir, toutes saisons » dans les trois vues ; la carte garde en plus un recadrage automatique.*
7. **Les portraits dans la grille ?** *Recommandation : des initiales dans la grille (léger, sans URL signée), les photos dans la fenêtre et la matrice seulement ; pas de clé `tableur.distribution.personnes` tant que le besoin ne se montre pas.*
8. **Les conflits d'édition** (dernier écrivain gagnant côté administration, `modifie_le` jamais comparé). *Recommandation : le bandeau « Modifiée ailleurs — Recharger » du lot 8 suffit pour ce plan ; un verrou optimiste (PT409 comme `crescite_modifier_date`) serait un lot base ultérieur.*
9. **Les intervalles tapés dans une case** (« du 5 au 7 nov ») : créer n séances, une période, ou refuser ? *Recommandation : refuser proprement (`.ignoree` avec la raison « indiquez un jour ; une période se règle dans la fiche »), sans question ; à rouvrir si l'usage le demande.*
10. **Le zoom de la carte** : la molette seule (la page ne défile plus sur la carte) ou Ctrl+molette ? *Recommandation : Ctrl+molette toujours, la molette seule une fois la carte cliquée ou focalisée ; « Toute la France » pour se rattraper.*
11. **Une vue Mois des dates** (barres par spectacle, jour cliqué → nouvelle date pré-remplie) en quatrième icône ? *Recommandation : pas dans ce plan ; la route (1272) est prête, un lot M plus tard avec une grille propre copiée de `.pl-m-*` plutôt que PLANNING partagé.*
12. **La densité : un réglage global ou par vue ?** *Recommandation : global, au pointeur fin ; le tableur a de toute façon ses propres hauteurs de ligne par mode.*
13. **Les jalons de relecture** : Adrien relit après le lot 5 (la coque complète : menu, accès rapides, thème), après le lot 11 (le tableur Simple), après le lot 13 (la distribution) et après le lot 17 (tout). *Recommandation : tenir ces quatre rendez-vous, avec la planche à chaque fois ; ne pas commencer le lot 11 sans la relecture du lot 5.*

## 7. Ordre et dépendances

```
1 socle (prefs, harnais, filet, README) ──► 2 icônes + tableur.js extrait ──► 3 coque et menu ──► 4 accès rapides ──► 5 thème et densité
                                                       │                           │
                                                       │                           ├──► 6 fenêtres (tiroir, liste, boîtes) ──┐
                                                       │                           ├──► 7 vues de Représentations ───────────┤
                                                       └──► 8 SCHEMA_DATE et rail ──┴──► 9 base v3 (parallèle)               │
                                                                                                                              ▼
                                                             10 colonnes à la carte (après 6, 7, 8) ──► 11 Simple ──► 12 Complet ──► 13 distribution
                                                                                                                              │
                                                             14 fenêtres restantes (après 6 et 7) ──► 15 carte de travail      │
                                                                                                                              ▼
                                                                                              16 habillage final (après 13 et 15) ──► 17 planche
```

- **Dépendances dures.** 1 avant tout ce qui retient quelque chose ; 2 avant 3 (les icônes du menu) et avant 10 (le tableur a son fichier) ; 3 avant 4, 5, 6 et 7 (le menu, ses réglages, `--large-menu` pour les bornes, le lien de rubrique vers la vue retenue) ; 8 ne dépend que de 2 et s'écrit en parallèle de 3-7 ; 9 n'attend que l'écriture de 8 (son branchement client) et peut se faire par qui connaît le SQL pendant que le reste avance : l'interface est `crescite_capacites()` ; 10 attend 6 (FENETRES), 7 (`session.dates`, vue(f)) et 8 (le schéma) ; 11 attend 10 et 5 (`--pas`) ; 12 attend 11 ; 13 attend 12 (ecrireChamps avec équipe, ecartsPour avec fonctions) ; 14 attend 6 et 7 ; 15 attend 14 ; 16 attend 13 et 15 ; 17 attend 16.
- **Ce qui va en parallèle à deux mains.** Dès le lot 2 fini : une main prend 3 → 4 → 5 (la coque), l'autre 8 puis 6 et 7 (le schéma, les poignées, les vues) ; 9 se glisse n'importe quand ; pendant 11 → 12 → 13, l'autre main fait 14 → 15 ; 16 et 17 ferment.
- **Chemin critique** (deux mains) : 1 → 2 → 3 → 6 → 10 → 11 → 12 → 13 → 16 → 17, soit 38 à 48 jours ; à une main, la somme des lots : 57 à 72 jours. Dès la fin du lot 3 (deux semaines et demie) l'administration a son menu ; dès la fin du lot 11 (environ huit semaines à une main, six à deux) une saison se saisit en Simple.
- **Ce qui marche sans le lot 9.** Tout : le rail enchaîne les trois écritures d'aujourd'hui avec leurs messages ; les cinq colonnes de diffusion passent par un upsert direct ; le site en édition continue de perdre `fin` jusqu'à ce que le script soit passé.
- **Jalons de relecture pour Adrien** (question 13) : après 5, après 11, après 13, après 17, chaque fois avec la planche (`site/bancs-admin.sh --planche`).
- **À chaque lot**, la même recette : `python3 site/build.py`, le banc du lot, `site/bancs-admin.sh` (les quatre bancs d'aujourd'hui et ceux déjà livrés, `mouvement-equipe.mjs` si planning.js ou gestes.js ont bougé), la relecture des captures, le README et MOUVEMENT.md, `python3 site/build.py --pages`, un commit des sources et de docs/admin/* seulement, avec un message en français et un corps qui dit ce qu'Adrien verra.
