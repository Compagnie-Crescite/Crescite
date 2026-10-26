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
   Rien ne vibre ni ne s'anime si l'appareil demande moins d'animations (prefers-reduced-motion, html.still, ?anim=0). */
const GESTES = (() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduit = () => (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.classList.contains('still') || /[?&]anim=0(&|$)/.test(location.search);
  const tactile = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const etroit = () => typeof matchMedia === 'function' && matchMedia('(max-width: 640px)').matches;
  const vibrer = (ms = 8) => { try { if (navigator.vibrate && !reduit() && tactile()) navigator.vibrate(ms); } catch (e) { /* refusé : tant pis */ } };
  const dansChamp = el => !!(el && el.closest && el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], dialog.recherche'));
  const ico = d => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICO = {
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
  // l'appui long (le doigt, le stylet) : 480 ms sans bouger ; le clic qui suit l'appui est avalé
  document.addEventListener('pointerdown', e => {
    appui = null;
    if (e.pointerType === 'mouse' || !e.isPrimary || (e.button !== 0 && e.button !== -1) || ouvert) return;
    if (dansChamp(e.target)) return;
    const c = fournisseurPour(e.target);
    if (!c) return;
    const a = { x: e.clientX, y: e.clientY, c, id: e.pointerId, t: null };
    a.t = setTimeout(() => {
      if (appui !== a) return;
      appui = null;
      const actions = actionsDe(c.f, c.el, { source: 'appui', x: a.x, y: a.y });
      if (!actions.length) return;
      dernierAppui = Date.now();
      const avaler = ev => { ev.preventDefault(); ev.stopPropagation(); };
      document.addEventListener('click', avaler, { capture: true, once: true });
      setTimeout(() => document.removeEventListener('click', avaler, { capture: true }), 800);
      rendre(c.el, c.f, actions, { x: a.x, y: a.y }, 'appui');
    }, 480);
    appui = a;
  }, { passive: true, capture: true });
  const annulerAppui = () => { if (appui) { clearTimeout(appui.t); appui = null; } };
  document.addEventListener('pointermove', e => { if (appui && e.pointerId === appui.id && Math.hypot(e.clientX - appui.x, e.clientY - appui.y) > 10) annulerAppui(); }, { passive: true, capture: true });
  document.addEventListener('pointerup', annulerAppui, { passive: true, capture: true });
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
      if (e.touches.length !== 1 || dansChamp(e.target) || aIgnorer(e.target) || ouvert) return;
      const t = e.touches[0];
      if (t.clientX < bord || t.clientX > window.innerWidth - bord) return;   // le bord : le retour du navigateur, de l'application
      d = { x: t.clientX, y: t.clientY, dx: 0, dy: 0, t: Date.now() };
    }, { passive: true });
    el.addEventListener('touchmove', e => { if (!d || e.touches.length !== 1) { d = null; return; } d.dx = e.touches[0].clientX - d.x; d.dy = e.touches[0].clientY - d.y; }, { passive: true });
    el.addEventListener('touchend', e => {
      if (!d) return;
      const { dx, dy } = d, dt = Date.now() - d.t;
      d = null;
      if (dt > 800 || Math.abs(dx) < seuil || Math.abs(dx) < Math.abs(dy) * 1.6 || ouvert) return;
      const f = dx < 0 ? gauche : droite;
      if (typeof f === 'function') { vibrer(6); f(e); }
    }, { passive: true });
    el.addEventListener('touchcancel', () => { d = null; }, { passive: true });
  }

  // ===================================================================================================== précédent / suivant
  // deux boutons, nommés d'après ce qu'ils ouvrent (libelle(x)) ; chacun porte son adresse (data-href) : un clic y va.
  // axe : 'vertical' (↑ ↓, les listes de l'administration) ou 'horizontal' (← →, les pages de l'espace de l'équipe) ;
  // texte : le nom visible dans le bouton (sinon l'icône seule, le nom en infobulle)
  function precSuiv({ prec = null, suiv = null, libelle = x => String(x?.titre ?? x ?? ''), classe = 'btn petit', axe = 'vertical', texte = false, raccourcis = true, nom = 'Précédent, suivant' } = {}) {
    const vertical = axe === 'vertical';
    const b = (x, sens) => {
      const quoi = sens < 0 ? 'Précédent' : 'Suivant', l = x ? libelle(x) : '', r = raccourcis ? (vertical ? (sens < 0 ? 'Alt+↑' : 'Alt+↓') : (sens < 0 ? '←' : '→')) : '';
      const long = x ? `${quoi} : ${l}` : `${quoi} : aucun`;
      const icone = vertical ? (sens < 0 ? ICO.haut : ICO.bas) : (sens < 0 ? ICO.gauche : ICO.droite);
      return `<button type="button" class="${esc(classe)} gps-b gps-${sens < 0 ? 'prec' : 'suiv'}" data-gps="${sens}"${x && x.href ? ` data-href="${esc(x.href)}"` : ''}${x ? '' : ' disabled'} aria-label="${esc(long)}${r ? ` (${r})` : ''}" title="${esc(long)}${r ? ` (${r})` : ''}">${sens < 0 ? icone : ''}${texte ? `<span class="gps-t">${esc(x ? l : quoi)}</span>` : ''}${sens > 0 ? icone : ''}</button>`;
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
      if (ouvert || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (modif === 'alt' ? !e.altKey : e.altKey) return;
      if (modif !== 'alt' && dansChamp(e.target)) return;
      const sens = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key];
      if (!sens) return;
      // dans une liste, ← → restent aux flèches des lignes ; Alt les libère
      if (modif !== 'alt' && e.target.closest?.('a.ligne, a.tb-l, [role="grid"], [role="listbox"], .gm')) return;
      const b = $(`${portee ? `${portee} ` : ''}.gps [data-gps="${sens}"]:not([disabled])`);
      if (!b) return;
      e.preventDefault();
      b.click();
    });
  }

  // ===================================================================================================== styles
  document.head.insertAdjacentHTML('beforeend', `<style id="styles-gestes">
/* le menu contextuel : près du pointeur ; en feuille depuis le bas au téléphone (gm-feuille) */
.gm { position: fixed; inset: 0; z-index: 90; pointer-events: none; font: 15px/1.4 var(--police, var(--sans, system-ui, sans-serif)); }
.gm-boite { position: fixed; z-index: 2; min-width: 220px; max-width: min(360px, calc(100vw - 16px)); max-height: calc(100vh - 16px); overflow: auto; padding: 6px; border: 1px solid var(--trait, var(--filet, #ddd)); border-radius: 12px; background: var(--carte, var(--surface, #fff)); color: var(--encre, #222); box-shadow: 0 12px 40px rgba(20, 10, 20, .26); pointer-events: auto; outline: none; }
.gm-i { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border: 0; border-radius: 8px; background: none; color: inherit; font: inherit; text-align: left; text-decoration: none; cursor: pointer; }
.gm-i:focus, .gm-i:hover { outline: none; background: var(--doux, var(--surface-2, #f1f1f1)); }
.gm-i:focus-visible { box-shadow: inset 0 0 0 2px var(--accent, var(--magenta, #a8306f)); }
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
.gps-texte .gps-suiv { justify-content: flex-end; }
.gps-texte .gps-t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>`);

  return { menu, ouvrir, fermer, fleches, glisser, precSuiv, clavierPrecSuiv, vibrer, reduit, tactile, etroit, ICO, ouvert: () => !!ouvert };
})();
