'use strict';
/* Le téléphone (moins de 640 px de large) : une barre d'onglets en bas de l'écran, à portée du pouce (Tableau, Dates,
   Planning, Équipe, Plus : les autres rubriques dans une feuille), un bouton « + » flottant (une date, une fiche, un lieu,
   une opportunité, une proposition de dates, une séance d'atelier), les rubriques de l'en-tête masquées (la marque, la
   recherche et le témoin du direct restent, sur une seule ligne), les fiches en plein écran (comme avant), leur pied et
   les annonces au-dessus de la barre. Le compte (voir le site, le modifier, le mot de passe, la déconnexion) passe dans
   « Plus » : l'en-tête, arrimé en haut, tenait sur trois lignes (126 px sur 844, avec la barre du bas plus d'un écran
   sur cinq). Rien ne change à l'ordinateur. Chargé après tiroir.js et corbeille.js.
   MOBILE.feuille(titre, items)   MOBILE.actif() */
const MOBILE = (() => {
  const MQ = '(max-width: 640px)';
  const actif = () => typeof matchMedia === 'function' && matchMedia(MQ).matches;
  const ico = d => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONES = {
    tableau: ico('<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>'),
    dates: ico('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    planning: ico('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    equipe: ico('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5a5 5 0 0 1 6 5"/>'),
    plus: ico('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'),
    ajouter: ico('<path d="M12 5v14M5 12h14"/>'),
  };
  const ONGLETS = [['accueil', 'Tableau', 'tableau'], ['representations', 'Dates', 'dates'], ['planning', 'Planning', 'planning'], ['equipe', 'Équipe', 'equipe']];
  const rubrique = () => (location.hash.match(/^#\/([a-z]+)/) || [])[1] || 'accueil';
  let barre = null, bouton = null, feuilleOuverte = null;
  function poser() {
    if (!actif() || !E.pret || !$('#vue')) { if (barre) { barre.remove(); barre = null; } if (bouton) { bouton.remove(); bouton = null; } document.documentElement.classList.remove('ob-actif'); return; }
    document.documentElement.classList.add('ob-actif');
    if (!barre) {
      barre = document.createElement('nav'); barre.className = 'ob-barre'; barre.setAttribute('aria-label', 'Rubriques');
      barre.innerHTML = `${ONGLETS.map(([k, l, i]) => `<a href="#/${k}" data-ob="${k}">${ICONES[i]}<span>${l}</span></a>`).join('')}<button type="button" data-ob="plus" aria-haspopup="dialog">${ICONES.plus}<span>Plus</span></button>`;
      barre.addEventListener('click', e => { const b = e.target.closest('[data-ob="plus"]'); if (b) { e.preventDefault(); feuillePlus(); } });
      document.body.append(barre);
      bouton = document.createElement('button'); bouton.type = 'button'; bouton.className = 'ob-plus'; bouton.setAttribute('aria-label', 'Créer'); bouton.title = 'Créer…'; bouton.innerHTML = ICONES.ajouter;
      bouton.addEventListener('click', feuilleCreer);
      document.body.append(bouton);
    }
    const r = rubrique(), tabs = new Set(ONGLETS.map(o => o[0]));
    $$('[data-ob]', barre).forEach(a => { const ici = a.dataset.ob === r || (a.dataset.ob === 'plus' && !tabs.has(r)); if (ici) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    bouton.hidden = /^#\/[a-z]+\/(nouvelle|nouveau|\d+)$/.test(location.hash) || !!$('.deux.edition');
  }
  // une feuille qui monte du bas : des liens et des actions ; un élément { groupe } est un intertitre, demi le range sur
  // deux colonnes avec ses voisins, courant le marque comme la rubrique où l'on est, nouvel l'ouvre dans un autre onglet
  function feuille(titre, items) {
    fermerFeuille();
    const m = document.createElement('div'); m.className = 'ob-voile';
    const classe = x => `ob-item${x.demi ? ' demi' : ''}`, corps = x => `${x.icone || ''}<span>${esc(x.libelle)}${x.nouvel ? '\u00a0↗' : ''}${x.detail ? `<small>${esc(x.detail)}</small>` : ''}</span>`;
    m.innerHTML = `<div class="ob-feuille" role="dialog" aria-modal="true" aria-label="${esc(titre)}"><span class="gm-poignee" aria-hidden="true"></span><h2>${esc(titre)}</h2>
      <div class="ob-items">${items.filter(Boolean).map((x, i) => x.groupe ? `<h3 class="ob-groupe">${esc(x.groupe)}</h3>`
        : x.href ? `<a class="${classe(x)}" href="${esc(x.href)}" data-ob-i="${i}"${x.courant ? ' aria-current="page"' : ''}${x.nouvel ? ' target="_blank" rel="noopener"' : ''}>${corps(x)}</a>`
        : `<button type="button" class="${classe(x)}" data-ob-i="${i}">${corps(x)}</button>`).join('')}</div>
      <button type="button" class="btn ob-fermer" data-ob-fermer>Fermer</button></div>`;
    m.addEventListener('click', e => {
      if (e.target === m || e.target.closest('[data-ob-fermer]')) { fermerFeuille(); return; }
      const b = e.target.closest('[data-ob-i]'); if (!b) return;
      const x = items.filter(Boolean)[+b.dataset.obI];
      fermerFeuille();
      if (x && x.faire) { e.preventDefault(); x.faire(); }
    });
    document.body.append(m);
    requestAnimationFrame(() => { m.classList.add('la'); ($('.ob-item[aria-current]', m) || $('.ob-item', m))?.focus({ preventScroll: true }); });
    feuilleOuverte = m;
  }
  function fermerFeuille() { if (!feuilleOuverte) return; const m = feuilleOuverte; feuilleOuverte = null; m.classList.remove('la'); setTimeout(() => m.remove(), 200); }
  const allerEtCliquer = (href, sel) => { const essayer = n => { const b = $(sel); if (b) { b.click(); return; } if (n > 0) requestAnimationFrame(() => essayer(n - 1)); }; if (location.hash === href) return essayer(40); window.addEventListener('hashchange', () => setTimeout(() => essayer(40), 20), { once: true }); location.hash = href; };
  // « Plus » : les autres rubriques sur deux colonnes (elles tiennent toutes dans l'écran, sans défiler, même à 360 px), celle
  // où l'on est marquée ; puis la carte, la corbeille, la recherche ; puis le compte, ôté de l'en-tête au téléphone (ses
  // boutons y restent, cachés : la feuille les déclenche)
  function feuillePlus() {
    const tabs = new Set(ONGLETS.map(o => o[0])), r = rubrique(), carte = location.hash.startsWith('#/representations/carte');
    const items = rubriquesVisibles().filter(([k]) => !tabs.has(k)).map(([k, l]) => ({ libelle: l, href: `#/${k}`, demi: true, courant: k === r }));
    items.push({ libelle: 'Carte de tournée', href: '#/representations/carte', demi: true, courant: carte }, { libelle: 'Corbeille', detail: 'ce qui a été supprimé ces trente derniers jours', href: '#/corbeille', courant: r === 'corbeille' }, { libelle: 'Rechercher', detail: 'une date, une personne, un lieu…', faire: () => ouvrirRecherche() });
    if ($('#b-sortir')) items.push({ groupe: 'Compte' }, { libelle: 'Voir le site', href: SITE, nouvel: true, demi: true }, { libelle: 'Modifier sur le site', href: `${SITE}?edition`, nouvel: true, demi: true },
      { libelle: 'Mot de passe', demi: true, faire: () => $('#b-mdp')?.click() }, { libelle: 'Déconnexion', demi: true, faire: () => $('#b-sortir')?.click() });
    feuille('Les autres rubriques', items);
  }
  function feuilleCreer() {
    feuille('Créer', [
      { libelle: 'Une date', href: '#/representations/nouvelle' },
      E.equipeInstallee ? { libelle: 'Une fiche dans l’équipe', href: '#/equipe/nouvelle' } : null,
      { libelle: 'Un lieu', href: '#/lieux/nouveau' },
      E.ideale ? { libelle: 'Une opportunité de diffusion', faire: () => allerEtCliquer('#/diffusion', '#b-nouveau-prospect') } : null,
      E.equipeInstallee && E.sql5 !== false ? { libelle: 'Une proposition de dates à l’équipe', href: '#/planning/proposer' } : null,
      { libelle: 'Une séance d’atelier', href: '#/ateliers/seances/nouvelle' },
    ]);
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && feuilleOuverte) { e.preventDefault(); fermerFeuille(); } });
  window.addEventListener('hashchange', () => { fermerFeuille(); setTimeout(poser, 0); });
  if (typeof matchMedia === 'function') matchMedia(MQ).addEventListener('change', poser);
  // la page se dessine (cadre) : la barre se pose dès que l'administration est là, et le « + » se cache dans une fiche
  let poserPlusTard = null;
  new MutationObserver(() => { clearTimeout(poserPlusTard); poserPlusTard = setTimeout(() => { if (!barre) { if (actif() && E.pret && $('#vue')) poser(); } else bouton.hidden = !!$('.deux.edition') || /nouvelle|nouveau/.test(location.hash); }, 50); }).observe(document.body, { childList: true, subtree: true });
  const style = document.createElement('style');
  style.textContent = `
@media (max-width: 640px) {
  html.ob-actif .barre .nav { display: none; }
  /* l'en-tête sur une ligne : la marque (« Administration » sous le nom, comme l'équipe), le témoin du direct, la loupe */
  html.ob-actif .barre { flex-wrap: nowrap; gap: 10px; min-height: 56px; padding: 6px 10px 6px 12px; }
  html.ob-actif .barre .marque { display: grid; grid-template-columns: auto auto; align-items: center; column-gap: 8px; row-gap: 3px; min-width: 0; min-height: 44px; align-content: center; justify-content: start; line-height: 1.1; }
  html.ob-actif .barre .marque .pieuvre { grid-row: span 2; }
  html.ob-actif .barre .marque small { font-size: 10.5px; }
  html.ob-actif .barre .qui { order: 2; margin-left: auto; }
  html.ob-actif .barre .qui > :not(.direct) { display: none; }
  html.ob-actif .barre .chercher { order: 3; margin-left: 0; width: 44px; height: 44px; }
  html.ob-actif main { padding-bottom: calc(92px + env(safe-area-inset-bottom, 0px)); }
  /* le pied commun après le contenu : c'est lui qui laisse la place à la barre */
  html.ob-actif main:has(+ .pied-espace) { padding-bottom: 20px; }
  html.ob-actif .pied-espace { padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px)); }
  html.ob-actif .pied-ed { bottom: calc(64px + env(safe-area-inset-bottom, 0px)); }
  html.ob-actif #annonces { bottom: calc(82px + env(safe-area-inset-bottom, 0px)); }
  .ob-barre { position: fixed; left: 0; right: 0; bottom: 0; z-index: 48; display: grid; grid-template-columns: repeat(5, 1fr); padding: 4px 4px calc(4px + env(safe-area-inset-bottom, 0px)); background: color-mix(in srgb, var(--carte) 94%, transparent); backdrop-filter: blur(10px); border-top: 1px solid var(--trait); }
  .ob-barre a, .ob-barre button { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 2px 4px; border: 0; border-radius: 12px; background: none; color: var(--gris); text-decoration: none; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
  .ob-barre [aria-current="page"] { color: var(--accent); background: var(--accent-doux); }
  .ob-plus { position: fixed; right: 16px; bottom: calc(76px + env(safe-area-inset-bottom, 0px)); z-index: 48; width: 54px; height: 54px; border-radius: 50%; border: 0; background: var(--principal, var(--accent)); color: #fff; box-shadow: 0 10px 24px -8px color-mix(in srgb, var(--saison, #5f565a) 70%, transparent); display: flex; align-items: center; justify-content: center; cursor: pointer; }
  .ob-plus[hidden] { display: none; }
  html.tiroir-ouvert .ob-plus, html.tiroir-ouvert .ob-barre { display: none; }
}
.ob-voile { position: fixed; inset: 0; z-index: 70; background: rgba(23, 15, 26, 0); transition: background .2s; }
.ob-voile.la { background: rgba(23, 15, 26, .45); }
.ob-feuille { position: absolute; left: 0; right: 0; bottom: 0; max-height: 88vh; overflow: auto; padding: 8px 14px calc(14px + env(safe-area-inset-bottom, 0px)); background: var(--carte); color: var(--encre); border-radius: 18px 18px 0 0; box-shadow: 0 -12px 40px -16px rgba(0, 0, 0, .5); transform: translateY(100%); transition: transform .22s cubic-bezier(.3, .7, .3, 1); }
.ob-voile.la .ob-feuille { transform: none; }
.ob-feuille h2 { margin: 6px 0 10px; font-size: 16px; }
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
@media (prefers-reduced-motion: reduce) { .ob-voile, .ob-feuille { transition: none; } }`;
  document.head.append(style);
  setTimeout(poser, 0);
  return { feuille, actif, poser };
})();
