/* Le jour et la nuit, communs aux maquettes (règle 19 du contrat) : le choix du visiteur, gardé d'une visite à l'autre,
   posé sur <html> avant le premier dessin, et la bascule qui se voit. build.py l'ajoute dans <head>, avant toute feuille
   de style (les autres outils viennent après les données D) : il ne lit rien de D et ne dessine rien de lui-même, hormis
   son icône ; chaque maquette fait ses DEUX palettes (html[data-theme="nuit"] …, color-scheme compris) et la place du
   bouton dans son menu.

   Au départ : le réglage de l'appareil (prefers-color-scheme), suivi tant que le visiteur n'a rien choisi ; ensuite son
   choix, gardé dans localStorage (clé « crescite-theme », dans un try : sans stockage, le choix vaut pour la page).
   ?theme=jour ou ?theme=nuit dans l'adresse impose un thème sans le garder (captures, essais).

   THEME.actuel()                     'jour' ou 'nuit' (c'est aussi document.documentElement.dataset.theme)
   THEME.choisir(t, { depuis })       pose t ('jour' | 'nuit'), le garde, et joue la bascule : une transition de vue (View
                                      Transitions) où le nouveau thème s'ouvre en cercle depuis l'élément depuis (le bouton),
                                      420 ms, interruptible (un geste la termine, un clic donné pendant est relancé) ;
                                      instantanée si le visiteur a demandé moins d'animations (ou ?anim=0), si l'onglet est
                                      caché ou sans View Transitions. Rend une promesse, résolue quand le thème est posé.
   THEME.basculer({ depuis })         l'autre thème
   THEME.bouton({ libelle, classe })  le HTML du bouton à placer dans le menu :
                                        <button type="button" class="theme-bouton classe" data-theme-bouton
                                                aria-pressed="true|false" aria-label="libelle" title="libelle">icône</button>
                                      libelle : un texte de D (D.site.libelles.modeNuit, « Mode nuit ») ; aria-pressed dit si
                                      la nuit est mise : le lecteur d'écran annonce « Mode nuit, bouton bascule, activé ».
                                      Les clics sur [data-theme-bouton] sont écoutés d'office (délégation, même pour un bouton
                                      ajouté plus tard) ; chaque changement met à jour aria-pressed de tous les boutons.
   THEME.icone()                      le SVG seul : un soleil le jour, une lune la nuit ; il passe de l'un à l'autre (les
                                      rayons rentrent en tournant, une ombre vient creuser le croissant). En currentColor ;
                                      ses parties : .theme-icone, .theme-rayons, .theme-astre, .theme-ombre.
   THEME.surChangement(fn)            fn(t) après chaque changement (une carte en canvas à repeindre, une couleur calculée…) ;
                                      l'évènement « theme:change » ({ detail: { theme } }) est aussi émis sur window.

   Pendant la bascule, <html> porte la classe theme-bascule : la page entière est capturée (même si la maquette a écrit
   html { view-transition-name: none } pour ses transitions de page), l'ancienne image reste dessous, la nouvelle s'ouvre
   par-dessus. Les éléments que la maquette nomme (view-transition-name) en permanence seraient capturés à part et
   passeraient en fondu : qu'elle ne les nomme que pendant ses transitions de page (comme MOUVEMENT.transition).
   L'habillage : des styles de base sans poids (:where()), injectés en tête de <head>, que la moindre règle de la maquette
   remplace : la taille de l'icône (1.3em), son trait, la durée de son passage (--theme-duree : .5s), le petit tour des
   rayons au survol. Aucune autre règle : une maquette qui n'a pas encore ses deux palettes ne change pas d'aspect. */
const THEME = (() => {
  'use strict';
  const CLE = 'crescite-theme';
  const html = document.documentElement;
  const valide = t => t === 'jour' || t === 'nuit';
  const lireStocke = () => { try { const v = localStorage.getItem(CLE); return valide(v) ? v : null; } catch (e) { return null; } };
  const garder = t => { try { localStorage.setItem(CLE, t); } catch (e) { /* stockage indisponible : le choix vaut pour la page */ } };
  const param = (() => { try { const v = new URLSearchParams(location.search).get('theme'); return valide(v) ? v : null; } catch (e) { return null; } })();
  const COUPE = (() => { try { return new URLSearchParams(location.search).get('anim') === '0'; } catch (e) { return false; } })();
  const mq = q => (window.matchMedia ? matchMedia(q) : null);
  const sombre = mq('(prefers-color-scheme: dark)'), reduit = mq('(prefers-reduced-motion: reduce)');
  const appareil = () => (sombre && sombre.matches ? 'nuit' : 'jour');
  const permis = () => !COUPE && !(reduit && reduit.matches);
  const abonnes = [];
  let actuel = param || lireStocke() || appareil();
  html.dataset.theme = actuel;                              // avant le premier dessin : pas d'éclair

  /* ---------------------------------------------------------------------------------------------- l'icône et ses styles */
  const STYLE = `
:where(.theme-icone) { display: block; width: 1.3em; height: 1.3em; overflow: visible; fill: none; stroke: currentColor; stroke-width: 1.8;
  stroke-linecap: round; --theme-courbe: cubic-bezier(.3, .7, .2, 1.15); }
:where(.theme-icone .theme-astre) { fill: currentColor; stroke: none; transform-box: view-box; transform-origin: 12px 12px; transform: scale(.56);
  transition: transform var(--theme-duree, .5s) var(--theme-courbe); }
:where(.theme-icone .theme-rayons) { transform-box: view-box; transform-origin: 12px 12px;
  transition: transform var(--theme-duree, .5s) var(--theme-courbe), opacity calc(var(--theme-duree, .5s) * .6) ease; }
:where(.theme-icone .theme-ombre) { transform-box: view-box; transform-origin: 12px 12px; transform: translate(16px, -16px);
  transition: transform var(--theme-duree, .5s) var(--theme-courbe); }
:where(html[data-theme="nuit"] .theme-icone .theme-astre) { transform: scale(.82); }
:where(html[data-theme="nuit"] .theme-icone .theme-rayons) { transform: rotate(-70deg) scale(.45); opacity: 0; }
:where(html[data-theme="nuit"] .theme-icone .theme-ombre) { transform: translate(3.8px, -2.9px); }
:where(.theme-bouton:hover .theme-icone .theme-rayons) { transform: rotate(22deg); }
:where(html[data-theme="nuit"] .theme-bouton:hover .theme-icone .theme-astre) { transform: scale(.82) rotate(-14deg); }
html.theme-bascule { view-transition-name: root !important; }
html.theme-bascule::view-transition-group(root), html.theme-bascule::view-transition-old(root), html.theme-bascule::view-transition-new(root) {
  animation: none !important; mix-blend-mode: normal; }
@media (prefers-reduced-motion: reduce) { :where(.theme-icone *) { transition: none !important; } }`;
  function styles() {
    if (document.getElementById('theme-style') || !document.head) return;
    const s = document.createElement('style');
    s.id = 'theme-style';
    s.textContent = STYLE;
    document.head.insertBefore(s, document.head.firstChild);   // en tête : la maquette passe après
  }
  styles();
  if (!document.getElementById('theme-style')) document.addEventListener('DOMContentLoaded', styles, { once: true });

  let n = 0;
  function icone() {
    const id = `theme-masque-${++n}`;
    return `<svg class="theme-icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32"><rect x="-4" y="-4" width="32" height="32" fill="#fff"/><circle class="theme-ombre" cx="12" cy="12" r="8.4" fill="#000"/></mask></defs>`
      + '<path class="theme-rayons" d="M12 1.6v2.5M12 19.9v2.5M1.6 12h2.5M19.9 12h2.5M4.65 4.65l1.77 1.77M17.58 17.58l1.77 1.77M4.65 19.35l1.77-1.77M17.58 6.42l1.77-1.77"/>'
      + `<circle class="theme-astre" cx="12" cy="12" r="9.6" mask="url(#${id})"/></svg>`;
  }
  const escAttr = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const bouton = ({ libelle = '', classe = '' } = {}) =>
    `<button type="button" class="theme-bouton${classe ? ' ' + escAttr(classe) : ''}" data-theme-bouton aria-pressed="${actuel === 'nuit'}"${libelle ? ` aria-label="${escAttr(libelle)}" title="${escAttr(libelle)}"` : ''}>${icone()}</button>`;
  const marquer = () => document.querySelectorAll('[data-theme-bouton]').forEach(b => b.setAttribute('aria-pressed', String(actuel === 'nuit')));

  /* ---------------------------------------------------------------------------------------------- poser, prévenir */
  function poser(t) {
    actuel = t;
    html.dataset.theme = t;
    marquer();
    abonnes.forEach(fn => { try { fn(t); } catch (e) { console.error(e); } });
    try { window.dispatchEvent(new CustomEvent('theme:change', { detail: { theme: t } })); } catch (e) { /* très vieux navigateur */ }
  }

  /* ---------------------------------------------------------------------------------------------- la bascule */
  // un geste pendant la bascule la termine ; un clic adressé à <html> pendant la transition (le navigateur le fait tant
  // que ses pseudo-éléments couvrent la page) est relancé sur l'élément qui est sous le doigt
  let enCours = null, relance = null;
  const ACTION = 'a[href], button, summary, label, input, select, textarea, [role="button"], [role="link"], [role="tab"], [tabindex]';
  function surGeste(e) {
    if (!enCours) return;
    if (e.type === 'pointerdown' && e.target === html) relance = { x: e.clientX, y: e.clientY, t: performance.now() };
    try { enCours.skipTransition(); } catch (err) { /* déjà finie */ }
  }
  window.addEventListener('click', e => {
    const r = relance;
    if (!r || e.target !== html || performance.now() - r.t > 1500) return;
    relance = null;
    const el = document.elementFromPoint(r.x, r.y), c = el && el.closest(ACTION);
    if (!c || c === html) return;
    if (c.matches('input, select, textarea')) c.focus(); else c.click();
  }, { capture: true, passive: true });
  const GESTES = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
  const ecouter = oui => GESTES.forEach(t => window[oui ? 'addEventListener' : 'removeEventListener'](t, surGeste, { capture: true, passive: true }));

  function choisir(t, { depuis = null, garde = true } = {}) {
    if (!valide(t)) return Promise.resolve();
    if (garde) garder(t);
    if (t === actuel) { marquer(); return Promise.resolve(); }
    if (enCours) { try { enCours.skipTransition(); } catch (e) { /* finie */ } }
    if (!permis() || document.hidden || typeof document.startViewTransition !== 'function') { poser(t); return Promise.resolve(); }
    // le cercle part du centre du bouton (ou du coin haut droit, où sont les menus) et couvre l'écran
    const r = depuis && depuis.getBoundingClientRect ? depuis.getBoundingClientRect() : null;
    const x = r && r.width ? r.left + r.width / 2 : innerWidth - 40, y = r && r.height ? r.top + r.height / 2 : 32;
    const R = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 2;
    html.classList.add('theme-bascule');
    let vt;
    try { vt = document.startViewTransition(() => poser(t)); } catch (e) { html.classList.remove('theme-bascule'); poser(t); return Promise.resolve(); }
    enCours = vt;
    ecouter(true);
    vt.ready.then(() => {
      html.animate({ clipPath: [`circle(0px at ${x.toFixed(1)}px ${y.toFixed(1)}px)`, `circle(${R}px at ${x.toFixed(1)}px ${y.toFixed(1)}px)`] },
        { duration: 420, easing: 'cubic-bezier(.32, .72, .2, 1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(() => {});
    const fin = () => { if (enCours === vt) { enCours = null; ecouter(false); html.classList.remove('theme-bascule'); } };
    vt.finished.then(fin, fin);
    return vt.updateCallbackDone.catch(() => {});
  }
  const basculer = (o = {}) => choisir(actuel === 'nuit' ? 'jour' : 'nuit', o);

  // les boutons, où qu'ils soient (délégation : un bouton ajouté plus tard est servi aussi)
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-theme-bouton]') : null;
    if (b) basculer({ depuis: b });
  });
  // tant que le visiteur n'a rien choisi, le thème suit l'appareil
  if (sombre && sombre.addEventListener) sombre.addEventListener('change', () => { if (!param && !lireStocke()) choisir(appareil(), { garde: false }); });

  return {
    actuel: () => actuel, choisir, basculer, bouton, icone,
    surChangement: fn => { if (typeof fn === 'function') abonnes.push(fn); },
  };
})();
