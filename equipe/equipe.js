/* L'espace de l'équipe de la compagnie Crescite (equipe/index.html), en application.

   Chaque personne de l'équipe (jeu, technique, création, administration) y retrouve sa tournée, les horaires, les
   feuilles de route et les documents de ses spectacles, ses notifications, et tient ses coordonnées à jour. Une
   application web installable (manifest.webmanifest, sw.js) : au téléphone une barre d'onglets en bas, à l'ordinateur
   une colonne à gauche ; elle s'ouvre hors connexion sur la dernière saison lue.

   Les adresses, une par vue : #/saison (l'accueil : la prochaine date en grand, le jour J, la saison en chiffres et sur
   la carte, la suite, les saisons passées), #/date/<id> (une date), #/feuilles et #/feuille/<id> (les feuilles de route ;
   <id> est celui de la date), #/planning (le planning commun, ../admin/planning.js), #/indisponibilites, #/agendas,
   #/propositions et #/proposition/<id>, #/spectacles et #/spectacles/<slug> (ses spectacles et leurs fichiers de travail ;
   #/documents y mène), #/notifications, #/moi (la fiche, les notifications sur l'appareil, l'installation, le mot de
   passe, la déconnexion), #/frais (les notes de frais : seulement quand la base a le septième script, voir sonder).
   #/fiche mène à #/moi. Au téléphone, la barre du bas garde cinq onglets (Saison, Feuilles,
   Planning, Spectacles, Moi) et les notifications passent dans une cloche en haut, avec leur badge ; à l'ordinateur, la
   colonne de gauche les montre toutes les six.

   La base (Supabase, tables crescite_) ne montre à chacun que ce qui le concerne : voir les règles d'accès de
   supabase/migrations/20261021_crescite_equipe.sql et 20261022_crescite_notifications.sql. Les comptes sont ouverts par
   l'administration, jamais ici : la page se connecte (mot de passe, lien de connexion, mot de passe oublié), relie le
   compte à sa fiche (crescite_rattacher), lit sa tournée (crescite_ma_tournee) et ce qui l'entoure, puis écoute ses
   notifications (crescite_notifications, en temps réel, sinon relues chaque minute). Sur un appareil abonné
   (crescite_abonnements), la fonction crescite-push les pousse aussi quand l'application est fermée (sw.js).

   Chargés avant ce fichier : ../admin/vendor/supabase.js (supabase-js), ../admin/agenda.js (AGENDA), ../admin/feuille.js
   (FEUILLE), ../admin/tentacules.js (TENTACULES) et carte.js (CRESCITE_CARTE : la France et Rouen, écrit par
   maquettes/build.py). Sans AGENDA, FEUILLE, TENTACULES ni la carte, la page marche et dit ce qui manque. */
(() => {
  'use strict';

  // ================================================================================================ réglages
  const BASE = 'https://omekkqjinvppadsoinvj.supabase.co';
  const CLE = 'sb_publishable_TODW6NdmDly8eR9UxjG-6g_eyAa4gjB';
  const SESSION = 'crescite-equipe';              // la session de l'équipe, à part de celle de l'administration
  const MEMOIRE = 'crescite-equipe-donnees';      // la dernière saison lue : relue sans réseau (effacée à la déconnexion)
  const MODIFS = 'crescite-equipe-modifs';        // les horaires changés depuis la lecture précédente, marqués trois jours
  const REGLAGES = 'crescite-equipe-reglages';    // ce que cet appareil retient : la proposition d'installation fermée
  const SEAU = 'crescite-equipe';                 // le stockage privé des documents
  const PUBLIC = `${BASE}/storage/v1/object/public/crescite`;   // les photos, les portraits et les documents publics
  const POUSSER = `${BASE}/functions/v1/crescite-push`;         // la fonction d'envoi : GET → {cle_publique}
  const DUREE_LIEN = 3600;                        // un lien signé vaut une heure ; au-delà, il est redemandé au clic
  const DUREE_PARTAGE = 2592000;                  // une fiche technique partagée : un lien de trente jours
  const CONTACT = 'contact@crescite.fr';          // l'adresse publique de la compagnie
  const ROUEN = [49.4431, 1.0993];                // le départ des tournées (latitude, longitude)
  const NOTIFS_MAX = 100;
  const ONGLETS = ['saison', 'feuilles', 'planning', 'spectacles', 'notifications', 'moi'];
  const TITRES = { saison: 'Ma saison', feuilles: 'Feuilles de route', planning: 'Planning', spectacles: 'Mes spectacles', notifications: 'Notifications', moi: 'Moi',
    indisponibilites: 'Mes indisponibilités', agendas: 'Mes agendas', propositions: 'Propositions de dates', proposition: 'Proposition de dates', frais: 'Notes de frais' };

  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const txt = v => String(v ?? '').trim();
  const attendre = ms => new Promise(r => setTimeout(r, ms));

  // ce que l'adresse apporte en arrivant d'un courriel (lien de connexion, invitation, mot de passe oublié), à lire avant
  // que le client de la base ne l'efface ; une erreur (lien expiré) est retirée de l'adresse tout de suite. ?lue=<id> :
  // l'application ouverte depuis une notification du téléphone (sw.js), qui est alors lue.
  const ARRIVEE = (() => {
    const h = new URLSearchParams(location.hash.replace(/^#/, '')), q = new URLSearchParams(location.search);
    const lire = k => h.get(k) || q.get(k) || '';
    return { type: lire('type'), erreur: lire('error_description') || lire('error'), code: lire('error_code'), lue: /^\d+$/.test(q.get('lue') || '') ? +q.get('lue') : null };
  })();
  if (ARRIVEE.erreur || ARRIVEE.lue != null || new URLSearchParams(location.search).has('lue')) {
    const u = new URL(location.href);
    ['error', 'error_code', 'error_description', 'type', 'lue'].forEach(k => u.searchParams.delete(k));
    history.replaceState(null, '', u.pathname + u.search + (ARRIVEE.erreur ? '' : location.hash));
  }

  // ================================================================================================ l'appareil
  const mq = q => (window.matchMedia ? window.matchMedia(q) : { matches: false });
  const MOINS = mq('(prefers-reduced-motion: reduce)');
  const CALME = /[?&]anim=0\b/.test(location.search);                    // captures et essais : rien ne bouge
  const reduit = () => MOINS.matches || CALME;
  if (CALME) document.documentElement.classList.add('still');    // la feuille de style arrête aussi tout ce qu'elle anime
  const installee = () => mq('(display-mode: standalone)').matches || mq('(display-mode: fullscreen)').matches || navigator.standalone === true;
  const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // un léger retour au doigt, sur les téléphones qui le permettent, et seulement après un premier geste
  function vibrer(ms = 8) {
    try { if (navigator.vibrate && !CALME && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms); } catch (e) { /* rien */ }
  }

  // ================================================================================================ outils communs
  const AG = typeof AGENDA !== 'undefined' ? AGENDA : null;
  const TT = typeof TENTACULES !== 'undefined' ? TENTACULES : null;
  const FRANCE = typeof CRESCITE_CARTE !== 'undefined' && CRESCITE_CARTE && CRESCITE_CARTE.projection && CRESCITE_CARTE.contour ? CRESCITE_CARTE : null;
  const tt = (f, ...a) => { if (TT && typeof TT[f] === 'function') { try { return TT[f](...a); } catch (e) { /* le décor ne casse rien */ } } return null; };
  const outilFeuille = () => (typeof FEUILLE !== 'undefined' && FEUILLE && typeof FEUILLE.html === 'function' ? FEUILLE : null);
  // les tentacules : chaque geste leur répond ; chaque changement de vue en fait remonter une, à la couleur de la date visée
  if (TT) TT.regler({ profil: 'admin', style: 'encre', remontee: true, soulever: false, couleurDe: h => couleurRoute(h) });

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
  const estJour = j => /^\d{4}-\d{2}-\d{2}$/.test(j || '');
  const jourDe = j => new Date(+j.slice(0, 4), +j.slice(5, 7) - 1, +j.slice(8, 10));
  const quantieme = n => (n === 1 ? '1er' : String(n));
  const jourLong = j => { const d = jourDe(j); return `${JOURS[d.getDay()]} ${quantieme(d.getDate())} ${MOIS[d.getMonth()]} ${d.getFullYear()}`; };
  const jourCourt = j => { const d = jourDe(j); return `${JOURS_C[d.getDay()]} ${quantieme(d.getDate())} ${MOIS_C[d.getMonth()]}`; };
  const jourSansAn = j => { const d = jourDe(j); return `${JOURS[d.getDay()]} ${quantieme(d.getDate())} ${MOIS[d.getMonth()]}`; };
  const moisTexte = j => `${MOIS[+j.slice(5, 7) - 1]} ${j.slice(0, 4)}`;
  const h5 = h => (h ? String(h).slice(0, 5) : '');
  const minutesDe = h => { const m = /^(\d{1,2}):(\d{2})/.exec(h || ''); return m ? +m[1] * 60 + +m[2] : null; };
  const heureTexte = h => (h ? `${String(h).slice(0, 2)}h${String(h).slice(3, 5)}` : '');
  const ecartJours = (a, b) => Math.round((jourDe(b) - jourDe(a)) / 864e5);
  const lendemain = j => new Date(Date.UTC(+j.slice(0, 4), +j.slice(5, 7) - 1, +j.slice(8, 10) + 1)).toISOString().slice(0, 10);
  const saisonDe = j => (AG ? AG.saisonDe(j) : (+j.slice(5, 7) >= 9 ? `${+j.slice(0, 4)}-${+j.slice(0, 4) + 1}` : `${+j.slice(0, 4) - 1}-${+j.slice(0, 4)}`));
  const heureCourte = t => { const d = new Date(t); return `${d.getHours()}\u00a0h\u00a0${deux(d.getMinutes())}`; };
  const momentTexte = t => {   // « le 12 décembre à 14 h 05 », « le 3 mars 2025 à 9 h 10 »
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return '';
    const an = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
    return `le ${quantieme(d.getDate())}\u00a0${MOIS[d.getMonth()]}${an} à ${heureCourte(d)}`;
  };
  const pluriel = (n, un, plusieurs = un + 's') => `${n}\u00a0${n > 1 ? plusieurs : un}`;
  const majuscule = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const nombre = n => Number(n || 0).toLocaleString('fr-FR');
  const salut = () => { const h = new Date().getHours(); return h >= 18 || h < 5 ? 'Bonsoir' : 'Bonjour'; };

  // la fin d'une date : son dernier jour ; une date au mois court jusqu'à la fin du mois, une date « saison » jusqu'en août
  function finDe(d) {
    if (d.precision === 'mois') { const x = jourDe(d.debut); return iso(new Date(x.getFullYear(), x.getMonth() + 1, 0)); }
    if (d.precision === 'saison') return `${String(d.saison || saisonDe(d.debut)).slice(5, 9)}-08-31`;
    return d.fin || d.debut;
  }
  // les jours d'une date : ceux de ses séances, sinon du premier au dernier (une date au jour ou sur une période)
  function joursDe(d) {
    const js = [...new Set(d.representations.map(r => r.jour).filter(estJour))].sort();
    if (js.length || (d.precision !== 'jour' && d.precision !== 'periode')) return js;
    const out = [];
    for (let j = d.debut, n = 0; j <= (d.fin || d.debut) && n < 62; j = lendemain(j), n++) out.push(j);
    return out;
  }
  // une notification : « à l'instant », « il y a 5 min », « 14 h 05 » ; groupées par jour : « Aujourd'hui », « Hier », « Lundi »
  function quandNotif(t) {
    const d = new Date(t), s = (Date.now() - d) / 1000;
    if (Number.isNaN(d.getTime())) return '';
    if (s < 60) return 'à l’instant';
    if (s < 3600) return `il y a ${Math.floor(s / 60)}\u00a0min`;
    return heureCourte(d);
  }
  function jourNotif(t) {
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return 'Plus tôt';
    const j = iso(d), n = ecartJours(j, aujourdhui());
    if (n <= 0) return 'Aujourd’hui';
    if (n === 1) return 'Hier';
    if (n < 7) return majuscule(JOURS[d.getDay()]);
    return majuscule(d.getFullYear() === new Date().getFullYear() ? jourSansAn(j) : jourLong(j));
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
  // la même teinte, assombrie (sur un fond clair) ou éclaircie (sur un fond sombre) jusqu'au contraste voulu
  function lisible(c, fond, cible = 4.6) {
    if (contraste(c, fond) >= cible) return c;
    const [t, s, l0] = hsl(c), clair = lum(fond) > 0.3;
    for (let l = l0; l >= 0 && l <= 1; l += clair ? -0.01 : 0.01) { const x = versHexa(t, s, l); if (contraste(x, fond) >= cible) return x; }
    return clair ? '#1d1418' : '#ffffff';
  }
  const PAPIER = '#fffdf9', NUIT = '#1f1921';
  const COULEURS = new Map();
  // u : la couleur de l'univers ; fond et texte pour le mode clair, fondS et texteS pour le mode sombre ; et le héros :
  // le fond, le texte et l'accent de l'univers lui-même (une affiche), corrigés s'ils ne se lisent pas assez
  function couleurs(sp) {
    const c = (sp && sp.univers && sp.univers.couleurs) || {};
    const u = [c.scene, c.accent, c.texte].find(hexa) || '#a3306b';
    const cle = `${u}|${c.fond || ''}|${c.texte || ''}|${c.accent || ''}|${c.accent2 || ''}`;
    if (!COULEURS.has(cle)) {
      const fond = melange(u, PAPIER, 0.13), fondS = melange(u, NUIT, 0.2);
      const hFond = hexa(c.fond) ? c.fond : melange(u, '#140d11', 0.42), clairFond = lum(hFond) > 0.3;
      let hTexte = hexa(c.texte) ? c.texte : clairFond ? '#1d1418' : '#ffffff';
      if (contraste(hTexte, hFond) < 4.6) hTexte = lisible(hTexte, hFond);
      const candidats = [c.scene, c.accent2, c.accent].filter(hexa).sort((a, b) => contraste(b, hFond) - contraste(a, hFond));
      const hAccent = lisible(candidats[0] || hTexte, hFond, 3.4);
      COULEURS.set(cle, { u, fond, texte: lisible(u, fond), fondS, texteS: lisible(u, fondS), hFond, hTexte, hAccent });
    }
    return COULEURS.get(cle);
  }
  // l'univers d'un élément : data-u et ses variables (index.html choisit le jeu clair ou sombre)
  const styleU = sp => { const c = couleurs(sp); return `--u:${c.u};--ul-fond:${c.fond};--ul-texte:${c.texte};--us-fond:${c.fondS};--us-texte:${c.texteS}`; };
  const attrU = sp => ` data-u style="${styleU(sp)}"`;
  // la couleur d'une adresse, pour la tentacule qui y mène
  function couleurRoute(h) {
    const m = String(h || '').match(/^#\/(?:date|feuille)\/(\d+)/), d = m && E.dates.find(x => x.id === +m[1]);
    if (d) return couleurs(d.spectacle).u;
    return getComputedStyle(document.documentElement).getPropertyValue('--magenta').trim() || '#a3306b';
  }
  // la police du titre d'un spectacle (celle de son univers), chargée à la demande pour ce seul titre
  const POLICES = new Set();
  function police(sp) {
    const p = sp && sp.univers && sp.univers.polices, fam = p && txt(p.titre);
    if (!fam || !/^[A-Za-z0-9 -]{2,40}$/.test(fam) || !sp.titre) return null;
    const g = [100, 200, 300, 400, 500, 600, 700, 800, 900].includes(+p.titreGraisse) ? +p.titreGraisse : 600;
    const lettres = [...new Set(String(sp.titre))].join('');
    const cle = `${fam}|${g}|${lettres}`;
    if (!POLICES.has(cle)) {
      POLICES.add(cle);
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.crossOrigin = 'anonymous';
      l.href = `https://fonts.googleapis.com/css2?family=${fam.replace(/ /g, '+')}:wght@${g}&display=swap&text=${encodeURIComponent(lettres)}`;
      document.head.append(l);
    }
    return { famille: `'${fam}', var(--serif)`, graisse: g };
  }
  const photoDe = sp => {
    const f = sp && (sp.photo || (E.spectacles.get(sp.id) || {}).photo);
    return f ? `${PUBLIC}/${String(f).split('/').map(encodeURIComponent).join('/')}` : '';
  };

  // ================================================================================================ icônes
  const ic = (d, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
  const ICONES = {
    agenda: ic('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M12 14h2M8 17h2"/>'),
    route: ic('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
    doc: ic('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
    lien: ic('<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>'),
    pdf: ic('<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M5 19.5h14"/>'),
    lire: ic('<path d="M4 5.5h6a2 2 0 0 1 2 2V20a1.5 1.5 0 0 0-1.5-1.5H4zM20 5.5h-6a2 2 0 0 0-2 2V20a1.5 1.5 0 0 1 1.5-1.5H20z"/>'),
    feuille: ic('<path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>'),
    dossier: ic('<path d="M3.5 7.5a2 2 0 0 1 2-2h3.8l2 2.2h7.2a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>'),
    cloche: ic('<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 2H4.4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
    moi: ic('<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>'),
    retour: ic('<path d="M15 5l-7 7 7 7"/>'),
    chevron: ic('<path d="M9.5 5.5 16 12l-6.5 6.5"/>', 'ic chevron'),
    actualiser: ic('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4.5H15"/>'),
    partager: ic('<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M5.5 11.5V19A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5v-7.5"/>'),
    horloge: ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    equipe: ic('<circle cx="9" cy="9" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9.5" r="2.3"/><path d="M15.6 14.1A4.5 4.5 0 0 1 20.5 18.5"/>'),
    message: ic('<path d="M4.5 5.5h15v10.5H10l-5.5 4z"/>'),
    installer: ic('<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M12 7v7M9 11l3 3 3-3"/>'),
    coche: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    croix: ic('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
    cle: ic('<circle cx="8" cy="15" r="3.5"/><path d="M10.5 12.5 19 4M16 7l2.5 2.5M14 9l2 2"/>'),
    sortir: ic('<path d="M14 4.5h4a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4"/><path d="M10 8l-4 4 4 4M6 12h9"/>'),
    spectacle: ic('<path d="M3.5 4.5h17v15.5h-17z"/><path d="M3.5 4.5c1.4 3.3 2.2 7.5 1.9 15.5M20.5 4.5c-1.4 3.3-2.2 7.5-1.9 15.5M3.5 4.5c3 2.6 5.8 3.6 8.5 3.6s5.5-1 8.5-3.6M8 20v-2.5h8V20"/>'),
    planning: ic('<rect x="3.5" y="4.5" width="17" height="16" rx="2.2"/><path d="M3.5 9.5h17M3.5 15h17M9.2 9.5v11M14.8 9.5v11"/>'),
    indispo: ic('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M9.5 13l5 5M14.5 13l-5 5"/>'),
    relier: ic('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    question: ic('<circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.5a2.4 2.4 0 1 1 3.3 2.2c-.6.3-1 .8-1 1.4v.6"/><path d="M12 16.6v.4"/>'),
    crayon: ic('<path d="M4.5 19.5l1-4.2L15.8 5a2 2 0 0 1 2.9 0l.3.3a2 2 0 0 1 0 2.9L8.7 18.5z"/><path d="M13.8 7l3.2 3.2"/>'),
    alerte: ic('<path d="M12 4.5 21 19.5H3z"/><path d="M12 10v4.2M12 16.8v.3"/>'),
    euro: ic('<path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12a7.9 7.9 0 0 0 7.8 8 7.7 7.7 0 0 0 5.2-2M4 10h10M4 14h10"/>'),
    camion: ic('<rect x="1" y="4" width="14" height="12" rx="1.5"/><path d="M15 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.2"/><circle cx="18.5" cy="18.5" r="2.2"/>'),
    waze: ic('<path d="M12 2a9 9 0 0 0-9 9c0 4 3 7 7 8.5V22l4-2.5c4.5-.5 7-3.5 7-8.5a9 9 0 0 0-9-9z"/><circle cx="9" cy="11" r="1.5" fill="currentColor"/><circle cx="15" cy="11" r="1.5" fill="currentColor"/><path d="M9.5 15a3.5 3.5 0 0 0 5 0"/>'),
    apple: ic('<path d="M12 20.9c-.8 0-1.7-.5-2.6-.5-.9 0-1.8.5-2.6.5-1.5 0-3.3-1.6-4.5-4.1C1 14.1 1.7 10.6 3.6 9.6c.9-.5 2-.4 2.8.1.8.5 1.5.8 2.2.8.7 0 1.5-.3 2.3-.8 1-.6 2.3-.7 3.3.1.8.6 1.6 1.7 1.9 2.2-1.7.9-2 3.1-1.3 4.8.6 1.4 1.5 2.5 1.5 2.5-.4 1.1-.9 2.2-1.6 3.1-.7 1-1.6 2.2-2.7 2.2zM12.6 6.5c.5-.7.8-1.6.7-2.5-.8.1-1.8.6-2.3 1.3-.5.6-.9 1.5-.7 2.4.9.1 1.8-.4 2.3-1.2z"/>'),
    photo: ic('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'),
  };
  const GENRES = {
    feuille: { ic: ICONES.feuille, lib: 'Feuille de route' }, horaires: { ic: ICONES.horloge, lib: 'Horaires' },
    date: { ic: ICONES.agenda, lib: 'Date' }, document: { ic: ICONES.doc, lib: 'Document' },
    equipe: { ic: ICONES.equipe, lib: 'Équipe' }, message: { ic: ICONES.message, lib: 'Message' },
    proposition: { ic: ICONES.question, lib: 'Proposition de dates' },
  };

  // la pieuvre des états vides : elle tient ce qui manque (un calendrier, une feuille, une cloche, un dossier)
  const OBJETS = {
    calendrier: '<g transform="translate(8 16) rotate(-9 18 20)"><rect class="pv-clair" x="0" y="4" width="36" height="32" rx="5"/><path class="pv-ligne" d="M0 14h36M10 0v8M26 0v8"/><circle class="pv-point" cx="12" cy="24" r="3.2"/><circle class="pv-point" cx="24" cy="24" r="3.2"/></g>',
    feuille: '<g transform="translate(10 12) rotate(-10 16 20)"><path class="pv-clair" d="M0 0h24l9 9v32H0z"/><path class="pv-ligne" d="M24 0v9h9M6 16h20M6 24h20M6 32h13"/></g>',
    cloche: '<g transform="translate(10 14) rotate(-14 16 18)"><path class="pv-clair" d="M5 29V17a11 11 0 0 1 22 0v12l3.5 4H1.5z"/><path class="pv-ligne" d="M12 37a4 4 0 0 0 8 0M33 3l5-1-5 6 5-1"/></g>',
    dossier: '<g transform="translate(6 18) rotate(-8 18 16)"><path class="pv-clair" d="M0 6a3 3 0 0 1 3-3h10l4 4h17a3 3 0 0 1 3 3v21a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3z"/><path class="pv-ligne" d="M0 13h37"/></g>',
  };
  const pieuvre = objet => `<svg class="pieuvre-vide" viewBox="0 0 200 150" aria-hidden="true" focusable="false">
    <g class="bras-vide" fill="none" stroke="currentColor" stroke-width="8.5" stroke-linecap="round">
      <path d="M71 86c-12 6-23 16-25 29-2 10 6 15 12 10"/><path d="M85 91c-6 12-9 25-3 35 4 6 12 4 11-2"/><path d="M101 92c1 13 4 25 10 33 4 5 11 2 9-4"/>
      <path d="M116 90c8 11 14 23 11 34-2 7 6 9 9 3"/><path d="M130 84c13 5 25 14 28 28 2 9-6 14-11 9"/><path d="M64 74c-14 0-26-7-32-19"/>
    </g>
    <path fill="currentColor" d="M100 18c25 0 42 18 42 42 0 17-11 28-25 32H83c-14-4-25-15-25-32 0-24 17-42 42-42z"/>
    <ellipse class="pv-clair-plein" cx="86" cy="56" rx="7" ry="8"/><ellipse class="pv-clair-plein" cx="114" cy="56" rx="7" ry="8"/>
    <circle class="pv-oeil" cx="88" cy="58" r="3.6"/><circle class="pv-oeil" cx="116" cy="58" r="3.6"/>
    <path d="M92 72c5 4 11 4 16 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>${OBJETS[objet] || ''}</svg>`;
  // la pieuvre de l'en-tête, si les tentacules ne sont pas là pour y mettre la leur
  const PIEUVRE_MARQUE = '<svg viewBox="0 0 120 100" aria-hidden="true" focusable="false"><g fill="currentColor"><path d="M60 8c19 0 31 13 31 30 0 13-8 21-18 24H47c-10-3-18-11-18-24C29 21 41 8 60 8z"/></g><g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><path d="M44 60c-10 6-20 15-21 26"/><path d="M54 63c-4 9-5 19-1 27"/><path d="M66 63c4 9 5 19 1 27"/><path d="M76 60c10 6 20 15 21 26"/></g></svg>';
  function etatVide(objet, titre, texte, suite = '') {
    return `<div class="etat-vide">${pieuvre(objet)}<b>${esc(titre)}</b><p>${esc(texte)}</p>${suite}</div>`;
  }

  // ================================================================================================ les mots des erreurs
  const estReseau = e => !!e && (e.name === 'AuthRetryableFetchError' || e.status === 0
    || /Failed to fetch|NetworkError|Load failed|fetch failed|Network request failed|ERR_INTERNET|ERR_NETWORK/i.test(String(e.message || e)));
  const tableAbsente = e => !!e && (e.code === 'PGRST205' || e.code === '42P01' || e.status === 404 || /Could not find the table|does not exist/i.test(String(e.message || '')));
  const refusBase = e => !!e && (e.code === '42501' || e.status === 401 || e.status === 403 || /row-level security/i.test(String(e.message || '')));
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
    if (e?.name === 'NotAllowedError') return 'le navigateur l’a refusé';
    return m || 'une erreur inconnue est survenue';
  }

  // ================================================================================================ annonces
  function annoncer(msg, { erreur = false, delai = 6000, action = null, persistant = false } = {}) {
    const zone = $('#annonces');
    if (!zone) return null;
    const el = document.createElement('div');
    el.className = 'annonce' + (erreur ? ' erreur' : '');
    el.setAttribute('role', erreur ? 'alert' : 'status');
    el.innerHTML = `<span class="annonce-texte">${esc(msg)}</span>${action ? `<button type="button" class="annonce-action">${esc(action.libelle)}</button>` : ''}<button type="button" class="annonce-fermer" aria-label="Fermer">${ICONES.croix}</button>`;
    const fermer = () => el.remove();
    $('.annonce-fermer', el).addEventListener('click', fermer);
    if (action) $('.annonce-action', el).addEventListener('click', () => { fermer(); action.f(); });
    zone.append(el);
    if (!persistant) setTimeout(fermer, erreur ? 12000 : delai);
    return el;
  }

  // ================================================================================================ état
  const E = {
    session: null, uid: null, moi: null, pret: false, ouverture: false,
    motDePasse: ARRIVEE.erreur ? '' : ARRIVEE.type === 'recovery' ? 'nouveau' : (ARRIVEE.type === 'invite' || ARRIVEE.type === 'signup') ? 'bienvenue' : '',
    personne: null, privee: null, dates: [], distributions: [], equipes: [], documents: [], spectacles: new Map(),
    feuilles: new Map(), liens: new Map(), erreurLiens: null, chargeLe: 0, horsLigne: 0, rafraichit: null,
    route: null, vue: '', pile: [], defil: {}, declencheur: {}, titre: '',
    ficheSale: false, feuilleVue: null, sortieVoulue: false, versEspace: false, sansSession: false, provisoire: false,
    notifs: [], notifsEtat: 'inconnu', canal: null, tempsReel: '', aMarquer: ARRIVEE.lue,
    push: { etat: 'inconnu', cle: undefined, cleLe: 0, verifie: false }, installer: null,
    modifs: { reps: new Map(), dates: new Map() }, cartes: new Map(), cherche: new Set(), chiffresVus: false,
    partages: new Map(), dispo: { etat: 'inconnu', propositions: [], propositionsLues: false, mesIndispos: null, agendas: null, jeton: undefined, fonction: 'inconnu', lecture: new Set(), brouillon: null, modifier: null, relu: false, fluxVerifie: null }, planning: null, planningEtat: null, planningCache: null,
    masques: undefined, prefs: null, lectureMasques: null, ecritureMasques: null,
    messageConnexion: ARRIVEE.erreur ? {
      texte: `Ce lien ne peut plus servir : ${ARRIVEE.code === 'otp_expired' || /expired|invalid/i.test(ARRIVEE.erreur) ? 'il a expiré, ou il a déjà été ouvert une fois' : 'il n’a pas pu être vérifié'}. Demandez-en un nouveau ci-dessous.`,
      genre: 'erreur' } : null,
  };
  const nomDe = p => (p ? [p.prenom, p.nom].filter(Boolean).join(' ') : '');
  const retourUrl = () => location.origin + location.pathname;
  const lireStock = (k, defaut = null) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? defaut : v; } catch (e) { return defaut; } };
  const ecrireStock = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage plein ou interdit */ } };
  const PREF = lireStock(REGLAGES, {}) || {};
  const garderPref = (k, v) => { PREF[k] = v; ecrireStock(REGLAGES, PREF); };

  // ================================================================================================ connexion
  sb.auth.onAuthStateChange((ev, s) => {
    E.session = s;
    if (ev === 'PASSWORD_RECOVERY') E.motDePasse = 'nouveau';
    if (ev === 'SIGNED_OUT') {
      const voulue = E.sortieVoulue;
      E.sortieVoulue = false;
      arreterTempsReel();
      oublier(); reinitialiser();
      // une session qui prend fin d'elle-même (expirée, retirée) efface aussi les réponses que le service garde hors connexion
      try { messageSW({ type: 'oublier' }); } catch (e) { /* le service n'est pas encore branché */ }
      E.messageConnexion = voulue ? { texte: 'La session est fermée sur cet appareil.', genre: 'info' }
        : { texte: 'Votre session a pris fin. Reconnectez-vous.', genre: 'erreur' };
    }
    // jamais d'appel à la base dans ce rappel : supabase-js le déconseille (verrou)
    if (['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT', 'PASSWORD_RECOVERY'].includes(ev) || (ev === 'TOKEN_REFRESHED' && E.sansSession)) setTimeout(demarrer, 0);
  });

  function reinitialiser() {
    Object.assign(E, { uid: null, moi: null, pret: false, ouverture: false, personne: null, privee: null, dates: [], distributions: [],
      equipes: [], documents: [], spectacles: new Map(), feuilles: new Map(), liens: new Map(), erreurLiens: null, chargeLe: 0,
      horsLigne: 0, route: null, vue: '', pile: [], defil: {}, declencheur: {}, ficheSale: false, feuilleVue: null, sansSession: false,
      provisoire: false, notifs: [], notifsEtat: 'inconnu', modifs: { reps: new Map(), dates: new Map() }, cartes: new Map(), cherche: new Set(),
      partages: new Map(), dispo: { etat: 'inconnu', propositions: [], propositionsLues: false, mesIndispos: null, agendas: null, jeton: undefined, fonction: 'inconnu', lecture: new Set(), brouillon: null, modifier: null, relu: false, fluxVerifie: null }, planningEtat: null, planningCache: null,
      masques: undefined, prefs: null, lectureMasques: null, ecritureMasques: null });
    if (E.planning) { try { E.planning.detruire(); } catch (e) { /* déjà parti */ } E.planning = null; }
    E.push.verifie = false;
    majBadge();
    if (typeof majBadgePlanning === 'function') majBadgePlanning();
  }

  // une page seule, centrée : connexion, mot de passe, compte sans fiche, panne
  function seul(html) {
    E.route = null; E.pile = [];
    $('#app').innerHTML = `<main class="seul" id="contenu" tabindex="-1"><div class="porte">
      <p class="porte-marque"><span class="pieuvre" data-pieuvre aria-hidden="true"></span><span class="marque-nom">Crescite</span> <small>équipe</small></p>
      ${html}</div></main>`;
    poserPieuvres();
  }
  function poserPieuvres() {
    if (TT) tt('pieuvre');
    // data-pieuvre-tirer : la pieuvre de « tirer pour rafraîchir », que les tentacules ne prennent pas pour le guide
    $$('[data-pieuvre], [data-pieuvre-tirer]').forEach(h => { if (!h.firstElementChild) h.innerHTML = (self.CRESCITE_LOGO && self.CRESCITE_LOGO.logo && self.CRESCITE_LOGO.logo.octopus) || PIEUVRE_MARQUE; });
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
    let ok = false;
    try { const r = await f(); ok = !(r && r.error); return r; }
    finally {
      if (bouton.isConnected) {
        bouton.disabled = false; bouton.removeAttribute('aria-busy'); bouton.innerHTML = avant;
        if (ok) { vibrer(8); if (!reduit()) { bouton.classList.add('fait'); setTimeout(() => bouton.classList.remove('fait'), 1400); } }   // réussi : le bouton (et le téléphone) le dit un instant
      }
    }
  }

  function ecranConnexion() {
    E.versEspace = true;
    const m = E.messageConnexion;
    E.messageConnexion = null;
    seul(`<h1>L’espace de l’équipe</h1>
      <p class="intro">Votre tournée, les horaires, les feuilles de route et les documents de vos spectacles, dans une application.</p>
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
      if (error) { dire('#c-msg', `Connexion impossible : ${esc(motsErreur(error))}.`); const f = $('#f-connexion'); if (f && !reduit()) { f.classList.add('secoue'); setTimeout(() => f.classList.remove('secoue'), 500); } if (error.code === 'invalid_credentials' || /Invalid login/i.test(error.message)) mdp.select(); }
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
          <button type="button" class="btn large" id="b-plus-tard">Plus tard</button></div>
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
        <button type="button" class="btn large" data-reessayer>Réessayer</button>
        <button type="button" class="btn large" data-sortir>Se déconnecter</button>
      </div>`);
    $('#contenu h1').focus();
  }

  function ecranPanne(e) {
    seul(`<h1>Votre espace ne s’ouvre pas</h1>
      <p class="message erreur" role="alert">${esc(majuscule(motsErreur(e)))}.</p>
      <div class="boutons"><button type="button" class="btn principal large" data-reessayer>Réessayer</button>
        <button type="button" class="btn large" data-sortir>Se déconnecter</button></div>`);
  }

  // ================================================================================================ démarrage
  // la session gardée sur cet appareil, même expirée : sans réseau, supabase-js ne peut pas la renouveler et dit « pas de session »
  const sessionGardee = () => { const x = lireStock(SESSION); return x && x.refresh_token && x.user && x.user.id ? x : null; };
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
    if (!garde) squelette();
    try {
      const moi = await rattacher();
      if (n !== tour) return;
      if (moi == null) { reinitialiser(); return ecranSansFiche(); }
      E.moi = moi;
      await Promise.all([charger(), chargerNotifs().catch(e => { if (!estReseau(e)) console.warn('notifications', e); }),
        chargerPropositions().catch(e => { if (!estReseau(e)) console.warn('propositions', e); }), sonder()]);
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
    majCoquille();
    if (!E.horsLigne) ecouter();
    if (E.aMarquer != null) { const id = E.aMarquer; E.aMarquer = null; marquerLue(id); }
    if (E.versEspace) { E.versEspace = false; requestAnimationFrame(() => tt('page', couleurRoute(location.hash))); }
  }

  async function rattacher() {
    const { data, error } = await sb.rpc('crescite_rattacher');
    if (error) throw error;
    return data == null ? null : Number(data);
  }

  // ================================================================================================ ce que la base a déjà
  // Trois scripts SQL ne sont pas encore lancés partout : le septième (20261026_crescite_ideale.sql : les notes de frais,
  // le matériel, les listes de chargement), le neuvième (20261028_crescite_signaler.sql : l'alerte de retard) et le
  // dixième (20261029_crescite_chiffres.sql : les chiffres des dates). Une lecture minimale de leur table le dit, une fois
  // par chargement de la page, connecté (une base qui ne les a pas répond 404 : attendu). Tant que la réponse n'est pas
  // venue (sans réseau aussi), ce qu'ils apportent reste masqué : le geste « Frais » d'une date, la carte « Notes de
  // frais » de Moi, #/frais (qui mène à #/moi), la checklist du camion d'une date ; le geste « Retard » ; les chiffres
  // d'une date.
  const SONDES = { ideale: 'inconnu', signaler: 'inconnu', chiffres: 'inconnu' };
  const TABLES_SONDES = { ideale: 'crescite_notes_frais', signaler: 'crescite_signalements', chiffres: 'crescite_dates_chiffres' };
  const COLONNE_SONDE = { chiffres: 'date_id' };     // (les autres tables ont un id)
  let sondage = null;
  function sonder() {
    if (!sondage) sondage = Promise.all(Object.keys(TABLES_SONDES).filter(k => SONDES[k] === 'inconnu').map(async k => {
      try {
        const { error } = await sb.from(TABLES_SONDES[k]).select(COLONNE_SONDE[k] || 'id').limit(1);
        if (!error) SONDES[k] = 'ok';
        else if (tableAbsente(error)) SONDES[k] = 'absent';
      } catch (e) { /* sans réseau : la prochaine lecture redemandera */ }
    })).then(() => { if (Object.values(SONDES).includes('inconnu')) sondage = null; });
    return sondage;
  }
  const avecIdeale = () => SONDES.ideale === 'ok';
  const avecSignaler = () => SONDES.signaler === 'ok';
  const avecChiffres = () => SONDES.chiffres === 'ok';

  // en attendant la base : l'application, et la forme de ce qui arrive
  function squelette() {
    coquille();
    const r = lireRoute();
    majNav(r.redirige ? { onglet: 'saison', profondeur: 0 } : r);
    const c = $('#contenu');
    c.className = '';
    c.innerHTML = `<p class="sr" role="status">Ouverture de votre espace…</p><div aria-hidden="true">
      <div class="titre-vue"><div class="squelette ligne" style="width:52%;height:30px"></div><div class="squelette ligne" style="width:38%"></div></div>
      <div class="squelette" style="height:360px;border-radius:26px"></div>
      <div class="pile" style="margin-top:18px">${'<div class="squelette" style="height:118px"></div>'.repeat(3)}</div></div>`;
  }

  const NATURES = { representations: 'Représentations', repetitions: 'Répétitions', residence: 'Résidence', autre: 'Rendez-vous' };
  const natureDe = d => (d && Object.prototype.hasOwnProperty.call(NATURES, d.nature) ? d.nature : 'representations');
  const documentPrive = x => !!x.fichier && (!x.pour || x.pour === 'equipe' || x.pour === 'administration');

  // tout ce que la page montre, en deux temps : la tournée et ce qui l'entoure, puis les spectacles (photo, univers), les
  // feuilles de route à venir et les liens signés des fichiers
  async function charger() {
    const moi = E.moi, P = 'id, slug, prenom, nom, photo, photo_publique';
    const rs = await Promise.all([
      sb.rpc('crescite_ma_tournee'),
      sb.from('crescite_personnes').select('id, slug, prenom, nom, metiers, photo, photo_publique').eq('id', moi).maybeSingle(),
      sb.from('crescite_personnes_privees').select('personne_id, email, telephone, ville, regime, urgence').eq('personne_id', moi).maybeSingle(),
      sb.from('crescite_distributions').select(`id, spectacle_id, personne_id, categorie, fonction, role, alternance, en_tournee, ordre, personne:crescite_personnes(${P})`).order('ordre'),
      sb.from('crescite_equipes').select(`date_id, personne_id, present, fonction, note, personne:crescite_personnes(${P})`),
      sb.from('crescite_documents').select('id, spectacle_id, type, titre, fichier, url, pour, ordre').order('ordre').order('titre'),
    ]);
    const echec = rs.find(r => r.error);
    if (echec) throw echec.error;
    const [t, p, pv, di, eq, dc] = rs.map(r => r.data);
    const dates = (Array.isArray(t) ? t : []).map(d => ({ ...d, id: Number(d.id), nature: natureDe(d), representations: Array.isArray(d.representations) ? d.representations : [] }))
      .sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : a.id - b.id));
    const ids = new Set(dates.map(d => d.id));
    const spectacles = new Map();
    dates.forEach(d => { if (d.spectacle && !spectacles.has(d.spectacle.id)) spectacles.set(d.spectacle.id, d.spectacle); });
    const distributions = (di || []);
    const miens = new Set([...spectacles.keys(), ...distributions.filter(x => x.personne_id === moi).map(x => x.spectacle_id)]);
    // les documents de l'équipe (ses spectacles, toute la compagnie) ; les documents publics (pros, scolaires) de ses spectacles
    const documents = (dc || []).filter(x => (!x.pour || x.pour === 'equipe') ? (x.spectacle_id == null || miens.has(x.spectacle_id))
      : (x.pour === 'pros' || x.pour === 'scolaires' || x.pour === 'tous' || x.pour === 'pros_scolaires') ? x.spectacle_id != null && miens.has(x.spectacle_id) : false);
    const auj = aujourdhui();
    const avecFeuille = dates.filter(d => d.feuille && finDe(d) >= auj).map(d => d.id);
    const tous = [...miens];
    const [sp, fe] = await Promise.all([
      tous.length ? sb.from('crescite_spectacles').select('id, slug, titre, duree, univers, ordre, photo').in('id', tous) : { data: [] },
      avecFeuille.length ? sb.from('crescite_feuilles').select('id, date_id, titre, contenu, statut, version, publiee_le').eq('statut', 'publiee').in('date_id', avecFeuille) : { data: [] },
    ]);
    if (sp.error) throw sp.error;
    if (fe.error) throw fe.error;
    (sp.data || []).forEach(x => spectacles.set(x.id, { ...(spectacles.get(x.id) || {}), ...x, univers: x.univers || spectacles.get(x.id)?.univers }));
    dates.forEach(d => { const x = d.spectacle && spectacles.get(d.spectacle.id); if (x) d.spectacle = { ...d.spectacle, photo: x.photo || null, univers: d.spectacle.univers || x.univers }; });
    let liens = new Map(), erreurLiens = null;
    try { liens = await signer(documents.filter(documentPrive).map(x => x.fichier)); } catch (e) { erreurLiens = e; }
    comparer(E.dates.length ? E.dates : (reprendre(E.uid) || {}).dates, dates);
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
    ecrireStock(MEMOIRE, { v: 2, uid: E.uid, moi: E.moi, quand: E.chargeLe, personne: E.personne,
      dates: E.dates, distributions: E.distributions, equipes: E.equipes, documents: E.documents,
      spectacles: [...E.spectacles.values()], feuilles: [...E.feuilles.values()], notifs: E.notifs, notifsEtat: E.notifsEtat });
  }
  function reprendre(uid) { const m = lireStock(MEMOIRE); return m && (m.v === 1 || m.v === 2) && m.uid === uid ? m : null; }
  function oublier() { ecrireStock(MEMOIRE, null); ecrireStock(MODIFS, null); }
  function appliquer(m) {
    Object.assign(E, { moi: m.moi, personne: m.personne, privee: null, dates: (m.dates || []).map(d => ({ ...d, nature: natureDe(d), representations: d.representations || [] })),
      distributions: m.distributions || [], equipes: m.equipes || [], documents: m.documents || [],
      spectacles: new Map((m.spectacles || []).map(x => [x.id, x])), feuilles: new Map((m.feuilles || []).map(f => [Number(f.date_id), f])),
      liens: new Map(), erreurLiens: null, chargeLe: m.quand || 0, notifs: m.notifs || [], notifsEtat: m.notifsEtat || 'inconnu' });
    lireModifs();
  }

  // ================================================================================================ les horaires changés
  // d'une lecture à l'autre, les séances dont le jour, l'heure, la fin ou l'annulation ont changé : marquées « modifié »
  // trois jours sur cet appareil (la notification dit qu'ils ont changé ; la date dit lesquels)
  const signature = r => `${r.jour}|${h5(r.heure)}|${h5(r.fin)}|${!!r.annulee}`;
  const TROIS_JOURS = 3 * 864e5;
  function comparer(anciennes, nouvelles) {
    if (!Array.isArray(anciennes) || !anciennes.length) { lireModifs(); return; }
    lireModifs();
    const avant = new Map(anciennes.map(d => [Number(d.id), d])), t = Date.now();
    for (const d of nouvelles) {
      const a = avant.get(d.id);
      if (!a) continue;                     // une date nouvelle : sa notification le dit
      const sigs = new Map((a.representations || []).map(r => [r.id, signature(r)]));
      let change = false;
      for (const r of d.representations) if (sigs.get(r.id) !== signature(r)) { E.modifs.reps.set(r.id, t); change = true; }
      if ((a.representations || []).some(r => !d.representations.some(x => x.id === r.id))) change = true;
      if (a.statut !== d.statut || (a.lieu?.id ?? null) !== (d.lieu?.id ?? null) || a.debut !== d.debut) change = true;
      if (change) E.modifs.dates.set(d.id, t);
    }
    ecrireStock(MODIFS, { uid: E.uid, reps: [...E.modifs.reps], dates: [...E.modifs.dates] });
  }
  function lireModifs() {
    const m = lireStock(MODIFS), t = Date.now();
    const frais = xs => new Map((Array.isArray(xs) ? xs : []).filter(([, q]) => t - q < TROIS_JOURS));
    E.modifs = m && m.uid === E.uid ? { reps: frais(m.reps), dates: frais(m.dates) } : { reps: new Map(), dates: new Map() };
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
  const urlSure = u => { try { const x = new URL(u, location.href); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; } };
  // l'adresse d'un document public (un fichier du stockage public, ou un lien) ; null pour un fichier privé (signé à la demande)
  const urlDocument = x => (documentPrive(x) ? null : x.fichier ? `${PUBLIC}/${String(x.fichier).split('/').map(encodeURIComponent).join('/')}` : urlSure(x.url) || null);

  // ================================================================================================ la coquille de l'application
  function coquille() {
    if ($('#app > .appli')) return false;
    const badge = k => k === 'notifications' || k === 'planning';
    const onglet = (k, icone, court, long = court) => `<a class="nav-item" href="#/${k}" data-onglet="${k}"><span class="nav-icone">${icone}${badge(k) ? '<span class="pastille-nb" data-n="0" aria-hidden="true"></span>' : ''}</span><span class="nav-lib">${court === long ? esc(court) : `<span class="nav-lib-court">${esc(court)}</span><span class="nav-lib-long">${esc(long)}</span>`}</span>${badge(k) ? '<span class="sr nb-sr"></span>' : ''}</a>`;
    $('#app').innerHTML = `<div class="appli">
      <nav class="nav-appli" aria-label="Rubriques">
        <div class="nav-marque" aria-hidden="true"><span class="pieuvre" data-pieuvre></span><span class="nav-marque-texte"><span class="marque-nom">Crescite</span><small>équipe</small></span></div>
        <span class="nav-curseur" aria-hidden="true"></span>
        ${onglet('saison', ICONES.agenda, 'Saison', 'Ma saison')}
        ${onglet('feuilles', ICONES.feuille, 'Feuilles', 'Feuilles de route')}
        ${onglet('planning', ICONES.planning, 'Planning')}
        ${onglet('spectacles', ICONES.spectacle, 'Spectacles')}
        ${onglet('notifications', ICONES.cloche, 'Notifs', 'Notifications')}
        ${onglet('moi', `<span class="nav-avatar">${ICONES.moi}</span>`, 'Moi')}
        <p class="nav-pied"><span class="nav-nom"></span> <button type="button" class="lien-btn" data-sortir>Se déconnecter</button></p>
      </nav>
      <div class="colonne">
        <header class="barre-haut" id="barre-haut">
          <a class="bouton-rond retour" href="#/saison" data-retour data-tt="retour" hidden>${ICONES.retour}<span class="sr">Retour</span></a>
          <a class="marque-mini" href="#/saison"><span class="pieuvre" data-pieuvre aria-hidden="true"></span><span class="marque-nom">Crescite</span> <small>équipe</small></a>
          <p class="barre-titre" aria-hidden="true"></p>
          <div class="barre-actions"><button type="button" class="installer-barre" data-installer-barre hidden>${ICONES.installer}<span>Installer<span class="sr"> l’application</span></span></button><a class="bouton-rond cloche" href="#/notifications" data-cloche>${ICONES.cloche}<span class="pastille-nb" data-n="0" aria-hidden="true"></span><span class="sr">Notifications<span class="nb-sr"></span></span></a><button type="button" class="bouton-rond" data-actualiser title="Actualiser">${ICONES.actualiser}<span class="sr">Actualiser</span></button></div>
        </header>
        <div class="bandeau-etat" id="bandeau-etat"></div>
        <main id="contenu" tabindex="-1"></main>
      </div>
      <div class="tirer" id="tirer" aria-hidden="true"><span class="pieuvre" data-pieuvre-tirer></span></div>
      <div class="zone-bandeau" id="bandeau-notif" aria-live="polite"></div>
    </div>`;
    poserPieuvres();
    majCoquille();
    majInstallation();
    if (window.ResizeObserver) new ResizeObserver(() => placerCurseur(true)).observe($('.nav-appli'));
    return true;
  }
  function majCoquille() {
    const nom = $('.nav-nom');
    if (nom) nom.textContent = nomDe(E.personne);
    const av = $('.nav-avatar');
    if (av && E.personne) av.innerHTML = avatar(E.personne, { taille: 'nav' });
    majBadge();
    majBadgePlanning();
  }
  // le curseur des onglets : la pastille glisse d'un onglet à l'autre (sous l'icône au téléphone, sur la ligne à l'ordinateur)
  function placerCurseur(sansAnimation = false) {
    const nav = $('.nav-appli'), c = nav && $('.nav-curseur', nav), a = nav && $('.nav-item[aria-current]', nav);
    if (!c) return;
    if (!a) { c.style.opacity = '0'; return; }
    const cible = mq('(min-width: 760px)').matches ? a : $('.nav-icone', a);
    const rn = nav.getBoundingClientRect(), rc = cible.getBoundingClientRect();
    if (!rc.width) { c.style.opacity = '0'; return; }          // l'onglet est caché (les notifications, au téléphone)
    const premiere = !c.dataset.place;
    if (premiere || sansAnimation || reduit()) c.style.transition = 'none';
    c.style.width = `${rc.width}px`; c.style.height = `${rc.height}px`;
    c.style.transform = `translate(${rc.left - rn.left}px, ${rc.top - rn.top}px)`;
    c.style.opacity = '1';
    c.dataset.place = '1';
    nav.classList.add('curseur-pret');
    if (c.style.transition === 'none') { void c.offsetWidth; c.style.transition = ''; }
  }
  function majNav(r) {
    $$('.nav-item').forEach(a => { if (a.dataset.onglet === r.onglet) a.setAttribute('aria-current', r.profondeur ? 'true' : 'page'); else a.removeAttribute('aria-current'); });
    $$('[data-cloche]').forEach(a => { if (r.onglet === 'notifications') a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    placerCurseur();
  }
  const parentDe = r => E.pile[E.pile.length - 1] || (r.k === 'feuille' ? '#/feuilles' : r.k === 'spectacle' ? '#/spectacles'
    : r.k === 'frais' ? '#/moi' : ['proposition', 'propositions', 'indisponibilites', 'agendas'].includes(r.k) ? '#/planning' : '#/saison');
  function libelleDe(h) {
    const r = lireRoute(h);
    if (r.k === 'date') { const d = E.dates.find(x => x.id === r.id); return d ? d.spectacle?.titre || 'la date' : 'la date'; }
    if (r.k === 'spectacle') { const x = [...E.spectacles.values()].find(s => (s.slug || String(s.id)) === r.slug); return x ? x.titre : 'le spectacle'; }
    if (r.k === 'feuille') return 'la feuille de route';
    if (r.k === 'frais') return 'Notes de frais';
    return TITRES[r.k] || 'Ma saison';
  }
  function majBarre(r, titre) {
    const b = $('#barre-haut');
    if (!b) return;
    const sous = r.profondeur > 0, ret = $('[data-retour]', b);
    b.classList.toggle('sous', sous);
    ret.hidden = !sous;
    ret.setAttribute('href', parentDe(r));
    $('.sr', ret).textContent = `Retour : ${libelleDe(parentDe(r))}`;
    $('.barre-titre', b).textContent = titre;
    surDefilement();
  }
  function surDefilement() { const b = $('#barre-haut'); if (b) b.classList.toggle('defile', window.scrollY > 48); }
  window.addEventListener('scroll', surDefilement, { passive: true });
  window.addEventListener('resize', () => placerCurseur(true));

  function majTitre() {
    const n = E.notifs.filter(x => !x.lue_le).length;
    document.title = `${n ? `(${n}) ` : ''}${E.titre || 'Équipe'} · Crescite`;
  }
  function afficher(r, titre, html, { focus = false, large = false } = {}) {
    if (E.planning) demonterPlanning();
    coquille();
    majNav(r);
    majBarre(r, titre);
    teinter(r);
    const c = $('#contenu');
    c.className = `${large ? 'large' : ''}${E.rafraichi ? ' rafraichi' : ''}`;
    c.innerHTML = html;
    E.titre = titre; majTitre();
    bandeauEtat();
    apresRendu();
    if (focus) { const h = $('#contenu h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
  }
  // ce qui se règle une fois la vue posée : les cartes (à la largeur de l'écran), les chiffres, les frises, les décomptes
  function apresRendu() {
    $$('#contenu figure[data-carte]').forEach(f => { dessinerCarte(f); if (RO_CARTES) RO_CARTES.observe(f); });
    animerChiffres();
    majFrises();
  }
  // la page d'une date, d'une feuille de route ou d'un spectacle met l'application à la couleur de son univers : le curseur
  // des onglets, le retour, la marque (--accent et --accent-doux, lus par la feuille de style ; les autres vues gardent
  // le magenta). Les couleurs sont celles de couleurs(sp), déjà ajustées pour se lire sur le papier et la nuit.
  function teinter(r) {
    const app = $('#app > .appli');
    if (!app) return;
    let sp = null;
    if (r.k === 'date' || r.k === 'feuille') { const d = E.dates.find(x => x.id === r.id); sp = (d && d.spectacle) || null; }
    else if (r.k === 'spectacle') sp = [...E.spectacles.values()].find(s => (s.slug || String(s.id)) === r.slug) || null;
    if (!sp) { delete app.dataset.teinte; ['--teinte', '--teinte-s', '--teinte-douce', '--teinte-douce-s'].forEach(v => app.style.removeProperty(v)); return; }
    const c = couleurs(sp);
    app.dataset.teinte = c.u;
    app.style.setProperty('--teinte', c.texte); app.style.setProperty('--teinte-s', c.texteS);
    app.style.setProperty('--teinte-douce', c.fond); app.style.setProperty('--teinte-douce-s', c.fondS);
  }
  function bandeauEtat() {
    const el = $('#bandeau-etat');
    if (!el) return;
    const html = E.provisoire && !E.horsLigne ? '<p class="attente" role="status">Mise à jour en cours…</p>' : E.horsLigne ? `<p class="message horsligne" role="status"><span>Hors connexion : voici votre espace tel qu’il était ${esc(momentTexte(E.horsLigne))}. La fiche et les documents demandent le réseau${E.sansSession ? ' ; la connexion se renouvellera dès son retour' : ''}.</span>
      <button type="button" class="lien-btn" data-reessayer>Réessayer</button></p>` : '';
    if (el.dataset.h === html) return;                     // le bandeau ne se redessine (et n'entre) que s'il change
    el.dataset.h = html; el.innerHTML = html;
  }

  // ================================================================================================ les adresses et les transitions
  function lireRoute(h = location.hash) {
    let m = h.match(/^#\/date\/(\d+)$/);
    if (m) return { k: 'date', id: +m[1], onglet: 'saison', profondeur: 1, hash: h };
    if ((m = h.match(/^#\/feuille\/(\d+)$/))) return { k: 'feuille', id: +m[1], onglet: 'feuilles', profondeur: 1, hash: h };
    if ((m = h.match(/^#\/proposition\/(\d+)$/))) return { k: 'proposition', id: +m[1], onglet: 'planning', profondeur: 1, hash: h };
    if ((m = h.match(/^#\/(indisponibilites|agendas|propositions)$/))) return { k: m[1], onglet: 'planning', profondeur: 1, hash: h };
    if ((m = h.match(/^#\/frais(?:\?.*)?$/))) return { k: 'frais', onglet: 'moi', profondeur: 1, hash: h };
    if ((m = h.match(/^#\/spectacles\/([a-z0-9-]{1,80})$/))) return { k: 'spectacle', slug: m[1], onglet: 'spectacles', profondeur: 1, hash: h };
    if ((m = h.match(/^#\/(saison|feuilles|planning|spectacles|notifications|moi)$/))) return { k: m[1], onglet: m[1], profondeur: 0, hash: h };
    if (/^#\/documents(\/|$)/.test(h)) return { redirige: '#/spectacles' };         // les anciens liens, les notifications « document »
    return { redirige: h === '#/fiche' ? '#/moi' : '#/saison' };
  }
  const VUES = { saison: vueSaison, date: vueDate, feuilles: vueFeuilles, feuille: vueFeuille, spectacles: vueSpectacles, spectacle: vueSpectacle, notifications: vueNotifications, moi: vueMoi,
    planning: vuePlanning, indisponibilites: vueIndispos, agendas: vueAgendas, propositions: vuePropositions, proposition: vueProposition, frais: vueFrais };

  function router(o = {}) {
    if (!E.pret) return;
    const r = lireRoute();
    if (r.redirige) { history.replaceState(null, '', r.redirige); return router(o); }
    // les notes de frais demandent le septième script : sans lui, #/frais mène à #/moi (à l'ouverture, la page attend la
    // réponse de la base avant d'en décider)
    if (r.k === 'frais' && !avecIdeale() && !(SONDES.ideale === 'inconnu' && (E.provisoire || E.ouverture))) { history.replaceState(null, '', '#/moi'); return router(o); }
    const avant = E.route;
    if (avant && avant.k === 'moi' && r.k !== 'moi' && E.ficheSale && !o.rafraichir) {
      if (!confirm('Vos modifications de fiche ne sont pas enregistrées. Les abandonner ?')) { history.replaceState(null, '', '#/moi'); return; }
      E.ficheSale = false;
    }
    // la pile des vues ouvertes depuis un onglet : le retour y mène, et l'onglet reste celui d'où l'on vient
    let sens = 'aucun';
    if (avant && !o.rafraichir && !o.arrivee && avant.hash !== r.hash) {
      E.defil[avant.hash] = window.scrollY;
      if (E.pile.length && E.pile[E.pile.length - 1] === r.hash) { E.pile.pop(); sens = 'arriere'; }
      else if (r.profondeur === 0) { E.pile = []; const i = ONGLETS.indexOf(avant.onglet), j = ONGLETS.indexOf(r.onglet); sens = j > i ? 'avant' : j < i ? 'arriere' : avant.profondeur > 0 ? 'arriere' : 'fondu'; }
      else { E.pile.push(avant.hash); E.declencheur[avant.hash] = r.hash; sens = 'avant'; }
    } else if (o.arrivee) { E.pile = []; if ($('#contenu .squelette')) sens = 'fondu'; }      // du squelette au contenu, en fondu
    if (r.profondeur > 0) r.onglet = (E.pile.length && lireRoute(E.pile[0]).onglet) || (o.rafraichir && avant && avant.hash === r.hash ? avant.onglet : r.onglet);
    const partage = sens === 'avant' && avant && avant.k === 'saison' && r.k === 'date' ? { nom: `date-${r.id}`, avant: `.heros[data-date="${r.id}"], #billet-${r.id}`, apres: `.heros[data-date="${r.id}"]` }
      : sens === 'arriere' && avant && avant.k === 'date' && r.k === 'saison' ? { nom: `date-${avant.id}`, avant: `.heros[data-date="${avant.id}"]`, apres: `.heros[data-date="${avant.id}"], #billet-${avant.id}` } : null;
    E.route = r; E.vue = r.k; E.rafraichi = !!o.rafraichir;
    const y = o.rafraichir ? window.scrollY : sens === 'arriere' || (r.profondeur === 0 && sens !== 'aucun') ? (E.defil[r.hash] || 0) : 0;
    const rendre = () => {
      try { VUES[r.k](r, { focus: !o.arrivee && !o.rafraichir && sens !== 'arriere' }); } catch (e) { console.error(e); }
      window.scrollTo(0, y);
      if (sens === 'arriere') { const h = E.declencheur[r.hash], el = h && $(`#contenu a[href="${CSS.escape(h)}"]`); (el || $('#contenu h1'))?.focus({ preventScroll: true }); }
    };
    changerVue(rendre, sens, partage);
  }
  window.addEventListener('hashchange', () => router());
  window.addEventListener('beforeunload', e => { if (E.ficheSale) { e.preventDefault(); e.returnValue = ''; } });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // la vue change : avec les View Transitions, l'ancienne glisse et la nouvelle arrive (vers la gauche en allant plus loin,
  // vers la droite en revenant) ; la carte d'une date devient sa page. Sans elles, la nouvelle entre doucement.
  let transitionEnCours = null;
  function changerVue(maj, sens, partage) {
    const html = document.documentElement;
    if (E.glisse) {
      E.glisse = false;
      maj();
      const c = $('#contenu');
      if (c) { c.classList.remove('glisse', 'glisse-fin'); c.style.transform = ''; c.style.opacity = ''; }
      if (!reduit()) entree('arriere');
      return;
    }
    const peut = typeof document.startViewTransition === 'function' && !reduit() && document.visibilityState === 'visible' && sens !== 'aucun' && !!$('#app > .appli');
    if (!peut) { maj(); if (sens !== 'aucun' && !reduit()) entree(sens); return; }
    const source = partage ? $(partage.avant) : null;
    html.dataset.sens = source ? 'partage' : sens;
    if (source) source.style.viewTransitionName = partage.nom;
    try { if (transitionEnCours) transitionEnCours.skipTransition(); } catch (e) { /* déjà finie */ }
    let t;
    try {
      t = document.startViewTransition(() => {
        if (source) source.style.viewTransitionName = '';
        maj();
        const cible = source && $(partage.apres);
        if (cible) cible.style.viewTransitionName = partage.nom;
      });
    } catch (e) { if (source) source.style.viewTransitionName = ''; delete html.dataset.sens; maj(); return; }
    transitionEnCours = t;
    t.ready.catch(() => {});
    t.updateCallbackDone.catch(e => console.error(e));
    t.finished.catch(() => {}).finally(() => {
      if (transitionEnCours === t) { transitionEnCours = null; delete html.dataset.sens; }
      $$('[style*="view-transition-name"]').forEach(x => { x.style.viewTransitionName = ''; });
    });
  }
  function entree(sens) {
    const c = $('#contenu');
    if (!c) return;
    c.classList.remove('entree-avant', 'entree-arriere', 'entree-fondu');
    void c.offsetWidth;
    c.classList.add(sens === 'avant' ? 'entree-avant' : sens === 'arriere' ? 'entree-arriere' : 'entree-fondu');
  }

  // ================================================================================================ ma saison
  const ETATS = { option: 'Option, pas encore confirmée', annulee: 'Annulée', reportee: 'Reportée' };
  const ETATS_COURTS = { option: 'Option', annulee: 'Annulée', reportee: 'Reportée' };
  const PUBLICS = { scolaire: 'scolaire', tout_public: 'tout public', mixte: 'tout public et scolaire', autre: '' };
  const vivante = d => d.statut !== 'annulee' && d.statut !== 'reportee';

  // ce qui part dans l'agenda : chaque séance à venir à heure dite ; celles sans heure, un même jour pour un même public, en
  // un seul événement sur la journée ; et les dates à venir dont les séances ne sont pas détaillées. id : une seule date.
  function evenementsAVenir(id = null) {
    const auj = aujourdhui(), out = [];
    for (const d of E.dates) {
      if ((id != null && d.id !== id) || !vivante(d) || finDe(d) < auj || d.precision === 'mois' || d.precision === 'saison') continue;
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
  // « représentation scolaire », « tout public », « 2 représentations scolaires » ; « répétition », « résidence »
  const quoiRep = (n, pub) => (n > 1 ? `${n} représentations${pub === 'scolaire' ? ' scolaires' : pub === 'tout_public' ? ' tout public' : ''}`
    : pub === 'scolaire' ? 'représentation scolaire' : pub === 'tout_public' ? 'tout public' : 'représentation');
  function quoiSeance(n, pub, nat = 'representations') {
    if (nat === 'repetitions') return n > 1 ? `${n} répétitions` : 'répétition';
    if (nat === 'residence') return n > 1 ? `${n} journées de résidence` : 'résidence';
    if (nat === 'autre') return n > 1 ? `${n} rendez-vous` : 'rendez-vous';
    return quoiRep(n, pub);
  }

  function vueSaison(r, { focus }) {
    const auj = aujourdhui();
    const avenir = E.dates.filter(d => finDe(d) >= auj), passees = E.dates.filter(d => finDe(d) < auj);
    const vivantes = avenir.filter(vivante);
    const prochaine = vivantes.find(d => d.precision === 'jour' || d.precision === 'periode') || null;
    const suite = avenir.filter(d => d !== prochaine);
    const evs = evenementsAVenir(), nbReps = evs.filter(x => natureDe(x.d) === 'representations').reduce((n, x) => n + x.n, 0);
    const prenom = txt(E.personne?.prenom);
    const resume = [`Saison ${saisonDe(auj)}`, vivantes.length ? `${pluriel(vivantes.length, 'date')} à venir${nbReps ? `, ${pluriel(nbReps, 'représentation')}` : ''}` : 'aucune date à venir'].join(' · ');
    const quoi = [nbReps && (nbReps > 1 ? `vos ${pluriel(nbReps, 'représentation')}` : 'votre représentation'),
      evs.some(x => natureDe(x.d) !== 'representations') && 'vos répétitions'].filter(Boolean).join(' et ') || 'vos dates à venir';
    const principal = [], cote = [];
    const attente = enAttente();
    if (attente.length) principal.push(`<div class="o-props">${cartesPropositions(attente)}</div>`);
    principal.push(prochaine ? `<div class="o-heros">${heros(prochaine)}</div>`
      : `<div class="o-heros">${etatVide('calendrier', E.dates.length ? 'Pas de date à venir pour l’instant' : 'Votre saison commence ici', 'Dès que l’administration vous inscrira sur une date, elle apparaîtra ici, avec ses horaires, son lieu et sa feuille de route.')}</div>`);
    principal.push(jourJ());
    if (suite.length) principal.push(`<section class="o-suite" aria-labelledby="t-suite"><h2 class="titre-section" id="t-suite">${prochaine ? 'Ensuite' : 'À venir'}</h2>${parMois(suite)}</section>`);
    if (passees.length) principal.push(`<section class="o-passees" aria-labelledby="t-passees"><h2 class="titre-section" id="t-passees">Dates passées</h2><div class="saisons">${saisonsPassees(passees)}</div></section>`);
    cote.push(chiffres(), carteSaison());
    if (avenir.length) cote.push(`<section class="carte-action o-agenda" aria-labelledby="t-agenda"><span class="ic-rond" aria-hidden="true">${ICONES.agenda}</span>
      <div class="ca-texte"><h2 id="t-agenda">Dans votre agenda</h2><p class="aide">${evs.length ? `${esc(majuscule(quoi))}, avec l’adresse : un fichier .ics pour votre téléphone ou votre messagerie.` : 'Aucune séance à venir à ajouter pour l’instant.'}</p></div>
      <button type="button" class="btn" id="b-agenda"${evs.length ? '' : ' disabled'}>Ajouter à mon agenda</button></section>`);
    cote.push(`<div class="o-install" data-zone-installation="accueil">${zoneInstallation('accueil')}</div>`);
    const html = `<div class="titre-vue"><h1>${esc(salut())}${prenom ? ` ${esc(prenom)}` : ''}</h1><p class="sous">${esc(resume)}</p></div>
      <div class="accueil"><div class="col-principale">${principal.join('')}</div><div class="col-cote">${cote.join('')}</div></div>${piedVue()}`;
    afficher(r, TITRES.saison, html, { focus, large: true });
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
      const reps = ds.filter(d => vivante(d) && natureDe(d) === 'representations').reduce((n, d) => n + (d.representations.length ? d.representations.filter(r => !r.annulee).length : (d.nb_representations || 0)), 0);
      const compte = [s === actuelle && 'en cours', pluriel(ds.length, s === actuelle ? 'date passée' : 'date', s === actuelle ? 'dates passées' : 'dates'), reps && pluriel(reps, 'représentation')].filter(Boolean).join(' · ');
      return `<details class="saison" data-saison="${esc(s)}"><summary><span class="s-texte"><span class="s-nom">Saison ${esc(s)}</span> <span class="s-compte">${compte}</span></span></summary><div class="saison-corps"></div></details>`;
    }).join('');
  }
  // une saison passée se dessine à l'ouverture
  function remplirSaison(det, { entree = true } = {}) {
    const corps = $('.saison-corps', det);
    if (!corps || corps.childElementCount) return;
    if (entree && !reduit()) { corps.classList.add('neuve'); setTimeout(() => corps.classList.remove('neuve'), 1200); }   // ses billets arrivent l'un après l'autre
    const s = det.dataset.saison, auj = aujourdhui();
    const ds = E.dates.filter(d => finDe(d) < auj && (d.saison || saisonDe(d.debut)) === s).reverse();
    corps.innerHTML = ds.map(d => billet(d, { passee: true })).join('');
  }
  document.addEventListener('toggle', e => { if (e.target.matches?.('details.saison[data-saison]') && e.target.open) remplirSaison(e.target); }, true);

  // la prochaine séance qui n'est pas finie (la séance en cours compte encore)
  function prochaineSeance(d, maintenant = new Date()) {
    const auj = iso(maintenant), min = maintenant.getHours() * 60 + maintenant.getMinutes();
    return d.representations.filter(x => !x.annulee && estJour(x.jour)).sort((a, b) => (a.jour + h5(a.heure)).localeCompare(b.jour + h5(b.heure)))
      .find(x => x.jour > auj || (x.jour === auj && (!x.heure || (minutesDe(x.fin) ?? (minutesDe(x.heure) + 120)) > min))) || null;
  }
  // le compte à rebours du héros : « dans 3 jours », « Demain à 14h00 », « dans 2 h 15 », « En scène depuis 20h00 »
  function compte(d) {
    if (d.precision === 'mois' || d.precision === 'saison' || !vivante(d)) return null;
    const now = new Date(), auj = iso(now), min = now.getHours() * 60 + now.getMinutes(), nat = natureDe(d);
    const r = prochaineSeance(d, now);
    const jour = r ? r.jour : (d.debut > auj ? d.debut : null);
    if (!jour) return finDe(d) >= auj ? { grand: 'En cours' } : null;
    const n = ecartJours(auj, jour), quand = r && r.heure ? `à ${heureTexte(r.heure)}` : '';
    if (n >= 2) return { avant: 'dans', grand: String(n), unite: 'jours' };
    if (n === 1) return { grand: 'Demain', petit: quand };
    if (!r || !r.heure) return { grand: 'Aujourd’hui' };
    const m = minutesDe(r.heure) - min;
    if (m > 180) { const h = +r.heure.slice(0, 2); return { grand: h >= 18 ? 'Ce soir' : h >= 12 ? 'Cet après-midi' : 'Ce matin', petit: quand }; }
    if (m > 0) { const h = Math.floor(m / 60), mm = m % 60; return { avant: 'dans', grand: h ? `${h}\u00a0h\u00a0${deux(mm)}` : `${mm}\u00a0min`, petit: nat === 'representations' ? `lever de rideau ${quand}` : quand }; }
    return { grand: nat === 'repetitions' ? 'En répétition' : nat === 'representations' ? 'En scène' : 'En cours', petit: `depuis ${heureTexte(r.heure)}`, direct: true };
  }
  // chaque chiffre dans son propre span : quand le compte change, ils roulent l'un après l'autre (--i) ; « En scène » a sa lampe
  const chiffresRoulants = s => [...String(s)].map((c, i) => (/\d/.test(c) ? `<span class="d" style="--i:${i}">${c}</span>` : esc(c))).join('');
  const decompteHtml = k => `${k.avant ? `<span class="dc-avant">${esc(k.avant)}</span> ` : ''}${k.direct ? '<span class="lampe" aria-hidden="true"></span>' : ''}<b class="chiffre${/^\d/.test(k.grand) ? '' : ' mot'}">${chiffresRoulants(k.grand)}</b>${k.unite ? ` <span class="unite">${esc(k.unite)}</span>` : ''}${k.petit ? ` <span class="dc-petit">${esc(k.petit)}</span>` : ''}`;
  function majDecomptes() {
    $$('[data-decompte]').forEach(el => {
      const d = E.dates.find(x => x.id === +el.dataset.decompte), k = d && compte(d);
      if (k) {
        const h = decompteHtml(k);
        if (el.dataset.h === h) return;
        const roule = el.dataset.h != null && !reduit();          // le premier passage pose le compte, les suivants le font rouler
        el.innerHTML = h; el.dataset.h = h;
        if (roule) { el.classList.remove('roule'); void el.offsetWidth; el.classList.add('roule'); }
      }
    });
  }
  // le petit décompte des billets : « ce soir », « demain », « dans 3 jours », « dans 2 semaines »
  function decompte(d) {
    if (d.precision === 'mois' || d.precision === 'saison') return '';
    const auj = aujourdhui(), r = prochaineSeance(d);
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
    return `dans ${Math.round(n / 30.44)} mois`;
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

  // le héros : la prochaine date, en grand, dans l'univers de son spectacle (sa photo, ses couleurs, sa police)
  function heros(d, { page = false } = {}) {
    const sp = d.spectacle || {}, c = couleurs(sp), f = police(sp), nat = natureDe(d), photo = photoDe(sp);
    const etat = ETATS_COURTS[d.statut];
    const lib = page ? (nat === 'representations' ? (finDe(d) < aujourdhui() ? 'Date passée' : 'Date de tournée') : NATURES[nat])
      : nat === 'repetitions' ? 'Prochaine répétition' : nat === 'residence' ? 'Prochaine résidence' : nat === 'autre' ? 'Prochain rendez-vous' : 'Prochaine date';
    const k = finDe(d) >= aujourdhui() ? compte(d) : null;
    const gens = vivante(d) ? quiPart(d) : [];
    const balise = page ? 'h1' : 'h2', titre = esc(sp.titre || 'Spectacle');
    const style = `--h-fond:${c.hFond};--h-texte:${c.hTexte};--h-accent:${c.hAccent}${f ? `;--h-police:${f.famille};--h-graisse:${f.graisse}` : ''}`;
    const actions = page ? '' : [
      d.feuille && outilFeuille() ? `<a class="btn petit" href="#/feuille/${d.id}">${ICONES.feuille}Feuille de route<span class="sr"> : ${titre}</span></a>` : '',
      d.lieu && itineraire(d.lieu) ? `<a class="btn petit verre" href="${esc(itineraire(d.lieu))}" target="_blank" rel="noopener">${ICONES.route}Itinéraire<span class="sr"> jusqu’à ${esc(d.lieu.nom || d.lieu.commune || '')}, nouvel onglet</span></a>` : '',
    ].filter(Boolean).join('');
    return `<article class="heros${page ? ' heros-page' : ''}${photo ? ' avec-photo' : ''}${etat ? ` ${d.statut}` : ''}" data-date="${d.id}" style="${esc(style)}" aria-labelledby="hx-${d.id}">
      ${photo ? `<div class="heros-photo" aria-hidden="true"><img src="${esc(photo)}" alt="" decoding="async" crossorigin="anonymous"${page ? '' : ' fetchpriority="high"'}></div>` : ''}
      <div class="heros-motif" aria-hidden="true"></div>
      <div class="heros-corps">
        <p class="heros-haut"><span class="etiquette-verre">${esc(lib)}</span>${etat ? ` <span class="etiquette-verre etat-${d.statut}">${esc(etat)}</span>` : ''}${E.modifs.dates.has(d.id) ? ' <span class="etiquette-verre modifiee">Mise à jour</span>' : ''}</p>
        <${balise} class="heros-titre" id="hx-${d.id}">${page ? titre : `<a class="lien-etendu" href="#/date/${d.id}">${titre}</a>`}</${balise}>
        <p class="heros-quand">${esc(majuscule(quandTexte(d)))}</p>
        ${k ? `<p class="decompte-grand" data-decompte="${d.id}">${decompteHtml(k)}</p>` : ''}
        ${page ? '' : horairesHeros(d)}
        <p class="heros-ou">${ICONES.route}<span><span class="sr">Lieu : </span>${lieuTexteHtml(d)}</span></p>
        ${gens.length || actions ? `<div class="heros-pied">${gens.length ? `<span class="mini-equipe">${miniAvatars(gens)}<span class="sr">${pluriel(gens.length, 'personne')} sur cette date</span></span>` : '<span></span>'}${actions ? `<span class="heros-actions">${actions}</span>` : ''}</div>` : ''}
      </div>
    </article>`;
  }
  // les séances du prochain jour joué, en pastilles : « 14h00 scolaire », « 10h00 – 18h00 répétition »
  function horairesHeros(d) {
    const r0 = prochaineSeance(d) || d.representations.find(x => !x.annulee);
    if (!r0) return d.representations.length ? '' : '<p class="heros-sans">Horaires pas encore indiqués</p>';
    const nat = natureDe(d), seances = d.representations.filter(x => x.jour === r0.jour).sort((a, b) => h5(a.heure).localeCompare(h5(b.heure)));
    const plusieurs = new Set(d.representations.map(x => x.jour)).size > 1;
    const sansHeure = seances.filter(x => !x.heure && !x.annulee);
    const lignes = seances.filter(x => x.heure).map(x => `<li${x.annulee ? ' class="annulee"' : ''}><b>${esc(heureTexte(x.heure))}${x.fin ? `\u2009–\u2009${esc(heureTexte(x.fin))}` : ''}</b> ${esc(nat === 'representations' ? (PUBLICS[x.public] || '') : NATURES[nat].toLowerCase().replace(/s$/, ''))}${x.annulee ? ' <span class="sr">(annulée)</span>' : ''}${E.modifs.reps.has(x.id) ? ' <span class="modifie">modifié</span>' : ''}</li>`);
    if (sansHeure.length) lignes.push(`<li><b>${sansHeure.length > 1 ? `${sansHeure.length}\u00a0×` : '–'}</b> ${esc(sansHeure.length > 1 ? `${quoiSeance(sansHeure.length, sansHeure[0].public, nat).replace(/^\d+\s/, '')}, heures à préciser` : 'heure à préciser')}</li>`);
    return `${plusieurs ? `<p class="heros-jour">${esc(majuscule(jourSansAn(r0.jour)))}</p>` : ''}<ul class="horaires-heros" aria-label="Horaires">${lignes.join('')}</ul>`;
  }

  // le jour J sur l'accueil : le planning du jour (celui de la feuille de route, sinon les séances), en frise
  function jourJ() {
    const auj = aujourdhui(), d = E.dates.filter(vivante).find(x => joursDe(x).includes(auj));
    if (!d) return '';
    const lignes = lignesPlanning(d, E.feuilles.get(d.id)).filter(x => x.jour === auj || (!x.jour && joursDe(d).length === 1));
    if (!lignes.length) return '';
    const sp = d.spectacle || {}, l = d.lieu;
    return `<section class="jourj o-jourj"${attrU(sp)} aria-labelledby="t-jourj"><h2 id="t-jourj">${ICONES.horloge}<span>Aujourd’hui · ${esc(sp.titre || '')}${l ? ` à ${esc(l.commune || l.nom)}` : ''}</span></h2>
      ${frise(lignes, { unJour: true })}
      ${d.feuille ? `<p class="liens"><a class="btn petit" href="#/feuille/${d.id}">${ICONES.feuille}Toute la feuille de route</a></p>` : ''}</section>`;
  }
  // le planning d'une date : FEUILLE.planning s'il existe, sinon le planning de la feuille (contenu.planning), sinon les séances
  function lignesPlanning(d, f) {
    let xs = [];
    try {
      const F = outilFeuille();
      if (f && F && typeof F.planning === 'function') xs = (F.planning(f, contexte(d)) || []).map(x => ({ jour: estJour(x.jour) ? x.jour : '', heure: h5(x.heure), fin: h5(x.fin), quoi: majuscule(txt(x.texte || x.quoi)), qui: txt(x.qui), ou: txt(x.ou), rep: !!(x.accent || x.rep) }));
      else if (f && f.contenu && Array.isArray(f.contenu.planning)) xs = f.contenu.planning.filter(Boolean).map(x => ({ jour: estJour(x.jour) ? x.jour : '', heure: h5(x.heure), fin: h5(x.fin), quoi: txt(x.quoi), qui: txt(x.qui), ou: txt(x.ou), rep: x.rep === true || /^repr[ée]sentation/i.test(txt(x.quoi)) }));
    } catch (e) { console.warn('planning', e); xs = []; }
    xs = xs.filter(x => x.quoi || x.heure);
    if (!xs.length) xs = d.representations.filter(r => !r.annulee && estJour(r.jour)).map(r => ({ jour: r.jour, heure: h5(r.heure), fin: h5(r.fin), quoi: majuscule(quoiSeance(1, r.public, natureDe(d))), qui: '', ou: txt(r.note), rep: true }));
    const cle = r => `${r.jour || '9999-99-99'} ${r.heure ? r.heure.padStart(5, '0') : '99:99'}`;
    return xs.map((r, i) => [r, i]).sort((a, b) => cle(a[0]).localeCompare(cle(b[0])) || a[1] - b[1]).map(x => x[0]);
  }
  // une frise : chaque étape à son heure ; celle qui se passe maintenant bat, celles d'avant pâlissent (majFrises)
  function frise(lignes, { unJour = false } = {}) {
    const groupes = [];
    lignes.forEach(r => { let g = groupes.find(x => x.jour === r.jour); if (!g) groupes.push(g = { jour: r.jour, lignes: [] }); g.lignes.push(r); });
    const ol = xs => `<ol class="frise" data-frise>${xs.map((r, i) => {
      const s = xs[i + 1], fin = r.fin || (s && s.heure ? s.heure : '');
      return `<li class="${r.rep ? 'accent' : ''}" data-jour="${esc(r.jour)}" data-debut="${esc(r.heure)}" data-fin="${esc(fin)}"><span class="h">${r.heure ? esc(heureTexte(r.heure)) : '<span aria-hidden="true">–</span><span class="sr">heure à préciser</span>'}</span>
        <span class="t">${esc(r.quoi)}${r.fin ? ` <span class="jusqu">jusqu’à ${esc(heureTexte(r.fin))}</span>` : ''}${r.qui || r.ou ? `<span class="s">${esc([r.qui, r.ou].filter(Boolean).join(' · '))}</span>` : ''}</span></li>`;
    }).join('')}</ol>`;
    if (unJour || groupes.length === 1) return ol(lignes);
    return groupes.map(g => `<h3 class="jour-frise">${esc(g.jour ? majuscule(jourSansAn(g.jour)) : 'Jour à préciser')}</h3>${ol(g.lignes)}`).join('');
  }
  // la feuille de route en direct : le jour J, dans la feuille publiée, les lignes du planning déjà passées pâlissent et
  // celle qui se passe maintenant se marque (comme la frise). Le jour se reconnaît à son titre (« mardi 27 octobre »),
  // l'heure au début de la ligne (« 9h30 : », « 10h-11h : ») ; une ligne sans heure (le déjeuner) suit la précédente.
  const RE_HEURE_LIGNE = /^\s*(\d{1,2})h(\d{2})?(?:\s*-\s*(\d{1,2})h(\d{2})?)?\s*:/;
  function majFeuilleDirect(auj, m) {
    const fdr = $('.feuille-cadre .fdr');
    if (!fdr) return;
    $$('.passe, .maintenant', fdr).forEach(x => { x.classList.remove('passe', 'maintenant'); x.removeAttribute('aria-current'); });
    const titreJour = jourLong(auj).replace(/ \d{4}$/, '').toLowerCase();
    let dedans = false;
    const lignes = [];
    for (const el of fdr.children) {
      if (el.matches('h3.fdr-jour')) { dedans = el.textContent.trim().toLowerCase().startsWith(titreJour); continue; }
      if (el.matches('h2, header')) { dedans = false; continue; }
      if (!dedans || !el.matches('p.fdr-p')) continue;
      const x = RE_HEURE_LIGNE.exec(el.textContent);
      lignes.push({ el, a: x ? +x[1] * 60 + +(x[2] || 0) : null, b: x && x[3] ? +x[3] * 60 + +(x[4] || 0) : null });
    }
    let etat = '';
    lignes.forEach((l, i) => {
      if (l.a == null) { if (etat === 'passe') l.el.classList.add('passe'); return; }
      const s = lignes.slice(i + 1).find(y => y.a != null), fin = l.b != null && l.b > l.a ? l.b : s ? s.a : l.a + 45;
      etat = m >= fin ? 'passe' : m >= l.a ? 'maintenant' : '';
      if (etat) l.el.classList.add(etat);
      if (etat === 'maintenant') l.el.setAttribute('aria-current', 'time');
    });
  }
  function majFrises() {
    const auj = aujourdhui(), now = new Date(), m = now.getHours() * 60 + now.getMinutes();
    majFeuilleDirect(auj, m);
    $$('[data-frise]').forEach(ol => {
      let suivant = null;
      $$('li[data-debut]', ol).forEach(li => {
        const j = li.dataset.jour, a = minutesDe(li.dataset.debut), b = minutesDe(li.dataset.fin);
        let etat = '';
        if (j && j < auj) etat = 'passe';
        else if (j === auj && a != null) {
          const fin = b != null && b > a ? b : a + 45;
          etat = m >= fin ? 'passe' : m >= a ? 'maintenant' : '';
          // le trait « maintenant » descend le long de l'étape en cours (--avance, de 0 à 1) ; la prochaine étape des deux
          // heures à venir dit dans combien de temps elle vient
          if (etat === 'maintenant') li.style.setProperty('--avance', Math.min(1, (m - a) / (fin - a)).toFixed(3)); else li.style.removeProperty('--avance');
          if (!etat && !suivant && a - m <= 120) suivant = { li, dans: a - m };
        }
        li.classList.toggle('passe', etat === 'passe');
        li.classList.toggle('maintenant', etat === 'maintenant');
        if (etat === 'maintenant') li.setAttribute('aria-current', 'time'); else li.removeAttribute('aria-current');
      });
      $$('.dans', ol).forEach(x => { if (!suivant || x.closest('li') !== suivant.li) x.remove(); });
      if (suivant) {
        const h = $('.h', suivant.li), n = suivant.dans, texte = n <= 0 ? 'à l’instant' : n < 60 ? `dans ${n}\u00a0min` : `dans ${Math.floor(n / 60)}\u00a0h\u00a0${deux(n % 60)}`;
        let x = h && $('.dans', h);
        if (h && !x) { x = document.createElement('span'); x.className = 'dans'; h.append(x); }
        if (x && x.textContent !== texte) x.textContent = texte;
      }
    });
  }

  // la saison en chiffres : les dates, les représentations, les kilomètres (estimés : la distance à vol d'oiseau depuis Rouen,
  // un quart en plus pour la route, aller et retour)
  function kmDe(l) {
    if (!l || l.latitude == null || l.longitude == null || !Number.isFinite(+l.latitude) || !Number.isFinite(+l.longitude)) return 0;
    const rad = Math.PI / 180, [a, b] = ROUEN, la = +l.latitude, lo = +l.longitude;
    const h = Math.sin((la - a) * rad / 2) ** 2 + Math.cos(a * rad) * Math.cos(la * rad) * Math.sin((lo - b) * rad / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h)) * 1.25;
  }
  function chiffres() {
    const s = saisonDe(aujourdhui()), ds = E.dates.filter(d => (d.saison || saisonDe(d.debut)) === s && vivante(d));
    if (!ds.length) return '';
    const reps = ds.filter(d => natureDe(d) === 'representations').reduce((n, d) => n + (d.representations.length ? d.representations.filter(r => !r.annulee).length : (d.nb_representations || 0)), 0);
    const km = Math.round(ds.reduce((t, d) => t + kmDe(d.lieu) * 2, 0) / 10) * 10;
    const chiffre = (n, un, plusieurs) => `<li><b><span data-compter="${n}" aria-hidden="true">${nombre(n)}</span><span class="sr">${nombre(n)}</span></b><span>${n > 1 ? plusieurs : un}</span></li>`;
    return `<section class="o-chiffres" aria-labelledby="t-chiffres"><h2 class="titre-section" id="t-chiffres">La saison ${esc(s)}</h2>
      <ul class="chiffres" style="--em:${largeurChiffres([ds.length, reps, km])}">${chiffre(ds.length, 'date', 'dates')}${chiffre(reps, 'repré\u00adsentation', 'repré\u00adsentations')}${km ? chiffre(km, 'km de route, estimés', 'km de route, estimés') : ''}</ul></section>`;
  }
  // la largeur du plus long des trois nombres, en em de Work Sans 800 (chiffres tabulaires 0,584 em, espace fine 0,24 em) :
  // la feuille de style en tire une taille commune qui tient dans la tuile (« 15 100 » ne se coupe pas)
  const largeurChiffres = ns => Math.max(1.2, ...ns.map(n => [...nombre(n)].reduce((t, c) => t + (/\d/.test(c) ? 0.584 : 0.24), 0))).toFixed(2);
  function animerChiffres() {
    // les chiffres de la saison ne se comptent qu'une fois par session ; les kilomètres d'une date (data-route), à chaque page
    const els = $$('#contenu [data-compter]').filter(el => el.hasAttribute('data-route') || !E.chiffresVus);
    if (!els.length || reduit()) return;
    if (els.some(el => !el.hasAttribute('data-route'))) E.chiffresVus = true;
    const fin = els.map(el => +el.dataset.compter || 0), t0 = performance.now(), D = 900;
    const pas = t => {
      const u = Math.min(1, (t - t0) / D), e = 1 - (1 - u) ** 3;
      els.forEach((el, i) => { if (el.isConnected) el.textContent = nombre(Math.round(fin[i] * e)); });
      if (u < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  }

  // ================================================================================================ la carte de la tournée
  // la France, et un bras de Rouen jusqu'à chaque lieu (comme la carte des maquettes) : à la couleur du spectacle pour les
  // lieux à venir, en retrait pour ceux déjà joués. La projection est celle de maquettes/build.py (conique conforme de
  // Lambert, recalée sur les communes connues).
  function projeter(lat, lon) {
    const P = FRANCE && FRANCE.projection;
    if (!P || lat == null || lon == null || !Number.isFinite(+lat) || !Number.isFinite(+lon)) return null;
    const rad = Math.PI / 180, f1 = 44 * rad, f2 = 49 * rad, f0 = 46.5 * rad;
    const n = Math.log(Math.cos(f1) / Math.cos(f2)) / Math.log(Math.tan(Math.PI / 4 + f2 / 2) / Math.tan(Math.PI / 4 + f1 / 2));
    const F = Math.cos(f1) * Math.tan(Math.PI / 4 + f1 / 2) ** n / n, rho = f => F / Math.tan(Math.PI / 4 + f / 2) ** n;
    const r = rho(+lat * rad), th = n * (+lon - 3) * rad, u = r * Math.sin(th), v = rho(f0) - r * Math.cos(th);
    const xy = [P.cx[0] * u + P.cx[1] * v + P.cx[2], P.cy[0] * u + P.cy[1] * v + P.cy[2]];
    const [bx, by, bw, bh] = String(FRANCE.viewBox).split(/\s+/).map(Number);
    return xy[0] >= bx - 40 && xy[0] <= bx + bw + 40 && xy[1] >= by - 40 && xy[1] <= by + bh + 40 ? xy : null;   // l'outre-mer : pas sur cette carte
  }
  function lieuxCarte(dates) {
    const auj = aujourdhui(), par = new Map();
    for (const d of dates) {
      const l = d.lieu, xy = l && projeter(l.latitude, l.longitude);
      if (!xy) continue;
      const cle = l.id ?? `${l.latitude},${l.longitude}`;
      if (!par.has(cle)) par.set(cle, { xy, commune: l.commune || l.nom || '', dep: l.departement || '', nom: l.nom || '', dates: [] });
      par.get(cle).dates.push(d);
    }
    return [...par.values()].map(x => {
      const avenir = x.dates.filter(d => finDe(d) >= auj && vivante(d)), ref = avenir[0] || x.dates[x.dates.length - 1];
      return { ...x, avenir: avenir.length > 0, ref, couleur: couleurs(ref.spectacle).u, n: x.dates.length };
    });
  }
  function carteSaison() {
    if (!FRANCE) return '';
    const s = saisonDe(aujourdhui()), lieux = lieuxCarte(E.dates.filter(d => (d.saison || saisonDe(d.debut)) === s && vivante(d)));
    if (!lieux.length) return '';
    const legende = new Map();
    lieux.filter(x => x.avenir).forEach(x => { if (!legende.has(x.couleur)) legende.set(x.couleur, x.ref.spectacle?.titre || ''); });
    E.cartes.set('saison', { lieux, titre: `La tournée de la saison ${s} : ${pluriel(lieux.length, 'lieu', 'lieux')}, depuis Rouen` });
    return `<section class="o-carte" aria-labelledby="t-carte"><h2 class="titre-section" id="t-carte">La tournée</h2>
      <figure class="carte-tournee" data-carte="saison"><div class="carte-svg"></div>
        <figcaption>${[...legende].map(([c, t]) => `<span class="legende"><i style="--c:${esc(c)}"></i>${esc(t)}</span>`).join('')}${lieux.some(x => !x.avenir) ? '<span class="legende passe"><i></i>déjà joué</span>' : ''}</figcaption></figure></section>`;
  }
  function cadreCarte(lieux, mini) {
    const R = FRANCE.rouen, xs = [R[0], ...lieux.map(l => l.xy[0])], ys = [R[1], ...lieux.map(l => l.xy[1])];
    const m = mini ? 34 : 46, min = mini ? 190 : 280;
    let x0 = Math.min(...xs) - m, x1 = Math.max(...xs) + m, y0 = Math.min(...ys) - m, y1 = Math.max(...ys) + m;
    if (x1 - x0 < min) { const c = (x0 + x1) / 2; x0 = c - min / 2; x1 = c + min / 2; }
    if (y1 - y0 < min * 0.7) { const c = (y0 + y1) / 2; y0 = c - min * 0.35; y1 = c + min * 0.35; }
    const haut = mini ? 2.1 : 1.35, bas = mini ? 1.5 : 0.85;          // ni trop haute ni trop large
    if ((x1 - x0) / (y1 - y0) > haut) { const c = (y0 + y1) / 2, h = (x1 - x0) / haut; y0 = c - h / 2; y1 = c + h / 2; }
    if ((x1 - x0) / (y1 - y0) < bas) { const c = (x0 + x1) / 2, w = (y1 - y0) * bas; x0 = c - w / 2; x1 = c + w / 2; }
    return [x0, y0, x1 - x0, y1 - y0].map(v => Math.round(v));
  }
  const controle = ([x, y], [rx, ry], courbe = 0.24) => [(rx + x) / 2 - (y - ry) * courbe, (ry + y) / 2 + (x - rx) * courbe];
  // un bras plein, effilé, de Rouen jusqu'au lieu
  function brasCarte(xy, w0, w1) {
    const R = FRANCE.rouen, [rx, ry] = R, [x, y] = xy;
    if (Math.hypot(x - rx, y - ry) < 4) return '';
    const [qx, qy] = controle(xy, R), N = 26, G = [], D = [];
    for (let k = 0; k <= N; k++) {
      const t = k / N, a = (1 - t) ** 2, b = 2 * (1 - t) * t, c = t * t;
      const px = a * rx + b * qx + c * x, py = a * ry + b * qy + c * y;
      let tx = 2 * (1 - t) * (qx - rx) + 2 * t * (x - qx), ty = 2 * (1 - t) * (qy - ry) + 2 * t * (y - qy);
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const w = (w0 * (1 - t) + w1 * t) / 2;
      G.push(`${(px - ty * w).toFixed(1)} ${(py + tx * w).toFixed(1)}`); D.push(`${(px + ty * w).toFixed(1)} ${(py - tx * w).toFixed(1)}`);
    }
    return `M${G.join('L')}L${D.reverse().join('L')}Z`;
  }
  // une petite spirale qui enroule le bout du bras
  function boutCarte(xy, r) {
    const [qx, qy] = controle(xy, FRANCE.rouen), [x, y] = xy, a = Math.atan2(y - qy, x - qx), N = 26, pts = [];
    const cx = x + Math.cos(a + Math.PI / 2) * r, cy = y + Math.sin(a + Math.PI / 2) * r, a0 = Math.atan2(y - cy, x - cx);
    for (let k = 0; k <= N; k++) { const t = k / N, an = a0 + t * 1.2 * 2 * Math.PI, rr = r * (1 - 0.7 * t); pts.push(`${(cx + Math.cos(an) * rr).toFixed(1)} ${(cy + Math.sin(an) * rr).toFixed(1)}`); }
    return `M${pts.join('L')}`;
  }
  // les noms des lieux à venir : à droite du point, sinon à gauche, sans se chevaucher ni sortir du cadre
  function nomsCarte(lieux, k, [bx, by, bw, bh], tous = lieux) {
    const R = FRANCE.rouen, fs = 12.5 * k, h = fs * 1.25, ecart = 8 * k;
    // déjà pris : le nom de Rouen, son point, et chaque point de la carte
    const boites = [[R[0] + 8 * k, R[1] - 22 * k, 46 * k, 18 * k], [R[0] - 7 * k, R[1] - 7 * k, 14 * k, 14 * k], ...tous.map(x => [x.xy[0] - 5 * k, x.xy[1] - 5 * k, 10 * k, 10 * k])];
    const libre = b => b[0] > bx + 2 * k && b[0] + b[2] < bx + bw - 2 * k && b[1] > by + 2 * k && b[1] + b[3] < by + bh - 2 * k
      && boites.every(c => b[0] >= c[0] + c[2] || c[0] >= b[0] + b[2] || b[1] >= c[1] + c[3] || c[1] >= b[1] + b[3]);
    return lieux.map(x => {
      const [px, py] = x.xy, w = x.commune.length * fs * 0.56;
      let gauche = false, b = [px + ecart, py - h / 2, w, h];
      if (!libre(b)) { gauche = true; b = [px - ecart - w, py - h / 2, w, h]; }
      if (!libre(b)) return '';
      boites.push(b);
      return `<text class="lieu-nom-carte" x="${(gauche ? px - ecart : px + ecart).toFixed(1)}" y="${(py + fs * 0.35).toFixed(1)}"${gauche ? ' text-anchor="end"' : ''} style="font-size:${fs.toFixed(2)}px;stroke-width:${(3.4 * k).toFixed(2)}px" aria-hidden="true">${esc(x.commune)}</text>`;
    }).join('');
  }
  const RO_CARTES = window.ResizeObserver ? new ResizeObserver(es => es.forEach(e => dessinerCarte(e.target))) : null;
  function dessinerCarte(fig) {
    const info = E.cartes.get(fig.dataset.carte), zone = $('.carte-svg', fig);
    if (!info || !FRANCE || !zone || !fig.isConnected) return;
    const largeur = zone.clientWidth || fig.clientWidth || 320;
    if (zone.dataset.largeur && Math.abs(+zone.dataset.largeur - largeur) < 12 && zone.firstElementChild) return;
    zone.dataset.largeur = largeur;
    const [bx, by, bw, bh] = cadreCarte(info.lieux, info.mini), k = bw / largeur, R = FRANCE.rouen;
    const loin = x => Math.hypot(x.xy[0] - R[0], x.xy[1] - R[1]), tri = [...info.lieux].sort((a, b) => loin(b) - loin(a) || a.avenir - b.avenir);
    const anime = !zone.dataset.anime && !reduit(), id = `carte-${fig.dataset.carte}`, rayon = Math.round(Math.hypot(bw, bh) * 1.3);
    zone.dataset.anime = '1';
    const ids = x => x.dates.map(d => d.id).join(' ');
    const bras = tri.map(x => `<path class="bras${x.avenir ? '' : ' passe'}" style="--c:${esc(x.couleur)}" data-dates="${ids(x)}" d="${brasCarte(x.xy, (x.avenir ? 2.6 + Math.sqrt(x.n) * 1.3 : 1.6) * k, 0.5 * k)}"/>`).join('');
    const bouts = tri.filter(x => x.avenir && loin(x) > 18 * k).map(x => `<path class="bout" style="--c:${esc(x.couleur)};stroke-width:${(1.5 * k).toFixed(2)}px" d="${boutCarte(x.xy, 4.4 * k)}"/>`).join('');
    // la carte d'une date : la route, en pointillé, avance de Rouen jusqu'au lieu le long du bras (pathLength : le tiret se
    // règle sur cent unités quelle que soit la longueur)
    const routes = info.mini ? tri.filter(x => x.avenir && loin(x) > 18 * k).map(x => { const [qx, qy] = controle(x.xy, R); return `<path class="route" pathLength="100" style="stroke-width:${(1.7 * k).toFixed(2)}px" d="M${R[0]} ${R[1]}Q${qx.toFixed(1)} ${qy.toFixed(1)} ${x.xy[0].toFixed(1)} ${x.xy[1].toFixed(1)}"/>`; }).join('') : '';
    const points = tri.map(x => {
      const lib = `${x.commune}${x.dep ? ` (${x.dep})` : ''}${x.nom && x.nom !== x.commune ? `, ${x.nom}` : ''} : ${x.dates.map(d => `${d.spectacle?.titre || ''}, ${quandTexte(d)}`).join(' ; ')}`;
      return `<a class="lieu-carte${x.avenir ? '' : ' passe'}" href="#/date/${x.ref.id}" data-dates="${ids(x)}" aria-label="${esc(lib)}"><circle class="cible" cx="${x.xy[0].toFixed(1)}" cy="${x.xy[1].toFixed(1)}" r="${(13 * k).toFixed(2)}"/>
        <circle class="point" style="--c:${esc(x.couleur)};stroke-width:${((x.avenir ? 2.4 : 1.4) * k).toFixed(2)}px" cx="${x.xy[0].toFixed(1)}" cy="${x.xy[1].toFixed(1)}" r="${((x.avenir ? 4.6 : 2.8) * k).toFixed(2)}"/></a>`;
    }).join('');
    zone.innerHTML = `<svg viewBox="${bx} ${by} ${bw} ${bh}" role="group" aria-label="${esc(info.titre)}">
      <defs><clipPath id="${id}-clip"><circle cx="${R[0]}" cy="${R[1]}" r="${anime ? 0 : rayon}">${anime ? `<animate attributeName="r" from="0" to="${rayon}" dur="1.5s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".45 0 .2 1"/>` : ''}</circle></clipPath></defs>
      <path class="voisin" d="${FRANCE.belgique || ''}" style="stroke-width:${k.toFixed(2)}px"/><path class="voisin" d="${FRANCE.luxembourg || ''}" style="stroke-width:${k.toFixed(2)}px"/>
      <path class="pays" d="${FRANCE.contour}" style="stroke-width:${(1.2 * k).toFixed(2)}px"/>
      <g clip-path="url(#${id}-clip)">${bras}${bouts}${routes}</g>${points}${nomsCarte(tri.filter(x => x.avenir), k, [bx, by, bw, bh], tri)}
      <circle class="rouen" cx="${R[0]}" cy="${R[1]}" r="${(5.5 * k).toFixed(2)}" style="stroke-width:${(2 * k).toFixed(2)}px"/>
      <text class="rouen-nom" x="${(R[0] + 9 * k).toFixed(1)}" y="${(R[1] - 8 * k).toFixed(1)}" style="font-size:${(13 * k).toFixed(2)}px;stroke-width:${(4 * k).toFixed(2)}px" aria-hidden="true">Rouen</text>
    </svg>`;
  }

  // ================================================================================================ une date
  function vueDate(r, { focus }) {
    const d = E.dates.find(x => x.id === r.id);
    if (!d) {
      // une date toute neuve (une notification y mène) : la base est relue une fois
      if (!E.cherche.has(r.id) && E.session && !E.sansSession && !E.horsLigne) {
        E.cherche.add(r.id);
        afficher(r, 'Date', '<p class="chargement" role="status">Recherche de cette date…</p>', { focus: false });
        rafraichir({ discret: true }).then(() => { if (location.hash === r.hash && E.dates.some(x => x.id === r.id)) router({ rafraichir: true }); else if (location.hash === r.hash) vueDate(r, { focus }); });
        return;
      }
      return afficher(r, 'Date', `<div class="titre-vue"><h1>Date introuvable</h1></div>${etatVide('calendrier', 'Cette date n’est pas (ou plus) dans votre tournée', 'Elle a pu être retirée, ou vous n’êtes plus sur cette date. Retrouvez vos dates dans votre saison.', '<p><a class="btn" href="#/saison">Ma saison</a></p>')}`, { focus });
    }
    const sp = d.spectacle || {}, auj = aujourdhui(), passee = finDe(d) < auj, vive = vivante(d), nat = natureDe(d), l = d.lieu;
    const f = E.feuilles.get(d.id);
    let html = heros(d, { page: true });
    const gestes = [];
    if (l && itineraire(l)) gestes.push(`<a class="geste" href="${esc(itineraire(l))}" target="_blank" rel="noopener">${ICONES.route}<span>Itinéraire</span><span class="sr"> jusqu’à ${esc(l.nom || l.commune || '')}, sur une carte, dans un nouvel onglet</span></a>`);
    if (d.feuille && outilFeuille()) gestes.push(`<a class="geste" href="#/feuille/${d.id}">${ICONES.feuille}<span>Feuille de route</span></a>`, `<button type="button" class="geste" data-pdf="${d.id}">${ICONES.pdf}<span>PDF</span><span class="sr"> de la feuille de route</span></button>`);
    if (!passee && vive && evenementsAVenir(d.id).length) gestes.push(`<button type="button" class="geste" data-agenda="${d.id}">${ICONES.agenda}<span>Agenda</span><span class="sr"> : ajouter cette date à mon agenda</span></button>`);
    if (!passee && vive) {
      // seulement quand la base a leurs scripts (le neuvième, le septième : voir sonder)
      if (avecSignaler()) gestes.push(`<button type="button" class="geste" data-retard="${d.id}">${ICONES.alerte}<span>Retard</span><span class="sr"> : signaler un retard ou un imprévu</span></button>`);
      if (avecIdeale()) gestes.push(`<a class="geste" href="#/frais?date=${d.id}">${ICONES.euro}<span>Frais</span><span class="sr"> : ajouter une note de frais pour cette date</span></a>`);
    }
    if (gestes.length) html += `<div class="gestes"${attrU(sp)}>${gestes.join('')}</div>`;
    html += navDates(d, 'date');
    const precisions = (Array.isArray(d.details) ? d.details : []).filter(x => x && x.texte);
    html += `<section class="bloc"${attrU(sp)} aria-labelledby="b-horaires"><h2 id="b-horaires">${ICONES.horloge}${nat === 'representations' ? 'Représentations' : 'Horaires'}</h2>${horaires(d, { complet: true })}
      ${precisions.length ? `<ul class="precisions">${precisions.map(x => { const u = x.lien && urlSure(x.lien); return `<li>${u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(x.texte)}<span class="sr"> (nouvel onglet)</span></a>` : esc(x.texte)}</li>`; }).join('')}</ul>` : ''}</section>`;
    if (d.feuille || joursDe(d).includes(auj)) {
      const lignes = f || !d.feuille ? lignesPlanning(d, f) : null;
      if (!lignes || lignes.length) html += `<section class="bloc" id="bloc-planning"${attrU(sp)} aria-labelledby="b-planning"><h2 id="b-planning">${ICONES.feuille}${joursDe(d).includes(auj) ? 'Le jour J' : 'Le planning'}</h2>
        ${lignes ? frise(lignes) : '<p class="attente-bloc" role="status">Lecture du planning…</p>'}</section>`;
    }
    html += blocLieu(d) + (avecChiffres() ? blocChiffres(d) : '') + (avecIdeale() ? blocCamion(d) : '') + blocEquipe(d, passee) + blocDocuments(d);
    afficher(r, sp.titre || 'Date', html, { focus });
    if (avecChiffres()) chargerChiffres(d.id);
    preparerPartages(documentsDe(d.spectacle?.id).filter(x => x.type === 'fiche_technique'));
    if (avecIdeale()) chargerChecklistCamion(d.id, d.spectacle?.id);
    if (d.feuille && !f) chargerFeuille(d.id).then(x => {
      const b = location.hash === r.hash && $('#bloc-planning');
      if (!b) return;
      const lignes = lignesPlanning(d, x);
      if (lignes.length) { $('.attente-bloc', b)?.replaceWith(document.createRange().createContextualFragment(frise(lignes))); b.classList.add('arrive'); majFrises(); } else b.remove();
    }).catch(() => { const b = location.hash === r.hash && $('#bloc-planning .attente-bloc'); if (b) b.textContent = 'Le planning est dans la feuille de route, qui demande le réseau.'; });
  }

  // les séances d'une date : une ligne par séance à heure dite ; celles sans heure, le même jour, pour le même public, comptées ensemble
  function horaires(d) {
    const reps = d.representations, nat = natureDe(d), sco = nat === 'representations';
    if (!reps.length) {
      const n = d.nb_representations;
      return `<p class="sans-horaire">${n && sco ? `${pluriel(n, 'représentation')} · ` : ''}horaires pas encore indiqués</p>`;
    }
    const lignes = [];
    for (const r of reps) {
      const l = !r.heure && lignes.find(x => !x.heure && x.jour === r.jour && x.public === r.public && x.annulee === r.annulee && !x.note && !r.note);
      if (l) { l.n++; l.ids.push(r.id); } else lignes.push({ ...r, n: 1, ids: [r.id] });
    }
    const plusieursJours = new Set(reps.map(r => r.jour)).size > 1;
    return `<ul class="horaires${plusieursJours ? ' jours' : ''}" aria-label="${sco ? 'Représentations' : 'Horaires'}">${lignes.map((r, i) => {
      const modif = r.ids.some(id => E.modifs.reps.has(id)), fraiche = modif && r.ids.some(id => Date.now() - E.modifs.reps.get(id) < 20000);
      const cls = [r.annulee && 'annulee', !r.heure && 'sans-heure', modif && 'modifiee', fraiche && 'fraiche'].filter(Boolean).join(' ');
      return `<li${cls ? ` class="${cls}"` : ''}>
        ${plusieursJours ? `<span class="h-jour">${i && lignes[i - 1].jour === r.jour ? `<span class="sr">${esc(jourCourt(r.jour))}</span>` : esc(jourCourt(r.jour))}</span>` : ''}
        ${r.heure ? `<span class="heure">${esc(heureTexte(r.heure))}${r.fin ? `<span class="h-fin">\u2009–\u2009${esc(heureTexte(r.fin))}</span>` : ''}</span>`
          : `<span class="heure vague">${r.n > 1 ? `${esc(quoiSeance(r.n, r.public, nat))}, heures à préciser` : 'heure à préciser'}</span>`}
        <span class="h-plus">${[sco && PUBLICS[r.public] && !(!r.heure && r.n > 1 && (r.public === 'scolaire' || r.public === 'tout_public'))   // « 2 représentations scolaires » le dit déjà
          && `<span class="public${r.public === 'scolaire' ? ' sco' : ''}">${PUBLICS[r.public]}</span>`,
          r.annulee && `<span class="etat annulee">${r.n > 1 ? 'annulées' : 'annulée'}</span>`, modif && '<span class="modifie">modifié</span>',
          r.note && `<span class="note">${esc(r.note)}</span>`].filter(Boolean).join(' ')}</span></li>`;
    }).join('')}</ul>`;
  }

  const sansAccent = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const contientMot = (texte, mot) => !!mot && new RegExp(`(^|[^a-z0-9])${sansAccent(mot).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).test(sansAccent(texte));
  // l'itinéraire cherche le lieu par son nom et son adresse : sa position n'est que le centre de sa commune, bonne pour la
  // carte mais pas pour s'y rendre (Google y montrerait le commerce le plus proche)
  function itineraire(l) {
    const q = [l.nom, l.adresse, l.commune].filter(Boolean).join(', ');
    if (q) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
    return l.latitude != null && l.longitude != null && Number.isFinite(+l.latitude) && Number.isFinite(+l.longitude)
      ? `https://www.google.com/maps/dir/?api=1&destination=${+l.latitude},${+l.longitude}` : '';
  }
  function liensGps(l) {
    if (!l) return null;
    const q = [l.nom, l.adresse, l.commune].filter(Boolean).join(', ');
    const coord = (l.latitude != null && l.longitude != null && Number.isFinite(+l.latitude) && Number.isFinite(+l.longitude))
      ? `${+l.latitude},${+l.longitude}` : '';
    const qParam = encodeURIComponent(q || coord);
    if (!qParam) return null;
    return {
      google: `https://www.google.com/maps/dir/?api=1&destination=${qParam}`,
      waze: coord ? `https://waze.com/ul?ll=${coord}&navigate=yes` : `https://waze.com/ul?q=${qParam}&navigate=yes`,
      apple: `https://maps.apple.com/?daddr=${coord || qParam}`
    };
  }
  const communeDe = l => `${l.commune}${l.departement ? `\u00a0(${l.departement})` : ''}`;
  // le lieu en une ligne : « L'Eclat · Pont-Audemer (27) », « Théâtre Roger Ferdinand de Saint-Lô (50) »
  function lieuTexteHtml(d) {
    const l = d.lieu;
    if (l && l.nom && contientMot(l.nom, l.commune)) return `<b>${esc(l.nom)}</b>${l.departement ? `\u00a0(${esc(l.departement)})` : ''}`;
    if (l) return `<b>${esc(l.nom || communeDe(l))}</b>${l.nom ? ` · ${esc(communeDe(l))}` : ''}`;
    const ou = d.intitule && d.intitule.includes(' — ') ? d.intitule.split(' — ').pop() : '';
    return ou ? `<b>${esc(ou)}</b> · <span class="vague">salle à préciser</span>` : '<span class="vague">lieu à préciser</span>';
  }
  const lieuCourt = d => `<p class="billet-ou">${ICONES.route}<span><span class="sr">Lieu : </span>${lieuTexteHtml(d)}</span></p>`;

  // le lieu d'une date : son adresse, l'itinéraire, le site, la distance depuis Rouen, et le bras sur la carte
  function blocLieu(d) {
    const l = d.lieu, sp = d.spectacle || {};
    if (!l) return `<section class="bloc"${attrU(sp)} aria-labelledby="b-lieu"><h2 id="b-lieu">${ICONES.route}Le lieu</h2><p>${lieuTexteHtml(d)}</p></section>`;
    const lignes = l.adresse ? [l.adresse, contientMot(l.adresse, l.commune) ? '' : communeDe(l)].filter(Boolean) : [communeDe(l)];
    const gps = liensGps(l), site = l.site_web ? urlSure(l.site_web) : '', km = Math.round(kmDe(l) / 5) * 5;
    let mini = '';
    if (FRANCE && projeter(l.latitude, l.longitude)) {
      E.cartes.set(`d${d.id}`, { lieux: lieuxCarte([d]), mini: true, titre: `De Rouen à ${l.commune || l.nom}${km ? `, environ ${km} km par la route` : ''}` });
      mini = `<figure class="carte-tournee mini" data-carte="d${d.id}"><div class="carte-svg"></div></figure>`;
    }
    return `<section class="bloc bloc-lieu"${attrU(sp)} aria-labelledby="b-lieu"><h2 id="b-lieu">${ICONES.route}Le lieu</h2>
      <div class="lieu-grille"><div><p class="lieu-nom">${esc(l.nom || communeDe(l))}</p><p class="lieu-adresse">${lignes.map(esc).join('<br>')}</p>
        ${km ? `<p class="aide">Environ <span data-compter="${km}" data-route aria-hidden="true">${nombre(km)}</span><span class="sr">${nombre(km)}</span>\u00a0km de Rouen par la route.</p>` : ''}
        ${gps ? `<div class="nav-gps-grille">
          <a class="btn-gps" href="${esc(gps.google)}" target="_blank" rel="noopener">${ICONES.route} Google Maps</a>
          <a class="btn-gps" href="${esc(gps.waze)}" target="_blank" rel="noopener">${ICONES.waze} Waze</a>
          <a class="btn-gps" href="${esc(gps.apple)}" target="_blank" rel="noopener">${ICONES.apple} Apple Plans</a>
        </div>` : ''}
        ${site ? `<p class="liens"><a href="${esc(site)}" target="_blank" rel="noopener">Site du lieu<span class="sr"> (nouvel onglet)</span></a></p>` : ''}</div>${mini}</div></section>`;
  }

  // les chiffres d'une date (le dixième script, jamais publiés : l'équipe les lit) : la jauge, le public venu, les heures
  // d'ateliers. Le bloc attend, caché, sa lecture ; il ne se montre que si la date en a.
  function blocChiffres(d) {
    return `<section class="bloc" id="bloc-chiffres" hidden${attrU(d.spectacle || {})} aria-labelledby="b-chiffres"><h2 id="b-chiffres">${ICONES.planning}Les chiffres</h2><p id="chiffres-texte"></p></section>`;
  }
  async function chargerChiffres(id) {
    let data = null;
    try { ({ data } = await sb.from('crescite_dates_chiffres').select('jauge,spectateurs,heures_ateliers').eq('date_id', id).maybeSingle()); } catch (e) { return; }
    const bloc = $('#bloc-chiffres');
    if (!bloc || !data || location.hash !== `#/date/${id}`) return;
    const morceaux = [data.jauge != null && `Jauge : ${nombre(data.jauge)} places`,
      data.spectateurs != null && `${nombre(data.spectateurs)}\u00a0spectateur${Number(data.spectateurs) > 1 ? 's' : ''}`,
      data.heures_ateliers != null && `${nombre(data.heures_ateliers)}\u00a0h d’ateliers`].filter(Boolean);
    if (!morceaux.length) return;
    $('#chiffres-texte', bloc).textContent = morceaux.join(' · ');
    bloc.hidden = false; bloc.classList.add('arrive');                 // le bloc, lu après la page, se pose
  }

  // qui part sur une date : la distribution « en tournée » du spectacle, moins les absents de la date, plus ses renforts
  const RANG = { jeu: 0, technique: 1, creation: 2, production: 3 };
  const CATEGORIES = { jeu: 'jeu', technique: 'technique', creation: 'création', production: 'production' };
  function quiPart(d) {
    const sp = d.spectacle?.id, eq = E.equipes.filter(e => Number(e.date_id) === d.id);
    const absents = new Set(eq.filter(e => !e.present).map(e => e.personne_id));
    const gens = new Map();
    const ajouter = (id, personne, fonction, note) => {
      if (!gens.has(id)) gens.set(id, { id, nom: nomDe(personne), personne: personne || null, fonctions: [], notes: [] });
      const g = gens.get(id);
      if (!g.nom) g.nom = nomDe(personne);
      if (!g.personne && personne) g.personne = personne;
      if (fonction && !g.fonctions.includes(fonction)) g.fonctions.push(fonction);
      if (note) g.notes.push(note);
    };
    E.distributions.filter(x => x.spectacle_id === sp && x.en_tournee && !absents.has(x.personne_id))
      .sort((a, b) => (RANG[a.categorie] ?? 9) - (RANG[b.categorie] ?? 9) || a.ordre - b.ordre)
      .forEach(x => ajouter(x.personne_id, x.personne, x.categorie === 'jeu' ? (x.role ? `jeu (${x.role})` : 'jeu') : (x.fonction || CATEGORIES[x.categorie])));
    eq.filter(e => e.present).forEach(e => ajouter(e.personne_id, e.personne, e.fonction, e.note));
    return [...gens.values()];
  }
  // un portrait rond : la photo de la fiche si elle est publique, sinon les initiales, dans la couleur du spectacle
  const initiales = p => `${txt(p?.prenom)[0] || ''}${txt(p?.nom)[0] || ''}`.toUpperCase() || '·';
  function avatar(p, { taille = '' } = {}) {
    const photo = p && p.photo && p.photo_publique ? `${PUBLIC}/${String(p.photo).split('/').map(encodeURIComponent).join('/')}` : '';
    return `<span class="avatar${taille ? ` ${taille}` : ''}" aria-hidden="true">${esc(initiales(p))}${photo ? `<img src="${esc(photo)}" alt="" loading="lazy" decoding="async" crossorigin="anonymous">` : ''}</span>`;
  }
  function miniAvatars(gens) {
    const n = 4, vus = gens.slice(0, n);
    return `${vus.map(g => avatar(g.personne || { prenom: g.nom.split(' ')[0], nom: g.nom.split(' ').slice(1).join(' ') }, { taille: 'mini' })).join('')}${gens.length > n ? `<span class="plus" aria-hidden="true">+${gens.length - n}</span>` : ''}`;
  }
  function blocEquipe(d, passee = false) {
    const gens = vivante(d) ? quiPart(d) : [], sp = d.spectacle || {}, titre = passee ? 'L’équipe' : 'Qui part';
    if (!gens.length) return `<section class="bloc"${attrU(sp)} aria-labelledby="b-equipe"><h2 id="b-equipe">${ICONES.equipe}${titre}</h2><p class="aide">L’équipe de cette date n’est ${passee ? 'pas' : 'pas encore'} indiquée.</p></section>`;
    return `<section class="bloc"${attrU(sp)} aria-labelledby="b-equipe"><h2 id="b-equipe">${ICONES.equipe}${titre} <span class="compte-nb">· ${gens.length}</span></h2>
      <ul class="portraits">${gens.map(g => `<li>${avatar(g.personne || { prenom: g.nom.split(' ')[0], nom: g.nom.split(' ').slice(1).join(' ') })}<span class="qui"><b>${esc(g.nom || 'Une personne de l’équipe')}${g.id === E.moi ? ' <span class="vous">vous</span>' : ''}</b>
        ${g.fonctions.length ? `<span>${esc(g.fonctions.join(', '))}</span>` : ''} ${g.notes.length ? `<em>${esc(g.notes.join(' ; '))}</em>` : ''}</span></li>`).join('')}</ul></section>`;
  }

  // la feuille de route dans un billet : sa version, « Lire » et « PDF »
  function feuilleCourte(d) {
    if (!d.feuille) return '';
    const f = d.feuille, titre = d.spectacle?.titre || '', jour = quandTexte(d);
    const lib = `<span class="f-lib">Feuille de route</span> <span class="f-version" title="${esc(`publiée ${momentTexte(f.publiee_le)}`)}">v${f.version || 1}</span>`;
    if (!outilFeuille()) return `<span class="f-court">${lib} <span class="aide">L’outil qui l’affiche n’a pas pu être chargé : rechargez la page.</span></span>`;
    return `<span class="f-court">${lib} <a class="btn petit principal" href="#/feuille/${d.id}">${ICONES.lire}Lire<span class="sr"> la feuille de route de ${esc(titre)}, ${esc(jour)}</span></a>
      <button type="button" class="btn petit" data-pdf="${d.id}">${ICONES.pdf}PDF<span class="sr"> de la feuille de route de ${esc(titre)}, ${esc(jour)}</span></button></span>`;
  }
  // les étiquettes d'une date : la nature (répétitions…), l'état, « mise à jour », le décompte
  function etiquettes(d, decompteTexte = '') {
    const nat = natureDe(d), xs = [];
    if (nat !== 'representations') xs.push(`<span class="etat nature">${esc(NATURES[nat])}</span>`);
    if (ETATS[d.statut]) xs.push(`<span class="etat ${d.statut}">${ETATS[d.statut]}</span>`);
    if (E.modifs.dates.has(d.id)) xs.push('<span class="etat maj">Mise à jour</span>');
    if (decompteTexte) xs.push(`<span class="etat bientot">${esc(decompteTexte)}</span>`);
    return xs.length ? `<p class="etiquettes">${xs.join(' ')}</p>` : '';
  }
  // un billet : une date de la saison (le spectacle, les jours, l'état, les horaires, le lieu), qui s'ouvre en sa page ;
  // sous la perforation, la feuille de route et qui part
  function billet(d, { passee = false } = {}) {
    const sp = d.spectacle || {}, quand = quandTexte(d), vive = vivante(d);
    const cls = ['billet', passee && 'passee', ETATS[d.statut] && d.statut].filter(Boolean).join(' ');
    const precisions = (Array.isArray(d.details) ? d.details : []).filter(x => x && x.texte);
    const gens = vive && !passee ? quiPart(d) : [];
    const bientot = !passee && vive && finDe(d) >= aujourdhui() ? decompte(d) : '';
    const pied = [feuilleCourte(d), gens.length ? `<span class="mini-equipe" title="${esc(gens.map(g => g.nom).join(', '))}">${miniAvatars(gens)}<span class="sr">${pluriel(gens.length, 'personne')} sur cette date</span></span>` : ''].filter(Boolean).join('');
    return `<article class="${cls}" id="billet-${d.id}"${attrU(sp)} aria-labelledby="bt-${d.id}">
      <div class="billet-haut">
        <h3 class="billet-titre" id="bt-${d.id}"><a class="lien-etendu" href="#/date/${d.id}"><span class="billet-spectacle">${esc(sp.titre || 'Spectacle')}</span> <span class="billet-quand">${esc(majuscule(quand))}</span></a></h3>
        ${etiquettes(d, /^dans \d+ (jours|semaines)$|^(demain|après-demain|ce soir|cet après-midi|ce matin|aujourd’hui|en cours)$/.test(bientot) && !/mois/.test(bientot) ? bientot : '')}
        ${horaires(d)}
        ${lieuCourt(d)}
        ${precisions.length ? `<ul class="precisions">${precisions.map(x => { const u = x.lien && urlSure(x.lien); return `<li>${u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(x.texte)}<span class="sr"> (page du lieu, nouvel onglet)</span></a>` : esc(x.texte)}</li>`; }).join('')}</ul>` : ''}
        ${ICONES.chevron}
      </div>
      ${pied ? `<div class="billet-pied">${pied}</div>` : ''}
    </article>`;
  }

  const TYPES = { texte: 'Le texte', dossier: 'Le dossier', fiche_technique: 'La fiche technique', plan: 'Le plan' };
  const TYPES_COURTS = { texte: 'Texte', dossier: 'Dossier', fiche_technique: 'Fiche technique', plan: 'Plan', autre: 'Document' };
  const POUR = { pros: 'pour les programmateurs', scolaires: 'pour les établissements scolaires', tous: 'pour les programmateurs et les scolaires', pros_scolaires: 'pour les programmateurs et les scolaires' };
  const documentsDe = id => E.documents.filter(x => x.spectacle_id === id);
  function blocDocuments(d) {
    const xs = documentsDe(d.spectacle?.id), sp = d.spectacle || {};
    if (!xs.length) return '';
    const libelle = x => (TYPES[x.type] && xs.filter(y => y.type === x.type).length === 1 ? TYPES[x.type] : x.titre);
    return `<section class="bloc"${attrU(sp)} aria-labelledby="b-docs"><h2 id="b-docs">${ICONES.dossier}Documents</h2><ul class="puces-docs">${xs.map(x => `<li>${lienDocument(x, `${x.url && !x.fichier ? ICONES.lien : ICONES.doc}<span>${esc(libelle(x))}</span>`, 'puce-doc', libelle(x) !== x.titre ? x.titre : '')}${x.type === 'fiche_technique' ? ` <button type="button" class="puce-doc partage" data-partager="${x.id}">${ICONES.partager}<span>Partager</span><span class="sr"> : ${esc(x.titre)}</span></button>` : ''}</li>`).join('')}</ul></section>`;
  }
  // un document : un lien signé (fichier du stockage privé), un lien direct (public), ou un bouton qui demande le lien au clic
  function lienDocument(x, interieur, cls, titre = '') {
    const t = titre ? ` title="${esc(titre)}"` : '';
    if (documentPrive(x)) {
      const l = E.liens.get(x.fichier);
      if (l) return `<a class="${cls}" href="${esc(l.url)}" target="_blank" rel="noopener" data-fichier="${esc(x.fichier)}"${t}>${interieur}<span class="sr"> (s’ouvre dans un nouvel onglet)</span></a>`;
      return `<button type="button" class="${cls}" data-fichier="${esc(x.fichier)}"${t}>${interieur}<span class="sr"> (s’ouvre dans un nouvel onglet)</span></button>`;
    }
    const u = urlDocument(x);
    if (u) return `<a class="${cls}" href="${esc(u)}" target="_blank" rel="noopener noreferrer"${t}>${interieur}<span class="sr"> (${x.fichier ? 's’ouvre dans un nouvel onglet' : 'lien externe, nouvel onglet'})</span></a>`;
    return `<span class="${cls}">${interieur}</span>`;
  }

  function piedVue() {
    if (!E.chargeLe) return '';
    const jour = new Date(E.chargeLe).toDateString() === new Date().toDateString() ? `à ${heureCourte(E.chargeLe)}` : momentTexte(E.chargeLe);
    return `<p class="pied-vue">${E.horsLigne ? 'Lu' : 'Mis à jour'} ${esc(jour)} · <button type="button" class="lien-btn" data-reessayer>Actualiser</button></p>`;
  }

  // ================================================================================================ les feuilles de route
  function vueFeuilles(r, { focus }) {
    const auj = aujourdhui(), avec = E.dates.filter(d => d.feuille);
    const avenir = avec.filter(d => finDe(d) >= auj), passees = avec.filter(d => finDe(d) < auj).reverse();
    const sans = E.dates.filter(d => !d.feuille && finDe(d) >= auj && vivante(d) && (d.precision === 'jour' || d.precision === 'periode')).length;
    let html = `<div class="titre-vue"><h1>Feuilles de route</h1><p class="sous">Une par date : le planning, le trajet, l’hébergement, les contacts. Celles à venir se lisent aussi hors connexion.</p></div>`;
    if (!outilFeuille() && avec.length) html += '<p class="message erreur" role="alert">Les feuilles de route ne peuvent pas s’afficher pour le moment : l’outil qui les met en page n’a pas pu être chargé. Rechargez la page.</p>';
    if (avenir.length) html += `<ul class="liste-feuilles">${avenir.map(d => itemFeuille(d)).join('')}</ul>`;
    else html += etatVide('feuille', 'Aucune feuille de route à venir', sans ? `${pluriel(sans, 'date à venir', 'dates à venir')} : l’administration publie chaque feuille quelques jours avant le départ. Elle apparaîtra ici.` : 'Dès qu’une feuille de route sera publiée pour l’une de vos dates, elle apparaîtra ici.');
    if (sans && avenir.length) html += `<p class="aide note-feuilles">Et ${pluriel(sans, 'date à venir', 'dates à venir')} dont la feuille de route est en préparation.</p>`;
    if (passees.length) html += `<details class="saison feuilles-passees"><summary><span class="s-texte"><span class="s-nom">Feuilles passées</span> <span class="s-compte">${pluriel(passees.length, 'feuille')}</span></span></summary><div class="saison-corps"><ul class="liste-feuilles">${passees.map(d => itemFeuille(d, true)).join('')}</ul></div></details>`;
    html += piedVue();
    afficher(r, TITRES.feuilles, html, { focus });
  }
  function itemFeuille(d, passee = false) {
    const sp = d.spectacle || {}, f = d.feuille, l = d.lieu, jourj = joursDe(d).includes(aujourdhui());
    return `<li class="feuille-item${passee ? ' passee' : ''}" id="fi-${d.id}"${attrU(sp)}>
      <span class="ic-rond" aria-hidden="true">${ICONES.feuille}</span>
      <a class="lien-etendu fi-texte" href="#/feuille/${d.id}"><b>${esc(sp.titre || 'Spectacle')}${jourj ? ' <span class="jourj-badge">aujourd’hui</span>' : ''}</b>
        <span>${esc(majuscule(quandTexte(d)))}${l ? ` · ${esc(l.commune || l.nom)}` : ''}</span>
        <span class="fi-version">Version ${f.version || 1}${f.publiee_le ? `, publiée ${esc(momentTexte(f.publiee_le))}` : ''}</span></a>
      <button type="button" class="btn petit" data-pdf="${d.id}">${ICONES.pdf}PDF<span class="sr"> de la feuille de route de ${esc(sp.titre || '')}, ${esc(quandTexte(d))}</span></button></li>`;
  }

  // le contexte d'une feuille (FEUILLE.html, FEUILLE.pdf) : la date telle que la tournée la donne, la personne connectée
  // (son prénom ressort dans la feuille) et les documents que la feuille peut citer. Un fichier y est un lien signé, encore
  // bon, dans la page ; dans le PDF, qu'on garde des jours, un lien vers la page du spectacle, qui le signe de nouveau.
  const contexte = (d, { pdf = false } = {}) => ({
    date: d, lieu: d.lieu || null, representations: d.representations,
    spectacle: { titre: d.spectacle?.titre || '', slug: d.spectacle?.slug || '', univers: d.spectacle?.univers || {}, duree: d.spectacle?.duree || '' },
    moi: E.personne ? { prenom: E.personne.prenom || '', nom: E.personne.nom || '' } : undefined,
    documents: E.documents.filter(x => x.spectacle_id == null || x.spectacle_id === d.spectacle?.id).map(x => ({ id: x.id, titre: x.titre,
      url: documentPrive(x) ? (!pdf && lienFrais(x.fichier)?.url) || `${retourUrl()}#/spectacles${d.spectacle?.slug ? `/${d.spectacle.slug}` : ''}` : urlDocument(x) })),
  });
  async function chargerFeuille(id) {
    if (E.feuilles.has(id)) return E.feuilles.get(id);
    const { data, error } = await sb.from('crescite_feuilles').select('id, date_id, titre, contenu, statut, version, publiee_le').eq('date_id', id).eq('statut', 'publiee').maybeSingle();
    if (error) throw error;
    if (data) E.feuilles.set(id, data);
    return data;
  }
  // la feuille de route, lue dans l'application : FEUILLE.html donne la feuille entière (son en-tête compris) ; la page y
  // ajoute le PDF et la version
  function vueFeuille(r, { focus }) {
    const id = r.id, d = E.dates.find(x => x.id === id), ici = () => location.hash === `#/feuille/${id}`;
    E.feuilleVue = null;
    if (!d) return afficher(r, 'Feuille de route', `<div class="titre-vue"><h1>Feuille de route</h1></div><p class="message erreur" role="alert">Cette date n’est pas (ou plus) dans votre tournée.</p>`, { focus });
    const sp = d.spectacle || {}, l = d.lieu;
    // sans la feuille elle-même (chargement, erreur) : son en-tête, dit par la page
    const tete = `<div class="feuille-tete"${attrU(sp)}><p class="sur">Feuille de route</p><h1>${esc(sp.titre || 'Spectacle')}</h1>
      <p><b>${esc(majuscule(quandTexte(d)))}</b>${l ? ` · ${esc(l.nom || l.commune)}${l.nom ? `, ${esc(l.commune)}` : ''}` : ''}</p></div>`;
    const f = E.feuilles.get(id);
    if (f) return montrerFeuille(r, d, f, { focus, tete });
    afficher(r, 'Feuille de route', `${tete}<p class="chargement" role="status">Chargement de la feuille de route…</p>`, { focus: false });
    chargerFeuille(id).then(x => {
      if (!ici()) return;
      if (!x) return afficher(r, 'Feuille de route', `${tete}<p class="message erreur" role="alert">Cette feuille de route n’est pas (ou plus) publiée. L’administration la publiera dès qu’elle sera prête.</p>`, { focus });
      montrerFeuille(r, d, x, { focus, tete });
      entree('fondu');
    }).catch(e => { if (ici()) afficher(r, 'Feuille de route', `${tete}<p class="message erreur" role="alert">La feuille de route n’a pas pu être lue : ${esc(motsErreur(e))}.</p>`, { focus }); });
  }
  function montrerFeuille(r, d, f, { focus, tete }) {
    const version = `Version ${f.version || 1}${f.publiee_le ? `, publiée ${momentTexte(f.publiee_le)}` : ''}`;
    const F = outilFeuille();
    if (!F) return afficher(r, 'Feuille de route', `${tete}<p class="message erreur" role="alert">Cette feuille de route est publiée (${esc(version.toLowerCase())}), mais elle ne peut pas s’afficher ici : l’outil des feuilles de route (../admin/feuille.js) n’a pas pu être chargé. Rechargez la page ; si rien ne change, prévenez l’administration.</p>`, { focus });
    let corps = '';
    try { corps = F.html(f, contexte(d)); } catch (e) { console.error(e); }
    if (corps && typeof corps.then === 'function') {
      afficher(r, 'Feuille de route', `${tete}<p class="chargement" role="status">Mise en page de la feuille de route…</p>`, { focus: false });
      corps.then(c => { if (location.hash === `#/feuille/${d.id}`) poserFeuille(r, d, f, c, { focus, tete, version }); })
        .catch(e => { console.error(e); if (location.hash === `#/feuille/${d.id}`) poserFeuille(r, d, f, '', { focus, tete, version }); });
      return;
    }
    poserFeuille(r, d, f, corps, { focus, tete, version });
  }
  function poserFeuille(r, d, f, corps, { focus, tete, version }) {
    E.feuilleVue = { id: d.id, version: f.version, publiee_le: f.publiee_le };
    const barre = `<div class="barre-feuille"><button type="button" class="btn principal" data-pdf="${d.id}">${ICONES.pdf}Télécharger le PDF</button><p class="f-version">${esc(version)}</p></div>`;
    if (!corps) return afficher(r, 'Feuille de route', `${tete}${barre}<p class="message erreur" role="alert">La feuille de route n’a pas pu être mise en page ici. Le PDF reste à votre disposition.</p>`, { focus });
    // la feuille porte d'ordinaire son titre (h1) ; sinon, la page en donne un, pour les lecteurs d'écran
    const titrePage = /<h1[\s>]/i.test(corps) ? '' : `<h1 class="sr">Feuille de route : ${esc(d.spectacle?.titre || '')}, ${esc(quandTexte(d))}</h1>`;
    afficher(r, 'Feuille de route', `<div class="vue-feuille">${titrePage}${barre}${navDates(d, 'feuille')}<div class="feuille-cadre"${attrU(d.spectacle || {})}>${corps}</div></div>`, { focus });
    // les fichiers que la feuille cite : leur lien signé se redemande au clic s'il a vieilli
    const parUrl = new Map([...E.liens.entries()].map(([chemin, x]) => [x.url, chemin]));
    $$('.feuille-cadre a[href]').forEach(a => { const c = parUrl.get(a.href); if (c) a.dataset.fichier = c; });
  }

  async function telechargerPdf(bouton) {
    const id = Number(bouton.dataset.pdf), d = E.dates.find(x => x.id === id), F = outilFeuille();
    if (!d) return;
    if (!F || typeof F.telecharger !== 'function') return annoncer('Le PDF ne peut pas être préparé : l’outil des feuilles de route n’a pas pu être chargé. Rechargez la page.', { erreur: true });
    try {
      await occupe(bouton, 'Préparation…', async () => {
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

  // ================================================================================================ mes documents
  function ligneDocument(x) {
    const ext = x.fichier ? (x.fichier.split('.').pop() || '').toUpperCase() : '';
    let source = 'Fichier';
    if (x.fichier) source = /^[A-Z0-9]{2,4}$/.test(ext) ? ext : 'Fichier';
    else { try { source = new URL(x.url).hostname.replace(/^www\./, '') + ' ↗'; } catch (e) { source = 'Lien'; } }
    return lienDocument(x, `${x.url && !x.fichier ? ICONES.lien : ICONES.doc}<span class="doc-texte"><span class="doc-type">${esc(TYPES_COURTS[x.type] || 'Document')}${POUR[x.pour] ? ` · ${POUR[x.pour]}` : ''}</span>
      <span class="doc-titre">${esc(x.titre)}</span></span> <span class="doc-src">${esc(source)}</span>`, 'doc');
  }
  async function copier(url, duree = '', message = '') {
    let ok = false;
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(url); ok = true; } } catch (e) { ok = false; }
    if (!ok) {
      const t = document.createElement('textarea');
      t.value = url; t.setAttribute('readonly', ''); t.className = 'sr';
      document.body.append(t); t.select();
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      t.remove();
    }
    if (ok) annoncer(message || `Lien copié : collez-le dans votre message.${duree}`);
    else window.prompt('Copiez ce lien :', url);
  }

  // ================================================================================================ les notifications
  const LIENS_SURS = /^#\/(saison|feuilles|planning|spectacles|documents|notifications|moi|indisponibilites|agendas|propositions|date\/\d+|feuille\/\d+|proposition\/\d+|spectacles\/[a-z0-9-]{1,80})$/;
  const lienDe = n => {
    if (n && n.lien === '#/documents' && n.spectacle_id != null) { const sp = E.spectacles.get(Number(n.spectacle_id)); if (sp && sp.slug) return `#/spectacles/${sp.slug}`; }
    return typeof n.lien === 'string' && LIENS_SURS.test(n.lien) ? n.lien : n.date_id ? `#/date/${n.date_id}` : '#/notifications';
  };
  const nonLues = () => E.notifs.filter(x => !x.lue_le).length;
  const trierNotifs = xs => xs.sort((a, b) => new Date(b.cree_le) - new Date(a.cree_le));

  async function chargerNotifs({ signaler = false } = {}) {
    if (!E.moi || E.sansSession || !E.session) return;
    const { data, error } = await sb.from('crescite_notifications').select('id, personne_id, type, titre, texte, date_id, spectacle_id, lien, cree_le, lue_le')
      .eq('personne_id', E.moi).order('cree_le', { ascending: false }).limit(NOTIFS_MAX);
    if (error) {
      if (tableAbsente(error)) { E.notifsEtat = 'absent'; E.notifs = []; majNotifs(); return; }
      throw error;
    }
    const connues = new Map(E.notifs.map(n => [n.id, n]));
    E.notifs = trierNotifs(data || []);
    E.notifsEtat = 'ok';
    const neuves = signaler ? E.notifs.filter(n => !n.lue_le && (!connues.has(n.id) || connues.get(n.id).cree_le !== n.cree_le)) : [];
    majNotifs({ nouvelle: neuves.length > 0 });
    if (neuves.length) { signalerNotif(neuves[0]); rafraichirBientot(neuves); }
  }
  // le temps réel : chaque notification nouvelle (ou mise à jour : plusieurs horaires changés d'un coup) arrive aussitôt
  function ecouter() {
    if (E.canal || !E.moi || E.notifsEtat === 'absent' || !E.session || typeof sb.channel !== 'function') return;
    const moi = E.moi;
    try {
      E.canal = sb.channel(`equipe-notifs-${moi}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'crescite_notifications', filter: `personne_id=eq.${moi}` }, p => { if (E.moi === moi) recevoir(p); })
        .subscribe(statut => { E.tempsReel = statut; });
    } catch (e) { console.warn('temps réel', e); E.canal = null; }
  }
  function arreterTempsReel() {
    const c = E.canal;
    E.canal = null; E.tempsReel = '';
    if (c) { try { sb.removeChannel(c); } catch (e) { /* déjà fermé */ } }
  }
  function recevoir(p) {
    const ev = p.eventType || p.type;
    if (ev === 'DELETE') { const id = p.old && p.old.id; E.notifs = E.notifs.filter(x => x.id !== id); majNotifs(); return; }
    const n = p.new;
    if (!n || n.id == null || (n.personne_id != null && Number(n.personne_id) !== E.moi)) return;
    const avant = E.notifs.find(x => x.id === n.id);
    E.notifs = trierNotifs([n, ...E.notifs.filter(x => x.id !== n.id)]).slice(0, NOTIFS_MAX);
    E.notifsEtat = 'ok';
    const neuve = !n.lue_le && (!avant || avant.cree_le !== n.cree_le || avant.titre !== n.titre);
    majNotifs({ nouvelle: neuve });
    if (neuve) { signalerNotif(n); rafraichirBientot([n]); }
  }
  // une notification qui change la saison (horaires, date, feuille, équipe, document) : la saison se relit
  let minuteurRelecture = 0;
  function rafraichirBientot(ns) {
    if (ns.some(n => n.type === 'proposition')) {
      chargerPropositions().then(() => { if (E.pret && ['planning', 'propositions', 'proposition', 'saison'].includes(E.vue)) redessiner(); }).catch(() => {});
    }
    if (!ns.some(n => ['horaires', 'date', 'feuille', 'equipe', 'document'].includes(n.type))) return;
    ns.forEach(n => { if (n.type === 'feuille' && n.date_id) E.feuilles.delete(Number(n.date_id)); });
    clearTimeout(minuteurRelecture);
    minuteurRelecture = setTimeout(() => rafraichir({ discret: true }), 1200);
  }
  // le badge (l'onglet, l'icône de l'application, le titre) et, si la vue est ouverte, la liste
  function majNotifs({ nouvelle = false } = {}) {
    majBadge(nouvelle);
    garder();
    if (E.route && E.route.k === 'notifications' && E.pret) {
      const y = window.scrollY;
      vueNotifications(E.route, { focus: false });
      window.scrollTo(0, y);
      if (nouvelle) { const li = $('.liste-notifs li'); if (li) tt('ajouter', li); }
    }
  }
  function majBadge(nouvelle = false) {
    const n = nonLues();
    $$('.nav-item[data-onglet="notifications"] .pastille-nb, [data-cloche] .pastille-nb').forEach(p => {
      p.dataset.n = n; p.textContent = n > 99 ? '99+' : n ? String(n) : '';
      if (nouvelle && n) { p.classList.remove('nouvelle'); void p.offsetWidth; p.classList.add('nouvelle'); }
    });
    $$('.nav-item[data-onglet="notifications"] .nb-sr, [data-cloche] .nb-sr').forEach(s => { s.textContent = n ? `, ${pluriel(n, 'non lue', 'non lues')}` : ''; });
    try { if (navigator.setAppBadge) { if (n) navigator.setAppBadge(n).catch(() => {}); else navigator.clearAppBadge().catch(() => {}); } } catch (e) { /* rien */ }
    majTitre();
  }
  // une notification qui arrive : un bandeau en haut si l'application est à l'écran, sinon celle du téléphone
  function signalerNotif(n) {
    vibrer(14);
    if (document.visibilityState === 'visible') return banniere(n);
    try {
      if (window.Notification && Notification.permission === 'granted' && navigator.serviceWorker) {
        navigator.serviceWorker.ready.then(reg => reg.showNotification(n.titre || 'Crescite', { body: n.texte || '', tag: `crescite-notif-${n.id}`,
          icon: 'icones/192.png', badge: 'icones/badge.png', data: { lien: lienDe(n), id: n.id }, renotify: false, lang: 'fr' })).catch(() => {});
      }
    } catch (e) { /* rien */ }
  }
  let minuteurBanniere = 0;
  function banniere(n) {
    const z = $('#bandeau-notif');
    if (!z) return;
    const g = GENRES[n.type] || GENRES.message;
    z.innerHTML = `<a class="bandeau-notif n-${esc(n.type)}" href="${esc(lienDe(n))}" data-notif="${n.id}"><span class="bn-temps" aria-hidden="true"></span><span class="ic-rond" aria-hidden="true">${g.ic}</span><span class="n-titre">${esc(n.titre)}</span>${n.texte ? `<span class="n-texte">${esc(n.texte)}</span>` : ''}</a>`;
    const a = z.firstElementChild;
    requestAnimationFrame(() => requestAnimationFrame(() => a.classList.add('visible')));
    clearTimeout(minuteurBanniere);
    minuteurBanniere = setTimeout(() => { a.classList.remove('visible'); setTimeout(() => { if (a.isConnected && !a.classList.contains('visible')) a.remove(); }, 600); }, 6500);
  }
  async function marquerLue(id) {
    const n = E.notifs.find(x => x.id === id);
    if (n && n.lue_le) return;
    const quand = new Date().toISOString();
    if (n) { n.lue_le = quand; majNotifs(); }
    if (!E.session || E.sansSession) return;
    const { error } = await sb.from('crescite_notifications').update({ lue_le: quand }).eq('id', id).eq('personne_id', E.moi);
    if (error && n) { n.lue_le = null; majNotifs(); if (!estReseau(error)) console.warn('notification', error); }
  }
  async function toutMarquerLu(bouton) {
    const xs = E.notifs.filter(x => !x.lue_le);
    if (!xs.length) return;
    const quand = new Date().toISOString();
    xs.forEach(x => { x.lue_le = quand; });
    vibrer(10);
    majNotifs();
    balayer(xs.map(x => x.id));
    const { error } = await sb.from('crescite_notifications').update({ lue_le: quand }).eq('personne_id', E.moi).is('lue_le', null);
    if (error) { xs.forEach(x => { x.lue_le = null; }); majNotifs(); return annoncer(`Les notifications n’ont pas pu être marquées comme lues : ${motsErreur(error)}.`, { erreur: true }); }
    const b = $('[data-tout-lu]') || bouton;
    if (b && b.isConnected) tt('confirmer', b);
  }
  // « tout marquer comme lu » : les notifications s'éteignent l'une après l'autre (--i, le délai)
  function balayer(ids) {
    if (reduit()) return;
    ids.forEach((id, i) => { const a = $(`.liste-notifs [data-notif="${id}"]`); if (a) { a.style.setProperty('--i', Math.min(i, 14)); a.classList.add('balaye'); } });
  }
  async function effacerLues(bouton) {
    const xs = E.notifs.filter(x => x.lue_le);
    if (!xs.length) return;
    const { error } = await occupe(bouton, 'Effacement…', () => sb.from('crescite_notifications').delete().eq('personne_id', E.moi).not('lue_le', 'is', null));
    if (error) return annoncer(`Les notifications lues n’ont pas pu être effacées : ${motsErreur(error)}.`, { erreur: true });
    const ids = new Set(xs.map(x => x.id));
    E.notifs = E.notifs.filter(x => !ids.has(x.id));
    majNotifs();
    annoncer(`${pluriel(ids.size, 'notification lue effacée', 'notifications lues effacées')}.`);
  }

  function vueNotifications(r, { focus }) {
    const ns = E.notifs, n = nonLues();
    let html = `<div class="titre-vue titre-notifs"><div><h1>Notifications</h1><p class="sous">${E.notifsEtat === 'absent' ? 'Bientôt dans l’application' : n ? pluriel(n, 'non lue', 'non lues') : ns.length ? 'Tout est lu' : 'Les nouvelles de la compagnie'}</p></div>
      ${ns.length ? `<button type="button" class="btn petit" data-tout-lu${n ? '' : ' disabled'}>${ICONES.coche}Tout marquer comme lu</button>` : ''}</div>`;
    if (E.notifsEtat === 'absent') html += etatVide('cloche', 'Les notifications arrivent bientôt', 'Une feuille de route publiée, des horaires changés, une nouvelle date : vous le lirez ici dès que la compagnie les aura mises en place.');
    else {
      html += `<div data-zone-push="notifs"${E.push.etat !== 'inconnu' ? ` data-etat="${E.push.etat}"` : ''}>${E.push.etat !== 'inconnu' ? cartePush(E.push.etat, 'notifs') : ''}</div>`;
      if (!ns.length) html += etatVide('cloche', 'Rien de neuf pour l’instant', 'Quand une feuille de route est publiée, qu’un horaire change (en tournée comme en répétition) ou qu’une date s’ajoute, vous le lirez ici.');
      else {
        let jour = null, ouvert = false;
        for (const x of ns) {
          const j = jourNotif(x.cree_le);
          if (j !== jour) { if (ouvert) html += '</ul></section>'; html += `<section class="notifs-groupe" aria-label="${esc(j)}"><h2 class="notifs-jour">${esc(j)}</h2><ul class="liste-notifs">`; jour = j; ouvert = true; }
          const g = GENRES[x.type] || GENRES.message;
          html += `<li><a class="notif n-${esc(x.type)}${x.lue_le ? '' : ' non-lue'}" href="${esc(lienDe(x))}" data-notif="${x.id}">
            <span class="ic-rond" aria-hidden="true">${g.ic}</span><span class="n-titre">${esc(x.titre)}${x.lue_le ? '' : '<span class="sr"> (non lue)</span>'}</span>
            <span class="n-heure"><span class="sr">, </span>${esc(quandNotif(x.cree_le))}</span>${x.texte ? `<span class="n-texte">${esc(x.texte)}</span>` : ''}${x.lue_le ? '' : '<span class="point-non-lu" aria-hidden="true"></span>'}</a></li>`;
        }
        if (ouvert) html += '</ul></section>';
        if (ns.some(x => x.lue_le)) html += '<p class="pied-vue"><button type="button" class="lien-btn" data-effacer-lues>Effacer les notifications lues</button></p>';
      }
    }
    afficher(r, TITRES.notifications, html, { focus });
    majCartePush();
  }

  // ================================================================================================ les notifications sur l'appareil (Web Push)
  const PUSH_OK = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const octets = b64 => { const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - b64.length % 4) % 4)); return Uint8Array.from(s, c => c.charCodeAt(0)); };
  async function swPret(ms = 4000) {
    if (!('serviceWorker' in navigator)) return null;
    return Promise.race([navigator.serviceWorker.ready, attendre(ms).then(() => null)]);
  }
  // la clé publique de la fonction d'envoi ; null : la fonction n'est pas (encore) déployée
  async function clePublique({ forcer = false } = {}) {
    if (!forcer && E.push.cle !== undefined && Date.now() - E.push.cleLe < 600000) return E.push.cle;
    const r = await fetch(POUSSER, { method: 'GET', cache: 'no-store' });
    E.push.cleLe = Date.now();
    if (r.status === 404) { E.push.cle = null; return null; }
    if (!r.ok) throw Object.assign(new Error(`la fonction d’envoi répond ${r.status}`), { status: r.status });
    const j = await r.json().catch(() => ({}));
    E.push.cle = typeof j.cle_publique === 'string' && j.cle_publique ? j.cle_publique : null;
    return E.push.cle;
  }
  // l'état de cet appareil : non (navigateur sans notifications), ios (iPhone : installer d'abord), indisponible (pas de
  // fonction d'envoi), bloque (refusées dans les réglages), actif, inactif, erreur (réseau)
  async function etatPush() {
    if (IOS && !installee()) return 'ios';
    if (!PUSH_OK) return 'non';
    if (Notification.permission === 'denied') return 'bloque';
    let cle;
    try { cle = await clePublique(); } catch (e) { return 'erreur'; }
    if (cle === null) return 'indisponible';
    const reg = await swPret();
    if (!reg) return 'non';
    const sub = await reg.pushManager.getSubscription();
    if (!sub || Notification.permission !== 'granted') return 'inactif';
    // l'abonnement du navigateur est-il bien dans la base ? (retiré par la fonction d'envoi, ou par un autre appareil)
    if (!E.push.verifie && E.session && !E.sansSession) {
      E.push.verifie = true;
      try {
        const { data, error } = await sb.from('crescite_abonnements').select('id').eq('endpoint', sub.endpoint).eq('personne_id', E.moi).maybeSingle();
        if (!error && !data) await enregistrerAbonnement(sub);
      } catch (e) { /* on réessaiera */ }
    }
    return 'actif';
  }
  function appareil() {
    const ua = navigator.userAgent;
    const os = /iPhone/.test(ua) ? 'iPhone' : IOS ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Appareil';
    const nav = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
    return `${[os, nav].filter(Boolean).join(' · ')}${installee() ? ' (application)' : ''}`;
  }
  async function enregistrerAbonnement(sub) {
    const j = sub.toJSON();
    const { error } = await sb.from('crescite_abonnements').upsert({ personne_id: E.moi, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, appareil: appareil() }, { onConflict: 'endpoint' });
    if (error) throw error;
  }
  async function activerPush(bouton) {
    // la permission se demande tout de suite, dans le geste (Safari l'exige)
    const permission = Notification.permission === 'default' ? Notification.requestPermission() : Promise.resolve(Notification.permission);
    vibrer(10);
    try {
      const p = await permission;
      if (p !== 'granted') { E.push.etat = p === 'denied' ? 'bloque' : 'inactif'; return majCartePush(); }
      const cle = await clePublique();
      if (!cle) { E.push.etat = 'indisponible'; return majCartePush(); }
      const reg = await swPret();
      if (!reg) throw new Error('le service de l’application n’est pas prêt : rechargez la page');
      const opts = { userVisibleOnly: true, applicationServerKey: octets(cle) };
      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        const k = sub.options && sub.options.applicationServerKey, a = k ? new Uint8Array(k) : null, b = opts.applicationServerKey;
        if (!a || a.length !== b.length || a.some((v, i) => v !== b[i])) { await sub.unsubscribe(); sub = null; }
      }
      if (!sub) sub = await reg.pushManager.subscribe(opts);
      try { await enregistrerAbonnement(sub); } catch (e) {
        // ce navigateur était abonné pour une autre personne : un nouvel abonnement, pour celle-ci
        if (!refusBase(e)) throw e;
        await sub.unsubscribe(); sub = await reg.pushManager.subscribe(opts); await enregistrerAbonnement(sub);
      }
      E.push.etat = 'actif'; E.push.verifie = true;
      majCartePush();
      annoncer('C’est fait : les notifications arriveront sur cet appareil, même application fermée.');
      const b = $('[data-push]');
      if (b) tt('confirmer', b);
    } catch (e) {
      console.warn('abonnement', e);
      majCartePush();
      annoncer(`Les notifications n’ont pas pu être activées : ${motsErreur(e)}.`, { erreur: true });
    }
  }
  async function desactiverPush({ silencieux = false } = {}) {
    const reg = await swPret(1500), sub = reg && reg.pushManager ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      if (E.moi && E.session && !E.sansSession) {
        const { error } = await sb.from('crescite_abonnements').delete().eq('endpoint', sub.endpoint).eq('personne_id', E.moi);
        if (error && !silencieux) annoncer(`L’appareil n’a pas pu être retiré de la liste : ${motsErreur(error)}.`, { erreur: true });
      }
      await sub.unsubscribe().catch(() => {});
    }
    E.push.etat = 'inactif';
    if (!silencieux) { majCartePush(); annoncer('Cet appareil ne recevra plus les notifications. Elles restent lisibles dans l’application.'); }
  }
  // les cartes « notifications sur cet appareil » (dans Moi, et en tête des notifications tant qu'elles ne sont pas activées)
  let majPushEnCours = null;
  function majCartePush() {
    const zones = $$('[data-zone-push]');
    if (!zones.length) return;
    zones.forEach(z => { if (!z.dataset.etat) z.innerHTML = z.dataset.zonePush === 'moi' ? '<p class="aide" role="status">Vérification de cet appareil…</p>' : ''; });
    const p = majPushEnCours || (majPushEnCours = etatPush().catch(() => 'erreur').finally(() => { majPushEnCours = null; }));
    p.then(etat => {
      E.push.etat = etat;
      $$('[data-zone-push]').forEach(z => { z.dataset.etat = etat; z.innerHTML = cartePush(etat, z.dataset.zonePush); });
    });
  }
  const ETAPES_IOS = `<ol class="etapes"><li>Dans Safari, touchez <b>Partager</b> <span class="ic-texte">${ICONES.partager}</span> en bas de l’écran.</li><li>Choisissez <b>Sur l’écran d’accueil</b>, puis <b>Ajouter</b>.</li><li>Ouvrez l’application <b>Crescite</b> depuis son icône.</li></ol>`;
  function cartePush(etat, ou) {
    const bascule = actif => `<div class="interrupteur"><span class="lib"><span id="lib-push">Recevoir les notifications sur cet appareil</span><small id="aide-push">${actif ? 'Activées : elles arrivent même application fermée.' : 'Feuilles de route, horaires changés, nouvelles dates : même application fermée.'}</small></span>
      <button type="button" role="switch" class="bascule" aria-checked="${actif}" aria-labelledby="lib-push" aria-describedby="aide-push" data-push></button></div>`;
    if (ou === 'notifs') {
      if (etat !== 'inactif' && etat !== 'ios') return '';
      return `<section class="carte-action push-proposition" aria-label="Notifications sur cet appareil"><span class="ic-rond" aria-hidden="true">${ICONES.cloche}</span>
        <div class="ca-texte"><b>Recevez-les aussi sur ${IOS ? 'votre iPhone' : 'cet appareil'}</b><p class="aide">${etat === 'ios' ? 'Installez d’abord l’application sur l’écran d’accueil : les notifications s’activent ensuite dans « Moi ».' : 'Même application fermée : une feuille de route publiée, des horaires changés.'}</p></div>
        ${etat === 'ios' ? '<a class="btn petit" href="#/moi">Comment faire</a>' : '<button type="button" class="btn petit principal" data-push-activer>Activer</button>'}</section>`;
    }
    if (etat === 'actif' || etat === 'inactif') return bascule(etat === 'actif');
    if (etat === 'ios') return `<p>Sur iPhone et iPad, les notifications n’arrivent qu’à l’application installée sur l’écran d’accueil.</p>${ETAPES_IOS}<p class="aide">Puis revenez ici, dans « Moi », pour les activer.</p>`;
    if (etat === 'bloque') return '<p class="message conseil">Les notifications sont bloquées pour cette application dans les réglages du navigateur (ou du téléphone). Autorisez-les, puis revenez ici.</p>';
    if (etat === 'indisponible') return `<p class="aide">${E.notifsEtat === 'absent' ? 'Les notifications arrivent bientôt : dans l’application, onglet Notifications, et sur l’appareil.'
      : 'Les notifications sur l’appareil arrivent bientôt. En attendant, elles s’affichent ici, dans l’application.'}</p>`;
    if (etat === 'non') return '<p class="aide">Ce navigateur ne sait pas recevoir de notifications. Elles restent lisibles dans l’application, onglet Notifications.</p>';
    return '<p class="aide">Impossible de vérifier pour le moment : il faut le réseau. <button type="button" class="lien-btn" data-push-verifier>Réessayer</button></p>';
  }

  // ================================================================================================ le planning et les disponibilités
  // Le planning commun (../admin/planning.js, PLANNING : la vue Équipe et la vue Mois), mes indisponibilités (à la main),
  // mes agendas (reliés : leurs heures occupées deviennent des indisponibilités ; et le flux de mes dates Crescite à ajouter
  // à mon agenda), les propositions de dates de l'administration. Tout passe par le script SQL 5 et la fonction
  // crescite-agenda : sans eux, une phrase claire, et rien d'autre ne change.
  // Le planning s'ouvre sur « Mes projets » (les gens de ses spectacles : voir groupesPlanning) quand la personne en a ;
  // « Toute l'équipe » est d'un geste dans la même liste. Une administratrice y masque des personnes, comme dans
  // l'administration : la liste est gardée avec son compte (script SQL 6), sinon sur cet appareil.
  const PL = () => (typeof PLANNING !== 'undefined' && PLANNING && typeof PLANNING.monter === 'function' ? PLANNING : null);
  const AGENDA_FN = `${BASE}/functions/v1/crescite-agenda`;
  const REPONSES = { oui: 'Disponible', non: 'Pas disponible', peut_etre: 'Peut-être' };
  const REPONSES_IC = { oui: 'coche', non: 'croix', peut_etre: 'question' };
  const fonctionAbsente = e => !!e && (e.code === 'PGRST202' || /Could not find the function/i.test(String(e.message || '')));
  const colonneAbsente = e => !!e && (e.code === '42703' || e.code === 'PGRST204' || /column .* does not exist|Could not find the .* column/i.test(String(e.message || '')));
  const dispoAbsente = e => tableAbsente(e) || fonctionAbsente(e) || colonneAbsente(e);
  const memeId = (a, b) => a != null && b != null && String(a) === String(b);
  // une journée entière : de minuit à minuit, heure de Paris (fin exclue) ; des heures : à l'heure de Paris
  const minuitParis = j => new Date(PL() ? PL().outils.minuit(j) : Date.parse(`${j}T00:00:00`)).toISOString();
  const heureParis = (j, h) => new Date(PL() ? PL().outils.instant(j, h) : Date.parse(`${j}T${h}:00`)).toISOString();
  const joursPeriode = x => (PL() ? PL().joursDe(x) : []);
  const texteJours = x => (PL() ? PL().texteJours(x) : jourLong(iso(new Date(x.debut))));
  const parisJour = t => (PL() ? PL().outils.jourParis(Date.parse(t)) : iso(new Date(t)));

  // ———— lire
  async function chargerPropositions() {
    if (E.moi == null) return;
    const { data, error } = await sb.from('crescite_propositions')
      .select('id, titre, message, statut, spectacle_id, cree_le, spectacle:crescite_spectacles(id, titre, slug), jours:crescite_propositions_jours(id, debut, fin, journee, reponses:crescite_propositions_reponses(personne_id, reponse, commentaire, repondu_le))')
      .order('cree_le', { ascending: false }).limit(60);
    if (error) {
      if (dispoAbsente(error)) { E.dispo.etat = 'absent'; E.dispo.propositions = []; E.dispo.propositionsLues = true; majBadgePlanning(); return; }
      throw error;
    }
    E.dispo.etat = 'ok';
    E.dispo.propositionsLues = true;
    const moi = String(E.moi);
    E.dispo.propositions = (data || []).map(p => ({ ...p, id: Number(p.id),
      jours: (p.jours || []).map(j => ({ ...j, id: Number(j.id), moi: (j.reponses || []).find(r => String(r.personne_id) === moi) || null }))
        .sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : 0)) }))
      .filter(p => p.jours.some(j => j.moi));                // celles qui me sont adressées (une administratrice les lit toutes)
    majBadgePlanning();
  }
  const aRepondre = p => p.statut === 'ouverte' && p.jours.some(j => j.moi && !j.moi.reponse && Date.parse(j.fin) > Date.now());
  const enAttente = () => (E.dispo.propositions || []).filter(aRepondre);
  function majBadgePlanning() {
    const n = enAttente().length;
    $$('.nav-item[data-onglet="planning"] .pastille-nb').forEach(p => { p.dataset.n = n; p.textContent = n ? String(n) : ''; });
    $$('.nav-item[data-onglet="planning"] .nb-sr').forEach(s => { s.textContent = n ? `, ${pluriel(n, 'proposition', 'propositions')} à répondre` : ''; });
  }
  async function chargerMesIndispos() {
    const depuis = new Date(Date.now() - 2 * 864e5).toISOString();
    const { data, error } = await sb.from('crescite_indisponibilites').select('id, personne_id, debut, fin, journee, motif, source, agenda_id')
      .eq('personne_id', E.moi).gte('fin', depuis).order('debut').limit(1000);
    if (error) { if (dispoAbsente(error)) { E.dispo.etat = 'absent'; return null; } throw error; }
    E.dispo.mesIndispos = data || [];
    return E.dispo.mesIndispos;
  }
  async function chargerAgendas() {
    // jamais l'adresse (url) : elle s'écrit, elle ne se relit pas
    const { data, error } = await sb.from('crescite_agendas_lies').select('id, nom, actif, derniere_synchro, erreur, nb_evenements, cree_le')
      .eq('personne_id', E.moi).order('cree_le').order('id');
    if (error) { if (dispoAbsente(error)) { E.dispo.etat = 'absent'; return null; } throw error; }
    E.dispo.agendas = data || [];
    return E.dispo.agendas;
  }
  async function chargerJeton() {
    const { data, error } = await sb.from('crescite_personnes_privees').select('agenda_jeton').eq('personne_id', E.moi).maybeSingle();
    if (error) { if (dispoAbsente(error)) { E.dispo.etat = 'absent'; E.dispo.jeton = null; return null; } throw error; }
    E.dispo.jeton = (data && data.agenda_jeton) || null;
    return E.dispo.jeton;
  }
  const lienFlux = j => `${AGENDA_FN}?flux=${encodeURIComponent(j)}`;
  const lienWebcal = j => lienFlux(j).replace(/^https:/, 'webcal:');
  const lienGoogle = j => `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(lienWebcal(j))}`;
  async function jetonConnexion() { try { const { data } = await sb.auth.getSession(); return data && data.session ? data.session.access_token : null; } catch (e) { return null; } }
  // la fonction crescite-agenda, au nom de la personne ; { absente: true } si elle n'est pas encore déployée
  async function appelerAgenda(corps) {
    const jeton = await jetonConnexion();
    const r = await fetch(AGENDA_FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: CLE, ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) }, body: JSON.stringify(corps) });
    if (r.status === 404) return { absente: true };
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.erreur || `erreur ${r.status}`), { status: r.status });
    return j;
  }
  // une écriture qui ne relit rien (l'adresse d'un agenda ne se relit pas) : Prefer: return=minimal
  async function insererSansRelire(table, ligne) {
    const jeton = await jetonConnexion();
    const r = await fetch(`${BASE}/rest/v1/${table}`, { method: 'POST', headers: { apikey: CLE, Authorization: `Bearer ${jeton || CLE}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(ligne) });
    if (r.ok) return null;
    const j = await r.json().catch(() => ({}));
    return Object.assign(new Error(j.message || `erreur ${r.status}`), { code: j.code, status: r.status });
  }

  // ———— la vue Planning
  function vuePlanning(r, { focus }) {
    const absent = E.dispo.etat === 'absent';
    let html = `<div class="titre-vue titre-planning"><div><h1>Planning</h1><p class="sous">Qui est libre, qui part : toute l’équipe, jour par jour.</p></div>
      ${absent ? '' : `<div class="gestes-planning"><a class="btn petit" href="#/indisponibilites">${ICONES.indispo}Mes indisponibilités</a><a class="btn petit" href="#/agendas">${ICONES.relier}Mes agendas</a></div>`}</div>`;
    if (absent) html += etatVide('calendrier', 'Le planning arrive bientôt', 'La compagnie le met en place : vous y direz quand vous n’êtes pas libre (ou vous relierez votre agenda), et vous verrez les disponibilités de toute l’équipe.');
    else if (!PL()) html += etatVide('calendrier', 'Le planning ne s’est pas chargé', 'Vérifiez votre connexion, puis actualisez la page.');
    else {
      const attente = enAttente();
      if (attente.length) html += cartesPropositions(attente);
      html += '<div id="planning" class="zone-planning"></div>';
    }
    afficher(r, TITRES.planning, html, { focus, large: true });
    if (!absent && PL()) monterPlanning();
  }
  function cartesPropositions(xs) {
    return `<section class="propositions-attente" aria-labelledby="t-prop-att"><h2 class="titre-section" id="t-prop-att">${xs.length > 1 ? 'Des dates vous sont proposées' : 'Une proposition attend votre réponse'}</h2>
      ${xs.map(p => { const n = p.jours.filter(j => j.moi && !j.moi.reponse).length; return `<a class="carte-prop" href="#/proposition/${p.id}">
        <span class="ic-rond" aria-hidden="true">${ICONES.question}</span><span class="cp-texte"><b>${esc(p.titre)}</b>
        <small>${esc([p.spectacle?.titre, `${pluriel(p.jours.length, 'jour')} proposé${p.jours.length > 1 ? 's' : ''}`, n < p.jours.length ? `${n} sans réponse` : ''].filter(Boolean).join(' · '))}</small></span>
        <span class="etiquette a-repondre">Répondre</span>${ICONES.chevron}</a>`; }).join('')}</section>`;
  }
  function monterPlanning() {
    const el = $('#planning');
    if (!el || !PL()) return;
    demonterPlanning();
    const st = E.planningEtat || {}, cache = E.planningCache;
    const vue = st.vue || 'equipe', jour = st.jour || aujourdhui(), semaines = st.semaines || 6;
    const per = PLANNING.periode(vue, jour, semaines);
    const garde = cache && cache.uid === E.uid && cache.de === per.de && cache.a === per.a ? cache.D : undefined;
    // le filtre de départ : « Mes projets » quand la personne en a, sauf si la session a déjà le sien
    const groupes = groupesPlanning();
    const filtre = E.planningEtat ? st.filtre || null : groupes.length ? { groupe: groupes[0].id } : null;
    let pl = null, masquesPoses = E.masques !== undefined;
    pl = E.planning = PLANNING.monter(el, {
      vue, jour, semaines, filtre, groupes, donnees: garde,
      // masquer des personnes : le planning ne le propose qu'à une administratrice (les données le disent)
      masquer: true, masques: E.masques || [], surMasques: garderMasques,
      charger: async (de, a) => {
        const { data, error } = await sb.rpc('crescite_planning', { de, a });
        if (error) { if (dispoAbsente(error)) E.dispo.etat = 'absent'; throw error; }
        // une administratrice : ses personnes masquées, lues une fois, avant que le planning se dessine sans elles
        if (data && data.admin) { await lireMasques(); if (pl && !masquesPoses) { masquesPoses = true; pl.masques(E.masques); } }
        E.planningCache = { uid: E.uid, de, a, D: data };
        return data;
      },
      messageErreur: e => (dispoAbsente(e) ? 'Le planning arrive bientôt : la compagnie le met en place.'
        : estReseau(e) ? 'Le planning se lit en ligne : vérifiez votre connexion, puis réessayez.' : `Le planning n’a pas pu être lu : ${motsErreur(e) || 'réessayez dans un instant'}.`),
      photo: chemin => `${PUBLIC}/${String(chemin).split('/').map(encodeURIComponent).join('/')}`,
      spectacles: [...E.spectacles.values()].map(s => ({ id: s.id, titre: s.titre })),
      distributions: E.distributions.map(x => ({ spectacle_id: x.spectacle_id, personne_id: x.personne_id })),
      actions: actionsJour,
      surJour: () => vibrer(6),
      surChangement: etat => { E.planningEtat = { vue: etat.vue, jour: etat.jour, semaines: etat.semaines, filtre: etat.filtre }; },
    });
    if (garde) E.planning.actualiser();
  }
  function demonterPlanning() { if (E.planning) { try { E.planning.detruire(); } catch (e) { /* déjà parti */ } E.planning = null; } }
  // les personnes masquées du planning (une administratrice) : gardées avec son compte (crescite_preferences, script SQL 6,
  // clé planning.masques) ; sans le script, sur cet appareil. La liste de l'appareil passe une fois dans la base quand le
  // script est là. Une table absente ne se dit pas : le planning marche pareil.
  const PREF_MASQUES = 'planning.masques', LOCAL_MASQUES = 'crescite-planning-masques';
  const ecrirePreference = async (cle, valeur) => (await sb.from('crescite_preferences').upsert({ user_id: E.uid, cle, valeur }, { onConflict: 'user_id,cle' })).error;
  function lireMasques() {
    const uid = E.uid;
    if (!E.lectureMasques) E.lectureMasques = (async () => {
      const ici = lireStock(LOCAL_MASQUES), locaux = Array.isArray(ici) ? ici : [];
      const { data, error } = await sb.from('crescite_preferences').select('valeur').eq('user_id', uid).eq('cle', PREF_MASQUES).maybeSingle();
      if (E.uid !== uid) return;                                  // un autre compte entre-temps : sa lecture est la sienne
      if (error) { E.prefs = tableAbsente(error) ? 'absent' : 'erreur'; E.masques = locaux; return; }
      E.prefs = 'ok';
      if (data) { E.masques = Array.isArray(data.valeur) ? data.valeur : []; return; }
      E.masques = locaux;
      if (locaux.length) ecrirePreference(PREF_MASQUES, locaux).then(err => { if (!err) ecrireStock(LOCAL_MASQUES, null); }, () => {});
    })().catch(() => { if (E.masques === undefined) E.masques = []; });
    return E.lectureMasques;
  }
  // chaque changement s'enregistre, dans l'ordre
  function garderMasques(ids) {
    E.masques = ids;
    E.ecritureMasques = (E.ecritureMasques || Promise.resolve()).then(async () => {
      if (E.prefs === 'absent') return ecrireStock(LOCAL_MASQUES, ids);
      const err = await ecrirePreference(PREF_MASQUES, ids);
      if (!err) { E.prefs = 'ok'; return; }
      if (tableAbsente(err)) { E.prefs = 'absent'; ecrireStock(LOCAL_MASQUES, ids); return; }
      annoncer(`Ce n’est pas enregistré : ${motsErreur(err) || 'la base a refusé'}.`, { erreur: true });
    }).catch(() => {});
  }
  // les boutons du jour choisi, dans le planning : les siens seulement
  function actionsJour(s) {
    if (s.personne && !memeId(s.personne.id, E.moi)) return [];
    if (s.jour < aujourdhui()) return [];
    const moi = String(E.moi), acts = [];
    const miennes = s.indisponibilites.filter(x => String(x.personne_id) === moi);
    const manuelle = miennes.find(x => x.source !== 'agenda');
    if (manuelle) {
      const un = joursPeriode(manuelle).length === 1;
      acts.push(un ? { libelle: 'Je suis libre, finalement', principal: true, faire: () => retirerIndispo(manuelle) }
        : { libelle: 'Modifier cette indisponibilité', principal: true, faire: () => { E.dispo.modifier = manuelle.id; location.hash = '#/indisponibilites'; } });
    } else {
      acts.push({ libelle: miennes.length ? 'Pas libre de toute la journée' : 'Je ne suis pas libre ce jour-là', principal: true, faire: sel => ajouterJournee(sel.jour) });
      acts.push({ libelle: 'Seulement quelques heures…', faire: sel => { E.dispo.brouillon = { type: 'heures', du: sel.jour }; location.hash = '#/indisponibilites'; } });
    }
    const vues = new Set();
    for (const x of s.propositions) {
      const p = x.proposition;
      if (vues.has(p.id) || !(x.jour.reponses || []).some(r => String(r.personne_id) === moi)) continue;
      vues.add(p.id);
      acts.push({ libelle: `Répondre : ${p.titre}`, faire: () => { location.hash = `#/proposition/${p.id}`; } });
    }
    return acts;
  }
  function apresEcriture() { E.planningCache = null; if (E.planning) E.planning.actualiser(); }
  async function ajouterJournee(jour) {
    const ligne = { personne_id: E.moi, debut: minuitParis(jour), fin: minuitParis(lendemain(jour)), journee: true, motif: null };
    const { data, error } = await sb.from('crescite_indisponibilites').insert(ligne).select('id, personne_id, debut, fin, journee, motif, source, agenda_id').single();
    if (error) return annoncer(`Ce n’est pas enregistré : ${motsErreur(error) || 'la base a refusé'}.`, { erreur: true });
    vibrer(10);
    E.dispo.mesIndispos = null;
    annoncer(`C’est noté : vous n’êtes pas libre ${texteJours(ligne)}.`, { action: { libelle: 'Annuler', f: () => retirerIndispo(data, { silencieux: true }) } });
    apresEcriture();
  }
  async function retirerIndispo(x, { silencieux = false } = {}) {
    const { error } = await sb.from('crescite_indisponibilites').delete().eq('id', x.id).eq('personne_id', E.moi);
    if (error) return annoncer(`Ce n’est pas retiré : ${motsErreur(error) || 'la base a refusé'}.`, { erreur: true });
    if (E.dispo.mesIndispos) E.dispo.mesIndispos = E.dispo.mesIndispos.filter(y => y.id !== x.id);
    annoncer(silencieux ? 'C’est annulé.' : `C’est noté : vous êtes libre ${texteJours(x)}.`);
    apresEcriture();
    if (E.vue === 'indisponibilites') { await retirerLigne($(`[data-indispo="${x.id}"]`)); majListeIndispos(); }
  }

  // ———— mes indisponibilités
  function vueIndispos(r, { focus }) {
    const entete = '<div class="titre-vue"><h1>Mes indisponibilités</h1><p class="sous">Les jours où vous n’êtes pas libre. Toute l’équipe voit quand ; le motif reste entre vous et l’administration.</p></div>';
    if (E.dispo.etat === 'absent') return afficher(r, TITRES.indisponibilites, entete + etatVide('calendrier', 'Bientôt dans l’application', 'La compagnie met en place le planning de l’équipe : vous pourrez y noter vos indisponibilités.'), { focus });
    const xs = E.dispo.mesIndispos;
    const edition = E.dispo.modifier != null && xs ? xs.find(x => x.id === E.dispo.modifier && x.source !== 'agenda') || null : null;
    const brouillon = E.dispo.brouillon;
    E.dispo.modifier = null; E.dispo.brouillon = null;
    const html = `${entete}${formIndispo(edition, brouillon)}<div id="zone-indispos">${xs == null ? '<p class="chargement" role="status">Lecture de vos indisponibilités…</p>' : listeIndispos(xs)}</div>
      <section class="carte-action" aria-labelledby="t-relier-i"><span class="ic-rond" aria-hidden="true">${ICONES.relier}</span><div class="ca-texte"><h2 id="t-relier-i">Votre agenda le sait déjà ?</h2>
        <p class="aide">Reliez Google Agenda, Apple ou Outlook : vos heures occupées s’y lisent toutes seules, sans titre ni lieu.</p></div><a class="btn petit" href="#/agendas">Relier mon agenda</a></section>`;
    afficher(r, TITRES.indisponibilites, html, { focus });
    brancherFormIndispo(edition);
    if (xs == null) chargerMesIndispos().then(() => majListeIndispos()).catch(e => { const z = $('#zone-indispos'); if (z && E.vue === 'indisponibilites') z.innerHTML = `<p class="message erreur" role="alert">Vos indisponibilités n’ont pas pu être lues : ${esc(motsErreur(e) || 'réessayez')}.</p>`; });
  }
  // une ligne qui s'en va se replie (puis la liste se redessine sans elle)
  async function retirerLigne(el) {
    if (!el || reduit() || typeof el.animate !== 'function') return;
    el.style.overflow = 'hidden';
    await el.animate([{ height: `${el.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0, paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', marginBottom: '0px' }], { duration: 260, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' }).finished.catch(() => {});
  }
  function majListeIndispos() {
    const z = $('#zone-indispos');
    if (!z || E.vue !== 'indisponibilites') return;
    if (E.dispo.mesIndispos == null) { chargerMesIndispos().then(() => { if (E.dispo.mesIndispos) majListeIndispos(); }).catch(() => {}); return; }
    const deja = z.dataset.rendu === '1', avant = new Set($$('[data-indispo]', z).map(x => x.dataset.indispo));
    z.innerHTML = listeIndispos(E.dispo.mesIndispos);
    z.dataset.rendu = '1';
    if (deja && !reduit()) $$('[data-indispo]', z).forEach(li => { if (!avant.has(li.dataset.indispo)) li.classList.add('neuve'); });   // la neuve se pose
  }
  function formIndispo(x, b) {
    const type = x ? (x.journee ? (joursPeriode(x).length > 1 ? 'jours' : 'jour') : 'heures') : (b && b.type) || 'jour';
    const js = x ? joursPeriode(x) : [];
    const du = x ? js[0]?.jour || parisJour(x.debut) : (b && b.du) || '';
    const au = x && js.length ? js[js.length - 1].jour : '';
    const de = x && !x.journee ? (js[0]?.de || '09:00') : '09:00', a = x && !x.journee ? (js[js.length - 1]?.a || '18:00') : '18:00';
    const choix = (v, lib) => `<label class="segment"><input type="radio" name="type" value="${v}"${type === v ? ' checked' : ''}><span>${lib}</span></label>`;
    return `<form class="carte form-indispo" id="f-indispo" novalidate aria-labelledby="t-indispo" data-type="${type}"${x ? ` data-id="${x.id}"` : ''}>
      <h2 id="t-indispo">${x ? 'Modifier une indisponibilité' : 'Je ne suis pas libre…'}</h2>
      <fieldset class="segments"><legend class="sr">Combien de temps</legend>${choix('jour', 'Une journée')}${choix('jours', 'Plusieurs jours')}${choix('heures', 'Quelques heures')}</fieldset>
      <div class="deux-champs">
        <div class="champ"><label for="i-du" id="l-du">${type === 'jours' ? 'Du' : 'Le'}</label><input id="i-du" type="date" value="${esc(du)}" min="${aujourdhui()}" required></div>
        <div class="champ" data-pour="jours"><label for="i-au">Au (compris)</label><input id="i-au" type="date" value="${esc(au)}" min="${aujourdhui()}"></div>
      </div>
      <div class="deux-champs" data-pour="heures">
        <div class="champ"><label for="i-de">De</label><input id="i-de" type="time" step="900" value="${esc(de)}"></div>
        <div class="champ"><label for="i-a">À</label><input id="i-a" type="time" step="900" value="${esc(a)}"></div>
      </div>
      <div class="champ"><label for="i-motif">Motif <span class="facultatif">(facultatif)</span></label><input id="i-motif" maxlength="120" autocomplete="off" value="${esc(x && x.motif || '')}" placeholder="Tournage, vacances, rendez-vous…" aria-describedby="i-motif-aide">
        <p class="aide" id="i-motif-aide">Visible par vous et l’administration seulement.</p></div>
      <div class="pied-form"><button type="submit" class="btn principal">${x ? 'Enregistrer' : 'Ajouter'}</button>${x ? '<button type="button" class="btn" data-annuler-indispo>Annuler</button>' : ''}<p class="etat-form" role="status"></p></div>
    </form>`;
  }
  function brancherFormIndispo(edition) {
    const f = $('#f-indispo');
    if (!f) return;
    const du = $('#i-du', f), au = $('#i-au', f), de = $('#i-de', f), a = $('#i-a', f), motif = $('#i-motif', f);
    const typeDe = () => ($('input[name="type"]:checked', f) || {}).value || 'jour';
    f.addEventListener('change', e => {
      if (e.target.name === 'type') { f.dataset.type = typeDe(); $('#l-du', f).textContent = typeDe() === 'jours' ? 'Du' : 'Le'; if (typeDe() === 'jours' && !au.value && du.value) au.value = du.value; }
      if (e.target === du && au.value && au.value < du.value) au.value = du.value;
      if (e.target === du) au.min = du.value || aujourdhui();
    });
    [du, au, de, a].forEach(i => i.addEventListener('input', () => effacerErreur(i)));
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const t = typeDe();
      if (!estJour(du.value)) return erreurChamp(du, 'Choisissez le jour.');
      let ligne;
      if (t === 'jour') ligne = { debut: minuitParis(du.value), fin: minuitParis(lendemain(du.value)), journee: true };
      else if (t === 'jours') {
        if (!estJour(au.value)) return erreurChamp(au, 'Choisissez le dernier jour.');
        if (au.value < du.value) return erreurChamp(au, 'Le dernier jour vient après le premier.');
        if (ecartJours(du.value, au.value) > 366) return erreurChamp(au, 'Une année au plus à la fois.');
        ligne = { debut: minuitParis(du.value), fin: minuitParis(lendemain(au.value)), journee: true };
      } else {
        if (!/^\d{2}:\d{2}$/.test(de.value)) return erreurChamp(de, 'Indiquez l’heure du début.');
        if (!/^\d{2}:\d{2}$/.test(a.value) || a.value <= de.value) return erreurChamp(a, 'L’heure de fin vient après celle du début.');
        ligne = { debut: heureParis(du.value, de.value), fin: heureParis(du.value, a.value), journee: false };
      }
      ligne.motif = motif.value.trim() || null;
      const id = f.dataset.id ? Number(f.dataset.id) : null;
      const b = $('button[type=submit]', f);
      const res = await occupe(b, 'Enregistrement…', () => (id
        ? sb.from('crescite_indisponibilites').update(ligne).eq('id', id).eq('personne_id', E.moi).select('id')
        : sb.from('crescite_indisponibilites').insert({ personne_id: E.moi, ...ligne }).select('id')));
      if (res.error || !res.data || !res.data.length) return dire(zoneMessage(f), `Ce n’est pas enregistré : ${res.error ? esc(motsErreur(res.error) || 'la base a refusé') : 'cette indisponibilité n’est plus là'}.`);
      vibrer(10);
      requestAnimationFrame(() => tt('confirmer', b));
      annoncer(`C’est noté : vous n’êtes pas libre ${texteJours(ligne)}.`);
      E.dispo.mesIndispos = null;
      apresEcriture();
      if (id) { location.hash = '#/indisponibilites'; vueIndispos(E.route, { focus: false }); return; }
      f.reset(); f.dataset.type = 'jour'; $('#l-du', f).textContent = 'Le';
      majListeIndispos();
    });
  }
  function listeIndispos(xs) {
    const maintenant = Date.now();
    const venir = xs.filter(x => Date.parse(x.fin) > maintenant);
    const miennes = venir.filter(x => x.source !== 'agenda'), lues = venir.filter(x => x.source === 'agenda');
    const ligne = x => {
      const t = majuscule(texteJours(x)), agenda = x.source === 'agenda';
      return `<li class="indispo-ligne${agenda ? ' agenda' : ''}" data-indispo="${x.id}"><span class="hach" aria-hidden="true"></span><span class="il-texte"><b>${esc(t)}</b>${x.motif || agenda ? `<small>${esc([x.motif, agenda ? 'd’après votre agenda relié' : ''].filter(Boolean).join(' · '))}</small>` : ''}</span>
        ${agenda ? '' : `<span class="il-gestes"><button type="button" class="bouton-rond" data-modifier-indispo="${x.id}">${ICONES.crayon}<span class="sr">Modifier : ${esc(t)}</span></button><button type="button" class="bouton-rond" data-retirer-indispo="${x.id}">${ICONES.croix}<span class="sr">Retirer : ${esc(t)}</span></button></span>`}</li>`;
    };
    let html = `<section class="carte" aria-labelledby="t-liste-i"><h2 id="t-liste-i">À venir</h2>`;
    html += miennes.length ? `<ul class="liste-indispos">${miennes.map(ligne).join('')}</ul>` : '<p class="vide-court">Rien de noté à la main : vous êtes libre, sauf ce que dit votre agenda.</p>';
    if (lues.length) html += `<details class="indispos-lues"><summary>${pluriel(lues.length, 'moment occupé', 'moments occupés')} lu${lues.length > 1 ? 's' : ''} dans vos agendas</summary><ul class="liste-indispos">${lues.slice(0, 200).map(ligne).join('')}</ul></details>`;
    return html + '</section>';
  }

  // ———— mes agendas : relier un agenda, et mes dates Crescite dans mon agenda
  const nomAgenda = u => (/google\.com/i.test(u) ? 'Google Agenda' : /icloud\.com/i.test(u) ? 'Apple iCloud' : /outlook|office365|live\.com|hotmail/i.test(u) ? 'Outlook' : 'Mon agenda');
  function vueAgendas(r, { focus }) {
    const entete = '<div class="titre-vue"><h1>Mes agendas</h1><p class="sous">Votre agenda dit quand vous êtes pris ; le vôtre reçoit vos dates Crescite.</p></div>';
    if (E.dispo.etat === 'absent') return afficher(r, TITRES.agendas, entete + etatVide('calendrier', 'Bientôt dans l’application', 'La compagnie met en place le planning de l’équipe : vous pourrez y relier votre agenda, et recevoir vos dates Crescite dans le vôtre.'), { focus });
    const html = `${entete}<div id="zone-agendas">${blocAgendas()}</div>${formAgenda()}<div id="zone-flux">${blocFlux()}</div>`;
    afficher(r, TITRES.agendas, html, { focus });
    brancherFormAgenda();
    const lire = [];
    if (E.dispo.agendas == null) lire.push(chargerAgendas().then(() => majZone('#zone-agendas', blocAgendas)));
    if (E.dispo.jeton === undefined) lire.push(chargerJeton().then(() => { majZone('#zone-flux', blocFlux); verifierFlux(); }));
    else verifierFlux();
    Promise.all(lire).catch(e => annoncer(`Vos agendas n’ont pas pu être lus : ${motsErreur(e) || 'réessayez'}.`, { erreur: true }))
      .then(() => { if (E.dispo.etat === 'absent' && E.vue === 'agendas') vueAgendas(r, { focus: false }); });
  }
  const majZone = (s, f) => { const z = $(s); if (z && (E.vue === 'agendas')) z.innerHTML = f(); };
  function etatAgenda(a) {
    if (E.dispo.lecture.has(a.id)) return { cls: 'al-attente', texte: 'Lecture en cours…' };
    if (a.erreur && !a.derniere_synchro) return { cls: 'al-erreur', texte: a.erreur };
    if (a.erreur) return { cls: 'al-erreur', texte: `${a.erreur} (dernière lecture réussie ${momentTexte(a.derniere_synchro)})` };
    if (!a.derniere_synchro) return { cls: 'al-attente', texte: E.dispo.fonction === 'absente' ? 'Relié. La lecture automatique n’est pas encore en service : elle commencera dès que la compagnie l’aura activée.' : 'Relié, pas encore lu : la lecture se fait toutes les heures.' };
    const n = a.nb_evenements || 0;
    return { cls: 'al-ok', texte: `Lu ${momentTexte(a.derniere_synchro)} · ${n ? `${pluriel(n, 'moment occupé', 'moments occupés')} dans les 13 prochains mois` : 'aucun moment occupé dans les 13 prochains mois'}` };
  }
  function blocAgendas() {
    const xs = E.dispo.agendas;
    if (xs == null) return '<p class="chargement" role="status">Lecture de vos agendas…</p>';
    if (!xs.length) return '';
    return `<section class="carte" aria-labelledby="t-lies"><h2 id="t-lies">${xs.length > 1 ? 'Mes agendas reliés' : 'Mon agenda relié'}</h2><ul class="agendas-lies">${xs.map(a => {
      const e = etatAgenda(a);
      return `<li class="agenda-lie ${e.cls}" data-agenda-id="${a.id}"><span class="ic-rond" aria-hidden="true">${e.cls === 'al-erreur' ? ICONES.croix : e.cls === 'al-ok' ? ICONES.coche : ICONES.relier}</span>
        <div class="al-texte"><b>${esc(a.nom || 'Mon agenda')}</b><small class="al-etat"${e.cls === 'al-erreur' ? ' role="alert"' : ''}>${esc(e.texte)}</small></div>
        <div class="al-gestes"><button type="button" class="btn petit" data-relire-agenda="${a.id}"${E.dispo.lecture.has(a.id) ? ' disabled' : ''}>${ICONES.actualiser}Relire</button><button type="button" class="btn petit" data-delier-agenda="${a.id}">Délier<span class="sr"> : ${esc(a.nom || 'Mon agenda')}</span></button></div></li>`;
    }).join('')}</ul><p class="aide">Seules les heures sont lues : ni titre, ni lieu, ni participants. Les événements « disponible » ne comptent pas : dans Google Agenda, un événement « toute la journée » est « disponible » par défaut ; mettez-le en « occupé » pour qu’il compte.</p></section>`;
  }
  const ETAPES = {
    google: ['Sur un ordinateur, ouvrez <b>Google Agenda</b>, puis <b>Paramètres</b> (la roue dentée, en haut).', 'À gauche, sous <b>Paramètres de mes agendas</b>, choisissez votre agenda.',
      'Descendez jusqu’à <b>Intégrer l’agenda</b>.', 'Copiez l’<b>Adresse secrète au format iCal</b> (elle finit par <code>basic.ics</code>), puis collez-la ci-dessous.'],
    apple: ['Sur iPhone, ouvrez <b>Calendrier</b>, puis <b>Calendriers</b> en bas.', 'Touchez <b>ⓘ</b> à côté de votre calendrier, et activez <b>Calendrier public</b>.',
      'Touchez <b>Partager le lien</b>, puis <b>Copier</b>, et collez-le ci-dessous (il commence par <code>webcal://</code>).', 'Sur Mac : dans Calendrier, clic droit sur le calendrier, <b>Partager le calendrier</b>, cochez <b>Calendrier public</b>.'],
    outlook: ['Sur outlook.com (ou Outlook sur le web), ouvrez <b>Paramètres</b>, puis <b>Calendrier</b>, puis <b>Calendriers partagés</b>.', 'Sous <b>Publier un calendrier</b>, choisissez votre calendrier et <b>Peut afficher quand je suis occupé(e)</b>, puis <b>Publier</b>.',
      'Copiez le <b>lien ICS</b>, et collez-le ci-dessous.'],
  };
  function formAgenda() {
    const etapes = (k, titre, ouvert) => `<details class="etapes-agenda"${ouvert ? ' open' : ''}><summary>${titre}</summary><ol class="etapes">${ETAPES[k].map(x => `<li>${x}</li>`).join('')}</ol></details>`;
    return `<form class="carte form-agenda" id="f-agenda" novalidate aria-labelledby="t-relier"><h2 id="t-relier">Relier un agenda</h2>
      <p class="intro">Vos heures occupées deviennent vos indisponibilités, d’elles-mêmes, toutes les heures. Il faut l’adresse secrète (ou publique) de votre agenda, au format iCal :</p>
      ${etapes('google', 'Google Agenda', true)}${etapes('apple', 'Apple (iCloud)', false)}${etapes('outlook', 'Outlook', false)}
      <div class="champ"><label for="a-url">L’adresse de l’agenda</label><input id="a-url" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://… ou webcal://…" aria-describedby="a-url-aide">
        <p class="aide" id="a-url-aide">Elle reste secrète : personne ne la revoit, pas même vous ; seule la lecture des heures s’en sert.</p></div>
      <div class="champ"><label for="a-nom">Son nom <span class="facultatif">(facultatif)</span></label><input id="a-nom" maxlength="40" autocomplete="off" placeholder="Google Agenda"></div>
      <div class="pied-form"><button type="submit" class="btn principal">${ICONES.relier}Relier</button><p class="etat-form" role="status"></p></div>
    </form>`;
  }
  function brancherFormAgenda() {
    const f = $('#f-agenda');
    if (!f) return;
    const url = $('#a-url', f), nom = $('#a-nom', f);
    url.addEventListener('input', () => { effacerErreur(url); if (!nom.dataset.touche) nom.placeholder = nomAgenda(url.value); });
    nom.addEventListener('input', () => { nom.dataset.touche = '1'; });
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const u = url.value.trim().replace(/^webcals?:\/\//i, 'https://');
      if (!u) return erreurChamp(url, 'Collez l’adresse iCal de votre agenda.');
      if (!/^https:\/\/[^/\s]+\.[^/\s]+\/\S*$/i.test(u)) return erreurChamp(url, 'Il faut l’adresse iCal de l’agenda : elle commence par https:// ou webcal://.');
      const b = $('button[type=submit]', f);
      const err = await occupe(b, 'Relier…', () => insererSansRelire('crescite_agendas_lies', { personne_id: E.moi, nom: nom.value.trim() || nomAgenda(u), url: u, actif: true }));
      if (err) {
        if (dispoAbsente(err)) { E.dispo.etat = 'absent'; return vueAgendas(E.route, { focus: false }); }
        return dire(zoneMessage(f), `L’agenda n’est pas relié : ${esc(err.code === '22023' ? 'cette adresse n’est pas une adresse d’agenda iCal (https://… ou webcal://…)' : motsErreur(err) || err.message || 'la base a refusé')}.`);
      }
      url.value = ''; nom.value = ''; delete nom.dataset.touche;
      zoneMessage(f).innerHTML = '';
      vibrer(10);
      await chargerAgendas().catch(() => {});
      const neuf = (E.dispo.agendas || []).reduce((m, a) => (!m || Number(a.id) > Number(m.id) ? a : m), null);
      majZone('#zone-agendas', blocAgendas);
      $('#zone-agendas')?.scrollIntoView({ block: 'nearest', behavior: reduit() ? 'auto' : 'smooth' });
      if (neuf) await relireAgenda(neuf.id, { premiere: true });
    });
  }
  async function relireAgenda(id, { premiere = false } = {}) {
    E.dispo.lecture.add(Number(id));
    majZone('#zone-agendas', blocAgendas);
    try {
      const r = await appelerAgenda({ synchro: true, agenda_id: Number(id) });
      if (r.absente) {
        E.dispo.fonction = 'absente';
        if (!premiere) annoncer('La lecture automatique n’est pas encore en service : elle commencera dès que la compagnie l’aura activée.');
      } else if (r.agenda) {
        E.dispo.fonction = 'ok';
        E.dispo.agendas = (E.dispo.agendas || []).map(a => (Number(a.id) === Number(r.agenda.id) ? { ...a, ...r.agenda } : a));
        if (r.agenda.erreur) annoncer('L’agenda n’a pas pu être lu : voyez la raison sous son nom.', { erreur: true });
        else annoncer(premiere ? `Agenda relié : ${pluriel(r.agenda.nb_evenements || 0, 'moment occupé', 'moments occupés')} lu${(r.agenda.nb_evenements || 0) > 1 ? 's' : ''}.` : 'Agenda relu.');
        E.dispo.mesIndispos = null;
        apresEcriture();
      }
    } catch (e) {
      annoncer(`La lecture n’a pas pu se faire : ${esc(e.status === 401 ? 'reconnectez-vous' : estReseau(e) ? 'pas de réseau' : e.message)}.`, { erreur: true });
    } finally {
      E.dispo.lecture.delete(Number(id));
      majZone('#zone-agendas', blocAgendas);
    }
  }
  async function delierAgenda(id) {
    const a = (E.dispo.agendas || []).find(x => Number(x.id) === Number(id));
    if (!confirm(`Délier « ${a ? a.nom : 'cet agenda'} » ? Les moments occupés lus dans cet agenda disparaîtront du planning.`)) return;
    const { error } = await sb.from('crescite_agendas_lies').delete().eq('id', id).eq('personne_id', E.moi);
    if (error) return annoncer(`L’agenda n’est pas délié : ${motsErreur(error) || 'la base a refusé'}.`, { erreur: true });
    E.dispo.agendas = (E.dispo.agendas || []).filter(x => Number(x.id) !== Number(id));
    E.dispo.mesIndispos = null;
    annoncer('Agenda délié.');
    majZone('#zone-agendas', blocAgendas);
    apresEcriture();
  }
  function blocFlux() {
    const j = E.dispo.jeton;
    const intro = '<h2 id="t-flux">Mes dates Crescite dans mon agenda</h2><p class="intro">Abonnez votre agenda à vos dates (représentations, répétitions, résidences) : elles s’y ajoutent, avec les horaires et les lieux, et s’y mettent à jour d’elles-mêmes. Les dates que l’administration vous propose y paraissent aussi, « à confirmer », jusqu’à ce que vous répondiez non ou que la proposition soit close.</p>';
    if (j === undefined) return `<section class="carte" aria-labelledby="t-flux">${intro}<p class="chargement" role="status">Lecture de votre lien…</p></section>`;
    if (!j) return `<section class="carte" aria-labelledby="t-flux">${intro}<p class="message conseil">Votre lien personnel n’est pas encore prêt : la compagnie met le service en place.</p></section>`;
    return `<section class="carte flux" aria-labelledby="t-flux">${intro}
      <div class="flux-boutons"><a class="btn principal" href="${esc(lienGoogle(j))}" target="_blank" rel="noopener">${ICONES.agenda}Ajouter à Google Agenda<span class="sr"> (nouvel onglet)</span></a>
        <a class="btn" href="${esc(lienWebcal(j))}">${ICONES.agenda}Apple Calendrier, Outlook</a>
        <button type="button" class="btn" data-copier-flux>${ICONES.lien}Copier le lien</button></div>
      <p class="lien-flux"><span class="sr">Le lien : </span><code>${esc(lienFlux(j))}</code></p>
      <p class="aide" id="etat-flux">Google relit les abonnements de lui-même, toutes les quelques heures : un changement peut mettre un moment à y paraître. Ce lien est personnel : ne le partagez pas.</p>
      <p class="aide"><button type="button" class="lien-btn" data-nouvelle-cle>Changer la clé du lien</button> si vous l’avez partagé par erreur : l’ancien lien cessera de marcher.</p></section>`;
  }
  // le lien répond-il ? (la fonction crescite-agenda déployée)
  async function verifierFlux() {
    const j = E.dispo.jeton;
    if (!j || E.dispo.fluxVerifie === j) return;
    try {
      const r = await fetch(lienFlux(j), { method: 'HEAD' });
      E.dispo.fluxVerifie = j;
      const p = $('#etat-flux');
      if (r.status === 404 && p) p.innerHTML = '<span class="message conseil">Le lien marchera dès que la compagnie aura mis en service la lecture des agendas : vous pouvez déjà l’ajouter.</span>';
    } catch (e) { /* hors connexion : rien à dire */ }
  }
  async function nouvelleCle() {
    if (!confirm('Changer la clé ? L’ancien lien cessera de marcher : il faudra ajouter le nouveau dans votre agenda.')) return;
    const { data, error } = await sb.rpc('crescite_nouveau_jeton_agenda');
    if (error) return annoncer(`La clé n’a pas changé : ${motsErreur(error) || 'la base a refusé'}.`, { erreur: true });
    E.dispo.jeton = data; E.dispo.fluxVerifie = null;
    majZone('#zone-flux', blocFlux);
    annoncer('Nouvelle clé : ajoutez le nouveau lien à votre agenda (l’ancien ne marche plus).');
  }

  // ———— dans « Moi »
  function sectionPlanningMoi() {
    const intro = '<h2 id="t-dispo">Mon planning</h2><p class="intro">Dites quand vous n’êtes pas libre, reliez votre agenda, recevez vos dates Crescite dans le vôtre.</p>';
    if (E.dispo.etat === 'absent') return `<section class="carte" aria-labelledby="t-dispo">${intro}<p class="aide">Bientôt : la compagnie met en place le planning de l’équipe.</p></section>`;
    const n = enAttente().length;
    const lien = (h, ic, titre, sous, badge = '') => `<li><a class="ligne-lien" href="${h}">${ic}<span><b>${titre}</b><small>${sous}</small></span>${badge}${ICONES.chevron}</a></li>`;
    return `<section class="carte" aria-labelledby="t-dispo">${intro}<ul class="liens-moi">
      ${lien('#/indisponibilites', ICONES.indispo, 'Mes indisponibilités', 'Les jours où vous n’êtes pas libre')}
      ${lien('#/agendas', ICONES.relier, 'Mes agendas', 'Relier mon agenda · mes dates Crescite dans mon agenda')}
      ${lien('#/propositions', ICONES.question, 'Propositions de dates', n ? `${pluriel(n, 'proposition', 'propositions')} à répondre` : 'Celles de l’administration', n ? `<span class="pastille-nb" data-n="${n}" aria-hidden="true">${n}</span>` : '')}
    </ul></section>`;
  }
  document.addEventListener('change', e => {
    const c = e.target.closest && e.target.closest('[data-commentaire]');
    if (!c) return;
    const id = Number(c.dataset.commentaire);
    const p = (E.dispo.propositions || []).find(x => x.jours.some(j => j.id === id)), j = p && p.jours.find(x => x.id === id);
    if (!j) return;
    if (j.moi && j.moi.reponse) { if ((j.moi.commentaire || '') !== c.value.trim()) repondre(id, j.moi.reponse, c.value.trim()); return; }
    const etat = c.closest('[data-jour-prop]') && c.closest('[data-jour-prop]').querySelector('.etat-reponse');
    if (etat && c.value.trim()) etat.textContent = 'Choisissez une réponse : votre mot partira avec elle.';
  });

  // ———— les propositions de dates
  function vuePropositions(r, { focus }) {
    const entete = '<div class="titre-vue"><h1>Propositions de dates</h1><p class="sous">Les dates que l’administration vous propose : dites pour chaque jour si vous êtes libre.</p></div>';
    if (E.dispo.etat === 'absent') return afficher(r, TITRES.propositions, entete + etatVide('calendrier', 'Bientôt dans l’application', 'Les propositions de dates arriveront ici, et par courriel.'), { focus });
    const xs = E.dispo.propositions || [];
    const att = xs.filter(aRepondre), autres = xs.filter(p => !aRepondre(p));
    const carte = p => { const rep = p.jours.filter(j => j.moi && j.moi.reponse).length; return `<li><a class="carte-prop" href="#/proposition/${p.id}"><span class="ic-rond" aria-hidden="true">${ICONES.question}</span>
      <span class="cp-texte"><b>${esc(p.titre)}</b><small>${esc([p.spectacle?.titre, p.jours.length === 1 ? texteJours(p.jours[0]) : `${pluriel(p.jours.length, 'jour')}`, p.statut === 'close' ? 'close' : rep === p.jours.length ? 'répondu' : `${rep}/${p.jours.length} répondu${rep > 1 ? 's' : ''}`].filter(Boolean).join(' · '))}</small></span>
      ${aRepondre(p) ? '<span class="etiquette a-repondre">Répondre</span>' : ''}${ICONES.chevron}</a></li>`; };
    const html = `${entete}${!E.dispo.propositionsLues ? '<p class="chargement" role="status">Lecture des propositions…</p>' : !xs.length ? etatVide('calendrier', 'Aucune proposition pour l’instant', 'Quand l’administration vous proposera des dates, elles arriveront ici et par courriel.') : ''}
      ${att.length ? `<section aria-labelledby="t-att"><h2 class="titre-section" id="t-att">À répondre</h2><ul class="liste-props">${att.map(carte).join('')}</ul></section>` : ''}
      ${autres.length ? `<section aria-labelledby="t-aut"><h2 class="titre-section" id="t-aut">${att.length ? 'Les autres' : 'Répondues ou closes'}</h2><ul class="liste-props">${autres.map(carte).join('')}</ul></section>` : ''}`;
    afficher(r, TITRES.propositions, html, { focus });
    if (!E.dispo.propositionsLues) chargerPropositions().then(() => { if (E.vue === 'propositions') vuePropositions(r, { focus: false }); }).catch(() => {});
  }
  function vueProposition(r, { focus }) {
    if (E.dispo.etat === 'absent') return afficher(r, TITRES.proposition, `<div class="titre-vue"><h1>Proposition de dates</h1></div>${etatVide('calendrier', 'Bientôt dans l’application', 'Les propositions de dates arriveront ici, et par courriel.')}`, { focus });
    const p = (E.dispo.propositions || []).find(x => x.id === r.id);
    if (!p) {
      if (!E.dispo.propositionsLues || !E.dispo.relu) {
        afficher(r, TITRES.proposition, '<div class="titre-vue"><h1>Proposition de dates</h1></div><p class="chargement" role="status">Lecture de la proposition…</p>', { focus });
        E.dispo.relu = true;
        chargerPropositions().then(() => { if (E.route && E.route.hash === r.hash) vueProposition(r, { focus: false }); }).catch(e => annoncer(`La proposition n’a pas pu être lue : ${motsErreur(e) || 'réessayez'}.`, { erreur: true }));
        return;
      }
      return afficher(r, TITRES.proposition, `<div class="titre-vue"><h1>Proposition de dates</h1></div>${etatVide('calendrier', 'Cette proposition n’est pas (ou plus) pour vous', 'Elle a pu être retirée par l’administration. Vos propositions sont dans le planning.', '<p><a class="btn" href="#/propositions">Mes propositions</a></p>')}`, { focus });
    }
    E.dispo.relu = false;
    const close = p.statut === 'close';
    const html = `<div class="titre-vue"><h1>${esc(p.titre)}</h1><p class="sous">${esc([p.spectacle?.titre, `proposée ${momentTexte(p.cree_le).replace(/ à .*$/, '')}`].filter(Boolean).join(' · '))}</p></div>
      ${p.message ? `<blockquote class="message-prop">${esc(p.message).replace(/\n/g, '<br>')}<cite>L’administration</cite></blockquote>` : ''}
      ${close ? '<p class="message conseil" role="status">Cette proposition est close : merci pour vos réponses.</p>' : `<p class="intro-prop">Pour ${p.jours.length > 1 ? 'chaque jour' : 'ce jour'}, dites si vous êtes libre. Vous pouvez changer d’avis tant que la proposition est ouverte.</p>`}
      <div id="jours-prop">${p.jours.filter(j => j.moi).map(j => jourProposition(p, j)).join('')}</div>`;
    afficher(r, TITRES.proposition, html, { focus });
    if (E.dispo.mesIndispos == null) chargerMesIndispos().then(() => { if (E.route && E.route.hash === r.hash) $$('[data-jour-prop]').forEach(s => { const j = p.jours.find(x => x.id === Number(s.dataset.jourProp)); if (j) s.outerHTML = jourProposition(p, j); }); }).catch(() => {});
  }
  function jourProposition(p, j) {
    const close = p.statut === 'close' || Date.parse(j.fin) <= Date.now(), rep = j.moi && j.moi.reponse;
    // un conflit avec ses propres indisponibilités (et ses dates déjà prévues)
    const js = new Set(joursPeriode(j).map(u => u.jour));
    const pris = (E.dispo.mesIndispos || []).filter(x => joursPeriode(x).some(u => js.has(u.jour)));
    const dates = E.dates.filter(d => vivante(d) && (d.precision === 'jour' || d.precision === 'periode') && [...js].some(x => x >= d.debut && x <= finDe(d)));
    const id = `jp-${j.id}`;
    return `<section class="carte jour-prop${rep ? ` repondu-${rep}` : ''}" data-jour-prop="${j.id}" aria-labelledby="${id}">
      <h2 id="${id}">${esc(majuscule(texteJours(j)))}</h2>
      ${pris.length ? `<p class="conflit-prop">${ICONES.alerte}<span>Vous avez noté ne pas être libre ${esc(pris.map(x => `${texteJours(x)}${x.motif ? ` (${x.motif})` : ''}`).join(', '))}.</span></p>` : ''}
      ${dates.length ? `<p class="conflit-prop doux">${ICONES.agenda}<span>Vous partez déjà : ${esc(dates.map(d => `${d.spectacle?.titre || 'une date'}${d.lieu ? ` à ${d.lieu.commune || d.lieu.nom}` : ''}`).join(', '))}.</span></p>` : ''}
      <div class="choix-reponse" role="group" aria-label="Votre réponse pour ${esc(texteJours(j))}">${Object.entries(REPONSES).map(([k, lib]) =>
        `<button type="button" class="rep ${k}" aria-pressed="${rep === k}" data-repondre="${j.id}" data-reponse="${k}"${close ? ' disabled' : ''}>${ICONES[REPONSES_IC[k]]}${lib}</button>`).join('')}</div>
      <div class="champ"><label for="c-${j.id}">Un mot pour l’administration <span class="facultatif">(facultatif)</span></label><textarea id="c-${j.id}" rows="2" maxlength="300" data-commentaire="${j.id}"${close ? ' disabled' : ''}>${esc(j.moi && j.moi.commentaire || '')}</textarea></div>
      <p class="etat-reponse" role="status">${rep ? `${REPONSES[rep]}${j.moi.repondu_le ? ` · répondu ${esc(momentTexte(j.moi.repondu_le))}` : ''}` : close ? 'Sans réponse' : 'Pas encore répondu'}</p>
    </section>`;
  }
  async function repondre(jourId, reponse, commentaire, { depuisBouton = false } = {}) {
    const p = (E.dispo.propositions || []).find(x => x.jours.some(j => j.id === jourId));
    const j = p && p.jours.find(x => x.id === jourId);
    if (!j) return;
    const { error } = await sb.rpc('crescite_repondre', { jour: jourId, reponse_: reponse, commentaire_: commentaire || null });
    if (error) return annoncer(`La réponse n’est pas enregistrée : ${motsErreur(error) || 'la base a refusé'}.`, { erreur: true });
    j.moi = { ...(j.moi || {}), reponse, commentaire: commentaire || null, repondu_le: new Date().toISOString() };
    vibrer(10);
    const s = $(`[data-jour-prop="${jourId}"]`);
    if (s) {
      const actif = document.activeElement && s.contains(document.activeElement) ? document.activeElement : null;
      s.outerHTML = jourProposition(p, j);
      const b = $(`[data-jour-prop="${jourId}"] [data-reponse="${reponse}"]`);
      if (b && !reduit()) b.classList.add('pop');
      if (b && (depuisBouton || actif)) { if (depuisBouton) b.focus({ preventScroll: true }); requestAnimationFrame(() => tt('confirmer', b)); }
    }
    annoncer(`C’est noté : ${REPONSES[reponse].toLowerCase()} ${texteJours(j)}.`);
    majBadgePlanning();
    E.planningCache = null;
  }

  // ================================================================================================ mes spectacles
  // Les spectacles sur lesquels la personne travaille : sa distribution (jeu, création, technique, production) et ceux où
  // elle est dans l'équipe d'une date (remplacement, renfort). Chacun dans son univers ; sa page donne ses prochaines dates
  // et ses fichiers de travail, rangés par genre, qui s'ouvrent d'un geste et se partagent vite.
  const GENRES_DOCS = [['texte', 'Le texte', 'Les textes'], ['dossier', 'Le dossier', 'Les dossiers'], ['fiche_technique', 'La fiche technique', 'Les fiches techniques'],
    ['plan', 'Le plan', 'Les plans'], ['autre', 'Les autres', 'Les autres']];
  const GENRES_CONNUS = new Set(GENRES_DOCS.slice(0, 4).map(([t]) => t));
  const slugDe = sp => (sp && (sp.slug || (sp.id != null ? String(sp.id) : ''))) || '';
  // ses projets : les spectacles de sa distribution, et ceux des dates où elle part
  function mesProjets() {
    const ids = new Set();
    E.distributions.filter(x => memeId(x.personne_id, E.moi)).forEach(x => ids.add(Number(x.spectacle_id)));
    E.dates.forEach(d => { if (d.spectacle && d.spectacle.id != null) ids.add(Number(d.spectacle.id)); });
    return ids;
  }
  // « Mes projets », pour le planning : la personne, toute la distribution de ses spectacles et l'équipe de ses dates
  // (technique, mise en scène, remplaçants : tout le monde) ; le planning y ajoute l'équipe de chaque date de ces
  // spectacles qu'il lit (crescite_planning la donne, même pour une date où la personne ne part pas)
  function groupesPlanning() {
    const projets = E.moi == null ? new Set() : mesProjets();
    if (!projets.size) return [];
    const gens = new Set([Number(E.moi)]);
    E.distributions.forEach(x => { if (projets.has(Number(x.spectacle_id))) gens.add(Number(x.personne_id)); });
    const spectacleDe = new Map(E.dates.map(d => [Number(d.id), Number(d.spectacle?.id)]));
    E.equipes.forEach(e => { if (e.present && projets.has(spectacleDe.get(Number(e.date_id)))) gens.add(Number(e.personne_id)); });
    return [{ id: 'projets', libelle: 'Mes projets', personnes: [...gens], spectacles: [...projets] }];
  }
  function mesSpectacles() {
    const ids = mesProjets();
    const auj = aujourdhui();
    const prochaine = id => E.dates.filter(d => Number(d.spectacle?.id) === id && vivante(d) && finDe(d) >= auj && d.precision !== 'saison')
      .sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : a.id - b.id))[0] || null;
    return [...ids].map(id => ({ id, sp: E.spectacles.get(id) || E.dates.find(d => Number(d.spectacle?.id) === id)?.spectacle || { id, titre: 'Spectacle' }, prochaine: prochaine(id) }))
      .sort((a, b) => (a.prochaine && b.prochaine ? (a.prochaine.debut < b.prochaine.debut ? -1 : a.prochaine.debut > b.prochaine.debut ? 1 : 0)
        : a.prochaine ? -1 : b.prochaine ? 1 : ((a.sp.ordre ?? 999) - (b.sp.ordre ?? 999)) || String(a.sp.titre || '').localeCompare(String(b.sp.titre || ''), 'fr')));
  }
  // son rôle : « Jeu · Bérénice », « Mise en scène et adaptation », « Remplace Adrien Vada »
  function rolesDe(id) {
    const miennes = E.distributions.filter(x => Number(x.spectacle_id) === id && memeId(x.personne_id, E.moi));
    const xs = miennes.map(x => (x.categorie === 'jeu' ? (x.role ? `Jeu · ${x.role}` : 'Jeu') : majuscule(txt(x.fonction) || CATEGORIES[x.categorie] || '')));
    if (!miennes.length) {
      const dates = new Set(E.dates.filter(d => Number(d.spectacle?.id) === id).map(d => d.id));
      E.equipes.filter(e => memeId(e.personne_id, E.moi) && e.present && dates.has(Number(e.date_id))).forEach(e => xs.push(e.fonction ? majuscule(e.fonction) : 'Dans l’équipe d’une date'));
    }
    return [...new Set(xs.filter(Boolean))];
  }
  const styleH = sp => { const c = couleurs(sp), f = police(sp); return `--h-fond:${c.hFond};--h-texte:${c.hTexte};--h-accent:${c.hAccent}${f ? `;--h-police:${f.famille};--h-graisse:${f.graisse}` : ''}`; };
  const ligneFichier = x => `<li class="doc-ligne">${ligneDocument(x)}<button type="button" class="btn petit doc-partager" data-partager="${x.id}">${ICONES.partager}<span>Partager</span><span class="sr"> : ${esc(x.titre)}</span></button></li>`;
  const messageLiens = () => (E.erreurLiens ? `<p class="message erreur" role="alert">Les fichiers ne peuvent pas s’ouvrir d’ici pour le moment (${esc(motsErreur(E.erreurLiens) || 'réessayez')}). Chacun sera redemandé quand vous l’ouvrirez.</p>` : '');

  function vueSpectacles(r, { focus }) {
    const xs = mesSpectacles(), compagnie = E.documents.filter(x => x.spectacle_id == null);
    let html = '<div class="titre-vue"><h1>Mes spectacles</h1><p class="sous">Ceux sur lesquels vous travaillez, avec leurs fichiers de travail, à ouvrir et à partager.</p></div>';
    html += messageLiens();
    html += xs.length ? `<ul class="liste-spectacles">${xs.map(carteSpectacle).join('')}</ul>`
      : etatVide('dossier', 'Pas encore de spectacle', 'Quand l’administration vous inscrira dans une distribution, ou dans l’équipe d’une date, vos spectacles apparaîtront ici, avec leurs fichiers de travail.');
    if (compagnie.length) html += `<section class="groupe-docs compagnie" aria-labelledby="t-compagnie"><h2 class="titre-section" id="t-compagnie">Toute la compagnie</h2><ul class="liste-docs">${compagnie.map(ligneFichier).join('')}</ul></section>`;
    html += piedVue();
    afficher(r, TITRES.spectacles, html, { focus });
    preparerPartages(compagnie);
  }
  function carteSpectacle({ id, sp, prochaine }) {
    const photo = photoDe(sp), n = documentsDe(id).length, roles = rolesDe(id);
    const ou = prochaine && prochaine.lieu ? ` · ${prochaine.lieu.commune || prochaine.lieu.nom}` : '';
    return `<li><a class="carte-spectacle${photo ? ' avec-photo' : ''}" href="#/spectacles/${esc(encodeURIComponent(slugDe(sp)))}" style="${esc(styleH(sp))}" data-spectacle="${id}">
      ${photo ? `<span class="cs-photo" aria-hidden="true"><img src="${esc(photo)}" alt="" loading="lazy" decoding="async" crossorigin="anonymous"></span>` : ''}
      <span class="cs-corps"><span class="cs-titre">${esc(sp.titre || 'Spectacle')}</span>
        ${roles.length ? `<span class="cs-role">${esc(roles.join(' · '))}</span>` : ''}
        <span class="cs-pied"><span class="cs-date">${ICONES.agenda}<span>${prochaine ? `${esc(majuscule(quandTexte(prochaine)))}${esc(ou)}` : 'Pas de date à venir'}</span></span>
        <span class="cs-fichiers">${ICONES.dossier}<span>${n ? pluriel(n, 'fichier') : 'aucun fichier'}</span></span></span></span>${ICONES.chevron}</a></li>`;
  }
  function vueSpectacle(r, { focus }) {
    const x = mesSpectacles().find(y => slugDe(y.sp) === r.slug);
    if (!x) return afficher(r, 'Spectacle', `<div class="titre-vue"><h1>Spectacle introuvable</h1></div>${etatVide('dossier', 'Ce spectacle n’est pas (ou plus) dans les vôtres', 'Retrouvez vos spectacles dans l’onglet Spectacles.', '<p><a class="btn" href="#/spectacles">Mes spectacles</a></p>')}`, { focus });
    const { id, sp } = x, docs = documentsDe(id), roles = rolesDe(id), auj = aujourdhui(), photo = photoDe(sp);
    const avenir = E.dates.filter(d => Number(d.spectacle?.id) === id && finDe(d) >= auj).sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : a.id - b.id));
    let html = `<article class="tete-spectacle${photo ? ' avec-photo' : ''}" style="${esc(styleH(sp))}" aria-labelledby="ts-titre">
        ${photo ? `<div class="ts-photo" aria-hidden="true"><img src="${esc(photo)}" alt="" decoding="async" crossorigin="anonymous" fetchpriority="high"></div>` : ''}
        <div class="ts-corps"><p class="ts-haut"><span class="etiquette-verre">Spectacle</span></p><h1 class="ts-titre" id="ts-titre">${esc(sp.titre || 'Spectacle')}</h1>
          ${roles.length ? `<p class="ts-role">${esc(roles.join(' · '))}</p>` : ''}
          ${sp.duree ? `<p class="ts-duree">${esc(String(sp.duree).replace(/^durée\s*:\s*/i, 'Durée : '))}</p>` : ''}</div></article>`;
    html += `<section class="bloc"${attrU(sp)} aria-labelledby="ts-dates"><h2 id="ts-dates">${ICONES.agenda}${avenir.length > 1 ? 'Mes prochaines dates' : 'Ma prochaine date'}</h2>
      ${avenir.length ? `<ul class="dates-spectacle">${avenir.slice(0, 8).map(d => {
        const ou = d.lieu ? [d.lieu.nom, d.lieu.nom && d.lieu.commune && !contientMot(d.lieu.nom, d.lieu.commune) ? d.lieu.commune : ''].filter(Boolean).join(' · ') : (d.intitule || '');
        const nat = natureDe(d);
        return `<li><a class="ds-ligne" href="#/date/${d.id}"><span class="ds-quand">${esc(majuscule(quandTexte(d)))}</span><span class="ds-ou">${esc(ou)}</span>${nat !== 'representations' ? `<span class="etat nature">${esc(NATURES[nat])}</span>` : ''}${ETATS_COURTS[d.statut] ? `<span class="etat ${d.statut}">${ETATS_COURTS[d.statut]}</span>` : ''}${ICONES.chevron}</a></li>`;
      }).join('')}</ul>${avenir.length > 8 ? `<p class="aide">Et ${pluriel(avenir.length - 8, 'autre date', 'autres dates')} dans Ma saison.</p>` : ''}` : '<p class="aide">Pas de date à venir pour vous sur ce spectacle.</p>'}</section>`;
    html += `<section class="bloc fichiers"${attrU(sp)} aria-labelledby="ts-fichiers"><h2 id="ts-fichiers">${ICONES.dossier}Les fichiers de travail</h2>${messageLiens()}`;
    if (!docs.length) html += '<p class="aide">Pas encore de fichier : l’administration les ajoute au fil de la saison (le texte, le dossier, la fiche technique, les plans…).</p>';
    for (const [type, un, plusieurs] of GENRES_DOCS) {
      const xs = docs.filter(d => (type === 'autre' ? !GENRES_CONNUS.has(d.type) : d.type === type));
      if (xs.length) html += `<h3 class="genre-docs">${esc(xs.length > 1 ? plusieurs : un)}</h3><ul class="liste-docs">${xs.map(ligneFichier).join('')}</ul>`;
    }
    html += '</section>' + piedVue();
    afficher(r, sp.titre || 'Spectacle', html, { focus });
    preparerPartages(docs);
  }

  // ———— partager vite. Fichier privé : un lien signé de trente jours, préparé à l'ouverture de la page (un seul appel
  // pour tous), pour que le geste ouvre aussitôt le partage du téléphone (Safari le refuse après une attente du réseau).
  // Document public : son adresse publique ; document-lien : son adresse. Sans partage du téléphone : le lien copié.
  const PARTAGE_FRAIS = (DUREE_PARTAGE - 86400) * 1000;       // un lien de trente jours sert vingt-neuf jours
  async function preparerPartages(docs) {
    const chemins = [...new Set(docs.filter(documentPrive).map(x => x.fichier)
      .filter(c => { const l = E.partages.get(c); return !l || Date.now() - l.quand > PARTAGE_FRAIS; }))];
    if (!chemins.length || E.horsLigne) return;
    try {
      const { data, error } = await sb.storage.from(SEAU).createSignedUrls(chemins, DUREE_PARTAGE);
      if (error) throw error;
      const quand = Date.now();
      (data || []).forEach(x => { if (x && x.signedUrl && !x.error) E.partages.set(x.path, { url: x.signedUrl, quand }); });
    } catch (e) { /* le geste redemandera le lien */ }
  }
  function lienPartage(x) {
    if (!documentPrive(x)) return urlDocument(x);
    const l = E.partages.get(x.fichier);
    return l && Date.now() - l.quand < PARTAGE_FRAIS ? l.url : null;
  }
  function partagerMaintenant(d, message) {
    if (navigator.share && (!navigator.canShare || navigator.canShare(d))) {
      navigator.share(d).catch(e => { if (e && e.name !== 'AbortError') copier(d.url, '', message); });
      return;
    }
    copier(d.url, '', message);
  }
  async function partager(bouton) {
    const x = E.documents.find(y => y.id === Number(bouton.dataset.partager));
    if (!x) return;
    const sp = x.spectacle_id != null ? E.spectacles.get(x.spectacle_id) : null, prive = documentPrive(x);
    const titre = [x.titre, sp && sp.titre].filter(Boolean).join(' · ') || 'Compagnie Crescite';
    const d = { title: titre, text: prive ? `${titre}, lien valable 30 jours` : titre };
    const message = prive ? 'Lien copié, valable 30 jours.' : 'Lien copié.';
    const prete = lienPartage(x);
    if (prete) return partagerMaintenant({ ...d, url: prete }, message);
    if (!prive) return annoncer('Ce document n’a pas d’adresse à partager.', { erreur: true });
    // pas encore prêt (sans réseau à l'ouverture de la page) : on le prépare ; le partage voudra un geste tout frais
    let url;
    try {
      url = await occupe(bouton, 'Un instant…', async () => {
        const { data, error } = await sb.storage.from(SEAU).createSignedUrl(x.fichier, DUREE_PARTAGE);
        if (error) throw error;
        E.partages.set(x.fichier, { url: data.signedUrl, quand: Date.now() });
        return data.signedUrl;
      });
    } catch (e) { return annoncer(`Le lien n’a pas pu être préparé : ${motsErreur(e) || 'réessayez'}.`, { erreur: true }); }
    if (navigator.share) return annoncer('Le lien de trente jours est prêt.', { persistant: true, action: { libelle: 'Partager', f: () => partagerMaintenant({ ...d, url }, message) } });
    copier(url, '', message);
  }

  // ================================================================================================ l'installation
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); E.installer = e; majInstallation(); });
  window.addEventListener('appinstalled', () => { E.installer = null; majInstallation(); annoncer('L’application est installée : retrouvez Crescite sur votre écran d’accueil.'); });
  function zoneInstallation(ou) {
    if (installee()) return ou === 'moi' ? '<p class="aide">L’application est installée sur cet appareil.</p>' : '';
    if (ou === 'accueil' && PREF.installFermee) return '';
    const fermer = ou === 'accueil' ? `<button type="button" class="bouton-rond fermer-install" data-fermer-install>${ICONES.croix}<span class="sr">Ne plus proposer l’installation</span></button>` : '';
    if (E.installer) return `<section class="carte-action installation" aria-labelledby="t-inst-${ou}"><span class="ic-rond" aria-hidden="true">${ICONES.installer}</span>
      <div class="ca-texte"><h2 id="t-inst-${ou}">L’application Crescite</h2><p class="aide">Sur votre écran d’accueil : elle s’ouvre en un geste, même sans réseau.</p></div>
      <button type="button" class="btn principal petit" data-installer>Installer</button>${fermer}</section>`;
    if (IOS) return `<section class="carte-action installation" aria-labelledby="t-inst-${ou}"><span class="ic-rond" aria-hidden="true">${ICONES.installer}</span>
      <div class="ca-texte"><h2 id="t-inst-${ou}">L’application sur votre iPhone</h2><p class="aide">Elle s’ouvre en un geste, même sans réseau, et reçoit les notifications.</p>
      <button type="button" class="lien-btn" aria-expanded="false" aria-controls="aide-ios-${ou}" data-aide-ios>Comment l’installer ?</button><div id="aide-ios-${ou}" hidden>${ETAPES_IOS}</div></div>${fermer}</section>`;
    if (ou === 'moi') return '<p class="aide">Dans le menu de votre navigateur, choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ». Ce navigateur ne le propose pas ? Ouvrez cette page dans Chrome, Edge ou Safari.</p>';
    return '';
  }
  function majInstallation() {
    $$('[data-zone-installation]').forEach(z => { z.innerHTML = zoneInstallation(z.dataset.zoneInstallation); });
    $$('[data-installer-barre]').forEach(b => { b.hidden = installee(); });   // la barre : tant que l'application n'est pas installée
  }
  async function installer() {
    const p = E.installer;
    if (!p) return;
    E.installer = null;
    try { p.prompt(); const { outcome } = await p.userChoice; if (outcome !== 'accepted') E.installer = null; } catch (e) { /* refusé */ }
    majInstallation();
  }
  // le bouton « Installer » de la barre (au téléphone, dans le navigateur, en permanence) : l'invite du navigateur quand il
  // en a une (installer), sinon la marche à suivre, dans une fenêtre
  function ouvrirModaleInstallation(declencheur = null) {
    $('#modale-installation')?.remove();
    const fond = document.createElement('div');
    fond.className = 'modale-fond'; fond.id = 'modale-installation';
    const corps = IOS ? `<p>Elle s’ouvre en un geste depuis l’écran d’accueil, même sans réseau, et reçoit les notifications.</p>${ETAPES_IOS}`
      : '<p>Elle s’ouvre en un geste depuis l’écran d’accueil, même sans réseau.</p><p>Dans le menu de votre navigateur, choisissez <b>Installer l’application</b> ou <b>Ajouter à l’écran d’accueil</b>. Ce navigateur ne le propose pas ? Ouvrez cette page dans Chrome, Edge ou Safari.</p>';
    fond.innerHTML = `<div class="modale-boite" role="dialog" aria-modal="true" aria-labelledby="t-mod-inst">
        <div class="modale-tete"><h2 id="t-mod-inst">${ICONES.installer} Installer l’application</h2><button type="button" class="modale-fermer" data-fermer-modale aria-label="Fermer">${ICONES.croix}</button></div>
        <div class="modale-corps">${corps}</div>
        <div class="pied-form"><button type="button" class="btn principal" data-fermer-modale>Compris</button></div></div>`;
    document.body.appendChild(fond);
    const surTouche = e => { if (e.key === 'Escape') fermer(); };
    const fermer = () => { fond.remove(); document.removeEventListener('keydown', surTouche); if (declencheur && declencheur.isConnected) declencheur.focus(); };
    $$('[data-fermer-modale]', fond).forEach(b => b.addEventListener('click', fermer));
    fond.addEventListener('click', e => { if (e.target === fond) fermer(); });
    document.addEventListener('keydown', surTouche);
    $('.modale-fermer', fond).focus();
  }

  // ================================================================================================ moi
  const CHAMPS = [
    ['telephone', 'Téléphone', 'tel', 'tel', 'Le numéro où l’équipe et l’administration vous joignent en tournée.'],
    ['ville', 'Ville de départ', 'text', 'address-level2', 'D’où vous partez en tournée : pour les trajets et les défraiements.'],
    ['regime', 'Régime alimentaire', 'long', 'off', 'Ce que l’accueil doit savoir pour les repas : végétarien, allergies, sans porc…'],
    ['urgence', 'En cas d’urgence', 'long', 'off', 'Qui prévenir : son nom, son lien avec vous, son téléphone.'],
  ];
  const valeursFiche = () => Object.fromEntries(CHAMPS.map(([k]) => { const v = ($('#f-' + k)?.value || '').trim(); return [k, v || null]; }));
  function vueMoi(r, { focus }) {
    const p = E.personne || {}, v = E.privee || {}, mel = E.session?.user?.email || v.email || sessionGardee()?.user?.email || '';
    const roles = new Map();
    E.distributions.filter(x => x.personne_id === E.moi).forEach(x => {
      const f = x.categorie === 'jeu' ? (x.role ? `jeu (${x.role})` : 'jeu') : (x.fonction || CATEGORIES[x.categorie]);
      if (!roles.has(x.spectacle_id)) roles.set(x.spectacle_id, []);
      if (!roles.get(x.spectacle_id).includes(f)) roles.get(x.spectacle_id).push(f);
    });
    let html = `<div class="titre-vue"><h1>Moi</h1><p class="sous">Votre fiche, les notifications, l’application.</p></div>
      <section class="carte identite" aria-label="Identité">${avatar(p, { taille: 'grand' })}
        <p class="nom">${esc(nomDe(p) || 'Votre fiche')}</p>
        ${p.metiers?.length ? `<p class="metiers">${esc(p.metiers.join(', '))}</p>` : '<p class="metiers"></p>'}
        ${roles.size ? `<ul class="roles" aria-label="Dans l’équipe de">${[...roles.entries()].map(([id, fs]) => { const sp = E.spectacles.get(id) || {}; return `<li${attrU(sp)}><span class="pastille" aria-hidden="true"></span><span><b>${esc(sp.titre || 'Spectacle')}</b> · ${esc(fs.join(', '))}</span></li>`; }).join('')}</ul>` : ''}
        <dl class="compte-mel"><dt>Adresse du compte</dt><dd>${esc(mel)}</dd></dl>
        <p class="aide">Pour changer l’adresse du compte ou votre nom, écrivez à l’administration.</p>
      </section>
      <section class="carte" aria-labelledby="t-push"><h2 id="t-push">Notifications</h2><p class="intro">Une feuille de route publiée, des horaires changés (en tournée comme en répétition), une nouvelle date.</p><div data-zone-push="moi"${E.push.etat !== 'inconnu' ? ` data-etat="${E.push.etat}"` : ''}>${E.push.etat !== 'inconnu' ? cartePush(E.push.etat, 'moi') : ''}</div></section>
      ${sectionPlanningMoi()}
      ${avecIdeale() ? `<section class="carte" aria-labelledby="t-frais"><h2 id="t-frais">Notes de frais</h2><p class="intro">Déposez vos justificatifs de tournée (repas, carburant, billets, nuitées) et suivez vos remboursements.</p><p><a class="btn" href="#/frais">${ICONES.euro}Mes notes de frais</a></p></section>` : ''}
      <section class="carte" aria-labelledby="t-app"><h2 id="t-app">L’application</h2><div data-zone-installation="moi">${zoneInstallation('moi')}</div></section>`;
    if (!E.privee) html += `<section class="carte"><h2>Mes coordonnées</h2>${E.provisoire && !E.horsLigne ? '<p class="chargement" role="status">Lecture de vos coordonnées…</p>'
      : '<p class="message horsligne" role="status">Vos coordonnées se lisent et s’enregistrent en ligne : reconnectez-vous au réseau, puis actualisez.</p>'}</section>`;
    else html += `<form class="carte" id="f-fiche" novalidate aria-labelledby="t-coord"><h2 id="t-coord">Mes coordonnées</h2>
        <p class="intro">Elles servent aux feuilles de route, aux réservations et aux repas. Seules l’administration et vous les lisez.</p>
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
      <section class="carte" aria-labelledby="t-sortir"><h2 id="t-sortir">Se déconnecter</h2><p class="intro">Ferme la session sur cet appareil, qui ne reçoit plus vos notifications. Vos autres appareils restent connectés.</p>
        <p><button type="button" class="btn" data-sortir>${ICONES.sortir}Se déconnecter</button></p></section>`;
    afficher(r, TITRES.moi, html, { focus });
    E.ficheSale = false;
    majCartePush();
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
        const res = await occupe(b, 'Enregistrement…', () => sb.from('crescite_personnes_privees').update(valeurs).eq('personne_id', E.moi).select('personne_id, email, telephone, ville, regime, urgence'));
        if (res.error || !res.data || !res.data.length) {
          etat.className = 'etat-form sale'; etat.textContent = 'Modifications non enregistrées.';
          return dire(zoneMessage(f), `Votre fiche n’a pas été enregistrée : ${res.error ? esc(motsErreur(res.error)) : 'la base ne l’a pas trouvée pour votre compte. Prévenez l’administration'}.`);
        }
        E.privee = res.data[0]; E.ficheSale = false;
        zoneMessage(f).innerHTML = '';
        etat.className = 'etat-form ok'; etat.textContent = `Enregistré à ${heureCourte(Date.now())}.`;
        vibrer(10);
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
      if (error) { etat.className = 'etat-form'; etat.textContent = ''; return dire(zoneMessage(fm), `Le mot de passe n’a pas été changé : ${esc(motsErreur(error))}.`); }
      a.value = b2.value = '';
      zoneMessage(fm).innerHTML = '';
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
  function zoneMessage(form) {
    let z = $('.msg-form', form);
    if (!z) { z = document.createElement('div'); z.className = 'msg-form'; $('.pied-form', form).before(z); }
    return z;
  }

  // ================================================================================================ alerte retard / imprévu
  // Le geste « Retard » d'une date (quand la base a le neuvième script) : un motif d'un geste, une précision, et l'alerte
  // part par crescite_signaler à l'équipe de la date et à l'administration, jamais à soi : dans leur onglet Notifications
  // et sur leurs téléphones abonnés. Elle ne se dit envoyée que si la base l'a envoyée ; sinon la boîte reste ouverte et
  // dit pourquoi (la base n'en accepte que cinq par heure et par compte, de 280 caractères au plus).
  const MAX_RETARD = 280;
  function raisonRetard(e) {
    const code = String(e?.code || '');
    if (code === 'PT429' || e?.status === 429) return 'cinq alertes en une heure, c’est le maximum. Appelez directement l’équipe';
    if (code === '42501') return 'vous n’êtes pas (ou plus) dans l’équipe de cette date';
    if (code === '22023' && e.message) return e.message[0].toLowerCase() + e.message.slice(1);
    return motsErreur(e);
  }
  function ouvrirModaleRetard(dateId, declencheur = null) {
    const d = E.dates.find(x => x.id === dateId);
    if (!d || !avecSignaler()) return;
    $('#modale-retard')?.remove();
    const fond = document.createElement('div');
    fond.className = 'modale-fond';
    fond.id = 'modale-retard';
    fond.innerHTML = `
      <div class="modale-boite" role="dialog" aria-modal="true" aria-labelledby="t-mod-retard" aria-describedby="d-mod-retard">
        <div class="modale-tete">
          <h2 id="t-mod-retard">${ICONES.alerte} Signaler un retard / imprévu</h2>
          <button type="button" class="modale-fermer" data-fermer-modale aria-label="Fermer">${ICONES.croix}</button>
        </div>
        <p class="intro">Pour <b>${esc(d.spectacle?.titre || 'cette date')}</b> · ${esc(d.lieu?.commune || 'Tournée')}</p>
        <p class="aide" id="d-mod-retard">L’équipe de cette date et l’administration sont prévenues aussitôt, dans l’application et sur leur téléphone.</p>
        <div class="choix-retard" role="group" aria-label="Le motif">
          <button type="button" class="btn-choix actif" aria-pressed="true" data-motif="Retard ~15 min (circulation)">⏱ +15 min (bouchons)</button>
          <button type="button" class="btn-choix" aria-pressed="false" data-motif="Retard ~30 min (train/route)">⏱ +30 min (train / route)</button>
          <button type="button" class="btn-choix" aria-pressed="false" data-motif="Retard ~1h ou plus">⚠️ +1h ou plus</button>
          <button type="button" class="btn-choix" aria-pressed="false" data-motif="Panne / Problème véhicule">🚗 Panne véhicule</button>
        </div>
        <div class="champ">
          <label for="retard-texte">Précision / Message (facultatif)</label>
          <input type="text" id="retard-texte" maxlength="200" autocomplete="off" placeholder="Ex. Accident A13, arrivée vers 14h20">
        </div>
        <div class="msg-retard" id="msg-retard"></div>
        <div class="pied-form">
          <button type="button" class="btn principal" id="btn-envoyer-retard">${ICONES.message} Envoyer l’alerte à l’équipe</button>
          <button type="button" class="btn" data-fermer-modale>Annuler</button>
        </div>
      </div>
    `;
    document.body.appendChild(fond);
    let motif = 'Retard ~15 min (circulation)';
    $$('.btn-choix', fond).forEach(b => {
      b.addEventListener('click', () => {
        $$('.btn-choix', fond).forEach(x => { x.classList.remove('actif'); x.setAttribute('aria-pressed', 'false'); });
        b.classList.add('actif'); b.setAttribute('aria-pressed', 'true');
        motif = b.dataset.motif;
      });
    });
    // une boîte modale : le clavier y reste (Tab tourne), Échap la ferme, le focus revient au geste
    const fermer = () => { fond.remove(); document.removeEventListener('keydown', clavier, true); if (declencheur && declencheur.isConnected) declencheur.focus(); };
    function clavier(e) {
      if (e.key === 'Escape') { e.preventDefault(); fermer(); return; }
      if (e.key !== 'Tab') return;
      const xs = $$('button:not([disabled]), input', fond), i = xs.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); xs[xs.length - 1].focus(); } else if (!e.shiftKey && i === xs.length - 1) { e.preventDefault(); xs[0].focus(); }
    }
    document.addEventListener('keydown', clavier, true);
    $$('[data-fermer-modale]', fond).forEach(b => b.addEventListener('click', fermer));
    fond.addEventListener('click', e => { if (e.target === fond) fermer(); });
    $('.btn-choix.actif', fond).focus();
    const zone = $('#msg-retard', fond);
    $('#btn-envoyer-retard', fond).addEventListener('click', async e => {
      const prec = txt($('#retard-texte', fond).value).replace(/\s+/g, ' ');
      const msg = `${motif}${prec ? ` : ${prec}` : ''}`.slice(0, MAX_RETARD);
      dire(zone, '');
      const { data, error } = await occupe(e.currentTarget, 'Envoi…', () => sb.rpc('crescite_signaler', { d: d.id, texte_: msg }));
      if (error) {
        // la base n'a pas (ou plus) la fonction : le geste disparaît, et on le dit
        if (fonctionAbsente(error)) {
          SONDES.signaler = 'absent';
          fermer();
          if (location.hash === `#/date/${d.id}`) router({ rafraichir: true });
          return annoncer('L’alerte de retard n’est pas encore installée dans la base de la compagnie : rien n’est parti. Prévenez l’équipe par téléphone.', { erreur: true });
        }
        return dire(zone, `L’alerte n’est pas partie : ${esc(raisonRetard(error))}.`);
      }
      const n = Number(data) || 0;
      fermer();
      if (!n) return annoncer('L’alerte n’a prévenu personne : personne d’autre sur cette date, ni à l’administration, n’a de compte dans l’espace de l’équipe. Appelez l’équipe.', { erreur: true });
      annoncer(`Alerte envoyée : ${pluriel(n, 'personne prévenue', 'personnes prévenues')}.`);
      vibrer(25);
    });
  }

  // ================================================================================================ checklist camion & matériel
  const PHASES_CAMION = [
    { k: 'depart_rouen', l: '1. Départ Rouen' },
    { k: 'arrivee_salle', l: '2. Arrivée salle' },
    { k: 'remballage', l: '3. Remballage' },
    { k: 'retour_rouen', l: '4. Retour Rouen' }
  ];
  const MATOS_DEFAUT = [
    { id: 'def_1', intitule: 'Malle Régie Son & Micros HF', malle: 'Fly Son 1', categorie: 'son' },
    { id: 'def_2', intitule: 'Malle Lumière & Câblage', malle: 'Malle Lumière A', categorie: 'lumiere' },
    { id: 'def_3', intitule: 'Éléments de décor & Structures', malle: 'Décor camion', categorie: 'decor' },
    { id: 'def_4', intitule: 'Valise Costumes & Cintres', malle: 'Penderie', categorie: 'costumes' },
    { id: 'def_5', intitule: 'Malle Accessoires & Éléments de jeu', malle: 'Malle Plateau', categorie: 'accessoires' },
    { id: 'def_6', intitule: 'Caisse outils, gaffer, pharmacie', malle: 'Régie Caisse 1', categorie: 'regie' },
  ];
  const ETAT_CAMION = { phase: 'depart_rouen', dateId: null, items: [], coches: new Map() };

  function blocCamion(d) {
    const sp = d.spectacle || {};
    return `<section class="bloc bloc-camion"${attrU(sp)} id="bloc-camion" data-date-id="${d.id}">
      <h2 id="b-camion">${ICONES.camion}Checklist camion & matériel</h2>
      <div id="zone-camion-${d.id}"><p class="attente-bloc">Chargement de la checklist…</p></div>
    </section>`;
  }

  async function chargerChecklistCamion(dateId, spectacleId) {
    const zone = $(`#zone-camion-${dateId}`);
    if (!zone) return;
    ETAT_CAMION.dateId = dateId;
    let items = [];
    try {
      if (spectacleId) {
        const { data, error } = await sb.from('crescite_materiel').select('*').eq('spectacle_id', spectacleId).order('malle');
        if (!error && data && data.length) items = data;
      }
    } catch (e) { /* fallback offline */ }
    if (!items.length) items = MATOS_DEFAUT;
    ETAT_CAMION.items = items;

    // Charger les coches depuis la base ou le localStorage
    const localKey = `crescite-camion-${dateId}`;
    let cochesLocales = {};
    try { cochesLocales = JSON.parse(localStorage.getItem(localKey) || '{}'); } catch (e) {}

    ETAT_CAMION.coches = new Map(Object.entries(cochesLocales));

    try {
      const { data, error } = await sb.from('crescite_checklists_chargement').select('*').eq('date_id', dateId);
      if (!error && data) {
        data.forEach(c => {
          const k = `${c.phase}_${c.materiel_id}`;
          ETAT_CAMION.coches.set(k, c.coche);
        });
      }
    } catch (e) {}

    dessinerCamion(dateId);
  }

  function changerPhaseCamion(phase, dateId) {
    ETAT_CAMION.phase = phase;
    dessinerCamion(dateId);
  }

  function dessinerCamion(dateId) {
    const zone = $(`#zone-camion-${dateId}`);
    if (!zone) return;
    const curPhase = ETAT_CAMION.phase || 'depart_rouen';
    const items = ETAT_CAMION.items || [];
    const total = items.length;
    let nbCoches = 0;
    items.forEach(it => {
      const k = `${curPhase}_${it.id}`;
      if (ETAT_CAMION.coches.get(k)) nbCoches++;
    });
    const pct = total ? Math.round((nbCoches / total) * 100) : 0;
    const phaseComplete = total > 0 && nbCoches === total;

    let h = `
      <div class="camion-phases" role="tablist">
        ${PHASES_CAMION.map(p => `
          <button type="button" class="camion-phase-btn${p.k === curPhase ? ' actif' : ''}" role="tab" aria-selected="${p.k === curPhase}" data-phase-camion="${p.k}" data-date-id="${dateId}">${p.l}</button>
        `).join('')}
      </div>
      <div class="camion-jauge${phaseComplete ? ' complete' : ''}">
        <span>${nbCoches} / ${total} vérifiés${phaseComplete ? ' ✅' : ''}</span>
        <div class="camion-barre"><div class="camion-barre-fond" style="width: ${pct}%"></div></div>
      </div>
      <ul class="camion-liste">
        ${items.map(it => {
          const k = `${curPhase}_${it.id}`;
          const coche = !!ETAT_CAMION.coches.get(k);
          return `
            <li class="camion-item${coche ? ' coche' : ''}" data-mat-id="${it.id}">
              <input type="checkbox" id="chk-${k}" ${coche ? 'checked' : ''} aria-label="${esc(it.intitule)}">
              <label class="coche-svg" for="chk-${k}" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></label>
              <label class="camion-item-texte" for="chk-${k}">
                <b>${esc(it.intitule)}</b>
                ${it.notes ? `<small>${esc(it.notes)}</small>` : ''}
              </label>
              ${it.malle ? `<span class="camion-malle-badge">${esc(it.malle)}</span>` : ''}
            </li>
          `;
        }).join('')}
      </ul>
    `;
    const premier = !zone.firstElementChild;
    zone.innerHTML = h;
    if (premier) zone.classList.add('arrive');                      // la liste, lue après la page, se pose

    // Attacher les écouteurs de case à cocher
    $$('.camion-item input[type=checkbox]', zone).forEach(inp => {
      inp.addEventListener('change', async e => {
        const itemLi = inp.closest('.camion-item');
        const matId = itemLi.dataset.matId;
        const val = inp.checked;
        const k = `${curPhase}_${matId}`;
        ETAT_CAMION.coches.set(k, val);
        itemLi.classList.toggle('coche', val);

        // Sauvegarder en local
        const localKey = `crescite-camion-${dateId}`;
        const obj = Object.fromEntries(ETAT_CAMION.coches.entries());
        try { localStorage.setItem(localKey, JSON.stringify(obj)); } catch (err) {}

        vibrer(8);
        majJaugeCamion(zone, curPhase);                 // la case cochée reste en place : sa coche se trace

        // Sauvegarder dans Supabase si matId est numérique (sinon, la liste par défaut : sur cet appareil seulement)
        if (/^\d+$/.test(String(matId))) {
          const { error } = await sb.from('crescite_checklists_chargement').upsert({
            date_id: dateId,
            materiel_id: +matId,
            phase: curPhase,
            coche: val,
            coche_par: E.moi,
            coche_le: new Date().toISOString()
          }, { onConflict: 'date_id,materiel_id,phase' });
          if (error) annoncer(`Gardé sur cet appareil seulement : la base ne l’a pas enregistré (${motsErreur(error)}).`, { erreur: true });
        }
      });
    });
  }

  // la jauge d'une phase, sans redessiner la liste : le compte, la barre ; complète, elle luit une fois
  function majJaugeCamion(zone, curPhase) {
    const j = $('.camion-jauge', zone);
    if (!j) return;
    const items = ETAT_CAMION.items || [], total = items.length;
    const n = items.filter(it => ETAT_CAMION.coches.get(`${curPhase}_${it.id}`)).length, complet = total > 0 && n === total;
    $('span', j).textContent = `${n} / ${total} vérifiés${complet ? ' ✅' : ''}`;
    $('.camion-barre-fond', j).style.width = `${total ? Math.round((n / total) * 100) : 0}%`;
    const etait = j.classList.contains('complete');
    j.classList.toggle('complete', complet);
    if (complet && !etait) { vibrer([12, 60, 24]); tt('confirmer', j); }
  }
  // ================================================================================================ notes de frais
  // Une note de frais (quand la base a le septième script) : le jour de la dépense, sa catégorie, son montant, la date de
  // tournée, et le justificatif, déposé dans le stockage privé « crescite-frais », dans le dossier de sa fiche :
  // <E.moi>/<horodatage>_<nom>, sans upsert (jamais par-dessus un autre fichier). La note garde ce chemin ; le fichier se
  // lit par un lien signé, demandé au clic. Le justificatif part d'abord : s'il ne part pas, rien ne s'enregistre ; si la
  // note échoue ensuite, le fichier déjà envoyé resservira à l'essai suivant (la personne ne peut pas l'effacer).
  const SEAU_FRAIS = 'crescite-frais';
  const TYPES_JUSTIF = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
  const EXT_JUSTIF = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };
  const MO_JUSTIF = 15;                           // la limite du stockage « crescite-frais »
  const CAT_FRAIS = { repas: 'Repas', transport: 'Péage / Transport', hebergement: 'Hébergement', autre: 'Achat / Autre' };
  const STATUT_FRAIS = { en_attente: 'En attente', valide: 'Validée', rembourse: 'Remboursée', refuse: 'Refusée' };
  const typeJustif = f => (TYPES_JUSTIF[f.type] ? f.type : EXT_JUSTIF[((/\.([a-z0-9]{1,5})$/i.exec(f.name || '') || [])[1] || '').toLowerCase()] || null);
  // « 1761400000000_ticket-peage-a13.jpg » : l'horodatage, puis le nom du fichier sans accents ni espaces
  const nomJustificatif = (f, type) => {
    const base = String(f.name || '').replace(/\.[^.]*$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    return `${Date.now()}_${base || 'justificatif'}.${TYPES_JUSTIF[type]}`;
  };
  // le chemin d'un justificatif dans « crescite-frais » (une note écrite par une version d'avant gardait une adresse)
  const cheminJustificatif = v => { const m = /\/crescite-frais\/([^?#]+)/.exec(String(v || '')); return m ? decodeURIComponent(m[1]) : String(v || ''); };
  async function signerJustificatif(v) {
    const { data, error } = await sb.storage.from(SEAU_FRAIS).createSignedUrl(cheminJustificatif(v), DUREE_LIEN);
    if (error) throw error;
    return data.signedUrl;
  }
  const euros = n => `${(Number(n) || 0).toFixed(2).replace('.', ',')} €`;

  async function vueFrais(r, { focus } = {}) {
    // à l'ouverture, la base n'a pas encore dit si elle a les notes de frais (voir router)
    if (!avecIdeale()) return afficher(r, TITRES.frais, '<div class="titre-vue"><h1>Notes de frais</h1></div><p class="chargement" role="status">Lecture de vos notes de frais…</p>', { focus });
    const m = location.hash.match(/[?&]date=(\d+)/);
    const datePre = m ? +m[1] : null;

    let html = `
      <div class="titre-vue">
        <h1>Notes de frais</h1>
        <p class="sous">Déposez et suivez vos défraiements de tournée (repas, trajets, nuitées, matériel).</p>
      </div>
      <div id="frais-totaux" class="frais-resume">
        <div class="frais-carte attente"><span>En attente de remboursement</span><b id="tot-attente">-- €</b></div>
        <div class="frais-carte rembourse"><span>Remboursé cette saison</span><b id="tot-rembourse">-- €</b></div>
      </div>
      <form class="carte" id="f-nouvelle-frais" novalidate aria-labelledby="t-nv-frais">
        <h2 id="t-nv-frais">Ajouter un justificatif</h2>
        <p class="intro">Photographiez ou importez votre ticket ou reçu dès la dépense engagée.</p>
        <div class="deux-champs">
          <div class="champ">
            <label for="nf-date">Date de la dépense *</label>
            <input type="date" id="nf-date" required value="${aujourdhui()}" max="${aujourdhui()}">
          </div>
          <div class="champ">
            <label for="nf-categorie">Catégorie *</label>
            <select id="nf-categorie" required>
              <option value="repas">Repas en déplacement</option>
              <option value="transport">Péage / Carburant / Billet de train</option>
              <option value="hebergement">Hôtel / Hébergement</option>
              <option value="autre">Achat plateau / Régie / Autre</option>
            </select>
          </div>
        </div>
        <div class="deux-champs">
          <div class="champ">
            <label for="nf-montant">Montant TTC (€) *</label>
            <input type="number" id="nf-montant" step="0.01" min="0.01" max="999999.99" inputmode="decimal" placeholder="0.00" required>
          </div>
          <div class="champ">
            <label for="nf-date-tournee">Date de tournée liée (facultatif)</label>
            <select id="nf-date-tournee">
              <option value="">-- Non rattaché à une date précise --</option>
              ${E.dates.map(d => `<option value="${d.id}"${d.id === datePre ? ' selected' : ''}>${esc(d.spectacle?.titre || 'Date')} · ${quandTexte(d)} (${esc(d.lieu?.commune || '')})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="champ">
          <label for="nf-photo">Photo du ticket ou justificatif *</label>
          <input type="file" id="nf-photo" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" required aria-describedby="nf-photo-aide">
          <p class="aide" id="nf-photo-aide">Au smartphone : ouvre directement l'appareil photo. Une photo (JPEG, PNG, WebP) ou un PDF, ${MO_JUSTIF}&nbsp;Mo au plus.</p>
          <div id="nf-apercu-zone" hidden><img id="nf-apercu-img" class="photo-apercu" alt="Aperçu du ticket"></div>
        </div>
        <div class="champ">
          <label for="nf-commentaire">Commentaire (facultatif)</label>
          <input type="text" id="nf-commentaire" placeholder="Ex. Déjeuner 2 pers. trajet Rouen-Rennes">
        </div>
        <div class="pied-form">
          <button type="submit" class="btn principal" id="btn-soumettre-frais">${ICONES.coche} Enregistrer la note de frais</button>
          <p class="etat-form" id="etat-frais" role="status"></p>
        </div>
      </form>
      <section class="carte" aria-labelledby="t-mes-frais">
        <h2 id="t-mes-frais">Mes notes de frais</h2>
        <div id="liste-frais-zone"><p class="chargement" role="status">Lecture de vos notes de frais…</p></div>
      </section>
    `;
    afficher(r, 'Notes de frais', html, { focus });
    initVueFrais();
  }

  async function initVueFrais() {
    const f = $('#f-nouvelle-frais');
    if (!f) return;
    const inpPhoto = $('#nf-photo', f);
    const zoneApercu = $('#nf-apercu-zone', f);
    const imgApercu = $('#nf-apercu-img', f);
    let fichierSelectionne = null;
    let envoye = null;                               // { fichier, chemin } : le justificatif déjà déposé, pas encore noté

    inpPhoto.addEventListener('change', () => {
      const file = inpPhoto.files[0];
      fichierSelectionne = file || null;
      if (!file || !file.type.startsWith('image/')) { zoneApercu.hidden = true; return; }
      const reader = new FileReader();
      reader.onload = e => { imgApercu.src = e.target.result; zoneApercu.hidden = false; };
      reader.readAsDataURL(file);
    });

    f.addEventListener('submit', async e => {
      e.preventDefault();
      const b = $('#btn-soumettre-frais', f);
      const etat = $('#etat-frais', f);
      const dateVal = $('#nf-date', f).value;
      const catVal = $('#nf-categorie', f).value;
      const montVal = parseFloat($('#nf-montant', f).value);
      const dateIdVal = $('#nf-date-tournee', f).value ? +$('#nf-date-tournee', f).value : null;
      const commVal = ($('#nf-commentaire', f).value || '').trim();
      const sale = texte => { etat.className = 'etat-form sale'; etat.textContent = texte; };

      if (!dateVal || isNaN(montVal) || montVal <= 0 || !fichierSelectionne) return sale('Veuillez remplir la date, le montant et ajouter la photo du justificatif.');
      const fichier = fichierSelectionne, type = typeJustif(fichier);
      if (!type) return sale('Le justificatif doit être une photo (JPEG, PNG ou WebP) ou un PDF.');
      if (fichier.size > MO_JUSTIF * 1024 * 1024) return sale(`Le justificatif pèse plus de ${MO_JUSTIF} Mo : prenez une photo moins lourde, ou un PDF plus léger.`);

      b.disabled = true;
      b.textContent = 'Envoi du justificatif…';
      etat.className = 'etat-form';
      etat.textContent = 'Téléversement en cours…';
      try {
        // dans son dossier, sous un nom neuf ; déjà déposé (la note avait échoué) : il resert
        const chemin = envoye && envoye.fichier === fichier ? envoye.chemin : `${E.moi}/${nomJustificatif(fichier, type)}`;
        if (!envoye || envoye.chemin !== chemin) {
          // le type part avec le fichier (un PDF sans type, reconnu à son extension, le reçoit ici)
          const corps = fichier.type === type ? fichier : fichier.slice(0, fichier.size, type);
          const { error: errEnvoi } = await sb.storage.from(SEAU_FRAIS).upload(chemin, corps, { contentType: type, cacheControl: '3600' });
          if (errEnvoi) return sale(`Le justificatif n’a pas pu être envoyé : ${motsErreur(errEnvoi)}. Rien n’est enregistré.`);
          envoye = { fichier, chemin };
        }
        etat.textContent = 'Enregistrement de la note…';
        const { error: errNote } = await sb.from('crescite_notes_frais').insert({
          personne_id: E.moi,
          date_id: dateIdVal,
          date_depense: dateVal,
          categorie: catVal,
          montant_ttc: montVal,
          photo_url: chemin,
          commentaire: commVal || null,
          statut: 'en_attente'
        });
        if (errNote) return sale(`La note de frais n’est pas enregistrée : ${motsErreur(errNote)}. Le justificatif est envoyé : réessayez, il ne repartira pas.`);
        envoye = null; fichierSelectionne = null;
        envolerJustificatif(imgApercu, zoneApercu.hidden);
        f.reset();
        zoneApercu.hidden = true;
        etat.className = 'etat-form ok';
        etat.textContent = 'Note de frais enregistrée.';
        annoncer('Note de frais transmise à l’administration.');
        vibrer(15);
        chargerNotesFrais({ neuve: true });
      } catch (err) {
        sale(`La note de frais n’est pas enregistrée : ${motsErreur(err)}.`);
      } finally {
        if (b.isConnected) { b.disabled = false; b.innerHTML = `${ICONES.coche} Enregistrer la note de frais`; }
      }
    });

    chargerNotesFrais();
  }

  // le ticket photographié rejoint la liste : son aperçu s'envole vers le total en attente
  function envolerJustificatif(img, cache) {
    const cible = $('#tot-attente');
    if (cache || reduit() || !img || !img.src || !cible || typeof img.animate !== 'function') return;
    const a = img.getBoundingClientRect(), b = cible.getBoundingClientRect();
    if (!a.width || !b.width) return;
    const clone = img.cloneNode();
    clone.className = 'photo-envol'; clone.alt = ''; clone.removeAttribute('id');
    Object.assign(clone.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` });
    document.body.append(clone);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    clone.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(.15)`, opacity: .35 }], { duration: 650, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' })
      .finished.catch(() => {}).finally(() => clone.remove());
  }
  async function chargerNotesFrais({ neuve = false } = {}) {
    const zone = $('#liste-frais-zone');
    if (!zone) return;
    try {
      const { data, error } = await sb.from('crescite_notes_frais').select('*').eq('personne_id', E.moi).order('cree_le', { ascending: false });
      if (error) throw error;
      if (!zone.isConnected) return;
      // en attente : ce qui n'est pas encore remboursé (validé ou non) ; remboursé : dans la saison en cours
      const saison = saisonDe(aujourdhui());
      let totAttente = 0, totRembourse = 0;
      (data || []).forEach(x => {
        const m = Number(x.montant_ttc) || 0;
        if (x.statut === 'en_attente' || x.statut === 'valide') totAttente += m;
        if (x.statut === 'rembourse' && saisonDe(iso(new Date(x.rembourse_le || x.cree_le))) === saison) totRembourse += m;
      });
      $('#tot-attente').textContent = euros(totAttente);
      if (neuve && !reduit()) { const t = $('#tot-attente'); t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop'); }
      $('#tot-rembourse').textContent = euros(totRembourse);
      if (!data || !data.length) { zone.innerHTML = '<p class="aide">Aucune note de frais pour le moment.</p>'; return; }

      zone.innerHTML = data.map((item, i) => {
        const cat = CAT_FRAIS[item.categorie] || item.categorie;
        const stClass = STATUT_FRAIS[item.statut] ? item.statut : 'en_attente';
        const quand = estJour(item.date_depense) ? jourCourt(item.date_depense) : item.cree_le ? jourCourt(iso(new Date(item.cree_le))) : '';
        const d = item.date_id != null ? E.dates.find(x => x.id === Number(item.date_id)) : null;
        return `
          <div class="frais-ligne${neuve && !i && !reduit() ? ' neuve' : ''}">
            <span class="badge-statut ${stClass}">${STATUT_FRAIS[stClass]}</span>
            <div>
              <b>${esc(cat)}</b> · <small>${esc(quand)}${d ? ` · ${esc(d.spectacle?.titre || 'Date')}${d.lieu?.commune ? `, ${esc(d.lieu.commune)}` : ''}` : ''}</small>
              ${item.commentaire ? `<br><small class="aide">${esc(item.commentaire)}</small>` : ''}
              ${item.photo_url ? `<br><button type="button" class="lien-btn" data-justificatif="${esc(item.photo_url)}" style="font-size:0.84rem">${ICONES.doc} Voir le justificatif<span class="sr"> (dans un nouvel onglet)</span></button>` : ''}
            </div>
            <div class="montant">${euros(item.montant_ttc)}</div>
          </div>
        `;
      }).join('');
    } catch (e) {
      if (zone.isConnected) zone.innerHTML = `<p class="message erreur">Vos notes de frais ne se lisent pas pour le moment : ${esc(motsErreur(e))}.</p>`;
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
  function calendrier(id = null) {
    const page = retourUrl(), maintenant = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Compagnie Crescite//Espace de l equipe//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      `X-WR-CALNAME:${texteIcs('Crescite · ma tournée')}`, 'X-WR-TIMEZONE:Europe/Paris', ...FUSEAU];
    for (const { d, r, n } of evenementsAVenir(id)) {
      const sp = d.spectacle || {}, l = d.lieu, option = d.statut === 'option', nat = natureDe(d), duree = dureeMinutes(sp.duree) || 90;
      const ou = l ? [l.nom, l.adresse, `${l.commune}${l.departement ? ` (${l.departement})` : ''}`].filter(Boolean).join(', ') : (d.intitule || '');
      const quoi = r ? quoiSeance(n, r.public, nat) : nat !== 'representations' ? NATURES[nat].toLowerCase() : PUBLICS[d.public] || '';
      L.push('BEGIN:VEVENT', `UID:${r ? `crescite-representation-${r.id}` : `crescite-date-${d.id}`}@crescite.fr`, `DTSTAMP:${maintenant}`);
      if (r && r.heure) {
        const fin = r.fin ? plusMinutes(r.jour, r.fin, minutesDe(r.fin) <= minutesDe(r.heure) ? 1440 : 0) : plusMinutes(r.jour, r.heure, duree);
        L.push(`DTSTART;TZID=Europe/Paris:${plusMinutes(r.jour, r.heure, 0)}`, `DTEND;TZID=Europe/Paris:${fin}`);
      } else { const j = r ? r.jour : d.debut, fin = r ? r.jour : (d.fin || d.debut); L.push(`DTSTART;VALUE=DATE:${j.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${lendemain(fin).replace(/-/g, '')}`); }
      L.push(`SUMMARY:${texteIcs(`${option ? 'Option · ' : ''}${sp.titre || 'Représentation'}${quoi ? ` — ${quoi}` : ''}`)}`);
      // le lieu par son nom et son adresse, sans GEO : la position n'est que le centre de la commune
      if (ou) L.push(`LOCATION:${texteIcs(ou)}`);
      const precisions = (Array.isArray(d.details) ? d.details : []).map(x => x && x.texte).filter(Boolean);
      const seance = r ? (nat === 'representations' && quoi === 'tout public' ? 'représentation tout public' : quoi) : '';
      const desc = [`${sp.titre || ''}${option ? ' (option, pas encore confirmée)' : ''}`,
        r ? `${majuscule(seance)}${r.heure ? (r.fin ? `, de ${heureTexte(r.heure)} à ${heureTexte(r.fin)}` : '') : n > 1 ? ', heures à préciser' : ', heure à préciser'}` : (d.representations.length ? '' : 'Horaires pas encore indiqués'),
        r && r.note, ...precisions, ou, nat === 'representations' && sp.duree, `La feuille de route, l’équipe et les documents : ${page}`].filter(Boolean).join('\n');
      L.push(`DESCRIPTION:${texteIcs(desc)}`, `STATUS:${option ? 'TENTATIVE' : 'CONFIRMED'}`, `URL:${page}`, 'END:VEVENT');
    }
    L.push('END:VCALENDAR');
    return L.map(plier).join('\r\n') + '\r\n';
  }
  function telechargerAgenda(id = null) {
    const evs = evenementsAVenir(id), n = evs.length;
    if (!n) return annoncer('Aucune séance à venir à ajouter.', { erreur: true });
    const d = id != null ? E.dates.find(x => x.id === id) : null;
    const url = URL.createObjectURL(new Blob([calendrier(id)], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = d ? `crescite-${d.spectacle?.slug || 'date'}-${d.debut}.ics` : 'crescite-ma-tournee.ics'; a.hidden = true;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    annoncer(d ? 'Le fichier est téléchargé : ouvrez-le pour ajouter cette date à votre agenda.' : 'Le fichier est téléchargé : ouvrez-le pour ajouter vos séances à votre agenda.');
  }

  // ================================================================================================ le service de l'application (sw.js)
  const messageSW = m => { try { navigator.serviceWorker?.controller?.postMessage(m); } catch (e) { /* rien */ } };
  function brancherSW() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    let rechargement = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (E.majDemandee && !rechargement) { rechargement = true; location.reload(); } });
    navigator.serviceWorker.addEventListener('message', e => {
      const m = e.data || {};
      if (m.type === 'ouvrir') { if (m.id != null) marquerLue(Number(m.id)); if (typeof m.lien === 'string' && LIENS_SURS.test(m.lien) && location.hash !== m.lien) location.hash = m.lien; }
      if (m.type === 'push' && E.pret && E.tempsReel !== 'SUBSCRIBED') chargerNotifs({ signaler: true }).catch(() => {});
      if (m.type === 'abonnement-change' && E.pret) majCartePush();
    });
    const suivre = reg => {
      if (!reg) return;
      const proposer = w => {
        if (!w || !navigator.serviceWorker.controller) return;     // la première installation : rien à proposer
        annoncer('Nouvelle version disponible.', { persistant: true, action: { libelle: 'Mettre à jour', f: () => {
          if (E.ficheSale && !confirm('Vos modifications de fiche ne sont pas enregistrées. Mettre à jour quand même ?')) return;
          E.ficheSale = false; E.majDemandee = true; w.postMessage({ type: 'skipWaiting' });
        } } });
      };
      if (reg.waiting) proposer(reg.waiting);
      reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') proposer(w); }); });
      const verifier = () => { if (navigator.onLine) reg.update().catch(() => {}); };
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') verifier(); });
      window.addEventListener('online', verifier);
    };
    // hors connexion, l'enregistrement échoue (le service ne peut pas être relu) : celui qui est déjà là sert quand même
    navigator.serviceWorker.register('sw.js', { scope: './' }).then(suivre).catch(async e => {
      if (navigator.onLine) console.warn('service de l’application', e);
      try { suivre(await navigator.serviceWorker.getRegistration()); } catch (err) { /* aucun */ }
    });
  }

  // ================================================================================================ tirer pour rafraîchir
  function brancherTirer() {
    let y0 = null, dy = 0, actif = false;
    const ind = () => $('#tirer');
    const remettre = () => { const t = ind(); if (!t) return; t.classList.remove('tire', 'pret', 'charge'); t.style.transform = ''; t.style.opacity = ''; t.style.removeProperty('--etire'); };
    document.addEventListener('touchstart', e => {
      y0 = null;
      if (window.scrollY > 0 || E.rafraichit || !E.pret || !$('#app > .appli') || e.touches.length !== 1 || e.target.closest('input, textarea, select, .feuille-cadre, .carte-tournee')) return;
      y0 = e.touches[0].clientY; dy = 0; actif = false;
    }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      const t = ind();
      if (!t || dy <= 0 || window.scrollY > 0 || $('#contenu.glisse')) { if (actif) { actif = false; remettre(); } return; }   // pas pendant le retour au doigt
      actif = true;
      const d = Math.min(120, dy * 0.5);
      t.classList.add('tire');
      t.classList.toggle('pret', d >= 64);
      t.style.opacity = String(Math.min(1, d / 56));
      t.style.transform = `translateY(${d - 56}px)`;
      t.style.setProperty('--etire', (d / 120).toFixed(3));           // la pieuvre s'étire sous le doigt, puis ondule
    }, { passive: true });
    document.addEventListener('touchend', () => {
      if (y0 == null) return;
      y0 = null;
      if (!actif) return;
      actif = false;
      const t = ind(), d = Math.min(120, dy * 0.5);
      if (!t || d < 64) return remettre();
      vibrer(12);
      t.classList.remove('tire'); t.classList.add('charge');
      t.style.transform = 'translateY(8px)'; t.style.opacity = '1';
      Promise.resolve(reessayer(true)).catch(() => {}).finally(() => setTimeout(remettre, 250));
    }, { passive: true });
  }

  // le retour au doigt : descendu d'un cran (une date, une feuille, un spectacle…), un glissé depuis le bord gauche emmène la
  // vue avec le pouce ; assez loin, ou assez vite, elle part et la vue d'avant revient (revenir). Un défilement vertical, un
  // élément qui défile de côté, la feuille de route et la carte ne le déclenchent pas.
  // la date d'avant, celle d'après (toute la tournée, dans l'ordre ; sur une feuille de route, les dates qui en ont une) :
  // deux boutons nommés sous la page, ← → au clavier, un balayage au doigt (brancherGestes)
  function navDates(d, genre = 'date') {
    if (typeof GESTES === 'undefined' || !GESTES) return '';
    const xs = E.dates.filter(x => genre === 'date' || x.feuille).sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : a.id - b.id));
    const i = xs.findIndex(x => x.id === d.id);
    if (i < 0 || xs.length < 2) return '';
    const v = x => (x ? { href: `#/${genre}/${x.id}`, titre: `${jourCourt(x.debut)} · ${x.spectacle?.titre || 'Date'}` } : null);
    return `<nav class="nav-dates">${GESTES.precSuiv({ prec: v(xs[i - 1]), suiv: v(xs[i + 1]), libelle: x => x.titre, classe: 'btn petit', axe: 'horizontal', texte: true, nom: genre === 'date' ? 'Date précédente, date suivante' : 'Feuille précédente, feuille suivante' })}</nav>`;
  }
  // les gestes (../admin/gestes.js) : un appui long ou un clic droit sur un billet, une notification, un document, une
  // proposition ouvre ce qu'on peut en faire ; ← → et le balayage passent à la date (ou la feuille) d'avant, d'après
  function brancherGestes() {
    if (typeof GESTES === 'undefined' || !GESTES) return;
    const G = GESTES;
    const dateDe = el => E.dates.find(x => x.id === Number(el.dataset.date || String(el.id || '').replace('billet-', '')));
    const faux = (attr, valeur) => { const b = document.createElement('button'); b.type = 'button'; b.dataset[attr] = valeur; return b; };
    G.menu({ cible: '.billet[id^="billet-"], .heros[data-date]', titre: el => { const d = dateDe(el); return d ? `${d.spectacle?.titre || 'Date'} · ${majuscule(quandTexte(d))}` : 'Date'; },
      actions: el => {
        const d = dateDe(el);
        if (!d) return [];
        const l = d.lieu, passee = finDe(d) < aujourdhui(), vive = vivante(d), ici = location.hash === `#/date/${d.id}`;
        return [ici ? null : { libelle: 'Ouvrir la date', href: `#/date/${d.id}`, icone: ICONES.chevron },
          l && itineraire(l) ? { libelle: 'Itinéraire', detail: l.nom || l.commune, href: itineraire(l), externe: true, icone: ICONES.route } : null,
          d.feuille && outilFeuille() ? { libelle: 'Feuille de route', detail: `v${d.feuille.version || 1}`, href: `#/feuille/${d.id}`, icone: ICONES.feuille } : null,
          d.feuille && outilFeuille() ? { libelle: 'PDF de la feuille de route', faire: () => telechargerPdf(faux('pdf', d.id)), icone: ICONES.pdf } : null,
          !passee && vive && evenementsAVenir(d.id).length ? { libelle: 'Ajouter à mon agenda', faire: () => telechargerAgenda(d.id), icone: ICONES.agenda } : null,
          !passee && vive && avecSignaler() ? { libelle: 'Signaler un retard', faire: () => ouvrirModaleRetard(d.id, el.querySelector('a, button') || el), icone: ICONES.alerte } : null,
          !passee && vive && avecIdeale() ? { libelle: 'Note de frais', href: `#/frais?date=${d.id}`, icone: ICONES.euro } : null,
          { separateur: true },
          { libelle: 'Partager la date', detail: 'le lien de cette page', icone: ICONES.partager, faire: () => partagerMaintenant({ title: `${d.spectacle?.titre || 'Date'} · ${majuscule(quandTexte(d))}`, text: `${d.spectacle?.titre || ''} ${quandTexte(d)}${l ? ` · ${l.nom || l.commune}` : ''}`.trim(), url: new URL(`#/date/${d.id}`, location.href).href }, 'Lien de la date copié') }];
      } });
    G.menu({ cible: '.liste-notifs .notif[data-notif], .bandeau-notif[data-notif]', titre: 'Notification', actions: el => {
      const n = E.notifs.find(x => x.id === Number(el.dataset.notif));
      return [{ libelle: 'Ouvrir', href: el.getAttribute('href'), icone: ICONES.chevron },
        n && !n.lue_le ? { libelle: 'Marquer comme lue', icone: ICONES.coche, faire: () => { vibrer(10); marquerLue(n.id); } } : null,
        nonLues() > 0 ? { libelle: 'Tout marquer comme lu', icone: ICONES.coche, faire: () => toutMarquerLu($('[data-tout-lu]') || faux('toutLu', '1')) } : null];
    } });
    G.menu({ cible: '.doc-ligne, .puces-docs li', titre: el => (el.querySelector('a, button')?.textContent || 'Document').trim(), actions: el => {
      const a = el.querySelector('a[href]'), p = el.querySelector('[data-partager]');
      return [a ? { libelle: 'Ouvrir', href: a.getAttribute('href'), externe: a.target === '_blank', icone: ICONES.doc } : null,
        p ? { libelle: 'Partager', detail: 'un lien de trente jours', icone: ICONES.partager, faire: () => partager(p) } : null];
    } });
    G.menu({ cible: 'a.carte-prop[href]', titre: 'Proposition de dates', actions: el => [{ libelle: 'Répondre', href: el.getAttribute('href'), icone: ICONES.question }, { libelle: 'Toutes mes propositions', href: '#/propositions', icone: ICONES.planning }] });
    // ← → et le balayage : la date (ou la feuille) d'avant, d'après ; pas depuis le bord (le retour au doigt), ni sur ce qui défile de côté
    G.clavierPrecSuiv(document, { modif: 'aucun', portee: '#contenu' });
    G.glisser(document.body, { gauche: () => $('#contenu .nav-dates [data-gps="1"]:not([disabled])')?.click(), droite: () => $('#contenu .nav-dates [data-gps="-1"]:not([disabled])')?.click(),
      ignorer: t => !!(t.closest && t.closest('[data-pl-defile], .carte-tournee, .frise, .feuille-cadre, .liste-notifs, [data-defile]')) });
  }
  function brancherRetour() {
    let x0 = null, y0 = 0, t0 = 0, dx = 0, actif = false;
    const contenu = () => $('#contenu'), seuil = () => Math.min(140, window.innerWidth * 0.35);
    const defilant = el => { for (let n = el; n && n !== document.body; n = n.parentElement) { if (n.scrollWidth > n.clientWidth + 2) { const o = getComputedStyle(n).overflowX; if (o === 'auto' || o === 'scroll') return true; } } return false; };
    const remettre = c => { c.classList.add('glisse-fin'); c.classList.remove('glisse'); c.style.transform = ''; c.style.opacity = ''; document.documentElement.style.removeProperty('--retour'); setTimeout(() => c.classList.remove('glisse-fin'), 260); };
    document.addEventListener('touchstart', e => {
      x0 = null;
      if (reduit() || !E.pret || !E.route || !E.route.profondeur || E.rafraichit || e.touches.length !== 1 || $('.modale-fond')) return;
      const t = e.touches[0];
      if (t.clientX > 28 || !contenu() || !e.target.closest || e.target.closest('input, textarea, select, .feuille-cadre, .carte-tournee') || defilant(e.target)) return;
      x0 = t.clientX; y0 = t.clientY; t0 = e.timeStamp; dx = 0; actif = false;
    }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (x0 == null) return;
      const t = e.touches[0], c = contenu();
      dx = t.clientX - x0;
      const dy = t.clientY - y0;
      if (!c) { x0 = null; return; }
      if (!actif) {
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { x0 = null; return; }      // c'est un défilement
        if (dx < 10) return;
        actif = true; c.classList.add('glisse');
      }
      const d = Math.max(0, dx);
      c.style.transform = `translateX(${d}px)`;
      c.style.opacity = String(Math.max(0.4, 1 - (d / window.innerWidth) * 0.6));
      document.documentElement.style.setProperty('--retour', Math.min(1, d / seuil()).toFixed(2));
    }, { passive: true });
    const fin = e => {
      if (x0 == null) return;
      x0 = null;
      if (!actif) return;
      actif = false;
      const c = contenu();
      if (!c) return;
      const vite = dx / Math.max(1, e.timeStamp - t0) > 0.5 && dx > 40;
      if (dx < seuil() && !vite) return remettre(c);
      vibrer(8);
      c.classList.add('glisse-fin'); c.classList.remove('glisse');
      c.style.transform = `translateX(${window.innerWidth}px)`; c.style.opacity = '0';
      document.documentElement.style.removeProperty('--retour');
      E.glisse = true;                                                  // changerVue : la vue d'avant entre sans glisser à nouveau
      setTimeout(() => { if (revenir()) setTimeout(() => { E.glisse = false; }, 700); else { E.glisse = false; remettre(c); } }, 160);
    };
    document.addEventListener('touchend', fin, { passive: true });
    document.addEventListener('touchcancel', fin, { passive: true });
  }
  // revenir d'un cran : comme le bouton « Retour » de la barre
  function revenir() {
    const r = E.route;
    if (!r || !r.profondeur) return false;
    const cible = parentDe(r), haut = E.pile[E.pile.length - 1];
    if (haut && haut === cible && history.length > 1) history.back(); else location.hash = cible;
    return true;
  }
  // les notifications au doigt : une notification non lue glissée vers la gauche (élastique : elle résiste de plus en plus)
  // découvre « Lu » ; lâchée assez loin, elle part et se marque lue. Le toucher qui a glissé ne l'ouvre pas.
  function brancherGlisserNotif() {
    let a = null, x0 = 0, y0 = 0, dx = 0, actif = false;
    document.addEventListener('touchstart', e => {
      a = null;
      if (reduit() || e.touches.length !== 1 || !e.target.closest) return;
      const el = e.target.closest('.liste-notifs .notif.non-lue');
      if (!el) return;
      a = el; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; actif = false;
    }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (!a) return;
      const t = e.touches[0], dy = t.clientY - y0;
      dx = t.clientX - x0;
      if (!actif) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { a = null; return; }
        if (dx > -10) return;
        actif = true; a.classList.add('glisse'); a.parentElement.classList.add('glisse');
      }
      const d = Math.min(110, Math.sqrt(Math.max(0, -dx)) * 7);
      a.style.transform = `translateX(${-d}px)`;
      a.parentElement.classList.toggle('pret', d >= 72);
    }, { passive: true });
    const fin = () => {
      if (!a) return;
      const el = a, li = el.parentElement;
      a = null;
      if (!actif) return;
      actif = false;
      const lu = li.classList.contains('pret');
      el.classList.remove('glisse'); el.classList.add('relache');
      li.classList.remove('glisse', 'pret');
      const bloquer = ev => { ev.preventDefault(); ev.stopPropagation(); };
      el.addEventListener('click', bloquer, { capture: true, once: true });
      setTimeout(() => el.removeEventListener('click', bloquer, { capture: true }), 500);
      if (!lu) { el.style.transform = ''; setTimeout(() => el.classList.remove('relache'), 300); return; }
      vibrer(10);
      el.classList.add('lue-glisse');
      setTimeout(() => marquerLue(Number(el.dataset.notif)), 180);
    };
    document.addEventListener('touchend', fin, { passive: true });
    document.addEventListener('touchcancel', fin, { passive: true });
  }
  // la carte et les billets se répondent : survoler (ou cibler au clavier) un billet allume son bras et son point sur la carte,
  // les autres bras s'effacent ; survoler un lieu de la carte allume ses billets (data-dates : les dates du lieu)
  function brancherAllumage() {
    let cle = null;
    const eteindre = () => {
      if (cle == null) return;
      cle = null;
      $$('#contenu .allume').forEach(x => x.classList.remove('allume'));
      $$('#contenu .carte-tournee.cible-active').forEach(x => x.classList.remove('cible-active'));
    };
    const allumer = el => {
      const billet = el.closest('.billet[id]'), lieu = billet ? null : el.closest('a.lieu-carte[data-dates]');
      if (!billet && !lieu) return eteindre();
      const k = billet ? billet.id : lieu.dataset.dates;
      if (k === cle) return;
      eteindre();
      cle = k;
      if (billet) $$(`#contenu .carte-tournee [data-dates~="${billet.id.replace('billet-', '')}"]`).forEach(x => x.classList.add('allume'));
      else lieu.dataset.dates.split(' ').forEach(id => { const b = $(`#billet-${id}`); if (b) b.classList.add('allume'); });
      $$('#contenu .carte-tournee').forEach(f => f.classList.toggle('cible-active', !!$('.allume', f)));
    };
    const sur = e => { if (!e.target.closest) return; const el = e.target.closest('.billet[id], a.lieu-carte'); if (el && el.closest('#contenu')) allumer(el); else eteindre(); };
    document.addEventListener('mouseover', sur);
    document.addEventListener('focusin', sur);
  }

  // ================================================================================================ actions
  async function sortir() {
    if (E.ficheSale && !confirm('Vos modifications de fiche ne sont pas enregistrées. Se déconnecter quand même ?')) return;
    E.ficheSale = false; E.sortieVoulue = true;
    // cet appareil cesse de recevoir les notifications de cette personne (hors connexion : la fonction d'envoi retirera
    // l'abonnement à son premier échec)
    try { await Promise.race([desactiverPush({ silencieux: true }), attendre(2500)]); } catch (e) { /* rien */ }
    arreterTempsReel();
    oublier();
    messageSW({ type: 'oublier' });
    try { if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {}); } catch (e) { /* rien */ }
    const { error } = await sb.auth.signOut({ scope: 'local' });
    if (error && (E.pret || E.sansSession)) {
      // hors connexion, la base n'a pas pu en être prévenue (et supabase-js garde la session) : elle est oubliée ici quand même
      ecrireStock(SESSION, null);
      E.session = null; reinitialiser();
      E.messageConnexion = { texte: 'La session est fermée sur cet appareil.', genre: 'info' };
      demarrer();
      E.sortieVoulue = false;
    }
  }

  async function rafraichir({ discret = false } = {}) {
    if (!E.session) return;
    if (!E.pret) { E.uid = null; return demarrer(); }
    if (E.rafraichit) return E.rafraichit;
    const bouton = $('[data-actualiser]');
    if (bouton) bouton.classList.add('tourne');
    E.rafraichit = (async () => {
      let erreur = null;
      try {
        await Promise.all([charger(), chargerNotifs().catch(e => { if (!estReseau(e)) console.warn('notifications', e); }),
          chargerPropositions().catch(e => { if (!estReseau(e)) console.warn('propositions', e); }), sonder()]);
        E.horsLigne = 0; garder();
        E.dispo.mesIndispos = null; E.dispo.agendas = null; E.planningCache = null;
      } catch (e) { erreur = e; }
      if (erreur) {
        if (estReseau(erreur)) E.horsLigne = E.horsLigne || E.chargeLe || Date.now();
        if (!discret) annoncer(`Actualisation impossible : ${motsErreur(erreur)}.`, { erreur: true });
        bandeauEtat();
        return;
      }
      ecouter();
      majCoquille();
      await redessiner();
      if (!discret) annoncer('Votre espace est à jour.');
    })();
    try { await E.rafraichit; } finally { E.rafraichit = null; if (bouton) bouton.classList.remove('tourne'); }
  }
  // la vue ouverte, redessinée avec les données relues, sans perdre sa place : défilement, saisons ouvertes
  async function redessiner() {
    if (!E.route) return router({ arrivee: true });
    if (E.vue === 'moi' && E.ficheSale) return bandeauEtat();
    // la feuille de route qu'on lit ne se redessine que si une autre version est publiée entre-temps
    const v = E.feuilleVue, fv = v && E.feuilles.get(v.id);
    if (E.vue === 'feuille' && v && (!fv || (fv.version === v.version && fv.publiee_le === v.publiee_le))) {
      const dv = E.dates.find(x => x.id === v.id);
      if (!dv || !dv.feuille || dv.feuille.version === v.version) return bandeauEtat();
      E.feuilles.delete(v.id);
    }
    const y = window.scrollY, ouvertes = $$('details.saison[open]').map(x => x.dataset.saison || x.className), places = reperer();
    router({ rafraichir: true });
    ouvertes.forEach(s => { const det = $(`details.saison[data-saison="${CSS.escape(s)}"]`) || (s.includes('feuilles-passees') && $('details.feuilles-passees')); if (det) { det.open = true; if (det.dataset.saison) remplirSaison(det, { entree: false }); } });
    window.scrollTo(0, y);
    glisserVers(places);
  }
  // la vue se redessine après une lecture de la base : chaque billet (et le héros) qui a changé de place glisse de l'ancienne
  // à la nouvelle plutôt que de sauter ; un billet neuf se pose. Les places se relèvent avant (reperer), en coordonnées de page.
  function reperer() {
    const m = new Map();
    if (reduit() || typeof Element.prototype.animate !== 'function') return m;
    $$('#contenu .billet[id], #contenu .heros[data-date]').forEach(el => { const r = el.getBoundingClientRect(); m.set(el.id || `h${el.dataset.date}`, [r.left, r.top + window.scrollY]); });
    return m;
  }
  function glisserVers(avant) {
    if (!avant.size || reduit()) return;
    const doux = 'cubic-bezier(.2, .8, .2, 1)';
    $$('#contenu .billet[id], #contenu .heros[data-date]').forEach(el => {
      const a = avant.get(el.id || `h${el.dataset.date}`), r = el.getBoundingClientRect();
      if (!a) { el.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: doux }); return; }
      const dx = a[0] - r.left, dy = a[1] - (r.top + window.scrollY);
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate([{ transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)` }, { transform: 'none' }], { duration: 420, easing: doux });
    });
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
    if (document.visibilityState !== 'visible') return;
    majDecomptes(); majFrises();
    if (E.pret && !E.sansSession && E.session && Date.now() - E.chargeLe > 120000) rafraichir({ discret: true });
    else if (E.pret && !E.sansSession && E.session && E.notifsEtat === 'ok') chargerNotifs({ signaler: true }).catch(() => {});
  });
  // le temps qui passe : décomptes et frises chaque demi-minute ; les notifications chaque minute si le temps réel manque
  setInterval(() => { if (document.visibilityState === 'visible') { majDecomptes(); majFrises(); } }, 30000);
  setInterval(() => {
    if (document.visibilityState !== 'visible' || !E.pret || E.sansSession || !E.session || E.notifsEtat !== 'ok' || E.tempsReel === 'SUBSCRIBED') return;
    chargerNotifs({ signaler: true }).catch(() => {});
  }, 60000);

  document.addEventListener('click', async e => {
    const inter = e.target.closest && e.target.closest('.interrupteur');
    if (inter && !e.target.closest('button')) { $('[data-push]', inter)?.click(); return; }
    const t = e.target.closest('button, a, summary');
    if (!t) return;
    if (t.matches('.evitement')) { e.preventDefault(); const h = $('#contenu h1') || $('#contenu'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); } return; }
    if (t.matches('.nav-item')) {
      vibrer(6);
      if (t.getAttribute('href') === location.hash) { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduit() ? 'auto' : 'smooth' }); }
      return;
    }
    if (t.matches('[data-retour]')) {
      const haut = E.pile[E.pile.length - 1];
      if (haut && haut === t.getAttribute('href') && history.length > 1) { e.preventDefault(); history.back(); }
      return;
    }
    if (t.matches('[data-notif]')) { marquerLue(Number(t.dataset.notif)); if (t.classList.contains('bandeau-notif')) t.classList.remove('visible'); return; }
    if (t.matches('[data-sortir]')) return sortir();
    if (t.matches('[data-reessayer]')) return occupe(t, 'Un instant…', () => reessayer(true));
    if (t.matches('[data-actualiser]')) { vibrer(8); return reessayer(true); }
    if (t.matches('[data-retard]')) return ouvrirModaleRetard(Number(t.dataset.retard), t);
    if (t.matches('[data-justificatif]')) {
      // un justificatif de frais : le stockage est privé, un lien signé se demande au clic (une heure)
      e.preventDefault();
      const w = window.open('', '_blank');                      // ouvert pendant le clic, pour ne pas être bloqué
      try {
        const url = await signerJustificatif(t.dataset.justificatif);
        if (w) { w.opener = null; w.location.href = url; } else location.href = url;
      } catch (err) {
        if (w) w.close();
        annoncer(`Le justificatif ne s’ouvre pas : ${motsErreur(err)}.`, { erreur: true });
      }
      return;
    }
    if (t.matches('[data-phase-camion]')) return changerPhaseCamion(t.dataset.phaseCamion, Number(t.dataset.dateId));
    if (t.id === 'b-agenda') return telechargerAgenda();
    if (t.matches('[data-agenda]')) return telechargerAgenda(Number(t.dataset.agenda));
    if (t.matches('[data-pdf]')) return telechargerPdf(t);
    if (t.matches('[data-partager]')) return partager(t);
    if (t.matches('[data-tout-lu]')) return toutMarquerLu(t);
    if (t.matches('[data-effacer-lues]')) return effacerLues(t);
    if (t.matches('[data-push]')) { const actif = t.getAttribute('aria-checked') === 'true'; t.disabled = true; try { if (actif) await desactiverPush(); else await activerPush(t); } finally { if (t.isConnected) t.disabled = false; } return; }
    if (t.matches('[data-push-activer]')) return activerPush(t);
    if (t.matches('[data-push-verifier]')) { E.push.cle = undefined; $$('[data-zone-push]').forEach(z => { delete z.dataset.etat; }); return majCartePush(); }
    if (t.matches('[data-modifier-indispo]')) { E.dispo.modifier = Number(t.dataset.modifierIndispo); vueIndispos(E.route, { focus: false }); window.scrollTo({ top: 0, behavior: reduit() ? 'auto' : 'smooth' }); $('#i-du')?.focus({ preventScroll: true }); return; }
    if (t.matches('[data-retirer-indispo]')) { const x = (E.dispo.mesIndispos || []).find(y => y.id === Number(t.dataset.retirerIndispo)); if (x) retirerIndispo(x); return; }
    if (t.matches('[data-annuler-indispo]')) return vueIndispos(E.route, { focus: false });
    if (t.matches('[data-relire-agenda]')) return relireAgenda(Number(t.dataset.relireAgenda));
    if (t.matches('[data-delier-agenda]')) return delierAgenda(Number(t.dataset.delierAgenda));
    if (t.matches('[data-copier-flux]')) { if (E.dispo.jeton) copier(lienFlux(E.dispo.jeton), '', 'Lien copié : dans votre agenda, ajoutez un agenda « à partir de l’URL » et collez-le.'); return; }
    if (t.matches('[data-nouvelle-cle]')) return nouvelleCle();
    if (t.matches('[data-repondre]')) {
      const id = Number(t.dataset.repondre), c = $(`[data-commentaire="${id}"]`);
      t.disabled = true;
      try { await repondre(id, t.dataset.reponse, c ? c.value.trim() : '', { depuisBouton: true }); } finally { if (t.isConnected) t.disabled = false; }
      return;
    }
    if (t.matches('[data-installer-barre]')) { vibrer(6); return E.installer ? installer() : ouvrirModaleInstallation(t); }
    if (t.matches('[data-installer]')) return installer();
    if (t.matches('[data-fermer-install]')) { garderPref('installFermee', true); majInstallation(); return; }
    if (t.matches('[data-aide-ios]')) { const z = document.getElementById(t.getAttribute('aria-controls')), ouvrir = t.getAttribute('aria-expanded') !== 'true'; if (z) z.hidden = !ouvrir; t.setAttribute('aria-expanded', String(ouvrir)); return; }
    if (t.matches('[data-fichier]')) {
      const chemin = t.dataset.fichier;
      if (t.tagName === 'A' && lienFrais(chemin)) return;     // le lien signé est encore bon : le navigateur l'ouvre
      e.preventDefault();
      const w = window.open('', '_blank');                      // ouvert pendant le clic, pour ne pas être bloqué
      t.classList.add('attend');                                // le temps de signer le lien
      try {
        const url = await signerUn(chemin);
        if (w) { w.opener = null; w.location.href = url; } else location.href = url;
        if (t.tagName === 'A') t.href = url;
      } catch (err) {
        if (w) w.close();
        annoncer(`Le document ne s’ouvre pas : ${motsErreur(err)}.`, { erreur: true });
      } finally { t.classList.remove('attend'); }
    }
  });
  // un portrait qui ne se charge pas : ses initiales restent
  document.addEventListener('error', e => { const i = e.target; if (i && i.tagName === 'IMG' && i.closest && i.closest('.avatar')) i.remove(); }, true);

  // ================================================================================================ ouverture
  // la dernière saison lue sur cet appareil s'affiche tout de suite, si la session gardée est la sienne (sans réseau,
  // supabase-js peut chercher à renouveler une session expirée pendant une demi-minute) ; la base la remplace dès qu'elle
  // répond. Pas en arrivant d'un courriel : un autre compte peut s'ouvrir.
  (() => {
    if (E.motDePasse || ARRIVEE.type || ARRIVEE.erreur || /access_token=/.test(location.hash)) return;
    const g = sessionGardee(), m = g && reprendre(g.user.id);
    if (!m) return;
    E.uid = g.user.id;
    appliquer(m);
    Object.assign(E, { pret: true, provisoire: true });
    coquille();
    router({ arrivee: true });
  })();
  brancherSW();
  brancherTirer();
  brancherRetour();
  brancherGlisserNotif();
  brancherAllumage();
  brancherGestes();
})();
