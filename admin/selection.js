'use strict';
/* La sélection multiple et les actions groupées : Maj+clic sur une ligne (ou « Sélectionner » dans les filtres, ou la
   barre d'espace sur une ligne au clavier), puis une barre flottante en bas de l'écran. Les dates (la liste) : changer le
   statut, publier ou masquer sur le site, écrire aux contacts, exporter en CSV, supprimer (avec « Annuler ») ; les
   personnes : écrire à toutes, publier ou masquer la fiche, exporter ; les lieux : écrire aux contacts, exporter,
   supprimer ceux sans date ; les pistes du Kanban : les passer à une étape, noter la relance, supprimer ; les notes de
   frais : valider, refuser, marquer remboursées, exporter. Chaque action groupée s'annonce avec « Annuler » (les statuts
   d'avant reviennent). La sélection tient quand la liste se redessine (le temps réel, un enregistrement) et s'oublie en
   changeant de page. Échap la quitte. D'autres modules ajoutent leurs actions (SELECTION.ajouterAction : séries.js,
   modeles.js). Chargé après corbeille.js et tiroir.js.
   SELECTION.genre()  SELECTION.ids()  SELECTION.vider()  SELECTION.ajouterAction(genre, { libelle, faire(objets, ids), dispo }) */
const SELECTION = (() => {
  const S = { genre: null, ids: new Set(), mode: false };
  const csvLigne = xs => xs.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
  function telecharger(nom, lignes) {
    const blob = new Blob(['﻿' + lignes.map(csvLigne).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const mels = textes => [...new Set(textes.flatMap(t => jetonsContact(t || '').filter(j => j.genre === 'mel').map(j => j.t)))];
  const ecrireA = (adresses, quoi) => { if (!adresses.length) return annoncer(`Aucune adresse électronique dans ${quoi}.`, { erreur: true }); location.href = `mailto:?bcc=${encodeURIComponent(adresses.join(','))}`; };
  const heures = d => repsDe(d.id).map(r => r.heure ? AGENDA.heureTexte(h5(r.heure)) : 'heure ?').join(', ');
  // une écriture groupée, annulable : avant() garde ce qui change, ecrire() l'écrit, retour() le remet ; apres() touche l'état
  async function groupee({ quoi, ecrire, retour, apres, retabli = 'Rétabli.' }) {
    try { await ecrire(); } catch (e) { return erreur(e, 'Action impossible'); }
    try { apres(); } catch (e) { console.error(e); }
    vider();
    annoncer(quoi, { libelle: 'Annuler', delai: 8000, action: async () => { try { await retour(); } catch (e) { return erreur(e, 'Retour impossible'); } annoncer(retabli); redessiner(); } });
    redessiner();
  }
  const redessiner = () => { if (location.hash === '#/diffusion' && typeof vueDiffusion === 'function') vueDiffusion(); else if (location.hash === '#/equipe/frais' && typeof vueEquipe === 'function') vueEquipe('frais'); else rafraichirListes(); };
  // un champ changé sur plusieurs lignes d'une table, puis remis ligne par ligne
  const changerChamp = ({ table, objets, champ, valeur, quoi, apresChacun = null, retabli }) => {
    const avant = objets.map(o => [o.id, o[champ]]);
    return groupee({ quoi, retabli,
      ecrire: async () => { const { error } = await sb.from(table).update({ [champ]: valeur }).in('id', objets.map(o => o.id)); if (error) throw error; },
      retour: async () => { for (const [id, v] of avant) { const { error } = await sb.from(table).update({ [champ]: v }).eq('id', id); if (error) throw error; const o = objets.find(x => x.id === id); if (o) o[champ] = v; } },
      apres: () => objets.forEach(o => { o[champ] = valeur; if (apresChacun) apresChacun(o); }) });
  };
  const choisir = (titre, choix, valeur) => GESTES.formulaire({ titre, champs: [{ k: 'v', t: 'choix', seg: true, l: '', choix, valeur }], ok: 'Appliquer', enregistrer: async x => x }).then(x => (x ? x.v : null));
  const pl = (n, mot, f = `${mot}s`) => `${n} ${n > 1 ? f : mot}`;

  const GENRES = {
    date: { sel: '[data-liste] a.ligne[href^="#/representations/"]', id: el => +el.getAttribute('href').split('/').pop(), objets: ids => E.dates.filter(d => ids.has(d.id)), nom: n => pl(n, 'date'),
      actions: [
        { libelle: 'Statut…', faire: async ds => { const v = await choisir('Le statut de ces dates', [['option', 'Option'], ['confirmee', 'Confirmée'], ['annulee', 'Annulée'], ['reportee', 'Reportée']], ds[0].statut); if (!v) return;
          await changerChamp({ table: 'crescite_dates', objets: ds, champ: 'statut', valeur: v, quoi: `${pl(ds.length, 'date')} : statut « ${{ option: 'option', confirmee: 'confirmée', annulee: 'annulée', reportee: 'reportée' }[v]} ».`, retabli: 'Les statuts d’avant sont revenus.' }); } },
        { libelle: 'Publier', faire: ds => { const ps = ds.filter(d => PUBLIABLE(d.nature)), reste = ds.length - ps.length; return changerChamp({ table: 'crescite_dates', objets: ps, champ: 'visible', valeur: true, quoi: `${pl(ps.length, 'date')} publiée${ps.length > 1 ? 's' : ''} sur le site${reste ? ` (${pl(reste, 'répétition')} ne se publie${reste > 1 ? 'nt' : ''} pas)` : ''}.`, retabli: 'Comme avant.' }); } },
        { libelle: 'Masquer', faire: ds => changerChamp({ table: 'crescite_dates', objets: ds, champ: 'visible', valeur: false, quoi: `${pl(ds.length, 'date')} masquée${ds.length > 1 ? 's' : ''} sur le site.`, retabli: 'Comme avant.' }) },
        { libelle: 'Écrire aux contacts', faire: ds => ecrireA(mels(ds.flatMap(d => [E.suivis.find(x => x.date_id === d.id)?.contact, E.lieuxSuivi.find(x => x.lieu_id === d.lieu_id)?.contact])), 'le suivi de ces dates ni leurs lieux') },
        { libelle: 'Exporter CSV', faire: ds => telecharger('dates.csv', [['Jour', 'Fin', 'Spectacle', 'Lieu', 'Commune', 'Département', 'Statut', 'Public', 'Horaires', 'Contrat', 'Organisateur', 'Contact'],
          ...ds.map(d => { const l = lieu(d.lieu_id), su = E.suivis.find(x => x.date_id === d.id) || {}; return [d.debut, d.fin || '', spectacle(d.spectacle_id)?.titre || '', l?.nom || '', l?.commune || '', l?.departement || '', d.statut, d.public, heures(d), su.contrat || '', su.organisateur || '', su.contact || '']; })]) },
        { libelle: 'Supprimer', danger: true, faire: async ds => {
          const retours = [];
          for (const d of ds) { try { retours.push(await effacerDate(d)); } catch (e) { erreur(e, `Suppression impossible : ${jourCourt(d.debut)}`); break; } }
          vider(); rafraichirListes();
          if (retours.length) annoncer(`${pl(retours.length, 'date')} supprimée${retours.length > 1 ? 's' : ''}, avec leurs séances et leurs feuilles.`, { libelle: 'Annuler', delai: 9000, action: async () => { for (const r of retours) { try { await r(); } catch (e) { erreur(e, 'Rétablissement incomplet'); return; } } annoncer('Dates rétablies.'); rafraichirListes(); } });
        } },
      ] },
    personne: { sel: '[data-liste] a.ligne[href^="#/equipe/"]', id: el => +el.getAttribute('href').split('/').pop(), objets: ids => E.personnes.filter(p => ids.has(p.id)), nom: n => pl(n, 'personne'),
      actions: [
        { libelle: 'Écrire à toutes', faire: ps => ecrireA([...new Set(ps.map(p => (priveeDe(p.id)?.email || '').trim()).filter(Boolean))], 'ces fiches') },
        { libelle: 'Publier la fiche', faire: ps => changerChamp({ table: 'crescite_personnes', objets: ps, champ: 'publie', valeur: true, quoi: `${pl(ps.length, 'fiche')} publiée${ps.length > 1 ? 's' : ''}.`, retabli: 'Comme avant.' }) },
        { libelle: 'Masquer la fiche', faire: ps => changerChamp({ table: 'crescite_personnes', objets: ps, champ: 'publie', valeur: false, quoi: `${pl(ps.length, 'fiche')} masquée${ps.length > 1 ? 's' : ''}.`, retabli: 'Comme avant.' }) },
        { libelle: 'Exporter CSV', faire: ps => telecharger('equipe.csv', [['Prénom', 'Nom', 'Métiers', 'Adresse électronique', 'Téléphone', 'Ville', 'Spectacles'],
          ...ps.map(p => { const pr = priveeDe(p.id) || {}; return [p.prenom || '', p.nom || '', (p.metiers || []).join(', '), pr.email || '', pr.telephone || '', pr.ville || '', [...new Set(E.distributions.filter(x => x.personne_id === p.id).map(x => spectacle(x.spectacle_id)?.titre).filter(Boolean))].join(', ')]; })]) },
      ] },
    lieu: { sel: '[data-liste] a.ligne[href^="#/lieux/"]', id: el => +el.getAttribute('href').split('/').pop(), objets: ids => E.lieux.filter(l => ids.has(l.id)), nom: n => pl(n, 'lieu', 'lieux'),
      actions: [
        { libelle: 'Écrire aux contacts', faire: ls => ecrireA(mels(ls.map(l => E.lieuxSuivi.find(x => x.lieu_id === l.id)?.contact)), 'le suivi de ces lieux') },
        { libelle: 'Exporter CSV', faire: ls => telecharger('lieux.csv', [['Nom', 'Type', 'Commune', 'Département', 'Adresse', 'Contact', 'Jauge', 'Plateau', 'Dates'],
          ...ls.map(l => { const su = E.lieuxSuivi.find(x => x.lieu_id === l.id) || {}; return [l.nom || '', l.type, l.commune, l.departement, l.adresse || '', su.contact || '', su.jauge ?? '', su.plateau || '', E.dates.filter(d => d.lieu_id === l.id).length]; })]) },
        { libelle: 'Supprimer (sans date)', danger: true, faire: async ls => {
          const libres = ls.filter(l => !E.dates.some(d => d.lieu_id === l.id) && !E.seances.some(s => s.lieu_id === l.id)), gardes = ls.length - libres.length;
          if (!libres.length) return annoncer('Ces lieux ont des dates : fusionnez-les plutôt, depuis leur fiche.', { erreur: true });
          await groupee({ quoi: `${pl(libres.length, 'lieu', 'lieux')} supprimé${libres.length > 1 ? 's' : ''}${gardes ? ` ; ${pl(gardes, 'lieu', 'lieux')} avec des dates gardé${gardes > 1 ? 's' : ''}` : ''}.`, retabli: 'Lieux rétablis.',
            ecrire: async () => { const { error } = await sb.from('crescite_lieux').delete().in('id', libres.map(l => l.id)); if (error) throw error; },
            retour: async () => { const { error } = await sb.from('crescite_lieux').insert(libres.map(sansMeta)); if (error) throw error; E.lieux.push(...libres); },
            apres: () => { const ids = new Set(libres.map(l => l.id)); E.lieux = E.lieux.filter(l => !ids.has(l.id)); } });
        } },
      ] },
    piste: { sel: '#kanban-zone .crm-carte[data-prospect-id]', id: el => +el.dataset.prospectId, objets: ids => (E.prospects || []).filter(p => ids.has(p.id)), nom: n => pl(n, 'piste'),
      actions: [
        { libelle: 'Étape…', faire: async ps => { const v = await choisir('Passer ces pistes à l’étape', ETAPES_CRM.map(([k, l]) => [k, l.replace(/^\d\.\s*/, '')]), ps[0].etape); if (!v) return;
          await changerChamp({ table: 'crescite_diffusion_prospects', objets: ps, champ: 'etape', valeur: v, quoi: `${pl(ps.length, 'piste')} à l’étape « ${(ETAPES_CRM.find(e => e[0] === v) || [])[1] || v} ».`, retabli: 'Les étapes d’avant sont revenues.' }); } },
        { libelle: 'Relance faite', faire: async ps => { const auj = aujourdhui(), avant = ps.map(p => [p.id, p.date_dernier_contact, p.date_prochaine_relance]);
          await groupee({ quoi: `Relance notée pour ${pl(ps.length, 'piste')} : prochaine dans 7 jours.`, retabli: 'Comme avant.',
            ecrire: async () => { const { error } = await sb.from('crescite_diffusion_prospects').update({ date_dernier_contact: auj, date_prochaine_relance: plusJours(auj, 7) }).in('id', ps.map(p => p.id)); if (error) throw error; },
            retour: async () => { for (const [id, a, b] of avant) { const { error } = await sb.from('crescite_diffusion_prospects').update({ date_dernier_contact: a, date_prochaine_relance: b }).eq('id', id); if (error) throw error; const p = ps.find(x => x.id === id); if (p) Object.assign(p, { date_dernier_contact: a, date_prochaine_relance: b }); } },
            apres: () => ps.forEach(p => Object.assign(p, { date_dernier_contact: auj, date_prochaine_relance: plusJours(auj, 7) })) }); } },
        { libelle: 'Supprimer', danger: true, faire: ps => groupee({ quoi: `${pl(ps.length, 'piste')} supprimée${ps.length > 1 ? 's' : ''} du pipeline.`, retabli: 'Pistes rétablies.',
          ecrire: async () => { const { error } = await sb.from('crescite_diffusion_prospects').delete().in('id', ps.map(p => p.id)); if (error) throw error; },
          retour: async () => { const { error } = await sb.from('crescite_diffusion_prospects').insert(ps.map(sansMeta)); if (error) throw error; E.prospects.push(...ps); },
          apres: () => { const ids = new Set(ps.map(p => p.id)); E.prospects = E.prospects.filter(p => !ids.has(p.id)); } }) },
      ] },
    frais: { sel: '#table-frais tr[data-frais-id]', id: el => +el.dataset.fraisId, objets: ids => (E.frais || []).filter(f => ids.has(f.id)), nom: n => pl(n, 'note de frais', 'notes de frais'),
      actions: [
        { libelle: 'Valider', faire: fs => { const xs = fs.filter(f => f.statut === 'en_attente'); if (!xs.length) return annoncer('Rien à valider dans la sélection.', { erreur: true }); const quand = new Date().toISOString();
          return groupee({ quoi: `${pl(xs.length, 'note de frais', 'notes de frais')} validée${xs.length > 1 ? 's' : ''}.`, retabli: 'De nouveau en attente.',
            ecrire: async () => { const { error } = await sb.from('crescite_notes_frais').update({ statut: 'valide', valide_le: quand, valide_par: E.session.user.id }).in('id', xs.map(f => f.id)); if (error) throw error; },
            retour: async () => { const { error } = await sb.from('crescite_notes_frais').update({ statut: 'en_attente', valide_le: null, valide_par: null }).in('id', xs.map(f => f.id)); if (error) throw error; xs.forEach(f => { f.statut = 'en_attente'; f.valide_le = null; }); },
            apres: () => xs.forEach(f => { f.statut = 'valide'; f.valide_le = quand; }) }); } },
        { libelle: 'Refuser', danger: true, faire: fs => { const xs = fs.filter(f => f.statut === 'en_attente'); if (!xs.length) return annoncer('Rien à refuser dans la sélection.', { erreur: true });
          return changerChamp({ table: 'crescite_notes_frais', objets: xs, champ: 'statut', valeur: 'refuse', quoi: `${pl(xs.length, 'note de frais', 'notes de frais')} refusée${xs.length > 1 ? 's' : ''}.`, retabli: 'De nouveau en attente.' }); } },
        { libelle: 'Marquer remboursées', faire: fs => { const xs = fs.filter(f => f.statut === 'valide'); if (!xs.length) return annoncer('Rien de validé à rembourser dans la sélection.', { erreur: true }); const quand = new Date().toISOString();
          return groupee({ quoi: `${pl(xs.length, 'note de frais', 'notes de frais')} marquée${xs.length > 1 ? 's' : ''} remboursée${xs.length > 1 ? 's' : ''}.`, retabli: 'De nouveau validées, à rembourser.',
            ecrire: async () => { const { error } = await sb.from('crescite_notes_frais').update({ statut: 'rembourse', rembourse_le: quand }).in('id', xs.map(f => f.id)); if (error) throw error; },
            retour: async () => { const { error } = await sb.from('crescite_notes_frais').update({ statut: 'valide', rembourse_le: null }).in('id', xs.map(f => f.id)); if (error) throw error; xs.forEach(f => { f.statut = 'valide'; f.rembourse_le = null; }); },
            apres: () => xs.forEach(f => { f.statut = 'rembourse'; f.rembourse_le = quand; }) }); } },
        { libelle: 'Exporter CSV', faire: fs => telecharger('notes-de-frais.csv', [['Date', 'Personne', 'Catégorie', 'Montant TTC', 'Statut', 'Spectacle', 'Commentaire'],
          ...fs.map(f => { const p = personne(f.personne_id), d = f.date_id ? E.dates.find(x => x.id === f.date_id) : null; return [f.date_depense || (f.cree_le || '').slice(0, 10), p ? nomDe(p) : '', CAT_FRAIS[f.categorie] || f.categorie || '', String(Number(f.montant_ttc) || 0).replace('.', ','), f.statut, d ? spectacle(d.spectacle_id)?.titre || '' : '', f.commentaire || '']; })]) },
      ] },
  };
  const genreDe = el => Object.keys(GENRES).find(g => el.matches(GENRES[g].sel)) || null;
  const lignes = g => (g ? $$(GENRES[g].sel) : []);
  function ajouterAction(genre, action) { if (GENRES[genre]) GENRES[genre].actions.push(action); }

  function basculer(el, g) {
    const id = GENRES[g].id(el);
    if (S.genre !== g) { S.genre = g; S.ids.clear(); }
    if (S.ids.has(id)) S.ids.delete(id); else S.ids.add(id);
    S.mode = true;
    marquer(); barre();
  }
  function tout() { const g = S.genre || Object.keys(GENRES).find(k => lignes(k).length); if (!g) return; S.genre = g; lignes(g).forEach(el => S.ids.add(GENRES[g].id(el))); S.mode = true; marquer(); barre(); }
  function vider() { S.ids.clear(); S.genre = null; S.mode = false; marquer(); barre(); }
  function marquer() {
    document.documentElement.classList.toggle('sel-mode', S.mode);
    Object.keys(GENRES).forEach(g => lignes(g).forEach(el => { const on = S.genre === g && S.ids.has(GENRES[g].id(el)); el.classList.toggle('sel-on', on); if (S.mode) el.setAttribute('aria-selected', String(on)); else el.removeAttribute('aria-selected'); }));
  }
  function barre() {
    let b = $('#sel-barre');
    if (!S.mode) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'sel-barre'; b.className = 'sel-barre'; b.setAttribute('role', 'toolbar'); b.setAttribute('aria-label', 'Sélection'); document.body.append(b); }
    const g = S.genre, n = S.ids.size, G = g ? GENRES[g] : null;
    b.innerHTML = `<span class="sel-compte">${n ? esc(G.nom(n)) : 'Choisissez des lignes'}</span><button type="button" class="btn petit" data-sel-tout>Tout</button><button type="button" class="btn petit" data-sel-aucun${n ? '' : ' disabled'}>Aucun</button>
      <span class="sel-actions">${n ? G.actions.filter(a => !a.dispo || a.dispo()).map((a, i) => `<button type="button" class="btn petit${a.danger ? ' danger' : ''}" data-sel-action="${i}">${esc(a.libelle)}</button>`).join('') : ''}</span>
      <button type="button" class="btn petit" data-sel-fermer aria-label="Quitter la sélection" title="Quitter la sélection (Échap)">✕</button>`;
  }
  // les boutons « Sélectionner » des listes, et les marques, remis à chaque redessin
  let poserPlusTard = null;
  function poser() {
    const cibles = [['#l-dates', '.filtres'], ['#l-equipe', '.filtres'], ['#l-lieux', '.filtres'], ['#kanban-zone', '.tete'], ['#table-frais', '.bloc > div']];
    for (const [liste, filtres] of cibles) {
      const l = $(liste); if (!l) continue;
      const f = l.closest('main')?.querySelector(filtres) || l.parentElement?.querySelector(filtres); if (!f || $('.sel-bouton', f)) continue;
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn petit sel-bouton'; btn.textContent = 'Sélectionner'; btn.title = 'Choisir plusieurs lignes (ou Maj+clic)';
      btn.addEventListener('click', () => { if (S.mode) vider(); else { S.mode = true; S.genre = Object.keys(GENRES).find(k => lignes(k).length) || null; marquer(); barre(); } });
      f.append(btn);
    }
    if (S.mode && !lignes(S.genre).length && !Object.keys(GENRES).some(k => lignes(k).length)) { vider(); return; }
    marquer();
  }
  new MutationObserver(() => { clearTimeout(poserPlusTard); poserPlusTard = setTimeout(poser, 60); }).observe(document.body, { childList: true, subtree: true });
  // Maj+clic choisit une ligne ; en mode sélection, le clic aussi ; la barre d'espace au clavier
  document.addEventListener('click', e => {
    const el = e.target.closest(Object.values(GENRES).map(x => x.sel).join(', ')); if (!el) return;
    const g = genreDe(el); if (!g) return;
    if (!(e.shiftKey || (S.mode && S.genre === g))) return;
    if (e.target.closest('button, input, select, [data-crm-editer], [data-crm-email]') && !e.shiftKey) return;
    e.preventDefault(); e.stopPropagation();
    basculer(el, g);
  }, true);
  document.addEventListener('keydown', e => {
    if (e.key === ' ' && S.mode && e.target.matches && e.target.matches(Object.values(GENRES).map(x => x.sel).join(', '))) { const g = genreDe(e.target); if (g) { e.preventDefault(); basculer(e.target, g); } }
    if (e.key === 'Escape' && S.mode && !(typeof TIROIR !== 'undefined' && TIROIR.ouvert()) && !document.querySelector('.gf, dialog[open]')) { e.preventDefault(); vider(); }
  });
  document.addEventListener('click', async e => {
    const b = e.target.closest('#sel-barre button'); if (!b) return;
    if (b.hasAttribute('data-sel-tout')) return tout();
    if (b.hasAttribute('data-sel-aucun')) { S.ids.clear(); marquer(); barre(); return; }
    if (b.hasAttribute('data-sel-fermer')) return vider();
    const a = GENRES[S.genre]?.actions.filter(x => !x.dispo || x.dispo())[+b.dataset.selAction]; if (!a) return;
    const objets = GENRES[S.genre].objets(S.ids); if (!objets.length) return;
    $$('#sel-barre button').forEach(x => { x.disabled = true; });
    try { await a.faire(objets, [...S.ids]); } catch (err) { erreur(err, 'Action impossible'); } finally { if ($('#sel-barre')) barre(); }
  });
  window.addEventListener('hashchange', () => { if (S.mode) vider(); });
  const style = document.createElement('style');
  style.textContent = `
.sel-barre { position: fixed; left: 50%; bottom: 18px; z-index: 55; transform: translateX(-50%); display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px; max-width: calc(100vw - 24px); padding: 8px 10px; border-radius: 14px; background: var(--carte); border: 1px solid var(--trait); box-shadow: 0 14px 40px -12px rgba(0, 0, 0, .35); }
.sel-barre .sel-compte { font-weight: 800; padding: 0 6px; }
.sel-barre .sel-actions { display: flex; flex-wrap: wrap; gap: 6px; padding-left: 6px; border-left: 1px solid var(--trait); }
.sel-barre .sel-actions:empty { display: none; }
html.sel-mode [data-liste] a.ligne, html.sel-mode #kanban-zone .crm-carte, html.sel-mode #table-frais tr[data-frais-id] { cursor: cell; }
html.sel-mode [data-liste] a.ligne::after, html.sel-mode #kanban-zone .crm-carte::after { content: ''; position: absolute; top: 10px; right: 10px; width: 18px; height: 18px; border-radius: 5px; border: 2px solid var(--gris); background: var(--carte); }
html.sel-mode [data-liste] a.ligne, html.sel-mode #kanban-zone .crm-carte { position: relative; padding-right: 36px; }
html.sel-mode .sel-on::after { background: var(--accent) !important; border-color: var(--accent) !important; box-shadow: inset 0 0 0 3px var(--carte); }
.sel-on { outline: 2px solid var(--accent); outline-offset: 1px; background: color-mix(in srgb, var(--accent) 8%, var(--carte)) !important; }
#table-frais tr.sel-on td { background: color-mix(in srgb, var(--accent) 10%, var(--carte)); }
.sel-bouton { margin-left: auto; }
.filtres .sel-bouton { justify-self: end; }
@media (max-width: 640px) { .sel-barre { bottom: 74px; } .sel-barre .sel-actions { border-left: 0; padding-left: 0; } }`;
  document.head.append(style);
  return { genre: () => S.genre, ids: () => [...S.ids], vider, ajouterAction, tout, mode: () => S.mode };
})();
