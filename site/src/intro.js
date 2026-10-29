/* L'ouverture des maquettes : le logo en grand. Au clic (ou au toucher), à la molette ou au glissé vers le bas, au
   clavier (Entrée, Espace, flèche bas, Page suivante), ses tentacules ondulent et s'écartent, il grossit à toute
   vitesse et le site apparaît à travers lui. Si le visiteur a demandé moins d'animations : un simple fondu.
   build.py l'ajoute après les données D ; chaque maquette l'habille dans son univers.

   INTRO.ouvrir({ fond, degrade, image, encre, tache, mot, sortie, classe, apres, vivante, cibles })
     à appeler une fois, au chargement ; l'ouverture ne s'affiche que si l'adresse est celle de l'accueil : à chaque lancement
     du site à sa racine (un rechargement aussi), jamais en y revenant depuis une autre page du site
     fond    : la couleur du fond (par défaut #14070f)
     degrade : un dégradé radial à la place du fond : [[0, '#3a1030'], [1, '#0d0710']] (du centre vers les bords)
     image   : une image (data URL) sous le logo, en couverture, par exemple une photo assombrie
     encre   : la couleur du logo (par défaut #fff) ; tache : true pour poser le logo sur sa tache (la couleur du thème,
               D.site.couleurSaison : règle 22 du contrat)
     mot     : false pour la pieuvre seule, sans « crescite »
     sortie  : 'zoom' (par défaut : le site apparaît à travers le logo qui grossit) ou 'fondu'
     devient : une fonction qui rend la place de la pieuvre de la page, { x, y, s } : l'origine du dessin (les coordonnées
               de D.logo et de D.arms) à l'écran, en px, et son échelle ; au départ, le logo ne grossit plus : il glisse et
               se pose à cette place (ses tentacules battent une fois en route, ses ondes s'apaisent, le mot s'efface, le
               fond s'éteint sur la page), et la page dessine sa pieuvre au même endroit (apres). Si elle rend null, le
               départ est celui de sortie. Absente : rien ne change.
     vivante : true pour que la pieuvre du logo soit vivante pendant l'ouverture (dans une page qui a pieuvre.js, D.pieuvre) :
               dessinée sur une toile avec ses vraies tentacules, qui ondulent depuis leurs racines, au repos comme en route
               (au départ, elles rament une fois : un coup de nage dans le sens où elle va, le corps se contracte) ; aucune
               turbulence, aucune rotation en bloc. Le mot reste en SVG. Sans `devient` (sortie 'zoom'), le dessin SVG reprend
               pour le zoom. Sans mouvement, ou sans D.pieuvre : comme avant
     cibles  : avec vivante et devient : une fonction qui rend, à chaque image du départ, ce que chaque tentacule doit
               rejoindre : [{ cle, cible, col }] (cle : la clé de la tentacule, cible : ce que PIEUVRE vise, à l'écran, col :
               [r, g, b] la couleur vers laquelle elle se teinte). Dès le geste, ces tentacules se déroulent vers leur
               cible (en PIEUVRE.DEPLOI : 1,9 s, plus que le glissement, qui dure 1,15 s), leur bout se colorant en route, pendant que le
               logo glisse à sa place ; la page reprend leur trajet où il en est (INTRO.relais())
   INTRO.relais()   pendant `apres` : { TS, teinte, t0 } les tentacules de l'ouverture (PIEUVRE), telles qu'elles sont (pose,
               trajet en cours), la teinte atteinte, et l'instant du geste : la pieuvre de la page y copie leur état et
               continue leur mouvement sans à-coup. null sans pieuvre vivante
     classe  : une classe en plus sur .intro, pour l'habiller en CSS (.intro, .intro-logo, .intro-indice)
     apres   : appelée quand le site est révélé (le focus va ensuite au titre h1 de la page)
   INTRO.ouverte()  vrai tant que l'ouverture est affichée ; l'évènement « intro:fin » est émis sur window à la fin
   ?intro=0 dans l'adresse : pas d'ouverture (captures, tests). Changer d'adresse ferme l'ouverture sans animation.

   La pieuvre ne suit pas le pointeur : elle vit d'elle-même (le jeu d'avant, qui la faisait regarder le pointeur, sursauter,
   tâter, se laisser tirer, une lampe derrière elle, coûtait des images aux appareils modestes). Les gestes du départ : un
   clic ou un toucher, glisser vers le haut, la molette, le clavier. */
const INTRO = (() => {
  const L = D.logo, [TG, TETE_G, TETE_D, TD] = L.octopusPaths;
  const CIBLE = [702, 706];                         // un point plein de la tête, où le zoom s'enfonce
  const PIVOT_G = [505, 840], PIVOT_D = [1030, 840]; // là où les tentacules extérieurs rejoignent la tête
  const mouvement = () => !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const ease = { inOut: t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2, out: t => 1 - (1 - t) ** 3, in: t => t ** 3 };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  let el = null, etat = 'ferme', opts = {}, raf = 0, inertes = [], glisse = null;   // (glisse : où le doigt s'est posé)
  const COEUR = [771, 640];                          // le cœur de la pieuvre (comme la scène et la créature)
  let vie = null;                                    // la pieuvre vivante : { cv, ctx, TS, t, tPrec, dpr }

  function css() {
    if (document.getElementById('intro-style')) return;
    const s = document.createElement('style');
    s.id = 'intro-style';
    s.textContent = `
      html.intro-active, html.intro-active body { overflow: hidden !important; }
      html.intro-active { scrollbar-gutter: stable; }   /* (la place de la barre de défilement reste prise : la page ne se décale pas d'un coup quand elle revient, à la fin) */
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
    const coul = (D.site && D.site.couleurSaison && D.site.couleurSaison.couleur) || '#141414';
    const tache = o.tache ? `<path class="i-tache" d="${L.tachePath}" fill="${trou ? '#000' : coul}"/>` : '';
    if (trou && o.tache) return tache;            // posé sur sa tache, le site apparaît à travers la tache entière
    const cache = vie && !trou ? ' visibility="hidden"' : '';
    return `${tache}
      <g class="i-pieuvre"${cache}><g class="i-tg"${f}><path d="${TG}" fill="${remplissage}" fill-rule="evenodd"/></g>
      <g class="i-tete"${trou ? '' : ' filter="url(#intro-onde-tete)"'}><path d="${TETE_G}" fill="${remplissage}" fill-rule="evenodd"/><path d="${TETE_D}" fill="${remplissage}" fill-rule="evenodd"/></g>
      <g class="i-td"${f}><path d="${TD}" fill="${remplissage}" fill-rule="evenodd"/></g></g>
      ${o.mot === false ? '' : `<path class="i-mot" d="${L.motPath}" fill="${remplissage}" fill-rule="evenodd"/>`}`;
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
    vie = null;
    if (o.vivante && mouvement() && typeof PIEUVRE !== 'undefined' && PIEUVRE.pret) {
      const TS = PIEUVRE.creer();
      vie = { cv: null, ctx: null, TS, t: 0, tPrec: 0, dpr: 1, encre };
    }
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
      ${vie ? '<canvas class="intro-toile" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></canvas>' : ''}
      <button class="intro-logo" type="button" aria-label="${(D.site && D.site.nom) || 'Crescite'}"></button>
      <button class="intro-indice" type="button" tabindex="-1" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l7 7 7-7"/></svg></button>`;
    document.body.appendChild(el);
    if (vie) { vie.cv = el.querySelector('.intro-toile'); vie.ctx = vie.cv.getContext('2d'); }
    document.documentElement.classList.add('intro-active');
    inertes = [...document.body.children].filter(n => n !== el && !n.inert && n.tagName !== 'SCRIPT');
    inertes.forEach(n => { n.inert = true; });
    etat = 'ouvert';
    placer(0);
    addEventListener('resize', surRedim);
    glisse = null;
    el.addEventListener('click', surClic);
    el.addEventListener('wheel', surMolette, { passive: false });
    el.addEventListener('pointerdown', surAppui);
    el.addEventListener('pointermove', surPointeur);
    el.addEventListener('pointerup', surLacher);
    el.addEventListener('pointercancel', surLacher);
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
    if (vie) { vie.dpr = Math.min(2, devicePixelRatio || 1); vie.cv.width = Math.round(W * vie.dpr); vie.cv.height = Math.round(H * vie.dpr); }
    poser({ s: 1, aG: 0, aD: 0, ondes: 0, flot: 0, vers: 0 });
    if (vie) { vie.TS.forEach(t => t.poser(geo.pose.ox, geo.pose.oy, geo.pose.S)); peindre(performance.now(), { onde: 0 }); }
    const b = el.querySelector('.intro-logo');
    Object.assign(b.style, { left: `${cx - bw * s0 / 2}px`, top: `${cy - bh * s0 / 2}px`, width: `${bw * s0}px`, height: `${bh * s0}px` });
  }
  // s : échelle en plus de s0 ; aG, aD : rotation des tentacules (degrés) ; ondes : ampleur des ondulations ;
  // flot : défilement des ondes ; vers : 0 → 1, la cible du zoom glisse vers le centre de l'écran ;
  // abs : { S, ex, ey }, l'échelle et la place de la cible à l'écran, données telles quelles (le logo qui devient la pieuvre)
  function poser({ s, aG, aD, ondes, flot, vers, rot = 0, abs = null }) {
    const { s0, cx, cy, bx, by, bw, bh, W, H } = geo, S = abs ? abs.S : s0 * s;
    const centre = [bx + bw / 2, by + bh / 2];
    const cible = opts.tache ? centre : CIBLE;
    // position écran de la cible : celle du logo centré, puis glisse vers le centre de l'écran
    const ex0 = cx + (cible[0] - centre[0]) * s0, ey0 = cy + (cible[1] - centre[1]) * s0;
    const ex = abs ? abs.ex : ex0 + (W / 2 - ex0) * vers, ey = abs ? abs.ey : ey0 + (H / 2 - ey0) * vers;
    geo.pose = { S, ex, ey, ox: ex - cible[0] * S, oy: ey - cible[1] * S };
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

  // la pieuvre vivante, une image : son corps (contracté de `serre` autour de son cœur, bras compris) et ses tentacules à la
  // place posée par poser(), qui ondulent depuis leurs racines (onde) et rament (rame : elles se penchent à l'opposé du sens
  // `vers` où elle va, d'autant plus vers leur pointe). Tant qu'aucune tentacule ne quitte sa place, c'est le logo même qui
  // ondule (PIEUVRE.logo : au repos exactement le dessin, croisements et bouts coupés compris, d'un seul tenant quand il
  // ondule) ; dès que l'une part vers sa cible, chacune se dessine elle-même (PIEUVRE.dessiner), le relais pris en fondu
  // enchaîné, en 260 ms, au début du déroulement (où les deux dessins se confondent encore)
  const FONDU = 260;
  function peindre(now, { onde = 0, rame = 0, vers = null, serre = 0, teinte = 0, cols = null } = {}) {
    if (!vie || !geo || !geo.pose) return;
    const { cv, ctx, TS, dpr } = vie, { S, ox, oy } = geo.pose;
    const dt = Math.min(50, vie.tPrec ? now - vie.tPrec : 16); vie.tPrec = now; vie.t += dt / 1000;
    const arr = vers && rame ? Math.atan2(-vers[1], -vers[0]) : 0;
    for (const t of TS) {
      let penche = 0;
      if (rame && vers && !t.cible) { let df = arr - t.RS[t.M - 1]; df = Math.atan2(Math.sin(df), Math.cos(df)); penche = clamp(df, -1.2, 1.2) * rame; }
      t.deplacer(ox, oy, S);
      t.avancer(dt, { temps: vie.t, onde, penche, tourne: 0 });
    }
    if (vie.tFondu == null && TS.some(t => t.cible || t.mouvement() > .001)) vie.tFondu = now;
    const f = vie.tFondu == null ? 0 : clamp((now - vie.tFondu) / FONDU);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    const k = 1 - serre, cx = ox + COEUR[0] * S, cy = oy + COEUR[1] * S;
    const repere = g => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (k !== 1) { g.translate(cx, cy); g.scale(k, k); g.translate(-cx, -cy); }
    };
    // (les tentacules, chacune la sienne ; pendant le fondu, sur une toile à part, ajoutée à celle du logo qui s'efface : une
    // encre ajoutée à elle-même ne pâlit pas où les deux dessins se recouvrent)
    const corps = g => {
      repere(g);
      g.save(); g.transform(S, 0, 0, S, ox, oy); PIEUVRE.corpsVivant(g, TS, 0, 0, 0, vie.encre); g.restore();
      // (les plus enfoncées d'abord : elles passent derrière les autres)
      for (const t of [...TS].sort((a, b) => a.profondeur() - b.profondeur())) { const col = cols && cols[t.cle]; PIEUVRE.dessiner(g, t, { encre: vie.encre, lisere: PIEUVRE.lisere, vers: col ? `rgb(${col.join(',')})` : null, teinte: col ? teinte : 0 }); }
      g.setTransform(1, 0, 0, 1, 0, 0);
    };
    if (f >= 1) { corps(ctx); return; }
    repere(ctx); ctx.globalAlpha = 1 - f; PIEUVRE.logo(ctx, TS, { ox, oy, s: S, theta: 0, dx: 0, dy: 0 }, vie.encre); ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (f > 0) {
      const a = vie.aux || (vie.aux = document.createElement('canvas'));
      if (a.width !== cv.width || a.height !== cv.height) { a.width = cv.width; a.height = cv.height; }
      const g = a.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, a.width, a.height);
      corps(g);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = f; ctx.drawImage(a, 0, 0); ctx.restore();
    }
  }
  // au repos : la pieuvre respire ; vivante, ses tentacules ondulent doucement depuis leurs racines ; sinon elles respirent en
  // bloc et des ondes passent lentement
  function repos(t0) {
    const pas = now => {
      if (etat !== 'ouvert') return;
      const t = (now - t0) / 1000;
      if (vie) { poser({ s: 1 + Math.sin(t * 1.1) * .008, aG: 0, aD: 0, ondes: 0, flot: 0, vers: 0 }); peindre(now, { onde: 1.3 }); }
      else poser({ s: 1 + Math.sin(t * 1.1) * .008, aG: Math.sin(t * .9) * 1.6, aD: -Math.sin(t * .9 + .5) * 1.6, ondes: 5 + Math.sin(t * .7) * 2, flot: t * 22, vers: 0 });
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
    glisse = null;
    if (!mouvement() || opts.sortie === 'fondu') return fondu(mouvement() ? 520 : 320);
    const place = opts.devient && opts.devient();
    if (place) return devenir(place);
    if (vie) { vie.cv.remove(); vie = null; el.querySelectorAll('[data-role="dessin"] .i-pieuvre').forEach(g => g.removeAttribute('visibility')); }
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
  // le logo devient la pieuvre de la page (opts.devient) : sans grossir, il glisse et se pose à sa place, relue à chaque
  // image (la page peut se mettre en page pendant ce temps) ; ses tentacules battent une fois en route, ses ondes
  // s'apaisent, le mot (et la tache) s'effacent, le fond s'éteint et découvre la page ; à l'arrivée il est exactement la
  // pieuvre de la page, qui prend le relais (apres)
  function devenir(place) {
    const T0 = performance.now(), TD = 1150, { s0, cx, cy, bx, by, bw, bh } = geo;
    const centre = [bx + bw / 2, by + bh / 2], cible = opts.tache ? centre : CIBLE;
    const ex0 = cx + (cible[0] - centre[0]) * s0, ey0 = cy + (cible[1] - centre[1]) * s0;
    const fondG = el.querySelector('.intro-scene > g[mask]'), passent = el.querySelectorAll('[data-role="dessin"] .i-mot, [data-role="dessin"] .i-tache');
    let c = place;
    const o0 = [...passent].map(n => (n.style.opacity === '' ? 1 : +n.style.opacity));
    // (vivante, avec des cibles : dès le geste, le bout des tentacules se colore ; la pieuvre rejoint d'abord sa place, puis,
    // à partir de 630 ms (PIEUVRE.ATTENTE), toutes les tentacules qui ont une cible se déplient vers elle ensemble, en
    // PIEUVRE.DEPLOI (PIEUVRE.VAGUE : nul, comme la scène, qui prend le relais) ; la cible est relue à chaque image, le trajet
    // continue vers sa place du moment)
    const viseur = vie && opts.cibles ? now => { const cols = {}; for (const x of opts.cibles() || []) { const t = vie.TS.find(y => y.cle === x.cle); if (!t) continue; cols[x.cle] = x.col; if (now - T0 >= PIEUVRE.ATTENTE + PIEUVRE.rang(x.cle) * PIEUVRE.VAGUE) t.viser(x.cible, PIEUVRE.DEPLOI); }
      // (les décoratives, au même instant : suspendues sous la tête, leur cible suit la pieuvre qui glisse)
      if (now - T0 >= PIEUVRE.ATTENTE) for (const t of vie.TS) if (t.decor) { const { S, ox, oy } = geo.pose; t.deco = PIEUVRE.decor(t, ox, oy, S, 0, 0, 0, t.deco); if (t.cible !== t.deco) t.viser(t.deco, PIEUVRE.DEPLOI); }
      return cols; } : null;
    if (vie) { vie.t0 = T0; vie.teinte = 0; }
    const pas = now => {
      const v = clamp((now - T0) / TD), u = ease.inOut(v), bat = Math.sin(Math.PI * clamp(v * 1.3));
      c = opts.devient() || c;
      const S = Math.exp(Math.log(s0) + u * (Math.log(c.s) - Math.log(s0)));
      const ex = ex0 + (c.x + cible[0] * c.s - ex0) * u, ey = ey0 + (c.y + cible[1] * c.s - ey0) * u;
      poser({ aG: vie ? 0 : 7 * bat, aD: vie ? 0 : -7 * bat, ondes: vie ? 0 : 5 * (1 - u), flot: (now - T0) * .05, abs: { S, ex, ey } });
      // (vivante : un coup de nage, les tentacules ramant à l'opposé du chemin, le corps contracté ; ses ondulations s'apaisent
      // pour que la pieuvre de la page la relaie telle quelle)
      if (vie) {
        const vx = c.x + cible[0] * c.s - ex0, vy = c.y + cible[1] * c.s - ey0, cols = viseur ? viseur(now) : null;
        vie.teinte = clamp((now - T0) / 700);
        // (avec des cibles, pas de coup de nage : les tentacules vont se déployer, rien ne doit les agiter avant)
        peindre(now, { onde: 1.3 * (1 - u), rame: viseur ? 0 : .5 * bat * (Math.hypot(vx, vy) > 4 ? 1 : 0), vers: [vx, vy], serre: .05 * bat, teinte: vie.teinte, cols });
      }
      passent.forEach((n, i) => { n.style.opacity = String(o0[i] * (1 - ease.out(clamp(v * 2.2)))); });
      if (fondG) fondG.style.opacity = String(1 - ease.inOut(clamp((v - .2) / .65)));
      if (v >= 1) return finir();
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
    vie = null; glisse = null;
    dispatchEvent(new Event('intro:fin'));
    const h1 = document.querySelector('main h1, h1');
    if (h1 && !location.hash.replace(/^#\/?/, '')) { if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }
  function fermerVite() { if (el) { el.style.transition = 'none'; finir(); } }

  /* les gestes */
  function surMolette(e) { e.preventDefault(); if (e.deltaY > 2) partir(); }
  // (le défilement de la page, au doigt, n'a pas lieu : glisser vers le haut se lit au pointeur, plus bas)
  function surGlisser(e) { e.preventDefault(); }
  // un clic ou un toucher : le départ ; glisser vers le haut (au doigt, au stylet) aussi
  function surClic(e) { partir(e); }
  function surAppui(e) { glisse = etat === 'ouvert' && e.isPrimary && e.pointerType !== 'mouse' ? e.clientY : null; }
  function surPointeur(e) { if (etat === 'ouvert' && e.isPrimary && glisse != null && glisse - e.clientY > 24) { glisse = null; partir(); } }
  function surLacher(e) { if (e.isPrimary) glisse = null; }
  function surTouche(e) {
    if (['Enter', ' ', 'Spacebar', 'ArrowDown', 'PageDown', 'End'].includes(e.key)) { e.preventDefault(); partir(); }
  }

  return { ouvrir, ouverte: () => etat !== 'ferme', partir, relais: () => (vie ? { TS: vie.TS, teinte: vie.teinte || 0, t0: vie.t0 || performance.now() } : null) };
})();
