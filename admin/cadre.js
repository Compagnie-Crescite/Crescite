'use strict';
/* Le cadre de l'administration : le menu latéral des douze rubriques, qui se replie. La coque elle-même (l'en-tête, le menu
   et le contenu côte à côte) est construite une fois par poserCoque(), dans le script principal d'index.html, qui appelle ce
   module à deux moments : CADRE.poser(rubrique) quand la coque vient d'être construite, CADRE.marquer(rubrique) à chaque vue. Chargé
   après tournee.js et avant mobile.js ; il lit les rubriques du script principal (rubriquesVisibles), les icônes
   (admin/icones.js) et les préférences du compte (admin/prefs.js) ; sans l'un d'eux, il fait ce qu'il peut (typeof).
   - CADRE.poser(rubrique) dessine dans #menu (l'aside, gardé d'une route à l'autre) la <nav aria-label="Rubriques"> : pour chaque
     rubrique un lien <a href="#/k" title="Représentations (G puis D)"> avec son icône, son nom en petites capitales (.menu-l)
     et la place d'un badge (.menu-badge, dont le chiffre est dans data-n) ; puis le bouton « Replier » (.menu-replier : aria-expanded, aria-controls,
     aria-keyshortcuts="Alt+M") et, sous lui, un <div class="menu-reglages"> vide, que les réglages d'interface rempliront (marquer n'y
     touche pas). ↑ ↓ passent d'une rubrique à l'autre (GESTES.fleches).
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
   L'annonce « Menu replié » / « Menu déplié » est dite aux lecteurs d'écran par une zone polie (#sr-menu), posée vide avec le menu. Au téléphone
   (moins de 641 px) le menu est masqué par la feuille d'index.html.
   Les badges (CADRE.badges) disent ce qui attend, en corail, sur trois rubriques : le Tableau de bord (les lignes « à traiter » de
   la tuile, hors reportées), la Diffusion (les demandes de devis nouvelles) et l'Équipe (les notes de frais en attente). Le
   compte (TABLEAU.urgences) n'est pas gratuit : il se fait au repos de la page (requestIdleCallback), se garde 30 secondes,
   et se refait un instant après un changement reçu en direct, un report ou une relecture de la base. Replié, le badge devient un point sur l'icône ; le lien dit son
   compte aux lecteurs d'écran (aria-label « Diffusion CRM, 3 devis à traiter »). Les raccourcis (Alt+M, G puis une lettre)
   sont déclarés dans le registre RACCOURCIS du script principal ; le menu en écrit la touche dans l'infobulle de chaque lien.
   CADRE.poser(rubrique)   CADRE.marquer(rubrique)   CADRE.basculer(replie)   CADRE.replie()   CADRE.badges()   CADRE.perimer() */
const CADRE = (() => {
  const html = document.documentElement;
  const CLE = 'menu.replie', MIROIR = 'crescite-admin-apparence', SESSION = 'crescite-admin-menu', PETIT = '(max-width: 1339px)';
  // l'icône de chaque rubrique (les noms de la bibliothèque, admin/icones.js ; la rubrique Représentations est « dates »)
  const ICONE = { accueil: 'tableau-de-bord', representations: 'dates', planning: 'planning', feuilles: 'feuilles', spectacles: 'spectacles', equipe: 'equipe', diffusion: 'diffusion', pro: 'mallette', ateliers: 'ateliers', lieux: 'lieux', textes: 'texte', journal: 'journal' };
  const petit = () => typeof matchMedia === 'function' && matchMedia(PETIT).matches;
  const menu = () => document.getElementById('menu');
  // ce qu'on voit : replié si le dépli n'est pas voulu et que le repli l'est (html.menu-replie) ou que l'écran est étroit
  const replie = () => !html.classList.contains('menu-deplie') && (html.classList.contains('menu-replie') || petit());
  const depliSession = () => { try { return sessionStorage.getItem(SESSION) === 'deplie'; } catch { return false; } };
  const noterSession = oui => { try { if (oui) sessionStorage.setItem(SESSION, 'deplie'); else sessionStorage.removeItem(SESSION); } catch { /* onglet sans stockage : le dépli ne vaut que pour cette page */ } };

  // ===================================================================================================== le miroir de l'apparence
  // (une valeur par clé de préférence ; le thème et la densité y viendront)
  function ecrireMiroir(valeur) {
    const uid = typeof E !== 'undefined' && E.session?.user?.id;
    if (!uid) return;
    try {
      const nom = `${MIROIR}:${uid}`;
      let a = null; try { a = JSON.parse(localStorage.getItem(nom) || 'null'); } catch { /* illisible : on repart de rien */ }
      a = a && typeof a === 'object' && !Array.isArray(a) ? a : {};
      if (valeur !== true && !(CLE in a)) return;          // (rien à retirer : le miroir n'est pas créé pour rien)
      if (valeur === true) a[CLE] = true; else delete a[CLE];
      localStorage.setItem(nom, JSON.stringify(a));
    } catch { /* stockage fermé : le menu naîtra selon la largeur */ }
  }

  // ===================================================================================================== le menu
  const cleRubriques = () => (typeof rubriquesVisibles === 'function' ? rubriquesVisibles() : []).map(r => r[0]).join(',');
  // (la rubrique courante est marquée dès le dessin : posée après coup, sa couleur passerait par la transition des liens)
  // (l'infobulle dit le nom, que le menu replié cache, et la séquence qui y mène : « Représentations (G puis D) » ; elle n'est pas
  // dans aria-keyshortcuts, qui ne sait pas dire une suite de touches)
  const titreLien = (k, nom) => { const s = typeof RACCOURCIS !== 'undefined' ? RACCOURCIS.libelle(`rubrique.${k}`) : ''; return s ? `${nom} (${s})` : nom; };
  const lien = courante => ([k, nom]) => `<a href="#/${k}"${k === courante ? ' aria-current="page"' : ''} title="${esc(titreLien(k, nom))}">${ICONES.svg(ICONE[k] || 'points', { taille: 20 })}<span class="menu-l">${esc(nom)}</span><span class="menu-badge" aria-hidden="true"></span></a>`;
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
    m.innerHTML = '<nav class="nav" aria-label="Rubriques"></nav><button type="button" class="menu-replier" aria-expanded="true" aria-controls="menu"></button><div class="menu-reglages"></div>';
    dessinerNav(m, courante);
    const bouton = $('.menu-replier', m);
    const ks = typeof RACCOURCIS !== 'undefined' ? RACCOURCIS.keyshortcuts('menu.replier') : '';
    if (ks) bouton.setAttribute('aria-keyshortcuts', ks);
    bouton.addEventListener('click', () => basculer());
    if (typeof GESTES !== 'undefined') GESTES.fleches(m, '.nav a', { horizontal: false });
    if (typeof PREFS !== 'undefined') appliquer(PREFS.lire(CLE));
    majBouton();
  }
  function marquer(rubrique) {
    const m = menu();
    if (!m || !m.dataset.pose) return;
    if (m.dataset.rubriques !== cleRubriques()) dessinerNav(m, rubrique);
    $$('.nav a', m).forEach(a => { if (a.getAttribute('href') === `#/${rubrique}`) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    badges();
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
      const a = $(`.nav a[href="#/${k}"]`, m), b = a && $('.menu-badge', a);
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
      ecrireMiroir(r);
      if (typeof PREFS !== 'undefined') PREFS.ecrire(CLE, r, { aussitot: true });
    }
    majBouton();
    direSr(r ? 'Menu replié.' : 'Menu déplié.');
  }
  // la préférence du compte, quand elle arrive (au chargement, d'un autre onglet, d'un autre appareil) : sans l'écrire de nouveau
  function appliquer(valeur) {
    if (valeur === true) { if (!(petit() && depliSession())) poserClasses(true); }
    else { html.classList.remove('menu-replie'); if (!petit()) html.classList.remove('menu-deplie'); }
    ecrireMiroir(valeur);
    majBouton();
  }
  if (typeof PREFS !== 'undefined') PREFS.surChangement(CLE, appliquer);
  // la fenêtre qui passe la limite des 1 340 px : au-dessus, le choix du compte reprend la main ; en dessous, le dépli de l'onglet
  if (typeof matchMedia === 'function') matchMedia(PETIT).addEventListener('change', () => {
    if (!petit()) { if (typeof PREFS !== 'undefined') appliquer(PREFS.lire(CLE)); } else if (depliSession()) poserClasses(false); else html.classList.remove('menu-deplie');
    majBouton();
  });

  return { poser, marquer, basculer, replie, badges, perimer };
})();
