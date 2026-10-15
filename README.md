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
| `data/` | Relevé des dates publiées sur crescite.fr de 2016 à 2027 : 464 lignes géolocalisées, en JSON et en CSV. |
| `supabase/migrations/` | Modèle de données proposé pour la future base de la compagnie : dates, lieux, tournées, troupe, feuilles de route, règles d'accès. **Non exécuté** : à relire avant usage. |
| `private/` (non versionné) | `brand/` logo 2.0 en SVG et le tracé de ses huit bras, `photos/` une photo par spectacle. |

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
python3 maquettes/build.py --captures   # avec les captures de la planche (Playwright et Chromium)
```

Dix façons de montrer les mêmes contenus (spectacles, dates de la saison, trois portes, compagnie), sous des règles
de clarté communes : un seul étage d’en-tête et quatre entrées au plus, deux familles de polices au plus, un
spectacle distingué par sa couleur et sa photo seulement, les prochaines dates à un clic. De la 01 (« Le programme
de salle », typographie seule) à la 10 (« La pieuvre vivante, rangée », le prototype remis en ordre) ; la 06
(« Les bras de la tournée ») fait de la tentacule un thème : la carte des tournées qui partent de Rouen.
`maquettes/src/synthese.html` assemble la proposition retenue en un site de cinq pages : l’accueil et les cartes de
la 06, l’agenda filtrable de la 03 relié à la carte, les portes à liens directs de la 04 (le site retient la porte
choisie), et l’effet signature de chaque spectacle repris de la 10.
`maquettes/dist/maquettes.html` réunit les captures, le principe, les forces et les limites de chacune, et ouvre
chaque maquette en grand.

**En ligne.** `python3 maquettes/build.py --pages` écrit le site GitHub Pages dans `docs/` : la planche en page
d'accueil et chaque maquette en page à part (`docs/m06.html`, `docs/synthese.html`…), exclues des moteurs de
recherche. Ces pages embarquent le logo 2.0 et les photos : leur publication a été décidée par la compagnie.
Adresse : https://adrienvada.fr/Crescite/ (le compte GitHub redirige ses pages vers le domaine adrienvada.fr ;
Pages est servi depuis le dossier `docs/` de la branche principale). Chaque fichier de `maquettes/src/` lit ses contenus dans l’objet `D` que le script injecte.

## Données

`data/representations-site-2016-2027.csv` : une ligne par date publiée, avec saison, spectacle, dates, commune,
code INSEE, département, coordonnées, lieu, public (scolaire ou tout public), annulation, nombre de représentations
quand il est indiqué, texte d'origine et page source. Le classement scolaire / tout public est déduit des intitulés
(collège, lycée, « scolaire ») : à vérifier pour les saisons 2016 à 2020.

Ce relevé ne contient que les dates **publiées** sur le site : une ligne peut couvrir plusieurs représentations,
et beaucoup de représentations n'y figurent pas. Le dossier artistique 2027-2028 de la compagnie compte plus de
1 500 représentations depuis 2011 (au moins 86 par an depuis 2014), quand le site en liste 460 lignes depuis 2016,
soit environ un tiers. Les maquettes affichent donc les totaux du dossier (`DIFFUSION` dans `maquettes/build.py`)
et n'utilisent le relevé que pour l'agenda et les cartes.

## Base de données

La compagnie n'a pas encore de base de données : il faut créer un projet Supabase à son nom (rattaché à
admin@crescite.fr), distinct de tout compte personnel. `supabase/migrations/20261013_modele_dates.sql` y crée le
modèle (tables, règles d'accès, vue publique de l'agenda) et la liste des spectacles ; l'historique s'importe
ensuite depuis `data/representations-site-2016-2027.csv`. Le script a passé l'analyseur syntaxique de PostgreSQL
mais n'a été exécuté sur aucune base : le relire avant de l'exécuter dans le projet neuf.
