# Le téléphone, en plus léger

Le plan de la refonte de l'administration au téléphone (moins de 641 px de large), après celle de l'ordinateur
(`admin/ORDINATEUR.md`, PR #46). Cinq lots, trois petits et deux moyens. Rien ne change à l'ordinateur ni dans l'espace de
l'équipe. Les numéros de ligne sont ceux du commit `f6a07dc` (28 octobre 2026) ; chaque lot les décale pour les
suivants : confirmer toujours par `grep -n` du nom cité.

La proposition illustrée (captures à 390 × 844, mesures) a été présentée à Adrien ; il a dit « go », les cinq questions
sont tranchées par leurs recommandations (section 3).

## 1. Le constat, mesuré

L'étude (le code sous 641 px, 56 captures à 390 × 844 au doigt sur la base fictive, les situations de tournée) a trouvé une
structure bonne et un écran d'ordinateur posé tel quel :

- la barre d'onglets, « Plus », le « + », les feuilles du bas, la recherche, l'appui long et les fiches dont la liste
  s'efface (index.html:333) marchent, et les bancs d'aujourd'hui les figent ;
- le « + » obéit à deux tests contradictoires (mobile.js:46 et 111) et recouvre « Enregistrer » ou « Supprimer la
  date… » (dans le tableur : le « + » de 714 à 768 px, le bouton de 734 à 778) ;
- l'en-tête de la rubrique reste au-dessus de chaque fiche : environ 200 px avant le titre d'une date ;
- les réglages de l'ordinateur, les boutons de création en double et les filtres passent avant le contenu : la première
  date de l'onglet Dates arrive à 1 592 px, la première ligne d'« À traiter » à 1 096 px, « Qui part bientôt » à
  4 637 px (le tableau de bord fait 6 495 px de haut) ;
- la feuille de route s'ouvre en page A4 réduite (equipe.js:1455, `vue: 'page'`) : environ 330 px de lecture entre la
  barre d'outils collée en haut et le pied, un texte d'environ 6,5 px ;
- des cibles de 28, 32, 34, 36, 40 et 41 px, des champs à 15 px de texte (l'iPhone zoome à chaque focus) ;
- « Prévenir l'équipe » demande 5 touchers et 1 ou 2 défilements ; l'itinéraire d'une date est à 1 066 px dans la fiche,
  le contact d'un lieu à 1 311 px.

## 2. Les principes

- **Le contenu passe avant les commandes.** Au premier écran, ce qu'on est venu chercher : une ligne « À traiter », une
  date, le titre de la fiche et ses boutons de route. Pas les réglages de l'ordinateur.
- **Rien ne recouvre une commande.** Le « + » obéit à une seule règle, et il est caché dès que la vue a ses propres
  boutons en bas (`.pied-ed`, `.tab-ligne-etat`). Le pied, les annonces et le détail du planning se posent au-dessus de
  la barre.
- **Une seule façon de créer au téléphone : le « + ».** On masque au téléphone seulement les « ＋ Nouveau… » qu'il propose
  déjà (mobile.js:96-105). Ils restent dans le DOM, puisque `allerEtCliquer` clique `#b-nouveau-prospect` (mobile.js:101).
  « Nouveau spectacle » et « Nouvelle invitation » restent visibles.
- **Reprendre, ne pas réécrire.** On reprend le pied replié (`pied(…, { replier })`, index.html:2680, et `suivrePied`), la
  « Vue de l'équipe » de la feuille de route (equipe.js:1517, 1645), « Autour des dates » (tournee.js:102, 139), la vue
  Mois du planning, et les actions d'appui long de menus.js (`actionsDate`, `actionsLieu`, menus.js:55-90) pour la rangée
  « sur la route ». Aucun chemin d'écriture nouveau : la fiche garde `ecrireChamps`.
- **Rien ne change à 641 px et plus.** Le CSS va sous `html.ob-actif` (posé par mobile.js:34, seulement sous 641 px), dans
  le bloc des styles de mobile.js ; le JS derrière `MOBILE.actif()`. Le téléphone n'écrit aucune préférence du compte (le
  motif de `vueRetenueDates`, index.html:2946-2966) : ni `accueil.tableau`, ni `representations.avant`, ni
  `representations.vue`.
- **L'espace de l'équipe ne change pas.** `admin/gestes.js`, `admin/planning.js` et `admin/feuille.js` ne sont pas
  touchés (ses bancs, `gestes-equipe` et `mouvement-equipe`, ne se déclenchent donc pas : site/bancs-admin.sh). Ce que
  l'administration doit régler dans le planning (`--pl-bas`, que planning.js:576 lit déjà ; la taille des boutons), elle
  le pose chez elle, dans mobile.js. L'espace de l'équipe ne charge ni mobile.js, ni tableau.js, ni disponibilites.js, ni
  tournee.js, ni menus.js, ni admin/equipe.js (equipe/index.html:1196-1204).
- **Accessibilité.** 44 px au doigt et 16 px de texte dans les champs (le corps fait 15 px, index.html:79 et 81). L'ordre de
  lecture est celui du DOM, jamais `order:` en CSS. Un `h1` masqué reste lu (classe `sr`). Le focus est rendu au bouton qui
  a ouvert une feuille, et Tab reste dans la feuille.
- **Mouvement.** Aucune animation nouvelle. La feuille du téléphone passe au « doux » `cubic-bezier(.2, .8, .2, 1)` en
  200 ms (site/MOUVEMENT.md), ce qui l'accorde au retrait à 200 ms (mobile.js:72). Rien ne bouge sous « moins
  d'animations » (mobile.js:169 le fait déjà). Aucune tâche au-delà de 200 ms à CPU=4.

## 3. Les décisions

Les cinq questions posées à Adrien, tranchées par leurs recommandations :

1. Au téléphone, Adrien relit et publie ses feuilles de route plus qu'il ne les écrit : la « Vue de l'équipe » s'ouvre
   d'office, « Page A4 » reste à un toucher (lot 4).
2. Le tableur des dates reste tel quel au téléphone, dans la pilule des vues : on retire seulement le « + » qui le couvrait
   (lot 1) et l'aide du clavier (lot 2). Le retirer de la pilule serait une décision à part.
3. Au tableau de bord du téléphone, un ordre fixe : « À traiter », « Qui part bientôt », « Prochaines dates », puis les
   autres tuiles dans l'ordre du compte, sans les « Actions rapides » ; rien n'est écrit dans le réglage de l'ordinateur
   (lot 3).
4. « À compléter avant la tournée » est replié d'office dans l'onglet Dates, avec son compte dans le titre ; ouvert ou
   fermé le temps de la session, sans toucher le réglage de l'ordinateur (lot 3).
5. Sous le titre d'une date : Itinéraire, Feuille de route, Prévenir l'équipe, et Confirmer quand c'est une option, dans
   cet ordre. « Appeler la régie » attendra qu'Adrien dise qui appeler en premier (le contact du suivi, le carnet ou le
   lieu) (lot 5).

## 4. Les lots

Dans l'ordre où les faire. Chaque lot ajoute sa section au banc du téléphone, `site/telephone.mjs` (créé par le lot 1, sur
le harnais `site/admin-fictif.mjs`, à 390 × 844 au doigt), inscrit en fin de `BANCS` dans `site/bancs-admin.sh`. À
1 440 × 900, chaque section vérifie aussi que rien n'a changé.

### Lot 1 : le bas de l'écran dégagé, les fiches en plein écran (petit)

**Ce que voit Adrien.** Une date, une personne ou un lieu ouvert commence en haut de l'écran : « ‹ Représentations », puis
le titre. Le titre de la rubrique, les vues et « Nouvelle date » ne prennent plus 200 px au-dessus. Le rond « + »
n'apparaît plus là où il gênait : sur une fiche, une feuille de route, un spectacle ou dans le tableur. Il ne cache plus
jamais « Enregistrer » ni « Supprimer la date… ». Une annonce (« Date enregistrée · Annuler ») se pose au-dessus du « + »
au lieu de le couvrir. « Mentions légales » n'est plus sous le « + ». Une date ouverte depuis le tableau de bord a son pied
collé en bas, sans bande où le texte défile dessous. Dans le planning, le détail d'un jour s'arrête au-dessus des onglets.
Un champ amené à l'écran ne se cache plus sous le pied. Quand on ferme « Plus » ou « Créer », on retrouve le bouton qu'on
venait de toucher, et la feuille glisse au même rythme que le reste.

**Étapes.**
- admin/mobile.js : une seule fonction `plusCache()`, appelée par `poser()` (ligne 46) et par l'observateur (ligne 111) à
  la place de leurs deux tests contradictoires. Le « + » est caché sur `/(nouvelle|nouveau|\d+)$/`, sur `.deux.edition`,
  et quand `#vue` contient un `.pied-ed` ou un `.tab-ligne-etat`. L'observateur garde son champ et son délai de 50 ms.
- admin/mobile.js, CSS sous `html.ob-actif` : `.tete:has(~ .deux.edition) > :not(h1) { display: none }`, et le `h1` en
  position `sr`. Vérifié pour Dates (index.html:2977, la `.tete` puis `.deux`), Équipe (equipe.js:158-172) et Lieux
  (index.html:4264-4265). Le fil d'Ariane est posé avant `.titre-ed`, dans la fiche (index.html:2031 et 2040) : il reste
  visible.
- admin/mobile.js : `html.ob-actif .tiroir-corps .pied-ed { bottom: -24px }`, pour rendre à tiroir.js:327 ce que
  mobile.js:137 lui prend. `html.ob-actif { --pl-bas: calc(64px + env(safe-area-inset-bottom, 0px));
  scroll-padding-bottom: calc(150px + env(safe-area-inset-bottom, 0px)) }`. `html.ob-actif:has(.ob-plus:not([hidden]))
  #annonces { bottom: calc(140px + env(safe-area-inset-bottom, 0px)) }`, et la même marge pour `.pied-espace`
  (mobile.js:136).
- admin/mobile.js, `feuille()` et `fermerFeuille()` (lignes 51-72) : retenir `document.activeElement` à l'ouverture et lui
  rendre le focus à la fermeture s'il est encore dans la page. Les frères de `.ob-voile` sont `inert` pendant
  l'ouverture, sauf `#annonces`. La transition de la ligne 148 passe à `.2s cubic-bezier(.2, .8, .2, 1)`.
- admin/index.html : `pied(…, { replier: MOBILE.actif() })` et `suivrePied()` pour le lieu (4338), la séance (4234),
  l'atelier (4169) et le devis (4927) ; admin/equipe.js : la même chose pour une personne (239) et une invitation (3023).
- site/telephone.mjs (neuf), ajouté en fin de `BANCS` dans site/bancs-admin.sh ; README (le téléphone, la liste des
  commandes de bancs) et site/MOUVEMENT.md (la feuille du téléphone au « doux », 200 ms).

**Banc, section 1.** (a) `#/representations/101`, `#/equipe/1`, `#/lieux/5` : le haut de `.titre-ed` est à 140 px au plus,
`.tete` est invisible, son `h1` reste dans l'arbre d'accessibilité, et aucun focalisable de `.tete` n'est atteint par Tab.
(b) `#/feuilles/101`, `#/spectacles/berenice`, `#/representations/tableur` : `.ob-plus` est caché, et il l'est encore
150 ms après l'ajout d'un nœud dans `#vue`. (c) Sur 10 routes, aucun bouton ni lien visible ne croise le rectangle du
« + » ; une annonce provoquée ne le croise pas non plus. (d) Une date ouverte en tiroir depuis `#/accueil` : le bas de
`.pied-ed` est au bas du tiroir, à 2 px près (aujourd'hui 760 pour 844). (e) `#/planning`, vue Équipe, un jour choisi,
avec un planning garni dans la base fictive : le bas de `.pl-detail.feuille` est au-dessus du haut de `.ob-barre`. (f)
`#/lieux/5` et `#/equipe/1` : le pied tient sur une rangée, et « Supprimer » est dans « Plus ». (g) « Plus », puis Échap :
`activeElement` est `[data-ob="plus"]`, et six Tab restent dans `.ob-feuille`. (h) À 1 440 × 900 : `.tete` visible, pied
déplié, DOM de `#vue` identique à avant. On relance niveau.mjs (243-268), tableau.mjs (268-310) et adresses-admin.mjs, sans
les changer.

**Risques.** La règle sur `.tete` suppose que la fiche a son propre titre (`.titre-ed`) : vérifié pour Dates, Lieux,
Équipe, Ateliers, Textes, Devis et Espace pro (index.html:3457, 4167, 4218, 4333, 4439, 4914 ; equipe.js:232, 3007) ; le
banc le contrôle rubrique par rubrique. Le « + » caché dès qu'il y a un `.pied-ed` le retire aussi des sous-pages qui en
ont un (equipe.js:446-447) : « Créer » reste à un retour arrière, c'est voulu. `inert` ne doit pas rendre « Annuler »
injoignable : `#annonces` est exclu, et le banc le vérifie. Le pied replié cherchait `#pied-autres` et `.pied-plus` dans
tout le document (index.html:2710-2717) ; or une date ouverte en tiroir au-dessus d'une fiche fait deux pieds repliés à la
fois (la relecture du lot l'a trouvé) : chaque pied a donc son menu, avec son propre id, et le banc ouvre le « Plus » du
tiroir au-dessus d'une personne.

### Lot 2 : tout au doigt (petit)

**Ce que voit Adrien.** Chaque bouton, segment et champ se touche du pouce sans viser : « À venir / Passées / Toutes »,
« Plus de filtres », les dates du … au, les étapes d'une date (Confirmée, Contrat, Lieu…), Fonction et Note dans l'équipe
d'une date, la case « visible », « Équipe / Mois », les flèches et « Aujourd'hui » du planning, la croix d'une annonce,
« Installer ». Toucher un champ ne fait plus zoomer l'iPhone. Le lieu d'une date passe sur deux lignes au lieu d'être coupé
par « … ». L'aide du clavier sous le tableur disparaît au téléphone.

**Étapes.**
- admin/mobile.js, CSS sous `html.ob-actif` : `--h-champ: 44px` (index.html:63), et `font-size: 16px` sur `input`,
  `select`, `textarea` et `.riche`, hors `.tab-cadre`. `min-height: 44px` sur `.filtres-dates .seg button` (il bat
  index.html:649), `.f-plus > summary` (652), `.f-periode input` (507), `.pc-e` (parcours.js:106), `.dfn-ligne
  .eq-fonction` et `.eq-note` (index.html:881), `.case` (307-308, la ligne entière comme cible), `.annonce
  .annonce-fermer` en 44 × 44 (532) et `.ob-tete-btn` (mobile.js:152). Pour le planning, sans toucher planning.js :
  `.pl-vues button`, `.pl-btn` et les boutons des masqués à 44 px.
- admin/mobile.js : `html.ob-actif .ligne .ou { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical }` (la règle est à index.html:361). `html.ob-actif #tab-aide { display: none }` (le texte de
  tableur.js:477) : il reste la cible d'`aria-describedby`.

**Banc, section 2.** (a) Sur 12 routes (`#/accueil` ; `#/representations` dans ses trois vues, « Filtres » et « Plus de
filtres » ouverts ; `#/representations/101` ; `#/planning` en Équipe et en Mois ; `#/equipe/1` ; `#/lieux/5` ;
`#/feuilles` ; `#/feuilles/101` ; `#/diffusion` ; `#/journal`) : aucun `button`, `summary`, `select`, `input` hors case, ni
lien seul sur sa ligne sous 44 px dans le sens contraint ; les liens pris dans une phrase sont exclus, par le critère
d'habillage.js (310-320). Aucun champ hors `.tab-cadre` sous 16 px de texte. (b) `.ligne .ou` n'est plus coupé à 390 px
pour « Théâtre de Caen — Caen (14) ». (c) À 1 440 × 900, et à 800 × 1 000 au doigt : les segments à 36 px, les champs à
38 px, les boutons du planning à 40 px, comme avant. On relance habillage.mjs (174-180), tableur-simple.mjs (491 : la
colonne Jour de 86 à 110 px), reduit.mjs et theme.mjs (321-327).

**Risques.** Les champs à 44 px allongent les fiches d'environ 3 px par champ ; les lots 1, 3 et 5 regagnent bien plus.
Les sélecteurs du planning sont écrits hors de planning.js : un renommage les casserait en silence, le banc mesure donc les
boutons réels. L'espace de l'équipe garde ses 34 et 40 px au planning : les corriger dans planning.js serait un lot à part,
avec gestes-equipe et mouvement-equipe.

### Lot 3 : l'essentiel d'abord, tableau de bord, Dates, planning, diffusion (moyen)

**Ce que voit Adrien.** Le tableau de bord ouvre sur son bonjour, puis tout de suite sur « À traiter » avec ses éclairs,
puis « Qui part bientôt » avec les numéros à toucher, puis « Prochaines dates ». Les dix « Actions rapides », le choix de la
vue et « Personnaliser » restent à l'ordinateur ; « Briefing » reste. L'onglet Dates montre une date dès le premier écran.
« À compléter avant la tournée » est replié, avec son compte, et s'ouvre d'un toucher. La recherche reste visible, et le
reste des filtres tient derrière un bouton « Filtres » qui dit combien sont posés. Les « ＋ Nouvelle date / fiche / lieu /
séance », « Proposer des dates », « Nouvelle opportunité » et « Sélectionner » disparaissent du téléphone : le « + » crée
tout. Le planning s'ouvre sur le mois. Dans la diffusion, les trois chiffres tiennent sur une ligne.

**Étapes.**
- Au début du lot : chercher les bancs qui cliquent un « ＋ Nouveau… » à 390 px (adresses-admin.mjs:145, fenetres.mjs:762
  et 891 cliquent `#b-nouveau-prospect`) ; s'il y en a un, il passe par le « + ».
- admin/tableau.js : dans `vue()` (580-584), au téléphone, la rangée `.tb-tete-page` ne garde que `#tb-briefing`. Dans
  `dessiner()` (488), au téléphone, une liste tirée de `visibles()` (450) : sans `'actions'` (229), puis `'urgent'`,
  `'equipe'` et `'prochaines'` en tête s'ils sont visibles, puis les autres dans l'ordre du compte. Cela change l'ordre du
  DOM et n'écrit rien (`garder()` n'est pas appelé). Un écouteur `matchMedia('(max-width: 640px)')` redessine à la rotation.
- admin/index.html, `dessinerAvant` (3039) et `relierAvant` (3080) : au téléphone, le bloc est fermé par défaut et son état
  vit dans la session (`E.avantTel`). Le basculement n'appelle pas `garderAvant` (3014-3016), qui écrit aujourd'hui
  `representations.avant` à chaque ouverture.
- admin/index.html, `filtresDates` (2882) : au téléphone, `#f-q` reste seul visible. La période, les listes, les puces,
  `.f-plus` et `aDroite` passent dans un `<details class="f-tel">` dont le `<summary>` « Filtres » porte le compte ; il est
  ouvert si `filtresActifs(f)` (2875). `filtresDates.refleter` (2905) trouve toujours `.f-plus summary`, et les identifiants
  (`f-q`, `f-saison`, `f-statut`…) ne changent pas. La liste, le tableur et la carte en profitent.
- admin/mobile.js, CSS sous `html.ob-actif` : `#vue .tete :is(a[href="#/representations/nouvelle"],
  a[href="#/equipe/nouvelle"], a[href="#/lieux/nouveau"], a[href$="/seances/nouvelle"], a[href="#/planning/proposer"],
  #b-nouveau-prospect), .sel-bouton { display: none }`. `.crm-kpi` (index.html:589) passe en `repeat(3, 1fr)`.
- admin/disponibilites.js:169 : `vueP` vaut `'mois'` au téléphone quand la session n'a pas encore de vue (`st.vue` absent),
  sinon il garde la règle actuelle. Le planning lui-même ne change pas.

**Banc, section 3.** (a) `#/accueil` : aucun `.tb-tuile[data-k="actions"]`, ni `#tb-personnaliser`, ni `#tb-vue` ; la
première ligne d'« À traiter » commence avant 700 px (aujourd'hui 1 096) et la tuile « Qui part bientôt » avant 2 000
(aujourd'hui 4 637) ; l'ordre du DOM commence par urgent, equipe, prochaines ; `accueil.tableau` est absent
d'`ECRITURES`. (b) `#/representations` : la première `a.ligne` est avant 500 px (aujourd'hui 1 592) ; `details.avant` est
fermé, il reste ouvert après une écriture simulée dans la base, et `representations.avant` est absent d'`ECRITURES`. (c)
`?statut=option` : `.f-tel` est ouvert et dit 1 ; « Filtres » fait au moins 44 px. (d) `#/planning` s'ouvre en Mois. (e)
`#/diffusion` : les trois `.crm-kpi` ont le même haut. (f) À 1 440 × 900 : les dix actions, l'ordre du compte,
« À compléter » ouvert, les filtres dépliés, le planning en Équipe, « ＋ Nouvelle date » visible. On relance tableau.mjs,
vues-dates.mjs (484-492), tableur-simple.mjs (488-496), carte-travail.mjs, fenetres-2.mjs (section 5), adresses-admin.mjs et
fenetres.mjs.

**Risques.** La rotation en paysage (plus de 640 px) doit redessiner le tableau de bord, sinon les actions ne reviennent
qu'à la navigation suivante. Un filtre actif mais replié pourrait faire croire à une liste incomplète : le compte sur
« Filtres » et l'ouverture d'office quand un filtre est posé sont obligatoires. « À compléter » replié rend les manques
moins visibles : son badge de compte (index.html:3045) reste dans le `summary`.

### Lot 4 : la feuille de route lisible, la carte sur les dates (petit)

**Ce que voit Adrien.** Une feuille de route s'ouvre au téléphone telle que l'équipe la lit : du vrai texte à la taille du
téléphone, et non une page A4 réduite où les lettres font 6 px. « Page A4 » reste à un toucher. Les outils de mise en page
ne paraissent qu'en page A4, et ils ne restent plus collés en haut de l'écran. « À compléter » et « Publier pour l'équipe »
restent là. L'aide dit « touchez » plutôt que « cliquez ». La carte de tournée s'ouvre resserrée autour des dates, et non
sur toute la France.

**Étapes.**
- admin/equipe.js:1455 : `vue: MOBILE.actif() ? 'tel' : 'page'`. Le basculement (1667) et le retour en page de « Mettre à
  jour depuis la base » (1682) ne changent pas.
- admin/equipe.js, `styles-a4` (2004) : sous `html.ob-actif`, `.a4-outils { position: static }`, et
  `.a4-outils:has([data-fr-vue="tel"][aria-pressed="true"]) .a4-groupe { display: none }`. Les boutons sont déjà
  désactivés en vue « tel » (1644).
- admin/equipe.js:1519 : « cliquez dessus » devient « touchez-les » sous `MOBILE.actif()`.
- admin/tournee.js:97 : avant `etatVue('carte')`, si `MOBILE.actif()` et que `session.vues?.carte?.serre === undefined`,
  poser `serre: true`. Il faut tester avant `etatVue`, qui remplit `serre: false` par défaut (index.html:2823, 2829).
  « Toute la France » (tournee.js:199) l'éteint comme aujourd'hui.
- site/fenetres-2.mjs, amendé (le seul banc existant que ce plan change) : à 390 px, toucher `[data-fr-vue="page"]` avant
  d'attendre `.a4-doc` (lignes 482-485) ; ce que la section prouve ne change pas.

**Banc, section 4.** (a) `#/feuilles/101` : `[data-fr-vue="tel"]` a `aria-pressed="true"`, les `.a4-groupe` sont
invisibles, aucun élément collant de plus de 80 px, la place entre l'en-tête et le pied fait au moins 520 px (aujourd'hui
environ 330), et le texte de la vue fait au moins 16 px (feuille.js:1006-1009, inchangé). La feuille de test est non vide
(contenu posé avant l'ouverture, sur le modèle de niveau.mjs:276). Toucher « Page A4 » fait paraître `.a4-doc` et les
groupes, et une saisie faite en A4 se retrouve après le retour à la vue de l'équipe (`feuilleCourante`, equipe.js:1646).
(b) `#/representations/carte` : `#tn-serre` est coché, et la boîte des pastilles couvre au moins 50 % de la largeur du SVG.
(c) À 1 440 × 900 : la feuille s'ouvre en page A4 avec sa barre collée, et la carte sur la France. On relance
fenetres-2.mjs (amendé) et carte-travail.mjs.

**Risques.** Écrire une feuille au téléphone demande un toucher de plus (décision 1). Avec une seule date, le cadre serré
pourrait trop zoomer : tournee.js:139 inclut toujours Rouen (`F.rouen`), ce qui le borne. Détruire l'éditeur en quittant la
page A4 (equipe.js:1646) ne doit rien perdre : le banc le couvre.

### Lot 5 : une date et un lieu s'ouvrent sur la route (moyen)

**Ce que voit Adrien.** Sous le titre d'une date, une rangée de gros boutons, les mêmes que ceux de l'appui long :
Itinéraire, Feuille de route (avec son état : à composer, brouillon, publiée), Prévenir l'équipe, et Confirmer quand c'est
une option. Sous le titre d'un lieu : Itinéraire, Appeler le contact, Copier l'adresse. Le reste de la fiche suit,
inchangé. Au téléphone, l'appui long ne propose plus « Ouvrir dans un nouvel onglet » ni « Copier le lien ».

**Étapes.**
- admin/menus.js : `window.MENUS = { date: actionsDate, lieu: actionsLieu }` (55-90), à côté de `window.ouvrirAide` (466).
  menus.js n'est chargé que par l'administration. Sous `MOBILE.actif()`, `liens(href)` (35) rend `[]`.
- admin/mobile.js : `MOBILE.route(zone, genre, x)` pose après `.titre-ed` une grille de quatre boutons au plus, de 44 px,
  aux libellés entiers, dans l'ordre de la décision 5. Elle est tirée de `MENUS[genre](x)`, sans séparateurs, sans
  « danger », sans « Ouvrir … », « Fiche du lieu », « Devis » ni « Dupliquer ». Les actions gardent leur `faire` :
  « Prévenir l'équipe… » clique `#d-prevenir` (menus.js:64), « Confirmer la date… » vise `[data-statut="confirmee"]` (59).
  Aucune écriture nouvelle.
- admin/index.html : `editeurDate` (après 3457) et la fiche d'un lieu (après 4333) appellent `MOBILE.route` sous
  `typeof MOBILE` et `MOBILE.actif()`. La rangée est redessinée quand la fiche se redessine.

**Banc, section 5.** (a) `#/representations/101` : `.ob-route` est sous `#ed-titre`, dans le premier écran ; elle a
« Itinéraire » (`href` google.com/maps/dir), « Feuille de route » et « Prévenir l'équipe… », chaque bouton d'au moins
44 × 44 ; toucher « Prévenir l'équipe… » ouvre le panneau de `#d-prevenir` ; on compte les touchers depuis l'onglet Dates :
Dates, la date, Prévenir, soit 3 au lieu de 5, sans défilement. (b) `#/lieux/5` : « Appeler le contact » est un lien
`tel:`, avant 844 px (aujourd'hui y = 1 311) ; « Copier l'adresse » écrit dans le presse-papiers. (c) À 390 px, l'appui
long sur une date (touchStart puis 650 ms, comme tableau.mjs:276-283) n'a plus « Ouvrir dans un nouvel onglet ». À
1 440 × 900, aucune `.ob-route`, et le menu du clic droit garde ces entrées. (d) Sous `reduit: true`, aucune animation. On
relance niveau.mjs (262-266), mouvement-admin.mjs (258-270 : la transition « avant » d'une fiche à 390 px) et
adresses-admin.mjs (le fil d'une date et d'un tiroir).

**Risques.** `actionsDate` est calculé à l'ouverture : une feuille publiée entre-temps ne se redit que quand la fiche se
redessine (`APRES_CHANGEMENT` pour la fiche ouverte). « Prévenir l'équipe… » passe par `#d-prevenir`, rangé dans le menu
« Plus » du pied replié : `allerEtCliquer` clique un élément masqué, ce qui marche (le chemin actuel de l'appui long), mais
le banc doit le prouver. Sans contact de suivi, le lieu montre « Contact à renseigner » (menus.js:85), qui vise le champ :
c'est le comportement de l'appui long, on le garde.

## 5. Ce que le plan ne fait pas

- Il ne touche ni admin/gestes.js, ni admin/planning.js, ni admin/feuille.js, ni rien sous equipe/.
- Il ne change rien à 641 px et plus : ni le tableau de bord, ni les filtres, ni les pieds, ni les menus du clic droit, ni
  la feuille de route en page A4, ni la carte. Il ne touche pas la meta viewport (index.html:5), qui vaut aussi pour les
  tablettes.
- Il ne change pas les cinq onglets, leurs icônes, l'en-tête de 56 px, ni le contenu de « Plus » et de « Créer »
  (cadre.mjs:338, icones.mjs:151-170, niveau.mjs:243-268, tableau.mjs:296-305).
- Il n'ajoute aucun module ni aucune fonction : ni carte « Aujourd'hui », ni Waze ou Plans, ni note de frais avec photo, ni
  données hors ligne (sw.js reste réseau d'abord, sans données).
- Il ne refait pas le tableur (ses deux défilements imbriqués, le Complet sans accès à la fiche, le menu « Jeu ») et ne le
  retire pas de la pilule. Il ne rend pas la carte zoomable au doigt et ne grossit pas ses pastilles (tournee.js:258, 318).
- Il ne règle pas le clavier virtuel (ni `interactive-widget`, ni `visualViewport`) : c'est à essayer sur un vrai
  téléphone, et ce serait un lot à part.
- Il ne réordonne pas les champs des fiches et n'ajoute pas de sommaire : la rangée « sur la route » en tient lieu pour les
  dates et les lieux.
- Il ne retire pas le pied du site public, commun aux quatre espaces et qui porte les pages légales (index.html:1087-1089) :
  il le dégage seulement du « + ».
- Il ne nettoie pas les dettes sans effet visible : le seuil 640 écrit six fois, la règle morte de planning.js:589, les
  doublons de la marque, du témoin et de `.ob-item`, le menu du compte fait deux fois, la constante 64 du tableur
  (index.html:668, tableur.js:916).
- Il n'offre ni le jour, ni la densité, ni les poignées au téléphone, qui reste de nuit.

## 6. Les mesures de réussite

- Confirmer une option pendant un appel : l'éclair puis Enregistrer, 2 touchers et 0 défilement ; la première ligne
  d'« À traiter » avant 700 px à 390 × 844 (aujourd'hui 1 096).
- Voir qui part et appeler : « Qui part bientôt » avant 2 000 px (aujourd'hui 4 637), soit 2 défilements au plus au lieu
  d'environ 5.
- Prévenir l'équipe d'un changement : 3 touchers (Dates, la date, Prévenir l'équipe), puis la saisie et Envoyer, sans
  défilement (aujourd'hui 5 touchers et 1 à 2 défilements).
- Aller au lieu d'une date : Dates, la date, Itinéraire, soit 3 touchers et 0 défilement (aujourd'hui l'itinéraire est à
  1 066 px dans la fiche) ; « Appeler » sur la fiche d'un lieu au premier écran (aujourd'hui 1 311 px).
- Place utile : la première date avant 500 px (aujourd'hui 1 592) ; le titre d'une fiche à 140 px au plus du haut
  (aujourd'hui environ 250) ; une feuille de route laisse au moins 520 px de lecture (aujourd'hui environ 330) et son texte
  fait au moins 16 px (aujourd'hui environ 6,5).
- Recouvrements : sur 10 routes, aucune commande sous le « + », aucune annonce sur le « + », aucun pied de tiroir décollé
  du bas, aucun détail du planning sur la barre.
- Au doigt : sur 12 routes, aucune commande sous 44 px et aucun champ sous 16 px de texte.
- Focus : la fermeture de « Plus » rend le focus au bouton « Plus », et Tab reste dans la feuille.
- Durées : aucune tâche au-delà de 200 ms à CPU=4 à l'ouverture de `#/accueil`, `#/representations`,
  `#/representations/101` et `#/feuilles/101` ; la feuille du bas dure 200 ms sur le « doux », 0 s sous « moins
  d'animations ».
- Périmètre : à 1 440 × 900, le DOM de `#vue` est identique avant et après sur 8 routes ; `bash site/bancs-admin.sh --tout`
  est vert avec un seul banc existant amendé (fenetres-2.mjs, section 5) ; le diff ne touche ni gestes.js, ni planning.js,
  ni feuille.js, ni rien sous equipe/.

## 7. L'ordre et les jalons

1. Lot 1 d'abord : c'est le socle, il crée site/telephone.mjs. Jalon : sa section verte, puis niveau.mjs, tableau.mjs et
   adresses-admin.mjs verts sans retouche.
2. Lot 2 ensuite : indépendant, en CSS dans mobile.js ; avant le lot 3, qui mesure des positions que les champs à 44 px
   déplacent de quelques pixels. Jalon : aucune cible sous 44 px sur 12 routes, et tableur-simple.mjs vert.
3. Lot 3 : tableau de bord, « À compléter », filtres repliés, boutons de création masqués, planning en Mois, diffusion.
   Jalon : la première date avant 500 px, « À traiter » avant 700 px, aucune préférence écrite au téléphone, et à 1 440 px
   le DOM identique.
4. Lot 4 : la feuille de route et la carte, avec le seul amendement de banc, fenetres-2.mjs, dans le même commit. Jalon :
   au moins 520 px de lecture et 16 px de texte.
5. Lot 5 en dernier : il dépend du lot 1 (la `.tete` masquée, le titre en haut). Jalon : « Prévenir l'équipe » en 3
   touchers, « Appeler » d'un lieu au premier écran.
6. À la fin : `bash site/bancs-admin.sh --tout` (gestes-equipe.mjs et mouvement-equipe.mjs verts sans avoir été touchés), la
   mesure à CPU=4 sur les quatre routes, et un essai sur un vrai téléphone (iPhone et Android) des champs à 16 px et du pied
   dans le tiroir.

## 8. Écarté, et pourquoi

- La carte « Aujourd'hui » et un module `compagnon.js` : un module neuf, une quatrième copie des liens GPS, des règles à
  trancher (« la prochaine », qui appeler) ; son gain principal, « Qui part » et les prochaines dates en tête, vient du
  lot 3.
- Les gestes courts d'« À traiter » hors du tableau de bord : `apresTraiter` et `refocaliserFile` supposent sa file
  (tableau.js:806-812, 935-940) ; dans la fiche, le statut est déjà un segment.
- Waze et Plans à côté de Google Maps : une copie de plus des liens GPS (equipe/equipe.js:1744, menus.js:33, feuille.js:475).
- Les badges sur les onglets et « Plus » regroupé avec des icônes : ils touchent cadre.js et le critère des 360 × 800 sans
  défiler (tableau.mjs:296-305), pour peu d'utilité en tournée.
- Une variable unique pour le bas de l'écran à la place des constantes de tableur.js:916, selection.js:202 et
  index.html:668 : une dette sans effet visible, qui touche tableur.js.
- `interactive-widget=resizes-content` dans la meta : elle vaut à toutes les largeurs, donc aussi pour les tablettes ; à
  essayer sur un vrai Android, plus tard.
- Le tableur retiré de la pilule, la carte retirée de « Plus », des cibles plus grandes sur les pastilles, le pied du site
  public masqué, « Briefing » et « Personnaliser » derrière un « ⋯ », le survol neutralisé au doigt : ils amendent des
  bancs, changent une habitude ou coûtent plus qu'ils ne rapportent.

## 9. Plus tard

- Le tableur au doigt (un seul défilement, la fiche depuis le Complet), si Adrien s'en sert au téléphone.
- La carte zoomable au doigt et ses pastilles de 44 px.
- Le clavier virtuel (`visualViewport`), essayé sur un vrai téléphone.
- « Appeler la régie » dans la rangée d'une date, quand Adrien aura dit qui appeler en premier.
- Le planning de l'espace de l'équipe à 44 px (planning.js, avec ses bancs).
