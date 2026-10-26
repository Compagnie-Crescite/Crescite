/* Les données vivantes, communes aux maquettes (build.py l'ajoute après les données D, avant la carte).
   D est d'abord l'instantané du dépôt, pour un premier affichage immédiat ; quand la base de la compagnie répond, D est
   remplacé EN PLACE par son contenu (mêmes objets de premier niveau : D.site, D.shows, D.dates, D.saisons, D.carte…),
   puis de nouveau à chaque enregistrement fait dans l'administration (temps réel).

   DONNEES.surChangement(fn)   fn() est appelée après chaque mise à jour de D : refais la vue courante en place, sans
                               remonter en haut, sans voler le focus, sans rejouer l'ouverture ni les animations d'entrée.
                               Le rendu de chaque vue relit donc D à chaque fois (aucune copie figée au chargement).
   DONNEES.etat                'instantane' (données du dépôt), 'base' (à jour avec la base) ou 'hors-ligne'.
   DONNEES.recharger({force})  relit la base ; DONNEES.suspendre(oui) met les nouvelles en attente (édition en cours).
   DONNEES.deposer(table, l)   écrit une ligne du public (alerte de tournée, demande de devis) ; rend { error }.

   Les lignes d'agenda se composent avec AGENDA (agenda.js), comme dans l'administration.
   La base : le projet Supabase de la compagnie (tables crescite_, lecture publique de ce qui est publié). Adresse
   ?base=0 : rester sur l'instantané (tests, hors connexion). */
const DONNEES = (() => {
  const BASE = 'https://omekkqjinvppadsoinvj.supabase.co';
  const CLE = 'sb_publishable_TODW6NdmDly8eR9UxjG-6g_eyAa4gjB';
  const TABLES = ['crescite_spectacles', 'crescite_lieux', 'crescite_dates', 'crescite_representations', 'crescite_ateliers', 'crescite_textes',
                  'crescite_personnes', 'crescite_distributions'];
  const abonnes = [];
  const moi = { etat: 'instantane' };
  let actif = true;
  try { actif = new URLSearchParams(location.search).get('base') !== '0' && typeof fetch === 'function' && !window.CRESCITE_SANS_BASE; } catch { actif = false; }

  // ce qui ne vient pas de la base : la navigation, le fond de carte, les photos du dépôt, les positions des communes connues
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'").toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const cleCommune = (c, dep) => `${norm(c)}|${dep}`;
  const S = {
    site: { titreSuffixe: D.site.titreSuffixe, accueil: D.site.accueil, entrees: D.site.entrees, menu: D.site.menu,
            redirections: D.site.redirections, libelles: D.site.libelles, couleurSaison: D.site.couleurSaison },
    carte: { viewBox: D.carte.viewBox, contour: D.carte.contour, belgique: D.carte.belgique, luxembourg: D.carte.luxembourg,
             rouen: D.carte.rouen, projection: D.carte.projection },
    xy: new Map(D.carte.lieux.map(l => [cleCommune(l.c, l.dep), l.xy])),
    photos: Object.assign({}, D.photos),
    // l'équipe de l'instantané : gardée tant que la base n'a pas encore ses tables d'équipe
    personnes: D.personnes || {}, equipes: Object.fromEntries((D.shows || []).map(s => [s.slug, s.equipe || []])),
  };

  // ------------------------------------------------------------------------------------------- outils
  const { MOIS, iso, saisonDe, jourTexte, heureTexte, liste, quand, ligne, chez, precisions } = AGENDA;
  const lum = hex => { const f = c => (c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; return 0.2126 * f(parseInt(hex.slice(1, 3), 16)) + 0.7152 * f(parseInt(hex.slice(3, 5), 16)) + 0.0722 * f(parseInt(hex.slice(5, 7), 16)); };
  const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  function pourFondClair(hex, fond = '#ffffff', cible = 4.6) {       // comme for_light dans build.py
    if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return hex;
    let [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)), c = hex;
    while (contraste(c, fond) < cible && r + g + b > 0) { r = Math.floor(r * 0.92); g = Math.floor(g * 0.92); b = Math.floor(b * 0.92); c = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''); }
    return c;
  }
  // la projection de la carte (conique conforme de Lambert recalée, comme projection() dans build.py)
  function projeter(lon, lat) {
    const P = S.carte.projection;
    if (!P || lon == null || lat == null) return null;
    const rad = Math.PI / 180, f1 = 44 * rad, f2 = 49 * rad, f0 = 46.5 * rad;
    const n = Math.log(Math.cos(f1) / Math.cos(f2)) / Math.log(Math.tan(Math.PI / 4 + f2 / 2) / Math.tan(Math.PI / 4 + f1 / 2));
    const F = Math.cos(f1) * Math.tan(Math.PI / 4 + f1 / 2) ** n / n, rho = f => F / Math.tan(Math.PI / 4 + f / 2) ** n;
    const r = rho(lat * rad), th = n * (lon - 3) * rad, u = r * Math.sin(th), v = rho(f0) - r * Math.cos(th);
    const arr = x => Math.round(x * 10) / 10;
    return [arr(P.cx[0] * u + P.cx[1] * v + P.cx[2]), arr(P.cy[0] * u + P.cy[1] * v + P.cy[2])];
  }
  // la photo d'un fichier de la base : celle que la page a déjà (sa copie publiée, ou en data URL), sinon celle du stockage ;
  // jamais le substitut neutre (un SVG) d'une page construite sans la photo, qui masquerait la vraie, déposée dans la base
  const photo = fichier => {
    if (!fichier) return null;
    const cle = fichier.replace(/\.[a-z0-9]+$/i, ''), ici = S.photos[cle];
    return ici && !/^data:image\/svg/.test(ici) ? ici : `${BASE}/storage/v1/object/public/crescite/${fichier.split('/').map(encodeURIComponent).join('/')}`;
  };

  // le thème d'un spectacle (règle 22) : « couleur », assez sombre pour porter la pieuvre blanche du logo et un texte sur
  // fond clair (l'accent, sinon la couleur du spectacle assombrie) ; « vive », lisible sur un fond sombre
  const lumiere = h => {
    const f = c => (c /= 255) <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4, n = parseInt(String(h).slice(1, 7), 16);
    return .2126 * f(n >> 16 & 255) + .7152 * f(n >> 8 & 255) + .0722 * f(n & 255);
  };
  const hexa = h => /^#[0-9a-f]{6}$/i.test(String(h || ''));
  function themeDe(s) {
    const c = s.univers.couleurs, surBlanc = h => 1.05 / (lumiere(h) + .05), surNuit = h => (lumiere(h) + .05) / (lumiere('#14070f') + .05);
    let couleur = hexa(c.accent) && surBlanc(c.accent) >= 4.5 ? c.accent : null;
    if (!couleur && hexa(c.scene)) {
      const n = parseInt(c.scene.slice(1), 16), rgb = [n >> 16 & 255, n >> 8 & 255, n & 255];
      for (let k = 1; k >= .2; k -= .02) { couleur = '#' + rgb.map(v => Math.round(v * k).toString(16).padStart(2, '0')).join(''); if (surBlanc(couleur) >= 4.5) break; }
    }
    if (!couleur) return null;
    const vive = [c.scene, c.accent2, c.accent].find(x => hexa(x) && surNuit(x) >= 4.5) || c.texte;
    return { slug: s.slug, couleur, vive };
  }

  // ------------------------------------------------------------------------------------------- lire la base
  async function lireTable(table, select, ordre, signal) {
    const out = [];
    for (let debut = 0; ; debut += 1000) {                 // l'API rend 1 000 lignes au plus par appel
      const r = await fetch(`${BASE}/rest/v1/${table}?select=${select}${ordre ? `&order=${ordre}` : ''}&limit=1000&offset=${debut}`,
        { headers: { apikey: CLE, Accept: 'application/json' }, signal, cache: 'no-store' });
      if (!r.ok) throw new Error(`${table} : ${r.status}`);
      const lot = await r.json();
      out.push(...lot);
      if (lot.length < 1000) return out;
    }
  }
  async function lire() {
    const ctl = new AbortController(), minuteur = setTimeout(() => ctl.abort(), 20000);
    try {
      const [sp, li, da, re, at, tx] = await Promise.all([
        lireTable('crescite_spectacles', '*', 'ordre.asc,id.asc', ctl.signal),
        lireTable('crescite_lieux', 'id,nom,type,commune,departement,pays,latitude,longitude,site_web', 'id.asc', ctl.signal),
        lireTable('crescite_dates', 'id,spectacle_id,lieu_id,debut,fin,precision,saison,public,statut,nature,intitule,details,lien,nb_representations', 'debut.asc,id.asc', ctl.signal),
        lireTable('crescite_representations', 'id,date_id,jour,heure,public,annulee,lien,note', 'jour.asc,heure.asc.nullslast,id.asc', ctl.signal),
        lireTable('crescite_ateliers', '*', 'ordre.asc,id.asc', ctl.signal),
        lireTable('crescite_textes', 'cle,valeur', null, ctl.signal),
      ]);
      // l'équipe : facultative (une base sans ses tables d'équipe garde celle de l'instantané)
      let pe, di, dc;
      try {             // les documents publics : facultatifs aussi (une base qui ne les a pas encore garde ceux de l'instantané)
        dc = await lireTable('crescite_documents', 'spectacle_id,type,titre,fichier,url,pour,ordre&pour=in.(pros,scolaires,tous,pros_scolaires)', 'ordre.asc,id.asc', ctl.signal);
      } catch { dc = undefined; }
      try {
        [pe, di] = await Promise.all([
          lireTable('crescite_personnes', 'id,slug,prenom,nom,metiers,photo,photo_credit,photo_publique,ordre', 'ordre.asc,id.asc', ctl.signal),
          lireTable('crescite_distributions', 'spectacle_id,personne_id,categorie,fonction,role,alternance,ordre', 'ordre.asc,id.asc', ctl.signal)]);
      } catch { pe = di = undefined; }
      return { sp, li, da, re, at, tx, pe, di, dc };
    } finally { clearTimeout(minuteur); }
  }

  // ------------------------------------------------------------------------------------------- composer D
  function composer({ sp, li, da, re, at, tx, pe, di, dc }) {
    const aujourdhui = iso(new Date()), saison = saisonDe(aujourdhui);
    const texte = Object.fromEntries(tx.map(t => [t.cle, t.valeur]));
    const spId = new Map(sp.map(s => [s.id, s])), lieuId = new Map(li.map(l => [l.id, l]));
    const repsDe = new Map();
    re.forEach(r => { if (!repsDe.has(r.date_id)) repsDe.set(r.date_id, []); repsDe.get(r.date_id).push({ ...r, heure: r.heure ? r.heure.slice(0, 5) : null }); });
    const pages = sp.filter(s => s.page && s.publie);
    const slugDe = s => (s && s.page ? s.slug : null);
    const ordre = new Map(sp.map((s, i) => [s.id, i]));

    // les communes de la carte : une par commune et département, à la place des communes du dépôt quand on les connaît
    const lieux = [], index = new Map();
    const communeDe = l => {
      if (!l) return null;
      const k = cleCommune(l.commune, l.departement);
      if (!index.has(k)) {
        const xy = S.xy.get(k) || projeter(l.longitude, l.latitude);
        if (!xy) { index.set(k, null); return null; }
        index.set(k, lieux.length);
        lieux.push({ c: l.commune, dep: l.departement, xy });
      }
      return index.get(k);
    };
    const precisionAncienne = { jour: 'day', periode: 'range', mois: 'month', saison: 'range' };
    // un lien venu de la base ne passe que s'il mène à une page web (http ou https) : jamais « javascript: », ni rien d'autre
    const http = u => (typeof u === 'string' && /^https?:\/\/\S+$/i.test(u.trim()) ? u.trim() : null);
    const sursDetails = ds => (Array.isArray(ds) ? ds.map(t => (t && t.lien ? { ...t, lien: http(t.lien) } : t)) : ds);
    const etatDe = d => d.statut === 'annulee' ? 'date annulée' : d.statut === 'reportee' ? 'date reportée' : null;
    const lignes = da.filter(d => spId.has(d.spectacle_id)).map(d => {
      const s = spId.get(d.spectacle_id), lieu = lieuId.get(d.lieu_id) || null, reps = repsDe.get(d.id) || [];
      const l = communeDe(lieu), txt = ligne(d, reps, lieu), [ligneDate, ligneLieu = ''] = txt.split(' — ');
      return {
        d, s, lieu, reps, l, ligne: txt, ligneDate: ligneDate.trim(), ligneLieu: ligneLieu.trim(),
        details: sursDetails(precisions(d, reps, lieu)), etat: etatDe(d), iso: d.debut, fin: d.fin || d.debut, lien: http(d.lien),
        // une semaine de résidence (règle 23) : dans l'agenda des saisons, marquée ; ni représentation, ni réservation, ni carte
        residence: d.nature === 'residence',
        precision: precisionAncienne[d.precision] || 'day', scolaire: d.public === 'scolaire' && d.nature !== 'residence',
        representations: reps.map(r => ({ jour: r.jour, heure: r.heure, public: r.public, annulee: r.annulee, lien: http(r.lien), note: r.note })),
      };
    });

    // les dates à venir, et les saisons
    const aVenir = lignes.filter(x => x.fin >= aujourdhui && !x.residence).sort((a, b) => a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : ordre.get(a.s.id) - ordre.get(b.s.id));
    const dates = aVenir.map(x => ({
      id: x.d.id, slug: slugDe(x.s), titre: x.s.titre, ligne: x.ligne, ligneDate: x.ligneDate, ligneLieu: x.ligneLieu,
      details: x.details, lien: x.lien, iso: x.iso, fin: x.fin, precision: x.precision, scolaire: x.scolaire, etat: x.etat,
      commune: x.l != null ? lieux[x.l].c : null, dep: x.l != null ? lieux[x.l].dep : null, xy: x.l != null ? lieux[x.l].xy : null,
      // lieu : le nom du lieu qui accueille (où l'on réserve, règle 17) ; representations : ses séances (jour, heure, lien…)
      l: x.l, lieu: x.lieu && x.lieu.nom ? x.lieu.nom : null, representations: x.representations,
    }));
    // les saisons : la saison en cours et celles d'avant ; une saison à venir (des résidences déjà prévues) attend son tour
    // (une représentation d'une saison à venir reste dans les dates à venir)
    const cles = [...new Set([saison, ...lignes.map(x => x.d.saison)])].filter(k => k <= saison).sort().reverse();
    const saisons = {};
    cles.forEach(k => { saisons[k] = { titre: `Saison ${k}`, spectacles: [] }; });
    [...lignes].sort((a, b) => ordre.get(a.s.id) - ordre.get(b.s.id) || (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : a.d.id - b.d.id)).forEach(x => {
      const S2 = saisons[x.d.saison];
      if (!S2) return;
      let g = S2.spectacles.find(y => y._id === x.s.id);
      if (!g) { g = { _id: x.s.id, titre: x.s.titre, sousTitre: x.s.sous_titre, creation: x.s.creation, slug: slugDe(x.s), dates: [] }; S2.spectacles.push(g); }
      g.dates.push({ id: x.d.id, ligne: x.ligne, details: x.details, etat: x.etat, lien: x.lien, iso: x.iso, fin: x.fin,
                     precision: x.precision, scolaire: x.scolaire, residence: x.residence, l: x.l, representations: x.representations,
                     nb_representations: x.residence ? 0 : (x.representations && x.representations.length) || (x.d && x.d.nb_representations != null ? x.d.nb_representations : 1) });
    });
    Object.values(saisons).forEach(S2 => S2.spectacles.forEach(g => delete g._id));

    // les spectacles, dans le format des maquettes
    const photos = Object.assign({}, S.photos);
    // l'équipe : les fiches publiées (la photo seulement si sa publication est accordée) et la distribution de chaque spectacle
    const avecEquipe = Array.isArray(pe) && Array.isArray(di);
    const personnes = avecEquipe ? Object.fromEntries(pe.map(p => [p.slug, { prenom: p.prenom, nom: p.nom, metiers: p.metiers || [],
      photo: p.photo_publique && p.photo ? photo(p.photo) : null, credit: p.photo_publique && p.photo ? p.photo_credit || null : null }])) : S.personnes;
    const slugPersonne = new Map((pe || []).map(p => [p.id, p.slug]));
    const equipeDe = s => (avecEquipe
      ? di.filter(x => x.spectacle_id === s.id && slugPersonne.has(x.personne_id)).map(x => ({ personne: slugPersonne.get(x.personne_id),
          categorie: x.categorie, fonction: x.fonction || '', role: x.role || null, alternance: x.alternance || null }))
      : S.equipes[s.slug] || []);
    const shows = pages.map(s => {
      const u = s.univers || {}, c = u.couleurs || {};
      const mine = dates.filter(d => d.slug === s.slug);
      if (s.photo) photos[s.slug] = photo(s.photo);
      const ph = (s.photos || []).map(p => { const cle = (p.fichier || '').replace(/\.[a-z0-9]+$/i, ''); photos[cle] = photo(p.fichier); return { ...p, cle }; });
      return {
        id: s.id,                     // le numéro du spectacle dans la base (une alerte, une demande de devis le portent)
        slug: s.slug, titre: s.titre, titreLignes: s.titre_lignes || [s.titre], creation: s.creation,
        annee: +((s.creation || '').match(/\d{4}/) || [0])[0], fiche: s.fiche || [], texte: s.texte || [], enTournee: !!s.en_tournee,
        prochaine: mine[0] || null, nbDates: mine.length,
        couleur: c.scene, couleurTexteClair: pourFondClair(c.scene), fondSombre: u.clair ? '#1a1016' : c.fond,
        palette: c, clair: !!u.clair, motif: u.motif, focale: 50, univers: u, lieuTemps: s.lieu_temps, accroche: s.accroche,
        affirmations: s.affirmations || [], citations: s.citations || [], video: s.video, photo: s.photo, photos: ph,
        creditPhotos: s.credit_photos || s.credit, creditDossier: s.credit_dossier,
        // une action culturelle vide ou « masquee » (pas encore construite) n'est pas publiée : null (règle 14 du contrat)
        actionCulturelle: s.action_culturelle && Object.keys(s.action_culturelle).length && !s.action_culturelle.masquee ? s.action_culturelle : null,
        programmer: s.programmer || {},
        dossier: s.dossier ? s.dossier.replace(/^dossier:/, '') : null,
        statut: s.statut, sousTitre: s.sous_titre, avec: s.avec, mentions: s.mentions || [], duree: s.duree,
        production: s.production || [], credit: s.credit, medias: s.medias || [], tournee: s.tournee || {}, source: s.source,
        genre: s.genre, cadre: s.cadre, extraits: s.extraits || [], equipe: equipeDe(s),
      };
    });

    // les ateliers, et les dossiers scolaires qui les reprennent
    const ateliers = at.map(a => ({ id: a.id, slug: slugDe(spId.get(a.spectacle_id)), titre: a.titre, duree: a.duree,
      obligatoire: a.obligatoire, public: a.public, paragraphes: a.paragraphes || [], etapes: a.etapes || [], points: a.points || [] }));
    const dossiers = {};
    Object.entries(texte).filter(([k]) => k.startsWith('dossier:')).forEach(([k, v]) => {
      const cle = k.slice(8), s = sp.find(x => x.dossier === k);
      const liste = at.filter(a => s && a.spectacle_id === s.id).map(a => {
        const x = { titre: a.titre, paragraphes: a.paragraphes || [] };
        if ((a.etapes || []).length) x.etapes = a.etapes;
        if ((a.points || []).length) x.points = a.points;
        return x;
      });
      dossiers[cle] = { ...v, ateliers: { ...(v.ateliers || {}), liste } };
    });

    // la carte
    const compte = ls => { const n = new Map(); ls.forEach(l => { if (l != null) n.set(l, (n.get(l) || 0) + 1); }); return [...n.entries()].sort((a, b) => a[0] - b[0]); };
    const parSaison = {}, jouees = lignes.filter(x => !x.residence);
    jouees.forEach(x => { (parSaison[x.d.saison] = parSaison[x.d.saison] || []).push(x.l); });
    Object.keys(parSaison).forEach(k => { parSaison[k] = compte(parSaison[k]); });
    const parSpectacle = {};
    pages.forEach(s => {
      parSpectacle[s.slug] = { passe: compte(jouees.filter(x => x.s.id === s.id && x.fin < aujourdhui).map(x => x.l)),
                               aVenir: compte(dates.filter(d => d.slug === s.slug).map(d => d.l)) };
    });
    const carte = { ...S.carte, lieux, parSaison, parSpectacle, aVenir: compte(dates.map(d => d.l)),
                    aVenirPublic: compte(dates.filter(d => !d.scolaire).map(d => d.l)),
                    aVenirScolaire: compte(dates.filter(d => d.scolaire).map(d => d.l)), tout: compte(jouees.map(x => x.l)) };

    // le site : la navigation du dépôt, les textes de la base
    const site = { ...S.site };
    ['nom', 'diaporama', 'donateurs', 'compagnie', 'actions', 'ecole', 'contact', 'coordonnees', 'ecrire', 'facebook',
     'partenaires', 'liensLegaux', 'legal', 'programmation', 'espacePro', 'troupe'].forEach(k => { site[k] = k in texte ? texte[k] : D.site[k]; });
    site.saisons = cles.map(k => ({ saison: k, titre: `Saison ${k}`, menu: k === saison ? `Saison ${k.slice(2, 4)}-${k.slice(7, 9)}` : `Saison ${k}`,
                                    href: k === saison ? '#/saisons' : `#/saisons/${k}` }));
    // les documents publics : un fichier du stockage public (documents/…), ou un lien
    const documents = Array.isArray(dc) ? dc.map(x => ({ spectacle: slugDe(spId.get(x.spectacle_id)) || null, type: x.type, titre: x.titre,
      url: (/^https?:\/\//i.test(x.url || '') ? x.url : null) || (x.fichier ? `${BASE}/storage/v1/object/public/crescite/${x.fichier.split('/').map(encodeURIComponent).join('/')}` : null), pour: x.pour }))
      .filter(x => x.url) : (D.documents || []);
    // le thème (règle 22 du contrat) : la création la plus récente colore tout le site, logo compris (comme theme() du build)
    const derniere = shows.filter(s => s.annee && s.univers && s.univers.couleurs).sort((a, b) => b.annee - a.annee || (a.slug < b.slug ? 1 : -1))[0];
    if (derniere) site.couleurSaison = themeDe(derniere) || site.couleurSaison;
    return { saison, aujourdhui, site, shows, dossiers, ateliers, dates, saisons, carte, photos, personnes, documents };
  }

  // ------------------------------------------------------------------------------------------- appliquer, prévenir
  const empreinte = n => { try { return JSON.stringify(n); } catch { return String(Math.random()); } };
  let derniere = null;
  function appliquer(n) {
    Object.keys(n).forEach(k => {
      const a = D[k], b = n[k];
      if (Array.isArray(a) && Array.isArray(b)) a.splice(0, a.length, ...b);
      else if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
        Object.keys(a).forEach(kk => { if (!(kk in b)) delete a[kk]; });
        Object.assign(a, b);
      } else D[k] = b;
    });
  }
  const prevenir = () => abonnes.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  // pendant une édition en cours (edition.js), les nouvelles de la base attendent : on ne perd rien de ce qui s'écrit
  let suspendu = false, enAttente = null;
  async function recharger({ force = false } = {}) {
    try {
      const n = composer(await lire());
      const e = empreinte(n);
      moi.etat = 'base';
      if (e === derniere && !force) return;
      if (suspendu) { enAttente = { n, e }; return; }
      derniere = e;
      appliquer(n);
      prevenir();
    } catch (err) {
      if (moi.etat !== 'base') moi.etat = 'hors-ligne';
      console.warn('Données de la compagnie indisponibles :', err.message || err);
    }
  }
  let attente = null;
  const bientot = (ms = 250) => { clearTimeout(attente); attente = setTimeout(recharger, ms); };

  // ------------------------------------------------------------------------------------------- temps réel
  // le canal de Supabase, par son client officiel (celui de l'administration, chargé après le premier affichage) :
  // chaque enregistrement dans une table crescite_ publiée relance la lecture
  const CLIENT = 'admin/vendor/supabase.js';
  let connecte = false, version = null;
  const chargerClient = () => window.supabase?.createClient ? Promise.resolve(window.supabase) : new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = CLIENT; s.async = true;
    s.onload = () => (window.supabase?.createClient ? ok(window.supabase) : ko(new Error('client absent')));
    s.onerror = () => ko(new Error('client introuvable'));
    document.head.append(s);
  });
  function ecouter() {
    chargerClient().then(sbjs => {
      const client = sbjs.createClient(BASE, CLE, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      const canal = client.channel('crescite-site');
      TABLES.forEach(table => canal.on('postgres_changes', { event: '*', schema: 'public', table }, () => bientot()));
      canal.subscribe(st => { connecte = st === 'SUBSCRIBED'; });
    }).catch(() => { connecte = false; });
  }
  // secours : si le canal est coupé, la version publiée est relue de temps en temps (et au retour sur l'onglet)
  async function verifier() {
    if (connecte && document.visibilityState === 'visible') return;
    try {
      const r = await fetch(`${BASE}/rest/v1/rpc/crescite_version`, { method: 'POST', headers: { apikey: CLE, 'Content-Type': 'application/json' }, body: '{}', cache: 'no-store' });
      if (!r.ok) return;
      const v = await r.json();
      if (version !== null && v !== version) bientot(0);
      version = v;
    } catch { /* hors connexion : on réessaiera */ }
  }

  if (actif) {
    // la première lecture : si la base ne répond pas (réseau lent, coupure), la page garde l'instantané et réessaie
    let branche = false, essai = 0;
    const brancher = () => { if (branche) return; branche = true; ecouter(); verifier(); setInterval(verifier, 60000); };
    const premiere = () => recharger().then(() => {
      if (moi.etat === 'base') brancher();
      else setTimeout(premiere, [5000, 15000, 45000][essai++] || 120000);
    });
    premiere();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { verifier(); if (!connecte) bientot(0); } });
  }
  moi.surChangement = fn => { if (typeof fn === 'function') abonnes.push(fn); };
  moi.suspendre = oui => {
    suspendu = !!oui;
    if (!suspendu && enAttente) { const { n, e } = enAttente; enAttente = null; derniere = e; appliquer(n); prevenir(); }
  };
  moi.prevenir = prevenir;
  moi.recharger = recharger;
  moi.composer = composer;
  // ------------------------------------------------------------------------------------------- les dépôts du public
  // DONNEES.deposer(table, ligne) : une ligne que le public écrit sans la relire (une alerte de tournée, une demande de
  // devis : le septième script SQL les lui ouvre). Rend { error } comme supabase-js : null quand la base l'a enregistrée,
  // sinon l'erreur ; sans la base (?base=0, hors connexion), une erreur aussi : la page ne promet rien.
  moi.deposer = async (table, ligne) => {
    if (!actif) return { error: { message: 'sans la base', code: '', status: 0 } };
    try {
      const r = await fetch(`${BASE}/rest/v1/${table}`, { method: 'POST', cache: 'no-store',
        headers: { apikey: CLE, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(ligne) });
      if (r.ok) return { error: null };
      const j = await r.json().catch(() => ({}));
      return { error: { message: j.message || `${table} : ${r.status}`, code: j.code || '', status: r.status } };
    } catch (e) { return { error: { message: String((e && e.message) || e), code: '', status: 0 } }; }
  };
  return moi;
})();
