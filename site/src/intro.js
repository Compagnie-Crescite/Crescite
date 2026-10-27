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
     lampe   : la couleur de la lampe qui suit le pointeur derrière la pieuvre (par défaut : la première couleur du dégradé,
               sinon l'encre, à peine) ; false : pas de lampe
     classe  : une classe en plus sur .intro, pour l'habiller en CSS (.intro, .intro-logo, .intro-indice)
     apres   : appelée quand le site est révélé (le focus va ensuite au titre h1 de la page)
   INTRO.ouverte()  vrai tant que l'ouverture est affichée ; l'évènement « intro:fin » est émis sur window à la fin
   ?intro=0 dans l'adresse : pas d'ouverture (captures, tests). Changer d'adresse ferme l'ouverture sans animation.

   Le jeu (avec mouvement ; la lampe toujours, le reste avec la pieuvre vivante) : pendant l'ouverture, la pieuvre répond au
   pointeur, souris, doigt ou stylet. Elle le regarde : sa tête se tourne vers lui, ses tentacules s'y penchent. Il s'arrête
   de son côté, à sa portée : une de ses queues s'allonge jusqu'à lui et s'y enroule, le suit tant qu'il reste à sa portée,
   et revient d'un ressort quand il s'en va. Il fonce sur elle : elle sursaute (elle se ramasse, sa tête recule, ses tentacules
   s'écartent de lui), puis se rassure. On l'attrape et on la tire : elle s'étire vers le doigt, de plus en plus dur, ses
   tentacules à la traîne ; lâchée assez loin, ou d'un coup sec, elle part (le départ, depuis là où elle est) ; sinon elle
   revient à sa place d'un ressort. Derrière elle, une lampe suit le pointeur. Les gestes du départ ne changent pas : un clic
   ou un toucher bref (sur elle aussi), glisser vers le haut ailleurs que sur elle, la molette, le clavier. */
const INTRO = (() => {
  const L = D.logo, [TG, TETE_G, TETE_D, TD] = L.octopusPaths;
  const CIBLE = [702, 706];                         // un point plein de la tête, où le zoom s'enfonce
  const PIVOT_G = [505, 840], PIVOT_D = [1030, 840]; // là où les tentacules extérieurs rejoignent la tête
  const mouvement = () => !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const ease = { inOut: t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2, out: t => 1 - (1 - t) ** 3, in: t => t ** 3 };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  let el = null, etat = 'ferme', opts = {}, raf = 0, inertes = [], jeu = null;
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
      .intro-lampe { position: absolute; left: 0; top: 0; width: 0; height: 0; pointer-events: none; display: none; will-change: transform, opacity; mix-blend-mode: screen; }
      .intro-lampe svg { display: block; width: 100%; height: 100%; }
      .intro.part .intro-lampe { opacity: 0 !important; transition: opacity .45s ease; }
      .intro-logo { position: absolute; border: 0; background: transparent; padding: 0; margin: 0; cursor: pointer; border-radius: 28px; color: inherit; }
      .intro-logo:focus { outline: none; }
      .intro-logo:focus-visible { outline: 2px solid currentColor; outline-offset: 10px; }
      .intro-indice { position: absolute; left: 50%; bottom: max(24px, env(safe-area-inset-bottom)); width: 48px; height: 48px; margin-left: -24px;
        border: 0; background: transparent; color: inherit; opacity: .85; cursor: pointer; padding: 8px; }
      .intro-indice svg { width: 100%; height: 100%; display: block; animation: intro-rebond 1.8s ease-in-out infinite; }
      @keyframes intro-rebond { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(7px); } }
      .intro.part .intro-indice { opacity: 0; transition: opacity .2s; }
      .intro.sur-elle, .intro.sur-elle .intro-logo { cursor: grab; }
      .intro.tient, .intro.tient .intro-logo { cursor: grabbing; }
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
    vie = null;
    if (o.vivante && mouvement() && typeof PIEUVRE !== 'undefined' && PIEUVRE.pret) {
      const TS = PIEUVRE.creer();
      vie = { cv: null, ctx: null, TS, t: 0, tPrec: 0, dpr: 1, encre };
    }
    el = document.createElement('div');
    el.className = 'intro' + (o.classe ? ' ' + o.classe : '');
    el.style.color = encre;
    const degrade = o.degrade ? `<radialGradient id="intro-degrade" cx="50%" cy="46%" r="75%">${o.degrade.map(([p, c]) => `<stop offset="${p}" stop-color="${c}"/>`).join('')}</radialGradient>` : '';
    // (la lampe : un disque de lumière, plein au centre, qui s'éteint en douceur vers son bord ; un calque à part, par-dessus la
    // scène, qu'on déplace sans le repeindre ; en mode écran : il éclaire le fond, le mot reste blanc)
    const cLampe = o.lampe || (o.degrade ? o.degrade[0][1] : encre), aLampe = o.lampe || o.degrade ? 1 : .07;
    const lampe = o.lampe === false || !mouvement() ? '' : `<div class="intro-lampe" aria-hidden="true"><svg viewBox="0 0 2 2" preserveAspectRatio="none"><defs><radialGradient id="intro-lampe">${[[0, 1], [.35, .55], [.7, .16], [1, 0]].map(([p, a]) => `<stop offset="${p}" stop-color="${cLampe}" stop-opacity="${(a * aLampe).toFixed(3)}"/>`).join('')}</radialGradient></defs><circle cx="1" cy="1" r="1" fill="url(#intro-lampe)"/></svg></div>`;
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
      ${lampe}
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
    jeu = mouvement() ? jeuNeuf() : null;
    el.addEventListener('click', surClic);
    el.addEventListener('wheel', surMolette, { passive: false });
    el.addEventListener('pointerdown', surAppui);
    el.addEventListener('pointermove', surPointeur);
    el.addEventListener('pointerup', surLacher);
    el.addEventListener('pointercancel', surLacher);
    el.addEventListener('pointerleave', surSortie);
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
  // (le jeu s'y ajoute : tete, { theta, dx, dy }, la tête qui se tourne et se déplace (comme PIEUVRE.corpsVivant), les
  // tentacules emportées par leur racine ; incline, { cle: angle }, de quoi chaque tentacule se penche en plus ; decal, { x, y },
  // la pieuvre tirée hors de sa place, en px ; etire, de 0 à 1 : elle s'étire dans le sens ang (radians) et s'amincit en travers)
  const FONDU = 260;
  function peindre(now, { onde = 0, rame = 0, vers = null, serre = 0, teinte = 0, cols = null, tete = null, incline = null, decal = null, etire = 0, ang = 0 } = {}) {
    if (!vie || !geo || !geo.pose) return;
    const { cv, ctx, TS, dpr } = vie, S = geo.pose.S, ox = geo.pose.ox + (decal ? decal.x : 0), oy = geo.pose.oy + (decal ? decal.y : 0);
    const th = tete ? tete.theta : 0, hx = tete ? tete.dx : 0, hy = tete ? tete.dy : 0, bouge = !!(th || hx || hy);
    const dt = Math.min(50, vie.tPrec ? now - vie.tPrec : 16); vie.tPrec = now; vie.t += dt / 1000;
    const arr = vers && rame ? Math.atan2(-vers[1], -vers[0]) : 0;
    for (const t of TS) {
      let penche = 0;
      if (rame && vers && !t.cible) { let df = arr - t.RS[t.M - 1]; df = Math.atan2(Math.sin(df), Math.cos(df)); penche = clamp(df, -1.2, 1.2) * rame; }
      if (incline && !t.cible) penche += incline[t.cle] || 0;
      // (sa racine suit la tête, déplacée et pivotée d'autant ; la tête immobile, elle est simplement à sa place)
      const tourne = bouge ? t.suivreTete(ox, oy, S, th, hx, hy) : (t.deplacer(ox, oy, S), 0);
      t.avancer(dt, { temps: vie.t, onde, penche, tourne });
    }
    // (une tentacule partie sur place, la queue qui tâte, reste dans le logo, qui la suit : elle ne demande pas le relais)
    if (vie.tFondu == null && TS.some(t => (t.cible && !t.cible.surPlace) || (t.mouvement() > .001 && !t.attSauve))) vie.tFondu = now;
    const f = vie.tFondu == null ? 0 : clamp((now - vie.tFondu) / FONDU);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    const k = 1 - serre, cx = ox + COEUR[0] * S, cy = oy + COEUR[1] * S;
    const repere = g => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (k === 1 && etire < .002) return;
      g.translate(cx, cy); g.scale(k, k);
      if (etire >= .002) { g.rotate(ang); g.scale(1 + .2 * etire, 1 - .12 * etire); g.rotate(-ang); }
      g.translate(-cx, -cy);
    };
    // (les tentacules, chacune la sienne ; pendant le fondu, sur une toile à part, ajoutée à celle du logo qui s'efface : une
    // encre ajoutée à elle-même ne pâlit pas où les deux dessins se recouvrent)
    const corps = g => {
      repere(g);
      g.save(); g.transform(S, 0, 0, S, ox, oy); PIEUVRE.corpsVivant(g, TS, th, hx, hy, vie.encre); g.restore();
      // (les plus enfoncées d'abord : elles passent derrière les autres)
      for (const t of [...TS].sort((a, b) => a.profondeur() - b.profondeur())) { const col = cols && cols[t.cle]; PIEUVRE.dessiner(g, t, { encre: vie.encre, lisere: PIEUVRE.lisere, vers: col ? `rgb(${col.join(',')})` : null, teinte: col ? teinte : 0 }); }
      g.setTransform(1, 0, 0, 1, 0, 0);
    };
    if (f >= 1) { corps(ctx); return; }
    repere(ctx); ctx.globalAlpha = 1 - f; PIEUVRE.logo(ctx, TS, { ox, oy, s: S, theta: th, dx: hx, dy: hy }, vie.encre); ctx.globalAlpha = 1;
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
      if (vie) { poser({ s: 1 + Math.sin(t * 1.1) * .008, aG: 0, aD: 0, ondes: 0, flot: 0, vers: 0 }); const j = vivre(now); peindre(now, { ...j, onde: 1.3 + j.onde }); }
      else poser({ s: 1 + Math.sin(t * 1.1) * .008, aG: Math.sin(t * .9) * 1.6, aD: -Math.sin(t * .9 + .5) * 1.6, ondes: 5 + Math.sin(t * .7) * 2, flot: t * 22, vers: 0 });
      eclairer();
      raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
  }

  /* le jeu (voir en tête) : l'état du pointeur, et ce qu'il fait à la pieuvre, image par image */
  const RAD = Math.PI / 180;
  const jeuNeuf = () => ({
    p: null, tP: 0, v: 0, traces: [],            // le pointeur (null : absent, ou le doigt levé), sa vitesse lissée (px/ms), ses dernières places
    tPrec: 0, theta: 0, vTheta: 0, dx: 0, dy: 0, // la tête : son angle (et sa vitesse), son déplacement (unités du dessin)
    pen: {}, vPen: {},                           // la penche de chaque tentacule (et sa vitesse)
    peur: null, tPeur: -1e9,                     // le sursaut en cours, et le dernier
    tate: null, sensTate: 1, tCalme: null, tTate: -1e9,   // la queue qui tâte (et son sens), depuis quand le pointeur est calme, quand elle a lâché
    prise: null, decal: { x: 0, y: 0 }, vDecal: { x: 0, y: 0 },   // on la tient : où on l'a prise ; son décalage, sa vitesse (px/s)
    lampe: { x: 0, y: 0, a: 0, vue: false, dit: '0' }, avale: 0, y0: null, appui: null,   // (appui : le dernier appui, où, quand, de combien il a bougé)
  });
  // la pieuvre à l'écran (sans le décalage) : son cœur, sa largeur, en px
  const mesure = () => { const { S, ox, oy } = geo.pose; return { S, ox, oy, cx: ox + COEUR[0] * S, cy: oy + COEUR[1] * S, L: 1042 * S }; };
  // le point (px) est-il sur la pieuvre, telle qu'elle est (tirée compris) ? (la boîte de la pieuvre, sans le mot)
  function surElle(x, y) {
    if (!vie || !geo || !geo.pose || !jeu) return false;
    const { S, ox, oy } = geo.pose, u = (x - ox - jeu.decal.x) / S, v = (y - oy - jeu.decal.y) / S;
    return u > 220 && u < 1322 && v > 310 && v < 946;
  }
  // les tentacules qui peuvent tâter : les deux queues, dont le bout est dehors (celui des autres est au creux d'une boucle :
  // allongées, elles barreraient la pieuvre). Elle s'allonge depuis sa place (surPlace : sans glisser vers son attache sur la
  // tête), sa boucle gardée entière (racine .6), jusqu'au pointeur, et s'y enroule ; le logo d'un seul tenant la suit
  const libres = () => vie.TS.filter(t => /^queue/.test(t.cle) && !t.parent && !t.decor);
  // (sens : le côté où elle l'enroule, pris une fois, au départ : il ne bascule pas quand le pointeur passe son bout)
  const tater = (t, p, sens) => t.viser({ cle: 'tate', x: p.x, y: p.y, sens, U: 10, mobile: geo.W < 760, racine: .6, epaisseur: 2, boucle: .45, tension: .7, surPlace: true }, 650);
  function lacherTate() {
    if (!jeu || !jeu.tate) return;
    jeu.tate.viser(null, 800, true); jeu.tate = null; jeu.tTate = performance.now(); jeu.tCalme = null;
  }
  // une image : rend de quoi peindre (peindre(now, ...)) : tete, incline, decal, etire, ang, serre, et onde (en plus)
  function vivre(now) {
    const J = jeu, rien = { onde: 0 };
    if (!J || !geo || !geo.pose) return rien;
    const dt = Math.min(50, J.tPrec ? now - J.tPrec : 16), dts = dt / 1000; J.tPrec = now;
    const { cx, cy, L } = mesure(), { W, H } = geo, p = J.p;
    J.v *= Math.pow(.86, dt / 16);                                        // (sans évènement, le pointeur ralentit)
    // le sursaut : le pointeur fonce sur elle, de près ; il monte d'un coup, puis s'apaise en une seconde
    if (p && !J.prise && J.v > 1.5 && now - J.tPeur > 1100 && Math.hypot(p.x - cx - J.decal.x, p.y - cy - J.decal.y) < L * .7) {
      const d = Math.hypot(cx - p.x, cy - p.y) || 1;
      J.peur = { t0: now, ux: (cx - p.x) / d, uy: (cy - p.y) / d }; J.tPeur = now;
      lacherTate();
      if (p.genre !== 'mouse' && navigator.vibrate) { try { navigator.vibrate(10); } catch (e) { /* (refusé : rien) */ } }
    }
    let peur = 0;
    if (J.peur) { const u = (now - J.peur.t0) / 1000; if (u >= 1) J.peur = null; else peur = u < .08 ? u / .08 : Math.pow(1 - (u - .08) / .92, 2); }
    // tirée : elle suit le doigt, de plus en plus dur (un élastique) ; lâchée, elle revient d'un ressort, dépasse un peu, se pose
    const D = J.decal, V = J.vDecal;
    if (J.prise && p) {
      const R = Math.min(L * .5, 260), ddx = p.x - J.prise.x0, ddy = p.y - J.prise.y0, d = Math.hypot(ddx, ddy), k = d ? R * (1 - Math.exp(-d / R)) / d : 0;
      const nx = J.prise.d0.x + ddx * k, ny = J.prise.d0.y + ddy * k, ax = D.x, ay = D.y;
      D.x += (nx - D.x) * .4; D.y += (ny - D.y) * .4;
      V.x = (D.x - ax) / Math.max(.001, dts); V.y = (D.y - ay) / Math.max(.001, dts);
    } else if (D.x || D.y || V.x || V.y) {
      V.x += (-150 * D.x - 13 * V.x) * dts; V.y += (-150 * D.y - 13 * V.y) * dts;
      D.x += V.x * dts; D.y += V.y * dts;
      if (Math.hypot(D.x, D.y) < .2 && Math.hypot(V.x, V.y) < 4) { D.x = D.y = V.x = V.y = 0; }
    }
    const m = Math.hypot(D.x, D.y), vm = Math.hypot(V.x, V.y), etire = clamp(m / (L * .45)) * .7 + clamp(vm / 2400) * .25;
    // (le mot s'efface à mesure qu'on l'emmène loin de lui : elle ne passe pas sur lui)
    const mot = el.querySelector('[data-role="dessin"] .i-mot'), om = (1 - .75 * clamp(m / (L * .35))).toFixed(3);
    if (mot && mot.style.opacity !== (om === '1.000' ? '' : om)) mot.style.opacity = om === '1.000' ? '' : om;
    // ses tentacules à la traîne : derrière elle quand on la tire, dans le sens contraire de sa course quand elle revient
    const traine = J.prise ? clamp(m / (L * .3)) * .55 : clamp(vm / 1400) * .45, versT = J.prise ? [D.x, D.y] : [V.x, V.y];
    // le regard : la tête se tourne vers le pointeur et se déplace un peu vers lui (le sursaut la rejette en arrière) ; à peine :
    // à cette taille, une tête qui bouge plus défait le dessin (les jambes de l'arche chevauchent les boucles)
    let nx = 0, ny = 0;
    if (p && !J.prise) { nx = clamp((p.x - cx) / (W * .38), -1, 1); ny = clamp((p.y - cy) / (H * .38), -1, 1); }
    if (J.prise) { nx = clamp(D.x / (L * .4), -1, 1); ny = clamp(D.y / (L * .4), -1, 1); }      // (tirée, elle mène de la tête)
    const pe = J.peur ? peur : 0, ux = J.peur ? J.peur.ux : 0, uy = J.peur ? J.peur.uy : 0;
    const thetaV = (nx * 4 - ux * 5 * pe) * RAD, dxV = nx * 10 + ux * 22 * pe, dyV = ny * 7 + uy * 14 * pe - 8 * pe;
    J.vTheta += (40 * (thetaV - J.theta) - 5 * J.vTheta) * dts; J.theta += J.vTheta * dts;
    J.dx += (dxV - J.dx) * Math.min(1, dt / 90); J.dy += (dyV - J.dy) * Math.min(1, dt / 90);
    // la queue qui tâte : le pointeur s'arrête de son côté, hors de la pieuvre, à sa portée (loin : jusqu'à presque la largeur
    // de la pieuvre depuis son bout) ; elle s'allonge jusqu'à lui et s'y enroule, le suit tant qu'il reste à portée et calme,
    // et revient d'un ressort sinon. Elle peut le suivre vite : seul un geste brusque la fait lâcher
    const portee = L * .85, libre = p && !J.prise && !J.peur && !surElle(p.x, p.y);
    if (libre && J.v < .18) { if (J.tCalme == null) J.tCalme = now; } else if (!J.tate) J.tCalme = null;
    if (J.tate) {
      const q = J.tate.pointe();
      if (!libre || J.v > 1.4 || Math.hypot(p.x - q.x, p.y - q.y) > portee * 1.2) lacherTate();
      else tater(J.tate, p, J.sensTate);
    } else if (libre && J.tCalme != null && now - J.tCalme > 260 && now - J.tTate > 500) {
      let best = null, bd = Infinity;
      for (const t of libres()) { const q = t.pointe(), d = Math.hypot(p.x - q.x, p.y - q.y); if (d < bd) { bd = d; best = t; } }
      if (best && bd < portee && bd > 12) { J.tate = best; J.sensTate = p.x >= best.pointe().x ? 1 : -1; tater(best, p, J.sensTate); }
    }
    // la penche de chaque tentacule libre, au bout d'un ressort (elle dépasse un peu, se balance, se pose) : vers le pointeur qui
    // passe, d'autant plus qu'elle en est près ; loin de lui au sursaut ; à la traîne quand on la tire ou qu'elle revient. Les
    // queues, dehors, le plus ; les boucles du milieu, prises dans l'arche de la tête, à peine (penchées, elles la traversent)
    const arr = Math.atan2(-versT[1], -versT[0]);
    for (const t of vie.TS) {
      const w = /^queue/.test(t.cle) ? 1 : /Ext/.test(t.cle) ? .7 : .35;
      let a = 0;
      if (!t.cible) {
        if (p && !J.prise) {
          const q = t.pointe(), dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy), pres = clamp(1 - d / (L * 1.1));
          let df = Math.atan2(dy, dx) - t.RS[t.M - 1]; df = Math.atan2(Math.sin(df), Math.cos(df));
          a = clamp(df, -1.2, 1.2) * .3 * pres * w;
          if (pe) { let dg = Math.atan2(-dy, -dx) - t.RS[t.M - 1]; dg = Math.atan2(Math.sin(dg), Math.cos(dg)); a = a * (1 - pe) + clamp(dg, -1.2, 1.2) * .4 * pe * w; }
        }
        if (traine > .001) { let dr = arr - t.RS[t.M - 1]; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); a += clamp(dr, -1.2, 1.2) * traine * w; }
      }
      const a0 = J.pen[t.cle] || 0, v0 = J.vPen[t.cle] || 0, v = v0 + ((a - a0) * (pe ? 260 : 70) - v0 * (pe ? 20 : 10)) * dts;
      J.vPen[t.cle] = v; J.pen[t.cle] = a0 + v * dts;
    }
    return { tete: { theta: J.theta, dx: J.dx, dy: J.dy }, incline: J.pen, decal: m || vm ? { x: D.x, y: D.y } : null, etire, ang: Math.atan2(versT[1], versT[0]),
      serre: .1 * pe, onde: 2 * pe + clamp(vm / 1500) * 1.2 };
  }
  // la lampe : elle suit le pointeur avec un peu de retard, s'allume quand il est là, s'éteint quand il s'en va (le calque se
  // déplace et s'efface, sans jamais se repeindre ; sa taille suit l'écran)
  function eclairer() {
    const c = el && el.querySelector('.intro-lampe');
    if (!c || !jeu || !geo) return;
    const A = jeu.lampe, p = jeu.p, R = Math.round(Math.max(geo.W, geo.H) * .42);
    if (p) { if (!A.vue) { A.x = p.x; A.y = p.y; A.vue = true; } A.x += (p.x - A.x) * .14; A.y += (p.y - A.y) * .14; }
    A.a += ((p ? 1 : 0) - A.a) * (p ? .06 : .03);
    if (A.R !== R) { A.R = R; c.style.width = c.style.height = `${2 * R}px`; }
    const etat = A.a < .003 ? '0' : `translate3d(${(A.x - R).toFixed(1)}px, ${(A.y - R).toFixed(1)}px, 0)|${A.a.toFixed(3)}`;
    if (etat === A.dit) return;                       // (éteinte, ou immobile : rien à faire)
    A.dit = etat;
    // (éteinte, elle n'est plus là du tout : un calque en mode écran coûte, même transparent)
    if (etat === '0') { c.style.display = ''; return; }
    const [tr, op] = etat.split('|');
    c.style.transform = tr; c.style.opacity = op; c.style.display = 'block';
  }

  /* le départ */
  function partir(e) {
    if (e) e.preventDefault?.();
    if (etat !== 'ouvert') return;
    etat = 'part';
    cancelAnimationFrame(raf);
    el.classList.add('part');
    el.classList.remove('sur-elle', 'tient');
    // (le jeu s'arrête : la tentacule qui tâtait rentre ; la pieuvre part de là où elle est, tirée ou la tête tournée, et s'y
    // remet en route : devenir() l'emmène, son décalage et sa tête s'effaçant)
    if (jeu) { lacherTate(); jeu.prise = null; jeu.p = null; }
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
    const o0 = [...passent].map(n => (n.style.opacity === '' ? 1 : +n.style.opacity));   // (le mot, peut-être déjà pâli par le jeu)
    // (vivante, avec des cibles : dès le geste, le bout des tentacules se colore ; la pieuvre rejoint d'abord sa place, puis,
    // à partir de 630 ms (PIEUVRE.ATTENTE), toutes les tentacules qui ont une cible se déplient vers elle ensemble, en
    // PIEUVRE.DEPLOI (PIEUVRE.VAGUE : nul, comme la scène, qui prend le relais) ; la cible est relue à chaque image, le trajet
    // continue vers sa place du moment)
    const viseur = vie && opts.cibles ? now => { const cols = {}; for (const x of opts.cibles() || []) { const t = vie.TS.find(y => y.cle === x.cle); if (!t) continue; cols[x.cle] = x.col; if (now - T0 >= PIEUVRE.ATTENTE + PIEUVRE.rang(x.cle) * PIEUVRE.VAGUE) t.viser(x.cible, PIEUVRE.DEPLOI); }
      // (les décoratives, au même instant : suspendues sous la tête, leur cible suit la pieuvre qui glisse)
      if (now - T0 >= PIEUVRE.ATTENTE) for (const t of vie.TS) if (t.decor) { const { S, ox, oy } = geo.pose; t.deco = PIEUVRE.decor(t, ox, oy, S, 0, 0, 0, t.deco); if (t.cible !== t.deco) t.viser(t.deco, PIEUVRE.DEPLOI); }
      return cols; } : null;
    if (vie) { vie.t0 = T0; vie.teinte = 0; }
    const j0 = jeu ? { x: jeu.decal.x, y: jeu.decal.y, theta: jeu.theta, dx: jeu.dx, dy: jeu.dy, pen: { ...jeu.pen } } : null;
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
        const r = 1 - u, jj = j0 ? { decal: { x: j0.x * r, y: j0.y * r }, tete: { theta: j0.theta * r, dx: j0.dx * r, dy: j0.dy * r },
          incline: Object.fromEntries(Object.entries(j0.pen).map(([k, a]) => [k, a * r])) } : {};
        peindre(now, { onde: 1.3 * (1 - u), rame: viseur ? 0 : .5 * bat * (Math.hypot(vx, vy) > 4 ? 1 : 0), vers: [vx, vy], serre: .05 * bat, teinte: vie.teinte, cols, ...jj });
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
    vie = null; jeu = null;
    dispatchEvent(new Event('intro:fin'));
    const h1 = document.querySelector('main h1, h1');
    if (h1 && !location.hash.replace(/^#\/?/, '')) { if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }
  function fermerVite() { if (el) { el.style.transition = 'none'; finir(); } }

  /* les gestes */
  function surMolette(e) { e.preventDefault(); if (e.deltaY > 2) partir(); }
  // (le défilement de la page, au doigt, n'a pas lieu : glisser vers le haut se lit au pointeur, plus bas)
  function surGlisser(e) { e.preventDefault(); }
  // un clic ou un toucher bref : le départ ; sauf celui qui suit un geste du jeu (on a tiré la pieuvre, ou on l'a tenue)
  function surClic(e) { if (jeu && jeu.avale && performance.now() - jeu.avale < 500) { jeu.avale = 0; e.preventDefault(); return; } partir(e); }
  function surAppui(e) {
    if (etat !== 'ouvert' || !jeu || !e.isPrimary || e.button > 0) return;
    const x = e.clientX, y = e.clientY;
    jeu.p = { x, y, genre: e.pointerType }; jeu.tP = e.timeStamp; jeu.v = 0; jeu.traces = [[e.timeStamp, x, y]]; jeu.avale = 0;
    jeu.appui = { x0: x, y0: y, t0: e.timeStamp, loin: 0 };
    if (surElle(x, y)) {
      jeu.prise = { x0: x, y0: y, t0: e.timeStamp, d0: { ...jeu.decal }, loin: 0 };
      lacherTate();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* (sans capture : le geste continue sur .intro) */ }
      el.classList.add('tient');
    } else jeu.y0 = e.pointerType === 'mouse' ? null : y;
  }
  function surPointeur(e) {
    if (etat !== 'ouvert' || !jeu || !e.isPrimary) return;
    const x = e.clientX, y = e.clientY, now = e.timeStamp;
    // (au doigt, le pointeur n'existe que posé ; une souris le promène sans appuyer)
    if (e.pointerType !== 'mouse' && !e.buttons && !jeu.prise) return;
    if (jeu.p && jeu.tP) { const dt = Math.max(4, now - jeu.tP); jeu.v = Math.max(jeu.v * .5, Math.hypot(x - jeu.p.x, y - jeu.p.y) / dt); }
    jeu.p = { x, y, genre: e.pointerType }; jeu.tP = now;
    jeu.traces.push([now, x, y]); while (jeu.traces.length > 2 && now - jeu.traces[0][0] > 90) jeu.traces.shift();
    if (jeu.appui) jeu.appui.loin = Math.max(jeu.appui.loin, Math.hypot(x - jeu.appui.x0, y - jeu.appui.y0));
    if (jeu.prise) jeu.prise.loin = Math.max(jeu.prise.loin, Math.hypot(x - jeu.prise.x0, y - jeu.prise.y0));
    else if (jeu.y0 != null && jeu.y0 - y > 24) { jeu.y0 = null; partir(); return; }
    if (e.pointerType === 'mouse') el.classList.toggle('sur-elle', !jeu.prise && surElle(x, y));
  }
  function surLacher(e) {
    if (!jeu || !e.isPrimary) return;
    const P = jeu.prise, A = jeu.appui, x = e.clientX, y = e.clientY, now = e.timeStamp;
    jeu.prise = null; jeu.appui = null; jeu.y0 = null;
    el && el.classList.remove('tient');
    if (e.pointerType !== 'mouse' || e.type === 'pointercancel') jeu.p = null;
    if (etat !== 'ouvert' || e.type === 'pointercancel') return;
    // (au doigt, ailleurs que sur elle : un doigt posé longtemps, ou qui a bougé, jouait avec elle (la queue qui tâte) : il ne
    // la fait pas partir en se levant)
    if (!P) { if (A && e.pointerType !== 'mouse' && (A.loin > 10 || now - A.t0 > 350)) jeu.avale = performance.now(); return; }
    // (un appui bref, sans bouger : un clic, qui fait partir, comme avant)
    if (P.loin < 10 && now - P.t0 < 350) return;
    jeu.avale = performance.now();
    // lâchée loin, ou d'un coup sec (sa vitesse sur les 90 dernières ms) : elle part ; sinon elle revient d'un ressort
    const a = jeu.traces[0] || [now, x, y], vit = Math.hypot(x - a[1], y - a[2]) / Math.max(16, now - a[0]);
    const { L } = mesure(), seuil = Math.min(L * .5, 180, Math.min(geo.W, geo.H) * .22);
    if (Math.hypot(x - P.x0, y - P.y0) > seuil || (vit > .7 && P.loin > 24)) partir();
  }
  function surSortie(e) { if (jeu && e.pointerType === 'mouse' && !jeu.prise) { jeu.p = null; el && el.classList.remove('sur-elle'); } }
  function surTouche(e) {
    if (['Enter', ' ', 'Spacebar', 'ArrowDown', 'PageDown', 'End'].includes(e.key)) { e.preventDefault(); partir(); }
  }

  return { ouvrir, ouverte: () => etat !== 'ferme', partir, relais: () => (vie ? { TS: vie.TS, teinte: vie.teinte || 0, t0: vie.t0 || performance.now() } : null) };
})();
