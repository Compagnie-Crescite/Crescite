'use strict';
/* La tournée vue par l'équipe : dix idées de plus dans l'espace de l'équipe (equipe/equipe.js), posées par ses crochets
   (window.CRESCITE_EQUIPE : l'état, la base, les outils ; window.CRESCITE_EXT : ce que ce fichier offre aux vues).
   Chargé après equipe.js ; sans lui, l'application marche comme avant. Le seizième script
   (supabase/migrations/20261104_crescite_tournee.sql) porte les présences, le fil, les trajets, les check-lists et les
   créneaux ; sans lui, chaque bloc le dit et le reste (le direct, l'équipe du soir, le hors-ligne, le compteur, les
   frais) marche quand même.
   1. Le direct du jour J (#/direct/<id>) : l'étape en cours, la suivante, le rideau dans…, écran sombre et allumé.
   2. « Je serai là » / « Je ne pourrai pas » sur une date, « J'ai lu » sur sa feuille de route (crescite_presences).
   3. Le fil de la date : messages, mentions, photos (crescite_fil) ; l'équipe est prévenue.
   4. Trajets et covoiturage (crescite_trajets) : d'où, quand, combien de places ; « Je monte ».
   5. Ma check-list par date, et mon modèle (crescite_checklists) ; cochée sans réseau, écrite dès qu'il revient.
   6. Mon compteur (#/compteur) : cachets, dates, par saison ; un CSV, une attestation.
   7. Les frais sans friction : le kilométrage calculé de ma ville au lieu, le barème, le récapitulatif mensuel.
   8. Tout emporter hors connexion : « Prendre avec moi » une date (ses documents, sa feuille) sur l'appareil.
   9. Répondre d'un tap aux propositions depuis la notification, les rappels, mes créneaux libres (crescite_creneaux).
   10. L'équipe du soir (#/equipe/<id>) : visages, rôles, téléphones (crescite_equipe_du_jour), SMS et mail groupés,
       le lieu, les photos du fil prises dans ce lieu. */
(() => {
  const A = window.CRESCITE_EQUIPE;
  if (!A) return;
  const { E, sb, $, $$, esc, txt, ICONES, annoncer, vibrer, reduit, ouvrirModale, aujourdhui, iso, joursDe, finDe, vivante, natureDe, quandTexte, jourSansAn, jourLong, heureTexte, h5, estJour,
    momentTexte, majuscule, pluriel, nomDe, avatar, quiPart, lignesPlanning, attrU, itineraire, documentsDe, documentPrive, signerUn, lireStock, ecrireStock, SEAU, repondre, enAttente, REPONSES, texteJours,
    router, contexte, outilFeuille, chargerFeuille, euros, saisonDe, motsErreur, titreDate, CAT_FRAIS } = A;
  const EXT = window.CRESCITE_EXT = {};
  const G = () => (typeof A.formulaire === 'function' ? A.formulaire() : null);
  const STOCK = 'crescite-equipe-tournee', ATTENTE = 'crescite-equipe-attente', EMPORTE = 'crescite-equipe-emportees';
  const moi = () => E.moi;
  const dateDe = id => E.dates.find(x => x.id === Number(id));
  const absente = e => !!e && /PGRST205|42P01|schema cache|does not exist|crescite_(presences|fil|trajets|checklists|creneaux|equipe_du_jour|trajet_monter)/i.test(`${e.code || ''} ${e.message || ''} ${e.hint || ''}`);
  const T = { etat: 'inconnu', presences: [], trajets: [], checklists: [], fil: new Map(), coordonnees: new Map(), direct: null, veille: null };
  const garder = () => ecrireStock(STOCK, { presences: T.presences, trajets: T.trajets, checklists: T.checklists, quand: Date.now() });
  (() => { const m = lireStock(STOCK); if (m && typeof m === 'object') Object.assign(T, { presences: m.presences || [], trajets: m.trajets || [], checklists: m.checklists || [] }); })();
  const avecScript = () => T.etat !== 'absent';
  const PAS_INSTALLE = '<p class="aide">Bientôt dans l’application : la compagnie met en place le seizième script (20261104_crescite_tournee.sql).</p>';
  const ic = (d, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
  const I = { ...ICONES, direct: ic('<circle cx="12" cy="12" r="3"/><path d="M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13M8.3 8.3a5 5 0 0 0 0 7.4M15.7 8.3a5 5 0 0 1 0 7.4"/>'),
    main: ic('<path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V11m0-6a1.5 1.5 0 0 1 3 0v6m0-4.5a1.5 1.5 0 0 1 3 0V11m0-2a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8L4 15a1.6 1.6 0 0 1 2.5-2L7 14"/>'),
    voiture: ic('<path d="M5 16l1.5-5.5A2 2 0 0 1 8.4 9h7.2a2 2 0 0 1 1.9 1.5L19 16"/><rect x="3.5" y="16" width="17" height="4" rx="1.5"/><circle cx="7.5" cy="20" r="1"/><circle cx="16.5" cy="20" r="1"/>'),
    train: ic('<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 10h14M9 21l1.5-4M15 21l-1.5-4M9 14h.01M15 14h.01"/>'),
    liste: ic('<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/>'),
    telecharge: ic('<path d="M12 4v11m0 0 4-4m-4 4-4-4M4 19h16"/>'),
    sms: ic('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>'),
    compteur: ic('<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18 15 11"/><circle cx="12" cy="18" r="1.4"/>') };
  const sansAccent = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const telLien = t => { const c = String(t || '').replace(/[^\d+]/g, ''); return c ? `tel:${/^0\d{9}$/.test(c) ? `+33${c.slice(1)}` : c}` : ''; };
  const telTexte = t => { const c = String(t || '').replace(/[^\d+]/g, ''); return /^0\d{9}$/.test(c) ? c.replace(/(\d{2})(?=\d)/g, '$1 ') : t || ''; };
  const km = (a, b) => { if (!(a && b && a.latitude != null && a.longitude != null && b.latitude != null && b.longitude != null)) return null; const r = x => x * Math.PI / 180, R = 6371, dLat = r(b.latitude - a.latitude), dLon = r(b.longitude - a.longitude), h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  const gensDe = d => (vivante(d) ? quiPart(d) : []);
  const personneDe = (d, pid) => gensDe(d).find(g => Number(g.id) === Number(pid)) || null;
  const nomCourt = (d, pid) => { const g = personneDe(d, pid); return g ? g.nom : Number(pid) === moi() ? nomDe(E.personne) : 'Quelqu’un'; };
  const avatarDe = (d, pid) => { const g = personneDe(d, pid); return avatar(g && g.personne ? g.personne : Number(pid) === moi() ? E.personne : { prenom: '', nom: '?' }, { taille: 'mini' }); };
  const section = (id, titre, icone, corps, sp) => `<section class="bloc tn-bloc" id="${id}"${attrU(sp || {})} aria-labelledby="${id}-t"><h2 id="${id}-t">${icone}${titre}</h2>${corps}</section>`;
  // la file d'attente des écritures faites sans réseau (les check-lists, les présences) : rejouée dès que le réseau revient
  const attente = () => lireStock(ATTENTE, []) || [];
  const mettreEnAttente = x => ecrireStock(ATTENTE, [...attente().filter(y => y.cle !== x.cle), x]);
  async function rejouer() {
    const xs = attente(); if (!xs.length || !navigator.onLine) return;
    ecrireStock(ATTENTE, null);
    for (const x of xs) { try { const { error } = await sb.from(x.table).upsert(x.ligne, { onConflict: x.conflit }); if (error) throw error; } catch (e) { mettreEnAttente(x); } }
  }
  window.addEventListener('online', () => { rejouer(); });

  // ================================================================================================ la lecture
  // après la tournée (equipe.js, charger) : les présences, les trajets et les check-lists de mes dates à venir, d'un coup
  EXT.apresCharger = async () => {
    if (moi() == null) return;
    const auj = aujourdhui(), ids = E.dates.filter(d => finDe(d) >= auj || finDe(d) >= iso(new Date(Date.now() - 30 * 864e5))).map(d => d.id);
    if (!ids.length) { T.etat = T.etat === 'absent' ? 'absent' : 'ok'; return; }
    const r1 = await sb.from('crescite_presences').select('*').in('date_id', ids);
    if (r1.error) { if (absente(r1.error)) T.etat = 'absent'; return; }
    T.etat = 'ok'; T.presences = r1.data || [];
    const [r2, r3] = await Promise.all([sb.from('crescite_trajets').select('*').in('date_id', ids).order('jour').order('heure'), sb.from('crescite_checklists').select('*').eq('personne_id', moi())]);
    if (!r2.error) T.trajets = r2.data || [];
    if (!r3.error) T.checklists = r3.data || [];
    garder();
    rejouer();
  };
  const presence = (dateId, pid = moi()) => T.presences.find(x => Number(x.date_id) === Number(dateId) && Number(x.personne_id) === Number(pid)) || null;
  const presencesDe = dateId => T.presences.filter(x => Number(x.date_id) === Number(dateId));

  // ================================================================================================ 2 · je serai là, j'ai lu
  async function ecrirePresence(d, changements) {
    const avant = presence(d.id), ligne = { date_id: d.id, personne_id: moi(), statut: avant?.statut || null, motif: avant?.motif || null, feuille_lue_version: avant?.feuille_lue_version || null, feuille_lue_le: avant?.feuille_lue_le || null, ...changements };
    T.presences = T.presences.filter(x => !(Number(x.date_id) === d.id && Number(x.personne_id) === moi())).concat([ligne]); garder();
    if (!navigator.onLine) { mettreEnAttente({ cle: `presence:${d.id}`, table: 'crescite_presences', ligne, conflit: 'date_id,personne_id' }); return true; }
    const { error } = await sb.from('crescite_presences').upsert(ligne, { onConflict: 'date_id,personne_id' });
    if (error) { if (absente(error)) { T.etat = 'absent'; annoncer('Les présences ne sont pas encore installées dans la base.', { erreur: true }); } else { mettreEnAttente({ cle: `presence:${d.id}`, table: 'crescite_presences', ligne, conflit: 'date_id,personne_id' }); annoncer(`Gardé sur l’appareil, écrit dès que le réseau revient (${motsErreur(error)}).`); } return false; }
    return true;
  }
  function blocPresence(d) {
    const p = presence(d.id), gens = gensDe(d), xs = presencesDe(d.id), ids = new Set(gens.map(g => Number(g.id)));
    const oui = xs.filter(x => x.statut === 'present' && ids.has(Number(x.personne_id))), non = xs.filter(x => x.statut === 'absent' && ids.has(Number(x.personne_id)));
    const corps = !avecScript() ? PAS_INSTALLE : `<div class="choix-presence" role="group" aria-label="Votre présence">
        <button type="button" class="btn${p?.statut === 'present' ? ' principal fait' : ''}" data-presence="present" aria-pressed="${p?.statut === 'present'}">${I.coche}Je serai là</button>
        <button type="button" class="btn${p?.statut === 'absent' ? ' danger' : ''}" data-presence="absent" aria-pressed="${p?.statut === 'absent'}">${I.croix}Je ne pourrai pas</button></div>
      ${p?.statut === 'absent' && p.motif ? `<p class="aide">Votre motif : ${esc(p.motif)}</p>` : ''}
      <p class="etat-presence">${oui.length ? `<span class="mini-equipe">${oui.slice(0, 6).map(x => avatarDe(d, x.personne_id)).join('')}</span> ` : ''}${gens.length ? `<b>${oui.length}</b> sur ${gens.length} ${oui.length > 1 ? 'ont confirmé' : 'a confirmé'}` : 'L’équipe de la date n’est pas encore indiquée'}${non.length ? ` · ${non.map(x => nomCourt(d, x.personne_id)).join(', ')} ne ${non.length > 1 ? 'pourront' : 'pourra'} pas` : ''}</p>`;
    return section(`presence-${d.id}`, 'Serez-vous là ?', I.main, corps, d.spectacle);
  }
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-presence]'); if (!b) return;
    const sec = b.closest('[id^="presence-"]'), d = sec && dateDe(sec.id.slice(9)); if (!d) return;
    const statut = b.dataset.presence;
    let motif = presence(d.id)?.motif || null;
    if (statut === 'absent') {
      const Gf = G();
      if (Gf) { const v = await Gf.formulaire({ titre: 'Je ne pourrai pas', sousTitre: titreDate(d), champs: [{ k: 'motif', t: 'long', l: 'Un mot pour l’administration (facultatif)', valeur: motif || '', lignes: 3, ph: 'Un autre engagement, un souci de santé…' }], ok: 'Prévenir', enregistrer: async () => true }); if (!v) return; motif = txt(v.motif) || null; }
    }
    b.disabled = true;
    await ecrirePresence(d, { statut, motif: statut === 'absent' ? motif : null });
    vibrer(10);
    annoncer(statut === 'present' ? 'C’est noté : vous serez là.' : 'C’est noté : l’administration le voit.');
    sec.outerHTML = blocPresence(d);
  });
  EXT.etiquettes = d => { const p = presence(d.id); return [p?.statut === 'present' ? '<span class="etat ok-presence">Vous serez là</span>' : p?.statut === 'absent' ? '<span class="etat annulee">Vous ne serez pas là</span>' : null, emportee(d.id) ? '<span class="etat emportee">Sur l’appareil</span>' : null]; };
  EXT.actionsBillet = (d, { passee, vive }) => {
    if (passee || !vive) return [];
    const p = presence(d.id);
    return [avecScript() && p?.statut !== 'present' ? { libelle: 'Je serai là', icone: I.coche, faire: async () => { await ecrirePresence(d, { statut: 'present', motif: null }); annoncer('C’est noté : vous serez là.'); router({ rafraichir: true }); } } : null,
      joursDe(d).includes(aujourdhui()) ? { libelle: 'Le direct du jour J', detail: 'l’étape en cours, le rideau dans…', href: `#/direct/${d.id}`, icone: I.direct } : null,
      { libelle: 'L’équipe du soir', detail: 'visages, téléphones, le lieu', href: `#/equipe/${d.id}`, icone: I.equipe },
      { libelle: emportee(d.id) ? 'Retirer de l’appareil' : 'Prendre avec moi', detail: emportee(d.id) ? 'ses documents et sa feuille' : 'ses documents et sa feuille, sans réseau', icone: I.telecharge, faire: () => basculerEmport(d) }];
  };
  // la feuille de route : « J'ai lu » (la version), et qui l'a lue
  EXT.blocsFeuille = (d, f) => {
    if (!d || !f) return '';
    const p = presence(d.id), lue = p && p.feuille_lue_version >= (f.version || 1), gens = gensDe(d), ids = new Set(gens.map(g => Number(g.id)));
    const lecteurs = presencesDe(d.id).filter(x => x.feuille_lue_version >= (f.version || 1) && ids.has(Number(x.personne_id)));
    const corps = !avecScript() ? PAS_INSTALLE : `<p class="lu-ligne"><button type="button" class="btn${lue ? ' principal fait' : ' principal'}" data-feuille-lue="${d.id}" data-version="${f.version || 1}"${lue ? ' disabled' : ''}>${I.coche}${lue ? `Lue${p.feuille_lue_le ? ` ${esc(momentTexte(p.feuille_lue_le))}` : ''}` : `J’ai lu cette feuille (v${f.version || 1})`}</button>
      <span class="aide">${gens.length ? `${lecteurs.length} sur ${gens.length} l’${lecteurs.length > 1 ? 'ont' : 'a'} lue` : ''}${lecteurs.length ? ` : ${lecteurs.map(x => nomCourt(d, x.personne_id)).join(', ')}` : ''}</span></p>`;
    return section(`lu-${d.id}`, 'Lu et approuvé', I.lire, corps + blocTrajetsFeuille(d), d.spectacle);
  };
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-feuille-lue]'); if (!b) return;
    const d = dateDe(b.dataset.feuilleLue); if (!d) return;
    b.disabled = true;
    await ecrirePresence(d, { feuille_lue_version: Number(b.dataset.version), feuille_lue_le: new Date().toISOString() });
    vibrer(10); annoncer('Merci : l’administration sait que vous l’avez lue.');
    const f = E.feuilles.get(d.id); const sec = $(`#lu-${d.id}`); if (sec && f) sec.outerHTML = EXT.blocsFeuille(d, f);
  });

  // ================================================================================================ 1 · le direct du jour J
  function etapesDuJour(d) {
    const auj = aujourdhui(), f = E.feuilles.get(d.id);
    let xs = lignesPlanning(d, f).filter(x => x.jour === auj || (!x.jour && joursDe(d).length === 1));
    if (!xs.length) xs = d.representations.filter(r => r.jour === auj && !r.annulee).map(r => ({ jour: r.jour, heure: h5(r.heure), fin: h5(r.fin), quoi: 'Représentation', rep: true }));
    return xs.filter(x => x.heure).map(x => ({ ...x, m: +x.heure.slice(0, 2) * 60 + +x.heure.slice(3, 5), mf: x.fin ? +x.fin.slice(0, 2) * 60 + +x.fin.slice(3, 5) : null })).sort((a, b) => a.m - b.m);
  }
  const dureeTexte = m => (m < 1 ? 'maintenant' : m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)} h${m % 60 >= 1 ? ` ${String(Math.round(m % 60)).padStart(2, '0')}` : ''}`);
  function htmlDirect(d) {
    const now = new Date(), m = now.getHours() * 60 + now.getMinutes(), xs = etapesDuJour(d), auj = aujourdhui();
    const reps = d.representations.filter(r => r.jour === auj && !r.annulee && r.heure).map(r => +h5(r.heure).slice(0, 2) * 60 + +h5(r.heure).slice(3, 5)).sort((a, b) => a - b);
    const prochainRideau = reps.find(r => r > m), enCours = reps.some(r => r <= m && m < r + 120), fini = reps.length && !prochainRideau && !enCours;
    let courante = null, suivante = null;
    xs.forEach((x, i) => { const fin = x.mf != null && x.mf > x.m ? x.mf : xs[i + 1] ? xs[i + 1].m : x.m + 60; if (x.m <= m && m < fin) courante = x; if (!suivante && x.m > m) suivante = x; });
    const l = d.lieu, f = E.feuilles.get(d.id), contacts = (f && f.contenu && Array.isArray(f.contenu.contacts) ? f.contenu.contacts : []).filter(c => c && c.telephone);
    const regie = contacts.find(c => /r[ée]gie|technique|plateau/i.test(`${c.role || ''} ${c.nom || ''}`)) || contacts[0];
    return `<div class="direct" data-direct="${d.id}"${attrU(d.spectacle || {})}>
      <p class="direct-sur">${I.direct}En direct · ${esc(d.spectacle?.titre || '')}${l ? ` · ${esc(l.commune || l.nom || '')}` : ''}</p>
      <div class="direct-rideau"><span class="direct-lib">${fini ? 'C’est joué' : enCours && !prochainRideau ? 'Rideau levé' : prochainRideau ? 'Rideau dans' : enCours ? 'Rideau levé · le prochain dans' : 'Pas de séance à heure dite aujourd’hui'}</span>
        ${prochainRideau ? `<b class="direct-compte">${esc(dureeTexte(prochainRideau - m))}</b><span class="direct-heure">à ${esc(heureTexte(`${String(Math.floor(prochainRideau / 60)).padStart(2, '0')}:${String(prochainRideau % 60).padStart(2, '0')}`))}</span>` : fini ? '<b class="direct-compte">Bravo</b>' : ''}</div>
      ${courante ? `<div class="direct-etape maintenant" aria-current="time"><span class="direct-h">${esc(heureTexte(courante.heure))}</span><span class="direct-t">${esc(courante.quoi)}</span>${courante.qui || courante.ou ? `<span class="direct-s">${esc([courante.qui, courante.ou].filter(Boolean).join(' · '))}</span>` : ''}</div>` : xs.length ? '<div class="direct-etape calme"><span class="direct-t">Entre deux étapes</span></div>' : ''}
      ${suivante ? `<div class="direct-etape suivante"><span class="direct-lib">Ensuite, dans ${esc(dureeTexte(suivante.m - m))}</span><span class="direct-h">${esc(heureTexte(suivante.heure))}</span><span class="direct-t">${esc(suivante.quoi)}</span></div>` : ''}
      ${xs.length ? `<ol class="direct-frise">${xs.map(x => `<li class="${x === courante ? 'maintenant' : x.m < m ? 'passe' : ''}"><span>${esc(heureTexte(x.heure))}</span><span>${esc(x.quoi)}</span></li>`).join('')}</ol>` : '<p class="direct-aide">Le planning du jour viendra avec la feuille de route.</p>'}
      <div class="direct-gestes">
        ${regie ? `<a class="btn large" href="${esc(telLien(regie.telephone))}">${I.cloche}Appeler ${esc(regie.nom || regie.role || 'la régie')}</a>` : ''}
        ${l && itineraire(l) ? `<a class="btn large" href="${esc(itineraire(l))}" target="_blank" rel="noopener">${I.route}Itinéraire</a>` : ''}
        <a class="btn large" href="#/equipe/${d.id}">${I.equipe}L’équipe du soir</a>
        ${d.feuille ? `<a class="btn large" href="#/feuille/${d.id}">${I.feuille}La feuille de route</a>` : ''}
        <a class="btn large" href="#/date/${d.id}">${I.agenda}La date</a></div>
      <p class="direct-veille"><button type="button" class="btn petit" data-veille aria-pressed="${!!T.veille}">${I.horloge}${T.veille ? 'Écran gardé allumé' : 'Garder l’écran allumé'}</button></p></div>`;
  }
  async function veiller(oui) {
    try {
      if (oui && 'wakeLock' in navigator && !T.veille) { T.veille = await navigator.wakeLock.request('screen'); T.veille.addEventListener('release', () => { T.veille = null; const b = $('[data-veille]'); if (b) { b.setAttribute('aria-pressed', 'false'); b.innerHTML = `${I.horloge}Garder l’écran allumé`; } }); }
      else if (!oui && T.veille) { await T.veille.release(); T.veille = null; }
    } catch (e) { T.veille = null; }
    const b = $('[data-veille]'); if (b) { b.setAttribute('aria-pressed', String(!!T.veille)); b.innerHTML = `${I.horloge}${T.veille ? 'Écran gardé allumé' : 'Garder l’écran allumé'}`; }
  }
  function vueDirect(r, { focus }) {
    const d = dateDe(r.id);
    if (!d) return A.afficher(r, 'En direct', `<div class="titre-vue"><h1>En direct</h1></div><p class="message erreur" role="alert">Cette date n’est pas (ou plus) dans votre tournée.</p>`, { focus });
    document.documentElement.classList.add('direct-ouvert');
    A.afficher(r, `En direct · ${d.spectacle?.titre || ''}`, `<h1 class="sr">En direct : ${esc(titreDate(d))}</h1>${htmlDirect(d)}`, { focus });
    clearInterval(T.direct); T.direct = setInterval(() => { const z = $(`[data-direct="${d.id}"]`); if (!z) { clearInterval(T.direct); return; } z.outerHTML = htmlDirect(d); }, 30000);
    veiller(true);
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-veille]'); if (b) veiller(!T.veille); });
  window.addEventListener('hashchange', () => { if (!/^#\/direct\//.test(location.hash)) { document.documentElement.classList.remove('direct-ouvert'); clearInterval(T.direct); veiller(false); } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && /^#\/direct\//.test(location.hash)) veiller(true); });
  EXT.jourJ = d => `<a class="btn petit principal" href="#/direct/${d.id}">${I.direct}Le direct</a>`;
  EXT.gestesDate = (d, { passee, vive }) => (!vive ? [] : [joursDe(d).includes(aujourdhui()) ? `<a class="geste" href="#/direct/${d.id}">${I.direct}<span>Direct</span><span class="sr"> du jour J</span></a>` : '',
    `<a class="geste" href="#/equipe/${d.id}">${I.equipe}<span>Équipe</span><span class="sr"> du soir : visages, téléphones, le lieu</span></a>`,
    passee ? '' : `<button type="button" class="geste${emportee(d.id) ? ' fait' : ''}" data-emporter="${d.id}" aria-pressed="${emportee(d.id)}">${I.telecharge}<span>${emportee(d.id) ? 'Emportée' : 'Emporter'}</span><span class="sr"> : ses documents et sa feuille sur l’appareil</span></button>`]);

  // ================================================================================================ 10 · l'équipe du soir et le lieu
  async function coordonneesDe(d) {
    if (T.coordonnees.has(d.id)) return T.coordonnees.get(d.id);
    let xs = null;
    if (avecScript()) { const { data, error } = await sb.rpc('crescite_equipe_du_jour', { d: d.id }); if (!error && Array.isArray(data)) xs = data; else if (error && absente(error)) T.etat = 'absent'; }
    if (!xs) { const f = E.feuilles.get(d.id); xs = (f && f.contenu && Array.isArray(f.contenu.equipe) ? f.contenu.equipe : []).map(x => ({ personne_id: x.personne_id, telephone: x.telephone || '', email: '' })); }
    T.coordonnees.set(d.id, xs);
    return xs;
  }
  function vueEquipe(r, { focus }) {
    const d = dateDe(r.id);
    if (!d) return A.afficher(r, 'L’équipe du soir', `<div class="titre-vue"><h1>L’équipe du soir</h1></div><p class="message erreur" role="alert">Cette date n’est pas (ou plus) dans votre tournée.</p>`, { focus });
    const gens = gensDe(d), l = d.lieu, f = E.feuilles.get(d.id), contacts = (f && f.contenu && Array.isArray(f.contenu.contacts) ? f.contenu.contacts : []).filter(c => c && (c.telephone || c.email));
    const html = `<div class="titre-vue"><h1>L’équipe du soir</h1><p class="sous">${esc(titreDate(d))}</p></div>
      ${section(`eq-gens-${d.id}`, `Qui est là <span class="compte-nb">· ${gens.length}</span>`, I.equipe, gens.length ? `<ul class="portraits soir" data-date="${d.id}">${gens.map(g => `<li data-personne="${g.id}">${avatar(g.personne || { prenom: g.nom.split(' ')[0], nom: g.nom.split(' ').slice(1).join(' ') })}<span class="qui"><b>${esc(g.nom || 'Une personne')}${Number(g.id) === moi() ? ' <span class="vous">vous</span>' : ''}</b>${g.fonctions.length ? `<span>${esc(g.fonctions.join(', '))}</span>` : ''}<span class="soir-coord" data-coord="${g.id}"><span class="aide">Coordonnées…</span></span></span></li>`).join('')}</ul>
        <p class="soir-groupe" id="soir-groupe-${d.id}"></p>` : '<p class="aide">L’équipe de cette date n’est pas encore indiquée.</p>', d.spectacle)}
      ${section(`eq-lieu-${d.id}`, 'Le lieu', I.route, l ? `<p class="lieu-nom"><b>${esc(l.nom || l.commune || '')}</b>${l.adresse ? `<br>${esc(l.adresse)}` : ''}${l.commune ? `<br>${esc(l.commune)}${l.departement ? ` (${esc(l.departement)})` : ''}` : ''}</p>
        <p class="soir-gestes">${itineraire(l) ? `<a class="btn petit" href="${esc(itineraire(l))}" target="_blank" rel="noopener">${I.route}Itinéraire</a>` : ''}${l.site_web ? `<a class="btn petit" href="${esc(l.site_web)}" target="_blank" rel="noopener">${I.lien}Site du lieu</a>` : ''}</p>
        ${contacts.length ? `<ul class="soir-contacts">${contacts.map(c => `<li><b>${esc(c.nom || c.role || 'Contact')}</b>${c.role && c.nom ? ` · ${esc(c.role)}` : ''} ${c.telephone ? `<a class="btn-gps" href="${esc(telLien(c.telephone))}">${I.cloche}${esc(telTexte(c.telephone))}</a>` : ''}${c.email ? `<a class="btn-gps" href="mailto:${esc(c.email)}">${I.message}${esc(c.email)}</a>` : ''}</li>`).join('')}</ul>` : '<p class="aide">Les contacts du lieu viennent avec la feuille de route.</p>'}` : '<p class="aide">Lieu à préciser.</p>', d.spectacle)}
      <div id="soir-photos-${d.id}"></div>`;
    A.afficher(r, 'L’équipe du soir', html, { focus });
    coordonneesDe(d).then(xs => {
      if (location.hash !== r.hash) return;
      const tels = [], mels = [];
      gens.forEach(g => {
        const c = xs.find(x => Number(x.personne_id) === Number(g.id)) || {}, z = $(`[data-coord="${g.id}"]`); if (!z) return;
        const tel = txt(c.telephone), mel = txt(c.email);
        if (tel && Number(g.id) !== moi()) tels.push(tel); if (mel && Number(g.id) !== moi()) mels.push(mel);
        z.innerHTML = [tel ? `<a class="btn-gps" href="${esc(telLien(tel))}">${I.cloche}${esc(telTexte(tel))}</a><a class="btn-gps" href="sms:${esc(telLien(tel).slice(4))}">${I.sms}SMS</a>` : '', mel ? `<a class="btn-gps" href="mailto:${esc(mel)}">${I.message}Écrire</a>` : ''].join('') || (Number(g.id) === moi() ? '' : '<span class="aide">pas de coordonnées</span>');
      });
      const g = $(`#soir-groupe-${d.id}`);
      if (g) g.innerHTML = `${tels.length ? `<a class="btn petit principal" href="sms:${esc(tels.map(t => telLien(t).slice(4)).join(','))}">${I.sms}SMS à l’équipe (${tels.length})</a>` : ''}${mels.length ? `<a class="btn petit" href="mailto:?bcc=${esc(mels.join(','))}">${I.message}Mail à l’équipe (${mels.length})</a>` : ''}${!tels.length && !mels.length ? '<span class="aide">Les téléphones viennent avec le seizième script, ou avec la feuille de route.</span>' : ''}`;
    });
    photosDuLieu(d);
  }
  // dans ce lieu, la dernière fois : les photos du fil des dates passées au même endroit
  async function photosDuLieu(d) {
    const z = $(`#soir-photos-${d.id}`); if (!z || !avecScript() || !d.lieu) return;
    const autres = E.dates.filter(x => x.id !== d.id && x.lieu && Number(x.lieu.id) === Number(d.lieu.id)).map(x => x.id);
    if (!autres.length) return;
    const { data, error } = await sb.from('crescite_fil').select('id, date_id, fichier, fichier_nom, texte, auteur_nom, cree_le').in('date_id', autres).not('fichier', 'is', null).order('cree_le', { ascending: false }).limit(12);
    if (error || !data || !data.length || !z.isConnected) return;
    const { data: liens } = await sb.storage.from(SEAU).createSignedUrls(data.map(x => x.fichier), 3600).catch(() => ({ data: null }));
    const urlDe = ch => (liens || []).find(x => x.path === ch)?.signedUrl || '';
    z.innerHTML = section(`eq-photos-${d.id}`, 'Dans ce lieu, la dernière fois', I.photo, `<ul class="fil-photos">${data.map(x => { const u = urlDe(x.fichier), d2 = dateDe(x.date_id); return `<li><a href="${esc(u || '#')}" target="_blank" rel="noopener">${u ? `<img src="${esc(u)}" alt="${esc(x.texte || x.fichier_nom || 'Photo')}" loading="lazy">` : esc(x.fichier_nom || 'Photo')}</a><span class="aide">${esc(x.auteur_nom || '')}${d2 ? ` · ${esc(jourSansAn(d2.debut))}` : ''}</span></li>`; }).join('')}</ul>`, d.spectacle);
  }

  // ================================================================================================ 3 · le fil de la date
  const PHOTO_MO = 8;
  async function lireFil(d, { relire = false } = {}) {
    if (!relire && T.fil.has(d.id)) return T.fil.get(d.id);
    const { data, error } = await sb.from('crescite_fil').select('*').eq('date_id', d.id).order('cree_le', { ascending: true }).limit(200);
    if (error) { if (absente(error)) T.etat = 'absent'; return null; }
    T.fil.set(d.id, data || []);
    return data || [];
  }
  const texteFil = (d, x) => { let h = esc(x.texte || ''); (x.mentions || []).forEach(pid => { const nom = nomCourt(d, pid); if (nom) h = h.split(esc(`@${nom}`)).join(`<b class="fil-mention">@${esc(nom)}</b>`); }); return h.replace(/\n/g, '<br>'); };
  function blocFil(d, { passee }) {
    return section(`fil-${d.id}`, 'Le fil', I.message, !avecScript() ? PAS_INSTALLE : `<div class="fil-messages" data-fil="${d.id}"><p class="attente-bloc">Lecture du fil…</p></div>
      ${passee && finDe(d) < iso(new Date(Date.now() - 30 * 864e5)) ? '' : `<form class="fil-form" data-fil-form="${d.id}" novalidate><div class="fil-saisie"><textarea rows="2" maxlength="2000" placeholder="Un mot à l’équipe… @ pour mentionner" aria-label="Nouveau message"></textarea><div class="nt-propositions fil-propositions" hidden role="listbox"></div></div>
        <div class="fil-pied"><label class="btn petit">${I.photo}Photo<input type="file" accept="image/*" capture="environment" hidden></label><span class="aide fil-fichier"></span><button type="submit" class="btn petit principal">${I.message}Envoyer</button></div></form>`}`, d.spectacle);
  }
  async function dessinerFil(d) {
    const z = $(`[data-fil="${d.id}"]`); if (!z) return;
    const xs = await lireFil(d, { relire: true });
    if (!z.isConnected) return;
    if (xs === null) { z.innerHTML = `<p class="aide">${navigator.onLine ? 'Le fil ne se lit pas pour l’instant.' : 'Le fil se lit en ligne.'}</p>`; return; }
    if (!xs.length) { z.innerHTML = '<p class="aide">Rien pour l’instant : un rendez-vous à la gare, une clé à récupérer, une photo du plateau…</p>'; return; }
    const avecPhotos = xs.filter(x => x.fichier);
    let liens = [];
    if (avecPhotos.length) { const r = await sb.storage.from(SEAU).createSignedUrls(avecPhotos.map(x => x.fichier), 3600).catch(() => ({ data: null })); liens = r.data || []; }
    const urlDe = ch => liens.find(x => x.path === ch)?.signedUrl || '';
    z.innerHTML = xs.map(x => `<article class="fil-msg${Number(x.personne_id) === moi() ? ' moi' : ''}" data-msg="${x.id}">${avatarDe(d, x.personne_id)}<div class="fil-corps"><p class="fil-tete"><b>${esc(x.auteur_nom || nomCourt(d, x.personne_id))}</b><span class="aide">${esc(momentTexte(x.cree_le))}</span>${Number(x.personne_id) === moi() ? `<button type="button" class="fil-retirer" data-fil-retirer="${x.id}" aria-label="Retirer ce message">${I.croix}</button>` : ''}</p>
      ${x.texte ? `<p class="fil-texte">${texteFil(d, x)}</p>` : ''}${x.fichier ? `<a class="fil-photo" href="${esc(urlDe(x.fichier) || '#')}" target="_blank" rel="noopener">${urlDe(x.fichier) ? `<img src="${esc(urlDe(x.fichier))}" alt="${esc(x.fichier_nom || 'Photo')}" loading="lazy">` : esc(x.fichier_nom || 'Photo')}</a>` : ''}</div></article>`).join('');
    z.scrollTop = z.scrollHeight;
  }
  document.addEventListener('input', e => {
    const ta = e.target; if (!ta.matches || !ta.matches('.fil-form textarea')) return;
    const d = dateDe(ta.closest('[data-fil-form]').dataset.filForm), box = ta.closest('.fil-saisie').querySelector('.fil-propositions');
    const avant = ta.value.slice(0, ta.selectionStart), m = /@([^@\n]{0,30})$/.exec(avant);
    if (!m || !d) { box.hidden = true; return; }
    const q = sansAccent(m[1]), xs = gensDe(d).filter(g => Number(g.id) !== moi() && (!q || sansAccent(g.nom).includes(q))).slice(0, 6);
    box.innerHTML = xs.map((g, i) => `<button type="button" role="option" data-fil-mention="${esc(g.nom)}"${i === 0 ? ' aria-selected="true"' : ''}>${esc(g.nom)}</button>`).join('');
    box.hidden = !xs.length;
  });
  document.addEventListener('keydown', e => {
    const ta = e.target; if (!ta.matches || !ta.matches('.fil-form textarea')) return;
    const box = ta.closest('.fil-saisie').querySelector('.fil-propositions');
    if (box.hidden) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); ta.closest('form').requestSubmit(); } return; }
    const xs = $$('[data-fil-mention]', box), i = xs.findIndex(x => x.getAttribute('aria-selected') === 'true');
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const j = (i + (e.key === 'ArrowDown' ? 1 : -1) + xs.length) % xs.length; xs.forEach((x, k) => x.setAttribute('aria-selected', String(k === j))); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); (xs[i] || xs[0])?.click(); }
    else if (e.key === 'Escape') { e.preventDefault(); box.hidden = true; }
  });
  document.addEventListener('change', e => { const f = e.target; if (f.matches && f.matches('.fil-form input[type=file]')) { const z = f.closest('form').querySelector('.fil-fichier'); z.textContent = f.files[0] ? f.files[0].name : ''; } });
  document.addEventListener('click', async e => {
    const m = e.target.closest('[data-fil-mention]');
    if (m) { const ta = m.closest('.fil-saisie').querySelector('textarea'), avant = ta.value.slice(0, ta.selectionStart).replace(/@[^@\n]{0,30}$/, ''), apres = ta.value.slice(ta.selectionStart); ta.value = `${avant}@${m.dataset.filMention} ${apres}`; const pos = avant.length + m.dataset.filMention.length + 2; ta.setSelectionRange(pos, pos); m.closest('.fil-propositions').hidden = true; ta.focus(); return; }
    const b = e.target.closest('[data-fil-retirer]'); if (!b) return;
    const d = dateDe(b.closest('[data-fil]').dataset.fil), id = Number(b.dataset.filRetirer); if (!d) return;
    b.disabled = true;
    const { error } = await sb.from('crescite_fil').delete().eq('id', id);
    if (error) { b.disabled = false; return annoncer(`Le message n’est pas retiré : ${motsErreur(error)}.`, { erreur: true }); }
    dessinerFil(d);
  });
  document.addEventListener('submit', async e => {
    const f = e.target; if (!f.matches || !f.matches('.fil-form')) return;
    e.preventDefault();
    const d = dateDe(f.dataset.filForm), ta = $('textarea', f), fichier = $('input[type=file]', f).files[0], b = $('button[type=submit]', f), texte = txt(ta.value);
    if (!d || (!texte && !fichier)) return annoncer('Un mot, ou une photo.', { erreur: true });
    if (fichier && fichier.size > PHOTO_MO * 1048576) return annoncer(`La photo dépasse ${PHOTO_MO} Mo.`, { erreur: true });
    b.disabled = true;
    try {
      let pj = {};
      if (fichier) { const chemin = `fil/${d.id}/${Date.now()}-${fichier.name.replace(/[^\w.\-]+/g, '-').slice(-60)}`; const { error } = await sb.storage.from(SEAU).upload(chemin, fichier, { contentType: fichier.type || 'image/jpeg', upsert: false }); if (error) throw error; pj = { fichier: chemin, fichier_nom: fichier.name }; }
      const mentions = gensDe(d).filter(g => texte.includes(`@${g.nom}`)).map(g => Number(g.id));
      const { error } = await sb.from('crescite_fil').insert({ date_id: d.id, personne_id: moi(), auteur_nom: nomDe(E.personne), texte, mentions, ...pj });
      if (error) throw error;
      ta.value = ''; $('input[type=file]', f).value = ''; $('.fil-fichier', f).textContent = '';
      vibrer(10); annoncer('Envoyé : l’équipe de la date est prévenue.');
      dessinerFil(d);
    } catch (err) { annoncer(`Le message n’est pas parti : ${motsErreur(err)}.`, { erreur: true }); } finally { b.disabled = false; }
  });

  // ================================================================================================ 4 · trajets et covoiturage
  const MODES = { voiture: ['Voiture', 'voiture'], train: ['Train', 'train'], camion: ['Camion', 'camion'], autre: ['Autre', 'route'] };
  const trajetsDe = dateId => T.trajets.filter(x => Number(x.date_id) === Number(dateId)).sort((a, b) => (a.sens === b.sens ? `${a.jour || ''} ${a.heure || ''}`.localeCompare(`${b.jour || ''} ${b.heure || ''}`) : a.sens === 'aller' ? -1 : 1));
  const trajetTexte = (d, x) => `${x.sens === 'aller' ? 'Aller' : 'Retour'} · ${MODES[x.mode]?.[0] || x.mode}${x.depart ? ` depuis ${x.depart}` : ''}${x.jour ? `, ${jourSansAn(x.jour)}` : ''}${x.heure ? ` à ${heureTexte(h5(x.heure))}` : ''}`;
  function htmlTrajet(d, x, { lecture = false } = {}) {
    const mien = Number(x.personne_id) === moi(), dedans = (x.passagers || []).some(p => Number(p) === moi()), reste = Math.max(0, (x.places || 0) - (x.passagers || []).length);
    return `<li class="trajet${mien ? ' mien' : ''}" data-trajet="${x.id}">${avatarDe(d, x.personne_id)}<div class="trajet-corps"><b>${esc(nomCourt(d, x.personne_id))}${mien ? ' <span class="vous">vous</span>' : ''}</b><span>${I[MODES[x.mode]?.[1] || 'route']}${esc(trajetTexte(d, x))}</span>
      ${x.details ? `<span class="aide">${esc(x.details)}</span>` : ''}${x.places ? `<span class="aide">${(x.passagers || []).length ? `Avec ${esc((x.passagers || []).map(p => nomCourt(d, p)).join(', '))} · ` : ''}${reste ? `${reste} place${reste > 1 ? 's' : ''} libre${reste > 1 ? 's' : ''}` : 'complet'}</span>` : ''}</div>
      ${lecture ? '' : `<span class="trajet-gestes">${mien ? `<button type="button" class="btn petit" data-trajet-modifier="${x.id}">${I.crayon}<span class="sr">Modifier</span></button><button type="button" class="btn petit danger" data-trajet-retirer="${x.id}">${I.corbeille}<span class="sr">Retirer</span></button>`
        : dedans ? `<button type="button" class="btn petit fait" data-trajet-monter="${x.id}" data-oui="0">${I.coche}J’y suis</button>` : x.places && reste ? `<button type="button" class="btn petit principal" data-trajet-monter="${x.id}" data-oui="1">${I.plus}Je monte</button>` : ''}</span>`}</li>`;
  }
  function blocTrajets(d, { passee }) {
    const xs = trajetsDe(d.id);
    return section(`trajets-${d.id}`, 'Trajets et covoiturage', I.voiture, !avecScript() ? PAS_INSTALLE : `${xs.length ? `<ul class="trajets">${xs.map(x => htmlTrajet(d, x)).join('')}</ul>` : '<p class="aide">Personne n’a encore dit comment il venait. Qui prend la voiture, qui a des places, qui prend le train ?</p>'}
      ${passee ? '' : `<p class="soir-gestes"><button type="button" class="btn petit" data-trajet-nouveau="${d.id}">${I.plus}Mon trajet</button></p>`}`, d.spectacle);
  }
  const blocTrajetsFeuille = d => { const xs = trajetsDe(d.id); return xs.length ? `<h3 class="tn-sous">Trajets de l’équipe</h3><ul class="trajets lecture">${xs.map(x => htmlTrajet(d, x, { lecture: true })).join('')}</ul>` : ''; };
  async function formTrajet(d, x = null) {
    const Gf = G(); if (!Gf) return;
    const v = await Gf.formulaire({ titre: x ? 'Mon trajet' : 'Mon trajet', sousTitre: titreDate(d), champs: [
      { k: 'sens', t: 'choix', seg: true, l: 'Sens', choix: [['aller', 'Aller'], ['retour', 'Retour']], valeur: x?.sens || 'aller' },
      { k: 'mode', t: 'choix', seg: true, l: 'Comment', choix: Object.entries(MODES).map(([k, [l]]) => [k, l]), valeur: x?.mode || 'voiture' },
      { k: 'depart', t: 'texte', l: 'D’où', valeur: x?.depart || E.privee?.ville || '', ph: 'Rouen, gare Saint-Lazare…' },
      { k: 'jour', t: 'date', l: 'Jour', valeur: x?.jour || (x?.sens === 'retour' ? finDe(d) : d.debut) }, { k: 'heure', t: 'heure', l: 'Départ à', valeur: x?.heure ? h5(x.heure) : '' },
      { k: 'places', t: 'nombre', l: 'Places libres', valeur: x?.places ?? 0, min: 0, max: 9, pas: 1, aide: 'En voiture : combien de personnes peuvent monter.' },
      { k: 'details', t: 'texte', l: 'Précisions', valeur: x?.details || '', ph: 'Je passe par Évreux, coffre plein…', large: true },
    ], ok: x ? 'Enregistrer' : 'Dire comment je viens', enregistrer: async y => (y.jour && !estJour(y.jour) ? 'Un jour valide.' : true) });
    if (!v) return;
    const ligne = { date_id: d.id, personne_id: moi(), sens: v.sens || 'aller', mode: v.mode || 'voiture', depart: txt(v.depart) || null, jour: v.jour || null, heure: v.heure || null, places: Math.max(0, Math.min(9, Number(v.places) || 0)), details: txt(v.details) || null };
    const r = x ? await sb.from('crescite_trajets').update(ligne).eq('id', x.id).select().single() : await sb.from('crescite_trajets').insert(ligne).select().single();
    if (r.error) { if (absente(r.error)) T.etat = 'absent'; return annoncer(`Le trajet n’est pas enregistré : ${motsErreur(r.error)}.`, { erreur: true }); }
    T.trajets = T.trajets.filter(y => y.id !== r.data.id).concat([r.data]); garder();
    vibrer(10); annoncer(x ? 'Trajet modifié.' : 'Trajet noté : l’équipe de la date le voit.');
    const sec = $(`#trajets-${d.id}`); if (sec) sec.outerHTML = blocTrajets(d, { passee: finDe(d) < aujourdhui() });
  }
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-trajet-nouveau], [data-trajet-modifier], [data-trajet-retirer], [data-trajet-monter]'); if (!b) return;
    const sec = b.closest('[id^="trajets-"]'), d = dateDe(b.dataset.trajetNouveau || (sec && sec.id.slice(8))); if (!d) return;
    if (b.dataset.trajetNouveau) return formTrajet(d);
    const x = T.trajets.find(y => y.id === Number(b.dataset.trajetModifier || b.dataset.trajetRetirer || b.dataset.trajetMonter)); if (!x) return;
    if (b.dataset.trajetModifier) return formTrajet(d, x);
    b.disabled = true;
    if (b.dataset.trajetRetirer) {
      const { error } = await sb.from('crescite_trajets').delete().eq('id', x.id);
      if (error) { b.disabled = false; return annoncer(`Le trajet n’est pas retiré : ${motsErreur(error)}.`, { erreur: true }); }
      T.trajets = T.trajets.filter(y => y.id !== x.id); garder();
      annoncer('Trajet retiré.', { action: async () => { const { id, ...sans } = x; const r = await sb.from('crescite_trajets').insert(sans).select().single(); if (!r.error) { T.trajets.push(r.data); garder(); annoncer('Trajet rétabli.'); const s2 = $(`#trajets-${d.id}`); if (s2) s2.outerHTML = blocTrajets(d, { passee: false }); } } });
    } else {
      const { data, error } = await sb.rpc('crescite_trajet_monter', { t: x.id, oui: b.dataset.oui === '1' });
      if (error) { b.disabled = false; return annoncer(`${motsErreur(error) || 'La base a refusé'}.`, { erreur: true }); }
      x.passagers = (data && data.passagers) || x.passagers; garder(); vibrer(10);
      annoncer(b.dataset.oui === '1' ? `Vous montez avec ${nomCourt(d, x.personne_id)}.` : 'Vous ne montez plus dans ce trajet.');
    }
    sec.outerHTML = blocTrajets(d, { passee: finDe(d) < aujourdhui() });
  });

  // ================================================================================================ 5 · ma check-list
  const checklistDe = dateId => T.checklists.find(x => (dateId == null ? x.date_id == null : Number(x.date_id) === Number(dateId))) || null;
  const modeleCheck = () => checklistDe(null);
  const MODELE_DEFAUT = ['Costume et chaussures de scène', 'Chargeur et batterie', 'Pièce d’identité', 'Bouteille d’eau', 'Le texte'];
  function blocChecklist(d, { passee }) {
    const c = checklistDe(d.id), items = c ? c.items || [] : null, m = modeleCheck(), faits = items ? items.filter(x => x.fait).length : 0;
    return section(`check-${d.id}`, `Ma check-list${items && items.length ? ` <span class="compte-nb">· ${faits}/${items.length}</span>` : ''}`, I.liste, !avecScript() ? PAS_INSTALLE : `${items && items.length ? `<ul class="checklist" data-check="${d.id}">${items.map((x, i) => `<li class="${x.fait ? 'fait' : ''}"><label><input type="checkbox" data-check-i="${i}"${x.fait ? ' checked' : ''}><span>${esc(x.texte)}</span></label><button type="button" class="check-retirer" data-check-retirer="${i}" aria-label="Retirer ${esc(x.texte)}">${I.croix}</button></li>`).join('')}</ul>` : `<p class="aide">${items ? 'Rien dans la liste.' : 'Pas encore de liste pour cette date.'}</p>`}
      ${passee ? '' : `<form class="check-ajout" data-check-form="${d.id}"><input type="text" maxlength="80" placeholder="Ajouter : les clés du camion, la perruque…" aria-label="Nouvel élément"><button type="submit" class="btn petit">${I.plus}<span class="sr">Ajouter</span></button></form>
      <p class="soir-gestes">${!items || !items.length ? `<button type="button" class="btn petit" data-check-modele="${d.id}">${I.liste}Partir de mon modèle${m && (m.items || []).length ? ` (${m.items.length})` : ''}</button>` : ''}<button type="button" class="btn petit" data-check-editer-modele>${I.crayon}Mon modèle…</button></p>`}
      ${c && c.local ? '<p class="aide">Gardée sur l’appareil, écrite dès que le réseau revient.</p>' : ''}`, d.spectacle);
  }
  async function ecrireChecklist(dateId, items) {
    const avant = checklistDe(dateId), ligne = { personne_id: moi(), date_id: dateId, items };
    const neuf = { ...(avant || {}), ...ligne, local: !navigator.onLine };
    T.checklists = T.checklists.filter(x => x !== avant).concat([neuf]); garder();
    if (!navigator.onLine) { mettreEnAttente({ cle: `check:${dateId}`, table: 'crescite_checklists', ligne, conflit: 'personne_id,date_id' }); return; }
    // (l'unicité porte sur personne_id et date_id, le modèle ayant un date_id vide : une ligne existante se modifie)
    const r = avant && avant.id ? await sb.from('crescite_checklists').update({ items }).eq('id', avant.id).select().single() : await sb.from('crescite_checklists').insert(ligne).select().single();
    if (r.error) { if (absente(r.error)) T.etat = 'absent'; else mettreEnAttente({ cle: `check:${dateId}`, table: 'crescite_checklists', ligne, conflit: 'personne_id,date_id' }); return; }
    T.checklists = T.checklists.filter(x => x !== neuf).concat([r.data]); garder();
  }
  const minuteurs = new Map();
  const ecrirePlusTard = (dateId, items) => { clearTimeout(minuteurs.get(dateId)); minuteurs.set(dateId, setTimeout(() => ecrireChecklist(dateId, items), 500)); };
  document.addEventListener('change', e => {
    const i = e.target; if (!i.matches || !i.matches('[data-check-i]')) return;
    const ul = i.closest('[data-check]'), d = dateDe(ul.dataset.check), c = checklistDe(d.id); if (!c) return;
    const items = (c.items || []).map((x, k) => (k === Number(i.dataset.checkI) ? { ...x, fait: i.checked } : x));
    c.items = items; i.closest('li').classList.toggle('fait', i.checked); vibrer(6);
    const t = $(`#check-${d.id}-t .compte-nb`); if (t) t.textContent = `· ${items.filter(x => x.fait).length}/${items.length}`;
    ecrirePlusTard(d.id, items);
  });
  document.addEventListener('submit', async e => {
    const f = e.target; if (!f.matches || !f.matches('[data-check-form]')) return;
    e.preventDefault();
    const d = dateDe(f.dataset.checkForm), inp = $('input', f), texte = txt(inp.value); if (!d || !texte) return;
    const c = checklistDe(d.id), items = [...((c && c.items) || []), { texte, fait: false }];
    await ecrireChecklist(d.id, items);
    const sec = $(`#check-${d.id}`); if (sec) { sec.outerHTML = blocChecklist(d, { passee: finDe(d) < aujourdhui() }); $(`[data-check-form="${d.id}"] input`)?.focus(); }
  });
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-check-retirer], [data-check-modele], [data-check-editer-modele]'); if (!b) return;
    if (b.hasAttribute('data-check-editer-modele')) return editerModele();
    const sec = b.closest('[id^="check-"]'), d = dateDe(sec.id.slice(6)); if (!d) return;
    const c = checklistDe(d.id);
    let items;
    if (b.dataset.checkModele) { const m = modeleCheck(); items = ((m && m.items && m.items.length) ? m.items : MODELE_DEFAUT.map(texte => ({ texte }))).map(x => ({ texte: x.texte, fait: false })); }
    else items = ((c && c.items) || []).filter((x, k) => k !== Number(b.dataset.checkRetirer));
    await ecrireChecklist(d.id, items);
    sec.outerHTML = blocChecklist(d, { passee: finDe(d) < aujourdhui() });
  });
  async function editerModele() {
    const Gf = G(); if (!Gf) return;
    const m = modeleCheck();
    const v = await Gf.formulaire({ titre: 'Mon modèle de check-list', sousTitre: 'ce que j’emporte sur chaque date', champs: [{ k: 'texte', t: 'long', l: 'Un élément par ligne', valeur: ((m && m.items) || MODELE_DEFAUT.map(texte => ({ texte }))).map(x => x.texte).join('\n'), lignes: 8 }], ok: 'Enregistrer le modèle', enregistrer: async () => true });
    if (!v) return;
    const items = String(v.texte || '').split('\n').map(txt).filter(Boolean).slice(0, 60).map(texte => ({ texte, fait: false }));
    await ecrireChecklist(null, items);
    annoncer('Modèle enregistré.');
    router({ rafraichir: true });
  }

  // ================================================================================================ 8 · tout emporter hors connexion
  const BASE_EMPORT = 'crescite-equipe-emporte';
  const emportees = () => new Set((lireStock(EMPORTE, []) || []).map(Number));
  const emportee = id => emportees().has(Number(id));
  const cheminsEmportes = new Set();
  function ouvrirBase() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('pas de stockage'));
      const r = indexedDB.open(BASE_EMPORT, 1);
      r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains('fichiers')) db.createObjectStore('fichiers', { keyPath: 'chemin' }); };
      r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
  }
  const transaction = async (mode, f) => { const db = await ouvrirBase(); return new Promise((resolve, reject) => { const t = db.transaction('fichiers', mode), s = t.objectStore('fichiers'); const out = f(s); t.oncomplete = () => { db.close(); resolve(out && 'result' in out ? out.result : out); }; t.onerror = () => { db.close(); reject(t.error); }; }); };
  const lireFichier = chemin => transaction('readonly', s => s.get(chemin));
  const tousFichiers = () => transaction('readonly', s => s.getAll());
  const mettreFichier = x => transaction('readwrite', s => s.put(x));
  const retirerFichiers = chemins => transaction('readwrite', s => { chemins.forEach(c => s.delete(c)); });
  tousFichiers().then(xs => (xs || []).forEach(x => cheminsEmportes.add(x.chemin))).catch(() => {});
  const fichiersDe = d => E.documents.filter(x => x.fichier && (x.spectacle_id == null || x.spectacle_id === d.spectacle?.id));
  async function basculerEmport(d) {
    const ids = emportees();
    if (ids.has(d.id)) {
      const miens = fichiersDe(d).map(x => x.fichier).filter(ch => !E.dates.some(x => x.id !== d.id && ids.has(x.id) && fichiersDe(x).some(y => y.fichier === ch)));
      try { await retirerFichiers(miens); } catch (e) { /* rien à retirer */ }
      miens.forEach(ch => cheminsEmportes.delete(ch)); ids.delete(d.id); ecrireStock(EMPORTE, [...ids]);
      annoncer('Retirée de l’appareil.'); router({ rafraichir: true }); return;
    }
    annoncer('Les documents arrivent sur l’appareil…', { delai: 3000 });
    let n = 0, rates = 0;
    try { if (d.feuille) await chargerFeuille(d.id); } catch (e) { rates++; }
    for (const x of fichiersDe(d)) {
      try {
        const url = documentPrive(x) ? await signerUn(x.fichier) : `${A.PUBLIC}/${String(x.fichier).split('/').map(encodeURIComponent).join('/')}`;
        const rep = await fetch(url); if (!rep.ok) throw new Error(`${rep.status}`);
        const blob = await rep.blob();
        await mettreFichier({ chemin: x.fichier, blob, nom: x.titre || x.fichier.split('/').pop(), type: blob.type, quand: Date.now() });
        cheminsEmportes.add(x.fichier); n++;
      } catch (e) { rates++; }
    }
    ids.add(d.id); ecrireStock(EMPORTE, [...ids]);
    vibrer(10);
    annoncer(`Sur l’appareil : ${pluriel(n, 'document')}${d.feuille ? ' et la feuille de route' : ''}${rates ? ` (${rates} n’${rates > 1 ? 'ont' : 'a'} pas pu venir)` : ''}. Ils s’ouvrent même sans réseau.`);
    router({ rafraichir: true });
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-emporter]'); if (!b) return; const d = dateDe(b.dataset.emporter); if (d) { b.disabled = true; basculerEmport(d); } });
  // un document gardé sur l'appareil s'ouvre depuis l'appareil quand le réseau manque (avant le geste d'equipe.js, qui signe un lien)
  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-fichier]'); if (!t || navigator.onLine) return;
    const chemin = t.dataset.fichier; if (!cheminsEmportes.has(chemin)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    try { const x = await lireFichier(chemin); if (!x) throw new Error('absent'); const u = URL.createObjectURL(x.blob); const w = window.open(u, '_blank'); if (!w) location.href = u; setTimeout(() => URL.revokeObjectURL(u), 60000); }
    catch (err) { annoncer('Ce document n’est pas sur l’appareil.', { erreur: true }); }
  }, true);
  async function carteEmport() {
    const ids = emportees(); if (!ids.size) return '';
    let taille = 0; try { (await tousFichiers()).forEach(x => { taille += x.blob ? x.blob.size : 0; }); } catch (e) { taille = 0; }
    const mo = taille ? `${(taille / 1048576).toFixed(1).replace('.', ',')} Mo` : '';
    return `<section class="carte-action" aria-labelledby="t-emport"><span class="ic-rond" aria-hidden="true">${I.telecharge}</span><div class="ca-texte"><h2 id="t-emport">Sur l’appareil</h2><p class="aide">${pluriel(ids.size, 'date')} emportée${ids.size > 1 ? 's' : ''} avec ${ids.size > 1 ? 'leurs' : 'ses'} documents${mo ? ` (${mo})` : ''} : ${[...ids].map(id => dateDe(id)).filter(Boolean).map(d => `${d.spectacle?.titre || ''} ${jourSansAn(d.debut)}`).join(', ')}.</p></div><button type="button" class="btn petit" data-tout-retirer>Tout retirer</button></section>`;
  }
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-tout-retirer]'); if (!b) return;
    b.disabled = true;
    try { await retirerFichiers([...cheminsEmportes]); } catch (err) { /* rien */ }
    cheminsEmportes.clear(); ecrireStock(EMPORTE, null); annoncer('Plus rien sur l’appareil.'); router({ rafraichir: true });
  });

  // ================================================================================================ 9 · répondre d'un tap, les rappels, mes créneaux
  const propositionDe = n => (E.dispo && E.dispo.propositions || []).find(p => n.lien === `#/proposition/${p.id}`) || null;
  const joursARepondre = p => p.jours.filter(j => j.moi && !j.moi.reponse && Date.parse(j.fin) > Date.now());
  EXT.actionsNotif = n => {
    if (n.type !== 'proposition') return '';
    const p = propositionDe(n); if (!p || p.statut !== 'ouverte') return '';
    const js = joursARepondre(p); if (js.length !== 1) return '';
    return `<div class="notif-actions" role="group" aria-label="Répondre pour ${esc(texteJours(js[0]))}">${Object.entries(REPONSES).map(([k, l]) => `<button type="button" class="btn petit rep ${k}" data-rep-notif="${js[0].id}" data-reponse="${k}">${I[{ oui: 'coche', non: 'croix', peut_etre: 'question' }[k]]}${l}</button>`).join('')}</div>`;
  };
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-rep-notif]'); if (!b) return;
    e.preventDefault();
    $$('[data-rep-notif]', b.parentElement).forEach(x => { x.disabled = true; });
    await repondre(Number(b.dataset.repNotif), b.dataset.reponse, '', { depuisBouton: false });
    router({ rafraichir: true });
  });
  function rappels() {
    const xs = enAttente().map(p => { const js = joursARepondre(p), premier = js.map(j => iso(new Date(j.debut))).sort()[0]; return { p, n: js.length, premier, dans: premier ? Math.round((new Date(`${premier}T12:00:00`) - new Date(`${aujourdhui()}T12:00:00`)) / 864e5) : null }; }).filter(x => x.premier && x.dans <= 14);
    if (!xs.length) return '';
    return `<section class="carte-action rappel" aria-labelledby="t-rappel"><span class="ic-rond" aria-hidden="true">${I.question}</span><div class="ca-texte"><h2 id="t-rappel">${xs.length > 1 ? 'Des réponses attendues' : 'Une réponse attendue'}</h2>
      ${xs.map(x => `<p class="aide"><a href="#/proposition/${x.p.id}"><b>${esc(x.p.titre)}</b></a> : ${x.n > 1 ? `${x.n} jours sans réponse` : 'un jour sans réponse'}, le premier ${x.dans <= 0 ? 'aujourd’hui' : x.dans === 1 ? 'demain' : `dans ${x.dans} jours`} (${esc(jourSansAn(x.premier))}).</p>`).join('')}</div><a class="btn petit principal" href="#/proposition/${xs[0].p.id}">Répondre</a></section>`;
  }
  EXT.bandeauNotifs = () => rappels();
  // mes créneaux libres, proposés à l'administration
  async function vueCreneaux(r, { focus }) {
    const html = `<div class="titre-vue"><h1>Mes créneaux libres</h1><p class="sous">Les périodes où vous aimeriez jouer : l’administration les voit et vous propose des dates.</p></div>
      ${!avecScript() ? `<section class="carte">${PAS_INSTALLE}</section>` : `<form class="carte" id="f-creneau" novalidate aria-labelledby="t-creneau"><h2 id="t-creneau">Proposer un créneau</h2>
        <div class="deux-champs"><div class="champ"><label for="cr-du">Du</label><input type="date" id="cr-du" value="${aujourdhui()}" min="${aujourdhui()}" required></div><div class="champ"><label for="cr-au">Au</label><input type="date" id="cr-au" value="${aujourdhui()}" min="${aujourdhui()}" required></div></div>
        <div class="champ"><label for="cr-message">Un mot <span class="facultatif">(facultatif)</span></label><input type="text" id="cr-message" maxlength="200" placeholder="Libre pour une tournée, plutôt en semaine…"></div>
        <div class="pied-form"><button type="submit" class="btn principal">${I.plus}Proposer</button><p class="etat-form" id="etat-creneau" role="status"></p></div></form>
      <section class="carte" aria-labelledby="t-mes-creneaux"><h2 id="t-mes-creneaux">Mes créneaux</h2><div id="zone-creneaux"><p class="chargement" role="status">Lecture…</p></div></section>`}`;
    A.afficher(r, 'Mes créneaux libres', html, { focus });
    if (!avecScript()) return;
    const dessiner = async () => {
      const z = $('#zone-creneaux'); if (!z) return;
      const { data, error } = await sb.from('crescite_creneaux').select('*').eq('personne_id', moi()).gte('fin', iso(new Date(Date.now() - 864e5))).order('debut');
      if (!z.isConnected) return;
      if (error) { if (absente(error)) T.etat = 'absent'; z.innerHTML = `<p class="aide">${absente(error) ? 'Bientôt dans l’application.' : `Illisibles pour l’instant : ${esc(motsErreur(error))}.`}</p>`; return; }
      z.innerHTML = data && data.length ? `<ul class="creneaux">${data.map(x => `<li><span><b>${esc(x.debut === x.fin ? jourSansAn(x.debut) : `du ${jourSansAn(x.debut)} au ${jourSansAn(x.fin)}`)}</b>${x.message ? `<br><span class="aide">${esc(x.message)}</span>` : ''}</span><button type="button" class="btn petit danger" data-creneau-retirer="${x.id}">${I.corbeille}<span class="sr">Retirer</span></button></li>`).join('')}</ul>` : '<p class="aide">Aucun créneau proposé pour l’instant.</p>';
    };
    dessiner();
    $('#f-creneau').addEventListener('submit', async e => {
      e.preventDefault();
      const du = $('#cr-du').value, au = $('#cr-au').value, message = txt($('#cr-message').value), etat = $('#etat-creneau');
      if (!estJour(du) || !estJour(au) || au < du) { etat.className = 'etat-form sale'; etat.textContent = 'Du premier jour au dernier, dans l’ordre.'; return; }
      const { error } = await sb.from('crescite_creneaux').insert({ personne_id: moi(), debut: du, fin: au, message: message || null });
      if (error) { etat.className = 'etat-form sale'; etat.textContent = `Pas enregistré : ${motsErreur(error)}.`; return; }
      etat.className = 'etat-form ok'; etat.textContent = 'Proposé : l’administration le voit.'; $('#cr-message').value = ''; vibrer(10);
      dessiner();
    });
    $('#zone-creneaux').addEventListener('click', async e => {
      const b = e.target.closest('[data-creneau-retirer]'); if (!b) return;
      b.disabled = true;
      const { error } = await sb.from('crescite_creneaux').delete().eq('id', Number(b.dataset.creneauRetirer));
      if (error) { b.disabled = false; return annoncer(`Pas retiré : ${motsErreur(error)}.`, { erreur: true }); }
      dessiner();
    });
  }

  // ================================================================================================ 7 · les frais sans friction
  const BAREME_DEFAUT = 0.636;   // €/km : le barème kilométrique (5 CV, jusqu'à 5 000 km) ; l'administration le change dans Textes du site (frais)
  let bareme = null;
  async function lireBareme() {
    if (bareme != null) return bareme;
    bareme = BAREME_DEFAUT;
    try { const { data } = await sb.from('crescite_textes').select('valeur').eq('cle', 'frais').maybeSingle(); const b = Number(data?.valeur?.bareme_km); if (b > 0) bareme = b; } catch (e) { /* le défaut */ }
    return bareme;
  }
  async function positionVille(ville) {
    const k = `crescite-equipe-ville-${sansAccent(ville)}`, m = lireStock(k); if (m) return m;
    const r = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(ville)}&fields=nom,centre&boost=population&limit=1`);
    const [c] = r.ok ? await r.json() : [];
    if (!c || !c.centre) return null;
    const p = { nom: c.nom, latitude: c.centre.coordinates[1], longitude: c.centre.coordinates[0] }; ecrireStock(k, p); return p;
  }
  EXT.apresFrais = f => {
    const montant = $('#nf-montant', f), cat = $('#nf-categorie', f), dateT = $('#nf-date-tournee', f), comm = $('#nf-commentaire', f); if (!montant || !cat) return;
    const zone = document.createElement('div');
    zone.className = 'champ nf-km'; zone.id = 'nf-km-zone'; zone.hidden = cat.value !== 'transport';
    zone.innerHTML = `<label for="nf-km">Kilomètres en voiture (aller-retour)</label><div class="nf-km-ligne"><input type="number" id="nf-km" min="0" max="5000" step="1" inputmode="numeric" placeholder="0"><button type="button" class="btn petit" id="nf-km-calc">${I.route}De ma ville au lieu</button></div><p class="aide" id="nf-km-aide">Un kilométrage se note sans ticket : le montant suit le barème.</p>`;
    montant.closest('.deux-champs').after(zone);
    const champKm = $('#nf-km', zone), aide = $('#nf-km-aide', zone);
    lireBareme().then(b => { aide.textContent = `Un kilométrage se note sans ticket : ${b.toFixed(3).replace('.', ',')} €/km (le barème).`; });
    const photo = $('#nf-photo', f), exige = () => { if (photo) photo.required = !EXT.sansJustificatif(f); };
    cat.addEventListener('change', () => { zone.hidden = cat.value !== 'transport'; if (zone.hidden) champKm.value = ''; exige(); });
    champKm.addEventListener('input', async () => { exige(); const n = Number(champKm.value); if (!(n > 0)) return; const b = await lireBareme(); montant.value = (Math.round(n * b * 100) / 100).toFixed(2); const d = dateT.value ? dateDe(dateT.value) : null; if (comm && !comm.dataset.main) comm.value = `Kilométrage : ${n} km × ${b.toFixed(3).replace('.', ',')} €${d && d.lieu ? ` (${E.privee?.ville || 'domicile'} → ${d.lieu.commune || d.lieu.nom}, aller-retour)` : ''}`; });
    if (comm) comm.addEventListener('input', () => { comm.dataset.main = comm.value ? '1' : ''; });
    $('#nf-km-calc', zone).addEventListener('click', async e => {
      const d = dateT.value ? dateDe(dateT.value) : null, ville = txt(E.privee?.ville);
      if (!d || !d.lieu) return annoncer('Choisissez d’abord la date de tournée liée : le lieu donne la distance.', { erreur: true });
      if (!ville) return annoncer('Indiquez votre ville de départ dans « Moi » : la distance part de là.', { erreur: true });
      const bouton = e.currentTarget; bouton.disabled = true;
      try {
        const p = await positionVille(ville), dist = p ? km(p, d.lieu) : null;
        if (dist == null) throw new Error('position inconnue');
        champKm.value = String(Math.round(dist * 1.3 * 2)); champKm.dispatchEvent(new Event('input', { bubbles: true }));
        annoncer(`${ville} → ${d.lieu.commune || d.lieu.nom} : ${Math.round(dist * 1.3)} km par la route, ${champKm.value} km aller-retour.`);
      } catch (err) { annoncer('La distance ne se calcule pas : ville introuvable, ou lieu sans position.', { erreur: true }); } finally { bouton.disabled = false; }
    });
  };
  EXT.sansJustificatif = f => { const cat = $('#nf-categorie', f), champKm = $('#nf-km', f); return !!(cat && cat.value === 'transport' && champKm && Number(champKm.value) > 0); };
  // le récapitulatif par mois, et le CSV de mes notes
  EXT.apresNotesFrais = data => {
    const liste = $('#liste-frais-zone'); if (!liste) return;
    let z = $('#frais-recap'); if (!z) { z = document.createElement('section'); z.className = 'carte'; z.id = 'frais-recap'; z.setAttribute('aria-labelledby', 't-frais-recap'); liste.closest('section').before(z); }
    const mois = new Map();
    (data || []).forEach(x => { const k = String(x.date_depense || x.cree_le || '').slice(0, 7); if (!k) return; if (!mois.has(k)) mois.set(k, { total: 0, attente: 0, valide: 0, rembourse: 0, refuse: 0, n: 0 }); const m = mois.get(k), v = Number(x.montant_ttc) || 0; m.n++; m.total += v; m[x.statut === 'en_attente' ? 'attente' : x.statut] = (m[x.statut === 'en_attente' ? 'attente' : x.statut] || 0) + v; });
    const ks = [...mois.keys()].sort().reverse().slice(0, 12), moisTexte = k => new Date(`${k}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    z.innerHTML = `<h2 id="t-frais-recap">Mois par mois</h2>${ks.length ? `<table class="recap-frais"><thead><tr><th>Mois</th><th>Notes</th><th>Total</th><th>En attente</th><th>Remboursé</th></tr></thead><tbody>${ks.map(k => { const m = mois.get(k); return `<tr><td>${esc(majuscule(moisTexte(k)))}</td><td>${m.n}</td><td>${esc(euros(m.total))}</td><td>${esc(euros(m.attente + (m.valide || 0)))}</td><td>${esc(euros(m.rembourse || 0))}</td></tr>`; }).join('')}</tbody></table>` : '<p class="aide">Rien encore.</p>'}
      <p class="soir-gestes"><button type="button" class="btn petit" data-frais-csv>${I.telecharge}Exporter en CSV</button></p>`;
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-frais-csv]'); if (!b) return;
    const xs = E.fraisLus || [], ligne = r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
    const csv = [ligne(['Date', 'Catégorie', 'Montant TTC', 'Statut', 'Date de tournée', 'Commentaire']), ...xs.map(x => { const d = x.date_id ? dateDe(x.date_id) : null; return ligne([x.date_depense || '', CAT_FRAIS[x.categorie] || x.categorie || '', String(Number(x.montant_ttc) || 0).replace('.', ','), x.statut, d ? `${d.spectacle?.titre || ''} ${jourSansAn(d.debut)}` : '', x.commentaire || '']); })].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = 'mes-notes-de-frais.csv'; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  });

  // ================================================================================================ 6 · mon compteur
  function compteur() {
    const auj = aujourdhui(), saisons = new Map();
    const s = k => { if (!saisons.has(k)) saisons.set(k, { cachets: 0, dates: 0, repetitions: 0, residences: 0, aVenir: 0, lignes: [] }); return saisons.get(k); };
    E.dates.filter(vivante).forEach(d => {
      const x = s(d.saison || saisonDe(d.debut)), nat = natureDe(d);
      if (nat === 'representations') {
        const reps = d.representations.filter(r => !r.annulee && estJour(r.jour)), jouees = reps.filter(r => r.jour < auj);
        if (reps.length) { x.cachets += jouees.length; x.aVenir += reps.length - jouees.length; if (jouees.length) x.dates++; jouees.forEach(r => x.lignes.push({ jour: r.jour, heure: h5(r.heure), quoi: 'Représentation', spectacle: d.spectacle?.titre || '', lieu: d.lieu ? `${d.lieu.nom || ''}${d.lieu.nom && d.lieu.commune ? ', ' : ''}${d.lieu.commune || ''}` : '' })); }
        else if (finDe(d) < auj) { const n = d.nb_representations || 1; x.cachets += n; x.dates++; x.lignes.push({ jour: d.debut, heure: '', quoi: `${n} représentation${n > 1 ? 's' : ''}`, spectacle: d.spectacle?.titre || '', lieu: d.lieu ? d.lieu.commune || '' : '' }); }
      } else {
        const js = joursDe(d).filter(j => j < auj);
        if (nat === 'repetitions') x.repetitions += js.length; else if (nat === 'residence') x.residences += js.length;
        js.forEach(j => x.lignes.push({ jour: j, heure: '', quoi: nat === 'repetitions' ? 'Répétition' : nat === 'residence' ? 'Résidence' : 'Rendez-vous', spectacle: d.spectacle?.titre || '', lieu: d.lieu ? d.lieu.commune || '' : '' }));
      }
    });
    return [...saisons.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }
  function vueCompteur(r, { focus }) {
    const xs = compteur(), tot = xs.reduce((t, [, x]) => ({ cachets: t.cachets + x.cachets, dates: t.dates + x.dates, repetitions: t.repetitions + x.repetitions, residences: t.residences + x.residences, aVenir: t.aVenir + x.aVenir }), { cachets: 0, dates: 0, repetitions: 0, residences: 0, aVenir: 0 });
    const html = `<div class="titre-vue"><h1>Mon compteur</h1><p class="sous">Vos cachets et vos jours, saison par saison, d’après les dates où vous partez.</p></div>
      <section class="carte compteur-total" aria-label="En tout"><div><b>${tot.cachets}</b><span>cachet${tot.cachets > 1 ? 's' : ''} joué${tot.cachets > 1 ? 's' : ''}</span></div><div><b>${tot.dates}</b><span>date${tot.dates > 1 ? 's' : ''}</span></div><div><b>${tot.repetitions}</b><span>jour${tot.repetitions > 1 ? 's' : ''} de répétition</span></div><div><b>${tot.aVenir}</b><span>à venir</span></div></section>
      ${xs.length ? `<section class="carte"><h2>Saison par saison</h2><table class="compteur"><thead><tr><th>Saison</th><th>Cachets</th><th>Dates</th><th>Répétitions</th><th>Résidences</th><th>À venir</th></tr></thead><tbody>${xs.map(([k, x]) => `<tr><td>${esc(k)}</td><td>${x.cachets}</td><td>${x.dates}</td><td>${x.repetitions}</td><td>${x.residences}</td><td>${x.aVenir}</td></tr>`).join('')}</tbody></table>
        <p class="aide">Un cachet par représentation jouée (hors séances annulées) ; les jours de répétition et de résidence sont comptés par jour. Les séances d’atelier sont tenues par l’administration.</p>
        <p class="soir-gestes"><button type="button" class="btn petit" data-compteur-csv>${I.telecharge}Exporter en CSV</button><button type="button" class="btn petit" data-compteur-attestation>${I.pdf}Attestation à imprimer</button></p></section>` : '<section class="carte"><p class="aide">Aucune date jouée pour l’instant.</p></section>'}`;
    A.afficher(r, 'Mon compteur', html, { focus });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-compteur-csv], [data-compteur-attestation]'); if (!b) return;
    const xs = compteur(), lignes = xs.flatMap(([k, x]) => x.lignes.map(l => ({ saison: k, ...l }))).sort((a, b2) => a.jour.localeCompare(b2.jour));
    if (b.hasAttribute('data-compteur-csv')) {
      const l = r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
      const csv = [l(['Saison', 'Jour', 'Heure', 'Quoi', 'Spectacle', 'Lieu']), ...lignes.map(x => l([x.saison, x.jour, x.heure, x.quoi, x.spectacle, x.lieu]))].join('\r\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = 'mon-compteur.csv'; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      return;
    }
    const w = window.open('', '_blank'); if (!w) return annoncer('Autorisez l’ouverture d’une fenêtre pour l’attestation.', { erreur: true });
    const nom = nomDe(E.personne) || 'Membre de l’équipe';
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Relevé des dates · ${esc(nom)}</title><style>body{font:11pt/1.4 "Segoe UI",Arial,sans-serif;margin:20mm;color:#111}h1{font-size:18pt;margin:0 0 4mm}p{margin:0 0 3mm}table{width:100%;border-collapse:collapse;margin-top:6mm;font-size:10pt}th,td{border:1px solid #bbb;padding:2mm 3mm;text-align:left}th{background:#f1ecf0}.pied{margin-top:10mm;color:#555;font-size:9pt}@page{margin:15mm}</style></head><body>
      <h1>Relevé des dates de ${esc(nom)}</h1><p>Compagnie Crescite · établi le ${esc(jourLong(aujourdhui()))} d’après l’espace de l’équipe. ${lignes.length} ligne${lignes.length > 1 ? 's' : ''} ; ${xs.reduce((n, [, x]) => n + x.cachets, 0)} cachet${xs.reduce((n, [, x]) => n + x.cachets, 0) > 1 ? 's' : ''}.</p>
      <table><thead><tr><th>Saison</th><th>Jour</th><th>Heure</th><th>Quoi</th><th>Spectacle</th><th>Lieu</th></tr></thead><tbody>${lignes.map(x => `<tr><td>${esc(x.saison)}</td><td>${esc(jourSansAn(x.jour))}</td><td>${esc(x.heure ? heureTexte(x.heure) : '')}</td><td>${esc(x.quoi)}</td><td>${esc(x.spectacle)}</td><td>${esc(x.lieu)}</td></tr>`).join('')}</tbody></table>
      <p class="pied">Ce relevé est tiré des dates enregistrées par la compagnie ; il ne vaut pas attestation d’employeur. Pour une attestation signée, adressez-vous à l’administration.</p></body></html>`);
    w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch (err) { /* la fenêtre reste ouverte */ } }, 300);
  });

  // ================================================================================================ les vues, les blocs, le style
  EXT.lireRoute = h => {
    let m;
    if ((m = h.match(/^#\/direct\/(\d+)$/))) return { k: 'direct', id: +m[1], onglet: 'saison', profondeur: 1, hash: h };
    if ((m = h.match(/^#\/equipe\/(\d+)$/))) return { k: 'equipe', id: +m[1], onglet: 'saison', profondeur: 1, hash: h };
    if (h === '#/compteur') return { k: 'compteur', onglet: 'moi', profondeur: 1, hash: h };
    if (h === '#/creneaux') return { k: 'creneaux', onglet: 'planning', profondeur: 1, hash: h };
    return null;
  };
  EXT.vues = { direct: vueDirect, equipe: vueEquipe, compteur: vueCompteur, creneaux: vueCreneaux };
  EXT.blocsDate = (d, o) => (!o.vive ? '' : (o.passee ? '' : blocPresence(d)) + blocFil(d, o) + (o.passee ? '' : blocTrajets(d, o) + blocChecklist(d, o)));
  EXT.apresDate = (d, o) => { if (o.vive && avecScript()) dessinerFil(d); };
  EXT.blocsSaison = () => rappels();
  EXT.blocsMoi = () => `<section class="carte-action" aria-labelledby="t-compteur"><span class="ic-rond" aria-hidden="true">${I.compteur}</span><div class="ca-texte"><h2 id="t-compteur">Mon compteur</h2><p class="aide">Vos cachets, vos dates et vos jours de répétition, saison par saison ; un CSV, un relevé à imprimer.</p></div><a class="btn petit" href="#/compteur">Voir</a></section>
    <section class="carte-action" aria-labelledby="t-creneaux"><span class="ic-rond" aria-hidden="true">${I.planning}</span><div class="ca-texte"><h2 id="t-creneaux">Mes créneaux libres</h2><p class="aide">Les périodes où vous aimeriez jouer, proposées à l’administration.</p></div><a class="btn petit" href="#/creneaux">Proposer</a></section>
    <div id="zone-emport"></div>`;
  EXT.apresMoi = () => { carteEmport().then(h => { const z = $('#zone-emport'); if (z) z.innerHTML = h; }); };

  const style = document.createElement('style');
  style.textContent = `
.tn-bloc h2 .ic { width: 20px; height: 20px; }
.tn-sous { margin: 14px 0 6px; font-size: .9rem; color: var(--gris); text-transform: uppercase; letter-spacing: .06em; }
.choix-presence { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.etat-presence { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; color: var(--gris); font-size: .95rem; }
.etat.ok-presence { background: var(--ok-doux); color: var(--ok); }
.etat.emportee { background: var(--surface-2); color: var(--gris); }
.lu-ligne { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 0; }
.soir-gestes { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 0; }
.portraits.soir li { align-items: flex-start; }
.soir-coord { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.soir-groupe { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 0; }
.soir-contacts { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 8px; }
.soir-contacts li { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.lieu-nom { margin: 0 0 8px; line-height: 1.4; }
.fil-photos { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
.fil-photos img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 10px; display: block; }
.fil-photos .aide { display: block; font-size: .8rem; margin-top: 3px; }
.fil-messages { display: grid; gap: 10px; max-height: 420px; overflow: auto; margin-bottom: 12px; }
.fil-msg { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; }
.fil-corps { background: var(--surface-2); border-radius: 14px 14px 14px 4px; padding: 8px 12px; min-width: 0; }
.fil-msg.moi .fil-corps { background: color-mix(in srgb, var(--magenta-doux) 70%, var(--surface)); }
.fil-tete { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: .88rem; }
.fil-texte { margin: 4px 0 0; white-space: normal; overflow-wrap: anywhere; }
.fil-mention { color: var(--magenta); font-weight: 700; }
.fil-photo img { display: block; max-width: 240px; max-height: 240px; border-radius: 10px; margin-top: 6px; }
.fil-retirer { margin-left: auto; width: 28px; height: 28px; border: 0; border-radius: 50%; background: none; color: var(--gris); cursor: pointer; display: grid; place-items: center; }
.fil-retirer .ic { width: 16px; height: 16px; }
.fil-saisie { position: relative; }
.fil-form textarea { width: 100%; box-sizing: border-box; resize: vertical; }
.fil-pied { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 8px; }
.fil-pied .fil-fichier { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nt-propositions { position: absolute; left: 0; bottom: calc(100% + 4px); z-index: 12; display: flex; flex-direction: column; min-width: 220px; padding: 4px; background: var(--surface); border: 1px solid var(--filet); border-radius: 12px; box-shadow: 0 10px 30px -12px rgba(0, 0, 0, .4); }
.nt-propositions button { border: 0; background: none; text-align: left; padding: 8px 10px; border-radius: 8px; cursor: pointer; font: inherit; color: inherit; }
.nt-propositions button[aria-selected="true"], .nt-propositions button:hover { background: var(--magenta-doux); }
.trajets { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.trajet { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: start; }
.trajet-corps { display: grid; gap: 2px; min-width: 0; }
.trajet-corps > span { display: flex; align-items: center; gap: 6px; }
.trajet-corps .ic { width: 18px; height: 18px; flex: none; }
.trajet-gestes { display: flex; gap: 4px; }
.trajets.lecture .trajet { grid-template-columns: auto minmax(0, 1fr); }
.checklist { list-style: none; margin: 0 0 10px; padding: 0; display: grid; gap: 4px; }
.checklist li { display: flex; align-items: center; gap: 6px; padding: 6px 4px; border-radius: 10px; }
.checklist li label { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; cursor: pointer; }
.checklist li input { width: 22px; height: 22px; accent-color: var(--magenta); flex: none; }
.checklist li.fait span { text-decoration: line-through; color: var(--gris); }
.check-retirer { width: 32px; height: 32px; border: 0; border-radius: 50%; background: none; color: var(--gris); cursor: pointer; display: grid; place-items: center; }
.check-retirer .ic { width: 16px; height: 16px; }
.check-ajout { display: flex; gap: 8px; }
.check-ajout input { flex: 1; min-width: 0; }
.notif-actions { display: flex; flex-wrap: wrap; gap: 6px; padding: 6px 10px 10px 64px; }
.notif-actions .btn.oui { border-color: var(--ok); color: var(--ok); } .notif-actions .btn.non { border-color: var(--alerte); color: var(--alerte); }
.carte-action.rappel { border-color: color-mix(in srgb, var(--magenta) 40%, var(--filet)); }
.carte-action.rappel .ca-texte p { margin: 4px 0 0; }
.creneaux { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.creneaux li { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 10px; border-radius: 10px; background: var(--surface-2); }
.nf-km-ligne { display: flex; gap: 8px; align-items: center; }
.nf-km-ligne input { width: 120px; }
.recap-frais, .compteur { width: 100%; border-collapse: collapse; font-size: .92rem; }
.recap-frais th, .recap-frais td, .compteur th, .compteur td { padding: 7px 8px; text-align: left; border-bottom: 1px solid var(--filet); }
.recap-frais td:nth-child(n+2), .recap-frais th:nth-child(n+2), .compteur td:nth-child(n+2), .compteur th:nth-child(n+2) { text-align: right; white-space: nowrap; }
.compteur-total { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
.compteur-total div { display: grid; text-align: center; padding: 8px; border-radius: 12px; background: var(--surface-2); }
.compteur-total b { font-size: 1.8rem; }
.compteur-total span { color: var(--gris); font-size: .85rem; }
.geste.fait { border-color: var(--ok); color: var(--ok); }
.direct { display: grid; gap: 14px; }
.direct-sur { display: flex; align-items: center; gap: 8px; margin: 0; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; font-size: .78rem; color: var(--gris); }
.direct-rideau { padding: 18px 20px; border-radius: 20px; background: var(--surface); border: 1px solid var(--filet); display: grid; gap: 2px; }
.direct-lib { font-size: .95rem; color: var(--gris); }
.direct-compte { font-size: clamp(2.4rem, 10vw, 4rem); line-height: 1; font-weight: 800; }
.direct-heure { color: var(--gris); }
.direct-etape { display: grid; gap: 2px; padding: 14px 18px; border-radius: 16px; background: var(--surface); border: 1px solid var(--filet); }
.direct-etape.maintenant { border-color: var(--magenta); box-shadow: 0 0 0 3px color-mix(in srgb, var(--magenta) 25%, transparent); }
.direct-etape .direct-h { font-size: 1.1rem; font-weight: 700; color: var(--magenta); }
.direct-etape .direct-t { font-size: clamp(1.3rem, 5vw, 2rem); font-weight: 700; line-height: 1.15; }
.direct-etape .direct-s { color: var(--gris); }
.direct-frise { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.direct-frise li { display: flex; gap: 12px; padding: 6px 8px; border-radius: 8px; }
.direct-frise li span:first-child { min-width: 54px; font-weight: 700; }
.direct-frise li.passe { opacity: .45; } .direct-frise li.maintenant { background: color-mix(in srgb, var(--magenta) 14%, transparent); }
.direct-gestes { display: grid; gap: 8px; }
.direct-veille { margin: 0; }
.direct-aide { margin: 0; color: var(--gris); }
html.direct-ouvert #contenu { color-scheme: dark; --surface: #17101a; --surface-2: #241a28; --filet: #3a2d3e; --encre: #f6eef3; --gris: #b8a9b6; background: #0d080f; color: #f6eef3; border-radius: 16px; padding: 14px; }
html.direct-ouvert .direct .btn { background: #241a28; border-color: #3a2d3e; color: #f6eef3; font-size: 1.05rem; }
@media (prefers-reduced-motion: reduce) { .direct-etape.maintenant { box-shadow: none; } }`;
  document.head.append(style);
})();
