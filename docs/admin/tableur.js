'use strict';
/* Le tableur des représentations (#/representations/tableur), à côté de la liste, comme le tableur où la compagnie récapitule ses
   représentations, en trois modes (MODES) que le segment « Simple · Complet · Distribution » de la tête choisit :
   - Simple (d'office) : une ligne par date, six colonnes de grandes cases (lignes de 44 px) : le jour (de niveau « date » : en
     écrire un autre décale la date, sa fin et chacune de ses séances, jamais une séance de plus), les séances (des pastilles
     d'heures ; une fenêtre posée sous la case, editerSeances, pour ajouter, retirer ou changer une heure ; « 15h · 20h30 » se
     colle), le spectacle, le lieu (sur deux lignes), le statut (en badge), la distribution. Le visuel : le petit calendrier du
     jour (.tab-jj), le liseré de la couleur du spectacle (--c, posé sur la ligne). Une ligne vide au bas de la grille reçoit une
     date neuve (T.brouillon : le jour, le spectacle, le lieu ; elle se crée dès que le jour et le spectacle y sont) ; « ＋ Date »
     crée toujours une date, sans fusion avec sa voisine (ajouterSeance, separee). Une ligne est { d, r: null, rs, n: 1, premier,
     bande, cle } : jamais de x.r, donc jamais repDe. Aucune colonne à masquer, déplacer ou replier : seules les largeurs se retiennent.
     Le jour s'écrit aussi dans un petit calendrier (.tab-cal, poserCal : mois ‹ ›, lundi en premier, aujourd'hui cerclé, ← → ↑ ↓ et
     Page ↑ ↓ depuis le champ, qui garde le focus ; au doigt, le champ de date du téléphone), ou se tape sous toutes les formes que lireJour lit.
   - Complet : une ligne par séance (jour et heure) ; les séances d'une même date se suivent, en bande. Chaque champ d'une date y est atteignable :
     douze colonnes de plus que la disposition d'origine (la ligne du site, les précisions du site, la billetterie de la séance, le nombre de
     représentations, la précision, la fin de période, la saison, la feuille de route, « Modifié le… par… », la source de la date, celle des
     chiffres, l'étape de la piste : horsOrigine dans le schéma), que le menu « Jeu » (JEUX : Site, Tournée, Suivi, Bilan, Diffusion, Tout) montre
     d'un coup avec toutes celles de son sujet, vides comprises. Une colonne de la diffusion (le montant de cession, l'étape de la piste :
     `confidentiel`) a un cadenas et une bande à l'en-tête, et n'est exportée qu'avec la case « Inclure la diffusion (confidentiel) » du menu
     Exporter. Une case que le schéma dit figée (`fige`) est grise et dit pourquoi en infobulle. L'icône « fiche » (FICHE, une colonne de type
     'action' au bout de la ligne) et Ctrl+Entrée ouvrent la date dans le tiroir sur le champ de la colonne (ouvrirFiche : TIROIR.ouvrir avec
     viser, depuis et apres). Écrire dans une case de séance d'une date « période » (sans séance) demande d'abord (gardePeriode, un menu des
     gestes) ; le collage et Suppr n'y écrivent jamais ; « Détacher cette séance dans sa propre date » est au menu d'une ligne (detacher).
   - Distribution : la matrice des dates (une ligne chacune, comme le Simple, et dans le même ordre) et des personnes (une colonne chacune :
     DISTRIBUTION.colonnes, de type 'presence', groupées par métier). Pour le spectacle filtré ; sans filtre, un groupe de lignes par
     spectacle (debutGroupe : le trait net et le nom en gras, la colonne du spectacle y est figée avec le jour). Chaque case dit ✓ elle part,
     ✕ elle ne part pas, ⟳ remplaçante ou renfort : un clic, Espace ou Entrée la bascule (basculer : par ecrire(), donc la file, les états
     d'une case, Ctrl+Z, et la phrase d'état dit qui sera prévenu) ; Suppr rend la case à la distribution, Maj+flèches (ou Maj+clic) choisit
     une plage, le collage et la copie disent « part », « ne part pas », « remplaçant ou renfort ». Une date annulée ou reportée est une case
     grisée qu'on n'écrit pas. En-tête d'une personne : son portrait, son prénom, son rôle dessous, « téléphone ? » s'il manque, le bouton ⋯
     (« Régler sa période » : le menu de l'en-tête, aussi par clic droit et Maj+F10). Le bas du cadre (tfoot) compte les dates de chacun.
     Aucune ligne vide au bas, aucune colonne à masquer ni à déplacer : seules les largeurs du jour, du spectacle et du lieu se retiennent,
     avec celles du Simple (MODES.distribution.memoire). « Étendre à… » (le bouton sous le cadre, le menu d'une case) lit la plage choisie.
   Le mode se garde avec le compte (la préférence tableur.mode, écrite au clic) et dans l'adresse (?mode=complet, ?mode=distribution, sur le
   tableur seulement : l'entrée propre de LISTES_ADRESSE) ; sans ?mode=, c'est la préférence qui décide ; une adresse qui le dit n'écrit rien
   dans le compte. Changer de mode redessine la grille d'un coup, sans transition.
   Branché sur la base dans les deux sens : écrire dans une case enregistre aussitôt, par le même chemin que la fiche d'une
   date (ecrireDate : crescite_enregistrer_date, puis l'équipe, ou, avec le vingt-quatrième script, l'équipe dans le même
   appel ; les mêmes déclencheurs, notifications et journal), avec « Annuler » et Ctrl+Z. Les états d'une case qu'on écrit : en cours (en italique,
   un petit anneau qui tourne dans le coin), enregistrée (le cadre vert, une coche qui s'efface), refusée par la base (un anneau rouge, le message en
   infobulle, T.erreurs) ; la barre d'état, collée sous le cadre (.tab-ligne-etat : le compte, l'état, « Supprimer… »), le dit avec « Reprendre » (les
   cases refusées reprennent leur valeur) et « Réessayer » (l'écriture est rejouée), jamais Ctrl+Z, qui défairait l'écriture d'avant, réussie (ils restent à la queue de toute phrase tant que des cases sont cerclées) ; placerCadre
   retranche sa hauteur au cadre. Au collage, les cases que le tableur ne comprend pas (une valeur illisible, une case en lecture seule) sont
   surlignées en ambre vingt secondes (.ignoree, la raison en infobulle) et comptées par la barre (« n cases ignorées », « Voir » va à la première).
   Ce qui change ailleurs arrive en direct (le temps réel redessine les lignes, la case active reste, ce qui a changé clignote). Ce que le temps réel a touché, le script principal le note (aRedessiner : des dates, ou
   « tout » pour un lieu, un spectacle, une personne, une distribution) et rafraichirListes(ids) le donne à la grille, qui ne refait
   que les lignes de ces dates (dessinerLignes) ; un redessin entier (dessiner) ne remplace que les lignes dont le HTML a changé. Une saison entière
   (trois cents dates) se pose par tranches (PREMIERES, TRANCHE : les premières lignes d'abord, le reste de tâche en tâche ; la matrice, qui a une colonne par personne,
   en pose moins à la fois) pour qu'aucune tâche ne dépasse 200 ms à CPU=4 ; viser une ligne pas encore posée (le clavier, « Voir ») pose d'un coup ce qui reste.
   En Complet, une case « de la date » (spectacle, lieu, statut, nature, distribution, billetterie, suivi) vaut pour toutes les
   séances de la date : les autres lignes de la date la répètent en gris et s'éclairent avec elle. Ce qui est vide reste vide ; une colonne vide sur toute la vue se replie (« Colonnes vides » la montre). Les colonnes
   se tirent du schéma de la date (SCHEMA_DATE, script principal : colonneDe) et sont à la carte, à l'ordinateur : la
   largeur (le bord droit de chaque en-tête se tire, un double-clic l'ajuste au contenu), l'ordre, les colonnes masquées et
   le nombre de colonnes figées à gauche (le jour et le spectacle d'office) se gardent avec le compte (la préférence
   tableur.colonnes, par mode : { complet: { ordre, masquees, figees, largeurs, vides }, simple: { largeurs } }) ; le menu
   d'un en-tête et le bouton « Colonnes… » les règlent (TABLEUR.colonnes). Filtres :
   ceux de la barre commune aux trois vues de Représentations (la recherche, à venir / passées / toutes, la saison, les
   spectacles, le statut, le public, et sous « Plus de filtres » la nature, le département, le contrat, du … au : le script
   principal les dessine, filtresDates, et les lit, dateRetenue) ; tri par date.
   La distribution : l'équipe de la date (la distribution « en tournée » par défaut ; une équipe explicite ne s'écrit que
   si on la change), en pastilles rondes aux initiales (DISTRIBUTION.cellule : rangées par métier, un anneau pointillé pour un remplaçant,
   « −n » pour ceux qui ne partent pas, « +n » pour ceux que la place ne laisse pas voir : la place est la largeur de la colonne, qui
   se refait au relâchement du bord qu'on tire) ; Entrée sur la case ouvre la fenêtre de DISTRIBUTION.fenetre (que ce module pose : poser,
   fermer, enregistrer par ecrire(), étendre) ; « Étendre à… » pose l'équipe sur les dates du même spectacle (la saison, l'année civile,
   cette date et les suivantes au même lieu, ou les lignes choisies), après un aperçu qui dit combien de personnes seront prévenues et
   signale les remplaçants posés à la main : une fusion, la ligne d'une date visée qui porte une fonction ou une note n'est jamais
   écrasée. « ＋ Séance » (Complet) : une date du même
   spectacle au même lieu qui touche ce jour (le même ou un voisin) la reçoit, sinon une date se crée ; le tableur dit ce
   qu'il a fait. En Simple, c'est « ＋ Date », qui crée toujours une date neuve. Exporter : Excel (.xlsx écrit ici, sans bibliothèque), CSV, Google Sheets (le tableau copié, à coller
   dans sheets.new). « Importer » : des lignes copiées d'Excel deviennent des séances, après un aperçu.
   Au clavier : flèches, Entrée ou F2 (ou taper directement) pour écrire, Échap, Tab, Maj+flèches pour choisir des
   cases, Ctrl+C / Ctrl+V comme dans un tableur, Suppr pour vider, Ctrl+Z pour annuler, Ctrl+Suppr pour supprimer la
   séance (en Simple, la date et ses séances ; à la souris : le bouton « Supprimer la séance du … », qui dit laquelle).
   Ce que le tableur lit et écrit : les dates, leurs séances, leur suivi (organisateur, contact, contrat, notes), leurs
   chiffres (jauge, spectateurs, heures d'ateliers : quand la base a le dixième script), leur équipe, et, depuis l'audit
   de la chaîne commerciale, le montant de cession HT (colonne « Cession HT (€) », niveau « date », présente quand la base
   a le script de la compagnie idéale : E.ideale). Il le lit dans le suivi de la date (E.suivis, montant_cession) et le
   remet à ecrireDate dans F.suivi.montant_cession ; c'est ecrireDate, dans le script principal, qui l'écrit : dans le
   suivi du même appel quand la base a le vingt-quatrième script, sinon par un upsert de crescite_dates_suivi, après le
   RPC (le même chemin que le champ « Montant de cession HT » de la fiche d'une date). À l'import, une colonne « cession », « montant » ou « prix » le reprend de la même façon. Rien d'autre.

   La hauteur du cadre est la place qui reste sous lui (placerCadre : jamais sous 300 px), ou celle qu'on lui a donnée avec la
   poignée du bas (fenetres.tableur-h) ; il suit le menu latéral qui se replie. Le coin des fenêtres posées sur une case (le
   lieu, la distribution : fenetres.tab-pop-lieu, fenetres.tab-pop-distribution) et la taille de la zone de texte des notes
   (fenetres.tab-ed-notes) se retiennent aussi (la fenêtre de la distribution fait 520 px d'origine, et défile en dedans).

   Après quoi il se charge : ce module est un script classique, chargé après tableau.js et avant menus.js (admin/index.html),
   donc après le script principal et après agenda.js, gestes.js, feuille.js, equipe.js et planning.js. Il ne lit rien de ce
   qui se déclare plus bas (menus.js et la suite : tiroir.js, tournee.js, fenetres.js…) : FENETRES, chargé après lui, est lu à
   l'usage (typeof) et ses bornes se déclarent à la première vue. Au chargement, il n'évalue que son état T, ses constantes,
   COLONNES (tirée de SCHEMA_DATE, un const du script principal : déjà là), le CSS des largeurs de ses colonnes (une feuille
   de style, styles-tableur-colonnes), la normalisation de tableur.colonnes et les raccourcis Alt+← Alt+→ du registre ;
   natif() n'est que déclarée. Le banc site/tableur.mjs le garde (en Complet), site/tableur-colonnes.mjs les colonnes à la carte, site/tableur-simple.mjs le Simple.

   Son API (la globale TABLEUR) :
     TABLEUR.vue(f)           la vue #/representations/tableur (lue par le routage du script principal) ; f : les filtres
                              communs, session.dates (f.mode : le mode, 'simple', 'complet' ou 'distribution', que la vue y reporte). Si f.cible porte l'identifiant d'une date (« Voir dans le tableur »),
                              la vue arrive sur sa ligne : case active, en vue, cerclée un instant (visee sur chaque case) ;
                              la cible est oubliée aussitôt. Le tri vit dans session.vues.tableur, les colonnes dans la préférence.
     TABLEUR.lireJour(t, ref) un jour tapé ou collé (« 5/11 », « 05-11-2026 », « 2026/11/05 », « 5 nov 26 », « jeu. 5 nov. 2026 ») →
                              'AAAA-MM-JJ', ou undefined (un intervalle, « du 5 au 7 nov », n'est pas un jour)
     TABLEUR.lireHeure(t)     une heure tapée (« 20h30 », « 20 h », « 20:30:00 », « 2030 ») → 'HH:MM', '' si vide, ou undefined
     TABLEUR.lireTsv(texte)   un texte de tableur (tabulations, guillemets d'Excel) → des lignes de cases
     TABLEUR.xlsx({ entetes, lignes })   un classeur .xlsx (un Blob), écrit ici sans bibliothèque
     TABLEUR.tableau({ confidentiel })   le tableau exporté : { entetes, figees, exclues, lignes } ; sans confidentiel (faux d'office), les colonnes de la
                              diffusion n'en font pas partie (exclues les nomme) ; jamais l'icône « fiche »
     TABLEUR.exporter(genre, { confidentiel })   'xlsx', 'csv' ou 'sheets' (la case du menu Exporter donne confidentiel)
     TABLEUR.lireImport(texte)           les lignes collées → { lignes (chacune avec son aperçu, ses erreurs et ce qu'elle a lu : lus), cles, avecTete,
                              supposees, laissees, avertir } ; tous les en-têtes du schéma (`entetes`) sont reconnus
     TABLEUR.lecteurs         { choix, spectacle, lieu, personnes } : ce qui lit un texte tapé (un choix par son libellé, un
                              spectacle, un lieu, des personnes), pour le schéma de la date (SCHEMA_DATE, script principal)
     TABLEUR.colonnes         les colonnes à la carte, que menus.js appelle (le menu d'un en-tête) et que les raccourcis atteignent :
                              masquer(k), montrer(k), figer(k) (« jusqu'ici » : de la première à celle-là ; de nouveau, plus aucune),
                              ajuster(k) (au contenu, et garde la largeur ; sans effet au doigt et au téléphone), deplacer(k, ±1) (-1 : avancer, 1 : reculer), origine()
                              (oublie tableur.colonnes ; rend ce qu'elle retenait), retablir(avant) (le remet : « Annuler », et celui de
                              « Disposition d'origine », fenetres.js), ouvrirChoix() (la fenêtre « Colonnes… »),
                              actions(k) (les actions du menu d'un en-tête, pour GESTES.menu), jeu(k) (le menu « Jeu » : une clé de JEUX, ou '')
     TABLEUR.jeux             [{ k, l }] : Site, Tournée, Suivi, Bilan, Diffusion, Tout
     TABLEUR.clesFenetres     les clés fenetres.* que le tableur règle (tableur-h, tab-pop-lieu, tab-pop-distribution,
                              tab-ed-notes) : de quoi « Disposition d'origine » (FENETRES) les oublie avec les siennes
   (lireTsv, xlsx et lireImport ne sont lues par aucun autre module : les bancs les atteignent ; lireJour et lireHeure, le
   schéma de la date les lit aussi.)

   Ce qu'il lit du script principal (admin/index.html), relevé par grep croisé avec les déclarations :
     E, $, $$, esc, clone, norm, AUJ, JS, MC, h5, jourCourt, jourSansAn, lieu, spectacle, lieuTexte, repsDe, couleurSp (l'état et
     les petits outils) ; session (session.dates, les filtres communs aux trois vues ; session.vues.tableur par etatVue : le tri),
     SCHEMA_DATE (les colonnes), garderFiltres, dateRetenue, dansPeriode, filtresActifs, filtresDates, brancherFiltresDates,
     choixVueDates (les filtres et le sélecteur de vues) ; annoncer, erreur, cadre, partirSansPerdre ; cleRch, motsRch
     (la recherche) ; choixSpectacles, comboLieu (les champs de la fiche) ;
     nouvelleDate, dateVersForm, chiffresVersForm, nombreFr, CHIFFRES, NATURES_DATE, PUBLIABLE, manqueDate (le formulaire
     d'une date) ; ecrireDate, effacerDate (l'écriture, par le chemin de la fiche) ;
     AGENDA.heureTexte, AGENDA.MOIS (admin/agenda.js).
   D'admin/equipe.js : personne, nomDe, distributionDe, fonctionDistribution, equipeDate, equipeDeLaDate, ecartsDate, equipeVoulue,
     enregistrerEquipeDate, reglerPeriode, listeEt. D'admin/distribution.js (DISTRIBUTION, chargé avant lui) : cellule, fenetre, colonnes,
     prevenus, phrase, dit. D'admin/tiroir.js (sous typeof) : TIROIR (peut, ouvrir : viser, depuis, apres) ; du script principal : confirmerAction.
   D'admin/prefs.js : PREFS (lire, ecrire, normaliser, surChangement : tableur.mode, tableur.colonnes, menu.replie, fenetres.tableur-h) ; d'admin/icones.js :
     ICONES.svg ; du registre des raccourcis (script principal) : RACCOURCIS.declarer.
   Sous typeof (le module marche sans eux) : GESTES (gestes.js : garder et saisie, pour la fenêtre d'import), FENETRES
     (fenetres.js, chargé après lui : poignee, taille, garder, borner, actif ; sans lui, ni poignées ni tailles retenues).
   Il ne lit ni sb ni CALME_ADMIN : il n'écrit rien lui-même dans la base, tout passe par ecrireDate et
   enregistrerEquipeDate. Le CSS du tableur (.tableur, .tableur.simple, .tab-jj, .tab-heure…) et l'animation tab-ok restent dans
   admin/index.html. */
const TABLEUR = (() => {
  // ==================== l'état de la vue et les petits outils
  // mode : 'simple' (une ligne par date) ou 'complet' (une ligne par séance), voir MODES ; brouillon : ce que la ligne vide du bas a déjà reçu
  // (le jour, le spectacle, le lieu : la date se crée quand le jour et le spectacle y sont) ; neuve : cette ligne, pour la grille (Simple
  // seulement, hors de T.lignes : une ligne qui n'est pas encore une date) ; aRafraichir : ce que le temps réel a changé pendant une saisie
  // ou un geste (vrai : tout ; un ensemble d'identifiants de date : ces lignes seulement) ; erreurs : les cases que la base a refusées (cleCase → le
  // message ; refus : ce qu'on y avait écrit) et echec : les changements refusés, que « Reprendre » et « Réessayer » prennent ; ignorees : les cases
  // d'un collage que le tableur n'a pas comprises (cleCase → { brut, raison, t }), surlignées vingt secondes ; hBarre : la hauteur de la barre d'état ;
  // htmls : le HTML de chaque ligne, rendues : combien sont dans le DOM, suite : la minuterie de la tranche suivante (le dessin par tranches)
  const T = { f: null, v: null, mode: 'simple', cols: [], figees: new Set(), tournant: null, geste: false, nettoyer: [], lignes: [], actif: { l: 0, c: 0 }, ancre: null, edition: null, pop: null, pile: [],
    file: Promise.resolve(), recents: new Map(), textes: null, aRafraichir: false, attente: 0, brouillon: { jour: '', spectacle: null, lieu: null }, neuve: null, htmls: null, sigLignes: '',
    erreurs: new Map(), refus: new Map(), echec: null, ignorees: new Map(), hBarre: 0, suite: null, rendues: 0 };
  const natif = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const PUBLICS = [['tout_public', 'Tout public'], ['scolaire', 'Scolaire'], ['autre', 'Autre']];
  const STATUTS = [['option', 'Option'], ['confirmee', 'Confirmée'], ['annulee', 'Annulée'], ['reportee', 'Reportée']];
  const CONTRATS = [['à envoyer', 'À envoyer'], ['envoyé', 'Envoyé'], ['signé', 'Signé']];
  const libelleDe = (xs, v) => (xs.find(x => x[0] === v) || [null, ''])[1];
  const suiviDe = d => E.suivis.find(x => x.date_id === d.id) || {};
  const nature = d => d.nature || 'representations';
  const pl = (n, un, des) => `${n} ${n > 1 ? des || `${un}s` : un}`;
  const iso = (a, m, j) => { const x = new Date(Date.UTC(a, m - 1, j)); return x.getUTCFullYear() === a && x.getUTCMonth() === m - 1 && x.getUTCDate() === j ? `${a}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}` : undefined; };
  const jjmmaaaa = j => (j ? `${j.slice(8, 10)}/${j.slice(5, 7)}/${j.slice(0, 4)}` : '');
  const jourPlus = (j, n) => new Date(Date.parse(`${j}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
  const joursEntre = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 864e5);

  // ==================== la lecture de ce qu'on tape ou colle (un jour, une heure, un choix, un spectacle, un lieu, des personnes)
  // ———— lire ce qu'on tape ou colle
  // un jour : « 5/11/2026 », « 05/11 », « 05-11-2026 », « 2026-11-05 », « 2026/11/05 », « jeu. 5 nov. 2026 », « 5 nov 26 », « 5 novembre » ;
  // sans année, celle qui le met au plus près du jour de référence (celui de la ligne, sinon aujourd'hui). Un intervalle (« du 5 au 7 nov »)
  // n'est pas un jour : il n'est pas lu (undefined), la saisie le refuse en le disant
  const MOIS_LUS = [['janv', 1], ['jan', 1], ['fev', 2], ['mars', 3], ['mar', 3], ['avr', 4], ['mai', 5], ['juin', 6], ['juil', 7], ['aou', 8], ['sep', 9], ['oct', 10], ['nov', 11], ['dec', 12]];
  const moisDe = w => (MOIS_LUS.find(([p]) => w.startsWith(p)) || [null, 0])[1];
  function proche(m, j, ref) {
    const r = ref || AUJ, a0 = +r.slice(0, 4), t = Date.parse(`${r}T12:00:00Z`);
    return [a0 - 1, a0, a0 + 1].map(a => iso(a, m, j)).filter(Boolean)
      .sort((x, y) => Math.abs(Date.parse(`${x}T12:00:00Z`) - t) - Math.abs(Date.parse(`${y}T12:00:00Z`) - t))[0];
  }
  function lireJour(t, ref) {
    const s = norm(String(t ?? '')).trim().replace(/^(lun|mar|mer|jeu|ven|sam|dim)[a-z]*\.?,?\s+(?=\d)/, '');
    let m;
    if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) return iso(+m[1], +m[2], +m[3]);   // (aaaa-mm-jj, aaaa/mm/jj)
    if ((m = s.match(/^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2}|\d{4}))?$/)) || (m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/))) return m[3] ? iso(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]) : proche(+m[2], +m[1], ref);   // (jj-mm-aaaa : le tiret veut l'année, « 5-7 » ne dit pas le 5 juillet)
    if ((m = s.match(/^(\d{1,2})(?:er)?\s+([a-z]+)\.?(?:\s+(\d{2}|\d{4}))?$/))) { const mo = moisDe(m[2]); return !mo ? undefined : m[3] ? iso(m[3].length === 2 ? 2000 + +m[3] : +m[3], mo, +m[1]) : proche(mo, +m[1], ref); }
    if ((m = s.match(/^(\d{5})$/)) && +m[1] > 30000 && +m[1] < 80000) return new Date(Date.UTC(1899, 11, 30) + +m[1] * 864e5).toISOString().slice(0, 10);   // un jour d'Excel
    return undefined;
  }
  // une heure : « 20h », « 20 h », « 20h30 », « 20:30 », « 20:30:00 » (les secondes sont ignorées), « 2030 » ; vide : pas d'heure
  function lireHeure(t) {
    const s = String(t ?? '').trim().toLowerCase().replace(/\s+/g, '');
    if (!s) return '';
    const m = s.match(/^(\d{1,2})(?:[h:.](\d{2})?)?$/) || s.match(/^(\d{1,2})(\d{2})$/) || s.match(/^(\d{1,2}):(\d{2}):([0-5]\d)$/);
    if (!m) return undefined;
    const h = +m[1], mi = +(m[2] || 0);
    return h < 24 && mi < 60 ? `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` : undefined;
  }
  const heureT = h => (h ? AGENDA.heureTexte(h5(h)) : '');
  // un choix par sa valeur ou son libellé (« Scolaire », « scolaire », « confirmée »)
  const lireChoix = xs => t => { const n = norm(t).trim(); if (!n) return undefined; const x = xs.find(([v, l]) => norm(v) === n || norm(l) === n || norm(l).startsWith(n)); return x ? x[0] : undefined; };
  function trouverSpectacle(t) {
    const n = norm(t).trim(); if (!n) return undefined;
    const court = s => norm(s.titre.split(' – ')[0]);
    const s = E.spectacles.find(x => norm(x.titre) === n || court(x) === n || x.slug === n) || E.spectacles.find(x => norm(x.titre).startsWith(n) || n.startsWith(court(x)));
    return s ? s.id : undefined;
  }
  function trouverLieu(t, commune = '') {
    const n = norm(t).trim(), c = norm(commune).trim();
    if (!n) return null;
    const xs = E.lieux.filter(l => norm(lieuTexte(l)) === n || norm(l.nom) === n || norm(`${l.nom}, ${l.commune}`) === n || norm(`${l.nom} ${l.commune}`) === n || (!l.nom && norm(l.commune) === n));
    const ys = c ? xs.filter(l => norm(l.commune) === c) : xs;
    if (ys.length === 1) return ys[0].id;
    if (xs.length === 1) return xs[0].id;
    const zs = E.lieux.filter(l => norm(l.commune) === n);
    return zs.length === 1 ? zs[0].id : undefined;
  }
  function lirePersonnes(t) {
    const morceaux = String(t ?? '').split(/[,;/\n]|\s+et\s+/).map(x => x.trim()).filter(Boolean), ids = [];
    for (const m of morceaux) {
      const n = norm(m);
      const xs = E.personnes.filter(p => norm(nomDe(p)) === n), ys = xs.length ? xs : E.personnes.filter(p => norm(p.prenom) === n || norm(p.nom) === n);
      if (ys.length !== 1) return undefined;
      ids.push(ys[0].id);
    }
    return [...new Set(ids)];
  }

  // ———— l'équipe d'une date : l'équipe effective (la distribution « en tournée », moins qui ne part pas, plus les renforts)
  const equipeIds = d => (E.equipeInstallee ? equipeDeLaDate(d).map(x => x.personne_id) : []);
  const tourneeIds = spId => equipeDate(spId, []).map(x => x.personne_id);
  // les écarts qui donnent cette équipe-là (une liste d'identifiants) : rien d'explicite pour qui part par défaut
  // fonctions : { personne_id: fonction sur la date } pour qui n'a pas encore d'écart sur celle-ci (un renfort recomposé, une distribution étendue
  // à d'autres dates, une séance détachée dans sa propre date : sans elle, « remplace Lauren » se perdrait) ; notes : de même, la note de chacune
  function ecartsPour(d, ids, spId = d.spectacle_id, { fonctions = {}, notes = {} } = {}) {
    const voulus = new Set(ids), actuels = ecartsDate(d.id), base = tourneeIds(spId), out = [];
    base.forEach(p => { if (!voulus.has(p)) out.push({ personne_id: p, present: false, fonction: '', note: null }); else { const e = actuels.find(x => x.personne_id === p && x.present); if (e) out.push(e); else if (fonctions[p] || notes[p]) out.push({ personne_id: p, present: true, fonction: fonctions[p] || '', note: notes[p] || null }); } });
    voulus.forEach(p => { if (!base.includes(p)) out.push(actuels.find(x => x.personne_id === p && x.present) || { personne_id: p, present: true, fonction: fonctions[p] || '', note: notes[p] || null }); });
    return out;
  }
  const prenoms = ids => { const ps = ids.map(personne).filter(Boolean); return ps.map(p => (ps.filter(q => norm(q.prenom) === norm(p.prenom)).length > 1 && p.nom ? `${p.prenom || ''} ${p.nom[0]}.` : p.prenom || nomDe(p)).trim()); };

  // ==================== les colonnes
  // ———— les colonnes : tirées du schéma de la date (SCHEMA_DATE, script principal)
  // Un champ du schéma qui porte `colonne` { toujours, rang, largeur, icone } est une colonne du tableur ; colonneDe en fait le
  // contrat que la grille lit. niveau : 'seance' (la ligne), 'date' (toutes les séances de la date : le niveau de la date, du
  // suivi, de la diffusion ou des chiffres du schéma), 'lieu' (lu dans la fiche du lieu). type : celui du schéma, sauf un
  // 'nombre', qui est un texte à nombre:true. l : l'en-tête (le `court` du schéma, sinon son libellé). val (pour écrire,
  // annuler, comparer), texte (ce qui s'affiche et se copie), html, copie, exp (la valeur exportée), lire (un texte tapé ou
  // collé → une valeur ; undefined : pas reconnu), ecrire (la valeur dans le formulaire de la date, dateVersForm), vider,
  // fige, choix, si : tels que le schéma les donne (fige : x => 'la raison' | '', l'infobulle de la case grise). largeur : la largeur d'origine, en
  // pixels, la seule source du CSS (styleColonnes) et de la préférence tableur.colonnes ; icone : un nom de la bibliothèque ICONES ; rang : sa
  // place d'origine ; horsOrigine : hors de la disposition d'origine (elle vient avec un jeu, ou par « Colonnes… ») ; jeux : les jeux où elle
  // entre ; confidentiel : une colonne de la diffusion (confidentielle, du jeu « diffusion » : le montant de cession, l'étape de la piste) — un
  // cadenas à l'en-tête, et jamais dans l'export sans la case « Inclure la diffusion (confidentiel) » ; entetes : l'en-tête qu'elle reconnaît à
  // l'import ; viser : où mène Ctrl+Entrée dans la fiche (SCHEMA_DATE.selecteur) ; pourquoi : pourquoi une lecture ne s'écrit pas ; lien : l'adresse
  // où une lecture mène (Entrée) ; erreurLire : pourquoi lire a refusé ce qu'on a tapé.
  const NIVEAUX_TABLEUR = { seance: 'seance', lieu: 'lieu' };
  function colonneDe(champ) {
    const co = champ.colonne || {}, nombre = champ.type === 'nombre';
    return { k: champ.k, l: champ.court || champ.l, niveau: NIVEAUX_TABLEUR[champ.niveau] || 'date', type: nombre ? 'texte' : champ.type, nombre, toujours: !!co.toujours,
      largeur: co.largeur || 120, icone: co.icone || null, rang: co.rang ?? 1e3, si: champ.si, choix: champ.choix, fige: champ.fige,
      horsOrigine: !!co.horsOrigine, jeux: champ.jeux || [], confidentiel: !!champ.confidentiel && (champ.jeux || []).includes('diffusion'), entetes: champ.entetes, pourquoi: champ.pourquoi, lien: champ.lien, erreurLire: champ.erreurLire,
      val: champ.val, texte: champ.texte, html: champ.html, copie: champ.copie || champ.texte, exp: champ.exp, lire: champ.lire, vider: champ.vider, ecrire: champ.ecrire,
      viser: x => SCHEMA_DATE.selecteur(champ.k, x) };
  }
  // la dernière colonne de chaque ligne du Complet : l'icône « fiche » (type 'action'), qui ouvre la date dans le tiroir : sa case porte la classe
  // .tab-fiche, aria-keyshortcuts et une infobulle (htmlLigne). Ni écrite, ni copiée, ni exportée, ni masquée, ni déplacée (« Colonnes… » ne la
  // liste pas) ; cachée au téléphone (le CSS).
  const FICHE = { k: 'fiche', l: 'Fiche', niveau: 'date', type: 'action', nombre: false, toujours: true, largeur: 52, icone: 'fiche', rang: 9000, horsOrigine: false, jeux: [], confidentiel: false,
    val: () => '', texte: () => '', copie: () => '', html: x => (x.neuve ? '' : `Ouvrir la date du ${esc(jourCourt(x.d.debut))} (${esc(spectacle(x.d.spectacle_id)?.titre || '')}) dans le tiroir`) };   // (la case elle-même est le bouton, sans nœud de plus : une saison entière pose six cents lignes ; le libellé est le texte de la case, caché par le CSS comme un .sr, l'icône est dessinée par le CSS)
  const COLONNES = [...SCHEMA_DATE.filter(c => c.colonne).map(colonneDe).sort((a, b) => a.rang - b.rang), FICHE];
  // les jeux de colonnes (le menu « Jeu » de la tête, en Complet) : tirés du schéma (le `jeux` de chaque champ). Un jeu montre toutes ses colonnes,
  // vides comprises, et masque les autres ; « Tout » les montre toutes. Les colonnes qui sont toujours là (le jour, le spectacle) sont de chaque jeu.
  const JEUX = [['site', 'Site'], ['tournee', 'Tournée'], ['suivi', 'Suivi'], ['bilan', 'Bilan'], ['diffusion', 'Diffusion'], ['tout', 'Tout']].map(([k, l]) => ({ k, l }));
  const colsDuJeu = k => new Set(COLONNES.filter(c => c.type !== 'action' && (!c.si || c.si()) && (k === 'tout' || c.toujours || c.jeux.includes(k))).map(c => c.k));
  const reglables = COLONNES.filter(c => c.type !== 'action').map(c => c.k);

  // ———— les colonnes du mode Simple (une ligne par date) : les six de MODES.simple.colonnes. Quatre ne sont pas celles du schéma tel
  // quel : le jour (de niveau « date » : il décale la date, ses séances le suivent), les séances (en pastilles d'heures ; une fenêtre
  // pour les régler), le lieu (sur deux lignes) et le statut (en badge). Les deux autres, le spectacle et la distribution, sont celles
  // du schéma. Une ligne du Simple est { d, r: null, rs (les séances de la date), n: 1, premier: true, bande, cle } : jamais de x.r,
  // donc jamais repDe, qui ajouterait une séance au lieu de déplacer la date.
  const LARGEURS_SIMPLE = { jour: 122, seances: 168, spectacle: 190, lieu: 210, statut: 140, distribution: 250 };
  const pubDe = d => (d.public && d.public !== 'mixte' ? d.public : 'tout_public');
  // une séance telle que la fenêtre et la colonne la portent (les mêmes clés, dans le même ordre que dateVersForm : on les compare en JSON)
  const repSimple = r => ({ id: r.id, jour: r.jour, heure: h5(r.heure), fin: h5(r.fin), public: r.public, annulee: !!r.annulee, lien: r.lien || '', note: r.note || '' });
  const trierReps = rs => rs.sort((a, b) => (a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : String(a.heure || '99').localeCompare(String(b.heure || '99'))));
  // « 15h · 20h30 », « 15h, 20h30 » (un collage) : chaque heure lue prend la séance de la date qui l'a déjà (même heure : son numéro, son
  // public, sa fin, sa note, son annulation sont gardés : le RPC retire toute séance absente de la liste), sinon une séance sans heure,
  // sinon une séance neuve au jour de la date ; celles qui ne sont plus citées sont retirées. Une heure illisible : undefined.
  function lireSeances(t, x) {
    const s = String(t ?? '').trim();
    if (!s) return undefined;
    const heures = s.split(/\s*(?:·|,|;|\/|\bet\b|\n)\s*/i).filter(p => p.trim() !== '').map(p => lireHeure(p));
    if (!heures.length || heures.some(h => !h)) return undefined;
    const libres = [...x.rs], prendre = pred => { const i = libres.findIndex(pred); return i >= 0 ? libres.splice(i, 1)[0] : null; };
    const prises = heures.map(h => prendre(r => h5(r.heure) === h));
    heures.forEach((h, i) => { if (!prises[i]) prises[i] = prendre(r => !r.heure); });
    return trierReps(heures.map((h, i) => ({ ...repSimple(prises[i] || { jour: x.d.debut, public: pubDe(x.d) }), heure: h })));
  }
  const pastilleHeure = r => `<span class="tab-heure${r.annulee ? ' annulee' : ''}${r.public === 'scolaire' ? ' sco' : ''}"${r.annulee ? ' title="Séance annulée"' : ''}>${esc(heureT(r.heure))}</span>`;
  const SEANCES = { k: 'seances', l: 'Séances', niveau: 'date', type: 'seances', nombre: false, toujours: true, largeur: LARGEURS_SIMPLE.seances, icone: 'horloge', rang: 25, instantane: true,
    val: x => x.rs.map(repSimple), texte: x => x.rs.map(r => heureT(r.heure)).filter(Boolean).join(' · '),
    html: x => `<span class="tab-heures">${x.rs.filter(r => r.heure).map(pastilleHeure).join('')}<span class="tab-heure-plus" aria-hidden="true">+</span></span>`,
    lire: lireSeances, ecrire: (F, x, v) => { F.representations = v.map(r => ({ ...r })); } };
  SEANCES.copie = SEANCES.texte;
  // le petit calendrier du jour : « JEU / 5 / NOV » (une période : « → 7 » dessous ; une précision au mois : « NOV / 2026 »), le
  // bandeau de la couleur du spectacle (--c, posée sur la ligne) ; le tout est aria-hidden, le jour entier est dit en .sr à côté
  function tuileJour(d) {
    if (!d.debut) return '';
    const [a, m, j] = d.debut.split('-').map(Number), mois = MC[m - 1].replace('.', ''), long = colonne('jour').texte({ d, r: null });
    const tuile = d.precision === 'mois' ? `<i></i><b class="mois">${esc(mois)}</b><i>${a}</i>`
      : `<i>${JS[new Date(`${d.debut}T12:00:00`).getDay()].replace('.', '')}</i><b>${j}</b><i>${d.fin && d.fin !== d.debut ? `→ ${+d.fin.slice(8, 10)}` : esc(mois)}</i>`;
    return `<span class="tab-jj" aria-hidden="true">${tuile}</span><span class="sr">${esc(long)}</span>`;
  }
  const statutBadge = d => (d.statut ? `<span class="badge ${d.statut}">${esc(libelleDe(STATUTS, d.statut))}</span>` : '');
  const SIMPLES = {};
  const colonne = k => COLONNES.find(c => c.k === k) || (k === 'seances' ? SEANCES : undefined) || (modeMatrice() ? T.cols.find(c => c.k === k) : undefined);   // (la matrice : une colonne par personne, qui n'est pas du schéma)
  Object.assign(SIMPLES, {
    // décaler le jour d'une date : elle garde sa longueur (sa fin suit), chaque séance suit (le même nombre de jours) ; une date qui n'était
    // qu'un mois devient le jour qu'on écrit
    jour: { ...colonne('jour'), niveau: 'date', instantane: true, val: x => x.d.debut, html: x => tuileJour(x.d),
      ecrire: (F, x, v) => {
        const delta = joursEntre(F.debut, v);
        F.representations.forEach(r => { if (r.jour) r.jour = jourPlus(r.jour, delta); });
        if (!F.representations.length && F.precision && F.precision !== 'jour') { F.precision = 'jour'; F.fin = v; } else F.fin = F.fin ? jourPlus(F.fin, delta) : v;
        F.debut = v;
      } },
    seances: SEANCES,
    lieu: { ...colonne('lieu'), html: x => {
      const l = lieu(x.d.lieu_id), ailleurs = !l && (x.d.intitule || '').split(' — ')[1];
      return l ? `<span class="tab-lieu2"><b>${esc(l.nom || l.commune)}</b>${l.nom ? `<small>${esc(l.commune)}</small>` : ''}</span>` : ailleurs ? `<span class="tab-gris" title="Lieu repris de l’ancien site, sans fiche">${esc(ailleurs)}</span>` : '';
    } },
    statut: { ...colonne('statut'), html: x => `${statutBadge(x.d)}${nature(x.d) === 'representations' && x.d.visible === false ? '<span class="badge masquee">masquée</span>' : ''}` },
  });
  // la colonne Distribution montre la cellule de DISTRIBUTION (des pastilles rondes aux initiales, jamais de photo, rangées par métier) ; elle y
  // tient autant de pastilles que la colonne en laisse, le remplissage des cases (9 px de chaque côté) retranché : largeurDist se pose au
  // dessin (la largeur retenue pour la colonne, sinon celle d'origine), et « +n » compte le reste
  const cDistribution = COLONNES.find(c => c.k === 'distribution');
  if (cDistribution) cDistribution.html = x => DISTRIBUTION.cellule(x.d, { largeur: (T.largeurDist || 250) - 18 });
  const colonnesSimple = () => MODES.simple.colonnes.map(k => SIMPLES[k] || colonne(k)).filter(c => c && (!c.si || c.si()));
  // ———— les colonnes du mode Distribution : le jour (figé), le spectacle (figé aussi, quand la grille en montre plusieurs : chaque spectacle y
  // forme un groupe de lignes, le premier marqué debutGroupe), le lieu, puis une colonne par personne (DISTRIBUTION.colonnes : la tournée du
  // spectacle, les renforts rencontrés sur ces dates, par métier). Ce sont les mêmes objets d'un dessin à l'autre tant que rien ne change
  // (dessinerLignes les compare). hoteMatrice : ce que DISTRIBUTION demande au tableur (redessiner, le menu « Régler sa période »)
  const hoteMatrice = {
    redessiner: () => { if (modeMatrice() && $('#tab-cadre')) dessiner({ garder: true }); },
    reglerPeriode: (spId, pid) => {
      const s = spectacle(spId); if (!s) return;
      const declencheur = $(`#tab-tete th[data-k="p${pid}"] .mat-menu`) || document.activeElement;
      reglerPeriode(s, pid, { declencheur, apres: () => { if ($('#tab-cadre')) dessiner({ garder: true }); } });
    },
  };
  let tetesMatrice = null;
  function colonnesMatrice(xs = T.lignes) {
    tetesMatrice = tetesMatrice || { jour: { ...SIMPLES.jour, tete: true }, spectacle: { ...colonne('spectacle'), tete: true, classe: 'mat-spectacle' }, lieu: SIMPLES.lieu };
    const f = T.f || {}, plusieurs = !f.spectacle && new Set((xs || []).map(x => x.d.spectacle_id)).size > 1;
    return [tetesMatrice.jour, ...(plusieurs ? [tetesMatrice.spectacle] : []), tetesMatrice.lieu, ...(E.equipeInstallee ? DISTRIBUTION.colonnes(f, xs, hoteMatrice) : [])];
  }
  const TOUTES = [...COLONNES, SEANCES];
  // le CSS des largeurs, écrit une fois d'après les colonnes : leur largeur d'origine (--w-<k>, sur :where(.tab-cadre), qui ne pèse
  // rien : les media queries du téléphone, dans index.html, gardent la main sur Jour et Spectacle), celle du Simple (sur
  // .tab-cadre.tab-simple, qui ne pèse rien non plus), puis par colonne la largeur lue dans la variable (une préférence ou le geste
  // la posent en ligne sur #tab-cadre) et, pour une colonne figée, son bord gauche (--l-<k>, posé par dessiner)
  (() => {
    const st = document.createElement('style');
    st.id = 'styles-tableur-colonnes';
    st.textContent = `:where(.tab-cadre) { ${TOUTES.map(c => `--w-${c.k}: ${c.largeur}px;`).join(' ')} }\n`
      + `:where(.tab-cadre.tab-simple) { ${Object.entries(LARGEURS_SIMPLE).map(([k, w]) => `--w-${k}: ${w}px;`).join(' ')} }\n`
      + TOUTES.map(c => `.tableur .c-${c.k} { width: var(--w-${c.k}); min-width: var(--w-${c.k}); max-width: var(--w-${c.k}); }\n.tableur .figee.c-${c.k} { left: var(--l-${c.k}); }`).join('\n');
    document.head.append(st);
  })();

  // ———— la mémoire des colonnes : la préférence tableur.colonnes
  // Par mode (le Simple a six colonnes fixes, le jour figé : seules ses largeurs se retiennent) :
  //   { complet: { ordre: [k…], masquees: [k…], figees: n, largeurs: { k: px }, vides: bool, jeu: k | null, montrees: [k…] }, simple: { largeurs } }
  // ordre : l'ordre voulu (vide : celui d'origine) ; masquees : les colonnes cachées par choix ; figees : le nombre de colonnes
  // figées à gauche, comptées dans l'ordre (une colonne vide repliée compte : elle reste à sa place quand « Colonnes vides » la
  // montre) ; largeurs : celles qu'on a tirées ; vides : « Colonnes vides » ; jeu : le jeu de colonnes choisi (une clé de JEUX, sinon
  // null : la disposition d'origine) — le choix d'un jeu écrit aussi masquees ; montrees : les colonnes hors de la disposition d'origine
  // (horsOrigine) qu'on a montrées une à une, sans jeu. normaliserColonnes ramène ce qu'on lit à cette forme
  // (clés inconnues ignorées, colonnes dont si() est faux tolérées, largeurs de 48 à 640 px, l'ancienne forme plate lue comme le
  // mode complet) ; la lecture s'en sert à chaque fois (PREFS.normaliser).
  // Les trois modes : le Simple, une ligne par date (parDate), avec ses six colonnes et le jour seul figé ; le Complet, une ligne par séance ;
  // la Distribution, une ligne par date aussi (parDate) mais une colonne par personne (matrice : DISTRIBUTION.colonnes, colonnesMatrice) — un jeu
  // de colonnes du tableur comme un autre, dont les cases ✓ / ✕ / ⟳ s'écrivent par ecrire(), donc avec la pile d'annulation, la file, les états
  // d'une case et la plage au clavier. La matrice retient ce que retient le Simple (memoire : ses largeurs).
  // Le mode se garde avec le compte (la préférence tableur.mode) et dans l'adresse (?mode=complet, ?mode=distribution, sur le tableur seulement).
  const MODES = { simple: { colonnes: ['jour', 'seances', 'spectacle', 'lieu', 'statut', 'distribution'], parDate: true, figees: 1 }, complet: { parDate: false },
    distribution: { colonnes: () => colonnesMatrice(), parDate: true, matrice: true, memoire: 'simple' } };
  const LARGEUR_MIN = 48, LARGEUR_MAX = 640, FIGEES_ORIGINE = 2;
  const modeSimple = () => !!MODES[T.mode]?.parDate;
  const modeMatrice = () => !!MODES[T.mode]?.matrice;
  const modeValide = m => (typeof m === 'string' && m in MODES ? m : null);
  if (typeof PREFS !== 'undefined') PREFS.normaliser('tableur.mode', modeValide);
  const modePrefere = () => (typeof PREFS !== 'undefined' && modeValide(PREFS.lire('tableur.mode', null))) || 'simple';
  const entierOuNul = v => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
  function normaliserMode(mode, brut) {
    const cles = reglables, b = brut && typeof brut === 'object' && !Array.isArray(brut) ? brut : {}, largeurs = {};
    if (b.largeurs && typeof b.largeurs === 'object') Object.entries(b.largeurs).forEach(([k, v]) => { const n = entierOuNul(v); if (n !== null && (cles.includes(k) || (mode === 'simple' && k === 'seances'))) largeurs[k] = Math.max(LARGEUR_MIN, Math.min(LARGEUR_MAX, n)); });
    if (mode === 'simple') return { largeurs };
    const liste = xs => (Array.isArray(xs) ? [...new Set(xs.filter(k => cles.includes(k)))] : []), f = entierOuNul(b.figees);
    return { ordre: liste(b.ordre), masquees: liste(b.masquees).filter(k => k !== 'jour'), figees: f === null ? FIGEES_ORIGINE : Math.max(0, Math.min(cles.length, f)), largeurs, vides: b.vides === true,
      jeu: JEUX.some(j => j.k === b.jeu) ? b.jeu : null, montrees: liste(b.montrees).filter(k => COLONNES.find(c => c.k === k)?.horsOrigine) };
  }
  function normaliserColonnes(brut) {
    if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return null;
    const plat = !Object.keys(MODES).some(m => m in brut) && ['ordre', 'masquees', 'figees', 'largeurs', 'vides'].some(k => k in brut);
    const source = plat ? { complet: brut } : brut;
    return Object.fromEntries(Object.keys(MODES).filter(m => !MODES[m].memoire).map(m => [m, normaliserMode(m, source[m])]));
  }
  if (typeof PREFS !== 'undefined') PREFS.normaliser('tableur.colonnes', normaliserColonnes);
  const toutesColonnes = () => (typeof PREFS !== 'undefined' && PREFS.lire('tableur.colonnes', null)) || normaliserColonnes({});
  // (le Simple n'a que ses largeurs en mémoire : le reste, d'office, est fixe)
  const REGLAGES_SIMPLE = { ordre: [], masquees: [], vides: false, figees: MODES.simple.figees, jeu: null, montrees: [] };
  const memoire = () => MODES[T.mode].memoire || T.mode;   // (la matrice retient ses largeurs avec celles du Simple)
  const reglages = () => (modeSimple() ? { ...REGLAGES_SIMPLE, ...toutesColonnes().simple } : toutesColonnes()[T.mode]);
  // une modification du mode courant, écrite aussitôt (un clic) ; rend ce qu'il y avait, pour « Annuler »
  function ecrireReglages(modif) {
    const avant = toutesColonnes(), m = memoire();
    if (typeof PREFS !== 'undefined') PREFS.ecrire('tableur.colonnes', { ...avant, [m]: { ...avant[m], ...modif } }, { aussitot: true });
    return avant;
  }
  // l'ordre voulu : celui du compte, puis les colonnes qu'il ne cite pas (une colonne nouvelle), chacune après sa voisine d'origine
  function ordonner(cs, ordre) {
    if (!ordre.length) return cs;
    const par = new Map(cs.map(c => [c.k, c])), out = ordre.map(k => par.get(k)).filter(Boolean);
    cs.forEach((c, i) => { if (out.includes(c)) return; const avant = cs.slice(0, i).reverse().find(x => out.includes(x)); out.splice(avant ? out.indexOf(avant) + 1 : 0, 0, c); });
    return out;
  }

  // ==================== la grille : les lignes, la vue, le dessin, les gestes
  // ———— les lignes : les dates filtrées, puis, en Complet, leurs séances (une date sans séance : une ligne, son jour ou sa période) ; en
  // Simple, une ligne par date { d, r: null, rs (ses séances), n: 1, premier: true, bande, cle } — dessiner lit bande et premier, marquer n,
  // supprimerLignes rs : jamais de x.r (voir les colonnes du Simple)
  function lignes() {
    const f = T.f, mots = motsRch(f.q);
    const texte = d => { const s = spectacle(d.spectacle_id), l = lieu(d.lieu_id), su = suiviDe(d);
      return cleRch(`${s?.titre || ''} ${l ? `${l.nom || ''} ${l.commune} ${l.departement || ''}` : ''} ${d.intitule || ''} ${su.organisateur || ''} ${su.contact || ''} ${su.notes || ''} ${repsDe(d.id).map(r => r.note || '').join(' ')} ${libelleDe(STATUTS, d.statut)} ${libelleDe(NATURES_DATE, nature(d))} ${equipeIds(d).map(id => nomDe(personne(id))).join(' ')}`); };
    const ds = E.dates.filter(d => dateRetenue(d, f) && dansPeriode(d, f.periode) && (!mots.length || (t => mots.every(m => t.includes(m)))(texte(d))))
      .sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : a.id - b.id) * (T.v.tri === 'desc' ? -1 : 1));
    // la matrice sans spectacle filtré : un groupe de lignes par spectacle (dans l'ordre des spectacles, les dates dans l'ordre du tri), le premier
    // de chaque groupe marqué (debutGroupe : un trait plus net et le nom du spectacle en gras)
    const groupes = modeMatrice() && !f.spectacle;
    if (groupes) { const rangSp = id => E.spectacles.findIndex(s => s.id === id); ds.sort((a, b) => rangSp(a.spectacle_id) - rangSp(b.spectacle_id)); }
    if (modeSimple()) return ds.map((d, i) => ({ d, r: null, rs: repsDe(d.id), n: 1, premier: true, bande: i % 2, cle: `${d.id}:d`, ...(groupes && (i === 0 || ds[i - 1].spectacle_id !== d.spectacle_id) ? { debutGroupe: true } : {}) }));
    const out = [];
    ds.forEach((d, n) => {
      const reps = repsDe(d.id);
      (reps.length ? reps : [null]).forEach((r, i) => out.push({ d, r, premier: i === 0, n: reps.length || 1, bande: n % 2, cle: `${d.id}:${r ? r.id : 'd'}` }));
    });
    return out;
  }
  // les colonnes possibles (celles dont la base a le script qu'il faut), dans l'ordre voulu ; puis les montrées : ni masquées, ni vides
  // sur toute la vue (sauf « Colonnes vides », et celles qui sont toujours là). Le Simple a les siennes, toujours toutes montrées : on
  // ne teste pas leurs textes (une colonne repliée n'y a pas de sens, et c'était un appel par case)
  // (l'icône « fiche » ferme toujours la ligne : ordonner la laisserait suivre sa voisine d'origine)
  const possibles = (xs = T.lignes) => { if (modeMatrice()) return colonnesMatrice(xs); if (modeSimple()) return colonnesSimple(); const cs = ordonner(COLONNES.filter(c => !c.si || c.si()), reglages().ordre); return [...cs.filter(c => c.type !== 'action'), ...cs.filter(c => c.type === 'action')]; };
  // une colonne hors de la disposition d'origine ne se montre que par un jeu, ou parce qu'on l'a montrée ; masquée par choix, elle ne se montre pas
  const admise = (c, rg) => c.type === 'action' || (!rg.masquees.includes(c.k) && (!c.horsOrigine || !!rg.jeu || rg.montrees.includes(c.k)));
  const colonnes = (xs, ps = possibles(), rg = reglages()) => {
    if (modeSimple()) return ps;
    const jeu = rg.jeu ? colsDuJeu(rg.jeu) : null;
    return ps.filter(c => admise(c, rg) && (c.type === 'action' || rg.vides || c.toujours || (jeu && jeu.has(c.k)) || xs.some(x => c.texte(x) !== '')));
  };
  // les colonnes figées : les n premières des possibles (une colonne vide repliée, ou masquée, garde sa place dans le compte)
  // (la matrice fige ses colonnes de tête : le jour, et le spectacle quand la grille en montre plusieurs)
  const figeesDe = (ps = possibles(), rg = reglages()) => new Set((modeMatrice() ? ps.filter(c => c.tete) : ps.slice(0, rg.figees)).map(c => c.k));

  // ———— la vue
  // ce que le mode change dans la tête et le cadre : le segment, le bouton d'ajout, l'aide, le nom de la grille
  const NOMS_MODES = [['simple', 'Simple', 'liste', 'une ligne par date'], ['complet', 'Complet', 'grille', 'une ligne par séance'], ['distribution', 'Distribution', 'equipe', 'qui part sur chaque date']];
  const libelleAjout = () => (modeSimple() ? '＋ Date' : '＋ Séance');
  const texteAide = () => (modeMatrice()
    ? 'Une ligne par date, une colonne par personne : ✓ elle part, ✕ elle ne part pas, ⟳ remplaçante ou renfort. Un clic, Espace ou Entrée bascule la case ; Flèches pour aller de case en case ; Maj+flèches (ou Maj+clic) pour choisir plusieurs cases ; Suppr rend la case à la distribution ; Ctrl+Z pour annuler ; « Étendre à… » pose l’équipe de la date active sur d’autres dates (les lignes choisies, le même lieu…) ; Ctrl+Entrée ouvre la date dans le tiroir ; le bouton ⋯ d’une colonne règle sa période. Un point corail signale une indisponibilité à venir.'
    : modeSimple()
    ? 'Flèches pour aller de case en case ; Entrée (ou taper) pour écrire, Échap pour renoncer ; la case des séances s’ouvre en fenêtre (ajouter, retirer, changer une heure) ; Maj+flèches pour choisir plusieurs cases ; Ctrl+C, Ctrl+V comme dans un tableur ; Suppr pour vider une case, Ctrl+Suppr pour supprimer la date ; Ctrl+Z pour annuler ; Ctrl+Entrée ouvre la date dans le tiroir. Le jour s’écrit dans un petit calendrier (← → ↑ ↓, Page ↑ Page ↓). La ligne vide du bas reçoit une nouvelle date : le jour, le spectacle, le lieu.'
    : 'Flèches pour aller de case en case ; Entrée (ou taper) pour écrire, Échap pour renoncer ; Maj+flèches pour choisir plusieurs cases ; Ctrl+C, Ctrl+V comme dans un tableur ; Suppr pour vider une case, Ctrl+Suppr pour supprimer la séance ; Ctrl+Z pour annuler ; Ctrl+Entrée (ou l’icône en bout de ligne) ouvre la date dans le tiroir, sur le champ de la case. Une case grisée répète la date : elle vaut pour toutes ses séances ; au survol, une case figée dit pourquoi.');
  const nomGrille = () => `Représentations : ${NOMS_MODES.find(m => m[0] === T.mode)[3]}`;
  const segmentModes = () => `<span class="seg tab-modes" role="group" aria-label="Mode du tableur">${NOMS_MODES.map(([k, l, ic, d]) => `<button type="button" data-mode="${k}" aria-pressed="${k === T.mode}" title="${esc(`${l} : ${d}`)}">${icone(ic)}<span>${l}</span></button>`).join('')}</span>`;
  function vue(f = session.dates) {
    T.f = f; T.v = etatVue('tableur');
    T.mode = modeValide(f.mode) || modePrefere();
    if (f.mode !== T.mode) { f.mode = T.mode; garderFiltres(); }   // (l'adresse dit le mode quand il n'est pas celui d'office : ?mode=complet)
    T.brouillon = { jour: '', spectacle: null, lieu: null }; T.neuve = null; T.aRafraichir = false;
    oublierEtats(); annulerTranches(); T.rendues = 0; T.htmls = null;
    T.nettoyer.splice(0).forEach(fin => fin());   // (les écouteurs de la vue d'avant)
    if (T.v.vides === true) { ecrireReglages({ vides: true }); }   // (un ancien état de la session : « Colonnes vides » vit maintenant dans la préférence)
    delete T.v.vides;
    preparerFenetres();
    const cible = f.cible; delete f.cible;   // « Voir dans le tableur » : la date à viser, une seule fois
    cadre('representations', `<div class="tete"><h1>Représentations</h1>${choixVueDates('tableur')}${segmentModes()}
      <span class="tab-actions"><button type="button" class="btn principal" id="tab-plus" aria-expanded="false" aria-controls="tab-ajout">${libelleAjout()}</button>
      <button type="button" class="btn" id="tab-importer">Importer</button>
      <span class="tab-menu"><button type="button" class="btn" id="tab-exporter" aria-haspopup="true" aria-expanded="false" aria-controls="tab-export">Exporter</button>
        <span class="tab-export" id="tab-export" role="group" aria-label="Exporter" hidden>${E.ideale ? `<label class="case tab-export-conf"${modeSimple() ? ' hidden' : ''} title="Le montant de cession et l’étape de la piste ne sortent du tableur que si vous cochez cette case (elle se décoche à chaque fois)"><input type="checkbox" id="tab-export-conf"> Inclure la diffusion (confidentiel)</label>` : ''}<button type="button" class="btn" data-export="xlsx">Excel (.xlsx)</button><button type="button" class="btn" data-export="sheets">Google Sheets</button><button type="button" class="btn" data-export="csv">CSV</button>
        <span class="aide">Google Sheets : le tableau est copié, une feuille vierge s’ouvre (sheets.new) ; collez-le (Ctrl+V). Ou importez-y le fichier Excel.</span></span></span>
      <label class="tab-jeu"${modeSimple() ? ' hidden' : ''} title="Un jeu de colonnes : toutes celles d’un sujet, vides comprises"><span>Jeu</span><select id="tab-jeu" aria-label="Jeu de colonnes"><option value="">Disposition d’origine</option>${JEUX.map(j => `<option value="${j.k}">${j.l}</option>`).join('')}</select></label>
      <button type="button" class="btn" id="tab-colonnes" aria-haspopup="dialog" aria-expanded="false"${modeSimple() ? ' hidden' : ''}>Colonnes…</button></span></div>
    ${filtresDates(f, { vue: 'tableur', aDroite: `<label class="case tab-vides"${modeSimple() ? ' hidden' : ''}><input type="checkbox" id="tab-vides"${reglages().vides ? ' checked' : ''}> Colonnes vides</label>` })}
    <form class="bloc tab-ajout" id="tab-ajout" hidden></form>
    <div class="tab-zone" id="tab-zone"><div class="tab-cadre${modeSimple() ? ' tab-simple' : ''}${modeMatrice() ? ' tab-matrice' : ''}" id="tab-cadre" style="${variablesColonnes()}"><table class="tableur${modeSimple() ? ' simple' : ''}${modeMatrice() ? ' matrice' : ''}" id="tab" role="grid" aria-multiselectable="true" aria-label="${nomGrille()}" aria-describedby="tab-aide">
      <thead id="tab-tete"></thead><tbody id="tab-corps" data-liste></tbody><tfoot id="tab-pied"></tfoot></table></div></div>
    <p class="tab-ligne-etat"><span class="compte" id="tab-compte"></span><span class="tab-etat" id="tab-etat" aria-live="polite"></span>
      <button type="button" class="btn lien petit tab-etendre" id="tab-etendre" title="Poser l’équipe de la date de la case active sur d’autres dates"${modeMatrice() ? '' : ' hidden'}>Étendre à…</button>
      <button type="button" class="btn lien petit tab-suppr" id="tab-suppr" aria-keyshortcuts="Control+Delete" title="Dans le tableau : Ctrl+Suppr">Supprimer ${modeSimple() ? 'la date' : 'la séance'}…</button></p>
    <p class="aide tab-aide" id="tab-aide">${texteAide()}</p>`);
    const corps = $('#tab-corps');
    // le temps réel : ids, les dates touchées (rafraichirListes) ; null, tout. Pendant une saisie, une fenêtre ouverte ou un bord qu'on
    // tire, la grille attend ; rien que le tableur lise n'a changé (ids vide) : rien à faire
    corps.rafraichir = ids => {
      if (Array.isArray(ids) && !ids.length) return;
      if (T.edition || T.pop || T.geste) { retarder(Array.isArray(ids) ? ids : null); return; }
      if (Array.isArray(ids)) dessinerLignes(ids); else dessiner({ garder: true });
    };
    T.actif = { l: 0, c: 0 }; T.ancre = null; T.textes = null;
    if (cible != null && !lignes().some(x => x.d.id === cible)) montrerAjouts([cible]);   // la ligne visée ne se cache pas derrière un filtre
    dessiner();
    brancher();
    poserMenus(); poserIconeFiche();
    majJeu();
    if (cible != null) viserDate(cible);
  }
  // « Voir dans le tableur » : la ligne de la date devient la case active (elle vient en vue) et se cerne un instant : visee sur
  // chacune de ses cases (un box-shadow sur un <tr> ne se peint pas en border-collapse: separate)
  function viserDate(id) {
    const l = T.lignes.findIndex(x => x.d.id === id);
    if (l < 0) return;
    activer(l, 0);
    const cases = $$(`#tab-corps tr[data-l="${l}"] td`);
    cases.forEach(td => td.classList.add('visee'));
    setTimeout(() => cases.forEach(td => td.classList.remove('visee')), 1800);
  }

  // ———— changer de mode : Simple (une ligne par date) ou Complet (une ligne par séance). Il se garde avec le compte (la préférence
  // tableur.mode) et dans l'adresse (?mode=complet) ; la grille se redessine d'un coup, sans transition (une grille n'entre pas en
  // cascade), et la date de la case active reste la case active
  function appliquerMode() {
    const simple = modeSimple();
    $$('.tab-modes [data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === T.mode)));
    $('#tab').classList.toggle('simple', simple); $('#tab-cadre').classList.toggle('tab-simple', simple);
    $('#tab').classList.toggle('matrice', modeMatrice()); $('#tab-cadre').classList.toggle('tab-matrice', modeMatrice());
    $('#tab-etendre').hidden = !modeMatrice();
    $('#tab').setAttribute('aria-label', nomGrille());
    $('#tab-plus').textContent = libelleAjout();
    $('#tab-colonnes').hidden = simple;
    const jeu = $('#tab-jeu'); if (jeu) jeu.closest('label').hidden = simple;
    const conf = $('#tab-export-conf'); if (conf) conf.closest('label').hidden = simple;
    const vides = $('#tab-vides'); if (vides) { vides.closest('label').hidden = simple; vides.checked = reglages().vides; }
    $('#tab-aide').textContent = texteAide();
    const form = $('#tab-ajout'); if (form && !form.hidden) { form.hidden = true; $('#tab-plus').setAttribute('aria-expanded', 'false'); }
    poserLargeurs();
    const tete = $('#tab-tete'); if (tete) tete.dataset.cles = '';
    majJeu();   // (le menu « Jeu » dit le jeu retenu dès qu'on revient en Complet, il n'est posé qu'à l'ouverture sinon)
  }
  function changerMode(mode) {
    if (!modeValide(mode) || mode === T.mode || !$('#tab-corps')) return;
    if (T.edition) fermerEdition({ valider: true, focus: false });
    fermerPop(false);
    const id = ligne(T.actif.l)?.d.id, k = T.cols[T.actif.c]?.k;
    T.mode = mode; T.f.mode = mode; T.ancre = null; T.aRafraichir = false;
    oublierEtats();
    if (typeof PREFS !== 'undefined') PREFS.ecrire('tableur.mode', mode, { aussitot: true });   // (avant l'adresse : elle compare le mode à la préférence)
    garderFiltres();
    appliquerMode();
    dessiner();
    const l = id == null ? -1 : T.lignes.findIndex(x => x.d.id === id), c = T.cols.findIndex(y => y.k === k);
    T.actif = { l: l >= 0 ? l : 0, c: c >= 0 ? c : 0 };
    marquer(false);
    annoncer(`Mode ${mode === 'simple' ? 'Simple : une ligne par date' : mode === 'distribution' ? 'Distribution : une ligne par date, une colonne par personne' : 'Complet : une ligne par séance'}.`);
  }

  // ———— dessiner (et redessiner : la case active, le défilement et ce qui a changé ailleurs)
  // dessiner() refait toute la grille : au changement de filtre, de mode ou de colonnes. dessinerLignes(ids) ne refait que les lignes des
  // dates dites (le temps réel, une écriture, « Annuler ») : leur <tr> est remplacé, les autres ne sont pas touchées ; quand la liste des
  // lignes ou des colonnes n'est plus la même (une date change de place ou sort du filtre, une séance s'ajoute en Complet, une colonne vide
  // se déplie), elle se replie sur dessiner complet.
  const cleCase = (x, c) => `${x.cle}|${c.k}`;
  const titreCol = c => `${c.titre ? c.titre : c.type === 'action' ? 'Ouvrir la date dans le tiroir' : modeSimple() ? (c.k === 'seances' ? 'Les séances de la date' : c.niveau === 'lieu' ? 'Vient de la fiche du lieu' : 'Propre à la date')
    : c.niveau === 'date' ? 'Vaut pour toutes les séances de la date' : c.niveau === 'lieu' ? 'Vient de la fiche du lieu' : 'Propre à chaque séance'}${c.confidentiel ? ' · confidentiel : jamais exporté sans le demander' : ''}`;
  const texteTri = () => `Jour <span aria-hidden="true">${T.v.tri === 'desc' ? '↓' : '↑'}</span><span class="sr">, trier ${T.v.tri === 'desc' ? 'du plus ancien' : 'du plus récent'} d’abord</span>`;
  const derniereFigee = () => [...T.cols].reverse().find(c => T.figees.has(c.k))?.k;
  // une ligne de plus que les dates, au bas du Simple : la date qu'on y écrit n'existe pas encore (T.brouillon), elle se crée quand son jour et
  // son spectacle y sont ; sa « date » n'a que ce qu'il faut aux colonnes pour se lire
  function ligneNeuve() {
    const b = T.brouillon, sp = b.spectacle ?? (T.f.spectacle ? +T.f.spectacle : null);
    return { d: { id: null, spectacle_id: sp, lieu_id: b.lieu, debut: b.jour, fin: b.jour, precision: 'jour', public: 'tout_public', statut: null, visible: true, nature: 'representations', intitule: null },
      r: null, rs: [], n: 1, premier: true, bande: T.lignes.length % 2, cle: 'neuve', neuve: true };
  }
  const CASES_NEUVES = ['jour', 'spectacle', 'lieu'];
  // la ligne i (x : sa ligne) : un <tr>, ses cases ; T.textes garde le texte de chaque case (pour comparer au redessin suivant)
  function htmlLigne(x, i, derniere = derniereFigee()) {
    const sp = spectacle(x.d.spectacle_id), style = modeSimple() && sp ? ` style="--c:${esc(couleurSp(sp))}"` : '';
    return `<tr role="row" aria-rowindex="${i + 2}"${x.neuve ? ' data-neuve' : ` data-l="${i}"`} class="b${x.bande}${x.premier ? ' premier' : ''}${x.debutGroupe ? ' debut-groupe' : ''}${x.neuve ? ' tab-neuve' : ''}${x.d.statut === 'annulee' || x.r?.annulee ? ' barree' : ''}"${style}>${T.cols.map((c, j) => {
      const neuf = x.neuve && !CASES_NEUVES.includes(c.k), t = neuf ? '' : c.texte(x), cle = cleCase(x, c); T.textes.set(cle, t);
      const raison = neuf ? '' : c.fige?.(x) || '', lecture = neuf || c.type === 'lecture' || !!raison, periode = !neuf && !x.r && c.niveau === 'seance';   // (la classe .periode marque ces cases pour le banc ; le garde-fou, lui, passe par T.garde)
      const vide = x.neuve && c.k === 'jour' && !t ? ' data-vide="Nouvelle date…" aria-label="Nouvelle date : le jour"' : '';
      // (une case que la base a refusée garde ce qu'on y avait écrit, cerclée de rouge, le message en infobulle ; une case ignorée d'un collage est en ambre)
      const erreur = T.erreurs.get(cle), ignoree = T.ignorees.get(cle), titre = erreur ? `Pas enregistré : ${erreur}` : ignoree ? `Ignorée : ${ignoree.raison} (« ${ignoree.brut} »)` : c.type === 'action' ? (neuf ? '' : 'Ouvrir la date dans le tiroir (Ctrl+Entrée)') : c.type === 'presence' ? raison : raison || (t.length > 16 ? t : '');   // (la case d'une matrice a son infobulle sur son bouton)
      return `<td role="gridcell" aria-colindex="${j + 1}" data-c="${j}" class="c-${c.k}${c.classe ? ` ${c.classe}` : ''}${T.figees.has(c.k) ? ` figee${c.k === derniere ? ' derniere' : ''}` : ''}${c.niveau !== 'seance' && !x.premier ? ' repete' : ''}${neuf ? ' neuve-vide' : ''}${periode ? ' periode' : ''}${c.type === 'action' ? ' tab-fiche' : ''}${erreur ? ' erreur' : ''}${ignoree ? ' ignoree' : ''}" tabindex="-1"${c.type === 'action' ? ' aria-keyshortcuts="Control+Enter"' : lecture ? ' aria-readonly="true"' : ''}${erreur ? ' aria-invalid="true"' : ''}${titre ? ` title="${esc(titre)}"` : ''}${vide}>${neuf ? '' : erreur ? esc(T.refus.get(cle) ?? t) : c.html ? c.html(x) : esc(t)}</td>`;
    }).join('')}</tr>`;
  }
  const phraseCompte = (plie = [], rg = reglages()) => {
    const n = T.lignes.length;
    return modeMatrice() ? `${pl(n, 'date')} · ${pl(T.cols.filter(c => c.type === 'presence').length, 'personne')}`
      : modeSimple() ? `${pl(n, 'date')} · ${pl(T.lignes.reduce((s, x) => s + x.rs.length, 0), 'séance')}`
      : `${pl(n, 'séance')} · ${pl(new Set(T.lignes.map(x => x.d.id)).size, 'date')}${plie.length && !rg.vides ? ` · colonnes vides repliées : ${plie.length > 6 ? `${plie.slice(0, 6).map(c => c.l.toLowerCase()).join(', ')} et ${plie.length - 6} autres` : plie.map(c => c.l.toLowerCase()).join(', ')}` : ''}`;
  };
  function dessiner({ garder = false } = {}) {
    const corps = $('#tab-corps'), tete = $('#tab-tete'), cadreT = $('#tab-cadre');
    if (!corps) return;
    if (garder && T.geste) { T.aRafraichir = true; return; }   // un bord qu'on tire : la grille attend le relâchement
    const avant = garder ? { ligne: ligne(T.actif.l)?.cle, col: T.cols[T.actif.c]?.k, focus: corps.contains(document.activeElement), haut: cadreT.scrollTop, gauche: cadreT.scrollLeft } : null;
    const anciens = garder ? T.textes : null;
    const rg = reglages();
    T.largeurDist = (largeLa() && rg.largeurs?.distribution) || largeurOrigine('distribution');
    T.lignes = lignes();
    const ps = possibles(T.lignes);   // (la matrice tire ses colonnes des lignes à l'écran)
    T.cols = colonnes(T.lignes, ps, rg); T.figees = figeesDe(ps, rg);
    T.neuve = modeSimple() && !modeMatrice() ? ligneNeuve() : null;   // (la matrice n'a pas de ligne vide : une date neuve s'y crée par « ＋ Date »)
    const plie = ps.filter(c => !T.cols.includes(c) && admise(c, rg)), derniere = derniereFigee();
    $('#tab').setAttribute('aria-rowcount', String(nbLignes() + 1 + (modeMatrice() && T.lignes.length ? 1 : 0)));   // (l'en-tête, les lignes, et le bas de la matrice)
    $('#tab').setAttribute('aria-colcount', String(T.cols.length));
    if (!T.cols.some(c => c.k === T.tournant)) T.tournant = T.cols[0]?.k || null;
    dessinerTete(tete, derniere);
    poserGauches(cadreT);
    T.textes = new Map();
    // le HTML de chaque ligne : quand les lignes et les colonnes sont les mêmes qu'au dessin d'avant (garder), seules les lignes dont le HTML
    // a changé sont remplacées (un redessin sans rien de nouveau ne touche pas au DOM : aucune mise en page à refaire) ; sinon, tout est
    // redessiné, mais le HTML ne se fait que pour les lignes qu'on pose tout de suite (les autres le prendront en tranches : poserTranche)
    const total = T.lignes.length + (T.neuve ? 1 : 0), htmls = new Array(total);
    const faire = i => { htmls[i] = i < T.lignes.length ? htmlLigne(T.lignes[i], i, derniere) : htmlLigne(T.neuve, T.lignes.length, derniere); };
    const signature = `${T.mode}|${T.cols.map(c => c.k).join(',')}|${derniere}|${[...T.figees].join(',')}`;
    annulerTranches();
    if (garder && T.lignes.length && T.htmls?.length === total && T.rendues === total && T.sigLignes === signature) {
      // (seules les lignes dont le HTML a changé sont remplacées, une tranche à la fois : T.htmls garde ce que le DOM porte)
      for (let i = 0; i < total; i++) faire(i);
      const reste = htmls.map((h, i) => (h !== T.htmls[i] ? i : -1)).filter(i => i >= 0);
      retoucher(corps, reste.splice(0, 12), anciens, derniere);   // (la première tâche porte déjà le HTML de toutes les lignes à comparer : peu de lignes posées)
      if (reste.length) enTranches(corps, () => { retoucher(corps, reste.splice(0, tranche()), anciens, derniere); miseEnPage(corps); return reste.length > 0; });
    } else {
      // tout est redessiné : les premières lignes d'abord, le reste par tranches (TRANCHE), sauf pour un redessin qui garde la place où l'on est ;
      // celui-là pose tout, sauf quand les tranches d'avant n'avaient pas fini (le temps réel de la première seconde) : il ne pose alors que
      // de quoi remplir le cadre là où l'on est (jusqu'à la case active et au bas de ce qu'on voit), le reste suit en tranches
      const inachevees = garder && T.htmls && T.rendues < T.htmls.length;
      let premieres = garder || total <= PREMIERES + tranche() ? total : PREMIERES;
      if (inachevees) {
        const active = avant.ligne === 'neuve' ? T.lignes.length : T.lignes.findIndex(x => x.cle === avant.ligne), pas = corps.firstElementChild?.offsetHeight || 44;
        premieres = Math.min(total, Math.max(PREMIERES, active + 1, Math.ceil((avant.haut + cadreT.clientHeight) / pas) + 1));
      }
      for (let i = 0; i < premieres; i++) faire(i);
      corps.innerHTML = `${T.lignes.length ? '' : `<tr role="row"><td role="gridcell" colspan="${T.cols.length}" class="tab-vide">${ICONES.ornementVide}${E.dates.length ? `${modeSimple() ? 'Aucune date' : 'Aucune séance'} ne correspond.${filtresActifs(T.f) ? '<br><button type="button" class="btn" data-effacer-filtres>Effacer les filtres</button>' : ''}` : `Aucune date pour l’instant : « ${libelleAjout()} » en ajoute une.`}</td></tr>`}${htmls.slice(0, premieres).join('')}`;
      T.htmls = T.lignes.length ? htmls : null; T.rendues = premieres;
      if (T.htmls && premieres < total) lancerTranches(corps);
    }
    T.sigLignes = signature;
    const n = nbLignes();
    $('#tab-compte').textContent = phraseCompte(plie, rg);
    majPied();
    // la case active : la même qu'avant (par sa ligne et sa colonne), sinon la plus proche
    if (avant) {
      const l = avant.ligne === 'neuve' && T.neuve ? T.lignes.length : T.lignes.findIndex(x => x.cle === avant.ligne), c = T.cols.findIndex(y => y.k === avant.col);
      T.actif = { l: l >= 0 ? l : Math.min(T.actif.l, Math.max(0, n - 1)), c: c >= 0 ? c : Math.min(T.actif.c, T.cols.length - 1) };
      cadreT.scrollTop = avant.haut; cadreT.scrollLeft = avant.gauche;
    } else T.actif = { l: Math.min(T.actif.l, Math.max(0, n - 1)), c: Math.min(T.actif.c, T.cols.length - 1) };
    if (T.ancre && (T.ancre.l >= n || T.ancre.c >= T.cols.length)) T.ancre = null;
    marquer(avant?.focus);
    // ce qui a changé ailleurs (le temps réel) clignote ; pas ce qu'on vient d'écrire ici
    if (anciens) {
      const maintenant = Date.now();
      T.lignes.forEach((x, i) => i < T.rendues && T.cols.forEach((c, j) => {   // (une ligne pas encore posée n'a ni texte ni case)
        const k = cleCase(x, c), avantT = anciens.get(k);
        if (avantT === undefined || avantT === T.textes.get(k)) return;
        clignoter(cellule(i, j), c, maintenant - (T.recents.get(x.d.id) || 0) < 4000 ? 'enregistree' : 'vient-d-ailleurs');
      }));
    }
    placerCadre();
  }
  // ———— le dessin par tranches : une saison entière (trois cents dates, six cents séances) mise en page d'un bloc coûte plus de 200 ms à
  // CPU=4. dessiner() n'en pose donc que les premières (PREMIERES, douze : de quoi voir la grille aussitôt, la tranche suivante arrive dans la tâche d'après) ; les autres suivent, TRANCHE par TRANCHE, chacune dans sa tâche (le
  // navigateur peint entre deux), et chaque tranche compte le « +n » de ses cases et remet la marque de la case active si elle est de la
  // tranche. Viser une ligne qui n'est pas encore là (le clavier, « Voir », la ligne vide du bas) pose d'un coup tout ce qui reste
  // (finirTranches) ; un nouveau dessin complet abandonne les tranches qui restaient. T.htmls porte le HTML de toutes les lignes, T.rendues
  // le nombre de celles qui sont dans le DOM.
  const PREMIERES = 12, TRANCHE = 30;
  // (la matrice a une colonne par personne : une tranche de trente lignes de trente colonnes pèse trois fois celle du Simple ; elle se pose par
  // tranches d'environ quatre cents cases, six lignes au moins)
  const tranche = () => (modeMatrice() ? Math.max(6, Math.min(TRANCHE, Math.floor(400 / Math.max(1, T.cols.length)))) : TRANCHE);
  // la mise en page d'une tranche se fait dans sa propre tâche (une lecture de la hauteur la force) : sans elle, le navigateur la remet au rendu qui
  // suit, et le budget (aucune tâche de plus de 200 ms à CPU=4) se joue sur un cumul que la tranche ne maîtrise plus
  const miseEnPage = corps => corps.offsetHeight;
  function poserTranche(corps, n = tranche()) {
    const de = T.rendues, a = Math.min(T.htmls.length, de + n), html = [];
    for (let k = de; k < a; k++) html.push(T.htmls[k] ?? (T.htmls[k] = htmlLigne(ligne(k), k)));
    corps.insertAdjacentHTML('beforeend', html.join(''));
    miseEnPage(corps);
    T.rendues = a;
    if (T.actif.l >= de && T.actif.l < a) marquer(false);
  }
  // une tâche qui se refait tranche après tranche, chacune dans sa minuterie, tant qu'elle rend vrai (le tableur change, la vue s'en va : elle s'arrête)
  function enTranches(corps, tache) {
    const suite = () => { T.suite = null; if (corps.isConnected && tache()) T.suite = setTimeout(suite, 0); };
    T.suite = setTimeout(suite, 0);
  }
  function lancerTranches(corps) {
    enTranches(corps, () => {
      if (!T.htmls || T.rendues >= T.htmls.length) return false;
      poserTranche(corps);
      return T.rendues < T.htmls.length;
    });
  }
  // remplacer des lignes posées par leur HTML d'aujourd'hui (T.htmls garde ce que le DOM porte) ; ce qui a changé de texte clignote
  function retoucher(corps, indices, anciens, derniere = derniereFigee()) {
    const focus = corps.contains(document.activeElement), maintenant = Date.now();
    let actif = false;
    indices.forEach(i => {
      const x = ligne(i), tr = corps.children[i];
      if (!x || !tr) return;
      const h = htmlLigne(x, i, derniere);
      if (h === T.htmls[i]) return;
      tr.outerHTML = h; T.htmls[i] = h;
      const neuf = corps.children[i];
      if (anciens) T.cols.forEach((c, j) => {
        const k = cleCase(x, c), a = anciens.get(k);
        if (a !== undefined && a !== T.textes.get(k)) clignoter(neuf.children[j], c, maintenant - (T.recents.get(x.d.id) || 0) < 4000 ? 'enregistree' : 'vient-d-ailleurs');
      });
      if (i === T.actif.l) actif = true;
    });
    if (actif) marquer(focus);
  }
  // la case dont le texte a changé clignote ; dans la matrice, c'est aussi le bouton de la case qui saute (ad-pop)
  function clignoter(td, c, classe) {
    if (!td) return;
    td.classList.add(classe);
    if (c.type === 'presence') $('.mat-case', td)?.classList.add('saute');
  }
  function annulerTranches() { clearTimeout(T.suite); T.suite = null; }
  function finirTranches() {
    const corps = $('#tab-corps');
    if (!corps || !T.htmls || T.rendues >= T.htmls.length) return;
    annulerTranches();
    poserTranche(corps, Infinity);
  }
  // ce que le temps réel a changé pendant une saisie, une fenêtre ouverte ou un bord qu'on tire : noté, refait à la fin
  // (ids : les dates touchées ; null : tout)
  function retarder(ids) {
    if (!ids) T.aRafraichir = true;
    else if (T.aRafraichir !== true) T.aRafraichir = new Set([...(T.aRafraichir || []), ...ids]);
  }
  // (une écriture qui finit pendant une saisie ou une fenêtre ouverte : les lignes se refont à leur fermeture, jamais sous la main)
  const redessiner = ids => { if (T.edition || T.pop) retarder(ids); else dessinerLignes(ids); };
  function rattraper() {
    const a = T.aRafraichir;
    if (!a) return false;
    T.aRafraichir = false;
    if (a instanceof Set) dessinerLignes([...a]); else dessiner({ garder: true });
    return true;
  }
  function dessinerLignes(ids) {
    const corps = $('#tab-corps');
    if (!corps) return;
    if (!ids) return dessiner({ garder: true });
    if (T.geste) return retarder(ids);
    const rg = reglages(), nouvelles = lignes(), ps = possibles(nouvelles), cols = colonnes(nouvelles, ps, rg);
    T.largeurDist = (largeLa() && rg.largeurs?.distribution) || largeurOrigine('distribution');
    const memes = nouvelles.length === T.lignes.length && cols.length === T.cols.length && cols.every((c, j) => c === T.cols[j]) && nouvelles.every((x, i) => x.cle === T.lignes[i].cle);
    if (!memes || !T.lignes.length) return dessiner({ garder: true });
    const touchees = new Set(ids), focus = corps.contains(document.activeElement), maintenant = Date.now(), derniere = derniereFigee();
    T.lignes = nouvelles;
    nouvelles.forEach((x, i) => {
      if (!touchees.has(x.d.id)) return;
      const anciens = T.cols.map(c => T.textes.get(cleCase(x, c)));
      T.htmls[i] = htmlLigne(x, i, derniere);
      const tr = i < T.rendues ? corps.children[i] : null;   // (une ligne que les tranches n'ont pas encore posée prendra ce HTML-ci)
      if (!tr || tr.dataset.l !== String(i)) return;
      tr.outerHTML = T.htmls[i];
      const neuf = corps.children[i];
      T.cols.forEach((c, j) => {
        const a = anciens[j];
        if (a === undefined || a === T.textes.get(cleCase(x, c))) return;
        clignoter(neuf.children[j], c, maintenant - (T.recents.get(x.d.id) || 0) < 4000 ? 'enregistree' : 'vient-d-ailleurs');
      });
    });
    $('#tab-compte').textContent = phraseCompte(ps.filter(c => !T.cols.includes(c) && admise(c, rg)), rg);
    majPied();
    marquer(focus);
    placerCadre();
  }

  // ———— l'en-tête : refait seulement quand la liste des colonnes change (sinon une poignée qu'on tire serait détruite), mis à
  // jour en place le reste du temps (aria-sort, colonnes figées) ; une poignée au bord droit de chaque th, au pointeur fin
  const avecPoignees = () => typeof FENETRES !== 'undefined' && FENETRES.actif() && largeLa();
  // l'icône du type de la colonne (14 px, aria-hidden : le libellé est à côté)
  const iconeType = c => (c.icone ? icone(c.icone, 14) : '');
  function dessinerTete(tete, derniere) {
    const signature = `${T.cols.map(c => c.sig ?? c.k).join(',')}|${avecPoignees()}|${T.mode}`;   // (sig : ce que l'en-tête d'une colonne de la matrice montre — nom, rôle, métier, téléphone)
    if (tete.dataset.cles !== signature) {
      // (une colonne de la diffusion porte un cadenas et « confidentiel » en .sr ; l'icône « fiche » n'a que son libellé en .sr)
      tete.innerHTML = `<tr role="row" aria-rowindex="1">${T.cols.map((c, j) => `<th role="columnheader" scope="col" class="c-${c.k}${c.classe ? ` ${c.classe}` : ''}${c.confidentiel ? ' confidentiel' : ''}" data-k="${c.k}" data-l="${esc(c.l)}" aria-colindex="${j + 1}"${c.type === 'action' || c.type === 'presence' ? '' : ' aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"'}${c.k === 'jour' ? ` aria-sort="${T.v.tri === 'desc' ? 'descending' : 'ascending'}"` : ''} title="${esc(titreCol(c))}">${c.k === 'jour' ? `<button type="button" class="tab-tri" id="tab-tri">${iconeType(c)}${texteTri()}</button>` : c.entete ? c.entete() : `<span class="tab-th">${iconeType(c)}<span${c.type === 'action' ? ' class="sr"' : ''}>${esc(c.l)}</span>${c.confidentiel ? `<span class="tab-cadenas">${icone('cadenas', 12)}<span class="sr"> confidentiel</span></span>` : ''}</span>`}</th>`).join('')}</tr>`;
      tete.dataset.cles = signature;
      if (avecPoignees()) T.cols.filter(c => c.type !== 'action' && c.type !== 'presence').forEach(c => poignee($(`th[data-k="${c.k}"]`, tete), c));   // (l'icône « fiche » n'a pas de largeur à régler, ni la colonne d'une personne de la matrice)
    }
    $$('th', tete).forEach((th, j) => {
      const c = T.cols[j];
      th.setAttribute('aria-colindex', String(j + 1));
      th.classList.toggle('figee', T.figees.has(c.k)); th.classList.toggle('derniere', c.k === derniere);
      if (c.k === 'jour') { th.setAttribute('aria-sort', T.v.tri === 'desc' ? 'descending' : 'ascending'); $('#tab-tri', th).innerHTML = `${iconeType(c)}${texteTri()}`; }
      th.title = titreCol(c);
    });
    tournant();
  }
  // le focus tournant des en-têtes : un seul th est dans l'ordre de Tab (et sa poignée, et le bouton du tri s'il est celui du Jour),
  // ← → passent de l'un à l'autre
  function tournant(k = T.tournant) {
    T.tournant = k;
    $$('#tab-tete th').forEach(th => {
      const oui = th.dataset.k === k, p = $(':scope > .poignee', th);
      th.tabIndex = oui ? 0 : -1;
      if (p) p.tabIndex = oui ? 0 : -1;
      if (th.dataset.k === 'jour') $('#tab-tri', th)?.setAttribute('tabindex', oui ? '0' : '-1');
      $$('.mat-menu, .mat-tel', th).forEach(b => b.setAttribute('tabindex', oui ? '0' : '-1'));   // (la matrice : le ⋯ et le lien « téléphone ? » de l'en-tête)
    });
  }
  // le bord gauche des colonnes figées, en CSS : la première à 0, chacune ensuite après la largeur de la précédente (les
  // largeurs sont des variables : un geste ou le téléphone les change, les bords suivent sans qu'on mesure rien)
  function poserGauches(cadreT) {
    const fs = T.cols.filter(c => T.figees.has(c.k)), nouvelles = new Set(fs.map(c => c.k));
    (T.gauches || []).forEach(k => { if (!nouvelles.has(k)) cadreT.style.removeProperty(`--l-${k}`); });
    fs.forEach((c, i) => cadreT.style.setProperty(`--l-${c.k}`, i ? `calc(var(--l-${fs[i - 1].k}) + var(--w-${fs[i - 1].k}))` : '0px'));
    T.gauches = [...nouvelles];
  }
  // les largeurs retenues, posées en ligne sur le cadre (la préférence, ou rien : la feuille de style a les largeurs d'origine)
  function poserLargeurs() {
    const c = $('#tab-cadre'); if (!c) return;
    const g = largeLa() ? reglages().largeurs : {};
    TOUTES.forEach(x => { if (g[x.k]) c.style.setProperty(`--w-${x.k}`, `${g[x.k]}px`); else c.style.removeProperty(`--w-${x.k}`); });
  }
  // les largeurs ne s'écrivent qu'au pointeur fin et au-dessus de 700 px : dessous, les media queries du téléphone gardent la main
  const largeLa = () => typeof matchMedia === 'function' && matchMedia('(min-width: 701px) and (pointer: fine)').matches;
  const variablesColonnes = () => Object.entries(largeLa() ? reglages().largeurs : {}).map(([k, v]) => `--w-${k}:${v}px`).join(';');

  // ———— la poignée d'une colonne : son bord droit se tire (FENETRES), un double-clic ou Entrée l'ajuste au contenu
  // la largeur d'une colonne telle qu'elle est posée (la variable en ligne, sinon la gardée, sinon l'origine) : sans rien mesurer, une
  // poignée par en-tête se crée sans que la grille se remette en page à chacune
  const largeurOrigine = k => (modeSimple() && LARGEURS_SIMPLE[k]) || colonne(k).largeur;
  const largeurPosee = k => parseFloat($('#tab-cadre')?.style.getPropertyValue(`--w-${k}`)) || reglages().largeurs[k] || largeurOrigine(k);
  const mesures = {};     // la dernière largeur « au contenu » de chaque colonne (la remise de la poignée la fait garder)
  function poignee(th, c) {
    const cadreT = $('#tab-cadre'), k = c.k;
    const p = FENETRES.poignee(th, { cle: null, axe: 'x', bord: 'droite', min: LARGEUR_MIN, max: LARGEUR_MAX, libelle: `Largeur de la colonne ${c.l}`,
      lire: () => largeurPosee(k), ecrire: v => cadreT.style.setProperty(`--w-${k}`, `${v}px`), garder: v => gardeLargeur(k, v), defaut: () => ajuster(k) });
    if (!p) return;
    p.title = 'Glisser pour régler la largeur · double-clic ou Entrée : l’ajuster au contenu';
    p.addEventListener('pointerdown', e => {
      if (e.button !== 0 || !e.isPrimary) return;
      fermerPopDehors();   // (la poignée retient le pointeur et supprime le mousedown : « un clic à côté » ne se voit plus)
      T.geste = true;
      const fini = new AbortController(), fin = () => { fini.abort(); setTimeout(finGeste, 60); };   // (après l'écriture de la poignée, 30 ms)
      window.addEventListener('pointerup', fin, { capture: true, signal: fini.signal }); window.addEventListener('pointercancel', fin, { capture: true, signal: fini.signal });
    });
  }
  // le geste est fini : ce que le temps réel a changé pendant qu'on tirait se dessine enfin
  function finGeste() {
    T.geste = false;
    if (!T.edition && !T.pop) rattraper();
    placerCadre();
  }
  // la largeur gardée (au relâchement, ou à la remise : null veut dire « ajustée au contenu », que ajuster vient de mesurer)
  function gardeLargeur(k, v) {
    const w = v === null ? mesures[k] ?? null : v, largeurs = { ...reglages().largeurs };
    if (w === null || w === largeurOrigine(k)) delete largeurs[k]; else largeurs[k] = w;
    ecrireReglages({ largeurs });
    // la cellule Distribution compte ses pastilles d'après la largeur de sa colonne : elle se refait quand la largeur est posée (au relâchement)
    if (k === 'distribution') { if (T.geste) retarder(null); else dessiner({ garder: true }); }
  }
  // la largeur qui montre tout le contenu d'une colonne : mesurée une fois, sur des copies de ses cases dans un petit tableau hors de
  // l'écran, sans largeur imposée (la variable --w-<k> n'existe pas hors du cadre : la colonne prend ce qu'il lui faut) ; la grille en
  // place n'est pas touchée, elle ne se remet pas en page pour une mesure
  function ajuster(k) {
    if (!colonne(k) || !$('#tab-cadre')) return null;
    const th = $(`#tab-tete th[data-k="${k}"]`), cases = $$(`#tab-corps td.c-${k}`);
    if (!th) return null;
    const hors = document.createElement('table');
    hors.className = 'tableur'; hors.setAttribute('aria-hidden', 'true');
    hors.style.cssText = 'position: fixed; left: -99999px; top: 0; visibility: hidden; pointer-events: none; width: max-content; min-width: 0;';
    hors.innerHTML = `<thead><tr></tr></thead><tbody>${cases.map(() => '<tr></tr>').join('')}</tbody>`;
    [th, ...cases].forEach((el, i) => {
      const copie = el.cloneNode(true);
      copie.classList.remove('figee', 'derniere'); copie.removeAttribute('data-plus'); copie.removeAttribute('id');
      $$('.poignee', copie).forEach(p => p.remove());
      hors.rows[i].append(copie);
    });
    document.body.append(hors);
    const w = Math.ceil(hors.rows[0].cells[0].getBoundingClientRect().width) + 1;
    hors.remove();
    return (mesures[k] = Math.max(LARGEUR_MIN, Math.min(LARGEUR_MAX, w)));
  }

  // ———— la hauteur du cadre : la place qui reste sous lui (bornée à 300 px), moins la barre d'état collée sous lui, ou la hauteur voulue si elle
  // est plus petite (la poignée du bas, fenetres.tableur-h) ; au téléphone et au doigt, l'écran moins l'en-tête de l'administration, comme avant.
  // Une seule fonction pour tout ce qui la change : le dessin, la fenêtre, le menu replié, la fin d'un geste, une phrase d'état qui change de hauteur.
  function placerCadre() {
    const c = $('#tab-cadre'); if (!c || document.documentElement.classList.contains('redim')) return;
    const barre = $('.tab-ligne-etat'), bas = barre ? (T.hBarre = barre.offsetHeight) + 6 : 0;   // (6 px : sa marge du haut)
    const bureau = typeof FENETRES !== 'undefined' && FENETRES.actif() && largeLa();
    const place = Math.max(300, Math.floor(bureau ? innerHeight - (c.getBoundingClientRect().top + scrollY) - 24 - bas : innerHeight - ($('.barre')?.offsetHeight || 0) - 24 - bas - (document.documentElement.classList.contains('ob-actif') ? 64 : 0)));   // (au téléphone, la barre du bas de mobile.js)
    const voulu = bureau ? FENETRES.taille('tableur-h') : null, h = voulu ? Math.min(voulu, place) : place;
    c.style.maxHeight = `${h}px`; c.style.height = voulu ? `${h}px` : '';
  }

  // ———— le bas de la matrice : « n dates » par personne (sur combien des dates à l'écran elle est de la partie, remplaçante comprise)
  function majPied() {
    const pied = $('#tab-pied'); if (!pied) return;
    if (!modeMatrice() || !T.lignes.length) { pied.innerHTML = ''; return; }
    const derniere = derniereFigee();
    pied.innerHTML = `<tr role="row" aria-rowindex="${nbLignes() + 2}">${T.cols.map((c, j) => `<td role="gridcell" aria-colindex="${j + 1}" class="c-${c.k}${c.classe ? ` ${c.classe}` : ''}${T.figees.has(c.k) ? ` figee${c.k === derniere ? ' derniere' : ''}` : ''}">${c.total ? esc(pl(c.total(T.lignes), 'date')) : j === 0 ? 'Part sur' : ''}</td>`).join('')}</tr>`;
  }
  const cellule = (l, c) => $(`#tab-corps ${T.neuve && l === T.lignes.length ? 'tr[data-neuve]' : `tr[data-l="${l}"]`} td[data-c="${c}"]`);
  // le nombre de lignes de la grille (la ligne vide du bas du Simple comprise) et la ligne d'un rang : T.lignes, puis cette ligne-là
  const nbLignes = () => T.lignes.length + (T.neuve ? 1 : 0);
  const ligne = l => T.lignes[l] || (T.neuve && l === T.lignes.length ? T.neuve : undefined);
  const dansPlage = (l, c) => { if (!T.ancre) return l === T.actif.l && c === T.actif.c; const [l0, l1] = [Math.min(T.ancre.l, T.actif.l), Math.max(T.ancre.l, T.actif.l)], [c0, c1] = [Math.min(T.ancre.c, T.actif.c), Math.max(T.ancre.c, T.actif.c)]; return l >= l0 && l <= l1 && c >= c0 && c <= c1; };
  const plage = () => { const a = T.ancre || T.actif; return { l0: Math.min(a.l, T.actif.l), l1: Math.max(a.l, T.actif.l), c0: Math.min(a.c, T.actif.c), c1: Math.max(a.c, T.actif.c) }; };
  // la case active (tabindex 0), la plage choisie (aria-selected), et la même case de la date sur ses autres séances
  function marquer(focus = false) {
    $$('#tab-corps td.actif, #tab-corps td.choisie, #tab-corps td.meme-date').forEach(td => { td.classList.remove('actif', 'choisie', 'meme-date'); td.tabIndex = -1; td.removeAttribute('aria-selected'); });
    // le bouton « Supprimer » dit sur quoi il agit : la séance de la case active, ou les lignes choisies
    const bs = $('#tab-suppr'), pg = plage(), xs = T.lignes.slice(pg.l0, pg.l1 + 1);
    if (bs) { bs.hidden = !xs.length; bs.textContent = xs.length > 1 ? `Supprimer ces ${xs.length} ${modeSimple() ? 'dates' : xs.every(y => y.r) ? 'séances' : 'lignes'}…` : xs.length ? `Supprimer ${xs[0].r ? 'la séance' : 'la date'} du ${jourCourt(xs[0].r?.jour || xs[0].d.debut)}…` : ''; }
    const x = ligne(T.actif.l), c = T.cols[T.actif.c];
    if (!x || !c) return;
    if (T.ancre) { const p = plage(); for (let l = p.l0; l <= p.l1; l++) for (let j = p.c0; j <= p.c1; j++) { const td = cellule(l, j); if (td) { td.classList.add('choisie'); td.setAttribute('aria-selected', 'true'); } } }
    if (c.niveau !== 'seance' && x.n > 1) T.lignes.forEach((y, l) => { if (y.d.id === x.d.id && l !== T.actif.l) cellule(l, T.actif.c)?.classList.add('meme-date'); });
    const td = cellule(T.actif.l, T.actif.c);
    if (!td) return;
    td.classList.add('actif'); td.tabIndex = 0;
    if (focus) td.focus({ preventScroll: true });
  }
  // amener la case en vue, sous l'en-tête et à droite des colonnes figées
  function enVue(td) {
    const cadreT = $('#tab-cadre'); if (!td || !cadreT) return;
    const r = td.getBoundingClientRect(), b = cadreT.getBoundingClientRect(), th = $('#tab-tete')?.getBoundingClientRect();
    const colle = td.classList.contains('figee') ? b.left : Math.max(b.left, ...$$('#tab-tete .figee').map(x => x.getBoundingClientRect().right));
    const haut = th ? th.bottom : b.top;
    if (r.left < colle) cadreT.scrollLeft -= colle - r.left + 2; else if (r.right > b.right - 2) cadreT.scrollLeft += r.right - b.right + 4;
    if (r.top < haut) cadreT.scrollTop -= haut - r.top + 2; else if (r.bottom > b.bottom - 2) cadreT.scrollTop += r.bottom - b.bottom + 4;
    // la page aussi : le cadre entier en vue
    const p = cadreT.getBoundingClientRect(), barre = $('.barre')?.offsetHeight || 0;
    if (r.top < barre || r.bottom > innerHeight) { if (p.top < barre || p.top > innerHeight * 0.6) scrollBy({ top: p.top - barre - 8 }); }
  }
  function activer(l, c, { etendre = false, focus = true } = {}) {
    if (!nbLignes()) return;
    l = Math.max(0, Math.min(nbLignes() - 1, l)); c = Math.max(0, Math.min(T.cols.length - 1, c));
    if (T.htmls && l >= T.rendues) finirTranches();   // (la ligne visée n'est pas encore posée)
    if (etendre) { if (!T.ancre) T.ancre = { ...T.actif }; } else T.ancre = null;
    T.actif = { l, c };
    marquer(focus);
    enVue(cellule(l, c));
  }
  // la barre d'état, collée sous le cadre (.tab-ligne-etat : le compte, l'état, « Supprimer… ») : une icône, une phrase (« Enregistrement… »,
  // « Enregistré : … » avec « Annuler Ctrl Z » quand la pile le permet, une erreur), et, quand un collage a laissé des cases de côté (la
  // phrase le dit), « Voir » qui va à la première. Une écriture que la base a refusée (echec) offre « Reprendre » (les cases reprennent leur
  // valeur d'avant) et « Réessayer » (l'écriture est rejouée) : jamais Ctrl+Z, qui défairait l'écriture d'avant, réussie. Les deux restent
  // à la queue de toute phrase tant que des cases sont cerclées de rouge (T.echec) : une autre phrase (« Copié »…) ne les prive pas d'issue.
  const ICONES_ETAT = { encours: 'horloge', ok: 'coche-cercle', erreur: 'alerte' };
  function etat(texte, genre = '', annulable = false, { echec = false } = {}) {
    const el = $('#tab-etat'); if (!el) return;
    el.className = `tab-etat ${genre}`;
    const ico = ICONES_ETAT[genre] ? `<span class="tab-etat-ico" aria-hidden="true">${icone(ICONES_ETAT[genre], 14)}</span>` : '';
    const bouton = (id, libelle) => ` <button type="button" class="btn lien petit" id="${id}">${libelle}</button>`;
    el.innerHTML = `${ico}${esc(texte)}${annulable && T.pile.length ? bouton('tab-annuler', 'Annuler <kbd>Ctrl Z</kbd>') : ''}${T.ignorees.size && /ignorée/.test(texte) ? bouton('tab-voir', 'Voir') : ''}${echec || (T.echec && genre !== 'encours') ? `${bouton('tab-reprendre', 'Reprendre')}${bouton('tab-reessayer', 'Réessayer')}` : ''}`;
    const barre = $('.tab-ligne-etat');
    if (barre && barre.offsetHeight !== T.hBarre) placerCadre();   // (une phrase longue passe à la ligne : le cadre rend la place)
  }
  // ce qu'une vue d'avant laissait : cases refusées, cases ignorées d'un collage (leurs minuteries aussi)
  function oublierEtats() {
    T.erreurs.clear(); T.refus.clear(); T.echec = null;
    T.ignorees.forEach(i => clearTimeout(i.t)); T.ignorees.clear();
  }

  // ———— les gestes
  function brancher() {
    brancherFiltresDates(T.f, () => { garderFiltres(); T.actif = { l: 0, c: 0 }; T.ancre = null; dessiner(); });
    $('#tab-vides').addEventListener('change', e => { ecrireReglages({ vides: e.target.checked }); dessiner({ garder: true }); });
    $$('.tab-modes [data-mode]').forEach(b => b.addEventListener('click', () => changerMode(b.dataset.mode)));
    $('#tab-tete').addEventListener('click', e => {
      if (e.target.closest('#tab-tri')) { basculerTri(); $('#tab-tri')?.focus(); return; }
      const menu = e.target.closest('.mat-menu');   // le ⋯ d'une colonne de la matrice : le même menu que le clic droit sur l'en-tête
      if (menu && typeof GESTES !== 'undefined') { const th = menu.closest('th'), r = menu.getBoundingClientRect(); GESTES.ouvrir(th, { x: Math.round(r.left), y: Math.round(r.bottom + 2), source: 'clavier' }); }
    });
    $('#tab-etendre').addEventListener('click', () => { const x = ligne(T.actif.l); if (x && !x.neuve) etendre(x, equipeIds(x.d)); });
    brancherTete($('#tab-tete'));
    $('#tab-colonnes').addEventListener('click', () => { if (T.pop?.ouvreur === $('#tab-colonnes')) fermerPop(); else ouvrirChoix(); });
    $('#tab-jeu').addEventListener('change', e => choisirJeu(e.target.value));
    $('#tab-etat').addEventListener('click', e => {
      if (e.target.closest('#tab-annuler')) annuler();
      else if (e.target.closest('#tab-voir')) voirIgnorees();
      else if (e.target.closest('#tab-reprendre')) reprendre();
      else if (e.target.closest('#tab-reessayer')) reessayer();
    });
    $('#tab-plus').addEventListener('click', () => formAjout());
    $('#tab-importer').addEventListener('click', () => importer());
    $('#tab-suppr').addEventListener('click', () => supprimerLignes());
    const exp = $('#tab-export'), bExp = $('#tab-exporter');
    const fermerExport = (rendre = false) => { exp.hidden = true; bExp.setAttribute('aria-expanded', 'false'); const conf = $('#tab-export-conf'); if (conf) conf.checked = false; if (rendre) bExp.focus(); };   // (la case ne se mémorise jamais : décochée à chaque fermeture)
    bExp.addEventListener('click', () => { const ouvrir = exp.hidden; exp.hidden = !ouvrir; bExp.setAttribute('aria-expanded', String(ouvrir)); if (ouvrir) $('button', exp).focus(); });
    exp.addEventListener('click', e => { const b = e.target.closest('[data-export]'); if (b) { const confidentiel = !!$('#tab-export-conf')?.checked; fermerExport(); exporter(b.dataset.export, { confidentiel }); } });
    exp.addEventListener('keydown', e => { if (e.key === 'Escape') fermerExport(true); });
    const dehorsExport = e => { if (!exp.hidden && !e.target.closest('.tab-menu')) fermerExport(); };
    document.addEventListener('click', dehorsExport);
    T.nettoyer.push(() => document.removeEventListener('click', dehorsExport));
    const corps = $('#tab-corps'), table = $('#tab');
    corps.addEventListener('mousedown', e => {
      const td = e.target.closest('td[data-c]'); if (!td || td.contains(T.edition?.el) || td.classList.contains('tab-fiche')) return;   // (la case « fiche » est un bouton : son clic ouvre le tiroir)
      const l = td.parentNode.hasAttribute('data-neuve') ? T.lignes.length : +td.parentNode.dataset.l, c = +td.dataset.c;
      if (T.edition) fermerEdition({ valider: true });
      const deja = td === document.activeElement && !T.ancre;   // un clic sur la case active (déjà choisie) : écrire
      e.preventDefault();
      activer(l, c, { etendre: e.shiftKey });
      if (deja && !e.shiftKey && T.cols[c]?.type !== 'presence') editer();   // (la case d'une matrice bascule au clic, pas à la souris enfoncée : le clic suit)
    });
    corps.addEventListener('dblclick', e => { const td = e.target.closest('td[data-c]'); if (td && !T.edition && !td.classList.contains('tab-fiche') && !td.classList.contains('mat')) editer(); });   // (la case d'une matrice a déjà basculé au clic : un double-clic ne la rebascule pas)
    corps.addEventListener('click', e => {
      const pres = e.target.closest('td.mat');   // une case de la matrice : un clic la bascule (Maj+clic choisit une plage, sans écrire)
      if (pres) { if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !T.edition && e.detail < 2) { const tr = pres.parentNode; activer(+tr.dataset.l, +pres.dataset.c); editer(); } return; }
      const td = e.target.closest('td.tab-fiche'); if (!td || !td.textContent) return;
      const tr = td.parentNode;
      ouvrirFiche(tr.hasAttribute('data-neuve') ? T.lignes.length : +tr.dataset.l, +td.dataset.c);
    });
    table.addEventListener('keydown', clavier);
    table.addEventListener('copy', e => { if (T.edition || !corps.contains(document.activeElement)) return; e.preventDefault(); e.clipboardData.setData('text/plain', copie()); etat(`Copié : ${pl(nbCases(), 'case')}.`); });
    table.addEventListener('paste', e => { if (T.edition || !corps.contains(document.activeElement)) return; e.preventDefault(); coller(e.clipboardData.getData('text/plain')); });
    brancherCadre();
  }
  // ce qui change la place du cadre : la fenêtre, le menu latéral qui se replie (sa classe sur <html>, puis la fin de sa transition),
  // la hauteur gardée sur un autre appareil ; la poignée du bas, sous le cadre. Tout part à la vue suivante.
  function brancherCadre() {
    const html = document.documentElement, ecoute = (cible, type, f, o) => { cible.addEventListener(type, f, o); T.nettoyer.push(() => cible.removeEventListener(type, f, o)); };
    let largeAvant = largeLa();
    ecoute(window, 'resize', () => {
      placerCadre();
      if (largeLa() !== largeAvant) { largeAvant = largeLa(); poserLargeurs(); const t = $('#tab-tete'); if (t) t.dataset.cles = ''; dessiner({ garder: true }); }   // (le doigt ou le téléphone : plus de poignées, plus de largeurs retenues)
    });
    const menu = () => `${html.classList.contains('menu-replie')}${html.classList.contains('menu-deplie')}`;
    let etatMenu = menu();
    const obs = new MutationObserver(() => { const m = menu(); if (m !== etatMenu) { etatMenu = m; placerCadre(); } });
    obs.observe(html, { attributes: true, attributeFilter: ['class'] }); T.nettoyer.push(() => obs.disconnect());
    ecoute(html, 'transitionend', e => { if (e.propertyName === '--large-menu') placerCadre(); });
    ecoute(document, 'fenetres:remises', placerCadre);     // (« Disposition d'origine » et son « Annuler » : la hauteur gardée, ou l'origine)
    if (typeof PREFS !== 'undefined') {
      T.nettoyer.push(PREFS.surChangement('menu.replie', placerCadre), PREFS.surChangement('fenetres.tableur-h', placerCadre),
        PREFS.surChangement('tableur.colonnes', () => { if (T.geste || !$('#tab-cadre')) return; poserLargeurs(); const t = $('#tab-tete'); if (t) t.dataset.cles = ''; dessiner({ garder: true }); }));
    }
    const cadreT = $('#tab-cadre');
    if (typeof FENETRES !== 'undefined') {
      FENETRES.poignee(cadreT, { cle: 'tableur-h', axe: 'y', bord: 'bas', dans: $('#tab-zone'), apres: cadreT, classe: 'tab-poignee-h', libelle: 'Hauteur du tableur', min: 300,
        max: () => Math.max(300, Math.floor(innerHeight - (cadreT.getBoundingClientRect().top + scrollY) - 24)),
        lire: () => Math.round(cadreT.getBoundingClientRect().height),
        defaut: () => Math.min(Math.max(300, Math.floor(innerHeight - (cadreT.getBoundingClientRect().top + scrollY) - 24)), $('#tab').offsetHeight + 2),
        ecrire: v => { cadreT.style.maxHeight = `${v}px`; cadreT.style.height = `${v}px`; } });
    }
  }
  const basculerTri = () => { T.v.tri = T.v.tri === 'desc' ? 'asc' : 'desc'; garderFiltres(); dessiner({ garder: true }); };
  const nbCases = () => { const p = plage(); return (p.l1 - p.l0 + 1) * (p.c1 - p.c0 + 1); };
  function clavier(e) {
    if (T.edition || T.pop || !e.target.closest('#tab-corps')) return;
    const mod = e.ctrlKey || e.metaKey, { l, c } = T.actif, k = e.key;
    const bouger = (dl, dc) => { e.preventDefault(); activer(l + dl, c + dc, { etendre: e.shiftKey }); };
    if (k === 'ArrowDown') return bouger(mod ? nbLignes() : 1, 0);
    if (k === 'ArrowUp') return bouger(mod ? -nbLignes() : -1, 0);
    if (k === 'ArrowRight') return bouger(0, mod ? T.cols.length : 1);
    if (k === 'ArrowLeft') return bouger(0, mod ? -T.cols.length : -1);
    if (k === 'PageDown') return bouger(10, 0);
    if (k === 'PageUp') return bouger(-10, 0);
    if (k === 'Home') { e.preventDefault(); return activer(mod ? 0 : l, 0, { etendre: e.shiftKey }); }
    if (k === 'End') { e.preventDefault(); return activer(mod ? nbLignes() - 1 : l, T.cols.length - 1, { etendre: e.shiftKey }); }
    if (k === 'Tab') {
      const n = c + (e.shiftKey ? -1 : 1);
      if (n >= 0 && n < T.cols.length) { e.preventDefault(); return activer(l, n); }
      const m = l + (e.shiftKey ? -1 : 1);
      if (m >= 0 && m < nbLignes()) { e.preventDefault(); return activer(m, e.shiftKey ? T.cols.length - 1 : 0); }
      return;   // au bord du tableau, Tab en sort
    }
    if (k === 'Escape') { if (T.ancre) { e.preventDefault(); T.ancre = null; marquer(true); } return; }
    if (mod && !e.altKey && k.toLowerCase() === 'z') { e.preventDefault(); return annuler(); }
    if (mod && !e.altKey && k.toLowerCase() === 'a') { e.preventDefault(); T.ancre = { l: 0, c: 0 }; T.actif = { l: T.lignes.length - 1, c: T.cols.length - 1 }; return marquer(true); }
    if (mod && !e.altKey && k === 'Enter') { e.preventDefault(); return ouvrirFiche(); }
    if (mod && (k === 'Delete' || k === 'Backspace')) { e.preventDefault(); return supprimerLignes(); }
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); return vider(); }
    if (k === 'Enter' || k === 'F2') { e.preventDefault(); return editer(); }
    if (k === ' ' && ['case', 'presence'].includes(T.cols[c]?.type)) { e.preventDefault(); return editer(); }
    if (k.length === 1 && !mod && !e.altKey) {
      const col = T.cols[c];
      if (['texte', 'long', 'lien', 'heure', 'jour'].includes(col?.type) && !(natif() && ['heure', 'jour'].includes(col.type))) { e.preventDefault(); return editer(k); }
      if (col?.type === 'choix' || col?.type === 'lieu' || col?.type === 'equipe' || col?.type === 'seances') { e.preventDefault(); return editer(col.type === 'choix' || col.type === 'seances' ? null : k); }
    }
  }

  // ==================== les colonnes à la carte : masquer, figer, ajuster, déplacer, choisir (TABLEUR.colonnes)
  // ———— les bornes des fenêtres que le tableur fait régler (FENETRES est chargé après ce module : on les déclare à la première vue)
  const FENETRES_TABLEUR = ['tableur-h', 'tab-pop-lieu', 'tab-pop-distribution', ...COLONNES.filter(c => c.type === 'long').map(c => `tab-ed-${c.k}`)];
  let fenetresPretes = false;
  function preparerFenetres() {
    if (fenetresPretes || typeof FENETRES === 'undefined') return;
    fenetresPretes = true;
    FENETRES.borner('tableur-h', () => ({ min: 300, max: 4000 }));
    ['lieu', 'distribution'].forEach(n => FENETRES.borner(`tab-pop-${n}`, () => ({ min: 300, max: Math.max(300, Math.min(900, innerWidth - 16)), minY: 120, maxY: Math.max(120, innerHeight - 16) })));
    COLONNES.filter(c => c.type === 'long').forEach(c => FENETRES.borner(`tab-ed-${c.k}`, () => ({ min: 190, max: 900, minY: 90, maxY: 700 })));
  }
  const ordinal = n => (n === 1 ? '1re' : `${n}e`);
  const rang = k => possibles().findIndex(c => c.k === k);
  const icone = (nom, taille = 16) => (typeof ICONES !== 'undefined' ? ICONES.svg(nom, { taille }) : '');
  // l'écran reprend la préférence (après une remise, un « Annuler », un réglage venu d'ailleurs) : largeurs, en-tête refait, grille
  function rafraichirColonnes() {
    if (!$('#tab-cadre')) return;
    poserLargeurs();
    const t = $('#tab-tete'); if (t) t.dataset.cles = '';
    const k = document.activeElement?.closest?.('#tab-tete th')?.dataset.k;   // (l'en-tête refait : le focus y revient)
    dessiner({ garder: true });
    if (k) $(`#tab-tete th[data-k="${k}"]`)?.focus();
    const b = $('#tab-vides'); if (b) b.checked = reglages().vides;
    majJeu();
  }
  function retablir(avant) { if (typeof PREFS !== 'undefined') PREFS.ecrire('tableur.colonnes', avant, { aussitot: true }); rafraichirColonnes(); }
  function masquer(k, { dire = true } = {}) {
    const c = colonne(k), rg = reglages();
    if (!c || c.type === 'action' || modeSimple() || rg.masquees.includes(k)) return;
    if (k === 'jour') { annoncer('Le jour reste : c’est lui qui date chaque ligne.'); return; }
    const avant = ecrireReglages({ masquees: [...rg.masquees, k], montrees: rg.montrees.filter(x => x !== k) }), j = T.cols.findIndex(x => x.k === k), dansTete = !!document.activeElement?.closest?.('#tab-tete');
    dessiner({ garder: true });
    if (dansTete) $$('#tab-tete th')[Math.min(Math.max(0, j), T.cols.length - 1)]?.focus();   // (l'en-tête qu'on vient de masquer avait le focus : il passe à la colonne qui prend sa place)
    if (dire) annoncer(`Colonne « ${c.l} » masquée.`, { action: () => retablir(avant) });
  }
  // (une colonne hors de la disposition d'origine, sans jeu choisi, se montre en entrant dans `montrees`)
  function montrer(k) {
    const rg = reglages(), c = colonne(k);
    if (!c || c.type === 'action' || modeSimple() || admise(c, rg)) return;
    ecrireReglages({ masquees: rg.masquees.filter(x => x !== k), ...(c.horsOrigine && !rg.jeu && !rg.montrees.includes(k) ? { montrees: [...rg.montrees, k] } : {}) });
    dessiner({ garder: true });
  }
  // « Figer jusqu'ici » : les colonnes de la première à celle-ci restent à gauche quand le tableau défile ; de nouveau sur la dernière
  // figée, elles se défigent
  function figer(k) {
    const c = colonne(k), n = rang(k) + 1;
    if (!c || c.type === 'action' || modeSimple() || n < 1) return;
    const deja = reglages().figees === n;
    ecrireReglages({ figees: deja ? 0 : n });
    dessiner({ garder: true });
    annoncer(deja ? 'Plus aucune colonne figée.' : `Colonnes figées jusqu’à « ${c.l} ».`);
  }
  // le menu « Jeu » de la tête : toutes les colonnes d'un sujet (Site, Tournée, Suivi, Bilan, Diffusion, Tout), vides comprises, les autres
  // masquées ; « Disposition d'origine » rend les colonnes comme elles étaient. Le choix se garde avec le compte (jeu, masquees).
  function choisirJeu(k) {
    if (modeSimple()) return;
    const jeu = JEUX.find(j => j.k === k) || null, dans = jeu ? colsDuJeu(jeu.k) : null;
    const avant = ecrireReglages({ jeu: jeu ? jeu.k : null, masquees: jeu && jeu.k !== 'tout' ? reglables.filter(c => c !== 'jour' && !dans.has(c)) : [], montrees: [] });
    dessiner({ garder: true });
    const n = T.cols.filter(c => c.type !== 'action').length;
    annoncer(jeu ? `Jeu « ${jeu.l} » : ${pl(n, 'colonne')}.` : 'Colonnes d’origine rétablies.', { action: () => retablir(avant) });
  }
  function majJeu() {
    const s = $('#tab-jeu'); if (s) s.value = modeSimple() ? '' : reglages().jeu || '';
  }
  function ajusterEtGarder(k) {
    const w = ajuster(k), cadreT = $('#tab-cadre');
    if (w === null || !cadreT || !largeLa()) return;   // (au doigt et au téléphone, les largeurs ne se règlent pas : rien à écrire)
    cadreT.style.setProperty(`--w-${k}`, `${w}px`);
    gardeLargeur(k, w);
  }
  // une colonne d'un cran vers l'avant (-1) ou l'arrière (+1), parmi celles qu'on voit (l'en-tête) ou parmi toutes (la fenêtre
  // « Colonnes… ») ; le focus revient où il était
  function deplacer(k, sens, { parmi = 'montrees', focus = false } = {}) {
    const c = colonne(k), liste = (parmi === 'toutes' ? possibles() : T.cols).filter(x => x.type !== 'action'), j = liste.findIndex(x => x.k === k), v = liste[j + sens];
    if (!c || c.type === 'action' || modeSimple() || j < 0) return false;
    if (!v) { annoncer(`« ${c.l} » est déjà la ${sens < 0 ? 'première' : 'dernière'} colonne.`); return false; }
    const ordre = possibles().filter(x => x.type !== 'action').map(x => x.k).filter(x => x !== k), i = ordre.indexOf(v.k);
    ordre.splice(sens < 0 ? i : i + 1, 0, k);
    ecrireReglages({ ordre });
    dessiner({ garder: true });
    if (focus) $(`#tab-tete th[data-k="${k}"]`)?.focus();
    annoncer(`${c.l} déplacée en ${ordinal((parmi === 'toutes' ? possibles() : T.cols).filter(x => x.type !== 'action').findIndex(x => x.k === k) + 1)}.`);
    return true;
  }
  // « Colonnes d'origine » : tout ce que la préférence retient s'oublie ; rend ce qu'elle retenait (« Annuler » et « Disposition d'origine »)
  function origine({ dire = true } = {}) {
    const avant = toutesColonnes();
    if (typeof PREFS !== 'undefined') PREFS.ecrire('tableur.colonnes', null, { aussitot: true });
    rafraichirColonnes();
    if (dire && $('#tab-cadre')) annoncer('Colonnes d’origine rétablies.', { action: () => retablir(avant) });
    return avant;
  }
  // le menu d'un en-tête (clic droit, Maj+F10, appui long) : menus.js l'appelle, rien d'autre
  function actions(k) {
    const c = colonne(k); if (!c || c.type === 'action') return [];
    if (c.type === 'presence') return c.actions().map(a => ({ ...a, icone: icone('calendrier') }));   // (la matrice : « Régler sa période », une colonne par personne)
    // (le Simple a six colonnes fixes : on ne les masque, ne les fige ni ne les déplace ; la largeur et, pour le jour, le tri)
    if (modeSimple()) return [...(largeLa() ? [{ libelle: 'Ajuster la largeur', icone: icone('poignee-v'), faire: () => ajusterEtGarder(k) }] : []),
      ...(k === 'jour' ? [{ libelle: T.v.tri === 'desc' ? 'Trier : du plus ancien' : 'Trier : du plus récent', icone: icone(T.v.tri === 'desc' ? 'haut' : 'bas'), faire: () => basculerTri() }] : [])];
    const j = T.cols.findIndex(x => x.k === k), jusquIci = reglages().figees === rang(k) + 1;
    return [
      { libelle: 'Masquer', detail: k === 'jour' ? 'le jour date chaque ligne' : '', icone: icone('oeil-barre'), desactive: k === 'jour', faire: () => masquer(k) },
      { libelle: jusquIci ? 'Ne plus figer' : 'Figer jusqu’ici', icone: icone('epingle'), faire: () => figer(k) },
      ...(largeLa() ? [{ libelle: 'Ajuster la largeur', icone: icone('poignee-v'), faire: () => ajusterEtGarder(k) }] : []),
      { separateur: true },
      { libelle: 'Avancer', raccourci: 'Alt ←', icone: icone('gauche'), desactive: j <= 0, faire: () => deplacer(k, -1) },
      { libelle: 'Reculer', raccourci: 'Alt →', icone: icone('droite'), desactive: j < 0 || j >= T.cols.filter(x => x.type !== 'action').length - 1, faire: () => deplacer(k, 1) },
      ...(k === 'jour' ? [{ libelle: T.v.tri === 'desc' ? 'Trier : du plus ancien' : 'Trier : du plus récent', icone: icone(T.v.tri === 'desc' ? 'haut' : 'bas'), faire: () => basculerTri() }] : []),
      { separateur: true },
      { libelle: 'Colonnes…', icone: icone('vue-tableur'), faire: () => ouvrirChoix() },
      { libelle: 'Colonnes d’origine', icone: icone('actualiser'), faire: () => origine() },
    ];
  }
  // ———— l'en-tête au clavier : ← → d'un th à l'autre (le focus tournant), Alt+← Alt+→ pour l'ordre (preventDefault : sous Windows et
  // Linux, ce sont Précédent et Suivant du navigateur), ↓ vers la grille, Entrée ou Espace sur le Jour pour trier
  function brancherTete(tete) {
    tete.addEventListener('focusin', e => { const th = e.target.closest('th[data-k]'); if (th && th.dataset.k !== T.tournant) tournant(th.dataset.k); });
    tete.addEventListener('keydown', e => {
      const th = e.target.closest('th[data-k]');
      if (!th || e.ctrlKey || e.metaKey) return;
      const k = th.dataset.k, j = T.cols.findIndex(c => c.k === k), vers = i => { const t = $$('th', tete)[Math.max(0, Math.min(T.cols.length - 1, i))]; if (t) { e.preventDefault(); t.focus(); } };
      if (e.altKey) {   // (aussi depuis la poignée et le bouton du tri, qui sont le Tab suivant le th : sinon le navigateur fait Précédent / Suivant)
        if (!e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); deplacer(k, e.key === 'ArrowLeft' ? -1 : 1, { focus: true }); }
        return;
      }
      if (e.target !== th) return;
      if (e.key === 'ArrowLeft') vers(j - 1);
      else if (e.key === 'ArrowRight') vers(j + 1);
      else if (e.key === 'Home') vers(0);
      else if (e.key === 'End') vers(T.cols.length - 1);
      else if (e.key === 'ArrowDown') { e.preventDefault(); marquer(true); }
      else if ((e.key === 'Enter' || e.key === ' ') && k === 'jour') { e.preventDefault(); basculerTri(); $('th[data-k="jour"]', tete)?.focus(); }
    });
  }
  // ———— la fenêtre « Colonnes… » : la liste de toutes les colonnes possibles, dans l'ordre voulu, chacune cochable (montrée ou
  // masquée), avec ↑ ↓ pour l'ordre et le glisser d'une ligne à l'autre ; « Colonnes d'origine » remet tout
  function htmlChoix() {
    const ps = possibles().filter(c => c.type !== 'action'), rg = reglages(), vides = new Set(ps.filter(c => !T.cols.includes(c) && admise(c, rg)).map(c => c.k));
    return ps.map((c, i) => `<li class="tab-col" data-k="${c.k}" draggable="true"><label class="tab-col-nom"><input type="checkbox" data-col-montrer${admise(c, rg) ? ' checked' : ''}${c.k === 'jour' ? ' disabled' : ''}>${c.icone ? icone(c.icone) : ''}<span>${esc(c.l)}</span>${vides.has(c.k) ? '<small>vide, repliée</small>' : ''}</label>
      <span class="tab-col-ordre"><button type="button" class="btn petit" data-col-haut aria-label="Avancer ${esc(c.l)}"${i === 0 ? ' disabled' : ''}>${icone('haut')}</button><button type="button" class="btn petit" data-col-bas aria-label="Reculer ${esc(c.l)}"${i === ps.length - 1 ? ' disabled' : ''}>${icone('bas')}</button></span></li>`).join('');
  }
  function ouvrirChoix() {
    const bouton = $('#tab-colonnes'); if (!bouton) return;
    const pop = poser(bouton, `<p class="tab-pop-titre" id="tab-col-titre">Colonnes</p><ul class="tab-col-liste" id="tab-col-liste" aria-labelledby="tab-col-titre"></ul>
      <p class="aide">Cochez celles à montrer ; ↑ ↓ (ou glisser) change l’ordre. Une colonne vide sur toute la vue se replie d’elle-même.</p>
      <div class="tab-pop-pied"><button type="button" class="btn petit" data-col-origine>Colonnes d’origine</button><button type="button" class="btn petit lien" data-fermer>Fermer</button></div>`,
      { label: 'Colonnes du tableur', large: true, ouvreur: bouton, retour: () => bouton.focus() });
    bouton.setAttribute('aria-expanded', 'true');
    const liste = $('#tab-col-liste', pop);
    const dessinerListe = (garde = null) => {
      liste.innerHTML = htmlChoix();
      T.pop?.placer();
      if (!garde) return;
      const li = $(`.tab-col[data-k="${garde.k}"]`, liste), cible = li && ($(`[${garde.attr}]:not(:disabled)`, li) || $('[data-col-haut]:not(:disabled), [data-col-bas]:not(:disabled)', li) || $('input', li));
      cible?.focus();
    };
    dessinerListe();
    $('input:not(:disabled), button', liste)?.focus();
    const apres = (k, attr) => dessinerListe({ k, attr });
    pop.addEventListener('click', e => {
      const li = e.target.closest('.tab-col'), k = li?.dataset.k;
      if (e.target.closest('[data-fermer]')) return fermerPop();
      if (e.target.closest('[data-col-origine]')) { origine(); dessinerListe(); return; }
      if (!li) return;
      const haut = e.target.closest('[data-col-haut]'), bas = e.target.closest('[data-col-bas]');
      if (haut || bas) { deplacer(k, haut ? -1 : 1, { parmi: 'toutes' }); apres(k, haut ? 'data-col-haut' : 'data-col-bas'); }
    });
    pop.addEventListener('change', e => {
      const li = e.target.closest('.tab-col'); if (!li || !e.target.matches('[data-col-montrer]')) return;
      if (e.target.checked) montrer(li.dataset.k); else masquer(li.dataset.k, { dire: false });
      apres(li.dataset.k, 'data-col-montrer');
    });
    // le glisser : la ligne prend la place de celle sur laquelle on la lâche
    let glisse = null;
    pop.addEventListener('dragstart', e => { const li = e.target.closest('.tab-col'); if (!li) return; glisse = li.dataset.k; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', glisse); li.classList.add('glisse'); });
    pop.addEventListener('dragover', e => { if (glisse && e.target.closest('.tab-col')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } });
    pop.addEventListener('dragend', () => { glisse = null; $$('.tab-col.glisse', pop).forEach(x => x.classList.remove('glisse')); });
    pop.addEventListener('drop', e => {
      const li = e.target.closest('.tab-col'); if (!glisse || !li || li.dataset.k === glisse) return;
      e.preventDefault();
      const k = glisse, tout = possibles().filter(c => c.type !== 'action').map(c => c.k), ordre = tout.filter(x => x !== k), i = ordre.indexOf(li.dataset.k);
      ordre.splice(tout.indexOf(k) > tout.indexOf(li.dataset.k) ? i : i + 1, 0, k);   // (tirée vers le haut, elle prend la place de la ligne visée ; vers le bas, elle passe après)
      glisse = null;
      ecrireReglages({ ordre });
      dessiner({ garder: true });
      dessinerListe({ k, attr: 'data-col-montrer' });   // (le focus revient dans la fenêtre : Échap la ferme encore)
      annoncer(`${colonne(k).l} déplacée en ${ordinal(possibles().filter(c => c.type !== 'action').findIndex(c => c.k === k) + 1)}.`);
    });
  }
  // Ctrl+Entrée dans la grille : la date dans le tiroir, sur le champ de la case (la grille le prend elle-même, comme Alt+← Alt+→ ; le registre le liste
  // dans l'aide « ? » et ne l'attrape pas : la grille est un endroit où il se tait)
  if (typeof RACCOURCIS !== 'undefined') RACCOURCIS.declarer({ id: 'tableur.fiche', touches: ['Ctrl+Entrée'], groupe: 'Le tableur', d: 'Ouvrir la date de la case dans le tiroir, sur le champ de la colonne (il s’allume) ; la grille se met à jour derrière',
    quand: () => location.hash.startsWith('#/representations/tableur'), faire: () => { if (document.activeElement?.closest?.('#tab-corps')) ouvrirFiche(); } });
  // Alt+← Alt+→ sur un en-tête : déclarés au registre des raccourcis (l'aide « ? » les liste ; le registre ne les attrape pas lui-même,
  // la grille est un endroit où il se tait : brancherTete les prend)
  if (typeof RACCOURCIS !== 'undefined') [['Alt+←', 'Avancer la colonne dont l’en-tête a le focus', -1], ['Alt+→', 'Reculer la colonne dont l’en-tête a le focus', 1]].forEach(([touche, d, sens]) =>
    RACCOURCIS.declarer({ id: `tableur.colonne.${sens < 0 ? 'avancer' : 'reculer'}`, touches: [touche], groupe: 'Le tableur', d, quand: () => location.hash.startsWith('#/representations/tableur'),
      faire: () => { const th = document.activeElement?.closest?.('#tab-tete th[data-k]'); if (th) deplacer(th.dataset.k, sens, { focus: true }); } }));

  // ==================== l'édition : écrire dans une case, enregistrer, annuler, vider
  // ———— le petit calendrier de la case du jour (.tab-cal) : accroché à la saisie (T.edition.cal), jamais une fenêtre posée (poser) : celle-ci ferme
  // au mousedown ailleurs que chez elle, et la saisie se ferme au blur de son champ, deux machines d'état sur une même case. Le champ garde le
  // focus : le calendrier n'est pas focalisable, il se pilote depuis le clavier du champ (aria-activedescendant ; ← → ± un jour, ↑ ↓ ± une
  // semaine, Page ↑ ↓ ± un mois, Entrée, Échap, Suppr, tous avec stopPropagation : le clavier de la grille lie Page ↑ ↓ à ± 10 lignes et Suppr à
  // vider) ou à la souris (un mousedown sur lui ne retire pas le focus du champ). « ‹ Novembre 2026 › », lundi en premier, une grille de six
  // semaines de 32 px, aujourd'hui cerclé, le jour choisi plein, les jours des mois voisins à demi effacés. Au doigt (natif), le champ de date
  // du téléphone le remplace : pas de calendrier.
  const JOURS_LONGS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  // le même quantième n mois plus loin, ramené à la fin du mois qui n'a pas ce quantième (le 31 janvier + 1 mois : le 28 février)
  function moisPlus(j, n) {
    const [a, m, d] = j.split('-').map(Number), t = a * 12 + (m - 1) + n, a2 = Math.floor(t / 12), m2 = t % 12 + 1;
    return iso(a2, m2, Math.min(d, new Date(Date.UTC(a2, m2, 0)).getUTCDate()));
  }
  function poserCal(td, champ, depart) {
    let sel = depart, vue = depart.slice(0, 7);
    const cal = document.createElement('div');
    cal.className = 'tab-cal'; cal.id = 'tab-cal';
    document.body.append(cal);
    champ.setAttribute('role', 'combobox'); champ.setAttribute('aria-haspopup', 'grid'); champ.setAttribute('aria-expanded', 'true'); champ.setAttribute('aria-controls', 'tab-cal');
    const dessinerCal = () => {
      const [a, m] = vue.split('-').map(Number), decal = (new Date(Date.UTC(a, m - 1, 1)).getUTCDay() + 6) % 7, premier = jourPlus(`${vue}-01`, -decal), mois = AGENDA.MOIS[m - 1];
      let rangs = '';
      for (let r = 0; r < 6; r++) {
        rangs += '<div role="row" class="tab-cal-rang">';
        for (let c = 0; c < 7; c++) {
          const j = jourPlus(premier, r * 7 + c), nom = `${JOURS_LONGS[new Date(`${j}T12:00:00Z`).getUTCDay()]} ${+j.slice(8)} ${AGENDA.MOIS[+j.slice(5, 7) - 1]} ${j.slice(0, 4)}`;
          rangs += `<span role="gridcell" id="tab-cal-${j}" data-j="${j}" aria-selected="${j === sel}" aria-label="${nom}" class="tab-cal-j${j.slice(0, 7) !== vue ? ' hors' : ''}${j === AUJ ? ' auj' : ''}${j === sel ? ' choisi' : ''}">${+j.slice(8)}</span>`;
        }
        rangs += '</div>';
      }
      cal.innerHTML = `<div class="tab-cal-tete"><button type="button" tabindex="-1" data-cal-mois="-1" aria-label="Mois précédent">‹</button><b id="tab-cal-titre">${mois[0].toUpperCase()}${mois.slice(1)} ${a}</b><button type="button" tabindex="-1" data-cal-mois="1" aria-label="Mois suivant">›</button></div>
        <div class="tab-cal-grille" role="grid" aria-labelledby="tab-cal-titre"><div role="row" class="tab-cal-rang tab-cal-sem">${['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map((s, i) => `<span role="columnheader" abbr="${JOURS_LONGS[(i + 1) % 7]}">${s}</span>`).join('')}</div>${rangs}</div>`;
      if ($(`#tab-cal-${sel}`, cal)) champ.setAttribute('aria-activedescendant', `tab-cal-${sel}`); else champ.removeAttribute('aria-activedescendant');
    };
    const aller = (j, ecrireChamp) => { sel = j; vue = j.slice(0, 7); if (ecrireChamp) champ.value = jjmmaaaa(j); dessinerCal(); };
    dessinerCal();
    const placer = () => placerSous(cal, td);
    placer();
    window.addEventListener('resize', placer); $('#tab-cadre')?.addEventListener('scroll', placer);
    cal.addEventListener('mousedown', e => e.preventDefault());   // (le champ garde le focus : sinon son blur fermerait la saisie)
    cal.addEventListener('click', e => {
      const nav = e.target.closest('[data-cal-mois]'), jour = e.target.closest('[data-j]');
      if (nav) { vue = moisPlus(`${vue}-01`, +nav.dataset.calMois).slice(0, 7); dessinerCal(); }
      else if (jour) { champ.value = jjmmaaaa(jour.dataset.j); fermerEdition({ valider: true }); }
    });
    champ.addEventListener('input', () => { const j = lireJour(champ.value, depart); if (j) { sel = j; vue = j.slice(0, 7); dessinerCal(); } });   // (ce qu'on tape déplace le calendrier)
    return {
      el: cal,
      // une touche du champ : le calendrier la prend (rend vrai) ou la laisse au champ (Suppr, Retour arrière : le texte s'efface ; rien ne remonte à la grille)
      touche(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return false;
        if (e.key === 'Delete' || e.key === 'Backspace') { e.stopPropagation(); return false; }
        if (e.shiftKey) return false;
        const pas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
        const n = pas ? jourPlus(sel, pas) : e.key === 'PageUp' ? moisPlus(sel, -1) : e.key === 'PageDown' ? moisPlus(sel, 1) : null;
        if (!n) return false;
        e.preventDefault(); e.stopPropagation();
        aller(n, true);
        return true;
      },
      fermer() {
        window.removeEventListener('resize', placer); $('#tab-cadre')?.removeEventListener('scroll', placer);
        cal.remove();
        ['role', 'aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-activedescendant'].forEach(a => champ.removeAttribute(a));
      },
    };
  }

  // ———— écrire dans une case
  // sansGarde, col : la suite du garde-fou d'une date « période » (gardePeriode) — la case s'écrit malgré tout, éventuellement par une autre
  // colonne que la sienne (« Déplacer le début »)
  function editer(initial = null, { sansGarde = false, col = null } = {}) {
    const x = ligne(T.actif.l), c = col || T.cols[T.actif.c];
    if (!x || !c) return;
    if (x.neuve && !CASES_NEUVES.includes(c.k)) return etat('Cette case se remplit quand la date existe : écrivez d’abord son jour et son spectacle.');
    if (c.type === 'action') return ouvrirFiche();
    if (c.type === 'lecture') {
      if (c.niveau === 'lieu') { const j = T.cols.findIndex(y => y.k === 'lieu'); etat('La commune vient de la fiche du lieu : changez le lieu.'); if (j >= 0) { activer(T.actif.l, j); editer(); } return; }
      const lien = c.lien?.(x); if (lien) { location.hash = lien; return; }   // (la feuille de route, la piste : la case mène à leur page)
      return etat(`${c.l} : ${c.pourquoi || 'en lecture seule'}.`);
    }
    const raison = c.fige?.(x); if (raison) return etat(`${raison}.`);
    if (c.type === 'riche') return ouvrirFiche();   // (les précisions du site s'écrivent dans la fiche, où l'on met en forme et où l'on ajoute des liens)
    if (!sansGarde && c.niveau === 'seance' && !x.r && !x.neuve) return gardePeriode(x, c, initial);
    if (c.type === 'case') return ecrire([{ x, col: c, v: !c.val(x) }]);
    if (c.type === 'presence') return basculer(x, c);
    if (c.type === 'lieu') return editerLieu(x, c, initial);
    if (c.type === 'equipe') return editerEquipe(x, c, initial);
    if (c.type === 'seances') return editerSeances(x, c);
    const td = cellule(T.actif.l, T.actif.c);
    const date = c.type === 'jour' && natif(), heure = c.type === 'heure' && natif();
    const el = document.createElement(c.type === 'choix' ? 'select' : c.type === 'long' ? 'textarea' : 'input');
    el.className = 'tab-ed';
    el.setAttribute('aria-label', `${c.l}${c.niveau === 'date' && x.n > 1 ? ` (pour les ${x.n} séances de la date)` : ''}`);
    if (c.type === 'choix') el.innerHTML = `${x.neuve ? '<option value="">—</option>' : ''}${c.choix().map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(c.val(x)) ? ' selected' : ''}>${esc(l)}</option>`).join('')}`;
    else {
      if (el.tagName === 'INPUT') { el.type = date ? 'date' : heure ? 'time' : c.type === 'lien' ? 'url' : 'text'; if (heure) el.step = 300; el.autocomplete = 'off'; }
      el.value = initial ?? (date ? c.val(x) : c.type === 'heure' ? (heure ? c.val(x) : heureT(c.val(x))) : c.type === 'jour' ? jjmmaaaa(c.val(x)) : c.val(x));
      if (c.type === 'jour' && !date) el.placeholder = 'jj/mm/aaaa';
      if (c.type === 'heure' && !heure) el.placeholder = '20h30';
    }
    td.classList.add('en-edition');
    td.append(el);
    // la zone de texte des notes reprend la taille qu'on lui a donnée (resize: both) ; fermerEdition la garde
    if (c.type === 'long' && typeof FENETRES !== 'undefined' && FENETRES.actif()) {
      const t = FENETRES.taille(`tab-ed-${c.k}`);
      if (t && typeof t === 'object') { if (t.l) el.style.width = `${t.l}px`; if (t.h) el.style.height = `${t.h}px`; }
    }
    T.edition = { x, col: c, el, td, l: T.actif.l, c: T.actif.c, taille0: c.type === 'long' ? [el.offsetWidth, el.offsetHeight] : null };
    el.focus();
    if (initial == null && el.select && c.type !== 'choix') el.select();
    if (c.type === 'jour' && !date) { const ref = /^\d{4}-\d{2}-\d{2}$/.test(c.val(x) || '') ? c.val(x) : AUJ; T.edition.cal = poserCal(td, el, lireJour(el.value, ref) || ref); }   // (au doigt, le champ de date du téléphone)
    if (c.niveau === 'date' && x.n > 1) etat(`${c.l} : vaut pour les ${x.n} séances de cette date.`);
    el.addEventListener('keydown', e => {
      if (T.edition?.cal?.touche(e)) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fermerEdition({ valider: false }); return; }
      if (e.key === 'Enter' && !(c.type === 'long' && e.shiftKey)) { e.preventDefault(); fermerEdition({ valider: true, aller: e.shiftKey ? 'haut' : 'bas' }); return; }
      if (e.key === 'Tab') { e.preventDefault(); fermerEdition({ valider: true, aller: e.shiftKey ? 'gauche' : 'droite' }); }
    });
    el.addEventListener('blur', () => { if (T.edition?.el === el) fermerEdition({ valider: true, focus: false }); });
  }
  // la case d'une matrice (Entrée, Espace, un clic) : elle prend l'état suivant — ✓ ↔ ✕ pour qui est de la tournée, rien ↔ ⟳ pour les autres —,
  // par ecrire() comme toute case (la file, la pile d'annulation, les états d'une case) ; la phrase d'état dit qui sera prévenu, par la règle du
  // déclencheur. Une ligne qui porte une fonction ou une note ne s'efface jamais d'un clic : la fenêtre de la date la retire.
  function basculer(x, c) {
    const v = c.suivant(x);
    if (v === c.val(x)) return etat(`${c.l} : cette ligne porte une fonction ou une note, elle se retire dans la fiche de la date (Ctrl+Entrée).`);
    const prevenir = c.prevenir(x, v);
    cellule(T.actif.l, T.actif.c)?.classList.add('en-cours');
    return ecrire([{ x, col: c, v }], { suite: prevenir.replace(/\.$/, '') });
  }
  // qui sera prévenu quand plusieurs cases de la matrice s'écrivent d'un coup (Suppr sur une plage, un collage) : la règle du déclencheur, date par
  // date, sur l'équipe qu'auront les dates une fois tous les changements posés ; → « 2 personnes seront prévenues » (vide quand personne ne l'est)
  function suitePresences(chs) {
    const parDate = new Map();
    chs.filter(ch => ch.col.type === 'presence' && !ch.x.neuve).forEach(ch => { if (!parDate.has(ch.x.d.id)) parDate.set(ch.x.d.id, []); parDate.get(ch.x.d.id).push(ch); });
    const avertis = new Set();
    parDate.forEach((xs, id) => {
      const d = E.dates.find(y => y.id === id); if (!d) return;
      const equipe = xs.reduce((eq, ch) => DISTRIBUTION.poserEtat(d, eq, ch.col.pid, ch.v), ecartsDate(id));
      const r = DISTRIBUTION.prevenus(d, equipeVoulue({ spectacle_id: +d.spectacle_id, equipe }) || []);
      [...r.partent, ...r.nePartentPlus].forEach(pid => avertis.add(pid));
    });
    return avertis.size ? `${pl(avertis.size, 'personne')} ${avertis.size > 1 ? 'seront prévenues' : 'sera prévenue'}` : '';
  }
  function fermerEdition({ valider = true, aller = null, focus = true } = {}) {
    const ed = T.edition; if (!ed) return;
    const { x, col, el, td } = ed;
    let v;
    if (valider && x.neuve && el.value === '') valider = false;   // (la ligne vide du bas : rien d'écrit, rien à enregistrer)
    if (valider) {
      const brut = el.value;
      v = col.type === 'choix' ? col.choix().find(([y]) => String(y) === brut)?.[0] : (col.type === 'jour' && el.type === 'date') ? brut || undefined : (col.type === 'heure' && el.type === 'time') ? brut : col.lire(brut, x);
      if (v === undefined || (v === '' && !col.vider && col.type !== 'heure')) {
        const conseil = col.erreurLire ? ` ${typeof col.erreurLire === 'function' ? col.erreurLire(brut, x) : col.erreurLire}` : col.type === 'jour' ? (/^\s*du\s|\sau\s|→/i.test(brut) ? ' Une période n’est pas un jour : écrivez un seul jour, par exemple 5/11/2026.' : ' Écrivez par exemple 5/11/2026.') : col.type === 'heure' ? ' Écrivez par exemple 20h30.' : '';
        etat(`${col.l} : « ${brut} » n’est pas reconnu${focus ? '' : ', la case garde sa valeur'}.${conseil}`, 'erreur');
        if (focus) { el.focus(); return; }
        valider = false;
      }
    }
    T.edition = null;
    ed.cal?.fermer();
    if (ed.taille0 && el.isConnected && typeof FENETRES !== 'undefined' && (el.offsetWidth !== ed.taille0[0] || el.offsetHeight !== ed.taille0[1])) FENETRES.garder(`tab-ed-${col.k}`, { l: el.offsetWidth, h: el.offsetHeight });
    el.remove(); td.classList.remove('en-edition');
    if (valider && JSON.stringify(v) !== JSON.stringify(col.val(x))) { td.innerHTML = esc(apercu(col, v)); td.classList.add('en-cours'); if (T.htmls) T.htmls[ed.l] = null; ecrire([{ x, col, v }]); }
    else rattraper();
    if (aller === 'bas') activer(T.actif.l + 1, T.actif.c, { focus });
    else if (aller === 'haut') activer(T.actif.l - 1, T.actif.c, { focus });
    else if (aller === 'droite') activer(T.actif.l, T.actif.c + 1, { focus });
    else if (aller === 'gauche') activer(T.actif.l, T.actif.c - 1, { focus });
    else if (focus) marquer(true);
  }
  // ———— le garde-fou d'une date « période » (une résidence, une répétition : des jours, aucune séance) : écrire dans une case de séance (l'heure, le
  // public, la note…) créerait une séance en silence, et la période deviendrait un jour. À l'écriture, la case demande d'abord : « Ajouter une séance ce
  // jour » (la période devient un jour), pour le jour « Déplacer le début » (la fin ne passe pas avant), ou « Annuler ». C'est un menu des gestes
  // (GESTES.ouvrir, source clavier) sur la case, que actionsCase construit ; le collage et Suppr, eux, n'écrivent jamais dans une telle case.
  function gardePeriode(x, c, initial) {
    const td = cellule(T.actif.l, T.actif.c);
    T.garde = { x, c, initial, l: T.actif.l, j: T.actif.c };
    if (td && typeof GESTES !== 'undefined' && GESTES.ouvrir(td, { source: 'clavier' })) return;
    T.garde = null;
    etat('Cette date est une période : elle n’a pas de séance. Ajoutez la séance dans la fiche de la date (Ctrl+Entrée).');
  }
  const debutDePeriode = c => ({ ...c, instantane: true, val: x => x.d.debut, ecrire: (F, x, v) => { F.debut = v; if (!F.fin || F.fin < v) F.fin = v; } });
  // le dessin de l'icône « fiche » de la grille vient de la bibliothèque (ICONES.TRACES.fiche) : une règle de masque posée une fois, sans nœud par ligne
  function poserIconeFiche() {
    if (document.getElementById('tab-fiche-masque') || typeof ICONES === 'undefined' || !ICONES.TRACES.fiche) return;
    const url = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONES.TRACES.fiche}</svg>`)}") center / contain no-repeat`;
    const st = document.createElement('style'); st.id = 'tab-fiche-masque';
    st.textContent = `.tableur td.tab-fiche::before { -webkit-mask: ${url}; mask: ${url}; }`;
    document.head.append(st);
  }
  // la date dans le tiroir, sur le champ de la case (Ctrl+Entrée, l'icône « fiche », « Ouvrir la date » du menu d'une case) : la grille se redessine
  // derrière après chaque enregistrement de la fiche et à sa fermeture (apres), et le focus revient à la case (depuis : une fonction, la case
  // d'origine n'est plus dans le document une fois la ligne redessinée) ; rien dans l'adresse que le tiroir n'y mette déjà
  function ouvrirFiche(l = T.actif.l, c = T.actif.c) {
    const x = ligne(l), col = T.cols[c];
    if (!x || !col) return;
    if (x.neuve || x.d.id == null) return etat('Cette date n’existe pas encore : écrivez d’abord son jour et son spectacle.');
    const id = x.d.id, cle = x.cle, k = col.k, href = `#/representations/${id}`;
    activer(l, c, { focus: false });
    if (typeof TIROIR === 'undefined' || !TIROIR.peut(href)) { location.hash = href; return; }
    TIROIR.ouvrir(href, {
      viser: col.type === 'action' ? '' : col.viser?.(x) || '',
      depuis: () => {
        if (!$('#tab-corps')) return;
        let l2 = T.lignes.findIndex(y => y.cle === cle); if (l2 < 0) l2 = T.lignes.findIndex(y => y.d.id === id);
        if (l2 >= 0) activer(l2, Math.max(0, T.cols.findIndex(y => y.k === k)), { focus: true });
      },
      apres: () => { if ($('#tab-corps')) redessiner([id]); },
    });
  }
  // le menu d'une case (clic droit, Maj+F10, appui long) : celui du garde-fou quand editer vient de le demander, sinon la date et la séance de la ligne
  let menusPoses = false;
  function poserMenus() {
    if (menusPoses || typeof GESTES === 'undefined' || GESTES.etroit()) return;   // (le téléphone ne change pas : ni menu de case, ni appui long qui le réclame)
    menusPoses = true;
    GESTES.menu({ cible: '#tab-corps td[data-c]', titre: td => (T.titreGarde || `Date du ${jourCourt(ligne(+td.parentNode.dataset.l)?.d.debut || AUJ)}`), actions: actionsCase });
  }
  function actionsCase(td) {
    const tr = td.parentNode, l = tr.hasAttribute('data-neuve') ? T.lignes.length : +tr.dataset.l, c = +td.dataset.c, x = ligne(l), col = T.cols[c], g = T.garde;
    T.garde = null;
    T.titreGarde = g && g.x === x ? 'Cette date est une période' : '';   // (GESTES demande le titre après les actions : le motif se garde ici)
    if (!x || !col || x.neuve) return [];
    if (g && g.x === x) {
      const reprendre = opts => { activer(g.l, g.j, { focus: false }); editer(g.initial, { sansGarde: true, ...opts }); };
      return [
        { libelle: 'Ajouter une séance ce jour', detail: 'la période devient un jour', icone: icone('plus'), faire: () => reprendre({}) },
        ...(g.c.k === 'jour' ? [{ libelle: 'Déplacer le début', detail: 'la période commence ce jour-là', icone: icone('calendrier'), faire: () => reprendre({ col: debutDePeriode(g.c) }) }] : []),
        { libelle: 'Annuler', icone: icone('croix'), faire: () => marquer(true) },
      ];
    }
    const seule = repsDe(x.d.id).length < 2;
    return [
      { libelle: 'Ouvrir la date dans le tiroir', raccourci: 'Ctrl Entrée', icone: icone('fiche'), faire: () => ouvrirFiche(l, c) },
      ...(modeMatrice() ? [{ libelle: 'Étendre à…', detail: 'l’équipe de cette date, sur d’autres', icone: icone('dupliquer'), faire: () => etendre(x, equipeIds(x.d)) }] : []),
      ...(x.r && !modeSimple() ? [{ libelle: 'Détacher cette séance dans sa propre date', detail: seule ? 'la date n’a qu’une séance' : '', icone: icone('dupliquer'), desactive: seule, faire: () => detacher(x) }] : []),
    ];
  }
  // ce qu'une case montre pendant l'enregistrement
  const prenomDe = id => prenoms([id])[0] || '';
  const apercu = (col, v) => col.type === 'presence' ? DISTRIBUTION.dit(v) : col.type === 'ecarts' ? (v.length ? v.map(e => `${e.present ? '＋' : '−'}${prenomDe(e.personne_id)}`).join(' ') : 'la distribution d’origine')
    : col.type === 'seances' ? v.map(r => heureT(r.heure)).filter(Boolean).join(' · ') : col.type === 'heure' ? heureT(v) : col.type === 'jour' ? jourCourt(v) : col.type === 'choix' ? (col.choix().find(([y]) => String(y) === String(v)) || [null, ''])[1] : col.type === 'lieu' ? lieuTexte(lieu(v)) : col.type === 'equipe' ? prenoms(v).join(', ') : String(v ?? '');

  // ———— enregistrer : par date, son formulaire (dateVersForm) avec ce qui change, puis ecrireDate — le chemin de la fiche
  // changements : [{ x (la ligne), col, v }]. Les écritures passent l'une après l'autre (T.file).
  // prevenir : le nombre de dates dont le jour change et dont l'équipe est prévenue par la base (« Date déplacée »), dit pendant l'écriture
  function ecrire(changements, { annulable = true, dire = null, prevenir = 0, suite = '' } = {}) {
    // la ligne vide du bas ne s'écrit pas : elle se remplit (remplirNeuve), et se crée quand son jour et son spectacle y sont
    const neuves = changements.filter(ch => ch.x.neuve);
    if (neuves.length) { remplirNeuve(neuves); changements = changements.filter(ch => !ch.x.neuve); if (!changements.length) return Promise.resolve(true); }
    const parDate = new Map();
    changements.forEach(ch => { const id = ch.x.d.id; if (!parDate.has(id)) parDate.set(id, []); parDate.get(id).push(ch); });
    changements.forEach(ch => { const k = cleCase(ch.x, ch.col); T.erreurs.delete(k); T.refus.delete(k); });   // (réécrite : la case n'est plus en erreur)
    if (T.echec) { T.echec.changements = T.echec.changements.filter(ch => !changements.some(y => cleCase(y.x, y.col) === cleCase(ch.x, ch.col))); if (!T.echec.changements.length) T.echec = null; }
    let reste = [...changements];   // ce que la base n'a pas encore pris : en cas de refus, les cases qu'on rend en erreur
    T.attente++;
    etat(prevenir ? `Enregistrement… l’équipe de ${pl(prevenir, 'date')} est prévenue.` : 'Enregistrement…', 'encours');
    const tache = async () => {
      const defaire = [], faits = [];
      for (const [id, chs] of parDate) {
        const d = E.dates.find(y => y.id === id);
        if (!d) throw new Error('Cette date n’existe plus (elle a été supprimée ailleurs).');
        // (l'instantané de la date : une case de séance sans séance, ou une case qui décale la date ou refait ses séances — le jour et les
        // séances du Simple —, qu'« Annuler » rend d'un bloc)
        const F = dateVersForm(d), instantane = chs.some(ch => (!ch.x.r && ch.col.niveau === 'seance') || ch.col.instantane) ? clone(F) : null;
        const avant = chs.map(ch => ({ x: ch.x, col: ch.col, v: ch.col.val({ ...ch.x, d, r: ch.x.r && E.reps.find(r => r.id === ch.x.r.id) }) }));
        // (les séances d'abord : celles qu'on crée prennent le jour d'avant, que le décalage du jour, s'il est du même coup, emporte avec les autres)
        [...chs].sort((a, b) => (b.col.k === 'seances') - (a.col.k === 'seances')).forEach(ch => ch.col.ecrire(F, ch.x, ch.v));
        const retirees = instantane ? new Set(instantane.representations.filter(y => y.id && !F.representations.some(z => z.id === y.id)).map(y => y.id)) : null;   // (celles que ce geste retire : « Annuler » les recrée)
        const manque = manqueDate(F); if (manque) throw new Error(manque);
        T.recents.set(id, Date.now());
        const { equipeOk } = await ecrireDate(F, d, { libre: !!(F.intitule || '').trim() });   // (libre se calcule sur la ligne écrite : une ligne du site posée sur une date qui n'en avait pas ne se perd pas, la vider rend la ligne au site)
        T.recents.set(id, Date.now());
        if (!equipeOk) throw new Error('La date est enregistrée, mais pas son équipe.');
        defaire.push(instantane ? { instantane, id, retirees } : { avant });
        faits.push(...chs);
        reste = reste.filter(ch => !chs.includes(ch));
      }
      return { defaire, faits };
    };
    const p = T.file.then(tache);
    T.file = p.catch(() => {});
    return p.then(({ defaire, faits }) => {
      T.attente--;
      const un = faits[0], base = dire || (faits.length === 1 ? `${un.col.l} ${un.col.niveau === 'date' && un.x.n > 1 ? `des ${un.x.n} séances ` : ''}du ${jourCourt(un.x.r?.jour || un.x.d.debut)} : ${apercu(un.col, un.v) || 'vide'}` : `${pl(faits.length, 'case')} sur ${pl(parDate.size, 'date')}`);
      const phrase = suite ? `${base}. ${suite}` : base;   // (suite : ce que l'écriture fait savoir à l'équipe — « 1 personne sera prévenue (…) »)
      if (annulable) T.pile.push({ libelle: phrase, ids: [...parDate.keys()], defaire: async () => {
        for (const u of defaire) {
          if (u.instantane) {
            const d = E.dates.find(y => y.id === u.id); if (!d) continue;
            const F = u.instantane;
            F.representations = F.representations.filter(r => !r.id || u.retirees.has(r.id) || E.reps.some(y => y.id === r.id));   // (une séance retirée ailleurs entre-temps ne revient pas ; celle que ce geste a retirée revient, recréée)
            F.representations.forEach(r => { if (u.retirees.has(r.id)) delete r.id; });
            await ecrireDate(F, d, { libre: !!(F.intitule || '').trim() }); T.recents.set(u.id, Date.now());
          }
          else if (!(await ecrire(u.avant, { annulable: false, dire: 'retour en arrière' }))) throw new Error('la base a refusé');
        }
      } });
      if (!T.attente) etat(`Enregistré : ${phrase}.`, 'ok', annulable);
      redessiner([...parDate.keys()]);
      return true;
    }, err => {
      T.attente--;
      refuser(reste.length ? reste : changements, err?.message || String(err), { annulable, dire, prevenir });
      redessiner([...parDate.keys()]);
      return false;
    });
  }
  // la base a refusé (ou n'a pas pu) : les cases qu'elle n'a pas prises restent cerclées de rouge avec ce qu'on y avait écrit, le message en
  // infobulle ; la barre d'état le dit, avec « Reprendre » et « Réessayer ». Un refus qui suit un refus s'ajoute au premier. Les options de
  // l'écriture (annulable, dire, prevenir : le message du collage, « l'équipe de n dates est prévenue ») sont gardées pour « Réessayer » ;
  // quand le refus en rejoint un autre, la phrase ne dit plus que le dernier geste : elle n'est pas rejouée.
  function refuser(chs, message, options = {}) {
    const avant = T.echec ? T.echec.changements.filter(ch => !chs.some(y => cleCase(y.x, y.col) === cleCase(ch.x, ch.col))) : [];
    T.echec = { message, changements: [...avant, ...chs], options: avant.length ? { annulable: options.annulable } : options };
    chs.forEach(ch => { const k = cleCase(ch.x, ch.col); T.erreurs.set(k, message); T.refus.set(k, apercu(ch.col, ch.v)); });
    etat(`Pas enregistré : ${message}`, 'erreur', false, { echec: true });
  }
  // « Reprendre » : les cases refusées reprennent la valeur qu'elles avaient (l'erreur s'efface, rien n'est écrit)
  function reprendre() {
    const e = T.echec; if (!e) return;
    const ids = [...new Set(e.changements.map(ch => ch.x.d.id))];
    e.changements.forEach(ch => { const k = cleCase(ch.x, ch.col); T.erreurs.delete(k); T.refus.delete(k); });
    T.echec = null;
    etat('Les cases refusées ont repris leur valeur d’avant.');
    redessiner(ids);
    marquer(true);
  }
  // « Réessayer » : la même écriture, rejouée (les lignes sont reprises telles qu'elles sont maintenant : le temps réel a pu les refaire)
  function reessayer() {
    const e = T.echec; if (!e) return;
    const chs = e.changements.map(ch => ({ ...ch, x: T.lignes.find(y => y.cle === ch.x.cle) || ch.x }));
    chs.forEach(ch => {   // (la case reprend l'italique de l'écriture en cours, sans attendre)
      const l = T.lignes.findIndex(y => y.cle === ch.x.cle), j = T.cols.findIndex(y => y.k === ch.col.k), td = l >= 0 && j >= 0 ? cellule(l, j) : null;
      if (td) { td.classList.remove('erreur'); td.removeAttribute('title'); td.removeAttribute('aria-invalid'); td.classList.add('en-cours'); }
    });
    ecrire(chs, e.options || {});
  }
  async function annuler() {
    const u = T.pile.pop();
    if (!u) return etat('Rien à annuler.');
    etat('Retour en arrière…', 'encours');
    try { await u.defaire(); etat(`Annulé : ${u.libelle}.`, 'ok'); } catch (e) { etat(`Retour impossible : ${e?.message || e}`, 'erreur'); }
    dessinerLignes(u.ids);   // (sans ids — un ajout, une suppression, « Étendre à… » : toute la grille)
    marquer(true);
  }
  // Suppr : vider les cases choisies (celles qui peuvent l'être)
  function vider() {
    const p = plage(), chs = [];
    for (let l = p.l0; l <= p.l1; l++) for (let j = p.c0; j <= p.c1; j++) {
      const x = T.lignes[l], c = T.cols[j];
      if (!x || !c || !(c.vider || c.type === 'heure' || c.type === 'case') || c.fige?.(x) || (!x.r && c.niveau === 'seance')) continue;   // (la case d'une séance sur une date sans séance : rien à vider, et jamais de séance créée en silence)
      const v = c.type === 'case' ? false : c.type === 'equipe' ? [] : c.type === 'lieu' ? null : c.type === 'presence' ? c.defaut(x) : '';   // (la matrice : Suppr rend la case à la distribution)
      if (JSON.stringify(c.val(x)) !== JSON.stringify(v)) chs.push({ x, col: c, v });
    }
    if (!chs.length) return etat(nbCases() > 1 ? 'Rien à vider dans ces cases.' : `${T.cols[T.actif.c]?.l} : cette case ne se vide pas.`);
    // une date ne s'écrit qu'une fois par case de date (la même valeur pour ses séances)
    const vus = new Set();
    const aEcrire = chs.filter(ch => { const k = ch.col.niveau === 'seance' ? `${ch.x.cle}|${ch.col.k}` : `${ch.x.d.id}|${ch.col.k}`; if (vus.has(k)) return false; vus.add(k); return true; });
    ecrire(aEcrire, { suite: suitePresences(aEcrire) });
  }

  // ==================== les fenêtres posées sur une case (le lieu, la distribution)
  // ———— poser une boîte (une fenêtre, le petit calendrier) sous une case, ou au-dessus quand il n'y a pas la place, sans sortir de l'écran
  function placerSous(boite, td) {
    if (!td.isConnected) return;
    const r = td.getBoundingClientRect(), w = Math.min(boite.offsetWidth, innerWidth - 16), h = boite.offsetHeight;
    let top = r.bottom + 4;
    if (top + h > innerHeight - 8 && r.top - h - 4 > 8) top = r.top - h - 4;
    boite.style.left = `${Math.min(Math.max(8, r.left), innerWidth - w - 8)}px`;
    boite.style.top = `${Math.max(8, Math.min(top, innerHeight - h - 8))}px`;
  }
  // ———— une fenêtre posée sur la case (le lieu, la distribution) : Échap la ferme ; un clic à côté la ferme aussi
  // cle : la fenêtre a un coin qu'on tire (FENETRES, fenetres.<cle>), et rouvre à la largeur retenue ; ouvreur : le bouton qui l'ouvre
  // (un clic sur lui ne la ferme pas avant de la rouvrir) ; retour : où va le focus quand elle se ferme (sinon la case active)
  function poser(td, html, { large = false, label = '', cle = '', ouvreur = null, retour = null, classe = '', origine = 0 } = {}) {
    fermerPop(false);
    const pop = document.createElement('div');
    pop.className = `tab-pop${large ? ' large' : ''}${classe ? ` ${classe}` : ''}`;   // (classe : « distribution », 520 px d'origine, un corps qui défile)
    pop.setAttribute('role', 'dialog');
    if (label) pop.setAttribute('aria-label', label);
    pop.innerHTML = html;
    document.body.append(pop);
    const placer = () => placerSous(pop, td);
    if (cle && typeof FENETRES !== 'undefined' && FENETRES.actif()) {
      const t = FENETRES.taille(cle), largeurOrigine = Math.min(origine || (large ? 430 : 340), innerWidth - 16);
      let naturelle = null;   // la hauteur que le contenu donne à la largeur d'origine, mesurée au geste (le contenu peut arriver après l'ouverture)
      const mesurer = () => {
        const l = pop.style.width, m = pop.style.minHeight;
        pop.style.width = `${largeurOrigine}px`; pop.style.minHeight = '';
        naturelle = pop.offsetHeight;
        pop.style.width = l; pop.style.minHeight = m;
        return naturelle;
      };
      if (t && typeof t === 'object') { if (t.l) pop.style.width = `${Math.min(t.l, innerWidth - 16)}px`; if (t.h) pop.style.minHeight = `${t.h}px`; }   // (la taille retenue, relue avant de placer la fenêtre)
      FENETRES.poignee(pop, { cle, axe: 'xy', bord: 'coin', libelle: 'Taille de la fenêtre', lire: () => ({ l: pop.offsetWidth, h: pop.offsetHeight }),
        defaut: () => ({ l: largeurOrigine, h: mesurer() }),
        ecrire: v => { pop.style.width = `${v.l}px`; pop.style.minHeight = naturelle !== null && v.h <= naturelle ? '' : `${v.h}px`; placer(); } });   // (revenue à la hauteur d'origine, la fenêtre reprend celle de son contenu)
    }
    placer();
    const dehors = e => { if (!pop.contains(e.target) && !e.target.closest('.suggestions') && !(ouvreur && ouvreur.contains(e.target))) { const v = T.pop?.valider; if (v) v(); else fermerPop(false); } };
    const echap = e => { if (e.key === 'Escape' && T.pop?.el === pop) { e.preventDefault(); e.stopPropagation(); fermerPop(); } };
    setTimeout(() => document.addEventListener('mousedown', dehors, true), 0);
    pop.addEventListener('keydown', echap);
    window.addEventListener('resize', placer); $('#tab-cadre')?.addEventListener('scroll', placer);
    T.pop = { el: pop, td, ouvreur, retour, valider: null, nettoyer: () => { document.removeEventListener('mousedown', dehors, true); window.removeEventListener('resize', placer); $('#tab-cadre')?.removeEventListener('scroll', placer); }, placer };
    return pop;
  }
  // un appui ailleurs que dans la fenêtre : elle se ferme (en validant, si elle a de quoi valider), comme au mousedown de poser()
  function fermerPopDehors() { if (!T.pop) return; const v = T.pop.valider; if (v) v(); else fermerPop(false); }
  function fermerPop(rendre = true) {
    const p = T.pop; if (!p) return;
    T.pop = null; p.nettoyer(); p.el.remove();
    p.ouvreur?.setAttribute('aria-expanded', 'false');
    rattraper();
    if (rendre) { if (p.retour) p.retour(); else marquer(true); }
  }
  // le lieu : la recherche des lieux de l'administration (et « Nouveau lieu »)
  function editerLieu(x, c, initial) {
    const td = cellule(T.actif.l, T.actif.c);
    const pop = poser(td, `<p class="tab-pop-titre">Lieu${x.n > 1 ? ` <small>pour les ${x.n} séances de la date</small>` : ''}</p><div id="tab-lieu"></div>
      <div class="tab-pop-pied">${x.d.lieu_id != null ? '<button type="button" class="btn petit" data-sans-lieu>Sans lieu</button>' : ''}<button type="button" class="btn petit lien" data-fermer>Fermer</button></div>`, { label: 'Lieu de la date', cle: 'tab-pop-lieu' });
    comboLieu(pop, 'tab-lieu', x.d.lieu_id, id => { fermerPop(); if (id !== x.d.lieu_id) ecrire([{ x, col: c, v: id }]); });
    const inp = $('#tab-lieu input', pop);
    T.pop.placer();
    inp.focus();
    if (initial) { inp.value = initial; inp.dispatchEvent(new Event('input')); } else inp.select();
    pop.addEventListener('click', e => {
      if (e.target.closest('[data-fermer]')) fermerPop();
      else if (e.target.closest('[data-sans-lieu]')) { fermerPop(); ecrire([{ x, col: c, v: null }]); }
    });
  }

  // la distribution : la fenêtre de DISTRIBUTION (« En tournée », « Remplaçants et renforts », les puces de métier, qui sera prévenu) ; le tableur
  // la pose (poser : Échap, un clic à côté, le coin qu'on tire) et lui prête ses gestes. Enregistrer écrit les écarts de la date par ecrire(),
  // comme toute case : la file, la pile d'annulation, les états d'une case. « Étendre à… » enregistre d'abord, puis pose l'équipe ailleurs.
  const ecartsDeLaDate = { k: 'distribution', l: 'Distribution', niveau: 'date', type: 'ecarts', val: x => ecartsDate(x.d.id), ecrire: (F, x, v) => { F.equipe = v.map(e => ({ ...e })); } };
  function editerEquipe(x, c, initial) {
    const td = cellule(T.actif.l, T.actif.c), d = x.d;
    DISTRIBUTION.fenetre(td, d, {
      poser: (html, opts) => poser(td, html, opts),
      fermer: rendre => fermerPop(rendre),
      valider: f => { T.pop.valider = f; },
      placer: () => T.pop?.placer(),
      enregistrer: ecarts => ecrire([{ x, col: ecartsDeLaDate, v: ecarts }], { suite: DISTRIBUTION.phrase(DISTRIBUTION.prevenus(d, equipeVoulue({ spectacle_id: +d.spectacle_id, equipe: ecarts }) || [])).replace(/\.$/, '') }),
      etendre: ids => etendre(x, ids),
    }, { initial, n: x.n, jour: x.r?.jour || d.debut });
  }

  // ———— les séances d'une date (le Simple) : une fenêtre qui les liste (jour, heure, fin), ✕ pour en retirer une, ＋ pour en ajouter ; Entrée,
  // « Enregistrer » ou un clic à côté écrivent la liste d'un coup, par ecrire() comme toute case (la pile d'annulation, l'état) ; Échap renonce
  function editerSeances(x, c) {
    const td = cellule(T.actif.l, T.actif.c), d = x.d, avecFin = !!E.sql3, periode = d.fin && d.fin !== d.debut && !x.rs.length;
    const lignesS = x.rs.map(repSimple), sansFin = avecFin ? '' : ' sans-fin';
    const pop = poser(td, `<p class="tab-pop-titre" id="tab-sc-titre">Séances · ${esc(jourCourt(d.debut))}${d.fin && d.fin !== d.debut ? ` <small>→ ${esc(jourCourt(d.fin))}</small>` : ''}</p>
      ${periode ? `<p class="aide">Cette date est une période (${esc(jourSansAn(d.debut))} → ${esc(jourSansAn(d.fin))}) : ajouter une séance la fixe au jour.</p>` : ''}
      <div class="tab-sc-tete${sansFin}" aria-hidden="true"><span>Jour</span><span>Heure</span>${avecFin ? '<span>Fin</span>' : ''}<span></span></div>
      <ul class="tab-sc-liste${sansFin}" id="tab-sc-liste"></ul>
      <p class="tab-sc-erreur" id="tab-sc-erreur" role="alert" hidden></p>
      <div class="tab-pop-pied"><button type="button" class="btn petit" data-sc-plus>＋ Séance</button><button type="button" class="btn principal petit" data-sc-ok>Enregistrer</button><button type="button" class="btn petit lien" data-fermer>Annuler</button></div>
      <p class="aide">Entrée enregistre, Échap renonce.</p>`, { label: `Séances du ${jourCourt(d.debut)}` });
    pop.classList.add('seances');
    const liste = $('#tab-sc-liste', pop), erreur = $('#tab-sc-erreur', pop);
    const champ = (nom, i, valeur, aide, ex) => `<input type="text" data-sc="${nom}" value="${esc(valeur)}" placeholder="${ex}" aria-label="${aide} de la séance ${i + 1}" autocomplete="off" spellcheck="false">`;
    const rangee = (r, i) => `<li class="tab-sc" data-i="${i}">${champ('jour', i, jjmmaaaa(r.jour), 'Jour', 'jj/mm/aaaa')}${champ('heure', i, r.heure ? heureT(r.heure) : '', 'Heure', '20h30')}${avecFin ? champ('fin', i, r.fin ? heureT(r.fin) : '', 'Fin', '22h') : ''}<button type="button" class="btn petit lien" data-sc-retirer aria-label="Retirer la séance ${i + 1}">✕</button></li>`;
    liste.innerHTML = lignesS.map(rangee).join('');
    T.pop.placer();
    // la liste voulue : chaque rangée lue (une rangée laissée vide ne compte pas) ; faux, avec l'erreur dite, si l'une est illisible
    const lire = () => {
      const sortie = [], faux = [];
      $$('.tab-sc', liste).forEach((li, k) => {
        const r = lignesS[+li.dataset.i], [jb, hb, fb] = ['jour', 'heure', 'fin'].map(n => $(`[data-sc=${n}]`, li));
        if (!jb.value.trim() && !hb.value.trim() && !(fb && fb.value.trim())) return;
        const j = lireJour(jb.value, d.debut), h = lireHeure(hb.value), f = fb ? lireHeure(fb.value) : r.fin;
        jb.setAttribute('aria-invalid', String(!j)); hb.setAttribute('aria-invalid', String(h === undefined)); if (fb) fb.setAttribute('aria-invalid', String(f === undefined));
        if (!j) faux.push({ el: jb, dit: `séance ${k + 1} : le jour n’est pas reconnu (écrivez par exemple 5/11/2026)` });
        else if (h === undefined) faux.push({ el: hb, dit: `séance ${k + 1} : l’heure n’est pas reconnue (écrivez par exemple 20h30)` });
        else if (f === undefined) faux.push({ el: fb, dit: `séance ${k + 1} : l’heure de fin n’est pas reconnue (écrivez par exemple 22h)` });
        else sortie.push({ ...r, jour: j, heure: h, fin: f });
      });
      erreur.hidden = !faux.length; erreur.textContent = faux.length ? `${faux[0].dit[0].toUpperCase()}${faux[0].dit.slice(1)}.` : '';
      T.pop?.placer();
      if (faux.length) { faux[0].el.focus(); return false; }
      return trierReps(sortie);
    };
    const valider = () => {
      const sortie = lire();
      if (!sortie) return false;
      fermerPop();
      if (JSON.stringify(sortie) !== JSON.stringify(c.val(x))) return ecrire([{ x, col: c, v: sortie }]);
      return Promise.resolve(true);
    };
    T.pop.valider = valider;
    pop.addEventListener('click', e => {
      if (e.target.closest('[data-fermer]')) return fermerPop();
      if (e.target.closest('[data-sc-ok]')) return valider();
      if (e.target.closest('[data-sc-plus]')) {
        const dernier = [...$$('.tab-sc [data-sc=jour]', liste)].pop(), nouvelle = repSimple({ jour: (dernier && lireJour(dernier.value, d.debut)) || d.debut, public: pubDe(d) });
        lignesS.push(nouvelle);
        liste.insertAdjacentHTML('beforeend', rangee(nouvelle, lignesS.length - 1));
        T.pop.placer();
        $('.tab-sc:last-child [data-sc=heure]', liste).focus();
        return;
      }
      const retirer = e.target.closest('[data-sc-retirer]');
      if (retirer) {
        const li = retirer.closest('.tab-sc'), voisin = li.nextElementSibling || li.previousElementSibling;
        li.remove(); T.pop.placer();
        ($('[data-sc=heure]', voisin || pop) || $('[data-sc-plus]', pop)).focus();
      }
    });
    pop.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); valider(); return; }
      if (e.key !== 'Tab') return;
      const focalisables = $$('input, button', pop).filter(el => !el.disabled && el.offsetParent !== null), premier = focalisables[0], dernier = focalisables[focalisables.length - 1];
      if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
      else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
    });
    const premier = $('[data-sc=heure]', liste) || $('[data-sc-plus]', pop);
    premier.focus();
    if (premier.select) premier.select();
  }

  // ———— la ligne vide du bas du Simple : elle reçoit le jour, le spectacle, le lieu de la date à venir (T.brouillon), qui se crée dès que son
  // jour et son spectacle y sont (un nouvelle date, jamais fusionnée avec sa voisine), annoncée avec « Annuler »
  function remplirNeuve(chs) {
    chs.forEach(({ col, v }) => { if (col.k === 'jour') T.brouillon.jour = v; else if (col.k === 'spectacle') T.brouillon.spectacle = v; else if (col.k === 'lieu') T.brouillon.lieu = v; });
    if (T.brouillon.jour && ligneNeuve().d.spectacle_id) return creerDateNeuve();
    dessinerNeuve();
    etat(`Nouvelle date : il manque ${T.brouillon.jour ? 'le spectacle' : 'le jour'}.`);
  }
  function dessinerNeuve() {
    const corps = $('#tab-corps'); if (!corps || !T.neuve) return;
    finirTranches();   // (elle vient à la fin : les lignes d'avant doivent être là)
    const focus = corps.contains(document.activeElement), tr = $('tr[data-neuve]', corps);
    T.neuve = ligneNeuve();
    if (tr) tr.outerHTML = htmlLigne(T.neuve, T.lignes.length); else corps.insertAdjacentHTML('beforeend', htmlLigne(T.neuve, T.lignes.length));
    marquer(focus);
  }
  async function creerDateNeuve() {
    const b = { ...T.brouillon }, sp = ligneNeuve().d.spectacle_id;
    T.brouillon = { jour: '', spectacle: null, lieu: null };
    etat('Enregistrement…', 'encours');
    const tache = T.file.then(() => ajouterSeance({ jour: b.jour, heure: '', spectacle_id: sp, lieu_id: b.lieu, separee: true }));
    T.file = tache.catch(() => {});
    try {
      const a = await tache;
      T.pile.push({ libelle: a.texte, defaire: () => defaireAjout(a) });
      etat(`${a.texte[0].toUpperCase()}${a.texte.slice(1)}.`, 'ok', true);
      montrerAjouts([a.id]);
      const focus = !!$('#tab-corps')?.contains(document.activeElement);
      dessiner();
      // la case active reste sur la ligne vide, pour la suivante (elle est la dernière : activer() pose d'abord ce que les tranches n'ont pas posé) ;
      // la date neuve se place dans l'ordre des jours et clignote, une fois sa ligne posée
      activer(T.lignes.length, Math.max(0, T.cols.findIndex(y => y.k === 'jour')), { focus });
      const l = T.lignes.findIndex(y => y.d.id === a.id), tr = l >= 0 ? $(`#tab-corps tr[data-l="${l}"]`) : null;
      if (tr) $$('td', tr).forEach(td => td.classList.add('vient-d-ailleurs'));
    } catch (err) {
      T.brouillon = b;   // ce qu'on avait écrit reste sur la ligne
      etat(`Pas enregistré : ${err?.message || err}`, 'erreur');
      dessiner({ garder: true });
    }
  }

  // ==================== la distribution sur d'autres dates (« Étendre à… »)
  // ———— « Étendre à… » : la même distribution sur d'autres dates du même spectacle — la saison, l'année civile, cette date et les suivantes au
  // même lieu, ou les lignes choisies (la plage du tableur). Une fusion, pas un écrasement : la ligne d'une date visée qui porte une fonction ou
  // une note (« Remplace Lauren », « train de 14h12 ») est gardée telle quelle ; les autres remplaçants posés à la main sont signalés par
  // l'aperçu avant d'être remplacés. L'aperçu dit aussi combien de personnes seront prévenues (la règle du déclencheur : une date à venir, un
  // compte, une présence qui change). ids : les personnes de l'équipe voulue ; les fonctions sont celles de la date d'où l'on étend.
  function etendre(x, ids) {
    const d0 = E.dates.find(y => y.id === x.d.id) || x.d, sp = d0.spectacle_id, s = spectacle(sp), an = d0.debut.slice(0, 4);
    const p = plage(), horsJeu = dd => ['annulee', 'reportee'].includes(dd.statut);   // (une date annulée ou reportée n'a plus d'équipe à régler : la matrice la grise, « Étendre à… » ne la compte ni ne l'écrit)
    const choisies = T.ancre ? [...new Set(T.lignes.slice(p.l0, p.l1 + 1).filter(y => !horsJeu(y.d)).map(y => y.d.id))] : [];
    const portees = [['saison', `les dates de ${s ? `« ${s.titre} »` : 'ce spectacle'} de la saison ${d0.saison || ''}`, dd => dd.saison === d0.saison],
      ['annee', `les dates de ${s ? `« ${s.titre} »` : 'ce spectacle'} de l’année ${an}`, dd => dd.debut.slice(0, 4) === an || (dd.fin || dd.debut).slice(0, 4) === an],
      // (null === null serait vrai : deux dates sans lieu ne sont pas « au même lieu », comme dateVoisine)
      ...(d0.lieu_id != null ? [['lieu', `cette date et les suivantes au même lieu (${ouDit(d0.lieu_id)})`, dd => dd.lieu_id != null && dd.lieu_id === d0.lieu_id && dd.debut >= d0.debut]] : []),
      ...(choisies.length ? [['lignes', `les lignes choisies (${pl(choisies.length, 'date')})`, dd => choisies.includes(dd.id)]] : [])];
    const noms = xs => listeEt(xs.map(id => nomDe(personne(id))).filter(Boolean));
    const fonctions = Object.fromEntries(ecartsDate(d0.id).filter(e => e.present && e.fonction).map(e => [e.personne_id, e.fonction]));   // (qui remplace qui, sur la date d'où l'on étend)
    const aLaMain = e => !!((e.fonction || '').trim() || (e.note || '').trim());   // une ligne à fonction ou à note n'est jamais écrasée
    // les écarts qu'aura la date visée : l'équipe voulue, puis ses lignes à fonction ou note, gardées telles quelles
    const resultat = dd => {
      const gardees = ecartsDate(dd.id).filter(aLaMain);
      return [...ecartsPour(dd, ids, dd.spectacle_id, { fonctions }).filter(e => !gardees.some(g => g.personne_id === e.personne_id)), ...gardees];
    };
    const canon = (dd, ecarts) => JSON.stringify((equipeVoulue({ spectacle_id: dd.spectacle_id, equipe: ecarts }) || []).sort((a, b) => a.personne_id - b.personne_id));
    const dlg = document.createElement('dialog');
    dlg.className = 'tab-dialogue';
    dlg.setAttribute('aria-labelledby', 'tab-et-titre');
    const defaut = choisies.length ? 'lignes' : 'saison';
    dlg.innerHTML = `<form method="dialog" class="tab-dialogue-boite"><h2 id="tab-et-titre">Étendre la distribution</h2>
      <p>${ids.length ? `<b>${esc(noms(ids))}</b>` : '<b>Personne</b>'}${s ? ` · ${esc(s.titre)}` : ''}</p>
      <fieldset><legend>Sur</legend>${portees.map(([k, l]) => `<label class="case"><input type="radio" name="portee" value="${k}"${k === defaut ? ' checked' : ''}> ${esc(l)}</label>`).join('')}</fieldset>
      <label class="case"><input type="checkbox" id="tab-et-passees"> y compris les dates passées</label>
      <div class="tab-et-apercu" id="tab-et-apercu" aria-live="polite"></div>
      <div class="fm-boutons"><button type="button" class="btn principal" id="tab-et-ok">Appliquer</button><button type="button" class="btn" id="tab-et-non">Annuler</button></div></form>`;
    document.body.append(dlg);
    let cibles = [];
    const apercu = () => {
      const k = $('input[name=portee]:checked', dlg).value, passees = $('#tab-et-passees', dlg).checked, filtre = portees.find(y => y[0] === k)[2];
      const tous = E.dates.filter(dd => dd.spectacle_id === sp && !horsJeu(dd) && filtre(dd) && (passees || (dd.fin || dd.debut) >= AUJ));
      const autresSp = k === 'lignes' ? choisies.filter(id => E.dates.find(dd => dd.id === id)?.spectacle_id !== sp).length : 0;
      cibles = tous.filter(dd => canon(dd, resultat(dd)) !== canon(dd, ecartsDate(dd.id)));
      const base = tourneeIds(sp);
      // les remplaçants posés à la main qui vont être remplacés (les lignes à fonction ou note, elles, restent) ; celles qu'on garde
      const poses = cibles.map(dd => { const e = ecartsDate(dd.id).filter(y => !aLaMain(y)); return { dd, plus: e.filter(y => y.present && !base.includes(y.personne_id) && !ids.includes(y.personne_id)).map(y => y.personne_id), moins: e.filter(y => !y.present && ids.includes(y.personne_id)).map(y => y.personne_id) }; }).filter(y => y.plus.length || y.moins.length);
      const gardes = tous.map(dd => ({ dd, lignes: ecartsDate(dd.id).filter(aLaMain) })).filter(y => y.lignes.length && cibles.includes(y.dd));
      // qui sera prévenu : la règle du déclencheur, date par date
      const rs = cibles.map(dd => DISTRIBUTION.prevenus(dd, equipeVoulue({ spectacle_id: dd.spectacle_id, equipe: resultat(dd) }) || [])), prevenus = new Set(rs.flatMap(r => [...r.partent, ...r.nePartentPlus]));
      $('#tab-et-apercu', dlg).innerHTML = `<p><b>${cibles.length ? `${pl(cibles.length, 'date')} ${cibles.length > 1 ? 'changeront' : 'changera'}` : 'Aucune date ne changera'}</b>${tous.length - cibles.length ? ` ; ${pl(tous.length - cibles.length, 'date')} ${tous.length - cibles.length > 1 ? 'sont' : 'est'} déjà à jour` : ''}.${autresSp ? ` ${pl(autresSp, 'ligne')} d’un autre spectacle ${autresSp > 1 ? 'restent' : 'reste'} de côté.` : ''}</p>
        ${poses.length ? `<p class="tab-et-alerte">Des remplaçants sont posés à la main ; ils seront remplacés :</p><ul class="tab-et-liste">${poses.map(y => `<li>${esc(jourCourt(y.dd.debut))} : ${[y.plus.length ? `${esc(noms(y.plus))} ${y.plus.length > 1 ? 'ajoutés' : 'ajouté·e'}` : '', y.moins.length ? `${esc(noms(y.moins))} ${y.moins.length > 1 ? 'ne partent pas' : 'ne part pas'}` : ''].filter(Boolean).join(' ; ')}</li>`).join('')}</ul>` : ''}
        ${gardes.length ? `<p class="tab-et-garde">Ces lignes ont une fonction ou une note : elles sont gardées.</p><ul class="tab-et-liste">${gardes.map(y => `<li>${esc(jourCourt(y.dd.debut))} : ${esc(y.lignes.map(l => `${nomDe(personne(l.personne_id))}${l.fonction ? ` (${l.fonction})` : ''}${l.note ? ` — ${l.note}` : ''}`).join(' ; '))}</li>`).join('')}</ul>` : ''}
        ${cibles.length ? `<p class="tab-et-prevenus">${prevenus.size ? `${pl(prevenus.size, 'personne')} ${prevenus.size > 1 ? 'seront prévenues' : 'sera prévenue'} (elles ont un compte, la date est à venir, leur présence change).` : 'Personne ne sera prévenu : aucune présence ne change sur une date à venir pour quelqu’un qui a un compte.'}</p>` : ''}`;
      $('#tab-et-ok', dlg).textContent = cibles.length ? `Appliquer à ${pl(cibles.length, 'date')}` : 'Appliquer';
      $('#tab-et-ok', dlg).disabled = !cibles.length;
    };
    dlg.addEventListener('change', apercu);
    dlg.addEventListener('close', () => { dlg.remove(); marquer(true); });
    $('#tab-et-non', dlg).addEventListener('click', () => dlg.close());
    $('#tab-et-ok', dlg).addEventListener('click', async () => {
      const b = $('#tab-et-ok', dlg), xs = [...cibles], avants = xs.map(dd => ({ id: dd.id, sp: dd.spectacle_id, equipe: ecartsDate(dd.id) }));
      b.disabled = true;
      let n = 0, rates = 0;
      for (const dd of xs) {
        b.textContent = `${n + 1} / ${xs.length}…`;
        T.recents.set(dd.id, Date.now());
        const ok = await enregistrerEquipeDate(dd.id, { spectacle_id: dd.spectacle_id, equipe: resultat(dd) });
        if (ok) n++; else rates++;
      }
      dlg.close();
      T.pile.push({ libelle: `distribution étendue à ${pl(n, 'date')}`, defaire: async () => { for (const a of avants) { T.recents.set(a.id, Date.now()); await enregistrerEquipeDate(a.id, { spectacle_id: a.sp, equipe: a.equipe }); } } });
      etat(`Distribution posée sur ${pl(n, 'date')}${rates ? ` ; ${rates} n’ont pas pu l’être` : ''}.`, rates ? 'erreur' : 'ok', true);
      annoncer(`Distribution posée sur ${pl(n, 'date')}.`, { libelle: 'Annuler', delai: 9000, action: () => annuler() });
      dessiner({ garder: true });
    });
    dlg.showModal();
    apercu();
  }

  // ==================== les séances : ajouter, supprimer
  // ———— ajouter une séance : à la date du même spectacle au même lieu qui touche ce jour (le même, la veille ou le
  // lendemain), sinon à une nouvelle date. → { id (la date), nouvelle, texte } ; une erreur de la base est levée
  const ecartJours = (d, j) => (j < d.debut ? (Date.parse(d.debut) - Date.parse(j)) : j > (d.fin || d.debut) ? (Date.parse(j) - Date.parse(d.fin || d.debut)) : 0) / 864e5;
  const dateVoisine = (sp, lieuId, jour) => E.dates.filter(d => d.spectacle_id === sp && d.statut !== 'annulee' && (d.lieu_id ?? null) === (lieuId ?? null) && ecartJours(d, jour) <= 1).sort((a, b) => ecartJours(a, jour) - ecartJours(b, jour))[0] || null;
  const ouDit = lieuId => { const l = lieu(lieuId); return l ? `${l.nom ? `${l.nom}, ` : ''}${l.commune}` : 'lieu à préciser'; };
  // separee : une date neuve, jamais fusionnée avec sa voisine (une ligne du Simple est une date, « Détacher » en fait une aussi). date : tout
  // ce que la ligne dit de la date elle-même (le statut, la ligne du site, les précisions…), posé sur la date neuve ; suivi, chiffres : le suivi et
  // les chiffres de la ligne ; equipe : les personnes de la date (des identifiants), fonctions et notes : ce que chacune a sur cette date (ecartsPour).
  // Une ligne qui rejoint une date qui existe déjà n'y ajoute que la séance : le reste, elle le dit.
  async function ajouterSeance({ jour, heure = '', fin = '', spectacle_id, lieu_id = null, seance = {}, date = {}, suivi = {}, chiffres = null, equipe = null, fonctions = {}, notes = {}, separee = false }) {
    const d = separee ? null : dateVoisine(spectacle_id, lieu_id, jour);
    const rep = { jour, heure, fin, public: 'tout_public', annulee: false, lien: '', note: '', ...seance };
    if (d) {
      const F = dateVersForm(d);
      if (F.representations.some(r => r.jour === jour && (r.heure || '') === (heure || ''))) return { id: d.id, nouvelle: false, rien: true, texte: `déjà là : ${jourCourt(jour)}${heure ? ` à ${heureT(heure)}` : ''} (${ouDit(lieu_id)})` };
      const ids = new Set(F.representations.map(r => r.id));
      F.representations.push(rep);
      T.recents.set(d.id, Date.now());
      await ecrireDate(F, d, { libre: !!(d.intitule || '').trim() });
      const nouvelle = E.reps.find(r => r.date_id === d.id && !ids.has(r.id));
      // (ce que la ligne disait de la date elle-même, son statut, son suivi, son équipe, ne remplace pas celle qui existe : on le dit)
      const ignore = Object.keys(date).length || Object.values(suivi).some(v => v != null && v !== '') || Object.values(chiffres || {}).some(v => v != null && v !== '') || (Array.isArray(equipe) && equipe.length);
      return { id: d.id, nouvelle: false, rep: nouvelle?.id, texte: `séance ajoutée à la date du ${jourCourt(d.debut)}${d.fin && d.fin !== d.debut ? ` au ${jourCourt(d.fin)}` : ''} (${ouDit(lieu_id)})${ignore ? ' ; seule la séance est reprise : le reste de la ligne (statut, suivi, chiffres, équipe…) ne l’est pas, la date existait, il se règle dans sa fiche' : ''}` };
    }
    const F = Object.assign(nouvelleDate(), { spectacle_id, lieu_id, debut: jour, fin: jour, representations: [rep] }, date);
    F.suivi = { ...F.suivi, ...suivi };
    if (chiffres) F.chiffres = { ...F.chiffres, ...chiffres };
    if (equipe) F.equipe = ecartsPour({ id: -1, spectacle_id }, equipe, spectacle_id, { fonctions, notes });
    const { id } = await ecrireDate(F, null);
    T.recents.set(id, Date.now());
    return { id, nouvelle: true, texte: `nouvelle date : ${jourCourt(jour)}, ${spectacle(spectacle_id)?.titre || ''} (${ouDit(lieu_id)})` };
  }
  // ce qu'on vient d'ajouter doit se voir : les filtres qui le cachent (eux seuls) se relâchent, et leurs boutons le montrent
  function montrerAjouts(ids) {
    const neutres = { periode: 'toutes', spectacle: '', saison: '', q: '', statut: '', public: '', nature: '', dep: '', contrat: '', du: '', au: '' }, f0 = { ...T.f };
    const vus = f => { Object.assign(T.f, f); const xs = lignes(); return ids.every(id => xs.some(x => x.d.id === id)); };
    const cachent = Object.keys(neutres).filter(k => !vus({ ...neutres, [k]: f0[k] }));
    Object.assign(T.f, f0, ...cachent.map(k => ({ [k]: neutres[k] })));
    garderFiltres();
    filtresDates.refleter(T.f);
  }
  // défaire un ajout : la date créée s'efface, ou la séance ajoutée part
  async function defaireAjout(a) {
    const d = E.dates.find(y => y.id === a.id); if (!d) return;
    T.recents.set(d.id, Date.now());
    if (a.nouvelle) { await effacerDate(d); return; }
    if (!a.rep) return;
    const F = dateVersForm(d);
    F.representations = F.representations.filter(r => r.id !== a.rep);
    if (F.representations.length) await ecrireDate(F, d, { libre: !!(d.intitule || '').trim() });
  }
  // « Détacher cette séance dans sa propre date » : une date neuve (le même spectacle, le même lieu, le même statut, le même suivi — sauf le
  // montant de cession, qui reste à la date d'origine —, la même équipe avec ses fonctions et ses notes), puis la séance quitte l'ancienne. Un seul
  // « Annuler » rend tout : la séance revient, la date neuve s'efface. Une date qui s'ajoute prévient son équipe (« Nouvelle date »), la phrase de
  // la confirmation le dit. Dans la file (T.file) : rien ne se croise.
  async function detacher(x) {
    const d = E.dates.find(y => y.id === x.d.id), r = x.r && E.reps.find(y => y.id === x.r.id);
    if (!d || !r) return etat('Cette séance n’existe plus.', 'erreur');
    if (repsDe(d.id).length < 2) return etat('Cette date n’a qu’une séance : il n’y a rien à détacher.');
    const quand = `${jourCourt(r.jour)}${r.heure ? ` à ${heureT(r.heure)}` : ''}`;
    const oui = await (typeof confirmerAction === 'function' ? confirmerAction({ titre: `Détacher la séance du ${quand} dans sa propre date ?`, ok: 'Détacher', danger: false,
      texte: `Elle quitte la date du ${jourCourt(d.debut)} et devient une date à elle, avec le même statut, le même suivi (sauf le montant de cession) et la même équipe. L’équipe reçoit la notification « Nouvelle date ».` }) : Promise.resolve(true));
    if (!oui) { marquer(true); return; }
    etat('Enregistrement…', 'encours');
    const su = suiviDe(d), ecarts = ecartsDate(d.id).filter(e => e.present);
    const tache = T.file.then(async () => {
      const a = await ajouterSeance({ jour: r.jour, heure: h5(r.heure), fin: h5(r.fin), spectacle_id: d.spectacle_id, lieu_id: d.lieu_id, separee: true,
        seance: { public: r.public, annulee: !!r.annulee, lien: r.lien || '', note: r.note || '' },
        date: { statut: d.statut, nature: nature(d), visible: d.visible, lien: d.lien || '' },
        suivi: { organisateur: su.organisateur || '', contact: su.contact || '', contrat: su.contrat || '', notes: su.notes || '' },
        equipe: E.equipeInstallee ? equipeIds(d) : null,
        fonctions: Object.fromEntries(ecarts.filter(e => e.fonction).map(e => [e.personne_id, e.fonction])), notes: Object.fromEntries(ecarts.filter(e => e.note).map(e => [e.personne_id, e.note])) });
      const d1 = E.dates.find(y => y.id === d.id), F = dateVersForm(d1);
      F.representations = F.representations.filter(y => y.id !== r.id);
      T.recents.set(d.id, Date.now());
      try { await ecrireDate(F, d1, { libre: !!(F.intitule || '').trim() }); } catch (err) {
        // (la séance n'a pas quitté sa date : la date neuve qu'on vient de créer n'a plus de raison d'être, on la retire ; si elle résiste, on le dit)
        let suite = ' La séance est restée sur sa date, la date neuve a été retirée.';
        try { const dn = E.dates.find(y => y.id === a.id); if (dn) { T.recents.set(dn.id, Date.now()); await effacerDate(dn); } } catch (e) { suite = ' La séance est restée sur sa date, mais la date neuve existe : à supprimer à la main.'; }
        throw new Error(`${String(err?.message || err).replace(/\.$/, '')}.${suite}`);
      }
      return a;
    });
    T.file = tache.catch(() => {});
    try {
      const a = await tache, texte = `séance du ${quand} détachée dans sa propre date`;
      T.pile.push({ libelle: texte, ids: [d.id, a.id], defaire: async () => {
        const d1 = E.dates.find(y => y.id === d.id), dn = E.dates.find(y => y.id === a.id);
        if (d1) { const G = dateVersForm(d1); G.representations.push({ ...repSimple(r), id: undefined }); T.recents.set(d1.id, Date.now()); await ecrireDate(G, d1, { libre: !!(G.intitule || '').trim() }); }
        if (dn) { T.recents.set(dn.id, Date.now()); await effacerDate(dn); }
      } });
      etat(`${texte[0].toUpperCase()}${texte.slice(1)}.`, 'ok', true);
      montrerAjouts([a.id]);
      dessiner({ garder: true });
      const l = T.lignes.findIndex(y => y.d.id === a.id);
      if (l >= 0) { activer(l, T.actif.c, { focus: true }); $$(`#tab-corps tr[data-l="${l}"] td`).forEach(td => td.classList.add('vient-d-ailleurs')); }
    } catch (err) { etat(`Pas détachée : ${err?.message || err}`, 'erreur'); dessiner({ garder: true }); }
  }
  function formAjout() {
    const form = $('#tab-ajout'), b = $('#tab-plus');
    if (!form.hidden) { form.hidden = true; b.setAttribute('aria-expanded', 'false'); b.focus(); return; }
    form.hidden = false; b.setAttribute('aria-expanded', 'true');
    const sp0 = String(T.f.spectacle || (E.spectacles.slice().sort((x, y) => (y.page - x.page) || x.ordre - y.ordre)[0] || {}).id || '');
    const simple = modeSimple();
    form.innerHTML = `<h3>${simple ? 'Ajouter une date' : 'Ajouter une séance'}</h3><div class="tab-ajout-champs${simple ? ' sans-heure' : ''}">
      <div class="champ"><label for="ta-jour">Jour</label><input id="ta-jour" ${natif() ? 'type="date"' : 'type="text" placeholder="jj/mm/aaaa"'} autocomplete="off"></div>
      ${simple ? '' : `<div class="champ"><label for="ta-heure">Heure</label><input id="ta-heure" ${natif() ? 'type="time" step="300"' : 'type="text" placeholder="20h30"'} autocomplete="off"></div>`}
      <div class="champ"><label for="ta-sp">Spectacle</label><select id="ta-sp">${choixSpectacles().map(([v, l]) => `<option value="${v}"${v === sp0 ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
      <div class="champ ta-lieu"><span class="lib">Lieu</span><div id="ta-lieu"></div></div></div>
      <p class="aide">${simple ? 'Une nouvelle date se crée toujours, même à côté d’une date du même spectacle au même lieu ; ses heures se règlent ensuite dans la case Séances.' : 'Une date du même spectacle au même lieu qui touche ce jour (le même, la veille ou le lendemain) reçoit la séance ; sinon une nouvelle date se crée.'}</p>
      <div class="fm-boutons"><button type="submit" class="btn principal">Ajouter</button><button type="button" class="btn" data-fermer>Fermer</button></div>`;
    let lieuId = null;
    comboLieu(form, 'ta-lieu', null, id => { lieuId = id; });
    $('#ta-lieu input', form).addEventListener('input', e => { if (!e.target.value.trim()) lieuId = null; });
    $('[data-fermer]', form).addEventListener('click', () => formAjout());
    form.onkeydown = e => { if (e.key === 'Escape' && !e.target.closest('.combo')) { e.preventDefault(); formAjout(); } };
    form.onsubmit = async e => {
      e.preventDefault();
      const jour = natif() ? $('#ta-jour', form).value : lireJour($('#ta-jour', form).value, AUJ), heure = simple ? '' : natif() ? $('#ta-heure', form).value : lireHeure($('#ta-heure', form).value);
      if (!jour) { etat('Le jour n’est pas reconnu : écrivez par exemple 5/11/2026.', 'erreur'); return $('#ta-jour', form).focus(); }
      if (heure === undefined) { etat('L’heure n’est pas reconnue : écrivez par exemple 20h30.', 'erreur'); return $('#ta-heure', form).focus(); }
      const sp = +$('#ta-sp', form).value;
      if (!sp) { etat('Choisissez le spectacle.', 'erreur'); return; }
      const bouton = $('button[type=submit]', form);
      bouton.disabled = true;
      etat('Enregistrement…', 'encours');
      const tache = T.file.then(() => ajouterSeance({ jour, heure, spectacle_id: sp, lieu_id: lieuId, separee: simple }));
      T.file = tache.catch(() => {});
      try {
        const a = await tache;
        bouton.disabled = false;
        if (a.rien) { etat(`Rien d’ajouté : ${a.texte}.`); return; }
        T.pile.push({ libelle: a.texte, defaire: () => defaireAjout(a) });
        etat(`${a.texte[0].toUpperCase()}${a.texte.slice(1)}.`, 'ok', true);
        // la séance ajoutée : en vue, et la case de l'heure active
        montrerAjouts([a.id]);
        dessiner();
        const l = T.lignes.findIndex(y => y.d.id === a.id && (simple || (a.rep ? y.r?.id === a.rep : y.r?.jour === jour)));
        if (l >= 0) { activer(l, Math.max(0, T.cols.findIndex(y => y.k === (simple ? 'seances' : 'heure'))), { focus: false }); cellule(l, T.actif.c)?.classList.add('vient-d-ailleurs'); }
        $('#ta-jour', form).value = ''; if (!simple) $('#ta-heure', form).value = '';
        $('#ta-jour', form).focus();
      } catch (err) { bouton.disabled = false; etat(`Pas enregistré : ${err?.message || err}`, 'erreur'); }
    };
    $('#ta-jour', form).focus();
  }

  // ———— supprimer les séances choisies (Ctrl+Suppr) : une date sans plus de séance part entière, après confirmation
  async function supprimerLignes() {
    const p = plage(), xs = T.lignes.slice(p.l0, p.l1 + 1);
    if (!xs.length) return;
    const parDate = new Map();
    xs.forEach(x => { if (!parDate.has(x.d.id)) parDate.set(x.d.id, { d: x.d, reps: new Set(), entiere: !x.r }); const g = parDate.get(x.d.id); if (x.r) g.reps.add(x.r.id); else g.entiere = true; });
    const groupes = [...parDate.values()].map(g => ({ ...g, entiere: g.entiere || repsDe(g.d.id).every(r => g.reps.has(r.id)) }));
    const simple = modeSimple(), entieres = groupes.filter(g => g.entiere), nS = simple ? xs.reduce((n, x) => n + x.rs.length, 0) : xs.filter(x => x.r).length;
    const seul = xs.length === 1 ? xs[0] : null, dateSeule = !!seul && !seul.r;   // une date sans séance (une période) ; en Simple, une ligne est une date
    const quoi = seul ? `${dateSeule ? 'la date' : 'la séance'} du ${jourCourt(seul.r?.jour || seul.d.debut)}${seul.r?.heure ? ` à ${heureT(seul.r.heure)}` : ''} (${spectacle(seul.d.spectacle_id)?.titre || ''}, ${ouDit(seul.d.lieu_id)})${simple && nS ? ` et ${nS > 1 ? `ses ${nS} séances` : 'sa séance'}` : ''}`
      : simple ? `${pl(xs.length, 'date')}${nS ? ` et leurs ${pl(nS, 'séance')}` : ''}` : `${pl(nS || xs.length, 'séance')}`;
    const suite = dateSeule ? 'Elle n’a pas de séance : elle est supprimée, avec son équipe et sa feuille de route.'
      : entieres.length ? `${entieres.length > 1 ? `${entieres.length} dates n’auront` : 'Sa date n’aura'} plus de séance : ${entieres.length > 1 ? 'elles sont supprimées' : 'elle est supprimée'}, avec ${entieres.length > 1 ? 'leur' : 'son'} équipe et ${entieres.length > 1 ? 'leur' : 'sa'} feuille de route.` : '';
    etat('Suppression…', 'encours');
    const tache = T.file.then(async () => {
      const defaire = [];
      for (const g of groupes) {
        const d = E.dates.find(y => y.id === g.d.id); if (!d) continue;
        T.recents.set(d.id, Date.now());
        if (g.entiere) { const retablir = await effacerDate(d); defaire.push(() => retablir()); continue; }
        const F = dateVersForm(d), partis = F.representations.filter(r => g.reps.has(r.id));
        F.representations = F.representations.filter(r => !g.reps.has(r.id));
        await ecrireDate(F, d, { libre: !!(d.intitule || '').trim() });
        defaire.push(async () => { const d2 = E.dates.find(y => y.id === d.id); if (!d2) return; const G = dateVersForm(d2); G.representations.push(...partis.map(r => ({ ...r, id: undefined }))); T.recents.set(d.id, Date.now()); await ecrireDate(G, d2, { libre: !!(d2.intitule || '').trim() }); });
      }
      return defaire;
    });
    T.file = tache.catch(() => {});
    try {
      const defaire = await tache;
      const texte = `${quoi} supprimée${xs.length > 1 || (simple && nS) ? 's' : ''}${entieres.length && !dateSeule && !simple ? ` (${pl(entieres.length, 'date')} entière${entieres.length > 1 ? 's' : ''})` : ''}`;
      T.pile.push({ libelle: texte, defaire: async () => { for (const f of defaire.reverse()) await f(); } });
      T.ancre = null;
      etat(`${texte[0].toUpperCase()}${texte.slice(1)}.`, 'ok', true);
    } catch (err) { etat(`Suppression impossible : ${err?.message || err}`, 'erreur'); }
    dessiner({ garder: true });
  }

  // ==================== copier, coller
  // ———— copier, coller (des cases, comme dans un tableur : des colonnes séparées par des tabulations)
  const cellTsv = v => (/[\t\n"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  // (une case « riche » — les précisions du site — garde ses sauts de ligne entre guillemets, comme Excel : c'est ce qui sépare ses éléments au collage)
  function copie() {
    const p = plage(), out = [];
    for (let l = p.l0; l <= p.l1; l++) { const x = T.lignes[l]; if (!x) continue; out.push(T.cols.slice(p.c0, p.c1 + 1).map(c => cellTsv(c.type === 'riche' ? String(c.copie(x) ?? '').replace(/\r\n?/g, '\n') : String(c.copie(x) ?? '').replace(/\r?\n/g, ' '))).join('\t')); }
    return out.join('\n');
  }
  // un texte de tableur → des lignes de cases (les guillemets d'Excel et de Google Sheets compris)
  function lireTsv(t) {
    const out = [[]]; let cas = '', i = 0, guill = false;
    const s = String(t ?? '').replace(/\r\n?/g, '\n').replace(/\n$/, '');
    while (i < s.length) {
      const ch = s[i];
      if (guill) { if (ch === '"' && s[i + 1] === '"') { cas += '"'; i += 2; continue; } if (ch === '"') { guill = false; i++; continue; } cas += ch; i++; continue; }
      if (ch === '"' && cas === '') { guill = true; i++; continue; }
      if (ch === '\t') { out[out.length - 1].push(cas); cas = ''; i++; continue; }
      if (ch === '\n') { out[out.length - 1].push(cas); cas = ''; out.push([]); i++; continue; }
      cas += ch; i++;
    }
    out[out.length - 1].push(cas);
    return out.filter(r => r.some(x => x.trim() !== '') || r.length > 1);
  }
  // les cases d'un collage que le tableur n'a pas comprises : { ligne, colonne, brut, raison, cle }, surlignées en ambre vingt secondes (.ignoree : le
  // fond --option-doux, la raison en infobulle) et comptées par la barre d'état (« n cases ignorées », « Voir » va à la première)
  const SURLIGNEE_MS = 20000;
  function placeDe(cle) {
    const i = cle.lastIndexOf('|'), xc = cle.slice(0, i), k = cle.slice(i + 1);
    const l = xc === 'neuve' ? (T.neuve ? T.lignes.length : -1) : T.lignes.findIndex(y => y.cle === xc), j = T.cols.findIndex(c => c.k === k);
    return l >= 0 && j >= 0 ? { l, j } : null;
  }
  const caseDe = cle => { const q = placeDe(cle); return q ? cellule(q.l, q.j) : null; };
  // (une ligne que les tranches n'ont pas encore posée prendra le HTML d'aujourd'hui, pas celui qu'elle avait : surlignée ou non)
  const aRefaire = cle => { const q = placeDe(cle); if (q && T.htmls && q.l >= T.rendues && q.l < T.htmls.length) T.htmls[q.l] = null; };
  function oublierIgnoree(cle) {
    const i = T.ignorees.get(cle); if (!i) return;
    clearTimeout(i.t); T.ignorees.delete(cle);
    aRefaire(cle);
    const td = caseDe(cle);
    if (td) { td.classList.remove('ignoree'); const t = T.textes?.get(cle) || ''; if (t.length > 16) td.title = t; else td.removeAttribute('title'); }
  }
  function marquerIgnorees(liste) {
    [...T.ignorees.keys()].forEach(oublierIgnoree);
    liste.forEach(i => {
      T.ignorees.set(i.cle, { ligne: i.ligne, colonne: i.colonne, brut: i.brut, raison: i.raison, t: setTimeout(() => oublierIgnoree(i.cle), SURLIGNEE_MS) });
      aRefaire(i.cle);
      const td = caseDe(i.cle);
      if (td) { td.classList.add('ignoree'); td.title = `Ignorée : ${i.raison} (« ${i.brut} »)`; }
    });
  }
  function voirIgnorees() {
    for (const [cle, i] of T.ignorees) { const q = placeDe(cle); if (q) { activer(q.l, q.j); return annoncer(`Première case ignorée : ${i.raison}.`); } }
    etat('Les cases ignorées ne sont plus surlignées.');
  }
  function coller(texte) {
    const m = lireTsv(texte);
    if (!m.length) return;
    const p = plage(), chs = [], vus = new Map(), ignorees = [];
    let dehors = 0;
    const mettre = (l, j, brut) => {
      const x = T.lignes[l] || (T.neuve && l === T.lignes.length ? T.neuve : null), c = T.cols[j];   // (la ligne vide du bas, juste après la dernière date, reçoit le collage : son jour, son spectacle, son lieu)
      if (!x || !c) { dehors++; return; }
      const ignorer = raison => ignorees.push({ ligne: l, colonne: j, brut: String(brut).trim(), raison, cle: cleCase(x, c) });
      if (x.neuve && !CASES_NEUVES.includes(c.k)) { if (String(brut).trim() !== '') ignorer('cette case se remplit quand la date existe'); return; }   // (une case vide, à cheval sur la ligne vide, ne se compte pas)
      if (c.type === 'lecture' || c.type === 'action') return ignorer('case en lecture seule');
      const raison = c.fige?.(x); if (raison) return ignorer(raison[0].toLowerCase() + raison.slice(1));
      if (!x.neuve && !x.r && c.niveau === 'seance') { if (String(brut).trim() !== '') ignorer('cette date est une période : Entrée sur la case pour choisir'); return; }   // (le garde-fou de la période : une heure collée créerait une séance en silence)
      const v = c.lire(brut, x);
      if (v === undefined) return ignorer(`valeur non reconnue pour « ${c.l} »`);
      if (v === '' && !c.vider && c.type !== 'heure') return ignorer(`« ${c.l} » ne se vide pas ainsi`);
      const k = c.niveau === 'seance' ? `${x.cle}|${c.k}` : `${x.d.id}|${c.k}`;
      if (vus.has(k)) chs.splice(vus.get(k), 1, { x, col: c, v }); else { vus.set(k, chs.length); chs.push({ x, col: c, v }); }
    };
    if (m.length === 1 && m[0].length === 1 && T.ancre) { for (let l = p.l0; l <= p.l1; l++) for (let j = p.c0; j <= p.c1; j++) mettre(l, j, m[0][0]); }
    else m.forEach((ligne, i) => ligne.forEach((brut, j) => mettre(p.l0 + i, p.c0 + j, brut)));
    marquerIgnorees(ignorees);
    const fait = chs.filter(ch => JSON.stringify(ch.col.val(ch.x)) !== JSON.stringify(ch.v));
    const n = ignorees.length, note = [n ? `${pl(n, 'case')} ignorée${n > 1 ? 's' : ''}, surlignée${n > 1 ? 's' : ''} en ambre` : '', dehors ? `${pl(dehors, 'case')} hors du tableau (« Importer » crée des ${modeSimple() ? 'dates' : 'séances'})` : ''].filter(Boolean).join(' ; ');
    if (!fait.length) return etat(note ? `Rien de collé : ${note}.` : 'Rien ne change.', note ? 'erreur' : '');
    // (le Simple : des séances que la liste collée ne cite plus sont retirées ; décaler le jour de dates à venir prévient leur équipe — « Date déplacée » —, ce que l'état dit)
    const retirees = fait.reduce((n, ch) => n + (ch.col.k === 'seances' ? ch.x.rs.filter(r => !ch.v.some(y => y.id === r.id)).length : 0), 0);
    const prevenues = new Set(fait.filter(ch => ch.col.k === 'jour' && (ch.x.d.fin || ch.x.d.debut) >= AUJ).map(ch => ch.x.d.id)).size, prevenir = modeSimple() && prevenues > 1 ? prevenues : 0;
    const plus = [retirees ? `${pl(retirees, 'séance')} retirée${retirees > 1 ? 's' : ''}` : '', prevenir ? `l’équipe de ${pl(prevenir, 'date')} est prévenue` : ''].filter(Boolean).join(' ; ');
    ecrire(fait, { dire: `${pl(fait.length, 'case')} collée${fait.length > 1 ? 's' : ''}${note ? ` ; ${note}` : ''}${plus ? ` ; ${plus}` : ''}`, prevenir, suite: suitePresences(fait) });
  }

  // ==================== l'export : Excel, CSV, Google Sheets
  // ———— exporter : les lignes et les colonnes de la vue (Excel, CSV, Google Sheets)
  // Les colonnes de la diffusion (le montant de cession, l'étape de la piste : c.confidentiel) n'en font pas partie sans la case « Inclure la
  // diffusion (confidentiel) » du menu Exporter ; l'icône « fiche » n'en fait jamais partie. exclues : les colonnes confidentielles laissées de côté.
  function tableau({ confidentiel = false } = {}) {
    const cols = T.cols.filter(c => c.type !== 'action' && (confidentiel || !c.confidentiel));
    return { entetes: cols.map(c => c.l), figees: cols.filter(c => T.figees.has(c.k)).length, exclues: T.cols.filter(c => c.confidentiel && !confidentiel).map(c => c.l), lignes: T.lignes.map(x => cols.map(c => {
      if (c.type === 'jour') return { t: 'd', v: c.exp(x).jour };
      if (c.type === 'heure') { const h = c.exp(x).heure; return h ? { t: 'h', v: h } : { t: 's', v: '' }; }
      if (c.nombre) { const v = c.val(x); return v === '' || v == null ? { t: 's', v: '' } : { t: 'n', v: Number(v) }; }
      return { t: 's', v: c.copie(x) };
    })) };
  }
  const nomFichier = ext => `crescite-representations-${AUJ}.${ext}`;
  function telecharger(blob, nom) {
    const a = document.createElement('a'), u = URL.createObjectURL(blob);
    a.href = u; a.download = nom; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
  }
  async function copierTexte(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch {
      const z = document.createElement('textarea'); z.value = t; z.style.cssText = 'position:fixed;opacity:0'; document.body.append(z); z.select();
      const ok = document.execCommand('copy'); z.remove(); return ok;
    }
  }
  // une case de texte qui commence par = + - @ (une formule pour Excel ou Google Sheets : un commentaire saisi ailleurs
  // ne doit rien calculer ni appeler chez celui qui ouvre le fichier) part précédée d'une apostrophe
  const sansFormule = v => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
  const texteCase = (c, sep) => (c.t === 'd' ? jjmmaaaa(c.v) : c.t === 'h' ? c.v : c.t === 'n' ? String(c.v).replace('.', ',') : sansFormule(String(c.v ?? '').replace(/\r?\n/g, sep === '\t' ? ' ' : '\n')));
  async function exporter(genre, { confidentiel = false } = {}) {
    if (!T.lignes.length) return etat('Rien à exporter : aucune séance dans la vue.', 'erreur');
    const t = tableau({ confidentiel }), n = pl(t.lignes.length, 'ligne'), vue = `celles de la vue${t.exclues.length ? `, sans la diffusion : ${t.exclues.join(', ').toLowerCase()}` : ''}`;
    if (genre === 'xlsx') { telecharger(xlsx(t), nomFichier('xlsx')); return etat(`Excel : ${n}, ${pl(t.entetes.length, 'colonne')} (${vue}).`, 'ok'); }
    if (genre === 'csv') {
      const q = v => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
      const csv = [t.entetes, ...t.lignes.map(l => l.map(c => texteCase(c, ';')))].map(l => l.map(v => q(String(v))).join(';')).join('\r\n');
      telecharger(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }), nomFichier('csv'));
      return etat(`CSV : ${n} (séparées par des points-virgules, pour Excel en français)${t.exclues.length ? ` ; sans la diffusion : ${t.exclues.join(', ').toLowerCase()}` : ''}.`, 'ok');
    }
    const tsv = [t.entetes, ...t.lignes.map(l => l.map(c => texteCase(c, '\t')))].map(l => l.map(v => cellTsv(String(v))).join('\t')).join('\n');
    const ok = await copierTexte(tsv);
    if (!ok) return etat('La copie n’a pas pu se faire : exportez plutôt en Excel, puis importez le fichier dans Google Sheets.', 'erreur');
    window.open('https://sheets.new', '_blank', 'noopener');
    etat(`Tableau copié (${n}${t.exclues.length ? `, sans la diffusion : ${t.exclues.join(', ').toLowerCase()}` : ''}) : dans la feuille Google qui s’ouvre, collez-le (Ctrl+V).`, 'ok');
  }

  // ———— un .xlsx sans bibliothèque : un classeur d'une feuille (en-tête en gras, figée, filtrable ; jours et heures en
  // vraies dates et heures d'Excel), dans une archive zip sans compression
  const XML_ENTETE = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const xmlEsc = s => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const colLettre = n => { let s = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
  const jourExcel = j => (Date.UTC(+j.slice(0, 4), +j.slice(5, 7) - 1, +j.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 864e5;
  const heureExcel = h => (+h.slice(0, 2) * 60 + +h.slice(3, 5)) / 1440;
  function xlsx({ entetes, lignes, figees = 2 }) {
    const nC = entetes.length, dern = colLettre(nC - 1), nL = lignes.length + 1, nF = Math.min(figees, nC);
    const cas = (c, r, j) => {
      const ref = `${colLettre(j)}${r}`;
      if (c.t === 'd' && c.v) return `<c r="${ref}" s="2"><v>${jourExcel(c.v)}</v></c>`;
      if (c.t === 'h' && c.v) return `<c r="${ref}" s="3"><v>${heureExcel(c.v)}</v></c>`;
      if (c.t === 'n') return `<c r="${ref}"><v>${Number(c.v)}</v></c>`;
      return c.v === '' || c.v == null ? '' : `<c r="${ref}" t="inlineStr"${c.gras ? ' s="1"' : ''}><is><t xml:space="preserve">${xmlEsc(c.v)}</t></is></c>`;
    };
    const larg = entetes.map((e, j) => Math.min(60, Math.max(e.length + 2, ...lignes.slice(0, 400).map(l => (l[j].t === 'd' ? 11 : l[j].t === 'h' ? 6 : String(l[j].v || '').length) + 2))));
    const feuille = `${XML_ENTETE}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
      + `<dimension ref="A1:${dern}${nL}"/><sheetViews><sheetView workbookViewId="0">${nF ? `<pane xSplit="${nF}" ySplit="1" topLeftCell="${colLettre(nF)}2" activePane="bottomRight" state="frozen"/><selection pane="bottomRight"/>` : '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft"/>'}</sheetView></sheetViews>`
      + `<sheetFormatPr defaultRowHeight="15"/><cols>${larg.map((w, j) => `<col min="${j + 1}" max="${j + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>`
      + `<row r="1">${entetes.map((e, j) => cas({ t: 's', v: e, gras: true }, 1, j)).join('')}</row>`
      + lignes.map((l, i) => `<row r="${i + 2}">${l.map((c, j) => cas(c, i + 2, j)).join('')}</row>`).join('')
      + `</sheetData><autoFilter ref="A1:${dern}${nL}"/></worksheet>`;
    const fichiers = [
      ['[Content_Types].xml', `${XML_ENTETE}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`],
      ['_rels/.rels', `${XML_ENTETE}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`],
      ['docProps/core.xml', `${XML_ENTETE}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Représentations</dc:title><dc:creator>Crescite</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`],
      ['xl/workbook.xml', `${XML_ENTETE}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Représentations" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'Représentations'!$A$1:$${dern}$${nL}</definedName></definedNames></workbook>`],
      ['xl/_rels/workbook.xml.rels', `${XML_ENTETE}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ['xl/styles.xml', `${XML_ENTETE}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="hh:mm"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
      ['xl/worksheets/sheet1.xml', feuille],
    ];
    return new Blob([zipSansCompression(fichiers)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  // une archive zip « stockée » (sans compression) : en-têtes locaux, répertoire central, fin de répertoire ; CRC-32
  const TABLE_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = o => { let c = 0xFFFFFFFF; for (let i = 0; i < o.length; i++) c = TABLE_CRC[(c ^ o[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zipSansCompression(fichiers) {
    const enc = new TextEncoder(), maintenant = new Date(), parts = [], central = [];
    const heure = (maintenant.getHours() << 11) | (maintenant.getMinutes() << 5) | (maintenant.getSeconds() >> 1);
    const jour = ((maintenant.getFullYear() - 1980) << 9) | ((maintenant.getMonth() + 1) << 5) | maintenant.getDate();
    let pos = 0;
    for (const [nom, contenu] of fichiers) {
      const n = enc.encode(nom), o = enc.encode(contenu), crc = crc32(o);
      const loc = new DataView(new ArrayBuffer(30));
      [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, heure, 2], [12, jour, 2], [14, crc, 4], [18, o.length, 4], [22, o.length, 4], [26, n.length, 2], [28, 0, 2]]
        .forEach(([i, v, t]) => (t === 4 ? loc.setUint32(i, v, true) : loc.setUint16(i, v, true)));
      const cen = new DataView(new ArrayBuffer(46));
      [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, heure, 2], [14, jour, 2], [16, crc, 4], [20, o.length, 4], [24, o.length, 4], [28, n.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, pos, 4]]
        .forEach(([i, v, t]) => (t === 4 ? cen.setUint32(i, v, true) : cen.setUint16(i, v, true)));
      parts.push(new Uint8Array(loc.buffer), n, o);
      central.push(new Uint8Array(cen.buffer), n);
      pos += 30 + n.length + o.length;
    }
    const tailleC = central.reduce((s, x) => s + x.length, 0), fin = new DataView(new ArrayBuffer(22));
    [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, fichiers.length, 2], [10, fichiers.length, 2], [12, tailleC, 4], [16, pos, 4], [20, 0, 2]]
      .forEach(([i, v, t]) => (t === 4 ? fin.setUint32(i, v, true) : fin.setUint16(i, v, true)));
    const tout = [...parts, ...central, new Uint8Array(fin.buffer)], sortie = new Uint8Array(tout.reduce((s, x) => s + x.length, 0));
    let k = 0; tout.forEach(x => { sortie.set(x, k); k += x.length; });
    return sortie;
  }

  // ==================== l'import : des lignes copiées d'un tableur
  // ———— importer des lignes copiées d'un tableur : une ligne par séance, au moins le jour et le spectacle ; la première
  // ligne peut nommer les colonnes (sinon, l'ordre de l'export). Un aperçu dit ce que chaque ligne deviendra.
  // Les en-têtes qu'on reconnaît viennent des colonnes du schéma (leur `entetes`, lu sur le titre sans accent, sans signe, en minuscules) : ajouter
  // une colonne au schéma, c'est la rendre lisible ici. Le jour, l'heure, la fin, le spectacle, le lieu (avec la commune) et la distribution se lisent
  // à part (ils décident de la date et de la séance, et leurs erreurs ont leurs phrases) ; tout le reste passe par le `lire` et le `ecrire` de la
  // colonne, sur un formulaire de date qui ne contient que ce que la ligne dit (nouvelleDate() donne les valeurs d'office à la date neuve).
  const ENTETES_LUS = COLONNES.filter(c => c.entetes).map(c => [c.k, c.entetes]);
  const A_PART = new Set(['jour', 'heure', 'fin', 'spectacle', 'lieu', 'commune', 'distribution']);
  const enteteNet = x => norm(x).replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
  // sans ligne de titres, les colonnes sont celles que le tableau montre (au moment du collage, hors lectures et icône) ; hors du Complet, ou sans
  // tableau à l'écran, celles de la disposition d'origine
  function colonnesSupposees() {
    const vues = !modeSimple() && $('#tab-corps') && T.cols.length ? T.cols : COLONNES.filter(c => (!c.si || c.si()) && !c.horsOrigine);
    return vues.filter(c => c.type !== 'action').map(c => (c.entetes ? c.k : null));   // (une colonne sans titre à lire garde sa place : null, sinon tout ce qui suit serait lu une colonne trop tôt)
  }
  // ce que la ligne a compris d'une colonne, en toutes lettres (l'aperçu)
  const texteLu = (c, v) => (c.type === 'case' ? (v ? 'oui' : 'non') : c.type === 'riche' ? pl(v.length, 'précision') : c.type === 'choix' ? libelleDe(c.choix(), v) || String(v) : v === '' ? '(vide)' : c.nombre ? nombreFr(v) : String(v));
  function lireImport(texte) {
    const m = lireTsv(texte);
    if (!m.length) return { lignes: [], cles: [] };
    const tete = m[0].map(enteteNet);
    const lues = tete.map(t => (ENTETES_LUS.find(([, re]) => re.test(t)) || [null])[0]);
    const avecTete = lues.filter(Boolean).length >= 2;
    const cles = avecTete ? lues : colonnesSupposees();
    const rg = $('#tab-corps') && !modeSimple() ? reglages() : null;
    const avertir = !avecTete && rg && (rg.jeu || rg.masquees.length || rg.montrees.length) ? `Le tableau montre ${rg.jeu ? 'un jeu de colonnes' : rg.masquees.length ? 'des colonnes masquées' : 'des colonnes ajoutées'} : sans ligne de titres, les colonnes sont supposées être celles du tableau. Ajoutez une ligne de titres (Jour, Spectacle, Heure…) pour être sûr de ce qui est lu.` : '';
    const laissees = [...new Set(cles.filter(k => k && !A_PART.has(k) && (colonne(k).type === 'lecture' || colonne(k).type === 'action' || (colonne(k).si && !colonne(k).si()))).map(k => colonne(k).l))];
    const virtuelles = [];   // les dates que l'import créera, pour l'aperçu
    const lignes = (avecTete ? m.slice(1) : m).map((cases, i) => {
      const v = {}; cles.forEach((k, j) => { if (k) v[k] = (cases[j] ?? '').trim(); });
      const jour = lireJour(v.jour, AUJ), sp = trouverSpectacle(v.spectacle || ''), heure = lireHeure(v.heure), fin = lireHeure(v.fin);
      const erreurs = [], notes = [], lus = {};
      if (!jour) erreurs.push(v.jour ? `jour illisible : « ${v.jour} »` : 'pas de jour');
      if (!sp) erreurs.push(v.spectacle ? `spectacle inconnu : « ${v.spectacle} »` : 'pas de spectacle');
      if (heure === undefined) erreurs.push(`heure illisible : « ${v.heure} »`);
      if (fin === undefined) notes.push(`heure de fin « ${v.fin} » ignorée`);
      let lieuId = null;
      if (v.lieu || v.commune) { lieuId = trouverLieu(v.lieu || v.commune, v.lieu ? v.commune : ''); if (lieuId == null || lieuId === undefined) { notes.push(`lieu inconnu : « ${[v.lieu, v.commune].filter(Boolean).join(', ')} » (laissé vide)`); lieuId = null; } }
      const equipe = v.distribution ? lirePersonnes(v.distribution) : null;
      if (v.distribution && !equipe) notes.push('distribution : un nom n’est pas reconnu (ignorée)');
      if (v.commune) lus.commune = v.commune;
      if (fin) lus.fin = heureT(fin);
      if (equipe) lus.distribution = prenoms(equipe).join(', ');
      // tout le reste, colonne par colonne : lire, puis ecrire sur le formulaire de la ligne (P) — la séance de la ligne (rep) est celle que repDe y retrouve
      const rep = { jour, heure: heure || '', fin: fin || '', public: 'tout_public', annulee: false, lien: '', note: '' };
      const P = { spectacle_id: sp, representations: [rep], suivi: {}, chiffres: {} };
      cles.forEach(k => {
        const c = k && !A_PART.has(k) ? colonne(k) : null, brut = v[k];
        if (!c || c.type === 'lecture' || c.type === 'action' || (c.si && !c.si()) || brut === '' || brut === undefined) return;
        const xv = { d: { id: null, spectacle_id: sp, nature: P.nature || 'representations', statut: P.statut || 'confirmee', debut: jour || '', fin: jour || '' }, r: rep, rs: [rep], n: 1 };
        const raison = c.fige?.(xv);
        if (raison) { notes.push(`${c.l} : ${raison.toLowerCase()} (ignoré)`); return; }
        const val = c.lire(brut, xv);
        if (val === undefined) { notes.push(`${c.l.toLowerCase()} « ${brut} » ignoré`); return; }
        try { c.ecrire(P, xv, val); lus[k] = texteLu(c, val); } catch (e) { notes.push(`${c.l.toLowerCase()} « ${brut} » ignoré`); }
      });
      const { representations: _r, spectacle_id: _s, suivi, chiffres, ...date } = P;
      const reprise = Object.keys(date).length > 0 || Object.keys(suivi).length > 0 || Object.keys(chiffres).length > 0 || !!equipe?.length;   // (ce qui ne tient pas dans une séance : une date qui existe déjà ne le reçoit pas)
      let cible = '';
      if (!erreurs.length) {
        const d = dateVoisine(sp, lieuId, jour), w = virtuelles.find(x => x.sp === sp && x.lieu === lieuId && Math.abs(Date.parse(x.debut) - Date.parse(jour)) <= 864e5 * Math.max(1, x.n));
        cible = d ? `ajoutée à la date du ${jourCourt(d.debut)}${reprise ? ' ; seule la séance est reprise, le reste de la ligne ne l’est pas (la date existe)' : ''}` : w ? 'avec la nouvelle date de la ligne ' + w.ligne : 'nouvelle date';
        if (!d && !w) virtuelles.push({ sp, lieu: lieuId, debut: jour, n: 1, ligne: i + 1 + (avecTete ? 1 : 0) });
      }
      return { n: i + 1 + (avecTete ? 1 : 0), v, ok: !erreurs.length, erreurs, notes, cible, lus,
        seance: { jour, heure: heure || '', fin: fin || '', spectacle_id: sp, lieu_id: lieuId,
          seance: { public: rep.public, annulee: rep.annulee, lien: rep.lien, note: rep.note },
          date, suivi, chiffres: Object.keys(chiffres).length ? chiffres : null, equipe: equipe || null } };
    });
    return { lignes, cles: cles.filter(Boolean), avecTete, supposees: !avecTete, laissees, avertir };
  }
  function importer() {
    const dlg = document.createElement('dialog');
    dlg.className = 'tab-dialogue large';
    dlg.setAttribute('aria-labelledby', 'tab-im-titre');
    dlg.innerHTML = `<div class="tab-dialogue-boite"><h2 id="tab-im-titre">Importer des séances</h2>
      <p class="aide">Copiez des lignes dans un tableur (Excel, Google Sheets, LibreOffice) et collez-les ici : une ligne par séance, avec au moins le jour et le spectacle. La première ligne peut donner les titres des colonnes : tous ceux du tableau sont reconnus (Jour, Heure, Spectacle, Lieu, Commune, Public, Statut, Ligne du site, Précisions du site, Jauge, Spectateurs…) ; sans elle, les colonnes sont lues dans l’ordre de celles du tableau. Une ligne qui rejoint une date qui existe déjà n’y ajoute que sa séance. Rien ne s’écrit avant « Créer ».</p>
      <label for="tab-im-texte" class="lib">Les lignes</label><textarea id="tab-im-texte" rows="6" spellcheck="false" placeholder="Jour&#9;Heure&#9;Spectacle&#9;Lieu"></textarea>
      <div class="tab-im-apercu" id="tab-im-apercu" aria-live="polite"></div>
      <div class="fm-boutons"><button type="button" class="btn principal" id="tab-im-ok" disabled>Créer</button><button type="button" class="btn" id="tab-im-non">Fermer</button></div></div>`;
    document.body.append(dlg);
    let lu = { lignes: [] };
    const apercu = () => {
      lu = lireImport($('#tab-im-texte', dlg).value);
      const bons = lu.lignes.filter(x => x.ok), noms = lu.cles.map(k => colonne(k)?.l || k).join(', ');
      // (les colonnes lues au-delà des quatre d'office, chacune dans l'aperçu : ce que la ligne en a compris)
      const autres = lu.cles.filter(k => !['jour', 'heure', 'spectacle', 'lieu'].includes(k));
      $('#tab-im-apercu', dlg).innerHTML = lu.lignes.length ? `<p><b>${pl(bons.length, 'séance')} à créer</b>${lu.lignes.length - bons.length ? ` ; ${pl(lu.lignes.length - bons.length, 'ligne')} de côté` : ''} · ${lu.avecTete ? 'colonnes lues' : 'pas de ligne de titres, colonnes supposées'} : ${esc(noms)}${lu.laissees.length ? ` · laissées de côté (en lecture seule ou absentes de la base) : ${esc(lu.laissees.join(', '))}` : ''}.</p>
        ${lu.avertir ? `<p class="tab-im-alerte" role="status">${esc(lu.avertir)}</p>` : ''}
        <div class="tab-im-cadre"><table class="simple"><thead><tr><th scope="col">Ligne</th><th scope="col">Jour</th><th scope="col">Heure</th><th scope="col">Spectacle</th><th scope="col">Lieu</th>${autres.map(k => `<th scope="col">${esc(colonne(k)?.l || k)}</th>`).join('')}<th scope="col">Ce qui se fera</th></tr></thead><tbody>
        ${lu.lignes.map(x => `<tr class="${x.ok ? '' : 'tab-im-non'}"><td>${x.n}</td><td>${esc(x.seance.jour ? jourCourt(x.seance.jour) : x.v.jour || '')}</td><td>${esc(x.seance.heure ? heureT(x.seance.heure) : '')}</td><td>${esc(spectacle(x.seance.spectacle_id)?.titre || x.v.spectacle || '')}</td><td>${esc(x.seance.lieu_id ? ouDit(x.seance.lieu_id) : '')}</td>${autres.map(k => `<td>${esc(x.lus[k] ?? '')}</td>`).join('')}
          <td>${x.ok ? esc(x.cible) : `<b class="tab-im-erreur">${esc(x.erreurs.join(' ; '))}</b>`}${x.notes.length ? `<br><small>${esc(x.notes.join(' ; '))}</small>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '';
      $('#tab-im-ok', dlg).textContent = bons.length ? `Créer ${pl(bons.length, 'séance')}` : 'Créer';
      $('#tab-im-ok', dlg).disabled = !bons.length;
    };
    $('#tab-im-texte', dlg).addEventListener('input', apercu);
    // des lignes collées ne se perdent pas d'un Échap : Fermer et Échap posent la question si le texte a changé
    if (typeof GESTES !== 'undefined') GESTES.garder(dlg);
    const fermerImport = async () => { if (await partirSansPerdre({ titre: 'Fermer sans importer ?', texte: 'Les lignes collées seront perdues.', ok: 'Fermer', dans: dlg, avecFiche: false })) dlg.close(); };
    $('#tab-im-non', dlg).addEventListener('click', fermerImport);
    dlg.addEventListener('cancel', e => { if (typeof GESTES !== 'undefined' && GESTES.saisie(dlg)) { e.preventDefault(); fermerImport(); } });
    dlg.addEventListener('close', () => { dlg.remove(); $('#tab-importer')?.focus(); });
    $('#tab-im-ok', dlg).addEventListener('click', async () => {
      const b = $('#tab-im-ok', dlg), xs = lu.lignes.filter(x => x.ok), faits = [];
      b.disabled = true; $('#tab-im-texte', dlg).disabled = true;
      let rates = 0;
      for (const x of xs) {
        b.textContent = `${faits.length + rates + 1} / ${xs.length}…`;
        const tache = T.file.then(() => ajouterSeance(x.seance));
        T.file = tache.catch(() => {});
        try { const a = await tache; if (!a.rien) faits.push(a); } catch { rates++; }
      }
      dlg.close();
      if (faits.length) T.pile.push({ libelle: `${pl(faits.length, 'séance')} importée${faits.length > 1 ? 's' : ''}`, defaire: async () => { for (const a of faits.reverse()) await defaireAjout(a); } });
      const nd = faits.filter(a => a.nouvelle).length;
      etat(`Import : ${pl(faits.length, 'séance')} créée${faits.length > 1 ? 's' : ''}${nd ? `, dont ${pl(nd, 'nouvelle date', 'nouvelles dates')}` : ''}${rates ? ` ; ${rates} refusée${rates > 1 ? 's' : ''} par la base` : ''}.`, rates ? 'erreur' : 'ok', !!faits.length);
      if (faits.length) montrerAjouts(faits.map(a => a.id));
      dessiner();
    });
    dlg.showModal();
    $('#tab-im-texte', dlg).focus();
  }

  return { vue, lireJour, lireHeure, lireTsv, xlsx, lireImport, tableau, exporter, lecteurs: { choix: lireChoix, spectacle: trouverSpectacle, lieu: trouverLieu, personnes: lirePersonnes },
    colonnes: { masquer, montrer, figer, ajuster: ajusterEtGarder, deplacer, origine, retablir, ouvrirChoix, actions, jeu: choisirJeu }, jeux: JEUX.map(j => ({ ...j })), clesFenetres: FENETRES_TABLEUR.slice() };
})();
