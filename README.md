# Crescite : système d'information de la compagnie

Dépôt de travail pour la reprise en main du site [crescite.fr](https://crescite.fr) et la refonte « Crescite 2.0 ».
L'audit complet, les 10 évolutions proposées et la feuille de route sont dans le document privé
« Audit crescite.fr et Crescite 2.0 » (Claude Docs). Ce dépôt contient les pièces techniques publiables.

> Ce dépôt est **public**. Le logo 2.0, les photos des spectacles (droits des photographes), les dates internes
> de la base Supabase et l'audit de sécurité n'y sont volontairement pas versionnés : ils vont dans `private/`,
> dossier exclu par `.gitignore`.

## Contenu

| Dossier | Contenu |
| --- | --- |
| `prototype/` | Démonstrateur interactif : accueil « pieuvre » (tirer une tentacule pour aller au centre), pages spectacles par public, agenda « près de chez moi », carte de tournée, espace troupe. Sources dans `prototype/src/`, assemblage par `prototype/build.py`. |
| `data/` | Relevé des dates publiées sur crescite.fr de 2016 à 2027 : 464 lignes géolocalisées, en JSON et en CSV. |
| `supabase/migrations/` | Modèle de données proposé : dates, lieux, tournées, troupe, feuilles de route, règles d'accès. **Non exécuté** : à relire avant usage. |
| `private/` (non versionné) | `brand/` logo 2.0 en SVG, `photos/` une photo par spectacle, `data/` instantané de la table Supabase, `docs/` copie de l'audit. |

## Prototype

```sh
python3 prototype/build.py        # écrit prototype/dist/index.html (non versionné)
```

Ouvrir ensuite `prototype/dist/index.html` dans un navigateur récent. Avec le dossier `private/` en place,
le prototype est complet (logo 2.0, photos, dates Supabase de l'espace troupe) ; sans lui, il est construit avec
des substituts neutres et les dates publiques du site.

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

`supabase/migrations/20261013_modele_dates.sql` renomme la table actuelle en `representations_v0`
(rien n'est supprimé), crée le modèle normalisé et y reprend les 25 dates existantes. Le script a passé
l'analyseur syntaxique de PostgreSQL mais n'a été exécuté sur aucune base : faire une sauvegarde et le relire
avant de l'exécuter dans l'éditeur SQL de Supabase.
