'use strict';
/* Les garde-fous à la saisie : dans la fiche d'une date, ce qui cloche se dit en direct, au-dessus du formulaire, pas après
   coup. Quelqu'un de l'équipe indisponible ce jour-là (crescite_indisponibilites, le cinquième script), le lieu qui accueille
   déjà une autre date ce jour-là, une autre date le même jour à plus de 150 km, quelqu'un déjà sur une autre date ce
   jour-là, une date publiée sans horaire, un contrat signé pour une date encore en option, une option déjà passée.
   Chaque alerte mène où il faut (l'autre date s'ouvre en tiroir, le champ se vise). Dans la fenêtre d'une piste de
   diffusion : une cession confirmée sans montant, une relance dans le passé. Rien ne bloque : on enregistre quand même.
   Chargé après parcours.js (l'équipe du formulaire) et tiroir.js.
   GARDEFOUS.poser(zone, F, d0)   GARDEFOUS.alertes(F, d0)   GARDEFOUS.piste(form) */
const GARDEFOUS = (() => {
  const LOIN = 150;   // km, à vol d'oiseau
  let indispos = null, chargement = null;
  // les indisponibilités à venir, lues une fois par session (et relues au bout d'une heure) ; sans le cinquième script, rien
  function charger() {
    if (chargement) return chargement;
    chargement = sb.from('crescite_indisponibilites').select('personne_id,debut,fin,journee,motif').gte('fin', `${AUJ}T00:00:00`).limit(2000)
      .then(({ data, error }) => { indispos = error ? [] : (data || []); setTimeout(() => { chargement = null; }, 36e5); return indispos; }, () => { indispos = []; return indispos; });
    return chargement;
  }
  const km = (a, b) => { if (!(a && b && a.latitude != null && a.longitude != null && b.latitude != null && b.longitude != null)) return null; const r = x => x * Math.PI / 180, R = 6371, dLat = r(b.latitude - a.latitude), dLon = r(b.longitude - a.longitude), h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(dLon / 2) ** 2; return Math.round(2 * R * Math.asin(Math.sqrt(h))); };
  const joursDe = (debut, fin) => { const out = []; if (!debut) return out; let j = debut; const f = fin && fin >= debut ? fin : debut; for (let n = 0; j <= f && n < 400; n++) { out.push(j); j = plusJours(j, 1); } return out; };
  const joursForm = F => { const js = [...new Set((F.representations || []).filter(r => r.jour).map(r => r.jour))].sort(); return js.length ? js : joursDe(F.debut, F.fin); };
  const joursDate = d => { const js = [...new Set(repsDe(d.id).map(r => r.jour))].sort(); return js.length ? js : joursDe(d.debut, d.fin); };
  const titreDe = d => `${spectacle(d.spectacle_id)?.titre || 'une date'}${lieu(d.lieu_id) ? ` à ${lieu(d.lieu_id).commune}` : ''}`;
  const quand = js => js.length === 1 ? `le ${jourCourt(js[0]).replace(/ \d{4}$/, '')}` : `les ${js.slice(0, 3).map(j => jourCourt(j).replace(/ \d{4}$/, '')).join(', ')}${js.length > 3 ? '…' : ''}`;
  const equipeDe = F => { try { return (typeof PARCOURS !== 'undefined' && PARCOURS.equipeDuForm) ? PARCOURS.equipeDuForm(F) : []; } catch (e) { return []; } };
  const jourTz = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  function alertes(F, d0) {
    const xs = [], js = joursForm(F), mien = d0 ? d0.id : null, l = lieu(F.lieu_id);
    const autres = E.dates.filter(d => d.id !== mien && d.statut !== 'annulee');
    const memeJour = autres.map(d => ({ d, js: joursDate(d).filter(j => js.includes(j)) })).filter(x => x.js.length);
    // le lieu déjà pris
    if (l) memeJour.filter(x => x.d.lieu_id === l.id).forEach(x => xs.push({ niveau: 'alerte', texte: `${l.nom || l.commune} accueille déjà ${titreDe(x.d)} ${quand(x.js)}${x.d.statut === 'option' ? ' (en option)' : ''}.`, href: `#/representations/${x.d.id}`, lien: 'Voir cette date' }));
    // l'équipe : indisponible, ou déjà ailleurs ce jour-là
    const eq = E.equipeInstallee ? equipeDe(F) : [];
    eq.forEach(x => {
      const p = personne(x.personne_id); if (!p) return;
      (indispos || []).filter(i => i.personne_id === p.id).forEach(i => {
        const d1 = jourTz(i.debut), f1 = i.journee ? plusJours(jourTz(i.fin), -1) : jourTz(i.fin), touche = js.filter(j => j >= d1 && j <= f1);
        if (touche.length) xs.push({ niveau: 'alerte', texte: `${nomDe(p)} est indisponible ${quand(touche)}${i.motif ? ` (${i.motif})` : ''}.`, href: `#/equipe/${p.id}`, lien: 'Sa fiche' });
      });
      memeJour.forEach(x => { if (x.d.spectacle_id === +F.spectacle_id && x.d.lieu_id === F.lieu_id) return; let la = []; try { la = equipeDeLaDate(x.d); } catch (e) { la = []; } if (la.some(y => y.personne_id === p.id)) xs.push({ niveau: 'alerte', texte: `${nomDe(p)} est aussi sur ${titreDe(x.d)} ${quand(x.js)}.`, href: `#/representations/${x.d.id}`, lien: 'Voir cette date' }); });
    });
    // une autre date le même jour, loin
    memeJour.forEach(x => { const d = km(l, lieu(x.d.lieu_id)); if (d != null && d >= LOIN && !xs.some(a => a.href === `#/representations/${x.d.id}`)) xs.push({ niveau: 'info', texte: `${quand(x.js).replace(/^le /, 'Le ').replace(/^les /, 'Les ')} aussi, ${titreDe(x.d)}, à ${d} km.`, href: `#/representations/${x.d.id}`, lien: 'Voir cette date' }); });
    // la date elle-même
    const reps = (F.representations || []).filter(r => r.jour);
    if (F.visible && PUBLIABLE(F.nature) && F.statut === 'confirmee' && reps.length && reps.some(r => !r.heure)) xs.push({ niveau: 'info', texte: 'Publiée sans horaire : le site montrera la date sans heure.', viser: '#d-reps [data-r="heure"]' });
    if ((F.suivi?.contrat || '') === 'signé' && F.statut === 'option') xs.push({ niveau: 'alerte', texte: 'Le contrat est signé, mais la date est encore une option.', viser: '[data-statut="confirmee"]', lien: 'Confirmer' });
    if (F.statut === 'option' && js.length && js[js.length - 1] < AUJ) xs.push({ niveau: 'info', texte: 'Cette option est passée : à confirmer, annuler ou reporter.', viser: '[data-statut]' });
    if (F.visible && PUBLIABLE(F.nature) && F.statut === 'confirmee' && !l && !(F.intitule || '').trim()) xs.push({ niveau: 'info', texte: 'Publiée sans lieu : le site dira « lieu à préciser ».', viser: '#d-lieu input' });
    return xs;
  }
  function html(xs) {
    if (!xs.length) return '';
    return `<ul class="gardefous" aria-label="Ce qui mérite un regard">${xs.map(a => `<li class="gf-${a.niveau}"><span class="gf-ico" aria-hidden="true">${a.niveau === 'alerte' ? '!' : 'i'}</span><span>${esc(a.texte)}</span>
      ${a.href ? `<a class="btn petit" href="${esc(a.href)}">${esc(a.lien || 'Voir')}</a>` : a.viser ? `<button type="button" class="btn petit" data-gf-viser="${esc(a.viser)}">${esc(a.lien || 'Voir')}</button>` : ''}</li>`).join('')}</ul>`;
  }
  // dans la fiche d'une date : posé à chaque changement du formulaire ; les indisponibilités arrivent, puis on repose
  function poser(zone, F, d0) {
    const el = $('#d-gardefous', zone); if (!el) return;
    if (indispos === null && E.equipeInstallee && E.sql5 !== false) charger().then(() => { if (el.isConnected) poser(zone, F, d0); });
    const xs = alertes(F, d0);
    const avant = el.dataset.cle || '', cle = JSON.stringify(xs.map(a => a.texte));
    if (cle === avant) return;
    el.dataset.cle = cle; el.innerHTML = html(xs);
  }
  // la fenêtre d'une piste de diffusion
  function piste(form) {
    const v = id => (form.querySelector(`#${id}`) || {}).value || '';
    const xs = [];
    if (v('crm-etape') === 'contrat_signe' && !(parseFloat(v('crm-montant')) > 0)) xs.push({ niveau: 'alerte', texte: 'Cession confirmée sans montant : le tableau de bord ne la comptera pas.' });
    const rel = v('crm-prochaine');
    if (rel && rel < AUJ && !['contrat_signe', 'bilan'].includes(v('crm-etape'))) xs.push({ niveau: 'info', texte: 'La prochaine relance est déjà passée.' });
    const st = v('crm-structure').trim();
    if (st && (E.prospects || []).some(p => String(p.id) !== (form.dataset.pisteId || '') && norm(p.structure) === norm(st) && String(p.spectacle_id) === v('crm-sp'))) xs.push({ niveau: 'info', texte: 'Une piste existe déjà pour cette structure et ce spectacle.' });
    let el = form.querySelector('#crm-gardefous');
    if (!el) { el = document.createElement('div'); el.id = 'crm-gardefous'; form.querySelector('#b-sauver-crm')?.closest('div')?.before(el); }
    el.innerHTML = html(xs);
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-gf-viser]'); if (!b) return; visee = b.dataset.gfViser; viser(); });
  document.addEventListener('input', e => { const f = e.target.closest('#f-prospect-crm'); if (f) piste(f); });
  document.addEventListener('change', e => { const f = e.target.closest('#f-prospect-crm'); if (f) piste(f); });
  const style = document.createElement('style');
  style.textContent = `
.gardefous { display: grid; gap: 6px; margin: 0 0 14px; padding: 0; list-style: none; }
.gardefous li { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 10px; font-size: 14px; background: var(--option-doux); border: 1px solid color-mix(in srgb, var(--option) 40%, transparent); }
.gardefous li.gf-alerte { background: var(--alerte-doux); border-color: color-mix(in srgb, var(--alerte) 40%, transparent); }
.gardefous li > span:nth-child(2) { flex: 1; }
.gardefous .gf-ico { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: var(--option); color: #fff; font-weight: 900; font-size: 13px; flex: none; }
.gardefous li.gf-alerte .gf-ico { background: var(--alerte); }
#crm-gardefous { margin: 6px 0 12px; }
#crm-gardefous .gardefous { margin: 0; }`;
  document.head.append(style);
  return { poser, alertes, piste, charger, km };
})();
