/* Les frises chronologiques, communes aux maquettes (règle 15 D du contrat) : un moteur de frise, comme carte.js l'est pour
   la carte. Partout où il y a un calendrier, une frise le rend lisible d'un regard : les mois (ou les années), les dates
   aux couleurs de leur spectacle, « aujourd'hui » qui respire. Chaque maquette l'habille dans son univers (variables
   --fr-* et classes, voir plus bas). build.py l'ajoute après dossier.js et le copie à côté de l'administration.

   FRISE.creer(conteneur, options) → frise          (la frise est ajoutée dans le conteneur)
   options
     echelle      'saison'   de septembre à août de `saison` ('2026-2027')
                  'annees'   plusieurs saisons, en bandes : de `debut` à `fin` ('2016-2017', '2026-2027' ou 'AAAA-MM-JJ')
                  'periode'  de `debut` à `fin` ('AAAA-MM-JJ'), libres ; sans eux, les mois (ou les années) des points
     aujourdhui   'AAAA-MM-JJ' (D.aujourdhui) : le repère « aujourd'hui » (libellé D.site.libelles.aujourdhui), qui respire
     points       [{ id, jour, fin, couleur, titre, quand, texte, lien, slug, l, scolaire, residence, annulee, etat, annee }]
                    jour, fin  'AAAA-MM-JJ' (fin : le dernier jour ; une date longue devient un trait)
                    quand      la date écrite comme l'agenda (d.ligneDate…) ; sans elle, AGENDA.quand ; annee : une année seule
                    titre      le spectacle ; l : la commune (CARTE.lieux[l]) ; texte : une ligne de plus dans la bulle
                    lien       le repère est un lien ; sinon un bouton (choix)
                    scolaire, annulee (barrée), etat (« date annulée » : écrit dans la bulle) ; residence : une semaine de
                    résidence (règle 23), un repère évidé (une période : un trait en pointillé), nommé D.site.libelles.residence
                    id         la clé du repère : relie la liste ([data-frise-id] ou [data-date-id]) et fait glisser (maj)
     bandes       [{ id, debut, fin, titre, n, lien, etiquette }] : une saison et sa densité (échelle annees) ;
                    etiquette : le nom court sous la bande (par défaut les années de la saison, « 2019-2020 »)
     orientation  'auto' (horizontale ; au doigt, elle défile, aimantée aux mois) · 'horizontale' · 'verticale'
     regrouper    14 (px) : des repères d'un jour plus proches que cela forment une grappe, avec leur nombre
     couloirs     3 : les repères qui se chevauchent passent en couloirs (au-delà, ils se superposent)
     etiquettes   false · true : le titre de chaque repère est écrit au-dessus de lui (une frise historique) ; les points restent
                  sur l'axe, les étiquettes montent en couloirs, un filet les relie ; largeurCar (6.6 px par caractère) et
                  largeurMax (170 px) : la place d'une étiquette, si la maquette les écrit plus grandes
     relier       { liste, carte } (réglé à la création)
                    liste  un élément : survoler un repère allume sa ligne [data-frise-id="<id>"] (ou [data-date-id="<id>"]),
                           et survoler une ligne allume son repère
                    carte  le SVG d'une carte (communes .carte-lieu[data-l]) : survoler un repère allume sa commune
                           (classe est-allume), survoler une commune allume ses repères ; ou une fonction (l | null)
     survol(p)    au survol et au focus d'un repère (p ; null en sortant) ; choix(p) au clic et à Entrée
     libelle      le nom de la liste pour les lecteurs d'écran (un texte de D)
     largeur      la largeur attendue en px (sinon estimée, puis mesurée par ResizeObserver)
     moisMin, anMin   76 et 72 (px) : la place d'un mois, d'une année, sous laquelle la frise défile au doigt
     immediat     true : la frise est là d'emblée, sans son entrée (une vue refaite en place quand D change)
     classe       une classe de plus sur .frise
   frise.maj(options)          change les points, les bandes ou les options : les repères glissent à leur place (FLIP),
                               ceux qui arrivent paraissent, ceux qui partent s'effacent
   frise.allumer(id | { l })   allume un repère (ou les repères d'une commune) ; frise.eteindre() ; frise.points (le modèle)
   frise.aller(id)             fait défiler la frise jusqu'au repère et l'allume
   frise.detruire()            retire la frise et ses observateurs ; frise.el : l'élément .frise
   FRISE.jour('AAAA-MM-JJ')    le numéro du jour (UTC) ; FRISE.permis() : faux si moins d'animations est demandé ou ?anim=0

   Le rendu : une vraie liste ordonnée dans l'ordre du temps (<ol>), un lien ou un bouton par repère ; les flèches passent
   d'un repère à l'autre (Début, Fin) ; chaque repère a pour nom la date écrite comme l'agenda, le titre et la commune ;
   une bulle les montre au survol et au focus. Les mois et les années viennent des dates (AGENDA.MOIS), « aujourd'hui »
   de D.site.libelles.aujourdhui : aucun autre texte. Un seul innerHTML, positions en pourcentage, mouvements par
   transform et opacity, délégation d'évènements ; la largeur se lit par ResizeObserver (jamais de lecture en boucle).
   Le mouvement : l'axe se trace quand la frise entre dans l'écran et les repères arrivent dans l'ordre du temps : ils sont
   dévoilés de gauche à droite avec lui (une seule animation par conteneur, 840 ms en tout) ; « aujourd'hui » respire.
   prefers-reduced-motion ou ?anim=0 : immobile et complète tout de suite.

   L'habillage (des styles de base sobres, injectés une fois en tête de <head>, sans poids : :where(), donc la moindre
   règle de la maquette les remplace) :
     variables  --fr-encre (les libellés), --fr-trait (l'axe, les graduations), --fr-fond (le fond sous les repères),
                --fr-accent (allumé, aujourd'hui), --fr-passe (l'opacité du passé, .38), --fr-point (10px),
                --fr-couloir (16px), --fr-haut (la marge haute, 26px), --fr-taille (12px), --fr-police, --fr-courbe,
                --fr-bande-h (46px), --fr-marge (14px), --fr-bulle-fond, --fr-bulle-encre ; par repère : --fr-c (sa couleur),
                --fr-x (sa place, en %), --fr-y (son couloir), --fr-t (0 → 1 : son rang dans le temps, pour un décalage à la
                maquette) ; par bande : --fr-d (sa densité, 0 → 1)
     classes    .frise (+ .frise--saison/--annees/--periode, .frise--h/--v, .frise--mois/--ans, .est-vue, .est-immobile)
                .frise-piste (ce qui défile) .frise-toile .frise-axe .frise-mois (> li, .frise-mois-nom, .frise-an)
                .frise-points (> li.frise-point) .frise-repere (le lien ou bouton ; son ::before est le point dessiné)
                .frise-etiquette .frise-grappe (.frise-grappe-n) .frise-bandes (> li.frise-bande, .frise-bande-barre,
                .frise-bande-n, .frise-bande-nom) .frise-aujourdhui (.frise-aujourdhui-nom) .frise-bulle
                états : .est-passe .est-allume .est-annule .est-scolaire .est-duree .est-groupe .est-focus .est-a-droite
                (une étiquette tournée vers la gauche) ; .est-deja (sans entrée) ; .frise-partants (ceux qui s'effacent, maj)
   Attention : m03, m04 et m06 ont déjà une classe .frise à elles ; les styles de base ne visent que .frise[data-frise]. */
const FRISE = (() => {
  'use strict';
  // le nom d'une semaine de résidence (règle 23), un texte de D
  const LIB_RESIDENCE = () => (typeof D !== 'undefined' && D && D.site && D.site.libelles && D.site.libelles.residence) || '';
  // une date déjà jouée (son repère évidé, en retrait) : le lecteur d'écran l'entend aussi, un texte de D
  const LIB_JOUEE = () => (typeof D !== 'undefined' && D && D.site && D.site.libelles && D.site.libelles.jouee) || '';
  const MOIS = typeof AGENDA !== 'undefined' && AGENDA.MOIS ? AGENDA.MOIS
    : ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const COUPE = (() => { try { return new URLSearchParams(location.search).get('anim') === '0'; } catch (e) { return false; } })();
  const permis = () => !COUPE && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }, A_ESC = /[&<>"]/;
  const esc = s => { s = String(s ?? ''); return A_ESC.test(s) ? s.replace(/[&<>"]/g, c => ESC[c]) : s; };
  const f3 = x => String(Math.round(x * 1000) / 1000);
  // le numéro du jour d'une date 'AAAA-MM-JJ' (UTC), gardé en mémoire : les mêmes dates reviennent à chaque rendu
  const memo = new Map();
  const jour = iso => {
    if (typeof iso !== 'string' || iso.length < 10) return NaN;
    let v = memo.get(iso);
    if (v === undefined) {
      v = /^\d{4}-\d{2}-\d{2}/.test(iso) ? Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5 : NaN;
      if (memo.size > 6000) memo.clear();
      memo.set(iso, v);
    }
    return v;
  };
  const jourDe = (a, m, j = 1) => Date.UTC(a, m - 1, j) / 864e5;
  const isoDe = n => new Date(n * 864e5).toISOString().slice(0, 10);
  const COURBE = 'cubic-bezier(.2, .7, .2, 1)';
  const libelleAujourdhui = () => (typeof D !== 'undefined' && D && D.site && D.site.libelles && D.site.libelles.aujourdhui) || '';

  /* ---------------------------------------------------------------------------------------------- les styles de base */
  const STYLE = `
:where(.frise[data-frise]) { --fr-encre: currentColor; --fr-trait: color-mix(in srgb, currentColor 30%, transparent); --fr-fond: #fff;
  --fr-accent: currentColor; --fr-passe: .38; --fr-point: 10px; --fr-couloir: 16px; --fr-haut: 26px; --fr-taille: 12px; --fr-police: inherit;
  --fr-courbe: ${COURBE}; --fr-bande-h: 46px; --fr-bulle-fond: #1d1418; --fr-bulle-encre: #fff; --fr-pied: 40px; --fr-marge: 14px;
  position: relative; display: block; font-family: var(--fr-police); color: var(--fr-encre); }
:where(.frise[data-frise]) :where(.frise-piste) { position: relative; overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: contain;
  scroll-snap-type: x proximity; scroll-padding-inline: var(--fr-marge); padding: 0 var(--fr-marge); scrollbar-width: thin; -webkit-overflow-scrolling: touch; outline: none; }
:where(.frise[data-frise]) :where(.frise-toile) { position: relative; width: 100%; min-width: calc(var(--fr-n) * var(--fr-unite));
  --fr-axe: calc(var(--fr-haut) + var(--fr-nc) * var(--fr-couloir)); height: calc(var(--fr-axe) + var(--fr-pied)); }
:where(.frise[data-frise].frise--annees) :where(.frise-toile) { --fr-axe: calc(var(--fr-haut) + var(--fr-bande-h)); }
:where(.frise[data-frise].frise--etiquettes) { --fr-couloir: 40px; }
:where(.frise[data-frise]) :where(.frise-axe) { position: absolute; left: 0; right: 0; top: var(--fr-axe); height: 1px; margin-top: -.5px;
  background: var(--fr-trait); transform-origin: 0 50%; }
:where(.frise[data-frise]) :where(.frise-mois, .frise-points, .frise-bandes, .frise-grappes) { list-style: none; margin: 0; padding: 0; }
:where(.frise[data-frise]) :where(.frise-points, .frise-bandes, .frise-grappes) { position: absolute; inset: 0; pointer-events: none; }
:where(.frise[data-frise]) :where(.frise-mois) > li { position: absolute; top: var(--fr-axe); left: calc(var(--fr-x) * 1%); height: 6px;
  border-left: 1px solid var(--fr-trait); scroll-snap-align: start; white-space: nowrap; font-size: var(--fr-taille); line-height: 1.2; }
:where(.frise[data-frise]) :where(.frise-mois) > li > span:first-child { position: absolute; left: 5px; top: 8px; }
:where(.frise[data-frise]) :where(.frise-mois) > li.est-mineur { height: 4px; scroll-snap-align: none; }
:where(.frise[data-frise]) :where(.frise-an) { display: block; opacity: .6; font-size: .92em; }
:where(.frise[data-frise]) :where(.frise-point, .frise-grappe, .frise-bande) { position: absolute; left: calc(var(--fr-x) * 1%);
  top: calc(var(--fr-axe) - var(--fr-y, 0) * var(--fr-couloir)); width: 0; height: 0; pointer-events: none; }
:where(.frise[data-frise]) :where(.frise-point.est-duree, .frise-bande) { width: calc(var(--fr-w) * 1%); }
:where(.frise[data-frise]) :where(.frise-repere) { position: absolute; left: 0; top: 0; width: 24px; height: 24px; margin: -12px 0 0 -12px; padding: 0;
  display: grid; place-items: center; border: 0; border-radius: 50%; background: none; color: inherit; font: inherit; cursor: pointer;
  pointer-events: auto; text-decoration: none; -webkit-tap-highlight-color: transparent; }
:where(.frise[data-frise]) :where(.frise-repere):focus-visible { outline: 2px solid var(--fr-accent); outline-offset: 1px; }
:where(.frise[data-frise]) :where(.frise-point) > :where(.frise-repere)::before { content: ""; display: block; width: var(--fr-point); height: var(--fr-point);
  border-radius: 50%; background: var(--fr-c, currentColor); box-shadow: 0 0 0 2px var(--fr-fond); transition: scale .16s var(--fr-courbe), opacity .16s; }
:where(.frise[data-frise]) :where(.frise-point) > :where(.frise-repere:hover, .frise-repere:focus-visible)::before,
:where(.frise[data-frise]) :where(.frise-point.est-allume, .frise-point.est-focus) > :where(.frise-repere)::before { scale: 1.45; }
:where(.frise[data-frise]) :where(.frise-point.est-passe) > :where(.frise-repere)::before { opacity: var(--fr-passe); }
:where(.frise[data-frise]) :where(.frise-point.est-passe.est-allume, .frise-point.est-passe.est-focus) > :where(.frise-repere)::before { opacity: 1; }
:where(.frise[data-frise]) :where(.frise-point.est-scolaire:not(.est-duree)) > :where(.frise-repere)::before { border-radius: 2px; rotate: 45deg; width: calc(var(--fr-point) * .86); height: calc(var(--fr-point) * .86); }
:where(.frise[data-frise]) :where(.frise-point.est-annule) > :where(.frise-repere)::before { background: var(--fr-fond); box-shadow: inset 0 0 0 1.5px var(--fr-c, currentColor), 0 0 0 2px var(--fr-fond); }
:where(.frise[data-frise]) :where(.frise-point.est-annule) > :where(.frise-repere)::after { content: ""; position: absolute; left: 50%; top: 50%; width: calc(var(--fr-point) + 6px);
  height: 1.5px; margin: -.75px 0 0 calc(var(--fr-point) / -2 - 3px); background: var(--fr-c, currentColor); rotate: -40deg; }
:where(.frise[data-frise]) :where(.frise-point.est-duree) > :where(.frise-repere) { width: 100%; min-width: 10px; height: 18px; margin: -9px 0 0; border-radius: 9px; place-items: center stretch; }
:where(.frise[data-frise]) :where(.frise-point.est-duree) > :where(.frise-repere)::before { width: auto; height: 6px; border-radius: 3px; }
:where(.frise[data-frise]) :where(.frise-point.est-duree.est-scolaire) > :where(.frise-repere)::before { background: var(--fr-fond); box-shadow: inset 0 0 0 1.5px var(--fr-c, currentColor); }
/* une semaine de résidence (règle 23) : un repère carré évidé ; une période, un trait en pointillé */
:where(.frise[data-frise]) :where(.frise-point.est-residence:not(.est-duree)) > :where(.frise-repere)::before { border-radius: 2px; background: var(--fr-fond); box-shadow: inset 0 0 0 2px var(--fr-c, currentColor), 0 0 0 2px var(--fr-fond); }
:where(.frise[data-frise]) :where(.frise-point.est-duree.est-residence) > :where(.frise-repere)::before { background: repeating-linear-gradient(90deg, var(--fr-c, currentColor) 0 5px, transparent 5px 9px); }
:where(.frise[data-frise]) :where(.frise-point.est-duree) > :where(.frise-repere:hover, .frise-repere:focus-visible)::before,
:where(.frise[data-frise]) :where(.frise-point.est-duree.est-allume) > :where(.frise-repere)::before { scale: 1 1.6; }
:where(.frise[data-frise]) :where(.frise-point.est-groupe) > :where(.frise-repere) { pointer-events: none; }
:where(.frise[data-frise]) :where(.frise-point.est-groupe) > :where(.frise-repere)::before { opacity: 0; }
:where(.frise[data-frise]) :where(.frise-grappe) > span { position: absolute; left: 0; top: 0; width: 22px; height: 22px; margin: -11px 0 0 -11px;
  display: grid; place-items: center; border-radius: 50%; pointer-events: auto; cursor: pointer;
  background: radial-gradient(closest-side, var(--fr-fond) 66%, transparent 69%), conic-gradient(var(--fr-g, currentColor));
  transition: scale .16s var(--fr-courbe); }
:where(.frise[data-frise]) :where(.frise-grappe.est-passe) > span { opacity: .6; }
:where(.frise[data-frise]) :where(.frise-grappe:hover, .frise-grappe.est-allume, .frise-grappe.est-focus) > span { scale: 1.25; opacity: 1; }
:where(.frise[data-frise]) :where(.frise-grappe-n) { font-size: 10.5px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
:where(.frise[data-frise].frise--etiquettes) :where(.frise-point) { top: var(--fr-axe); }
:where(.frise[data-frise]) :where(.frise-etiquette) { position: absolute; left: 20px; bottom: calc(20px + var(--fr-y, 0) * var(--fr-couloir)); width: max-content;
  max-width: 13em; font-size: var(--fr-taille); line-height: 1.25; text-align: left; pointer-events: none; }
:where(.frise[data-frise]) :where(.frise-etiquette)::before { content: ""; position: absolute; left: -8px; top: .3em; width: 1px;
  bottom: calc(-1 * (8px + var(--fr-y, 0) * var(--fr-couloir) - var(--fr-point) / 2 - 1px)); background: var(--fr-trait); }
:where(.frise[data-frise]) :where(.est-a-droite) :where(.frise-etiquette) { left: auto; right: 20px; text-align: right; }
:where(.frise[data-frise]) :where(.est-a-droite) :where(.frise-etiquette)::before { left: auto; right: -8px; }
:where(.frise[data-frise]) :where(.frise-bande) > :where(.frise-repere) { width: 100%; height: var(--fr-bande-h); margin: calc(-1 * var(--fr-bande-h)) 0 0;
  border-radius: 0; place-items: end stretch; padding: 0 2px; }
:where(.frise[data-frise]) :where(.frise-bande-barre) { display: block; height: var(--fr-bande-h); background: var(--fr-c, currentColor); opacity: .8;
  transform-origin: 50% 100%; transform: scaleY(max(.04, var(--fr-d, 0))); transition: transform .3s var(--fr-courbe), opacity .16s; }
:where(.frise[data-frise]) :where(.frise-bande-n) { position: absolute; left: 0; right: 0; bottom: calc(var(--fr-d, 0) * var(--fr-bande-h) + 3px);
  text-align: center; font-size: var(--fr-taille); font-variant-numeric: tabular-nums; transition: bottom .3s var(--fr-courbe); }
:where(.frise[data-frise]) :where(.frise-bande-nom) { position: absolute; left: 0; right: 0; top: calc(var(--fr-bande-h) + 8px); text-align: center;
  font-size: calc(var(--fr-taille) - 1px); white-space: nowrap; font-variant-numeric: tabular-nums; }
:where(.frise[data-frise]) :where(.frise-bande.est-allume, .frise-bande:hover) :where(.frise-bande-barre) { opacity: 1; }
:where(.frise[data-frise]) :where(.frise-bande.est-passe) :where(.frise-bande-barre) { opacity: .5; }
:where(.frise[data-frise]) :where(.frise-aujourdhui) { position: absolute; left: calc(var(--fr-x) * 1%); top: 0; width: 0; height: var(--fr-axe); pointer-events: none; }
:where(.frise[data-frise]) :where(.frise-aujourdhui)::before { content: ""; position: absolute; left: -.5px; top: 16px; bottom: 0; width: 1px;
  background: var(--fr-accent); opacity: .55; }
:where(.frise[data-frise]) :where(.frise-aujourdhui)::after { content: ""; position: absolute; left: -4px; bottom: -4px; width: 8px; height: 8px;
  border-radius: 50%; background: var(--fr-accent); }
:where(.frise[data-frise]) :where(.frise-aujourdhui-nom) { position: absolute; left: 0; top: 1px; translate: -50% 0; white-space: nowrap;
  font-size: calc(var(--fr-taille) - 1px); line-height: 1.3; font-weight: 600; letter-spacing: .04em; color: var(--fr-accent); }
:where(.frise[data-frise]) :where(.frise-aujourdhui.est-bord-g) :where(.frise-aujourdhui-nom) { translate: -6px 0; }
:where(.frise[data-frise]) :where(.frise-aujourdhui.est-bord-d) :where(.frise-aujourdhui-nom) { translate: calc(-100% + 6px) 0; }
:where(.frise[data-frise]) :where(.frise-souffle) { position: absolute; left: -4px; bottom: -4px; width: 8px; height: 8px; border-radius: 50%;
  background: var(--fr-accent); opacity: 0; }
:where(.frise[data-frise]) :where(.frise-bulle) { position: absolute; z-index: 6; left: 0; top: 0; width: max-content; max-width: min(300px, 86vw);
  margin: 0; padding: 8px 11px 9px; border-radius: 6px; background: var(--fr-bulle-fond); color: var(--fr-bulle-encre); font-size: 13px; line-height: 1.35;
  pointer-events: none; opacity: 0; visibility: hidden; translate: var(--fr-bx, 0) var(--fr-by, 0); transition: opacity .12s, visibility 0s .12s; }
:where(.frise[data-frise]) :where(.frise-bulle.est-ouverte) { opacity: 1; visibility: visible; transition: opacity .12s; }
:where(.frise[data-frise]) :where(.frise-bulle) :where(ul) { list-style: none; margin: 0; padding: 0; display: grid; gap: 5px; }
:where(.frise[data-frise]) :where(.frise-bulle) :where(b, span) { display: block; }
:where(.frise[data-frise]) :where(.frise-bulle) :where(i) { display: inline-block; width: 8px; height: 8px; margin-right: 6px; border-radius: 50%; background: var(--fr-c); }
:where(.frise[data-frise]) :where(.frise-bulle) :where(.frise-bulle-ou, .frise-bulle-etat) { opacity: .78; }
/* verticale */
:where(.frise[data-frise].frise--v) :where(.frise-piste) { overflow: visible; padding: 14px 0; }
:where(.frise[data-frise].frise--v) :where(.frise-toile) { min-width: 0; height: max(var(--fr-hauteur, 480px), calc(var(--fr-n) * 34px)); width: 100%;
  --fr-axe: 64px; }
:where(.frise[data-frise].frise--v) :where(.frise-axe) { left: var(--fr-axe); right: auto; top: 0; bottom: 0; width: 1px; height: auto; margin: 0 0 0 -.5px; transform-origin: 50% 0; }
:where(.frise[data-frise].frise--v) :where(.frise-mois) > li { top: calc(var(--fr-x) * 1%); left: 0; width: var(--fr-axe); height: 0; border-left: 0;
  border-top: 1px solid var(--fr-trait); }
:where(.frise[data-frise].frise--v) :where(.frise-mois) > li > span:first-child { left: 0; top: 2px; }
:where(.frise[data-frise].frise--v) :where(.frise-point, .frise-grappe) { left: calc(var(--fr-axe) + var(--fr-y, 0) * var(--fr-couloir)); top: calc(var(--fr-x) * 1%); width: 0; height: 0; }
:where(.frise[data-frise].frise--v) :where(.frise-etiquette) { left: 14px; bottom: auto; top: -.65em; }
:where(.frise[data-frise].frise--v) :where(.frise-aujourdhui) { left: 0; right: 0; top: calc(var(--fr-x) * 1%); width: auto; height: 0; }
:where(.frise[data-frise].frise--v) :where(.frise-aujourdhui)::before { left: var(--fr-axe); right: 0; top: -.5px; bottom: auto; width: auto; height: 1px; }
:where(.frise[data-frise].frise--v) :where(.frise-aujourdhui)::after, :where(.frise[data-frise].frise--v) :where(.frise-souffle) { left: calc(var(--fr-axe) - 4px); top: -4px; bottom: auto; }
:where(.frise[data-frise].frise--v) :where(.frise-aujourdhui-nom) { left: auto; right: 0; top: -1.4em; translate: none; }
/* le mouvement : l'axe se trace, les repères arrivent dans l'ordre du temps, aujourd'hui respire */
:where(.frise[data-frise]:not(.est-immobile):not(.est-vue)) :where(.frise-axe) { transform: scaleX(0); }
:where(.frise[data-frise].frise--v:not(.est-immobile):not(.est-vue)) :where(.frise-axe) { transform: scaleY(0); }
:where(.frise[data-frise]:not(.est-immobile):not(.est-vue)) :where(.frise-aujourdhui, .frise-mois) { opacity: 0; }
:where(.frise[data-frise]:not(.est-immobile):not(.est-vue)) :where(.frise-points, .frise-bandes, .frise-grappes) { clip-path: inset(-80px 100% -80px -30px); }
:where(.frise[data-frise].frise--v:not(.est-immobile):not(.est-vue)) :where(.frise-points, .frise-grappes) { clip-path: inset(-30px -300px 100% -80px); }
:where(.frise[data-frise].est-vue:not(.est-immobile)) :where(.frise-axe) { animation: fr-trace .7s var(--fr-courbe) both; }
:where(.frise[data-frise].est-vue:not(.est-immobile)) :where(.frise-mois) { animation: fr-parait .5s var(--fr-courbe) .1s both; }
:where(.frise[data-frise].est-vue:not(.est-immobile)) :where(.frise-points, .frise-bandes, .frise-grappes) { animation: fr-devoile .78s var(--fr-courbe) .06s backwards; }
:where(.frise[data-frise].frise--v.est-vue:not(.est-immobile)) :where(.frise-points, .frise-grappes) { animation-name: fr-devoile-v; }
:where(.frise[data-frise].est-vue:not(.est-immobile)) :where(.frise-aujourdhui) { animation: fr-parait .4s var(--fr-courbe) .45s both; }
:where(.frise[data-frise].est-vue:not(.est-immobile)) :where(.frise-souffle) { animation: fr-respire 2.6s ease-in-out 1s infinite; }
:where(.frise[data-frise].est-deja) :where(.frise-axe, .frise-mois, .frise-points, .frise-bandes, .frise-grappes, .frise-aujourdhui) { animation: none; }
@keyframes fr-trace { from { transform: scale(0, 1); } to { transform: none; } }
@keyframes fr-parait { from { opacity: 0; } }
@keyframes fr-devoile { from { clip-path: inset(-80px 100% -80px -30px); } to { clip-path: inset(-80px -30px -80px -30px); } }
@keyframes fr-devoile-v { from { clip-path: inset(-30px -300px 100% -80px); } to { clip-path: inset(-30px -300px -30px -80px); } }
@keyframes fr-respire { 0% { opacity: .55; scale: 1; } 70%, 100% { opacity: 0; scale: 3.2; } }
:where(.frise[data-frise].frise--v.est-vue:not(.est-immobile)) :where(.frise-axe) { animation-name: fr-trace-v; }
@keyframes fr-trace-v { from { transform: scale(1, 0); } to { transform: none; } }
:where(.frise[data-frise].est-immobile) *, :where(.frise[data-frise].est-immobile) *::before, :where(.frise[data-frise].est-immobile) *::after { animation: none !important; transition: none !important; }
@media (prefers-reduced-motion: reduce) { :where(.frise[data-frise]) *, :where(.frise[data-frise]) *::before, :where(.frise[data-frise]) *::after { animation: none !important; transition: none !important; } }`;
  function styles() {
    if (document.getElementById('frise-style')) return;
    const s = document.createElement('style');
    s.id = 'frise-style';
    s.textContent = STYLE;
    document.head.insertBefore(s, document.head.firstChild);   // en tête : la maquette passe après
  }
  // posée dès le chargement (comme reserver.js) : le premier geste vers une page à frise n'ajoute plus de feuille, ni ne
  // recalcule le style de toute la page
  if (typeof document !== 'undefined' && document.head) styles();

  /* ---------------------------------------------------------------------------------------------- les observateurs (partagés) */
  const vivantes = new Set();
  let io = null, ro = null;
  function observer(f) {
    if (!io && 'IntersectionObserver' in window) io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const x = e.target.__frise; if (x) x.voir(); io.unobserve(e.target); } }), { threshold: .15 });
    if (!ro && 'ResizeObserver' in window) ro = new ResizeObserver(es => es.forEach(e => { const x = e.target.__frise; if (x) x.mesure(e.contentRect.width); }));
    if (io && !f.immobile && !f.vu) io.observe(f.el); else f.voir();
    if (ro) ro.observe(f.piste);
    // les frises retirées de la page (une vue refaite) : on cesse de les observer
    vivantes.forEach(x => { if (!x.el.isConnected) x.fin(); });
    vivantes.add(f);
  }

  /* ---------------------------------------------------------------------------------------------- l'échelle */
  function bornes(o, pts) {
    let t0, t1;
    const deSaison = (s, fin) => { const m = /^(\d{4})-(\d{4})$/.exec(String(s || '')); return m ? jourDe(fin ? +m[2] : +m[1], 9, 1) : NaN; };
    if (o.echelle === 'saison') {
      const a = +(String(o.saison || '').slice(0, 4)) || (() => { const n = jour(o.aujourdhui) || Date.now() / 864e5, d = new Date(n * 864e5); return d.getUTCMonth() >= 8 ? d.getUTCFullYear() : d.getUTCFullYear() - 1; })();
      t0 = jourDe(a, 9, 1); t1 = jourDe(a + 1, 9, 1);
    } else if (o.echelle === 'annees') {
      t0 = /^\d{4}-\d{4}$/.test(o.debut || '') ? deSaison(o.debut) : jour(o.debut);
      t1 = /^\d{4}-\d{4}$/.test(o.fin || '') ? deSaison(o.fin, true) : jour(o.fin);
      const bs = (o.bandes || []).map(b => [jour(b.debut), jour(b.fin) + 1]).filter(x => x.every(isFinite));
      if (!isFinite(t0)) t0 = bs.length ? Math.min(...bs.map(x => x[0])) : NaN;
      if (!isFinite(t1)) t1 = bs.length ? Math.max(...bs.map(x => x[1])) : NaN;
    } else {
      t0 = jour(o.debut); t1 = isFinite(jour(o.fin)) ? jour(o.fin) + 1 : NaN;
    }
    if (!isFinite(t0) || !isFinite(t1)) {
      const js = pts.flatMap(p => [p.a, p.b]).filter(isFinite);
      if (!js.length) { const n = jour(o.aujourdhui) || Math.floor(Date.now() / 864e5); js.push(n); }
      const mn = Math.min(...js), mx = Math.max(...js), d0 = new Date(mn * 864e5), d1 = new Date(mx * 864e5);
      const longue = mx - mn > 730;
      if (!isFinite(t0)) t0 = longue ? jourDe(d0.getUTCFullYear(), 1, 1) : jourDe(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1);
      if (!isFinite(t1)) t1 = longue ? jourDe(d1.getUTCFullYear() + 1, 1, 1) : jourDe(d1.getUTCFullYear(), d1.getUTCMonth() + 2, 1);
    }
    if (t1 <= t0) t1 = t0 + 31;
    return [t0, t1];
  }
  // les graduations : les mois (une échelle courte) ou les années, nommés d'après les dates
  function graduations(t0, t1, o) {
    const out = [], d = new Date(t0 * 864e5), mois = (t1 - t0) <= 760 && o.echelle !== 'annees';
    let a = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
    if (mois) {
      if (d.getUTCDate() !== 1) { m++; if (m > 12) { m = 1; a++; } }
      for (let n = jourDe(a, m, 1), premier = true; n < t1; premier = false) {
        out.push({ n, nom: MOIS[m - 1], an: premier || m === 1 ? String(a) : '' });
        m++; if (m > 12) { m = 1; a++; }
        n = jourDe(a, m, 1);
      }
      return { mois: true, ticks: out, unites: (t1 - t0) / 30.44 };
    }
    // les années : au 1er janvier (ou au 1er septembre, en échelle annees) ; des mois mineurs si la place le permet
    const sept = o.echelle === 'annees', mineurs = (t1 - t0) <= 365.25 * 9;
    let n = sept ? jourDe(d.getUTCMonth() >= 8 ? a : a - 1, 9, 1) : jourDe(a, 1, 1);
    if (n < t0) n = sept ? jourDe(new Date(n * 864e5).getUTCFullYear() + 1, 9, 1) : jourDe(a + 1, 1, 1);
    for (; n < t1; n = jourDe(new Date(n * 864e5).getUTCFullYear() + 1, sept ? 9 : 1, 1)) {
      const y = new Date(n * 864e5).getUTCFullYear();
      out.push({ n, nom: sept ? '' : String(y), an: '' });
    }
    if (mineurs && !sept) {
      for (let y = a, mm = m; ; ) {
        mm++; if (mm > 12) { mm = 1; y++; }
        const k = jourDe(y, mm, 1);
        if (k >= t1) break;
        if (mm !== 1 && k > t0) out.push({ n: k, nom: '', an: '', mineur: true });
      }
      out.sort((x, y) => x.n - y.n);
    }
    return { mois: false, ticks: out, unites: (t1 - t0) / 365.25 };
  }

  /* ---------------------------------------------------------------------------------------------- le modèle */
  const nomLieu = l => (typeof CARTE !== 'undefined' && l != null && CARTE.lieux && CARTE.lieux[l]) ? CARTE.nom(CARTE.lieux[l]) : '';
  function quandDe(p) {
    if (p.quand) return String(p.quand);
    if (p.annee) return String(p.annee);
    if (typeof AGENDA === 'undefined' || !p.jour) return p.jour || '';
    const longue = p.fin && p.fin !== p.jour;
    return AGENDA.quand({ precision: p.precision === 'month' || p.precision === 'mois' ? 'mois' : 'periode', debut: p.jour, fin: longue ? p.fin : p.jour }, []);
  }
  const cleDe = (p, i) => p.id != null && p.id !== '' ? `i:${p.id}` : `p:${p.jour}|${p.fin || ''}|${p.titre || ''}|${p.l ?? ''}|${i}`;
  // les points lus une fois : leurs jours de début et de fin (a, b) ; ceux sans date valable sont écartés
  function lire(points) {
    const out = [];
    (points || []).forEach((p, i) => {
      const a0 = jour(p.jour), a = a0 === a0 ? a0 : (p.annee ? jourDe(+p.annee, 7, 1) : NaN);
      if (a !== a) return;
      const b0 = jour(p.fin), b = b0 === b0 ? Math.max(a, b0) : a;
      out.push({ p, i, a, b, cle: cleDe(p, i) });
    });
    return out;
  }
  // les points, placés : x (en % de la toile), couloir, grappe ; W : la largeur de la toile en px
  function placer(o, W, t0, t1, lus) {
    const span = t1 - t0, pct = n => (n - t0) / span * 100, pxJour = W / span, aujourd = jour(o.aujourdhui);
    const pts = lus.map(x => ({ p: x.p, i: x.i, a: x.a, b: x.b, cle: x.cle }));
    pts.sort((x, y) => x.a - y.a || x.b - y.b || x.i - y.i);
    const vertical = o.orientation === 'verticale', point = 10, gap = 4;
    pts.forEach((q, k) => {
      const jours = q.b - q.a + 1;
      q.duree = !q.p.annee && jours * pxJour >= point * 2.2;
      q.x = q.duree ? pct(q.a) : pct((q.a + q.b + 1) / 2);
      q.w = q.duree ? jours / span * 100 : 0;
      q.passe = isFinite(aujourd) && q.b < aujourd;
      q.t = pts.length > 1 ? k / (pts.length - 1) : 0;
      q.s = q.duree ? q.x / 100 * W : q.x / 100 * W - point / 2;
      q.e = q.duree ? (q.x + q.w) / 100 * W : q.x / 100 * W + point / 2;
      if (o.etiquettes && !vertical) {
        const larg = Math.min(o.largeurMax || 170, 8 + String(q.p.titre || '').length * (o.largeurCar || 6.6));
        q.droite = q.x > 72;
        if (q.droite) { q.s = q.x / 100 * W - larg - 22; q.e = q.x / 100 * W + 6; } else { q.s = q.x / 100 * W - 6; q.e = q.x / 100 * W + larg + 22; }
      }
    });
    // les grappes : des repères d'un jour (ni traits ni étiquettes) trop proches
    const grappes = [];
    if (!o.etiquettes) {
      // de proche en proche, mais jamais plus large que trois fois le seuil (des repères très denses font plusieurs grappes)
      let g = null;
      const seuil = o.regrouper ?? 14;
      // une résidence n'entre dans aucune grappe (règle 23) : son repère évidé reste à lui, le chiffre d'une grappe ne la compte pas
      pts.filter(q => !q.duree && !q.p.residence).forEach(q => {
        const xpx = q.x / 100 * W;
        if (g && xpx - g.dernier < seuil && xpx - g.debut < seuil * 3) { g.membres.push(q); g.dernier = xpx; }
        else { g = { membres: [q], dernier: xpx, debut: xpx }; grappes.push(g); }
      });
    }
    const vraies = grappes.filter(g => g.membres.length > 1).map(g => {
      const xs = g.membres.map(q => q.x), x = (Math.min(...xs) + Math.max(...xs)) / 2;
      const r = { cle: 'g:' + g.membres[0].cle, membres: g.membres, x, a: g.membres[0].a, passe: g.membres.every(q => q.passe), t: g.membres[0].t };
      r.s = x / 100 * W - 11; r.e = x / 100 * W + 11;
      g.membres.forEach(q => { q.grappe = r; });
      return r;
    });
    // les couloirs : les éléments qui se chevauchent montent d'un cran (la grappe tient lieu de ses membres)
    const elems = [...pts.filter(q => !q.grappe), ...vraies].sort((x, y) => x.s - y.s);
    const fins = [], max = Math.max(1, o.couloirs ?? 3);
    elems.forEach(e => {
      let c = fins.findIndex(f => f + gap <= e.s);
      if (c < 0) { if (fins.length < max) c = fins.length; else c = fins.indexOf(Math.min(...fins)); }
      fins[c] = Math.max(fins[c] ?? -Infinity, e.e);
      e.y = c;
    });
    vraies.forEach(r => r.membres.forEach(q => { q.y = r.y; q.xg = r.x; }));
    const nc = Math.max(1, fins.length);
    return { pts, grappes: vraies, nc };
  }
  const signature = m => m.pts.map(q => `${q.cle}:${q.y}:${q.grappe ? q.grappe.cle : ''}`).join(',');

  /* ---------------------------------------------------------------------------------------------- une frise */
  let nFrises = 0;
  function creer(conteneur, options = {}) {
    styles();
    const id = 'frise-' + (++nFrises);
    let o = Object.assign({ echelle: 'periode', orientation: 'auto', regrouper: 14, couloirs: 3, moisMin: 76, anMin: 72 }, options);
    const el = document.createElement('div');
    el.setAttribute('data-frise', '');
    el.innerHTML = `<div class="frise-piste"><div class="frise-toile"></div></div><div class="frise-bulle" role="tooltip" id="${id}-bulle"></div>`;
    const piste = el.firstElementChild, toile = piste.firstElementChild, bulle = el.lastElementChild;
    const f = { el, piste, immobile: !permis(), vu: !!o.immediat, deja: !!o.immediat, W: 0, mois: true, modele: null, lumiere: [], ecouteurs: [] };
    el.__frise = f; piste.__frise = f;
    let largeur = o.largeur || Math.max(280, Math.min(innerWidth - 32, 1240));

    function classes() {
      const v = o.orientation === 'verticale';
      el.className = ['frise', `frise--${o.echelle}`, v ? 'frise--v' : 'frise--h', f.mois ? 'frise--mois' : 'frise--ans', o.etiquettes ? 'frise--etiquettes' : '', o.classe || '',
        f.immobile ? 'est-immobile' : '', f.vu ? 'est-vue' : '', f.deja ? 'est-deja' : ''].filter(Boolean).join(' ');
    }
    /* le rendu : une chaîne, un innerHTML */
    function rendre(animer) {
      const avant = f.modele;
      // refaite après avoir été vue (maj, largeur) : l'entrée ne se rejoue pas, seuls les repères glissent
      if (avant && f.vu) f.deja = true;
      const v = o.orientation === 'verticale';
      const lus = lire(o.points);
      const [t0, t1] = bornes(o, lus), span = t1 - t0, pct = n => (n - t0) / span * 100;
      const G = graduations(t0, t1, o);
      const unite = G.mois ? o.moisMin : o.anMin;
      const W = v ? (o.hauteur || 480) : Math.max(largeur, G.unites * unite);
      const M = placer(o, W, t0, t1, lus);
      f.W = W; f.t0 = t0; f.t1 = t1; f.mois = G.mois;
      const auj = jour(o.aujourdhui), dansEchelle = isFinite(auj) && auj >= t0 && auj < t1;
      const L = libelleAujourdhui();
      // la graduation
      const ticks = G.ticks.map(t => `<li${t.mineur ? ' class="est-mineur"' : ''} style="--fr-x:${f3(pct(t.n))}">${t.nom || t.an ? `<span>${t.nom ? `<span class="frise-mois-nom">${esc(t.nom)}</span>` : ''}${t.an ? `<span class="frise-an">${esc(t.an)}</span>` : ''}</span>` : ''}</li>`).join('');
      // les repères
      const courant = M.pts.find(q => !q.passe) || M.pts[M.pts.length - 1];
      const lieux = new Map(), lieu = l => { if (l == null) return ''; let n = lieux.get(l); if (n === undefined) { n = nomLieu(l); lieux.set(l, n); } return n; };
      const nom = q => { const p = q.p, c = lieu(p.l) || p.commune || ''; let s = quandDe(p); if (p.titre) s += (s ? ', ' : '') + p.titre; if (c) s += ', ' + c; if (p.residence && LIB_RESIDENCE()) s += ', ' + LIB_RESIDENCE(); if (p.etat) s += ', ' + p.etat;
        else if (q.passe && !p.residence && !p.annulee && LIB_JOUEE()) s += ', ' + LIB_JOUEE(); return s; };
      const repere = (q) => {
        const p = q.p, cls = 'frise-point' + (q.passe ? ' est-passe' : '') + (p.scolaire ? ' est-scolaire' : '') + (p.residence ? ' est-residence' : '') + (p.annulee ? ' est-annule' : '') + (q.duree ? ' est-duree' : '')
          + (q.grappe ? ' est-groupe' : '') + (q.droite ? ' est-a-droite' : '');
        const x = q.grappe ? q.xg : q.x, tab = q === courant ? '0' : '-1';
        const etiq = o.etiquettes && p.titre ? `<span class="frise-etiquette">${esc(p.titre)}</span>` : '';
        const dedans = etiq;
        const att = `class="frise-repere" tabindex="${tab}" aria-label="${esc(nom(q))}"`;
        return `<li class="${cls}" data-frise-cle="${esc(q.cle)}"${p.id != null && p.id !== '' ? ` data-id="${esc(p.id)}"` : ''} style="--fr-x:${f3(x)};--fr-y:${q.y || 0};--fr-t:${f3(q.t)}${q.duree ? `;--fr-w:${f3(q.w)}` : ''}${p.couleur ? `;--fr-c:${esc(p.couleur)}` : ''}">${p.lien ? `<a ${att} href="${esc(p.lien)}">${dedans}</a>` : `<button type="button" ${att}>${dedans}</button>`}</li>`;
      };
      const grappe = g => {
        const cs = g.membres.map(q => q.p.couleur || 'currentColor'), n = cs.length, pas = 100 / n;
        const conique = cs.map((c, i) => `${esc(c)} ${f3(i * pas)}% ${f3((i + 1) * pas)}%`).join(', ');
        return `<li class="frise-grappe${g.passe ? ' est-passe' : ''}" data-frise-cle="${esc(g.cle)}" style="--fr-x:${f3(g.x)};--fr-y:${g.y || 0};--fr-t:${f3(g.t)};--fr-g:${conique}"><span><span class="frise-grappe-n">${n}</span></span></li>`;
      };
      // les bandes (les saisons et leur densité)
      const bandes = (o.bandes || []).map((b, i) => { const a = jour(b.debut), z = jour(b.fin); return { b, i, a, z }; }).filter(x => isFinite(x.a) && isFinite(x.z));
      const nMax = Math.max(1, ...bandes.map(x => +x.b.n || 0));
      const bande = (x, k) => {
        const b = x.b, n = +b.n || 0, passe = isFinite(auj) && x.z < auj;
        const nomB = b.etiquette != null ? String(b.etiquette) : `${new Date(x.a * 864e5).getUTCFullYear()}-${new Date((x.z) * 864e5).getUTCFullYear()}`;
        const att = `class="frise-repere" tabindex="${k === bandes.length - 1 ? '0' : '-1'}" aria-label="${esc([b.titre || nomB, n ? String(n) : ''].filter(Boolean).join(' : '))}"`;
        const dedans = `<span class="frise-bande-barre"></span>${n ? `<span class="frise-bande-n">${n}</span>` : ''}<span class="frise-bande-nom">${esc(nomB)}</span>`;
        return `<li class="frise-bande${passe ? ' est-passe' : ''}" data-frise-cle="b:${esc(b.id ?? x.i)}"${b.id != null ? ` data-id="${esc(b.id)}"` : ''} style="--fr-x:${f3(pct(x.a))};--fr-w:${f3((x.z + 1 - x.a) / span * 100)};--fr-d:${f3(n / nMax)};--fr-t:${f3(bandes.length > 1 ? k / (bandes.length - 1) : 0)}${b.couleur ? `;--fr-c:${esc(b.couleur)}` : ''}">${b.lien ? `<a ${att} href="${esc(b.lien)}">${dedans}</a>` : `<button type="button" ${att}>${dedans}</button>`}</li>`;
      };
      const xa = dansEchelle ? pct(auj + .5) : 0;
      const aujourdhui = dansEchelle ? `<div class="frise-aujourdhui${xa < 6 ? ' est-bord-g' : xa > 94 ? ' est-bord-d' : ''}" style="--fr-x:${f3(xa)}">${L ? `<span class="frise-aujourdhui-nom">${esc(L)}</span>` : ''}<span class="frise-souffle"></span></div>` : '';
      const libelle = o.libelle ? ` aria-label="${esc(o.libelle)}"` : '';
      toile.style.cssText = `--fr-n:${f3(G.unites)};--fr-unite:${unite}px;--fr-nc:${o.echelle === 'annees' ? 1 : M.nc}`;
      classes();
      // ceux qui partent (maj), gardés pour s'effacer
      const partants = animer && avant ? [...toile.querySelectorAll('[data-frise-cle]')].filter(n => !M.pts.some(q => q.cle === n.dataset.friseCle) && !M.grappes.some(g => g.cle === n.dataset.friseCle) && !n.classList.contains('frise-bande')) : [];
      toile.innerHTML = `<div class="frise-axe"></div><ol class="frise-mois" aria-hidden="true">${ticks}</ol>${aujourdhui}
        ${bandes.length ? `<ol class="frise-bandes"${libelle}>${bandes.map(bande).join('')}</ol>` : ''}
        ${M.pts.length ? `<ol class="frise-points"${bandes.length ? '' : libelle}>${M.pts.map(repere).join('')}</ol>` : ''}
        ${M.grappes.length ? `<ol class="frise-grappes" aria-hidden="true">${M.grappes.map(grappe).join('')}</ol>` : ''}`;
      f.modele = { M, bandes, nc: M.nc, sig: signature(M), dens: new Map(bandes.map(x => [`b:${x.b.id ?? x.i}`, (+x.b.n || 0) / nMax])), pos: new Map([...M.pts.map(q => [q.cle, { x: q.grappe ? q.xg : q.x, y: q.y || 0 }]), ...M.grappes.map(g => [g.cle, { x: g.x, y: g.y || 0 }])]) };
      if (animer && avant && !f.immobile && f.vu) glisser(avant, partants);
      return M;
    }
    // FLIP sans lecture de mise en page : les positions d'avant et d'après sont dans le modèle (en % de la toile, dont la
    // largeur f.W est tenue à jour par ResizeObserver, et en couloirs) ; seuls transform et opacity bougent
    function glisser(avant, partants) {
      if (o.orientation === 'verticale') return;
      const opts = { duration: 320, easing: COURBE }, W = f.W, nc0 = avant.nc, nc1 = f.modele.nc;
      toile.querySelectorAll('[data-frise-cle]').forEach(n => {
        const k = n.dataset.friseCle;
        if (n.classList.contains('frise-bande')) {
          const d0 = avant.dens && avant.dens.get(k), d1 = f.modele.dens.get(k);
          if (d0 == null || d1 == null || d0 === d1) return;
          const barre = n.querySelector('.frise-bande-barre'), nb = n.querySelector('.frise-bande-n');
          if (barre) barre.animate([{ transform: `scaleY(${Math.max(.04, d0)})` }, { transform: `scaleY(${Math.max(.04, d1)})` }], opts);
          if (nb) nb.animate([{ transform: `translateY(calc(${f3(d1 - d0)} * var(--fr-bande-h)))` }, { transform: 'none' }], opts);
          return;
        }
        const a = avant.pos.get(k), b = f.modele.pos.get(k);
        if (a && b) {
          if (a.x === b.x && a.y === b.y && nc0 === nc1) return;
          n.animate([{ transform: `translate(${f3((a.x - b.x) / 100 * W)}px, calc(${(nc0 - nc1) - (a.y - b.y)} * var(--fr-couloir)))` }, { transform: 'none' }], opts);
        } else if (!a) n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out', delay: 60, fill: 'backwards' });
      });
      if (partants.length) {
        const calque = document.createElement('div');
        calque.className = 'frise-partants';
        calque.setAttribute('aria-hidden', 'true');
        calque.style.cssText = 'position:absolute;inset:0;pointer-events:none';
        partants.forEach(n => { n.querySelectorAll('[tabindex]').forEach(x => x.setAttribute('tabindex', '-1')); calque.appendChild(n); });
        toile.appendChild(calque);
        const an = calque.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-in', fill: 'forwards' });
        an.onfinish = () => calque.remove();
      }
    }

    /* la lumière : un repère allumé, sa ligne dans la liste, sa commune sur la carte */
    const R = o.relier || {};
    const ligneDe = id => {
      if (!R.liste || id == null || id === '') return [];
      const e = CSS.escape(String(id));
      const l = R.liste.querySelectorAll(`[data-frise-id="${e}"]`);
      return l.length ? [...l] : [...R.liste.querySelectorAll(`[data-date-id="${e}"]`)];
    };
    function eteindre() {
      f.lumiere.forEach(n => n.classList.remove('est-allume'));
      f.lumiere = [];
    }
    function allumer(cle, { liste = true, carte = true } = {}) {
      eteindre();
      const M = f.modele && f.modele.M; if (!M) return;
      let qs = [];
      if (cle && typeof cle === 'object' && 'l' in cle) qs = M.pts.filter(q => q.p.l != null && q.p.l === cle.l);
      else qs = M.pts.filter(q => String(q.p.id) === String(cle) || q.cle === cle);
      const lis = [];
      qs.forEach(q => {
        const li = toile.querySelector(`[data-frise-cle="${CSS.escape(q.cle)}"]`); if (li) lis.push(li);
        if (q.grappe) { const g = toile.querySelector(`[data-frise-cle="${CSS.escape(q.grappe.cle)}"]`); if (g) lis.push(g); }
        if (liste) lis.push(...ligneDe(q.p.id));
      });
      const bs = (f.modele.bandes || []).filter(x => String(x.b.id) === String(cle));
      bs.forEach(x => { const li = toile.querySelector(`[data-frise-cle="b:${CSS.escape(String(x.b.id ?? x.i))}"]`); if (li) lis.push(li); if (liste) lis.push(...ligneDe(x.b.id)); });
      if (carte && R.carte && typeof R.carte !== 'function' && qs.length) {
        const ls = new Set(qs.map(q => q.p.l).filter(l => l != null));
        ls.forEach(l => R.carte.querySelectorAll(`.carte-lieu[data-l="${l}"]`).forEach(n => lis.push(n)));
      }
      lis.forEach(n => n.classList.add('est-allume'));
      f.lumiere = lis;
    }
    // la bulle, au-dessus du repère (une lecture de mise en page par survol)
    function montrer(cible, qs) {
      if (!qs.length) { bulle.classList.remove('est-ouverte'); return; }
      const ligne = q => { const p = q.p, c = nomLieu(p.l) || p.commune || '';
        return `<b>${esc(quandDe(p))}</b>${p.titre ? `<span>${p.couleur ? `<i style="--fr-c:${esc(p.couleur)}"></i>` : ''}${esc(p.titre)}</span>` : ''}${c ? `<span class="frise-bulle-ou">${esc(c)}</span>` : ''}${p.texte ? `<span class="frise-bulle-ou">${esc(p.texte)}</span>` : ''}${p.etat ? `<span class="frise-bulle-etat">${esc(p.etat)}</span>` : ''}`; };
      bulle.innerHTML = qs.length === 1 ? ligne(qs[0]) : `<ul>${qs.slice(0, 8).map(q => `<li>${ligne(q)}</li>`).join('')}</ul>`;
      const r = cible.getBoundingClientRect(), E = el.getBoundingClientRect(), bw = bulle.offsetWidth, bh = bulle.offsetHeight;
      let x = r.left + r.width / 2 - E.left - bw / 2;
      x = Math.max(-E.left + 8, Math.min(x, innerWidth - E.left - bw - 8));
      let y = r.top - E.top - bh - 10;
      if (r.top - bh - 10 < 8) y = r.bottom - E.top + 10;
      bulle.style.setProperty('--fr-bx', `${Math.round(x)}px`);
      bulle.style.setProperty('--fr-by', `${Math.round(y)}px`);
      bulle.classList.add('est-ouverte');
    }
    const cacher = () => bulle.classList.remove('est-ouverte');
    const qDe = n => {
      const M = f.modele && f.modele.M; if (!M || !n) return null;
      const li = n.closest('[data-frise-cle]'); if (!li) return null;
      const k = li.dataset.friseCle;
      if (k.startsWith('g:')) { const g = M.grappes.find(x => x.cle === k); return g ? { grappe: g } : null; }
      if (k.startsWith('b:')) { const x = (f.modele.bandes || []).find(y => `b:${y.b.id ?? y.i}` === k); return x ? { bande: x.b } : null; }
      const q = M.pts.find(x => x.cle === k); return q ? { q } : null;
    };
    let survole = null;
    function entrer(n, focus) {
      const r = qDe(n); if (!r) return;
      const cle = n.closest('[data-frise-cle]').dataset.friseCle;
      if (survole === cle && !focus) return;
      survole = cle;
      if (r.q) {
        allumer(r.q.cle);
        if (r.q.grappe) { const g = toile.querySelector(`[data-frise-cle="${CSS.escape(r.q.grappe.cle)}"] > span`); montrer(g || n, [r.q]); }
        else montrer(n.closest('.frise-repere') || n, [r.q]);
        if (typeof R.carte === 'function') R.carte(r.q.p.l ?? null);
        if (o.survol) o.survol(r.q.p);
      } else if (r.grappe) {
        eteindre();
        const lis = [n.closest('[data-frise-cle]')];
        r.grappe.membres.forEach(q => { if (R.liste) lis.push(...ligneDe(q.p.id)); });
        if (R.carte && typeof R.carte !== 'function') new Set(r.grappe.membres.map(q => q.p.l).filter(l => l != null)).forEach(l => R.carte.querySelectorAll(`.carte-lieu[data-l="${l}"]`).forEach(x => lis.push(x)));
        lis.forEach(x => x.classList.add('est-allume')); f.lumiere = lis;
        montrer(n.closest('span') || n, r.grappe.membres);
        if (typeof R.carte === 'function') R.carte(r.grappe.membres[0].p.l ?? null);
        if (o.survol) o.survol(r.grappe.membres[0].p);
      } else if (r.bande) {
        allumer(r.bande.id);
        if (o.survol) o.survol(r.bande);
      }
    }
    function sortir() {
      survole = null; eteindre(); cacher();
      if (typeof R.carte === 'function') R.carte(null);
      if (o.survol) o.survol(null);
    }
    const ecoute = (cible, type, fn, opt) => { cible.addEventListener(type, fn, opt); f.ecouteurs.push([cible, type, fn, opt]); };
    ecoute(el, 'pointerover', e => { const n = e.target.closest && e.target.closest('.frise-repere, .frise-grappe > span'); if (n && el.contains(n)) entrer(n); }, { passive: true });
    ecoute(el, 'pointerout', e => { const n = e.target.closest && e.target.closest('.frise-repere, .frise-grappe > span'); if (!n) return; const v = e.relatedTarget; if (v && n.contains(v)) return; if (!(document.activeElement && el.contains(document.activeElement))) sortir(); }, { passive: true });
    ecoute(el, 'focusin', e => {
      const n = e.target.closest && e.target.closest('.frise-repere'); if (!n) return;
      el.querySelectorAll('.est-focus').forEach(x => x.classList.remove('est-focus'));
      const li = n.closest('[data-frise-cle]'); li.classList.add('est-focus');
      const r = qDe(n); if (r && r.q && r.q.grappe) { const g = toile.querySelector(`[data-frise-cle="${CSS.escape(r.q.grappe.cle)}"]`); if (g) g.classList.add('est-focus'); }
      // le repère courant : la tabulation y revient
      el.querySelectorAll('.frise-repere[tabindex="0"]').forEach(x => { if (x !== n) x.setAttribute('tabindex', '-1'); });
      n.setAttribute('tabindex', '0');
      entrer(n, true);
    });
    ecoute(el, 'focusout', e => { if (e.relatedTarget && el.contains(e.relatedTarget)) return; el.querySelectorAll('.est-focus').forEach(x => x.classList.remove('est-focus')); sortir(); });
    ecoute(el, 'click', e => {
      const n = e.target.closest && e.target.closest('.frise-repere, .frise-grappe > span'); if (!n || !el.contains(n)) return;
      const r = qDe(n); if (!r) return;
      if (r.q && o.choix) o.choix(r.q.p);
      else if (r.grappe && o.choix) o.choix(r.grappe.membres[0].p);
      else if (r.bande && o.choix) o.choix(r.bande);
    });
    ecoute(el, 'keydown', e => {
      const n = e.target.closest && e.target.closest('.frise-repere'); if (!n) return;
      const k = e.key, tous = [...el.querySelectorAll('.frise-toile > ol:not(.frise-mois):not(.frise-grappes) .frise-repere')];
      const i = tous.indexOf(n); if (i < 0) return;
      let j = -1;
      if (k === 'ArrowRight' || k === 'ArrowDown') j = Math.min(tous.length - 1, i + 1);
      else if (k === 'ArrowLeft' || k === 'ArrowUp') j = Math.max(0, i - 1);
      else if (k === 'Home') j = 0;
      else if (k === 'End') j = tous.length - 1;
      else if (k === 'Escape') { cacher(); return; }
      if (j < 0) return;
      e.preventDefault();
      tous[j].focus();
    });
    // la liste et la carte reliées : survoler une ligne ou une commune allume son repère
    function relier() {
      if (R.liste) {
        const sur = e => { const n = e.target.closest && e.target.closest('[data-frise-id], [data-date-id]'); if (!n || el.contains(n)) return; const id = n.getAttribute('data-frise-id') || n.getAttribute('data-date-id'); if (id) allumer(id, { liste: false }); };
        // un toucher (son pointerover) ou un focus posé à la souris n'allument rien : le survol et le clavier, si
        ecoute(R.liste, 'pointerover', e => { if (e.pointerType !== 'touch') sur(e); }, { passive: true });
        ecoute(R.liste, 'focusin', e => { if (!e.target.matches || e.target.matches(':focus-visible')) sur(e); }, { passive: true });
        ecoute(R.liste, 'pointerleave', () => { if (!survole) eteindre(); }, { passive: true });
      }
      if (R.carte && typeof R.carte !== 'function') {
        const lieu = e => { const g = e.target.closest && e.target.closest('.carte-lieu[data-l]'); return g && R.carte.contains(g) ? +g.dataset.l : null; };
        const sur = e => { const l = lieu(e); if (l != null) allumer({ l }, { carte: false, liste: false }); };
        // quitter une commune (pas seulement passer d'un de ses tracés à l'autre) éteint ses repères
        const hors = e => { const g = e.target.closest && e.target.closest('.carte-lieu[data-l]');
          if (!g || !R.carte.contains(g) || (e.relatedTarget && g.contains(e.relatedTarget))) return; if (!survole) eteindre(); };
        ecoute(R.carte, 'pointerover', sur, { passive: true });
        ecoute(R.carte, 'focusin', sur, { passive: true });
        ecoute(R.carte, 'pointerout', hors, { passive: true });
        ecoute(R.carte, 'focusout', hors, { passive: true });
      }
    }

    /* le défilement au doigt : ouverte centrée sur aujourd'hui. Les largeurs sont connues (la toile : f.W ; la piste : la
       dernière mesure du ResizeObserver) : rien n'est lu dans la page ; seulement quand la frise est à l'écran */
    let centre = false;
    function centrer() {
      if (centre || o.orientation === 'verticale' || !f.vu || !largeurLue) return;
      centre = true;
      const auj = jour(o.aujourdhui);
      if (!isFinite(auj) || auj < f.t0 || auj >= f.t1 || f.W <= largeurLue + 1) return;
      piste.scrollLeft = (auj - f.t0) / (f.t1 - f.t0) * f.W - largeurLue / 2;
    }
    let largeurLue = 0;
    f.mesure = w => {
      if (!w || o.orientation === 'verticale') return;
      largeurLue = w;
      if (Math.abs(w - largeur) < 1 && f.modele) { centrer(); return; }
      largeur = w;
      const avant = f.modele && f.modele.sig;
      // la largeur a changé : on refait seulement si les grappes ou les couloirs changent
      if (f.modele) {
        const lus = lire(o.points), [t0, t1] = bornes(o, lus), G = graduations(t0, t1, o), W = Math.max(largeur, G.unites * (G.mois ? o.moisMin : o.anMin));
        f.W = W;
        // refaite (les grappes ou les couloirs changent avec la largeur) : on centre à l'image suivante, sans lecture forcée
        if (lus.length && signature(placer(o, W, t0, t1, lus)) !== avant) { rendre(false); requestAnimationFrame(centrer); return; }
      }
      centrer();
    };
    f.voir = () => { if (!f.vu) { f.vu = true; el.classList.add('est-vue'); } requestAnimationFrame(centrer); };
    f.fin = () => {
      if (io) io.unobserve(el);
      if (ro) ro.unobserve(piste);
      f.ecouteurs.forEach(([c, t, fn, opt]) => c.removeEventListener(t, fn, opt));
      f.ecouteurs = [];
      vivantes.delete(f);
    };

    rendre(false);
    conteneur.appendChild(el);
    relier();
    observer(f);
    const api = {
      el,
      get points() { return f.modele ? f.modele.M.pts.map(q => q.p) : []; },
      maj(nouvelles = {}) { o = Object.assign({}, o, nouvelles); rendre(true); return api; },
      allumer: (cle) => allumer(cle),
      eteindre: () => { eteindre(); cacher(); },
      aller(cle) {
        const M = f.modele && f.modele.M; if (!M) return;
        const q = M.pts.find(x => String(x.p.id) === String(cle) || x.cle === cle);
        if (!q) return;
        const x = q.grappe ? q.xg : q.x;
        if (largeurLue && f.W > largeurLue + 1) piste.scrollTo({ left: x / 100 * f.W - largeurLue / 2, behavior: permis() ? 'smooth' : 'auto' });
        allumer(q.cle);
      },
      detruire() { f.fin(); el.remove(); },
    };
    return api;
  }

  return { creer, jour, iso: isoDe, permis };
})();
