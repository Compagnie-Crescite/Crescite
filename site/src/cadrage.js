/* CADRAGE : chaque photo des spectacles garde sa zone d'intérêt dans son cadre, sur ordinateur comme sur téléphone
   (règle 24 du contrat). D.cadrages[clé] = { zone: [gauche, haut, droite, bas], point: [x, y] }, en % de l'image
   (data/cadrages.json) ; la clé est celle de D.photos. Pour une photo en object-fit: cover, la position (object-position)
   est calculée pour que la zone soit au centre du cadre, et entière si elle y tient ; quand le cadre est plus petit
   qu'elle, c'est le point (un visage) qui est au centre. Un cadre peut déplacer ce centre par les variables CSS
   --cadre-x et --cadre-y (de 0 à 1 : .7, aux sept dixièmes de la largeur, pour laisser la place à un texte).

   La position se refait quand le cadre change de taille (jamais à chaque image d'une animation) ; les photos posées
   ensuite (une page qui se redessine, une photo qui change) sont prises au passage. Une photo sans zone, ou marquée
   data-cadre="non", garde la position de sa feuille de style. Aucune dépendance.

   CADRAGE.cle(src)          la clé de D.photos de cette adresse, ou null
   CADRAGE.alias(src, cle)   une autre adresse de la même photo (une page qui remplace ses data:… par des blob:… : les
                             photos déjà posées sous l'ancienne adresse restent reconnues)
   CADRAGE.position(img)     recalcule la position d'une photo (rend la valeur posée, ou null)
   CADRAGE.calcul(cadre, image, c, biais)
                             la position seule : cadre { l, h } et image { l, h } en pixels, c = { zone, point },
                             biais = [x, y] ; rend [x %, y %] */
const CADRAGE = (() => {
  const donnees = () => (typeof D !== 'undefined' && D) || {};
  let source = null, parSrc = new Map();
  const alias = new Map();
  // une adresse est souvent la photo elle-même (data:…, des centaines de Ko) : on la reconnaît à sa longueur, son début et sa
  // fin, sans la hacher tout entière à chaque photo posée
  const empreinte = src => `${src.length}:${src.slice(0, 40)}:${src.slice(-96)}`;
  function cle(src) {
    const d = donnees();
    if (!src || !d.cadrages || !d.photos) return null;
    if (source !== d.photos) {          // D.photos lu une fois (et relu s'il change)
      source = d.photos;
      parSrc = new Map();
      for (const [k, v] of Object.entries(d.photos)) if (typeof v === 'string' && d.cadrages[k]) parSrc.set(empreinte(v), k);
    }
    const e = empreinte(src);
    return parSrc.get(e) || alias.get(e) || null;
  }

  // sur un axe : la taille de l'image mise à l'échelle (t) et du cadre (v), en pixels ; la zone [a, b] et le point p en %
  function axe(t, v, a, b, p, biais) {
    const o = t - v;
    if (o <= .5) return 50;
    const za = a / 100 * t, zb = b / 100 * t, tient = zb - za <= v;
    let debut = (tient ? (za + zb) / 2 : p / 100 * t) - biais * v;
    if (tient) debut = Math.min(za, Math.max(zb - v, debut));     // la zone entière, même déplacée par le biais
    return Math.min(o, Math.max(0, debut)) / o * 100;
  }
  function calcul(cadre, image, c, biais = [.5, .5]) {
    const s = Math.max(cadre.l / image.l, cadre.h / image.h), z = c.zone, p = c.point || [(z[0] + z[2]) / 2, (z[1] + z[3]) / 2];
    return [axe(image.l * s, cadre.l, z[0], z[2], p[0], biais[0]), axe(image.h * s, cadre.h, z[1], z[3], p[1], biais[1])];
  }

  const biaisDe = (cs, nom) => { const x = parseFloat(cs.getPropertyValue(nom)); return Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : .5; };
  // la dernière mesure d'une photo suivie : la taille de son cadre et ses réglages (object-fit, --cadre-x, --cadre-y), lus quand
  // la mise en page est faite (ResizeObserver) ; une photo qui finit de charger se cadre sur elle, sans relire la mise en page
  // (relue à chaque chargement, elle forçait celle de toute la page, des dizaines de millisecondes au téléphone)
  const mesures = new WeakMap();
  function mesurer(img, l, h) {
    const cs = getComputedStyle(img), m = { l, h, fit: cs.objectFit, bx: biaisDe(cs, '--cadre-x'), by: biaisDe(cs, '--cadre-y') };
    mesures.set(img, m);
    return m;
  }
  function poser(img, m) {
    const k = img.dataset.cadre === 'non' ? null : cle(img.getAttribute('src')), c = k && donnees().cadrages[k];
    if (!c || !img.naturalWidth || !m || !m.l || !m.h || m.fit !== 'cover') return null;
    const [x, y] = calcul({ l: m.l, h: m.h }, { l: img.naturalWidth, h: img.naturalHeight }, c, [m.bx, m.by]);
    const val = `${x.toFixed(1)}% ${y.toFixed(1)}%`;
    if (img.style.objectPosition !== val) img.style.objectPosition = val;
    return val;
  }
  function position(img, l, h) {
    if (l == null) { l = img.clientWidth; h = img.clientHeight; }
    return poser(img, mesurer(img, l, h));
  }

  // les photos suivies : leur taille (ResizeObserver, sans relire la mise en page), leur chargement, leur adresse
  const tailles = typeof ResizeObserver === 'function' ? new ResizeObserver(entrees => {
    for (const e of entrees) {
      const b = e.contentBoxSize && e.contentBoxSize[0];
      position(e.target, b ? b.inlineSize : e.contentRect.width, b ? b.blockSize : e.contentRect.height);
    }
  }) : null;
  const suivies = new WeakSet();
  function suivre(img) {
    if (suivies.has(img)) { position(img); return; }
    if (!cle(img.getAttribute('src'))) return;
    suivies.add(img);
    // (sans mesure complète, une photo dans un bloc que la page ne met pas encore en page (content-visibility) : elle attend
    // que l'observateur la mesure, quand le bloc se met en page ; la relire ici forçait la mise en page de ce bloc à chaque
    // photo chargée, 60 à 130 ms au téléphone ralenti pendant le premier affichage. Mesurée, une photo dont le réglage a
    // changé depuis se relit)
    img.addEventListener('load', () => { const m = mesures.get(img);
      if (m && m.l && m.h && m.fit === 'cover' && poser(img, m)) return;
      if (tailles && !(m && m.l && m.h)) return;
      position(img); });
    // (déjà chargée : sa première mesure par ResizeObserver, après la mise en page, la cadre ; sans lui, tout de suite)
    if (tailles) tailles.observe(img); else position(img);
    if (img.complete && !tailles) position(img);
  }
  function oublier(img) { if (suivies.has(img)) { suivies.delete(img); if (tailles) tailles.unobserve(img); } }
  const parcourir = (n, f) => {
    if (n.nodeType !== 1) return;
    if (n.tagName === 'IMG') f(n); else n.querySelectorAll('img').forEach(f);
  };
  function demarrer() {
    if (!donnees().cadrages || typeof document === 'undefined' || !document.body) return;
    parcourir(document.body, suivre);
    if (typeof MutationObserver !== 'function') return;
    new MutationObserver(ms => {
      for (const m of ms) {
        if (m.type === 'attributes') { if (m.target.tagName === 'IMG') { oublier(m.target); suivre(m.target); } continue; }
        m.removedNodes.forEach(n => parcourir(n, oublier));
        m.addedNodes.forEach(n => parcourir(n, suivre));
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer, { once: true });
    else demarrer();
  }
  return { cle, position: img => position(img), calcul, alias: (src, k) => { if (src && k) alias.set(empreinte(src), k); } };
})();
