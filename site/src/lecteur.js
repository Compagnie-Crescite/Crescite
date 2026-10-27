/* Les vidéos, lues dans le site (règle 18 du contrat), communes aux maquettes. Une affiche prise dans D (la photo du
   spectacle, jamais une image venue de Vimeo ou de YouTube), le titre de la vidéo et un bouton de lecture ; au geste
   seulement, le lecteur se charge sur place et démarre (YouTube par youtube-nocookie.com, Vimeo avec dnt=1 : rien de tiers
   n'est demandé avant le geste). Sous la vidéo, deux boutons : « plein écran » (l'API Fullscreen sur le cadre du lecteur ;
   là où elle manque, comme sur iPhone, le bouton ne paraît pas : le plein écran du lecteur lui-même suffit) et
   « assombrir » (la page s'éteint autour de la vidéo, qui reste lumineuse ; Échap, un geste hors de la vidéo ou
   « rallumer » la rallument ; le focus reste dans la vidéo tant que la page est éteinte). Une seule vidéo joue à la fois ;
   changer de page (hashchange) arrête tout et rallume. build.py l'ajoute après reserver.js. Aucune dépendance.
   Le clavier, quand le lecteur a le focus (son affiche ; chargé, son cadre, qui prend le focus au lieu de l'iframe : Tab
   mène ensuite aux commandes du fournisseur) : Espace ou K lit et met en pause, F met le cadre en plein écran (et l'en
   sort), M coupe ou rend le son, Échap rallume la page éteinte. La pause et le son passent par l'API de messages du
   lecteur (YouTube : enablejsapi ; Vimeo : play, pause, setMuted) ; ce qu'il refuse ne fait rien. Ces touches sont dites
   dans la bulle (title, D.site.libelles.raccourcisVideo) et dans aria-keyshortcuts ; ailleurs (les boutons sous la
   vidéo), Espace garde son sens.

   LECTEUR.source(url)        { fournisseur: 'youtube'|'vimeo', id, embed } : l'adresse du lecteur (lecture automatique,
                              youtube-nocookie ou dnt=1) ; null si l'adresse n'est pas une vidéo YouTube ou Vimeo
   LECTEUR.html(video, o)     le HTML d'une vidéo, '' si ce n'en est pas une : <figure class="lc" data-lecteur> ;
                              video = { url, titre } (D : show.video, ou un média de type vidéo) ;
                              o.affiche   l'adresse de l'image (D.photos[…]) ; sans elle, un fond uni
                              o.titre     false : le titre ne s'écrit pas sur l'affiche (il reste le nom du bouton)
                              o.editTitre le chemin du titre dans D (data-edit, règle 11) ; o.id ; o.classe ; o.style
   LECTEUR.lire(figure)       charge le lecteur et le démarre (dans un geste) ; arrête les autres ; le focus va au lecteur
   LECTEUR.arreter(figure)    remet l'affiche (sans figure : toutes les vidéos)
   LECTEUR.assombrir(figure, oui)   éteint (oui), rallume (false) ou bascule (sans oui) la page autour de la vidéo
   LECTEUR.pleinEcran(figure) le cadre en plein écran (et la lecture, si elle n'a pas commencé)
   LECTEUR.ouvrir(slug | video, o)  la vidéo dans une boîte (<dialog> modale) : pour un bouton « Bande-annonce » loin de toute
                              vidéo (un catalogue) ; un slug prend show.video et sa photo ; o.affiche, o.style
   LECTEUR.actif()            vrai tant qu'un lecteur est chargé : une maquette qui se refait quand D change (règle 9)
                              attend qu'il ne le soit plus (sinon la vidéo s'arrêterait)
   LECTEUR.pleinPossible()    le plein écran est-il possible ici
   LECTEUR.regler({ effet, univers })
     effet.arrivee(figure, iframe)       la vidéo qui arrive (défaut : un fondu de l'iframe à son chargement)
     effet.eteindre(voile, figure)       la page qui s'éteint (défaut : le voile paraît en 360 ms)
     effet.rallumer(voile, figure) → promesse   (défaut : le voile s'efface en 240 ms)
     univers(show) → variables CSS posées sur la boîte de LECTEUR.ouvrir(slug)
     « Moins d'animations » (prefers-reduced-motion, ?anim=0) : les effets par défaut sont instantanés.
   Déclencheurs (délégués, rien à brancher) : [data-lecteur-lire] (l'affiche), [data-lecteur-plein], [data-lecteur-nuit]
   (« assombrir » / « rallumer »), [data-lecteur-va="<id d'une figure>"] (y aller et lire), [data-lecteur-ouvrir="<slug>"]
   (la boîte), [data-lecteur-fermer]. Les libellés : D.site.libelles.lire, pleinEcran, assombrir, rallumer, fermer.
   Classes : .lc .lc-cadre .lc-lire .lc-affiche .lc-icone .lc-titre .lc-if .lc-outils .lc-b .lc-plein .lc-nuit-b ; états
   .lc-joue (en lecture), .lc-eteint (la page éteinte autour d'elle), html.lc-sombre ; le voile .lc-nuit ; la boîte
   .lc-boite (.lc-boite-in, .lc-fermer, .lc-boite--nuit). */
const LECTEUR = (() => {
  'use strict';
  const COUPE = (() => { try { return new URLSearchParams(location.search).get('anim') === '0'; } catch (e) { return false; } })();
  const reduit = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const permis = () => !COUPE && !(reduit && reduit.matches);
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ESC[c]);
  const L = () => (typeof D !== 'undefined' && D && D.site && D.site.libelles) || {};
  const html_ = document.documentElement;
  let reglages = { effet: {}, univers: null };

  /* ---------------------------------------------------------------------------------------------- les adresses */
  function source(url) {
    const u = String(url || '').trim();
    let m = u.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube(?:-nocookie)?\.com\/(?:embed\/|shorts\/|live\/|watch\?(?:[^#]*&)?v=)|youtu\.be\/)([\w-]{6,})/i);
    // (enablejsapi : le lecteur écoute les messages de la page, pour la pause et le son au clavier ; origin, quand la page en a une)
    const ori = (() => { try { return /^https?:$/.test(location.protocol) ? `&origin=${encodeURIComponent(location.origin)}` : ''; } catch (e) { return ''; } })();
    if (m) return { fournisseur: 'youtube', id: m[1], embed: `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0&playsinline=1&enablejsapi=1${ori}` };
    m = u.match(/^https?:\/\/(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)(?:\/([0-9a-f]{6,}))?/i);
    if (m) {
      let h = m[2] || null;
      try { h = h || new URL(u).searchParams.get('h'); } catch (e) { /* adresse sans paramètres */ }
      return { fournisseur: 'vimeo', id: m[1], embed: `https://player.vimeo.com/video/${m[1]}?autoplay=1&dnt=1&title=0&byline=0&portrait=0${h && /^[0-9a-f]+$/i.test(h) ? `&h=${h}` : ''}` };
    }
    return null;
  }
  const pleinPossible = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled)
    && !!(Element.prototype.requestFullscreen || Element.prototype.webkitRequestFullscreen);

  /* ---------------------------------------------------------------------------------------------- le HTML */
  const LIRE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
  const PLEIN = '<svg class="lc-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  const LUNE = '<svg class="lc-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/></svg>';
  const SOLEIL = '<svg class="lc-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>';
  const CROIX = '<svg class="lc-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const TOUCHES = 'Space K F M Escape';
  const aide = () => (L().raccourcisVideo ? ` title="${esc(L().raccourcisVideo)}"` : '');
  function html(video, o = {}) {
    const Lb = L(), src = video && source(video.url);
    if (!src) return '';
    const titre = String(video.titre || '');
    return `<figure class="lc${o.classe ? ' ' + o.classe : ''}" data-lecteur${o.id ? ` id="${esc(o.id)}"` : ''}${o.style ? ` style="${esc(o.style)}"` : ''}>`
      + `<div class="lc-cadre"><button type="button" class="lc-lire" data-lecteur-lire data-url="${esc(video.url)}" aria-label="${esc(titre ? `${Lb.lire || ''} : ${titre}` : Lb.lire || '')}" aria-keyshortcuts="${TOUCHES}"${aide()}>`
      + `${o.affiche ? `<img class="lc-affiche" src="${esc(o.affiche)}" alt="" width="1600" height="900" loading="lazy" decoding="async">` : ''}`
      + `<span class="lc-icone" aria-hidden="true">${LIRE}</span></button>`
      // le titre, écrit sur l'affiche (hors du bouton, qui le dit déjà : on peut le modifier sur place, règle 11)
      + `${o.titre !== false && titre ? `<span class="lc-titre" aria-hidden="true"${o.editTitre ? ` data-edit="${esc(o.editTitre)}"` : ''}>${esc(titre)}</span>` : ''}</div>`
      + `<div class="lc-outils">${pleinPossible() ? `<button type="button" class="lc-b lc-plein" data-lecteur-plein>${PLEIN}<span>${esc(Lb.pleinEcran)}</span></button>` : ''}`
      + `<button type="button" class="lc-b lc-nuit-b" data-lecteur-nuit>${LUNE}<span>${esc(Lb.assombrir)}</span></button></div></figure>`;
  }

  /* ---------------------------------------------------------------------------------------------- lire, arrêter */
  const figures = () => [...document.querySelectorAll('.lc[data-lecteur]')];
  function lire(fig, { focus = true } = {}) {
    if (!fig) return null;
    figures().forEach(f => { if (f !== fig && f.classList.contains('lc-joue')) arreter(f); });   // une seule à la fois
    let ifr = fig.querySelector('iframe.lc-if');
    if (ifr) { if (focus) (fig.querySelector('.lc-cadre') || ifr).focus(); return ifr; }
    const b = fig.querySelector('[data-lecteur-lire]'), src = source(b && b.getAttribute('data-url')), cadre = fig.querySelector('.lc-cadre');
    if (!src || !cadre) return null;
    ifr = document.createElement('iframe');
    ifr.className = 'lc-if';
    ifr.title = (fig.querySelector('.lc-titre') || {}).textContent || b.getAttribute('aria-label') || '';
    ifr.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media');
    ifr.setAttribute('allowfullscreen', '');
    ifr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    ifr.src = src.embed;
    cadre.appendChild(ifr);
    fig.classList.add('lc-joue');
    b.tabIndex = -1; b.setAttribute('aria-hidden', 'true');
    // (le cadre devient le lecteur au clavier : il prend le focus, porte le titre et les touches ; l'iframe suit, par Tab)
    cadre.tabIndex = 0; cadre.setAttribute('role', 'group'); cadre.setAttribute('aria-label', ifr.title); cadre.setAttribute('aria-keyshortcuts', TOUCHES);
    if (L().raccourcisVideo) cadre.title = L().raccourcisVideo;
    etats.set(fig, { joue: true, muet: false });
    ifr.addEventListener('load', () => ecouter(ifr, src), { once: true });
    (reglages.effet.arrivee || arriveeDefaut)(fig, ifr);
    if (focus) cadre.focus();
    return ifr;
  }
  function arriveeDefaut(fig, ifr) {
    if (!permis() || !ifr.animate) return;
    ifr.style.opacity = '0';
    const montrer = () => { ifr.style.opacity = ''; ifr.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' }); };
    ifr.addEventListener('load', montrer, { once: true });
    setTimeout(() => { if (ifr.style.opacity === '0') montrer(); }, 1500);
  }
  function arreter(fig) {
    (fig ? [fig] : figures()).forEach(f => {
      if (f === nuitFig) assombrir(f, false);
      const i = f.querySelector('iframe.lc-if'); if (i) i.remove();
      f.classList.remove('lc-joue');
      const b = f.querySelector('[data-lecteur-lire]'); if (b) { b.removeAttribute('tabindex'); b.removeAttribute('aria-hidden'); }
      const c = f.querySelector('.lc-cadre');
      if (c) { const dedans = c.contains(document.activeElement); ['tabindex', 'role', 'aria-label', 'aria-keyshortcuts', 'title'].forEach(a => c.removeAttribute(a)); if (dedans && b) b.focus({ preventScroll: true }); }
      etats.delete(f);
    });
  }

  /* ---------------------------------------------------------------------------------------------- le clavier */
  // l'état du lecteur (en lecture, muet), tenu par la page et recalé sur ce que le lecteur annonce
  const etats = new WeakMap();
  const ORIGINES = { youtube: 'https://www.youtube-nocookie.com', vimeo: 'https://player.vimeo.com' };
  const envoyer = (ifr, src, msg) => { try { ifr.contentWindow.postMessage(src.fournisseur === 'youtube' ? JSON.stringify(msg) : msg, ORIGINES[src.fournisseur]); } catch (e) { /* refusé : rien */ } };
  // (le lecteur chargé : on lui demande de dire ce qu'il fait)
  function ecouter(ifr, src) {
    if (src.fournisseur === 'youtube') envoyer(ifr, src, { event: 'listening', id: 'lc', channel: 'widget' });
    else ['play', 'pause', 'ended', 'volumechange'].forEach(v => envoyer(ifr, src, { method: 'addEventListener', value: v }));
  }
  addEventListener('message', ev => {
    if (ev.origin !== ORIGINES.youtube && ev.origin !== ORIGINES.vimeo) return;
    const fig = figures().find(f => { const i = f.querySelector('iframe.lc-if'); return i && i.contentWindow === ev.source; }), e = fig && etats.get(fig);
    if (!e) return;
    let d = ev.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (x) { return; } }
    if (!d || typeof d !== 'object') return;
    // (des données, rien d'autre : un état de lecture, un booléen)
    const info = d.event === 'infoDelivery' && d.info && typeof d.info === 'object' ? d.info : d.event === 'onStateChange' ? { playerState: d.info } : null;
    if (info) { if (typeof info.playerState === 'number') e.joue = info.playerState === 1 || info.playerState === 3; if (typeof info.muted === 'boolean') e.muet = info.muted; return; }
    if (d.event === 'play') e.joue = true;
    else if (d.event === 'pause' || d.event === 'ended') e.joue = false;
    else if (d.event === 'volumechange' && d.data && typeof d.data.volume === 'number') e.muet = d.data.volume === 0;
  });
  function commander(fig, quoi) {
    const ifr = fig.querySelector('iframe.lc-if'), b = fig.querySelector('[data-lecteur-lire]'), src = source(b && b.getAttribute('data-url')), e = etats.get(fig);
    if (!ifr || !src || !e) return false;
    const yt = src.fournisseur === 'youtube';
    if (quoi === 'lecture') { e.joue = !e.joue; envoyer(ifr, src, yt ? { event: 'command', func: e.joue ? 'playVideo' : 'pauseVideo', args: [] } : { method: e.joue ? 'play' : 'pause' }); }
    else { e.muet = !e.muet; envoyer(ifr, src, yt ? { event: 'command', func: e.muet ? 'mute' : 'unMute', args: [] } : { method: 'setMuted', value: e.muet }); }
    return true;
  }
  const enPlein = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
    const t = e.target, fig = t && t.closest && t.closest('[data-lecteur]');
    // (le lecteur seul, son affiche ou son cadre : les boutons sous la vidéo gardent leurs touches)
    if (!fig || !t.matches('.lc-cadre, [data-lecteur-lire]') || t.closest('[contenteditable="true"]')) return;
    const k = e.key === ' ' || e.key === 'Spacebar' ? ' ' : e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === ' ' || k === 'k') { e.preventDefault(); if (!fig.classList.contains('lc-joue')) lire(fig); else commander(fig, 'lecture'); }
    else if (k === 'f') {
      if (!pleinPossible()) return;
      e.preventDefault();
      const c = fig.querySelector('.lc-cadre');
      if (enPlein() === c) { const x = document.exitFullscreen || document.webkitExitFullscreen; try { const p = x && x.call(document); if (p && p.catch) p.catch(() => {}); } catch (z) { /* rien */ } }
      else pleinEcran(fig);
    } else if (k === 'm') { if (commander(fig, 'son')) e.preventDefault(); }
  });
  const actif = () => !!document.querySelector('.lc.lc-joue');

  /* ---------------------------------------------------------------------------------------------- plein écran */
  function pleinEcran(fig) {
    const c = fig && fig.querySelector('.lc-cadre'); if (!c) return;
    const f = c.requestFullscreen || c.webkitRequestFullscreen;
    if (!f) return;
    try { const p = f.call(c); if (p && p.catch) p.catch(() => {}); } catch (e) { /* refusé : rien */ }
    if (!fig.classList.contains('lc-joue')) lire(fig);
  }

  /* ---------------------------------------------------------------------------------------------- assombrir */
  let nuitFig = null, voile = null, raf = 0, ecoute = null;
  function voileEl() {
    if (voile && voile.isConnected) return voile;
    voile = document.createElement('div');
    voile.className = 'lc-nuit'; voile.setAttribute('aria-hidden', 'true'); voile.hidden = true;
    const geste = () => { if (nuitFig) assombrir(nuitFig, false); };
    voile.addEventListener('pointerdown', geste);
    voile.addEventListener('wheel', geste, { passive: true });
    voile.addEventListener('touchmove', geste, { passive: true });
    document.body.appendChild(voile);
    return voile;
  }
  // le voile couvre la page, sauf la vidéo et ses boutons : un trou arrondi, recalé au défilement et au redimensionnement
  function trou() {
    raf = 0;
    if (!nuitFig || !voile) return;
    const r = nuitFig.getBoundingClientRect(), W = innerWidth, H = innerHeight, p = 10, R = 10;
    const x = Math.round(r.left - p), y = Math.round(r.top - p), w = Math.round(r.width + 2 * p), h = Math.round(r.height + 2 * p);
    voile.style.clipPath = `path(evenodd, "M0 0H${W}V${H}H0Z M${x + R} ${y}H${x + w - R}A${R} ${R} 0 0 1 ${x + w} ${y + R}V${y + h - R}A${R} ${R} 0 0 1 ${x + w - R} ${y + h}H${x + R}A${R} ${R} 0 0 1 ${x} ${y + h - R}V${y + R}A${R} ${R} 0 0 1 ${x + R} ${y}Z")`;
  }
  const bientot = () => { if (!raf) raf = requestAnimationFrame(trou); };
  const focusables = f => [...f.querySelectorAll('iframe, button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')].filter(e => e.getClientRects().length && e.getAttribute('aria-hidden') !== 'true');
  function libelleNuit(fig, eteint) {
    const b = fig.querySelector('[data-lecteur-nuit]'), Lb = L(); if (!b) return;
    b.innerHTML = `${eteint ? SOLEIL : LUNE}<span>${esc(eteint ? Lb.rallumer : Lb.assombrir)}</span>`;
  }
  function assombrir(fig, oui) {
    if (!fig) return;
    if (oui === undefined) oui = !fig.classList.contains('lc-eteint');
    const boite = fig.closest('dialog');
    if (boite) { boite.classList.toggle('lc-boite--nuit', oui); fig.classList.toggle('lc-eteint', oui); libelleNuit(fig, oui); return; }   // dans la boîte : son fond
    if (oui) {
      if (nuitFig && nuitFig !== fig) assombrir(nuitFig, false);
      nuitFig = fig;
      const v = voileEl();
      trou(); v.hidden = false;
      fig.classList.add('lc-eteint'); html_.classList.add('lc-sombre'); libelleNuit(fig, true);
      ecoute = typeof AbortController === 'function' ? new AbortController() : null;
      const o = ecoute ? { signal: ecoute.signal } : {};
      addEventListener('scroll', bientot, Object.assign({ passive: true }, o));
      addEventListener('resize', bientot, Object.assign({ passive: true }, o));
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && nuitFig) { e.preventDefault(); const f = nuitFig; assombrir(f, false); const b = f.querySelector('[data-lecteur-nuit]'); if (b) b.focus(); } }, o);
      // le focus reste dans la vidéo : ce qui en sort y revient par l'autre bout (Tab après la dernière commande revient à la
      // première, Maj+Tab avant la première va à la dernière), comme dans une boîte
      document.addEventListener('focusin', e => {
        if (!nuitFig || nuitFig.contains(e.target)) return;
        const fs = focusables(nuitFig); if (!fs.length) return;
        const avant = e.target.compareDocumentPosition && (e.target.compareDocumentPosition(nuitFig) & Node.DOCUMENT_POSITION_FOLLOWING);
        (avant ? fs[fs.length - 1] : fs[0]).focus();
      }, o);
      if (permis()) (reglages.effet.eteindre || (x => x.animate && x.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, easing: 'cubic-bezier(.2, .7, .2, 1)' })))(v, fig);
    } else {
      if (nuitFig !== fig) { fig.classList.remove('lc-eteint'); libelleNuit(fig, false); return; }
      nuitFig = null;
      if (ecoute) { ecoute.abort(); ecoute = null; }
      fig.classList.remove('lc-eteint'); html_.classList.remove('lc-sombre'); libelleNuit(fig, false);
      const v = voile, fin = () => { if (!nuitFig && v) { v.hidden = true; v.style.clipPath = ''; } };
      if (v && permis()) {
        const r = (reglages.effet.rallumer || (x => x.animate ? x.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease-out' }).finished : null))(v, fig);
        if (r && r.then) r.then(fin, fin); else fin();
      } else fin();
    }
  }

  /* ---------------------------------------------------------------------------------------------- la boîte */
  let boite = null, retour = null;
  function ouvrir(x, o = {}) {
    const Lb = L(), s = typeof x === 'string' ? ((typeof D !== 'undefined' && D.shows) || []).find(y => y.slug === x) : null;
    const video = s ? s.video : x, h = html(video, { affiche: o.affiche || (s && D.photos ? D.photos[s.slug] : null), classe: 'lc--boite' });
    if (!h) return null;
    if (!boite) {
      boite = document.createElement('dialog');
      boite.className = 'lc-boite';
      boite.addEventListener('close', () => { arreter(boite.querySelector('.lc')); boite.innerHTML = ''; boite.classList.remove('lc-boite--nuit'); if (retour && retour.isConnected) retour.focus(); retour = null; });
      boite.addEventListener('click', e => { if (e.target === boite) boite.close(); });
      document.body.appendChild(boite);
    }
    retour = document.activeElement;
    const st = o.style || (s && reglages.univers ? reglages.univers(s) : '');
    boite.innerHTML = `<div class="lc-boite-in"${st ? ` style="${esc(st)}"` : ''}><button type="button" class="lc-b lc-fermer" data-lecteur-fermer>${CROIX}<span>${esc(Lb.fermer)}</span></button>${h}</div>`;
    if (typeof boite.showModal === 'function') boite.showModal(); else boite.setAttribute('open', '');
    const fig = boite.querySelector('.lc');
    lire(fig);
    return fig;
  }

  /* ---------------------------------------------------------------------------------------------- les gestes */
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-lecteur-lire], [data-lecteur-plein], [data-lecteur-nuit], [data-lecteur-va], [data-lecteur-ouvrir], [data-lecteur-fermer]');
    if (!t) return;
    const fig = t.closest('[data-lecteur]');
    if (t.hasAttribute('data-lecteur-lire')) { e.preventDefault(); lire(fig); }
    else if (t.hasAttribute('data-lecteur-plein')) pleinEcran(fig);
    else if (t.hasAttribute('data-lecteur-nuit')) assombrir(fig);
    else if (t.hasAttribute('data-lecteur-fermer')) { if (boite && boite.open) boite.close(); }
    else if (t.hasAttribute('data-lecteur-ouvrir')) { e.preventDefault(); ouvrir(t.getAttribute('data-lecteur-ouvrir')); }
    else if (t.hasAttribute('data-lecteur-va')) {
      const c = document.getElementById(t.getAttribute('data-lecteur-va')), f = c && (c.matches('[data-lecteur]') ? c : c.querySelector('[data-lecteur]'));
      if (!f) return;
      e.preventDefault();
      f.scrollIntoView({ behavior: permis() ? 'smooth' : 'auto', block: 'center' });
      lire(f);
    }
  });
  // une autre page : tout s'arrête, la page se rallume, la boîte se ferme
  addEventListener('hashchange', () => { if (nuitFig) assombrir(nuitFig, false); if (boite && boite.open) boite.close(); });

  /* ---------------------------------------------------------------------------------------------- les styles de base */
  const STYLE = `
:where(.lc) { margin: 0; }
:where(.lc-cadre) { position: relative; aspect-ratio: 16 / 9; overflow: hidden; background: #000; }
:where(.lc-cadre:fullscreen) { aspect-ratio: auto; width: 100%; height: 100%; }
:where(.lc-lire) { position: absolute; inset: 0; display: block; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; background: none; color: #fff; font: inherit; text-align: left; cursor: pointer; }
:where(.lc-affiche) { display: block; width: 100%; height: 100%; object-fit: cover; }
:where(.lc-icone) { position: absolute; left: 50%; top: 50%; display: grid; place-items: center; width: 72px; height: 72px; border-radius: 50%; background: rgba(0, 0, 0, .55); transform: translate(-50%, -50%); }
:where(.lc-icone svg) { width: 40%; height: 40%; fill: currentColor; }
:where(.lc-titre) { position: absolute; left: 16px; right: 16px; bottom: 14px; color: #fff; pointer-events: none; }
:where(.lc-joue .lc-titre) { display: none; }
:where(.ed-actif .lc-titre) { pointer-events: auto; }
:where(.lc-if) { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; border: 0; background: #000; }
:where(.lc-outils) { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
:where(.lc-b) { display: inline-flex; align-items: center; gap: 8px; font: inherit; cursor: pointer; }
:where(.lc-ico) { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; }
:where(.lc-nuit) { position: fixed; inset: 0; z-index: 70; background: rgba(4, 2, 3, .9); }
:where(.lc-boite) { width: min(1100px, 94vw); max-width: none; max-height: 94vh; margin: auto; padding: 0; border: 0; background: transparent; color: #fff; overflow: visible; }
:where(.lc-boite)::backdrop { background: rgba(8, 4, 6, .8); }
:where(.lc-boite.lc-boite--nuit)::backdrop { background: rgba(0, 0, 0, .97); }
:where(.lc-fermer) { display: flex; margin: 0 0 10px auto; }`;
  (function styles() {
    if (document.getElementById('lecteur-style') || !document.head) return;
    const s = document.createElement('style');
    s.id = 'lecteur-style';
    s.textContent = STYLE;
    document.head.insertBefore(s, document.head.firstChild);
  })();

  return { source, html, lire, arreter, assombrir, pleinEcran, pleinPossible, ouvrir, actif, permis,
           regler: o => { reglages = { effet: Object.assign({}, reglages.effet, (o && o.effet) || {}), univers: (o && 'univers' in o) ? o.univers : reglages.univers }; } };
})();
