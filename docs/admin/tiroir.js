'use strict';
/* Les fiches en tiroir : une date, un lieu, une personne, une demande de devis, une piste de diffusion s'ouvrent dans un
   panneau qui glisse à droite, sans quitter la page (le tableau de bord, le Kanban, le planning, la recherche, une autre
   fiche). Les tiroirs s'empilent (une date → son lieu → …) ; Échap, le voile ou « ← » ferment le dernier ; « Pleine page »
   va à l'adresse de la fiche (l'adresse de la page, elle, reste la sienne, partageable). Un lien vers une fiche s'ouvre en
   tiroir quand la page n'a pas déjà la place de cette fiche (dans Représentations, une date s'ouvre à côté de la liste,
   comme avant) ; Ctrl, Maj, Alt ou le bouton du milieu laissent faire le navigateur. La fiche est la même que dans sa
   rubrique (editeurDate, editeurLieu, editeurPersonne, editeurDevis) : ses enregistrements redessinent le tiroir
   (redessinerFiche), ses suppressions le ferment (quitterFiche), ses menus et « Annuler » marchent. Une piste de
   diffusion se lit en résumé, avec ses actions. Changer de page ferme les tiroirs (après la question des modifications
   non enregistrées, comme pour une fiche). Chargé après corbeille.js ; sans les éditeurs (equipe.js absent), le lien
   navigue comme avant.
   Un tiroir a son adresse : la page garde la sienne (#/accueil…), le tiroir s'ajoute dans ?tiroir=lieux/5 (plusieurs :
   ?tiroir=representations/101,lieux/5). Chaque tiroir ouvert est un pas de l'historique : le bouton précédent du
   navigateur referme le dernier, le suivant le rouvre ; l'adresse se recharge et se partage entre administrateurs (la
   page, puis ses tiroirs). Fermer un tiroir à la main revient d'un pas. Le titre de l'onglet nomme le tiroir ouvert ;
   son en-tête, à l'ordinateur, la rubrique de sa fiche en lien (« Lieux › Théâtre de Caen », le fil d'Ariane).
   À l'ordinateur (pointeur précis, 641 px et plus), son bord gauche se tire (FENETRES.poignee, admin/fenetres.js : de 480 px à
   l'écran moins 80 px, pour que le voile reste cliquable ; double-clic ou Entrée : la taille d'origine) et la largeur se
   garde avec le compte (la préférence fenetres.tiroir). Un bouton « ⋯ » de l'en-tête (et le clic droit, Maj+F10 : le menu de
   menus.js) propose « Taille d'origine », « Plus large » (+ 160 px) et « Pleine page ». Quand le tiroir du dessus est plus
   large que celui qu'il couvre, celui-ci recule d'autant de plus que ses 28 px : recaler() le redit à l'ouverture, à la
   fermeture et à chaque pas de la poignée. Au téléphone, le tiroir garde sa largeur d'écran (LARGEUR).
   TIROIR.ouvrir(href, { viser, depuis, apres })   TIROIR.fermer()   TIROIR.fermerTout()   TIROIR.ouvert()   TIROIR.racine()
   TIROIR.redessiner(id)                     TIROIR.peut(href) : ce lien s'ouvrirait-il en tiroir ici ?
   TIROIR.restaurer() (à l'ouverture de l'administration)   TIROIR.surAdresse() (index.html, à chaque changement d'adresse)
   TIROIR.titre() : le nom du tiroir du haut et sa rubrique, pour le titre de l'onglet
   Les options d'ouvrir : viser (le sélecteur du champ à allumer dans la fiche), depuis (d'où l'on vient : le nœud qui reprend le focus à
   la fermeture, ou une fonction rappelée alors — quand la page derrière s'est redessinée, l'ancien nœud n'est plus dans le document :
   la fonction retrouve la case et lui rend le focus), apres (une fonction rappelée après chaque enregistrement de la fiche et à sa
   fermeture, pour que la page derrière se redessine sans attendre le temps réel : le tableur s'en sert, pour la date ouverte
   depuis une de ses cases). */
const TIROIR = (() => {
  const pile = [];
  const LARGEUR = 'min(780px, 94vw)';     // (la valeur du téléphone ; à l'ordinateur, la largeur est un nombre : defaut() ou la valeur gardée)
  // --tiroir-largeur ne sert qu'au tiroir : déclarée sans héritage, la tirer ne refait pas le style des centaines d'éléments de la fiche
  // (trois fois moins de temps par image au bord gauche) ; un navigateur sans CSS.registerProperty la garde comme une variable ordinaire
  try { CSS.registerProperty({ name: '--tiroir-largeur', syntax: '<length>', inherits: false, initialValue: '760px' }); } catch (e) { /* déjà déclarée, ou non reconnue */ }
  const FEN = () => (typeof FENETRES !== 'undefined' && FENETRES.actif() ? FENETRES : null);
  const defaut = () => Math.min(780, Math.round(innerWidth * .94));
  const existe = f => typeof window[f] === 'function';
  // les fiches qui savent s'ouvrir en tiroir : leur adresse, la zone qu'elles attendent, comment les dessiner
  const FICHES = [
    { genre: 'date', nom: 'Date', re: /^#\/representations\/(\d+)$/, zone: 'ed-date', href: id => `#/representations/${id}`, peut: () => existe('editeurDate'), dessiner: id => editeurDate(id),
      titre: id => { const d = E.dates.find(x => x.id === id); return d ? `${spectacle(d.spectacle_id)?.titre || 'Date'} · ${jourCourt(d.debut)}` : 'Date'; } },
    { genre: 'lieu', nom: 'Lieu', re: /^#\/lieux\/(\d+)$/, zone: 'ed-lieu', href: id => `#/lieux/${id}`, peut: () => existe('editeurLieu'), dessiner: id => editeurLieu(id), titre: id => lieuTexte(lieu(id)) || 'Lieu' },
    { genre: 'personne', nom: 'Personne', re: /^#\/equipe\/(\d+)$/, zone: 'ed-personne', href: id => `#/equipe/${id}`, peut: () => existe('editeurPersonne') && E.equipeInstallee, dessiner: id => editeurPersonne(id), titre: id => nomDe(personne(id)) || 'Personne' },
    { genre: 'devis', nom: 'Demande de devis', re: /^#\/diffusion\/devis\/(\d+)$/, zone: 'ed-devis', href: id => `#/diffusion/devis/${id}`, peut: () => existe('editeurDevis') && E.ideale, dessiner: id => editeurDevis(id), titre: id => (E.devis || []).find(x => x.id === id)?.structure_nom || 'Demande' },
    { genre: 'piste', nom: 'Opportunité de diffusion', re: /^#\/diffusion\/piste\/(\d+)$/, zone: 'ed-piste', href: id => `#/diffusion/piste/${id}`, pleine: () => '#/diffusion', parent: () => '#/diffusion', peut: () => E.ideale, dessiner: id => dessinerPiste(id), titre: id => (E.prospects || []).find(x => x.id === id)?.structure || 'Opportunité' },
  ];
  // l'en-tête d'un tiroir dit où est sa fiche : à l'ordinateur, les niveaux au-dessus en liens (« Lieux › », le fil
  // d'Ariane d'index.html, niveauxAuDessus), puis son nom ; au téléphone, son genre (« Lieu »), le ← y ramène
  const filDe = (f, id) => {
    const xs = typeof niveauxAuDessus === 'function' ? niveauxAuDessus(f.parent ? f.parent(id) : f.href(id).replace(/\/\d+$/, '')) : [];
    return xs.length ? `<nav class="tg-fil" aria-label="Fil d’Ariane">${xs.map(x => `<a href="${esc(x.href)}">${esc(x.nom)}</a>`).join('<span class="tg-sep" aria-hidden="true">›</span>')}<span class="tg-sep" aria-hidden="true">›</span></nav>` : '';
  };
  const ficheDe = href => { for (const f of FICHES) { const m = (href || '').match(f.re); if (m) return { f, id: +m[1] }; } return null; };
  // ce lien s'ouvrirait-il en tiroir ici ? Oui s'il mène à une fiche connue, que la page n'a pas sa place (#ed-date…) et
  // que la fiche n'est pas déjà celle du dernier tiroir
  function peut(href) {
    const x = ficheDe(href); if (!x || !x.f.peut()) return false;
    const app = document.getElementById('app');
    if (app && app.querySelector(`#${x.f.zone}`)) return false;
    const haut = pile[pile.length - 1];
    return !(haut && haut.genre === x.f.genre && haut.id === x.id);
  }
  const ouvert = () => pile.length > 0;
  const racine = () => (pile.length ? pile[pile.length - 1].el : null);
  // ---- l'adresse des tiroirs : ?tiroir=…, et l'état de l'historique { tiroirs, sur } (la page sous les tiroirs)
  const cleDe = t => t.f.href(t.id).replace(/^#\//, '');
  const liste = () => pile.map(cleDe);
  const urlAvec = xs => {
    const q = new URLSearchParams(location.search);
    if (xs.length) q.set('tiroir', xs.join(',')); else q.delete('tiroir');
    const s = q.toString().replace(/%2F/gi, '/').replace(/%2C/gi, ',');
    return `${location.pathname}${s ? `?${s}` : ''}${location.hash}`;
  };
  // pas : le rang dans l'historique (index.html, noterAdresse) ; un tiroir ouvert prend le rang suivant
  const etat = (pas = 0) => ({ tiroirs: liste(), sur: location.hash, n: (typeof E.n === 'number' ? E.n : 0) + pas });
  // les tiroirs que veut cette entrée de l'historique (le précédent, le suivant) : seulement sur la page où ils s'ouvraient
  const voulus = () => { const st = history.state; return st && Array.isArray(st.tiroirs) && st.sur === location.hash ? st.tiroirs.filter(x => typeof x === 'string') : []; };
  const noter = () => { if (typeof noterAdresse === 'function') noterAdresse(); if (typeof majTitreAdmin === 'function') majTitreAdmin(); };
  let ignorerPop = false;
  function ouvrir(href, { viser: cible = '', depuis = null, apres = null, histoire = true } = {}) {
    const x = ficheDe(href); if (!x || !x.f.peut()) { location.hash = href; return null; }
    const { f, id } = x;
    if (typeof noterRecente === 'function') noterRecente(f.href(id));     // (la recherche rapide la proposera, champ vide)
    const haut = pile[pile.length - 1];
    if (haut && haut.genre === f.genre && haut.id === id) { if (cible) { visee = cible; viser(); } return haut; }
    if (!pile.length) document.documentElement.classList.add('tiroir-ouvert');
    const t = { genre: f.genre, id, f, saleAvant: E.sale, depuis: depuis || document.activeElement, apres, el: null };
    E.sale = false;
    const voile = document.createElement('div'); voile.className = 'tiroir-voile'; voile.dataset.tiroirFermer = '';
    const el = document.createElement('aside');
    el.className = 'tiroir'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', f.nom);
    el.style.setProperty('--tiroir-largeur', FEN() ? `${FENETRES.taille('tiroir') ?? defaut()}px` : LARGEUR);
    el.innerHTML = `<header class="tiroir-tete"><button type="button" class="btn petit" data-tiroir-fermer title="Fermer (Échap)" aria-label="Fermer">←</button>
      <span class="tiroir-fil"><span class="tiroir-genre"><span class="tg-nom">${esc(f.nom)}</span>${filDe(f, id)}</span><span class="tiroir-titre"></span></span>
      <a class="btn petit" data-tiroir-pleine href="${esc((f.pleine || f.href)(id))}" title="Ouvrir à sa place, dans sa rubrique">Pleine page</a>${FEN() ? `
      <button type="button" class="btn petit" data-gestes-menu aria-haspopup="menu" title="Taille du tiroir"><span aria-hidden="true">⋯</span><span class="sr">Taille du tiroir</span></button>` : ''}
      <button type="button" class="btn petit" data-tiroir-fermer aria-label="Fermer">✕</button></header>
      <div class="tiroir-corps"><section class="editeur" id="${f.zone}"></section></div>`;
    t.el = el; t.voile = voile; t.pousse = histoire;
    pile.push(t);
    document.body.append(voile, el);
    // la poignée du bord gauche, juste après « ← » dans l'ordre du focus ; chaque pas de la poignée redit le recul des tiroirs couverts
    FEN()?.poignee(el, { cle: 'tiroir', axe: 'x', bord: 'gauche', libelle: 'Largeur du tiroir', apres: $('[data-tiroir-fermer]', el), defaut, defautVivant: true,
      ecrire: v => { el.style.setProperty('--tiroir-largeur', `${v}px`); recaler(); } });
    pile.slice(0, -1).forEach(p => { p.el.setAttribute('aria-hidden', 'true'); p.el.inert = true; });
    recaler();
    dessiner(t);
    requestAnimationFrame(() => { el.classList.add('la'); voile.classList.add('la'); });
    if (cible) { visee = cible; viser(); } else requestAnimationFrame(() => $('[data-tiroir-fermer]', el)?.focus({ preventScroll: true }));
    // un pas de l'historique : l'adresse de la page, et le tiroir dans ?tiroir=…
    if (histoire) history.pushState(etat(1), '', urlAvec(liste()));
    noter();
    return t;
  }
  // le recul des tiroirs couverts : 28 px par niveau, plus la différence de largeur quand un tiroir qui le recouvre est plus large
  // (sans quoi son bord disparaîtrait derrière lui : on compte le plus large de ceux du dessus, pas seulement le dernier) ;
  // toujours écrit en ligne, même à largeurs égales. Un seul tiroir : rien n'est couvert, rien à mesurer.
  function recaler() {
    if (pile.length < 2) return;
    const largeurs = pile.map(p => p.el.offsetWidth);          // (toutes les lectures d'abord, puis les écritures : une seule mise en page)
    let plus = 0;
    for (let i = pile.length - 2; i >= 0; i--) {
      plus = Math.max(plus, largeurs[i + 1]);
      pile[i].el.style.setProperty('--tiroir-recul', `${(pile.length - 1 - i) * 28 + Math.max(0, plus - largeurs[i])}px`);
    }
  }
  function dessiner(t) {
    try { t.f.dessiner(t.id); } catch (e) { console.error(e); const z = $(`#${t.f.zone}`, t.el); if (z) z.innerHTML = '<div class="vide bloc">Cette fiche ne s’ouvre pas ici.</div>'; }
    const titre = $('.tiroir-titre', t.el); if (titre) titre.textContent = t.f.titre(t.id);
    const a = $('[data-tiroir-pleine]', t.el); if (a) a.setAttribute('href', (t.f.pleine || t.f.href)(t.id));
    marquerSale(false);
  }
  // après un enregistrement (redessinerFiche) : la même fiche, redessinée ; une fiche créée dans le tiroir (une date dupliquée) prend son numéro
  function redessiner(id = null) {
    const t = pile[pile.length - 1]; if (!t) return;
    if (id != null && Number.isFinite(+id)) t.id = +id;
    dessiner(t);
    rappeler(t);
  }
  // la page derrière veut savoir que la fiche a changé (apres) ; une erreur de sa part ne touche pas à la fiche
  const rappeler = t => { try { if (typeof t.apres === 'function') t.apres(); } catch (e) { console.error(e); } };
  // fermer le tiroir du haut ; des modifications pas enregistrées : la question d'abord (une boîte de la charte), et le tiroir
  // se ferme si l'on quitte. histoire : l'historique suit (fermé à la main, on revient du pas que le tiroir avait fait)
  function fermer({ demander = true, histoire = true } = {}) {
    const t = pile[pile.length - 1]; if (!t) return false;
    if (demander && typeof saisieEnCours === 'function' && saisieEnCours(t.el)) {
      partirSansPerdre({ titre: 'Fermer sans enregistrer ?', ok: 'Fermer sans enregistrer', dans: t.el }).then(oui => { if (oui && pile[pile.length - 1] === t) fermer({ demander: false, histoire }); });
      return false;
    }
    pile.pop();
    t.el.classList.remove('la'); t.voile.classList.remove('la');
    const retirer = () => { t.el.remove(); t.voile.remove(); };
    if (typeof GESTES !== 'undefined' && GESTES.reduit()) retirer(); else setTimeout(retirer, 220);
    E.sale = t.saleAvant;
    const haut = pile[pile.length - 1];
    if (haut) { haut.el.style.removeProperty('--tiroir-recul'); haut.el.removeAttribute('aria-hidden'); haut.el.inert = false; recaler(); }
    else document.documentElement.classList.remove('tiroir-ouvert');
    marquerSale(E.sale);
    rappeler(t);
    // (depuis est une fonction quand le nœud d'origine n'existera plus à la fermeture : elle rend le focus elle-même, ou rend un nœud)
    const d = typeof t.depuis === 'function' ? (() => { try { return t.depuis(); } catch (e) { console.error(e); return null; } })() : t.depuis;
    if (d && d.isConnected && typeof d.focus === 'function') d.focus({ preventScroll: true }); else if (typeof t.depuis !== 'function') haut?.el.querySelector('[data-tiroir-fermer]')?.focus({ preventScroll: true });
    if (histoire) {
      const st = history.state;
      // l'entrée présente est celle que ce tiroir avait ajoutée : on en revient (le précédent du navigateur, sans rien redessiner)
      if (t.pousse && st && Array.isArray(st.tiroirs) && st.sur === location.hash && st.tiroirs.length === pile.length + 1) { ignorerPop = true; history.back(); }
      else history.replaceState(etat(), '', urlAvec(liste()));
    }
    noter();
    return true;
  }
  function fermerTout({ demander = false, histoire = true } = {}) { while (pile.length) { if (!fermer({ demander, histoire })) return false; } return true; }
  // les tiroirs suivent l'entrée de l'historique : ceux en trop se ferment (la question d'abord, s'il y a des modifications),
  // ceux qui manquent se rouvrent
  function accorder(xs) {
    const actuels = liste();
    let n = 0; while (n < actuels.length && n < xs.length && actuels[n] === xs[n]) n++;
    const aFermer = pile.slice(n);
    if (aFermer.length && aFermer.some((t, i) => (i === aFermer.length - 1 && E.sale) || (typeof GESTES !== 'undefined' && GESTES.saisie(t.el)))) {
      // on revient où l'on était (le tiroir reste), puis la question ; « Fermer sans enregistrer » refait le pas
      const vers = location.search + location.hash, pas = revenir();
      partirSansPerdre({ titre: 'Fermer sans enregistrer ?', ok: 'Fermer sans enregistrer', dans: aFermer[aFermer.length - 1].el }).then(oui => { if (oui) { E.sale = false; refaire(pas, vers); } });
      return;
    }
    while (pile.length > n) fermer({ demander: false, histoire: false });
    xs.slice(n).forEach(x => { const h = `#/${x}`; if (ficheDe(h)?.f.peut()) { const t = ouvrir(h, { histoire: false }); if (t) t.pousse = true; } });
    const reste = liste();
    if (reste.join(',') !== xs.join(',')) history.replaceState(etat(), '', urlAvec(reste));
    noter();
  }
  // à l'ouverture de l'administration : les tiroirs de l'adresse (un lien partagé, un rechargement), par-dessus la page
  function restaurer() {
    const q = new URLSearchParams(location.search).get('tiroir');
    if (!q) return;
    q.split(',').map(x => x.trim()).filter(x => /^[a-z]+(\/[a-z]+)?\/\d+$/.test(x)).slice(0, 6).forEach(x => { const h = `#/${x}`; if (peut(h)) ouvrir(h, { histoire: false }); });
    history.replaceState(etat(), '', urlAvec(liste()));
    noter();
  }
  // index.html, à chaque changement d'adresse accepté (la question déjà posée) : la même page, seuls les tiroirs changent
  // (vrai : rien à redessiner) ; une autre page, les tiroirs se ferment, et ceux de cette entrée se rouvrent après elle
  let aRouvrir = null;
  function surAdresse() {
    const xs = voulus();
    if (!pile.length && !xs.length) { if (new URLSearchParams(location.search).has('tiroir')) { history.replaceState(history.state, '', urlAvec([])); if (typeof noterAdresse === 'function') noterAdresse(); } return false; }
    if (pile.length && location.hash === E.hashVue) { accorder(xs); return true; }
    while (pile.length) fermer({ demander: false, histoire: false });
    if (xs.length) aRouvrir = xs; else history.replaceState(history.state, '', urlAvec([]));
    if (typeof noterAdresse === 'function') noterAdresse();
    return false;
  }
  if (typeof APRES_VUE !== 'undefined') APRES_VUE.push(() => { const xs = aRouvrir; aRouvrir = null; if (xs && xs.length) requestAnimationFrame(() => accorder(xs)); });
  // le précédent et le suivant entre deux pas d'une même page (seul ?tiroir= change : pas de hashchange)
  window.addEventListener('popstate', () => {
    if (location.search + location.hash === E.adresse) return;     // revenu où l'on était (la question posée)
    if (location.hash !== E.hash) { ignorerPop = false; return; }   // la page change : hashchange suit (index.html)
    if (ignorerPop) { ignorerPop = false; noter(); return; }
    accorder(voulus());
  });
  // le titre de l'onglet : le tiroir du haut (« Théâtre de Caen »), et la rubrique de sa fiche
  function titre() {
    const t = pile[pile.length - 1]; if (!t) return null;
    let nom = ''; try { nom = t.f.titre(t.id); } catch (e) { nom = ''; }
    return { nom: nom || t.f.nom, rubrique: cleDe(t).split('/')[0] };
  }

  // ce que la compagnie sait déjà de cette piste : son lieu (ses dates, ses spectateurs, sa dernière cession), la date qu'elle
  // est devenue, ses invitations à l'espace pro (visites : le bon moment pour relancer)
  function savoirPiste(p) {
    const l = p.lieu_id != null ? lieu(p.lieu_id) : null, invs = (E.acces || []).filter(a => a.prospect_id === p.id), dc = p.date_convertie_id ? E.dates.find(d => d.id === p.date_convertie_id) : null;
    if (!l && !invs.length && !dc) return '';
    const lignes = [];
    if (dc) lignes.push(`<li>Devenue la date du <a href="#/representations/${dc.id}">${esc(jourCourt(dc.debut))}</a></li>`);
    if (l) {
      const ds = E.dates.filter(d => d.lieu_id === l.id && d.statut === 'confirmee' && (d.nature || 'representations') === 'representations').sort((a, b) => (a.debut < b.debut ? 1 : -1));
      const passees = ds.filter(d => (d.fin || d.debut) < AUJ), spect = passees.reduce((t, d) => t + (Number((E.chiffres || []).find(c => c.date_id === d.id)?.spectateurs) || 0), 0);
      const cession = ds.map(d => E.suivis.find(s => s.date_id === d.id)?.montant_cession).find(m => m != null && m !== '');
      lignes.push(`<li><a href="#/lieux/${l.id}">${esc(l.nom || l.commune)}</a> : ${ds.length ? `${ds.length} date${ds.length > 1 ? 's' : ''} de la compagnie${passees[0] ? `, la dernière le ${esc(jourCourt(passees[0].debut))} (${esc(spectacle(passees[0].spectacle_id)?.titre || '')})` : ''}${spect ? `, ${spect.toLocaleString('fr-FR')} spectateurs` : ''}${cession != null ? `, dernière cession ${Number(cession).toLocaleString('fr-FR')} € HT` : ''}` : 'la compagnie n’y a pas encore joué'}</li>`);
    }
    invs.forEach(a => lignes.push(`<li><a href="#/pro/${a.id}">Invitation à l’espace pro</a> : ${a.visites ? `${a.visites} visite${a.visites > 1 ? 's' : ''}${a.derniere_visite ? `, la dernière le ${esc(jourCourt(String(a.derniere_visite).slice(0, 10)))}` : ''}` : 'pas encore ouverte'}${a.actif && a.expire_le >= AUJ ? '' : ' · close'}</li>`));
    return `<div class="bloc"><h3>Ce que la compagnie sait</h3><ul class="liste-simple">${lignes.join('')}</ul></div>`;
  }
  // une piste de diffusion, en résumé : ce que la carte du Kanban dit, et ses actions (le Kanban la modifie)
  const ETAPES = () => (typeof ETAPES_CRM !== 'undefined' ? ETAPES_CRM : []);
  function dessinerPiste(id) {
    const z = $('#ed-piste'); if (!z) return;
    const p = (E.prospects || []).find(x => x.id === id);
    if (!p) { z.innerHTML = '<div class="vide bloc">Cette opportunité n’existe plus.</div>'; return; }
    const sp = spectacle(p.spectacle_id), etapes = ETAPES(), i = etapes.findIndex(e => e[0] === p.etape), auj = aujourdhui();
    const retard = p.date_prochaine_relance && p.date_prochaine_relance < auj;
    const fiche = (l, v) => (v ? `<dt>${esc(l)}</dt><dd>${v}</dd>` : '');
    z.innerHTML = `<div class="titre-ed"><h2>${esc(p.structure)}</h2></div>
      <div class="bloc"><ol class="tiroir-etapes">${etapes.map((e, k) => `<li class="${k < i ? 'faite' : k === i ? 'courante' : ''}"><button type="button" class="btn petit" data-piste-etape="${esc(e[0])}"${k === i ? ' aria-current="step"' : ''}>${esc(e[1])}</button></li>`).join('')}</ol>
        <dl class="dv-fiche">${fiche('Spectacle', sp ? `<span class="pastille" style="--c:${esc(couleurSp(sp))}"></span> ${esc(sp.titre)}` : '')}${fiche('Où', esc([p.commune, p.departement ? `(${p.departement})` : ''].filter(Boolean).join(' ')))}
        ${fiche('Contact', `${esc(p.contact_nom || '')}<span class="sous-champ">${liensCoordonnees([p.contact_email, p.contact_tel].filter(Boolean).join(' '))}</span>`)}
        ${fiche('Montant estimé', p.montant_estime ? esc(`${Number(p.montant_estime).toLocaleString('fr-FR')} €`) : '')}
        ${fiche('Dernier contact', p.date_dernier_contact ? esc(jourCourt(p.date_dernier_contact)) : '')}
        ${fiche('Prochaine relance', p.date_prochaine_relance ? `<span class="${retard ? 'manque' : ''}">${esc(jourCourt(p.date_prochaine_relance))}${retard ? ' · en retard' : ''}</span>` : '')}</dl>
        ${p.notes ? `<p class="dv-message">${esc(p.notes)}</p>` : ''}</div>
      ${savoirPiste(p)}<div class="bloc" id="piste-docs"></div><div class="bloc" id="piste-notes"></div>
      <div class="pied-ed"><span class="etat-ed">Le Kanban modifie cette opportunité.</span><button type="button" class="btn" data-piste-relance>Relance faite aujourd’hui</button>${p.contact_email ? `<a class="btn" href="mailto:${esc(p.contact_email)}">Écrire</a>` : ''}<a class="btn principal" href="#/diffusion" data-tiroir-pleine>Ouvrir la diffusion</a></div>`;
    if (typeof NOTES !== 'undefined' && NOTES.bloc) NOTES.bloc($('#piste-notes', z), 'crescite_diffusion_prospects', p.id, { titre: 'Notes sur cette opportunité' });
    else $('#piste-notes', z)?.remove();
    if (typeof MODELES !== 'undefined') MODELES.bloc($('#piste-docs', z), { prospect: p }); else $('#piste-docs', z)?.remove();
    z.addEventListener('click', async e => {
      const b = e.target.closest('[data-piste-etape], [data-piste-relance]'); if (!b) return;
      b.disabled = true;
      if (b.dataset.pisteEtape !== undefined) { if (typeof deplacerProspect === 'function') await deplacerProspect(p.id, b.dataset.pisteEtape); }
      else {
        const { error } = await sb.from('crescite_diffusion_prospects').update({ date_dernier_contact: auj, date_prochaine_relance: plusJours(auj, 7) }).eq('id', p.id);
        if (error) erreur(error, 'Relance non notée'); else { Object.assign(p, { date_dernier_contact: auj, date_prochaine_relance: plusJours(auj, 7) }); annoncer('Relance notée : prochaine dans 7 jours.'); rafraichirListes(); }
      }
      redessiner();
    });
  }

  // l'adresse d'une piste (#/diffusion/piste/3) : le Kanban, puis la piste en tiroir ; une carte du Kanban cliquée (hors boutons) s'ouvre de même
  if (typeof ROUTES !== 'undefined') ROUTES.unshift([/^#\/diffusion\/piste\/(\d+)$/, m => { vueDiffusion(); requestAnimationFrame(() => ouvrir(`#/diffusion/piste/${m[1]}`, { histoire: false })); }]);   // (l'adresse est déjà la sienne)
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const c = e.target.closest('.crm-carte[data-prospect-id]'); if (!c || e.target.closest('button, a, input, select, textarea')) return;
    if (document.documentElement.classList.contains('sel-mode')) return;
    e.preventDefault(); ouvrir(`#/diffusion/piste/${c.dataset.prospectId}`, { depuis: c });
  });
  // les liens vers une fiche, partout (les listes, les tuiles, les menus, une autre fiche) : en tiroir quand la page n'a pas sa place
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href^="#/"]'); if (!a || a.hasAttribute('data-tiroir-pleine') || a.target === '_blank') return;
    const href = a.getAttribute('href');
    if (!peut(href)) return;
    e.preventDefault();
    if (typeof GESTES !== 'undefined' && GESTES.ouvert()) GESTES.fermer();
    ouvrir(href, { viser: a.dataset.viser || '', depuis: a });
  });
  document.addEventListener('click', e => { const b = e.target.closest('[data-tiroir-fermer]'); if (b) { e.preventDefault(); fermer(); } });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !pile.length) return;
    if (document.querySelector('.gf, .gm, dialog[open]') || (typeof GESTES !== 'undefined' && GESTES.ouvert())) return;
    const t = e.target; if (t && t.matches && t.matches('input, textarea, select, [contenteditable="true"]') && t.closest('.tiroir') && t.value && t.type === 'search') return;
    e.preventDefault(); fermer();
  });
  // changer de page ferme les tiroirs : index.html pose la question des modifications non enregistrées, puis surAdresse()

  const style = document.createElement('style');
  style.id = 'styles-tiroir';
  style.textContent = `
.tiroir-voile { position: fixed; inset: 0; z-index: 60; background: rgba(23, 15, 26, 0); transition: background .22s; }
.tiroir-voile.la { background: rgba(23, 15, 26, .38); }
.tiroir { position: fixed; top: 0; right: 0; bottom: 0; z-index: 61; width: var(--tiroir-largeur, 760px); max-width: 100vw; display: flex; flex-direction: column; background: var(--fond); color: var(--encre);
  box-shadow: -18px 0 48px -22px rgba(0, 0, 0, .45); border-left: 1px solid var(--trait); transform: translateX(104%); transition: transform .22s cubic-bezier(.2, .8, .2, 1); }
.tiroir.la { transform: translateX(calc(-1 * var(--tiroir-recul, 0px))); }
.tiroir[aria-hidden="true"] { filter: brightness(.92); }
.tiroir-tete { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--carte); border-bottom: 1px solid var(--trait); }
.tiroir-fil { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.2; }
.tiroir-genre { font-size: 11.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); }
.tiroir-genre .tg-nom { display: none; }
.tg-fil { display: flex; flex-wrap: wrap; align-items: center; gap: 0 6px; }
.tg-fil a { color: var(--accent); text-decoration: none; border-radius: 4px; }
.tg-fil a:hover { text-decoration: underline; text-underline-offset: .18em; }
.tg-sep { color: var(--gris); font-weight: 700; }
.tiroir-titre { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tiroir-corps { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 16px 18px 24px; }
.tiroir-corps .editeur .titre-ed [data-tt="retour"] { display: none; }
.tiroir-corps .pied-ed { bottom: -24px; }
html.tiroir-ouvert body { overflow: hidden; }
.tiroir-etapes { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 14px; padding: 0; list-style: none; counter-reset: etape; }
.tiroir-etapes li.faite .btn { background: var(--ok-doux); border-color: transparent; color: var(--ok); }
.tiroir-etapes li.courante .btn { background: var(--accent); border-color: var(--accent); color: var(--sur-accent, #fff); }
.manque { color: var(--alerte); font-weight: 700; }
@media (max-width: 640px) { .tiroir { width: 100vw; border-left: 0; } .tiroir-corps { padding: 12px 12px 20px; } .tiroir.la { transform: none; } }
@media (max-width: 640px), (pointer: coarse) { .tiroir-genre .tg-nom { display: inline; } .tg-fil { display: none; } }
@media (prefers-reduced-motion: reduce) { .tiroir, .tiroir-voile { transition: none; } }`;
  document.head.append(style);
  return { ouvrir, fermer, fermerTout, ouvert, racine, redessiner, peut, restaurer, surAdresse, titre, pile: () => pile.slice() };
})();
