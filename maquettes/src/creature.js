/* La créature : une pieuvre vivante, dessinée image par image avec ses vraies tentacules (PIEUVRE, D.pieuvre), sur une
   petite toile fixe qui la suit (juste ce qu'il faut pour elle et ce que ses tentacules atteignent : rien de plein écran).
   build.py l'ajoute après pieuvre.js aux pages qui ont la scène de la pieuvre (la 10 et la synthèse). La maquette
   l'appelle : rien ne se fait seul. Deux façons de vivre :

   CREATURE.habiter(hote, { encre })    la petite pieuvre de l'en-tête : l'hôte (l'élément data-pieuvre, qui contient le svg du
                     logo) garde son dessin, invisible, pour la mise en page (visible pour qui a demandé moins
                     d'animations) ; la créature est dessinée exactement à sa place, et prend la relève du dessin à la fin
                     de l'ouverture (intro:fin), sans que rien ne saute. Si la page réécrit l'hôte, elle suit. encre : la
                     couleur de la pieuvre (défaut : la couleur du texte de l'hôte). → la créature (voir plus bas)
   CREATURE.creer({ placer, encre, largeur, souris, courant, vie, onde, rythme, lueur })   une pieuvre à soi, placée par la maquette :
                     placer() est appelée à chaque image et rend { x, y, s, largeur, bouge, v } (le cœur de la pieuvre à
                     l'écran, en px ; s l'échelle, px par unité du dessin, ou largeur : la largeur du dessin en px ;
                     bouge : vrai tant qu'elle se déplace, v : sa vitesse verticale, px par image, pour qu'elle se penche
                     et rame dans ce sens ; coup, de 0 à 1 : l'impulsion de nage de cette image, si c'est la maquette qui
                     bat la mesure, un galop par exemple : le corps se contracte et les tentacules rament à ce rythme-là)
                     ou null (elle n'a pas lieu d'être à l'écran : elle s'efface et se repose).
                     placerChaqueImage : placer() à chaque image (une pieuvre qui se déplace) et non quatre fois par
                     seconde. souris (vrai par défaut) : elle se tourne vers la souris ; courant (vrai) : ses tentacules
                     suivent le défilement. vie (1) : son entrain, de 1 (l'en-tête, discrète) à 2 ou 3 (une grande
                     pieuvre, toujours en mouvement : ondulation ample, respiration, dérive, balancement ; à partir de
                     1,5 elle tâte autour d'elle d'une tentacule, de temps en temps) ; onde : l'ampleur de l'ondulation
                     des tentacules (2 × vie par défaut ; 5 ou 6 : elles battent franchement) ; rythme : la vitesse de tout
                     ce qui vit (1 ; 2 : deux fois plus vif) ; lueur : un halo autour d'elle. → la créature

   Sa vie, au repos, jamais pénible (lente, trente images par seconde au plus, rien quand l'onglet est caché) : ses
   tentacules ondulent, elle respire (son corps gonfle d'un rien), elle se penche vers la souris qui passe près d'elle,
   et quand la page défile ses tentacules suivent le courant. En nageant (bouge), elle se penche dans le sens où elle va
   et avance par impulsions : le corps se contracte, les tentacules rament. Ses moments, que la maquette joue à la main :
     c.vers(el | [x, y], { couleur, tenir, duree, prise, bras })   une vraie tentacule (une boucle en S, prolongée depuis sa
                     descente, comme sur l'accueil au téléphone : une courbe raide, aux grands rayons) part de la pieuvre,
                     rejoint le bas de cet élément, le souligne vers la droite et s'y enroule, à la couleur donnée ; elle y
                     reste `tenir` ms (1300 ; Infinity : jusqu'à revenir()), puis revient. prise 'titre' (défaut : elle
                     s'accroche un peu à l'intérieur du titre et le souligne jusqu'au bout) ou 'medaillon' (elle passe sous
                     un médaillon rond et s'enroule sous sa droite). bras : la tentacule ('boucleL', défaut, elle arrive par
                     la gauche ; 'boucleR'). Elle suit l'élément s'il bouge, et rentre s'il quitte l'écran. Promesse,
                     résolue au retour. Une nouvelle destination remplace la précédente.
     c.revenir()                        la tentacule rentre
     c.reagir(genre, vers)              la pieuvre se contracte et ses tentacules s'agitent un instant ('page', 'clic',
                     'ouvre', 'ferme', 'enroule', 'retour', 'nage') ; vers : un point [x, y] vers lequel elle se penche
     c.sortie()                         0 au repos, 1 quand la tentacule d'un moment est tendue
     c.cible()                          l'élément que sa tentacule vise, ou null
     c.arreter()                        tout s'arrête (l'en-tête retrouve son dessin)
   Le reste
     CREATURE.habite(el)                vrai si la créature de l'en-tête vit dans cet élément : tentacules.js lui confie alors
                     les réactions du guide (ses tentacules fines, elles, partent toujours des bras du dessin)
     CREATURE.reagir(genre, vers)       la créature de l'en-tête réagit (rien sans elle)
     CREATURE.actif                     faux avec ?anim=0 ou sans D.pieuvre : alors rien ne vit
   Moins d'animations demandé : rien ne vit ; la créature attend que le réglage change. */
const CREATURE = (() => {
  'use strict';
  const COUPE = (() => { try { return new URLSearchParams(location.search).get('anim') === '0'; } catch (e) { return false; } })();
  const mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduit = () => !!(mq && mq.matches);
  const intro = () => typeof INTRO !== 'undefined' && INTRO.ouverte && INTRO.ouverte();
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const TAU = Math.PI * 2;
  const PRET = typeof PIEUVRE !== 'undefined' && !!PIEUVRE.pret;
  const actif = PRET && !COUPE;
  const CENTRE = [771, 640];   // le cœur de la pieuvre, en unités du dessin (comme la scène de l'accueil)
  const LARGEUR = 1042;        // la largeur du dessin de la pieuvre seule (D.logo.octopus), en unités
  const HEX6 = /^#[0-9a-f]{6}$/i;
  function rgb(c) {
    c = String(c || '').trim();
    let m = /^#([0-9a-f]{3})$/i.exec(c);
    if (m) return [...m[1]].map(h => parseInt(h + h, 16));
    if (HEX6.test(c)) return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(c);
    return m ? [+m[1], +m[2], +m[3]].map(Math.round) : null;
  }
  // la secousse d'une réaction : une impulsion qui monte vite, puis une détente qui se balance en s'éteignant
  const choc = v => (v <= 0 || v >= 1 ? 0 : v < .22 ? ease(v / .22) : Math.cos(((v - .22) / .78) * Math.PI * 1.6) * Math.pow(1 - (v - .22) / .78, 1.5));
  // [durée (ms), contraction, agitation des tentacules, penche (°)]
  const GENRES = { clic: [420, .07, 1.8, 3], page: [680, .1, 2.6, 5], ouvre: [460, .05, 1.6, 2], ferme: [460, .07, 1.6, 2], enroule: [600, .06, 2, 0], retour: [480, .07, 1.8, 3], nage: [760, .05, 1.6, 0] };

  /* ---------- ce que toutes les créatures partagent : la souris, le défilement, l'onglet, le réglage ---------- */
  const toutes = new Set();
  let pointeur = null, vScroll = 0, yScroll = 0, tScroll = 0, branche = false, tailleSale = true, tDecrue = 0;
  function brancher() {
    if (branche) return;
    branche = true;
    addEventListener('resize', () => { tailleSale = true; toutes.forEach(c => c.reveil()); }, { passive: true });
    addEventListener('scroll', () => {
      const y = scrollY, now = performance.now();
      if (tScroll) vScroll = clamp((y - yScroll) / Math.max(8, now - tScroll) * 16, -60, 60);
      yScroll = y; tScroll = now;
      toutes.forEach(c => { c.placeSale = true; c.reveil(); });
    }, { passive: true });
    addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; pointeur = { x: e.clientX, y: e.clientY }; toutes.forEach(c => c.reveil()); }, { passive: true });
    document.addEventListener('pointerleave', () => { pointeur = null; }, { passive: true });
    document.addEventListener('visibilitychange', () => toutes.forEach(c => { if (document.hidden) c.pause(); else c.reveil(); }));
    if (mq && mq.addEventListener) mq.addEventListener('change', () => toutes.forEach(c => { if (reduit()) c.dormir(); else c.demarrer(); }));
  }
  // le courant du défilement s'apaise (une fois par image, quelle que soit la créature qui passe)
  function decrue(now, dt) { if (now !== tDecrue) { tDecrue = now; vScroll *= Math.pow(.86, dt / 16); } }

  /* ---------- une créature ---------- */
  class Creature {
    constructor(o = {}) {
      this.o = o;
      this.encre = o.encre || '#ffffff'; this.ENCRE = rgb(this.encre) || [255, 255, 255];
      this.souris = o.souris !== false; this.courant = o.courant !== false; this.vie = o.vie || 1; this.lueur = !!o.lueur;
      this.onde = o.onde || 2 * this.vie; this.rythme = o.rythme || 1;
      const TS = PIEUVRE.creer();
      this.CORPS = PIEUVRE.corps(TS);
      // dir : le sens de la pointe au repos (vers où la tentacule se penche) ; col : la couleur vers laquelle elle se teinte
      this.BRAS = TS.map((t, i) => ({ t, i, cle: t.cle, but: null, teinte: 0, penche: 0, col: this.ENCRE, dir: t.RS[t.M - 1], geste: null }));
      this.cv = null; this.ctx = null; this.W = 0; this.H = 0; this.dpr = 1; this.cw = 0; this.ch = 0; this.cx0 = 0; this.cy0 = 0; this.tTaille = 0;
      this.raf = 0; this.tPrec = 0; this.tVie = 0; this.tDessin = 0; this.vivant = false; this.cache = true;
      this.s = 0; this.ox = 0; this.oy = 0; this.place = null; this.placeSale = true; this.tPlace = 0; this.tache = null; this.enMouvement = false;
      this.reaction = null; this.moment = null; this.regard = 0; this.penteNage = 0; this.tCoup = -1e9; this.tGeste = 0; this.bob = { x: 0, y: 0 }; this.promesses = [];
      toutes.add(this);
      brancher();
    }
    toile() {
      if (this.cv && this.cv.isConnected) return;
      const cv = this.cv = document.createElement('canvas');
      cv.className = 'creature'; cv.setAttribute('aria-hidden', 'true');
      cv.style.cssText = 'position:fixed;left:0;top:0;display:none;z-index:2147483004;pointer-events:none;will-change:transform;';
      document.body.appendChild(cv);
      this.ctx = cv.getContext('2d');
      this.dimensionner();
    }
    dimensionner() { this.W = innerWidth; this.H = innerHeight; this.dpr = Math.min(2, devicePixelRatio || 1); this.cw = this.ch = 0; this.placeSale = true; }
    // la toile couvre la boîte b (px écran), avec de la marge ; elle ne change de taille que quand il le faut (grandir), ou
    // bien plus tard quand elle est devenue bien trop grande : jamais à chaque image
    cadrer(b, now) {
      const w = b.x1 - b.x0, h = b.y1 - b.y0, nw = Math.ceil((w + 32) / 64) * 64, nh = Math.ceil((h + 32) / 64) * 64;
      if (nw > this.cw || nh > this.ch || ((nw < this.cw * .5 || nh < this.ch * .5) && now - this.tTaille > 1500)) {
        this.cw = Math.max(nw, 64); this.ch = Math.max(nh, 64); this.tTaille = now;
        this.cv.width = Math.round(this.cw * this.dpr); this.cv.height = Math.round(this.ch * this.dpr);
        this.cv.style.width = this.cw + 'px'; this.cv.style.height = this.ch + 'px';
      }
      this.cx0 = Math.round(b.x0 - (this.cw - w) / 2); this.cy0 = Math.round(b.y0 - (this.ch - h) / 2);
      this.cv.style.transform = `translate3d(${this.cx0}px,${this.cy0}px,0)`;
      if (this.cache) { this.cache = false; this.cv.style.display = 'block'; }
    }
    cacher() { if (this.cv && !this.cache) { this.cache = true; this.cv.style.display = 'none'; } }
    // la place de la pieuvre à l'écran : { x, y } son cœur, s son échelle ; null : elle n'a pas lieu d'être
    placer() {
      const p = this.o.placer ? this.o.placer() : null;
      if (!p) { if (this.place) this.sommeille(); this.place = null; return false; }
      const s = p.s || (p.largeur || this.o.largeur || 40) / LARGEUR, ox = p.x - CENTRE[0] * s, oy = p.y - CENTRE[1] * s;
      if (Math.abs(s - this.s) > 1e-7 || Math.abs(ox - this.ox) > .01 || Math.abs(oy - this.oy) > .01) {
        this.s = s; this.ox = ox; this.oy = oy;
        // (la pieuvre a changé de place ou de taille : elle emmène ses tentacules, une tentacule en route reste en route)
        this.BRAS.forEach(a => a.t.deplacer(ox, oy, s));
      }
      if (!this.place) this.reagir('page');   // (elle paraît : elle s'éveille d'une secousse)
      this.place = p; this.enMouvement = !!p.bouge;
      return true;
    }
    // (pas de place à l'écran : elle s'efface, lâche ce qu'elle tenait, et attend qu'on la réveille)
    sommeille() {
      this.cacher();
      this.BRAS.forEach(a => { a.but = null; a.teinte = 0; a.geste = null; a.t.viser(null, 0); });
      if (this.moment) { this.moment = null; while (this.promesses.length) this.promesses.shift()(false); }
    }
    reveil() { if (this.vivant && !this.raf && !document.hidden) this.raf = requestAnimationFrame(now => this.image(now)); }
    pause() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; this.tPrec = 0; }
    demarrer() {
      if (this.vivant || !actif || reduit()) return;
      this.toile();
      this.BRAS.forEach(a => { a.but = null; a.teinte = 0; a.geste = null; a.t.viser(null, 0); });
      this.vivant = true; this.tPrec = 0; this.tDessin = 0; this.placeSale = true; this.place = null;
      if (this.o.eveil) this.o.eveil();
      this.reveil();
    }
    // tout s'efface, les tentacules se reposent
    dormir() {
      if (!this.vivant) return;
      this.vivant = false; this.reaction = null;
      this.pause(); this.sommeille(); this.place = null;
      if (this.o.sommeil) this.o.sommeil();
    }
    arreter() { this.dormir(); if (this.cv) { this.cv.remove(); this.cv = null; this.ctx = null; } toutes.delete(this); }
    sortie() { return this.moment ? this.moment.bras.t.mouvement() : 0; }
    cible() { return this.moment && this.moment.el || null; }

    /* ---------- les moments ---------- */
    reagir(genre = 'clic', vers = null) {
      if (!this.vivant) return;
      const g = GENRES[genre] || GENRES.clic, cx = this.ox + CENTRE[0] * this.s;
      const lean = vers && isFinite(vers[0]) ? clamp((vers[0] - cx) / Math.max(200, this.W * .4), -1, 1) * g[3] : 0;
      this.reaction = { t0: performance.now(), duree: g[0], serre: g[1], agite: g[2], lean };
      this.reveil();
    }
    vers(cible, o = {}) {
      if (!this.vivant || reduit()) return Promise.resolve(false);
      const el = cible && cible.nodeType === 1 ? cible : null, pt = Array.isArray(cible) ? cible : null;
      if (!el && !pt) return Promise.resolve(false);
      // la boucle en S de gauche (défaut) : elle arrive par la gauche de la cible et la souligne vers la droite
      const a = this.BRAS.find(x => x.cle === (o.bras || 'boucleL')) || this.BRAS.find(x => /^boucle/.test(x.cle)) || this.BRAS[0];
      if (!a) return Promise.resolve(false);
      if (this.moment && (this.moment.bras !== a || this.moment.el !== el)) this.revenir();
      else if (this.moment && this.moment.el === el && this.moment.etat !== 'revient') { this.moment.tenir = o.tenir == null ? 1300 : o.tenir; this.moment.tTenu = performance.now(); return this.moment.promesse; }
      const couleur = (o.couleur && rgb(o.couleur)) || this.ENCRE;
      const m = this.moment = { el, pt, bras: a, couleur, prise: o.prise || 'titre', tenir: o.tenir == null ? 1300 : o.tenir, duree: o.duree || 900, etat: 'va', t0: performance.now(), tTenu: 0, cle: 'vers' + Date.now() };
      a.col = couleur; a.geste = null;
      m.promesse = new Promise(res => this.promesses.push(res));
      this.reveil();
      return m.promesse;
    }
    revenir() {
      const m = this.moment;
      if (!m) return;
      if (m.etat !== 'revient') { m.etat = 'revient'; m.bras.but = null; m.bras.t.viser(null, 760); }
      this.reveil();
    }
    // ce que vise la tentacule du moment : le bas de l'élément (ou le point), souligné vers la droite, dans la place qu'il y a
    cibleDu(m) {
      let x, y, U;
      if (m.el) {
        if (!m.el.isConnected) return null;
        const r = m.el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4 || r.bottom < 8 || r.top > this.H - 8) return null;
        if (m.prise === 'medaillon') { x = r.left + r.width * .18; y = r.bottom + 3; U = Math.max(8, r.width * .5); }
        else {
          // (le point d'accroche est un peu à l'intérieur du titre : la courbe s'y aplatit, sous lui, et sort rarement de l'écran)
          const dedans = Math.min(110, r.width * .45);
          x = r.left + dedans; y = r.bottom + 5; U = Math.max(8, r.width - dedans - 6);
        }
      } else { x = m.pt[0]; y = m.pt[1]; U = 8; }
      // (sous un médaillon, elle arrive de tout près : pas de grand détour vers l'arrière)
      return { cle: m.cle, x, y, sens: 1, U, mobile: this.W < 760, racine: .7, corps: .86, marge: m.prise === 'medaillon' ? Math.min(x - 14, 26) : x - 14, epaisseur: this.W < 760 ? 2.2 : 2.6 };
    }
    // elle tâte autour d'elle : une tentacule libre (une queue, une frange) s'étire un peu vers où elle pointe, s'enroule, revient
    geste(now) {
      const libres = this.BRAS.filter(a => !a.but && !a.geste && /^(queue|frange)/.test(a.cle));
      if (!libres.length) return;
      const a = libres[Math.floor(Math.random() * libres.length)], p = a.t.pointe(), larg = LARGEUR * this.s, L = clamp(larg * .42, 16, 70);
      const ang = a.dir + (Math.random() - .5) * .9, cx = this.ox + CENTRE[0] * this.s;
      let x = p.x + Math.cos(ang) * L, y = p.y + Math.sin(ang) * L;
      x = Math.min(x, cx + larg * .45);   // (pas vers ce qui s'écrit, à sa droite)
      a.geste = { fin: now + 900 + Math.random() * 600 };
      a.t.viser({ cle: 'geste' + now, x, y, sens: x >= p.x ? 1 : -1, U: 8, mobile: this.W < 760, racine: /^queue/.test(a.cle) ? .6 : undefined, epaisseur: 2, boucle: clamp(larg / 130, .3, 1) }, 640);
    }

    /* ---------- une image ---------- */
    image(now) {
      this.raf = 0;
      if (!this.vivant || document.hidden) return;
      if (tailleSale) { toutes.forEach(c => c.dimensionner()); tailleSale = false; }
      const dt = Math.min(50, this.tPrec ? now - this.tPrec : 16); this.tPrec = now;
      // (sans place, elle la cherche à chaque réveil : réveillée par la souris ou une réaction moins de 250 ms après une place
      // perdue, elle n'a rien où se dessiner)
      if (!this.place || this.placeSale || now - this.tPlace > 250 || this.o.placerChaqueImage) {
        this.tPlace = now; this.placeSale = false;
        if (!this.placer()) return;
      }
      const W = this.W, H = this.H, s = this.s, ox = this.ox, oy = this.oy, BRAS = this.BRAS, ctx = this.ctx, cv = this.cv, vie = this.vie;
      decrue(now, dt);
      // le moment : la cible (elle peut bouger), l'aller, la tenue, le retour
      let sortie = null;
      const m = this.moment;
      if (m) {
        const a = m.bras;
        if (m.etat !== 'revient') {
          const c = this.cibleDu(m);
          if (!c) this.revenir();
          else { const premiere = !a.but; a.but = c; if (premiere) a.t.viser(c, m.duree); else a.t.viser(c); }
          if (m.etat === 'va' && a.t.q >= 1 && a.but) { m.etat = 'tient'; m.tTenu = now; }
          else if (m.etat === 'tient' && now - m.tTenu > m.tenir) this.revenir();
        } else if (a.t.q >= 1) { this.moment = null; while (this.promesses.length) this.promesses.shift()(true); }
        if (this.moment) sortie = a;
      }
      // les gestes : elle tâte de temps en temps (avec de l'entrain), et chaque geste revient à son heure
      for (const a of BRAS) if (a.geste && now > a.geste.fin) { a.geste = null; a.t.viser(null, 820); }
      if (vie >= 1.5 && now > this.tGeste) { if (this.tGeste) this.geste(now); this.tGeste = now + (1800 + Math.random() * 2600) / this.rythme; }
      // la réaction : l'impulsion
      let imp = 0, lean = 0, agite = 0;
      const R = this.reaction;
      if (R) {
        const u = (now - R.t0) / R.duree;
        if (u >= 1) this.reaction = null;
        else { imp = choc(u); lean = R.lean * imp; agite = R.agite * Math.abs(imp); }
      }
      // la nage : tant qu'elle se déplace, une impulsion toutes les 1,6 s (le corps se contracte, les tentacules rament : elles
      // sont emportées derrière elle), et elle se penche dans le sens où elle va
      const v = this.place.v || 0, sens = v > 0 ? 1 : v < 0 ? -1 : 0, mesure = this.place.coup != null;
      if (!mesure && this.enMouvement && now - this.tCoup > 1600 / this.rythme) this.tCoup = now;
      const uc = (now - this.tCoup) / 760, coup = mesure ? clamp(this.place.coup, 0, 1) : uc < 1 ? choc(uc) : 0;
      this.penteNage += (sens * clamp(Math.abs(v) / 1.6, 0, 1) * (mesure ? 14 : 10) - this.penteNage) * (mesure ? .12 : .06);
      const enRoute = BRAS.some(a => a.t.q < 1 || Math.abs(a.teinte - (a.but ? 1 : 0)) > .005);
      const vif = this.moment || this.reaction || this.enMouvement || coup > 0 || (this.souris && pointeur) || (this.courant && Math.abs(vScroll) > .4) || enRoute;
      // au repos (rien ne se tend, rien ne réagit, personne ne passe) : trente images par seconde suffisent
      if (!vif && now - this.tDessin < 30) { this.raf = requestAnimationFrame(t => this.image(t)); return; }
      this.tDessin = now; this.tVie += dt / 1000 * this.rythme;
      const tVie = this.tVie;
      // elle flotte et dérive, elle respire, elle se balance (d'autant plus qu'elle a d'entrain) ; la tentacule d'un moment,
      // tendue, retient la respiration et le balancement (sa pointe resterait sur la cible), pas la dérive : elle s'y accroche
      const tendue = this.sortie(), bob = this.bob, plus = Math.max(0, vie - 1), retenue = 1 - .6 * tendue;
      bob.x = Math.sin(tVie * .43) * .5 * vie + Math.sin(tVie * .29) * 1.6 * plus; bob.y = Math.sin(tVie * .9) * .7 * vie + Math.cos(tVie * .21) * 2.2 * plus;
      const souffle = 1 + .03 * Math.min(vie, 1.6) * Math.sin(tVie * 1.15) * retenue;
      const k = souffle * (1 - ((R ? R.serre : 0) * imp + (mesure ? .09 : .05) * coup) * retenue);
      const balance = Math.sin(tVie * .6) * 2.2 * plus;
      // la curiosité : elle se tourne un peu vers la souris qui passe près d'elle, ses tentacules s'y penchent ; et elles suivent
      // le courant quand la page défile
      const cx = ox + CENTRE[0] * s, cy = oy + CENTRE[1] * s, courant = this.courant ? clamp(Math.abs(vScroll) / 24, 0, 1) * .32 : 0;
      const pres = this.souris && pointeur ? Math.hypot(pointeur.x - cx, pointeur.y - cy) : Infinity, regard = pres < 240 ? clamp((pointeur.x - cx) / 120, -1, 1) * (1 - pres / 240) * 4 : 0;
      this.regard += (regard - this.regard) * .08;
      const rot = (lean + this.regard + balance + this.penteNage) * Math.PI / 180 * retenue;
      const rame = coup * (mesure ? .95 : .55) * (sens || 1);
      for (const a of BRAS) {
        let pv = 0;
        if (!a.but && !a.geste) {
          const p = a.t.pointe();
          if (pres < 240) {
            const dx = pointeur.x - p.x, dy = pointeur.y - p.y, d = Math.hypot(dx, dy);
            if (d < 240) { let df = Math.atan2(dy, dx) - a.dir; df = Math.atan2(Math.sin(df), Math.cos(df)); pv += clamp(df, -1.2, 1.2) * .4 * (1 - d / 240); }
          }
          // (le contenu monte quand on descend : les tentacules sont emportées vers le haut, et l'inverse ; en nageant, elles
          // rament : emportées derrière elle)
          const arriere = (courant > .01 ? -Math.sign(vScroll) * courant : 0) + (coup > 0 ? -Math.sign(rame) * Math.abs(rame) : 0);
          if (arriere) { let df = Math.atan2(Math.sign(arriere) * 1000, cx - p.x) - a.dir; df = Math.atan2(Math.sin(df), Math.cos(df)); pv += clamp(df, -1.2, 1.2) * Math.abs(arriere); }
        }
        a.penche += (pv - a.penche) * .08;
        const tv = a.but ? 1 : 0;
        if (Math.abs(a.teinte - tv) > .005) a.teinte += (tv - a.teinte) * .12; else a.teinte = tv;
        a.t.avancer(dt * this.rythme, { temps: tVie, onde: this.onde + agite + coup * (mesure ? 3 : 1.5), penche: a.penche, bob });
      }
      // la boîte à peindre : la pieuvre et ses tentacules, élargie de ce que la respiration, la contraction et la penche
      // déplacent, et du halo ; la toile la suit
      const b = { x0: ox + 250 * s - 4, y0: oy + 340 * s - 4, x1: ox + 1292 * s + 4, y1: oy + 916 * s + 4 };
      for (const a of BRAS) { const r = a.t.boite(6); b.x0 = Math.min(b.x0, r.x0); b.y0 = Math.min(b.y0, r.y0); b.x1 = Math.max(b.x1, r.x1); b.y1 = Math.max(b.y1, r.y1); }
      const Rm = Math.max(Math.hypot(b.x0 - cx, b.y0 - cy), Math.hypot(b.x1 - cx, b.y1 - cy), Math.hypot(b.x0 - cx, b.y1 - cy), Math.hypot(b.x1 - cx, b.y0 - cy));
      const marge = Rm * (Math.abs(k - 1) + Math.abs(rot)) + 4 + (this.lueur ? LARGEUR * s * .35 : 0);
      b.x0 -= marge; b.y0 -= marge; b.x1 += marge; b.y1 += marge;
      this.cadrer(b, now);
      const dpr = this.dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      // le repère de l'écran sur la toile ; l'ensemble respire, se contracte et se penche autour de son cœur
      ctx.setTransform(dpr, 0, 0, dpr, -this.cx0 * dpr, -this.cy0 * dpr); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(k, k); ctx.translate(-cx, -cy);
      // le halo, s'il y en a un : un dégradé, une seule forme (pas de flou, trop coûteux), qui respire avec elle
      if (this.lueur) {
        const E = this.ENCRE, r0 = LARGEUR * s * .62, g = ctx.createRadialGradient(cx + bob.x, cy + bob.y, r0 * .25, cx + bob.x, cy + bob.y, r0);
        g.addColorStop(0, `rgba(${E[0]},${E[1]},${E[2]},${(.26 + .08 * Math.sin(tVie * 1.15)).toFixed(3)})`); g.addColorStop(1, `rgba(${E[0]},${E[1]},${E[2]},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx + bob.x, cy + bob.y, r0, 0, TAU); ctx.fill();
      }
      // la tache de la marque, s'il y en a une ; le corps : le logo sans ses huit tentacules, qui se dessinent par-dessus, celle
      // qui sort en dernier
      ctx.save(); ctx.transform(s, 0, 0, s, ox + bob.x, oy + bob.y);
      if (this.tache) { ctx.fillStyle = this.tache.fond; ctx.fill(this.tache.chemin); }
      ctx.fillStyle = this.encre; ctx.fill(this.CORPS, 'evenodd'); ctx.restore();
      const trace = a => PIEUVRE.dessiner(ctx, a.t, { encre: this.encre, vers: `rgb(${a.col.join(',')})`, teinte: a.teinte, lisere: PIEUVRE.lisere });
      for (const a of BRAS) if (a !== sortie) trace(a);
      if (sortie) trace(sortie);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.raf = requestAnimationFrame(t => this.image(t));
    }
  }

  /* ---------- la créature de l'en-tête : à la place du dessin de l'hôte ---------- */
  let tete = null, hote = null, svg = null, attend = false;
  // le dessin de l'hôte : la marque peut poser la pieuvre sur sa tache (D.logo.mark) : la tache se redessine sous elle, telle quelle
  function lireDessin(c) {
    const t = svg && svg.querySelector('.logo-tache');
    c.tache = t && t.getAttribute('d') ? { chemin: new Path2D(t.getAttribute('d')), fond: getComputedStyle(t).fill || t.getAttribute('fill') || 'transparent' } : null;
  }
  // la place du dessin : l'hôte, son svg, son viewBox → le cœur et l'échelle du dessin à l'écran
  function placeHote() {
    // (la page a pu réécrire l'hôte : le nouveau dessin prend la place de l'ancien, caché à son tour)
    if (svg && !svg.isConnected && hote && hote.isConnected) { svg = hote.querySelector('svg'); if (svg) { if (tete.vivant) svg.style.visibility = 'hidden'; lireDessin(tete); } }
    if (!svg || !svg.isConnected) return null;
    if (intro()) { tete.dormir(); attendreIntro(); return null; }   // (l'ouverture se rejoue : le dessin reprend sa place, la créature attend)
    const r = svg.getBoundingClientRect(), vb = svg.viewBox && svg.viewBox.baseVal;
    if (!vb || !vb.width || !vb.height || r.width < 8 || r.height < 4) return null;
    const s = Math.min(r.width / vb.width, r.height / vb.height);
    const ox = r.left + (r.width - vb.width * s) / 2 - vb.x * s, oy = r.top + (r.height - vb.height * s) / 2 - vb.y * s;
    return { x: ox + CENTRE[0] * s, y: oy + CENTRE[1] * s, s };
  }
  function attendreIntro() {
    if (attend) return;
    attend = true;
    addEventListener('intro:fin', () => { attend = false; if (tete) tete.demarrer(); }, { once: true });
  }
  function habiter(h, o = {}) {
    if (!actif || !h || tete) return null;
    const sv = h.matches && h.matches('svg') ? h : h.querySelector('svg');
    if (!sv) return null;
    hote = h; svg = sv;
    tete = new Creature({ encre: o.encre || getComputedStyle(h).color || '#ffffff', placer: placeHote, vie: 1.4, rythme: 1.3,
      eveil: () => { if (svg) svg.style.visibility = 'hidden'; lireDessin(tete); },
      sommeil: () => { if (svg) svg.style.visibility = ''; } });
    if (intro()) attendreIntro(); else tete.demarrer();
    return tete;
  }
  const habite = el => !!(tete && tete.vivant && hote && el && (el === hote || hote.contains(el) || el.contains(hote)));

  return { actif, habiter, habite, creer: o => (actif ? new Creature(o) : null), reagir: (genre, vers) => { if (tete) tete.reagir(genre, vers); },
    vers: (el, o) => (tete ? tete.vers(el, o) : Promise.resolve(false)), revenir: () => { if (tete) tete.revenir(); }, sortie: () => (tete ? tete.sortie() : 0), arreter: () => { if (tete) tete.arreter(); } };
})();
