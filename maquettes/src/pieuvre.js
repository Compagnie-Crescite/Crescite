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
     t.poser(ox, oy, s)          l'origine du dessin à l'écran (px) et l'échelle (px par unité du dessin) ; le trajet en cours
                                 est oublié (elle est au repos)
     t.deplacer(ox, oy, s)       la même chose sans rien oublier : une pieuvre qui se déplace garde ses tentacules en route
     t.viser(cible, duree, elastique) cible : { cle, x, y, sens, U, mobile, marge, racine, corps, tension } (le point d'accroche d'un
                                 titre, à l'écran ; sens 1 : la tentacule continue vers la droite sous le titre, -1 vers la
                                 gauche ; U : la longueur à souligner, en px ; marge : la place derrière le point d'accroche, en
                                 px, jusqu'au bord de l'écran : elle arrive à plat de derrière, d'autant plus loin qu'elle vient
                                 de loin, mais toute la courbe tient dans cette place ; racine et corps : les fractions de son
                                 épine qui restent telles quelles dans le logo (.12 par défaut) et où commence la pointe (.7) :
                                 racine: .7 garde une boucle entière et la prolonge depuis sa descente ; epaisseur : la largeur
                                 au moins, en px, de ce qui sort du logo (une petite pieuvre a des tentacules trop fines pour
                                 se voir : la partie déployée s'épaissit jusque-là, sa racine non) ; boucle : la taille de
                                 l'enroulement du bout, en fraction de la normale (1) ; tension, de 0 à 1 :
                                 la pointe se déroule ; rail : l'abscisse (px) d'un couloir le long du bord de l'écran, du
                                 côté d'où elle arrive : pour un titre bien plus bas qu'elle (160 px au moins), elle file
                                 d'abord vers ce couloir, le descend tout droit, puis revient à plat sous le titre (deux
                                 courbes, sans cassure de tangente) ; loin, de 0 à 1 : en route elle s'éloigne (plus fine
                                 d'autant, au milieu du chemin) et revient en avant au titre ; tourne : un angle
                                 (radians) dont sa racine pivote autour de son pied pour partir dans ce sens : la base du
                                 bras se plie, le reste suit, sans cassure) ou null (le repos). Elle y va depuis où elle en est, en duree ms (0 : d'un
                                 coup) ; le mouvement part de la racine quand elle s'allonge, de la pointe quand elle revient ;
                                 elastique : elle revient comme un ressort (la pointe se love un peu trop, se balance, se
                                 pose). La même cible (même clé) redonnée, déplacée : le trajet continue vers sa nouvelle place.
     t.avancer(dt, { temps, onde, penche, bob, tourne }) → vrai tant qu'elle se déplace. temps : en secondes (l'ondulation) ;
                                 onde : son ampleur (0 : immobile, 1 : normale) ; penche : un angle, vers où elle se
                                 penche au repos ; bob : { x, y }, le flottement de toute la pieuvre, en px ; tourne : un
                                 angle (radians) dont toute la tentacule pivote autour de sa racine (la tête qui bouge
                                 l'emmène) : au repos entière, tendue sa racine seule, le reste rejoint sa cible
     t.pointe()                  le bout de la tentacule au repos, à l'écran (sans le flottement), { x, y }
     t.racine()                  sa racine à l'écran
     t.boite()                   sa boîte à l'écran, liseré compris : { x0, y0, x1, y1 }
     t.distance(x, y, repos)     la distance du point à la tentacule telle qu'elle est (px), hors de sa racine ; repos : ou
                                 à sa place dans le logo (qu'on la reconnaisse encore quand elle s'est tendue)
     t.mouvement()               0 au repos, 1 tendue vers un titre
                                 ces tentacules, qu'on dessine à part, par-dessus
     PIEUVRE.corpsVivant(g, ts, theta, dx, dy, encre)   le corps peint de l'encre, la tête déformée (elle tourne de theta
                                 autour du cou, d'autant plus qu'on monte, et se déplace de dx, dy en unités), les places de
                                 repos des tentacules effacées (ce qui doit rester dessous se peint ensuite en
                                 'destination-over') ; les racines des tentacules suivent : PIEUVRE.tete(x, y, PIEUVRE.poids(y), theta, dx, dy, out)
                                 donne la place d'un point du dessin emporté par la tête (la racine d'une tentacule, à
                                 déplacer, avec tourne = theta × PIEUVRE.poids(sa racine))
     PIEUVRE.dessiner(g, t, { encre, vers, teinte, lisere, degrade })   la tentacule : son liseré (là où elle passe sur la
                                 pieuvre), puis elle, de l'encre à sa racine, de la couleur vers dès qu'elle en sort (selon teinte ;
                                 ou d'un dégradé fourni, degrade : un CanvasGradient dans le repère de la page)
   Tout se dessine dans le repère de la page (px CSS) : le contexte g porte déjà l'échelle de l'écran (dpr). */
const PIEUVRE = (() => {
  'use strict';
  const G = (typeof D !== 'undefined' && D && D.pieuvre) || null;
  const RAC = 0.05, CORPS = 0.7;                 // la racine (ne bouge jamais vers un titre : un court pied rigide), le début de la pointe
  const lerp = (a, b, t) => a + (b - a) * t;
  const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const norm = a => Math.atan2(Math.sin(a), Math.cos(a));   // (un angle ramené dans ]-π, π])
  // de a à b (deux suites d'angles le long d'un bras), ce que chacun a à tourner, déroulé : le premier au plus court, chacun
  // des suivants au plus près de ce que tourne son voisin
  const deroule = (a, b, n) => { const d = new Float64Array(n); for (let k = 0; k < n; k++) { const r = b[k] - a[k]; d[k] = k ? d[k - 1] + norm(r - d[k - 1]) : norm(r); } return d; };
  const elas = t => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.exp(-5 * t) * Math.cos(7 * t));   // un ressort : dépasse, se balance, se pose
  const TAU = Math.PI * 2;

  // le contour du logo, finement aplati (un point par unité), rangé dans une grille de 8 unités : pour y recaler la peau
  let GRILLE = null;
  function grille() {
    if (GRILLE) return GRILLE;
    const segs = [], cases = new Map(), cle = (x, y) => (Math.floor(x / 8) * 4096 + Math.floor(y / 8));
    for (const { P, segs: sg } of contours()) {
      let x = 0, y = 0;
      const ligne = (x1, y1) => { segs.push(x, y, x1, y1); x = x1; y = y1; };
      for (const g of sg) {
        if (g[0] === 'M') { x = P[2 * g[1]]; y = P[2 * g[1] + 1]; }
        else if (g[0] === 'L') ligne(P[2 * g[1]], P[2 * g[1] + 1]);
        else {
          const ax = x, ay = y, x1 = P[2 * g[1]], y1 = P[2 * g[1] + 1], x2 = P[2 * g[2]], y2 = P[2 * g[2] + 1], x3 = P[2 * g[3]], y3 = P[2 * g[3] + 1];
          const n = Math.max(2, Math.ceil(Math.hypot(x1 - ax, y1 - ay) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2)));
          for (let j = 1; j <= n; j++) { const u = j / n, v = 1 - u; ligne(v * v * v * ax + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3, v * v * v * ay + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3); }
        }
      }
    }
    for (let i = 0; i < segs.length; i += 4) {
      const k = cle((segs[i] + segs[i + 2]) / 2, (segs[i + 1] + segs[i + 3]) / 2);
      if (!cases.has(k)) cases.set(k, []);
      cases.get(k).push(i);
    }
    return GRILLE = { segs, cases, cle };
  }
  function recaler(t) {
    if (typeof D === 'undefined' || !D.logo || !D.logo.octopusPaths) return;
    const { segs, cases, cle } = grille(), h = t.h, r = t.r, M = t.M;
    for (let k = 0; k < t.m; k++) {
      if (t.S[k] <= 0) continue;   // (la part entrée dans le corps n'est pas sur le contour)
      const x = t.VX[k], y = t.VY[k];
      let best = 1.44, bx = 0, by = 0;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const liste = cases.get(cle(x + dx * 8, y + dy * 8)); if (!liste) continue;
        for (const i of liste) {
          const ax = segs[i], ay = segs[i + 1], vx = segs[i + 2] - ax, vy = segs[i + 3] - ay, l = vx * vx + vy * vy;
          const u = l ? Math.min(1, Math.max(0, ((x - ax) * vx + (y - ay) * vy) / l)) : 0, px = ax + u * vx, py = ay + u * vy, dd = (x - px) ** 2 + (y - py) ** 2;
          if (dd < best) { best = dd; bx = px; by = py; }
        }
      }
      if (best >= 1.44) continue;
      // (le point recalé, puis ses décalages dans le repère de l'épine, pour que la peau dessinée soit la même)
      const xk = t.S[k] / h * r, kk = Math.min(M - 1, Math.max(0, Math.floor(xk))), f = xk - kk;
      const cx = lerp(t.RX[kk], t.RX[kk + 1], f), cy = lerp(t.RY[kk], t.RY[kk + 1], f), a = lerp(t.RT[kk], t.RT[kk + 1], f), ca = Math.cos(a), sa = Math.sin(a);
      const ddx = bx - cx, ddy = by - cy;
      t.T[k] = ddx * ca + ddy * sa; t.N[k] = -ddx * sa + ddy * ca; t.VX[k] = bx; t.VY[k] = by;
    }
  }

  class Tentacule {
    constructor(b, i) {
      this.cle = b.cle; this.cote = b.cote; this.i = i; this.plat = !!b.plat;
      // l'attache : où sa racine va sur la tête quand elle se déploie (x, y, direction), pour une tentacule dont la place de
      // repos ne touche pas la tête ; le parent : la clé de la tentacule dont elle suit l'épine (posé par creer())
      this.att = b.attache ? { x: b.attache[0], y: b.attache[1], dir: b.attache[2] } : null; this.colle = false;
      this.parentCle = b.parent || null; this.parent = null;
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
      this.N0 = Math.abs(this.N[0]);   // (la demi-largeur à la racine)
      // la place de repos (le contour du logo), en unités du dessin ; et la partie de la peau hors de la racine (le
      // liseré ne coupe pas la tentacule de son corps)
      this.VX = new Float64Array(m); this.VY = new Float64Array(m);
      for (let k = 0; k < m; k++) {
        const x = this.S[k] / h * r, kk = Math.min(M - 1, Math.max(0, Math.floor(x))), f = x - kk;
        const cx = lerp(this.RX[kk], this.RX[kk + 1], f), cy = lerp(this.RY[kk], this.RY[kk + 1], f), a = lerp(this.RT[kk], this.RT[kk + 1], f);
        const ca = Math.cos(a), sa = Math.sin(a);
        this.VX[k] = cx + this.T[k] * ca - this.N[k] * sa; this.VY[k] = cy + this.T[k] * sa + this.N[k] * ca;
      }
      // (la peau est recalée sur le contour du logo : reconstruite depuis l'épine, elle en dévie d'un demi-point, ce qui laisse
      // un fil de corps autour de la place de repos d'une tentacule partie ; recalée, découpe, repos et contour coïncident)
      recaler(this);
      this.rac = RAC; this.wmin = 0; this.tourne = 0; this.libreRac = -1; this.libre = this.libres(RAC);
      // (la pointe : les derniers 12 % de la peau, de chaque côté ; le jour s'arrête avant, elle s'enroule sur elle-même)
      { const sB = .88 * this.L0; let a = 0; while (a < m && this.S[a] < sB) a++; let b = m - 1; while (b > 0 && this.S[b] < sB) b--; this.bout = [a, b]; }
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
    deplacer(ox, oy, s) { this.ox = ox; this.oy = oy; this.s = s; this.pose_ = true; }
    // la racine de cette image, en unités du dessin (par rapport à ox, oy), et l'angle dont la racine a pivoté : au repos, celle du
    // dessin ; en se déployant, glissée vers son attache sur la tête (et tournée vers sa direction), selon le mouvement
    // (collée : une fois déployée, la tentacule ne retourne plus à sa place du logo, à côté de la tête ; remontée, elle
    // s'enroule contre la tête, depuis son attache, comme un bras d'une vraie créature)
    // (gl : la part faite du glissement, 0 à sa place du logo, 1 sur son attache ; avancer la mène, avant le déroulement)
    racineEff() {
      const g = this.colle ? 1 : ease(Math.min(1, Math.max(0, this.gl || 0))), a = this.att;
      if (!a || g <= 0) return [this.RX[0], this.RY[0], 0];
      let d = a.dir - this.RS[0]; d = Math.atan2(Math.sin(d), Math.cos(d));
      return [lerp(this.RX[0], a.x, g), lerp(this.RY[0], a.y, g), d * g];
    }
    racine() { const [rx, ry] = this.racineEff(); return { x: this.ox + rx * this.s, y: this.oy + ry * this.s }; }
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
    // le point de l'épine à d px de la racine, à l'écran (et le dernier indice avant lui)
    avancee(d) {
      const X = this.X, Y = this.Y;
      let acc = 0;
      for (let k = 0; k < this.M; k++) {
        const l = Math.hypot(X[k + 1] - X[k], Y[k + 1] - Y[k]);
        if (acc + l >= d) { const f = l ? (d - acc) / l : 0; return { x: lerp(X[k], X[k + 1], f), y: lerp(Y[k], Y[k + 1], f), k }; }
        acc += l;
      }
      return { x: X[this.M], y: Y[this.M], k: this.M - 1 };
    }
    // une pose : l'angle (sg) et la longueur (ln) de chaque segment, l'angle aux points (th) ; mu : 0 au repos, 1 tendue
    reposPose(temps = 0, onde = 0, penche = 0, tourne = 0) {
      const M = this.M, sg = new Float64Array(M), th = new Float64Array(M + 1), ln = new Float64Array(M);
      for (let k = 0; k < M; k++) ln[k] = this.RL[k] * this.s;
      const ph = this.i * 2.399;
      const dev = x => (onde ? onde * (0.075 * Math.pow(x, 1.4) * Math.sin(temps * 1.3 + ph - x * 3.4) + 0.03 * x * Math.sin(temps * .55 + ph * 1.7)) : 0) + penche * x + tourne;
      for (let k = 0; k < M; k++) sg[k] = this.RS[k] + dev((k + .5) / M);
      for (let k = 0; k <= M; k++) th[k] = this.RT[k] + dev(k / M);
      return { sg, th, ln, mu: 0 };
    }
    // vers un titre : la racine telle quelle, le corps jusqu'au point d'accroche, la pointe dessous puis enroulée
    viseePose(c, bob = { x: 0, y: 0 }) {
      const M = this.M, [Kr, Kb] = this.bornes(c), s = this.s, [r0x, r0y, glisse] = this.racineEff();
      let tourne = (this.tourne || 0) + (c.tourne || 0) + glisse;
      const sg = new Float64Array(M), ln = new Float64Array(M), th = new Float64Array(M + 1);
      // (la racine, pivotée de tourne autour de son pied : là où elle finit)
      const rx = this.RX[Kr] - this.RX[0], ry = this.RY[Kr] - this.RY[0];
      const pied = () => { const ct = Math.cos(tourne), st = Math.sin(tourne); return [this.ox + (r0x + rx * ct - ry * st) * s + bob.x, this.oy + (r0y + rx * st + ry * ct) * s + bob.y, this.RS[Math.max(0, Kr - 1)] + tourne]; };
      let [px, py, a0] = pied();
      // pas de détour : elle part à moins de 50° du titre (ni montée pour redescendre, ni l'inverse). Sinon la racine pivote
      // d'autant, en bloc, autour de son pied (de 60° au plus) : un pied qui se tourne, pas de cassure
      { const d0 = norm(Math.atan2(c.y - py, c.x - px) - a0), LIM = .87;
        if (Math.abs(d0) > LIM) { tourne += Math.max(-1.05, Math.min(1.05, d0 - Math.sign(d0) * LIM)); [px, py, a0] = pied(); } }
      for (let k = 0; k < Kr; k++) { sg[k] = this.RS[k] + tourne; ln[k] = this.RL[k] * s; }
      // le corps : une courbe qui part dans le sens de la racine et arrive à plat sur le titre
      const dx = c.x - px, dy = c.y - py, d = Math.hypot(dx, dy), kk = d * (c.mobile ? .5 : .42), du = c.sens < 0 ? -1 : 1;
      const prolonge = c.racine != null;
      // le bras de départ : au téléphone, depuis la racine du dessin, elle ne part pas loin dans son sens (elle resterait hors
      // de l'écran) ; prolongée depuis une racine choisie, elle part dans le sens qu'elle a là et s'infléchit tôt
      const k1 = prolonge ? kk * .8 : c.mobile ? Math.min(kk, 70) : kk;
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
      // le recul est mesuré (de 40 à 80 px selon la hauteur à descendre, et jamais plus que la marge) : elle descend, puis
      // s'infléchit juste ce qu'il faut pour arriver à plat sous le titre, sans détour vers le bord de l'écran. Jamais moins
      // de 12 px de recul : l'arrivée reste à plat, sans cassure de tangente avec le souligné
      let k2 = kk * .85, place = c.marge;
      if (prolonge && place != null) { place = Math.min(place, Math.max(40, Math.min(80, .25 * Math.abs(dy)))); k2 = Math.max(k2, 2.5 * place); }
      let corps;
      // par le côté : vers le couloir (dans son sens, puis tout droit), le couloir descendu, le retour à plat sous le titre
      const rail = c.rail != null && du * (c.x - c.rail) > 20 && dy > 160;
      if (rail) {
        const cub = (x0, y0, x1, y1, x2, y2, x3, y3, de) => { const pts = []; for (let j = de; j <= 64; j++) { const u = j / 64, b0 = (1 - u) ** 3, b1 = 3 * (1 - u) ** 2 * u, b2 = 3 * (1 - u) * u * u, b3 = u ** 3; pts.push([b0 * x0 + b1 * x1 + b2 * x2 + b3 * x3, b0 * y0 + b1 * y1 + b2 * y2 + b3 * y3]); } return pts; };
        // (kD : ce qu'elle continue dans son sens avant de s'infléchir ; une boucle qui part vers le haut monte un peu, pas plus)
        const yM = py + Math.max(70, Math.min(140, dy * .4)), kA = Math.max(30, (yM - py) * .5), kD = Math.max(12, Math.min(36, (yM - py) * .3));
        corps = cub(px, py, px + Math.cos(a0) * kD, py + Math.sin(a0) * kD, c.rail, yM - kA, c.rail, yM, 0)
          .concat(cub(c.rail, yM, c.rail, yM + (c.y - yM) * .5, c.rail, c.y, c.x, c.y, 1));
      } else {
        corps = courbe(k2);
        if (place != null) {
          const depasse = pts => pts.reduce((m, p) => Math.max(m, du * (c.x - p[0])), 0);
          if (depasse(corps) > place) {
            let bas = 0, haut = k2;
            for (let i = 0; i < 9; i++) { const mi = (bas + haut) / 2; if (depasse(courbe(mi)) > place) haut = mi; else bas = mi; }
            k2 = Math.max(12, bas); corps = courbe(k2);
          }
        }
      }
      // la pointe : sous le titre, puis elle s'enroule (sa courbure croît vers le bout)
      const U = Math.max(8, c.U || 0), pointe = [];
      for (let j = 0; j <= 24; j++) pointe.push([c.x + du * U * j / 24, c.y]);
      // (tension : un titre qu'on tire déroule la pointe)
      const Lc = (c.mobile ? 34 : 46) * (c.boucle || 1), NC = 30, dl = Lc / NC, sens = du < 0 ? 1 : -1, k0 = 1.5 * Math.PI * 2.3 / Lc * (1 - .92 * (c.tension || 0));
      let ang = du < 0 ? Math.PI : 0, x = c.x + du * U, y = c.y;
      for (let j = 1; j <= NC; j++) {
        const kap = k0 * Math.pow((j - .5) / NC, 1.3);
        ang += sens * kap * dl * .5; x += Math.cos(ang) * dl; y += Math.sin(ang) * dl; ang += sens * kap * dl * .5;
        pointe.push([x, y]);
      }
      // la profondeur le long du corps : 1 (devant) aux deux bouts, 1 - loin au milieu du chemin
      const z = c.loin ? new Float64Array(M + 1).fill(1) : null;
      const reparti = (pts, nseg, k, prec, zOf) => {
        // nseg segments de même longueur le long de pts ; leurs angles, déroulés depuis prec ; leur profondeur
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
          if (z && zOf) z[k + j] = zOf(j / nseg);
        }
        if (z && zOf) z[k + nseg] = zOf(1);
        return prec;
      };
      const loin = c.loin ? v => 1 - c.loin * lisse(0, .3, v) * lisse(1, .72, v) : null;
      const p1 = reparti(corps, Kb - Kr, Kr, Kr ? sg[Kr - 1] : a0, loin);
      reparti(pointe, M - Kb, Kb, p1, null);
      th[0] = sg[0]; th[M] = sg[M - 1];
      for (let k = 1; k < M; k++) th[k] = (sg[k - 1] + sg[k]) / 2;
      return { sg, th, ln, z, mu: 1, prolonge };
    }
    viser(cible, duree = 600, elastique = false) {
      const meme = !!cible === !!this.cible && (!cible || (cible.cle === this.cible.cle));
      this.cible = cible; this.elastique = !!elastique;
      // (la racine de la dernière cible reste celle du liseré et de l'effilement, le temps qu'elle revienne au repos)
      if (cible) { this.derniere = cible; this.rac = cible.racine != null ? cible.racine : RAC; this.wmin = cible.epaisseur || 0; }
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
      this.tourne = o.tourne || 0;
      const bob = this.bob = o.bob || { x: 0, y: 0 };
      // (une enfant : sa racine est sur l'épine de son parent, là où elle y est au repos, et pivote avec elle ; le parent a avancé avant)
      if (this.parent) {
        const p = this.parent.t, k = this.parent.k, P = p.pose;
        if (P) {
          let d = P.sg[Math.min(k, p.M - 1)] - p.RS[Math.min(k, p.M - 1)]; d = Math.atan2(Math.sin(d), Math.cos(d));
          this.tourne += d; this.s = p.s;
          this.ox = p.X[k] - this.RX[0] * this.s - bob.x; this.oy = p.Y[k] - this.RY[0] * this.s - bob.y; this.pose_ = true;
        }
      }
      // (le repos d'une tentacule glissée sur la tête : sa forme du logo, tournée dans le sens de son attache)
      // (le glissement de la racine vers son attache précède le déroulement : la pièce du logo rejoint la tête, entière, puis
      // se déplie depuis elle ; au retour, elle se replie, puis glisse. delai : la part du trajet que prend le glissement)
      const delai = this.att && !this.colle ? Math.min(.35, Math.hypot(this.att.x - this.RX[0], this.att.y - this.RY[0]) / 800) : 0;
      if (this.q < 1 && this.depuis) this.gl = !delai ? (this.cible || this.colle ? 1 : 0) : this.etire ? Math.min(1, this.q / delai) : Math.min(1, (1 - this.q) / delai);
      else this.gl = this.cible || this.colle ? 1 : 0;
      const glisseR = this.racineEff()[2];
      const repos = this.reposPose(o.temps || 0, o.onde || 0, o.penche || 0, this.tourne + glisseR);
      if (this.cible) this.but = this.viseePose(this.cible, bob);
      let bouge = false;
      if (this.q < 1) { this.q = Math.min(1, this.q + dt / Math.max(1, this.duree)); bouge = true; }
      const B = this.cible ? this.but : repos;
      // (tendue, elle vit encore : une onde légère court le long du bras, nulle à sa racine et à sa pointe, qui reste posée)
      if (this.cible && o.onde) {
        const M = this.M, [Kr] = this.bornes(this.cible), ph = this.i * 2.399, t = o.temps || 0, amp = o.onde * .011;
        for (let k = Kr; k < M; k++) { const x = (k + .5) / M, f = Math.sin(Math.PI * x); B.sg[k] += amp * f * f * Math.sin(t * 1.1 + ph - x * 4); }
        for (let k = Kr; k <= M; k++) { const x = k / M, f = Math.sin(Math.PI * x); B.th[k] += amp * f * f * Math.sin(t * 1.1 + ph - x * 4); }
      }
      let P = B;
      if (this.q < 1 && this.depuis) {
        const A = this.depuis, M = this.M, brut = this.q;
        const q = !delai ? brut : this.etire ? Math.max(0, (brut - delai) / (1 - delai)) : Math.min(1, brut / (1 - delai));
        // le mouvement part de la racine : une onde parcourt la tentacule du pied à la pointe (quand elle s'allonge : elle se
        // déroule, sa pointe encore lovée emportée au bout, puis déployée la dernière) ou de la pointe au pied (quand elle
        // revient : la pointe se love d'abord, puis tout rentre). Chaque segment suit la même courbe, décalée de sa place
        // sur l'épine (l'onde prend la moitié du trajet) : la forme reste lisse à chaque image, sans cassure de tangente ;
        // les longueurs suivent les angles de peu (ce qui se déroule s'étire ensuite ; ce qui rentre se rétracte d'abord)
        // (élastique : les angles dépassent la pose d'arrivée d'un dixième et s'y balancent : la pointe se love un peu trop
        // serrée puis se détend, comme un ressort ; les longueurs, elles, ne dépassent jamais)
        const ONDE = .5, ens = !!(A.prolonge || B.prolonge), allonge = this.etire, eA = this.elastique ? elas : ease;
        const sg = new Float64Array(M), th = new Float64Array(M + 1), ln = new Float64Array(M);
        const avance = u => Math.min(1, Math.max(0, (q - (allonge ? u : 1 - u) * ONDE) / (1 - ONDE)));
        let qm = q;   // (la part du mouvement faite, pour mu)
        // ce que chaque angle a à tourner, déroulé le long du bras (d'un segment au suivant, la rotation la plus proche de
        // celle du voisin) : la forme reste continue à chaque image, sans cassure ; une boucle du logo se déroule en
        // tournant, segment après segment, au lieu de se déchirer là où les angles repassent par ±π
        const D = deroule(A.sg, B.sg, M), DT = deroule(A.th, B.th, M + 1);
        if (this.cible && !this.elastique) {
          // vers une cible, en deux temps, lisibles : la tentacule se ramasse d'abord (sa forme du logo rétrécit vers sa
          // racine, le temps qu'elle glisse sur la tête : au moins 30 % du trajet), puis elle se déroule depuis la tête,
          // de la racine à la pointe (l'onde) : chaque segment prend l'angle visé à son tour, ce qui reste de boucle
          // emporté au bout, de plus en plus petit, comme une fougère. Rien ne pivote en grand, rien ne balaie l'écran
          const Q1 = Math.max(.3, delai), K = lerp(1, .55, ease(Math.min(1, brut / Q1))), q2 = Math.max(0, (brut - Q1) / (1 - Q1));
          const av = u => Math.min(1, Math.max(0, (q2 - u * ONDE) / (1 - ONDE)));
          for (let k = 0; k < M; k++) { const w = ease(av((k + .5) / M)); sg[k] = A.sg[k] + w * D[k]; ln[k] = lerp(A.ln[k] * K, B.ln[k], w); }
          for (let k = 0; k <= M; k++) th[k] = A.th[k] + ease(av(k / M)) * DT[k];
          qm = q2;
        } else {
          for (let k = 0; k < M; k++) {
            const qk = avance((k + .5) / M), wA = eA(qk), wL = ens ? ease(qk) : allonge ? ease(Math.max(0, (qk - .25) / .75)) : ease(Math.min(1, qk / .75));
            sg[k] = A.sg[k] + wA * D[k]; ln[k] = lerp(A.ln[k], B.ln[k], wL);
          }
          for (let k = 0; k <= M; k++) th[k] = A.th[k] + eA(avance(k / M)) * DT[k];
        }
        const z = A.z || B.z ? new Float64Array(M + 1) : null;
        if (z) for (let k = 0; k <= M; k++) { const w = eA(avance(k / M)); z[k] = lerp(A.z ? A.z[k] : 1, B.z ? B.z[k] : 1, w); }
        P = { sg, th, ln, z, mu: lerp(A.mu, B.mu, ease(qm)), prolonge: ens };
      }
      this.pose = P;
      if (this.att && this.collant && P.mu > .999) this.colle = true;   // (collant : la pieuvre de l'accueil)
      // l'épine à l'écran, depuis la racine de cette image (glissée vers son attache en se déployant)
      const X = this.X, Y = this.Y, [r0x, r0y] = this.racineEff();
      X[0] = this.ox + r0x * this.s + bob.x; Y[0] = this.oy + r0y * this.s + bob.y;
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
      const ca = Math.cos(a), sa = Math.sin(a), zk = P.z ? lerp(P.z[k], P.z[k + 1], f) : 1, tt = tv * s * (1 - e * .8) * zk;
      let nn = nv * s * (1 - e);
      // (une largeur minimale, hors de la racine : la partie déployée d'une petite pieuvre reste visible)
      if (this.wmin && P.mu > .001 && u > this.rac) {
        const h = this.wmin / 2 * (1 - e * .6), b = Math.min(1, (u - this.rac) / .08) * P.mu;
        if (Math.abs(nn) < h) nn = lerp(nn, (nv < 0 ? -1 : 1) * h, b);
      }
      // (déployée, pas de taille de guêpe : le dessin s'effile au pied de l'arche ; le bras garde au moins la moitié de sa
      // largeur de racine, et s'amincit doucement vers la pointe)
      if (P.mu > .001 && this.N0 && this.att) { const f = this.N0 * s * (1 - .55 * u) * (1 - e) * P.mu; if (Math.abs(nn) < f) nn = (nv < 0 ? -1 : 1) * f; }
      nn *= zk;   // (au loin, plus fine)
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
        if (k === this.bout[0]) this.debutBout = xs.length - 1;
        if (k === this.bout[1]) this.finBout = xs.length - 1;
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

  /* la tête vivante : le corps du logo en points (ses courbes aplaties), chacun avec son poids de tête (0 au cou, 1 au sommet) ;
     déformé, la tête tourne autour du cou d'autant que le point est haut, et se déplace de (dx, dy) × poids ; les places de
     repos des tentacules suivent leurs racines, emportées rigidement (chaque tentacule reçoit tourne = theta × le poids de sa
     racine, et sa racine déplacée) : le corps et ses bras restent d'un seul tenant */
  const COU = 770, SOMMET = 420, PIVOT = [771, 770];
  const poids = y => lisse(COU, SOMMET, y);
  let CONTOURS = null;
  // les tracés du logo, courbe par courbe (M, L, C, en absolu) : chaque sous-tracé { pts, segs } : pts, tous ses points (de départ,
  // de contrôle, d'arrivée) à plat, segs, ses segments [genre, indices des points] ; et pour chaque point son poids de tête (W)
  function contours(chemins = (typeof D !== 'undefined' && D.logo && D.logo.octopusPaths) || []) {
    if (CONTOURS) return CONTOURS;
    CONTOURS = [];
    for (const d of chemins) {
      const toks = d.match(/[MLCZmlcz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [], pts = [], segs = [];
      let i = 0, cmd = '', x = 0, y = 0, x0 = 0, y0 = 0;
      const num = () => +toks[i++], ajoute = (px, py) => { pts.push(px, py); return pts.length / 2 - 1; };
      while (i < toks.length) {
        if (/^[MLCZmlcz]$/.test(toks[i])) { cmd = toks[i++]; if (cmd === 'Z' || cmd === 'z') { x = x0; y = y0; } continue; }
        if (cmd === 'M' || cmd === 'm') { x = num(); y = num(); x0 = x; y0 = y; segs.push(['M', ajoute(x, y)]); cmd = cmd === 'M' ? 'L' : 'l'; }
        else if (cmd === 'L') { x = num(); y = num(); segs.push(['L', ajoute(x, y)]); }
        else if (cmd === 'l') { x += num(); y += num(); segs.push(['L', ajoute(x, y)]); }
        else if (cmd === 'C' || cmd === 'c') {
          const r = cmd === 'c', ax = x, ay = y;
          const x1 = (r ? ax : 0) + num(), y1 = (r ? ay : 0) + num(), x2 = (r ? ax : 0) + num(), y2 = (r ? ay : 0) + num(), x3 = (r ? ax : 0) + num(), y3 = (r ? ay : 0) + num();
          segs.push(['C', ajoute(x1, y1), ajoute(x2, y2), ajoute(x3, y3)]);
          x = x3; y = y3;
        } else i++;
      }
      if (segs.length > 1) { const P = Float64Array.from(pts), W = new Float64Array(P.length / 2); for (let j = 0; j < W.length; j++) W[j] = poids(P[2 * j + 1]); CONTOURS.push({ P, W, segs }); }
    }
    return CONTOURS;
  }
  // à qui appartient chaque point du contour du logo : les points sur le bord d'une tentacule (à 1,2 unité de sa place de repos)
  // la suivent, rigidement avec sa racine, comme la place de repos elle-même : une courbe dont les deux bouts sont à la même
  // tentacule est transformée rigidement tout entière (une transformation affine conserve une courbe de Bézier), et la découpe
  // reste exacte quand la tête bouge et que la tentacule est partie ; le reste (la tête) se déforme point par point. Calculé
  // une fois (la géométrie est celle du dessin)
  let PROPRIO = null;
  function proprietaires(ts) {
    if (PROPRIO) return PROPRIO;
    const C = contours(), trous = ts.map(t => {
      let i0 = 0; while (i0 < t.m && t.S[i0] <= 0 && t.T[i0] < 0) i0++;
      let i1 = t.m - 1; while (i1 > 0 && t.S[i1] <= 0 && t.T[i1] < 0) i1--;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = i0; i <= i1; i++) { x0 = Math.min(x0, t.VX[i]); x1 = Math.max(x1, t.VX[i]); y0 = Math.min(y0, t.VY[i]); y1 = Math.max(y1, t.VY[i]); }
      return { t, i0, i1, x0: x0 - 2, y0: y0 - 2, x1: x1 + 2, y1: y1 + 2 };
    });
    const d2 = (x, y, ax, ay, bx, by) => { const vx = bx - ax, vy = by - ay, l = vx * vx + vy * vy, u = l ? Math.min(1, Math.max(0, ((x - ax) * vx + (y - ay) * vy) / l)) : 0; const dx = x - ax - u * vx, dy = y - ay - u * vy; return dx * dx + dy * dy; };
    PROPRIO = C.map(({ P }) => {
      const O = new Int8Array(P.length / 2).fill(-1);
      for (let j = 0; j < O.length; j++) {
        const x = P[2 * j], y = P[2 * j + 1];
        let best = 1.44, qui = -1;
        trous.forEach((h, k) => {
          if (x < h.x0 || x > h.x1 || y < h.y0 || y > h.y1) return;
          const t = h.t;
          for (let i = h.i0; i < h.i1; i++) { const dd = d2(x, y, t.VX[i], t.VY[i], t.VX[i + 1], t.VY[i + 1]); if (dd < best) { best = dd; qui = k; } }
        });
        O[j] = qui;
      }
      return O;
    });
    return PROPRIO;
  }
  // un point du dessin, emporté par la tête (poids w) : out = [x, y]
  function tete(x, y, w, theta, dx, dy, out) {
    if (!w) { out[0] = x; out[1] = y; return out; }
    const c = Math.cos(theta * w), si = Math.sin(theta * w), rx = x - PIVOT[0], ry = y - PIVOT[1];
    out[0] = PIVOT[0] + rx * c - ry * si + dx * w; out[1] = PIVOT[1] + rx * si + ry * c + dy * w;
    return out;
  }

  return {
    pret: !!(G && G.bras && G.bras.length),
    lisere: (G && G.lisere) || 2.5,
    COU, SOMMET, poids, contours, tete,
    // le corps vivant, peint dans g (en unités du dessin, le repère déjà posé), de l'encre : le logo déformé par la tête (theta
    // en radians, dx, dy en unités), puis les places de repos des tentacules, emportées avec leurs racines, effacées (le fond
    // de la page s'y voit : ce qui doit rester dessous, une tache, un halo, se peint ensuite en 'destination-over'), élargies
    // d'un pixel : deux bords superposés dans un même tracé laissent un fil d'anticrénelage, pas un effacement qui déborde
    corpsVivant(g, ts, theta, dx, dy, encre = '#fff') {
      const pt = [0, 0], p1 = [0, 0], p2 = [0, 0], C = contours(), O = proprietaires(ts);
      // (le mouvement rigide de chaque tentacule : sa racine emportée par la tête, le reste pivoté d'autant autour d'elle)
      const R = ts.map(t => { const w = poids(t.RY[0]); tete(t.RX[0], t.RY[0], w, theta, dx, dy, pt); return { c: Math.cos(theta * w), si: Math.sin(theta * w), r0x: t.RX[0], r0y: t.RY[0], ddx: pt[0] - t.RX[0], ddy: pt[1] - t.RY[0] }; });
      const rigide = (r, x, y, out) => { const rx = x - r.r0x, ry = y - r.r0y; out[0] = r.r0x + rx * r.c - ry * r.si + r.ddx; out[1] = r.r0y + rx * r.si + ry * r.c + r.ddy; };
      g.beginPath();
      C.forEach(({ P, W, segs }, n) => {
        const o = O[n], place = (j, qui, out) => (qui >= 0 ? rigide(R[qui], P[2 * j], P[2 * j + 1], out) : tete(P[2 * j], P[2 * j + 1], W[j], theta, dx, dy, out));
        let prec = -1;
        for (const sg of segs) {
          if (sg[0] === 'M') { place(sg[1], o[sg[1]], pt); g.moveTo(pt[0], pt[1]); prec = sg[1]; }
          else if (sg[0] === 'L') { place(sg[1], o[sg[1]], pt); g.lineTo(pt[0], pt[1]); prec = sg[1]; }
          else {
            // (les deux bouts à la même tentacule : toute la courbe la suit ; sinon ses points de contrôle suivent chacun leur sort)
            const qui = prec >= 0 && o[prec] >= 0 && o[prec] === o[sg[3]] ? o[prec] : -2;
            place(sg[1], qui === -2 ? o[sg[1]] : qui, p1); place(sg[2], qui === -2 ? o[sg[2]] : qui, p2); place(sg[3], o[sg[3]], pt);
            g.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], pt[0], pt[1]); prec = sg[3];
          }
        }
        g.closePath();
      });
      // (seule la tête se peint : l'arche et l'œil ; le reste du dessin, ce sont les tentacules, qui se peignent elles-mêmes)
      g.save();
      if (this.TETE) { const cl = new Path2D(); for (const [x, y, w, h] of this.TETE) cl.rect(x, y, w, h); g.clip(cl); }
      g.fillStyle = encre; g.fill('evenodd');
      g.restore();
      g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath();
      ts.forEach((t, k) => {
        const { c, si, r0x, r0y, ddx, ddy } = R[k];
        let i0 = 0; while (i0 < t.m && t.S[i0] <= 0 && t.T[i0] < 0) i0++;
        let i1 = t.m - 1; while (i1 > 0 && t.S[i1] <= 0 && t.T[i1] < 0) i1--;
        for (let i = i0; i <= i1; i++) { const rx = t.VX[i] - r0x, ry = t.VY[i] - r0y, x = r0x + rx * c - ry * si + ddx, y = r0y + rx * si + ry * c + ddy; if (i === i0) g.moveTo(x, y); else g.lineTo(x, y); }
        g.closePath();
      });
      // (élargi d'un pixel d'écran au moins : les pixels du bord, à demi couverts, s'effacent entièrement ; douze unités au plus,
      // pour une petite pieuvre)
      const m = g.getTransform(), k = Math.hypot(m.a, m.b) || 1;
      g.fillStyle = '#000'; g.fill(); g.lineWidth = Math.min(2.4 / k, 12); g.lineJoin = 'round'; g.strokeStyle = '#000'; g.stroke();
      g.restore();
    },
    // la palmure : entre deux tentacules voisines sur la tête (du même côté, par ordre d'attache), un creux arrondi comble
    // l'angle de leurs racines, comme la membrane entre les bras d'une pieuvre. Elle paraît avec le déploiement (rien au
    // repos : le logo), et reste pour une tentacule collée à la tête. En px d'écran, avant les tentacules (qui la recouvrent)
    palmure(g, ts, encre = '#fff', portee = 70) {
      for (const cote of ['L', 'R']) {
        const B = ts.filter(t => t.att && t.cote === cote && !t.parent && t.pose).sort((a, b) => a.att.y - b.att.y);
        for (let i = 0; i + 1 < B.length; i++) {
          const a = B[i], b = B[i + 1], al = Math.min(a.colle ? 1 : a.mouvement(), b.colle ? 1 : b.mouvement());
          if (al < .02) continue;
          const pa = a.avancee(portee * a.s), pb = b.avancee(portee * b.s), mx = (a.X[0] + b.X[0]) / 2, my = (a.Y[0] + b.Y[0]) / 2;
          g.beginPath(); g.moveTo(a.X[0], a.Y[0]);
          for (let k = 1; k <= pa.k; k++) g.lineTo(a.X[k], a.Y[k]);
          g.lineTo(pa.x, pa.y); g.quadraticCurveTo(mx, my, pb.x, pb.y);
          for (let k = pb.k; k >= 1; k--) g.lineTo(b.X[k], b.Y[k]);
          g.closePath(); g.fillStyle = encre; g.globalAlpha = al; g.fill();
        }
      }
      g.globalAlpha = 1;
    },
    // (les parents avant leurs enfants : une enfant avance après son parent ; k : l'indice de l'épine du parent où elle prend
    // racine, le plus proche de sa racine au repos)
    creer() {
      if (!this.pret) return [];
      const ts = G.bras.map((b, i) => new Tentacule(b, i));
      for (const t of ts) {
        if (!t.parentCle) continue;
        const p = ts.find(x => x.cle === t.parentCle); if (!p) continue;
        let k = 0, best = Infinity;
        for (let j = 0; j <= p.M; j++) { const d = (p.RX[j] - t.RX[0]) ** 2 + (p.RY[j] - t.RY[0]) ** 2; if (d < best) { best = d; k = j; } }
        t.parent = { t: p, k };
      }
      return ts.sort((a, b) => (a.parent ? 1 : 0) - (b.parent ? 1 : 0) || a.i - b.i);
    },
    // l'ordre de déploiement, par vagues : les deux spirales (0), les boucles (1), les spirales extérieures (2), les queues (3) ;
    // VAGUE : l'écart entre deux vagues (ms) ; ATTENTE : à l'ouverture, ce que la pieuvre met à rejoindre sa place avant la
    // première vague (ms après le geste)
    VAGUE: 70, ATTENTE: 630,
    rang(cle) { const m = /^(spiraleExt|spirale|boucle|queue)/.exec(cle || ''); return m ? { spirale: 0, boucle: 1, spiraleExt: 2, queue: 3 }[m[1]] : 0; },
    // ce que la tête occupe, en unités du dessin (des rectangles [x, y, w, h]) : le corps vivant s'y limite
    TETE: (G && G.tete) || [[600, 330, 310, 272], [755, 540, 140, 125]],

    dessiner(g, t, o = {}) {
      // (une frange s'efface à mesure que sa spirale se déploie : elle n'en reste pas un morceau qui flotte ; elle revient avec elle)
      const al = t.parent ? 1 - ease(t.parent.t.mouvement()) : 1;
      if (al < .02) return;
      const { xs, ys } = t.contour(), mu = t.mouvement();
      // le liseré : là où elle passe sur la pieuvre, un jour la sépare (comme les tentacules du logo entre elles) ; jamais plus
      // d'un quart de la largeur du bras (un bras fin, au téléphone, ne se fait pas hacher par ceux qu'il croise en route), et
      // pas autour de la pointe, qui s'enroule sur elle-même
      if (mu > .01 && t.debutLibre != null && t.debutBout != null && t.debutBout > t.debutLibre && t.finBout < t.finLibre) {
        const largeur = Math.min(2 * (t.N0 || 12) * t.s, t.wmin || Infinity), jour = Math.min(2 * Math.max((o.lisere || 2.5) * t.s, 1.1), .25 * largeur);
        if (jour >= .4) {
          g.save(); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = Math.min(1, mu * 2) * al;
          g.lineWidth = jour; g.lineJoin = 'round'; g.lineCap = 'butt'; g.strokeStyle = '#000';
          chemin(g, xs, ys, t.debutLibre, t.debutBout, false); g.stroke();
          chemin(g, xs, ys, t.finBout, t.finLibre, false); g.stroke();
          g.restore();
        }
      }
      chemin(g, xs, ys);
      if (o.degrade) { g.fillStyle = o.degrade; g.globalAlpha = al; g.fill(); }
      else if (o.vers && o.teinte > .01) {
        const r = t.racine(), c = t.cible || t.derniere || { x: r.x + 1, y: r.y }, gr = g.createLinearGradient(r.x, r.y, c.x, c.y);
        gr.addColorStop(0, o.encre); gr.addColorStop(.18, o.encre); gr.addColorStop(.42, o.vers); gr.addColorStop(1, o.vers);
        g.fillStyle = gr; g.globalAlpha = al;
        g.fill();
        if (o.teinte < .99) { g.globalAlpha = (1 - o.teinte) * al; g.fillStyle = o.encre; g.fill(); }
      } else { g.globalAlpha = al; g.fillStyle = o.encre; g.fill(); }
      // l'articulation : déployée, la racine (glissée sur la tête) est ronde, de la largeur du bras : ni coupe nette de la
      // jambe de l'arche ni coin de peau qui dépasse quand le pied pivote
      if (mu > .01 && t.att && t.N0) {
        const r = t.racine();
        g.beginPath(); g.arc(r.x, r.y, (t.N0 + 1.5) * t.s, 0, TAU); g.fillStyle = o.encre; g.globalAlpha = al * Math.min(1, mu * 3); g.fill();
      }
      g.globalAlpha = 1;
    },
  };
})();
