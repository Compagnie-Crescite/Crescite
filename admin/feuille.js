/* La feuille de route d'une date de tournée, commune à l'administration (admin/index.html) et à la page de l'équipe
   (equipe/index.html, qui la charge par ../admin/feuille.js). Aucune dépendance : ni la base, ni l'administration.

   CE QUI CHANGE (octobre 2026) : la feuille n'est plus un formulaire en onze rubriques, mais une page A4 qu'on écrit
   directement, comme dans un traitement de texte, d'après les feuilles de route de la compagnie. Son contenu est une
   suite de blocs :
       contenu = { format: 2, blocs: [bloc…], composees: [clé…], pages: [id…], instantane: [séance…], compose_le }
       bloc    = { id, type, segments: [{texte, gras?, italique?, rouge?, surligne?, amorce?, lien?, doc?}],
                   petit? (en-tête plus petit), date? ('AAAA-MM-JJ', bloc « jour »), lignes? (tableau : [[segments]]),
                   cle? (ce que la base a composé), source? ('base' : pas retouché depuis), origine? ({jour, heure, fin, rep}) }
       types   : entete, rubrique, sous-titre, jour, ligne, puce, alerte, saut (de page), tableau (simple, éditable)
   Une amorce (amorce: true) est une information qui manque, en gris dans l'éditeur (« heure d'arrivée ? ») : elle
   n'apparaît jamais ailleurs (PDF, impression, version web, planning). contenu.pages : les blocs qui commencent une
   page dans l'éditeur ; le PDF coupe aux mêmes endroits. contenu.composees : les clés que la base a composées ; une clé
   absente des blocs a été retirée à la main, et « Mettre à jour depuis la base » ne la remet pas.
   Les feuilles de l'ancien format (contenu.representations, planning, lieu, trajet…) restent lisibles : elles sont
   converties en blocs à la volée (FEUILLE.contenu).

   L'API reste la même pour la page de l'équipe :
   FEUILLE.html(feuille, contexte)           → le HTML de la feuille (une racine .fdr qui porte ses styles), fluide
   FEUILLE.pdf(feuille, contexte)            → Promise<Blob> (pdfmake et la police FdR Sans, chargés depuis FEUILLE.vendor)
   FEUILLE.telecharger(feuille, contexte, nom?)   télécharge le PDF
   FEUILLE.planning(feuille, contexte)       → [{jour: 'AAAA-MM-JJ', heure: 'HH:MM', fin: 'HH:MM'|null, texte, accent}], trié
   FEUILLE.vendor                            le dossier de pdfmake et des polices : vendor/ à côté de ce fichier
       feuille = {titre, contenu, version, publiee_le, statut}
       contexte = {date, spectacle: {titre, slug, univers, duree}, lieu, representations, documents?, moi?}
       (documents : [{id, titre, url}], les liens des documents cités ; moi : {prenom}, mis en valeur dans la version web)
   FEUILLE.planning : la frise « Le jour J » de l'équipe. Chaque bloc « jour » garde sa date (date: 'AAAA-MM-JJ') ; l'heure
   d'une ligne se lit à son début (« 9h : », « 10h-11h : », « 14h10 : », « à partir de 9h : »), ou dans ses données
   d'origine (origine) quand elle vient de la base sans retouche. accent : une représentation (ligne en gras, ou venue
   d'une représentation). Les lignes sans heure n'y sont pas.
   FEUILLE.composer(sources) donne maintenant un contenu en blocs (sources : plus bas). Pour l'administration :
   FEUILLE.contenu (conversion), FEUILLE.actualiser (« Mettre à jour depuis la base »), FEUILLE.MISE et FEUILLE.cssPage
   (la mise en page, commune à l'éditeur, à l'impression et au PDF), FEUILLE.impression, FEUILLE.logo, FEUILLE.polices,
   FEUILLE.etapes (le planning d'une date en lignes simples, pour l'exemple de l'onglet « Déroulé type »).
   Retirés : FEUILLE.SECTIONS, FEUILLE.fusionner, FEUILLE.vue et FEUILLE.css (l'ancien formulaire).
   La police FdR Sans (vendor/fdr-sans-*.ttf) est Carlito réduite au latin et renommée (Carlito a un nom réservé) ; le
   logo (logo-feuille.svg, à côté de ce fichier) est écrit par maquettes/build.py dans le site construit (sa source
   reste privée) : sans lui, un badge « crescite » à sa place.

   Le planning pose le déroulé type du spectacle (spectacle.feuille_modele : [{avant_min, quoi, qui, fin?, jours?}])
   autour des représentations. Un jour à plusieurs représentations : les étapes « avant » (minutes avant le lever de
   rideau) avant la première, les étapes « après » (avant_min négatif, ou fin: true) après la dernière ; entre les deux,
   seulement les représentations, et un repas si l'écart dépasse trois heures. Plusieurs jours de suite au même lieu :
   une étape a lieu le premier jour, chaque jour ou le dernier (jours : 'premier' | 'tous' | 'dernier'). Sans indication,
   l'arrivée de l'équipe artistique et la préparation ont lieu chaque jour, les autres étapes « avant » (montage,
   raccords, repas, ouverture des portes) le premier jour, les étapes « après » (démontage) le dernier. Une répétition
   ou une résidence (date.nature) donne ses séances : « 9h-18h : répétitions ».
   Rien ne se fait la nuit, comme dans les feuilles de la compagnie. Le montage et les raccords qui tomberaient avant
   8h passent la veille, un jour de plus en tête du planning (avec sa date) : à partir de 9h, ou de 14h s'ils tiennent
   dans l'après-midi. Le jour même commence par l'arrivée de l'équipe (toute l'équipe, quand le montage a eu lieu la
   veille), vers 8h au plus tôt et au moins une heure avant la première représentation ; rien n'est composé avant 6h.
   Un repas du déroulé ne s'écrit que dans une plage de repas (11h30-14h, 18h30-21h) ; une représentation le matin et
   une l'après-midi : « déjeuner : tout le monde » entre les deux. Le départ se compte depuis la première étape sur
   place du premier jour, jamais avant 6h : plus tôt, l'amorce « arrivée la veille, hébergement à prévoir ». Ce qui est
   déplacé ou ramené à ces heures garde l'amorce « à vérifier ». */
const FEUILLE = (() => {
  'use strict';
  const ICI = typeof document !== 'undefined' && document.currentScript && document.currentScript.src;
  const COMPAGNIE = 'Compagnie Crescite';

  // ================================================================================================ outils
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const clone = o => JSON.parse(JSON.stringify(o ?? null));
  const txt = v => String(v ?? '').trim();
  const maj = s => s ? s[0].toUpperCase() + s.slice(1) : '';
  // « Arrivée de la régie » → « arrivée de la régie », mais « DJ » ou « MJC » restent
  const minuscule = s => !s || /^[A-ZÀ-Ý]{2}/.test(s) ? s || '' : s[0].toLowerCase() + s.slice(1);
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const estJour = j => /^\d{4}-\d{2}-\d{2}$/.test(j || '');
  const date12 = j => new Date(j + 'T12:00:00');
  // « vendredi 18 décembre 2026 », « 1er mars »
  const jourLong = (j, annee = true) => { if (!estJour(j)) return ''; const d = date12(j); return `${JOURS[d.getDay()]} ${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS[d.getMonth()]}${annee ? ' ' + d.getFullYear() : ''}`; };
  const jourPlus = (j, n) => { const d = new Date(j + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const h5 = h => h ? String(h).slice(0, 5) : '';
  const minutes = h => { const m = /^(\d{1,2}):(\d{2})/.exec(h || ''); return m ? +m[1] * 60 + +m[2] : null; };
  const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  // « 14h00 », « 9h30 »
  const heure = h => { const m = minutes(h); return m === null ? '' : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`; };
  // comme dans les feuilles de la compagnie : « 9h », « 10h20 »
  const heureCourte = m => m == null ? '' : `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`;
  // un instant du planning : le jour et l'heure, les minutes pouvant passer minuit d'un côté ou de l'autre
  const instant = (jour, m) => { let j = jour, x = m; while (x < 0) { j = jourPlus(j, -1); x += 1440; } while (x >= 1440) { j = jourPlus(j, 1); x -= 1440; } return { jour: j, m: x }; };
  // « 50 min », « 1h45 »
  const dureeTexte = m => m == null || m === '' || isNaN(m) ? '' : +m < 60 ? `${Math.round(+m)} min` : `${Math.floor(+m / 60)}h${String(Math.round(+m) % 60).padStart(2, '0')}`;
  // la durée d'un spectacle, d'après sa fiche : « durée : 1h25 », « 55 minutes », « 1 h 30 » → minutes
  function dureeMinutes(t) {
    const s = norm(t);
    let m = /(\d+)\s*h(?:eures?)?\s*(\d{1,2})?/.exec(s);
    if (m) return +m[1] * 60 + (+m[2] || 0);
    m = /(\d+)\s*(?:min|mn)/.exec(s);
    return m ? +m[1] : null;
  }
  // « Manon, Lauren et Adrien »
  const listeEt = xs => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} et ${xs[xs.length - 1]}`;
  // un numéro français s'écrit « 06 12 34 56 78 » ; le lien tel: le compose au format international
  const chiffres = t => String(t || '').replace(/[^\d+]/g, '');
  const telTexte = t => { const c = chiffres(t); return /^0\d{9}$/.test(c) ? c.replace(/(\d{2})(?=\d)/g, '$1 ') : /^\+33\d{9}$/.test(c) ? ('0' + c.slice(3)).replace(/(\d{2})(?=\d)/g, '$1 ') : txt(t); };
  const telLien = t => { const c = chiffres(t); if (!c) return ''; return 'tel:' + (/^0\d{9}$/.test(c) ? '+33' + c.slice(1) : c); };
  const lienSur = u => /^(https?:|mailto:|tel:)/i.test(String(u || '').trim()) ? String(u).trim() : '';

  // ================================================================================================ la mise en page
  // Une seule mise en page pour l'éditeur (une page A4 à l'écran), l'impression et le PDF : mêmes marges, même police
  // (FdR Sans : Carlito, mêmes métriques que Calibri, réduite au latin), mêmes tailles, mêmes espaces. Les longueurs en
  // mm, les tailles et les espaces en points. Le PDF garde « surete » mm de plus en bas : si une ligne s'y coupe un peu
  // autrement qu'à l'écran, la page tient quand même, et les pages se coupent aux mêmes blocs.
  const MISE = {
    largeur: 210, hauteur: 297, haut: 15, bas: 15, gauche: 20, droite: 20, surete: 6,
    logo: 30, logoEcart: 8, sousLogo: 6,
    corps: 11, interligne: 1.2207, petit: 12,
    types: {
      entete: { taille: 14 },
      rubrique: { taille: 14, gras: true, avant: 13, apres: 3 },
      'sous-titre': { gras: true, avant: 8 },
      jour: { gras: true, avant: 10 },
      ligne: {}, alerte: { gras: true, rouge: true },
      puce: { puce: 12, texte: 24 },
      tableau: { taille: 10.5, avant: 4, apres: 4 },
    },
    rouge: '#e00000', surligne: '#ffff00', encre: '#000000', gris: '#8c8c8c',
  };
  const PT_MM = 72 / 25.4;
  const TYPES = ['entete', 'rubrique', 'sous-titre', 'jour', 'ligne', 'puce', 'alerte', 'saut', 'tableau'];
  const MARQUES = ['gras', 'italique', 'rouge', 'surligne'];
  const POLICE = '"FdR Sans", Carlito, Calibri, "Segoe UI", Arial, sans-serif';
  const vendorDefaut = ICI ? new URL('vendor/', ICI).href : 'vendor/';
  const dossierVendor = () => String(api.vendor || vendorDefaut).replace(/\/?$/, '/');
  const FICHIERS_POLICE = { normal: 'fdr-sans-regular.ttf', gras: 'fdr-sans-bold.ttf', italique: 'fdr-sans-italic.ttf', grasItalique: 'fdr-sans-bolditalic.ttf' };
  // les @font-face de FdR Sans (l'éditeur, l'impression, la version web)
  const cssPolices = () => {
    const d = dossierVendor();
    return [['normal', 400, 'normal'], ['gras', 700, 'normal'], ['italique', 400, 'italic'], ['grasItalique', 700, 'italic']]
      .map(([k, w, s]) => `@font-face{font-family:"FdR Sans";src:url("${d}${FICHIERS_POLICE[k]}") format("truetype");font-weight:${w};font-style:${s};font-display:swap}`).join('\n');
  };
  // les blocs sur la page, sous le sélecteur s (la racine du document : .a4-doc dans l'éditeur, .fdr-imp à l'impression)
  function cssPage(s) {
    const T = MISE.types, lh = MISE.interligne;
    return `${s}{font-family:${POLICE};font-size:${MISE.corps}pt;line-height:${lh};color:${MISE.encre};font-kerning:normal;font-variant-ligatures:none;font-synthesis:none;text-rendering:geometricPrecision;-webkit-font-smoothing:antialiased}
${s} .b{margin:0;padding:0;min-height:${lh}em;white-space:pre-wrap;overflow-wrap:break-word;text-align:left}
${s} .b-entete{font-size:${T.entete.taille}pt;padding-left:${MISE.logo + MISE.logoEcart}mm}
${s} .b-entete.petit{font-size:${MISE.petit}pt}
${s} .b-rubrique{font-size:${T.rubrique.taille}pt;font-weight:700;padding-top:${T.rubrique.avant}pt;padding-bottom:${T.rubrique.apres}pt}
${s} .b-sous-titre{font-weight:700;padding-top:${T['sous-titre'].avant}pt}
${s} .b-jour{font-weight:700;padding-top:${T.jour.avant}pt}
${s} .b-alerte{font-weight:700;color:${MISE.rouge}}
${s} .b-puce{position:relative;padding-left:${T.puce.texte}pt}
${s} .b-puce::before{content:"\\2022";position:absolute;left:${T.puce.puce}pt;top:0;font-weight:400;font-style:normal;color:${MISE.encre};background:none}
${s} .b-tableau{padding:${T.tableau.avant}pt 0 ${T.tableau.apres}pt;white-space:normal}
${s} .b-tableau table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:${T.tableau.taille}pt}
${s} .b-tableau td{border:.5pt solid #7a7a7a;padding:2pt 4pt;vertical-align:top;white-space:pre-wrap;overflow-wrap:break-word}
${s} .g{font-weight:700}
${s} .i{font-style:italic}
${s} .r{color:${MISE.rouge}}
${s} .s{background:${MISE.surligne}}`;
  }

  // ================================================================================================ les blocs
  let compteur = 0;
  const nouvelId = () => `b${(Date.now() % 1679616).toString(36)}${(compteur++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const seg = (texte, m = {}) => ({ texte: String(texte ?? ''), ...m });
  const amorce = texte => ({ texte, amorce: true });
  const memeFormat = (a, b) => !a.amorce && !b.amorce && MARQUES.every(k => !!a[k] === !!b[k]) && String(a.doc ?? '') === String(b.doc ?? '') && (a.lien || '') === (b.lien || '');
  // des segments propres : fusionnés quand ils se ressemblent, sans texte vide, sans retour à la ligne
  function segments(xs) {
    const out = [];
    for (const s0 of Array.isArray(xs) ? xs : []) {
      if (!s0 || s0.texte == null) continue;
      const s = { texte: String(s0.texte).replace(/\r\n?|\n|\t/g, ' ') };
      if (s0.amorce) s.amorce = true;
      MARQUES.forEach(k => { if (s0[k]) s[k] = true; });
      if (s0.doc != null && s0.doc !== '') s.doc = s0.doc;
      if (s0.lien && lienSur(s0.lien)) s.lien = lienSur(s0.lien);
      if (!s.texte && !s.amorce) continue;
      const p = out[out.length - 1];
      if (p && memeFormat(p, s)) p.texte += s.texte; else out.push(s);
    }
    return out;
  }
  const texteSegs = (xs, amorces = false) => (xs || []).filter(s => amorces || !s.amorce).map(s => s.texte).join('');
  const texteBloc = (b, amorces = false) => b.type === 'tableau' ? (b.lignes || []).map(l => l.map(c => texteSegs(c, amorces)).join(' ')).join(' ') : texteSegs(b.segments, amorces);
  const aAmorce = b => b.type === 'tableau' ? (b.lignes || []).some(l => l.some(c => c.some(s => s.amorce))) : (b.segments || []).some(s => s.amorce);
  function bloc(b) {
    const x = { id: txt(b?.id) || nouvelId(), type: TYPES.includes(b?.type) ? b.type : 'ligne' };
    if (x.type === 'tableau') {
      const lignes = Array.isArray(b.lignes) && b.lignes.length ? b.lignes : [[[]]];
      const n = Math.max(1, ...lignes.map(l => (Array.isArray(l) ? l.length : 0)));
      x.lignes = lignes.map(l => Array.from({ length: n }, (_, i) => segments(Array.isArray(l) ? l[i] : [])));
    } else x.segments = x.type === 'saut' ? [] : segments(b?.segments);
    if (b?.petit && x.type === 'entete') x.petit = true;
    if (x.type === 'jour' && estJour(b?.date)) x.date = b.date;
    if (b?.cle) x.cle = String(b.cle);
    if (b?.source === 'base') x.source = 'base';
    if (b?.origine && typeof b.origine === 'object') x.origine = { jour: estJour(b.origine.jour) ? b.origine.jour : null, heure: h5(b.origine.heure) || null, fin: h5(b.origine.fin) || null, rep: !!b.origine.rep };
    return x;
  }
  // les blocs tels qu'ils sortent (PDF, impression, version web, planning) : sans amorce ; un bloc qui n'était qu'amorce
  // disparaît, de même qu'une rubrique restée vide ; « heure ? : représentation » devient « représentation ». debuts :
  // les blocs qui commencent une page ; quand l'un d'eux disparaît, le suivant commence la page (debutPage).
  function visibles(blocs, debuts = null) {
    const paires = (blocs || []).map(b => {
      if (b.type === 'tableau') return [b, { ...b, lignes: b.lignes.map(l => l.map(c => segments(c.filter(s => !s.amorce)))) }];
      if (b.type === 'saut') return [b, b];
      const avait = aAmorce(b);
      let xs = (b.segments || []).filter(s => !s.amorce).map(s => ({ ...s }));
      if (avait && xs.length) {
        if (b.segments[0]?.amorce) xs[0].texte = xs[0].texte.replace(/^\s*[:–—-]?\s*/, '');
        if (b.segments[b.segments.length - 1]?.amorce) xs[xs.length - 1].texte = xs[xs.length - 1].texte.replace(/\s*[:–—-]?\s*$/, '');
      }
      xs = segments(xs);
      return [b, avait && !texteSegs(xs).trim() ? null : { ...b, segments: xs }];
    });
    const plein = v => v && v.type !== 'saut' && (v.type === 'tableau' || !!texteSegs(v.segments).trim());
    paires.forEach(([b, v], i) => {
      if (!v || b.type !== 'rubrique') return;
      let k = i + 1;
      while (k < paires.length && paires[k][0].type !== 'rubrique' && !plein(paires[k][1])) k++;
      if (k >= paires.length || paires[k][0].type === 'rubrique') paires[i][1] = null;
    });
    const out = [];
    let report = false;
    paires.forEach(([b, v]) => {
      const debut = !!(debuts && debuts.has(String(b.id)));
      if (!v) { if (debut) report = true; return; }
      out.push(debut || report ? { ...v, debutPage: true } : v);
      report = false;
    });
    return out;
  }

  // ------------------------------------------------------------------------------------------------ heures et jours écrits
  // l'heure au début d'une ligne : « 9h : », « 10h-11h : », « 14h10 : », « à partir de 9h : », « de 9h à 18h : »
  const TOK = '\\d{1,2}\\s?[hH](?:\\s?\\d{2})?(?![A-Za-zÀ-ÿ])|\\d{1,2}:\\d{2}';
  const RE_DEBUT = new RegExp(`^\\s*(?:(?:[àaÀA]\\s+partir\\s+de|[dD][èeÈE]s|[vV]ers|[dD]e|[àaÀA])\\s+)?(${TOK})(?:\\s*(?:-|–|—|[àa]|>)\\s*(${TOK}))?`);
  const minutesDe = t => { const m = /^(\d{1,2})\s?[hH:]\s?(\d{2})?$/.exec(String(t).trim()); if (!m) return null; const h = +m[1], mn = +(m[2] || 0); return h <= 24 && mn <= 59 ? (h % 24) * 60 + mn : null; };
  function lireHeure(texte) {
    const s = String(texte || ''), m = RE_DEBUT.exec(s);
    if (!m) return null;
    const a = minutesDe(m[1]);
    if (a === null) return null;
    const b = m[2] ? minutesDe(m[2]) : null;
    let reste = s.slice(m[0].length);
    // « 10h-11h, 11h-12h et 15h-16h : 4 ateliers » : le texte suit les deux-points
    if (/^\s*[,;/]|^\s+et\s/.test(reste) && reste.includes(':')) reste = reste.slice(reste.indexOf(':') + 1);
    reste = reste.replace(/^\s*(?::|–|—|-)\s*/, '').trim();
    return { heure: hhmm(a), fin: b === null ? null : hhmm(b), reste };
  }
  // le jour d'un titre écrit à la main : « mardi 16 décembre », « 16/12 » ; l'année, celle qui tombe le plus près de ref
  const NOMS_MOIS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
  function dateDuTexte(texte, ref) {
    const s = norm(texte);
    let j = null, mo = null, an = null, m = /(\d{1,2})(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)(?:\s+(\d{4}))?/.exec(s);
    if (m) { j = +m[1]; mo = NOMS_MOIS.indexOf(m[2]) + 1; an = m[3] ? +m[3] : null; }
    else if ((m = /(?:^|\D)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?!\d)/.exec(s))) { j = +m[1]; mo = +m[2]; an = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : null; }
    if (!j || !mo || mo > 12 || j > 31) return null;
    const iso = y => `${y}-${String(mo).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
    if (an) return iso(an);
    const r = estJour(ref) ? ref : new Date().toISOString().slice(0, 10), y = +r.slice(0, 4);
    return [y - 1, y, y + 1].map(iso).sort((a, b) => Math.abs(date12(a) - date12(r)) - Math.abs(date12(b) - date12(r)))[0];
  }

  // ================================================================================================ composer
  // le déroulé type proposé quand un spectacle n'en a pas (le même que l'import, supabase/equipe.py)
  const DEROULE = [
    { avant_min: 480, quoi: 'Arrivée de la régie, déchargement et montage', qui: 'Technique', jours: 'premier' },
    { avant_min: 240, quoi: 'Arrivée de l’équipe artistique', qui: 'Jeu', jours: 'tous' },
    { avant_min: 180, quoi: 'Raccords', qui: 'Toute l’équipe', jours: 'premier' },
    { avant_min: 120, quoi: 'Repas', qui: 'Toute l’équipe', jours: 'premier' },
    { avant_min: 60, quoi: 'Préparation : habillage, maquillage, échauffement', qui: 'Jeu', jours: 'tous' },
    { avant_min: 30, quoi: 'Ouverture des portes', qui: '', jours: 'premier' },
    { avant_min: -15, fin: true, quoi: 'Démontage et chargement', qui: 'Technique', jours: 'dernier' },
  ];
  const estApres = e => e.fin === true || (+e.avant_min || 0) < 0;
  const CHAQUE_JOUR = /arrivee\s+(de\s+)?(l['’]\s*|la\s+|les\s+)?(equipe\s+artistique|artistes?|comedien|interpretes?)|preparation|habillage|maquillage|echauffement|mise\s+en\s+condition/;
  // le jour d'une étape sur plusieurs jours de suite : 'premier', 'tous' ou 'dernier'
  const joursEtape = e => ['premier', 'tous', 'dernier'].includes(e?.jours) ? e.jours : estApres(e || {}) ? 'dernier' : CHAQUE_JOUR.test(norm(e?.quoi)) ? 'tous' : 'premier';
  const plancher15 = m => Math.floor(m / 15) * 15, plafond15 = m => Math.ceil(m / 15) * 15;
  const cleTemps = r => `${estJour(r.jour) ? r.jour : '9999-99-99'} ${minutes(h5(r.heure)) === null ? '99:99' : h5(r.heure).padStart(5, '0')}`;
  const trier = xs => (Array.isArray(xs) ? xs : []).map((r, i) => [r, i]).sort((a, b) => cleTemps(a[0]) < cleTemps(b[0]) ? -1 : cleTemps(a[0]) > cleTemps(b[0]) ? 1 : a[1] - b[1]).map(x => x[0]);
  const PUBLIC_TEXTE = { scolaire: 'scolaire', tout_public: 'tout public' };
  const NATURES = { repetitions: 'répétitions', residence: 'résidence', autre: 'séance' };
  const cleMot = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'x';

  // Les heures d'une journée, comme dans les feuilles de la compagnie. Avant 8h, on ne travaille pas : le montage et les
  // raccords qui tomberaient plus tôt passent la veille (à partir de 9h, ou de 14h s'ils tiennent dans l'après-midi), et
  // le jour J commence par l'arrivée de l'équipe, vers 8h au plus tôt et au moins une heure avant la représentation.
  // Jamais rien avant 6h. Un repas du déroulé ne s'écrit que dans une plage de repas (midi : 11h30-14h, soir :
  // 18h30-21h) ; une représentation le matin et une l'après-midi : le déjeuner entre les deux. Ce qui est déplacé ou
  // ramené à ces heures reste estimé (estime : « à vérifier »).
  const H6 = 6 * 60, H8 = 8 * 60, MIDI = [11 * 60 + 30, 14 * 60], SOIR = [18 * 60 + 30, 21 * 60];
  const dansRepas = m => m != null && ((m >= MIDI[0] && m <= MIDI[1]) || (m >= SOIR[0] && m <= SOIR[1]));
  // le montage et les raccords (ce qui peut se faire la veille), l'arrivée de l'équipe, les repas
  const TECHNIQUE = /montage|dechargement|installation|implantation|reglages?\b|raccords?\b|balances?\b|pointage|arrivee\s+de\s+la\s+regie/;
  const ARRIVEE = /^(arrivee|rdv|rendez-vous)\b/;
  const REPAS = /repas|dejeuner|diner|catering/;

  // les étapes du planning d'une date : [{jour, m (minutes ou null), quoi, qui, rep, note, cle, seance, veille, estime,
  // dejeuner}]
  function etapesPlanning(seances, nature, modele, duree) {
    const vivantes = seances.filter(r => !r.annulee && estJour(r.jour));
    const jours = [...new Set(vivantes.map(r => r.jour))].sort();
    const out = [];
    if (nature && nature !== 'representations') {
      // répétitions, résidence : les séances elles-mêmes, « 9h-18h : répétitions »
      vivantes.forEach((r, k) => out.push({ jour: r.jour, m: minutes(r.heure), fin: minutes(r.fin), quoi: txt(r.note) || NATURES[nature] || 'séance', qui: '', seance: true, cle: `pl:${r.jour}:seance:${r.id ?? k}` }));
      return ordonner(out);
    }
    const etapes = (Array.isArray(modele) ? modele : []).filter(e => e && txt(e.quoi));
    // une étape à zéro minute, avant : la représentation elle-même (son nom, ses gens)
    const gabarit = etapes.find(e => !estApres(e) && (+e.avant_min || 0) === 0);
    const avant = etapes.filter(e => e !== gabarit && !estApres(e)).sort((a, b) => (+b.avant_min || 0) - (+a.avant_min || 0));
    const apres = etapes.filter(estApres).sort((a, b) => Math.abs(+a.avant_min || 0) - Math.abs(+b.avant_min || 0));
    const repas = etapes.find(e => REPAS.test(norm(e.quoi)));
    const vus = new Map();
    const cleEtape = (j, e) => { const k = `pl:${j}:${cleMot(e.quoi)}`; const n = vus.get(k) || 0; vus.set(k, n + 1); return n ? `${k}-${n + 1}` : k; };
    const etape = (jour, m, e, extra = {}) => {
      const x = m === null ? { jour, m: null } : instant(jour, m);
      out.push({ ...x, fin: null, quoi: txt(e.quoi), qui: txt(e.qui), cle: cleEtape(x.jour, e), ...extra });
    };
    // la durée d'une étape « avant » : jusqu'à l'étape suivante du déroulé (une heure, à défaut)
    const dureeEtape = e => { const sv = avant[avant.indexOf(e) + 1]; return sv ? Math.max(15, (+e.avant_min || 0) - (+sv.avant_min || 0)) : 60; };
    jours.forEach((j, i) => {
      const premier = i === 0 || jourPlus(jours[i - 1], 1) !== j;
      const dernier = i === jours.length - 1 || jourPlus(j, 1) !== jours[i + 1];
      const garde = e => { const q = joursEtape(e); return q === 'tous' || (q === 'premier' && premier) || (q === 'dernier' && dernier); };
      const rs = vivantes.filter(r => r.jour === j).sort((a, b) => (minutes(a.heure) ?? 1e9) - (minutes(b.heure) ?? 1e9));
      const t0 = minutes(rs[0].heure);
      if (t0 === null) avant.filter(garde).forEach(e => etape(j, null, e));
      else {
        const veille = [], lignes = [];
        avant.filter(garde).forEach(e => {
          const q = norm(e.quoi), m = t0 - (+e.avant_min || 0);
          if (TECHNIQUE.test(q)) {
            if (m >= H8) lignes.push({ e, m });
            else if (premier) veille.push(e);
            else lignes.push({ e, m: Math.max(H6, Math.min(H8, t0)), estime: true });
            return;
          }
          if (ARRIVEE.test(q)) { const a = Math.max(H6, Math.min(Math.max(m, H8), t0 - 60)); lignes.push({ e, m: a, arrivee: true, estime: a !== m }); return; }
          if (REPAS.test(q)) { if (dansRepas(m)) lignes.push({ e, m }); return; }
          lignes.push({ e, m });
        });
        // le jour J commence par l'arrivée de l'équipe : rien d'autre avant elle, ni avant 6h (le montage du jour excepté)
        const debut = lignes.find(x => x.arrivee)?.m ?? null;
        lignes.forEach(x => {
          if (x.arrivee || TECHNIQUE.test(norm(x.e.quoi))) return;
          const plancher = Math.max(H6, debut ?? Math.min(H8, t0));
          if (x.m < plancher) { x.m = Math.min(plancher, t0); x.estime = true; }
        });
        if (veille.length) {
          // la veille, sur une plage de journée : à partir de 9h, ou de 14h si tout tient dans l'après-midi ; le jour J,
          // toute l'équipe arrive ensemble
          const v = jourPlus(j, -1), a = veille[0], z = veille[veille.length - 1];
          const d = (+a.avant_min || 0) - (+z.avant_min || 0) + dureeEtape(z);
          const depart = d <= 4 * 60 ? 14 * 60 : 9 * 60;
          veille.forEach(e => etape(v, depart + (+a.avant_min || 0) - (+e.avant_min || 0), e, { estime: true, veille: true }));
          lignes.forEach(x => { if (x.arrivee) x.qui = 'tout le monde'; });
        }
        lignes.forEach(x => etape(j, x.m, x.e, { estime: !!x.estime, ...(x.qui ? { qui: x.qui } : {}) }));
      }
      rs.forEach((r, k) => {
        const t = minutes(r.heure);
        out.push({ jour: j, m: t, fin: minutes(r.fin), quoi: txt(gabarit?.quoi) || 'Représentation', qui: txt(gabarit?.qui), rep: true, public: r.public, note: txt(r.note), cle: `pl:${j}:rep:${r.id ?? k}` });
        const suivante = rs[k + 1], t2 = suivante ? minutes(suivante.heure) : null;
        if (t === null || t2 === null) return;
        const fin = t + (duree || 90);
        // une représentation le matin, une l'après-midi : le déjeuner entre les deux
        if (t < 12 * 60 && t2 >= 12 * 60) { out.push({ jour: j, m: null, ordre: (fin + t2) / 2, fin: null, quoi: 'déjeuner', qui: 'tout le monde', dejeuner: true, cle: `pl:${j}:dejeuner:${k}` }); return; }
        // un long écart (plus de trois heures) : un repas, dans une plage de repas
        if (t2 - fin > 180) {
          let m = t2 - Math.max(30, +repas?.avant_min || 120);
          m = m < fin + 30 ? plafond15(fin + 30) : plancher15(m);
          if (!dansRepas(m)) {
            const soir = [Math.max(fin + 30, SOIR[0]), Math.min(t2 - 30, SOIR[1])], midi = [Math.max(fin + 30, MIDI[0]), Math.min(t2 - 30, MIDI[1])];
            m = soir[0] <= soir[1] ? plafond15(soir[0]) : midi[0] <= midi[1] ? plafond15(midi[0]) : null;
          }
          if (m !== null) etape(j, m, repas || { quoi: 'Repas', qui: 'Toute l’équipe' }, { cle: `pl:${j}:repas-entre:${k}` });
        }
      });
      const tz = minutes(rs[rs.length - 1].heure);
      // après la dernière représentation ; passé minuit, à vérifier
      apres.filter(garde).forEach(e => { const m = tz === null || !duree ? null : tz + duree + Math.abs(+e.avant_min || 0); etape(j, m, e, { estime: m !== null && m >= 24 * 60 }); });
    });
    return ordonner(out);
  }
  // dans l'ordre du temps, jour par jour ; une ligne sans heure garde sa place parmi les autres (le déjeuner, sa place
  // entre deux représentations)
  function ordonner(xs) {
    const parJour = new Map();
    xs.forEach((x, i) => { if (!parJour.has(x.jour)) parJour.set(x.jour, []); parJour.get(x.jour).push({ x, i }); });
    return [...parJour.keys()].sort().flatMap(j => {
      let avant = -1;
      const ys = parJour.get(j).map(y => { const k = y.x.m ?? y.x.ordre; const cle = k == null ? avant + 0.001 : k; avant = cle; return { ...y, cle }; });
      return ys.sort((a, b) => a.cle - b.cle || a.i - b.i).map(y => { const { ordre, ...x } = y.x; return x; });
    });
  }

  // les étapes du planning d'une date, en lignes simples (l'onglet « Déroulé type » de l'administration en montre un exemple)
  //   → [{jour, heure: 'HH:MM' | '', fin, quoi, qui, rep, veille, estime}]
  function etapes({ representations = [], spectacle = {}, date = {} } = {}) {
    const seances = representations.filter(r => estJour(r?.jour)).map(r => ({ id: r.id ?? null, jour: r.jour, heure: h5(r.heure), fin: h5(r.fin), public: r.public || 'tout_public', note: txt(r.note), annulee: !!r.annulee }));
    return etapesPlanning(seances, date.nature, spectacle.feuille_modele, dureeMinutes(spectacle.duree)).map(e => ({
      jour: e.jour, heure: e.m == null ? '' : hhmm(e.m), fin: e.fin == null ? '' : hhmm(e.fin),
      quoi: e.rep && PUBLIC_TEXTE[e.public] ? `${e.quoi} ${PUBLIC_TEXTE[e.public]}` : e.quoi, qui: e.qui, rep: !!e.rep, veille: !!e.veille, estime: !!e.estime }));
  }

  // un contact écrit à la main (« Marie Dupont, 06 12 34 56 78, marie@lieu.fr ») : nom, téléphone, adresse électronique
  const RE_TEL = /(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}(?!\d)/;
  const RE_MEL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
  function lireContact(texte, role) {
    let reste = String(texte || '');
    const tel = (reste.match(RE_TEL) || [''])[0], mel = (reste.match(RE_MEL) || [''])[0];
    if (tel) reste = reste.replace(tel, ' ');
    if (mel) reste = reste.replace(mel, ' ');
    reste = reste.replace(/\b(t[ée]l[ée]?(?:phone)?|portable|mobile|courriel|e-?mail|m[ée]l)\s*[.:]?\s*(?=[\s,;–—-]|$)/gi, ' ')
      .replace(/\(\s*\)/g, ' ').replace(/\s*[,;–—-]\s*(?=[,;–—-]|$)/g, '').replace(/^\s*[,;:–—-]\s*/, '').replace(/\s+/g, ' ').replace(/[\s,;:–—-]+$/, '').trim();
    const m = /^([^:\d@,]{2,24}?)\s*:\s*(\S.*)$/.exec(reste);
    if (m && m[1].trim().split(/\s+/).length <= 2) { role = `${role} (${m[1].trim()[0].toLowerCase()}${m[1].trim().slice(1)})`; reste = m[2]; }
    return { nom: reste, role, telephone: tel ? telTexte(tel) : '', email: mel };
  }
  function composerContacts(suivi, autres) {
    const out = [];
    const ajouter = c => {
      if (!c || (!txt(c.nom) && !txt(c.telephone) && !txt(c.email))) return;
      const dejaLa = out.find(x => (txt(c.telephone) && chiffres(x.telephone) === chiffres(c.telephone)) || (txt(c.email) && norm(x.email) === norm(c.email)) || (txt(c.nom) && norm(x.nom) === norm(c.nom) && norm(x.role) === norm(c.role)));
      if (!dejaLa) out.push({ nom: txt(c.nom), role: txt(c.role), telephone: telTexte(c.telephone), email: txt(c.email) });
    };
    const s = suivi || {};
    if (txt(s.organisateur)) ajouter(lireContact(s.organisateur, 'Organisateur'));
    if (txt(s.contact)) ajouter(lireContact(s.contact, 'Contact de la date'));
    const cl = s.lieu?.contact ?? s.lieu_contact;
    if (txt(cl)) ajouter(lireContact(cl, 'Contact du lieu'));
    (autres || []).forEach(ajouter);
    return out;
  }
  // la distance depuis le départ : à vol d'oiseau × 1,3 ; la durée, d'après une vitesse moyenne qui croît avec la distance
  function distanceKm(a, b) {
    const r = x => x * Math.PI / 180, R = 6371;
    const dl = r(b.latitude - a.latitude), dg = r(b.longitude - a.longitude);
    const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(dg / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const dureeRoute = km => Math.max(5, Math.round(km / (km < 30 ? 45 : km < 100 ? 65 : km < 250 ? 85 : 95) * 60 / 5) * 5);
  const aPosition = x => x && x.latitude != null && x.longitude != null && x.latitude !== '' && !isNaN(x.latitude) && !isNaN(x.longitude);
  const itineraire = l => aPosition(l) ? `https://www.google.com/maps/dir/?api=1&destination=${(+l.latitude).toFixed(5)},${(+l.longitude).toFixed(5)}` : '';
  const carteAdresse = a => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;

  // « au Théâtre des Arts », « à l’Espace Rotonde », « à la Maison de la culture », « à Commédiamuse »
  function aLieu(nom) {
    const n = txt(nom), k = norm(n);
    if (/^le\s/i.test(n)) return `au ${n.slice(3)}`;
    if (/^les\s/i.test(n)) return `aux ${n.slice(4)}`;
    if (/^la\s/i.test(n)) return `à la ${n.slice(3)}`;
    if (/^l['’]\s?/i.test(n)) return `à l’${n.replace(/^l['’]\s?/i, '')}`;
    if (/^(espace|opera|atelier|auditorium|archipel|eclat|etoile|odyssee|agora|alhambra|arsenal|entrepot|hotel|institut|ecole|eglise|abbaye|usine|ile)\b/.test(k)) return `à l’${n}`;
    if (/^(theatre|centre|lycee|college|chateau|musee|cinema|conservatoire|festival|foyer|pole|studio|hangar|manege|cirque|forum|carre|cube|quai|moulin|prieure|palais|parc|jardin|complexe|domaine|relais|club|cafe|zenith|dome|kiosque|chapiteau|tetris|volcan|rive)\b/.test(k)) return `au ${n}`;
    if (/^(maison|salle|scene|mediatheque|bibliotheque|chapelle|halle|ferme|grange|comedie|fabrique|friche|gare|mjc|mairie|cour|cite|villa|piscine|caserne|filature|base|grande|petite|nouvelle)\b/.test(k)) return `à la ${n}`;
    return `à ${n}`;
  }
  // « le 18 décembre 2026 », « du 17 au 21 novembre 2026 », « du 30 novembre au 2 décembre 2026 »
  function quandTexte(debut, fin) {
    if (!estJour(debut)) return '';
    const f = estJour(fin) && fin > debut ? fin : debut;
    const j = x => { const d = date12(x); return d.getDate() === 1 ? '1er' : String(d.getDate()); };
    const mo = x => MOIS[date12(x).getMonth()], an = x => x.slice(0, 4);
    if (f === debut) return `le ${j(debut)} ${mo(debut)} ${an(debut)}`;
    if (an(debut) !== an(f)) return `du ${j(debut)} ${mo(debut)} ${an(debut)} au ${j(f)} ${mo(f)} ${an(f)}`;
    if (mo(debut) !== mo(f)) return `du ${j(debut)} ${mo(debut)} au ${j(f)} ${mo(f)} ${an(f)}`;
    return `du ${j(debut)} au ${j(f)} ${mo(f)} ${an(f)}`;
  }
  const premierMot = s => txt(s).split(/\s+/)[0] || '';
  // la catégorie d'une personne d'après sa fonction, quand la distribution ne la donne pas
  const categorieDe = f => { const s = norm(f); return /regi|techni|lumiere|eclairag|\bson\b|sonor|plateau|machin|construct|video/.test(s) ? 'technique' : /jeu|comedi|interpr|acteur|actrice|danse|musicien|chant|marionnett/.test(s) ? 'jeu' : /mise en scene|creat|scenograph|costum|ecriture|auteur|autrice/.test(s) ? 'creation' : /admin|product|diffusion|charge/.test(s) ? 'production' : ''; };

  // Le contenu d'une feuille neuve, dans la forme des feuilles de la compagnie, avec tout ce que la base sait.
  //   sources = { date (nature, debut, fin), spectacle (titre, duree, feuille_modele), lieu, representations (jour, heure,
  //     fin, public, note, annulee, id), equipe: [{personne_id, prenom, nom, fonction, categories, telephone}],
  //     contacts: [{nom, prenom, role, telephone, email}] (l'administration et la régie générale de la compagnie),
  //     depart: {commune, latitude, longitude}, suivi: {organisateur, contact, lieu: {contact, jauge, plateau}},
  //     documents: [{id, titre, pour}], anterieures: [{contenu, debut, lieu_id, spectacle_id, lieu: {nom, commune}}] }
  // Repas, transports et hébergement viennent de la feuille précédente du même spectacle (l'hébergement et les contacts
  // écrits à la main, seulement d'une feuille au même lieu) ; sinon une amorce.
  function composer(sources) {
    const S = sources || {}, d = S.date || {}, sp = S.spectacle || {}, l = S.lieu || null, suivi = S.suivi || {};
    const nature = NATURES[d.nature] ? d.nature : 'representations';
    const seances = (S.representations || []).filter(r => estJour(r.jour))
      .map(r => ({ id: r.id ?? null, jour: r.jour, heure: h5(r.heure), fin: h5(r.fin), public: r.public || 'tout_public', note: txt(r.note), annulee: !!r.annulee }))
      .sort((a, b) => cleTemps(a) < cleTemps(b) ? -1 : cleTemps(a) > cleTemps(b) ? 1 : 0);
    const equipe = (S.equipe || []).map(p => ({ id: p.personne_id ?? p.id ?? null, prenom: txt(p.prenom) || premierMot(p.nom), nom: txt(p.nom), fonction: txt(p.fonction),
      categories: (Array.isArray(p.categories) && p.categories.length ? p.categories : [categorieDe(p.fonction)]).filter(Boolean), telephone: telTexte(p.telephone) })).filter(p => p.prenom);
    // un prénom porté par deux personnes : « Adrien D. » et « Adrien M. »
    const prenomDe = p => equipe.filter(x => norm(x.prenom) === norm(p.prenom)).length > 1 && p.nom ? `${p.prenom} ${(p.nom.split(/\s+/).find(m => norm(m) !== norm(p.prenom)) || '')[0] || ''}.` : p.prenom;
    const quiDe = qui => {
      const n = norm(qui).replace(/[’']/g, "'").trim();
      if (!n) return '';
      if (/^(toute?s?\s+l'equipe|tout le monde|tous|toutes|l'equipe|equipe|toute l'equipe artistique et technique)$/.test(n)) return 'tout le monde';
      const cat = /^(la\s+)?(technique|regie|l'equipe technique|equipe technique|techniciens?|regisseu(r|se)s?|regie generale)$/.test(n) ? 'technique'
        : /^(le\s+)?(jeu|comedien(ne)?s?|artistes?|l'equipe artistique|equipe artistique|interpretes?|acteurs?|actrices?)$/.test(n) ? 'jeu'
          : /^creation$/.test(n) ? 'creation' : /^production$/.test(n) ? 'production' : null;
      if (!cat) return txt(qui);
      const xs = equipe.filter(p => p.categories.includes(cat));
      return xs.length ? listeEt(xs.map(prenomDe)) : minuscule(txt(qui));
    };
    const jours = [...new Set(seances.filter(r => !r.annulee).map(r => r.jour))].sort();
    const debut = jours[0] || (estJour(d.debut) ? d.debut : ''), fin = jours[jours.length - 1] || (estJour(d.fin) ? d.fin : debut);
    const blocs = [];
    const B = (type, segs, extra = {}) => blocs.push({ type, segments: segments(segs), ...extra });
    const base = (type, segs, cle, extra = {}) => B(type, segs, { cle, source: 'base', ...extra });

    // ---- l'en-tête, à droite du logo
    base('entete', [seg('FEUILLE DE ROUTE', { gras: true, italique: true })], 'entete:titre');
    base('entete', [txt(sp.titre) ? seg(txt(sp.titre), { gras: true, italique: true }) : amorce('spectacle ?')], 'entete:spectacle');
    base('entete', equipe.length ? [seg(`avec ${listeEt(equipe.map(prenomDe))}`)] : [amorce('avec qui ?')], 'entete:avec', { petit: true });
    const quand = quandTexte(debut, fin);
    base('entete', quand ? [seg(nature === 'representations' ? quand : `${NATURES[nature]} ${quand}`, { gras: true })] : [amorce('quand ?')], 'entete:quand');
    const ouTexte = l ? (txt(l.nom) ? `${aLieu(l.nom)}${txt(l.commune) && !norm(l.nom).includes(norm(l.commune)) ? `, ${txt(l.commune)}` : ''}` : `à ${txt(l.commune)}`) : '';
    base('entete', ouTexte ? [seg(ouTexte, { gras: true })] : [amorce('où ?')], 'entete:ou');

    // ---- le planning, jour par jour
    B('rubrique', [seg('Planning')], { cle: 'rub:planning' });
    const duree = dureeMinutes(sp.duree);
    const etapes = etapesPlanning(seances, nature, sp.feuille_modele, duree);
    // le départ, d'après la route (estimée) : avant la première étape du premier jour
    let route = null;
    if (aPosition(S.depart) && aPosition(l)) { const km = Math.round(distanceKm(S.depart, l) * 1.3); if (km >= 8) route = { km, min: dureeRoute(km) }; }
    const joursPl = [...new Set(etapes.map(e => e.jour))].sort();
    if (!joursPl.length) B('ligne', [amorce('aucune séance avec un jour : ajoutez les représentations de la date, puis « Mettre à jour depuis la base »')]);
    let veilleDepart = false;
    joursPl.forEach((j, i) => {
      base('jour', [seg(jourLong(j, false))], `jour:${j}`, { date: j });
      const du = etapes.filter(e => e.jour === j);
      // le départ, d'après la route (estimée) : avant la première étape sur place du premier jour, jamais avant 6h ;
      // plus tôt, on arrive la veille (hébergement à prévoir)
      if (i === 0 && route) {
        const t = du.find(e => e.m != null)?.m;
        const m = t == null ? null : plancher15(t - route.min - 15);
        const estimation = `environ ${route.km} km et ${dureeTexte(route.min)} de route`;
        if (m != null && m < H6) {
          veilleDepart = true;
          base('ligne', [amorce(`arrivée la veille, hébergement à prévoir : ${estimation}`)], `pl:${j}:depart`, { origine: { jour: j, heure: null, fin: null, rep: false } });
        } else {
          base('ligne', [...(m != null ? [seg(`${heureCourte(m)} : `)] : [amorce('heure de départ ?'), seg(' : ')]), seg(`départ de ${txt(S.depart.commune) || 'Rouen'} `),
            amorce(`${estimation} : à vérifier`)], `pl:${j}:depart`, { origine: { jour: j, heure: m != null ? hhmm(m) : null, fin: null, rep: false } });
        }
      }
      du.forEach(e => {
        const h = e.m == null ? null : e.m, f = e.fin == null ? null : e.fin;
        const qui = quiDe(e.qui);
        // entre une représentation du matin et une de l'après-midi
        if (e.dejeuner) { base('ligne', [seg('déjeuner : '), seg(qui || 'tout le monde', { surligne: true })], e.cle, { origine: { jour: j, heure: null, fin: null, rep: false } }); return; }
        const tete = h == null ? [amorce('heure ?'), seg(' : ')] : [seg(`${heureCourte(h)}${f != null ? `-${heureCourte(f)}` : ''} : `)];
        const quoi = e.rep ? `${minuscule(e.quoi)}${PUBLIC_TEXTE[e.public] ? ` ${PUBLIC_TEXTE[e.public]}` : ''}` : minuscule(e.quoi);
        // déplacé à la veille, ramené à des heures de journée, ou passé minuit : estimé
        const verif = e.estime || (h != null && h < H6 && !e.seance) ? [amorce(' à vérifier')] : [];
        const segs = e.rep
          ? [...tete.map(x => x.amorce ? x : { ...x, gras: true }), seg(quoi, { gras: true }), ...(e.note ? [seg(` (${e.note})`)] : []), ...(qui ? [seg(' '), seg(`/ ${qui}`, { surligne: true })] : [])]
          : [...tete, seg(quoi), ...(qui ? [seg(' '), seg(`/ ${qui}`, { surligne: true })] : []), ...verif];
        base('ligne', segs, e.cle, { origine: { jour: j, heure: h == null ? null : hhmm(h), fin: f == null ? null : hhmm(f), rep: !!e.rep } });
      });
    });

    // ---- repas, transports, hébergement : la feuille précédente, sinon une amorce
    const ref = debut || d.debut || '';
    const avant = (S.anterieures || []).filter(x => x && x.contenu).map(x => ({ ...x, contenu: contenu({ contenu: x.contenu }).blocs }))
      .sort((a, b) => { const pa = (a.debut || '') < ref, pb = (b.debut || '') < ref; return pa !== pb ? (pa ? -1 : 1) : pa ? ((a.debut || '') < (b.debut || '') ? 1 : -1) : ((a.debut || '') < (b.debut || '') ? -1 : 1); });
    const memeLieu = x => l && x.lieu_id != null && String(x.lieu_id) === String(l.id);
    const memeSp = x => sp.id != null && x.spectacle_id != null && String(x.spectacle_id) === String(sp.id);
    const source = (filtre, ordre) => avant.filter(filtre).sort((a, b) => ordre(b) - ordre(a))[0] || null;
    const origineTexte = x => `repris de la feuille ${x.debut ? `du ${jourLong(x.debut)}` : 'précédente'}${x.lieu?.nom || x.lieu?.commune ? ` (${txt(x.lieu.nom) || txt(x.lieu.commune)})` : ''} : à vérifier`;
    const rubrique = (k, titre, mots, x, vide, filtre) => {
      B('rubrique', [seg(titre)], { cle: `rub:${k}` });
      const repris = x ? extraire(x.contenu, k, mots, filtre) : [];
      if (repris.length) { B('ligne', [amorce(origineTexte(x))]); repris.forEach(b => blocs.push(b)); }
      else B('ligne', [amorce(vide)]);
    };
    const parSp = source(memeSp, x => memeLieu(x) ? 1 : 0), parLieu = source(memeLieu, x => memeSp(x) ? 1 : 0);
    rubrique('repas', 'Repas', /^repas|^restauration/, parSp, 'qui prend en charge les repas ? (repas fournis par le lieu, défraiement)');
    rubrique('transports', 'Transports', /^transports?|^deplacements?|^trajets?/, parSp, 'véhicules, trains, covoiturage, remboursement des frais ?');
    // une seule journée, près de Rouen, sans arrivée la veille : pas d'hébergement
    const proche = route ? route.km < 100 : aPosition(S.depart) && aPosition(l);
    const uneNuit = joursPl.length <= 1 && proche && !veilleDepart;
    if (!uneNuit || parLieu) rubrique('hebergement', 'Hébergement', /^hebergements?|^hotels?|^logements?/, parLieu, 'hôtel : nom, adresse, heure d’arrivée ?');

    // ---- adresses et contacts
    B('rubrique', [seg('Adresses et contacts')], { cle: 'rub:adresses' });
    if (l) {
      const adresse = [txt(l.adresse), txt(l.commune) && !norm(l.adresse).includes(norm(l.commune)) ? txt(l.commune) : ''].filter(Boolean).join(', ');
      const lien = itineraire(l) || (adresse ? carteAdresse(adresse) : '');
      base('ligne', [seg(txt(l.nom) || txt(l.commune), { gras: true }), seg(' : '), ...(txt(l.adresse) ? [seg(adresse, lien ? { lien } : {})] : [amorce('adresse du lieu ?')])], 'lieu');
      const sl = suivi.lieu || {};
      const precisions = [sl.jauge ? `jauge : ${sl.jauge} places` : '', txt(sl.plateau) ? `plateau : ${txt(sl.plateau)}` : ''].filter(Boolean).join(' ; ');
      if (precisions) base('ligne', [seg(maj(precisions))], 'lieu:precisions');
    } else B('ligne', [amorce('le lieu : nom, adresse ?')]);
    const contacts = composerContacts(suivi, []);
    contacts.forEach((c, k) => base('ligne', [seg(`${c.nom || c.role}${c.nom && c.role ? `, ${minuscule(c.role)}` : ''} : `), ...(c.telephone ? [seg(c.telephone)] : []), ...(c.telephone && c.email ? [seg(', ')] : []), ...(c.email ? [seg(c.email)] : []), ...(!c.telephone && !c.email ? [amorce('téléphone ?')] : [])], `contact:${k}`));
    if (!contacts.length) B('ligne', [amorce('contact sur place : nom, téléphone ?')]);
    if (parLieu) {
      const repris = extraire(parLieu.contenu, 'adresses', /^adresses?|^contacts?/, b => !(b.cle && /^(lieu|contact:|cie)/.test(b.cle)), true);
      if (repris.length) { B('ligne', [amorce(origineTexte(parLieu))]); repris.forEach(b => blocs.push(b)); }
    }
    B('sous-titre', [seg('contacts compagnie')], { cle: 'cie' });
    // l'équipe de la date, puis l'administration et la régie générale de la compagnie (une seule fois chacune)
    const deja = new Set(), ids = new Set(equipe.map(p => String(p.id)));
    equipe.forEach(p => { deja.add(norm(p.nom)); deja.add(norm(`${p.prenom} ${p.nom}`)); base('ligne', [seg(`${prenomDe(p)} `), p.telephone ? seg(p.telephone) : amorce('téléphone ?')], `cie:${p.id ?? cleMot(p.prenom + p.nom)}`); });
    (S.contacts || []).forEach(c => {
      const nom = txt(c.nom), prenom = txt(c.prenom) || premierMot(nom);
      if (!prenom || (c.personne_id != null && ids.has(String(c.personne_id))) || deja.has(norm(nom))) return;
      deja.add(norm(nom));
      base('ligne', [seg(`${prenom} `), c.telephone ? seg(telTexte(c.telephone)) : amorce('téléphone ?'), ...(c.role ? [amorce(` ${minuscule(c.role)}`)] : [])], `cie:${cleMot(nom)}`);
    });

    // ---- les documents de l'équipe que la feuille cite
    const docs = (S.documents || []).filter(x => x && x.id != null && (x.pour == null || x.pour === 'equipe'));
    if (docs.length) {
      B('rubrique', [seg('Documents')], { cle: 'rub:documents' });
      docs.forEach(x => base('puce', [seg(txt(x.titre) || 'Document', { doc: x.id })], `doc:${x.id}`));
    }

    const out = blocs.map(bloc);
    return {
      format: 2, blocs: out, composees: out.filter(b => b.cle).map(b => b.cle), pages: [],
      instantane: seances.map(r => ({ jour: r.jour, heure: r.heure, annulee: r.annulee })), compose_le: new Date().toISOString(),
    };
  }
  // les blocs d'une rubrique d'une autre feuille (repas, transports…), repris comme écrits à la main
  function extraire(blocs, k, mots, filtre = () => true, sansCompagnie = false) {
    const i = blocs.findIndex(b => b.type === 'rubrique' && (b.cle === `rub:${k}` || mots.test(norm(texteBloc(b)).trim())));
    if (i < 0) return [];
    const out = [];
    for (const b of blocs.slice(i + 1)) {
      if (b.type === 'rubrique') break;
      if (sansCompagnie && b.type === 'sous-titre' && /compagnie/.test(norm(texteBloc(b)))) break;
      if (b.type === 'saut' || !filtre(b) || b.source === 'base') continue;
      const v = visibles([b])[0];
      if (!v) continue;
      out.push(bloc({ ...v, id: null, cle: null, source: null, origine: null }));
    }
    while (out.length && !texteBloc(out[out.length - 1]).trim() && out[out.length - 1].type !== 'tableau') out.pop();
    while (out.length && !texteBloc(out[0]).trim() && out[0].type !== 'tableau') out.shift();
    return out;
  }

  // ================================================================================================ l'ancien format
  // une feuille de l'ancien formulaire (representations, planning, lieu, trajet, transport, hebergement, repas, equipe,
  // contacts, documents, notes), mise en blocs. Ce qui venait de la base porte une clé « ancien: » : « Mettre à jour
  // depuis la base » le remplace par la composition d'aujourd'hui ; le reste (transport, repas, hébergement, notes) reste.
  function depuisSections(c, ctx) {
    const blocs = [], sp = ctx?.spectacle || {};
    const B = (type, segs, extra = {}) => blocs.push(bloc({ type, segments: segs, ...extra }));
    const ancien = (type, segs, cle, extra = {}) => B(type, segs, { cle: `ancien:${cle}`, source: 'base', ...extra });
    const reps = (Array.isArray(c.representations) && c.representations.length ? c.representations : ctx?.representations || []).filter(r => estJour(r?.jour));
    const jours = [...new Set(reps.filter(r => !r.annulee).map(r => r.jour))].sort();
    ancien('entete', [seg('FEUILLE DE ROUTE', { gras: true, italique: true })], 'entete:titre');
    if (txt(sp.titre)) ancien('entete', [seg(txt(sp.titre), { gras: true, italique: true })], 'entete:spectacle');
    const prenoms = (c.equipe || []).map(p => premierMot(p.nom)).filter(Boolean);
    if (prenoms.length) ancien('entete', [seg(`avec ${listeEt(prenoms)}`)], 'entete:avec', { petit: true });
    const q = quandTexte(jours[0] || ctx?.date?.debut, jours[jours.length - 1] || ctx?.date?.fin);
    if (q) ancien('entete', [seg(q, { gras: true })], 'entete:quand');
    const lieu = c.lieu || {}, l = ctx?.lieu || {};
    const nomLieu = txt(lieu.nom) || txt(l.nom), commune = txt(lieu.commune) || txt(l.commune);
    if (nomLieu || commune) ancien('entete', [seg(nomLieu ? `${aLieu(nomLieu)}${commune ? `, ${commune}` : ''}` : `à ${commune}`, { gras: true })], 'entete:ou');
    const pl = trier(c.planning || []).filter(r => r && (txt(r.quoi) || txt(r.heure)));
    if (pl.length) {
      B('rubrique', [seg('Planning')], { cle: 'rub:planning' });
      let jour = '';
      pl.forEach((r, k) => {
        if (estJour(r.jour) && r.jour !== jour) { jour = r.jour; ancien('jour', [seg(jourLong(r.jour, false))], `jour:${r.jour}`, { date: r.jour }); }
        const m = minutes(h5(r.heure)), f = minutes(h5(r.fin)), rep = r.rep === true || /^repr[ée]sentation/i.test(txt(r.quoi));
        const tete = m == null ? [] : [seg(`${heureCourte(m)}${f != null ? `-${heureCourte(f)}` : ''} : `, rep ? { gras: true } : {})];
        ancien('ligne', [...tete, seg(minuscule(txt(r.quoi)), rep ? { gras: true } : {}), ...(txt(r.qui) ? [seg(' '), seg(`/ ${txt(r.qui)}`, { surligne: true })] : []), ...(txt(r.ou) ? [seg(` (${txt(r.ou)})`)] : [])],
          `pl:${k}`, { origine: { jour: estJour(r.jour) ? r.jour : null, heure: m == null ? null : hhmm(m), fin: f == null ? null : hhmm(f), rep } });
      });
    }
    const lignesListe = (xs, f) => (Array.isArray(xs) ? xs : []).map(f).filter(s => s && s.trim());
    const repas = lignesListe(c.repas, r => [estJour(r.jour) ? jourLong(r.jour, false) : '', heure(r.heure), txt(r.ou) || 'repas', txt(r.details)].filter(Boolean).join(' : '));
    if (repas.length) { B('rubrique', [seg('Repas')], { cle: 'rub:repas' }); repas.forEach(t => B('ligne', [seg(t)])); }
    const tr = c.trajet || {};
    const km = tr.distance_km !== '' && tr.distance_km != null && !isNaN(tr.distance_km) ? Math.round(+tr.distance_km) : null;
    const trajet = txt(tr.depart) || km != null ? `Depuis ${txt(tr.depart) || 'Rouen'}${km != null ? ` : ${tr.estime ? 'environ ' : ''}${km} km` : ''}${dureeTexte(tr.duree_min) ? `, ${dureeTexte(tr.duree_min)} de route` : ''}` : '';
    const transports = [trajet, txt(tr.details), ...lignesListe(c.transport, r => [estJour(r.jour) ? jourLong(r.jour, false) : '', heure(r.heure), [txt(r.mode), txt(r.trajet)].filter(Boolean).join(' '), txt(r.qui) && `/ ${txt(r.qui)}`, txt(r.details)].filter(Boolean).join(' : '))].filter(Boolean);
    if (transports.length) { B('rubrique', [seg('Transports')], { cle: 'rub:transports' }); transports.forEach(t => B('ligne', [seg(t)])); }
    const heb = lignesListe(c.hebergement, r => [txt(r.nom), txt(r.adresse), telTexte(r.telephone), txt(r.arrivee) && `arrivée ${txt(r.arrivee)}`, txt(r.depart) && `départ ${txt(r.depart)}`, txt(r.details)].filter(Boolean).join(' : '));
    if (heb.length) { B('rubrique', [seg('Hébergement')], { cle: 'rub:hebergement' }); heb.forEach(t => B('ligne', [seg(t)])); }
    const adresse = [txt(lieu.adresse), txt(lieu.commune)].filter(Boolean).join(', ');
    const contacts = Array.isArray(c.contacts) ? c.contacts : [], equipe = Array.isArray(c.equipe) ? c.equipe : [];
    if (nomLieu || adresse || contacts.length || equipe.length) {
      B('rubrique', [seg('Adresses et contacts')], { cle: 'rub:adresses' });
      if (nomLieu || adresse) ancien('ligne', [seg(nomLieu || commune, { gras: true }), ...(adresse ? [seg(' : '), seg(adresse, lienSur(lieu.itineraire) ? { lien: lienSur(lieu.itineraire) } : {})] : [])], 'lieu');
      [['Accès', lieu.acces], ['Stationnement', lieu.parking], ['Loges', lieu.loges], ['Précisions', lieu.details]].filter(p => txt(p[1])).forEach(([t, v]) => B('ligne', [seg(`${t} : ${txt(v)}`)]));
      contacts.forEach((x, k) => ancien('ligne', [seg(`${txt(x.nom) || txt(x.role)}${txt(x.nom) && txt(x.role) ? `, ${minuscule(txt(x.role))}` : ''} : ${[telTexte(x.telephone), txt(x.email)].filter(Boolean).join(', ')}`)], `contact:${k}`));
      if (equipe.length) {
        B('sous-titre', [seg('contacts compagnie')], { cle: 'cie' });
        equipe.forEach((p, k) => ancien('ligne', [seg(`${premierMot(p.nom)} ${telTexte(p.telephone)}`.trim())], `cie:${k}`));
      }
    }
    const docs = Array.isArray(c.documents) ? c.documents : [];
    if (docs.length) {
      B('rubrique', [seg('Documents')], { cle: 'rub:documents' });
      docs.forEach(id => { const x = (ctx?.documents || []).find(y => String(y.id) === String(id)); ancien('puce', [seg(txt(x?.titre) || 'Document', { doc: id })], `doc:${id}`); });
    }
    const notes = String(c.notes || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    if (notes.length) { B('rubrique', [seg('Notes')], { cle: 'rub:notes' }); notes.forEach(p => p.split('\n').forEach(t => B('ligne', [seg(t)]))); }
    return { format: 2, blocs, composees: blocs.filter(b => b.cle).map(b => b.cle), pages: [], instantane: reps.map(r => ({ jour: r.jour, heure: h5(r.heure), annulee: !!r.annulee })), ancien: true };
  }
  // le contenu d'une feuille, toujours en blocs (une feuille de l'ancien format est convertie à la volée)
  function contenu(feuille, contexte) {
    const c = feuille?.contenu;
    if (c && c.format === 2 && Array.isArray(c.blocs)) {
      const blocs = c.blocs.map(bloc), vus = new Set();
      blocs.forEach(b => { if (vus.has(b.id)) b.id = nouvelId(); vus.add(b.id); });
      return { ...c, blocs, composees: Array.isArray(c.composees) ? c.composees.map(String) : [], pages: Array.isArray(c.pages) ? c.pages.map(String) : [], instantane: Array.isArray(c.instantane) ? c.instantane : [] };
    }
    if (c && typeof c === 'object' && ['representations', 'planning', 'lieu', 'trajet', 'transport', 'hebergement', 'repas', 'equipe', 'contacts', 'documents', 'notes'].some(k => k in c)) return depuisSections(c, contexte);
    return { format: 2, blocs: [], composees: [], pages: [], instantane: [] };
  }

  // ================================================================================================ mettre à jour depuis la base
  // Les blocs venus de la base (source 'base', pas retouchés) prennent ce que la base dit aujourd'hui (l'en-tête, les
  // horaires, les contacts) ; ceux qu'elle ne donne plus partent ; ceux qu'elle donne de nouveau arrivent à leur place.
  // Rien de ce qui a été écrit ou retouché à la main ne change ; un bloc de la base retiré à la main ne revient pas.
  const STRUCTURE = new Set(['rubrique', 'jour', 'sous-titre']);
  const memeBloc = (a, b) => JSON.stringify([a.type, a.segments, a.lignes, a.date, a.petit, a.origine]) === JSON.stringify([b.type, b.segments, b.lignes, b.date, b.petit, b.origine]);
  function actualiser(actuel, nouveau) {
    const A = contenu({ contenu: actuel }), N = contenu({ contenu: nouveau });
    let out = A.blocs.map(b => ({ ...b }));
    const presentes = new Set(out.filter(b => b.cle).map(b => b.cle));
    const retirees = new Set((A.composees || []).filter(k => !presentes.has(k)));
    const clesN = new Set(N.blocs.filter(b => b.cle).map(b => b.cle));
    let modifies = 0, ajoutes = 0, retires = 0;
    // un bloc de l'ancien format, venu de la base : remplacé par la composition d'aujourd'hui
    const perime = b => b.source === 'base' && b.cle && !clesN.has(b.cle);
    N.blocs.forEach(n => {
      const a = n.cle && out.find(b => b.cle === n.cle);
      if (a && a.source === 'base' && !memeBloc(a, n)) { Object.assign(a, { type: n.type, segments: clone(n.segments), lignes: clone(n.lignes), date: n.date, petit: n.petit, origine: clone(n.origine) }); if (!a.lignes) delete a.lignes; modifies++; }
    });
    out = out.filter(b => { if (perime(b)) { retires++; return false; } return true; });
    let ancre = null;
    N.blocs.forEach((n, k) => {
      const a = n.cle ? out.find(b => b.cle === n.cle) : null;
      if (a) { ancre = a.id; return; }
      if (!n.cle || retirees.has(n.cle)) return;
      const b = { ...clone(n), id: nouvelId() };
      let pos;
      if (STRUCTURE.has(n.type)) {
        const suivant = N.blocs.slice(k + 1).find(x => x.cle && STRUCTURE.has(x.type) && out.some(y => y.cle === x.cle));
        pos = suivant ? out.findIndex(y => y.cle === suivant.cle) : out.length;
      } else pos = ancre ? out.findIndex(y => y.id === ancre) + 1 : out.findIndex(y => y.type !== 'entete');
      if (pos < 0) pos = out.length;
      out.splice(pos, 0, b);
      ancre = b.id; ajoutes++;
    });
    const composees = [...new Set([...(A.composees || []).filter(k => !String(k).startsWith('ancien:')), ...clesN])];
    const c = { ...A, blocs: out, composees, instantane: N.instantane, compose_le: N.compose_le || new Date().toISOString() };
    delete c.ancien;
    return { contenu: c, ajoutes, modifies, retires };
  }

  // ================================================================================================ le planning (frise de l'équipe)
  const toutGras = b => { const xs = (b.segments || []).filter(s => !s.amorce && s.texte.trim()); return xs.length > 0 && xs.every(s => s.gras); };
  function planning(feuille, contexte) {
    const ctx = contexte || {}, c = contenu(feuille, ctx);
    const reps = (ctx.representations || []).filter(r => estJour(r?.jour)).map(r => r.jour).sort();
    const ref = reps[0] || ctx.date?.debut || (c.instantane || []).map(r => r.jour).filter(estJour).sort()[0] || '';
    const tous = [...new Set([...reps, ...(c.instantane || []).map(r => r.jour).filter(estJour)])];
    const unJour = tous.length === 1 ? tous[0] : (estJour(ctx.date?.debut) && (!ctx.date?.fin || ctx.date.fin === ctx.date.debut) ? ctx.date.debut : null);
    const out = [];
    let jour = null, dansPlanning = false;
    c.blocs.forEach((b, i) => {
      if (b.type === 'rubrique') { jour = null; dansPlanning = /planning|programme|deroule|horaire|journee/.test(norm(texteBloc(b))); return; }
      if (b.type === 'jour') { jour = b.date || dateDuTexte(texteBloc(b), ref) || null; return; }
      if (!['ligne', 'puce', 'alerte'].includes(b.type)) return;
      const j = jour || (dansPlanning ? unJour : null);
      if (!j) return;
      const v = visibles([b])[0];
      if (!v) return;
      const lu = lireHeure(texteSegs(v.segments));
      const base = b.source === 'base' && b.origine;
      const h = base ? b.origine.heure : lu?.heure, f = base ? b.origine.fin : lu?.fin ?? null;
      if (!h) return;
      const texte = (lu ? lu.reste : texteSegs(v.segments).replace(/^\s*[:–—-]\s*/, '')).trim();
      out.push({ jour: base && b.origine.jour ? b.origine.jour : j, heure: h, fin: f || null, texte, accent: !!(b.origine?.rep) || toutGras(v), _i: i });
    });
    return out.sort((a, b) => a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : a.heure < b.heure ? -1 : a.heure > b.heure ? 1 : a._i - b._i).map(({ _i, ...x }) => x);
  }

  // ================================================================================================ les liens d'un texte
  // les numéros de téléphone (tel:), les adresses électroniques (mailto:) et les adresses postales avec leur code postal
  // (itinéraire), dans la version web et dans le PDF
  const VOIES = '(?:rue|avenue|av\\.|bd|boulevard|place|pl\\.|chemin|all[ée]e|impasse|quai|route|rte|cours|square|esplanade|parvis|rond-point|voie|passage|sentier|hameau|lieu-dit|r[ée]sidence|zone|za|zi|zac|parc|promenade|mail|faubourg|cit[ée]|domaine|lotissement)';
  const VILLE = "[A-ZÀ-Ýa-zà-ÿ][A-Za-zÀ-ÿ'’-]*(?:[ -](?:(?:sur|sous|en|le|la|les|lès|lez|de|du|des|aux?|d’|l’)[ -])?[A-ZÀ-Ý][A-Za-zÀ-ÿ'’-]*){0,3}";
  const RE_ADRESSE = new RegExp(`(?:\\b\\d{1,4}(?:\\s?(?:bis|ter))?,?\\s+)?\\b${VOIES}\\s[^,;:()\\n]{1,60}?[\\s,/]+\\d{5}\\s+${VILLE}`, 'gi');
  function jetons(texte) {
    const s = String(texte || ''), trouves = [];
    const chercher = (re, genre, href) => { const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'); let m; while ((m = r.exec(s))) { trouves.push({ i: m.index, j: m.index + m[0].length, genre, href: href(m[0]) }); if (!m[0].length) r.lastIndex++; } };
    chercher(RE_MEL, 'mel', x => `mailto:${x}`);
    chercher(RE_TEL, 'tel', telLien);
    chercher(RE_ADRESSE, 'adr', x => carteAdresse(x));
    trouves.sort((a, b) => a.i - b.i || b.j - a.j);
    const out = [];
    let p = 0;
    trouves.forEach(t => { if (t.i < p) return; if (t.i > p) out.push({ t: s.slice(p, t.i) }); out.push({ t: s.slice(t.i, t.j), href: t.href, genre: t.genre }); p = t.j; });
    if (p < s.length) out.push({ t: s.slice(p) });
    return out;
  }

  // ================================================================================================ la version web
  const CSS_WEB = `
.fdr{--fdr-encre:#151515;--fdr-gris:#5d5d5d;--fdr-trait:#e4e4e4;box-sizing:border-box;max-width:780px;margin:0 auto;padding:30px 36px 34px;background:#fff;color:var(--fdr-encre);
  font-family:${POLICE};font-size:17px;line-height:1.36;font-kerning:normal;font-variant-ligatures:none;text-align:left;overflow-wrap:break-word;
  border:1px solid var(--fdr-trait);border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 8px 26px rgba(0,0,0,.06)}
.fdr *{box-sizing:border-box}
.fdr p,.fdr h1,.fdr h2,.fdr h3,.fdr h4,.fdr ul{margin:0;font-size:inherit;font-weight:inherit;line-height:inherit}
.fdr .fdr-tete{margin:0 0 6px}
.fdr .fdr-tete .fdr-l{font-size:1.2em;line-height:1.25}
.fdr .fdr-tete .fdr-l.petit{font-size:1.02em;margin:2px 0}
.fdr .fdr-tete h1.fdr-l{font-size:1.5em;line-height:1.15;margin:1px 0 3px}
.fdr .fdr-alerte-h{margin:14px 0 0;padding:10px 13px;border-radius:8px;background:#fdecea;color:#8c1d16;font-size:.88em;font-weight:700}
.fdr .fdr-rub{font-size:1.27em;font-weight:700;margin:1.15em 0 .3em;padding-bottom:.18em;border-bottom:1px solid var(--fdr-trait)}
.fdr .fdr-st{font-weight:700;margin:.8em 0 .1em}
.fdr .fdr-jour{font-weight:700;margin:.95em 0 .1em}
.fdr .fdr-p{margin:0 0 .12em}
.fdr .fdr-al{font-weight:700;color:${MISE.rouge};margin:0 0 .12em}
.fdr .fdr-vide{height:.5em}
.fdr ul.fdr-puces{list-style:none;padding:0;margin:.1em 0 .3em}
.fdr ul.fdr-puces li{position:relative;padding-left:1.35em;margin:0 0 .12em}
.fdr ul.fdr-puces li::before{content:"\\2022";position:absolute;left:.45em}
.fdr .fdr-tab{overflow-x:auto;margin:.3em 0 .5em}
.fdr table{border-collapse:collapse;font-size:.92em;min-width:60%}
.fdr td{border:1px solid #9a9a9a;padding:4px 8px;vertical-align:top}
.fdr .g{font-weight:700}
.fdr .i{font-style:italic}
.fdr .r{color:${MISE.rouge}}
.fdr .s{background:${MISE.surligne};box-decoration-break:clone;-webkit-box-decoration-break:clone}
.fdr .moi{font-weight:700;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px}
.fdr a{color:inherit;text-decoration:underline;text-decoration-color:rgba(0,0,0,.35);text-decoration-thickness:1px;text-underline-offset:2px}
.fdr a:hover{text-decoration-color:currentColor}
.fdr a.tel,.fdr a.mel{white-space:nowrap}
@media (max-width:560px){
  .fdr{font-size:16px;padding:20px 16px 22px;border-left:0;border-right:0;border-radius:0;box-shadow:none}
  .fdr .fdr-tete h1.fdr-l{font-size:1.38em}
}
@media print{.fdr{border:0;box-shadow:none;max-width:none;padding:0;font-size:11pt}}`;
  // le prénom de la personne qui lit, mis en valeur (mot entier, sans tenir compte des accents ni des majuscules)
  function avecMoi(t, moi) {
    const p = txt(moi?.prenom);
    if (!p) return esc(t);
    const s = String(t), n = norm(s), q = norm(p), out = [];
    let i = 0, k;
    while ((k = n.indexOf(q, i)) >= 0) {
      const avant = n[k - 1], apres = n[k + q.length];
      if ((!avant || !/[a-z0-9]/.test(avant)) && (!apres || !/[a-z0-9]/.test(apres))) { out.push(esc(s.slice(i, k)), `<strong class="moi">${esc(s.slice(k, k + q.length))}</strong>`); i = k + q.length; }
      else { out.push(esc(s.slice(i, k + 1))); i = k + 1; }
    }
    out.push(esc(s.slice(i)));
    return out.join('');
  }
  const urlDoc = (id, ctx) => { const x = (ctx.documents || []).find(y => String(y.id) === String(id)); return x ? lienSur(x.url) : ''; };
  const cible = u => /^https?:/i.test(u) ? ' target="_blank" rel="noopener"' : '';
  function htmlSegments(segs, ctx) {
    return segs.map(s => {
      const cls = [s.gras && 'g', s.italique && 'i', s.rouge && 'r', s.surligne && 's'].filter(Boolean).join(' ');
      let dedans;
      const u = s.doc != null ? urlDoc(s.doc, ctx) : s.lien || '';
      if (u) dedans = `<a href="${esc(u)}"${cible(u)}>${avecMoi(s.texte, ctx.moi)}</a>`;
      else dedans = jetons(s.texte).map(j => j.href ? `<a class="${j.genre}" href="${esc(j.href)}"${cible(j.href)}>${esc(j.t)}</a>` : avecMoi(j.t, ctx.moi)).join('');
      return cls ? `<span class="${cls}">${dedans}</span>` : dedans;
    }).join('');
  }
  // les horaires ont changé depuis cette version ? (contexte : la base d'aujourd'hui)
  const cleRep = r => `${r.jour} ${h5(r.heure)} ${r.annulee ? 'annulée' : ''}`;
  function alerteHoraires(c, ctx) {
    const vivantes = r => estJour(r?.jour);
    if (!Array.isArray(c.instantane) || !c.instantane.length || !Array.isArray(ctx.representations) || !ctx.representations.length) return '';
    const a = c.instantane.filter(vivantes).map(cleRep).sort().join('|'), b = ctx.representations.filter(vivantes).map(r => cleRep({ ...r, annulee: !!r.annulee })).sort().join('|');
    if (a === b) return '';
    const plusieurs = new Set(ctx.representations.map(x => x.jour)).size > 1;
    return `Les horaires ont changé depuis cette version de la feuille. Horaires à jour : ${trier(ctx.representations.filter(vivantes))
      .map(r => `${plusieurs ? jourLong(r.jour, false) + ' ' : ''}${heureCourte(minutes(h5(r.heure))) || 'heure à préciser'}${r.annulee ? ' (annulée)' : ''}`).join(', ')}.`;
  }
  const estTitre = (b, ctx) => b.cle === 'entete:spectacle' || (txt(ctx.spectacle?.titre) && norm(texteBloc(b)).trim() === norm(ctx.spectacle.titre).trim());
  function html(feuille, contexte) {
    const ctx = contexte || {}, c = contenu(feuille, ctx), blocs = visibles(c.blocs);
    let i = 0;
    const tete = [];
    while (i < blocs.length && blocs[i].type === 'entete') tete.push(blocs[i++]);
    let h1 = false;
    const ligneTete = b => {
      const titre = !h1 && estTitre(b, ctx);
      if (titre) h1 = true;
      const tag = titre ? 'h1' : 'p';
      return `<${tag} class="fdr-l${b.petit ? ' petit' : ''}">${htmlSegments(b.segments, ctx)}</${tag}>`;
    };
    const parties = [];
    if (tete.length) parties.push(`<header class="fdr-tete">${tete.map(ligneTete).join('')}</header>`);
    const alerte = alerteHoraires(c, ctx);
    if (alerte) parties.push(`<p class="fdr-alerte-h" role="note">${esc(alerte)}</p>`);
    let puces = [];
    const finirPuces = () => { if (puces.length) parties.push(`<ul class="fdr-puces">${puces.join('')}</ul>`); puces = []; };
    let videAvant = true;
    for (; i < blocs.length; i++) {
      const b = blocs[i];
      if (b.type !== 'puce') finirPuces();
      const corps = b.type === 'tableau' ? '' : htmlSegments(b.segments, ctx);
      const vide = b.type !== 'tableau' && b.type !== 'saut' && !texteSegs(b.segments).trim();
      if (b.type === 'saut') continue;
      if (vide) { if (!videAvant) parties.push('<p class="fdr-vide" aria-hidden="true"></p>'); videAvant = true; continue; }
      videAvant = false;
      if (b.type === 'puce') { puces.push(`<li>${corps}</li>`); continue; }
      if (b.type === 'tableau') { parties.push(`<div class="fdr-tab"><table><tbody>${b.lignes.map(l => `<tr>${l.map(x => `<td>${htmlSegments(x, ctx)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue; }
      const tag = { rubrique: 'h2', jour: 'h3', 'sous-titre': 'h4', entete: 'p' }[b.type] || 'p';
      const cls = { rubrique: 'fdr-rub', jour: 'fdr-jour', 'sous-titre': 'fdr-st', alerte: 'fdr-al', entete: 'fdr-p g' }[b.type] || 'fdr-p';
      parties.push(`<${tag} class="${cls}">${corps}</${tag}>`);
    }
    finirPuces();
    return `<style>${cssPolices()}${CSS_WEB}</style><article class="fdr" lang="fr">${parties.join('\n')}</article>`;
  }

  // ================================================================================================ PDF et impression
  let chargement = null;
  const script = src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error(`impossible de charger ${src}`)); document.head.append(s); });
  function charger() {
    if (typeof pdfMake !== 'undefined' && pdfMake.vfs && pdfMake.vfs['Roboto-Regular.ttf']) return Promise.resolve();
    if (!chargement) {
      const dossier = dossierVendor();
      chargement = (typeof pdfMake !== 'undefined' ? Promise.resolve() : script(dossier + 'pdfmake.min.js'))
        .then(() => pdfMake.vfs && pdfMake.vfs['Roboto-Regular.ttf'] ? null : script(dossier + 'vfs_fonts.js'))
        .catch(e => { chargement = null; throw e; });
    }
    return chargement;
  }
  // FdR Sans pour pdfmake (vfs) ; sans elle (fichiers absents), le PDF prend Roboto
  let policesPdf = null;
  function polices() {
    if (!policesPdf) {
      const d = dossierVendor();
      const base64 = buf => { const o = new Uint8Array(buf); let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000)); return btoa(s); };
      policesPdf = Promise.all(Object.values(FICHIERS_POLICE).map(f => fetch(d + f).then(r => { if (!r.ok) throw new Error(`${f} : ${r.status}`); return r.arrayBuffer(); }).then(b => [f, base64(b)])))
        .then(xs => Object.fromEntries(xs))
        .catch(e => { console.warn('Feuille de route : police FdR Sans indisponible, le PDF prend Roboto.', e); return null; });
    }
    return policesPdf;
  }
  // le logo (noir), écrit à côté de ce fichier par maquettes/build.py ; sans lui, un badge
  let logoCharge = null;
  function logo() {
    if (!logoCharge) {
      const u = ICI ? new URL('logo-feuille.svg', ICI).href : 'logo-feuille.svg';
      logoCharge = typeof fetch === 'undefined' ? Promise.resolve(null) : fetch(u).then(r => r.ok ? r.text() : null).then(t => t && /<svg[\s>]/.test(t) ? t : null).catch(() => null);
    }
    return logoCharge;
  }
  const logoUrl = () => ICI ? new URL('logo-feuille.svg', ICI).href : 'logo-feuille.svg';
  // ce que FdR Sans (et Roboto, au besoin) n'a pas
  const COUVERT = /[^\u0020-\u007e\u00a0-\u017f\u0192\u0218-\u021b\u02c6-\u02dd\u2000-\u206f\u20ac\u2116\u2122\u2190-\u2199\u2212\u2215\u25cf\u25e6]/g;
  const pourPdf = (s, roboto) => {
    let x = String(s ?? '').replace(/[✓✔]/g, '•').replace(/[⚠]/g, '!').replace(/[☎✆]/g, 'tél.').replace(/[■▪]/g, '•').replace(COUVERT, '');
    if (roboto) x = x.replace(/\u202f/g, '\u00a0').replace(/[→⟶]/g, '–').replace(/[←]/g, '–');
    return x;
  };
  function inlinesPdf(segs, ctx, o) {
    const out = [];
    segs.forEach(s => {
      const f = { ...(s.gras ? { bold: true } : {}), ...(s.italique ? { italics: true } : {}), ...(s.rouge ? { color: MISE.rouge } : {}), ...(s.surligne ? { background: MISE.surligne } : {}) };
      const u = s.doc != null ? urlDoc(s.doc, ctx) : s.lien || '';
      if (u) { out.push({ text: pourPdf(s.texte, o.roboto), link: u, ...f }); return; }
      jetons(s.texte).forEach(j => out.push({ text: pourPdf(j.t, o.roboto), ...(j.href ? { link: j.href } : {}), ...f }));
    });
    return out.length ? out : [{ text: '\u00a0' }];
  }
  // un document pdfmake, page pour page comme l'éditeur
  function definition(feuille, contexte, o = {}) {
    const ctx = contexte || {}, c = contenu(feuille, ctx), debuts = new Set((c.pages || []).map(String)), blocs = visibles(c.blocs, debuts);
    const T = MISE.types, mm = x => x * PT_MM;
    const roboto = !o.police || o.police === 'Roboto';
    // Roboto n'a pas les métriques de Calibri : on garde au moins la même hauteur de ligne
    const lh = roboto ? MISE.interligne / ((1900 + 500) / 2048) : 1;
    const forcer = debuts.size > 0;
    const vide = b => b.type !== 'tableau' && !texteSegs(b.segments).trim();
    const noeud = b => {
      const t = T[b.type] || {};
      const taille = b.type === 'entete' ? (b.petit ? MISE.petit : T.entete.taille) : t.taille || MISE.corps;
      const commun = { fontSize: taille, ...(t.gras ? { bold: true } : {}), ...(t.rouge ? { color: MISE.rouge } : {}) };
      if (b.type === 'tableau') {
        return { table: { widths: b.lignes[0].map(() => '*'), body: b.lignes.map(l => l.map(x => ({ text: inlinesPdf(x, ctx, { roboto }), fontSize: t.taille }))) },
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#7a7a7a', vLineColor: () => '#7a7a7a', paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 2, paddingBottom: () => 2 },
          margin: [0, t.avant, 0, t.apres] };
      }
      const texte = vide(b) ? [{ text: '\u00a0' }] : inlinesPdf(b.segments, ctx, { roboto });
      if (b.type === 'puce') return { columns: [{ width: t.puce, text: '' }, { width: t.texte - t.puce, text: '•', fontSize: taille }, { width: '*', text: texte, ...commun }], columnGap: 0 };
      return { text: texte, ...commun, margin: [0, t.avant || 0, 0, t.apres || 0] };
    };
    let i = 0;
    const tete = [];
    while (i < blocs.length && blocs[i].type === 'entete') tete.push(blocs[i++]);
    const L = mm(MISE.logo);
    const marque = o.logo
      ? { svg: o.logo, width: L, margin: [0, 0, 0, mm(MISE.sousLogo)] }
      : { stack: [{ canvas: [{ type: 'ellipse', x: L / 2, y: L / 2, r1: L / 2, r2: L / 2, color: '#1d1d1b' }] },
        { text: 'crescite', color: '#ffffff', bold: true, fontSize: 15, alignment: 'center', relativePosition: { x: 0, y: -L / 2 - 10 } }], width: L, margin: [0, 0, 0, mm(MISE.sousLogo)] };
    const contenuPdf = [{ columns: [{ width: L, stack: [marque] }, { width: '*', stack: tete.map(noeud), margin: [mm(MISE.logoEcart), 0, 0, 0] }], columnGap: 0 }];
    let apresSaut = false;
    for (; i < blocs.length; i++) {
      const b = blocs[i];
      if (b.type === 'saut') { apresSaut = true; continue; }
      const n = noeud(b);
      if ((forcer && b.debutPage) || apresSaut) n.pageBreak = 'before';
      else if (!forcer && STRUCTURE.has(b.type)) n.headlineLevel = 1;
      apresSaut = false;
      contenuPdf.push(n);
    }
    const quand = c.blocs.find(b => b.cle === 'entete:quand');
    const titre = `Feuille de route · ${txt(ctx.spectacle?.titre) || 'Crescite'}${quand ? ' · ' + texteBloc(quand) : ''}`;
    return {
      pageSize: 'A4', pageMargins: [mm(MISE.gauche), mm(MISE.haut), mm(MISE.droite), mm(MISE.bas - MISE.surete)],
      info: { title: pourPdf(titre, roboto), author: COMPAGNIE, subject: feuille?.statut === 'publiee' ? `Version ${feuille.version || 1}` : 'Brouillon' },
      defaultStyle: { font: roboto ? 'Roboto' : 'FdRSans', fontSize: MISE.corps, lineHeight: lh, color: MISE.encre },
      footer: (p, n) => n > 1 ? { text: `${p} / ${n}`, alignment: 'right', fontSize: 8, color: MISE.gris, margin: [0, 6, mm(MISE.droite), 0] } : null,
      content: contenuPdf,
      // sans les pages de l'éditeur : un titre ne reste pas seul en bas de page
      pageBreakBefore: (n, suivants) => !forcer && n.headlineLevel === 1 && suivants.length === 0,
    };
  }
  async function pdf(feuille, contexte) {
    await charger();
    const [vfsFdr, svg] = await Promise.all([polices(), logo()]);
    const dd = definition(feuille, contexte, { police: vfsFdr ? 'FdRSans' : 'Roboto', logo: svg });
    const fonts = { ...(pdfMake.fonts || {}), Roboto: { normal: 'Roboto-Regular.ttf', bold: 'Roboto-Medium.ttf', italics: 'Roboto-Italic.ttf', bolditalics: 'Roboto-MediumItalic.ttf' } };
    if (vfsFdr) fonts.FdRSans = { normal: FICHIERS_POLICE.normal, bold: FICHIERS_POLICE.gras, italics: FICHIERS_POLICE.italique, bolditalics: FICHIERS_POLICE.grasItalique };
    const vfs = { ...pdfMake.vfs, ...(vfsFdr || {}) };
    const faire = def => new Promise((ok, ko) => { try { pdfMake.createPdf(def, null, fonts, vfs).getBlob(ok); } catch (e) { ko(e); } });
    try { return await faire(dd); } catch (e) {
      // un logo que pdfmake ne sait pas dessiner : le badge à sa place
      if (!svg) throw e;
      console.warn('Feuille de route : logo illisible pour le PDF, badge à la place.', e);
      return faire(definition(feuille, contexte, { police: vfsFdr ? 'FdRSans' : 'Roboto', logo: null }));
    }
  }
  const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const nomFichier = (feuille, contexte) => {
    const ctx = contexte || {}, c = contenu(feuille, ctx);
    const debut = (ctx.representations || []).map(r => r.jour).filter(estJour).sort()[0] || ctx.date?.debut || (c.instantane || []).map(r => r.jour).filter(estJour).sort()[0] || '';
    const morceaux = ['feuille-de-route', txt(ctx.spectacle?.slug) || slug(ctx.spectacle?.titre), debut, feuille?.statut === 'publiee' ? `v${feuille.version || 1}` : 'brouillon'].filter(Boolean);
    return morceaux.join('-').replace(/[^a-z0-9.-]+/gi, '-') + '.pdf';
  };
  async function telecharger(feuille, contexte, nom) {
    const blob = await pdf(feuille, contexte);
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = nom || nomFichier(feuille, contexte); a.rel = 'noopener';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return blob;
  }
  // le HTML d'une page de la feuille (impression, éditeur) : les segments avec leurs marques, les amorces en option
  function htmlBloc(b, { amorces = false } = {}) {
    const segsHtml = xs => xs.map(s => {
      if (s.amorce) return amorces ? `<span class="amorce" contenteditable="false" data-amorce="${esc(s.texte)}">${esc(s.texte)}</span>` : '';
      const cls = [s.gras && 'g', s.italique && 'i', s.rouge && 'r', s.surligne && 's'].filter(Boolean);
      const attrs = `${s.doc != null ? ` data-doc="${esc(s.doc)}"` : ''}${s.lien ? ` data-lien="${esc(s.lien)}"` : ''}`;
      return cls.length || attrs ? `<span${cls.length ? ` class="${cls.join(' ')}"` : ''}${attrs}>${esc(s.texte)}</span>` : esc(s.texte);
    }).join('');
    if (b.type === 'saut') return '';
    if (b.type === 'tableau') return `<div class="b b-tableau"><table><tbody>${b.lignes.map(l => `<tr>${l.map(x => `<td>${segsHtml(x) || '<br>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    return `<p class="b b-${b.type}${b.petit ? ' petit' : ''}">${segsHtml(b.segments) || '<br>'}</p>`;
  }
  // la feuille imprimée : les pages de l'éditeur (contenu.pages), sans amorces, avec le logo et les numéros. Sur la
  // première page, l'en-tête tient à droite du logo, et ce qui suit commence sous le logo.
  function impression(feuille, contexte, o = {}) {
    const ctx = contexte || {}, c = contenu(feuille, ctx), blocs = visibles(c.blocs, new Set((c.pages || []).map(String)));
    const pages = [[]];
    blocs.forEach((b, k) => {
      if ((b.debutPage || (k && blocs[k - 1].type === 'saut')) && pages[pages.length - 1].length) pages.push([]);
      if (b.type !== 'saut') pages[pages.length - 1].push(b);
    });
    const marque = o.logo ? `<img class="imp-logo" src="${esc(o.logoUrl || logoUrl())}" alt="Crescite">` : '<span class="imp-logo imp-badge">crescite</span>';
    const n = pages.length;
    const page = (p, k) => {
      let tete = '', reste = p;
      if (k === 0) { let j = 0; while (j < p.length && p[j].type === 'entete') j++; tete = `<div class="imp-tete">${p.slice(0, j).map(b => htmlBloc(b)).join('')}</div>`; reste = p.slice(j); }
      return `<section class="imp-page">${k === 0 ? marque : ''}<div class="fdr-imp">${tete}${reste.map(b => htmlBloc(b)).join('')}</div>${n > 1 ? `<span class="imp-num">${k + 1} / ${n}</span>` : ''}</section>`;
    };
    const titre = `Feuille de route · ${txt(ctx.spectacle?.titre)}`;
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(titre)}</title><style>${cssPolices()}
@page{size:A4;margin:0}
html,body{margin:0;background:#fff}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.imp-page{position:relative;width:${MISE.largeur}mm;height:${MISE.hauteur}mm;padding:${MISE.haut}mm ${MISE.droite}mm ${MISE.bas}mm ${MISE.gauche}mm;box-sizing:border-box;overflow:hidden;break-after:page;page-break-after:always}
.imp-page:last-child{break-after:auto;page-break-after:auto}
.imp-logo{position:absolute;left:${MISE.gauche}mm;top:${MISE.haut}mm;width:${MISE.logo}mm;height:${MISE.logo}mm;object-fit:contain}
.imp-badge{display:flex;align-items:center;justify-content:center;border-radius:50%;background:#1d1d1b;color:#fff;font:700 15pt ${POLICE}}
.imp-tete{min-height:${MISE.logo + MISE.sousLogo}mm}
.imp-num{position:absolute;right:${MISE.droite}mm;top:${MISE.hauteur - MISE.bas + MISE.surete + 2.1}mm;font:8pt/1.2 ${POLICE};color:${MISE.gris}}
${cssPage('.fdr-imp')}
</style></head><body>${pages.map(page).join('')}</body></html>`;
  }

  const api = {
    composer, contenu, actualiser, planning, html, pdf, telecharger, impression, definition, nomFichier, vendor: vendorDefaut,
    MISE, cssPage, cssPolices, logo, logoUrl, polices, htmlBloc, bloc, segments, visibles, texteBloc, lireHeure, dateDuTexte, nouvelId, jetons,
    DEROULE, etapes, trier, joursEtape, estApres, dureeMinutes, dureeTexte, heure, heureCourte, jourLong, quandTexte, telTexte, telLien, itineraire, lireContact,
  };
  return api;
})();
