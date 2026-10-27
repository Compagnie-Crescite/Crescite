'use strict';
/* L'habillage de l'administration : la charte du site public (Ubuntu pour les titres, Open Sans pour le texte, Raleway
   pour les étiquettes en capitales espacées ; ses neutres, sa nuit par défaut ; l'accent à la couleur de la saison, que
   site/build.py pose dans index.html : --saison-*, jamais écrites ici), un en-tête de nuit, des cartes douces et
   colorées, des tuiles à icônes, des boutons en dégradé. Chargé en dernier : ses règles passent après celles d'index.html
   et des modules (equipe.js, planning.js, disponibilites.js, tableau.js, gestes.js, menus.js), qui gardent la structure
   et le comportement ; ici, rien que l'apparence, la nuit (par défaut) comme le jour (data-theme="jour"), aux couleurs
   (--accent, --carte, --trait, --doux…) que tout le monde lit. Les polices viennent de Google Fonts (index.html) ; sans
   elles, le système. */
(() => {
  document.head.insertAdjacentHTML('beforeend', `<style id="styles-habillage">
/* ===================================================================================================== les couleurs */
:root {
  --police: "Open Sans", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --titres: "Ubuntu", "Open Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --etiq: "Raleway", "Open Sans", system-ui, sans-serif;
  --fond: #f6f2eb; --carte: #fffdf9; --encre: #1d1418; --gris: #5f565a; --trait: #dcd3c6; --doux: #ece5da;
  --accent: var(--saison-texte); --accent-fonce: var(--saison-fonce); --accent-doux: var(--saison-doux);
  /* le jour : des tons assez sombres pour un texte (4,5:1 sur la carte comme sur leur fond doux) et pour porter du blanc */
  --prune: #6b2c64; --prune-doux: #f2e4f0; --corail: #b3422a; --corail-doux: #fbe7e1; --ambre: #946010; --ambre-doux: #fbf0d8;
  --sauge: #2f7658; --sauge-doux: #e2f2ea; --indigo: #4456b2; --indigo-doux: #e6e9f8; --ciel: #2a6fa3; --ciel-doux: #e1effa;
  --ok: #24704b; --ok-doux: #e1f3e8; --alerte: #a92d22; --alerte-doux: #fbe6e3; --option: #8a6413; --option-doux: #f9efd6;
  --ombre: 0 1px 2px rgba(70, 30, 55, .05), 0 12px 32px -14px rgba(70, 30, 55, .22);
  --rayon: 16px;
  /* le cadre d'un champ (3:1 contre la carte et le papier : un champ se voit sans son contenu) et l'indication qu'il porte
     tant qu'il est vide (placeholder, 4,5:1), comme dans l'équipe et l'espace des salles */
  --bord-champ: #8c8085; --indice: #6f6669;
  /* l'en-tête, de nuit dans les deux thèmes : le papier de la nuit, qui prend vers la droite un peu de la couleur de la
     saison ; les boutons pleins, de la couleur de la saison vers sa nuit (le blanc s'y lit, 4,5:1 au moins) ; la pieuvre de
     l'en-tête, à la couleur lisible sur la nuit */
  --barre-fond: linear-gradient(90deg, #150d12 0%, #1b1117 45%, color-mix(in srgb, var(--saison) 34%, #1b1117) 100%);
  --principal: linear-gradient(135deg, var(--saison) 0%, var(--saison-profond) 120%);
  --pieuvre: var(--saison-texte-nuit);
}
/* la nuit, par défaut (data-theme="nuit", ou rien) ; le jour seulement sous data-theme="jour" */
:root:not([data-theme="jour"]) {
  --fond: #1b1117; --carte: #2e2128; --encre: #f3eee9; --gris: #b7b0ae; --trait: #3b3036; --doux: #23171e;
  --accent: var(--saison-texte-nuit); --accent-fonce: var(--saison-fonce-nuit); --accent-doux: var(--saison-doux-nuit);
  --prune: #cf9bcb; --prune-doux: #33253a; --corail: #f28a6c; --corail-doux: #3d2621; --ambre: #e9b55c; --ambre-doux: #3a2d17;
  --sauge: #82d1aa; --sauge-doux: #1d3329; --indigo: #9cabf0; --indigo-doux: #232a44; --ciel: #7fc2ec; --ciel-doux: #1d2f3e;
  --ok: #6fd3a0; --ok-doux: #1d3329; --alerte: #ff8a80; --alerte-doux: #3a1f1d; --option: #e9c46a; --option-doux: #352b17;
  --ombre: 0 1px 2px rgba(0, 0, 0, .35), 0 12px 32px -14px rgba(0, 0, 0, .6);
  --bord-champ: #8a8085; --indice: #9a9093;
  --barre-fond: linear-gradient(90deg, #120b0f 0%, #170e14 45%, color-mix(in srgb, var(--saison) 30%, #170e14) 100%);
  --principal: linear-gradient(135deg, var(--saison-porteur) 0%, var(--saison-profond) 120%);
}
/* deux halos en haut de page (la couleur de la saison à gauche, ambre à droite), une fois : sans répétition sous les pages courtes */
html { min-height: 100%; }
body { min-height: 100%; background: radial-gradient(1100px 540px at -5% -10%, color-mix(in srgb, var(--accent) 11%, transparent), transparent 60%), radial-gradient(900px 480px at 105% -5%, color-mix(in srgb, var(--ambre) 13%, transparent), transparent 55%), var(--fond); background-repeat: no-repeat; }

/* ===================================================================================================== l'en-tête */
.barre { background: var(--barre-fond); border-bottom: 0; color: #fff; box-shadow: 0 8px 28px -14px rgba(30, 10, 30, .55); }
.marque { color: #fff; font-family: var(--titres); font-weight: 700; }
.marque small { color: rgba(255, 255, 255, .72); font-family: var(--etiq); font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
.marque .pieuvre { color: var(--pieuvre); }
.nav a, .nav-plus { color: rgba(255, 255, 255, .8); font-family: var(--etiq); font-size: 12px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; padding: 8px 12px; transition: background .15s, color .15s; }
.nav a:hover, .nav-plus:hover, .nav-plus[aria-expanded="true"] { background: rgba(255, 255, 255, .12); color: #fff; }
.nav a[aria-current="page"] { color: #fff; box-shadow: 0 6px 16px -6px color-mix(in srgb, var(--saison) 80%, transparent); }
.qui { color: rgba(255, 255, 255, .72); }
.qui a { color: #fff; }
.barre .btn { background: rgba(255, 255, 255, .08); border-color: rgba(255, 255, 255, .22); color: #fff; }
.barre .btn:hover { background: rgba(255, 255, 255, .16); border-color: rgba(255, 255, 255, .45); }
.chercher { background: rgba(255, 255, 255, .09); border-color: rgba(255, 255, 255, .18); color: rgba(255, 255, 255, .86); }
.chercher:hover { background: rgba(255, 255, 255, .15); border-color: rgba(255, 255, 255, .5); color: #fff; }
.barre kbd { background: rgba(255, 255, 255, .12); border-color: rgba(255, 255, 255, .22); color: #fff; }
.direct::before { background: rgba(255, 255, 255, .35); }
.direct.on::before { background: #4fd68e; box-shadow: 0 0 0 3px rgba(79, 214, 142, .22); }

/* ===================================================================================================== les titres, les étiquettes */
h1, h2, h3, .tete h1, .editeur h2, .bloc h3, .connexion h1, .fr-tete h1, dialog h2 { font-family: var(--titres); letter-spacing: -.01em; }
.tete h1 { font-size: 27px; font-weight: 700; }
.editeur h2 { font-size: 22px; }
.bloc h3 { font-size: 16px; }
.tb-cat h3, table.simple th, table.reps th, .crm-col-tete, .docs-titre, .rch-entete, .tb-pan-l .lib, .tb-kpi span, .tb-courbe-t, .dist-l.dist-entete, .tb-salut-jour, .tb-salut-chiffres span {
  font-family: var(--etiq); font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.tb-cat h3 { font-size: 11px; }
table.simple th, table.reps th { font-size: 11px; }
.champ > label, .champ > .lib { font-weight: 700; color: var(--encre); }
.rch-type { font: 700 10px/1.5 var(--etiq); letter-spacing: .08em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; background: var(--doux); color: var(--gris); }

/* ===================================================================================================== les cartes, les lignes */
.bloc, .tb-tuile, .filtres, .crm-carte, .item, dialog.recherche, dialog.tab-dialogue, dialog.tb-brief, .gf-boite, .gm-boite { border-color: var(--trait); box-shadow: var(--ombre); }
.bloc, .filtres { border-radius: var(--rayon); }
.bloc + .bloc { margin-top: 18px; }
.ligne, .tb-l { background: var(--carte); border: 1px solid var(--trait); border-left: 4px solid var(--c, var(--trait)); box-shadow: 0 1px 2px rgba(60, 30, 50, .04); transition: transform .15s, box-shadow .15s, background .15s, border-color .15s; }
.ligne:hover, .tb-l:hover { transform: translateY(-1px); box-shadow: var(--ombre); border-color: var(--trait); border-left-color: var(--c, var(--accent)); background: color-mix(in srgb, var(--carte) 86%, var(--c, var(--accent))); }
.ligne[aria-current="true"] { background: color-mix(in srgb, var(--carte) 80%, var(--c, var(--accent))); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c, var(--accent)) 30%, transparent); border-color: color-mix(in srgb, var(--c, var(--accent)) 55%, var(--trait)); }
.ligne .jj, .tb-jj { position: relative; width: 42px; padding: 7px 0 4px; border-radius: 9px; overflow: hidden; background: var(--doux); font-family: var(--etiq); font-weight: 700; font-size: 10px; letter-spacing: .04em; text-transform: uppercase; color: var(--gris); text-align: center; line-height: 1.15; }
.ligne .jj::before, .tb-jj::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 4px; background: var(--c, var(--accent)); }
.ligne .jj b, .tb-jj b { display: block; font: 700 19px/1.15 var(--titres); letter-spacing: 0; color: var(--encre); }
.tb-jj:empty { background: none; }
.tb-jj:empty::before { display: none; }
.ligne .t, .tb-l-t { font-weight: 700; }
.pastille { box-shadow: 0 0 0 2px color-mix(in srgb, var(--c, var(--accent)) 25%, transparent); }
/* la nuit, les couleurs des spectacles (leur scène, souvent sombre) se perdent sur la carte : un liseré clair dessine la
   pastille (3:1), sa couleur reste celle du spectacle */
:where(:root:not([data-theme="jour"])) .pastille { box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--encre) 50%, transparent); }
.liste-simple li { background: var(--carte); border: 1px solid var(--trait); }
.vide, .tb-rien { font-family: var(--titres); font-size: 14.5px; font-weight: 500; }
.tb-rien.ok { color: var(--ok); }

/* ===================================================================================================== les boutons, les badges, les champs */
.btn { border-radius: 10px; border-color: var(--trait); background: var(--carte); font-weight: 600; transition: transform .12s, box-shadow .12s, border-color .12s, background .12s, filter .12s; }
.btn:hover { border-color: color-mix(in srgb, var(--accent) 45%, var(--trait)); background: color-mix(in srgb, var(--accent-doux) 55%, var(--carte)); }
.btn.principal, .gf-btn.principal, .seg button[aria-pressed="true"], .seg a[aria-current="page"], .nav a[aria-current="page"], .puce[aria-pressed="true"]:not([style*="--c"]) { background: var(--principal); border-color: transparent; color: #fff; }
.btn.principal { box-shadow: 0 8px 18px -10px color-mix(in srgb, var(--accent) 80%, transparent); }
.btn.principal:hover, .gf-btn.principal:hover { background: var(--principal); filter: brightness(1.08); transform: translateY(-1px); color: #fff; }
.btn.danger:hover { border-color: var(--alerte); background: var(--alerte-doux); color: var(--alerte); }
.btn.lien { background: none; border-color: transparent; }
.btn.lien:hover { background: var(--accent-doux); border-color: transparent; }
.btn.petit { border-radius: 8px; }
.badge { font: 700 11px/1.5 var(--etiq); letter-spacing: .02em; }
.badge.sco { background: var(--indigo-doux); color: var(--indigo); }
.puce { border-radius: 999px; transition: background .12s, border-color .12s; }
.puce:hover { border-color: var(--accent); }
.seg { border-radius: 10px; }
.seg button { transition: background .12s, color .12s; }
.onglets-ed button[aria-selected="true"] { background: var(--encre); color: var(--carte); }
input[type=text], input[type=email], input[type=tel], input[type=password], input[type=url], input[type=search], input[type=date], input[type=time], input[type=number], select, textarea, .riche { border-radius: 10px; background: var(--carte); border: 1px solid var(--bord-champ); transition: border-color .12s, box-shadow .12s; }
::placeholder { color: var(--indice); opacity: 1; }
input:focus, select:focus, textarea:focus, .riche:focus { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-doux); }
.case input { accent-color: var(--accent); }
kbd { font-family: var(--etiq); }

/* ===================================================================================================== les tuiles du tableau de bord */
.tb-tuile { --tuile: var(--accent); --tuile-doux: var(--accent-doux); border-radius: var(--rayon); border-top: 3px solid var(--tuile); overflow: hidden; transition: box-shadow .2s; }
.tb-tuile:hover { box-shadow: 0 1px 2px rgba(70, 30, 55, .06), 0 18px 40px -18px rgba(70, 30, 55, .3); }
.tb-tuile[data-k="urgent"] { --tuile: var(--corail); --tuile-doux: var(--corail-doux); }
.tb-tuile[data-k="avant"] { --tuile: var(--ambre); --tuile-doux: var(--ambre-doux); }
.tb-tuile[data-k="prochaines"] { --tuile: var(--indigo); --tuile-doux: var(--indigo-doux); }
.tb-tuile[data-k="chiffres"] { --tuile: var(--sauge); --tuile-doux: var(--sauge-doux); }
.tb-tuile[data-k="equipe"] { --tuile: var(--prune); --tuile-doux: var(--prune-doux); }
.tb-tuile[data-k="diffusion"] { --tuile: var(--ciel); --tuile-doux: var(--ciel-doux); }
.tb-tuile[data-k="propositions"] { --tuile: var(--accent); --tuile-doux: var(--accent-doux); }
.tb-tuile[data-k="ateliers"] { --tuile: var(--ambre); --tuile-doux: var(--ambre-doux); }
.tb-tuile[data-k="journal"] { --tuile: var(--gris); --tuile-doux: var(--doux); }
.tb-tuile[data-k="spectacles"] { --tuile: var(--prune); --tuile-doux: var(--prune-doux); }
.tb-tuile[data-k="memo"] { --tuile: var(--ambre); --tuile-doux: var(--ambre-doux); }
.tb-tete { background: linear-gradient(to bottom, color-mix(in srgb, var(--tuile-doux) 65%, var(--carte)), var(--carte)); border-bottom-color: color-mix(in srgb, var(--trait) 70%, transparent); padding: 10px 8px 9px 12px; }
.tb-tete h2 { font-family: var(--titres); font-size: 15.5px; font-weight: 700; }
.tb-ico-t { display: inline-grid; place-items: center; flex: none; width: 26px; height: 26px; border-radius: 8px; background: var(--tuile-doux); color: var(--tuile); }
.tb-ico-t svg { width: 15px; height: 15px; }
.tb-lien { color: var(--tuile); }
.tb-lien:hover { background: var(--tuile-doux); }
.tb-tete .badge.option { background: var(--tuile); color: var(--carte); }
.tb-tete .badge.ok { background: var(--ok-doux); color: var(--ok); }
.tb-kpi > * { background: linear-gradient(135deg, color-mix(in srgb, var(--tuile-doux) 80%, var(--carte)), var(--carte)); border: 1px solid var(--trait); border-radius: 12px; }
.tb-kpi > a:hover { border-color: var(--tuile); background: var(--tuile-doux); }
.tb-kpi b { font-family: var(--titres); font-size: 26px; color: var(--tuile); }
.tb-kpi > .ok b { color: var(--ok); }
.tb-kpi > .alerte b { color: var(--alerte); }
.tb-actions .btn { border-radius: 12px; }
.tb-actions .btn.principal { background: var(--principal); }
.tb-ico[data-tb-filtre][aria-pressed="true"] { background: var(--accent); color: var(--carte); }
.tb-salut-chiffres li { background: color-mix(in srgb, var(--carte) 92%, transparent); }
.tb-cat h3 .badge { background: var(--tuile); color: var(--carte); letter-spacing: 0; }
.tb-cat-tag { font-family: var(--etiq); }
.tb-traiter { border-radius: 10px; color: var(--tuile); }
.tb-traiter:hover, .tb-traiter:focus-visible { background: var(--tuile); border-color: var(--tuile); color: var(--carte); }
.tb-lt.epingle > .tb-l { background: color-mix(in srgb, var(--carte) 75%, var(--tuile-doux)); }
.tb-sp { background: var(--carte); border: 1px solid var(--trait); border-left: 4px solid var(--c, var(--trait)); }
.tb-barres button i { background: color-mix(in srgb, var(--tuile) 65%, var(--carte)); }
.tb-barres button:hover i, .tb-barres button:focus-visible i { background: var(--tuile); }
.tb-pipe { background: var(--doux); }
.tb-memo { border-radius: 12px; background: color-mix(in srgb, var(--ambre-doux) 55%, var(--carte)); border-color: color-mix(in srgb, var(--ambre) 35%, var(--trait)); font-family: var(--police); }
.tb-filtre { background: var(--accent-doux); }
.tb-grille.edition .tb-tuile { outline-color: color-mix(in srgb, var(--accent) 45%, transparent); }
.tb-panneau { border-radius: var(--rayon); }
dialog.tb-brief { border-radius: var(--rayon); }
.tb-brief-dates li { border-radius: 10px; }

/* ===================================================================================================== la diffusion (Kanban), le journal, les annonces, les fenêtres */
.crm-colonne { background: color-mix(in srgb, var(--carte) 65%, var(--doux)); border-radius: var(--rayon); }
.crm-colonne:nth-child(1) { --col: var(--ciel); } .crm-colonne:nth-child(2) { --col: var(--indigo); } .crm-colonne:nth-child(3) { --col: var(--ambre); } .crm-colonne:nth-child(4) { --col: var(--sauge); } .crm-colonne:nth-child(5) { --col: var(--gris); }
.crm-col-tete { font-size: 11.5px; color: var(--col, var(--gris)); padding-bottom: 7px; border-bottom: 2px solid var(--col, var(--trait)); }
.crm-carte { border-radius: 12px; }
.crm-carte:hover { border-color: var(--accent); box-shadow: var(--ombre); }
.crm-carte-cession { color: var(--sauge); }
.journal-ligne:hover { background: color-mix(in srgb, var(--doux) 60%, var(--carte)); }
.journal-ligne .quand { font-family: var(--etiq); font-weight: 600; font-size: 12px; }
table.simple { border-radius: var(--rayon); }
table.simple tr.cliquable:hover td { background: color-mix(in srgb, var(--accent-doux) 55%, var(--carte)); }
.annonce { background: #23171e; border-left: 4px solid var(--saison-texte-nuit); border-radius: 12px; box-shadow: 0 16px 44px -12px rgba(30, 10, 30, .55); font-weight: 500; }
.annonce.erreur { background: #7d1d16; border-left-color: #ffb4ab; }
.annonce button { border-radius: 8px; }
dialog.recherche, dialog.tab-dialogue, dialog.tb-brief { border-radius: var(--rayon); }
.rch-tete { border-bottom-color: var(--trait); }
.rch-tete:focus-within { border-bottom-color: var(--accent); }
.rch-liste [role=option][aria-selected=true] { background: color-mix(in srgb, var(--accent-doux) 80%, var(--carte)); box-shadow: inset 3px 0 0 var(--accent); }
.gm-boite, .gf-boite { border-radius: 14px; }
.gf-tete h2 { font-family: var(--titres); }
.gf-seg button[aria-pressed="true"] { background: var(--principal); border-color: transparent; color: #fff; }
.avatar { background: linear-gradient(135deg, var(--accent-doux), var(--prune-doux)) center/cover no-repeat; color: var(--prune); font-family: var(--titres); box-shadow: 0 0 0 2px var(--carte), 0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent); }
.connexion form { border-top: 4px solid var(--accent); }
.connexion h1 { font-size: 26px; }
/* la marque sur la porte : la même que l'en-tête, sur la carte */
.connexion .marque { display: flex; align-items: center; margin: 0 0 18px; color: var(--encre); }
.connexion .marque small { color: var(--gris); }
.connexion .marque .pieuvre { color: var(--accent); }
@media (prefers-reduced-motion: reduce) { .ligne, .tb-l, .btn, .tb-tuile { transition: none; } .ligne:hover, .tb-l:hover, .btn.principal:hover { transform: none; } }
/* le « Rouge » de la barre de la feuille de route, la nuit : le rouge de la feuille (sur le papier blanc) ne se lit pas sur
   la carte de nuit ; l'étiquette prend le rouge clair des alertes (la feuille elle-même ne change pas) */
:root:not([data-theme="jour"]) .a4-b .a4-rouge { color: var(--alerte); }
/* la porte à 360 px : la marque passe à la ligne plutôt que d'élargir la carte */
.connexion { grid-template-columns: minmax(0, 1fr); }
.connexion .marque { flex-wrap: wrap; row-gap: 2px; white-space: normal; }
/* Au doigt (un téléphone, une tablette) : chaque commande est une cible de 44 px. Les boutons, les commandes segmentées, les
   puces, les onglets d'une fiche, les outils (mise en forme, feuille de route, tableau de bord), les listes déroulantes ;
   les liens posés seuls sur leur ligne (une personne ou un lieu à compléter, un téléphone, une feuille de route, un
   spectacle d'une fiche) prennent la hauteur d'un doigt. Les liens dans une phrase restent dans leur phrase. */
@media (pointer: coarse) {
  .btn, .seg > button, .puce, .onglets-ed button, .outils-riche button, .tb-ico, .tb-traiter, .a4-b, .a4-vues button, .tab-tri, select, .avant > summary { min-height: 44px; }
  .btn.petit, .outils-riche button, .tb-ico, .tb-traiter, .a4-b, .tb-lien { min-width: 44px; }
  .tb-lien { justify-content: center; }
  .avant-fenetre select { min-height: 44px; min-width: 64px; }
  .btn.petit, .tb-ico, .tb-traiter { display: inline-flex; align-items: center; justify-content: center; }
  .tb-lien, .tb-cat a, .avant-corps a, a.coord, a.manque-tel, a.eq-feuille, .liste-simple a, .sous-champ a, .lieu-resume a, .eq-date a, .acces a { display: inline-flex; align-items: center; min-height: 44px; }
  .doc-boutons, .crm-carte-actions { gap: 8px; }
}

/* ===================================================================================================== l'impression
   Une liste (Représentations, Lieux, Équipe, Diffusion…), une fiche ou le planning, sur papier : en blanc et noir, sans
   l'en-tête, les menus, les boutons, les squelettes ni les tiroirs ; en tête, ce qu'on imprime et les filtres en cours
   (#imp-tete, posé par teteImpression avant l'impression) ; une ligne, une carte, un champ ne se coupent pas d'une page à
   l'autre. La liste seule quand aucune fiche n'est ouverte, la fiche seule quand elle l'est ; le planning en paysage, ses
   jours à la largeur de la page. La feuille de route (.fdr) garde ses couleurs et sa propre impression (feuille.js), le
   brief du tableau de bord la sienne (html.tb-impression, tableau.js). */
#imp-tete { display: none; }
@media print {
  @page { margin: 14mm 12mm; }
  @page paysage { size: A4 landscape; margin: 10mm; }
  :root, :root:not([data-theme="jour"]), :root[data-theme="jour"] {
    --fond: #fff; --carte: #fff; --doux: #fff; --encre: #000; --gris: #333; --trait: #999; --accent: #000; --accent-fonce: #000; --accent-doux: #fff;
    --sur-accent: #fff; --ok: #000; --ok-doux: #fff; --alerte: #000; --alerte-doux: #fff; --option: #000; --option-doux: #fff; --ombre: none;
    --prune: #000; --corail: #000; --ambre: #000; --sauge: #000; --indigo: #000; --ciel: #000; --bord-champ: #999; --indice: #555; color-scheme: light;
  }
  html:not(.tb-impression), html:not(.tb-impression) body { background: #fff !important; color: #000 !important; }
  html:not(.tb-impression) body { font-size: 10pt; line-height: 1.4; }
  /* rien que la vue : ni l'en-tête, ni le pied, ni les annonces, les menus, les tiroirs, les fenêtres, la barre du téléphone */
  html:not(.tb-impression) body > :not(#app):not(#imp-tete), html:not(.tb-impression) #app > :not(#vue) { display: none !important; }
  html:not(.tb-impression) #imp-tete { display: block; margin: 0 0 12pt; padding: 0 0 6pt; border-bottom: 1pt solid #000; color: #000; }
  #imp-tete p { margin: 0; }
  #imp-tete .imp-quoi { font: 700 15pt/1.25 var(--titres); }
  #imp-tete .imp-filtres { margin-top: 3pt; font-weight: 600; }
  #imp-tete .imp-qui { margin-top: 3pt; font-size: 8.5pt; color: #333; }
  main#vue { padding: 0 !important; margin: 0 !important; max-width: none !important; animation: none !important; }
  #vue *, #vue *::before, #vue *::after { animation: none !important; transition: none !important; }
  /* le blanc et noir : le texte noir, aucun fond ni ombre, des filets gris (sauf la feuille de route et le planning) */
  #vue :not(.fdr, .fdr *, .pl, .pl *) { color: #000 !important; background-color: transparent !important; background-image: none !important; box-shadow: none !important; text-shadow: none !important; border-color: #999 !important; }
  #vue a { text-decoration: none !important; }
  /* ce qui sert à l'écran seulement : les gestes, les filtres (dits en tête), l'en-tête de la vue (son titre aussi, en tête) */
  #vue :is(.tete, .btn, .filtres, .journal-filtres, .tab-filtres, #avant, .fil-ariane, .gps, .sel-bouton, .pied-ed, .doc-boutons, .nt-form, .eq-ajouter,
    .ad-squelette, .liste-vide .btn, .crm-carte button, .pl-nav button, .pl-vues, .pl-filtres, .pl-masquer, .pl-btn, .pl-detail, [data-tiroir-fermer], .a4-outils) { display: none !important; }
  #vue .titre-ed { margin-bottom: 8pt; }
  #vue .titre-ed h2 { font-size: 13pt; }
  /* la liste, ou la fiche */
  #vue .deux { display: block !important; }
  #vue .deux:not(.edition) > .editeur, #vue .deux.edition > .liste { display: none !important; }
  #vue .deux > .liste { position: static !important; max-height: none !important; overflow: visible !important; }
  #vue .bloc { border: 0 !important; border-radius: 0 !important; padding: 0 !important; margin: 0 0 10pt !important; }
  #vue .bloc h3 { margin: 0 0 4pt; padding-bottom: 2pt; border-bottom: .5pt solid #999; font-size: 11pt; }
  /* rien ne se coupe : une ligne, une carte, un champ ; un titre reste avec ce qui le suit */
  #vue :is(.ligne, tr, li, .champ, .rangee, .crm-carte, .crm-kpi-boite, .journal-ligne, .sous-champ) { break-inside: avoid; }
  #vue :is(h1, h2, h3, .mois, .crm-col-tete, thead) { break-after: avoid; }
  #vue .ligne { border-width: 0 0 .5pt !important; border-style: solid !important; border-radius: 0 !important; padding-left: 0 !important; padding-right: 0 !important; transform: none !important; }
  #vue .mois { position: static !important; margin-top: 8pt; padding: 0; font-size: 9pt; }
  #vue .ligne .jj::before { background: #000 !important; height: 2px; }
  /* les champs d'une fiche : leur valeur, sans cadre ni flèche ; une zone de texte à la hauteur de son texte */
  #vue :is(input:not([type="checkbox"]):not([type="radio"]), select, textarea, .riche) { appearance: none !important; border: 0 !important; border-bottom: .5pt solid #999 !important;
    border-radius: 0 !important; padding: 1pt 0 !important; min-height: 0 !important; height: auto; background: none !important; }
  #vue textarea { field-sizing: content; resize: none; overflow: visible; }
  #vue ::placeholder { color: transparent !important; }
  #vue ::-webkit-calendar-picker-indicator { display: none; }
  #vue .champ .seg { border: 0 !important; padding: 0 !important; }
  #vue .champ .seg > :not([aria-pressed="true"]) { display: none !important; }
  #vue .champ .seg > [aria-pressed="true"] { padding: 1pt 0 !important; border: 0 !important; font-weight: 700; }
  /* la Diffusion : les étapes l'une sous l'autre, leurs pistes sur deux colonnes */
  #vue .crm-tableau { display: block !important; overflow: visible !important; }
  #vue .crm-colonne { min-height: 0 !important; margin: 0 0 10pt; padding: 0 !important; border: 0 !important; }
  #vue .crm-cartes { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6pt; min-height: 0 !important; padding: 4pt 0 0 !important; }
  #vue .crm-carte { border: .5pt solid #999 !important; padding: 6pt !important; }
  #vue .crm-kpi { gap: 6pt; margin-bottom: 10pt; }
  #vue .crm-kpi-boite { border: .5pt solid #999 !important; padding: 6pt !important; }
  /* le planning : en paysage, la grille à la largeur de la page (des colonnes de jour égales), en gris */
  html:not(.tb-impression) body:has(#vue .pl) { page: paysage; }
  #vue .pl { --pl-fond: #fff; --pl-papier: #fff; --pl-texte: #000; --pl-sourd: #333; --pl-filet: #999; --pl-accent: #000; --pl-doux: #e6e6e6; --pl-alerte: #000; --pl-ok: #000; --pl-nom: 150px; }
  #vue .pl-o-b { --b-fond: #fff !important; --b-texte: #000 !important; border: .75pt solid #000; }
  #vue .pl-o-b.option { border-style: dashed; }
  #vue .pl-legende .l-date { background: #fff !important; border: .75pt solid #000; }
  #vue .pl-defile { overflow: visible !important; max-height: none !important; }
  #vue .pl-grille-e { grid-template-columns: var(--pl-nom) repeat(var(--n), minmax(0, 1fr)) !important; width: 100% !important; min-width: 0 !important; }
  #vue .pl-e-nom, #vue .pl-e-mois span { position: static !important; }
  #vue .pl-grille-e > * { break-inside: avoid; }
}
</style>`);
})();
