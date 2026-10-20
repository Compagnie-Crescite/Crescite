/* L'espace de l'équipe de la compagnie Crescite (equipe/index.html). Chaque personne de l'équipe (jeu, technique,
   création, administration) y retrouve sa tournée de la saison, les horaires des représentations, les feuilles de
   route, le texte et les dossiers de ses spectacles, et tient ses coordonnées à jour.

   La base (Supabase, tables crescite_) ne lui montre que ce qui la concerne : voir les règles d'accès de
   supabase/migrations/20261021_crescite_equipe.sql. Les comptes sont ouverts par l'administration, jamais ici : la page
   se connecte (mot de passe, lien de connexion, mot de passe oublié), relie le compte à sa fiche par son adresse
   (crescite_rattacher), puis lit sa tournée (crescite_ma_tournee), ses distributions, l'équipe de ses dates, les
   documents (fichiers du stockage privé crescite-equipe, ouverts par un lien signé, ou liens) et les feuilles de
   route publiées, que ../admin/feuille.js (FEUILLE) affiche et met en PDF.

   Chargés avant ce fichier : ../admin/vendor/supabase.js (supabase-js), ../admin/agenda.js (AGENDA, les lignes
   d'agenda du site), ../admin/feuille.js (FEUILLE) et, s'il est là, ../admin/tentacules.js (TENTACULES). Sans AGENDA ni
   FEUILLE, la page marche et dit ce qui manque ; sans TENTACULES, rien ne change. */
(() => {
  'use strict';

  // ================================================================================================ réglages
  const BASE = 'https://omekkqjinvppadsoinvj.supabase.co';
  const CLE = 'sb_publishable_TODW6NdmDly8eR9UxjG-6g_eyAa4gjB';
  const SESSION = 'crescite-equipe';            // la session de l'équipe, à part de celle de l'administration
  const MEMOIRE = 'crescite-equipe-donnees';    // la dernière saison chargée : relue si le réseau manque (effacée à la déconnexion)
  const SEAU = 'crescite-equipe';               // le stockage privé des documents
  const DUREE_LIEN = 3600;                      // un lien signé vaut une heure ; au-delà, il est redemandé au clic
  const CONTACT = 'contact@crescite.fr';        // l'adresse publique de la compagnie (page Contact de crescite.fr)
  const PAPIER = '#fffdf9';

  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ce que l'adresse apporte en arrivant d'un courriel (lien de connexion, invitation, mot de passe oublié), à lire avant
  // que le client de la base ne l'efface ; une erreur (lien expiré) est retirée de l'adresse tout de suite
  const ARRIVEE = (() => {
    const h = new URLSearchParams(location.hash.replace(/^#/, '')), q = new URLSearchParams(location.search);
    const lire = k => h.get(k) || q.get(k) || '';
    return { type: lire('type'), erreur: lire('error_description') || lire('error'), code: lire('error_code') };
  })();
  if (ARRIVEE.erreur) {
    const u = new URL(location.href);
    ['error', 'error_code', 'error_description', 'type'].forEach(k => u.searchParams.delete(k));
    history.replaceState(null, '', u.pathname + u.search);
  }

  // ================================================================================================ outils communs
  const AG = typeof AGENDA !== 'undefined' ? AGENDA : null;
  const TT = typeof TENTACULES !== 'undefined' ? TENTACULES : null;
  if (TT) TT.regler({ profil: 'admin', style: 'encre', remontee: false, soulever: false });
  const tt = (f, ...a) => { if (TT && typeof TT[f] === 'function') { try { return TT[f](...a); } catch (e) { /* le décor ne casse rien */ } } };
  const outilFeuille = () => (typeof FEUILLE !== 'undefined' && FEUILLE && typeof FEUILLE.html === 'function' ? FEUILLE : null);

  if (typeof supabase === 'undefined' || !supabase.createClient) {
    $('#app').innerHTML = `<main class="seul" id="contenu"><div class="porte"><h1>L’espace de l’équipe ne s’ouvre pas</h1>
      <p class="message erreur" role="alert">La page n’a pas pu charger son outil de connexion à la base. Vérifiez votre connexion au réseau, puis rechargez la page.</p>
      <button type="button" class="btn principal" onclick="location.reload()">Recharger la page</button></div></main>`;
    return;
  }
  const sb = supabase.createClient(BASE, CLE, { auth: { persistSession: true, autoRefreshToken: true, storageKey: SESSION, detectSessionInUrl: true } });

  // ================================================================================================ dates et heures
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const JOURS_C = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const deux = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
  const aujourdhui = () => iso(new Date());
  const jourDe = j => new Date(+j.slice(0, 4), +j.slice(5, 7) - 1, +j.slice(8, 10));
  const quantieme = n => (n === 1 ? '1er' : String(n));
  const jourLong = j => { const d = jourDe(j); return `${JOURS[d.getDay()]} ${quantieme(d.getDate())} ${MOIS[d.getMonth()]} ${d.getFullYear()}`; };
  const jourCourt = j => { const d = jourDe(j); return `${JOURS_C[d.getDay()]} ${quantieme(d.getDate())} ${MOIS_C[d.getMonth()]}`; };
  const moisTexte = j => `${MOIS[+j.slice(5, 7) - 1]} ${j.slice(0, 4)}`;
  const heureTexte = h => (h ? `${h.slice(0, 2)}h${h.slice(3, 5)}` : '');
  const ecartJours = (a, b) => Math.round((jourDe(b) - jourDe(a)) / 864e5);
  const lendemain = j => new Date(Date.UTC(+j.slice(0, 4), +j.slice(5, 7) - 1, +j.slice(8, 10) + 1)).toISOString().slice(0, 10);
  const saisonDe = j => (AG ? AG.saisonDe(j) : (+j.slice(5, 7) >= 9 ? `${+j.slice(0, 4)}-${+j.slice(0, 4) + 1}` : `${+j.slice(0, 4) - 1}-${+j.slice(0, 4)}`));
  const momentTexte = t => {   // « le 12 décembre à 14 h 05 », « le 3 mars 2025 à 9 h 10 »
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return '';
    const an = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
    return `le ${quantieme(d.getDate())}\u00a0${MOIS[d.getMonth()]}${an} à ${heureCourte(d)}`;
  };
  const heureCourte = t => { const d = new Date(t); return `${d.getHours()}\u00a0h\u00a0${deux(d.getMinutes())}`; };
  const pluriel = (n, un, plusieurs = un + 's') => `${n}\u00a0${n > 1 ? plusieurs : un}`;
  const majuscule = s => (s ? s[0].toUpperCase() + s.slice(1) : s);

  // la fin d'une date : son dernier jour ; une date au mois court jusqu'à la fin du mois, une date « saison » jusqu'en août
  function finDe(d) {
    if (d.precision === 'mois') { const x = jourDe(d.debut); return iso(new Date(x.getFullYear(), x.getMonth() + 1, 0)); }
    if (d.precision === 'saison') return `${String(d.saison || saisonDe(d.debut)).slice(5, 9)}-08-31`;
    return d.fin || d.debut;
  }

  // ================================================================================================ couleurs d'univers
  const hexa = c => /^#[0-9a-f]{6}$/i.test(c || '');
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function hsl(h) {
    const [r, g, b] = rgb(h).map(v => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const t = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [t * 60, s, l];
  }
  function versHexa(t, s, l) {
    const k = n => (n + t / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
    return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('');
  }
  const melange = (a, b, p) => { const x = rgb(a), y = rgb(b); return '#' + x.map((v, i) => Math.round(v * p + y[i] * (1 - p)).toString(16).padStart(2, '0')).join(''); };
  // la même teinte, assombrie jusqu'au contraste voulu sur ce fond
  function lisible(c, fond, cible = 4.6) {
    if (contraste(c, fond) >= cible) return c;
    const [t, s, l0] = hsl(c);
    for (let l = l0; l > 0; l -= 0.01) { const x = versHexa(t, s, l); if (contraste(x, fond) >= cible) return x; }
    return '#1d1418';
  }
  const COULEURS = new Map();
  function couleurs(sp) {
    const c = sp?.univers?.couleurs || {};
    const u = [c.scene, c.accent, c.texte].find(hexa) || '#a3306b';
    if (!COULEURS.has(u)) { const fond = melange(u, PAPIER, 0.13); COULEURS.set(u, { u, fond, texte: lisible(u, fond) }); }
    return COULEURS.get(u);
  }
  const styleU = sp => { const c = couleurs(sp); return `--u:${c.u};--u-fond:${c.fond};--u-texte:${c.texte}`; };

  // ================================================================================================ icônes
  const ic = (d, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
  const ICONES = {
    agenda: ic('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M12 14h2M8 17h2"/>'),
    route: ic('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
    doc: ic('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
    lien: ic('<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>'),
    pdf: ic('<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M5 19.5h14"/>'),
    lire: ic('<path d="M4 5.5h6a2 2 0 0 1 2 2V20a1.5 1.5 0 0 0-1.5-1.5H4zM20 5.5h-6a2 2 0 0 0-2 2V20a1.5 1.5 0 0 1 1.5-1.5H20z"/>'),
  };

  // ================================================================================================ les mots des erreurs
  const estReseau = e => !!e && (e.name === 'AuthRetryableFetchError' || e.status === 0
    || /Failed to fetch|NetworkError|Load failed|fetch failed|Network request failed|ERR_INTERNET|ERR_NETWORK/i.test(String(e.message || e)));
  function motsErreur(e) {
    const m = String(e?.message || e || ''), code = String(e?.code || ''), st = e?.status;
    if (estReseau(e)) return 'pas de connexion au réseau. Vérifiez votre connexion, puis réessayez';
    if (code === 'invalid_credentials' || /Invalid login credentials/i.test(m)) return 'l’adresse ou le mot de passe est incorrect';
    if (code === 'email_not_confirmed' || /Email not confirmed/i.test(m)) return 'ce compte n’est pas encore activé. Ouvrez le lien d’invitation reçu par courriel, ou demandez un lien de connexion';
    if (code === 'otp_disabled' || code === 'user_not_found' || /Signups not allowed/i.test(m)) return 'aucun compte de l’équipe n’existe pour cette adresse. Vérifiez-la, ou écrivez à l’administration de la compagnie';
    if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || st === 429 || /rate limit|only request this after/i.test(m)) return 'un courriel vient déjà de partir. Attendez une minute avant d’en demander un autre';
    if (code === 'same_password' || /different from the old/i.test(m)) return 'c’est déjà votre mot de passe. Choisissez-en un autre';
    if (code === 'weak_password' || /Password should|password is too weak/i.test(m)) return 'ce mot de passe est trop faible. Choisissez-en un plus long, avec des lettres et des chiffres';
    if (code === 'email_address_invalid' || /invalid format|valid email/i.test(m)) return 'cette adresse électronique n’est pas valide';
    if (code === 'session_not_found' || code === 'refresh_token_not_found' || code === 'PGRST301' || code === 'PGRST303' || /session missing|JWT expired/i.test(m)) return 'votre session a expiré. Reconnectez-vous';
    if (/Object not found|not_found|does not exist or you do not have access/i.test(m + ' ' + (e?.error || ''))) return 'ce fichier n’est pas (ou plus) dans le stockage, ou il ne vous est pas ouvert. Prévenez l’administration';
    if (code === 'PGRST202' || code === 'PGRST205' || code === '42883' || code === '42P01' || /Could not find the (function|table)/i.test(m)) return 'l’espace de l’équipe n’est pas encore installé dans la base de la compagnie. Prévenez l’administration';
    if (code === '42501' || st === 401 || st === 403) return 'la base refuse cette opération à votre compte. Prévenez l’administration';
    if (st >= 500) return 'la base de la compagnie ne répond pas pour le moment. Réessayez dans un instant';
    return m || 'une erreur inconnue est survenue';
  }

  // ================================================================================================ annonces
  function annoncer(msg, { erreur = false, delai = 6000 } = {}) {
    const el = document.createElement('div');
    el.className = 'annonce' + (erreur ? ' erreur' : '');
    el.setAttribute('role', erreur ? 'alert' : 'status');
    el.innerHTML = `<span>${esc(msg)}</span><button type="button">Fermer</button>`;
    $('button', el).addEventListener('click', () => el.remove());
    $('#annonces').append(el);
    setTimeout(() => el.remove(), erreur ? 12000 : delai);
  }

  // ================================================================================================ état
  const E = {
    session: null, uid: null, moi: null, pret: false, ouverture: false,
    motDePasse: ARRIVEE.erreur ? '' : ARRIVEE.type === 'recovery' ? 'nouveau' : (ARRIVEE.type === 'invite' || ARRIVEE.type === 'signup') ? 'bienvenue' : '',
    personne: null, privee: null, dates: [], distributions: [], equipes: [], documents: [], spectacles: new Map(),
    feuilles: new Map(), liens: new Map(), erreurLiens: null, chargeLe: 0, horsLigne: 0, rafraichit: false,
    vue: '', ficheSale: false, retour: null, feuilleVue: null, deplies: new Set(), sortieVoulue: false, versEspace: false, sansSession: false,
    provisoire: false,
    messageConnexion: ARRIVEE.erreur ? {
      texte: `Ce lien ne peut plus servir : ${ARRIVEE.code === 'otp_expired' || /expired|invalid/i.test(ARRIVEE.erreur) ? 'il a expiré, ou il a déjà été ouvert une fois' : 'il n’a pas pu être vérifié'}. Demandez-en un nouveau ci-dessous.`,
      genre: 'erreur' } : null,
  };
  const nomDe = p => (p ? [p.prenom, p.nom].filter(Boolean).join(' ') : '');
  const retourUrl = () => location.origin + location.pathname;

  // ================================================================================================ connexion
  sb.auth.onAuthStateChange((ev, s) => {
    E.session = s;
    if (ev === 'PASSWORD_RECOVERY') E.motDePasse = 'nouveau';
    if (ev === 'SIGNED_OUT') {
      const voulue = E.sortieVoulue;
      E.sortieVoulue = false;
      oublier(); reinitialiser();
      E.messageConnexion = voulue ? { texte: 'La session est fermée sur cet appareil.', genre: 'info' }
        : { texte: 'Votre session a pris fin. Reconnectez-vous.', genre: 'erreur' };
    }
    // jamais d'appel à la base dans ce rappel : supabase-js le déconseille (verrou)
    if (['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT', 'PASSWORD_RECOVERY'].includes(ev) || (ev === 'TOKEN_REFRESHED' && E.sansSession)) setTimeout(demarrer, 0);
  });

  function reinitialiser() {
    Object.assign(E, { uid: null, moi: null, pret: false, ouverture: false, personne: null, privee: null, dates: [], distributions: [],
      equipes: [], documents: [], spectacles: new Map(), feuilles: new Map(), liens: new Map(), erreurLiens: null, chargeLe: 0,
      horsLigne: 0, vue: '', ficheSale: false, retour: null, feuilleVue: null, deplies: new Set(), sansSession: false, provisoire: false });
  }

  // une page seule, centrée : connexion, mot de passe, compte sans fiche, panne
  function seul(html) {
    $('#app').innerHTML = `<main class="seul" id="contenu" tabindex="-1"><div class="porte">
      <p class="porte-marque"><span class="pieuvre" data-pieuvre aria-hidden="true"></span><span class="marque-nom">Crescite</span> <span class="marque-sous">équipe</span></p>
      ${html}</div></main>`;
    tt('pieuvre');
  }
  function dire(cible, texteHtml, genre = 'erreur') {
    const el = typeof cible === 'string' ? $(cible) : cible;
    if (!el) return;
    el.innerHTML = texteHtml ? `<p class="message ${genre}" role="${genre === 'erreur' ? 'alert' : 'status'}">${texteHtml}</p>` : '';
  }
  function erreurChamp(input, texte) {
    const id = input.id + '-erreur';
    $('#' + id)?.remove();
    input.setAttribute('aria-invalid', 'true');
    const p = document.createElement('p');
    p.className = 'erreur-champ'; p.id = id; p.textContent = texte;
    (input.closest('.mdp') || input).after(p);
    input.setAttribute('aria-describedby', [id, ...(input.getAttribute('aria-describedby') || '').split(' ').filter(x => x && x !== id)].join(' '));
    input.focus();
  }
  function effacerErreur(input) {
    const id = input.id + '-erreur';
    $('#' + id)?.remove();
    input.removeAttribute('aria-invalid');
    const reste = (input.getAttribute('aria-describedby') || '').split(' ').filter(x => x && x !== id).join(' ');
    if (reste) input.setAttribute('aria-describedby', reste); else input.removeAttribute('aria-describedby');
  }
  // « Afficher » le mot de passe : un vrai bouton à bascule
  function brancherVoir(racine) {
    $$('.voir', racine).forEach(b => b.addEventListener('click', () => {
      const i = $('#' + b.getAttribute('aria-controls'));
      const voir = i.type === 'password';
      i.type = voir ? 'text' : 'password';
      b.setAttribute('aria-pressed', String(voir));
      b.textContent = voir ? 'Masquer' : 'Afficher';
    }));
  }
  async function occupe(bouton, texte, f) {
    const avant = bouton.innerHTML;
    bouton.disabled = true; bouton.setAttribute('aria-busy', 'true'); bouton.textContent = texte;
    try { return await f(); } finally { if (bouton.isConnected) { bouton.disabled = false; bouton.removeAttribute('aria-busy'); bouton.innerHTML = avant; } }
  }

  function ecranConnexion() {
    E.versEspace = true;
    const m = E.messageConnexion;
    E.messageConnexion = null;
    seul(`<h1>L’espace de l’équipe</h1>
      <p class="intro">Votre tournée, les horaires des représentations, les feuilles de route et les documents de vos spectacles.</p>
      <div id="c-msg">${m ? `<p class="message ${m.genre}" role="${m.genre === 'erreur' ? 'alert' : 'status'}">${esc(m.texte)}</p>` : ''}</div>
      <form id="f-connexion" novalidate>
        <div class="champ"><label for="c-mel">Adresse électronique</label>
          <input id="c-mel" type="email" name="email" autocomplete="username" inputmode="email" autocapitalize="none" spellcheck="false" required></div>
        <div class="champ"><label for="c-mdp">Mot de passe</label>
          <div class="mdp"><input id="c-mdp" type="password" name="password" autocomplete="current-password" required><button type="button" class="voir" aria-pressed="false" aria-controls="c-mdp">Afficher</button></div></div>
        <button class="btn principal large" type="submit">Se connecter</button>
      </form>
      <div class="ou" aria-hidden="true">ou</div>
      <div class="autres">
        <button class="btn large" type="button" id="b-lien">Recevoir un lien de connexion</button>
        <p class="aide">Sans mot de passe : un lien arrive dans votre messagerie et vous ouvre l’espace.</p>
        <p><button class="lien-btn" type="button" id="b-oubli">Mot de passe oublié ?</button></p>
      </div>
      <p class="note">Les comptes de l’équipe sont ouverts par l’administration de la compagnie. Pas encore de compte, ou une autre adresse ?
        <a class="insecable" href="mailto:${CONTACT}?subject=${encodeURIComponent('Espace de l’équipe : mon compte')}">Écrivez-lui</a>.</p>`);
    const mel = $('#c-mel'), mdp = $('#c-mdp');
    brancherVoir($('#app'));
    [mel, mdp].forEach(i => i.addEventListener('input', () => effacerErreur(i)));
    mel.focus();
    const adresse = () => {
      const v = mel.value.trim();
      if (!v) { erreurChamp(mel, 'Indiquez votre adresse électronique.'); return null; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { erreurChamp(mel, 'Cette adresse électronique n’est pas complète (par exemple : prenom.nom@exemple.fr).'); return null; }
      effacerErreur(mel);
      return v;
    };
    $('#f-connexion').addEventListener('submit', async e => {
      e.preventDefault();
      const v = adresse();
      if (!v) return;
      if (!mdp.value) return erreurChamp(mdp, 'Indiquez votre mot de passe, ou demandez plus bas un lien de connexion.');
      dire('#c-msg', '');
      const { error } = await occupe($('#f-connexion button[type=submit]'), 'Connexion…', () => sb.auth.signInWithPassword({ email: v, password: mdp.value }));
      if (error) { dire('#c-msg', `Connexion impossible : ${esc(motsErreur(error))}.`); if (error.code === 'invalid_credentials' || /Invalid login/i.test(error.message)) mdp.select(); }
    });
    $('#b-lien').addEventListener('click', async e => {
      const v = adresse();
      if (!v) return;
      const { error } = await occupe(e.currentTarget, 'Envoi du lien…', () => sb.auth.signInWithOtp({ email: v, options: { shouldCreateUser: false, emailRedirectTo: retourUrl() } }));
      if (error) dire('#c-msg', `Le lien n’a pas pu partir : ${esc(motsErreur(error))}.`);
      else dire('#c-msg', `Un lien de connexion vient de partir vers <b>${esc(v)}</b>. Ouvrez-le depuis votre messagerie : il vous ramène ici, dans votre espace, et ne sert qu’une fois. Rien reçu d’ici quelques minutes ? Regardez dans les indésirables.`, 'info');
    });
    $('#b-oubli').addEventListener('click', async e => {
      const v = adresse();
      if (!v) return;
      const { error } = await occupe(e.currentTarget, 'Envoi…', () => sb.auth.resetPasswordForEmail(v, { redirectTo: retourUrl() }));
      if (error) dire('#c-msg', `Le courriel n’a pas pu partir : ${esc(motsErreur(error))}.`);
      else dire('#c-msg', `Si un compte de l’équipe existe pour <b>${esc(v)}</b>, un lien pour choisir un nouveau mot de passe vient de partir. Ouvrez-le depuis votre messagerie : il vous ramène ici.`, 'info');
    });
  }

  // à l'arrivée par une invitation ou par « mot de passe oublié » : choisir un mot de passe (ou plus tard)
  function ecranMotDePasse() {
    const bienvenue = E.motDePasse === 'bienvenue', mel = E.session?.user?.email || '';
    seul(`<h1>${bienvenue ? 'Bienvenue dans l’espace de l’équipe' : 'Choisir un nouveau mot de passe'}</h1>
      <p class="intro">${bienvenue ? 'Choisissez un mot de passe pour vos prochaines connexions. Vous pourrez aussi, toujours, recevoir un lien de connexion par courriel.'
        : 'Le lien reçu a ouvert votre session. Choisissez maintenant votre nouveau mot de passe.'}</p>
      <div id="m-msg"></div>
      <form id="f-mdp" novalidate>
        <input type="email" name="email" autocomplete="username" value="${esc(mel)}" class="sr" tabindex="-1" aria-hidden="true" readonly>
        <div class="champ"><label for="n-mdp">Nouveau mot de passe</label>
          <div class="mdp"><input id="n-mdp" type="password" autocomplete="new-password" required minlength="8" aria-describedby="n-aide"><button type="button" class="voir" aria-pressed="false" aria-controls="n-mdp">Afficher</button></div>
          <p class="aide" id="n-aide">Huit caractères au moins. Compte : ${esc(mel)}</p></div>
        <div class="champ"><label for="n-mdp2">Le même, une seconde fois</label><input id="n-mdp2" type="password" autocomplete="new-password" required></div>
        <div class="boutons"><button type="submit" class="btn principal large">Enregistrer le mot de passe</button>
          <button type="button" class="btn discret large" id="b-plus-tard">Plus tard</button></div>
      </form>`);
    brancherVoir($('#app'));
    const a = $('#n-mdp'), b = $('#n-mdp2');
    [a, b].forEach(i => i.addEventListener('input', () => effacerErreur(i)));
    a.focus();
    $('#f-mdp').addEventListener('submit', async e => {
      e.preventDefault();
      if (a.value.length < 8) return erreurChamp(a, 'Le mot de passe doit compter au moins huit caractères.');
      if (a.value !== b.value) return erreurChamp(b, 'Les deux mots de passe ne sont pas identiques.');
      const { error } = await occupe($('#f-mdp button[type=submit]'), 'Enregistrement…', () => sb.auth.updateUser({ password: a.value }));
      if (error) return dire('#m-msg', `Le mot de passe n’a pas été changé : ${esc(motsErreur(error))}.`);
      annoncer('Votre mot de passe est enregistré.');
      continuer();
    });
    $('#b-plus-tard').addEventListener('click', continuer);
  }

  // le mot de passe choisi (ou remis à plus tard) : l'espace s'ouvre, ou se redessine s'il était déjà ouvert
  function continuer() {
    E.motDePasse = '';
    if (E.pret && E.session && E.uid === E.session.user.id) { coquille(); router({ arrivee: true }); } else demarrer();
  }

  function ecranSansFiche() {
    const mel = E.session?.user?.email || '';
    const corps = `Bonjour,\n\nJe n’arrive pas à ouvrir l’espace de l’équipe : mon compte n’est relié à aucune fiche.\nL’adresse de mon compte : ${mel}\n\nMerci !`;
    seul(`<h1 tabindex="-1">Votre compte n’est relié à aucune fiche de l’équipe</h1>
      <p class="intro">Votre compte, <b>${esc(mel)}</b>, est bien ouvert, mais aucune fiche de l’équipe ne porte cette adresse.</p>
      <p class="message conseil" role="status">Écrivez à l’administration de la compagnie en lui donnant l’adresse de votre compte, <b>${esc(mel)}</b> : elle la reliera à votre fiche.</p>
      <div class="boutons">
        <a class="btn principal large" href="mailto:${CONTACT}?subject=${encodeURIComponent('Espace de l’équipe : relier mon compte')}&body=${encodeURIComponent(corps)}">Écrire à l’administration</a>
        <button type="button" class="btn discret large" data-reessayer>Réessayer</button>
        <button type="button" class="btn discret large" data-sortir>Se déconnecter</button>
      </div>`);
    $('#contenu h1').focus();
  }

  function ecranPanne(e) {
    seul(`<h1>Votre espace ne s’ouvre pas</h1>
      <p class="message erreur" role="alert">${esc(majuscule(motsErreur(e)))}.</p>
      <div class="boutons"><button type="button" class="btn principal large" data-reessayer>Réessayer</button>
        <button type="button" class="btn discret large" data-sortir>Se déconnecter</button></div>`);
  }

  // ================================================================================================ démarrage
  // la session gardée sur cet appareil, même expirée : sans réseau, supabase-js ne peut pas la renouveler et dit « pas de session »
  const sessionGardee = () => { try { const x = JSON.parse(localStorage.getItem(SESSION) || 'null'); return x && x.refresh_token && x.user && x.user.id ? x : null; } catch (e) { return null; } };
  let tour = 0;
  async function demarrer() {
    const s = E.session;
    if (!s) {
      E.motDePasse = '';
      // sur le quai, sans réseau, la session a expiré : la dernière saison lue reste lisible, et tout se rouvre quand le réseau revient
      const g = !E.sortieVoulue && sessionGardee(), m = g && reprendre(g.user.id);
      if (m) {
        if (!(E.pret && E.uid === g.user.id)) { reinitialiser(); appliquer(m); Object.assign(E, { uid: g.user.id, pret: true }); coquille(); router({ arrivee: true }); }
        Object.assign(E, { horsLigne: E.horsLigne || m.quand || 1, sansSession: true, provisoire: false });
        return bandeauEtat();
      }
      reinitialiser(); return ecranConnexion();
    }
    // supabase-js redit SIGNED_IN à chaque retour sur l'onglet : l'écran du mot de passe garde ce qui est tapé
    if (E.motDePasse) { if (!$('#f-mdp')) ecranMotDePasse(); return; }
    if (E.messageConnexion) { annoncer(E.messageConnexion.texte, { erreur: E.messageConnexion.genre === 'erreur' }); E.messageConnexion = null; }
    if (E.uid === s.user.id && (E.ouverture || (E.pret && !E.provisoire && !E.sansSession))) return;
    // la saison gardée est déjà à l'écran (ouverture, ou retour du réseau) : elle se relit sans s'effacer
    const garde = E.pret && E.uid === s.user.id;
    const n = ++tour;
    E.uid = s.user.id; E.ouverture = true;
    if (!garde) $('#app').innerHTML = '<p class="chargement" role="status">Ouverture de votre espace…</p>';
    try {
      const moi = await rattacher();
      if (n !== tour) return;
      if (moi == null) { reinitialiser(); return ecranSansFiche(); }
      E.moi = moi;
      await charger();
      if (n !== tour) return;
      E.horsLigne = 0;
      garder();
    } catch (e) {
      if (n !== tour) return;
      const m = estReseau(e) ? reprendre(s.user.id) : null;
      if (!m) { reinitialiser(); return ecranPanne(e); }
      if (!garde) appliquer(m);
      E.horsLigne = E.horsLigne || m.quand || 1;
    }
    Object.assign(E, { ouverture: false, pret: true, provisoire: false, sansSession: false });
    if (garde) await redessiner(); else { coquille(); router({ arrivee: true }); }
    if (E.versEspace) { E.versEspace = false; requestAnimationFrame(() => tt('page', '#a3306b')); }
  }

  async function rattacher() {
    const { data, error } = await sb.rpc('crescite_rattacher');
    if (error) throw error;
    return data == null ? null : Number(data);
  }

  // tout ce que la page montre, en deux temps : la tournée et ce qui l'entoure, puis les feuilles de route à venir,
  // les spectacles sans date et les liens signés des fichiers
  async function charger() {
    const moi = E.moi;
    const rs = await Promise.all([
      sb.rpc('crescite_ma_tournee'),
      sb.from('crescite_personnes').select('id, slug, prenom, nom, metiers').eq('id', moi).maybeSingle(),
      sb.from('crescite_personnes_privees').select('personne_id, email, telephone, ville, regime, urgence').eq('personne_id', moi).maybeSingle(),
      sb.from('crescite_distributions').select('id, spectacle_id, personne_id, categorie, fonction, role, alternance, en_tournee, ordre, personne:crescite_personnes(id, prenom, nom)').order('ordre'),
      sb.from('crescite_equipes').select('date_id, personne_id, present, fonction, note, personne:crescite_personnes(id, prenom, nom)'),
      sb.from('crescite_documents').select('id, spectacle_id, type, titre, fichier, url, pour, ordre').order('ordre').order('titre'),
    ]);
    const echec = rs.find(r => r.error);
    if (echec) throw echec.error;
    const [t, p, pv, di, eq, dc] = rs.map(r => r.data);
    const dates = (Array.isArray(t) ? t : []).map(d => ({ ...d, id: Number(d.id), representations: Array.isArray(d.representations) ? d.representations : [] }))
      .sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : a.id - b.id));
    const ids = new Set(dates.map(d => d.id));
    const spectacles = new Map();
    dates.forEach(d => { if (d.spectacle && !spectacles.has(d.spectacle.id)) spectacles.set(d.spectacle.id, d.spectacle); });
    const distributions = (di || []);
    const miens = new Set([...spectacles.keys(), ...distributions.filter(x => x.personne_id === moi).map(x => x.spectacle_id)]);
    const documents = (dc || []).filter(x => x.pour !== 'administration' && (x.spectacle_id == null || miens.has(x.spectacle_id)));
    const auj = aujourdhui();
    const avecFeuille = dates.filter(d => d.feuille && finDe(d) >= auj).map(d => d.id);
    const manquants = [...miens].filter(id => !spectacles.has(id));
    const [sp, fe] = await Promise.all([
      manquants.length ? sb.from('crescite_spectacles').select('id, slug, titre, duree, univers, ordre').in('id', manquants) : { data: [] },
      avecFeuille.length ? sb.from('crescite_feuilles').select('id, date_id, titre, contenu, statut, version, publiee_le').eq('statut', 'publiee').in('date_id', avecFeuille) : { data: [] },
    ]);
    if (sp.error) throw sp.error;
    if (fe.error) throw fe.error;
    (sp.data || []).forEach(x => spectacles.set(x.id, x));
    let liens = new Map(), erreurLiens = null;
    try { liens = await signer(documents.filter(x => x.fichier).map(x => x.fichier)); } catch (e) { erreurLiens = e; }
    Object.assign(E, {
      personne: p, privee: pv, dates, spectacles, documents, liens, erreurLiens,
      distributions: distributions.filter(x => miens.has(x.spectacle_id)),
      equipes: (eq || []).filter(x => ids.has(Number(x.date_id))),
      feuilles: new Map((fe.data || []).map(f => [Number(f.date_id), f])),
      chargeLe: Date.now(),
    });
  }

  // la mémoire de la dernière lecture (sans la fiche privée) : pour lire sa saison quand le réseau manque
  function garder() {
    try {
      localStorage.setItem(MEMOIRE, JSON.stringify({ v: 1, uid: E.uid, moi: E.moi, quand: E.chargeLe, personne: E.personne,
        dates: E.dates, distributions: E.distributions, equipes: E.equipes, documents: E.documents,
        spectacles: [...E.spectacles.values()], feuilles: [...E.feuilles.values()] }));
    } catch (e) { /* stockage plein ou interdit : la page marche sans */ }
  }
  function reprendre(uid) {
    try { const m = JSON.parse(localStorage.getItem(MEMOIRE) || 'null'); return m && m.v === 1 && m.uid === uid ? m : null; } catch (e) { return null; }
  }
  function oublier() { try { localStorage.removeItem(MEMOIRE); } catch (e) { /* rien à effacer */ } }
  function appliquer(m) {
    Object.assign(E, { moi: m.moi, personne: m.personne, privee: null, dates: m.dates || [], distributions: m.distributions || [],
      equipes: m.equipes || [], documents: m.documents || [], spectacles: new Map((m.spectacles || []).map(x => [x.id, x])),
      feuilles: new Map((m.feuilles || []).map(f => [Number(f.date_id), f])), liens: new Map(), erreurLiens: null, chargeLe: m.quand || 0 });
  }

  // ================================================================================================ les liens signés
  async function signer(chemins) {
    const uniques = [...new Set(chemins)], m = new Map();
    if (!uniques.length) return m;
    const { data, error } = await sb.storage.from(SEAU).createSignedUrls(uniques, DUREE_LIEN);
    if (error) throw error;
    const quand = Date.now();
    (data || []).forEach(x => { if (x && x.signedUrl && !x.error) m.set(x.path, { url: x.signedUrl, quand }); });
    return m;
  }
  async function signerUn(chemin) {
    const { data, error } = await sb.storage.from(SEAU).createSignedUrl(chemin, DUREE_LIEN);
    if (error) throw error;
    E.liens.set(chemin, { url: data.signedUrl, quand: Date.now() });
    return data.signedUrl;
  }
  const lienFrais = chemin => { const l = E.liens.get(chemin); return l && Date.now() - l.quand < (DUREE_LIEN - 300) * 1000 ? l : null; };

  // ================================================================================================ le cadre et les routes
  function coquille() {
    $('#app').innerHTML = `<header class="tete"><div class="tete-in">
        <a class="marque" href="#/saison"><span class="pieuvre" data-pieuvre aria-hidden="true"></span><span class="marque-nom">Crescite</span> <span class="marque-sous">équipe</span></a>
        <p class="qui"><span class="qui-nom">${esc(nomDe(E.personne))}</span> <button type="button" class="btn petit discret" data-sortir>Déconnexion</button></p>
        <nav class="onglets" aria-label="Rubriques"><a href="#/saison">Ma saison</a> <a href="#/documents">Mes documents</a> <a href="#/fiche">Ma fiche</a></nav>
      </div></header>
      <div class="bandeau-etat" id="bandeau-etat"></div>
      <main id="contenu" tabindex="-1"></main>`;
    tt('pieuvre');
  }
  function afficher(rubrique, titre, html, { focus = false, sousPage = false } = {}) {
    $$('.onglets a').forEach(a => { if (a.getAttribute('href') === '#/' + rubrique) a.setAttribute('aria-current', sousPage ? 'true' : 'page'); else a.removeAttribute('aria-current'); });
    $('#contenu').innerHTML = html;
    document.title = `${titre} · Crescite équipe`;
    bandeauEtat();
    if (focus) { window.scrollTo(0, 0); const h = $('#contenu h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
  }
  function bandeauEtat() {
    const el = $('#bandeau-etat');
    if (!el) return;
    el.innerHTML = E.provisoire && !E.horsLigne ? '<p class="attente" role="status">Mise à jour en cours…</p>' : E.horsLigne ? `<p class="message horsligne" role="status"><span>Hors connexion : voici votre espace tel qu’il était ${esc(momentTexte(E.horsLigne))}. La fiche et les documents demandent le réseau${E.sansSession ? ' ; la connexion se renouvellera dès son retour' : ''}.</span>
      <button type="button" class="lien-btn" data-reessayer>Réessayer</button></p>` : '';
  }

  function router(o = {}) {
    if (!E.pret) return;
    const h = location.hash, mf = h.match(/^#\/feuille\/(\d+)$/);
    const k = mf ? 'feuille' : (h.match(/^#\/(saison|documents|fiche)$/) || [])[1];
    if (!k) { history.replaceState(null, '', '#/saison'); return router(o); }
    if (E.vue === 'fiche' && k !== 'fiche' && E.ficheSale && !o.rafraichir) {
      if (!confirm('Vos modifications de fiche ne sont pas enregistrées. Les abandonner ?')) { history.replaceState(null, '', '#/fiche'); return; }
      E.ficheSale = false;
    }
    const focus = !o.arrivee && !o.rafraichir;
    if (k !== 'saison' && k !== 'feuille') E.retour = null;
    E.vue = k;
    if (k === 'saison') vueSaison(focus);
    else if (k === 'documents') vueDocuments(focus);
    else if (k === 'fiche') vueFiche(focus);
    else return vueFeuille(Number(mf[1]), focus);
  }
  window.addEventListener('hashchange', () => router());
  window.addEventListener('beforeunload', e => { if (E.ficheSale) { e.preventDefault(); e.returnValue = ''; } });

  // ================================================================================================ ma saison
  const ETATS = { option: 'Option, pas encore confirmée', annulee: 'Annulée', reportee: 'Reportée' };
  const PUBLICS = { scolaire: 'scolaire', tout_public: 'tout public', mixte: 'tout public et scolaire', autre: '' };
  const vivante = d => d.statut !== 'annulee' && d.statut !== 'reportee';

  // ce qui part dans l'agenda : chaque représentation à venir, et les dates à venir dont les représentations ne sont pas détaillées
  // ce qui part dans l'agenda : chaque représentation à venir à heure dite ; celles sans heure, un même jour pour un même public,
  // en un seul événement sur la journée ; et les dates à venir dont les représentations ne sont pas détaillées
  function evenementsAVenir() {
    const auj = aujourdhui(), out = [];
    for (const d of E.dates) {
      if (!vivante(d) || finDe(d) < auj || d.precision === 'mois' || d.precision === 'saison') continue;
      if (!d.representations.length) { out.push({ d, r: null, n: 0 }); continue; }
      const journees = new Map();
      for (const r of d.representations.filter(x => !x.annulee && x.jour >= auj)) {
        if (r.heure) { out.push({ d, r, n: 1 }); continue; }
        const k = `${r.jour}|${r.public}`;
        if (journees.has(k)) journees.get(k).n++; else { const x = { d, r, n: 1 }; journees.set(k, x); out.push(x); }
      }
    }
    return out;
  }
  // « représentation scolaire », « tout public », « 2 représentations scolaires »
  const quoiRep = (n, pub) => (n > 1 ? `${n} représentations${pub === 'scolaire' ? ' scolaires' : pub === 'tout_public' ? ' tout public' : ''}`
    : pub === 'scolaire' ? 'représentation scolaire' : pub === 'tout_public' ? 'tout public' : 'représentation');

  function vueSaison(focus) {
    const auj = aujourdhui();
    const avenir = E.dates.filter(d => finDe(d) >= auj), passees = E.dates.filter(d => finDe(d) < auj);
    const vivantes = avenir.filter(vivante);
    const prochaine = vivantes.find(d => d.precision === 'jour' || d.precision === 'periode') || null;
    const suite = avenir.filter(d => d !== prochaine);
    const evs = evenementsAVenir(), nbReps = evs.reduce((n, x) => n + x.n, 0), sansHeure = evs.filter(x => !x.r).length;
    const resume = [nomDe(E.personne), `saison ${saisonDe(auj)}`,
      vivantes.length ? `${pluriel(vivantes.length, 'date')} à venir${nbReps ? `, ${pluriel(nbReps, 'représentation')}` : ''}` : 'aucune date à venir'].filter(Boolean).join(' · ');
    const quoi = [nbReps && (nbReps > 1 ? `vos ${pluriel(nbReps, 'représentation')} à venir` : 'votre représentation à venir'),
      sansHeure && (sansHeure > 1 ? `${pluriel(sansHeure, 'date')} sans horaire` : 'une date sans horaire')].filter(Boolean).join(' et ');
    let html = `<div class="titre-vue"><h1>Ma saison</h1><p class="sous">${esc(resume)}</p></div>`;
    if (!E.dates.length) html += '<p class="vide">Aucune date dans votre tournée pour l’instant. Dès que l’administration vous inscrira sur une date, elle apparaîtra ici.</p>';
    if (prochaine) html += `<h2 class="sr">Prochaine date</h2>${billet(prochaine, { prochain: true })}`;
    if (avenir.length) html += `<div class="agenda"><button type="button" class="btn" id="b-agenda"${evs.length ? '' : ' disabled'}>${ICONES.agenda}Ajouter à mon agenda</button>
      <p class="aide">${evs.length ? `${esc(majuscule(quoi))}, avec le lieu et l’adresse, en un fichier .ics pour votre téléphone ou votre messagerie.` : 'Aucune représentation à venir à ajouter pour l’instant.'}</p></div>`;
    if (suite.length) html += `<h2 class="titre-section">${prochaine ? 'Ensuite' : 'À venir'}</h2>${parMois(suite)}`;
    else if (E.dates.length && !avenir.length) html += '<p class="vide">Aucune date à venir pour l’instant.</p>';
    if (passees.length) html += `<h2 class="titre-section">Dates passées</h2><div class="saisons">${saisonsPassees(passees)}</div>`;
    html += piedVue();
    afficher('saison', 'Ma saison', html, { focus: focus && !E.retour });
    if (E.retour) revenirA(E.retour);
  }

  function parMois(dates) {
    let mois = '', html = '';
    for (const d of dates) {
      const m = d.precision === 'saison' ? `Saison ${d.saison}` : moisTexte(d.debut);
      if (m !== mois) { html += `${mois ? '</div>' : ''}<p class="mois">${esc(m)}</p><div class="pile">`; mois = m; }
      html += billet(d);
    }
    return html + (mois ? '</div>' : '');
  }

  function saisonsPassees(passees) {
    const parSaison = new Map();
    passees.forEach(d => { const s = d.saison || saisonDe(d.debut); if (!parSaison.has(s)) parSaison.set(s, []); parSaison.get(s).push(d); });
    const actuelle = saisonDe(aujourdhui());
    return [...parSaison.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([s, ds]) => {
      const reps = ds.filter(vivante).reduce((n, d) => n + (d.representations.length ? d.representations.filter(r => !r.annulee).length : (d.nb_representations || 0)), 0);
      const compte = [s === actuelle && 'en cours', pluriel(ds.length, s === actuelle ? 'date passée' : 'date', s === actuelle ? 'dates passées' : 'dates'), reps && pluriel(reps, 'représentation')].filter(Boolean).join(' · ');
      return `<details class="saison" data-saison="${esc(s)}"><summary><span class="s-texte"><span class="s-nom">Saison ${esc(s)}</span> <span class="s-compte">${compte}</span></span></summary><div class="saison-corps"></div></details>`;
    }).join('');
  }
  // une saison passée se dessine à l'ouverture
  function remplirSaison(det) {
    const corps = $('.saison-corps', det);
    if (!corps || corps.childElementCount) return;
    const s = det.dataset.saison, auj = aujourdhui();
    const ds = E.dates.filter(d => finDe(d) < auj && (d.saison || saisonDe(d.debut)) === s).reverse();
    corps.innerHTML = ds.map(d => billet(d, { passee: true })).join('');
  }
  document.addEventListener('toggle', e => { if (e.target.matches?.('details.saison') && e.target.open) remplirSaison(e.target); }, true);

  // au retour d'une feuille de route : la date reprend sa place, son lien « Lire » le focus
  function revenirA(id) {
    E.retour = null;
    let el = document.getElementById('billet-' + id);
    if (!el) {
      const d = E.dates.find(x => x.id === id), det = d && $(`details.saison[data-saison="${CSS.escape(d.saison || saisonDe(d.debut))}"]`);
      if (det) { det.open = true; remplirSaison(det); el = document.getElementById('billet-' + id); }
    }
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    ($('a[href^="#/feuille/"]', el) || el).focus({ preventScroll: true });
  }

  function decompte(d) {
    if (d.precision === 'mois' || d.precision === 'saison') return '';
    const auj = aujourdhui(), now = new Date(), minutes = now.getHours() * 60 + now.getMinutes();
    const r = d.representations.filter(x => !x.annulee)
      .find(x => x.jour > auj || (x.jour === auj && (!x.heure || +x.heure.slice(0, 2) * 60 + +x.heure.slice(3, 5) >= minutes - 120)));
    const jour = r ? r.jour : (d.debut > auj ? d.debut : auj);
    const n = ecartJours(auj, jour);
    if (n <= 0) {
      if (!r) return d.debut < auj ? 'en cours' : 'aujourd’hui';
      if (!r.heure) return 'aujourd’hui';
      const h = +r.heure.slice(0, 2);
      return h >= 18 ? 'ce soir' : h >= 12 ? 'cet après-midi' : 'ce matin';
    }
    if (n === 1) return 'demain';
    if (n === 2) return 'après-demain';
    if (n < 14) return `dans ${n} jours`;
    if (n < 60) return `dans ${Math.round(n / 7)} semaines`;
    const m = Math.round(n / 30.44);
    return `dans ${m} mois`;
  }

  function quandTexte(d) {
    const jours = [...new Set(d.representations.map(r => r.jour))].sort();
    if (d.precision === 'saison') return `saison ${d.saison}, dates à préciser`;
    if (d.precision === 'mois') return `${moisTexte(d.debut)}, jours à préciser`;
    if (jours.length === 1 || (!jours.length && (d.fin || d.debut) === d.debut)) return jourLong(jours[0] || d.debut);
    if (AG) return AG.quand(d, jours);
    const a = jours[0] || d.debut, b = jours[jours.length - 1] || d.fin || d.debut;
    return `du ${jourLong(a)} au ${jourLong(b)}`;
  }

  // un billet : en haut la date (le spectacle, les jours, l'état, les horaires, le lieu) ; sous la perforation, la feuille de
  // route et le détail (l'adresse et l'itinéraire, qui part, les documents) : déplié pour la prochaine date, d'un geste pour
  // les autres. Une date annulée ou reportée garde l'essentiel.
  function billet(d, { prochain = false, passee = false } = {}) {
    const sp = d.spectacle || {}, quand = quandTexte(d), etat = ETATS[d.statut], vive = vivante(d);
    const cls = ['billet', prochain && 'prochain', passee && 'passee', etat && d.statut].filter(Boolean).join(' ');
    const precisions = (Array.isArray(d.details) ? d.details : []).filter(x => x && x.texte);
    const detail = vive ? [blocAdresse(d, !passee), blocEquipe(d, passee), !passee && (prochain || !d.feuille) ? blocFeuille(d) : '', passee ? '' : blocDocuments(d)].join('') : '';
    const feuille = prochain ? '' : feuilleCourte(d);
    let bas = '';
    if (prochain) bas = detail ? `<div class="billet-bas">${detail}</div>` : '';
    else if (feuille || detail) {
      const ouvert = E.deplies.has(d.id);
      bas = `<div class="billet-pied">${feuille}${detail ? `<button type="button" class="deplier" aria-expanded="${ouvert}" aria-controls="bd-${d.id}" data-libelle="${passee ? 'Lieu et équipe' : 'Adresse, équipe et documents'}"><span class="deplier-lib">${ouvert ? 'Replier' : passee ? 'Lieu et équipe' : 'Adresse, équipe et documents'}</span><span class="sr"> : ${esc(sp.titre || '')}, ${esc(quand)}</span></button>` : ''}</div>
        ${detail ? `<div class="billet-bas" id="bd-${d.id}"${ouvert ? '' : ' hidden'}>${detail}</div>` : ''}`;
    }
    return `<article class="${cls}" id="billet-${d.id}" style="${styleU(sp)}" aria-labelledby="bt-${d.id}">
      ${prochain ? `<div class="bandeau"><span class="bandeau-lib">Prochaine date</span> <span class="decompte">${esc(decompte(d))}</span></div>` : ''}
      <div class="billet-haut">
        <h3 class="billet-titre" id="bt-${d.id}"><span class="billet-spectacle">${esc(sp.titre || 'Spectacle')}</span> <span class="billet-quand">${esc(majuscule(quand))}</span></h3>
        ${etat ? `<p class="etat ${d.statut}">${etat}</p>` : ''}
        ${horaires(d)}
        ${lieuCourt(d)}
        ${precisions.length ? `<ul class="precisions">${precisions.map(x => { const u = x.lien && urlSure(x.lien); return `<li>${u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(x.texte)}<span class="sr"> (page du lieu, nouvel onglet)</span></a>` : esc(x.texte)}</li>`; }).join('')}</ul>` : ''}
      </div>
      ${bas ? `<div class="perfo" aria-hidden="true"></div>${bas}` : ''}
    </article>`;
  }

  function horaires(d) {
    const reps = d.representations;
    if (!reps.length) {
      const n = d.nb_representations;
      return `<p class="sans-horaire">${n ? `${pluriel(n, 'représentation')} · ` : ''}horaires pas encore indiqués</p>`;
    }
    // une ligne par représentation à heure dite ; celles sans heure, le même jour, pour le même public, se comptent ensemble
    const lignes = [];
    for (const r of reps) {
      const l = !r.heure && lignes.find(x => !x.heure && x.jour === r.jour && x.public === r.public && x.annulee === r.annulee && !x.note && !r.note);
      if (l) l.n++; else lignes.push({ ...r, n: 1 });
    }
    const plusieursJours = new Set(reps.map(r => r.jour)).size > 1;
    return `<ul class="horaires${plusieursJours ? ' jours' : ''}" aria-label="Représentations">${lignes.map((r, i) => `<li${r.annulee || !r.heure ? ` class="${[r.annulee && 'annulee', !r.heure && 'sans-heure'].filter(Boolean).join(' ')}"` : ''}>
        ${plusieursJours ? `<span class="h-jour">${i && lignes[i - 1].jour === r.jour ? `<span class="sr">${esc(jourCourt(r.jour))}</span>` : esc(jourCourt(r.jour))}</span>` : ''}
        ${r.heure ? `<span class="heure">${esc(heureTexte(r.heure))}</span>` : `<span class="heure vague">${r.n > 1 ? `${r.n}\u00a0représentations, heures à préciser` : 'heure à préciser'}</span>`}
        <span class="h-plus">${[PUBLICS[r.public] && `<span class="public${r.public === 'scolaire' ? ' sco' : ''}">${PUBLICS[r.public]}</span>`,
          r.annulee && `<span class="etat annulee">${r.n > 1 ? 'annulées' : 'annulée'}</span>`, r.note && `<span class="note">${esc(r.note)}</span>`].filter(Boolean).join(' ')}</span></li>`).join('')}</ul>`;
  }

  const sansAccent = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const contientMot = (texte, mot) => !!mot && new RegExp(`(^|[^a-z0-9])${sansAccent(mot).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).test(sansAccent(texte));
  const urlSure = u => { try { const x = new URL(u, location.href); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; } };
  function itineraire(l) {
    if (l.latitude != null && l.longitude != null && Number.isFinite(+l.latitude) && Number.isFinite(+l.longitude)) return `https://www.google.com/maps/dir/?api=1&destination=${+l.latitude},${+l.longitude}`;
    const q = [l.nom, l.adresse, l.commune].filter(Boolean).join(', ');
    return q ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}` : '';
  }
  const communeDe = l => `${l.commune}${l.departement ? `\u00a0(${l.departement})` : ''}`;
  function lieuCourt(d) {
    const l = d.lieu;
    let t;
    if (l && l.nom && contientMot(l.nom, l.commune)) t = `<b>${esc(l.nom)}</b>${l.departement ? `\u00a0(${esc(l.departement)})` : ''}`;
    else if (l) t = `<b>${esc(l.nom || communeDe(l))}</b>${l.nom ? ` · ${esc(communeDe(l))}` : ''}`;
    else {
      const ou = d.intitule && d.intitule.includes(' — ') ? d.intitule.split(' — ').pop() : '';
      t = ou ? `<b>${esc(ou)}</b> · <span class="vague">salle à préciser</span>` : '<span class="vague">lieu à préciser</span>';
    }
    return `<p class="billet-ou">${ICONES.route}<span><span class="sr">Lieu : </span>${t}</span></p>`;
  }
  // l'adresse (la commune n'est pas répétée si l'adresse la donne), l'itinéraire et le site du lieu
  function blocAdresse(d, avecCarte = true) {
    const l = d.lieu;
    if (!l) return '';
    const lignes = l.adresse ? [l.adresse, contientMot(l.adresse, l.commune) ? '' : communeDe(l)].filter(Boolean) : [];
    const carte = avecCarte ? itineraire(l) : '', site = avecCarte && l.site_web ? urlSure(l.site_web) : '', nom = l.nom || communeDe(l);
    if (!lignes.length && !carte && !site) return '';
    return `<div class="rubrique r-adresse"><h4>${lignes.length ? 'Adresse' : 'Y aller'}</h4>
      ${lignes.length ? `<p class="lieu-adresse">${lignes.map(esc).join('<br>')}</p>` : ''}
      ${carte || site ? `<p class="liens">${carte ? `<a class="btn petit" href="${esc(carte)}" target="_blank" rel="noopener">${ICONES.route}Itinéraire<span class="sr"> jusqu’à ${esc(nom)}, sur une carte, dans un nouvel onglet</span></a>` : ''}
        ${site ? `<a href="${esc(site)}" target="_blank" rel="noopener">Site du lieu<span class="sr"> (nouvel onglet)</span></a>` : ''}</p>` : ''}
    </div>`;
  }

  // qui part sur une date : la distribution « en tournée » du spectacle, moins les absents de la date, plus ses renforts
  const RANG = { jeu: 0, technique: 1, creation: 2, production: 3 };
  const CATEGORIES = { jeu: 'jeu', technique: 'technique', creation: 'création', production: 'production' };
  function quiPart(d) {
    const sp = d.spectacle?.id, eq = E.equipes.filter(e => Number(e.date_id) === d.id);
    const absents = new Set(eq.filter(e => !e.present).map(e => e.personne_id));
    const gens = new Map();
    const ajouter = (id, personne, fonction, note) => {
      if (!gens.has(id)) gens.set(id, { id, nom: nomDe(personne), fonctions: [], notes: [] });
      const g = gens.get(id);
      if (!g.nom) g.nom = nomDe(personne);
      if (fonction && !g.fonctions.includes(fonction)) g.fonctions.push(fonction);
      if (note) g.notes.push(note);
    };
    E.distributions.filter(x => x.spectacle_id === sp && x.en_tournee && !absents.has(x.personne_id))
      .sort((a, b) => (RANG[a.categorie] ?? 9) - (RANG[b.categorie] ?? 9) || a.ordre - b.ordre)
      .forEach(x => ajouter(x.personne_id, x.personne, x.categorie === 'jeu' ? (x.role ? `jeu (${x.role})` : 'jeu') : (x.fonction || CATEGORIES[x.categorie])));
    eq.filter(e => e.present).forEach(e => ajouter(e.personne_id, e.personne, e.fonction, e.note));
    return [...gens.values()];
  }
  function blocEquipe(d, passee = false) {
    const gens = quiPart(d), titre = passee ? 'L’équipe' : 'Qui part';
    if (!gens.length) return `<div class="rubrique r-equipe"><h4>${titre}</h4><p class="vide-petit">L’équipe de cette date n’est ${passee ? 'pas' : 'pas encore'} indiquée.</p></div>`;
    return `<div class="rubrique r-equipe"><h4>${titre} <span class="compte-nb">· ${gens.length}</span></h4><ul class="gens">${gens.map(g => `<li>
        <span class="g-nom">${esc(g.nom || 'Une personne de l’équipe')}</span>${g.id === E.moi ? ' <span class="vous">vous</span>' : ''}
        ${g.fonctions.length ? `<span class="g-fonction">${esc(g.fonctions.join(', '))}</span>` : ''} ${g.notes.length ? `<span class="g-note">${esc(g.notes.join(' ; '))}</span>` : ''}</li>`).join('')}</ul></div>`;
  }

  function blocFeuille(d) {
    if (!d.feuille) return '<div class="rubrique"><h4>Feuille de route</h4><p class="vide-petit">Pas encore publiée.</p></div>';
    const f = d.feuille, titre = d.spectacle?.titre || '', jour = quandTexte(d);
    const version = `Version ${f.version || 1}${f.publiee_le ? `, publiée ${momentTexte(f.publiee_le)}` : ''}`;
    if (!outilFeuille()) return `<div class="rubrique"><h4>Feuille de route</h4><p class="f-version">${esc(version)}</p>
      <p class="vide-petit">Elle ne peut pas s’afficher ici pour le moment : l’outil des feuilles de route n’a pas pu être chargé. Rechargez la page.</p></div>`;
    return `<div class="rubrique"><h4>Feuille de route</h4><p class="f-version">${esc(version)}</p>
      <p class="liens"><a class="btn petit principal" href="#/feuille/${d.id}">${ICONES.lire}Lire<span class="sr"> la feuille de route de ${esc(titre)}, ${esc(jour)}</span></a>
      <button type="button" class="btn petit" data-pdf="${d.id}">${ICONES.pdf}PDF<span class="sr"> de la feuille de route de ${esc(titre)}, ${esc(jour)}</span></button></p></div>`;
  }

  function feuilleCourte(d) {
    if (!d.feuille) return '';
    const f = d.feuille, titre = d.spectacle?.titre || '', jour = quandTexte(d);
    const lib = `<span class="f-lib">Feuille de route</span> <span class="f-version" title="${esc(`publiée ${momentTexte(f.publiee_le)}`)}">version ${f.version || 1}</span>`;
    if (!outilFeuille()) return `<p class="f-court">${lib} <span class="vide-petit">L’outil qui l’affiche n’a pas pu être chargé : rechargez la page.</span></p>`;
    return `<p class="f-court">${lib} <a class="btn petit principal" href="#/feuille/${d.id}">${ICONES.lire}Lire<span class="sr"> la feuille de route de ${esc(titre)}, ${esc(jour)}</span></a>
      <button type="button" class="btn petit" data-pdf="${d.id}">${ICONES.pdf}PDF<span class="sr"> de la feuille de route de ${esc(titre)}, ${esc(jour)}</span></button></p>`;
  }

  const TYPES = { texte: 'Le texte', dossier: 'Le dossier', fiche_technique: 'La fiche technique', plan: 'Le plan' };
  const TYPES_COURTS = { texte: 'Texte', dossier: 'Dossier', fiche_technique: 'Fiche technique', plan: 'Plan', autre: 'Document' };
  const documentsDe = id => E.documents.filter(x => x.spectacle_id === id);
  function blocDocuments(d) {
    const xs = documentsDe(d.spectacle?.id);
    if (!xs.length) return '';
    const libelle = x => (TYPES[x.type] && xs.filter(y => y.type === x.type).length === 1 ? TYPES[x.type] : x.titre);
    return `<div class="rubrique"><h4>Documents</h4><ul class="puces-docs">${xs.map(x => `<li>${lienDocument(x, `${x.url && !x.fichier ? ICONES.lien : ICONES.doc}<span>${esc(libelle(x))}</span>`, 'puce-doc', libelle(x) !== x.titre ? x.titre : '')}</li>`).join('')}</ul></div>`;
  }
  // un document : un lien signé (fichier du stockage privé), un lien direct, ou un bouton qui demande le lien au clic
  function lienDocument(x, interieur, cls, titre = '') {
    const t = titre ? ` title="${esc(titre)}"` : '';
    if (x.fichier) {
      const l = E.liens.get(x.fichier);
      if (l) return `<a class="${cls}" href="${esc(l.url)}" target="_blank" rel="noopener" data-fichier="${esc(x.fichier)}"${t}>${interieur}<span class="sr"> (s’ouvre dans un nouvel onglet)</span></a>`;
      return `<button type="button" class="${cls}" data-fichier="${esc(x.fichier)}"${t}>${interieur}<span class="sr"> (s’ouvre dans un nouvel onglet)</span></button>`;
    }
    const u = urlSure(x.url);
    if (u) return `<a class="${cls}" href="${esc(u)}" target="_blank" rel="noopener noreferrer"${t}>${interieur}<span class="sr"> (lien externe, nouvel onglet)</span></a>`;
    return `<span class="${cls}">${interieur}</span>`;
  }

  function piedVue() {
    if (!E.chargeLe) return '';
    const jour = new Date(E.chargeLe).toDateString() === new Date().toDateString() ? `à ${heureCourte(E.chargeLe)}` : momentTexte(E.chargeLe);
    return `<p class="pied-vue">${E.horsLigne ? 'Lu' : 'Mis à jour'} ${esc(jour)} · <button type="button" class="lien-btn" data-reessayer>Actualiser</button></p>`;
  }

  // ================================================================================================ mes documents
  function vueDocuments(focus) {
    const auj = aujourdhui();
    const prochain = id => { const d = E.dates.find(x => x.spectacle?.id === id && finDe(x) >= auj && vivante(x)); return d ? d.debut : '9999'; };
    const ids = [...new Set(E.documents.filter(x => x.spectacle_id != null).map(x => x.spectacle_id))]
      .sort((a, b) => prochain(a).localeCompare(prochain(b)) || String(E.spectacles.get(a)?.titre || '').localeCompare(String(E.spectacles.get(b)?.titre || ''), 'fr'));
    const groupes = ids.map(id => ({ id: String(id), sp: E.spectacles.get(id) || { titre: 'Spectacle' }, docs: documentsDe(id) }));
    const compagnie = E.documents.filter(x => x.spectacle_id == null);
    if (compagnie.length) groupes.push({ id: 'compagnie', sp: null, docs: compagnie });
    let html = `<div class="titre-vue"><h1>Mes documents</h1><p class="sous">Le texte, les dossiers et les fiches techniques de vos spectacles, et les documents de toute la compagnie.</p></div>`;
    if (E.erreurLiens) html += `<p class="message erreur" role="alert">Les fichiers ne peuvent pas s’ouvrir d’ici pour le moment (${esc(motsErreur(E.erreurLiens))}). Chacun sera redemandé quand vous l’ouvrirez.</p>`;
    if (!groupes.length) html += '<p class="vide">Aucun document pour l’instant. L’administration les ajoute au fil de la saison : le texte, le dossier, la fiche technique…</p>';
    html += groupes.map(g => `<section class="groupe-docs" style="${g.sp ? styleU(g.sp) : '--u:#a3306b;--u-fond:#f5e4ec;--u-texte:#a3306b'}" aria-labelledby="g-${g.id}">
        <div class="groupe-tete"><span class="pastille" aria-hidden="true"></span><h2 id="g-${g.id}">${esc(g.sp ? g.sp.titre : 'Toute la compagnie')}</h2> <span class="compte-nb">${pluriel(g.docs.length, 'document')}</span></div>
        <ul class="liste-docs">${g.docs.map(x => `<li>${ligneDocument(x)}</li>`).join('')}</ul></section>`).join('');
    html += piedVue();
    afficher('documents', 'Mes documents', html, { focus });
  }
  function ligneDocument(x) {
    const ext = x.fichier ? (x.fichier.split('.').pop() || '').toUpperCase() : '';
    let source = 'Fichier';
    if (x.fichier) source = /^[A-Z0-9]{2,4}$/.test(ext) ? ext : 'Fichier';
    else { try { source = new URL(x.url).hostname.replace(/^www\./, '') + ' ↗'; } catch (e) { source = 'Lien'; } }
    return lienDocument(x, `${x.url && !x.fichier ? ICONES.lien : ICONES.doc}<span class="doc-texte"><span class="doc-type">${esc(TYPES_COURTS[x.type] || 'Document')}</span>
      <span class="doc-titre">${esc(x.titre)}</span></span> <span class="doc-src">${esc(source)}</span>`, 'doc');
  }

  // ================================================================================================ ma fiche
  const CHAMPS = [
    ['telephone', 'Téléphone', 'tel', 'tel', 'Le numéro où l’équipe et l’administration vous joignent en tournée.'],
    ['ville', 'Ville de départ', 'text', 'address-level2', 'D’où vous partez en tournée : pour les trajets et les défraiements.'],
    ['regime', 'Régime alimentaire', 'long', 'off', 'Ce que l’accueil doit savoir pour les repas : végétarien, allergies, sans porc…'],
    ['urgence', 'En cas d’urgence', 'long', 'off', 'Qui prévenir : son nom, son lien avec vous, son téléphone.'],
  ];
  const valeursFiche = () => Object.fromEntries(CHAMPS.map(([k]) => { const v = ($('#f-' + k)?.value || '').trim(); return [k, v || null]; }));
  function vueFiche(focus) {
    const p = E.personne || {}, v = E.privee || {}, mel = E.session?.user?.email || v.email || sessionGardee()?.user?.email || '';
    const roles = new Map();
    E.distributions.filter(x => x.personne_id === E.moi).forEach(x => {
      const f = x.categorie === 'jeu' ? (x.role ? `jeu (${x.role})` : 'jeu') : (x.fonction || CATEGORIES[x.categorie]);
      if (!roles.has(x.spectacle_id)) roles.set(x.spectacle_id, []);
      if (!roles.get(x.spectacle_id).includes(f)) roles.get(x.spectacle_id).push(f);
    });
    const horsLigne = !E.privee;
    let html = `<div class="titre-vue"><h1>Ma fiche</h1><p class="sous">Vos coordonnées ne sont lues que par vous et par l’administration de la compagnie.</p></div>
      <section class="carte identite" aria-label="Identité">
        <p class="nom">${esc(nomDe(p) || 'Votre fiche')}</p>
        ${p.metiers?.length ? `<p class="metiers">${esc(p.metiers.join(', '))}</p>` : ''}
        ${roles.size ? `<ul class="roles" aria-label="Dans l’équipe de">${[...roles.entries()].map(([id, fs]) => { const sp = E.spectacles.get(id) || {}; return `<li style="${styleU(sp)}"><span class="pastille" aria-hidden="true"></span><span><b>${esc(sp.titre || 'Spectacle')}</b> · ${esc(fs.join(', '))}</span></li>`; }).join('')}</ul>` : ''}
        <dl class="compte-mel"><dt>Adresse du compte</dt><dd>${esc(mel)}</dd></dl>
        <p class="aide" style="margin-top:8px">Pour changer l’adresse du compte ou votre nom, écrivez à l’administration.</p>
      </section>`;
    if (horsLigne) html += `<section class="carte"><h2>Mes coordonnées</h2>${E.provisoire && !E.horsLigne ? '<p class="chargement" role="status">Lecture de vos coordonnées…</p>'
      : '<p class="message horsligne" role="status">Vos coordonnées se lisent et s’enregistrent en ligne : reconnectez-vous au réseau, puis actualisez.</p>'}</section>`;
    else html += `<form class="carte" id="f-fiche" novalidate aria-labelledby="t-coord"><h2 id="t-coord">Mes coordonnées</h2>
        <p class="intro">Elles servent aux feuilles de route, aux réservations et aux repas.</p>
        <div class="deux-champs">${CHAMPS.slice(0, 2).map(champFiche).join('')}</div>${CHAMPS.slice(2).map(champFiche).join('')}
        <div class="pied-form"><button type="submit" class="btn principal">Enregistrer</button><p class="etat-form" id="etat-fiche" role="status">Tout est enregistré.</p></div>
      </form>`;
    html += `<form class="carte" id="f-motdepasse" novalidate aria-labelledby="t-mdp"><h2 id="t-mdp">Mot de passe</h2>
        <p class="intro">Pour vous connecter sans attendre de lien par courriel.</p>
        <input type="email" name="email" autocomplete="username" value="${esc(mel)}" class="sr" tabindex="-1" aria-hidden="true" readonly>
        <div class="deux-champs"><div class="champ"><label for="p-mdp">Nouveau mot de passe</label><div class="mdp"><input id="p-mdp" type="password" autocomplete="new-password" minlength="8" aria-describedby="p-aide"><button type="button" class="voir" aria-pressed="false" aria-controls="p-mdp">Afficher</button></div><p class="aide" id="p-aide">Huit caractères au moins.</p></div>
        <div class="champ"><label for="p-mdp2">Le même, une seconde fois</label><input id="p-mdp2" type="password" autocomplete="new-password"></div></div>
        <div class="pied-form"><button type="submit" class="btn">Changer le mot de passe</button><p class="etat-form" id="etat-mdp" role="status"></p></div>
      </form>
      <section class="carte" aria-labelledby="t-sortir"><h2 id="t-sortir">Se déconnecter</h2><p class="intro">Ferme la session sur cet appareil. Vos autres appareils restent connectés.</p>
        <p><button type="button" class="btn" data-sortir>Se déconnecter</button></p></section>`;
    afficher('fiche', 'Ma fiche', html, { focus });
    E.ficheSale = false;
    const f = $('#f-fiche');
    if (f) {
      const etat = $('#etat-fiche');
      f.addEventListener('input', () => {
        const avant = E.privee || {}, apres = valeursFiche();
        E.ficheSale = CHAMPS.some(([k]) => (avant[k] || null) !== apres[k]);
        etat.className = 'etat-form' + (E.ficheSale ? ' sale' : '');
        etat.textContent = E.ficheSale ? 'Modifications non enregistrées.' : 'Tout est enregistré.';
      });
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const valeurs = valeursFiche(), b = $('button[type=submit]', f);
        if (valeurs.telephone && !/^[+()\d\s.\-/]{6,}$/.test(valeurs.telephone)) return erreurChamp($('#f-telephone'), 'Ce numéro de téléphone n’a pas l’air complet : des chiffres, des espaces, éventuellement un + au début.');
        effacerErreur($('#f-telephone'));
        const r = await occupe(b, 'Enregistrement…', () => sb.from('crescite_personnes_privees').update(valeurs).eq('personne_id', E.moi).select('personne_id, email, telephone, ville, regime, urgence'));
        if (r.error || !r.data || !r.data.length) {
          etat.className = 'etat-form sale'; etat.textContent = 'Modifications non enregistrées.';
          return dire(appendMsg(f), `Votre fiche n’a pas été enregistrée : ${r.error ? esc(motsErreur(r.error)) : 'la base ne l’a pas trouvée pour votre compte. Prévenez l’administration'}.`);
        }
        E.privee = r.data[0]; E.ficheSale = false;
        appendMsg(f).innerHTML = '';
        etat.className = 'etat-form ok'; etat.textContent = `Enregistré à ${heureCourte(Date.now())}.`;
        requestAnimationFrame(() => tt('confirmer', b));
      });
    }
    const fm = $('#f-motdepasse'), a = $('#p-mdp'), b2 = $('#p-mdp2');
    [a, b2].forEach(i => i.addEventListener('input', () => effacerErreur(i)));
    fm.addEventListener('submit', async e => {
      e.preventDefault();
      const etat = $('#etat-mdp');
      if (a.value.length < 8) return erreurChamp(a, 'Le mot de passe doit compter au moins huit caractères.');
      if (a.value !== b2.value) return erreurChamp(b2, 'Les deux mots de passe ne sont pas identiques.');
      const { error } = await occupe($('button[type=submit]', fm), 'Enregistrement…', () => sb.auth.updateUser({ password: a.value }));
      if (error) { etat.className = 'etat-form'; etat.textContent = ''; return dire(appendMsg(fm), `Le mot de passe n’a pas été changé : ${esc(motsErreur(error))}.`); }
      a.value = b2.value = '';
      appendMsg(fm).innerHTML = '';
      etat.className = 'etat-form ok'; etat.textContent = 'Mot de passe changé.';
    });
    brancherVoir($('#contenu'));
  }
  function champFiche([k, lib, type, auto, aide]) {
    const v = (E.privee || {})[k] || '';
    const attrs = `id="f-${k}" name="${k}" autocomplete="${auto}" aria-describedby="f-${k}-aide"`;
    return `<div class="champ"><label for="f-${k}">${lib}</label>${type === 'long' ? `<textarea ${attrs} rows="2">${esc(v)}</textarea>`
      : `<input ${attrs} type="${type}"${type === 'tel' ? ' inputmode="tel"' : ''} value="${esc(v)}">`}<p class="aide" id="f-${k}-aide">${esc(aide)}</p></div>`;
  }
  // la zone des messages d'un formulaire, juste avant son pied
  function appendMsg(form) {
    let z = $('.msg-form', form);
    if (!z) { z = document.createElement('div'); z.className = 'msg-form'; $('.pied-form', form).before(z); }
    return z;
  }

  // ================================================================================================ la feuille de route
  // le contexte d'une feuille (FEUILLE.html, FEUILLE.pdf) : la date telle que la tournée la donne, et les documents que la
  // feuille peut citer. Un fichier y est un lien signé, encore bon, dans la page ; dans le PDF, qu'on garde des jours, un lien
  // vers « Mes documents », qui le signe de nouveau à l'ouverture.
  const contexte = (d, { pdf = false } = {}) => ({
    date: d, lieu: d.lieu || null, representations: d.representations,
    spectacle: { titre: d.spectacle?.titre || '', slug: d.spectacle?.slug || '', univers: d.spectacle?.univers || {}, duree: d.spectacle?.duree || '' },
    documents: E.documents.filter(x => x.spectacle_id == null || x.spectacle_id === d.spectacle?.id).map(x => ({ id: x.id, titre: x.titre,
      url: x.fichier ? (!pdf && lienFrais(x.fichier)?.url) || `${retourUrl()}#/documents` : urlSure(x.url) || null })),
  });
  async function chargerFeuille(id) {
    if (E.feuilles.has(id)) return E.feuilles.get(id);
    const { data, error } = await sb.from('crescite_feuilles').select('id, date_id, titre, contenu, statut, version, publiee_le').eq('date_id', id).eq('statut', 'publiee').maybeSingle();
    if (error) throw error;
    if (data) E.feuilles.set(id, data);
    return data;
  }
  // la feuille de route, lue dans la page : FEUILLE.html donne la feuille entière (son en-tête compris) ; la page y ajoute le
  // retour à la saison, la version et le PDF
  async function vueFeuille(id, focus) {
    const d = E.dates.find(x => x.id === id), ici = () => location.hash === `#/feuille/${id}`;
    const retour = '<p class="retour"><a href="#/saison" data-tt="retour">← Ma saison</a></p>';
    const titre = `Feuille de route${d?.spectacle?.titre ? ` · ${d.spectacle.titre}` : ''}`;
    const montrer = (html, f = focus) => afficher('saison', titre, html, { focus: f, sousPage: true });
    E.feuilleVue = null;
    if (!d) return montrer(`${retour}<div class="titre-vue"><h1>Feuille de route</h1></div><p class="message erreur" role="alert">Cette date n’est pas (ou plus) dans votre tournée.</p>`);
    E.retour = id;
    const sp = d.spectacle || {}, l = d.lieu;
    // sans la feuille elle-même (chargement, erreur) : son en-tête, dit par la page
    const tete = `${retour}<div class="feuille-tete" style="${styleU(sp)}"><p class="sur">Feuille de route</p><h1>${esc(sp.titre || 'Spectacle')}</h1>
      <p><b>${esc(majuscule(quandTexte(d)))}</b>${l ? ` · ${esc(l.nom || l.commune)}${l.nom ? `, ${esc(l.commune)}` : ''}` : ''}</p></div>`;
    let f = E.feuilles.get(id) || null;
    if (!f) {
      montrer(`${tete}<p class="chargement" role="status">Chargement de la feuille de route…</p>`, false);
      try { f = await chargerFeuille(id); } catch (e) {
        if (ici()) montrer(`${tete}<p class="message erreur" role="alert">La feuille de route n’a pas pu être lue : ${esc(motsErreur(e))}.</p>`);
        return;
      }
      if (!ici()) return;
    }
    if (!f) return montrer(`${tete}<p class="message erreur" role="alert">Cette feuille de route n’est pas (ou plus) publiée. L’administration la publiera dès qu’elle sera prête.</p>`);
    const version = `Version ${f.version || 1}${f.publiee_le ? `, publiée ${momentTexte(f.publiee_le)}` : ''}`;
    const F = outilFeuille();
    if (!F) return montrer(`${tete}<p class="message erreur" role="alert">Cette feuille de route est publiée (${esc(version.toLowerCase())}), mais elle ne peut pas s’afficher ici : l’outil des feuilles de route (../admin/feuille.js) n’a pas pu être chargé. Rechargez la page ; si rien ne change, prévenez l’administration.</p>`);
    let corps = '';
    try { corps = await F.html(f, contexte(d)); } catch (e) { console.error(e); }
    if (!ici()) return;
    E.feuilleVue = { id, version: f.version, publiee_le: f.publiee_le };
    const barre = `<div class="barre-feuille"><button type="button" class="btn principal" data-pdf="${d.id}">${ICONES.pdf}Télécharger le PDF</button><p class="f-version">${esc(version)}</p></div>`;
    if (!corps) return montrer(`${tete}${barre}<p class="message erreur" role="alert">La feuille de route n’a pas pu être mise en page ici. Le PDF reste à votre disposition.</p>`);
    // la feuille porte d'ordinaire son titre (h1) ; sinon, la page en donne un, pour les lecteurs d'écran
    const titrePage = /<h1[\s>]/i.test(corps) ? '' : `<h1 class="sr">Feuille de route : ${esc(sp.titre || '')}, ${esc(quandTexte(d))}</h1>`;
    montrer(`<div class="vue-feuille">${retour}${titrePage}${barre}<div class="feuille-cadre">${corps}</div></div>`);
    // les fichiers que la feuille cite : leur lien signé se redemande au clic s'il a vieilli
    const parUrl = new Map([...E.liens.entries()].map(([chemin, x]) => [x.url, chemin]));
    $$('.feuille-cadre a[href]').forEach(a => { const c = parUrl.get(a.href); if (c) a.dataset.fichier = c; });
  }

  async function telechargerPdf(bouton) {
    const id = Number(bouton.dataset.pdf), d = E.dates.find(x => x.id === id), F = outilFeuille();
    if (!d) return;
    if (!F || typeof F.telecharger !== 'function') return annoncer('Le PDF ne peut pas être préparé : l’outil des feuilles de route n’a pas pu être chargé. Rechargez la page.', { erreur: true });
    try {
      await occupe(bouton, 'Préparation du PDF…', async () => {
        const f = await chargerFeuille(id);
        if (!f) throw new Error('cette feuille de route n’est pas (ou plus) publiée');
        await F.telecharger(f, contexte(d, { pdf: true }));
      });
      annoncer('La feuille de route est téléchargée en PDF.');
    } catch (e) {
      console.error(e);
      annoncer(`Le PDF n’a pas pu être préparé : ${motsErreur(e)}.`, { erreur: true });
    }
  }

  // ================================================================================================ ajouter à mon agenda (.ics)
  const FUSEAU = ['BEGIN:VTIMEZONE', 'TZID:Europe/Paris', 'X-LIC-LOCATION:Europe/Paris',
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
    'END:VTIMEZONE'];
  const texteIcs = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  // une ligne de plus de 75 octets se plie (RFC 5545, 3.1), sans couper un caractère
  function plier(ligne) {
    const enc = new TextEncoder();
    if (enc.encode(ligne).length <= 75) return ligne;
    const morceaux = [];
    let cur = '', n = 0, max = 75;
    for (const c of ligne) {
      const k = enc.encode(c).length;
      if (n + k > max) { morceaux.push(cur); cur = ''; n = 0; max = 74; }
      cur += c; n += k;
    }
    morceaux.push(cur);
    return morceaux.join('\r\n ');
  }
  function dureeMinutes(t) {
    const s = String(t || '').toLowerCase();
    let m = s.match(/(\d+)\s*h\s*(\d{1,2})?/);
    if (m) return +m[1] * 60 + (+m[2] || 0);
    m = s.match(/(\d+)\s*min/);
    return m ? +m[1] : 0;
  }
  function plusMinutes(jour, heure, n) {
    let t = +heure.slice(0, 2) * 60 + +heure.slice(3, 5) + n, j = jour;
    while (t >= 1440) { t -= 1440; j = lendemain(j); }
    return `${j.replace(/-/g, '')}T${deux(Math.floor(t / 60))}${deux(t % 60)}00`;
  }
  function calendrier() {
    const page = retourUrl(), maintenant = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Compagnie Crescite//Espace de l equipe//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      `X-WR-CALNAME:${texteIcs('Crescite · ma tournée')}`, 'X-WR-TIMEZONE:Europe/Paris', ...FUSEAU];
    for (const { d, r, n } of evenementsAVenir()) {
      const sp = d.spectacle || {}, l = d.lieu, option = d.statut === 'option', duree = dureeMinutes(sp.duree) || 90;
      const ou = l ? [l.nom, l.adresse, `${l.commune}${l.departement ? ` (${l.departement})` : ''}`].filter(Boolean).join(', ') : (d.intitule || '');
      const quoi = r ? quoiRep(n, r.public) : PUBLICS[d.public] || '';
      L.push('BEGIN:VEVENT', `UID:${r ? `crescite-representation-${r.id}` : `crescite-date-${d.id}`}@crescite.fr`, `DTSTAMP:${maintenant}`);
      if (r && r.heure) L.push(`DTSTART;TZID=Europe/Paris:${plusMinutes(r.jour, r.heure, 0)}`, `DTEND;TZID=Europe/Paris:${plusMinutes(r.jour, r.heure, duree)}`);
      else { const j = r ? r.jour : d.debut, fin = r ? r.jour : (d.fin || d.debut); L.push(`DTSTART;VALUE=DATE:${j.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${lendemain(fin).replace(/-/g, '')}`); }
      L.push(`SUMMARY:${texteIcs(`${option ? 'Option · ' : ''}${sp.titre || 'Représentation'}${quoi ? ` — ${quoi}` : ''}`)}`);
      if (ou) L.push(`LOCATION:${texteIcs(ou)}`);
      if (l && l.latitude != null && l.longitude != null && Number.isFinite(+l.latitude) && Number.isFinite(+l.longitude)) L.push(`GEO:${(+l.latitude).toFixed(6)};${(+l.longitude).toFixed(6)}`);
      const precisions = (Array.isArray(d.details) ? d.details : []).map(x => x && x.texte).filter(Boolean);
      const desc = [`${sp.titre || ''}${option ? ' (option, pas encore confirmée)' : ''}`,
        r ? `${majuscule(quoi === 'tout public' ? 'représentation tout public' : quoi)}${r.heure ? '' : n > 1 ? ', heures à préciser' : ', heure à préciser'}` : (d.representations.length ? '' : 'Horaires pas encore indiqués'),
        r && r.note, ...precisions, ou, sp.duree, `La feuille de route, l’équipe et les documents : ${page}`].filter(Boolean).join('\n');
      L.push(`DESCRIPTION:${texteIcs(desc)}`, `STATUS:${option ? 'TENTATIVE' : 'CONFIRMED'}`, `URL:${page}`, 'END:VEVENT');
    }
    L.push('END:VCALENDAR');
    return L.map(plier).join('\r\n') + '\r\n';
  }
  function telechargerAgenda() {
    const evs = evenementsAVenir(), n = evs.length;
    if (!n) return annoncer('Aucune représentation à venir à ajouter.', { erreur: true });
    const url = URL.createObjectURL(new Blob([calendrier()], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'crescite-ma-tournee.ics'; a.hidden = true;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    annoncer('Le fichier est téléchargé : ouvrez-le pour ajouter vos représentations à votre agenda.');
  }

  // ================================================================================================ actions
  async function sortir() {
    if (E.ficheSale && !confirm('Vos modifications de fiche ne sont pas enregistrées. Se déconnecter quand même ?')) return;
    E.ficheSale = false; E.sortieVoulue = true;
    oublier();
    const { error } = await sb.auth.signOut({ scope: 'local' });
    if (error && (E.pret || E.sansSession)) {
      // hors connexion, la base n'a pas pu en être prévenue (et supabase-js garde la session) : elle est oubliée ici quand même
      try { localStorage.removeItem(SESSION); } catch (e) { /* rien */ }
      E.session = null; reinitialiser();
      E.messageConnexion = { texte: 'La session est fermée sur cet appareil.', genre: 'info' };
      demarrer();
      E.sortieVoulue = false;
    }
  }

  async function rafraichir({ discret = false } = {}) {
    if (!E.session) return;
    if (!E.pret) { E.uid = null; return demarrer(); }
    if (E.rafraichit) return;
    E.rafraichit = true;
    let erreur = null;
    try { await charger(); E.horsLigne = 0; garder(); } catch (e) { erreur = e; }
    E.rafraichit = false;
    if (erreur) {
      if (estReseau(erreur)) E.horsLigne = E.horsLigne || E.chargeLe || Date.now();
      if (!discret) annoncer(`Actualisation impossible : ${motsErreur(erreur)}.`, { erreur: true });
      bandeauEtat();
      return;
    }
    await redessiner();
    if (!discret) annoncer('Votre espace est à jour.');
  }
  // la vue ouverte, redessinée avec les données relues, sans perdre sa place : défilement, saisons ouvertes, billets dépliés
  async function redessiner() {
    if (E.vue === 'fiche' && E.ficheSale) return bandeauEtat();
    // la feuille de route qu'on lit ne se redessine que si une autre version est publiée entre-temps
    const v = E.feuilleVue, fv = v && E.feuilles.get(v.id);
    if (E.vue === 'feuille' && fv && fv.version === v.version && fv.publiee_le === v.publiee_le) return bandeauEtat();
    const y = window.scrollY, ouvertes = $$('details.saison[open]').map(x => x.dataset.saison);
    if (E.vue === 'saison') E.retour = null;
    await router({ rafraichir: true });
    ouvertes.forEach(s => { const det = $(`details.saison[data-saison="${CSS.escape(s)}"]`); if (det) { det.open = true; remplirSaison(det); } });
    window.scrollTo(0, y);
  }
  async function reessayer(voulu = false) {
    if (E.sansSession) {
      // le renouvellement de la session (TOKEN_REFRESHED) rouvre l'espace ; sinon, on reste sur la saison gardée.
      // Après un échec, supabase-js ne redemande pas avant une minute (lastRefreshFailure) : ce geste voulu passe outre.
      if (sb.auth && 'lastRefreshFailure' in sb.auth) sb.auth.lastRefreshFailure = null;
      const { error } = await sb.auth.getSession();
      if (error && voulu) annoncer(`Toujours hors connexion : ${motsErreur(error)}.`, { erreur: true });
      return;
    }
    if (!E.pret) { E.uid = null; return demarrer(); }
    return rafraichir({ discret: !voulu });
  }
  window.addEventListener('online', () => { if (E.horsLigne) reessayer(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && E.pret && !E.sansSession && Date.now() - E.chargeLe > 120000) rafraichir({ discret: true });
  });

  document.addEventListener('click', async e => {
    const t = e.target.closest('button, a');
    if (!t) return;
    if (t.matches('[data-sortir]')) return sortir();
    if (t.matches('[data-reessayer]')) return occupe(t, 'Un instant…', () => reessayer(true));
    if (t.id === 'b-agenda') return telechargerAgenda();
    if (t.matches('.deplier')) {
      const bas = document.getElementById(t.getAttribute('aria-controls')), id = Number(t.getAttribute('aria-controls').slice(3)), ouvrir = t.getAttribute('aria-expanded') !== 'true';
      if (!bas) return;
      bas.hidden = !ouvrir;
      t.setAttribute('aria-expanded', String(ouvrir));
      $('.deplier-lib', t).textContent = ouvrir ? 'Replier' : t.dataset.libelle;
      if (ouvrir) E.deplies.add(id); else E.deplies.delete(id);
      return;
    }
    if (t.matches('[data-pdf]')) return telechargerPdf(t);
    if (t.matches('[data-fichier]')) {
      const chemin = t.dataset.fichier;
      if (t.tagName === 'A' && lienFrais(chemin)) return;     // le lien signé est encore bon : le navigateur l'ouvre
      e.preventDefault();
      const w = window.open('', '_blank');                      // ouvert pendant le clic, pour ne pas être bloqué
      try {
        const url = await signerUn(chemin);
        if (w) { w.opener = null; w.location.href = url; } else location.href = url;
        if (t.tagName === 'A') t.href = url;
      } catch (err) {
        if (w) w.close();
        annoncer(`Le document ne s’ouvre pas : ${motsErreur(err)}.`, { erreur: true });
      }
    }
  });

  // à l'ouverture de la page : la dernière saison lue sur cet appareil s'affiche tout de suite, si la session gardée est
  // la sienne (sans réseau, supabase-js peut chercher à renouveler une session expirée pendant une demi-minute) ; la base
  // la remplace dès qu'elle répond. Pas en arrivant d'un courriel : un autre compte peut s'ouvrir.
  (() => {
    if (E.motDePasse || ARRIVEE.type || ARRIVEE.erreur || /access_token=/.test(location.hash)) return;
    const g = sessionGardee(), m = g && reprendre(g.user.id);
    if (!m) return;
    appliquer(m);
    Object.assign(E, { uid: g.user.id, pret: true, provisoire: true });
    coquille();
    router({ arrivee: true });
  })();
})();
