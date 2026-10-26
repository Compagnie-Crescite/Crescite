/* Les vraies tentacules du logo (D.pieuvre, fait par maquettes/pieuvre.py) : huit tentacules du dessin quittent la
   pieuvre pour aller chercher un spectacle, avec leur épaisseur, de la racine à la pointe ; le reste de la pieuvre (la
   tête, l'œil, les grandes boucles du bas) ne bouge pas. Au repos, chaque tentacule retombe exactement sur le logo, et
   ondule à peine. build.py l'ajoute aux pages qui ont la scène de la pieuvre (la 10 et la synthèse).

   Comment. Chaque tentacule a une épine (de sa racine, fixe, à sa pointe) et une peau (son propre contour, noté le long
   de l'épine : abscisse, décalage le long de la tangente, décalage le long de la normale). Une pose, c'est une épine :
   l'angle et la longueur de chacun de ses segments. Celle du repos est celle du logo ; celle d'un titre garde la racine
   (ses premiers 12 %), part dans le même sens, rejoint le titre (le corps de la tentacule, étiré), passe dessous et
   s'enroule (ses derniers 30 %, qui s'effilent). D'une pose à l'autre, on mélange les angles : la tentacule se déroule
   et s'enroule, au lieu de glisser en ligne droite d'une forme à l'autre. La peau est reposée sur l'épine à chaque image.
   Prolongée (racine : .7, au téléphone), une boucle reste entière et c'est sa descente qui s'étire : une courbe raide, aux
   grands rayons, qui arrive à plat sur le titre ; angles et longueurs se mêlent alors ensemble, pour qu'aucune image du
   trajet ne casse la tangente.

   PIEUVRE.creer() → les tentacules, dans l'ordre de D.pieuvre.bras : { cle, cote, i, ... }
     t.poser(ox, oy, s)          l'origine du dessin à l'écran (px) et l'échelle (px par unité du dessin)
     t.viser(cible, duree)       cible : { cle, x, y, sens, U, mobile, marge, racine, corps, tension } (le point d'accroche d'un
                                 titre, à l'écran ; sens 1 : la tentacule continue vers la droite sous le titre, -1 vers la
                                 gauche ; U : la longueur à souligner, en px ; marge : la place derrière le point d'accroche, en
                                 px, jusqu'au bord de l'écran : elle arrive à plat de derrière, d'autant plus loin qu'elle vient
                                 de loin, mais toute la courbe tient dans cette place ; racine et corps : les fractions de son
                                 épine qui restent telles quelles dans le logo (.12 par défaut) et où commence la pointe (.7) :
                                 racine: .7 garde une boucle entière et la prolonge depuis sa descente ; tension, de 0 à 1 :
                                 la pointe se déroule) ou null (le repos). Elle y va depuis où elle en est, en duree ms (0 : d'un
                                 coup). La même cible (même clé) redonnée, déplacée : le trajet continue vers sa nouvelle place.
     t.avancer(dt, { temps, onde, penche, bob }) → vrai tant qu'elle se déplace. temps : en secondes (l'ondulation) ;
                                 onde : son ampleur (0 : immobile, 1 : normale) ; penche : un angle, vers où elle se
                                 penche au repos ; bob : { x, y }, le flottement de toute la pieuvre, en px
     t.pointe()                  le bout de la tentacule au repos, à l'écran (sans le flottement), { x, y }
     t.racine()                  sa racine à l'écran
     t.boite()                   sa boîte à l'écran, liseré compris : { x0, y0, x1, y1 }
     t.distance(x, y, repos)     la distance du point à la tentacule telle qu'elle est (px), hors de sa racine ; repos : ou
                                 à sa place dans le logo (qu'on la reconnaisse encore quand elle s'est tendue)
     t.mouvement()               0 au repos, 1 tendue vers un titre
     PIEUVRE.corps(ts)           le reste de la pieuvre (Path2D, unités du dessin, à remplir en 'evenodd') : le logo sans
                                 ces tentacules, qu'on dessine à part, par-dessus
     PIEUVRE.dessiner(g, t, { encre, vers, teinte, lisere })   la tentacule : son liseré (là où elle passe sur la pieuvre),
                                 puis elle, de l'encre (vers la pointe, mêlée de la couleur vers, selon teinte)
   Tout se dessine dans le repère de la page (px CSS) : le contexte g porte déjà l'échelle de l'écran (dpr). */
const PIEUVRE = (() => {
  'use strict';
  const G = (typeof D !== 'undefined' && D && D.pieuvre) || null;
  const RAC = 0.12, CORPS = 0.7;                 // la racine (ne bouge jamais vers un titre), le début de la pointe
  const lerp = (a, b, t) => a + (b - a) * t;
  const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const TAU = Math.PI * 2;

  class Tentacule {
    constructor(b, i) {
      this.cle = b.cle; this.cote = b.cote; this.i = i; this.plat = !!b.plat;
      const E = b.epine, h = b.pas, n = E.length / 2 - 1;
      this.h = h; this.n = n; this.L0 = n * h;
      // la pose a r fois plus de segments que l'épine (une tentacule étirée, ou dont une courte part se déploie, garde une
      // courbe lisse jusque dans l'enroulement de sa pointe)
      const r = Math.max(1, Math.ceil(450 / n)), M = n * r;
      this.r = r; this.M = M; this.Kr = Math.round(RAC * n) * r; this.Kb = Math.round(CORPS * n) * r;
      // l'épine au repos, raffinée : positions (unités du dessin) et angles (les angles aux points de l'épine, interpolés
      // linéairement, comme pieuvre.py les a pris pour noter la peau)
      const seg = [];
      for (let j = 0; j < n; j++) seg.push(Math.atan2(E[2 * j + 3] - E[2 * j + 1], E[2 * j + 2] - E[2 * j]));
      for (let j = 1; j < n; j++) { while (seg[j] - seg[j - 1] > Math.PI) seg[j] -= TAU; while (seg[j] - seg[j - 1] < -Math.PI) seg[j] += TAU; }
      const thE = new Float64Array(n + 1);
      thE[0] = seg[0]; thE[n] = seg[n - 1];
      for (let j = 1; j < n; j++) thE[j] = (seg[j - 1] + seg[j]) / 2;
      this.RX = new Float64Array(M + 1); this.RY = new Float64Array(M + 1); this.RT = new Float64Array(M + 1);
      for (let k = 0; k <= M; k++) {
        const x = k / r, j = Math.min(n - 1, Math.floor(x)), f = x - j;
        this.RX[k] = lerp(E[2 * j], E[2 * j + 2], f); this.RY[k] = lerp(E[2 * j + 1], E[2 * j + 3], f); this.RT[k] = lerp(thE[j], thE[j + 1], f);
      }
      this.RS = new Float64Array(M); this.RL = new Float64Array(M);   // l'angle et la longueur de chaque segment raffiné
      for (let k = 0; k < M; k++) { this.RS[k] = seg[Math.floor(k / r)]; this.RL[k] = Math.hypot(this.RX[k + 1] - this.RX[k], this.RY[k + 1] - this.RY[k]); }
      // la peau
      const P = b.peau, m = P.length / 3;
      this.m = m; this.S = new Float64Array(m); this.T = new Float64Array(m); this.N = new Float64Array(m);
      for (let k = 0; k < m; k++) { this.S[k] = P[3 * k]; this.T[k] = P[3 * k + 1]; this.N[k] = P[3 * k + 2]; }
      // la place de repos (le contour du logo), en unités du dessin ; et la partie de la peau hors de la racine (le
      // liseré ne coupe pas la tentacule de son corps)
      this.VX = new Float64Array(m); this.VY = new Float64Array(m);
      for (let k = 0; k < m; k++) {
        const x = this.S[k] / h * r, kk = Math.min(M - 1, Math.max(0, Math.floor(x))), f = x - kk;
        const cx = lerp(this.RX[kk], this.RX[kk + 1], f), cy = lerp(this.RY[kk], this.RY[kk + 1], f), a = lerp(this.RT[kk], this.RT[kk + 1], f);
        const ca = Math.cos(a), sa = Math.sin(a);
        this.VX[k] = cx + this.T[k] * ca - this.N[k] * sa; this.VY[k] = cy + this.T[k] * sa + this.N[k] * ca;
      }
      this.rac = RAC; this.libreRac = -1; this.libre = this.libres(RAC);
      // le repos dans le repère de l'écran : posé par poser()
      this.ox = 0; this.oy = 0; this.s = 1; this.pose_ = false;
      this.pose = null; this.depuis = null; this.but = null; this.q = 1; this.duree = 0; this.cible = null; this.bob = { x: 0, y: 0 };
      this.X = new Float64Array(M + 1); this.Y = new Float64Array(M + 1);   // l'épine de l'image en cours, à l'écran
      this.bx = { x0: 0, y0: 0, x1: 0, y1: 0 };
      this.poly = null;
    }
    poser(ox, oy, s) {
      this.ox = ox; this.oy = oy; this.s = s; this.pose_ = true;
      this.pose = null; this.depuis = null; this.q = 1;
    }
    racine() { return { x: this.ox + this.RX[0] * this.s, y: this.oy + this.RY[0] * this.s }; }
    // la partie de la peau hors de la racine (le liseré ne coupe pas la tentacule de son corps), pour une racine de rac fois l'épine
    libres(rac) {
      if (rac === this.libreRac) return this.libre;
      const sL = rac * this.L0, m = this.m;
      let k0 = 0; while (k0 < m && this.S[k0] < sL) k0++;
      let k1 = m - 1; while (k1 > 0 && this.S[k1] < sL) k1--;
      this.libreRac = rac;
      return this.libre = [k0, k1];
    }
    // les indices de la pose visée : la fin de la racine et le début de la pointe (ceux de la cible, sinon ceux du dessin)
    bornes(c) {
      const n = this.n, r = this.r, kr = Math.round((c && c.racine != null ? c.racine : RAC) * n) * r;
      const kb = Math.round((c && c.corps != null ? c.corps : CORPS) * n) * r;
      return [Math.min(kr, this.M - 2 * r), Math.max(Math.min(kb, this.M - r), kr + r)];
    }
    pointe() { return { x: this.ox + this.RX[this.M] * this.s, y: this.oy + this.RY[this.M] * this.s }; }
    // une pose : l'angle (sg) et la longueur (ln) de chaque segment, l'angle aux points (th) ; mu : 0 au repos, 1 tendue
    reposPose(temps = 0, onde = 0, penche = 0) {
      const M = this.M, sg = new Float64Array(M), th = new Float64Array(M + 1), ln = new Float64Array(M);
      for (let k = 0; k < M; k++) ln[k] = this.RL[k] * this.s;
      const ph = this.i * 2.399;
      const dev = x => (onde ? onde * (0.075 * Math.pow(x, 1.4) * Math.sin(temps * 1.3 + ph - x * 3.4) + 0.03 * x * Math.sin(temps * .55 + ph * 1.7)) : 0) + penche * x;
      for (let k = 0; k < M; k++) sg[k] = this.RS[k] + dev((k + .5) / M);
      for (let k = 0; k <= M; k++) th[k] = this.RT[k] + dev(k / M);
      return { sg, th, ln, mu: 0 };
    }
    // vers un titre : la racine telle quelle, le corps jusqu'au point d'accroche, la pointe dessous puis enroulée
    viseePose(c, bob = { x: 0, y: 0 }) {
      const M = this.M, [Kr, Kb] = this.bornes(c), s = this.s;
      const sg = new Float64Array(M), ln = new Float64Array(M), th = new Float64Array(M + 1);
      for (let k = 0; k < Kr; k++) { sg[k] = this.RS[k]; ln[k] = this.RL[k] * s; }
      const px = this.ox + this.RX[Kr] * s + bob.x, py = this.oy + this.RY[Kr] * s + bob.y, a0 = this.RS[Math.max(0, Kr - 1)];
      // le corps : une courbe qui part dans le sens de la racine et arrive à plat sur le titre
      const dx = c.x - px, dy = c.y - py, d = Math.hypot(dx, dy), kk = d * (c.mobile ? .5 : .42), du = c.sens < 0 ? -1 : 1;
      const prolonge = c.racine != null;
      // le bras de départ : au téléphone, depuis la racine du dessin, elle ne part pas loin dans son sens (elle resterait hors
      // de l'écran) ; prolongée depuis une racine choisie, elle part dans le sens qu'elle a là et s'infléchit tôt
      const k1 = prolonge ? kk * .66 : c.mobile ? Math.min(kk, 70) : kk;
      const c1x = px + Math.cos(a0) * k1, c1y = py + Math.sin(a0) * k1;
      const courbe = k2 => {
        const c2x = c.x - du * k2, c2y = c.y, pts = [];
        for (let j = 0; j <= 64; j++) {
          const u = j / 64, b0 = (1 - u) ** 3, b1 = 3 * (1 - u) ** 2 * u, b2 = 3 * (1 - u) * u * u, b3 = u ** 3;
          pts.push([b0 * px + b1 * c1x + b2 * c2x + b3 * c.x, b0 * py + b1 * c1y + b2 * c2y + b3 * c.y]);
        }
        return pts;
      };
      // elle arrive à plat, de derrière le point d'accroche, d'autant plus loin qu'elle vient de loin. Avec une marge (la place
      // qu'il y a derrière, jusqu'au bord de l'écran), le recul se réduit jusqu'à ce que toute la courbe y tienne. Prolongée,
      // elle prend au contraire toute la place qu'on lui laisse, jusqu'à une ampleur de 90 à 150 px selon la hauteur à
      // descendre : une courbe raide, aux grands rayons, qui s'infléchit d'abord vers l'arrière puis balaie jusqu'au titre.
      // Jamais moins de 12 px de recul : l'arrivée reste à plat, sans cassure de tangente avec le souligné
      let k2 = kk * .85, place = c.marge;
      if (prolonge && place != null) { place = Math.min(place, Math.max(90, Math.min(150, .45 * Math.abs(dy)))); k2 = Math.max(k2, 3 * place); }
      let corps = courbe(k2);
      if (place != null) {
        const depasse = pts => pts.reduce((m, p) => Math.max(m, du * (c.x - p[0])), 0);
        if (depasse(corps) > place) {
          let bas = 0, haut = k2;
          for (let i = 0; i < 9; i++) { const mi = (bas + haut) / 2; if (depasse(courbe(mi)) > place) haut = mi; else bas = mi; }
          k2 = Math.max(12, bas); corps = courbe(k2);
        }
      }
      // la pointe : sous le titre, puis elle s'enroule (sa courbure croît vers le bout)
      const U = Math.max(8, c.U || 0), pointe = [];
      for (let j = 0; j <= 24; j++) pointe.push([c.x + du * U * j / 24, c.y]);
      // (tension : un titre qu'on tire déroule la pointe)
      const Lc = c.mobile ? 34 : 46, NC = 30, dl = Lc / NC, sens = du < 0 ? 1 : -1, k0 = 1.5 * Math.PI * 2.3 / Lc * (1 - .92 * (c.tension || 0));
      let ang = du < 0 ? Math.PI : 0, x = c.x + du * U, y = c.y;
      for (let j = 1; j <= NC; j++) {
        const kap = k0 * Math.pow((j - .5) / NC, 1.3);
        ang += sens * kap * dl * .5; x += Math.cos(ang) * dl; y += Math.sin(ang) * dl; ang += sens * kap * dl * .5;
        pointe.push([x, y]);
      }
      const reparti = (pts, nseg, k, prec) => {
        // nseg segments de même longueur le long de pts ; leurs angles, déroulés depuis prec
        const cum = [0];
        for (let j = 1; j < pts.length; j++) cum.push(cum[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
        const L = cum[cum.length - 1], q = [];
        for (let j = 0, a = 0; j <= nseg; j++) {
          const v = L * j / nseg;
          while (a < cum.length - 2 && cum[a + 1] < v) a++;
          const f = (v - cum[a]) / Math.max(1e-9, cum[a + 1] - cum[a]);
          q.push([lerp(pts[a][0], pts[a + 1][0], f), lerp(pts[a][1], pts[a + 1][1], f)]);
        }
        for (let j = 0; j < nseg; j++) {
          let g = Math.atan2(q[j + 1][1] - q[j][1], q[j + 1][0] - q[j][0]);
          while (g - prec > Math.PI) g -= TAU; while (g - prec < -Math.PI) g += TAU;
          sg[k + j] = prec = g; ln[k + j] = Math.max(1e-6, L / nseg);
        }
        return prec;
      };
      const p1 = reparti(corps, Kb - Kr, Kr, Kr ? sg[Kr - 1] : a0);
      reparti(pointe, M - Kb, Kb, p1);
      th[0] = sg[0]; th[M] = sg[M - 1];
      for (let k = 1; k < M; k++) th[k] = (sg[k - 1] + sg[k]) / 2;
      return { sg, th, ln, mu: 1, prolonge };
    }
    viser(cible, duree = 600) {
      const meme = !!cible === !!this.cible && (!cible || (cible.cle === this.cible.cle));
      this.cible = cible;
      // (la racine de la dernière cible reste celle du liseré et de l'effilement, le temps qu'elle revienne au repos)
      if (cible) { this.derniere = cible; this.rac = cible.racine != null ? cible.racine : RAC; }
      if (!this.pose_ || (meme && this.pose)) return;   // la même cible (peut-être déplacée) : le trajet continue
      this.depuis = this.pose || this.reposPose();
      this.but = cible ? this.viseePose(cible, this.bob) : null;
      // qui s'allonge se déroule d'abord, puis s'étire ; qui raccourcit se rétracte d'abord, puis s'enroule
      const long = p => p.ln.reduce((a, b) => a + b, 0);
      this.etire = long(this.but || this.reposPose()) >= long(this.depuis);
      this.q = duree > 0 ? 0 : 1; this.duree = duree;
    }
    mouvement() { return this.pose ? this.pose.mu : 0; }
    avancer(dt, o = {}) {
      const repos = this.reposPose(o.temps || 0, o.onde || 0, o.penche || 0), bob = this.bob = o.bob || { x: 0, y: 0 };
      if (this.cible) this.but = this.viseePose(this.cible, bob);
      let bouge = false;
      if (this.q < 1) { this.q = Math.min(1, this.q + dt / Math.max(1, this.duree)); bouge = true; }
      const B = this.cible ? this.but : repos;
      let P = B;
      if (this.q < 1 && this.depuis) {
        const A = this.depuis, q = this.q, M = this.M;
        const tot = ease(q), tot1 = ease(Math.min(1, q / .7)), tot2 = ease(Math.max(0, (q - .3) / .7));
        // (prolongée, angles et longueurs vont ensemble : à chaque image une courbe lisse, sans cassure de tangente)
        const ens = !!(A.prolonge || B.prolonge), wA = ens ? tot : this.etire ? tot1 : tot2, wL = ens ? tot : this.etire ? tot2 : tot1;
        // les angles, alignés sur ceux de départ (même tour), puis mêlés
        const sg = new Float64Array(M), th = new Float64Array(M + 1), ln = new Float64Array(M);
        const dec = Math.round((A.sg[0] - B.sg[0]) / TAU) * TAU;
        for (let k = 0; k < M; k++) { sg[k] = lerp(A.sg[k], B.sg[k] + dec, wA); ln[k] = lerp(A.ln[k], B.ln[k], wL); }
        for (let k = 0; k <= M; k++) th[k] = lerp(A.th[k], B.th[k] + dec, wA);
        P = { sg, th, ln, mu: lerp(A.mu, B.mu, tot), prolonge: ens };
      }
      this.pose = P;
      // l'épine à l'écran
      const X = this.X, Y = this.Y;
      X[0] = this.ox + this.RX[0] * this.s + bob.x; Y[0] = this.oy + this.RY[0] * this.s + bob.y;
      for (let k = 0; k < this.M; k++) { X[k + 1] = X[k] + P.ln[k] * Math.cos(P.sg[k]); Y[k + 1] = Y[k] + P.ln[k] * Math.sin(P.sg[k]); }
      this.poly = null;
      return bouge;
    }
    // un point de la peau (abscisse, décalages) dans la pose en cours, à l'écran
    point(sv, tv, nv, out) {
      const P = this.pose, s = this.s, x = sv / this.h * this.r, M = this.M;
      const k = Math.min(M - 1, Math.max(0, Math.floor(x))), f = Math.min(1, Math.max(0, x - k));
      const cx = lerp(this.X[k], this.X[k + 1], f), cy = lerp(this.Y[k], this.Y[k + 1], f), a = lerp(P.th[k], P.th[k + 1], f);
      // vers un titre, la pointe s'effile (un bout coupé net devient pointu) : au-delà de la moitié, et hors de la racine
      const u = sv / this.L0, e = P.mu * lisse(Math.max(.5, this.rac + .05), 1, u) * (this.plat ? .9 : .45);
      const ca = Math.cos(a), sa = Math.sin(a), tt = tv * s * (1 - e * .8), nn = nv * s * (1 - e);
      out[0] = cx + tt * ca - nn * sa; out[1] = cy + tt * sa + nn * ca;
    }
    // le contour de la tentacule à l'écran : la peau, et des points ajoutés là où elle s'étire (pas plus de 2,5 px entre deux)
    contour() {
      if (this.poly) return this.poly;
      const m = this.m, S = this.S, T = this.T, N = this.N, xs = [], ys = [], p = [0, 0], q = [0, 0], libre = this.libres(this.rac);
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      this.point(S[0], T[0], N[0], p);
      for (let k = 0; k < m; k++) {
        if (k) {
          this.point(S[k], T[k], N[k], q);
          const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
          if (d > 2.5) {
            const nb = Math.min(40, Math.ceil(d / 2.5));
            for (let j = 1; j < nb; j++) { const f = j / nb, r = [0, 0]; this.point(lerp(S[k - 1], S[k], f), lerp(T[k - 1], T[k], f), lerp(N[k - 1], N[k], f), r); xs.push(r[0]); ys.push(r[1]); }
          }
          p[0] = q[0]; p[1] = q[1];
        }
        xs.push(p[0]); ys.push(p[1]);
        if (k === libre[0]) this.debutLibre = xs.length - 1;
        if (k === libre[1]) this.finLibre = xs.length - 1;
      }
      for (let k = 0; k < xs.length; k++) { if (xs[k] < x0) x0 = xs[k]; if (xs[k] > x1) x1 = xs[k]; if (ys[k] < y0) y0 = ys[k]; if (ys[k] > y1) y1 = ys[k]; }
      this.bx = { x0, y0, x1, y1 };
      this.poly = { xs, ys };
      return this.poly;
    }
    boite(marge = 4) { this.contour(); const b = this.bx; return { x0: b.x0 - marge, y0: b.y0 - marge, x1: b.x1 + marge, y1: b.y1 + marge }; }
    distance(x, y, repos = false) {
      let d = Infinity;
      const seg = (ax, ay, bx, by) => {
        const vx = bx - ax, vy = by - ay, l = vx * vx + vy * vy, t = l ? Math.min(1, Math.max(0, ((x - ax) * vx + (y - ay) * vy) / l)) : 0;
        d = Math.min(d, Math.hypot(x - ax - t * vx, y - ay - t * vy));
      };
      for (let k = this.Kr; k < this.M; k++) seg(this.X[k], this.Y[k], this.X[k + 1], this.Y[k + 1]);
      if (repos) {
        const s = this.s, bx = this.ox + this.bob.x, by = this.oy + this.bob.y;
        for (let k = this.Kr; k < this.M; k++) seg(bx + this.RX[k] * s, by + this.RY[k] * s, bx + this.RX[k + 1] * s, by + this.RY[k + 1] * s);
      }
      return d;
    }
  }

  const chemin = (g, xs, ys, de = 0, a = xs.length - 1, ferme = true) => {
    g.beginPath(); g.moveTo(xs[de], ys[de]);
    for (let k = de + 1; k <= a; k++) g.lineTo(xs[k], ys[k]);
    if (ferme) g.closePath();
  };

  return {
    pret: !!(G && G.bras && G.bras.length),
    lisere: (G && G.lisere) || 2.5,
    creer() { return this.pret ? G.bras.map((b, i) => new Tentacule(b, i)) : []; },
    // le corps de la pieuvre : le logo sans la place de repos de ces tentacules (en unités du dessin, à remplir en
    // 'evenodd'). Leurs contours sont ceux du logo : les bords communs s'annulent dans le même tracé, sans laisser de trace,
    // et chaque tentacule, dessinée par-dessus, recouvre sa coupe (sa peau entre de 6 unités dans le corps)
    corps(ts, chemins = (typeof D !== 'undefined' && D.logo && D.logo.octopusPaths) || []) {
      const p = new Path2D();
      for (const d of chemins) p.addPath(new Path2D(d));
      for (const t of ts) {
        let a = 0; while (a < t.m && t.S[a] <= 0 && t.T[a] < 0) a++;
        let b = t.m - 1; while (b > 0 && t.S[b] <= 0 && t.T[b] < 0) b--;
        p.moveTo(t.VX[a], t.VY[a]);
        for (let k = a + 1; k <= b; k++) p.lineTo(t.VX[k], t.VY[k]);
        p.closePath();
      }
      return p;
    },
    dessiner(g, t, o = {}) {
      const { xs, ys } = t.contour(), mu = t.mouvement();
      // le liseré : là où elle passe sur la pieuvre, un jour la sépare (comme les tentacules du logo entre elles)
      if (mu > .01 && t.debutLibre != null) {
        g.save(); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = Math.min(1, mu * 2);
        g.lineWidth = 2 * Math.max((o.lisere || 2.5) * t.s, 1.1); g.lineJoin = 'round'; g.lineCap = 'butt'; g.strokeStyle = '#000';
        chemin(g, xs, ys, t.debutLibre, t.finLibre, false); g.stroke();
        g.restore();
      }
      chemin(g, xs, ys);
      if (o.vers && o.teinte > .01) {
        const r = t.racine(), c = t.cible || t.derniere || { x: r.x + 1, y: r.y }, gr = g.createLinearGradient(r.x, r.y, c.x, c.y);
        gr.addColorStop(0, o.encre); gr.addColorStop(.35, o.encre); gr.addColorStop(1, o.vers);
        g.fillStyle = gr; g.globalAlpha = 1;
        g.fill();
        if (o.teinte < .99) { g.globalAlpha = 1 - o.teinte; g.fillStyle = o.encre; g.fill(); g.globalAlpha = 1; }
      } else { g.fillStyle = o.encre; g.fill(); }
    },
  };
})();
