'use strict';
/* Les fenêtres ajustables : un seul outil pour tirer le bord d'une surface (le tiroir, la colonne de la liste à côté d'une
   fiche, le coin des boîtes de dialogue), la borner à l'écran, la retrouver telle qu'on l'a laissée sur tous ses appareils, et
   les deux réglages du menu qui s'y rapportent (« Pleine largeur », « Disposition d'origine »).
   Chargé après corbeille.js et avant tiroir.js ; il lit les préférences du compte (admin/prefs.js) et, pour la remise
   animée, CALME_ADMIN du script principal ; sans l'un d'eux (typeof), il fait ce qu'il peut. Il n'existe que dans
   l'administration, à l'ordinateur : rien du tout au téléphone ni au doigt (voir « Où l'outil dort »).
   - Une poignée (FENETRES.poignee) est une bande invisible de 6 px au bord d'une surface. Au survol ou au focus, une ligne de
     2 px à la couleur de la saison paraît ; le curseur dit le sens (col-resize, row-resize, nwse-resize). Elle se tire à la
     souris (événements de pointeur, le pointeur est capturé : on peut sortir de la bande), se règle au clavier (← → ou ↑ ↓ :
     16 px, avec Maj 64 px ; Début et Fin : la plus petite, la plus grande ; Entrée : la taille d'origine) et se remet à
     l'origine d'un double-clic. C'est un séparateur (role="separator", aria-valuemin / max / now, aria-orientation) : un
     lecteur d'écran dit « Largeur : 820 px » une fois le geste fini.
   - Pendant le glisser, html.redim est posé : les transitions sont coupées (pas les animations), rien ne se sélectionne, et
     index.html suspend ce qui se mesure sous la main (le glissement des lignes d'une liste, le repli du pied d'une fiche).
     Le pointeur est suivi au plus une fois par image (requestAnimationFrame), en écrivant une variable CSS ou une largeur /
     hauteur en ligne, jamais un transform : aucune mesure ne se fait sous un transform.
   - Une seule écriture par geste : au relâchement, la valeur va dans la préférence `fenetres.<clé>` (PREFS.ecrire, aussitôt),
     jamais pendant le glisser, et jamais à l'ouverture d'une page. Les clés : fenetres.tiroir (la largeur du tiroir),
     fenetres.liste (la colonne de la liste), fenetres.pleine (le contenu sur toute la largeur : vrai, ou absente),
     fenetres.pl-detail (la colonne du détail d'un jour, à côté de la grille du planning), fenetres.tn (la colonne de la carte
     de tournée, à côté des étapes), fenetres.a4-zoom (l'échelle de la page A4 d'une feuille de route : un pourcentage de 50 à
     200, ou 'auto' pour « Ajuster »), et une par famille de boîtes (fenetres.recherche, .tab-dialogue, .tab-dialogue-large, .crm,
     .tb-brief, .gq-aide, .gf), dont la valeur est la taille { l, h }. Le tableur règle les siennes (TABLEUR.clesFenetres :
     fenetres.tableur-h, .tab-pop-lieu, .tab-pop-distribution, .tab-ed-notes). La hauteur d'une tuile du tableau de bord se garde
     avec la disposition (accueil.tableau, tuiles[i].hauteur), non ici. Rien dans l'adresse.
   - Les bornes : chaque surface déclare la sienne (FENETRES.borner), une fonction de l'écran du moment (le tiroir : de
     480 px à la largeur de l'écran moins 80 px, pour que le voile reste cliquable ; la liste : de 340 px à 55 % de la largeur
     du contenu). Une valeur gardée est ramenée dans ces bornes à chaque lecture, et la surface suit quand la fenêtre change
     de taille : une largeur réglée sur un grand écran reste lisible sur un petit (une boîte : de 320 px à l'écran moins 24 px
     de large, de 200 px à l'écran moins 24 px de haut). Une clé dont la surface n'est pas montée se replie sur 94 % de l'écran.
   - La colonne de la liste (FENETRES.equiperDeux) : les huit pages à deux colonnes (Représentations, Lieux, Équipe,
     Ateliers, Textes, Espace pro, Demandes de devis, Planning › propositions) ont, entre la liste et la fiche, un séparateur
     (.sep-v) qui règle une seule largeur pour toutes : la variable --l-liste, posée sur <html> (héritée par toutes les .deux
     et par le squelette du chargement, épargnée quand une page se redessine). Il est replacé à la mesure de la liste, et
     n'existe pas sous 1 100 px (où la fiche passe sous la liste). equiperDeux est sans effet quand il n'y a rien à faire :
     index.html l'appelle depuis cadre() et à chaque vue (APRES_VUE), si bien que le séparateur survit à un enregistrement
     qui redessine la page.
   - Les boîtes de dialogue (FENETRES.equiperDialog) : la recherche, « Étendre », « Importer », « Choisir dans la troupe », le
     briefing, l'aide « ? » et la feuille de modification (GESTES.formulaire) ont, en bas à droite, un coin qui se tire dans les
     deux sens (une poignée à deux axes, de la même famille que les autres). Un observateur du corps de la page équipe toute
     boîte qui s'y ajoute ou s'ouvre (elles naissent à la volée et partent en se fermant) ; la clé se déduit de la classe de
     la boîte : « Étendre » a tab-dialogue, « Importer » et la troupe tab-dialogue-large, les fenêtres de la diffusion (l'opportunité, le
     courriel de relance) crm. L'équipement est idempotent et rappelé à chaque ouverture : le briefing réécrit son contenu, et
     son coin avec, à chaque fois. Les deux petites questions de l'équipe (periode-choix, retrait-choix) n'en ont pas. Les
     boîtes sont centrées par une marge ou un transform : un côté qui grandit de Δ n'y déplace son bord que de Δ/2, le coin
     écrit donc la largeur += 2·Δx et la hauteur += 2·Δy (la recherche, qui garde sa marge du haut, ne double que la
     largeur). La taille tirée est une largeur et une hauteur en ligne, la hauteur plafonnée à l'écran moins 24 px, et la
     classe dlg-taille dit à la boîte intérieure de la suivre (sans quoi les plafonds propres à chaque boîte annuleraient la
     hauteur tirée). Dans la feuille de modification, le coin n'existe que sous html.admin (l'espace de l'équipe ne le pose
     jamais) et le piège de Tab de la feuille le compte (gestes.js). À l'impression, ni poignée ni coin (habillage.js).
   - Une règle de signe pour tous : le bord nommé (`bord`) est celui de la surface réglée, et tirer ce bord vers l'extérieur
     de la surface l'agrandit. Un détail collé à droite (le planning) a donc `bord: 'gauche'` : tirer vers la gauche l'agrandit ;
     la colonne de la liste ou de la carte, à gauche d'une grille, a `bord: 'droite'`.
   - Entre deux colonnes d'une grille (`entre`) : la poignée est un enfant absolu du conteneur (position: relative), que
     FENETRES replace au milieu de la gouttière à chaque changement de taille des deux colonnes (le planning, la carte de
     tournée) ; la feuille de style de la page la masque quand la grille passe sur une seule colonne.
   - La remise : un double-clic ou Entrée sur la poignée (ou « Taille d'origine » du menu du tiroir) oublie la clé et ramène
     la surface à sa taille d'origine, en 220 ms (le « doux » de site/MOUVEMENT.md), une fois ; rien ne bouge sous
     prefers-reduced-motion ni ?anim=0 (la taille d'origine s'applique d'un coup). « Disposition d'origine »
     (FENETRES.toutOublier) oublie toutes les clés fenetres.* (la pleine largeur et le zoom de la page A4 compris), celles du
     tableur (TABLEUR.clesFenetres), ses colonnes (la clé tableur.colonnes : TABLEUR.colonnes.origine) et le choix du menu
     replié (menu.replie : CADRE.oublierRepli), et rend ce qu'elles valaient, pour le « Annuler » (FENETRES.rendre : les deux
     dernières y sont sous « @tableur.colonnes » et « @menu.replie », rendues par TABLEUR.colonnes.retablir et
     CADRE.rendreRepli). L'un et l'autre remettent aussitôt ce qu'on voit (les poignées vivantes, les boîtes, la mise en page)
     et disent « fenetres:remises » sur document à ce qui n'est pas une poignée (le zoom de la page A4, la largeur de la carte,
     la hauteur du tableur). La hauteur d'une tuile n'en est pas : c'est le « Réinitialiser » du tableau de bord qui la remet.
   - Les réglages du menu (FENETRES.reglages, appelé par cadre.js sous « Replier ») : « Pleine largeur » (un interrupteur :
     html.pleine-largeur lève le plafond de 1 500 px du contenu et du pied de page) et « Disposition d'origine » (tout ce qui
     précède, d'un coup, avec une annonce qui porte « Annuler »). Ils sont sous « Replier », au-dessus de l'apparence (cadre.js),
     l'un sous l'autre ; sur un écran bas (moins de 820 px), ils tiennent sur une rangée d'icônes. « Annuler » rend la valeur
     gardée telle quelle (PREFS.lire avec { brut }), non bornée à l'écran du moment. Comme les poignées, ils ne comptent qu'à
     l'ordinateur : la pleine largeur gardée dort au téléphone et au doigt.
   - Où l'outil dort : la poignée n'est créée qu'à partir de 641 px de large avec un pointeur précis
     ((min-width: 641px) and (pointer: fine)) ; au téléphone et au doigt, les surfaces gardent leur taille d'origine. Ce qui se règle
     sans poignée suit la même règle : une hauteur de tuile gardée (tableau.js) et le zoom de la page A4 (equipe.js, FENETRES.actif)
     ne s'y appliquent pas, la tuile garde sa hauteur et la page reste ajustée.
   FENETRES.poignee(el, { cle, axe: 'x' | 'y' | 'xy', bord: 'gauche' | 'droite' | 'bas' | 'coin', min, max, minY, maxY, lire,
     ecrire, defaut, defautVivant, libelle, garder, centre: 'x' | 'xy', classe, dans, apres, entre }) → l'élément de la poignée (ou null)
       cle     la clé fenetres.<cle> écrite au relâchement ; garder(v) la remplace quand la valeur vit ailleurs (v est null pour
               « taille d'origine ») ; lire() (par défaut la largeur ou la hauteur mesurée de el) et ecrire(v) (par défaut une
               largeur / hauteur en ligne) disent où se lit et s'écrit la taille ; pour 'xy', v vaut { l, h }
       defaut  la taille d'origine, un nombre ou une fonction évaluée au geste ; defautVivant : la surface suit ce défaut quand
               la fenêtre change de taille tant qu'aucune valeur n'est gardée (le tiroir)
       centre  pour une surface centrée par une marge ou un transform : un côté qui grandit de Δ n'y déplace son bord que de
               Δ/2, la poignée écrit donc la largeur += 2·Δx (et la hauteur += 2·Δy avec 'xy')
       dans, apres   où la poignée se place dans le DOM (par défaut à la fin de el), pour l'ordre du focus
       entre   [() => colonne de gauche, () => colonne de droite] : la poignée se tient au milieu de la gouttière (voir plus haut)
   FENETRES.de(el) → { lire, defaut, regler(v, { anime, ranger }), origine({ anime }) } : la commande d'une surface équipée (ranger: false montre la taille sans la garder)
   FENETRES.taille(cle) → la valeur gardée, bornée, ou null     FENETRES.garder(cle, v)     FENETRES.oublier(cle)
   FENETRES.toutOublier() → ce qui était gardé    FENETRES.rendre(avant)    FENETRES.borner(cle, () => ({ min, max, minY, maxY }))
   FENETRES.normaliser(cle, v)    FENETRES.zoomA4(v) → 'auto' | 50 … 200 | null    FENETRES.equiperDeux()
   FENETRES.equiperDialog(dlg, cle?) → le coin de la boîte (ou null)
   FENETRES.reglages(zone) → dessine les deux réglages dans le conteneur donné    FENETRES.appliquerListe()
   FENETRES.appliquerMiseEnPage() (la colonne de la liste et la pleine largeur, avant le premier dessin)    FENETRES.actif() */
const FENETRES = (() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const html = document.documentElement;
  const PREFIXE = 'fenetres.';
  const CLES = ['tiroir', 'liste', 'pleine', 'pl-detail', 'tn', 'a4-zoom', 'recherche', 'tab-dialogue', 'tab-dialogue-large', 'crm', 'tb-brief', 'gq-aide', 'gf'];
  const MEDIA = '(min-width: 641px) and (pointer: fine)', DEUX_COLONNES = '(min-width: 1101px)';
  const DOUX = [.2, .8, .2, 1], DUREE = 220;
  const mq = q => typeof matchMedia === 'function' && matchMedia(q).matches;
  const actif = () => mq(MEDIA);
  const calme = () => (typeof CALME_ADMIN === 'function' ? CALME_ADMIN() : html.classList.contains('still') || mq('(prefers-reduced-motion: reduce)'));
  const nombre = v => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
  const encadrer = (v, min, max) => Math.round(Math.max(Math.min(min, max), Math.min(v, max)));
  const valeur = f => (typeof f === 'function' ? f() : f);

  // ===================================================================================================== les bornes
  // chaque surface déclare les siennes (une fonction de l'écran du moment) ; sans elle, 94 % de l'écran
  const BORNES = {};
  const repli = () => ({ min: 240, max: Math.round(innerWidth * .94), minY: 160, maxY: Math.round(innerHeight * .94) });
  const bornesDe = cle => ({ ...repli(), ...((BORNES[cle] && BORNES[cle]()) || {}) });
  function borner(cle, f) { BORNES[cle] = f; }
  // une valeur lue (un nombre, ou { l, h } pour une boîte) ramenée dans les bornes de sa surface ; null si elle est illisible
  // le zoom de la page A4 : 'auto' (« Ajuster »), ou un pourcentage de 50 à 200 ; le reste est illisible (null)
  const zoomA4 = v => (v === 'auto' ? 'auto' : nombre(v) === null ? null : Math.max(50, Math.min(200, nombre(v))));
  function normaliser(cle, v) {
    if (v === null || v === undefined) return null;
    if (cle === 'a4-zoom') return zoomA4(v);
    const b = bornesDe(cle);
    if (typeof v === 'object' && !Array.isArray(v)) {
      const l = nombre(v.l), h = nombre(v.h);
      if (l === null && h === null) return null;
      return { ...(l !== null ? { l: encadrer(l, b.min, b.max) } : {}), ...(h !== null ? { h: encadrer(h, b.minY, b.maxY) } : {}) };
    }
    const n = nombre(v);
    return n === null ? null : encadrer(n, b.min, b.max);
  }
  // le tiroir : de 480 px à l'écran moins 80 px (le voile reste cliquable) ; la liste : de 340 px à 55 % du contenu
  borner('tiroir', () => ({ min: 480, max: innerWidth - 80 }));
  // la largeur du contenu : celle de la grille quand elle est là, de la page sinon ; au squelette du chargement (ni #vue ni .deux : la
  // page n'est pas encore dessinée), celle qu'elle aura : l'écran moins le menu, plafonné à 1 500 px sauf en pleine largeur, moins ses deux marges de 20 px
  const largeurContenu = () => {
    const d = $('#vue .deux'), v = $('#vue');
    if (d) return d.clientWidth;
    if (v) return v.clientWidth - 40;
    const menu = parseFloat(getComputedStyle(html).getPropertyValue('--large-menu')) || 0;
    return (html.classList.contains('pleine-largeur') ? innerWidth - menu : Math.min(1500, innerWidth - menu)) - 40;
  };
  borner('liste', () => ({ min: 340, max: Math.max(340, Math.floor(largeurContenu() * .55)) }));
  // les boîtes de dialogue : de 320 px à l'écran moins 24 px de large, de 200 px à l'écran moins 24 px de haut (100vw - 24px, 100dvh - 24px)
  const BOITES = ['recherche', 'tab-dialogue', 'tab-dialogue-large', 'crm', 'tb-brief', 'gq-aide', 'gf'];
  BOITES.forEach(c => borner(c, () => ({ min: 320, max: Math.max(320, innerWidth - 24), minY: 200, maxY: Math.max(200, innerHeight - 24) })));
  // (la recherche garde sa marge du haut, 9 % de l'écran : elle ne descend que jusqu'à 12 px du bas, pour que son coin reste atteignable)
  const margeRecherche = () => Math.max(12, Math.round(innerHeight * .09));
  borner('recherche', () => ({ min: 320, max: Math.max(320, innerWidth - 24), minY: 200, maxY: Math.max(200, innerHeight - margeRecherche() - 12) }));
  // le détail du planning : de 240 à 560 px, sans écraser la grille (360 px au moins) ; la carte : de 360 px à la largeur de la
  // grille moins la colonne des étapes (320 px) et la gouttière (18 px)
  borner('pl-detail', () => { const m = $('.pl-mise'); return { min: 240, max: m ? Math.max(240, Math.min(560, m.clientWidth - 14 - 360)) : 560 }; });
  borner('tn', () => { const d = $('.tn-deux'); return { min: 360, max: d ? Math.max(360, d.clientWidth - 320 - 18) : Math.max(360, innerWidth - 420) }; });

  // ===================================================================================================== la mémoire
  const lireBrut = cle => (typeof PREFS === 'undefined' ? null : PREFS.lire(PREFIXE + cle, null));
  const taille = cle => normaliser(cle, lireBrut(cle));
  // la valeur gardée telle quelle, sans la borne de l'écran du moment (pour « Annuler » : une largeur réglée sur un grand écran n'est pas perdue)
  const lireTelle = cle => (typeof PREFS === 'undefined' ? null : PREFS.lire(PREFIXE + cle, null, { brut: true }));
  function garder(cle, v) { if (typeof PREFS !== 'undefined') PREFS.ecrire(PREFIXE + cle, v, { aussitot: true }); }
  const oublier = cle => garder(cle, null);
  // PREFS applique la borne à chaque lecture (« pleine » est un oui / non : rien à borner)
  if (typeof PREFS !== 'undefined') CLES.filter(c => c !== 'pleine').forEach(c => PREFS.normaliser(PREFIXE + c, v => normaliser(c, v)));
  // « Disposition d'origine » remet aussi ce que d'autres modules gardent hors de la liste d'ici : les fenêtres du tableur
  // (TABLEUR.clesFenetres), ses colonnes (la clé tableur.colonnes : TABLEUR.colonnes.origine, rendue par retablir) et le menu
  // replié (menu.replie : CADRE.oublierRepli, rendu par rendreRepli). Leur valeur d'avant va dans le même instantané, sous « @clé ».
  const toutesCles = () => CLES.concat((typeof TABLEUR !== 'undefined' && Array.isArray(TABLEUR.clesFenetres) ? TABLEUR.clesFenetres : []).filter(c => !CLES.includes(c)));
  const AUSSI = {
    'tableur.colonnes': {
      oublier: () => {
        if (typeof TABLEUR === 'undefined' || !TABLEUR.colonnes || typeof PREFS === 'undefined') return undefined;
        const brut = PREFS.lire('tableur.colonnes', null, { brut: true });      // (telle qu'elle était gardée, pas normalisée : « Annuler » la rend à l'identique)
        if (brut === null || brut === undefined) return undefined;
        TABLEUR.colonnes.origine({ dire: false });
        return brut;
      },
      rendre: v => { if (typeof TABLEUR !== 'undefined' && TABLEUR.colonnes) TABLEUR.colonnes.retablir(v); },
    },
    'menu.replie': {
      oublier: () => (typeof CADRE !== 'undefined' && CADRE.oublierRepli ? CADRE.oublierRepli() : undefined),
      rendre: v => { if (typeof CADRE !== 'undefined' && CADRE.rendreRepli) CADRE.rendreRepli(v); },
    },
  };
  // « Disposition d'origine » : toutes les clés fenetres.* à null (et ce qui précède) ; rend ce qu'elles valaient (pour « Annuler » : rendre)
  function toutOublier() {
    const avant = {};
    toutesCles().forEach(c => { const v = lireTelle(c); if (v !== null && v !== undefined) { avant[c] = v; garder(c, null); } });
    Object.entries(AUSSI).forEach(([nom, a]) => { const v = a.oublier(); if (v !== null && v !== undefined) avant['@' + nom] = v; });
    remettre();
    return avant;
  }
  function rendre(avant) {
    Object.entries(avant || {}).forEach(([c, v]) => { if (c.startsWith('@')) AUSSI[c.slice(1)]?.rendre(v); else if (toutesCles().includes(c)) garder(c, v); });
    remettre();
  }
  // les surfaces qu'on voit reprennent la valeur gardée (ou leur origine) sans attendre qu'on les rouvre
  function remettre() {
    appliquerMiseEnPage();
    $$('[data-fenetres]').forEach(d => appliquerDialog(d, d.dataset.fenetres));     // (les boîtes ouvertes ou gardées dans la page reprennent leur taille)
    vivantes.forEach(c => { if (c.p.isConnected) c.reappliquer(); else vivantes.delete(c); });
    majReglages();
    // (ce qui n'est pas une poignée — le zoom de la page A4, equipe.js — écoute ceci pour reprendre sa valeur gardée, ou son origine)
    document.dispatchEvent(new CustomEvent('fenetres:remises'));
  }

  // ===================================================================================================== la poignée
  const vivantes = new Set();           // les commandes des poignées montées (le redimensionnement de la fenêtre les rejoint)
  const parSurface = new WeakMap();
  let zoneSr = null, minuteurSr = 0;
  // « Largeur : 820 px », dit aux lecteurs d'écran une fois le geste fini (différé : il ne couvre pas une autre annonce)
  function dire(texte) {
    if (!zoneSr || !zoneSr.isConnected) {
      zoneSr = document.createElement('div'); zoneSr.className = 'sr'; zoneSr.id = 'sr-fenetres';
      zoneSr.setAttribute('role', 'status'); zoneSr.setAttribute('aria-live', 'polite');
      document.body.append(zoneSr);
    }
    clearTimeout(minuteurSr); zoneSr.textContent = '';
    minuteurSr = setTimeout(() => { zoneSr.textContent = texte; }, 300);
  }
  // la courbe « douce » cubic-bezier(.2, .8, .2, 1) : le temps (0 à 1) → la part du chemin faite
  function courbe(t) {
    const [x1, y1, x2, y2] = DOUX, b = (a, c, s) => 3 * a * (1 - s) * (1 - s) * s + 3 * c * (1 - s) * s * s + s * s * s;
    let bas = 0, haut = 1, s = t;
    for (let i = 0; i < 24; i++) { s = (bas + haut) / 2; if (b(x1, x2, s) < t) bas = s; else haut = s; }
    return b(y1, y2, s);
  }

  // une poignée absolue entre deux colonnes d'une grille : au milieu de la gouttière, replacée dès que le conteneur ou l'une des
  // colonnes change de taille (le conteneur est positionné par la feuille de style de la page : position: relative)
  function gouttiere(conteneur, p, gauche, droite) {
    const placer = () => {
      const a = gauche(), b = droite();
      if (!a || !b || !conteneur.isConnected) return;
      const c = conteneur.getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      p.style.right = 'auto';
      p.style.left = `${Math.round((ra.right + rb.left) / 2 - c.left - 3)}px`;
    };
    placer();
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(() => { if (!p.isConnected) { ro.disconnect(); return; } placer(); });
      ro.observe(conteneur); [gauche(), droite()].forEach(x => { if (x) ro.observe(x); });
    }
  }

  function poignee(el, o = {}) {
    if (!el || !actif()) return null;
    const { cle, axe = 'x', centre = '', libelle = 'Taille' } = o, bord = o.bord || (axe === 'y' ? 'bas' : axe === 'xy' ? 'coin' : 'droite');
    const surX = axe !== 'y', surY = axe !== 'x', deuxAxes = axe === 'xy';
    const sens = bord === 'gauche' ? -1 : 1;                                    // (une surface collée à droite : tirer vers la gauche l'agrandit)
    const facteur = [centre === 'x' || centre === 'xy' ? 2 : 1, centre === 'xy' ? 2 : 1];
    // la taille est un vecteur [largeur, hauteur] (null pour un axe qui ne compte pas) ; ce qui sort et entre est un nombre, ou { l, h }
    const versVec = v => (deuxAxes ? [nombre(v?.l), nombre(v?.h)] : axe === 'y' ? [null, nombre(v)] : [nombre(v), null]);
    const depuisVec = v => (deuxAxes ? { l: v[0], h: v[1] } : axe === 'y' ? v[1] : v[0]);
    const lire = () => {
      if (o.lire) return versVec(o.lire());
      const r = el.getBoundingClientRect();
      return [surX ? Math.round(r.width) : null, surY ? Math.round(r.height) : null];
    };
    const bornes = () => {
      const b = bornesDe(cle);
      return [[valeur(o.min) ?? b.min, valeur(o.max) ?? b.max], [valeur(o.minY) ?? (axe === 'y' ? valeur(o.min) : null) ?? b.minY, valeur(o.maxY) ?? (axe === 'y' ? valeur(o.max) : null) ?? b.maxY]];
    };
    const encadrerVec = v => { const b = bornes(); return v.map((x, i) => (x === null ? null : encadrer(x, b[i][0], b[i][1]))); };
    const defautVec = () => { const d = valeur(o.defaut); return d === undefined || d === null ? lire() : versVec(d); };
    const ecrireBrut = v => {
      if (o.ecrire) { o.ecrire(depuisVec(v)); return; }
      if (v[0] !== null) el.style.width = `${v[0]}px`;
      if (v[1] !== null) el.style.height = `${v[1]}px`;
    };

    const p = document.createElement('div');
    p.className = `poignee poignee-${bord}${bord === 'coin' ? ' dlg-coin' : ''}${o.classe ? ` ${o.classe}` : ''}`;
    p.setAttribute('role', 'separator'); p.tabIndex = 0; p.draggable = false;
    p.setAttribute('aria-orientation', axe === 'y' ? 'horizontal' : 'vertical');
    p.setAttribute('aria-label', libelle);
    p.title = 'Glisser pour ajuster · double-clic : taille d’origine';
    p.dataset.poignee = cle || '';
    p.addEventListener('dragstart', e => e.preventDefault());
    const parent = o.dans || el;
    if (o.apres && o.apres.parentNode) o.apres.after(p); else parent.append(p);
    if (Array.isArray(o.entre)) gouttiere(parent, p, o.entre[0], o.entre[1]);

    let dernier = lire();
    const majAria = () => {
      const b = bornes(), i = surX ? 0 : 1, n = dernier[i];
      p.setAttribute('aria-valuemin', String(Math.round(Math.min(b[i][0], b[i][1]))));
      p.setAttribute('aria-valuemax', String(Math.round(b[i][1])));
      if (n !== null && n !== undefined) p.setAttribute('aria-valuenow', String(n));
    };
    const poser = v => { dernier = v; ecrireBrut(v); majAria(); };
    const texteTaille = v => (deuxAxes ? `Taille : ${v[0]} × ${v[1]} px` : `${axe === 'y' ? 'Hauteur' : 'Largeur'} : ${v[surX ? 0 : 1]} px`);
    // le geste est fini : une écriture, et l'annonce
    const valider = v => {
      if (o.garder) o.garder(depuisVec(v)); else if (cle) garder(cle, depuisVec(v));
      dire(texteTaille(v));
    };

    // ---- la remise (et « Plus large » du menu) : animée une fois, sauf si l'appareil demande le calme
    let tour = 0, touche = 0, visee = null;                      // (visee : la taille où va la remise en cours, pour la finir si l'on saisit la poignée)
    function deplacer(vers, anime, fin = null) {
      cancelAnimationFrame(tour); visee = null;
      const de = lire();
      if (!anime || calme() || vers.every((x, i) => x === de[i])) { poser(vers); if (fin) fin(); return; }
      html.classList.add('redim'); html.dataset.redim = axe; visee = vers;
      const t0 = performance.now();
      const pas = maintenant => {
        const k = Math.min(1, (maintenant - t0) / DUREE), e = courbe(k);
        poser(vers.map((x, i) => (x === null ? null : Math.round(de[i] + (x - de[i]) * e))));
        if (k < 1) tour = requestAnimationFrame(pas); else { html.classList.remove('redim'); delete html.dataset.redim; visee = null; poser(vers); if (fin) fin(); }
      };
      tour = requestAnimationFrame(pas);
    }
    // une taille voulue (le menu, une commande) : bornée, montrée, gardée
    function regler(v, { anime = true, ranger = true } = {}) {
      clearTimeout(touche); touche = 0;
      const vec = encadrerVec(Array.isArray(v) ? v : versVec(v));
      deplacer(vec, anime);
      if (ranger) valider(vec);
    }
    function origine({ anime = true } = {}) {
      clearTimeout(touche); touche = 0;
      // (apresOrigine : la taille d'origine est atteinte ; une boîte efface alors sa taille en ligne et retrouve celle de son contenu)
      deplacer(encadrerVec(defautVec()), anime, o.apresOrigine ? () => { o.apresOrigine(); dernier = lire(); majAria(); } : null);
      if (o.garder) o.garder(null); else if (cle && lireBrut(cle) !== null) oublier(cle);
      dire('Taille d’origine');
    }

    // ---- la souris : le pointeur est capturé, une image à la fois
    let geste = null, image = 0, clic = null;
    const calculer = (g, x, y) => {
      const v = g.v0.slice();
      if (surX && v[0] !== null) v[0] += sens * facteur[0] * (x - g.x0);
      if (surY && v[1] !== null) v[1] += facteur[1] * (y - g.y0);
      return v.map((n, i) => (n === null ? null : encadrer(n, g.b[i][0], g.b[i][1])));
    };
    const memes = (a, b) => a.every((x, i) => x === b[i]);
    p.addEventListener('pointerdown', e => {
      if (e.button !== 0 || !e.isPrimary) return;
      e.preventDefault();
      cancelAnimationFrame(tour); html.classList.remove('redim');
      if (visee) { const fin = visee; visee = null; poser(fin); }      // (une remise en cours est finie d'un coup : la taille voulue est posée, la valeur gardée la dit déjà)
      clearTimeout(touche); touche = 0;
      geste = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, v0: lire(), b: bornes(), bouge: false };
      try { p.setPointerCapture(e.pointerId); } catch { /* le pointeur est déjà parti */ }
      p.focus({ preventScroll: true });
      html.classList.add('redim'); html.dataset.redim = axe;       // (dès l'appui : le style de la page se refait là, pas au premier mouvement)
    });
    p.addEventListener('pointermove', e => {
      if (!geste || e.pointerId !== geste.id) return;
      geste.x = e.clientX; geste.y = e.clientY;
      if (!geste.bouge) {
        if (Math.hypot(geste.x - geste.x0, geste.y - geste.y0) < 2) return;
        geste.bouge = true;
        p.classList.add('actif');
      }
      if (!image) image = requestAnimationFrame(() => { image = 0; if (geste) { const v = calculer(geste, geste.x, geste.y); if (!memes(v, dernier)) poser(v); } });
    });
    function finir() {
      if (!geste) return;
      const g = geste; geste = null;
      cancelAnimationFrame(image); image = 0;
      try { p.releasePointerCapture(g.id); } catch { /* déjà relâché */ }
      html.classList.remove('redim'); delete html.dataset.redim; p.classList.remove('actif');
      if (g.bouge) {
        const v = calculer(g, g.x, g.y);
        poser(v);                                                    // (une dernière fois, le geste fini : la surface écrit alors sa valeur définitive)
        if (!memes(v, g.v0)) setTimeout(() => valider(v), 30);       // (l'écriture et l'annonce après le style refait, dans une autre tâche)
        clic = null;
        return;
      }
      // un clic sans glisser : le second, vite et au même endroit, est un double-clic (la taille d'origine)
      const t = performance.now();
      if (clic && t - clic.t < 400 && Math.hypot(g.x - clic.x, g.y - clic.y) < 6) { clic = null; origine({ anime: true }); } else clic = { t, x: g.x, y: g.y };
    }
    p.addEventListener('pointerup', finir);
    p.addEventListener('pointercancel', finir);
    p.addEventListener('lostpointercapture', finir);

    // ---- le clavier : ← → ou ↑ ↓ 16 px (Maj : 64), Début, Fin, Entrée ; une écriture quand on s'arrête
    const rangerTouche = () => { if (touche) { clearTimeout(touche); touche = 0; valider(dernier); } };
    p.addEventListener('blur', rangerTouche);
    p.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const pas = e.shiftKey ? 64 : 16, b = bornes();
      let v = null;
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); origine({ anime: true }); return; }
      if (e.key === 'Home' || e.key === 'End') v = lire().map((x, i) => (x === null ? null : e.key === 'Home' ? Math.min(b[i][0], b[i][1]) : b[i][1]));
      else {
        let dx = 0, dy = 0;
        if (surX && e.key === 'ArrowRight') dx = pas * sens; else if (surX && e.key === 'ArrowLeft') dx = -pas * sens;
        else if (surY && e.key === 'ArrowDown') dy = pas; else if (surY && e.key === 'ArrowUp') dy = -pas;
        else return;
        v = lire().map((x, i) => (x === null ? null : x + (i === 0 ? dx : dy)));
      }
      e.preventDefault(); e.stopPropagation();
      v = encadrerVec(v);
      if (!memes(v, dernier)) poser(v);
      clearTimeout(touche); touche = setTimeout(rangerTouche, 450);
    });

    // ---- la fenêtre change de taille : les bornes se recalculent, la surface suit ce qui est gardé (ou son origine vivante)
    function reappliquer() {
      const gardee = cle ? taille(cle) : null;
      let vec = null;
      if (gardee !== null && gardee !== undefined) vec = encadrerVec(versVec(gardee));
      else if (o.defautVivant) vec = encadrerVec(defautVec());
      if (vec && !memes(vec, lire())) poser(vec); else { dernier = lire(); majAria(); }
    }
    const commande = { p, el, cle, reappliquer, recalculer: reappliquer };
    vivantes.forEach(c => { if (!c.p.isConnected) vivantes.delete(c); });     // (un tiroir fermé, une boîte partie : on ne retient pas leur DOM)
    vivantes.add(commande);
    parSurface.set(el, { lire: () => depuisVec(lire()), defaut: () => depuisVec(encadrerVec(defautVec())), regler, origine });
    majAria();
    return p;
  }
  const de = el => parSurface.get(el) || null;

  // ===================================================================================================== la colonne de la liste
  // une seule largeur pour les huit pages à deux colonnes : --l-liste sur <html>, héritée par toutes les .deux et par le
  // squelette du chargement ; sans valeur gardée, la feuille de style garde ses 460 px
  function appliquerListe() {
    const t = actif() ? taille('liste') : null;      // (sans poignée pour la défaire, on ne l'applique pas : le doigt garde la colonne d'origine)
    if (typeof t === 'number') html.style.setProperty('--l-liste', `${t}px`); else html.style.removeProperty('--l-liste');
  }
  // le séparateur est replacé à la mesure de la liste (la piste peut être plus étroite que --l-liste), 6 px après son bord
  function replacer(deux) {
    const s = $(':scope > .sep-v', deux), l = $(':scope > .liste', deux);
    if (!s || !l) return;
    s.style.left = `${Math.round(l.getBoundingClientRect().right - deux.getBoundingClientRect().left + 6)}px`;
  }
  function equiperDeux() {
    appliquerMiseEnPage();
    const deux = $('#vue .deux'), possible = !!deux && actif() && mq(DEUX_COLONNES);
    $$('.sep-v').forEach(s => { if (!possible || !deux.contains(s)) s.remove(); });
    if (!possible) return;
    if ($(':scope > .sep-v', deux)) { replacer(deux); return; }
    const liste = () => $(':scope > .liste', deux);
    if (!liste()) return;
    // pendant le geste, la grille de cette page seule prend la largeur (inline : trois fois moins de style à refaire par image que la
    // variable de <html>, que tous les éléments de la page héritent) ; le geste fini (ou sans geste : une flèche, la remise), la variable
    const p = poignee(deux, { cle: 'liste', axe: 'x', bord: 'droite', classe: 'sep-v', libelle: 'Largeur de la liste', defaut: 460,
      lire: () => Math.round(liste()?.getBoundingClientRect().width || 460),
      ecrire: v => {
        if (html.classList.contains('redim')) deux.style.gridTemplateColumns = `minmax(340px, ${v}px) minmax(0, 1fr)`;
        else { deux.style.gridTemplateColumns = ''; html.style.setProperty('--l-liste', `${v}px`); }
        replacer(deux);
      } });
    if (!p) return;
    replacer(deux);
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(() => { if (!deux.isConnected) { ro.disconnect(); return; } replacer(deux); });
      ro.observe(deux); if (liste()) ro.observe(liste());
    }
  }
  if (typeof APRES_VUE !== 'undefined') APRES_VUE.push(equiperDeux);
  if (typeof PREFS !== 'undefined') PREFS.surChangement(PREFIXE + 'liste', () => { if (!html.classList.contains('redim')) { appliquerListe(); equiperDeux(); vivantes.forEach(c => { if (c.cle === 'liste' && c.p.isConnected) c.reappliquer(); }); } });

  // ===================================================================================================== pleine largeur
  // « Pleine largeur » : le contenu ne plafonne plus à 1 500 px (html.pleine-largeur lève le plafond de main et du pied de page,
  // index.html) ; comme la colonne de la liste, seulement là où le réglage se défait (l'ordinateur)
  const pleine = () => lireBrut('pleine') === true;
  function appliquerPleine() { html.classList.toggle('pleine-largeur', actif() && pleine()); }
  // la mise en page du compte : la colonne de la liste (--l-liste) et le plein écran (html.pleine-largeur), posées avant le premier dessin
  function appliquerMiseEnPage() { appliquerListe(); appliquerPleine(); }
  if (typeof PREFS !== 'undefined') PREFS.surChangement(PREFIXE + 'pleine', () => { appliquerPleine(); majReglages(); });
  appliquerMiseEnPage();

  // ===================================================================================================== les boîtes de dialogue
  // Un coin en bas à droite (une poignée sur deux axes) pour la recherche, « Étendre », « Importer », « Choisir dans la troupe », le
  // briefing, l'aide « ? » et la feuille de modification (GESTES.formulaire). Chaque famille de boîtes a sa clé, la taille { l, h }
  // qu'on lui a donnée : fenetres.recherche, .tab-dialogue (Étendre), .tab-dialogue-large (Importer, la troupe), .crm (les fenêtres de la
  // diffusion), .tb-brief, .gq-aide, .gf. Les deux petites questions de l'équipe (periode-choix, retrait-choix) ne sont pas équipées.
  const SEL_BOITES = 'dialog.recherche, dialog.tab-dialogue, dialog.tb-brief, dialog.gq-aide';
  const PETITES_QUESTIONS = ['periode-choix', 'retrait-choix'];
  function cleDe(el) {
    if (el.matches('.gf-boite')) return 'gf';
    if (PETITES_QUESTIONS.includes(el.id)) return null;
    if (el.matches('dialog.recherche')) return 'recherche';
    if (el.matches('dialog.tb-brief')) return 'tb-brief';
    if (el.matches('dialog.gq-aide')) return 'gq-aide';
    if (el.matches('dialog.crm-boite')) return 'crm';                       // (l'opportunité et le courriel de relance : une boîte haute, qui ne partage pas la taille de « Étendre »)
    if (el.matches('dialog.tab-dialogue')) return el.classList.contains('large') ? 'tab-dialogue-large' : 'tab-dialogue';
    return null;
  }
  // toutes sont centrées par une marge ou un transform ; la recherche garde sa marge du haut : elle ne grandit vers le bas que de Δ
  const centreDe = cle => (cle === 'recherche' ? 'x' : 'xy');
  // la taille en ligne : largeur et hauteur, plafonnées à l'écran moins 24 px ; dlg-taille dit à la boîte intérieure de suivre (CSS ci-dessous)
  function poserTaille(el, v, cle) {
    if (v.l !== null && v.l !== undefined) { el.style.width = `${v.l}px`; el.style.maxWidth = 'none'; }
    if (v.h !== null && v.h !== undefined) { el.style.height = `${v.h}px`; el.style.maxHeight = cle === 'recherche' ? 'calc(100dvh - max(12px, 9vh) - 12px)' : 'calc(100dvh - 24px)'; el.classList.add('dlg-taille'); }
  }
  function effacerTaille(el) {
    el.style.width = el.style.height = el.style.maxWidth = el.style.maxHeight = '';
    el.classList.remove('dlg-taille');
  }
  // la taille de la boîte sans taille en ligne, celle de son contenu (la taille d'origine : mesurée au geste, la boîte ouverte)
  function naturel(el) {
    const avant = [el.style.width, el.style.height, el.style.maxWidth, el.style.maxHeight], taillee = el.classList.contains('dlg-taille');
    effacerTaille(el);
    const r = el.getBoundingClientRect();
    [el.style.width, el.style.height, el.style.maxWidth, el.style.maxHeight] = avant;
    if (taillee) el.classList.add('dlg-taille');
    return { l: Math.round(r.width), h: Math.round(r.height) };
  }
  // la taille gardée (ou rien) pour cette boîte, posée d'un coup
  function appliquerDialog(el, cle) {
    const t = actif() ? taille(cle) : null;
    if (t && typeof t === 'object') poserTaille(el, t, cle); else effacerTaille(el);
  }
  // idempotent : rappelée à chaque ouverture (le briefing réécrit son contenu, et son coin avec, à chaque fois) et quand le coin disparaît
  function equiperDialog(el, cle) {
    if (!el || !html.classList.contains('admin') || !actif()) return null;
    cle = cle || cleDe(el);
    if (!cle) return null;
    appliquerDialog(el, cle);
    let coin = $(':scope > .dlg-coin', el);
    if (!coin) {
      coin = poignee(el, { cle, axe: 'xy', bord: 'coin', centre: centreDe(cle), libelle: 'Taille de la fenêtre',
        defaut: () => naturel(el), ecrire: v => poserTaille(el, v, cle), apresOrigine: () => effacerTaille(el) });
      if (!el.dataset.fenetres) {
        el.dataset.fenetres = cle;
        if (el.localName === 'dialog' && typeof MutationObserver === 'function') {
          new MutationObserver(() => { if (el.isConnected && !$(':scope > .dlg-coin', el)) equiperDialog(el, cle); }).observe(el, { childList: true });
        }
      }
    } else vivantes.forEach(c => { if (c.el === el) c.reappliquer(); });
    return coin;
  }
  function equiperBoite(n) {
    if (!(n instanceof Element)) return;
    if (n.matches(SEL_BOITES)) { if (n.open) equiperDialog(n); }
    else if (n.matches('.gf')) { const f = $('.gf-boite', n); if (f) equiperDialog(f, 'gf'); }
  }
  // les boîtes naissent à la volée et partent en se fermant : l'observateur équipe celles qui s'ajoutent au corps de la page, et celles
  // qui s'ouvrent (la recherche et le briefing restent dans la page, fermés)
  if (typeof MutationObserver === 'function' && document.body) {
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(equiperBoite))).observe(document.body, { childList: true });
    new MutationObserver(ms => ms.forEach(m => equiperBoite(m.target))).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
    $$(SEL_BOITES).forEach(equiperBoite);
  }

  // ===================================================================================================== les réglages du menu
  // « Pleine largeur » (un interrupteur) et « Disposition d'origine » (efface toutes les tailles gardées, avec « Annuler »), dessinés dans le
  // conteneur que cadre.js donne (les réglages du menu latéral)
  const icone = nom => (typeof ICONES !== 'undefined' ? ICONES.svg(nom, { taille: 20 }) : '');
  function majReglages() {
    const b = $('#fen-pleine');
    if (b) b.setAttribute('aria-pressed', String(pleine()));
  }
  function reglages(zone) {
    if (!zone || $('.fen-reglages', zone)) return null;
    const g = document.createElement('div');
    g.className = 'fen-reglages'; g.setAttribute('role', 'group'); g.setAttribute('aria-label', 'Fenêtres');
    g.innerHTML = `<button type="button" class="fen-reglage" id="fen-pleine" aria-pressed="false" title="Pleine largeur : le contenu ne plafonne plus à 1 500 px">${icone('moniteur')}<span class="menu-l">Pleine largeur</span></button>
      <button type="button" class="fen-reglage" id="fen-origine" title="Disposition d’origine : les tailles des fenêtres, la pleine largeur, le zoom de la page A4, les colonnes du tableur et le menu reviennent à leur origine">${icone('actualiser')}<span class="menu-l">Disposition d’origine</span></button>`;
    zone.append(g);
    $('#fen-pleine', g).addEventListener('click', () => {
      const v = !pleine();
      garder('pleine', v ? true : null);
      appliquerPleine(); majReglages();
      dire(v ? 'Pleine largeur' : 'Largeur d’origine');
    });
    $('#fen-origine', g).addEventListener('click', () => {
      const avant = toutOublier();
      if (typeof annoncer !== 'function') return;
      if (!Object.keys(avant).length) { annoncer('La disposition est déjà celle d’origine.'); return; }
      // tout de suite, sans question : l'annonce porte « Annuler », qui rend ce que les clés valaient
      annoncer('Disposition d’origine remise : les tailles des fenêtres, la pleine largeur, le zoom de la page A4, les colonnes du tableur et le menu sont revenus à leur origine.', { libelle: 'Annuler', delai: 8000, action: () => {
        rendre(avant);
        annoncer('La disposition d’avant est revenue.');
      } });
    });
    majReglages();
    return g;
  }

  // ---- la fenêtre change de taille : une fois par image
  let imageFenetre = 0;
  window.addEventListener('resize', () => {
    if (imageFenetre) return;
    imageFenetre = requestAnimationFrame(() => {
      imageFenetre = 0;
      if (html.classList.contains('redim')) return;
      vivantes.forEach(c => { if (c.p.isConnected) c.recalculer(); else vivantes.delete(c); });
      equiperDeux();
    });
  });

  // ===================================================================================================== le CSS commun
  const style = document.createElement('style');
  style.id = 'styles-fenetres';
  style.textContent = `
/* la poignée : une bande de 6 px, invisible ; au survol et au focus, une ligne de 2 px à la couleur de la saison (au clavier,
   l'anneau commun :focus-visible de la page l'entoure aussi) */
.poignee { position: absolute; z-index: 4; margin: 0; padding: 0; border: 0; background: none; touch-action: none; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
.poignee::after { content: ""; position: absolute; border-radius: 2px; background: var(--accent); opacity: 0; transition: opacity .12s ease-out; pointer-events: none; }
.poignee:hover::after, .poignee:focus-visible::after, .poignee.actif::after { opacity: 1; }
.poignee-gauche, .poignee-droite { top: 0; bottom: 0; width: 6px; cursor: col-resize; }
.poignee-gauche { left: -3px; }
.poignee-droite { right: -3px; }
.poignee-gauche::after, .poignee-droite::after { top: 0; bottom: 0; left: 2px; width: 2px; }
.poignee-bas { left: 0; right: 0; bottom: -3px; height: 6px; cursor: row-resize; }
.poignee-bas::after { left: 0; right: 0; top: 2px; height: 2px; }
/* le coin d'une boîte : une équerre de 10 px dans une zone de 16 px */
.poignee-coin { right: 0; bottom: 0; width: 16px; height: 16px; cursor: nwse-resize; }
.poignee-coin::after { right: 4px; bottom: 4px; width: 10px; height: 10px; border-radius: 0 0 4px 0; background: none; border-right: 2px solid var(--accent); border-bottom: 2px solid var(--accent); opacity: .55; }
.poignee-coin:hover::after, .poignee-coin:focus-visible::after, .poignee-coin.actif::after { opacity: 1; }
/* le séparateur de la liste : posé en absolu dans la grille (hors des colonnes), replacé par FENETRES ; sa ligne suit l'écran */
.sep-v { z-index: 3; right: auto; }
.sep-v::after { position: sticky; display: block; top: calc(var(--haut-barre, 60px) + 10px); bottom: auto; left: auto; width: 2px; height: calc(100vh - var(--haut-barre, 60px) - 30px); margin: 0 auto; }
.sep-v.actif::after { position: absolute; top: 0; bottom: 0; height: auto; left: 2px; margin: 0; }
@media (max-width: 1100px) { .sep-v { display: none; } }
/* entre deux colonnes (le planning, la carte) : la poignée est absolue, FENETRES la place dans la gouttière ; sa ligne court sur toute la hauteur */
.poignee[data-poignee="pl-detail"], .poignee[data-poignee="tn"] { z-index: 3; }
@media not all and (min-width: 641px) and (pointer: fine) { .poignee { display: none; } }
/* le geste : le glisser suit le pointeur, rien ne glisse en même temps (les transitions sont coupées, pas les animations). Des
   sélecteurs de classes, jamais « * » : un sélecteur universel sous html.redim refait le style de toute la page (50 ms de plus
   par appui à CPU=4). Le curseur reste celui de la poignée : elle a capturé le pointeur. */
html.redim body { -webkit-user-select: none; user-select: none; }
html.redim .tiroir, html.redim .tiroir-voile, html.redim .deux, html.redim .liste, html.redim .editeur, html.redim .pied-ed, html.redim dialog, html.redim .poignee, html.redim .poignee::after { transition: none !important; }
/* une boîte équipée ne défile jamais par elle-même : le coin, posé en absolu, défilerait avec le contenu et quitterait l'angle. C'est sa
   boîte intérieure qui défile ; tab-dialogue passe en colonne pour que cette boîte se raccourcisse au plafond de la boîte (la recherche, le
   briefing, l'aide et la feuille avaient déjà leur défilement à l'intérieur) */
dialog.dlg-taille, dialog[data-fenetres] { overflow: hidden; }
dialog[data-fenetres] > .tab-dialogue-boite { min-height: 0; overflow: auto; overscroll-behavior: contain; }
dialog.tab-dialogue[data-fenetres]:not(.troupe-choix)[open] { display: flex; flex-direction: column; }
/* une boîte à qui l'on a donné une hauteur : sa boîte intérieure la suit (sans cela, les plafonds propres à chaque boîte — la recherche
   580 px, la troupe 720 px — annuleraient la hauteur tirée) ; le coin reste en place */
dialog.dlg-taille > .tab-dialogue-boite { height: 100%; max-height: none; align-content: start; overflow: auto; }
dialog.dlg-taille > .tb-brief-boite, dialog.dlg-taille > .gq-boite { height: 100%; max-height: none; }
dialog.dlg-taille .tb-brief-corps { flex: 1 1 auto; min-height: 0; }
/* « Pleine largeur » et « Disposition d'origine », dans les réglages du menu (le logement sous « Replier », qui a déjà ses 8 px de
   marge) : comme le bouton « Replier », l'un sous l'autre */
.fen-reglages { display: flex; flex-direction: column; gap: 2px; }
.fen-reglage { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 44px; margin: 0; padding: 0 12px; border: 0; border-radius: 10px; background: none; color: var(--gris); font: inherit; font-weight: 600; text-align: left; white-space: nowrap; cursor: pointer; }
.fen-reglage:hover { background: var(--doux); color: var(--encre); }
.fen-reglage[aria-pressed="true"] { background: var(--accent-doux); color: var(--encre); }
.fen-reglage:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }
@container menu (max-width: 120px) { .fen-reglage { justify-content: center; gap: 0; padding: 0; } }
/* un écran bas (moins de 820 px) : les deux réglages tiennent sur une rangée d'icônes de 36 px (leur nom reste lu et en infobulle), pour
   que le menu défile le moins possible ; dans le menu replié, ils restent l'un sous l'autre */
@media (max-height: 819px) {
  .fen-reglages { flex-direction: row; }
  .fen-reglage { flex: 1 1 0; width: auto; min-height: 36px; margin: 0; padding: 0; justify-content: center; gap: 0; }
  .fen-reglage .menu-l { position: absolute; width: 1px; height: 1px; flex: none; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
}
@container menu (max-width: 120px) { @media (max-height: 819px) { .fen-reglages { flex-direction: column; } } }
@media not all and (min-width: 641px) and (pointer: fine) { .fen-reglages { display: none; } }
html.still .poignee::after { transition: none; }
@media (prefers-reduced-motion: reduce) { .poignee::after { transition: none; } }`;
  document.head.append(style);

  return { poignee, de, taille, garder, oublier, toutOublier, rendre, borner, normaliser, zoomA4, equiperDeux, equiperDialog, appliquerListe, appliquerMiseEnPage, reglages, actif, CLES: CLES.slice() };
})();
