'use strict';
/* La carte de tournée (#/representations/carte, à côté de la liste et du tableur) : les lieux de la saison sur la carte
   de France du site (le même fond, la même projection : fond-carte.js), une pastille par lieu avec le nombre de dates,
   le trajet des dates enchaînées dans l'ordre, et, à côté, la tournée étape par étape avec la distance à vol d'oiseau
   entre deux dates qui se suivent et le nombre de jours entre elles : un enchaînement serré (plus de 300 km d'un jour à
   l'autre, ou plus de 150 km le même jour) se signale. Filtres : ceux des trois vues de Représentations, communs (la
   barre du script principal, filtresDates : recherche, période, saison, spectacle, statut, public, et sous « Plus de
   filtres » nature, département, contrat, du … au ; le prédicat dateRetenue) : changer de vue les garde. D'office, toutes
   les saisons, à venir. La carte garde ce qui lui est propre : les répétitions n'y sont pas (sauf au choix de la nature
   « Répétitions »), les dates annulées ou reportées non plus (sauf au choix du statut « Annulées » ou « Reportées »), et
   « Autour des dates » resserre le cadre (session.vues.carte.serre, hors de l'adresse). Entre la carte et les étapes, une poignée
   (fenetres.js) règle la largeur de la carte (--l-tn, de 360 px à la largeur de la grille moins 338 px) ; elle se retient avec le
   compte (fenetres.tn) et n'existe pas sous 900 px, où les deux colonnes s'empilent. Une pastille ouvre son menu (au pointeur
   fin : le clic, Entrée, le clic droit ; au doigt, le toucher garde le lieu en tiroir et l'appui long ouvre le menu) : ses dates,
   chacune en tiroir sans quitter la carte, « Nouvelle date ici », l'itinéraire, la fiche du lieu (le fournisseur est dans
   menus.js). Maj+clic choisit toutes les dates du lieu (selection.js : data-dates sur la pastille ; la barre propose les actions des
   dates). Survoler ou focaliser une pastille allume ses étapes à droite (.allume : un repère visuel, sans aria-current), et
   inversement ; les étapes portent les badges de la liste (badgesDate : statut, site, public, nature, points du parcours). Le cadre :
   + − ⌂ en coin de carte (aussi au clavier sur la carte : + − 0), Ctrl+molette (la molette seule une fois la carte choisie par un
   clic ou le focus, sinon la page défile) et le glisser (souris, stylet) règlent la vue, qui glisse en 220 ms ; le cadre est
   en session (session.vues.carte.vb, jamais dans l'adresse) le temps où la carte reste ouverte, et la carte s'ouvre toujours recadrée ; la précédence du cadre est vb (zoom,
   glisser) > « Autour des dates » > toute la France, cocher « Autour des dates » ou ⌂ efface vb ; rayons et polices suivent la
   largeur du cadre. Un redessin (un enregistrement, le direct, un filtre) garde le cadre et la pastille qui a le focus. Une étape
   ouvre la date (tiroir.js). Les lieux sans position (latitude, longitude) sont listés : « Trouver la commune » dans leur fiche
   les place ; une fiche de lieu placé propose « Voir sur la carte » (TOURNEE.viser). Chargé après fond-carte.js et tiroir.js.
   TOURNEE.vue(f)   TOURNEE.projeter(lieu)   TOURNEE.etapes(dates)   TOURNEE.km(a, b)   TOURNEE.viser(lieu_id)
   (f : les filtres communs, session.dates ; sans f, ceux de la session) */
const TOURNEE = (() => {
  const F = typeof FOND_CARTE !== 'undefined' ? FOND_CARTE : null;
  const SERRE_JOUR = 150, SERRE_VEILLE = 300;
  // la projection du site : conique conforme de Lambert (44°, 49°), recalée (les coefficients de build.py)
  const r = x => x * Math.PI / 180, f1 = r(44), f2 = r(49), f0 = r(46.5);
  const n = Math.log(Math.cos(f1) / Math.cos(f2)) / Math.log(Math.tan(Math.PI / 4 + f2 / 2) / Math.tan(Math.PI / 4 + f1 / 2));
  const Fk = Math.cos(f1) * Math.tan(Math.PI / 4 + f1 / 2) ** n / n, rho = f => Fk / Math.tan(Math.PI / 4 + f / 2) ** n;
  function projeter(l) {
    if (!F || !l || l.latitude == null || l.longitude == null) return null;
    const rh = rho(r(+l.latitude)), th = n * r(+l.longitude - 3), u = rh * Math.sin(th), v = rho(f0) - rh * Math.cos(th);
    const { cx, cy } = F.projection;
    return [cx[0] * u + cx[1] * v + cx[2], cy[0] * u + cy[1] * v + cy[2]];
  }
  const km = (a, b) => (typeof GARDEFOUS !== 'undefined' ? GARDEFOUS.km(a, b) : null);
  const VB = () => F.viewBox.split(/\s+/).map(Number);
  const dansCadre = ([x, y]) => { const [x0, y0, w, h] = VB(); return x >= x0 && x <= x0 + w && y >= y0 && y <= y0 + h; };
  const parDebut = (a, b) => a.debut.localeCompare(b.debut) || (a.fin || a.debut).localeCompare(b.fin || b.debut) || a.id - b.id;
  const joursEntre = (a, b) => Math.round((Date.parse(`${b}T12:00:00`) - Date.parse(`${a}T12:00:00`)) / 864e5);
  // les étapes : chaque date, et, entre deux dates qui se suivent, la distance et le délai
  function etapes(dates) {
    const xs = dates.slice().sort(parDebut), out = [];
    xs.forEach((d, i) => {
      out.push({ date: d });
      const s = xs[i + 1]; if (!s) return;
      const a = lieu(d.lieu_id), b = lieu(s.lieu_id), dist = a && b && a.id !== b.id ? km(a, b) : a && b ? 0 : null, jours = joursEntre(d.fin || d.debut, s.debut);
      out.push({ trajet: true, km: dist, jours, serre: dist != null && ((jours <= 0 && dist >= SERRE_JOUR) || (jours === 1 && dist >= SERRE_VEILLE)) });
    });
    return out;
  }
  const quandTexte = j => j < 0 ? 'en même temps' : j === 0 ? 'le même jour' : j === 1 ? 'le lendemain' : j < 14 ? `${j} jours après` : j < 60 ? `${Math.round(j / 7)} semaines après` : `${Math.round(j / 30)} mois après`;
  // ------------------------------------------------------------------------------------------- le cadre : zoom, glisser, viser
  let surRemiseCarte = null;     // l'écoute de « Disposition d'origine » (fenetres.js) posée par la dernière carte dessinée
  const LARGEUR_MIN = 90;      // le plus près : un neuvième de la France
  const texteCadre = c => c.map(n => +n.toFixed(1)).join(' ');
  const lireCadre = t => String(t).trim().split(/\s+/).map(Number);
  // un cadre [x, y, w, h] ramené dans la France : pas plus large qu'elle, pas plus étroit que LARGEUR_MIN, et pas plus d'un
  // dixième de sa largeur hors d'elle
  function cadrer([x, y, w, h]) {
    const [px, py, pw, ph] = VB();
    if (w >= pw) return [px, py, pw, ph];     // (au plus loin : la France entière, au cadre d'origine)
    if (w < LARGEUR_MIN) { h = h * LARGEUR_MIN / w; w = LARGEUR_MIN; }
    x = Math.min(Math.max(x, px - w * .1), px + pw - w * .9);
    y = h >= ph ? py : Math.min(Math.max(y, py - h * .1), py + ph - h * .9);
    return [x, y, w, h];
  }
  const calme = () => (typeof CALME_ADMIN === 'function' && CALME_ADMIN()) || document.documentElement.classList.contains('still');
  let anim = null;             // le glissement du cadre en cours (un seul à la fois)
  // le cadre glisse de l'ancien au nouveau en 220 ms, au « doux » : une animation sans cible donne la progression déjà adoucie
  // (getComputedTiming().progress), et un setAttribute par image fait le reste
  function animerCadre(svg, de, vers) {
    const t = anim = {}, a = lireCadre(de), b = lireCadre(vers);
    let e;
    try { e = new Animation(new KeyframeEffect(null, null, { duration: 220, easing: 'cubic-bezier(.2, .8, .2, 1)' }), document.timeline); e.play(); } catch (err) { svg.setAttribute('viewBox', vers); return; }
    const pas = () => {
      if (anim !== t || !svg.isConnected) { e.cancel(); return; }
      const p = e.playState === 'finished' ? 1 : Math.min(1, e.effect.getComputedTiming().progress ?? 0);
      svg.setAttribute('viewBox', p >= 1 ? vers : texteCadre(a.map((n, i) => n + (b[i] - n) * p)));
      if (p < 1) requestAnimationFrame(pas); else e.cancel();
    };
    pas();
  }
  // la carte ouverte (TOURNEE.viser s'y adresse), le lieu qu'une autre page veut y voir, et la carte « choisie » (un clic, le focus) :
  // la molette seule la zoome alors
  let courant = null, visee = null, actif = false;
  const aVoir = () => !!courant && courant.racine.isConnected;
  const lieuDe = el => { const x = el?.closest?.('.tn-pin, .tn-date[data-lieu]'); return x ? (x.dataset.tnLieu ?? x.dataset.lieu) : null; };

  function vue(f = session.dates) {
    if (!F) { cadre('representations', `<div class="tete"><h1>Représentations</h1>${choixVueDates('carte')}</div><div class="vide bloc">Le fond de carte manque (admin/fond-carte.js : site/build.py l’écrit).</div>`); return; }
    const v = etatVue('carte'), voulu = visee && Date.now() - visee.t < 4000 ? visee.id : null;
    visee = null; v.vb = null; actif = false; anim = null;     // (la carte s'ouvre recadrée : « Autour des dates » ou toute la France)
    const zoomBtn = (k, nom, touche, icone) => `<button type="button" class="tn-zb" data-tn-zoom="${k}" title="${esc(nom)} (${touche})">${icone}<span class="sr">${esc(nom)}</span></button>`;
    const ico = nom => (typeof ICONES !== 'undefined' ? ICONES.svg(nom) : '');
    cadre('representations', `<div class="tete"><h1>Représentations</h1>${choixVueDates('carte')}<a class="btn principal" href="#/representations/nouvelle">＋ Nouvelle date</a></div>
      ${filtresDates(f, { vue: 'carte', aDroite: `<label class="case" style="font-size:13.5px"><input type="checkbox" id="tn-serre"${v.serre ? ' checked' : ''}> Autour des dates</label>` })}
      <div class="tn-deux"><div class="bloc tn-carte" id="tn-carte"><div class="tn-cadre"></div><div class="tn-zoom" role="group" aria-label="Zoom de la carte">${zoomBtn('+', 'Rapprocher', '+', ico('plus'))}${zoomBtn('-', 'Éloigner', '−', ico('moins'))}${zoomBtn('0', 'Toute la France', '0', ico('maison'))}</div></div><div class="tn-cote"><div class="bloc" id="tn-resume"></div><div class="bloc" data-liste id="tn-etapes"></div></div></div>`);
    const zone = $('#tn-etapes'), carte = $('#tn-carte'), cadreSvg = $('.tn-cadre', carte);
    // la largeur de la carte se règle (fenetres.tn) : une poignée posée une fois, entre la carte et la colonne des étapes (dessiner()
    // ne touche que l'intérieur de .tn-cadre, #tn-resume et #tn-etapes : elle survit, et les boutons du zoom aussi)
    if (typeof FENETRES !== 'undefined') {
      const deux = $('.tn-deux');
      // sans largeur gardée, c'est la feuille qui décide (1,3 fr contre 1 fr) : la remise (double-clic, Entrée) efface la variable
      // au lieu d'y figer une largeur en pixels, et « Disposition d'origine » (ou son « Annuler ») reprend la valeur gardée, ou la feuille
      const suivre = () => { const t = FENETRES.taille('tn'); if (typeof t === 'number') deux.style.setProperty('--l-tn', `${t}px`); else deux.style.removeProperty('--l-tn'); };
      suivre();
      FENETRES.poignee(carte, { cle: 'tn', axe: 'x', bord: 'droite', libelle: 'Largeur de la carte', dans: deux, apres: carte, entre: [() => carte, () => $('.tn-cote', deux)],
        defaut: () => { const l = deux.clientWidth; return Math.min(Math.round((l - 18) * 1.3 / 2.3), l - 18 - 320); },
        ecrire: v => { deux.style.setProperty('--l-tn', `${v}px`); }, apresOrigine: () => deux.style.removeProperty('--l-tn') });
      if (surRemiseCarte) document.removeEventListener('fenetres:remises', surRemiseCarte);       // (une seule écoute : celle de la carte qu'on voit)
      surRemiseCarte = () => { if (deux.isConnected) suivre(); };
      document.addEventListener('fenetres:remises', surRemiseCarte);
    }
    let m = null;              // ce que la carte montre : les dates, les lieux, les étapes
    let vb = lireCadre(F.viewBox);    // le cadre courant (la cible, pendant qu'il glisse)
    let allume = null;         // le lieu allumé (survol ou focus), pour les pastilles et les étapes
    const calculer = () => {
      const q = norm(f.q).trim();
      const ds = E.dates.filter(d => dateRetenue(d, f) && dansPeriode(d, f.periode) && (!q || dateCherchee(d, q))
        && (['representations', 'residence'].includes(d.nature || 'representations') || f.nature === 'repetitions')   // (les répétitions : hors carte, sauf si on les demande)
        && (!['annulee', 'reportee'].includes(d.statut) || d.statut === f.statut)).sort(parDebut);   // (les annulées et les reportées : de même)
      const xs = etapes(ds);
      // les lieux : une pastille par lieu, avec ses dates
      const lieux = new Map();
      ds.forEach(d => { const l = lieu(d.lieu_id); if (!l) return; if (!lieux.has(l.id)) lieux.set(l.id, { l, dates: [], xy: projeter(l) }); lieux.get(l.id).dates.push(d); });
      const places = [...lieux.values()].filter(x => x.xy && dansCadre(x.xy)), sans = [...lieux.values()].filter(x => !x.xy), hors = [...lieux.values()].filter(x => x.xy && !dansCadre(x.xy));
      const trajets = xs.filter(x => x.trajet && x.km != null), total = trajets.reduce((s, x) => s + x.km, 0), serres = trajets.filter(x => x.serre).length;
      return { ds, xs, lieux, places, sans, hors, total, serres };
    };
    // le cadre : celui du zoom ou du glisser (v.vb), sinon « Autour des dates » (serré sur les pastilles), sinon la France
    const cadreDe = places => {
      if (v.vb) return v.vb;
      if (v.serre && places.length) { const xsP = places.map(p => p.xy[0]), ysP = places.map(p => p.xy[1]); const x0 = Math.min(...xsP, F.rouen[0]), x1 = Math.max(...xsP, F.rouen[0]), y0 = Math.min(...ysP, F.rouen[1]), y1 = Math.max(...ysP, F.rouen[1]); const marge = Math.max(60, (x1 - x0) * .18, (y1 - y0) * .18), w = Math.max(x1 - x0 + 2 * marge, 220), h = Math.max(y1 - y0 + 2 * marge, 220); return `${(x0 + x1) / 2 - w / 2} ${(y0 + y1) / 2 - h / 2} ${w} ${h}`; }
      return F.viewBox;
    };
    // survoler (ou focaliser) une pastille allume ses étapes, et inversement : un repère visuel seulement (aucun aria-current :
    // une pastille allume plusieurs étapes, le lecteur d'écran parlerait à chaque passage)
    const appliquerAllume = () => {
      $$('.tn-pin.allume, .tn-date.allume').forEach(x => { if ((x.dataset.tnLieu ?? x.dataset.lieu) !== allume) x.classList.remove('allume'); });
      if (allume != null) $$(`.tn-pin[data-tn-lieu="${allume}"], .tn-date[data-lieu="${allume}"]`).forEach(x => x.classList.add('allume'));
    };
    const allumer = id => { allume = id == null ? null : String(id); appliquerAllume(); };
    // la carte seule (le zoom ne redessine pas les étapes) ; depuis : le cadre d'où le nouveau glisse. La pastille qui a le focus le garde
    const dessinerCarte = (depuis = null) => {
      const { ds, lieux, places } = m;
      const vers = cadreDe(places), echelle = Math.sqrt(lireCadre(vers)[2] / 800);
      vb = lireCadre(vers);
      const chemin = ds.map(d => lieux.get(d.lieu_id)).filter(x => x && x.xy && dansCadre(x.xy)).map(x => x.xy);
      const couleur = x => { const sps = [...new Set(x.dates.map(d => d.spectacle_id))]; return sps.length === 1 ? couleurSp(spectacle(sps[0])) : 'var(--accent)'; };
      const lieuFocus = document.activeElement?.closest?.('#tn-carte [data-tn-lieu]')?.dataset.tnLieu;
      const glisse = !!depuis && !calme() && depuis !== vers;
      cadreSvg.innerHTML = `<svg class="tn-svg" viewBox="${glisse ? depuis : vers}" role="group" aria-label="Carte de la tournée : ${places.length} lieu${places.length > 1 ? 'x' : ''} placé${places.length > 1 ? 's' : ''}">
        <path class="tn-voisin" aria-hidden="true" d="${F.belgique}"/><path class="tn-voisin" aria-hidden="true" d="${F.luxembourg}"/><path class="tn-pays" aria-hidden="true" d="${F.contour}"/>
        ${chemin.length > 1 ? `<polyline class="tn-trajet" aria-hidden="true" points="${chemin.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" style="stroke-width:${(1.6 * echelle).toFixed(2)}"/>` : ''}
        <g class="tn-maison" transform="translate(${F.rouen[0]} ${F.rouen[1]})"><circle r="${(5 * echelle).toFixed(1)}"/><title>Rouen, la compagnie</title></g>
        ${places.map(x => `<g class="tn-pin" tabindex="0" role="button" aria-haspopup="menu" data-tn-lieu="${x.l.id}" data-dates="${x.dates.map(d => d.id).join(',')}" transform="translate(${x.xy[0].toFixed(1)} ${x.xy[1].toFixed(1)})" style="--c:${esc(couleur(x))}" aria-label="${esc(`${x.l.nom || x.l.commune} : ${x.dates.length} date${x.dates.length > 1 ? 's' : ''}`)}">
          <circle class="tn-halo" r="${((9 + Math.min(x.dates.length, 6) * 2.2) * echelle).toFixed(1)}"/><circle class="tn-point" r="${((6 + Math.min(x.dates.length, 6) * 1.6) * echelle).toFixed(1)}"/>
          <text y="${(1 * echelle).toFixed(1)}" style="font-size:${(9 * echelle).toFixed(1)}px">${x.dates.length}</text>
          <text class="tn-nom" y="${((18 + Math.min(x.dates.length, 6) * 1.6) * echelle).toFixed(1)}" style="font-size:${(10 * echelle).toFixed(1)}px">${esc(x.l.nom ? x.l.commune : x.l.commune)}</text>
          <desc id="tn-n-${x.l.id}">${x.dates.length} date${x.dates.length > 1 ? 's' : ''}</desc>
          <title>${esc(`${x.l.nom ? `${x.l.nom}, ` : ''}${x.l.commune} — ${x.dates.map(d => `${spectacle(d.spectacle_id)?.titre || ''} ${jourCourt(d.debut).replace(/ \d{4}$/, '')}`).join(' · ')}`)}</title></g>`).join('')}</svg>`;
      const svg = $('.tn-svg', cadreSvg);
      if (lieuFocus) $(`.tn-pin[data-tn-lieu="${lieuFocus}"]`, svg)?.focus({ preventScroll: true });
      appliquerAllume();
      if (glisse) animerCadre(svg, depuis, vers); else anim = null;
    };
    const dessinerCote = () => {
      const { ds, xs, lieux, sans, hors, total, serres } = m;
      const lien = document.activeElement?.closest?.('#tn-etapes a.tn-date')?.getAttribute('href');
      $('#tn-resume').innerHTML = `<h3>La tournée</h3><div class="tb-kpi tn-kpi"><div><span>Dates</span><b>${ds.length}</b></div><div><span>Lieux</span><b>${lieux.size}</b></div><div><span>Kilomètres</span><b>${total.toLocaleString('fr-FR')}</b><small>à vol d’oiseau, de date en date</small></div><div class="${serres ? 'alerte' : ''}"><span>Enchaînements serrés</span><b>${serres}</b><small>${serres ? 'plus de 300 km d’un jour à l’autre' : 'rien à signaler'}</small></div></div>
        ${sans.length ? `<p class="aide">Sans position sur la carte : ${sans.map(x => `<a href="#/lieux/${x.l.id}" data-viser="latitude">${esc(x.l.nom || x.l.commune)}</a>`).join(', ')} — « Trouver la commune » dans la fiche du lieu.</p>` : ''}
        ${hors.length ? `<p class="aide">Hors du cadre : ${hors.map(x => `<a href="#/lieux/${x.l.id}">${esc(x.l.commune)}</a>`).join(', ')}.</p>` : ''}`;
      // (chaque étape porte les badges de la liste, badgesDate, et « passée » en plus ; data-lieu la relie à sa pastille)
      zone.innerHTML = xs.length ? `<h3>Étape par étape</h3><ol class="tn-etapes">${xs.map(x => x.trajet ? `<li class="tn-trajet-l${x.serre ? ' serre' : ''}"><span class="tn-fleche" aria-hidden="true">↓</span>${x.km != null ? `<b>${x.km} km</b> · ` : ''}${esc(quandTexte(x.jours))}${x.serre ? ' · <span class="badge annulee">serré</span>' : ''}</li>`
        : (d => { const s = spectacle(d.spectacle_id), l = lieu(d.lieu_id); return `<li><a class="ligne tn-date" href="#/representations/${d.id}" data-lieu="${d.lieu_id}" style="--c:${couleurSp(s)}"><span class="jj"><b>${+d.debut.slice(8, 10)}</b>${MC[+d.debut.slice(5, 7) - 1]}</span><span class="corps"><span class="t">${esc(s?.titre || '?')}</span><span class="ou">${esc(l ? lieuTexte(l) : 'Lieu à préciser')}</span></span><span class="badges">${(d.fin || d.debut) < AUJ ? '<span class="badge">passée</span>' : ''}${badgesDate(d)}</span></a></li>`; })(x.date)).join('')}</ol>`
        : `<div class="vide liste-vide"><p>${filtresActifs(f) ? 'Aucune date ne correspond à ces filtres.' : 'Aucune date à venir sur la carte.'}</p>${filtresActifs(f) ? '<button type="button" class="btn" data-effacer-filtres>Effacer les filtres</button>' : '<button type="button" class="btn" data-tn-toutes>Toutes les périodes</button>'}</div>`;
      if (lien) $(`#tn-etapes a.tn-date[href="${lien}"]`)?.focus({ preventScroll: true });
    };
    const dessiner = () => {
      m = calculer();
      $('#f-compte').textContent = `${m.ds.length} date${m.ds.length > 1 ? 's' : ''} · ${m.lieux.size} lieu${m.lieux.size > 1 ? 'x' : ''}`;
      dessinerCarte(); dessinerCote(); appliquerAllume();
    };
    const cadreAffiche = () => $('.tn-svg', cadreSvg)?.getAttribute('viewBox') || null;
    // poser un nouveau cadre (le zoom, viser) : il est tenu en session (hors de l'adresse) tant que la carte reste ouverte, la carte se redessine à l'échelle (rayons
    // et polices suivent la largeur du cadre) et le cadre glisse de l'ancien au nouveau
    const poserCadre = c => { const depuis = cadreAffiche(); v.vb = texteCadre(cadrer(c)); dessinerCarte(depuis); };
    const zoomer = (k, centre = null) => {
      const [x, y, w, h] = vb, [cx, cy] = centre || [x + w / 2, y + h / 2];
      poserCadre([cx - (cx - x) * k, cy - (cy - y) * k, w * k, h * k]);
    };
    // ⌂ : toute la France, sans « Autour des dates »
    const toutelaFrance = () => { const depuis = cadreAffiche(); v.vb = null; v.serre = false; $('#tn-serre').checked = false; garderFiltres(); dessinerCarte(depuis); };
    // le point du pointeur, en coordonnées de la carte
    const pointDe = e => { const r = $('.tn-svg', cadreSvg).getBoundingClientRect(), [x, y, w, h] = vb; return [x + (e.clientX - r.left) / r.width * w, y + (e.clientY - r.top) / r.height * h]; };
    // recentrer sur un lieu et le focaliser (le lien « Voir sur la carte » d'une fiche de lieu)
    const viserLieu = id => {
      const l = lieu(id), xy = l && projeter(l); if (!xy) return false;
      const w = Math.min(vb[2], 300), h = vb[3] * w / vb[2];
      poserCadre([xy[0] - w / 2, xy[1] - h / 2, w, h]);
      const g = $(`.tn-pin[data-tn-lieu="${id}"]`, cadreSvg);
      if (g) { g.focus({ preventScroll: true }); carte.scrollIntoView({ block: 'nearest' }); } else annoncer(`${lieuTexte(l)} n’a pas de date sur la carte avec ces filtres.`);
      return true;
    };
    courant = { racine: carte, viser: viserLieu };
    dessiner();
    if (voulu != null) viserLieu(voulu);
    const maj = () => { garderFiltres(); dessiner(); };
    brancherFiltresDates(f, maj);
    zone.addEventListener('click', e => { if (e.target.closest('[data-tn-toutes]')) { f.periode = 'toutes'; filtresDates.refleter(f); maj(); $('#f-q')?.focus(); } });   // (le vide : « Toutes les périodes »)
    $('#tn-serre').addEventListener('change', e => { const depuis = cadreAffiche(); v.serre = e.target.checked; v.vb = null; garderFiltres(); dessinerCarte(depuis); });   // (cocher ou décocher efface le zoom)
    // ---- le clic : au pointeur fin, le menu de la pastille (ses dates, nouvelle date ici, l'itinéraire, la fiche) ; au doigt, le lieu en tiroir
    const ouvrirLieu = g => { const href = `#/lieux/${g.dataset.tnLieu}`; if (typeof TIROIR !== 'undefined' && TIROIR.peut(href)) TIROIR.ouvrir(href, { depuis: g }); else location.hash = href; };
    const menuDe = (g, infos) => (typeof GESTES !== 'undefined' && GESTES.ouvrir(g, infos)) || ouvrirLieu(g);
    let aGlisse = false;
    carte.addEventListener('click', e => {
      if (aGlisse) { aGlisse = false; e.stopPropagation(); return; }     // (la fin d'un glisser n'ouvre rien)
      const b = e.target.closest('[data-tn-zoom]');
      if (b) { const k = b.dataset.tnZoom; if (k === '0') toutelaFrance(); else zoomer(k === '+' ? .7 : 1 / .7); return; }
      const g = e.target.closest('.tn-pin'); if (!g) return;
      if (typeof GESTES !== 'undefined' && GESTES.tactile()) ouvrirLieu(g); else menuDe(g, { x: e.clientX, y: e.clientY, source: 'clic' });
    });
    carte.addEventListener('keydown', e => {
      const g = e.target.closest('.tn-pin');
      if (g && (e.key === 'Enter' || e.key === ' ')) {
        if (e.key === ' ' && typeof SELECTION !== 'undefined' && SELECTION.mode()) return;     // (en sélection, Espace prend ou laisse la pastille : selection.js)
        e.preventDefault(); menuDe(g, { source: 'clavier' }); return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomer(.7); }
      else if (e.key === '-') { e.preventDefault(); zoomer(1 / .7); }
      else if (e.key === '0') { e.preventDefault(); toutelaFrance(); }
    });
    // ---- la molette : Ctrl+molette zoome autour du pointeur ; la molette seule aussi une fois la carte choisie (un clic, ou le focus) ;
    // sinon la page défile
    carte.addEventListener('wheel', e => {
      if (!(e.ctrlKey || actif) || !$('.tn-svg', cadreSvg)) return;
      e.preventDefault();
      zoomer(Math.exp(e.deltaY * (e.deltaMode === 1 ? 33 : 1) * .0016), pointDe(e));
    }, { passive: false });
    // (un clic sur le fond, bouton du zoom ou pastille focalisé, retire le focus de la carte sans y rendre un autre élément : ce focusout
    // vient du clic même, qui vient de choisir la carte ; il ne la rend à la page que s'il vient d'ailleurs, de Tab par exemple)
    let clicLe = 0;
    carte.addEventListener('focusin', () => { actif = true; });
    carte.addEventListener('focusout', e => { if (!carte.contains(e.relatedTarget) && Date.now() - clicLe > 400) actif = false; });
    // ---- le glisser (la souris, le stylet) : le cadre suit le pointeur ; rien ne se passe pendant un simple clic, et le pointeur n'est capturé
    // qu'une fois le glisser commencé (sinon le clic n'atteindrait plus la pastille)
    let prise = null;
    carte.addEventListener('pointerdown', e => {
      actif = true; clicLe = Date.now(); prise = null;
      const svg = $('.tn-svg', cadreSvg);
      if (!svg || e.button !== 0 || !e.isPrimary || e.pointerType === 'touch' || e.shiftKey || e.target.closest('.tn-zoom')) return;
      prise = { id: e.pointerId, x: e.clientX, y: e.clientY, vb: vb.slice(), px: svg.getBoundingClientRect().width, fait: false, svg };
    });
    carte.addEventListener('pointermove', e => {
      if (!prise || e.pointerId !== prise.id) return;
      const dx = e.clientX - prise.x, dy = e.clientY - prise.y;
      if (!prise.fait) {
        if (Math.hypot(dx, dy) < 5) return;
        prise.fait = true; anim = null; carte.classList.add('tn-glisse');
        try { carte.setPointerCapture(e.pointerId); } catch (err) { /* tant pis */ }
      }
      const [x, y, w, h] = prise.vb, k = w / prise.px;
      prise.cur = cadrer([x - dx * k, y - dy * k, w, h]);
      prise.svg.setAttribute('viewBox', texteCadre(prise.cur));
    });
    const lacher = e => {
      if (!prise || e.pointerId !== prise.id) return;
      const p = prise; prise = null; carte.classList.remove('tn-glisse');
      if (!p.fait) return;
      aGlisse = true; setTimeout(() => { aGlisse = false; }, 60);
      v.vb = texteCadre(p.cur); vb = lireCadre(v.vb);
      try { carte.releasePointerCapture(e.pointerId); } catch (err) { /* déjà lâché */ }
    };
    carte.addEventListener('pointerup', lacher);
    carte.addEventListener('pointercancel', lacher);
    // ---- le lien entre la carte et les étapes : le survol et le focus
    carte.addEventListener('mouseover', e => { const g = e.target.closest('.tn-pin'); if (g) allumer(g.dataset.tnLieu); });
    carte.addEventListener('mouseout', e => { const g = e.target.closest('.tn-pin'); if (g && !g.contains(e.relatedTarget)) allumer(lieuDe(document.activeElement)); });
    zone.addEventListener('mouseover', e => { const a = e.target.closest('.tn-date[data-lieu]'); if (a) allumer(a.dataset.lieu); });
    zone.addEventListener('mouseout', e => { const a = e.target.closest('.tn-date[data-lieu]'); if (a && !a.contains(e.relatedTarget)) allumer(lieuDe(document.activeElement)); });
    const auFocus = e => { const el = e.target.closest('.tn-pin, .tn-date[data-lieu]'); if (!el) return; if (el.matches('.tn-pin')) el.setAttribute('aria-describedby', `tn-n-${el.dataset.tnLieu}`); allumer(lieuDe(el)); };
    const auBlur = e => { const el = e.target.closest('.tn-pin, .tn-date[data-lieu]'); if (!el) return; el.removeAttribute('aria-describedby'); allumer(el.contains(e.relatedTarget) ? lieuDe(el) : null); };
    [carte, zone].forEach(r => { r.addEventListener('focusin', auFocus); r.addEventListener('focusout', auBlur); });
  }
  // « Voir sur la carte » (la fiche d'un lieu) : recentrer la carte sur la pastille du lieu et la focaliser ; hors de la carte, y aller d'abord
  function viser(id) {
    const l = lieu(id); if (!l || !projeter(l)) return false;
    if (aVoir()) return courant.viser(id);
    visee = { id, t: Date.now() };
    location.hash = '#/representations/carte';
    return true;
  }
  document.addEventListener('click', e => {
    const a = e.target.closest?.('[data-tn-viser]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (aVoir() && typeof TIROIR !== 'undefined' && TIROIR.ouvert() && !TIROIR.fermerTout({ demander: true })) return;
    viser(+a.dataset.tnViser);
  });
  document.addEventListener('pointerdown', e => { if (actif && !e.target.closest?.('#tn-carte')) actif = false; }, true);
  const style = document.createElement('style');
  style.textContent = `
.tn-deux { position: relative; display: grid; grid-template-columns: minmax(0, var(--l-tn, 1.3fr)) minmax(320px, 1fr); gap: 18px; align-items: start; }
.tn-carte { position: relative; padding: 10px; }
.tn-svg { width: 100%; height: auto; display: block; cursor: grab; user-select: none; }
.tn-glisse .tn-svg { cursor: grabbing; }
.tn-zoom { position: absolute; top: 16px; right: 16px; display: flex; flex-direction: column; gap: 4px; }
.tn-zb { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; padding: 0; border: 1px solid var(--trait); border-radius: 10px; background: var(--carte); color: var(--encre); cursor: pointer; }
.tn-zb:hover { border-color: var(--accent); color: var(--accent); }
.tn-zb:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (pointer: coarse) { .tn-zoom { display: none; } }
@media print { .tn-zoom { display: none !important; } }
.tn-pays { fill: color-mix(in srgb, var(--accent) 6%, var(--carte)); stroke: color-mix(in srgb, var(--accent) 45%, var(--trait)); stroke-width: 1.2; }
.tn-voisin { fill: var(--doux); stroke: var(--trait); stroke-width: 1; }
.tn-trajet { fill: none; stroke: var(--accent); stroke-dasharray: 4 3; opacity: .7; stroke-linejoin: round; }
.tn-maison circle { fill: var(--encre); stroke: var(--carte); stroke-width: 1.5; }
.tn-pin { cursor: pointer; }
.tn-pin .tn-halo { fill: var(--c); opacity: .18; }
.tn-pin .tn-point { fill: var(--c); stroke: var(--carte); stroke-width: 1.5; }
.tn-pin text { fill: #fff; font-weight: 800; text-anchor: middle; dominant-baseline: middle; pointer-events: none; font-family: var(--titres, inherit); }
.tn-pin text.tn-nom { fill: var(--encre); font-weight: 700; paint-order: stroke; stroke: var(--carte); stroke-width: 3px; stroke-linejoin: round; }
.tn-pin:hover .tn-halo, .tn-pin:focus-visible .tn-halo, .tn-pin.allume .tn-halo { opacity: .4; }
.tn-pin text { user-select: none; }
.tn-pin .tn-point, .tn-pin .tn-halo { transform-box: fill-box; transform-origin: center; transition: transform 450ms cubic-bezier(.3, 1.6, .5, 1); }
.tn-pin.allume .tn-point, .tn-pin.allume .tn-halo { transform: scale(1.15); }
.tn-pin.allume .tn-point { stroke: var(--encre); stroke-width: 2; }
@media (prefers-reduced-motion: reduce) { .tn-pin .tn-point, .tn-pin .tn-halo { transition: none; } .tn-pin.allume .tn-point, .tn-pin.allume .tn-halo { transform: none; } }
html.still .tn-pin .tn-point, html.still .tn-pin .tn-halo { transition: none; }
html.still .tn-pin.allume .tn-point, html.still .tn-pin.allume .tn-halo { transform: none; }
.tn-pin:focus-visible { outline: none; }
.tn-pin:focus-visible .tn-point { stroke: var(--encre); stroke-width: 2.5; }
.tn-kpi { margin-bottom: 10px; }
.tn-etapes { margin: 0; padding: 0; list-style: none; }
.tn-etapes > li { margin: 0; }
.tn-etapes .ligne { margin-bottom: 0; }
.tn-date.allume { box-shadow: 0 0 0 3px var(--accent-doux); border-color: var(--accent); background: color-mix(in srgb, var(--carte) 80%, var(--c)); }
.tn-trajet-l { display: flex; align-items: center; gap: 8px; padding: 4px 12px 4px 20px; color: var(--gris); font-size: 13px; }
.tn-trajet-l.serre { color: var(--alerte); font-weight: 600; }
.tn-trajet-l .tn-fleche { color: var(--trait); font-weight: 800; }
@media (max-width: 900px) { .tn-deux { grid-template-columns: 1fr; } .tn-deux > .poignee { display: none; } }`;
  document.head.append(style);
  return { vue, projeter, etapes, km, viser };
})();
