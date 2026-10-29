'use strict';
/* Le téléphone (moins de 640 px de large) : une barre d'onglets en bas de l'écran, à portée du pouce (Tableau, Dates,
   Planning, Équipe, Plus : les autres rubriques dans une feuille), un bouton « + » flottant (une date, une fiche, un lieu,
   une opportunité, une proposition de dates, une séance d'atelier), le menu latéral masqué (index.html, sous 640 px) et l'en-tête réduit (la marque, la
   recherche et le témoin du direct restent, sur une seule ligne), les fiches en plein écran (comme avant), leur pied et
   les annonces au-dessus de la barre. Le compte (voir le site, le modifier, le mot de passe, la déconnexion) passe dans
   « Plus » : l'en-tête, arrimé en haut, tenait sur trois lignes (126 px sur 844, avec la barre du bas plus d'un écran
   sur cinq). Le témoin de la connexion y reste, réduit à sa pastille sur l'icône qui relit la base. « Plus » mène aussi
   aux gestes et raccourcis (l'aide de menus.js), et à l'installation de l'administration sur l'écran d'accueil
   (manifest.webmanifest, sw.js, enregistré ici : l'invite du navigateur, ou la marche à suivre sur l'iPhone ; l'ordinateur
   peut l'installer aussi, depuis son navigateur). Rien d'autre ne change à l'ordinateur. Ses icônes viennent de la
   bibliothèque (admin/icones.js, ICONES.svg). Chargé après tiroir.js et corbeille.js.
   MOBILE.feuille(titre, items)   MOBILE.actif() */
const MOBILE = (() => {
  const MQ = '(max-width: 640px)';
  const actif = () => typeof matchMedia === 'function' && matchMedia(MQ).matches;
  // les icônes de la barre et du bouton : celles de la bibliothèque (admin/icones.js), 22 px au trait de 1,9
  const icone = nom => ICONES.svg(nom, { taille: 22, trait: 1.9 });
  const ONGLETS = [['accueil', 'Tableau', 'tableau-de-bord'], ['representations', 'Dates', 'dates'], ['planning', 'Planning', 'planning'], ['equipe', 'Équipe', 'equipe']];
  const rubrique = () => (location.hash.match(/^#\/([a-z]+)/) || [])[1] || 'accueil';
  // l'installation : l'invite du navigateur (Chrome, Edge, Android) quand il en donne une, sinon, sur l'iPhone, Safari
  const mq = q => (typeof matchMedia === 'function' ? matchMedia(q) : { matches: false });
  const installee = () => mq('(display-mode: standalone)').matches || mq('(display-mode: fullscreen)').matches || navigator.standalone === true;
  const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const HORS_SAFARI = IOS && (!/Safari\//.test(navigator.userAgent) || /CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|FBAN|FBAV|Instagram|Line\//.test(navigator.userAgent));
  let invite = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); invite = e; });
  window.addEventListener('appinstalled', () => { invite = null; if (typeof annoncer === 'function') annoncer('L’administration est installée : retrouvez-la sur votre écran d’accueil.'); });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js', { scope: './' }).catch(e => { if (navigator.onLine) console.warn('service de l’administration', e); });
  let barre = null, bouton = null, feuilleOuverte = null, retourFocus = null, inertes = [];
  // le « + » se cache là où la vue a ses propres boutons en bas (le pied d'une fiche, la ligne d'état du tableur : « Enregistrer »,
  // « Supprimer la date… » ne doivent jamais passer dessous), dans une fiche ouverte ou en création, et dans une feuille de route,
  // un spectacle ou le tableur (qui ont l'un ou l'autre) : une seule règle, pour la pose et pour l'observateur
  const plusCache = () => /(nouvelle|nouveau|\d+)$/.test(location.hash) || !!$('.deux.edition') || !!$('#vue .pied-ed, #vue .tab-ligne-etat');
  function poser() {
    // (le squelette du chargement, au téléphone, a déjà l'en-tête du téléphone : il garde html.ob-actif)
    if (!actif() || !E.pret || !$('#vue')) { if (barre) { barre.remove(); barre = null; } if (bouton) { bouton.remove(); bouton = null; } document.documentElement.classList.toggle('ob-actif', actif() && !!$('.barre.attente')); return; }
    document.documentElement.classList.add('ob-actif');
    if (!barre) {
      barre = document.createElement('nav'); barre.className = 'ob-barre'; barre.setAttribute('aria-label', 'Rubriques');
      barre.innerHTML = `${ONGLETS.map(([k, l, i]) => `<a href="#/${k}" data-ob="${k}">${icone(i)}<span>${l}</span></a>`).join('')}<button type="button" data-ob="plus" aria-haspopup="dialog">${icone('points')}<span>Plus</span></button>`;
      barre.addEventListener('click', e => { const b = e.target.closest('[data-ob="plus"]'); if (b) { e.preventDefault(); feuillePlus(b); } });
      document.body.append(barre);
      bouton = document.createElement('button'); bouton.type = 'button'; bouton.className = 'ob-plus'; bouton.setAttribute('aria-label', 'Créer'); bouton.title = 'Créer…'; bouton.innerHTML = icone('plus');
      bouton.addEventListener('click', e => feuilleCreer(e.currentTarget));
      document.body.append(bouton);
    }
    const r = rubrique(), tabs = new Set(ONGLETS.map(o => o[0]));
    $$('[data-ob]', barre).forEach(a => { const ici = a.dataset.ob === r || (a.dataset.ob === 'plus' && !tabs.has(r)); if (ici) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    bouton.hidden = plusCache();
  }
  // une feuille qui monte du bas : des liens et des actions ; un élément { groupe } est un intertitre, { html } un texte, demi le range sur
  // deux colonnes avec ses voisins, courant le marque comme la rubrique où l'on est, nouvel l'ouvre dans un autre onglet ;
  // tete, un bouton { libelle, icone, faire } à droite du titre ; ouvreur, le bouton qui l'ouvre (sur un iPhone, un bouton touché ne prend pas
  // le focus : on ne peut pas le lire dans document.activeElement, qui ne sert que de repli)
  function feuille(titre, items, tete = null, ouvreur = null) {
    fermerFeuille(false);
    // (le bouton qui l'ouvre, retenu avant que la page ne devienne inerte : la feuille le retrouve en se fermant)
    retourFocus = ouvreur || (document.activeElement && document.activeElement !== document.body ? document.activeElement : null);
    const m = document.createElement('div'); m.className = 'ob-voile';
    const classe = x => `ob-item${x.demi ? ' demi' : ''}`, corps = x => `${x.icone || ''}<span>${esc(x.libelle)}${x.nouvel ? '\u00a0↗' : ''}${x.detail ? `<small>${esc(x.detail)}</small>` : ''}</span>`;
    m.innerHTML = `<div class="ob-feuille" role="dialog" aria-modal="true" aria-label="${esc(titre)}"><span class="gm-poignee" aria-hidden="true"></span><div class="ob-tete"><h2>${esc(titre)}</h2>${tete ? `<button type="button" class="ob-tete-btn" data-ob-tete>${tete.icone || ''}<span>${esc(tete.libelle)}</span></button>` : ''}</div>
      <div class="ob-items">${items.filter(Boolean).map((x, i) => x.groupe ? `<h3 class="ob-groupe">${esc(x.groupe)}</h3>` : x.html ? `<div class="ob-texte">${x.html}</div>`
        : x.href ? `<a class="${classe(x)}" href="${esc(x.href)}" data-ob-i="${i}"${x.courant ? ' aria-current="page"' : ''}${x.nouvel ? ' target="_blank" rel="noopener"' : ''}>${corps(x)}</a>`
        : `<button type="button" class="${classe(x)}" data-ob-i="${i}">${corps(x)}</button>`).join('')}</div>
      <button type="button" class="btn ob-fermer" data-ob-fermer>Fermer</button></div>`;
    m.addEventListener('click', e => {
      if (e.target === m || e.target.closest('[data-ob-fermer]')) { fermerFeuille(); return; }
      if (tete && e.target.closest('[data-ob-tete]')) { fermerFeuille(); tete.faire(); return; }
      const b = e.target.closest('[data-ob-i]'); if (!b) return;
      const x = items.filter(Boolean)[+b.dataset.obI];
      fermerFeuille(!!(x && x.faire));   // (un lien mène ailleurs : la page d'arrivée a son propre focus)
      if (x && x.faire) { e.preventDefault(); x.faire(); }
    });
    document.body.append(m);
    // le reste de la page est inerte tant que la feuille est ouverte (Tab y reste), sauf les annonces : « Annuler » reste joignable
    inertes = [...document.body.children].filter(n => n !== m && n.id !== 'annonces' && !n.inert && n.tagName !== 'SCRIPT' && n.tagName !== 'STYLE');
    inertes.forEach(n => { n.inert = true; });
    requestAnimationFrame(() => { m.classList.add('la'); ($('.ob-item[aria-current]', m) || $('.ob-item', m))?.focus({ preventScroll: true }); });
    feuilleOuverte = m;
  }
  // rendre : le focus retourne au bouton qui avait ouvert la feuille, s'il est encore dans la page
  function fermerFeuille(rendre = true) {
    if (!feuilleOuverte) return;
    const m = feuilleOuverte, retour = retourFocus; feuilleOuverte = null; retourFocus = null;
    inertes.forEach(n => { n.inert = false; }); inertes = [];
    m.classList.remove('la'); setTimeout(() => m.remove(), 200);
    if (rendre && retour && retour.isConnected) retour.focus({ preventScroll: true });
  }
  const allerEtCliquer = (href, sel) => { const essayer = n => { const b = $(sel); if (b) { b.click(); return; } if (n > 0) requestAnimationFrame(() => essayer(n - 1)); }; if (location.hash === href) return essayer(40); window.addEventListener('hashchange', () => setTimeout(() => essayer(40), 20), { once: true }); location.hash = href; };
  // « Plus » : les autres rubriques sur deux colonnes (elles tiennent toutes dans l'écran, sans défiler, même à 360 px), celle
  // où l'on est marquée ; puis la carte, la corbeille, la recherche ; puis le compte, ôté de l'en-tête au téléphone (ses
  // boutons y restent, cachés : la feuille les déclenche)
  function feuillePlus(ouvreur = null) {
    const tabs = new Set(ONGLETS.map(o => o[0])), r = rubrique(), carte = location.hash.startsWith('#/representations/carte');
    const items = rubriquesVisibles().filter(([k]) => !tabs.has(k)).map(([k, l]) => ({ libelle: l, href: `#/${k}`, demi: true, courant: k === r }));
    items.push({ libelle: 'Carte de tournée', href: '#/representations/carte', demi: true, courant: carte }, { libelle: 'Gestes et raccourcis', demi: true, faire: () => { if (typeof ouvrirAide === 'function') ouvrirAide($('.ob-barre [data-ob="plus"]')); } }, { libelle: 'Corbeille', detail: 'ce qui a été supprimé ces trente derniers jours', href: '#/corbeille', courant: r === 'corbeille' }, { libelle: 'Rechercher', detail: 'une date, une personne, un lieu…', faire: () => ouvrirRecherche() });
    if ($('#b-sortir')) items.push({ groupe: 'Compte' }, { libelle: 'Voir le site', href: SITE, nouvel: true, demi: true }, { libelle: 'Modifier sur le site', href: `${SITE}?edition`, nouvel: true, demi: true },
      { libelle: 'Mot de passe', demi: true, faire: () => $('#b-mdp')?.click() }, { libelle: 'Se déconnecter', demi: true, faire: () => $('#b-sortir')?.click() });
    // l'installation, à droite du titre (la feuille tient dans l'écran sans défiler, même à 360 × 800)
    feuille('Les autres rubriques', items, installee() ? null : { libelle: 'Installer', icone: icone('installer'), faire: installer }, ouvreur);
  }
  async function installer() {
    if (invite) {
      const p = invite; invite = null;
      try { p.prompt(); const { outcome } = await p.userChoice; if (outcome !== 'accepted') invite = null; } catch (e) { /* refusé */ }
      return;
    }
    const etapes = IOS ? `<ol>${HORS_SAFARI ? `<li>Ouvrez d’abord cette page dans <b>Safari</b> : depuis une autre application, l’iPhone ne l’installe pas (son adresse : <b>${esc(location.origin + location.pathname)}</b>).</li>` : ''}<li>Dans Safari, touchez <b>Partager</b> en bas de l’écran.</li><li>Choisissez <b>Sur l’écran d’accueil</b>, puis <b>Ajouter</b>.</li><li>Ouvrez <b>Admin Crescite</b> depuis son icône, et connectez-vous une fois.</li></ol>`
      : '<p>Dans le menu de votre navigateur, choisissez <b>Installer l’application</b> ou <b>Ajouter à l’écran d’accueil</b>. Ce navigateur ne le propose pas ? Ouvrez cette page dans Chrome, Edge ou Safari.</p>';
    feuille('Installer l’application', [{ html: `<p>L’administration s’ouvre alors en un geste depuis l’écran d’accueil, en plein écran.</p>${etapes}` }]);
  }
  function feuilleCreer(ouvreur = null) {
    feuille('Créer', [
      { libelle: 'Une date', href: '#/representations/nouvelle' },
      E.equipeInstallee ? { libelle: 'Une fiche dans l’équipe', href: '#/equipe/nouvelle' } : null,
      { libelle: 'Un lieu', href: '#/lieux/nouveau' },
      E.ideale ? { libelle: 'Une opportunité de diffusion', faire: () => allerEtCliquer('#/diffusion', '#b-nouveau-prospect') } : null,
      E.equipeInstallee && E.sql5 !== false ? { libelle: 'Une proposition de dates à l’équipe', href: '#/planning/proposer' } : null,
      { libelle: 'Une séance d’atelier', href: '#/ateliers/seances/nouvelle' },
    ], null, ouvreur);
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && feuilleOuverte) { e.preventDefault(); fermerFeuille(); } });
  window.addEventListener('hashchange', () => { fermerFeuille(false); setTimeout(poser, 0); });
  if (typeof matchMedia === 'function') matchMedia(MQ).addEventListener('change', poser);
  // la page se dessine (cadre) : la barre se pose dès que l'administration est là, et le « + » se cache dans une fiche
  let poserPlusTard = null;
  new MutationObserver(() => { clearTimeout(poserPlusTard); poserPlusTard = setTimeout(() => { if (!barre) { if (actif() && E.pret && $('#vue')) poser(); } else bouton.hidden = plusCache(); }, 50); }).observe(document.body, { childList: true, subtree: true });
  const style = document.createElement('style');
  style.textContent = `
@media (max-width: 640px) {
  /* l'en-tête sur une ligne : la marque (« Administration » sous le nom, comme l'équipe), le témoin du direct, la loupe */
  html.ob-actif .barre { flex-wrap: nowrap; gap: 10px; min-height: 56px; padding: 6px 10px 6px 12px; }
  html.ob-actif .barre .marque { display: grid; grid-template-columns: auto auto; align-items: center; column-gap: 8px; row-gap: 3px; min-width: 0; min-height: 44px; align-content: center; justify-content: start; line-height: 1.1; }
  html.ob-actif .barre .marque .pieuvre { grid-row: span 2; }
  html.ob-actif .barre .marque small { font-size: 10.5px; }
  html.ob-actif .barre .qui { order: 2; margin-left: auto; }
  html.ob-actif .barre .qui > :not(.direct) { display: none; }
  html.ob-actif .barre .chercher { order: 3; margin-left: 0; width: 44px; height: 44px; }
  /* le témoin de la connexion : la pastille sur l'icône qui relit la base, dans une cible de 44 px ; le mot seulement
     quand il y a lieu de s'inquiéter (hors ligne, la reconnexion), à la place de l'icône */
  html.ob-actif .barre .temoin { position: relative; justify-content: center; width: 44px; height: 44px; padding: 0; }
  html.ob-actif .barre .temoin::before { position: absolute; top: 9px; right: 8px; }
  html.ob-actif .barre .temoin .temoin-ic { width: 20px; height: 20px; opacity: .9; }
  html.ob-actif .barre .temoin :is(.temoin-mot, .temoin-detail) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  html.ob-actif .barre .temoin:is([data-etat="horsligne"], [data-etat="reconnexion"]) { width: auto; padding: 0 12px; gap: 7px; }
  html.ob-actif .barre .temoin:is([data-etat="horsligne"], [data-etat="reconnexion"])::before { position: static; }
  html.ob-actif .barre .temoin:is([data-etat="horsligne"], [data-etat="reconnexion"]) .temoin-mot { position: static; width: auto; height: auto; clip: auto; }
  html.ob-actif .barre .temoin:is([data-etat="horsligne"], [data-etat="reconnexion"]) .temoin-ic { display: none; }
  html.ob-actif main { padding-bottom: calc(92px + env(safe-area-inset-bottom, 0px)); }
  /* le pied commun après le contenu : c'est lui qui laisse la place à la barre */
  html.ob-actif .coque:has(+ .pied-espace) > main { padding-bottom: 20px; }
  html.ob-actif .pied-espace { padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px)); }
  html.ob-actif .pied-ed { bottom: calc(64px + env(safe-area-inset-bottom, 0px)); }
  html.ob-actif #annonces { bottom: calc(82px + env(safe-area-inset-bottom, 0px)); }
  /* ce que le pied et le détail du planning laissent à la barre ; un champ amené à l'écran ne se cache pas sous le pied */
  html.ob-actif { --pl-bas: calc(64px + env(safe-area-inset-bottom, 0px)); scroll-padding-bottom: calc(150px + env(safe-area-inset-bottom, 0px)); }
  /* le « + » (54 px à 76 px du bas) : les annonces et le pied commun se posent au-dessus de lui, jamais dessous */
  html.ob-actif:has(.ob-plus:not([hidden])) #annonces { bottom: calc(140px + env(safe-area-inset-bottom, 0px)); }
  html.ob-actif:has(.ob-plus:not([hidden])) .pied-espace { padding-bottom: calc(140px + env(safe-area-inset-bottom, 0px)); }
  /* une fiche a son pied collé au-dessus de la barre (64 px + sa rangée de 66 px) : l'annonce se pose au-dessus de lui, pas dessus */
  html.ob-actif:has(.pied-ed) #annonces { bottom: calc(150px + env(safe-area-inset-bottom, 0px)); }
  /* le pied d'un tiroir est collé en bas du tiroir, qui n'a pas de barre : la règle ci-dessus (la barre) ne le concerne pas ;
     -20 px, le bas de .tiroir-corps au téléphone (tiroir.js en rend 24 à l'ordinateur) */
  html.ob-actif .tiroir-corps .pied-ed { bottom: -20px; }
  /* une fiche ouverte commence en haut de l'écran : le titre de la rubrique, les vues et « Nouvelle… » restent à l'écran du dessus
     (le titre reste lu, le fil d'Ariane de la fiche dit où l'on est) */
  html.ob-actif .tete:has(~ .deux.edition) { margin: 0; }
  html.ob-actif .tete:has(~ .deux.edition) > :not(h1) { display: none; }
  html.ob-actif .tete:has(~ .deux.edition) > h1 { position: absolute; width: 1px; height: 1px; margin: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  /* tout au doigt : 44 px de haut à chaque commande, 16 px de texte dans les champs (au-dessous, l'iPhone zoome sur le champ touché) ;
     le tableur (.tab-cadre) garde ses cellules. Le planning est réglé d'ici : planning.js est partagé avec l'espace de l'équipe,
     qui garde ses 34 et 40 px */
  html.ob-actif body { --h-champ: 44px; }   /* (sur le corps, pas sur html : theme.mjs lit la hauteur de champ de html pour dire que la compacte est ignorée au téléphone ; tous les champs sont dans le corps) */
  html.ob-actif :is(input, select, textarea, .riche):not(.tab-cadre *) { font-size: 16px; }
  html.ob-actif :is(.filtres-dates .seg button, .f-plus > summary, .tb-det > summary, .pl-alerte > summary, .tb-vues select, .pl-filtres select, .f-periode input, .pc-e, .dfn-ligne .eq-fonction, .dfn-ligne .eq-note, .dfn-ligne [data-eqd-fonction], input.eq-fonction, input.eq-note, .case, .suggestions button, .ob-tete-btn, .pl-vues button, .pl-btn, .pl-btn-masquees, [data-pl-afficher], [role="columnheader"] > button[data-pl-jour]) { min-height: 44px; }
  html.ob-actif :is(.f-plus > summary, .tb-det > summary, .pl-alerte > summary) { box-sizing: border-box; padding-block: 12px; }   /* (le triangle reste : on ne passe pas la ligne en flex) */
  html.ob-actif .pl-btn.rond { width: 44px; }
  html.ob-actif .pl-e-nom .pl-masquer { width: 44px; height: 44px; margin-top: -22px; right: 2px; }
  html.ob-actif .annonce .annonce-fermer { width: 44px; height: 44px; margin: -12px -12px -12px 0; }
  html.ob-actif .annonce [data-tt="retour"] { min-height: 44px; }   /* « Annuler » : c'est lui qu'on vise du pouce juste après une écriture */
  /* le lieu d'une date sur deux lignes au lieu d'être coupé par « … » ; l'aide du clavier sous le tableur n'a pas de sens au doigt
     (elle reste dans la page : #tab-aide est la cible d'aria-describedby) */
  html.ob-actif .ligne .ou { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  html.ob-actif #tab-aide { display: none; }
  .ob-barre { position: fixed; left: 0; right: 0; bottom: 0; z-index: 48; display: grid; grid-template-columns: repeat(5, 1fr); padding: 4px 4px calc(4px + env(safe-area-inset-bottom, 0px)); background: color-mix(in srgb, var(--carte) 94%, transparent); backdrop-filter: blur(10px); border-top: 1px solid var(--trait); }
  .ob-barre a, .ob-barre button { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 2px 4px; border: 0; border-radius: 12px; background: none; color: var(--gris); text-decoration: none; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
  .ob-barre [aria-current="page"] { color: var(--accent); background: var(--accent-doux); }
  .ob-plus { position: fixed; right: 16px; bottom: calc(76px + env(safe-area-inset-bottom, 0px)); z-index: 48; width: 54px; height: 54px; border-radius: 50%; border: 0; background: var(--principal, var(--accent)); color: #fff; box-shadow: 0 10px 24px -8px color-mix(in srgb, var(--saison, #5f565a) 70%, transparent); display: flex; align-items: center; justify-content: center; cursor: pointer; }
  .ob-plus[hidden] { display: none; }
  html.tiroir-ouvert .ob-plus, html.tiroir-ouvert .ob-barre { display: none; }
}
.ob-voile { position: fixed; inset: 0; z-index: 70; background: rgba(23, 15, 26, 0); transition: background .2s cubic-bezier(.2, .8, .2, 1); }
.ob-voile.la { background: rgba(23, 15, 26, .45); }
.ob-feuille { position: absolute; left: 0; right: 0; bottom: 0; max-height: 88vh; overflow: auto; padding: 8px 14px calc(14px + env(safe-area-inset-bottom, 0px)); background: var(--carte); color: var(--encre); border-radius: 18px 18px 0 0; box-shadow: 0 -12px 40px -16px rgba(0, 0, 0, .5); transform: translateY(100%); transition: transform .2s cubic-bezier(.2, .8, .2, 1); }
.ob-voile.la .ob-feuille { transform: none; }
.ob-feuille h2 { margin: 6px 0 10px; font-size: 16px; }
.ob-tete { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.ob-tete-btn { display: inline-flex; align-items: center; gap: 6px; flex: none; min-height: 36px; margin: 0 0 4px; padding: 0 12px 0 9px; border: 0; border-radius: 999px; background: var(--principal, var(--accent)); color: #fff; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
.ob-tete-btn svg { width: 18px; height: 18px; }
.ob-items { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.ob-items > :not(.demi) { grid-column: 1 / -1; }
.ob-groupe { margin: 10px 2px 2px; font: 700 11px/1.2 var(--etiq, inherit); letter-spacing: .12em; text-transform: uppercase; color: var(--gris); }
.ob-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 12px; border: 0; border-radius: 12px; background: var(--doux); color: var(--encre); text-decoration: none; font: inherit; font-weight: 700; text-align: left; cursor: pointer; }
.ob-item small { display: block; font-weight: 500; color: var(--gris); font-size: 12.5px; }
.ob-item { min-height: 48px; }
.ob-item.demi { padding: 10px 12px; }
.ob-item small { line-height: 1.3; }
.ob-item:hover, .ob-item:focus-visible { background: var(--accent-doux); }
.ob-item[aria-current="page"] { background: var(--accent-doux); color: var(--accent); box-shadow: inset 3px 0 0 var(--accent); }
.ob-fermer { width: 100%; margin-top: 10px; justify-content: center; }
.ob-texte { grid-column: 1 / -1; padding: 0 2px; line-height: 1.5; }
.ob-texte p { margin: 0 0 8px; }
.ob-texte ol { margin: 0; padding-left: 22px; }
.ob-texte li { margin: 6px 0; }
@media (prefers-reduced-motion: reduce) { .ob-voile, .ob-feuille { transition: none; } }`;
  document.head.append(style);
  setTimeout(poser, 0);
  return { feuille, actif, poser };
})();
