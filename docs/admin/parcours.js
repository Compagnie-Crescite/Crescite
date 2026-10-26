'use strict';
/* Le parcours d'une date : ce qui la mène de l'option au bilan, étape par étape, calculé d'après la base (rien à saisir).
   Confirmée (le statut), contrat (le suivi : à envoyer, envoyé, signé), lieu complet (adresse et contact du lieu), équipe
   (qui part, et son téléphone), feuille de route (composée, publiée), bilan (les spectateurs, une fois la date passée).
   Dans la fiche d'une date, un stepper sous le titre : chaque étape dit où elle en est et s'ouvre là où on la complète
   (le champ du statut, du contrat, le lieu, la feuille…) ; dans les listes et les prochaines dates du tableau de bord, des
   points colorés (vert : fait, ambre : en cours, gris : à faire). Une répétition ou une date « autre » n'a ni contrat ni
   bilan ; une date annulée ou reportée n'a plus de parcours. Chargé après equipe.js (l'équipe, les feuilles).
   PARCOURS.etapes(d, F)  PARCOURS.html(d, F)  PARCOURS.points(d)  PARCOURS.poser(el, d, F) */
const PARCOURS = (() => {
  const CONTRAT = { '': 'à envoyer', 'à envoyer': 'à envoyer', 'envoyé': 'envoyé, à signer', 'signé': 'signé' };
  const avecContrat = d => ['representations', 'residence'].includes(d.nature || 'representations');
  const passee = d => (d.fin || d.debut) < AUJ;
  // F : le formulaire en cours de saisie (statut, suivi, lieu, équipe), sinon la base
  function etapes(d, F = null) {
    const statut = F ? F.statut : d.statut, nature = F ? (F.nature || 'representations') : (d.nature || 'representations');
    const xs = [];
    if (statut === 'annulee' || statut === 'reportee') return [{ k: 'statut', l: statut === 'annulee' ? 'Annulée' : 'Reportée', etat: 'sans', detail: 'plus de parcours', viser: '[data-statut]' }];
    xs.push({ k: 'statut', l: 'Confirmée', etat: statut === 'confirmee' ? 'fait' : 'encours', detail: statut === 'confirmee' ? '' : 'encore une option', viser: statut === 'confirmee' ? '' : '[data-statut="confirmee"]' });
    if (avecContrat({ nature })) {
      const c = F ? (F.suivi?.contrat || '') : (E.suivis.find(x => x.date_id === d.id)?.contrat || '');
      xs.push({ k: 'contrat', l: 'Contrat', etat: c === 'signé' ? 'fait' : c === 'envoyé' ? 'encours' : 'afaire', detail: CONTRAT[c] || c, viser: '#s-contrat' });
    }
    const lieuId = F ? F.lieu_id : d.lieu_id, l = lieu(lieuId);
    if (!l) xs.push({ k: 'lieu', l: 'Lieu', etat: 'afaire', detail: 'à préciser', viser: '#d-lieu input' });
    else {
      const su = E.lieuxSuivi.find(x => x.lieu_id === l.id) || {}, manque = [!(l.adresse || '').trim() && 'adresse', !(su.contact || '').trim() && 'contact'].filter(Boolean);
      xs.push({ k: 'lieu', l: 'Lieu', etat: manque.length ? 'encours' : 'fait', detail: manque.length ? `sans ${manque.join(' ni ')}` : l.nom || l.commune, href: `#/lieux/${l.id}`, viserLoin: manque[0] || '' });
    }
    if (E.equipeInstallee && typeof equipeDeLaDate === 'function') {
      let eq = [];
      try { eq = F ? equipeDuForm(F) : equipeDeLaDate(d); } catch (e) { eq = []; }
      const sansTel = eq.filter(x => !(priveeDe(x.personne_id)?.telephone || '').trim());
      const ps = E.tourneeInstallee ? (E.presences || []).filter(x => x.date_id === d.id) : [], oui = ps.filter(x => x.statut === 'present').length, non = ps.filter(x => x.statut === 'absent');
      const presences = !eq.length || !E.tourneeInstallee ? '' : non.length ? ` · ${non.length} ne ${non.length > 1 ? 'pourront' : 'pourra'} pas` : oui ? ` · ${oui} sur ${eq.length} ${oui > 1 ? 'ont' : 'a'} confirmé` : '';
      xs.push({ k: 'equipe', l: 'Équipe', etat: !eq.length ? 'afaire' : sansTel.length || non.length ? 'encours' : 'fait', detail: (!eq.length ? 'personne ne part' : sansTel.length ? `${sansTel.length} sans téléphone` : `${eq.length} ${eq.length > 1 ? 'personnes' : 'personne'}`) + presences, viser: '#d-equipe' });
      const f = E.feuilles.find(x => x.date_id === d.id), n = f ? aCompleter(d.id) : 0;
      xs.push({ k: 'feuille', l: 'Feuille de route', etat: !f ? 'afaire' : f.statut === 'publiee' ? 'fait' : 'encours', detail: !f ? 'à composer' : f.statut === 'publiee' ? `publiée v${f.version}` : `brouillon${n ? ` · ${n} à compléter` : ''}`, href: `#/feuilles/${d.id}`, viserLoin: f ? '#fr-manques' : '#fr-composer' });
    }
    if (avecContrat({ nature }) && E.chiffresInstalles) {
      const c = F ? F.chiffres?.spectateurs : (E.chiffres || []).find(x => x.date_id === d.id)?.spectateurs;
      const rempli = c !== '' && c != null;
      xs.push({ k: 'bilan', l: 'Bilan', etat: rempli ? 'fait' : passee(d) ? 'afaire' : 'attente', detail: rempli ? `${nombreFr(c)} spectateurs` : passee(d) ? 'spectateurs à noter' : 'après la date', viser: '#c-spectateurs' });
    }
    return xs;
  }
  // l'équipe telle que le formulaire la décrit : la distribution en tournée, moins les absents, plus les ajouts
  function equipeDuForm(F) {
    const sp = +F.spectacle_id, base = distributionDe(sp).filter(x => x.en_tournee).map(x => ({ personne_id: x.personne_id }));
    const ecarts = F.equipe || [], ids = new Set(base.map(x => x.personne_id));
    const out = base.filter(x => ecarts.find(e => e.personne_id === x.personne_id)?.present !== false);
    ecarts.filter(e => e.present && !ids.has(e.personne_id)).forEach(e => out.push({ personne_id: e.personne_id }));
    return out;
  }
  const LIB = { fait: 'fait', encours: 'en cours', afaire: 'à faire', attente: 'plus tard', sans: '' };
  const faits = xs => xs.filter(x => x.etat === 'fait').length, comptees = xs => xs.filter(x => x.etat !== 'attente' && x.etat !== 'sans').length;
  function html(d, F = null) {
    const xs = etapes(d, F);
    if (!xs.length) return '';
    const une = (x, i) => {
      const corps = `<span class="pc-num" aria-hidden="true">${x.etat === 'fait' ? '✓' : i + 1}</span><span class="pc-corps"><span class="pc-l">${esc(x.l)}</span>${x.detail ? `<span class="pc-d">${esc(x.detail)}</span>` : ''}</span>`;
      const titre = `${x.l} : ${LIB[x.etat] || ''}${x.detail ? ` (${x.detail})` : ''}`;
      if (x.href) return `<a class="pc-e" href="${esc(x.href)}"${x.viserLoin ? ` data-viser="${esc(x.viserLoin)}"` : ''} title="${esc(titre)}">${corps}</a>`;
      if (x.viser) return `<button type="button" class="pc-e" data-pc-viser="${esc(x.viser)}" title="${esc(titre)}">${corps}</button>`;
      return `<span class="pc-e" title="${esc(titre)}">${corps}</span>`;
    };
    const n = faits(xs), t = comptees(xs);
    return `<ol class="parcours" aria-label="Parcours de la date : ${n} étape${n > 1 ? 's' : ''} sur ${t}">${xs.map((x, i) => `<li class="pc-${x.etat}">${une(x, i)}</li>`).join('')}</ol>`;
  }
  // les points des listes : un par étape, dans l'ordre, colorés par leur état ; le titre les détaille
  function points(d) {
    const xs = etapes(d);
    if (!xs.length || xs[0].etat === 'sans') return '';
    const detail = xs.map(x => `${x.l} : ${LIB[x.etat]}${x.detail ? ` (${x.detail})` : ''}`).join(' · ');
    return `<span class="pc-points" title="${esc(detail)}" aria-label="Parcours : ${faits(xs)} sur ${comptees(xs)}. ${esc(detail)}">${xs.map(x => `<i class="pc-${x.etat}"></i>`).join('')}</span>`;
  }
  // dans la fiche d'une date : posé puis tenu à jour à chaque changement du formulaire
  function poser(el, d, F = null) {
    if (!el || !d) return;
    el.innerHTML = html(d, F);
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-pc-viser]'); if (!b) return;
    visee = b.dataset.pcViser; viser();
  });
  const style = document.createElement('style');
  style.textContent = `
.parcours { display: flex; flex-wrap: wrap; gap: 6px; margin: -4px 0 14px; padding: 0; list-style: none; }
.parcours li { display: flex; }
.pc-e { display: inline-flex; align-items: center; gap: 8px; padding: 5px 11px 5px 6px; border-radius: 999px; border: 1px solid var(--trait); background: var(--carte); color: var(--encre); text-decoration: none; font: inherit; font-size: 13px; line-height: 1.15; cursor: pointer; text-align: left; }
.pc-e:hover { border-color: var(--gris); }
span.pc-e { cursor: default; }
.pc-num { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: var(--doux); color: var(--gris); font-size: 12px; font-weight: 800; flex: none; }
.pc-corps { display: flex; flex-direction: column; }
.pc-l { font-weight: 700; }
.pc-d { color: var(--gris); font-size: 12px; }
.pc-fait .pc-num { background: var(--ok); color: #fff; }
.pc-fait .pc-e { border-color: color-mix(in srgb, var(--ok) 45%, var(--trait)); }
.pc-encours .pc-num { background: var(--option); color: #fff; }
.pc-encours .pc-d { color: var(--option); font-weight: 700; }
.pc-afaire .pc-d { color: var(--alerte); font-weight: 700; }
.pc-attente .pc-e, .pc-sans .pc-e { opacity: .7; }
.pc-points { display: inline-flex; gap: 3px; align-items: center; }
.pc-points i { width: 8px; height: 8px; border-radius: 50%; background: var(--trait); }
.pc-points i.pc-fait { background: var(--ok); }
.pc-points i.pc-encours { background: var(--option); }
.pc-points i.pc-afaire { background: color-mix(in srgb, var(--alerte) 55%, var(--trait)); }
.pc-points i.pc-attente { background: var(--trait); opacity: .6; }
.ligne .badges .pc-points { margin-top: 2px; }
@media (max-width: 520px) { .pc-d { display: none; } .pc-e { padding: 4px 9px 4px 5px; } }`;
  document.head.append(style);
  return { etapes, html, points, poser, equipeDuForm };
})();
