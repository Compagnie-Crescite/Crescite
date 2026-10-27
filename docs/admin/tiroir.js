'use strict';
/* Les fiches en tiroir : une date, un lieu, une personne, une demande de devis, une piste de diffusion s'ouvrent dans un
   panneau qui glisse à droite, sans quitter la page (le tableau de bord, le Kanban, le planning, la recherche, une autre
   fiche). Les tiroirs s'empilent (une date → son lieu → …) ; Échap, le voile ou « ← » ferment le dernier ; « Pleine page »
   va à l'adresse de la fiche (l'adresse de la page, elle, reste la sienne, partageable). Un lien vers une fiche s'ouvre en
   tiroir quand la page n'a pas déjà la place de cette fiche (dans Représentations, une date s'ouvre à côté de la liste,
   comme avant) ; Ctrl, Maj, Alt ou le bouton du milieu laissent faire le navigateur. La fiche est la même que dans sa
   rubrique (editeurDate, editeurLieu, editeurPersonne, editeurDevis) : ses enregistrements redessinent le tiroir
   (redessinerFiche), ses suppressions le ferment (quitterFiche), ses menus et « Annuler » marchent. Une piste de
   diffusion se lit en résumé, avec ses actions. Changer de page ferme les tiroirs (après la question des modifications
   non enregistrées, comme pour une fiche). Chargé après corbeille.js ; sans les éditeurs (equipe.js absent), le lien
   navigue comme avant.
   TIROIR.ouvrir(href, { viser, depuis })   TIROIR.fermer()   TIROIR.fermerTout()   TIROIR.ouvert()   TIROIR.racine()
   TIROIR.redessiner(id)                     TIROIR.peut(href) : ce lien s'ouvrirait-il en tiroir ici ? */
const TIROIR = (() => {
  const pile = [];
  const LARGEUR = 'min(780px, 94vw)';
  const existe = f => typeof window[f] === 'function';
  // les fiches qui savent s'ouvrir en tiroir : leur adresse, la zone qu'elles attendent, comment les dessiner
  const FICHES = [
    { genre: 'date', nom: 'Date', re: /^#\/representations\/(\d+)$/, zone: 'ed-date', href: id => `#/representations/${id}`, peut: () => existe('editeurDate'), dessiner: id => editeurDate(id),
      titre: id => { const d = E.dates.find(x => x.id === id); return d ? `${spectacle(d.spectacle_id)?.titre || 'Date'} · ${jourCourt(d.debut)}` : 'Date'; } },
    { genre: 'lieu', nom: 'Lieu', re: /^#\/lieux\/(\d+)$/, zone: 'ed-lieu', href: id => `#/lieux/${id}`, peut: () => existe('editeurLieu'), dessiner: id => editeurLieu(id), titre: id => lieuTexte(lieu(id)) || 'Lieu' },
    { genre: 'personne', nom: 'Personne', re: /^#\/equipe\/(\d+)$/, zone: 'ed-personne', href: id => `#/equipe/${id}`, peut: () => existe('editeurPersonne') && E.equipeInstallee, dessiner: id => editeurPersonne(id), titre: id => nomDe(personne(id)) || 'Personne' },
    { genre: 'devis', nom: 'Demande de devis', re: /^#\/diffusion\/devis\/(\d+)$/, zone: 'ed-devis', href: id => `#/diffusion/devis/${id}`, peut: () => existe('editeurDevis') && E.ideale, dessiner: id => editeurDevis(id), titre: id => (E.devis || []).find(x => x.id === id)?.structure_nom || 'Demande' },
    { genre: 'piste', nom: 'Opportunité de diffusion', re: /^#\/diffusion\/piste\/(\d+)$/, zone: 'ed-piste', href: id => `#/diffusion/piste/${id}`, pleine: () => '#/diffusion', peut: () => E.ideale, dessiner: id => dessinerPiste(id), titre: id => (E.prospects || []).find(x => x.id === id)?.structure || 'Opportunité' },
  ];
  const ficheDe = href => { for (const f of FICHES) { const m = (href || '').match(f.re); if (m) return { f, id: +m[1] }; } return null; };
  // ce lien s'ouvrirait-il en tiroir ici ? Oui s'il mène à une fiche connue, que la page n'a pas sa place (#ed-date…) et
  // que la fiche n'est pas déjà celle du dernier tiroir
  function peut(href) {
    const x = ficheDe(href); if (!x || !x.f.peut()) return false;
    const app = document.getElementById('app');
    if (app && app.querySelector(`#${x.f.zone}`)) return false;
    const haut = pile[pile.length - 1];
    return !(haut && haut.genre === x.f.genre && haut.id === x.id);
  }
  const ouvert = () => pile.length > 0;
  const racine = () => (pile.length ? pile[pile.length - 1].el : null);
  function ouvrir(href, { viser: cible = '', depuis = null } = {}) {
    const x = ficheDe(href); if (!x || !x.f.peut()) { location.hash = href; return null; }
    const { f, id } = x;
    const haut = pile[pile.length - 1];
    if (haut && haut.genre === f.genre && haut.id === id) { if (cible) { visee = cible; viser(); } return haut; }
    if (!pile.length) document.documentElement.classList.add('tiroir-ouvert');
    const t = { genre: f.genre, id, f, saleAvant: E.sale, depuis: depuis || document.activeElement, el: null };
    E.sale = false;
    const voile = document.createElement('div'); voile.className = 'tiroir-voile'; voile.dataset.tiroirFermer = '';
    const el = document.createElement('aside');
    el.className = 'tiroir'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', f.nom);
    el.style.setProperty('--tiroir-largeur', LARGEUR);
    el.innerHTML = `<header class="tiroir-tete"><button type="button" class="btn petit" data-tiroir-fermer title="Fermer (Échap)" aria-label="Fermer">←</button>
      <span class="tiroir-fil"><span class="tiroir-genre">${esc(f.nom)}</span><span class="tiroir-titre"></span></span>
      <a class="btn petit" data-tiroir-pleine href="${esc((f.pleine || f.href)(id))}" title="Ouvrir à sa place, dans sa rubrique">Pleine page</a>
      <button type="button" class="btn petit" data-tiroir-fermer aria-label="Fermer">✕</button></header>
      <div class="tiroir-corps"><section class="editeur" id="${f.zone}"></section></div>`;
    t.el = el; t.voile = voile;
    pile.push(t);
    document.body.append(voile, el);
    pile.slice(0, -1).forEach((p, i) => { p.el.style.setProperty('--tiroir-recul', `${(pile.length - 1 - i) * 28}px`); p.el.setAttribute('aria-hidden', 'true'); p.el.inert = true; });
    dessiner(t);
    requestAnimationFrame(() => { el.classList.add('la'); voile.classList.add('la'); });
    if (cible) { visee = cible; viser(); } else requestAnimationFrame(() => $('[data-tiroir-fermer]', el)?.focus({ preventScroll: true }));
    return t;
  }
  function dessiner(t) {
    try { t.f.dessiner(t.id); } catch (e) { console.error(e); const z = $(`#${t.f.zone}`, t.el); if (z) z.innerHTML = '<div class="vide bloc">Cette fiche ne s’ouvre pas ici.</div>'; }
    const titre = $('.tiroir-titre', t.el); if (titre) titre.textContent = t.f.titre(t.id);
    const a = $('[data-tiroir-pleine]', t.el); if (a) a.setAttribute('href', (t.f.pleine || t.f.href)(t.id));
    marquerSale(false);
  }
  // après un enregistrement (redessinerFiche) : la même fiche, redessinée ; une fiche créée dans le tiroir (une date dupliquée) prend son numéro
  function redessiner(id = null) {
    const t = pile[pile.length - 1]; if (!t) return;
    if (id != null && Number.isFinite(+id)) t.id = +id;
    dessiner(t);
  }
  function fermer({ demander = true } = {}) {
    const t = pile[pile.length - 1]; if (!t) return false;
    if (demander && E.sale && !confirm('Des modifications ne sont pas enregistrées. Fermer quand même ?')) return false;
    pile.pop();
    t.el.classList.remove('la'); t.voile.classList.remove('la');
    const retirer = () => { t.el.remove(); t.voile.remove(); };
    if (typeof GESTES !== 'undefined' && GESTES.reduit()) retirer(); else setTimeout(retirer, 220);
    E.sale = t.saleAvant;
    const haut = pile[pile.length - 1];
    if (haut) { haut.el.style.removeProperty('--tiroir-recul'); haut.el.removeAttribute('aria-hidden'); haut.el.inert = false; pile.slice(0, -1).forEach((p, i) => p.el.style.setProperty('--tiroir-recul', `${(pile.length - 1 - i) * 28}px`)); }
    else document.documentElement.classList.remove('tiroir-ouvert');
    marquerSale(E.sale);
    const d = t.depuis; if (d && d.isConnected && typeof d.focus === 'function') d.focus({ preventScroll: true }); else haut?.el.querySelector('[data-tiroir-fermer]')?.focus({ preventScroll: true });
    return true;
  }
  function fermerTout({ demander = false } = {}) { while (pile.length) { if (!fermer({ demander })) return false; } return true; }

  // une piste de diffusion, en résumé : ce que la carte du Kanban dit, et ses actions (le Kanban la modifie)
  const ETAPES = () => (typeof ETAPES_CRM !== 'undefined' ? ETAPES_CRM : []);
  function dessinerPiste(id) {
    const z = $('#ed-piste'); if (!z) return;
    const p = (E.prospects || []).find(x => x.id === id);
    if (!p) { z.innerHTML = '<div class="vide bloc">Cette opportunité n’existe plus.</div>'; return; }
    const sp = spectacle(p.spectacle_id), etapes = ETAPES(), i = etapes.findIndex(e => e[0] === p.etape), auj = aujourdhui();
    const retard = p.date_prochaine_relance && p.date_prochaine_relance < auj;
    const fiche = (l, v) => (v ? `<dt>${esc(l)}</dt><dd>${v}</dd>` : '');
    z.innerHTML = `<div class="titre-ed"><h2>${esc(p.structure)}</h2></div>
      <div class="bloc"><ol class="tiroir-etapes">${etapes.map((e, k) => `<li class="${k < i ? 'faite' : k === i ? 'courante' : ''}"><button type="button" class="btn petit" data-piste-etape="${esc(e[0])}"${k === i ? ' aria-current="step"' : ''}>${esc(e[1])}</button></li>`).join('')}</ol>
        <dl class="dv-fiche">${fiche('Spectacle', sp ? `<span class="pastille" style="--c:${esc(couleurSp(sp))}"></span> ${esc(sp.titre)}` : '')}${fiche('Où', esc([p.commune, p.departement ? `(${p.departement})` : ''].filter(Boolean).join(' ')))}
        ${fiche('Contact', `${esc(p.contact_nom || '')}<span class="sous-champ">${liensCoordonnees([p.contact_email, p.contact_tel].filter(Boolean).join(' '))}</span>`)}
        ${fiche('Montant estimé', p.montant_estime ? esc(`${Number(p.montant_estime).toLocaleString('fr-FR')} €`) : '')}
        ${fiche('Dernier contact', p.date_dernier_contact ? esc(jourCourt(p.date_dernier_contact)) : '')}
        ${fiche('Prochaine relance', p.date_prochaine_relance ? `<span class="${retard ? 'manque' : ''}">${esc(jourCourt(p.date_prochaine_relance))}${retard ? ' · en retard' : ''}</span>` : '')}</dl>
        ${p.notes ? `<p class="dv-message">${esc(p.notes)}</p>` : ''}</div>
      <div class="bloc" id="piste-docs"></div><div class="bloc" id="piste-notes"></div>
      <div class="pied-ed"><span class="etat-ed">Le Kanban modifie cette opportunité.</span><button type="button" class="btn" data-piste-relance>Relance faite aujourd’hui</button>${p.contact_email ? `<a class="btn" href="mailto:${esc(p.contact_email)}">Écrire</a>` : ''}<a class="btn principal" href="#/diffusion" data-tiroir-pleine>Ouvrir la diffusion</a></div>`;
    if (typeof NOTES !== 'undefined' && NOTES.bloc) NOTES.bloc($('#piste-notes', z), 'crescite_diffusion_prospects', p.id, { titre: 'Notes sur cette opportunité' });
    else $('#piste-notes', z)?.remove();
    if (typeof MODELES !== 'undefined') MODELES.bloc($('#piste-docs', z), { prospect: p }); else $('#piste-docs', z)?.remove();
    z.addEventListener('click', async e => {
      const b = e.target.closest('[data-piste-etape], [data-piste-relance]'); if (!b) return;
      b.disabled = true;
      if (b.dataset.pisteEtape !== undefined) { if (typeof deplacerProspect === 'function') await deplacerProspect(p.id, b.dataset.pisteEtape); }
      else {
        const { error } = await sb.from('crescite_diffusion_prospects').update({ date_dernier_contact: auj, date_prochaine_relance: plusJours(auj, 7) }).eq('id', p.id);
        if (error) erreur(error, 'Relance non notée'); else { Object.assign(p, { date_dernier_contact: auj, date_prochaine_relance: plusJours(auj, 7) }); annoncer('Relance notée : prochaine dans 7 jours.'); rafraichirListes(); }
      }
      redessiner();
    });
  }

  // l'adresse d'une piste (#/diffusion/piste/3) : le Kanban, puis la piste en tiroir ; une carte du Kanban cliquée (hors boutons) s'ouvre de même
  if (typeof ROUTES !== 'undefined') ROUTES.unshift([/^#\/diffusion\/piste\/(\d+)$/, m => { vueDiffusion(); requestAnimationFrame(() => ouvrir(`#/diffusion/piste/${m[1]}`)); }]);
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const c = e.target.closest('.crm-carte[data-prospect-id]'); if (!c || e.target.closest('button, a, input, select, textarea')) return;
    if (document.documentElement.classList.contains('sel-mode')) return;
    e.preventDefault(); ouvrir(`#/diffusion/piste/${c.dataset.prospectId}`, { depuis: c });
  });
  // les liens vers une fiche, partout (les listes, les tuiles, les menus, une autre fiche) : en tiroir quand la page n'a pas sa place
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href^="#/"]'); if (!a || a.hasAttribute('data-tiroir-pleine') || a.target === '_blank') return;
    const href = a.getAttribute('href');
    if (!peut(href)) return;
    e.preventDefault();
    if (typeof GESTES !== 'undefined' && GESTES.ouvert()) GESTES.fermer();
    ouvrir(href, { viser: a.dataset.viser || '', depuis: a });
  });
  document.addEventListener('click', e => { const b = e.target.closest('[data-tiroir-fermer]'); if (b) { e.preventDefault(); fermer(); } });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !pile.length) return;
    if (document.querySelector('.gf, .gm, dialog[open]') || (typeof GESTES !== 'undefined' && GESTES.ouvert())) return;
    const t = e.target; if (t && t.matches && t.matches('input, textarea, select, [contenteditable="true"]') && t.closest('.tiroir') && t.value && t.type === 'search') return;
    e.preventDefault(); fermer();
  });
  // changer de page ferme les tiroirs (index.html a déjà posé la question des modifications non enregistrées)
  window.addEventListener('hashchange', () => { if (pile.length && location.hash === E.hashVue) fermerTout(); });

  const style = document.createElement('style');
  style.id = 'styles-tiroir';
  style.textContent = `
.tiroir-voile { position: fixed; inset: 0; z-index: 60; background: rgba(23, 15, 26, 0); transition: background .22s; }
.tiroir-voile.la { background: rgba(23, 15, 26, .38); }
.tiroir { position: fixed; top: 0; right: 0; bottom: 0; z-index: 61; width: var(--tiroir-largeur, 760px); max-width: 100vw; display: flex; flex-direction: column; background: var(--fond); color: var(--encre);
  box-shadow: -18px 0 48px -22px rgba(0, 0, 0, .45); border-left: 1px solid var(--trait); transform: translateX(104%); transition: transform .22s cubic-bezier(.3, .7, .3, 1); }
.tiroir.la { transform: translateX(calc(-1 * var(--tiroir-recul, 0px))); }
.tiroir[aria-hidden="true"] { filter: brightness(.92); }
.tiroir-tete { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--carte); border-bottom: 1px solid var(--trait); }
.tiroir-fil { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.2; }
.tiroir-genre { font-size: 11.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); }
.tiroir-titre { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tiroir-corps { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 16px 18px 24px; }
.tiroir-corps .editeur .titre-ed [data-tt="retour"] { display: none; }
.tiroir-corps .pied-ed { bottom: -24px; }
html.tiroir-ouvert body { overflow: hidden; }
.tiroir-etapes { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 14px; padding: 0; list-style: none; counter-reset: etape; }
.tiroir-etapes li.faite .btn { background: var(--ok-doux); border-color: transparent; color: var(--ok); }
.tiroir-etapes li.courante .btn { background: var(--accent); border-color: var(--accent); color: var(--sur-accent, #fff); }
.manque { color: var(--alerte); font-weight: 700; }
@media (max-width: 640px) { .tiroir { width: 100vw; border-left: 0; } .tiroir-corps { padding: 12px 12px 20px; } .tiroir.la { transform: none; } }
@media (prefers-reduced-motion: reduce) { .tiroir, .tiroir-voile { transition: none; } }`;
  document.head.append(style);
  return { ouvrir, fermer, fermerTout, ouvert, racine, redessiner, peut, pile: () => pile.slice() };
})();
