# Crescite : système d'information de la compagnie

Dépôt de travail pour la reprise en main du site [crescite.fr](https://crescite.fr) et la refonte « Crescite 2.0 ».
L'audit complet, les 10 évolutions proposées et la feuille de route sont dans le document privé
« Audit crescite.fr et Crescite 2.0 » (Claude Docs). Ce dépôt contient les pièces techniques publiables.

> Ce dépôt est **public**. Le logo 2.0 et les photos des spectacles (droits des photographes) n'y sont
> volontairement pas versionnés : ils vont dans `private/`, dossier exclu par `.gitignore`. L'audit (avec ses
> constats de sécurité) reste dans le document privé.

## Contenu

| Dossier | Contenu |
| --- | --- |
| `prototype/` | Démonstrateur interactif, en onglets : la pieuvre (les huit bras du logo mènent aux spectacles), un univers par spectacle, trois portes d’entrée, agenda, carte de tournée, compagnie, espace troupe. Sources dans `prototype/src/`, assemblage par `prototype/build.py`. |
| `maquettes/` | Dix maquettes de la partie publique, de la plus sobre à la plus évoluée, et la planche qui les compare. Sources dans `maquettes/src/`, assemblage par `maquettes/build.py`. |
| `data/` | Relevé des dates publiées sur crescite.fr de 2016 à 2027 : 464 lignes géolocalisées, en JSON et en CSV. Texte exact des pages publiques du site (`site-crescite.json`, relevé par `site_crescite.py`), fiche de Cassandres (`cassandres.json`), dossier scolaire de Bérénice (`berenice-dossier.json`), univers et action culturelle de chaque spectacle (`univers-spectacles.json`). |
| `supabase/migrations/` | Modèle de données proposé pour la future base de la compagnie : dates, lieux, tournées, troupe, feuilles de route, règles d'accès. **Non exécuté** : à relire avant usage. |
| `private/` (non versionné) | `brand/` logo 2.0 en SVG et le tracé de ses huit bras, `photos/` une photo par spectacle et celles de leurs univers, `dossiers/` les dossiers de la compagnie (scolaire de Bérénice, artistique 2027-2028). |

## Prototype

```sh
python3 prototype/build.py            # écrit prototype/dist/index.html (non versionné)
python3 prototype/build.py --public   # écrit prototype/dist/index-public.html, version du dépôt public
```

Ouvrir ensuite le fichier dans un navigateur récent. Avec le dossier `private/` en place, le prototype est complet
(logo 2.0, tracé des bras, photos) ; sans lui, il est construit avec des substituts neutres.
Toutes les dates, y compris celles de l’exemple d’espace troupe, viennent du relevé public du site.

Ce que montre le prototype :

- **La pieuvre.** Le logo 2.0 est dessiné tel quel ; chacun de ses huit bras se prolonge vers un spectacle,
  part de l’extrémité exacte du bras, passe sous les autres traits, souligne le titre et s’enroule. Au repos rien
  ne bouge ; on tire un titre (ou on le choisit au clavier) et la pieuvre ramène le bras vers elle.
- **Un univers par spectacle.** Couleurs, typographie, motif et un effet signature au défilement : les jumeaux
  (*Cléophène*), la tirade du nez (*Ci-gisait Cyrano*), le cercle (*Bérénice*), le paperboard (*Mon Royaume
  pour un cheval*), les annotations (*L’imaginaire forcé*), l’horloge (*La Folle Idée*), le fil rouge
  (*Macbeth – Fatum*), les heures (*Actions culturelles*). Chaque page a son adresse : `#/spectacles/berenice`.
- **Trois portes.** « Je viens voir », « Je programme », « Je fais venir dans mon établissement » : une page
  chacune, et la porte choisie colore la lecture de tout le site (cartes, agenda, page d’un spectacle).
- **Des onglets.** Accueil, Spectacles, Agenda (liste, calendrier, carte), Tournée, La compagnie, Espace troupe ;
  sur téléphone, une barre d’onglets en bas d’écran.

Ce qui est réel : textes, distributions et photos des spectacles (repris de crescite.fr), dates publiées, logo 2.0.
Ce qui est proposé : les univers, les textes marqués « proposition ». Ce qui est à compléter est marqué
« à fournir » ou « exemple » dans l’interface (fiches techniques, dossiers, tarifs, contacts, adresses exactes).

Accessibilité : chaque titre de la pieuvre est un bouton (Tab, flèches, Entrée), « Mode calme » coupe les
animations et l’épinglage des pages, la carte a une version tableau, le réglage système « réduire les
animations » est respecté.

## Maquettes

```sh
python3 maquettes/build.py              # les dix maquettes et la planche (maquettes/dist/, non versionné)
python3 maquettes/build.py m06          # une seule maquette
python3 maquettes/build.py --captures   # avec des captures de relecture (Playwright et Chromium, maquettes/dist/shots/)
node maquettes/onglets.mjs /tmp/x m01 m06 # parcourt les vues de chaque maquette et signale les anomalies
python3 data/site_crescite.py               # relève de nouveau le texte de crescite.fr (data/site-crescite.json)
```

Dix façons de montrer le même contenu : **le texte de crescite.fr**, page par page (spectacles, onze saisons de
dates, présentation de la compagnie, actions culturelles, contact, mentions légales), plus Cassandres, création 2027,
**le dossier scolaire de Bérénice** et, pour chaque spectacle, **son univers et son action culturelle**
(`data/univers-spectacles.json`, repris des pages d'adrienvada.fr et du dossier artistique 2027-2028). Rien n'y est
inventé ; s'ajoutent seulement la **carte des tournées**, dessinée dans l'univers de chaque maquette avec l'outil
commun `maquettes/src/carte.js`, et quelques intitulés de rubrique (`D.site.libelles`). Chacune **s'ouvre sur le
logo en grand** (`maquettes/src/intro.js`) : au clic, à la molette ou en glissant vers le bas, ses tentacules
ondulent, il grossit et le site apparaît à travers lui.

Chacune se lit ensuite par **trois entrées**, la navigation première : « Je viens voir un spectacle » (`#/voir` : les
dates tout public de la saison et leur carte), « Je souhaite programmer » (`#/programmer` : le catalogue, le nombre
de représentations, les lieux de diffusion, la fiche technique), « Je représente un établissement scolaire »
(`#/etablissement` : le type d'action culturelle de chaque spectacle, les actions culturelles du site, le dossier
scolaire de Bérénice). Spectacles, La compagnie et Contact viennent en second. La page de chaque spectacle prend son
univers (couleurs, police de titre, motif, photos, citations ; Bérénice à la charte de son dossier) et se lit dans
l'une des trois entrées : `#/spectacle/berenice/voir`, `…/programmer`, `…/etablissement` ; la dernière entrée choisie
sert de défaut. L'espace pro à mot de passe a disparu : ses anciennes adresses mènent à « Je souhaite programmer »,
celles de l'agenda et des actions culturelles aux deux autres entrées. La pieuvre ne compte pas les spectacles.
De la 01 (« Le programme de salle », typographie seule) à la 10 (« La pieuvre vivante, rangée », le prototype remis
en ordre) ; la 06 (« Les bras de la tournée ») fait de la tentacule un thème. `maquettes/src/synthese.html` assemble
la proposition retenue : l’accueil et les cartes de la 06, l’agenda de la 03 relié à la carte, les portes de la 04
devenues les trois entrées, et les univers de spectacle les plus aboutis.
`onglets.mjs` compare chaque texte affiché aux sources et signale tout texte qui n'en vient pas ; il vérifie aussi
les trois entrées (à portée dans le premier écran, une seule marquée comme courante), les redirections des anciennes
adresses, la disparition de l'espace pro et la présence des contenus attendus de chaque vue.
`maquettes/dist/maquettes.html` est la planche : une barre d’onglets en haut, qui charge chaque maquette juste en
dessous, et pour chacune son principe, ses forces et ses limites (« À propos »).

**En ligne.** `python3 maquettes/build.py --pages` écrit le site GitHub Pages dans `docs/` : la planche en page
d'accueil et chaque maquette en page à part (`docs/m06.html`, `docs/synthese.html`…). Ces pages embarquent le logo
2.0 et les photos (rangées une seule fois dans `docs/photos/`) : leur publication a été décidée par la compagnie. Elles ne sont pas faites pour être trouvées :
chacune demande aux moteurs de recherche de ne pas l'indexer (`noindex, nofollow, noarchive, nosnippet,
noimageindex`), et leur adresse n'est donnée nulle part dans le dépôt (elle figure dans Settings → Pages). Chaque fichier de `maquettes/src/` lit ses contenus dans l’objet `D` que le script injecte.

## Données

`data/representations-site-2016-2027.csv` : une ligne par date publiée, avec saison, spectacle, dates, commune,
code INSEE, département, coordonnées, lieu, public (scolaire ou tout public), annulation, nombre de représentations
quand il est indiqué, texte d'origine et page source. Le classement scolaire / tout public est déduit des intitulés
(collège, lycée, « scolaire ») : à vérifier pour les saisons 2016 à 2020.

Ce relevé ne contient que les dates **publiées** sur le site : une ligne peut couvrir plusieurs représentations,
et beaucoup de représentations n'y figurent pas. Le dossier artistique 2027-2028 de la compagnie compte plus de
1 500 représentations depuis 2011 (au moins 86 par an depuis 2014), quand le site en liste 460 lignes depuis 2016,
soit environ un tiers. Les maquettes ne calculent aucun total à partir du relevé, qui ne sert qu'à placer les dates
sur les cartes : le nombre de représentations de chaque spectacle, dans « Je souhaite programmer », est celui que
donne le dossier artistique.

`data/site-crescite.json` : le texte des pages publiques de crescite.fr tel qu'il est publié, fautes comprises
(inline `em`, `strong`, listes et liens gardés). `data/cassandres.json` : le texte de Cassandres, relevé sur la page
du projet en attendant sa page sur le site de la compagnie.

`data/berenice-dossier.json` : le dossier scolaire 2026 de Bérénice, section par section (pourquoi l'étudier, le
tableau des programmes, synopsis, adaptation, espace, alexandrin, consignes de préparation, les quatre ateliers,
conditions d'accueil et fiche technique, présentation de la compagnie, portrait du directeur artistique). Le prix de
cession, l'adresse électronique et le téléphone n'y sont pas : le dossier lui-même reste dans `private/dossiers/`.

`data/univers-spectacles.json` : pour chaque spectacle, son univers (couleurs, polices, motif), sa phrase d'accroche,
ses citations, ses photos légendées, son action culturelle (type, public, lieu, textes, dispositifs) et ce qui sert à
le programmer (nombre de représentations, lieux de diffusion). Chaque texte porte sa source : le site, le dossier
scolaire, adrienvada.fr ou le dossier artistique 2027-2028 (seulement ses passages sur les spectacles et les actions
culturelles : ni budget, ni salaire, ni contact). Rien n'y parle de l'action culturelle de Macbeth – Fatum : à compléter.

## Base de données

La compagnie n'a pas encore de base de données : il faut créer un projet Supabase à son nom (rattaché à
admin@crescite.fr), distinct de tout compte personnel. `supabase/migrations/20261013_modele_dates.sql` y crée le
modèle (tables, règles d'accès, vue publique de l'agenda) et la liste des spectacles ; l'historique s'importe
ensuite depuis `data/representations-site-2016-2027.csv`. Le script a passé l'analyseur syntaxique de PostgreSQL
mais n'a été exécuté sur aucune base : le relire avant de l'exécuter dans le projet neuf.
