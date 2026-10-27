/* Le mouvement, commun aux maquettes (règle 15 B du contrat) : la boîte à outils dont chaque maquette tire SA signature.
   Rien ne retarde une navigation ni un rendu : les écouteurs sont passifs, seuls transform et opacity bougent (et clip-path
   pour un masque), une transition en cours se termine proprement au geste suivant. prefers-reduced-motion ou ?anim=0 :
   rien ne bouge, tout est là tout de suite. build.py l'ajoute après frise.js et le copie à côté de l'administration.

   MOUVEMENT.permis()
     false si le visiteur a demandé moins d'animations, ou avec ?anim=0 dans l'adresse.

   MOUVEMENT.transition(rendre, { type, depuis }) → promesse (résolue quand rendre() a été appelée)
     Enveloppe un changement de page : document.startViewTransition si le navigateur l'a et que le mouvement est permis ;
     sinon un fondu court (180 ms) de <main>. rendre() s'exécute toujours, et tout de suite si le mouvement est coupé ;
     avec View Transitions, elle s'exécute dans le rappel de la transition (une image plus tard) : mettez-y tout le
     changement (le contenu, document.title, le focus, le défilement).
     type    posé en data-mv-transition sur <html> le temps de la transition : la maquette écrit ses
             html[data-mv-transition="spectacle"]::view-transition-old(root) { … } (styles de base : un fondu de 240 ms).
     depuis  un élément qui porte data-mv-nom="…" (la carte cliquée) : il reçoit view-transition-name: mv-partage, et
             après rendre(), l'élément de la nouvelle page qui porte le même data-mv-nom le reçoit à son tour : la carte
             devient l'en-tête (::view-transition-group(mv-partage) pour l'habiller).
     Interruptible : un nouveau geste (pointeur, clavier, molette) termine la transition aussitôt ; un clic donné pendant
     la transition (le navigateur l'adresse alors à <html>) est relancé sur l'élément qui est sous le doigt.

   MOUVEMENT.reveler(racine, { immediat })
     Les éléments [data-mv] de racine apparaissent quand ils entrent dans l'écran, une seule fois :
       data-mv="monte"    il monte de 14 px en paraissant        data-mv="fondu"   il paraît
       data-mv="trace"    il se trace de gauche à droite (un filet : transform scaleX ; un SVG : ses tracés pathLength="1")
       data-mv="masque"   il se découvre de haut en bas (clip-path)
       data-mv="cascade"  ses enfants l'un après l'autre (45 ms, douze au plus ; --mv-i est posé sur chacun)
       data-mv="compte"   le nombre qu'il affiche compte jusqu'à sa valeur (MOUVEMENT.compter)
       data-mv-delai="120" un retard en ms.
     { immediat: true } : tout est montré sans mouvement (une vue refaite en place quand D change).
     Classes : .mv-attente (en attente, l'état de départ), .mv-vu (montré) ; variables --mv-courbe, --mv-i, --mv-delai.

   MOUVEMENT.cascade(el, { selecteur, pas, max, duree, decalage })
     Les enfants de el (ou ceux du sélecteur) paraissent l'un après l'autre, tout de suite : un contenu qui se déplie
     (une saison qu'on ouvre, un menu). pas 22 ms, max 14 (les suivants sont là d'emblée), duree 260 ms, decalage -6 px.

   MOUVEMENT.flip(conteneur, changer, { cle, duree })
     Les positions avant, changer() (le nouveau rendu), les positions après : les éléments glissent à leur nouvelle place,
     ceux qui arrivent paraissent, ceux qui partent s'effacent sur place. cle : '[data-mv-cle]' (par défaut) ou un autre
     attribut ('[data-date-id]') : la valeur de l'attribut est la clé. Seuls les éléments proches de l'écran bougent ; un
     nouveau flip sur le même conteneur reprend depuis les positions à l'écran. duree 280 ms.

   MOUVEMENT.compter(el, { duree })
     Le premier nombre du texte de el compte de 0 à sa valeur (900 ms) ; le texte final est celui de D, rendu tel quel
     à la fin, et les lecteurs d'écran ne lisent que lui (le nombre qui compte est aria-hidden).

   MOUVEMENT.presse(racine)
     La classe .mv-presse sur le lien ou le bouton pressé, dès le pointerdown (dans la même image), retirée au pointerup,
     au pointercancel ou en quittant ; Entrée et Espace aussi. La maquette écrit le style de la pression. */
const MOUVEMENT = (() => {
  'use strict';
  const COUPE = (() => { try { return new URLSearchParams(location.search).get('anim') === '0'; } catch (e) { return false; } })();
  const reduit = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const permis = () => !COUPE && !(reduit && reduit.matches);
  const COURBE = 'cubic-bezier(.2, .7, .2, 1)';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const STYLE = `
:root { --mv-courbe: ${COURBE}; }
:where(.mv-lecteur) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
:where([data-mv].mv-attente) { transition: opacity .5s var(--mv-courbe), transform .6s var(--mv-courbe), clip-path .7s var(--mv-courbe);
  transition-delay: var(--mv-delai, 0ms); }
:where([data-mv="fondu"].mv-attente:not(.mv-vu)) { opacity: 0; }
:where([data-mv="monte"].mv-attente:not(.mv-vu)) { opacity: 0; transform: translateY(14px); }
:where([data-mv="masque"].mv-attente:not(.mv-vu)) { clip-path: inset(0 0 100% 0); }
:where([data-mv="trace"].mv-attente:not(svg):not(.mv-vu)) { transform: scaleX(0); transform-origin: 0 50%; }
:where(svg[data-mv="trace"].mv-attente) :where([pathLength]) { transition: stroke-dashoffset .9s var(--mv-courbe); transition-delay: var(--mv-delai, 0ms);
  stroke-dasharray: 1 1; }
:where(svg[data-mv="trace"].mv-attente:not(.mv-vu)) :where([pathLength]) { stroke-dashoffset: 1; }
:where([data-mv="cascade"].mv-attente) > * { transition: opacity .45s var(--mv-courbe), transform .5s var(--mv-courbe);
  transition-delay: calc(var(--mv-delai, 0ms) + min(var(--mv-i, 0), 12) * 45ms); }
:where([data-mv="cascade"].mv-attente:not(.mv-vu)) > * { opacity: 0; transform: translateY(10px); }
::view-transition-old(root), ::view-transition-new(root) { animation-duration: .24s; animation-timing-function: ${COURBE}; }
::view-transition-group(mv-partage) { animation-duration: .38s; animation-timing-function: ${COURBE}; overflow: clip; }
::view-transition-old(mv-partage), ::view-transition-new(mv-partage) { height: 100%; object-fit: cover; animation-duration: .38s; }
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
  :where([data-mv]), :where([data-mv]) > *, :where([data-mv]) [pathLength] { transition: none !important; } }`;
  function styles() {
    if (document.getElementById('mouvement-style') || !document.head) return;
    const s = document.createElement('style');
    s.id = 'mouvement-style';
    s.textContent = STYLE;
    document.head.insertBefore(s, document.head.firstChild);   // en tête : la maquette passe après
  }
  styles();

  /* ---------------------------------------------------------------------------------------------- les transitions de page */
  let enCours = null, fondu = null, relance = null;
  const html = document.documentElement;
  // un geste pendant la transition la termine ; un clic adressé à <html> (le navigateur le fait pendant une View
  // Transition) est relancé sur l'élément qui est sous le doigt
  const ACTION = 'a[href], button, summary, label, input, select, textarea, [role="button"], [role="link"], [role="tab"], [tabindex]';
  function surGeste(e) {
    if (!enCours) return;
    if (e.type === 'pointerdown' && e.target === html) relance = { x: e.clientX, y: e.clientY, t: performance.now() };
    try { enCours.skipTransition(); } catch (err) { /* déjà finie */ }
  }
  function surClic(e) {
    const r = relance;
    if (!r || e.target !== html || performance.now() - r.t > 1500) return;
    relance = null;
    const el = document.elementFromPoint(r.x, r.y), c = el && el.closest(ACTION);
    if (!c || c === html) return;
    if (c.matches('input, select, textarea')) c.focus(); else c.click();
  }
  let ecoute = false;
  function ecouter(oui) {
    if (oui === ecoute) return;
    ecoute = oui;
    const f = oui ? 'addEventListener' : 'removeEventListener', o = { capture: true, passive: true };
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(t => window[f](t, surGeste, o));
  }
  window.addEventListener('click', surClic, { capture: true, passive: true });

  function transition(rendre, { type = 'page', depuis = null } = {}) {
    // une transition en cours se termine tout de suite (son rendu a lieu quand même)
    if (enCours) { try { enCours.skipTransition(); } catch (e) { /* finie */ } }
    if (fondu) { try { fondu.finish(); } catch (e) { /* finie */ } fondu = null; }
    if (!permis() || document.hidden) { rendre(); return Promise.resolve(); }
    const nom = depuis && depuis.getAttribute ? depuis.getAttribute('data-mv-nom') : null;
    if (typeof document.startViewTransition === 'function') {
      html.setAttribute('data-mv-transition', type);
      if (nom) depuis.style.viewTransitionName = 'mv-partage';
      let cible = null;
      let vt;
      try {
        vt = document.startViewTransition(() => {
          if (nom) depuis.style.viewTransitionName = '';
          rendre();
          if (nom) {
            cible = document.querySelector(`[data-mv-nom="${CSS.escape(nom)}"]`);
            if (cible && cible !== depuis) cible.style.viewTransitionName = 'mv-partage';
          }
        });
      } catch (e) {
        html.removeAttribute('data-mv-transition');
        if (nom) depuis.style.viewTransitionName = '';
        rendre(); return Promise.resolve();
      }
      enCours = vt;
      ecouter(true);
      const fin = () => {
        if (cible) cible.style.viewTransitionName = '';
        if (enCours === vt) { enCours = null; html.removeAttribute('data-mv-transition'); ecouter(false); }
      };
      vt.finished.then(fin, fin);
      vt.ready.catch(() => {});
      return vt.updateCallbackDone.catch(() => {});
    }
    // sans View Transitions : un fondu court de la page
    rendre();
    const m = document.querySelector('main');
    if (m && m.animate) fondu = m.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
    return Promise.resolve();
  }

  /* ---------------------------------------------------------------------------------------------- l'apparition au défilement */
  let io = null;
  function montrer(e) {
    if (e.classList.contains('mv-vu')) return;
    e.classList.add('mv-vu');
    if (e.getAttribute('data-mv') === 'compte') compter(e);
    // la transition finie, l'élément redevient ordinaire (ses propres transitions reprennent la main)
    const d = (parseFloat(e.getAttribute('data-mv-delai')) || 0) + (e.getAttribute('data-mv') === 'cascade' ? 1300 : 950);
    setTimeout(() => { if (e.isConnected) e.classList.remove('mv-attente'); }, d);
  }
  function reveler(racine = document, { immediat = false } = {}) {
    const els = [...(racine.querySelectorAll ? racine.querySelectorAll('[data-mv]') : [])];
    if (racine.matches && racine.matches('[data-mv]')) els.unshift(racine);
    if (immediat || !permis() || !('IntersectionObserver' in window)) {
      els.forEach(e => { e.classList.remove('mv-attente'); e.classList.add('mv-vu'); });
      return;
    }
    if (!io) io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { io.unobserve(x.target); montrer(x.target); } }), { rootMargin: '0px 0px -6% 0px' });
    els.forEach(e => {
      if (e.classList.contains('mv-vu')) return;
      const d = e.getAttribute('data-mv-delai');
      if (d) e.style.setProperty('--mv-delai', `${parseFloat(d) || 0}ms`);
      if (e.getAttribute('data-mv') === 'cascade') [...e.children].forEach((c, i) => c.style.setProperty('--mv-i', String(i)));
      if (e.getAttribute('data-mv') !== 'compte') e.classList.add('mv-attente');
      io.observe(e);
    });
  }

  /* ---------------------------------------------------------------------------------------------- la cascade (ce qui se déplie) */
  function cascade(el, { selecteur = null, pas = 22, max = 14, duree = 260, decalage = -6 } = {}) {
    if (!el || !permis()) return;
    const enfants = selecteur ? [...el.querySelectorAll(selecteur)] : [...el.children];
    enfants.slice(0, max).forEach((c, i) => {
      if (!c.animate) return;
      c.animate([{ opacity: 0, transform: `translateY(${decalage}px)` }, { opacity: 1, transform: 'none' }],
        { duration: duree, delay: i * pas, easing: COURBE, fill: 'backwards' });
    });
  }

  /* ---------------------------------------------------------------------------------------------- FLIP */
  const enVol = new WeakMap();
  const attrDe = cle => { const m = /^\[([\w-]+)/.exec(cle || ''); return m ? m[1] : (cle || 'data-mv-cle'); };
  function flip(conteneur, changer, { cle = '[data-mv-cle]', duree = 280 } = {}) {
    if (!conteneur || !permis()) { changer(); return; }
    const attr = attrDe(cle), sel = `[${attr}]`, H = innerHeight, marge = 160;
    const pres = r => r.bottom > -marge && r.top < H + marge && r.width > 0;
    // avant : les positions à l'écran (transform compris : un flip interrompu repart de là où l'on voit les éléments)
    const avant = new Map();
    conteneur.querySelectorAll(sel).forEach(e => { const k = e.getAttribute(attr); if (!k || avant.has(k)) return; const r = e.getBoundingClientRect(); if (pres(r)) avant.set(k, { r, e }); });
    (enVol.get(conteneur) || []).forEach(a => { try { a.cancel(); } catch (e) { /* finie */ } });
    changer();
    const anims = [];
    const apres = new Map();
    conteneur.querySelectorAll(sel).forEach(e => { const k = e.getAttribute(attr); if (!k || apres.has(k)) return; apres.set(k, { e, r: e.getBoundingClientRect() }); });
    apres.forEach(({ e, r }, k) => {
      if (!pres(r)) return;
      const a = avant.get(k);
      if (a) {
        const dx = a.r.left - r.left, dy = a.r.top - r.top;
        if (Math.abs(dx) < .5 && Math.abs(dy) < .5) return;
        anims.push(e.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: duree, easing: COURBE }));
      } else {
        anims.push(e.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: duree * .8, delay: duree * .25, easing: COURBE, fill: 'backwards' }));
      }
    });
    // ceux qui partent : ils s'effacent à leur place, dans une coquille du même genre que leur ancien parent
    avant.forEach(({ r, e }, k) => {
      if (apres.has(k) || e.isConnected) return;
      const parent = e.__mvParent;
      const coque = (parent ? parent.cloneNode(false) : document.createElement('div'));
      coque.removeAttribute('id');
      coque.setAttribute('aria-hidden', 'true');
      coque.inert = true;
      coque.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;padding:0;border:0;background:none;pointer-events:none;z-index:2;list-style:none;overflow:visible`;
      e.style.margin = '0';
      coque.appendChild(e);
      conteneur.appendChild(coque);
      const a = coque.animate([{ opacity: 1 }, { opacity: 0 }], { duration: duree * .6, easing: 'ease-in', fill: 'forwards' });
      a.onfinish = a.oncancel = () => coque.remove();
      anims.push(a);
    });
    enVol.set(conteneur, anims);
  }
  // FLIP a besoin de connaître le parent d'un élément qui part (changer() l'a détaché) : on le note avant
  const flipAvecParents = flip;
  function flipPublic(conteneur, changer, o = {}) {
    if (conteneur && permis()) { const attr = attrDe(o.cle); conteneur.querySelectorAll(`[${attr}]`).forEach(e => { e.__mvParent = e.parentElement; }); }
    return flipAvecParents(conteneur, changer, o);
  }

  /* ---------------------------------------------------------------------------------------------- les chiffres qui comptent */
  function compter(el, { duree = 900 } = {}) {
    if (!el || el.__mvCompte || !permis()) return;
    const texte = el.textContent, m = /\d(?:[\d   ]*\d)?/.exec(texte);
    if (!m) return;
    const cible = +m[0].replace(/\D/g, '');
    if (!(cible > 1)) return;
    const sep = (/[   ]/.exec(m[0]) || [''])[0];
    const avant = texte.slice(0, m.index), apres = texte.slice(m.index + m[0].length);
    const format = n => sep ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep) : String(n);
    const origine = el.innerHTML;
    el.__mvCompte = true;
    el.innerHTML = `<span aria-hidden="true">${esc(avant)}<span class="mv-chiffre">${format(0)}</span>${esc(apres)}</span><span class="mv-lecteur">${esc(texte)}</span>`;
    const chiffre = el.querySelector('.mv-chiffre'), t0 = performance.now();
    const pas = now => {
      if (!el.isConnected) return;
      const u = Math.min(1, (now - t0) / duree), v = 1 - (1 - u) ** 3;
      if (u < 1) { chiffre.textContent = format(Math.round(cible * v)); requestAnimationFrame(pas); }
      else { el.innerHTML = origine; el.__mvCompte = false; }
    };
    requestAnimationFrame(pas);
  }

  /* ---------------------------------------------------------------------------------------------- la pression */
  const PRESSABLE = 'a[href], button, summary, [role="button"], [role="tab"], label, .mv-pressable';
  let presse = null;
  const lacher = () => { if (presse) { presse.classList.remove('mv-presse'); presse = null; } };
  function presser(racine = document) {
    if (!racine || racine.__mvPresse) return;
    racine.__mvPresse = true;
    racine.addEventListener('pointerdown', e => {
      if (e.button) return;
      const el = e.target.closest && e.target.closest(PRESSABLE);
      if (!el || el.disabled) return;
      lacher(); el.classList.add('mv-presse'); presse = el;
    }, { passive: true });
    racine.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches(PRESSABLE)) { lacher(); e.target.classList.add('mv-presse'); presse = e.target; }
    }, { passive: true });
    if (!window.__mvLacher) {
      window.__mvLacher = true;
      ['pointerup', 'pointercancel', 'keyup', 'blur', 'dragstart'].forEach(t => window.addEventListener(t, lacher, { passive: true, capture: true }));
      document.addEventListener('pointerleave', lacher, { passive: true });
    }
  }

  return { permis, transition, reveler, cascade, flip: flipPublic, compter, presse: presser };
})();
