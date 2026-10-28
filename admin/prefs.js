'use strict';
/* Les préférences de l'administration : ce que chacun règle une fois et retrouve sur tous ses appareils, une valeur par
   compte et par clé (la table crescite_preferences, le sixième script SQL, supabase/migrations/20261025_crescite_preferences.sql).
   Un seul outil pour tous les modules qui gardent un réglage (le tableau de bord, le planning, la rubrique Représentations,
   puis les suivants) : chacun lit et écrit une clé, et n'a plus à connaître ni la base, ni le stockage de l'appareil, ni
   ce qui se passe quand le script n'est pas encore passé. Chargé juste après le grand script de la page (index.html), avant
   tableau.js et disponibilites.js, dont il reprend l'état (E.session) et les outils (sb, annoncer, saisieEnCours).
   - Les clés en usage : accueil.tableau (la disposition du tableau de bord, tableau.js), planning.masques (les personnes
     masquées du planning, disponibilites.js ; l'espace de l'équipe, equipe/equipe.js, lit la même clé en tableau brut :
     sa forme ne change pas), representations.avant (le panneau « À compléter avant la tournée », index.html),
     menu.replie (le menu latéral replié ou déplié, cadre.js), representations.vue (la dernière vue de Représentations : 'liste',
     'tableur' ou 'carte', à l'ordinateur seulement ; lue par le lien du menu et la page d'ouverture, index.html), theme ('nuit',
     'jour' ou 'appareil') et densite ('confortable' ou 'compacte') : l'apparence, réglée dans le menu (cadre.js), dont le
     miroir de l'appareil est aussi lu par index.html,
     fenetres.tiroir (la largeur du tiroir, en pixels) et fenetres.liste
     (la colonne de la liste à côté d'une fiche, en pixels) : fenetres.js, une écriture par geste, au relâchement ; les clés
     fenetres.* suivantes (le contenu sur toute la largeur, les boîtes de dialogue) viendront avec leur surface.
   - La lecture est synchrone : PREFS.charger() lit tout le compte en une requête (select cle, valeur, modifie_le), après
     quoi PREFS.lire(cle, defaut) répond depuis la mémoire, puis depuis le miroir de l'appareil, puis le défaut. Les
     modules attendent charger() (chargerTout) ; actualiser le rejoue avec { relire: true } sans écraser un réglage encore
     à envoyer.
   - L'écriture est sans attente : PREFS.ecrire(cle, valeur, { aussitot, muet }) pose la valeur dans le miroir de
     l'appareil tout de suite (localStorage « crescite-prefs:<compte> » : { valeurs, attente: [clés] }), puis l'envoie à la
     base 700 ms après le dernier geste de la même clé (aussitot : pour un clic, sans délai), une clé à la fois, dans
     l'ordre. À la fermeture de la page (pagehide), ce qui n'est pas parti l'est par fetch keepalive (un upsert de la
     bibliothèque serait abandonné par le navigateur, et sendBeacon ne porte pas l'autorisation que la base exige) ; le
     miroir garde la clé « en attente » jusqu'au prochain démarrage.
   - Le conflit se règle sans horloge : une clé en attente dans le miroir l'emporte sur la base et se renvoie ; sinon la
     base gagne.
   - Les anciennes clés de l'appareil passent dans le compte : crescite-admin-tableau, crescite-planning-masques et
     crescite-admin-avant ne sont effacées qu'une fois la valeur dans la base. Tant que la table manque (état « absent »),
     planning.masques continue d'être lue et écrite dans crescite-planning-masques, que partage l'espace de l'équipe
     (même origine), et la migration se rejoue à chaque chargement.
   - Entre onglets : un BroadcastChannel « crescite-prefs » dit { compte, cle } ; l'autre onglet relit son miroir et
     prévient ses abonnés, jamais pendant une saisie (il attend la fin).
   - Une seule annonce, par session : « Gardé avec votre compte » ou « Gardé sur cet appareil », au premier réglage d'un
     module qui ne le dit pas déjà (le tableau de bord le dit dans son panneau : il écrit muet).
   - Sans compte (E.session absente), rien n'est demandé à la base : seul le miroir « crescite-prefs:anonyme » sert.
   PREFS.charger({ relire })   PREFS.lire(cle, defaut)   PREFS.ecrire(cle, valeur, { aussitot, muet })
   PREFS.surChangement(cle, fn)   PREFS.normaliser(cle, fn)   PREFS.etat() → 'ok' | 'absent' | 'erreur' | null
   PREFS.attendre() → une promesse tenue quand ce qui attendait d'être envoyé l'est */
const PREFS = (() => {
  // ===================================================================================================== état
  const DELAI = 700, TABLE = 'crescite_preferences';
  const P = { de: undefined, valeurs: {}, etat: null, lecture: null, minuteurs: {}, file: Promise.resolve(), apres: {}, abonnes: {}, normaliseurs: {},
    differes: new Set(), reprise: null, refus: false, dit: false, canal: null };
  const absent = e => !!e && /PGRST202|PGRST205|42883|42P01|Could not find the (function|table)|does not exist|schema cache/i.test(`${e.code || ''} ${e.message || ''}`);
  const uid = () => (typeof E !== 'undefined' && E.session?.user?.id) || null;
  const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const pareil = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const objet = v => !!v && typeof v === 'object' && !Array.isArray(v);

  // les anciennes clés de l'appareil : où elles vivaient, ce qu'on en lit, et quand elles l'emportent sur ce qu'on a déjà
  // (planning.masques : la base ou le miroir d'abord ; accueil.tableau : la plus récente, comme avant ; avant : si rien d'autre)
  const ANCIENNES = [
    { cle: 'accueil.tableau', local: 'crescite-admin-tableau', lire: v => (objet(v) ? v : null), gagne: (ici, actuel) => actuel === undefined || (objet(actuel) ? (Number(ici.modifie) || 0) > (Number(actuel.modifie) || 0) : true) },
    { cle: 'planning.masques', local: 'crescite-planning-masques', lire: v => (Array.isArray(v) ? v : null), gagne: (ici, actuel) => actuel === undefined },
    { cle: 'representations.avant', local: 'crescite-admin-avant', lire: v => (objet(v) ? v : null), gagne: (ici, actuel) => actuel === undefined },
  ];
  const ancienne = cle => ANCIENNES.find(a => a.cle === cle);
  const lireLocal = nom => { try { const t = localStorage.getItem(nom); return t === null ? undefined : JSON.parse(t); } catch { return undefined; } };
  const ecrireLocal = (nom, v) => { try { if (v === undefined) localStorage.removeItem(nom); else localStorage.setItem(nom, JSON.stringify(v)); } catch { /* navigation privée, stockage interdit */ } };
  const ancienneValeur = a => { const v = lireLocal(a.local); return v === undefined ? undefined : a.lire(v) || undefined; };
  // tant que la table manque, la liste des personnes masquées vit dans l'ancienne clé, que partage l'espace de l'équipe
  const repli = cle => P.etat === 'absent' && cle === 'planning.masques';

  // ===================================================================================================== le miroir de l'appareil
  const cleMiroir = () => `crescite-prefs:${uid() || 'anonyme'}`;
  const miroir = () => { const m = lireLocal(cleMiroir()); return { valeurs: objet(m?.valeurs) ? m.valeurs : {}, attente: Array.isArray(m?.attente) ? m.attente.filter(x => typeof x === 'string') : [] }; };
  // (relu avant chaque écriture : un autre onglet a pu y toucher entre-temps)
  const changerMiroir = f => { const m = miroir(); f(m); ecrireLocal(cleMiroir(), m); };
  const enAttente = cle => miroir().attente.includes(cle);

  // ===================================================================================================== les abonnés
  const saisie = () => typeof saisieEnCours === 'function' && saisieEnCours();
  function prevenir(cle) {
    if (saisie()) { P.differes.add(cle); if (!P.reprise) P.reprise = setTimeout(reprendre, 800); return; }
    for (const f of (P.abonnes[cle] || []).slice()) { try { f(lire(cle, undefined)); } catch (e) { console.error(e); } }
  }
  function reprendre() {
    P.reprise = null;
    if (saisie()) { P.reprise = setTimeout(reprendre, 800); return; }
    const cles = [...P.differes]; P.differes.clear();
    cles.forEach(prevenir);
  }
  function surChangement(cle, fn) {
    (P.abonnes[cle] = P.abonnes[cle] || []).push(fn);
    return () => { P.abonnes[cle] = (P.abonnes[cle] || []).filter(f => f !== fn); };
  }
  function normaliser(cle, fn) { P.normaliseurs[cle] = fn; }
  function diffuser(cle) { try { P.canal?.postMessage({ uid: uid(), cle }); } catch { /* canal fermé */ } }
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      P.canal = new BroadcastChannel('crescite-prefs');
      P.canal.onmessage = e => {
        const m = e.data;
        if (!m || m.uid !== uid() || typeof m.cle !== 'string') return;
        const v = miroir().valeurs[m.cle];
        if (v !== undefined) P.valeurs[m.cle] = v;
        prevenir(m.cle);
      };
    } catch { P.canal = null; }
  }

  // ===================================================================================================== lire
  function lire(cle, defaut) {
    let v;
    if (repli(cle)) v = ancienneValeur(ancienne(cle));
    if (v === undefined && P.de === (uid() || null)) v = P.valeurs[cle];
    if (v === undefined) v = miroir().valeurs[cle];
    if (v === undefined || v === null) return defaut;
    const n = P.normaliseurs[cle];
    return n ? n(v) : v;
  }
  function reinitialiser(u) { Object.assign(P, { de: u, valeurs: {}, etat: null, lecture: null }); Object.values(P.minuteurs).forEach(clearTimeout); P.minuteurs = {}; P.apres = {}; P.refus = false; }
  // le compte lu en une requête, une fois par session ; avec relire, une nouvelle lecture qui laisse en paix ce qui attend d'être envoyé
  function charger({ relire = false } = {}) {
    const u = uid();
    if (P.de !== u) reinitialiser(u);
    if (!u) { P.etat = 'absent'; return Promise.resolve(); }
    if (P.lecture && !relire) return P.lecture;
    const lecture = (async () => {
      const { data, error } = await sb.from(TABLE).select('cle, valeur, modifie_le').eq('user_id', u);
      if (P.de !== u) return;                                      // un autre compte entre-temps : sa lecture est la sienne
      const avant = relire ? { ...P.valeurs } : null;
      if (error) { if (absent(error)) P.etat = 'absent'; else if (P.etat !== 'ok') P.etat = 'erreur'; }
      else {
        P.etat = 'ok';
        const m = miroir();
        const nouveaux = {};
        for (const r of data || []) {
          if (!r || typeof r.cle !== 'string' || m.attente.includes(r.cle)) continue;   // ce qui attend l'emporte sur la base
          P.valeurs[r.cle] = r.valeur; nouveaux[r.cle] = r.valeur;
        }
        changerMiroir(x => Object.assign(x.valeurs, nouveaux));
        for (const cle of m.attente) if (m.valeurs[cle] !== undefined) { P.valeurs[cle] = m.valeurs[cle]; if (!P.minuteurs[cle]) planifier(cle, true); }   // (une clé en cours de geste garde son délai)
      }
      migrer();
      if (avant) for (const cle of new Set([...Object.keys(avant), ...Object.keys(P.valeurs)])) if (!pareil(avant[cle], P.valeurs[cle]) && !P.minuteurs[cle]) prevenir(cle);
    })().catch(e => { if (P.etat === null) P.etat = 'erreur'; console.error(e); });
    if (!relire) P.lecture = lecture;
    return lecture;
  }
  // les anciennes clés de l'appareil passent dans le compte, puis s'effacent une fois la valeur dans la base
  function migrer() {
    for (const a of ANCIENNES) {
      const ici = ancienneValeur(a);
      if (ici === undefined) continue;
      const actuel = P.valeurs[a.cle] !== undefined ? P.valeurs[a.cle] : miroir().valeurs[a.cle];
      const effacer = () => ecrireLocal(a.local, undefined);
      if (enAttente(a.cle) && P.etat !== 'absent') { P.apres[a.cle] = effacer; continue; }
      if (a.gagne(ici, actuel) && !(P.etat === 'absent' && a.cle === 'planning.masques')) {
        P.valeurs[a.cle] = ici;
        changerMiroir(m => { m.valeurs[a.cle] = ici; if (!m.attente.includes(a.cle)) m.attente.push(a.cle); });
        if (P.etat === 'ok') { P.apres[a.cle] = effacer; planifier(a.cle, true); }
      } else if (P.etat === 'ok' && !enAttente(a.cle)) effacer();   // la base a déjà la valeur à garder
    }
  }

  // ===================================================================================================== écrire
  function dire() {
    if (P.dit || typeof annoncer !== 'function') return;
    P.dit = true;
    annoncer(P.etat === 'absent' ? 'Gardé sur cet appareil.' : 'Gardé avec votre compte.');
  }
  function ecrire(cle, valeur, { aussitot = false, muet = false } = {}) {
    const u = uid();
    if (P.de !== u) reinitialiser(u);
    P.valeurs[cle] = valeur;
    if (repli(cle)) ecrireLocal('crescite-planning-masques', valeur);
    else {
      changerMiroir(m => { m.valeurs[cle] = valeur; if (u && !m.attente.includes(cle)) m.attente.push(cle); });
      planifier(cle, aussitot);
    }
    diffuser(cle);
    if (!muet) dire();
  }
  function planifier(cle, aussitot) {
    if (!uid() || P.etat === 'absent') return;
    clearTimeout(P.minuteurs[cle]);
    P.minuteurs[cle] = setTimeout(() => { delete P.minuteurs[cle]; P.file = P.file.then(() => envoyer(cle)).catch(() => {}); }, aussitot ? 0 : DELAI);
  }
  async function envoyer(cle) {
    const u = uid();
    if (!u || P.de !== u || P.etat === 'absent' || P.minuteurs[cle]) return;   // (un geste plus récent a déjà son minuteur)
    const valeur = P.valeurs[cle];
    if (valeur === undefined) return;
    const { error } = await sb.from(TABLE).upsert({ user_id: u, cle, valeur }, { onConflict: 'user_id,cle' });
    if (P.de !== u) return;
    if (!error) {
      P.etat = 'ok'; P.refus = false;
      if (!P.minuteurs[cle] && pareil(P.valeurs[cle], valeur)) {
        changerMiroir(m => { m.attente = m.attente.filter(x => x !== cle); });
        const f = P.apres[cle]; delete P.apres[cle]; if (f) f();
      }
      return;
    }
    if (absent(error)) { P.etat = 'absent'; return; }                 // sans le script, le miroir garde tout et la clé reste en attente
    if (P.refus) return;                                              // 401, 403 et les autres : une seule annonce tant que rien ne passe
    P.refus = true;
    console.error(error);
    if (typeof annoncer === 'function') annoncer('Vos réglages ne sont pas enregistrés dans votre compte : ils restent sur cet appareil.', { erreur: true });
  }
  // la fermeture de la page : ce qui n'est pas encore parti, envoyé d'un coup par un fetch qui survit à la page
  function viderALaFermeture() {
    const u = uid();
    if (!u || P.etat === 'absent' || P.de !== u) return;
    const m = miroir(), cles = m.attente.filter(c => m.valeurs[c] !== undefined);
    Object.values(P.minuteurs).forEach(clearTimeout); P.minuteurs = {};
    if (!cles.length) return;
    const jeton = E.session?.access_token;
    if (!jeton) return;
    try {
      fetch(`${BASE}/rest/v1/${TABLE}?on_conflict=user_id,cle`, { method: 'POST', keepalive: true,
        headers: { apikey: CLE, Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(cles.map(cle => ({ user_id: u, cle, valeur: m.valeurs[cle] }))) }).catch(() => {});
    } catch { /* trop gros pour survivre à la page : le miroir le renverra au prochain démarrage */ }
  }
  window.addEventListener('pagehide', viderALaFermeture);

  // (attendre : la file d'envoi vidée, pour dire « Enregistré » quand c'est vrai)
  return { charger, lire, ecrire, surChangement, normaliser, etat: () => P.etat, attendre: () => P.file };
})();
