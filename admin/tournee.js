'use strict';
/* La carte de tournée (#/representations/carte, à côté de la liste et du tableur) : les lieux de la saison sur la carte
   de France du site (le même fond, la même projection : fond-carte.js), une pastille par lieu avec le nombre de dates,
   le trajet des dates enchaînées dans l'ordre, et, à côté, la tournée étape par étape avec la distance à vol d'oiseau
   entre deux dates qui se suivent et le nombre de jours entre elles : un enchaînement serré (plus de 300 km d'un jour à
   l'autre, ou plus de 150 km le même jour) se signale. Filtres : la saison, le spectacle, à venir seulement ; « Autour
   des dates » resserre le cadre. Une pastille ouvre le lieu en tiroir, une étape ouvre la date (tiroir.js). Les lieux
   sans position (latitude, longitude) sont listés : « Trouver la commune » dans leur fiche les place. Chargé après
   fond-carte.js et tiroir.js.
   TOURNEE.vue()   TOURNEE.projeter(lieu)   TOURNEE.etapes(dates)   TOURNEE.km(a, b) */
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
  function vue() {
    if (!F) { cadre('representations', `<div class="tete"><h1>Représentations</h1>${TABLEUR.choixVue('carte')}</div><div class="vide bloc">Le fond de carte manque (admin/fond-carte.js : maquettes/build.py l’écrit).</div>`); return; }
    const saisonCourante = AGENDA.saisonDe(AUJ);
    const f = session.tournee = Object.assign({ saison: saisonCourante, spectacle: '', avenir: false, serre: false }, session.tournee || {});
    const saisons = [...new Set(E.dates.map(d => d.saison))].sort().reverse();
    if (f.saison && f.saison !== 'toutes' && !saisons.includes(f.saison)) f.saison = saisons.includes(saisonCourante) ? saisonCourante : 'toutes';
    cadre('representations', `<div class="tete"><h1>Représentations</h1>${TABLEUR.choixVue('carte')}<a class="btn principal" href="#/representations/nouvelle">＋ Nouvelle date</a></div>
      <div class="filtres tn-filtres"><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
        <select id="tn-saison" aria-label="Saison"><option value="toutes"${f.saison === 'toutes' ? ' selected' : ''}>Toutes les saisons</option>${saisons.map(s => `<option value="${s}"${f.saison === s ? ' selected' : ''}>Saison ${s}</option>`).join('')}</select>
        <div class="puces" role="group" aria-label="Spectacle">${E.spectacles.filter(s => s.page || E.dates.some(d => d.spectacle_id === s.id)).map(s => `<button type="button" class="puce" data-tn-sp="${s.id}" style="--c:${couleurSp(s)}" aria-pressed="${String(f.spectacle) === String(s.id)}"><span class="pastille"></span>${esc(s.titre.split(' – ')[0])}</button>`).join('')}</div>
        <label class="case" style="font-size:13.5px"><input type="checkbox" id="tn-avenir"${f.avenir ? ' checked' : ''}> À venir seulement</label>
        <label class="case" style="font-size:13.5px"><input type="checkbox" id="tn-serre"${f.serre ? ' checked' : ''}> Autour des dates</label>
        <span class="compte" id="tn-compte"></span></div></div>
      <div class="tn-deux"><div class="bloc tn-carte" id="tn-carte"></div><div class="tn-cote"><div class="bloc" id="tn-resume"></div><div class="bloc" data-liste id="tn-etapes"></div></div></div>`);
    const zone = $('#tn-etapes');
    const dessiner = () => {
      const ds = E.dates.filter(d => d.statut !== 'annulee' && ['representations', 'residence'].includes(d.nature || 'representations') && (f.saison === 'toutes' || d.saison === f.saison) && (!f.spectacle || String(d.spectacle_id) === String(f.spectacle)) && (!f.avenir || (d.fin || d.debut) >= AUJ)).sort(parDebut);
      const xs = etapes(ds);
      // les lieux : une pastille par lieu, avec ses dates
      const lieux = new Map();
      ds.forEach(d => { const l = lieu(d.lieu_id); if (!l) return; if (!lieux.has(l.id)) lieux.set(l.id, { l, dates: [], xy: projeter(l) }); lieux.get(l.id).dates.push(d); });
      const places = [...lieux.values()].filter(x => x.xy && dansCadre(x.xy)), sans = [...lieux.values()].filter(x => !x.xy), hors = [...lieux.values()].filter(x => x.xy && !dansCadre(x.xy));
      const trajets = xs.filter(x => x.trajet && x.km != null), total = trajets.reduce((s, x) => s + x.km, 0), serres = trajets.filter(x => x.serre).length;
      $('#tn-compte').textContent = `${ds.length} date${ds.length > 1 ? 's' : ''} · ${lieux.size} lieu${lieux.size > 1 ? 'x' : ''}`;
      // le cadre : la France, ou serré autour des pastilles
      let vb = F.viewBox;
      if (f.serre && places.length) { const xsP = places.map(p => p.xy[0]), ysP = places.map(p => p.xy[1]); const x0 = Math.min(...xsP, F.rouen[0]), x1 = Math.max(...xsP, F.rouen[0]), y0 = Math.min(...ysP, F.rouen[1]), y1 = Math.max(...ysP, F.rouen[1]); const m = Math.max(60, (x1 - x0) * .18, (y1 - y0) * .18), w = Math.max(x1 - x0 + 2 * m, 220), h = Math.max(y1 - y0 + 2 * m, 220); vb = `${(x0 + x1) / 2 - w / 2} ${(y0 + y1) / 2 - h / 2} ${w} ${h}`; }
      const echelle = Math.sqrt(vb.split(/\s+/).map(Number)[2] / 800);
      const chemin = ds.map(d => lieux.get(d.lieu_id)).filter(x => x && x.xy && dansCadre(x.xy)).map(x => x.xy);
      const couleur = x => { const sps = [...new Set(x.dates.map(d => d.spectacle_id))]; return sps.length === 1 ? couleurSp(spectacle(sps[0])) : 'var(--accent)'; };
      $('#tn-carte').innerHTML = `<svg class="tn-svg" viewBox="${vb}" role="img" aria-label="Carte de la tournée : ${places.length} lieu${places.length > 1 ? 'x' : ''} placé${places.length > 1 ? 's' : ''}">
        <path class="tn-voisin" d="${F.belgique}"/><path class="tn-voisin" d="${F.luxembourg}"/><path class="tn-pays" d="${F.contour}"/>
        ${chemin.length > 1 ? `<polyline class="tn-trajet" points="${chemin.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" style="stroke-width:${(1.6 * echelle).toFixed(2)}"/>` : ''}
        <g class="tn-maison" transform="translate(${F.rouen[0]} ${F.rouen[1]})"><circle r="${(5 * echelle).toFixed(1)}"/><title>Rouen, la compagnie</title></g>
        ${places.map(x => `<g class="tn-pin" tabindex="0" role="button" data-tn-lieu="${x.l.id}" transform="translate(${x.xy[0].toFixed(1)} ${x.xy[1].toFixed(1)})" style="--c:${esc(couleur(x))}" aria-label="${esc(`${x.l.nom || x.l.commune} : ${x.dates.length} date${x.dates.length > 1 ? 's' : ''}`)}">
          <circle class="tn-halo" r="${((9 + Math.min(x.dates.length, 6) * 2.2) * echelle).toFixed(1)}"/><circle class="tn-point" r="${((6 + Math.min(x.dates.length, 6) * 1.6) * echelle).toFixed(1)}"/>
          <text y="${(1 * echelle).toFixed(1)}" style="font-size:${(9 * echelle).toFixed(1)}px">${x.dates.length}</text>
          <text class="tn-nom" y="${((18 + Math.min(x.dates.length, 6) * 1.6) * echelle).toFixed(1)}" style="font-size:${(10 * echelle).toFixed(1)}px">${esc(x.l.nom ? x.l.commune : x.l.commune)}</text>
          <title>${esc(`${x.l.nom ? `${x.l.nom}, ` : ''}${x.l.commune} — ${x.dates.map(d => `${spectacle(d.spectacle_id)?.titre || ''} ${jourCourt(d.debut).replace(/ \d{4}$/, '')}`).join(' · ')}`)}</title></g>`).join('')}</svg>`;
      $('#tn-resume').innerHTML = `<h3>La tournée</h3><div class="tb-kpi tn-kpi"><div><span>Dates</span><b>${ds.length}</b></div><div><span>Lieux</span><b>${lieux.size}</b></div><div><span>Kilomètres</span><b>${total.toLocaleString('fr-FR')}</b><small>à vol d’oiseau, de date en date</small></div><div class="${serres ? 'alerte' : ''}"><span>Enchaînements serrés</span><b>${serres}</b><small>${serres ? 'plus de 300 km d’un jour à l’autre' : 'rien à signaler'}</small></div></div>
        ${sans.length ? `<p class="aide">Sans position sur la carte : ${sans.map(x => `<a href="#/lieux/${x.l.id}" data-viser="latitude">${esc(x.l.nom || x.l.commune)}</a>`).join(', ')} — « Trouver la commune » dans la fiche du lieu.</p>` : ''}
        ${hors.length ? `<p class="aide">Hors du cadre : ${hors.map(x => `<a href="#/lieux/${x.l.id}">${esc(x.l.commune)}</a>`).join(', ')}.</p>` : ''}`;
      zone.innerHTML = xs.length ? `<h3>Étape par étape</h3><ol class="tn-etapes">${xs.map(x => x.trajet ? `<li class="tn-trajet-l${x.serre ? ' serre' : ''}"><span class="tn-fleche" aria-hidden="true">↓</span>${x.km != null ? `<b>${x.km} km</b> · ` : ''}${esc(quandTexte(x.jours))}${x.serre ? ' · <span class="badge annulee">serré</span>' : ''}</li>`
        : (d => { const s = spectacle(d.spectacle_id), l = lieu(d.lieu_id); return `<li><a class="ligne tn-date" href="#/representations/${d.id}" style="--c:${couleurSp(s)}"><span class="jj"><b>${+d.debut.slice(8, 10)}</b>${MC[+d.debut.slice(5, 7) - 1]}</span><span class="corps"><span class="t">${esc(s?.titre || '?')}</span><span class="ou">${esc(l ? lieuTexte(l) : 'Lieu à préciser')}</span></span><span class="badges">${d.statut === 'option' ? '<span class="badge option">Option</span>' : ''}${(d.fin || d.debut) < AUJ ? '<span class="badge">passée</span>' : ''}</span></a></li>`; })(x.date)).join('')}</ol>` : '<p class="vide">Aucune date avec ces filtres.</p>';
    };
    zone.rafraichir = dessiner;
    dessiner();
    const maj = () => { garderFiltres(); dessiner(); };
    $('#tn-saison').addEventListener('change', e => { f.saison = e.target.value; maj(); });
    $('#tn-avenir').addEventListener('change', e => { f.avenir = e.target.checked; maj(); });
    $('#tn-serre').addEventListener('change', e => { f.serre = e.target.checked; maj(); });
    $$('[data-tn-sp]').forEach(b => b.addEventListener('click', () => { f.spectacle = String(f.spectacle) === b.dataset.tnSp ? '' : b.dataset.tnSp; $$('[data-tn-sp]').forEach(x => x.setAttribute('aria-pressed', String(f.spectacle) === x.dataset.tnSp)); maj(); }));
    const ouvrirLieu = g => { const href = `#/lieux/${g.dataset.tnLieu}`; if (typeof TIROIR !== 'undefined' && TIROIR.peut(href)) TIROIR.ouvrir(href, { depuis: g }); else location.hash = href; };
    $('#tn-carte').addEventListener('click', e => { const g = e.target.closest('[data-tn-lieu]'); if (g) ouvrirLieu(g); });
    $('#tn-carte').addEventListener('keydown', e => { const g = e.target.closest('[data-tn-lieu]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ouvrirLieu(g); } });
  }
  const style = document.createElement('style');
  style.textContent = `
.tn-deux { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(320px, 1fr); gap: 18px; align-items: start; }
.tn-carte { padding: 10px; }
.tn-svg { width: 100%; height: auto; display: block; }
.tn-pays { fill: color-mix(in srgb, var(--accent) 6%, var(--carte)); stroke: color-mix(in srgb, var(--accent) 45%, var(--trait)); stroke-width: 1.2; }
.tn-voisin { fill: var(--doux); stroke: var(--trait); stroke-width: 1; }
.tn-trajet { fill: none; stroke: var(--accent); stroke-dasharray: 4 3; opacity: .7; stroke-linejoin: round; }
.tn-maison circle { fill: var(--encre); stroke: var(--carte); stroke-width: 1.5; }
.tn-pin { cursor: pointer; }
.tn-pin .tn-halo { fill: var(--c); opacity: .18; }
.tn-pin .tn-point { fill: var(--c); stroke: var(--carte); stroke-width: 1.5; }
.tn-pin text { fill: #fff; font-weight: 800; text-anchor: middle; dominant-baseline: middle; pointer-events: none; font-family: var(--titres, inherit); }
.tn-pin text.tn-nom { fill: var(--encre); font-weight: 700; paint-order: stroke; stroke: var(--carte); stroke-width: 3px; stroke-linejoin: round; }
.tn-pin:hover .tn-halo, .tn-pin:focus-visible .tn-halo { opacity: .4; }
.tn-pin:focus-visible { outline: none; }
.tn-pin:focus-visible .tn-point { stroke: var(--encre); stroke-width: 2.5; }
.tn-kpi { margin-bottom: 10px; }
.tn-etapes { margin: 0; padding: 0; list-style: none; }
.tn-etapes > li { margin: 0; }
.tn-etapes .ligne { margin-bottom: 0; }
.tn-trajet-l { display: flex; align-items: center; gap: 8px; padding: 4px 12px 4px 20px; color: var(--gris); font-size: 13px; }
.tn-trajet-l.serre { color: var(--alerte); font-weight: 600; }
.tn-trajet-l .tn-fleche { color: var(--trait); font-weight: 800; }
@media (max-width: 900px) { .tn-deux { grid-template-columns: 1fr; } }`;
  document.head.append(style);
  return { vue, projeter, etapes, km };
})();
