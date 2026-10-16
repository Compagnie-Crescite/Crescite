/* L'ouverture des maquettes : le logo en grand. Au clic (ou au toucher), à la molette ou au glissé vers le bas, au
   clavier (Entrée, Espace, flèche bas, Page suivante), ses tentacules ondulent et s'écartent, il grossit à toute
   vitesse et le site apparaît à travers lui. Si le visiteur a demandé moins d'animations : un simple fondu.
   build.py l'ajoute après les données D ; chaque maquette l'habille dans son univers.

   INTRO.ouvrir({ fond, degrade, image, encre, tache, mot, sortie, classe, apres })
     à appeler une fois, au chargement ; l'ouverture ne s'affiche que si l'adresse est celle de l'accueil
     fond    : la couleur du fond (par défaut #14070f)
     degrade : un dégradé radial à la place du fond : [[0, '#3a1030'], [1, '#0d0710']] (du centre vers les bords)
     image   : une image (data URL) sous le logo, en couverture, par exemple une photo assombrie
     encre   : la couleur du logo (par défaut #fff) ; tache : true pour poser le logo sur sa tache magenta
     mot     : false pour la pieuvre seule, sans « crescite »
     sortie  : 'zoom' (par défaut : le site apparaît à travers le logo qui grossit) ou 'fondu'
     classe  : une classe en plus sur .intro, pour l'habiller en CSS (.intro, .intro-logo, .intro-indice)
     apres   : appelée quand le site est révélé (le focus va ensuite au titre h1 de la page)
   INTRO.ouverte()  vrai tant que l'ouverture est affichée ; l'évènement « intro:fin » est émis sur window à la fin
   ?intro=0 dans l'adresse : pas d'ouverture (captures, tests). Changer d'adresse ferme l'ouverture sans animation. */
const INTRO = (() => {
  const L = D.logo, [TG, TETE_G, TETE_D, TD] = L.octopusPaths;
  const CIBLE = [702, 706];                         // un point plein de la tête, où le zoom s'enfonce
  const PIVOT_G = [505, 840], PIVOT_D = [1030, 840]; // là où les tentacules extérieurs rejoignent la tête
  const mouvement = () => !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const ease = { inOut: t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2, out: t => 1 - (1 - t) ** 3, in: t => t ** 3 };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  let el = null, etat = 'ferme', opts = {}, raf = 0, inertes = [];

  function css() {
    if (document.getElementById('intro-style')) return;
    const s = document.createElement('style');
    s.id = 'intro-style';
    s.textContent = `
      html.intro-active, html.intro-active body { overflow: hidden !important; }
      .intro { position: fixed; inset: 0; z-index: 2147483000; color: #fff; cursor: pointer; touch-action: none; -webkit-tap-highlight-color: transparent; }
      .intro-scene { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
      .intro-logo { position: absolute; border: 0; background: transparent; padding: 0; margin: 0; cursor: pointer; border-radius: 28px; color: inherit; }
      .intro-logo:focus { outline: none; }
      .intro-logo:focus-visible { outline: 2px solid currentColor; outline-offset: 10px; }
      .intro-indice { position: absolute; left: 50%; bottom: max(24px, env(safe-area-inset-bottom)); width: 48px; height: 48px; margin-left: -24px;
        border: 0; background: transparent; color: inherit; opacity: .85; cursor: pointer; padding: 8px; }
      .intro-indice svg { width: 100%; height: 100%; display: block; animation: intro-rebond 1.8s ease-in-out infinite; }
      @keyframes intro-rebond { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(7px); } }
      .intro.part .intro-indice { opacity: 0; transition: opacity .2s; }
      h1[tabindex="-1"]:focus { outline: none; }
      @media (prefers-reduced-motion: reduce) { .intro-indice svg { animation: none; } }`;
    document.head.appendChild(s);
  }

  function dessin(remplissage, trou) {
    const o = opts, f = trou ? '' : ' filter="url(#intro-onde)"';
    const tache = o.tache ? `<path class="i-tache" d="${L.tachePath}" fill="${trou ? '#000' : '#BC3E80'}"/>` : '';
    if (trou && o.tache) return tache;            // posé sur sa tache, le site apparaît à travers la tache entière
    return `${tache}
      <g class="i-tg"${f}><path d="${TG}" fill="${remplissage}" fill-rule="evenodd"/></g>
      <g class="i-tete"${trou ? '' : ' filter="url(#intro-onde-tete)"'}><path d="${TETE_G}" fill="${remplissage}" fill-rule="evenodd"/><path d="${TETE_D}" fill="${remplissage}" fill-rule="evenodd"/></g>
      <g class="i-td"${f}><path d="${TD}" fill="${remplissage}" fill-rule="evenodd"/></g>
      ${o.mot === false ? '' : `<path class="i-mot" d="${L.motPath}" fill="${remplissage}"/>`}`;
  }

  // la boîte du logo, en unités du dessin
  const boite = () => opts.tache ? [63, 65, 1408, 1405] : opts.mot === false ? [250, 340, 1042, 576] : [250, 340, 1042, 780];

  function ouvrir(o = {}) {
    if (el || etat !== 'ferme') return;
    const route = location.hash.replace(/^#\/?/, '').split('?')[0];
    if (route || new URLSearchParams(location.search).get('intro') === '0') return;
    opts = o;
    css();
    const encre = o.encre || '#fff', fond = o.fond || '#14070f';
    el = document.createElement('div');
    el.className = 'intro' + (o.classe ? ' ' + o.classe : '');
    el.style.color = encre;
    const degrade = o.degrade ? `<radialGradient id="intro-degrade" cx="50%" cy="46%" r="75%">${o.degrade.map(([p, c]) => `<stop offset="${p}" stop-color="${c}"/>`).join('')}</radialGradient>` : '';
    el.innerHTML = `<svg class="intro-scene" aria-hidden="true" focusable="false">
        <defs>${degrade}
          <filter id="intro-onde" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.0085 0.012" numOctaves="2" seed="11" result="bruit"/>
            <feOffset in="bruit" dx="0" dy="0" result="flot"/>
            <feDisplacementMap in="SourceGraphic" in2="flot" scale="0" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
          <filter id="intro-onde-tete" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="1" seed="4" result="bruit"/>
            <feOffset in="bruit" dx="0" dy="0" result="flot"/>
            <feDisplacementMap in="SourceGraphic" in2="flot" scale="0" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
          <mask id="intro-trou" maskUnits="userSpaceOnUse" x="-100" y="-100" width="100000" height="100000">
            <rect x="-100" y="-100" width="100000" height="100000" fill="#fff"/>
            <g class="intro-monde" data-role="trou" visibility="hidden">${dessin('#000', true)}</g>
          </mask>
        </defs>
        <g mask="url(#intro-trou)">
          <rect class="intro-fond" x="-100" y="-100" width="100000" height="100000" fill="${o.degrade ? 'url(#intro-degrade)' : fond}"/>
          ${o.image ? `<image class="intro-image" href="${o.image}" x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"/>` : ''}
        </g>
        <circle class="intro-choc" cx="50%" cy="50%" r="0" fill="none" stroke="currentColor" stroke-width="0" style="opacity:0"/>
        <g class="intro-monde" data-role="dessin">${dessin('currentColor', false)}</g>
      </svg>
      <button class="intro-logo" type="button" aria-label="${(D.site && D.site.nom) || 'Crescite'}"></button>
      <button class="intro-indice" type="button" tabindex="-1" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l7 7 7-7"/></svg></button>`;
    document.body.appendChild(el);
    document.documentElement.classList.add('intro-active');
    inertes = [...document.body.children].filter(n => n !== el && !n.inert && n.tagName !== 'SCRIPT');
    inertes.forEach(n => { n.inert = true; });
    etat = 'ouvert';
    placer(0);
    addEventListener('resize', surRedim);
    el.addEventListener('click', partir);
    el.addEventListener('wheel', surMolette, { passive: false });
    el.addEventListener('touchstart', surToucher, { passive: true });
    el.addEventListener('touchmove', surGlisser, { passive: false });
    addEventListener('keydown', surTouche);
    addEventListener('hashchange', fermerVite);
    if (mouvement()) repos(performance.now());
  }

  /* la mise en place : échelle de départ, position, et pour l'animation la pose de chaque partie */
  let geo = null;
  function surRedim() { if (etat === 'ouvert') placer(0); }
  function placer() {
    const W = innerWidth, H = innerHeight, [bx, by, bw, bh] = boite();
    const s0 = Math.min(W * (W < 700 ? .84 : .62) / bw, H * (opts.tache ? .7 : .56) / bh);
    const cx = W / 2, cy = H / 2 - (W < 700 ? H * .03 : 0);
    geo = { W, H, s0, cx, cy, bx, by, bw, bh };
    poser({ s: 1, aG: 0, aD: 0, ondes: 0, flot: 0, vers: 0 });
    const b = el.querySelector('.intro-logo');
    Object.assign(b.style, { left: `${cx - bw * s0 / 2}px`, top: `${cy - bh * s0 / 2}px`, width: `${bw * s0}px`, height: `${bh * s0}px` });
  }
  // s : échelle en plus de s0 ; aG, aD : rotation des tentacules (degrés) ; ondes : ampleur des ondulations ;
  // flot : défilement des ondes ; vers : 0 → 1, la cible du zoom glisse vers le centre de l'écran
  function poser({ s, aG, aD, ondes, flot, vers, rot = 0 }) {
    const { s0, cx, cy, bx, by, bw, bh, W, H } = geo, S = s0 * s;
    const centre = [bx + bw / 2, by + bh / 2];
    const cible = opts.tache ? centre : CIBLE;
    // position écran de la cible : celle du logo centré, puis glisse vers le centre de l'écran
    const ex0 = cx + (cible[0] - centre[0]) * s0, ey0 = cy + (cible[1] - centre[1]) * s0;
    const ex = ex0 + (W / 2 - ex0) * vers, ey = ey0 + (H / 2 - ey0) * vers;
    const t = `translate(${ex.toFixed(2)} ${ey.toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${S.toFixed(5)}) translate(${-cible[0]} ${-cible[1]})`;
    el.querySelectorAll('.intro-monde').forEach(g => {
      g.setAttribute('transform', t);
      g.querySelector('.i-tg')?.setAttribute('transform', `rotate(${aG.toFixed(2)} ${PIVOT_G[0]} ${PIVOT_G[1]})`);
      g.querySelector('.i-td')?.setAttribute('transform', `rotate(${aD.toFixed(2)} ${PIVOT_D[0]} ${PIVOT_D[1]})`);
    });
    const d1 = el.querySelector('#intro-onde feDisplacementMap'), o1 = el.querySelector('#intro-onde feOffset');
    const d2 = el.querySelector('#intro-onde-tete feDisplacementMap'), o2 = el.querySelector('#intro-onde-tete feOffset');
    d1.setAttribute('scale', ondes.toFixed(2)); d2.setAttribute('scale', (ondes * .35).toFixed(2));
    o1.setAttribute('dx', (flot * 1.3).toFixed(1)); o1.setAttribute('dy', (-flot).toFixed(1));
    o2.setAttribute('dx', (-flot * .6).toFixed(1)); o2.setAttribute('dy', (flot * .4).toFixed(1));
  }

  // au repos : les tentacules respirent, les ondes passent lentement
  function repos(t0) {
    const pas = now => {
      if (etat !== 'ouvert') return;
      const t = (now - t0) / 1000;
      poser({ s: 1 + Math.sin(t * 1.1) * .008, aG: Math.sin(t * .9) * 1.6, aD: -Math.sin(t * .9 + .5) * 1.6, ondes: 5 + Math.sin(t * .7) * 2, flot: t * 22, vers: 0 });
      raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
  }

  /* le départ */
  function partir(e) {
    if (e) e.preventDefault?.();
    if (etat !== 'ouvert') return;
    etat = 'part';
    cancelAnimationFrame(raf);
    el.classList.add('part');
    if (!mouvement() || opts.sortie === 'fondu') return fondu(mouvement() ? 520 : 320);
    const T0 = performance.now(), TC = 520, TZ = 1250, trou = el.querySelector('[data-role="trou"]'), dessinG = el.querySelector('[data-role="dessin"]');
    const flot0 = 0;
    const pas = now => {
      const t = now - T0;
      if (t < TC) {                                        // la contraction : il se ramasse, les ondes montent
        const u = ease.inOut(t / TC);
        poser({ s: 1 - .08 * u, aG: 8 * u, aD: -8 * u, ondes: 6 + 30 * u, flot: flot0 + t * .12, vers: 0 });
      } else {                                             // l'élan : les tentacules s'ouvrent, il fonce vers nous
        const v = clamp((t - TC) / TZ), u = ease.inOut(v);
        trou.setAttribute('visibility', 'visible');
        const S = Math.exp(Math.log(.93) + u * (Math.log(opts.tache ? 14 : 46) - Math.log(.93)));
        poser({ s: S, aG: 8 - 30 * ease.out(clamp(v * 1.6)), aD: -8 + 30 * ease.out(clamp(v * 1.6)), ondes: 36 * (1 - clamp(v * 2.4)),
          flot: flot0 + t * .12, vers: ease.inOut(clamp(v * 1.4)), rot: -7 * ease.inOut(v) });
        const c = clamp(v / .55), choc = el.querySelector('.intro-choc');           // l'onde de choc
        if (choc) { choc.setAttribute('r', (geo.bw * geo.s0 * .35 + c * Math.hypot(geo.W, geo.H)).toFixed(1)); choc.style.opacity = String(.55 * (1 - c)); choc.setAttribute('stroke-width', (2.5 * (1 - c) + .5).toFixed(2)); }
        dessinG.style.opacity = String(1 - ease.out(clamp(v * 3.2)));
        if (v > .3) dessinG.querySelectorAll('[filter]').forEach(n => n.removeAttribute('filter'));   // plus d'ondes à cette échelle
        if (v > .78) el.style.opacity = String(1 - ease.in(clamp((v - .78) / .22)));
        if (v >= 1) return finir();
      }
      raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
  }
  function fondu(ms) {
    el.style.transition = `opacity ${ms}ms ease`;
    requestAnimationFrame(() => { el.style.opacity = '0'; });
    setTimeout(finir, ms + 30);
  }
  function finir() {
    if (!el) return;
    cancelAnimationFrame(raf);
    removeEventListener('resize', surRedim);
    removeEventListener('hashchange', fermerVite);
    removeEventListener('keydown', surTouche);
    el.remove(); el = null; etat = 'ferme';
    document.documentElement.classList.remove('intro-active');
    inertes.forEach(n => { n.inert = false; }); inertes = [];
    try { opts.apres && opts.apres(); } catch (err) { console.error(err); }
    dispatchEvent(new Event('intro:fin'));
    const h1 = document.querySelector('main h1, h1');
    if (h1 && !location.hash.replace(/^#\/?/, '')) { if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }
  function fermerVite() { if (el) { el.style.transition = 'none'; finir(); } }

  /* les gestes */
  function surMolette(e) { e.preventDefault(); if (e.deltaY > 2) partir(); }
  let y0 = null;
  function surToucher(e) { y0 = e.touches[0].clientY; }
  function surGlisser(e) { e.preventDefault(); if (y0 !== null && y0 - e.touches[0].clientY > 24) { y0 = null; partir(); } }
  function surTouche(e) {
    if (['Enter', ' ', 'Spacebar', 'ArrowDown', 'PageDown', 'End'].includes(e.key)) { e.preventDefault(); partir(); }
  }

  return { ouvrir, ouverte: () => etat !== 'ferme', partir };
})();
