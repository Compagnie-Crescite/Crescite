'use strict';
/* Les gestes communs à l'administration (admin/index.html) et à l'espace de l'équipe (equipe/index.html) : ce qui rend
   chaque liste, chaque carte et chaque tuile « vivante » sans un clic de plus.
   - Le menu contextuel (GESTES.menu) : un clic droit, un appui long (au doigt, avec une courte vibration), Maj+F10 ou la
     touche Menu sur un élément ouvrent ses actions, celles que chaque interface déclare (fournisseurs : une cible CSS,
     des actions pour l'élément). Près du pointeur à l'ordinateur ; en feuille, depuis le bas, au téléphone. Au clavier :
     ↑ ↓ Début Fin, Entrée, Échap (le focus revient à l'élément) ; un clic à côté, le défilement, un changement de page
     le ferment. Un élément [data-gestes-menu] (un bouton « ⋯ ») ouvre le menu de la cible qui le contient.
   - Les flèches (GESTES.fleches) : dans une liste, ↑ ↓ (← → aussi) passent d'une ligne à l'autre, Début et Fin aux bouts.
   - Le balayage (GESTES.glisser) : au doigt, vers la gauche ou la droite (le suivant, le précédent), jamais sur un cadre
     qui défile de côté.
   - Précédent / suivant (GESTES.precSuiv, GESTES.clavierPrecSuiv) : deux boutons nommés (« Précédent : Bérénice ·
     mar. 4 nov. »), les mêmes partout, et leurs touches (Alt+↑ Alt+↓ dans l'administration ; ← → dans l'espace de
     l'équipe, hors d'un champ). Un bouton porte l'adresse où aller (data-href).
   - Le formulaire (GESTES.formulaire) : une feuille de modification, depuis le bas au téléphone, au centre à
     l'ordinateur, avec ses champs, Annuler, Enregistrer ; ce que l'espace de l'équipe ouvre d'un appui long pour
     modifier une date, ses horaires, son lieu, son équipe, son suivi, une note de frais…
   - Ne rien perdre (GESTES.garder, GESTES.saisie, GESTES.quitter, GESTES.oublier) : une saisie commencée (une feuille du
     formulaire changée, un formulaire gardé : une note, une fenêtre) ne se perd pas en silence ; la question se pose dans
     une boîte de la charte (« Rester », « Quitter sans enregistrer »), jamais par confirm(), et seulement si quelque chose
     a changé.
   - L'aide (GESTES.aide, GESTES.toucheAide) : la touche « ? » (ou un bouton discret) ouvre dans la même boîte les
     raccourcis de l'espace, rangés par contexte ; au doigt, les gestes à la place.
   - Supprimer sans trembler (GESTES.confirmer) : une action qui détruit (supprimer, retirer, fusionner, délier…) et
     qu'on ne peut pas annuler après coup se demande dans la même boîte : le bouton dangereux nommé par son action
     (« Supprimer la date »), à la couleur d'alerte ; « Annuler » a le focus (Échap, le voile y mènent aussi).
   Rien ne vibre ni ne s'anime si l'appareil demande moins d'animations (prefers-reduced-motion, html.still, ?anim=0). */
const GESTES = (() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduit = () => (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.classList.contains('still') || /[?&]anim=0(&|$)/.test(location.search);
  const tactile = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const etroit = () => typeof matchMedia === 'function' && matchMedia('(max-width: 640px)').matches;
  const vibrer = (ms = 8) => { try { if (navigator.vibrate && !reduit() && tactile()) navigator.vibrate(ms); } catch (e) { /* refusé : tant pis */ } };
  const dansChamp = el => !!(el && el.closest && el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], dialog.recherche'));
  // une boîte modale ouverte (une feuille du formulaire, une boîte de l'espace de l'équipe : [aria-modal="true"]) : les
  // gestes qui mènent ailleurs (← →, le balayage) dorment ; ils ne changeraient pas la page derrière, en fermant la boîte
  const modaleOuverte = () => !!document.querySelector('[aria-modal="true"]');
  const ico = d => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  // les icônes : celles de la bibliothèque (admin/icones.js) quand elle est chargée ; l'espace de l'équipe ne la charge pas et garde
  // ses tracés d'ici (le cercle aux huit rayons pour les réglages, entre autres)
  const ICO = (typeof ICONES !== 'undefined' && ICONES.ICO) || {
    haut: ico('<path d="m6 15 6-6 6 6"/>'), bas: ico('<path d="m6 9 6 6 6-6"/>'), gauche: ico('<path d="m15 6-6 6 6 6"/>'), droite: ico('<path d="m9 6 6 6-6 6"/>'),
    points: ico('<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>'),
    ouvrir: ico('<path d="M5 12h14M13 6l6 6-6 6"/>'), externe: ico('<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'),
    copier: ico('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>'), tel: ico('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1"/>'),
    mel: ico('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'), coche: ico('<path d="m5 12 4 4L19 7"/>'), croix: ico('<path d="M6 6l12 12M18 6 6 18"/>'),
    plus: ico('<path d="M12 5v14M5 12h14"/>'), moins: ico('<path d="M5 12h14"/>'), carte: ico('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
    feuille: ico('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'), reglages: ico('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>'),
    oeil: ico('<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'), cache: ico('<path d="M3 3l18 18M10.6 10.6A3 3 0 0 0 13.4 13.4M9.9 5.1A10 10 0 0 1 22 12a16 16 0 0 1-3.2 3.8M6.6 6.6A16 16 0 0 0 2 12s3.5 6 10 6a9.8 9.8 0 0 0 4-.8"/>'),
    poubelle: ico('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'), euro: ico('<path d="M18 6a7 7 0 1 0 0 12M4 10h10M4 14h10"/>'), agenda: ico('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    partager: ico('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/>'), alerte: ico('<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>'),
    dupliquer: ico('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'), message: ico('<path d="M4 5h16v11H8l-4 4z"/>'),
  };

  // ===================================================================================================== le menu contextuel
  const FOURNISSEURS = [];       // { racine, cible, actions(el, infos) → [ {libelle, detail, icone, href, externe, faire, danger, separateur, raccourci, desactive} ], titre }
  let ouvert = null;             // le menu affiché : { m, el, f, actions, declencheur }
  let appui = null;              // l'appui long en cours
  let dernierAppui = 0;          // quand le dernier appui long a ouvert un menu (le contextmenu d'Android qui suit est ignoré)
  const styleCibles = document.createElement('style');
  styleCibles.id = 'styles-gestes-cibles';
  document.head.append(styleCibles);
  function menu(f) {
    if (!f || !f.cible || typeof f.actions !== 'function') throw new Error('GESTES.menu : une cible et des actions');
    FOURNISSEURS.push({ racine: f.racine || document, cible: f.cible, actions: f.actions, titre: f.titre || '' });
    // au doigt, l'appui long est à nous : ni le menu natif du lien, ni la sélection du texte
    styleCibles.textContent = `@media (pointer: coarse) { ${FOURNISSEURS.map(x => x.cible).join(', ')} { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; } }`;
    return f;
  }
  // le fournisseur d'un élément : celui dont la cible est la plus proche de l'élément
  function fournisseurPour(depart) {
    if (!depart || !depart.closest) return null;
    let meilleur = null;
    for (const f of FOURNISSEURS) {
      if (!f.racine.contains(depart)) continue;
      const el = depart.closest(f.cible);
      if (!el) continue;
      if (!meilleur || (el !== meilleur.el && meilleur.el.contains(el))) meilleur = { f, el };
    }
    return meilleur;
  }
  const actionsDe = (f, el, infos) => { try { return (f.actions(el, infos) || []).filter(Boolean); } catch (e) { console.error(e); return []; } };
  const titreDe = (f, el) => { try { return typeof f.titre === 'function' ? f.titre(el) || '' : f.titre || ''; } catch (e) { return ''; } };
  // ouvrir le menu d'un élément (ou de la cible qui le contient) : à un point, ou près de l'élément
  function ouvrir(depart, { x, y, source = 'clic' } = {}) {
    const c = fournisseurPour(depart);
    if (!c) return false;
    const actions = actionsDe(c.f, c.el, { source, x, y });
    if (!actions.length) return false;
    if (x == null || y == null) { const r = c.el.getBoundingClientRect(); x = Math.round(r.left + Math.min(24, r.width / 2)); y = Math.round(r.bottom - 4); }
    rendre(c.el, c.f, actions, { x, y }, source);
    return true;
  }
  function item(a, i) {
    if (a.separateur) return '<hr class="gm-sep">';
    const corps = `${a.icone ? `<span class="gm-ic">${a.icone}</span>` : '<span class="gm-ic"></span>'}<span class="gm-l">${esc(a.libelle)}${a.detail ? `<small>${esc(a.detail)}</small>` : ''}</span>${a.raccourci ? `<kbd>${esc(a.raccourci)}</kbd>` : ''}`;
    const cls = `gm-i${a.danger ? ' danger' : ''}${a.desactive ? ' off' : ''}`;
    if (a.href && !a.desactive) return `<a class="${cls}" role="menuitem" tabindex="-1" data-gm="${i}" href="${esc(a.href)}"${a.externe ? ' target="_blank" rel="noopener"' : ''}>${corps}</a>`;
    return `<button type="button" class="${cls}" role="menuitem" tabindex="-1" data-gm="${i}"${a.desactive ? ' aria-disabled="true"' : ''}>${corps}</button>`;
  }
  function rendre(el, f, actions, pos, source) {
    fermer();
    const feuille = etroit() || (source === 'appui' && tactile());
    const titre = titreDe(f, el);
    const m = document.createElement('div');
    m.className = `gm${feuille ? ' gm-feuille' : ''}${reduit() ? ' gm-calme' : ''}`;
    m.innerHTML = `${feuille ? '<div class="gm-voile" data-gm-fermer></div>' : ''}<div class="gm-boite" role="menu" tabindex="-1" aria-label="${esc(titre || 'Actions')}">${feuille ? `<div class="gm-tete"><span class="gm-poignee" aria-hidden="true"></span>${titre ? `<div class="gm-titre">${esc(titre)}</div>` : ''}</div>` : ''}${actions.map(item).join('')}</div>`;
    document.body.append(m);
    const boite = $('.gm-boite', m);
    if (!feuille) {
      const w = boite.offsetWidth, h = boite.offsetHeight, iw = window.innerWidth, ih = window.innerHeight;
      let x = pos.x, y = pos.y;
      if (x + w > iw - 8) x = Math.max(8, iw - w - 8);
      if (y + h > ih - 8) y = Math.max(8, pos.y - h);
      boite.style.left = `${Math.round(x)}px`; boite.style.top = `${Math.round(y)}px`;
    }
    ouvert = { m, el, f, actions, declencheur: document.activeElement, defilY: window.scrollY, source };
    m.addEventListener('click', e => {
      if (e.target.closest('[data-gm-fermer]')) { fermer(true); return; }
      const b = e.target.closest('[data-gm]');
      if (!b) return;
      const a = actions[+b.dataset.gm];
      if (!a || a.desactive) { e.preventDefault(); return; }
      if (a.href) { fermer(); return; }                 // le lien fait le reste
      e.preventDefault();
      fermer(!a.garderFocus);
      try { if (typeof a.faire === 'function') a.faire(el, e); } catch (err) { console.error(err); }
    });
    m.addEventListener('keydown', e => {
      const xs = $$('[data-gm]:not(.off)', m), i = xs.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fermer(true); return; }
      if (e.key === 'Tab') { fermer(true); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!xs.length) return; xs[(i + (e.key === 'ArrowDown' ? 1 : -1) + xs.length) % xs.length].focus(); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); xs[e.key === 'Home' ? 0 : xs.length - 1]?.focus(); }
      else if (e.key === ' ' && document.activeElement?.matches('a[data-gm]')) { e.preventDefault(); document.activeElement.click(); }
    });
    m.addEventListener('mousemove', e => { if (ouvert && ouvert.source === 'appui') return; const b = e.target.closest('[data-gm]:not(.off)'); if (b && document.activeElement !== b) b.focus(); });
    // au clavier et à la souris, la première action a le focus ; au doigt, la feuille elle-même (rien n'est mis en avant)
    requestAnimationFrame(() => { const premier = source === 'appui' ? boite : $('[data-gm]:not(.off)', m); if (premier) premier.focus({ preventScroll: true }); });
    if (source === 'appui') vibrer(12);
  }
  function fermer(rendreFocus = false) {
    if (!ouvert) return;
    const o = ouvert;
    ouvert = null;
    o.m.remove();
    if (rendreFocus && o.declencheur && o.declencheur.isConnected && typeof o.declencheur.focus === 'function' && !o.declencheur.closest('.gm')) o.declencheur.focus({ preventScroll: true });
  }
  // un clic ou un appui à côté, le défilement, un changement de taille ou de page ferment le menu
  document.addEventListener('pointerdown', e => { if (ouvert && !ouvert.m.contains(e.target)) fermer(); }, true);
  document.addEventListener('scroll', () => { if (ouvert && Math.abs(window.scrollY - ouvert.defilY) > 2) fermer(); }, true);
  window.addEventListener('resize', () => fermer());
  window.addEventListener('hashchange', () => fermer());
  // le clic droit (la souris) ; sur Android, l'appui long envoie aussi un contextmenu : s'il suit le nôtre, on l'ignore
  document.addEventListener('contextmenu', e => {
    if (Date.now() - dernierAppui < 900) { e.preventDefault(); return; }
    if (dansChamp(e.target)) return;
    const c = fournisseurPour(e.target);
    if (!c) return;
    const actions = actionsDe(c.f, c.el, { source: 'clic', x: e.clientX, y: e.clientY });
    if (!actions.length) return;
    e.preventDefault();
    rendre(c.el, c.f, actions, { x: e.clientX, y: e.clientY }, 'clic');
  });
  // l'appui long (le doigt, le stylet) : 480 ms sans bouger ; le clic qui suit l'appui est avalé. La durée est celle du
  // doigt (l'heure des événements, e.timeStamp), pas celle de la page : quand elle est occupée (elle se dessine), le minuteur
  // part en retard et le doigt levé pouvait passer avant lui ; levé après 480 ms, l'appui ouvre son menu quand même
  const APPUI = 480;
  document.addEventListener('pointerdown', e => {
    appui = null;
    if (e.pointerType === 'mouse' || !e.isPrimary || (e.button !== 0 && e.button !== -1) || ouvert) return;
    if (dansChamp(e.target)) return;
    const c = fournisseurPour(e.target);
    if (!c) return;
    const a = { x: e.clientX, y: e.clientY, c, id: e.pointerId, t: null, quand: e.timeStamp };
    a.ouvrir = (leve = false) => {
      if (appui !== a) return;
      clearTimeout(a.t);
      appui = null;
      const actions = actionsDe(c.f, c.el, { source: 'appui', x: a.x, y: a.y });
      if (!actions.length) return;
      dernierAppui = Date.now();
      // le clic que le doigt produit en se relevant est avalé ; pas celui, juste après, sur une action du menu
      const avaler = ev => { ev.preventDefault(); ev.stopPropagation(); };
      const oublier = () => document.removeEventListener('click', avaler, { capture: true });
      document.addEventListener('click', avaler, { capture: true, once: true });
      const releve = () => setTimeout(oublier, 150);
      if (leve) releve();      // (le doigt est déjà levé : son clic vient juste après)
      else {
        document.addEventListener('pointerup', releve, { capture: true, once: true });
        document.addEventListener('pointercancel', releve, { capture: true, once: true });
      }
      setTimeout(oublier, 1500);
      rendre(c.el, c.f, actions, { x: a.x, y: a.y }, 'appui');
    };
    a.t = setTimeout(() => a.ouvrir(), APPUI);
    appui = a;
  }, { passive: true, capture: true });
  const annulerAppui = () => { if (appui) { clearTimeout(appui.t); appui = null; } };
  document.addEventListener('pointermove', e => { if (appui && e.pointerId === appui.id && Math.hypot(e.clientX - appui.x, e.clientY - appui.y) > 10) annulerAppui(); }, { passive: true, capture: true });
  document.addEventListener('pointerup', e => { if (appui && e.pointerId === appui.id && e.timeStamp - appui.quand >= APPUI) appui.ouvrir(true); else annulerAppui(); }, { passive: true, capture: true });
  document.addEventListener('pointercancel', annulerAppui, { passive: true, capture: true });
  document.addEventListener('scroll', annulerAppui, { passive: true, capture: true });
  // au clavier : Maj+F10 ou la touche Menu sur l'élément qui a le focus ; un bouton [data-gestes-menu] ouvre le menu de sa cible
  document.addEventListener('keydown', e => {
    if (!((e.key === 'F10' && e.shiftKey) || e.key === 'ContextMenu')) return;
    if (dansChamp(e.target) || ouvert) return;
    if (ouvrir(document.activeElement, { source: 'clavier' })) e.preventDefault();
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-gestes-menu]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const r = b.getBoundingClientRect();
    ouvrir(b.parentElement || b, { x: Math.round(r.left), y: Math.round(r.bottom + 2), source: 'clavier' });
  }, true);

  // ===================================================================================================== les flèches
  // dans racine, ↑ ↓ (et ← →) passent d'une cible à la suivante (celles qu'on voit), Début et Fin aux bouts
  function fleches(racine, cible, { horizontal = true } = {}) {
    racine.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || ouvert) return;
      if (dansChamp(e.target)) return;
      const el = e.target.closest?.(cible);
      if (!el) return;
      const suiv = e.key === 'ArrowDown' || (horizontal && e.key === 'ArrowRight'), prec = e.key === 'ArrowUp' || (horizontal && e.key === 'ArrowLeft');
      if (!suiv && !prec && e.key !== 'Home' && e.key !== 'End') return;
      const xs = $$(cible, racine).filter(x => x === el || x.offsetParent !== null);
      const i = xs.indexOf(el);
      if (i < 0) return;
      const j = e.key === 'Home' ? 0 : e.key === 'End' ? xs.length - 1 : i + (suiv ? 1 : -1);
      if (j < 0 || j >= xs.length || j === i) return;
      e.preventDefault();
      xs[j].focus();
      try { xs[j].scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (err) { /* vieux navigateur */ }
    });
  }

  // ===================================================================================================== le balayage
  // au doigt (ou au stylet) : un geste franc vers la gauche appelle gauche(), vers la droite droite() ; ignorer : une
  // cible CSS (ou une fonction) où le geste reste au navigateur (un cadre qui défile de côté)
  function glisser(el, { gauche, droite, seuil = 56, ignorer = null, bord = 32 } = {}) {
    let d = null;
    const aIgnorer = t => (typeof ignorer === 'function' ? ignorer(t) : ignorer ? !!t.closest?.(ignorer) : false);
    // les événements tactiles, pas les pointeurs : dès que la page défile, le navigateur annule le pointeur, le toucher non
    el.addEventListener('touchstart', e => {
      d = null;
      if (e.touches.length !== 1 || dansChamp(e.target) || aIgnorer(e.target) || ouvert || modaleOuverte()) return;
      const t = e.touches[0];
      if (t.clientX < bord || t.clientX > window.innerWidth - bord) return;   // le bord : le retour du navigateur, de l'application
      d = { x: t.clientX, y: t.clientY, dx: 0, dy: 0, t: e.timeStamp };
    }, { passive: true });
    el.addEventListener('touchmove', e => { if (!d || e.touches.length !== 1) { d = null; return; } d.dx = e.touches[0].clientX - d.x; d.dy = e.touches[0].clientY - d.y; }, { passive: true });
    el.addEventListener('touchend', e => {
      if (!d) return;
      const { dx, dy } = d, dt = e.timeStamp - d.t;     // (la durée du geste, à l'heure du doigt : une page occupée ne le ralentit pas)
      d = null;
      if (dt > 800 || Math.abs(dx) < seuil || Math.abs(dx) < Math.abs(dy) * 1.6 || ouvert || modaleOuverte()) return;
      const f = dx < 0 ? gauche : droite;
      if (typeof f === 'function') { vibrer(6); f(e); }
    }, { passive: true });
    el.addEventListener('touchcancel', () => { d = null; }, { passive: true });
  }

  // ===================================================================================================== précédent / suivant
  // deux boutons, nommés d'après ce qu'ils ouvrent (libelle(x)) ; chacun porte son adresse (data-href) : un clic y va.
  // axe : 'vertical' (↑ ↓, les listes de l'administration) ou 'horizontal' (← →, les pages de l'espace de l'équipe) ;
  // texte : le nom visible dans le bouton (sinon l'icône seule, le nom en infobulle)
  // quoi (facultatif) : ce que chaque bouton ouvre, écrit au-dessus de son nom ({ prec: 'Date précédente', suiv: 'Date
  // suivante', aucun: 'aucune' }), avec la touche qui fait de même, pour qui a un clavier ; long : le nom complet, pour le
  // lecteur d'écran et l'infobulle, quand le nom visible est court
  function precSuiv({ prec = null, suiv = null, libelle = x => String(x?.titre ?? x ?? ''), long: nomLong = null, quoi = null, classe = 'btn petit', axe = 'vertical', texte = false, raccourcis = true, nom = 'Précédent, suivant' } = {}) {
    const vertical = axe === 'vertical';
    const b = (x, sens) => {
      const q = quoi ? (sens < 0 ? quoi.prec : quoi.suiv) : (sens < 0 ? 'Précédent' : 'Suivant'), l = x ? libelle(x) : '', r = raccourcis ? (vertical ? (sens < 0 ? 'Alt+↑' : 'Alt+↓') : (sens < 0 ? '←' : '→')) : '';
      const long = x ? `${q} : ${nomLong ? nomLong(x) : l}` : `${q} : ${quoi?.aucun || 'aucun'}`;
      const icone = vertical ? (sens < 0 ? ICO.haut : ICO.bas) : (sens < 0 ? ICO.gauche : ICO.droite);
      const corps = !texte ? '' : quoi
        ? `<span class="gps-t"><span class="gps-quoi">${esc(q)}${r ? `<kbd class="gps-touche" aria-hidden="true">${esc(r)}</kbd>` : ''}</span> <span class="gps-l">${esc(x ? l : quoi.aucun || 'aucun')}</span></span>`
        : `<span class="gps-t">${esc(x ? l : q)}</span>`;
      return `<button type="button" class="${esc(classe)} gps-b gps-${sens < 0 ? 'prec' : 'suiv'}${quoi && texte ? ' gps-deux' : ''}" data-gps="${sens}"${x && x.href ? ` data-href="${esc(x.href)}"` : ''}${x ? '' : ' disabled'} aria-label="${esc(long)}${r ? ` (${r})` : ''}" title="${esc(long)}${r ? ` (${r})` : ''}">${sens < 0 ? icone : ''}${corps}${sens > 0 ? icone : ''}</button>`;
    };
    return `<span class="gps${texte ? ' gps-texte' : ''}" role="group" aria-label="${esc(nom)}">${b(prec, -1)}${b(suiv, 1)}</span>`;
  }
  // un bouton précédent / suivant qui porte une adresse y va (sauf si l'interface l'a pris en charge avant)
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-gps][data-href]');
    if (!b || b.disabled || e.defaultPrevented) return;
    location.hash = b.dataset.href;
  });
  // les touches : Alt+↑ Alt+↓ (modif 'alt', l'administration) ou ← → (modif 'aucun', hors d'un champ) actionnent le premier
  // groupe précédent / suivant de la page
  function clavierPrecSuiv(racine = document, { modif = 'alt', portee = null } = {}) {
    racine.addEventListener('keydown', e => {
      if (ouvert || e.ctrlKey || e.metaKey || e.shiftKey || modaleOuverte()) return;
      if (modif === 'alt' ? !e.altKey : e.altKey) return;
      if (modif !== 'alt' && dansChamp(e.target)) return;
      // Alt+↑ Alt+↓ dans l'administration (Alt+← Alt+→ restent au navigateur : la page d'avant, d'après) ; ← → dans
      // l'espace de l'équipe (↑ ↓ y restent au défilement de la page)
      const sens = (modif === 'alt' ? { ArrowUp: -1, ArrowDown: 1 } : { ArrowLeft: -1, ArrowRight: 1 })[e.key];
      if (!sens) return;
      // dans une liste, ← → restent aux flèches des lignes ; Alt les libère
      if (modif !== 'alt' && e.target.closest?.('a.ligne, a.tb-l, [role="grid"], [role="listbox"], .gm')) return;
      const b = $(`${portee ? `${portee} ` : ''}.gps [data-gps="${sens}"]:not([disabled])`);
      if (!b) return;
      e.preventDefault();
      b.click();
    });
  }

  // ===================================================================================================== le formulaire
  /* Une feuille de modification : depuis le bas au téléphone, au centre à l'ordinateur. Des champs (texte, tel, url, mel,
     nombre, date, heure, long, choix (un select, ou des boutons avec seg), case, cases, groupe : une liste d'objets aux
     mêmes champs, qu'on ajoute et retire), Annuler, Enregistrer, et une action à part (danger). enregistrer(valeurs) rend
     vrai (ou rien) quand c'est fait, un texte quand ça a échoué : la feuille reste ouverte et le dit. Résout avec les
     valeurs enregistrées, ou null. Échap, le voile et Annuler ferment ; Tab reste dans la feuille. */
  let ouvertF = null;
  function formulaire({ titre, sousTitre = '', champs = [], ok = 'Enregistrer', annuler = 'Annuler', danger = null, enregistrer, note = '' }) {
    fermerFormulaire();
    fermer();
    return new Promise(resolve => {
      let n = 0;
      const id = () => `gf-c${++n}`;
      const champ = (c, v, base = '') => {
        const nom = base ? `${base}.${c.k}` : c.k, i = id(), aide = c.aide ? `<small class="gf-aide">${esc(c.aide)}</small>` : '';
        const attr = `name="${esc(nom)}" id="${i}"${c.requis ? ' required' : ''}`;
        const lib = `<label for="${i}">${esc(c.l || '')}</label>`;
        switch (c.t) {
          case 'long': return `<div class="gf-champ${c.large ? ' gf-large' : ''}">${lib}<textarea ${attr} rows="${c.lignes || 3}"${c.ph ? ` placeholder="${esc(c.ph)}"` : ''}>${esc(v ?? '')}</textarea>${aide}</div>`;
          case 'case': return `<div class="gf-champ gf-case"><label class="gf-coche"><input type="checkbox" ${attr}${v ? ' checked' : ''}> ${esc(c.l || '')}</label>${aide}</div>`;
          case 'cases': return `<fieldset class="gf-champ gf-cases"><legend>${esc(c.l || '')}</legend>${(c.choix || []).map(([val, l, det]) => `<label class="gf-coche"><input type="checkbox" name="${esc(nom)}" value="${esc(val)}"${(Array.isArray(v) ? v : []).some(x => String(x) === String(val)) ? ' checked' : ''}> <span>${esc(l)}${det ? `<small>${esc(det)}</small>` : ''}</span></label>`).join('')}${aide}</fieldset>`;
          case 'choix': return c.seg ? `<div class="gf-champ" role="group" aria-labelledby="${i}-l"><span class="gf-lib" id="${i}-l">${esc(c.l || '')}</span><span class="gf-seg" data-gf-seg="${esc(nom)}">${(c.choix || []).map(([val, l]) => `<button type="button" data-val="${esc(val)}" aria-pressed="${String(v ?? '') === String(val)}">${esc(l)}</button>`).join('')}<input type="hidden" name="${esc(nom)}" value="${esc(v ?? '')}"></span>${aide}</div>`
            : `<div class="gf-champ">${lib}<select ${attr}>${(c.choix || []).map(([val, l]) => `<option value="${esc(val)}"${String(v ?? '') === String(val) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>${aide}</div>`;
          case 'groupe': { const xs = Array.isArray(v) ? v : [];
            return `<div class="gf-champ gf-groupe" data-gf-groupe="${esc(nom)}" data-gf-modele="${esc(JSON.stringify(c.modele || {}))}"><span class="gf-lib">${esc(c.l || '')}</span><div class="gf-items">${xs.map((x, k) => item(c, x, nom, k)).join('')}</div>
              <button type="button" class="gf-ajout" data-gf-ajouter>${ICO.plus} ${esc(c.ajout || 'Ajouter')}</button>${aide}</div>`; }
          case 'nombre': return `<div class="gf-champ">${lib}<input type="number" ${attr} value="${esc(v ?? '')}"${c.min != null ? ` min="${c.min}"` : ''}${c.max != null ? ` max="${c.max}"` : ''} step="${c.pas || 'any'}" inputmode="${c.pas && c.pas < 1 ? 'decimal' : 'numeric'}">${aide}</div>`;
          case 'fichier': return `<div class="gf-champ gf-fichier">${lib}<input type="file" ${attr}${c.accept ? ` accept="${esc(c.accept)}"` : ''}${c.capture ? ` capture="${esc(c.capture)}"` : ''}>${aide}</div>`;
          default: { const type = { tel: 'tel', url: 'url', mel: 'email', date: 'date', heure: 'time' }[c.t] || 'text';
            return `<div class="gf-champ${c.large ? ' gf-large' : ''}">${lib}<input type="${type}" ${attr} value="${esc(v ?? '')}"${c.ph ? ` placeholder="${esc(c.ph)}"` : ''}${type === 'text' ? ' autocomplete="off"' : ''}${c.t === 'tel' ? ' inputmode="tel"' : ''}>${aide}</div>`; }
        }
      };
      const item = (c, x, nom, k) => `<div class="gf-item" data-gf-item><input type="hidden" name="${esc(nom)}.${k}._id" value="${esc(x && x.id != null ? x.id : '')}"><div class="gf-rangee">${c.champs.map(s => champ(s, x ? x[s.k] : undefined, `${nom}.${k}`)).join('')}</div><button type="button" class="gf-retirer" data-gf-retirer aria-label="Retirer">${ICO.croix}</button></div>`;
      const m = document.createElement('div');
      m.className = `gf${reduit() ? ' gf-calme' : ''}`;
      m.innerHTML = `<div class="gf-voile" data-gf-annuler></div><form class="gf-boite" role="dialog" aria-modal="true" aria-labelledby="gf-titre" novalidate>
        <div class="gf-tete"><span class="gm-poignee" aria-hidden="true"></span><h2 id="gf-titre">${esc(titre)}</h2>${sousTitre ? `<p class="gf-sous">${esc(sousTitre)}</p>` : ''}</div>
        <div class="gf-corps">${champs.map(c => champ(c, c.valeur)).join('')}${note ? `<p class="gf-note">${esc(note)}</p>` : ''}</div>
        <p class="gf-erreur" role="alert" hidden></p>
        <div class="gf-pied">${danger ? `<button type="button" class="gf-btn gf-danger" data-gf-danger>${esc(danger.libelle)}</button>` : ''}<span class="gf-fin"><button type="button" class="gf-btn" data-gf-annuler>${esc(annuler)}</button><button type="submit" class="gf-btn principal">${esc(ok)}</button></span></div></form>`;
      document.body.append(m);
      document.documentElement.classList.add('gf-ouvert');
      const form = $('form', m), declencheur = document.activeElement;
      ouvertF = { m, resolve: null };
      const finir = valeur => { if (ouvertF && ouvertF.m === m) ouvertF = null; m.dataset.fini = '1'; m.remove(); if (!$('.gf')) document.documentElement.classList.remove('gf-ouvert'); if (declencheur && declencheur.isConnected && typeof declencheur.focus === 'function') declencheur.focus({ preventScroll: true }); resolve(valeur); };
      ouvertF.resolve = finir;
      // fermer sans enregistrer (Annuler, Échap, le voile) : la question, seulement si un champ a changé depuis l'ouverture
      const abandonner = async () => { if (!modifie() || await quitter({ texte: 'Les changements de cette feuille ne sont pas enregistrés.' })) finir(null); };
      // les valeurs : par nom, les chemins a.b.c en objets, les groupes en tableaux, les cases en booléens, les nombres en nombres
      const lire = () => {
        const out = {};
        const poser = (chemin, val) => { const ks = chemin.split('.'); let o = out; ks.slice(0, -1).forEach((k, i) => { if (o[k] == null) o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[k]; }); o[ks[ks.length - 1]] = val; };
        champsPlats(champs).forEach(({ c, nom }) => {
          if (c.t === 'cases') { poser(nom, $$(`input[name="${CSS.escape(nom)}"]:checked`, form).map(x => x.value)); return; }
          if (c.t === 'groupe') {
            const xs = $$(`[data-gf-groupe="${CSS.escape(nom)}"] > .gf-items > [data-gf-item]`, form).map(it => { const o = { id: $('input[type=hidden]', it).value || null };
              c.champs.forEach(s => { const el = $(`[name$=".${CSS.escape(s.k)}"]`, it); o[s.k] = !el ? undefined : s.t === 'case' ? el.checked : s.t === 'nombre' ? (el.value === '' ? null : Number(el.value)) : el.value; });
              return o; });
            poser(nom, xs); return;
          }
          const el = $(`[name="${CSS.escape(nom)}"]`, form);
          if (!el) return;
          poser(nom, c.t === 'case' ? el.checked : c.t === 'nombre' ? (el.value === '' ? null : Number(el.value)) : c.t === 'fichier' ? ((el.files && el.files[0]) || null) : el.value);
        });
        return out;
      };
      const champsPlats = xs => xs.map(c => ({ c, nom: c.k }));
      const empreinte = () => { try { return JSON.stringify(lire(), (k, v) => (typeof File !== 'undefined' && v instanceof File ? `${v.name}:${v.size}` : v)); } catch (e) { return ''; } };
      const depart = empreinte(), modifie = () => !m.dataset.fini && empreinte() !== depart;
      ouvertF.modifie = modifie;
      $('.gf-voile', m).addEventListener('click', e => { e.preventDefault(); abandonner(); });
      form.addEventListener('click', e => {
        const seg = e.target.closest('[data-gf-seg] button');
        if (seg) { const z = seg.closest('[data-gf-seg]'); $$('button', z).forEach(b => b.setAttribute('aria-pressed', String(b === seg))); $('input[type=hidden]', z).value = seg.dataset.val; return; }
        if (e.target.closest('[data-gf-annuler]')) { e.preventDefault(); abandonner(); return; }
        if (e.target.closest('[data-gf-danger]')) { e.preventDefault(); finir(null); try { danger.faire(); } catch (err) { console.error(err); } return; }
        const ret = e.target.closest('[data-gf-retirer]');
        if (ret) { e.preventDefault(); const it = ret.closest('[data-gf-item]'); const g = it.closest('[data-gf-groupe]'); it.remove(); renumeroter(g); return; }
        const aj = e.target.closest('[data-gf-ajouter]');
        if (aj) {
          e.preventDefault();
          const g = aj.closest('[data-gf-groupe]'), c = champs.find(x => x.k === g.dataset.gfGroupe), k = $$('[data-gf-item]', g).length;
          let modele = {}; try { modele = JSON.parse(g.dataset.gfModele || '{}'); } catch (err) { /* vide */ }
          $('.gf-items', g).insertAdjacentHTML('beforeend', item(c, typeof c.neuf === 'function' ? c.neuf() : modele, c.k, k));
          const dernier = $$('[data-gf-item]', g).pop(); $('input:not([type=hidden]), select, textarea', dernier)?.focus();
        }
      });
      const renumeroter = g => $$('[data-gf-item]', g).forEach((it, k) => $$('[name]', it).forEach(el => { el.name = el.name.replace(/\.\d+\./, `.${k}.`); }));
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const b = $('button[type=submit]', form), err = $('.gf-erreur', form);
        const v = lire();
        b.disabled = true; b.setAttribute('aria-busy', 'true'); err.hidden = true;
        let r;
        try { r = typeof enregistrer === 'function' ? await enregistrer(v) : true; } catch (ex) { r = (ex && ex.message) || String(ex); }
        b.disabled = false; b.removeAttribute('aria-busy');
        if (typeof r === 'string' && r) { err.textContent = r; err.hidden = false; vibrer(20); return; }
        vibrer(10);
        finir(v);
      });
      form.addEventListener('keydown', e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); abandonner(); return; }
        if (e.key === 'Tab') { const xs = $$('input:not([type=hidden]), select, textarea, button', form).filter(x => !x.disabled && x.offsetParent !== null); if (!xs.length) return; const i = xs.indexOf(document.activeElement); if (e.shiftKey && (i <= 0)) { e.preventDefault(); xs[xs.length - 1].focus(); } else if (!e.shiftKey && i === xs.length - 1) { e.preventDefault(); xs[0].focus(); } }
      });
      // le premier champ prend le focus, sauf si un doigt (ou le clavier) en a déjà choisi un : on ne le lui reprend pas
      requestAnimationFrame(() => { if (form.contains(document.activeElement)) return; ($('input:not([type=hidden]):not([type=checkbox]), select, textarea, [data-gf-seg] button[aria-pressed="true"], input[type=checkbox]', form) || $('button[type=submit]', form))?.focus({ preventScroll: true }); });
    });
  }
  function fermerFormulaire() { if (ouvertF) { const o = ouvertF; ouvertF = null; o.resolve(null); } }
  // changer de page ferme la feuille ; changée, elle reste : la page (l'administration, l'espace de l'équipe) revient à
  // son adresse et pose la question (GESTES.saisie), puis GESTES.oublier() la ferme si l'on quitte quand même
  window.addEventListener('hashchange', () => { if (!(ouvertF && ouvertF.modifie && ouvertF.modifie())) fermerFormulaire(); });

  // ===================================================================================================== ne rien perdre
  /* Une saisie commencée hors d'une fiche (une note, la fenêtre d'une opportunité, des lignes collées) : garder(el) note
     son état de départ (ses champs) ; saisie(dans) dit si un formulaire gardé (dans cette zone) ou la feuille ouverte a
     changé depuis. quitter({ titre, texte, ok, rester }) pose la question dans une boîte de la charte, une <dialog> modale
     (par-dessus une feuille, une boîte, un tiroir : la couche du haut), depuis le bas au téléphone, au centre à
     l'ordinateur : « Rester » a le focus (Échap, le voile y mènent aussi), « Quitter sans enregistrer » ; résout vrai
     pour quitter. oublier() referme la feuille et prend l'état présent des formulaires gardés comme départ. */
  const empreinteDe = el => JSON.stringify($$('input, select, textarea', el).filter(x => x.type !== 'hidden' && x.type !== 'search').map(x => x.type === 'checkbox' || x.type === 'radio' ? x.checked : x.type === 'file' ? (x.files ? x.files.length : 0) : x.value));
  function garder(el) { if (el) el.dataset.garde = empreinteDe(el); return el; }
  const gardes = dans => [...(dans.matches && dans.matches('[data-garde]') ? [dans] : []), ...$$('[data-garde]', dans)];   // (la zone elle-même comprise)
  const gardesChanges = (dans = document) => gardes(dans).filter(el => el.isConnected && empreinteDe(el) !== el.dataset.garde);
  function saisie(dans = document) { return !!(ouvertF && ouvertF.modifie && ouvertF.modifie()) || gardesChanges(dans).length > 0; }
  function oublier(dans = document) { fermerFormulaire(); gardes(dans).forEach(garder); }
  let question = null;
  function quitter({ titre = 'Quitter sans enregistrer ?', texte = 'Des modifications ne sont pas enregistrées.', ok = 'Quitter sans enregistrer', rester = 'Rester' } = {}) {
    return boite({ titre, texte, ok, rester, danger: true });
  }
  /* confirmer({ titre, texte, ok, annuler, danger }) : la même boîte avant une action qui ne se rattrape pas ; ok nomme
     l'action (« Supprimer la date »), à la couleur d'alerte (danger faux : une action qui ne détruit rien, renvoyer un
     courriel), « Annuler » a le focus ; résout vrai pour agir. */
  function confirmer({ titre, texte = '', ok, annuler = 'Annuler', danger = true } = {}) {
    return boite({ titre, texte, ok, rester: annuler, danger, genre: 'confirmer' });
  }
  function boite({ titre, texte, ok, rester, danger = true, genre = 'quitter' }) {
    if (question) return question.promesse;
    const declencheur = document.activeElement;
    const dlg = document.createElement('dialog');
    dlg.className = `gq gq-${genre}${danger ? ' gq-danger' : ''}${reduit() ? ' gq-calme' : ''}`;
    dlg.setAttribute('role', 'alertdialog');
    dlg.setAttribute('aria-labelledby', 'gq-titre');
    if (texte) dlg.setAttribute('aria-describedby', 'gq-texte');
    dlg.innerHTML = `<div class="gq-boite"><span class="gm-poignee" aria-hidden="true"></span><h2 id="gq-titre">${esc(titre)}</h2>${texte ? `<p id="gq-texte">${esc(texte)}</p>` : ''}
      <div class="gq-pied"><button type="button" class="gf-btn ${danger ? 'gq-quitter' : 'gq-agir'}" data-gq="oui">${esc(ok)}</button><button type="button" class="gf-btn principal" data-gq="non">${esc(rester)}</button></div></div>`;
    document.body.append(dlg);
    let finir;
    const promesse = new Promise(r => { finir = r; });
    // un appui qui a ouvert la boîte (le doigt sur un onglet, là où monte la boîte) ne répond pas à sa place : les clics
    // des 350 premières millisecondes ne comptent pas (le clavier, Échap, si) ; à l'heure du doigt (e.timeStamp), et la boîte
    // dit quand elle les écoute (data-pret)
    const ouverteLe = performance.now();
    setTimeout(() => { dlg.dataset.pret = ''; }, 350);
    question = { promesse };
    const repondre = oui => {
      if (!question) return;
      question = null;
      try { dlg.close(); } catch (e) { /* déjà fermée */ }
      dlg.remove();
      if (!oui && declencheur && declencheur.isConnected && typeof declencheur.focus === 'function') declencheur.focus({ preventScroll: true });
      vibrer(oui ? 12 : 6);
      finir(oui);
    };
    dlg.addEventListener('cancel', e => { e.preventDefault(); repondre(false); });            // Échap : on reste
    dlg.addEventListener('click', e => { if (e.timeStamp - ouverteLe < 350 && e.detail !== 0) return; const b = e.target.closest('[data-gq]'); if (b) repondre(b.dataset.gq === 'oui'); else if (e.target === dlg) repondre(false); });
    // Échap et Tab restent à la boîte : les boîtes de la page (qui écoutent le clavier en capture) ne les voient pas
    dlg.addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Tab') e.stopPropagation(); });
    dlg.showModal();
    $('[data-gq="non"]', dlg).focus();
    return promesse;
  }
  window.addEventListener('keydown', e => { if (question && (e.key === 'Escape' || e.key === 'Tab') && document.querySelector('dialog.gq[open]')) { e.stopImmediatePropagation(); if (e.key === 'Escape') { e.preventDefault(); $('dialog.gq [data-gq="non"]')?.click(); } } }, true);

  /* aide({ titre, intro, groupes }) : les raccourcis (ou, au doigt, les gestes) de l'espace, dans la même boîte de la
     charte (une <dialog> modale, depuis le bas au téléphone, au centre à l'ordinateur), rangés par contexte : chaque
     groupe { titre, ici, lignes: [{ t, d }] } ; t est une liste de touches possibles, chacune une combinaison
     (['Ctrl', 'K'] : des <kbd> liés par +), ou un geste en mots (g : « Appui long ») ; d dit ce que ça fait. Le groupe
     marqué ici (le contexte ouvert) vient d'abord. « Fermer » a le focus ; Échap, le voile, « Fermer » la referment et
     le focus revient à ce qui l'a ouverte (ou à rendre). Ouverte, une seconde demande la referme. */
  let aideOuverte = null;
  const fleche = t => t.length === 1 && /^[←→↑↓]$/.test(t[0]);     // (des flèches seules se suivent sans « ou »)
  const toucheHtml = t => t.map(x => `<kbd>${esc(x)}</kbd>`).join('<span class="gq-plus" aria-hidden="true">+</span>');
  function aide({ titre = 'Raccourcis', intro = '', groupes = [], rendre = null } = {}) {
    if (aideOuverte) { aideOuverte(); return; }
    if (question) return;
    const declencheur = rendre || document.activeElement;     // (rendre : où revenir quand ce qui l'a ouverte s'en va, une feuille)
    const dlg = document.createElement('dialog');
    dlg.className = `gq gq-aide${reduit() ? ' gq-calme' : ''}`;
    dlg.setAttribute('aria-labelledby', 'gq-aide-titre');
    dlg.setAttribute('aria-modal', 'true');        // (les gestes qui mènent ailleurs dorment : modaleOuverte)
    const ordre = [...groupes.filter(g => g && g.ici), ...groupes.filter(g => g && !g.ici)].filter(g => g.lignes && g.lignes.some(Boolean));
    const ligne = l => `<div class="gq-aide-l"><dt>${l.g ? `<span class="gq-geste">${esc(l.g)}</span>` : l.t.map((x, i) => (i ? (fleche(x) && fleche(l.t[i - 1]) ? ' ' : '<span class="gq-ou"> ou </span>') : '') + toucheHtml(x)).join('')}</dt><dd>${esc(l.d)}</dd></div>`;
    dlg.innerHTML = `<div class="gq-boite"><span class="gm-poignee" aria-hidden="true"></span><h2 id="gq-aide-titre">${esc(titre)}</h2>${intro ? `<p>${esc(intro)}</p>` : ''}
      <div class="gq-aide-corps">${ordre.map((g, i) => `<section aria-labelledby="gq-aide-g${i}"><h3 id="gq-aide-g${i}">${esc(g.titre)}${g.ici ? ' <span class="gq-ici">ici</span>' : ''}</h3><dl>${g.lignes.filter(Boolean).map(ligne).join('')}</dl></section>`).join('')}</div>
      <div class="gq-pied"><button type="button" class="gf-btn principal" data-gq-fermer>Fermer</button></div></div>`;
    document.body.append(dlg);
    const ouverteLe = performance.now();
    setTimeout(() => { dlg.dataset.pret = ''; }, 350);     // (comme la question : les clics des 350 premières ms ne comptent pas)
    const fermer = () => {
      if (aideOuverte !== fermer) return;
      aideOuverte = null;
      try { dlg.close(); } catch (e) { /* déjà fermée */ }
      dlg.remove();
      if (declencheur && declencheur.isConnected && typeof declencheur.focus === 'function') declencheur.focus({ preventScroll: true });
    };
    aideOuverte = fermer;
    dlg.addEventListener('cancel', e => { e.preventDefault(); fermer(); });
    dlg.addEventListener('close', fermer);
    dlg.addEventListener('click', e => { if (e.timeStamp - ouverteLe < 350 && e.detail !== 0) return; if (e.target === dlg || e.target.closest('[data-gq-fermer]')) fermer(); });
    // Échap reste à la boîte (le tiroir, la sélection, les filtres du tableau ne le voient pas) ; « ? » la referme aussi
    dlg.addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Tab') e.stopPropagation(); if (e.key === '?') { e.preventDefault(); e.stopPropagation(); fermer(); } });
    dlg.showModal();
    $('[data-gq-fermer]', dlg).focus();
    return fermer;
  }
  // la touche « ? » hors d'un champ, sans Ctrl ni Alt, quand rien de modal n'est ouvert (ni menu, ni feuille, ni boîte)
  const toucheAide = e => e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.defaultPrevented && !dansChamp(e.target) && !ouvert && !ouvertF && !question && !aideOuverte
    && !document.querySelector('dialog[open], [aria-modal="true"]');

  // ===================================================================================================== styles
  document.head.insertAdjacentHTML('beforeend', `<style id="styles-gestes">
/* la question avant de perdre une saisie (GESTES.quitter) : une <dialog> modale, depuis le bas au téléphone, au centre à l'ordinateur */
dialog.gq { box-sizing: border-box; width: 100%; max-width: none; max-height: calc(100dvh - 24px); margin: auto 0 0; padding: 0; border: 1px solid var(--trait, var(--filet, #ddd)); border-bottom: 0; border-radius: 20px 20px 0 0; background: var(--carte, var(--surface, #fff)); color: var(--encre, #222); font: 15px/1.45 var(--police, var(--sans, system-ui, sans-serif)); box-shadow: 0 -12px 40px rgba(20, 10, 20, .3); }
dialog.gq::backdrop { background: rgba(23, 15, 26, .5); }
.gq-boite { padding: 6px 20px calc(14px + env(safe-area-inset-bottom, 0px)); }
.gq h2 { margin: 0 0 6px; font: 500 18px/1.3 var(--titres, var(--serif, inherit)); }
.gq p { margin: 0 0 16px; color: var(--gris, #777); }
.gq-pied { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.gq-pied .gf-btn { flex: 1 1 auto; }
.gq .gf-btn.gq-quitter { color: var(--alerte, #b3261e); border-color: color-mix(in srgb, var(--alerte, #b3261e) 55%, transparent); }
.gq .gf-btn.gq-quitter:hover { background: var(--alerte-doux, #fbe7e5); border-color: var(--alerte, #b3261e); }
.gq h2 + .gq-pied { margin-top: 16px; }
.gq .gf-btn.principal { background: var(--accent, var(--action, var(--magenta, #5f565a))); border-color: var(--accent, var(--action, var(--magenta, #5f565a))); color: var(--sur-accent, var(--sur-action, #fff)); }
.gq .gf-btn:focus-visible { outline: 3px solid var(--accent, var(--magenta, #5f565a)); outline-offset: 2px; }
@media (min-width: 641px) { dialog.gq { width: min(460px, calc(100vw - 32px)); margin: auto; border-radius: 18px; border-bottom: 1px solid var(--trait, var(--filet, #ddd)); } .gq-boite { padding: 20px 22px 18px; } .gq .gm-poignee { display: none; } .gq-pied .gf-btn { flex: 0 0 auto; } }
@media (prefers-reduced-motion: no-preference) { dialog.gq:not(.gq-calme)[open] { animation: gm-monte .22s cubic-bezier(.2, .8, .2, 1); } dialog.gq:not(.gq-calme)[open]::backdrop { animation: gm-paraitre .2s ease-out; } }
/* l'aide (GESTES.aide) : la même boîte, plus large, ses groupes qui défilent entre le titre et « Fermer » */
dialog.gq-aide[open] { display: flex; flex-direction: column; overflow: hidden; }
dialog.gq-aide .gq-boite { display: flex; flex-direction: column; min-height: 0; }
.gq-aide-corps { flex: 1 1 auto; min-height: 0; overflow: auto; overscroll-behavior: contain; margin: 0 -20px; padding: 0 20px 4px; }
.gq-aide h3 { display: flex; align-items: center; gap: 8px; margin: 14px 0 4px; font: 700 11.5px/1.3 var(--etiq, Raleway, 'Open Sans', system-ui, sans-serif); letter-spacing: .12em; text-transform: uppercase; color: var(--gris, #777); }
.gq-aide section:first-child h3 { margin-top: 4px; }
/* (la boîte est hors de l'application de l'équipe, qui pose --accent-doux sur .appli : la teinte de la saison, --magenta-doux, prend le relais ; sans elle la pastille « ici » restait claire sur un texte clair) */
.gq-ici { padding: 1px 7px; border-radius: 999px; background: var(--accent-doux, var(--magenta-doux, var(--doux, #eee))); color: var(--encre, #222); letter-spacing: .06em; }
.gq-aide dl { margin: 0; }
.gq-aide-l { display: grid; grid-template-columns: minmax(118px, 38%) 1fr; gap: 4px 14px; align-items: baseline; padding: 7px 0; border-top: 1px solid var(--trait, var(--filet, #ddd)); }
.gq-aide-l:first-child { border-top: 0; }
.gq-aide dt { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; margin: 0; color: var(--gris, #777); font-size: 13px; }
.gq-aide dd { margin: 0; font-size: 14.5px; }
.gq-aide kbd { display: inline-block; min-width: 22px; padding: 3px 6px 2px; border: 1px solid var(--trait, var(--filet, #ddd)); border-bottom-width: 2px; border-radius: 6px; background: var(--doux, var(--surface-2, #f5f5f5)); color: var(--encre, #222); font: 650 12px/1.2 var(--police, var(--sans, system-ui, sans-serif)); text-align: center; white-space: nowrap; }
.gq-plus { color: var(--gris, #777); font-size: 12px; }
.gq-ou { color: var(--gris, #777); font-size: 12px; padding: 0 2px; }
.gq-geste { font-weight: 700; color: var(--encre, #222); }
.gq-aide .gq-pied { padding-top: 12px; border-top: 1px solid var(--trait, var(--filet, #ddd)); margin-top: 6px; }
@media (max-width: 420px) { .gq-aide-l { grid-template-columns: 1fr; gap: 2px; } }
@media (min-width: 641px) { dialog.gq-aide { width: min(640px, calc(100vw - 32px)); max-height: calc(100vh - 48px); } .gq-aide-corps { margin: 0 -22px; padding: 0 22px 4px; } }
/* le formulaire (GESTES.formulaire) : une feuille depuis le bas au téléphone, au centre à l'ordinateur */
html.gf-ouvert { overflow: hidden; }
.gf { position: fixed; inset: 0; z-index: 92; font: 15px/1.4 var(--police, var(--sans, system-ui, sans-serif)); color: var(--encre, #222); }
.gf-voile { position: absolute; inset: 0; background: rgba(23, 15, 26, .45); }
.gf-boite { position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; max-height: calc(100dvh - 24px); margin: 0; padding: 0; border: 1px solid var(--trait, var(--filet, #ddd)); border-bottom: 0; border-radius: 20px 20px 0 0; background: var(--carte, var(--surface, #fff)); box-shadow: 0 -12px 40px rgba(20, 10, 20, .25); }
.gf-tete { padding: 6px 18px 4px; }
.gf-tete h2 { margin: 0; font-size: 17px; line-height: 1.3; }
.gf-sous { margin: 2px 0 0; color: var(--gris, #777); font-size: 13.5px; }
.gf-corps { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; display: grid; gap: 12px; padding: 10px 18px 14px; }
.gf-champ { display: grid; gap: 4px; min-width: 0; }
.gf-champ > label, .gf-lib, .gf-cases legend { font-weight: 650; font-size: 13.5px; }
.gf-aide, .gf-note { margin: 0; color: var(--gris, #777); font-size: 12.5px; }
.gf input:not([type=checkbox]):not([type=hidden]), .gf select, .gf textarea { width: 100%; min-height: 44px; padding: 8px 10px; border: 1px solid var(--trait, var(--filet, #ccc)); border-radius: 10px; background: var(--carte, var(--surface, #fff)); color: inherit; font: inherit; font-size: 16px; }
.gf textarea { min-height: 72px; resize: vertical; }
.gf input[type=file] { padding: 9px 10px; font-size: 15px; }
.gf input[type=file]::file-selector-button { margin-right: 10px; padding: 6px 12px; border: 1px solid var(--trait, var(--filet, #ccc)); border-radius: 999px; background: transparent; color: inherit; font: inherit; font-size: 14px; }
.gf input:focus, .gf select:focus, .gf textarea:focus { outline: none; border-color: var(--accent, var(--magenta, #5f565a)); box-shadow: 0 0 0 3px var(--accent-doux, var(--magenta-doux, #ece5da)); }
.gf-coche { display: flex; align-items: flex-start; gap: 10px; min-height: 40px; padding: 6px 0; font-weight: 600; cursor: pointer; }
.gf-coche input { width: 20px; height: 20px; margin-top: 1px; flex: none; accent-color: var(--accent, var(--magenta, #5f565a)); }
.gf-coche small { display: block; font-weight: 500; color: var(--gris, #777); font-size: 12.5px; }
.gf-cases { margin: 0; padding: 0; border: 0; display: grid; gap: 0; }
.gf-seg { display: flex; flex-wrap: wrap; gap: 6px; }
.gf-seg button { min-height: 40px; padding: 6px 14px; border: 1px solid var(--trait, var(--filet, #ccc)); border-radius: 999px; background: var(--carte, var(--surface, #fff)); color: var(--gris, #777); font: 600 14px/1.2 inherit; font-family: inherit; cursor: pointer; }
.gf-seg button[aria-pressed="true"] { background: var(--accent, var(--magenta, #5f565a)); border-color: var(--accent, var(--magenta, #5f565a)); color: #fff; }
.gf-rangee { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px 10px; }
.gf-rangee .gf-large { grid-column: 1 / -1; }
.gf-items { display: grid; gap: 8px; }
.gf-item { position: relative; padding: 10px 44px 10px 12px; border: 1px solid var(--trait, var(--filet, #ddd)); border-radius: 12px; background: var(--doux, var(--surface-2, #f5f5f5)); }
.gf-retirer { position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; padding: 0; border: 0; border-radius: 50%; background: none; color: var(--gris, #777); cursor: pointer; display: inline-grid; place-items: center; }
.gf-retirer:hover { background: var(--carte, var(--surface, #fff)); color: var(--alerte, #b3261e); }
.gf-ajout { display: inline-flex; align-items: center; gap: 6px; justify-self: start; min-height: 38px; padding: 6px 14px; border: 1px dashed var(--trait, var(--filet, #ccc)); border-radius: 999px; background: none; color: var(--accent, var(--magenta, #5f565a)); font: 600 14px/1.2 inherit; font-family: inherit; cursor: pointer; }
.gf-erreur { margin: 0 18px; padding: 8px 12px; border-radius: 10px; background: var(--alerte-doux, #fbe7e5); color: var(--alerte, #b3261e); font-weight: 600; font-size: 14px; }
.gf-erreur[hidden] { display: none; }
.gf-pied { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 10px 18px calc(12px + env(safe-area-inset-bottom, 0px)); border-top: 1px solid var(--trait, var(--filet, #ddd)); }
.gf-fin { display: flex; gap: 8px; margin-left: auto; }
.gf-btn { min-height: 44px; padding: 8px 18px; border: 1px solid var(--trait, var(--filet, #ccc)); border-radius: 999px; background: var(--carte, var(--surface, #fff)); color: inherit; font: 600 15px/1.2 inherit; font-family: inherit; cursor: pointer; }
.gf-btn.principal { background: var(--accent, var(--magenta, #5f565a)); border-color: var(--accent, var(--magenta, #5f565a)); color: #fff; }
.gf-btn[disabled] { opacity: .6; cursor: default; }
.gf-danger { color: var(--alerte, #b3261e); }
@media (min-width: 641px) { .gf-boite { left: 50%; right: auto; top: 50%; bottom: auto; width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 32px); transform: translate(-50%, -50%); border-radius: 18px; border-bottom: 1px solid var(--trait, var(--filet, #ddd)); } .gf-tete .gm-poignee { display: none; } .gf-tete { padding-top: 16px; } }
@media (prefers-reduced-motion: no-preference) { .gf:not(.gf-calme) .gf-voile { animation: gm-paraitre .2s ease-out; } .gf:not(.gf-calme) .gf-boite { animation: gm-monte .24s cubic-bezier(.2, .8, .2, 1); } @media (min-width: 641px) { .gf:not(.gf-calme) .gf-boite { animation-name: gf-centre; } @keyframes gf-centre { from { transform: translate(-50%, calc(-50% + 16px)); opacity: 0; } } } }
/* le menu contextuel : près du pointeur ; en feuille depuis le bas au téléphone (gm-feuille) */
.gm { position: fixed; inset: 0; z-index: 90; pointer-events: none; font: 15px/1.4 var(--police, var(--sans, system-ui, sans-serif)); }
.gm-boite { position: fixed; z-index: 2; min-width: 220px; max-width: min(360px, calc(100vw - 16px)); max-height: calc(100vh - 16px); overflow: auto; padding: 6px; border: 1px solid var(--trait, var(--filet, #ddd)); border-radius: 12px; background: var(--carte, var(--surface, #fff)); color: var(--encre, #222); box-shadow: 0 12px 40px rgba(20, 10, 20, .26); pointer-events: auto; outline: none; }
.gm-i { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border: 0; border-radius: 8px; background: none; color: inherit; font: inherit; text-align: left; text-decoration: none; cursor: pointer; }
.gm-i:focus, .gm-i:hover { outline: none; background: var(--doux, var(--surface-2, #f1f1f1)); }
.gm-i:focus-visible { box-shadow: inset 0 0 0 2px var(--accent, var(--magenta, #5f565a)); }
.gm-i.danger { color: var(--alerte, #b3261e); }
.gm-i.off { opacity: .45; cursor: default; }
.gm-ic { display: inline-grid; place-items: center; width: 18px; flex: none; color: var(--gris, #777); }
.gm-i.danger .gm-ic { color: inherit; }
.gm-l { display: grid; gap: 1px; flex: 1; min-width: 0; }
.gm-l small { color: var(--gris, #777); font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gm-i kbd { font: 650 11px/1 var(--police, var(--sans, system-ui, sans-serif)); padding: 3px 5px 2px; border: 1px solid var(--trait, var(--filet, #ddd)); border-bottom-width: 2px; border-radius: 5px; background: var(--carte, var(--surface, #fff)); color: var(--gris, #777); white-space: nowrap; }
.gm-sep { margin: 5px 6px; border: 0; border-top: 1px solid var(--trait, var(--filet, #ddd)); }
.gm-feuille .gm-voile { position: absolute; inset: 0; z-index: 1; background: rgba(23, 15, 26, .42); pointer-events: auto; }
.gm-feuille .gm-boite { left: 0; right: 0; bottom: 0; top: auto; max-width: none; max-height: min(78vh, 640px); padding: 4px 10px calc(12px + env(safe-area-inset-bottom, 0px)); border-radius: 18px 18px 0 0; border-bottom: 0; }
.gm-feuille .gm-i { min-height: 48px; padding: 10px 12px; font-size: 16px; }
.gm-feuille .gm-i kbd { display: none; }
.gm-tete { padding: 6px 6px 8px; }
.gm-poignee { display: block; width: 40px; height: 4px; margin: 0 auto 10px; border-radius: 999px; background: var(--trait, var(--filet, #ddd)); }
.gm-titre { font-weight: 700; font-size: 14px; color: var(--gris, #777); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (min-width: 641px) { .gm-feuille .gm-boite { left: 50%; right: auto; width: min(420px, calc(100vw - 32px)); transform: translateX(-50%); } }
@media (prefers-reduced-motion: no-preference) {
  .gm:not(.gm-calme) .gm-boite { animation: gm-paraitre .14s ease-out; }
  .gm-feuille:not(.gm-calme) .gm-boite { animation: gm-monte .22s cubic-bezier(.2, .8, .2, 1); }
  .gm-feuille:not(.gm-calme) .gm-voile { animation: gm-paraitre .2s ease-out; }
  @keyframes gm-paraitre { from { opacity: 0; } }
  @keyframes gm-monte { from { transform: translateY(24px); opacity: 0; } }
  @media (min-width: 641px) { .gm-feuille:not(.gm-calme) .gm-boite { animation-name: gm-monte-centre; } @keyframes gm-monte-centre { from { transform: translate(-50%, 24px); opacity: 0; } } }
}
/* précédent / suivant : deux boutons côte à côte, nommés, le nom visible quand on le demande (gps-texte) */
.gps { display: inline-flex; align-items: center; gap: 4px; flex: none; }
.gps .gps-b { display: inline-flex; align-items: center; gap: 6px; }
.gps .gps-b[disabled] { opacity: .4; cursor: default; }
.gps .gps-b svg { flex: none; }
.gps-texte { width: 100%; justify-content: space-between; gap: 8px; }
.gps-texte .gps-b { flex: 1 1 0; min-width: 0; max-width: 50%; }
.gps-texte .gps-prec { justify-content: flex-start; }
.gps-texte .gps-suiv { justify-content: flex-end; }
.gps-texte .gps-t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* nommés deux fois (quoi) : ce qu'ils ouvrent, en étiquette (« Date précédente »), au-dessus de son nom (le jour, le
   lieu) ; la touche qui fait de même se montre là où il y a une souris (donc un clavier) */
.gps-deux .gps-t { display: grid; gap: 2px; min-width: 0; text-align: left; }
.gps-deux.gps-suiv .gps-t { text-align: right; }
.gps-deux .gps-quoi { display: flex; align-items: center; gap: 6px; font-family: Raleway, 'Open Sans', system-ui, sans-serif; font-size: .7rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; opacity: .78; }
.gps-deux.gps-suiv .gps-quoi { justify-content: flex-end; }
.gps-deux .gps-l { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gps-touche { display: none; padding: 0 5px; border: 1px solid currentColor; border-radius: 4px; font: inherit; font-size: .68rem; line-height: 1.4; letter-spacing: 0; }
@media (hover: hover) and (pointer: fine) { .gps-touche { display: inline-block; } }
</style>`);

  return { menu, ouvrir, fermer, fleches, glisser, precSuiv, clavierPrecSuiv, formulaire, fermerFormulaire, garder, saisie, quitter, confirmer, aide, toucheAide, oublier, vibrer, reduit, tactile, etroit, ICO, dansChamp, modaleOuverte, ouvert: () => !!ouvert, question: () => !!question };
})();
