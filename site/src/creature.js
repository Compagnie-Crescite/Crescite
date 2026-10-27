/* La créature : une pieuvre vivante, dessinée image par image avec ses vraies tentacules (PIEUVRE, D.pieuvre), sur une
   petite toile fixe qui la suit (juste ce qu'il faut pour elle et ce que ses tentacules atteignent : rien de plein écran).
   build.py l'ajoute après pieuvre.js aux pages qui ont la scène de la pieuvre (la 10 et la synthèse). La maquette
   l'appelle : rien ne se fait seul. Deux façons de vivre :

   CREATURE.habiter(hote, { encre })    la petite pieuvre de l'en-tête : l'hôte (l'élément data-pieuvre, qui contient le svg du
                     logo) garde son dessin, invisible, pour la mise en page (visible pour qui a demandé moins
                     d'animations) ; la créature est dessinée exactement à sa place, et prend la relève du dessin à la fin
                     de l'ouverture (intro:fin), sans que rien ne saute. Si la page réécrit l'hôte, elle suit. encre : la
                     couleur de la pieuvre (défaut : la couleur du texte de l'hôte). → la créature (voir plus bas)
   CREATURE.creer({ placer, encre, largeur, souris, courant, vie, onde, rythme, lueur, sillage, tete })   une pieuvre à soi,
                     placée par la maquette : placer() est appelée à chaque image et rend { x, y, s, largeur, bouge, v, coup,
                     etire, ang } (le cœur de la pieuvre à l'écran, en px ; s l'échelle, px par unité du dessin, ou
                     largeur : la largeur du dessin en px ; bouge : vrai tant qu'elle se déplace, v : sa vitesse verticale,
                     px par image, pour qu'elle se penche et rame dans ce sens ; coup, de 0 à 1 : l'impulsion de nage de
                     cette image, si c'est la maquette qui bat la mesure, un galop par exemple : le corps se contracte et
                     les tentacules rament à ce rythme-là ; etire, de 0 à 1, et ang : elle s'étire dans le sens ang
                     (radians) et s'aplatit en travers, le temps d'un bond) ou null (elle n'a pas lieu d'être à l'écran :
                     elle s'efface et se repose). placerChaqueImage : placer() à chaque image (une pieuvre qui se déplace)
                     et non quatre fois par seconde. souris (vrai par défaut) : elle se tourne vers la souris ; courant
                     (vrai) : ses tentacules suivent le défilement. vie (1) : son entrain, de 1 (l'en-tête, discrète) à 2
                     ou 3 (une grande pieuvre, toujours en mouvement : ondulation ample, respiration, dérive,
                     balancement ; à partir de 1,5 elle tâte autour d'elle d'une tentacule, de temps en temps) ; onde :
                     l'ampleur de l'ondulation des tentacules (2 × vie par défaut ; 5 ou 6 : elles battent franchement) ;
                     rythme : la vitesse de tout ce qui vit (1 ; 2 : deux fois plus vif) ; lueur : un halo autour d'elle ;
                     sillage : une traînée derrière elle quand elle se déplace ; tete (vrai par défaut dès que vie ≥ 1,5) :
                     sa tête bouge, à part du corps (elle hoche, se tourne, mène le mouvement) ; toucher : on peut la
                     toucher (un doigt, un clic sur son corps ou ses tentacules) : elle exulte (c.joie), et le clic ne va pas
                     à ce qu'il y a dessous ; une fonction : appelée à chaque fois avec le nombre de touches rapprochées ;
                     couleurs : les couleurs de ses bulles (défaut : son encre). → la créature

   Sa vie, au repos, jamais pénible (lente, trente images par seconde au plus, rien quand l'onglet est caché) : ses
   tentacules ondulent, elle respire (son corps gonfle d'un rien), elle se penche vers la souris qui passe près d'elle,
   et quand la page défile ses tentacules suivent le courant. En nageant (bouge), elle se penche dans le sens où elle va
   et avance par impulsions : le corps se contracte, les tentacules rament. Ses moments, que la maquette joue à la main :
     c.vers(el | [x, y], { couleur, tenir, duree, prise, bras })   une vraie tentacule (une boucle en S, prolongée depuis sa
                     descente, comme sur l'accueil au téléphone : une courbe raide, aux grands rayons) part de la pieuvre,
                     rejoint le bas de cet élément, le souligne vers la droite et s'y enroule, à la couleur donnée ; elle y
                     reste `tenir` ms (1300 ; Infinity : jusqu'à revenir()), puis revient. prise 'titre' (défaut : elle
                     s'accroche un peu à l'intérieur du titre et le souligne jusqu'au bout), 'medaillon' (elle passe sous
                     un médaillon rond et s'enroule sous sa droite) ou 'pastille' (sous une pastille large). bras : la
                     tentacule ('boucleL', défaut, elle arrive par la gauche ; 'boucleR'). Elle suit l'élément s'il bouge,
                     et rentre s'il quitte l'écran. Promesse, résolue au retour. Une nouvelle destination remplace la
                     précédente.
     c.revenir()                        la tentacule rentre
     c.tenir([el…], { couleur, lumineux, prise })   plusieurs tentacules à la fois, une par élément (jusqu'à sept, les
                     plus longues d'abord) : elle les tient tous ensemble, les relie à elle. lumineux : ces tentacules
                     luisent (un halo, une lueur qui court le long) ; couleur : leur couleur (défaut : l'encre éclaircie).
                     Un élément hors de l'écran est lâché, repris quand il revient. tenir([]) ou lacher() : elle lâche tout.
     c.tient()                          vrai tant qu'elle tient quelque chose (tenir)
     c.reagir(genre, vers)              la pieuvre se contracte et ses tentacules s'agitent un instant ('page', 'clic',
                     'ouvre', 'ferme', 'enroule', 'retour', 'nage') ; vers : un point [x, y] vers lequel elle se penche
     c.joie(x, y, genre)                on l'a touchée en (x, y) ('mouse', 'touch', 'pen') : elle se tasse et rebondit en
                     l'air, tremble comme une gelée, lance ses tentacules tout autour puis les replie d'un ressort, son
                     halo s'allume, une gerbe de bulles et une onde partent d'elle (un téléphone vibre d'un rien). Les
                     touches rapprochées (moins d'une seconde) font monter la joie : plus haut, plus de bulles, et dès la
                     troisième elle tourbillonne sur elle-même. Rend le nombre de touches rapprochées
     c.sortie()                         0 au repos, 1 quand la tentacule d'un moment est tendue
     c.cible()                          l'élément que sa tentacule vise, ou null
     c.arreter()                        tout s'arrête (l'en-tête retrouve son dessin)
   Le reste
     CREATURE.habite(el)                vrai si la créature de l'en-tête vit dans cet élément : tentacules.js lui confie alors
                     les réactions du guide (ses tentacules fines, elles, partent toujours des bras du dessin)
     CREATURE.reagir(genre, vers)       la créature de l'en-tête réagit (rien sans elle)
     CREATURE.suspendre(ms)             toutes les créatures laissent passer leurs images ms durant (40 par défaut) : une page
                                        neuve se met en page sans elles
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
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const PRET = typeof PIEUVRE !== 'undefined' && !!PIEUVRE.pret;
  const actif = PRET && !COUPE;
  const CENTRE = [771, 640];   // le cœur de la pieuvre, en unités du dessin (comme la scène de l'accueil)
  const LARGEUR = 1042;        // la largeur du dessin de la pieuvre seule (D.logo.octopus), en unités
  const ORDRE = ['queueL', 'queueR', 'spiraleExtL', 'spiraleExtR', 'boucleL', 'boucleR', 'spiraleL', 'spiraleR'];   // pour tenir : de la racine la plus haute à la plus basse
  const HEX6 = /^#[0-9a-f]{6}$/i;
  function rgb(c) {
    c = String(c || '').trim();
    let m = /^#([0-9a-f]{3})$/i.exec(c);
    if (m) return [...m[1]].map(h => parseInt(h + h, 16));
    if (HEX6.test(c)) return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(c);
    return m ? [+m[1], +m[2], +m[3]].map(Math.round) : null;
  }
  const rgba = (E, a) => `rgba(${E[0]},${E[1]},${E[2]},${a.toFixed(3)})`;
  const eclairci = (E, k) => E.map(v => Math.round(v + (255 - v) * k));
  // la secousse d'une réaction : une impulsion qui monte vite, puis une détente qui se balance en s'éteignant
  const choc = v => (v <= 0 || v >= 1 ? 0 : v < .22 ? ease(v / .22) : Math.cos(((v - .22) / .78) * Math.PI * 1.6) * Math.pow(1 - (v - .22) / .78, 1.5));
  // [durée (ms), contraction, agitation des tentacules, penche (°)]
  const GENRES = { clic: [420, .07, 1.8, 3], page: [680, .1, 2.6, 5], ouvre: [460, .05, 1.6, 2], ferme: [460, .07, 1.6, 2], enroule: [600, .06, 2, 0], retour: [480, .07, 1.8, 3], nage: [760, .05, 1.6, 0], prise: [640, .1, 2.6, 4], joie: [900, .18, 5, 6] };

  /* ---------- ce que toutes les créatures partagent : la souris, le défilement, l'onglet, le réglage ---------- */
  const toutes = new Set();
  let pointeur = null, vScroll = 0, yScroll = 0, tScroll = 0, branche = false, tailleSale = true, tDecrue = 0, nPrises = 0, avalee = null, main = false;
  // (une créature qu'on peut toucher sous ce point : la plus haute, la dernière créée)
  const touchee = (x, y, genre) => { let r = null; for (const c of toutes) if (c.o.toucher && c.touche(x, y, genre)) r = c; return r; };
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
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      pointeur = { x: e.clientX, y: e.clientY }; toutes.forEach(c => c.reveil());
      // (au-dessus d'une créature qu'on peut toucher, la main)
      const sur = !!touchee(e.clientX, e.clientY, 'mouse');
      if (sur !== main) { main = sur; document.documentElement.style.cursor = sur ? 'pointer' : ''; }
    }, { passive: true });
    // on la touche : elle exulte ; le clic qui suit ne va pas à ce qu'il y a sous elle (un médaillon, un lien)
    document.addEventListener('pointerdown', e => {
      if (e.button > 0 || !e.isPrimary) return;
      const c = touchee(e.clientX, e.clientY, e.pointerType);
      if (!c) return;
      c.joie(e.clientX, e.clientY, e.pointerType);
      avalee = { x: e.clientX, y: e.clientY, t: performance.now() };
    }, { capture: true, passive: true });
    document.addEventListener('click', e => {
      const a = avalee; avalee = null;
      if (a && performance.now() - a.t < 900 && Math.hypot(e.clientX - a.x, e.clientY - a.y) < 30) { e.preventDefault(); e.stopPropagation(); }
    }, true);
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
      this.souris = o.souris !== false; this.courant = o.courant !== false; this.vie = o.vie || 1; this.lueur = !!o.lueur; this.sillage = !!o.sillage;
      this.onde = o.onde || 2 * this.vie; this.rythme = o.rythme || 1; this.tete = o.tete != null ? !!o.tete : this.vie >= 1.5;
      const TS = PIEUVRE.creer();
      this.POINTS = PIEUVRE.contours();
      // dir : le sens de la pointe au repos (vers où la tentacule se penche) ; col : la couleur vers laquelle elle se teinte
      this.BRAS = TS.map((t, i) => ({ t, i, cle: t.cle, but: null, teinte: 0, penche: 0, col: this.ENCRE, dir: t.RS[t.M - 1], geste: null, prise: null }));
      this.cv = null; this.ctx = null; this.W = 0; this.H = 0; this.dpr = 1; this.cw = 0; this.ch = 0; this.cx0 = 0; this.cy0 = 0; this.tTaille = 0;
      this.raf = 0; this.tPrec = 0; this.tVie = 0; this.tDessin = 0; this.vivant = false; this.cache = true;
      this.s = 0; this.ox = 0; this.oy = 0; this.place = null; this.placeSale = true; this.tPlace = 0; this.tache = null; this.enMouvement = false;
      this.reaction = null; this.moment = null; this.regard = 0; this.penteNage = 0; this.tCoup = -1e9; this.tGeste = 0; this.bob = { x: 0, y: 0 }; this.promesses = [];
      this.theta = 0; this.vTheta = 0; this.dxTete = 0; this.dyTete = 0; this.trace = []; this.etire = 0;
      // la joie (joie) : le bond, la gelée, le tourbillon, l'éclat du halo, les bulles et les ondes, les touches rapprochées
      this.saut = null; this.gelee = null; this.tour = null; this.eclat = null; this.bulles = []; this.ondes = []; this.combo = 0; this.tJoie = 0;
      this.COULEURS = (o.couleurs || []).map(rgb).filter(Boolean);
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
    // la toile couvre la boîte b (px écran, bornée à l'écran), avec de la marge ; elle ne change de taille que quand il le faut
    // (grandir), ou bien plus tard quand elle est devenue bien trop grande : jamais à chaque image
    cadrer(b, now) {
      b.x0 = Math.max(b.x0, -64); b.y0 = Math.max(b.y0, -64); b.x1 = Math.min(b.x1, this.W + 64); b.y1 = Math.min(b.y1, this.H + 64);
      const w = Math.max(8, b.x1 - b.x0), h = Math.max(8, b.y1 - b.y0), nw = Math.ceil((w + 32) / 64) * 64, nh = Math.ceil((h + 32) / 64) * 64;
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
      const s = p.s || (p.largeur || this.o.largeur || 40) / LARGEUR, ox = p.x - CENTRE[0] * s, oy = p.y + this.bond(performance.now()) - CENTRE[1] * s;
      if (Math.abs(s - this.s) > 1e-7 || Math.abs(ox - this.ox) > .01 || Math.abs(oy - this.oy) > .01) { this.s = s; this.ox = ox; this.oy = oy; }
      // (elle paraît : elle s'éveille d'une secousse, ses tentacules au repos autour d'elle, là où elle est : une pieuvre qui
      // reparaît ailleurs que là où elle s'est endormie ne traîne pas ses tentacules depuis son ancienne place)
      if (!this.place) { this.BRAS.forEach(a => a.t.poser(ox, oy, s)); this.reagir('page'); this.trace.length = 0; }
      this.place = p; this.enMouvement = !!p.bouge;
      return true;
    }
    // (pas de place à l'écran : elle s'efface, lâche ce qu'elle tenait, et attend qu'on la réveille)
    sommeille() {
      this.cacher();
      this.saut = this.gelee = this.tour = this.eclat = null; this.bulles.length = 0; this.ondes.length = 0;
      this.BRAS.forEach(a => { a.but = null; a.teinte = 0; a.geste = null; a.t.viser(null, 0); });
      if (this.moment) { this.moment = null; while (this.promesses.length) this.promesses.shift()(false); }
    }
    reveil() { if (this.vivant && !this.raf && !document.hidden) this.raf = requestAnimationFrame(now => this.image(now)); }
    pause() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; this.tPrec = 0; }
    demarrer() {
      if (this.vivant || !actif || reduit()) return;
      this.toile();
      this.BRAS.forEach(a => { a.but = null; a.teinte = 0; a.geste = null; a.prise = null; a.t.viser(null, 0); });
      this.vivant = true; this.tPrec = 0; this.tDessin = 0; this.placeSale = true; this.place = null;
      if (this.o.eveil) this.o.eveil();
      this.reveil();
    }
    // tout s'efface, les tentacules se reposent
    dormir() {
      if (!this.vivant) return;
      this.vivant = false; this.reaction = null;
      this.pause(); this.sommeille(); this.place = null; this.BRAS.forEach(a => { a.prise = null; });
      if (this.o.sommeil) this.o.sommeil();
    }
    arreter() { this.dormir(); if (this.cv) { this.cv.remove(); this.cv = null; this.ctx = null; } toutes.delete(this); }
    sortie() { return this.moment ? this.moment.bras.t.mouvement() : 0; }
    cible() { return this.moment && this.moment.el || null; }
    tient() { return this.BRAS.some(a => a.prise); }

    /* ---------- les moments ---------- */
    reagir(genre = 'clic', vers = null) {
      if (!this.vivant) return;
      const g = GENRES[genre] || GENRES.clic, cx = this.ox + CENTRE[0] * this.s;
      const lean = vers && isFinite(vers[0]) ? clamp((vers[0] - cx) / Math.max(200, this.W * .4), -1, 1) * g[3] : 0;
      this.reaction = { t0: performance.now(), duree: g[0], serre: g[1], agite: g[2], lean };
      this.reveil();
    }
    // est-elle sous ce point (px écran) ? Son corps (une ellipse autour de l'arche et des racines), ou l'une de ses tentacules ;
    // au doigt, avec une marge : une petite pieuvre reste facile à toucher
    touche(x, y, genre) {
      if (!this.vivant || this.cache || !this.place || !this.s) return false;
      const s = this.s, bx = this.ox + this.bob.x, by = this.oy + this.bob.y, marge = genre === 'mouse' ? 8 : 14;
      const ex = (x - bx - 771 * s) / (240 * s + marge), ey = (y - by - 590 * s) / (270 * s + marge);
      if (ex * ex + ey * ey <= 1) return true;
      if (Math.hypot(x - bx - CENTRE[0] * s, y - by - CENTRE[1] * s) > LARGEUR * s * 1.5 + 40) return false;
      const d = Math.max(4, 14 * s) + marge * .6;
      // (seulement celles qui restent autour d'elle : une tentacule tendue vers un médaillon ou un nom passe sur ce qu'on veut
      // toucher, elle ne le prend pas)
      return this.BRAS.some(a => !a.t.parent && !a.but && !a.prise && a.t.mouvement() < .5 && a.t.distance(x, y) < d);
    }
    // on l'a touchée : voir l'en-tête du fichier
    joie(x, y, genre = 'mouse') {
      if (!this.vivant) return 0;
      const now = performance.now(), n = this.combo = now - this.tJoie < 1000 ? Math.min(6, this.combo + 1) : 1;
      this.tJoie = now;
      const s = this.s, L = LARGEUR * s, cx = this.ox + CENTRE[0] * s + this.bob.x, cy = this.oy + CENTRE[1] * s + this.bob.y, cote = x < cx ? 1 : -1;
      // le corps : il se tasse (plus fort à chaque touche rapprochée), recule du doigt, puis se balance en s'apaisant
      this.reaction = { t0: now, duree: 900, serre: .14 + .03 * Math.min(n, 4), agite: 4 + 1.5 * n, lean: cote * (4 + n) };
      // le bond (plus haut à chaque touche), la gelée (elle tremble en long, en large), le halo qui s'allume ; dès la troisième, un tourbillon
      this.saut = { t0: now, h: Math.min(170, L * (.5 + .14 * Math.min(n, 5))) };
      this.gelee = { t0: now, a: .09 + .025 * Math.min(n, 4) };
      this.eclat = { t0: now, f: .55 + .1 * Math.min(n, 4) };
      if (n >= 3 && (!this.tour || now - this.tour.t0 > 700)) this.tour = { t0: now, sens: cote };
      this.vTheta += cote * (4 + n);
      // les tentacules libres : lancées tout autour d'elle, d'un coup, puis repliées d'un ressort
      for (const a of this.BRAS) {
        if (a.t.parent || a.but || a.prise || (this.moment && this.moment.bras === a)) continue;
        const p = a.t.pointe(), ang = Math.atan2(p.y - cy, p.x - cx) + (Math.random() - .5) * .5, R = L * (.6 + .07 * Math.min(n, 4)) * (.85 + Math.random() * .3);
        const tx = cx + Math.cos(ang) * R, ty = cy + Math.sin(ang) * R;
        a.geste = { fin: now + 260 + Math.random() * 140, eclat: true };
        a.t.viser({ cle: 'joie' + now + a.i, x: tx, y: ty, sens: tx >= p.x ? 1 : -1, U: 6, mobile: this.W < 760, racine: /^queue/.test(a.cle) ? .6 : undefined, epaisseur: 2, boucle: .45, tension: .8 }, 240);
      }
      // la gerbe de bulles, depuis le doigt et le cœur, et une onde qui part d'elle (deux, dès la troisième touche)
      const nb = 12 + 5 * Math.min(n, 5), taille = clamp(L / 80, 1, 2), C = this.COULEURS.length ? this.COULEURS : [this.ENCRE];
      for (let i = 0; i < nb; i++) {
        const ang = Math.random() * TAU, v = (90 + Math.random() * 190) * (1 + .12 * Math.min(n, 5)) * Math.sqrt(taille), dePres = Math.random() < .5;
        this.bulles.push({ x: dePres ? x : cx, y: dePres ? y : cy, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 50, r: (2.4 + Math.random() * 5) * taille,
          t0: now, vie: 900 + Math.random() * 900, col: C[Math.floor(Math.random() * C.length)], plein: Math.random() < .35, ph: Math.random() * TAU });
      }
      if (this.bulles.length > 120) this.bulles.splice(0, this.bulles.length - 120);
      this.ondes.push({ x: cx, y: cy, t0: now, r1: L * (.9 + .12 * Math.min(n, 4)), vie: 700 });
      if (n >= 3) this.ondes.push({ x: cx, y: cy, t0: now + 120, r1: L * 1.25, vie: 800 });
      // (au doigt, le téléphone vibre d'un rien ; un peu plus à la troisième)
      if (genre !== 'mouse' && navigator.vibrate) { try { navigator.vibrate(n >= 3 ? [14, 40, 22] : 12); } catch (e) { /* (refusé : rien) */ } }
      if (typeof this.o.toucher === 'function') this.o.toucher(n);
      this.reveil();
      return n;
    }
    // le bond de la joie : de combien elle est en l'air (px, vers le haut), à cet instant ; elle saute, retombe, rebondit deux fois
    bond(now) {
      const S = this.saut;
      if (!S) return 0;
      const u = (now - S.t0) / 860;
      if (u >= 1) { this.saut = null; return 0; }
      return -S.h * (u < .55 ? Math.sin(Math.PI * u / .55) : u < .8 ? .22 * Math.sin(Math.PI * (u - .55) / .25) : .07 * Math.sin(Math.PI * (u - .8) / .2));
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
      if (a.prise) { a.prise = null; a.but = null; }
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
    // plusieurs à la fois : une tentacule par élément (la tentacule du moment reste au moment)
    tenir(els, o = {}) {
      this.lacher();
      if (!this.vivant || !els || !els.length) return;
      const libres = ORDRE.map(cle => this.BRAS.find(a => a.cle === cle)).filter(a => a && !a.t.parent && !(this.moment && this.moment.bras === a));
      const couleur = (o.couleur && rgb(o.couleur)) || eclairci(this.ENCRE, .55);
      // (du plus haut au plus bas, chacun à la tentacule dont la racine est la plus haute parmi celles qui restent : elles ne se
      // croisent pas ; au-delà de ce qu'elle a de bras, les plus proches de son cœur)
      const cy = this.oy + CENTRE[1] * this.s, yDe = el => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
      els = [...els].filter(el => el && el.nodeType === 1).sort((a, b) => Math.abs(yDe(a) - cy) - Math.abs(yDe(b) - cy)).slice(0, libres.length).sort((a, b) => yDe(a) - yDe(b));
      els.forEach((el, i) => {
        const a = libres[i];
        a.geste = null; a.col = couleur;
        a.prise = { el, lumineux: !!o.lumineux, prise: o.prise || 'pastille', cle: 'prise' + (++nPrises), ph: Math.random() };
      });
      this.reveil();
    }
    lacher() {
      for (const a of this.BRAS) if (a.prise) { a.prise = null; if (a.but) { a.but = null; a.t.viser(null, 700); } }
      this.reveil();
    }
    // ce que vise une tentacule : le bas de l'élément (ou le point), souligné vers la droite, dans la place qu'il y a
    cibleDe(el, pt, prise, cle) {
      let x, y, U;
      if (el) {
        if (!el.isConnected) return null;
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4 || r.bottom < 8 || r.top > this.H - 8) return null;
        if (prise === 'medaillon') { x = r.left + r.width * .18; y = r.bottom + 3; U = Math.max(8, r.width * .5); }
        else if (prise === 'pastille') { x = r.left + Math.min(28, r.width * .3); y = r.bottom + 2; U = Math.max(8, r.width * .5); }
        else {
          // (le point d'accroche est un peu à l'intérieur du titre : la courbe s'y aplatit, sous lui, et sort rarement de l'écran)
          const dedans = Math.min(110, r.width * .45);
          x = r.left + dedans; y = r.bottom + 5; U = Math.max(8, r.width - dedans - 6);
        }
      } else { x = pt[0]; y = pt[1]; U = 8; }
      // (sous un médaillon ou une pastille, elle arrive de tout près : pas de grand détour vers l'arrière)
      const pres = prise === 'medaillon' || prise === 'pastille';
      return { cle, x, y, sens: 1, U, mobile: this.W < 760, racine: .7, corps: .86, marge: pres ? Math.min(x - 14, 26) : x - 14, epaisseur: this.W < 760 ? 2.2 : 2.6, boucle: prise === 'pastille' ? .8 : 1 };
    }
    // elle tâte autour d'elle : une tentacule libre (une queue, une frange) s'étire un peu vers où elle pointe, s'enroule, revient
    geste(now) {
      const libres = this.BRAS.filter(a => !a.but && !a.geste && !a.prise && !a.t.parent && /^(queue|spirale)/.test(a.cle));
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
      // (une page qui change : les créatures laissent passer ses premières images, la mise en page de la page neuve, CREATURE.suspendre)
      if (now < repit) { this.raf = requestAnimationFrame(t => this.image(t)); return; }
      if (tailleSale) { toutes.forEach(c => c.dimensionner()); tailleSale = false; }
      const dt = Math.min(50, this.tPrec ? now - this.tPrec : 16); this.tPrec = now;
      // (sans place, elle la cherche à chaque réveil : réveillée par la souris ou une réaction moins de 250 ms après une place
      // perdue, elle n'a rien où se dessiner)
      if (!this.place || this.placeSale || now - this.tPlace > 250 || this.o.placerChaqueImage || this.saut) {
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
          const c = this.cibleDe(m.el, m.pt, m.prise, m.cle);
          if (!c) this.revenir();
          else { const premiere = !a.but; a.but = c; if (premiere) a.t.viser(c, m.duree); else a.t.viser(c); }
          if (m.etat === 'va' && a.t.q >= 1 && a.but) { m.etat = 'tient'; m.tTenu = now; }
          else if (m.etat === 'tient' && now - m.tTenu > m.tenir) this.revenir();
        } else if (a.t.q >= 1) { this.moment = null; while (this.promesses.length) this.promesses.shift()(true); }
        if (this.moment) sortie = a;
      }
      // ce qu'elle tient : chaque tentacule suit son élément, le lâche hors de l'écran, le reprend quand il revient
      let tient = false;
      for (const a of BRAS) {
        if (!a.prise) continue;
        tient = true;
        const c = this.cibleDe(a.prise.el, null, a.prise.prise, a.prise.cle);
        if (!c) { if (a.but) { a.but = null; a.t.viser(null, 600); } }
        else { const premiere = !a.but; a.but = c; if (premiere) a.t.viser(c, 820); else a.t.viser(c); }
      }
      // les gestes : elle tâte de temps en temps (avec de l'entrain, et les mains libres), et chaque geste revient à son heure
      // (lancées par la joie, elles reviennent d'un ressort : la pointe se love un peu trop, se balance, se pose)
      for (const a of BRAS) if (a.geste && now > a.geste.fin) { const e = a.geste.eclat; a.geste = null; a.t.viser(null, e ? 1150 : 820, !!e); }
      if (vie >= 1.5 && !tient && now > this.tGeste) { if (this.tGeste) this.geste(now); this.tGeste = now + (1800 + Math.random() * 2600) / this.rythme; }
      // la réaction : l'impulsion
      let imp = 0, lean = 0, agite = 0;
      const R = this.reaction;
      if (R) {
        const u = (now - R.t0) / R.duree;
        if (u >= 1) this.reaction = null;
        else { imp = choc(u); lean = R.lean * imp; agite = R.agite * Math.abs(imp); }
      }
      // la nage : tant qu'elle se déplace, une impulsion toutes les 1,6 s (le corps se contracte, les tentacules rament : elles
      // sont emportées derrière elle), et elle se penche dans le sens où elle va ; ou bien la maquette bat la mesure (coup)
      const v = this.place.v || 0, sens = v > 0 ? 1 : v < 0 ? -1 : 0, mesure = this.place.coup != null;
      if (!mesure && this.enMouvement && now - this.tCoup > 1600 / this.rythme) this.tCoup = now;
      const uc = (now - this.tCoup) / 760, coup = mesure ? clamp(this.place.coup, 0, 1) : uc < 1 ? choc(uc) : 0;
      this.penteNage += (sens * clamp(Math.abs(v) / 1.6, 0, 1) * (mesure ? 14 : 10) - this.penteNage) * (mesure ? .12 : .06);
      this.etire += ((this.place.etire || 0) - this.etire) * .35;
      const enRoute = BRAS.some(a => a.t.q < 1 || Math.abs(a.teinte - (a.but ? 1 : 0)) > .005);
      const joie = this.saut || this.gelee || this.tour || this.eclat || this.bulles.length || this.ondes.length;
      const vif = this.moment || tient || this.reaction || this.enMouvement || coup > 0 || this.etire > .01 || (this.souris && pointeur) || (this.courant && Math.abs(vScroll) > .4) || enRoute || joie;
      // au repos (rien ne se tend, rien ne réagit, personne ne passe) : trente images par seconde suffisent
      if (!vif && now - this.tDessin < 30) { this.raf = requestAnimationFrame(t => this.image(t)); return; }
      this.tDessin = now; this.tVie += dt / 1000 * this.rythme;
      const tVie = this.tVie;
      // elle flotte et dérive, elle respire, elle se balance (d'autant plus qu'elle a d'entrain) ; la tentacule d'un moment,
      // tendue, retient la respiration et le balancement (sa pointe resterait sur la cible), pas la dérive : elle s'y accroche
      let tendue = this.sortie();
      for (const a of BRAS) if (a.prise && a.but) tendue = Math.max(tendue, a.t.mouvement());
      const bob = this.bob, plus = Math.max(0, vie - 1), retenue = 1 - .6 * tendue;
      bob.x = Math.sin(tVie * .43) * .5 * vie + Math.sin(tVie * .29) * 1.6 * plus; bob.y = Math.sin(tVie * .9) * .7 * vie + Math.cos(tVie * .21) * 2.2 * plus;
      const souffle = 1 + .03 * Math.min(vie, 1.6) * Math.sin(tVie * 1.15) * retenue;
      const k = souffle * (1 - ((R ? R.serre : 0) * imp + (mesure ? .09 : .05) * coup) * retenue);
      const balance = Math.sin(tVie * .6) * 2.2 * plus;
      // la curiosité : elle se tourne un peu vers la souris qui passe près d'elle, ses tentacules s'y penchent ; et elles suivent
      // le courant quand la page défile
      const cx = ox + CENTRE[0] * s, cy = oy + CENTRE[1] * s, courant = this.courant ? clamp(Math.abs(vScroll) / 24, 0, 1) * .32 : 0;
      const pres = this.souris && pointeur ? Math.hypot(pointeur.x - cx, pointeur.y - cy) : Infinity, regard = pres < 240 ? clamp((pointeur.x - cx) / 120, -1, 1) * (1 - pres / 240) * 4 : 0;
      this.regard += (regard - this.regard) * .08;
      const rot = (lean + this.regard + balance + this.penteNage) * RAD * retenue;
      // la tête bouge à part du corps, au bout d'un ressort : elle suit la penche du corps avec du retard et la dépasse (à
      // chaque bond, au changement de sens, elle balance puis se pose), hoche et se tourne au repos, regarde la souris ; elle
      // se balance de côté, et se tend vers le haut à chaque bond (le corps, lui, se contracte)
      if (this.tete) {
        const dts = Math.min(.05, dt / 1000) * this.rythme;
        const vt = (Math.sin(tVie * 1.7) * 3 + Math.sin(tVie * .6) * 2.5 + this.penteNage * .9 + this.regard * .6 + lean * .5) * RAD;
        this.vTheta += (40 * (vt - this.theta) - 4.4 * this.vTheta) * dts; this.theta += this.vTheta * dts;
        this.dxTete += (Math.sin(tVie * 1.1) * 22 + Math.sin(tVie * 2.3) * 9 - this.dxTete) * .2;
        this.dyTete += (-46 * coup * retenue + Math.sin(tVie * .8) * 5 - this.dyTete) * .25;
      }
      const theta = this.theta, ct = Math.cos(theta), st = Math.sin(theta), dxT = this.dxTete, dyT = this.dyTete;
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
        // (sa racine suit la tête, là où elle est, à sa place du logo ou sur son attache : déplacée et pivotée d'autant)
        const t = a.t;
        const tT = t.suivreTete(ox, oy, s, theta, dxT, dyT);
        t.avancer(dt * this.rythme, { temps: tVie, onde: this.onde + agite + coup * (mesure ? 3 : 1.5), penche: a.penche, bob, tourne: tT });
      }
      // le sillage : là où elle vient de passer (il s'efface quand elle s'arrête)
      if (this.sillage) { const tr = this.trace; if (this.enMouvement || Math.abs(v) > .3) { tr.push(cx + bob.x, cy + bob.y); if (tr.length > 44) tr.splice(0, tr.length - 44); } else if (tr.length) tr.splice(0, 2); }
      // la boîte à peindre : la pieuvre et ses tentacules, élargie de ce que la respiration, la contraction, la penche et
      // l'étirement déplacent, du halo, du sillage ; la toile la suit
      const b = { x0: ox + 250 * s - 4, y0: oy + 340 * s - 4, x1: ox + 1292 * s + 4, y1: oy + 916 * s + 4 };
      for (const a of BRAS) { const r = a.t.boite(a.prise && a.prise.lumineux ? 16 : 6); b.x0 = Math.min(b.x0, r.x0); b.y0 = Math.min(b.y0, r.y0); b.x1 = Math.max(b.x1, r.x1); b.y1 = Math.max(b.y1, r.y1); }
      for (let i = 0; i < this.trace.length; i += 2) { b.x0 = Math.min(b.x0, this.trace[i] - 8); b.x1 = Math.max(b.x1, this.trace[i] + 8); b.y0 = Math.min(b.y0, this.trace[i + 1] - 8); b.y1 = Math.max(b.y1, this.trace[i + 1] + 8); }
      // les bulles de la joie montent et s'écartent (freinées par l'eau, portées vers le haut), puis éclatent ; les ondes s'élargissent
      const bulles = this.bulles, ondes = this.ondes, dts = dt / 1000;
      for (let i = bulles.length - 1; i >= 0; i--) {
        const p = bulles[i];
        if (now - p.t0 > p.vie) { bulles.splice(i, 1); continue; }
        const fr = Math.pow(.18, dts);
        p.vx *= fr; p.vy = p.vy * fr - 90 * dts; p.x += (p.vx + Math.sin(Math.max(0, now - p.t0) / 140 + p.ph) * 14) * dts; p.y += p.vy * dts;
        const r = p.r * 2 + 2; b.x0 = Math.min(b.x0, p.x - r); b.x1 = Math.max(b.x1, p.x + r); b.y0 = Math.min(b.y0, p.y - r); b.y1 = Math.max(b.y1, p.y + r);
      }
      for (let i = ondes.length - 1; i >= 0; i--) {
        const o = ondes[i];
        if (now - o.t0 > o.vie) { ondes.splice(i, 1); continue; }
        b.x0 = Math.min(b.x0, o.x - o.r1 - 4); b.x1 = Math.max(b.x1, o.x + o.r1 + 4); b.y0 = Math.min(b.y0, o.y - o.r1 - 4); b.y1 = Math.max(b.y1, o.y + o.r1 + 4);
      }
      const Rm = Math.max(Math.hypot(b.x0 - cx, b.y0 - cy), Math.hypot(b.x1 - cx, b.y1 - cy), Math.hypot(b.x0 - cx, b.y1 - cy), Math.hypot(b.x1 - cx, b.y0 - cy));
      const et = this.etire * retenue, marge = Rm * (Math.abs(k - 1) + Math.abs(rot) + Math.abs(et) * .2) + 4 + (this.lueur ? LARGEUR * s * .35 : 0) + LARGEUR * s * .08;
      b.x0 -= marge; b.y0 -= marge; b.x1 += marge; b.y1 += marge;
      this.cadrer(b, now);
      const dpr = this.dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr, 0, 0, dpr, -this.cx0 * dpr, -this.cy0 * dpr);
      // l'ensemble respire, se contracte, se penche, s'étire dans le sens du bond, autour de son cœur
      // (la joie : un tour complet sur elle-même, qui file puis se pose ; elle tremble comme une gelée, en long puis en large)
      let tourne = 0, gx = 0;
      if (this.tour) { const u = (now - this.tour.t0) / 820; if (u >= 1) this.tour = null; else tourne = this.tour.sens * TAU * (1 - Math.pow(1 - u, 3)); }
      if (this.gelee) { const u = (now - this.gelee.t0) / 760; if (u >= 1) this.gelee = null; else gx = this.gelee.a * Math.sin(u * Math.PI * 5) * Math.pow(1 - u, 1.4); }
      ctx.translate(cx, cy); ctx.rotate(rot + tourne); ctx.scale(k * (1 + gx), k * (1 - gx));
      if (Math.abs(et) > .005) { const ang = this.place.ang || Math.PI / 2; ctx.rotate(ang); ctx.scale(1 + .16 * et, 1 - .1 * et); ctx.rotate(-ang); }
      ctx.translate(-cx, -cy);
      // le corps d'abord : le logo sans ses huit tentacules (dont la place de repos suit leur racine), la tête déformée à part,
      // peint, les places effacées ; puis, dessous (destination-over), la tache de la marque s'il y en a une, le halo, le
      // sillage ; puis les tentacules par-dessus, celles qui luisent et celle qui sort en dernier
      ctx.save(); ctx.transform(s, 0, 0, s, ox + bob.x, oy + bob.y);
      PIEUVRE.corpsVivant(ctx, BRAS.map(a => a.t), this.tete ? theta : 0, this.tete ? dxT : 0, this.tete ? dyT : 0, this.encre);
      ctx.globalCompositeOperation = 'destination-over';
      if (this.tache) { ctx.fillStyle = this.tache.fond; ctx.fill(this.tache.chemin); }
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'destination-over';
      // le halo, s'il y en a un : un dégradé, une seule forme (pas de flou, trop coûteux), qui respire avec elle
      // (la joie l'allume : plus clair, plus large, puis il s'apaise)
      let fl = 0;
      if (this.eclat) { const u = (now - this.eclat.t0) / 950; if (u >= 1) this.eclat = null; else fl = this.eclat.f * Math.pow(1 - u, 2); }
      if (this.lueur || fl > .01) {
        const E = this.ENCRE, r0 = LARGEUR * s * .62 * (1 + .45 * fl), g = ctx.createRadialGradient(cx + bob.x, cy + bob.y, r0 * .25, cx + bob.x, cy + bob.y, r0);
        g.addColorStop(0, rgba(E, Math.min(.9, (this.lueur ? .26 + .08 * Math.sin(tVie * 1.15) : 0) + .45 * fl))); g.addColorStop(1, rgba(E, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx + bob.x, cy + bob.y, r0, 0, TAU); ctx.fill();
      }
      // le sillage : un trait qui s'efface et s'amincit vers l'arrière (en coordonnées de la page : hors des transformations)
      const tr = this.trace, nT = tr.length / 2;
      if (nT > 2) {
        ctx.setTransform(dpr, 0, 0, dpr, -this.cx0 * dpr, -this.cy0 * dpr);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 1; i < nT; i++) {
          const u = i / nT; ctx.strokeStyle = rgba(this.ENCRE, .22 * u * u); ctx.lineWidth = LARGEUR * s * .16 * u;
          ctx.beginPath(); ctx.moveTo(tr[2 * i - 2], tr[2 * i - 1]); ctx.lineTo(tr[2 * i], tr[2 * i + 1]); ctx.stroke();
        }
      }
      ctx.restore();
      const trace = a => PIEUVRE.dessiner(ctx, a.t, { encre: this.encre, vers: `rgb(${a.col.join(',')})`, teinte: a.teinte, lisere: PIEUVRE.lisere });
      const luisantes = [];
      for (const a of BRAS) { if (a.prise && a.prise.lumineux) luisantes.push(a); else if (a !== sortie) trace(a); }
      if (sortie) trace(sortie);
      // les tentacules qui luisent : un halo le long d'elles (large et pâle, puis plus serré et plus franc, qui respire), elles,
      // puis une lueur qui court de la pieuvre à ce qu'elles tiennent
      for (const a of luisantes) {
        const { xs, ys } = a.t.contour(), mu = a.t.mouvement(), E = a.col;
        if (mu > .01 && xs.length > 2) {
          const resp = .5 + .5 * Math.sin(tVie * 2.2 + a.prise.ph * TAU);
          ctx.beginPath(); ctx.moveTo(xs[0], ys[0]); for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], ys[i]); ctx.closePath();
          ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          ctx.strokeStyle = rgba(E, .13 * mu); ctx.lineWidth = 16 + 6 * resp; ctx.stroke();
          ctx.strokeStyle = rgba(eclairci(E, .3), .3 * mu); ctx.lineWidth = 5 + 2 * resp; ctx.stroke();
        }
        trace(a);
        if (mu > .5) {
          const t = a.t, u = ((tVie * .9 + a.prise.ph) % 1), kr = t.bornes(a.but)[0], kk = Math.round(kr + (t.M - kr) * u), x = t.X[kk], y = t.Y[kk];
          const g = ctx.createRadialGradient(x, y, 0, x, y, 11);
          g.addColorStop(0, rgba(eclairci(E, .8), .85)); g.addColorStop(.4, rgba(E, .4)); g.addColorStop(1, rgba(E, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill();
        }
      }
      // la joie, par-dessus : les ondes (un cercle qui s'élargit et pâlit), les bulles (un rond clair, un reflet ; certaines pleines),
      // qui éclatent à la fin (un anneau qui s'ouvre et s'efface)
      if (ondes.length || bulles.length) {
        ctx.setTransform(dpr, 0, 0, dpr, -this.cx0 * dpr, -this.cy0 * dpr);
        for (const o of ondes) {
          const u = (now - o.t0) / o.vie;
          if (u < 0) continue;
          ctx.strokeStyle = rgba(this.ENCRE, .5 * Math.pow(1 - u, 1.5)); ctx.lineWidth = Math.max(.6, LARGEUR * s * .05 * (1 - u));
          ctx.beginPath(); ctx.arc(o.x, o.y, o.r1 * (.3 + .7 * (1 - Math.pow(1 - u, 2.4))), 0, TAU); ctx.stroke();
        }
        for (const p of bulles) {
          const u = Math.max(0, (now - p.t0) / p.vie), eclate = u > .84, v = eclate ? (u - .84) / .16 : 0, r = p.r * (Math.min(1, u * 6) + v * 1.2), al = eclate ? .85 * (1 - v) : .85;
          ctx.strokeStyle = rgba(p.col, al); ctx.lineWidth = eclate ? Math.max(.4, 1.6 * (1 - v)) : 1.6;
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU);
          if (p.plein && !eclate) { ctx.fillStyle = rgba(p.col, .55); ctx.fill(); } else ctx.stroke();
          if (!eclate && r > 2) { ctx.fillStyle = rgba(eclairci(p.col, .7), .9); ctx.beginPath(); ctx.arc(p.x - r * .35, p.y - r * .35, r * .22, 0, TAU); ctx.fill(); }
        }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.raf = requestAnimationFrame(t => this.image(t));
    }
  }

  /* ---------- la créature de l'en-tête : à la place du dessin de l'hôte ---------- */
  let tete = null, hote = null, svg = null, attend = false, repit = 0;
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
    tete = new Creature({ encre: o.encre || getComputedStyle(h).color || '#ffffff', placer: placeHote, vie: 1.4, rythme: 1.3, tete: false,
      eveil: () => { if (svg) svg.style.visibility = 'hidden'; lireDessin(tete); },
      sommeil: () => { if (svg) svg.style.visibility = ''; } });
    if (intro()) attendreIntro(); else tete.demarrer();
    return tete;
  }
  const habite = el => !!(tete && tete.vivant && hote && el && (el === hote || hote.contains(el) || el.contains(hote)));

  return { actif, habiter, habite, suspendre: (ms = 40) => { repit = performance.now() + ms; }, creer: o => (actif ? new Creature(o) : null), reagir: (genre, vers) => { if (tete) tete.reagir(genre, vers); },
    vers: (el, o) => (tete ? tete.vers(el, o) : Promise.resolve(false)), revenir: () => { if (tete) tete.revenir(); }, sortie: () => (tete ? tete.sortie() : 0), arreter: () => { if (tete) tete.arreter(); } };
})();
