'use strict';
/* Les menus de l'administration : un clic droit, un appui long (au doigt) ou Maj+F10 sur une ligne, une carte ou une
   tuile ouvrent ce qu'on peut en faire, sans ouvrir la fiche (GESTES.menu, admin/gestes.js). Chargé en dernier : il
   connaît l'état (E), les outils d'index.html, equipe.js et tableau.js.
   - Une date (la liste, le tableau de bord) : ouvrir, la feuille de route, prévenir l'équipe, dupliquer, le tableur,
     confirmer une option, copier le lien, supprimer. Une personne : appeler, écrire, sa fiche. Un lieu : l'itinéraire,
     appeler son contact, sa fiche. Une feuille : l'ouvrir sur « À compléter », la date. Une demande de devis : écrire,
     appeler, changer son statut sans l'ouvrir. Une piste de diffusion (la carte du Kanban) : l'étape d'avant, d'après,
     relance faite, le courriel, modifier, supprimer ; la carte se glisse aussi d'une colonne à l'autre. Une note de
     frais : valider, refuser, marquer remboursée. Une invitation pro : prolonger de trente jours, copier le lien,
     écrire. Une proposition de dates : la clore. Une séance d'atelier : dupliquer, supprimer. Une ligne du journal :
     revenir, ouvrir la fiche. Une tuile du tableau de bord : ses réglages, la réduire, sa largeur, la déplacer, la
     masquer, personnaliser ; une action rapide : la retirer. Un spectacle : ses dates, l'avancer, le reculer. Une ligne
     « à traiter » : la traiter sur place, l'épingler, la reporter ; une ligne du fil : annuler la modification.
   - Précédent / suivant dans chaque fiche ouverte à côté de sa liste (dates, personnes, lieux, devis, invitations,
     propositions, ateliers, séances, textes), et dans une feuille de route ou un spectacle : deux boutons dans le titre,
     Alt+↑ et Alt+↓ (GESTES.precSuiv). Les flèches ↑ ↓ passent d'une ligne à l'autre dans toutes les listes. */
(() => {
  if (typeof GESTES === 'undefined') return;
  const G = GESTES, ICO = G.ICO;
  const idDe = (el, attr, re) => { const v = el.dataset[attr]; if (v != null && v !== '') return +v; const m = (el.getAttribute('href') || '').match(re); return m ? +m[1] : null; };
  const absolu = href => new URL(href, location.href).href;
  const copier = async (texte, quoi) => { try { await navigator.clipboard.writeText(texte); annoncer(`${quoi} : copié.`); } catch (e) { annoncer('Copie impossible dans ce navigateur.', { erreur: true }); } };
  const telDe = texte => (jetonsContact(texte || '').find(j => j.genre === 'tel') || null);
  const melDe = texte => (jetonsContact(texte || '').find(j => j.genre === 'mel') || null);
  const texteTel = j => (typeof FEUILLE !== 'undefined' ? FEUILLE.telTexte(j.t) : j.t);
  const appeler = (texte, qui) => { const j = telDe(texte); return j ? { libelle: `Appeler${qui ? ` ${qui}` : ''}`, detail: texteTel(j), href: j.href, icone: ICO.tel } : null; };
  const ecrireA = (texte, qui) => { const j = melDe(texte); return j ? { libelle: `Écrire${qui ? ` à ${qui}` : ''}`, detail: j.t, href: j.href, icone: ICO.mel } : null; };
  const itineraire = l => { const q = [l.nom, l.adresse, l.commune].filter(Boolean).join(', '); return q ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}` : ''; };
  const ouvrirA = (href, libelle = 'Ouvrir') => ({ libelle, href, icone: ICO.ouvrir, raccourci: 'Entrée' });
  const liens = href => [{ separateur: true }, { libelle: 'Ouvrir dans un nouvel onglet', href: absolu(href), externe: true, icone: ICO.externe }, { libelle: 'Copier le lien', faire: () => copier(absolu(href), 'Le lien'), icone: ICO.copier }];
  // aller à une page, puis cliquer un de ses boutons une fois qu'elle est là (Dupliquer, Prévenir l'équipe, Supprimer…)
  function allerEtCliquer(href, sel, viserAvant = '') {
    const essayer = n => { const b = $(sel); if (b) { b.click(); return; } if (n > 0) requestAnimationFrame(() => essayer(n - 1)); };
    if (location.hash === href) return essayer(40);
    window.addEventListener('hashchange', () => setTimeout(() => essayer(40), 20), { once: true });
    location.hash = href;
  }
  const allerViser = (href, cible) => { visee = cible; if (location.hash === href) viser(); else location.hash = href; };
  // une écriture directe dans la base : apres(data) met l'état en mémoire à jour, puis les listes se redessinent
  async function ecrire(promesse, succes, echec, apres = null) {
    const r = await promesse;
    if (r.error) { erreur(r.error, echec); return null; }
    try { if (apres) apres(r.data ?? true); } catch (e) { console.error(e); }
    if (succes) annoncer(succes);
    rafraichirListes();
    return r.data ?? true;
  }
  const maintenant = () => new Date().toISOString();

  // ===================================================================================================== les actions
  function actionsDate(d, el) {
    const s = spectacle(d.spectacle_id), href = `#/representations/${d.id}`, ici = location.hash === href;
    const xs = [];
    if (!ici) xs.push(ouvrirA(href, 'Ouvrir la date'));
    if (d.statut === 'option' && aVenirDate(d)) xs.push({ libelle: 'Confirmer la date…', detail: 'ouvre la fiche sur le statut', faire: () => allerViser(href, '[data-statut="confirmee"]'), icone: ICO.coche });
    if (E.equipeInstallee) {
      const f = E.feuilles.find(x => x.date_id === d.id), n = f ? aCompleter(d.id) : 0;
      xs.push({ libelle: 'Feuille de route', detail: f ? (f.statut === 'publiee' ? `publiée v${f.version}` : `brouillon${n ? ` · ${n} à compléter` : ''}`) : 'à composer', href: `#/feuilles/${d.id}`, icone: ICO.feuille });
      if (aVenirDate(d) && d.statut !== 'annulee') xs.push({ libelle: 'Prévenir l’équipe…', detail: 'un message à toute l’équipe de la date', faire: () => allerEtCliquer(href, '#d-prevenir'), icone: ICO.message });
    }
    const l = lieu(d.lieu_id);
    if (l && itineraire(l)) xs.push({ libelle: 'Itinéraire', detail: l.nom ? `${l.nom}, ${l.commune}` : l.commune, href: itineraire(l), externe: true, icone: ICO.carte });
    if (l) xs.push({ libelle: 'Fiche du lieu', detail: l.nom || l.commune, href: `#/lieux/${l.id}` });
    xs.push({ separateur: true }, { libelle: 'Dupliquer', detail: 'une copie à enregistrer', faire: () => allerEtCliquer(href, '#d-dupliquer'), icone: ICO.dupliquer },
      { libelle: 'Voir dans le tableur', href: '#/representations/tableur' });
    xs.push(...liens(href));
    xs.push({ separateur: true }, { libelle: 'Supprimer la date…', danger: true, icone: ICO.poubelle, faire: () => supprimerDate(d) });
    return xs.filter(Boolean);
  }
  const aVenirDate = d => (d.fin || d.debut) >= AUJ;
  function actionsPersonne(p) {
    const pr = priveeDe(p.id) || {}, href = `#/equipe/${p.id}`;
    const tel = appeler(pr.telephone, ''), mel = ecrireA(pr.email, '');
    return [location.hash === href ? null : ouvrirA(href, 'Ouvrir la fiche'), tel || { libelle: 'Téléphone à renseigner', detail: 'la fiche s’ouvre sur le champ', faire: () => allerViser(href, 'telephone'), icone: ICO.tel },
      mel, tel && { libelle: 'Copier le téléphone', faire: () => copier(texteTel(telDe(pr.telephone)), 'Le téléphone'), icone: ICO.copier },
      E.sql5 !== false && E.equipeInstallee ? { libelle: 'Proposer des dates…', href: '#/planning/proposer' } : null, ...liens(href)];
  }
  function actionsLieu(l) {
    const su = E.lieuxSuivi.find(x => x.lieu_id === l.id) || {}, href = `#/lieux/${l.id}`;
    const n = E.dates.filter(d => d.lieu_id === l.id && aVenirDate(d)).length;
    return [location.hash === href ? null : ouvrirA(href, 'Ouvrir la fiche'), itineraire(l) ? { libelle: 'Itinéraire', detail: l.adresse || l.commune, href: itineraire(l), externe: true, icone: ICO.carte } : { libelle: 'Adresse à renseigner', faire: () => allerViser(href, 'adresse'), icone: ICO.carte },
      appeler(su.contact, 'le contact') || { libelle: 'Contact à renseigner', faire: () => allerViser(href, 'contact'), icone: ICO.tel }, ecrireA(su.contact, 'au contact'),
      l.adresse ? { libelle: 'Copier l’adresse', faire: () => copier(`${l.nom ? `${l.nom}, ` : ''}${l.adresse}, ${l.commune}`, 'L’adresse'), icone: ICO.copier } : null,
      { libelle: `Nouvelle date ici`, detail: n ? `${n} date${n > 1 ? 's' : ''} à venir` : 'aucune date à venir', faire: () => { E.dateDepart = Object.assign(nouvelleDate(), { lieu_id: l.id }); location.hash = '#/representations/nouvelle'; }, icone: ICO.plus }, ...liens(href)];
  }
  function actionsFeuille(d) {
    const f = E.feuilles.find(x => x.date_id === d.id), href = `#/feuilles/${d.id}`, n = f ? aCompleter(d.id) : 0;
    return [location.hash === href ? null : ouvrirA(href, 'Ouvrir la feuille'), f && n ? { libelle: `Compléter (${n})`, detail: 'la liste « À compléter »', faire: () => allerViser(href, '#fr-manques'), icone: ICO.feuille } : null,
      !f ? { libelle: 'Composer depuis la base', faire: () => allerViser(href, '#fr-composer'), icone: ICO.feuille } : null,
      { libelle: 'Ouvrir la date', href: `#/representations/${d.id}`, icone: ICO.ouvrir }, ...liens(href)];
  }
  function actionsDevis(v) {
    const href = `#/diffusion/devis/${v.id}`;
    const statuts = STATUTS_DEVIS.filter(([k]) => k !== (v.statut || 'nouveau')).map(([k, l]) => ({ libelle: `Marquer « ${l} »`, faire: () => ecrire(sb.from('crescite_devis_demandes').update({ statut: k }).eq('id', v.id), `Demande marquée « ${l} ».`, 'Statut non changé', () => { v.statut = k; }) }));
    return [location.hash === href ? null : ouvrirA(href, 'Ouvrir la demande'), ecrireA(v.contact_email, v.contact_nom || 'au contact'), appeler(v.contact_tel, v.contact_nom || 'le contact'), { separateur: true }, ...statuts, ...liens(href)];
  }
  function actionsProspect(p, el) {
    const i = ETAPES_CRM.findIndex(e => e[0] === p.etape);
    const vers = (j, libelle) => (j >= 0 && j < ETAPES_CRM.length ? { libelle, detail: ETAPES_CRM[j][1], faire: () => deplacerProspect(p.id, ETAPES_CRM[j][0]), icone: j < i ? ICO.gauche : ICO.droite } : null);
    return [vers(i + 1, 'Étape suivante'), vers(i - 1, 'Étape précédente'), { separateur: true },
      { libelle: 'Relance faite aujourd’hui', detail: 'prochaine relance dans 7 jours', icone: ICO.coche, faire: () => ecrire(sb.from('crescite_diffusion_prospects').update({ date_dernier_contact: AUJ, date_prochaine_relance: plusJours(AUJ, 7) }).eq('id', p.id), 'Relance notée : la prochaine dans 7 jours.', 'Relance non notée', () => { p.date_dernier_contact = AUJ; p.date_prochaine_relance = plusJours(AUJ, 7); if (location.hash === '#/diffusion') vueDiffusion(); }) },
      { libelle: 'Reporter la relance d’une semaine', icone: ICO.agenda, faire: () => { const base = p.date_prochaine_relance && p.date_prochaine_relance > AUJ ? p.date_prochaine_relance : AUJ, j = plusJours(base, 7); ecrire(sb.from('crescite_diffusion_prospects').update({ date_prochaine_relance: j }).eq('id', p.id), `Relance reportée au ${jourCourt(j)}.`, 'Relance non reportée', () => { p.date_prochaine_relance = j; if (location.hash === '#/diffusion') vueDiffusion(); }); } },
      ecrireA(p.contact_email, p.contact_nom || 'au contact'), appeler(p.contact_tel, p.contact_nom || 'le contact'),
      el?.querySelector('[data-crm-email]') ? { libelle: 'Courriel de relance…', faire: () => el.querySelector('[data-crm-email]').click(), icone: ICO.mel } : null,
      { separateur: true }, el?.querySelector('[data-crm-editer]') ? { libelle: 'Modifier…', faire: () => el.querySelector('[data-crm-editer]').click(), icone: ICO.reglages } : { libelle: 'Ouvrir la diffusion', href: '#/diffusion' },
      el?.querySelector('[data-crm-supprimer]') ? { libelle: 'Supprimer…', danger: true, icone: ICO.poubelle, faire: () => el.querySelector('[data-crm-supprimer]').click() } : null];
  }
  function actionsFrais(f) {
    const p = personne(f.personne_id), qui = p ? nomDe(p) : 'cette note';
    const changer = (statut, plus, succes) => ecrire(sb.from('crescite_notes_frais').update({ statut, ...plus }).eq('id', f.id), succes, 'Changement impossible', () => Object.assign(f, { statut }, plus));
    return [{ libelle: 'Notes de frais', detail: `${qui} · ${euros(f.montant_ttc)}`, href: '#/equipe/frais', icone: ICO.euro }, { separateur: true },
      f.statut === 'en_attente' ? { libelle: 'Valider', icone: ICO.coche, faire: () => changer('valide', { valide_le: maintenant(), valide_par: E.session.user.id }, 'Note de frais validée.') } : null,
      f.statut === 'en_attente' ? { libelle: 'Refuser', danger: true, icone: ICO.croix, faire: () => { if (confirm(`Refuser la note de frais de ${qui} (${euros(f.montant_ttc)}) ?`)) changer('refuse', {}, 'Note de frais refusée.'); } } : null,
      f.statut === 'valide' ? { libelle: 'Marquer remboursée', icone: ICO.coche, faire: () => changer('rembourse', { rembourse_le: maintenant() }, 'Note de frais marquée remboursée.') } : null,
      p ? { libelle: 'Fiche de la personne', detail: nomDe(p), href: `#/equipe/${p.id}` } : null];
  }
  const euros = n => `${(Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  function actionsAcces(a) {
    const href = `#/pro/${a.id}`, lien = a.jeton ? `${new URL('../pro/', location.href).href}#${a.jeton}` : '';
    const prolonger = n => { const base = a.expire_le > AUJ ? a.expire_le : AUJ, j = plusJours(base, n); return ecrire(sb.from('crescite_acces_pro').update({ expire_le: j, actif: true }).eq('id', a.id).select().single(), `Invitation prolongée jusqu’au ${jourCourt(j)}.`, 'Prolongation impossible', data => remplacerLigne(E.acces, data)); };
    return [location.hash === href ? null : ouvrirA(href, 'Ouvrir l’invitation'), { libelle: 'Prolonger de 30 jours', detail: `jusqu’au ${jourCourt(plusJours(a.expire_le > AUJ ? a.expire_le : AUJ, 30))}`, icone: ICO.agenda, faire: () => prolonger(30) },
      lien ? { libelle: 'Copier le lien de la salle', faire: () => copier(lien, 'Le lien'), icone: ICO.copier } : null, ecrireA(a.courriel, a.contact || 'à la salle'),
      a.actif ? { libelle: 'Désactiver', danger: true, icone: ICO.cache, faire: () => ecrire(sb.from('crescite_acces_pro').update({ actif: false }).eq('id', a.id).select().single(), 'Invitation désactivée.', 'Changement impossible', data => remplacerLigne(E.acces, data)) }
        : { libelle: 'Réactiver', icone: ICO.oeil, faire: () => prolonger(0) }, ...liens(href)];
  }
  function actionsProposition(p) {
    const href = `#/planning/proposition/${p.id}`;
    return [location.hash === href ? null : ouvrirA(href, 'Ouvrir le suivi'), p.statut === 'ouverte' ? { libelle: 'Clore la proposition', detail: 'sans créer de date', icone: ICO.croix, faire: () => { if (confirm(`Clore « ${p.titre} » ?`)) ecrire(sb.from('crescite_propositions').update({ statut: 'close' }).eq('id', p.id), 'Proposition close.', 'Clôture impossible', () => { p.statut = 'close'; }); } } : null,
      { libelle: 'Proposer d’autres dates…', href: '#/planning/proposer', icone: ICO.plus }, ...liens(href)];
  }
  function actionsSeance(s) {
    const href = `#/ateliers/seances/${s.id}`, l = lieu(s.lieu_id);
    return [location.hash === href ? null : ouvrirA(href, 'Ouvrir la séance'), { libelle: 'Dupliquer', faire: () => allerEtCliquer(href, '#se-dup'), icone: ICO.dupliquer },
      l ? { libelle: 'Fiche de l’établissement', detail: l.nom || l.commune, href: `#/lieux/${l.id}` } : null, s.date_id ? { libelle: 'La date de tournée', href: `#/representations/${s.date_id}` } : null,
      ...liens(href), { separateur: true }, { libelle: 'Supprimer…', danger: true, icone: ICO.poubelle, faire: () => allerEtCliquer(href, '#se-suppr') }];
  }
  function actionsSpectacle(s, el) {
    const n = E.dates.filter(d => d.spectacle_id === s.id && aVenirDate(d) && d.statut !== 'annulee').length;
    const bouton = sens => $(`[data-ordre="${s.id}"][data-sens="${sens}"]`);
    return [location.hash === `#/spectacles/${s.slug}` ? null : ouvrirA(`#/spectacles/${s.slug}`, 'Ouvrir la fiche'),
      { libelle: 'Ses dates', detail: `${n} à venir`, icone: ICO.agenda, faire: () => { session.dates = Object.assign({ spectacle: '', public: '', statut: '', q: '', ouvertes: [] }, session.dates || {}, { spectacle: String(s.id) }); garderFiltres(); location.hash = '#/representations'; } },
      { libelle: 'Nouvelle date', faire: () => { E.dateDepart = Object.assign(nouvelleDate(), { spectacle_id: s.id }); location.hash = '#/representations/nouvelle'; }, icone: ICO.plus },
      bouton(-1) ? { libelle: 'Avancer dans l’ordre', faire: () => bouton(-1).click(), icone: ICO.gauche } : null, bouton(1) ? { libelle: 'Reculer dans l’ordre', faire: () => bouton(1).click(), icone: ICO.droite } : null,
      ...liens(`#/spectacles/${s.slug}`)];
  }
  function actionsJournal(el) {
    const b = el.querySelector('[data-j]'), j = b && E.journal.find(x => x.id === +b.dataset.j);
    if (!j) return [];
    const href = typeof TABLEAU !== 'undefined' && TABLEAU.lienJournal ? TABLEAU.lienJournal(j) : '#/journal';
    return [href !== '#/journal' ? { libelle: 'Ouvrir la fiche', href, icone: ICO.ouvrir } : null, { libelle: b.textContent.trim(), detail: j.operation === 'INSERT' ? 'retire ce qui a été ajouté' : 'remet la ligne comme avant', faire: () => b.click(), icone: ICO.croix, danger: true }];
  }
  function actionsTuile(sec) {
    const k = sec.dataset.k, t = typeof TABLEAU !== 'undefined' && TABLEAU.TUILES[k], replie = sec.classList.contains('replie');
    if (!t) return [];
    const clic = sel => () => $(sel, sec)?.click();
    const taille = sec.classList.contains('taille-g') ? 'g' : sec.classList.contains('taille-m') ? 'm' : 'p';
    return [$('[data-tb-reglages]', sec) ? { libelle: 'Réglages de la tuile…', faire: clic('[data-tb-reglages]'), icone: ICO.reglages } : null,
      { libelle: replie ? 'Déployer' : 'Réduire', faire: clic('[data-tb-replier]'), icone: replie ? ICO.bas : ICO.haut }, { separateur: true },
      ...[['p', 'Une colonne'], ['m', 'Deux colonnes'], ['g', 'Toute la largeur']].filter(([x]) => x !== taille).map(([x, l]) => ({ libelle: l, faire: clic(`[data-tb-taille="${x}"]`) })),
      { separateur: true }, $('[data-tb-deplacer="-1"]:not([disabled])', sec) ? { libelle: 'Avancer', faire: clic('[data-tb-deplacer="-1"]'), icone: ICO.gauche } : null,
      $('[data-tb-deplacer="1"]:not([disabled])', sec) ? { libelle: 'Reculer', faire: clic('[data-tb-deplacer="1"]'), icone: ICO.droite } : null,
      { libelle: 'Masquer la tuile', faire: clic('[data-tb-masquer]'), icone: ICO.cache }, { libelle: 'Personnaliser le tableau…', faire: () => { if ($('#tb-personnaliser')?.getAttribute('aria-pressed') !== 'true') $('#tb-personnaliser')?.click(); }, icone: ICO.reglages }];
  }
  function actionsActionRapide(b) {
    const href = b.getAttribute('href'), k = b.dataset.action;
    return [href && href.startsWith('#') ? ouvrirA(href) : null, href ? { libelle: 'Ouvrir dans un nouvel onglet', href: absolu(href), externe: true, icone: ICO.externe } : null,
      k && typeof TABLEAU !== 'undefined' && TABLEAU.retirerAction ? { libelle: 'Retirer des actions rapides', detail: 'les réglages de la tuile les remettent', faire: () => TABLEAU.retirerAction(k), icone: ICO.moins } : null];
  }

  // ===================================================================================================== ce qu'un élément désigne
  // une ligne de liste, une ligne du tableau de bord, une carte : la date, la personne, le lieu… qu'elle désigne, par ses
  // attributs (data-date, data-personne…) ou par son adresse
  function objetDe(el) {
    const d = el.dataset, href = el.getAttribute('href') || '';
    let id;
    if ((id = idDe(el, 'frais', /^$/)) != null && d.frais != null) { const f = (E.frais || []).find(x => x.id === id); return f && { type: 'frais', f }; }
    if ((id = idDe(el, 'prospect', /^$/)) != null && d.prospect != null) { const p = (E.prospects || []).find(x => x.id === id); return p && { type: 'prospect', p }; }
    if (d.prospectId != null) { const p = (E.prospects || []).find(x => x.id === +d.prospectId); return p && { type: 'prospect', p }; }
    if ((id = idDe(el, 'devis', /^#\/diffusion\/devis\/(\d+)$/)) != null) { const v = (E.devis || []).find(x => x.id === id); return v && { type: 'devis', v }; }
    if ((id = idDe(el, 'acces', /^#\/pro\/(\d+)$/)) != null) { const a = (E.acces || []).find(x => x.id === id); return a && { type: 'acces', a }; }
    if ((id = idDe(el, 'proposition', /^#\/planning\/proposition\/(\d+)$/)) != null) { const p = (E.propositions || []).find(x => +x.id === id); return p && { type: 'proposition', p }; }
    if ((id = idDe(el, 'seance', /^#\/ateliers\/seances\/(\d+)$/)) != null) { const s = E.seances.find(x => x.id === id); return s && { type: 'seance', s }; }
    if ((id = idDe(el, 'feuille', /^#\/feuilles\/(\d+)$/)) != null) { const dd = E.dates.find(x => x.id === id); return dd && { type: 'feuille', d: dd }; }
    if ((id = idDe(el, 'date', /^#\/representations\/(\d+)$/)) != null) { const dd = E.dates.find(x => x.id === id); return dd && { type: 'date', d: dd }; }
    if ((id = idDe(el, 'personne', /^#\/equipe\/(\d+)$/)) != null) { const p = (E.personnes || []).find(x => x.id === id); return p && { type: 'personne', p }; }
    if ((id = idDe(el, 'lieu', /^#\/lieux\/(\d+)$/)) != null) { const l = lieu(id); return l && { type: 'lieu', l }; }
    const ms = href.match(/^#\/spectacles\/([a-z0-9-]+)$/);
    if (ms) { const s = E.spectacles.find(x => x.slug === ms[1]); return s && { type: 'spectacle', s }; }
    return null;
  }
  const titreObjet = o => {
    if (!o) return '';
    switch (o.type) {
      case 'date': case 'feuille': return `${spectacle(o.d.spectacle_id)?.titre || 'Date'} · ${jourCourt(o.d.debut)}`;
      case 'personne': return nomDe(o.p); case 'lieu': return o.l.nom || o.l.commune; case 'devis': return o.v.structure_nom; case 'prospect': return o.p.structure;
      case 'frais': return `Note de frais · ${euros(o.f.montant_ttc)}`; case 'acces': return o.a.nom; case 'proposition': return o.p.titre; case 'seance': return `Séance · ${jourCourt(o.s.jour)}`; case 'spectacle': return o.s.titre;
      default: return '';
    }
  };
  function actionsObjet(o, el) {
    switch (o.type) {
      case 'date': return actionsDate(o.d, el); case 'feuille': return actionsFeuille(o.d); case 'personne': return actionsPersonne(o.p); case 'lieu': return actionsLieu(o.l);
      case 'devis': return actionsDevis(o.v); case 'prospect': return actionsProspect(o.p, el); case 'frais': return actionsFrais(o.f); case 'acces': return actionsAcces(o.a);
      case 'proposition': return actionsProposition(o.p); case 'seance': return actionsSeance(o.s); case 'spectacle': return actionsSpectacle(o.s, el);
      default: return [];
    }
  }

  // ===================================================================================================== les fournisseurs
  // les lignes des listes et du tableau de bord, les cartes des spectacles et du Kanban
  // une ligne « à traiter » du tableau de bord : la traiter sur place, l'épingler en haut, la reporter (demain, lundi, dans une semaine)
  function actionsUrgence(el) {
    const cle = el.dataset.cle; if (!cle || typeof TABLEAU === 'undefined' || !TABLEAU.traiter) return [];
    const bloc = el.closest('.tb-lt'), epinglee = !!bloc?.classList.contains('epingle'), reportee = !!bloc?.classList.contains('reportee'), b = bloc?.querySelector('[data-traiter]');
    return [b ? { libelle: 'Traiter…', detail: 'sans quitter le tableau', icone: ICO.coche, raccourci: 'Entrée', faire: () => TABLEAU.traiter(cle) } : null,
      { libelle: epinglee ? 'Désépingler' : 'Épingler en haut', icone: epinglee ? ICO.moins : ICO.plus, faire: () => TABLEAU.epingler(cle) },
      reportee ? { libelle: 'Ne plus reporter', icone: ICO.croix, faire: () => TABLEAU.reporter(cle, null) } : null,
      ...TABLEAU.REPORTS().map(([, l, j]) => ({ libelle: `Me le rappeler ${l.toLowerCase()}`, detail: jourCourt(j), icone: ICO.agenda, faire: () => TABLEAU.reporter(cle, j) })),
      { separateur: true }];
  }
  // une ligne du fil des modifications : annuler (un quart d'heure), le journal
  function actionsFil(el) {
    const id = el.dataset.j; if (!id || typeof TABLEAU === 'undefined') return [];
    const b = el.closest('.tb-lt')?.querySelector('[data-tb-annuler]');
    return [b ? { libelle: 'Annuler cette modification', detail: 'la ligne revient comme avant', icone: ICO.croix, danger: true, faire: () => TABLEAU.annulerJournal(id) } : null, { libelle: 'Le journal', href: '#/journal', icone: ICO.ouvrir }, { separateur: true }];
  }
  G.menu({ cible: 'a.ligne[href], a.tb-l[href], a.carte-sp[href], .crm-carte[data-prospect-id]', titre: el => titreObjet(objetDe(el)) || (el.dataset.j ? 'Modification' : ''),
    actions: el => { const avant = [...actionsUrgence(el), ...actionsFil(el)]; const o = objetDe(el); if (o) return [...avant, ...actionsObjet(o, el)]; const href = el.getAttribute('href'); return [...avant, ...(href && href.startsWith('#/') ? [ouvrirA(href), ...liens(href)] : [])]; } });
  G.menu({ cible: '.journal-ligne', titre: 'Journal', actions: actionsJournal });
  G.menu({ cible: '.tb-tuile', titre: sec => (typeof TABLEAU !== 'undefined' && TABLEAU.TUILES[sec.dataset.k]?.titre) || 'Tuile',
    actions: (sec, infos) => { const b = infos && infos.x != null ? document.elementFromPoint(infos.x, infos.y) : null; return b && b.closest('.tb-actions .btn') ? actionsActionRapide(b.closest('.tb-actions .btn')) : b && b.closest('a.tb-l') ? [] : actionsTuile(sec); } });
  G.menu({ cible: '.tb-actions .btn', titre: 'Action rapide', actions: actionsActionRapide });
  G.menu({ cible: '.tb-sp', titre: el => $('.tb-l-t', el)?.textContent || 'Spectacle', actions: el => { const s = E.spectacles.find(x => `#/spectacles/${x.slug}` === $('a.tb-l-t', el)?.getAttribute('href')); return s ? actionsSpectacle(s, el) : []; } });
  // les flèches dans toutes les listes
  G.fleches(document, 'a.ligne[href], a.tb-l[href], a.carte-sp[href]');

  // ===================================================================================================== le Kanban : glisser une carte
  // une carte de la diffusion se glisse d'une colonne à l'autre (à la souris) : l'étape change, comme avec ses flèches
  document.addEventListener('dragstart', e => {
    const c = e.target.closest?.('.crm-carte[data-prospect-id]');
    if (!c) return;
    try { e.dataTransfer.setData('text/plain', c.dataset.prospectId); e.dataTransfer.effectAllowed = 'move'; } catch (err) { /* vieux navigateur */ }
    c.classList.add('glisse'); c.dataset.glisse = '1';
  });
  document.addEventListener('dragover', e => {
    const col = e.target.closest?.('.crm-colonne[data-colonne]'), c = $('.crm-carte[data-glisse]');
    if (!col || !c) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    $$('.crm-colonne.cible').forEach(x => { if (x !== col) x.classList.remove('cible'); });
    col.classList.add('cible');
  });
  document.addEventListener('dragleave', e => { const col = e.target.closest?.('.crm-colonne'); if (col && !col.contains(e.relatedTarget)) col.classList.remove('cible'); });
  document.addEventListener('drop', e => {
    const col = e.target.closest?.('.crm-colonne[data-colonne]'), c = $('.crm-carte[data-glisse]');
    if (!col || !c) return;
    e.preventDefault();
    const id = +c.dataset.prospectId, p = (E.prospects || []).find(x => x.id === id);
    $$('.crm-colonne.cible').forEach(x => x.classList.remove('cible'));
    c.classList.remove('glisse'); delete c.dataset.glisse;
    if (p && p.etape !== col.dataset.colonne) deplacerProspect(id, col.dataset.colonne);
  });
  document.addEventListener('dragend', () => { $$('.crm-carte[data-glisse]').forEach(c => { c.classList.remove('glisse'); delete c.dataset.glisse; }); $$('.crm-colonne.cible').forEach(x => x.classList.remove('cible')); });

  // ===================================================================================================== précédent / suivant
  // dans une fiche ouverte à côté de sa liste : la ligne d'avant, celle d'après (dans l'ordre de la liste, filtres compris) ;
  // une feuille de route ou un spectacle n'ont pas de liste à côté : l'ordre est celui des dates, des spectacles
  function voisins(h) {
    const anchors = $$('#vue [data-liste] a.ligne[href]');
    if (anchors.some(a => a.getAttribute('href') === h)) return anchors.map(a => ({ href: a.getAttribute('href'), titre: ($('.t', a) || a).textContent.trim().replace(/\s+/g, ' ') }));
    if (/^#\/feuilles\/\d+$/.test(h) && E.equipeInstallee) {
      const avenir = E.dates.filter(d => (d.fin || d.debut) >= AUJ).sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : a.id - b.id)), passees = E.dates.filter(d => (d.fin || d.debut) < AUJ).sort((a, b) => (a.debut < b.debut ? 1 : a.debut > b.debut ? -1 : b.id - a.id));
      return [...avenir, ...passees].map(d => ({ href: `#/feuilles/${d.id}`, titre: `${spectacle(d.spectacle_id)?.titre || 'Date'} · ${jourCourt(d.debut)}` }));
    }
    if (/^#\/spectacles\/[a-z0-9-]+$/.test(h)) return [...E.spectacles.filter(s => s.page).sort((a, b) => a.ordre - b.ordre), ...E.spectacles.filter(s => !s.page)].map(s => ({ href: `#/spectacles/${s.slug}`, titre: s.titre }));
    return [];
  }
  function poserPrecSuiv() {
    const vue = $('#vue');
    if (!vue) return;
    const h = location.hash, tete = $('.editeur .titre-ed, .titre-ed', vue);
    $$('.gps', vue).forEach(x => { if (!tete || !tete.contains(x)) x.remove(); });
    if (!tete) return;
    const xs = voisins(h), i = xs.findIndex(x => x.href === h);
    const deja = $('.gps', tete);
    if (i < 0) { deja?.remove(); return; }
    const html = G.precSuiv({ prec: xs[i - 1] || null, suiv: xs[i + 1] || null, libelle: x => x.titre, nom: 'Fiche précédente, fiche suivante' });
    if (deja) deja.outerHTML = html; else tete.insertAdjacentHTML('beforeend', html);
  }
  // le clic recalcule les voisins à l'instant (la liste a pu changer) ; avant le gestionnaire général de gestes.js
  document.addEventListener('click', e => {
    const b = e.target.closest('#vue .titre-ed [data-gps]');
    if (!b || b.disabled) return;
    const xs = voisins(location.hash), i = xs.findIndex(x => x.href === location.hash), v = xs[i + +b.dataset.gps];
    e.preventDefault();
    if (v) location.hash = v.href;
  }, true);
  G.clavierPrecSuiv(document, { modif: 'alt' });
  if (typeof APRES_VUE !== 'undefined') APRES_VUE.push(poserPrecSuiv);
  let minuteurPs = null;
  new MutationObserver(() => { if ($('#vue .titre-ed') && !$('#vue .titre-ed .gps')) { clearTimeout(minuteurPs); minuteurPs = setTimeout(poserPrecSuiv, 60); } }).observe(document.body, { childList: true, subtree: true });

  // ===================================================================================================== styles
  document.head.insertAdjacentHTML('beforeend', `<style id="styles-menus">
.titre-ed .gps { margin-top: 1px; }
.crm-carte[draggable="true"] { cursor: grab; }
.crm-carte.glisse { opacity: .45; }
.crm-colonne.cible { outline: 2px dashed var(--accent); outline-offset: -2px; background: var(--accent-doux); }
.crm-carte-actions .btn { min-width: 30px; }
</style>`);
})();
