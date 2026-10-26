/* La créature : la petite pieuvre de l'en-tête, vivante. Le logo de l'en-tête (l'hôte data-pieuvre) n'est plus un dessin
   figé : la pieuvre y est dessinée image par image avec ses vraies tentacules (PIEUVRE, D.pieuvre), sur un calque fixe
   au-dessus de la page, exactement à la place du dessin ; le dessin reste dans la page, invisible, pour la mise en page,
   et visible pour qui a demandé moins d'animations. build.py l'ajoute après pieuvre.js aux pages qui ont la scène de la
   pieuvre (la 10 et la synthèse). La maquette l'appelle (CREATURE.habiter) : rien ne se fait seul.

   Sa vie, au repos, jamais pénible (lente, de quelques pixels, trente images par seconde au plus, rien quand l'onglet est
   caché) : ses tentacules ondulent, elle respire (son corps gonfle d'un rien), elle se penche vers la souris qui passe
   près d'elle, et quand la page défile ses tentacules suivent le courant. Ses moments, que la maquette joue à la main :
     CREATURE.vers(el | [x, y], { couleur, tenir, duree })   une vraie tentacule (la boucle en S, prolongée depuis sa descente,
                     comme sur l'accueil au téléphone : une courbe raide, aux grands rayons) part de l'en-tête, rejoint le
                     bas de cet élément (un titre), le souligne vers la droite et s'y enroule, à la couleur donnée ; elle y
                     reste `tenir` ms (1300), puis revient. Elle suit l'élément s'il bouge, et rentre s'il quitte l'écran.
                     Promesse, résolue au retour. Une nouvelle destination remplace la précédente.
     CREATURE.revenir()                 la tentacule rentre
     CREATURE.reagir(genre, vers)       la pieuvre se contracte et ses tentacules s'agitent un instant ('page', 'clic',
                     'ouvre', 'ferme', 'enroule', 'retour') ; vers : un point [x, y] vers lequel elle se penche
   Le reste
     CREATURE.habiter(hote, { encre })  à appeler une fois : l'hôte (l'élément data-pieuvre de l'en-tête, qui contient le svg
                     du logo) ; encre : la couleur de la pieuvre (défaut : la couleur du texte de l'hôte)
     CREATURE.habite(el)                vrai si la créature vit dans cet élément : tentacules.js lui confie alors les réactions
                     du guide (ses tentacules fines, elles, partent toujours des bras du dessin)
     CREATURE.sortie()                  0 au repos, 1 quand une tentacule est tendue
     CREATURE.arreter()                 tout s'arrête, le dessin de l'en-tête revient
     CREATURE.actif                     faux avec ?anim=0 ou sans D.pieuvre : alors rien ne change
   Pendant l'ouverture (INTRO.ouverte()), rien n'est dessiné : le dessin de l'en-tête reste en place ; la créature prend la
   relève à la fin de l'ouverture (intro:fin), au même endroit, sans que rien ne saute. Moins d'animations demandé : le
   dessin reste, la créature attend que le réglage change. */
const CREATURE = (() => {
  'use strict';
  const COUPE = (() => { try { return new URLSearchParams(location.search).get('anim') === '0'; } catch (e) { return false; } })();
  const mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduit = () => !!(mq && mq.matches);
  const intro = () => typeof INTRO !== 'undefined' && INTRO.ouverte && INTRO.ouverte();
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const PRET = typeof PIEUVRE !== 'undefined' && !!PIEUVRE.pret;
  const actif = PRET && !COUPE;
  const CENTRE = [771, 640];   // le cœur de la pieuvre, en unités du dessin (comme la scène de l'accueil)
  const HEX6 = /^#[0-9a-f]{6}$/i;
  function rgb(c) {
    c = String(c || '').trim();
    let m = /^#([0-9a-f]{3})$/i.exec(c);
    if (m) return [...m[1]].map(h => parseInt(h + h, 16));
    if (HEX6.test(c)) return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(c);
    return m ? [+m[1], +m[2], +m[3]].map(Math.round) : [255, 255, 255];
  }
  // la secousse d'une réaction : une impulsion qui monte vite, puis une détente qui se balance en s'éteignant
  const choc = v => (v <= 0 || v >= 1 ? 0 : v < .22 ? ease(v / .22) : Math.cos(((v - .22) / .78) * Math.PI * 1.6) * Math.pow(1 - (v - .22) / .78, 1.5));
  // [durée (ms), contraction, agitation des tentacules, penche (°)]
  const GENRES = { clic: [420, .07, 1.8, 3], page: [680, .1, 2.6, 5], ouvre: [460, .05, 1.6, 2], ferme: [460, .07, 1.6, 2], enroule: [600, .06, 2, 0], retour: [480, .07, 1.8, 3] };

  let hote = null, svg = null, cv = null, ctx = null, CORPS = null, BRAS = [];
  let W = 0, H = 0, dpr = 1, raf = 0, tPrec = 0, tVie = 0, tDessin = 0, boite = null, vivant = false, attend = false, branche = false;
  let s = 0, ox = 0, oy = 0, rect = null, tRect = 0, rectSale = true, encre = '#ffffff', ENCRE = [255, 255, 255];
  let pointeur = null, vScroll = 0, yScroll = 0, tScroll = 0, reaction = null, moment = null, tache = null, regardLisse = 0;
  const bob = { x: 0, y: 0 }, promesses = [];

  /* ---------- la place du dessin : l'hôte, son svg, son viewBox → l'origine et l'échelle du dessin à l'écran ---------- */
  // le dessin de l'hôte : la marque peut poser la pieuvre sur sa tache (D.logo.mark) : la tache se redessine sous elle, telle quelle
  function lireDessin() {
    const t = svg && svg.querySelector('.logo-tache');
    tache = t && t.getAttribute('d') ? { chemin: new Path2D(t.getAttribute('d')), fond: getComputedStyle(t).fill || t.getAttribute('fill') || 'transparent' } : null;
  }
  function mesurer() {
    // (la page a pu réécrire l'hôte : le nouveau dessin prend la place de l'ancien, caché à son tour)
    if (svg && !svg.isConnected && hote && hote.isConnected) { svg = hote.querySelector('svg'); if (svg) { if (vivant) svg.style.visibility = 'hidden'; lireDessin(); } }
    if (!svg || !svg.isConnected) return false;
    const r = svg.getBoundingClientRect(), vb = svg.viewBox && svg.viewBox.baseVal;
    if (!vb || !vb.width || !vb.height || r.width < 8 || r.height < 4) return false;
    const k = Math.min(r.width / vb.width, r.height / vb.height);
    const nx = r.left + (r.width - vb.width * k) / 2 - vb.x * k, ny = r.top + (r.height - vb.height * k) / 2 - vb.y * k;
    rect = r;
    if (Math.abs(k - s) > 1e-7 || Math.abs(nx - ox) > .01 || Math.abs(ny - oy) > .01) {
      s = k; ox = nx; oy = ny;
      // (la pieuvre a changé de place ou de taille : ses tentacules se reposent ; une tentacule en route repart vers sa cible)
      BRAS.forEach(a => { a.t.poser(ox, oy, s); if (a.but) a.t.viser(a.but, 0); });
      boite = null;
    }
    return true;
  }
  function toile() {
    if (cv && cv.isConnected) return;
    cv = document.createElement('canvas');
    cv.className = 'creature'; cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:2147483004;pointer-events:none;display:block;';
    document.body.appendChild(cv);
    ctx = cv.getContext('2d');
    dimensionner();
  }
  function dimensionner() {
    if (!cv) return;
    W = innerWidth; H = innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    boite = null; rectSale = true;
  }

  /* ---------- la vie : les écouteurs (passifs), posés une fois ---------- */
  function brancher() {
    if (branche) return;
    branche = true;
    addEventListener('resize', () => { dimensionner(); reveil(); }, { passive: true });
    addEventListener('scroll', () => {
      const y = scrollY, now = performance.now();
      if (tScroll) vScroll = clamp((y - yScroll) / Math.max(8, now - tScroll) * 16, -60, 60);
      yScroll = y; tScroll = now; rectSale = true; reveil();
    }, { passive: true });
    addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; pointeur = { x: e.clientX, y: e.clientY }; reveil(); }, { passive: true });
    document.addEventListener('pointerleave', () => { pointeur = null; }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; } else { tPrec = 0; reveil(); } });
    if (mq && mq.addEventListener) mq.addEventListener('change', () => { if (reduit()) dormir(); else demarrer(); });
  }
  const reveil = () => { if (vivant && !raf && !document.hidden) raf = requestAnimationFrame(image); };

  /* ---------- habiter l'hôte, prendre la relève du dessin, s'endormir ---------- */
  function habiter(h, o = {}) {
    if (!actif || !h || hote) return false;
    const sv = h.matches && h.matches('svg') ? h : h.querySelector('svg');
    if (!sv) return false;
    hote = h; svg = sv;
    encre = o.encre || (getComputedStyle(h).color || '#ffffff'); ENCRE = rgb(encre);
    const TS = PIEUVRE.creer();
    CORPS = PIEUVRE.corps(TS);
    // dir : le sens de la pointe au repos (vers où la tentacule se penche) ; col : la couleur vers laquelle elle se teinte
    BRAS = TS.map((t, i) => ({ t, i, cle: t.cle, but: null, teinte: 0, penche: 0, col: ENCRE, dir: t.RS[t.M - 1] }));
    brancher();
    demarrer();
    return true;
  }
  function demarrer() {
    if (!hote || vivant) return;
    if (intro()) { attendreIntro(); return; }
    if (reduit()) return;
    if (!mesurer()) { setTimeout(demarrer, 240); return; }   // (l'en-tête n'est pas encore mis en page)
    lireDessin();
    toile();
    BRAS.forEach(a => { a.t.poser(ox, oy, s); a.but = null; a.teinte = 0; a.t.viser(null, 0); });
    svg.style.visibility = 'hidden';
    vivant = true; tPrec = 0; tDessin = 0; boite = null;
    reveil();
  }
  function attendreIntro() {
    if (attend) return;
    attend = true;
    addEventListener('intro:fin', () => { attend = false; demarrer(); }, { once: true });
  }
  // le dessin de l'en-tête revient, la toile s'efface
  function dormir() {
    if (!vivant) return;
    vivant = false; moment = null; reaction = null;
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); }
    if (svg) svg.style.visibility = '';
    BRAS.forEach(a => { a.but = null; a.teinte = 0; a.t.viser(null, 0); });
    while (promesses.length) promesses.shift()(false);
  }
  function arreter() { dormir(); if (cv) { cv.remove(); cv = null; ctx = null; } }
  function effacer() { if (ctx && boite) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); } boite = null; }

  /* ---------- les moments ---------- */
  function reagir(genre = 'clic', vers = null) {
    if (!vivant) return;
    const g = GENRES[genre] || GENRES.clic, cx = ox + CENTRE[0] * s;
    const lean = vers && isFinite(vers[0]) ? clamp((vers[0] - cx) / Math.max(200, W * .4), -1, 1) * g[3] : 0;
    reaction = { t0: performance.now(), duree: g[0], serre: g[1], agite: g[2], lean };
    reveil();
  }
  function vers(cible, o = {}) {
    if (!vivant || reduit()) return Promise.resolve(false);
    const el = cible && cible.nodeType === 1 ? cible : null, pt = Array.isArray(cible) ? cible : null;
    if (!el && !pt) return Promise.resolve(false);
    // la boucle en S de gauche : elle arrive par la gauche du titre et le souligne vers la droite (comme l'accueil au téléphone)
    const a = BRAS.find(x => x.cle === 'boucleL') || BRAS.find(x => x.cle === 'boucleR') || BRAS[0];
    if (!a) return Promise.resolve(false);
    if (moment && moment.bras !== a) revenir();
    const couleur = o.couleur && rgb(o.couleur) ? rgb(o.couleur) : ENCRE;
    moment = { el, pt, bras: a, couleur, tenir: o.tenir == null ? 1300 : o.tenir, duree: o.duree || 900, etat: 'va', t0: performance.now(), tTenu: 0, cle: 'vers' + Date.now() };
    a.col = couleur;
    reveil();
    return new Promise(res => promesses.push(res));
  }
  function revenir() {
    if (!moment) return;
    const m = moment, a = m.bras;
    if (m.etat !== 'revient') { m.etat = 'revient'; a.but = null; a.t.viser(null, 760); }
    reveil();
  }
  // ce que vise la tentacule du moment : le bas de l'élément (ou le point), souligné vers la droite, dans la place qu'il y a
  function cibleDu(m) {
    let x, y, U;
    if (m.el) {
      if (!m.el.isConnected) return null;
      const r = m.el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.bottom < (rect ? rect.bottom : 0) + 16 || r.top > H - 12) return null;
      // (le point d'accroche est un peu à l'intérieur du titre : la courbe s'y aplatit, sous lui, et sort rarement de l'écran)
      const dedans = Math.min(110, r.width * .45);
      x = r.left + dedans; y = r.bottom + 5; U = Math.max(8, r.width - dedans - 6);
    } else { x = m.pt[0]; y = m.pt[1]; U = 8; }
    return { cle: m.cle, x, y, sens: 1, U, mobile: W < 760, racine: .7, corps: .86, marge: x - 14, epaisseur: W < 760 ? 2.2 : 2.6 };
  }

  /* ---------- une image ---------- */
  function image(now) {
    raf = 0;
    if (!vivant || document.hidden) return;
    if (intro()) { dormir(); attendreIntro(); return; }   // (l'ouverture se rejoue : le dessin reprend sa place, la créature attend)
    const dt = Math.min(50, tPrec ? now - tPrec : 16); tPrec = now;
    // (l'hôte n'a plus de place, replié ou caché : la toile s'efface, la créature attend qu'il revienne, sans dessiner)
    if (rectSale || now - tRect > 250) { if (!mesurer()) { effacer(); setTimeout(reveil, 250); return; } tRect = now; rectSale = false; }
    // le moment : la cible (elle peut bouger), l'aller, la tenue, le retour
    let sortie = null;
    if (moment) {
      const m = moment, a = m.bras;
      if (m.etat !== 'revient') {
        const c = cibleDu(m);
        if (!c) revenir();
        else { const premiere = !a.but; a.but = c; if (premiere) a.t.viser(c, m.duree); else a.t.viser(c); }
        if (m.etat === 'va' && a.t.q >= 1 && a.but) { m.etat = 'tient'; m.tTenu = now; }
        else if (m.etat === 'tient' && now - m.tTenu > m.tenir) revenir();
      } else if (a.t.q >= 1) { moment = null; while (promesses.length) promesses.shift()(true); }
      if (moment) sortie = a;
    }
    // la réaction : l'impulsion
    let imp = 0, lean = 0, agite = 0;
    if (reaction) {
      const u = (now - reaction.t0) / reaction.duree;
      if (u >= 1) reaction = null;
      else { imp = choc(u); lean = reaction.lean * imp; agite = reaction.agite * Math.abs(imp); }
    }
    // au repos (rien ne se tend, rien ne réagit, personne ne passe) : trente images par seconde suffisent
    const vif = moment || reaction || pointeur || Math.abs(vScroll) > .4 || BRAS.some(a => a.t.q < 1 || Math.abs(a.teinte - (a.but ? 1 : 0)) > .005);
    if (!vif && now - tDessin < 30) { raf = requestAnimationFrame(image); return; }
    tDessin = now; tVie += dt / 1000;
    vScroll *= Math.pow(.86, dt / 16);
    // elle flotte, elle respire ; pas quand une tentacule est tendue (sa pointe resterait sur le titre)
    const tendue = BRAS.reduce((m, a) => Math.max(m, a.t.mouvement()), 0);
    bob.x = Math.sin(tVie * .43) * .5 * (1 - tendue); bob.y = Math.sin(tVie * .9) * .7 * (1 - tendue);
    const souffle = 1 + .035 * Math.sin(tVie * 1.15) * (1 - tendue), k = souffle * (1 - (reaction ? reaction.serre : 0) * imp * (1 - tendue));
    // la curiosité : elle se tourne un peu vers la souris qui passe près d'elle, ses tentacules s'y penchent ; et elles suivent
    // le courant quand la page défile
    const cx = ox + CENTRE[0] * s, cy = oy + CENTRE[1] * s, courant = clamp(Math.abs(vScroll) / 24, 0, 1) * .32;
    const pres = pointeur ? Math.hypot(pointeur.x - cx, pointeur.y - cy) : Infinity, regard = pres < 240 ? clamp((pointeur.x - cx) / 120, -1, 1) * (1 - pres / 240) * 4 : 0;
    regardLisse += (regard - regardLisse) * .08;
    const rot = (lean + regardLisse) * Math.PI / 180 * (1 - tendue);
    for (const a of BRAS) {
      let pv = 0;
      if (!a.but) {
        const p = a.t.pointe();
        if (pointeur) {
          const dx = pointeur.x - p.x, dy = pointeur.y - p.y, d = Math.hypot(dx, dy);
          if (d < 240) { let df = Math.atan2(dy, dx) - a.dir; df = Math.atan2(Math.sin(df), Math.cos(df)); pv += clamp(df, -1.2, 1.2) * .4 * (1 - d / 240); }
        }
        if (courant > .01) {
          // (le contenu monte quand on descend : les tentacules sont emportées vers le haut, et l'inverse)
          let df = Math.atan2(-Math.sign(vScroll) * 1000, cx - p.x) - a.dir; df = Math.atan2(Math.sin(df), Math.cos(df));
          pv += clamp(df, -1.2, 1.2) * courant;
        }
      }
      a.penche += (pv - a.penche) * .08;
      const tv = a.but ? 1 : 0;
      if (Math.abs(a.teinte - tv) > .005) a.teinte += (tv - a.teinte) * .12; else a.teinte = tv;
      a.t.avancer(dt, { temps: tVie, onde: 2 + agite, penche: a.penche, bob });
    }
    // la région à repeindre : la pieuvre et ses tentacules, cette image et la précédente, élargie de ce que la respiration,
    // la contraction et la penche déplacent
    const b = { x0: rect.left - 4, y0: rect.top - 4, x1: rect.right + 4, y1: rect.bottom + 4 };
    for (const a of BRAS) { const r = a.t.boite(6); b.x0 = Math.min(b.x0, r.x0); b.y0 = Math.min(b.y0, r.y0); b.x1 = Math.max(b.x1, r.x1); b.y1 = Math.max(b.y1, r.y1); }
    const R = Math.max(Math.hypot(b.x0 - cx, b.y0 - cy), Math.hypot(b.x1 - cx, b.y1 - cy), Math.hypot(b.x0 - cx, b.y1 - cy), Math.hypot(b.x1 - cx, b.y0 - cy));
    const marge = R * (Math.abs(k - 1) + Math.abs(rot)) + 3;
    b.x0 -= marge; b.y0 -= marge; b.x1 += marge; b.y1 += marge;
    const u = boite ? { x0: Math.min(b.x0, boite.x0), y0: Math.min(b.y0, boite.y0), x1: Math.max(b.x1, boite.x1), y1: Math.max(b.y1, boite.y1) } : { x0: 0, y0: 0, x1: W, y1: H };
    boite = b;
    const X0 = Math.max(0, Math.floor(u.x0 * dpr)), Y0 = Math.max(0, Math.floor(u.y0 * dpr)), Rw = Math.min(cv.width, Math.ceil(u.x1 * dpr)) - X0, Rh = Math.min(cv.height, Math.ceil(u.y1 * dpr)) - Y0;
    if (Rw > 0 && Rh > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(X0, Y0, Rw, Rh);
      // l'ensemble respire, se contracte et se penche autour de son cœur
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(k, k); ctx.translate(-cx, -cy);
      // la tache de la marque, s'il y en a une ; le corps : le logo sans ses huit tentacules, qui se dessinent par-dessus,
      // celle qui sort en dernier
      ctx.save(); ctx.transform(s, 0, 0, s, ox + bob.x, oy + bob.y);
      if (tache) { ctx.fillStyle = tache.fond; ctx.fill(tache.chemin); }
      ctx.fillStyle = encre; ctx.fill(CORPS, 'evenodd'); ctx.restore();
      const trace = a => PIEUVRE.dessiner(ctx, a.t, { encre, vers: `rgb(${a.col.join(',')})`, teinte: a.teinte, lisere: PIEUVRE.lisere });
      for (const a of BRAS) if (a !== sortie) trace(a);
      if (sortie) trace(sortie);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    raf = requestAnimationFrame(image);
  }

  return { actif, habiter, habite: el => !!(vivant && hote && el && (el === hote || hote.contains(el) || el.contains(hote))), vers, revenir, reagir, arreter,
    sortie: () => BRAS.reduce((m, a) => Math.max(m, a.t.mouvement()), 0) };
})();
