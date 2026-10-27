/* Les vraies tentacules du logo (D.pieuvre, fait par site/pieuvre.py) : huit tentacules du dessin quittent la
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
     t.suivreTete(ox, oy, s, theta, dx, dy)   deplacer, la tête vivante emportant la tentacule par sa racine du moment (sa place
                                 du logo, ou son attache) ; rend l'angle dont elle tourne avec la tête (tourne, pour avancer)
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
     t.avancer(dt, { temps, onde, penche, bout, bob, tourne }) → vrai tant qu'elle se déplace. temps : en secondes (l'ondulation) ;
                                 onde : son ampleur (0 : immobile, 1 : normale) ; penche : un angle, vers où elle se
                                 penche au repos ; bout : un angle dont sa pointe seule (son dernier cinquième) se courbe
                                 au repos ; bob : { x, y }, le flottement de toute la pieuvre, en px ; tourne : un
                                 angle (radians) dont toute la tentacule pivote autour de sa racine (la tête qui bouge
                                 l'emmène) : au repos entière, tendue sa racine seule, le reste rejoint sa cible
     t.pointe()                  le bout de la tentacule au repos, à l'écran (sans le flottement), { x, y }
     t.racine()                  sa racine à l'écran
     t.boite()                   sa boîte à l'écran, liseré compris : { x0, y0, x1, y1 }
     t.distance(x, y, repos)     la distance du point à la tentacule telle qu'elle est (px), hors de sa racine ; repos : ou
                                 à sa place dans le logo (qu'on la reconnaisse encore quand elle s'est tendue)
     t.mouvement()               0 au repos, 1 tendue vers un titre
                                 ces tentacules, qu'on dessine à part, par-dessus
     PIEUVRE.corpsVivant(g, ts, theta, dx, dy, encre)   la tête peinte de l'encre, déformée (elle tourne de theta
                                 autour du cou, d'autant plus qu'on monte, et se déplace de dx, dy en unités), dans sa seule
                                 découpe : les places de repos des tentacules restent vides (ce qui doit rester dessous se peint
                                 ensuite en 'destination-over') ; les racines des tentacules suivent : PIEUVRE.tete(x, y, PIEUVRE.poids(y), theta, dx, dy, out)
                                 donne la place d'un point du dessin emporté par la tête (pour une tentacule, voir
                                 t.suivreTete, qui le fait depuis sa racine du moment)
     PIEUVRE.dessiner(g, t, { encre, vers, teinte, lisere, degrade })   la tentacule : son liseré (là où elle passe sur la
                                 pieuvre), puis elle, de l'encre à sa racine, de la couleur vers dès qu'elle en sort (selon
                                 teinte ; ou d'un dégradé fourni, degrade : un CanvasGradient dans le repère de la page), et
                                 ses congés à la sortie de la jambe (raccords)
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

  // dans l'eau : une ligne de points qui ondoie de travers (de A px au plus, d'une houle de longueur d'onde lam, sa phase tenant
  // à la place à l'écran : x0, y0, la référence ; sens, le côté où elle file), nulle et à plat à ses deux bouts
  function ondoyer(pts, Amax, lam, phase, x0, y0, sens) {
    const n = pts.length, cum = [0];
    for (let j = 1; j < n; j++) cum.push(cum[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
    const L = cum[n - 1], E = Math.min(L * .3, 90), A = Math.min(Amax, L * .045);
    if (L < 40 || A <= 0) return pts;
    return pts.map((p, j) => {
      const a = pts[Math.max(0, j - 1)], b = pts[Math.min(n - 1, j + 1)], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
      const d = A * lisse(0, E, cum[j]) * lisse(L, L - E, cum[j]) * Math.sin(TAU * (sens * (p[0] - x0) + (p[1] - y0)) / lam + phase);
      return [p[0] - d * ty / tl, p[1] + d * tx / tl];
    });
  }

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
      // (prolonge : elle sort du bas de la tête, à la coupe de la jambe ou de la queue de l'œil, dans leur sens ; attN0, posé par
      // creer() : la demi-largeur du trait qu'elle prolonge là, qu'une tentacule plus large n'y déborde pas)
      this.att = b.attache ? { x: b.attache[0], y: b.attache[1], dir: b.attache[2], prolonge: !!b.prolonge } : null; this.colle = false; this.attN0 = 0;
      this.parentCle = b.parent || null; this.parent = null; this.decor = !!b.decor;
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
      // (les deux bords de la racine, de son pied vers la pointe, sur 80 unités : là où elle se raccorde à la jambe, raccords())
      { const a = [], b = [], [i0, i1] = this.bout;
        for (let k = 0; k < i0; k++) if (this.S[k] <= 80 && this.T[k] > -.5) a.push(k);
        for (let k = m - 1; k > i1; k--) if (this.S[k] <= 80 && this.T[k] > -.5) b.push(k);
        this.bords = [a, b]; this.ix = new Int32Array(m); }
      // le repos dans le repère de l'écran : posé par poser()
      this.ox = 0; this.oy = 0; this.s = 1; this.pose_ = false;
      this.pose = null; this.depuis = null; this.but = null; this.q = 1; this.duree = 0; this.cible = null; this.bob = { x: 0, y: 0 };
      this.X = new Float64Array(M + 1); this.Y = new Float64Array(M + 1);   // l'épine de l'image en cours, à l'écran
      this.bx = { x0: 0, y0: 0, x1: 0, y1: 0 };
      this.poly = null;
    }
    poser(ox, oy, s) {
      this.ox = ox; this.oy = oy; this.s = s; this.pose_ = true; this.tt = null;
      this.pose = null; this.depuis = null; this.q = 1;
    }
    deplacer(ox, oy, s) { this.ox = ox; this.oy = oy; this.s = s; this.pose_ = true; this.tt = null; }
    // la même chose, la tête vivante (PIEUVRE.tete : theta, dx, dy) emportant la tentacule par sa racine de cette image : sa
    // place du logo au repos, son attache sur la jambe une fois glissée (une racine suivie à sa place du logo, en bas, où la tête
    // ne bouge guère, laissait la jambe, qui bouge, se décaler du pied : des marches au raccord). Rend l'angle dont elle tourne
    // avec la tête (tourne, pour avancer)
    suivreTete(ox, oy, s, theta, dx, dy) {
      const [rx, ry] = this.racineEff(), w = poids(ry), pt = tete(rx, ry, w, theta, dx, dy, [0, 0]);
      this.deplacer(ox + (pt[0] - rx) * s, oy + (pt[1] - ry) * s, s);
      this.tt = [ox, oy, theta, dx, dy];   // (la tête de cette image : où raccords() trouve le bord de la jambe, déformé avec elle)
      return theta * w;
    }
    // la pieuvre est remise en page en route (une police qui arrive, une barre de défilement, la fenêtre) : la tentacule garde
    // son trajet là où il en est, ses longueurs à la nouvelle échelle ; sa cible est relue à chaque image de toute façon
    reposer(ox, oy, s) {
      const k = this.s ? s / this.s : 1;
      if (k !== 1) for (const P of [this.pose, this.depuis, this.but]) if (P && P.ln) for (let i = 0; i < P.ln.length; i++) P.ln[i] *= k;
      this.deplacer(ox, oy, s);
    }
    // la racine de cette image, en unités du dessin (par rapport à ox, oy), et l'angle dont la racine a pivoté : au repos, celle du
    // dessin ; en se déployant, glissée vers son attache sur la tête (et tournée vers sa direction), selon le mouvement
    // (collée : une fois déployée, la tentacule ne retourne plus à sa place du logo, à côté de la tête ; remontée, elle
    // s'enroule contre la tête, depuis son attache, comme un bras d'une vraie créature)
    // (gl : la part faite du glissement, 0 à sa place du logo, 1 sur son attache ; avancer la mène, avant le déroulement)
    // (reliée, voir reliePose : la racine ne traverse pas la tête en ligne droite, elle remonte le lien, de sa place du logo
    // jusqu'à son attache, par-dessous)
    racineEff() {
      const g = this.colle ? 1 : ease(Math.min(1, Math.max(0, this.gl || 0))), a = this.att;
      if (!a || g <= 0) return [this.RX[0], this.RY[0], 0];
      let d = a.dir - this.RS[0]; d = Math.atan2(Math.sin(d), Math.cos(d));
      if (this.relie && !this.colle) { const L = this.lien(), [x, y] = L.en((1 - g) * L.L); return [x, y, d * g]; }
      return [lerp(this.RX[0], a.x, g), lerp(this.RY[0], a.y, g), d * g];
    }
    // le lien d'une tentacule dont la place du logo est loin de son attache (la queue, la spirale extérieure) : la courbe que
    // prend son pied, de l'attache (u = 0 : dans le sens de l'attache, comme le prolongement de la jambe) à sa racine du logo
    // (dans le sens où la tentacule y part), en unités du dessin ; en(l) : le point et l'angle à l arc de l'attache
    lien() {
      if (this.lien_) return this.lien_;
      const a = this.att, x0 = a.x, y0 = a.y, x1 = this.RX[0], y1 = this.RY[0], c = Math.hypot(x1 - x0, y1 - y0) * 1.1;
      const t0x = Math.cos(a.dir) * c, t0y = Math.sin(a.dir) * c, t1x = Math.cos(this.RS[0]) * c, t1y = Math.sin(this.RS[0]) * c;
      const N = 96, xs = new Float64Array(N + 1), ys = new Float64Array(N + 1), ls = new Float64Array(N + 1);
      for (let i = 0; i <= N; i++) {
        const u = i / N, u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
        xs[i] = h00 * x0 + h10 * t0x + h01 * x1 + h11 * t1x; ys[i] = h00 * y0 + h10 * t0y + h01 * y1 + h11 * t1y;
        ls[i] = i ? ls[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]) : 0;
      }
      const L = ls[N];
      const en = l => {
        l = Math.min(L, Math.max(0, l));
        let i = 0; while (i < N - 1 && ls[i + 1] < l) i++;
        const f = (l - ls[i]) / Math.max(1e-9, ls[i + 1] - ls[i]);
        return [lerp(xs[i], xs[i + 1], f), lerp(ys[i], ys[i + 1], f), Math.atan2(ys[i + 1] - ys[i], xs[i + 1] - xs[i])];
      };
      return this.lien_ = { L, en };
    }
    // reliée : la tentacule d'un seul tenant, de sa racine du moment, sur le lien, à sa place du logo, qu'elle n'a pas quittée :
    // son pied s'allonge de la pièce du logo jusqu'à la tête (g : 0 au repos, 1 sur l'attache) ; R, sa pose de repos (avec
    // son ondulation). Les segments, tous de même longueur, se partagent le lien parcouru, puis la pièce du logo telle quelle
    reliePose(g, R) {
      const L = this.lien(), M = this.M, lc = g * L.L, tot = lc + this.L0, h = tot / M;
      const sg = new Float64Array(M), th = new Float64Array(M + 1), ln = new Float64Array(M).fill(h * this.s);
      const sur = (A, x, n) => { x = Math.min(n, Math.max(0, x)); const j = Math.min(n - 1, Math.floor(x)); return lerp(A[j], A[j + 1], x - j); };
      for (let k = 0; k < M; k++) { const l = (k + .5) * h; sg[k] = l < lc ? L.en(L.L - lc + l)[2] : sur(R.sg, (l - lc) / this.L0 * M - .5, M - 1); }
      for (let k = 0; k <= M; k++) { const l = k * h; th[k] = l < lc ? L.en(L.L - lc + l)[2] : sur(R.th, (l - lc) / this.L0 * M, M); }
      for (let k = 1; k < M; k++) sg[k] = sg[k - 1] + norm(sg[k] - sg[k - 1]);
      for (let k = 1; k <= M; k++) th[k] = th[k - 1] + norm(th[k] - th[k - 1]);
      // (un rien en retrait (z) : son pied passe sous les boucles des autres, comme dans le logo, sans pâlir)
      return { sg, th, ln, mu: 0, z: new Float64Array(M + 1).fill(.995), kl: lc / tot * M };   // (kl : où finit le pied, en segments)
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
    // (bout : un angle dont seule la pointe se courbe, son dernier cinquième, le reste tel quel)
    reposPose(temps = 0, onde = 0, penche = 0, tourne = 0, bout = 0) {
      const M = this.M, sg = new Float64Array(M), th = new Float64Array(M + 1), ln = new Float64Array(M);
      for (let k = 0; k < M; k++) ln[k] = this.RL[k] * this.s;
      const ph = this.i * 2.399;
      const dev = x => (onde ? onde * (0.075 * Math.pow(x, 1.4) * Math.sin(temps * 1.3 + ph - x * 3.4) + 0.03 * x * Math.sin(temps * .55 + ph * 1.7)) : 0) + penche * x + tourne + (bout ? bout * lisse(.78, 1, x) : 0);
      for (let k = 0; k < M; k++) sg[k] = this.RS[k] + dev((k + .5) / M);
      for (let k = 0; k <= M; k++) th[k] = this.RT[k] + dev(k / M);
      return { sg, th, ln, mu: 0 };
    }
    // vers un titre : la racine telle quelle, le corps jusqu'au point d'accroche, la pointe dessous puis enroulée
    viseePose(c, bob = { x: 0, y: 0 }) {
      const M = this.M, [Kr, Kb] = this.bornes(c), s = this.s, [r0x, r0y, glisse] = this.racineEff();
      const tourne = (this.tourne || 0) + (c.tourne || 0) + glisse;
      const sg = new Float64Array(M), ln = new Float64Array(M), th = new Float64Array(M + 1);
      // (la racine, tournée de tourne autour de son pied, puis infléchie de plie : son pied part toujours dans le sens de son
      // attache, la racine se courbe peu à peu jusqu'à plie ; là où elle finit, et dans quel sens)
      let plie = 0;
      const pied = () => {
        let x = this.ox + r0x * s + bob.x, y = this.oy + r0y * s + bob.y;
        for (let k = 0; k < Kr; k++) { const a = this.RS[k] + tourne + plie * lisse(0, 1, (k + .5) / Kr); sg[k] = a; ln[k] = this.RL[k] * s; x += ln[k] * Math.cos(a); y += ln[k] * Math.sin(a); }
        return [x, y, Kr ? sg[Kr - 1] : this.RS[0] + tourne];
      };
      let [px, py, a0] = pied();
      // pas de détour : elle part à moins de 50° du titre (ni montée pour redescendre, ni l'inverse). Sinon la racine s'infléchit
      // d'autant (de 60° au plus), sans que son pied bouge : elle sort de la tête comme au repos, et se courbe ensuite
      { const d0 = norm(Math.atan2(c.y - py, c.x - px) - a0), LIM = .87;
        if (Math.abs(d0) > LIM) { plie = Math.max(-1.05, Math.min(1.05, d0 - Math.sign(d0) * LIM)); [px, py, a0] = pied(); } }
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
      const cub = (x0, y0, x1, y1, x2, y2, x3, y3, de) => { const pts = []; for (let j = de; j <= 64; j++) { const u = j / 64, b0 = (1 - u) ** 3, b1 = 3 * (1 - u) ** 2 * u, b2 = 3 * (1 - u) * u * u, b3 = u ** 3; pts.push([b0 * x0 + b1 * x1 + b2 * x2 + b3 * x3, b0 * y0 + b1 * y1 + b2 * y2 + b3 * y3]); } return pts; };
      // par le côté : vers le couloir (dans son sens, puis tout droit), le couloir descendu, le retour à plat sous le titre
      const rail = c.rail != null && du * (c.x - c.rail) > 20 && dy > 160;
      if (c.mobile) {
        // au téléphone, elle arrive sous le titre par un crochet arrondi : un quart de cercle de rayon R (la place qu'il y a
        // entre le bout du texte et le bord de l'écran, 24 px au plus), à la fin d'une descente verticale à l'aplomb du crochet.
        // Jamais d'épingle à cheveux : la courbe tourne au plus serré sur ce rayon. Par le côté (un titre lointain) : vers le
        // couloir, le couloir descendu, puis un glissement en S jusqu'à l'aplomb du crochet ; sinon, depuis la racine, dans
        // son sens, puis vers l'aplomb du crochet, en descendant
        const R = Math.max(10, Math.min(24, place != null ? place - 2 : 24)), xr = c.x - du * R, yr = c.y - R;
        const quart = cub(xr, yr, xr, yr + .552 * R, c.x - du * .552 * R, c.y, c.x, c.y, 1);
        if (rail) {
          // (kD : ce qu'elle continue dans son sens avant de s'infléchir ; une boucle qui part vers le haut monte un peu, pas plus)
          const yM = Math.min(yr - 40, py + Math.max(70, Math.min(140, dy * .4))), kA = Math.max(30, (yM - py) * .5), kD = Math.max(12, Math.min(36, (yM - py) * .3));
          corps = cub(px, py, px + Math.cos(a0) * kD, py + Math.sin(a0) * kD, c.rail, yM - kA, c.rail, yM, 0)
            .concat(cub(c.rail, yM, c.rail, yM + (yr - yM) * .5, xr, yr - (yr - yM) * .35, xr, yr, 1))
            .concat(quart);
        } else {
          const k1m = Math.min(kk, 70), kA = Math.max(8, Math.min(90, (yr - py) * .4));
          corps = cub(px, py, px + Math.cos(a0) * k1m, py + Math.sin(a0) * k1m, xr, yr - kA, xr, yr, 0).concat(quart);
        }
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
      // dans l'eau (ondule : { k, x0, y0 }, la scène de l'accueil) : le corps ondoie, d'une houle qui dérive lentement de la
      // tête vers le titre, nulle et à plat aux deux bouts (la racine, l'arrivée sous le titre). Sa phase tient à la place à
      // l'écran (x0, y0 : la référence de la scène) : au téléphone, les bras qui descendent côte à côte le long du bord ondulent
      // ensemble, sans se croiser ; au bureau, chacun a la sienne
      const O = c.ondule && c.ondule.k > 0 ? c.ondule : null, tps = this.tps || 0, ph = this.i * 1.3;
      if (O) corps = ondoyer(corps, O.k * (c.mobile ? 5 : 18), c.mobile ? 170 : 200, (c.mobile ? 0 : ph) - tps * .7, O.x0 || 0, O.y0 || 0, du);
      // la pointe : sous le titre, puis elle s'enroule (sa courbure croît vers le bout). Dans l'eau, le souligné ondule aussi,
      // d'une vague qui le parcourt, vers le bas seulement (de quelques pixels : il ne monte pas sur le titre, qui l'efface, et
      // ne touche pas la ligne dessous)
      const U = Math.max(8, c.U || 0), pointe = [], aU = O ? O.k * (c.mobile ? 4 : 5.5) : 0, nU = Math.max(1, Math.round(U / 70));
      for (let j = 0; j <= 24; j++) { const u = j / 24; pointe.push([c.x + du * U * u, c.y + aU * Math.sin(Math.PI * u) ** 2 * (.5 + .5 * Math.sin(TAU * nU * u - tps * 1.1 + ph))]); }
      let Lu = 0; for (let j = 1; j <= 24; j++) Lu += Math.hypot(pointe[j][0] - pointe[j - 1][0], pointe[j][1] - pointe[j - 1][1]);
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
      // (kc : où commence l'enroulement du bout, après le souligné)
      return { sg, th, ln, z, mu: 1, prolonge, kc: Kb + Math.round((M - Kb) * Lu / (Lu + Lc)) };
    }
    viser(cible, duree = 600, elastique = false) {
      const meme = !!cible === !!this.cible && (!cible || (cible.cle === this.cible.cle));
      this.cible = cible; this.elastique = !!elastique;
      // (la racine de la dernière cible reste celle du liseré et de l'effilement, le temps qu'elle revienne au repos)
      if (cible) { this.derniere = cible; this.rac = cible.racine != null ? cible.racine : RAC; this.wmin = cible.epaisseur || 0; }
      if (!this.pose_ || (meme && this.pose)) return;   // la même cible (peut-être déplacée) : le trajet continue
      // (reliée : elle part de son repos vers une cible, et sa place du logo est loin de son attache)
      this.relie = !!(cible && this.att && !this.colle && (!this.pose || this.pose.mu < .01) && Math.hypot(this.att.x - this.RX[0], this.att.y - this.RY[0]) > 40);
      this.depuis = this.pose || this.reposPose();
      this.but = cible ? this.viseePose(cible, this.bob) : null;
      // qui s'allonge se déroule d'abord, puis s'étire ; qui raccourcit se rétracte d'abord, puis s'enroule
      const long = p => p.ln.reduce((a, b) => a + b, 0);
      this.etire = long(this.but || this.reposPose()) >= long(this.depuis);
      this.q = duree > 0 ? 0 : 1; this.duree = duree;
    }
    mouvement() { return this.pose ? this.pose.mu : 0; }
    // combien elle a quitté sa place du logo, pour ce qui s'efface quand elle part (une enfant, un liseré du dessin) : dès le
    // début de son trajet vers une cible (son premier douzième), sinon selon son mouvement (au retour, ils reviennent avec elle)
    partie() { return Math.max(ease(this.mouvement()), this.cible && this.q < 1 ? lisse(0, .08, this.q) : 0); }
    // sa profondeur moyenne : 1 au premier plan, moins quand elle s'enfonce (pour la pâlir, et la dessiner derrière les autres)
    profondeur() {
      const z = this.pose && this.pose.z;
      if (!z) return 1;
      let a = 0, n = 0;
      for (let k = 0; k < z.length; k += 8) { a += z[k]; n++; }
      return n ? a / n : 1;
    }
    avancer(dt, o = {}) {
      this.tourne = o.tourne || 0; this.tps = o.temps || 0;
      const bob = this.bob = o.bob || { x: 0, y: 0 };
      // (une enfant : sa racine est attachée à l'épine de son parent, là où elle l'est au repos (au même écart), et pivote avec
      // elle ; le parent a avancé avant)
      if (this.parent) {
        const { t: p, k, du, dv } = this.parent, P = p.pose;
        if (P) {
          const a = P.th[k], d = norm(a - p.RT[k]), s = this.s = p.s, ca = Math.cos(a), sa = Math.sin(a);
          this.tourne += d;
          this.ox = p.X[k] + (du * ca - dv * sa) * s - this.RX[0] * s - bob.x; this.oy = p.Y[k] + (du * sa + dv * ca) * s - this.RY[0] * s - bob.y; this.pose_ = true;
        }
      }
      // (le repos d'une tentacule glissée sur la tête : sa forme du logo, tournée dans le sens de son attache)
      // (le glissement de la racine vers son attache précède le déroulement : la pièce du logo rejoint la tête, entière, puis
      // se déplie depuis elle ; au retour, elle se replie, puis glisse. delai : la part du trajet que prend le glissement)
      const delai = this.att && !this.colle ? Math.min(.35, Math.hypot(this.att.x - this.RX[0], this.att.y - this.RY[0]) / 800) : 0;
      if (this.q < 1 && this.depuis) this.gl = !delai ? (this.cible || this.colle ? 1 : 0) : this.etire ? Math.min(1, this.q / delai) : Math.min(1, (1 - this.q) / delai);
      else this.gl = this.cible || this.colle ? 1 : 0;
      const glisseR = this.racineEff()[2];
      const repos = this.reposPose(o.temps || 0, o.onde || 0, o.penche || 0, this.tourne + glisseR, o.bout || 0);
      // (reliée : la pièce ne tourne pas. Collée, une tentacule dont la place du logo est loin de son attache (la queue, la
      // spirale extérieure) revient à cette place, d'un seul tenant, son pied restant sur la tête (reliePose) : sa forme du
      // logo tournée dans le sens de l'attache tombait dans la tête)
      const loinTete = this.att && Math.hypot(this.att.x - this.RX[0], this.att.y - this.RY[0]) > 40;
      const repos0 = this.relie || (this.colle && loinTete) ? this.reposPose(o.temps || 0, o.onde || 0, o.penche || 0, this.tourne, o.bout || 0) : repos;
      const reposB = this.colle && loinTete ? this.reliePose(1, repos0) : repos;
      if (this.cible) this.but = this.viseePose(this.cible, bob);
      let bouge = false;
      if (this.q < 1) { this.q = Math.min(1, this.q + dt / Math.max(1, this.duree)); bouge = true; }
      const B = this.cible ? this.but : reposB;
      let P = B;
      if (this.q < 1 && this.depuis) {
        let A = this.depuis;
        const M = this.M, brut = this.q;
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
          // vers une cible : elle se déplie depuis sa forme du logo, lentement, de la racine à la pointe, comme une fougère :
          // segment après segment (l'onde), la part dépliée prend le chemin visé, la part encore enroulée garde les boucles du
          // logo, portée au bout, de plus en plus petite, jusqu'à s'ouvrir à son tour ; ses longueurs suivent. Rien ne se
          // replie, rien ne pivote en bloc. La profondeur : le front du dépliement se soulève vers nous (plus large d'un
          // septième) puis se pose ; une tentacule dont la place du logo est loin de son attache (la queue, la spirale
          // extérieure) s'enfonce d'abord, plus fine et plus pâle (dessiner), le temps de passer derrière le corps jusqu'à son
          // attache, puis revient au premier plan en se dépliant
          // (un front étroit : la part dépliée est exactement sur le chemin visé ; un front large laisserait tout le bras à demi
          // courbé, en grands arcs qui balaient. Celle qui a glissé part de sa forme du logo tournée dans le sens de son attache
          // (repos : elle s'y est tournée en glissant, enfoncée))
          const q2 = delai ? Math.max(0, (brut - delai) / (1 - delai)) : brut, OND = .82, A0 = A;
          // (reliée : elle ne glisse pas, entière, à travers la tête : la pièce du logo reste à sa place, d'un seul tenant, son
          // pied s'allonge jusqu'à l'attache par-dessous (reliePose), puis elle se déplie de là, opaque, au premier plan)
          A = this.relie ? this.reliePose(ease(Math.min(1, Math.max(0, this.gl || 0))), repos0) : delai ? repos : A;
          // (et dès le premier instant, toute la tentacule commence à se détendre, un peu (FOND), jusqu'à sa pointe : rien ne
          // reste figé dans sa forme du logo en attendant le front. Reliée, pendant que son pied s'allonge jusqu'à la tête, la
          // pièce du logo seule se détend, tendue vers son titre, de son côté ; le pied, lui, ne se courbe qu'arrivé : courbé en
          // route, il ferait pivoter la pièce vers la tête)
          const FOND = .3, fond = FOND * ease(brut), kl = this.relie && A.kl != null ? A.kl : -1;
          const av = u => Math.max(kl < 0 ? fond : fond * lisse(kl - .04 * M, kl + .04 * M, u * M), lisse(0, 1, (q2 - u * OND) / (1 - OND)));
          const wS = new Float64Array(M), wP = new Float64Array(M + 1);
          for (let k = 0; k < M; k++) wS[k] = av((k + .5) / M);
          for (let k = 0; k <= M; k++) wP[k] = av(k / M);
          // (les angles mêmes, d'un front étroit : la part dépliée suit le chemin visé, la part enroulée garde l'orientation
          // qu'elle a dans le logo, portée au bout du bras qui grandit sans tourner sur elle-même ; chaque segment tourne au plus
          // près de son voisin (deroule) : pas de retournement)
          const Da = A === A0 ? D : deroule(A.sg, B.sg, M), DTa = A === A0 ? DT : deroule(A.th, B.th, M + 1);
          for (let k = 0; k < M; k++) { sg[k] = A.sg[k] + wS[k] * Da[k]; ln[k] = lerp(A.ln[k], B.ln[k], wS[k]); }
          for (let k = 0; k <= M; k++) th[k] = A.th[k] + wP[k] * DTa[k];
          const recul = delai && !this.relie ? 1 - .62 * Math.sin(Math.PI * Math.min(1, Math.max(0, this.gl || 0))) : 1;
          const zP = new Float64Array(M + 1);
          for (let k = 0; k <= M; k++) { const w = wP[k]; zP[k] = lerp(A.z ? A.z[k] : 1, B.z ? B.z[k] : 1, w) * (1 + .56 * w * (1 - w)) * recul; }
          P = { sg, th, ln, z: zP, mu: lerp(A0.mu, B.mu, ease(q2)), prolonge: ens };
          qm = -1;   // (la pose est faite)
        } else {
          for (let k = 0; k < M; k++) {
            const qk = avance((k + .5) / M), wA = eA(qk), wL = ens ? ease(qk) : allonge ? ease(Math.max(0, (qk - .25) / .75)) : ease(Math.min(1, qk / .75));
            sg[k] = A.sg[k] + wA * D[k]; ln[k] = lerp(A.ln[k], B.ln[k], wL);
          }
          for (let k = 0; k <= M; k++) th[k] = A.th[k] + eA(avance(k / M)) * DT[k];
        }
        if (qm >= 0) {
          const z = A.z || B.z ? new Float64Array(M + 1) : null;
          if (z) for (let k = 0; k <= M; k++) { const w = eA(avance(k / M)); z[k] = lerp(A.z ? A.z[k] : 1, B.z ? B.z[k] : 1, w); }
          P = { sg, th, ln, z, mu: lerp(A.mu, B.mu, ease(qm)), prolonge: ens };
        }
      }
      this.pose = P;
      if (this.att && this.collant && P.mu > .999) this.colle = true;   // (collant : la pieuvre de l'accueil)
      // l'épine à l'écran, depuis la racine de cette image (glissée vers son attache en se déployant)
      const X = this.X, Y = this.Y, [r0x, r0y] = this.racineEff();
      X[0] = this.ox + r0x * this.s + bob.x; Y[0] = this.oy + r0y * this.s + bob.y;
      for (let k = 0; k < this.M; k++) { X[k + 1] = X[k] + P.ln[k] * Math.cos(P.sg[k]); Y[k + 1] = Y[k] + P.ln[k] * Math.sin(P.sg[k]); }
      // (posée sur un titre, elle flotte, portée par les remous : voir flotter ; pas en route, pas au repos)
      if (this.cible && o.onde && P.mu > .6) this.flotter(P, o.onde * lisse(.6, 1, P.mu), o.temps || 0);
      this.poly = null;
      return bouge;
    }
    // la tentacule posée sur un titre flotte comme dans l'eau : deux houles lentes et une dérive plus lente encore la
    // traversent de la tête au titre (un déplacement de travers, nul à la racine et au point d'accroche : sa pointe ne
    // décolle pas du titre), et au-delà du titre, l'enroulement de la pointe se balance en bloc autour du point d'accroche.
    // Chaque tentacule a sa phase : jamais deux en mesure. L'ampleur (k : 0 à 1) suit la longueur du bras, douze pixels au
    // plus (quatre au téléphone, où le bras longe le bord de l'écran). La pose est relue sur la ligne obtenue
    flotter(P, k, t) {
      const M = this.M, [Kr, Kb] = this.bornes(this.cible), X = this.X, Y = this.Y, ph = this.i * 2.399;
      if (Kb - Kr < 4 || k <= 0) return;
      k = Math.min(1, k);   // (une créature agitée ne flotte pas plus fort pour autant)
      let Lb = 0; for (let j = Kr; j < Kb; j++) Lb += P.ln[j];
      const A = k * Math.min(this.cible.mobile ? 7 : 22, Math.max(3, Lb * .05));
      // (les tables du bras, pour ces bornes : la fenêtre, et les trois ondes en espace, décomposées pour que chaque image ne
      // coûte que des produits ; sin(a - uλ) = sin a cos uλ - cos a sin uλ)
      let H = this.houle;
      if (!H || H.Kr !== Kr || H.Kb !== Kb) {
        const n = Kb - Kr, w = new Float64Array(n), c1 = new Float64Array(n), s1 = new Float64Array(n), c2 = new Float64Array(n), s2 = new Float64Array(n), c3 = new Float64Array(n), s3 = new Float64Array(n);
        // (au téléphone, la houle est plus forte près de la tête, où les bras ont de la place, que le long du bord, où ils se serrent)
        const serre = this.cible.mobile ? .65 : 0;
        for (let i = 1; i < n; i++) { const u = i / n; w[i] = Math.pow(Math.sin(Math.PI * u), 1.4) * (1 - serre * u); c1[i] = Math.cos(u * 3.6); s1[i] = Math.sin(u * 3.6); c2[i] = Math.cos(u * 6.5); s2[i] = Math.sin(u * 6.5); c3[i] = Math.cos(u * 1.2); s3[i] = Math.sin(u * 1.2); }
        H = this.houle = { Kr, Kb, w, c1, s1, c2, s2, c3, s3 };
      }
      const a1 = t * .9 + ph, a2 = t * 1.7 + ph * 1.7, a3 = t * .45 + ph * .6;
      const S1 = .5 * Math.sin(a1), C1 = .5 * Math.cos(a1), S2 = .35 * Math.sin(a2), C2 = .35 * Math.cos(a2), S3 = .3 * Math.sin(a3), C3 = .3 * Math.cos(a3);
      for (let j = Kr + 1; j < Kb; j++) {
        const i = j - Kr, d = A * H.w[i] * (S1 * H.c1[i] - C1 * H.s1[i] + S2 * H.c2[i] - C2 * H.s2[i] + S3 * H.c3[i] - C3 * H.s3[i]);
        const a = P.th[j];
        X[j] -= d * Math.sin(a); Y[j] += d * Math.cos(a);
      }
      // l'enroulement du bout (après le souligné : là où l'épine se remet à tourner, ou kc, noté par la pose visée) se balance
      // autour de son départ et respire (sa spirale se desserre, se resserre)
      let Kc = P.kc != null ? P.kc : this.but && this.but.kc != null ? this.but.kc : -1;
      if (Kc < 0) { Kc = Kb; while (Kc < M - 2 && Math.abs(norm(P.sg[Kc] - P.sg[Kb])) < .02) Kc++; }
      if (M - Kc > 3) {
        const dr = k * .2 * Math.sin(t * 1.25 + ph * 2.1), e = 1 + k * .25 * Math.sin(t * .8 + ph * 1.3);
        let ang = P.sg[Kc] + dr, rel = 0, x = X[Kc], y = Y[Kc];
        for (let j = Kc; j < M; j++) {
          if (j > Kc) { rel += norm(P.sg[j] - P.sg[j - 1]); ang = P.sg[Kc] + dr + rel * e; }
          x += P.ln[j] * Math.cos(ang); y += P.ln[j] * Math.sin(ang); X[j + 1] = x; Y[j + 1] = y;
        }
      }
      // (la pose relue sur la ligne obtenue, de la racine à la pointe ; la racine elle-même n'a pas bougé. Chaque angle reste au
      // plus près du précédent, déroulé comme ceux de la racine : un tour de trop entre deux points de l'épine, et la peau, dont
      // l'angle s'interpole de l'un à l'autre, tournerait sur elle-même, repliée en encoches à la sortie de la tête)
      for (let j = Kr; j < M; j++) { const dx = X[j + 1] - X[j], dy = Y[j + 1] - Y[j], a = Math.atan2(dy, dx); P.sg[j] = j ? P.sg[j - 1] + norm(a - P.sg[j - 1]) : a; P.ln[j] = Math.hypot(dx, dy); }
      P.th[M] = P.sg[M - 1];
      for (let j = Math.max(1, Kr); j < M; j++) P.th[j] = P.sg[j - 1] + .5 * norm(P.sg[j] - P.sg[j - 1]);
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
      // (son pied, entré dans la jambe de l'arche, se resserre : ses coins ne dépassent pas de la jambe quand le bras en sort
      // de biais ; le resserrement est dans la jambe, blanc sur blanc, invisible. Le raccord au bord de la jambe : raccords().
      // Une tentacule qui prolonge la jambe ou la queue de l'œil garde son pied presque entier, il continue le trait : seul ce
      // qui remonte dans la jambe, derrière la coupe, se resserre un peu, que son coin ne dépasse pas du bord de la jambe)
      if (P.mu > .001 && this.att && sv <= 0) { if (this.bordTete()) nn *= 1 - .35 * P.mu; else if (tv < 0) nn *= 1 - .06 * P.mu; }
      // (sortie du bas de la tête par un trait plus fin qu'elle, la queue de l'œil : elle y a sa largeur, puis prend la sienne
      // sur quarante-cinq unités ; d'autant qu'elle a glissé jusque-là)
      if (this.attN0 && this.attN0 < this.N0) {
        const g = this.colle ? 1 : Math.min(1, Math.max(0, this.gl || 0));
        if (g > 0) nn *= 1 - g * (1 - this.attN0 / this.N0) * (1 - lisse(0, 45, sv));
      }
      nn *= zk;   // (au loin, plus fine)
      out[0] = cx + tt * ca - nn * sa; out[1] = cy + tt * sa + nn * ca;
    }
    // le contour de la tentacule à l'écran : la peau, et des points ajoutés là où elle s'étire (pas plus de 2,5 px entre deux)
    contour() {
      if (this.poly) return this.poly;
      // (le jour : à partir d'un cinquième du bras seulement, loin de la tête, qu'il ne coupe pas)
      const m = this.m, S = this.S, T = this.T, N = this.N, xs = [], ys = [], p = [0, 0], q = [0, 0], libre = this.libres(Math.max(this.rac, .2));
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
        xs.push(p[0]); ys.push(p[1]); this.ix[k] = xs.length - 1;
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
    // le bord de la tête par où la tentacule en sort, vu de son attache (en unités du dessin, par rapport à elle) : une ligne de
    // points du contour du logo, trouvés une fois par des rayons lancés de l'attache dans son sens, côte à côte (de trois en trois
    // unités, sur quarante-cinq de part et d'autre, tant qu'ils trouvent le bord), et sa normale vers le dehors là où elle sort. null
    // pour une tentacule qui prolonge la jambe ou la queue de l'œil (son attache est sa racine du dessin : rien à raccorder, sa
    // peau continue le trait)
    bordTete() {
      if (this.bordT !== undefined) return this.bordT;
      const a = this.att;
      this.bordT = null;
      if (!a || a.prolonge || Math.hypot(a.x - this.RX[0], a.y - this.RY[0]) < 2 || typeof D === 'undefined' || !D.logo || !D.logo.octopusPaths) return null;
      const { segs } = grille(), dx = Math.cos(a.dir), dy = Math.sin(a.dir);
      // (chaque rayon part de douze unités derrière l'attache, au fond de la jambe : il en trouve le bord même là où elle tourne)
      const rayon = o => {
        const x0 = a.x - dx * 12 - dy * o, y0 = a.y - dy * 12 + dx * o;
        let best = 57, hit = null;
        for (let i = 0; i < segs.length; i += 4) {
          const ex = segs[i + 2] - segs[i], ey = segs[i + 3] - segs[i + 1], den = dx * ey - dy * ex;
          if (Math.abs(den) < 1e-9) continue;
          const wx = segs[i] - x0, wy = segs[i + 1] - y0, t = (wx * ey - wy * ex) / den, u = (wx * dy - wy * dx) / den;
          if (t > .5 && t < best && u >= 0 && u <= 1) { best = t; hit = [x0 + dx * t - a.x, y0 + dy * t - a.y]; }
        }
        return hit;
      };
      const pts = [rayon(0)];
      if (!pts[0]) return null;
      let c = 0;   // (l'indice du rayon du milieu)
      for (const sg of [-1, 1]) for (let o = 3; o <= 45; o += 3) {
        const h = rayon(sg * o), p = sg < 0 ? pts[0] : pts[pts.length - 1];
        if (!h || Math.hypot(h[0] - p[0], h[1] - p[1]) > 9) break;   // (un rayon qui passe le bout de la jambe : la ligne s'arrête)
        if (sg < 0) { pts.unshift(h); c++; } else pts.push(h);
      }
      if (c < 1 || c > pts.length - 2) return null;
      let ux = pts[c + 1][0] - pts[c - 1][0], uy = pts[c + 1][1] - pts[c - 1][1]; const l = Math.hypot(ux, uy) || 1; ux /= l; uy /= l;
      let nx = -uy, ny = ux; if (nx * dx + ny * dy < 0) { nx = -nx; ny = -ny; }
      return this.bordT = { pts, c, nx, ny };
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

  /* le raccord d'une tentacule à la tête : là où chacun de ses bords sort du flanc de la jambe de l'arche, le coin
     entre ce bord et celui de la jambe se comble d'un congé, une courbe tangente aux deux (comme une racine charnue, sans
     angle ni bosse). Le congé déborde un peu dans la jambe et dans la tentacule : aucun fil d'anticrénelage entre eux. Son
     rayon suit la largeur du bras ; un bord qui sort à plat le long de la jambe n'en a pas besoin. al : son opacité */
  function raccords(g, t, encre, al) {
    const B = t.bordTete();
    if (!B || al < .02) return;
    const { xs, ys } = t.contour(), s = t.s, c = Math.cos(t.tourne || 0), si = Math.sin(t.tourne || 0), e = .8, H = t.tt, a = t.att, q = [0, 0];
    // (le bord de la jambe à l'écran : la ligne de ses points, déformés avec la tête comme elle (sinon tournés avec la racine),
    // et sa normale vers le dehors)
    const bx = [], by = [];
    for (const p of B.pts) {
      if (H) { tete(a.x + p[0], a.y + p[1], poids(a.y + p[1]), H[2], H[3], H[4], q); bx.push(H[0] + t.bob.x + q[0] * s); by.push(H[1] + t.bob.y + q[1] * s); }
      else { bx.push(t.X[0] + (p[0] * c - p[1] * si) * s); by.push(t.Y[0] + (p[0] * si + p[1] * c) * s); }
    }
    const nb = bx.length;
    const nx = B.nx * c - B.ny * si, ny = B.nx * si + B.ny * c;
    const hw = Math.max(t.N0 * s, (t.wmin || 0) / 2), E = t.bords.map(ks => ks.map(k => t.ix[k]));
    const unit = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
    g.fillStyle = encre; g.globalAlpha = al;
    for (let cote = 0; cote < 2; cote++) {
      const ix = E[cote], autre = E[1 - cote];
      if (ix.length < 3 || !autre.length) continue;
      // I : où ce bord de la tentacule passe le bord de la jambe (le premier de ses segments qui le coupe)
      let j = -1, kb = 0, fb = 0, Ix = 0, Iy = 0;
      for (let k = 0; k + 1 < ix.length && j < 0; k++) {
        const x0 = xs[ix[k]], y0 = ys[ix[k]], vx = xs[ix[k + 1]] - x0, vy = ys[ix[k + 1]] - y0;
        for (let b = 0; b + 1 < nb; b++) {
          const wx = bx[b + 1] - bx[b], wy = by[b + 1] - by[b], den = vx * wy - vy * wx;
          if (Math.abs(den) < 1e-12) continue;
          const rx = bx[b] - x0, ry = by[b] - y0, u = (rx * wy - ry * wx) / den, v = (rx * vy - ry * vx) / den;
          if (u >= 0 && u <= 1 && v >= 0 && v <= 1) { j = k; kb = b; fb = v; Ix = x0 + u * vx; Iy = y0 + u * vy; break; }
        }
      }
      if (j < 0) continue;
      const [tx, ty] = unit(xs[ix[j + 1]] - xs[ix[j]], ys[ix[j + 1]] - ys[ix[j]]);
      // le long de la jambe, du côté de ce bord (en s'éloignant de la tentacule) ; l'angle du coin
      const pas = (bx[kb + 1] - bx[kb]) * (xs[ix[0]] - xs[autre[0]]) + (by[kb + 1] - by[kb]) * (ys[ix[0]] - ys[autre[0]]) >= 0 ? 1 : -1;
      const [ax, ay] = unit((bx[kb + 1] - bx[kb]) * pas, (by[kb + 1] - by[kb]) * pas);
      const th = Math.acos(Math.max(-1, Math.min(1, ax * tx + ay * ty)));
      if (th > 2.8 || th < .05) continue;
      let L = Math.min(2.4 * hw, .95 * hw / Math.tan(th / 2));
      // A : à L de I sur le bord de la jambe (pas au-delà de la ligne trouvée : le congé raccourcit), et son sens là
      let Ax = Ix, Ay = Iy, dax = ax, day = ay;
      { let reste = L, k = pas > 0 ? kb + 1 : kb;
        while (k >= 0 && k < nb) {
          const l = Math.hypot(bx[k] - Ax, by[k] - Ay);
          [dax, day] = unit(bx[k] - Ax, by[k] - Ay);
          if (l >= reste) { Ax += dax * reste; Ay += day * reste; reste = 0; break; }
          reste -= l; Ax = bx[k]; Ay = by[k]; k += pas;
        }
        L -= reste; }
      // E : à L de I le long du bord de la tentacule, et son sens là
      let ex = Ix, ey = Iy, dex = tx, dey = ty;
      { let px = Ix, py = Iy, reste = L;
        for (let k = j + 1; k < ix.length; k++) {
          const x = xs[ix[k]], y = ys[ix[k]], l = Math.hypot(x - px, y - py);
          if (l > 1e-9) [dex, dey] = unit(x - px, y - py);
          if (l >= reste) { ex = px + dex * reste; ey = py + dey * reste; break; }
          reste -= l; px = ex = x; py = ey = y;
        } }
      // (le point de contrôle : où se croisent le bord de la jambe en A et celui de la tentacule en E ; I s'ils se croisent mal)
      let cx = Ix, cy = Iy;
      { const den = dax * dey - day * dex;
        if (Math.abs(den) > .05) { const u = ((ex - Ax) * dey - (ey - Ay) * dex) / den, X = Ax - dax * u, Y = Ay - day * u;
          if (u > 0 && Math.hypot(X - Ix, Y - Iy) < L) { cx = X; cy = Y; } } }
      let lx = -ty, ly = tx; if (lx * ax + ly * ay < 0) { lx = -lx; ly = -ly; }   // (hors de la tentacule)
      // (le coin comblé, un peu dans la jambe et dans la tentacule : aucun fil d'anticrénelage ne reste entre eux)
      g.beginPath(); g.moveTo(Ix - (nx + lx) * e, Iy - (ny + ly) * e);
      g.lineTo(Ax - nx * e, Ay - ny * e); g.lineTo(Ax, Ay);
      g.quadraticCurveTo(cx, cy, ex, ey); g.lineTo(ex - lx * e, ey - ly * e); g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
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

  /* le logo vivant : le tracé même du logo (ses quatre chemins, en pair-impair), chaque point emporté par ce qui le porte :
     un point du bord d'une tentacule par elle (noté une fois dans le repère de son épine au repos : le point de l'épine le plus
     proche, puis son décalage le long de la tangente et de la normale, et reposé à chaque image sur son épine du moment), un
     point de la tête par la tête (tete). Au repos, c'est exactement le logo ; quand les tentacules ondulent, il ondule avec
     elles d'un seul tenant : les croisements, les bouts coupés, les jours restent ceux du dessin (la peau d'une tentacule, un
     ruban, n'en est qu'une approximation : dessinée telle quelle près du repos, elle laissait des crochets et des encoches).
     Pour une pieuvre dont les tentacules sont à leur place (ondulation comprise) : dès qu'elles en partent, chacune se dessine
     elle-même (dessiner). Calculé une fois (la géométrie est celle du dessin) */
  let CARTE = null;
  function carte(ts) {
    if (CARTE) return CARTE;
    const C = contours(), d2 = (x, y, ax, ay, bx, by) => { const vx = bx - ax, vy = by - ay, l = vx * vx + vy * vy, u = l ? Math.min(1, Math.max(0, ((x - ax) * vx + (y - ay) * vy) / l)) : 0; const dx = x - ax - u * vx, dy = y - ay - u * vy; return dx * dx + dy * dy; };
    // (la peau de repos de chaque tentacule, et sa boîte)
    const peaux = ts.map(t => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < t.m; i++) { x0 = Math.min(x0, t.VX[i]); x1 = Math.max(x1, t.VX[i]); y0 = Math.min(y0, t.VY[i]); y1 = Math.max(y1, t.VY[i]); }
      return { t, x0, y0, x1, y1 };
    });
    const dedans = (t, x, y) => { let c = false; for (let i = 0, j = t.m - 1; i < t.m; j = i++) { const yi = t.VY[i], yj = t.VY[j]; if ((yi > y) !== (yj > y) && x < (t.VX[j] - t.VX[i]) * (y - yi) / (yj - yi) + t.VX[i]) c = !c; } return c; };
    // (ses porteurs, pondérés : la tentacule sur le bord de laquelle il est (à 1,5 unité), sinon celle où il est, sinon la plus
    // proche (à 6 unités) ; près d'une jonction ou d'un croisement, il suit aussi les voisines à moins de 7 unités de leur
    // bord, d'autant moins qu'il en est loin : un bord partagé par deux tentacules se courbe de l'une à l'autre, sans zigzag,
    // et les deux bords du jour d'un croisement bougent presque ensemble (le jour reste ouvert ; refermé, le remplissage
    // pair-impair y ferait des encoches))
    const qui = (x, y) => {
      const ds = [];
      peaux.forEach((h, n) => {
        if (x < h.x0 - 7 || x > h.x1 + 7 || y < h.y0 - 7 || y > h.y1 + 7) return;
        const t = h.t;
        let d = Infinity;
        for (let i = 0; i < t.m; i++) { const j = (i + 1) % t.m; d = Math.min(d, d2(x, y, t.VX[i], t.VY[i], t.VX[j], t.VY[j])); }
        ds.push({ n, d: Math.sqrt(d), dans: dedans(t, x, y) });
      });
      if (!ds.length) return [];
      ds.sort((a, b) => a.d - b.d);
      const bord = ds[0].d < 1.5 ? ds[0] : ds.filter(e => e.dans)[0] || (ds[0].d < 6 ? ds[0] : null);
      if (!bord) return [];
      const L = [{ n: bord.n, w: 1 }];
      for (const e of ds) if (e.n !== bord.n && e.d < 7 && L.length < 3) L.push({ n: e.n, w: (1 - e.d / 7) * .8 });
      const tot = L.reduce((a, e) => a + e.w, 0);
      L.forEach(e => { e.w /= tot; });
      return L;
    };
    // (le repère de l'épine au repos le plus proche du point : l'indice, la fraction, et le point dans ce repère)
    const repere = (t, x, y) => {
      let best = Infinity, kb = 0, fb = 0;
      for (let k = 0; k < t.M; k++) {
        const ax = t.RX[k], ay = t.RY[k], vx = t.RX[k + 1] - ax, vy = t.RY[k + 1] - ay, l = vx * vx + vy * vy, u = l ? Math.min(1, Math.max(0, ((x - ax) * vx + (y - ay) * vy) / l)) : 0;
        const dx = x - ax - u * vx, dy = y - ay - u * vy, d = dx * dx + dy * dy;
        if (d < best) { best = d; kb = k; fb = u; }
      }
      const cx = lerp(t.RX[kb], t.RX[kb + 1], fb), cy = lerp(t.RY[kb], t.RY[kb + 1], fb), a = lerp(t.RT[kb], t.RT[kb + 1], fb), ca = Math.cos(a), sa = Math.sin(a);
      return [kb, fb, (x - cx) * ca + (y - cy) * sa, -(x - cx) * sa + (y - cy) * ca];
    };
    // (pour chaque point : jusqu'à trois porteurs, leur poids, et le point dans le repère de chacun ; aucun : la tête)
    CARTE = C.map(({ P, segs }) => {
      const n = P.length / 2, Q = [];
      for (let j = 0; j < n; j++) Q.push(qui(P[2 * j], P[2 * j + 1]));
      // (les points de contrôle d'une courbe dont les deux bouts ont les mêmes porteurs les suivent : la courbe reste entière)
      const meme = (a, b) => a.length === b.length && a.every((e, i) => e.n === b[i].n && Math.abs(e.w - b[i].w) < 1e-9);
      let prec = -1;
      for (const sg of segs) {
        if (sg[0] === 'C') { if (prec >= 0 && meme(Q[prec], Q[sg[3]])) Q[sg[1]] = Q[sg[2]] = Q[sg[3]]; prec = sg[3]; } else prec = sg[1];
      }
      const pts = Q.map((L, j) => L.map(e => ({ n: e.n, w: e.w, r: repere(peaux[e.n].t, P[2 * j], P[2 * j + 1]) })));
      return { pts, cles: peaux.map(h => h.t.cle) };
    });
    return CARTE;
  }
  // le logo vivant, peint dans g (en px de la page), de l'encre : o = { ox, oy, s } l'origine du dessin à l'écran et son échelle,
  // theta, dx, dy la tête vivante (comme corpsVivant), bob le flottement ; les tentacules ts ont avancé pour cette image
  function logo(g, ts, o, encre = '#fff') {
    const C = contours(), K = carte(ts), s = o.s, theta = o.theta || 0, dx = o.dx || 0, dy = o.dy || 0, bx = o.ox + (o.bob ? o.bob.x : 0), by = o.oy + (o.bob ? o.bob.y : 0), pt = [0, 0];
    const parCle = new Map(ts.map(t => [t.cle, t]));
    g.beginPath();
    C.forEach(({ P, W, segs }, n) => {
      const { pts, cles } = K[n], T = cles.map(c => parCle.get(c));
      const place = (j, out) => {
        const L = pts[j];
        if (L.length && L.every(e => T[e.n] && T[e.n].pose)) {
          let x = 0, y = 0;
          for (const { n: i, w, r } of L) {
            const t = T[i], [k, f] = r, u = r[2] * t.s, v = r[3] * t.s, P_ = t.pose;
            const cx = lerp(t.X[k], t.X[k + 1], f), cy = lerp(t.Y[k], t.Y[k + 1], f), a = lerp(P_.th[k], P_.th[k + 1], f), ca = Math.cos(a), sa = Math.sin(a);
            x += w * (cx + u * ca - v * sa); y += w * (cy + u * sa + v * ca);
          }
          out[0] = x; out[1] = y;
        } else { tete(P[2 * j], P[2 * j + 1], W[j], theta, dx, dy, out); out[0] = bx + out[0] * s; out[1] = by + out[1] * s; }
        return out;
      };
      const p1 = [0, 0], p2 = [0, 0];
      for (const sg of segs) {
        if (sg[0] === 'M') { place(sg[1], pt); g.moveTo(pt[0], pt[1]); }
        else if (sg[0] === 'L') { place(sg[1], pt); g.lineTo(pt[0], pt[1]); }
        else { place(sg[1], p1); place(sg[2], p2); place(sg[3], pt); g.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], pt[0], pt[1]); }
      }
      g.closePath();
    });
    g.fillStyle = encre; g.fill('evenodd');
  }

  return {
    pret: !!(G && G.bras && G.bras.length),
    logo,
    lisere: (G && G.lisere) || 2.5,
    COU, SOMMET, poids, contours, tete,
    // le corps vivant, peint dans g (en unités du dessin, le repère déjà posé), de l'encre : le logo déformé par la tête (theta
    // en radians, dx, dy en unités), peint dans la seule découpe de la tête (TETE) : les places de repos des tentacules restent
    // vides (le fond de la page s'y voit : ce qui doit rester dessous, une tache, un halo, se peint ensuite en
    // 'destination-over'). Plus d'effacement : il mordait dans la jambe de l'arche, une encoche là où une racine la coupait
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
      // (seule la tête se peint : l'arche et l'œil, dans sa découpe (TETE), emportée avec elle ; le reste du dessin, ce sont les
      // tentacules, qui se peignent elles-mêmes. Rien à effacer : la découpe passe hors des places de repos, et là où une
      // tentacule prend racine elle coupe la jambe ou la queue de l'œil exactement comme sa peau, qui la recouvre)
      const decoupe = polys => {
        const cl = new Path2D();
        for (const r of polys) {
          const pts = r.length === 4 ? [r[0], r[1], r[0] + r[2], r[1], r[0] + r[2], r[1] + r[3], r[0], r[1] + r[3]] : r;
          for (let i = 0; i < pts.length; i += 2) { tete(pts[i], pts[i + 1], poids(pts[i + 1]), theta, dx, dy, pt); if (i) cl.lineTo(pt[0], pt[1]); else cl.moveTo(pt[0], pt[1]); }
          cl.closePath();
        }
        return cl;
      };
      g.save();
      if (this.TETE) g.clip(decoupe(this.TETE));
      g.fillStyle = encre; g.fill('evenodd');
      g.restore();
      // (au repos, les quelques bouts du dessin que la peau de leur tentacule ne couvre pas tout à fait, un liseré le long d'une
      // boucle, le coin où la tige rejoint sa boucle, se peignent avec la tête ; ils s'effacent à mesure que la tentacule s'en va)
      for (const { bras, poly } of this.REPOS) {
        let loin = 0;
        for (const t of ts) if (bras.includes(t.cle)) loin = Math.max(loin, t.bordTete() || !t.att ? (t.colle ? 1 : Math.max(t.mouvement(), t.gl || 0)) : t.partie());
        if (loin > .99) continue;
        g.save(); g.clip(decoupe([poly])); g.globalAlpha = 1 - loin; g.fillStyle = encre; g.fill('evenodd'); g.restore();
      }
    },
    // la palmure : entre deux tentacules voisines sur la tête (du même côté, par ordre d'attache), un creux arrondi comble
    // l'angle de leurs racines, comme la membrane entre les bras d'une pieuvre. Elle paraît avec le déploiement (rien au
    // repos : le logo), et reste pour une tentacule collée à la tête. En px d'écran, avant les tentacules (qui la recouvrent)
    palmure(g, ts, encre = '#fff', portee = 90) {
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
      // (une tentacule qui sort du bas de la tête à la racine d'une autre en prend la largeur là)
      for (const t of ts) if (t.att && t.att.prolonge) { const o = ts.find(x => Math.hypot(x.RX[0] - t.att.x, x.RY[0] - t.att.y) < 1); if (o && o !== t) t.attN0 = o.N0; }
      for (const t of ts) {
        if (!t.parentCle) continue;
        const p = ts.find(x => x.cle === t.parentCle); if (!p) continue;
        let k = 0, best = Infinity;
        for (let j = 0; j <= p.M; j++) { const d = (p.RX[j] - t.RX[0]) ** 2 + (p.RY[j] - t.RY[0]) ** 2; if (d < best) { best = d; k = j; } }
        // (et l'écart de sa racine à ce point, dans le repère de l'épine du parent : posée sur l'épine même, la frange était
        // décalée, au repos, de toute la distance qui l'en sépare dans le dessin)
        const a = p.RT[k], ex = t.RX[0] - p.RX[k], ey = t.RY[0] - p.RY[k];
        t.parent = { t: p, k, du: ex * Math.cos(a) + ey * Math.sin(a), dv: -ex * Math.sin(a) + ey * Math.cos(a) };
      }
      return ts.sort((a, b) => (a.parent ? 1 : 0) - (b.parent ? 1 : 0) || a.i - b.i);
    },
    // l'ordre de déploiement, par vagues : les deux spirales (0), les boucles (1), les spirales extérieures (2), les queues (3) ;
    // VAGUE : l'écart entre deux vagues (ms) : nul, les huit tentacules partent ensemble (aucune n'attend, figée, que les
    // autres aient bougé) ; ATTENTE : à l'ouverture, ce que la pieuvre met à rejoindre sa place avant le départ (ms après le geste)
    // DEPLOI : la durée du premier dépliement, du logo jusqu'aux titres (ms) : lent, qu'on le suive
    VAGUE: 0, ATTENTE: 630, DEPLOI: 1900,
    // les tentacules décoratives (les franges : decor) : quand la pieuvre se déploie, elles se déploient avec elle et restent
    // suspendues sous la tête, de part et d'autre de son milieu, leur pointe enroulée vers l'extérieur. Leur cible, en unités du
    // dessin : DECOR[cle] = [x, y, sens] ; decor(t, ox, oy, s, theta, dx, dy, o) la remplit (o, ou un objet neuf) en px, la tête
    // vivante comprise (le même objet, mis à jour à chaque image : le trajet continue, il suit la tête)
    DECOR: { frangeHL: [690, 712, 1], frangeBL: [708, 792, 1], frangeHR: [840, 722, -1], frangeBR: [822, 800, -1] },
    decor(t, ox, oy, s, theta = 0, dx = 0, dy = 0, o = null) {
      const d = this.DECOR[t.cle]; if (!d) return null;
      const pt = tete(d[0], d[1], poids(d[1]), theta, dx, dy, [0, 0]);
      o = o || { cle: 'decor-' + t.cle, sens: d[2], U: 4, boucle: .7, epaisseur: 2 };
      o.x = ox + pt[0] * s; o.y = oy + pt[1] * s;
      return o;
    },
    rang(cle) { const m = /^(spiraleExt|spirale|boucle|queue)/.exec(cle || ''); return m ? { spirale: 0, boucle: 1, spiraleExt: 2, queue: 3 }[m[1]] : 0; },
    // ce que la tête occupe, en unités du dessin : le corps vivant s'y limite. Des polygones [x, y, x, y…] (ou des rectangles
    // [x, y, w, h]) : l'arche et ses jambes, coupées là où les tentacules qui les prolongent prennent racine (comme leur peau),
    // et l'œil, coupé le long de la tige qui en descend ; rien des places de repos des tentacules
    TETE: (G && G.tete) || [[600, 330, 310, 272], [755, 540, 140, 125]],
    // ce que la tête peint en plus, au repos seulement, pour des tentacules ({ bras : leurs clés, poly })
    REPOS: (G && G.repos) || [],

    dessiner(g, t, o = {}) {
      // (une enfant s'efface dès que son parent part, au tout début de son trajet : elle n'en reste pas un morceau qui flotte ;
      // elle revient avec lui)
      // (enfoncée, elle pâlit : elle passe derrière le corps)
      const zm = t.profondeur(), al = (t.parent ? 1 - t.parent.t.partie() : 1) * (zm < 1 ? .3 + .7 * zm : 1);
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
      g.globalAlpha = 1;
      // (sortie de la tête, elle s'y raccorde : un congé de chaque côté, qui paraît avec elle)
      if (t.att && mu > .01) raccords(g, t, o.encre, al * Math.min(1, mu * 1.5) * (t.colle ? 1 : ease(Math.min(1, Math.max(0, t.gl || 0)))));
    },
  };
})();
