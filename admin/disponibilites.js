'use strict';
/* La rubrique Planning de l'administration : le planning de toute l'équipe et les propositions de dates (script SQL 5,
   supabase/migrations/20261024_crescite_disponibilites.sql). Chargé après equipe.js et planning.js : il se sert de
   l'état de l'administration (E : personnes, coordonnées, distributions, spectacles), de ses outils (cadre, annoncer,
   erreur, copier, nomDe…) et de PLANNING, le planning commun avec l'espace de l'équipe.
     #/planning                    le planning de toute l'équipe : vue Équipe (par défaut) ou Mois, filtres par spectacle
                                   et par personne, motifs des indisponibilités visibles ; un jour choisi : le proposer
     #/planning/propositions       les propositions, ouvertes d'abord : réponses et courriels d'un coup d'œil
     #/planning/proposer           proposer des dates : des journées, une période ou des heures, un titre, un message, un
                                   spectacle, les personnes (une distribution d'un geste), en voyant qui n'est pas libre
     #/planning/proposition/<id>   le suivi : pour chacun et chaque jour, sa réponse et son mot ; l'état de son courriel,
                                   « Renvoyer le courriel » ; « Clore ». Quand le courriel n'est pas parti, de quoi prévenir
                                   soi-même : un courriel tout prêt et le lien de la proposition dans l'espace de l'équipe.
                                   Chaque jour : « Créer la date », le formulaire d'une nouvelle date pré-rempli (spectacle,
                                   jour et heures, lieu connu, équipe : qui a dit oui ce jour-là) ; la date enregistrée, la
                                   proposition se clôt et la garde (date_id : « Date retenue »).
                                   Le lien de réponse personnel (sans connexion) n'est pas lisible ici : les règles de la
                                   base gardent la clé de chacun au seul courriel.
   Sans le script 5, la rubrique le dit en une phrase et rien d'autre ne change. Les propositions ne sont pas dans le
   temps réel de la base : elles se relisent à l'ouverture, par « Actualiser » et au retour sur l'onglet.
   Dans le planning, l'administratrice masque les personnes qu'elle ne suit pas (sur leur ligne, ou dans le détail) et les
   fait revenir par « Masquées » ; la liste est gardée avec son compte (script SQL 6, crescite_preferences), sinon sur cet
   appareil. */
const DISPONIBILITES = (() => {
  // ===================================================================================================== état
  Object.assign(E, { sql5: null, sql5Erreur: '', propositions: [], propositionsLues: false });
  const DP = { planning: null, calendrier: null, lectures: [], canal: null, brouillon: null, sonde: null, renvois: new Map(),
    masques: undefined, masquesDe: null, lectureMasques: null };

  // ===================================================================================================== outils
  const PLN = () => (typeof PLANNING !== 'undefined' && PLANNING && typeof PLANNING.monter === 'function' ? PLANNING : null);
  const absent = e => !!e && /PGRST202|PGRST205|42883|42P01|Could not find the (function|table)|does not exist|schema cache/i.test(`${e.code || ''} ${e.message || ''}`);
  const minuitIso = j => new Date(PLN().outils.minuit(j)).toISOString();
  const heureIso = (j, h) => new Date(PLN().outils.instant(j, h)).toISOString();
  const plusJ = (j, n) => PLN().outils.jourPlus(j, n);
  const estJour = j => /^\d{4}-\d{2}-\d{2}$/.test(j || '');
  const estHeure = h => /^\d{2}:\d{2}$/.test(h || '');
  const maj1 = s => (s ? s[0].toUpperCase() + s.slice(1) : '');
  const pl = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs || `${un}s` : un}`;
  const memeId = (a, b) => a != null && b != null && String(a) === String(b);
  // la proposition dans l'espace de l'équipe (publié à côté de l'administration)
  const lienEquipe = id => `${new URL('../equipe/', location.href).href}#/proposition/${id}`;
  const JC = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const jourC = j => { const d = new Date(`${j}T12:00:00Z`); return `${JC[d.getUTCDay()]} ${+j.slice(8, 10)} ${MC[+j.slice(5, 7) - 1]}`; };
  const heureT = h => PLN().outils.heureTexte(h);
  const heuresDe = u => (u.de && u.a ? `${heureT(u.de)}–${heureT(u.a)}` : u.de ? `dès ${heureT(u.de)}` : u.a ? `jusqu’à ${heureT(u.a)}` : '');
  // « mar. 12 nov. », « du lun. 10 au mer. 12 nov. », « jeu. 5 nov., 14h–17h »
  function jourCourtDe(x) {
    const js = PLN().joursDe(x);
    if (!js.length) return '';
    if (js.length === 1) return js[0].entier ? jourC(js[0].jour) : `${jourC(js[0].jour)}, ${heuresDe(js[0])}`;
    return `du ${jourC(js[0].jour)} au ${jourC(js[js.length - 1].jour)}`;
  }
  const jourLongDe = x => maj1(PLN().texteJours(x));
  const REP = { oui: { signe: '✓', texte: 'Disponible', classe: 'oui' }, non: { signe: '✗', texte: 'Pas disponible', classe: 'non' },
    peut_etre: { signe: '?', texte: 'Peut-être', classe: 'pe' } };
  const ATTENTE = { signe: '…', texte: 'En attente', classe: 'attente' };
  const reponseDe = (jour, pid) => (jour.reponses || []).find(r => memeId(r.personne_id, pid)) || null;
  const nomP = id => nomDe(personne(+id)) || 'Une personne retirée';
  const distributionIds = spId => [...new Set(distributionDe(+spId).map(x => x.personne_id))];
  const spectaclesPlanning = () => E.spectacles.filter(s => s.page || E.dates.some(d => d.spectacle_id === s.id && (d.fin || d.debut) >= AUJ))
    .map(s => ({ id: s.id, slug: s.slug, titre: s.titre, couleur: s.univers?.couleurs?.scene || null }));
  const distributionsPlanning = () => E.distributions.map(x => ({ spectacle_id: x.spectacle_id, personne_id: x.personne_id }));
  const moiAdmin = () => E.admins.find(x => x.user_id === E.session?.user?.id)?.nom || '';

  // ===================================================================================================== lire
  const SEL = 'id, titre, message, statut, spectacle_id, date_id, cree_le, jours:crescite_propositions_jours(id, debut, fin, journee, reponses:crescite_propositions_reponses(id, personne_id, reponse, commentaire, repondu_le)), destinataires:crescite_propositions_destinataires(id, personne_id, courriel_statut, courriel_le)';
  // les propositions (et la sonde du script 5 : sans lui, la table n'existe pas)
  async function chargerPropositions() {
    const { data, error } = await sb.from('crescite_propositions').select(SEL).order('cree_le', { ascending: false }).limit(200);
    if (error) {
      if (absent(error)) { E.sql5 = false; E.sql5Erreur = ''; return false; }
      E.sql5Erreur = error.message || String(error);
      throw error;
    }
    E.sql5 = true; E.sql5Erreur = '';
    E.propositions = (data || []).map(p => ({ ...p, id: Number(p.id), destinataires: p.destinataires || [],
      jours: (p.jours || []).slice().sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : a.id - b.id)) }));
    E.propositionsLues = true;
    return true;
  }
  // le planning d'une période (crescite_planning : tout, motifs compris, pour l'administration), gardé un moment
  async function lirePlanning(de, a) {
    const { data, error } = await sb.rpc('crescite_planning', { de, a });
    if (error) { if (absent(error)) E.sql5 = false; throw error; }
    DP.lectures = [{ de, a, D: data }, ...DP.lectures.filter(x => !(x.de === de && x.a === a))].slice(0, 12);
    return data;
  }
  const lectureDe = j => DP.lectures.find(x => x.de <= j && x.a >= j) || null;
  // les personnes masquées du planning : gardées avec le compte (crescite_preferences, script SQL 6, clé planning.masques),
  // par PREFS (prefs.js), qui les garde sur l'appareil tant que le script manque (dans crescite-planning-masques, que
  // partage l'espace de l'équipe) et les passe dans la base dès qu'il est là. Une table absente ne se dit pas : le planning
  // marche pareil. Sans prefs.js dans la page, le repli d'avant : l'appareil seul.
  const PREF_MASQUES = 'planning.masques', LOCAL_MASQUES = 'crescite-planning-masques';
  const PR = () => (typeof PREFS !== 'undefined' ? PREFS : null);
  const masquesIci = () => { try { const v = JSON.parse(localStorage.getItem(LOCAL_MASQUES) || 'null'); return Array.isArray(v) ? v : null; } catch { return null; } };
  const garderIci = ids => { try { localStorage.setItem(LOCAL_MASQUES, JSON.stringify(ids)); } catch { /* stockage interdit */ } };
  const masquesLus = () => { const v = PR() ? PR().lire(PREF_MASQUES, []) : masquesIci(); return Array.isArray(v) ? v : []; };
  function lireMasques() {
    const uid = E.session?.user?.id || null;
    if (DP.masquesDe !== uid) Object.assign(DP, { masquesDe: uid, masques: undefined, lectureMasques: null });
    if (!DP.lectureMasques) DP.lectureMasques = (PR() ? PR().charger() : Promise.resolve())
      .then(() => { if (DP.masquesDe === uid) DP.masques = masquesLus(); })     // (un autre compte entre-temps : sa lecture est la sienne)
      .catch(() => { if (DP.masques === undefined) DP.masques = masquesIci() || []; });
    return DP.lectureMasques;
  }
  // chaque changement s'enregistre tout de suite (un clic), dans l'ordre
  function garderMasques(ids) {
    DP.masques = ids;
    if (PR()) PR().ecrire(PREF_MASQUES, ids, { aussitot: true });
    else garderIci(ids);
  }
  // les indisponibilités se voient en direct (la seule table du script 5 dans le temps réel)
  function ecouter() {
    if (DP.canal || !E.sql5) return;
    let t = null;
    DP.canal = sb.channel('crescite-admin-dispo').on('postgres_changes', { event: '*', schema: 'public', table: 'crescite_indisponibilites' }, () => {
      clearTimeout(t);
      t = setTimeout(() => { DP.lectures = []; if (DP.planning) DP.planning.actualiser(); if (DP.calendrier) DP.calendrier.actualiser(); }, 700);
    }).subscribe();
  }
  function detruire() {
    for (const k of ['planning', 'calendrier']) { try { if (DP[k]) DP[k].detruire(); } catch (e) { /* déjà parti */ } DP[k] = null; }
  }
  window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/planning')) detruire(); });
  // de retour sur l'onglet : les réponses ont pu arriver
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !E.sql5 || E.sale) return;
    const m = location.hash.match(/^#\/planning\/(propositions|proposition\/(\d+))$/);
    if (m) chargerPropositions().then(() => { if (location.hash === m[0] && !E.sale) vue(m[1]); }).catch(() => {});
  });

  // ===================================================================================================== la rubrique
  const entete = partie => {
    const ouvertes = E.propositions.filter(p => p.statut === 'ouverte').length;
    return `<div class="tete"><h1>Planning</h1>${E.sql5 ? `<div class="seg" role="group" aria-label="Partie"><button type="button" data-dp-partie="" aria-pressed="${partie === 'planning'}">Planning de l’équipe</button><button type="button" data-dp-partie="propositions" aria-pressed="${partie !== 'planning'}">Propositions${ouvertes ? ` <span class="dp-nb" aria-hidden="true">${ouvertes}</span><span class="sr">, ${pl(ouvertes, 'ouverte')}</span>` : ''}</button></div>
      <a class="btn principal" href="#/planning/proposer">＋ Proposer des dates</a>` : ''}</div>`;
  };
  const parties = () => $$('[data-dp-partie]').forEach(b => b.addEventListener('click', () => { location.hash = `#/planning${b.dataset.dpPartie ? `/${b.dataset.dpPartie}` : ''}`; }));
  const PHRASE_ABSENT = 'Le planning de l’équipe n’est pas encore installé : exécutez <code>supabase/migrations/20261024_crescite_disponibilites.sql</code> dans Supabase (SQL Editor), puis rechargez cette page.';

  function vue(param) {
    const partie = !param ? 'planning' : param === 'propositions' || param === 'proposer' ? param : 'suivi';
    const id = partie === 'suivi' ? +String(param).split('/')[1] : null;
    detruire();
    if (!E.equipeInstallee) { cadre('planning', `<div class="tete"><h1>Planning</h1></div>${equipeAbsente()}`); return; }
    if (!PLN()) { cadre('planning', '<div class="tete"><h1>Planning</h1></div><div class="bloc dp-absent"><p>Le planning (planning.js) n’a pas été chargé : rechargez la page.</p></div>'); return; }
    if (E.sql5 === false) { cadre('planning', `<div class="tete"><h1>Planning</h1></div><div class="bloc dp-absent"><p>${PHRASE_ABSENT}</p></div>`); return; }
    if (E.sql5 === null || !E.propositionsLues) {
      cadre('planning', `<div class="tete"><h1>Planning</h1></div><p class="chargement" role="status">Lecture du planning…</p>`);
      const h = location.hash;
      if (!DP.sonde) DP.sonde = chargerPropositions().finally(() => { DP.sonde = null; });
      DP.sonde.then(() => { if (location.hash === h) vue(param); }, e => {
        if (location.hash === h) cadre('planning', `<div class="tete"><h1>Planning</h1></div><div class="bloc dp-absent"><p>Le planning n’a pas pu être lu (${esc(e?.message || e)}) : rechargez la page dans un moment.</p></div>`);
      });
      return;
    }
    ecouter();
    if (partie === 'planning') return partiePlanning();
    if (partie === 'proposer') return partieProposer();
    partiePropositions(partie, id);
  }

  // ===================================================================================================== le planning de l'équipe
  function partiePlanning() {
    cadre('planning', `${entete('planning')}<div id="dp-planning" class="dp-planning"></div>
      <p class="aide dp-note">Les motifs des indisponibilités ne se lisent qu’ici et dans l’espace de la personne. Choisissez un jour (ou une case d’une personne) pour le proposer.</p>`);
    parties();
    const st = session.planning || {};
    const vueP = st.vue === 'mois' ? 'mois' : 'equipe', jour = estJour(st.jour) ? st.jour : AUJ, semaines = [4, 6, 8].includes(+st.semaines) ? +st.semaines : 6;
    const per = PLN().periode(vueP, jour, semaines);
    // une période déjà lue s'affiche tout de suite, si l'on sait déjà qui est masqué (sinon, elle se relit avec la liste)
    let pl = null, masquesPoses = DP.masques !== undefined && DP.masquesDe === (E.session?.user?.id || null);
    const garde = masquesPoses ? DP.lectures.find(x => x.de === per.de && x.a === per.a) : null;
    pl = DP.planning = PLN().monter($('#dp-planning'), {
      vue: vueP, jour, semaines, filtre: st.filtre || null, donnees: garde ? garde.D : undefined,
      masquer: true, masques: masquesPoses ? DP.masques : [], surMasques: garderMasques,
      // la première période se lit avec la liste des personnes masquées : le planning paraît sans elles
      charger: async (de, a) => {
        const [D] = await Promise.all([lirePlanning(de, a), lireMasques()]);
        if (pl && !masquesPoses) { masquesPoses = true; pl.masques(DP.masques); }
        return D;
      },
      messageErreur: e => (absent(e) ? 'Le planning n’est pas encore installé dans la base.' : `Le planning n’a pas pu être lu : ${e?.message || 'réessayez dans un instant'}.`),
      photo: photoUrl, spectacles: spectaclesPlanning(), distributions: distributionsPlanning(),
      actions: actionsJour, titre: 'Planning de toute l’équipe',
      surChangement: etat => { session.planning = { vue: etat.vue, jour: etat.jour, semaines: etat.semaines, filtre: etat.filtre }; garderFiltres(); },
    });
    if (garde) DP.planning.actualiser();
  }
  // un jour choisi dans le planning : le proposer, suivre ses propositions, ouvrir ses dates
  function actionsJour(s) {
    const acts = [];
    if (s.jour >= AUJ) acts.push({ libelle: s.personne ? `Proposer ce jour à ${nomDe(s.personne)}` : 'Proposer ce jour', principal: true, faire: proposerDepuis });
    const vues = new Set();
    for (const x of s.propositions) {
      if (vues.has(x.proposition.id)) continue;
      vues.add(x.proposition.id);
      acts.push({ libelle: `Suivre « ${x.proposition.titre} »`, faire: () => { location.hash = `#/planning/proposition/${x.proposition.id}`; } });
    }
    for (const d of s.dates.slice(0, 2)) acts.push({ libelle: `Ouvrir la date : ${titreCourt(d.spectacle)}`, faire: () => { location.hash = `#/representations/${d.id}`; } });
    if (s.personne) acts.push({ libelle: `Fiche de ${nomDe(s.personne)}`, faire: () => { location.hash = `#/equipe/${s.personne.id}`; } });
    return acts;
  }
  function proposerDepuis(sel) {
    const f = DP.planning ? DP.planning.etat().filtre : {};
    const sp = f.spectacle != null ? +f.spectacle : null;
    const personnes = sel.personne ? [+sel.personne.id] : f.personne != null ? [+f.personne] : sp != null ? distributionIds(sp) : [];
    DP.brouillon = { lignes: [{ forme: 'journee', du: sel.jour }], personnes, spectacle_id: sp };
    location.hash = '#/planning/proposer';
  }

  // ===================================================================================================== les propositions
  function bilan(p) {
    const n = { oui: 0, non: 0, peut_etre: 0, attente: 0 };
    for (const j of p.jours) for (const d of p.destinataires) n[reponseDe(j, d.personne_id)?.reponse || 'attente']++;
    return n;
  }
  const bilanHtml = n => [['oui', '✓', 'disponible'], ['non', '✗', 'pas disponible'], ['peut_etre', '?', 'peut-être'], ['attente', '…', 'en attente']]
    .filter(([k]) => n[k]).map(([k, s, t]) => `<span class="dp-r ${k === 'peut_etre' ? 'pe' : k}"><span aria-hidden="true">${s}</span> ${n[k]}<span class="sr"> ${t}</span></span>`).join(' ');
  // l'état du courriel d'un destinataire : ce que la base en sait, et ce qu'on peut faire
  function etatCourriel(d, p) {
    const s = String(d.courriel_statut || ''), renvoi = DP.renvois.get(d.id);
    if (renvoi && Date.now() - renvoi < 90e3 && !(d.courriel_le && Date.parse(d.courriel_le) >= renvoi - 2e3)) return { classe: 'attente', texte: 'Courriel renvoyé : envoi en cours…' };
    if (s === 'envoye') return { classe: 'ok', texte: `Courriel envoyé${d.courriel_le ? ` le ${quandTexte(d.courriel_le)}` : ''}` };
    if (s === 'non_configure') return { classe: 'option', texte: 'Courriel non configuré : à prévenir vous-même', prevenir: true };
    if (s === 'sans_adresse') return { classe: 'alerte', texte: 'Pas d’adresse électronique : pas de courriel', prevenir: true, adresse: true };
    if (s.startsWith('erreur')) return { classe: 'alerte', texte: `Le courriel n’est pas parti (${s.replace(/^erreur\s*:\s*/, '').slice(0, 90) || 'erreur'})`, prevenir: true };
    if (Date.now() - Date.parse(p.cree_le) < 3 * 60e3) return { classe: 'attente', texte: 'Courriel en cours d’envoi…' };
    return { classe: 'option', texte: 'Courriel pas parti : l’envoi n’est pas en place', prevenir: true };
  }
  const aPrevenir = p => p.destinataires.filter(d => etatCourriel(d, p).prevenir);
  function partiePropositions(partie, id) {
    const f = session.propositions = Object.assign({ q: '', etat: '' }, session.propositions || {});
    cadre('planning', `${entete(partie)}<div class="deux${partie === 'suivi' ? ' edition' : ''}"><div class="liste"><div class="filtres">
        <input type="search" id="dp-q" placeholder="Chercher un titre, une personne" value="${esc(f.q)}" aria-label="Chercher une proposition">
        <select id="dp-etat" aria-label="État">${[['', 'Toutes les propositions'], ['ouverte', 'Ouvertes'], ['close', 'Closes']].map(([k, l]) => `<option value="${k}"${f.etat === k ? ' selected' : ''}>${l}</option>`).join('')}</select>
        <span class="compte" id="dp-compte"></span></div><div data-liste id="l-propositions"></div></div>
      <section class="editeur" id="ed-dispo">${partie === 'suivi' ? '' : accueilPropositions()}</section></div>`);
    parties();
    const zone = $('#l-propositions');
    zone.rafraichir = () => listePropositions(zone, id);
    zone.rafraichir();
    $('#dp-q').addEventListener('input', e => { f.q = e.target.value; garderFiltres(); zone.rafraichir(); });
    $('#dp-etat').addEventListener('change', e => { f.etat = e.target.value; garderFiltres(); zone.rafraichir(); });
    if (partie === 'suivi') suivi($('#ed-dispo'), id);
  }
  function listePropositions(zone, actif) {
    const f = session.propositions, q = norm(f.q).trim();
    const xs = E.propositions.filter(p => (!f.etat || p.statut === f.etat)
      && (!q || norm(`${p.titre} ${p.message || ''} ${spectacle(p.spectacle_id)?.titre || ''} ${p.destinataires.map(d => nomP(d.personne_id)).join(' ')}`).includes(q)))
      .sort((a, b) => (a.statut === 'ouverte' ? 0 : 1) - (b.statut === 'ouverte' ? 0 : 1) || (a.cree_le < b.cree_le ? 1 : -1));
    $('#dp-compte').textContent = pl(xs.length, 'proposition');
    zone.innerHTML = xs.map(p => {
      const sp = spectacle(p.spectacle_id), prev = aPrevenir(p).length, close = p.statut === 'close';
      const j0 = p.jours[0];
      return `<a class="ligne dp-prop${close ? ' close' : ''}" href="#/planning/proposition/${p.id}"${memeId(actif, p.id) ? ' aria-current="true"' : ''} style="--c:${sp ? couleurSp(sp) : 'var(--accent)'}">
        <span class="corps"><span class="t">${esc(p.titre)}</span><span class="ou">${j0 ? esc(jourCourtDe(j0)) : 'Aucun jour'}${p.jours.length > 1 ? ` et ${pl(p.jours.length - 1, 'autre')}` : ''} · ${pl(p.destinataires.length, 'personne')}${sp ? ` · ${esc(titreCourt(sp))}` : ''}</span>
        <span class="dp-bilan">${bilanHtml(bilan(p))}</span></span>
        <span class="badges"><span class="badge${close ? '' : ' ok'}">${close ? 'Close' : 'Ouverte'}</span>${prev && !close ? `<span class="badge option">${pl(prev, 'courriel')} à revoir</span>` : ''}</span></a>`;
    }).join('') || listeVide(E.propositions.length > 0, { rien: 'Aucune proposition ne correspond.', aucun: 'Aucune proposition pour l’instant.', ajouter: ['#/planning/proposer', '＋ Proposer des dates'] });
  }
  function accueilPropositions() {
    const nonConf = E.propositions.some(p => p.destinataires.some(d => d.courriel_statut === 'non_configure'));
    return `<div class="bloc"><h3 aria-level="2">Proposer des dates à l’équipe</h3>
        <p>Des jours (une journée, une période ou quelques heures) proposés à quelques personnes : chacune est prévenue dans son espace et par courriel, et répond jour par jour, « disponible », « pas disponible » ou « peut-être », avec un mot si elle veut.</p>
        <p class="dp-p"><a class="btn principal" href="#/planning/proposer">＋ Proposer des dates</a></p>
        ${nonConf ? '<p class="aide">Le service de courriel n’est pas configuré (fonction crescite-courriel et sa clé d’envoi) : les personnes voient la proposition dans leur espace, et le suivi vous donne un courriel tout prêt pour les prévenir vous-même.</p>' : ''}</div>`;
  }

  // ———— le suivi d'une proposition
  function suivi(zone, id) {
    const p = E.propositions.find(x => x.id === id);
    if (!p) {
      zone.innerHTML = '<div class="vide bloc">Cette proposition n’existe pas, ou plus.</div>';
      if (!suivi.relu) { suivi.relu = true; chargerPropositions().then(() => { if (location.hash === `#/planning/proposition/${id}` && E.propositions.some(x => x.id === id)) vue(`proposition/${id}`); }).catch(() => {}).finally(() => { suivi.relu = false; }); }
      return;
    }
    const sp = spectacle(p.spectacle_id), close = p.statut === 'close', retenue = p.date_id != null ? E.dates.find(d => memeId(d.id, p.date_id)) : null;
    const dest = p.destinataires.slice().sort((a, b) => norm(nomP(a.personne_id)).localeCompare(norm(nomP(b.personne_id))));
    const prev = aPrevenir(p), sansReponse = dest.filter(d => p.jours.every(j => !reponseDe(j, d.personne_id)?.reponse) && etatCourriel(d, p).classe !== 'attente');
    const jours = p.jours.map(j => {
      const n = { oui: 0, non: 0, peut_etre: 0, attente: 0 };
      for (const d of dest) n[reponseDe(j, d.personne_id)?.reponse || 'attente']++;
      const tous = dest.length && n.oui === dest.length;
      return `<li><b>${esc(jourLongDe(j))}</b> <span class="dp-bilan">${bilanHtml(n)}</span>${tous ? ' <span class="badge ok">Tout le monde est disponible</span>' : ''}${retenue ? '' : `<button type="button" class="btn petit dp-creer" data-dp="creer-date" data-jour="${j.id}" aria-label="Créer la date du ${esc(jourLongDe(j))}">Créer la date</button>`}</li>`;
    }).join('');
    const tete = p.jours.map(j => `<th scope="col">${esc(jourCourtDe(j))}</th>`).join('');
    const lignes = dest.map(d => {
      const pe = personne(d.personne_id), ec = etatCourriel(d, p), v = priveeDe(d.personne_id);
      const cases = p.jours.map(j => {
        const r = reponseDe(j, d.personne_id), x = r?.reponse ? REP[r.reponse] : ATTENTE;
        return `<td class="dp-c ${x.classe}" data-jour="${esc(jourCourtDe(j))}"><span class="dp-signe" aria-hidden="true">${x.signe}</span><span class="dp-mot">${x.texte}</span>${r?.commentaire ? `<span class="dp-com">« ${esc(r.commentaire)} »</span>` : ''}</td>`;
      }).join('');
      return `<tr><th scope="row"><span class="dp-qui">${avatar(pe, true)}<span class="dp-qui-t"><a href="#/equipe/${d.personne_id}">${esc(nomP(d.personne_id))}</a><small class="dp-mail ${ec.classe}">${esc(ec.texte)}</small></span></span>
        <span class="dp-mail-actions"><button type="button" class="btn petit" data-dp="renvoyer" data-dest="${d.id}"${close ? ' disabled title="La proposition est close"' : ''}>Renvoyer le courriel</button>${ec.prevenir && v?.email ? `<a class="btn petit" href="${esc(courrielPrevenir(p, [d]))}">Écrire</a>` : ''}${ec.adresse ? `<a class="btn petit" href="#/equipe/${d.personne_id}">Ajouter son adresse</a>` : ''}</span></th>${cases}</tr>`;
    }).join('');
    zone.innerHTML = `<div class="titre-ed"><a class="btn petit" data-tt="retour" href="#/planning/propositions" aria-label="Retour aux propositions">←</a><h2>${esc(p.titre)}</h2></div>
      <div class="bloc dp-entete">
        <div class="dp-etiquettes"><span class="badge${close ? '' : ' ok'}">${close ? 'Close' : 'Ouverte'}</span>${sp ? `<span class="dp-sp"><span class="pastille" style="--c:${couleurSp(sp)}"></span>${esc(sp.titre)}</span>` : ''}<span class="compte">Proposée le ${esc(quandTexte(p.cree_le))} · ${pl(dest.length, 'personne')} · ${pl(p.jours.length, 'jour')}</span>${retenue ? `<a class="dp-retenue" href="#/representations/${retenue.id}">Date retenue : ${esc(jourCourt(retenue.debut))} →</a>` : ''}</div>
        ${p.message ? `<p class="dp-message">${esc(p.message).replace(/\n/g, '<br>')}</p>` : ''}
        <ul class="dp-jours-bilan">${jours}</ul>
      </div>
      ${prev.length && !close ? prevenirBloc(p, prev) : ''}
      <div class="bloc"><div class="dp-suivi-tete"><h3>Réponses</h3><button type="button" class="btn petit" data-dp="actualiser">Actualiser</button></div>
        ${dest.length ? `<div class="dp-tableau" role="region" aria-label="Réponses par personne et par jour" tabindex="0"><table class="dp-rep"><thead><tr><th scope="col">Personne</th>${tete}</tr></thead><tbody>${lignes}</tbody></table></div>` : '<p class="aide">Personne n’est destinataire.</p>'}
        <div class="fm-boutons">${close ? '<button type="button" class="btn" data-dp="rouvrir">Rouvrir la proposition</button>'
          : `${sansReponse.length ? `<button type="button" class="btn" data-dp="relancer">Relancer ${sansReponse.length > 1 ? `les ${sansReponse.length} personnes sans réponse` : 'la personne sans réponse'}</button>` : ''}<button type="button" class="btn danger" data-dp="clore">Clore la proposition</button>`}</div>
        <p class="aide">${close ? 'Close : plus personne ne peut répondre. Rouverte, les réponses reprennent.' : 'Chacun peut changer sa réponse tant que la proposition est ouverte. « Clore » arrête les réponses, quand la date est décidée.'}</p></div>`;
    zone.onclick = async e => {
      const b = e.target.closest('[data-dp]');
      if (!b) return;
      const k = b.dataset.dp;
      if (k === 'actualiser') return rafraichirSuivi(id, true);
      if (k === 'copier-lien') return copier(lienEquipe(p.id), 'Adresse de la proposition dans l’espace de l’équipe');
      if (k === 'creer-date') { const j = p.jours.find(x => memeId(x.id, b.dataset.jour)); if (j) creerDate(p, j); return; }
      if (k === 'renvoyer') {
        const d = p.destinataires.find(x => memeId(x.id, b.dataset.dest));
        if (!d) return;
        b.disabled = true;
        const { error } = await sb.rpc('crescite_renvoyer_courriel', { dest: d.id });
        if (error) { b.disabled = false; return erreur(error, 'Le courriel n’est pas reparti'); }
        DP.renvois.set(d.id, Date.now());
        annoncer(`Courriel renvoyé à ${nomP(d.personne_id)}.`);
        suivi(zone, id);
        return attendreCourriels(id);
      }
      if (k === 'relancer') {
        if (!(await confirmerAction({ titre: `Renvoyer le courriel ${sansReponse.length > 1 ? `aux ${sansReponse.length} personnes qui n’ont pas répondu` : 'à la personne qui n’a pas répondu'} ?`, ok: 'Renvoyer le courriel', danger: false }))) return;
        b.disabled = true;
        let n = 0;
        for (const d of sansReponse) { const { error } = await sb.rpc('crescite_renvoyer_courriel', { dest: d.id }); if (!error) { n++; DP.renvois.set(d.id, Date.now()); } }
        annoncer(n === sansReponse.length ? `Courriel renvoyé à ${pl(n, 'personne')}.` : `Courriel renvoyé à ${n} personne(s) sur ${sansReponse.length}.`, { erreur: n < sansReponse.length });
        suivi(zone, id);
        return attendreCourriels(id);
      }
      // clore se fait tout de suite, sans question : l'annonce porte « Annuler », qui la rouvre (la base n'a rien perdu)
      if (k === 'clore' || k === 'rouvrir') {
        b.disabled = true;
        if (!(await statutProposition(p, k === 'clore' ? 'close' : 'ouverte'))) b.disabled = false;
      }
    };
    async function statutProposition(p, statut, { retour = false } = {}) {
      const { data, error } = await sb.from('crescite_propositions').update({ statut }).eq('id', p.id).select('id, statut').single();
      if (error) { erreur(error); return false; }
      p.statut = data.statut;
      const ici = location.hash === `#/planning/proposition/${p.id}` && zone.isConnected;
      if (ici) suivi(zone, p.id);
      $('#l-propositions')?.rafraichir?.();
      if (statut === 'close' && !retour) annoncer('Proposition close : les réponses sont arrêtées.', { libelle: 'Annuler', delai: 8000, action: () => statutProposition(p, 'ouverte', { retour: true }) });
      else annoncer(statut === 'close' ? 'Proposition close : les réponses sont arrêtées.' : 'Proposition rouverte : chacun peut de nouveau répondre.');
      return true;
    }
  }
  // « Créer la date » depuis un jour de la proposition : le formulaire d'une nouvelle date (Représentations), pré-rempli :
  // le spectacle, le jour (ou les jours) et ses heures, le lieu quand on le connaît (la date liée à la proposition, sinon un
  // lieu dont le titre ou le message donne le nom), la nature d'après le titre (des répétitions, une résidence : jamais sur
  // le site), et l'équipe : la distribution en tournée, moins les destinataires qui n'ont pas répondu oui ce jour-là (qui
  // n'a pas été sollicité reste : proposer un jour à une seule remplaçante ne vide pas l'équipe), plus les renforts qui ont
  // dit oui. La proposition se clôt une fois la date enregistrée (apresDate) ; quitter le formulaire n'y touche pas.
  function dateDepuis(p, j) {
    const G = nouvelleDate(), js = PLN().joursDe(j);
    if (!js.length) return null;
    if (p.spectacle_id != null && spectacle(Number(p.spectacle_id))) G.spectacle_id = Number(p.spectacle_id);
    G.debut = js[0].jour; G.fin = js[js.length - 1].jour;
    G.representations = js.map(u => ({ jour: u.jour, heure: u.entier ? '' : u.de || '', fin: u.entier ? '' : u.a || '', public: 'tout_public', annulee: false, lien: '', note: '' }));
    const t = norm(`${p.titre} ${p.message || ''}`), liee = p.date_id != null ? E.dates.find(d => memeId(d.id, p.date_id)) : null;
    const nomme = E.lieux.filter(l => norm(l.nom).trim().length > 3 && t.includes(norm(l.nom).trim())).sort((a, b) => b.nom.length - a.nom.length)[0];
    G.lieu_id = liee?.lieu_id ?? nomme?.id ?? null;
    if (E.sql3) { G.nature = /repetition/.test(t) ? 'repetitions' : /residence/.test(t) ? 'residence' : 'representations'; if (G.nature !== 'representations') G.visible = false; }
    const oui = new Set((j.reponses || []).filter(r => r.reponse === 'oui').map(r => Number(r.personne_id)));
    const base = E.equipeInstallee ? equipeDate(G.spectacle_id, []) : [], sollicites = new Set((p.destinataires || []).map(d => Number(d.personne_id)));
    G.equipe = [...base.filter(x => sollicites.has(Number(x.personne_id)) && !oui.has(Number(x.personne_id))).map(x => ({ personne_id: x.personne_id, present: false, fonction: '', note: null })),
      ...[...oui].filter(id => personne(id) && !base.some(x => x.personne_id === id)).map(id => ({ personne_id: id, present: true, fonction: '', note: null }))];
    G.depuis = { proposition: p.id, titre: p.titre, jour: PLN().texteJours(j), close: p.statut === 'close', oui: oui.size };
    return G;
  }
  function creerDate(p, j) {
    const G = dateDepuis(p, j);
    if (!G) return;
    E.dateDepart = G;
    location.hash = '#/representations/nouvelle';
  }
  // la date créée depuis une proposition est enregistrée : la proposition se clôt, sa date retenue ; ce que l'annonce dit
  async function apresDate(depuis, dateId) {
    const { data, error } = await sb.from('crescite_propositions').update({ statut: 'close', date_id: dateId }).eq('id', depuis.proposition).select('id, statut, date_id').single();
    if (error) return { texte: `La proposition « ${depuis.titre} » n’a pas pu être close : ${error.message || error}.`, erreur: true };
    const p = E.propositions.find(x => memeId(x.id, depuis.proposition));
    if (p) Object.assign(p, { statut: data.statut, date_id: data.date_id });
    return { texte: depuis.close ? `La date est notée dans la proposition « ${depuis.titre} ».` : `La proposition « ${depuis.titre} » est close : les réponses sont arrêtées.` };
  }

  // ce qu'il faut pour prévenir soi-même : un courriel tout prêt (en copie cachée), le lien de l'espace de l'équipe
  function prevenirBloc(p, ds) {
    const avec = ds.filter(d => priveeDe(d.personne_id)?.email), sans = ds.filter(d => !priveeDe(d.personne_id)?.email);
    const nonConf = ds.some(d => d.courriel_statut === 'non_configure');
    const qui = ds.length > 1 ? `${ds.length} personnes n’ont pas reçu le courriel` : `${nomP(ds[0].personne_id)} n’a pas reçu le courriel`;
    return `<div class="bloc dp-prevenir"><h3>${esc(qui)}</h3>
      <p>${nonConf ? 'Le service de courriel n’est pas configuré. ' : ''}La proposition les attend dans leur espace (pour qui a un compte) : prévenez-les vous-même, par un courriel tout prêt ou en leur envoyant le lien.</p>
      <div class="fm-boutons">${avec.length ? `<a class="btn principal" href="${esc(courrielPrevenir(p, avec))}">${avec.length > 1 ? `Écrire à ces ${avec.length} personnes` : `Écrire à ${esc(nomP(avec[0].personne_id))}`}</a>` : ''}<button type="button" class="btn" data-dp="copier-lien">Copier le lien de l’espace</button></div>
      ${sans.length ? `<p class="aide">Sans adresse électronique : ${esc(listeEt(sans.map(d => nomP(d.personne_id))))}. Le lien se colle aussi dans un SMS.</p>` : ''}
      <p class="aide">Le lien mène à la proposition dans l’espace de l’équipe, où chacun répond une fois connecté. Le lien de réponse sans connexion n’existe que dans le courriel : la base ne le donne pas à l’administration.</p></div>`;
  }
  function courrielPrevenir(p, ds) {
    const adresses = ds.map(d => priveeDe(d.personne_id)?.email).filter(Boolean).map(x => encodeURIComponent(x.trim()).replace(/%40/g, '@'));
    const un = ds.length === 1 ? personne(ds[0].personne_id) : null, sp = spectacle(p.spectacle_id), moi = moiAdmin();
    const corps = [`Bonjour${un?.prenom ? ` ${un.prenom}` : ''},`, '',
      `La compagnie vous propose ${p.jours.length > 1 ? 'ces dates' : 'cette date'}${sp ? ` pour ${titreCourt(sp)}` : ''} :`,
      ...p.jours.map(j => `- ${jourLongDe(j)}`), ...(p.message ? ['', p.message] : []), '',
      'Dites-nous pour chaque jour si vous êtes disponible : dans votre espace,', lienEquipe(p.id), 'ou simplement en répondant à ce courriel.', '',
      'Merci,', ...(moi ? [moi] : []), 'Compagnie Crescite'].join('\r\n');
    const sujet = `Crescite : des dates vous sont proposées · ${p.titre}`;
    return `mailto:${adresses.length === 1 ? adresses[0] : ''}?subject=${encodeURIComponent(sujet)}${adresses.length > 1 ? `&bcc=${adresses.join(',')}` : ''}&body=${encodeURIComponent(corps)}`;
  }
  async function rafraichirSuivi(id, dire = false) {
    const h = location.hash;
    try { await chargerPropositions(); } catch (e) { return erreur(e, 'Les réponses n’ont pas pu être relues'); }
    if (location.hash !== h || E.sale) return;
    const zone = $('#ed-dispo');
    if (zone) suivi(zone, id);
    $('#l-propositions')?.rafraichir?.();
    if (dire) annoncer('Réponses relues.');
  }
  // les courriels partent après coup (la base appelle la fonction) : on relit deux fois, le temps qu'ils partent
  function attendreCourriels(id) {
    const h = `#/planning/proposition/${id}`;
    [3500, 9000].forEach(ms => setTimeout(() => { if (location.hash === h && !E.sale) rafraichirSuivi(id); }, ms));
  }

  // ===================================================================================================== proposer des dates
  let nLigne = 0;
  const ligneNeuve = x => ({ cle: ++nLigne, forme: ['journee', 'periode', 'heures'].includes(x.forme) ? x.forme : 'journee', du: x.du || '',
    au: x.au || (estJour(x.du) ? plusJ(x.du, 1) : ''), de: x.de || '14:00', a: x.a || '18:00' });
  // une ligne du brouillon → un jour de crescite_proposer {debut, fin, journee} (une journée : de minuit à minuit, à Paris)
  function versJour(r) {
    if (!estJour(r.du)) return null;
    if (r.forme === 'periode') return estJour(r.au) && r.au > r.du ? { debut: minuitIso(r.du), fin: minuitIso(plusJ(r.au, 1)), journee: true } : null;
    if (r.forme === 'heures') return estHeure(r.de) && estHeure(r.a) && r.a > r.de ? { debut: heureIso(r.du, r.de), fin: heureIso(r.du, r.a), journee: false } : null;
    return { debut: minuitIso(r.du), fin: minuitIso(plusJ(r.du, 1)), journee: true };
  }
  const probleme = r => (!estJour(r.du) ? 'Choisissez le jour.' : r.du < AUJ ? 'Ce jour est passé.'
    : r.forme === 'periode' && !(estJour(r.au) && r.au > r.du) ? 'Choisissez le dernier jour, après le premier.'
    : r.forme === 'heures' && !(estHeure(r.de) && estHeure(r.a) && r.a > r.de) ? 'L’heure de fin doit suivre l’heure de début.' : '');
  // deux périodes se touchent : des heures face à des heures, au quart d'heure près ; sinon, un même jour
  const touche = (x, y) => (!x.journee && !y.journee ? Date.parse(x.debut) < Date.parse(y.fin) && Date.parse(y.debut) < Date.parse(x.fin) : PLN().chevauchement(x, y));
  const joursDate = d => { const out = []; for (let j = d.debut, n = 0; estJour(j) && j <= (d.fin || d.debut) && n < 400; j = plusJ(j, 1), n++) out.push(j); return out; };

  function partieProposer() {
    cadre('planning', `${entete('proposer')}<div class="dp-page" id="dp-page"></div>`);
    parties();
    const B = DP.brouillon || {};
    DP.brouillon = null;
    const F = { titre: '', message: '', spectacle_id: B.spectacle_id ?? null, personnes: new Set((B.personnes || []).map(String)),
      lignes: (B.lignes || []).filter(x => estJour(x.du)).map(ligneNeuve) };
    const zone = $('#dp-page');
    const spOptions = E.spectacles.slice().sort((a, b) => (b.page - a.page) || a.ordre - b.ordre);
    const avecDistribution = spOptions.filter(s => s.page && E.distributions.some(x => x.spectacle_id === s.id));
    zone.innerHTML = `<div class="titre-ed"><a class="btn petit" data-tt="retour" href="#/planning/propositions" aria-label="Retour aux propositions">←</a><h2>Proposer des dates</h2></div>
      <div class="bloc" id="dp-f1"><h3>La proposition</h3>
        <div class="rangee dp-rangee"><div class="champ"><label for="dp-titre">Titre</label><input type="text" id="dp-titre" maxlength="140" placeholder="Option : Théâtre de…, Répétitions…" autocomplete="off"><span class="aide">L’objet du courriel. Sans titre : « Des dates à confirmer ».</span></div>
        <div class="champ"><label for="dp-sp">Spectacle</label><select id="dp-sp"><option value="">Aucun en particulier</option>${spOptions.map(s => `<option value="${s.id}"${memeId(F.spectacle_id, s.id) ? ' selected' : ''}>${esc(s.titre)}${s.page ? '' : ' (ancien)'}</option>`).join('')}</select><span class="aide">Facultatif : il est nommé dans le courriel.</span></div></div>
        <div class="champ"><label for="dp-message">Message</label><textarea id="dp-message" rows="3" placeholder="Le lieu, les horaires, la raison : ce que chacun doit savoir pour répondre."></textarea><span class="aide">Il part avec le courriel et s’affiche dans leur espace.</span></div></div>
      <div class="bloc" id="dp-f2"><h3>Les personnes <span class="badge" id="dp-nb-p"></span></h3>
        <div class="dp-rapides" role="group" aria-label="Choix rapide">${avecDistribution.map(s => `<button type="button" class="btn petit" data-dp-distribution="${s.id}"><span class="pastille" style="--c:${couleurSp(s)}"></span>Distribution de ${esc(titreCourt(s))}</button>`).join('')}<button type="button" class="btn petit" data-dp-aucune>Aucune</button></div>
        <div class="dp-gens" id="dp-gens"></div></div>
      <div class="bloc" id="dp-f3"><h3>Les jours <span class="badge" id="dp-nb-j"></span></h3>
        <p class="aide dp-p">Choisissez un jour dans le calendrier : il montre les personnes choisies, qui n’est pas libre (hachures, motif) et qui part déjà. Une journée, plusieurs jours d’affilée ou quelques heures : chacun répondra pour chaque ligne.</p>
        <div id="dp-cal" class="dp-cal"></div>
        <ol class="dp-jours" id="dp-jours" aria-label="Jours proposés"></ol>
        <div class="dp-ajout"><label for="dp-ajout-jour">Ajouter un jour</label><input type="date" id="dp-ajout-jour" min="${AUJ}"><button type="button" class="btn" id="dp-ajouter">＋ Ajouter</button></div></div>
      <div class="pied-ed dp-pied"><span class="dp-etat" id="dp-etat" aria-live="polite"></span><button type="button" class="btn principal" id="dp-envoyer">Envoyer la proposition</button></div>`;

    const valides = () => F.lignes.map(r => ({ r, j: probleme(r) ? null : versJour(r) })).filter(x => x.j);
    const sale = () => { E.sale = true; };
    // ———— ce que chaque personne a déjà ces jours-là (d'après les lectures du planning)
    function lecturesPour(j) {
      const js = PLN().joursDe(j).map(u => u.jour), ls = [];
      for (const jour of js) { const l = lectureDe(jour); if (!l) return null; if (!ls.includes(l)) ls.push(l); }
      return ls;
    }
    function obstacles(pid, j) {
      const ls = lecturesPour(j);
      if (!ls) return null;
      const out = [], vus = new Set(), jours = new Set(PLN().joursDe(j).map(u => u.jour));
      for (const { D } of ls) {
        for (const i of D.indisponibilites || []) {
          if (!memeId(i.personne_id, pid) || vus.has(`i${i.id}`) || !touche(j, i)) continue;
          vus.add(`i${i.id}`);
          const u = PLN().joursDe(i).find(x => jours.has(x.jour));
          out.push({ type: 'indispo', texte: `pas libre ${u ? jourC(u.jour) : ''}${u && !u.entier ? ` ${heuresDe(u)}` : ''}${i.motif ? ` (${i.motif})` : ''}`.replace(/\s+/g, ' ').trim(), court: u && !u.entier ? heuresDe(u) : (i.motif || '') });
        }
        for (const d of D.dates || []) {
          if (vus.has(`d${d.id}`) || d.statut === 'reportee' || !(d.equipe || []).some(x => memeId(x, pid))) continue;
          const commun = joursDate(d).find(x => jours.has(x));
          if (!commun) continue;
          vus.add(`d${d.id}`);
          out.push({ type: 'date', texte: `part ${jourC(commun)} : ${titreCourt(d.spectacle)}${d.lieu?.commune ? ` à ${d.lieu.commune}` : ''}${d.statut === 'option' ? ' (option)' : ''}`, court: titreCourt(d.spectacle) });
        }
        for (const x of D.propositions || []) {
          if (x.statut !== 'ouverte' || vus.has(`p${x.id}`) || !(x.destinataires || []).some(y => memeId(y.personne_id, pid))) continue;
          if (!(x.jours || []).some(y => PLN().chevauchement(y, j))) continue;
          vus.add(`p${x.id}`);
          out.push({ type: 'prop', texte: `aussi sollicité par « ${x.titre} »`, court: `« ${x.titre} »`, titre: x.titre });
        }
      }
      return out;
    }
    // les lectures qui manquent pour les jours du brouillon : un mois à la fois
    let enLecture = false;
    async function assurer() {
      if (enLecture) return;
      const mois = new Set();
      for (const { j } of valides()) for (const u of PLN().joursDe(j)) if (!lectureDe(u.jour)) mois.add(u.jour.slice(0, 7));
      if (!mois.size) return;
      enLecture = true;
      try {
        for (const m of mois) { const de = `${m}-01`; await lirePlanning(de, plusJ(plusJ(`${m}-01`, 32).slice(0, 7) + '-01', -1)); }
      } catch (e) { annoncer(`Les disponibilités n’ont pas pu être lues : ${e?.message || e}`, { erreur: true }); }
      finally { enLecture = false; }
      if (zone.isConnected) { dessinerGens(); dessinerJours(); }
    }
    // ———— les personnes
    const ordreGens = () => {
      const dist = F.spectacle_id != null ? distributionDe(+F.spectacle_id) : [];
      const rangDist = new Map(); dist.forEach((x, i) => { if (!rangDist.has(x.personne_id)) rangDist.set(x.personne_id, i); });
      return E.personnes.slice().sort((a, b) => (rangDist.has(a.id) ? rangDist.get(a.id) : 1e6) - (rangDist.has(b.id) ? rangDist.get(b.id) : 1e6)
        || norm(a.nom).localeCompare(norm(b.nom)) || norm(a.prenom).localeCompare(norm(b.prenom)));
    };
    function dispoTexte(pid) {
      const xs = valides();
      if (!xs.length) return '';
      const tous = [];
      for (const { j } of xs) { const o = obstacles(pid, j); if (!o) return '<small class="dp-dispo attente">vérification…</small>'; tous.push(...o); }
      if (!tous.length) return '<small class="dp-dispo ok">libre ces jours-là</small>';
      const t = tous.slice(0, 2).map(x => x.texte).join(' ; ') + (tous.length > 2 ? ` ; et ${tous.length - 2} de plus` : '');
      return `<small class="dp-dispo ${tous.some(x => x.type === 'indispo') ? 'pas' : tous.some(x => x.type === 'date') ? 'part' : 'info'}">${esc(t)}</small>`;
    }
    function dessinerGens() {
      const el = $('#dp-gens', zone);
      if (!el) return;
      const dist = F.spectacle_id != null ? distributionDe(+F.spectacle_id) : [];
      el.innerHTML = ordreGens().map(p => {
        const v = priveeDe(p.id), fs = dist.filter(x => x.personne_id === p.id).map(fonctionDistribution);
        return `<label class="case dp-g"><input type="checkbox" value="${p.id}"${F.personnes.has(String(p.id)) ? ' checked' : ''}>${avatar(p, true)}<span class="dp-g-t"><b>${esc(nomDe(p))}</b><small>${esc((fs.length ? fs : (p.metiers || []).slice(0, 2)).join(', ') || 'Métier à préciser')}</small>${F.personnes.has(String(p.id)) ? dispoTexte(p.id) : ''}${v?.email ? '' : '<small class="dp-dispo pas">sans adresse électronique : pas de courriel</small>'}</span></label>`;
      }).join('') || '<p class="aide">Personne dans l’équipe.</p>';
      $('#dp-nb-p', zone).textContent = String(F.personnes.size);
      majEtat();
    }
    // ———— les jours
    function resumeJour(j) {
      if (!F.personnes.size) return { classe: '', texte: 'Choisissez des personnes : vous verrez ici qui est libre.' };
      const pas = [], part = [], deja = new Map();
      for (const id of F.personnes) {
        const o = obstacles(id, j);
        if (!o) return { classe: 'attente', texte: 'Vérification des disponibilités…' };
        const nom = nomP(id), i = o.filter(x => x.type === 'indispo'), d = o.filter(x => x.type === 'date');
        if (i.length) pas.push(`${nom}${i[0].court ? ` (${i[0].court})` : ''}`);
        if (d.length) part.push(`${nom} (${d[0].court})`);
        for (const x of o.filter(y => y.type === 'prop')) { if (!deja.has(x.titre)) deja.set(x.titre, []); deja.get(x.titre).push(nom); }
      }
      // les autres propositions de ces jours-là, une fois chacune, avec ceux qu'elles sollicitent
      const ailleurs = [...deja].map(([t, ns]) => `${ns.length > 1 ? 'aussi sollicités' : 'aussi sollicité'} par « ${t} » : ${ns.join(', ')}`);
      if (!pas.length && !part.length) return { classe: 'ok', texte: `${F.personnes.size > 1 ? 'Tout le monde est libre' : 'Libre'}${ailleurs.length ? ` · ${ailleurs.join(' · ')}` : ''}.` };
      return { classe: 'pas', texte: [pas.length && `Pas libre${pas.length > 1 ? 's' : ''} : ${pas.join(', ')}`, part.length && `Part${part.length > 1 ? 'ent' : ''} déjà : ${part.join(', ')}`, ...ailleurs.map(maj1)].filter(Boolean).join(' · ') };
    }
    function dessinerJours() {
      const el = $('#dp-jours', zone);
      if (!el) return;
      el.innerHTML = F.lignes.map(r => {
        const pb = probleme(r), j = pb ? null : versJour(r), res = j ? resumeJour(j) : null;
        const forme = (k, l) => `<button type="button" data-forme="${k}" aria-pressed="${r.forme === k}">${l}</button>`;
        return `<li class="dp-jour" data-cle="${r.cle}"><div class="dp-jour-l"><b>${j ? esc(jourLongDe(j)) : 'Un jour à choisir'}</b>
            <div class="seg" role="group" aria-label="Forme du jour proposé">${forme('journee', 'Journée')}${forme('periode', 'Plusieurs jours')}${forme('heures', 'Des heures')}</div>
            <button type="button" class="btn petit danger" data-retirer aria-label="Retirer ${j ? esc(jourLongDe(j)) : 'ce jour'}">✕</button></div>
          <div class="dp-jour-c"><label>${r.forme === 'periode' ? 'Du' : 'Le'} <input type="date" data-k="du" value="${esc(r.du)}" min="${AUJ}"></label>
            ${r.forme === 'periode' ? `<label>au <input type="date" data-k="au" value="${esc(r.au)}" min="${esc(r.du || AUJ)}"></label>` : ''}
            ${r.forme === 'heures' ? `<label>de <input type="time" data-k="de" value="${esc(r.de)}" step="900"></label><label>à <input type="time" data-k="a" value="${esc(r.a)}" step="900"></label>` : ''}</div>
          ${pb ? `<p class="dp-qui-j pas" role="alert">${esc(pb)}</p>` : `<p class="dp-qui-j ${res.classe}">${esc(res.texte)}</p>`}</li>`;
      }).join('');
      $('#dp-nb-j', zone).textContent = String(F.lignes.length);
      majEtat();
    }
    function majEtat() {
      const n = F.personnes.size, v = valides().length, b = $('#dp-envoyer', zone);
      $('#dp-etat', zone).textContent = `${v ? pl(v, 'jour proposé', 'jours proposés') : 'Aucun jour'} · ${n ? pl(n, 'personne') : 'personne'}`;
      if (b) b.textContent = n ? `Envoyer à ${pl(n, 'personne')}` : 'Envoyer la proposition';
    }
    const toutRedessiner = () => { dessinerGens(); dessinerJours(); majCalendrier(); assurer(); };
    function ajouterLigne(x, focus = null) {
      if (!estJour(x.du) || x.du < AUJ) return annoncer('Ce jour est passé : choisissez un jour à venir.', { erreur: true });
      if ((x.forme || 'journee') === 'journee' && F.lignes.some(r => r.forme === 'journee' && r.du === x.du)) return annoncer('Ce jour est déjà proposé.', { erreur: true });
      const r = ligneNeuve(x);
      F.lignes.push(r);
      F.lignes.sort((a, b) => (a.du || '9999') < (b.du || '9999') ? -1 : (a.du || '9999') > (b.du || '9999') ? 1 : a.cle - b.cle);
      sale();
      toutRedessiner();
      if (DP.calendrier) { const e = DP.calendrier.etat(); if (r.du < e.de || r.du > e.a) DP.calendrier.aller(r.du); }   // le calendrier montre le jour ajouté
      annoncer(`${maj1(PLN().outils.jourLong(r.du))} : ajouté à la proposition.`);
      if (focus) $(`.dp-jour[data-cle="${r.cle}"] [data-k="${focus}"]`, zone)?.focus();
    }
    function retirerLigne(cle) {
      const r = F.lignes.find(x => x.cle === cle);
      F.lignes = F.lignes.filter(x => x.cle !== cle);
      sale();
      toutRedessiner();
      if (r && estJour(r.du)) annoncer(`${maj1(PLN().outils.jourLong(r.du))} : retiré de la proposition.`);
    }
    // ———— le calendrier : le planning des personnes choisies, et le brouillon en pointillé
    let brut = null;
    const vueBrouillon = D => {
      const choisis = F.personnes;
      const gens = (D.personnes || []).filter(p => !choisis.size || choisis.has(String(p.id)));
      for (const id of choisis) if (!gens.some(p => memeId(p.id, id))) { const p = personne(+id); if (p) gens.push({ id: p.id, slug: p.slug, prenom: p.prenom, nom: p.nom, metiers: p.metiers, photo: p.photo_publique ? p.photo : null }); }
      const jours = valides().map(({ j }, i) => ({ id: -(i + 1), ...j, reponses: [] }));
      return { ...D, personnes: gens,
        propositions: jours.length ? [{ id: 0, titre: F.titre.trim() || 'Nouvelle proposition', statut: 'ouverte', spectacle_id: null, jours, destinataires: [...choisis].map(id => ({ personne_id: +id })) }] : [] };
    };
    const majCalendrier = () => { if (DP.calendrier && brut) DP.calendrier.donnees(vueBrouillon(brut)); };
    const ligneDuJour = jour => F.lignes.find(r => { const j = !probleme(r) && versJour(r); return j && PLN().joursDe(j).some(u => u.jour === jour); });
    function actionsBrouillon(s) {
      if (s.jour < AUJ) return [];
      const r = ligneDuJour(s.jour);
      if (r) return [{ libelle: r.forme === 'periode' ? 'Retirer cette période' : 'Retirer ce jour', faire: () => retirerLigne(r.cle) }];
      return [
        { libelle: 'Proposer ce jour', principal: true, faire: sel => ajouterLigne({ forme: 'journee', du: sel.jour }) },
        { libelle: 'Quelques heures ce jour-là', faire: sel => ajouterLigne({ forme: 'heures', du: sel.jour }, 'de') },
        { libelle: 'Plusieurs jours, à partir de là', faire: sel => ajouterLigne({ forme: 'periode', du: sel.jour }, 'au') },
      ];
    }
    const premier = F.lignes.map(r => r.du).filter(estJour).sort()[0];
    DP.calendrier = PLN().monter($('#dp-cal', zone), {
      vue: 'mois', jour: premier || AUJ, feuille: false, titre: 'Calendrier de la proposition',
      charger: async (de, a) => { const D = await lirePlanning(de, a); brut = D; return vueBrouillon(D); },
      messageErreur: e => `Le calendrier n’a pas pu être lu : ${e?.message || 'réessayez dans un instant'}.`,
      photo: photoUrl, spectacles: spectaclesPlanning(), distributions: distributionsPlanning(), actions: actionsBrouillon,
    });

    // ———— les gestes
    $('#dp-titre', zone).addEventListener('input', e => { F.titre = e.target.value; sale(); majCalendrier(); });
    $('#dp-message', zone).addEventListener('input', e => { F.message = e.target.value; sale(); });
    $('#dp-sp', zone).addEventListener('change', e => { F.spectacle_id = e.target.value ? +e.target.value : null; sale(); dessinerGens(); });
    $('#dp-f2', zone).addEventListener('change', e => {
      const t = e.target;
      if (t.type !== 'checkbox') return;
      if (t.checked) F.personnes.add(t.value); else F.personnes.delete(t.value);
      sale(); dessinerGens(); dessinerJours(); majCalendrier();
    });
    $('#dp-f2', zone).addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.dpAucune !== undefined) { F.personnes.clear(); }
      else if (b.dataset.dpDistribution) {
        const ids = distributionIds(b.dataset.dpDistribution), s = spectacle(+b.dataset.dpDistribution);
        ids.forEach(id => F.personnes.add(String(id)));
        if (F.spectacle_id == null) { F.spectacle_id = s.id; $('#dp-sp', zone).value = String(s.id); }
        annoncer(`Distribution de ${titreCourt(s)} : ${pl(ids.length, 'personne')} ${ids.length > 1 ? 'choisies' : 'choisie'}.`);
      } else return;
      sale(); dessinerGens(); dessinerJours(); majCalendrier();
    });
    $('#dp-jours', zone).addEventListener('click', e => {
      const li = e.target.closest('.dp-jour');
      if (!li) return;
      const r = F.lignes.find(x => x.cle === +li.dataset.cle);
      const b = e.target.closest('button');
      if (!r || !b) return;
      if (b.dataset.retirer !== undefined) return retirerLigne(r.cle);
      if (b.dataset.forme && b.dataset.forme !== r.forme) {
        r.forme = b.dataset.forme;
        if (r.forme === 'periode' && !(estJour(r.au) && r.au > r.du) && estJour(r.du)) r.au = plusJ(r.du, 1);
        sale(); toutRedessiner();
        $(`.dp-jour[data-cle="${r.cle}"] [data-forme="${r.forme}"]`, zone)?.focus();
      }
    });
    $('#dp-jours', zone).addEventListener('change', e => {
      const li = e.target.closest('.dp-jour'), k = e.target.dataset.k;
      const r = li && F.lignes.find(x => x.cle === +li.dataset.cle);
      if (!r || !k) return;
      r[k] = e.target.value;
      if (k === 'du' && r.forme === 'periode' && estJour(r.du) && !(estJour(r.au) && r.au > r.du)) r.au = plusJ(r.du, 1);
      sale(); toutRedessiner();
      $(`.dp-jour[data-cle="${r.cle}"] [data-k="${k}"]`, zone)?.focus();
    });
    const ajout = () => { const v = $('#dp-ajout-jour', zone).value; if (!estJour(v)) return annoncer('Choisissez un jour.', { erreur: true }); ajouterLigne({ forme: 'journee', du: v }); $('#dp-ajout-jour', zone).value = ''; };
    $('#dp-ajouter', zone).addEventListener('click', ajout);
    $('#dp-ajout-jour', zone).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ajout(); } });
    $('#dp-envoyer', zone).addEventListener('click', async e => {
      const b = e.currentTarget;
      const faux = F.lignes.find(r => probleme(r));
      if (faux) { $(`.dp-jour[data-cle="${faux.cle}"] input`, zone)?.focus(); return annoncer(`Un jour proposé n’est pas complet : ${probleme(faux)}`, { erreur: true }); }
      const jours = valides().map(x => x.j);
      if (!jours.length) { $('#dp-ajout-jour', zone).focus(); return annoncer('Ajoutez au moins un jour : dans le calendrier, ou par « Ajouter un jour ».', { erreur: true }); }
      if (!F.personnes.size) { $('#dp-gens input', zone)?.focus(); return annoncer('Choisissez au moins une personne.', { erreur: true }); }
      const vus = new Set(), uniques = jours.filter(j => { const k = `${j.debut}|${j.fin}`; if (vus.has(k)) return false; vus.add(k); return true; });
      b.disabled = true; b.textContent = 'Envoi…';
      const p = { titre: F.titre.trim(), message: F.message.trim(), spectacle_id: F.spectacle_id, date_id: null, jours: uniques, personnes: [...F.personnes].map(Number) };
      const { data, error } = await sb.rpc('crescite_proposer', { p });
      if (error) { b.disabled = false; majEtat(); return erreur(error, 'La proposition n’est pas partie'); }
      const id = Number(data);
      E.sale = false;
      annoncer(`Proposition envoyée à ${pl(F.personnes.size, 'personne')} : chacune est prévenue dans son espace et par courriel.`);
      try { await chargerPropositions(); } catch (err) { /* le suivi relira */ }
      location.hash = `#/planning/proposition/${id}`;
      attendreCourriels(id);
    });
    dessinerGens(); dessinerJours(); assurer();
    if (matchMedia('(min-width: 761px)').matches) $('#dp-titre', zone).focus({ preventScroll: true });   // au téléphone, pas de clavier d'emblée
  }

  // ===================================================================================================== styles
  document.head.insertAdjacentHTML('beforeend', `<style id="styles-disponibilites">
/* la rubrique Planning : le planning de l'équipe, les propositions de dates et leur suivi */
.dp-planning { margin-top: 2px; }
.dp-note { margin: 12px 2px 0; color: var(--gris); font-size: 13px; }
.dp-absent p { margin: 0; }
#ed-dispo .aide, .dp-page .aide { color: var(--gris); font-size: 13px; }
.dp-p { margin: 10px 0 0; }
.dp-nb { display: inline-grid; place-items: center; min-width: 20px; height: 20px; margin-left: 5px; padding: 0 6px; border-radius: 999px; background: var(--accent); color: var(--sur-accent, #fff); font-size: 11.5px; font-weight: 800; }
.seg button[aria-pressed="true"] .dp-nb { background: var(--carte); color: var(--accent); }
.ligne.dp-prop { grid-template-columns: minmax(0, 1fr) auto; }
.ligne.dp-prop.close { border-left-color: var(--trait); }
.ligne.dp-prop.close .t { color: var(--gris); }
.dp-bilan { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
.dp-r { display: inline-flex; align-items: center; gap: 3px; padding: 1px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; background: var(--doux); color: var(--gris); }
.dp-r.oui { background: var(--ok-doux); color: var(--ok); } .dp-r.non { background: var(--alerte-doux); color: var(--alerte); } .dp-r.pe { background: var(--option-doux); color: var(--option); }
.dp-entete .dp-etiquettes { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; }
.dp-sp { display: inline-flex; align-items: center; gap: 6px; font-weight: 650; font-size: 14px; }
.dp-message { margin: 12px 0 0; padding: 10px 14px; border-radius: 10px; background: var(--doux); border-left: 3px solid var(--accent); }
.dp-jours-bilan { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 6px; }
.dp-jours-bilan li { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
.dp-jours-bilan .dp-creer { margin-left: auto; }
.dp-retenue { font-weight: 700; font-size: 13.5px; }
.dp-jours-bilan .dp-bilan { margin: 0; }
.dp-prevenir { border-color: color-mix(in srgb, var(--option) 40%, var(--trait)); background: color-mix(in srgb, var(--option-doux) 55%, var(--carte)); }
.dp-prevenir p { margin: 0 0 8px; }
.dp-prevenir .fm-boutons { margin: 4px 0 10px; }
.dp-suivi-tete { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.dp-suivi-tete h3 { margin: 0; }
.dp-tableau { overflow-x: auto; border: 1px solid var(--trait); border-radius: 10px; }
.dp-tableau:focus-visible { outline-offset: 2px; }
table.dp-rep { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 14px; }
table.dp-rep th, table.dp-rep td { padding: 10px 12px; border-bottom: 1px solid var(--trait); text-align: left; vertical-align: top; }
table.dp-rep tr:last-child > * { border-bottom: 0; }
table.dp-rep thead th { font-size: 12.5px; color: var(--gris); white-space: nowrap; background: var(--doux); }
table.dp-rep thead th:first-child { position: sticky; left: 0; z-index: 2; border-right: 1px solid var(--trait); }
table.dp-rep tbody th { position: sticky; left: 0; z-index: 1; background: var(--carte); min-width: 230px; max-width: 300px; font-weight: 600; border-right: 1px solid var(--trait); }
.dp-qui { display: flex; align-items: flex-start; gap: 9px; }
.dp-qui-t { display: grid; gap: 2px; min-width: 0; }
.dp-qui-t a { color: var(--encre); font-weight: 700; text-decoration: none; }
.dp-qui-t a:hover { text-decoration: underline; }
.dp-mail { font-size: 12.5px; font-weight: 600; color: var(--gris); }
.dp-mail.ok { color: var(--ok); } .dp-mail.option { color: var(--option); } .dp-mail.alerte { color: var(--alerte); }
.dp-mail-actions { display: flex; flex-wrap: wrap; gap: 5px; margin: 8px 0 0 39px; }
.dp-c { min-width: 128px; }
.dp-c .dp-signe { display: inline-grid; place-items: center; width: 22px; height: 22px; margin-right: 6px; border-radius: 50%; font-weight: 800; font-size: 13px; background: var(--doux); color: var(--gris); }
.dp-c.oui .dp-signe { background: var(--ok-doux); color: var(--ok); } .dp-c.non .dp-signe { background: var(--alerte-doux); color: var(--alerte); } .dp-c.pe .dp-signe { background: var(--option-doux); color: var(--option); }
.dp-c .dp-mot { font-weight: 600; }
.dp-c.attente .dp-mot { color: var(--gris); font-weight: 500; }
.dp-com { display: block; margin-top: 5px; font-size: 13px; font-style: italic; color: var(--gris); }
@media (max-width: 760px) {
  .dp-tableau { overflow: visible; border: 0; }
  table.dp-rep, table.dp-rep tbody, table.dp-rep tr, table.dp-rep th, table.dp-rep td { display: block; }
  table.dp-rep thead { display: none; }
  table.dp-rep tr { margin-bottom: 10px; border: 1px solid var(--trait); border-radius: 10px; overflow: hidden; }
  table.dp-rep tbody th { position: static; min-width: 0; max-width: none; border-right: 0; background: var(--doux); }
  table.dp-rep td { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 2px 8px; border-bottom: 1px solid var(--trait); }
  table.dp-rep td::before { content: attr(data-jour); font-size: 13px; font-weight: 650; color: var(--encre); }
  table.dp-rep td .dp-signe { grid-column: 2; grid-row: 1; margin: 0; }
  table.dp-rep td .dp-mot { grid-column: 1 / -1; font-size: 13px; }
  table.dp-rep td .dp-com { grid-column: 1 / -1; }
  .dp-mail-actions { margin-left: 0; }
}
.dp-page { max-width: 1180px; }
.dp-page .bloc h3 { display: flex; align-items: center; gap: 8px; }
.dp-rangee { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.dp-rangee > .champ { align-content: start; }
.dp-rapides { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 12px; }
.dp-rapides .pastille { margin-right: 2px; }
.dp-gens { display: grid; gap: 6px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); max-height: 440px; overflow: auto; padding: 2px; }
.dp-g { align-items: flex-start; gap: 9px; padding: 8px 10px; border: 1px solid var(--trait); border-radius: 10px; background: var(--carte); font-weight: 500; }
.dp-g:has(input:checked) { border-color: var(--accent); background: var(--accent-doux); }
.dp-g input { margin-top: 5px; flex: none; }
.dp-g .avatar { flex: none; }
.dp-g-t { display: grid; gap: 1px; min-width: 0; line-height: 1.3; }
.dp-g-t b { font-weight: 650; }
.dp-g-t small { color: var(--gris); font-size: 12.5px; }
.dp-g-t .dp-dispo { font-weight: 600; }
.dp-dispo.ok, .dp-qui-j.ok { color: var(--ok); } .dp-dispo.pas, .dp-qui-j.pas { color: var(--alerte); } .dp-dispo.part { color: var(--option); } .dp-dispo.attente, .dp-qui-j.attente { color: var(--gris); }
.dp-cal { margin: 12px 0 4px; }
.dp-cal .pl-filtres, .dp-cal .pl-btn-filtres { display: none !important; }
.dp-jours { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 8px; }
.dp-jour { padding: 10px 12px; border: 1px solid var(--trait); border-radius: 10px; background: var(--carte); border-left: 4px solid var(--accent); }
.dp-jour-l { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
.dp-jour-l b { margin-right: auto; font-size: 15px; }
.dp-jour-c { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin-top: 8px; }
.dp-jour-c label { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; color: var(--gris); font-weight: 600; }
.dp-jour-c input[type=date], .dp-jour-c input[type=time] { width: auto; min-height: 36px; padding: 4px 8px; }
.dp-qui-j { margin: 8px 0 0; font-size: 13.5px; font-weight: 600; }
.dp-ajout { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; margin-top: 14px; }
.dp-ajout label { font-weight: 650; font-size: 13.5px; }
.dp-ajout input[type=date] { width: auto; }
.dp-pied .dp-etat { margin-right: auto; color: var(--gris); font-size: 13px; }
@media (max-width: 520px) { .dp-gens { grid-template-columns: 1fr; max-height: none; } .dp-jour-l .seg { order: 3; flex-basis: 100%; } .dp-jour-l .seg button { flex: 1 1 auto; } }
</style>`);

  return { vue, chargerPropositions, apresDate };
})();
// la route de la rubrique (admin/index.html)
function vuePlanning(param) { return DISPONIBILITES.vue(param); }
