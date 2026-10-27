'use strict';
/* Le parcours d'une date : ce qui la mène de l'option au bilan, étape par étape, calculé d'après la base (rien à saisir).
   Confirmée (le statut), contrat (le suivi : à envoyer, envoyé, signé), lieu complet (adresse et contact du lieu), équipe
   (qui part, et son téléphone), feuille de route (composée, publiée), bilan (les spectateurs, une fois la date passée),
   facture (émise, payée ; en retard passé son échéance).
   Dans la fiche d'une date, un stepper sous le titre : chaque étape dit où elle en est et s'ouvre là où on la complète
   (le champ du statut, du contrat, le lieu, la feuille…) ; dans les listes et les prochaines dates du tableau de bord, des
   points colorés (vert : fait, ambre : en cours, gris : à faire). Une répétition ou une date « autre » n'a ni contrat ni
   bilan ; une date annulée ou reportée n'a plus de parcours. Chargé après equipe.js (l'équipe, les feuilles).
   PARCOURS.etapes(d, F)  PARCOURS.html(d, F)  PARCOURS.points(d)  PARCOURS.poser(el, d, F)

   La complétude (COMPLETUDE, plus bas dans ce fichier, même chargement) est autre chose que le parcours : non pas où en
   est la date, mais combien de ses champs sont renseignés. Une jauge sous le titre de la fiche (« 8 champs sur 10 ») et
   « Compléter », qui vise le premier champ vide (visee / viser du script principal, comme les étapes du parcours). Six
   sections : la date (spectacle, lieu), les séances (un jour, l'heure de chacune), le site (la billetterie, pour une date
   publiable et confirmée), le suivi (organisateur, contact, contrat, montant de cession quand la base a la diffusion ; ni
   pour une répétition ni pour une date « autre »), les chiffres (les spectateurs, quand la date est passée) et l'équipe
   (quelqu'un part, quand la base a l'équipe). Un champ qui ne s'applique pas à cette date ne compte pas. La diffusion n'y
   est pas : la piste de diffusion porte ce suivi.
   COMPLETUDE.calculer(F)  COMPLETUDE.html(F)  COMPLETUDE.poser(el, F) */
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
      xs.push({ k: 'equipe', l: 'Équipe', etat: !eq.length ? 'afaire' : sansTel.length ? 'encours' : 'fait', detail: !eq.length ? 'personne ne part' : sansTel.length ? `${sansTel.length} sans téléphone` : `${eq.length} ${eq.length > 1 ? 'personnes' : 'personne'}`, viser: '#d-equipe' });
      const f = E.feuilles.find(x => x.date_id === d.id), n = f ? aCompleter(d.id) : 0;
      xs.push({ k: 'feuille', l: 'Feuille de route', etat: !f ? 'afaire' : f.statut === 'publiee' ? 'fait' : 'encours', detail: !f ? 'à composer' : f.statut === 'publiee' ? `publiée v${f.version}` : `brouillon${n ? ` · ${n} à compléter` : ''}`, href: `#/feuilles/${d.id}`, viserLoin: f ? '#fr-manques' : '#fr-composer' });
    }
    if (avecContrat({ nature }) && E.chiffresInstalles) {
      const c = F ? F.chiffres?.spectateurs : (E.chiffres || []).find(x => x.date_id === d.id)?.spectateurs;
      const rempli = c !== '' && c != null;
      xs.push({ k: 'bilan', l: 'Bilan', etat: rempli ? 'fait' : passee(d) ? 'afaire' : 'attente', detail: rempli ? `${nombreFr(c)} spectateurs` : passee(d) ? 'spectateurs à noter' : 'après la date', viser: '#c-spectateurs' });
    }
    // la facture (les documents émis, le vingtième script) : émise, payée ; en retard, elle le dit
    if (avecContrat({ nature }) && E.docsInstalles && d) {
      const fs = (E.docsGeneres || []).filter(x => x.type === 'facture' && !x.annule_le && (x.date_id === d.id || (x.dates || []).map(Number).includes(Number(d.id))));
      const payee = fs.find(x => x.paye_le), due = fs.find(x => !x.paye_le), retard = due && due.echeance && due.echeance < AUJ;
      xs.push({ k: 'facture', l: 'Facture', etat: payee && !due ? 'fait' : fs.length ? 'encours' : passee(d) ? 'afaire' : 'attente',
        detail: payee && !due ? `payée le ${jourCourt(payee.paye_le)}` : due ? `${due.numero}${retard ? ' · en retard' : due.echeance ? ` · avant le ${jourCourt(due.echeance)}` : ''}` : passee(d) ? 'à émettre' : 'après la date', viser: '#d-documents' });
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
/* le chiffre sur le vert ou l'ambre : le blanc le jour, la nuit l'encre sombre (ces couleurs y sont claires) */
.pc-fait .pc-num { background: var(--ok); color: var(--sur-accent, #fff); }
.pc-fait .pc-e { border-color: color-mix(in srgb, var(--ok) 45%, var(--trait)); }
.pc-encours .pc-num { background: var(--option); color: var(--sur-accent, #fff); }
.pc-encours .pc-d { color: var(--option); font-weight: 700; }
.pc-afaire .pc-d { color: var(--alerte); font-weight: 700; }
/* une étape qui attend : un cadre en tirets plutôt qu'un voile (le texte reste lisible) */
.pc-attente .pc-e, .pc-sans .pc-e { border-style: dashed; color: var(--gris); }
.pc-points { display: inline-flex; gap: 3px; align-items: center; }
.pc-points i { width: 8px; height: 8px; border-radius: 50%; background: var(--trait); }
.pc-points i.pc-fait { background: var(--ok); }
.pc-points i.pc-encours { background: var(--option); }
/* chaque point se voit sur la carte (3:1) : plein pour ce qui est fait, en cours ou à faire, un anneau pour ce qui attend */
.pc-points i.pc-afaire { background: var(--alerte); }
.pc-points i.pc-attente { background: none; box-shadow: inset 0 0 0 1.5px var(--gris); }
.ligne .badges .pc-points { margin-top: 2px; }
@media (max-width: 520px) { .pc-d { display: none; } .pc-e { padding: 4px 9px 4px 5px; } }`;
  document.head.append(style);
  return { etapes, html, points, poser, equipeDuForm };
})();

// ———— la complétude d'une date : combien de ses champs sont renseignés (voir l'en-tête de ce fichier)
const COMPLETUDE = (() => {
  const SECTIONS = [['date', 'La date'], ['seances', 'Les séances'], ['site', 'Sur le site'], ['suivi', 'Le suivi'], ['chiffres', 'Les chiffres'], ['equipe', 'L’équipe']];
  const plein = v => v != null && String(v).trim() !== '';
  // les champs d'une date d'après son formulaire (F : dateVersForm / la fiche en cours de saisie) : ceux qui s'appliquent à elle
  function champs(F) {
    const nature = F.nature || 'representations', reps = (F.representations || []).filter(r => r.jour), dernier = [...reps.map(r => r.jour), F.fin, F.debut].filter(Boolean).sort().pop() || '';
    // la fiche ne dessine « Début » que sans aucune ligne de séance : sinon, c'est le jour de la première ligne qui n'en a pas
    const jourVide = (F.representations || []).length ? Math.max(0, (F.representations || []).findIndex(r => !r.jour)) : -1;
    const avecSuivi = ['representations', 'residence'].includes(nature), publiable = ['representations', 'residence'].includes(nature) && F.statut === 'confirmee' && F.visible !== false;
    const xs = [
      { s: 'date', k: 'spectacle', l: 'le spectacle', ok: plein(F.spectacle_id), viser: '#d-sp' },
      { s: 'date', k: 'lieu', l: 'le lieu', ok: !!F.lieu_id, viser: '#d-lieu input' },
      { s: 'seances', k: 'jour', l: 'un jour', ok: reps.length > 0 || plein(F.debut), viser: jourVide < 0 ? '#d-debut' : `#d-reps tr[data-i="${jourVide}"] [data-r="jour"]` },
    ];
    if (reps.length) { const i = (F.representations || []).findIndex(r => r.jour && !plein(r.heure)); xs.push({ s: 'seances', k: 'heure', l: 'l’heure des séances', ok: i < 0, viser: i < 0 ? '' : `#d-reps tr[data-i="${i}"] [data-r="heure"]` }); }
    if (publiable) xs.push({ s: 'site', k: 'billetterie', l: 'le lien de billetterie', ok: plein(F.lien) || reps.some(r => plein(r.lien)), viser: '#d-lien' });
    if (avecSuivi) {
      xs.push({ s: 'suivi', k: 'organisateur', l: 'l’organisateur', ok: plein(F.suivi?.organisateur), viser: '#s-org' },
        { s: 'suivi', k: 'contact', l: 'le contact', ok: plein(F.suivi?.contact), viser: '#s-contact' },
        { s: 'suivi', k: 'contrat', l: 'le contrat', ok: plein(F.suivi?.contrat), viser: '#s-contrat' });
      if (E.ideale) xs.push({ s: 'suivi', k: 'montant', l: 'le montant de cession', ok: plein(F.suivi?.montant_cession), viser: '#s-montant' });
      if (E.chiffresInstalles && dernier && dernier < AUJ) xs.push({ s: 'chiffres', k: 'spectateurs', l: 'les spectateurs', ok: plein(F.chiffres?.spectateurs), viser: '#c-spectateurs' });
    }
    if (E.equipeInstallee && typeof PARCOURS !== 'undefined') { let eq = []; try { eq = PARCOURS.equipeDuForm(F); } catch (e) { eq = []; } xs.push({ s: 'equipe', k: 'equipe', l: 'l’équipe', ok: eq.length > 0, viser: '#d-equipe' }); }
    return xs;
  }
  // → { remplis, total, manques (les champs vides, dans l'ordre de la fiche), premier (le premier vide), sections }
  function calculer(F) {
    const xs = champs(F), manques = xs.filter(x => !x.ok);
    return { remplis: xs.length - manques.length, total: xs.length, manques, premier: manques.find(x => x.viser) || manques[0] || null,
      sections: SECTIONS.map(([s, l]) => ({ s, l, total: xs.filter(x => x.s === s).length, remplis: xs.filter(x => x.s === s && x.ok).length })).filter(x => x.total) };
  }
  const texte = c => `${c.remplis} champ${c.remplis > 1 ? 's' : ''} sur ${c.total}`;
  const dit = c => `${texte(c)}${c.manques.length ? `. Il manque : ${c.manques.slice(0, 4).map(x => x.l).join(', ')}${c.manques.length > 4 ? '…' : ''}` : '. La date est complète'}`;
  const detail = c => c.sections.map(x => `${x.l} : ${x.remplis} sur ${x.total}`).join(' · ');
  const nombres = c => `<b class="cpl-n chiffre">${chiffresRoulants(c.remplis)}</b> champ${c.remplis > 1 ? 's' : ''} sur ${c.total}`;
  const bouton = c => (c.premier ? `<button type="button" class="btn petit cpl-completer" data-cpl-viser="${esc(c.premier.viser)}" title="${esc(`Il manque ${c.premier.l}`)}">Compléter</button>` : '');
  // la jauge est le progressbar ; « Compléter » est à côté, pas dedans (les enfants d'un progressbar ne sont pas lus comme des commandes)
  function html(F) {
    const c = calculer(F);
    if (!c.total) return '';
    return `<div class="cpl${c.manques.length ? '' : ' cpl-ok'}"><span class="cpl-jauge" role="progressbar" aria-label="Champs renseignés" aria-valuemin="0" aria-valuemax="${c.total}" aria-valuenow="${c.remplis}" aria-valuetext="${esc(dit(c))}" title="${esc(detail(c))}" data-n="${c.remplis}">
      <span class="cpl-t">${nombres(c)}</span><span class="cpl-barre"><i style="width:${Math.round(100 * c.remplis / c.total)}%"></i></span></span>${bouton(c)}</div>`;
  }
  // posée dans la fiche puis tenue à jour sur place : la barre glisse, le compte roule (chiffre après chiffre) quand il change
  function poser(el, F) {
    if (!el) return;
    const c = calculer(F), cpl = $('.cpl', el), jauge = cpl && $('.cpl-jauge', cpl);
    if (!jauge || !c.total) { el.innerHTML = html(F); return; }
    const change = +jauge.dataset.n !== c.remplis;
    jauge.dataset.n = c.remplis;
    jauge.setAttribute('aria-valuemax', c.total); jauge.setAttribute('aria-valuenow', c.remplis); jauge.setAttribute('aria-valuetext', dit(c)); jauge.title = detail(c);
    $('.cpl-barre i', jauge).style.width = `${Math.round(100 * c.remplis / c.total)}%`;
    cpl.classList.toggle('cpl-ok', !c.manques.length);
    if (change) {
      $('.cpl-t', jauge).innerHTML = nombres(c);
      if (!CALME_ADMIN()) { cpl.classList.remove('roule'); void cpl.offsetWidth; cpl.classList.add('roule'); }
    }
    const b = $('.cpl-completer', cpl);
    if (!c.premier) b?.remove();
    else if (!b) cpl.insertAdjacentHTML('beforeend', bouton(c));
    else if (b.dataset.cplViser !== c.premier.viser) { b.dataset.cplViser = c.premier.viser; b.title = `Il manque ${c.premier.l}`; }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-cpl-viser]'); if (!b) return;
    visee = b.dataset.cplViser; viser();
  });
  const style = document.createElement('style');
  style.textContent = `
.cpl { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: -4px 0 12px; font-size: 13px; color: var(--gris); }
.cpl-t { white-space: nowrap; }
.cpl .chiffre { color: var(--encre); font-variant-numeric: tabular-nums; }
.cpl .chiffre .d { display: inline-block; }
.cpl-barre { flex: 0 1 160px; min-width: 80px; height: 6px; border-radius: 999px; background: var(--doux); overflow: hidden; }
.cpl-barre i { display: block; height: 100%; border-radius: 999px; background: var(--accent); }
.cpl-ok .cpl-barre i { background: var(--ok); }
.cpl-ok .chiffre { color: var(--ok); }
.cpl-completer { min-height: 30px; }
@media (pointer: coarse) { .cpl-completer { min-height: 44px; } }
@media (prefers-reduced-motion: no-preference) {
  .cpl.roule .chiffre .d { animation: cpl-roule .45s cubic-bezier(.2, .8, .2, 1) calc(var(--i, 0) * 45ms) both; }
  @keyframes cpl-roule { from { opacity: 0; transform: translateY(.45em); } }
  .cpl-barre i { transition: width .35s cubic-bezier(.2, .8, .2, 1); }
}`;
  document.head.append(style);
  return { calculer, html, poser };
})();
