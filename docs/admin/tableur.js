'use strict';
/* Le tableur des représentations (#/representations/tableur), à côté de la liste : une ligne par séance (jour et heure),
   comme le tableur où la compagnie récapitule ses représentations ; les séances d'une même date se suivent, en bande.
   Branché sur la base dans les deux sens : écrire dans une case enregistre aussitôt, par le même chemin que la fiche d'une
   date (ecrireDate : crescite_enregistrer_date, puis l'équipe ; les mêmes déclencheurs, notifications et journal), avec
   « Annuler » et Ctrl+Z ; ce qui change ailleurs arrive en direct (le temps réel redessine les lignes, la case active
   reste, ce qui a changé clignote). Une case « de la date » (spectacle, lieu, statut, nature, distribution, billetterie,
   suivi) vaut pour toutes les séances de la date : les autres lignes de la date la répètent en gris et s'éclairent avec
   elle. Ce qui est vide reste vide ; une colonne vide sur toute la vue se replie (« Colonnes vides » la montre). Filtres :
   saison, spectacle, à venir / passées / toutes, recherche ; tri par date.
   La distribution : l'équipe de la date (la distribution « en tournée » par défaut ; une équipe explicite ne s'écrit que
   si on la change), en pastilles ; « Étendre à… » la pose sur les dates du même spectacle (la saison, l'année civile, ou
   les lignes choisies), après un aperçu qui signale les remplaçants posés à la main. « ＋ Séance » : une date du même
   spectacle au même lieu qui touche ce jour (le même ou un voisin) la reçoit, sinon une date se crée ; le tableur dit ce
   qu'il a fait. Exporter : Excel (.xlsx écrit ici, sans bibliothèque), CSV, Google Sheets (le tableau copié, à coller
   dans sheets.new). « Importer » : des lignes copiées d'Excel deviennent des séances, après un aperçu.
   Au clavier : flèches, Entrée ou F2 (ou taper directement) pour écrire, Échap, Tab, Maj+flèches pour choisir des
   cases, Ctrl+C / Ctrl+V comme dans un tableur, Suppr pour vider, Ctrl+Z pour annuler, Ctrl+Suppr pour supprimer la
   séance (à la souris : le bouton « Supprimer la séance du … », qui dit laquelle).
   Ce que le tableur lit et écrit : les dates, leurs séances, leur suivi (organisateur, contact, contrat, notes), leurs
   chiffres (jauge, spectateurs, heures d'ateliers : quand la base a le dixième script), leur équipe, et, depuis l'audit
   de la chaîne commerciale, le montant de cession HT (colonne « Cession HT (€) », niveau « date », présente quand la base
   a le script de la compagnie idéale : E.ideale). Il le lit dans le suivi de la date (E.suivis, montant_cession) et le
   remet à ecrireDate dans F.suivi.montant_cession ; c'est ecrireDate, dans le script principal, qui l'écrit par un
   upsert de crescite_dates_suivi, après le RPC (le même chemin que le champ « Montant de cession HT » de la fiche d'une
   date). À l'import, une colonne « cession », « montant » ou « prix » le reprend de la même façon. Rien d'autre.

   Après quoi il se charge : ce module est un script classique, chargé après tableau.js et avant menus.js (admin/index.html),
   donc après le script principal et après agenda.js, gestes.js, feuille.js, equipe.js et planning.js. Il ne lit rien de ce
   qui se déclare plus bas (menus.js et la suite : tiroir.js, tournee.js…), sauf TOURNEE, sous typeof et au seul appel de
   choixVue. Au chargement, il n'évalue que son état T, ses constantes, COLONNES (qui lit CHIFFRES, un const du script
   principal : déjà là) et COLONNES.forEach ; natif() n'est que déclarée. Aucune ligne de code n'a changé en quittant
   admin/index.html : le banc site/tableur.mjs le garde.

   Son API (la globale TABLEUR) :
     TABLEUR.vue()            la vue #/representations/tableur (lue par le routage du script principal)
     TABLEUR.choixVue(v)      les trois liens « Liste · Tableur · Carte » en tête de Représentations ; v : 'liste',
                              'tableur' ou 'carte' (lue aussi par tournee.js)
     TABLEUR.lireJour(t, ref) un jour tapé ou collé (« 5/11 », « jeu. 5 nov. 2026 ») → 'AAAA-MM-JJ', ou undefined
     TABLEUR.lireHeure(t)     une heure tapée (« 20h30 », « 2030 ») → 'HH:MM', '' si vide, ou undefined
     TABLEUR.lireTsv(texte)   un texte de tableur (tabulations, guillemets d'Excel) → des lignes de cases
     TABLEUR.xlsx({ entetes, lignes })   un classeur .xlsx (un Blob), écrit ici sans bibliothèque
     TABLEUR.lireImport(texte)           les lignes collées → { lignes (chacune avec son aperçu et ses erreurs), cles, avecTete }
   (lireJour, lireHeure, lireTsv, xlsx et lireImport ne sont lues par aucun autre module : les bancs les atteignent.)

   Ce qu'il lit du script principal (admin/index.html), relevé par grep croisé avec les déclarations :
     E, $, $$, esc, clone, norm, AUJ, h5, jourCourt, lieu, spectacle, lieuTexte, repsDe, couleurSp (l'état et les petits
     outils) ; session (il écrit session.tableur : les filtres de la vue), garderFiltres ; annoncer, erreur, cadre,
     partirSansPerdre ; cleRch, motsRch (la recherche) ; choixSpectacles, comboLieu (les champs de la fiche) ;
     nouvelleDate, dateVersForm, chiffresVersForm, nombreFr, CHIFFRES, NATURES_DATE, PUBLIABLE, manqueDate (le formulaire
     d'une date) ; ecrireDate, effacerDate (l'écriture, par le chemin de la fiche) ;
     AGENDA.heureTexte, AGENDA.MOIS (admin/agenda.js).
   D'admin/equipe.js : personne, nomDe, distributionDe, fonctionDistribution, equipeDate, equipeDeLaDate, ecartsDate,
     enregistrerEquipeDate, listeEt.
   Sous typeof (le module marche sans eux) : GESTES (gestes.js : garder et saisie, pour la fenêtre d'import) et TOURNEE
     (tournee.js : le lien « Carte » de choixVue, absent sans elle).
   Il ne lit ni sb ni CALME_ADMIN : il n'écrit rien lui-même dans la base, tout passe par ecrireDate et
   enregistrerEquipeDate. Le CSS du tableur (.tableur, .tab-…) et l'animation tab-ok restent dans admin/index.html. */
const TABLEUR = (() => {
  // ==================== l'état de la vue et les petits outils
  const T = { f: null, cols: [], lignes: [], actif: { l: 0, c: 0 }, ancre: null, edition: null, pop: null, pile: [],
    file: Promise.resolve(), recents: new Map(), textes: null, aRafraichir: false, attente: 0 };
  const natif = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const PUBLICS = [['tout_public', 'Tout public'], ['scolaire', 'Scolaire'], ['autre', 'Autre']];
  const STATUTS = [['option', 'Option'], ['confirmee', 'Confirmée'], ['annulee', 'Annulée'], ['reportee', 'Reportée']];
  const CONTRATS = [['à envoyer', 'À envoyer'], ['envoyé', 'Envoyé'], ['signé', 'Signé']];
  const libelleDe = (xs, v) => (xs.find(x => x[0] === v) || [null, ''])[1];
  const suiviDe = d => E.suivis.find(x => x.date_id === d.id) || {};
  const nature = d => d.nature || 'representations';
  const pl = (n, un, des) => `${n} ${n > 1 ? des || `${un}s` : un}`;
  const iso = (a, m, j) => { const x = new Date(Date.UTC(a, m - 1, j)); return x.getUTCFullYear() === a && x.getUTCMonth() === m - 1 && x.getUTCDate() === j ? `${a}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}` : undefined; };
  const jjmmaaaa = j => (j ? `${j.slice(8, 10)}/${j.slice(5, 7)}/${j.slice(0, 4)}` : '');

  // ==================== la lecture de ce qu'on tape ou colle (un jour, une heure, un choix, un spectacle, un lieu, des personnes)
  // ———— lire ce qu'on tape ou colle
  // un jour : « 5/11/2026 », « 05/11 », « 2026-11-05 », « jeu. 5 nov. 2026 », « 5 novembre » ; sans année, celle qui le
  // met au plus près du jour de référence (celui de la ligne, sinon aujourd'hui)
  const MOIS_LUS = [['janv', 1], ['jan', 1], ['fev', 2], ['mars', 3], ['mar', 3], ['avr', 4], ['mai', 5], ['juin', 6], ['juil', 7], ['aou', 8], ['sep', 9], ['oct', 10], ['nov', 11], ['dec', 12]];
  const moisDe = w => (MOIS_LUS.find(([p]) => w.startsWith(p)) || [null, 0])[1];
  function proche(m, j, ref) {
    const r = ref || AUJ, a0 = +r.slice(0, 4), t = Date.parse(`${r}T12:00:00Z`);
    return [a0 - 1, a0, a0 + 1].map(a => iso(a, m, j)).filter(Boolean)
      .sort((x, y) => Math.abs(Date.parse(`${x}T12:00:00Z`) - t) - Math.abs(Date.parse(`${y}T12:00:00Z`) - t))[0];
  }
  function lireJour(t, ref) {
    const s = norm(String(t ?? '')).trim().replace(/^(lun|mar|mer|jeu|ven|sam|dim)[a-z]*\.?,?\s+(?=\d)/, '');
    let m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return iso(+m[1], +m[2], +m[3]);
    if ((m = s.match(/^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2}|\d{4}))?$/))) return m[3] ? iso(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]) : proche(+m[2], +m[1], ref);
    if ((m = s.match(/^(\d{1,2})(?:er)?\s+([a-z]+)\.?(?:\s+(\d{4}))?$/))) { const mo = moisDe(m[2]); return !mo ? undefined : m[3] ? iso(+m[3], mo, +m[1]) : proche(mo, +m[1], ref); }
    if ((m = s.match(/^(\d{5})$/)) && +m[1] > 30000 && +m[1] < 80000) return new Date(Date.UTC(1899, 11, 30) + +m[1] * 864e5).toISOString().slice(0, 10);   // un jour d'Excel
    return undefined;
  }
  // une heure : « 20h », « 20h30 », « 20:30 », « 2030 » ; vide : pas d'heure
  function lireHeure(t) {
    const s = String(t ?? '').trim().toLowerCase().replace(/\s+/g, '');
    if (!s) return '';
    const m = s.match(/^(\d{1,2})(?:[h:.](\d{2})?)?$/) || s.match(/^(\d{1,2})(\d{2})$/);
    if (!m) return undefined;
    const h = +m[1], mi = +(m[2] || 0);
    return h < 24 && mi < 60 ? `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` : undefined;
  }
  const heureT = h => (h ? AGENDA.heureTexte(h5(h)) : '');
  // un choix par sa valeur ou son libellé (« Scolaire », « scolaire », « confirmée »)
  const lireChoix = xs => t => { const n = norm(t).trim(); if (!n) return undefined; const x = xs.find(([v, l]) => norm(v) === n || norm(l) === n || norm(l).startsWith(n)); return x ? x[0] : undefined; };
  function trouverSpectacle(t) {
    const n = norm(t).trim(); if (!n) return undefined;
    const court = s => norm(s.titre.split(' – ')[0]);
    const s = E.spectacles.find(x => norm(x.titre) === n || court(x) === n || x.slug === n) || E.spectacles.find(x => norm(x.titre).startsWith(n) || n.startsWith(court(x)));
    return s ? s.id : undefined;
  }
  function trouverLieu(t, commune = '') {
    const n = norm(t).trim(), c = norm(commune).trim();
    if (!n) return null;
    const xs = E.lieux.filter(l => norm(lieuTexte(l)) === n || norm(l.nom) === n || norm(`${l.nom}, ${l.commune}`) === n || norm(`${l.nom} ${l.commune}`) === n || (!l.nom && norm(l.commune) === n));
    const ys = c ? xs.filter(l => norm(l.commune) === c) : xs;
    if (ys.length === 1) return ys[0].id;
    if (xs.length === 1) return xs[0].id;
    const zs = E.lieux.filter(l => norm(l.commune) === n);
    return zs.length === 1 ? zs[0].id : undefined;
  }
  function lirePersonnes(t) {
    const morceaux = String(t ?? '').split(/[,;/\n]|\s+et\s+/).map(x => x.trim()).filter(Boolean), ids = [];
    for (const m of morceaux) {
      const n = norm(m);
      const xs = E.personnes.filter(p => norm(nomDe(p)) === n), ys = xs.length ? xs : E.personnes.filter(p => norm(p.prenom) === n || norm(p.nom) === n);
      if (ys.length !== 1) return undefined;
      ids.push(ys[0].id);
    }
    return [...new Set(ids)];
  }

  // ———— l'équipe d'une date : l'équipe effective (la distribution « en tournée », moins qui ne part pas, plus les renforts)
  const equipeIds = d => (E.equipeInstallee ? equipeDeLaDate(d).map(x => x.personne_id) : []);
  const tourneeIds = spId => equipeDate(spId, []).map(x => x.personne_id);
  // les écarts qui donnent cette équipe-là (une liste d'identifiants) : rien d'explicite pour qui part par défaut
  function ecartsPour(d, ids, spId = d.spectacle_id) {
    const voulus = new Set(ids), actuels = ecartsDate(d.id), base = tourneeIds(spId), out = [];
    base.forEach(p => { if (!voulus.has(p)) out.push({ personne_id: p, present: false, fonction: '', note: null }); else { const e = actuels.find(x => x.personne_id === p && x.present); if (e) out.push(e); } });
    voulus.forEach(p => { if (!base.includes(p)) out.push(actuels.find(x => x.personne_id === p && x.present) || { personne_id: p, present: true, fonction: '', note: null }); });
    return out;
  }
  const prenoms = ids => { const ps = ids.map(personne).filter(Boolean); return ps.map(p => (ps.filter(q => norm(q.prenom) === norm(p.prenom)).length > 1 && p.nom ? `${p.prenom || ''} ${p.nom[0]}.` : p.prenom || nomDe(p)).trim()); };

  // ==================== les colonnes
  // ———— les colonnes
  // niveau : 'seance' (la ligne), 'date' (toutes les séances de la date), 'lieu' (lu dans la fiche du lieu). val : la valeur
  // (pour écrire, annuler, comparer) ; texte : ce qui s'affiche et se copie ; exp : la valeur exportée ; lire : un texte
  // tapé ou collé → une valeur (undefined : pas reconnu) ; ecrire : la valeur dans le formulaire de la date (dateVersForm)
  const repDe = (F, x) => {
    if (x.r) { const r = F.representations.find(y => y.id === x.r.id); if (!r) throw new Error('Cette séance n’existe plus (elle a été retirée ailleurs).'); return r; }
    if (!F._nouvelle) { F._nouvelle = { jour: F.debut, heure: '', fin: '', public: F.public && F.public !== 'mixte' ? F.public : 'tout_public', annulee: false, lien: '', note: '' }; F.representations.push(F._nouvelle); }
    return F._nouvelle;
  };
  const lieuDe = x => lieu(x.d.lieu_id);
  const COLONNES = [
    { k: 'jour', l: 'Jour', niveau: 'seance', type: 'jour', toujours: true,
      val: x => (x.r ? x.r.jour : x.d.debut),
      texte: x => (x.r ? jourCourt(x.r.jour) : x.d.precision === 'mois' ? `${AGENDA.MOIS[+x.d.debut.slice(5, 7) - 1]} ${x.d.debut.slice(0, 4)}` : `${jourCourt(x.d.debut)}${x.d.fin && x.d.fin !== x.d.debut ? ` → ${jourCourt(x.d.fin)}` : ''}`),
      copie: x => jjmmaaaa(x.r ? x.r.jour : x.d.debut), exp: x => ({ jour: x.r ? x.r.jour : x.d.debut }),
      lire: (t, x) => lireJour(t, x ? (x.r ? x.r.jour : x.d.debut) : AUJ), ecrire: (F, x, v) => { repDe(F, x).jour = v; } },
    { k: 'spectacle', l: 'Spectacle', niveau: 'date', type: 'choix', toujours: true, choix: () => choixSpectacles().map(([v, l]) => [+v, l]),
      val: x => x.d.spectacle_id, texte: x => spectacle(x.d.spectacle_id)?.titre || '',
      html: x => { const s = spectacle(x.d.spectacle_id); return s ? `<span class="pastille" style="--c:${esc(couleurSp(s))}"></span>${esc(s.titre)}` : ''; },
      lire: t => trouverSpectacle(t), ecrire: (F, x, v) => { F.spectacle_id = v; } },
    { k: 'heure', l: 'Heure', niveau: 'seance', type: 'heure', val: x => h5(x.r?.heure), texte: x => heureT(x.r?.heure), copie: x => h5(x.r?.heure),
      exp: x => ({ heure: h5(x.r?.heure) }), lire: t => lireHeure(t), ecrire: (F, x, v) => { repDe(F, x).heure = v; } },
    { k: 'fin', l: 'Fin', niveau: 'seance', type: 'heure', si: () => E.sql3, val: x => h5(x.r?.fin), texte: x => heureT(x.r?.fin), copie: x => h5(x.r?.fin),
      exp: x => ({ heure: h5(x.r?.fin) }), lire: t => lireHeure(t), ecrire: (F, x, v) => { repDe(F, x).fin = v; } },
    { k: 'lieu', l: 'Lieu', niveau: 'date', type: 'lieu', val: x => x.d.lieu_id ?? null,
      texte: x => { const l = lieuDe(x); return l ? l.nom || l.commune : ''; },
      html: x => { const l = lieuDe(x), ailleurs = !l && (x.d.intitule || '').split(' — ')[1]; return l ? esc(l.nom || l.commune) : ailleurs ? `<span class="tab-gris" title="Lieu repris de l’ancien site, sans fiche">${esc(ailleurs)}</span>` : ''; },
      lire: (t, x, ligne) => trouverLieu(t, ligne?.commune), vider: true, ecrire: (F, x, v) => { F.lieu_id = v; } },
    { k: 'commune', l: 'Commune', niveau: 'lieu', type: 'lecture', val: x => lieuDe(x)?.commune || '',
      texte: x => { const l = lieuDe(x); return l ? `${l.commune}${l.departement ? ` (${l.departement})` : ''}` : ''; } },
    { k: 'public', l: 'Public', niveau: 'seance', type: 'choix', choix: () => PUBLICS, val: x => (x.r ? x.r.public : ''), texte: x => (x.r ? libelleDe(PUBLICS, x.r.public) : ''),
      lire: lireChoix(PUBLICS), ecrire: (F, x, v) => { repDe(F, x).public = v; } },
    { k: 'statut', l: 'Statut', niveau: 'date', type: 'choix', choix: () => STATUTS, val: x => x.d.statut, texte: x => libelleDe(STATUTS, x.d.statut),
      html: x => (x.d.statut === 'confirmee' ? 'Confirmée' : `<span class="badge ${x.d.statut === 'annulee' ? 'annulee' : 'option'}">${esc(libelleDe(STATUTS, x.d.statut))}</span>`),
      lire: lireChoix(STATUTS), ecrire: (F, x, v) => { F.statut = v; } },
    { k: 'nature', l: 'Nature', niveau: 'date', type: 'choix', si: () => E.sql3, choix: () => NATURES_DATE, val: x => nature(x.d), texte: x => libelleDe(NATURES_DATE, nature(x.d)),
      lire: lireChoix(NATURES_DATE), ecrire: (F, x, v) => { F.nature = v; if (!PUBLIABLE(v)) F.visible = false; } },
    { k: 'distribution', l: 'Distribution', niveau: 'date', type: 'equipe', si: () => E.equipeInstallee, val: x => equipeIds(x.d),
      texte: x => equipeIds(x.d).map(id => nomDe(personne(id))).filter(Boolean).join(', '),
      // des pastilles sur une ligne : autant qu'il en tient, puis « +n »
      html: x => { const ids = equipeIds(x.d), ns = prenoms(ids); let place = 232, k = 0; for (; k < ns.length && place - (ns[k].length * 7.4 + 22) >= (k < ns.length - 1 ? 34 : 0); k++) place -= ns[k].length * 7.4 + 22;
        return ns.slice(0, k).map(n => `<span class="tab-pastille">${esc(n)}</span>`).join('') + (k < ns.length ? `<span class="tab-pastille plus">+${ns.length - k}</span>` : ''); },
      lire: t => (String(t ?? '').trim() ? lirePersonnes(t) : []), vider: true, ecrire: (F, x, v) => { F.equipe = ecartsPour({ ...x.d, spectacle_id: F.spectacle_id }, v, F.spectacle_id); } },
    { k: 'billetterie', l: 'Billetterie', niveau: 'date', type: 'lien', val: x => x.d.lien || '', texte: x => x.d.lien || '',
      html: x => (x.d.lien ? esc(String(x.d.lien).replace(/^https?:\/\/(www\.)?/, '')) : ''),
      lire: t => { const s = String(t ?? '').trim(); return !s ? '' : /^https?:\/\/\S+$/.test(s) ? s : /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s) ? `https://${s}` : undefined; }, vider: true, ecrire: (F, x, v) => { F.lien = v; } },
    { k: 'precisions', l: 'Précisions', niveau: 'seance', type: 'texte', val: x => x.r?.note || '', texte: x => x.r?.note || '', lire: t => String(t ?? '').trim(), vider: true, ecrire: (F, x, v) => { repDe(F, x).note = v; } },
    { k: 'organisateur', l: 'Organisateur', niveau: 'date', type: 'texte', val: x => suiviDe(x.d).organisateur || '', texte: x => suiviDe(x.d).organisateur || '', lire: t => String(t ?? '').trim(), vider: true, ecrire: (F, x, v) => { F.suivi.organisateur = v; } },
    { k: 'contact', l: 'Contact', niveau: 'date', type: 'texte', val: x => suiviDe(x.d).contact || '', texte: x => suiviDe(x.d).contact || '', lire: t => String(t ?? '').trim(), vider: true, ecrire: (F, x, v) => { F.suivi.contact = v; } },
    { k: 'contrat', l: 'Contrat', niveau: 'date', type: 'choix', choix: () => [['', '—'], ...CONTRATS], val: x => suiviDe(x.d).contrat || '', texte: x => libelleDe(CONTRATS, suiviDe(x.d).contrat || ''),
      lire: t => (String(t ?? '').trim() ? lireChoix(CONTRATS)(t) : ''), vider: true, ecrire: (F, x, v) => { F.suivi.contrat = v; } },
    { k: 'montant', l: 'Cession HT (€)', niveau: 'date', type: 'texte', nombre: true, si: () => !!E.ideale,
      val: x => suiviDe(x.d).montant_cession ?? '', texte: x => { const v = suiviDe(x.d).montant_cession; return v == null || v === '' ? '' : nombreFr(v); },
      lire: t => { const n = String(t ?? '').trim().replace(/\s|€/g, '').replace(',', '.'); if (!n) return ''; const v = Number(n); return Number.isFinite(v) && v >= 0 && v < 1e7 ? Math.round(v * 100) / 100 : undefined; },
      vider: true, ecrire: (F, x, v) => { F.suivi.montant_cession = v; } },
    { k: 'notes', l: 'Notes', niveau: 'date', type: 'long', val: x => suiviDe(x.d).notes || '', texte: x => suiviDe(x.d).notes || '', lire: t => String(t ?? '').trim(), vider: true, ecrire: (F, x, v) => { F.suivi.notes = v; } },
    // les chiffres (le dixième script) : jamais publiés ; des nombres (« 12,5 » s'écrit aussi), vides quand on ne sait pas
    ...CHIFFRES.map(([k, l, pas, max]) => ({ k: `chiffre-${k}`, l: l.replace(' (places)', ''), niveau: 'date', type: 'texte', nombre: true, si: () => !!E.chiffresInstalles,
      val: x => chiffresVersForm(x.d.id)[k], texte: x => { const v = chiffresVersForm(x.d.id)[k]; return v === '' ? '' : nombreFr(v); },
      lire: t => { const n = String(t ?? '').trim().replace(/\s/g, '').replace(',', '.'); if (!n) return ''; const v = Number(n);
        return Number.isFinite(v) && v >= 0 && v <= max ? (pas < 1 ? Math.round(v * 2) / 2 : Math.round(v)) : undefined; },
      vider: true, ecrire: (F, x, v) => { F.chiffres = F.chiffres || {}; F.chiffres[k] = v; } })),
    { k: 'annulee', l: 'Séance annulée', niveau: 'seance', type: 'case', val: x => !!x.r?.annulee, texte: x => (x.r?.annulee ? 'annulée' : ''),
      html: x => (x.r?.annulee ? '<span class="badge annulee">annulée</span>' : ''), lire: t => /^(oui|x|vrai|true|1|annulee?)$/i.test(norm(t).trim()) || (String(t ?? '').trim() ? undefined : false),
      ecrire: (F, x, v) => { repDe(F, x).annulee = !!v; } },
    { k: 'site', l: 'Site', niveau: 'date', type: 'case', fige: x => nature(x.d) !== 'representations', val: x => nature(x.d) === 'representations' && !x.d.visible,
      texte: x => (nature(x.d) === 'representations' && !x.d.visible ? 'masquée' : ''), html: x => (nature(x.d) === 'representations' && !x.d.visible ? '<span class="badge masquee">masquée</span>' : ''),
      lire: t => /^(masquee?|cachee?|non|oui)$/i.test(norm(t).trim()) ? /^(masquee?|cachee?|oui)$/i.test(norm(t).trim()) : (String(t ?? '').trim() ? undefined : false),
      ecrire: (F, x, v) => { F.visible = !v; } },
  ];
  COLONNES.forEach(c => { if (!c.copie) c.copie = c.texte; });
  const colonne = k => COLONNES.find(c => c.k === k);

  // ==================== la grille : les lignes, la vue, le dessin, les gestes
  // ———— les lignes : les dates filtrées, puis leurs séances (une date sans séance : une ligne, son jour ou sa période)
  function lignes() {
    const f = T.f, mots = motsRch(f.q);
    const texte = d => { const s = spectacle(d.spectacle_id), l = lieu(d.lieu_id), su = suiviDe(d);
      return cleRch(`${s?.titre || ''} ${l ? `${l.nom || ''} ${l.commune} ${l.departement || ''}` : ''} ${d.intitule || ''} ${su.organisateur || ''} ${su.contact || ''} ${su.notes || ''} ${repsDe(d.id).map(r => r.note || '').join(' ')} ${libelleDe(STATUTS, d.statut)} ${libelleDe(NATURES_DATE, nature(d))} ${equipeIds(d).map(id => nomDe(personne(id))).join(' ')}`); };
    const ds = E.dates.filter(d => (!f.spectacle || String(d.spectacle_id) === f.spectacle) && (!f.saison || d.saison === f.saison)
      && (f.periode === 'toutes' || (f.periode === 'passees' ? (d.fin || d.debut) < AUJ : (d.fin || d.debut) >= AUJ))
      && (!mots.length || (t => mots.every(m => t.includes(m)))(texte(d))))
      .sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : a.id - b.id) * (f.tri === 'desc' ? -1 : 1));
    const out = [];
    ds.forEach((d, n) => {
      const reps = repsDe(d.id);
      (reps.length ? reps : [null]).forEach((r, i) => out.push({ d, r, premier: i === 0, n: reps.length || 1, bande: n % 2, cle: `${d.id}:${r ? r.id : 'd'}` }));
    });
    return out;
  }
  // les colonnes montrées : celles qui ont quelque chose dans la vue (ou toutes, « Colonnes vides »)
  const possibles = () => COLONNES.filter(c => !c.si || c.si());
  const colonnes = xs => possibles().filter(c => T.f.vides || c.toujours || xs.some(x => c.texte(x) !== ''));

  // ———— la vue
  function vue() {
    T.f = session.tableur = Object.assign({ q: '', saison: '', spectacle: '', periode: 'avenir', tri: 'asc', vides: false }, session.tableur || {});
    const f = T.f, saisons = [...new Set(E.dates.map(d => d.saison).filter(Boolean))].sort().reverse();
    cadre('representations', `<div class="tete"><h1>Représentations</h1>${choixVue('tableur')}
      <span class="tab-actions"><button type="button" class="btn principal" id="tab-plus" aria-expanded="false" aria-controls="tab-ajout">＋ Séance</button>
      <button type="button" class="btn" id="tab-importer">Importer</button>
      <span class="tab-menu"><button type="button" class="btn" id="tab-exporter" aria-haspopup="true" aria-expanded="false" aria-controls="tab-export">Exporter</button>
        <span class="tab-export" id="tab-export" role="group" aria-label="Exporter" hidden><button type="button" class="btn" data-export="xlsx">Excel (.xlsx)</button><button type="button" class="btn" data-export="sheets">Google Sheets</button><button type="button" class="btn" data-export="csv">CSV</button>
        <span class="aide">Google Sheets : le tableau est copié, une feuille vierge s’ouvre (sheets.new) ; collez-le (Ctrl+V). Ou importez-y le fichier Excel.</span></span></span></span></div>
    <div class="filtres tab-filtres" role="search" aria-label="Filtrer le tableur">
      <input type="search" id="tab-q" placeholder="Chercher : un lieu, une commune, une personne, un mot des notes…" value="${esc(f.q)}" aria-label="Chercher dans le tableur">
      <div class="tab-choix"><select id="tab-saison" aria-label="Saison"><option value="">Toutes les saisons</option>${saisons.map(s => `<option value="${esc(s)}"${f.saison === s ? ' selected' : ''}>Saison ${esc(s)}</option>`).join('')}</select>
        <select id="tab-sp" aria-label="Spectacle"><option value="">Tous les spectacles</option>${E.spectacles.slice().sort((a, b) => (b.page - a.page) || a.ordre - b.ordre).map(s => `<option value="${s.id}"${String(f.spectacle) === String(s.id) ? ' selected' : ''}>${esc(s.titre)}</option>`).join('')}</select>
        <span class="seg" role="group" aria-label="Période">${[['avenir', 'À venir'], ['passees', 'Passées'], ['toutes', 'Toutes']].map(([k, l]) => `<button type="button" data-tab-periode="${k}" aria-pressed="${f.periode === k}">${l}</button>`).join('')}</span>
        <label class="case tab-vides"><input type="checkbox" id="tab-vides"${f.vides ? ' checked' : ''}> Colonnes vides</label></div>
    </div>
    <form class="bloc tab-ajout" id="tab-ajout" hidden></form>
    <p class="tab-ligne-etat"><span class="compte" id="tab-compte"></span><span class="tab-etat" id="tab-etat" aria-live="polite"></span>
      <button type="button" class="btn lien petit tab-suppr" id="tab-suppr" aria-keyshortcuts="Control+Delete" title="Dans le tableau : Ctrl+Suppr">Supprimer la séance…</button></p>
    <div class="tab-cadre" id="tab-cadre"><table class="tableur" id="tab" role="grid" aria-multiselectable="true" aria-label="Représentations : une ligne par séance" aria-describedby="tab-aide">
      <thead id="tab-tete"></thead><tbody id="tab-corps" data-liste></tbody></table></div>
    <p class="aide tab-aide" id="tab-aide">Flèches pour aller de case en case ; Entrée (ou taper) pour écrire, Échap pour renoncer ; Maj+flèches pour choisir plusieurs cases ; Ctrl+C, Ctrl+V comme dans un tableur ; Suppr pour vider une case, Ctrl+Suppr pour supprimer la séance ; Ctrl+Z pour annuler. Une case grisée répète la date : elle vaut pour toutes ses séances.</p>`);
    const corps = $('#tab-corps');
    corps.rafraichir = () => { if (T.edition || T.pop) { T.aRafraichir = true; return; } dessiner({ garder: true }); };
    T.actif = { l: 0, c: 0 }; T.ancre = null; T.textes = null;
    dessiner();
    brancher();
  }
  // la liste ou le tableur (en tête de Représentations)
  const choixVue = v => `<span class="seg tab-vue" role="group" aria-label="Vue"><a href="#/representations" aria-current="${v === 'liste' ? 'page' : 'false'}">Liste</a><a href="#/representations/tableur" aria-current="${v === 'tableur' ? 'page' : 'false'}">Tableur</a>${typeof TOURNEE !== 'undefined' ? `<a href="#/representations/carte" aria-current="${v === 'carte' ? 'page' : 'false'}">Carte</a>` : ''}</span>`;

  // ———— dessiner (et redessiner : la case active, le défilement et ce qui a changé ailleurs)
  const cleCase = (x, c) => `${x.cle}|${c.k}`;
  function dessiner({ garder = false } = {}) {
    const corps = $('#tab-corps'), tete = $('#tab-tete'), cadreT = $('#tab-cadre');
    if (!corps) return;
    const avant = garder ? { ligne: T.lignes[T.actif.l]?.cle, col: T.cols[T.actif.c]?.k, focus: corps.contains(document.activeElement), haut: cadreT.scrollTop, gauche: cadreT.scrollLeft } : null;
    const anciens = garder ? T.textes : null;
    T.lignes = lignes(); T.cols = colonnes(T.lignes);
    const plie = possibles().filter(c => !T.cols.includes(c));
    $('#tab').setAttribute('aria-rowcount', String(T.lignes.length + 1));
    $('#tab').setAttribute('aria-colcount', String(T.cols.length));
    tete.innerHTML = `<tr role="row" aria-rowindex="1">${T.cols.map((c, j) => `<th role="columnheader" scope="col" class="c-${c.k}${c.niveau !== 'seance' ? ' de-date' : ''}" aria-colindex="${j + 1}"${c.k === 'jour' ? ` aria-sort="${T.f.tri === 'desc' ? 'descending' : 'ascending'}"` : ''} title="${c.niveau === 'date' ? 'Vaut pour toutes les séances de la date' : c.niveau === 'lieu' ? 'Vient de la fiche du lieu' : 'Propre à chaque séance'}">${c.k === 'jour' ? `<button type="button" class="tab-tri" id="tab-tri">Jour <span aria-hidden="true">${T.f.tri === 'desc' ? '↓' : '↑'}</span><span class="sr">, trier ${T.f.tri === 'desc' ? 'du plus ancien' : 'du plus récent'} d’abord</span></button>` : esc(c.l)}</th>`).join('')}</tr>`;
    T.textes = new Map();
    corps.innerHTML = T.lignes.map((x, i) => `<tr role="row" aria-rowindex="${i + 2}" data-l="${i}" class="b${x.bande}${x.premier ? ' premier' : ''}${x.d.statut === 'annulee' || x.r?.annulee ? ' barree' : ''}">${T.cols.map((c, j) => {
      const t = c.texte(x); T.textes.set(cleCase(x, c), t);
      const lecture = c.type === 'lecture' || c.fige?.(x);
      return `<td role="gridcell" aria-colindex="${j + 1}" data-c="${j}" class="c-${c.k}${c.niveau !== 'seance' && !x.premier ? ' repete' : ''}" tabindex="-1"${lecture ? ' aria-readonly="true"' : ''}${t.length > 16 ? ` title="${esc(t)}"` : ''}>${c.html ? c.html(x) : esc(t)}</td>`;
    }).join('')}</tr>`).join('') || `<tr role="row"><td role="gridcell" colspan="${T.cols.length}" class="tab-vide">${E.dates.length ? `Aucune séance ne correspond.${T.f.q || T.f.saison || T.f.spectacle || T.f.periode !== 'avenir' ? '<br><button type="button" class="btn" data-effacer-filtres>Effacer les filtres</button>' : ''}` : 'Aucune date pour l’instant : « ＋ Séance » en ajoute une.'}</td></tr>`;
    const n = T.lignes.length, nd = new Set(T.lignes.map(x => x.d.id)).size;
    $('#tab-compte').textContent = `${pl(n, 'séance')} · ${pl(nd, 'date')}${plie.length && !T.f.vides ? ` · colonnes vides repliées : ${plie.map(c => c.l.toLowerCase()).join(', ')}` : ''}`;
    // la case active : la même qu'avant (par sa ligne et sa colonne), sinon la plus proche
    if (avant) {
      const l = T.lignes.findIndex(x => x.cle === avant.ligne), c = T.cols.findIndex(y => y.k === avant.col);
      T.actif = { l: l >= 0 ? l : Math.min(T.actif.l, Math.max(0, n - 1)), c: c >= 0 ? c : Math.min(T.actif.c, T.cols.length - 1) };
      cadreT.scrollTop = avant.haut; cadreT.scrollLeft = avant.gauche;
    } else T.actif = { l: Math.min(T.actif.l, Math.max(0, n - 1)), c: Math.min(T.actif.c, T.cols.length - 1) };
    if (T.ancre && (T.ancre.l >= n || T.ancre.c >= T.cols.length)) T.ancre = null;
    marquer(avant?.focus);
    // ce qui a changé ailleurs (le temps réel) clignote ; pas ce qu'on vient d'écrire ici
    if (anciens) {
      const maintenant = Date.now();
      T.lignes.forEach((x, i) => T.cols.forEach((c, j) => {
        const k = cleCase(x, c), avantT = anciens.get(k);
        if (avantT === undefined || avantT === T.textes.get(k)) return;
        cellule(i, j)?.classList.add(maintenant - (T.recents.get(x.d.id) || 0) < 4000 ? 'enregistree' : 'vient-d-ailleurs');
      }));
    }
    largeurs();
  }
  // la hauteur du cadre : l'écran moins l'en-tête de l'administration (l'en-tête du tableau colle en haut du cadre)
  function largeurs() {
    const c = $('#tab-cadre'); if (!c) return;
    const barre = $('.barre')?.offsetHeight || 0;
    c.style.maxHeight = `${Math.max(300, innerHeight - barre - 24)}px`;
  }
  const cellule = (l, c) => $(`#tab-corps tr[data-l="${l}"] td[data-c="${c}"]`);
  const dansPlage = (l, c) => { if (!T.ancre) return l === T.actif.l && c === T.actif.c; const [l0, l1] = [Math.min(T.ancre.l, T.actif.l), Math.max(T.ancre.l, T.actif.l)], [c0, c1] = [Math.min(T.ancre.c, T.actif.c), Math.max(T.ancre.c, T.actif.c)]; return l >= l0 && l <= l1 && c >= c0 && c <= c1; };
  const plage = () => { const a = T.ancre || T.actif; return { l0: Math.min(a.l, T.actif.l), l1: Math.max(a.l, T.actif.l), c0: Math.min(a.c, T.actif.c), c1: Math.max(a.c, T.actif.c) }; };
  // la case active (tabindex 0), la plage choisie (aria-selected), et la même case de la date sur ses autres séances
  function marquer(focus = false) {
    $$('#tab-corps td.actif, #tab-corps td.choisie, #tab-corps td.meme-date').forEach(td => { td.classList.remove('actif', 'choisie', 'meme-date'); td.tabIndex = -1; td.removeAttribute('aria-selected'); });
    // le bouton « Supprimer » dit sur quoi il agit : la séance de la case active, ou les lignes choisies
    const bs = $('#tab-suppr'), pg = plage(), xs = T.lignes.slice(pg.l0, pg.l1 + 1);
    if (bs) { bs.hidden = !xs.length; bs.textContent = xs.length > 1 ? `Supprimer ces ${xs.length} ${xs.every(y => y.r) ? 'séances' : 'lignes'}…` : xs.length ? `Supprimer ${xs[0].r ? 'la séance' : 'la date'} du ${jourCourt(xs[0].r?.jour || xs[0].d.debut)}…` : ''; }
    const x = T.lignes[T.actif.l], c = T.cols[T.actif.c];
    if (!x || !c) return;
    if (T.ancre) { const p = plage(); for (let l = p.l0; l <= p.l1; l++) for (let j = p.c0; j <= p.c1; j++) { const td = cellule(l, j); if (td) { td.classList.add('choisie'); td.setAttribute('aria-selected', 'true'); } } }
    if (c.niveau !== 'seance' && x.n > 1) T.lignes.forEach((y, l) => { if (y.d.id === x.d.id && l !== T.actif.l) cellule(l, T.actif.c)?.classList.add('meme-date'); });
    const td = cellule(T.actif.l, T.actif.c);
    if (!td) return;
    td.classList.add('actif'); td.tabIndex = 0;
    if (focus) td.focus({ preventScroll: true });
  }
  // amener la case en vue, sous l'en-tête et à droite des colonnes collées (jour, spectacle)
  function enVue(td) {
    const cadreT = $('#tab-cadre'); if (!td || !cadreT) return;
    const r = td.getBoundingClientRect(), b = cadreT.getBoundingClientRect(), th = $('#tab-tete')?.getBoundingClientRect();
    const colle = td.classList.contains('c-jour') || td.classList.contains('c-spectacle') ? b.left : Math.max(b.left, ...$$('#tab-tete .c-jour, #tab-tete .c-spectacle').map(x => x.getBoundingClientRect().right));
    const haut = th ? th.bottom : b.top;
    if (r.left < colle) cadreT.scrollLeft -= colle - r.left + 2; else if (r.right > b.right - 2) cadreT.scrollLeft += r.right - b.right + 4;
    if (r.top < haut) cadreT.scrollTop -= haut - r.top + 2; else if (r.bottom > b.bottom - 2) cadreT.scrollTop += r.bottom - b.bottom + 4;
    // la page aussi : le cadre entier en vue
    const p = cadreT.getBoundingClientRect(), barre = $('.barre')?.offsetHeight || 0;
    if (r.top < barre || r.bottom > innerHeight) { if (p.top < barre || p.top > innerHeight * 0.6) scrollBy({ top: p.top - barre - 8 }); }
  }
  function activer(l, c, { etendre = false, focus = true } = {}) {
    if (!T.lignes.length) return;
    l = Math.max(0, Math.min(T.lignes.length - 1, l)); c = Math.max(0, Math.min(T.cols.length - 1, c));
    if (etendre) { if (!T.ancre) T.ancre = { ...T.actif }; } else T.ancre = null;
    T.actif = { l, c };
    marquer(focus);
    enVue(cellule(l, c));
  }
  // une phrase sous les filtres : « Enregistrement… », « Enregistré : … » (avec « Annuler »), une erreur
  function etat(texte, genre = '', annulable = false) {
    const el = $('#tab-etat'); if (!el) return;
    el.className = `tab-etat ${genre}`;
    el.innerHTML = `${esc(texte)}${annulable && T.pile.length ? ' <button type="button" class="btn lien petit" id="tab-annuler">Annuler <kbd>Ctrl Z</kbd></button>' : ''}`;
  }

  // ———— les gestes
  function brancher() {
    const f = T.f, maj = () => { garderFiltres(); T.actif = { l: 0, c: 0 }; T.ancre = null; dessiner(); };
    $('#tab-q').addEventListener('input', e => { f.q = e.target.value; maj(); });
    $('#tab-saison').addEventListener('change', e => { f.saison = e.target.value; maj(); });
    $('#tab-sp').addEventListener('change', e => { f.spectacle = e.target.value; maj(); });
    $$('[data-tab-periode]').forEach(b => b.addEventListener('click', () => { f.periode = b.dataset.tabPeriode; $$('[data-tab-periode]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); maj(); }));
    $('#tab-vides').addEventListener('change', e => { f.vides = e.target.checked; garderFiltres(); dessiner({ garder: true }); });
    $('#tab-tete').addEventListener('click', e => { if (e.target.closest('#tab-tri')) { f.tri = f.tri === 'desc' ? 'asc' : 'desc'; garderFiltres(); dessiner({ garder: true }); $('#tab-tri')?.focus(); } });
    $('#tab-etat').addEventListener('click', e => { if (e.target.closest('#tab-annuler')) annuler(); });
    $('#tab-plus').addEventListener('click', () => formAjout());
    $('#tab-importer').addEventListener('click', () => importer());
    $('#tab-suppr').addEventListener('click', () => supprimerLignes());
    const exp = $('#tab-export'), bExp = $('#tab-exporter');
    const fermerExport = (rendre = false) => { exp.hidden = true; bExp.setAttribute('aria-expanded', 'false'); if (rendre) bExp.focus(); };
    bExp.addEventListener('click', () => { const ouvrir = exp.hidden; exp.hidden = !ouvrir; bExp.setAttribute('aria-expanded', String(ouvrir)); if (ouvrir) $('button', exp).focus(); });
    exp.addEventListener('click', e => { const b = e.target.closest('[data-export]'); if (b) { fermerExport(); exporter(b.dataset.export); } });
    exp.addEventListener('keydown', e => { if (e.key === 'Escape') fermerExport(true); });
    document.addEventListener('click', e => { if (!exp.hidden && !e.target.closest('.tab-menu')) fermerExport(); });
    const corps = $('#tab-corps'), table = $('#tab');
    corps.addEventListener('mousedown', e => {
      const td = e.target.closest('td[data-c]'); if (!td || td.contains(T.edition?.el)) return;
      const l = +td.parentNode.dataset.l, c = +td.dataset.c;
      if (T.edition) fermerEdition({ valider: true });
      const deja = td === document.activeElement && !T.ancre;   // un clic sur la case active (déjà choisie) : écrire
      e.preventDefault();
      activer(l, c, { etendre: e.shiftKey });
      if (deja && !e.shiftKey) editer();
    });
    corps.addEventListener('dblclick', e => { const td = e.target.closest('td[data-c]'); if (td && !T.edition) editer(); });
    table.addEventListener('keydown', clavier);
    table.addEventListener('copy', e => { if (T.edition || !corps.contains(document.activeElement)) return; e.preventDefault(); e.clipboardData.setData('text/plain', copie()); etat(`Copié : ${pl(nbCases(), 'case')}.`); });
    table.addEventListener('paste', e => { if (T.edition || !corps.contains(document.activeElement)) return; e.preventDefault(); coller(e.clipboardData.getData('text/plain')); });
    window.addEventListener('resize', largeurs);
  }
  const nbCases = () => { const p = plage(); return (p.l1 - p.l0 + 1) * (p.c1 - p.c0 + 1); };
  function clavier(e) {
    if (T.edition || T.pop || !e.target.closest('#tab-corps')) return;
    const mod = e.ctrlKey || e.metaKey, { l, c } = T.actif, k = e.key;
    const bouger = (dl, dc) => { e.preventDefault(); activer(l + dl, c + dc, { etendre: e.shiftKey }); };
    if (k === 'ArrowDown') return bouger(mod ? T.lignes.length : 1, 0);
    if (k === 'ArrowUp') return bouger(mod ? -T.lignes.length : -1, 0);
    if (k === 'ArrowRight') return bouger(0, mod ? T.cols.length : 1);
    if (k === 'ArrowLeft') return bouger(0, mod ? -T.cols.length : -1);
    if (k === 'PageDown') return bouger(10, 0);
    if (k === 'PageUp') return bouger(-10, 0);
    if (k === 'Home') { e.preventDefault(); return activer(mod ? 0 : l, 0, { etendre: e.shiftKey }); }
    if (k === 'End') { e.preventDefault(); return activer(mod ? T.lignes.length - 1 : l, T.cols.length - 1, { etendre: e.shiftKey }); }
    if (k === 'Tab') {
      const n = c + (e.shiftKey ? -1 : 1);
      if (n >= 0 && n < T.cols.length) { e.preventDefault(); return activer(l, n); }
      const m = l + (e.shiftKey ? -1 : 1);
      if (m >= 0 && m < T.lignes.length) { e.preventDefault(); return activer(m, e.shiftKey ? T.cols.length - 1 : 0); }
      return;   // au bord du tableau, Tab en sort
    }
    if (k === 'Escape') { if (T.ancre) { e.preventDefault(); T.ancre = null; marquer(true); } return; }
    if (mod && !e.altKey && k.toLowerCase() === 'z') { e.preventDefault(); return annuler(); }
    if (mod && !e.altKey && k.toLowerCase() === 'a') { e.preventDefault(); T.ancre = { l: 0, c: 0 }; T.actif = { l: T.lignes.length - 1, c: T.cols.length - 1 }; return marquer(true); }
    if (mod && (k === 'Delete' || k === 'Backspace')) { e.preventDefault(); return supprimerLignes(); }
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); return vider(); }
    if (k === 'Enter' || k === 'F2') { e.preventDefault(); return editer(); }
    if (k === ' ' && T.cols[c]?.type === 'case') { e.preventDefault(); return editer(); }
    if (k.length === 1 && !mod && !e.altKey) {
      const col = T.cols[c];
      if (['texte', 'long', 'lien', 'heure', 'jour'].includes(col?.type) && !(natif() && ['heure', 'jour'].includes(col.type))) { e.preventDefault(); return editer(k); }
      if (col?.type === 'choix' || col?.type === 'lieu' || col?.type === 'equipe') { e.preventDefault(); return editer(col.type === 'choix' ? null : k); }
    }
  }

  // ==================== l'édition : écrire dans une case, enregistrer, annuler, vider
  // ———— écrire dans une case
  function editer(initial = null) {
    const x = T.lignes[T.actif.l], c = T.cols[T.actif.c];
    if (!x || !c) return;
    if (c.type === 'lecture') { const j = T.cols.findIndex(y => y.k === 'lieu'); etat('La commune vient de la fiche du lieu : changez le lieu.'); if (j >= 0) { activer(T.actif.l, j); editer(); } return; }
    if (c.fige?.(x)) return etat('Une répétition, une résidence : jamais sur le site.');
    if (c.type === 'case') return ecrire([{ x, col: c, v: !c.val(x) }]);
    if (c.type === 'lieu') return editerLieu(x, c, initial);
    if (c.type === 'equipe') return editerEquipe(x, c, initial);
    const td = cellule(T.actif.l, T.actif.c);
    const date = c.type === 'jour' && natif(), heure = c.type === 'heure' && natif();
    const el = document.createElement(c.type === 'choix' ? 'select' : c.type === 'long' ? 'textarea' : 'input');
    el.className = 'tab-ed';
    el.setAttribute('aria-label', `${c.l}${c.niveau === 'date' && x.n > 1 ? ` (pour les ${x.n} séances de la date)` : ''}`);
    if (c.type === 'choix') el.innerHTML = c.choix().map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(c.val(x)) ? ' selected' : ''}>${esc(l)}</option>`).join('');
    else {
      if (el.tagName === 'INPUT') { el.type = date ? 'date' : heure ? 'time' : c.type === 'lien' ? 'url' : 'text'; if (heure) el.step = 300; el.autocomplete = 'off'; }
      el.value = initial ?? (date ? c.val(x) : c.type === 'heure' ? (heure ? c.val(x) : heureT(c.val(x))) : c.type === 'jour' ? jjmmaaaa(c.val(x)) : c.val(x));
      if (c.type === 'jour' && !date) el.placeholder = 'jj/mm/aaaa';
      if (c.type === 'heure' && !heure) el.placeholder = '20h30';
    }
    td.classList.add('en-edition');
    td.append(el);
    T.edition = { x, col: c, el, td, l: T.actif.l, c: T.actif.c };
    el.focus();
    if (initial == null && el.select && c.type !== 'choix') el.select();
    if (c.niveau === 'date' && x.n > 1) etat(`${c.l} : vaut pour les ${x.n} séances de cette date.`);
    el.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fermerEdition({ valider: false }); return; }
      if (e.key === 'Enter' && !(c.type === 'long' && e.shiftKey)) { e.preventDefault(); fermerEdition({ valider: true, aller: e.shiftKey ? 'haut' : 'bas' }); return; }
      if (e.key === 'Tab') { e.preventDefault(); fermerEdition({ valider: true, aller: e.shiftKey ? 'gauche' : 'droite' }); }
    });
    el.addEventListener('blur', () => { if (T.edition?.el === el) fermerEdition({ valider: true, focus: false }); });
  }
  function fermerEdition({ valider = true, aller = null, focus = true } = {}) {
    const ed = T.edition; if (!ed) return;
    const { x, col, el, td } = ed;
    let v;
    if (valider) {
      const brut = el.value;
      v = col.type === 'choix' ? col.choix().find(([y]) => String(y) === brut)?.[0] : (col.type === 'jour' && el.type === 'date') ? brut || undefined : (col.type === 'heure' && el.type === 'time') ? brut : col.lire(brut, x);
      if (v === undefined || (v === '' && !col.vider && col.type !== 'heure')) {
        etat(`${col.l} : « ${brut} » n’est pas reconnu${focus ? '' : ', la case garde sa valeur'}.${col.type === 'jour' ? ' Écrivez par exemple 5/11/2026.' : col.type === 'heure' ? ' Écrivez par exemple 20h30.' : ''}`, 'erreur');
        if (focus) { el.focus(); return; }
        valider = false;
      }
    }
    T.edition = null;
    el.remove(); td.classList.remove('en-edition');
    if (valider && JSON.stringify(v) !== JSON.stringify(col.val(x))) { td.innerHTML = esc(apercu(col, v)); td.classList.add('en-cours'); ecrire([{ x, col, v }]); }
    else if (T.aRafraichir) { T.aRafraichir = false; dessiner({ garder: true }); }
    if (aller === 'bas') activer(T.actif.l + 1, T.actif.c, { focus });
    else if (aller === 'haut') activer(T.actif.l - 1, T.actif.c, { focus });
    else if (aller === 'droite') activer(T.actif.l, T.actif.c + 1, { focus });
    else if (aller === 'gauche') activer(T.actif.l, T.actif.c - 1, { focus });
    else if (focus) marquer(true);
  }
  // ce qu'une case montre pendant l'enregistrement
  const apercu = (col, v) => col.type === 'heure' ? heureT(v) : col.type === 'jour' ? jourCourt(v) : col.type === 'choix' ? (col.choix().find(([y]) => String(y) === String(v)) || [null, ''])[1] : col.type === 'lieu' ? lieuTexte(lieu(v)) : col.type === 'equipe' ? prenoms(v).join(', ') : String(v ?? '');

  // ———— enregistrer : par date, son formulaire (dateVersForm) avec ce qui change, puis ecrireDate — le chemin de la fiche
  // changements : [{ x (la ligne), col, v }]. Les écritures passent l'une après l'autre (T.file).
  function ecrire(changements, { annulable = true, dire = null } = {}) {
    const parDate = new Map();
    changements.forEach(ch => { const id = ch.x.d.id; if (!parDate.has(id)) parDate.set(id, []); parDate.get(id).push(ch); });
    T.attente++;
    etat('Enregistrement…', 'encours');
    const tache = async () => {
      const defaire = [], faits = [];
      for (const [id, chs] of parDate) {
        const d = E.dates.find(y => y.id === id);
        if (!d) throw new Error('Cette date n’existe plus (elle a été supprimée ailleurs).');
        const F = dateVersForm(d), instantane = chs.some(ch => !ch.x.r && ch.col.niveau === 'seance') ? clone(F) : null;
        const avant = chs.map(ch => ({ x: ch.x, col: ch.col, v: ch.col.val({ ...ch.x, d, r: ch.x.r && E.reps.find(r => r.id === ch.x.r.id) }) }));
        chs.forEach(ch => ch.col.ecrire(F, ch.x, ch.v));
        const manque = manqueDate(F); if (manque) throw new Error(manque);
        T.recents.set(id, Date.now());
        const { equipeOk } = await ecrireDate(F, d, { libre: !!(d.intitule || '').trim() });
        T.recents.set(id, Date.now());
        if (!equipeOk) throw new Error('La date est enregistrée, mais pas son équipe.');
        defaire.push(instantane ? { instantane, id } : { avant });
        faits.push(...chs);
      }
      return { defaire, faits };
    };
    const p = T.file.then(tache);
    T.file = p.catch(() => {});
    return p.then(({ defaire, faits }) => {
      T.attente--;
      const un = faits[0], phrase = dire || (faits.length === 1 ? `${un.col.l} ${un.col.niveau === 'date' && un.x.n > 1 ? `des ${un.x.n} séances ` : ''}du ${jourCourt(un.x.r?.jour || un.x.d.debut)} : ${apercu(un.col, un.v) || 'vide'}` : `${pl(faits.length, 'case')} sur ${pl(parDate.size, 'date')}`);
      if (annulable) T.pile.push({ libelle: phrase, defaire: async () => {
        for (const u of defaire) {
          if (u.instantane) { const d = E.dates.find(y => y.id === u.id); if (!d) continue; const F = u.instantane; F.representations = F.representations.filter(r => !r.id || E.reps.some(y => y.id === r.id)); await ecrireDate(F, d, { libre: !!(d.intitule || '').trim() }); T.recents.set(u.id, Date.now()); }
          else if (!(await ecrire(u.avant, { annulable: false, dire: 'retour en arrière' }))) throw new Error('la base a refusé');
        }
      } });
      if (!T.attente) etat(`Enregistré : ${phrase}.`, 'ok', annulable);
      dessiner({ garder: true });
      return true;
    }, err => {
      T.attente--;
      etat(`Pas enregistré : ${err?.message || err}`, 'erreur');
      dessiner({ garder: true });
      return false;
    });
  }
  async function annuler() {
    const u = T.pile.pop();
    if (!u) return etat('Rien à annuler.');
    etat('Retour en arrière…', 'encours');
    try { await u.defaire(); etat(`Annulé : ${u.libelle}.`, 'ok'); } catch (e) { etat(`Retour impossible : ${e?.message || e}`, 'erreur'); }
    dessiner({ garder: true });
    marquer(true);
  }
  // Suppr : vider les cases choisies (celles qui peuvent l'être)
  function vider() {
    const p = plage(), chs = [];
    for (let l = p.l0; l <= p.l1; l++) for (let j = p.c0; j <= p.c1; j++) {
      const x = T.lignes[l], c = T.cols[j];
      if (!x || !c || !(c.vider || c.type === 'heure' || c.type === 'case') || c.fige?.(x)) continue;
      const v = c.type === 'case' ? false : c.type === 'equipe' ? [] : c.type === 'lieu' ? null : '';
      if (JSON.stringify(c.val(x)) !== JSON.stringify(v)) chs.push({ x, col: c, v });
    }
    if (!chs.length) return etat(nbCases() > 1 ? 'Rien à vider dans ces cases.' : `${T.cols[T.actif.c]?.l} : cette case ne se vide pas.`);
    // une date ne s'écrit qu'une fois par case de date (la même valeur pour ses séances)
    const vus = new Set();
    ecrire(chs.filter(ch => { const k = ch.col.niveau === 'seance' ? `${ch.x.cle}|${ch.col.k}` : `${ch.x.d.id}|${ch.col.k}`; if (vus.has(k)) return false; vus.add(k); return true; }));
  }

  // ==================== les fenêtres posées sur une case (le lieu, la distribution)
  // ———— une fenêtre posée sur la case (le lieu, la distribution) : Échap la ferme ; un clic à côté la ferme aussi
  function poser(td, html, { large = false, label = '' } = {}) {
    fermerPop(false);
    const pop = document.createElement('div');
    pop.className = `tab-pop${large ? ' large' : ''}`;
    pop.setAttribute('role', 'dialog');
    if (label) pop.setAttribute('aria-label', label);
    pop.innerHTML = html;
    document.body.append(pop);
    const placer = () => {
      if (!td.isConnected) return;
      const r = td.getBoundingClientRect(), w = Math.min(pop.offsetWidth, innerWidth - 16), h = pop.offsetHeight;
      let top = r.bottom + 4;
      if (top + h > innerHeight - 8 && r.top - h - 4 > 8) top = r.top - h - 4;
      pop.style.left = `${Math.min(Math.max(8, r.left), innerWidth - w - 8)}px`;
      pop.style.top = `${Math.max(8, Math.min(top, innerHeight - h - 8))}px`;
    };
    placer();
    const dehors = e => { if (!pop.contains(e.target) && !e.target.closest('.suggestions')) { const v = T.pop?.valider; if (v) v(); else fermerPop(false); } };
    const echap = e => { if (e.key === 'Escape' && T.pop?.el === pop) { e.preventDefault(); e.stopPropagation(); fermerPop(); } };
    setTimeout(() => document.addEventListener('mousedown', dehors, true), 0);
    pop.addEventListener('keydown', echap);
    window.addEventListener('resize', placer); $('#tab-cadre')?.addEventListener('scroll', placer);
    T.pop = { el: pop, td, valider: null, nettoyer: () => { document.removeEventListener('mousedown', dehors, true); window.removeEventListener('resize', placer); $('#tab-cadre')?.removeEventListener('scroll', placer); }, placer };
    return pop;
  }
  function fermerPop(rendre = true) {
    const p = T.pop; if (!p) return;
    T.pop = null; p.nettoyer(); p.el.remove();
    if (T.aRafraichir) { T.aRafraichir = false; dessiner({ garder: true }); }
    if (rendre) marquer(true);
  }
  // le lieu : la recherche des lieux de l'administration (et « Nouveau lieu »)
  function editerLieu(x, c, initial) {
    const td = cellule(T.actif.l, T.actif.c);
    const pop = poser(td, `<p class="tab-pop-titre">Lieu${x.n > 1 ? ` <small>pour les ${x.n} séances de la date</small>` : ''}</p><div id="tab-lieu"></div>
      <div class="tab-pop-pied">${x.d.lieu_id != null ? '<button type="button" class="btn petit" data-sans-lieu>Sans lieu</button>' : ''}<button type="button" class="btn petit lien" data-fermer>Fermer</button></div>`, { label: 'Lieu de la date' });
    comboLieu(pop, 'tab-lieu', x.d.lieu_id, id => { fermerPop(); if (id !== x.d.lieu_id) ecrire([{ x, col: c, v: id }]); });
    const inp = $('#tab-lieu input', pop);
    T.pop.placer();
    inp.focus();
    if (initial) { inp.value = initial; inp.dispatchEvent(new Event('input')); } else inp.select();
    pop.addEventListener('click', e => {
      if (e.target.closest('[data-fermer]')) fermerPop();
      else if (e.target.closest('[data-sans-lieu]')) { fermerPop(); ecrire([{ x, col: c, v: null }]); }
    });
  }
  // la distribution : des pastilles (✕ pour retirer), un champ pour ajouter (la distribution du spectacle en tête)
  function editerEquipe(x, c, initial) {
    const td = cellule(T.actif.l, T.actif.c), d = x.d, s = spectacle(d.spectacle_id);
    const avant = equipeIds(d);
    let ids = [...avant], actifS = 0, deroulee = false;   // la liste s'ouvre en tapant (ou par ↓), se referme à l'ajout
    const pop = poser(td, `<p class="tab-pop-titre" id="tab-eq-titre">Distribution · ${esc(jourCourt(x.r?.jour || d.debut))}${x.n > 1 ? ` <small>pour les ${x.n} séances de la date</small>` : ''}</p>
      <ul class="tab-pastilles" id="tab-eq-pastilles" aria-label="Qui part"></ul>
      <div class="tab-eq-ajout"><input type="text" id="tab-eq-q" role="combobox" aria-expanded="false" aria-controls="tab-eq-liste" aria-autocomplete="list" aria-label="Ajouter quelqu’un" placeholder="Ajouter quelqu’un…" autocomplete="off" spellcheck="false">
        <ul class="tab-eq-liste" id="tab-eq-liste" role="listbox" aria-label="Personnes" hidden></ul></div>
      <p class="aide">${s ? `La distribution « en tournée » de ${esc(s.titre)} part par défaut ; ` : ''}ce qui change ici ne vaut que pour cette date. Entrée ajoute, Retour arrière retire la dernière, Échap renonce.</p>
      <div class="tab-pop-pied"><button type="button" class="btn principal petit" data-eq-ok>Enregistrer</button><button type="button" class="btn petit" data-eq-etendre>Étendre à…</button><button type="button" class="btn petit lien" data-fermer>Annuler</button></div>`, { large: true });
    pop.setAttribute('aria-labelledby', 'tab-eq-titre');
    const q = $('#tab-eq-q', pop), liste = $('#tab-eq-liste', pop), pastilles = $('#tab-eq-pastilles', pop);
    const dist = d.spectacle_id ? distributionDe(d.spectacle_id) : [];
    const fonctions = id => [...new Set(dist.filter(y => y.personne_id === id).map(fonctionDistribution))].join(', ');
    const candidats = () => {
      const n = norm(q.value).trim(), deDist = [...new Set(dist.map(y => y.personne_id))];
      const autres = E.personnes.filter(p => !deDist.includes(p.id)).sort((a, b) => norm(nomDe(a)).localeCompare(norm(nomDe(b)))).map(p => p.id);
      return [...deDist, ...autres].filter(id => !ids.includes(id) && personne(id) && (!n || norm(`${nomDe(personne(id))} ${fonctions(id)}`).includes(n))).slice(0, 12);
    };
    const dessinerP = () => {
      pastilles.innerHTML = ids.map(id => `<li class="tab-pastille">${esc(nomDe(personne(id)))}<button type="button" data-retirer="${id}" aria-label="Retirer ${esc(nomDe(personne(id)))}">✕</button></li>`).join('') || '<li class="tab-gris">Personne pour l’instant.</li>';
      const xs = candidats(), deDist = new Set(dist.map(y => y.personne_id));
      actifS = Math.min(actifS, Math.max(0, xs.length - 1));
      liste.innerHTML = xs.map((id, i) => `<li role="option" id="tab-eq-o${i}" data-id="${id}" aria-selected="${i === actifS}">${esc(nomDe(personne(id)))}<small>${deDist.has(id) ? esc(fonctions(id) || 'distribution') : 'hors distribution'}</small></li>`).join('');
      const ouvert = document.activeElement === q && xs.length > 0 && (deroulee || q.value.trim() !== '');
      liste.hidden = !ouvert; q.setAttribute('aria-expanded', String(ouvert));
      if (ouvert) q.setAttribute('aria-activedescendant', `tab-eq-o${actifS}`); else q.removeAttribute('aria-activedescendant');
      T.pop?.placer();
    };
    const ajouter = id => { if (id && !ids.includes(id)) ids.push(id); q.value = ''; actifS = 0; deroulee = false; dessinerP(); q.focus(); };
    const valider = () => { fermerPop(); if (JSON.stringify([...ids].sort()) !== JSON.stringify([...avant].sort())) return ecrire([{ x, col: c, v: ids }]); return Promise.resolve(true); };
    T.pop.valider = valider;
    pop.addEventListener('click', e => {
      const r = e.target.closest('[data-retirer]'); if (r) { ids = ids.filter(id => id !== +r.dataset.retirer); dessinerP(); q.focus(); return; }
      const o = e.target.closest('[role=option]'); if (o) { ajouter(+o.dataset.id); return; }
      if (e.target.closest('[data-eq-ok]')) return valider();
      if (e.target.closest('[data-fermer]')) return fermerPop();
      if (e.target.closest('[data-eq-etendre]')) { const garder = [...ids]; valider().then(ok => { if (ok) etendre(x, garder); }); }
    });
    pop.addEventListener('mousedown', e => { if (e.target.closest('[role=option]')) e.preventDefault(); });
    q.addEventListener('input', () => { actifS = 0; deroulee = q.value.trim() !== ''; dessinerP(); });
    q.addEventListener('focus', dessinerP);
    q.addEventListener('blur', () => setTimeout(() => { if (T.pop?.el === pop && document.activeElement !== q) { liste.hidden = true; q.setAttribute('aria-expanded', 'false'); } }, 120));
    q.addEventListener('keydown', e => {
      const xs = candidats();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (xs.length) { if (!deroulee && !q.value.trim()) { deroulee = true; actifS = 0; } else actifS = (actifS + (e.key === 'ArrowDown' ? 1 : -1) + xs.length) % xs.length; dessinerP(); $(`#tab-eq-o${actifS}`, pop)?.scrollIntoView({ block: 'nearest' }); } }
      else if (e.key === 'Enter') { e.preventDefault(); if ((q.value.trim() || deroulee) && xs.length) ajouter(xs[actifS]); else if (!q.value.trim()) valider(); }
      else if (e.key === 'Backspace' && !q.value && ids.length) { ids.pop(); dessinerP(); }
    });
    pastilles.addEventListener('keydown', e => { const b = e.target.closest('[data-retirer]'); if (b && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); ids = ids.filter(id => id !== +b.dataset.retirer); dessinerP(); q.focus(); } });
    dessinerP();
    q.focus();
    if (initial) { q.value = initial; dessinerP(); }
  }

  // ==================== la distribution sur d'autres dates (« Étendre à… »)
  // ———— « Étendre à… » : la même distribution sur d'autres dates du même spectacle
  function etendre(x, ids) {
    const d0 = E.dates.find(y => y.id === x.d.id) || x.d, sp = d0.spectacle_id, s = spectacle(sp), an = d0.debut.slice(0, 4);
    const p = plage(), choisies = T.ancre ? [...new Set(T.lignes.slice(p.l0, p.l1 + 1).map(y => y.d.id))] : [];
    const portees = [['saison', `les dates de ${s ? `« ${s.titre} »` : 'ce spectacle'} de la saison ${d0.saison || ''}`, dd => dd.saison === d0.saison],
      ['annee', `les dates de ${s ? `« ${s.titre} »` : 'ce spectacle'} de l’année ${an}`, dd => dd.debut.slice(0, 4) === an || (dd.fin || dd.debut).slice(0, 4) === an],
      ...(choisies.length ? [['lignes', `les lignes choisies (${pl(choisies.length, 'date')})`, dd => choisies.includes(dd.id)]] : [])];
    const noms = xs => listeEt(xs.map(id => nomDe(personne(id))).filter(Boolean));
    const dlg = document.createElement('dialog');
    dlg.className = 'tab-dialogue';
    dlg.setAttribute('aria-labelledby', 'tab-et-titre');
    dlg.innerHTML = `<form method="dialog" class="tab-dialogue-boite"><h2 id="tab-et-titre">Étendre la distribution</h2>
      <p>${ids.length ? `<b>${esc(noms(ids))}</b>` : '<b>Personne</b>'}${s ? ` · ${esc(s.titre)}` : ''}</p>
      <fieldset><legend>Sur</legend>${portees.map(([k, l], i) => `<label class="case"><input type="radio" name="portee" value="${k}"${i === 0 ? ' checked' : ''}> ${esc(l)}</label>`).join('')}</fieldset>
      <label class="case"><input type="checkbox" id="tab-et-passees"> y compris les dates passées</label>
      <div class="tab-et-apercu" id="tab-et-apercu" aria-live="polite"></div>
      <div class="fm-boutons"><button type="button" class="btn principal" id="tab-et-ok">Appliquer</button><button type="button" class="btn" id="tab-et-non">Annuler</button></div></form>`;
    document.body.append(dlg);
    let cibles = [];
    const apercu = () => {
      const k = $('input[name=portee]:checked', dlg).value, passees = $('#tab-et-passees', dlg).checked, filtre = portees.find(y => y[0] === k)[2];
      const tous = E.dates.filter(dd => dd.spectacle_id === sp && filtre(dd) && (passees || (dd.fin || dd.debut) >= AUJ));
      const autresSp = k === 'lignes' ? choisies.filter(id => E.dates.find(dd => dd.id === id)?.spectacle_id !== sp).length : 0;
      const voulu = JSON.stringify([...ids].sort((a, b) => a - b));
      cibles = tous.filter(dd => JSON.stringify(equipeIds(dd).sort((a, b) => a - b)) !== voulu);
      const base = tourneeIds(sp);
      const poses = cibles.map(dd => { const e = ecartsDate(dd.id); return { dd, plus: e.filter(y => y.present && !base.includes(y.personne_id)).map(y => y.personne_id), moins: e.filter(y => !y.present).map(y => y.personne_id) }; }).filter(y => y.plus.length || y.moins.length);
      $('#tab-et-apercu', dlg).innerHTML = `<p><b>${cibles.length ? `${pl(cibles.length, 'date')} ${cibles.length > 1 ? 'changeront' : 'changera'}` : 'Aucune date ne changera'}</b>${tous.length - cibles.length ? ` ; ${pl(tous.length - cibles.length, 'date')} ${tous.length - cibles.length > 1 ? 'sont' : 'est'} déjà à jour` : ''}.${autresSp ? ` ${pl(autresSp, 'ligne')} d’un autre spectacle ${autresSp > 1 ? 'restent' : 'reste'} de côté.` : ''}</p>
        ${poses.length ? `<p class="tab-et-alerte">Des remplaçants sont posés à la main ; ils seront remplacés :</p><ul class="tab-et-liste">${poses.map(y => `<li>${esc(jourCourt(y.dd.debut))} : ${[y.plus.length ? `${esc(noms(y.plus))} ${y.plus.length > 1 ? 'ajoutés' : 'ajouté·e'}` : '', y.moins.length ? `${esc(noms(y.moins))} ${y.moins.length > 1 ? 'ne partent pas' : 'ne part pas'}` : ''].filter(Boolean).join(' ; ')}</li>`).join('')}</ul>` : ''}`;
      $('#tab-et-ok', dlg).textContent = cibles.length ? `Appliquer à ${pl(cibles.length, 'date')}` : 'Appliquer';
      $('#tab-et-ok', dlg).disabled = !cibles.length;
    };
    dlg.addEventListener('change', apercu);
    dlg.addEventListener('close', () => { dlg.remove(); marquer(true); });
    $('#tab-et-non', dlg).addEventListener('click', () => dlg.close());
    $('#tab-et-ok', dlg).addEventListener('click', async () => {
      const b = $('#tab-et-ok', dlg), xs = [...cibles], avants = xs.map(dd => ({ id: dd.id, sp: dd.spectacle_id, equipe: ecartsDate(dd.id) }));
      b.disabled = true;
      let n = 0, rates = 0;
      for (const dd of xs) {
        b.textContent = `${n + 1} / ${xs.length}…`;
        T.recents.set(dd.id, Date.now());
        const ok = await enregistrerEquipeDate(dd.id, { spectacle_id: dd.spectacle_id, equipe: ecartsPour(dd, ids) });
        if (ok) n++; else rates++;
      }
      dlg.close();
      T.pile.push({ libelle: `distribution étendue à ${pl(n, 'date')}`, defaire: async () => { for (const a of avants) { T.recents.set(a.id, Date.now()); await enregistrerEquipeDate(a.id, { spectacle_id: a.sp, equipe: a.equipe }); } } });
      etat(`Distribution posée sur ${pl(n, 'date')}${rates ? ` ; ${rates} n’ont pas pu l’être` : ''}.`, rates ? 'erreur' : 'ok', true);
      annoncer(`Distribution posée sur ${pl(n, 'date')}.`, { libelle: 'Annuler', delai: 9000, action: () => annuler() });
      dessiner({ garder: true });
    });
    dlg.showModal();
    apercu();
  }

  // ==================== les séances : ajouter, supprimer
  // ———— ajouter une séance : à la date du même spectacle au même lieu qui touche ce jour (le même, la veille ou le
  // lendemain), sinon à une nouvelle date. → { id (la date), nouvelle, texte } ; une erreur de la base est levée
  const ecartJours = (d, j) => (j < d.debut ? (Date.parse(d.debut) - Date.parse(j)) : j > (d.fin || d.debut) ? (Date.parse(j) - Date.parse(d.fin || d.debut)) : 0) / 864e5;
  const dateVoisine = (sp, lieuId, jour) => E.dates.filter(d => d.spectacle_id === sp && d.statut !== 'annulee' && (d.lieu_id ?? null) === (lieuId ?? null) && ecartJours(d, jour) <= 1).sort((a, b) => ecartJours(a, jour) - ecartJours(b, jour))[0] || null;
  const ouDit = lieuId => { const l = lieu(lieuId); return l ? `${l.nom ? `${l.nom}, ` : ''}${l.commune}` : 'lieu à préciser'; };
  async function ajouterSeance({ jour, heure = '', fin = '', spectacle_id, lieu_id = null, seance = {}, date = {}, suivi = {}, equipe = null }) {
    const d = dateVoisine(spectacle_id, lieu_id, jour);
    const rep = { jour, heure, fin, public: 'tout_public', annulee: false, lien: '', note: '', ...seance };
    if (d) {
      const F = dateVersForm(d);
      if (F.representations.some(r => r.jour === jour && (r.heure || '') === (heure || ''))) return { id: d.id, nouvelle: false, rien: true, texte: `déjà là : ${jourCourt(jour)}${heure ? ` à ${heureT(heure)}` : ''} (${ouDit(lieu_id)})` };
      const ids = new Set(F.representations.map(r => r.id));
      F.representations.push(rep);
      T.recents.set(d.id, Date.now());
      await ecrireDate(F, d, { libre: !!(d.intitule || '').trim() });
      const nouvelle = E.reps.find(r => r.date_id === d.id && !ids.has(r.id));
      // (ce que la ligne disait de la date elle-même, son statut, son suivi, son équipe, ne remplace pas celle qui existe : on le dit)
      const ignore = Object.keys(date).length || Object.values(suivi).some(v => v != null && v !== '') || (Array.isArray(equipe) && equipe.length);
      return { id: d.id, nouvelle: false, rep: nouvelle?.id, texte: `séance ajoutée à la date du ${jourCourt(d.debut)}${d.fin && d.fin !== d.debut ? ` au ${jourCourt(d.fin)}` : ''} (${ouDit(lieu_id)})${ignore ? ' ; le statut, le suivi et l’équipe de la ligne ne sont pas repris : la date existait, ils se règlent dans sa fiche' : ''}` };
    }
    const F = Object.assign(nouvelleDate(), { spectacle_id, lieu_id, debut: jour, fin: jour, representations: [rep] }, date);
    F.suivi = { ...F.suivi, ...suivi };
    if (equipe) F.equipe = ecartsPour({ id: -1, spectacle_id }, equipe, spectacle_id);
    const { id } = await ecrireDate(F, null);
    T.recents.set(id, Date.now());
    return { id, nouvelle: true, texte: `nouvelle date : ${jourCourt(jour)}, ${spectacle(spectacle_id)?.titre || ''} (${ouDit(lieu_id)})` };
  }
  // ce qu'on vient d'ajouter doit se voir : les filtres qui le cachent (eux seuls) se relâchent, et leurs boutons le montrent
  function montrerAjouts(ids) {
    const neutres = { periode: 'toutes', spectacle: '', saison: '', q: '' }, f0 = { ...T.f };
    const vus = f => { Object.assign(T.f, f); const xs = lignes(); return ids.every(id => xs.some(x => x.d.id === id)); };
    const cachent = Object.keys(neutres).filter(k => !vus({ ...neutres, [k]: f0[k] }));
    Object.assign(T.f, f0, ...cachent.map(k => ({ [k]: neutres[k] })));
    garderFiltres();
    $('#tab-q').value = T.f.q; $('#tab-saison').value = T.f.saison; $('#tab-sp').value = T.f.spectacle;
    $$('[data-tab-periode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tabPeriode === T.f.periode)));
  }
  // défaire un ajout : la date créée s'efface, ou la séance ajoutée part
  async function defaireAjout(a) {
    const d = E.dates.find(y => y.id === a.id); if (!d) return;
    T.recents.set(d.id, Date.now());
    if (a.nouvelle) { await effacerDate(d); return; }
    if (!a.rep) return;
    const F = dateVersForm(d);
    F.representations = F.representations.filter(r => r.id !== a.rep);
    if (F.representations.length) await ecrireDate(F, d, { libre: !!(d.intitule || '').trim() });
  }
  function formAjout() {
    const form = $('#tab-ajout'), b = $('#tab-plus');
    if (!form.hidden) { form.hidden = true; b.setAttribute('aria-expanded', 'false'); b.focus(); return; }
    form.hidden = false; b.setAttribute('aria-expanded', 'true');
    const sp0 = String(T.f.spectacle || (E.spectacles.slice().sort((x, y) => (y.page - x.page) || x.ordre - y.ordre)[0] || {}).id || '');
    form.innerHTML = `<h3>Ajouter une séance</h3><div class="tab-ajout-champs">
      <div class="champ"><label for="ta-jour">Jour</label><input id="ta-jour" ${natif() ? 'type="date"' : 'type="text" placeholder="jj/mm/aaaa"'} autocomplete="off"></div>
      <div class="champ"><label for="ta-heure">Heure</label><input id="ta-heure" ${natif() ? 'type="time" step="300"' : 'type="text" placeholder="20h30"'} autocomplete="off"></div>
      <div class="champ"><label for="ta-sp">Spectacle</label><select id="ta-sp">${choixSpectacles().map(([v, l]) => `<option value="${v}"${v === sp0 ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
      <div class="champ ta-lieu"><span class="lib">Lieu</span><div id="ta-lieu"></div></div></div>
      <p class="aide">Une date du même spectacle au même lieu qui touche ce jour (le même, la veille ou le lendemain) reçoit la séance ; sinon une nouvelle date se crée.</p>
      <div class="fm-boutons"><button type="submit" class="btn principal">Ajouter</button><button type="button" class="btn" data-fermer>Fermer</button></div>`;
    let lieuId = null;
    comboLieu(form, 'ta-lieu', null, id => { lieuId = id; });
    $('#ta-lieu input', form).addEventListener('input', e => { if (!e.target.value.trim()) lieuId = null; });
    $('[data-fermer]', form).addEventListener('click', () => formAjout());
    form.onkeydown = e => { if (e.key === 'Escape' && !e.target.closest('.combo')) { e.preventDefault(); formAjout(); } };
    form.onsubmit = async e => {
      e.preventDefault();
      const jour = natif() ? $('#ta-jour', form).value : lireJour($('#ta-jour', form).value, AUJ), heure = natif() ? $('#ta-heure', form).value : lireHeure($('#ta-heure', form).value);
      if (!jour) { etat('Le jour n’est pas reconnu : écrivez par exemple 5/11/2026.', 'erreur'); return $('#ta-jour', form).focus(); }
      if (heure === undefined) { etat('L’heure n’est pas reconnue : écrivez par exemple 20h30.', 'erreur'); return $('#ta-heure', form).focus(); }
      const sp = +$('#ta-sp', form).value;
      if (!sp) { etat('Choisissez le spectacle.', 'erreur'); return; }
      const bouton = $('button[type=submit]', form);
      bouton.disabled = true;
      etat('Enregistrement…', 'encours');
      const tache = T.file.then(() => ajouterSeance({ jour, heure, spectacle_id: sp, lieu_id: lieuId }));
      T.file = tache.catch(() => {});
      try {
        const a = await tache;
        bouton.disabled = false;
        if (a.rien) { etat(`Rien d’ajouté : ${a.texte}.`); return; }
        T.pile.push({ libelle: a.texte, defaire: () => defaireAjout(a) });
        etat(`${a.texte[0].toUpperCase()}${a.texte.slice(1)}.`, 'ok', true);
        // la séance ajoutée : en vue, et la case de l'heure active
        montrerAjouts([a.id]);
        dessiner();
        const l = T.lignes.findIndex(y => y.d.id === a.id && (a.rep ? y.r?.id === a.rep : y.r?.jour === jour));
        if (l >= 0) { activer(l, Math.max(0, T.cols.findIndex(y => y.k === 'heure')), { focus: false }); cellule(l, T.actif.c)?.classList.add('vient-d-ailleurs'); }
        $('#ta-jour', form).value = ''; $('#ta-heure', form).value = '';
        $('#ta-jour', form).focus();
      } catch (err) { bouton.disabled = false; etat(`Pas enregistré : ${err?.message || err}`, 'erreur'); }
    };
    $('#ta-jour', form).focus();
  }

  // ———— supprimer les séances choisies (Ctrl+Suppr) : une date sans plus de séance part entière, après confirmation
  async function supprimerLignes() {
    const p = plage(), xs = T.lignes.slice(p.l0, p.l1 + 1);
    if (!xs.length) return;
    const parDate = new Map();
    xs.forEach(x => { if (!parDate.has(x.d.id)) parDate.set(x.d.id, { d: x.d, reps: new Set(), entiere: !x.r }); const g = parDate.get(x.d.id); if (x.r) g.reps.add(x.r.id); else g.entiere = true; });
    const groupes = [...parDate.values()].map(g => ({ ...g, entiere: g.entiere || repsDe(g.d.id).every(r => g.reps.has(r.id)) }));
    const entieres = groupes.filter(g => g.entiere), nS = xs.filter(x => x.r).length;
    const seul = xs.length === 1 ? xs[0] : null, dateSeule = !!seul && !seul.r;   // une date sans séance (une période)
    const quoi = seul ? `${dateSeule ? 'la date' : 'la séance'} du ${jourCourt(seul.r?.jour || seul.d.debut)}${seul.r?.heure ? ` à ${heureT(seul.r.heure)}` : ''} (${spectacle(seul.d.spectacle_id)?.titre || ''}, ${ouDit(seul.d.lieu_id)})` : `${pl(nS || xs.length, 'séance')}`;
    const suite = dateSeule ? 'Elle n’a pas de séance : elle est supprimée, avec son équipe et sa feuille de route.'
      : entieres.length ? `${entieres.length > 1 ? `${entieres.length} dates n’auront` : 'Sa date n’aura'} plus de séance : ${entieres.length > 1 ? 'elles sont supprimées' : 'elle est supprimée'}, avec ${entieres.length > 1 ? 'leur' : 'son'} équipe et ${entieres.length > 1 ? 'leur' : 'sa'} feuille de route.` : '';
    etat('Suppression…', 'encours');
    const tache = T.file.then(async () => {
      const defaire = [];
      for (const g of groupes) {
        const d = E.dates.find(y => y.id === g.d.id); if (!d) continue;
        T.recents.set(d.id, Date.now());
        if (g.entiere) { const retablir = await effacerDate(d); defaire.push(() => retablir()); continue; }
        const F = dateVersForm(d), partis = F.representations.filter(r => g.reps.has(r.id));
        F.representations = F.representations.filter(r => !g.reps.has(r.id));
        await ecrireDate(F, d, { libre: !!(d.intitule || '').trim() });
        defaire.push(async () => { const d2 = E.dates.find(y => y.id === d.id); if (!d2) return; const G = dateVersForm(d2); G.representations.push(...partis.map(r => ({ ...r, id: undefined }))); T.recents.set(d.id, Date.now()); await ecrireDate(G, d2, { libre: !!(d2.intitule || '').trim() }); });
      }
      return defaire;
    });
    T.file = tache.catch(() => {});
    try {
      const defaire = await tache;
      const texte = `${quoi} supprimée${xs.length > 1 ? 's' : ''}${entieres.length && !dateSeule ? ` (${pl(entieres.length, 'date')} entière${entieres.length > 1 ? 's' : ''})` : ''}`;
      T.pile.push({ libelle: texte, defaire: async () => { for (const f of defaire.reverse()) await f(); } });
      T.ancre = null;
      etat(`${texte[0].toUpperCase()}${texte.slice(1)}.`, 'ok', true);
    } catch (err) { etat(`Suppression impossible : ${err?.message || err}`, 'erreur'); }
    dessiner({ garder: true });
  }

  // ==================== copier, coller
  // ———— copier, coller (des cases, comme dans un tableur : des colonnes séparées par des tabulations)
  const cellTsv = v => (/[\t\n"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  function copie() {
    const p = plage(), out = [];
    for (let l = p.l0; l <= p.l1; l++) { const x = T.lignes[l]; out.push(T.cols.slice(p.c0, p.c1 + 1).map(c => cellTsv(String(c.copie(x) ?? '').replace(/\r?\n/g, ' '))).join('\t')); }
    return out.join('\n');
  }
  // un texte de tableur → des lignes de cases (les guillemets d'Excel et de Google Sheets compris)
  function lireTsv(t) {
    const out = [[]]; let cas = '', i = 0, guill = false;
    const s = String(t ?? '').replace(/\r\n?/g, '\n').replace(/\n$/, '');
    while (i < s.length) {
      const ch = s[i];
      if (guill) { if (ch === '"' && s[i + 1] === '"') { cas += '"'; i += 2; continue; } if (ch === '"') { guill = false; i++; continue; } cas += ch; i++; continue; }
      if (ch === '"' && cas === '') { guill = true; i++; continue; }
      if (ch === '\t') { out[out.length - 1].push(cas); cas = ''; i++; continue; }
      if (ch === '\n') { out[out.length - 1].push(cas); cas = ''; out.push([]); i++; continue; }
      cas += ch; i++;
    }
    out[out.length - 1].push(cas);
    return out.filter(r => r.some(x => x.trim() !== '') || r.length > 1);
  }
  function coller(texte) {
    const m = lireTsv(texte);
    if (!m.length) return;
    const p = plage(), chs = [], vus = new Map();
    let ignorees = 0, dehors = 0;
    const mettre = (l, j, brut) => {
      const x = T.lignes[l], c = T.cols[j];
      if (!x || !c) { dehors++; return; }
      if (c.type === 'lecture' || c.fige?.(x)) { ignorees++; return; }
      const v = c.lire(brut, x);
      if (v === undefined || (v === '' && !c.vider && c.type !== 'heure')) { ignorees++; return; }
      const k = c.niveau === 'seance' ? `${x.cle}|${c.k}` : `${x.d.id}|${c.k}`;
      if (vus.has(k)) chs.splice(vus.get(k), 1, { x, col: c, v }); else { vus.set(k, chs.length); chs.push({ x, col: c, v }); }
    };
    if (m.length === 1 && m[0].length === 1 && T.ancre) { for (let l = p.l0; l <= p.l1; l++) for (let j = p.c0; j <= p.c1; j++) mettre(l, j, m[0][0]); }
    else m.forEach((ligne, i) => ligne.forEach((brut, j) => mettre(p.l0 + i, p.c0 + j, brut)));
    const fait = chs.filter(ch => JSON.stringify(ch.col.val(ch.x)) !== JSON.stringify(ch.v));
    const note = [ignorees ? `${pl(ignorees, 'case')} ignorée${ignorees > 1 ? 's' : ''} (valeur non reconnue ou case en lecture seule)` : '', dehors ? `${pl(dehors, 'case')} hors du tableau (« Importer » crée des séances)` : ''].filter(Boolean).join(' ; ');
    if (!fait.length) return etat(note ? `Rien de collé : ${note}.` : 'Rien ne change.', note ? 'erreur' : '');
    ecrire(fait, { dire: `${pl(fait.length, 'case')} collée${fait.length > 1 ? 's' : ''}${note ? ` ; ${note}` : ''}` });
  }

  // ==================== l'export : Excel, CSV, Google Sheets
  // ———— exporter : les lignes et les colonnes de la vue (Excel, CSV, Google Sheets)
  function tableau() {
    return { entetes: T.cols.map(c => c.l), lignes: T.lignes.map(x => T.cols.map(c => {
      if (c.type === 'jour') return { t: 'd', v: c.exp(x).jour };
      if (c.type === 'heure') { const h = c.exp(x).heure; return h ? { t: 'h', v: h } : { t: 's', v: '' }; }
      if (c.nombre) { const v = c.val(x); return v === '' || v == null ? { t: 's', v: '' } : { t: 'n', v: Number(v) }; }
      return { t: 's', v: c.texte(x) };
    })) };
  }
  const nomFichier = ext => `crescite-representations-${AUJ}.${ext}`;
  function telecharger(blob, nom) {
    const a = document.createElement('a'), u = URL.createObjectURL(blob);
    a.href = u; a.download = nom; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
  }
  async function copierTexte(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch {
      const z = document.createElement('textarea'); z.value = t; z.style.cssText = 'position:fixed;opacity:0'; document.body.append(z); z.select();
      const ok = document.execCommand('copy'); z.remove(); return ok;
    }
  }
  // une case de texte qui commence par = + - @ (une formule pour Excel ou Google Sheets : un commentaire saisi ailleurs
  // ne doit rien calculer ni appeler chez celui qui ouvre le fichier) part précédée d'une apostrophe
  const sansFormule = v => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
  const texteCase = (c, sep) => (c.t === 'd' ? jjmmaaaa(c.v) : c.t === 'h' ? c.v : c.t === 'n' ? String(c.v).replace('.', ',') : sansFormule(String(c.v ?? '').replace(/\r?\n/g, sep === '\t' ? ' ' : '\n')));
  async function exporter(genre) {
    if (!T.lignes.length) return etat('Rien à exporter : aucune séance dans la vue.', 'erreur');
    const t = tableau(), n = pl(t.lignes.length, 'ligne');
    if (genre === 'xlsx') { telecharger(xlsx(t), nomFichier('xlsx')); return etat(`Excel : ${n}, ${pl(t.entetes.length, 'colonne')} (celles de la vue).`, 'ok'); }
    if (genre === 'csv') {
      const q = v => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
      const csv = [t.entetes, ...t.lignes.map(l => l.map(c => texteCase(c, ';')))].map(l => l.map(v => q(String(v))).join(';')).join('\r\n');
      telecharger(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }), nomFichier('csv'));
      return etat(`CSV : ${n} (séparées par des points-virgules, pour Excel en français).`, 'ok');
    }
    const tsv = [t.entetes, ...t.lignes.map(l => l.map(c => texteCase(c, '\t')))].map(l => l.map(v => cellTsv(String(v))).join('\t')).join('\n');
    const ok = await copierTexte(tsv);
    if (!ok) return etat('La copie n’a pas pu se faire : exportez plutôt en Excel, puis importez le fichier dans Google Sheets.', 'erreur');
    window.open('https://sheets.new', '_blank', 'noopener');
    etat(`Tableau copié (${n}) : dans la feuille Google qui s’ouvre, collez-le (Ctrl+V).`, 'ok');
  }

  // ———— un .xlsx sans bibliothèque : un classeur d'une feuille (en-tête en gras, figée, filtrable ; jours et heures en
  // vraies dates et heures d'Excel), dans une archive zip sans compression
  const XML_ENTETE = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const xmlEsc = s => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const colLettre = n => { let s = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
  const jourExcel = j => (Date.UTC(+j.slice(0, 4), +j.slice(5, 7) - 1, +j.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 864e5;
  const heureExcel = h => (+h.slice(0, 2) * 60 + +h.slice(3, 5)) / 1440;
  function xlsx({ entetes, lignes }) {
    const nC = entetes.length, dern = colLettre(nC - 1), nL = lignes.length + 1;
    const cas = (c, r, j) => {
      const ref = `${colLettre(j)}${r}`;
      if (c.t === 'd' && c.v) return `<c r="${ref}" s="2"><v>${jourExcel(c.v)}</v></c>`;
      if (c.t === 'h' && c.v) return `<c r="${ref}" s="3"><v>${heureExcel(c.v)}</v></c>`;
      if (c.t === 'n') return `<c r="${ref}"><v>${Number(c.v)}</v></c>`;
      return c.v === '' || c.v == null ? '' : `<c r="${ref}" t="inlineStr"${c.gras ? ' s="1"' : ''}><is><t xml:space="preserve">${xmlEsc(c.v)}</t></is></c>`;
    };
    const larg = entetes.map((e, j) => Math.min(60, Math.max(e.length + 2, ...lignes.slice(0, 400).map(l => (l[j].t === 'd' ? 11 : l[j].t === 'h' ? 6 : String(l[j].v || '').length) + 2))));
    const feuille = `${XML_ENTETE}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
      + `<dimension ref="A1:${dern}${nL}"/><sheetViews><sheetView workbookViewId="0"><pane xSplit="${Math.min(2, nC)}" ySplit="1" topLeftCell="${colLettre(Math.min(2, nC))}2" activePane="bottomRight" state="frozen"/><selection pane="bottomRight"/></sheetView></sheetViews>`
      + `<sheetFormatPr defaultRowHeight="15"/><cols>${larg.map((w, j) => `<col min="${j + 1}" max="${j + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>`
      + `<row r="1">${entetes.map((e, j) => cas({ t: 's', v: e, gras: true }, 1, j)).join('')}</row>`
      + lignes.map((l, i) => `<row r="${i + 2}">${l.map((c, j) => cas(c, i + 2, j)).join('')}</row>`).join('')
      + `</sheetData><autoFilter ref="A1:${dern}${nL}"/></worksheet>`;
    const fichiers = [
      ['[Content_Types].xml', `${XML_ENTETE}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`],
      ['_rels/.rels', `${XML_ENTETE}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`],
      ['docProps/core.xml', `${XML_ENTETE}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Représentations</dc:title><dc:creator>Crescite</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`],
      ['xl/workbook.xml', `${XML_ENTETE}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Représentations" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'Représentations'!$A$1:$${dern}$${nL}</definedName></definedNames></workbook>`],
      ['xl/_rels/workbook.xml.rels', `${XML_ENTETE}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ['xl/styles.xml', `${XML_ENTETE}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="hh:mm"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
      ['xl/worksheets/sheet1.xml', feuille],
    ];
    return new Blob([zipSansCompression(fichiers)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  // une archive zip « stockée » (sans compression) : en-têtes locaux, répertoire central, fin de répertoire ; CRC-32
  const TABLE_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = o => { let c = 0xFFFFFFFF; for (let i = 0; i < o.length; i++) c = TABLE_CRC[(c ^ o[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zipSansCompression(fichiers) {
    const enc = new TextEncoder(), maintenant = new Date(), parts = [], central = [];
    const heure = (maintenant.getHours() << 11) | (maintenant.getMinutes() << 5) | (maintenant.getSeconds() >> 1);
    const jour = ((maintenant.getFullYear() - 1980) << 9) | ((maintenant.getMonth() + 1) << 5) | maintenant.getDate();
    let pos = 0;
    for (const [nom, contenu] of fichiers) {
      const n = enc.encode(nom), o = enc.encode(contenu), crc = crc32(o);
      const loc = new DataView(new ArrayBuffer(30));
      [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, heure, 2], [12, jour, 2], [14, crc, 4], [18, o.length, 4], [22, o.length, 4], [26, n.length, 2], [28, 0, 2]]
        .forEach(([i, v, t]) => (t === 4 ? loc.setUint32(i, v, true) : loc.setUint16(i, v, true)));
      const cen = new DataView(new ArrayBuffer(46));
      [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, heure, 2], [14, jour, 2], [16, crc, 4], [20, o.length, 4], [24, o.length, 4], [28, n.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, pos, 4]]
        .forEach(([i, v, t]) => (t === 4 ? cen.setUint32(i, v, true) : cen.setUint16(i, v, true)));
      parts.push(new Uint8Array(loc.buffer), n, o);
      central.push(new Uint8Array(cen.buffer), n);
      pos += 30 + n.length + o.length;
    }
    const tailleC = central.reduce((s, x) => s + x.length, 0), fin = new DataView(new ArrayBuffer(22));
    [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, fichiers.length, 2], [10, fichiers.length, 2], [12, tailleC, 4], [16, pos, 4], [20, 0, 2]]
      .forEach(([i, v, t]) => (t === 4 ? fin.setUint32(i, v, true) : fin.setUint16(i, v, true)));
    const tout = [...parts, ...central, new Uint8Array(fin.buffer)], sortie = new Uint8Array(tout.reduce((s, x) => s + x.length, 0));
    let k = 0; tout.forEach(x => { sortie.set(x, k); k += x.length; });
    return sortie;
  }

  // ==================== l'import : des lignes copiées d'un tableur
  // ———— importer des lignes copiées d'un tableur : une ligne par séance, au moins le jour et le spectacle ; la première
  // ligne peut nommer les colonnes (sinon, l'ordre de l'export). Un aperçu dit ce que chaque ligne deviendra.
  const ENTETES_LUS = [['jour', /^(jour|date|dates|le)$/], ['heure', /^(heure|horaire|heure de debut|debut)$/], ['fin', /^(fin|heure de fin)$/], ['spectacle', /^(spectacle|piece|titre|creation)$/],
    ['lieu', /^(lieu|salle|theatre|structure|lieu de representation)$/], ['commune', /^(commune|ville|localite)$/], ['public', /^(public|type de public)$/], ['statut', /^(statut|etat)$/],
    ['nature', /^(nature|type)$/], ['distribution', /^(distribution|comediens|comediennes|equipe|artistes|interpretes)$/], ['billetterie', /^(billetterie|lien|reservation|reservations)$/],
    ['precisions', /^(precisions?|remarques?)$/], ['organisateur', /^(organisateur|organisatrice|programmateur|programmatrice)$/], ['contact', /^(contact|contacts)$/],
    ['contrat', /^contrat$/], ['montant', /^(cession( ht)?|montant( de cession)?( ht)?|prix( de cession)?)( \(?(€|eur)\)?)?$/], ['notes', /^(notes?|commentaires?)$/], ['annulee', /^(seance annulee|annulee|annule)$/], ['site', /^site$/]];
  const ORDRE_EXPORT = COLONNES.map(c => c.k);
  function lireImport(texte) {
    const m = lireTsv(texte);
    if (!m.length) return { lignes: [], cles: [] };
    const tete = m[0].map(x => norm(x).trim().replace(/[^a-z ]/g, '').replace(/\s+/g, ' '));
    const lues = tete.map(t => (ENTETES_LUS.find(([, re]) => re.test(t)) || [null])[0]);
    const avecTete = lues.filter(Boolean).length >= 2;
    const cles = avecTete ? lues : ORDRE_EXPORT.filter(k => colonne(k) && (!colonne(k).si || colonne(k).si()));
    const virtuelles = [];   // les dates que l'import créera, pour l'aperçu
    const lignes = (avecTete ? m.slice(1) : m).map((cases, i) => {
      const v = {}; cles.forEach((k, j) => { if (k) v[k] = (cases[j] ?? '').trim(); });
      const jour = lireJour(v.jour, AUJ), sp = trouverSpectacle(v.spectacle || ''), heure = lireHeure(v.heure), fin = lireHeure(v.fin);
      const erreurs = [], notes = [];
      if (!jour) erreurs.push(v.jour ? `jour illisible : « ${v.jour} »` : 'pas de jour');
      if (!sp) erreurs.push(v.spectacle ? `spectacle inconnu : « ${v.spectacle} »` : 'pas de spectacle');
      if (heure === undefined) erreurs.push(`heure illisible : « ${v.heure} »`);
      let lieuId = null;
      if (v.lieu || v.commune) { lieuId = trouverLieu(v.lieu || v.commune, v.lieu ? v.commune : ''); if (lieuId == null || lieuId === undefined) { notes.push(`lieu inconnu : « ${[v.lieu, v.commune].filter(Boolean).join(', ')} » (laissé vide)`); lieuId = null; } }
      const pub = v.public ? lireChoix(PUBLICS)(v.public) : 'tout_public', statut = v.statut ? lireChoix(STATUTS)(v.statut) : undefined, nat = v.nature ? lireChoix(NATURES_DATE)(v.nature) : undefined;
      if (v.public && !pub) notes.push(`public « ${v.public} » ignoré`);
      if (v.statut && !statut) notes.push(`statut « ${v.statut} » ignoré`);
      const equipe = v.distribution ? lirePersonnes(v.distribution) : null;
      if (v.distribution && !equipe) notes.push('distribution : un nom n’est pas reconnu (ignorée)');
      const contrat = v.contrat ? lireChoix(CONTRATS)(v.contrat) : '';
      let cible = '';
      if (!erreurs.length) {
        const d = dateVoisine(sp, lieuId, jour), w = virtuelles.find(x => x.sp === sp && x.lieu === lieuId && Math.abs(Date.parse(x.debut) - Date.parse(jour)) <= 864e5 * Math.max(1, x.n));
        cible = d ? `ajoutée à la date du ${jourCourt(d.debut)}` : w ? 'avec la nouvelle date de la ligne ' + w.ligne : 'nouvelle date';
        if (!d && !w) virtuelles.push({ sp, lieu: lieuId, debut: jour, n: 1, ligne: i + 1 + (avecTete ? 1 : 0) });
      }
      return { n: i + 1 + (avecTete ? 1 : 0), v, ok: !erreurs.length, erreurs, notes, cible,
        seance: { jour, heure: heure || '', fin: fin || '', spectacle_id: sp, lieu_id: lieuId,
          seance: { public: pub || 'tout_public', note: v.precisions || '', annulee: colonne('annulee').lire(v.annulee || '') === true },
          date: { ...(statut ? { statut } : {}), ...(nat ? { nature: nat } : {}), ...(v.billetterie && colonne('billetterie').lire(v.billetterie) ? { lien: colonne('billetterie').lire(v.billetterie) } : {}) },
          suivi: { ...(v.organisateur ? { organisateur: v.organisateur } : {}), ...(v.contact ? { contact: v.contact } : {}), ...(contrat ? { contrat } : {}), ...(v.notes ? { notes: v.notes } : {}),
            ...(v.montant && E.ideale && colonne('montant').lire(v.montant) !== undefined && colonne('montant').lire(v.montant) !== '' ? { montant_cession: colonne('montant').lire(v.montant) } : {}) },
          equipe: equipe || null } };
    });
    return { lignes, cles: cles.filter(Boolean), avecTete };
  }
  function importer() {
    const dlg = document.createElement('dialog');
    dlg.className = 'tab-dialogue large';
    dlg.setAttribute('aria-labelledby', 'tab-im-titre');
    dlg.innerHTML = `<div class="tab-dialogue-boite"><h2 id="tab-im-titre">Importer des séances</h2>
      <p class="aide">Copiez des lignes dans un tableur (Excel, Google Sheets, LibreOffice) et collez-les ici : une ligne par séance, avec au moins le jour et le spectacle. La première ligne peut donner les titres des colonnes (Jour, Heure, Spectacle, Lieu, Commune, Public…) ; sans elle, les colonnes sont lues dans l’ordre de l’export. Rien ne s’écrit avant « Créer ».</p>
      <label for="tab-im-texte" class="lib">Les lignes</label><textarea id="tab-im-texte" rows="6" spellcheck="false" placeholder="Jour&#9;Heure&#9;Spectacle&#9;Lieu"></textarea>
      <div class="tab-im-apercu" id="tab-im-apercu" aria-live="polite"></div>
      <div class="fm-boutons"><button type="button" class="btn principal" id="tab-im-ok" disabled>Créer</button><button type="button" class="btn" id="tab-im-non">Fermer</button></div></div>`;
    document.body.append(dlg);
    let lu = { lignes: [] };
    const apercu = () => {
      lu = lireImport($('#tab-im-texte', dlg).value);
      const bons = lu.lignes.filter(x => x.ok);
      $('#tab-im-apercu', dlg).innerHTML = lu.lignes.length ? `<p><b>${pl(bons.length, 'séance')} à créer</b>${lu.lignes.length - bons.length ? ` ; ${pl(lu.lignes.length - bons.length, 'ligne')} de côté` : ''}${lu.avecTete ? ` · colonnes lues : ${esc(lu.cles.map(k => colonne(k)?.l || k).join(', '))}` : ''}.</p>
        <div class="tab-im-cadre"><table class="simple"><thead><tr><th scope="col">Ligne</th><th scope="col">Jour</th><th scope="col">Heure</th><th scope="col">Spectacle</th><th scope="col">Lieu</th><th scope="col">Ce qui se fera</th></tr></thead><tbody>
        ${lu.lignes.map(x => `<tr class="${x.ok ? '' : 'tab-im-non'}"><td>${x.n}</td><td>${esc(x.seance.jour ? jourCourt(x.seance.jour) : x.v.jour || '')}</td><td>${esc(x.seance.heure ? heureT(x.seance.heure) : '')}</td><td>${esc(spectacle(x.seance.spectacle_id)?.titre || x.v.spectacle || '')}</td><td>${esc(x.seance.lieu_id ? ouDit(x.seance.lieu_id) : '')}</td>
          <td>${x.ok ? esc(x.cible) : `<b class="tab-im-erreur">${esc(x.erreurs.join(' ; '))}</b>`}${x.notes.length ? `<br><small>${esc(x.notes.join(' ; '))}</small>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '';
      $('#tab-im-ok', dlg).textContent = bons.length ? `Créer ${pl(bons.length, 'séance')}` : 'Créer';
      $('#tab-im-ok', dlg).disabled = !bons.length;
    };
    $('#tab-im-texte', dlg).addEventListener('input', apercu);
    // des lignes collées ne se perdent pas d'un Échap : Fermer et Échap posent la question si le texte a changé
    if (typeof GESTES !== 'undefined') GESTES.garder(dlg);
    const fermerImport = async () => { if (await partirSansPerdre({ titre: 'Fermer sans importer ?', texte: 'Les lignes collées seront perdues.', ok: 'Fermer', dans: dlg, avecFiche: false })) dlg.close(); };
    $('#tab-im-non', dlg).addEventListener('click', fermerImport);
    dlg.addEventListener('cancel', e => { if (typeof GESTES !== 'undefined' && GESTES.saisie(dlg)) { e.preventDefault(); fermerImport(); } });
    dlg.addEventListener('close', () => { dlg.remove(); $('#tab-importer')?.focus(); });
    $('#tab-im-ok', dlg).addEventListener('click', async () => {
      const b = $('#tab-im-ok', dlg), xs = lu.lignes.filter(x => x.ok), faits = [];
      b.disabled = true; $('#tab-im-texte', dlg).disabled = true;
      let rates = 0;
      for (const x of xs) {
        b.textContent = `${faits.length + rates + 1} / ${xs.length}…`;
        const tache = T.file.then(() => ajouterSeance(x.seance));
        T.file = tache.catch(() => {});
        try { const a = await tache; if (!a.rien) faits.push(a); } catch { rates++; }
      }
      dlg.close();
      if (faits.length) T.pile.push({ libelle: `${pl(faits.length, 'séance')} importée${faits.length > 1 ? 's' : ''}`, defaire: async () => { for (const a of faits.reverse()) await defaireAjout(a); } });
      const nd = faits.filter(a => a.nouvelle).length;
      etat(`Import : ${pl(faits.length, 'séance')} créée${faits.length > 1 ? 's' : ''}${nd ? `, dont ${pl(nd, 'nouvelle date', 'nouvelles dates')}` : ''}${rates ? ` ; ${rates} refusée${rates > 1 ? 's' : ''} par la base` : ''}.`, rates ? 'erreur' : 'ok', !!faits.length);
      if (faits.length) montrerAjouts(faits.map(a => a.id));
      dessiner();
    });
    dlg.showModal();
    $('#tab-im-texte', dlg).focus();
  }

  return { vue, choixVue, lireJour, lireHeure, lireTsv, xlsx, lireImport };
})();
