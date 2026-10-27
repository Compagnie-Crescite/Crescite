'use strict';
/* Le carnet des lieux : les contacts (direction, régie, accueil des compagnies…) et les hébergements près de chaque lieu
   (supabase/migrations/20261110_crescite_carnet.sql ; sans le script, le bloc le dit). Lus avec le reste (E.contacts,
   E.hebergements ; E.carnetInstalle), écoutés en direct, au journal, à la corbeille. Un contact « sur la feuille de
   route » s'écrit dans la rubrique « Adresses et contacts » des feuilles des dates de ce lieu ; un hébergement se
   propose comme rubrique Hébergement (feuille.js : sources.carnet). Jamais publié. Chargé après corbeille.js.
   CARNET.charger()            lit les deux tables ; faux sans le script
   CARNET.bloc(el, lieuId)     le bloc de la fiche du lieu
   CARNET.contacts(lieuId)     CARNET.hebergements(lieuId)     dans l'ordre
   CARNET.pourFeuille(d)       { contacts (sur la feuille), hebergements (du lieu, puis de la même commune) } */
const CARNET = (() => {
  const GENRES = [['hotel', 'Hôtel'], ['gite', 'Gîte'], ['habitant', 'Chez l’habitant'], ['autre', 'Autre']];
  const genreLib = g => (GENRES.find(x => x[0] === g) || GENRES[3])[1];
  const trier = xs => xs.slice().sort((a, b) => (a.ordre ?? 100) - (b.ordre ?? 100) || a.id - b.id);
  const contacts = id => trier((E.contacts || []).filter(x => x.lieu_id === id));
  const hebergements = id => trier((E.hebergements || []).filter(x => x.lieu_id === id));
  const vide = v => (v == null || String(v).trim() === '' ? null : String(v).trim());
  async function charger() {
    const [c, h] = await Promise.all(['crescite_contacts', 'crescite_hebergements'].map(t => tout(t, 'id').then(x => x, () => null)));
    E.carnetInstalle = !!(c && h); E.contacts = c || []; E.hebergements = h || [];
    return E.carnetInstalle;
  }
  // pour la feuille de route d'une date : les contacts du lieu à y écrire ; les hébergements du lieu, puis ceux des autres
  // lieux de la même commune
  function pourFeuille(d) {
    const l = lieu(d.lieu_id);
    if (!l || !E.carnetInstalle) return { contacts: [], hebergements: [] };
    const commune = norm(l.commune || '');
    const autres = trier((E.hebergements || []).filter(x => x.lieu_id !== l.id && commune && norm(lieu(x.lieu_id)?.commune || '') === commune));
    return { contacts: contacts(l.id).filter(c => c.sur_feuille), hebergements: [...hebergements(l.id), ...autres].map(x => ({ ...x, memeLieu: x.lieu_id === l.id, lieu: lieu(x.lieu_id) || null })) };
  }

  const CHAMPS_CONTACT = c => [
    { k: 'nom', l: 'Nom', valeur: c.nom, requis: true, ph: 'Claire Martin' },
    { k: 'role', l: 'Rôle', valeur: c.role, ph: 'Régie générale, direction, accueil…' },
    { k: 'telephone', t: 'tel', l: 'Téléphone', valeur: c.telephone },
    { k: 'email', t: 'mel', l: 'Courriel', valeur: c.email },
    { k: 'sur_feuille', t: 'case', l: 'L’écrire dans les feuilles de route des dates de ce lieu', valeur: !!c.sur_feuille },
    { k: 'notes', t: 'long', l: 'Notes', valeur: c.notes, lignes: 2, ph: 'joignable le matin, préfère les SMS…' }];
  const CHAMPS_HEB = h => [
    { k: 'nom', l: 'Nom', valeur: h.nom, requis: true, ph: 'Hôtel de la Gare' },
    { k: 'genre', t: 'choix', seg: true, l: 'Genre', valeur: h.genre || 'hotel', choix: GENRES },
    { k: 'adresse', l: 'Adresse', valeur: h.adresse, large: true },
    { k: 'commune', l: 'Commune', valeur: h.commune },
    { k: 'telephone', t: 'tel', l: 'Téléphone', valeur: h.telephone },
    { k: 'email', t: 'mel', l: 'Courriel', valeur: h.email },
    { k: 'site_web', t: 'url', l: 'Site', valeur: h.site_web },
    { k: 'prix', l: 'Prix', valeur: h.prix, ph: '72 € la chambre, petit-déjeuner compris' },
    { k: 'details', t: 'long', l: 'À savoir', valeur: h.details, lignes: 2, ph: 'accueil jusqu’à 22 h, parking, boîte à clés…' }];
  const QUOI = {
    contact: { table: 'crescite_contacts', coll: 'contacts', champs: CHAMPS_CONTACT, titre: x => (x.id ? `Contact : ${x.nom}` : 'Nouveau contact'), lignes: v => ({ nom: v.nom.trim(), role: vide(v.role), telephone: vide(v.telephone), email: vide(v.email), sur_feuille: !!v.sur_feuille, notes: vide(v.notes) }) },
    heb: { table: 'crescite_hebergements', coll: 'hebergements', champs: CHAMPS_HEB, titre: x => (x.id ? `Hébergement : ${x.nom}` : 'Nouvel hébergement'), lignes: v => ({ nom: v.nom.trim(), genre: v.genre || 'hotel', adresse: vide(v.adresse), commune: vide(v.commune), telephone: vide(v.telephone), email: vide(v.email), site_web: vide(v.site_web), prix: vide(v.prix), details: vide(v.details) }) },
  };
  const tel = t => (t ? `<a href="tel:${esc(String(t).replace(/[^\d+]/g, ''))}">${esc(t)}</a>` : '');
  const mel = m => (m ? `<a href="mailto:${esc(m)}">${esc(m)}</a>` : '');
  const ligneContact = c => `<li class="cn-l"><div><b>${esc(c.nom)}</b>${c.role ? ` <span class="compte">${esc(c.role)}</span>` : ''}${c.sur_feuille ? ' <span class="badge ok" title="Écrit dans les feuilles de route des dates de ce lieu">sur la feuille</span>' : ''}
      <div class="cn-coord">${[tel(c.telephone), mel(c.email)].filter(Boolean).join(' · ') || '<span class="aide">ni téléphone ni courriel</span>'}</div>${c.notes ? `<div class="aide">${esc(c.notes)}</div>` : ''}</div>
    <button type="button" class="btn petit" data-cn="contact" data-id="${c.id}" aria-label="Modifier ${esc(c.nom)}">✎</button></li>`;
  const ligneHeb = h => `<li class="cn-l"><div><b>${esc(h.nom)}</b> <span class="compte">${esc(genreLib(h.genre))}</span>${h.prix ? ` <span class="compte">· ${esc(h.prix)}</span>` : ''}
      <div class="cn-coord">${[[h.adresse, h.commune].filter(Boolean).map(esc).join(', '), tel(h.telephone), mel(h.email), h.site_web ? `<a href="${esc(h.site_web)}" target="_blank" rel="noopener">site ↗</a>` : ''].filter(Boolean).join(' · ')}</div>${h.details ? `<div class="aide">${esc(h.details)}</div>` : ''}</div>
    <button type="button" class="btn petit" data-cn="heb" data-id="${h.id}" aria-label="Modifier ${esc(h.nom)}">✎</button></li>`;

  function bloc(el, lieuId) {
    if (!el) return;
    const dessiner = () => {
      if (!E.carnetInstalle) { el.innerHTML = `<h3>Carnet</h3><p class="aide">Le carnet du lieu (ses contacts, les hébergements à côté) n’est pas encore installé : exécutez <code>supabase/migrations/20261110_crescite_carnet.sql</code> dans Supabase (SQL Editor), puis rechargez cette page.</p>`; return; }
      const cs = contacts(lieuId), hs = hebergements(lieuId);
      el.innerHTML = `<h3>Carnet <span class="aide" style="font-weight:400">— jamais publié ; la feuille de route en reprend ce que vous cochez</span></h3>
        <div class="cn-cols"><section aria-labelledby="cn-t-c"><h4 id="cn-t-c">Contacts <span class="compte">${cs.length || ''}</span></h4>${cs.length ? `<ul class="cn-liste">${cs.map(ligneContact).join('')}</ul>` : '<p class="aide">Personne encore : la direction, la régie, l’accueil des compagnies…</p>'}
          <button type="button" class="btn petit" data-cn="contact">＋ Contact</button></section>
        <section aria-labelledby="cn-t-h"><h4 id="cn-t-h">Hébergements <span class="compte">${hs.length || ''}</span></h4>${hs.length ? `<ul class="cn-liste">${hs.map(ligneHeb).join('')}</ul>` : '<p class="aide">Aucun : l’hôtel où l’équipe dort quand elle joue ici. La feuille de route le proposera.</p>'}
          <button type="button" class="btn petit" data-cn="heb">＋ Hébergement</button></section></div>`;
    };
    dessiner();
    el.addEventListener('click', async e => {
      const b = e.target.closest('[data-cn]'); if (!b) return;
      const q = QUOI[b.dataset.cn], coll = () => E[q.coll], x = b.dataset.id ? coll().find(y => y.id === +b.dataset.id) : null;
      if (b.dataset.id && !x) return;
      const o = x || { lieu_id: lieuId };
      const v = await GESTES.formulaire({ titre: q.titre(o), sousTitre: lieuTexte(lieu(lieuId)), champs: q.champs(o), ok: x ? 'Enregistrer' : 'Ajouter',
        danger: x ? { libelle: 'Supprimer', faire: () => CORBEILLE.ligne({ table: q.table, ligne: x, quoi: `${x.nom} : retiré du carnet.`, retabli: `${x.nom} : rétabli.`,
          apres: () => { E[q.coll] = coll().filter(y => y.id !== x.id); dessiner(); }, apresRetour: r => { E[q.coll] = coll().concat([r]); dessiner(); } }) } : null,
        enregistrer: async v => (String(v.nom || '').trim() ? v : 'Un nom.') });
      if (!v) return;
      const ligne = q.lignes(v);
      const r = x ? await sb.from(q.table).update(ligne).eq('id', x.id).select().single()
        : await sb.from(q.table).insert({ ...ligne, lieu_id: lieuId, ordre: Math.max(0, ...coll().filter(y => y.lieu_id === lieuId).map(y => y.ordre || 0)) + 10 }).select().single();
      if (r.error) return erreur(r.error, 'Carnet non enregistré');
      E[q.coll] = coll().filter(y => y.id !== r.data.id).concat([r.data]);
      dessiner(); annoncer(x ? `${r.data.nom} : enregistré.` : `${r.data.nom} : ajouté au carnet du lieu.`);
    });
  }

  const style = document.createElement('style');
  style.textContent = `
#li-carnet code { overflow-wrap: anywhere; }
.cn-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px 24px; }
.cn-cols h4 { margin: 0 0 6px; font-size: 14px; }
.cn-liste { list-style: none; margin: 0 0 8px; padding: 0; display: grid; gap: 6px; }
.cn-l { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: start; padding: 8px 10px; border-radius: 10px; background: var(--doux); border: 1px solid var(--trait); }
.cn-coord { font-size: 13px; overflow-wrap: anywhere; }`;
  document.head.append(style);
  return { charger, bloc, contacts, hebergements, pourFeuille, GENRES };
})();
