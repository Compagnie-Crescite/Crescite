/* La feuille de route d'une date de tournée, commune à l'administration (admin/index.html) et à la page de l'équipe
   (equipe/index.html, qui la charge par ../admin/feuille.js). Aucune dépendance : ni la base, ni l'administration.

   FEUILLE.composer(sources)                 → le contenu d'une feuille, avec tout ce que la base sait
       sources = { date, spectacle, lieu, representations, equipe: [{personne_id, nom, fonction, telephone}],
                   contacts: [{nom, role, telephone, email}], depart: {commune, latitude, longitude}, suivi,
                   documents (facultatif : [{id, pour}]) }
       suivi = {organisateur, contact} (crescite_dates_suivi), et suivi.lieu = {contact, jauge, plateau} (crescite_lieux_suivi)
   FEUILLE.html(feuille, contexte)           → le HTML de la feuille : une racine .feuille qui porte ses styles
   FEUILLE.pdf(feuille, contexte)            → Promise<Blob> (pdfmake, chargé à la demande depuis FEUILLE.vendor)
   FEUILLE.telecharger(feuille, contexte, nom?)   télécharge le PDF
   FEUILLE.vendor                            le dossier de pdfmake : vendor/ à côté de ce fichier
       feuille = {titre, contenu, version, publiee_le, statut}
       contexte = {date, spectacle: {titre, slug, univers, duree}, lieu, representations, documents?}
       (contexte.documents, facultatif : [{id, titre, url}], donne les titres des documents cités par la feuille)
   Pour l'administration : FEUILLE.SECTIONS (la structure, plus bas), FEUILLE.fusionner (recomposer sans perdre une
   saisie), FEUILLE.DEROULE (le déroulé type proposé), FEUILLE.joursEtape, FEUILLE.dureeMinutes, FEUILLE.trier.

   Le planning pose le déroulé type du spectacle (spectacle.feuille_modele : [{avant_min, quoi, qui, fin?, jours?}])
   autour des représentations. Un jour à plusieurs représentations : les étapes « avant » (minutes avant le lever de
   rideau) avant la première, les étapes « après » (avant_min négatif, ou fin: true) après la dernière ; entre les deux,
   seulement les représentations, et un repas si l'écart dépasse trois heures. Plusieurs jours de suite au même lieu :
   une étape a lieu le premier jour, chaque jour ou le dernier (jours : 'premier' | 'tous' | 'dernier'). Sans indication,
   l'arrivée de l'équipe artistique et la préparation ont lieu chaque jour, les autres étapes « avant » (montage,
   raccords, repas, ouverture des portes) le premier jour, les étapes « après » (démontage) le dernier. */
const FEUILLE = (() => {
  'use strict';
  const ICI = typeof document !== 'undefined' && document.currentScript && document.currentScript.src;
  const COMPAGNIE = 'Compagnie Crescite';

  // ================================================================================================ outils
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const clone = o => JSON.parse(JSON.stringify(o ?? null));
  const txt = v => String(v ?? '').trim();
  const maj = s => s ? s[0].toUpperCase() + s.slice(1) : '';
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
  // un instant du planning : le jour et l'heure, les minutes pouvant passer minuit d'un côté ou de l'autre
  const instant = (jour, m) => { let j = jour, x = m; while (x < 0) { j = jourPlus(j, -1); x += 1440; } while (x >= 1440) { j = jourPlus(j, 1); x -= 1440; } return { jour: j, heure: hhmm(x) }; };
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
  // un numéro français s'écrit « 06 12 34 56 78 » ; le lien tel: le compose au format international
  const chiffres = t => String(t || '').replace(/[^\d+]/g, '');
  const telTexte = t => { const c = chiffres(t); return /^0\d{9}$/.test(c) ? c.replace(/(\d{2})(?=\d)/g, '$1 ') : txt(t); };
  const telLien = t => { const c = chiffres(t); if (!c) return ''; return 'tel:' + (/^0\d{9}$/.test(c) ? '+33' + c.slice(1) : c); };
  const lienSur = u => /^(https?:|mailto:|tel:)/i.test(String(u || '').trim()) ? String(u).trim() : '';

  // ------------------------------------------------------------------------------------------------ couleurs
  const hex = c => /^#[0-9a-f]{6}$/i.test(c || '') ? c.toLowerCase() : null;
  const rvb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const versHex = xs => '#' + xs.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  const lum = c => { const f = v => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; const [r, g, b] = rvb(c); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const melanger = (a, b, k) => versHex(rvb(a).map((v, i) => v + (rvb(b)[i] - v) * k));
  // la couleur du spectacle (son univers) : le filet ; une version plus sombre pour du texte sur fond blanc
  const filetDe = sp => hex(sp?.univers?.couleurs?.scene) || hex(sp?.univers?.couleurs?.accent) || '#a8306f';
  const fonceDe = c => { let x = c; for (let i = 0; i < 12 && contraste(x, '#ffffff') < 4.6; i++) x = melanger(x, '#000000', 0.12); return x; };

  // ================================================================================================ la structure
  // Une feuille, bloc par bloc, dans l'ordre où l'équipe les lit. Pour l'ajuster au modèle de la compagnie : changer un
  // titre, l'ordre, une colonne. base : le bloc vient de la base (« Composer » le remplit, « Recomposer » le met à jour) ;
  // les autres se remplissent à la main et ne changent jamais quand on recompose. forme : fiche (des champs), liste (des
  // lignes), texte, documents. colonnes / champs : ce que l'administration saisit (t : jour, heure, texte, long, tel,
  // email, url, nombre, case, choix). vue : ce que la feuille montre, sous une forme commune au HTML et au PDF.
  const PUBLICS = [['tout_public', 'Tout public'], ['scolaire', 'Scolaire'], ['autre', 'Autre']];
  const SECTIONS = [
    { k: 'representations', titre: 'Représentations', forme: 'liste', base: true, entete: true, ajout: 'Représentation',
      colonnes: [{ k: 'jour', l: 'Jour', t: 'jour' }, { k: 'heure', l: 'Heure', t: 'heure' }, { k: 'public', l: 'Public', t: 'choix', choix: PUBLICS },
        { k: 'note', l: 'Précision', t: 'texte', ph: 'complet, audiodécrite…' }, { k: 'annulee', l: 'Annulée', t: 'case' }] },
    { k: 'lieu', titre: 'Lieu', forme: 'fiche', base: true,
      champs: [{ k: 'nom', l: 'Nom' }, { k: 'adresse', l: 'Adresse' }, { k: 'commune', l: 'Commune' },
        { k: 'itineraire', l: 'Itinéraire', t: 'url', aide: 'Composé d’après la position du lieu : à remplacer par un meilleur lien au besoin.' },
        { k: 'acces', l: 'Accès', t: 'long', ph: 'Entrée des artistes, quai de déchargement…' }, { k: 'parking', l: 'Stationnement', ph: 'Camion devant le quai, voitures sur le parking du personnel' },
        { k: 'loges', l: 'Loges', ph: 'Deux loges au premier étage, douches' }, { k: 'details', l: 'Précisions', t: 'long' }],
      vue: v => {
        const paires = [['Accès', v.acces], ['Stationnement', v.parking], ['Loges', v.loges], ['Précisions', v.details]].filter(p => txt(p[1]));
        const liens = lienSur(v.itineraire) ? [{ texte: 'Itinéraire', url: lienSur(v.itineraire) }] : [];
        if (!txt(v.nom) && !txt(v.adresse) && !txt(v.commune) && !paires.length) return null;
        return { forme: 'fiche', titre: txt(v.nom), lignes: [txt(v.adresse), txt(v.commune)].filter(Boolean), liens, paires };
      } },
    { k: 'trajet', titre: 'Trajet', forme: 'fiche', base: true,
      champs: [{ k: 'depart', l: 'Départ de' }, { k: 'distance_km', l: 'Distance (km)', t: 'nombre' }, { k: 'duree_min', l: 'Durée de route (min)', t: 'nombre' },
        { k: 'estime', l: 'Estimation à vérifier', t: 'case', aide: 'Distance à vol d’oiseau × 1,3, durée estimée : décochez une fois vérifiées.' }, { k: 'details', l: 'Précisions', t: 'long' }],
      vue: v => {
        const km = v.distance_km !== '' && v.distance_km != null && !isNaN(v.distance_km) ? Math.round(+v.distance_km) : null;
        const route = [km != null ? `${v.estime ? 'environ ' : ''}${km} km` : '', dureeTexte(v.duree_min) ? `${dureeTexte(v.duree_min)} de route` : ''].filter(Boolean).join(', ');
        const phrase = txt(v.depart) || route ? `${txt(v.depart) ? `Depuis ${txt(v.depart)}` : 'Trajet'}${route ? ` : ${route}` : ''}${route && v.estime ? ' (estimation à vérifier)' : ''}.` : '';
        const ps = [phrase, ...paragraphes(v.details)].filter(Boolean);
        return ps.length ? { forme: 'texte', paragraphes: ps } : null;
      } },
    { k: 'planning', titre: 'Planning', forme: 'liste', base: true, souple: true, ajout: 'Ligne',
      colonnes: [{ k: 'jour', l: 'Jour', t: 'jour' }, { k: 'heure', l: 'Heure', t: 'heure' }, { k: 'fin', l: 'Fin', t: 'heure' },
        { k: 'quoi', l: 'Quoi', t: 'texte', large: true }, { k: 'qui', l: 'Qui', t: 'texte' }, { k: 'ou', l: 'Où', t: 'texte' }],
      vue: (v, ctx) => lignesParJour(trier(v), r => ({ h: heure(r.heure), h2: heure(r.fin), titre: txt(r.quoi), sous: [txt(r.qui), txt(r.ou)].filter(Boolean).join(' · '),
        accent: r.rep === true || /^repr[ée]sentation/i.test(txt(r.quoi)) }), ctx) },
    { k: 'transport', titre: 'Transport', forme: 'liste', ajout: 'Trajet',
      colonnes: [{ k: 'jour', l: 'Jour', t: 'jour' }, { k: 'heure', l: 'Heure', t: 'heure' }, { k: 'mode', l: 'Moyen', t: 'texte', ph: 'Camion, train, voiture…' },
        { k: 'trajet', l: 'Trajet', t: 'texte', ph: 'Rouen – Pont-Audemer', large: true }, { k: 'qui', l: 'Qui', t: 'texte' }, { k: 'details', l: 'Précisions', t: 'texte' }],
      vue: (v, ctx) => lignesParJour(v, r => ({ h: heure(r.heure), titre: [txt(r.mode), txt(r.trajet)].filter(Boolean).join(' · '), sous: [txt(r.qui), txt(r.details)].filter(Boolean).join(' · ') }), ctx) },
    { k: 'hebergement', titre: 'Hébergement', forme: 'liste', ajout: 'Hébergement',
      colonnes: [{ k: 'nom', l: 'Nom', t: 'texte' }, { k: 'adresse', l: 'Adresse', t: 'texte', large: true }, { k: 'telephone', l: 'Téléphone', t: 'tel' },
        { k: 'arrivee', l: 'Arrivée', t: 'texte', ph: 'jeu. 17 déc., après 22h' }, { k: 'depart', l: 'Départ', t: 'texte' }, { k: 'details', l: 'Précisions', t: 'texte' }],
      vue: v => cartes(v, r => ({ titre: txt(r.nom), lignes: [txt(r.adresse), [txt(r.arrivee) && `Arrivée : ${txt(r.arrivee)}`, txt(r.depart) && `Départ : ${txt(r.depart)}`].filter(Boolean).join(' · '), txt(r.details)].filter(Boolean), tel: txt(r.telephone) })) },
    { k: 'repas', titre: 'Repas', forme: 'liste', ajout: 'Repas',
      colonnes: [{ k: 'jour', l: 'Jour', t: 'jour' }, { k: 'heure', l: 'Heure', t: 'heure' }, { k: 'ou', l: 'Où', t: 'texte', large: true }, { k: 'details', l: 'Précisions', t: 'texte', ph: 'Catering en loge, régimes transmis…' }],
      vue: (v, ctx) => lignesParJour(v, r => ({ h: heure(r.heure), titre: txt(r.ou) || 'Repas', sous: txt(r.details) }), ctx) },
    { k: 'equipe', titre: 'Équipe', forme: 'liste', base: true, cle: 'personne_id', ajout: 'Personne',
      colonnes: [{ k: 'nom', l: 'Nom', t: 'texte' }, { k: 'fonction', l: 'Fonction', t: 'texte', large: true }, { k: 'telephone', l: 'Téléphone', t: 'tel' }],
      vue: v => cartes(v, r => ({ titre: txt(r.nom), sous: txt(r.fonction), tel: txt(r.telephone) }), true) },
    { k: 'contacts', titre: 'Contacts', forme: 'liste', base: true, ajout: 'Contact',
      colonnes: [{ k: 'nom', l: 'Nom', t: 'texte', large: true }, { k: 'role', l: 'Rôle', t: 'texte' }, { k: 'telephone', l: 'Téléphone', t: 'tel' }, { k: 'email', l: 'Adresse électronique', t: 'email' }],
      vue: v => cartes(v, r => ({ titre: txt(r.nom), sous: txt(r.role), tel: txt(r.telephone), email: txt(r.email) })) },
    { k: 'documents', titre: 'Documents', forme: 'documents', base: true,
      vue: (v, ctx) => {
        const docs = Array.isArray(ctx.documents) ? ctx.documents : [];
        const items = (v || []).map(id => docs.find(d => String(d.id) === String(id))).filter(Boolean).map(d => ({ texte: txt(d.titre), url: lienSur(d.url) }));
        return items.length ? { forme: 'liste', items } : null;
      } },
    { k: 'notes', titre: 'Notes', forme: 'texte',
      vue: v => { const ps = paragraphes(v); return ps.length ? { forme: 'texte', paragraphes: ps } : null; } },
  ];
  const section = k => SECTIONS.find(s => s.k === k);
  const colonnesDe = s => s.forme === 'fiche' ? s.champs : s.colonnes || [];
  const videDe = s => s.forme === 'fiche' ? Object.fromEntries(s.champs.map(c => [c.k, c.t === 'case' ? false : c.t === 'nombre' ? null : ''])) : s.forme === 'texte' ? '' : [];
  const paragraphes = t => String(t || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  // les lignes d'une liste par jour, dans l'ordre (les lignes sans jour à la fin)
  function lignesParJour(v, f, ctx) {
    const xs = (Array.isArray(v) ? v : []).filter(r => Object.values(r || {}).some(x => txt(typeof x === 'boolean' ? '' : x)));
    if (!xs.length) return null;
    const jours = [...new Set(xs.map(r => estJour(r.jour) ? r.jour : ''))];
    const seul = jours.length === 1 && (!jours[0] || jours[0] === ctx.jourUnique);
    const groupes = [];
    xs.forEach(r => { const j = estJour(r.jour) ? r.jour : ''; let g = groupes.find(x => x.j === j); if (!g) groupes.push(g = { j, lignes: [] }); g.lignes.push(f(r)); });
    return { forme: 'lignes', groupes: groupes.map(g => ({ jour: seul ? '' : g.j ? maj(jourLong(g.j, false)) : 'Jour à préciser', lignes: g.lignes })) };
  }
  function cartes(v, f, compact = false) {
    const xs = (Array.isArray(v) ? v : []).map(f).filter(c => c.titre || c.tel || c.email || (c.lignes || []).length);
    return xs.length ? { forme: 'cartes', compact, cartes: xs } : null;
  }
  // le planning dans l'ordre du temps : par jour, puis par heure (une ligne sans heure finit sa journée)
  const cleTemps = r => `${estJour(r.jour) ? r.jour : '9999-99-99'} ${minutes(h5(r.heure)) === null ? '99:99' : h5(r.heure).padStart(5, '0')}`;
  const trier = xs => (Array.isArray(xs) ? xs : []).map((r, i) => [r, i]).sort((a, b) => cleTemps(a[0]) < cleTemps(b[0]) ? -1 : cleTemps(a[0]) > cleTemps(b[0]) ? 1 : a[1] - b[1]).map(x => x[0]);

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
  const libelleRep = (r, gabarit) => `${txt(gabarit?.quoi) || 'Représentation'}${r.public === 'scolaire' ? ' scolaire' : r.public === 'tout_public' ? ' tout public' : ''}${txt(r.note) ? ` (${txt(r.note)})` : ''}`;
  const plancher15 = m => Math.floor(m / 15) * 15, plafond15 = m => Math.ceil(m / 15) * 15;

  function composerPlanning(reps, modele, duree) {
    const etapes = (Array.isArray(modele) ? modele : []).filter(e => e && txt(e.quoi));
    // une étape à zéro minute, avant : la représentation elle-même (son nom, ses gens)
    const gabarit = etapes.find(e => !estApres(e) && (+e.avant_min || 0) === 0);
    const avant = etapes.filter(e => e !== gabarit && !estApres(e)).sort((a, b) => (+b.avant_min || 0) - (+a.avant_min || 0));
    const apres = etapes.filter(estApres).sort((a, b) => Math.abs(+a.avant_min || 0) - Math.abs(+b.avant_min || 0));
    const repas = etapes.find(e => /repas|dejeuner|diner|catering/.test(norm(e.quoi)));
    const vivantes = reps.filter(r => !r.annulee && estJour(r.jour));
    const jours = [...new Set(vivantes.map(r => r.jour))].sort();
    const lignes = [];
    const ligne = (jour, m, e, extra = {}) => lignes.push({ ...(m === null ? { jour, heure: '' } : instant(jour, m)), fin: '', quoi: txt(e.quoi), qui: txt(e.qui), ou: '', ...extra });
    jours.forEach((j, i) => {
      const premier = i === 0 || jourPlus(jours[i - 1], 1) !== j;
      const dernier = i === jours.length - 1 || jourPlus(j, 1) !== jours[i + 1];
      const garde = e => { const q = joursEtape(e); return q === 'tous' || (q === 'premier' && premier) || (q === 'dernier' && dernier); };
      const rs = vivantes.filter(r => r.jour === j).sort((a, b) => (minutes(a.heure) ?? 1e9) - (minutes(b.heure) ?? 1e9));
      const t0 = minutes(rs[0].heure);
      avant.filter(garde).forEach(e => ligne(j, t0 === null ? null : t0 - (+e.avant_min || 0), e));
      rs.forEach((r, k) => {
        const t = minutes(r.heure);
        lignes.push({ jour: j, heure: t === null ? '' : hhmm(t), fin: t !== null && duree ? instant(j, t + duree).heure : '', quoi: libelleRep(r, gabarit), qui: txt(gabarit?.qui), ou: '', rep: true });
        const suivante = rs[k + 1], t2 = suivante ? minutes(suivante.heure) : null;
        // entre deux représentations : un repas si l'écart dépasse trois heures
        if (t !== null && t2 !== null && t2 - (t + (duree || 90)) > 180) {
          const fin = t + (duree || 90);
          let m = t2 - Math.max(30, +repas?.avant_min || 120);
          m = m < fin + 30 ? plafond15(fin + 30) : plancher15(m);
          ligne(j, m, repas || { quoi: 'Repas', qui: 'Toute l’équipe' });
        }
      });
      const tz = minutes(rs[rs.length - 1].heure);
      apres.filter(garde).forEach(e => ligne(j, tz === null || !duree ? null : tz + duree + Math.abs(+e.avant_min || 0), e));
    });
    return trier(lignes);
  }

  // un contact écrit à la main (« Marie Dupont, 06 12 34 56 78, marie@lieu.fr ») : nom, téléphone, adresse électronique
  const RE_TEL = /(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/;
  const RE_MEL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
  function lireContact(texte, role) {
    let reste = String(texte || '');
    const tel = (reste.match(RE_TEL) || [''])[0], mel = (reste.match(RE_MEL) || [''])[0];
    if (tel) reste = reste.replace(tel, ' ');
    if (mel) reste = reste.replace(mel, ' ');
    reste = reste.replace(/\b(t[ée]l[ée]?(?:phone)?|portable|mobile|courriel|e-?mail|m[ée]l)\s*[.:]?\s*(?=[\s,;–—-]|$)/gi, ' ')
      .replace(/\(\s*\)/g, ' ').replace(/\s*[,;–—-]\s*(?=[,;–—-]|$)/g, '').replace(/^\s*[,;:–—-]\s*/, '').replace(/\s+/g, ' ').replace(/[\s,;:–—-]+$/, '').trim();
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

  function composer(sources) {
    const S = sources || {}, sp = S.spectacle || {}, l = S.lieu || null, suivi = S.suivi || {};
    const representations = (S.representations || []).filter(r => estJour(r.jour))
      .map(r => ({ jour: r.jour, heure: h5(r.heure), public: r.public || 'tout_public', note: txt(r.note), annulee: !!r.annulee })).sort((a, b) => cleTemps(a) < cleTemps(b) ? -1 : cleTemps(a) > cleTemps(b) ? 1 : 0);
    const sl = suivi.lieu || {};
    const precisions = [sl.jauge ? `Jauge : ${sl.jauge} places.` : '', txt(sl.plateau) ? `Plateau : ${txt(sl.plateau)}.` : ''].filter(Boolean).join(' ');
    const lieu = { ...videDe(section('lieu')), ...(l ? { nom: txt(l.nom), adresse: txt(l.adresse), commune: l.commune ? `${txt(l.commune)}${l.departement ? ` (${txt(l.departement)})` : ''}` : '', itineraire: itineraire(l), details: precisions } : {}) };
    const trajet = { ...videDe(section('trajet')), depart: txt(S.depart?.commune), estime: true };
    if (aPosition(S.depart) && aPosition(l)) {
      const km = distanceKm(S.depart, l) * 1.3;
      Object.assign(trajet, { distance_km: Math.round(km), duree_min: dureeRoute(km) });
    }
    return {
      representations, lieu, trajet,
      planning: composerPlanning(representations, sp.feuille_modele, dureeMinutes(sp.duree)),
      transport: [], hebergement: [], repas: [],
      equipe: (S.equipe || []).map(p => ({ personne_id: p.personne_id ?? null, nom: txt(p.nom), fonction: txt(p.fonction), telephone: telTexte(p.telephone) })),
      contacts: composerContacts(suivi, S.contacts),
      documents: (S.documents || []).filter(d => d && d.pour !== 'administration').map(d => d.id),
      notes: '',
    };
  }

  // ================================================================================================ recomposer
  // Recomposer une feuille déjà remplie sans perdre ce qui a été saisi à la main. contenu._base garde la composition
  // précédente : ce qui n'a pas bougé depuis est remplacé par la nouvelle composition ; une ligne ajoutée ou modifiée à
  // la main reste, une ligne retirée à la main ne revient pas. Sans _base (feuille plus ancienne), tout ce qui est là
  // reste. mode 'remplacer' : les blocs de la base sont repris tels que la base les donne. Les blocs remplis à la main
  // (transport, hébergement, repas, notes) ne changent jamais.
  const baseDe = c => Object.fromEntries(SECTIONS.filter(s => s.base).map(s => [s.k, clone(c?.[s.k] ?? videDe(s))]));
  const valeurCle = v => typeof v === 'boolean' ? v : v == null ? '' : String(v).trim();
  const cleLigne = (s, r) => s.forme === 'documents' ? String(r) : JSON.stringify(colonnesDe(s).map(c => valeurCle(r?.[c.k])));
  function fusionner(actuel, nouveau, mode = 'garder') {
    const A = actuel || {}, N = nouveau || {}, B = A._base && typeof A._base === 'object' ? A._base : null;
    const out = {}, gardes = [];
    const compter = (s, n) => { if (n) gardes.push({ section: s.titre, n }); };
    SECTIONS.forEach(s => {
      const k = s.k, a = A[k], n = N[k] ?? videDe(s);
      if (!s.base) { out[k] = clone(a ?? n); return; }
      if (mode === 'remplacer' || a == null) { out[k] = clone(n); return; }
      if (s.forme === 'fiche') {
        const b = B?.[k] || null, r = {};
        let g = 0;
        colonnesDe(s).forEach(c => {
          const va = a[c.k], vb = b ? b[c.k] : undefined, vn = n[c.k];
          const touche = b ? valeurCle(va) !== valeurCle(vb) : valeurCle(va) !== '' && valeurCle(va) !== valeurCle(vn) && va !== false;
          if (touche) { r[c.k] = va; g++; } else r[c.k] = vn;
        });
        // une distance recalculée (le lieu a changé) redevient une estimation
        if (k === 'trajet' && b && valeurCle(n.distance_km) !== valeurCle(b.distance_km) && valeurCle(r.distance_km) === valeurCle(n.distance_km)) r.estime = n.estime;
        out[k] = r; compter(s, g); return;
      }
      const xa = Array.isArray(a) ? a : [], xn = Array.isArray(n) ? n : [], xb = B && Array.isArray(B[k]) ? B[k] : null;
      if (s.cle) {
        // une ligne par personne : modifiée à la main, elle reste ; retirée à la main, elle ne revient pas
        const id = r => String(r?.[s.cle] ?? ''), res = [];
        let g = 0;
        xn.forEach(rn => {
          const ra = xa.find(x => id(x) === id(rn) && id(rn)), rb = xb?.find(x => id(x) === id(rn) && id(rn));
          if (ra) { if (rb && cleLigne(s, ra) === cleLigne(s, rb)) res.push(clone(rn)); else if (!rb && cleLigne(s, ra) === cleLigne(s, rn)) res.push(clone(rn)); else { res.push(clone(ra)); g++; } }
          else if (!rb || !xb) res.push(clone(rn));
        });
        xa.forEach(ra => {
          if (res.some(x => x === ra || (id(ra) && id(x) === id(ra)))) return;
          const rb = xb?.find(x => id(x) === id(ra) && id(ra));
          if (rb && cleLigne(s, ra) === cleLigne(s, rb)) return;   // venue de la base, sans retouche, et plus dans la base
          if (!id(ra) && res.some(x => cleLigne(s, x) === cleLigne(s, ra))) return;
          res.push(clone(ra)); g++;
        });
        out[k] = res; compter(s, g); return;
      }
      // une liste sans identifiant : on compare les lignes entières. Les lignes de la composition précédente qui ne sont
      // plus là ont été retirées ou retouchées à la main : la même ligne, recomposée, ne revient pas. Dans le planning,
      // une étape retirée ou retouchée ne revient pas non plus quand seule son heure a bougé ; une représentation,
      // elle, revient toujours avec l'heure de la base.
      const cleSouple = r => JSON.stringify(colonnesDe(s).filter(c => c.k !== 'heure' && c.k !== 'fin').map(c => valeurCle(r?.[c.k])));
      const ecartees = [...(xb || [])];
      const manuelles = [];
      xa.forEach(r => { const i = ecartees.findIndex(x => cleLigne(s, x) === cleLigne(s, r)); if (i >= 0) ecartees.splice(i, 1); else manuelles.push(r); });
      const res = [];
      xn.forEach(r => {
        let i = xb ? ecartees.findIndex(x => cleLigne(s, x) === cleLigne(s, r)) : -1;
        if (i < 0 && xb && s.souple && !r.rep) i = ecartees.findIndex(x => !x.rep && cleSouple(x) === cleSouple(r));
        if (i >= 0) { ecartees.splice(i, 1); return; }
        res.push(clone(r));
      });
      let g = 0;
      manuelles.forEach(r => { if (!xb && res.some(x => cleLigne(s, x) === cleLigne(s, r))) return; res.push(clone(r)); g++; });
      out[k] = k === 'planning' ? trier(res) : res; compter(s, g);
    });
    Object.keys(A).forEach(k => { if (!(k in out) && k !== '_base') out[k] = clone(A[k]); });
    out._base = baseDe(N);
    return { contenu: out, gardes };
  }

  // ================================================================================================ la vue commune
  // ce que montrent le HTML et le PDF : l'en-tête, puis chaque bloc qui a quelque chose à dire
  const cleRep = r => `${r.jour} ${h5(r.heure)} ${r.annulee ? 'annulée' : ''}`;
  function vue(feuille, contexte) {
    const f = feuille || {}, c = f.contenu || {}, ctx = contexte || {}, sp = ctx.spectacle || {}, d = ctx.date || {};
    const vivantes = r => estJour(r?.jour);
    const reps = (Array.isArray(c.representations) ? c.representations : (ctx.representations || []).map(r => ({ jour: r.jour, heure: h5(r.heure), public: r.public, note: r.note, annulee: !!r.annulee }))).filter(vivantes);
    const jours = [...new Set(reps.map(r => r.jour))].sort();
    const debut = jours[0] || d.debut || '', fin = jours[jours.length - 1] || d.fin || debut;
    const quand = !debut ? '' : debut === fin ? maj(jourLong(debut)) : `Du ${jourLong(debut, debut.slice(0, 4) !== fin.slice(0, 4))} au ${jourLong(fin)}`;
    const quandCourt = !debut ? '' : debut === fin ? `${+debut.slice(8)} ${MOIS[+debut.slice(5, 7) - 1]} ${debut.slice(0, 4)}` : `${+debut.slice(8)} ${MOIS[+debut.slice(5, 7) - 1]} – ${+fin.slice(8)} ${MOIS[+fin.slice(5, 7) - 1]} ${fin.slice(0, 4)}`;
    const lieu = c.lieu || {}, l = ctx.lieu || {};
    const ou = [txt(lieu.nom) || txt(l.nom), txt(lieu.commune) || (l.commune ? `${l.commune}${l.departement ? ` (${l.departement})` : ''}` : '')].filter(Boolean).join(', ');
    // les représentations, en tête : « 14h00 représentation scolaire », jour par jour s'il y en a plusieurs
    const publicTexte = p => p === 'scolaire' ? 'scolaire' : p === 'autre' ? '' : 'tout public';
    const representations = jours.map(j => ({ jour: jours.length > 1 ? maj(jourLong(j, false)) : '', seances: reps.filter(r => r.jour === j).sort((a, b) => cleTemps(a) < cleTemps(b) ? -1 : 1)
      .map(r => ({ h: heure(r.heure) || 'heure à préciser', texte: [publicTexte(r.public), txt(r.note)].filter(Boolean).join(', '), annulee: !!r.annulee })) }));
    // les horaires ont changé depuis cette version ? (contexte : la base d'aujourd'hui)
    let alerte = '';
    if (Array.isArray(c.representations) && Array.isArray(ctx.representations) && ctx.representations.length) {
      const a = c.representations.filter(vivantes).map(cleRep).sort().join('|'), b = ctx.representations.filter(vivantes).map(r => cleRep({ ...r, annulee: !!r.annulee })).sort().join('|');
      if (a !== b) alerte = `Les horaires ont changé depuis cette version de la feuille. Horaires à jour : ${ctx.representations.filter(vivantes).sort((x, y) => cleTemps(x) < cleTemps(y) ? -1 : 1)
        .map(r => `${jours.length > 1 || new Set(ctx.representations.map(x => x.jour)).size > 1 ? jourLong(r.jour, false) + ' ' : ''}${heure(h5(r.heure)) || 'heure à préciser'}${r.annulee ? ' (annulée)' : ''}`).join(', ')}.`;
    }
    const publiee = f.statut === 'publiee' && f.publiee_le;
    const quandPub = publiee ? (() => { const x = new Date(f.publiee_le); return isNaN(x) ? '' : `${x.getDate() === 1 ? '1er' : x.getDate()} ${MOIS[x.getMonth()]} ${x.getFullYear()} à ${x.getHours()}h${String(x.getMinutes()).padStart(2, '0')}`; })() : '';
    const version = publiee ? `Version ${f.version || 1}, publiée le ${quandPub}` : 'Brouillon, pas encore publié pour l’équipe';
    const ctxVue = { ...ctx, jourUnique: jours.length === 1 ? jours[0] : null };
    const sections = SECTIONS.filter(s => !s.entete && typeof s.vue === 'function').map(s => {
      const v = c[s.k];
      if (v == null || (Array.isArray(v) && !v.length) || v === '') return null;
      const b = s.vue(v, ctxVue);
      return b ? { k: s.k, titre: s.titre, ...b } : null;
    }).filter(Boolean);
    const filet = filetDe(sp);
    return { compagnie: COMPAGNIE, titre: txt(sp.titre) || 'Feuille de route', sousTitre: txt(f.titre), quand, quandCourt, ou, representations, alerte, version, publiee: !!publiee,
      sections, filet, fonce: fonceDe(filet), teinte: melanger(filet, '#ffffff', 0.9), slug: txt(sp.slug), debut };
  }

  // ================================================================================================ HTML
  const CSS = `
.feuille{--f-encre:#1d1720;--f-gris:#5f5763;--f-trait:#e6e0e5;--f-doux:#f7f4f6;--f-papier:#fff;
  box-sizing:border-box;max-width:800px;margin:0 auto;padding:30px 34px 24px;background:var(--f-papier);color:var(--f-encre);
  font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased;
  border:1px solid var(--f-trait);border-top:6px solid var(--f-filet);border-radius:4px;box-shadow:0 1px 2px rgba(20,10,20,.05),0 8px 28px rgba(20,10,20,.07);text-align:left}
.feuille *{box-sizing:border-box}
.feuille a{color:var(--f-fonce);text-underline-offset:2px}
.feuille .f-sur{margin:0;font-size:11.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--f-gris)}
.feuille h1{margin:8px 0 2px;font-size:30px;line-height:1.15;letter-spacing:-.01em;font-weight:800}
.feuille .f-soustitre{margin:2px 0 0;font-size:16px;color:var(--f-gris)}
.feuille .f-quand{margin:12px 0 0;font-size:18.5px;font-weight:700}
.feuille .f-ou{margin:1px 0 0;font-size:16px;color:var(--f-gris)}
.feuille .f-seances{display:flex;flex-wrap:wrap;gap:6px 8px;margin:14px 0 0;padding:0;list-style:none}
.feuille .f-seances li{display:inline-flex;align-items:baseline;gap:6px;padding:4px 11px;border-radius:999px;background:var(--f-teinte);font-size:14.5px}
.feuille .f-seances b{font-variant-numeric:tabular-nums}
.feuille .f-seances .f-jour{background:none;padding:4px 2px 4px 0;font-weight:700}
.feuille .f-seances .f-annulee{background:var(--f-doux);color:var(--f-gris);text-decoration:line-through}
.feuille .f-alerte{margin:16px 0 0;padding:10px 13px;border-radius:8px;background:#fdecea;color:#8c1d16;font-size:14.5px;font-weight:600}
.feuille .f-s{margin:28px 0 0}
.feuille .f-s>h2{margin:0 0 4px;padding:0 0 7px;border-bottom:1px solid var(--f-trait);font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--f-gris)}
.feuille .f-jourl{margin:14px 0 2px;font-size:14px;font-weight:800}
.feuille .f-l{display:grid;grid-template-columns:5.6em 1fr;gap:0 12px;padding:8px 0;border-bottom:1px solid var(--f-trait)}
.feuille .f-l:last-child{border-bottom:0}
.feuille .f-h{font-variant-numeric:tabular-nums;font-weight:700;white-space:nowrap}
.feuille .f-h small{display:block;font-weight:500;color:var(--f-gris);font-size:13px}
.feuille .f-t{font-weight:600}
.feuille .f-sous{display:block;color:var(--f-gris);font-size:14px;font-weight:400}
.feuille .f-l.f-accent{background:var(--f-teinte);border-left:3px solid var(--f-filet);margin:0 -10px;padding:9px 10px 9px 7px;border-bottom-color:transparent;border-radius:3px}
.feuille .f-cartes{display:grid;gap:0 22px}
.feuille .f-cartes.f-compact{grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
.feuille .f-c{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:2px 14px;padding:9px 0;border-bottom:1px solid var(--f-trait)}
.feuille .f-c .f-qui{min-width:0;flex:1 1 200px}
.feuille .f-c .f-coord{display:flex;flex-wrap:wrap;gap:2px 14px;font-variant-numeric:tabular-nums}
.feuille .f-c .f-coord a{white-space:nowrap}
.feuille .f-fiche .f-titre-fiche{margin:8px 0 0;font-weight:700;font-size:17px}
.feuille .f-fiche p{margin:2px 0 0}
.feuille .f-liens{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0}
.feuille .f-liens a{display:inline-block;padding:5px 12px;border:1px solid currentColor;border-radius:999px;font-weight:600;font-size:14px;text-decoration:none}
.feuille dl{display:grid;grid-template-columns:8.5em 1fr;gap:6px 14px;margin:12px 0 0}
.feuille dt{color:var(--f-gris);font-size:14px;padding-top:1px}
.feuille dd{margin:0;white-space:pre-line}
.feuille .f-texte p{margin:8px 0 0;white-space:pre-line}
.feuille ul.f-docs{margin:8px 0 0;padding-left:1.2em}
.feuille .f-pied{margin:30px 0 0;padding:10px 0 0;border-top:1px solid var(--f-trait);display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 16px;font-size:12.5px;color:var(--f-gris)}
@media (max-width:560px){
  .feuille{padding:20px 16px 18px;border-left:0;border-right:0;border-radius:0;box-shadow:none;font-size:15.5px}
  .feuille h1{font-size:25px}
  .feuille .f-quand{font-size:17px}
  .feuille .f-l{grid-template-columns:4.9em 1fr;gap:0 10px}
  .feuille dl{grid-template-columns:1fr;gap:0}
  .feuille dt{margin-top:8px}
}
@media print{
  @page{size:A4;margin:14mm 15mm 16mm}
  .feuille{max-width:none;margin:0;padding:0;border:0;border-top:4px solid var(--f-filet);border-radius:0;box-shadow:none;font-size:10.5pt;padding-top:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .feuille h1{font-size:21pt}
  .feuille a{color:inherit;text-decoration:none}
  .feuille .f-liens a{border:0;padding:0}
  .feuille .f-liens a::after{content:" : " attr(href);font-weight:400;font-size:8.5pt;color:var(--f-gris);word-break:break-all}
  .feuille .f-s>h2,.feuille .f-jourl{break-after:avoid}
  .feuille .f-l,.feuille .f-c{break-inside:avoid}
}`;
  const lien = (url, texte) => { const u = lienSur(url); return u ? `<a href="${esc(u)}"${/^https?:/i.test(u) ? ' target="_blank" rel="noopener"' : ''}>${esc(texte)}</a>` : esc(texte); };
  const RENDU_HTML = {
    lignes: b => b.groupes.map(g => `${g.jour ? `<p class="f-jourl">${esc(g.jour)}</p>` : ''}${g.lignes.map(x => `<div class="f-l${x.accent ? ' f-accent' : ''}"><span class="f-h">${esc(x.h || '–')}${x.h2 ? `<small>jusqu’à ${esc(x.h2)}</small>` : ''}</span><span><span class="f-t">${esc(x.titre)}</span>${x.sous ? `<span class="f-sous">${esc(x.sous)}</span>` : ''}</span></div>`).join('')}`).join(''),
    cartes: b => `<div class="f-cartes${b.compact ? ' f-compact' : ''}">${b.cartes.map(x => `<div class="f-c"><span class="f-qui"><span class="f-t">${esc(x.titre)}</span>${x.sous ? `<span class="f-sous">${esc(x.sous)}</span>` : ''}${(x.lignes || []).map(t => `<span class="f-sous">${esc(t)}</span>`).join('')}</span>${x.tel || x.email ? `<span class="f-coord">${x.tel ? lien(telLien(x.tel), telTexte(x.tel)) : ''}${x.email ? lien('mailto:' + x.email, x.email) : ''}</span>` : ''}</div>`).join('')}</div>`,
    fiche: b => `<div class="f-fiche">${b.titre ? `<p class="f-titre-fiche">${esc(b.titre)}</p>` : ''}${b.lignes.map(t => `<p>${esc(t)}</p>`).join('')}${b.liens.length ? `<p class="f-liens">${b.liens.map(x => lien(x.url, x.texte)).join('')}</p>` : ''}${b.paires.length ? `<dl>${b.paires.map(([t, v]) => `<dt>${esc(t)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}</div>`,
    texte: b => `<div class="f-texte">${b.paragraphes.map(p => `<p>${esc(p)}</p>`).join('')}</div>`,
    liste: b => `<ul class="f-docs">${b.items.map(x => `<li>${x.url ? lien(x.url, x.texte) : esc(x.texte)}</li>`).join('')}</ul>`,
  };
  function html(feuille, contexte) {
    const v = vue(feuille, contexte);
    const seances = v.representations.map(g => `${g.jour ? `<li class="f-jour">${esc(g.jour)}</li>` : ''}${g.seances.map(s => `<li${s.annulee ? ' class="f-annulee"' : ''}><b>${esc(s.h)}</b>${esc([s.texte, s.annulee ? 'annulée' : ''].filter(Boolean).join(', '))}</li>`).join('')}`).join('');
    return `<style>${CSS}</style><article class="feuille" lang="fr" style="--f-filet:${v.filet};--f-fonce:${v.fonce};--f-teinte:${v.teinte}">
<header><p class="f-sur">${esc(v.compagnie)} · Feuille de route</p><h1>${esc(v.titre)}</h1>${v.sousTitre ? `<p class="f-soustitre">${esc(v.sousTitre)}</p>` : ''}
${v.quand ? `<p class="f-quand">${esc(v.quand)}</p>` : ''}${v.ou ? `<p class="f-ou">${esc(v.ou)}</p>` : ''}${seances ? `<ul class="f-seances" aria-label="Représentations">${seances}</ul>` : ''}
${v.alerte ? `<p class="f-alerte" role="alert">${esc(v.alerte)}</p>` : ''}</header>
${v.sections.map(s => `<section class="f-s f-${s.k}"><h2>${esc(s.titre)}</h2>${RENDU_HTML[s.forme](s)}</section>`).join('\n')}
<footer class="f-pied"><span>${esc(v.compagnie)} · ${esc(v.titre)}${v.quandCourt ? ` · ${esc(v.quandCourt)}` : ''}</span><span>${esc(v.version)}</span></footer></article>`;
  }

  // ================================================================================================ PDF
  const vendorDefaut = ICI ? new URL('vendor/', ICI).href : 'vendor/';
  let chargement = null;
  const script = src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error(`impossible de charger ${src}`)); document.head.append(s); });
  function charger() {
    if (typeof pdfMake !== 'undefined' && pdfMake.vfs && pdfMake.vfs['Roboto-Regular.ttf']) return Promise.resolve();
    if (!chargement) {
      const dossier = String(api.vendor || vendorDefaut).replace(/\/?$/, '/');
      chargement = (typeof pdfMake !== 'undefined' ? Promise.resolve() : script(dossier + 'pdfmake.min.js'))
        .then(() => pdfMake.vfs && pdfMake.vfs['Roboto-Regular.ttf'] ? null : script(dossier + 'vfs_fonts.js'))
        .catch(e => { chargement = null; throw e; });
    }
    return chargement;
  }
  // la police du PDF (Roboto) n'a ni flèches ni espace fine : on les remplace
  const pt = s => String(s ?? '').replace(/ /g, ' ').replace(/[→⟶]/g, '–').replace(/[←]/g, '–').replace(/[✓✔]/g, '•');
  const ENCRE = '#1d1720', GRIS = '#5f5763', TRAIT = '#dcd5db';
  const LARGEUR = 595.28 - 2 * 50;
  const tableSobre = { hLineWidth: (i, n) => (i === 0 || i === n.table.body.length ? 0 : 0.5), vLineWidth: () => 0, hLineColor: () => TRAIT,
    paddingLeft: i => (i === 0 ? 0 : 8), paddingRight: () => 0, paddingTop: () => 5, paddingBottom: () => 5 };
  const RENDU_PDF = {
    lignes: (b, v) => {
      const corps = [];
      b.groupes.forEach(g => {
        if (g.jour) corps.push([{ text: pt(g.jour), colSpan: 2, bold: true, fontSize: 10, margin: [0, corps.length ? 8 : 2, 0, 0] }, {}]);
        g.lignes.forEach(x => corps.push([
          { text: pt(x.h ? (x.h2 ? `${x.h} – ${x.h2}` : x.h) : '–'), bold: true, noWrap: true, fillColor: x.accent ? v.teinte : null, margin: x.accent ? [4, 0, 0, 0] : [0, 0, 0, 0] },
          { stack: [{ text: pt(x.titre), bold: !!x.accent }, ...(x.sous ? [{ text: pt(x.sous), color: GRIS, fontSize: 8.5, margin: [0, 1, 0, 0] }] : [])], fillColor: x.accent ? v.teinte : null }]));
      });
      return { table: { widths: [74, '*'], body: corps, dontBreakRows: true }, layout: tableSobre };
    },
    cartes: b => ({ table: { widths: ['*', 'auto', 'auto'], dontBreakRows: true, body: b.cartes.map(x => [
      { stack: [{ text: pt(x.titre), bold: true }, ...(x.sous ? [{ text: pt(x.sous), color: GRIS, fontSize: 8.5 }] : []), ...(x.lignes || []).map(t => ({ text: pt(t), color: GRIS, fontSize: 8.5 }))] },
      x.tel ? { text: pt(telTexte(x.tel)), link: telLien(x.tel), noWrap: true } : { text: '' },
      x.email ? { text: pt(x.email), link: 'mailto:' + x.email, color: GRIS } : { text: '' }]) }, layout: tableSobre }),
    fiche: (b, v) => ({ stack: [
      ...(b.titre ? [{ text: pt(b.titre), bold: true, fontSize: 11, margin: [0, 4, 0, 1] }] : []),
      ...b.lignes.map(t => ({ text: pt(t) })),
      ...(b.liens.length ? [{ text: b.liens.flatMap((x, i) => [...(i ? [{ text: '   ' }] : []), { text: pt(x.texte), link: x.url, color: v.fonce, bold: true, decoration: 'underline' }]), margin: [0, 5, 0, 0] }] : []),
      ...(b.paires.length ? [{ table: { widths: [78, '*'], body: b.paires.map(([t, x]) => [{ text: pt(t), color: GRIS }, { text: pt(x) }]) }, layout: tableSobre, margin: [0, 6, 0, 0] }] : [])] }),
    texte: b => ({ stack: b.paragraphes.map((p, i) => ({ text: pt(p), margin: [0, i ? 5 : 3, 0, 0] })) }),
    liste: (b, v) => ({ ul: b.items.map(x => (x.url ? { text: pt(x.texte), link: x.url, color: v.fonce } : { text: pt(x.texte) })), margin: [0, 4, 0, 0] }),
  };
  function definition(feuille, contexte) {
    const v = vue(feuille, contexte);
    const seances = v.representations.flatMap(g => [
      ...(g.jour ? [{ text: pt(g.jour) + '  ', bold: true }] : []),
      ...g.seances.flatMap((s, i) => [...(i ? [{ text: '   ·   ', color: GRIS }] : []), { text: pt(s.h), bold: true, decoration: s.annulee ? 'lineThrough' : undefined },
        { text: pt(` ${[s.texte, s.annulee ? 'annulée' : ''].filter(Boolean).join(', ')}`), decoration: s.annulee ? 'lineThrough' : undefined, color: s.annulee ? GRIS : ENCRE }]),
      { text: '\n' }]);
    if (seances.length) seances.pop();
    const entete = [
      { text: pt(`${v.compagnie} · Feuille de route`).toUpperCase(), fontSize: 8, bold: true, characterSpacing: 1.6, color: GRIS },
      { text: pt(v.titre), fontSize: 23, bold: true, margin: [0, 6, 0, 0], lineHeight: 1.05 },
      ...(v.sousTitre ? [{ text: pt(v.sousTitre), fontSize: 11, color: GRIS, margin: [0, 2, 0, 0] }] : []),
      ...(v.quand ? [{ text: pt(v.quand), fontSize: 13, bold: true, margin: [0, 9, 0, 0] }] : []),
      ...(v.ou ? [{ text: pt(v.ou), fontSize: 11, color: GRIS, margin: [0, 1, 0, 0] }] : []),
      ...(seances.length ? [{ text: seances, fontSize: 10, margin: [0, 8, 0, 0], lineHeight: 1.35 }] : []),
      { canvas: [{ type: 'rect', x: 0, y: 0, w: LARGEUR, h: 3, color: v.filet }], margin: [0, 12, 0, 0] },
      ...(v.alerte ? [{ table: { widths: ['*'], body: [[{ text: pt(v.alerte), color: '#8c1d16', bold: true, fillColor: '#fdecea', margin: [6, 4, 6, 4] }]] }, layout: 'noBorders', margin: [0, 10, 0, 0] }] : []),
    ];
    const corps = v.sections.flatMap(s => [
      { stack: [{ text: pt(s.titre).toUpperCase(), fontSize: 8.5, bold: true, characterSpacing: 1.6, color: GRIS }, { canvas: [{ type: 'line', x1: 0, y1: 3, x2: LARGEUR, y2: 3, lineWidth: 0.6, lineColor: TRAIT }] }],
        margin: [0, 18, 0, 4], headlineLevel: 1 },
      RENDU_PDF[s.forme](s, v)]);
    return {
      pageSize: 'A4', pageMargins: [50, 54, 50, 50],
      info: { title: pt(`Feuille de route · ${v.titre}${v.quandCourt ? ' · ' + v.quandCourt : ''}`), author: COMPAGNIE, subject: pt(v.version) },
      defaultStyle: { font: 'Roboto', fontSize: 9.5, lineHeight: 1.22, color: ENCRE },
      header: page => page === 1 ? null : { margin: [50, 24, 50, 0], columns: [
        { text: pt(`${v.compagnie} · Feuille de route`), fontSize: 7.5, color: GRIS },
        { text: pt(`${v.titre}${v.quandCourt ? ' · ' + v.quandCourt : ''}`), fontSize: 7.5, color: GRIS, alignment: 'right' }] },
      footer: (page, pages) => ({ margin: [50, 18, 50, 0], columns: [
        { text: pt(v.version), fontSize: 7.5, color: GRIS },
        { text: `${page} / ${pages}`, fontSize: 7.5, color: GRIS, alignment: 'right' }] }),
      content: [...entete, ...corps],
      pageBreakBefore: (n, suivants) => n.headlineLevel === 1 && suivants.length < 3,
    };
  }
  async function pdf(feuille, contexte) {
    await charger();
    const dd = definition(feuille, contexte);
    return new Promise((ok, ko) => { try { pdfMake.createPdf(dd).getBlob(ok); } catch (e) { ko(e); } });
  }
  const nomFichier = (feuille, contexte) => {
    const v = vue(feuille, contexte);
    const morceaux = ['feuille-de-route', v.slug, v.debut, feuille?.statut === 'publiee' ? `v${feuille.version || 1}` : 'brouillon'].filter(Boolean);
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

  const api = { composer, html, pdf, telecharger, vendor: vendorDefaut, SECTIONS, DEROULE, fusionner, trier, joursEtape, estApres, dureeMinutes,
    dureeTexte, heure, jourLong, telTexte, telLien, itineraire, lireContact, nomFichier, definition, vue, css: CSS };
  return api;
})();
