'use strict';
/* La corbeille de l'administration : supprimer sans « Êtes-vous sûr ? ». Une suppression se fait tout de suite et
   s'annonce avec « Annuler » (huit secondes) ; ce qui est supprimé reste dans la Corbeille (#/corbeille) pendant trente
   jours : les lignes supprimées que le journal garde (crescite_journal, DELETE), chacune avec « Rétablir » (une date
   revient avec ses séances, son suivi, ses chiffres, son équipe et sa feuille de route). Les retours du journal (le fil
   du tableau de bord, la rubrique Journal) ne demandent plus confirmation non plus : ils s'annoncent avec « Rétablir ».
   Chargé après menus.js : il connaît l'état (E), les outils d'index.html et equipe.js.
   CORBEILLE.supprimer({ quoi, faire, retablir, retabli, echec, apres })  faire() supprime, retablir() remet ; l'annonce porte « Annuler »
   CORBEILLE.ligne({ table, ligne, cle, quoi, retabli, apres })            une ligne de la base effacée, remise telle quelle
   CORBEILLE.inverser(j)                                                    revenir sur une ligne du journal, avec « Rétablir »
   CORBEILLE.retablir(j)                                                    rétablir une ligne supprimée (et ce qui partait avec une date)
   CORBEILLE.entrees()                                                      ce que la corbeille montre : les suppressions des 30 derniers jours */
const CORBEILLE = (() => {
  const JOURS = 30, DELAI = 8000;
  const sans = o => { const x = { ...(o || {}) }; delete x.modifie_le; delete x.modifie_par; return x; };
  const cleDe = table => (typeof TABLES !== 'undefined' && TABLES[table]) || (typeof TABLES_EQUIPE !== 'undefined' && TABLES_EQUIPE[table]) || (typeof TABLES_IDEALE !== 'undefined' && TABLES_IDEALE[table]) || (typeof TABLES_CHIFFRES !== 'undefined' && TABLES_CHIFFRES[table]) || [null, 'id'];
  const surLigne = (q, pk, o) => [].concat(pk).reduce((q2, c) => q2.eq(c, o[c]), q);
  // ce qui part avec une date : ses séances, son suivi, ses chiffres, son équipe, sa feuille (le journal les garde aussi)
  const LIEES = ['crescite_representations', 'crescite_dates_suivi', 'crescite_dates_chiffres', 'crescite_equipes', 'crescite_feuilles'];
  const lieesDe = j => j.table_nom === 'crescite_dates' ? (E.journal || []).filter(x => x.operation === 'DELETE' && LIEES.includes(x.table_nom) && x.avant?.date_id === j.avant?.id) : [];

  async function supprimer({ quoi = 'Supprimé.', faire, retablir, retabli = 'Rétabli.', echec = 'Suppression impossible', apres = null, delai = DELAI } = {}) {
    let r;
    try { r = await faire(); } catch (e) { erreur(e, echec); return false; }
    try { if (apres) apres(r); } catch (e) { console.error(e); }
    if (typeof rafraichirListes === 'function') rafraichirListes();
    annoncer(quoi, { libelle: 'Annuler', delai, action: async () => {
      try { await retablir(r); } catch (e) { erreur(e, 'Rétablissement impossible'); return; }
      annoncer(retabli);
      if (typeof rafraichirListes === 'function') rafraichirListes();
    } });
    return true;
  }
  // une ligne de la base, effacée puis remise telle quelle (sans sa date de modification) ; apres(retablie) touche l'état en mémoire
  function ligne({ table, ligne: o, cle = 'id', quoi, retabli, apres = null, apresRetour = null, echec }) {
    return supprimer({ quoi, retabli, echec, apres,
      faire: async () => { const { error } = await surLigne(sb.from(table).delete(), cle, o); if (error) throw error; return o; },
      retablir: async () => { const { data, error } = await sb.from(table).insert(sans(o)).select().single(); if (error) throw error; try { if (apresRetour) apresRetour(data || o); } catch (e) { console.error(e); } return data; } });
  }
  // revenir sur une ligne du journal (ajout → retirée, modification → comme avant, suppression → rétablie), avec « Rétablir » pour revenir sur le retour
  async function inverser(j, { annonce = 'Annulé : la ligne est revenue comme avant.', apres = null } = {}) {
    const [, pk] = cleDe(j.table_nom);
    const aller = async () => {
      if (j.operation === 'INSERT') return surLigne(sb.from(j.table_nom).delete(), pk, j.apres);
      if (j.operation === 'UPDATE') return surLigne(sb.from(j.table_nom).update(sans(j.avant)), pk, j.avant);
      return retablirLignes(j);
    };
    const retour = async () => {
      if (j.operation === 'INSERT') return sb.from(j.table_nom).insert(sans(j.apres));
      if (j.operation === 'UPDATE') return surLigne(sb.from(j.table_nom).update(sans(j.apres)), pk, j.apres);
      let r = await surLigne(sb.from(j.table_nom).delete(), pk, j.avant);
      return r;
    };
    const r = await aller();
    if (r.error) { erreur(r.error, 'Retour impossible'); return false; }
    await chargerTout();
    try { if (apres) apres(); } catch (e) { console.error(e); }
    if (typeof rafraichirListes === 'function') rafraichirListes();
    annoncer(annonce, { libelle: 'Rétablir', delai: DELAI, action: async () => {
      const r2 = await retour();
      if (r2.error) return erreur(r2.error, 'Rétablissement impossible');
      await chargerTout();
      try { if (apres) apres(); } catch (e) { console.error(e); }
      if (typeof rafraichirListes === 'function') rafraichirListes();
      annoncer('Rétabli.');
    } });
    return true;
  }
  // une ligne supprimée revient (une date : avec ce qui partait avec elle)
  async function retablirLignes(j) {
    let r = await sb.from(j.table_nom).insert(sans(j.avant));
    if (r.error) return r;
    for (const x of lieesDe(j)) { const r2 = await sb.from(x.table_nom).insert(sans(x.avant)); if (r2.error) return r2; }
    return r;
  }
  async function retablir(j) {
    const r = await retablirLignes(j);
    if (r.error) { erreur(r.error, 'Rétablissement impossible'); return false; }
    await chargerTout();
    if (typeof rafraichirListes === 'function') rafraichirListes();
    annoncer('Rétabli.');
    return true;
  }
  // les suppressions des trente derniers jours, les plus récentes d'abord ; une ligne « liée » à une date supprimée s'efface derrière elle
  const entrees = () => {
    const depuis = Date.now() - JOURS * 864e5;
    const xs = (E.journal || []).filter(j => j.operation === 'DELETE' && Date.parse(j.quand) >= depuis);
    const dates = new Set(xs.filter(j => j.table_nom === 'crescite_dates').map(j => j.avant?.id));
    return xs.filter(j => !(LIEES.includes(j.table_nom) && dates.has(j.avant?.date_id)));
  };
  // la rubrique #/corbeille
  async function vue() {
    cadre('journal', `<div class="tete"><h1>Corbeille</h1><span class="compte">Ce qui a été supprimé ces ${JOURS} derniers jours. « Rétablir » le remet en place.</span><a class="btn" href="#/journal">Le journal</a></div>
      <div class="bloc" style="padding:0" data-liste id="l-corbeille"><p class="vide">Chargement…</p></div><p class="j-plus" id="cb-plus"></p>`);
    const zone = $('#l-corbeille');
    const qui = id => { const a = E.admins.find(x => x.user_id === id); return a?.nom || (id ? 'un compte' : 'import'); };
    const quand = t => new Date(t).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
    const dessiner = () => {
      const xs = entrees();
      zone.innerHTML = xs.length ? xs.map(j => `<div class="journal-ligne cb-ligne" data-cb="${j.id}"><span class="j-quand">${esc(quand(j.quand))}</span>
        <span class="j-quoi"><b>${esc(NOMS_TABLES[j.table_nom] || j.table_nom)}</b> · ${esc(resume(j))}${lieesDe(j).length ? `<span class="compte"> · avec ${lieesDe(j).length} ligne${lieesDe(j).length > 1 ? 's' : ''} liée${lieesDe(j).length > 1 ? 's' : ''}</span>` : ''}</span>
        <span class="j-qui">${esc(qui(j.qui))}</span><button type="button" class="btn petit" data-cb-retablir="${j.id}">Rétablir</button></div>`).join('')
        : '<p class="vide">Rien dans la corbeille : rien n’a été supprimé ces trente derniers jours.</p>';
      const fin = E.journalFin || (E.journal.length && Date.parse(E.journal[E.journal.length - 1].quand) < Date.now() - JOURS * 864e5);
      $('#cb-plus').innerHTML = fin ? '' : '<button type="button" class="btn" id="cb-lire">Lire plus ancien</button>';
    };
    zone.rafraichir = async () => { await rechargerJournal(); if (zone.isConnected) dessiner(); };
    await rechargerJournal();
    if (!zone.isConnected) return;
    dessiner();
    $('#cb-plus').addEventListener('click', async e => {
      const b = e.target.closest('#cb-lire'); if (!b) return;
      b.disabled = true; b.textContent = 'Lecture…';
      try { await journalPlusAncien(); dessiner(); } catch (err) { erreur(err, 'Lecture impossible'); b.disabled = false; }
    });
    zone.addEventListener('click', async e => {
      const b = e.target.closest('[data-cb-retablir]'); if (!b) return;
      const j = E.journal.find(x => x.id === +b.dataset.cbRetablir); if (!j) return;
      b.disabled = true; b.textContent = 'Rétablissement…';
      if (await retablir(j)) { await rechargerJournal(); dessiner(); } else { b.disabled = false; b.textContent = 'Rétablir'; }
    });
  }
  if (typeof ROUTES !== 'undefined') ROUTES.unshift([/^#\/corbeille$/, () => vue()]);
  const style = document.createElement('style');
  style.textContent = `.cb-ligne { grid-template-columns: 150px 1fr auto auto; align-items: center; }
@media (max-width: 700px) { .cb-ligne { grid-template-columns: 1fr auto; } .cb-ligne .j-quand { grid-column: 1 / -1; } }`;
  document.head.append(style);
  return { supprimer, ligne, inverser, retablir, entrees, vue, JOURS };
})();
