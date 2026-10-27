# Prompt de lancement : implémenter `admin/ORDINATEUR.md` en un temps record

> À coller tel quel dans une session Claude Code (Opus 5.5) ouverte sur ce dépôt. Le mot « ultracode » en tête
> autorise l'orchestration multi-agents ; la zone « Décisions d'Adrien » se remplit avant de coller, ou se laisse telle
> quelle (les recommandations du plan s'appliquent alors).

---

ultracode

Tu es Claude Opus 5.5. Tu orchestres ; tu n'écris le code toi-même que pour fusionner, corriger un conflit ou
débloquer un agent. L'écriture des lots est déléguée à des agents Sonnet 5.5 par le tool Workflow (`model: 'sonnet'`),
en parallèle chaque fois que les fichiers le permettent. Le but : livrer les dix-sept lots du plan
`admin/ORDINATEUR.md`, chacun vert à son banc, commité et poussé, dans le temps le plus court possible sans baisser la
barre du dépôt.

## 1. Ce que tu lis d'abord, en entier, dans cet ordre

1. `admin/ORDINATEUR.md` : le plan (sept sections ; dix-sept lots, chacun avec onze rubriques : Objectif, Ce que voit
   Adrien, Fichiers et lignes, Étapes, Préférences et adresse, Accessibilité et clavier, Mouvement, Banc et
   vérifications, Documentation, Risques et parades, Taille). La section 7 donne l'ordre et ce qui va en parallèle.
2. `README.md` lignes 267 à 500 (l'administration telle qu'elle est) et `site/MOUVEMENT.md` (les règles du mouvement).
3. `admin/index.html` lignes 4580 à 4610 (l'ordre de chargement des modules), `site/admin-fictif.mjs` (le harnais des
   bancs), `site/build.py` lignes 1106 à 1150 (la publication de `admin/` dans `docs/admin/`).
4. `git log --oneline -30` : le ton des messages de commit (français, descriptifs, un corps).

## 2. Les règles qui ne se négocient pas

- Tout en français : code, commentaires, en-têtes de module, noms de vérifications, README, messages de commit.
- Vanilla HTML / JS / CSS, aucune bibliothèque, aucun bundler ; un module = un fichier `admin/x.js`, IIFE `'use strict'`,
  globale en MAJUSCULES, un long commentaire d'en-tête qui dit ce qu'il fait, après quoi il se charge, son API ; sa ligne
  `<script src>` à sa place dans `admin/index.html` et son nom dans le tuple de `site/build.py` (lignes 1116-1118).
- Le téléphone (`admin/mobile.js`, < 640 px) ne change pas ; l'espace de l'équipe (`equipe/`) ne change pas ; les
  modules partagés (`gestes.js`, `planning.js`, `feuille.js`) gardent leurs défauts (poignées sous `html.admin` ou
  option explicite).
- Le mouvement reste dans le vocabulaire de `site/MOUVEMENT.md` ; rien sous `prefers-reduced-motion` ni `?anim=0` ;
  budget de 200 ms à CPU=4.
- Accessibilité tenue : rôles, `aria-current`, `aria-keyshortcuts`, focus visible, 44 px au doigt, libellés `.sr`.
- **Les numéros de ligne du plan sont ceux du 27 octobre 2026.** Ils dérivent dès le premier lot. Un agent cherche
  toujours l'ancre (`grep -n` du nom de fonction, de classe, de variable cité) et ne fait jamais confiance au numéro
  seul ; quand une ancre a disparu, il s'arrête et le dit dans son compte rendu.
- Rien n'est « fini » sans : le banc du lot vert, les bancs existants verts (`site/bancs-admin.sh` dès que le lot 1
  l'a créé ; avant, `python3 site/build.py && node site/tableau.mjs && node site/niveau.mjs && node site/adresses-admin.mjs
  && node site/mouvement-admin.mjs`), le README et MOUVEMENT.md à jour, `docs/admin/*` régénéré.
- Un lot = un commit (deux si le plan le dit, comme le lot 2) ; message français avec un titre court et un corps qui dit
  ce qu'Adrien verra ; `python3 site/build.py --pages` puis `git add admin site README.md supabase docs/admin` et
  rien d'autre de `docs/` (le reste de `docs/` se remet d'un `git checkout -- docs/index.html docs/photos docs/equipe
  docs/pro docs/reponse docs/synthese.html docs/_headers`) ; aucun identifiant de modèle dans un commit.
- Tu travailles sur la branche que la session t'assigne (sinon `admin-ordinateur`), tu pousses après chaque vague, tu
  ouvres la PR après la première vague et tu tiens sa description à jour (lots livrés / partiels / à reprendre,
  décisions prises, bancs, captures).
- Ne jamais élargir le périmètre : ce que le plan ne dit pas attend un autre plan. Une idée en route va dans la PR,
  sous « Plus tard ».
- Jamais d'attente sur Adrien pendant la course : les questions de la section 6 du plan sont tranchées par leurs
  recommandations, sauf ce qu'Adrien remplace ci-dessous.

## 3. Décisions d'Adrien (à remplir avant de coller ; vide = les recommandations du plan)

- Jeu « Diffusion » dans le tableur : …
- Le menu de nuit dans les deux thèmes : …
- Vocabulaire des étapes de diffusion d'une date : …
- Épinglés du menu et actions de la tuile (une liste ou deux) : …
- Prévenir l'équipe quand la distribution « en tournée » change : …
- Valeur d'office des filtres : …
- Portraits dans la grille : …
- Conflits d'édition : …
- Intervalles tapés dans une case : …
- Zoom de la carte : …
- Vue Mois : …
- Densité globale ou par vue : …
- Jalons de relecture : …

## 4. Les vagues : le parallélisme sans conflit

Les lots qui touchent les mêmes régions de fichier vont en série ; les autres en parallèle, chacun dans son worktree,
puis fusionnés par toi. Entre deux vagues : fusion sur la branche de travail, bancs complets, commits, push.

| Vague | Lots | Pourquoi |
| --- | --- | --- |
| 0 | 1 | le socle touche partout (prefs.js, harnais, bancs, README) : seul |
| 1 | 2 | icones.js puis l'extraction de TABLEUR : index.html bouge de mille lignes, seul |
| 2 | 3 ∥ 8 ∥ 9 | la coque (cadre.js, l'en-tête, le CSS, le routeur) ; le schéma et le rail (la région de la fiche de date) ; la base (SQL seul) : trois worktrees |
| 3 | (4 → 5) ∥ 6 ∥ 7 | accès rapides puis thème (cadre.js, en série) ; fenetres.js (tiroir, boîtes, CSS) ; les vues (vueDates, tableur.js, tournee.js) : trois worktrees |
| 4 | (10 → 11 → 12 → 13) ∥ (14 → 15) | le tableur en série (tableur.js, un seul fil) ; planning, carte, tuiles, A4 puis la carte de travail : deux worktrees |
| 5 | 16 → 17 | l'habillage final puis la planche : en série, sur la branche |

Après chaque fusion, relis les conflits d'`admin/index.html` à la main (deux agents y écrivent dans des régions
différentes ; git fusionne presque tout seul, mais le CSS de 25 à 686 et l'ordre des `<script>` 4583 à 4608 demandent
l'œil) et relance les bancs avant de commiter la fusion.

## 5. Le pipeline d'un lot (Sonnet écrit, Sonnet relit, tu acceptes)

Pour chaque lot, un Workflow avec un seul item (le lot) et quatre étapes en pipeline, ou plusieurs items quand des
lots vont en parallèle :

1. **Préparer (toi, sans agent).** Extrais du plan le texte complet du lot (`sed -n` entre ses deux titres `###`) ;
   relève les ancres fraîches de chaque fichier:ligne cité (`grep -n`) ; écris un « dossier de lot » dans ton
   bloc-notes : le texte du lot, la table « ancre → ligne d'aujourd'hui », les décisions de la section 3, les règles de
   la section 2, le nom du banc, la commande des bancs. C'est tout ce que l'agent recevra : son brief doit se suffire.
2. **Écrire (Sonnet, `isolation: 'worktree'` si la vague est parallèle, sinon sur place).** Brief : le dossier de
   lot ; « suis les Étapes dans l'ordre ; écris le banc avant ce qu'il vérifie quand le plan le dit (lots 1 et 2) ;
   lance le banc du lot puis les bancs existants ; ne lis `admin/index.html` que par plages (`sed -n`) ; mets le README
   et MOUVEMENT.md à jour ; commite dans ton worktree sur une branche `lot-N` ; rends le compte rendu ». Schéma de
   retour : `{ lot, branche, worktree, fichiers: [...], banc: { nom, verifications, vert: bool, sortie: '...' },
   bancsExistants: { verts: bool, sortie }, etapesFaites: [...], etapesLaissees: [{ etape, pourquoi }], ancresPerdues:
   [...], questions: [...] }`.
3. **Relire (Sonnet, lecture seule, lentille adversariale, `effort: 'high'`).** Brief : le même dossier de lot, le
   diff (`git diff <base>..lot-N`), et la consigne « cherche ce qui manque par rapport aux Étapes et aux onze
   rubriques, ce qui casse (sélecteurs figés par site/tableau.mjs, niveau.mjs, mouvement-admin.mjs, adresses-admin.mjs ;
   mobile.js ; View Transitions et `--haut-barre` ; la sémantique « date entière » de `crescite_enregistrer_date` ; la
   RLS ; l'innerHTML du tableur ; le budget 200 ms), l'anglicisme, le jargon, l'en-tête de module absent, le README
   oublié, la vérification de banc qui ne vérifie rien ». Schéma : `{ constats: [{ gravite: 'bloquant' | 'important' |
   'mineur', fichier, texte, verite, correction }], verdict }`.
4. **Corriger (Sonnet, le même brief + les constats).** Applique les bloquants et les importants, relance les bancs,
   commite sur `lot-N`, rend le même schéma qu'en 2. Une seule boucle relire → corriger ; si des bloquants restent
   après, tu tranches toi-même.
5. **Accepter (toi).** Lis le diff en entier ; lance toi-même les bancs ; fusionne `lot-N` sur la branche de travail
   (`git merge --no-ff`), régénère `docs/admin`, commite, pousse, mets la PR à jour. Un lot qui ne converge pas :
   garde ce qui est vert, note le reste dans la PR sous « À reprendre » avec la raison, et continue : la course ne
   s'arrête pas sur un lot.

Un lot de taille L ou XL (3, 6, 11, 12, 13) se découpe en deux ou trois sous-lots par groupes d'Étapes, chacun avec
son passage relire → corriger, pour que chaque agent garde un contexte court.

## 6. Gabarit de Workflow pour une vague parallèle

```js
export const meta = {
  name: 'vague-2',
  description: 'Lots 3, 8 et 9 en parallèle : écrire, relire, corriger, dans trois worktrees',
  phases: [{ title: 'Écrire' }, { title: 'Relire' }, { title: 'Corriger' }],
}
const DOSSIERS = args.dossiers   // [{ lot: 3, brief: '…texte complet…', banc: 'node site/cadre.mjs' }, …]
const RENDU = { type: 'object', properties: { lot: { type: 'number' }, branche: { type: 'string' }, worktree: { type: 'string' },
  fichiers: { type: 'array', items: { type: 'string' } }, bancVert: { type: 'boolean' }, bancsExistantsVerts: { type: 'boolean' },
  sortieBancs: { type: 'string' }, etapesLaissees: { type: 'array', items: { type: 'string' } }, ancresPerdues: { type: 'array', items: { type: 'string' } } },
  required: ['lot', 'branche', 'worktree', 'fichiers', 'bancVert', 'bancsExistantsVerts', 'sortieBancs', 'etapesLaissees', 'ancresPerdues'] }
const CONSTATS = { type: 'object', properties: { constats: { type: 'array', items: { type: 'object', properties: {
  gravite: { type: 'string', enum: ['bloquant', 'important', 'mineur'] }, fichier: { type: 'string' }, texte: { type: 'string' }, verite: { type: 'string' }, correction: { type: 'string' } },
  required: ['gravite', 'fichier', 'texte', 'verite', 'correction'] } }, verdict: { type: 'string' } }, required: ['constats', 'verdict'] }
const resultats = await pipeline(DOSSIERS,
  d => agent(`${d.brief}\n\nÉcris le lot ${d.lot} dans ton worktree, lance « ${d.banc} » puis les bancs existants, commite sur une branche lot-${d.lot}, rends le compte rendu.`,
    { label: `écrire:lot${d.lot}`, phase: 'Écrire', schema: RENDU, model: 'sonnet', effort: 'high', isolation: 'worktree' }),
  (r, d) => agent(`${d.brief}\n\nRelis, en lecture seule, le diff de la branche ${r.branche} (worktree ${r.worktree}) contre la branche de travail. Lentille adversariale : ce qui manque, ce qui casse, le style. Rends les constats.`,
    { label: `relire:lot${d.lot}`, phase: 'Relire', schema: CONSTATS, model: 'sonnet', effort: 'high' }).then(c => ({ r, c })),
  ({ r, c }, d) => (c.constats.some(x => x.gravite !== 'mineur')
    ? agent(`${d.brief}\n\nDans le worktree ${r.worktree} (branche ${r.branche}), applique ces constats, relance « ${d.banc} » et les bancs existants, commite, rends le compte rendu.\n\nCONSTATS :\n${JSON.stringify(c.constats, null, 1)}`,
        { label: `corriger:lot${d.lot}`, phase: 'Corriger', schema: RENDU, model: 'sonnet', effort: 'high' })
    : r))
return resultats
```

Passe les dossiers de lot par `args` (des objets, jamais une chaîne JSON) ; pour une vague en série (4 → 5, 10 → 13),
enchaîne les `await agent(...)` sans worktree, sur la branche de travail, un lot après l'autre. N'appelle jamais
`Date.now()` ni `Math.random()` dans un script.

## 7. Le rythme et la livraison

- Vague 0 et 1 d'abord, sans parallélisme : elles conditionnent tout. Dès la vague 2, trois agents écrivent en même
  temps ; tu prépares les dossiers de la vague suivante pendant qu'ils écrivent.
- Après chaque vague : `site/bancs-admin.sh` vert, commit(s), push, PR à jour, et une ligne à Adrien dans la PR qui dit
  ce qu'il peut déjà voir (« dès ce commit : le menu latéral »).
- Un banc existant qui casse sur un sélecteur que le plan prévoyait d'amender (tableau.mjs 528-545, niveau.mjs 222 et
  244, mouvement-admin.mjs 130) : amende le banc comme le plan le dit. Tout autre rouge : corrige le code, jamais le
  banc.
- Les captures (`site/dist/shots-*/`) ne se commitent pas ; la planche du lot 17 non plus : dis dans la PR comment la
  produire (`site/bancs-admin.sh --planche`).
- À la fin : la PR porte le tableau des dix-sept lots (fait / partiel / à reprendre), les décisions prises (section 3
  et recommandations suivies), les bancs et leurs comptes, les quatre jalons de relecture pour Adrien (après les lots
  5, 11, 13 et 17), et le temps passé par vague.
