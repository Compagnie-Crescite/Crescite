'use strict';
/* La distribution à l'écran : qui joue, qui part, sur chaque date, et ce qu'un changement de distribution fait aux dates.
   Chargé après equipe.js (dont il lit l'état et les outils : E, personne, spectacle, nomDe, priveeDe, initiales,
   distributionDe, categoriesDe, equipeDate, equipeDeLaDate, enTourneeDans, CATEGORIES, rangCategorie, finDe, jourEntier, AUJ)
   et du script principal d'index.html ($, esc), avant planning.js. Il ne garde aucun état
   et n'écrit rien dans la base : les écritures restent celles d'equipe.js (ecrireEcarts, retirerDeDistribution…).
   - la cellule d'une date (DISTRIBUTION.cellule) : des pastilles rondes de 24 px aux initiales de chacun, qui se chevauchent,
     rangées par métier avec un liseré de la couleur du métier (jeu prune, création indigo, technique ambre, production
     sauge) ; le nom et le rôle en infobulle (« Camille Essai · Bérénice ») ; un remplaçant ou un renfort a un anneau
     pointillé ambre ; qui ne part pas est gris et barré ; « −n » (corail) compte ceux de la tournée qui ne partent pas,
     « +n » ceux que la place ne laisse pas voir. Jamais de photo dans la grille : des initiales, de quoi garder les portraits
     privés privés (avatar() d'equipe.js poserait un background-image dès que la photo n'est pas privée, et rend une
     chaîne : on ne lui « ajoute » pas une classe). Du texte et du CSS, pas un SVG par case : 300 lignes se dessinent vite.
     La cellule est une chaîne de HTML prête pour le tableur (qui s'y branche plus tard) ; elle se vérifie à part ;
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
   DISTRIBUTION.datesQuiChangent(spId, pid, sens, ligne)   (les dates dont l'équipe change : le compte de l'impact, utile à la matrice) */
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

  return { cellule, avatarMini, metier, prevenus, phrase, impact, datesQuiChangent };
})();
