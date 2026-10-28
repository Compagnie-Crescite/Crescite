'use strict';
/* La distribution à l'écran : qui joue, qui part, sur chaque date, et ce qu'un changement de distribution fait aux dates.
   Chargé après equipe.js (dont il lit l'état et les outils : E, personne, spectacle, nomDe, priveeDe, initiales,
   distributionDe, categoriesDe, equipeDate, equipeDeLaDate, enTourneeDans, CATEGORIES, rangCategorie, finDe, jourEntier, AUJ)
   et du script principal d'index.html ($, esc), avant planning.js, tableur.js (qui le lit à l'usage) et gardefous.js (lu sous typeof :
   il se charge après lui). Il ne garde que de quoi aller vite (les colonnes de la matrice, rendues les mêmes tant que leur en-tête ne
   change pas) et n'écrit rien dans la base : les écritures restent celles d'equipe.js (ecrireEcarts, retirerDeDistribution,
   enregistrerEquipeDate…) et celles du tableur (son ecrire, par le chemin de la fiche d'une date).
   - la cellule d'une date (DISTRIBUTION.cellule) : des pastilles rondes de 24 px aux initiales de chacun, qui se chevauchent,
     rangées par métier avec un liseré de la couleur du métier (jeu prune, création indigo, technique ambre, production
     sauge) ; le nom et le rôle en infobulle (« Camille Essai · Bérénice ») ; un remplaçant ou un renfort a un anneau
     pointillé ambre ; qui ne part pas est gris et barré ; « −n » (corail) compte ceux de la tournée qui ne partent pas,
     « +n » ceux que la place ne laisse pas voir. Jamais de photo dans la grille : des initiales, de quoi garder les portraits
     privés privés (avatar() d'equipe.js poserait un background-image dès que la photo n'est pas privée, et rend une
     chaîne : on ne lui « ajoute » pas une classe). Du texte et du CSS, pas un SVG par case : 300 lignes se dessinent vite.
     La cellule est une chaîne de HTML : la colonne Distribution du tableur la montre telle quelle, dans ses trois modes, avec la place
     que la colonne lui laisse (largeur) ;
   - la fenêtre d'une case (DISTRIBUTION.fenetre) : « En tournée » (une case par personne, son portrait, sa fonction, son téléphone, sa
     fonction et sa note sur la date) et « Remplaçants et renforts » (« Remplace Lauren » en lien pour la personne qu'on vient de
     décocher, une fiche créée au vol), des puces de métier, et, en pied, qui sera prévenu ; elle est posée par le tableur, qui lui prête
     ses gestes (poser, fermer, enregistrer, étendre) ;
   - la matrice (DISTRIBUTION.colonnes) : le mode Distribution du tableur, une colonne de type « presence » par personne en tournée du
     spectacle à l'écran, puis par renfort rencontré, une ligne par date ; la case dit ✓ elle part, ✕ elle ne part pas, ⟳ remplaçante ou
     renfort (DISTRIBUTION.etat), un clic en prend l'état suivant (suivant), l'écriture pose les écarts (poserEtat : la fonction et la
     note d'une ligne ne sont jamais supprimées par un clic) ; un point corail signale une indisponibilité à venir (GARDEFOUS.indisposDe) ;
     le menu d'une colonne offre « Régler sa période » ; le texte d'une case se copie et se colle (lireEtat) ;
   - le métier d'une personne sur une date (DISTRIBUTION.metier) : celui de sa ligne de distribution (le premier dans l'ordre
     jeu, création, technique, production) ; un renfort ou un remplaçant, hors distribution, se reconnaît à un motif propre
     à ce module (régie, technique, son, lumière → technique ; jeu, comédien → jeu ; sinon neutre, rangé en dernier).
     REGIE d'equipe.js, qui exige « régie générale », reste pour la feuille de route ;
   - qui sera prévenu (DISTRIBUTION.prevenus, DISTRIBUTION.phrase) : la règle du déclencheur crescite_notif_equipes
     (supabase/migrations/20261108_crescite_correctifs.sql) : parmi les personnes dont la présence change sur une date
     à venir, celles qui ont un compte (crescite_personnes_privees.user_id) ; un changement de fonction ou de note seul ne
     prévient personne ; sur une date toute neuve, qui « ne part plus » n'est pas prévenu. L'équipe d'une date se lit par
     equipeDate(), le jumeau de la vue crescite_equipe_date (20261110_crescite_carnet.sql), que le client ne lit pas ;
   - l'impact d'un changement de distribution (DISTRIBUTION.impact) : avant d'ajouter ou de retirer quelqu'un, ou de cocher
     ou décocher « en tournée », une seule boîte dit combien de dates changent d'équipe (les dates à venir, dont les
     représentations confirmées, puis les passées) et propose de limiter le changement à partir d'aujourd'hui (coché
     d'office : les dates passées ne bougent pas). Aucun déclencheur ne regarde crescite_distributions : personne n'est
     prévenu automatiquement, et la boîte le dit (« Prévenir l'équipe », dans la fiche d'une date, le fait à la main). Elle
     rend le choix ; c'est equipe.js qui écrit, dans l'ordre qui évite un « Vous partez » à tort : les écarts d'abord, la
     distribution ensuite quand la personne s'en va ; la distribution d'abord, les écarts ensuite quand elle arrive.
   Les autres écrivains de crescite_equipes (le dépôt d'une personne sur une date au tableau de bord, une proposition de
   dates devenue date) ne passent pas par ce résumé : ils restent hors de ce module.
   DISTRIBUTION.cellule(d, { largeur })   DISTRIBUTION.avatarMini(p)   DISTRIBUTION.metier(spId, pid, fonction)
   DISTRIBUTION.prevenus(d, voulu, { neuve })   DISTRIBUTION.phrase(r)   DISTRIBUTION.impact(spId, { pid, sens, ligne, geste, declencheur })
   DISTRIBUTION.datesQuiChangent(spId, pid, sens, ligne)   (les dates dont l'équipe change : le compte de l'impact)
   DISTRIBUTION.fenetre(td, d, hote, { initial, n, jour })   DISTRIBUTION.colonnes(f, lignes, hote)   DISTRIBUTION.etat(d, pid)
   DISTRIBUTION.suivant(d, pid)   DISTRIBUTION.poserEtat(d, ecarts, pid, v)   DISTRIBUTION.lireEtat(texte)   DISTRIBUTION.dit(v) */
const DISTRIBUTION = (() => {
  const pl = (n, un, des) => `${n} ${n > 1 ? des || `${un}s` : un}`;
  // l'espace d'une cellule du tableur (sa colonne fait 250 px), de quoi poser autant de pastilles qu'il en tient
  const LARGEUR = 232, PASTILLE = 24, PAS = 19, BADGE_MOINS = 34, BADGE_PLUS = 30;
  const INCONNU = 9;   // le rang d'un métier qu'on ne reconnaît pas : en dernier

  // ———— le métier
  // le métier que dit un texte libre (une fonction, des métiers de la fiche) ; null si rien ne se reconnaît
  const MOTIF_TECHNIQUE = /r[ée]gi|techni|\bson\b|lumi[eè]re/i, MOTIF_JEU = /\bjeu\b|jou(?:e|eur|euse)\b|com[ée]dien/i;
  const motif = texte => MOTIF_TECHNIQUE.test(texte || '') ? 'technique' : MOTIF_JEU.test(texte || '') ? 'jeu' : null;
  // le métier d'une personne sur un spectacle : sa ligne de distribution (la première des catégories), sinon, pour un renfort,
  // le motif de sa fonction sur la date, puis de ses métiers ; null : neutre
  function metier(spId, pid, fonction = '') {
    const cats = categoriesDe(spId, pid).sort((a, b) => rangCategorie(a) - rangCategorie(b));
    if (cats.length) return cats[0];
    return motif(fonction) || motif((personne(pid)?.metiers || []).join(' '));
  }
  const rangMetier = c => (c ? rangCategorie(c) : INCONNU);

  // ———— la cellule
  // la pastille ronde aux initiales ; rien d'autre (jamais de photo : la grille ne montre pas un portrait privé)
  const avatarMini = p => `<span class="avatar mini" aria-hidden="true">${esc(initiales(p))}</span>`;
  // qui est sur une date, dans l'ordre de la cellule : [{ pid, cat, ajout, absent, nom, titre }] et le nombre de ceux de la
  // tournée qui ne partent pas. Les absents restent dans leur métier, barrés ; les renforts viennent après leur métier
  function membres(d) {
    const sp = +d.spectacle_id, ecarts = E.equipes.filter(x => x.date_id === d.id);
    const parti = new Set(equipeDeLaDate(d).map(x => x.personne_id));
    const tournee = equipeDate(sp, []).map(x => x.personne_id);
    const absents = tournee.filter(pid => !parti.has(pid) && ecarts.some(e => e.personne_id === pid && !e.present));
    const equipe = equipeDeLaDate(d);
    const lignes = [...equipe.map(x => ({ pid: x.personne_id, ajout: x.ajout, absent: false, fonction: x.fonction })), ...absents.map(pid => ({ pid, ajout: false, absent: true, fonction: '' }))];
    const out = lignes.map(x => {
      const p = personne(x.pid), nom = nomDe(p) || 'Quelqu’un', cat = metier(sp, x.pid, x.fonction);
      const role = (E.distributions.find(y => y.spectacle_id === sp && y.personne_id === x.pid && y.role) || {}).role || '';
      const detail = x.absent ? 'ne part pas' : role || x.fonction;
      const titre = x.ajout ? `${nom} · ${x.fonction || 'remplaçant ou renfort'}${x.fonction ? ' · remplaçant ou renfort' : ''}` : `${nom}${detail ? ` · ${detail}` : ''}`;
      return { ...x, p, cat, nom, titre };
    });
    return { liste: out.map((x, i) => [x, i]).sort(([a, i], [b, j]) => rangMetier(a.cat) - rangMetier(b.cat) || i - j).map(([x]) => x), moins: absents.length };
  }
  // le HTML de la cellule d'une date (vide quand l'équipe n'est pas installée ou que personne n'est sur la date)
  function cellule(d, { largeur = LARGEUR } = {}) {
    if (!E.equipeInstallee) return '';
    const { liste, moins } = membres(d);
    if (!liste.length) return '';
    // autant de pastilles qu'il en tient, en gardant la place des badges ; le reste dans « +n »
    let k = liste.length;
    const tient = n => PASTILLE + PAS * (n - 1) + (moins ? BADGE_MOINS : 0) + (n < liste.length ? BADGE_PLUS : 0) <= largeur;
    while (k > 1 && !tient(k)) k--;
    const vus = liste.slice(0, k), caches = liste.slice(k);
    const pastille = x => `<span class="avatar mini m-${x.cat || 'neutre'}${x.ajout ? ' remplacant' : ''}${x.absent ? ' absent' : ''}" title="${esc(x.titre)}" aria-hidden="true">${esc(initiales(x.p))}</span>`;
    const lu = liste.map(x => (x.absent ? `${x.nom} (ne part pas)` : x.ajout ? `${x.nom} (remplaçant ou renfort${x.fonction ? ` : ${x.fonction}` : ''})` : x.nom)).join(', ');
    return `<span class="dist-cell"><span class="dist-av">${vus.map(pastille).join('')}</span>`
      + (moins ? `<span class="dist-moins" title="${esc(`${pl(moins, 'personne de la tournée ne part', 'personnes de la tournée ne partent')} pas sur cette date`)}" aria-hidden="true">−${moins}</span>` : '')
      + (caches.length ? `<span class="dist-plus" title="${esc(caches.map(x => x.nom).join(', '))}" aria-hidden="true">+${caches.length}</span>` : '')
      + `<span class="sr">${esc(lu)}</span></span>`;
  }

  // ———— qui sera prévenu
  // d : { id, spectacle_id, debut, fin } (id nul : une date qu'on crée) ; voulu : les écarts voulus ({ personne_id, present,
  // fonction, note }). → { partent, nePartentPlus : les personnes prévenues (avec un compte), sansCompte : celles dont
  // la présence change sans qu'on puisse les prévenir, aVenir, change : la présence de quelqu'un change, n }
  function prevenus(d, voulu, { neuve = !d.id } = {}) {
    const sp = +d.spectacle_id, jour = d.fin || d.debut;
    const avant = new Set(equipeDate(sp, neuve ? [] : E.equipes.filter(x => x.date_id === d.id)).map(x => x.personne_id));
    const apres = new Set(equipeDate(sp, voulu || []).map(x => x.personne_id));
    // sur une date toute neuve, qui « ne part plus » n'est pas prévenu (le déclencheur efface même son annonce)
    const partent = [...apres].filter(pid => !avant.has(pid)), nePartentPlus = neuve ? [] : [...avant].filter(pid => !apres.has(pid));
    const aVenir = !jour || jour >= AUJ, compte = pid => !!priveeDe(pid)?.user_id;
    const avertis = aVenir ? [...partent, ...nePartentPlus].filter(compte) : [];
    return { partent: partent.filter(pid => avertis.includes(pid)), nePartentPlus: nePartentPlus.filter(pid => avertis.includes(pid)),
      sansCompte: aVenir ? [...partent, ...nePartentPlus].filter(pid => !compte(pid)) : [], aVenir, change: partent.length + nePartentPlus.length > 0, n: avertis.length };
  }
  // la phrase du résumé (vide quand rien ne change) : la fiche d'une date, plus tard la fenêtre d'une case
  function phrase(r) {
    if (!r.change) return '';
    if (!r.aVenir) return 'Cette date est passée : personne n’est prévenu.';
    const noms = pids => pids.map(pid => nomDe(personne(pid)) || 'Quelqu’un').join(', ');
    if (!r.n) return `Personne ne sera prévenu : ${noms(r.sansCompte)} ${r.sansCompte.length > 1 ? 'n’ont' : 'n’a'} pas de compte.`;
    const quoi = [r.partent.length ? `${noms(r.partent)} : « vous partez »` : '', r.nePartentPlus.length ? `${noms(r.nePartentPlus)} : « vous ne partez plus »` : ''].filter(Boolean).join(' ; ');
    return `${r.n > 1 ? `${r.n} personnes seront prévenues` : '1 personne sera prévenue'} (${quoi}).${r.sansCompte.length ? ` ${noms(r.sansCompte)} ${r.sansCompte.length > 1 ? 'n’ont' : 'n’a'} pas de compte.` : ''}`;
  }

  // ———— l'impact d'un changement de distribution
  // les dates du spectacle que la base touche : toutes, sauf les annulées et les reportées (elles n'ont plus d'équipe à régler)
  const datesTouchables = spId => E.dates.filter(d => d.spectacle_id === spId && !['annulee', 'reportee'].includes(d.statut)).sort((a, b) => a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : a.id - b.id);
  // les dates dont l'équipe change si pid entre en tournée (sens « ajout ») ou en sort (sens « retrait »), ligne étant la ligne de
  // distribution concernée : celles où rien n'est dit pour lui (un écart, présent ou non, tient la date à part)
  function datesQuiChangent(spId, pid, sens, ligne) {
    const avant = enTourneeDans(spId, pid);
    const apres = sens === 'ajout' || E.distributions.some(y => y.spectacle_id === spId && y.personne_id === pid && y.en_tournee && y.id !== ligne?.id);
    if (avant === apres) return [];
    return datesTouchables(spId).filter(d => !E.equipes.some(e => e.date_id === d.id && e.personne_id === pid));
  }
  const GESTES = {
    ajouter: { titre: (n, s) => `Ajouter ${n} à la distribution de ${s}`, bouton: 'Ajouter' },
    retirer: { titre: (n, s) => `Retirer ${n} de la distribution de ${s}`, bouton: 'Retirer' },
    cocher: { titre: (n, s) => `${n} part en tournée sur ${s}`, bouton: 'Faire partir' },
    decocher: { titre: (n, s) => `${n} ne part plus en tournée sur ${s}`, bouton: 'Ne plus faire partir' },
  };
  const periode = ds => `du ${jourEntier(ds[0].debut)} au ${jourEntier(finDe(ds[ds.length - 1]))}`;
  // → une promesse : null quand on renonce, sinon { limiter, passees, avenir } (les dates passées et à venir qui changent ;
  // limiter : ne rien changer aux passées). Sans date qui change, aucune boîte : { limiter: false, passees: [], avenir: [] }.
  function impact(spId, { pid, sens, ligne = null, geste = sens === 'ajout' ? 'ajouter' : 'retirer', declencheur = null } = {}) {
    const touchees = datesQuiChangent(spId, pid, sens, ligne);
    const avenir = touchees.filter(d => finDe(d) >= AUJ), passees = touchees.filter(d => finDe(d) < AUJ);
    if (!touchees.length) return Promise.resolve({ limiter: false, passees: [], avenir: [] });
    const retour = declencheur || document.activeElement, g = GESTES[geste] || GESTES.ajouter;
    const confirmees = avenir.filter(d => d.statut === 'confirmee' && (d.nature || 'representations') === 'representations').length;
    $('#impact-choix')?.remove();
    const dlg = document.createElement('dialog');
    dlg.id = 'impact-choix'; dlg.className = 'tab-dialogue'; dlg.setAttribute('aria-labelledby', 'im-titre');
    dlg.innerHTML = `<div class="tab-dialogue-boite"><h2 id="im-titre">${esc(g.titre(nomDe(personne(pid)) || 'Cette personne', spectacle(spId)?.titre || 'ce spectacle'))}</h2>
      <p id="im-dates">${avenir.length ? `${pl(avenir.length, 'date à venir change', 'dates à venir changent')} d’équipe${confirmees ? ` (dont ${pl(confirmees, 'représentation confirmée', 'représentations confirmées')})` : ''}, ${periode(avenir)}.` : 'Aucune date à venir ne change.'}</p>
      <p class="aide">Personne n’est prévenu automatiquement : « Prévenir l’équipe », dans la fiche de chaque date, le fait à la main.</p>
      ${passees.length ? `<label class="case"><input type="checkbox" id="im-limiter" checked> Limiter à partir d’aujourd’hui : ${pl(passees.length, 'date passée', 'dates passées')} (${periode(passees)}) ne ${passees.length > 1 ? 'changent' : 'change'} pas</label>` : ''}
      <div class="fm-boutons"><button type="button" class="btn principal" data-im="ok">${esc(g.bouton)}</button><button type="button" class="btn" data-im="non">Annuler</button></div></div>`;
    return new Promise(resolve => {
      let choix = null;
      dlg.addEventListener('click', e => {
        if (e.target === dlg) return dlg.close();
        const b = e.target.closest('[data-im]'); if (!b) return;
        if (b.dataset.im === 'ok') choix = { limiter: !!$('#im-limiter', dlg)?.checked, passees, avenir };
        dlg.close();
      });
      dlg.addEventListener('close', () => { dlg.remove(); if (retour?.isConnected) retour.focus(); resolve(choix); });
      document.body.append(dlg);
      dlg.showModal();
      $('[data-im="ok"]', dlg).focus();
    });
  }

  // ———— l'état d'une personne sur une date : ce que la matrice montre dans une case, et ce qu'un clic en fait
  // 'part' (✓) : de la tournée, elle part ; 'absent' (✕) : de la tournée, elle ne part pas sur cette date ; 'remplacant' (⟳) : hors de la
  // tournée, elle est posée sur la date (remplaçante ou renfort) ; '' : hors de la tournée, rien sur cette date ; 'grise' : la date est
  // annulée ou reportée, il n'y a plus d'équipe à régler. La tournée est celle du spectacle de la date (en_tournee) : dans la grille d'un
  // seul spectacle, c'est celle de tout le monde ; dans celle de plusieurs, une personne d'un autre spectacle est '' sur cette ligne
  const horsJeu = d => ['annulee', 'reportee'].includes(d.statut);
  function etat(d, pid) {
    if (horsJeu(d)) return 'grise';
    const e = E.equipes.find(x => x.date_id === d.id && x.personne_id === pid);
    return enTourneeDans(+d.spectacle_id, pid) ? (e && !e.present ? 'absent' : 'part') : (e && e.present ? 'remplacant' : '');
  }
  const aLigne = e => !!e && !!((e.fonction || '').trim() || (e.note || '').trim());   // une ligne à fonction ou à note n'est jamais supprimée par un clic
  // l'état que le clic donne (le même, quand le geste ne peut rien : une ligne à fonction ou note ne s'efface pas d'un clic)
  function suivant(d, pid) {
    const v = etat(d, pid), e = ecartsDate(d.id).find(x => x.personne_id === pid);
    if (v === 'part') return 'absent';
    if (v === 'absent') return 'part';
    if (v === 'remplacant') return aLigne(e) ? v : '';
    return v === '' ? 'remplacant' : v;
  }
  // les écarts d'une date une fois la personne dans cet état (la liste des écarts d'avant n'est pas modifiée) : rien d'explicite pour qui
  // part par défaut, mais la fonction et la note d'une ligne se gardent toujours
  function poserEtat(d, ecarts, pid, v) {
    const tournee = enTourneeDans(+d.spectacle_id, pid), sortie = (ecarts || []).map(e => ({ ...e })), i = sortie.findIndex(e => e.personne_id === pid), e = i >= 0 ? sortie[i] : null;
    const voulu = tournee ? (v === 'absent' ? 'absent' : 'part') : (v === 'remplacant' || v === 'part' ? 'remplacant' : '');
    if (voulu === 'absent') { if (e) e.present = false; else sortie.push({ personne_id: pid, present: false, fonction: '', note: null }); }
    else if (voulu === 'part') { if (e && !e.present) { if (aLigne(e)) e.present = true; else sortie.splice(i, 1); } }
    else if (voulu === 'remplacant') { if (e) e.present = true; else sortie.push({ personne_id: pid, present: true, fonction: '', note: null }); }
    else if (e && !aLigne(e)) sortie.splice(i, 1);
    return sortie;
  }
  // un texte tapé ou collé → un état ('' : vide ; undefined : pas reconnu)
  function lireEtat(t) {
    const n = String(t ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (n === '') return '';
    if (/^(✓|✔|part|partent|oui|o|x|1|vrai)$/.test(n)) return 'part';
    if (/^(✕|✗|ne part pas|ne partent pas|absent|absente|non|n|0|faux)$/.test(n)) return 'absent';
    if (/^(⟳|remplacant|remplacante|renfort|remplacant ou renfort)$/.test(n)) return 'remplacant';
    return undefined;
  }
  const DIT = { part: 'part', absent: 'ne part pas', remplacant: 'remplaçant ou renfort', '': '', grise: 'date annulée ou reportée' };
  const GLYPHE = { part: '✓', absent: '✕', remplacant: '⟳', '': '', grise: '' };

  // ———— la fenêtre posée sur une case : qui part sur cette date, qui la remplace, qui sera prévenu
  // Deux blocs — « En tournée » (une case par personne de la distribution, avec son portrait, sa fonction, son téléphone, et sa fonction et
  // sa note sur cette date) et « Remplaçants et renforts » (nom, fonction, « Remplace Lauren » proposé en texte d'attente pour la personne
  // qu'on vient de décocher, une fiche créée au vol) — des puces de métier pour filtrer, et, en pied, qui sera prévenu (la règle du
  // déclencheur : prevenus, phrase). Le portrait de chacun est celui d'avatar() d'equipe.js : sa photo, sauf si elle est privée.
  // Le tableur, qui la pose (son poser : la fenêtre se ferme au clic à côté, au retour, au changement de mode), lui prête ses gestes :
  //   hote.poser(html, { label, cle, classe, origine }) → la fenêtre ; hote.fermer(rendre) ; hote.valider(f) (ce que fait un clic à côté) ;
  //   hote.placer() ; hote.enregistrer(ecarts) → une promesse (vrai si la base a pris) ; hote.etendre(ids) (la distribution sur d'autres dates)
  const PUCES = [...CATEGORIES, ['neutre', 'Autres']];
  function fenetre(td, d, hote, { initial = '', n = 1, jour = d.debut } = {}) {
    const sp = +d.spectacle_id, avant = ecartsDate(d.id);
    let ecarts = JSON.parse(JSON.stringify(avant)), filtre = '', dernierAbsent = null;
    const ecart = pid => ecarts.find(e => e.personne_id === pid);
    const enlever = e => ecarts.splice(ecarts.indexOf(e), 1);
    const tournee = [];
    distributionDe(sp).filter(x => x.en_tournee).forEach(x => { const f = fonctionDistribution(x) + (x.alternance ? `, ${x.alternance}` : ''), o = tournee.find(y => y.personne_id === x.personne_id); if (o) o.fonctions.push(f); else tournee.push({ personne_id: x.personne_id, fonctions: [f] }); });
    const ids = new Set(tournee.map(x => x.personne_id)), catDe = (pid, fonction = '') => metier(sp, pid, fonction) || 'neutre';
    const voulu = () => ecarts.map(e => ({ personne_id: e.personne_id, present: !!e.present, fonction: (e.fonction || '').trim(), note: (e.note || '').trim() || null }));
    const canon = xs => JSON.stringify((equipeVoulue({ spectacle_id: sp, equipe: xs }) || []).sort((a, b) => a.personne_id - b.personne_id));
    const pop = hote.poser(`<p class="tab-pop-titre" id="dfn-titre">Distribution · ${esc(jourCourt(jour))}${n > 1 ? ` <small>pour les ${n} séances de la date</small>` : ''}</p>
      <div class="dfn-puces" id="dfn-puces" role="group" aria-label="Montrer un métier"></div>
      <div class="tab-pop-corps" id="dfn-corps"></div>
      <div class="dfn-ajout"><span class="lib">Ajouter quelqu’un</span><div id="dfn-combo"></div></div>
      <p class="aide dfn-prevenus" id="dfn-prevenus" aria-live="polite"></p>
      <p class="aide">${spectacle(sp) ? `La distribution « en tournée » de ${esc(spectacle(sp).titre)} part par défaut ; ` : ''}ce qui change ici ne vaut que pour cette date. Entrée enregistre, Échap renonce.</p>
      <div class="tab-pop-pied"><button type="button" class="btn principal petit" data-eq-ok>Enregistrer</button><button type="button" class="btn petit" data-eq-etendre>Étendre à…</button><button type="button" class="btn petit lien" data-fermer>Annuler</button></div>`,
      { label: `Distribution du ${jourCourt(jour)}`, cle: 'tab-pop-distribution', classe: 'distribution', origine: 520 });
    pop.setAttribute('aria-labelledby', 'dfn-titre');
    const corps = $('#dfn-corps', pop), puces = $('#dfn-puces', pop), prevenusEl = $('#dfn-prevenus', pop);
    const resume = () => { const r = prevenus(d, equipeVoulue({ spectacle_id: sp, equipe: voulu() }) || []); prevenusEl.textContent = phrase(r) || 'Rien ne change pour l’équipe : personne n’est prévenu.'; };
    const cache = cat => (filtre && cat !== filtre ? ' hidden' : '');
    const dessiner = () => {
      const ajouts = ecarts.filter(e => e.present && !ids.has(e.personne_id));
      const absents = tournee.filter(x => ecart(x.personne_id)?.present === false);
      const cible = absents.some(x => x.personne_id === dernierAbsent) ? dernierAbsent : absents[0]?.personne_id;   // « Remplace X » vise la personne décochée à l'instant
      const avatarDe = (pid, cat) => `<span class="eq-av m-${cat}">${avatar(personne(pid), true)}</span>`;
      const membres = tournee.map(x => {
        const pid = x.personne_id, e = ecart(pid), part = e?.present !== false, nom = nomDe(personne(pid)), cat = catDe(pid);
        return `<li class="dfn-ligne${part ? '' : ' absent'}" data-cat="${cat}"${cache(cat)}>${avatarDe(pid, cat)}<label class="case"><input type="checkbox" data-eqd-part="${pid}"${part ? ' checked' : ''}> ${esc(nom)}</label>
          <span class="compte eq-badge">${esc(x.fonctions.join(', '))}${part ? '' : ' · ne part pas sur cette date'}</span>${part ? telEquipe(pid) : ''}
          ${part ? `<input type="text" class="eq-fonction" data-eqd-fonction-membre="${pid}" value="${esc(e?.fonction || '')}" placeholder="Fonction sur cette date (sinon celle de la distribution)" aria-label="Fonction de ${esc(nom)} sur cette date"><input type="text" class="eq-note" data-eqd-note="${pid}" value="${esc(e?.note || '')}" placeholder="Note pour cette date (train de 14h12…)" aria-label="Note pour ${esc(nom)} sur cette date">` : ''}</li>`;
      }).join('');
      const renforts = ajouts.map(e => {
        const pid = e.personne_id, nom = nomDe(personne(pid)), cat = catDe(pid, e.fonction);
        return `<li class="dfn-ligne" data-cat="${cat}" data-eqd-ajout="${pid}"${cache(cat)}>${avatarDe(pid, cat)}<a class="eq-nom" href="#/equipe/${pid}" title="Sa fiche">${esc(nom)}</a>${telEquipe(pid)}
          <span class="eq-fonction-zone"><input type="text" data-eqd-fonction value="${esc(e.fonction || '')}" placeholder="Renfort régie, remplaçant…" aria-label="Fonction de ${esc(nom)} sur cette date">${cible ? `<button type="button" class="btn lien petit eq-remplace" data-eqd-remplace="${cible}"${(e.fonction || '').trim() ? ' hidden' : ''}>Remplace ${esc(nomDe(personne(cible)))}</button>` : ''}</span>
          <input type="text" class="eq-note" data-eqd-note="${pid}" value="${esc(e.note || '')}" placeholder="Note (train, hébergement…)" aria-label="Note pour ${esc(nom)} sur cette date">
          <button type="button" class="btn petit danger" data-eqd-retirer title="Retirer de cette date" aria-label="Retirer ${esc(nom)} de cette date">✕</button></li>`;
      }).join('');
      corps.innerHTML = `<h4 class="lib" id="dfn-h-tournee">En tournée</h4>${tournee.length ? `<ul class="dfn-liste" aria-labelledby="dfn-h-tournee">${membres}</ul>` : `<p class="aide">${spectacle(sp) ? 'Personne n’est « en tournée » dans la distribution de ce spectacle (Spectacles → Distribution).' : 'Choisissez d’abord le spectacle.'}</p>`}
        <h4 class="lib" id="dfn-h-renforts">Remplaçants et renforts</h4>${ajouts.length ? `<ul class="dfn-liste" aria-labelledby="dfn-h-renforts">${renforts}</ul>` : '<p class="aide">Personne pour cette date.</p>'}`;
      // les puces de métier : celles dont quelqu'un est là (« Tous » les rend toutes)
      const cats = new Set([...tournee.map(x => catDe(x.personne_id)), ...ajouts.map(e => catDe(e.personne_id, e.fonction))]);
      if (filtre && !cats.has(filtre)) filtre = '';
      puces.hidden = cats.size < 2;
      puces.innerHTML = [['', 'Tous'], ...PUCES.filter(([k]) => cats.has(k))].map(([k, l]) => `<button type="button" class="dfn-puce${k ? ` m-${k}` : ''}" data-dfn-metier="${k}" aria-pressed="${filtre === k}">${esc(l)}</button>`).join('');
      comboPersonne($('#dfn-combo', pop), { placeholder: 'Nom de la personne…', creer: true, avant: distributionDe(sp).map(x => x.personne_id),
        exclure: pid => (ids.has(pid) && ecart(pid)?.present !== false) || ajouts.some(e => e.personne_id === pid),
        onChoix: pid => ajouter(pid), onCreer: async texte => { try { const p = await creerPersonne(texte); ajouter(p.id); annoncer(`Fiche créée pour ${nomDe(p)} : complétez-la dans Équipe.`); } catch (e) { erreur(e, 'Fiche non créée'); } } });
      resume();
      hote.placer();
    };
    const ajouter = (pid, fonction = '') => {
      const x = ecart(pid);
      if (x && x.present === false) { enlever(x); if (fonction) ecarts.push({ personne_id: pid, present: true, fonction, note: x.note ?? null }); }   // quelqu'un de la tournée qu'on avait décoché : il repart
      else if (!x) ecarts.push({ personne_id: pid, present: true, fonction, note: null });
      dessiner();
      $(`[data-eqd-ajout="${pid}"] [data-eqd-fonction]`, pop)?.focus();
    };
    const valider = () => {
      const v = voulu(), change = canon(v) !== canon(avant);
      hote.fermer();
      return change ? hote.enregistrer(v) : Promise.resolve(true);
    };
    hote.valider(valider);
    pop.addEventListener('change', e => {
      const t = e.target; if (t.dataset.eqdPart === undefined) return;
      const pid = +t.dataset.eqdPart, x = ecart(pid);
      if (t.checked) { if (x && ((x.note || '').trim() || (x.fonction || '').trim())) x.present = true; else if (x) enlever(x); }
      else { dernierAbsent = pid; if (x) x.present = false; else ecarts.push({ personne_id: pid, present: false, fonction: '', note: null }); }
      dessiner();
      $(`[data-eqd-part="${pid}"]`, pop)?.focus();
    });
    pop.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.eqdNote !== undefined) {   // la note : pour la tournée, une ligne « présente » qui ne porte que la note ; vidée, elle s'en va
        const pid = +t.dataset.eqdNote, v = t.value; let x = ecart(pid);
        if (!x && v.trim()) { x = { personne_id: pid, present: true, fonction: '', note: v }; ecarts.push(x); }
        else if (x) { x.note = v; if (!v.trim() && x.present && !(x.fonction || '').trim() && ids.has(pid)) enlever(x); }
      } else if (t.dataset.eqdFonctionMembre !== undefined) {   // la fonction d'un membre de la tournée : elle remplace celle de la distribution
        const pid = +t.dataset.eqdFonctionMembre, v = t.value; let x = ecart(pid);
        if (!x && v.trim()) { x = { personne_id: pid, present: true, fonction: v, note: null }; ecarts.push(x); }
        else if (x) { x.fonction = v; if (!v.trim() && x.present && !(x.note || '').trim()) enlever(x); }
      } else if (t.dataset.eqdFonction !== undefined) {   // la fonction d'un renfort
        const l = t.closest('[data-eqd-ajout]'), x = ecart(+l.dataset.eqdAjout);
        if (x) x.fonction = t.value;
        const lien = $('[data-eqd-remplace]', l); if (lien) lien.hidden = !!t.value.trim();
      } else return;
      resume();
    });
    pop.addEventListener('click', e => {
      const puce = e.target.closest('[data-dfn-metier]');
      if (puce) { filtre = filtre === puce.dataset.dfnMetier ? '' : puce.dataset.dfnMetier; dessiner(); $(`[data-dfn-metier="${filtre}"]`, pop)?.focus(); return; }
      const r = e.target.closest('[data-eqd-remplace]');
      if (r) {   // « Remplace X » remplit la fonction du renfort et vise la personne décochée
        const l = r.closest('[data-eqd-ajout]'), x = ecart(+l.dataset.eqdAjout), champ = $('[data-eqd-fonction]', l);
        if (x) { x.fonction = `Remplace ${nomDe(personne(+r.dataset.eqdRemplace))}`; champ.value = x.fonction; r.hidden = true; resume(); champ.focus(); }
        return;
      }
      const b = e.target.closest('[data-eqd-retirer]');
      if (b) { const x = ecart(+b.closest('[data-eqd-ajout]').dataset.eqdAjout); if (x) enlever(x); dessiner(); return; }
      if (e.target.closest('[data-eq-ok]')) return valider();
      if (e.target.closest('[data-fermer]')) return hote.fermer();
      if (e.target.closest('[data-eq-etendre]')) { const garder = voulu(); valider().then(ok => { if (ok) hote.etendre(equipeDate(sp, equipeVoulue({ spectacle_id: sp, equipe: garder }) || []).map(x => x.personne_id)); }); }
    });
    pop.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input[type=text]') && !e.target.closest('.combo')) { e.preventDefault(); valider(); } });
    dessiner();
    const q = $('#dfn-combo input', pop);
    q.focus();
    if (initial) { q.value = initial; q.dispatchEvent(new Event('input')); }
  }

  // ———— la matrice : le mode Distribution du tableur
  // colonnes(f, lignes, hote) : une colonne de type 'presence' par personne en tournée du spectacle (ou des spectacles) à l'écran, puis par
  // renfort rencontré sur ses dates, groupées par métier (le bandeau du métier, le portrait, le prénom, le rôle dessous, « téléphone ? »
  // quand il manque, le bouton ⋯ du menu). lignes : les lignes du tableur ({ d }) ; f.spectacle : le spectacle filtré (sinon ceux des
  // lignes, qui se suivent par spectacle). hote : { redessiner } (la matrice se redessine quand les indisponibilités arrivent) et
  // { reglerPeriode(spId, pid) }. La même colonne (le même objet) est rendue tant que son en-tête ne change pas : le tableur compare
  // les colonnes d'un dessin à l'autre.
  const memo = new Map();
  let alertesChargees = false;
  const joursDe = d => { const js = [...new Set(repsDe(d.id).map(r => r.jour).filter(Boolean))].sort(); if (js.length) return js; const out = []; for (let j = d.debut, i = 0; j && j <= finDe(d) && i < 400; i++, j = plusJours(j, 1)) out.push(j); return out; };
  // les indisponibilités à venir d'une personne sur une date (GARDEFOUS.indisposDe : vide avant la lecture, sans le cinquième script, et pour une date passée)
  function indispos(d, pid) {
    if (typeof GARDEFOUS === 'undefined' || !GARDEFOUS.indisposDe || finDe(d) < AUJ) return [];
    return GARDEFOUS.indisposDe(pid, joursDe(d));
  }
  const nomCourt = p => (p?.prenom || nomDe(p) || '').trim();
  const roleDe = (sp, pid, fonction) => {
    const l = E.distributions.find(y => y.spectacle_id === sp && y.personne_id === pid && y.role);
    if (l) return l.role;
    const m = distributionDe(sp).find(y => y.personne_id === pid);
    return m ? fonctionDistribution(m) : fonction || 'renfort';
  };
  function caseHtml(d, pid, nom) {
    const v = etat(d, pid), jour = jourSansAn(d.debut);
    if (v === 'grise') return `<span class="mat-case grise" title="Date ${d.statut === 'annulee' ? 'annulée' : 'reportée'} : pas d’équipe à régler"><span class="sr">${esc(`${nom} · ${jour} : ${DIT.grise}`)}</span></span>`;
    const al = v === 'part' || v === 'remplacant' ? indispos(d, pid) : [], passee = finDe(d) < AUJ && (v === 'part' || v === 'remplacant');
    const motif = al.length ? `indisponible${al[0].motif ? ` (${al[0].motif})` : ''}` : '';
    const dit = `${nom} · ${jour} : ${DIT[v] || 'pas sur cette date'}${motif ? `, ${motif}` : ''}`;
    const titre = motif ? `${nom} est ${motif} ${al[0].jours.length > 1 ? 'ces jours-là' : 'ce jour-là'}` : passee ? 'Date passée : les indisponibilités ne se regardent que pour les dates à venir' : '';
    return `<button type="button" class="mat-case ${v || 'vide'}" tabindex="-1" aria-pressed="${v === 'part' || v === 'remplacant'}" aria-label="${esc(dit)}"${titre ? ` title="${esc(titre)}"` : ''}><span aria-hidden="true">${GLYPHE[v]}</span>${al.length ? '<i class="mat-alerte" aria-hidden="true"></i>' : ''}</button>`;
  }
  function colonnes(f, lignes, hote = {}) {
    const ds = (lignes || []).map(x => x.d);
    const sps = f?.spectacle ? [+f.spectacle] : [...new Set(ds.map(d => +d.spectacle_id))];
    if (E.equipeInstallee && E.sql5 !== false && !alertesChargees && typeof GARDEFOUS !== 'undefined' && GARDEFOUS.charger) { alertesChargees = true; GARDEFOUS.charger().then(() => hote.redessiner?.()); }
    // qui : la tournée de chaque spectacle, puis les renforts rencontrés sur les dates à l'écran
    const gens = new Map();
    sps.forEach(sp => distributionDe(sp).filter(x => x.en_tournee).forEach(x => { if (!gens.has(x.personne_id)) gens.set(x.personne_id, { pid: x.personne_id, sp, renfort: false, fonction: '' }); }));
    ds.forEach(d => E.equipes.filter(e => e.date_id === d.id && e.present).forEach(e => { if (!gens.has(e.personne_id)) gens.set(e.personne_id, { pid: e.personne_id, sp: +d.spectacle_id, renfort: true, fonction: e.fonction || '' }); }));
    const rang = c => rangMetier(c === 'neutre' ? null : c);
    const liste = [...gens.values()].filter(g => personne(g.pid)).map((g, i) => ({ ...g, i, cat: metier(g.sp, g.pid, g.fonction) || 'neutre' }))
      .sort((a, b) => rang(a.cat) - rang(b.cat) || a.renfort - b.renfort || a.i - b.i);
    return liste.map((g, j) => {
      const p = personne(g.pid), nom = nomDe(p) || 'Quelqu’un', role = roleDe(g.sp, g.pid, g.fonction), tel = !!priveeDe(g.pid)?.telephone;
      const debutCat = j === 0 || liste[j - 1].cat !== g.cat;
      const sig = [g.pid, nom, g.cat, role, tel ? 1 : 0, debutCat ? 1 : 0, p.photo || ''].join('|');
      const cle = `p${g.pid}|${sig}|${sps.join(',')}`;
      if (memo.has(cle)) return memo.get(cle);
      const col = {
        k: `p${g.pid}`, l: nom, niveau: 'date', type: 'presence', pid: g.pid, classe: `mat m-${g.cat}${debutCat ? ' mat-debut' : ''}`, sig, largeur: 96, icone: null, rang: 500 + j, horsOrigine: false, jeux: [], confidentiel: false,
        titre: `${nom} · ${role} : une case par date, un clic ou Espace la bascule`,
        val: x => etat(x.d, g.pid), texte: x => DIT[etat(x.d, g.pid)] || '', copie: x => DIT[etat(x.d, g.pid)] || '', exp: x => DIT[etat(x.d, g.pid)] || '',
        html: x => caseHtml(x.d, g.pid, nom),
        // (un texte collé : « part » sur une personne hors de la tournée la pose en remplaçante, « ne part pas » la laisse hors de la date ; « remplaçant » sur quelqu'un de la tournée n'a pas de sens)
        lire: (t, x) => { const v = lireEtat(t); if (v === undefined || !x?.d) return v; const tournee = enTourneeDans(+x.d.spectacle_id, g.pid); return tournee ? (v === 'remplacant' ? undefined : v) : v === 'part' ? 'remplacant' : v === 'absent' ? '' : v; }, vider: true,
        ecrire: (F, x, v) => { F.equipe = poserEtat(x.d, F.equipe || [], g.pid, v); },
        suivant: x => suivant(x.d, g.pid), defaut: x => (enTourneeDans(+x.d.spectacle_id, g.pid) ? 'part' : ''),
        fige: x => (horsJeu(x.d) ? `Date ${x.d.statut === 'annulee' ? 'annulée' : 'reportée'} : il n’y a plus d’équipe à régler` : ''),
        viser: () => '#d-equipe',
        // ce que ce geste ferait savoir à l'équipe (la règle du déclencheur, comme la fenêtre)
        prevenir: (x, v) => phrase(prevenus(x.d, equipeVoulue({ spectacle_id: +x.d.spectacle_id, equipe: poserEtat(x.d, ecartsDate(x.d.id), g.pid, v) }) || [])),
        // le total du bas : sur combien de dates elle est de la partie
        total: xs => xs.filter(x => { const v = etat(x.d, g.pid); return v === 'part' || v === 'remplacant'; }).length,
        entete: () => `<span class="mat-tete"><span class="mat-bandeau" aria-hidden="true"></span>${avatar(p, true)}<span class="mat-nom">${esc(nomCourt(p))}</span><small class="mat-role">${esc(role)}</small>`
          + `${tel ? '' : `<a class="manque-tel mat-tel" href="#/equipe/${g.pid}" title="Téléphone manquant : compléter sa fiche">téléphone ?</a>`}`
          + `<button type="button" class="mat-menu" data-mat-menu aria-haspopup="menu" aria-label="Menu de ${esc(nom)}" title="Régler sa période…">⋯</button></span>`,
        // le menu de l'en-tête : « Régler sa période » (un par spectacle de la grille où elle a une ligne de distribution ; sans aucune, un renfort
        // d'hier qu'on remet dans la distribution, un par spectacle de la grille)
        actions: () => { const avec = sps.filter(sp => E.distributions.some(y => y.spectacle_id === sp && y.personne_id === g.pid)); return (avec.length ? avec : sps).map(sp => ({ libelle: sps.length > 1 ? `Régler sa période · ${spectacle(sp)?.titre || ''}` : 'Régler sa période', detail: 'les dates où elle part', faire: () => hote.reglerPeriode?.(sp, g.pid) })); },
      };
      memo.set(cle, col);
      if (memo.size > 400) memo.delete(memo.keys().next().value);
      return col;
    });
  }

  const dit = v => DIT[v] || 'pas sur cette date';
  return { cellule, avatarMini, metier, prevenus, phrase, impact, datesQuiChangent, fenetre, colonnes, etat, suivant, poserEtat, lireEtat, dit, joursDe };
})();
