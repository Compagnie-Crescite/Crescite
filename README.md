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
| `prototype/` | Démonstrateur interactif : accueil « pieuvre » (tirer une tentacule pour aller au centre), pages spectacles par public, agenda « près de chez moi », carte de tournée, espace troupe. Sources dans `prototype/src/`, assemblage par `prototype/build.py`. |
| `data/` | Relevé des dates publiées sur crescite.fr de 2016 à 2027 : 464 lignes géolocalisées, en JSON et en CSV. |
| `supabase/migrations/` | Modèle de données proposé pour la future base de la compagnie : dates, lieux, tournées, troupe, feuilles de route, règles d'accès. **Non exécuté** : à relire avant usage. |
| `private/` (non versionné) | `brand/` logo 2.0 en SVG, `photos/` une photo par spectacle. |

## Prototype

```sh
python3 prototype/build.py        # écrit prototype/dist/index.html (non versionné)
```

Ouvrir ensuite `prototype/dist/index.html` dans un navigateur récent. Avec le dossier `private/` en place,
le prototype est complet (logo 2.0, photos) ; sans lui, il est construit avec des substituts neutres.
Toutes les dates, y compris celles de l'exemple d'espace troupe, viennent du relevé public du site.

Ce qui est réel : textes, distributions et photos des spectacles (repris de crescite.fr), dates publiées, logo 2.0.
Ce qui est à compléter est marqué « à fournir » ou « exemple » dans l'interface (fiches techniques, dossiers,
contacts, adresses exactes).

Accessibilité : chaque tentacule est aussi un bouton (Tab puis Entrée), « Mode calme » coupe les animations,
la carte a une version tableau, le réglage système « réduire les animations » est respecté.

## Données

`data/representations-site-2016-2027.csv` : une ligne par date publiée, avec saison, spectacle, dates, commune,
code INSEE, département, coordonnées, lieu, public (scolaire ou tout public), annulation, nombre de représentations
quand il est indiqué, texte d'origine et page source. Le classement scolaire / tout public est déduit des intitulés
(collège, lycée, « scolaire ») : à vérifier pour les saisons 2016 à 2020.

## Base de données

La compagnie n'a pas encore de base de données : il faut créer un projet Supabase à son nom (rattaché à
admin@crescite.fr), distinct de tout compte personnel. `supabase/migrations/20261013_modele_dates.sql` y crée le
modèle (tables, règles d'accès, vue publique de l'agenda) et la liste des spectacles ; l'historique s'importe
ensuite depuis `data/representations-site-2016-2027.csv`. Le script a passé l'analyseur syntaxique de PostgreSQL
mais n'a été exécuté sur aucune base : le relire avant de l'exécuter dans le projet neuf.
