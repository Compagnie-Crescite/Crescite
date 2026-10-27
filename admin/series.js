'use strict';
/* Les séries et les modèles de dates. « Série… » dans la fiche d'une date : du … au …, les jours de la semaine, les
   heures (10:00, 14:30), le public : les séances se posent d'un coup (une date, autant de représentations) ; « Dupliquer
   vers… » sur une sélection de dates (selection.js) : les mêmes dates décalées de n jours (364 : le même jour de la
   semaine l'année d'après), en option par défaut, avec « Annuler » ; un modèle par spectacle (Spectacles → Déroulé type :
   les horaires habituels tout public et scolaires, le public par défaut, une note), gardé dans crescite_textes
   (modele-date:<slug>), qui préremplit une nouvelle date et les séries. Chargé après selection.js et corbeille.js.
   SERIES.serie(F, redessiner)   SERIES.appliquerModele(F)   SERIES.modele(spectacleId)   SERIES.blocModele(el, F) */
const SERIES = (() => {
  const JOURS = [['1', 'lun.'], ['2', 'mar.'], ['3', 'mer.'], ['4', 'jeu.'], ['5', 'ven.'], ['6', 'sam.'], ['0', 'dim.']];
  const cle = s => (s ? `modele-date:${s.slug}` : null);
  const modele = spId => { const s = spectacle(+spId), k = cle(s); const t = k && E.textes.find(x => x.cle === k); return t && t.valeur && typeof t.valeur === 'object' ? t.valeur : null; };
  const heuresDe = t => String(t || '').split(/[,;\s]+/).map(h => { const m = /^(\d{1,2})[:h]?(\d{2})?$/.exec(h.trim()); return m ? `${String(+m[1]).padStart(2, '0')}:${m[2] || '00'}` : null; }).filter(h => h && /^([01]\d|2[0-3]):[0-5]\d$/.test(h));
  // un nouveau formulaire de date : les horaires habituels du spectacle (s'il a un modèle, et que rien n'a encore été saisi)
  function appliquerModele(F) {
    const m = modele(F.spectacle_id); if (!m) return false;
    const vierge = (F.representations || []).every(r => !r.jour && (!r.heure || r.heure === '20:00'));
    if (!vierge) return false;
    const pub = m.public || F.public || 'tout_public', hs = heuresDe(pub === 'scolaire' ? m.heures_scolaire || m.heures : m.heures || m.heures_scolaire);
    if (!hs.length) return false;
    F.representations = hs.map(h => ({ jour: '', heure: h, fin: '', public: pub, annulee: false, lien: '', note: '' }));
    F.public = pub;
    return true;
  }
  async function serie(F, redessiner) {
    const der = (F.representations || []).filter(r => r.jour).slice(-1)[0], m = modele(F.spectacle_id) || {};
    const pub = der?.public || m.public || 'tout_public';
    let x = null;   // ce que le formulaire calcule (il résout avec les valeurs saisies)
    const v0 = await GESTES.formulaire({ titre: 'Une série de séances', sousTitre: 'les mêmes heures chaque jour choisi, du premier au dernier', champs: [
      { k: 'du', t: 'date', l: 'Du', valeur: der ? plusJours(der.jour, 1) : AUJ, requis: true }, { k: 'au', t: 'date', l: 'Au', valeur: der ? plusJours(der.jour, 5) : plusJours(AUJ, 4), requis: true },
      { k: 'jours', t: 'cases', l: 'Les jours', choix: JOURS, valeur: ['1', '2', '3', '4', '5'] },
      { k: 'heures', t: 'texte', l: 'Les heures', ph: '10:00, 14:30', valeur: heuresDe(pub === 'scolaire' ? m.heures_scolaire || m.heures : m.heures).join(', ') || (der?.heure || '20:00'), aide: 'Séparées par des virgules ; vide : sans heure.' },
      { k: 'public', t: 'choix', seg: true, l: 'Public', choix: [['tout_public', 'Tout public'], ['scolaire', 'Scolaire'], ['autre', 'Autre']], valeur: pub },
      { k: 'remplacer', t: 'case', l: 'Remplacer les séances déjà saisies', valeur: false },
    ], ok: 'Poser les séances', enregistrer: async v => {
      if (!v.du || !v.au || v.au < v.du) return 'Du premier jour au dernier, dans l’ordre.';
      if (!(v.jours || []).length) return 'Au moins un jour de la semaine.';
      const hs = heuresDe(v.heures), reps = [];
      for (let j = v.du, n = 0; j <= v.au && n < 400; j = plusJours(j, 1), n++) {
        if (!(v.jours || []).includes(String(new Date(`${j}T12:00:00`).getDay()))) continue;
        (hs.length ? hs : ['']).forEach(h => reps.push({ jour: j, heure: h, fin: '', public: v.public || 'tout_public', annulee: false, lien: '', note: '' }));
      }
      if (!reps.length) return 'Aucun jour ne tombe dans cette période.';
      if (reps.length > 200) return 'Plus de 200 séances d’un coup : réduisez la période.';
      x = { reps, remplacer: !!v.remplacer };
      return true;
    } });
    if (!v0 || !x) return;
    const dejaLa = new Set((F.representations || []).filter(r => r.jour).map(r => `${r.jour} ${r.heure || ''}`));
    const neuves = x.remplacer ? x.reps : x.reps.filter(r => !dejaLa.has(`${r.jour} ${r.heure || ''}`));
    F.representations = x.remplacer ? neuves : [...(F.representations || []).filter(r => r.jour), ...neuves];
    redessiner();
    annoncer(`${neuves.length} séance${neuves.length > 1 ? 's' : ''} posée${neuves.length > 1 ? 's' : ''} : vérifiez, puis enregistrez.`);
  }
  // les dates choisies, dupliquées décalées (le même jour de la semaine l'an prochain : 364 jours), en option, non publiées
  async function dupliquerVers(ds) {
    let v = null;
    const v0 = await GESTES.formulaire({ titre: `Dupliquer ${ds.length > 1 ? `ces ${ds.length} dates` : 'cette date'} vers…`, sousTitre: 'les mêmes séances, décalées ; le lieu et le spectacle restent', champs: [
      { k: 'decalage', t: 'nombre', l: 'Décalage en jours', valeur: 364, aide: '364 : le même jour de la semaine l’année d’après ; 7 : la semaine suivante ; négatif : avant.', pas: 1 },
      { k: 'statut', t: 'choix', seg: true, l: 'Les copies', choix: [['option', 'En option'], ['confirmee', 'Confirmées']], valeur: 'option' },
      { k: 'visible', t: 'case', l: 'Publiées sur le site', valeur: false },
    ], ok: 'Dupliquer', enregistrer: async x => { const n = Math.round(Number(x.decalage)); if (!Number.isFinite(n) || n === 0) return 'Un décalage en jours, autre que zéro.'; if (Math.abs(n) > 1500) return 'Pas plus de 1 500 jours.'; v = { n, statut: x.statut || 'option', visible: !!x.visible }; return true; } });
    if (!v0 || !v) return;
    const crees = [];
    for (const d of ds) {
      const G = dateVersForm(d); G.id = null; G.saison = null; G.intitule = null; G.statut = v.statut; G.visible = v.visible && PUBLIABLE(G.nature); G.chiffres = Object.fromEntries(CHIFFRES.map(([k]) => [k, '']));
      G.representations = G.representations.map(r => ({ ...r, id: undefined, jour: plusJours(r.jour, v.n), annulee: false }));
      G.debut = plusJours(d.debut, v.n); G.fin = d.fin ? plusJours(d.fin, v.n) : G.debut;
      G.suivi = suiviPourCopie(G.suivi);   // l'organisateur et son contact suivent, pas le contrat ni les notes
      try { const r = await ecrireDate(G, null, { libre: false }); crees.push(r.id); } catch (e) { erreur(e, `Copie impossible : ${jourCourt(d.debut)}`); break; }
    }
    rafraichirListes();
    if (!crees.length) return;
    annoncer(`${crees.length} date${crees.length > 1 ? 's' : ''} créée${crees.length > 1 ? 's' : ''} (${v.statut === 'option' ? 'en option' : 'confirmées'}, décalage ${v.n > 0 ? '+' : ''}${v.n} j).`, { libelle: 'Annuler', delai: 9000, action: async () => {
      for (const id of crees) { const d = E.dates.find(x => x.id === id); if (d) { try { await effacerDate(d); } catch (e) { erreur(e, 'Retour incomplet'); return; } } }
      annoncer('Copies retirées.'); rafraichirListes();
    } });
  }
  if (typeof SELECTION !== 'undefined') SELECTION.ajouterAction('date', { libelle: 'Dupliquer vers…', faire: dupliquerVers });
  // le modèle d'un spectacle (Spectacles → Déroulé type) : ses horaires habituels, enregistrés à part
  function blocModele(el, F) {
    if (!el || !F?.slug) return;
    const m = modele(F.id) || {}, k = cle(F);
    el.innerHTML = `<div class="bloc"><h3>Horaires habituels <span class="aide" style="font-weight:400">— le modèle d’une date de ce spectacle</span></h3>
      <p class="aide">Une nouvelle date de ce spectacle part avec ces heures ; « Série… » dans une fiche les propose. Rien n’est imposé.</p>
      <div class="rangee"><div class="champ"><label for="md-heures">Tout public</label><input type="text" id="md-heures" value="${esc(m.heures || '')}" placeholder="20:30"></div>
      <div class="champ"><label for="md-sco">Scolaire</label><input type="text" id="md-sco" value="${esc(m.heures_scolaire || '')}" placeholder="10:00, 14:30"></div>
      <div class="champ"><label for="md-public">Public par défaut</label><select id="md-public">${[['', 'Selon la date'], ['tout_public', 'Tout public'], ['scolaire', 'Scolaire']].map(([v, l]) => `<option value="${v}"${(m.public || '') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div></div>
      <div class="champ"><label for="md-note">Note</label><input type="text" id="md-note" value="${esc(m.note || '')}" placeholder="Montage la veille, 2 services…"></div>
      <div style="display:flex;gap:8px;align-items:center"><button type="button" class="btn" id="md-enregistrer">Enregistrer le modèle</button><span class="compte" id="md-etat"></span></div></div>`;
    $('#md-enregistrer', el).addEventListener('click', async e => {
      const valeur = { heures: heuresDe($('#md-heures', el).value).join(', '), heures_scolaire: heuresDe($('#md-sco', el).value).join(', '), public: $('#md-public', el).value || null, note: $('#md-note', el).value.trim() || null };
      e.target.disabled = true;
      const { data, error } = await sb.from('crescite_textes').upsert({ cle: k, valeur }, { onConflict: 'cle' }).select().single();
      e.target.disabled = false;
      if (error) return erreur(error, 'Modèle non enregistré');
      const t = E.textes.find(x => x.cle === k); if (t) t.valeur = data?.valeur || valeur; else E.textes.push(data || { cle: k, valeur });
      $('#md-heures', el).value = valeur.heures; $('#md-sco', el).value = valeur.heures_scolaire;
      $('#md-etat', el).textContent = 'Modèle enregistré.'; annoncer('Modèle de date enregistré.');
    });
  }
  return { serie, appliquerModele, modele, blocModele, dupliquerVers, heuresDe };
})();
