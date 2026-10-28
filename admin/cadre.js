'use strict';
/* Le cadre de l'administration : le menu latéral des douze rubriques, qui se replie, et, en bas, les réglages d'apparence
   (le thème, la densité). La coque elle-même (l'en-tête, le menu
   et le contenu côte à côte) est construite une fois par poserCoque(), dans le script principal d'index.html, qui appelle ce
   module à deux moments : CADRE.poser(rubrique) quand la coque vient d'être construite, CADRE.marquer(rubrique) à chaque vue. Chargé
   après tournee.js et avant mobile.js ; il lit les rubriques du script principal (rubriquesVisibles), les icônes
   (admin/icones.js) et les préférences du compte (admin/prefs.js) ; sans l'un d'eux, il fait ce qu'il peut (typeof).
   - CADRE.poser(rubrique) dessine dans #menu (l'aside, gardé d'une route à l'autre) la <nav aria-label="Rubriques"> : pour chaque
     rubrique un lien <a href="#/k" title="Représentations (G puis D)"> avec son icône, son nom en petites capitales (.menu-l)
     et la place d'un badge (.menu-badge, dont le chiffre est dans data-n) ; puis le bouton « Replier » (.menu-replier : aria-expanded, aria-controls,
     aria-keyshortcuts="Alt+M") et, sous lui, un <div class="menu-reglages"> vide, que les réglages d'interface rempliront (marquer n'y
     touche pas) : FENETRES.reglages y pose d'abord son bloc (.fen-reglages : « Pleine largeur », « Disposition d'origine »,
     fenetres.js), puis CADRE.reglages() le sien, l'apparence, au pied de la colonne. ↑ ↓ passent d'une rubrique à l'autre (GESTES.fleches).
   - Le lien « Représentations » rouvre la dernière vue de la rubrique (la préférence `representations.vue`, écrite par le script principal
     à chaque route de la rubrique, à l'ordinateur seulement) : son href est #/representations, /tableur ou /carte, relu à chaque vue.
   - CADRE.marquer(rubrique) pose aria-current="page" sur la rubrique de la vue (aucune pour une page hors rubriques), et
     redessine la nav quand la liste des rubriques visibles a changé (la Diffusion paraît quand la base a ses tables, E.ideale),
     et fait suivre les badges.
   - CADRE.basculer(replie) replie ou déplie (sans argument : l'inverse de ce qu'on voit), CADRE.replie() dit ce qu'on voit.
   Le repli, c'est une largeur : html.menu-replie (64 px) ou html.menu-deplie (240 px), lues par la feuille d'index.html
   (--large-menu, que la colonne de la grille et l'aside lisent tous deux, et que le repli anime). La feuille décide seule
   tant que personne n'a choisi : déplié à partir de 1 340 px, replié en dessous. Ce qu'on choisit en dépend :
   - à partir de 1 340 px, replier ou déplier est un choix : la préférence du compte `menu.replie` (true / false), écrite
     aussitôt (PREFS.ecrire : elle dit une fois où elle est gardée) et recopiée dans le miroir de l'appareil
     `crescite-admin-apparence:<compte>` ({ "menu.replie": true }), que le <script id="apparence"> du <head> lit avant le
     premier dessin pour que le menu naisse comme on l'a laissé ; un autre onglet ou un autre appareil se replie avec le
     premier (PREFS.surChangement) ;
   - sous 1 340 px, le menu naît replié sans que ce soit un choix (rien n'est écrit) ; le déplier exprès ne vaut que pour
     l'onglet (sessionStorage `crescite-admin-menu`), jamais pour le compte : la clé reste ce qu'elle était sur un grand écran.
   L'annonce « Menu replié » / « Menu déplié » est dite aux lecteurs d'écran par une zone polie (#sr-menu), posée vide avec le
   menu. Au téléphone (moins de 641 px) le menu est masqué par la feuille d'index.html.
   Les badges (CADRE.badges) disent ce qui attend, en corail, sur trois rubriques : le Tableau de bord (les lignes « à traiter » de
   la tuile, hors reportées), la Diffusion (les demandes de devis nouvelles) et l'Équipe (les notes de frais en attente). Le
   compte (TABLEAU.urgences) n'est pas gratuit : il se fait au repos de la page (requestIdleCallback), se garde 30 secondes,
   et se refait un instant après un changement reçu en direct, un report ou une relecture de la base. Replié, le badge
   devient un point sur l'icône ; le lien dit son compte aux lecteurs d'écran
   (aria-label « Diffusion CRM, 3 devis à traiter »). Les raccourcis (Alt+M, G puis une lettre)
   sont déclarés dans le registre RACCOURCIS du script principal ; le menu en écrit la touche dans l'infobulle de chaque lien.
   Les accès rapides tiennent le milieu du menu, entre les rubriques et le bouton de repli, sous l'étiquette « Accès rapides »
   (un <nav aria-label="Accès rapides">, sans la classe .nav : les rubriques restent seules à porter aria-current). Ils se
   redessinent à chaque vue (CADRE.marquer), parce que ce qu'ils montrent dépend de la base (E.ideale, E.equipeInstallee, E.sql4
   se connaissent après le premier dessin) :
   - « ＋ Créer » (.menu-creer, en dégradé de la saison : aria-haspopup="menu", aria-expanded) ouvre un menu de GESTES (↑ ↓ Entrée
     Échap) à côté du bouton (à sa droite, le haut aligné sur lui : il recouvre la page, jamais les rubriques ni le bouton) :
     les actions de TABLEAU.ACTIONS dont le libellé commence par « ＋ » et dont la condition est vraie, chacune avec son icône
     (le sixième élément d'ACTIONS). Le menu n'a qu'un signal de fermeture, l'événement « gestes:menu-ferme »
     de gestes.js : il remet aria-expanded à faux, et sert à reconnaître le second clic, qui referme (le pointerdown de gestes.js a
     déjà fermé le menu quand le clic arrive : sans cette garde, le clic le rouvrirait). « Opportunité de diffusion » mène à la
     Diffusion puis clique « Nouvelle opportunité » (CADRE.nouvelleOpportunite, qui sert aussi la tuile « actions » et la barre de
     commande : sur la Diffusion même, il clique tout de suite).
   - Les épinglés (.menu-epingle, des <a> avec leur icône et leur nom) sont la clé de préférence `menu.epingles` : une liste de clés
     d'ACTIONS, au plus douze, normalisée à la lecture (clés inconnues, clés « ＋ » et 'recherche' ignorées, doublons ôtés), par
     défaut TABLEAU.MENU_EPINGLES_DEFAUT ; une action dont la condition est fausse (la Diffusion sans ses tables) n'est pas
     dessinée, mais reste dans la clé. CADRE.mettreAuMenu(k), retirerDuMenu(k) et deplacer(k, ±1) l'écrivent aussitôt et
     l'annoncent, avec « Annuler ». Un épinglé qui arrive saute (la classe .pop de la feuille, sauf si l'appareil demande moins
     d'animations). Le menu contextuel d'un épinglé (clic droit, Maj+F10) et celui d'une action de la tuile « actions » du tableau
     de bord (« Mettre dans le menu ») sont dans menus.js.
   - Les récents (.menu-recent) sont les cinq dernières fiches ouvertes, « Date · Bérénice, 5 nov. » : la liste de la recherche
     (Ctrl K, champ vide), celle du script principal (noterRecente, localStorage `crescite-admin-recentes`, donc partagée entre
     onglets), dont descriptionRecente() dit le genre et le nom d'aujourd'hui ; une fiche supprimée disparaît. Un récent neuf se
     pose (.ad-neuf). Le script principal appelle CADRE.recents() chaque fois qu'il en note un (une fiche ouverte, en page ou en
     tiroir, ou créée).
   Replié, il ne reste de tout cela que « ＋ » et les icônes des épinglés (leur nom en infobulle) ; les récents disparaissent.
   Sur un écran bas, « Créer » (et l'étiquette) ne défilent jamais : seuls les épinglés et les récents (.menu-defile) défilent d'eux-mêmes,
   réduits jusqu'à une ligne pour garder le repli et les réglages au pied de l'écran ; à la souris, sous 780 px de haut, les rubriques
   se resserrent, et plus bas encore c'est le menu entier qui défile (replié à 1 280 × 900 déjà : la colonne des réglages est haute).
   L'apparence : deux préférences du compte, `theme` ('nuit' par défaut, 'jour', ou 'appareil', qui suit le réglage du système) et
   `densite` ('confortable' par défaut, ou 'compacte'). Le thème est la nuit ou le jour de <html data-theme> ; « appareil » se résout
   ici en nuit ou en jour (la feuille de style ne connaît que data-theme) et suit le système tant qu'il est choisi (matchMedia
   « prefers-color-scheme »). La coque (l'en-tête et le menu) reste de nuit dans les deux thèmes : le jour ne change que le contenu.
   La densité (html data-densite="compacte") resserre les lignes, les champs et le texte courant, à la souris seulement : sa
   feuille est dans habillage.js, ses valeurs (--pas, --h-champ, --pad-champ, --h-ligne-menu) dans le :root d'index.html.
   Ce que fait un choix : le thème ou la densité est posé aussitôt sur <html> (sans transition : html.bascule la coupe le temps d'un
   recalcul de style), les balises color-scheme et theme-color du <head> le suivent, le miroir de l'appareil
   (`crescite-admin-apparence:<compte>`, lu par le <script id="apparence"> du <head> avant le premier dessin) le garde, la préférence
   part au compte (PREFS.ecrire : elle dit une fois où elle est gardée) et une annonce le dit (« Thème : jour. »). Un autre onglet
   ou un autre appareil suit (PREFS.surChangement). La première fois sur un appareil (le miroir manque), la coque pose le thème du
   compte à son dessin : un seul changement, sans fondu. Un changement de thème fait remonter de nouveau la tentacule de la page,
   à la couleur d'accent du nouveau thème (sinon elle garderait les couleurs de l'autre jusqu'à la prochaine arrivée).
   - CADRE.reglages() dessine dans le <div class="menu-reglages"> son propre bloc (.reg-apparence), une seule fois : la pilule du
     thème (role="radiogroup", trois role="radio" aria-checked : lune, soleil, moniteur ; les flèches passent de l'un à l'autre
     et choisissent, un seul est dans l'ordre du clavier) et le bouton de la densité (aria-pressed) ; chacun de 44 px, avec son
     libellé en .sr et son infobulle. Un autre réglage se pose à côté dans le même conteneur, par son propre bloc : celui-ci ne
     se redessine jamais, il met seulement à jour ses attributs. L'icône choisie saute (.pop, 450 ms, le ressort).
   - CADRE.theme(valeur) et CADRE.densite(valeur) font ce que fait un clic (les commandes « Mode jour », « Mode nuit » et
     « Compact » de la recherche) ; CADRE.apparence() dit ce qui est réglé : { theme, resolu, densite }.
   CADRE.poser(rubrique)   CADRE.marquer(rubrique)   CADRE.basculer(replie)   CADRE.replie()   CADRE.badges()   CADRE.perimer()
   CADRE.creer()   CADRE.epingles()   CADRE.estAuMenu(k)   CADRE.epinglable(k)   CADRE.mettreAuMenu(k)   CADRE.retirerDuMenu(k)
   CADRE.deplacer(k, sens)   CADRE.recents()   CADRE.nouvelleOpportunite()   CADRE.allerEtCliquer(adresse, selecteur)
   CADRE.reglages()   CADRE.theme(valeur)   CADRE.densite(valeur)   CADRE.apparence()
   CADRE.oublierRepli() → le choix d'avant (« Disposition d'origine »)   CADRE.rendreRepli(v) */
const CADRE = (() => {
  const html = document.documentElement;
  const CLE = 'menu.replie', CLE_THEME = 'theme', CLE_DENSITE = 'densite', MIROIR = 'crescite-admin-apparence', SESSION = 'crescite-admin-menu', PETIT = '(max-width: 1339px)';
  // l'icône de chaque rubrique (les noms de la bibliothèque, admin/icones.js ; la rubrique Représentations est « dates »)
  const ICONE = { accueil: 'tableau-de-bord', representations: 'dates', planning: 'planning', feuilles: 'feuilles', spectacles: 'spectacles', equipe: 'equipe', diffusion: 'diffusion', pro: 'mallette', ateliers: 'ateliers', lieux: 'lieux', textes: 'texte', journal: 'journal' };
  const petit = () => typeof matchMedia === 'function' && matchMedia(PETIT).matches;
  const menu = () => document.getElementById('menu');
  // ce qu'on voit : replié si le dépli n'est pas voulu et que le repli l'est (html.menu-replie) ou que l'écran est étroit
  const replie = () => !html.classList.contains('menu-deplie') && (html.classList.contains('menu-replie') || petit());
  const depliSession = () => { try { return sessionStorage.getItem(SESSION) === 'deplie'; } catch { return false; } };
  const noterSession = oui => { try { if (oui) sessionStorage.setItem(SESSION, 'deplie'); else sessionStorage.removeItem(SESSION); } catch { /* onglet sans stockage : le dépli ne vaut que pour cette page */ } };

  // ===================================================================================================== le miroir de l'apparence
  // (une valeur par clé de préférence : `menu.replie`, `theme`, `densite` ; le <script id="apparence"> du <head> les lit avant le
  // premier dessin. Une valeur neutre (celle qu'on aurait sans miroir) retire la clé : le miroir n'est pas créé pour rien)
  function ecrireMiroir(cle, valeur, neutre) {
    const uid = typeof E !== 'undefined' && E.session?.user?.id;
    if (!uid) return;
    try {
      const nom = `${MIROIR}:${uid}`;
      let a = null; try { a = JSON.parse(localStorage.getItem(nom) || 'null'); } catch { /* illisible : on repart de rien */ }
      a = a && typeof a === 'object' && !Array.isArray(a) ? a : {};
      if (valeur === neutre) { if (!(cle in a)) return; delete a[cle]; }
      else { if (a[cle] === valeur) return; a[cle] = valeur; }
      localStorage.setItem(nom, JSON.stringify(a));
    } catch { /* stockage fermé : le menu naîtra selon la largeur, la page en nuit confortable */ }
  }
  const ecrireMiroirMenu = replie => ecrireMiroir(CLE, replie === true, false);

  // ===================================================================================================== le menu
  const cleRubriques = () => (typeof rubriquesVisibles === 'function' ? rubriquesVisibles() : []).map(r => r[0]).join(',');
  // (la rubrique courante est marquée dès le dessin : posée après coup, sa couleur passerait par la transition des liens)
  // (l'infobulle dit le nom, que le menu replié cache, et la séquence qui y mène : « Représentations (G puis D) » ; elle n'est pas
  // dans aria-keyshortcuts, qui ne sait pas dire une suite de touches)
  const titreLien = (k, nom) => { const s = typeof RACCOURCIS !== 'undefined' ? RACCOURCIS.libelle(`rubrique.${k}`) : ''; return s ? `${nom} (${s})` : nom; };
  // (le lien « Représentations » rouvre la vue retenue, adresseDates() du script principal : la liste, le tableur ou la carte)
  const adresseDe = k => (k === 'representations' && typeof adresseDates === 'function' ? adresseDates() : `#/${k}`);
  const lien = courante => ([k, nom]) => `<a href="${adresseDe(k)}" data-rubrique="${k}"${k === courante ? ' aria-current="page"' : ''} title="${esc(titreLien(k, nom))}">${ICONES.svg(ICONE[k] || 'points', { taille: 20 })}<span class="menu-l">${esc(nom)}</span><span class="menu-badge" aria-hidden="true"></span></a>`;
  function dessinerNav(m, courante) {
    const nav = $('.nav', m), rub = typeof rubriquesVisibles === 'function' ? rubriquesVisibles() : [];
    nav.innerHTML = rub.map(lien(courante)).join('');
    m.dataset.rubriques = cleRubriques();
  }
  // le bouton dit ce qu'il fera : « Replier » (le chevron vers la gauche) quand le menu est déplié, « Déplier » sinon
  function majBouton() {
    const m = menu(), b = m && $('.menu-replier', m);
    if (!b) return;
    const r = replie();
    b.setAttribute('aria-expanded', String(!r));
    const t = typeof RACCOURCIS !== 'undefined' ? RACCOURCIS.libelle('menu.replier') : '';
    b.title = `${r ? 'Déplier' : 'Replier'} le menu${t ? ` (${t})` : ''}`;
    b.innerHTML = `${ICONES.svg(r ? 'droite' : 'gauche', { taille: 20 })}<span class="menu-l">${r ? 'Déplier' : 'Replier'}</span>`;
  }
  function poser(courante) {
    const m = menu();
    if (!m || m.dataset.pose) return;
    m.dataset.pose = '1';
    preparerAnnonce();
    m.innerHTML = '<nav class="nav" aria-label="Rubriques"></nav><nav class="menu-acces" aria-label="Accès rapides"></nav><button type="button" class="menu-replier" aria-expanded="true" aria-controls="menu"></button><div class="menu-reglages"></div>';
    dessinerNav(m, courante);
    poserAcces(m);
    const bouton = $('.menu-replier', m);
    const ks = typeof RACCOURCIS !== 'undefined' ? RACCOURCIS.keyshortcuts('menu.replier') : '';
    if (ks) bouton.setAttribute('aria-keyshortcuts', ks);
    bouton.addEventListener('click', () => basculer());
    if (typeof GESTES !== 'undefined') { GESTES.fleches(m, '.nav a', { horizontal: false }); GESTES.fleches(m, '.menu-creer, .menu-epingle, .menu-recent', { horizontal: false }); }
    if (typeof PREFS !== 'undefined') { appliquer(PREFS.lire(CLE)); appliquerTheme(themeVoulu()); appliquerDensite(densiteVoulue()); }
    if (typeof FENETRES !== 'undefined') FENETRES.reglages($('.menu-reglages', m));     // (« Pleine largeur » et « Disposition d'origine », fenetres.js)
    reglages();
    majBouton();
  }
  function marquer(rubrique) {
    const m = menu();
    if (!m || !m.dataset.pose) return;
    if (m.dataset.rubriques !== cleRubriques()) dessinerNav(m, rubrique);
    $$('.nav a', m).forEach(a => { if (a.dataset.rubrique === rubrique) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    suivreVueRetenue();
    badges();
    dessinerAcces();
  }
  // le lien « Représentations » porte l'adresse de la vue retenue : relu à chaque vue, et quand un autre onglet ou un autre
  // appareil en retient une autre
  function suivreVueRetenue() {
    const a = menu() && $('.nav a[data-rubrique="representations"]', menu()), h = adresseDe('representations');
    if (a && a.getAttribute('href') !== h) a.setAttribute('href', h);
  }

  // ===================================================================================================== les badges
  /* Ce qui attend, sur trois rubriques. Le compte vient du tableau de bord (TABLEAU.urgences), qui calcule aussi les conflits
     d'équipe et les factures : on ne le fait pas dans le tour qui dessine la vue, mais au repos de la page, et on le garde
     30 secondes (le mémo). Le Tableau de bord suit ce que la tuile « À traiter » suit (hors reportées) ; la Diffusion et
     l'Équipe comptent leurs catégories à elles, quels que soient les réglages de la tuile (un compte qui a décoché les devis
     dans la tuile garde son badge). Un changement reçu en direct (APRES_CHANGEMENT), un report, un épinglage ou une relecture de la base (CADRE.perimer) périment le mémo, un instant plus tard. */
  const DUREE_MEMO = 30000, DELAI_CHANGEMENT = 1200, DELAI_REPORT = 300;
  const aux = [['accueil', n => `${n} à traiter`], ['diffusion', n => `${n} devis à traiter`], ['equipe', n => `${n} ${n > 1 ? 'notes de frais en attente' : 'note de frais en attente'}`]];
  let memo = null, sale = false, prevu = false, minuteurChangement = 0;
  const auRepos = f => (window.requestIdleCallback ? window.requestIdleCallback(f, { timeout: 2500 }) : setTimeout(f, 1));
  function calculer() {
    prevu = false;
    if (typeof TABLEAU === 'undefined' || typeof E === 'undefined' || !E.pret) return;
    try {
      const tout = TABLEAU.urgences(), les = TABLEAU.urgences({ categories: ['devis', 'frais'] }).categories;
      const hors = k => (les.find(c => c.k === k)?.lignes || []).filter(x => !x.reporte).length;
      memo = { le: Date.now(), accueil: tout.lignes.filter(x => !x.reporte).length, diffusion: hors('devis'), equipe: hors('frais') };
      sale = false;
    } catch (e) { console.error(e); return; }
    peindre();
  }
  // (chaque lien : le nombre dans le badge, le compte dit en toutes lettres par aria-label ; rien quand il n'y a rien. Le nombre
  // est dans l'attribut data-n, que la feuille écrit (::after) : il ne s'ajoute pas au texte du lien. Ce qui est déjà écrit
  // n'est pas réécrit : un lecteur d'écran ne l'entend pas de nouveau)
  function peindre() {
    const m = menu();
    if (!m || !memo) return;
    for (const [k, dire] of aux) {
      const a = $(`.nav a[data-rubrique="${k}"]`, m), b = a && $('.menu-badge', a);
      if (!b) continue;
      const n = memo[k] || 0, texte = n ? (n > 99 ? '99+' : String(n)) : '';
      if (texte) { if (b.dataset.n !== texte) b.dataset.n = texte; } else delete b.dataset.n;
      if (n) { const nom = $('.menu-l', a).textContent.trim(), phrase = `${nom}, ${dire(n)}`; if (a.getAttribute('aria-label') !== phrase) a.setAttribute('aria-label', phrase); }
      else a.removeAttribute('aria-label');
    }
  }
  function badges() {
    if (memo) peindre();                                           // (le menu a pu être redessiné depuis le dernier calcul)
    if ((!memo || sale || Date.now() - memo.le > DUREE_MEMO) && !prevu) { prevu = true; auRepos(calculer); }
  }
  // le mémo n'est plus bon (un changement reçu en direct, un report, une relecture de la base) : on le refait quand la rafale
  // s'est calmée. Le tableau de bord (garder, apresTraiter) et chargerTout l'appellent : le badge suit la tuile sans attendre les 30 s
  function perimer(delai = DELAI_REPORT) {
    if (!memo) return;                                             // (rien de calculé encore : le premier calcul se fera de lui-même)
    clearTimeout(minuteurChangement);
    minuteurChangement = setTimeout(() => { sale = true; badges(); }, delai);
  }
  const apresChangement = () => perimer(DELAI_CHANGEMENT);
  if (typeof APRES_VUE !== 'undefined') APRES_VUE.push(badges);
  if (typeof APRES_CHANGEMENT !== 'undefined') APRES_CHANGEMENT.push(apresChangement);

  // ===================================================================================================== les accès rapides
  const CLE_EPINGLES = 'menu.epingles', MAX_EPINGLES = 12, MAX_RECENTS = 5, ZONE_CREER = '.menu-creer-zone', CLE_RECENTES_ONGLETS = 'crescite-admin-recentes';
  const actionsDe = () => (typeof TABLEAU !== 'undefined' && TABLEAU.ACTIONS) || [];
  const action = k => actionsDe().find(a => a[0] === k);
  const estCreation = a => /^＋/.test(a[1]);
  const present = a => { try { return !a[3] || !!a[3](); } catch { return false; } };         // (la condition de l'action : E.ideale, E.equipeInstallee…)
  const nomAction = a => a[1].replace(/^＋\s*/, '').replace(/\s*↗$/, '');
  const iconeAction = (a, taille) => ICONES.svg(a[5] || 'plus', { taille });
  const calme = () => (typeof CALME_ADMIN === 'function' && CALME_ADMIN()) || (typeof GESTES !== 'undefined' && GESTES.reduit());
  let accesPret = false;                                                                     // (un premier dessin avec la base : rien ne saute à l'ouverture de la page)

  // ---- aller à une page, puis cliquer un de ses boutons une fois qu'elle est là (l'équivalent, pour le menu latéral, de
  // allerEtCliquer de mobile.js) ; déjà sur la page, il clique tout de suite : l'écouteur de hashchange resterait en attente
  function allerEtCliquer(adresse, selecteur, essais = 40) {
    const essayer = n => { const b = $(selecteur); if (b) { b.click(); return; } if (n > 0) requestAnimationFrame(() => essayer(n - 1)); };
    if (location.hash === adresse) { essayer(essais); return; }
    window.addEventListener('hashchange', () => setTimeout(() => { if (location.hash === adresse) essayer(essais); }, 20), { once: true });
    location.hash = adresse;
  }
  const nouvelleOpportunite = () => allerEtCliquer('#/diffusion', '#b-nouveau-prospect');

  // ---- les épinglés : la clé de préférence menu.epingles
  const defaut = () => (typeof TABLEAU !== 'undefined' && TABLEAU.MENU_EPINGLES_DEFAUT) || [];
  const epinglable = k => { const a = action(k); return !!a && !estCreation(a) && k !== 'recherche'; };
  function normaliser(v) {
    if (!Array.isArray(v)) return normaliser(defaut());
    const vus = new Set(), sortie = [];
    for (const k of v) if (typeof k === 'string' && !vus.has(k) && epinglable(k)) { vus.add(k); sortie.push(k); }
    return sortie.slice(0, MAX_EPINGLES);
  }
  const cles = () => normaliser(typeof PREFS !== 'undefined' ? PREFS.lire(CLE_EPINGLES, defaut()) : defaut());      // (la clé entière, conditions comprises)
  const epingles = () => cles().filter(k => present(action(k)));                                                       // (ce qu'on dessine)
  const estAuMenu = k => cles().includes(k);
  function ecrireEpingles(liste, dit, avant) {
    if (typeof PREFS === 'undefined') return;
    PREFS.ecrire(CLE_EPINGLES, liste, { aussitot: true, muet: true });                // (muet : l'annonce d'ici dit ce qui change)
    dessinerAcces();
    if (dit && typeof annoncer === 'function') annoncer(dit, { libelle: 'Annuler', action: () => { PREFS.ecrire(CLE_EPINGLES, avant, { aussitot: true, muet: true }); dessinerAcces(); } });
  }
  function mettreAuMenu(k) {
    const avant = cles();
    if (!epinglable(k) || avant.includes(k)) return false;
    if (avant.length >= MAX_EPINGLES) { annoncer(`Le menu garde ${MAX_EPINGLES} accès rapides au plus : retirez-en un d’abord.`, { erreur: true }); return false; }
    ecrireEpingles([...avant, k], `« ${nomAction(action(k))} » est dans le menu.`, avant);
    return true;
  }
  function retirerDuMenu(k) {
    const avant = cles();
    if (!avant.includes(k)) return false;
    ecrireEpingles(avant.filter(x => x !== k), `« ${nomAction(action(k))} » n’est plus dans le menu.`, avant);
    return true;
  }
  // monter ou descendre d'un cran parmi ceux qu'on voit (un épinglé dont la condition est fausse reste où il est dans la clé)
  function deplacer(k, sens) {
    const avant = cles(), vus = avant.filter(x => present(action(x))), i = vus.indexOf(k), voisin = vus[i + (sens < 0 ? -1 : 1)];
    if (i < 0 || voisin === undefined) return false;
    const apres = [...avant];
    apres[avant.indexOf(k)] = voisin; apres[avant.indexOf(voisin)] = k;
    ecrireEpingles(apres, `« ${nomAction(action(k))} » ${sens < 0 ? 'monte' : 'descend'} d’un cran.`, avant);
    return true;
  }

  // ---- le dessin : on garde les éléments qui restent (un diff par clé), on pose les neufs, on rend le focus à celui qui l'avait
  // (l'infobulle d'un épinglé dit sa séquence quand l'action est celle d'une rubrique ou d'une vue ; aria-keyshortcuts seulement pour un accord)
  function raccourciDe(a) {
    const h = a[2], m = typeof h === 'string' && h.match(/^#\/([a-z]+)$/);
    return m ? `rubrique.${m[1]}` : h === '#/representations/tableur' ? 'vue.tableur' : null;
  }
  function epingle(k) {
    const a = action(k), id = typeof RACCOURCIS !== 'undefined' ? raccourciDe(a) : null, seq = id ? RACCOURCIS.libelle(id) : '', ks = id ? RACCOURCIS.keyshortcuts(id) : '';
    const el = document.createElement('a');
    el.className = 'menu-epingle'; el.href = a[2]; el.dataset.action = k;
    if (a[4] || !String(a[2]).startsWith('#')) { el.target = '_blank'; el.rel = 'noopener'; }
    el.title = `${a[1].replace(/\s*↗$/, '')}${seq ? ` (${seq}${/^vue\./.test(id) ? ' dans Représentations' : ''})` : ''}`;
    if (ks) el.setAttribute('aria-keyshortcuts', ks);
    el.innerHTML = `${iconeAction(a, 20)}<span class="menu-l">${esc(nomAction(a))}</span>`;
    return el;
  }
  function recent(r) {
    const el = document.createElement('a');
    el.className = 'menu-recent'; el.href = r.href; el.dataset.href = r.href; el.title = `${r.genre} · ${r.nom}`;
    el.innerHTML = `<span class="menu-rg">${esc(r.genre)}</span> · <span class="menu-rn">${esc(r.nom)}</span>`;
    return el;
  }
  // voulus : [[clé, fabrique]] dans l'ordre ; rend les éléments neufs
  function accorder(zone, voulus, attr) {
    const actif = document.activeElement, cleActive = actif && zone.contains(actif) ? actif.dataset[attr] : null;
    const avant = new Map([...zone.children].map(el => [el.dataset[attr], el])), neufs = [];
    voulus.forEach(([cle, fabrique], i) => {
      let el = avant.get(cle);
      if (el) avant.delete(cle); else { el = fabrique(); neufs.push(el); }
      if (zone.children[i] !== el) zone.insertBefore(el, zone.children[i] || null);
    });
    avant.forEach(el => el.remove());
    if (cleActive != null) { const el = [...zone.children].find(x => x.dataset[attr] === cleActive); if (el && document.activeElement !== el) el.focus({ preventScroll: true }); }
    return neufs;
  }
  const animer = (el, classe) => { el.classList.add(classe); el.addEventListener('animationend', () => el.classList.remove(classe), { once: true }); };
  function poserAcces(m) {
    const zone = $('.menu-acces', m);
    zone.innerHTML = `<p class="menu-etiq">Accès rapides</p><div class="menu-creer-zone"><button type="button" class="menu-creer" aria-haspopup="menu" aria-expanded="false" title="Créer">${ICONES.svg('plus', { taille: 20, trait: 2.4 })}<span class="menu-l">Créer</span></button></div><div class="menu-defile"><div class="menu-epingles" role="group" aria-label="Épinglés"></div><div class="menu-recents" role="group" aria-labelledby="menu-recents-t" hidden><p class="menu-etiq" id="menu-recents-t">Récents</p><div class="menu-recents-liste"></div></div></div>`;
    brancherCreer($('.menu-creer', zone));
  }
  function dessinerAcces() {
    const m = menu(), zone = m && $('.menu-acces', m);
    if (!zone || typeof TABLEAU === 'undefined') return;
    const neufs = accorder($('.menu-epingles', zone), epingles().map(k => [k, () => epingle(k)]), 'action');
    if (accesPret && !calme()) neufs.forEach(el => animer(el, 'pop'));
    recents();
    if (typeof E !== 'undefined' && E.pret) accesPret = true;
  }

  // ---- les récents : la liste du script principal (lireRecentes), avec le genre et le nom d'aujourd'hui (descriptionRecente)
  function lireRecents() {
    if (typeof lireRecentes !== 'function' || typeof descriptionRecente !== 'function' || typeof E === 'undefined' || !E.pret) return [];
    const xs = [];
    for (const h of lireRecentes()) {
      let d = null; try { d = descriptionRecente(h); } catch { d = null; }
      if (d) xs.push({ href: h, ...d });
      if (xs.length >= MAX_RECENTS) break;
    }
    return xs;
  }
  function recents() {
    const m = menu(), zone = m && $('.menu-recents', m), xs = lireRecents();
    if (!zone) return xs;
    const liste = $('.menu-recents-liste', zone), neufs = accorder(liste, xs.map(r => [r.href, () => recent(r)]), 'href');
    // (une fiche renommée garde son lien, son texte suit)
    xs.forEach(r => { const el = $$('.menu-recent', liste).find(x => x.dataset.href === r.href), t = `${r.genre} · ${r.nom}`; if (el && el.title !== t) { el.title = t; $('.menu-rg', el).textContent = r.genre; $('.menu-rn', el).textContent = r.nom; } });
    zone.hidden = !xs.length;
    if (accesPret && !calme()) neufs.forEach(el => animer(el, 'ad-neuf'));
    return xs;
  }
  // un autre onglet a noté une fiche : la liste est partagée (localStorage)
  window.addEventListener('storage', e => { if (e.key === CLE_RECENTES_ONGLETS) recents(); });

  // ---- « ＋ Créer »
  let ignorer = false;
  function actionsCreer() {
    const xs = actionsDe().filter(a => estCreation(a) && present(a)).map(a => {
      const base = { libelle: nomAction(a), icone: iconeAction(a, 16) };
      return a[2] === 'prospect' ? { ...base, faire: nouvelleOpportunite } : { ...base, href: a[2] };
    });
    const b = $('.menu-creer');
    if (b) b.setAttribute('aria-expanded', String(xs.length > 0));      // (ce fournisseur n'est appelé que pour ouvrir le menu)
    return xs;
  }
  if (typeof GESTES !== 'undefined') GESTES.menu({ cible: ZONE_CREER, titre: 'Créer', actions: actionsCreer });
  function creer() {
    const b = $('.menu-creer'), zone = b && b.closest(ZONE_CREER);
    if (!b || !zone || typeof GESTES === 'undefined') return false;
    // (à droite du bouton, en haut aligné sur lui : le menu recouvre la page, jamais les rubriques ni le bouton ; gestes.js le rabat dans l'écran)
    const r = b.getBoundingClientRect();
    return GESTES.ouvrir(zone, { x: Math.round(r.right + 6), y: Math.round(r.top), source: 'clavier' });
  }
  function brancherCreer(b) {
    b.addEventListener('click', e => { e.preventDefault(); if (ignorer && e.detail > 0) { ignorer = false; return; } ignorer = false; creer(); });
  }
  // (le pointerdown de gestes.js ferme le menu avant que le clic n'arrive : on note, avant lui, que le menu de « Créer » était ouvert
  //  quand on a appuyé sur le bouton, et ce clic-là ne le rouvre pas ; le drapeau tombe au bout d'une seconde si le clic n'arrive
  //  pas, et un clic au clavier (detail 0) n'est jamais ignoré)
  window.addEventListener('pointerdown', e => {
    const b = e.target.closest && e.target.closest('.menu-creer');
    ignorer = !!b && b.getAttribute('aria-expanded') === 'true';
    if (ignorer) setTimeout(() => { ignorer = false; }, 1000);
  }, true);
  document.addEventListener('gestes:menu-ferme', e => {
    const zone = e.detail && e.detail.el;
    if (!zone || !zone.matches || !zone.matches(ZONE_CREER)) return;
    const b = $('.menu-creer', zone); if (b) b.setAttribute('aria-expanded', 'false');
  });
  if (typeof PREFS !== 'undefined') PREFS.surChangement(CLE_EPINGLES, dessinerAcces);
  if (typeof APRES_CHANGEMENT !== 'undefined') APRES_CHANGEMENT.push(dessinerAcces);

  // ===================================================================================================== l'apparence : le thème, la densité
  const THEMES = [['nuit', 'Nuit', 'lune'], ['jour', 'Jour', 'soleil'], ['appareil', 'Appareil', 'moniteur']];
  const DIT_THEME = { nuit: 'nuit', jour: 'jour', appareil: 'celui de l’appareil' };
  const TITRE_THEME = { nuit: 'Nuit', jour: 'Jour', appareil: 'Appareil (suit le réglage du système)' };
  const COULEUR_BARRE = { nuit: '#1b1117', jour: '#f6f2eb' };      // theme-color : le fond de la page (de nuit, ou du papier)
  const TITRE_DENSITE = 'Compact : resserre les lignes, les champs et le texte (à la souris seulement)';
  const mqSombre = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  if (typeof PREFS !== 'undefined') {
    PREFS.normaliser(CLE_THEME, v => (THEMES.some(t => t[0] === v) ? v : 'nuit'));
    PREFS.normaliser(CLE_DENSITE, v => (v === 'compacte' ? 'compacte' : 'confortable'));
  }
  const themeVoulu = () => (typeof PREFS !== 'undefined' ? PREFS.lire(CLE_THEME, 'nuit') : 'nuit');
  const densiteVoulue = () => (typeof PREFS !== 'undefined' ? PREFS.lire(CLE_DENSITE, 'confortable') : 'confortable');
  // « appareil » : le jour si le système n'est pas réglé en sombre ; sans matchMedia, la nuit
  // au téléphone (640 px et moins), toujours la nuit : il n'a pas le menu où se règle le thème, et il ne change pas
  const mqTel = typeof matchMedia === 'function' ? matchMedia('(max-width: 640px)') : null;
  const resoudre = voulu => (mqTel && mqTel.matches ? 'nuit' : voulu === 'jour' || (voulu === 'appareil' && mqSombre && !mqSombre.matches) ? 'jour' : 'nuit');
  const poserMeta = (nom, valeur) => { const m = document.querySelector(`meta[name="${nom}"]`); if (m && m.getAttribute('content') !== valeur) m.setAttribute('content', valeur); };
  // la tentacule de la page lit --accent une seule fois, à l'arrivée : changer de thème la refait monter à la couleur du nouveau
  function recolorerTentacule() {
    if (typeof tt !== 'function' || typeof E === 'undefined' || !E.pret || (typeof CALME_ADMIN === 'function' && CALME_ADMIN())) return;
    requestAnimationFrame(() => tt('page', getComputedStyle(html).getPropertyValue('--accent').trim() || '#5f565a'));
  }
  // pose le thème voulu sur la page (sans l'écrire dans le compte) : data-theme, les deux balises du <head>, le miroir, les
  // boutons. Aucune transition de couleur : html.bascule les coupe le temps d'un recalcul de style (un fondu sur toute la
  // page coûterait cher). recolorer : la tentacule remonte (un changement vu, pas la pose du premier dessin)
  function appliquerTheme(voulu, { recolorer = false } = {}) {
    const reel = resoudre(voulu);
    if (html.dataset.theme !== reel) {
      html.classList.add('bascule');
      html.dataset.theme = reel;
      void html.offsetHeight;                                      // (le recalcul se fait ici, transitions coupées)
      html.classList.remove('bascule');
      if (recolorer) recolorerTentacule();
    }
    poserMeta('color-scheme', reel === 'jour' ? 'light' : 'dark');
    poserMeta('theme-color', COULEUR_BARRE[reel]);
    ecrireMiroir(CLE_THEME, voulu, 'nuit');
    majReglages();
  }
  function appliquerDensite(voulue) {
    if (voulue === 'compacte') { if (html.getAttribute('data-densite') !== 'compacte') html.setAttribute('data-densite', 'compacte'); } else if (html.hasAttribute('data-densite')) html.removeAttribute('data-densite');   // (rien n'est touché si c'est déjà posé : le <head> l'a fait avant le dessin)
    ecrireMiroir(CLE_DENSITE, voulue === 'compacte' ? 'compacte' : 'confortable', 'confortable');
    majReglages();
  }
  // « appareil » suit le système tant qu'il est choisi
  if (mqSombre) mqSombre.addEventListener('change', () => { if (themeVoulu() === 'appareil') appliquerTheme('appareil', { recolorer: true }); });
  if (mqTel) mqTel.addEventListener('change', () => appliquerTheme(themeVoulu(), { recolorer: true }));     // (une fenêtre qui passe le seuil du téléphone)
  if (typeof PREFS !== 'undefined') {
    PREFS.surChangement(CLE_THEME, () => appliquerTheme(themeVoulu(), { recolorer: true }));
    PREFS.surChangement(CLE_DENSITE, () => appliquerDensite(densiteVoulue()));
  }
  // un choix de l'utilisateur (le clic, les flèches, la recherche) : posé, dit, gardé
  function choisirTheme(voulu) {
    if (!THEMES.some(t => t[0] === voulu) || themeVoulu() === voulu) return;
    if (typeof annoncer === 'function') annoncer(`Thème : ${DIT_THEME[voulu]}.`);
    if (typeof PREFS !== 'undefined') PREFS.ecrire(CLE_THEME, voulu, { aussitot: true });   // (avant de poser : les boutons lisent la préférence)
    appliquerTheme(voulu, { recolorer: true });
    sauter($(`.reg-theme [data-theme-choix="${voulu}"] svg`));
  }
  function choisirDensite(voulue = densiteVoulue() === 'compacte' ? 'confortable' : 'compacte') {
    if (voulue !== 'compacte' && voulue !== 'confortable') return;
    if (densiteVoulue() === voulue) return;
    const sansEffet = voulue === 'compacte' && typeof matchMedia === 'function' && !matchMedia('(pointer: fine)').matches;
    if (typeof annoncer === 'function') annoncer(`Densité : ${voulue}${sansEffet ? ' (à la souris seulement)' : ''}.`);
    if (typeof PREFS !== 'undefined') PREFS.ecrire(CLE_DENSITE, voulue, { aussitot: true });
    appliquerDensite(voulue);
    sauter($('.reg-densite svg'));
  }
  // l'icône choisie saute (le ressort, 450 ms : .pop) ; rien sous « moins d'animations » ni ?anim=0, la feuille s'en charge
  function sauter(svg) {
    if (!svg) return;
    svg.classList.remove('pop'); void svg.getBoundingClientRect();
    svg.classList.add('pop');
    svg.addEventListener('animationend', () => svg.classList.remove('pop'), { once: true });
  }
  const apparence = () => { const theme = themeVoulu(); return { theme, resolu: resoudre(theme), densite: densiteVoulue() }; };

  // ===================================================================================================== les réglages du menu
  // Le bloc d'apparence est le sien dans le conteneur : un autre réglage s'y pose à côté, et celui-ci ne se redessine jamais.
  function reglages() {
    const m = menu(), zone = m && $('.menu-reglages', m);
    if (!zone) return;
    if (!$('.reg-apparence', zone)) {
      zone.insertAdjacentHTML('beforeend', `<div class="reg-apparence"><div class="reg-theme" role="radiogroup" aria-label="Thème">${THEMES.map(([k, nom, ico]) =>
        `<button type="button" role="radio" aria-checked="false" tabindex="-1" data-theme-choix="${k}" title="${esc(TITRE_THEME[k])}">${ICONES.svg(ico, { taille: 18 })}<span class="sr">${esc(nom)}</span></button>`).join('')}</div>`
        + `<button type="button" class="reg-densite" aria-pressed="false" title="${esc(TITRE_DENSITE)}">${ICONES.svg('densite', { taille: 18 })}<span class="sr">Compact</span></button></div>`);
      const groupe = $('.reg-theme', zone), boutons = $$('[role=radio]', groupe);
      groupe.addEventListener('click', e => { const b = e.target.closest('[role=radio]'); if (b) choisirTheme(b.dataset.themeChoix); });
      // les flèches passent d'un thème à l'autre et le choisissent (un radiogroup : le focus et le choix vont ensemble)
      groupe.addEventListener('keydown', e => {
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        const i = boutons.indexOf(e.target.closest('[role=radio]'));
        if (i < 0) return;
        const j = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % boutons.length : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i + boutons.length - 1) % boutons.length : e.key === 'Home' ? 0 : e.key === 'End' ? boutons.length - 1 : -1;
        if (j < 0) return;
        e.preventDefault(); e.stopPropagation();
        boutons[j].focus();
        choisirTheme(boutons[j].dataset.themeChoix);
      });
      $('.reg-densite', zone).addEventListener('click', () => choisirDensite());
    }
    majReglages();
  }
  // (seulement les attributs : ce qui est lu, le focus et l'icône qui saute ne sont pas touchés)
  function majReglages() {
    const m = menu(), zone = m && $('.reg-apparence', m);
    if (!zone) return;
    const voulu = themeVoulu();
    $$('[role=radio]', zone).forEach(b => { const oui = b.dataset.themeChoix === voulu; b.setAttribute('aria-checked', String(oui)); b.tabIndex = oui ? 0 : -1; });
    $('.reg-densite', zone).setAttribute('aria-pressed', String(densiteVoulue() === 'compacte'));
  }

  // ===================================================================================================== replier, déplier
  // la zone polie est posée vide avec le menu (poser) : les lecteurs d'écran n'annoncent pas toujours une zone insérée avec son
  // texte, il faut qu'elle soit là avant que le texte y change
  function preparerAnnonce() {
    if (document.getElementById('sr-menu')) return;
    const r = document.createElement('p');
    r.id = 'sr-menu'; r.className = 'sr'; r.setAttribute('role', 'status');
    document.body.append(r);
  }
  function direSr(texte) {
    preparerAnnonce();
    document.getElementById('sr-menu').textContent = texte;
  }
  // html.menu-deplie n'existe que sous 1 340 px (là, déplié est l'exception : le défaut de la feuille est replié) ; au-dessus, déplié
  // est le défaut et ne porte aucune classe
  const poserClasses = r => { html.classList.toggle('menu-replie', r); html.classList.toggle('menu-deplie', !r && petit()); };
  function basculer(voulu) {
    const r = typeof voulu === 'boolean' ? voulu : !replie();
    poserClasses(r);
    if (petit()) noterSession(!r);                  // sous 1 340 px : le dépli ne vaut que pour cet onglet, la clé du compte n'est pas touchée
    else {
      noterSession(false);
      ecrireMiroirMenu(r);
      if (typeof PREFS !== 'undefined') PREFS.ecrire(CLE, r, { aussitot: true });
    }
    majBouton();
    direSr(r ? 'Menu replié.' : 'Menu déplié.');
  }
  // la préférence du compte, quand elle arrive (au chargement, d'un autre onglet, d'un autre appareil) : sans l'écrire de nouveau
  function appliquer(valeur) {
    if (valeur === true) { if (!(petit() && depliSession())) poserClasses(true); }
    else { html.classList.remove('menu-replie'); if (!petit()) html.classList.remove('menu-deplie'); }
    ecrireMiroirMenu(valeur);
    majBouton();
  }
  if (typeof PREFS !== 'undefined') PREFS.surChangement(CLE, appliquer);
  // « Disposition d'origine » (fenetres.js) : le choix du compte s'oublie, la feuille décide de nouveau selon la largeur ; rend le choix
  // d'avant (rien s'il n'y en avait pas), que rendreRepli remet pour « Annuler »
  function oublierRepli() {
    const v = typeof PREFS !== 'undefined' ? PREFS.lire(CLE, null) : null;
    if (typeof v !== 'boolean') return undefined;
    PREFS.ecrire(CLE, null, { aussitot: true });
    appliquer(null);
    return v;
  }
  function rendreRepli(v) {
    if (typeof v !== 'boolean' || typeof PREFS === 'undefined') return;
    PREFS.ecrire(CLE, v, { aussitot: true });
    appliquer(v);
  }
  if (typeof PREFS !== 'undefined') PREFS.surChangement('representations.vue', suivreVueRetenue);
  // la fenêtre qui passe la limite des 1 340 px : au-dessus, le choix du compte reprend la main ; en dessous, le dépli de l'onglet
  if (typeof matchMedia === 'function') matchMedia(PETIT).addEventListener('change', () => {
    if (!petit()) { if (typeof PREFS !== 'undefined') appliquer(PREFS.lire(CLE)); } else if (depliSession()) poserClasses(false); else html.classList.remove('menu-deplie');
    majBouton();
  });

  return { poser, marquer, basculer, replie, badges, perimer, creer, epingles, estAuMenu, epinglable, mettreAuMenu, retirerDuMenu, deplacer, recents, nouvelleOpportunite, allerEtCliquer, reglages, theme: choisirTheme, densite: choisirDensite, apparence, oublierRepli, rendreRepli };
})();
