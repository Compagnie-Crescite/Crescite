# En cas de panne

Ce document dit quoi faire quand le site de la compagnie ne marche plus, ou pour éviter d'en arriver là. Il est écrit pour
quelqu'un qui ne connaît pas le projet : la compagnie, ou un développeur indépendant appelé en renfort. Il ne demande
aucun outil d'intelligence artificielle : du Python 3, Node.js, git et un navigateur suffisent.

> Ce dépôt est **public** : aucun mot de passe, aucune clé, aucun nom de titulaire de compte ici. Ce qui est secret (les
> accès, section 7) se tient dans un endroit privé de la compagnie.

## 1. Les pièces du site

| Pièce | Où | Ce qu'elle fait | Si elle tombe |
| --- | --- | --- | --- |
| **Le nom de domaine** `crescite.fr` | OVH (registraire et DNS : `ns106.ovh.net`, `dns106.ovh.net`). Titulaire : la compagnie ; expire le **8 juillet 2027** | Donne l'adresse du site et des courriels | Plus rien ne répond à cette adresse. Les autres adresses du site restent en ligne. |
| **Les pages** | Cloudflare Pages, projet `crescite` → `crescite.pages.dev` ; une copie identique sur GitHub Pages → `compagnie-crescite.github.io/Crescite/` | Sert le dossier `docs/` : le site, l'administration, les espaces de l'équipe et des salles, la page de réponse, les photos, les polices | On sert la copie, ou on dépose `docs/` ailleurs (scénario A). |
| **Le code** | GitHub, `Compagnie-Crescite/Crescite` | Garde l'historique et publie la copie GitHub Pages | Le site continue de tourner ; on publie sans GitHub (scénario B). |
| **La base** | Supabase, projet `fwjgyfzcbcmfyfkhhtuh` | Tables `crescite_*`, comptes, fichiers (stockages `crescite`, `crescite-equipe`, `crescite-pro`, `crescite-frais`), 4 fonctions, 2 tâches planifiées | Le site public reste lisible ; tout le reste s'arrête (scénarios C et D). |
| **Les courriels** | Brevo (clé `BREVO_API_KEY`), ou Resend (`RESEND_API_KEY`) | Propositions de dates, alertes de tournée | Rien ne part ; l'administration l'affiche (« non configuré »). |
| **Les boîtes aux lettres** `@crescite.fr` | OVH (offre e-mail du même compte que le domaine : `mx1.mail.ovh.net`…) | Les adresses de la compagnie | Plus de courriel reçu ni envoyé. Elles dépendent du compte OVH qui gère le domaine : à garder sous la main de la compagnie (section 7). |
| **Le logo et les photos d'origine** | `private/`, **hors du dépôt** (droits des photographes) | Il faut ce dossier pour reconstruire le site publié | Sans lui, `site/build.py --pages` refuse de publier. **En garder une copie** (section 6). |

Le reste est déjà dans le site : les polices (`docs/polices/`, plus de Google Fonts), le client Supabase
(`admin/vendor/`), pdfmake. Seuls la recherche de communes (`geo.api.gouv.fr`, dans l'édition) et les vidéos
(YouTube sans cookie, Vimeo) appellent encore un autre site.

> **Aujourd'hui (octobre 2026)**, `crescite.fr` mène encore à l'ancien site WordPress, hébergé chez WP Serveur. Le jour de la
> bascule, ajouter `crescite.fr` comme domaine personnalisé du projet Cloudflare Pages (Workers & Pages → crescite →
> Custom domains) et suivre ce qu'il demande dans le DNS d'OVH ; puis mettre la nouvelle adresse dans Supabase
> (section 5, étape 4).

## 2. Trouver la panne en cinq minutes

D'abord, les pages d'état des services : [githubstatus.com](https://www.githubstatus.com),
[cloudflarestatus.com](https://www.cloudflarestatus.com), [status.supabase.com](https://status.supabase.com),
[status.brevo.com](https://status.brevo.com). Si l'un d'eux annonce un incident, il n'y a souvent rien d'autre à faire
qu'attendre.

| Ce qu'on voit | Cause probable | Où regarder |
| --- | --- | --- |
| Le site ne répond plus du tout à son adresse | Le domaine (expiré, DNS modifié) ou Cloudflare | Ouvrir `crescite.pages.dev` et la copie GitHub Pages. Si elles répondent, c'est le domaine : compte OVH. Sinon, scénario A. |
| Le site s'affiche, mais l'administration dit qu'elle ne joint pas la base, ou rien ne se met à jour | Supabase | status.supabase.com, puis le tableau de bord du projet : un projet **en pause** affiche « Restore project » (scénario C). |
| Les courriels ne partent plus | Clé Brevo absente ou révoquée, quota atteint (300 par jour en gratuit) | Brevo → Transactional → Logs ; Supabase → Edge Functions → Secrets. |
| Les liens des courriels mènent à une page introuvable | Le secret `SITE_URL` n'est pas réglé : les fonctions prennent alors `adrienvada.fr/Crescite`, qui ne sert plus le site | Supabase → Edge Functions → Secrets : `SITE_URL` = l'adresse du site, sans `/` final. |
| Le flux d'agenda ne s'ouvre plus (« Missing authorization header ») | Un redéploiement de la fonction a recoché « Verify JWT » | Supabase → Edge Functions → `crescite-agenda` → Details : décocher, enregistrer. Idem pour `crescite-courriel`, `crescite-pro` et `crescite-push`. |
| On ne peut plus publier | GitHub en panne, ou la clé Cloudflare a expiré | Scénario B ; ou une nouvelle clé Cloudflare (« Cloudflare Pages : Modifier »). |

## 3. Les scénarios

### A. Cloudflare en panne, ou le compte est perdu

Le site n'est qu'un dossier de fichiers, `docs/` : n'importe quel hébergement de pages statiques le sert tel quel. Tous
ses liens sont relatifs.

1. **Le plus rapide** : la copie GitHub Pages est déjà en ligne. Dans le DNS d'OVH, faire pointer `www.crescite.fr` vers
   `compagnie-crescite.github.io` (CNAME) ; puis, sur GitHub, Settings → Pages → Custom domain : `www.crescite.fr`.
   Comptez de quelques minutes à quelques heures pour la propagation.
2. **Ailleurs** (l'hébergement web d'OVH, Netlify…) : y déposer **le contenu** de `docs/`, par exemple par FTP.
3. Dans les deux cas, déclarer la nouvelle adresse dans Supabase (section 5, étape 4), sans quoi les connexions et les
   liens des courriels ne reviennent pas au site.

GitHub Pages ne lit pas `docs/_headers` : les consignes aux moteurs de recherche passent alors par la balise `<meta>` de
chaque page, déjà présente.

### B. GitHub en panne

Le site continue de tourner : GitHub ne sert qu'à garder le code. Chaque copie du dépôt (`git clone`) contient tout
l'historique ; une copie à jour sur un ordinateur de la compagnie suffit pour continuer.

- **Publier sans GitHub**, depuis cette copie : `python3 site/build.py --pages`, puis `python3 scripts/cloudflare.py`
  (avec `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` dans l'environnement). Le script publie directement sur
  Cloudflare et vérifie que la page servie est la bonne.
- **Si GitHub disparaissait pour de bon** : créer un dépôt vide chez un autre hébergeur de code (Codeberg, GitLab…), puis
  `git remote add secours <adresse>` et `git push secours --all`.

### C. Supabase en panne pour quelques heures, ou le projet est en pause

- **Le site public** s'affiche quand même, avec les données du dernier build (chaque page en garde une copie). Les dates
  ajoutées depuis n'y sont pas, mais rien n'est perdu.
- **L'espace de l'équipe** montre ses dernières données lues pendant un mois au plus, en lecture seule.
- **Ne marchent plus** : l'administration, l'espace des salles, la page de réponse, les alertes, les courriels, les
  notifications.

Ne rien relancer (ni script SQL ni import) : attendre la fin de l'incident. **Un projet gratuit se met en pause** après
une longue période sans activité : tableau de bord Supabase → le projet → « Restore project ». Les données sont gardées.

### D. Les données sont perdues (effacement, compte fermé)

C'est la seule panne grave, et la seule contre laquelle il faut une sauvegarde (section 4). Avec elle, voir la section 5.
Sans elle, le dépôt permet de reconstruire une base avec ce qui a été publié jusqu'en octobre 2026
(`python3 supabase/importer.py --photos`, à partir de `data/`). Tout ce qui a été saisi depuis dans l'administration est
alors perdu.

## 4. Sauvegarder (au moins une fois par mois, et avant chaque script SQL)

Le plan gratuit de Supabase ne garde aucune sauvegarde que la compagnie puisse restaurer elle-même. Il faut donc la faire.

**La base** (tables, comptes, journal) : avec `pg_dump` (paquet `postgresql-client`, de la même version que la base ou
plus récente : Project Settings → Infrastructure la donne).

1. Supabase → le projet → **Connect** → « Session pooler » : copier la chaîne de connexion et y mettre le mot de passe de
   la base (Project Settings → Database, à réinitialiser si personne ne le connaît).
2. Lancer :

   ```sh
   pg_dump "<chaîne de connexion>" -Fc --no-owner --no-privileges -f crescite-$(date +%F).dump
   ```

**Les fichiers** (photos, portraits, documents, justificatifs de frais) : les stockages `crescite`, `crescite-equipe`,
`crescite-pro` et `crescite-frais`. Le plus simple : l'accès S3 de Supabase (Project Settings → Storage → S3 Connection :
créer une clé) avec [rclone](https://rclone.org) (`rclone copy supabase:crescite ./sauvegarde/crescite`, et ainsi de
suite, une fois la connexion `supabase` déclarée dans rclone).

**Où les ranger** : hors de Supabase, et **jamais dans ce dépôt public** (la base contient les coordonnées de l'équipe
et des salles). Par exemple, dans le Google Drive de la compagnie, après les avoir chiffrées
(`gpg -c crescite-AAAA-MM-JJ.dump` : le mot de passe va avec les accès, section 7). Garder les trois dernières.

## 5. Repartir sur un nouveau projet Supabase

À confier à un développeur, en une journée environ.

1. Créer un projet Supabase (région Europe) et y restaurer la sauvegarde. Suivre le guide officiel « Backup and restore »
   de Supabase ([supabase.com/docs](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)) :
   la restauration demande des précautions, à cause des schémas que Supabase gère lui-même (`auth`, `storage`).
   Remettre les fichiers dans les quatre stockages, sous les mêmes noms.
2. **Changer l'adresse du projet dans le code** : `grep -rl fwjgyfzcbcmfyfkhhtuh --exclude-dir=docs .` donne les fichiers
   (le site, l'administration, les espaces, les fonctions SQL et les scripts Python). Y remplacer l'adresse, et la clé
   publique (`sb_publishable_…`) par celle du nouveau projet (Project Settings → API Keys).
3. **Les fonctions** : déployer les quatre de `supabase/functions/` (Edge Functions → Deploy a new function → Via Editor,
   même nom, coller le fichier `index.ts`), puis **décocher « Verify JWT »** sur chacune. Les secrets : `BREVO_API_KEY`
   (ou `RESEND_API_KEY`), `COURRIEL_EXPEDITEUR`, `SITE_URL`.
4. **L'authentification** : Authentication → URL Configuration → Site URL et Redirect URLs = l'adresse du site
   (`https://…/**`) ; Authentication → Emails : le serveur d'envoi (SMTP), sans lequel les liens de connexion ne partent
   presque plus.
5. **Les tâches planifiées et les fonctions SQL qui écrivent l'adresse des fonctions** (`crescite-agendas`,
   `crescite-alertes`, `crescite_notif_envoyer`…) : le script `supabase/migrations/20261105_crescite_projet_compagnie.sql`
   a déjà fait ce changement d'adresse une fois, en octobre 2026 ; le reprendre avec la nouvelle adresse.
6. Reconstruire et publier le site (section 6).

## 6. Publier le site, en temps normal

```sh
python3 site/build.py --pages     # écrit docs/ ; demande le logo 2.0 (private/brand/) et les photos (private/photos/)
node site/onglets.mjs /tmp/x index # vérifie les vues du site
python3 scripts/cloudflare.py     # publie docs/ sur Cloudflare et vérifie la page servie
git add -A && git commit -m "Site publié : …" && git push   # le dépôt et la copie GitHub Pages
```

`private/` (le logo 2.0, les photos d'origine, les dossiers) n'est volontairement pas dans le dépôt. **En garder une
copie à jour** dans le Drive de la compagnie : sans elle, on ne peut plus reconstruire le site publié (on peut seulement
modifier `docs/` à la main).

Une nouvelle police (celle du titre d'un nouvel univers) : l'ajouter dans `scripts/polices.py`, le lancer, puis
reconstruire.

## 7. Pour que la panne n'arrive pas : la liste à revoir chaque trimestre

- [ ] **Chaque compte** (OVH, Cloudflare, GitHub, Supabase, Brevo, Google Drive) : au moins **deux personnes** de la
      compagnie y ont accès, la double authentification est active, l'adresse de secours est celle de la compagnie, pas
      une adresse personnelle.
- [ ] **Le domaine** : renouvellement automatique actif chez OVH, moyen de paiement à jour, échéance (aujourd'hui le
      8 juillet 2027) notée dans l'agenda de la compagnie. Le contact administratif du domaine est aujourd'hui un
      prestataire extérieur : s'assurer que la compagnie a elle-même accès au compte OVH titulaire.
- [ ] **Une sauvegarde de moins d'un mois** (base et fichiers), rangée hors de Supabase, et restaurée au moins une fois
      pour vérifier qu'elle est complète.
- [ ] **Une copie de `private/`** à jour dans le Drive.
- [ ] **Une copie du dépôt** à jour sur un ordinateur de la compagnie (`git pull`).
- [ ] **`SITE_URL`** réglé dans les secrets des fonctions Supabase, et « Verify JWT » décoché sur les quatre fonctions.
- [ ] **La clé Cloudflare** (`CLOUDFLARE_API_TOKEN`) : date d'expiration notée.

**Les accès** (le tableau ci-dessous) se tiennent **hors de ce dépôt**, dans un gestionnaire de mots de passe partagé
(Bitwarden, 1Password…) ou dans un document privé de la compagnie :

| Service | Identifiant du compte | Qui y a accès | Double authentification | Échéance |
| --- | --- | --- | --- | --- |
| OVH (domaine) | | | | 8 juillet 2027 |
| Cloudflare | | | | |
| GitHub (organisation Compagnie-Crescite) | | | | |
| Supabase (projet `fwjgyfzcbcmfyfkhhtuh`) | | | | |
| Brevo | | | | |
| Google Drive (sauvegardes, `private/`) | | | | |

Quand ce document ne correspond plus à la réalité (un service change, une adresse change), le corriger en même temps.
