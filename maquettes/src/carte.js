/* La carte des tournées, commune aux maquettes (build.py l'ajoute après les données D).
   Le fond (la France, la Belgique, le Luxembourg), Rouen, et un bras par commune, de Rouen jusqu'à elle.
   Chaque maquette l'habille dans son univers : couleurs, tracé, mouvement, interactions.

   CARTE.viewBox, CARTE.rouen ([x, y]), CARTE.fond.{pays, belgique, luxembourg} : chemins SVG (attribut d)
   CARTE.lieux                          toutes les communes [{c, dep, xy}] ; « l » est l'indice dans ce tableau
   CARTE.aVenir()                       les communes des dates à venir : [{l, c, dep, xy, n, dates: [D.dates…]}]
   CARTE.saison('2019-2020')            les communes d'une saison : [{l, c, dep, xy, n, dates: [lignes de D.saisons]}]
   CARTE.spectacle(slug)                {aVenir: [...], passe: [...]} : les communes d'un spectacle, à venir et passées
   CARTE.nom(lieu)                      « Pont-Audemer (27) »
   CARTE.bras(xy, {w0, w1, courbe, depart})   un bras plein effilé (à remplir), de Rouen (ou depart) jusqu'à xy
   CARTE.trait(xy, {courbe, depart})          la même courbe, en trait (à tracer) : « M… Q… »
   CARTE.bout(xy, {r, tours, courbe})         une petite spirale qui enroule le bout du bras (à tracer)
   CARTE.longueur(xy, {courbe})               la longueur du trait, pour stroke-dasharray
   CARTE.cadre(lieux, {marge, min})           un viewBox serré autour de Rouen et de ces communes : "x y l h"
   CARTE.svg({...})                     une carte complète, à habiller en CSS (classes .carte-*) : voir plus bas
   CARTE.lier(racine, {survol, choix})  relie les communes d'une carte (data-l) au survol, au clic et au clavier
   CARTE.mouvement()                    false si le visiteur a demandé moins d'animations */
const CARTE = (() => {
  const K = D.carte, R = K.rouen;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mouvement = () => !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  function regroupe(paires, datesDe) {
    return paires.map(([l, n]) => ({ l, ...K.lieux[l], n, dates: datesDe(l) }))
      .sort((a, b) => Math.hypot(a.xy[0] - R[0], a.xy[1] - R[1]) - Math.hypot(b.xy[0] - R[0], b.xy[1] - R[1]));
  }
  const aVenir = () => regroupe(K.aVenir, l => D.dates.filter(d => d.l === l));
  const saison = s => regroupe(K.parSaison[s] || [], l => (D.saisons[s]?.spectacles || []).flatMap(g => g.dates.filter(d => d.l === l).map(d => ({ ...d, spectacle: g.titre, slug: g.slug }))));
  const spectacle = slug => {
    const p = K.parSpectacle[slug] || { passe: [], aVenir: [] };
    const passees = l => Object.values(D.saisons).flatMap(S => S.spectacles.filter(g => g.slug === slug).flatMap(g => g.dates.filter(d => d.l === l && !(d.fin && d.fin >= D.aujourdhui))));
    return { aVenir: regroupe(p.aVenir, l => D.dates.filter(d => d.slug === slug && d.l === l)), passe: regroupe(p.passe, passees) };
  };
  const nom = x => `${x.c} (${x.dep})`;

  // le point de contrôle de la courbe : à mi-chemin, écarté sur le côté (courbe > 0 : vers la gauche du trajet)
  function controle([x, y], courbe = 0.24, depart = R) {
    const [rx, ry] = depart, dx = x - rx, dy = y - ry;
    return [(rx + x) / 2 - dy * courbe, (ry + y) / 2 + dx * courbe];
  }
  function bras(xy, { w0 = 4, w1 = 0.5, courbe = 0.24, depart = R } = {}) {
    const [rx, ry] = depart, [x, y] = xy;
    if (Math.hypot(x - rx, y - ry) < 6) return '';
    const [qx, qy] = controle(xy, courbe, depart), N = 26, G = [], Dr = [];
    for (let k = 0; k <= N; k++) {
      const t = k / N, a = (1 - t) ** 2, b = 2 * (1 - t) * t, c = t * t;
      const px = a * rx + b * qx + c * x, py = a * ry + b * qy + c * y;
      let tx = 2 * (1 - t) * (qx - rx) + 2 * t * (x - qx), ty = 2 * (1 - t) * (qy - ry) + 2 * t * (y - qy);
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const w = (w0 * (1 - t) + w1 * t) / 2;
      G.push(`${(px - ty * w).toFixed(1)} ${(py + tx * w).toFixed(1)}`); Dr.push(`${(px + ty * w).toFixed(1)} ${(py - tx * w).toFixed(1)}`);
    }
    return `M${G.join('L')}L${Dr.reverse().join('L')}Z`;
  }
  function trait(xy, { courbe = 0.24, depart = R } = {}) {
    const [qx, qy] = controle(xy, courbe, depart);
    return `M${depart[0]} ${depart[1]}Q${qx.toFixed(1)} ${qy.toFixed(1)} ${xy[0]} ${xy[1]}`;
  }
  function longueur(xy, { courbe = 0.24, depart = R } = {}) {
    const [qx, qy] = controle(xy, courbe, depart);
    let L = 0, px = depart[0], py = depart[1];
    for (let k = 1; k <= 24; k++) {
      const t = k / 24, x = (1 - t) ** 2 * depart[0] + 2 * (1 - t) * t * qx + t * t * xy[0], y = (1 - t) ** 2 * depart[1] + 2 * (1 - t) * t * qy + t * t * xy[1];
      L += Math.hypot(x - px, y - py); px = x; py = y;
    }
    return Math.round(L);
  }
  // une spirale au bout du bras, dans le sens de la courbe
  function bout(xy, { r = 5, tours = 1.25, courbe = 0.24, depart = R } = {}) {
    const [qx, qy] = controle(xy, courbe, depart), [x, y] = xy;
    let a = Math.atan2(y - qy, x - qx), pts = [];
    const sens = courbe >= 0 ? 1 : -1, N = 28;
    const cx = x + Math.cos(a + sens * Math.PI / 2) * r, cy = y + Math.sin(a + sens * Math.PI / 2) * r;
    const a0 = Math.atan2(y - cy, x - cx);
    for (let k = 0; k <= N; k++) {
      const t = k / N, ang = a0 + sens * t * tours * 2 * Math.PI, rr = r * (1 - 0.72 * t);
      pts.push(`${(cx + Math.cos(ang) * rr).toFixed(1)} ${(cy + Math.sin(ang) * rr).toFixed(1)}`);
    }
    return `M${pts.join('L')}`;
  }
  function cadre(lieux, { marge = 40, min = 160 } = {}) {
    const xs = [R[0], ...lieux.map(l => l.xy[0])], ys = [R[1], ...lieux.map(l => l.xy[1])];
    let x0 = Math.min(...xs) - marge, x1 = Math.max(...xs) + marge, y0 = Math.min(...ys) - marge, y1 = Math.max(...ys) + marge;
    if (x1 - x0 < min) { const m = (x0 + x1) / 2; x0 = m - min / 2; x1 = m + min / 2; }
    if (y1 - y0 < min) { const m = (y0 + y1) / 2; y0 = m - min / 2; y1 = m + min / 2; }
    return `${Math.round(x0)} ${Math.round(y0)} ${Math.round(x1 - x0)} ${Math.round(y1 - y0)}`;
  }

  /* Une carte complète.
     lieux    : les communes en avant (CARTE.aVenir(), CARTE.saison(s), CARTE.spectacle(slug).aVenir…)
     passe    : des communes en retrait (les tournées passées), tracées plus fines
     forme    : 'bras' (plein effilé), 'trait' (ligne), 'pointille'
     courbe   : l'écart de la courbe ; spirale : un enroulement au bout de chaque bras
     cadre    : 'france' (par défaut) ou 'serre' (autour des communes), ou un viewBox
     pousse   : les bras poussent depuis Rouen à l'affichage (si le visiteur accepte le mouvement)
     interactif : chaque commune devient un bouton (data-l), à relier avec CARTE.lier
     noms     : true pour écrire le nom des communes en avant ; titre : le libellé pour les lecteurs d'écran
     Classes : .carte, .carte-voisin, .carte-pays, .carte-bras(-passe), .carte-bout(-passe), .carte-spirale,
               .carte-lieu (g[data-l]), .carte-point, .carte-nom, .carte-rouen, .carte-rouen-nom */
  let n = 0;
  function svg({ lieux = [], passe = [], forme = 'bras', courbe = 0.24, spirale = false, cadre: vb = 'france', pousse = true,
    interactif = false, noms = false, titre = '', classe = '', largeur = 1 } = {}) {
    const id = 'carte-pousse-' + (++n), anime = pousse && mouvement();
    const box = vb === 'france' ? K.viewBox : vb === 'serre' ? cadre([...lieux, ...passe]) : vb;
    const [bx, by, bw, bh] = box.split(/\s+/).map(Number), echelle = Math.max(bw, bh) / 800;
    const tracer = (x, w0, w1) => forme === 'bras' ? `d="${bras(x.xy, { w0: w0 * echelle, w1: w1 * echelle, courbe })}"` : `d="${trait(x.xy, { courbe })}"`;
    const largeurBras = x => Math.min(7, 1.6 + Math.sqrt(x.n) * 1.1) * largeur;
    const rayon = Math.hypot(bw, bh) * 1.2;
    const etiquette = x => `${nom(x)}${x.dates?.length ? ' : ' + x.dates.map(d => d.ligne).join(' ; ') : ''}`;
    return `<svg class="carte ${esc(classe)}" viewBox="${box}" ${interactif ? `aria-label="${esc(titre)}"` : `role="img" aria-label="${esc(titre)}"`} data-forme="${forme}">
      <defs><clipPath id="${id}"><circle cx="${R[0]}" cy="${R[1]}" r="${anime ? 0 : rayon}">${anime ? `<animate attributeName="r" from="0" to="${rayon}" dur="1.8s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".45 0 .2 1"/>` : ''}</circle></clipPath></defs>
      <path class="carte-voisin" d="${K.belgique}"/><path class="carte-voisin" d="${K.luxembourg}"/><path class="carte-pays" d="${K.contour}"/>
      <g clip-path="url(#${id})">
        ${passe.map(x => `<path class="carte-bras-passe" ${forme === 'bras' ? tracer(x, 1.6, 0.4) : `d="${trait(x.xy, { courbe })}"`}/>`).join('')}
        ${passe.map(x => `<circle class="carte-bout-passe" cx="${x.xy[0]}" cy="${x.xy[1]}" r="${(1.8 * echelle).toFixed(2)}"/>`).join('')}
        ${lieux.map(x => `<path class="carte-bras" data-l="${x.l}" ${forme === 'bras' ? tracer(x, largeurBras(x), 0.5) : `d="${trait(x.xy, { courbe })}"`}${forme === 'pointille' ? ' stroke-dasharray="1 4"' : ''}/>`).join('')}
        ${spirale ? lieux.map(x => `<path class="carte-spirale" data-l="${x.l}" d="${bout(x.xy, { r: 4.5 * echelle, courbe })}"/>`).join('') : ''}
        ${lieux.map(x => interactif
          ? `<g class="carte-lieu" data-l="${x.l}" role="button" tabindex="0" aria-label="${esc(etiquette(x))}"><circle class="carte-point" cx="${x.xy[0]}" cy="${x.xy[1]}" r="${(4 * echelle).toFixed(2)}"/><circle cx="${x.xy[0]}" cy="${x.xy[1]}" r="${(12 * echelle).toFixed(2)}" fill="transparent"/><title>${esc(etiquette(x))}</title></g>`
          : `<g class="carte-lieu" data-l="${x.l}"><circle class="carte-point" cx="${x.xy[0]}" cy="${x.xy[1]}" r="${(3.6 * echelle).toFixed(2)}"/><title>${esc(etiquette(x))}</title></g>`).join('')}
        ${noms ? lieux.map(x => `<text class="carte-nom" data-l="${x.l}" x="${x.xy[0] + 7 * echelle}" y="${x.xy[1] + 3.5 * echelle}">${esc(x.c)}</text>`).join('') : ''}
      </g>
      <circle class="carte-rouen" cx="${R[0]}" cy="${R[1]}" r="${(5.5 * echelle).toFixed(2)}"/><text class="carte-rouen-nom" x="${R[0] + 10 * echelle}" y="${R[1] - 9 * echelle}">Rouen</text>
    </svg>`;
  }
  // relie les communes d'une carte : survol(l | null) au survol et au focus, choix(l) au clic et à Entrée / Espace
  function lier(racine, { survol = () => {}, choix = () => {} } = {}) {
    racine.querySelectorAll('.carte-lieu[data-l]').forEach(g => {
      const l = +g.dataset.l;
      g.addEventListener('mouseenter', () => survol(l)); g.addEventListener('mouseleave', () => survol(null));
      g.addEventListener('focus', () => survol(l)); g.addEventListener('blur', () => survol(null));
      g.addEventListener('click', () => choix(l));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choix(l); } });
    });
  }
  return { K, viewBox: K.viewBox, rouen: R, fond: { pays: K.contour, belgique: K.belgique, luxembourg: K.luxembourg }, lieux: K.lieux,
    aVenir, saison, spectacle, nom, bras, trait, bout, longueur, cadre, svg, lier, mouvement };
})();
