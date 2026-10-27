'use strict';
/* Les notes internes : un fil sur chaque fiche (une date, un lieu, une personne, une piste de diffusion), pour la
   conversation de l'administration : qui a appelé, ce qui a été convenu, ce qu'il reste à voir. @Prénom Nom mentionne
   quelqu'un de l'équipe (l'autocomplétion propose les fiches) : la base le prévient dans son espace. Une note s'épingle
   en haut, se modifie, se supprime avec « Annuler » ; une pièce jointe (photo, PDF…) va dans le stockage privé de
   l'équipe (crescite-equipe, notes/). Le journal garde tout, comme le reste (supabase/migrations/20261103_crescite_notes.sql ;
   sans le script, le bloc le dit). Chargé après corbeille.js.
   NOTES.bloc(el, table, id, { titre, aide })   NOTES.lire(table, id) */
const NOTES = (() => {
  const STOCKAGE = 'crescite-equipe', MO = 15;
  const cache = new Map();
  let absente = false;
  const cle = (t, id) => `${t}:${id}`;
  const moi = () => (E.admins.find(a => a.user_id === E.session?.user?.id) || {}).nom || E.session?.user?.email || 'Administration';
  const initiales = n => String(n || '?').split(/\s+/).map(x => x[0] || '').join('').slice(0, 2).toUpperCase();
  const depuis = t => { const m = t ? (Date.now() - Date.parse(t)) / 6e4 : 0; return !t || m < 1 ? 'à l’instant' : m < 60 ? `il y a ${Math.round(m)} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: m > 300 * 1440 ? 'numeric' : undefined }); };
  const personnes = () => (E.personnes || []).map(p => ({ id: p.id, nom: nomDe(p) })).filter(p => p.nom);
  const mentionsDe = texte => personnes().filter(p => texte.includes(`@${p.nom}`)).map(p => p.id);
  const texteHtml = (texte, mentions) => { let h = esc(texte); personnes().filter(p => (mentions || []).includes(p.id)).forEach(p => { h = h.split(esc(`@${p.nom}`)).join(`<a class="nt-mention" href="#/equipe/${p.id}">@${esc(p.nom)}</a>`); }); return h.replace(/\n/g, '<br>'); };
  async function lire(table, id, { relire = false } = {}) {
    const k = cle(table, id);
    if (!relire && cache.has(k)) return cache.get(k);
    if (absente) return null;
    const { data, error } = await sb.from('crescite_notes').select('*').eq('cible_table', table).eq('cible_id', id).order('epingle', { ascending: false }).order('cree_le', { ascending: false }).limit(200);
    if (error) { if (/crescite_notes|schema cache|42P01|PGRST205/.test(`${error.code} ${error.message}`)) absente = true; else erreur(error, 'Notes illisibles'); return null; }
    cache.set(k, data || []);
    return data || [];
  }
  async function envoyerFichier(table, id, fichier) {
    if (fichier.size > MO * 1048576) throw new Error(`Le fichier dépasse ${MO} Mo.`);
    const nom = fichier.name.replace(/[^\w.\-]+/g, '-').slice(-80), chemin = `notes/${table.replace('crescite_', '')}/${id}/${Date.now()}-${nom}`;
    const { error } = await sb.storage.from(STOCKAGE).upload(chemin, fichier, { contentType: fichier.type || 'application/octet-stream', upsert: false });
    if (error) throw error;
    return { fichier: chemin, fichier_nom: fichier.name };
  }
  function bloc(el, table, id, { titre = 'Notes internes', aide = '' } = {}) {
    if (!el) return;
    const k = cle(table, id);
    const dessiner = xs => {
      if (xs === null) { el.innerHTML = `<h3>${esc(titre)}</h3><p class="aide">Les notes ne sont pas encore installées : exécutez <code>supabase/migrations/20261103_crescite_notes.sql</code> dans Supabase (SQL Editor), puis rechargez cette page.</p>`; return; }
      el.innerHTML = `<h3>${esc(titre)} ${xs.length ? `<span class="compte">${xs.length}</span>` : ''}<span class="aide" style="font-weight:400"> — ${esc(aide || 'pour l’administration ; @Prénom Nom prévient quelqu’un de l’équipe')}</span></h3>
        <div class="nt-fil">${xs.map(n => `<article class="nt-note${n.epingle ? ' epinglee' : ''}" data-nt="${n.id}"><span class="avatar petit nt-avatar" aria-hidden="true">${esc(initiales(n.auteur_nom))}</span>
          <div class="nt-corps"><div class="nt-tete"><b>${esc(n.auteur_nom || 'Administration')}</b><span class="compte" title="${n.cree_le ? esc(new Date(n.cree_le).toLocaleString('fr-FR')) : ''}">${esc(depuis(n.cree_le))}${n.modifie_le && n.modifie_le !== n.cree_le ? ' · modifiée' : ''}</span>${n.epingle ? '<span class="badge option">Épinglée</span>' : ''}</div>
          <p class="nt-texte">${texteHtml(n.texte, n.mentions)}</p>${n.fichier ? `<a class="nt-fichier" href="#" data-nt-fichier="${esc(n.fichier)}">📎 ${esc(n.fichier_nom || n.fichier.split('/').pop())}</a>` : ''}</div>
          <span class="nt-outils"><button type="button" class="btn petit" data-nt-epingler="${n.id}" title="${n.epingle ? 'Désépingler' : 'Épingler en haut'}">${n.epingle ? '📌' : '📍'}</button><button type="button" class="btn petit" data-nt-modifier="${n.id}" title="Modifier">✎</button><button type="button" class="btn petit danger" data-nt-supprimer="${n.id}" title="Supprimer">✕</button></span></article>`).join('')}</div>
        <form class="nt-form" novalidate><div class="nt-saisie"><textarea rows="2" placeholder="Une note… @ pour mentionner quelqu’un de l’équipe" aria-label="Nouvelle note"></textarea><div class="nt-propositions" hidden role="listbox" aria-label="Mentionner"></div></div>
          <div class="nt-pied"><label class="btn petit">📎 Pièce jointe<input type="file" hidden accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"></label><span class="compte nt-fichier-nom"></span><button type="submit" class="btn principal petit">Noter</button></div></form>`;
    };
    el.innerHTML = `<h3>${esc(titre)}</h3>${typeof attenteLignes === 'function' ? attenteLignes(2, 48) : '<p class="aide">Chargement…</p>'}`;
    // une note commencée ne se perd pas en quittant la fiche (GESTES.garder : la question de l'administration, index.html)
    const garder = () => { const f = $('form.nt-form', el); if (f && typeof GESTES !== 'undefined') GESTES.garder(f); };
    lire(table, id).then(xs => { dessiner(xs); garder(); });
    if (el.dataset.ntRelie) return;
    el.dataset.ntRelie = '1';
    const relire = async () => { dessiner(await lire(table, id, { relire: true })); garder(); };
    // l'autocomplétion des mentions : « @ » puis des lettres, au curseur
    el.addEventListener('input', e => {
      const ta = e.target; if (ta.tagName !== 'TEXTAREA') return;
      const avant = ta.value.slice(0, ta.selectionStart), m = /@([^@\n]{0,30})$/.exec(avant), box = $('.nt-propositions', el);
      if (!m) { box.hidden = true; return; }
      const q = norm(m[1]), xs = personnes().filter(p => !q || norm(p.nom).includes(q)).slice(0, 6);
      box.innerHTML = xs.map((p, i) => `<button type="button" role="option" data-nt-mention="${esc(p.nom)}"${i === 0 ? ' aria-selected="true"' : ''}>${esc(p.nom)}</button>`).join('');
      box.hidden = !xs.length;
    });
    el.addEventListener('keydown', e => {
      const ta = e.target; if (ta.tagName !== 'TEXTAREA') return;
      const box = $('.nt-propositions', el); if (box.hidden) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); $('form', el).requestSubmit(); } return; }
      const xs = $$('[data-nt-mention]', box), i = xs.findIndex(x => x.getAttribute('aria-selected') === 'true');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const j = (i + (e.key === 'ArrowDown' ? 1 : -1) + xs.length) % xs.length; xs.forEach((x, k) => x.setAttribute('aria-selected', String(k === j))); }
      else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); (xs[i] || xs[0])?.click(); }
      else if (e.key === 'Escape') { e.preventDefault(); box.hidden = true; }
    });
    el.addEventListener('click', async e => {
      const b = e.target.closest('button, a[data-nt-fichier]'); if (!b) return;
      const ta = $('textarea', el);
      if (b.dataset.ntMention) { const avant = ta.value.slice(0, ta.selectionStart).replace(/@[^@\n]{0,30}$/, ''), apres = ta.value.slice(ta.selectionStart); ta.value = `${avant}@${b.dataset.ntMention} ${apres}`; const pos = avant.length + b.dataset.ntMention.length + 2; ta.setSelectionRange(pos, pos); $('.nt-propositions', el).hidden = true; ta.focus(); return; }
      if (b.dataset.ntFichier) { e.preventDefault(); const { data, error } = await sb.storage.from(STOCKAGE).createSignedUrl(b.dataset.ntFichier, 3600); if (error || !data?.signedUrl) return erreur(error || new Error('lien absent'), 'Fichier inaccessible'); window.open(data.signedUrl, '_blank', 'noopener'); return; }
      const xs = cache.get(k) || [], n = xs.find(x => x.id === +(b.dataset.ntEpingler || b.dataset.ntModifier || b.dataset.ntSupprimer)); if (!n) return;
      if (b.dataset.ntEpingler) { const { error } = await sb.from('crescite_notes').update({ epingle: !n.epingle }).eq('id', n.id); if (error) return erreur(error); n.epingle = !n.epingle; await relire(); return; }
      if (b.dataset.ntModifier) {
        const v = await GESTES.formulaire({ titre: 'Modifier la note', champs: [{ k: 'texte', t: 'long', l: 'Texte', valeur: n.texte, lignes: 5, requis: true }], enregistrer: async x => (String(x.texte || '').trim() ? x : 'Un texte.') });
        if (!v) return;
        const texte = v.texte.trim(), { error } = await sb.from('crescite_notes').update({ texte, mentions: mentionsDe(texte) }).eq('id', n.id);
        if (error) return erreur(error); await relire(); return;
      }
      if (b.dataset.ntSupprimer) { await CORBEILLE.ligne({ table: 'crescite_notes', ligne: n, quoi: 'Note supprimée.', retabli: 'Note rétablie.', apres: () => { cache.set(k, xs.filter(x => x.id !== n.id)); dessiner(cache.get(k)); }, apresRetour: () => relire() }); }
    });
    el.addEventListener('change', e => { const f = e.target; if (f.type === 'file') $('.nt-fichier-nom', el).textContent = f.files[0] ? f.files[0].name : ''; });
    el.addEventListener('submit', async e => {
      e.preventDefault();
      const ta = $('textarea', el), texte = ta.value.trim(), fichier = $('input[type=file]', el).files[0], b = $('button[type=submit]', el);
      if (!texte && !fichier) return annoncer('Une note, ou une pièce jointe.', { erreur: true });
      b.disabled = true;
      try {
        const pj = fichier ? await envoyerFichier(table, id, fichier) : {};
        const ligne = { cible_table: table, cible_id: id, texte: texte || fichier.name, mentions: mentionsDe(texte), auteur_nom: moi(), ...pj };
        const { error } = await sb.from('crescite_notes').insert(ligne);
        if (error) throw error;
        const m = ligne.mentions.length;
        annoncer(m ? `Note ajoutée ; ${m > 1 ? `${m} personnes prévenues` : 'une personne prévenue'}.` : 'Note ajoutée.');
        await relire();
        $('textarea', el)?.focus();
      } catch (err) { erreur(err, 'Note non enregistrée'); b.disabled = false; }
    });
  }
  const style = document.createElement('style');
  style.textContent = `
.nt-fil { display: grid; gap: 8px; margin-bottom: 12px; }
.nt-note { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; padding: 10px 12px; border-radius: 10px; background: var(--doux); border: 1px solid var(--trait); }
.nt-note.epinglee { background: var(--option-doux); border-color: color-mix(in srgb, var(--option) 40%, transparent); }
.nt-avatar { width: 30px; height: 30px; font-size: 12px; }
.nt-tete { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 13px; }
.nt-texte { margin: 4px 0 0; white-space: normal; }
.nt-mention { font-weight: 700; text-decoration: none; background: var(--accent-doux); padding: 0 4px; border-radius: 5px; }
.nt-fichier { display: inline-block; margin-top: 4px; font-size: 13px; }
.nt-outils { display: flex; gap: 3px; align-self: start; opacity: .55; transition: opacity .15s; }
.nt-note:hover .nt-outils, .nt-note:focus-within .nt-outils { opacity: 1; }
.nt-saisie { position: relative; }
.nt-form textarea { width: 100%; box-sizing: border-box; resize: vertical; }
.nt-propositions { position: absolute; left: 0; bottom: calc(100% + 4px); z-index: 12; display: flex; flex-direction: column; min-width: 220px; padding: 4px; background: var(--carte); border: 1px solid var(--trait); border-radius: 10px; box-shadow: var(--ombre); }
.nt-propositions button { border: 0; background: none; text-align: left; padding: 7px 10px; border-radius: 7px; cursor: pointer; font: inherit; color: inherit; }
.nt-propositions button[aria-selected="true"], .nt-propositions button:hover { background: var(--accent-doux); }
.nt-pied { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.nt-pied .nt-fichier-nom { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 520px) { .nt-note { grid-template-columns: auto minmax(0, 1fr); } .nt-outils { grid-column: 2; justify-content: flex-end; } }`;
  document.head.append(style);
  return { bloc, lire, mentionsDe, installee: () => !absente };
})();
