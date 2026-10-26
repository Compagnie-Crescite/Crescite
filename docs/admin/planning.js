/* Le planning commun de la compagnie : qui est libre, qui part, ce qui est proposé. Commun à l'espace de l'équipe
   (equipe/index.html, qui le charge par ../admin/planning.js) et à l'administration (admin/index.html). Aucune
   dépendance : ni la base, ni l'application. Il reçoit les données de crescite_planning(de, a) (script SQL 5) et ne fait
   que montrer ; tout ce qui écrit (une indisponibilité, une réponse, une proposition) reste à la page qui l'accueille,
   par ses actions (options.actions) et ses rappels (surJour…).

   Deux vues :
     « Équipe » une ligne par personne, une colonne par jour, sur 4, 6 ou 8 semaines : les indisponibilités en hachures
                (les siennes en couleur, avec leur motif quand on le voit), les dates de la compagnie en bandes de la couleur
                du spectacle sur les lignes de ceux qui partent, les propositions en pointillé avec leurs réponses (✓ ✗ ?),
                les conflits signalés (quelqu'un part alors qu'il n'est pas libre). Les noms restent collés à gauche, les
                jours en haut ; au téléphone, la grille défile sous les doigts.
     « Mois »   un calendrier : les dates de la compagnie en barres de couleur, les propositions en pointillé, les
                personnes qui ne sont pas libres (portraits ou initiales, et leur nombre), aujourd'hui marqué, ses propres
                indisponibilités hachurées. Au téléphone, la grille se resserre (des pastilles) et le jour choisi se lit
                en liste dessous.
   Le jour choisi (et la personne, dans la vue Équipe) se détaille sous la grille (ou à côté, sur un grand écran), avec
   les boutons que la page lui donne (options.actions).

   PLANNING.monter(racine, options) → planning
     racine        l'élément qui reçoit le planning (son contenu est remplacé)
     options.charger(de, a) → Promise<donnees>
                   la réponse de crescite_planning(de, a) ('AAAA-MM-JJ', bornes comprises) pour la période montrée ;
                   appelée à chaque navigation et par planning.actualiser(). Une erreur s'affiche dans le planning, avec
                   « Réessayer » (options.messageErreur(e) → la phrase ; par défaut, une phrase générale).
     options.donnees  des données déjà lues (pour la période de départ) : la première vue s'affiche sans attendre
     options.vue      'equipe' (par défaut) ou 'mois'
     options.jour     'AAAA-MM-JJ' : le jour de départ (par défaut, aujourd'hui) ; la vue Équipe commence au lundi de sa
                      semaine, la vue Mois montre son mois
     options.semaines 4, 6 (par défaut) ou 8 : la largeur de la vue Équipe
     options.aujourdhui 'AAAA-MM-JJ' (par défaut, la date du jour à Paris : pour les essais)
     options.filtre   { spectacle: id | null, personne: id | null, groupe: id | null }
     options.spectacles [{id, titre, couleur}] : la liste du filtre « spectacle » (par défaut, ceux des dates lues)
     options.distributions [{spectacle_id, personne_id}] : le filtre « spectacle » montre sa distribution ; sans elles,
                      les personnes qui partent sur ses dates
     options.groupes  [{ id, libelle, personnes: [id…], spectacles: [id…] }] : des groupes de personnes, en tête de la liste
                      des personnes (« Mes projets », puis « Toute l’équipe », puis chacun) ; spectacles (facultatif) y
                      ajoute l'équipe de chaque date de ces spectacles dans les données lues. Un groupe ne filtre que les
                      personnes (les lignes de la vue Équipe, les portraits « pas libre » de la vue Mois, les conflits), pas
                      les dates : on voit quand ses partenaires sont pris ailleurs. Qui l'emporte : la personne choisie, puis
                      le spectacle, puis le groupe, sinon toute l'équipe. Le petit titre dit le groupe (« mes projets »)
     options.masquer  true : masquer des personnes, pour l'administration (seulement quand les données disent admin) :
                      « Masquer du planning » dans le détail d'une personne (vue Équipe) et sur sa ligne (au survol, d'un
                      toucher sur le nom ; au clavier, Maj+Tab depuis la case atteignable). « Masquées (n) », dans la barre
                      des filtres, les liste, chacune avec « Afficher », et « Tout afficher ». Une personne masquée n'est
                      plus dans les vues (lignes, portraits, conflits), sauf si on la choisit dans le filtre « personne »
     options.masques  [id…] : les personnes masquées au départ
     options.surMasques(ids)             après chaque changement des personnes masquées (la page les garde)
     options.photo(chemin) → url : les portraits (personne.photo, un chemin du stockage public) ; sans elle, des initiales
     options.actions(selection) → [{ libelle, faire(selection), principal?, icone? (SVG) }]
                      les boutons du détail du jour choisi ; selection = { jour, personne (ou null), dates, indisponibilites,
                      propositions: [{proposition, jour, reponse}], conflits, moi, admin }
     options.surJour(selection)          un jour activé (clic, Entrée)
     options.surChangement(etat)         après chaque navigation : { vue, jour, de, a, semaines, filtre } (pour l'adresse)
     options.outils   false : sans la barre d'outils (navigation, vues, filtres) ; la page pilote alors le planning
     options.feuille  'auto' (par défaut) : au téléphone, dans la vue Équipe, le détail du jour monte en feuille du bas
                      (au-dessus de --pl-bas, la hauteur de la barre d'onglets de la page) ; true : toujours ; false : jamais
     options.titre    le titre lu par les lecteurs d'écran (par défaut « Planning de l'équipe »)

   planning.donnees(d)          remplace les données de la période (sans recharger) et redessine
   planning.actualiser()        relit la période montrée (options.charger) → Promise ; si la lecture échoue alors que des
                                données de cette période sont là, elles restent, avec un avertissement et « Réessayer »
   planning.vue('equipe'|'mois'), planning.aller('AAAA-MM-JJ'), planning.precedent(), planning.suivant(), planning.ici()
   planning.semaines(4|6|8), planning.filtrer({spectacle, personne, groupe}), planning.choisir(jour, personne?)
   planning.masques([id…])      remplace les personnes masquées (la page les a relues) ; surMasques n'est pas rappelé
   planning.etat() → { vue, jour, de, a, semaines, filtre: {spectacle, personne, groupe}, selection }
   planning.detruire()

   Outils, sans planning monté :
   PLANNING.periode(vue, jour, semaines) → {de, a} : ce qu'une vue montre (pour lire la base d'avance)
   PLANNING.joursDe(x) → [{jour, entier, de, a}] : les jours (heure de Paris) que couvre une indisponibilité ou un jour
                      proposé x = {debut, fin, journee} ; de / a : 'HH:MM' quand le jour n'est pris qu'en partie
   PLANNING.conflits(donnees) → [{personne_id, date, jour, entier}] : qui part alors qu'il n'est pas libre
   PLANNING.chevauchement(a, b) → vrai si deux périodes {debut, fin, journee} se touchent un même jour (une proposition
                      face à ses indisponibilités)
   PLANNING.texteJours(x) → « mardi 3 novembre », « du 10 au 12 novembre », « jeudi 5 novembre, 14h – 17h »
   PLANNING.css     la feuille de style (posée une fois dans <head>, id « planning-css »)
   PLANNING.outils  { instant('AAAA-MM-JJ', 'HH:MM') → ms (heure de Paris), minuit(j) → ms, jourParis(ms), jourPlus(j, n),
                      lundiDe(j), jourLong(j, annee?), heureTexte('HH:MM'), ecart(a, b) } : les mêmes règles de jours

   Les données (crescite_planning) :
     { moi, admin, personnes: [{id, prenom, nom, slug, metiers, photo}],
       indisponibilites: [{id, personne_id, debut, fin, journee, source, motif}],   (motif : le sien, ou tous pour l'administration)
       dates: [{id, debut, fin, precision, nature, statut, public, spectacle: {id, slug, titre, couleur}, lieu: {nom, commune}, equipe: [id…]}],
       propositions: [{id, titre, message, statut, spectacle_id, jours: [{id, debut, fin, journee, reponses: [{personne_id, reponse, commentaire}]}],
                       destinataires: [{personne_id}]}] }
   Une journée entière va de minuit à minuit (fin exclue) : minuit à Paris ou minuit UTC, les deux se lisent.

   L'habillage : des variables CSS, qui prennent d'elles-mêmes celles de la page (l'espace de l'équipe : --surface,
   --encre, --gris, --filet, --magenta… ; l'administration : --carte, --trait, --accent…) et suivent son mode sombre :
     --pl-fond --pl-papier --pl-texte --pl-sourd --pl-filet --pl-accent --pl-doux --pl-alerte --pl-ok
     --pl-nom (la colonne des noms) --pl-col (une colonne de jour) --pl-ligne (une ligne de personne) --pl-rayon
   Les couleurs des spectacles (spectacle.couleur) s'éclaircissent sur fond sombre ; leur texte est choisi lisible.
   Le mouvement est discret (la grille glisse d'une période à l'autre, le détail paraît) et s'arrête si le visiteur a
   demandé moins d'animations, ou avec ?anim=0 dans l'adresse. Clavier : flèches, Début/Fin, Page précédente/suivante
   (période), Entrée ou Espace (activer le jour), Échap (fermer la feuille du détail, la liste des personnes masquées).
   Ce qui avait le focus dans la barre ou le détail le retrouve après chaque nouveau dessin. */
const PLANNING = (() => {
  'use strict';

  // ================================================================================================ outils
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const txt = v => String(v ?? '').trim();
  const maj = s => (s ? s[0].toUpperCase() + s.slice(1) : '');
  const ZONE = 'Europe/Paris';
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const JOURS_COURTS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
  const INITIALES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const estJour = j => /^\d{4}-\d{2}-\d{2}$/.test(j || '');
  const midi = j => new Date(j + 'T12:00:00Z');
  const jourPlus = (j, n) => { const d = midi(j); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const ecart = (a, b) => Math.round((midi(b) - midi(a)) / 864e5);
  const rang = j => (midi(j).getUTCDay() + 6) % 7;            // lundi 0 … dimanche 6
  const lundiDe = j => jourPlus(j, -rang(j));
  const premier = j => j.slice(0, 8) + '01';
  const moisPlus = (j, n) => { const d = midi(premier(j)); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
  const dernier = j => jourPlus(moisPlus(j, 1), -1);
  const nombreJour = j => +j.slice(8, 10);
  const jourTexte = j => (nombreJour(j) === 1 ? '1er' : String(nombreJour(j)));
  const jourLong = (j, annee = false) => `${JOURS[midi(j).getUTCDay()]} ${jourTexte(j)} ${MOIS[+j.slice(5, 7) - 1]}${annee ? ` ${j.slice(0, 4)}` : ''}`;
  const moisTexte = j => `${MOIS[+j.slice(5, 7) - 1]} ${j.slice(0, 4)}`;
  const heureTexte = h => { if (!h) return ''; const [hh, mm] = h.split(':'); return `${+hh}h${mm && mm !== '00' ? mm : ''}`; };
  let FMT = null;
  function parts(ms) {
    FMT = FMT || new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const p = {};
    for (const x of FMT.formatToParts(new Date(ms))) p[x.type] = x.value;
    return p;
  }
  const jourParis = ms => { const p = parts(ms); return `${p.year}-${p.month}-${p.day}`; };
  const heureParis = ms => { const p = parts(ms); return `${p.hour === '24' ? '00' : p.hour}:${p.minute}`; };
  const MINUITS = new Map();
  // minuit à Paris d'un jour, en ms
  function minuit(j) {
    let m = MINUITS.get(j);
    if (m != null) return m;
    const t = Date.parse(j + 'T00:00:00Z');
    const dec = x => { const p = parts(x); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute) - x; };
    m = t - dec(t - dec(t));
    MINUITS.set(j, m);
    return m;
  }
  // une heure de Paris un jour donné → ms (les heures qui n'existent pas, au passage à l'heure d'été, avancent)
  function instant(j, hhmm = '00:00') {
    const [h, m] = String(hhmm).split(':').map(Number);
    const t = Date.UTC(+j.slice(0, 4), +j.slice(5, 7) - 1, +j.slice(8, 10), h || 0, m || 0);
    const dec = x => { const p = parts(x); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute) - x; };
    return t - dec(t - dec(t));
  }
  const aujourdhuiParis = () => jourParis(Date.now());
  const memeId = (a, b) => a != null && b != null && String(a) === String(b);
  const COUPE = (() => { try { return new URLSearchParams(location.search).get('anim') === '0'; } catch (e) { return false; } })();
  const reduit = () => COUPE || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ================================================================================================ les périodes
  // les jours (à Paris) que couvre x = {debut, fin, journee} ; une journée entière : de minuit à minuit, fin exclue
  function joursDe(x) {
    const d = Date.parse(x && x.debut), f = Date.parse(x && x.fin);
    if (!(f > d)) return [];
    const out = [];
    if (x.journee) {
      // minuit à Paris (23h ou 22h UTC la veille) comme minuit UTC tombent sur le bon jour à midi près
      let j = new Date(d + 432e5).toISOString().slice(0, 10);
      const fin = new Date(f + 432e5).toISOString().slice(0, 10);
      for (let n = 0; j < fin && n < 1000; n++, j = jourPlus(j, 1)) out.push({ jour: j, entier: true, de: null, a: null });
      return out;
    }
    let j = jourParis(d);
    const der = jourParis(f - 1);
    for (let n = 0; j <= der && n < 1000; n++, j = jourPlus(j, 1)) {
      const m0 = minuit(j), m1 = minuit(jourPlus(j, 1));
      const a = Math.max(d, m0), b = Math.min(f, m1);
      out.push({ jour: j, entier: a <= m0 && b >= m1, de: a > m0 ? heureParis(a) : null, a: b < m1 ? heureParis(b) : null });
    }
    return out;
  }
  const joursDate = d => {
    if (!estJour(d.debut)) return [];
    const out = [], fin = estJour(d.fin) && d.fin > d.debut ? d.fin : d.debut;
    for (let j = d.debut, n = 0; j <= fin && n < 400; j = jourPlus(j, 1), n++) out.push(j);
    return out;
  };
  const precise = d => !d.precision || d.precision === 'jour' || d.precision === 'periode';
  function chevauchement(a, b) {
    const ja = new Set(joursDe(a).map(x => x.jour));
    return joursDe(b).some(x => ja.has(x.jour));
  }
  // « mardi 3 novembre », « du mardi 10 au jeudi 12 novembre », « jeudi 5 novembre, 14h – 17h »
  function texteJours(x) {
    const js = joursDe(x);
    if (!js.length) return '';
    if (js.length === 1) {
      const u = js[0];
      if (u.entier) return jourLong(u.jour);
      return `${jourLong(u.jour)}, ${u.de && u.a ? `${heureTexte(u.de)} – ${heureTexte(u.a)}` : u.de ? `à partir de ${heureTexte(u.de)}` : `jusqu’à ${heureTexte(u.a)}`}`;
    }
    const a = js[0], b = js[js.length - 1];
    const memeMois = a.jour.slice(0, 7) === b.jour.slice(0, 7);
    const debut = memeMois ? `${JOURS[midi(a.jour).getUTCDay()]} ${jourTexte(a.jour)}` : jourLong(a.jour);
    const heures = !a.entier || !b.entier ? ` (${a.de ? `dès ${heureTexte(a.de)}` : ''}${a.de && b.a ? ', ' : ''}${b.a ? `jusqu’à ${heureTexte(b.a)}` : ''})` : '';
    return `du ${debut} au ${jourLong(b.jour)}${heures}`;
  }
  const partiel = u => (u.entier ? '' : u.de && u.a ? `${heureTexte(u.de)}–${heureTexte(u.a)}` : u.de ? `dès ${heureTexte(u.de)}` : `jusqu’à ${heureTexte(u.a)}`);

  function periode(vue, jour, semaines = 6) {
    const j = estJour(jour) ? jour : aujourdhuiParis();
    if (vue === 'mois') return { de: lundiDe(premier(j)), a: jourPlus(lundiDe(dernier(j)), 6) };
    const s = [4, 6, 8].includes(+semaines) ? +semaines : 6, de = lundiDe(j);
    return { de, a: jourPlus(de, s * 7 - 1) };
  }

  // ================================================================================================ les couleurs
  const PALETTE = ['#a3306b', '#c27a1a', '#2f6f9f', '#3d7d5a', '#6b4fa0', '#b8442f', '#1f7a7a', '#8a5a2b'];
  const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
  function rgb(c) {
    const s = String(c || '').trim();
    let m = s.match(/^#([0-9a-f]{3})$/i);
    if (m) return m[1].split('').map(x => parseInt(x + x, 16));
    m = s.match(/^#([0-9a-f]{6})/i);
    if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
    m = s.match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i);
    if (m) return [+m[1], +m[2], +m[3]];
    m = s.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
    if (m) return [+m[1] * 255, +m[2] * 255, +m[3] * 255];
    return null;
  }
  const hex = c => '#' + c.map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const melange = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const BLANC = [255, 255, 255], NUIT = [27, 20, 24];
  // la couleur d'un spectacle, ajustée au fond (clair ou sombre), et le texte qui s'y lit (4,5:1 au moins)
  function teinte(couleur, cle, sombre) {
    let c = rgb(couleur) || rgb(PALETTE[hash(cle) % PALETTE.length]);
    if (sombre) { for (let i = 0; i < 6 && lum(c) < 0.16; i++) c = melange(c, BLANC, 0.18); }
    else { for (let i = 0; i < 6 && lum(c) > 0.55; i++) c = melange(c, NUIT, 0.15); }
    let texte = contraste(c, BLANC) >= contraste(c, NUIT) ? BLANC : NUIT;
    for (let i = 0; i < 8 && contraste(c, texte) < 4.5; i++) c = melange(c, texte === BLANC ? NUIT : BLANC, 0.1);
    texte = contraste(c, BLANC) >= contraste(c, NUIT) ? BLANC : NUIT;
    return { fond: hex(c), texte: hex(texte), doux: hex(melange(c, sombre ? [31, 25, 33] : BLANC, sombre ? 0.72 : 0.84)) };
  }

  // ================================================================================================ les personnes
  const nomDe = p => [txt(p && p.prenom), txt(p && p.nom)].filter(Boolean).join(' ') || 'Quelqu’un';
  const initiales = p => (((txt(p && p.prenom)[0] || '') + (txt(p && p.nom)[0] || '')).toUpperCase() || '?');
  function avatar(p, photo, cls = '') {
    const u = p && p.photo && typeof photo === 'function' ? photo(p.photo) : '';
    const t = (hash(p && p.id) % 6);
    return `<span class="pl-av pl-av-${t}${cls ? ` ${cls}` : ''}" aria-hidden="true"><span>${esc(initiales(p))}</span>${u ? `<img src="${esc(u)}" alt="" loading="lazy" decoding="async">` : ''}</span>`;
  }

  // ================================================================================================ l'index d'une période
  function ordonnerPersonnes(D) {
    const xs = (D.personnes || []).slice();
    const i = xs.findIndex(p => memeId(p.id, D.moi));
    if (i > 0) xs.unshift(xs.splice(i, 1)[0]);
    return xs;
  }
  function conflits(D, gardes = null) {
    const parPJ = new Map();
    for (const i of D.indisponibilites || []) for (const u of joursDe(i)) {
      const k = `${i.personne_id}|${u.jour}`;
      const x = parPJ.get(k);
      if (!x) parPJ.set(k, { entier: u.entier, ids: [i.id] }); else { x.entier = x.entier || u.entier; x.ids.push(i.id); }
    }
    const out = [];
    for (const d of D.dates || []) {
      if (!precise(d) || d.statut === 'annulee' || d.statut === 'reportee') continue;
      for (const j of joursDate(d)) for (const p of d.equipe || []) {
        if (gardes && !gardes.has(String(p))) continue;
        const x = parPJ.get(`${p}|${j}`);
        if (x) out.push({ personne_id: p, date: d, jour: j, entier: x.entier, indisponibilites: x.ids });
      }
    }
    return out;
  }
  // les personnes d'un groupe : les siennes, et l'équipe de chaque date de ses spectacles dans les données lues
  function membres(D, g) {
    const ids = new Set(g.personnes);
    if (g.spectacles.size) for (const d of D.dates || []) if (d.spectacle && g.spectacles.has(String(d.spectacle.id))) (d.equipe || []).forEach(p => ids.add(String(p)));
    return ids;
  }
  // tout ce que les vues lisent, d'un coup : par personne et jour, par jour. Les personnes montrées : celle choisie, sinon
  // la distribution du spectacle, sinon le groupe, sinon toute l'équipe ; une personne masquée n'y est que choisie
  function indexer(D, filtre, distributions, groupe = null, masques = null) {
    const personnes = ordonnerPersonnes(D);
    const P = new Map(personnes.map(p => [String(p.id), p]));
    let gardes = personnes;
    const sp = filtre.spectacle != null ? String(filtre.spectacle) : null;
    if (filtre.personne != null) gardes = personnes.filter(p => memeId(p.id, filtre.personne));
    else {
      if (sp) {
        const ids = new Set((distributions || []).filter(x => String(x.spectacle_id) === sp).map(x => String(x.personne_id)));
        if (!ids.size) for (const d of D.dates || []) if (d.spectacle && String(d.spectacle.id) === sp) (d.equipe || []).forEach(p => ids.add(String(p)));
        gardes = personnes.filter(p => ids.has(String(p.id)));
      } else if (groupe) {
        const ids = membres(D, groupe);
        gardes = personnes.filter(p => ids.has(String(p.id)));
      }
      if (masques && masques.size) gardes = gardes.filter(p => !masques.has(String(p.id)));
    }
    const G = new Set(gardes.map(p => String(p.id)));
    const dates = (D.dates || []).filter(d => precise(d) && (!sp || (d.spectacle && String(d.spectacle.id) === sp))
      && (filtre.personne == null || (d.equipe || []).some(p => memeId(p, filtre.personne))));
    const aPreciser = (D.dates || []).filter(d => !precise(d) && (!sp || (d.spectacle && String(d.spectacle.id) === sp)));
    const props = (D.propositions || []).filter(x => !sp || String(x.spectacle_id) === sp);
    const PJ = new Map(), J = new Map();
    const pj = (p, j) => { const k = `${p}|${j}`; let x = PJ.get(k); if (!x) PJ.set(k, x = { indispos: [], dates: [], props: [], conflit: null }); return x; };
    const jr = j => { let x = J.get(j); if (!x) J.set(j, x = { dates: [], indispos: [], props: [], conflits: [] }); return x; };
    for (const i of D.indisponibilites || []) {
      if (!G.has(String(i.personne_id))) continue;
      for (const u of joursDe(i)) { pj(i.personne_id, u.jour).indispos.push({ i, u }); jr(u.jour).indispos.push({ i, u }); }
    }
    for (const d of dates) for (const j of joursDate(d)) {
      jr(j).dates.push(d);
      for (const p of d.equipe || []) if (G.has(String(p))) pj(p, j).dates.push(d);
    }
    for (const x of props) for (const jour of x.jours || []) {
      const dest = (x.destinataires || []).map(y => String(y.personne_id));
      for (const u of joursDe(jour)) {
        jr(u.jour).props.push({ proposition: x, jour, u });
        for (const p of dest) if (G.has(p)) {
          const r = (jour.reponses || []).find(y => String(y.personne_id) === p);
          pj(p, u.jour).props.push({ proposition: x, jour, u, reponse: r ? r.reponse || null : null, commentaire: r ? r.commentaire || null : null });
        }
      }
    }
    const cs = conflits({ ...D, dates }, G);
    for (const c of cs) { pj(c.personne_id, c.jour).conflit = c; jr(c.jour).conflits.push(c); }
    return { personnes: gardes, P, PJ, J, dates, aPreciser, conflits: cs, moi: D.moi, admin: !!D.admin };
  }

  // ================================================================================================ les textes
  const REPONSES = { oui: 'disponible', non: 'pas disponible', peut_etre: 'peut-être' };
  const SIGNES = { oui: '✓', non: '✗', peut_etre: '?' };
  const lieuCourt = d => (d.lieu ? txt(d.lieu.commune || d.lieu.nom) : '');
  const nomDate = d => `${txt(d.spectacle && d.spectacle.titre) || 'Date'}${lieuCourt(d) ? ` à ${lieuCourt(d)}` : ''}${d.statut === 'option' ? ' (option)' : ''}${d.nature && d.nature !== 'representations' ? ` (${d.nature === 'repetitions' ? 'répétitions' : d.nature === 'residence' ? 'résidence' : 'rendez-vous'})` : ''}`;
  const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs || un + 's' : un}`;

  // ================================================================================================ le style
  const CSS = `
.pl { --pl-fond: var(--surface, var(--carte, #fffdf9)); --pl-papier: var(--papier, var(--fond, #f6f2eb)); --pl-texte: var(--encre, #1d1720);
  --pl-sourd: var(--gris, #675e6b); --pl-filet: var(--filet, var(--trait, #e4dde3)); --pl-accent: var(--magenta, var(--accent, #a3306b));
  --pl-doux: var(--magenta-doux, var(--accent-doux, #f5e4ec)); --pl-alerte: var(--alerte, #b3261e); --pl-ok: var(--ok, #1d6f47);
  --pl-nom: 168px; --pl-col: 36px; --pl-ligne: 40px; --pl-rayon: 12px;
  --pl-hachure: color-mix(in srgb, var(--pl-texte) 34%, transparent); --pl-we: color-mix(in srgb, var(--pl-texte) 4%, transparent);
  --pl-courbe: cubic-bezier(.2, .7, .2, 1);
  position: relative; color: var(--pl-texte); font-variant-numeric: tabular-nums; }
.pl *, .pl *::before, .pl *::after { box-sizing: border-box; }
.pl button { font: inherit; color: inherit; }
.pl [hidden] { display: none !important; }
.pl .pl-sr, .pl-annonce { position: absolute !important; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.pl-barre { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin: 0 0 12px; }
.pl-nav { display: flex; align-items: center; gap: 6px; min-width: 0; flex: 0 1 auto; }
.pl-titre { margin: 0 4px; font-size: 1.05rem; font-weight: 700; line-height: 1.25; min-width: 0; white-space: nowrap; }
.pl:not(.compact) .pl-filtres { margin-left: auto; }
.pl-titre small { display: block; font-size: .78rem; font-weight: 500; color: var(--pl-sourd); }
.pl-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 40px; padding: 0 12px; border-radius: 999px;
  border: 1px solid var(--pl-filet); background: var(--pl-fond); cursor: pointer; font-weight: 600; font-size: .9rem; transition: background .15s, transform .15s; }
.pl-btn:hover { background: color-mix(in srgb, var(--pl-accent) 7%, var(--pl-fond)); }
.pl-btn:active { transform: scale(.97); }
.pl-btn.rond { width: 40px; padding: 0; flex: none; }
.pl-btn svg { width: 18px; height: 18px; }
.pl-btn.principal { background: var(--pl-accent); border-color: var(--pl-accent); color: var(--sur-action, var(--pl-fond)); }
.pl-btn.principal:hover { background: color-mix(in srgb, var(--pl-accent) 88%, var(--pl-texte)); }
.pl-vues { display: inline-flex; padding: 3px; border-radius: 999px; background: color-mix(in srgb, var(--pl-texte) 6%, var(--pl-fond)); border: 1px solid var(--pl-filet); }
.pl-vues button { min-height: 34px; padding: 0 14px; border: 0; border-radius: 999px; background: transparent; cursor: pointer; font-weight: 600; font-size: .88rem; color: var(--pl-sourd); transition: background .2s, color .2s; }
.pl-vues button[aria-pressed="true"] { background: var(--pl-fond); color: var(--pl-texte); box-shadow: 0 1px 3px rgba(0,0,0,.12); }
.pl-filtres { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.pl-filtres label { display: inline-flex; align-items: center; gap: 6px; font-size: .85rem; color: var(--pl-sourd); }
.pl-filtres select { min-height: 38px; max-width: 13.5rem; padding: 0 30px 0 10px; border-radius: 10px; border: 1px solid var(--pl-filet); background: var(--pl-fond); color: var(--pl-texte); font-size: .88rem; }
.pl-legende { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 0 0 10px; padding: 0; list-style: none; font-size: .8rem; color: var(--pl-sourd); }
.pl-legende li { display: inline-flex; align-items: center; gap: 6px; }
.pl-legende i { display: inline-block; width: 18px; height: 12px; border-radius: 3px; }
.pl-legende .l-indispo { background: repeating-linear-gradient(135deg, var(--pl-hachure) 0 1.5px, transparent 1.5px 5px); border: 1px solid var(--pl-filet); }
.pl-legende .l-moi { background: repeating-linear-gradient(135deg, var(--pl-accent) 0 1.5px, transparent 1.5px 5px), var(--pl-doux); }
.pl-legende .l-date { background: linear-gradient(90deg, #a3306b, #c27a1a, #2f6f9f); }
.pl-legende .l-prop { border: 2px dashed var(--pl-accent); }
.pl-legende .l-conflit { width: 16px; height: 16px; border-radius: 50%; background: var(--pl-alerte); }
.pl-corps { position: relative; }
.pl-corps[aria-busy="true"]::before { content: ""; position: absolute; z-index: 9; left: 0; right: 0; top: -6px; height: 3px; border-radius: 3px;
  background: linear-gradient(90deg, transparent, var(--pl-accent), transparent); background-size: 40% 100%; background-repeat: no-repeat; animation: pl-charge 1s linear infinite; }
.pl-corps[aria-busy="true"] .pl-vue { opacity: .55; transition: opacity .2s; }
@keyframes pl-charge { from { background-position: -40% 0; } to { background-position: 140% 0; } }
.pl-erreur { padding: 18px; border-radius: var(--pl-rayon); background: color-mix(in srgb, var(--pl-alerte) 9%, var(--pl-fond)); border: 1px solid color-mix(in srgb, var(--pl-alerte) 35%, transparent); }
.pl-erreur p { margin: 0 0 10px; }
.pl-resume { margin: 0 0 10px; font-size: .88rem; color: var(--pl-sourd); }
.pl-resume b { color: var(--pl-texte); }
.pl-alerte { display: flex; gap: 8px; align-items: flex-start; margin: 0 0 10px; padding: 10px 12px; border-radius: 10px; font-size: .88rem;
  background: color-mix(in srgb, var(--pl-alerte) 9%, var(--pl-fond)); border: 1px solid color-mix(in srgb, var(--pl-alerte) 30%, transparent); }
.pl-alerte .pl-signe { flex: none; }
details.pl-alerte { display: block; }
details.pl-alerte summary { display: flex; gap: 8px; align-items: center; cursor: pointer; list-style: none; }
details.pl-alerte summary::-webkit-details-marker { display: none; }
details.pl-alerte summary::after { content: ""; margin-left: auto; width: 8px; height: 8px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg); transition: transform .2s; }
details.pl-alerte[open] summary::after { transform: rotate(-135deg); }
details.pl-alerte p { margin: 8px 0 0; }
.pl.compact .pl-barre { gap: 8px; }
.pl.compact .pl-nav { flex: 1 1 100%; }
.pl.compact .pl-titre { flex: 1; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pl.compact .pl-filtres { flex: 1 1 100%; }
.pl.compact .pl-filtres label, .pl.compact .pl-filtres select { flex: 1 1 100%; max-width: none; }
.pl.compact .pl-legende { margin: 12px 0 0; }
/* les personnes masquées : le bouton de la barre des filtres, et sa liste */
.pl-masquees { position: relative; }
.pl-btn-masquees { min-height: 38px; font-size: .86rem; }
.pl-btn-masquees svg { width: 16px; height: 16px; }
.pl-btn-masquees[aria-expanded="true"] { background: color-mix(in srgb, var(--pl-accent) 10%, var(--pl-fond)); border-color: color-mix(in srgb, var(--pl-accent) 45%, var(--pl-filet)); }
.pl-masquees-liste { position: absolute; z-index: 30; top: calc(100% + 6px); right: 0; width: max-content; min-width: 250px; max-width: min(340px, calc(100vw - 32px));
  max-height: min(60vh, 440px); overflow: auto; padding: 8px; border-radius: var(--pl-rayon); background: var(--pl-fond); border: 1px solid var(--pl-filet);
  box-shadow: 0 14px 34px rgba(0,0,0,.18), 0 2px 6px rgba(0,0,0,.1); animation: pl-parait .16s ease-out; }
@keyframes pl-parait { from { opacity: 0; transform: translateY(-4px); } }
.pl-masquees-liste ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.pl-masquees-liste li { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 4px 4px 4px 6px; border-radius: 10px; font-size: .9rem; }
.pl-masquees-liste li:hover { background: color-mix(in srgb, var(--pl-texte) 4%, var(--pl-fond)); }
.pl-masquees-liste li .n { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pl-masquees-liste li .pl-btn { flex: none; min-height: 34px; padding: 0 12px; font-size: .84rem; }
.pl-masquees-liste .pl-tout { width: 100%; margin-top: 8px; }
.pl.compact .pl-masquees { flex: 1 1 100%; }
.pl.compact .pl-btn-masquees { width: 100%; }
.pl.compact .pl-masquees-liste { position: static; width: auto; min-width: 0; max-width: none; max-height: none; margin-top: 8px; box-shadow: none; animation: none; }

/* ———— la vue Équipe */
.pl-grille-e { --n: 28; display: grid; grid-template-columns: var(--pl-nom) repeat(var(--n), var(--pl-col)); grid-auto-rows: var(--pl-ligne);
  width: max-content; min-width: 100%; position: relative; }
.pl-defile { overflow: auto; max-height: min(74vh, 900px); border: 1px solid var(--pl-filet); border-radius: var(--pl-rayon); background: var(--pl-fond);
  overscroll-behavior: contain; scrollbar-width: thin; -webkit-overflow-scrolling: touch; }
.pl-e-coin { position: sticky; left: 0; top: 0; z-index: 6; grid-row: 1 / span 2; grid-column: 1; background: var(--pl-fond);
  border-right: 1px solid var(--pl-filet); border-bottom: 1px solid var(--pl-filet); display: flex; align-items: flex-end; padding: 8px 10px; font-size: .78rem; color: var(--pl-sourd); }
.pl-e-mois { position: sticky; top: 0; z-index: 4; grid-row: 1; height: 26px; background: var(--pl-fond); border-left: 1px solid var(--pl-filet);
  font-size: .78rem; font-weight: 700; text-transform: capitalize; letter-spacing: .02em; color: var(--pl-sourd); overflow: hidden; overflow: clip; }
.pl-e-mois span { position: sticky; left: calc(var(--pl-nom) + 6px); display: inline-block; padding: 5px 6px 0; white-space: nowrap; }
.pl-e-jour { position: sticky; top: 26px; z-index: 4; grid-row: 2; background: var(--pl-fond); border-bottom: 1px solid var(--pl-filet); }
.pl-e-jour button { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; width: 100%; height: 100%; padding: 0; border: 0;
  background: transparent; font-size: .7rem; color: var(--pl-sourd); cursor: pointer; }
.pl-e-jour b { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; font-size: .82rem; color: var(--pl-texte); font-weight: 650; }
.pl-e-jour.we { background: color-mix(in srgb, var(--pl-texte) 4%, var(--pl-fond)); }
.pl-e-jour.lundi, .pl-e-c.lundi { border-left: 1px solid var(--pl-filet); }
.pl-e-jour.auj b { background: var(--pl-accent); color: var(--sur-action, var(--pl-fond)); }
.pl-e-jour.choisi b { box-shadow: 0 0 0 2px var(--pl-accent); }
.pl-e-nom { position: sticky; left: 0; z-index: 3; grid-column: 1; display: flex; align-items: center; gap: 8px; padding: 0 8px 0 10px; min-width: 0;
  background: var(--pl-fond); border-right: 1px solid var(--pl-filet); border-bottom: 1px solid color-mix(in srgb, var(--pl-filet) 60%, transparent); font-size: .86rem; }
.pl-e-nom .n { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.15; }
.pl-e-nom .n small { display: block; font-size: .72rem; color: var(--pl-sourd); overflow: hidden; text-overflow: ellipsis; }
.pl-e-nom.moi { background: color-mix(in srgb, var(--pl-accent) 7%, var(--pl-fond)); font-weight: 650; }
.pl-e-nom.moi .n small { color: var(--pl-accent); font-weight: 600; }
/* « Masquer » sur la ligne d'une personne : au survol, d'un toucher sur le nom, au clavier */
.pl-e-nom .pl-masquer { position: absolute; z-index: 1; right: 5px; top: 50%; width: 30px; height: 30px; margin-top: -15px; padding: 0; display: grid; place-items: center;
  border-radius: 50%; border: 1px solid var(--pl-filet); background: var(--pl-fond); color: var(--pl-sourd); cursor: pointer; opacity: 0; pointer-events: none;
  box-shadow: -8px 0 8px -2px var(--pl-fond); transition: opacity .15s, background .15s, color .15s; }
.pl-e-nom.moi .pl-masquer { background: color-mix(in srgb, var(--pl-accent) 7%, var(--pl-fond)); box-shadow: -8px 0 8px -2px color-mix(in srgb, var(--pl-accent) 7%, var(--pl-fond)); }
.pl-e-nom .pl-masquer svg { width: 16px; height: 16px; }
.pl-e-nom:hover .pl-masquer, .pl-e-nom.montre .pl-masquer, .pl-e-nom .pl-masquer:focus-visible { opacity: 1; pointer-events: auto; }
.pl-e-nom .pl-masquer:hover { color: var(--pl-texte); background: color-mix(in srgb, var(--pl-accent) 10%, var(--pl-fond)); }
.pl-e-nom .pl-masquer:focus-visible { outline: 2px solid var(--pl-accent); outline-offset: 1px; }
.pl-e-c { position: relative; border-bottom: 1px solid color-mix(in srgb, var(--pl-filet) 60%, transparent); cursor: pointer; outline: none; }
.pl-e-c.we { background: var(--pl-we); }
.pl-e-c.auj { background: color-mix(in srgb, var(--pl-accent) 6%, transparent); }
.pl-e-c.moi { background-color: color-mix(in srgb, var(--pl-accent) 3%, transparent); }
.pl-e-c:hover { background: color-mix(in srgb, var(--pl-accent) 9%, transparent); }
.pl-e-c:focus-visible, .pl-e-c.choisi { box-shadow: inset 0 0 0 2px var(--pl-accent); z-index: 5; }
.pl-e-c:focus-visible { box-shadow: inset 0 0 0 3px var(--pl-accent); }
.pl-o { pointer-events: none; position: relative; z-index: 1; margin: 3px 1px; border-radius: 6px; min-width: 0; }
.pl-o-i { margin: 0; border-radius: 0; background: repeating-linear-gradient(135deg, var(--pl-hachure) 0 1.5px, transparent 1.5px 5px); }
.pl-o-i.moi { background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--pl-accent) 80%, transparent) 0 1.5px, transparent 1.5px 5px), color-mix(in srgb, var(--pl-accent) 12%, transparent); }
.pl-o-i.partiel { margin: 0 3px; align-self: end; height: 45%; border-radius: 5px 5px 0 0; }
.pl-o-i span { position: absolute; left: 4px; right: 4px; top: 2px; font-size: .66rem; font-weight: 650; color: var(--pl-texte); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  text-shadow: 0 0 2px var(--pl-fond), 0 0 2px var(--pl-fond); }
.pl-o-b { z-index: 2; align-self: center; height: 20px; margin: 0 2px; border-radius: 6px; background: var(--b-fond); color: var(--b-texte); font-size: .7rem; font-weight: 650;
  line-height: 20px; padding: 0 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 1px 2px rgba(0,0,0,.15); }
.pl-o-b.option { background: repeating-linear-gradient(135deg, var(--b-fond) 0 6px, color-mix(in srgb, var(--b-fond) 75%, var(--pl-fond)) 6px 10px); }
.pl-o-b.coupe-avant { border-top-left-radius: 0; border-bottom-left-radius: 0; margin-left: 0; }
.pl-o-b.coupe-apres { border-top-right-radius: 0; border-bottom-right-radius: 0; margin-right: 0; }
.pl-o-p { z-index: 3; margin: 2px 1px; border: 2px dashed var(--pl-accent); border-radius: 8px; }
.pl-o-r { z-index: 4; align-self: start; justify-self: end; margin: 2px 2px 0 0; width: 16px; height: 16px; border-radius: 50%; display: grid; place-items: center;
  font-size: .62rem; font-weight: 800; line-height: 1; background: var(--pl-fond); color: var(--pl-sourd); border: 1.5px solid currentColor; }
.pl-o-r.oui { color: var(--pl-ok); } .pl-o-r.non { color: var(--pl-alerte); } .pl-o-r.peut_etre { color: var(--option, #7a5a10); }
.pl-o-x { z-index: 4; align-self: end; justify-self: start; margin: 0 0 2px 2px; width: 15px; height: 15px; border-radius: 50%; background: var(--pl-alerte);
  color: var(--pl-fond); font-size: .62rem; font-weight: 800; display: grid; place-items: center; box-shadow: 0 0 0 2px var(--pl-fond); }
.pl-vide { padding: 22px 14px; text-align: center; color: var(--pl-sourd); }

/* ———— la vue Mois */
.pl-mois-grille { border: 1px solid var(--pl-filet); border-radius: var(--pl-rayon); background: var(--pl-fond); overflow: hidden; }
.pl-m-tete { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); border-bottom: 1px solid var(--pl-filet); }
.pl-m-tete span { padding: 7px 8px; font-size: .74rem; font-weight: 700; color: var(--pl-sourd); text-transform: uppercase; letter-spacing: .06em; }
.pl-m-semaine { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); grid-template-rows: 1fr; position: relative; border-bottom: 1px solid var(--pl-filet); }
.pl-m-semaine:last-child { border-bottom: 0; }
.pl-m-c { grid-row: 1; position: relative; min-height: calc(58px + var(--voies, 0) * 23px); padding: 4px 6px 6px; border-left: 1px solid color-mix(in srgb, var(--pl-filet) 70%, transparent);
  cursor: pointer; outline: none; display: flex; flex-direction: column; min-width: 0; }
.pl-m-c:first-child { border-left: 0; }
.pl-m-c.we { background: var(--pl-we); }
.pl-m-c.hors { background: color-mix(in srgb, var(--pl-texte) 3%, transparent); }
.pl-m-c.hors .pl-m-num { color: color-mix(in srgb, var(--pl-sourd) 70%, transparent); }
.pl-m-c.moi-i::before { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--pl-accent) 55%, transparent) 0 1.5px, transparent 1.5px 6px), color-mix(in srgb, var(--pl-accent) 7%, transparent); }
.pl-m-c.moi-i.partiel::before { top: auto; height: 40%; }
.pl-m-c:hover { background-color: color-mix(in srgb, var(--pl-accent) 6%, transparent); }
.pl-m-c.choisi { box-shadow: inset 0 0 0 2px var(--pl-accent); z-index: 3; }
.pl-m-c:focus-visible { box-shadow: inset 0 0 0 3px var(--pl-accent); z-index: 3; }
.pl-m-num { position: relative; z-index: 1; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; font-size: .86rem; font-weight: 650; }
.pl-m-c.auj .pl-m-num { background: var(--pl-accent); color: var(--sur-action, var(--pl-fond)); }
.pl-m-gens { position: relative; z-index: 1; margin-top: auto; display: flex; align-items: center; min-height: 22px; padding-top: 2px; }
.pl-m-gens .pl-av { width: 22px; height: 22px; font-size: .58rem; margin-left: -6px; box-shadow: 0 0 0 2px var(--pl-fond); }
.pl-m-gens .pl-av:first-child { margin-left: 0; }
.pl-m-gens em { margin-left: 4px; font-style: normal; font-size: .72rem; font-weight: 650; color: var(--pl-sourd); }
.pl-m-x { position: absolute; z-index: 2; top: 6px; right: 6px; width: 16px; height: 16px; border-radius: 50%; background: var(--pl-alerte); color: var(--pl-fond); font-size: .62rem; font-weight: 800; display: grid; place-items: center; }
.pl.compact .pl-m-x { top: 3px; right: 3px; width: 9px; height: 9px; font-size: 0; box-shadow: 0 0 0 2px var(--pl-fond); }
.pl-m-barre { grid-row: 1; z-index: 2; pointer-events: none; align-self: start; height: 20px; margin: calc(32px + var(--voie) * 23px) 3px 0; border-radius: 6px; padding: 0 6px;
  font-size: .72rem; font-weight: 650; line-height: 20px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: var(--b-fond); color: var(--b-texte); }
.pl-m-barre.option { background: repeating-linear-gradient(135deg, var(--b-fond) 0 6px, color-mix(in srgb, var(--b-fond) 75%, var(--pl-fond)) 6px 10px); }
.pl-m-barre.prop { background: color-mix(in srgb, var(--pl-accent) 8%, var(--pl-fond)); color: var(--pl-texte); border: 2px dashed var(--pl-accent); line-height: 16px; }
.pl-m-barre.prop.close { opacity: .55; }
.pl-m-barre.coupe-avant { border-top-left-radius: 0; border-bottom-left-radius: 0; margin-left: 0; }
.pl-m-barre.coupe-apres { border-top-right-radius: 0; border-bottom-right-radius: 0; margin-right: 0; }
.pl-m-plus { grid-row: 1; z-index: 2; pointer-events: none; align-self: start; margin: calc(32px + var(--voie) * 23px) 6px 0; font-size: .7rem; font-weight: 650; color: var(--pl-sourd); }
.pl-m-points { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 3px; margin-top: 3px; }
.pl-m-points i { width: 7px; height: 7px; border-radius: 50%; background: var(--b-fond); }
.pl-m-points i.prop { background: transparent; border: 1.5px dashed var(--pl-accent); width: 9px; height: 9px; }
.pl-m-compte { position: relative; z-index: 1; margin-top: auto; font-size: .68rem; font-weight: 700; color: var(--pl-sourd); display: inline-flex; align-items: center; gap: 2px; }
.pl-m-compte svg { width: 11px; height: 11px; }
.pl-apreciser { margin: 0 0 10px; font-size: .85rem; color: var(--pl-sourd); }
.pl-mise { display: grid; gap: 14px; }
@media (min-width: 900px) { .pl[data-vue="mois"]:not(.compact) .pl-mise { grid-template-columns: minmax(0, 1fr) 300px; align-items: start; } }
.pl.compact .pl-m-c { min-height: 54px; padding: 3px 3px 4px; align-items: center; }
.pl.compact .pl-m-num { width: 24px; height: 24px; font-size: .8rem; }
.pl.compact .pl-m-tete span { padding: 6px 0; text-align: center; font-size: .68rem; }

/* ———— le détail du jour choisi */
.pl-detail { padding: 14px 16px; border-radius: var(--pl-rayon); background: var(--pl-fond); border: 1px solid var(--pl-filet); }
.pl[data-vue="equipe"] .pl-detail { margin-top: 12px; }
.pl-detail h3 { margin: 0 0 8px; font-size: 1rem; line-height: 1.3; }
.pl-detail h3 small { display: block; font-size: .78rem; font-weight: 600; color: var(--pl-sourd); text-transform: none; }
.pl-detail ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.pl-detail li { display: flex; gap: 10px; align-items: flex-start; font-size: .9rem; line-height: 1.35; }
.pl-detail li .pl-pastille { flex: none; width: 12px; height: 12px; margin-top: 4px; border-radius: 4px; background: var(--b-fond); }
.pl-detail li .pl-pastille.hach { background: repeating-linear-gradient(135deg, var(--pl-hachure) 0 1.5px, transparent 1.5px 4px); border: 1px solid var(--pl-filet); }
.pl-detail li .pl-pastille.hach.moi { background: repeating-linear-gradient(135deg, var(--pl-accent) 0 1.5px, transparent 1.5px 4px), var(--pl-doux); border: 0; }
.pl-detail li .pl-pastille.prop { background: transparent; border: 2px dashed var(--pl-accent); }
.pl-detail li .pl-pastille.conflit { background: var(--pl-alerte); border-radius: 50%; }
.pl-detail li small { display: block; color: var(--pl-sourd); font-size: .8rem; }
.pl-detail .pl-gens { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.pl-detail .pl-gens span.g { display: inline-flex; align-items: center; gap: 5px; font-size: .8rem; padding: 2px 8px 2px 2px; border-radius: 999px; background: color-mix(in srgb, var(--pl-texte) 6%, var(--pl-fond)); }
.pl-detail .pl-gens .pl-av { width: 20px; height: 20px; font-size: .55rem; }
.pl-detail .pl-rien { color: var(--pl-sourd); font-size: .9rem; margin: 0; }
.pl-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.pl-detail.feuille { position: fixed; z-index: 60; left: 8px; right: 8px; bottom: calc(var(--pl-bas, 0px) + 8px); max-height: 55vh; overflow: auto; margin: 0;
  padding-top: 16px; box-shadow: 0 -4px 30px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.12); animation: pl-monte .26s var(--pl-courbe); }
.pl-detail.feuille h3 { padding-right: 44px; }
.pl-fermer { position: absolute; top: 8px; right: 8px; width: 36px; min-height: 36px; }
@keyframes pl-monte { from { transform: translateY(24px); opacity: 0; } }
.pl-attention { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; justify-content: space-between; margin: 0 0 10px; padding: 8px 12px; border-radius: 10px; font-size: .88rem;
  background: color-mix(in srgb, var(--option, #7a5a10) 10%, var(--pl-fond)); border: 1px solid color-mix(in srgb, var(--option, #7a5a10) 30%, transparent); }
.pl-av { position: relative; display: inline-grid; place-items: center; flex: none; width: 26px; height: 26px; border-radius: 50%; overflow: hidden; font-size: .64rem; font-weight: 750; letter-spacing: .02em;
  color: var(--pl-texte); background: color-mix(in srgb, var(--pl-accent) 16%, var(--pl-fond)); }
.pl-av img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.pl-av-1 { background: color-mix(in srgb, #2f6f9f 22%, var(--pl-fond)); } .pl-av-2 { background: color-mix(in srgb, #c27a1a 24%, var(--pl-fond)); }
.pl-av-3 { background: color-mix(in srgb, #3d7d5a 22%, var(--pl-fond)); } .pl-av-4 { background: color-mix(in srgb, #6b4fa0 22%, var(--pl-fond)); }
.pl-av-5 { background: color-mix(in srgb, #1f7a7a 22%, var(--pl-fond)); }
@media (max-width: 640px) { .pl { --pl-nom: 118px; --pl-col: 34px; --pl-ligne: 40px; } .pl-e-nom .pl-av { display: none; } .pl-e-nom { padding-left: 8px; } }
@media (prefers-reduced-motion: no-preference) { .pl.pl-premier .pl-e-jour.auj b { animation: pl-auj .6s cubic-bezier(.3, 1.6, .5, 1) both; } @keyframes pl-auj { from { transform: scale(.4); } } }   /* au premier dessin, aujourd'hui se pose */
@media (prefers-reduced-motion: reduce) { .pl *, .pl *::before, .pl *::after { transition: none !important; animation: none !important; } }
`;
  function poserCss() {
    if (typeof document === 'undefined' || document.getElementById('planning-css')) return;
    const s = document.createElement('style');
    s.id = 'planning-css';
    s.textContent = CSS;
    (document.head || document.documentElement).prepend(s);
  }

  // ================================================================================================ les icônes
  const IC = {
    avant: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    apres: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    ici: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none"/></svg>',
    fermer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
    masquer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.6 5.1A9.9 9.9 0 0 1 12 5c5.4 0 8.8 4.6 9.8 6.4a1.3 1.3 0 0 1 0 1.2 15.5 15.5 0 0 1-2.4 3.2M6.6 6.6C4.4 8 2.9 10.2 2.2 11.4a1.3 1.3 0 0 0 0 1.2C3.2 14.4 6.6 19 12 19a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>',
    gens: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/></svg>',
  };

  // ================================================================================================ le planning
  function monter(racine, options = {}) {
    if (!racine) throw new Error('PLANNING.monter : il faut un élément');
    poserCss();
    const O = options;
    // les groupes de personnes (« Mes projets »), et les personnes masquées (l'administration)
    const GROUPES = (Array.isArray(O.groupes) ? O.groupes : []).filter(g => g && g.id != null && txt(g.libelle))
      .map(g => ({ id: String(g.id), libelle: txt(g.libelle), personnes: new Set((g.personnes || []).map(String)), spectacles: new Set((g.spectacles || []).map(String)) }));
    const groupeDe = id => (id != null ? GROUPES.find(g => g.id === String(id)) || null : null);
    const VALEUR_GROUPE = 'groupe:';
    const S = {
      vue: O.vue === 'mois' ? 'mois' : 'equipe',
      jour: estJour(O.jour) ? O.jour : (estJour(O.aujourdhui) ? O.aujourdhui : aujourdhuiParis()),
      semaines: [4, 6, 8].includes(+O.semaines) ? +O.semaines : 6,
      filtre: { spectacle: O.filtre && O.filtre.spectacle != null ? O.filtre.spectacle : null, personne: O.filtre && O.filtre.personne != null ? O.filtre.personne : null,
        groupe: O.filtre && groupeDe(O.filtre.groupe) ? String(O.filtre.groupe) : null },
      masques: new Set((Array.isArray(O.masques) ? O.masques : []).map(String)), masqueesOuvertes: false,
      D: O.donnees || null, plage: null, erreur: null, charge: 0, selection: null, sens: 0, detruit: false,
    };
    const auj = () => (estJour(O.aujourdhui) ? O.aujourdhui : aujourdhuiParis());
    // masquer des personnes : l'administration seulement (les données le disent)
    const peutMasquer = () => !!O.masquer && !!(S.D && S.D.admin);
    if (S.D) S.plage = periode(S.vue, S.jour, S.semaines);
    racine.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'pl';
    el.dataset.vue = S.vue;
    racine.appendChild(el);
    // ce qui change sans se voir à l'endroit du focus (une personne masquée, affichée de nouveau) : dit aux lecteurs d'écran
    const annonce = document.createElement('p');
    annonce.className = 'pl-annonce';
    annonce.setAttribute('role', 'status');
    racine.appendChild(annonce);
    let minuteur = null;
    const dire = t => { annonce.textContent = ''; clearTimeout(minuteur); minuteur = setTimeout(() => { annonce.textContent = t; }, 60); };
    const mq = typeof matchMedia === 'function' ? matchMedia('(max-width: 640px)') : null;
    const sombre = () => { const c = rgb(getComputedStyle(el).getPropertyValue('--pl-fond')) || rgb(getComputedStyle(el).backgroundColor); return c ? lum(c) < 0.25 : false; };
    let teintes = new Map();
    const teinteDe = sp => {
      const k = `${sp && sp.id}|${sp && sp.couleur}`;
      let t = teintes.get(k);
      if (!t) teintes.set(k, t = teinte(sp && sp.couleur, sp ? sp.slug || sp.id : 'x', S.sombre));
      return t;
    };
    const styleB = sp => { const t = teinteDe(sp); return `--b-fond:${t.fond};--b-texte:${t.texte}`; };

    // ———— la barre d'outils
    function barre(I) {
      if (O.outils === false) return '';
      const { de, a } = periode(S.vue, S.jour, S.semaines);
      const annee = S.compact && a.slice(0, 4) === auj().slice(0, 4) ? '' : ` ${a.slice(0, 4)}`;
      const titre = S.vue === 'mois' ? maj(moisTexte(S.jour))
        : de.slice(0, 7) === a.slice(0, 7) ? maj(moisTexte(de))
        : `${jourTexte(de)} ${MOIS_COURTS[+de.slice(5, 7) - 1]}${de.slice(0, 4) !== a.slice(0, 4) ? ` ${de.slice(0, 4)}` : ''} – ${jourTexte(a)} ${MOIS_COURTS[+a.slice(5, 7) - 1]}${annee}`;
      const gens = ordonnerPersonnes(S.D || {});
      // le groupe compte quand la liste des personnes le montre (une personne choisie l'emporte) ; les personnes masquées
      // comptent pour un filtre : leur bouton est dans la barre des filtres
      const grp = S.filtre.personne == null ? groupeDe(S.filtre.groupe) : null;
      const masquees = peutMasquer() ? gens.filter(p => S.masques.has(String(p.id))) : [];
      const actifs = (S.filtre.spectacle != null) + (S.filtre.personne != null) + !!grp + (masquees.length > 0);
      const unite = S.vue === 'mois' ? 'Mois' : `${S.semaines} semaines`;
      const sps = new Map();
      for (const x of O.spectacles || []) sps.set(String(x.id), x);
      for (const d of (S.D && S.D.dates) || []) if (d.spectacle && !sps.has(String(d.spectacle.id))) sps.set(String(d.spectacle.id), d.spectacle);
      const qui = S.filtre.personne != null ? 'une personne' : S.filtre.spectacle != null ? 'une distribution' : grp ? grp.libelle[0].toLowerCase() + grp.libelle.slice(1) : 'toute l’équipe';
      const choix = S.filtre.personne != null ? String(S.filtre.personne) : grp ? VALEUR_GROUPE + grp.id : '';
      return `<div class="pl-barre">
        <div class="pl-nav">
          <button type="button" class="pl-btn rond" data-pl="avant" aria-label="${S.vue === 'mois' ? 'Mois précédent' : 'Quatre semaines plus tôt'}">${IC.avant}</button>
          <h2 class="pl-titre" id="${S.id}-titre" aria-live="polite">${esc(titre)}${S.compact ? '' : `<small>${esc(S.vue === 'mois' ? 'Le mois' : `${S.semaines} semaines, ${qui}`)}</small>`}</h2>
          <button type="button" class="pl-btn rond" data-pl="apres" aria-label="${S.vue === 'mois' ? 'Mois suivant' : 'Quatre semaines plus tard'}">${IC.apres}</button>
          ${S.compact ? `<button type="button" class="pl-btn rond" data-pl="ici" aria-label="Aujourd’hui" title="Aujourd’hui">${IC.ici}</button>` : '<button type="button" class="pl-btn" data-pl="ici">Aujourd’hui</button>'}
        </div>
        <div class="pl-vues" role="group" aria-label="Vue du planning">
          <button type="button" data-pl-vue="equipe" aria-pressed="${S.vue === 'equipe'}">Équipe</button>
          <button type="button" data-pl-vue="mois" aria-pressed="${S.vue === 'mois'}">Mois</button>
        </div>
        ${S.compact ? `<button type="button" class="pl-btn pl-btn-filtres" data-pl="filtres" aria-expanded="${!!S.filtresOuverts}" aria-controls="${S.id}-filtres">Filtres${actifs ? ` (${actifs})` : ''}</button>` : ''}
        <div class="pl-filtres" id="${S.id}-filtres"${S.compact && !S.filtresOuverts ? ' hidden' : ''}>
          ${sps.size > 1 || S.filtre.spectacle != null ? `<label><span class="pl-sr">Spectacle</span><select data-pl-filtre="spectacle"><option value="">Tous les spectacles</option>${[...sps.values()].sort((x, y) => txt(x.titre).localeCompare(txt(y.titre), 'fr')).map(x => `<option value="${esc(x.id)}"${memeId(x.id, S.filtre.spectacle) ? ' selected' : ''}>${esc(x.titre)}</option>`).join('')}</select></label>` : ''}
          ${gens.length > 1 ? `<label><span class="pl-sr">Personne</span><select data-pl-filtre="personne">${GROUPES.map(g => `<option value="${esc(VALEUR_GROUPE + g.id)}"${choix === VALEUR_GROUPE + g.id ? ' selected' : ''}>${esc(g.libelle)}</option>`).join('')}<option value=""${choix === '' ? ' selected' : ''}>Toute l’équipe</option>${gens.map(p => `<option value="${esc(p.id)}"${memeId(p.id, S.filtre.personne) ? ' selected' : ''}>${esc(nomDe(p))}${memeId(p.id, S.D.moi) ? ' (vous)' : ''}</option>`).join('')}</select></label>` : ''}
          ${masquees.length ? `<div class="pl-masquees"><button type="button" class="pl-btn pl-btn-masquees" data-pl="masquees" aria-expanded="${!!S.masqueesOuvertes}" aria-controls="${S.id}-masquees">${IC.masquer}Masquées (${masquees.length})</button>
            <div class="pl-masquees-liste" id="${S.id}-masquees" role="group" aria-label="Personnes masquées"${S.masqueesOuvertes ? '' : ' hidden'}><ul>${masquees.map(p => `<li>${avatar(p, O.photo)}<span class="n">${esc(nomDe(p))}</span><button type="button" class="pl-btn" data-pl-afficher="${esc(p.id)}" aria-label="Afficher ${esc(nomDe(p))}">Afficher</button></li>`).join('')}</ul>
            <button type="button" class="pl-btn pl-tout" data-pl="tout-afficher">Tout afficher</button></div></div>` : ''}
          ${S.vue === 'equipe' ? `<label><span class="pl-sr">Largeur</span><select data-pl-semaines>${[4, 6, 8].map(n => `<option value="${n}"${n === S.semaines ? ' selected' : ''}>${n} semaines</option>`).join('')}</select></label>` : ''}
        </div>
        <span class="pl-sr">${esc(unite)}</span>
      </div>`;
    }
    function legende() {
      return `<ul class="pl-legende" aria-label="Légende">
        <li><i class="l-indispo"></i>pas libre</li>${S.D && S.D.moi != null ? '<li><i class="l-moi"></i>vous, pas libre</li>' : ''}
        <li><i class="l-date"></i>date de la compagnie</li><li><i class="l-prop"></i>date proposée</li><li><i class="l-conflit"></i>conflit</li></ul>`;
    }

    // ———— ce qu'il y a un jour (et pour une personne)
    function selection(I, jour, personne) {
      const p = personne != null ? String(personne) : null;
      const J = I.J.get(jour) || { dates: [], indispos: [], props: [], conflits: [] };
      const PJ = p ? I.PJ.get(`${p}|${jour}`) || { indispos: [], dates: [], props: [], conflit: null } : null;
      return {
        jour, personne: p ? I.P.get(p) || null : null, moi: S.D ? S.D.moi : null, admin: !!(S.D && S.D.admin),
        dates: PJ ? PJ.dates : J.dates,
        indisponibilites: (PJ ? PJ.indispos : J.indispos).map(x => ({ ...x.i, jours: x.u })),
        propositions: PJ ? PJ.props : J.props.map(x => ({ ...x, reponse: null })),
        conflits: PJ ? (PJ.conflit ? [PJ.conflit] : []) : J.conflits,
      };
    }
    // le texte d'une case, pour les lecteurs d'écran
    function etiquette(I, jour, personne) {
      const s = selection(I, jour, personne);
      const morceaux = [];
      if (personne != null) {
        const ind = s.indisponibilites;
        if (ind.length) morceaux.push(`pas libre${ind.some(x => x.jours.entier) ? '' : ` ${ind.map(x => partiel(x.jours)).join(', ')}`}${ind.map(x => x.motif).filter(Boolean).length ? ` (${ind.map(x => x.motif).filter(Boolean).join(', ')})` : ''}`);
        else morceaux.push('libre');
        for (const d of s.dates) morceaux.push(`part : ${nomDate(d)}`);
        for (const x of s.propositions) morceaux.push(`proposition « ${txt(x.proposition.titre)} »${x.reponse ? ` : ${REPONSES[x.reponse]}` : ' : sans réponse'}`);
        if (s.conflits.length) morceaux.push('conflit');
      } else {
        for (const d of s.dates) morceaux.push(nomDate(d));
        const gens = [...new Set(s.indisponibilites.map(x => String(x.personne_id)))];
        if (gens.length) morceaux.push(`pas ${gens.length > 1 ? 'libres' : 'libre'} : ${gens.map(id => nomDe(I.P.get(id))).join(', ')}`);
        const props = [...new Map(s.propositions.map(x => [x.proposition.id, x.proposition])).values()];
        for (const x of props) morceaux.push(`proposition « ${txt(x.titre)} »`);
        if (s.conflits.length) morceaux.push(pluriel(s.conflits.length, 'conflit'));
        if (!morceaux.length) morceaux.push('rien de prévu');
      }
      return `${jourLong(jour)}${jour === auj() ? ', aujourd’hui' : ''} : ${morceaux.join(' ; ')}`;
    }

    // ———— la vue Équipe
    function vueEquipe(I) {
      const { de, a } = periode('equipe', S.jour, S.semaines);
      const n = ecart(de, a) + 1, jours = Array.from({ length: n }, (_, i) => jourPlus(de, i)), A = auj();
      const col = j => ecart(de, j) + 2;           // la colonne d'un jour (la 1re est celle des noms)
      const dans = j => j >= de && j <= a;
      const html = [];
      html.push(`<div class="pl-e-coin" aria-hidden="true">${I.personnes.length ? pluriel(I.personnes.length, 'personne') : ''}</div>`);
      // les mois
      let m0 = 0;
      jours.forEach((j, i) => {
        if (i === n - 1 || jours[i + 1].slice(0, 7) !== j.slice(0, 7)) {
          html.push(`<div class="pl-e-mois" style="grid-column:${m0 + 2} / span ${i - m0 + 1}" aria-hidden="true"><span>${esc(moisTexte(j))}</span></div>`);
          m0 = i + 1;
        }
      });
      // les jours (en-têtes de colonnes)
      html.push('<div role="row" style="display:contents">');
      html.push('<span role="columnheader" class="pl-sr">Personne</span>');
      for (const j of jours) {
        const r = rang(j), cl = ['pl-e-jour', r >= 5 && 'we', r === 0 && 'lundi', j === A && 'auj', S.selection && S.selection.jour === j && 'choisi'].filter(Boolean).join(' ');
        html.push(`<div role="columnheader" class="${cl}" style="grid-column:${col(j)}"><button type="button" data-pl-jour="${j}" tabindex="-1" aria-label="${esc(jourLong(j))}${j === A ? ', aujourd’hui' : ''}"><span aria-hidden="true">${INITIALES[r]}</span><b aria-hidden="true">${nombreJour(j)}</b></button></div>`);
      }
      html.push('</div>');
      if (!I.personnes.length) {
        html.push(`<div class="pl-vide" style="grid-column:1 / -1">Personne à montrer avec ce filtre.</div>`);
        return { html: html.join(''), n };
      }
      const masquer = peutMasquer();
      I.personnes.forEach((p, k) => {
        const row = k + 3, id = String(p.id), moi = memeId(p.id, I.moi);
        const sous = moi ? 'vous' : p.metiers && p.metiers.length ? p.metiers.join(', ') : '';
        // « Masquer » sur la ligne (pas pour une personne déjà masquée, montrée parce qu'on l'a choisie) ; le nom de la ligne
        // reste celui de la personne, sans le bouton
        const bouton = masquer && !S.masques.has(id) ? `<button type="button" class="pl-masquer" data-pl-masquer="${esc(id)}" tabindex="-1" aria-label="Masquer ${esc(nomDe(p))} du planning" title="Masquer du planning">${IC.masquer}</button>` : '';
        html.push(`<div role="row" style="display:contents">`);
        html.push(`<div role="rowheader" class="pl-e-nom${moi ? ' moi' : ''}" style="grid-row:${row}"${bouton ? ` aria-label="${esc([nomDe(p), sous].filter(Boolean).join(', '))}"` : ''}>${avatar(p, O.photo)}<span class="n">${esc(nomDe(p))}${sous ? `<small>${esc(sous)}</small>` : ''}</span>${bouton}</div>`);
        for (const j of jours) {
          const r = rang(j), choisi = S.selection && S.selection.jour === j && memeId(S.selection.personne, p.id);
          const cl = ['pl-e-c', r >= 5 && 'we', r === 0 && 'lundi', j === A && 'auj', moi && 'moi', choisi && 'choisi'].filter(Boolean).join(' ');
          html.push(`<div role="gridcell" class="${cl}" style="grid-row:${row};grid-column:${col(j)}" data-pl-jour="${j}" data-pl-p="${esc(id)}" tabindex="-1" aria-selected="${choisi ? 'true' : 'false'}" aria-label="${esc(nomDe(p))}, ${esc(etiquette(I, j, id))}"></div>`);
        }
        html.push('</div>');
        // les indisponibilités : des hachures (une seule bande pour des journées qui se suivent)
        const ind = (S.D.indisponibilites || []).filter(i => memeId(i.personne_id, p.id));
        for (const i of ind) {
          const js = joursDe(i).filter(u => dans(u.jour));
          let deb = null, prec = null;
          const fermer = () => { if (deb) { const span = ecart(deb, prec) + 1; html.push(`<div class="pl-o pl-o-i${moi ? ' moi' : ''}" style="grid-row:${row};grid-column:${col(deb)} / span ${span}" aria-hidden="true">${i.motif && span >= 2 ? `<span>${esc(i.motif)}</span>` : ''}</div>`); } deb = null; };
          for (const u of js) {
            if (!u.entier) { fermer(); html.push(`<div class="pl-o pl-o-i partiel${moi ? ' moi' : ''}" style="grid-row:${row};grid-column:${col(u.jour)}" aria-hidden="true" title="${esc(partiel(u))}"></div>`); continue; }
            if (deb && prec && jourPlus(prec, 1) === u.jour) prec = u.jour; else { fermer(); deb = u.jour; prec = u.jour; }
          }
          fermer();
        }
        // les dates où la personne part : des bandes de couleur
        for (const d of I.dates) {
          if (!(d.equipe || []).some(x => memeId(x, p.id))) continue;
          const js = joursDate(d), j0 = js.find(dans), j1 = [...js].reverse().find(dans);
          if (!j0) continue;
          const span = ecart(j0, j1) + 1;
          const cl = ['pl-o', 'pl-o-b', d.statut === 'option' && 'option', js[0] < de && 'coupe-avant', js[js.length - 1] > a && 'coupe-apres'].filter(Boolean).join(' ');
          html.push(`<div class="${cl}" style="grid-row:${row};grid-column:${col(j0)} / span ${span};${styleB(d.spectacle)}" aria-hidden="true">${span >= 2 ? esc(txt(d.spectacle && d.spectacle.titre)) : esc(txt(d.spectacle && d.spectacle.titre).slice(0, 1))}</div>`);
        }
        // les propositions : en pointillé, et la réponse de chaque jour
        for (const [k2, v] of I.PJ) {
          if (!k2.startsWith(id + '|')) continue;
          const j = k2.slice(id.length + 1);
          if (!dans(j)) continue;
          for (const x of v.props) {
            html.push(`<div class="pl-o pl-o-p" style="grid-row:${row};grid-column:${col(j)}" aria-hidden="true"></div>`);
            html.push(`<div class="pl-o pl-o-r ${x.reponse || 'attente'}" style="grid-row:${row};grid-column:${col(j)}" aria-hidden="true">${x.reponse ? SIGNES[x.reponse] : '…'}</div>`);
          }
          if (v.conflit) html.push(`<div class="pl-o pl-o-x" style="grid-row:${row};grid-column:${col(j)}" aria-hidden="true" title="Conflit">!</div>`);
        }
      });
      return { html: html.join(''), n };
    }

    // ———— la vue Mois
    function vueMois(I) {
      const { de, a } = periode('mois', S.jour);
      const mois = S.jour.slice(0, 7), A = auj(), compact = S.compact;
      const semaines = [];
      for (let j = de; j <= a; j = jourPlus(j, 7)) semaines.push(j);
      const out = [`<div class="pl-m-tete" role="row">${JOURS_COURTS.map((x, i) => `<span role="columnheader" aria-label="${JOURS[(i + 1) % 7]}">${compact ? INITIALES[i] : x}</span>`).join('')}</div>`];
      for (const l of semaines) {
        const jours = Array.from({ length: 7 }, (_, i) => jourPlus(l, i)), fin = jours[6];
        // les barres de la semaine : dates puis propositions, rangées en voies
        const barres = [];
        if (!compact) {
          for (const d of I.dates) {
            const js = joursDate(d).filter(j => j >= l && j <= fin);
            if (js.length) barres.push({ type: 'date', d, deb: js[0], fin: js[js.length - 1], avant: joursDate(d)[0] < l, apres: joursDate(d).slice(-1)[0] > fin });
          }
          const vues = new Set();
          for (const j of jours) for (const x of (I.J.get(j) || { props: [] }).props) {
            const k = `${x.proposition.id}|${x.jour.id}`;
            if (vues.has(k)) continue;
            vues.add(k);
            const js = joursDe(x.jour).map(u => u.jour).filter(z => z >= l && z <= fin);
            if (js.length) barres.push({ type: 'prop', x, deb: js[0], fin: js[js.length - 1] });
          }
          barres.sort((x, y) => (x.deb < y.deb ? -1 : x.deb > y.deb ? 1 : ecart(y.deb, y.fin) - ecart(x.deb, x.fin)));
          const voies = [];
          for (const b of barres) {
            let v = voies.findIndex(f => f < b.deb);
            if (v < 0) { v = voies.length; voies.push(b.fin); } else voies[v] = b.fin;
            b.voie = v;
          }
        }
        const MAXV = 3, nbVoies = Math.min(MAXV, Math.max(0, ...barres.map(b => b.voie + 1)));
        const html = [`<div class="pl-m-semaine" role="row" style="--voies:${nbVoies}">`];
        jours.forEach((j, i) => {
          const x = I.J.get(j) || { dates: [], indispos: [], props: [], conflits: [] };
          const moiI = x.indispos.filter(y => memeId(y.i.personne_id, I.moi));
          const cl = ['pl-m-c', i >= 5 && 'we', j.slice(0, 7) !== mois && 'hors', j === A && 'auj', moiI.length && 'moi-i', moiI.length && !moiI.some(y => y.u.entier) && 'partiel',
            S.selection && S.selection.jour === j && 'choisi'].filter(Boolean).join(' ');
          const gens = [...new Map(x.indispos.map(y => [String(y.i.personne_id), I.P.get(String(y.i.personne_id))])).values()].filter(Boolean);
          let corps = `<span class="pl-m-num" aria-hidden="true">${nombreJour(j)}</span>`;
          if (compact) {
            const points = [...x.dates.map(d => `<i style="${styleB(d.spectacle)}"></i>`), ...[...new Set(x.props.map(y => y.proposition.id))].map(() => '<i class="prop"></i>')].slice(0, 4).join('');
            if (points) corps += `<span class="pl-m-points" aria-hidden="true">${points}</span>`;
            if (gens.length) corps += `<span class="pl-m-compte" aria-hidden="true">${IC.gens}${gens.length}</span>`;
          } else if (gens.length) {
            corps += `<span class="pl-m-gens" aria-hidden="true">${gens.slice(0, 3).map(p => avatar(p, O.photo)).join('')}${gens.length > 3 ? `<em>+${gens.length - 3}</em>` : `<em>${gens.length === 1 ? '' : gens.length}</em>`}</span>`;
          }
          if (x.conflits.length) corps += `<span class="pl-m-x" aria-hidden="true">!</span>`;
          html.push(`<div role="gridcell" class="${cl}" style="grid-column:${i + 1}" data-pl-jour="${j}" tabindex="-1" aria-selected="${S.selection && S.selection.jour === j ? 'true' : 'false'}" aria-label="${esc(etiquette(I, j, null))}">${corps}</div>`);
        });
        const caches = new Map();
        for (const b of barres) {
          const c0 = rang(b.deb) + 1, span = ecart(b.deb, b.fin) + 1;
          if (b.voie >= MAXV) { for (let j = b.deb; j <= b.fin; j = jourPlus(j, 1)) caches.set(j, (caches.get(j) || 0) + 1); continue; }
          if (b.type === 'date') {
            const d = b.d, cl = ['pl-m-barre', d.statut === 'option' && 'option', b.avant && 'coupe-avant', b.apres && 'coupe-apres'].filter(Boolean).join(' ');
            html.push(`<span class="${cl}" style="grid-column:${c0} / span ${span};--voie:${b.voie};${styleB(d.spectacle)}" aria-hidden="true">${esc(txt(d.spectacle && d.spectacle.titre))}${lieuCourt(d) && span > 1 ? ` · ${esc(lieuCourt(d))}` : ''}</span>`);
          } else {
            html.push(`<span class="pl-m-barre prop${b.x.proposition.statut === 'close' ? ' close' : ''}" style="grid-column:${c0} / span ${span};--voie:${b.voie}" aria-hidden="true">${esc(txt(b.x.proposition.titre))}</span>`);
          }
        }
        for (const [j, nb] of caches) html.push(`<span class="pl-m-plus" style="grid-column:${rang(j) + 1};--voie:${MAXV - 1}" aria-hidden="true">+${nb}</span>`);
        html.push('</div>');
        out.push(html.join(''));
      }
      return out.join('');
    }

    // ———— le détail du jour choisi
    function detail(I) {
      if (!S.selection) {
        if (S.vue !== 'mois' || S.compact) return '';
        return `<section class="pl-detail pl-invite" aria-label="Détail du jour"><h3>Un jour, en détail</h3><p class="pl-rien">Choisissez un jour : qui part, qui n’est pas libre, ce qui est proposé${typeof O.actions === 'function' ? ', et ce que vous pouvez y faire' : ''}.</p></section>`;
      }
      const s = selection(I, S.selection.jour, S.selection.personne);
      const items = [];
      for (const d of s.dates) {
        const gens = (d.equipe || []).map(id => I.P.get(String(id))).filter(Boolean);
        items.push(`<li style="${styleB(d.spectacle)}"><span class="pl-pastille" aria-hidden="true"></span><span><b>${esc(nomDate(d))}</b>${d.lieu && d.lieu.nom ? `<small>${esc(d.lieu.nom)}</small>` : ''}
          ${!s.personne && gens.length ? `<span class="pl-gens">${gens.map(p => `<span class="g">${avatar(p, O.photo)}${esc(nomDe(p))}</span>`).join('')}</span>` : ''}</span></li>`);
      }
      const parPersonne = new Map();
      for (const x of s.indisponibilites) { const k = String(x.personne_id); if (!parPersonne.has(k)) parPersonne.set(k, []); parPersonne.get(k).push(x); }
      for (const [k, xs] of parPersonne) {
        const p = I.P.get(k), moi = memeId(k, I.moi);
        const quand = xs.some(x => x.jours.entier) ? 'toute la journée' : xs.map(x => partiel(x.jours)).join(', ');
        const motifs = xs.map(x => x.motif).filter(Boolean);
        const agenda = xs.some(x => x.source === 'agenda');
        items.push(`<li><span class="pl-pastille hach${moi ? ' moi' : ''}" aria-hidden="true"></span><span><b>${moi ? 'Vous' : esc(nomDe(p))}</b> ${moi ? 'n’êtes' : 'n’est'} pas libre${xs.length ? ` ${esc(quand)}` : ''}
          ${motifs.length || agenda ? `<small>${esc([motifs.join(', '), agenda ? 'd’après son agenda relié' : ''].filter(Boolean).join(' · '))}</small>` : ''}</span></li>`);
      }
      const props = new Map();
      for (const x of s.propositions) { const k = `${x.proposition.id}`; if (!props.has(k)) props.set(k, x); }
      for (const x of props.values()) {
        const p = x.proposition;
        let rep = '';
        if (s.personne) rep = x.reponse ? `${SIGNES[x.reponse]} ${REPONSES[x.reponse]}` : 'pas encore de réponse';
        else {
          const rs = (x.jour.reponses || []);
          const n = r => rs.filter(y => y.reponse === r).length;
          rep = rs.length ? [n('oui') && `${n('oui')} ✓`, n('non') && `${n('non')} ✗`, n('peut_etre') && `${n('peut_etre')} ?`, rs.filter(y => !y.reponse).length && `${rs.filter(y => !y.reponse).length} en attente`].filter(Boolean).join(' · ') : '';
        }
        items.push(`<li><span class="pl-pastille prop" aria-hidden="true"></span><span><b>Proposé : ${esc(txt(p.titre))}</b>${rep ? `<small>${esc(rep)}</small>` : ''}</span></li>`);
      }
      for (const c of s.conflits) {
        const p = I.P.get(String(c.personne_id));
        items.push(`<li><span class="pl-pastille conflit" aria-hidden="true"></span><span><b>Conflit</b> : ${memeId(c.personne_id, I.moi) ? 'vous partez' : `${esc(nomDe(p))} part`} (${esc(txt(c.date.spectacle && c.date.spectacle.titre))}) mais ${memeId(c.personne_id, I.moi) ? 'n’êtes' : 'n’est'} pas libre${c.entier ? '' : ' une partie de la journée'}</span></li>`);
      }
      const acts = typeof O.actions === 'function' ? (O.actions(s) || []).filter(x => x && x.libelle) : [];
      S.actionsCourantes = acts;
      // masquer la personne choisie (l'administration), après les boutons de la page
      const masquer = !!s.personne && S.vue === 'equipe' && peutMasquer() && !S.masques.has(String(s.personne.id));
      const titre = `${maj(jourLong(s.jour, true))}${s.personne ? `<small>${memeId(s.personne.id, I.moi) ? 'Vous' : esc(nomDe(s.personne))}</small>` : ''}`;
      const feuille = O.feuille === true || (O.feuille !== false && S.compact && S.vue === 'equipe');
      return `<section class="pl-detail${feuille ? ' feuille' : ''}" aria-labelledby="${S.id}-detail">${feuille ? `<button type="button" class="pl-btn rond pl-fermer" data-pl="fermer" aria-label="Fermer le détail">${IC.fermer}</button>` : ''}<h3 id="${S.id}-detail" tabindex="-1">${titre}</h3>
        ${items.length ? `<ul>${items.join('')}</ul>` : `<p class="pl-rien">${s.personne ? (memeId(s.personne.id, I.moi) ? 'Vous êtes libre ce jour-là.' : `${esc(nomDe(s.personne))} est libre ce jour-là.`) : 'Rien de prévu, toute l’équipe est libre.'}</p>`}
        ${acts.length || masquer ? `<div class="pl-actions">${acts.map((x, i) => `<button type="button" class="pl-btn${x.principal ? ' principal' : ''}" data-pl-action="${i}">${x.icone || ''}${esc(x.libelle)}</button>`).join('')}${masquer ? `<button type="button" class="pl-btn" data-pl="masquer">${IC.masquer}Masquer du planning</button>` : ''}</div>` : ''}</section>`;
    }

    // ———— dessiner
    let I = null;
    // ce qui a le focus dans la barre, la liste des personnes masquées ou le détail (une case : garderFocus s'en charge),
    // pour le lui rendre après le dessin, qui remplace tout
    const CLES_FOCUS = [['pl', 'data-pl'], ['plFiltre', 'data-pl-filtre'], ['plVue', 'data-pl-vue'], ['plSemaines', 'data-pl-semaines'],
      ['plAfficher', 'data-pl-afficher'], ['plMasquer', 'data-pl-masquer'], ['plAction', 'data-pl-action']];
    function focusGarde() {
      const a = document.activeElement;
      if (!a || !a.dataset || !el.contains(a) || a.getAttribute('role') === 'gridcell') return null;
      const k = CLES_FOCUS.find(([c]) => a.dataset[c] != null);
      return k ? { attr: k[1], valeur: a.getAttribute(k[1]) } : null;
    }
    function rendreFocus(g) {
      const x = [...el.querySelectorAll(`[${g.attr}]`)].find(y => y.getAttribute(g.attr) === g.valeur);
      if (x && !x.closest('[hidden]')) x.focus({ preventScroll: true });
    }
    function dessiner(o = {}) {
      const g = o.garderFocus ? null : focusGarde();
      dessin(o);
      if (g) rendreFocus(g);
    }
    // la seule case atteignable à la tabulation, et le bouton « Masquer » de sa ligne (Maj+Tab depuis la case)
    function atteignable(c) {
      el.querySelectorAll('[role="gridcell"][tabindex="0"], .pl-masquer[tabindex="0"]').forEach(y => { y.tabIndex = -1; });
      c.tabIndex = 0;
      const b = c.dataset.plP != null ? [...el.querySelectorAll('.pl-masquer')].find(y => y.dataset.plMasquer === c.dataset.plP) : null;
      if (b) b.tabIndex = 0;
    }
    function dessin({ glisser = 0, garderFocus = null } = {}) {
      if (S.detruit) return;
      S.sombre = sombre();
      teintes = new Map();
      S.compact = !!(mq && mq.matches);
      el.dataset.vue = S.vue;
      el.classList.toggle('compact', S.compact);
      const parts = [barre()];
      if (S.erreur) {
        parts.push(`<div class="pl-corps"><div class="pl-erreur" role="alert"><p>${esc(S.erreur)}</p><button type="button" class="pl-btn" data-pl="reessayer">Réessayer</button></div></div>`);
        el.innerHTML = parts.join('');
        return;
      }
      if (!S.D) {
        parts.push('<div class="pl-corps" aria-busy="true"><div class="pl-vue"><p class="pl-vide">Lecture du planning…</p></div></div>');
        el.innerHTML = parts.join('');
        return;
      }
      I = indexer(S.D, S.filtre, O.distributions, groupeDe(S.filtre.groupe), peutMasquer() ? S.masques : null);
      if (S.selection && !(S.selection.jour >= periode(S.vue, S.jour, S.semaines).de && S.selection.jour <= periode(S.vue, S.jour, S.semaines).a)) S.selection = null;
      // une personne choisie qui n'est plus montrée (un autre filtre, masquée) : plus de détail pour elle
      if (S.selection && S.selection.personne != null && !I.personnes.some(p => memeId(p.id, S.selection.personne))) S.selection = null;
      const { de, a } = periode(S.vue, S.jour, S.semaines);
      const cs = I.conflits.filter(c => c.jour >= de && c.jour <= a);
      if (S.avertissement) parts.push(`<div class="pl-attention" role="status"><span>${esc(S.avertissement)}</span><button type="button" class="pl-btn" data-pl="reessayer">Réessayer</button></div>`);
      if (!S.compact) parts.push(legende());
      if (cs.length) {
        const noms = [...new Map(cs.map(c => [`${c.personne_id}|${c.date.id}`, c])).values()].slice(0, 4)
          .map(c => `${memeId(c.personne_id, I.moi) ? 'vous' : nomDe(I.P.get(String(c.personne_id)))} (${txt(c.date.spectacle && c.date.spectacle.titre)}, ${jourLong(c.jour)})`);
        parts.push(S.compact
          ? `<details class="pl-alerte pl-alerte-repliee"><summary><span class="pl-signe" aria-hidden="true">⚠</span><b>${pluriel(cs.length, 'conflit')}</b></summary><p>${esc(noms.join(' ; '))}${cs.length > 4 ? '…' : ''}</p></details>`
          : `<p class="pl-alerte" role="note"><span class="pl-signe" aria-hidden="true">⚠</span><span><b>${pluriel(cs.length, 'conflit')}</b> : ${esc(noms.join(' ; '))}${cs.length > 4 ? '…' : ''}</span></p>`);
      }
      let vue;
      if (S.vue === 'equipe') {
        const v = vueEquipe(I);
        vue = `<div class="pl-defile" data-pl-defile><div class="pl-grille-e" role="grid" aria-labelledby="${S.id}-titre" aria-rowcount="${I.personnes.length + 1}" aria-colcount="${v.n + 1}" style="--n:${v.n}">${v.html}</div></div>${detail(I)}`;
      } else {
        const ap = I.aPreciser.filter(d => d.debut && d.debut.slice(0, 7) === S.jour.slice(0, 7));
        vue = `${ap.length ? `<p class="pl-apreciser">Aussi ce mois-ci, jours à préciser : ${esc(ap.map(d => txt(d.spectacle && d.spectacle.titre)).join(', '))}.</p>` : ''}
          <div class="pl-mise"><div class="pl-mois-grille" role="grid" aria-labelledby="${S.id}-titre">${vueMois(I)}</div>${detail(I)}</div>`;
      }
      const ancien = el.querySelector('[data-pl-defile]');
      const defil = ancien && !glisser ? [ancien.scrollLeft, ancien.scrollTop] : null;
      parts.push(`<div class="pl-corps"${S.charge ? ' aria-busy="true"' : ''}><div class="pl-vue">${vue}</div></div>`);
      if (S.compact) parts.push(legende());
      el.innerHTML = parts.join('');
      // le premier jour atteignable au clavier : le choisi, sinon aujourd'hui, sinon le premier
      const cases = [...el.querySelectorAll('[role="gridcell"]')];
      const cible = el.querySelector('[role="gridcell"][aria-selected="true"]') || cases.find(c => c.dataset.plJour === auj() && (!c.dataset.plP || memeId(c.dataset.plP, S.D.moi))) || cases.find(c => c.dataset.plJour === auj()) || cases[0];
      if (cible) atteignable(cible);
      const d = el.querySelector('[data-pl-defile]');
      if (d) {
        if (defil) { d.scrollLeft = defil[0]; d.scrollTop = defil[1]; }
        else if (S.vue === 'equipe') {
          // aujourd'hui en vue (à gauche, après les noms), sinon le début
          const c = d.querySelector(`.pl-e-jour[data-pl-jour="${auj()}"]`);
          if (c) d.scrollLeft = Math.max(0, c.offsetLeft - d.querySelector('.pl-e-coin').offsetWidth - 2 * c.offsetWidth);
        }
      }
      if (garderFocus) {
        const c = el.querySelector(`[role="gridcell"][data-pl-jour="${garderFocus.jour}"]${garderFocus.personne != null ? `[data-pl-p="${garderFocus.personne}"]` : ''}`) || cible;
        if (c) { atteignable(c); c.focus({ preventScroll: false }); }
      }
      if (glisser && !reduit()) {
        const v = el.querySelector('.pl-vue');
        if (v && v.animate) v.animate([{ transform: `translateX(${glisser * 18}px)`, opacity: 0.25 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
    }
    function animerDetail() {
      if (reduit()) return;
      const d = el.querySelector('.pl-detail');
      if (d && d.animate) d.animate([{ opacity: 0.4, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'ease-out' });
    }

    // ———— lire la base
    let demande = 0;
    async function charger(glisser = 0, garderFocus = null) {
      const p = periode(S.vue, S.jour, S.semaines);
      if (typeof O.charger !== 'function') { S.plage = p; dessiner({ glisser, garderFocus }); signaler(); return; }
      const n = ++demande;
      S.charge++;
      S.erreur = null;
      S.avertissement = null;
      if (S.D) dessiner({ glisser: 0, garderFocus }); else dessiner();
      try {
        const D = await O.charger(p.de, p.a);
        if (n !== demande || S.detruit) return;
        S.D = D || { personnes: [], indisponibilites: [], dates: [], propositions: [] };
        S.plage = p;
        S.charge = 0;
        dessiner({ glisser, garderFocus });
      } catch (e) {
        if (n !== demande || S.detruit) return;
        S.charge = 0;
        const message = typeof O.messageErreur === 'function' ? (O.messageErreur(e) || 'Le planning n’a pas pu être lu.') : 'Le planning n’a pas pu être lu.';
        if (S.D && S.plage && S.plage.de === p.de && S.plage.a === p.a) { S.avertissement = message; dessiner({ glisser }); }
        else { S.erreur = message; dessiner(); }
      } finally {
        if (n === demande) S.charge = 0;
      }
      signaler();
    }
    const etat = () => { const p = periode(S.vue, S.jour, S.semaines); return { vue: S.vue, jour: S.jour, de: p.de, a: p.a, semaines: S.semaines, filtre: { ...S.filtre }, selection: S.selection ? { ...S.selection } : null }; };
    const signaler = () => { if (typeof O.surChangement === 'function') try { O.surChangement(etat()); } catch (e) { console.error(e); } };
    function deplacer(sens, garderFocus = null) {
      S.jour = S.vue === 'mois' ? moisPlus(S.jour, sens) : jourPlus(lundiDe(S.jour), sens * 28);
      if (garderFocus) garderFocus.jour = S.vue === 'mois' ? (() => { const x = moisPlus(garderFocus.jour, sens); return jourPlus(x, Math.min(nombreJour(garderFocus.jour), nombreJour(dernier(x))) - 1); })() : jourPlus(garderFocus.jour, sens * 28);
      if (S.selection) S.selection = garderFocus ? { ...S.selection, jour: garderFocus.jour } : null;
      charger(sens, garderFocus);
    }
    function choisir(jour, personne = null, { activer = false, focus = false } = {}) {
      S.selection = { jour, personne: personne != null ? String(personne) : null };
      const p = periode(S.vue, S.jour, S.semaines);
      if (jour < p.de || jour > p.a) { S.jour = jour; charger(0, focus ? S.selection : null); return; }
      dessiner({ garderFocus: focus ? S.selection : null });
      animerDetail();
      if (activer && typeof O.surJour === 'function' && I) O.surJour(selection(I, jour, personne));
      signaler();
    }

    // ———— masquer des personnes, les afficher de nouveau (l'administration)
    const sortie = () => [...S.masques].map(x => (/^\d+$/.test(x) ? Number(x) : x));
    function changerMasques(ids) {
      S.masques = new Set(ids.map(String));
      if (!S.masques.size) S.masqueesOuvertes = false;
      if (typeof O.surMasques === 'function') try { O.surMasques(sortie()); } catch (e) { console.error(e); }
    }
    const personneDe = id => ((S.D && S.D.personnes) || []).find(x => memeId(x.id, id)) || null;
    // le focus, quand ce qui l'avait disparaît : le premier de ces éléments qui se voit
    function focusSur(...choix) {
      for (const c of choix) {
        const x = typeof c === 'string' ? el.querySelector(c) : c;
        if (x && !x.closest('[hidden]')) { x.focus({ preventScroll: true }); return; }
      }
    }
    // masquée, la personne quitte les vues ; le focus va au bouton qui la fait revenir (« Masquées », ou « Filtres » au téléphone)
    function masquer(id) {
      if (!peutMasquer() || id == null) return;
      const k = String(id), p = personneDe(k);
      changerMasques([...S.masques, k]);
      if (S.selection && memeId(S.selection.personne, k)) S.selection = null;
      if (memeId(S.filtre.personne, k)) { S.filtre = { ...S.filtre, personne: null }; signaler(); }
      dessiner();
      focusSur('[data-pl="masquees"]', '[data-pl="filtres"]', '[role="gridcell"][tabindex="0"]');
      dire(`Personne masquée du planning : ${nomDe(p)}.`);
    }
    function afficher(id) {
      const k = String(id), p = personneDe(k);
      const rang = [...el.querySelectorAll('[data-pl-afficher]')].findIndex(b => b.dataset.plAfficher === k);
      changerMasques([...S.masques].filter(x => x !== k));
      dessiner();
      const restes = [...el.querySelectorAll('[data-pl-afficher]')];
      focusSur(restes[Math.min(Math.max(rang, 0), restes.length - 1)], '[data-pl-filtre="personne"]', '[data-pl="filtres"]', '[role="gridcell"][tabindex="0"]');
      dire(`Personne affichée de nouveau : ${nomDe(p)}.`);
    }
    function toutAfficher() {
      changerMasques([]);
      dessiner();
      focusSur('[data-pl-filtre="personne"]', '[data-pl="filtres"]', '[role="gridcell"][tabindex="0"]');
      dire('Toutes les personnes masquées sont de nouveau affichées.');
    }
    // la liste des personnes masquées s'ouvre sous son bouton ; ouverte, le focus va à sa première personne, et revient au
    // bouton par Échap
    function ouvrirMasquees(ouvert, focus = false) {
      S.masqueesOuvertes = !!ouvert;
      const b = el.querySelector('[data-pl="masquees"]'), l = el.querySelector('.pl-masquees-liste');
      if (b) b.setAttribute('aria-expanded', String(S.masqueesOuvertes));
      if (l) l.hidden = !S.masqueesOuvertes;
      if (focus) focusSur(S.masqueesOuvertes ? '.pl-masquees-liste [data-pl-afficher]' : b);
    }
    // elle se ferme d'un clic, ou d'un focus, ailleurs
    const dehors = e => {
      const t = e.target;
      if (S.masqueesOuvertes && !(t && t.nodeType === 1 && el.contains(t) && t.closest('.pl-masquees'))) ouvrirMasquees(false);
    };
    document.addEventListener('pointerdown', dehors, true);
    document.addEventListener('focusin', dehors);

    // ———— les gestes
    el.addEventListener('click', e => {
      // au toucher, le nom d'une personne montre son bouton « Masquer » (à la souris, le survol suffit)
      const nom = e.target.closest('.pl-e-nom');
      if (nom && !e.target.closest('button') && nom.querySelector('.pl-masquer')) {
        el.querySelectorAll('.pl-e-nom.montre').forEach(x => { if (x !== nom) x.classList.remove('montre'); });
        nom.classList.toggle('montre');
        return;
      }
      const b = e.target.closest('button, [role="gridcell"]');
      if (!b || !el.contains(b)) return;
      const quoi = b.dataset.pl;
      if (quoi === 'avant') return deplacer(-1);
      if (quoi === 'apres') return deplacer(1);
      if (quoi === 'ici') { S.jour = auj(); S.selection = null; return charger(0); }
      if (quoi === 'reessayer') return charger(0);
      if (quoi === 'fermer') { const p = S.selection; S.selection = null; dessiner({ garderFocus: p }); return; }
      if (quoi === 'filtres') { S.filtresOuverts = !S.filtresOuverts; b.setAttribute('aria-expanded', String(S.filtresOuverts)); const f = el.querySelector('.pl-filtres'); if (f) f.hidden = !S.filtresOuverts; if (!S.filtresOuverts) ouvrirMasquees(false); return; }
      if (quoi === 'masquees') return ouvrirMasquees(!S.masqueesOuvertes, true);
      if (quoi === 'tout-afficher') return toutAfficher();
      if (quoi === 'masquer') return masquer(S.selection && S.selection.personne);
      if (b.dataset.plAfficher != null) return afficher(b.dataset.plAfficher);
      if (b.dataset.plMasquer != null) return masquer(b.dataset.plMasquer);
      if (b.dataset.plVue) { if (b.dataset.plVue !== S.vue) { S.vue = b.dataset.plVue; if (S.selection) S.jour = S.selection.jour; charger(0); } return; }
      if (b.dataset.plAction != null) { const a = (S.actionsCourantes || [])[+b.dataset.plAction]; if (a && typeof a.faire === 'function' && I && S.selection) a.faire(selection(I, S.selection.jour, S.selection.personne)); return; }
      if (b.dataset.plJour) choisir(b.dataset.plJour, b.dataset.plP || null, { activer: true });
    });
    el.addEventListener('change', e => {
      const s = e.target;
      if (s.dataset.plFiltre === 'personne') {
        // la liste des personnes : un groupe, toute l'équipe ou une personne (l'un efface l'autre)
        const g = s.value.startsWith(VALEUR_GROUPE) ? s.value.slice(VALEUR_GROUPE.length) : null;
        S.filtre = { ...S.filtre, personne: g == null && s.value !== '' ? s.value : null, groupe: g };
        dessiner(); signaler();
      } else if (s.dataset.plFiltre) { S.filtre = { ...S.filtre, [s.dataset.plFiltre]: s.value === '' ? null : s.value }; dessiner(); signaler(); }
      if (s.dataset.plSemaines != null) { S.semaines = +s.value; charger(0); }
    });
    // au doigt : un balayage vers la gauche avance d'une période, vers la droite recule (gestes.js) ; pas sur la grille
    // qui défile de côté, ni depuis le bord
    if (typeof GESTES !== 'undefined' && GESTES && typeof GESTES.glisser === 'function') {
      GESTES.glisser(el, { gauche: () => deplacer(1), droite: () => deplacer(-1), ignorer: t => { const s = t.closest && t.closest('[data-pl-defile]'); return !!s && s.scrollWidth > s.clientWidth + 2; } });
    }
    el.addEventListener('keydown', e => {
      if (e.key === 'Escape' && S.masqueesOuvertes && e.target.closest('.pl-masquees')) { e.preventDefault(); ouvrirMasquees(false, true); return; }
      if (e.key === 'Escape' && el.querySelector('.pl-detail.feuille')) { const p = S.selection; S.selection = null; dessiner({ garderFocus: p }); return; }
      const c = e.target.closest('[role="gridcell"]');
      if (!c || !el.contains(c)) return;
      const j = c.dataset.plJour, p = c.dataset.plP || null;
      let cible = null, sens = 0;
      const pas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: S.vue === 'mois' ? -7 : 0, ArrowDown: S.vue === 'mois' ? 7 : 0 }[e.key];
      // Entrée : le premier bouton de la page reçoit le focus (jamais « Masquer du planning », qu'une seconde Entrée déclencherait)
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choisir(j, p, { activer: true, focus: true }); const premiere = el.querySelector('.pl-actions button[data-pl-action]'); if (premiere) premiere.focus(); return; }
      if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); deplacer(e.key === 'PageUp' ? -1 : 1, { jour: j, personne: p }); return; }
      if (S.vue === 'equipe' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        const ids = I ? I.personnes.map(x => String(x.id)) : [];
        const k = ids.indexOf(String(p)) + (e.key === 'ArrowUp' ? -1 : 1);
        if (k >= 0 && k < ids.length) cible = { jour: j, personne: ids[k] };
      } else if (pas) {
        const n = jourPlus(j, pas), per = periode(S.vue, S.jour, S.semaines);
        if (n < per.de || n > per.a) { e.preventDefault(); deplacer(n < per.de ? -1 : 1, { jour: n, personne: p }); return; }
        cible = { jour: n, personne: p };
      } else if (e.key === 'Home' || e.key === 'End') {
        const per = periode(S.vue, S.jour, S.semaines);
        const n = S.vue === 'mois' && !e.ctrlKey ? jourPlus(lundiDe(j), e.key === 'Home' ? 0 : 6) : e.key === 'Home' ? per.de : per.a;
        cible = { jour: n, personne: p };
      }
      if (!cible) return;
      e.preventDefault();
      sens = 0;
      const x = el.querySelector(`[role="gridcell"][data-pl-jour="${cible.jour}"]${cible.personne != null ? `[data-pl-p="${cible.personne}"]` : ''}`);
      if (x) {
        atteignable(x);
        x.focus();
        if (S.vue === 'mois') {      // le détail suit le jour au clavier (sans l'annoncer : la case est déjà lue)
          S.selection = { jour: cible.jour, personne: null };
          el.querySelectorAll('.pl-m-c.choisi').forEach(y => { y.classList.remove('choisi'); y.setAttribute('aria-selected', 'false'); });
          x.classList.add('choisi'); x.setAttribute('aria-selected', 'true');
          const d = el.querySelector('.pl-detail');
          const nouveau = document.createElement('div');
          nouveau.innerHTML = detail(I);
          if (d && nouveau.firstElementChild) d.replaceWith(nouveau.firstElementChild);
          else if (!d && nouveau.firstElementChild) el.querySelector('.pl-mise').appendChild(nouveau.firstElementChild);
        }
      }
    });
    const surMq = () => { if (!S.detruit) dessiner(); };
    if (mq && mq.addEventListener) mq.addEventListener('change', surMq);
    const mqSombre = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
    if (mqSombre && mqSombre.addEventListener) mqSombre.addEventListener('change', surMq);

    S.id = `pl${Math.random().toString(36).slice(2, 8)}`;
    const premiere = periode(S.vue, S.jour, S.semaines);
    el.classList.add('pl-premier'); setTimeout(() => el.classList.remove('pl-premier'), 4000);   // au premier dessin, aujourd'hui se pose
    if (S.D && O.donnees) { dessiner(); signaler(); } else charger(0);
    void premiere;

    return {
      donnees(d) { S.D = d || S.D; S.erreur = null; dessiner(); },
      actualiser() { return charger(0, null); },
      vue(v) { if (v === 'mois' || v === 'equipe') { S.vue = v; return charger(0); } return Promise.resolve(); },
      aller(j) { if (estJour(j)) { S.jour = j; return charger(0); } return Promise.resolve(); },
      precedent() { deplacer(-1); }, suivant() { deplacer(1); },
      ici() { S.jour = auj(); return charger(0); },
      semaines(n) { if ([4, 6, 8].includes(+n)) { S.semaines = +n; return charger(0); } return Promise.resolve(); },
      filtrer(f = {}) { S.filtre = { spectacle: f.spectacle ?? null, personne: f.personne ?? null, groupe: groupeDe(f.groupe) ? String(f.groupe) : null }; dessiner(); signaler(); },
      masques(ids) { S.masques = new Set((Array.isArray(ids) ? ids : []).map(String)); if (!S.masques.size) S.masqueesOuvertes = false; dessiner(); },
      choisir(j, p = null) { if (estJour(j)) choisir(j, p); },
      etat,
      detruire() {
        S.detruit = true; clearTimeout(minuteur);
        if (mq && mq.removeEventListener) mq.removeEventListener('change', surMq);
        if (mqSombre && mqSombre.removeEventListener) mqSombre.removeEventListener('change', surMq);
        document.removeEventListener('pointerdown', dehors, true); document.removeEventListener('focusin', dehors);
        racine.innerHTML = '';
      },
    };
  }

  return { monter, periode, joursDe, conflits: D => conflits(D), chevauchement, texteJours, css: CSS, version: 1,
    // pour les pages qui en ont besoin (mêmes règles de jours que le planning)
    outils: { instant, jourParis, jourPlus, lundiDe, minuit, jourLong, heureTexte, ecart } };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = PLANNING;
