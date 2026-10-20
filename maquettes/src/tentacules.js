/* Les tentacules, communes aux maquettes et à l'administration : la pieuvre du logo, dans l'en-tête, guide le visiteur.
   Chaque clic lui répond : ses bras se contractent et ondulent, une tentacule fine part de la pieuvre, s'enroule sur le
   point cliqué, y laisse l'empreinte d'une ventouse, puis se retire. Chaque changement de page « remonte » une tentacule :
   elle traverse l'écran, à la couleur de la destination, et la pieuvre la reprend. Ouvrir (une saison, un panneau, un menu)
   la déroule le long de ce qui s'ouvre, fermer l'enroule ; un onglet la voit glisser jusqu'à lui ; envoyer un formulaire
   ou enregistrer l'enroule autour du bouton. Un seul code : chaque maquette l'habille dans son style.
   build.py l'ajoute après edition.js quand TENTACULES=1 est posé ; l'administration le charge à côté de son index.html.

   RIEN N'EST RETARDÉ NI BLOQUÉ : écouteurs passifs en phase de capture, jamais de preventDefault, un seul calque fixe
   (pointer-events: none, aria-hidden), un seul requestAnimationFrame, arrêté quand plus rien ne joue et quand l'onglet est
   caché. Aucun texte n'est ajouté. Des clics rapides remplacent l'animation en cours, sans file d'attente. Rien ne joue
   dans un champ ni dans un texte en cours d'écriture (input, textarea, select, [contenteditable]), ni tant que
   INTRO.ouverte() est vrai. prefers-reduced-motion : au plus un fondu bref, aucune tentacule qui voyage.
   ?anim=0 dans l'adresse : aucune animation (captures, tests).

   Ce que la maquette fournit
   - data-pieuvre sur l'élément du logo de l'en-tête (le <span> ou <a> qui contient D.logo.mark, D.logo.octopus ou son
     propre dessin de la pieuvre). L'outil y retrouve les quatre tracés de D.logo.octopusPaths et les anime EN PLACE
     (bras, tête) ; les bras de D.arms donnent le point de départ des tentacules (celui du spectacle visé, quand on va vers
     sa page : D.arms.armOf). Hôte vide : l'outil y met la pieuvre (D.logo.octopus, ou un dessin neutre). Hôte sans tracé
     reconnu : il pulse en entier. Pas d'hôte visible : les tentacules partent du bord le plus proche.
   - TENTACULES.regler({ style, encre, accent, ventouse, neutre, epaisseur, duree, … }), à appeler une fois :
       style       'encre' (défaut : tentacule pleine et effilée, ventouses) · 'trait' (un trait gravé, à hachures)
                   · 'lumiere' (un filet de lumière, avec halo) · 'fil' (un fil très fin) · 'ventouses' (deux rangées)
       encre       la couleur des tentacules                      accent   l'empreinte, les enroulements, les confirmations
       ventouse    la couleur des ventouses (défaut : un voile)    neutre   la remontée des pages sans couleur propre
       epaisseur   l'épaisseur de la tentacule fine, en px (2.2)   duree    facteur de durée (1 = normal)
       pieuvre     sélecteur du guide ('[data-pieuvre]')           page     sélecteur de ce que la remontée soulève ('main')
       entrees     'auto' (défaut), 'vive' ou 'couleur' : quelle couleur de D.site.entrees prend la remontée
       couleurDe   function (hash) → couleur CSS, ou rien : la destination à la main ; false : la maquette a son propre geste pour
                   cette page, la pieuvre seule répond (pas de tentacule de page)
       voie        'bas' (défaut) : la tentacule de page part de sous l'écran, à la hauteur du clic ; 'clic' : elle sort du point
                   cliqué lui-même et remonte
       remontee    false : pas de tentacule de page    soulever  true : la page se soulève de 24 px et paraît, en 460 ms,
                   quand la tentacule remonte. Un transform sur <main> déplace ses descendants position: fixed pendant ce
                   temps : à n'activer que si <main> n'en contient pas (hors de la page : une barre, une photo de fond, ça va)
       profil      'admin' : tout dure 350 ms au plus, les tentacules restent près du bouton (jamais devant un champ)
       detail      retouche le style choisi : { page (finesse de la tentacule de page : 1 = pleine, .1 = un fil), ventouses (0, 1 ou 2
                   rangées), hachures, halo, empreinte ('anneau', 'grande', 'etoile', 'lueur', 'point'), corps, opa }
   - des variables CSS, sur :root (ou sur une région : l'outil lit celles de l'élément cliqué) :
       --tt-encre  --tt-accent  --tt-ventouse  --tt-neutre  --tt-epaisseur  --tt-duree  --tt-style
       --tt-fond   le liseré qui détache la tentacule d'un fond sombre (défaut : la couleur de la page)
   - des attributs : data-tt="rien" (aucune animation ici) ou le genre d'un geste : "onglet", "ouvre", "bascule", "case",
     "route", "retour", "clic" ; data-tt-couleur="#…" sur un lien (la couleur de sa remontée) ; data-tt-cible="x,y" sur un
     élément de la page qui arrive (x et y : fractions de sa boîte, .5,.5 par défaut) : la tentacule de page y finit, au lieu de la
     pieuvre (une porte à ouvrir, un titre à atteindre) ; data-tt-local sur un
     conteneur dont les boutons n'ont que des tentacules courtes (la barre d'édition, un panneau) ; data-tt-zone sur la
     fiche qu'un lien « retour » referme (par défaut .editeur).
   Les gestes se reconnaissent seuls : un lien #/… (remontée de page), un onglet (aria-current, aria-selected, role="tab" :
   la tentacule glisse de l'onglet quitté à l'onglet choisi), un <summary> ou un bouton aria-expanded (elle se déroule
   quand ça s'ouvre, s'enroule quand ça se ferme), un bouton aria-pressed ou une case, un envoi de formulaire (elle
   s'enroule autour du bouton), le panneau de date et l'enregistrement de l'édition sur place.

   TENTACULES.toucher(el | [x, y])      une tentacule fine jusqu'à ce point, et son empreinte
   TENTACULES.page(destination)         la remontée d'une page ('#/voir', une couleur CSS ou {couleur, slug}) ; automatique
                                        à chaque changement d'adresse (hashchange)
   TENTACULES.ouvrir(el)  .fermer(el)   la tentacule se déroule le long de ce qui s'ouvre ; elle s'enroule à la fermeture
   TENTACULES.enrouler(el)              elle s'enroule autour d'un bouton : un envoi, un enregistrement réussi
   TENTACULES.retour(el)                elle s'enroule à l'envers (revenir en arrière)
   TENTACULES.onglet(de, vers)          elle glisse d'un onglet à l'autre   TENTACULES.ajouter(el)   une ligne qui s'ajoute
   TENTACULES.pieuvre()                 met la pieuvre dans les hôtes data-pieuvre vides
   TENTACULES.arreter()                 coupe tout   TENTACULES.actif   faux avec ?anim=0 */
const TENTACULES = (() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const COUPE = (() => { try { return new URLSearchParams(location.search).get('anim') === '0'; } catch (e) { return false; } })();
  const reduit = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const intro = () => typeof INTRO !== 'undefined' && INTRO.ouverte && INTRO.ouverte();
  const edition = () => typeof EDITION !== 'undefined' && !!EDITION.actif;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const f1 = x => String(Math.round(x * 10) / 10);
  const ease = {
    out: t => 1 - (1 - t) ** 3, out4: t => 1 - (1 - t) ** 4, in: t => t ** 3, in2: t => t * t,
    inOut: t => (t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  };

  /* ------------------------------------------------------------------------------------------------ réglages */
  const R = { style: 'encre', encre: '', accent: '', ventouse: '', neutre: '', epaisseur: 0, duree: 1, pieuvre: '[data-pieuvre]',
    page: 'main, [role="main"]', entrees: 'auto', couleurDe: null, profil: 'site', remontee: true, soulever: false };
  function regler(o = {}) { Object.assign(R, o); return R; }
  const admin = () => R.profil === 'admin';

  // ce que chaque style change : la finesse de la tentacule de page, les décors (ventouses, hachures, halo), l'empreinte
  const STYLES = {
    encre: { page: 1, ventouses: 1, hachures: false, halo: 0, empreinte: 'anneau', corps: 1, opa: .94 },
    ventouses: { page: 1.1, ventouses: 2, hachures: false, halo: 0, empreinte: 'grande', corps: 1.15, opa: .95 },
    trait: { page: .15, ventouses: 0, hachures: true, halo: 0, empreinte: 'etoile', corps: .8, opa: 1 },
    lumiere: { page: .24, ventouses: 0, hachures: false, halo: 1, empreinte: 'lueur', corps: .8, opa: 1, contre: false },
    fil: { page: .08, ventouses: 0, hachures: false, halo: 0, empreinte: 'point', corps: .65, opa: 1 },
  };

  const lireCss = (nom, el) => { try { return getComputedStyle(el || document.documentElement).getPropertyValue(nom).trim(); } catch (e) { return ''; } };
  function rgb(c) {
    c = String(c || '').trim();
    let m = /^#([0-9a-f]{3})$/i.exec(c);
    if (m) return [...m[1]].map(h => parseInt(h + h, 16));
    m = /^#([0-9a-f]{6})/i.exec(c);
    if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
    m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(c);
    return m ? [+m[1], +m[2], +m[3]] : null;
  }
  const lum = c => { const v = rgb(c); if (!v) return .5; const f = x => ((x /= 255) <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4); return .2126 * f(v[0]) + .7152 * f(v[1]) + .0722 * f(v[2]); };
  const avecAlpha = (c, a) => { const v = rgb(c); return v ? `rgba(${v[0]},${v[1]},${v[2]},${a})` : c; };
  function fondPage() {
    for (const e of [document.body, document.documentElement]) {
      if (!e) continue;
      const v = getComputedStyle(e).backgroundColor, m = /rgba?\(([^)]+)\)/.exec(v);
      if (m && (m[1].split(',').length < 4 || parseFloat(m[1].split(',')[3]) > .5)) return v;
    }
    return '#ffffff';
  }
  // la palette d'un geste : les variables --tt-* de l'élément (ou de la page), puis les réglages
  function palette(el) {
    const e = el && el.nodeType === 1 ? el : document.documentElement, v = n => lireCss(n, e);
    const encre = v('--tt-encre') || R.encre || (document.body ? getComputedStyle(document.body).color : '#141414');
    const accent = v('--tt-accent') || R.accent || encre;
    const nomStyle = v('--tt-style') || R.style, style = STYLES[nomStyle] ? nomStyle : 'encre';
    const sombre = lum(fondPage()) < .3;
    const duree = (parseFloat(v('--tt-duree')) || R.duree || 1) * (admin() ? .75 : 1);
    return { encre, accent, neutre: v('--tt-neutre') || R.neutre || encre, ventouse: v('--tt-ventouse') || R.ventouse || (sombre ? 'rgba(0,0,0,.36)' : 'rgba(255,255,255,.5)'),
      contre: v('--tt-fond') || R.fond || avecAlpha(fondPage(), .85), ep: parseFloat(v('--tt-epaisseur')) || R.epaisseur || 2.2, duree, sombre, S: R.detail ? Object.assign({}, STYLES[style], R.detail) : STYLES[style], style };
  }
  // la durée d'un geste : 320 ms au plus dans l'administration (350 ms avec la dernière image)
  const dureeDe = (ms, P) => Math.round(admin() ? Math.min(320, ms * P.duree) : ms * P.duree);

  /* ------------------------------------------------------------------------------------------------ géométrie */
  const creer = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  function mesurer(p) { const s = [0]; for (let i = 1; i < p.length; i++) s.push(s[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])); return s; }
  // un point tous les `pas` px, le long de la courbe
  function regulier(p, pas) {
    const s = mesurer(p), L = s[s.length - 1], n = Math.max(2, Math.round(L / pas)), out = [];
    for (let k = 0, j = 0; k <= n; k++) {
      const d = L * k / n;
      while (j < s.length - 2 && s[j + 1] < d) j++;
      const u = s[j + 1] > s[j] ? (d - s[j]) / (s[j + 1] - s[j]) : 0;
      out.push([lerp(p[j][0], p[j + 1][0], u), lerp(p[j][1], p[j + 1][1], u)]);
    }
    return out;
  }
  function bezier(p0, c1, c2, p1) {
    const out = [];
    for (let i = 0; i <= 90; i++) {
      const u = i / 90, v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
      out.push([a * p0[0] + b * c1[0] + c * c2[0] + d * p1[0], a * p0[1] + b * c1[1] + c * c2[1] + d * p1[1]]);
    }
    return out;
  }
  // une crosse : la tentacule s'enroule sur elle-même, le rayon se resserre (sens +1 : dans le sens des aiguilles d'une montre)
  function spirale(dep, th0, sens, r0, r1, tours) {
    const total = tours * 2 * Math.PI, n = Math.max(6, Math.ceil(total / .17)), out = [];
    let [x, y] = dep, th = th0;
    for (let i = 1; i <= n; i++) {
      const r = lerp(r0, r1, i / n), d = total / n, ds = r * d;
      th += sens * d / 2; x += Math.cos(th) * ds; y += Math.sin(th) * ds; th += sens * d / 2;
      out.push([x, y]);
    }
    return out;
  }
  /* L'épine d'une tentacule : de `de` (tangente de départ dir0) jusqu'à `vers`, avec en bout, si `crosse`, une spirale qui
     se resserre autour de `vers`. courbe (-1 à 1) : le côté et l'ampleur du S. ctrl(E, tangente) : les points de contrôle. */
  function fil({ de, dir0 = null, vers, crosse = null, courbe = 1, raideur = .38, ctrl = null }) {
    const dx = vers[0] - de[0], dy = vers[1] - de[1], d0 = Math.hypot(dx, dy) || 1, ux = dx / d0, uy = dy / d0;
    let thE = Math.atan2(dy, dx), E = vers;
    if (crosse) { thE += -crosse.sens * .25; E = [vers[0] + crosse.sens * crosse.r0 * Math.sin(thE), vers[1] - crosse.sens * crosse.r0 * Math.cos(thE)]; }
    const dE = Math.hypot(E[0] - de[0], E[1] - de[1]) || 1, te = crosse ? [Math.cos(thE), Math.sin(thE)] : [ux, uy];
    let c1, c2;
    if (ctrl) [c1, c2] = ctrl(E, te);
    else {
      const t0 = dir0 || [ux * Math.cos(courbe * .6) - uy * Math.sin(courbe * .6), ux * Math.sin(courbe * .6) + uy * Math.cos(courbe * .6)];
      const nx = -uy, ny = ux, k = dE * raideur;
      c1 = [de[0] + t0[0] * k + nx * courbe * dE * .16, de[1] + t0[1] * k + ny * courbe * dE * .16];
      c2 = [E[0] - te[0] * k * .9 - nx * courbe * dE * .14, E[1] - te[1] * k * .9 - ny * courbe * dE * .14];
    }
    let p = regulier(bezier(de, c1, c2, E), 6);
    const nb = p.length - 1;
    if (crosse) p = p.concat(spirale(E, thE, crosse.sens, crosse.r0, crosse.r1, crosse.tours));
    return epine(p, nb);
  }
  function epine(p, nb) {
    const s = mesurer(p), n = p.length, nx = [], ny = [];
    for (let i = 0; i < n; i++) {
      const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], m = Math.hypot(tx, ty) || 1;
      nx.push(-ty / m); ny.push(tx / m);
    }
    return { p, s, L: s[n - 1], nx, ny, nb, Lb: s[nb] };
  }
  // le point i de l'épine, avec l'ondulation qui parcourt la tentacule (sur la partie lisse seulement : la crosse reste en place)
  function pointI(sp, i, ond) {
    let x = sp.p[i][0], y = sp.p[i][1];
    if (ond && sp.Lb > 0 && i <= sp.nb) { const e = Math.sin(Math.PI * sp.s[i] / sp.Lb) * ond.A * Math.sin(ond.k * sp.s[i] - ond.ph); x += sp.nx[i] * e; y += sp.ny[i] * e; }
    return { x, y, nx: sp.nx[i], ny: sp.ny[i], s: sp.s[i] };
  }
  function pointA(sp, sv, ond) {
    let j = 0;
    const n = sp.p.length;
    while (j < n - 2 && sp.s[j + 1] < sv) j++;
    const u = clamp((sv - sp.s[j]) / ((sp.s[j + 1] - sp.s[j]) || 1)), a = pointI(sp, j, ond), b = pointI(sp, j + 1, ond);
    const nx = lerp(a.nx, b.nx, u), ny = lerp(a.ny, b.ny, u), m = Math.hypot(nx, ny) || 1;
    return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), nx: nx / m, ny: ny / m, s: sv };
  }
  // les points de s0 à s1 (abscisse curviligne), avec leur normale
  function fenetre(sp, s0, s1, ond) {
    s0 = clamp(s0, 0, sp.L); s1 = clamp(s1, 0, sp.L);
    const out = [pointA(sp, s0, ond)];
    for (let i = 0; i < sp.p.length; i++) if (sp.s[i] > s0 + .5 && sp.s[i] < s1 - .5) out.push(pointI(sp, i, ond));
    if (s1 - s0 > .5) out.push(pointA(sp, s1, ond));
    return out;
  }
  // un contour fermé, lissé par les milieux des côtés (courbes de Bézier quadratiques)
  function lisseFerme(p) {
    const n = p.length, m = i => [(p[i][0] + p[(i + 1) % n][0]) / 2, (p[i][1] + p[(i + 1) % n][1]) / 2], a = m(n - 1);
    let d = `M${f1(a[0])} ${f1(a[1])}`;
    for (let i = 0; i < n; i++) { const b = m(i); d += `Q${f1(p[i][0])} ${f1(p[i][1])} ${f1(b[0])} ${f1(b[1])}`; }
    return d + 'Z';
  }
  function lisseOuvert(P) {
    if (P.length < 2) return '';
    let d = `M${f1(P[0].x)} ${f1(P[0].y)}`;
    for (let i = 1; i < P.length - 1; i++) { const mx = (P[i].x + P[i + 1].x) / 2, my = (P[i].y + P[i + 1].y) / 2; d += `Q${f1(P[i].x)} ${f1(P[i].y)} ${f1(mx)} ${f1(my)}`; }
    const l = P[P.length - 1];
    return d + `L${f1(l.x)} ${f1(l.y)}`;
  }
  // le corps effilé : un côté, le bout arrondi, l'autre côté
  function contour(P, larg) {
    if (P.length < 2) return '';
    const g = [], dr = [];
    for (const q of P) { const h = Math.max(.05, larg(q.s)) / 2; g.push([q.x + q.nx * h, q.y + q.ny * h]); dr.push([q.x - q.nx * h, q.y - q.ny * h]); }
    const b = P[P.length - 1], h = Math.max(.05, larg(b.s)) / 2, tx = b.ny, ty = -b.nx, cap = [];
    if (h > .35) for (const phi of [Math.PI / 6, Math.PI / 2, 5 * Math.PI / 6]) cap.push([b.x + b.nx * h * Math.cos(phi) + tx * h * Math.sin(phi), b.y + b.ny * h * Math.cos(phi) + ty * h * Math.sin(phi)]);
    return lisseFerme(g.concat(cap, dr.reverse()));
  }
  // des petits cercles : les ventouses, d'un seul tracé
  function cercles(c) { return c.map(([x, y, r]) => `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0`).join(''); }
  function ventousesDe(P, larg, cote, rangs) {
    const c = [];
    if (P.length < 2) return '';
    const sFin = P[P.length - 1].s;
    let j = 0;
    for (let s = P[0].s + 10, g = 0; s < sFin - 6 && g < 70; g++) {
      const w = larg(s);
      if (w < 6) break;
      while (j < P.length - 2 && P[j + 1].s < s) j++;
      const q = P[j];
      if (rangs === 1) c.push([q.x + q.nx * cote * w * .27, q.y + q.ny * cote * w * .27, w * .095]);
      else { c.push([q.x + q.nx * w * .24, q.y + q.ny * w * .24, w * .085]); c.push([q.x - q.nx * w * .24, q.y - q.ny * w * .24, w * .085]); }
      s += w * .95 + 4;
    }
    return cercles(c);
  }
  // des hachures de graveur, d'un seul côté
  function hachuresDe(P, larg, cote) {
    let d = '';
    if (P.length < 2) return d;
    const sFin = P[P.length - 1].s;
    let j = 0;
    for (let s = P[0].s + 5, g = 0; s < sFin - 3 && g < 160; g++, s += 7) {
      while (j < P.length - 2 && P[j + 1].s < s) j++;
      const q = P[j], w = larg(s), l = 2.2 + w * 1.1, a = w / 2;
      d += `M${f1(q.x + q.nx * cote * a)} ${f1(q.y + q.ny * cote * a)}l${f1(q.nx * cote * l)} ${f1(q.ny * cote * l)}`;
    }
    return d;
  }

  /* ------------------------------------------------------------------------------------------------ le calque */
  let calque = null, scene = null, nIds = 0;
  function monter() {
    if (calque && calque.isConnected && scene) return scene;
    if (!document.body) return null;
    calque = document.createElement('div');
    calque.className = 'tt-calque';
    calque.setAttribute('aria-hidden', 'true');
    calque.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:2147483005;pointer-events:none;overflow:hidden;contain:strict;';
    scene = document.createElementNS(NS, 'svg');
    scene.setAttribute('focusable', 'false');
    scene.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none;';
    calque.appendChild(scene);
    document.body.appendChild(calque);
    return scene;
  }

  /* ------------------------------------------------------------------------------------------------ les acteurs */
  const acteurs = new Set(), cles = new Map();
  let raf = 0;
  function lancer(a, cle) {
    if (cle) { const ancien = cles.get(cle); if (ancien && ancien !== a) fondre(ancien, 110); cles.set(cle, a); a.cle = cle; }
    if (acteurs.size > 9) fondre([...acteurs][0], 60);
    a.t0 = null; acteurs.add(a);
    if (!raf) raf = requestAnimationFrame(boucle);
    return a;
  }
  function fondre(a, ms) { if (!a.fond) a.fond = { t0: performance.now(), ms }; }
  function boucle(now) {
    raf = 0;
    for (const a of [...acteurs]) {
      if (a.t0 === null) a.t0 = now;
      const t = Math.max(0, now - a.t0);
      let suite = true;
      try {
        if (a.fond) { const k = 1 - (now - a.fond.t0) / a.fond.ms; if (k <= 0) suite = false; else if (a.g) a.g.style.opacity = String(k); }
        if (suite) suite = a.pas(t) !== false && t < a.duree;
      } catch (e) { suite = false; }
      if (!suite) {
        acteurs.delete(a);
        try { a.fin(); } catch (e) { /* le calque a pu disparaître */ }
        if (a.cle && cles.get(a.cle) === a) cles.delete(a.cle);
      }
    }
    if (acteurs.size) raf = requestAnimationFrame(boucle);
  }
  function arreter() {
    for (const a of [...acteurs]) { acteurs.delete(a); try { a.fin(); } catch (e) { /* idem */ } }
    cles.clear();
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  const pret = () => !COUPE && !document.hidden && !intro() && !!document.body;

  /* ------------------------------------------------------------------------------------------------ une tentacule */
  /* Une épine, une fenêtre [a, g] (fractions de la longueur : g avance, a rattrape), une largeur, des décors.
     maj(a, g, t, opa) la redessine. */
  function tentacule(parent, d) {
    const S = d.S, g = creer('g', {}, parent);
    const halo = S.halo ? creer('path', { fill: 'none', stroke: d.couleur, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g) : null;
    const halo2 = S.halo ? creer('path', { fill: 'none', stroke: d.couleur, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g) : null;
    const liseret = d.contre && S.contre !== false ? creer('path', { fill: d.contre, stroke: d.contre, 'stroke-width': d.lw || 2.2, 'stroke-linejoin': 'round' }, g) : null;
    const corps = creer('path', { fill: d.couleur }, g);
    const vent = d.ventouses ? creer('path', { fill: d.ventouse }, g) : null;
    const hach = d.hachures ? creer('path', { fill: 'none', stroke: d.couleur, 'stroke-width': .8, 'stroke-linecap': 'round' }, g) : null;
    const sp = d.sp, L = sp.L, k = d.k || 1.15, am = d.amorce || 0, doux = x => { x = clamp(x); return x * x * (3 - 2 * x); };
    const base = s => { const w = d.w1 + (d.w0 - d.w1) * Math.max(0, 1 - s / L) ** k, m0 = d.amorceMin == null ? .2 : d.amorceMin; return am ? w * (m0 + (1 - m0) * doux(s / L / am)) : w; };
    function maj(a, gg, t, opa = 1) {
      const s0 = a * L, s1 = Math.max(s0 + .5, gg * L), n = s1 - s0;
      const ond = d.onde ? { A: d.onde.A * (d.onde.decroit ? Math.max(0, 1 - t / d.onde.decroit) : 1), k: 2 * Math.PI / d.onde.lambda, ph: t * d.onde.vitesse } : null;
      const P = fenetre(sp, s0, s1, ond), queue = Math.min(120, n * .4), tete = Math.min(60, n * .3);
      const larg = s => base(s) * (a > .001 ? clamp((s - s0) / queue) ** .8 : 1) * (gg < .999 ? .3 + .7 * clamp((s1 - s) / tete) ** .7 : 1);
      const dc = contour(P, larg);
      corps.setAttribute('d', dc);
      corps.setAttribute('opacity', String(opa * S.opa));
      if (liseret) { liseret.setAttribute('d', dc); liseret.setAttribute('opacity', String(opa * .9)); }
      if (halo) {
        const dd = lisseOuvert(P);
        halo.setAttribute('d', dd); halo.setAttribute('stroke-width', f1(d.w0 * 4.5)); halo.setAttribute('opacity', String(opa * .1));
        halo2.setAttribute('d', dd); halo2.setAttribute('stroke-width', f1(d.w0 * 1.9)); halo2.setAttribute('opacity', String(opa * .22));
      }
      if (vent) vent.setAttribute('d', ventousesDe(P, larg, d.cote, d.ventouses));
      if (hach) { hach.setAttribute('d', hachuresDe(P, larg, d.cote)); hach.setAttribute('opacity', String(opa)); }
    }
    return { g, maj, recolorer(c) { [halo, halo2].forEach(h => h && h.setAttribute('stroke', c)); corps.setAttribute('fill', c); if (hach) hach.setAttribute('stroke', c); } };
  }

  /* L'empreinte d'une ventouse : un anneau, des stries, un point. poser(échelle, opacité). */
  function empreinte(parent, x, y, r, P, couleur, rot = 0) {
    const g = creer('g', {}, parent), st = P.S.empreinte, col = couleur || P.accent;
    const lw = st === 'grande' ? 1.7 : 1.4;
    if (st === 'lueur') creer('circle', { r: r * 2.3, fill: avecAlpha(col, .22) }, g);
    creer('circle', { r, fill: 'none', stroke: col, 'stroke-width': lw }, g);
    if (st !== 'point') {
      const n = st === 'grande' ? 12 : 8, a = st === 'etoile' ? .25 : .5;
      let d = '';
      for (let i = 0; i < n; i++) { const th = i * 2 * Math.PI / n; d += `M${f1(Math.cos(th) * r * a)} ${f1(Math.sin(th) * r * a)}L${f1(Math.cos(th) * r * .84)} ${f1(Math.sin(th) * r * .84)}`; }
      creer('path', { d, stroke: col, 'stroke-width': st === 'grande' ? 1.1 : .9, 'stroke-linecap': 'round', fill: 'none' }, g);
      if (st === 'anneau' || st === 'grande') creer('circle', { r: r * .46, fill: 'none', stroke: col, 'stroke-width': .9 }, g);
    }
    creer('circle', { r: Math.max(1.3, r * .15), fill: col }, g);
    return { g, poser(k, opa) { g.setAttribute('transform', `translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${k.toFixed(3)})`); g.setAttribute('opacity', opa.toFixed(3)); } };
  }
  const graine = (...v) => Math.abs(v.reduce((h, x) => (h * 31 + Math.round(x)) | 0, 7));

  /* ------------------------------------------------------------------------------------------------ la pieuvre (le guide) */
  const PIVOT_G = [505, 840], PIVOT_D = [1030, 840], CENTRE = [771, 628];
  let generique = null;
  // la pieuvre de remplacement (administration, hôte vide sans D) : une tête, huit bras effilés qui se terminent en crosse
  function pieuvreNeutre() {
    if (generique) return generique;
    const bouts = [];
    const def = [[47, 56, 4, 70], [41, 55, 13, 88], [53, 58, 33, 92], [59, 59, 49, 94]];
    const un = cote => def.map(([x, y, bx, by], i) => {
      const X = cote ? 120 - x : x, BX = cote ? 120 - bx : bx, sens = cote ? 1 : -1;
      const sp = fil({ de: [X, y], dir0: [cote ? .5 : -.5, 1], vers: [BX, by - 6], crosse: { sens, r0: 6, r1: 1.6, tours: .9 }, courbe: cote ? -1 : 1, raideur: .42 });
      const larg = s => 1.3 + 6.4 * Math.max(0, 1 - s / sp.L) ** 1.1;
      bouts.push({ nom: (cote ? 'D' : 'G') + i, p: [BX, by - 6], dir: [cote ? .4 : -.4, 1] });
      return contour(fenetre(sp, 0, sp.L), larg);
    }).join('');
    const g = un(0), d = un(1);
    const tete = 'M30 50C30 24 44 9 60 9S90 24 90 50C90 57 83 61 76 61H44C37 61 30 57 30 50Z';
    generique = {
      svg: `<svg viewBox="0 0 120 100" aria-hidden="true" focusable="false"><g fill="currentColor"><path data-tt="bras-g" d="${g}"/><path data-tt="tete" d="${tete}"/><path data-tt="bras-d" d="${d}"/></g></svg>`,
      bouts, pg: [50, 58], pd: [70, 58], centre: [60, 50] };
    return generique;
  }
  // met la pieuvre dans les hôtes data-pieuvre vides
  function remplir(h) {
    if (h.firstElementChild || h.textContent.trim()) return;
    h.innerHTML = typeof D !== 'undefined' && D && D.logo && D.logo.octopus ? D.logo.octopus : pieuvreNeutre().svg;
  }
  function pieuvre() { document.querySelectorAll(R.pieuvre).forEach(remplir); }

  const ecran = (m, [x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
  const dirEcran = (m, [x, y]) => { const a = m.a * x + m.c * y, b = m.b * x + m.d * y, n = Math.hypot(a, b) || 1; return [a / n, b / n]; };
  /* Le guide : l'hôte [data-pieuvre], ses tracés, et les points de départ des tentacules (le bout de chaque bras, en px écran). */
  function trouverGuide() {
    let hote = null, rect = null;
    for (const h of document.querySelectorAll(R.pieuvre)) {
      const b = h.getBoundingClientRect();
      if (b.width < 8 || b.height < 8 || b.bottom <= 0 || b.top >= innerHeight || b.right <= 0 || b.left >= innerWidth) continue;
      if (h.checkVisibility && !h.checkVisibility({ checkVisibilityCSS: true })) continue;
      hote = h; rect = b; break;
    }
    if (!hote) return null;
    remplir(hote);
    const svg = hote.matches('svg') ? hote : hote.querySelector('svg');
    const G = { hote, rect, svg, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, bouts: [], centre: CENTRE, pg: PIVOT_G, pd: PIVOT_D, tg: null, td: null, groupe: null, echelle: 0 };
    let ctm = null;
    try { ctm = svg && svg.getScreenCTM(); } catch (e) { ctm = null; }
    if (svg && ctm) {
      const chemins = [...svg.querySelectorAll('path')], octo = typeof D !== 'undefined' && D && D.logo && D.logo.octopusPaths;
      if (octo && octo.length === 4) {
        const t = octo.map(d => chemins.find(p => p.getAttribute('d') === d));
        if (t.every(Boolean)) { G.tg = t[0]; G.td = t[3]; G.groupe = t[0].parentNode !== svg && t[0].parentNode.querySelectorAll(':scope > path').length === 4 ? t[0].parentNode : null; }
      }
      const marque = svg.querySelector('[data-tt="bras-g"]');
      if (!G.tg && marque) {
        G.tg = marque; G.td = svg.querySelector('[data-tt="bras-d"]'); G.groupe = marque.parentNode !== svg ? marque.parentNode : null;
        const ge = pieuvreNeutre(); G.pg = ge.pg; G.pd = ge.pd; G.centre = ge.centre;
        G.bouts = ge.bouts.map(b => ({ nom: b.nom, p: ecran(ctm, b.p), dir: dirEcran(ctm, b.dir) }));
      } else if (G.tg && typeof D !== 'undefined' && D.arms && D.arms.arms) {
        G.bouts = Object.entries(D.arms.arms).map(([nom, a]) => ({ nom, p: ecran(ctm, a.pts[a.pts.length - 1]), dir: dirEcran(ctm, a.exitdir || [0, 1]) }));
      }
      if (G.tg) G.echelle = Math.hypot(ctm.a, ctm.b) || 1;
    }
    if (!G.bouts.length) G.bouts = [{ nom: 'bas', p: [G.cx, rect.bottom - rect.height * .2], dir: [0, 1] }, { nom: 'gauche', p: [rect.left + rect.width * .2, G.cy], dir: [-1, .3] }, { nom: 'droite', p: [rect.right - rect.width * .2, G.cy], dir: [1, .3] }];
    return G;
  }
  // le bras d'où part une tentacule : celui du spectacle visé, sinon le plus tourné vers le but
  function boutPour(G, but, slug) {
    const v = [but[0] - G.cx, but[1] - G.cy], n = Math.hypot(v[0], v[1]) || 1;
    const nom = slug && typeof D !== 'undefined' && D.arms && D.arms.armOf && D.arms.armOf[slug];
    let best = G.bouts[0], bs = -9;
    for (const b of G.bouts) {
      const sc = (b.dir[0] * v[0] + b.dir[1] * v[1]) / n + (b.nom === nom ? 3 : 0);
      if (sc > bs) { bs = sc; best = b; }
    }
    return best;
  }

  /* La réaction du guide : il se contracte, ses bras ondulent. Les quatre tracés sont animés en place, comme l'ouverture
     d'intro.js ; sur un grand logo, le filtre d'ondes d'intro.js y ajoute l'ondulation. Sans tracé reconnu, l'hôte pulse. */
  let reaction = null;
  function arreterGuide() { if (reaction) { acteurs.delete(reaction); try { reaction.fin(); } catch (e) { /* hôte retiré */ } reaction = null; } }
  const BRAS = {
    // [durée (ms), amplitude des bras (°), contraction, penche (°), sens des bras]
    clic: [380, 14, .1, 4, 1], page: [640, 16, .14, 6, 1], ouvre: [420, 12, .06, 3, -1], ferme: [420, 12, .09, 3, 1],
    enroule: [560, 10, .08, 0, 1], retour: [440, 12, .09, 4, -1],
  };
  // un souffle : un anneau fin qui part de la pieuvre, pour qu'on la voie répondre même quand elle est petite
  function souffle(G, P, genre, retard) {
    if (genre === 'page') return;
    const svg = monter();
    if (!svg) return;
    const g = creer('g', {}, svg), r0 = Math.max(G.rect.width, G.rect.height) * .5 + 1, c = creer('circle', { cx: f1(G.cx), cy: f1(G.cy), r: f1(r0), fill: 'none', stroke: P.accent, 'stroke-width': 1.1, opacity: 0 }, g);
    const dur = dureeDe(340, P);
    lancer({ duree: dur + retard, g, fin() { g.remove(); }, pas(t) { const u = clamp((t - retard) / dur); c.setAttribute('r', f1(r0 + 5 + 11 * ease.out(u))); c.setAttribute('opacity', t < retard ? 0 : String(.55 * (1 - u))); return true; } }, 'souffle');
  }
  function reagir(genre = 'clic', vers = null, retard = 0) {
    if (!pret() || reduit()) return null;
    const G = trouverGuide();
    if (!G) return null;
    arreterGuide();
    const [dur0, amp, serre, penche, sens] = BRAS[genre] || BRAS.clic, P = palette(G.hote), dur = dureeDe(dur0, P) + retard;
    const lean = vers ? clamp((vers[0] - G.cx) / Math.max(200, innerWidth * .4), -1, 1) * penche : 0;
    const sauve = [];
    const garde = el => { if (el && !sauve.some(x => x[0] === el)) sauve.push([el, el.getAttribute('transform'), el.getAttribute('filter')]); };
    garde(G.groupe); garde(G.tg); garde(G.td);
    // les ondes : le filtre de déplacement d'intro.js, dans l'hôte lui-même, sur un logo assez grand pour les montrer
    let dep1 = null, off1 = null, defs = null;
    if (G.tg && G.svg && G.rect.width >= 90) {
      const id = `tt-onde-${++nIds}`;
      G.svg.insertAdjacentHTML('afterbegin', `<defs data-tt-defs><filter id="${id}" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.0036 0.0052" numOctaves="1" seed="11" result="bruit"/><feOffset in="bruit" dx="0" dy="0" result="flot"/><feDisplacementMap in="SourceGraphic" in2="flot" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`);
      defs = G.svg.querySelector('defs[data-tt-defs]');
      dep1 = defs.querySelector('feDisplacementMap'); off1 = defs.querySelector('feOffset');
      [G.tg, G.td].forEach(e => { if (e) e.setAttribute('filter', `url(#${id})`); });
    }
    const ampPx = clamp(G.rect.width * .028, 1, 9), unites = G.echelle ? ampPx / G.echelle : 0;
    const surH = !G.tg, styleAvant = G.hote.style.transform, origAvant = G.hote.style.transformOrigin;
    const a = { duree: dur, g: null, fin() { restaurer(); } };
    function restaurer() {
      sauve.forEach(([el, tr, fi]) => { if (!el.isConnected) return; if (tr === null) el.removeAttribute('transform'); else el.setAttribute('transform', tr); if (fi === null) el.removeAttribute('filter'); else el.setAttribute('filter', fi); });
      if (defs && defs.isConnected) defs.remove();
      if (G.hote.isConnected) { G.hote.style.transform = styleAvant; G.hote.style.transformOrigin = origAvant; }
      if (reaction === a) reaction = null;
    }
    a.pas = tt => {
      if (!G.hote.isConnected) return false;
      if (tt < retard) return true;
      const u = clamp((tt - retard) / Math.max(1, dur - retard));
      // la secousse : une impulsion qui monte vite, puis une détente qui se balance en s'éteignant (les bras de droite un peu après ceux de gauche)
      const choc = v => (v <= 0 ? 0 : v < .22 ? ease.out(v / .22) : Math.cos(((v - .22) / .78) * Math.PI * 1.6) * (1 - (v - .22) / .78) ** 1.5), imp = choc(u), impD = choc(u - .07);
      if (surH) { G.hote.style.transform = `scale(${(1 - serre * imp).toFixed(4)}) rotate(${(lean * imp).toFixed(2)}deg)`; return true; }
      G.hote.style.transform = `scale(${(1 - serre * .5 * imp * (sens > 0 ? 1 : -1)).toFixed(4)})`;
      const s = 1 - serre * imp * (sens > 0 ? 1 : -1), [cx, cy] = G.centre;
      if (G.groupe) G.groupe.setAttribute('transform', `translate(${cx} ${cy}) rotate(${(lean * imp).toFixed(2)}) scale(${s.toFixed(4)}) translate(${-cx} ${-cy})`);
      G.tg.setAttribute('transform', `rotate(${(amp * imp * sens).toFixed(2)} ${G.pg[0]} ${G.pg[1]})`);
      if (G.td) G.td.setAttribute('transform', `rotate(${(-amp * impD * sens).toFixed(2)} ${G.pd[0]} ${G.pd[1]})`);
      if (dep1) {
        const onde = clamp(.3 + Math.abs(imp) * .8) * (1 - u) ** .7;
        dep1.setAttribute('scale', (onde * unites * 2).toFixed(2));
        off1.setAttribute('dx', (tt * .16).toFixed(1)); off1.setAttribute('dy', (-tt * .11).toFixed(1));
      }
      return true;
    };
    G.hote.style.transformOrigin = '50% 50%';
    reaction = a;
    souffle(G, P, genre, retard);
    return lancer(a);
  }

  /* ------------------------------------------------------------------------------------------------ les gestes */
  const rectDe = el => (el && el.getBoundingClientRect ? el.getBoundingClientRect() : { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 });
  const centreDe = r => [r.left + r.width / 2, r.top + r.height / 2];

  // le point d'où part la tentacule : un bras du guide, ou, près du bord, un point de bordure
  function origine(but, o) {
    const W = innerWidth, H = innerHeight;
    if (!(o.local || admin())) {
      const G = trouverGuide();
      if (G) { const b = boutPour(G, but, o.slug); return { p: b.p, dir: b.dir, G }; }
    } else if (admin() && !o.local) {
      const G = trouverGuide();
      if (G && Math.hypot(but[0] - G.cx, but[1] - G.cy) < 260) { const b = boutPour(G, but, o.slug); return { p: b.p, dir: b.dir, G }; }
    }
    // le conteneur le plus proche (panneau, barre) ou l'écran : le bord le plus proche du but
    const cont = o.el && o.el.closest && o.el.closest('[data-tt-local], .ed-panneau, .ed-barre, .ed-outils, .bloc, .item, .filtres, .pied-ed, .tete');
    const r = cont ? cont.getBoundingClientRect() : { left: 0, top: 0, right: W, bottom: H };
    const l = Math.max(0, r.left), t = Math.max(0, r.top), rt = Math.min(W, r.right), b = Math.min(H, r.bottom);
    const cand = [[but[0] - l, [l, but[1]], [-1, 0]], [rt - but[0], [rt, but[1]], [1, 0]], [but[1] - t, [but[0], t], [0, -1]], [b - but[1], [but[0], b], [0, 1]]].sort((x, y) => x[0] - y[0])[0];
    const max = admin() || o.local ? 110 : 260;
    let p = cand[1];
    const d = Math.hypot(but[0] - p[0], but[1] - p[1]);
    if (d > max) p = [but[0] + (p[0] - but[0]) * max / d, but[1] + (p[1] - but[1]) * max / d];
    return { p, dir: [-cand[2][0], -cand[2][1]], G: null, bord: true };
  }

  /* Le geste de base : une tentacule fine part du guide, s'enroule sur le point touché, y laisse l'empreinte d'une ventouse,
     puis se retire vers la pieuvre. */
  const cleurs = [];
  function toucher(but, o = {}) {
    if (!pret()) return null;
    if (!Array.isArray(but)) { const r = rectDe(but); o = Object.assign({ el: but }, o); but = centreDe(r); }
    const P = palette(o.el), svg = monter();
    if (!svg) return null;
    const accent = o.accent || o.couleur || P.accent, couleur = o.couleur || P.encre;
    if (reduit()) return empreinteFondue(svg, but, P, accent);
    const orig = o.seulEmpreinte ? null : origine(but, o), dist = orig ? Math.hypot(but[0] - orig.p[0], but[1] - orig.p[1]) : 0;
    const total = dureeDe(clamp(330 + dist * .12, 350, 450), P), dur = total / 1.15, mobile = innerWidth < 700, rayon = mobile ? 5.5 : 6.5, rot = graine(but[0], but[1]) % 45;
    const sens = graine(but[0] / 3, but[1] / 3) % 2 ? 1 : -1;
    const g = creer('g', {}, svg), imp = empreinte(g, but[0], but[1], rayon, P, accent, rot);
    let tt = null;
    if (orig && dist > 20) {
      const sp = fil({ de: orig.p, dir0: orig.dir, vers: but, crosse: { sens, r0: rayon + 8, r1: rayon + 1.5, tours: 1.25 }, courbe: sens * (orig.bord ? .6 : 1), raideur: .42 });
      tt = tentacule(g, { sp, S: P.S, couleur, contre: P.contre, lw: 2.4, w0: P.ep * P.S.corps * (admin() ? 1.6 : 2.4), w1: 1.3, k: 1.1, amorce: orig.bord ? 0 : .22, cote: sens, ventouse: P.ventouse,
        onde: { A: clamp(dist * .03, 3, 11), lambda: 130, vitesse: .018, decroit: dur * .9 } });
    }
    const a = { duree: total, g, fin() { g.remove(); } };
    a.pas = t => {
      const u = t / dur;
      if (tt) tt.maj(0, clamp(ease.out(clamp((u - .05) / .47)) * (1 - ease.inOut(clamp((u - .6) / .4))), 0, 1), t, 1);
      const contact = tt ? .5 : 0, c = clamp((u - contact) / .12), p = clamp((u - contact - .1) / (1.15 - contact - .1));
      imp.poser(lerp(1.8, 1, ease.out(c)), u < contact ? 0 : clamp(c * 1.5) * (1 - ease.in(p)));
      return true;
    };
    lancer(a);
    cleurs.push(a);
    while (cleurs.length > 2) fondre(cleurs.shift(), 90);
    if (o.guide !== false && !o.local) reagir(o.genre || 'clic', but);
    return a;
  }
  function empreinteFondue(svg, but, P, accent) {
    const g = creer('g', {}, svg), imp = empreinte(g, but[0], but[1], 8, P, accent, 0);
    return lancer({ duree: 260, g, fin() { g.remove(); }, pas(t) { imp.poser(1, Math.sin(Math.PI * clamp(t / 260)) * .85); return true; } }, 'fondu');
  }

  /* La remontée d'une page : une tentacule, à la couleur de la destination, part du bas de l'écran, traverse la page,
     rejoint la pieuvre et s'enroule sur elle ; la pieuvre la reprend et la tentacule s'y retire. */
  let pageActeur = null;
  function page(dest, depart = null) {
    if (!pret()) return null;
    dest = typeof dest === 'string' && dest[0] === '#' ? destination(dest) : typeof dest === 'string' ? { couleur: dest } : (dest || destination(location.hash));
    if (dest.muet) { reagir('page', null); return null; }
    const P = palette(), svg = monter();
    if (!svg) return null;
    const couleur = dest.couleur || P.neutre;
    if (pageActeur && performance.now() - pageActeur.debut < 160) { pageActeur.recolorer(couleur); return pageActeur; }   // une redirection : même geste
    if (reduit()) return voile(svg, couleur);
    const W = innerWidth, H = innerHeight, G = trouverGuide(), mobile = W < 700, S = P.S;
    // l'arrivée : un élément que la page réclame (data-tt-cible : une porte à ouvrir…), sinon le bras du spectacle visé ou le centre
    // de la pieuvre ; sans pieuvre à l'écran, le bord haut
    let cible = G ? [G.cx, G.cy] : [clamp(depart ? depart.x * .5 + W * .1 : W * .3, 40, W - 40), 14], rg = G ? clamp(Math.max(G.rect.width, G.rect.height) * .62, 14, 44) : 22, reclame = false;
    const ce = document.querySelector('[data-tt-cible]'), rc = ce ? ce.getBoundingClientRect() : null;
    if (rc && rc.width > 4 && rc.height > 4 && rc.top < H - 24 && rc.bottom > 24 && rc.left < W - 8 && rc.right > 8) {
      const [fx, fy] = String(ce.getAttribute('data-tt-cible') || '').split(',').map(parseFloat);
      cible = [rc.left + rc.width * (isFinite(fx) ? fx : .5), rc.top + rc.height * (isFinite(fy) ? fy : .5)];
      rg = clamp(Math.min(rc.width, rc.height) * .3, 14, 44); reclame = true;
    }
    if (G && dest.slug && !reclame) { const b = boutPour(G, [W / 2, H], dest.slug); if (b && b.nom !== 'bas') cible = b.p; }
    // le départ : sous l'écran, à la hauteur du clic (par défaut) ; ou le point cliqué lui-même (voie 'clic') : la tentacule en sort et remonte
    const clic = R.voie === 'clic' && depart && isFinite(depart.x) && isFinite(depart.y);
    const x0 = clic ? clamp(depart.x, 24, W - 24) : clamp(depart ? depart.x : W * .66, W * .24, W * .84), racine = clic ? [x0, clamp(depart.y, 48, H - 24)] : [x0, H + 50];
    const sens = x0 > cible[0] ? -1 : 1, bow = graine(...[...(dest.slug || dest.couleur || 'x')].map(c => c.charCodeAt(0))) % 2 ? 1 : -1;
    const dur = dureeDe(admin() ? 330 : 620, P);
    const w0 = clamp(W * .045, 19, 64) * S.page * (admin() ? .55 : 1), w1 = Math.max(1.6, 3.6 * S.page);
    const sp = fil({ de: racine, vers: cible, crosse: { sens, r0: rg, r1: rg * .5, tours: 1.1 },
      ctrl: (E, te) => { const dy = Math.max(60, racine[1] - E[1]); return [[x0 + bow * W * .1, racine[1] - dy * .4], [lerp(x0, E[0], .6) - bow * W * .14 - te[0] * 40, E[1] + dy * .38]]; } });
    const g = creer('g', {}, svg), tt = tentacule(g, { sp, S, couleur, contre: P.contre, lw: 2.4, w0, w1, k: 1.7, cote: -sens, ventouses: S.ventouses, ventouse: P.ventouse, hachures: S.hachures, amorce: clic ? .2 : 0, amorceMin: .55,
      onde: { A: mobile ? 7 : 12, lambda: 280, vitesse: .011, decroit: dur * 1.1 } });
    const bague = creer('circle', { cx: f1(cible[0]), cy: f1(cible[1]), r: 0, fill: 'none', stroke: couleur, 'stroke-width': 1.5, opacity: 0 }, g);
    const a = { duree: dur, g, debut: performance.now(), recolorer(c) { tt.recolorer(c); bague.setAttribute('stroke', c); }, fin() { g.remove(); if (pageActeur === a) pageActeur = null; } };
    let touche = false;
    a.pas = t => {
      const u = clamp(t / dur);
      tt.maj(ease.inOut(clamp((u - .26) / .7)) * .985, ease.out4(clamp(u / .38)), t, 1 - ease.in2(clamp((u - .93) / .07)));
      if (u >= .36 && !touche) { touche = true; reagir('page', null); }
      const b = clamp((u - .36) / .4);
      bague.setAttribute('r', f1(rg * (.9 + 1.4 * ease.out(b)))); bague.setAttribute('opacity', u < .36 ? 0 : String((1 - b) * .75));
      return true;
    };
    pageActeur = a;
    return lancer(a, 'page');
  }
  // sans mouvement : un fondu bref, à la couleur de la destination
  function voile(svg, couleur) {
    const g = creer('g', {}, svg), r = creer('rect', { x: 0, y: 0, width: '100%', height: '100%', fill: couleur, opacity: 0 }, g);
    return lancer({ duree: 260, g, fin() { g.remove(); }, pas(t) { r.setAttribute('opacity', (Math.sin(Math.PI * clamp(t / 260)) * .13).toFixed(3)); return true; } }, 'page');
  }
  // la page, soulevée par la tentacule qui remonte
  let levee = null;
  function soulever() {
    if (!R.soulever || reduit() || COUPE || edition()) return;
    const el = document.querySelector(R.page);
    if (!el || !el.animate) return;
    try { if (levee) levee.cancel(); } catch (e) { /* déjà finie */ }
    levee = el.animate([{ transform: `translateY(${admin() ? 10 : 24}px)`, opacity: .55 }, { transform: 'translateY(0)', opacity: 1 }], { duration: admin() ? 240 : 460, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
  }
  // la couleur d'une destination : l'entrée, l'univers du spectacle, sinon une couleur neutre
  function destination(hash) {
    const h = String(hash || '').replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean).map(x => { try { return decodeURIComponent(x); } catch (e) { return x; } });
    if (typeof R.couleurDe === 'function') { const c = R.couleurDe(hash); if (c === false) return { couleur: null, slug: null, muet: true }; if (c) return { couleur: c, slug: h[0] === 'spectacle' ? h[1] : null }; }
    const out = { couleur: null, slug: null };
    if (typeof D === 'undefined' || !D || !D.site) return out;
    const vive = R.entrees === 'vive' || (R.entrees === 'auto' && lum(fondPage()) < .3);
    const e = (D.site.entrees || []).find(x => x.href === '#/' + h[0] || x.cle === h[0]);
    if (h.length === 1 && e) out.couleur = vive ? (e.couleurVive || e.couleur) : e.couleur;
    else if (h[0] === 'spectacle') {
      const s = (D.shows || []).find(x => x.slug === h[1]), c = s && ((s.univers && s.univers.couleurs) || s.palette || {});
      out.slug = h[1];
      if (c) out.couleur = c.scene || c.accent || s.couleur;
    }
    return out;
  }

  /* Un onglet choisi : la tentacule glisse de l'onglet quitté à l'onglet choisi, le long du filet. */
  function onglet(de, vers, couleur) {
    if (!pret() || reduit() || !de || !vers || de === vers) return null;
    const a0 = rectDe(de), b0 = rectDe(vers), P = palette(vers), svg = monter();
    if (!svg || !a0.width || !b0.width) return null;
    // des onglets côte à côte : le long de leur filet ; l'un sous l'autre (un sommaire) : le long de la liste, du côté des repères
    const vert = Math.abs(b0.top - a0.top) > Math.abs(b0.left - a0.left) * 1.5 + 8;
    const A = vert ? [a0.right - 8, a0.top + a0.height / 2] : [a0.left + a0.width / 2, a0.bottom - 2], B = vert ? [b0.right - 8, b0.top + b0.height / 2] : [b0.left + b0.width / 2, b0.bottom - 2];
    if (Math.hypot(A[0] - B[0], A[1] - B[1]) < 12) return null;
    const sens = vert ? (B[1] > A[1] ? 1 : -1) : (B[0] > A[0] ? 1 : -1), dur = dureeDe(320, P), col = couleur || P.accent;
    const sp = fil({ de: A, dir0: vert ? [-.3, sens] : [sens, .3], vers: B, crosse: { sens: 1, r0: 7, r1: 2.5, tours: .9 }, courbe: vert ? -.5 : 1, raideur: .3 });
    const g = creer('g', {}, svg), tt = tentacule(g, { sp, S: P.S, couleur: col, contre: P.contre, lw: 2.2, w0: Math.max(5, P.ep * 2.6), w1: 1.2, k: 1.1, amorce: .25, cote: 1, onde: { A: 3.5, lambda: 90, vitesse: .02, decroit: dur } });
    return lancer({ duree: dur, g, fin() { g.remove(); }, pas(t) { const u = clamp(t / dur); tt.maj(ease.inOut(clamp((u - .3) / .7)) * .97, ease.out(clamp(u / .6)), t, 1); return true; } }, 'onglet');
  }

  /* Ce qui s'ouvre : la tentacule se déroule le long du bord de ce qui apparaît, et s'enroule en crosse au bout. */
  function zoneDe(cible) {
    const r = cible && cible.getBoundingClientRect ? cible.getBoundingClientRect() : cible;
    if (!r) return null;
    let top = r.top;
    if (cible && cible.nodeType && cible.matches && cible.matches('details')) { const s = cible.querySelector(':scope > summary'); if (s) top = s.getBoundingClientRect().bottom; }
    return { left: r.left, right: r.right, top, bottom: r.bottom, width: r.width, height: r.bottom - top };
  }
  function ouvrir(cible, o = {}) {
    if (!pret()) return null;
    const r = zoneDe(cible);
    if (!r || r.height < 10 || r.width < 10) return null;
    const P = palette(cible && cible.nodeType ? cible : null), svg = monter();
    if (!svg) return null;
    if (reduit()) return empreinteFondue(svg, [r.left + 10, r.top + 10], P, P.accent);
    const ligne = o.sens === 'ligne', horiz = ligne || o.sens === 'bas' || (!o.sens && r.width > r.height * 2.4);
    const col = o.couleur || P.accent, top = Math.max(r.top, -40), bas = Math.min(r.bottom, innerHeight + 40);
    let de, vers, dir0;
    if (horiz) { const y = ligne ? r.top - 3 : Math.min(r.bottom, innerHeight - 3) - 3; de = [Math.max(r.left, -20) + 2, y]; vers = [Math.min(r.right, innerWidth + 20) - 12, y]; dir0 = [1, .2]; }
    else { const x = r.left > 16 ? r.left - 8 : r.left + 6; de = [x, top + 2]; vers = [x, Math.max(top + 30, bas - 14)]; dir0 = [.15, 1]; }
    const len = Math.hypot(vers[0] - de[0], vers[1] - de[1]);
    if (len < 26) return null;
    const dur = dureeDe(clamp(300 + len * .2, 320, 520), P), sens = horiz ? 1 : -1;
    const sp = fil({ de, dir0, vers, crosse: { sens, r0: ligne ? 5 : 8, r1: 2.2, tours: 1 }, courbe: ligne ? .15 : .35, raideur: .3 });
    const g = creer('g', {}, svg), tt = tentacule(g, { sp, S: P.S, couleur: col, contre: P.contre, lw: 2.2, w0: Math.max(4.4, P.ep * 2.2), w1: 1.2, k: 1.1, cote: 1, onde: { A: ligne ? 1.6 : 3.5, lambda: 120, vitesse: .014, decroit: dur } });
    reagir('ouvre', centreDe(r));
    return lancer({ duree: dur, g, fin() { g.remove(); }, pas(t) { const u = clamp(t / dur); tt.maj(0, ease.out(clamp(u / .62)), t, 1 - ease.in(clamp((u - .62) / .38))); return true; } }, 'ouvre');
  }
  // ce qui se ferme : la tentacule remonte le long du bord et s'enroule sur elle-même, sous la rubrique
  function fermer(cible, o = {}) {
    if (!pret() || reduit()) return null;
    const r = zoneDe(cible);
    if (!r || r.height < 10 || r.width < 10) return null;
    const P = palette(cible && cible.nodeType ? cible : null), svg = monter();
    if (!svg) return null;
    const horiz = o.sens === 'bas' || (!o.sens && r.width > r.height * 2.4), col = o.couleur || P.accent;
    const top = Math.max(r.top, -40), bas = Math.min(r.bottom, innerHeight + 40);
    let de, vers, dir0;
    if (horiz) { de = [Math.min(r.right, innerWidth + 20) - 12, Math.min(r.bottom, innerHeight - 3) - 3]; vers = [Math.max(r.left, -20) + 10, de[1]]; dir0 = [-1, -.2]; }
    else { const x = r.left > 16 ? r.left - 8 : r.left + 6; de = [x, Math.max(top + 30, bas - 14)]; vers = [x, top + 8]; dir0 = [.1, -1]; }
    const len = Math.hypot(vers[0] - de[0], vers[1] - de[1]);
    if (len < 26) return null;
    const dur = dureeDe(clamp(300 + len * .2, 320, 480), P);
    const sp = fil({ de, dir0, vers, crosse: { sens: horiz ? -1 : 1, r0: 9, r1: 2.4, tours: 1.6 }, courbe: .3, raideur: .3 });
    const g = creer('g', {}, svg), tt = tentacule(g, { sp, S: P.S, couleur: col, contre: P.contre, lw: 2.2, w0: Math.max(4.4, P.ep * 2.2), w1: 1.2, k: 1.1, cote: 1, onde: { A: 3, lambda: 110, vitesse: .014, decroit: dur } });
    reagir('ferme', centreDe(r));
    const fin = sp.Lb / sp.L;
    return lancer({ duree: dur, g, fin() { g.remove(); }, pas(t) { const u = clamp(t / dur); tt.maj(ease.inOut(clamp((u - .28) / .6)) * fin * .98, ease.out(clamp(u / .45)), t, 1 - ease.in(clamp((u - .8) / .2))); return true; } }, 'ouvre');
  }

  /* Un bouton enroulé : l'envoi d'un formulaire, un enregistrement réussi. sens −1 : à l'envers (revenir en arrière). */
  function enrouler(cible, o = {}) {
    if (!pret()) return null;
    const r = cible && cible.getBoundingClientRect ? cible.getBoundingClientRect() : cible;
    if (!r || r.width < 8 || r.height < 8) return null;
    const P = palette(cible && cible.nodeType ? cible : null), svg = monter();
    if (!svg) return null;
    if (reduit()) return empreinteFondue(svg, centreDe(r), P, P.accent);
    const sens = o.sens === -1 ? -1 : 1, tours = 1.3, dur = dureeDe(o.court ? 360 : 520, P);
    // le tour du bouton, rectangle à coins arrondis, en spirale qui s'écarte un peu à chaque tour
    const x0 = r.left, y0 = r.top, w = r.width, h = r.height, rr = Math.min(h / 2, w / 2, 20);
    const seg = [w - 2 * rr, Math.PI * rr / 2, h - 2 * rr, Math.PI * rr / 2, w - 2 * rr, Math.PI * rr / 2, h - 2 * rr, Math.PI * rr / 2], Lt = seg.reduce((a, b) => a + b, 0);
    const pos = s => {
      s = ((s % Lt) + Lt) % Lt;
      let i = 0;
      while (i < 7 && s > seg[i]) { s -= seg[i]; i++; }
      const t = seg[i] ? s / seg[i] : 0;
      switch (i) {
        case 0: return [x0 + rr + t * (w - 2 * rr), y0, 0, -1];
        case 1: { const a = -Math.PI / 2 + t * Math.PI / 2; return [x0 + w - rr + Math.cos(a) * rr, y0 + rr + Math.sin(a) * rr, Math.cos(a), Math.sin(a)]; }
        case 2: return [x0 + w, y0 + rr + t * (h - 2 * rr), 1, 0];
        case 3: { const a = t * Math.PI / 2; return [x0 + w - rr + Math.cos(a) * rr, y0 + h - rr + Math.sin(a) * rr, Math.cos(a), Math.sin(a)]; }
        case 4: return [x0 + w - rr - t * (w - 2 * rr), y0 + h, 0, 1];
        case 5: { const a = Math.PI / 2 + t * Math.PI / 2; return [x0 + rr + Math.cos(a) * rr, y0 + h - rr + Math.sin(a) * rr, Math.cos(a), Math.sin(a)]; }
        case 6: return [x0, y0 + h - rr - t * (h - 2 * rr), -1, 0];
        default: { const a = Math.PI + t * Math.PI / 2; return [x0 + rr + Math.cos(a) * rr, y0 + rr + Math.sin(a) * rr, Math.cos(a), Math.sin(a)]; }
      }
    };
    const pts = [], total = Lt * tours, n = Math.ceil(total / 5);
    for (let i = 0; i <= n; i++) {
      const s = sens > 0 ? total * i / n : Lt - total * i / n, q = pos(s), off = 3.5 + 5 * i / n;
      pts.push([q[0] + q[2] * off, q[1] + q[3] * off]);
    }
    const sp = epine(pts, pts.length - 1);
    const g = creer('g', {}, svg), couleur = o.couleur || P.accent;
    const tt = tentacule(g, { sp, S: P.S, couleur, contre: P.contre, lw: 2.2, w0: Math.max(4.2, P.ep * 2), w1: 1.4, k: 1.05, cote: 1 });
    reagir(sens > 0 ? 'enroule' : 'retour', centreDe(r));
    const a = { duree: dur, g, fin() { g.remove(); } };
    a.pas = t => {
      if (cible.nodeType && !cible.isConnected) fondre(a, 150);                  // le bouton a disparu (l'écran a changé) : la tentacule s'efface
      const u = clamp(t / dur); tt.maj(ease.inOut(clamp((u - .62) / .38)) * .5, ease.out(clamp(u / .55)), t, 1 - ease.in(clamp((u - .78) / .22))); return true; };
    return lancer(a, 'enroule:' + Math.round(r.left) + ':' + Math.round(r.top));
  }
  const confirmer = (el, o) => enrouler(el, o);
  const retour = (el, o = {}) => enrouler(el, Object.assign({ sens: -1, court: true }, o));
  // une ligne qui s'ajoute : la tentacule se déroule le long de son bord (sous elle, si elle est large)
  const ajouter = el => { if (!el) return null; const r = rectDe(el); return ouvrir(el, r.width > r.height * 2.4 ? { sens: 'ligne' } : {}); };

  /* ------------------------------------------------------------------------------------------------ les clics */
  const CHAMP = 'input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="file"]):not([type="color"]):not([type="range"]), textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]';
  const ACTIF = 'a[href], button, summary, [role="button"], [role="tab"], [role="link"], [role="menuitem"], [role="switch"], [role="checkbox"], [role="radio"], [role="option"], input[type="checkbox"], input[type="radio"], input[type="submit"], input[type="button"], input[type="reset"], label, [data-tt]';
  const GENRES = ['onglet', 'ouvre', 'bascule', 'case', 'route', 'retour', 'clic'];
  const routeVers = el => { const h = el.getAttribute && el.getAttribute('href'); return h && /^#\//.test(h) && h !== location.hash ? h : null; };
  // un onglet : son rôle, ou la marque « courant » sur lui ou sur l'un de ses voisins
  function ongletDe(el) {
    const marque = '[aria-current]:not([aria-current="false"]), [aria-selected="true"]';
    const liste = el.closest('[role="tablist"], nav, ul, ol, .onglets, .seg');
    if (!liste) return null;
    const actifs = [...liste.querySelectorAll(marque)].filter(x => x !== el && !x.contains(el) && !el.contains(x));
    if (!(el.matches(marque) || el.getAttribute('role') === 'tab' || el.hasAttribute('aria-selected') || actifs.length)) return null;
    const a = actifs.find(x => x.matches('a, button, [role="tab"]')) || actifs[0];
    return { liste, ancien: a ? (a.matches('a, button, [role="tab"]') ? a : a.querySelector('a, button, [role="tab"]') || a) : null };
  }
  function genreDe(el) {
    const force = el.closest('[data-tt]'), d = force && force.getAttribute('data-tt');
    if (GENRES.includes(d)) return d;
    if (el.matches('summary') || el.getAttribute('aria-expanded') !== null) return 'ouvre';
    if (routeVers(el)) return 'route';
    if (ongletDe(el)) return 'onglet';
    if (el.matches('input[type="checkbox"], input[type="radio"], label, [role="switch"], [role="checkbox"], [role="radio"]')) return 'case';
    if (el.hasAttribute('aria-pressed')) return 'bascule';
    return 'clic';
  }
  let attente = null, dernier = null, aFermer = null, enreg = null;
  function surClic(e) {
    if (!pret()) return;
    const t = e.target;
    if (!t || !t.closest) return;
    if (t.closest(CHAMP) || t.isContentEditable || t.closest('[data-tt="rien"], .intro, .tt-calque')) return;
    let el = t.closest(ACTIF);
    if (!el && edition()) el = t.closest('[data-date-id]:not([data-date-id=""]), [data-edit-photo]');
    if (!el || el.closest('[data-tt="rien"]')) return;
    if (el.tagName === 'LABEL') { const c = el.control; if (!c || c.matches(CHAMP)) return; }
    const maintenant = performance.now(), r = rectDe(el);
    if (!r.width && !r.height) return;
    // un libellé relayé à sa case donne deux clics : un seul geste
    if (dernier && maintenant - dernier.t < 70 && (dernier.el === el || dernier.el.control === el || el.control === dernier.el || dernier.el.contains(el))) return;
    const clavier = e.detail === 0 || (!e.clientX && !e.clientY), but = clavier ? centreDe(r) : [e.clientX, e.clientY];
    dernier = { t: maintenant, el, but };
    let genre = genreDe(el);
    const local = !!el.closest('[data-tt-local], .ed-boite');
    // Ctrl, Maj ou Cmd + clic, ou un lien qui s'ouvre ailleurs : la page ne change pas, donc pas de remontée
    if ((genre === 'route' || genre === 'onglet') && (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || el.target === '_blank')) genre = 'clic';
    const lien = (el.getAttribute('href') || '').match(/^#\/spectacle\/([^/?]+)/), slug = lien ? decodeURIComponent(lien[1]) : null;
    const cc = el.closest('[data-tt-couleur]'), couleurLien = cc ? cc.getAttribute('data-tt-couleur') : null;
    if (el.matches('[data-ed="enregistrer"], [data-x="enregistrer"]')) enreg = { t: maintenant, rect: r };
    const o = ongletDe(el);
    if (genre === 'route') {
      const h = routeVers(el), dest = h ? destination(h) : {}, col = couleurLien || dest.couleur || null;
      attente = { t: maintenant, x: but[0], y: but[1], hash: h };
      toucher(but, { el, seulEmpreinte: true, couleur: null, accent: col, genre: 'clic', local });
      if (o && o.ancien) onglet(o.ancien, el, col);
      return;
    }
    if (genre === 'onglet') { toucher(but, { el, seulEmpreinte: true, accent: couleurLien, genre: 'clic', local }); if (o && o.ancien) onglet(o.ancien, el, couleurLien); return; }
    if (genre === 'retour') {
      // revenir en arrière : la tentacule qui s'était déroulée le long de la fiche s'enroule ; sinon, elle s'enroule à l'envers sur le bouton
      const zone = el.closest('[data-tt-zone], .editeur');
      toucher(but, { el, seulEmpreinte: true, genre: 'retour', local });
      if (zone && el.matches('a[href]')) fermer(zoneDe(zone), { sens: 'gauche' }); else retour(el, {});
      return;
    }
    if (genre === 'ouvre') {
      toucher(but, { el, seulEmpreinte: true, genre: 'clic', local });
      const det = el.closest('details'), ctrl = !det && el.getAttribute('aria-expanded') !== null ? document.getElementById(el.getAttribute('aria-controls') || '') : null;
      const ouvert = det ? det.open : el.getAttribute('aria-expanded') === 'true', zone = det || ctrl;
      aFermer = { t: maintenant, el, det, ctrl, ouvert, rect: zone && ouvert ? zoneDe(zone) : null, avant: el.getAttribute('aria-expanded') };
      if (!det) verifierOuverture(0);
      return;
    }
    toucher(but, { el, genre: 'clic', local, slug });
  }
  // un bouton aria-expanded : ouvert ou fermé après le clic ? (la maquette le met à jour tout de suite, ou dans les images qui suivent)
  function verifierOuverture(n) {
    const f = aFermer;
    if (!f || f.det || performance.now() - f.t > 700) return;
    if (f.el.getAttribute('aria-expanded') === f.avant) { if (n < 8) requestAnimationFrame(() => verifierOuverture(n + 1)); return; }
    aFermer = null;
    if (f.el.getAttribute('aria-expanded') === 'true') {
      const z = f.ctrl || f.el, r = z.getBoundingClientRect();
      ouvrir(z, { sens: f.ctrl && r.width > innerWidth * .7 && r.height < innerHeight * .8 ? 'bas' : undefined });
    } else if (f.rect) fermer(f.rect, { sens: f.rect.width > innerWidth * .7 ? 'bas' : undefined });
  }
  // <details> : le contenu se dessine pendant l'évènement toggle ; on mesure deux images plus tard
  function surBascule(e) {
    const dt = e.target;
    if (!pret() || !dt || !dt.matches || !dt.matches('details') || dt.closest('[data-tt="rien"]')) return;
    const f = aFermer && aFermer.det === dt && performance.now() - aFermer.t < 900 ? aFermer : null;
    if (!f) return;
    aFermer = null;
    if (dt.open) requestAnimationFrame(() => requestAnimationFrame(() => ouvrir(dt, {})));
    else if (f.rect) fermer(f.rect, {});
  }
  function surRoute() {
    if (!pret()) return;
    const dest = destination(location.hash), dep = attente && performance.now() - attente.t < 900 ? attente : null;
    attente = null;
    soulever();
    // à l'image suivante : la maquette a alors changé de page et remonté en haut, la pieuvre est de nouveau à l'écran
    requestAnimationFrame(() => { if (R.remontee) page(dest, dep); else reagir('page', null); });
  }
  function surEnvoi(e) {
    if (!pret()) return;
    const f = e.target, b = e.submitter || (f.querySelector && f.querySelector('[type="submit"], button:not([type])'));
    if (b && !b.closest('[data-tt="rien"]')) enrouler(b, {});
  }
  // l'édition sur place : les panneaux (date, connexion) qui s'ouvrent et se ferment, l'enregistrement réussi
  const panneaux = new Map();
  const annonces = new MutationObserver(ms => {
    for (const m of ms) m.addedNodes.forEach(n => {
      if (n.nodeType !== 1 || !enreg || performance.now() - enreg.t > 12000) return;
      const r = enreg.rect;
      enreg = null;
      if (!n.classList.contains('ed-erreur')) { const b = document.querySelector('[data-ed="enregistrer"]'); enrouler(b && b.isConnected && !b.disabled ? b : r, {}); }
    });
  });
  function surDom(ms) {
    for (const m of ms) {
      m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.matches('.ed-voile')) requestAnimationFrame(() => requestAnimationFrame(() => { const p = n.querySelector('.ed-panneau'); if (p && n.isConnected && pret()) { panneaux.set(n, zoneDe(p)); ouvrir(p, { sens: 'gauche' }); } }));
        if (n.matches('.ed-annonces')) annonces.observe(n, { childList: true });
      });
      m.removedNodes.forEach(n => { if (n.nodeType === 1 && panneaux.has(n)) { const r = panneaux.get(n); panneaux.delete(n); if (pret()) fermer(r, { sens: 'gauche' }); } });
    }
  }
  function brancher() {
    document.addEventListener('click', surClic, { capture: true, passive: true });
    window.addEventListener('hashchange', surRoute, { passive: true });
    document.addEventListener('toggle', surBascule, { capture: true, passive: true });
    document.addEventListener('submit', surEnvoi, { capture: true, passive: true });
    document.addEventListener('keydown', e => { if (edition() && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { const b = document.querySelector('[data-ed="enregistrer"]'); if (b) enreg = { t: performance.now(), rect: rectDe(b) }; } }, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { arreter(); arreterGuide(); } });
    new MutationObserver(surDom).observe(document.body, { childList: true });
    pieuvre();
  }
  if (!COUPE) {
    if (document.body) brancher(); else document.addEventListener('DOMContentLoaded', brancher, { once: true });
  }

  return { regler, actif: !COUPE, reglages: R, toucher, page, ouvrir, fermer, enrouler, confirmer, retour, ajouter, onglet, pieuvre, guide: reagir, arreter, couleurDe: destination };
})();
