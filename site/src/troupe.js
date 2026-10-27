/* La troupe, commune aux maquettes (règle 20 du contrat) : toutes les personnes publiées de l'équipe (D.personnes), rangées
   par catégories de métiers (D.site.troupe), leurs places reliées, et une icône dessinée par catégorie. Chaque maquette
   compose la troupe dans son univers (entre un organigramme et la pieuvre du logo) ; l'outil donne le modèle, les liens,
   les icônes et de quoi tracer des bras. build.py l'ajoute après mouvement.js. Tout se relit dans D à chaque appel
   (règle 9 : la base peut changer les personnes, leurs métiers, leurs photos et les titres).

   LE MODÈLE
   TROUPE.titre()                le titre de la section (D.site.troupe.titre)
   TROUPE.categories()           [{ cle, titre, i, metiers, places }] dans l'ordre de D.site.troupe.categories (i : son rang,
                                 pour data-edit="site.troupe.categories.<i>.titre") ; une catégorie sans personne est gardée
                                 (places vide : à la maquette de la taire)
     place = { cle ('<catégorie>:<personne>'), personne (slug), prenom, nom, nomComplet, photo (adresse ou null : la photo
               n'y est que si sa publication est accordée), credit, metiers (ses métiers dans cette catégorie, tels quels),
               evident (vrai si le métier se lit déjà dans la catégorie : « Jeu » dans le jeu), n (le nombre de places de la
               personne), rang (sa place dans la catégorie) }
     Une personne paraît une fois dans chaque catégorie de ses métiers, dans l'ordre de D.personnes (celui de la base).
     Un métier inconnu des listes va dans la catégorie qui partage le plus de mots avec lui (les mots rares comptent plus),
     puis par les alias de la catégorie (jamais affichés), sinon dans la catégorie D.site.troupe.defaut ; une personne
     sans métier prend ceux de ses distributions (show.equipe), sinon la catégorie par défaut : personne ne se perd.
   TROUPE.classer(metier)        la clé de la catégorie d'un métier
   TROUPE.personnes()            [{ personne, nomComplet, photo, places: [place…] }] : chaque personne et ses places
   TROUPE.spectacles(slug)       les spectacles d'une personne : [{ slug, titre }] (D.shows[].equipe)
   TROUPE.equipe(slugSpectacle)  les personnes d'un spectacle : [slug]

   LES LIENS
   TROUPE.relier(racine, { liens, clavier, surAllumer, surChoix }) → { allumer(slug, depuis), allumerGroupe([slug]),
       eteindre(), choisir(slug | null), choisirGroupe([slug] | null), choisi(), groupe(), retracer(), detruire(),
       apresImage(fn) (fn après la prochaine image : ce qui repeint beaucoup ne retient pas le geste) }
     racine (positionnée : position relative ; marquée data-troupe) contient les places, chacune un bouton portant
     data-troupe-place et data-troupe-personne="<slug>" (son point d'accroche : l'élément [data-troupe-ancre] qu'il
     contient, sinon lui-même), groupées par [data-troupe-categorie] (chaque catégorie : un titre h2/h3 et une liste).
     Survoler ou focaliser une place allume toutes les places de la personne (classe est-allume ; la place survolée :
     est-source ; racine : est-allume) et les relie : des bras partent de la place survolée vers chacune des autres
     (calque <svg class="troupe-liens"> ajouté dans racine), tracés en 380 ms, une lueur court le long de chacun
     (offset-path) ; un clic ou Entrée choisit la personne (aria-pressed="true" sur ses places ; elle reste allumée), un
     second clic, Échap ou un clic ailleurs la relâche (pas la bascule jour/nuit, [data-theme-bouton] : le choix reste). allumerGroupe : les places de plusieurs personnes (l'équipe d'un
     spectacle, TROUPE.equipe(slug) ; racine : est-groupe), sans liens ; choisirGroupe les garde allumées (eteindre y
     revient) jusqu'à choisirGroupe(null), Échap, un clic ailleurs ou le choix d'une personne. Au clavier (clavier: true) : un arrêt de tabulation par catégorie, les
     flèches passent d'une personne à l'autre dans la catégorie, Début et Fin. surAllumer(slug | null, { groupe }) et
     surChoix(slug | null, { groupe }) préviennent la maquette. Les liens se retracent quand racine change de taille. Le
     calque des liens est sous les places : que les catégories soient positionnées au-dessus (z-index 2).
     Moins d'animations demandé (ou ?anim=0) : les liens sont là d'emblée, sans lueur.

   LES ICÔNES
   TROUPE.icone(cle)             le SVG de la catégorie (aria-hidden) : jeu (deux masques qui se balancent), mise-en-scene
                                 (le regard qui cligne dans son cadre), ecriture (la plume qui trace l'onde), decors (le
                                 cintre et sa robe qui se balancent), lumiere-son (le projecteur et ses ondes, lumière ou
                                 son), production (le billet et son étoile) ; une clé inconnue : une ventouse. Trait en
                                 currentColor ; --troupe-ic-fond remplit ce qui doit cacher le trait de derrière (le masque
                                 de devant) : la couleur du fond de la maquette. Elles s'animent quand leur catégorie est
                                 survolée ou allumée, ou quand la maquette leur pose la classe est-vivant (à l'arrivée).

   LES BRAS (géométrie, en px ou dans n'importe quel repère)
   TROUPE.courbe(a, b, { courbe, sens })  une courbe en S de a vers b : { d, point(t), tangente(t), longueur }
   TROUPE.lisse(points)                   une courbe douce qui passe par les points : { d, point(t), tangente(t), longueur }
   TROUPE.effile(c, { w0, w1, n })        le contour plein d'un bras effilé le long de la courbe c (de w0 à w1 de large)
   TROUPE.spirale(p, angle, { r, tours, sens })  une petite spirale qui enroule le bout d'un bras (à tracer)

   L'habillage : des styles de base sans poids (:where()), injectés une fois en tête de <head> : le calque des liens
   (.troupe-liens, .troupe-lien, .troupe-ventouse, .troupe-lueur ; leur couleur : --troupe-lien), les icônes
   (.troupe-icone et ses parties .tr-ic-*) et leurs mouvements (@keyframes troupe-*). Aucun autre texte que ceux de D. */
const TROUPE = (() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const COUPE = (() => { try { return new URLSearchParams(location.search).get('anim') === '0'; } catch (e) { return false; } })();
  const permis = () => !COUPE && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f1 = x => (Math.round(x * 10) / 10).toString();

  /* ---------------------------------------------------------------------------------------------- le modèle */
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const VIDES = new Set(['de', 'la', 'le', 'les', 'des', 'du', 'a', 'au', 'aux', 'et', 'en', 'l', 'd', 'un', 'une', 'pour', 'sur', 'avec']);
  const racineMot = w => (w.length > 3 ? w.replace(/(s|x)$/, '') : w);   // « lumières » et « lumière » : le même mot
  const mots = s => [...new Set(norm(s).split(' ').filter(w => w && !VIDES.has(w)).map(racineMot))];
  const T = () => (typeof D !== 'undefined' && D.site && D.site.troupe) || { titre: '', categories: [] };
  const cats = () => (T().categories || []).filter(c => c && c.cle);

  // l'index des métiers, refait quand D.site.troupe change (sa forme sert de clé)
  let index = null, cleIndex = '';
  function indexer() {
    const cs = cats(), cle = JSON.stringify(cs.map(c => [c.cle, c.metiers, c.alias])) + '|' + T().defaut;
    if (index && cle === cleIndex) return index;
    const exact = new Map(), parMot = new Map(), alias = [];
    cs.forEach(c => {
      (c.metiers || []).forEach(m => { exact.set(norm(m), c.cle); mots(m).forEach(w => { if (!parMot.has(w)) parMot.set(w, new Set()); parMot.get(w).add(c.cle); }); });
      (c.alias || []).forEach(a => { const n = norm(a); if (n) alias.push([n, c.cle]); });
    });
    const defaut = cs.some(c => c.cle === T().defaut) ? T().defaut : (cs.length ? cs[cs.length - 1].cle : null);
    index = { exact, parMot, alias, defaut, ordre: cs.map(c => c.cle) };
    cleIndex = cle;
    return index;
  }
  function classer(metier) {
    const I = indexer(), n = norm(metier);
    if (!n) return I.defaut;
    if (I.exact.has(n)) return I.exact.get(n);
    const score = new Map();
    // les mots en commun avec les métiers connus : un mot que partagent deux catégories compte moitié
    mots(metier).forEach(w => { const s = I.parMot.get(w); if (s) s.forEach(k => score.set(k, (score.get(k) || 0) + 1 / s.size)); });
    // les alias : un mot (ou une suite de mots) du métier
    const dedans = ` ${n} `;
    I.alias.forEach(([a, k]) => { if (dedans.includes(` ${a} `) || dedans.includes(` ${racineMot(a)} `)) score.set(k, (score.get(k) || 0) + 1); });
    let best = null, max = 0;
    I.ordre.forEach(k => { const s = score.get(k) || 0; if (s > max + 1e-9) { max = s; best = k; } });
    return best || I.defaut;
  }
  // les métiers d'une personne ; sans métier : ceux de ses distributions (fonction, ou « Jeu » pour le jeu)
  function metiersDe(slug, p) {
    const ms = (p.metiers || []).map(m => String(m || '').trim()).filter(Boolean);
    if (ms.length) return ms;
    const out = [];
    (typeof D !== 'undefined' ? D.shows || [] : []).forEach(s => (s.equipe || []).forEach(e => {
      if (e.personne !== slug) return;
      const m = String(e.fonction || '').trim() || (e.categorie === 'jeu' ? 'Jeu' : '');
      if (m && !out.includes(m)) out.push(m);
    }));
    return out;
  }
  const nomComplet = p => [p.prenom, p.nom].map(x => String(x || '').trim()).filter(Boolean).join(' ');
  function modele() {
    const I = indexer(), cs = cats(), P = (typeof D !== 'undefined' && D.personnes) || {};
    const places = new Map(cs.map(c => [c.cle, []])), personnes = [];
    Object.entries(P).forEach(([slug, p]) => {
      if (!p) return;
      const parCat = new Map();
      metiersDe(slug, p).forEach(m => { const k = classer(m); if (!k) return; if (!parCat.has(k)) parCat.set(k, []); if (!parCat.get(k).includes(m)) parCat.get(k).push(m); });
      if (!parCat.size && I.defaut) parCat.set(I.defaut, []);
      const ks = [...parCat.keys()].sort((a, b) => I.ordre.indexOf(a) - I.ordre.indexOf(b));
      const moi = { personne: slug, nomComplet: nomComplet(p), photo: p.photo || null, places: [] };
      ks.forEach(k => {
        const c = cs.find(x => x.cle === k), ms = parCat.get(k);
        const evident = !!c && (c.metiers || []).length === 1 && ms.length === 1 && norm(ms[0]) === norm(c.metiers[0]);
        const place = { cle: `${k}:${slug}`, categorie: k, personne: slug, prenom: p.prenom || '', nom: p.nom || '', nomComplet: moi.nomComplet,
          photo: p.photo || null, credit: p.photo ? p.credit || null : null, metiers: ms, evident, n: ks.length, rang: places.get(k).length };
        places.get(k).push(place);
        moi.places.push(place);
      });
      personnes.push(moi);
    });
    return { cs, places, personnes };
  }
  const categories = () => { const M = modele(); return M.cs.map((c, i) => ({ cle: c.cle, titre: c.titre || '', i, metiers: c.metiers || [], places: M.places.get(c.cle) || [] })); };
  const personnes = () => modele().personnes;
  const spectacles = slug => (typeof D !== 'undefined' ? D.shows || [] : []).filter(s => (s.equipe || []).some(e => e.personne === slug)).map(s => ({ slug: s.slug, titre: s.titre }));
  const equipe = slugSp => { const s = (typeof D !== 'undefined' ? D.shows || [] : []).find(x => x.slug === slugSp); return s ? [...new Set((s.equipe || []).map(e => e.personne).filter(x => (D.personnes || {})[x]))] : []; };

  /* ---------------------------------------------------------------------------------------------- la géométrie des bras */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], add = (a, b) => [a[0] + b[0], a[1] + b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
  const lon = v => Math.hypot(v[0], v[1]) || 1;
  // une courbe faite de segments de Bézier cubiques [p0, c1, c2, p1] : ses points, ses tangentes, sa longueur
  function outillee(segs) {
    const pt = ([p0, c1, c2, p1], t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0], u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1]]; };
    const tg = ([p0, c1, c2, p1], t) => { const u = 1 - t; const v = [3 * u * u * (c1[0] - p0[0]) + 6 * u * t * (c2[0] - c1[0]) + 3 * t * t * (p1[0] - c2[0]), 3 * u * u * (c1[1] - p0[1]) + 6 * u * t * (c2[1] - c1[1]) + 3 * t * t * (p1[1] - c2[1])]; const l = lon(v); return [v[0] / l, v[1] / l]; };
    const longs = segs.map(s => { let L = 0, q = s[0]; for (let k = 1; k <= 16; k++) { const r = pt(s, k / 16); L += Math.hypot(r[0] - q[0], r[1] - q[1]); q = r; } return L; });
    const total = longs.reduce((a, b) => a + b, 0) || 1;
    const ou = t => { let x = Math.max(0, Math.min(1, t)) * total, i = 0; while (i < segs.length - 1 && x > longs[i]) { x -= longs[i]; i++; } return [segs[i], longs[i] ? Math.min(1, x / longs[i]) : 0]; };
    const d = segs.length ? `M${f1(segs[0][0][0])} ${f1(segs[0][0][1])}` + segs.map(([, c1, c2, p1]) => `C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p1[0])} ${f1(p1[1])}`).join('') : '';
    return { d, segs, longueur: total, point: t => { const [s, u] = ou(t); return pt(s, u); }, tangente: t => { const [s, u] = ou(t); return tg(s, u); } };
  }
  // un S de a vers b : les deux points de contrôle s'écartent de part et d'autre du trajet (courbe : l'écart, en part du trajet)
  function courbe(a, b, { courbe: k = 0.22, sens = 1 } = {}) {
    const v = sub(b, a), L = lon(v), n = [-v[1] / L * sens, v[0] / L * sens];
    return outillee([[a, add(add(a, mul(v, 0.3)), mul(n, k * L)), add(add(a, mul(v, 0.7)), mul(n, -k * L)), b]]);
  }
  // une courbe douce par les points (Catmull-Rom centripète, en cubiques)
  function lisse(points) {
    const P = (points || []).filter(p => p && isFinite(p[0]) && isFinite(p[1]));
    if (P.length < 2) return outillee([]);
    const segs = [];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] || sub(mul(P[i], 2), P[i + 1]), p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || sub(mul(P[i + 1], 2), P[i]);
      segs.push([p1, add(p1, mul(sub(p2, p0), 1 / 6)), sub(p2, mul(sub(p3, p1), 1 / 6)), p2]);
    }
    return outillee(segs);
  }
  // le contour plein d'un bras effilé : de w0 (au départ) à w1 (au bout)
  function effile(c, { w0 = 6, w1 = 1, n = 32 } = {}) {
    if (!c || !c.segs || !c.segs.length) return '';
    const g = [], dr = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n, p = c.point(t), tg = c.tangente(t), w = (w0 * (1 - t) + w1 * t) / 2;
      g.push(`${f1(p[0] - tg[1] * w)} ${f1(p[1] + tg[0] * w)}`); dr.push(`${f1(p[0] + tg[1] * w)} ${f1(p[1] - tg[0] * w)}`);
    }
    return `M${g.join('L')}L${dr.reverse().join('L')}Z`;
  }
  // une spirale au bout d'un bras : part de p dans la direction angle (radians) et s'enroule (sens 1 : à droite)
  function spirale(p, angle, { r = 6, tours = 1.2, sens = 1 } = {}) {
    const cx = p[0] + Math.cos(angle + sens * Math.PI / 2) * r, cy = p[1] + Math.sin(angle + sens * Math.PI / 2) * r;
    const a0 = Math.atan2(p[1] - cy, p[0] - cx), N = 30, pts = [];
    for (let k = 0; k <= N; k++) { const t = k / N, a = a0 + sens * t * tours * 2 * Math.PI, rr = r * (1 - 0.7 * t); pts.push(`${f1(cx + Math.cos(a) * rr)} ${f1(cy + Math.sin(a) * rr)}`); }
    return `M${pts.join('L')}`;
  }

  /* ---------------------------------------------------------------------------------------------- les icônes */
  // 32 × 32, un trait ; les parties qui bougent portent une classe tr-ic-*
  const MASQUE = 'M-7 -6.5C-7 -8.6 7 -8.6 7 -6.5V-.5C7 5.6 3.3 9 0 9S-7 5.6-7 -.5Z';
  const ICONES = {
    jeu: `<g class="tr-ic-arriere"><g transform="translate(20.2 12.6) rotate(15)"><path class="tr-ic-plein" d="${MASQUE}"/><path d="M-4.6-1.4q1.5 1.3 3 0M1.6-1.4q1.5 1.3 3 0M-3 5.2q3-2.4 6 0"/></g></g>`
      + `<g class="tr-ic-avant"><g transform="translate(12.2 17.6) rotate(-11)"><path class="tr-ic-plein" d="${MASQUE}"/><path d="M-4.6-.8q1.5-1.5 3 0M1.6-.8q1.5-1.5 3 0M-3.6 3q3.6 3.3 7.2 0"/></g></g>`,
    'mise-en-scene': '<path d="M5 10.5V6h4.5M22.5 6H27v4.5M27 21.5V26h-4.5M9.5 26H5v-4.5"/>'
      + '<g class="tr-ic-oeil"><path class="tr-ic-plein" d="M8 16c3.6-4.9 12.4-4.9 16 0-3.6 4.9-12.4 4.9-16 0Z"/><g class="tr-ic-iris"><circle cx="16" cy="16" r="3.1"/><circle class="tr-ic-point" cx="16" cy="16" r="1.25"/></g></g>',
    ecriture: '<path class="tr-ic-onde" pathLength="1" d="M3.5 26.2c2.6-3 4.6-3 6.4-.4s3.8 2.6 5.8.1"/>'
      + '<g class="tr-ic-plume"><path class="tr-ic-plein" d="M27.6 4.2C19.4 5.8 14.5 11.8 13 20.4l2.5-2.6c5.6-1.3 9.8-5.9 12.1-13.6Z"/><path d="M13 20.4l-1.6 2.8M15.5 17.8c2.9-3.7 6.6-7.2 10.4-11.6"/></g>',
    decors: '<g class="tr-ic-cintre"><path d="M16 9.6c0-2.9 3.6-3 3.6-.4 0 1.5-1.6 1.8-3.6 3.4L4.8 18.6c-1.1.8-.6 2.2.7 2.2h21c1.3 0 1.8-1.4.7-2.2L16 12.6"/>'
      + '<path class="tr-ic-plein" d="M11.4 20.8l-2.6 7.4h14.4l-2.6-7.4M13.4 20.8c.4 1.5 1.5 2.3 2.6 2.3s2.2-.8 2.6-2.3"/></g>',
    'lumiere-son': '<g class="tr-ic-projecteur"><path class="tr-ic-plein" d="M4.5 12.2h8.8l3.4-2.6v12l-3.4-2.6H4.5Z"/><path d="M9 19v6.8M5.6 25.8h6.8"/></g>'
      + '<path class="tr-ic-onde1" d="M20 12.6a4.4 4.4 0 0 1 0 6.8"/><path class="tr-ic-onde2" d="M23 10a8.2 8.2 0 0 1 0 12"/><path class="tr-ic-onde3" d="M26 7.4a12 12 0 0 1 0 17.2"/>',
    production: '<g class="tr-ic-billet"><g transform="rotate(-12 16 16)"><path class="tr-ic-plein" d="M4.5 10.5h23v3.6a2.4 2.4 0 0 0 0 4.8v3.6h-23v-3.6a2.4 2.4 0 0 0 0-4.8Z"/><path class="tr-ic-pointilles" d="M11.5 11.4v9.2"/>'
      + '<path class="tr-ic-etoile" d="M19.6 12.9l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2.1 1.1.4-2.3-1.7-1.6 2.3-.3Z"/></g></g>',
  };
  const VENTOUSE = '<circle class="tr-ic-plein" cx="16" cy="16" r="9.5"/><circle class="tr-ic-coeur" cx="16" cy="16" r="4.2"/>';
  const icone = cle => `<svg class="troupe-icone troupe-icone--${esc(ICONES[cle] ? cle : 'ventouse')}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${ICONES[cle] || VENTOUSE}</svg>`;

  const STYLE = `
:where(.troupe-icone) { display: block; width: 2em; height: 2em; overflow: visible; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
:where(.troupe-icone .tr-ic-plein) { fill: var(--troupe-ic-fond, transparent); }
:where(.troupe-icone .tr-ic-point, .troupe-icone .tr-ic-etoile) { fill: currentColor; stroke: none; }
:where(.troupe-icone .tr-ic-pointilles) { stroke-dasharray: 1.4 2.1; }
:where(.troupe-icone :is(.tr-ic-avant, .tr-ic-arriere, .tr-ic-oeil, .tr-ic-iris, .tr-ic-plume, .tr-ic-cintre, .tr-ic-projecteur, .tr-ic-billet, .tr-ic-etoile, .tr-ic-coeur)) { transform-box: view-box; }
:where(.troupe-icone .tr-ic-avant) { transform-origin: 12px 26px; }
:where(.troupe-icone .tr-ic-arriere) { transform-origin: 21px 21px; }
:where(.troupe-icone .tr-ic-oeil) { transform-origin: 16px 16px; }
:where(.troupe-icone .tr-ic-plume) { transform-origin: 12px 22px; }
:where(.troupe-icone .tr-ic-onde) { stroke-dasharray: 1 1; }
:where(.troupe-icone .tr-ic-cintre) { transform-origin: 17.8px 6.4px; }
:where(.troupe-icone .tr-ic-projecteur) { transform-origin: 9px 25.8px; }
:where(.troupe-icone .tr-ic-billet) { transform-origin: 16px 16px; }
:where(.troupe-icone .tr-ic-etoile) { transform-box: fill-box; transform-origin: 50% 50%; }
:where(.troupe-icone .tr-ic-coeur) { transform-origin: 16px 16px; }
@media (prefers-reduced-motion: no-preference) {
  :where([data-troupe-categorie].est-allume, .troupe-icone.est-vivant) :where(.troupe-icone) :where(.tr-ic-avant, .tr-ic-arriere, .tr-ic-oeil, .tr-ic-iris, .tr-ic-onde, .tr-ic-plume, .tr-ic-cintre, .tr-ic-onde1, .tr-ic-onde2, .tr-ic-onde3, .tr-ic-billet, .tr-ic-etoile, .tr-ic-coeur) {
    animation: var(--tr-anim, none); }
  @media (hover: hover) { :where([data-troupe-categorie]:hover) :where(.troupe-icone) :where(.tr-ic-avant, .tr-ic-arriere, .tr-ic-oeil, .tr-ic-iris, .tr-ic-onde, .tr-ic-plume, .tr-ic-cintre, .tr-ic-onde1, .tr-ic-onde2, .tr-ic-onde3, .tr-ic-billet, .tr-ic-etoile, .tr-ic-coeur) {
    animation: var(--tr-anim, none); } }
}
:where(.troupe-icone .tr-ic-avant) { --tr-anim: troupe-balance 1.25s cubic-bezier(.4, 0, .2, 1); }
:where(.troupe-icone .tr-ic-arriere) { --tr-anim: troupe-contre 1.25s cubic-bezier(.4, 0, .2, 1); }
:where(.troupe-icone .tr-ic-oeil) { --tr-anim: troupe-cligne 1.3s ease-in-out; }
:where(.troupe-icone .tr-ic-iris) { --tr-anim: troupe-regard 1.3s ease-in-out; }
:where(.troupe-icone .tr-ic-onde) { --tr-anim: troupe-ecrit 1.1s cubic-bezier(.45, 0, .2, 1) both; }
:where(.troupe-icone .tr-ic-plume) { --tr-anim: troupe-plume 1.1s cubic-bezier(.45, 0, .2, 1); }
:where(.troupe-icone .tr-ic-cintre) { --tr-anim: troupe-cintre 1.5s cubic-bezier(.3, 0, .3, 1); }
:where(.troupe-icone .tr-ic-onde1) { --tr-anim: troupe-emet 1.2s ease-out; }
:where(.troupe-icone .tr-ic-onde2) { --tr-anim: troupe-emet 1.2s .14s ease-out backwards; }
:where(.troupe-icone .tr-ic-onde3) { --tr-anim: troupe-emet 1.2s .28s ease-out backwards; }
:where(.troupe-icone .tr-ic-billet) { --tr-anim: troupe-billet 1.1s cubic-bezier(.3, 0, .3, 1); }
:where(.troupe-icone .tr-ic-etoile) { --tr-anim: troupe-etoile 1.1s ease-in-out; }
:where(.troupe-icone .tr-ic-coeur) { --tr-anim: troupe-ventouse 1s ease-in-out; }
@keyframes troupe-balance { 0%, 100% { transform: none; } 30% { transform: rotate(9deg); } 62% { transform: rotate(-4deg); } 84% { transform: rotate(1.5deg); } }
@keyframes troupe-contre { 0%, 100% { transform: none; } 30% { transform: rotate(-8deg) translateY(-.6px); } 62% { transform: rotate(4deg); } 84% { transform: rotate(-1.5deg); } }
@keyframes troupe-cligne { 0%, 34%, 46%, 100% { transform: none; } 40% { transform: scaleY(.12); } }
@keyframes troupe-regard { 0%, 100% { transform: none; } 18%, 30% { transform: translateX(-2.3px); } 58%, 78% { transform: translateX(2.3px); } }
@keyframes troupe-ecrit { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes troupe-plume { 0% { transform: translate(-8px, 3px); } 25% { transform: translate(-6px, 1.6px) rotate(-6deg); } 50% { transform: translate(-3.4px, 2.8px) rotate(4deg); } 75% { transform: translate(-1.4px, 1.2px) rotate(-3deg); } 100% { transform: none; } }
@keyframes troupe-cintre { 0%, 100% { transform: none; } 22% { transform: rotate(8deg); } 48% { transform: rotate(-5.5deg); } 72% { transform: rotate(2.5deg); } 88% { transform: rotate(-1deg); } }
@keyframes troupe-emet { 0% { opacity: .15; transform: translateX(-2px); } 45% { opacity: 1; transform: none; } 100% { opacity: 1; } }
@keyframes troupe-billet { 0%, 100% { transform: none; } 25% { transform: rotate(7deg) translateY(-1px); } 55% { transform: rotate(-4deg); } 80% { transform: rotate(1.5deg); } }
@keyframes troupe-etoile { 0%, 100% { transform: none; } 50% { transform: scale(1.45) rotate(36deg); } }
@keyframes troupe-ventouse { 0%, 100% { transform: none; } 45% { transform: scale(.6); } }
:where(.troupe-liens) { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; z-index: 1; }
:where(.troupe-lien) { fill: none; stroke: var(--troupe-lien, currentColor); stroke-width: 2.2; stroke-linecap: round; stroke-dasharray: 1 1; }
:where(.troupe-lien-ombre) { fill: none; stroke: var(--troupe-lien, currentColor); stroke-width: 9; stroke-linecap: round; opacity: .12; }
:where(.troupe-ventouse) { fill: var(--troupe-ventouse-fond, transparent); stroke: var(--troupe-lien, currentColor); stroke-width: 1.2; }
:where(.troupe-lueur) { position: absolute; left: 0; top: 0; z-index: 3; width: 9px; height: 9px; border-radius: 50%; pointer-events: none; opacity: 0;
  background: var(--troupe-lien, currentColor); box-shadow: 0 0 0 3px color-mix(in srgb, var(--troupe-lien, currentColor) 28%, transparent), 0 0 16px 2px var(--troupe-lien, currentColor);
  offset-rotate: 0deg; offset-distance: 0%; }`;
  function styles() {
    if (document.getElementById('troupe-style') || !document.head) return;
    const s = document.createElement('style');
    s.id = 'troupe-style';
    s.textContent = STYLE;
    document.head.insertBefore(s, document.head.firstChild);   // en tête : la maquette passe après
  }
  styles();

  /* ---------------------------------------------------------------------------------------------- les liens */
  function relier(racine, { liens = true, clavier = true, surAllumer = null, surChoix = null } = {}) {
    if (!racine) return null;
    const SEL = '[data-troupe-place]', CAT = '[data-troupe-categorie]';
    let calque = racine.querySelector(':scope > svg.troupe-liens');
    if (!calque) {
      calque = document.createElementNS(NS, 'svg');
      calque.setAttribute('class', 'troupe-liens');
      calque.setAttribute('aria-hidden', 'true');
      calque.setAttribute('focusable', 'false');
      racine.insertBefore(calque, racine.firstChild);
    }
    let allume = null, source = null, choisi = null, groupe = null, groupeChoisi = null, attente = 0, lueurs = [];
    const placeDe = e => { const p = e.target && e.target.closest ? e.target.closest(SEL) : null; return p && racine.contains(p) ? p : null; };
    const placesDe = slug => [...racine.querySelectorAll(SEL)].filter(p => p.getAttribute('data-troupe-personne') === slug);
    const ancre = p => p.querySelector('[data-troupe-ancre]') || p;
    function vider(anime) {
      lueurs.forEach(l => l.remove()); lueurs = [];
      const gs = [...calque.children];
      if (!gs.length) return;
      if (anime && permis() && calque.animate) gs.forEach(g => { g.classList.add('troupe-partant'); const a = g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease-out', fill: 'forwards' }); a.onfinish = () => g.remove(); });
      else gs.forEach(g => g.remove());
    }
    // des bras de la place survolée vers chacune des autres places de la personne
    // les lectures d'abord (les places, avant toute écriture : aucune mise en page forcée), puis le dessin
    function dessiner(slug, depuis, anime) {
      const ps = placesDe(slug);
      if (!liens || ps.length < 2) { vider(false); return; }
      const R = racine.getBoundingClientRect();
      const centre = p => { const r = ancre(p).getBoundingClientRect(); return { x: r.left + r.width / 2 - R.left, y: r.top + r.height / 2 - R.top, r: Math.min(r.width, r.height) / 2 }; };
      const src = depuis && ps.includes(depuis) ? depuis : ps[0], A = centre(src), Bs = ps.filter(p => p !== src).map(centre);
      vider(false);
      let html = '';
      const chemins = [];
      Bs.forEach((B, k) => {
        const v = [B.x - A.x, B.y - A.y], L = Math.hypot(v[0], v[1]);
        if (L < 4) return;
        const u = [v[0] / L, v[1] / L], a = [A.x + u[0] * (A.r + 2), A.y + u[1] * (A.r + 2)], b = [B.x - u[0] * (B.r + 2), B.y - u[1] * (B.r + 2)];
        const c = courbe(a, b, { courbe: 0.16, sens: k % 2 ? -1 : 1 });
        // les ventouses le long du bras, de plus en plus petites
        const nv = Math.max(2, Math.min(9, Math.round(c.longueur / 46)));
        const vs = Array.from({ length: nv }, (_, i) => { const t = (i + 1) / (nv + 1), q = c.point(t), tg = c.tangente(t), cote = i % 2 ? 1 : -1;
          return `<circle class="troupe-ventouse" style="--t:${t.toFixed(3)}" cx="${f1(q[0] - tg[1] * 4.2 * cote)}" cy="${f1(q[1] + tg[0] * 4.2 * cote)}" r="${f1(2.6 - 1.2 * t)}"/>`; }).join('');
        html += `<g class="troupe-bras"><path class="troupe-lien-ombre" d="${c.d}"/><path class="troupe-lien" pathLength="1" d="${c.d}"/>${vs}</g>`;
        chemins.push(c.d);
      });
      calque.innerHTML = html;
      if (!anime || !permis() || !calque.animate) return;
      [...calque.querySelectorAll('.troupe-lien')].forEach(l => l.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 380, easing: 'cubic-bezier(.3, .7, .2, 1)', fill: 'backwards' }));
      [...calque.querySelectorAll('.troupe-lien-ombre')].forEach(l => l.animate([{ opacity: 0 }, { opacity: '' }], { duration: 380, easing: 'ease-out' }));
      [...calque.querySelectorAll('.troupe-ventouse')].forEach(v => { const t = +v.style.getPropertyValue('--t') || 0;
        v.animate([{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: 60 + t * 320, easing: 'cubic-bezier(.3, .7, .2, 1.3)', fill: 'backwards' }); });
      // la lueur court le long de chaque bras (offset-path), de la place survolée à l'autre
      if (!CSS.supports || !CSS.supports('offset-path', 'path("M0 0L1 1")')) return;
      chemins.forEach((d, k) => {
        const l = document.createElement('i');
        l.className = 'troupe-lueur';
        l.setAttribute('aria-hidden', 'true');
        l.style.offsetPath = `path("${d}")`;
        racine.appendChild(l);
        lueurs.push(l);
        const a = l.animate([{ offsetDistance: '0%', opacity: 0 }, { opacity: 1, offset: .12 }, { opacity: 1, offset: .82 }, { offsetDistance: '100%', opacity: 0 }],
          { duration: 760, delay: 90 + k * 70, easing: 'cubic-bezier(.45, .1, .25, 1)', fill: 'both' });
        a.onfinish = () => { l.remove(); lueurs = lueurs.filter(x => x !== l); };
      });
    }
    function marquer(slugs, src) {
      const set = new Set(slugs || []);
      racine.querySelectorAll(SEL).forEach(p => { const on = set.has(p.getAttribute('data-troupe-personne')); p.classList.toggle('est-allume', on); p.classList.toggle('est-source', on && p === src); });
      racine.querySelectorAll(CAT).forEach(c => c.classList.toggle('est-allume', !!c.querySelector(`${SEL}.est-allume`)));
    }
    function allumer(slug, depuis = null, { anime = true } = {}) {
      clearTimeout(attente);
      if (!slug) { eteindre(); return; }
      if (slug === allume && depuis === source && !groupe) return;
      const meme = slug === allume && !groupe;
      allume = slug; source = depuis; groupe = null;
      dessiner(slug, depuis, anime && !meme);
      racine.classList.add('est-allume'); racine.classList.remove('est-groupe');
      marquer([slug], depuis);
      if (surAllumer) surAllumer(slug, { groupe: false });
    }
    function allumerGroupe(slugs) {
      clearTimeout(attente);
      const g = slugs && slugs.length ? [...slugs] : null;
      if (!g) { eteindre(); return; }
      vider(true);
      allume = null; source = null; groupe = g;
      racine.classList.add('est-groupe'); racine.classList.remove('est-allume');
      marquer(groupe, null);
      if (surAllumer) surAllumer(null, { groupe });
    }
    // éteindre revient à ce qui est choisi : la personne, sinon le groupe épinglé, sinon rien
    function eteindre() {
      clearTimeout(attente);
      if (choisi) { const ps = placesDe(choisi); allumer(choisi, ps.includes(source) ? source : ps[0], { anime: allume !== choisi }); return; }
      if (groupeChoisi) { if (groupe !== groupeChoisi) allumerGroupe(groupeChoisi); groupe = groupeChoisi; return; }
      if (!allume && !groupe) return;
      allume = null; source = null; groupe = null;
      racine.classList.remove('est-allume', 'est-groupe');
      marquer([], null);
      vider(true);
      if (surAllumer) surAllumer(null, { groupe: null });
    }
    const presser = () => racine.querySelectorAll(SEL).forEach(p => p.setAttribute('aria-pressed', String(!!choisi && p.getAttribute('data-troupe-personne') === choisi)));
    function choisir(slug, depuis = null) {
      choisi = slug || null;
      if (choisi) groupeChoisi = null;
      presser();
      if (choisi) allumer(choisi, depuis || placesDe(choisi)[0], { anime: allume !== choisi });
      else eteindre();
      if (surChoix) surChoix(choisi, { groupe: groupeChoisi });
    }
    // un groupe épinglé (l'équipe d'un spectacle) : il reste allumé ; choisir une personne le relâche
    function choisirGroupe(slugs) {
      groupeChoisi = slugs && slugs.length ? [...slugs] : null;
      if (groupeChoisi) { choisi = null; presser(); allumerGroupe(groupeChoisi); groupe = groupeChoisi; } else eteindre();
      if (surChoix) surChoix(choisi, { groupe: groupeChoisi });
    }
    // la souris survole (un petit délai en quittant une place, pour passer à la voisine sans clignoter) ; le doigt, lui,
    // choisit d'un geste (le clic) : un toucher n'allume ni n'éteint en passant, rien ne se fait deux fois. Seul un vrai
    // mouvement de la souris allume : quand la page défile sous une souris immobile, personne ne s'allume en passant
    let sx = null, sy = null, survolee = null;
    racine.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch' || (e.screenX === sx && e.screenY === sy)) return;
      sx = e.screenX; sy = e.screenY;
      const p = placeDe(e);
      if (p && p !== survolee) { survolee = p; clearTimeout(attente); allumer(p.getAttribute('data-troupe-personne'), p); }
    }, { passive: true });
    racine.addEventListener('pointerout', e => {
      if (e.pointerType === 'touch') return;
      const p = placeDe(e); if (!p || (e.relatedTarget && p.contains(e.relatedTarget))) return;
      if (p === survolee) survolee = null;
      clearTimeout(attente); attente = setTimeout(() => { if (!racine.contains(document.activeElement) || !document.activeElement.matches(SEL)) eteindre(); }, 90);
    }, { passive: true });
    // le clavier : la place focalisée s'allume (un focus donné par la souris ou le doigt passe par le survol ou le clic)
    const auClavier = p => { try { return p.matches(':focus-visible'); } catch (e) { return true; } };
    racine.addEventListener('focusin', e => { const p = placeDe(e); if (!p) return; if (clavier) actif(p); if (auClavier(p)) allumer(p.getAttribute('data-troupe-personne'), p); });
    racine.addEventListener('focusout', e => { if (!e.relatedTarget || !racine.contains(e.relatedTarget)) { clearTimeout(attente); attente = setTimeout(eteindre, 30); } });
    // un clic (ou Entrée) choisit : le geste se voit à l'image suivante (aria-pressed, le fond de la place) ; l'allumage,
    // les bras et la lueur partent juste après cette image, sans retenir le geste (règle 15 C)
    const apresImage = f => (typeof requestAnimationFrame === 'function' && !document.hidden ? requestAnimationFrame(() => setTimeout(f, 0)) : f());
    racine.addEventListener('click', e => {
      const p = placeDe(e); if (!p) return;
      if (typeof EDITION !== 'undefined' && EDITION.actif) return;
      const slug = p.getAttribute('data-troupe-personne'), nouveau = choisi === slug ? null : slug;
      choisi = nouveau;
      if (choisi) groupeChoisi = null;
      presser();
      if (surChoix) surChoix(choisi, { groupe: groupeChoisi });
      apresImage(() => { if (choisi !== nouveau) return; if (choisi) allumer(choisi, p.isConnected ? p : placesDe(choisi)[0], { anime: allume !== choisi }); else eteindre(); });
    });
    // au clavier : un arrêt de tabulation par catégorie, les flèches d'une personne à l'autre
    const actif = p => { const c = p.closest(CAT) || racine; c.querySelectorAll(SEL).forEach(x => { if (x.closest(CAT) === p.closest(CAT)) x.tabIndex = x === p ? 0 : -1; }); };
    function ranger() {
      if (!clavier) return;
      const groupes = [...racine.querySelectorAll(CAT)];
      (groupes.length ? groupes : [racine]).forEach(c => { const ps = [...c.querySelectorAll(SEL)]; const garde = ps.find(p => p.tabIndex === 0) || ps[0]; ps.forEach(p => { p.tabIndex = p === garde ? 0 : -1; }); });
    }
    racine.addEventListener('keydown', e => {
      if (e.key === 'Escape' && (choisi || groupeChoisi)) { if (choisi) choisir(null); else choisirGroupe(null); return; }
      if (!clavier) return;
      const p = placeDe(e); if (!p || e.altKey || e.ctrlKey || e.metaKey) return;
      const ps = [...(p.closest(CAT) || racine).querySelectorAll(SEL)], i = ps.indexOf(p);
      const j = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: ps.length - 1 }[e.key];
      if (j == null) return;
      e.preventDefault();
      const q = ps[Math.max(0, Math.min(ps.length - 1, j))];
      if (q && q !== p) { actif(q); q.focus(); }
    });
    // un clic ailleurs relâche la personne choisie (et le groupe épinglé), après l'image ; la bascule jour/nuit
    // ([data-theme-bouton], THEME) n'est pas un geste sur la page : le choix reste allumé dans l'autre thème
    const dehors = e => {
      if (!racine.isConnected) { document.removeEventListener('click', dehors, true); return; }
      const t = e.target;
      if (!t || racine.contains(t) || (t.closest && t.closest('[data-theme-bouton]')) || (!choisi && !groupeChoisi)) return;
      apresImage(() => { if (!racine.isConnected) return; if (choisi) choisir(null); else if (groupeChoisi) choisirGroupe(null); });
    };
    document.addEventListener('click', dehors, true);
    // les liens suivent la mise en page
    let ro = null, raf = 0;
    if ('ResizeObserver' in window) { ro = new ResizeObserver(() => { if (!allume || raf) return; raf = requestAnimationFrame(() => { raf = 0; if (allume) dessiner(allume, source, false); }); }); ro.observe(racine); }
    ranger();
    return {
      allumer: (slug, depuis) => allumer(slug, depuis || placesDe(slug)[0] || null), allumerGroupe, eteindre, choisir: slug => choisir(slug), choisirGroupe,
      choisi: () => choisi, groupe: () => groupeChoisi, apresImage, retracer: () => { ranger(); if (allume) dessiner(allume, source && source.isConnected ? source : placesDe(allume)[0], false); },
      detruire: () => { document.removeEventListener('click', dehors, true); if (ro) ro.disconnect(); vider(false); calque.remove(); },
    };
  }

  return { titre: () => T().titre || '', categories, personnes, classer, spectacles, equipe, relier, icone, courbe, lisse, effile, spirale, permis };
})();
